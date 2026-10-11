#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <limits>
#include "engine/physics/ragdoll.hpp"

inline int ragdoll_probe() {
  int failures=0;const auto check=[&](bool ok,const char* label){if(!ok){std::printf("FAIL: %s\n",label);++failures;}};
  const auto dq=engine::DualQuaternion::from_rigid(engine::Mat4::from_basis({0,0,1},{0,1,0},{-1,0,0},{2,3,4}));
  auto opposite=dq;for(float& value:opposite.real)value=-value;for(float& value:opposite.dual)value=-value;
  const engine::DualQuaternion same_rotation[]{dq,opposite};
  const auto transformed=engine::dual_quaternion_point(same_rotation,{0,1,0,0,0,0,0,0},{.5f,.5f,0,0,0,0,0,0},{1,0,0});
  check(std::fabs(transformed.x-2)<1e-5f&&std::fabs(transformed.y-3)<1e-5f&&std::fabs(transformed.z-5)<1e-5f,"DQS: hemisphere-equivalent quaternions preserve the independent ninety-degree rotation and translation");
  std::array<engine::Mat4,8> transforms{engine::Mat4::from_basis({1,0,0},{0,1,0},{0,0,1},{-.4f,.2f,.1f}),
    engine::Mat4::from_basis({.8f,0,.6f},{0,1,0},{-.6f,0,.8f},{.7f,.3f,-.6f})};
  constexpr float angles[]{-2.7f,2.2f,-1.9f,1.5f,-.4f,2.9f};
  for(uint32_t i=2;i<8;++i){const float n=static_cast<float>(i),c=std::cos(angles[i-2]),s=std::sin(angles[i-2]);const auto axis=engine::normalize({n+1,3-n,.5f*n+1});
    const auto turn=[&](engine::Vec3 v){return v*c+engine::cross(axis,v)*s+axis*(engine::dot(axis,v)*(1-c));};
    transforms[i]=engine::Mat4::from_basis(turn({1,0,0}),turn({0,1,0}),turn({0,0,1}),{.13f*n,.17f*n-.5f,.24f*n-.6f});
  }
  std::array<engine::DualQuaternion,8> mixed;
  for(uint32_t i=0;i<8;++i){mixed[i]=engine::DualQuaternion::from_rigid(transforms[i]);if(i==1||i==5){for(float& v:mixed[i].real)v=-v;for(float& v:mixed[i].dual)v=-v;}}
  const std::array<uint32_t,8> mixed_bones{0,1,2,3,4,5,6,7};
  const std::array<float,8> weight_cases[]{{.35f,.65f,0,0,0,0,0,0},{.08f,.12f,.18f,.07f,.21f,.11f,.13f,.10f}};
  const engine::Vec3 model_point{.4f,-.2f,.7f},normal=engine::normalize({.3f,.8f,-.4f}),center{.1f,.7f,.3f};
  bool gradients=true,reference_matches=true,nontrivial_normalization=false;
  for(const auto& mixed_weights:weight_cases){
  const auto blend=engine::dual_quaternion_blend(mixed,mixed_bones,mixed_weights);
  nontrivial_normalization=nontrivial_normalization||blend.norm<.9f;
  const auto jacobian=engine::SkinnedContactJacobian::from(blend,model_point,normal);
  for(uint32_t bone=0;bone<8;++bone){
    if(mixed_weights[bone]==0)continue;
    const auto& m=transforms[bone];const engine::Vec3 translation{m.m[12],m.m[13],m.m[14]};
    const auto gradient=jacobian.bone(mixed[bone],blend.signed_weights[bone],translation,center);
    const auto reference=engine::dual_quaternion_point_gradient(blend,mixed[bone],blend.signed_weights[bone],translation,center,model_point,normal);
    reference_matches=reference_matches&&std::sqrt(engine::dot(gradient.translation-reference.translation,gradient.translation-reference.translation))<1e-5f&&std::sqrt(engine::dot(gradient.rotation-reference.rotation,gradient.rotation-reference.rotation))<1e-5f;
    const float linear[]{gradient.translation.x,gradient.translation.y,gradient.translation.z},angular[]{gradient.rotation.x,gradient.rotation.y,gradient.rotation.z};
    for(int rotation=0;rotation<2;++rotation)for(uint32_t axis=0;axis<3;++axis){
      constexpr float epsilon=.001f;float values[2]{};
      for(uint32_t side=0;side<2;++side){const float step=side?epsilon:-epsilon;engine::Mat4 shifted=m;
        if(!rotation)shifted.m[12+axis]+=step;
        else {const float c=std::cos(step),s=std::sin(step);engine::Mat4 turn=axis==0?engine::Mat4::from_basis({1,0,0},{0,c,s},{0,-s,c},{}):axis==1?engine::Mat4::from_basis({c,0,-s},{0,1,0},{s,0,c},{}):engine::Mat4::from_basis({c,s,0},{-s,c,0},{0,0,1},{});
          const engine::Vec3 rotated{turn.m[0]*center.x+turn.m[4]*center.y+turn.m[8]*center.z,turn.m[1]*center.x+turn.m[5]*center.y+turn.m[9]*center.z,turn.m[2]*center.x+turn.m[6]*center.y+turn.m[10]*center.z};
          turn.m[12]=center.x-rotated.x;turn.m[13]=center.y-rotated.y;turn.m[14]=center.z-rotated.z;shifted=turn*m;}
        auto perturbed=mixed;perturbed[bone]=engine::DualQuaternion::from_rigid(shifted);
        values[side]=engine::dot(normal,engine::dual_quaternion_point(perturbed,mixed_bones,mixed_weights,model_point));
      }
      gradients=gradients&&std::fabs((values[1]-values[0])/(2*epsilon)-(rotation?angular[axis]:linear[axis]))<.003f;
    }
  }
  }
  check(gradients&&reference_matches&&nontrivial_normalization,"DQS: actual reverse Jacobian matches independent forward derivatives and central XYZ matrix differences for two/eight weights, hemisphere signs and dual normalization");
  const engine::RagdollBone rig[]{
    {.parent=-1,.head={0,3,0},.tail={0,4,0},.inverse_bind={.m={1,0,0,0,0,1,0,0,0,0,1,0,0,-3,0,1}},.mass=2,.radius=.15f,.swing_limit=3.14159265f,.twist_min=-1.5f,.twist_max=1.5f},
    {.parent=0,.head={0,4,0},.tail={1,4,0},.inverse_bind={.m={0,1,0,0,-1,0,0,0,0,0,1,0,4,0,0,1}},.mass=1,.radius=.15f,.swing_limit=3.14159265f,.twist_min=-1.5f,.twist_max=1.5f}
  };
  const float nan=std::numeric_limits<float>::quiet_NaN();
  engine::Ragdoll invalid;
  bool refused=true;
  for(uint32_t field=0;field<9;++field){auto malformed=rig[0];
    switch(field){case 0:malformed.mass=nan;break;case 1:malformed.radius=nan;break;case 2:malformed.head.x=nan;break;case 3:malformed.tail.y=nan;break;case 4:malformed.inverse_bind.m[4]=nan;break;case 5:malformed.swing_limit=nan;break;case 6:malformed.twist_min=1;malformed.twist_max=-1;break;case 7:malformed.tail=malformed.head;break;default:malformed.inverse_bind.m[0]=2;break;}
    refused=refused&&!invalid.start({&malformed,1},engine::Mat4::identity(),{});
  }
  auto transform=engine::Mat4::identity();transform.m[12]=nan;
  refused=refused&&!invalid.start({rig,1},transform,{})&&!invalid.start({rig,1},engine::Mat4::identity(),{nan,0,0});
  transform=engine::Mat4::identity();transform.m[0]=-1;
  refused=refused&&!invalid.start({rig,1},transform,{});
  for(uint32_t field=0;field<4;++field){engine::RagdollContact malformed{.position={0,3,0},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0}};
    switch(field){case 0:malformed.weights[0]=nan;break;case 1:malformed.weights[0]=0;break;case 2:malformed.bones[0]=2;break;default:malformed.position.z=nan;break;}
    refused=refused&&!invalid.start({rig,1},engine::Mat4::identity(),{},{&malformed,1});
  }
  check(refused&&invalid.palette().empty(),"ragdoll: public start rejects nonfinite inputs, nonrigid/reflected frames, reversed limits, zero bones/weights and invalid skin indices before publishing state");
  const engine::Aabb floor{{-10,-1,-10},{10,0,10}},room{{-10,-40,-10},{10,9,10}};
  engine::Lbvh stage;stage.build({&floor,1});
  bool publication_matches=true,no_early_sleep=true;uint32_t moving_publications=0;
  const auto transform_point=[](const engine::Mat4& m,engine::Vec3 p){return engine::Vec3{m.m[0]*p.x+m.m[4]*p.y+m.m[8]*p.z+m.m[12],m.m[1]*p.x+m.m[5]*p.y+m.m[9]*p.z+m.m[13],m.m[2]*p.x+m.m[6]*p.y+m.m[10]*p.z+m.m[14]};};
  const auto publication_step=[&](engine::Ragdoll& target,std::span<const engine::RagdollBone> bones,std::span<const engine::RagdollContact> contacts,const engine::Lbvh& scene){
    std::array<engine::Vec3,6> before_points{};std::array<engine::Vec3,4> before_contacts{};std::array<engine::Mat4,2> before_palette{};
    const bool awake=!target.settled();
    for(uint32_t i=0;i<bones.size();++i){before_palette[i]=target.palette()[i];const auto& b=bones[i];const engine::Vec3 right{b.inverse_bind.m[0],b.inverse_bind.m[4],b.inverse_bind.m[8]};
      before_points[i*3]=target.head(i);before_points[i*3+1]=target.tail(i);before_points[i*3+2]=transform_point(target.palette()[i],(b.head+b.tail)*.5f+right*b.radius);}
    for(uint32_t i=0;i<contacts.size();++i)before_contacts[i]=target.contact_position(i);
    target.step(scene,{},room);
    if(!awake)return;
    float expected_speed=0,expected_angular=0;
    for(uint32_t i=0;i<bones.size();++i){const auto& b=bones[i];const engine::Vec3 right{b.inverse_bind.m[0],b.inverse_bind.m[4],b.inverse_bind.m[8]};
      const engine::Vec3 after[]{target.head(i),target.tail(i),transform_point(target.palette()[i],(b.head+b.tail)*.5f+right*b.radius)};
      for(uint32_t p=0;p<3;++p){const auto delta=after[p]-before_points[i*3+p];expected_speed=std::max(expected_speed,std::sqrt(engine::dot(delta,delta))*60);}
      engine::Vec3 sine_axis{};float trace=0;
      for(uint32_t column=0;column<3;++column){const auto& a=before_palette[i].m;const auto& z=target.palette()[i].m;const engine::Vec3 previous{a[column*4],a[column*4+1],a[column*4+2]},current{z[column*4],z[column*4+1],z[column*4+2]};sine_axis=sine_axis+engine::cross(previous,current);trace+=engine::dot(previous,current);}
      expected_angular=std::max(expected_angular,std::atan2(std::sqrt(engine::dot(sine_axis,sine_axis))*.5f,std::clamp((trace-1)*.5f,-1.0f,1.0f))*60);
    }
    for(uint32_t i=0;i<contacts.size();++i){const auto delta=target.contact_position(i)-before_contacts[i];expected_speed=std::max(expected_speed,std::sqrt(engine::dot(delta,delta))*60);}
    publication_matches=publication_matches&&std::fabs(expected_speed-target.maximum_speed())<.001f&&std::fabs(expected_angular-target.maximum_angular_speed())<.001f;
    if(expected_speed>.04f||expected_angular>.08f){++moving_publications;no_early_sleep=no_early_sleep&&!target.settled();}
  };
  engine::Ragdoll body,twin;body.start(rig,engine::Mat4::identity(),{1,0,.5f});twin.start(rig,engine::Mat4::identity(),{1,0,.5f});
  bool deterministic=true,rigid=true,contained=true,articulated=false;
  for(int tick=0;tick<1800;++tick){
    publication_step(body,rig,{},stage);twin.step(stage,{},room);
    for(uint32_t bone=0;bone<2;++bone){
      const engine::Vec3 delta=body.tail(bone)-body.head(bone);rigid=rigid&&std::fabs(std::sqrt(engine::dot(delta,delta))-1)<.03f;
      const auto& a=body.palette()[bone].m;const auto& b=twin.palette()[bone].m;deterministic=deterministic&&a==b;
      for(float value:a)contained=contained&&std::isfinite(value);
    }
    const auto box=body.bounds();contained=contained&&box.min.y>=-.001f&&box.max.x<=10.001f;
    articulated=articulated||std::fabs(body.palette()[0].m[5]-body.palette()[1].m[5])>.1f;
  }
  check(deterministic,"ragdoll: identical public starts and fixed steps give identical articulated matrices");
  check(rigid&&contained,"ragdoll: two linked one-metre bones retain length and remain finite above the real floor");
  check(articulated&&body.settled(),"ragdoll: gravity bends linked bodies independently and damped contact eventually sleeps");
  check(body.maximum_speed()<=.05f&&body.maximum_angular_speed()<=.1f,"ragdoll: sleep occurs below five centimetres/second and six degrees/second, not a substep displacement threshold");
  const engine::Vec3 target=(body.head(0)+body.tail(0))*.5f;
  const engine::Ray hit{target+engine::Vec3{0,2,0},{0,-1,0}},miss{target+engine::Vec3{0,2,2},{0,-1,0}};
  check(body.raycast(hit,5).has_value()&&!body.raycast(miss,5).has_value(),"ragdoll: settled articulated capsules accept a body ray and reject empty air");
  body.impulse(0,{0,2,0});check(!body.settled(),"ragdoll: a physical impulse wakes a sleeping corpse");
  const engine::Aabb wall{{1,0,-10},{1.05f,9,10}};stage.build({&wall,1});
  engine::Ragdoll swept;swept.start({rig,1},engine::Mat4::identity(),{300,0,0});
  swept.step(stage,{},room);check(swept.bounds().max.x<=1.001f,"ragdoll: a 300m/s impulse cannot tunnel through a five-centimetre wall");
  engine::Lbvh empty;engine::Ragdoll gated;gated.start({rig,1},engine::Mat4::identity(),{300,0,0});
  gated.step(empty,{&wall,1},room);check(gated.bounds().max.x<=1.001f,"ragdoll: closed room gates collide with the same swept capsules as stage solids");
  engine::Ragdoll falling;falling.start({rig,1},engine::Mat4::identity(),{});
  for(int tick=0;tick<180;++tick)publication_step(falling,{rig,1},{},empty);
  check(falling.bounds().max.y<0,"ragdoll: absent stage floor is a real gap; room bounds do not invent a floor at zero");
  const engine::RagdollContact foot{.position={0,2,0},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0},.radius=.01f};
  stage.build({&floor,1});engine::Ragdoll surface;surface.start({rig,1},engine::Mat4::identity(),{},{&foot,1});
  bool first_contact=false,supported_before_core=false,skin_floor_clear=true;
  for(int tick=0;tick<900;++tick){
    publication_step(surface,{rig,1},{&foot,1},stage);const float contact_y=surface.contact_position(0).y;
    skin_floor_clear=skin_floor_clear&&contact_y>=-.001f;
    if(!first_contact&&contact_y<=.015f){first_contact=true;supported_before_core=surface.head(0).y>.9f;}
  }
  check(first_contact&&supported_before_core&&skin_floor_clear&&surface.settled(),"ragdoll: the source strut reaches floor before the bone capsule, never penetrates it, then may naturally roll and settle");
  const engine::RagdollContact extension{.position={.8f,3.5f,0},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0},.radius=.01f};
  engine::Ragdoll wall_surface;wall_surface.start({rig,1},engine::Mat4::identity(),{20,0,0},{&extension,1});stage.build({&wall,1});
  bool skin_wall_clear=true;
  for(int tick=0;tick<30;++tick){wall_surface.step(stage,{},room);skin_wall_clear=skin_wall_clear&&wall_surface.contact_position(0).x<=1.001f;}
  check(skin_wall_clear,"ragdoll: the actual skinned extension cannot cross a thin wall even when its smaller bone capsule fits");
  const engine::RagdollContact feet[]{
    {.position={-1,2.7f,-1},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0}},
    {.position={1,2.7f,-1},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0}},
    {.position={-1,2.7f,1},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0}},
    {.position={1,2.7f,1},.bones={0,0,0,0,0,0,0,0},.weights={1,0,0,0,0,0,0,0}}
  };
  // A low COM over four symmetric source contacts isolates sliding from the
  // tall tripod's legitimate angular rocking. The bone capsule stays >0.15m
  // above the floor, so only actual skinned contacts supply its support.
  auto low_body=rig[0];low_body.tail={0,3.2f,0};
  auto placement=engine::Mat4::identity();placement.m[13]=-2.69f;
  engine::Ragdoll sliding;sliding.start({&low_body,1},placement,{1,0,0},feet);stage.build({&floor,1});bool supported=true;
  for(int tick=0;tick<18;++tick){sliding.step(stage,{},room);for(uint32_t contact=0;contact<4;++contact)supported=supported&&sliding.contact_position(contact).y>=-.001f;}
  const float displacement=(sliding.head(0).x+sliding.tail(0).x)*.5f;
  // With drag alone, v(t)=exp(-3.62725t), so x(0.3)=(1-exp(-1.088175))/3.62725.
  const float drag_only=(1-std::exp(-3.62725f*.3f))/3.62725f;
  check(supported&&displacement<drag_only-.001f,"ragdoll: symmetric skin-only support supplies real tangential friction beyond the independently calculated drag-only displacement");
  for(int tick=0;tick<900;++tick){sliding.step(stage,{},room);for(uint32_t contact=0;contact<4;++contact)supported=supported&&sliding.contact_position(contact).y>=-.001f;}
  check(supported&&sliding.settled()&&sliding.maximum_speed()<=.04f&&sliding.maximum_angular_speed()<=.08f,"ragdoll: the low-COM friction-supported body settles with small physical speeds while its source surfaces remain above the floor");
  check(publication_matches,"ragdoll: reported speeds match independent 60Hz public endpoint/radial/skin displacement and published matrix axis angles");
  check(no_early_sleep&&moving_publications>180,"ragdoll: moving, articulated and genuinely falling published bodies cannot sleep while visible motion exceeds unchanged physical limits");
  return failures;
}
