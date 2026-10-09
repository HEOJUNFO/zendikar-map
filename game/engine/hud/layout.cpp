#include "engine/hud/layout.hpp"

#include <algorithm>
#include <cmath>
#include <utility>

namespace engine::hud {

Element text(std::string_view content, Color color, float scale) {
  Element element;
  element.kind = Element::Kind::text;
  element.content = content;
  element.color = color;
  element.scale = scale;
  return element;
}

namespace {

/** 요소 하나의 크기와 그 자식들의 크기 (단위) — 요소 트리와 같은 모양 */
struct Measured {
  float width{};
  float height{};
  std::vector<Measured> children;
};

float aligned(Align align, float start, float room, float size) {
  if (align == Align::center) return start + (room - size) * 0.5f;
  if (align == Align::end) return start + room - size;
  return start;
}

Measured measure(const Element& element, const TextMetrics& metrics) {
  Measured m;
  if (element.kind == Element::Kind::text) {
    const float count = static_cast<float>(element.content.size());
    m.width = count > 0.0f ? ((count - 1.0f) * metrics.advance + metrics.glyph_width) * element.scale : 0.0f;
    m.height = metrics.height * element.scale;
    return m;
  }
  if (element.kind == Element::Kind::none) return m;

  const Style& style = element.style;
  float main = 0.0f, cross = 0.0f;
  int shown = 0;
  m.children.reserve(element.children.size());
  for (const Element& child : element.children) {
    m.children.push_back(measure(child, metrics));
    if (child.kind == Element::Kind::none) continue;
    const Measured& c = m.children.back();
    if (style.axis == Axis::stack) {
      main = std::max(main, c.width);
      cross = std::max(cross, c.height);
    } else {
      main += style.axis == Axis::row ? c.width : c.height;
      cross = std::max(cross, style.axis == Axis::row ? c.height : c.width);
      shown++;
    }
  }
  if (shown > 1) main += style.gap * static_cast<float>(shown - 1);
  const float content_width = style.axis == Axis::column ? cross : main;
  const float content_height = style.axis == Axis::column ? main : cross;
  m.width = style.width > 0.0f ? style.width : content_width + 2.0f * style.padding;
  m.height = style.height > 0.0f ? style.height : content_height + 2.0f * style.padding;
  return m;
}

struct Painter {
  float unit;
  DrawList& out;

  /** 단위 → 픽셀. 정수 픽셀에 맞춰 가장자리가 번지지 않게 한다 */
  float px(float units) const { return std::round(units * unit); }

  void place(Element& element, const Measured& m, float x, float y) const {
    if (element.kind == Element::Kind::none) return;
    if (element.kind == Element::Kind::text) {
      out.push_back({DrawItem::Kind::text, px(x), px(y), 0.0f, 0.0f, element.color, std::move(element.content), px(element.scale)});
      return;
    }
    const Style& style = element.style;
    if (style.background)
      out.push_back({DrawItem::Kind::rect, px(x), px(y), px(x + m.width) - px(x), px(y + m.height) - px(y), *style.background, {}, 0.0f});

    const float inner_x = x + style.padding, inner_y = y + style.padding;
    const float inner_width = m.width - 2.0f * style.padding, inner_height = m.height - 2.0f * style.padding;
    if (style.axis == Axis::stack) {
      for (std::size_t i = 0; i < element.children.size(); i++) {
        Element& child = element.children[i];
        const Measured& c = m.children[i];
        place(child, c, aligned(child.style.anchor_x, inner_x, inner_width, c.width) + child.style.offset_x,
              aligned(child.style.anchor_y, inner_y, inner_height, c.height) + child.style.offset_y);
      }
      return;
    }

    const bool row = style.axis == Axis::row;
    float used = 0.0f;
    int shown = 0;
    for (std::size_t i = 0; i < element.children.size(); i++) {
      if (element.children[i].kind == Element::Kind::none) continue;
      used += row ? m.children[i].width : m.children[i].height;
      shown++;
    }
    if (shown > 1) used += style.gap * static_cast<float>(shown - 1);
    float cursor = aligned(style.justify, row ? inner_x : inner_y, row ? inner_width : inner_height, used);
    for (std::size_t i = 0; i < element.children.size(); i++) {
      Element& child = element.children[i];
      if (child.kind == Element::Kind::none) continue;
      const Measured& c = m.children[i];
      if (row) {
        place(child, c, cursor, aligned(style.align, inner_y, inner_height, c.height));
        cursor += c.width + style.gap;
      } else {
        place(child, c, aligned(style.align, inner_x, inner_width, c.width), cursor);
        cursor += c.height + style.gap;
      }
    }
  }
};

}  // namespace

void layout(Element root, Viewport viewport, TextMetrics metrics, DrawList& out) {
  out.clear();
  if (viewport.unit <= 0.0f) return;
  Measured m = measure(root, metrics);
  m.width = viewport.width / viewport.unit;
  m.height = viewport.height / viewport.unit;
  Painter{viewport.unit, out}.place(root, m, 0.0f, 0.0f);
}

}  // namespace engine::hud
