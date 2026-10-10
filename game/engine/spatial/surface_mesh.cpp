#include "engine/spatial/surface_mesh.hpp"

#include <cmath>
#include <cstring>

namespace engine {
namespace {

// 터무니없는 크기의 데이터는 읽기 전에 거절한다
constexpr uint32_t MAX_VERTICES = 3000000;
constexpr uint32_t MAX_SOLIDS = 100000;
constexpr uint32_t MAX_PLACEMENTS = 10000;
constexpr uint32_t MAX_LIGHTS = 4096;
constexpr uint32_t MAX_LIGHTMAP_SIDE = 8192;

uint32_t read_u32(std::span<const std::byte> bytes, std::size_t at) {
  uint32_t value;
  std::memcpy(&value, bytes.data() + at, sizeof(value));
  return value;
}

bool finite(std::span<const float> values) {
  for (const float value : values)
    if (!std::isfinite(value)) return false;
  return true;
}

}  // namespace

std::optional<SurfaceMesh> SurfaceMesh::decode(std::span<const std::byte> bytes) {
  static_assert(sizeof(SurfaceVertex) == 60 && sizeof(Aabb) == 24 && sizeof(Placement) == 24 && sizeof(MeshLight) == 32 && sizeof(NavNode) == 16);
  constexpr std::size_t HEADER_BYTES = 32;
  std::vector<std::byte> expanded;
  if (bytes.size() >= HEADER_BYTES + 4 && std::memcmp(bytes.data(), "ZKSC", 4) == 0) {
    // 줄여 적은 것 — 정점을 그대로 적은 꼴로 펴서 아래의 검사를 그대로 지난다.
    // 머리 32 · u32 겉 수 · 겉마다 f32 × 5 (색 rgba, 층) · 삼각형마다 [f32 × 3 법선, u32 겉 번호, 꼭짓점 셋마다 f32 × 5 (자리, uv) 와 u16 × 2 (라이트맵 좌표 × 65535)] · 나머지는 같다
    constexpr std::size_t SKIN_BYTES = 20, CORNER_BYTES = 24, TRIANGLE_BYTES = 16 + 3 * CORNER_BYTES;
    const uint32_t vertex_count = read_u32(bytes, 4), skin_count = read_u32(bytes, HEADER_BYTES);
    if (vertex_count > MAX_VERTICES || vertex_count % 3 != 0 || skin_count > 65536) return std::nullopt;
    const std::size_t skins_at = HEADER_BYTES + 4, triangles_at = skins_at + skin_count * SKIN_BYTES, triangle_count = vertex_count / 3;
    const std::size_t rest_at = triangles_at + triangle_count * TRIANGLE_BYTES;
    if (bytes.size() < rest_at) return std::nullopt;
    expanded.resize(HEADER_BYTES + static_cast<std::size_t>(vertex_count) * sizeof(SurfaceVertex) + (bytes.size() - rest_at));
    std::memcpy(expanded.data(), "ZKSF", 4);
    std::memcpy(expanded.data() + 4, bytes.data() + 4, HEADER_BYTES - 4);
    for (std::size_t i = 0; i < triangle_count; i++) {
      const std::byte* in = bytes.data() + triangles_at + i * TRIANGLE_BYTES;
      float normal[3];
      std::memcpy(normal, in, sizeof normal);
      const uint32_t skin = read_u32(bytes, triangles_at + i * TRIANGLE_BYTES + 12);
      if (skin >= skin_count) return std::nullopt;
      for (std::size_t k = 0; k < 3; k++) {
        SurfaceVertex v;
        float corner[5];
        uint16_t lightmap[2];
        std::memcpy(corner, in + 16 + k * CORNER_BYTES, sizeof corner);
        std::memcpy(lightmap, in + 16 + k * CORNER_BYTES + sizeof corner, sizeof lightmap);
        std::memcpy(v.position, corner, sizeof v.position);
        std::memcpy(v.normal, normal, sizeof v.normal);
        std::memcpy(v.uv, corner + 3, sizeof v.uv);
        v.lightmap[0] = static_cast<float>(lightmap[0]) / 65535.0f;
        v.lightmap[1] = static_cast<float>(lightmap[1]) / 65535.0f;
        std::memcpy(v.color, bytes.data() + skins_at + skin * SKIN_BYTES, sizeof v.color);
        std::memcpy(&v.layer, bytes.data() + skins_at + skin * SKIN_BYTES + sizeof v.color, sizeof v.layer);
        std::memcpy(expanded.data() + HEADER_BYTES + (i * 3 + k) * sizeof(SurfaceVertex), &v, sizeof v);
      }
    }
    std::memcpy(expanded.data() + HEADER_BYTES + static_cast<std::size_t>(vertex_count) * sizeof(SurfaceVertex), bytes.data() + rest_at, bytes.size() - rest_at);
    bytes = expanded;
  }
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKSF", 4) != 0) return std::nullopt;
  const uint32_t vertex_count = read_u32(bytes, 4), solid_count = read_u32(bytes, 8), placement_count = read_u32(bytes, 12);
  const uint32_t light_count = read_u32(bytes, 24), nav_count = read_u32(bytes, 28);
  SurfaceMesh mesh;
  mesh.lightmap_width_ = read_u32(bytes, 16);
  mesh.lightmap_height_ = read_u32(bytes, 20);
  if (vertex_count > MAX_VERTICES || vertex_count % 3 != 0 || solid_count > MAX_SOLIDS || placement_count > MAX_PLACEMENTS || mesh.lightmap_width_ > MAX_LIGHTMAP_SIDE ||
      mesh.lightmap_height_ > MAX_LIGHTMAP_SIDE || light_count > MAX_LIGHTS || nav_count > NAV_NODE_LIMIT)
    return std::nullopt;
  const std::size_t vertex_bytes = static_cast<std::size_t>(vertex_count) * sizeof(SurfaceVertex);
  const std::size_t solid_bytes = static_cast<std::size_t>(solid_count) * sizeof(Aabb);
  const std::size_t placement_bytes = static_cast<std::size_t>(placement_count) * sizeof(Placement);
  const std::size_t light_bytes = static_cast<std::size_t>(light_count) * sizeof(MeshLight), nav_bytes = static_cast<std::size_t>(nav_count) * sizeof(NavNode);
  if (bytes.size() != HEADER_BYTES + vertex_bytes + solid_bytes + placement_bytes + light_bytes + nav_bytes) return std::nullopt;

  mesh.vertices_.resize(vertex_count);
  mesh.solids_.resize(solid_count);
  mesh.placements_.resize(placement_count);
  if (vertex_bytes) std::memcpy(mesh.vertices_.data(), bytes.data() + HEADER_BYTES, vertex_bytes);
  if (solid_bytes) std::memcpy(mesh.solids_.data(), bytes.data() + HEADER_BYTES + vertex_bytes, solid_bytes);
  if (placement_bytes) std::memcpy(mesh.placements_.data(), bytes.data() + HEADER_BYTES + vertex_bytes + solid_bytes, placement_bytes);
  mesh.lights_.resize(light_count);
  mesh.nav_.resize(nav_count);
  if (light_bytes) std::memcpy(mesh.lights_.data(), bytes.data() + HEADER_BYTES + vertex_bytes + solid_bytes + placement_bytes, light_bytes);
  if (nav_bytes) std::memcpy(mesh.nav_.data(), bytes.data() + HEADER_BYTES + vertex_bytes + solid_bytes + placement_bytes + light_bytes, nav_bytes);
  for (const SurfaceVertex& v : mesh.vertices_) {
    // 숫자가 아닌 값은 그리기와 굽기를 망가뜨린다. 라이트맵 좌표는 아틀라스 안이어야 한다
    static_assert(sizeof(SurfaceVertex) == 15 * sizeof(float));
    if (!finite({reinterpret_cast<const float*>(&v), 15})) return std::nullopt;
    if (v.lightmap[0] < 0.0f || v.lightmap[0] > 1.0f || v.lightmap[1] < 0.0f || v.lightmap[1] > 1.0f) return std::nullopt;
  }
  for (const Aabb& box : mesh.solids_) {
    const float values[] = {box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z};
    if (!finite(values) || box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z) return std::nullopt;
  }
  for (const Placement& p : mesh.placements_)
    if (!finite(p.position) || !std::isfinite(p.yaw) || !(p.scale > 0.0f) || !std::isfinite(p.scale)) return std::nullopt;
  for (const MeshLight& light : mesh.lights_) {
    if (!finite(light.position) || !finite(light.light) || !std::isfinite(light.reach) || !std::isfinite(light.size)) return std::nullopt;
    if (light.light[0] < 0.0f || light.light[1] < 0.0f || light.light[2] < 0.0f || !(light.reach > 0.0f) || light.size < 0.0f || light.size >= light.reach) return std::nullopt;
  }
  for (uint32_t i = 0; i < nav_count; i++) {
    const NavNode& node = mesh.nav_[i];
    // 이음은 있는 점만 가리키고, 저를 가리키지 않고, 서로 맞물린다
    if (!finite(node.position) || (nav_count < 32 && node.links >> nav_count) || (node.links >> i & 1u)) return std::nullopt;
    for (uint32_t j = 0; j < nav_count; j++)
      if ((node.links >> j & 1u) != (mesh.nav_[j].links >> i & 1u)) return std::nullopt;
  }
  return mesh;
}

std::optional<ModelMesh> ModelMesh::decode(std::span<const std::byte> bytes) {
  // 'ZKMD' · u32 정점 수 · u32 인덱스 수 · u32 표시(비트 0 = 양면을 다 그린다, 비트 1 = 알파로 잘라 낸다) · 정점마다 f32 × 9 (위치, 법선, uv, 층) · 인덱스마다 u32
  constexpr std::size_t HEADER_BYTES = 16, VERTEX_FLOATS = 9;
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKMD", 4) != 0) return std::nullopt;
  const uint32_t vertex_count = read_u32(bytes, 4), index_count = read_u32(bytes, 8), flags = read_u32(bytes, 12);
  if (!vertex_count || vertex_count > MAX_VERTICES || !index_count || index_count > MAX_VERTICES || index_count % 3 != 0 || flags > 3) return std::nullopt;
  const std::size_t vertex_bytes = static_cast<std::size_t>(vertex_count) * VERTEX_FLOATS * sizeof(float);
  if (bytes.size() != HEADER_BYTES + vertex_bytes + static_cast<std::size_t>(index_count) * sizeof(uint32_t)) return std::nullopt;

  ModelMesh model;
  model.two_sided = (flags & 1u) != 0;
  model.cutout = (flags & 2u) != 0;
  model.vertices.resize(index_count);
  model.bounds = {{INFINITY, INFINITY, INFINITY}, {-INFINITY, -INFINITY, -INFINITY}};
  for (uint32_t i = 0; i < index_count; i++) {
    const uint32_t index = read_u32(bytes, HEADER_BYTES + vertex_bytes + static_cast<std::size_t>(i) * sizeof(uint32_t));
    if (index >= vertex_count) return std::nullopt;
    float in[VERTEX_FLOATS];
    std::memcpy(in, bytes.data() + HEADER_BYTES + static_cast<std::size_t>(index) * sizeof in, sizeof in);
    if (!finite(in)) return std::nullopt;
    model.vertices[i] = {{in[0], in[1], in[2]}, {in[3], in[4], in[5]}, {in[6], in[7]}, {0.0f, 0.0f}, {1.0f, 1.0f, 1.0f, 0.0f}, in[8]};
    model.bounds.min = {std::fmin(model.bounds.min.x, in[0]), std::fmin(model.bounds.min.y, in[1]), std::fmin(model.bounds.min.z, in[2])};
    model.bounds.max = {std::fmax(model.bounds.max.x, in[0]), std::fmax(model.bounds.max.y, in[1]), std::fmax(model.bounds.max.z, in[2])};
  }
  return model;
}

}  // namespace engine
