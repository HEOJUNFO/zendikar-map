#include "engine/render/mesh_batch.hpp"

#include <array>
#include <cstddef>

#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// wgsl/mesh.wgsl 의 View (mat4 64 × 2 + vec4 16 × 6), @binding(0)
struct ViewUniforms {
  std::array<float, 16> view_proj;
  std::array<float, 16> model;
  std::array<float, 4> fog;
  std::array<float, 4> params;
  std::array<float, 4> sun_direction, sun_light, up_light, down_light;
};
static_assert(sizeof(ViewUniforms) == 224);
constexpr uint32_t VIEW_BINDING = 0;

constexpr gpu::VertexAttribute ATTRIBUTES[] = {
    {0, 3, offsetof(ColoredVertex, position)},
    {1, 3, offsetof(ColoredVertex, normal)},
    {2, 4, offsetof(ColoredVertex, color)},
};
constexpr gpu::VertexBufferLayout LAYOUTS[] = {{sizeof(ColoredVertex), gpu::VertexStep::vertex, ATTRIBUTES}};

}  // namespace

bool MeshBatch::create(gpu::Device& device, ShaderLibrary& shaders, std::span<const ColoredVertex> vertices) {
  if (vertices.empty()) return false;
  pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::mesh)), LAYOUTS, true, true});
  if (!pipeline_) return false;
  view_uniforms_ = device.create_buffer({gpu::BufferUsage::uniform, sizeof(ViewUniforms)});
  vertices_ = device.create_buffer({gpu::BufferUsage::vertex, vertices.size_bytes(), vertices.data()});
  vertex_count_ = static_cast<uint32_t>(vertices.size());
  return static_cast<bool>(vertices_);
}

void MeshBatch::draw(gpu::Device& device, const MeshView& view) {
  const ViewUniforms uniforms{
      view.view_proj.m,
      view.model.m,
      {view.fog.red, view.fog.green, view.fog.blue, view.fog_distance},
      {view.glow, view.depth_scale, 0.0f, 0.0f},
      {view.sun_direction.x, view.sun_direction.y, view.sun_direction.z, 0.0f},
      {view.sun_light.x, view.sun_light.y, view.sun_light.z, 0.0f},
      {view.up_light.x, view.up_light.y, view.up_light.z, 0.0f},
      {view.down_light.x, view.down_light.y, view.down_light.z, 0.0f},
  };
  device.write_buffer(view_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const gpu::BufferHandle buffers[] = {vertices_};
  const gpu::BufferBinding bindings[] = {{VIEW_BINDING, view_uniforms_}};
  device.draw({pipeline_, buffers, bindings, vertex_count_, 1});
}

}  // namespace engine
