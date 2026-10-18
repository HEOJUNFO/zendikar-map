#include "gameplay/content/room_meshes.hpp"

#include <utility>

#include "gameplay/content/assets.hpp"

namespace game {

std::optional<RoomMeshes> RoomMeshes::decode() {
  RoomMeshes meshes;
  for (unsigned shape = 0; shape < SHAPE_COUNT; shape++) {
    auto room = engine::SurfaceMesh::decode(assets::room(shape));
    if (!room) return std::nullopt;
    meshes.rooms[shape] = std::move(*room);
  }
  auto sealed = engine::SurfaceMesh::decode(assets::sealed());
  auto gate = engine::SurfaceMesh::decode(assets::gate());
  if (!sealed || !gate) return std::nullopt;
  meshes.sealed = std::move(*sealed);
  meshes.gate = std::move(*gate);
  return meshes;
}

RoomKit RoomMeshes::kit() const {
  RoomKit kit{.rooms = {}, .nav = {}, .sealed = sealed.solids(), .gate = gate.solids()};
  for (unsigned shape = 0; shape < SHAPE_COUNT; shape++) {
    kit.rooms[shape] = rooms[shape].solids();
    kit.nav[shape] = rooms[shape].nav();
  }
  return kit;
}

}  // namespace game
