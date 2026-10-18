#pragma once
#include <array>
#include <optional>
#include <span>
#include <vector>
#include "engine/spatial/lbvh.hpp"
#include "gameplay/domain/creature_animation.hpp"

namespace game {
struct Enemy;
/** Immutable after asset loading. Only bind positions and influences are kept;
 * queries skin triangles on demand without copying the mesh each game tick. */
class BossSurface {
 public:
  CreatureAnimation animation;
  bool model(const engine::ModelMesh&);
  bool skin(const engine::ModelSkin&);
  bool ready() const;
  engine::Aabb broad_bounds(const Enemy&) const;
  engine::Aabb bounds(const Enemy&,uint64_t tick) const;
  std::optional<float> raycast(const Enemy&,uint64_t tick,const engine::Ray&,float reach) const;
  std::optional<engine::Vec3> target(const Enemy&,uint64_t tick,engine::Vec3 eye,const engine::Lbvh& stage) const;
 private:
  struct Vertex {engine::Vec3 position;std::array<uint32_t,8> joints{};std::array<float,8> weights{};};
  std::vector<Vertex> vertices_;
  bool model_loaded_{},skin_loaded_{},two_sided_{};
  float radius_{};
  engine::Vec3 point(size_t,const engine::SkinPalette&) const;
};
} // namespace game
