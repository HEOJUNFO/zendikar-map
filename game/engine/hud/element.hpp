#pragma once

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

struct Style {
  Axis axis{Axis::column};
  float padding{};
  /** 자식 사이 (column·row) */
  float gap{};
  /** 늘어놓는 방향으로 남는 자리에서의 위치 */
  Align justify{Align::start};
  /** 그 수직 방향에서의 위치 */
  Align align{Align::start};
  /** 0 이면 내용에 맞춘다 */
  float width{};
  float height{};
  std::optional<Color> background{};
  /** 부모가 stack 일 때 부모 안에서의 자리와 거기서 옮기는 양 (오른쪽·아래가 양수) */
  Align anchor_x{Align::start};
  Align anchor_y{Align::start};
  float offset_x{};
  float offset_y{};
};

struct Element {
  enum class Kind { none, box, text };

  Kind kind{Kind::none};
  Style style;
  std::vector<Element> children;
  std::string content;
  Color color;
  /** 글자 점 하나의 크기 (단위) */
  float scale{1.0f};
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

Element text(std::string_view content, Color color, float scale = 1.0f);

}  // namespace engine::hud
