#include "engine/render/instance_batch.hpp"

#include <algorithm>
#include <cstddef>

namespace engine {
namespace {

constexpr std::array<MeshVertex, 36> make_cube() {
  constexpr float corners[8][3] = {
      {-0.5f, -0.5f, -0.5f}, {0.5f, -0.5f, -0.5f}, {0.5f, 0.5f, -0.5f}, {-0.5f, 0.5f, -0.5f},
      {-0.5f, -0.5f, 0.5f},  {0.5f, -0.5f, 0.5f},  {0.5f, 0.5f, 0.5f},  {-0.5f, 0.5f, 0.5f},
  };
  // 면마다 네 꼭짓점과 바깥을 보는 법선
  constexpr int faces[6][4] = {{4, 5, 6, 7}, {1, 0, 3, 2}, {5, 1, 2, 6}, {0, 4, 7, 3}, {7, 6, 2, 3}, {0, 1, 5, 4}};
  constexpr float normals[6][3] = {{0, 0, 1}, {0, 0, -1}, {1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}};
  constexpr int order[6] = {0, 1, 2, 0, 2, 3};
  std::array<MeshVertex, 36> out{};
  std::size_t n = 0;
  for (int f = 0; f < 6; f++)
    for (const int corner : order) {
      const float* p = corners[faces[f][corner]];
      out[n++] = {{p[0], p[1], p[2]}, {normals[f][0], normals[f][1], normals[f][2]}};
    }
  return out;
}

constexpr std::array<MeshVertex, 36> CUBE = make_cube();
constexpr std::array<MeshVertex, 6> GROUND = {{
    {{-1, 0, -1}, {0, 1, 0}}, {{-1, 0, 1}, {0, 1, 0}}, {{1, 0, 1}, {0, 1, 0}},
    {{-1, 0, -1}, {0, 1, 0}}, {{1, 0, 1}, {0, 1, 0}},  {{1, 0, -1}, {0, 1, 0}},
}};
constexpr std::array<MeshVertex, 6> QUAD = {{
    {{0, 0, 0}, {0, 0, 1}}, {{1, 0, 0}, {0, 0, 1}}, {{1, 1, 0}, {0, 0, 1}},
    {{0, 0, 0}, {0, 0, 1}}, {{1, 1, 0}, {0, 0, 1}}, {{0, 1, 0}, {0, 0, 1}},
}};

constexpr gpu::VertexAttribute VERTEX_ATTRIBUTES[] = {
    {0, 3, offsetof(MeshVertex, position)},
    {1, 3, offsetof(MeshVertex, normal)},
};
constexpr gpu::VertexAttribute INSTANCE_ATTRIBUTES[] = {
    {2, 4, offsetof(Instance, placement)},
    {3, 4, offsetof(Instance, tint)},
};
constexpr gpu::VertexBufferLayout LAYOUTS[] = {
    {sizeof(MeshVertex), gpu::VertexStep::vertex, VERTEX_ATTRIBUTES},
    {sizeof(Instance), gpu::VertexStep::instance, INSTANCE_ATTRIBUTES},
};

}  // namespace

std::span<const MeshVertex> unit_cube() { return CUBE; }
std::span<const MeshVertex> unit_ground() { return GROUND; }
std::span<const MeshVertex> unit_quad() { return QUAD; }

std::span<const gpu::VertexBufferLayout> InstanceBatch::vertex_layouts() { return LAYOUTS; }

void InstanceBatch::create(gpu::Device& device, std::span<const MeshVertex> mesh, uint32_t capacity) {
  vertex_count_ = static_cast<uint32_t>(mesh.size());
  capacity_ = capacity;
  vertices_ = device.create_buffer({gpu::BufferUsage::vertex, mesh.size_bytes(), mesh.data()});
  instances_ = device.create_buffer({gpu::BufferUsage::vertex, capacity * sizeof(Instance)});
}

void InstanceBatch::draw(gpu::Device& device, gpu::PipelineHandle pipeline, std::span<const gpu::BufferBinding> bindings,
                         std::span<const Instance> instances) {
  instances = instances.first(std::min<std::size_t>(instances.size(), capacity_));
  if (instances.empty()) return;
  device.write_buffer(instances_, std::as_bytes(instances));
  const gpu::BufferHandle buffers[] = {vertices_, instances_};
  device.draw({pipeline, buffers, bindings, vertex_count_, static_cast<uint32_t>(instances.size())});
}

}  // namespace engine
