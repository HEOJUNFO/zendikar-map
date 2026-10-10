#pragma once

#include <optional>
#include <string>
#include <vector>

#include "engine/foundation/color.hpp"
#include "engine/hud/element.hpp"
#include "engine/hud/font.hpp"

namespace engine::hud {

struct Viewport {
  /** 화면 크기 (픽셀) */
  float width;
  float height;
  /** 단위 하나의 픽셀 크기 */
  float unit;
  constexpr bool operator==(const Viewport&) const = default;
};

/** 화면의 사각형 (픽셀, 왼쪽 위가 원점) */
struct Rect {
  float x{}, y{}, width{}, height{};
  constexpr bool contains(float px, float py) const { return px >= x && px < x + width && py >= y && py < y + height; }
  constexpr bool operator==(const Rect&) const = default;
};

/** 두 사각형이 겹치는 부분 — 겹치지 않으면 폭이나 높이가 0 */
Rect intersect(const Rect& a, const Rect& b);

/**
 * 그릴 사각형(placement)을 clip 안으로 줄이고, 거기 입힌 그림 칸(cell)도 같은 비율로 줄인다 — 잘린 글자가 찌그러지지 않는다.
 * 남는 것이 없으면 false
 */
bool clip_quad(Rect& placement, Rect& cell, const Rect& clip);

/**
 * width×height 그림이 box_width×box_height 상자를 비율을 지키며 가득 덮을 때 상자에 보이는 그림의 부분 (그림 픽셀).
 * 넘치는 쪽에서 (focus_x, focus_y) (0..1) 가 가리키는 자리가 남는다 — 0 이면 왼쪽·위, 1 이면 오른쪽·아래 끝을 남긴다
 */
Rect cover(float width, float height, float box_width, float box_height, float focus_x, float focus_y);

/** 그릴 것 하나 — 픽셀 좌표 (왼쪽 위가 원점). 목록의 차례대로 덮어 그린다 */
struct DrawItem {
  enum class Kind { rect, text, image };

  Kind kind;
  float x, y;
  /** rect·image 의 크기 */
  float width, height;
  /** rect 의 색(번지는 바탕이면 시작 색), text 의 색, image 에 곱하는 색 */
  Color color;
  /** text — (x, y) 는 줄의 왼쪽 위. 내용(UTF-8)과 글자 크기(픽셀) */
  std::string content;
  float size;
  /** text — 이 밖은 그리지 않는다 (rect·image 는 배치가 이미 잘라서 낸다) */
  std::optional<Rect> clip{};
  /** text — 글꼴의 면 */
  uint32_t face{};
  /** rect — 번지는 바탕의 끝 색과 방향. 번지지 않으면 color 와 같다 */
  Color color_end{};
  Fade fade{Fade::down};
  /** image — 그림의 번호와 이 사각형에 입힐 그림의 부분 (그림 픽셀) */
  uint32_t image{};
  Rect source{};
  /** rect — 사각형 안에 그릴 도형과 그 치수 (픽셀 — ring·chevron 은 선의 두께, slant 는 윗변이 비껴 난 거리). 여느 사각형이면 Shape::rect */
  Shape shape{Shape::rect};
  float shape_size{};
};

using DrawList = std::vector<DrawItem>;

/** 위젯 하나가 화면에서 차지한 자리 — 입력을 대 보는 데 쓴다 (interaction.hpp) */
struct Region {
  Control control;
  Rect rect;
  /** rect 에서 잘리지 않고 보이는 부분 — 포인터는 여기에만 닿는다 */
  Rect visible;
  /** list 의 줄 높이, slider 의 양 끝 여백 (픽셀) */
  float row_height{};
  float inset{};
  /** input — 글과 그 글이 놓인 자리(왼쪽 끝), 글자 크기 (픽셀) */
  std::string text{};
  float text_x{};
  float text_size{};
};

/** 배치된 위젯들 — 트리의 차례(= 화면의 차례, 뒤의 것이 위에 그려진다) */
struct Regions {
  /** 배치할 때의 단위 크기 (픽셀) */
  float unit{};
  std::vector<Region> items;
};

/**
 * 트리를 화면 전체에 배치한다 — 뿌리는 화면 크기를 갖는다. 글자의 크기는 font 로 잰다. out 과 regions 는 비우고 채운다.
 * 트리의 글자는 out 으로 옮겨 간다. 잘린 상자(Style::clip) 밖으로 다 나간 것은 out 에 넣지 않는다
 */
void layout(Element root, Viewport viewport, const Font& font, DrawList& out, Regions& regions);

}  // namespace engine::hud
