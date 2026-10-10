#include "gameplay/simulation/world.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>
#include <utility>

namespace game {
namespace {

constexpr float PITCH_LIMIT = 1.5f;
// 총알이 닿는 거리 — 사거리 제한은 없다: 방보다 길다
constexpr float FIRE_REACH = 1000.0f;

// 플레이어의 몸 — 발에서 머리까지, 가로 반폭
constexpr float BODY_HEIGHT = 1.7f;
constexpr float BODY_HALF_WIDTH = 0.3f;
constexpr float GRAVITY = 24.0f;
// 뛰어오르는 빠르기 — 1.27 m 까지 오른다, 40 틱(0.67 초) 떠 있다 (창턱 3.5 m 와 천장 9 m 에 닿지 않는다)
constexpr float JUMP_SPEED = 8.0f;
// 방 가운데 위, 떨어져 내려 서는 높이 — 처음 설 때와 층 밖으로 떨어졌다 돌아올 때
constexpr float DROP_HEIGHT = 1.2f;
// 가던 쪽과 맞서 걷는다고 보는 문턱 — 속도와 걸으려는 속도의 내적 (m²/s²)
constexpr float AGAINST = 1e-3f;
constexpr float FALL_LIMIT = -40.0f;

// 적이 나오는 자리 — 길의 점 하나에서 이 안쪽(그 점에서 곧게 걸어갈 수 있는 자리 — 벽 속이나 방 밖이 아니다), 플레이어에게서 이만큼 떨어져, 서로 이만큼 떨어져, 이 높이에서 떨어져 내려 선다.
// 길의 점이 없는 틀이면 방 가운데에서 SPAWN_REACH 안쪽
constexpr float SPAWN_SPREAD = 3.0f;
constexpr float SPAWN_REACH = 12.0f;
constexpr float SPAWN_CLEARANCE = 8.0f;
constexpr float SPAWN_SPACING = 2.0f;
constexpr float SPAWN_HEIGHT = 1.1f;
constexpr int SPAWN_ATTEMPTS = 32;
// 돌진형이 다가와 멈추는 거리, 적끼리 서로 비켜서는 거리
constexpr float CHARGER_STOP = 1.6f;
constexpr float ENEMY_SPACING = 1.6f;
// 돌진이 플레이어에 닿는 여유 (몸의 반폭들에 더한다)
constexpr float CHARGE_TOUCH = 0.2f;
// 투사체가 나오는 높이(적의 발에서)와 겨누는 자리(플레이어의 눈에서 아래로)
constexpr float BOLT_MUZZLE = 1.5f;
constexpr float BOLT_AIM_BELOW = 0.5f;
// 곧게 걸어갈 수 있는지 보는 광선 — 발에서 이 높이(걸어 오르는 턱 0.5 m 보다 높다), 몸의 반폭의 이 몫만큼 양옆으로 (벽에 붙어 선 몸의 광선이 그 벽 속에서 떠나지 않게 조금 안쪽)
constexpr float WALK_SIGHT_HEIGHT = 0.7f;
constexpr float WALK_SIGHT_SIDE = 0.8f;
// 길의 점에 이만큼 다가가면 닿은 것으로 치고 다음 점으로 간다
constexpr float NODE_REACHED = 0.75f;
constexpr float UNREACHABLE = 1e30f;

constexpr bool overlap(const engine::Aabb& a, const engine::Aabb& b) {
  return a.min.x < b.max.x && b.min.x < a.max.x && a.min.y < b.max.y && b.min.y < a.max.y && a.min.z < b.max.z && b.min.z < a.max.z;
}

float flat_length(engine::Vec3 v) { return std::sqrt(v.x * v.x + v.z * v.z); }
/** 수평 속도 v 를 target 쪽으로 step 만큼 옮긴다 — 그 안에 닿으면 target 이 된다 (소수 오차만큼 못 미친 것도 닿은 것으로 친다: 설 때 한 틱 더 끌지 않는다) */
engine::Vec3 approach(engine::Vec3 v, engine::Vec3 target, float step) {
  constexpr float SNAP = 1e-4f;
  const engine::Vec3 gap{target.x - v.x, 0.0f, target.z - v.z};
  const float length = flat_length(gap);
  return length <= step + SNAP ? target : v + gap * (step / length);
}
/** 그 수평 방향을 보는 yaw — 앞은 (sin, -cos) */
float yaw_toward(engine::Vec3 direction) { return std::atan2(direction.x, -direction.z); }

}  // namespace

World::World(uint32_t seed, const RoomKit& kit) : kit_(&kit), rng_(seed), floor_(generate_floor(rng_)) { begin(); }

World::World(Floor floor, const RoomKit& kit, uint32_t seed) : kit_(&kit), rng_(seed), floor_(std::move(floor)) { begin(); }

void World::begin() {
  visited_.assign(floor_.rooms.size(), false);
  cleared_.resize(floor_.rooms.size());
  for (std::size_t i = 0; i < floor_.rooms.size(); i++) cleared_[i] = floor_.rooms[i].chargers + floor_.rooms[i].casters == 0;
  player_.position = {0.0f, DROP_HEIGHT + EYE_HEIGHT, 0.0f};
  load_room();
}

// 지금 방을 올린다 — 돌려 놓은 틀과, 문이 나지 않은 문 자리의 막음돌이 세계의 전부다. 앞 방의 것(충돌 상자·길의 점·적·투사체)은 남지 않는다
void World::load_room() {
  const Room& room = floor_.rooms[room_];
  const Direction turn = static_cast<Direction>(room.turn % 4);
  std::vector<engine::Aabb> solids;
  solids.reserve(kit_->rooms[room.shape].size() + 4 * kit_->sealed.size());
  for (const engine::Aabb& box : kit_->rooms[room.shape]) solids.push_back(turned(box, turn));
  for (const Direction d : {NORTH, EAST, SOUTH, WEST})
    if (room.site(d) && !room.door(d))
      for (const engine::Aabb& box : kit_->sealed) solids.push_back(turned(box, d));
  stage_.build(solids);
  nav_.assign(kit_->nav[room.shape].begin(), kit_->nav[room.shape].end());
  for (engine::NavNode& node : nav_) {
    const engine::Vec3 at = turned(engine::Vec3{node.position[0], node.position[1], node.position[2]}, turn);
    node.position[0] = at.x, node.position[1] = at.y, node.position[2] = at.z;
  }
  route_cost_.assign(nav_.size(), UNREACHABLE);
  route_tick_ = ~0ull;
  gates_.clear();
  enemies_.clear();
  projectiles_.clear();
  opened_tick_.reset();
  visited_[room_] = true;
  if (!cleared_[room_]) lock_room();
}

float World::random_unit() { return static_cast<float>(rng_.next() >> 8) / 16777216.0f; }

uint32_t World::rooms_total() const {
  return static_cast<uint32_t>(std::count_if(floor_.rooms.begin(), floor_.rooms.end(), [](const Room& room) { return room.chargers + room.casters > 0; }));
}

uint32_t World::rooms_cleared() const {
  uint32_t count = 0;
  for (std::size_t i = 0; i < floor_.rooms.size(); i++)
    if (cleared_[i] && floor_.rooms[i].chargers + floor_.rooms[i].casters > 0) count++;
  return count;
}

void World::step() {
  if (outcome_ != Outcome::playing) return;
  tick_++;
  if (in_transit()) {
    // 포털을 넘는 중 — 박자만 간다. 화면이 가장 가려지는 한가운데에서 방이 바뀐다. 기억해 둔 행동은 버린다
    pending_.reset();
    if (tick_ - *portal_tick_ == TRANSIT_SWAP) arrive();
    return;
  }
  release_pending();
  walk_player();
  enter_portal();
  step_enemies();
  step_projectiles();
}

void World::move(float forward, float strafe) {
  if (!std::isfinite(forward) || !std::isfinite(strafe)) return;
  move_forward_ = std::clamp(forward, -1.0f, 1.0f);
  move_strafe_ = std::clamp(strafe, -1.0f, 1.0f);
}

void World::jump() { jump_ = grounded_ && !in_transit(); }

void World::look(float delta_yaw, float delta_pitch) {
  if (!std::isfinite(delta_yaw) || !std::isfinite(delta_pitch)) return;
  player_.yaw = std::remainder(player_.yaw + delta_yaw, 2.0f * std::numbers::pi_v<float>);
  player_.pitch = std::clamp(player_.pitch + delta_pitch, -PITCH_LIMIT, PITCH_LIMIT);
}

bool World::fits(const Body& body, engine::Vec3 feet) const {
  const engine::Aabb box{{feet.x - body.half_width, feet.y, feet.z - body.half_width}, {feet.x + body.half_width, feet.y + body.height, feet.z + body.half_width}};
  if (stage_.overlaps(box)) return false;
  return std::none_of(gates_.begin(), gates_.end(), [&](const engine::Aabb& gate) { return overlap(box, gate); });
}

// 가로는 축마다 따로 옮겨 벽을 따라 미끄러지고, 낮은 턱은 걸어서 오른다
World::Moved World::advance(Body& body, float dx, float dz) const {
  const float dt = static_cast<float>(TICK);
  const auto go = [&](engine::Vec3 to) {
    if (fits(body, to)) {
      body.feet = to;
      return true;
    }
    if (!body.grounded || !fits(body, {to.x, to.y + STEP_HEIGHT, to.z})) return false;
    // 턱을 오른다 — 턱의 윗면에 바로 선다 (STEP_HEIGHT 만큼 떴다가 떨어지지 않는다: 낮은 턱마다 공중에 떴다 내려서는 일이 생기지 않게)
    float blocked = to.y, free = to.y + STEP_HEIGHT;
    for (int i = 0; i < 10; i++) {
      const float middle = (blocked + free) * 0.5f;
      if (fits(body, {to.x, middle, to.z})) free = middle;
      else blocked = middle;
    }
    body.feet = {to.x, free, to.z};
    return true;
  };
  Moved moved;
  if (dx != 0.0f) moved.x = go({body.feet.x + dx, body.feet.y, body.feet.z});
  if (dz != 0.0f) moved.z = go({body.feet.x, body.feet.y, body.feet.z + dz});

  body.impact = 0.0f;
  body.fall_speed -= GRAVITY * dt;
  const float next = body.feet.y + body.fall_speed * dt;
  if (fits(body, {body.feet.x, next, body.feet.z})) {
    body.feet.y = next;
    body.grounded = false;
  } else {
    // 바닥(뛰어오르는 중이면 머리 위)에 닿았다 — 겹치지 않는 가장 가까운 자리를 좁혀 찾는다
    float blocked = next, free = body.feet.y;
    for (int i = 0; i < 8; i++) {
      const float middle = (blocked + free) * 0.5f;
      if (fits(body, {body.feet.x, middle, body.feet.z})) free = middle;
      else blocked = middle;
    }
    body.feet.y = free;
    body.grounded = body.fall_speed < 0.0f;
    if (body.grounded) body.impact = -body.fall_speed;
    body.fall_speed = 0.0f;
  }
  return moved;
}

// 수평 속도를 먼저 정하고(대시의 곡선, 땅의 가속·마찰, 공중의 약한 제어) 그 속도로 옮긴다. 벽에 막힌 축의 속도는 사라지고 다른 축은 남는다
void World::walk_player() {
  const float dt = static_cast<float>(TICK);
  Body body{{player_.position.x, player_.position.y - EYE_HEIGHT, player_.position.z}, BODY_HALF_WIDTH, BODY_HEIGHT, fall_speed_, grounded_};

  // 걸으려는 쪽 — 길이는 1 까지 (대각선으로 걸어도 빠르기는 같다). 앞은 (sin, -cos), 오른쪽은 (cos, sin)
  const float pressed = std::sqrt(move_forward_ * move_forward_ + move_strafe_ * move_strafe_);
  const float sin_yaw = std::sin(player_.yaw), cos_yaw = std::cos(player_.yaw);
  const engine::Vec3 heading = pressed > 0.0f ? engine::Vec3{sin_yaw * move_forward_ + cos_yaw * move_strafe_, 0.0f, -cos_yaw * move_forward_ + sin_yaw * move_strafe_} * (1.0f / pressed)
                                              : engine::Vec3{};
  const engine::Vec3 wish = heading * (WALK_SPEED * std::min(pressed, 1.0f));

  const bool dashing = dash_left_ > 0;
  if (dashing) {
    velocity_ = dash_direction_ * dash_speed(DASH_TICKS - dash_left_ + 1);
    dash_left_--;
  } else if (body.grounded) {
    // 가던 쪽과 맞서 걸으면 마찰이 가속을 거든다 (서 있는 것과 다름없는 소수 오차의 속도는 맞서는 것으로 치지 않는다). 걸음을 멈추면 마찰만으로 선다
    const bool against = velocity_.x * wish.x + velocity_.z * wish.z < -AGAINST;
    velocity_ = approach(velocity_, wish, (pressed > 0.0f ? GROUND_ACCEL + (against ? GROUND_FRICTION : 0.0f) : GROUND_FRICTION) * dt);
  } else if (pressed > 0.0f) {
    // 공중 — 걸으려는 쪽의 빠르기가 모자란 만큼만 조금씩 보탠다. 그래서 빨라지지는 않는다 (옆으로 틀며 속도를 불리지 못한다)
    const float before = flat_length(velocity_);
    const float add = std::min(AIR_ACCEL * dt, flat_length(wish) - (velocity_.x * heading.x + velocity_.z * heading.z));
    if (add > 0.0f) {
      velocity_ = velocity_ + heading * add;
      const float limit = std::max(before, WALK_SPEED), speed = flat_length(velocity_);
      if (speed > limit) velocity_ = velocity_ * (limit / speed);
    }
  }
  if (jump_ && body.grounded) {
    body.fall_speed = JUMP_SPEED;
    body.grounded = false;
    jumped_tick_ = tick_;
    emit(WorldEvent::Kind::jumped);
    if (dashing) {
      // 대시 중에 뛰었다 — 대시는 여기서 끝나고, 그 속도를 (상한까지) 싣고 뛴다
      dash_left_ = 0;
      if (const float speed = flat_length(velocity_); speed > DASH_JUMP_SPEED) velocity_ = velocity_ * (DASH_JUMP_SPEED / speed);
    }
  }
  jump_ = false;

  const bool airborne = !body.grounded;
  const Moved moved = advance(body, velocity_.x * dt, velocity_.z * dt);
  if (!moved.x) velocity_.x = 0.0f;
  if (!moved.z) velocity_.z = 0.0f;
  if (body.feet.y < FALL_LIMIT) {
    // 방 밖으로 떨어졌다 — 방 가운데 위로 돌아온다 (가던 속도는 버린다)
    body.feet = {0.0f, DROP_HEIGHT, 0.0f};
    body.fall_speed = 0.0f;
    body.grounded = false;
    velocity_ = {};
    dash_left_ = 0;
  }
  player_.position = {body.feet.x, body.feet.y + EYE_HEIGHT, body.feet.z};
  fall_speed_ = body.fall_speed;
  grounded_ = body.grounded;
  if (airborne && body.grounded) {
    landed_tick_ = tick_;
    landing_speed_ = body.impact;
    emit(WorldEvent::Kind::landed);
  }
}

// 열린 포털에 몸이 닿았는가 — 포털 면은 문이 난 쪽으로 방 가운데에서 ROOM_HALF 떨어져 서 있다. 닿으면 넘기 시작한다
void World::enter_portal() {
  // 잠긴 방의 포털은 닫혀 있다 (석판이 막는다). 바닥 아래로 떨어지는 중에는 닿지 않는다
  if (in_combat() || player_.position.y < 0.0f) return;
  const Room& room = floor_.rooms[room_];
  for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
    if (!room.door(d)) continue;
    const float x = static_cast<float>(DIRECTION_X[d]), z = static_cast<float>(DIRECTION_Z[d]);
    // 그 문 쪽으로 나아간 거리와 문의 가운데에서 옆으로 벗어난 거리
    const float along = player_.position.x * x + player_.position.z * z, aside = player_.position.x * z - player_.position.z * x;
    if (along < ROOM_HALF - BODY_HALF_WIDTH || std::fabs(aside) > DOOR_HALF_WIDTH) continue;
    portal_tick_ = tick_;
    portal_side_ = d;
    emit(WorldEvent::Kind::portal);
    return;
  }
}

// 포털 너머의 방으로 — 지금 방을 내리고 이웃 방을 올린다. 넘어온 포털(맞은편 문)의 안쪽에, 옆 자리와 높이와 보는 쪽은 그대로 두고 선다
void World::arrive() {
  const Room& from = floor_.rooms[room_];
  room_ = *floor_.at(from.x + DIRECTION_X[portal_side_], from.z + DIRECTION_Z[portal_side_]);
  constexpr float INSIDE = ROOM_HALF - ARRIVAL_DEPTH;
  if (DIRECTION_X[portal_side_]) player_.position.x = static_cast<float>(-DIRECTION_X[portal_side_]) * INSIDE;
  else player_.position.z = static_cast<float>(-DIRECTION_Z[portal_side_]) * INSIDE;
  // 넘기 전의 속도를 지니고 선다 (걷던 쪽으로 그대로 걸어 나온다) — 대시는 끝나고, 걷는 빠르기까지만
  dash_left_ = 0;
  if (const float speed = flat_length(velocity_); speed > WALK_SPEED) velocity_ = velocity_ * (WALK_SPEED / speed);
  emit(WorldEvent::Kind::arrived);
  load_room();
}

// 전투방에 처음 닿았다 — 문이 잠기고 적이 나온다. 적은 잠깐(ARRIVAL_GRACE) 공격을 시작하지 않는다
void World::lock_room() {
  const Room& room = floor_.rooms[room_];
  for (const Direction d : {NORTH, EAST, SOUTH, WEST})
    if (room.door(d))
      for (const engine::Aabb& box : kit_->gate) gates_.push_back(turned(box, d));
  attack_at_ = tick_ + ARRIVAL_GRACE;

  const engine::Vec3 feet{player_.position.x, 0.0f, player_.position.z};
  for (uint32_t i = 0; i < static_cast<uint32_t>(room.chargers) + room.casters; i++) {
    const EnemyKind kind = i < room.chargers ? EnemyKind::charger : EnemyKind::caster;
    const EnemyTraits& t = traits(kind);
    // 자리를 못 찾으면 방 가운데 위에 나온다 — 방 틀은 가운데의 이 높이를 비워 둔다
    engine::Vec3 at{0.0f, SPAWN_HEIGHT, 0.0f};
    for (int attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
      // 길의 점 하나를 뽑아 그 둘레에 — 그 점에서 곧게 걸어갈 수 있는 자리만 (벽 너머나 방 밖에 나오지 않는다)
      engine::Vec3 anchor{}, spot{};
      if (nav_.empty()) {
        spot = {(random_unit() * 2.0f - 1.0f) * SPAWN_REACH, SPAWN_HEIGHT, (random_unit() * 2.0f - 1.0f) * SPAWN_REACH};
      } else {
        const engine::NavNode& node = nav_[rng_.below(static_cast<uint32_t>(nav_.size()))];
        anchor = {node.position[0], node.position[1], node.position[2]};
        spot = {anchor.x + (random_unit() * 2.0f - 1.0f) * SPAWN_SPREAD, anchor.y + SPAWN_HEIGHT, anchor.z + (random_unit() * 2.0f - 1.0f) * SPAWN_SPREAD};
        // 그 자리의 바닥에 설 수 있어야 한다 (기둥의 밑돌이나 바위 위에 내려서지 않는다)
        if (!walk_clear(anchor, {spot.x, anchor.y, spot.z}, t.half_width) || !fits({spot, t.half_width, t.height, 0.0f, false}, {spot.x, anchor.y + 0.02f, spot.z})) continue;
      }
      if (flat_length(spot - feet) < SPAWN_CLEARANCE || !fits({spot, t.half_width, t.height, 0.0f, false}, spot)) continue;
      if (std::any_of(enemies_.begin(), enemies_.end(), [&](const Enemy& other) { return flat_length(spot - other.position) < SPAWN_SPACING; })) continue;
      at = spot;
      break;
    }
    enemies_.push_back({.kind = kind, .position = at, .yaw = yaw_toward(feet - at), .health = t.health});
  }
  emit(WorldEvent::Kind::locked);
}

bool World::walk_clear(engine::Vec3 from, engine::Vec3 to, float half_width) const {
  const engine::Vec3 gap{to.x - from.x, 0.0f, to.z - from.z};
  const float length = flat_length(gap);
  if (length < 1e-3f) return true;
  const engine::Vec3 along = gap * (1.0f / length);
  const float aside = half_width * WALK_SIGHT_SIDE;
  for (const float side : {-aside, aside}) {
    const engine::Ray ray{{from.x - along.z * side, from.y + WALK_SIGHT_HEIGHT, from.z + along.x * side}, along};
    if (stage_.raycast(ray, length)) return false;
  }
  return true;
}

// 플레이어가 곧게 닿는 점들에서 시작해 이음을 따라 길이를 편다 (점이 많아야 32 개 — 더 줄지 않을 때까지 되풀이)
void World::plan_routes(engine::Vec3 feet) {
  route_tick_ = tick_;
  const auto at = [&](std::size_t i) { return engine::Vec3{nav_[i].position[0], nav_[i].position[1], nav_[i].position[2]}; };
  for (std::size_t i = 0; i < nav_.size(); i++) route_cost_[i] = walk_clear(at(i), feet, CHARGER.half_width) ? flat_length(feet - at(i)) : UNREACHABLE;
  for (bool shorter = true; shorter;) {
    shorter = false;
    for (std::size_t i = 0; i < nav_.size(); i++)
      for (std::size_t j = 0; j < nav_.size(); j++) {
        if (!(nav_[i].links >> j & 1u) || route_cost_[j] >= UNREACHABLE) continue;
        const float through = route_cost_[j] + flat_length(at(j) - at(i));
        if (through < route_cost_[i]) {
          route_cost_[i] = through;
          shorter = true;
        }
      }
  }
}

engine::Vec3 World::route_target(const Enemy& enemy) const {
  const EnemyTraits& t = traits(enemy.kind);
  float best = UNREACHABLE, nearest = UNREACHABLE;
  engine::Vec3 target = enemy.position, fallback = enemy.position;
  for (std::size_t i = 0; i < nav_.size(); i++) {
    const engine::Vec3 node{nav_[i].position[0], nav_[i].position[1], nav_[i].position[2]};
    const float distance = flat_length(node - enemy.position);
    if (distance < nearest) nearest = distance, fallback = node;
    // 이미 닿은 점은 건너뛴다 (그 다음 점으로 간다)
    if (distance < NODE_REACHED || route_cost_[i] >= UNREACHABLE || distance + route_cost_[i] >= best || !walk_clear(enemy.position, node, t.half_width)) continue;
    best = distance + route_cost_[i];
    target = node;
  }
  return best < UNREACHABLE ? target : fallback;
}

void World::step_enemies() {
  const float dt = static_cast<float>(TICK);
  const engine::Vec3 feet{player_.position.x, player_.position.y - EYE_HEIGHT, player_.position.z};
  // 종류마다 지금 공격 중인 수 — 토큰이 남아야 새 공격이 시작된다
  uint32_t busy[2]{};
  for (const Enemy& enemy : enemies_)
    if (enemy.act == Enemy::Act::windup || enemy.act == Enemy::Act::charge) busy[static_cast<int>(enemy.kind)]++;
  // 방에 막 닿았을 때는 공격을 시작하지 않는다
  const bool head = beat_head(tick_) && tick_ >= attack_at_;

  for (Enemy& enemy : enemies_) {
    const EnemyTraits& t = traits(enemy.kind);
    const engine::Vec3 offset{feet.x - enemy.position.x, 0.0f, feet.z - enemy.position.z};
    const float distance = flat_length(offset);
    const engine::Vec3 toward = distance > 0.0f ? offset * (1.0f / distance) : engine::Vec3{0.0f, 0.0f, -1.0f};
    enemy.act_ticks++;

    if (enemy.act == Enemy::Act::recover && enemy.act_ticks >= t.recover) enemy.act = Enemy::Act::roam;
    // 플레이어까지 길이 트였는가 — 돌진형은 곧게 걸어갈 수 있는가, 원거리형은 투사체가 곧게 닿는가 (볼록하지 않은 방의 모퉁이, 기둥 뒤). 걷거나 공격을 시작할 수 있을 때만 잰다
    bool sight = true;
    if (enemy.act == Enemy::Act::roam || enemy.act == Enemy::Act::recover) {
      if (enemy.kind == EnemyKind::charger) {
        sight = walk_clear(enemy.position, feet, t.half_width);
      } else {
        const engine::Vec3 muzzle{enemy.position.x, enemy.position.y + BOLT_MUZZLE, enemy.position.z};
        const engine::Vec3 target{player_.position.x, player_.position.y - BOLT_AIM_BELOW, player_.position.z};
        const engine::Vec3 path = target - muzzle;
        const float reach = std::sqrt(engine::dot(path, path));
        sight = reach < 1e-3f || !stage_.raycast({muzzle, path * (1.0f / reach)}, reach);
      }
    }
    enemy.routing = !sight && !nav_.empty();
    // 적은 박의 머리에서만 공격을 시작한다 (움직임은 박 사이에도 자유롭다) — 길이 트였을 때만
    uint32_t& attacking = busy[static_cast<int>(enemy.kind)];
    if (enemy.act == Enemy::Act::roam && head && sight && enemy.grounded && attacking < t.tokens && (enemy.kind == EnemyKind::caster || distance <= CHARGE_RANGE)) {
      enemy.act = Enemy::Act::windup;
      enemy.act_ticks = 0;
      enemy.aim = toward;
      attacking++;
      emit(WorldEvent::Kind::windup, enemy.position, enemy.kind);
    }

    float dx = 0.0f, dz = 0.0f;
    // 이번 틱의 돌진이 플레이어에 닿는다
    bool struck = false;
    switch (enemy.act) {
      case Enemy::Act::roam:
      case Enemy::Act::recover: {
        // 길이 트였으면 플레이어 쪽으로 곧게 (원거리형은 거리를 잡는다), 가렸으면 길의 점을 따라 돌아간다.
        // ceiling: 길의 점은 틀마다 손으로 놓은 몇 개다 — 그 사이는 곧게 걷고 상자에 닿으면 축마다 미끄러진다. 작은 장애물(소품의 바위)을 돌아가는 길은 따로 찾지 않는다:
        // 부딪히는 소품은 벽 밑·구석에만 둔다 (content/README.md). 방 가운데에 큰 장애물을 놓게 되면 그 둘레에 길의 점을 더한다.
        engine::Vec3 heading{};
        engine::Vec3 facing = toward;
        if (enemy.routing) {
          if (route_tick_ != tick_) plan_routes(feet);
          const engine::Vec3 target = route_target(enemy);
          const engine::Vec3 gap{target.x - enemy.position.x, 0.0f, target.z - enemy.position.z};
          if (const float length = flat_length(gap); length > 0.0f) heading = facing = gap * (1.0f / length);
        } else if (enemy.kind == EnemyKind::charger ? distance > CHARGER_STOP : distance > CASTER_FAR) {
          heading = toward;
        } else if (enemy.kind == EnemyKind::caster && distance < CASTER_NEAR) {
          heading = toward * -1.0f;
        }
        // 서로 겹치지 않게 가까운 적에게서 비켜선다
        for (const Enemy& other : enemies_) {
          const engine::Vec3 apart{enemy.position.x - other.position.x, 0.0f, enemy.position.z - other.position.z};
          if (const float gap = flat_length(apart); gap > 0.0f && gap < ENEMY_SPACING) heading = heading + apart * (1.0f / gap);
        }
        if (const float length = flat_length(heading); length > 0.0f) {
          dx = heading.x / length * t.speed * dt;
          dz = heading.z / length * t.speed * dt;
        }
        // 돌아가는 중에는 가는 쪽을, 길이 트였으면 플레이어를 본다
        enemy.yaw = yaw_toward(facing);
        break;
      }
      case Enemy::Act::windup:
        // 돌진형은 굳힌 방향을 보고, 원거리형은 쏘는 순간까지 플레이어를 따라 본다
        enemy.yaw = yaw_toward(enemy.kind == EnemyKind::charger ? enemy.aim : toward);
        if (enemy.act_ticks < t.windup) break;
        enemy.act_ticks = 0;
        if (enemy.kind == EnemyKind::charger) {
          enemy.act = Enemy::Act::charge;
          emit(WorldEvent::Kind::charge, enemy.position, enemy.kind);
        } else {
          // 쏘는 순간의 플레이어 자리로 곧게 날아간다
          const engine::Vec3 muzzle{enemy.position.x, enemy.position.y + BOLT_MUZZLE, enemy.position.z};
          const engine::Vec3 target{player_.position.x, player_.position.y - BOLT_AIM_BELOW, player_.position.z};
          projectiles_.push_back({muzzle, engine::normalize(target - muzzle) * BOLT_SPEED});
          enemy.act = Enemy::Act::recover;
          emit(WorldEvent::Kind::bolt, enemy.position, enemy.kind);
        }
        break;
      case Enemy::Act::charge: {
        float travel = CHARGE_SPEED * dt;
        // 플레이어에 닿는 자리에서 멈춘다 — 몸을 뚫고 지나가지 않는다. 닿는 거리는 두 몸의 반폭에 CHARGE_TOUCH 를 더한 것
        const float touch = t.half_width + BODY_HALF_WIDTH + CHARGE_TOUCH;
        const float along = offset.x * enemy.aim.x + offset.z * enemy.aim.z, aside_squared = distance * distance - along * along;
        if (along >= 0.0f && aside_squared < touch * touch && feet.y < enemy.position.y + t.height && feet.y + BODY_HEIGHT > enemy.position.y) {
          const float until = along - std::sqrt(touch * touch - aside_squared);
          if (until <= travel) {
            travel = std::max(until, 0.0f);
            struck = true;
          }
        }
        dx = enemy.aim.x * travel;
        dz = enemy.aim.z * travel;
        break;
      }
    }

    Body body{enemy.position, t.half_width, t.height, enemy.fall_speed, enemy.grounded};
    const Moved moved = advance(body, dx, dz);
    const bool unblocked = moved.x && moved.z;
    if (body.feet.y < FALL_LIMIT) {
      body.feet = {0.0f, SPAWN_HEIGHT, 0.0f};
      body.fall_speed = 0.0f;
    }
    enemy.position = body.feet;
    enemy.fall_speed = body.fall_speed;
    enemy.grounded = body.grounded;

    if (enemy.act == Enemy::Act::charge) {
      if (struck) hurt();
      // 플레이어에 닿았거나 벽에 막히거나 다 달렸으면 멈춰 쉰다
      if (struck || !unblocked || enemy.act_ticks >= CHARGE_TICKS) {
        enemy.act = Enemy::Act::recover;
        enemy.act_ticks = 0;
      }
    }
  }
}

void World::step_projectiles() {
  const float dt = static_cast<float>(TICK);
  const engine::Aabb body{{player_.position.x - BODY_HALF_WIDTH, player_.position.y - EYE_HEIGHT, player_.position.z - BODY_HALF_WIDTH},
                          {player_.position.x + BODY_HALF_WIDTH, player_.position.y - EYE_HEIGHT + BODY_HEIGHT, player_.position.z + BODY_HALF_WIDTH}};
  std::erase_if(projectiles_, [&](Projectile& bolt) {
    bolt.position = bolt.position + bolt.velocity * dt;
    const engine::Vec3 r{BOLT_RADIUS, BOLT_RADIUS, BOLT_RADIUS};
    const engine::Aabb box{bolt.position - r, bolt.position + r};
    if (overlap(box, body)) {
      hurt();
      return true;
    }
    if (++bolt.age >= BOLT_TICKS) return true;
    // 벽·기둥·잠긴 문에 닿으면 사라진다
    if (!stage_.overlaps(box) && !std::any_of(gates_.begin(), gates_.end(), [&](const engine::Aabb& gate) { return overlap(box, gate); })) return false;
    emit(WorldEvent::Kind::bolt_wall, bolt.position, EnemyKind::caster);
    return true;
  });
}

// 적의 공격에 맞았다 — 방금 맞았으면 잠깐은 다시 맞지 않는다
void World::hurt() {
  if (tick_ < vulnerable_at_ || outcome_ != Outcome::playing) return;
  player_.health -= HIT_DAMAGE;
  vulnerable_at_ = tick_ + HURT_GRACE;
  hurt_tick_ = tick_;
  streak_ = 0;
  emit(WorldEvent::Kind::hurt);
  if (player_.health > 0) return;
  outcome_ = Outcome::dead;
  emit(WorldEvent::Kind::dead);
}

// 재장전 한 단계 — 탄창을 빼거나 끼운다
void World::reload() {
  pistol_.reload_step();
  emit(pistol_.reload_stage ? WorldEvent::Kind::magazine_out : WorldEvent::Kind::magazine_in);
}

bool World::act(Action action, int32_t ago) {
  if (outcome_ != Outcome::playing || in_transit()) return false;
  if (action == Action::reload && pistol_.ammo == Pistol::MAGAZINE && !pistol_.reload_stage) return false;
  if (action == Action::fire && (pistol_.ammo == 0 || pistol_.reload_stage)) {
    // 빈 방아쇠 — 재장전은 reload 로만 한다. 박자와 무관하다: 판정도 하지 않고 칸도 쓰지 않는다
    dry_tick_ = tick_;
    emit(WorldEvent::Kind::dry);
    return false;
  }
  // 판정은 누른 때의 틱으로 — 가장 가까운 칸의 머리에서 벗어난 정도
  const int64_t shift = -std::clamp<int64_t>(ago, -MAX_INPUT_LEAD, MAX_INPUT_AGE);
  const uint64_t pressed = static_cast<uint64_t>(std::max<int64_t>(static_cast<int64_t>(tick_) + shift, 0));
  const uint64_t slot = slot_at(pressed);
  const Verdict verdict = verdict_at(pressed);
  const int side = slot_offset(pressed) < 0 ? -1 : 1;
  if (verdict == Verdict::miss) {
    // 미스 — 나가지 않는다. 칸도 쓰지 않고 기억해 둔 행동도 그대로다. 배수는 적이 있는 방에서만 깎는다 (오르는 것과 같은 조건 — 빈 방을 지나며 잘못 누른 것으로 잃지 않는다)
    miss_tick_ = tick_;
    miss_side_ = side;
    misses_++;
    if (in_combat()) streak_ = streak_after_miss(streak_);
    emit(WorldEvent::Kind::miss);
    return false;
  }
  const bool weapon = action != Action::dash;
  if (action == Action::dash && dash_slot_ && slot < *dash_slot_ + 2) return false;
  // 무기의 행동은 한 칸에 하나 (늦게 닿은 입력이 이미 쓴 칸으로 거슬러 가도 마찬가지다)
  if (weapon && used_slot_ && slot <= *used_slot_) {
    // 발사 뒤의 발사는 연타다 — 아무 일도 없다. 그 밖은 다음 칸에 내보내려고 하나만 기억한다
    if (action == Action::fire && used_action_ == Action::fire) return false;
    pending_ = Pending{action, *used_slot_ + 1, static_cast<int32_t>(shift)};
    return false;
  }
  if (weapon) {
    used_slot_ = slot;
    used_action_ = action;
  } else {
    dash_slot_ = slot;
  }
  // 정박만 연속 수를 올린다 — 어긋난 행동은 나가되 연속 수는 그대로다
  if (verdict == Verdict::on_beat) {
    beat_tick_ = tick_;
    if (in_combat()) streak_++;
  } else {
    off_tick_ = tick_;
    off_side_ = side;
  }
  perform(action);
  return true;
}

void World::release_pending() {
  if (!pending_) return;
  // 기다리는 사이에 다른 행동이 그 칸을 썼으면 그 다음 칸으로
  if (used_slot_ && pending_->slot <= *used_slot_) pending_->slot = *used_slot_ + 1;
  const int64_t opens = static_cast<int64_t>(pending_->slot * TICKS_PER_SLOT) - ACT_WINDOW;
  if (static_cast<int64_t>(tick_) + pending_->shift < opens) return;
  const Pending pending = *pending_;
  pending_.reset();
  // 그 사이에 할 수 없게 된 행동은 버린다 (가득 찬 탄창의 재장전, 탄 없는 발사)
  if (pending.action == Action::reload && pistol_.ammo == Pistol::MAGAZINE && !pistol_.reload_stage) return;
  if (pending.action == Action::fire && (pistol_.ammo == 0 || pistol_.reload_stage)) return;
  used_slot_ = pending.slot;
  used_action_ = pending.action;
  perform(pending.action);
}

void World::perform(Action action) {
  switch (action) {
    case Action::fire: fire(); break;
    case Action::reload: reload(); break;
    case Action::dash: {
      emit(WorldEvent::Kind::dash);
      dash_tick_ = tick_;
      dash_left_ = DASH_TICKS;
      const bool walking = move_forward_ != 0.0f || move_strafe_ != 0.0f;
      const float forward = walking ? move_forward_ : 1.0f, strafe = walking ? move_strafe_ : 0.0f;
      const float sin_yaw = std::sin(player_.yaw), cos_yaw = std::cos(player_.yaw);
      dash_direction_ = engine::normalize({sin_yaw * forward + cos_yaw * strafe, 0.0f, -cos_yaw * forward + sin_yaw * strafe});
      break;
    }
  }
}

void World::fire() {
  pistol_.ammo--;
  shot_tick_ = tick_;
  emit(WorldEvent::Kind::shot);
  if (enemies_.empty()) return;
  const engine::Ray ray{player_.position, engine::forward_from(player_.yaw, player_.pitch)};
  // 벽·기둥 뒤의 적은 맞지 않는다
  const auto wall = stage_.raycast(ray, FIRE_REACH);
  boxes_.clear();
  for (const Enemy& enemy : enemies_) boxes_.push_back(enemy_box(enemy));
  bvh_.build(boxes_);
  const auto found = bvh_.raycast(ray, wall ? wall->distance : FIRE_REACH);
  if (!found) return;

  Enemy& enemy = enemies_[found->primitive];
  enemy.health -= Pistol::DAMAGE;
  enemy.hurt_tick = tick_;
  hit_tick_ = tick_;
  emit(WorldEvent::Kind::hit, enemy.position, enemy.kind);
  if (enemy.health > 0) return;
  emit(WorldEvent::Kind::kill, enemy.position, enemy.kind);
  score_ += static_cast<uint32_t>(traits(enemy.kind).health) * multiplier(streak_);
  enemies_.erase(enemies_.begin() + found->primitive);
  if (!enemies_.empty()) return;
  // 방을 비웠다 — 석판이 걷히고 포털이 열린다
  cleared_[room_] = true;
  opened_tick_ = tick_;
  gates_.clear();
  projectiles_.clear();
  emit(WorldEvent::Kind::opened);
  if (rooms_cleared() != rooms_total()) return;
  outcome_ = Outcome::cleared;
  emit(WorldEvent::Kind::cleared);
}

}  // namespace game
