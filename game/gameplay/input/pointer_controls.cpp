#include "gameplay/input/pointer_controls.hpp"

namespace game {
namespace {

/** 포인터 1 픽셀이 돌리는 각도 (라디안) */
constexpr double LOOK_SENSITIVITY = 0.0022;
constexpr uint32_t PRIMARY_BUTTON = 0;

}  // namespace

void PointerControls::move(World& world, double delta_x, double delta_y) {
  if (!aiming_) return;
  // 화면 아래쪽이 양수라 pitch 는 뒤집는다
  world.look(static_cast<float>(delta_x * LOOK_SENSITIVITY), static_cast<float>(-delta_y * LOOK_SENSITIVITY));
}

uint32_t PointerControls::press(World& world, uint32_t button) {
  if (button != PRIMARY_BUTTON) return 0;
  // 조준 중이 아니면 첫 클릭은 조준을 시작한다
  if (!aiming_) return HOST_CAPTURE_POINTER;
  last_shot_ = ShotFeedback{world.fire(), world.tick()};
  return 0;
}

}  // namespace game
