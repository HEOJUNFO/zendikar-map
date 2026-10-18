#pragma once

#include <array>
#include <cmath>
#include <optional>

#include "engine/spatial/surface_mesh.hpp"
#include "gameplay/domain/dungeon.hpp"

namespace game {

/**
 * 방을 짓는 조각들의 메시 — 방의 틀들(바닥·벽·천장·창·문틀이 통째로)과, 문 자리에 서는 두 조각(막음돌, 잠긴 문의 석판). 묻힌 에셋(content/assets.hpp)을 푼 것이다.
 * 시뮬레이션은 이 메시들의 충돌 상자와 길의 점(kit)을 쓰고, 화면은 같은 메시를 같은 자리에 그린다
 */
struct RoomMeshes {
  std::array<engine::SurfaceMesh, SHAPE_COUNT> rooms;
  engine::SurfaceMesh sealed;
  engine::SurfaceMesh gate;

  /** 에셋이 어긋나 풀리지 않으면 nullopt */
  static std::optional<RoomMeshes> decode();
  /** 조각들의 충돌 상자와 길의 점 — 이 메시들이 살아 있는 동안만 유효하다 */
  RoomKit kit() const;
};

/** 북쪽(-z)에 놓은 조각을 그 쪽(d)으로 돌려 at 만큼 옮기는 행렬 — domain/dungeon.hpp 의 turned 와 같은 돌림. 그리는 쪽과 굽는 쪽(app/lightbake)이 같은 자리에 놓는다 */
constexpr engine::Mat4 piece_matrix(Direction d, engine::Vec3 at) {
  const float c = static_cast<float>(-DIRECTION_Z[d]), s = static_cast<float>(DIRECTION_X[d]);
  return engine::Mat4::from_basis({c, 0.0f, s}, {0.0f, 1.0f, 0.0f}, {-s, 0.0f, c}, at);
}

/** 조각에 고정해 놓인 소품의 행렬 — 밑면 가운데가 position, yaw 는 tools/meshc.mjs 의 rot 과 같은 방향 */
inline engine::Mat4 placement_matrix(const engine::Placement& p) {
  const float c = std::cos(p.yaw) * p.scale, s = std::sin(p.yaw) * p.scale;
  return engine::Mat4::from_basis({c, 0.0f, -s}, {0.0f, p.scale, 0.0f}, {s, 0.0f, c}, {p.position[0], p.position[1], p.position[2]});
}

}  // namespace game
