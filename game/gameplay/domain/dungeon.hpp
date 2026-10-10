#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/spatial/surface_mesh.hpp"
#include "gameplay/domain/random.hpp"

// 던전 — 격자 한 칸이 방 하나다. 시작 방(적 없음)에서 전투방들이 무작위로 가지를 쳐 이어진다.
// 격자는 어느 방이 어느 쪽으로 이어지는지만 정한다 — 방들은 한 공간에 놓이지 않는다. 세계에는 한 번에 방 하나만 있고(방 가운데가 원점),
// 문은 이웃 방으로 넘어가는 포털이다. 화면을 모른다 (서버도 같은 층을 짓는다).
// 방은 닫힌 실내이고(사용자 결정 2026-10-09 — 하늘에 뜬 열린 마당이던 것을 뒤집었다) 틀마다 모양이 다르다: 정사각 홀, 긴 홀, ㄱ 자, 십자, T 자.
// 칸은 모두 같은 크기이고 문은 칸의 네 변의 가운데에 난다 — 틀은 그 칸 안에서 모양만 다르고, 문이 날 수 있는 변(문 자리)이 틀마다 다르다.
// 방의 문에 맞는 틀을 골라 90 도 단위로 돌려 놓는다 (fits). 거울은 두지 않는다: 틀의 모양이 좌우 대칭이거나, ㄱ 자는 거울에 비춘 것이 곧 돌린 것이라 새 모양이 나오지 않는다.
namespace game {

/** 문이 나는 쪽 — 북쪽이 -z, 동쪽이 +x. 번호 차례가 시계 방향(위에서 볼 때)이라 d × 90 도가 그 쪽의 yaw 다 */
enum Direction : uint8_t { NORTH, EAST, SOUTH, WEST };
inline constexpr int DIRECTION_X[] = {0, 1, 0, -1};
inline constexpr int DIRECTION_Z[] = {-1, 0, 1, 0};
constexpr Direction opposite(Direction d) { return static_cast<Direction>((d + 2) % 4); }

/**
 * 방의 틀(생김새) — 0 은 시작 방, 1 부터가 전투방 틀. 차례는 content/assets.cpp 의 room(shape), CMakeLists.txt 의 ZK_ROOM_SHAPES 와 같다:
 *   0 시작 방 (네 쪽에 문간이 달린 정사각 방) · 1 정사각 홀 (기둥 넷) · 2 긴 홀 (남북으로 긴 직사각) · 3 ㄱ 자 (북쪽 팔과 동쪽 팔) · 4 십자 · 5 T 자 (동서로 긴 가로대와 남쪽 다리)
 */
inline constexpr uint8_t START_SHAPE = 0;
inline constexpr uint8_t COMBAT_SHAPES = 5;
inline constexpr uint8_t SHAPE_COUNT = 1 + COMBAT_SHAPES;
/** 틀마다 문이 날 수 있는 변 (문 자리) — 틀의 좌표에서, 1 << Direction 의 합. 틀의 메시가 그 변의 가운데에 문틀을 두고 있다 (tests/sim_probe.cpp 가 충돌 상자로 견준다) */
inline constexpr uint8_t SHAPE_SITES[SHAPE_COUNT] = {15, 15, 1u << NORTH | 1u << SOUTH, 1u << NORTH | 1u << EAST, 15, 1u << EAST | 1u << SOUTH | 1u << WEST};
/** 틀의 좌표에서 본 변들을 turn 번(90 도씩, 위에서 볼 때 시계 방향) 돌린 방의 변들로 — 틀의 변 s 는 방의 변 (s + turn) % 4 가 된다 */
constexpr uint8_t turned_sides(uint8_t sides, uint8_t turn) { return static_cast<uint8_t>((sides << (turn % 4) | sides >> (4 - turn % 4)) & 15u); }
/** 그 틀을 turn 번 돌려 놓으면 문(doors)이 모두 틀의 문 자리에 오는가 */
constexpr bool fits(uint8_t shape, uint8_t turn, uint8_t doors) { return shape < SHAPE_COUNT && (doors & ~turned_sides(SHAPE_SITES[shape], turn)) == 0; }
/** 방이 놓이는 칸의 범위 — 시작 방(0, 0)에서 사방으로 이만큼까지 */
inline constexpr int FLOOR_REACH = 3;
/** 한 방의 적 수 상한 */
inline constexpr uint32_t ROOM_ENEMIES = 6;
/** 방이 놓이는 칸의 한 변의 절반 (m) — 문은 칸의 변의 가운데에 나고, 포털 면은 방 가운데에서 이만큼 떨어진 문틀 속에 선다 (틀의 모양이 달라도 같다) */
inline constexpr float ROOM_HALF = 16.0f;
/** 문 폭의 절반 */
inline constexpr float DOOR_HALF_WIDTH = 2.0f;

/** 북쪽(-z)을 보고 만든 것을 방 가운데를 축으로 그 쪽을 보게 돌린다 (90 도 단위라 상자가 상자로 남는다) */
constexpr engine::Vec3 turned(engine::Vec3 p, Direction d) {
  const float c = static_cast<float>(-DIRECTION_Z[d]), s = static_cast<float>(DIRECTION_X[d]);
  return {p.x * c - p.z * s, p.y, p.x * s + p.z * c};
}
constexpr engine::Aabb turned(const engine::Aabb& box, Direction d) {
  const engine::Vec3 a = turned(box.min, d), b = turned(box.max, d);
  return {{a.x < b.x ? a.x : b.x, a.y, a.z < b.z ? a.z : b.z}, {a.x < b.x ? b.x : a.x, b.y, a.z < b.z ? b.z : a.z}};
}

/**
 * 방을 짓는 조각들의 충돌 상자와 길의 점 — 방 가운데가 원점, 바닥 윗면이 y 0. 방은 틀 하나가 통째다 (바닥·벽·천장·창·문틀 — 틀의 좌표로 적혀 있고 Room::turn 만큼 돌려 놓는다).
 * 틀의 문 자리 가운데 이 방에서 문이 나지 않은 곳은 막음돌(sealed)이 메우고, 문이 난 곳의 잠긴 문은 석판(gate)이 막는다.
 * 그 두 조각은 북쪽에 놓은 모양으로 적는다 (다른 쪽은 turned)
 */
struct RoomKit {
  std::array<std::span<const engine::Aabb>, SHAPE_COUNT> rooms;
  /** 틀마다 길의 점들 (발의 자리, 틀의 좌표) — 적이 플레이어가 곧게 보이지 않을 때 따라 걷는다. 이음은 메시를 지을 때 충돌 상자로 가려 두었다 */
  std::array<std::span<const engine::NavNode>, SHAPE_COUNT> nav;
  std::span<const engine::Aabb> sealed;
  std::span<const engine::Aabb> gate;
};

struct Room {
  int8_t x;
  int8_t z;
  /** 문이 난 쪽 — 1 << Direction 의 합. 그 쪽 이웃 칸의 방에도 마주 보는 문이 있다 */
  uint8_t doors;
  uint8_t shape;
  /** 틀을 돌려 놓은 횟수 0…3 (90 도씩, 위에서 볼 때 시계 방향 — turned(p, Direction(turn)) 이 틀의 좌표를 방의 좌표로 옮긴다) */
  uint8_t turn;
  /** 시작 방에서 문을 몇 번 지나야 닿는가 */
  uint8_t depth;
  /** 적 구성 — 근접 돌진형과 원거리형의 수 */
  uint8_t chargers;
  uint8_t casters;
  constexpr bool operator==(const Room&) const = default;

  constexpr bool door(Direction d) const { return doors >> d & 1u; }
  /** 그 쪽이 틀의 문 자리다 — 문이 났으면 포털이, 아니면 막음돌이 선다. 문 자리가 아닌 쪽은 틀의 벽이다 (팔이 없는 쪽이면 방이 거기까지 닿지도 않는다) */
  constexpr bool site(Direction d) const { return turned_sides(SHAPE_SITES[shape], turn) >> d & 1u; }
  /** 틀의 좌표의 점을 방의 좌표로, 방의 좌표의 점을 틀의 좌표로 */
  constexpr engine::Vec3 to_room(engine::Vec3 p) const { return turned(p, static_cast<Direction>(turn % 4)); }
  constexpr engine::Vec3 to_shape(engine::Vec3 p) const { return turned(p, static_cast<Direction>((4 - turn % 4) % 4)); }
};

/** 층 하나 — rooms[0] 이 시작 방 */
struct Floor {
  std::vector<Room> rooms;

  /** 그 칸에 있는 방의 번호 */
  std::optional<uint32_t> at(int x, int z) const;
  bool operator==(const Floor&) const = default;
};

/**
 * 층을 짓는다 — 전투방 7–9 개가 시작 방에서 나무 모양으로 뻗는다 (막다른 길이 생긴다).
 * 적 구성은 방마다 뽑고, 시작 방에서 멀수록 적이 는다 (2 → 6 마리, 두 종류가 섞인다).
 * 틀은 문이 다 정해진 뒤에 고른다: 방마다 그 문에 맞는 전투방 틀들 가운데 하나를 고르게 뽑고, 그 틀이 맞는 돌림들 가운데 하나를 고르게 뽑는다
 * (문이 넷인 방은 정사각 홀·십자, 마주 보는 둘이면 ㄱ 자가 빠지고, 이웃한 둘이면 긴 홀이 빠진다). 시작 방은 돌리지 않는다
 */
Floor generate_floor(Rng& rng);

}  // namespace game
