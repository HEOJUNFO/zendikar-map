#include "gameplay/presentation/hud.hpp"

#include <algorithm>
#include <cmath>
#include <string>

namespace game {
namespace {

using engine::Color;
using engine::hud::Align;
using engine::hud::Axis;
using engine::hud::Element;
using engine::hud::box;
using engine::hud::text;

constexpr Color INK{0.95f, 0.89f, 0.75f};
constexpr Color ACCENT{1.0f, 0.72f, 0.30f};
constexpr Color WARN{0.90f, 0.36f, 0.30f};
constexpr Color SHADE{0.05f, 0.02f, 0.03f};
constexpr Color TRACK{0.25f, 0.12f, 0.10f};

/** 판정을 화면에 남겨 두는 시간 (틱) — 0.6 초 */
constexpr uint64_t CALLOUT_TICKS = 36;
constexpr float BEAT_BAR_WIDTH = 80.0f;

// ── 컴포넌트 — 상태(의 일부)를 받아 요소를 돌려준다 ───────────────────────────

/** 장면 위에서도 읽히게 어두운 판을 깐 글자 */
Element label(std::string_view content, Color color, float scale) {
  return box({.padding = 2.0f * scale, .background = SHADE}, text(content, color, scale));
}

Element score_panel(uint32_t score, uint32_t combo) {
  return box({.padding = 3, .gap = 3, .background = SHADE, .offset_x = 2, .offset_y = 2},
             text("SCORE " + std::to_string(score), INK), text("COMBO " + std::to_string(combo), INK));
}

/** 박자 막대 — 박자 머리에서 가득 찼다가 가운데로 줄어든다 */
Element beat_bar(float pulse) {
  return box({.axis = Axis::row, .justify = Align::center, .width = BEAT_BAR_WIDTH, .height = 2, .background = TRACK,
              .anchor_x = Align::center, .anchor_y = Align::end, .offset_y = -6},
             pulse > 0.0f ? box({.width = BEAT_BAR_WIDTH * pulse, .height = 2, .background = ACCENT}) : Element{});
}

Element crosshair() {
  return box({.axis = Axis::stack, .width = 9, .height = 9, .anchor_x = Align::center, .anchor_y = Align::center},
             box({.width = 9, .height = 1, .background = INK, .anchor_y = Align::center}),
             box({.width = 1, .height = 9, .background = INK, .anchor_x = Align::center}));
}

Element aim_prompt() {
  return box({.gap = 4, .align = Align::center, .anchor_x = Align::center, .anchor_y = Align::center},
             label("CLICK TO AIM", ACCENT, 2.0f), label("FIRE ON THE BEAT - ESC TO RELEASE", INK, 1.0f));
}

Element shot_callout(const ShotCallout& callout) {
  Element verdict;
  switch (callout.judgement) {
    case Judgement::perfect: verdict = label("PERFECT", ACCENT, 2.0f); break;
    case Judgement::good: verdict = label("GOOD", INK, 2.0f); break;
    case Judgement::miss: verdict = label("MISS", WARN, 2.0f); break;
  }
  const char* detail = callout.judgement == Judgement::miss ? "OFF BEAT" : callout.hit ? "HIT" : "NO TARGET";
  return box({.gap = 3, .align = Align::center, .anchor_x = Align::center, .anchor_y = Align::center, .offset_y = -40},
             std::move(verdict), label(detail, INK, 1.0f));
}

}  // namespace

HudState select_hud_state(const World& world, const PointerControls& controls) {
  HudState state{
      .score = world.score(),
      .combo = world.combo(),
      .aiming = controls.aiming(),
      .pulse = std::exp(-6.0f * static_cast<float>(world.conductor().phase())),
      .callout = std::nullopt,
  };
  const auto& shot = controls.last_shot();
  if (state.aiming && shot && world.tick() - shot->tick < CALLOUT_TICKS) state.callout = ShotCallout{shot->result.judgement, shot->result.hit};
  return state;
}

Element hud_root(const HudState& state) {
  return box({.axis = Axis::stack},
             score_panel(state.score, state.combo),
             beat_bar(state.pulse),
             state.aiming ? crosshair() : aim_prompt(),
             state.callout ? shot_callout(*state.callout) : Element{});
}

float hud_unit(uint32_t surface_height) { return std::max(2.0f, std::round(static_cast<float>(surface_height) / 270.0f)); }

}  // namespace game
