#include "engine/render/overlay.hpp"

#include <array>
#include <span>

#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// overlay.wgsl 의 Surface (vec4 16), @binding(0)
struct SurfaceUniforms {
  std::array<float, 4> size;
};
constexpr uint32_t SURFACE_BINDING = 0;

/** 글자 하나 — 위에서 아래로 일곱 줄, 줄마다 다섯 점 (가장 왼쪽 점이 0b10000) */
using Glyph = std::array<uint8_t, 7>;

constexpr Glyph LETTERS[26] = {
    {0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001},  // A
    {0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110},  // B
    {0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110},  // C
    {0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110},  // D
    {0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111},  // E
    {0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000},  // F
    {0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111},  // G
    {0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001},  // H
    {0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110},  // I
    {0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100},  // J
    {0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001},  // K
    {0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111},  // L
    {0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001},  // M
    {0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001},  // N
    {0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110},  // O
    {0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000},  // P
    {0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101},  // Q
    {0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001},  // R
    {0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110},  // S
    {0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100},  // T
    {0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110},  // U
    {0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100},  // V
    {0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001},  // W
    {0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001},  // X
    {0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100},  // Y
    {0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111},  // Z
};
constexpr Glyph DIGITS[10] = {
    {0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110},  // 0
    {0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110},  // 1
    {0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111},  // 2
    {0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110},  // 3
    {0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010},  // 4
    {0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110},  // 5
    {0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110},  // 6
    {0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000},  // 7
    {0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110},  // 8
    {0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100},  // 9
};
constexpr Glyph BLANK{};
constexpr Glyph PERIOD{0, 0, 0, 0, 0, 0b01100, 0b01100};
constexpr Glyph COMMA{0, 0, 0, 0, 0b01100, 0b00100, 0b01000};
constexpr Glyph EXCLAMATION{0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100};
constexpr Glyph HYPHEN{0, 0, 0, 0b11111, 0, 0, 0};
constexpr Glyph COLON{0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0};

/** 글꼴에 없는 글자는 빈 칸 */
const Glyph& glyph_for(char c) {
  if (c >= 'a' && c <= 'z') return LETTERS[c - 'a'];
  if (c >= 'A' && c <= 'Z') return LETTERS[c - 'A'];
  if (c >= '0' && c <= '9') return DIGITS[c - '0'];
  switch (c) {
    case '.': return PERIOD;
    case ',': return COMMA;
    case '!': return EXCLAMATION;
    case '-': return HYPHEN;
    case ':': return COLON;
    default: return BLANK;
  }
}

}  // namespace

bool Overlay::create(gpu::Device& device, ShaderLibrary& shaders) {
  pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::overlay)), InstanceBatch::vertex_layouts(), false});
  if (!pipeline_) return false;
  surface_uniforms_ = device.create_buffer({gpu::BufferUsage::uniform, sizeof(SurfaceUniforms)});
  quads_.create(device, unit_quad(), CAPACITY);
  pending_.reserve(CAPACITY);
  return true;
}

void Overlay::submit(const hud::DrawList& items) {
  for (const hud::DrawItem& item : items) {
    if (item.kind == hud::DrawItem::Kind::rect) rect(item.x, item.y, item.width, item.height, item.color);
    else text(item.x, item.y, item.scale, item.content, item.color);
  }
}

void Overlay::rect(float x, float y, float width, float height, Color color) {
  pending_.push_back({{x, y, width, height}, {color.red, color.green, color.blue, 1.0f}});
}

void Overlay::text(float x, float y, float scale, std::string_view text, Color color) {
  for (const char c : text) {
    const Glyph& glyph = glyph_for(c);
    for (int row = 0; row < 7; row++) {
      // 이어진 점들은 사각형 하나로
      for (int column = 0; column < 5;) {
        if (!(glyph[static_cast<std::size_t>(row)] & (0b10000 >> column))) {
          column++;
          continue;
        }
        int end = column;
        while (end < 5 && (glyph[static_cast<std::size_t>(row)] & (0b10000 >> end))) end++;
        rect(x + static_cast<float>(column) * scale, y + static_cast<float>(row) * scale, static_cast<float>(end - column) * scale, scale, color);
        column = end;
      }
    }
    x += TEXT_METRICS.advance * scale;
  }
}

void Overlay::flush(gpu::Device& device) {
  if (pending_.empty()) return;
  const SurfaceUniforms uniforms{{static_cast<float>(device.width()), static_cast<float>(device.height()), 0.0f, 0.0f}};
  device.write_buffer(surface_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const gpu::BufferBinding bindings[] = {{SURFACE_BINDING, surface_uniforms_}};
  quads_.draw(device, pipeline_, bindings, pending_);
  pending_.clear();
}

}  // namespace engine
