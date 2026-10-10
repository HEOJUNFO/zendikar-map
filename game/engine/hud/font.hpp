#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string_view>
#include <vector>

namespace engine::hud {

/**
 * UTF-8 글의 맨 앞 글자 하나를 떼어 낸다 — text 는 그만큼 줄어든다. 빈 글이면 0.
 * 잘못된 바이트(끊긴 글자, 돌려 쓴 긴 표기, 대리 영역, U+10FFFF 초과)는 한 바이트씩 U+FFFD 로 낸다
 */
char32_t take_codepoint(std::string_view& text);

/** 글꼴 면의 번호 — 한 글꼴에 든 굵기·구운 크기가 다른 글자 묶음. 0 이 기본 면이고, 없는 번호는 0 으로 친다 */
using Face = uint32_t;

/**
 * 글꼴 하나 — 면(굵기·구운 크기)마다 글자들의 아틀라스(그림 한 장) 칸과 놓이는 자리. 글자를 재는 쪽(배치)과 그리는 쪽(engine/render 의 Overlay)이 같이 쓴다.
 * 데이터는 tools/fontc.mjs 가 구운 .fontbin 이다. 어떤 글꼴인지, 면마다 어떤 글자를 갖는지는 넘기는 쪽이 정한다
 */
class Font {
 public:
  /** .fontbin 의 글자 하나 (24 바이트). 치수는 구운 크기에서의 픽셀 */
  struct Glyph {
    uint32_t code;
    /** 아틀라스의 칸 */
    uint16_t x, y, width, height;
    /** 펜 자리에서 칸의 왼쪽까지, 줄 위에서 칸의 위까지 */
    float left, top;
    /** 다음 글자까지 펜이 나아가는 거리 */
    float advance;
  };

  /** .fontbin 을 푼다. 형식이 어긋나면 nullopt. 아틀라스는 베끼지 않는다 — bytes 는 글꼴보다 오래 살아야 한다 */
  static std::optional<Font> decode(std::span<const std::byte> bytes);

  /** 면의 수 (적어도 1) */
  Face faces() const { return static_cast<Face>(faces_.size()); }
  bool has(char32_t code, Face face = 0) const;
  /** 그 면에 없는 글자는 그 면의 '?' 의 것 ('?' 도 없으면 자리를 차지하지 않는 빈 글자) */
  const Glyph& glyph(char32_t code, Face face = 0) const;

  /** 그 면을 구운 글자 크기 (픽셀) — 다른 크기는 여기서 늘이고 줄인다 */
  float size(Face face = 0) const { return at(face).size; }
  /** 글자 크기 size 로 한 줄에 놓은 UTF-8 글의 폭 (글자마다 나아감의 합). 단위는 size 의 단위를 따른다 */
  float width(std::string_view text, float size, Face face = 0) const;
  /** 글자 크기 size 일 때 한 줄의 높이 */
  float line_height(float size, Face face = 0) const { return at(face).line_height * size / at(face).size; }

  /** 아틀라스 — 한 픽셀 한 바이트(덮인 정도), 윗줄부터. (0,0)–(1,1) 의 2×2 는 가득 찬 칸이다 */
  uint32_t atlas_width() const { return atlas_width_; }
  uint32_t atlas_height() const { return atlas_height_; }
  std::span<const std::byte> atlas() const { return atlas_; }

 private:
  struct FaceData {
    float size{};
    float line_height{};
    // glyphs_ 에서 이 면의 글자들 (코드 순)
    std::size_t first{};
    std::size_t count{};
    Glyph fallback{};
  };
  const FaceData& at(Face face) const { return faces_[face < faces_.size() ? face : 0]; }

  uint32_t atlas_width_{};
  uint32_t atlas_height_{};
  std::vector<FaceData> faces_;
  // 면 차례로, 면 안에서는 코드 순
  std::vector<Glyph> glyphs_;
  std::span<const std::byte> atlas_;
};

}  // namespace engine::hud
