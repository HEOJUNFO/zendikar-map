#pragma once

#include <cstddef>
#include <span>
#include <string_view>

#include "engine/foundation/color.hpp"
#include "engine/hud/element.hpp"
#include "engine/hud/interaction.hpp"

// 위젯 — 누르고 고르는 요소를 짓는 함수들. 여느 컴포넌트처럼 받은 값만으로 요소를 돌려준다:
// 값(켜짐, 고른 줄, 글)은 쓰는 쪽 상태에서, 가리킴·눌림·포커스는 Ui 에서 온다. 입력이 닿으면 Interaction 이 id 를 단 사건을 낸다.
// 돌려받은 요소의 style(폭, 부모 안에서의 자리)은 쓰는 쪽이 고쳐도 된다
namespace engine::hud {

/** 위젯의 색과 치수 — 쓰는 쪽이 정한다. 같은 위젯도 Theme 을 달리 주면 다른 양식이 된다 (채운 단추와 테두리만 있는 단추) */
struct Theme {
  /** 글자 */
  Color text;
  /** 쓸 수 없는 위젯의 글자, 꺼진 스위치의 손잡이, 스크롤 막대 */
  Color muted;
  /** 위젯의 바탕 (단추, 목록, 입력 칸), 켜진 스위치의 손잡이 */
  Color surface;
  /** 포인터가 올라간 바탕 */
  Color hover;
  /** 눌린 바탕, 목록에서 고른 줄 */
  Color active;
  /** 켜진 스위치, 슬라이더가 찬 만큼, 고른 줄의 표시 */
  Color accent;
  /** 위젯의 얇은 테두리, 슬라이더의 길, 꺼진 스위치의 테두리. 알파가 0 이면 테두리를 두르지 않는다 */
  Color line{0.0f, 0.0f, 0.0f, 0.0f};
  /** 포커스를 가진 위젯의 테두리 */
  Color focus;
  /** 글자 크기와 안쪽 여백, 목록의 줄 높이 (단위) */
  float size;
  float padding;
  float row;
  /** 단추의 좌우에 더하는 안쪽 여백 */
  float padding_x{};
  /** 단추 글자의 글꼴 면 */
  uint32_t face{};
};

/** 누르는 단추 — 누르면 press. 쓸 수 없으면 바탕 없이 테두리와 흐린 글자만 남는다 */
Element button(const Ui& ui, const Theme& theme, Id id, std::string_view label, bool disabled = false);

/**
 * 켜고 끄는 스위치와 그 옆의 글 — 누르면 change (새 값 1 또는 0). 켜지면 손잡이가 오른쪽으로 가고 스위치가 채워진다.
 * 상태를 글로도 보이려면 label 에 그 상태의 말(켬·끔)을 준다
 */
Element toggle(const Ui& ui, const Theme& theme, Id id, std::string_view label, bool on, bool disabled = false);

/** min…max 의 값을 고르는 막대 (폭 width) — 누르거나 끌거나 좌우 화살표로 change. step 이 0 이면 칸 없이 이어진 값 */
Element slider(const Ui& ui, const Theme& theme, Id id, float value, float min, float max, float step, float width, bool disabled = false);

/**
 * 한 줄씩 고르는 목록 — rows 줄만큼 보이고 넘치면 굴린다(휠, 위아래 화살표). 줄을 누르면 select, Enter 는 press.
 * 비었으면 empty 를 보인다
 */
Element list(const Ui& ui, const Theme& theme, Id id, std::span<const std::string_view> items, int selected, float width, int rows, std::string_view empty = {});

/** 한 줄 글 입력 (폭 width) — 글이 바뀔 때마다 edit (새 글), Enter 는 press. max_length 는 글자 수의 상한 (0 이면 없음) */
Element input(const Ui& ui, const Theme& theme, Id id, std::string_view value, std::size_t max_length, float width, bool disabled = false);

/** 포인터 자리의 화살표 커서 — 포인터가 화면 밖이면 빈 요소. stack 의 맨 끝 자식으로 넣어 다른 것 위에 그린다 */
Element cursor(const Ui& ui, Color fill, Color edge);

}  // namespace engine::hud
