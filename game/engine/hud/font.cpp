#include "engine/hud/font.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace engine::hud {
namespace {

constexpr std::size_t HEADER_BYTES = 12;
constexpr std::size_t FACE_BYTES = 16;
// 터무니없는 크기의 데이터는 읽기 전에 거절한다
constexpr uint32_t MAX_FACES = 16;
constexpr uint32_t MAX_GLYPHS = 100000;

template <class T>
T read(std::span<const std::byte> bytes, std::size_t at) {
  T value;
  std::memcpy(&value, bytes.data() + at, sizeof(value));
  return value;
}

/** 코드 순으로 놓인 글자들에서 찾는다. 없으면 nullptr */
const Font::Glyph* find(std::span<const Font::Glyph> glyphs, char32_t code) {
  const auto found = std::lower_bound(glyphs.begin(), glyphs.end(), code, [](const Font::Glyph& g, char32_t c) { return g.code < c; });
  return found != glyphs.end() && found->code == code ? &*found : nullptr;
}

}  // namespace

char32_t take_codepoint(std::string_view& text) {
  if (text.empty()) return 0;
  const auto byte = [&](std::size_t at) { return static_cast<uint8_t>(text[at]); };
  const uint8_t lead = byte(0);
  const std::size_t length = lead < 0x80 ? 1 : (lead >> 5) == 0b110 ? 2 : (lead >> 4) == 0b1110 ? 3 : (lead >> 3) == 0b11110 ? 4 : 0;
  bool ok = length != 0 && text.size() >= length;
  char32_t code = length == 1 ? lead : lead & (0x7F >> length);
  for (std::size_t at = 1; ok && at < length; at++) {
    ok = (byte(at) & 0xC0) == 0x80;
    code = (code << 6) | (byte(at) & 0x3F);
  }
  // 그 길이로 적을 수 있는 가장 작은 값 — 이보다 작으면 더 짧게 적었어야 하는 글자다
  constexpr char32_t SMALLEST[] = {0, 0, 0x80, 0x800, 0x10000};
  if (ok) ok = code >= SMALLEST[length] && code <= 0x10FFFF && !(code >= 0xD800 && code <= 0xDFFF);
  if (!ok) {
    text.remove_prefix(1);
    return 0xFFFD;
  }
  text.remove_prefix(length);
  return code;
}

std::optional<Font> Font::decode(std::span<const std::byte> bytes) {
  static_assert(sizeof(Glyph) == 24);
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKFT", 4) != 0) return std::nullopt;
  Font font;
  font.atlas_width_ = read<uint16_t>(bytes, 4);
  font.atlas_height_ = read<uint16_t>(bytes, 6);
  const uint32_t face_count = read<uint32_t>(bytes, 8);
  if (face_count == 0 || face_count > MAX_FACES || bytes.size() < HEADER_BYTES + face_count * FACE_BYTES) return std::nullopt;
  std::size_t glyph_count = 0;
  for (uint32_t i = 0; i < face_count; i++) {
    const std::size_t at = HEADER_BYTES + i * FACE_BYTES;
    FaceData face{.size = read<float>(bytes, at), .line_height = read<float>(bytes, at + 4), .first = glyph_count, .count = read<uint32_t>(bytes, at + 12)};
    // 크기로 나누고 곱한다 — 0 이나 숫자가 아닌 값은 배치를 망가뜨린다
    if (!(face.size > 0.0f) || !(face.line_height > 0.0f) || !std::isfinite(face.size) || !std::isfinite(face.line_height)) return std::nullopt;
    if (face.count > MAX_GLYPHS) return std::nullopt;
    glyph_count += face.count;
    font.faces_.push_back(face);
  }
  const std::size_t table = HEADER_BYTES + face_count * FACE_BYTES;
  const std::size_t glyph_bytes = glyph_count * sizeof(Glyph);
  const std::size_t atlas_bytes = static_cast<std::size_t>(font.atlas_width_) * font.atlas_height_;
  if (bytes.size() != table + glyph_bytes + atlas_bytes) return std::nullopt;

  font.glyphs_.resize(glyph_count);
  if (glyph_bytes) std::memcpy(font.glyphs_.data(), bytes.data() + table, glyph_bytes);
  for (FaceData& face : font.faces_) {
    const std::span<const Glyph> glyphs = std::span{font.glyphs_}.subspan(face.first, face.count);
    for (std::size_t i = 0; i < glyphs.size(); i++) {
      const Glyph& g = glyphs[i];
      // 코드 순이어야 찾을 수 있다
      if (i > 0 && g.code <= glyphs[i - 1].code) return std::nullopt;
      if (g.x + g.width > font.atlas_width_ || g.y + g.height > font.atlas_height_) return std::nullopt;
      if (!std::isfinite(g.left) || !std::isfinite(g.top) || !std::isfinite(g.advance) || g.advance < 0.0f) return std::nullopt;
    }
    if (const Glyph* question = find(glyphs, U'?')) face.fallback = *question;
  }
  font.atlas_ = bytes.subspan(table + glyph_bytes);
  return font;
}

bool Font::has(char32_t code, Face face) const {
  const FaceData& data = at(face);
  return find(std::span{glyphs_}.subspan(data.first, data.count), code) != nullptr;
}

const Font::Glyph& Font::glyph(char32_t code, Face face) const {
  const FaceData& data = at(face);
  const Glyph* found = find(std::span{glyphs_}.subspan(data.first, data.count), code);
  return found ? *found : data.fallback;
}

float Font::width(std::string_view text, float size, Face face) const {
  float advance = 0.0f;
  while (!text.empty()) advance += glyph(take_codepoint(text), face).advance;
  return advance * size / this->size(face);
}

}  // namespace engine::hud
