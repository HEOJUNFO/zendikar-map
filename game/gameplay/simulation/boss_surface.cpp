#include "gameplay/simulation/boss_surface.hpp"
#include "gameplay/simulation/creature_pose.hpp"
#include "engine/spatial/triangle.hpp"
#include <limits>

namespace game {
namespace {
engine::Vec3 rotate(engine::Vec3 p,float yaw) {
  const float c=std::cos(yaw),s=std::sin(yaw);return {c*p.x-s*p.z,p.y,s*p.x+c*p.z};
}
}
bool BossSurface::model(const engine::ModelMesh& mesh) {
  if(mesh.vertices.empty() || mesh.vertices.size()%3 || mesh.cutout ||
     (skin_loaded_ && vertices_.size()!=mesh.vertices.size()))return false;
  vertices_.resize(mesh.vertices.size());two_sided_=mesh.two_sided;radius_=0;
  for(size_t i=0;i<vertices_.size();++i){
    const auto& p=mesh.vertices[i].position;vertices_[i].position={p[0],p[1],p[2]};
    radius_=std::max(radius_,std::sqrt(engine::dot(vertices_[i].position,vertices_[i].position)));
  }
  // Conservative for every interpolated DQ and every eight-influence blend:
  // bone nlerp norm >= 1/sqrt(2); hemisphere-anchor skin norm >= sum(weights)/8.
  // Translation is twice the normalized dual norm. Convex pose crossfades stay
  // inside this ball. This only prunes candidates; it never counts as a hit.
  float max_dual=0;
  for(uint32_t clip=0;clip<animation.clip_count();++clip)
    for(const auto& q:animation.track(static_cast<CreatureAnimation::Clip>(clip)).transforms){
      float square=0;for(float d:q.dual)square+=d*d;max_dual=std::max(max_dual,std::sqrt(square));
    }
  radius_+=32*max_dual+.001f;model_loaded_=true;return true;
}
bool BossSurface::skin(const engine::ModelSkin& skin) {
  if(skin.vertices.empty() || skin.bone_count!=animation.bone_count() ||
     (model_loaded_ && vertices_.size()!=skin.vertices.size()))return false;
  vertices_.resize(skin.vertices.size());
  for(size_t i=0;i<vertices_.size();++i)for(size_t j=0;j<4;++j){
    const auto& v=skin.vertices[i];auto& out=vertices_[i];
    out.joints[j]=static_cast<uint32_t>(v.joints0[j]);out.weights[j]=v.weights0[j];
    out.joints[j+4]=static_cast<uint32_t>(v.joints1[j]);out.weights[j+4]=v.weights1[j];
  }
  skin_loaded_=true;return true;
}
bool BossSurface::ready() const {return model_loaded_ && skin_loaded_ && animation.clip_count()==9;}
engine::Vec3 BossSurface::point(size_t index,const engine::SkinPalette& palette) const {
  const auto& v=vertices_[index];return skinned_point(palette,v.joints,v.weights,v.position);
}
engine::Aabb BossSurface::broad_bounds(const Enemy& enemy) const {
  const engine::Vec3 radius{radius_,radius_,radius_};return {enemy.position-radius,enemy.position+radius};
}
std::optional<float> BossSurface::raycast(const Enemy& enemy,uint64_t tick,const engine::Ray& ray,float reach) const {
  if(!ready())return std::nullopt;
  const auto palette=sample_creature_palette(enemy,tick,animation,false);
  const engine::Ray local{rotate(ray.origin-enemy.position,-enemy.yaw),rotate(ray.direction,-enemy.yaw)};
  std::optional<float> found;
  for(size_t i=0;i<vertices_.size();i+=3){
    const auto a=point(i,palette),b=point(i+1,palette),c=point(i+2,palette);
    if(!two_sided_ && engine::dot(engine::cross(b-a,c-a),local.direction)>=0)continue;
    if(const auto hit=engine::intersect(local,a,b,c);hit && *hit<reach){reach=*hit;found=reach;}
  }
  return found;
}
engine::Aabb BossSurface::bounds(const Enemy& enemy,uint64_t tick) const {
  if(!ready())return {};
  const auto palette=sample_creature_palette(enemy,tick,animation,false);
  const float inf=std::numeric_limits<float>::infinity();engine::Aabb out{{inf,inf,inf},{-inf,-inf,-inf}};
  for(size_t i=0;i<vertices_.size();++i){const auto p=rotate(point(i,palette),enemy.yaw)+enemy.position;
    out.min={std::min(out.min.x,p.x),std::min(out.min.y,p.y),std::min(out.min.z,p.z)};
    out.max={std::max(out.max.x,p.x),std::max(out.max.y,p.y),std::max(out.max.z,p.z)};
  }
  return out;
}
std::optional<engine::Vec3> BossSurface::target(const Enemy& enemy,uint64_t tick,engine::Vec3 eye,const engine::Lbvh& stage) const {
  if(!ready())return std::nullopt;
  const auto palette=sample_creature_palette(enemy,tick,animation,false);
  const auto local_eye=rotate(eye-enemy.position,-enemy.yaw);float best=0;std::optional<engine::Vec3> selected;
  for(size_t i=0;i<vertices_.size();i+=3){
    const auto a=point(i,palette),b=point(i+1,palette),c=point(i+2,palette);
    const auto center=(a+b+c)*(1.0f/3),normal=engine::cross(b-a,c-a),delta=center-local_eye;
    const float distance2=engine::dot(delta,delta),facing=engine::dot(normal,delta);
    if(distance2<1e-8f || (!two_sided_ && facing>=0))continue;
    const float score=std::abs(facing)/(distance2*std::sqrt(distance2));if(score<=best)continue;
    const auto world_center=rotate(center,enemy.yaw)+enemy.position;
    const float distance=std::sqrt(distance2);const engine::Ray ray{eye,(world_center-eye)*(1/distance)};
    if(stage.raycast(ray,distance-.0001f))continue;
    best=score;selected=world_center;
  }
  return selected;
}
} // namespace game
