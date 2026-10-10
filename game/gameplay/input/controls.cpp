#include "gameplay/input/controls.hpp"

namespace game {
namespace {

/** 포인터 1 픽셀이 돌리는 각도 (라디안) — 감도 배율 1 일 때 */
constexpr double LOOK_SENSITIVITY = 0.0022;
constexpr uint32_t PRIMARY_BUTTON = 0;
constexpr uint32_t SECONDARY_BUTTON = 2;

constexpr uint32_t MOVE_FORWARD = 1u << 0;
constexpr uint32_t MOVE_BACK = 1u << 1;
constexpr uint32_t MOVE_LEFT = 1u << 2;
constexpr uint32_t MOVE_RIGHT = 1u << 3;

/** 자판의 자리 이름 → 이동 비트. 이동 글쇠가 아니면 0 */
constexpr uint32_t move_bit(std::string_view code) {
  if (code == "KeyW" || code == "ArrowUp") return MOVE_FORWARD;
  if (code == "KeyS" || code == "ArrowDown") return MOVE_BACK;
  if (code == "KeyA" || code == "ArrowLeft") return MOVE_LEFT;
  if (code == "KeyD" || code == "ArrowRight") return MOVE_RIGHT;
  return 0;
}

/** 맞선 두 글쇠를 함께 누르면 서로 지운다 */
constexpr float axis(uint32_t held, uint32_t positive, uint32_t negative) {
  return static_cast<float>((held & positive) != 0) - static_cast<float>((held & negative) != 0);
}

/** 박자 행동 하나 — 판정을 받은 누름(나갔거나 미스였다)이면 true */
bool judged(World& world, Action action, int32_t ago) {
  const uint32_t misses = world.misses();
  return world.act(action, ago) || world.misses() != misses;
}

}  // namespace

void Controls::set_captured(World& world, bool captured) {
  aiming_ = captured;
  if (!captured) {
    held_ = 0;
    world.move(0.0f, 0.0f);
  }
}

void Controls::move(World& world, double delta_x, double delta_y, float sensitivity, bool invert_y) {
  if (!aiming_) return;
  const double turn = LOOK_SENSITIVITY * sensitivity;
  // 화면 아래쪽이 양수라 pitch 는 뒤집는다 (상하 반전이면 그대로)
  world.look(static_cast<float>(delta_x * turn), static_cast<float>(delta_y * (invert_y ? turn : -turn)));
}

bool Controls::press(World& world, uint32_t button, std::optional<int32_t> ago) {
  if (!aiming_ || !ago) return false;
  if (button == PRIMARY_BUTTON) return judged(world, Action::fire, *ago);
  if (button == SECONDARY_BUTTON) return judged(world, Action::dash, *ago);
  return false;
}

bool Controls::key(World& world, std::string_view code, bool pressed, std::optional<int32_t> ago) {
  if (!aiming_) return false;
  bool acted = false;
  if (pressed) {
    if (world.in_shop() && code.size() == 6 && code.substr(0, 5) == "Digit" && code[5] >= '1' && code[5] <= '8') world.select_card(static_cast<uint32_t>(code[5] - '1'));
    if (world.in_shop() && code == "KeyE") world.buy_selected_card();
    if (ago && code == "KeyR") acted = judged(world, Action::reload, *ago);
    if (ago && (code == "ShiftLeft" || code == "ShiftRight")) acted = judged(world, Action::dash, *ago);
    if (code == "Space") world.jump();
  }
  const uint32_t bit = move_bit(code);
  if (!bit) return acted;
  held_ = pressed ? held_ | bit : held_ & ~bit;
  world.move(axis(held_, MOVE_FORWARD, MOVE_BACK), axis(held_, MOVE_RIGHT, MOVE_LEFT));
  return acted;
}

}  // namespace game
