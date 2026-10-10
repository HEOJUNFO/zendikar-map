#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

#include "engine/foundation/color.hpp"

// HUD 엔진 — 화면 위 UI 를 요소 트리로 적고(선언), 배치해서, 그리기 목록으로 만든다.
// 게임을 모른다: 어떤 요소를 어떻게 쌓을지는 쓰는 쪽이 상태에서 요소를 돌려주는 함수(컴포넌트)로 정한다.
//   상태 → 컴포넌트 → Element 트리 → layout() → DrawList → (engine/render 의 Overlay 가 그린다)
// 길이는 모두 '단위'다 — 화면에 그릴 때 단위 하나가 몇 픽셀인지는 layout() 이 받는다.
namespace engine::hud {

/** 자식을 늘어놓는 방향. stack 은 자식을 겹쳐 놓고 저마다의 anchor 로 자리를 잡는다 */
enum class Axis { column, row, stack };
enum class Align { start, center, end };
/** 바탕색이 번져 가는 방향 — 위에서 아래로, 왼쪽에서 오른쪽으로 */
enum class Fade { down, right };
/**
 * 바탕의 모양 — 상자(사각형) 안에 그리는 도형. 기울어진 가장자리는 그리는 쪽이 한 픽셀에 걸쳐 부드럽게 한다 (계단이 지지 않는다).
 *   diamond: 상자의 네 변 가운데를 잇는 마름모 · ring: 그 마름모의 테 (선의 두께 Style::shape_size, 안쪽으로)
 *   chevron_left·chevron_right: 꺾쇠 — 꼭짓점이 상자의 왼쪽·오른쪽 변 가운데에 있고 두 팔이 맞은편 두 귀로 간다 (‹ · ›). 선의 두께는 shape_size, 꼭짓점의 맞은편으로.
 *     폭 w·높이 2h 의 chevron_left 는 폭 2w·높이 2h 인 ring 의 왼쪽 절반과 같다
 *   slant: 비스듬한 칸(평행사변형) — 윗변이 아랫변보다 shape_size 만큼 오른쪽에 있다 (음수면 왼쪽). 위아래 변은 상자의 것 그대로
 *   pointer: 북쪽을 향한 화살촉 — shape_size 는 시계 방향 회전각(라디안). banner·skull 은 단색 표식이다.
 */
enum class Shape { rect, diamond, ring, chevron_left, chevron_right, slant, pointer, banner, skull };

struct Style {
  Axis axis{Axis::column};
  float padding{};
  /** 좌우에만 더하는 안쪽 여백 */
  float padding_x{};
  /** 자식 사이 (column·row) */
  float gap{};
  /** 늘어놓는 방향으로 남는 자리에서의 위치 */
  Align justify{Align::start};
  /** 그 수직 방향에서의 위치 */
  Align align{Align::start};
  /** 0 이면 내용에 맞춘다 */
  float width{};
  float height{};
  /**
   * 부모의 안쪽을 그 방향으로 다 채운다 (width·height 보다 앞선다). 부모가 stack 이면 부모의 안쪽 크기,
   * row·column 이면 늘어놓는 방향으로는 남는 자리(여럿이면 고르게 나눈다), 그 수직 방향으로는 안쪽 크기.
   * 부모의 크기가 내용에 맞춰질 때는 이 요소를 뺀 내용으로 맞춘다
   */
  bool fill_x{};
  bool fill_y{};
  std::optional<Color> background{};
  /** 있으면 바탕이 background 에서 이 색으로 고르게 번져 간다 (fade 방향) */
  std::optional<Color> background_end{};
  Fade fade{Fade::down};
  /** 상자 가장자리 안쪽에 두르는 테두리 (두께는 배치가 정한다) */
  std::optional<Color> outline{};
  /**
   * 바탕(background)의 모양과 그 치수 (단위 — ring·chevron 은 선의 두께, slant 는 윗변이 비껴 난 거리; pointer 는 라디안). 테두리(outline)와 자식은 그대로 사각형 상자를 따른다.
   * ceiling: 잘린 상자(clip) 안의 도형은 자르지 않는다 — 다 밖으로 나갔을 때만 빠진다. 넘치는 목록 안에 도형을 둘 일이 생기면 그리는 쪽에 자르는 사각형을 넘긴다
   */
  Shape shape{Shape::rect};
  float shape_size{};
  /** 바탕과 테두리를 상자 중심에서 시계 방향으로 돌린다(라디안). 장식 표식용이며 자식·입력 영역은 돌리지 않는다 */
  float rotation{};
  /** 이 상자 밖으로 나가는 자손은 잘라 낸다 (넘치는 목록, 긴 입력 글) */
  bool clip{};
  /** 부모가 stack 일 때 부모 안에서의 자리와 거기서 옮기는 양 (오른쪽·아래가 양수) */
  Align anchor_x{Align::start};
  Align anchor_y{Align::start};
  float offset_x{};
  float offset_y{};
  /** 이 요소와 자손을 함께 옅게 한다 — 그리는 색의 알파에 곱한다 (자손의 것과 겹쳐 곱해진다) */
  float opacity{1.0f};
  /**
   * 이 요소와 자손을 함께 키우거나 줄여 그린다 — 이 상자 안의 origin 자리를 붙박아 놓고. 배치(크기 재기, 이웃의 자리)는 그대로다: 그린 것만 달라져 이웃을 밀지 않는다.
   * 잠깐 커졌다 돌아오는 강조에 쓴다. 자손의 것과 겹쳐 곱해지고, 그 안의 위젯이 닿는 자리도 같이 옮겨진다
   */
  float scale{1.0f};
  Align origin_x{Align::center};
  Align origin_y{Align::center};
};

/** 누르고 고르는 요소(위젯)의 식별자 — 쓰는 쪽이 정한다. 0 은 없음 */
using Id = uint32_t;

/**
 * 상자를 포인터·글쇠가 닿는 위젯으로 만드는 것 — 배치가 이 상자의 자리를 Region 으로 적고, Interaction 이 거기에 입력을 대 본다.
 * 값(켜짐, 고른 줄, 글)은 쓰는 쪽 상태의 것을 그대로 적는다 — 위젯은 값을 갖지 않고, 바꾸라는 사건만 낸다
 */
struct Control {
  enum class Kind { none, button, toggle, slider, list, input };

  Kind kind{Kind::none};
  Id id{};
  /** 닿지 않고 포커스도 받지 않는다 */
  bool disabled{};
  /** toggle: 켜짐 1·꺼짐 0. slider: 지금 값과 범위, 한 칸(0 이면 칸 없이 이어진 값) */
  float value{};
  float min{};
  float max{};
  float step{};
  /** slider: 양 끝에서 값이 닿지 않는 폭 (손잡이의 절반, 단위) */
  float inset{};
  /** list: 줄 수와 고른 줄(-1 은 없음), 줄 높이 (단위) */
  int count{};
  int selected{-1};
  float row_height{};
  /** input: 글자 수의 상한 (0 이면 없음) */
  std::size_t max_length{};
  bool operator==(const Control&) const = default;
};

/** 그림 한 장 — 그리는 쪽(engine/render 의 Overlay::add_image)이 준 번호와 그 그림의 크기 (픽셀). id 0 은 없음 */
struct Picture {
  uint32_t id{};
  float width{};
  float height{};
  constexpr bool operator==(const Picture&) const = default;
};

struct Element {
  enum class Kind { none, box, text, image };

  Kind kind{Kind::none};
  Style style;
  /** box 만 */
  Control control;
  std::vector<Element> children;
  std::string content;
  Color color;
  /** 글자 크기 (단위) — 줄 높이는 글꼴이 정한다 (Font::line_height) */
  float size{};
  /** text — 글꼴의 면 (Font 의 Face: 굵기·구운 크기) */
  uint32_t face{};
  /** image — 그림과, 상자의 비율이 그림과 다를 때 잘려도 남길 자리 (0..1, 그림의 왼쪽 위가 0) */
  Picture picture;
  float focus_x{0.5f};
  float focus_y{0.5f};
  /** text — 캐럿을 그릴 자리 (글의 바이트 위치). 잘린 상자 안이면 캐럿이 보이게 글을 왼쪽으로 민다 */
  std::optional<std::size_t> caret{};
};

/** 자식을 담는 상자. 빈 요소(Element{})인 자식은 없는 것으로 친다 — 조건에 따라 빼고 넣는 데 쓴다. 자식은 옮겨 담는다 */
template <class... Children>
Element box(Style style, Children&&... children) {
  Element element;
  element.kind = Element::Kind::box;
  element.style = std::move(style);
  element.children.reserve(sizeof...(children));
  (element.children.push_back(std::forward<Children>(children)), ...);
  return element;
}

/** content 는 UTF-8 한 줄. face 는 글꼴의 면 */
Element text(std::string_view content, Color color, float size, uint32_t face = 0);

/**
 * 그림 — style 의 크기(width·height·fill)만 한 상자를 그림이 비율을 지키며 가득 덮고, 넘치는 쪽은 잘린다 (cover).
 * (focus_x, focus_y) 는 잘려도 남길 자리 (0..1). 그림에 색(tint)을 곱한다 — 알파로 비치게 할 수 있다. 자식은 없다
 */
Element image(Picture picture, Style style, float focus_x = 0.5f, float focus_y = 0.5f, Color tint = {1.0f, 1.0f, 1.0f});

}  // namespace engine::hud
