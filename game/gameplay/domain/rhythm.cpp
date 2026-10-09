#include "gameplay/domain/rhythm.hpp"

#include <algorithm>
#include <cmath>

namespace game {

void Conductor::advance(double seconds) { beats_ += seconds * bpm_ / 60.0; }

double Conductor::phase() const { return beats_ - std::floor(beats_); }

Judgement Conductor::judge() const {
  const double p = phase();
  // 지난 박자와 다음 박자 중 가까운 쪽까지의 시간
  const double offset = std::min(p, 1.0 - p) * 60.0 / bpm_;
  if (offset <= PERFECT_WINDOW) return Judgement::perfect;
  if (offset <= GOOD_WINDOW) return Judgement::good;
  return Judgement::miss;
}

}  // namespace game
