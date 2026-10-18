#pragma once

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>

// 재생 시계 — 출력 장치가 지금까지 가져간 표본 수를 어림한다. 가져간 양은 띄엄띄엄(통지로), 그것도 조금 늦게 닿는다:
// 통지 (가져간 수, 닿은 시각) 들에서 '가져간 수 − 표본율 × 시각' 이 가장 큰 것(가장 덜 늦은 통지)을 기준으로 지금 시각까지 이어 그린다.
namespace engine::audio {

class Clock {
 public:
  /** rate 는 출력의 표본율 (Hz) */
  explicit Clock(uint32_t rate = 0) : rate_(rate) {}

  /** 장치가 consumed 표본까지 가져갔다는 통지가 at_ms 에 닿았다 */
  void notify(uint64_t consumed, double at_ms) {
    offsets_[count_++ % WINDOW] = static_cast<double>(consumed) - at_ms * rate_ / 1000.0;
    last_ms_ = at_ms;
  }

  /** 통지가 하나라도 왔고, 마지막 통지가 now_ms 에서 within_ms 안쪽이다 — 장치가 돌고 있다 */
  bool live(double now_ms, double within_ms) const { return count_ && now_ms - last_ms_ <= within_ms; }

  /**
   * now_ms 에 장치가 가져갔을 표본 수 — 써 넣은 양(written)을 넘지 않고, 앞서 준 값보다 뒤로 가지 않는다.
   * 통지가 아직 없으면 0
   */
  uint64_t estimate(double now_ms, uint64_t written) {
    if (!count_) return 0;
    estimate_ = std::max(estimate_, std::min(peek(now_ms), written));
    return estimate_;
  }

  /**
   * now_ms 에 장치가 가져갔을 표본 수를 어림만 한다 — 써 넣은 양으로 막지 않고 estimate 의 값도 건드리지 않는다.
   * 밀려 한꺼번에 닿은 통지들을 하나씩 따르지 않고 지금의 자리 하나로 볼 때 쓴다. 통지가 아직 없으면 0
   */
  uint64_t peek(double now_ms) const {
    if (!count_) return 0;
    const std::size_t known = std::min<std::size_t>(count_, WINDOW);
    const double offset = *std::max_element(offsets_.begin(), offsets_.begin() + static_cast<std::ptrdiff_t>(known));
    const double frames = offset + now_ms * rate_ / 1000.0;
    return frames < 0.0 ? 0 : static_cast<uint64_t>(frames);
  }

 private:
  // 기준으로 삼는 최근 통지의 수 — 통지가 8 ms 쯤마다 오면 반 초. 장치의 시계와 이쪽 시계가 조금씩 벌어지는 것을 이 창이 따라간다
  static constexpr std::size_t WINDOW = 64;

  uint32_t rate_{};
  std::array<double, WINDOW> offsets_{};
  std::size_t count_{};
  double last_ms_{};
  uint64_t estimate_{};
};

}  // namespace engine::audio
