#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/foundation/dual_quaternion.hpp"
#include "engine/spatial/lbvh.hpp"

namespace engine {

struct RagdollBone {
  int32_t parent{-1};
  Vec3 head;
  Vec3 tail;
  Mat4 inverse_bind;
  float mass{1.0f};
  float radius{0.15f};
  float swing_limit{2.0f};
  float twist_min{-1.0f};
  float twist_max{1.0f};
};

struct RagdollContact {
  Vec3 position;
  std::array<uint32_t,8> bones{};
  std::array<float,8> weights{};
  float radius{.01f};
};

/** Reverse derivative of one normalized DQS support plane. The blend adjoints
 * are shared by every influencing body's six rigid velocity coordinates. */
struct SkinnedContactJacobian {
  Quaternion real,dual;
  static SkinnedContactJacobian from(const DualQuaternionBlend& blend,Vec3 point,Vec3 normal);
  DualQuaternionPointGradient bone(const DualQuaternion& transform,float signed_weight,Vec3 translation,Vec3 center) const;
};

/** Fixed-step articulated capsule physics, independent of rendering/assets.
 * Rigid centres/unit quaternions and capsule-derived inertia share generalized
 * mass across anchors, cone/twist limits and exact skinned contacts. Hard
 * position constraints use the zero-compliance rigid-body formulation from
 * Müller et al., Detailed Rigid Body Simulation with XPBD (2020):
 * https://matthias-research.github.io/pages/publications/PBDBodies.pdf
 * Fixed 60Hz ticks use eight substeps and six projection passes. Linear and
 * angular damping is 3.62725/s; capsule and skinned surface contacts use zero
 * restitution and Coulomb friction 0.6. Sleep requires every endpoint/skin contact
 * speed <=0.04m/s and angular speed <=0.08rad/s for 60 consecutive ticks.
 * ceiling: at most 32 rigid bones and 1024 source surface contacts; contacts are
 * a bounded physical approximation of a detailed skin, verified against the
 * actual rendered mesh. If a new asset penetrates between samples, regenerate
 * its contact coverage; never conceal it by lifting or shrinking the mesh.
 */
class Ragdoll {
 public:
  static constexpr std::size_t MAX_BONES=32;
  static constexpr std::size_t MAX_CONTACTS=1024;
  static constexpr float TICK=1.0f/60.0f;

  /** Rig storage must outlive this body. Model-to-world is a rigid transform. */
  bool start(std::span<const RagdollBone> rig, const Mat4& model_to_world, Vec3 impulse,std::span<const RagdollContact> contacts={});
  void step(const Lbvh& stage, std::span<const Aabb> gates, const Aabb& room);
  /** Physical impulse, applied to an articulated bone, wakes a settled body. */
  void impulse(uint32_t bone, Vec3 velocity);
  std::span<const Mat4> palette() const { return {palette_.data(),rig_.size()}; }
  const Aabb& bounds() const { return bounds_; }
  bool settled() const { return sleeping_; }
  uint32_t ticks() const { return ticks_; }
  float maximum_speed() const { return maximum_speed_; }
  float maximum_angular_speed() const { return maximum_angular_speed_; }
  /** Public bone-space diagnostics, also usable for hit tests. */
  Vec3 head(uint32_t bone) const;
  Vec3 tail(uint32_t bone) const;
  Aabb bone_bounds(uint32_t bone) const;
  Vec3 contact_position(uint32_t contact) const;
  struct Hit { uint32_t bone; float distance; };
  std::optional<Hit> raycast(const Ray& ray,float reach) const;

 private:
  struct Body {
    Vec3 position,previous,velocity,angular_velocity,free_velocity,free_angular;
    Quaternion rotation{0,0,0,1},previous_rotation{0,0,0,1},rest_rotation{0,0,0,1};
    Vec3 inverse_inertia,parent_anchor;
    float length{};
  };
  Mat4 frame(uint32_t bone) const;
  Vec3 inverse_inertia(uint32_t bone,Vec3 gradient) const;
  void correct(uint32_t bone,Vec3 translation,Vec3 angular);
  void angular_constraint(uint32_t bone,uint32_t parent,Vec3 axis,float error);
  void constrain(uint32_t bone);
  void collide(uint32_t bone, const Aabb& box);
  bool contact_push(uint32_t contact,Vec3 correction);
  void bone_push(uint32_t bone,Vec3 at,Vec3 correction);
  void velocity_contact(uint32_t bone,Vec3 at,Vec3 normal);
  void skin_velocity_contact(uint32_t contact,Vec3 normal);
  void skin_frames();
  void refresh();
  std::span<const RagdollBone> rig_;
  std::span<const RagdollContact> contacts_;
  // Allocated once on activation; dormant Worlds carry no inline 4KiB body.
  std::vector<Body> bodies_;
  std::vector<Mat4> palette_;
  std::vector<DualQuaternion> skin_;
  std::vector<Vec3> step_contacts_;
  Aabb bounds_{};
  uint32_t ticks_{}, quiet_ticks_{};
  float maximum_speed_{},maximum_angular_speed_{};
  bool sleeping_{};
};

} // namespace engine
