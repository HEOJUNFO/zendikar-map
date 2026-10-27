#include "gameplay/simulation/creature_pose.hpp"
#include <cstdlib>
#include "gameplay/simulation/boss_surface.hpp"
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
constexpr int STEP_SEARCH_BITS = 10;
constexpr float SUPPORT_CLEARANCE = STEP_HEIGHT / static_cast<float>(1u << STEP_SEARCH_BITS);
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
constexpr float SPAWN_REACH = 18.0f;
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
constexpr float BOLT_AIM_BELOW = 0.5f;
// 곧게 걸어갈 수 있는지 보는 광선 — 발에서 이 높이(걸어 오르는 턱 0.5 m 보다 높다), 몸의 반폭의 이 몫만큼 양옆으로 (벽에 붙어 선 몸의 광선이 그 벽 속에서 떠나지 않게 조금 안쪽)
constexpr float WALK_SIGHT_HEIGHT = 0.7f;
constexpr float WALK_SIGHT_SIDE = 0.8f;
// 길의 점에 이만큼 다가가면 닿은 것으로 치고 다음 점으로 간다
constexpr float NODE_REACHED = 0.15f;
constexpr float UNREACHABLE = 1e30f;

constexpr bool overlap(const engine::Aabb& a, const engine::Aabb& b) {
  return a.min.x < b.max.x && b.min.x < a.max.x && a.min.y < b.max.y && b.min.y < a.max.y && a.min.z < b.max.z && b.min.z < a.max.z;
}

float flat_length(engine::Vec3 v) { return std::sqrt(v.x * v.x + v.z * v.z); }
float route_length(engine::Vec3 v) { return std::sqrt(engine::dot(v, v)); }
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

std::optional<World> World::next_campaign_stage(uint32_t seed) const {
  if (outcome_ != Outcome::cleared || campaign_phase_ >= campaign::PHASE_COUNT) return std::nullopt;
  // 다음 구간은 새 층이다 — 전투방마다 적이 구간 수만큼 더 나오고 (돌진형·원거리형을 번갈아), 체력도 오른다 (lock_room 의 stage_health)
  Rng rng(seed);
  Floor floor = generate_floor(rng);
  for (Room& room : floor.rooms) {
    if (room.kind != RoomKind::combat) continue;
    for (uint32_t extra = 0; extra < campaign_phase_; extra++) (extra % 2 ? room.casters : room.chargers)++;
  }
  World next(std::move(floor), *kit_, seed);
  next.campaign_phase_ = campaign_phase_ + 1;
  next.cards_ = cards_;
  next.boss_surface_ = boss_surface_;
  next.motion_profiles_ = motion_profiles_;
  next.gold_ = gold_;
  next.score_ = score_;
  next.reserved_ = reserved_;
  next.held_bolts_ = held_bolts_;
  next.blood_drops_ = blood_drops_;
  next.player_.health = player_.health;
  next.pistol_.ammo = next.magazine_capacity();
  return std::optional<World>{std::move(next)};
}

void World::begin() {
  visited_.assign(floor_.rooms.size(), false);
  cleared_.resize(floor_.rooms.size());
  shops_.resize(floor_.rooms.size());
  for (std::size_t i = 0; i < floor_.rooms.size(); i++) cleared_[i] = floor_.rooms[i].enemy_count() == 0;
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
  corpses_.clear();
  projectiles_.clear();
  hazards_.clear();
  spells_.clear();
  outposts_.clear();
  flares_.clear();
  slowed_until_ = burning_until_ = 0;
  opened_tick_.reset();
  visited_[room_] = true;
  shop_result_ = ShopResult::browsing;
  close_shop();
  safe_feet_ = {player_.position.x, player_.position.y - EYE_HEIGHT, player_.position.z};
  air_jump_used_ = false;
  if (!cleared_[room_]) lock_room();
  if (floor_.rooms[room_].kind == RoomKind::shop) load_shop();
}

void World::load_shop() {
  ShopState& shop = shops_[room_];
  if (shop.merchant) return;
  const Room& room = floor_.rooms[room_];
  if (room.shape == SHOP_SHAPE) {
    // The authored seated pose shares the viewer's origin and chair. Probe
    // below the chair back, inside the low roof, rather than landing on the roof.
    const engine::Vec3 origin = room.to_room({0, .1f, 0});
    const auto floor = stage_.raycast({origin, {0, -1, 0}}, .2f);
    if (!floor) return;
    shop.merchant = Merchant{.position={origin.x, origin.y - floor->distance + .02f, origin.z},
                             .yaw=static_cast<float>(room.turn) * std::numbers::pi_v<float> / 2, .phase_tick=tick_};
    offer_cards();
    return;
  }
  // Prefer the supported centre, then nearby authored standing nodes.
  const auto place = [&](float x, float z) {
    const engine::Vec3 origin{x, 8.9f, z};
    const auto floor = stage_.raycast({origin, {0.0f, -1.0f, 0.0f}}, 9.0f);
    if (!floor) return false;
    const engine::Vec3 feet{x, origin.y - floor->distance + 0.02f, z};
    const Merchant vendor{.position = feet, .yaw = yaw_toward(player_.position - feet), .phase_tick = tick_};
    if (!clear_box(merchant_box(vendor))) return false;
    shop.merchant = vendor;
    return true;
  };
  if (!place(0.0f, 0.0f)) {
    for (const float offset : {1.5f, -1.5f, 3.0f, -3.0f})
      if (place(offset, 0.0f) || place(0.0f, offset)) break;
    if (!shop.merchant)
      for (const engine::NavNode& node : nav_)
        if (place(node.position[0], node.position[2])) break;
  }
  if (shop.merchant) offer_cards();
}

void World::offer_cards() {
  std::array<CardId, CARDS.size()> eligible{};
  uint32_t count = 0;
  for (const Card& card : CARDS)
    if (card.repeatable || !owned(card.id)) eligible[count++] = card.id;
  ShopState& shop = shops_[room_];
  const auto previous = shop.offers;
  const uint32_t previous_count = shop.count;
  shop.count = std::min<uint32_t>(static_cast<uint32_t>(SHOP_OFFERS), count);
  for (uint32_t slot = 0; slot < shop.count; ++slot) {
    const uint32_t chosen = slot + rng_.below(count - slot);
    std::swap(eligible[slot], eligible[chosen]);
    shop.offers[slot] = eligible[slot];
  }
  // A paid refresh must change the set when another eligible card exists;
  // changing only its order would charge health without changing the choice.
  if (count > shop.count && shop.count == previous_count &&
      std::all_of(shop.offers.begin(), shop.offers.begin() + shop.count, [&](CardId id) {
        return std::find(previous.begin(), previous.begin() + previous_count, id) != previous.begin() + previous_count;
      })) shop.offers[shop.count - 1] = eligible[shop.count];
  shop.selected = 0;
}

bool World::near_merchant() const {
  const Merchant* vendor = merchant();
  if (!in_shop() || !vendor || vendor->phase != MerchantPhase::seated) return false;
  const engine::Vec3 gap = player_.position - (vendor->position + engine::Vec3{0.0f, 0.85f, 0.0f});
  return engine::dot(gap, gap) <= MERCHANT_INTERACT_RANGE * MERCHANT_INTERACT_RANGE;
}

bool World::interact_shop() {
  if (shop_open_) return buy_selected_card();
  if (!near_merchant()) return false;
  shop_open_ = true;
  shop_tick_ = tick_;
  move_forward_ = move_strafe_ = 0.0f;
  velocity_ = {};
  fall_speed_ = 0.0f;
  jump_ = false;
  dash_left_ = 0;
  pending_.reset();
  shop_result_ = ShopResult::browsing;
  emit(WorldEvent::Kind::shop_opened, merchant()->position);
  return true;
}

void World::close_shop() {
  shop_open_ = false;
}

bool World::reroll_shop() {
  if (!shop_open_ || !near_merchant()) { shop_result_ = ShopResult::unavailable; return false; }
  const uint32_t eligible = static_cast<uint32_t>(std::count_if(CARDS.begin(), CARDS.end(), [&](const Card& card) { return card.repeatable || !owned(card.id); }));
  if (eligible <= offer_count()) { shop_result_ = ShopResult::no_new_offers; return false; }
  if (player_.health <= SHOP_REROLL_HEALTH) { shop_result_ = ShopResult::insufficient_health; return false; }
  player_.health -= SHOP_REROLL_HEALTH;
  offer_cards();
  shop_tick_ = tick_;
  shop_result_ = ShopResult::rerolled;
  emit(WorldEvent::Kind::shop_rerolled, merchant()->position);
  return true;
}

bool World::can_reroll_shop() const {
  return shop_open_ && near_merchant() && player_.health > SHOP_REROLL_HEALTH &&
      std::count_if(CARDS.begin(), CARDS.end(), [&](const Card& card) { return card.repeatable || !owned(card.id); }) > offer_count();
}

void World::kill_merchant() {
  Merchant& vendor = *shops_[room_].merchant;
  vendor.health = 0;
  vendor.phase = MerchantPhase::fallen;
  vendor.phase_tick = tick_;
  close_shop();
  pending_.reset();
  emit(WorldEvent::Kind::merchant_fallen, vendor.position);
}

float World::random_unit() { return static_cast<float>(rng_.next() >> 8) / 16777216.0f; }

uint32_t World::rooms_total() const {
  return static_cast<uint32_t>(std::count_if(floor_.rooms.begin(), floor_.rooms.end(), [](const Room& room) { return room.enemy_count() > 0; }));
}

uint32_t World::rooms_cleared() const {
  uint32_t count = 0;
  for (std::size_t i = 0; i < floor_.rooms.size(); i++)
    if (cleared_[i] && floor_.rooms[i].enemy_count() > 0) count++;
  return count;
}

void World::step() {
  if (outcome_ != Outcome::playing) return;
  tick_++;
  std::erase_if(corpses_,[&](const Enemy& e){return e.death_tick && tick_-*e.death_tick>=CORPSE_TICKS;});
  for(Enemy& corpse:corpses_)advance_enemy(corpse,0,0);
  if (in_transit()) {
    // 포털을 넘는 중 — 박자만 간다. 화면이 가장 가려지는 한가운데에서 방이 바뀐다. 기억해 둔 행동은 버린다
    pending_.reset();
    if (tick_ - *portal_tick_ == TRANSIT_SWAP) arrive();
    return;
  }
  if (shop_open_) {
    if (!near_merchant()) close_shop();
    else return;
  }
  release_pending();
  walk_player();
  enter_portal();
  step_enemies();
  step_projectiles();
  step_hazards();
  step_spells();
  step_augments();
}

void World::move(float forward, float strafe) {
  if (shop_open_) return;
  if (!std::isfinite(forward) || !std::isfinite(strafe)) return;
  move_forward_ = std::clamp(forward, -1.0f, 1.0f);
  move_strafe_ = std::clamp(strafe, -1.0f, 1.0f);
}

void World::jump() {
  if (outcome_ != Outcome::playing || in_transit() || shop_open_) return;
  if (grounded_ || (owned(CardId::kor_updraft) && !air_jump_used_)) jump_ = true;
}

void World::award_gold(uint32_t amount, engine::Vec3 at) {
  gold_ += std::min(amount, UINT32_MAX - gold_);
  // 잔돈에 이빨이 났다 — 골드는 그대로 받고, 동전 잔상들이 그 자리에서 가까운 적들을 쫓는다
  if (!owned(CardId::biting_change) || !in_combat()) return;
  std::optional<uint32_t> last;
  for (uint32_t coin = 0; coin < augment::COIN_COUNT; coin++) {
    auto target = nearest_enemy(at, last);
    if (!target) target = nearest_enemy(at);
    if (!target) return;
    last = enemies_[*target].visual_id;
    cast(Spell::Kind::coin, at + engine::Vec3{0.0f, 0.6f + 0.3f * static_cast<float>(coin), 0.0f}, *target, augment::COIN_DAMAGE);
  }
}

void World::heal_player(int32_t amount) {
  if (amount > 0 && outcome_ == Outcome::playing) player_.health += std::min(amount, max_health() - player_.health);
}

void World::select_card(uint32_t index) {
  if (!shop_open_ || index >= offer_count()) return;
  shops_[room_].selected = index;
  shop_result_ = ShopResult::browsing;
}

bool World::buy_card(uint32_t index) {
  if (!shop_open_ || !near_merchant() || index >= offer_count()) {
    shop_result_ = ShopResult::unavailable;
    return false;
  }
  shops_[room_].selected = index;
  const Card& card = CARDS[static_cast<std::size_t>(offers()[index])];
  if (!card.repeatable && owned(card.id)) {
    shop_result_ = ShopResult::already_owned;
    return false;
  }
  if (card.id == CardId::spring_water && player_.health >= max_health()) {
    shop_result_ = ShopResult::full_health;
    return false;
  }
  if (gold_ < card.price) {
    shop_result_ = ShopResult::insufficient_gold;
    return false;
  }
  gold_ -= card.price;
  if (!card.repeatable) cards_ |= 1u << static_cast<uint8_t>(card.id);
  if (!card.repeatable)
    for (ShopState& other : shops_) {
      if (&other == &shops_[room_] || !other.merchant || other.merchant->phase != MerchantPhase::seated) continue;
      for (uint32_t slot = 0; slot < other.count; ++slot)
        if (other.offers[slot] == card.id) {
          for (uint32_t next = slot + 1; next < other.count; ++next) other.offers[next - 1] = other.offers[next];
          --other.count;
          std::array<CardId, CARDS.size()> eligible{};
          uint32_t count = 0;
          for (const Card& candidate : CARDS)
            if ((candidate.repeatable || !owned(candidate.id)) && std::find(other.offers.begin(), other.offers.begin() + other.count, candidate.id) == other.offers.begin() + other.count)
              eligible[count++] = candidate.id;
          if (count) other.offers[other.count++] = eligible[rng_.below(count)];
          if (other.selected >= other.count) other.selected = 0;
          break;
        }
    }
  if (card.id == CardId::spring_water) heal_player(40);
  shop_result_ = ShopResult::purchased;
  offer_cards();
  shop_tick_ = tick_;
  emit(WorldEvent::Kind::card_purchased, merchant()->position);
  return true;
}

void World::look(float delta_yaw, float delta_pitch) {
  if (shop_open_) return;
  if (!std::isfinite(delta_yaw) || !std::isfinite(delta_pitch)) return;
  player_.yaw = std::remainder(player_.yaw + delta_yaw, 2.0f * std::numbers::pi_v<float>);
  player_.pitch = std::clamp(player_.pitch + delta_pitch, -PITCH_LIMIT, PITCH_LIMIT);
}

bool World::fits(const Body& body, engine::Vec3 feet) const {
  const engine::Aabb box{{feet.x - body.half_width, feet.y, feet.z - body.half_width}, {feet.x + body.half_width, feet.y + body.height, feet.z + body.half_width}};
  return clear_box(box);
}

bool World::clear_box(const engine::Aabb& box) const {
  if (stage_.overlaps(box)) return false;
  return std::none_of(gates_.begin(), gates_.end(), [&](const engine::Aabb& gate) { return overlap(box, gate); });
}

bool World::enemy_clear(const Enemy& enemy, engine::Vec3 destination) const {
  const engine::Vec3 delta = destination - enemy.position;
  const engine::Aabb body = enemy_clearance_box(enemy);
  const engine::Aabb swept{body.min + engine::Vec3{std::min(0.0f, delta.x), std::min(0.0f, delta.y), std::min(0.0f, delta.z)},
                           body.max + engine::Vec3{std::max(0.0f, delta.x), std::max(0.0f, delta.y), std::max(0.0f, delta.z)}};
  return swept.min.x >= -ROOM_HALF && swept.max.x <= ROOM_HALF && swept.min.z >= -ROOM_HALF && swept.max.z <= ROOM_HALF &&
      swept.min.y >= 0.0f && swept.max.y <= ROOM_CEILING && clear_box(swept);
}

bool World::wall_support(engine::Vec3 center, engine::Vec3 normal, float radius) const {
  const engine::Vec3 tangent{-normal.z, 0.0f, normal.x};
  const engine::Vec3 offsets[] = {{}, {0.0f, radius, 0.0f}, {0.0f, -radius, 0.0f}, tangent * radius, tangent * -radius};
  for (const engine::Vec3 offset : offsets) {
    const auto wall = stage_.raycast({center + offset, normal * -1.0f}, 0.1f);
    if (!wall || std::fabs(wall->distance - 0.05f) > 0.025f) return false;
  }
  return true;
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
    for (int i = 0; i < STEP_SEARCH_BITS; i++) {
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
  const engine::Vec3 wish = heading * (WALK_SPEED * (ensnared() ? 0.5f : 1.0f) * std::min(pressed, 1.0f));

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
  if (jump_ && (body.grounded || (owned(CardId::kor_updraft) && !air_jump_used_))) {
    air_jump_used_ = !body.grounded;
    body.fall_speed = JUMP_SPEED;
    body.grounded = false;
    jumped_tick_ = tick_;
    leapt_ = true;
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
    // Chasms return to the last supported footing; grace prevents repeated fall damage.
    hurt();
    body.feet = safe_feet_ + engine::Vec3{0.0f, DROP_HEIGHT, 0.0f};
    body.fall_speed = 0.0f;
    body.grounded = false;
    velocity_ = {};
    dash_left_ = 0;
    air_jump_used_ = false;
  }
  player_.position = {body.feet.x, body.feet.y + EYE_HEIGHT, body.feet.z};
  fall_speed_ = body.fall_speed;
  grounded_ = body.grounded;
  if (grounded_) {
    // Keep a body's width of support so recovery does not drop straight off an edge.
    const auto supported = [&](float x, float z) {
      const auto floor = stage_.raycast({{x, body.feet.y + 0.05f, z}, {0.0f, -1.0f, 0.0f}}, 0.15f);
      return floor.has_value();
    };
    if (supported(body.feet.x - BODY_HALF_WIDTH, body.feet.z) && supported(body.feet.x + BODY_HALF_WIDTH, body.feet.z) &&
        supported(body.feet.x, body.feet.z - BODY_HALF_WIDTH) && supported(body.feet.x, body.feet.z + BODY_HALF_WIDTH)) safe_feet_ = body.feet;
    air_jump_used_ = false;
  }
  if (airborne && body.grounded) {
    landed_tick_ = tick_;
    landing_speed_ = body.impact;
    emit(WorldEvent::Kind::landed);
    // 무라사 착지 청소 대행 — 뛰어올랐다 내려선 때만 (턱에서 걸어 내려선 것은 아니다). 가까운 적부터 STOMP_TARGETS 마리를 뿌리 발이 밟는다
    if (leapt_ && owned(CardId::landing_service) && tick_ >= stomp_ready_ && in_combat()) {
      std::vector<std::pair<float, uint32_t>> near;
      for (const Enemy& enemy : enemies_) {
        if (enemy.health <= 0) continue;
        const float distance = flat_length(enemy.position - body.feet);
        if (distance <= augment::STOMP_REACH) near.push_back({distance, enemy.visual_id});
      }
      std::sort(near.begin(), near.end());
      if (near.size() > augment::STOMP_TARGETS) near.resize(augment::STOMP_TARGETS);
      if (!near.empty()) {
        stomp_ready_ = tick_ + TICKS_PER_BEAT;
        emit(WorldEvent::Kind::stomp, body.feet);
      }
      for (const auto& [distance, id] : near) {
        const auto index = find_enemy(id);
        if (!index) continue;
        Enemy& enemy = enemies_[*index];
        flare(Flare::Kind::stomp, enemy.position, 30);
        if (enemy.kind != EnemyKind::boss) enemy.stunned_until = std::max(enemy.stunned_until, tick_ + augment::STOMP_STUN);
        strike(*index, augment::STOMP_DAMAGE, Source::spell);
      }
    }
    leapt_ = false;
  }
}

// 열린 포털에 몸이 닿았는가 — 포털 면은 문이 난 쪽으로 방 가운데에서 ROOM_HALF 떨어져 서 있다. 닿으면 넘기 시작한다
void World::enter_portal() {
  // 잠긴 방의 포털은 닫혀 있다 (석판이 막는다). 바닥 아래로 떨어지는 중에는 닿지 않는다
  if (locked() || player_.position.y < 0.0f) return;
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
void World::lock_doors() {
  gates_.clear();
  const Room& room = floor_.rooms[room_];
  for (const Direction d : {NORTH, EAST, SOUTH, WEST})
    if (room.door(d))
      for (const engine::Aabb& box : kit_->gate) gates_.push_back(turned(box, d));
}

void World::lock_room() {
  const Room& room = floor_.rooms[room_];
  lock_doors();
  attack_at_ = tick_ + ARRIVAL_GRACE;

  const engine::Vec3 feet{player_.position.x, 0.0f, player_.position.z};
  for (uint32_t i = 0; i < room.enemy_count(); i++) {
    const EnemyKind kind = room.kind == RoomKind::boss ? EnemyKind::boss : i < room.chargers ? EnemyKind::charger :
      i < static_cast<uint32_t>(room.chargers) + room.casters ? EnemyKind::caster :
      i < static_cast<uint32_t>(room.chargers) + room.casters + room.spiders ? EnemyKind::spider : EnemyKind::bat;
    const EnemyTraits& t = traits(kind);
    // 자리를 못 찾으면 방 가운데 위에 나온다 — 방 틀은 가운데의 이 높이를 비워 둔다
    engine::Vec3 at{0.0f, SPAWN_HEIGHT, 0.0f};
    bool placed = false;
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
      const Enemy candidate{.kind = kind, .position = spot, .health = t.health};
      if (flat_length(spot - feet) < SPAWN_CLEARANCE || !enemy_clear(candidate, spot)) continue;
      if (std::any_of(enemies_.begin(), enemies_.end(), [&](const Enemy& other) { return flat_length(spot - other.position) < SPAWN_SPACING; })) continue;
      at = spot;
      placed = true;
      break;
    }
    // On a narrow bridge, random offsets can all miss the support. Authored
    // standing nodes provide a finite deterministic placement before center fallback.
    float farthest = SPAWN_CLEARANCE;
    if (!placed)
      for (const engine::NavNode& node : nav_) {
        const engine::Vec3 anchor{node.position[0], node.position[1], node.position[2]};
        const engine::Vec3 spot = anchor + engine::Vec3{0.0f, SPAWN_HEIGHT, 0.0f};
        const Enemy candidate{.kind = kind, .position = spot, .health = t.health};
        if (flat_length(spot - feet) < SPAWN_CLEARANCE || !enemy_clear(candidate, spot) || !fits({spot, t.half_width, t.height, 0.0f, false}, anchor + engine::Vec3{0.0f, 0.02f, 0.0f})) continue;
        if (std::any_of(enemies_.begin(), enemies_.end(), [&](const Enemy& other) { return flat_length(spot - other.position) < SPAWN_SPACING; })) continue;
        // Keep the deterministic fallback away from the arrival and crowded
        // centre, while retaining exactly the same full-volume checks.
        const float distance = flat_length(spot - feet);
        if (distance <= farthest) continue;
        farthest = distance;
        at = spot;
      }
    const int32_t health = stage_health(t.health, campaign_phase_);
    Enemy enemy{.kind = kind, .position = at, .yaw = yaw_toward(feet - at), .health = health, .max_health = health};
    if (kind == EnemyKind::bat) {
      // Keep the chosen floor's height. Raising a validated spawn may not cross
      // a gallery slab or put the final body inside it.
      for (const float lift : {1.9f, 1.1f}) {
        const engine::Vec3 flight = at + engine::Vec3{0.0f, lift, 0.0f};
        if (!enemy_clear(enemy, flight)) continue;
        enemy.position = flight;
        break;
      }
      enemy.hover_height = enemy.position.y;
    }
    if (kind == EnemyKind::spider) {
      // Search above this spawn floor, with full-body wall support. A horizontal
      // ray alone also hits thin upper-floor edges, which are not crawlable walls.
      float nearest = 1000.0f;
      const auto floor = stage_.raycast({at + engine::Vec3{0.0f, 0.05f, 0.0f}, {0.0f, -1.0f, 0.0f}}, SPAWN_HEIGHT + 0.1f);
      const float anchor_height = floor ? at.y + 0.05f - floor->distance + t.half_width + 0.05f : at.y + t.half_width;
      for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
        const engine::Vec3 direction{static_cast<float>(DIRECTION_X[d]), 0.0f, static_cast<float>(DIRECTION_Z[d])};
        const engine::Vec3 origin{at.x, anchor_height, at.z};
        if (const auto wall = stage_.raycast({origin, direction}, 40.0f); wall && wall->distance < nearest && wall->distance > 0.05f) {
          Enemy crawler = enemy;
          crawler.wall_normal = direction * -1.0f;
          crawler.position = origin + direction * (wall->distance - 0.05f);
          if (!enemy_clear(crawler, crawler.position) || !wall_support(crawler.position, crawler.wall_normal, t.half_width)) continue;
          nearest = wall->distance;
          enemy.wall_normal = crawler.wall_normal;
          enemy.wall_anchor = crawler.position;
        }
      }
      if (nearest < 1000.0f) enemy.position = enemy.wall_anchor;
    }
    enemy.visual_id=static_cast<uint32_t>(enemies_.size());
    enemies_.push_back(enemy);
  }
  emit(WorldEvent::Kind::locked);
}

bool World::walk_clear(engine::Vec3 from, engine::Vec3 to, float half_width) const {
  const engine::Vec3 gap{to.x - from.x, 0.0f, to.z - from.z};
  const float length = flat_length(gap);
  if (length < 1e-3f) return std::fabs(to.y - from.y) <= STEP_HEIGHT;
  const engine::Vec3 along = gap * (1.0f / length);
  const engine::Vec3 path{gap.x, to.y - from.y, gap.z};
  const float reach = route_length(path);
  const float aside = half_width * WALK_SIGHT_SIDE;
  for (const float side : {-aside, aside}) {
    const engine::Ray ray{{from.x - along.z * side, from.y + WALK_SIGHT_HEIGHT, from.z + along.x * side}, path * (1.0f / reach)};
    if (stage_.raycast(ray, reach)) return false;
  }
  // Union the horizontal support intervals analytically. A ray above the floor
  // sees no chasm, so obstacle visibility alone cannot authorize ground travel.
  const Room& room = floor_.rooms[room_];
  const float support_epsilon = 1e-5f / length;
  for (const float side : {-half_width, 0.0f, half_width}) {
  const engine::Vec3 support_from{from.x - along.z * side, from.y, from.z + along.x * side};
  const engine::Vec3 support_to{to.x - along.z * side, to.y, to.z + along.x * side};
  float supported = 0.0f;
  for (bool extended = true; extended && supported < 1.0f;) {
    extended = false;
    for (const engine::Aabb& source : kit_->rooms[room.shape]) {
      const engine::Aabb box = turned(source, static_cast<Direction>(room.turn));
      if (box.max.y > std::max(from.y, to.y) + STEP_HEIGHT + 1e-4f || box.max.y < std::min(from.y, to.y) - STEP_HEIGHT - 1e-4f) continue;
      float low = 0.0f, high = 1.0f;
      const float rise = to.y - from.y;
      if (std::fabs(rise) > 1e-6f) {
        const float a = (box.max.y - STEP_HEIGHT - 1e-4f - from.y) / rise;
        const float b = (box.max.y + STEP_HEIGHT + 1e-4f - from.y) / rise;
        low = std::max(low, std::min(a, b));
        high = std::min(high, std::max(a, b));
      }
      bool intersects = true;
      for (const uint32_t axis : {0u, 2u}) {
        const float start = axis == 0 ? support_from.x : support_from.z, end = axis == 0 ? support_to.x : support_to.z;
        const float min = axis == 0 ? box.min.x : box.min.z, max = axis == 0 ? box.max.x : box.max.z;
        const float delta = end - start;
        if (min > max || (std::fabs(delta) < 1e-6f && (start < min || start > max))) { intersects = false; break; }
        if (std::fabs(delta) < 1e-6f) continue;
        const float a = (min - start) / delta, b = (max - start) / delta;
        low = std::max(low, std::min(a, b));
        high = std::min(high, std::max(a, b));
      }
      if (intersects && low <= supported + support_epsilon && high > supported && low <= high) supported = high, extended = true;
    }
  }
  if (supported < 1.0f - support_epsilon) return false;
  }
  return true;
}

// 플레이어가 곧게 닿는 점들에서 시작해 이음을 따라 길이를 편다 (점이 많아야 32 개 — 더 줄지 않을 때까지 되풀이)
void World::plan_routes(engine::Vec3 feet) {
  route_tick_ = tick_;
  const auto at = [&](std::size_t i) { return engine::Vec3{nav_[i].position[0], nav_[i].position[1], nav_[i].position[2]}; };
  for (std::size_t i = 0; i < nav_.size(); i++) route_cost_[i] = walk_clear(at(i), feet, walk_half_width(CHARGER.half_width)) ? route_length(feet - at(i)) : UNREACHABLE;
  for (bool shorter = true; shorter;) {
    shorter = false;
    for (std::size_t i = 0; i < nav_.size(); i++)
      for (std::size_t j = 0; j < nav_.size(); j++) {
        if (!(nav_[i].links >> j & 1u) || route_cost_[j] >= UNREACHABLE) continue;
        const float through = route_cost_[j] + route_length(at(j) - at(i));
        if (through < route_cost_[i]) {
          route_cost_[i] = through;
          shorter = true;
        }
      }
  }
}

engine::Vec3 World::navigation_feet(const Enemy& enemy) const {
  const engine::Vec3 origin = enemy.position + engine::Vec3{0.0f, 0.05f, 0.0f};
  if (const auto floor = stage_.raycast({origin, {0.0f, -1.0f, 0.0f}}, 2.0f)) return {enemy.position.x, origin.y - floor->distance, enemy.position.z};
  return enemy.position;
}

std::optional<uint32_t> World::route_target(const Enemy& enemy) const {
  const EnemyTraits& t = traits(enemy.kind);
  float best = UNREACHABLE, nearest = UNREACHABLE;
  std::optional<uint32_t> target, fallback;
  const engine::Vec3 from = navigation_feet(enemy);
  for (std::size_t i = 0; i < nav_.size(); i++) {
    const engine::Vec3 node{nav_[i].position[0], nav_[i].position[1], nav_[i].position[2]};
    const float distance = route_length(node - enemy.position);
    const bool reachable = walk_clear(from, node, walk_half_width(t.half_width));
    if (reachable && distance < nearest) nearest = distance, fallback = static_cast<uint32_t>(i);
    // 이미 닿은 점은 건너뛴다 (그 다음 점으로 간다)
    if ((enemy.grounded && flat_length(node - enemy.position) < NODE_REACHED && std::fabs(node.y - enemy.position.y) <= STEP_HEIGHT + 1e-4f) || route_cost_[i] >= UNREACHABLE || distance + route_cost_[i] >= best || !reachable) continue;
    best = distance + route_cost_[i];
    target = static_cast<uint32_t>(i);
  }
  return best < UNREACHABLE ? target : fallback;
}

void World::step_enemies() {
  const float dt = static_cast<float>(TICK);
  const engine::Vec3 feet{player_.position.x, player_.position.y - EYE_HEIGHT, player_.position.z};
  // 종류마다 지금 공격 중인 수 — 토큰이 남아야 새 공격이 시작된다
  uint32_t busy[6]{};
  for (const Enemy& enemy : enemies_)
    if (enemy.act == Enemy::Act::windup || enemy.act == Enemy::Act::charge) busy[static_cast<int>(enemy.kind)]++;
  // 방에 막 닿았을 때는 공격을 시작하지 않는다
  const bool head = beat_head(tick_) && tick_ >= attack_at_;

  for (Enemy& enemy : enemies_) {
    if (enemy.health <= 0) continue;
    refresh_pose(enemy);
    struct Travel {
      World& world;Enemy& enemy;engine::Vec3 before;uint64_t tick;Enemy::Act act;
      ~Travel(){const auto delta=enemy.position-before;const float length=std::sqrt(engine::dot(delta,delta));const bool moving=length>.00001f;enemy.moving=moving;enemy.animation_distance+=length;if(enemy.act==Enemy::Act::windup && act!=Enemy::Act::windup)enemy.attack_had_active_phase=false;if(enemy.act==Enemy::Act::charge || act==Enemy::Act::charge)enemy.attack_had_active_phase=true;world.refresh_pose(enemy);}
    } travel{*this,enemy,enemy.position,tick_,enemy.act};
    const EnemyTraits& t = traits(enemy.kind);
    const engine::Vec3 offset{feet.x - enemy.position.x, 0.0f, feet.z - enemy.position.z};
    const float distance = flat_length(offset);
    const engine::Vec3 toward = distance > 0.0f ? offset * (1.0f / distance) : engine::Vec3{0.0f, 0.0f, -1.0f};
    enemy.act_ticks++;
    if (enemy.kind == EnemyKind::boss) { step_boss(enemy, feet, head); continue; }
    if (tick_ < enemy.stunned_until) {
      // 기절·묶임 — 하던 공격을 버리고 아무것도 하지 않는다. 묶였으면 묶은 자리로 끌려가 떠 있다 (벽을 탄 거미는 벽에 붙은 채로)
      if (enemy.act == Enemy::Act::windup || enemy.act == Enemy::Act::charge) enemy.act = Enemy::Act::recover;
      enemy.act_ticks = 0;
      const bool wallbound = enemy.kind == EnemyKind::spider && flat_length(enemy.wall_normal) > 0.0f;
      if (tick_ < enemy.bound_until && !wallbound) {
        const engine::Vec3 gap = enemy.bind_anchor - enemy.position;
        const float length = route_length(gap);
        const engine::Vec3 next = length > 0.02f ? enemy.position + gap * (std::min(length, 7.0f * dt) / length) : enemy.position;
        if (enemy_clear(enemy, next)) enemy.position = next;
        enemy.fall_speed = 0.0f;
        enemy.grounded = false;
      }
      continue;
    }

    if (enemy.kind == EnemyKind::spider || enemy.kind == EnemyKind::bat) {
      // Creatures use genuine three-dimensional paths rather than ground gravity.
      const bool wallbound = enemy.kind == EnemyKind::spider && flat_length(enemy.wall_normal) > 0.0f;
      const engine::Aabb bounds = enemy_box(enemy);
      const engine::Vec3 center = (bounds.min + bounds.max) * 0.5f;
      const engine::Vec3 aim = player_.position - center;
      const float reach = std::sqrt(engine::dot(aim, aim));
      const bool sight = reach < 0.01f || !stage_.raycast({center, aim * (1.0f / reach)}, reach);
      if (enemy.act == Enemy::Act::recover && enemy.act_ticks >= t.recover) enemy.act = Enemy::Act::roam;
      if (enemy.act == Enemy::Act::roam && head && sight && busy[static_cast<int>(enemy.kind)] < t.tokens) {
        enemy.act = Enemy::Act::windup;
        enemy.act_ticks = 0;
        enemy.aim = reach > 0.01f ? aim * (1.0f / reach) : engine::Vec3{0.0f, 0.0f, -1.0f};
        busy[static_cast<int>(enemy.kind)]++;
        emit(WorldEvent::Kind::windup, enemy.position, enemy.kind);
      }
      if (enemy.act == Enemy::Act::windup && enemy.act_ticks >= t.windup) {
        enemy.act_ticks = 0;
        if (enemy.kind == EnemyKind::bat) {
          enemy.act = Enemy::Act::charge;
          ++enemy.attack_cycle;
          emit(WorldEvent::Kind::charge, enemy.position, enemy.kind);
        } else {
          const engine::Vec3 direct = reach > 0.01f ? aim * (1.0f / reach) : enemy.aim;
          for (const float side : {-0.18f, 0.0f, 0.18f}) {
            const engine::Vec3 strand{direct.x * std::cos(side) - direct.z * std::sin(side), direct.y, direct.x * std::sin(side) + direct.z * std::cos(side)};
            projectiles_.push_back({.position = center, .velocity = strand * 9.5f, .kind = Projectile::Kind::web});
          }
          enemy.act = Enemy::Act::recover;
          emit(WorldEvent::Kind::bolt, enemy.position, enemy.kind);
        }
      }
      engine::Vec3 next = enemy.position;
      if (enemy.act == Enemy::Act::charge) next = next + enemy.aim * (16.0f * dt);
      else if (enemy.act != Enemy::Act::windup) {
        if (wallbound) {
          const engine::Vec3 tangent{-enemy.wall_normal.z, 0.0f, enemy.wall_normal.x};
          const float phase = static_cast<float>(tick_ % 480) * (2.0f * std::numbers::pi_v<float> / 480.0f);
          const engine::Vec3 candidate = enemy.wall_anchor + tangent * (2.8f * std::sin(phase));
          next = {candidate.x, enemy.wall_anchor.y + 1.2f * std::sin(phase * 2.0f), candidate.z};
          // Do not crawl across doorway air or onto the edge of a floor slab.
          if (!wall_support(next, enemy.wall_normal, t.half_width)) next = enemy.position;
        } else {
          const float orbit = static_cast<float>(&enemy-enemies_.data()) * 1.7f + static_cast<float>(tick_%240)*.02618f;
          const float desired_y = enemy.kind == EnemyKind::bat ? enemy.hover_height + .6f * std::sin(orbit) : 0.1f;
          next.y += std::clamp(desired_y - next.y, -t.speed * dt, t.speed * dt);
          if (enemy.kind == EnemyKind::bat) {
            const float radial = distance>7.0f ? 1.0f : distance<4.0f ? -.7f : .15f*std::sin(orbit*2);
            const float side = (&enemy-enemies_.data())%2 ? -1.0f : 1.0f;
            const engine::Vec3 direction = toward*radial + engine::Vec3{-toward.z,0,toward.x}*(side*.8f);
            next=next+direction*(t.speed*dt/std::max(1.0f,flat_length(direction)));
          } else if (distance > 6.0f) next = next + toward * (t.speed * dt);
        }
      }
      const bool moved = enemy_clear(enemy, next) && (wallbound || enemy.kind == EnemyKind::bat || walk_clear(enemy.position, next, walk_half_width(t.half_width)));
      if (moved) enemy.position = next;
      enemy.yaw = yaw_toward(toward);
      enemy.grounded = wallbound;
      if (enemy.act == Enemy::Act::charge) {
        const engine::Aabb body{{feet.x - BODY_HALF_WIDTH, feet.y, feet.z - BODY_HALF_WIDTH}, {feet.x + BODY_HALF_WIDTH, feet.y + BODY_HEIGHT, feet.z + BODY_HALF_WIDTH}};
        const bool touch = overlap(enemy_box(enemy), body);
        if (touch) hurt(enemy.position);
        if (touch || !moved || enemy.act_ticks >= 42) enemy.act = Enemy::Act::recover, enemy.act_ticks = 0;
      }
      continue;
    }

    if (enemy.act == Enemy::Act::recover && enemy.act_ticks >= t.recover) enemy.act = Enemy::Act::roam;
    // 플레이어까지 길이 트였는가 — 돌진형은 곧게 걸어갈 수 있는가, 원거리형은 투사체가 곧게 닿는가 (볼록하지 않은 방의 모퉁이, 기둥 뒤). 걷거나 공격을 시작할 수 있을 때만 잰다
    bool sight = true;
    if (enemy.act == Enemy::Act::roam || enemy.act == Enemy::Act::recover) {
      if (enemy.kind == EnemyKind::charger) {
        sight = walk_clear(navigation_feet(enemy), feet, walk_half_width(t.half_width));
      } else {
        const engine::Vec3 muzzle{enemy.position.x, enemy.position.y + (enemy.kind == EnemyKind::caster ? 0.9f : 1.2f), enemy.position.z};
        const engine::Vec3 target{player_.position.x, player_.position.y - BOLT_AIM_BELOW, player_.position.z};
        const engine::Vec3 path = target - muzzle;
        const float reach = std::sqrt(engine::dot(path, path));
        sight = reach < 1e-3f || !stage_.raycast({muzzle, path * (1.0f / reach)}, reach);
      }
    }
    enemy.routing = (enemy.act == Enemy::Act::roam || enemy.act == Enemy::Act::recover) && !walk_clear(navigation_feet(enemy), feet, walk_half_width(t.half_width)) && !nav_.empty();
    if (!enemy.routing) enemy.route_node.reset();
    // 적은 박의 머리에서만 공격을 시작한다 (움직임은 박 사이에도 자유롭다) — 길이 트였을 때만
    uint32_t& attacking = busy[static_cast<int>(enemy.kind)];
    if (enemy.act == Enemy::Act::roam && head && sight && enemy.grounded && attacking < t.tokens && (enemy.kind != EnemyKind::charger || distance <= CHARGE_RANGE)) {
      enemy.act = Enemy::Act::windup;
      enemy.routing = false;
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
          if (enemy.route_node) {
            const engine::NavNode& node = nav_[*enemy.route_node];
            const engine::Vec3 at{node.position[0], node.position[1], node.position[2]};
            if (enemy.grounded && flat_length(at - enemy.position) < NODE_REACHED && std::fabs(at.y - enemy.position.y) <= STEP_HEIGHT + 1e-4f) enemy.route_node.reset();
          }
          if (!enemy.route_node) enemy.route_node = route_target(enemy);
          if (!enemy.route_node) break;
          const engine::NavNode& node = nav_[*enemy.route_node];
          const engine::Vec3 target{node.position[0], node.position[1], node.position[2]};
          const engine::Vec3 gap{target.x - enemy.position.x, 0.0f, target.z - enemy.position.z};
          if (const float length = flat_length(gap); length > 0.0f) heading = facing = gap * (1.0f / length);
        } else if (enemy.kind == EnemyKind::charger ? distance > CHARGER_STOP : distance > CASTER_FAR) {
          heading = toward;
        } else if (enemy.kind == EnemyKind::caster && distance < CASTER_NEAR) {
          heading = toward * -1.0f;
        }
        if (!enemy.routing && (enemy.kind == EnemyKind::caster || (enemy.kind == EnemyKind::charger && distance>3.0f && distance<12.0f))) {
          const float side = ((&enemy-enemies_.data())+enemy.attack_cycle)%2 ? -1.0f : 1.0f;
          const bool dodge = enemy.hurt_tick && tick_-*enemy.hurt_tick<12;
          heading = heading + engine::Vec3{-toward.z,0,toward.x} * (side*(dodge?1.5f:enemy.kind==EnemyKind::caster?.8f:.45f));
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
        enemy.yaw = yaw_toward(enemy.kind == EnemyKind::caster ? toward : enemy.aim);
        if (enemy.act_ticks < t.windup) break;
        enemy.act_ticks = 0;
        if (enemy.kind == EnemyKind::charger) {
          ++enemy.attack_cycle;
          if (distance < 2.4f) {
            emit(WorldEvent::Kind::cleave, enemy.position, enemy.kind);
            if (engine::dot(toward, enemy.aim) > 0.65f && feet.y < enemy.position.y + 1.5f && feet.y + BODY_HEIGHT > enemy.position.y) hurt(enemy.position);
            enemy.act = Enemy::Act::recover;
            break;
          }
          enemy.act = Enemy::Act::charge;
          emit(WorldEvent::Kind::charge, enemy.position, enemy.kind);
        } else {
          ++enemy.attack_cycle;
          // Roil slime lobs a ballistic glob at the current footing; it leaves
          // a persistent slowing patch rather than pursuing with a straight bolt.
          const engine::Vec3 muzzle{enemy.position.x, enemy.position.y + 0.9f, enemy.position.z};
          const float flight = std::clamp(distance / 12.0f, 0.6f, 1.6f);
          const engine::Vec3 target{player_.position.x, feet.y, player_.position.z};
          engine::Vec3 velocity = (target - muzzle) * (1.0f / flight);
          velocity.y += 6.0f * flight;
          projectiles_.push_back({.position = muzzle, .velocity = velocity, .kind = Projectile::Kind::goo});
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

    // During a step down the leading toe can still rest on a higher riser.
    // Navigation validates the body-width route; motion validates center footing
    // and lets the physical AABB step/fall without trapping a partly overhung toe.
    bool supported = true;
    if (dx != 0.0f || dz != 0.0f)
      // Match the free endpoint returned by step bisection. Its bounded
      // clearance is not an unsupported drop beyond the intended 1.5 metres.
      supported = stage_.raycast({{enemy.position.x + dx, enemy.position.y + STEP_HEIGHT + 1e-4f, enemy.position.z + dz}, {0.0f, -1.0f, 0.0f}}, 1.5f + STEP_HEIGHT + 1e-4f + SUPPORT_CLEARANCE).has_value();
    if (!supported) dx = dz = 0.0f;
    const Moved moved = advance_enemy(enemy,dx,dz);
    const bool unblocked = moved.x && moved.z && supported;

    if (enemy.act == Enemy::Act::charge) {
      if (struck) hurt(enemy.position);
      // 플레이어에 닿았거나 벽에 막히거나 다 달렸으면 멈춰 쉰다
      if (struck || !unblocked || enemy.act_ticks >= CHARGE_TICKS) {
        enemy.act = Enemy::Act::recover;
        enemy.act_ticks = 0;
      }
    }
  }
}

World::Moved World::advance_enemy(Enemy& enemy,float dx,float dz) const {
  const auto& t=traits(enemy.kind);
  Body body{enemy.position,enemy.kind==EnemyKind::boss?BOSS_MESH_RADIUS:t.half_width,t.height,enemy.fall_speed,enemy.grounded};
  const auto moved=advance(body,dx,dz);
  if(body.feet.y<FALL_LIMIT)body.feet={0,SPAWN_HEIGHT,0},body.fall_speed=0;
  enemy.position=body.feet;enemy.fall_speed=body.fall_speed;enemy.grounded=body.grounded;
  return moved;
}

void World::step_boss(Enemy& enemy, engine::Vec3 feet, bool beat) {
  const float dt = static_cast<float>(TICK);
  const auto timing = boss_timing(enemy.boss_pattern, enemy.boss_phase);
  const engine::Vec3 offset{feet.x - enemy.position.x, 0.0f, feet.z - enemy.position.z};
  const float distance = flat_length(offset);
  const engine::Vec3 toward = distance > .001f ? offset * (1.0f / distance) : engine::Vec3{0,0,-1};
  const engine::Vec3 mouth = enemy.position + engine::Vec3{0,2.4f,0};
  const engine::Vec3 path = player_.position - mouth;
  const float reach = route_length(path);
  const bool sight = reach < .001f || !stage_.raycast({mouth,path * (1.0f / reach)},reach);
  if (enemy.act == Enemy::Act::recover && enemy.act_ticks >= timing.recover) enemy.act = Enemy::Act::roam, enemy.act_ticks = 0;
  if (enemy.act == Enemy::Act::roam && beat && sight && enemy.grounded) {
    enemy.boss_phase = enemy.health <= enemy.max_health / 2 ? BossPhase::enraged : BossPhase::first;
    enemy.boss_pattern = static_cast<BossPattern>(enemy.attack_cycle++ % 5);
    enemy.act = Enemy::Act::windup;
    enemy.act_ticks = 0;
    enemy.aim = enemy.boss_pattern == BossPattern::breath || enemy.boss_pattern == BossPattern::sweep ? engine::normalize(path) : toward;
    enemy.yaw = yaw_toward(toward);
    emit(WorldEvent::Kind::windup,enemy.position,enemy.kind);
    if (enemy.boss_pattern == BossPattern::shard_rain) {
      // Six locked, individually readable impact seals. All are supported by
      // real room geometry; the player can leave their positions during warning.
      const uint32_t warning = boss_timing(enemy.boss_pattern,enemy.boss_phase).windup;
      for (uint32_t i=0;i<BOSS_SHARD_COUNT;++i) {
        const engine::Vec3 target=boss_shard_target(feet,i);
        if (std::fabs(target.x)>ROOM_HALF-2.0f || std::fabs(target.z)>ROOM_HALF-2.0f) continue;
        const auto floor = stage_.raycast({target+engine::Vec3{0,4.0f,0},{0,-1,0}},5.0f);
        if (!floor) continue;
        const engine::Vec3 at{target.x,target.y+4.0f-floor->distance,target.z};
        hazard({.kind=GroundHazard::Kind::shard_impact,.position=at,.duration=warning+i*TICKS_PER_SLOT+TICKS_PER_SLOT+1,
                .radius=2.2f,.delay=warning+i*TICKS_PER_SLOT+1});
      }
    }
  }
  if (enemy.act == Enemy::Act::windup && enemy.act_ticks >= boss_timing(enemy.boss_pattern,enemy.boss_phase).windup) {
    enemy.act = Enemy::Act::charge;
    enemy.act_ticks = 0;
    enemy.charge_stopped = false;
    const auto active = boss_timing(enemy.boss_pattern,enemy.boss_phase).active;
    if (enemy.boss_pattern == BossPattern::breath) {
      hazard({.kind=GroundHazard::Kind::fire_breath,.position=mouth,.direction=enemy.aim,.duration=active,.radius=boss_range(enemy.boss_pattern)});
      emit(WorldEvent::Kind::breath,enemy.position,enemy.kind);
    } else if (enemy.boss_pattern == BossPattern::shockwave) {
      hazard({.kind=GroundHazard::Kind::shockwave,.position=enemy.position,.duration=active});
      emit(WorldEvent::Kind::shockwave,enemy.position,enemy.kind);
    } else if (enemy.boss_pattern == BossPattern::sweep) {
      hazard({.kind=GroundHazard::Kind::sweep,.position=mouth,.direction=enemy.aim,.duration=active,.radius=boss_range(enemy.boss_pattern)});
      emit(WorldEvent::Kind::breath,enemy.position,enemy.kind);
    } else emit(WorldEvent::Kind::charge,enemy.position,enemy.kind);
  }
  float dx=0,dz=0;
  const bool rushing = enemy.act==Enemy::Act::charge && enemy.boss_pattern==BossPattern::charge && !enemy.charge_stopped;
  if (rushing) {
    dx=enemy.aim.x*15.0f*dt;dz=enemy.aim.z*15.0f*dt;
  } else if (enemy.act==Enemy::Act::roam || enemy.act==Enemy::Act::recover) {
    // A heavy lateral reposition keeps the weak side moving without sliding
    // during a committed attack. Use the authored route when a column blocks it.
    engine::Vec3 direction = toward*(distance>12.0f?1.0f:distance<8.0f?-.6f:0.0f);
    direction = direction + engine::Vec3{-toward.z,0,toward.x} * (enemy.attack_cycle%2 ? .55f : -.55f);
    enemy.routing = !walk_clear(navigation_feet(enemy),feet,BOSS_MESH_RADIUS) && !nav_.empty();
    if (enemy.routing) {
      if (route_tick_ != tick_) plan_routes(feet);
      if (const auto node=route_target(enemy)) direction=engine::Vec3{nav_[*node].position[0],enemy.position.y,nav_[*node].position[2]}-enemy.position;
    }
    const float length=flat_length(direction);
    if (length>.001f) dx=direction.x/length*BOSS.speed*dt,dz=direction.z/length*BOSS.speed*dt;
    enemy.yaw=yaw_toward(toward);
  }
  const bool supported = (dx==0 && dz==0) || stage_.raycast({{enemy.position.x+dx,enemy.position.y+STEP_HEIGHT+.0001f,enemy.position.z+dz},{0,-1,0}},1.5f+STEP_HEIGHT).has_value();
  if (!supported) dx=dz=0;
  const auto moved=advance_enemy(enemy,dx,dz);
  const bool touch = rushing && distance < BOSS.half_width+BODY_HALF_WIDTH+.3f && feet.y<enemy.position.y+BOSS.height && feet.y+BODY_HEIGHT>enemy.position.y;
  if (touch) hurt(enemy.position);
  if(rushing && (touch||!supported||!moved.x||!moved.z||enemy.act_ticks>=boss_timing(enemy.boss_pattern,enemy.boss_phase).active)) {
      enemy.charge_stopped=true;
      hazard({.kind=GroundHazard::Kind::shockwave,.position=enemy.position,.duration=2*TICKS_PER_BEAT});
      emit(WorldEvent::Kind::shockwave,enemy.position,enemy.kind);
  }
  if (enemy.act==Enemy::Act::charge && enemy.act_ticks>=boss_timing(enemy.boss_pattern,enemy.boss_phase).active) {
    enemy.act=Enemy::Act::recover;enemy.act_ticks=0;
  }
}

void World::step_projectiles() {
  const float dt = static_cast<float>(TICK);
  const engine::Aabb body{{player_.position.x - BODY_HALF_WIDTH, player_.position.y - EYE_HEIGHT, player_.position.z - BODY_HALF_WIDTH},
                          {player_.position.x + BODY_HALF_WIDTH, player_.position.y - EYE_HEIGHT + BODY_HEIGHT, player_.position.z + BODY_HALF_WIDTH}};
  std::erase_if(projectiles_, [&](Projectile& bolt) {
    if (bolt.kind == Projectile::Kind::goo) bolt.velocity.y -= 12.0f * dt;
    bolt.position = bolt.position + bolt.velocity * dt;
    const engine::Vec3 r{BOLT_RADIUS, BOLT_RADIUS, BOLT_RADIUS};
    const engine::Aabb box{bolt.position - r, bolt.position + r};
    // 헤드론은 반품을 거절하지 않는다 — 보관할 자리가 남았으면 몸에 닿기 전에 막아 보관한다 (맞지 않는다)
    if (owned(CardId::return_to_sender) && held_bolts_ < augment::RETURN_LIMIT) {
      const engine::Vec3 gap = bolt.position - engine::Vec3{player_.position.x, player_.position.y - 0.6f, player_.position.z};
      if (engine::dot(gap, gap) < augment::RETURN_GUARD * augment::RETURN_GUARD) {
        held_bolts_++;
        flare(Flare::Kind::guard, bolt.position, 20);
        emit(WorldEvent::Kind::caught, bolt.position);
        return true;
      }
    }
    if (overlap(box, body)) {
      const float speed = std::sqrt(engine::dot(bolt.velocity, bolt.velocity));
      hurt(speed > 0.001f ? bolt.position - bolt.velocity * (2.0f / speed) : bolt.position);
      if (bolt.kind == Projectile::Kind::web) {
        slowed_until_ = std::max(slowed_until_, tick_ + 3 * TICKS_PER_BEAT);
        emit(WorldEvent::Kind::ensnared, player_.position, EnemyKind::spider);
      }
      if (bolt.kind == Projectile::Kind::goo) {
        if (const auto floor = stage_.raycast({bolt.position + engine::Vec3{0.0f, 0.5f, 0.0f}, {0.0f, -1.0f, 0.0f}}, 5.0f)) {
          const engine::Vec3 at{bolt.position.x, bolt.position.y + 0.5f - floor->distance + 0.02f, bolt.position.z};
          hazard({.kind = GroundHazard::Kind::goo, .position = at, .duration = 4 * TICKS_PER_BEAT, .radius = 2.2f});
          emit(WorldEvent::Kind::puddle, at, EnemyKind::caster);
        }
      }
      return true;
    }
    if (++bolt.age >= BOLT_TICKS) return true;
    // 벽·기둥·잠긴 문에 닿으면 사라진다
    if (!stage_.overlaps(box) && !std::any_of(gates_.begin(), gates_.end(), [&](const engine::Aabb& gate) { return overlap(box, gate); })) return false;
    if (bolt.kind == Projectile::Kind::goo) {
      if (const auto floor = stage_.raycast({bolt.position + engine::Vec3{0.0f, 0.6f, 0.0f}, {0.0f, -1.0f, 0.0f}}, 2.0f)) {
        const engine::Vec3 at{bolt.position.x, bolt.position.y + 0.6f - floor->distance + 0.02f, bolt.position.z};
        hazard({.kind = GroundHazard::Kind::goo, .position = at, .duration = 4 * TICKS_PER_BEAT, .radius = 2.2f});
        emit(WorldEvent::Kind::puddle, at, EnemyKind::caster);
      }
    }
    emit(WorldEvent::Kind::bolt_wall, bolt.position, EnemyKind::caster);
    return true;
  });
}

void World::hazard(GroundHazard hazard) {
  if (hazards_.size() == MAX_HAZARDS) hazards_.erase(hazards_.begin());
  hazards_.push_back(hazard);
}

void World::step_hazards() {
  const engine::Vec3 feet{player_.position.x, player_.position.y - EYE_HEIGHT, player_.position.z};
  std::erase_if(hazards_, [&](GroundHazard& hazard) {
    if (++hazard.age >= hazard.duration) return true;
    if (hazard.age < hazard.delay) return false;
    const engine::Vec3 offset{feet.x - hazard.position.x, 0.0f, feet.z - hazard.position.z};
    const float distance = flat_length(offset), height = feet.y - hazard.position.y;
    bool touching = false;
    if (hazard.kind == GroundHazard::Kind::goo) {
      touching = distance < hazard.radius + BODY_HALF_WIDTH && height < 0.45f && height > -0.5f;
      if (touching) slowed_until_ = std::max(slowed_until_, tick_ + TICKS_PER_BEAT);
    } else if (hazard.kind == GroundHazard::Kind::shard_impact) {
      touching = distance < hazard.radius + BODY_HALF_WIDTH && height > -.5f && height < 4.8f;
    } else if (hazard.kind == GroundHazard::Kind::shockwave) {
      hazard.radius = static_cast<float>(hazard.age) * (16.0f / TICK_RATE);
      touching = std::fabs(distance - hazard.radius) < 0.65f && height < 0.8f && height > -0.5f;
    } else {
      const engine::Vec3 path = player_.position - hazard.position;
      const engine::Vec3 direction = hazard.kind == GroundHazard::Kind::sweep ? sweep_direction(hazard.direction,hazard.age,hazard.duration) : hazard.direction;
      const float reach = route_length(path), along = engine::dot(path, direction);
      touching = along >= 0.0f && reach < hazard.radius && (hazard.kind == GroundHazard::Kind::sweep
          ? engine::dot(path-direction*along,path-direction*along) < .9f*.9f
          : along >= reach * 0.85f);
      if (touching) {
        touching = reach < 0.01f || !stage_.raycast({hazard.position, path * (1.0f / reach)}, reach);
        if (touching && hazard.kind == GroundHazard::Kind::fire_breath) burning_until_ = tick_ + TICKS_PER_BEAT;
      }
    }
    if (touching && (hazard.kind == GroundHazard::Kind::shockwave || hazard.kind == GroundHazard::Kind::shard_impact)) {
      const engine::Vec3 origin=hazard.position+engine::Vec3{0,.4f,0};
      const engine::Vec3 line=feet+engine::Vec3{0,.4f,0}-origin;
      const float length=route_length(line);
      touching=length<.001f || !stage_.raycast({origin,line*(1.0f/length)},length);
    }
    if (touching) {
      hurt(hazard.position);
    }
    return false;
  });
}

// 적의 공격에 맞았다 — 방금 맞았으면 잠깐은 다시 맞지 않는다
void World::hurt(std::optional<engine::Vec3> source) {
  if (tick_ < vulnerable_at_ || outcome_ != Outcome::playing) return;
  if (blood_drops_ > 0) {
    // 피는 포장해 드릴게요 — 보관한 핏방울이 대신 맞고, 공격한 쪽에 가장 가까운 적에게 날아가 터진다. 연속 수도 잃지 않는다
    blood_drops_--;
    vulnerable_at_ = tick_ + HURT_GRACE;
    flare(Flare::Kind::guard, player_.position, 24);
    emit(WorldEvent::Kind::guard);
    if (const auto target = nearest_enemy(source.value_or(player_.position)))
      cast(Spell::Kind::blood, player_.position - engine::Vec3{0.0f, 0.5f, 0.0f}, *target, augment::BLOOD_DAMAGE);
    return;
  }
  const engine::Vec3 incoming = source ? *source - player_.position : engine::Vec3{};
  hurt_direction_ = incoming.x * incoming.x + incoming.z * incoming.z > 0.000001f
      ? std::remainder(std::atan2(incoming.x, -incoming.z) - player_.yaw, 2.0f * std::numbers::pi_v<float>)
      : std::numbers::pi_v<float>;
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
  if (!pistol_.reload_stage) pistol_.ammo = magazine_capacity();
  emit(pistol_.reload_stage ? WorldEvent::Kind::magazine_out : WorldEvent::Kind::magazine_in);
  // 탄창에 헤드론 게가 산다 — 탄창을 끼우면 게 잔상들이 발치에서 나와 가까운 적들에게 나눠 달려든다
  if (pistol_.reload_stage || !owned(CardId::casing_crabs) || !in_combat()) return;
  const engine::Vec3 feet{player_.position.x, player_.position.y - EYE_HEIGHT + 0.2f, player_.position.z};
  std::optional<uint32_t> last;
  for (uint32_t crab = 0; crab < augment::CRAB_COUNT; crab++) {
    auto target = nearest_enemy(feet, last);
    if (!target) target = nearest_enemy(feet);
    if (!target) break;
    last = enemies_[*target].visual_id;
    const float angle = static_cast<float>(crab) * 2.0944f + player_.yaw;
    cast(Spell::Kind::crab, feet + engine::Vec3{std::sin(angle) * 0.6f, 0.0f, -std::cos(angle) * 0.6f}, *target, augment::CRAB_BITE);
  }
}

bool World::act(Action action, int32_t ago) {
  if (outcome_ != Outcome::playing || in_transit() || shop_open_) return false;
  if (action == Action::reload && pistol_.ammo == magazine_capacity() && !pistol_.reload_stage) return false;
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
  if (action == Action::dash && dash_slot_ && slot < *dash_slot_ + dash_cooldown_slots()) return false;
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
  on_beat_ = verdict == Verdict::on_beat;
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
  if (pending.action == Action::reload && pistol_.ammo == magazine_capacity() && !pistol_.reload_stage) return;
  if (pending.action == Action::fire && (pistol_.ammo == 0 || pistol_.reload_stage)) return;
  used_slot_ = pending.slot;
  used_action_ = pending.action;
  on_beat_ = false;
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
      // 하늘폐허 무허가 증축 — 정박 대시를 시작한 자리에 초소 잔상이 선다 (가장 오래된 것이 먼저 무너진다)
      if (on_beat_ && owned(CardId::illegal_extension)) {
        if (outposts_.size() >= augment::OUTPOST_LIMIT) outposts_.erase(outposts_.begin());
        const engine::Vec3 at{player_.position.x, player_.position.y - EYE_HEIGHT + 1.3f, player_.position.z};
        outposts_.push_back({at, tick_, tick_ + augment::OUTPOST_TICKS});
        emit(WorldEvent::Kind::outpost, at);
      }
      break;
    }
  }
}

void World::fire() {
  pistol_.ammo--;
  shot_tick_ = tick_;
  emit(WorldEvent::Kind::shot);
  const Merchant* vendor = merchant();
  const bool neutral = vendor && vendor->phase == MerchantPhase::seated;
  const engine::Ray ray{player_.position, engine::forward_from(player_.yaw, player_.pitch)};
  // 벽·기둥 뒤의 적은 맞지 않는다
  const auto wall = stage_.raycast(ray, FIRE_REACH);
  // 총알이 지난 길 — 총구 언저리에서 맞은 자리(적·벽, 없으면 멀리)까지. 벽에 맞았으면 자국이 남는다
  const auto trace = [&](std::optional<float> struck) {
    const engine::Vec3 right{std::cos(player_.yaw), 0.0f, std::sin(player_.yaw)};
    const engine::Vec3 muzzle = player_.position + ray.direction * 0.55f + right * 0.16f - engine::Vec3{0.0f, 0.13f, 0.0f};
    const engine::Vec3 end = ray.origin + ray.direction * (struck ? *struck : wall ? wall->distance : 60.0f);
    flare(Flare::Kind::tracer, muzzle, 4, end);
    if (!struck && wall) flare(Flare::Kind::impact, end - ray.direction * 0.03f, 32, ray.direction);
  };
  if (enemies_.empty() && !neutral) { trace(std::nullopt); return; }
  boxes_.clear();
  for (const Enemy& enemy : enemies_) boxes_.push_back(enemy.kind==EnemyKind::boss && enemy.health<=0 && boss_surface_ ? boss_surface_->broad_bounds(enemy) : enemy_box(enemy));
  if (neutral) boxes_.push_back(merchant_box(*vendor));
  bvh_.build(boxes_);
  std::optional<engine::Lbvh::Hit> found;
  bvh_.traverse(ray,wall ? wall->distance : FIRE_REACH,[&](uint32_t primitive,float distance,float limit){
    if(primitive<enemies_.size()){const auto& enemy=enemies_[primitive];
      if(enemy.kind==EnemyKind::boss && enemy.health<=0){
        if(!boss_surface_)return limit;
        const auto precise=boss_surface_->raycast(enemy,tick_,ray,limit);if(!precise)return limit;distance=*precise;
      }
    }
    if(distance<limit){found=engine::Lbvh::Hit{primitive,distance};return distance;}return limit;
  });
  // 증강이 사격을 따라 하는 것 — 맞든 빗나가든 총이 나가면 (hit 은 이 발에 맞고도 살아 있는 적). 이 발로 붙은 공명구는 다음 발부터 쏜다
  std::optional<uint32_t> fresh_seal;
  const auto echo = [&](std::optional<uint32_t> hit) {
    if (!in_combat()) return;
    // 총알도 친구가 필요해 — 붙은 공명구마다 그 적이 아닌 가장 가까운 적을 쏜다
    if (owned(CardId::bullet_friends)) {
      std::vector<std::pair<engine::Vec3, uint32_t>> emitters;
      for (const Enemy& enemy : enemies_)
        if (enemy.sealed && enemy.health > 0 && enemy.visual_id != fresh_seal) {
          const engine::Aabb body = enemy_box(enemy);
          emitters.push_back({engine::Vec3{(body.min.x + body.max.x) * 0.5f, body.max.y + 0.3f, (body.min.z + body.max.z) * 0.5f}, enemy.visual_id});
        }
      for (const auto& [at, id] : emitters)
        if (const auto target = nearest_enemy(at, id)) cast(Spell::Kind::seal_bolt, at, *target, augment::SEAL_DAMAGE);
    }
    // 하늘폐허 무허가 증축 — 초소 잔상마다 내가 맞힌 적을(없으면 그 초소에 가장 가까운 적을) 쏜다
    for (const Outpost& post : outposts_) {
      std::optional<std::size_t> target = hit ? find_enemy(*hit) : std::nullopt;
      if (!target) target = nearest_enemy(post.position);
      if (target) cast(Spell::Kind::outpost_bolt, post.position, *target, augment::OUTPOST_DAMAGE);
    }
    // 헤드론은 반품을 거절하지 않는다 — 정박 사격이면 보관한 투사체를 저마다 RETURN_SPLIT 갈래로 가까운 적들에게 돌려보낸다
    if (on_beat_ && held_bolts_ > 0) {
      std::vector<std::pair<float, uint32_t>> order;
      for (const Enemy& enemy : enemies_)
        if (enemy.health > 0) order.push_back({flat_length(enemy.position - player_.position), enemy.visual_id});
      std::sort(order.begin(), order.end());
      const engine::Vec3 chest{player_.position.x, player_.position.y - 0.4f, player_.position.z};
      const engine::Vec3 right{std::cos(player_.yaw), 0.0f, std::sin(player_.yaw)};
      for (uint32_t k = 0; k < held_bolts_ * augment::RETURN_SPLIT && !order.empty(); k++) {
        // 한 발이 RETURN_SPLIT 갈래로 부채처럼 갈라져 나간다
        const engine::Vec3 from = chest + right * (0.7f * (static_cast<float>(k % augment::RETURN_SPLIT) - 1.0f)) + engine::Vec3{0.0f, 0.3f * static_cast<float>(k / augment::RETURN_SPLIT), 0.0f};
        if (const auto target = find_enemy(order[k % order.size()].second)) cast(Spell::Kind::returned_bolt, from, *target, augment::RETURN_DAMAGE);
      }
      held_bolts_ = 0;
    }
  };
  trace(found ? std::optional<float>{found->distance} : std::nullopt);
  if (!found) {
    // 빗나간 게 아니라 예약한 거다 — 적이 있는 방에서 빗나간 발을 저장한다
    if (owned(CardId::reserved_miss) && in_combat() && reserved_ < augment::RESERVED_LIMIT) {
      reserved_++;
      emit(WorldEvent::Kind::reserved);
    }
    echo(std::nullopt);
    return;
  }

  if (neutral && found->primitive == enemies_.size()) {
    Merchant& target = *shops_[room_].merchant;
    target.health -= weapon_damage();
    hit_tick_ = tick_;
    emit(WorldEvent::Kind::hit, target.position);
    if (target.health <= 0) kill_merchant();
    return;
  }

  Enemy& enemy = enemies_[found->primitive];
  if (enemy.kind == EnemyKind::boss && enemy.health <= 0) {
    // Broad-phase candidates have been refined against the submitted skin.
    enemy.finish_hits++;
    hit_tick_ = tick_;
    enemy.hurt_tick = tick_;
    emit(WorldEvent::Kind::finisher, enemy.position, enemy.kind, static_cast<uint8_t>(enemy.finish_hits - 1));
    if (enemy.finish_hits < 5) return;
    // Keep the defeated guardian in the final view. The fifth real shot wins.
    cleared_[room_] = true;
    opened_tick_ = tick_;
    gates_.clear();
    projectiles_.clear();
    hazards_.clear();
    award_gold(30u + 5u * floor_.rooms[room_].depth, enemy.position);
    emit(WorldEvent::Kind::opened);
    outcome_ = Outcome::cleared;
    emit(WorldEvent::Kind::cleared);
    return;
  }
  const std::size_t index = found->primitive;
  const uint32_t id = enemy.visual_id;
  // 총알도 친구가 필요해 — 같은 적에게 SEAL_HITS 번 맞히면 공명구가 붙는다 (붙어 있는 공명구가 SEAL_LIMIT 보다 적을 때)
  if (owned(CardId::bullet_friends) && !enemy.sealed && enemy.health > 0 && ++enemy.seal_hits >= augment::SEAL_HITS && seals() < augment::SEAL_LIMIT) {
    enemy.sealed = true;
    fresh_seal = enemy.visual_id;
    flare(Flare::Kind::seal, enemy.position, 30);
    emit(WorldEvent::Kind::seal, enemy.position, enemy.kind);
  }
  // 탁류야, 저놈 접어라 — 묶여 있지 않은 같은 적에게 정박으로 FOLD_HITS 번 맞히면 그 둘레까지 묶는다 (보스는 묶이지 않는다)
  const bool fold_now = owned(CardId::fold_roil) && on_beat_ && enemy.kind != EnemyKind::boss && tick_ >= enemy.bound_until && ++enemy.beat_hits >= augment::FOLD_HITS;
  // 묶인 적 하나를 맞히면 묶인 적 모두가 같은 피해를 받는다
  std::vector<uint32_t> linked;
  if (tick_ < enemy.bound_until)
    for (const Enemy& other : enemies_)
      if (other.visual_id != id && other.health > 0 && tick_ < other.bound_until) linked.push_back(other.visual_id);
  // 빗나간 게 아니라 예약한 거다 — 저장해 둔 발들이 그 적의 사방에서 한꺼번에 꽂힌다
  if (reserved_ > 0) {
    const engine::Aabb body = enemy_box(enemy);
    const engine::Vec3 center = (body.min + body.max) * 0.5f;
    for (uint32_t shot = 0; shot < reserved_; shot++) {
      const float angle = static_cast<float>(shot) * (2.0f * std::numbers::pi_v<float> / static_cast<float>(reserved_));
      cast(Spell::Kind::reserved_bolt, center + engine::Vec3{std::cos(angle) * 3.2f, 1.2f + 0.4f * static_cast<float>(shot % 2), std::sin(angle) * 3.2f}, index, augment::RESERVED_DAMAGE);
    }
    reserved_ = 0;
  }
  if (fold_now) {
    enemies_[index].beat_hits = 0;
    fold(index);
  }
  const bool killed = strike(index, weapon_damage(), Source::gun);
  for (const uint32_t other : linked)
    if (const auto at = find_enemy(other)) {
      flare(Flare::Kind::burst, enemies_[*at].position + engine::Vec3{0.0f, 0.8f, 0.0f}, 14);
      strike(*at, weapon_damage(), Source::link);
    }
  echo(killed ? std::nullopt : std::optional<uint32_t>{id});
}

bool World::strike(std::size_t index, int32_t damage, Source source, uint8_t chain) {
  Enemy& enemy = enemies_[index];
  // 보스의 시체는 총의 마무리로만 (fire)
  if (enemy.health <= 0) return false;
  refresh_pose(enemy);
  enemy.health -= damage;
  enemy.hurt_tick = tick_;
  if (source == Source::gun) hit_tick_ = tick_;
  emit(source == Source::gun ? WorldEvent::Kind::hit : WorldEvent::Kind::spell_hit, enemy.position, enemy.kind);
  if (enemy.health > 0) {refresh_pose(enemy);return false;}
  enemy.death_tick=tick_;
  if (source == Source::gun) kill_tick_ = tick_;
  emit(WorldEvent::Kind::kill, enemy.position, enemy.kind);
  score_ += static_cast<uint32_t>(traits(enemy.kind).health) * multiplier(streak_);
  const uint32_t reward = enemy.kind == EnemyKind::boss ? 100u : enemy.kind == EnemyKind::charger ? 12u : enemy.kind == EnemyKind::caster ? 10u : enemy.kind == EnemyKind::spider ? 14u : 12u;
  const engine::Aabb body = enemy_box(enemy);
  const engine::Vec3 center = (body.min + body.max) * 0.5f;
  const uint32_t id = enemy.visual_id;
  if (enemy.kind == EnemyKind::boss) {
    enemy.health = 0;
    enemy.act = Enemy::Act::recover;
    enemy.act_ticks = 0;
    enemy.fall_speed = 0.0f;
    projectiles_.clear();
    hazards_.clear();
    spells_.clear();
    refresh_pose(enemy);
    award_gold(reward, enemy.position);
    emit(WorldEvent::Kind::boss_fallen, enemy.position, enemy.kind);
    return true;
  }
  refresh_pose(enemy);
  corpses_.push_back(enemy);
  enemies_.erase(enemies_.begin() + static_cast<std::ptrdiff_t>(index));
  award_gold(reward, center);
  // 피는 포장해 드릴게요 — 다친 몸이면 되찾고, 만피면 핏방울을 보관한다
  if (owned(CardId::blood_takeaway)) {
    if (player_.health < max_health()) {
      heal_player(augment::BLOOD_HEAL);
      flare(Flare::Kind::heal, center, 24);
      emit(WorldEvent::Kind::blood, center);
    } else if (blood_drops_ < augment::BLOOD_LIMIT) {
      blood_drops_++;
      flare(Flare::Kind::heal, center, 24);
      emit(WorldEvent::Kind::blood, center);
    }
  }
  // 장례식은 본인이 진행하세요 — 쓰러진 적의 기억이 가장 가까운 동료에게 마지막 공격을 한다 (그 공격으로 쓰러진 적도 이어서, FUNERAL_CHAIN 번까지)
  if (owned(CardId::self_funeral) && chain < augment::FUNERAL_CHAIN)
    if (const auto target = nearest_enemy(center, id)) cast(Spell::Kind::memory, center, *target, augment::FUNERAL_DAMAGE, static_cast<uint8_t>(chain + 1));
  open_if_cleared();
  return true;
}

void World::open_if_cleared() {
  if (!enemies_.empty() || cleared_[room_]) return;
  // 방을 비웠다 — 석판이 걷히고 포털이 열린다
  cleared_[room_] = true;
  award_gold(30u + 5u * floor_.rooms[room_].depth, player_.position);
  opened_tick_ = tick_;
  gates_.clear();
  projectiles_.clear();
  hazards_.clear();
  spells_.clear();
  emit(WorldEvent::Kind::opened);
  if (rooms_cleared() != rooms_total()) return;
  outcome_ = Outcome::cleared;
  emit(WorldEvent::Kind::cleared);
}

std::optional<std::size_t> World::find_enemy(uint32_t id) const {
  for (std::size_t i = 0; i < enemies_.size(); i++)
    if (enemies_[i].visual_id == id && enemies_[i].health > 0) return i;
  return std::nullopt;
}

std::optional<std::size_t> World::nearest_enemy(engine::Vec3 from, std::optional<uint32_t> exclude) const {
  std::optional<std::size_t> visible, any;
  float visible_distance = UNREACHABLE, any_distance = UNREACHABLE;
  for (std::size_t i = 0; i < enemies_.size(); i++) {
    const Enemy& enemy = enemies_[i];
    if (enemy.health <= 0 || (exclude && enemy.visual_id == *exclude)) continue;
    const engine::Aabb body = enemy_box(enemy);
    const engine::Vec3 path = (body.min + body.max) * 0.5f - from;
    const float distance = route_length(path);
    if (distance < any_distance) any_distance = distance, any = i;
    if (distance < visible_distance && (distance < 0.01f || !stage_.raycast({from, path * (1.0f / distance)}, distance))) visible_distance = distance, visible = i;
  }
  return visible ? visible : any;
}

uint32_t World::seals() const {
  return static_cast<uint32_t>(std::count_if(enemies_.begin(), enemies_.end(), [](const Enemy& enemy) { return enemy.sealed && enemy.health > 0; }));
}

void World::cast(Spell::Kind kind, engine::Vec3 from, std::size_t target, int32_t damage, uint8_t chain) {
  if (spells_.size() >= MAX_SPELLS) return;
  spells_.push_back({.kind = kind, .position = from, .target = enemies_[target].visual_id, .damage = damage, .chain = chain});
  emit(WorldEvent::Kind::spell, from, {}, static_cast<uint8_t>(kind));
}

void World::flare(Flare::Kind kind, engine::Vec3 at, uint32_t duration, engine::Vec3 to) {
  if (flares_.size() >= 48) flares_.erase(flares_.begin());
  flares_.push_back({kind, at, 0, duration, to});
}

void World::fold(std::size_t index) {
  const engine::Vec3 origin = enemies_[index].position;
  std::vector<std::size_t> caught;
  for (std::size_t i = 0; i < enemies_.size(); i++) {
    const Enemy& enemy = enemies_[i];
    if (enemy.kind != EnemyKind::boss && enemy.health > 0 && flat_length(enemy.position - origin) <= augment::FOLD_RADIUS) caught.push_back(i);
  }
  engine::Vec3 middle{};
  for (const std::size_t i : caught) middle = middle + enemies_[i].position;
  middle = middle * (1.0f / static_cast<float>(caught.size())) + engine::Vec3{0.0f, augment::FOLD_LIFT, 0.0f};
  for (std::size_t k = 0; k < caught.size(); k++) {
    Enemy& enemy = enemies_[caught[k]];
    const float angle = static_cast<float>(k) * (2.0f * std::numbers::pi_v<float> / static_cast<float>(caught.size()));
    enemy.bind_anchor = middle + (caught.size() > 1 ? engine::Vec3{std::cos(angle) * 1.1f, 0.0f, std::sin(angle) * 1.1f} : engine::Vec3{});
    enemy.bound_until = enemy.stunned_until = std::max(enemy.stunned_until, tick_ + augment::FOLD_TICKS);
    enemy.beat_hits = 0;
  }
  flare(Flare::Kind::fold, middle, augment::FOLD_TICKS);
  emit(WorldEvent::Kind::fold, middle);
}

void World::step_spells() {
  const float dt = static_cast<float>(TICK);
  constexpr uint32_t SPELL_LIFE = 4 * TICK_RATE;
  for (std::size_t i = 0; i < spells_.size();) {
    Spell spell = spells_[i];
    std::optional<std::size_t> target = find_enemy(spell.target);
    if (!target) target = nearest_enemy(spell.position);
    if (!target || ++spell.age > SPELL_LIFE) {
      spells_.erase(spells_.begin() + static_cast<std::ptrdiff_t>(i));
      continue;
    }
    const Enemy& enemy = enemies_[*target];
    spell.target = enemy.visual_id;
    const engine::Aabb body = enemy_box(enemy);
    // 게는 바닥을 따라 달리고 (몸의 아래쪽을 문다), 나머지는 몸의 가운데로 날아간다
    engine::Vec3 aim = (body.min + body.max) * 0.5f;
    if (spell.kind == Spell::Kind::crab) aim.y = body.min.y + 0.3f;
    const float speed = spell.kind == Spell::Kind::crab ? 12.0f : spell.kind == Spell::Kind::memory ? 16.0f :
                        spell.kind == Spell::Kind::coin || spell.kind == Spell::Kind::blood ? 24.0f : 34.0f;
    const engine::Vec3 gap = aim - spell.position;
    const float distance = route_length(gap);
    const float reach = traits(enemy.kind).half_width + 0.45f;
    if (distance > reach + speed * dt) {
      spell.velocity = gap * (speed / distance);
      spell.position = spell.position + spell.velocity * dt;
      spells_[i++] = spell;
      continue;
    }
    // 닿았다 — 주문을 먼저 빼고 피해를 준다 (피해가 새 주문을 부르거나 방을 비워 주문을 지울 수 있다)
    spells_.erase(spells_.begin() + static_cast<std::ptrdiff_t>(i));
    const engine::Vec3 at = enemy.position;
    std::vector<uint32_t> splash;
    if (spell.kind == Spell::Kind::crab)
      for (const Enemy& other : enemies_)
        if (other.visual_id != spell.target && other.health > 0 && route_length(other.position - at) < augment::CRAB_BURST_RADIUS) splash.push_back(other.visual_id);
    flare(Flare::Kind::burst, aim, spell.kind == Spell::Kind::crab ? 18 : 10);
    strike(*target, spell.damage, Source::spell, spell.chain);
    for (const uint32_t other : splash)
      if (const auto near = find_enemy(other)) strike(*near, augment::CRAB_BURST, Source::spell);
  }
}

void World::step_augments() {
  std::erase_if(flares_, [](Flare& flare) { return ++flare.age >= flare.duration; });
  std::erase_if(outposts_, [&](const Outpost& post) { return tick_ >= post.until; });
}

void World::set_boss_surface(std::shared_ptr<const BossSurface> surface) {
  boss_surface_=std::move(surface);if(boss_surface_)set_creature_motion(EnemyKind::boss,boss_surface_->animation.profile());
}
void World::set_creature_motion(EnemyKind kind,const CreatureAnimation::Profile& profile) {
  motion_profiles_[static_cast<size_t>(kind)]=profile;
  for(auto& enemy:enemies_)if(enemy.kind==kind)refresh_pose(enemy);
}
void World::refresh_pose(Enemy& enemy) {
  const auto& profile=motion_profiles_[static_cast<size_t>(enemy.kind)];if(!profile)return;
  const auto pose=creature_pose(enemy,tick_,*profile,false);
  const uint64_t epoch=pose.clip==CreatureAnimation::hit ? enemy.hurt_tick.value_or(0) : pose.clip==CreatureAnimation::death ? enemy.death_tick.value_or(0) : 0;
  if(!enemy.motion.update(pose,epoch,tick_))std::abort(); // violated fixed-tick pose-history invariant
}

engine::Aabb World::corpse_bounds() const {
  if(boss_surface_)for(const auto& e:enemies_)if(e.kind==EnemyKind::boss && e.health<=0)return boss_surface_->bounds(e,tick_);
  return {};
}
bool World::corpse_settled() const {
  if(boss_surface_)for(const auto& e:enemies_)if(e.kind==EnemyKind::boss && e.health<=0 && e.death_tick)
    return tick_-*e.death_tick>=boss_surface_->animation.track(CreatureAnimation::death).frames-1;
  return false;
}
engine::Vec3 World::corpse_target() const {
  if(boss_surface_)for(const auto& e:enemies_)if(e.kind==EnemyKind::boss && e.health<=0)
    if(const auto p=boss_surface_->target(e,tick_,player_.position,stage_))return *p;
  return {};
}

} // namespace game
