#pragma once

#include <cstdint>

// 전투 수치와 기본 권총 — 원작(BPM: Bullets Per Minute)의 값이다.
namespace game {

inline constexpr int32_t PLAYER_HEALTH = 100;
/** 적의 공격(돌진, 투사체) 한 번의 피해 */
inline constexpr int32_t HIT_DAMAGE = 25;

/** 기본 권총 — 반박마다 쏠 수 있고, 재장전은 두 번 누른다 (탄창 빼기 → 끼우기). 예비 탄은 끝이 없다 */
struct Pistol {
  static constexpr uint32_t MAGAZINE = 8;
  static constexpr int32_t DAMAGE = 50;

  uint32_t ammo{MAGAZINE};
  /** 0 은 재장전 중이 아님, 1 은 탄창을 뺐다 (한 번 더 누르면 끼운다) */
  uint32_t reload_stage{};

  /** 재장전을 한 단계 나아간다 */
  constexpr void reload_step() {
    ammo = reload_stage ? MAGAZINE : 0;
    reload_stage = reload_stage ? 0 : 1;
  }
};

}  // namespace game
