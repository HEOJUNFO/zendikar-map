#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

#include "engine/hud/element.hpp"
#include "engine/hud/font.hpp"
#include "engine/hud/layout.hpp"

// HUD 의 상호작용 — 포인터와 글쇠를 배치된 위젯(Regions)에 대 보고, 위젯이 낸 사건을 돌려준다.
//   원시 입력 → Interaction(Regions 에 대 본다) → Event → 쓰는 쪽이 제 상태를 고친다 → 컴포넌트가 다시 조립한다
// 값(슬라이더 값, 고른 줄, 입력한 글)은 쓰는 쪽 상태가 갖는다. 여기는 가리킴·눌림·포커스·캐럿·스크롤처럼
// 화면에 붙은 상태(Ui)만 갖고, 그것도 쓰는 쪽 상태에 담겨 컴포넌트로 간다 (widgets.hpp)
namespace engine::hud {

/** 포인터·포커스가 지금 어디 있는지 — 값이 같으면 위젯의 모습도 같다. 쓰는 쪽 상태에 담아 위젯 함수에 넘긴다 */
struct Ui {
  struct Scroll {
    Id id;
    float rows;
    bool operator==(const Scroll&) const = default;
  };

  /** 포인터 밑의 위젯, 눌린 채인 위젯, 글쇠를 받는 위젯 */
  Id hover{};
  Id pressed{};
  Id focus{};
  /** hover 가 list 일 때 포인터 밑의 줄 (-1 은 없음) */
  int hover_item{-1};
  /** focus 가 input 일 때 캐럿 — 글의 바이트 위치 */
  std::size_t caret{};
  /** 포인터가 화면 안에 있는가, 그 자리 (단위) — 커서를 그리는 데 쓴다 */
  bool pointer_inside{};
  float pointer_x{};
  float pointer_y{};
  /** 스크롤한 목록들 — 위로 넘어간 줄 수 */
  std::vector<Scroll> scrolls;

  float scroll(Id id) const;
  bool operator==(const Ui&) const = default;
};

/** 위젯이 낸 사건 — 쓰는 쪽은 id 로 어느 위젯인지 보고 제 상태를 고친다 */
struct Event {
  enum class Kind {
    /** button 을 눌렀다 뗐다. list·input 에서 Enter (list 는 item 에 고른 줄) */
    press,
    /** toggle·slider 의 새 값 (value) */
    change,
    /** list 에서 줄을 골랐다 (item) */
    select,
    /** input 의 새 글 (text) */
    edit,
  };

  Kind kind;
  Id id;
  float value{};
  int item{-1};
  std::string text{};
  bool operator==(const Event&) const = default;
};

/** 글쇠와 함께 눌린 보조 글쇠 (비트) */
inline constexpr uint32_t KEY_SHIFT = 1u << 0;
inline constexpr uint32_t KEY_CTRL = 1u << 1;
inline constexpr uint32_t KEY_ALT = 1u << 2;
inline constexpr uint32_t KEY_META = 1u << 3;

/** UTF-8 글에서 caret 앞의 글자 경계와 뒤의 글자 경계 (바이트 위치) — 맨 앞이면 0, 맨 끝이면 글의 길이 */
std::size_t previous_boundary(std::string_view text, std::size_t caret);
std::size_t next_boundary(std::string_view text, std::size_t caret);

/**
 * 입력을 받아 Ui 를 고치고 사건을 낸다. regions 는 지금 상태로 배치한 것(View::regions)을 준다 —
 * 사건으로 상태를 고쳤으면 다음 입력 전에 다시 배치해야 그 값 위에서 이어진다.
 * 좌표는 화면 픽셀이다
 */
class Interaction {
 public:
  const Ui& ui() const { return ui_; }

  /** 포인터가 (x, y) 로 왔다. 슬라이더를 누른 채면 끌어서 값을 바꾼다 */
  std::vector<Event> pointer_move(const Regions& regions, float x, float y);
  /** 포인터가 화면을 떠났다 */
  void pointer_leave();
  /** 가리킴과 눌림을 지운다 — 포인터가 다른 데(조준) 쓰이기 시작할 때. 자리는 남는다 */
  void clear();
  /** 주 버튼을 지금 자리에서 눌렀다 — 그 위젯이 포커스를 받는다 (빈 곳이면 포커스가 풀린다) */
  std::vector<Event> pointer_press(const Regions& regions, const Font& font);
  /** 주 버튼을 뗐다 — 누른 위젯 위에서 떼야 눌린 것이다 */
  std::vector<Event> pointer_release(const Regions& regions);
  /** 휠 — 포인터 밑의 목록을 굴린다. delta 는 아래로 굴린 픽셀 */
  void wheel(const Regions& regions, float delta);
  /**
   * 글쇠를 눌렀다 — code 는 자판의 자리 이름(Tab, Enter, ArrowUp …), key 는 그 글쇠가 내는 글자(UTF-8, 없으면 빈 글이나 이름),
   * repeat 는 누르고 있어 되풀이된 것. Tab·위아래 화살표는 포커스를 옮기고, 나머지는 포커스를 가진 위젯이 받는다
   */
  std::vector<Event> key(const Regions& regions, const Font& font, std::string_view code, std::string_view key, uint32_t modifiers, bool repeat);
  /** 포커스를 가진 input 의 캐럿 자리에 글을 넣는다 — 글꼴에 없는 글자와 최대 길이를 넘는 글자는 빠진다 */
  std::vector<Event> type(const Regions& regions, const Font& font, std::string_view utf8);
  /** 포커스를 옮긴다 (화면을 열 때 첫 항목에). 0 이면 푼다 */
  void focus(Id id) { ui_.focus = id; }

 private:
  void move_focus(const Regions& regions, int direction);
  void set_scroll(Id id, float rows);
  void hover(const Regions& regions);

  Ui ui_;
  // 포인터 자리 (픽셀)
  float x_{};
  float y_{};
};

}  // namespace engine::hud
