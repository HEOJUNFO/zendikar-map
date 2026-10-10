#include "engine/render/overlay.hpp"

#include <cmath>
#include <cstddef>
#include <span>

#include "engine/render/quad_geometry.hpp"
#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// overlay.wgsl 의 Surface (vec4 16), @binding(0)
struct SurfaceUniforms {
  /** xy 화면 크기, zw 아틀라스 크기 (픽셀) */
  std::array<float, 4> size;
};
constexpr uint32_t SURFACE_BINDING = 0;
// 글리프 아틀라스나 그림 (image.wgsl 도 같은 번호를 쓴다)
constexpr uint32_t TEXTURE_BINDING = 1;
constexpr uint32_t SAMPLER_BINDING = 2;

/** 아틀라스의 가득 찬 칸(2×2)의 한가운데 — 크기 0 인 칸이라 사각형 어디서나 덮인 정도 1 을 읽는다 */
constexpr std::array<float, 4> SOLID_CELL{1.0f, 1.0f, 0.0f, 0.0f};

std::array<float, 4> rgba(Color color) { return {color.red, color.green, color.blue, color.alpha}; }

}  // namespace

bool Overlay::create(gpu::Device& device, ShaderLibrary& shaders, const hud::Font& font) {
  // 0..1 사각형의 위치만 쓴다 (법선은 읽지 않는다)
  static constexpr gpu::VertexAttribute CORNER_ATTRIBUTES[] = {{0, 3, offsetof(MeshVertex, position)}};
  static constexpr gpu::VertexAttribute QUAD_ATTRIBUTES[] = {
      {1, 4, offsetof(Quad, placement)},
      {2, 4, offsetof(Quad, cell)},
      {3, 4, offsetof(Quad, tint)},
      {4, 4, offsetof(Quad, tint_end)},
      {5, 1, offsetof(Quad, fade)},
      {6, 2, offsetof(Quad, shape)},
      {7, 1, offsetof(Quad, rotation)},
  };
  static constexpr gpu::VertexBufferLayout LAYOUTS[] = {
      {sizeof(MeshVertex), gpu::VertexStep::vertex, CORNER_ATTRIBUTES},
      {sizeof(Quad), gpu::VertexStep::instance, QUAD_ATTRIBUTES},
  };
  font_ = &font;
  pipeline_ = device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::overlay)), .vertex_buffers = LAYOUTS, .depth_test = false, .alpha_blend = true, .target = gpu::Target::canvas});
  image_pipeline_ = device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::image)), .vertex_buffers = LAYOUTS, .depth_test = false, .alpha_blend = true, .target = gpu::Target::canvas});
  atlas_ = device.create_texture({font.atlas_width(), font.atlas_height(), font.atlas()});
  if (!pipeline_ || !image_pipeline_ || !atlas_) return false;
  sampler_ = device.create_sampler({gpu::Filter::linear});
  surface_uniforms_ = device.create_buffer({gpu::BufferUsage::uniform, sizeof(SurfaceUniforms)});
  const std::span<const MeshVertex> corners = unit_quad();
  corners_ = device.create_buffer({gpu::BufferUsage::vertex, corners.size_bytes(), corners.data()});
  quads_ = device.create_buffer({gpu::BufferUsage::vertex, CAPACITY * sizeof(Quad)});
  pending_.reserve(CAPACITY);
  return true;
}

uint32_t Overlay::add_image(gpu::Device& device, uint32_t width, uint32_t height, std::span<const std::byte> rgba) {
  const gpu::TextureHandle texture = device.create_texture({width, height, rgba, gpu::TextureFormat::rgba8});
  if (!texture) return 0;
  images_.push_back(texture);
  return static_cast<uint32_t>(images_.size());
}

void Overlay::submit(const hud::DrawList& items) {
  for (const hud::DrawItem& item : items) {
    switch (item.kind) {
      case hud::DrawItem::Kind::rect:
        push({{item.x, item.y, item.width, item.height}, SOLID_CELL, rgba(item.color), rgba(item.color_end), item.fade == hud::Fade::right ? 1.0f : 0.0f,
              {static_cast<float>(item.shape), item.shape_size}, item.rotation},
             0);
        break;
      case hud::DrawItem::Kind::text: text(item.x, item.y, item.size, item.content, item.color, item.face, item.clip); break;
      case hud::DrawItem::Kind::image:
        // 올린 적 없는 번호는 그리지 않는다
        if (item.image && item.image <= images_.size())
          push({{item.x, item.y, item.width, item.height}, {item.source.x, item.source.y, item.source.width, item.source.height}, rgba(item.color), rgba(item.color), 0.0f, {}}, item.image);
        break;
    }
  }
}

void Overlay::push(const Quad& quad, uint32_t image) {
  if (pending_.size() >= CAPACITY) return;
  if (runs_.empty() || runs_.back().image != image) runs_.push_back({image, static_cast<uint32_t>(pending_.size()), 0});
  runs_.back().count++;
  pending_.push_back(quad);
}

void Overlay::text(float x, float y, float size, std::string_view text, Color color, uint32_t face, const std::optional<hud::Rect>& clip) {
  const float scale = size / font_->size(face);
  const std::array<float, 4> tint = rgba(color);
  while (!text.empty()) {
    const hud::Font::Glyph& glyph = font_->glyph(hud::take_codepoint(text), face);
    // 빈 칸(띄어쓰기)은 나아가기만 한다. 칸의 왼쪽 위는 정수 픽셀에 맞춘다 — 구운 크기 그대로일 때 글자가 번지지 않는다
    hud::Rect placement{std::round(x + glyph.left * scale), std::round(y + glyph.top * scale), static_cast<float>(glyph.width) * scale, static_cast<float>(glyph.height) * scale};
    hud::Rect cell{static_cast<float>(glyph.x), static_cast<float>(glyph.y), static_cast<float>(glyph.width), static_cast<float>(glyph.height)};
    if (glyph.width && glyph.height && (!clip || hud::clip_quad(placement, cell, *clip)))
      push({{placement.x, placement.y, placement.width, placement.height}, {cell.x, cell.y, cell.width, cell.height}, tint, tint, 0.0f, {}}, 0);
    x += glyph.advance * scale;
  }
}

void Overlay::flush(gpu::Device& device) {
  if (pending_.empty()) return;
  const SurfaceUniforms uniforms{{static_cast<float>(device.width()), static_cast<float>(device.height()), static_cast<float>(font_->atlas_width()),
                                  static_cast<float>(font_->atlas_height())}};
  device.write_buffer(surface_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  // 버퍼는 한 프레임에 한 번만 쓴다 — 모두 올려 두고 텍스처가 같은 구간씩 그린다
  device.write_buffer(quads_, std::as_bytes(std::span{pending_}));
  const gpu::BufferHandle buffers[] = {corners_, quads_};
  const gpu::BufferBinding bindings[] = {{SURFACE_BINDING, surface_uniforms_}};
  const gpu::SamplerBinding samplers[] = {{SAMPLER_BINDING, sampler_}};
  for (const Run& run : runs_) {
    const gpu::TextureBinding textures[] = {{TEXTURE_BINDING, run.image ? images_[run.image - 1] : atlas_}};
    device.draw({.pipeline = run.image ? image_pipeline_ : pipeline_,
                 .vertex_buffers = buffers,
                 .bindings = bindings,
                 .vertex_count = static_cast<uint32_t>(unit_quad().size()),
                 .instance_count = run.count,
                 .textures = textures,
                 .samplers = samplers,
                 .first_instance = run.first});
  }
  pending_.clear();
  runs_.clear();
}

}  // namespace engine
