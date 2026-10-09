#include "engine/hud/layout.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <string_view>
#include <utility>

namespace engine::hud {

Element text(std::string_view content, Color color, float size, uint32_t face) {
  Element element;
  element.kind = Element::Kind::text;
  element.content = content;
  element.color = color;
  element.size = size;
  element.face = face;
  return element;
}

Element image(Picture picture, Style style, float focus_x, float focus_y, Color tint) {
  Element element;
  element.kind = Element::Kind::image;
  element.style = std::move(style);
  element.picture = picture;
  element.focus_x = focus_x;
  element.focus_y = focus_y;
  element.color = tint;
  return element;
}

namespace {

/** 테두리와 캐럿의 두께 (단위) — 적어도 1 픽셀 */
constexpr float LINE = 0.5f;

/** 요소 하나의 크기와 그 자식들의 크기 (단위) — 요소 트리와 같은 모양. 부모를 채우는 방향(Style::fill_x·fill_y)의 크기는 배치할 때 정해진다 */
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

Color mix(Color a, Color b, float t) {
  return {a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t, a.alpha + (b.alpha - a.alpha) * t};
}

Measured measure(const Element& element, const Font& font) {
  Measured m;
  if (element.kind == Element::Kind::text) {
    m.width = font.width(element.content, element.size, element.face);
    m.height = font.line_height(element.size, element.face);
    return m;
  }
  if (element.kind == Element::Kind::none) return m;

  const Style& style = element.style;
  float main = 0.0f, cross = 0.0f;
  int shown = 0;
  m.children.reserve(element.children.size());
  for (const Element& child : element.children) {
    m.children.push_back(measure(child, font));
    if (child.kind == Element::Kind::none) continue;
    // 부모를 채우는 방향으로는 부모의 내용 크기에 들지 않는다
    const float width = child.style.fill_x ? 0.0f : m.children.back().width;
    const float height = child.style.fill_y ? 0.0f : m.children.back().height;
    if (style.axis == Axis::stack) {
      main = std::max(main, width);
      cross = std::max(cross, height);
    } else {
      main += style.axis == Axis::row ? width : height;
      cross = std::max(cross, style.axis == Axis::row ? height : width);
      shown++;
    }
  }
  if (shown > 1) main += style.gap * static_cast<float>(shown - 1);
  const float content_width = style.axis == Axis::column ? cross : main;
  const float content_height = style.axis == Axis::column ? main : cross;
  m.width = style.width > 0.0f ? style.width : content_width + 2.0f * (style.padding + style.padding_x);
  m.height = style.height > 0.0f ? style.height : content_height + 2.0f * style.padding;
  return m;
}

bool empty(const Rect& rect) { return rect.width <= 0.0f || rect.height <= 0.0f; }

struct Painter {
  float unit;
  const Font& font;
  DrawList& out;
  Regions& regions;
  // 이 가지에 걸린 변환 (Style::scale·opacity 가 조상에서부터 겹친 것) — 배치는 변환 없이 하고, 내보낼 때만 픽셀 자리 p 를 p × scale + shift 로 옮긴다
  float scale{1.0f};
  float shift_x{};
  float shift_y{};
  float opacity{1.0f};

  /** 단위 → 픽셀. 정수 픽셀에 맞춰 가장자리가 번지지 않게 한다 */
  float px(float units) const { return std::round(units * unit); }
  float line() const { return std::max(1.0f, px(LINE)); }
  Rect seen(const Rect& rect) const { return {rect.x * scale + shift_x, rect.y * scale + shift_y, rect.width * scale, rect.height * scale}; }
  Color seen(Color color) const { return {color.red, color.green, color.blue, color.alpha * opacity}; }

  /** 색 사각형 — 잘린 상자 안이면 잘라서 낸다. 남는 것이 없으면 내지 않는다 */
  void fill(Rect rect, Color color, const std::optional<Rect>& clip) const { fill(rect, color, color, Fade::down, clip); }

  /** from 에서 to 로 번지는 사각형 — 잘리면 남은 부분의 양 끝 색으로 낸다 */
  void fill(Rect rect, Color from, Color to, Fade fade, const std::optional<Rect>& clip) const {
    const Rect kept = clip ? intersect(rect, *clip) : rect;
    if (empty(kept)) return;
    const bool right = fade == Fade::right;
    const float length = right ? rect.width : rect.height;
    const float start = (right ? kept.x - rect.x : kept.y - rect.y) / length;
    const float end = start + (right ? kept.width : kept.height) / length;
    const Rect placed = seen(kept);
    DrawItem item{DrawItem::Kind::rect, placed.x, placed.y, placed.width, placed.height, seen(mix(from, to, start)), {}, 0.0f};
    item.color_end = seen(mix(from, to, end));
    item.fade = fade;
    out.push_back(std::move(item));
  }

  /** 도형을 그린 바탕 — 사각형째로 낸다 (자르지 않는다: 잘린 상자 밖으로 다 나갔을 때만 뺀다). 선의 두께는 적어도 1 픽셀 */
  void fill_shape(Rect rect, const Style& style, const std::optional<Rect>& clip) const {
    if (empty(rect) || (clip && empty(intersect(rect, *clip)))) return;
    const Rect placed = seen(rect);
    DrawItem item{DrawItem::Kind::rect, placed.x, placed.y, placed.width, placed.height, seen(*style.background), {}, 0.0f};
    item.color_end = seen(style.background_end.value_or(*style.background));
    item.fade = style.fade;
    item.shape = style.shape;
    if (style.shape == Shape::slant) item.shape_size = px(style.shape_size) * scale;
    else if (style.shape != Shape::diamond) item.shape_size = std::max(1.0f, px(style.shape_size)) * scale;
    out.push_back(std::move(item));
  }

  void place_text(Element& element, const Measured& m, float x, float y, const std::optional<Rect>& clip, std::ptrdiff_t owner) const {
    Rect rect{px(x), px(y), px(x + m.width) - px(x), px(y + m.height) - px(y)};
    std::optional<Rect> caret;
    if (element.caret) {
      const std::string_view before = std::string_view{element.content}.substr(0, *element.caret);
      caret = Rect{px(x + font.width(before, element.size, element.face)), rect.y, line(), rect.height};
      // 캐럿이 잘린 상자의 오른쪽 밖이면 그만큼 글을 왼쪽으로 민다
      const float over = clip ? caret->x + caret->width - (clip->x + clip->width) : 0.0f;
      if (over > 0.0f) {
        rect.x -= over;
        caret->x -= over;
      }
    }
    if (owner >= 0 && regions.items[owner].control.kind == Control::Kind::input) {
      Region& region = regions.items[owner];
      region.text = element.content;
      region.text_x = seen(rect).x;
      region.text_size = px(element.size) * scale;
    }
    if (!clip || !empty(intersect(rect, *clip))) {
      const Rect placed = seen(rect);
      DrawItem item{DrawItem::Kind::text, placed.x, placed.y, 0.0f, 0.0f, seen(element.color), std::move(element.content), px(element.size) * scale,
                    clip ? std::optional{seen(*clip)} : std::nullopt};
      item.face = element.face;
      out.push_back(std::move(item));
    }
    if (caret) fill(*caret, element.color, clip);
  }

  void place_image(const Element& element, Rect rect, const std::optional<Rect>& clip) const {
    const Picture& picture = element.picture;
    if (!picture.id || empty(rect)) return;
    Rect source = cover(picture.width, picture.height, rect.width, rect.height, element.focus_x, element.focus_y);
    if (empty(source) || (clip && !clip_quad(rect, source, *clip))) return;
    const Rect placed = seen(rect);
    DrawItem item{DrawItem::Kind::image, placed.x, placed.y, placed.width, placed.height, seen(element.color), {}, 0.0f};
    item.image = picture.id;
    item.source = source;
    out.push_back(std::move(item));
  }

  /** (x, y) 에 width×height (단위)로 놓는다. clip 은 이 요소를 자르는 사각형, owner 는 이 요소를 품은 가장 가까운 위젯의 regions 번호 (없으면 -1) */
  void place(Element& element, const Measured& m, float x, float y, float width, float height, const std::optional<Rect>& clip, std::ptrdiff_t owner) const {
    if (element.kind == Element::Kind::none) return;
    const Style& style = element.style;
    if (style.opacity == 1.0f && style.scale == 1.0f) return place_plain(element, m, x, y, width, height, clip, owner);
    // 이 가지에 변환을 건다 — 이 상자 안의 origin 자리(변환 전의 픽셀)를 붙박고 키운다: p → origin + (p − origin) × k 를 지금까지의 변환에 잇는다
    Painter inner = *this;
    inner.opacity = opacity * style.opacity;
    const float origin_x = aligned(style.origin_x, px(x), px(x + width) - px(x), 0.0f), origin_y = aligned(style.origin_y, px(y), px(y + height) - px(y), 0.0f);
    inner.scale = scale * style.scale;
    inner.shift_x = shift_x + scale * origin_x * (1.0f - style.scale);
    inner.shift_y = shift_y + scale * origin_y * (1.0f - style.scale);
    inner.place_plain(element, m, x, y, width, height, clip, owner);
  }

  void place_plain(Element& element, const Measured& m, float x, float y, float width, float height, const std::optional<Rect>& clip, std::ptrdiff_t owner) const {
    if (element.kind == Element::Kind::text) return place_text(element, m, x, y, clip, owner);

    const Style& style = element.style;
    const Rect rect{px(x), px(y), px(x + width) - px(x), px(y + height) - px(y)};
    if (element.kind == Element::Kind::image) return place_image(element, rect, clip);
    if (style.background && style.shape != Shape::rect) fill_shape(rect, style, clip);
    else if (style.background) fill(rect, *style.background, style.background_end.value_or(*style.background), style.fade, clip);
    if (element.control.kind != Control::Kind::none) {
      owner = static_cast<std::ptrdiff_t>(regions.items.size());
      regions.items.push_back({.control = element.control,
                               .rect = seen(rect),
                               .visible = seen(clip ? intersect(rect, *clip) : rect),
                               .row_height = px(element.control.row_height) * scale,
                               .inset = px(element.control.inset) * scale});
    }
    const std::optional<Rect> inner_clip = !style.clip ? clip : clip ? intersect(rect, *clip) : rect;

    place_children(element, m, x, y, width, height, inner_clip, owner);
    // 테두리는 자식 위에 — 안을 가득 채운 자식(고른 줄의 바탕)에 가리지 않는다
    if (style.outline) {
      const float t = line();
      fill({rect.x, rect.y, rect.width, t}, *style.outline, clip);
      fill({rect.x, rect.y + rect.height - t, rect.width, t}, *style.outline, clip);
      fill({rect.x, rect.y + t, t, rect.height - 2.0f * t}, *style.outline, clip);
      fill({rect.x + rect.width - t, rect.y + t, t, rect.height - 2.0f * t}, *style.outline, clip);
    }
  }

  void place_children(Element& element, const Measured& m, float x, float y, float width, float height, const std::optional<Rect>& clip, std::ptrdiff_t owner) const {
    const Style& style = element.style;
    const float pad_x = style.padding + style.padding_x;
    const float inner_x = x + pad_x, inner_y = y + style.padding;
    const float inner_width = width - 2.0f * pad_x, inner_height = height - 2.0f * style.padding;
    if (style.axis == Axis::stack) {
      for (std::size_t i = 0; i < element.children.size(); i++) {
        Element& child = element.children[i];
        const float w = child.style.fill_x ? inner_width : m.children[i].width;
        const float h = child.style.fill_y ? inner_height : m.children[i].height;
        place(child, m.children[i], aligned(child.style.anchor_x, inner_x, inner_width, w) + child.style.offset_x,
              aligned(child.style.anchor_y, inner_y, inner_height, h) + child.style.offset_y, w, h, clip, owner);
      }
      return;
    }

    const bool row = style.axis == Axis::row;
    const float room = row ? inner_width : inner_height;
    // 늘어놓는 방향으로 부모를 채우는 자식들이 남는 자리를 고르게 나눈다
    float used = 0.0f;
    int shown = 0, filling = 0;
    for (std::size_t i = 0; i < element.children.size(); i++) {
      const Element& child = element.children[i];
      if (child.kind == Element::Kind::none) continue;
      shown++;
      if (row ? child.style.fill_x : child.style.fill_y) filling++;
      else used += row ? m.children[i].width : m.children[i].height;
    }
    if (shown > 1) used += style.gap * static_cast<float>(shown - 1);
    const float share = filling ? std::max(0.0f, room - used) / static_cast<float>(filling) : 0.0f;
    float cursor = filling ? (row ? inner_x : inner_y) : aligned(style.justify, row ? inner_x : inner_y, room, used);
    for (std::size_t i = 0; i < element.children.size(); i++) {
      Element& child = element.children[i];
      if (child.kind == Element::Kind::none) continue;
      const Measured& c = m.children[i];
      if (row) {
        const float w = child.style.fill_x ? share : c.width, h = child.style.fill_y ? inner_height : c.height;
        place(child, c, cursor, aligned(style.align, inner_y, inner_height, h), w, h, clip, owner);
        cursor += w + style.gap;
      } else {
        const float w = child.style.fill_x ? inner_width : c.width, h = child.style.fill_y ? share : c.height;
        place(child, c, aligned(style.align, inner_x, inner_width, w), cursor, w, h, clip, owner);
        cursor += h + style.gap;
      }
    }
  }
};

}  // namespace

Rect intersect(const Rect& a, const Rect& b) {
  const float left = std::max(a.x, b.x), top = std::max(a.y, b.y);
  const float right = std::min(a.x + a.width, b.x + b.width), bottom = std::min(a.y + a.height, b.y + b.height);
  return {left, top, std::max(0.0f, right - left), std::max(0.0f, bottom - top)};
}

bool clip_quad(Rect& placement, Rect& cell, const Rect& clip) {
  const Rect kept = intersect(placement, clip);
  if (empty(kept)) return false;
  const float scale_x = cell.width / placement.width, scale_y = cell.height / placement.height;
  cell = {cell.x + (kept.x - placement.x) * scale_x, cell.y + (kept.y - placement.y) * scale_y, kept.width * scale_x, kept.height * scale_y};
  placement = kept;
  return true;
}

Rect cover(float width, float height, float box_width, float box_height, float focus_x, float focus_y) {
  if (!(width > 0.0f) || !(height > 0.0f) || !(box_width > 0.0f) || !(box_height > 0.0f)) return {};
  // 상자를 덮는 가장 작은 배율 — 그 배율에서 상자만 한 부분이 보인다
  const float scale = std::max(box_width / width, box_height / height);
  const float shown_width = box_width / scale, shown_height = box_height / scale;
  return {(width - shown_width) * std::clamp(focus_x, 0.0f, 1.0f), (height - shown_height) * std::clamp(focus_y, 0.0f, 1.0f), shown_width, shown_height};
}

void layout(Element root, Viewport viewport, const Font& font, DrawList& out, Regions& regions) {
  out.clear();
  regions.items.clear();
  regions.unit = viewport.unit;
  if (viewport.unit <= 0.0f) return;
  const Measured m = measure(root, font);
  Painter{viewport.unit, font, out, regions}.place(root, m, 0.0f, 0.0f, viewport.width / viewport.unit, viewport.height / viewport.unit, std::nullopt, -1);
}

}  // namespace engine::hud
