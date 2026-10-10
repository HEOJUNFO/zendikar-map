#pragma once

#include <cmath>
#include <numbers>

#include "engine/foundation/color.hpp"
#include "engine/foundation/math.hpp"
#include "gameplay/presentation/menu.hpp"
#include "gameplay/presentation/motion.hpp"
#include "gameplay/simulation/world.hpp"
#include "sky.generated.hpp"

namespace game {

/** 안개의 색(먼 것이 잠기는 색)이자 하늘 그림이 오기 전에 화면을 지우는 색 — 하늘의 지평선 색 (content/sky 에서 뽑은 값) */
inline constexpr engine::Color SKY_COLOR = sky::HORIZON;

/** 장면을 보는 눈 — 장면을 그리는 것들이 함께 쓴다 */
struct Camera {
  engine::Vec3 eye;
  engine::Vec3 forward;
  engine::Vec3 right;
  engine::Vec3 up;
  engine::Mat4 view_proj;
  /** 시야각 절반의 tan — 가로, 세로 (화면의 한 점이 가리키는 방향을 되짚을 때) */
  float tan_x, tan_y;
};

/**
 * eye 에서 yaw·pitch 쪽을 보는 눈 — roll(라디안)만큼 오른쪽으로 기운다. fov_degrees 는 위아래 시야각.
 * forward 는 기울여도 그대로다 (화면 가운데가 가리키는 쪽)
 */
inline Camera camera_at(engine::Vec3 eye, float yaw, float pitch, float roll, float aspect, float fov_degrees) {
  const float fov_y = fov_degrees * std::numbers::pi_v<float> / 180.0f;
  constexpr float NEAR = 0.1f;
  // 발밑 72 m 의 구름 바다와 먼 산줄기까지 보인다
  constexpr float FAR = 700.0f;
  const engine::Vec3 forward = engine::forward_from(yaw, pitch);
  const engine::Vec3 level = engine::normalize(engine::cross(forward, {0.0f, 1.0f, 0.0f}));
  const engine::Vec3 upright = engine::cross(level, forward);
  const float c = std::cos(roll), s = std::sin(roll);
  const engine::Vec3 right = level * c - upright * s, up = upright * c + level * s;
  const engine::Mat4 view = engine::Mat4::look_along(eye, forward, up);
  const float tan_y = std::tan(fov_y * 0.5f);
  return {eye, forward, right, up, engine::Mat4::perspective(fov_y, aspect, NEAR, FAR) * view, tan_y * aspect, tan_y};
}

/** 흔들림 없이 플레이어의 눈에서 — fov_degrees 는 위아래 시야각 (옵션) */
inline Camera camera_for(const Player& player, float aspect, float fov_degrees) { return camera_at(player.position, player.yaw, player.pitch, 0.0f, aspect, fov_degrees); }

/**
 * 장면을 보는 눈 — 플레이어의 눈에 움직임의 연출(motion — 걸음의 흔들림, 착지, 기울임, 대시의 시야각, 발사의 반동)을 얹는다. 시야각은 옵션의 것
 * (메인 메뉴·대기실은 장면을 그리지 않는다). 조준 방향은 세계의 것 그대로다: 눈의 자리가 몇 cm 움직이고 기울 뿐이라 조준점이 가리키는 곳이 곧 맞는 곳이다.
 * 발사의 반동(motion.kick)만은 그리는 눈을 위로 든다 — 쏜 뒤에 들렸다 다음 칸의 발사 전에 돌아오므로, 쏘는 순간에는 화면 가운데가 세계의 조준 방향이다
 */
inline Camera scene_camera(const Menu& menu, const World& world, float aspect, const ViewMotion& motion) {
  const Player& player = world.player();
  const Camera level = camera_at(motion.eye, player.yaw, player.pitch, 0.0f, aspect, menu.options.fov);
  return camera_at(motion.eye + level.right * motion.bob_x + level.up * (motion.bob_y + motion.dip), player.yaw, player.pitch + motion.kick, motion.roll, aspect, menu.options.fov + motion.fov);
}
/** 움직임의 연출 없이 — 세계의 눈 그대로 */
inline Camera scene_camera(const Menu& menu, const World& world, float aspect) { return camera_for(world.player(), aspect, menu.options.fov); }

}  // namespace game
