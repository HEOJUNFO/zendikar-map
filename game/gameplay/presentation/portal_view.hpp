#pragma once

#include <array>
#include <cstdint>

#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"
#include "gameplay/presentation/camera.hpp"
#include "gameplay/simulation/world.hpp"

namespace game {

/** 적을 다 잡은 뒤 석판이 내려가고 포털이 번져 나오는 시간 (틱) — 0.5 초 */
inline constexpr uint64_t PORTAL_OPEN_TICKS = 30;

/** 지금 방의 포털이 열린 정도 0..1 — 잠겨 있으면 0, 적을 다 잡은 뒤 PORTAL_OPEN_TICKS 에 걸쳐 1 로, 올 때부터 열려 있던 방은 1 */
constexpr float portal_open(const World& world) {
  if (world.locked()) return 0.0f;
  const auto opened = world.opened_tick();
  return opened && world.tick() - *opened < PORTAL_OPEN_TICKS ? static_cast<float>(world.tick() - *opened) / static_cast<float>(PORTAL_OPEN_TICKS) : 1.0f;
}

/**
 * 포털 — 검은 깊이 앞에 출렁이는 반투명 막과 형광 룬빛 가장자리 (wgsl/portal.wgsl). 세계를 읽기만 한다.
 * 잠긴 방에서는 그리지 않는다 (석판이 막는다 — scene_view). 안 가 본 방은 청록, 가 본 방은 짙은 푸른빛이다.
 * 장면의 다른 것을 다 그린 뒤 검은 뒤판과 막을 차례로 그린다. 장면 깊이는 비교만 하고 덮지 않는다.
 */
class PortalView {
 public:
  /** 인스턴스 하나 — wgsl/portal.wgsl 의 @location(1) */
  struct Instance {
    /** yaw, 열린 정도, 방문 여부, 검은 뒤판 여부 */
    std::array<float, 4> door;
  };

  bool create(engine::gpu::Device& device, engine::ShaderLibrary& shaders);
  /** begin_frame 과 end_frame 사이에서 한 번, 장면의 맨 나중에 */
  void draw(engine::gpu::Device& device, const World& world, const Camera& camera);

 private:
  engine::gpu::PipelineHandle pipeline_;
  engine::gpu::BufferHandle frame_uniforms_;
  engine::gpu::BufferHandle vertices_;
  engine::gpu::BufferHandle instances_;
};

}  // namespace game
