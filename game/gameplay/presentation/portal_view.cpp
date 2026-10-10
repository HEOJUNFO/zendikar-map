#include "gameplay/presentation/portal_view.hpp"

#include <cmath>
#include <cstddef>
#include <numbers>
#include <span>

#include "gameplay_shaders.generated.hpp"

namespace game {
namespace {

// portal.wgsl 의 Frame 과 같은 배치 (mat4 64 + vec4 16), @binding(0)
struct FrameUniforms {
  std::array<float, 16> view_proj;
  std::array<float, 4> params;
};
static_assert(sizeof(FrameUniforms) == 80);
constexpr uint32_t FRAME_BINDING = 0;

// 막 — 북쪽 문의 아치 속을 채우는 오각형 (문설주 사이 x ±2, 문설주 머리 y 5.9, 아치 꼭대기 y 6.95 — tools/art/make-rooms.mjs 의 doorway 가 방 틀마다 같은 치수로 짓는다).
// 가장자리는 돌 속으로 조금 들어가 틈이 보이지 않는다. 삼각형 셋
constexpr float EDGE = DOOR_HALF_WIDTH + 0.1f, SHOULDER = 5.95f, APEX = 7.05f, DEPTH = -ROOM_HALF;
constexpr float MEMBRANE[][3] = {
    {-EDGE, 0.0f, DEPTH}, {EDGE, 0.0f, DEPTH},     {EDGE, SHOULDER, DEPTH},  {-EDGE, 0.0f, DEPTH}, {EDGE, SHOULDER, DEPTH},
    {0.0f, APEX, DEPTH},  {-EDGE, 0.0f, DEPTH},    {0.0f, APEX, DEPTH},      {-EDGE, SHOULDER, DEPTH},
};
constexpr uint32_t MEMBRANE_VERTICES = sizeof MEMBRANE / sizeof MEMBRANE[0];

constexpr engine::gpu::VertexAttribute VERTEX_ATTRIBUTES[] = {{0, 3, 0}};
constexpr engine::gpu::VertexAttribute INSTANCE_ATTRIBUTES[] = {{1, 4, offsetof(PortalView::Instance, door)}};
constexpr engine::gpu::VertexBufferLayout LAYOUTS[] = {
    {sizeof MEMBRANE[0], engine::gpu::VertexStep::vertex, VERTEX_ATTRIBUTES},
    {sizeof(PortalView::Instance), engine::gpu::VertexStep::instance, INSTANCE_ATTRIBUTES},
};
constexpr float QUARTER_TURN = std::numbers::pi_v<float> / 2.0f;
// 물결의 시간이 한 바퀴 도는 틱 수 — 한 시간. float 의 정밀도가 남는 동안만 센다 (돌아오는 순간 물결이 한 번 튄다)
constexpr uint64_t TIME_WRAP = 3600 * TICK_RATE;

}  // namespace

bool PortalView::create(engine::gpu::Device& device, engine::ShaderLibrary& shaders) {
  // 막은 방 안에서만 보이지만 양면을 다 그린다 (뒤집힌 쪽의 문도 같은 삼각형을 돌려 쓴다)
  pipeline_ = device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::portal)), .vertex_buffers = LAYOUTS, .depth_test = true, .alpha_blend = true});
  frame_uniforms_ = device.create_buffer({engine::gpu::BufferUsage::uniform, sizeof(FrameUniforms)});
  vertices_ = device.create_buffer({engine::gpu::BufferUsage::vertex, sizeof MEMBRANE, MEMBRANE});
  instances_ = device.create_buffer({engine::gpu::BufferUsage::vertex, 4 * sizeof(Instance)});
  return pipeline_ && frame_uniforms_ && vertices_ && instances_;
}

void PortalView::draw(engine::gpu::Device& device, const World& world, const Camera& camera) {
  const float open = portal_open(world);
  if (open <= 0.0f) return;
  const Floor& floor = world.floor();
  const Room& room = floor.rooms[world.room()];
  Instance placed[4];
  uint32_t count = 0;
  for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
    if (!room.door(d)) continue;
    const auto beyond = floor.at(room.x + DIRECTION_X[d], room.z + DIRECTION_Z[d]);
    placed[count++] = {{static_cast<float>(d) * QUARTER_TURN, open, beyond && world.visited(*beyond) ? 1.0f : 0.0f, 0.0f}};
  }
  if (!count) return;
  device.write_buffer(instances_, std::as_bytes(std::span{placed}));

  const float seconds = static_cast<float>(world.tick() % TIME_WRAP) / static_cast<float>(TICK_RATE);
  const FrameUniforms uniforms{camera.view_proj.m, {seconds, std::exp(-6.0f * beat_phase(world.tick())), 0.0f, 0.0f}};
  device.write_buffer(frame_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const engine::gpu::BufferHandle buffers[] = {vertices_, instances_};
  const engine::gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}};
  device.draw({.pipeline = pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = MEMBRANE_VERTICES, .instance_count = count});
}

}  // namespace game
