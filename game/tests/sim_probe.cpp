// 시뮬레이션 검증 프로브 — GPU 없이 Node 에서 돈다 (tests/game.test.mjs 가 부른다). 서버가 도는 방식과 같다.
// 기대값은 규칙에서 손으로 계산했다: 틱 하나는 1/60 초, 한 박은 40 틱(90 BPM), 반박 칸은 20 틱마다, 판정 창은 칸의 머리 앞뒤 6 틱.
// 방은 한 번에 하나 (방 가운데가 원점, 칸 32 m): 포털 면은 가운데에서 16 m, 몸(반폭 0.3)이 닿는 자리는 15.7 m, 넘는 데 24 틱(12 틱째에 방이 바뀐다), 새 방에서는 맞은편 문 안쪽 13.5 m 에 선다.
// 방은 닫힌 실내이고 틀마다 모양이 다르다 (정사각 홀, 긴 홀, ㄱ 자, 십자, T 자) — 틀의 치수는 tools/art/make-rooms.mjs 의 틀 정의에서 읽었다 (팔의 폭 12 m, 긴 홀의 폭 18 m).
// 걷기에는 관성이 있다 (초당 m): 땅에서 걸으려는 속도로 틱마다 0.8 씩 다가가고(선 자리에서 n 틱 뒤 빠르기 0.8n, 간 거리 0.8·n(n+1)/2/60 — 8 틱째에 최고 6),
// 손을 떼면 틱마다 0.6 씩 줄어 10 틱에 0.45 m 를 미끄러져 서고, 맞서 걸으면 틱마다 1.4 씩 줄고, 공중에서는 틱마다 0.2 씩만 보탠다.
// 그래서 선 자리에서 n 틱(n ≥ 8)을 걸으면 0.1n − 0.3267 m 다. 세계는 방 가운데 위 1.2 m 에서 시작한다 — 19 틱째에 초당 7.6 m 로 내려선다 (0.2·k(k+1)/60 > 1.2 인 첫 k)
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <limits>
#include <numbers>
#include <optional>
#include <queue>
#include <vector>

#include "engine/spatial/lbvh.hpp"
#include "gameplay/content/room_meshes.hpp"
#include "gameplay/domain/combat.hpp"
#include "gameplay/domain/dungeon.hpp"
#include "gameplay/domain/random.hpp"
#include "gameplay/domain/rhythm.hpp"
#include "gameplay/input/controls.hpp"
#include "gameplay/input/judge.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

using game::Action;
using game::Enemy;
using game::EnemyKind;
using game::Floor;
using game::Room;
using game::World;
using game::WorldEvent;

constexpr float PI = std::numbers::pi_v<float>;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

bool near(float a, float b, float tolerance = 2e-3f) { return std::fabs(a - b) <= tolerance; }

// 시험용 방 조각 — 평평한 바닥(윗면 y 0, 한 변 33.4 m)과 네 쪽의 높이 4 m 벽. 벽마다 가운데에 문 자리(x -2 … 2)가 뚫려 있다 (그 밖은 허공).
// 문이 나지 않은 문 자리는 막음돌이 메우고(벽과 같은 두께), 잠긴 문은 문을 가로막는 상자 하나. 길의 점은 없다 — 적은 방 가운데 둘레에 나오고 곧게 다가온다
const std::vector<engine::Aabb> FLAT_DOORWAY{{{-16.7f, 0.0f, -16.7f}, {-2.0f, 4.0f, -15.7f}}, {{2.0f, 0.0f, -16.7f}, {16.7f, 4.0f, -15.7f}}};
const std::vector<engine::Aabb> FLAT_SEALED{{{-2.0f, 0.0f, -16.7f}, {2.0f, 4.0f, -15.7f}}};
const std::vector<engine::Aabb> FLAT_GATE{{{-2.0f, 0.0f, -16.2f}, {2.0f, 5.0f, -15.8f}}};
/** 그 틀의 시험용 방 — 모양은 모두 같은 정사각이고, 틀의 문 자리가 아닌 쪽만 문 자리 없이 막혀 있다 */
std::vector<engine::Aabb> flat_room(uint8_t shape) {
  std::vector<engine::Aabb> boxes{{{-16.7f, -1.0f, -16.7f}, {16.7f, 0.0f, 16.7f}}};
  for (const game::Direction d : {game::NORTH, game::EAST, game::SOUTH, game::WEST}) {
    for (const engine::Aabb& box : FLAT_DOORWAY) boxes.push_back(game::turned(box, d));
    if (!(game::SHAPE_SITES[shape] >> d & 1u)) boxes.push_back(game::turned(FLAT_SEALED[0], d));
  }
  return boxes;
}
const std::vector<engine::Aabb> FLAT_ROOMS[game::SHAPE_COUNT] = {flat_room(0), flat_room(1), flat_room(2), flat_room(3), flat_room(4), flat_room(5)};
const game::RoomKit FLAT{.rooms = {FLAT_ROOMS[0], FLAT_ROOMS[1], FLAT_ROOMS[2], FLAT_ROOMS[3], FLAT_ROOMS[4], FLAT_ROOMS[5]}, .nav = {}, .sealed = FLAT_SEALED, .gate = FLAT_GATE};

constexpr uint8_t N = 1u << game::NORTH, E = 1u << game::EAST, S = 1u << game::SOUTH, W = 1u << game::WEST;
constexpr Room START{.x = 0, .z = 0, .doors = 0, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0};

/** 시작 방과 그 북쪽의 전투방 하나 */
Floor two_rooms(uint8_t chargers, uint8_t casters, uint8_t shape = 1) {
  Room start = START;
  start.doors = N;
  return {{start, {.x = 0, .z = -1, .doors = S, .shape = shape, .turn = 0, .depth = 1, .chargers = chargers, .casters = casters}}};
}

void steps(World& world, int count) {
  for (int i = 0; i < count; i++) world.step();
}
/** 아직 행동이 들지 않은 다음 칸의 머리까지 나아간다 */
void next_slot(World& world) {
  do world.step();
  while (world.tick() % game::TICKS_PER_SLOT != 0);
}
/** 다른 방에 가 설 때까지 앞으로 걷는다 — 포털에 닿아 넘기를 마칠 때까지 */
void walk_through(World& world) {
  const uint32_t from = world.room();
  world.move(1.0f, 0.0f);
  for (int i = 0; i < 600 && (world.room() == from || world.in_transit()); i++) world.step();
  world.move(0.0f, 0.0f);
}
/** 시작 방에서 북쪽 포털로 걸어 북쪽 방에 선다 (남쪽 문 안쪽, 방 가운데에서 13.4 m — 넘기를 마친 틱에 한 걸음 걸었다. 손을 뗐으니 0.45 m 더 미끄러져 선다) */
void enter_north(World& world) { walk_through(world); }
void aim_at(World& world, engine::Vec3 point) {
  const engine::Vec3 to = point - world.player().position;
  world.look(std::atan2(to.x, -to.z) - world.player().yaw, std::atan2(to.y, std::sqrt(to.x * to.x + to.z * to.z)) - world.player().pitch);
}
engine::Vec3 middle(const Enemy& enemy) {
  const engine::Aabb box = game::enemy_box(enemy);
  return (box.min + box.max) * 0.5f;
}
float flat_distance(engine::Vec3 a, engine::Vec3 b) { return std::hypot(a.x - b.x, a.z - b.z); }
int attacking(const World& world, EnemyKind kind) {
  int count = 0;
  for (const Enemy& enemy : world.enemies())
    if (enemy.kind == kind && (enemy.act == Enemy::Act::windup || enemy.act == Enemy::Act::charge)) count++;
  return count;
}

void rhythm() {
  using game::slot_at;
  using game::slot_offset;
  expect(slot_at(0) == 0u && slot_at(9) == 0u && slot_at(10) == 1u && slot_at(20) == 1u && slot_at(29) == 1u && slot_at(30) == 2u && slot_at(40) == 2u,
         "누른 틱은 가장 가까운 칸에 든다 — 0…9 는 첫 칸, 10…29 는 둘째 칸(반박), 30…49 는 셋째 칸(다음 박)");
  expect(slot_offset(0) == 0 && slot_offset(7) == 7 && slot_offset(9) == 9 && slot_offset(10) == -10 && slot_offset(13) == -7 && slot_offset(26) == 6 && slot_offset(40) == 0,
         "칸의 머리에서 벗어난 틱 — 음수면 일렀다 (-10 … 9)");
  using game::Verdict;
  using game::verdict_at;
  expect(verdict_at(0) == Verdict::on_beat && verdict_at(5) == Verdict::on_beat && verdict_at(6) == Verdict::off_beat && verdict_at(8) == Verdict::off_beat && verdict_at(9) == Verdict::miss &&
             verdict_at(10) == Verdict::miss && verdict_at(11) == Verdict::miss && verdict_at(12) == Verdict::off_beat && verdict_at(14) == Verdict::off_beat && verdict_at(15) == Verdict::on_beat &&
             verdict_at(20) == Verdict::on_beat && verdict_at(25) == Verdict::on_beat && verdict_at(26) == Verdict::off_beat && verdict_at(28) == Verdict::off_beat && verdict_at(29) == Verdict::miss,
         "판정: 칸의 머리에서 앞뒤 5 틱(83 ms) 안은 정박, 8 틱(133 ms) 안은 어긋남, 그 밖(9·10 틱 — 칸 사이의 3 틱)은 미스");
  using game::streak_after_miss;
  expect(streak_after_miss(0) == 0 && streak_after_miss(9) == 0 && streak_after_miss(10) == 0 && streak_after_miss(19) == 0 && streak_after_miss(20) == 10 && streak_after_miss(29) == 10 &&
             streak_after_miss(30) == 20 && streak_after_miss(45) == 20 && streak_after_miss(500) == 20,
         "미스 뒤의 연속 수: 배수가 한 단계 내려가 그 단계의 처음이 된다 (x1·x2 → 0, x3 → 10, x4 → 20)");
  expect(game::beat_head(0) && !game::beat_head(20) && game::beat_head(40) && !game::beat_head(41), "박의 머리는 40 틱마다 (반박은 아니다)");
  expect(game::beat_phase(10) == 0.25f && game::beat_phase(60) == 0.5f, "박 안에서의 위치");
  using game::multiplier;
  expect(multiplier(0) == 1 && multiplier(9) == 1 && multiplier(10) == 2 && multiplier(19) == 2 && multiplier(20) == 3 && multiplier(29) == 3 && multiplier(30) == 4 &&
             multiplier(500) == 4,
         "배수: 이어 간 행동 0–9 는 1, 10–19 는 2, 20–29 는 3, 30 부터 4");
}

void pistol() {
  World world({{START}}, FLAT);
  steps(world, 60);
  expect(world.player().health == 100 && world.pistol().ammo == 8 && world.pistol().reload_stage == 0 && world.score() == 0, "처음: 체력 100, 탄 8 발");
  // 60 틱은 반박 칸(셋째)의 머리다
  expect(world.act(Action::fire) && world.pistol().ammo == 7 && world.shot_tick() == 60u, "반박에 쏘면 나간다 — 탄 7");
  expect(world.beat_tick() == 60u && world.off_tick() == std::nullopt, "칸의 머리에서 쏜 것은 박에 맞았다");
  expect(!world.act(Action::fire) && world.pistol().ammo == 7 && !world.pending(), "한 칸에는 한 행동만 — 같은 칸의 둘째 발사(연타)는 아무 일도 없다");
  steps(world, 10);
  expect(!world.act(Action::fire) && world.pistol().ammo == 7 && world.shot_tick() == 60u && world.miss_tick() == 70u && world.miss_side() == -1 && world.misses() == 1 &&
             world.off_tick() == std::nullopt && world.beat_tick() == 60u,
         "칸 사이(10 틱 뒤)의 발사는 미스다 — 나가지 않고, 가장 가까운 칸(80 틱)에서 일렀던 것으로 남는다");
  steps(world, 10);
  expect(world.act(Action::fire) && world.pistol().ammo == 6 && world.shot_tick() == 80u, "미스는 그 칸(80 틱)을 쓰지 않았다 — 머리에서 쏘면 나간다");
  for (int i = 0; i < 6; i++) {
    next_slot(world);
    world.act(Action::fire);
  }
  expect(world.pistol().ammo == 0 && world.shot_tick() == 200u, "여덟 발을 쏘면 탄창이 빈다");
  // 재장전은 reload(R)로만 한다 — 탄이 없을 때의 발사는 빈 방아쇠다: 박자에 맞든(220 틱) 아니든(225·230 틱) 나가지 않고, 재장전도 나아가지 않고, 실수도 아니다
  next_slot(world);
  expect(world.dry_tick() == std::nullopt, "아직 빈 방아쇠를 당긴 적이 없다");
  for (const int wait : {0, 5, 5}) {
    steps(world, wait);
    expect(!world.act(Action::fire) && world.pistol().ammo == 0 && world.pistol().reload_stage == 0 && world.shot_tick() == 200u && world.dry_tick() == world.tick() &&
               world.off_tick() == std::nullopt && world.misses() == 1 && !world.pending(),
           "빈 탄창에서 발사를 눌러도 탄 0·재장전 단계 그대로다 (총은 나가지 않고, 판정도 하지 않는다 — 미스도 아니다)");
  }
  next_slot(world);
  expect(world.act(Action::reload) && world.pistol().ammo == 0 && world.pistol().reload_stage == 1, "R 한 번: 탄창을 뺀다");
  expect(!world.act(Action::fire) && world.pistol().ammo == 0 && world.pistol().reload_stage == 1 && world.dry_tick() == world.tick(), "탄창을 빼 둔 동안의 발사도 빈 방아쇠다 — 끼우지 않는다");
  next_slot(world);
  expect(!world.act(Action::fire) && world.pistol().reload_stage == 1, "다음 칸에 눌러도 마찬가지다");
  expect(world.act(Action::reload) && world.pistol().ammo == 8 && world.pistol().reload_stage == 0, "R 한 번 더: 끼운다 — 재장전은 R 두 번 (빈 방아쇠는 그 칸을 쓰지 않았다)");
  next_slot(world);
  expect(!world.act(Action::reload) && world.pistol().ammo == 8 && world.misses() == 1 && !world.pending(), "가득 찬 탄창의 재장전은 아무 일도 없다");
  expect(world.act(Action::fire) && world.pistol().ammo == 7, "그 칸은 아직 비어 있어 쏠 수 있다");
  next_slot(world);
  expect(world.act(Action::reload) && world.pistol().ammo == 0 && world.pistol().reload_stage == 1, "덜 쓴 탄창도 빼면 0");
  next_slot(world);
  expect(world.act(Action::reload) && world.pistol().ammo == 8 && world.pistol().reload_stage == 0, "한 번 더 눌러 끼운다");
  // 다음 칸의 머리에서 — 6 틱 늦게, 그리고 그 다음 칸의 7 틱 앞
  next_slot(world);
  steps(world, 6);
  expect(world.tick() % game::TICKS_PER_SLOT == 6 && world.act(Action::fire) && world.off_tick() == world.tick() && world.off_side() == 1, "6 틱 늦은 발사는 나간다 (어긋났다)");
  steps(world, 7);
  expect(world.tick() % game::TICKS_PER_SLOT == 13 && world.act(Action::fire) && world.off_tick() == world.tick() && world.off_side() == -1 && world.pistol().ammo == 6,
         "다음 칸의 7 틱 앞은 그 칸에 들어 나간다 (어긋났다)");
  steps(world, 1);
  expect(!world.act(Action::fire) && world.pistol().ammo == 6 && world.misses() == 1, "그 칸은 이미 썼다 — 6 틱 앞에 또 눌러도 아무 일도 없다");
  expect(world.streak() == 0 && world.score() == 0, "적이 없는 방에서는 배수가 쌓이지 않는다");
}

void dash_and_jump() {
  World world({{START}}, FLAT);
  steps(world, 60);
  const float z = world.player().position.z;
  const auto gone = [&] { return z - world.player().position.z; };
  expect(world.act(Action::dash) && world.dashing() && world.dash_tick() == 60u && world.dash_direction().z == -1.0f, "칸의 머리에서 대시가 나간다 — 걷고 있지 않으면 앞(-z)으로");
  // 대시의 빠르기는 틱마다 36 | 36 × 4 | 26 · 16 · 6 — 합 228, 8 틱에 228/60 = 3.8 m
  steps(world, 2);
  expect(near(gone(), 1.2f) && near(world.velocity().z, -36.0f), "대시: 첫 틱부터 초당 36 m 다 (두 틱에 1.2 m)");
  steps(world, 3);
  expect(near(gone(), 3.0f) && near(world.velocity().z, -36.0f), "대시: 다섯 틱째까지 그 빠르기로 간다 (3.0 m)");
  steps(world, 1);
  expect(near(gone(), 3.4333f) && near(world.velocity().z, -26.0f) && world.dashing(), "대시: 6 틱째에 초당 26 m 로 줄기 시작한다 (3.43 m)");
  steps(world, 2);
  expect(near(gone(), 3.8f) && near(world.velocity().z, -6.0f) && !world.dashing() && near(world.player().position.x, 0.0f), "대시는 8 틱에 3.8 m 를 가고 걷는 빠르기(초당 6 m)로 끝난다");
  // 손을 떼고 있으면 여느 마찰로 선다: 5.4 · 4.8 · 4.2 · 3.6 · … · 0.6 · 0 — 4 틱에 0.3 m, 10 틱에 0.45 m
  steps(world, 4);
  expect(near(gone(), 4.1f) && near(world.velocity().z, -3.6f), "대시가 끝나면 미끄러지며 선다");
  steps(world, 8);
  expect(world.tick() == 80 && near(gone(), 4.25f) && world.velocity().z == 0.0f, "선 자리에서의 대시는 모두 4.25 m 를 간다 (대시 3.8 + 미끄러짐 0.45)");
  expect(!world.act(Action::dash) && world.dash_tick() == 60u, "바로 다음 칸에는 대시가 나가지 않는다 (쿨다운 한 박)");
  expect(world.act(Action::fire), "그 칸에 다른 행동은 할 수 있다");
  steps(world, 20);
  expect(near(gone(), 4.25f), "선 뒤에는 움직이지 않는다");
  world.move(0.0f, 1.0f);
  expect(world.act(Action::dash) && world.dash_direction().x == 1.0f, "한 박 뒤에는 다시 나간다 — 오른쪽으로 걷는 중이면 오른쪽(+x)으로");
  steps(world, 18);
  expect(near(world.player().position.x, 4.8f) && near(gone(), 4.25f) && near(world.velocity().x, 6.0f), "오른쪽으로 걷는 중의 대시는 18 틱에 오른쪽으로 4.8 m (대시 3.8 + 걸음 열 틱 1.0)");
  // 걷고 있으면 대시의 끝이 그대로 걸음으로 이어진다 — 10 틱에 1 m 더
  steps(world, 10);
  expect(near(world.player().position.x, 5.8f) && near(world.velocity().x, 6.0f), "대시가 끝나면 걷던 걸음으로 이어진다 (빠르기가 끊기지 않는다)");
  world.move(0.0f, 0.0f);

  // 뛰기 — 초당 8 m 로 올라 중력 24: 틱마다 (8 − 0.4k)/60 씩, 20 틱에 1.267 m 오른다 (눈높이 1.6 → 2.867).
  // (8k − 0.2k(k+1))/60 이 0 으로 돌아오는 k 는 39 — 39 틱째(소수 오차로 40 틱째)에 초당 7.6(8.0) m 로 내려선다
  steps(world, 20);
  world.jump();
  const uint64_t leapt = world.tick() + 1;
  float top = 0.0f;
  for (int i = 0; i < 60; i++) {
    world.step();
    if (i == 5) world.jump();
    top = std::max(top, world.player().position.y);
  }
  expect(near(top, 2.867f, 5e-3f) && near(world.player().position.y, 1.6f), "뛰면 1.27 m 올랐다가 내려선다 (공중에서는 다시 뛰지 못한다)");
  const uint64_t landed = world.landed_tick().value_or(0);
  expect(world.jumped_tick() == leapt && (landed == leapt + 38 || landed == leapt + 39) && world.landing_speed() > 7.5f && world.landing_speed() < 8.1f && world.grounded(),
         "뛴 틱과 내려선 틱, 내려선 빠르기(초당 7.6 m)가 남는다");
  expect(world.off_tick() == std::nullopt, "뛰기는 박자와 무관하다");
}

/** 관성 — 가속과 마찰, 대각선, 방향 전환, 공중, 대시 중의 뛰기 */
void inertia() {
  World world({{START}}, FLAT);
  expect(!world.grounded() && world.landed_tick() == std::nullopt, "처음에는 방 가운데 위에 떠 있다");
  steps(world, 60);
  // 1.2 m 위에서: k 틱 뒤 0.2·k(k+1)/60 만큼 내려온다 — 18 틱에 1.14 m, 19 틱째에 바닥. 그때의 빠르기 0.4 × 19
  expect(world.grounded() && world.landed_tick() == 19u && near(world.landing_speed(), 7.6f), "19 틱째에 초당 7.6 m 로 내려선다");
  const auto ahead = [&] { return -world.player().position.z; };
  const auto speed = [&] { return -world.velocity().z; };

  // 가속 — 틱마다 0.8: 5 틱에 4.0 (0.8·15/60 = 0.2 m), 7 틱에 5.6 (0.8·28/60 = 0.3733 m), 8 틱째에 6 에 닿는다 (0.4733 m)
  world.move(1.0f, 0.0f);
  steps(world, 5);
  expect(near(speed(), 4.0f) && near(ahead(), 0.2f), "선 자리에서 5 틱: 초당 4.0 m, 0.2 m");
  steps(world, 2);
  expect(near(speed(), 5.6f) && near(ahead(), 0.3733f), "7 틱: 초당 5.6 m, 0.373 m");
  steps(world, 1);
  expect(near(speed(), 6.0f) && near(ahead(), 0.4733f), "8 틱째에 최고 속도 초당 6 m");
  steps(world, 12);
  expect(near(speed(), 6.0f) && near(ahead(), 1.6733f) && world.velocity().x == 0.0f, "그 뒤로는 틱마다 0.1 m — 20 틱에 1.673 m");
  // 마찰 — 틱마다 0.6: 5.4 · 4.8 · 4.2 · 3.6 · 3.0 (0.35 m) · 2.4 · 1.8 · 1.2 · 0.6 · 0 (0.1 m)
  world.move(0.0f, 0.0f);
  steps(world, 5);
  expect(near(speed(), 3.0f) && near(ahead(), 2.0233f), "손을 떼고 5 틱: 초당 3.0 m, 0.35 m 를 미끄러졌다");
  steps(world, 5);
  expect(world.velocity().z == 0.0f && near(ahead(), 2.1233f), "10 틱에 0.45 m 를 미끄러져 선다");
  steps(world, 5);
  expect(near(ahead(), 2.1233f), "선 뒤에는 움직이지 않는다");

  // 대각선 — 앞과 오른쪽을 함께 눌러도 빠르기는 6 (축마다 6/√2 = 4.243)
  world.move(1.0f, 1.0f);
  steps(world, 20);
  expect(near(std::hypot(world.velocity().x, world.velocity().z), 6.0f) && near(world.velocity().x, 4.2426f) && near(speed(), 4.2426f), "대각선으로 걸어도 초당 6 m 다");
  world.move(0.0f, 0.0f);
  steps(world, 10);
  expect(world.velocity().x == 0.0f && world.velocity().z == 0.0f, "다시 선다");

  // 방향 전환 — 앞으로 최고 속도에서 뒤를 누른다. 맞서는 동안 틱마다 1.4: 4.6 · 3.2 · 1.8 · 0.4 (그동안 10/60 = 0.167 m 더 밀린다),
  // 5 틱째에 −1.0 으로 돌아서고, 그 뒤 틱마다 0.8: −1.8 · … · −5.8 · −6.0 (12 틱째)
  world.move(1.0f, 0.0f);
  steps(world, 8);
  const float turned = ahead();
  world.move(-1.0f, 0.0f);
  steps(world, 4);
  expect(near(speed(), 0.4f) && near(ahead() - turned, 0.1667f), "뒤를 눌러도 4 틱은 앞으로 밀린다 (0.167 m)");
  steps(world, 1);
  expect(near(speed(), -1.0f), "5 틱째에 돌아선다");
  steps(world, 6);
  expect(near(speed(), -5.8f), "11 틱째에 초당 5.8 m");
  steps(world, 1);
  expect(near(speed(), -6.0f), "12 틱째에 반대쪽 최고 속도");
  world.move(0.0f, 0.0f);
  steps(world, 10);

  // 공중 — 뛰기 전의 속도를 지닌다 (마찰이 없다). 걸으려는 쪽으로는 틱마다 0.2 씩만 보탠다
  world.move(1.0f, 0.0f);
  steps(world, 8);
  world.jump();
  world.step();
  world.move(0.0f, 0.0f);
  const float leapt = ahead();
  steps(world, 20);
  expect(!world.grounded() && near(speed(), 6.0f) && near(ahead() - leapt, 2.0f), "손을 떼도 공중에서는 뛰기 전의 속도로 간다 — 20 틱에 2 m");
  world.move(-1.0f, 0.0f);
  steps(world, 10);
  expect(!world.grounded() && near(speed(), 4.0f), "공중에서 뒤를 누르면 틱마다 0.2 씩만 줄어든다 — 10 틱에 초당 4.0 m");
  world.move(0.0f, 0.0f);
  steps(world, 30);
  expect(world.grounded() && world.velocity().z == 0.0f && world.landing_speed() > 7.5f && world.landing_speed() < 8.1f, "내려서면 마찰로 선다");
  // 선 자리에서 뛴 뒤에 앞을 누르면 10 틱에 초당 2.0 m (땅에서는 3 틱이면 넘는다)
  world.jump();
  world.step();
  world.move(1.0f, 0.0f);
  steps(world, 10);
  expect(!world.grounded() && near(speed(), 2.0f), "공중의 제어는 약하다 — 선 자리에서 뛰어 10 틱에 초당 2.0 m");
  // 옆으로 틀어도 빨라지지 않는다 — 걷는 빠르기(6)가 상한이다
  world.move(0.0f, 0.0f);
  steps(world, 50);
  world.move(1.0f, 0.0f);
  steps(world, 8);
  world.jump();
  world.step();
  world.move(0.0f, 1.0f);
  steps(world, 20);
  expect(!world.grounded() && world.velocity().x > 3.0f && std::hypot(world.velocity().x, world.velocity().z) < 6.001f, "공중에서 옆으로 틀면 방향만 바뀌고 빨라지지 않는다");
  world.move(0.0f, 0.0f);
  steps(world, 50);

  // 대시 중에 뛰면 대시가 거기서 끝나고, 그 속도를 초당 10 m 까지만 싣고 뛴다 (방 가운데로 돌아와 북쪽 벽까지 자리를 둔다)
  world.look(PI, 0.0f);
  world.move(1.0f, 0.0f);
  while (ahead() > 0.0f) world.step();
  world.look(PI, 0.0f);
  world.move(0.0f, 0.0f);
  steps(world, 20);
  next_slot(world);
  expect(world.act(Action::dash), "칸의 머리에서 대시");
  steps(world, 3);
  expect(world.dashing() && near(std::hypot(world.velocity().x, world.velocity().z), 36.0f), "대시 3 틱째: 초당 36 m");
  world.jump();
  world.step();
  const float flying = ahead();
  expect(!world.dashing() && !world.grounded() && near(speed(), 10.0f), "대시 중에 뛰면 초당 10 m 로 뛴다");
  steps(world, 20);
  expect(!world.grounded() && near(speed(), 10.0f) && near(ahead() - flying, 3.3333f, 5e-3f), "그 속도로 날아간다 — 20 틱에 3.33 m");
  // 내려선 뒤에는 마찰(틱마다 0.6)로 17 틱에 선다. 뛴 39(40) 틱과 합쳐 60 틱이면 서 있다
  steps(world, 40);
  expect(world.grounded() && world.velocity().z == 0.0f, "내려서면 미끄러지다 선다");
}

void dungeon() {
  bool sound = true;
  int shape_seen[game::SHAPE_COUNT]{};
  for (uint32_t seed = 1; seed <= 300; seed++) {
    game::Rng rng(seed);
    const Floor floor = game::generate_floor(rng);
    const std::size_t count = floor.rooms.size();
    bool ok = count >= 8 && count <= 10 && floor.rooms[0] == Room{.x = 0, .z = 0, .doors = floor.rooms[0].doors, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0} &&
              floor.rooms[0].doors != 0;
    // 문을 따라 시작 방에서 닿는 방들과 그 거리
    std::vector<int> reached(count, -1);
    std::queue<uint32_t> queue;
    queue.push(0);
    reached[0] = 0;
    while (!queue.empty()) {
      const uint32_t at = queue.front();
      queue.pop();
      for (const game::Direction d : {game::NORTH, game::EAST, game::SOUTH, game::WEST}) {
        if (!floor.rooms[at].door(d)) continue;
        const auto next = floor.at(floor.rooms[at].x + game::DIRECTION_X[d], floor.rooms[at].z + game::DIRECTION_Z[d]);
        // 문 너머에는 방이 있고, 그 방에도 마주 보는 문이 있다
        if (!next || !floor.rooms[*next].door(game::opposite(d))) {
          ok = false;
          continue;
        }
        if (reached[*next] < 0) {
          reached[*next] = reached[at] + 1;
          queue.push(*next);
        }
      }
    }
    for (std::size_t i = 1; i < count; i++) {
      const Room& room = floor.rooms[i];
      const int enemies = room.chargers + room.casters;
      ok = ok && reached[i] == room.depth && room.shape >= 1 && room.shape <= 5 && room.turn <= 3 && std::abs(room.x) <= 3 && std::abs(room.z) <= 3 && room.chargers >= 1 && room.casters >= 1 &&
           enemies == std::min(6, 1 + room.depth) && floor.at(room.x, room.z) == i;
      // 문은 모두 틀의 문 자리에 난다 (돌려 놓은 틀의 문 자리 ⊇ 문)
      ok = ok && game::fits(room.shape, room.turn, room.doors) && (room.doors & ~game::turned_sides(game::SHAPE_SITES[room.shape], room.turn)) == 0;
      for (const game::Direction d : {game::NORTH, game::EAST, game::SOUTH, game::WEST}) ok = ok && (!room.door(d) || room.site(d));
      shape_seen[room.shape]++;
    }
    ok = ok && floor.rooms[0].turn == 0;
    if (!ok) {
      std::printf("시드 %u 의 층이 규칙에 어긋난다\n", seed);
      sound = false;
    }
  }
  expect(sound, "시드 1…300: 전투방 7–9 개가 모두 시작 방에서 이어지고, 문이 양쪽에서 맞물리고, 문이 틀의 문 자리에 나고, 적은 거리 + 1 마리(6 까지, 두 종류 모두)다");
  expect(shape_seen[0] == 0 && std::all_of(shape_seen + 1, shape_seen + game::SHAPE_COUNT, [](int count) { return count >= 100; }), "시드 1…300: 전투방 틀 다섯이 모두 고르게 나온다 (틀마다 100 번 넘게)");

  // 틀의 문 자리와 돌림 — 손으로 센 값. 문 자리: 시작 방·정사각 홀·십자는 넷, 긴 홀은 북·남, ㄱ 자는 북·동, T 자는 동·남·서
  expect(game::SHAPE_SITES[0] == 15 && game::SHAPE_SITES[1] == 15 && game::SHAPE_SITES[2] == (N | S) && game::SHAPE_SITES[3] == (N | E) && game::SHAPE_SITES[4] == 15 && game::SHAPE_SITES[5] == (E | S | W),
         "틀마다의 문 자리");
  expect(game::turned_sides(N, 1) == E && game::turned_sides(N | E, 3) == (W | N) && game::turned_sides(E | S | W, 2) == (W | N | E) && game::turned_sides(N | S, 1) == (E | W) && game::turned_sides(W, 1) == N &&
             game::turned_sides(15, 2) == 15,
         "문 자리는 돌림 한 번에 시계 방향으로 한 쪽씩 옮겨 간다 (북 → 동 → 남 → 서 → 북)");
  expect(game::fits(2, 0, N | S) && !game::fits(2, 0, E) && game::fits(2, 1, E | W) && game::fits(2, 3, W), "긴 홀: 마주 보는 두 쪽에만 문이 난다");
  expect(game::fits(3, 0, N | E) && game::fits(3, 1, E | S) && game::fits(3, 2, W) && !game::fits(3, 0, S) && !game::fits(3, 0, N | S) && !game::fits(3, 1, N | S) && !game::fits(3, 2, N | S) && !game::fits(3, 3, N | S),
         "ㄱ 자: 이웃한 두 쪽에만 문이 난다 (마주 보는 두 문에는 어떻게 돌려도 맞지 않는다)");
  expect(game::fits(5, 0, E | S | W) && !game::fits(5, 0, N) && game::fits(5, 2, N | E | W) && !game::fits(5, 1, E) && !game::fits(5, 0, 15) && game::fits(4, 3, 15) && game::fits(1, 0, 15) && !game::fits(6, 0, N),
         "T 자: 한 쪽만 막힌다. 문이 넷이면 정사각 홀과 십자만 맞는다");
  bool every = true;
  for (uint8_t doors = 1; doors < 16; doors++) {
    int fitting = 0;
    for (uint8_t shape = 1; shape < game::SHAPE_COUNT; shape++)
      for (uint8_t turn = 0; turn < 4; turn++) fitting += game::fits(shape, turn, doors);
    every = every && fitting >= 8;
  }
  expect(every, "문이 어떻게 나든 맞는 전투방 틀과 돌림이 있다 (정사각 홀과 십자는 네 돌림 모두)");
  const Room turned_room{.x = 0, .z = 0, .doors = E, .shape = 3, .turn = 1, .depth = 1, .chargers = 0, .casters = 0};
  const engine::Vec3 arm = turned_room.to_room({0.0f, 0.0f, -12.0f}), home = turned_room.to_shape({12.0f, 0.0f, 0.0f});
  expect(turned_room.site(game::EAST) && turned_room.site(game::SOUTH) && !turned_room.site(game::NORTH) && !turned_room.site(game::WEST) && arm.x == 12.0f && arm.z == 0.0f && home.x == 0.0f && home.z == -12.0f,
         "한 번 돌린 ㄱ 자: 북쪽 팔이 동쪽으로 온다 (틀의 (0, -12) 가 방의 (12, 0))");

  // 시드별 배치 — 규칙(xorshift32 와 가지치기, 그 뒤의 틀·돌림 고르기)을 따로 옮겨 계산한 값이다. {x, z, 문, 틀, 돌림, 거리, 돌진형, 원거리형}
  game::Rng one(1), again(1), other(2), big(20261009);
  const Floor first = game::generate_floor(one);
  expect(first == Floor{{{0, 0, 2, 0, 0, 0, 0, 0}, {1, 0, 11, 4, 1, 1, 1, 1}, {1, -1, 5, 1, 0, 2, 1, 2}, {1, -2, 4, 1, 2, 3, 1, 3}, {2, 0, 10, 4, 2, 2, 1, 2}, {3, 0, 12, 5, 1, 3, 3, 1},
                        {3, 1, 5, 4, 3, 4, 2, 3}, {3, 2, 1, 5, 1, 5, 4, 2}}},
         "시드 1 의 층");
  expect(game::generate_floor(big) == Floor{{{0, 0, 8, 0, 0, 0, 0, 0}, {-1, 0, 11, 5, 2, 1, 1, 1}, {-1, -1, 5, 2, 2, 2, 2, 1}, {-2, 0, 6, 3, 1, 2, 2, 1}, {-2, 1, 5, 2, 0, 3, 1, 3},
                                            {-2, 2, 1, 3, 0, 4, 4, 1}, {-1, -2, 6, 3, 1, 3, 3, 1}, {0, -2, 10, 5, 0, 4, 3, 2}, {1, -2, 10, 1, 0, 5, 1, 5}, {2, -2, 8, 5, 1, 6, 4, 2}}},
         "시드 20261009 의 층");
  expect(game::generate_floor(again) == first && !(game::generate_floor(other) == first), "같은 시드는 같은 층, 다른 시드는 다른 층");
  expect(World(1, FLAT).floor() == first && World(1, FLAT).rooms_total() == 7, "세계는 제 시드로 그 층을 짓는다");

  // 돌리기 — 북쪽(-z)을 본 것을 동쪽으로 돌리면 +x 를 본다
  const engine::Vec3 door{1.0f, 2.0f, -16.0f};
  const engine::Vec3 east = game::turned(door, game::EAST), south = game::turned(door, game::SOUTH), west = game::turned(door, game::WEST);
  expect(east.x == 16.0f && east.z == 1.0f && south.x == -1.0f && south.z == 16.0f && west.x == -16.0f && west.z == -1.0f && east.y == 2.0f, "북쪽 문의 점 (1, -16) 은 동 (16, 1), 남 (-1, 16), 서 (-16, -1) 로 돈다");
  const engine::Aabb box = game::turned(engine::Aabb{{-2.0f, 0.0f, -16.2f}, {2.0f, 5.0f, -15.8f}}, game::EAST);
  expect(box.min.x == 15.8f && box.max.x == 16.2f && box.min.z == -2.0f && box.max.z == 2.0f, "상자도 상자로 돈다");
}

/** 방 진행 — 포털 → 넘기 → 잠김 → 전멸 → 열림 → 되돌아가기 → 다음 방 → 층 완료 */
void rooms() {
  Room start = START;
  start.doors = N;
  World world(Floor{{start, {.x = 0, .z = -1, .doors = S | N, .shape = 1, .turn = 0, .depth = 1, .chargers = 1, .casters = 0}, {.x = 0, .z = -2, .doors = S, .shape = 2, .turn = 0, .depth = 2, .chargers = 0, .casters = 1}}},
              FLAT);
  expect(world.room() == 0 && !world.locked() && world.visited(0) && world.cleared(0) && !world.visited(1) && !world.cleared(1) && world.rooms_total() == 2 && world.rooms_cleared() == 0 &&
             !world.in_transit() && world.portal_tick() == std::nullopt && world.opened_tick() == std::nullopt,
         "처음: 시작 방(적 없음, 열림), 전투방 둘");
  // 내려선 뒤(60 틱)에 걷는다 — 선 자리에서 n 틱에 0.1n − 0.3267 m: 160 틱에 15.673 m, 몸(반폭 0.3)이 포털 면(16 m)에 닿는 15.7 m 를 넘는 것은 161 틱째(15.773 m)
  steps(world, 60);
  world.move(1.0f, 0.0f);
  steps(world, 160);
  expect(world.room() == 0 && !world.in_transit() && near(world.player().position.z, -15.6733f, 0.01f) && near(world.player().position.y, 1.6f), "포털 면에 닿기 전에는 아무 일도 없다 (15.67 m)");
  steps(world, 1);
  const uint64_t touched = world.portal_tick().value_or(0);
  expect(world.in_transit() && touched == 221 && world.portal_side() == game::NORTH && world.room() == 0, "열린 포털에 몸이 닿으면(15.7 m) 넘기 시작한다 — 걷기 시작한 지 161 틱째");

  // 넘는 중 — 걷기·뛰기·박자 행동이 멈추고 박자(틱)만 간다. 12 틱째에 방이 바뀐다
  steps(world, static_cast<int>(touched + 11 - world.tick()));
  const float held = world.player().position.z;
  world.jump();
  expect(world.room() == 0 && !world.visited(1) && near(held, -15.7733f, 0.01f), "넘기 시작한 뒤 11 틱까지는 아직 앞 방이고, 닿은 자리(15.77 m)에 멈춰 있다 (앞으로 걷는 중인데도)");
  expect(!world.act(Action::fire) && !world.act(Action::dash) && world.shot_tick() == std::nullopt && world.beat_tick() == std::nullopt && world.off_tick() == std::nullopt && world.misses() == 0 && world.pistol().ammo == 8,
         "넘는 중에는 박자 행동이 나가지 않는다 (판정도 하지 않는다)");
  world.step();
  expect(world.tick() == touched + 12 && world.room() == 1 && world.visited(1) && world.in_transit(), "12 틱째에 방이 바뀐다 — 박자(틱)는 끊기지 않는다");
  expect(world.player().position.x == 0.0f && world.player().position.z == 13.5f && near(world.player().position.y, 1.6f) && world.player().yaw == 0.0f,
         "이웃 방의 맞은편(남쪽) 문 안쪽 2.5 m 에(가운데에서 13.5 m), 같은 쪽을 보고 선다");
  expect(world.locked() && !world.cleared(1) && world.enemies().size() == 1 && world.enemies()[0].kind == EnemyKind::charger && world.enemies()[0].health == 100,
         "처음 가는 전투방은 닿자마자 잠기고 적이 나온다");
  const engine::Vec3 spawn = world.enemies()[0].position;
  expect(std::fabs(spawn.x) <= 12.0f && std::fabs(spawn.z) <= 12.0f && spawn.y == 1.1f && flat_distance(spawn, world.player().position) >= 8.0f, "적은 방 안, 플레이어에게서 8 m 밖에 나온다");
  steps(world, 11);
  const engine::Vec3 frozen = world.enemies()[0].position;
  expect(world.tick() == touched + 23 && world.in_transit() && world.player().position.z == 13.5f && frozen.x == spawn.x && frozen.y == 1.1f && frozen.z == spawn.z,
         "넘기를 마칠 때까지(23 틱째) 플레이어도 적도 멈춰 있다");
  world.step();
  // 넘기 전의 속도(초당 6 m)를 지니고 있어 첫 틱부터 0.1 m 를 간다
  expect(!world.in_transit() && near(world.player().position.z, 13.4f) && near(world.velocity().z, -6.0f) && world.enemies()[0].position.y < 1.1f && near(world.player().position.y, 1.6f),
         "24 틱째에 넘기가 끝나 걷던 속도 그대로 다시 걷고(뛰기는 삼켜졌다), 적이 움직인다");

  // 잠긴 포털 — 돌아서 걸어도 포털을 막은 석판(z 15.8)에 몸의 반폭을 남기고 막힌다. 넘어가지 않는다.
  // (돌아서는 데 12 틱, 그동안 남쪽으로 0.33 m — 나머지 48 틱이면 석판까지의 2.1 m 를 넘게 간다. 막힌 축의 속도는 0 이 되어 틱마다 0.8/60 m 씩만 다가간다)
  world.look(PI, 0.0f);
  steps(world, 60);
  expect(world.player().position.z > 15.48f && world.player().position.z < 15.5001f && world.velocity().z == 0.0f && world.room() == 1 && !world.in_transit() && world.portal_tick() == touched,
         "잠긴 포털은 석판에 막혀 닿지 못한다 (막힌 쪽의 속도는 0)");
  world.move(0.0f, 0.0f);

  // 돌진형(체력 100)은 두 발, 처치 점수는 최대 체력 × 배수
  for (int shot = 0; shot < 2; shot++) {
    next_slot(world);
    aim_at(world, middle(world.enemies()[0]));
    expect(world.act(Action::fire) && world.hit_tick() == world.tick(), "겨누고 박자에 쏘면 맞는다");
    if (shot == 0)
      expect(world.enemies().size() == 1 && world.enemies()[0].health == 50 && world.enemies()[0].hurt_tick == world.tick() && world.locked() && world.opened_tick() == std::nullopt,
             "한 발에 50 — 아직 잠겨 있다");
  }
  expect(world.enemies().empty() && !world.locked() && world.cleared(1) && world.opened_tick() == world.tick() && world.rooms_cleared() == 1 && world.score() == 100 &&
             world.outcome() == World::Outcome::playing,
         "적을 다 잡으면 포털이 열리고 100 점 (배수 1)");
  const int32_t health = world.player().health;

  // 열린 포털로 시작 방에 돌아간다 — 북쪽 문 안쪽에 남쪽을 본 채 선다. 서 있는 것만으로는 되돌아가지 않는다
  // (석판 앞에 서 있었다 — 북쪽으로 30 틱 물러났다가 돌아서, 최고 속도로 포털에 닿는다)
  world.look(-world.player().yaw, -world.player().pitch);
  world.move(1.0f, 0.0f);
  steps(world, 30);
  world.look(PI, 0.0f);
  for (int i = 0; i < 100 && world.room() != 0; i++) world.step();
  world.move(0.0f, 0.0f);
  expect(world.room() == 0 && world.portal_side() == game::SOUTH && world.player().position.z == -13.5f && near(std::fabs(world.player().yaw), PI) && !world.locked() &&
             world.enemies().empty() && world.opened_tick() == std::nullopt,
         "열린 포털로 시작 방에 돌아간다 — 북쪽 문 안쪽 13.5 m 에 같은 쪽(남쪽)을 보고 선다");
  const uint64_t returned = world.portal_tick().value_or(0);
  steps(world, 120);
  // 손을 뗀 채 넘었다 — 넘기를 마치면 지니고 있던 속도(초당 6 m)가 마찰로 줄며 0.45 m 를 더 안쪽으로 미끄러져 선다 (13.05 m)
  expect(world.room() == 0 && !world.in_transit() && world.portal_tick() == returned && near(world.player().position.z, -13.05f) && world.velocity().z == 0.0f,
         "도착한 자리는 포털 면에서 2.2 m 안쪽이라 방금 나온 포털로 되튕기지 않는다 (걷던 속도로 0.45 m 더 미끄러져 선다)");
  // 돌아서 2.65 m 를 걸어야(선 자리에서 30 틱) 다시 닿는다 — 20 틱에는 1.67 m
  world.look(PI, 0.0f);
  world.move(1.0f, 0.0f);
  steps(world, 20);
  expect(!world.in_transit() && world.portal_tick() == returned && near(world.player().position.z, -14.7233f), "20 틱(1.67 m)을 되걸어도 아직 닿지 않는다");
  walk_through(world);
  expect(world.room() == 1 && !world.locked() && world.enemies().empty() && world.projectiles().empty() && world.cleared(1), "비운 방은 다시 가도 적이 없고 열려 있다");

  // 다음 방 — 원거리형(체력 50)은 한 발. 모든 전투방을 비우면 층이 끝난다
  walk_through(world);
  expect(world.room() == 2 && world.locked() && world.player().position.z > 13.39f && world.enemies().size() == 1 && world.enemies()[0].kind == EnemyKind::caster &&
             world.enemies()[0].health == 50,
         "다음 방에 닿으면 다시 잠긴다");
  next_slot(world);
  aim_at(world, middle(world.enemies()[0]));
  expect(world.act(Action::fire) && world.enemies().empty() && world.score() == 150 && world.rooms_cleared() == 2 && world.outcome() == World::Outcome::cleared,
         "마지막 전투방을 비우면 층 완료 — 원거리형은 50 점");
  expect(world.player().health == health, "그동안 맞지 않았다");
  const uint64_t tick = world.tick();
  world.step();
  expect(world.tick() == tick && !world.act(Action::fire), "판이 끝나면 세계는 멈춘다");
}

/** 도착 유예 — 전투방에 닿은 뒤 두 박(80 틱)은 적이 공격을 시작하지 않는다. 앞 방의 것은 남지 않는다 */
void arrival() {
  // 시작 방 — 북쪽의 원거리형 방 — 그 북쪽의 방 (층이 끝나지 않게 하나 더 둔다)
  Floor floor = two_rooms(0, 1);
  floor.rooms[1].doors = S | N;
  floor.rooms.push_back({.x = 0, .z = -2, .doors = S, .shape = 1, .turn = 0, .depth = 2, .chargers = 1, .casters = 0});
  World world(floor, FLAT);
  steps(world, 60);
  world.move(1.0f, 0.0f);
  std::optional<uint64_t> windup, bolt;
  for (int i = 0; i < 600 && !bolt; i++) {
    world.step();
    if (world.room() == 0) continue;
    world.move(0.0f, 0.0f);
    if (!windup && world.enemies()[0].act == Enemy::Act::windup) windup = world.tick();
    if (!world.projectiles().empty()) bolt = world.tick();
  }
  // 내려선 뒤(60 틱)에 걸어 포털에 닿는 것이 221 틱, 방이 바뀌는 것이 233 틱 — 유예가 313 틱에 끝나고, 그 뒤 첫 박의 머리는 320 틱이다.
  // 유예가 없다면 적이 내려선 뒤의 첫 박 머리(280 틱)에 모으기 시작했을 것이다
  expect(windup == 320u && bolt == 360u, "닿은 뒤 두 박은 공격을 시작하지 않는다 — 원거리형의 첫 모으기는 320 틱, 첫 투사체는 360 틱");
  expect(world.player().health == 100, "그때까지 맞지 않는다");

  // 투사체가 날아오는 중에 적을 잡으면 방이 비고 투사체도 사라진다 — 포털을 넘어도 앞 방의 것은 남지 않는다
  aim_at(world, middle(world.enemies()[0]));
  expect(!world.projectiles().empty() && world.act(Action::fire) && world.enemies().empty() && world.projectiles().empty() && !world.locked(), "방을 비우면 날아오던 투사체도 사라진다");
  world.look(PI - world.player().yaw, -world.player().pitch);
  walk_through(world);
  expect(world.room() == 0 && world.enemies().empty() && world.projectiles().empty() && world.player().health == 100, "포털 너머에는 앞 방의 적도 투사체도 없다");
}

/** 시드 1 의 층을 포털로만 돌아 끝낸다 — 방마다 원거리형부터 쏘고, 비운 뒤 탄창을 갈고, 안 가 본 방(북·동·남·서 차례)으로, 없으면 온 길로 돌아간다 */
void whole_floor() {
  World world(1, FLAT);
  const Floor& floor = world.floor();
  int transits = 0;
  std::optional<uint64_t> last_portal;
  bool alone = true;
  for (int i = 0; i < 60 * 600 && world.outcome() == World::Outcome::playing; i++) {
    world.step();
    if (world.portal_tick() != last_portal) {
      last_portal = world.portal_tick();
      transits++;
    }
    // 방은 늘 원점의 하나뿐이다 — 플레이어도 적도 그 마당(한 변 33.4 m) 안에 있다
    alone = alone && std::fabs(world.player().position.x) < 16.7f && std::fabs(world.player().position.z) < 16.7f;
    for (const Enemy& enemy : world.enemies()) alone = alone && std::fabs(enemy.position.x) < 16.7f && std::fabs(enemy.position.z) < 16.7f;
    if (world.in_transit() || world.outcome() != World::Outcome::playing) continue;
    const bool slot = world.tick() % game::TICKS_PER_SLOT == 0;
    if (world.locked()) {
      world.move(0.0f, 0.0f);
      if (!slot) continue;
      // 원거리형부터, 같은 종류면 가까운 것부터
      const Enemy* target = nullptr;
      for (const Enemy& enemy : world.enemies())
        if (!target || (enemy.kind == EnemyKind::caster && target->kind != EnemyKind::caster) ||
            (enemy.kind == target->kind && flat_distance(enemy.position, world.player().position) < flat_distance(target->position, world.player().position)))
          target = &enemy;
      aim_at(world, middle(*target));
      // 탄이 떨어졌으면 갈아 끼운다 (R 두 번 — 발사로는 갈리지 않는다)
      world.act(world.pistol().ammo == 0 || world.pistol().reload_stage ? Action::reload : Action::fire);
      continue;
    }
    if (world.pistol().ammo < 8) {
      world.move(0.0f, 0.0f);
      if (slot) world.act(Action::reload);
      continue;
    }
    // 갈 문 — 안 가 본 방이 있으면 그쪽, 없으면 시작 방에 더 가까운 방(온 길)
    const Room& room = floor.rooms[world.room()];
    std::optional<game::Direction> way;
    for (const game::Direction d : {game::NORTH, game::EAST, game::SOUTH, game::WEST}) {
      if (!room.door(d)) continue;
      const uint32_t beyond = floor.at(room.x + game::DIRECTION_X[d], room.z + game::DIRECTION_Z[d]).value_or(0);
      if (!world.visited(beyond)) {
        way = d;
        break;
      }
      if (floor.rooms[beyond].depth < room.depth) way = d;
    }
    if (!way) break;
    // 문의 축 위로 먼저 가고(방 가운데에서 12 m), 거기서 포털로 곧게 걷는다
    const engine::Vec3 axis{static_cast<float>(game::DIRECTION_X[*way]), 0.0f, static_cast<float>(game::DIRECTION_Z[*way])};
    const engine::Vec3 at = world.player().position;
    const bool lined = std::fabs(at.x * axis.z - at.z * axis.x) < 0.5f && at.x * axis.x + at.z * axis.z > 0.0f;
    const engine::Vec3 to = axis * (lined ? 17.0f : 12.0f);
    world.look(std::atan2(to.x - at.x, -(to.z - at.z)) - world.player().yaw, -world.player().pitch);
    world.move(1.0f, 0.0f);
  }
  // 시드 1 의 층: 전투방 7 개, 돌진형 13 · 원거리형 14 마리 (배수 1 이면 2,000 점). 방 0→1→2→3→2→1→4→5→6→7 — 포털을 아홉 번 넘는다 (방 3 이 막다른 길이다)
  expect(world.outcome() == World::Outcome::cleared && world.rooms_cleared() == 7 && world.rooms_total() == 7 && world.room() == 7, "시드 1 의 층: 포털로만 돌아 모든 전투방을 비우면 층 완료");
  expect(transits == 9 && alone && world.score() >= 2000, "포털을 아홉 번 넘고, 그동안 세계에는 늘 원점의 방 하나만 있었다");
  bool all = true;
  for (uint32_t i = 0; i < floor.rooms.size(); i++) all = all && world.visited(i) && world.cleared(i);
  expect(all, "모든 방을 가 보고 비웠다");
}

/** 배수 — 방에 적이 있을 때만 쌓이고 끊긴다 */
void streak() {
  World world(two_rooms(1, 0), FLAT);
  enter_north(world);
  // 서쪽으로 걸어 갔다가(2 초) 동쪽으로 걸으며 하늘에 쏜다 — 계속 걸으면 돌진이 닿지 않는다 (예고를 시작한 자리를 향해 굳는다)
  world.look(0.0f, 1.2f);
  world.move(0.0f, -1.0f);
  steps(world, 120);
  world.move(0.0f, 1.0f);
  for (int action = 1; action <= 12; action++) {
    next_slot(world);
    // 여덟 발을 쏘고, 빈 탄창은 R 두 번에 갈고, 다시 쏜다 — 빗나간 사격도 재장전도 박자에 맞으면 이어진다
    expect(world.act(action == 9 || action == 10 ? Action::reload : Action::fire) && world.streak() == static_cast<uint32_t>(action), "박자에 맞춘 행동마다 하나씩 쌓인다");
    // 탄이 떨어진 뒤의 빈 방아쇠는 배수를 건드리지 않는다 (박자에 맞든 아니든)
    if (action == 8) {
      steps(world, 3);
      expect(!world.act(Action::fire) && world.streak() == 8, "빈 방아쇠는 실수가 아니다 — 배수가 그대로다");
      steps(world, 7);
      expect(!world.act(Action::fire) && world.streak() == 8 && world.off_tick() == std::nullopt && world.misses() == 0, "박을 벗어난 빈 방아쇠도 판정하지 않는다");
    }
    if (action == 9) expect(game::multiplier(world.streak()) == 1, "아홉 번까지는 배수 1");
    if (action == 10) expect(game::multiplier(world.streak()) == 2 && world.pistol().ammo == 8, "열 번째에 배수 2 (재장전 두 번이 9·10 번째)");
  }
  expect(world.hurt_tick() == std::nullopt && world.pistol().ammo == 6 && world.enemies().size() == 1, "그동안 맞지 않았고, 빗나간 사격은 실수가 아니다");
  steps(world, 14);
  expect(world.act(Action::fire) && world.streak() == 12 && world.off_side() == -1 && world.pistol().ammo == 5, "어긋난 행동(다음 칸의 6 틱 앞)은 나가되 배수는 그대로다 (오르지도 내려가지도 않는다)");
  next_slot(world);
  expect(!world.act(Action::fire) && world.streak() == 12 && world.pistol().ammo == 5 && world.misses() == 0, "이르게 쏜 칸의 머리에서 또 쏘면 연타다 — 아무 일도 없고 배수도 그대로다");
  next_slot(world);
  expect(world.act(Action::fire) && world.streak() == 13 && !world.act(Action::fire) && world.streak() == 13, "같은 칸의 두 번째 발사(연타)는 배수를 건드리지 않는다");
  next_slot(world);
  world.act(Action::dash);
  next_slot(world);
  expect(world.streak() == 14 && !world.act(Action::dash) && world.streak() == 14, "쿨다운 중의 대시는 나가지 않고 배수도 그대로다");
  // 미스 — 나가지 않고 배수가 한 단계 내려간다: x2 의 14 는 x1 의 처음(0)이 된다
  const uint64_t dashed = *world.dash_tick();
  steps(world, 9);
  expect(!world.act(Action::fire) && world.streak() == 0 && world.pistol().ammo == 4 && world.misses() == 1 && world.miss_side() == 1 && !world.pending(), "미스(9 틱 늦게)는 나가지 않고 배수를 한 단계 내린다 (x2 의 14 → x1 의 0)");
  next_slot(world);
  expect(world.act(Action::fire) && world.streak() == 1 && world.pistol().ammo == 3, "미스 뒤의 정박은 처음부터 다시 쌓인다");
  steps(world, 10);
  expect(!world.act(Action::reload) && world.streak() == 0 && world.pistol().ammo == 3 && world.pistol().reload_stage == 0 && world.misses() == 2, "재장전도 미스면 나가지 않는다 (칸 사이 한가운데 — 다음 칸의 10 틱 앞) — x1 에서는 연속 수가 0 이 된다");
  steps(world, 1);
  expect(!world.act(Action::dash) && world.dash_tick() == dashed && world.streak() == 0 && world.misses() == 3 && world.miss_side() == -1, "대시도 미스면 나가지 않는다 (9 틱 이르게)");
  expect(world.hurt_tick() == std::nullopt, "그동안 맞지 않았다 — 배수는 미스로만 내려갔다");
}

/** 근접 돌진형 — 박의 머리에서 예고를 시작해 두 박 뒤, 굳힌 방향으로 곧게 돌진한다 */
void charger() {
  // 가만히 있으면 맞는다: 100 → 75 → 50 → 25 → 0 (죽음)
  {
    World world(two_rooms(1, 0), FLAT);
    enter_north(world);
    std::optional<uint64_t> windup_at, charge_at;
    engine::Vec3 aim{}, from{};
    bool timed = true, straight = true, hurt_in_charge = false, stopped = true;
    float closest = 100.0f;
    std::vector<int32_t> healths{world.player().health};
    for (int i = 0; i < 4000 && world.outcome() == World::Outcome::playing; i++) {
      const Enemy::Act before = world.enemies()[0].act;
      world.step();
      const Enemy& enemy = world.enemies()[0];
      if (before != Enemy::Act::windup && enemy.act == Enemy::Act::windup) {
        windup_at = world.tick();
        aim = enemy.aim;
        from = enemy.position;
        const engine::Vec3 to = engine::normalize(engine::Vec3{world.player().position.x - enemy.position.x, 0.0f, world.player().position.z - enemy.position.z});
        timed = timed && game::beat_head(world.tick()) && flat_distance(enemy.position, world.player().position) <= 9.0f && near(aim.x, to.x) && near(aim.z, to.z);
      }
      if (before == Enemy::Act::windup && enemy.act == Enemy::Act::charge) {
        charge_at = world.tick();
        // 예고 두 박(80 틱) 동안은 제자리에 서 있다
        timed = timed && windup_at && world.tick() == *windup_at + 80;
      }
      if (before == Enemy::Act::charge) {
        const engine::Vec3 moved = enemy.position - from;
        const float length = flat_distance(enemy.position, from);
        // 굳힌 방향으로만, 12 m 까지 (닿은 채로 시작해 거의 움직이지 않은 돌진은 방향을 잴 수 없다)
        straight = straight && length <= 12.01f && (length < 0.01f || (moved.x * aim.x + moved.z * aim.z) / length > 0.999f);
      }
      closest = std::min(closest, flat_distance(enemy.position, world.player().position));
      if (world.player().health != healths.back()) {
        healths.push_back(world.player().health);
        hurt_in_charge = before == Enemy::Act::charge && world.hurt_tick() == world.tick() && world.streak() == 0;
        // 닿는 거리 — 적의 반폭 0.6 + 플레이어의 반폭 0.3 + 여유 0.2
        stopped = stopped && enemy.act == Enemy::Act::recover && near(flat_distance(enemy.position, world.player().position), 1.1f);
      }
    }
    expect(windup_at && charge_at && timed, "돌진형은 9 m 안에서 박의 머리에 예고를 시작하고, 정확히 두 박(80 틱) 뒤에 돌진한다");
    expect(straight, "돌진은 예고를 시작할 때 굳힌 방향으로 곧게 간다");
    expect(healths == std::vector<int32_t>{100, 75, 50, 25, 0} && hurt_in_charge, "가만히 있으면 돌진에 맞는다 — 한 번에 25, 네 번에 죽는다");
    expect(stopped && closest > 1.098f, "돌진은 플레이어에 닿은 자리(1.1 m)에서 멈춘다 — 몸을 뚫고 지나가지 않는다");
    expect(world.outcome() == World::Outcome::dead && !world.act(Action::fire), "체력 0 이면 죽음이고 세계가 멈춘다");
  }
  // 예고 중에 옆으로 비키면 맞지 않는다
  {
    World world(two_rooms(1, 0), FLAT);
    enter_north(world);
    bool dodged = false;
    for (int i = 0; i < 2000 && !dodged; i++) {
      const Enemy::Act before = world.enemies()[0].act;
      world.step();
      const Enemy& enemy = world.enemies()[0];
      if (before != Enemy::Act::windup && enemy.act == Enemy::Act::windup) {
        // 적을 마주 보고 오른쪽으로 걷는다
        aim_at(world, middle(enemy));
        world.move(0.0f, 1.0f);
      }
      dodged = before == Enemy::Act::charge && enemy.act == Enemy::Act::recover;
    }
    expect(dodged && world.player().health == 100 && world.hurt_tick() == std::nullopt, "예고 중에 옆으로 비키면 돌진이 지나간다");
  }
  // 한꺼번에 돌진(예고 포함)하는 것은 하나뿐 — 나머지는 사거리 안에서도 기다린다
  {
    World world(two_rooms(3, 0), FLAT);
    enter_north(world);
    int most = 0, windups = 0;
    bool waited = false;
    for (int i = 0; i < 1500 && world.outcome() == World::Outcome::playing; i++) {
      const int before = attacking(world, EnemyKind::charger);
      world.step();
      const int now = attacking(world, EnemyKind::charger);
      most = std::max(most, now);
      if (now > before) windups++;
      if (game::beat_head(world.tick()) && now == 1)
        for (const Enemy& enemy : world.enemies())
          if (enemy.act == Enemy::Act::roam && enemy.grounded && flat_distance(enemy.position, world.player().position) <= 9.0f) waited = true;
    }
    expect(most == 1 && windups >= 3 && waited, "돌진 토큰은 하나 — 다른 돌진형은 사거리 안의 박 머리에서도 기다렸다가 차례로 온다");
  }
}

/** 원거리형 — 박의 머리에서 한 박 모은 뒤, 쏘는 순간의 플레이어 자리로 곧게 날아가는 투사체 */
void caster() {
  {
    World world(two_rooms(0, 3), FLAT);
    enter_north(world);
    int most = 0;
    bool timed = true, straight = true, seen = false;
    std::optional<uint64_t> first_windup;
    engine::Vec3 velocity{}, last{};
    for (int i = 0; i < 1200 && world.player().health == 100; i++) {
      const int before = attacking(world, EnemyKind::caster);
      const std::size_t bolts = world.projectiles().size();
      world.step();
      const int now = attacking(world, EnemyKind::caster);
      most = std::max(most, now);
      if (now > before) {
        timed = timed && game::beat_head(world.tick());
        if (!first_windup) first_windup = world.tick();
      }
      if (!seen && world.projectiles().size() > bolts) {
        // 첫 투사체 — 모으기 한 박(40 틱) 뒤에 나온다
        seen = true;
        timed = timed && first_windup && world.tick() == *first_windup + 40;
        velocity = world.projectiles()[0].velocity;
        last = world.projectiles()[0].position;
        straight = near(std::sqrt(engine::dot(velocity, velocity)), 12.0f);
      } else if (seen && !world.projectiles().empty() && world.projectiles()[0].velocity.x == velocity.x && world.player().health == 100) {
        const engine::Vec3 now_at = world.projectiles()[0].position, moved = now_at - last;
        straight = straight && near(moved.x, velocity.x / 60.0f, 1e-4f) && near(moved.y, velocity.y / 60.0f, 1e-4f) && near(moved.z, velocity.z / 60.0f, 1e-4f);
        last = now_at;
      }
    }
    expect(seen && timed, "원거리형은 박의 머리에서 모으기 시작해 한 박(40 틱) 뒤에 쏜다");
    expect(most == 2, "발사 토큰은 둘 — 셋 가운데 둘까지만 한꺼번에 모은다");
    expect(straight, "투사체는 초당 12 m 로 곧게 날아간다 (유도 없음)");
    expect(world.player().health == 75 && world.hurt_tick() == world.tick(), "가만히 있으면 투사체에 맞는다 — 25");
    // 맞은 뒤 한 박(40 틱)은 다시 맞지 않는다 — 둘이 함께 쏜 투사체가 잇달아 와도, 죽을 때까지 피격 사이는 늘 40 틱 이상이다
    uint64_t hurt = world.tick();
    int hits = 1;
    bool spaced = true;
    for (int i = 0; i < 4000 && world.outcome() == World::Outcome::playing; i++) {
      world.step();
      if (world.hurt_tick() == hurt) continue;
      spaced = spaced && *world.hurt_tick() - hurt >= 40;
      hurt = *world.hurt_tick();
      hits++;
    }
    expect(spaced && hits == 4 && world.outcome() == World::Outcome::dead, "맞은 뒤 한 박은 다시 맞지 않는다 (네 번 맞아 죽을 때까지)");
  }
  {
    // 첫 투사체가 보이면 오른쪽으로 걷는다 — 쏜 순간의 자리로 가는 투사체는 빗나가 벽에 닿아 사라진다
    World world(two_rooms(0, 3), FLAT);
    enter_north(world);
    for (int i = 0; i < 1200 && world.projectiles().empty(); i++) world.step();
    const std::size_t fired = world.projectiles().size();
    bool gone = false;
    // 오른쪽으로 10 m, 이어서 앞으로 10 m — 지나온 자리로 돌아가지 않는다
    for (int i = 0; i < 200; i++) {
      world.move(i < 100 ? 0.0f : 1.0f, i < 100 ? 1.0f : 0.0f);
      const std::size_t before = world.projectiles().size();
      world.step();
      gone = gone || world.projectiles().size() < before;
    }
    expect(fired >= 1 && world.hurt_tick() == std::nullopt, "걸어서 비키면 투사체는 빗나간다");
    expect(gone, "빗나간 투사체는 벽에 닿아 사라진다");
  }
}

/** 번호 from 부터의 일들의 종류 (남아 있는 것만) */
std::vector<WorldEvent::Kind> kinds(const World& world, uint64_t from = 0) {
  std::vector<WorldEvent::Kind> out;
  for (uint64_t i = from; i < world.event_count(); i++)
    if (const auto event = world.event(i)) out.push_back(event->kind);
  return out;
}

void events() {
  using Kind = WorldEvent::Kind;
  {
    World world({{START}}, FLAT);
    steps(world, 60);
    // 방 가운데 위에서 떨어져 내려선 것(19 틱째)이 첫 일이다
    expect(kinds(world) == std::vector<Kind>{Kind::landed} && world.event(0)->tick == 19 && !world.event(1), "처음에는 내려선 것 하나뿐이다");
    world.act(Action::fire);
    world.act(Action::fire);
    steps(world, 20);
    world.act(Action::reload);
    next_slot(world);
    world.act(Action::reload);
    next_slot(world);
    world.act(Action::dash);
    // 읽지 않고 여러 틱이 지나도 일은 일어난 차례로 다 남아 있다 (shot_tick 같은 '마지막 한 번' 값과 다르다)
    steps(world, 30);
    expect(kinds(world, 1) == std::vector<Kind>{Kind::shot, Kind::magazine_out, Kind::magazine_in, Kind::dash}, "발사·탄창 빼기·끼우기·대시가 일어난 차례로 남는다 (같은 칸의 둘째 발사는 일이 아니다)");
    expect(world.event(1)->tick == 60 && world.event(2)->tick == 80 && world.event(3)->tick == 100 && world.event(4)->tick == 120, "일마다 일어난 틱이 적힌다");
    expect(world.event(1)->at.x == 0.0f && near(world.event(1)->at.y, 1.6f) && world.event(1)->at.z == 0.0f && !world.event(5), "플레이어의 일은 눈의 자리에 적히고, 아직 없는 번호는 없다");
    // 뛰어올랐다 내려선 것도 일이다 — 대시(120 틱)가 끝나고 선 뒤(150 틱)에 뛴다: 151 틱째에 뛰고 39(40) 틱 뒤에 내려선다
    world.jump();
    steps(world, 50);
    expect(kinds(world, 5) == std::vector<Kind>{Kind::jumped, Kind::landed} && world.event(5)->tick == 151 && (world.event(6)->tick == 189 || world.event(6)->tick == 190), "뛰어오른 것과 내려선 것이 남는다");
    // 탄 없이 당긴 방아쇠도 일이다 — 한 발 쏘고(200 틱), 다음 칸에서 탄창을 빼고 당긴 뒤(220 틱), 그 다음 칸에서 끼운다
    world.act(Action::fire);
    next_slot(world);
    world.act(Action::reload);
    world.act(Action::fire);
    next_slot(world);
    world.act(Action::reload);
    expect(world.tick() == 240 && kinds(world, 7) == std::vector<Kind>{Kind::shot, Kind::magazine_out, Kind::dry, Kind::magazine_in} && world.event(9)->tick == 220 && world.pistol().ammo == 8,
           "탄창을 빼 둔 동안의 발사는 빈 방아쇠로 남는다 (탄창은 R 로만 끼워진다)");
    steps(world, 20);
    // 고리는 64 칸 — 일 82 개가 쌓이면 번호 0…17 은 밀려나고 18…81 이 남는다. 읽는 쪽은 밀려난 번호를 건너뛴다.
    // 한 발 쏘고(260 틱), 다음 칸에서 탄창을 빼고, 방아쇠를 69 번 당긴다 — 빈 방아쇠는 당길 때마다 일이다
    world.act(Action::fire);
    steps(world, 20);
    world.act(Action::reload);
    for (int i = 0; i < 69; i++) world.act(Action::fire);
    expect(world.event_count() == 82, "발사·탄창 빼기와 빈 방아쇠 69 번은 일 71 개");
    expect(!world.event(0) && !world.event(17) && world.event(18) && world.event(81) && !world.event(82) && kinds(world).size() == 64 && world.event(81)->kind == Kind::dry,
           "오래된 일은 밀려나고 가장 새 64 개만 남는다");
  }
  {
    // 포털 → 도착 → 잠김 → 두 발에 처치 → 열림 → 층 완료
    World world(two_rooms(1, 0), FLAT);
    enter_north(world);
    const uint64_t touched = *world.portal_tick();
    expect(kinds(world) == std::vector<Kind>{Kind::landed, Kind::portal, Kind::arrived, Kind::locked}, "(내려서고) 포털에 닿고, 건너편에 서고, 문이 잠긴다");
    expect(world.event(1)->tick == touched && world.event(2)->tick == touched + 12 && world.event(3)->tick == touched + 12 && world.event(2)->at.z == 13.5f, "도착은 닿은 뒤 12 틱째, 선 자리에 적힌다");
    engine::Vec3 struck{};
    for (int shot = 0; shot < 2; shot++) {
      next_slot(world);
      aim_at(world, middle(world.enemies()[0]));
      struck = world.enemies()[0].position;
      world.act(Action::fire);
    }
    expect(kinds(world, 4) == std::vector<Kind>{Kind::shot, Kind::hit, Kind::shot, Kind::hit, Kind::kill, Kind::opened, Kind::cleared}, "맞힘·처치·열림·층 완료가 차례로 남는다");
    const WorldEvent kill = *world.event(8);
    expect(kill.tick == world.tick() && kill.enemy == EnemyKind::charger && kill.at.x == struck.x && kill.at.z == struck.z, "적의 일은 그 적의 자리와 종류로 적힌다");
  }
  {
    // 가만히 서서 돌진형에 죽는다 — 예고는 박의 머리, 돌진은 두 박(80 틱) 뒤, 피격 넷, 마지막이 죽음
    World world(two_rooms(1, 0), FLAT);
    enter_north(world);
    for (int i = 0; i < 4000 && world.outcome() == World::Outcome::playing; i++) world.step();
    int windups = 0, charges = 0, hurts = 0;
    bool paired = true;
    std::optional<uint64_t> windup;
    // 일이 64 개를 넘지 않는 판이다 (내려섬·포털·도착·잠김 + 공격 네 번의 예고·돌진·피격 + 죽음)
    for (uint64_t i = 0; i < world.event_count(); i++) {
      const WorldEvent event = *world.event(i);
      if (event.kind == Kind::windup) {
        windups++;
        windup = event.tick;
        paired = paired && game::beat_head(event.tick) && event.enemy == EnemyKind::charger;
      }
      if (event.kind == Kind::charge) {
        charges++;
        paired = paired && windup && event.tick == *windup + 80;
      }
      if (event.kind == Kind::hurt) hurts++;
    }
    expect(world.outcome() == World::Outcome::dead && windups == charges && charges >= 4 && hurts == 4 && paired, "돌진형: 예고는 박의 머리, 돌진은 80 틱 뒤 — 네 번 맞는다");
    expect(world.event(world.event_count() - 1)->kind == Kind::dead && world.event(world.event_count() - 2)->kind == Kind::hurt, "마지막 피격에 이어 죽음이 적힌다");
  }
  {
    // 원거리형 — 모으기(박의 머리) 한 박 뒤에 투사체
    World world(two_rooms(0, 1), FLAT);
    enter_north(world);
    for (int i = 0; i < 1200 && world.player().health == 100; i++) world.step();
    std::optional<uint64_t> windup, bolt;
    for (uint64_t i = 0; i < world.event_count(); i++) {
      const WorldEvent event = *world.event(i);
      if (event.kind == Kind::windup && !windup) windup = event.tick;
      if (event.kind == Kind::bolt && !bolt) bolt = event.tick;
    }
    expect(windup && bolt && game::beat_head(*windup) && *bolt == *windup + 40, "원거리형: 모으기 한 박(40 틱) 뒤에 투사체를 쏜다");
  }
}

/** 판정 — 정박·어긋남·미스가 틱마다 맞게 갈리는지, 미스가 아무것도 바꾸지 않는지, 한 칸에 무기의 행동 하나와 기억해 둔 행동이 어떻게 도는지 본다 */
void judgement() {
  // 대시는 무기(발사·재장전)와 칸을 나눠 쓰지 않는다 — 박에 맞춰 대시하며 쏘는 것은 둘 다 나간다 (어느 쪽을 먼저 눌렀든)
  {
    World world({{START}}, FLAT);
    steps(world, 60);
    expect(world.act(Action::dash) && world.act(Action::fire) && world.pistol().ammo == 7 && world.off_tick() == std::nullopt, "같은 칸에 대시하고 쏘면 둘 다 나간다");
    steps(world, 40);
    expect(world.act(Action::fire) && world.act(Action::dash) && world.pistol().ammo == 6 && world.off_tick() == std::nullopt, "같은 칸에 쏘고 대시해도 둘 다 나간다");
    expect(!world.act(Action::fire) && world.pistol().ammo == 6, "무기의 행동은 한 칸에 하나다 — 같은 칸의 둘째 발사는 나가지 않는다");
  }
  // 칸의 머리(틱 200)에서 o 틱 지난 때의 누름 (0…9 는 그 칸, 10…19 는 다음 칸(220)에 든다 — 그 머리에서 o − 20 틱).
  // 정박은 머리에서 5 틱 안(0…5, 15…19), 어긋남은 그 밖 8 틱 안(6…8 늦었다 +1, 12…14 일렀다 -1), 미스는 그 밖의 세 틱(9 늦었다, 10·11 일렀다).
  // 발사·재장전·대시가 같은 판정을 받는다: 미스면 탄·재장전 단계·대시가 그대로이고 일(miss) 하나만 남는다
  using game::Verdict;
  constexpr Verdict ON = Verdict::on_beat, OFF = Verdict::off_beat, MISS = Verdict::miss;
  constexpr Verdict VERDICT[20] = {ON, ON, ON, ON, ON, ON, OFF, OFF, OFF, MISS, MISS, MISS, OFF, OFF, OFF, ON, ON, ON, ON, ON};
  constexpr int SIDE[20] = {0, 0, 0, 0, 0, 0, 1, 1, 1, 1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0};
  bool went = true, marks = true, side = true, untouched = true, logged = true;
  for (const Action action : {Action::fire, Action::reload, Action::dash}) {
    for (int o = 0; o < 20; o++) {
      World world({{START}}, FLAT);
      steps(world, 180);
      // 재장전을 볼 때는 먼저 한 발 쏴 둔다 (가득 찬 탄창은 뺄 수 없다) — 180 틱의 칸은 200·220 의 칸과 다르다
      if (action == Action::reload) world.act(Action::fire);
      steps(world, 20 + o);
      const uint32_t ammo = world.pistol().ammo;
      const uint64_t events = world.event_count(), now = world.tick();
      const engine::Vec3 stood = world.player().position;
      const Verdict verdict = VERDICT[o];
      went = went && world.act(action) == (verdict != MISS);
      marks = marks && (world.beat_tick() == now) == (verdict == ON) && (world.off_tick() == now) == (verdict == OFF) && (world.miss_tick() == now) == (verdict == MISS) &&
              world.misses() == (verdict == MISS ? 1u : 0u);
      side = side && (verdict != OFF || world.off_side() == SIDE[o]) && (verdict != MISS || world.miss_side() == SIDE[o]);
      logged = logged && world.event_count() == events + 1 &&
               world.event(events)->kind == (verdict == MISS ? WorldEvent::Kind::miss : action == Action::fire ? WorldEvent::Kind::shot : action == Action::reload ? WorldEvent::Kind::magazine_out : WorldEvent::Kind::dash);
      steps(world, 12);
      if (verdict == MISS) {
        untouched = untouched && world.pistol().ammo == ammo && world.pistol().reload_stage == 0 && world.shot_tick() == (action == Action::reload ? std::optional<uint64_t>{180} : std::nullopt) &&
                    world.dash_tick() == std::nullopt && world.player().position.x == stood.x && world.player().position.z == stood.z && !world.pending();
      } else {
        untouched = untouched && (action == Action::fire ? world.pistol().ammo == 7 && world.shot_tick() == now : action == Action::reload ? world.pistol().ammo == 0 && world.pistol().reload_stage == 1
                                                                                                                                             : world.dash_tick() == now && near(stood.z - world.player().position.z, 4.1f));
      }
    }
  }
  expect(went, "정박·어긋남(머리에서 8 틱 안)이면 나가고, 그 밖(9…11 틱 지난 때)은 나가지 않는다 — 발사·재장전·대시 모두");
  expect(marks, "정박은 머리에서 앞뒤 5 틱 안, 어긋남은 6…8 틱, 미스는 그 밖이다 (경계: +5 정박·+6 어긋남, +8 어긋남·+9 미스, -9 미스·-8 어긋남, -6 어긋남·-5 정박)");
  expect(side, "어긋남과 미스에는 일렀는지(-1) 늦었는지(+1)가 남는다");
  expect(logged, "나간 행동은 제 일로, 미스는 miss 로 일 하나가 남는다");
  expect(untouched, "미스는 탄·재장전 단계·대시와 선 자리를 바꾸지 않는다 (나간 것은 탄 7·탄창 빠짐·12 틱에 4.1 m)");
  // 미스는 그 칸을 쓰지 않는다 — 칸(220)에서 10 틱 이른 210 틱의 미스 뒤에, 그 칸의 창이 열리자마자(220 − 8 = 212) 쏘면 나간다
  {
    World world({{START}}, FLAT);
    steps(world, 210);
    expect(!world.act(Action::fire) && world.misses() == 1 && world.miss_side() == -1, "210 틱의 발사는 미스다 (220 의 칸의 10 틱 앞)");
    steps(world, 2);
    expect(world.act(Action::fire) && world.shot_tick() == 212u && world.off_side() == -1 && world.pistol().ammo == 7, "212 틱(220 의 칸의 8 틱 앞)에는 나간다");
  }

  // 온박·반박을 번갈아, 창의 양 끝을 오가며 칸마다 눌러도 모두 나간다 — 이르게 누른 것과 제때 누른 것이 한 칸으로 묶이지 않는다.
  // 정박의 창 끝(-5, +5)이면 모두 정박이고, 나가는 창 끝(-8, +8)이면 모두 어긋남이다 (여덟 발 뒤에는 재장전을 두 번 누른다 — 그것도 나간 행동이다)
  for (const int first : {-5, 5, -8, 8}) {
    World world({{START}}, FLAT);
    steps(world, 200 + first);
    const bool edge = first == -8 || first == 8;
    bool all = true;
    int jitter = first;
    for (int press = 0; press < 40; press++) {
      all = all && world.act(world.pistol().ammo == 0 || world.pistol().reload_stage ? Action::reload : Action::fire) && (edge ? world.off_tick() : world.beat_tick()) == world.tick();
      // 다음 칸의 반대쪽 끝으로: -5 다음은 +5 (30 틱 뒤), +5 다음은 -5 (10 틱 뒤)
      steps(world, 20 - 2 * jitter);
      jitter = -jitter;
    }
    expect(all && (edge ? world.beat_tick() : world.off_tick()) == std::nullopt && world.misses() == 0 && !world.pending(), "창의 양 끝을 오가며 칸마다 눌러도 모두 나간다 (±5 는 모두 정박, ±8 은 모두 어긋남)");
  }
  // 연타 — 같은 칸의 둘째 발사는 아무 일도 없다 (일도 남지 않고, 기억해 두지도 않는다)
  {
    World world({{START}}, FLAT);
    steps(world, 200);
    world.act(Action::fire);
    const uint64_t events = world.event_count();
    world.step();
    expect(!world.act(Action::fire) && world.event_count() == events && !world.pending() && world.pistol().ammo == 7 && world.off_tick() == std::nullopt, "발사 뒤의 발사는 아무 일도 없다");
  }
  // 쏘자마자 재장전 — 그 칸은 발사가 썼다: 재장전은 기억해 두었다가 다음 칸(220)의 창이 열리는 틱(220 − 8 = 212)에 나간다
  {
    World world({{START}}, FLAT);
    steps(world, 200);
    world.act(Action::fire);
    steps(world, 2);
    expect(!world.act(Action::reload) && world.pending() && world.pistol().reload_stage == 0, "쏜 칸의 재장전은 지금 나가지 않고 기억된다");
    steps(world, 9);
    expect(world.tick() == 211 && world.pending() && world.pistol().reload_stage == 0, "다음 칸의 창이 열리기 전(211 틱)에는 기다린다");
    world.step();
    expect(world.tick() == 212 && !world.pending() && world.pistol().reload_stage == 1 && world.pistol().ammo == 0 && world.event(world.event_count() - 1)->kind == WorldEvent::Kind::magazine_out &&
               world.event(world.event_count() - 1)->tick == 212,
           "창이 열리는 틱(212)에 탄창이 빠진다");
    expect(world.beat_tick() == 200u && world.off_tick() == std::nullopt, "기억했다 나간 행동은 박에 맞은 것도 벗어난 것도 아니다");
    steps(world, 8);
    expect(world.tick() == 220 && !world.act(Action::reload) && world.pending() && world.pistol().reload_stage == 1, "그 칸(220)은 기억했다 나간 재장전이 썼다 — 머리에서 누른 R 은 다시 기억된다");
    steps(world, 11);
    expect(world.tick() == 231 && world.pending() && world.pistol().reload_stage == 1, "그 다음 칸(240)의 창이 열리기 전(231 틱)에는 기다린다");
    world.step();
    expect(world.tick() == 232 && world.pistol().ammo == 8 && world.pistol().reload_stage == 0 && !world.pending(), "그 다음 칸의 창이 열리는 틱(240 − 8 = 232)에 끼워진다");
  }
  // R 두 번 — 탄창을 빼고(200) 곧바로 또 누르면(203) 끼우기가 다음 칸의 창(212)에 나간다. 그 사이의 발사는 빈 방아쇠이고 기억한 것을 바꾸지 않는다
  {
    World world({{START}}, FLAT);
    steps(world, 180);
    world.act(Action::fire);
    steps(world, 20);
    expect(world.act(Action::reload) && world.pistol().reload_stage == 1, "R: 탄창을 뺀다 (가득 찬 탄창은 뺄 수 없어 먼저 한 발 쐈다)");
    steps(world, 3);
    expect(!world.act(Action::reload) && world.pending() && world.pistol().reload_stage == 1, "같은 칸의 둘째 R 은 기억된다");
    steps(world, 2);
    expect(!world.act(Action::fire) && world.dry_tick() == 205u && world.pending(), "그 사이의 발사는 빈 방아쇠다 — 기억한 재장전은 그대로다");
    steps(world, 7);
    expect(world.tick() == 212 && world.pistol().ammo == 8 && world.pistol().reload_stage == 0 && !world.pending(), "212 틱에 끼워진다");
  }
  // 끼우자마자 발사 — 기억했다 다음 칸에 나간다. 나중에 누른 것이 앞에 기억한 것을 대신한다 (하나만 기억한다)
  {
    World world({{START}}, FLAT);
    steps(world, 160);
    world.act(Action::fire);
    steps(world, 20);
    world.act(Action::reload);
    steps(world, 20);
    expect(world.act(Action::reload) && world.pistol().ammo == 8, "200 틱에 끼웠다");
    expect(!world.act(Action::reload) && !world.pending(), "가득 찬 탄창의 R 은 기억되지도 않는다");
    expect(!world.act(Action::fire) && world.pending() && world.pistol().ammo == 8, "끼운 칸의 발사는 기억된다");
    steps(world, 12);
    expect(world.tick() == 212 && world.pistol().ammo == 7 && world.shot_tick() == 212u && !world.pending(), "212 틱에 나간다");
    expect(!world.act(Action::reload) && world.pending(), "쏜 칸(220)의 R 이 기억된다");
    steps(world, 20);
    expect(world.tick() == 232 && world.pistol().reload_stage == 1, "232 틱(240 의 칸의 창이 열리는 틱)에 탄창이 빠진다");
  }
  // 미스와 기억해 둔 행동 — 미스는 기억한 것을 건드리지 않고, 미스한 누름은 기억되지 않는다
  {
    World world({{START}}, FLAT);
    steps(world, 200);
    world.act(Action::fire);
    steps(world, 2);
    expect(!world.act(Action::reload) && world.pending(), "쏜 칸(200)의 R(202)이 기억된다");
    steps(world, 7);
    expect(world.tick() == 209 && !world.act(Action::fire) && world.misses() == 1 && world.miss_tick() == 209u && world.pending() && world.pistol().ammo == 7 && world.shot_tick() == 200u,
           "그 사이(209 틱 — 9 틱 늦게)의 발사는 미스다: 나가지 않고 기억한 재장전은 그대로다");
    steps(world, 3);
    expect(world.tick() == 212 && !world.pending() && world.pistol().reload_stage == 1, "기억한 재장전은 제때(212) 나간다");
    World other({{START}}, FLAT);
    steps(other, 200);
    other.act(Action::fire);
    steps(other, 9);
    expect(!other.act(Action::reload) && !other.pending() && other.misses() == 1 && other.miss_side() == 1, "쏜 칸의 R 도 나가는 창 밖(209)이면 미스다 — 기억되지 않는다");
    steps(other, 11);
    expect(other.tick() == 220 && other.pistol().reload_stage == 0 && other.pistol().ammo == 7, "다음 칸이 와도 나가지 않는다");
    expect(other.act(Action::reload) && other.pistol().reload_stage == 1, "그 칸(220)의 머리에서 다시 누르면 나간다");
  }
  // 기억해 둔 행동은 포털에 닿으면 버린다
  {
    World probe(two_rooms(0, 0), FLAT);
    probe.move(1.0f, 0.0f);
    while (!probe.in_transit()) probe.step();
    const uint64_t touched = probe.tick();
    World world(two_rooms(0, 0), FLAT);
    world.move(1.0f, 0.0f);
    steps(world, static_cast<int>(touched) - 2);
    // 닿기 두 틱 전 — 포털에 닿는 틱은 박자와 무관하니, 누른 때를 가장 가까운 칸의 머리로 보게 한다 (ago)
    const int32_t ago = game::slot_offset(world.tick());
    expect(world.act(Action::fire, ago) && !world.act(Action::reload, ago) && world.pending(), "포털에 닿기 두 틱 전에 쏘고 R 을 눌러 둔다");
    steps(world, 2);
    expect(world.in_transit() && world.tick() == touched, "포털에 닿았다");
    steps(world, 80);
    expect(!world.in_transit() && !world.pending() && world.pistol().ammo == 7 && world.pistol().reload_stage == 0 && world.room() == 1, "넘고 나면 기억한 재장전은 없다 (탄창이 그대로다)");
  }
  // 대시도 같은 판정을 받는다 — 미스면 나가지 않고(쿨다운도 쓰지 않는다), 정박만 박에 맞은 것으로 남는다
  {
    World world({{START}}, FLAT);
    steps(world, 200);
    expect(world.act(Action::dash) && world.beat_tick() == 200u, "200 틱의 대시는 정박이다");
    steps(world, 20);
    expect(!world.act(Action::dash) && world.dash_tick() == 200u && world.event(world.event_count() - 1)->kind == WorldEvent::Kind::dash && world.misses() == 0,
           "다음 칸(220)에는 나가지 않는다 — 일도 남지 않는다 (쿨다운이지 미스가 아니다)");
    steps(world, 20);
    expect(world.act(Action::dash) && world.dash_tick() == 240u && world.beat_tick() == 240u, "한 박 뒤(240)에는 나간다");
    steps(world, 49);
    const engine::Vec3 stood = world.player().position;
    expect(world.tick() == 289 && !world.act(Action::dash) && world.dash_tick() == 240u && !world.dashing() && world.miss_tick() == 289u && world.miss_side() == 1 &&
               world.event(world.event_count() - 1)->kind == WorldEvent::Kind::miss && world.event(world.event_count() - 1)->tick == 289,
           "289 틱(280 의 칸에서 9 틱 늦게)의 대시는 미스다 — 나가지 않고 일(miss)이 남는다");
    steps(world, 11);
    expect(world.player().position.x == stood.x && world.player().position.z == stood.z, "미스한 대시는 몸을 옮기지 않는다");
    expect(world.tick() == 300 && world.act(Action::dash) && world.dash_tick() == 300u, "미스는 쿨다운을 쓰지 않았다 — 다음 칸(300)에 나간다");
    steps(world, 46);
    expect(world.tick() == 346 && world.act(Action::dash) && world.dash_tick() == 346u && world.beat_tick() == 300u && world.off_tick() == 346u && world.off_side() == 1,
           "346 틱(340 의 칸에서 6 틱 늦게)의 대시는 나간다 — 어긋나 늦은 것으로 남는다");
  }

  // 누른 때로 판정한다 — 입력이 닿기까지 지난 틱(ago)을 주면 그만큼 앞의 틱으로 칸과 판정을 정한다 (행동은 닿은 틱에 나간다)
  {
    World world({{START}}, FLAT);
    steps(world, 206);
    expect(world.act(Action::fire, 1) && world.shot_tick() == 206u && world.beat_tick() == 206u && world.off_tick() == std::nullopt,
           "정박의 창을 한 틱 지나 닿았어도 한 틱 전(205)에 누른 것이면 정박이다 (총은 닿은 틱에 나간다)");
    steps(world, 7);
    // 틱 213 에서 한 틱 전(212)은 다음 칸(220)의 8 틱 앞이다 — 그 칸에 들어 나가고, 어긋난 것이다
    expect(world.act(Action::fire, 1) && world.off_tick() == 213u && world.off_side() == -1 && world.beat_tick() == 206u && world.pistol().ammo == 6, "누른 때(212)가 다음 칸의 나가는 창 안이면 그 칸에 든다");
    expect(!world.act(Action::fire) && world.pistol().ammo == 6, "그 칸은 이미 썼다");
    steps(world, 20);
    // 틱 233 에서 13 틱 전(220)은 방금 쓴 칸이다. 지난 틱은 한 칸(20 틱)까지만 쳐 준다: 100 틱 전이라 해도 20 틱 전(213 — 같은 칸)으로 본다
    expect(world.tick() == 233 && !world.act(Action::fire, 13) && !world.act(Action::fire, 100) && world.pistol().ammo == 6 && world.misses() == 0, "이미 쓴 칸으로 거슬러 가는 입력은 나가지 않는다 (미스도 아니다)");
    // 나가는 창을 한 틱 지난 209 틱 — 방금 누른 것이면 미스이고, 한 틱 전(208)에 누른 것이면 나간다. 정박의 틱(205)에 닿았어도 누른 때를 4 틱 뒤(209)로 보면 미스다
    World late({{START}}, FLAT);
    steps(late, 209);
    expect(!late.act(Action::fire) && late.misses() == 1 && late.pistol().ammo == 8 && late.act(Action::fire, 1) && late.off_tick() == 209u && late.off_side() == 1 && late.pistol().ammo == 7,
           "209 틱: 방금 누른 것은 미스, 한 틱 전에 누른 것은 어긋나 나간다");
    World shifted({{START}}, FLAT);
    steps(shifted, 205);
    expect(!shifted.act(Action::fire, -4) && shifted.miss_tick() == 205u && shifted.miss_side() == 1 && shifted.pistol().ammo == 8, "205 틱의 누름을 4 틱 뒤(209)로 보면 미스다");
    World early({{START}}, FLAT);
    steps(early, 3);
    expect(early.act(Action::fire, 10), "지난 틱이 지금까지의 틱보다 많으면 첫 틱으로 본다");
    // 음수의 ago — 누른 때를 뒤로 본다 (조립 지점이 일정하게 이른 치우침을 덜어 낸 값). 한 칸(20 틱)까지만
    World ahead({{START}}, FLAT);
    steps(ahead, 189);
    expect(ahead.act(Action::fire, -8) && ahead.beat_tick() == 189u && ahead.off_tick() == std::nullopt, "189 틱에 8 틱 뒤로 본 누름(197)은 200 의 칸에서 3 틱 이르다 — 정박이다");
    steps(ahead, 11);
    expect(!ahead.act(Action::fire) && ahead.pistol().ammo == 7, "그 칸(200)은 뒤로 본 누름이 이미 썼다");
    World far({{START}}, FLAT);
    steps(far, 170);
    expect(!far.act(Action::fire, -100) && far.miss_tick() == 170u && far.miss_side() == -1 && far.pistol().ammo == 8, "뒤로 보는 것은 20 틱까지다 — 170 틱의 누름은 190 으로 보고, 200 의 칸에서 10 틱 일러 미스다");
  }
}

/** 판정의 시각 (input/judge.hpp) — 연속 시간에서 누른 때의 틱을 구하고, 일정한 치우침을 따라간다 */
void judge() {
  using game::Judge;
  {
    // 틱 300 에서 반 틱 지난 때, 50 ms(3 틱) 전에 누른 것 — 누른 때는 297.5 → 틱 298 (연속 시간에서 한 번만 반올림한다), 칸 300 에서 2.5 틱(41.7 ms) 일렀다
    const auto press = Judge::press(300, 0.5, 50.0, 0.0);
    expect(press && press->ago == 2 && std::fabs(press->raw_ms + 41.6667) < 1e-3 && std::fabs(press->residual_ms + 41.6667) < 1e-3, "누른 때는 지금의 틱과 소수에서 지난 시간을 뺀 것이다");
    expect(Judge::press(300, 0.0, 250.0, 0.0) && !Judge::press(300, 0.0, 250.5, 0.0), "250 ms 넘게 늦게 닿은 입력은 판정하지 않는다");
    expect(Judge::press(300, 0.0, -30.0, 0.0)->ago == 0 && Judge::press(300, 0.0, std::numeric_limits<double>::quiet_NaN(), 0.0)->ago == 0, "앞날이거나 숫자가 아닌 시각은 방금으로 친다");
    // 판정 보정 +50 ms — 누른 때를 3 틱 이르게 본다. raw 는 보정을 덜기 전이라 0 그대로다 (칸의 머리 200 에서 눌렀다)
    const auto offset = Judge::press(200, 0.0, 0.0, 50.0);
    expect(offset->ago == 3 && std::fabs(offset->raw_ms) < 1e-9 && std::fabs(offset->residual_ms + 50.0) < 1e-9, "판정 보정만큼 누른 때를 이르게 본다 — raw 에서 보정값이 그대로 빠진다");
    expect(Judge::press(200, 0.0, 0.0, std::numeric_limits<double>::infinity())->ago == 0, "숫자가 아닌 판정 보정은 0 으로 친다");
    const Judge fresh;
    expect(fresh.last_ms() == std::nullopt && fresh.mean_ms() == std::nullopt, "누른 적이 없으면 타이밍 표시가 없다");
  }
  {
    // 늘 80 ms(4.8 틱) 늦게 누르는 사람 — 보정이 0 이면 언제 눌러도 4.8 틱 늦은 그대로다: 앞의 누름이 몇 번이든 판정은 옮겨 가지 않는다 (자동 보정 없음)
    Judge judge;
    const auto first = Judge::press(204, 0.8, 0.0, 0.0);
    expect(first->ago == -1 && std::fabs(first->raw_ms - 80.0) < 1e-6 && std::fabs(first->residual_ms - 80.0) < 1e-6, "첫 누름: 204.8 → 틱 205, 칸 200 에서 80 ms 늦다");
    bool same = true;
    for (int i = 0; i < 200; i++) {
      const auto press = judge.press(204 + 20 * static_cast<uint64_t>(i), 0.8, 0.0, 0.0);
      same = same && press->ago == -1 && std::fabs(press->raw_ms - 80.0) < 1e-6 && std::fabs(press->residual_ms - 80.0) < 1e-6;
      judge.record(*press);
    }
    expect(same, "같은 때의 누름은 이백 번을 이어 눌러도 같은 판정이다 — 앞선 누름이 눈금을 옮기지 않는다");
    expect(std::fabs(*judge.last_ms() - 80.0) < 1e-6 && std::fabs(*judge.mean_ms() - 80.0) < 1e-6, "타이밍 표시: 마지막과 최근 평균 (판정이 본 그대로)");
    // 판정 보정 +80 ms 를 넣으면 같은 누름이 칸의 머리(틱 1000)로 판정된다 — 누른 때 1004.8 − 4.8 = 1000
    const auto after = judge.press(1004, 0.8, 0.0, 80.0);
    expect(after->ago == 4 && std::fabs(after->residual_ms) < 1e-6 && std::fabs(after->raw_ms - 80.0) < 1e-6, "판정 보정 +80 ms: 80 ms 늦은 누름이 칸의 머리로 판정된다 (raw 는 80 그대로)");
    judge.record(*after);
    expect(std::fabs(*judge.last_ms()) < 1e-6 && std::fabs(*judge.mean_ms() - 75.0) < 1e-6, "타이밍 표시는 보정을 던 값이다 (평균은 16 번 가운데 하나가 0 — 75 ms)");
  }
  {
    // 늘 150 ms(9 틱) 이르게 누르는 사람(기기) — 보정 없이는 언제나 미스다 (나가는 창은 ±8 틱). 판정 보정 −150 ms 면 언제나 정박이다. 그 사이에 저절로 바뀌는 일이 없다
    int misses = 0, on_beat = 0;
    for (int i = 0; i < 40; i++) {
      const uint64_t tick = 191 + 20 * static_cast<uint64_t>(i);
      misses += game::verdict_at(static_cast<uint64_t>(static_cast<int64_t>(tick) - Judge::press(tick, 0.0, 0.0, 0.0)->ago)) == game::Verdict::miss;
      on_beat += game::verdict_at(static_cast<uint64_t>(static_cast<int64_t>(tick) - Judge::press(tick, 0.0, 0.0, -150.0)->ago)) == game::Verdict::on_beat;
    }
    expect(misses == 40 && on_beat == 40 && Judge::press(191, 0.0, 0.0, -150.0)->ago == -9, "150 ms 이른 누름: 보정 0 이면 마흔 번 모두 미스, 보정 −150 ms 면 마흔 번 모두 정박 (9 틱 뒤로 본다)");
  }
  {
    // 박자와 무관하게 누르면(위상이 고르게 흩어진 4000 번) 스물에 셋(15 %)은 미스다 (나가는 창 밖이 한 칸 20 틱 가운데 3 틱) — 누름이 판정을 무르게 하지 않는다
    Judge judge;
    uint32_t seed = 2026, misses = 0;
    for (int i = 0; i < 4000; i++) {
      seed = seed * 1664525u + 1013904223u;
      const double phase = static_cast<double>(seed >> 8) / 16777216.0 * game::TICKS_PER_SLOT;
      const uint64_t tick = 1000 + 20 * static_cast<uint64_t>(i) + static_cast<uint64_t>(phase);
      const auto press = judge.press(tick, phase - std::floor(phase), 0.0, 0.0);
      misses += game::verdict_at(static_cast<uint64_t>(static_cast<int64_t>(tick) - press->ago)) == game::Verdict::miss;
      judge.record(*press);
    }
    // 4000 × 3/20 = 600, 표준편차 √(4000 · 0.15 · 0.85) ≈ 23 — 앞뒤 80(3.5 σ)
    expect(misses > 520 && misses < 680, "흩어진 누름은 스물에 셋이 미스다 (4000 번에 600 번 안팎)");
  }
}

void determinism() {
  // 같은 시드와 같은 입력이면 같은 결과 — 방에 들어가 돌며 박자마다 쏜다
  struct Result {
    uint32_t score;
    int32_t health;
    float x, z;
    std::size_t enemies;
    bool operator==(const Result&) const = default;
  };
  Result results[2]{};
  for (Result& result : results) {
    World world(two_rooms(3, 3), FLAT, 7);
    enter_north(world);
    world.move(0.3f, 1.0f);
    for (int tick = 0; tick < 900; tick++) {
      world.step();
      world.look(0.021f, tick % 40 < 20 ? 0.002f : -0.002f);
      if (world.tick() % 20 == 0) world.act(Action::fire);
    }
    result = {world.score(), world.player().health, world.player().position.x, world.player().position.z, world.enemies().size()};
  }
  expect(results[0] == results[1], "같은 시드·입력은 같은 결과를 낸다");
  World a(two_rooms(3, 3), FLAT, 7), b(two_rooms(3, 3), FLAT, 8);
  enter_north(a);
  enter_north(b);
  expect(a.enemies().size() == 6 && b.enemies().size() == 6 && a.enemies()[0].position.x != b.enemies()[0].position.x, "적이 나오는 자리는 시드가 정한다");
}

void input() {
  World world(two_rooms(1, 0), FLAT);
  game::Controls controls;
  steps(world, 60);

  controls.move(world, 500.0, 500.0);
  expect(world.player().yaw == 0.0f && world.player().pitch == 0.0f, "조준 중이 아니면 포인터가 움직여도 시선은 그대로다");
  controls.press(world, 0);
  controls.key(world, "KeyR", true);
  expect(world.pistol().ammo == 8 && world.shot_tick() == std::nullopt, "조준 중이 아닐 때의 클릭은 쏘지 않는다");

  controls.set_captured(world, true);
  // 감도 0.0022 rad/px: 오른쪽 100 px → yaw 0.22, 아래 50 px → pitch -0.11
  controls.move(world, 100.0, 50.0);
  expect(std::fabs(world.player().yaw - 0.22f) < 1e-5f && std::fabs(world.player().pitch + 0.11f) < 1e-5f, "100 px 오른쪽·50 px 아래는 yaw 0.22, pitch -0.11");
  controls.move(world, -100.0, -50.0);
  // 옵션 — 감도 배율 2 에 상하 반전: 같은 움직임이 yaw 0.44, pitch +0.22
  controls.move(world, 100.0, 50.0, 2.0f, true);
  expect(std::fabs(world.player().yaw - 0.44f) < 1e-5f && std::fabs(world.player().pitch - 0.22f) < 1e-5f, "감도 2 배·상하 반전이면 yaw 0.44, pitch +0.22");
  controls.move(world, -100.0, -50.0, 2.0f, true);
  world.look(0.0f, 10.0f);
  expect(world.player().pitch == 1.5f, "pitch 는 1.5 에서 멈춘다");
  world.look(std::numeric_limits<float>::infinity(), 0.0f);
  expect(std::isfinite(world.player().yaw), "유한하지 않은 시선 입력은 무시한다");
  world.look(0.0f, -1.5f);

  controls.press(world, 1);
  expect(world.shot_tick() == std::nullopt, "가운데 버튼은 아무것도 하지 않는다");
  controls.press(world, 0);
  expect(world.shot_tick() == 60u && world.pistol().ammo == 7, "조준 중의 왼쪽 클릭은 쏜다");
  next_slot(world);
  controls.key(world, "KeyR", true);
  expect(world.pistol().ammo == 0 && world.pistol().reload_stage == 1, "R 은 재장전 한 단계");
  next_slot(world);
  controls.key(world, "KeyR", false);
  expect(world.pistol().reload_stage == 1, "글쇠를 떼는 것은 행동이 아니다");
  controls.key(world, "KeyR", true);
  expect(world.pistol().ammo == 8, "R 을 한 번 더 누르면 끼운다");
  next_slot(world);
  const float z = world.player().position.z;
  // 대시는 8 틱에 3.8 m, 손을 떼고 있으면 0.45 m 더 미끄러져 선다 — 18 틱째에는 모두 4.25 m
  controls.key(world, "ShiftLeft", true);
  steps(world, 18);
  expect(near(world.player().position.z, z - 4.25f), "Shift 는 대시");
  steps(world, 22);
  // 돌아서서 온 쪽으로 — 같은 쪽으로 두 번이면 북쪽 문에 닿는다 (4.25 m 를 갔다가 그만큼 돌아온다)
  world.look(PI, 0.0f);
  controls.press(world, 2);
  steps(world, 18);
  expect(near(world.player().position.z, z), "오른쪽 클릭도 대시");
  world.look(-PI, 0.0f);
  controls.key(world, "Space", true);
  steps(world, 10);
  expect(world.player().position.y > 2.0f, "Space 는 뛴다");
  steps(world, 54);

  // 글쇠로 걷기 — 선 자리에서 6 틱이면 초당 4.8 m, 0.8·21/60 = 0.28 m
  const float from = world.player().position.z;
  controls.key(world, "KeyW", true);
  steps(world, 6);
  expect(near(world.player().position.z, from - 0.28f) && near(world.velocity().z, -4.8f), "W 로 앞으로 6 틱에 0.28 m (초당 4.8 m 까지 붙었다)");
  // 맞선 두 글쇠는 서로 지운다 — 걸으려는 쪽이 없어 마찰로 선다: 4.2 · 3.6 · … · 0 — 8 틱에 0.6·28/60 = 0.28 m 를 미끄러진다
  controls.key(world, "KeyS", true);
  steps(world, 8);
  const float held = world.player().position.z;
  expect(near(held, from - 0.56f) && world.velocity().z == 0.0f, "맞선 두 글쇠는 서로 지운다 (미끄러져 선다)");
  steps(world, 6);
  expect(world.player().position.z == held, "선 뒤에는 움직이지 않는다");
  controls.key(world, "KeyW", false);
  controls.key(world, "KeyS", false);
  controls.key(world, "KeyD", true);
  steps(world, 6);
  expect(near(world.player().position.x, 0.28f) && world.player().position.z == held, "D 로 오른쪽(+x)으로 6 틱에 0.28 m");
  controls.key(world, "KeyQ", true);
  controls.set_captured(world, false);
  steps(world, 8);
  const float x = world.player().position.x;
  expect(near(x, 0.56f) && world.velocity().x == 0.0f, "포인터를 놓으면 누르고 있던 글쇠도 뗀 것이 된다 (미끄러져 선다)");
  steps(world, 6);
  expect(world.player().position.x == x, "선 뒤에는 움직이지 않는다");
  controls.key(world, "KeyW", true);
  steps(world, 6);
  expect(world.player().position.z == held, "조준 중이 아니면 글쇠로 걷지 않는다");
}

/** 걷기와 충돌 — 12 m × 12 m 의 방 하나: 북쪽(z -4 … -3)에 높이 0.5 m 의 턱, 동쪽(x 3 … 3.5)에 높이 2 m 의 벽 */
void walking() {
  const std::vector<engine::Aabb> solids{
      {{-6.0f, -1.0f, -6.0f}, {6.0f, 0.0f, 6.0f}},
      {{-6.0f, 0.0f, -4.0f}, {3.0f, 0.5f, -3.0f}},
      {{3.0f, 0.0f, -6.0f}, {3.5f, 2.0f, 6.0f}},
  };
  const game::RoomKit kit{.rooms = {solids, solids, solids, solids, solids, solids}, .nav = {}, .sealed = {}, .gate = {}};
  {
    // 방 가운데 위 1.2 m 에서 떨어져 바닥에 선다. 선 자리에서 20 틱을 걸으면 0.1 × 20 − 0.3267 = 1.673 m
    World world({{START}}, kit);
    expect(near(world.player().position.y, 2.8f), "처음에는 방 가운데 위에 떠 있다");
    steps(world, 60);
    expect(near(world.player().position.y, 1.6f) && world.player().position.x == 0.0f && world.player().position.z == 0.0f, "떨어져 바닥에 선다 (눈높이 1.6)");
    world.move(1.0f, 0.0f);
    steps(world, 20);
    expect(near(world.player().position.z, -1.6733f) && near(world.player().position.y, 1.6f), "앞(-z)으로 20 틱에 1.67 m");
    // 20 틱 더 (2 m) — 턱(z -3 부터, 높이 0.5)을 걸어 오른다. 턱의 윗면에 바로 선다: 공중에 뜨지 않아 걷는 빠르기가 그대로다
    steps(world, 20);
    expect(near(world.player().position.z, -3.6733f) && near(world.player().position.y, 2.1f) && world.grounded() && near(world.velocity().z, -6.0f) && world.landed_tick() == 19u,
           "0.5 m 턱은 걸어서 오른다 (눈높이 2.1) — 뜨지 않고, 느려지지 않는다");
    world.move(0.0f, 0.0f);
    steps(world, 10);
    const float z = world.player().position.z;
    expect(near(z, -4.1233f) && world.velocity().z == 0.0f, "걸음을 멈추면 0.45 m 를 미끄러져 선다");
    steps(world, 30);
    expect(world.player().position.z == z, "선 뒤에는 움직이지 않는다");
  }
  {
    // 동쪽(+x)을 보고 걷는다 — 벽(x 3)에 몸의 반폭 0.3 을 남기고 막힌다
    World world({{START}}, kit);
    steps(world, 60);
    world.look(PI / 2.0f, 0.0f);
    world.move(1.0f, 0.0f);
    steps(world, 90);
    const float x = world.player().position.x;
    expect(x > 2.59f && x <= 2.7001f && near(world.player().position.y, 1.6f), "2 m 벽은 넘지 못하고 그 앞에서 멈춘다");
    // 뛰어도 2 m 벽은 넘지 못한다 (1.27 m 까지 오른다)
    world.jump();
    steps(world, 40);
    expect(world.player().position.x <= 2.7001f, "뛰어도 2 m 벽은 넘지 못한다");
    // 북동쪽(45 도)으로 걸으면 벽을 따라 북쪽으로 미끄러진다 — 막힌 축(x)의 속도는 0 이고, 다른 축(z)은 걸으려는 속도의 그 성분 6/√2 = 4.243 으로 붙는다.
    // 따로 계산한 값(벽에 붙어 선 자리에서, 틱마다 속도가 걸으려는 속도로 0.8 씩 다가가고 x 는 0 으로 되돌린다): 40 틱 뒤 z 속도 -4.2413, 간 거리 2.4607 m
    const float z = world.player().position.z;
    world.look(-PI / 4.0f, 0.0f);
    steps(world, 40);
    expect(world.player().position.x <= 2.7001f && world.velocity().x == 0.0f && near(world.velocity().z, -4.2413f) && near(world.player().position.z, z - 2.4607f, 5e-3f),
           "비스듬히 걸으면 벽을 따라 미끄러진다 — 막힌 축의 속도는 0, 다른 축은 그대로");
  }
  {
    // 남쪽(+z)으로 방 끝(z 6)을 넘어가면 떨어지고, 방 가운데 위로 돌아온다
    World world({{START}}, kit);
    steps(world, 60);
    world.look(PI, 0.0f);
    world.move(1.0f, 0.0f);
    bool fell = false, returned = false;
    for (int i = 0; i < 400; i++) {
      world.step();
      if (world.player().position.y < -10.0f) fell = true;
      if (fell && world.player().position.y > 0.0f && world.player().position.z < 6.0f) returned = true;
    }
    expect(fell && returned, "방 밖으로 걸어 나가면 떨어졌다가 방 가운데로 돌아온다");
  }
}

/** 그 쪽(d)으로 잰 거리와 옆으로 벗어난 거리 */
float along(engine::Vec3 at, game::Direction d) { return at.x * static_cast<float>(game::DIRECTION_X[d]) + at.z * static_cast<float>(game::DIRECTION_Z[d]); }
float aside(engine::Vec3 at, game::Direction d) { return at.x * static_cast<float>(game::DIRECTION_Z[d]) - at.z * static_cast<float>(game::DIRECTION_X[d]); }
engine::Vec3 node_at(const engine::NavNode& node) { return {node.position[0], node.position[1], node.position[2]}; }
/** 방 하나(room)와, 그 방의 d 쪽 문으로 이어진 이웃 방(beyond) — rooms[0] 이 처음 서는 방이다 */
Floor pair_of(Room first, game::Direction d, Room second) {
  first.x = 0, first.z = 0, first.doors = static_cast<uint8_t>(1u << d), first.depth = 0;
  second.x = static_cast<int8_t>(game::DIRECTION_X[d]), second.z = static_cast<int8_t>(game::DIRECTION_Z[d]), second.doors = static_cast<uint8_t>(1u << game::opposite(d)), second.depth = 1;
  return {{first, second}};
}

/**
 * 묻힌 방 메시의 충돌 상자로 — 틀마다, 돌림마다, 쪽마다: 문 자리의 포털이 방 가운데에서 걸어서 통하고, 건너편에서 넘어오면 그 문 안쪽의 바닥에 서고,
 * 문이 나지 않은 쪽은 (문 자리의 막음돌이든 틀의 벽이든) 막힌다
 */
void real_rooms(const game::RoomKit& kit) {
  expect(!kit.sealed.empty() && !kit.gate.empty() && std::none_of(kit.rooms.begin(), kit.rooms.end(), [](auto solids) { return solids.empty(); }),
         "방 틀 여섯과 막음돌·잠긴 문의 석판에 충돌 상자가 있다");
  constexpr Room HALL{.x = 0, .z = 0, .doors = 0, .shape = 1, .turn = 0, .depth = 0, .chargers = 0, .casters = 0};
  bool leaving = true, arriving = true, closed = true;
  int sites = 0;
  for (uint8_t shape = 0; shape < game::SHAPE_COUNT; shape++)
    for (uint8_t turn = 0; turn < 4; turn++)
      for (const game::Direction d : {game::NORTH, game::EAST, game::SOUTH, game::WEST}) {
        const Room room{.x = 0, .z = 0, .doors = 0, .shape = shape, .turn = turn, .depth = 0, .chargers = 0, .casters = 0};
        bool ok = true;
        if (room.site(d)) {
          sites++;
          // 나가기 — 방 가운데에서 그 쪽으로 걸으면 포털에 닿아 이웃 방에 선다
          World out(pair_of(room, d, HALL), kit);
          steps(out, 60);
          out.look(static_cast<float>(d) * PI / 2.0f, 0.0f);
          walk_through(out);
          ok = out.room() == 1;
          leaving = leaving && ok;
          // 들어오기 — 이웃 방(정사각 홀)에서 넘어오면 그 문 안쪽의 바닥에 선다: 넘기를 마친 틱에 한 걸음(0.1 m) 걸었고, 손을 뗀 뒤 0.45 m 를 미끄러졌다 (13.5 − 0.55)
          const game::Direction from = game::opposite(d);
          World in(pair_of(HALL, from, room), kit);
          steps(in, 60);
          in.look(static_cast<float>(from) * PI / 2.0f, 0.0f);
          walk_through(in);
          steps(in, 30);
          const engine::Vec3 at = in.player().position;
          ok = in.room() == 1 && near(along(at, d), 12.95f) && near(aside(at, d), 0.0f) && near(at.y, 1.6f) && in.grounded();
          arriving = arriving && ok;
        }
        // 문이 나지 않았으면 막힌다 — 그 쪽으로 걸어도 방 가운데에서 16 m 를 넘지 못하고 (막음돌 앞 15.85 m, 벽 앞 15.5 m, 팔이 없는 쪽은 더 가까이) 방이 바뀌지 않는다
        World shut({{room}}, kit);
        steps(shut, 60);
        shut.look(static_cast<float>(d) * PI / 2.0f, 0.0f);
        shut.move(1.0f, 0.0f);
        steps(shut, 400);
        shut.jump();
        steps(shut, 60);
        const engine::Vec3 stopped = shut.player().position;
        ok = shut.room() == 0 && !shut.in_transit() && along(stopped, d) < 15.86f && along(stopped, d) > 4.0f && stopped.y > 1.59f && near(aside(stopped, d), 0.0f, 0.01f);
        closed = closed && ok;
        if (!ok) std::printf("틀 %u 돌림 %u 쪽 %u 가 어긋난다\n", shape, turn, static_cast<unsigned>(d));
      }
  // 문 자리의 수: (4 + 4 + 2 + 2 + 4 + 3) × 돌림 4
  expect(sites == 76, "틀 여섯의 문 자리는 돌림마다 19 곳이다");
  expect(leaving, "모든 틀·돌림: 방 가운데에서 문 자리 쪽으로 걸으면 포털을 넘어 이웃 방에 선다");
  expect(arriving, "모든 틀·돌림: 포털을 넘어오면 그 문 안쪽 12.95 m 의 바닥에 선다 (눈높이 1.6, 문의 가운데 줄)");
  expect(closed, "모든 틀·돌림: 문이 나지 않은 쪽은 막힌다 (막음돌·벽) — 뛰어도 넘지 못한다");

  // 잠긴 포털 — 전투방에 들어서면 들어온 문으로 되돌아가지 못한다 (석판)
  Room fight = HALL;
  fight.chargers = fight.casters = 3;
  World world(pair_of(Room{.x = 0, .z = 0, .doors = 0, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0}, game::NORTH, fight), kit, 11);
  steps(world, 60);
  expect(near(world.player().position.y, 1.6f), "시작 방 가운데의 바닥에 선다");
  walk_through(world);
  expect(world.room() == 1 && world.locked() && world.enemies().size() == 6, "돌 아치 속의 포털로 걸어 들어가 전투방에 선다");
  world.look(PI, 0.0f);
  world.move(1.0f, 0.0f);
  steps(world, 120);
  expect(world.room() == 1 && !world.in_transit() && flat_distance(world.player().position, {}) < 15.7f, "잠긴 포털의 석판에 막힌다");
}

/** 길의 점 — 틀마다 한 덩어리로 이어져 있고, 이어진 점끼리는 시뮬레이션의 잣대로도 곧게 걸어갈 수 있고, 점마다 바닥 위의 빈 자리다 */
void navigation(const game::RoomKit& kit) {
  expect(kit.nav[0].empty() && kit.nav[1].size() == 9 && kit.nav[2].size() == 10 && kit.nav[3].size() == 5 && kit.nav[4].size() == 9 && kit.nav[5].size() == 7,
         "길의 점: 시작 방에는 없고(적이 없다), 정사각 홀 9, 긴 홀 10, ㄱ 자 5, 십자 9, T 자 7");
  bool linked = true, walkable = true, standing = true;
  for (uint8_t shape = 1; shape < game::SHAPE_COUNT; shape++)
    for (uint8_t turn = 0; turn < 4; turn++) {
      World world({{Room{.x = 0, .z = 0, .doors = 0, .shape = shape, .turn = turn, .depth = 0, .chargers = 0, .casters = 0}}}, kit);
      const std::span<const engine::NavNode> nav = world.nav();
      // 0 번 점에서 이음을 따라 모든 점에 닿는다
      uint32_t reached = 1;
      for (bool grew = true; grew;) {
        grew = false;
        for (std::size_t i = 0; i < nav.size(); i++)
          if ((reached >> i & 1u) && (nav[i].links & ~reached)) reached |= nav[i].links, grew = true;
      }
      linked = linked && nav.size() == kit.nav[shape].size() && reached == (1u << nav.size()) - 1u;
      for (std::size_t i = 0; i < nav.size(); i++) {
        const engine::Vec3 at = node_at(nav[i]);
        // 돌려 놓은 자리 — 틀의 점을 돌림만큼 돌린 것
        const engine::Vec3 turned = game::turned(node_at(kit.nav[shape][i]), static_cast<game::Direction>(turn));
        standing = standing && at.x == turned.x && at.z == turned.z && std::fabs(at.x) < 16.0f && std::fabs(at.z) < 16.0f;
        // 발밑에 바닥이 있고, 적의 몸(반폭 0.6, 높이 2.4)이 설 자리가 비어 있다
        standing = standing && world.stage().overlaps({{at.x - 0.1f, at.y - 0.3f, at.z - 0.1f}, {at.x + 0.1f, at.y - 0.05f, at.z + 0.1f}}) &&
                   !world.stage().overlaps({{at.x - 0.6f, at.y + 0.02f, at.z - 0.6f}, {at.x + 0.6f, at.y + 2.4f, at.z + 0.6f}});
        for (std::size_t j = 0; j < nav.size(); j++)
          if (nav[i].links >> j & 1u) walkable = walkable && world.walk_clear(at, node_at(nav[j]), game::CHARGER.half_width);
      }
    }
  expect(linked, "모든 틀·돌림: 길의 점이 한 덩어리로 이어져 있다");
  expect(walkable, "모든 틀·돌림: 이어진 점끼리는 곧게 걸어갈 수 있다 (시뮬레이션의 잣대로도)");
  expect(standing, "모든 틀·돌림: 길의 점은 틀과 함께 돌고, 바닥 위의 빈 자리다");

  // 모퉁이 너머는 곧게 걸어갈 수 없다 — ㄱ 자의 북쪽 팔 (0, -12) 과 동쪽 팔 (12, 0) 사이에 안쪽 모퉁이 (6, -6) 가 있다 (선분이 x 6 을 지나는 자리 z -6 … 벽 속)
  const auto room_of = [&](uint8_t shape) { return World({{Room{.x = 0, .z = 0, .doors = 0, .shape = shape, .turn = 0, .depth = 0, .chargers = 0, .casters = 0}}}, kit); };
  const World ell = room_of(3), cross = room_of(4), tee = room_of(5), hall = room_of(1);
  expect(!ell.walk_clear({0.0f, 0.0f, -12.0f}, {12.0f, 0.0f, 0.0f}, 0.6f) && ell.walk_clear({0.0f, 0.0f, -12.0f}, {0.0f, 0.0f, 0.0f}, 0.6f) && ell.walk_clear({0.0f, 0.0f, 0.0f}, {12.0f, 0.0f, 0.0f}, 0.6f) &&
             !(ell.nav()[0].links >> 4 & 1u) && (ell.nav()[0].links >> 1 & 1u),
         "ㄱ 자: 두 팔의 끝은 서로 보이지 않고 (길의 점도 이어지지 않는다), 모퉁이를 거쳐서는 이어진다");
  expect(!cross.walk_clear({0.0f, 0.0f, -12.5f}, {12.5f, 0.0f, 0.0f}, 0.6f) && cross.walk_clear({0.0f, 0.0f, -12.5f}, {0.0f, 0.0f, 12.5f}, 0.6f) && !tee.walk_clear({-12.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 12.0f}, 0.6f) &&
             tee.walk_clear({-12.0f, 0.0f, 0.0f}, {12.0f, 0.0f, 0.0f}, 0.6f),
         "십자·T 자: 이웃한 팔의 끝끼리는 보이지 않고, 마주 보는 팔은 가운데를 지나 보인다 (십자 가운데의 0.4 m 단은 걸어 오른다 — 막지 않는다)");
  // 기둥 뒤 — 정사각 홀의 기둥(가운데 (8.5, 8.5), 밑돌 반폭 1.5)을 지나는 선분은 막힌다
  expect(!hall.walk_clear({4.0f, 0.0f, 4.0f}, {13.0f, 0.0f, 13.0f}, 0.6f) && hall.walk_clear({0.0f, 0.0f, 0.0f}, {11.5f, 0.0f, 0.0f}, 0.6f), "정사각 홀: 기둥을 지나는 길은 막힌다");
}

/** 방에 닿았을 때 적이 나오는 자리 — 틀·돌림·시드마다: 방 안의 바닥 위, 벽·기둥 속이 아니고, 플레이어에게서 8 m 밖, 서로 2 m 밖 */
void spawns(const game::RoomKit& kit) {
  bool inside = true, apart = true, settled = true;
  int rooms = 0, fallbacks = 0;
  for (uint8_t shape = 1; shape < game::SHAPE_COUNT; shape++)
    for (uint8_t turn = 0; turn < 4; turn++)
      for (uint32_t index = 1; index <= 12; index++) {
        // 작은 시드끼리는 xorshift 의 첫 값들이 비슷하다 — 고르게 흩은 시드를 쓴다
        const uint32_t seed = index * 2654435761u;
        const Room room{.x = 0, .z = 0, .doors = 0, .shape = shape, .turn = turn, .depth = 1, .chargers = 3, .casters = 3};
        // 그 방의 첫 문 자리로 들어간다
        game::Direction door = game::NORTH;
        while (!room.site(door)) door = static_cast<game::Direction>(door + 1);
        World world(pair_of(Room{.x = 0, .z = 0, .doors = 0, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0}, game::opposite(door), room), kit, seed);
        steps(world, 60);
        world.look(static_cast<float>(game::opposite(door)) * PI / 2.0f, 0.0f);
        // 방이 바뀐 바로 그 틱까지만 — 적이 나온 자리를 그대로 본다
        world.move(1.0f, 0.0f);
        for (int i = 0; i < 600 && world.room() == 0; i++) world.step();
        world.move(0.0f, 0.0f);
        rooms++;
        const std::span<const Enemy> enemies = world.enemies();
        inside = inside && world.room() == 1 && enemies.size() == 6;
        const engine::Vec3 feet{world.player().position.x, 0.0f, world.player().position.z};
        for (std::size_t i = 0; i < enemies.size(); i++) {
          const Enemy& enemy = enemies[i];
          const bool fallback = enemy.position.x == 0.0f && enemy.position.z == 0.0f;
          fallbacks += fallback;
          const engine::Aabb body = game::enemy_box(enemy);
          inside = inside && !world.stage().overlaps(body) && std::fabs(enemy.position.x) < 16.0f && std::fabs(enemy.position.z) < 16.0f && enemy.position.y > 1.0f && enemy.position.y < 1.6f;
          if (fallback) continue;
          apart = apart && flat_distance(enemy.position, feet) >= 8.0f;
          for (std::size_t j = 0; j < i; j++) apart = apart && flat_distance(enemy.position, enemies[j].position) >= 2.0f;
        }
        // 그 뒤 5 초 — 모두 방 안의 바닥 언저리에 있다: 바닥(0), 십자의 단(0.4 m), 걷다가 떨어지며 올라선 기둥의 밑돌(0.7 m) 위. 방 밖으로 떨어진 적은 없다
        for (int i = 0; i < 300; i++) {
          world.step();
          for (const Enemy& enemy : world.enemies())
            settled = settled && (i < 30 || enemy.position.y < 0.71f) && enemy.position.y > -0.01f && std::fabs(enemy.position.x) < 16.0f && std::fabs(enemy.position.z) < 16.0f;
        }
      }
  expect(rooms == 240 && inside, "틀 다섯 × 돌림 넷 × 시드 12: 적 여섯이 방 안의 빈 자리(벽·기둥 속이 아니다) 위 1.1 m 에 나온다");
  expect(apart, "나온 자리는 플레이어에게서 8 m 밖, 서로 2 m 밖이다");
  expect(settled, "나온 적은 반 초 안에 방의 바닥에 내려서고, 5 초 동안 방 밖으로 떨어지지 않는다");
  expect(fallbacks == 0, "자리를 못 찾아 방 가운데에 나온 적은 없다");
}

/**
 * 볼록하지 않은 방 — 모퉁이 뒤에서 나온 적이 길의 점을 따라 돌아와 공격한다. 플레이어는 들어온 문 안쪽에 서 있기만 한다.
 * 가장 먼 팔의 끝에서 플레이어까지 길은 30 m 안이다 — 원거리형(초당 3 m)도 10 초면 닿는다. 넉넉히 15 초(900 틱)를 준다
 */
void corners(const game::RoomKit& kit) {
  struct Case {
    uint8_t shape;
    uint8_t turn;
    const char* what;
  };
  // 모두 남쪽 문으로 들어선다: 두 번 돌린 ㄱ 자(남쪽 팔과 서쪽 팔), 십자, 한 번 돌린 T 자(가로대가 남북, 다리가 서쪽)
  const Case cases[] = {{3, 2, "ㄱ 자"}, {4, 0, "십자"}, {5, 1, "T 자"}};
  for (const Case& c : cases)
    for (const EnemyKind kind : {EnemyKind::charger, EnemyKind::caster}) {
      int hidden = 0, attacked = 0, routed = 0;
      for (uint32_t index = 1; index <= 40; index++) {
        const uint32_t seed = index * 2654435761u;
        Room start = START;
        start.doors = N;
        const bool charger = kind == EnemyKind::charger;
        World world(Floor{{start, {.x = 0, .z = -1, .doors = S, .shape = c.shape, .turn = c.turn, .depth = 1, .chargers = static_cast<uint8_t>(charger), .casters = static_cast<uint8_t>(!charger)}}}, kit, seed);
        steps(world, 60);
        // 방이 바뀐 바로 그 틱에 본다 — 플레이어(남쪽 문 안쪽 13.5 m)가 곧게 보이지 않는 자리에 나온 적만 센다
        world.move(1.0f, 0.0f);
        for (int i = 0; i < 600 && world.room() == 0; i++) world.step();
        world.move(0.0f, 0.0f);
        const engine::Vec3 feet{world.player().position.x, 0.0f, world.player().position.z};
        const engine::Vec3 born{world.enemies()[0].position.x, 0.0f, world.enemies()[0].position.z};
        if (world.walk_clear(born, feet, game::traits(kind).half_width)) continue;
        hidden++;
        bool went = false, struck = false;
        const uint64_t events = world.event_count();
        for (int i = 0; i < 900 && !struck; i++) {
          world.step();
          went = went || (!world.enemies().empty() && world.enemies()[0].routing);
          for (uint64_t at = events; at < world.event_count(); at++)
            if (const auto event = world.event(at); event && (event->kind == (charger ? WorldEvent::Kind::charge : WorldEvent::Kind::bolt))) struck = true;
        }
        routed += went;
        attacked += struck;
      }
      // 가려진 자리에서 나온 적은 모두 공격에 이른다. 길의 점을 따라 도는 것은 그 대부분이다: 나온 자리가 시야의 가장자리면 떨어져 내려서는 사이(와 플레이어가 미끄러져 서는 사이)에
      // 길이 트여 곧게 온다. 원거리형은 걸어갈 길이 막혀 있어도 투사체의 길(어깨 높이의 광선 하나)이 트여 있으면 돌아가지 않고 바로 쏜다
      const bool ok = hidden >= 5 && attacked == hidden && (kind == EnemyKind::charger ? routed * 4 >= hidden * 3 : routed >= 1);
      if (!ok) std::printf("%s %s: 가려진 자리 %d, 돌아간 적 %d, 공격한 적 %d\n", c.what, kind == EnemyKind::charger ? "돌진형" : "원거리형", hidden, routed, attacked);
      expect(ok, "모퉁이 뒤에서 나온 적은 길의 점을 따라 돌아와 15 초 안에 공격한다 (돌진·투사체) — 시드 40 개 가운데 가려진 자리마다");
    }

  // 공격은 길이 트였을 때만 시작한다 — 모퉁이 뒤의 적은 예고도 모으기도 하지 않는다. 같은 시드는 같은 길을 간다 (결정적)
  for (const EnemyKind kind : {EnemyKind::charger, EnemyKind::caster}) {
    bool patient = true, same = true;
    int seen = 0;
    for (uint32_t index = 1; index <= 40 && seen < 5; index++) {
      const uint32_t seed = index * 2654435761u;
      Room start = START;
      start.doors = N;
      const bool charger = kind == EnemyKind::charger;
      const Floor floor{{start, {.x = 0, .z = -1, .doors = S, .shape = 3, .turn = 2, .depth = 1, .chargers = static_cast<uint8_t>(charger), .casters = static_cast<uint8_t>(!charger)}}};
      World world(floor, kit, seed), twin(floor, kit, seed);
      for (World* w : {&world, &twin}) {
        steps(*w, 60);
        w->move(1.0f, 0.0f);
        for (int i = 0; i < 600 && w->room() == 0; i++) w->step();
        w->move(0.0f, 0.0f);
      }
      const engine::Vec3 feet{world.player().position.x, 0.0f, world.player().position.z};
      if (world.walk_clear({world.enemies()[0].position.x, 0.0f, world.enemies()[0].position.z}, feet, game::traits(kind).half_width)) continue;
      seen++;
      for (int i = 0; i < 600; i++) {
        world.step();
        twin.step();
        if (world.enemies().empty() || twin.enemies().empty()) break;
        const Enemy &enemy = world.enemies()[0], &other = twin.enemies()[0];
        same = same && enemy.position.x == other.position.x && enemy.position.z == other.position.z && enemy.act == other.act && enemy.yaw == other.yaw;
        // 돌아가는 틱에는 공격을 시작하지 않는다 (걷거나 쉬는 중이다)
        if (enemy.routing) patient = patient && (enemy.act == Enemy::Act::roam || enemy.act == Enemy::Act::recover);
      }
      same = same && world.player().health == twin.player().health && world.event_count() == twin.event_count();
    }
    expect(seen == 5 && patient, "가려진 적은 공격을 시작하지 않는다 — 길이 트인 뒤에만 예고·모으기를 한다");
    expect(same, "길 찾기는 결정적이다 — 같은 시드의 두 세계에서 적이 틱마다 같은 자리에 있다");
  }
}

}  // namespace

int main() {
  rhythm();
  pistol();
  dash_and_jump();
  inertia();
  dungeon();
  rooms();
  arrival();
  whole_floor();
  streak();
  charger();
  caster();
  events();
  judgement();
  judge();
  determinism();
  input();
  walking();
  const auto meshes = game::RoomMeshes::decode();
  expect(meshes.has_value(), "방 메시 에셋이 풀린다");
  if (meshes) {
    const game::RoomKit kit = meshes->kit();
    real_rooms(kit);
    navigation(kit);
    spawns(kit);
    corners(kit);
  }
  if (failures == 0) std::printf("sim_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
