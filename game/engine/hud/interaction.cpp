#include "engine/hud/interaction.hpp"

#include <algorithm>
#include <cmath>
#include <utility>

namespace engine::hud {
namespace {

using Kind = Control::Kind;

bool reachable(const Region& region) { return !region.control.disabled && region.visible.width > 0.0f && region.visible.height > 0.0f; }

const Region* find(const Regions& regions, Id id) {
  if (!id) return nullptr;
  for (const Region& region : regions.items)
    if (region.control.id == id && reachable(region)) return &region;
  return nullptr;
}

/** (x, y) 에 닿는 위젯 — 겹치면 위에 그려진(뒤에 배치된) 것 */
const Region* hit(const Regions& regions, float x, float y) {
  for (auto region = regions.items.rbegin(); region != regions.items.rend(); ++region)
    if (reachable(*region) && region->visible.contains(x, y)) return &*region;
  return nullptr;
}

/** 목록에 한 번에 보이는 줄 수와 굴릴 수 있는 끝 (줄) */
float visible_rows(const Region& list) { return list.row_height > 0.0f ? list.rect.height / list.row_height : 0.0f; }
float scroll_limit(const Region& list) { return std::max(0.0f, static_cast<float>(list.control.count) - visible_rows(list)); }

/** 목록에서 y 에 놓인 줄 — 줄이 없는 자리면 -1 */
int row_at(const Region& list, float scroll, float y) {
  if (list.row_height <= 0.0f) return -1;
  const int row = static_cast<int>(std::floor((y - list.rect.y) / list.row_height + scroll));
  return row >= 0 && row < list.control.count ? row : -1;
}

/** 슬라이더에서 x 가 가리키는 값 — 한 칸(step)에 맞춘다 */
float slider_value(const Region& slider, float x) {
  const Control& c = slider.control;
  const float track = slider.rect.width - 2.0f * slider.inset;
  const float t = track > 0.0f ? std::clamp((x - slider.rect.x - slider.inset) / track, 0.0f, 1.0f) : 0.0f;
  const float value = c.min + t * (c.max - c.min);
  return c.step > 0.0f ? std::min(c.max, c.min + std::round((value - c.min) / c.step) * c.step) : value;
}

/** 입력 글에서 x 에 가장 가까운 글자 경계 */
std::size_t caret_at(const Region& input, const Font& font, float x) {
  const std::string_view text = input.text;
  std::size_t best = 0;
  float best_distance = std::abs(x - input.text_x);
  for (std::size_t at = 0; at < text.size();) {
    at = next_boundary(text, at);
    const float distance = std::abs(x - (input.text_x + font.width(text.substr(0, at), input.text_size)));
    if (distance >= best_distance) continue;
    best = at;
    best_distance = distance;
  }
  return best;
}

std::size_t count_codepoints(std::string_view text) {
  std::size_t count = 0;
  for (; !text.empty(); count++) take_codepoint(text);
  return count;
}

/** 글자 하나를 내는 글쇠인가 — 이름("Enter", "Shift")이나 제어 문자가 아닌 것 */
bool printable(std::string_view key) {
  const char32_t code = take_codepoint(key);
  return key.empty() && code >= 0x20 && code != 0x7F;
}

}  // namespace

float Ui::scroll(Id id) const {
  for (const Scroll& scroll : scrolls)
    if (scroll.id == id) return scroll.rows;
  return 0.0f;
}

std::size_t previous_boundary(std::string_view text, std::size_t caret) {
  std::size_t boundary = 0;
  for (std::string_view rest = text; !rest.empty();) {
    take_codepoint(rest);
    const std::size_t at = text.size() - rest.size();
    if (at >= caret) break;
    boundary = at;
  }
  return boundary;
}

std::size_t next_boundary(std::string_view text, std::size_t caret) {
  for (std::string_view rest = text; !rest.empty();) {
    take_codepoint(rest);
    const std::size_t at = text.size() - rest.size();
    if (at > caret) return at;
  }
  return text.size();
}

void Interaction::set_scroll(Id id, float rows) {
  for (Ui::Scroll& scroll : ui_.scrolls) {
    if (scroll.id != id) continue;
    scroll.rows = rows;
    return;
  }
  ui_.scrolls.push_back({id, rows});
}

void Interaction::hover(const Regions& regions) {
  const Region* over = hit(regions, x_, y_);
  ui_.hover = over ? over->control.id : 0;
  ui_.hover_item = over && over->control.kind == Kind::list ? row_at(*over, ui_.scroll(ui_.hover), y_) : -1;
}

std::vector<Event> Interaction::pointer_move(const Regions& regions, float x, float y) {
  x_ = x;
  y_ = y;
  ui_.pointer_inside = true;
  if (regions.unit > 0.0f) {
    ui_.pointer_x = x / regions.unit;
    ui_.pointer_y = y / regions.unit;
  }
  hover(regions);
  const Region* pressed = find(regions, ui_.pressed);
  if (pressed && pressed->control.kind == Kind::slider) {
    const float value = slider_value(*pressed, x);
    if (value != pressed->control.value) return {{.kind = Event::Kind::change, .id = ui_.pressed, .value = value}};
  }
  return {};
}

void Interaction::clear() {
  ui_.hover = 0;
  ui_.hover_item = -1;
  ui_.pressed = 0;
}

void Interaction::pointer_leave() {
  clear();
  ui_.pointer_inside = false;
}

std::vector<Event> Interaction::pointer_press(const Regions& regions, const Font& font) {
  const Region* over = hit(regions, x_, y_);
  ui_.pressed = ui_.focus = over ? over->control.id : 0;
  if (!over) return {};
  const Control& c = over->control;
  if (c.kind == Kind::slider) {
    const float value = slider_value(*over, x_);
    if (value != c.value) return {{.kind = Event::Kind::change, .id = c.id, .value = value}};
  } else if (c.kind == Kind::list) {
    const int row = row_at(*over, ui_.scroll(c.id), y_);
    if (row >= 0 && row != c.selected) return {{.kind = Event::Kind::select, .id = c.id, .item = row}};
  } else if (c.kind == Kind::input) {
    ui_.caret = caret_at(*over, font, x_);
  }
  return {};
}

std::vector<Event> Interaction::pointer_release(const Regions& regions) {
  const Id pressed = std::exchange(ui_.pressed, 0);
  const Region* over = hit(regions, x_, y_);
  if (!over || !pressed || over->control.id != pressed) return {};
  if (over->control.kind == Kind::button) return {{.kind = Event::Kind::press, .id = pressed}};
  if (over->control.kind == Kind::toggle) return {{.kind = Event::Kind::change, .id = pressed, .value = over->control.value != 0.0f ? 0.0f : 1.0f}};
  return {};
}

void Interaction::wheel(const Regions& regions, float delta) {
  for (auto region = regions.items.rbegin(); region != regions.items.rend(); ++region) {
    if (region->control.kind != Kind::list || !reachable(*region) || !region->visible.contains(x_, y_)) continue;
    if (region->row_height <= 0.0f) return;
    set_scroll(region->control.id, std::clamp(ui_.scroll(region->control.id) + delta / region->row_height, 0.0f, scroll_limit(*region)));
    // 굴리면 포인터 밑의 줄이 바뀐다
    hover(regions);
    return;
  }
}

void Interaction::move_focus(const Regions& regions, int direction) {
  const std::ptrdiff_t count = static_cast<std::ptrdiff_t>(regions.items.size());
  std::ptrdiff_t at = direction > 0 ? -1 : count;
  for (std::ptrdiff_t i = 0; i < count; i++)
    if (regions.items[i].control.id == ui_.focus && ui_.focus) at = i;
  // 한 바퀴 안에서 닿을 수 있는 다음 위젯 — 끝에서는 처음으로 돈다
  for (std::ptrdiff_t step = 0; step < count; step++) {
    at = ((at + direction) % count + count) % count;
    const Region& region = regions.items[at];
    if (!reachable(region)) continue;
    ui_.focus = region.control.id;
    if (region.control.kind == Kind::input) ui_.caret = region.text.size();
    return;
  }
}

std::vector<Event> Interaction::key(const Regions& regions, const Font& font, std::string_view code, std::string_view key, uint32_t modifiers, bool repeat) {
  if (modifiers & (KEY_CTRL | KEY_ALT | KEY_META)) return {};
  if (code == "Tab") {
    move_focus(regions, modifiers & KEY_SHIFT ? -1 : 1);
    return {};
  }
  const bool enter = code == "Enter" || code == "NumpadEnter";
  if (const Region* focused = find(regions, ui_.focus)) {
    const Control& c = focused->control;
    const Id id = c.id;
    switch (c.kind) {
      case Kind::none: break;
      case Kind::button:
        if (enter || code == "Space") return repeat ? std::vector<Event>{} : std::vector<Event>{{.kind = Event::Kind::press, .id = id}};
        break;
      case Kind::toggle:
        if (enter || code == "Space")
          return repeat ? std::vector<Event>{} : std::vector<Event>{{.kind = Event::Kind::change, .id = id, .value = c.value != 0.0f ? 0.0f : 1.0f}};
        break;
      case Kind::slider: {
        // 칸이 없는 슬라이더는 범위의 1/10 씩
        const float step = c.step > 0.0f ? c.step : (c.max - c.min) / 10.0f;
        float value = c.value;
        if (code == "ArrowLeft") value = std::max(c.min, c.value - step);
        else if (code == "ArrowRight") value = std::min(c.max, c.value + step);
        else if (code == "Home") value = c.min;
        else if (code == "End") value = c.max;
        else break;
        if (value != c.value) return {{.kind = Event::Kind::change, .id = id, .value = value}};
        return {};
      }
      case Kind::list: {
        if (enter) return repeat ? std::vector<Event>{} : std::vector<Event>{{.kind = Event::Kind::press, .id = id, .item = c.selected}};
        const int last = c.count - 1;
        const int page = std::max(1, static_cast<int>(visible_rows(*focused)));
        int row = c.selected;
        if (code == "ArrowUp") row = c.selected < 0 ? last : c.selected - 1;
        else if (code == "ArrowDown") row = c.selected + 1;
        else if (code == "PageUp") row = c.selected - page;
        else if (code == "PageDown") row = c.selected + page;
        else if (code == "Home") row = 0;
        else if (code == "End") row = last;
        else break;
        if (last < 0) return {};
        row = std::clamp(row, 0, last);
        // 고른 줄이 보이는 데까지만 굴린다
        const float top = static_cast<float>(row);
        const float scroll = std::max(std::min(ui_.scroll(id), top), top + 1.0f - visible_rows(*focused));
        set_scroll(id, std::clamp(scroll, 0.0f, scroll_limit(*focused)));
        if (row != c.selected) return {{.kind = Event::Kind::select, .id = id, .item = row}};
        return {};
      }
      case Kind::input: {
        const std::string& text = focused->text;
        // 캐럿은 글 안의 글자 경계에 둔다 — 글이 밖에서 바뀌었을 수 있다
        const std::size_t caret = ui_.caret >= text.size() ? text.size() : previous_boundary(text, ui_.caret + 1);
        ui_.caret = caret;
        if (enter) return repeat ? std::vector<Event>{} : std::vector<Event>{{.kind = Event::Kind::press, .id = id}};
        if (code == "ArrowLeft") ui_.caret = previous_boundary(text, caret);
        else if (code == "ArrowRight") ui_.caret = next_boundary(text, caret);
        else if (code == "Home") ui_.caret = 0;
        else if (code == "End") ui_.caret = text.size();
        else if (code == "Backspace" || code == "Delete") {
          const std::size_t from = code == "Backspace" ? previous_boundary(text, caret) : caret;
          const std::size_t to = code == "Backspace" ? caret : next_boundary(text, caret);
          if (from == to) return {};
          ui_.caret = from;
          return {{.kind = Event::Kind::edit, .id = id, .text = std::string{text}.erase(from, to - from)}};
        } else if (printable(key)) return type(regions, font, key);
        else break;
        return {};
      }
    }
  }
  if (code == "ArrowUp") move_focus(regions, -1);
  else if (code == "ArrowDown") move_focus(regions, 1);
  return {};
}

std::vector<Event> Interaction::type(const Regions& regions, const Font& font, std::string_view utf8) {
  const Region* focused = find(regions, ui_.focus);
  if (!focused || focused->control.kind != Kind::input) return {};
  const std::string& text = focused->text;
  const std::size_t caret = ui_.caret >= text.size() ? text.size() : previous_boundary(text, ui_.caret + 1);
  const std::size_t limit = focused->control.max_length;
  std::size_t length = count_codepoints(text);
  std::string added;
  while (!utf8.empty() && (!limit || length < limit)) {
    const std::string_view before = utf8;
    const char32_t code = take_codepoint(utf8);
    // 제어 문자와 그릴 수 없는 글자(글꼴에 없는 것, 잘못된 바이트)는 넣지 않는다
    if (code < 0x20 || code == 0x7F || !font.has(code)) continue;
    added += before.substr(0, before.size() - utf8.size());
    length++;
  }
  if (added.empty()) return {};
  ui_.caret = caret + added.size();
  return {{.kind = Event::Kind::edit, .id = focused->control.id, .text = std::string{text}.insert(caret, added)}};
}

}  // namespace engine::hud
