#pragma once

#include <array>
#include <optional>

#include "engine/gpu/device.hpp"
#include "engine/render/mesh_batch.hpp"
#include "engine/render/sky_batch.hpp"
#include "engine/render/surface_batch.hpp"
#include "engine/shader/shader_library.hpp"
#include "gameplay/presentation/camera.hpp"
#include "gameplay/presentation/light.hpp"
#include "gameplay/presentation/scenery.hpp"
#include "gameplay/presentation/weapon.hpp"
#include "gameplay/simulation/world.hpp"

namespace game {

/**
 * 하늘과 원경과 손에 든 총 — 창 밖의 하늘 그림(에셋 팩의 등장방형 그림 — 방의 돌림만큼 돌려, 해가 구운 빛과 같은 쪽에 있다), 하늘에 뜬 헤드론과 유적 조각(색 메시),
 * 1인칭 권총(에셋 팩의 겉면 메시 — 부품마다 움직인다)과 쏜 순간의 총구 섬광(wgsl/flash.wgsl)을 그린다. 세계를 읽기만 한다 (방과 적은 scene_view 가 그린다)
 */
class StageView {
 public:
  bool create(engine::gpu::Device& device, engine::ShaderLibrary& shaders);
  // 모두 장면 패스에서 프레임마다 한 번씩, 이 차례로 (가까운 것부터 — 가려진 픽셀은 깊이 판정에서 버려진다): 총, (방과 적 — scene_view), 원경, 하늘, (포털), 섬광
  /** 손에 든 총 — 장면의 다른 것보다 먼저 (늘 맨 앞에 그려진다). 에셋 팩을 다 푼 뒤에만 그려진다. alpha 는 지난 틱에서 이번 틱으로 가는 사이의 위치 0..1 */
  void draw_weapon(engine::gpu::Device& device, const World& world, const Camera& camera, const ViewMotion& motion, const Scenery& scenery, float alpha);
  /** 원경 — 방과 적을 그린 뒤에 */
  void draw_backdrop(engine::gpu::Device& device, const World& world, const Camera& camera);
  /** 하늘 — 불투명한 것을 다 그린 뒤에: 아무것도 그려지지 않은 픽셀만 채운다 (창과 채광 구멍). 하늘 그림이 아직 없으면 지운 색 그대로다 */
  void draw_sky(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery);
  /**
   * 총구 섬광 — 장면의 맨 나중에 (이미 그려진 색에 더한다). 이 프레임의 draw_weapon 이 놓은 자리에 그린다: 쏜 뒤 FLASH_TICKS 틱 동안만 그릴 것이 있다.
   * 총과 같은 시야각·당긴 깊이라 벽에 묻히지 않고, 총에 가린 곳은 그려지지 않는다
   */
  void draw_flash(engine::gpu::Device& device);

 private:
  engine::SkyBatch sky_;
  engine::MeshBatch backdrop_;
  // 방의 겉면과 보는 법이 다르다 (제 시야각, 당긴 깊이) — 묶음을 따로 둔다
  engine::SurfaceBatch weapon_;
  WeaponAnimator animator_;
  // 손에 든 것이 받는 빛 — 플레이어가 선 자리의 빛을 프레임마다 조금씩 따라간다 (그늘을 드나들 때 툭 바뀌지 않게)
  LightProbe weapon_light_{OPEN_LIGHT};
  // 섬광 — 눈을 보는 사각형 하나. 그릴 값(wgsl/flash.wgsl 의 Frame)은 draw_weapon 이 정한다 (섬광이 없으면 nullopt)
  struct FlashUniforms {
    std::array<float, 16> proj;
    std::array<float, 4> at;
    std::array<float, 4> params;
  };
  engine::gpu::PipelineHandle flash_pipeline_;
  engine::gpu::BufferHandle flash_uniforms_;
  engine::gpu::BufferHandle flash_vertices_;
  std::optional<FlashUniforms> flash_;
};

}  // namespace game
