#pragma once

#include <cstdint>

// 리듬 규칙 — 박자 시계와 타이밍 판정. 엔진의 렌더·GPU 를 모른다 (서버도 같은 코드로 판정한다).
namespace game {

enum class Judgement : uint8_t { miss = 0, good = 1, perfect = 2 };

/** 판정 창 — 가장 가까운 박자에서 벗어난 시간(초) */
inline constexpr double PERFECT_WINDOW = 0.050;
inline constexpr double GOOD_WINDOW = 0.110;

/** 박자 시계 — 시간을 박자 수로 쌓는다 */
class Conductor {
 public:
  void advance(double seconds);
  /** 지금 박자 안에서의 위치 0..1 */
  double phase() const;
  /** 지금 누르면 받는 판정 */
  Judgement judge() const;

 private:
  double bpm_{120.0};
  double beats_{};
};

}  // namespace game
