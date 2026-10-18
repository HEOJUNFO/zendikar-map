#include "gameplay/presentation/weapon.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>

namespace game {
namespace {

// ── 손맛 — 시간은 틱(1/60 초), 거리는 m, 각은 라디안 ──
// 쏜 뒤: 슬라이드가 이만큼(틱) 만에 끝까지 물러난다
constexpr float SLIDE_BACK_TICKS = 1.5f;
// 반동은 두 박자다 — 먼저 총이 손 쪽으로 툭 밀리고(PUSH), 곧이어 총구가 튀어 오른다(FLIP).
// 밀림: PUSH_PEAK_TICKS 에 가장 깊고 PUSH_TICKS 째에 제자리 (처음엔 빨리, 끝에는 느리게)
constexpr float PUSH_PEAK_TICKS = 1.0f;
constexpr float PUSH_TICKS = 7.0f;
constexpr float KICK_BACK = 0.02f;
// 들림: FLIP_PEAK_TICKS 에 가장 높고, 내려오며 제자리를 한 번 살짝 지나쳤다(7 틱째쯤 가장 높던 것의 1/6 쯤 — 총의 무게가 실린다) KICK_TICKS(weapon.hpp) 째에 선다.
// FLIP_SWING 은 돌아오는 동안 흔들리는 반 바퀴 수 — 1.5 면 아래로 한 번 지나쳤다 선다 (0.5 면 지나치지 않는다)
constexpr float FLIP_PEAK_TICKS = 1.5f;
constexpr float FLIP_SWING = 1.5f;
constexpr float KICK_PITCH = 0.06f;
constexpr float KICK_RISE = 0.004f;
constexpr float KICK_TWIST = 0.02f;  // 총열을 축으로 비틀리는 각 — 발마다 왼쪽·오른쪽 번갈아
// 총구 섬광 — 발마다 크기가 이만큼(비율) 커지거나 작아진다
constexpr float FLASH_SIZE = 0.055f;
constexpr float FLASH_SIZE_SPREAD = 0.15f;
// 빈 방아쇠 — 아주 작은 까딱
constexpr float DRY_TICKS = 5.0f;
constexpr float DRY_PITCH = -0.02f;
constexpr float DRY_RISE = -0.003f;
// 재장전 — 탄창을 빼면 총을 기울여 내려 들고(CANT_IN 틱에 걸쳐), 끼운 뒤 CANT_HOLD 틱부터 CANT_OUT 틱에 걸쳐 바로 든다
constexpr float CANT_IN = 6.0f;
constexpr float CANT_HOLD = 3.0f;
constexpr float CANT_OUT = 10.0f;
// 새 탄창이 자리에 드는 순간 총이 살짝 들린다
constexpr float SEAT_RISE = 0.008f;
constexpr float SEAT_TICKS = 4.0f;

// ── 구도 — 화면을 보며 고칠 값 ──
// 손잡이(모델의 원점)가 눈에서 놓이는 자리 (오른쪽, 위, 앞). 손은 그리지 않는다 — 손잡이 아래쪽이 화면 밖으로 나가는 구도다
constexpr engine::Vec3 WEAPON_HOLD{0.072f, -0.115f, 0.235f};
// 가만히 든 총 — 총구를 화면 가운데 쪽으로 살짝 돌리고(yaw), 조금 들고(pitch), 윗면을 안쪽으로 조금 눕힌다(roll)
constexpr float HOLD_YAW = 0.03f, HOLD_PITCH = 0.03f, HOLD_ROLL = 0.03f;
// 재장전 — 탄창을 빼 둔 동안 총구를 들고 손잡이 밑이 화면 안쪽을 보게 눕혀 올려 든다 (탄창이 빠지고 드는 것이 보인다)
constexpr float CANT_YAW = 0.08f, CANT_PITCH = 0.25f, CANT_ROLL = -0.5f;
constexpr engine::Vec3 CANT_SHIFT{-0.015f, 0.04f, 0.0f};
// 탄창 길 — 손잡이 속 탄창이 빠지는 쪽 (모델 공간, 길이 1: 아래로, 조금 뒤로 — 원본 탄창의 기울기 10.5 도)
constexpr engine::Vec3 MAGAZINE_WAY{0.0f, -0.9833f, 0.1822f};
// 박자에 맞춰 끄덕이는 높이
constexpr float BEAT_NOD = 0.0025f;

engine::Mat4 translation(engine::Vec3 by) { return engine::Mat4::from_basis({1.0f, 0.0f, 0.0f}, {0.0f, 1.0f, 0.0f}, {0.0f, 0.0f, 1.0f}, by); }

float smooth(float t) {
  t = std::clamp(t, 0.0f, 1.0f);
  return t * t * (3.0f - 2.0f * t);
}

/** from 에서 to 까지 가는 사이의 위치 0…1 */
float span(float t, float from, float to) { return std::clamp((t - from) / (to - from), 0.0f, 1.0f); }

}  // namespace

FlashShape flash_shape(uint64_t event) {
  // 번호를 고르게 섞은 32 비트 — 아래 16 비트가 각, 위 16 비트가 크기
  uint32_t mixed = static_cast<uint32_t>(event) * 0x9E3779B1u;
  mixed ^= mixed >> 16;
  mixed *= 0x85EBCA6Bu;
  mixed ^= mixed >> 13;
  const float turn = static_cast<float>(mixed & 0xffffu) / 65536.0f, size = static_cast<float>(mixed >> 16) / 32767.5f - 1.0f;
  return {2.0f * std::numbers::pi_v<float> * turn, FLASH_SIZE * (1.0f + FLASH_SIZE_SPREAD * size)};
}

void WeaponAnimator::follow(const World& world) {
  // 틱이 되돌아갔으면 새 판이다
  if (world.tick() < tick_ || world.event_count() < cursor_) *this = {};
  tick_ = world.tick();
  if (world.event_count() - cursor_ > World::EVENT_CAPACITY) cursor_ = world.event_count() - World::EVENT_CAPACITY;
  for (; cursor_ < world.event_count(); cursor_++) {
    const WorldEvent event = *world.event(cursor_);
    switch (event.kind) {
      case WorldEvent::Kind::shot:
        shot_ = event.tick;
        shot_event_ = cursor_;
        shots_++;
        // 마지막 발이면 슬라이드가 젖혀진 채 멈춘다 (한 칸에 무기의 행동은 하나라, 읽는 지금의 탄 수가 그 발 뒤의 것이다)
        locked_ = world.pistol().ammo == 0;
        break;
      case WorldEvent::Kind::magazine_out:
        out_ = event.tick;
        out_empty_ = locked_;
        break;
      case WorldEvent::Kind::magazine_in:
        in_ = event.tick;
        in_locked_ = locked_;
        locked_ = false;
        break;
      case WorldEvent::Kind::dry: dry_ = event.tick; break;
      default: break;
    }
  }
}

WeaponPose WeaponAnimator::pose(const World& world, float alpha) const {
  const auto since = [&](std::optional<uint64_t> tick) { return tick && *tick <= world.tick() ? std::optional{static_cast<float>(world.tick() - *tick) + alpha} : std::nullopt; };
  const auto shot = since(shot_), out = since(out_), in = since(in_), dry = since(dry_);
  const bool removed = world.pistol().reload_stage != 0;
  WeaponPose pose;

  // 슬라이드 — 젖혀진 채면 거기 머문다. 쏘면 끝까지 물러났다 (머물 자리로) 돌아오고, 탄창을 끼운 뒤에는 한 번 당겨졌다 놓인다
  const float rest = locked_ ? SLIDE_LOCK : 0.0f;
  pose.slide = rest;
  if (shot && *shot < static_cast<float>(SLIDE_TICKS)) {
    const float back = *shot < SLIDE_BACK_TICKS ? *shot / SLIDE_BACK_TICKS : 1.0f - span(*shot, SLIDE_BACK_TICKS, static_cast<float>(SLIDE_TICKS));
    pose.slide = std::max(pose.slide, rest + (SLIDE_TRAVEL - rest) * back);
  }
  if (in && !removed && *in < static_cast<float>(RACK_END)) {
    const float held = in_locked_ ? SLIDE_LOCK : 0.0f;
    const float rack = *in < static_cast<float>(RACK_BACK) ? held + (SLIDE_TRAVEL - held) * span(*in, static_cast<float>(RACK_START), static_cast<float>(RACK_BACK))
                                                           : SLIDE_TRAVEL * (1.0f - span(*in, static_cast<float>(RACK_BACK), static_cast<float>(RACK_END)));
    pose.slide = std::max(pose.slide, rack);
  }

  // 탄창 — 빼면 탄창 길을 따라 빠져 떨어지고, 끼우면 아래에서 올라와 든다
  if (removed) {
    const float t = out.value_or(static_cast<float>(MAGAZINE_GONE_TICKS));
    const float fall = t / static_cast<float>(MAGAZINE_OUT_TICKS);
    pose.magazine = MAGAZINE_LENGTH * fall * fall;
    pose.magazine_shown = t < static_cast<float>(MAGAZINE_GONE_TICKS);
    pose.magazine_empty = out_empty_;
  } else if (in && *in < static_cast<float>(MAGAZINE_IN_TICKS)) {
    const float left = 1.0f - *in / static_cast<float>(MAGAZINE_IN_TICKS);
    pose.magazine = MAGAZINE_IN_FROM * left * left;
  }

  // 총 — 쏘면 손 쪽으로 툭 밀리고 총구가 튀어 올랐다 살짝 지나쳐 내려와 선다. 탄창을 빼 둔 동안은 기울여 든다
  if (shot && *shot < PUSH_TICKS) {
    const float fade = 1.0f - span(*shot, PUSH_PEAK_TICKS, PUSH_TICKS);
    pose.back += KICK_BACK * (*shot < PUSH_PEAK_TICKS ? *shot / PUSH_PEAK_TICKS : fade * fade);
  }
  if (shot && *shot < static_cast<float>(KICK_TICKS)) {
    const float settle = span(*shot, FLIP_PEAK_TICKS, static_cast<float>(KICK_TICKS));
    const float flip = *shot < FLIP_PEAK_TICKS ? *shot / FLIP_PEAK_TICKS : (1.0f - settle) * (1.0f - settle) * std::cos(FLIP_SWING * std::numbers::pi_v<float> * settle);
    pose.pitch += KICK_PITCH * flip;
    pose.rise += KICK_RISE * flip;
    pose.twist += (shots_ % 2 ? KICK_TWIST : -KICK_TWIST) * flip;
  }
  // 섬광 — 쏜 틱에 가장 밝고 FLASH_TICKS 틱 안에 빠르게 사그라진다
  if (shot && *shot < static_cast<float>(FLASH_TICKS)) {
    const float left = 1.0f - *shot / static_cast<float>(FLASH_TICKS);
    const FlashShape shape = flash_shape(shot_event_);
    pose.flash = left * left;
    pose.flash_turn = shape.turn;
    pose.flash_size = shape.size;
  }
  if (dry && *dry < DRY_TICKS) {
    const float tap = std::sin(std::numbers::pi_v<float> * *dry / DRY_TICKS);
    pose.pitch += DRY_PITCH * tap;
    pose.rise += DRY_RISE * tap;
  }
  if (removed) pose.cant = smooth(out.value_or(CANT_IN) / CANT_IN);
  else if (in) {
    pose.cant = 1.0f - smooth((*in - CANT_HOLD) / CANT_OUT);
    if (const float seated = *in - static_cast<float>(MAGAZINE_IN_TICKS); seated >= 0.0f && seated < SEAT_TICKS) pose.rise += SEAT_RISE * (1.0f - seated / SEAT_TICKS);
  }
  return pose;
}

WeaponPlacement place_weapon(const WeaponPose& pose, engine::Vec3 sway, float beat) {
  const float yaw = HOLD_YAW + CANT_YAW * pose.cant, pitch = HOLD_PITCH + pose.pitch + CANT_PITCH * pose.cant, roll = HOLD_ROLL + pose.twist + CANT_ROLL * pose.cant;
  // 눈 공간의 축에서 시작해 차례로 돌린다: 총구를 왼쪽으로(yaw), 위로(pitch), 그 총열을 축으로 윗면을 왼쪽으로(roll — 음수면 오른쪽으로)
  const engine::Vec3 forward0{-std::sin(yaw), 0.0f, -std::cos(yaw)}, right0{std::cos(yaw), 0.0f, -std::sin(yaw)}, up0{0.0f, 1.0f, 0.0f};
  const engine::Vec3 forward = forward0 * std::cos(pitch) + up0 * std::sin(pitch), up1 = up0 * std::cos(pitch) - forward0 * std::sin(pitch);
  const engine::Vec3 right = right0 * std::cos(roll) + up1 * std::sin(roll), up = up1 * std::cos(roll) - right0 * std::sin(roll);
  const float nod = BEAT_NOD * std::sin(2.0f * std::numbers::pi_v<float> * beat);
  const engine::Vec3 hold{WEAPON_HOLD.x + sway.x + CANT_SHIFT.x * pose.cant, WEAPON_HOLD.y + sway.y + nod + pose.rise + CANT_SHIFT.y * pose.cant,
                          -(WEAPON_HOLD.z + sway.z - pose.back + CANT_SHIFT.z * pose.cant)};
  const engine::Mat4 body = engine::Mat4::from_basis(right, up, forward * -1.0f, hold);
  WeaponPlacement placement{.body = body, .slide = body * translation({0.0f, 0.0f, pose.slide}), .magazine = std::nullopt, .magazine_empty = pose.magazine_empty};
  if (pose.magazine_shown) placement.magazine = body * translation(MAGAZINE_WAY * pose.magazine);
  // 섬광은 총구 앞에 붙는다 — 총의 틀로 옮긴 자리라 반동·기울임·흔들림을 같이 탄다
  if (pose.flash > 0.0f)
    placement.flash = {hold + right * MUZZLE.x + up * MUZZLE.y + forward * (FLASH_AHEAD - MUZZLE.z), pose.flash, pose.flash_turn, pose.flash_size};
  return placement;
}

}  // namespace game
