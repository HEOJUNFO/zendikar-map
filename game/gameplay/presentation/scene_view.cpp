#include "gameplay/presentation/scene_view.hpp"

#include <array>
#include <cmath>
#include <numbers>

#include "gameplay_shaders.generated.hpp"

namespace game {
namespace {

// scene.wgsl 의 Frame 과 같은 배치 (mat4 64 + vec4 16)
struct FrameUniforms {
  std::array<float, 16> view_proj;
  std::array<float, 4> params;
};
static_assert(sizeof(FrameUniforms) == 80);
// scene.wgsl 의 @binding
constexpr uint32_t FRAME_BINDING = 0;
constexpr uint32_t AIM_BINDING = 1;

constexpr float FOV_Y = 75.0f * std::numbers::pi_v<float> / 180.0f;
constexpr float GROUND_EXTENT = 60.0f;
// 조준이 닿는 거리 — 시뮬레이션의 사거리와 같다
constexpr float AIM_RANGE = 200.0f;
// scene.wgsl: placement = 위치 + 크기, tint = 색 + (1 이면 바닥)
constexpr engine::Instance GROUND{{0.0f, 0.0f, 0.0f, GROUND_EXTENT}, {0.07f, 0.05f, 0.06f, 1.0f}};

}  // namespace

bool SceneView::create(engine::gpu::Device& device, engine::ShaderLibrary& shaders, uint32_t target_count) {
  pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::scene)), engine::InstanceBatch::vertex_layouts(), true});
  if (!pipeline_ || !lbvh_.create(device, shaders, target_count)) return false;
  frame_uniforms_ = device.create_buffer({engine::gpu::BufferUsage::uniform, sizeof(FrameUniforms)});
  targets_.create(device, engine::unit_cube(), target_count);
  ground_.create(device, engine::unit_ground(), 1);
  instances_.resize(target_count);
  boxes_.resize(target_count);
  return true;
}

void SceneView::prepare(engine::gpu::Device& device, const World& world, bool aiming) {
  const std::span<const Target> targets = world.targets();
  const std::span<const engine::Vec3> centers = world.target_centers();
  if (targets.size() != instances_.size()) return;
  // 화면 주사율이 틱보다 빠르면 같은 틱을 여러 번 그린다 — 상자가 그대로면 GPU 트리도 그대로 둔다
  bool moved = false;
  for (std::size_t i = 0; i < targets.size(); i++) {
    const engine::Vec3 c = centers[i];
    const float h = targets[i].half_extent;
    // 높이에 따라 붉은빛에서 금빛으로
    const float warm = targets[i].orbit_height * (1.0f / 7.0f);
    instances_[i] = {{c.x, c.y, c.z, h * 2.0f}, {0.9f, 0.18f + 0.55f * warm, 0.12f, 0.0f}};
    const engine::GpuBox box{{c.x - h, c.y - h, c.z - h, 0.0f}, {c.x + h, c.y + h, c.z + h, 0.0f}};
    if (boxes_[i] != box) {
      boxes_[i] = box;
      moved = true;
    }
  }
  if (moved) lbvh_.build(device, boxes_);

  const Player& player = world.player();
  const engine::Vec3 forward = engine::forward_from(player.yaw, player.pitch);
  const float distance = aiming ? AIM_RANGE : -1.0f;
  const auto same = [](engine::Vec3 a, engine::Vec3 b) { return a.x == b.x && a.y == b.y && a.z == b.z; };
  if (moved || !traced_ || distance != aim_distance_ || !same(player.position, aim_ray_.origin) || !same(forward, aim_ray_.direction)) {
    aim_ray_ = {player.position, forward};
    aim_distance_ = distance;
    traced_ = true;
    lbvh_.trace(device, aim_ray_, aim_distance_);
  }
}

void SceneView::draw(engine::gpu::Device& device, const World& world) {
  const Player& player = world.player();
  const float aspect = static_cast<float>(device.width()) / static_cast<float>(device.height());
  const engine::Mat4 view = engine::Mat4::look_along(player.position, engine::forward_from(player.yaw, player.pitch), {0.0f, 1.0f, 0.0f});
  const engine::Mat4 proj = engine::Mat4::perspective(FOV_Y, aspect, 0.1f, 200.0f);
  // 박자 머리에서 1, 곧 잦아든다
  const float pulse = std::exp(-6.0f * static_cast<float>(world.conductor().phase()));
  const FrameUniforms uniforms{(proj * view).m, {pulse, 0.0f, 0.0f, 0.0f}};
  device.write_buffer(frame_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const engine::gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}, {AIM_BINDING, lbvh_.hit_buffer()}};

  ground_.draw(device, pipeline_, bindings, {&GROUND, 1});
  targets_.draw(device, pipeline_, bindings, instances_);
}

}  // namespace game
