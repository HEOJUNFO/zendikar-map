#include "engine/spatial/static_mesh.hpp"

#include <cmath>
#include <cstdint>
#include <cstring>

namespace engine {
namespace {

constexpr std::size_t HEADER_BYTES = 12;
// 터무니없는 크기의 데이터는 읽기 전에 거절한다
constexpr uint32_t MAX_VERTICES = 3000000;
constexpr uint32_t MAX_SOLIDS = 100000;

uint32_t read_u32(std::span<const std::byte> bytes, std::size_t at) {
  uint32_t value;
  std::memcpy(&value, bytes.data() + at, sizeof(value));
  return value;
}

}  // namespace

std::optional<StaticMesh> StaticMesh::decode(std::span<const std::byte> bytes) {
  static_assert(sizeof(ColoredVertex) == 40 && sizeof(Aabb) == 24);
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKMS", 4) != 0) return std::nullopt;
  const uint32_t vertex_count = read_u32(bytes, 4);
  const uint32_t solid_count = read_u32(bytes, 8);
  if (vertex_count > MAX_VERTICES || solid_count > MAX_SOLIDS || vertex_count % 3 != 0) return std::nullopt;
  const std::size_t vertex_bytes = static_cast<std::size_t>(vertex_count) * sizeof(ColoredVertex);
  const std::size_t solid_bytes = static_cast<std::size_t>(solid_count) * sizeof(Aabb);
  if (bytes.size() != HEADER_BYTES + vertex_bytes + solid_bytes) return std::nullopt;

  StaticMesh mesh;
  mesh.vertices_.resize(vertex_count);
  mesh.solids_.resize(solid_count);
  if (vertex_bytes) std::memcpy(mesh.vertices_.data(), bytes.data() + HEADER_BYTES, vertex_bytes);
  if (solid_bytes) std::memcpy(mesh.solids_.data(), bytes.data() + HEADER_BYTES + vertex_bytes, solid_bytes);
  // 숫자가 아닌 값이나 뒤집힌 상자는 충돌 판정을 망가뜨린다
  for (const ColoredVertex& v : mesh.vertices_)
    for (const float value : v.position)
      if (!std::isfinite(value)) return std::nullopt;
  for (const Aabb& box : mesh.solids_) {
    const float values[] = {box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z};
    for (const float value : values)
      if (!std::isfinite(value)) return std::nullopt;
    if (box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z) return std::nullopt;
  }
  return mesh;
}

}  // namespace engine
