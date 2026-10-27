#include "engine/render/sprite_batch.hpp"

#include <algorithm>
#include <cstring>

#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// wgsl/sprite.wgsl 의 Frame (mat4 + vec4 × 4), @binding(0)
struct FrameUniforms {
  float view_proj[16];
  std::array<float, 4> right, up, eye, fog;
};
static_assert(sizeof(FrameUniforms) == 128);
constexpr uint32_t FRAME_BINDING = 0, ATLAS_BINDING = 1, SAMPLER_BINDING = 2;

// 사각형 — 삼각형 둘의 귀 (-0.5…0.5)
constexpr float CORNERS[] = {-0.5f, -0.5f, 0.5f, -0.5f, 0.5f, 0.5f, -0.5f, -0.5f, 0.5f, 0.5f, -0.5f, 0.5f};
constexpr gpu::VertexAttribute CORNER_ATTRIBUTES[] = {{0, 2, 0}};
constexpr gpu::VertexAttribute INSTANCE_ATTRIBUTES[] = {{1, 4, 0}, {2, 4, 16}, {3, 4, 32}, {4, 4, 48}, {5, 4, 64}};
constexpr gpu::VertexBufferLayout LAYOUTS[] = {{2 * sizeof(float), gpu::VertexStep::vertex, CORNER_ATTRIBUTES},
                                               {80, gpu::VertexStep::instance, INSTANCE_ATTRIBUTES}};

/** 한 단계 아래 밉 — 2×2 의 평균. 색은 알파로 무게를 줘 비친 곳의 검은 바탕이 가장자리로 번지지 않게 한다 */
std::vector<std::byte> halve(std::span<const std::byte> pixels, uint32_t size) {
  const uint32_t half = size / 2;
  std::vector<std::byte> out(static_cast<size_t>(half) * half * 4);
  for (uint32_t y = 0; y < half; ++y)
    for (uint32_t x = 0; x < half; ++x) {
      float color[3]{}, alpha = 0.0f;
      for (uint32_t i = 0; i < 4; ++i) {
        const size_t at = ((static_cast<size_t>(y) * 2 + i / 2) * size + x * 2 + i % 2) * 4;
        const float a = static_cast<float>(pixels[at + 3]);
        for (int c = 0; c < 3; ++c) color[c] += static_cast<float>(pixels[at + c]) * (a + 1.0f);
        alpha += a;
      }
      const size_t to = (static_cast<size_t>(y) * half + x) * 4;
      const float weight = alpha + 4.0f;
      for (int c = 0; c < 3; ++c) out[to + c] = static_cast<std::byte>(std::clamp(color[c] / weight + 0.5f, 0.0f, 255.0f));
      out[to + 3] = static_cast<std::byte>(std::clamp(alpha / 4.0f + 0.5f, 0.0f, 255.0f));
    }
  return out;
}

}  // namespace

bool SpriteBatch::create(gpu::Device& device, ShaderLibrary& shaders) {
  const auto shader = shaders.resolve(shaders.add(shaders::sprite));
  blend_pipeline_ = device.create_pipeline({.shader = shader, .vertex_buffers = LAYOUTS, .depth_test = true, .alpha_blend = true, .depth_write = false});
  add_pipeline_ = device.create_pipeline({.shader = shader, .vertex_buffers = LAYOUTS, .depth_test = true, .additive_blend = true, .depth_write = false});
  frame_uniforms_ = device.create_buffer({gpu::BufferUsage::uniform, sizeof(FrameUniforms)});
  corners_ = device.create_buffer({gpu::BufferUsage::vertex, sizeof CORNERS, CORNERS});
  instances_ = device.create_buffer({gpu::BufferUsage::vertex, CAPACITY * sizeof(Instance)});
  // 칸을 넘어 이웃 프레임을 읽지 않게 가장자리에서 멈춘다
  sampler_ = device.create_sampler({.filter = gpu::Filter::linear, .mip_linear = true});
  upload_.reserve(CAPACITY);
  order_.reserve(CAPACITY);
  return blend_pipeline_ && add_pipeline_ && frame_uniforms_ && corners_ && instances_ && sampler_;
}

bool SpriteBatch::upload(gpu::Device& device, uint32_t size, std::span<const std::span<const std::byte>> layers) {
  atlas_ = {};
  const size_t bytes = static_cast<size_t>(size) * size * 4;
  if (layers.empty() || size >> (MIP_LEVELS - 1) == 0) return false;
  for (const auto& layer : layers)
    if (layer.size() != bytes) return false;
  const auto atlas = device.create_texture({.width = size,
                                            .height = size,
                                            .pixels = {},
                                            .format = gpu::TextureFormat::rgba8,
                                            .mip_levels = MIP_LEVELS,
                                            .layers = static_cast<uint32_t>(layers.size())});
  if (!atlas) return false;
  for (uint32_t index = 0; index < layers.size(); ++index) {
    if (!device.write_texture(atlas, index, 0, layers[index])) return false;
    std::vector<std::byte> level(layers[index].begin(), layers[index].end());
    for (uint32_t mip = 1, side = size; mip < MIP_LEVELS; ++mip, side /= 2) {
      level = halve(level, side);
      if (!device.write_texture(atlas, index, mip, level)) return false;
    }
  }
  atlas_ = atlas;
  return true;
}

void SpriteBatch::draw(gpu::Device& device, const SpriteView& view, std::span<const Sprite> sprites) {
  if (!atlas_ || sprites.empty()) return;
  const auto count = static_cast<uint32_t>(std::min<size_t>(sprites.size(), CAPACITY));
  // 섞는 것은 먼 것부터, 더하는 것은 그 뒤에 (차례가 상관없다)
  order_.clear();
  for (uint32_t i = 0; i < count; ++i) order_.push_back(i);
  const auto distance = [&](uint32_t i) {
    const Vec3 d = sprites[i].center - view.eye;
    return dot(d, d);
  };
  std::stable_sort(order_.begin(), order_.end(), [&](uint32_t a, uint32_t b) {
    if (sprites[a].additive != sprites[b].additive) return !sprites[a].additive;
    return !sprites[a].additive && distance(a) > distance(b);
  });
  upload_.clear();
  uint32_t blended = 0;
  for (const uint32_t i : order_) {
    const Sprite& s = sprites[i];
    blended += s.additive ? 0 : 1;
    upload_.push_back({{s.center.x, s.center.y, s.center.z, s.size},
                       {s.axis.x, s.axis.y, s.axis.z, s.length},
                       {s.layer, s.frame, s.columns, s.rows},
                       {s.red, s.green, s.blue, s.alpha},
                       {s.rotation, s.additive ? 1.0f : 0.0f, 0.0f, 0.0f}});
  }
  FrameUniforms uniforms{};
  std::memcpy(uniforms.view_proj, view.view_proj.m.data(), sizeof uniforms.view_proj);
  uniforms.right = {view.right.x, view.right.y, view.right.z, 0.0f};
  uniforms.up = {view.up.x, view.up.y, view.up.z, 0.0f};
  uniforms.eye = {view.eye.x, view.eye.y, view.eye.z, 0.0f};
  uniforms.fog = {view.fog_color.x, view.fog_color.y, view.fog_color.z, view.fog_distance};
  device.write_buffer(frame_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  device.write_buffer(instances_, std::as_bytes(std::span{upload_}));
  const gpu::BufferHandle buffers[] = {corners_, instances_};
  const gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}};
  const gpu::TextureBinding textures[] = {{ATLAS_BINDING, atlas_}};
  const gpu::SamplerBinding samplers[] = {{SAMPLER_BINDING, sampler_}};
  if (blended)
    device.draw({.pipeline = blend_pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = 6, .instance_count = blended, .textures = textures, .samplers = samplers});
  if (count > blended)
    device.draw({.pipeline = add_pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = 6, .instance_count = count - blended, .textures = textures, .samplers = samplers, .first_instance = blended});
}

}  // namespace engine
