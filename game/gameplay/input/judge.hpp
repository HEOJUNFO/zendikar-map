#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <optional>

#include "gameplay/domain/rhythm.hpp"

// 판정의 시각 — 박자에 묶인 입력을 '누른 때의 틱'으로 옮긴다 (World::act 의 ago). 시뮬레이션 밖이다: 세계는 받은 ago 로만 정해진다
// (서버·협동에서도 이 값은 클라이언트마다 따로다).
//   누른 때 = 지금의 틱(과 그 소수) − 입력이 닿기까지 지난 시간 − 판정 보정. 틱으로 자르기 전에 연속 시간에서 한 번만 반올림한다 (자르고 빼면 평균 반 틱 이르게 치우친다).
//   **판정은 결정적이고 숨은 장치가 없다** (사용자 결정 2026-10-10): 누른 때를 소리의 시계(틱)에 놓고 가장 가까운 칸의 머리에서 벗어난 양으로 정박·어긋남·미스를 가른다. 그것뿐이다.
//   같은 때의 누름은 앞에 무엇을 몇 번 눌렀든 같은 판정을 받는다 — 누름이 눈금을 옮기지 않는다.
//   경위: 누름의 평균을 따라가던 자동 보정은 판정을 흔들었고(한쪽으로 모인 누름 서른 번에 눈금이 143 ms 옮겨 가 "대충 눌러도 맞고 정확히 눌러도 빗나갔다"),
//   잠그는 방식·처음 열두 번에 한 번 잡는 방식은 "처음에는 안 맞다가 갑자기 맞았다". 재 보니 소프트웨어 쪽에는 치우침이 없다 — 틱의 시계는 브라우저의 출력 시각과 2 ms,
//   음악의 킥은 박의 격자에서 1 ms, 박자 표식도 칸의 머리에 맞는다. 그래서 따라가기·잠금·맞추기 단계·유예를 모두 걷어 냈다.
//   판정 보정: 기기의 실제 지연(브라우저가 알린 값과 다른 무선 이어폰 등)은 소프트웨어가 알 수 없다 — 옵션의 '판정 보정'(Options::judge_offset, 처음 값 −100 ms — 사용자가 타이밍 표시에서 잰 치우침, 2026-10-10) 하나로만 던다.
//   그 값은 사용자가 슬라이더로만 바꾸고(저장된다), 얼마로 둘지는 '타이밍 표시'(조준점 아래 — 누름이 박에서 벗어난 양과 최근 평균)가 보여 준다.
namespace game {

class Judge {
 public:
  /** 닿기까지 이보다 오래 걸린 입력은 판정하지 않는다 (ms) — 뒤늦게 줄줄이 나가지 않게 조용히 버린다 */
  static constexpr double MAX_AGE_MS = 250.0;
  /** 타이밍 표시가 평균을 내는 최근 누름의 수 */
  static constexpr std::size_t RECENT = 16;

  struct Press {
    /** World::act 에 줄 값 — 누른 뒤 지금까지 지난 틱 (판정 보정을 덜어 음수일 수 있다) */
    int32_t ago;
    /** 누른 때가 가장 가까운 칸의 머리에서 벗어난 양 (ms — 음수면 일렀다): 판정 보정을 덜기 전과 던 뒤(판정이 보는 값 — 타이밍 표시) */
    double raw_ms;
    double residual_ms;
  };

  /**
   * 지금이 틱 tick 에서 phase(0…1) 만큼 지난 때이고, 입력이 age_ms 전에 일어났다. offset_ms 는 판정 보정 (양수면 늦게 누르는 사람 — 그만큼 이르게 본다).
   * 들어간 값만으로 정해진다 (앞선 누름과 무관하다). 너무 늦게 닿았으면(MAX_AGE_MS 초과) nullopt — 판정하지 않는다. 앞날이거나 숫자가 아닌 age 는 방금으로 친다
   */
  static std::optional<Press> press(uint64_t tick, double phase, double age_ms, double offset_ms) {
    const double age = age_ms > 0.0 ? age_ms : 0.0;
    if (age > MAX_AGE_MS) return std::nullopt;
    const double uncorrected = static_cast<double>(tick) + std::clamp(phase, 0.0, 1.0) - age * TICKS_PER_MS;
    const double pressed = uncorrected - (std::isfinite(offset_ms) ? offset_ms : 0.0) * TICKS_PER_MS;
    return Press{static_cast<int32_t>(static_cast<double>(tick) - std::round(pressed)), wrapped(uncorrected) / TICKS_PER_MS, wrapped(pressed) / TICKS_PER_MS};
  }

  /** 그 누름이 판정을 받았다 (행동이 나갔거나 미스였다) — 타이밍 표시에 남긴다. 판정에는 아무것도 바꾸지 않는다 */
  void record(const Press& press) { recent_[count_++ % RECENT] = press.residual_ms; }

  /** 마지막 누름이 벗어난 양과 최근 RECENT 번의 평균 (ms, 판정 보정을 던 뒤 — 판정이 본 그대로) — 아직 누름이 없으면 nullopt */
  std::optional<double> last_ms() const { return count_ ? std::optional{recent_[(count_ - 1) % RECENT]} : std::nullopt; }
  std::optional<double> mean_ms() const {
    if (!count_) return std::nullopt;
    const std::size_t known = std::min(count_, RECENT);
    double sum = 0.0;
    for (std::size_t i = 0; i < known; i++) sum += recent_[i];
    return sum / static_cast<double>(known);
  }

 private:
  static constexpr double TICKS_PER_MS = TICK_RATE / 1000.0;
  /** 가장 가까운 칸의 머리에서 벗어난 양 (틱) */
  static double wrapped(double tick) { return tick - TICKS_PER_SLOT * std::round(tick / TICKS_PER_SLOT); }

  std::array<double, RECENT> recent_{};
  std::size_t count_{};
};

}  // namespace game
