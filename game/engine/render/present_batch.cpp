#include "engine/render/present_batch.hpp"

#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

constexpr uint32_t SCENE_BINDING = 0, SAMPLER_BINDING = 1;
// 화면을 덮는 삼각형 하나 (클립 좌표)
constexpr float TRIANGLE[] = {-1.0f, -1.0f, 3.0f, -1.0f, -1.0f, 3.0f};
constexpr gpu::VertexAttribute ATTRIBUTES[] = {{0, 2, 0}};
constexpr gpu::VertexBufferLayout LAYOUTS[] = {{2 * sizeof(float), gpu::VertexStep::vertex, ATTRIBUTES}};

}  // namespace

bool PresentBatch::create(gpu::Device& device, ShaderLibrary& shaders) {
  pipeline_ = device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::present)), .vertex_buffers = LAYOUTS, .depth_test = false, .target = gpu::Target::canvas});
  vertices_ = device.create_buffer({gpu::BufferUsage::vertex, sizeof TRIANGLE, TRIANGLE});
  sampler_ = device.create_sampler({.filter = gpu::Filter::linear});
  return pipeline_ && vertices_ && sampler_;
}

void PresentBatch::draw(gpu::Device& device) {
  const gpu::BufferHandle buffers[] = {vertices_};
  const gpu::TextureBinding textures[] = {{SCENE_BINDING, device.scene_texture()}};
  const gpu::SamplerBinding samplers[] = {{SAMPLER_BINDING, sampler_}};
  device.draw({.pipeline = pipeline_, .vertex_buffers = buffers, .bindings = {}, .vertex_count = 3, .instance_count = 1, .textures = textures, .samplers = samplers});
}

}  // namespace engine
