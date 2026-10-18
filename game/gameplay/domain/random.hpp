#pragma once

#include <cstdint>

namespace game {

/**
 * xorshift32 — 표준 분포는 구현마다 결과가 달라 클라이언트와 서버가 어긋난다.
 * 시뮬레이션의 난수는 World 가 쥔 이것 하나에서만 나온다
 */
struct Rng {
  uint32_t state;

  constexpr explicit Rng(uint32_t seed) : state(seed ? seed : 1) {}

  constexpr uint32_t next() {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state;
  }
  /** 0 이상 count 미만 */
  constexpr uint32_t below(uint32_t count) { return next() % count; }
};

}  // namespace game
