#pragma once

#include "engine/foundation/math.hpp"
#include "engine/render/surface_batch.hpp"
#include "gameplay/content/room_light.hpp"
#include "gameplay/domain/dungeon.hpp"
#include "sky.generated.hpp"

// 장면의 빛을 그리는 쪽에 잇는다 — 해는 하늘 에셋에서 뽑은 값(sky.generated.hpp — tools/skyc.mjs)이고, 방의 틀은 구운 라이트맵을,
// 라이트맵이 없는 것(소품, 막음돌, 석판, 적, 손에 든 것)은 그 자리의 프로브(content/room_light.hpp)를 받는다. 굽기와 그리기가 같은 해를 쓴다.
// 빛은 틀의 좌표에서 구웠고 방은 틀을 돌려 놓는다 — 프로브로 비추는 것의 해와 하늘 그림도 방과 함께 돌린다 (room_sun, room_sky_yaw).
namespace game {

/** 그 방에서 해가 있는 쪽 — 틀의 좌표의 해(sky::SUN_DIRECTION)를 방의 돌림만큼 돌린 것 */
constexpr engine::Vec3 room_sun(const Room& room) { return room.to_room(sky::SUN_DIRECTION); }
/** 그 방의 하늘 그림을 돌린 각 (라디안) — 돌림 한 번이 방위 90 도다 (북 → 동) */
constexpr float room_sky_yaw(const Room& room) { return sky::YAW + static_cast<float>(room.turn % 4) * 1.5707963f; }

/** 가리는 것 없는 곳의 빛 — 구운 빛이 아직 없거나 어긋났을 때 쓴다 */
inline constexpr LightProbe OPEN_LIGHT{{sky::UP_LIGHT.x, sky::UP_LIGHT.y, sky::UP_LIGHT.z}, {sky::DOWN_LIGHT.x, sky::DOWN_LIGHT.y, sky::DOWN_LIGHT.z}, 1.0f};

/** at 에 놓여 프로브의 빛을 받는 겉면 */
constexpr engine::SurfaceInstance lit(const engine::Mat4& at, const LightProbe& light) {
  engine::SurfaceInstance instance = engine::SurfaceInstance::from(at);
  instance.light_up = {light.up[0], light.up[1], light.up[2], light.sun};
  instance.light_down = {light.down[0], light.down[1], light.down[2], 0.0f};
  return instance;
}

/** at 에 놓여 구운 라이트맵을 읽는 겉면 */
constexpr engine::SurfaceInstance baked(const engine::Mat4& at) {
  engine::SurfaceInstance instance = engine::SurfaceInstance::from(at);
  instance.light_down[3] = 1.0f;
  return instance;
}

/** 프레임 사이에서 빛이 부드럽게 따라가게 — from 에서 to 쪽으로 share(0…1)만큼 */
constexpr LightProbe toward(const LightProbe& from, const LightProbe& to, float share) {
  LightProbe out;
  for (int c = 0; c < 3; c++) {
    out.up[c] = from.up[c] + (to.up[c] - from.up[c]) * share;
    out.down[c] = from.down[c] + (to.down[c] - from.down[c]) * share;
  }
  out.sun = from.sun + (to.sun - from.sun) * share;
  return out;
}

}  // namespace game
