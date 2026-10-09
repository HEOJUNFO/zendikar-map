#pragma once

#include <cstdint>
#include <optional>

#include "engine/hud/element.hpp"
#include "gameplay/domain/rhythm.hpp"
#include "gameplay/input/pointer_controls.hpp"
#include "gameplay/simulation/world.hpp"

// 게임 HUD — 엔진의 HUD 엔진(engine/hud) 위에 컴포넌트를 조립한다.
// 게임 화면의 모든 요소는 엔진이 그린다 (브라우저의 DOM·TS 로 게임 화면의 어떤 부분도 대신하지 않는다).
//   세계·입력 상태 → select_hud_state → HudState → hud_root(컴포넌트) → 요소 트리
namespace game {

/** 방금 쏜 결과 — 화면에 남아 있는 동안만 상태에 들어 있다 */
struct ShotCallout {
  Judgement judgement;
  bool hit;
  bool operator==(const ShotCallout&) const = default;
};

/** HUD 가 보는 상태의 전부 — 컴포넌트는 이것만 읽는다. 값이 같으면 화면도 같다 */
struct HudState {
  uint32_t score;
  uint32_t combo;
  bool aiming;
  /** 박자 맥동 0..1 — 박자 머리에서 1 */
  float pulse;
  std::optional<ShotCallout> callout;
  bool operator==(const HudState&) const = default;
};

HudState select_hud_state(const World& world, const PointerControls& controls);

/** 뿌리 컴포넌트 — engine::hud::View<HudState> 에 넘긴다 */
engine::hud::Element hud_root(const HudState& state);

/** 화면 높이에 맞는 HUD 단위의 픽셀 크기 */
float hud_unit(uint32_t surface_height);

}  // namespace game
