#pragma once

#include <cstdint>
#include <optional>

#include "engine/foundation/math.hpp"
#include "gameplay/simulation/world.hpp"

// 움직임의 연출 — 걷고 뛰고 내려서고 대시하는 몸의 움직임과 발사의 반동을 시점의 흔들림, 손에 든 총의 흔들림, HUD 의 밀림, 대시의 화면 가장자리 빛으로 옮긴다.
// 시뮬레이션 밖이다: 세계를 읽기만 하고, 판정(발사 광선은 세계의 눈에서 세계의 조준 방향으로 나간다)에는 닿지 않는다.
// 세계가 한 틱 나아갈 때마다 한 번 나아간다 (step) — 고정 간격으로만 적분해 화면 주사율과 상관없이 같은 결과다. 세계가 멈추면(일시정지) 같이 멈춘다.
// 손으로 느껴 가며 고칠 값은 motion.cpp 머리에 모여 있다.
namespace game {

/**
 * 한 프레임의 시점 연출 — 카메라와 손에 든 총이 같이 읽는다. 세계의 조준 방향(yaw·pitch)은 건드리지 않는다: 눈의 자리와 기울임, 시야각,
 * 그리고 쏜 직후 잠깐 그리는 눈만 들리는 반동(kick)이 움직인다
 */
struct ViewMotion {
  /** 그릴 때의 눈 — 세계의 눈을 지난 틱과 이번 틱 사이에서 이은 자리 (흔들림은 들어 있지 않다) */
  engine::Vec3 eye{};
  /** 걸음의 흔들림 (m) — 보는 쪽 기준 오른쪽, 위 */
  float bob_x{};
  float bob_y{};
  /** 내려설 때 눌렸다 돌아오는 높이 (m, 눌리면 음수). 뛰어오를 때는 살짝 들린다 */
  float dip{};
  /** 기울임 (라디안) — 양수면 오른쪽으로 기운다 (옆걸음, 옆 대시) */
  float roll{};
  /** 시야각에 더하는 각 (도) — 앞 대시에 넓어진다 */
  float fov{};
  /**
   * 발사의 반동 — 그리는 눈이 위로 들린 각 (라디안). 쏜 다음 틱에 가장 크고 VIEW_KICK_TICKS 틱째에 0 으로 돌아온다 (다음 칸의 발사 전에 늘 제자리다).
   * 화면만 들린다: 세계의 조준 방향과 발사 광선은 그대로라 연사해도 조준이 올라가지 않는다
   */
  float kick{};
  /** 손에 든 총을 옮기는 양 (m) — 보는 쪽 기준 오른쪽, 위, 앞 */
  engine::Vec3 weapon{};
};

/** 걷는 발 */
enum class Foot : uint8_t { left, right };

/** HUD 의 움직임 — 틱마다 정해진다 (틱 사이에서 잇지 않는다: HUD 가 프레임마다 다시 조립되지 않게) */
struct HudMotion {
  /** 네 모서리의 묶음을 미는 양 (단위, 오른쪽·아래가 양수) — 움직임의 반대쪽으로 밀렸다 따라온다 */
  float shove_x{};
  float shove_y{};
  /** 네 모서리의 묶음을 화면 가운데에서 바깥으로 벌리는 양 (단위) — 앞 대시에 벌어지고 뒤 대시에 모인다 */
  float spread{};
  /** 대시의 화면 가장자리 빛 0..1 — 대시 중에 차고(두 틱), 대시가 끝나면 HUD_RUSH_FADE 틱에 걸쳐 걷혀 0 이다 */
  float rush{};
  /** 그 빛이 켜진 뒤로 지난 틱 — 가장자리의 바람 줄기가 이만큼 흘렀다 (rush 가 0 이면 0) */
  float rush_age{};
  /** 값이 방금 바뀌었다 — 1 에서 0 으로 잦아든다 (그 요소가 잠깐 또렷해지고 커진다). 체력(잃었을 때), 탄(쏘고 갈 때, 탄 없이 방아쇠를 당겼을 때), 배수(올랐을 때, 미스·피격으로 연속 수를 잃었을 때) */
  float health_pulse{};
  float ammo_pulse{};
  float multiplier_pulse{};
  /** 체력의 잔상 — 잃기 전의 값에 잠깐 머물다 지금 체력으로 줄어든다 */
  float health_ghost{static_cast<float>(PLAYER_HEALTH)};
  constexpr bool operator==(const HudMotion&) const = default;
};

/** HUD 의 밀림이 닿는 가장 큰 양 (단위) — shove 의 길이와 spread 의 크기. 화면 높이 270 단위의 2.2 % 까지 (대시에 크게 밀리게 — 사용자 피드백 2026-10-09) */
inline constexpr float HUD_SHOVE_MAX = 6.0f;
inline constexpr float HUD_SPREAD_MAX = 4.0f;
/** 쏜 뒤 시점의 반동이 다 돌아오기까지 (틱) — 반박(20 틱)보다 짧다 */
inline constexpr uint32_t VIEW_KICK_TICKS = 9;
/** 대시가 끝난 뒤 화면 가장자리 빛이 걷히기까지 (틱) — 0.1 초 */
inline constexpr uint32_t HUD_RUSH_FADE = 6;
/** 값이 바뀐 요소가 또렷해졌다 가라앉는 시간 (틱) — 0.2 초 */
inline constexpr uint32_t HUD_PULSE_TICKS = 12;
/** 체력의 잔상이 잃기 전의 값에 머무는 시간 (틱)과, 그 뒤 틱마다 줄어드는 양 — 25 를 잃으면 0.25 초 머물고 0.25 초에 걸쳐 줄어든다 */
inline constexpr uint32_t HEALTH_GHOST_HOLD = 15;
inline constexpr float HEALTH_GHOST_DRAIN = 25.0f / 15.0f;

class Motion {
 public:
  /** 새 판 — 지난 판의 흔들림을 잊고 이 세계의 지금에서 시작한다 */
  void reset(const World& world);
  /** 세계가 한 틱 나아간 바로 뒤에 부른다 */
  void step(const World& world);

  /**
   * 이 프레임의 시점 연출 — alpha 는 지난 틱에서 이번 틱으로 가는 사이의 위치 0..1 (틱보다 잦은 화면에서 눈이 끊기지 않게 잇는다).
   * shake 가 꺼져 있으면(옵션의 '화면 흔들림') 걸음·착지·대시·발사 반동의 시점 연출이 없다 — 눈의 자리 잇기와 총의 되밀림(시선에 늦게 따라옴, 착지·대시에 밀림)은 남는다
   */
  ViewMotion view(float alpha, bool shake = true) const;
  /**
   * 이번 틱에 땅에 닿은 발 — 걸음의 흔들림이 가장 낮은 때다 (2 m 마다 한 발: 걷는 빠르기에서 반박에 한 걸음). 몸이 기운 쪽의 발이 닿는다.
   * 땅을 걷는 중에만 (공중·대시, 아주 느린 걸음에는 없다). 소리가 읽는다
   */
  std::optional<Foot> footfall() const { return footfall_; }
  /** 이번 틱의 HUD 움직임 — shake 가 꺼져 있으면 밀림과 대시의 가장자리 빛이 없다 (값이 바뀐 요소의 강조와 체력의 잔상은 남는다) */
  HudMotion hud(bool shake = true) const;

 private:
  /** 눌렸다 돌아오는 용수철 — 자리와 빠르기 */
  struct Spring {
    float x{};
    float v{};
  };
  /** 한 틱의 시점 — view 가 지난 틱의 것과 이번 틱의 것을 잇는다. sway 는 shake 를 꺼도 남는 총의 되밀림 */
  struct Pose {
    ViewMotion view{};
    engine::Vec3 sway{};
  };

  Pose previous_{};
  Pose pose_{};
  HudMotion hud_{};
  // HUD 의 밀림은 용수철이다 — 목표를 살짝 지나쳤다 돌아온다 (shove 의 가로·세로, spread)
  float shove_vx_{};
  float shove_vy_{};
  float spread_v_{};
  // 대시의 가장자리 빛 — 0..HUD_RUSH_FADE 의 단계와 켜진 뒤로 지난 틱
  uint32_t rush_{};
  uint32_t rush_age_{};
  // 쏜 발 수 — 반동이 기우는 쪽이 발마다 번갈아 든다
  uint32_t shots_{};

  // 걸음 — 걸은 거리로 나아가는 위상(라디안)과 흔들림의 세기 0..1
  float stride_{};
  float bob_{};
  std::optional<Foot> footfall_;
  Spring dip_{};
  // 옆걸음의 기울임, 대시의 여운 (치솟았다 잦아든다)과 그 방향
  float lean_{};
  float dash_drive_{};
  float dash_feel_{};
  // 대시의 시야각 — 두 번 걸러 부드럽게 넓어졌다 돌아온다
  float fov_lead_{};
  float fov_{};
  // 대시에 총이 밀리는 세기 (보는 쪽 기준 옆·앞) — 두 번 걸러 부드럽게 밀렸다 천천히 돌아온다
  float push_lead_side_{};
  float push_lead_forward_{};
  float push_side_{};
  float push_forward_{};
  engine::Vec3 dash_direction_{};
  // 시선이 돈 만큼 쌓였다 잦아드는 되밀림 (라디안)
  float sway_yaw_{};
  float sway_pitch_{};
  float yaw_{};
  float pitch_{};
  // 이미 본 일 — 세계의 '마지막으로 일어난 틱'이 달라지면 새 일이다
  std::optional<uint64_t> landed_, jumped_, dashed_, dry_, shot_;
  // HUD 의 값들 — 달라지면 강조한다
  int32_t health_{PLAYER_HEALTH};
  uint32_t ammo_{Pistol::MAGAZINE};
  uint32_t reload_stage_{};
  uint32_t multiplier_{1};
  uint32_t streak_{};
  // 강조가 남은 틱 — HudMotion 의 *_pulse 는 이것을 HUD_PULSE_TICKS 로 나눈 값이다
  uint32_t health_flash_{};
  uint32_t ammo_flash_{};
  uint32_t multiplier_flash_{};
  uint32_t ghost_hold_{};
};

}  // namespace game
