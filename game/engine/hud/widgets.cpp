#include "engine/hud/widgets.hpp"

#include <algorithm>
#include <cmath>
#include <optional>
#include <utility>

namespace engine::hud {
namespace {

/** 위젯의 바탕 — 눌림과 가리킴에 따라 */
Color surface(const Ui& ui, const Theme& theme, Id id, bool disabled) {
  if (disabled || ui.hover != id) return theme.surface;
  return ui.pressed == id ? theme.active : theme.hover;
}

/** 위젯의 테두리 — 포커스를 가졌으면 포커스 색, 아니면 얇은 테두리 (Theme::line 의 알파가 0 이면 없다) */
std::optional<Color> border(const Ui& ui, const Theme& theme, Id id, bool disabled) {
  if (ui.focus == id && !disabled) return theme.focus;
  return theme.line.alpha > 0.0f ? std::optional{theme.line} : std::nullopt;
}

/** 포커스를 가졌을 때만 두르는 테두리 — 제 테두리가 없는 위젯(스위치 줄, 슬라이더) */
std::optional<Color> focus_ring(const Ui& ui, const Theme& theme, Id id, bool disabled) {
  return ui.focus == id && !disabled ? std::optional{theme.focus} : std::nullopt;
}

/** 커서 한 칸의 크기 (단위)와 줄마다의 폭 (칸) — 왼쪽 위가 끝인 화살촉 */
constexpr float CURSOR_STEP = 0.5f;
constexpr int CURSOR_ROWS[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 5, 3, 1};

}  // namespace

Element button(const Ui& ui, const Theme& theme, Id id, std::string_view label, bool disabled) {
  Element element = box({.padding = theme.padding, .padding_x = theme.padding_x, .background = disabled ? std::nullopt : std::optional{surface(ui, theme, id, disabled)},
                         .outline = border(ui, theme, id, disabled)},
                        text(label, disabled ? theme.muted : theme.text, theme.size, theme.face));
  element.control = {.kind = Control::Kind::button, .id = id, .disabled = disabled};
  return element;
}

Element toggle(const Ui& ui, const Theme& theme, Id id, std::string_view label, bool on, bool disabled) {
  const Color ink = disabled ? theme.muted : theme.text;
  // 스위치 — 폭이 높이의 두 배. 켜짐은 손잡이의 자리(오른쪽)와 채운 바탕으로 보인다 (색만으로 가르지 않는다)
  const float knob = theme.size - 2.0f;
  const Color fill = disabled ? theme.muted : theme.accent;
  Element mark = box({.axis = Axis::stack, .width = theme.size * 2.0f, .height = theme.size, .background = on ? std::optional{fill} : std::nullopt,
                      .outline = on ? fill : theme.line.alpha > 0.0f && !disabled ? theme.line : theme.muted},
                     box({.width = knob, .height = knob, .background = on ? theme.surface : theme.muted, .anchor_x = on ? Align::end : Align::start,
                          .anchor_y = Align::center, .offset_x = on ? -1.0f : 1.0f}));
  // 줄의 바탕은 가리키거나 눌렀을 때만 깔린다
  Element element = box({.axis = Axis::row, .padding = theme.padding, .gap = theme.padding, .align = Align::center,
                         .background = !disabled && ui.hover == id ? std::optional{ui.pressed == id ? theme.active : theme.hover} : std::nullopt,
                         .outline = focus_ring(ui, theme, id, disabled)},
                        std::move(mark), text(label, ink, theme.size));
  element.control = {.kind = Control::Kind::toggle, .id = id, .disabled = disabled, .value = on ? 1.0f : 0.0f};
  return element;
}

Element slider(const Ui& ui, const Theme& theme, Id id, float value, float min, float max, float step, float width, bool disabled) {
  const float height = theme.size, thumb = theme.size * 0.5f, track = width - thumb;
  const float t = max > min ? std::clamp((value - min) / (max - min), 0.0f, 1.0f) : 0.0f;
  const Color ink = disabled ? theme.muted : theme.text;
  Element element = box({.axis = Axis::stack, .width = width, .height = height, .outline = focus_ring(ui, theme, id, disabled)},
                        box({.width = track, .height = 1, .background = theme.line, .anchor_x = Align::center, .anchor_y = Align::center}),
                        box({.width = track * t, .height = 1, .background = disabled ? theme.muted : theme.accent, .anchor_y = Align::center, .offset_x = thumb * 0.5f}),
                        box({.width = thumb, .height = height, .background = !disabled && (ui.hover == id || ui.pressed == id) ? theme.accent : ink, .offset_x = track * t}));
  element.control = {.kind = Control::Kind::slider, .id = id, .disabled = disabled, .value = value, .min = min, .max = max, .step = step, .inset = thumb * 0.5f};
  return element;
}

Element list(const Ui& ui, const Theme& theme, Id id, std::span<const std::string_view> items, int selected, float width, int rows, std::string_view empty) {
  const int count = static_cast<int>(items.size());
  const float scroll = std::clamp(ui.scroll(id), 0.0f, static_cast<float>(std::max(0, count - rows)));
  // 보이는 줄만 짓는다 — 맨 윗줄은 굴린 만큼 위로 걸쳐 나가 잘린다
  const int first = static_cast<int>(scroll);
  const int last = std::min(count, static_cast<int>(std::ceil(scroll)) + rows);
  Element lines = box({.offset_y = (static_cast<float>(first) - scroll) * theme.row});
  for (int i = first; i < last; i++) {
    const bool chosen = i == selected;
    const std::optional<Color> background =
        chosen ? std::optional{theme.active} : ui.hover == id && ui.hover_item == i ? std::optional{theme.hover} : std::nullopt;
    // 고른 줄은 바탕과 함께 왼쪽 띠로 보인다
    lines.children.push_back(box({.axis = Axis::row, .gap = theme.padding, .align = Align::center, .width = width, .height = theme.row, .background = background},
                                 box({.width = 1, .height = theme.row, .background = chosen ? std::optional{theme.accent} : std::nullopt}),
                                 text(items[static_cast<std::size_t>(i)], theme.text, theme.size)));
  }
  const float height = static_cast<float>(rows) * theme.row;
  Element element = box({.axis = Axis::stack, .width = width, .height = height, .background = theme.surface, .outline = border(ui, theme, id, false), .clip = true},
                        std::move(lines),
                        count == 0 && !empty.empty() ? box({.anchor_x = Align::center, .anchor_y = Align::center}, text(empty, theme.muted, theme.size)) : Element{},
                        // 넘치면 오른쪽에 스크롤 막대 — 보이는 몫만 한 길이로, 굴린 몫만큼 내려간 자리에
                        count > rows ? box({.width = 1, .height = height * static_cast<float>(rows) / static_cast<float>(count), .background = theme.muted,
                                            .anchor_x = Align::end, .offset_y = height * scroll / static_cast<float>(count)})
                                     : Element{});
  element.control = {.kind = Control::Kind::list, .id = id, .count = count, .selected = selected, .row_height = theme.row};
  return element;
}

Element input(const Ui& ui, const Theme& theme, Id id, std::string_view value, std::size_t max_length, float width, bool disabled) {
  const bool focused = ui.focus == id && !disabled;
  Element content = text(value, disabled ? theme.muted : theme.text, theme.size);
  // 캐럿은 글 안의 글자 경계에 둔다
  if (focused) content.caret = ui.caret >= value.size() ? value.size() : previous_boundary(value, ui.caret + 1);
  Element element = box({.padding = theme.padding, .width = width, .background = surface(ui, theme, id, disabled), .outline = border(ui, theme, id, disabled)},
                        box({.width = width - 2.0f * theme.padding, .clip = true}, std::move(content)));
  element.control = {.kind = Control::Kind::input, .id = id, .disabled = disabled, .max_length = max_length};
  return element;
}

Element cursor(const Ui& ui, Color fill, Color edge) {
  if (!ui.pointer_inside) return {};
  Element element = box({.axis = Axis::stack, .offset_x = ui.pointer_x, .offset_y = ui.pointer_y});
  // 가장자리를 먼저 깔고(한 칸씩 넓게) 그 위에 속을 그린다 — 밝은 바탕에서도 어두운 바탕에서도 보인다
  for (const bool inner : {false, true}) {
    float y = 0.0f;
    for (const int cells : CURSOR_ROWS) {
      const float width = static_cast<float>(cells) * CURSOR_STEP;
      element.children.push_back(inner ? box({.width = width, .height = CURSOR_STEP, .background = fill, .offset_y = y})
                                       : box({.width = width + 2.0f * CURSOR_STEP, .height = 3.0f * CURSOR_STEP, .background = edge, .offset_x = -CURSOR_STEP, .offset_y = y - CURSOR_STEP}));
      y += CURSOR_STEP;
    }
  }
  return element;
}

}  // namespace engine::hud
