#pragma once

#include <array>
#include <cstdint>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/render/surface_batch.hpp"
#include "engine/shader/shader_library.hpp"
#include "gameplay/content/room_meshes.hpp"
#include "gameplay/presentation/camera.hpp"
#include "gameplay/presentation/scenery.hpp"
#include "gameplay/simulation/world.hpp"

namespace game {

/**
 * 던전 — 지금 방(돌려 놓은 틀 — 바닥·벽·천장·창·문틀이 통째다), 문이 나지 않은 문 자리의 막음돌, 잠긴 문의 룬 석판, 방에 놓인 소품, 적, 투사체.
 * 세계를 읽기만 한다 (원경과 손에 든 총은 stage_view, 포털은 portal_view 가 그린다).
 * 모두 같은 메시 몇 개의 인스턴스다: 메시는 한 번 올려 두고, 어디에 무엇이 놓였는지만 프레임마다 세계에서 읽어 올린다 (다른 방도 같은 버퍼로 그린다).
 * 방의 조각과 소품, 박쥐는 텍스처를 입힌 겉면(engine::SurfaceBatch)이고 텍스처와 모델은 받은 에셋 팩(scenery)에서 온다. 나머지 적과 투사체는 색 메시다.
 * 빛은 구운 것이다 (scenery 의 room_lights): 틀은 제 라이트맵을 읽고(틀의 좌표에서 구웠다 — 틀과 함께 돈다),
 * 소품은 소품마다 구운 프로브를, 막음돌·석판·적·투사체는 바닥 위 프로브 격자에서 제자리의 빛을 받는다.
 * 적은 저자가 만든 애니메이션의 포즈 버퍼를 공유한다. 발사 판정은 시뮬레이션의 CPU 트리가 한다.
 */
class SceneView {
 public:
  /** 인스턴스 하나 — wgsl/scene.wgsl 의 @location(3)…(5) */
  struct Instance {
    std::array<float, 4> placement;
    std::array<float, 4> pose;
    std::array<float, 4> tint;
    /** 그 자리의 빛 — rgb 위를 보는 면이 받는 빛과 해가 보이는 정도, rgb 아래를 보는 면이 받는 빛 */
    std::array<float, 4> light_up;
    std::array<float, 4> light_down;
  };

  /** rooms: 방 조각의 메시 — 시뮬레이션이 같은 메시의 충돌 상자에 부딪힌다. 이 뷰보다 오래 살아야 한다 */
  bool create(engine::gpu::Device& device, engine::ShaderLibrary& shaders, const RoomMeshes& rooms);
  /** begin_frame 과 end_frame 사이에서 한 번. scenery 가 다 풀리기 전에는 방과 소품을 그리지 않는다 */
  void draw(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery);

 private:
  enum Effect : uint32_t { GOO_POOL, FIRE_BREATH, SHOCKWAVE, MANA, GOO, WEB, EFFECT_COUNT };
  static constexpr uint32_t BOLT = Scenery::CREATURE_COUNT * Scenery::CREATURE_POSE_COUNT, PART_COUNT = BOLT + EFFECT_COUNT;
  /** 방을 짓는 조각 — 방 틀(SHAPE_COUNT 개)이 앞에 오고 그 뒤로 이 차례 */
  enum Piece : uint32_t { SEALED = SHAPE_COUNT, GATE, PIECE_COUNT };
  struct Mesh {
    engine::gpu::BufferHandle vertices;
    uint32_t vertex_count{};
  };
  void draw_room(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery, float glow);

  engine::gpu::PipelineHandle pipeline_;
  engine::gpu::PipelineHandle effect_pipeline_;
  engine::gpu::BufferHandle frame_uniforms_;
  engine::gpu::BufferHandle instance_buffer_;
  std::array<Mesh, EFFECT_COUNT> effects_;
  // 이번 프레임에 그릴 것 — 종류마다 모아 한 버퍼에 이어 올린다
  std::array<std::vector<Instance>, PART_COUNT> placed_;
  std::vector<Instance> upload_;
  // 방의 조각과 소품 (겉면) — 조각의 메시는 한 번 올려 두고, 조각마다 거기 고정해 놓인 소품들(메시의 placements)을 함께 그린다
  engine::SurfaceBatch surfaces_;
  engine::SurfaceBatch creatures_;
  std::array<std::vector<engine::SurfaceInstance>, Scenery::BAT_FRAME_COUNT> bat_groups_;
  std::vector<engine::SurfaceInstance> bat_upload_;
  std::vector<engine::SurfaceDraw> bat_draws_;
  std::array<Mesh, PIECE_COUNT> pieces_;
  const RoomMeshes* rooms_{};
  // 이번 프레임의 겉면 — 묶음(틀, 막음돌, 석판, 그 뒤로 소품마다)마다 모은 자리와 그것을 이어 올린 것
  std::vector<std::vector<engine::SurfaceInstance>> surface_groups_;
  std::vector<engine::SurfaceInstance> surface_upload_;
  std::vector<engine::SurfaceDraw> surface_draws_;
};

}  // namespace game
