#pragma once

#include <string>
#include <vector>

#include "engine/foundation/color.hpp"
#include "engine/hud/element.hpp"

namespace engine::hud {

/** 글꼴의 치수 (글자 scale 1 일 때의 단위) — 글자를 그리는 쪽이 알려 준다 */
struct TextMetrics {
  float glyph_width;
  /** 글자 한 칸이 차지하는 폭 (글자 + 사이) */
  float advance;
  float height;
  constexpr bool operator==(const TextMetrics&) const = default;
};

struct Viewport {
  /** 화면 크기 (픽셀) */
  float width;
  float height;
  /** 단위 하나의 픽셀 크기 */
  float unit;
  constexpr bool operator==(const Viewport&) const = default;
};

/** 그릴 것 하나 — 픽셀 좌표 (왼쪽 위가 원점). 목록의 차례대로 덮어 그린다 */
struct DrawItem {
  enum class Kind { rect, text };

  Kind kind;
  float x, y;
  /** rect 의 크기 */
  float width, height;
  Color color;
  /** text 의 내용과 점 하나의 픽셀 크기 */
  std::string content;
  float scale;
};

using DrawList = std::vector<DrawItem>;

/** 트리를 화면 전체에 배치한다 — 뿌리는 화면 크기를 갖는다. out 은 비우고 채운다. 트리의 글자는 out 으로 옮겨 간다 */
void layout(Element root, Viewport viewport, TextMetrics metrics, DrawList& out);

}  // namespace engine::hud
