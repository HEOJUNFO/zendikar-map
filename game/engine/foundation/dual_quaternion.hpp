#pragma once
#include <array>
#include <cmath>
#include <cstdint>
#include <span>
#include "engine/foundation/math.hpp"

namespace engine {
using Quaternion=std::array<float,4>;
inline Quaternion quaternion_product(const Quaternion& a,const Quaternion& b) {
  const Vec3 av{a[0],a[1],a[2]},bv{b[0],b[1],b[2]},v=av*b[3]+bv*a[3]+cross(av,bv);
  return {v.x,v.y,v.z,a[3]*b[3]-dot(av,bv)};
}
inline Quaternion quaternion_conjugate(Quaternion q) { q[0]=-q[0];q[1]=-q[1];q[2]=-q[2];return q; }

struct DualQuaternion {
  std::array<float,4> real{0,0,0,1};
  std::array<float,4> dual{};
  static DualQuaternion from_rigid(const Mat4& m) {
    DualQuaternion q;auto& r=q.real;const float trace=m.m[0]+m.m[5]+m.m[10];
    if(trace>0){const float s=std::sqrt(trace+1)*2;r={(m.m[6]-m.m[9])/s,(m.m[8]-m.m[2])/s,(m.m[1]-m.m[4])/s,s*.25f};}
    else if(m.m[0]>m.m[5]&&m.m[0]>m.m[10]){const float s=std::sqrt(1+m.m[0]-m.m[5]-m.m[10])*2;r={s*.25f,(m.m[4]+m.m[1])/s,(m.m[8]+m.m[2])/s,(m.m[6]-m.m[9])/s};}
    else if(m.m[5]>m.m[10]){const float s=std::sqrt(1+m.m[5]-m.m[0]-m.m[10])*2;r={(m.m[4]+m.m[1])/s,s*.25f,(m.m[9]+m.m[6])/s,(m.m[8]-m.m[2])/s};}
    else {const float s=std::sqrt(1+m.m[10]-m.m[0]-m.m[5])*2;r={(m.m[8]+m.m[2])/s,(m.m[9]+m.m[6])/s,s*.25f,(m.m[1]-m.m[4])/s};}
    float size=0;for(float v:r)size+=v*v;const float inverse=1/std::sqrt(size);for(float& v:r)v*=inverse;
    const Vec3 t{m.m[12],m.m[13],m.m[14]},v{r[0],r[1],r[2]},d=(t*r[3]+cross(t,v))*.5f;
    q.dual={d.x,d.y,d.z,-.5f*dot(t,v)};return q;
  }
};

struct DualQuaternionBlend {
  Quaternion real{},dual{};
  std::array<float,8> signed_weights{};
  float norm{};
};

inline DualQuaternionBlend dual_quaternion_blend(std::span<const DualQuaternion> palette,const std::array<uint32_t,8>& bones,const std::array<float,8>& weights) {
  std::size_t reference=0;for(std::size_t i=1;i<8;++i)if(weights[i]>weights[reference])reference=i;
  DualQuaternionBlend blend;const auto& anchor=palette[bones[reference]].real;
  for(std::size_t i=0;i<8;++i){if(weights[i]<=0)continue;const auto& q=palette[bones[i]];float alignment=0;for(std::size_t k=0;k<4;++k)alignment+=q.real[k]*anchor[k];
    const float w=weights[i]*(alignment<0?-1.0f:1.0f);blend.signed_weights[i]=w;for(std::size_t k=0;k<4;++k){blend.real[k]+=q.real[k]*w;blend.dual[k]+=q.dual[k]*w;}}
  float square=0;for(float v:blend.real)square+=v*v;blend.norm=std::sqrt(square);
  if(blend.norm>1e-6f)for(std::size_t k=0;k<4;++k){blend.real[k]/=blend.norm;blend.dual[k]/=blend.norm;}
  return blend;
}

/** Exact point derivative of normalized DQS. The dual's component parallel to
 * the real quaternion only affects the scalar product, never translation. */
inline Vec3 dual_quaternion_point_derivative(const DualQuaternionBlend& blend,const Quaternion& raw_real_delta,const Quaternion& raw_dual_delta,Vec3 point) {
  float norm_delta=0;for(std::size_t k=0;k<4;++k)norm_delta+=blend.real[k]*raw_real_delta[k];
  Quaternion dr{},dd{};for(std::size_t k=0;k<4;++k){dr[k]=(raw_real_delta[k]-blend.real[k]*norm_delta)/blend.norm;dd[k]=(raw_dual_delta[k]-blend.dual[k]*norm_delta)/blend.norm;}
  const Quaternion p{point.x,point.y,point.z,0},conjugate=quaternion_conjugate(blend.real);
  const auto a=quaternion_product(quaternion_product(dr,p),conjugate),b=quaternion_product(quaternion_product(blend.real,p),quaternion_conjugate(dr));
  const auto c=quaternion_product(dd,conjugate),d=quaternion_product(blend.dual,quaternion_conjugate(dr));
  return {a[0]+b[0]+2*(c[0]+d[0]),a[1]+b[1]+2*(c[1]+d[1]),a[2]+b[2]+2*(c[2]+d[2])};
}

struct DualQuaternionPointGradient { Vec3 translation,rotation; };
inline DualQuaternionPointGradient dual_quaternion_point_gradient(const DualQuaternionBlend& blend,const DualQuaternion& bone,
                                                                   float signed_weight,Vec3 translation,Vec3 center,Vec3 point,Vec3 normal) {
  const Quaternion tq{translation.x,translation.y,translation.z,0};std::array<float,3> linear{},angular{};
  for(std::size_t axis=0;axis<3;++axis){
    Quaternion direction{};direction[axis]=1;const Vec3 omega{direction[0],direction[1],direction[2]};
    const auto product=quaternion_product(direction,bone.real);Quaternion dq{},translation_dual{};
    for(std::size_t c=0;c<4;++c){dq[c]=product[c]*.5f;translation_dual[c]=dq[c]*signed_weight;}
    linear[axis]=dot(normal,dual_quaternion_point_derivative(blend,{},translation_dual,point));
    const Vec3 dt=cross(omega,translation-center);const Quaternion dtq{dt.x,dt.y,dt.z,0};
    const auto moving=quaternion_product(dtq,bone.real),turning=quaternion_product(tq,dq);Quaternion real_delta{},dual_delta{};
    for(std::size_t c=0;c<4;++c){real_delta[c]=dq[c]*signed_weight;dual_delta[c]=(moving[c]+turning[c])*.5f*signed_weight;}
    angular[axis]=dot(normal,dual_quaternion_point_derivative(blend,real_delta,dual_delta,point));
  }
  return {{linear[0],linear[1],linear[2]},{angular[0],angular[1],angular[2]}};
}

/** Eight-influence DQS matching the GPU: largest-weight hemisphere reference,
 * normalized real/dual blend, orthogonalized dual, then rigid point transform. */
inline Vec3 dual_quaternion_point(std::span<const DualQuaternion> palette,
                                 const std::array<uint32_t,8>& bones,const std::array<float,8>& weights,Vec3 point) {
  const auto blend=dual_quaternion_blend(palette,bones,weights);if(blend.norm<1e-6f)return point;
  const auto& real=blend.real;auto dual=blend.dual;float parallel=0;for(std::size_t k=0;k<4;++k)parallel+=real[k]*dual[k];
  for(std::size_t k=0;k<4;++k)dual[k]-=real[k]*parallel;
  const Vec3 r{real[0],real[1],real[2]},d{dual[0],dual[1],dual[2]};
  return point+cross(r,cross(r,point)+point*real[3])*2+(d*real[3]-r*dual[3]+cross(r,d))*2;
}
} // namespace engine
