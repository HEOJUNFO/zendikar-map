#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>

#include "engine/foundation/math.hpp"
#include "gameplay/simulation/world.hpp"

// 손에 든 권총의 움직임 — 세계에서 일어난 일(발사, 탄창 빼기·끼우기, 빈 방아쇠)을 부품의 자리(슬라이드, 탄창)와 총의 반동(밀림·들림·비틀림)·기울임, 총구의 섬광으로 옮긴다.
// 시뮬레이션 밖이다: 세계를 읽기만 하고, 자세는 일이 일어난 틱에서 지난 시간만으로 정해진다 (적분하는 상태가 없다 — 화면 주사율과 무관하다).
// 재장전 한 단계의 움직임은 반박(20 틱) 안에 끝난다. 손으로 느껴 가며 고칠 값은 weapon.cpp 머리에 모여 있다.
namespace game {

/** 한 프레임의 총 — 거리는 m, 각은 라디안. 모두 0 이면 가만히 든 총이다 */
struct WeaponPose {
  /** 슬라이드가 뒤로 물러난 거리 */
  float slide{};
  /** 탄창이 손잡이 속 제자리에서 탄창 길을 따라 아래로 나온 거리 */
  float magazine{};
  /** 탄창이 보인다 (빼낸 탄창이 다 떨어진 뒤, 새 탄창을 끼우기 전에는 없다) */
  bool magazine_shown{true};
  /** 보이는 탄창이 빈 것이다 (다 쏘고 빼낸 탄창) */
  bool magazine_empty{};
  /** 총이 뒤로 밀린 거리, 위로 들린 거리 (내려 들면 음수) */
  float back{};
  float rise{};
  /** 총구가 들린 각 (반동이 돌아오며 제자리를 살짝 지나치면 음수) */
  float pitch{};
  /** 반동에 총열을 축으로 비틀린 각 — 양수면 윗면이 왼쪽으로. 발마다 왼쪽·오른쪽 번갈아 */
  float twist{};
  /** 재장전하려고 총을 기울인 정도 0…1 */
  float cant{};
  /** 총구 섬광의 밝기 0…1 — 쏜 틱에 1 이고 FLASH_TICKS 틱째에 0. 나간 발에만 있다 (미스·빈 방아쇠에는 없다) */
  float flash{};
  /** 그 섬광의 모양 — 발마다 다르다 (flash_shape). flash 가 0 이면 뜻이 없다 */
  float flash_turn{};
  float flash_size{};
};

/** 총구 섬광이 남는 시간 (틱) — 쏜 틱에 가장 밝고 ((3 − t) / 3)² 로 사그라져 이 틱째에 없다 */
inline constexpr uint32_t FLASH_TICKS = 3;
/** 총열의 앞 끝 가운데 (모델 공간 — pistol_body.zkmodel 의 총열 끝)와, 섬광의 가운데가 거기서 총열을 따라 앞으로 나간 거리 */
inline constexpr engine::Vec3 MUZZLE{0.0f, 0.0735f, -0.182f};
inline constexpr float FLASH_AHEAD = 0.025f;

/** 발마다 다른 섬광의 모양 — 불꽃 갈래가 돈 각(라디안, 0…2π)과 크기(섬광 사각형의 한 변의 절반, m: 5.5 cm ± 15 %) */
struct FlashShape {
  float turn;
  float size;
};
/** event 는 그 발사의 세계의 일 번호 (World::event 의 번호) — 같은 발은 늘 같은 모양이다 (발사음의 변주 shot_voice 와 같은 방식) */
FlashShape flash_shape(uint64_t event);

/** 슬라이드가 끝까지 물러난 거리와, 빈 탄창에서 젖혀진 채 멈추는 거리 (슬라이드 스톱) */
inline constexpr float SLIDE_TRAVEL = 0.034f;
inline constexpr float SLIDE_LOCK = 0.028f;
/** 쏜 뒤 슬라이드가 제자리로 돌아오기까지 (틱) */
inline constexpr uint32_t SLIDE_TICKS = 6;
/** 쏜 뒤 총의 반동(들림·밀림·비틀림)이 다 가라앉기까지 (틱) — 반박(20 틱)보다 짧다 */
inline constexpr uint32_t KICK_TICKS = 12;
/** 탄창이 손잡이를 다 빠져나오는 거리와 거기까지 걸리는 시간 (틱), 빼낸 탄창이 사라질 때까지 (틱) */
inline constexpr float MAGAZINE_LENGTH = 0.11f;
inline constexpr uint32_t MAGAZINE_OUT_TICKS = 5;
inline constexpr uint32_t MAGAZINE_GONE_TICKS = 14;
/** 새 탄창이 아래에서 올라와 자리에 들기까지 (틱)와 올라오기 시작하는 거리 */
inline constexpr uint32_t MAGAZINE_IN_TICKS = 3;
inline constexpr float MAGAZINE_IN_FROM = 0.15f;
/**
 * 끼운 뒤 슬라이드가 당겨졌다 놓이는 구간 (끼운 틱에서) — 당기기 시작, 끝까지 당겨진 때, 제자리.
 * 끼우는 소리의 딸깍(0.05 초)과 슬라이드 소리의 두 딸깍(0.12·0.21 초 — sound.cpp 의 SLIDE_PITCH)에 맞춘다: 박에 바짝 붙어 끝나야 박자와 어긋나게 들리지 않는다
 */
inline constexpr uint32_t RACK_START = 4;
inline constexpr uint32_t RACK_BACK = 7;
inline constexpr uint32_t RACK_END = 12;

class WeaponAnimator {
 public:
  /** 세계에서 새로 일어난 일을 읽는다 — 자세를 구하기 전에 부른다 (프레임마다 불러도, 틱마다 불러도 된다). 세계가 새 판으로 바뀌면 지난 판의 일을 잊는다 */
  void follow(const World& world);
  /** 이 프레임의 자세 — alpha 는 지난 틱에서 이번 틱으로 가는 사이의 위치 0..1 */
  WeaponPose pose(const World& world, float alpha) const;

 private:
  uint64_t cursor_{};
  uint64_t tick_{};
  std::optional<uint64_t> shot_, out_, in_, dry_;
  // 마지막 발이 나가 슬라이드가 젖혀진 채다 · 빼낸 탄창이 빈 것이었다 · 끼울 때 슬라이드가 젖혀져 있었다
  bool locked_{};
  bool out_empty_{};
  bool in_locked_{};
  // 쏜 발 수 — 반동의 비틀림이 발마다 번갈아 든다
  uint32_t shots_{};
  // 마지막 발사의 일 번호 — 섬광의 모양이 여기서 정해진다
  uint64_t shot_event_{};
};

/** 권총의 부품 — 번호는 content/weapons/weapons.txt 의 part 차례 (에셋 팩에 그 차례로 들어 있다) */
enum class WeaponPart : uint32_t { body, slide, magazine, magazine_empty };
inline constexpr std::size_t WEAPON_PARTS = 4;

/** 부품마다 모델 공간(손잡이가 원점, 총구가 -z) → 눈 공간(오른쪽 +x, 위 +y, 보는 쪽 -z)의 행렬. 그리지 않는 탄창(빼낸 뒤)은 nullopt */
struct WeaponPlacement {
  engine::Mat4 body;
  engine::Mat4 slide;
  std::optional<engine::Mat4> magazine;
  bool magazine_empty{};
  /** 총구 섬광 — 눈 공간의 가운데(총구 앞 — 반동으로 총이 움직이면 같이 움직인다), 밝기 0…1, 갈래가 돈 각, 사각형의 한 변의 절반 (m). 섬광이 없으면 nullopt */
  struct Flash {
    engine::Vec3 at;
    float glow;
    float turn;
    float size;
  };
  std::optional<Flash> flash{};
};
/**
 * 손에 든 총을 눈 기준으로 놓는다. sway 는 움직임의 연출이 총을 옮기는 양 (ViewMotion::weapon — 오른쪽, 위, 앞),
 * beat 는 박 안에서의 위치 0..1 (박자에 맞춰 살짝 끄덕인다)
 */
WeaponPlacement place_weapon(const WeaponPose& pose, engine::Vec3 sway, float beat);

}  // namespace game
