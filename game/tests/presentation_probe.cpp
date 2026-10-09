// HUD 검증 프로브 — 상태에서 화면 요소가 정해지는지 본다. GPU 없이 Node 에서 돈다 (tests/game.test.mjs 가 부른다).
#include <algorithm>
#include <cstdio>
#include <numbers>
#include <string_view>

#include "engine/hud/layout.hpp"
#include "gameplay/input/pointer_controls.hpp"
#include "gameplay/presentation/hud.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

/** 그 상태의 HUD 에 이 글자가 그려지는가 */
bool shows(const game::HudState& state, std::string_view content) {
  engine::hud::DrawList list;
  engine::hud::layout(game::hud_root(state), {1280, 720, 3}, {5, 6, 7}, list);
  return std::any_of(list.begin(), list.end(), [&](const engine::hud::DrawItem& item) { return item.content == content; });
}

void state_from_world() {
  const float pi = std::numbers::pi_v<float>;
  // 정면(-z) 10 앞에 멈춰 있는 과녁 하나
  game::World world({{.orbit_radius = 10.0f, .orbit_height = 1.6f, .orbit_phase = -pi / 2.0f, .orbit_speed = 0.0f, .half_extent = 0.5f}});
  game::PointerControls controls;

  game::HudState state = game::select_hud_state(world, controls);
  expect(state == game::HudState{.score = 0, .combo = 0, .aiming = false, .pulse = 1.0f, .callout = std::nullopt}, "처음 상태: 0 점, 조준 전, 박자 머리(맥동 1)");

  controls.set_captured(true);
  controls.press(world, 0);
  state = game::select_hud_state(world, controls);
  expect(state.score == 100 && state.combo == 1 && state.aiming, "쏜 뒤: 100 점, 콤보 1, 조준 중");
  expect(state.callout == game::ShotCallout{game::Judgement::perfect, true}, "쏜 직후에는 판정(perfect·명중)이 상태에 있다");

  for (int i = 0; i < 35; i++) world.step();
  expect(game::select_hud_state(world, controls).callout.has_value(), "35 틱 뒤에도 판정이 남아 있다");
  world.step();
  expect(!game::select_hud_state(world, controls).callout.has_value(), "36 틱(0.6 초) 뒤에는 판정이 사라진다");
}

void screen_from_state() {
  const game::HudState idle{.score = 0, .combo = 0, .aiming = false, .pulse = 0.5f, .callout = std::nullopt};
  expect(shows(idle, "SCORE 0") && shows(idle, "COMBO 0"), "점수와 콤보는 언제나 보인다");
  expect(shows(idle, "CLICK TO AIM"), "조준 전에는 조준 안내가 보인다");

  game::HudState aiming = idle;
  aiming.aiming = true;
  aiming.score = 250;
  aiming.combo = 3;
  expect(shows(aiming, "SCORE 250") && shows(aiming, "COMBO 3"), "점수와 콤보는 상태의 값을 보인다");
  expect(!shows(aiming, "CLICK TO AIM"), "조준 중에는 조준 안내가 없다");
  expect(!shows(aiming, "PERFECT") && !shows(aiming, "GOOD") && !shows(aiming, "MISS"), "판정이 없으면 판정 글자도 없다");

  aiming.callout = game::ShotCallout{game::Judgement::perfect, true};
  expect(shows(aiming, "PERFECT") && shows(aiming, "HIT"), "perfect·명중");
  aiming.callout = game::ShotCallout{game::Judgement::good, false};
  expect(shows(aiming, "GOOD") && shows(aiming, "NO TARGET"), "good·빗나감");
  aiming.callout = game::ShotCallout{game::Judgement::miss, false};
  expect(shows(aiming, "MISS") && shows(aiming, "OFF BEAT"), "박자에서 벗어남");
}

}  // namespace

int main() {
  state_from_world();
  screen_from_state();
  if (failures == 0) std::printf("presentation_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
