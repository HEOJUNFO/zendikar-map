#include "gameplay/domain/dungeon.hpp"

#include <algorithm>
#include <cstdlib>

namespace game {

std::optional<uint32_t> Floor::at(int x, int z) const {
  for (uint32_t i = 0; i < rooms.size(); i++)
    if (rooms[i].x == x && rooms[i].z == z) return i;
  return std::nullopt;
}

Floor generate_floor(Rng& rng) {
  Floor floor;
  floor.rooms.push_back({.x = 0, .z = 0, .doors = 0, .shape = START_SHAPE, .turn = 0, .depth = 0, .chargers = 0, .casters = 0, .kind = RoomKind::start});
  const std::size_t total = 1 + 7 + rng.below(3);
  while (floor.rooms.size() < total) {
    // 절반은 방금 지은 방에서 이어 가(긴 길), 절반은 아무 방에서나 가지를 친다
    const uint32_t parent = rng.below(2) ? static_cast<uint32_t>(floor.rooms.size() - 1) : rng.below(static_cast<uint32_t>(floor.rooms.size()));
    const Direction direction = static_cast<Direction>(rng.below(4));
    const int x = floor.rooms[parent].x + DIRECTION_X[direction], z = floor.rooms[parent].z + DIRECTION_Z[direction];
    if (std::abs(x) > FLOOR_REACH || std::abs(z) > FLOOR_REACH || floor.at(x, z)) continue;
    const uint8_t depth = static_cast<uint8_t>(floor.rooms[parent].depth + 1);
    const uint32_t enemies = std::min<uint32_t>(ROOM_ENEMIES, 1u + depth);
    // 두 종류가 적어도 하나씩
    const uint8_t chargers = static_cast<uint8_t>(1 + rng.below(enemies - 1));
    floor.rooms[parent].doors |= static_cast<uint8_t>(1u << direction);
    floor.rooms.push_back({.x = static_cast<int8_t>(x), .z = static_cast<int8_t>(z), .doors = static_cast<uint8_t>(1u << opposite(direction)), .shape = START_SHAPE, .turn = 0,
                           .depth = depth, .chargers = chargers, .casters = static_cast<uint8_t>(enemies - chargers)});
  }
  // 문이 다 정해졌다 — 전투방마다 그 문에 맞는 틀과 돌림을 고른다
  for (std::size_t i = 1; i < floor.rooms.size(); i++) {
    Room& room = floor.rooms[i];
    uint8_t shapes[COMBAT_SHAPES], turns[4];
    uint32_t shape_count = 0, turn_count = 0;
    for (uint8_t shape = 1; shape < SHAPE_COUNT; shape++)
      for (uint8_t turn = 0; turn < 4; turn++)
        if (fits(shape, turn, room.doors)) {
          shapes[shape_count++] = shape;
          break;
        }
    // 문이 어떻게 나든 정사각 홀과 십자는 맞는다 — 고를 것이 늘 있다
    room.shape = shapes[rng.below(shape_count)];
    for (uint8_t turn = 0; turn < 4; turn++)
      if (fits(room.shape, turn, room.doors)) turns[turn_count++] = turn;
    room.turn = turns[rng.below(turn_count)];
  }
  // A deepest leaf is always reachable through combat rooms. Its four-door hall
  // admits every topology; the trading chamber uses the start-room architecture.
  const auto boss = std::max_element(floor.rooms.begin() + 1, floor.rooms.end(), [](const Room& a, const Room& b) { return a.depth < b.depth; });
  boss->kind = RoomKind::boss;
  boss->shape = 1;
  boss->turn = 0;
  boss->chargers = boss->casters = 0;
  auto shop = floor.rooms.begin() + 1;
  for (auto it = floor.rooms.begin() + 1; it != floor.rooms.end(); ++it)
    if (it != boss && (shop == boss || (it->depth > shop->depth && it->depth < boss->depth))) shop = it;
  shop->kind = RoomKind::shop;
  shop->shape = START_SHAPE;
  shop->turn = 0;
  shop->chargers = shop->casters = 0;
  for (Room& room : floor.rooms) {
    if (room.kind != RoomKind::combat) continue;
    // Preserve the six-enemy ceiling while adding both silhouettes to encounters.
    room.spiders = 1;
    room.bats = 1;
    if (room.chargers > 0) room.chargers--;
    if (room.casters > 0) room.casters--;
  }
  return floor;
}

}  // namespace game
