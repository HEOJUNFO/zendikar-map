#include "engine/physics/ragdoll.hpp"
#include <algorithm>
#include <cmath>
#include <limits>

namespace engine {
namespace {
constexpr int SUBSTEPS=8,ITERATIONS=6;
constexpr float DT=Ragdoll::TICK/SUBSTEPS;
constexpr float DAMPING_PER_SECOND=3.62725f;
template<typename... Values> bool finite(Values... values){return (std::isfinite(values)&&...);}
bool finite(Vec3 v){return finite(v.x,v.y,v.z);}
bool rigid(const Mat4& m){
  for(float value:m.m)if(!finite(value))return false;
  if(std::fabs(m.m[3])>1e-5f||std::fabs(m.m[7])>1e-5f||std::fabs(m.m[11])>1e-5f||std::fabs(m.m[15]-1)>1e-5f)return false;
  const Vec3 x{m.m[0],m.m[1],m.m[2]},y{m.m[4],m.m[5],m.m[6]},z{m.m[8],m.m[9],m.m[10]};
  return std::fabs(dot(x,x)-1)<.001f&&std::fabs(dot(y,y)-1)<.001f&&std::fabs(dot(z,z)-1)<.001f&&
    std::fabs(dot(x,y))<.001f&&std::fabs(dot(x,z))<.001f&&std::fabs(dot(y,z))<.001f&&std::fabs(dot(cross(x,y),z)-1)<.001f;
}
float length(Vec3 v){return std::sqrt(dot(v,v));}
Quaternion unit(Quaternion q){float n=0;for(float v:q)n+=v*v;n=std::sqrt(n);for(float& v:q)v/=n;return q;}
Vec3 rotated(const Quaternion& q,Vec3 p){const Vec3 v{q[0],q[1],q[2]};return p+cross(v,cross(v,p)+p*q[3])*2;}
Quaternion turn(Quaternion q,Vec3 delta){const auto change=quaternion_product({delta.x,delta.y,delta.z,0},q);for(std::size_t i=0;i<4;++i)q[i]+=change[i]*.5f;return unit(q);}
Vec3 angular_delta(Quaternion now,Quaternion before){auto q=quaternion_product(now,quaternion_conjugate(before));if(q[3]<0)for(float& v:q)v=-v;const Vec3 v{q[0],q[1],q[2]};const float size=length(v);return size>1e-7f?v*(2*std::atan2(size,q[3])/size):v*2;}
Vec3 point(const Mat4& m,Vec3 p){return {m.m[0]*p.x+m.m[4]*p.y+m.m[8]*p.z+m.m[12],m.m[1]*p.x+m.m[5]*p.y+m.m[9]*p.z+m.m[13],m.m[2]*p.x+m.m[6]*p.y+m.m[10]*p.z+m.m[14]};}
Mat4 rest_frame(const RagdollBone& b){const Vec3 x=normalize({b.inverse_bind.m[0],b.inverse_bind.m[4],b.inverse_bind.m[8]}),y=normalize(b.tail-b.head);return Mat4::from_basis(x,y,normalize(cross(x,y)),b.head);}
Vec3 separation(Vec3 to,Vec3 from,const Aabb& box,float radius){
  const Vec3 r{radius,radius,radius};const Aabb e{box.min-r,box.max+r};
  if(to.x>e.min.x&&to.x<e.max.x&&to.y>e.min.y&&to.y<e.max.y&&to.z>e.min.z&&to.z<e.max.z){
    const float gaps[]{to.x-e.min.x,e.max.x-to.x,to.y-e.min.y,e.max.y-to.y,to.z-e.min.z,e.max.z-to.z};int nearest=0;for(int i=1;i<6;++i)if(gaps[i]<gaps[nearest])nearest=i;
    const float d=gaps[nearest]+1e-5f;switch(nearest){case 0:return {-d,0,0};case 1:return {d,0,0};case 2:return {0,-d,0};case 3:return {0,d,0};case 4:return {0,0,-d};default:return {0,0,d};}
  }
  const Vec3 delta=to-from;const float start[]{from.x,from.y,from.z},move[]{delta.x,delta.y,delta.z},lo[]{e.min.x,e.min.y,e.min.z},hi[]{e.max.x,e.max.y,e.max.z};float enter=0,leave=1;bool outside=false;
  for(int axis=0;axis<3;++axis){outside=outside||start[axis]<lo[axis]||start[axis]>hi[axis];if(std::fabs(move[axis])<1e-8f){if(start[axis]<lo[axis]||start[axis]>hi[axis])return {};continue;}float a=(lo[axis]-start[axis])/move[axis],b=(hi[axis]-start[axis])/move[axis];if(a>b)std::swap(a,b);enter=std::max(enter,a);leave=std::min(leave,b);if(enter>leave)return {};}
  return outside&&enter>0&&enter<1?from+delta*std::max(0.0f,enter-1e-4f)-to:Vec3{};
}
Vec3 contact_normal(Vec3 at,const Aabb& box,float radius){const Vec3 closest{std::clamp(at.x,box.min.x,box.max.x),std::clamp(at.y,box.min.y,box.max.y),std::clamp(at.z,box.min.z,box.max.z)};const Vec3 delta=at-closest;const float d=length(delta);return d>1e-7f&&d<=radius+.003f?delta*(1/d):Vec3{};}
}

SkinnedContactJacobian SkinnedContactJacobian::from(const DualQuaternionBlend& blend,Vec3 p,Vec3 n){
  const auto& r=blend.real;const auto& d=blend.dual;const Vec3 rv{r[0],r[1],r[2]},dv{d[0],d[1],d[2]};
  const float np=dot(n,p),rp=dot(rv,p),nr=dot(n,rv);
  const Vec3 gr=rv*(-2*np)+n*(2*rp)+p*(2*nr)+cross(p,n)*(2*r[3])-n*(2*d[3])+cross(dv,n)*2;
  Quaternion real{gr.x,gr.y,gr.z,2*(r[3]*np+dot(n,cross(rv,p))+dot(n,dv))};
  const Vec3 gd=(n*r[3]+cross(n,rv))*2;Quaternion dual{gd.x,gd.y,gd.z,-2*nr};
  float radial=0;for(std::size_t k=0;k<4;++k)radial+=real[k]*r[k]+dual[k]*d[k];
  for(std::size_t k=0;k<4;++k){real[k]=(real[k]-r[k]*radial)/blend.norm;dual[k]/=blend.norm;}
  return {real,dual};
}
DualQuaternionPointGradient SkinnedContactJacobian::bone(const DualQuaternion& transform,float weight,Vec3 translation,Vec3 center) const{
  const auto& q=transform.real;const Vec3 qv{q[0],q[1],q[2]},dv{dual[0],dual[1],dual[2]},rv{real[0],real[1],real[2]};
  const auto product_adjoint=[&](Vec3 vector,float scalar){return vector*q[3]+cross(qv,vector)-qv*scalar;};
  const Vec3 linear=product_adjoint(dv,dual[3])*(weight*.5f);
  const Vec3 rotation_real=rv+(cross(dv,translation)-translation*dual[3])*.5f;
  const float rotation_scalar=real[3]+dot(dv,translation)*.5f;
  return {linear,product_adjoint(rotation_real,rotation_scalar)*(weight*.5f)+cross(translation-center,linear)};
}

bool Ragdoll::start(std::span<const RagdollBone> rig,const Mat4& transform,Vec3 velocity,std::span<const RagdollContact> contacts){
  if(rig.empty()||rig.size()>MAX_BONES||contacts.size()>MAX_CONTACTS)return false;
  if(!rigid(transform)||!finite(velocity))return false;
  for(std::size_t i=0;i<rig.size();++i){const auto& b=rig[i];if(b.parent>=static_cast<int32_t>(i)||b.parent< -1||!finite(b.head)||!finite(b.tail)||!rigid(b.inverse_bind)||
      !finite(b.mass,b.radius,b.swing_limit,b.twist_min,b.twist_max)||b.mass<=0||b.radius<=0||length(b.tail-b.head)<1e-5f||
      b.swing_limit<0||b.swing_limit>3.141593f||b.twist_min< -3.141593f||b.twist_max>3.141593f||b.twist_min>b.twist_max)return false;}
  for(const auto& c:contacts){if(!finite(c.position)||!finite(c.radius)||c.radius<=0)return false;float sum=0;for(std::size_t k=0;k<8;++k){if(!finite(c.weights[k])||c.weights[k]<0||c.bones[k]>=rig.size())return false;sum+=c.weights[k];}if(!finite(sum)||std::fabs(sum-1)>.001f)return false;}
  rig_=rig;contacts_=contacts;bodies_.resize(rig.size());palette_.resize(rig.size());skin_.resize(rig.size());step_contacts_.resize(contacts.size());ticks_=quiet_ticks_=0;sleeping_=false;maximum_speed_=maximum_angular_speed_=0;
  for(uint32_t i=0;i<rig.size();++i){const auto& r=rig[i];Body& b=bodies_[i];b={};b.length=length(r.tail-r.head);b.rest_rotation=DualQuaternion::from_rigid(rest_frame(r)).real;b.rotation=DualQuaternion::from_rigid(transform*rest_frame(r)).real;b.previous_rotation=b.rotation;b.position=point(transform,(r.head+r.tail)*.5f);b.previous=b.position;b.velocity=velocity;
    const float side=r.mass*(b.length*b.length/12+r.radius*r.radius*.25f),axis=r.mass*r.radius*r.radius*.5f;b.inverse_inertia={1/side,1/axis,1/side};
    if(r.parent>=0){const uint32_t p=static_cast<uint32_t>(r.parent);b.parent_anchor=point(rig[p].inverse_bind,r.head)-Vec3{0,bodies_[p].length*.5f,0};}
  }
  refresh();return true;
}
Vec3 Ragdoll::head(uint32_t i) const{return bodies_[i].position+rotated(bodies_[i].rotation,{0,-bodies_[i].length*.5f,0});}
Vec3 Ragdoll::tail(uint32_t i) const{return bodies_[i].position+rotated(bodies_[i].rotation,{0,bodies_[i].length*.5f,0});}
Mat4 Ragdoll::frame(uint32_t i) const{const auto& q=bodies_[i].rotation;return Mat4::from_basis(rotated(q,{1,0,0}),rotated(q,{0,1,0}),rotated(q,{0,0,1}),head(i));}
Vec3 Ragdoll::inverse_inertia(uint32_t i,Vec3 g) const{const auto& b=bodies_[i];const Vec3 local=rotated(quaternion_conjugate(b.rotation),g);return rotated(b.rotation,{local.x*b.inverse_inertia.x,local.y*b.inverse_inertia.y,local.z*b.inverse_inertia.z});}
void Ragdoll::correct(uint32_t i,Vec3 linear,Vec3 angular){Body& b=bodies_[i];b.position=b.position+linear*(1/rig_[i].mass);b.rotation=turn(b.rotation,inverse_inertia(i,angular));}
void Ragdoll::angular_constraint(uint32_t i,uint32_t p,Vec3 axis,float error){const float w=dot(axis,inverse_inertia(i,axis))+dot(axis,inverse_inertia(p,axis));if(w<1e-9f)return;const float lambda=-error/w;correct(i,{},axis*lambda);correct(p,{},axis*(-lambda));}
void Ragdoll::constrain(uint32_t i){
  const auto& r=rig_[i];if(r.parent<0)return;const uint32_t p=static_cast<uint32_t>(r.parent);
  const Vec3 parent_offset=rotated(bodies_[p].rotation,bodies_[i].parent_anchor),child_offset=rotated(bodies_[i].rotation,{0,-bodies_[i].length*.5f,0});
  const Vec3 delta=(bodies_[i].position+child_offset)-(bodies_[p].position+parent_offset);const float size=length(delta);
  if(size>1e-7f){const Vec3 n=delta*(1/size),a=cross(child_offset,n),b=cross(parent_offset,n)*-1;const float w=1/rig_[i].mass+1/rig_[p].mass+dot(a,inverse_inertia(i,a))+dot(b,inverse_inertia(p,b));const float lambda=-size/w;correct(i,n*lambda,a*lambda);correct(p,n*(-lambda),b*lambda);}
  const Quaternion relative=quaternion_product(quaternion_conjugate(bodies_[p].rest_rotation),bodies_[i].rest_rotation),expected=quaternion_product(bodies_[p].rotation,relative);
  const Vec3 from=rotated(expected,{0,1,0}),to=rotated(bodies_[i].rotation,{0,1,0});const float angle=std::acos(std::clamp(dot(from,to),-1.0f,1.0f));
  if(angle>r.swing_limit){const Vec3 axis=normalize(cross(from,to));if(dot(axis,axis)>.5f)angular_constraint(i,p,axis,angle-r.swing_limit);}
  Quaternion difference=quaternion_product(quaternion_conjugate(expected),bodies_[i].rotation);if(difference[3]<0)for(float& v:difference)v=-v;
  const float twist=2*std::atan2(difference[1],difference[3]),error=twist-std::clamp(twist,r.twist_min,r.twist_max);
  if(std::fabs(error)>1e-7f)angular_constraint(i,p,normalize(from+to),error);
}
Aabb Ragdoll::bone_bounds(uint32_t i) const{const Vec3 a=head(i),b=tail(i),r{rig_[i].radius,rig_[i].radius,rig_[i].radius};return {{std::min(a.x,b.x)-r.x,std::min(a.y,b.y)-r.y,std::min(a.z,b.z)-r.z},{std::max(a.x,b.x)+r.x,std::max(a.y,b.y)+r.y,std::max(a.z,b.z)+r.z}};}
void Ragdoll::bone_push(uint32_t i,Vec3 at,Vec3 push){const float d=length(push);if(d<1e-7f)return;const Vec3 n=push*(1/d),g=cross(at-bodies_[i].position,n);const float w=1/rig_[i].mass+dot(g,inverse_inertia(i,g));const float lambda=d/w;correct(i,n*lambda,g*lambda);}
void Ragdoll::collide(uint32_t i,const Aabb& box){const auto& b=bodies_[i];const int samples=std::clamp(static_cast<int>(std::ceil(b.length/(rig_[i].radius*1.5f))),2,16);for(int j=0;j<=samples;++j){const Vec3 local{0,b.length*(static_cast<float>(j)/samples-.5f),0},at=b.position+rotated(b.rotation,local),before=b.previous+rotated(b.previous_rotation,local);bone_push(i,at,separation(at,before,box,rig_[i].radius));}}
void Ragdoll::skin_frames(){for(uint32_t i=0;i<rig_.size();++i){palette_[i]=frame(i)*rig_[i].inverse_bind;skin_[i]=DualQuaternion::from_rigid(palette_[i]);}}
Vec3 Ragdoll::contact_position(uint32_t i) const{const auto& c=contacts_[i];return dual_quaternion_point(skin_,c.bones,c.weights,c.position);}
bool Ragdoll::contact_push(uint32_t i,Vec3 push){
  const float d=length(push);if(d<1e-7f)return false;const auto& c=contacts_[i];const Vec3 n=push*(1/d);const auto blend=dual_quaternion_blend(skin_,c.bones,c.weights);const auto jacobian=SkinnedContactJacobian::from(blend,c.position,n);std::array<DualQuaternionPointGradient,8> g{};float w=0;
  for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];const auto& m=palette_[b];g[k]=jacobian.bone(skin_[b],blend.signed_weights[k],{m.m[12],m.m[13],m.m[14]},bodies_[b].position);w+=dot(g[k].translation,g[k].translation)/rig_[b].mass+dot(g[k].rotation,inverse_inertia(b,g[k].rotation));}
  if(w<1e-9f)return false;const float lambda=d/w;for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];correct(b,g[k].translation*lambda,g[k].rotation*lambda);palette_[b]=frame(b)*rig_[b].inverse_bind;skin_[b]=DualQuaternion::from_rigid(palette_[b]);}return true;
}
void Ragdoll::velocity_contact(uint32_t i,Vec3 at,Vec3 n){
  Body& b=bodies_[i];const Vec3 r=at-b.position,g=cross(r,n);const float w=1/rig_[i].mass+dot(g,inverse_inertia(i,g));const Vec3 v=b.velocity+cross(b.angular_velocity,r),free=b.free_velocity+cross(b.free_angular,r);const float vn=dot(v,n),original=dot(free,n);
  const float lambda=original<0?-vn/w:vn<0?-vn/w:0;b.velocity=b.velocity+n*(lambda/rig_[i].mass);b.angular_velocity=b.angular_velocity+inverse_inertia(i,g*lambda);
  const Vec3 post=b.velocity+cross(b.angular_velocity,r),tangent=post-n*dot(post,n);const float speed=length(tangent);if(speed<1e-7f)return;const Vec3 t=tangent*(1/speed),gt=cross(r,t);const float wt=1/rig_[i].mass+dot(gt,inverse_inertia(i,gt));const float friction=std::min(speed/wt,.6f*(std::fabs(lambda)+9.81f*DT*std::fabs(n.y)/w));b.velocity=b.velocity-t*(friction/rig_[i].mass);b.angular_velocity=b.angular_velocity-inverse_inertia(i,gt*friction);
}
void Ragdoll::skin_velocity_contact(uint32_t i,Vec3 n){
  const auto& c=contacts_[i];const auto blend=dual_quaternion_blend(skin_,c.bones,c.weights);const auto jacobian=SkinnedContactJacobian::from(blend,c.position,n);std::array<DualQuaternionPointGradient,8> g{};float w=0,v=0,free=0;
  for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];const auto& m=palette_[b];g[k]=jacobian.bone(skin_[b],blend.signed_weights[k],{m.m[12],m.m[13],m.m[14]},bodies_[b].position);w+=dot(g[k].translation,g[k].translation)/rig_[b].mass+dot(g[k].rotation,inverse_inertia(b,g[k].rotation));v+=dot(g[k].translation,bodies_[b].velocity)+dot(g[k].rotation,bodies_[b].angular_velocity);free+=dot(g[k].translation,bodies_[b].free_velocity)+dot(g[k].rotation,bodies_[b].free_angular);}
  if(w<1e-9f)return;const float lambda=free<0?-v/w:v<0?-v/w:0;
  for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];bodies_[b].velocity=bodies_[b].velocity+g[k].translation*(lambda/rig_[b].mass);bodies_[b].angular_velocity=bodies_[b].angular_velocity+inverse_inertia(b,g[k].rotation*lambda);}
  // Actual skinned support points need the same material friction as capsules.
  // Differentiate the normalized DQS point under each rigid body's velocity;
  // an LBS average would use the wrong tangent for mixed joint weights.
  Quaternion real_velocity{},dual_velocity{};
  for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];const auto& body=bodies_[b];const auto& m=palette_[b];const Vec3 t{m.m[12],m.m[13],m.m[14]},omega=body.angular_velocity,dt=body.velocity+cross(omega,t-body.position);
    const auto product=quaternion_product({omega.x,omega.y,omega.z,0},skin_[b].real);Quaternion dq{};for(std::size_t axis=0;axis<4;++axis)dq[axis]=product[axis]*.5f;
    const auto moving=quaternion_product({dt.x,dt.y,dt.z,0},skin_[b].real),turning=quaternion_product({t.x,t.y,t.z,0},dq);
    for(std::size_t axis=0;axis<4;++axis){real_velocity[axis]+=dq[axis]*blend.signed_weights[k];dual_velocity[axis]+=(moving[axis]+turning[axis])*.5f*blend.signed_weights[k];}
  }
  const Vec3 surface_velocity=dual_quaternion_point_derivative(blend,real_velocity,dual_velocity,c.position),tangent=surface_velocity-n*dot(surface_velocity,n);const float speed=length(tangent);if(speed<1e-7f)return;
  const Vec3 direction=tangent*(1/speed);const auto tangent_jacobian=SkinnedContactJacobian::from(blend,c.position,direction);float tangent_mass=0;
  for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];const auto& m=palette_[b];g[k]=tangent_jacobian.bone(skin_[b],blend.signed_weights[k],{m.m[12],m.m[13],m.m[14]},bodies_[b].position);tangent_mass+=dot(g[k].translation,g[k].translation)/rig_[b].mass+dot(g[k].rotation,inverse_inertia(b,g[k].rotation));}
  if(tangent_mass<1e-9f)return;const float friction=std::min(speed/tangent_mass,.6f*(std::fabs(lambda)+9.81f*DT*std::fabs(n.y)/w));
  for(std::size_t k=0;k<8;++k){if(c.weights[k]<=0)continue;const uint32_t b=c.bones[k];bodies_[b].velocity=bodies_[b].velocity-g[k].translation*(friction/rig_[b].mass);bodies_[b].angular_velocity=bodies_[b].angular_velocity-inverse_inertia(b,g[k].rotation*friction);}
}
void Ragdoll::refresh(){skin_frames();bounds_={{std::numeric_limits<float>::max(),std::numeric_limits<float>::max(),std::numeric_limits<float>::max()},{-std::numeric_limits<float>::max(),-std::numeric_limits<float>::max(),-std::numeric_limits<float>::max()}};const auto include=[&](Aabb b){bounds_.min={std::min(bounds_.min.x,b.min.x),std::min(bounds_.min.y,b.min.y),std::min(bounds_.min.z,b.min.z)};bounds_.max={std::max(bounds_.max.x,b.max.x),std::max(bounds_.max.y,b.max.y),std::max(bounds_.max.z,b.max.z)};};for(uint32_t i=0;i<rig_.size();++i)include(bone_bounds(i));for(uint32_t i=0;i<contacts_.size();++i){const Vec3 p=contact_position(i),r{contacts_[i].radius,contacts_[i].radius,contacts_[i].radius};include({p-r,p+r});}}
std::optional<Ragdoll::Hit> Ragdoll::raycast(const Ray& ray,float reach) const{
  std::optional<Hit> result;for(uint32_t i=0;i<rig_.size();++i){const Vec3 a=head(i),b=tail(i),axis=b-a,offset=ray.origin-a;const float aa=dot(axis,axis),ad=dot(axis,ray.direction),ao=dot(axis,offset),d_o=dot(ray.direction,offset),oo=dot(offset,offset),radius=rig_[i].radius;const float A=aa-ad*ad,B=aa*d_o-ao*ad,C=aa*oo-ao*ao-radius*radius*aa,disc=B*B-A*C;float closest=reach;if(A>1e-7f&&disc>=0){const float t=(-B-std::sqrt(disc))/A,y=ao+t*ad;if(t>=0&&y>=0&&y<=aa)closest=std::min(closest,t);}for(const Vec3 center:{a,b}){const Vec3 relative=ray.origin-center;const float p=dot(relative,ray.direction),square=dot(relative,relative)-radius*radius,d=p*p-square;if(square<=0)closest=0;else if(d>=0){const float t=-p-std::sqrt(d);if(t>=0)closest=std::min(closest,t);}}if(closest<reach&&(!result||closest<result->distance))result=Hit{i,closest};}return result;
}
void Ragdoll::impulse(uint32_t i,Vec3 velocity){if(i>=bodies_.size())return;bodies_[i].velocity=bodies_[i].velocity+velocity;sleeping_=false;quiet_ticks_=0;}
void Ragdoll::step(const Lbvh& stage,std::span<const Aabb> gates,const Aabb& room){
  if(rig_.empty()||sleeping_)return;maximum_speed_=maximum_angular_speed_=0;std::array<Vec3,MAX_CONTACTS> previous_contacts{};const float damping=std::exp(-DAMPING_PER_SECOND*DT);
  struct PublishedPose {Vec3 head,tail,radial;Quaternion rotation;};
  std::array<PublishedPose,MAX_BONES> before{};
  for(uint32_t i=0;i<rig_.size();++i)before[i]={head(i),tail(i),bodies_[i].position+rotated(bodies_[i].rotation,{rig_[i].radius,0,0}),bodies_[i].rotation};
  for(uint32_t i=0;i<contacts_.size();++i)step_contacts_[i]=contact_position(i);
  for(int substep=0;substep<SUBSTEPS;++substep){
    for(uint32_t i=0;i<contacts_.size();++i)previous_contacts[i]=contact_position(i);
    for(auto& b:bodies_){b.previous=b.position;b.previous_rotation=b.rotation;b.velocity=(b.velocity+Vec3{0,-9.81f*DT,0})*damping;b.angular_velocity=b.angular_velocity*damping;b.free_velocity=b.velocity;b.free_angular=b.angular_velocity;b.position=b.position+b.velocity*DT;b.rotation=turn(b.rotation,b.angular_velocity*DT);}
    for(int iteration=0;iteration<ITERATIONS;++iteration){
      for(uint32_t i=0;i<rig_.size();++i)constrain(i);
      for(uint32_t i=0;i<rig_.size();++i){const auto& b=bodies_[i];const Vec3 r{rig_[i].radius,rig_[i].radius,rig_[i].radius};Aabb sweep=bone_bounds(i);for(float side:{-.5f,.5f}){const Vec3 old=b.previous+rotated(b.previous_rotation,{0,b.length*side,0});sweep.min={std::min(sweep.min.x,old.x-r.x),std::min(sweep.min.y,old.y-r.y),std::min(sweep.min.z,old.z-r.z)};sweep.max={std::max(sweep.max.x,old.x+r.x),std::max(sweep.max.y,old.y+r.y),std::max(sweep.max.z,old.z+r.z)};}
        stage.overlap_leaves(sweep,[&](const Aabb& box){collide(i,box);});for(const auto& gate:gates)collide(i,gate);
        for(Vec3 at:{head(i),tail(i)}){const Vec3 inside{std::clamp(at.x,room.min.x+r.x,room.max.x-r.x),std::clamp(at.y,room.min.y+r.y,room.max.y-r.y),std::clamp(at.z,room.min.z+r.z,room.max.z-r.z)};bone_push(i,at,inside-at);}
      }
      skin_frames();for(uint32_t i=0;i<contacts_.size();++i){const auto& c=contacts_[i];Vec3 at=contact_position(i);const Vec3 old=previous_contacts[i],r{c.radius,c.radius,c.radius};const Aabb sweep{{std::min(at.x,old.x)-r.x,std::min(at.y,old.y)-r.y,std::min(at.z,old.z)-r.z},{std::max(at.x,old.x)+r.x,std::max(at.y,old.y)+r.y,std::max(at.z,old.z)+r.z}};
        // Each leaf sees the same current DQS point until a correction actually
        // changes its influencing bodies. Keep swept-query order unchanged.
        const auto push=[&](Vec3 correction){if(contact_push(i,correction))at=contact_position(i);};
        stage.overlap_leaves(sweep,[&](const Aabb& box){push(separation(at,old,box,c.radius));});for(const auto& gate:gates)push(separation(at,old,gate,c.radius));const Vec3 inside{std::clamp(at.x,room.min.x+r.x,room.max.x-r.x),std::clamp(at.y,room.min.y+r.y,room.max.y-r.y),std::clamp(at.z,room.min.z+r.z,room.max.z-r.z)};contact_push(i,inside-at);}
    }
    for(auto& b:bodies_){b.velocity=(b.position-b.previous)*(1/DT);b.angular_velocity=angular_delta(b.rotation,b.previous_rotation)*(1/DT);}
    skin_frames();
    for(uint32_t i=0;i<rig_.size();++i){const int samples=std::clamp(static_cast<int>(std::ceil(bodies_[i].length/(rig_[i].radius*1.5f))),2,16);for(int j=0;j<=samples;++j){const Vec3 at=bodies_[i].position+rotated(bodies_[i].rotation,{0,bodies_[i].length*(static_cast<float>(j)/samples-.5f),0}),r{rig_[i].radius+.003f,rig_[i].radius+.003f,rig_[i].radius+.003f};stage.overlap_leaves({at-r,at+r},[&](const Aabb& box){const Vec3 n=contact_normal(at,box,rig_[i].radius);if(dot(n,n)>.5f)velocity_contact(i,at,n);});for(const auto& gate:gates){const Vec3 n=contact_normal(at,gate,rig_[i].radius);if(dot(n,n)>.5f)velocity_contact(i,at,n);}}}
    for(uint32_t i=0;i<contacts_.size();++i){const Vec3 at=contact_position(i),r{contacts_[i].radius+.003f,contacts_[i].radius+.003f,contacts_[i].radius+.003f};stage.overlap_leaves({at-r,at+r},[&](const Aabb& box){const Vec3 n=contact_normal(at,box,contacts_[i].radius);if(dot(n,n)>.5f)skin_velocity_contact(i,n);});for(const auto& gate:gates){const Vec3 n=contact_normal(at,gate,contacts_[i].radius);if(dot(n,n)>.5f)skin_velocity_contact(i,n);}}
  }
  // Only the completed 60Hz palette is published. Measure every visible
  // support and articulated endpoint over that same interval; 2ms internal
  // constraint corrections must not masquerade as persistent rendered motion.
  for(uint32_t i=0;i<rig_.size();++i){const auto& b=bodies_[i];const Vec3 radial=b.position+rotated(b.rotation,{rig_[i].radius,0,0});maximum_speed_=std::max({maximum_speed_,length(head(i)-before[i].head)/TICK,length(tail(i)-before[i].tail)/TICK,length(radial-before[i].radial)/TICK});maximum_angular_speed_=std::max(maximum_angular_speed_,length(angular_delta(b.rotation,before[i].rotation))/TICK);}
  for(uint32_t i=0;i<contacts_.size();++i)maximum_speed_=std::max(maximum_speed_,length(contact_position(i)-step_contacts_[i])/TICK);
  ++ticks_;quiet_ticks_=maximum_speed_<=.04f&&maximum_angular_speed_<=.08f?quiet_ticks_+1:0;if(quiet_ticks_>=60){sleeping_=true;for(auto& b:bodies_)b.velocity=b.angular_velocity={};}refresh();
}
} // namespace engine
