#pragma once

#include <optional>

#include "engine/hud/element.hpp"
#include "engine/hud/layout.hpp"

namespace engine::hud {

/**
 * 상태로 그려지는 HUD 하나 — 뿌리 컴포넌트(상태 → 요소 트리)를 들고, 상태나 화면이 바뀌었을 때만 다시 조립하고 배치한다.
 * State 는 == 로 견줄 수 있어야 한다. 화면에 보이는 것은 모두 상태에서 나온다 — 컴포넌트는 상태 밖을 읽지 않는다.
 *
 * ceiling: 상태가 바뀌면 트리 전체를 다시 짓는다 (요소마다 할당이 있다). 매 프레임 바뀌는 값이 상태에 들어 있으면 매 프레임 다시 짓는다.
 * HUD 조립이 프레임 프로파일에 보이면, 바뀐 가지만 다시 짓도록 하위 컴포넌트 단위로 상태를 나눠 견준다.
 */
template <class State>
class View {
 public:
  using Component = Element (*)(const State&);

  explicit View(Component root) : root_(root) {}

  /** 지금 상태의 그리기 목록 */
  const DrawList& update(const State& state, Viewport viewport, TextMetrics metrics) {
    if (!state_ || !(*state_ == state) || !(viewport_ == viewport) || !(metrics_ == metrics)) {
      layout(root_(state), viewport, metrics, draw_list_);
      state_ = state;
      viewport_ = viewport;
      metrics_ = metrics;
    }
    return draw_list_;
  }

 private:
  Component root_;
  std::optional<State> state_;
  Viewport viewport_{};
  TextMetrics metrics_{};
  DrawList draw_list_;
};

}  // namespace engine::hud
