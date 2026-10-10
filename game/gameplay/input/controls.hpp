#pragma once

#include <cstdint>
#include <optional>
#include <string_view>

#include "gameplay/simulation/world.hpp"

namespace game {

/** 호스트(브라우저 쪽)에 해 달라고 하는 일 — 입력의 답으로 돌려준다 (host/main.ts 가 따른다). 조준은 메뉴의 단추가 시작한다 (presentation/menu.hpp) */
inline constexpr uint32_t HOST_CAPTURE_POINTER = 1u << 0;
/** 소리 출력을 켜 달라 — 브라우저는 사용자 동작이 있은 뒤에만 소리를 내 준다 */
inline constexpr uint32_t HOST_RESUME_AUDIO = 1u << 1;
/** 저장할 것(옵션)이 바뀌었다 — 지금의 글을 받아 가(RPC options.text) 간직해 달라. 호스트는 그 글의 뜻을 모른다 (presentation/menu.hpp 의 encode_options) */
inline constexpr uint32_t HOST_SAVE_OPTIONS = 1u << 2;

/**
 * 원시 입력을 게임 명령으로 — 호스트는 원시 입력(움직인 픽셀, 누른 버튼·글쇠)만 보내고, 그 뜻은 여기서 정한다.
 * 조준 중(포인터가 잡힌 상태)에만 시선이 돌고, 걷고, 총이 나간다.
 *   이동 W A S D(화살표) · 조준 마우스 · 발사 왼쪽 버튼 · 재장전 R · 대시 Shift(오른쪽 버튼) · 점프 Space
 */
class Controls {
 public:
  /** 호스트가 포인터를 잡았거나 놓았다. 놓으면 누르고 있던 글쇠도 뗀 것으로 친다 */
  void set_captured(World& world, bool captured);
  bool aiming() const { return aiming_; }

  /** 포인터가 움직인 양 (CSS 픽셀, 오른쪽·아래가 양수). sensitivity 는 감도의 배율, invert_y 면 위아래를 뒤집는다 (옵션) */
  void move(World& world, double delta_x, double delta_y, float sensitivity = 1.0f, bool invert_y = false);
  /**
   * 버튼을 눌렀다 (0 이 주 버튼, 2 가 오른쪽 버튼) — 조준 중이면 쏘거나 대시한다. ago 는 누른 뒤 지금까지 지난 틱 (World::act).
   * ago 가 없으면 너무 늦게 닿은 입력이다 — 박자 행동은 내지 않는다 (뒤늦게 줄줄이 나가지 않는다).
   * 그 누름이 판정을 받았으면 true — 행동이 지금 나갔거나, 박을 크게 벗어나 미스였다 (연타·쿨다운·기억해 둔 행동·빈 방아쇠는 false)
   */
  bool press(World& world, uint32_t button, std::optional<int32_t> ago = 0);
  /** 글쇠를 눌렀거나 뗐다 — code 는 자판의 자리 이름 (KeyW, ArrowUp …). 모르는 글쇠는 무시한다. ago 와 돌려주는 값은 press 와 같다 (이동 글쇠의 누름·뗌은 늦게 닿아도 받는다) */
  bool key(World& world, std::string_view code, bool pressed, std::optional<int32_t> ago = 0);

 private:
  bool aiming_{};
  // 누르고 있는 이동 글쇠 (MOVE_* 비트)
  uint32_t held_{};
};

}  // namespace game
