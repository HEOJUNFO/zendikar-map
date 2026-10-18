#include "engine/render/sky_batch.hpp"

#include <array>
#include <span>

#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// wgsl/sky.wgsl 의 View (vec4 × 4), @binding(0)
struct ViewUniforms {
  std::array<float, 4> right, up, forward, image;
};
static_assert(sizeof(ViewUniforms) == 64);
constexpr uint32_t VIEW_BINDING = 0, IMAGE_BINDING = 1, SAMPLER_BINDING = 2;

// 화면을 덮는 삼각형 하나 (클립 좌표)
constexpr float TRIANGLE[] = {-1.0f, -1.0f, 3.0f, -1.0f, -1.0f, 3.0f};
constexpr gpu::VertexAttribute ATTRIBUTES[] = {{0, 2, 0}};
constexpr gpu::VertexBufferLayout LAYOUTS[] = {{2 * sizeof(float), gpu::VertexStep::vertex, ATTRIBUTES}};

}  // namespace

bool SkyBatch::create(gpu::Device& device, ShaderLibrary& shaders) {
  pipeline_ = device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::sky)), .vertex_buffers = LAYOUTS, .depth_test = true, .depth_write = false});
  view_uniforms_ = device.create_buffer({gpu::BufferUsage::uniform, sizeof(ViewUniforms)});
  vertices_ = device.create_buffer({gpu::BufferUsage::vertex, sizeof TRIANGLE, TRIANGLE});
  // 방위는 한 바퀴 돌아 이어진다 (위아래는 셰이더가 그림 안으로 묶는다)
  sampler_ = device.create_sampler({.filter = gpu::Filter::linear, .repeat = true});
  return pipeline_ && view_uniforms_ && vertices_ && sampler_;
}

void SkyBatch::draw(gpu::Device& device, const SkyView& view, gpu::TextureHandle image, uint32_t height) {
  if (!image || !height) return;
  const ViewUniforms uniforms{{view.right.x, view.right.y, view.right.z, view.tan_x},
                              {view.up.x, view.up.y, view.up.z, view.tan_y},
                              {view.forward.x, view.forward.y, view.forward.z, view.yaw},
                              {static_cast<float>(height), 0.0f, 0.0f, 0.0f}};
  device.write_buffer(view_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const gpu::BufferHandle buffers[] = {vertices_};
  const gpu::BufferBinding bindings[] = {{VIEW_BINDING, view_uniforms_}};
  const gpu::TextureBinding textures[] = {{IMAGE_BINDING, image}};
  const gpu::SamplerBinding samplers[] = {{SAMPLER_BINDING, sampler_}};
  device.draw({.pipeline = pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = 3, .instance_count = 1, .textures = textures, .samplers = samplers});
}

}  // namespace engine
