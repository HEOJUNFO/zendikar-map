#include "engine/render/surface_batch.hpp"

#include <algorithm>
#include <cstddef>

#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// wgsl/surface.wgsl 의 Frame (mat4 64 + vec4 16 × 4), @binding(0)
struct FrameUniforms {
  std::array<float, 16> view_proj;
  std::array<float, 4> fog;
  std::array<float, 4> params;
  std::array<float, 4> sun_direction;
  std::array<float, 4> sun_light;
  std::array<float, 4> eye;
};
static_assert(sizeof(FrameUniforms) == 144);
constexpr uint32_t FRAME_BINDING = 0;
constexpr uint32_t ALBEDO_BINDING = 1;
constexpr uint32_t ALBEDO_SAMPLER_BINDING = 2;
constexpr uint32_t LIGHTMAP_BINDING = 3;
constexpr uint32_t LIGHTMAP_SAMPLER_BINDING = 4;
constexpr uint32_t NAR_BINDING = 5;
constexpr uint32_t DIRECTION_BINDING = 6;
// 비스듬히 보이는 바닥의 무늬가 뭉개지지 않을 만큼
constexpr uint32_t ANISOTROPY = 8;

constexpr gpu::VertexAttribute VERTEX_ATTRIBUTES[] = {
    {0, 3, offsetof(SurfaceVertex, position)}, {1, 3, offsetof(SurfaceVertex, normal)}, {2, 2, offsetof(SurfaceVertex, uv)},
    {3, 2, offsetof(SurfaceVertex, lightmap)}, {4, 4, offsetof(SurfaceVertex, color)},  {5, 1, offsetof(SurfaceVertex, layer)},
};
constexpr gpu::VertexAttribute INSTANCE_ATTRIBUTES[] = {
    {6, 4, offsetof(SurfaceInstance, x)},
    {7, 4, offsetof(SurfaceInstance, y)},
    {8, 4, offsetof(SurfaceInstance, z)},
    {9, 4, offsetof(SurfaceInstance, light_up)},
    {10, 4, offsetof(SurfaceInstance, light_down)},
};
constexpr gpu::VertexBufferLayout LAYOUTS[] = {
    {sizeof(SurfaceVertex), gpu::VertexStep::vertex, VERTEX_ATTRIBUTES},
    {sizeof(SurfaceInstance), gpu::VertexStep::instance, INSTANCE_ATTRIBUTES},
};

}  // namespace

bool SurfaceBatch::create(gpu::Device& device, ShaderLibrary& shaders, uint32_t capacity) {
  // 불투명한 겉은 프래그먼트를 버리지 않는 셰이더로 (가려진 픽셀을 깊이로 먼저 거른다 — 닫힌 겉은 뒷면을 버리고, 재질이 양면인 겉은 버리지 않는다), 잎만 잘라 내는 셰이더로
  const gpu::ShaderHandle opaque = shaders.resolve(shaders.add(shaders::surface));
  pipeline_ = device.create_pipeline({.shader = opaque, .vertex_buffers = LAYOUTS, .depth_test = true, .cull_back_faces = true});
  two_sided_pipeline_ = device.create_pipeline({.shader = opaque, .vertex_buffers = LAYOUTS, .depth_test = true});
  cutout_pipeline_ = device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::surface_cutout)), .vertex_buffers = LAYOUTS, .depth_test = true});
  frame_uniforms_ = device.create_buffer({gpu::BufferUsage::uniform, sizeof(FrameUniforms)});
  instances_ = device.create_buffer({gpu::BufferUsage::vertex, capacity * sizeof(SurfaceInstance)});
  albedo_sampler_ = device.create_sampler({.filter = gpu::Filter::linear, .repeat = true, .mip_linear = true, .anisotropy = ANISOTROPY});
  lightmap_sampler_ = device.create_sampler({.filter = gpu::Filter::linear});
  static constexpr std::byte WHITE[] = {std::byte{255}, std::byte{255}, std::byte{255}, std::byte{255}};
  white_ = device.create_texture({1, 1, WHITE, gpu::TextureFormat::rgba8});
  // 방향 (0, 0, 0) 에 쏠림 0 — 셰이더가 면의 법선 쪽으로 본다
  static constexpr std::byte UNDIRECTED[] = {std::byte{128}, std::byte{128}, std::byte{128}, std::byte{0}};
  undirected_ = device.create_texture({1, 1, UNDIRECTED, gpu::TextureFormat::rgba8});
  // 법선 (0, 0, 1), 거칠기 0.85
  static constexpr std::byte FLAT_NAR[] = {std::byte{128}, std::byte{128}, std::byte{217}, std::byte{255}};
  flat_nar_ = device.create_texture({.width = 1, .height = 1, .pixels = FLAT_NAR, .format = gpu::TextureFormat::rgba8, .mip_levels = 1, .layers = 1});
  capacity_ = capacity;
  return pipeline_ && two_sided_pipeline_ && cutout_pipeline_ && frame_uniforms_ && instances_ && albedo_sampler_ && lightmap_sampler_ && white_ && undirected_ && flat_nar_;
}

gpu::BufferHandle SurfaceBatch::upload(gpu::Device& device, std::span<const SurfaceVertex> vertices) {
  if (vertices.empty()) return {};
  return device.create_buffer({gpu::BufferUsage::vertex, vertices.size_bytes(), vertices.data()});
}

void SurfaceBatch::draw(gpu::Device& device, const SurfaceView& view, std::span<const SurfaceInstance> instances, std::span<const SurfaceDraw> draws) {
  instances = instances.first(std::min<std::size_t>(instances.size(), capacity_));
  if (instances.empty()) return;
  device.write_buffer(instances_, std::as_bytes(instances));
  const FrameUniforms uniforms{view.view_proj.m,
                               {view.fog.red, view.fog.green, view.fog.blue, view.fog_distance},
                               {view.glow, view.depth_scale, 0.0f, 0.0f},
                               {view.sun_direction.x, view.sun_direction.y, view.sun_direction.z, 0.0f},
                               {view.sun_light.x, view.sun_light.y, view.sun_light.z, 0.0f},
                               {view.eye.x, view.eye.y, view.eye.z, 0.0f}};
  device.write_buffer(frame_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}};
  const gpu::SamplerBinding samplers[] = {{ALBEDO_SAMPLER_BINDING, albedo_sampler_}, {LIGHTMAP_SAMPLER_BINDING, lightmap_sampler_}};
  for (const SurfaceDraw& item : draws) {
    // 올린 인스턴스 밖을 가리키는 구간은 잘라 그린다
    if (!item.vertices || !item.albedo || item.first_instance >= instances.size()) continue;
    const uint32_t count = std::min<uint32_t>(item.instance_count, static_cast<uint32_t>(instances.size()) - item.first_instance);
    const gpu::BufferHandle buffers[] = {item.vertices, instances_};
    const gpu::TextureBinding textures[] = {{ALBEDO_BINDING, item.albedo},
                                            {LIGHTMAP_BINDING, item.lightmap ? item.lightmap : white_},
                                            {NAR_BINDING, item.nar ? item.nar : flat_nar_},
                                            {DIRECTION_BINDING, item.direction ? item.direction : undirected_}};
    device.draw({.pipeline = item.cutout ? cutout_pipeline_ : item.two_sided ? two_sided_pipeline_ : pipeline_,
                 .vertex_buffers = buffers,
                 .bindings = bindings,
                 .vertex_count = item.vertex_count,
                 .instance_count = count,
                 .textures = textures,
                 .samplers = samplers,
                 .first_instance = item.first_instance});
  }
}

}  // namespace engine
