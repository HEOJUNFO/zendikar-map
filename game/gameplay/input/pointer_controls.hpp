#pragma once

#include <cstdint>
#include <optional>

#include "gameplay/simulation/world.hpp"

namespace game {

/** 호스트(브라우저 쪽)에 해 달라고 하는 일 — 입력의 답으로 돌려준다 (host/main.ts 가 따른다) */
inline constexpr uint32_t HOST_CAPTURE_POINTER = 1u << 0;

/** 가장 최근에 쏜 결과와 그때의 틱 */
struct ShotFeedback {
  FireResult result;
  uint64_t tick;
};

/**
 * 포인터 입력을 게임 명령으로 — 호스트는 원시 입력(움직인 픽셀, 누른 버튼)만 보내고, 그 뜻은 여기서 정한다.
 * 조준 중(포인터가 잡힌 상태)에만 시선이 돌고 총이 나간다
 */
class PointerControls {
 public:
  /** 호스트가 포인터를 잡았거나 놓았다 */
  void set_captured(bool captured) { aiming_ = captured; }
  bool aiming() const { return aiming_; }

  /** 포인터가 움직인 양 (CSS 픽셀, 오른쪽·아래가 양수) */
  void move(World& world, double delta_x, double delta_y);
  /** 버튼을 눌렀다 (0 이 주 버튼). 호스트에 해 달라는 일(HOST_*)을 돌려준다 */
  uint32_t press(World& world, uint32_t button);

  const std::optional<ShotFeedback>& last_shot() const { return last_shot_; }

 private:
  bool aiming_{};
  std::optional<ShotFeedback> last_shot_;
};

}  // namespace game
