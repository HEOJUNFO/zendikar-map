// 시뮬레이션 검증 프로브 — GPU 없이 Node 에서 돈다 (tests/game.test.mjs 가 부른다). 서버가 도는 방식과 같다.
// 기대값은 손으로 계산했다: 120 BPM 은 한 박자 0.5 초, 틱 하나는 1/60 초(= 16.67 ms).
#include <cmath>
#include <cstdio>
#include <limits>
#include <numbers>
#include <vector>

#include "gameplay/domain/rhythm.hpp"
#include "gameplay/input/pointer_controls.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

using game::Judgement;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

void rhythm() {
  game::Conductor conductor;
  expect(conductor.judge() == Judgement::perfect, "박자 머리(0 ms)는 perfect");
  conductor.advance(0.040);
  expect(conductor.judge() == Judgement::perfect, "40 ms 늦으면 perfect");
  conductor.advance(0.040);
  expect(conductor.judge() == Judgement::good, "80 ms 늦으면 good");
  conductor.advance(0.170);
  expect(conductor.judge() == Judgement::miss, "250 ms(박자 한가운데)는 miss");
  conductor.advance(0.170);
  expect(conductor.judge() == Judgement::good, "다음 박자 80 ms 앞은 good");
  conductor.advance(0.050);
  expect(conductor.judge() == Judgement::perfect, "다음 박자 30 ms 앞은 perfect");
}

void firing() {
  const float pi = std::numbers::pi_v<float>;
  // 멈춰 있는 과녁 둘 — 눈높이(1.6)에서 10 떨어진 정면(-z)과 오른쪽(+x)
  game::World world({
      {.orbit_radius = 10.0f, .orbit_height = 1.6f, .orbit_phase = -pi / 2.0f, .orbit_speed = 0.0f, .half_extent = 0.5f},
      {.orbit_radius = 10.0f, .orbit_height = 1.6f, .orbit_phase = 0.0f, .orbit_speed = 0.0f, .half_extent = 0.5f},
  });

  auto shot = world.fire();
  expect(shot.judgement == Judgement::perfect && shot.hit && shot.score == 100 && shot.combo == 1, "박자 머리에 정면 과녁을 맞히면 100 점, 콤보 1");

  // 4 틱 = 66.7 ms 뒤 — good. 오른쪽으로 돌아 둘째 과녁을 쏜다
  for (int i = 0; i < 4; i++) world.step();
  world.look(pi / 2.0f, 0.0f);
  shot = world.fire();
  expect(shot.judgement == Judgement::good && shot.hit && shot.score == 150 && shot.combo == 2, "good 으로 맞히면 50 점이 더해지고 콤보 2");

  // 박자 한가운데(15 틱 = 250 ms) — 나가지 않는다
  for (int i = 0; i < 11; i++) world.step();
  shot = world.fire();
  expect(shot.judgement == Judgement::miss && !shot.hit && shot.score == 150 && shot.combo == 0, "박자에서 벗어나면 나가지 않고 콤보가 끊긴다");

  // 다음 박자 머리(30 틱)에 거의 수직 위로 — 과녁은 반지름 6 밖, 높이 7.8 밑이라 닿을 수 없다
  for (int i = 0; i < 15; i++) world.step();
  world.look(0.0f, 10.0f);
  expect(world.player().pitch == 1.5f, "pitch 는 1.5 에서 멈춘다");
  shot = world.fire();
  expect(shot.judgement == Judgement::perfect && !shot.hit && shot.score == 150 && shot.combo == 0, "박자에 맞아도 빗나가면 점수가 없다");

  world.look(std::numeric_limits<float>::infinity(), 0.0f);
  expect(std::isfinite(world.player().yaw), "유한하지 않은 시선 입력은 무시한다");
}

void determinism() {
  // 같은 seed 와 같은 입력이면 같은 결과
  uint32_t scores[2]{};
  for (uint32_t& score : scores) {
    game::World world = game::World::scattered(256, 7);
    for (int tick = 0; tick < 600; tick++) {
      world.step();
      world.look(0.013f, tick % 40 < 20 ? 0.004f : -0.004f);
      if (tick % 30 == 0) score = world.fire().score;
    }
  }
  expect(scores[0] == scores[1], "같은 seed·입력은 같은 점수를 낸다");
  expect(scores[0] > 0, "600 틱 동안 한 번은 맞는다");
}

void pointer_input() {
  const float pi = std::numbers::pi_v<float>;
  // 정면(-z) 10 앞에 멈춰 있는 과녁 하나
  game::World world({{.orbit_radius = 10.0f, .orbit_height = 1.6f, .orbit_phase = -pi / 2.0f, .orbit_speed = 0.0f, .half_extent = 0.5f}});
  game::PointerControls controls;

  controls.move(world, 500.0, 500.0);
  expect(world.player().yaw == 0.0f && world.player().pitch == 0.0f, "조준 중이 아니면 포인터가 움직여도 시선은 그대로다");
  expect(controls.press(world, 2) == 0, "주 버튼이 아니면 아무 일도 없다");
  expect(controls.press(world, 0) == game::HOST_CAPTURE_POINTER, "조준 중이 아닐 때 첫 클릭은 포인터를 잡아 달라고 한다");
  expect(!controls.last_shot() && world.score() == 0, "그 클릭으로는 쏘지 않는다");

  controls.set_captured(true);
  // 감도 0.0022 rad/px: 오른쪽 100 px → yaw 0.22, 아래 50 px → pitch -0.11
  controls.move(world, 100.0, 50.0);
  expect(std::fabs(world.player().yaw - 0.22f) < 1e-5f && std::fabs(world.player().pitch + 0.11f) < 1e-5f, "100 px 오른쪽·50 px 아래는 yaw 0.22, pitch -0.11");
  controls.move(world, -100.0, -50.0);
  expect(controls.press(world, 0) == 0, "조준 중의 클릭은 호스트에 바라는 것이 없다");
  expect(controls.last_shot() && controls.last_shot()->result.hit && controls.last_shot()->tick == 0 && world.score() == 100,
         "조준 중의 클릭은 쏜다 — 정면 과녁에 맞아 100 점");

  controls.set_captured(false);
  controls.move(world, 100.0, 0.0);
  expect(std::fabs(world.player().yaw) < 1e-5f, "포인터를 놓으면 시선이 다시 멈춘다");
}

}  // namespace

int main() {
  rhythm();
  firing();
  determinism();
  pointer_input();
  if (failures == 0) std::printf("sim_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
