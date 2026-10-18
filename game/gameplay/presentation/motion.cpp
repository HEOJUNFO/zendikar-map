#include "gameplay/presentation/motion.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>

namespace game {
namespace {

// ══ 손맛 — 느껴 가며 고칠 값 (길이는 m, 각은 라디안, 틱은 1/60 초. '따라가는 비율'은 틱마다 목표와의 차이에서 좁히는 몫) ══

// ── 걸음의 흔들림 — 걸은 거리로 위상이 나아가 8 자를 그린다 (좌우 한 번에 위아래 두 번). 멈추면 위상이 선 채로 세기만 가라앉는다 ──
// 발소리가 나는 가장 느린 걸음 (초당 m) — 멈추며 미끄러지는 끝자락에는 나지 않는다
constexpr float FOOTFALL_SPEED = 2.0f;
constexpr float BOB_STRIDE = 4.0f;    // 좌우로 한 번 흔들리는 데 걷는 거리 — 걷는 빠르기(초당 6 m)에서 위아래로 초당 세 번
constexpr float BOB_SIDE = 0.012f;    // 좌우의 폭 (한쪽으로)
constexpr float BOB_LIFT = 0.018f;    // 위아래의 폭 (한쪽으로)
constexpr float BOB_FOLLOW = 0.2f;    // 세기가 걷는 빠르기를 따라가는 비율 — 멈춘 뒤 30 틱이면 1 mm 밑으로 가라앉는다

// ── 내려설 때 눌렸다 돌아오는 용수철 (뛰어오를 때는 살짝 들린다) ──
constexpr float DIP_STIFFNESS = 200.0f;  // 클수록 빨리 돌아온다 (고유 진동 2.25 Hz)
constexpr float DIP_DAMPING = 15.5f;     // 클수록 덜 출렁인다 (감쇠비 0.55 — 한 번 살짝 되튄다)
constexpr float LAND_KICK = 0.2f;        // 내려서는 빠르기 1 m/s 마다 용수철에 싣는 빠르기 — 뛰었다 내려서면(7.6 m/s) 5.5 cm 쯤 눌린다
constexpr float LAND_SPEED_MAX = 14.0f;  // 이보다 빠르게 내려서도 더 눌리지 않는다 (10 cm 쯤)
constexpr float JUMP_KICK = 0.5f;        // 뛰어오를 때 들리는 빠르기 — 2 cm 쯤

// ── 기울임과 대시 ──
constexpr float STRAFE_ROLL = 0.010f;  // 옆걸음(걷는 빠르기)에 기우는 각 — 0.6 도
constexpr float LEAN_FOLLOW = 0.15f;
constexpr float DASH_ROLL = 0.045f;    // 옆 대시에 기우는 각 — 2.6 도
constexpr float DASH_FOV = 16.0f;      // 앞 대시에 넓어지는 시야각 (도) — 화면이 늘어난다. 옆 대시에는 그 3/4, 뒤 대시에는 절반만큼 넓어진다
constexpr float DASH_FADE = 0.86f;     // 대시의 여운이 틱마다 남는 몫 — 0.25 초쯤에 걷힌다
constexpr float DASH_ATTACK = 0.4f;    // 여운이 치솟는 비율 — 3 틱쯤에 올라선다
constexpr float FOV_FOLLOW = 0.45f;    // 시야각이 대시를 따라 넓어지는 비율 (두 번 거른다) — 대시가 8 틱뿐이라 서너 틱에 벌어진다
constexpr float FOV_RETURN = 0.45f;    // 대시가 끝난 뒤 돌아오는 비율 — 0.13 초쯤에 걷힌다 (찰나의 연출: 느리면 대시가 끝났는데도 화면이 늘어져 있다)

// ── 발사의 반동 — 그리는 눈만 짧게 들렸다 돌아온다 (세계의 조준은 그대로). 쏜 뒤 VIEW_KICK_PEAK 틱에 가장 크고 VIEW_KICK_TICKS(motion.hpp) 틱째에 0 ──
constexpr float VIEW_KICK_PEAK = 1.0f;
constexpr float VIEW_KICK_PITCH = 0.008f;  // 위로 들리는 각 — 0.46 도 (총과 시점의 반동은 미미하게 — 쏘는 손맛은 HUD 가 밀리는 것으로 낸다: 사용자 피드백 2026-10-09)
constexpr float VIEW_KICK_ROLL = 0.003f;   // 같이 기우는 각 — 0.17 도, 발마다 왼쪽·오른쪽 번갈아

// ── 시선의 되밀림 — 시선이 돈 각이 쌓였다 잦아든다. 총과 HUD 가 시선에 늦게 따라온다 ──
constexpr float SWAY_FADE = 0.82f;
constexpr float SWAY_MAX = 0.12f;

// ── 손에 든 총 (보는 쪽 기준 오른쪽·위·앞으로 옮기는 양) ──
constexpr float WEAPON_BOB_SIDE = 0.3f;   // 걸음의 흔들림에 반대로 움직이는 배율 — 좌우, 위아래
constexpr float WEAPON_BOB_LIFT = 0.25f;
constexpr float WEAPON_SWAY = 0.10f;      // 시선이 1 라디안 되밀렸을 때 옮기는 길이 — 가장 클 때 1.2 cm
constexpr float WEAPON_DIP = 0.1f;        // 내려설 때 눈이 눌리는 것에 더해 총이 눌리는 배율 — 살짝만 (크면 착지마다 손이 출렁인다)
// 총의 밀림 — 몸이 움직이는 반대쪽으로 뒤처진다. 걷기·오르내림·대시, 옆·위아래·앞뒤가 모두 한 식이다 (사용자 피드백 2026-10-09: 방향마다 따로 놀지 않게 통일):
//   밀림 = −(움직임의 세기) × WEAPON_PUSH. 세기는 대시가 1, 걷는 빠르기와 초당 8 m 의 오르내림이 WEAPON_PUSH_WALK.
//   앞뒤는 같은 길이라도 화면에서 훨씬 덜 보여, 같은 세기로 보이도록 WEAPON_PUSH_DEPTH 를 따로 둔다 (옆·위아래의 일곱 배쯤)
constexpr float WEAPON_PUSH = 0.02f;        // 옆·위아래로 가장 크게 밀리는 길이 (대시)
constexpr float WEAPON_PUSH_DEPTH = 0.10f;  // 앞뒤로 가장 크게 밀리는 길이 (대시) — 앞으로 가면 눈 쪽으로
constexpr float WEAPON_PUSH_WALK = 0.15f;   // 걸음·오르내림은 대시의 이 몫
constexpr float WEAPON_PUSH_OUT = 0.25f;    // 대시에 밀려 나가는 비율 (두 번 거른다) — 대시(8 틱) 동안 부드럽게 밀려 끝날 때 가장 크다 (확 밀리지 않게)
constexpr float WEAPON_PUSH_BACK = 0.1f;    // 대시가 끝난 뒤 돌아오는 비율 (두 번 거른다) — 반 초쯤에 걸쳐 부드럽게 돌아온다 (빠르면 튕기듯 보인다)

// ── HUD 의 밀림 (단위 — 화면 높이가 270 단위쯤이다). 목표에 용수철로 매여 살짝 지나쳤다 돌아온다. 모두 합쳐 HUD_SHOVE_MAX·HUD_SPREAD_MAX 를 넘지 않는다 ──
constexpr float HUD_STRAFE = 2.2f;    // 옆걸음(걷는 빠르기)의 반대쪽으로
constexpr float HUD_LOOK = 1.3f;      // 시선이 가장 크게 되밀렸을 때 그 반대쪽으로
constexpr float HUD_DASH = 6.0f;      // 옆 대시의 반대쪽으로
constexpr float HUD_RISE = 1.2f;      // 초당 8 m 로 오를 때 아래로 (내려올 때는 위로)
constexpr float HUD_LAND = 30.0f;     // 눈이 1 m 눌릴 때 아래로 — 뛰었다 내려서면 1.7 단위
constexpr float HUD_SPREAD = 4.0f;    // 앞 대시에 바깥으로 벌어지는 양 (뒤 대시에는 안으로)
constexpr float HUD_WALK_SPREAD = 0.8f;  // 앞으로 걸을 때(걷는 빠르기) 바깥으로 벌어지는 양 (뒤로 걸으면 안으로)
constexpr float HUD_STIFFNESS = 480.0f;  // 클수록 빨리 따라온다 (고유 진동 3.5 Hz — 0.1 초쯤에 목표에 닿는다)
constexpr float HUD_DAMPING = 24.0f;     // 클수록 덜 출렁인다 (감쇠비 0.55 — 목표를 13 % 쯤 지나쳤다 한 번에 선다)
constexpr float HUD_SHOT = 60.0f;        // 쏠 때 아래로 싣는 빠르기 (단위/초) — 1.5 단위쯤 튀었다 돌아온다
constexpr float HUD_SHOT_BACK = 30.0f;   // 쏠 때 안쪽(화면 가운데 쪽 — 뒤로 밀리는 느낌)으로 싣는 빠르기 (단위/초)

// ── 대시의 화면 가장자리 빛 — 대시 중에 틱마다 이만큼 차고(HUD_RUSH_FADE 가 가득), 끝나면 틱마다 하나씩 걷힌다 ──
constexpr uint32_t RUSH_RISE = 3;

constexpr float TAU = 2.0f * std::numbers::pi_v<float>;
constexpr float DT = static_cast<float>(World::TICK);

constexpr float mix(float a, float b, float t) { return a + (b - a) * t; }

}  // namespace

void Motion::reset(const World& world) {
  *this = {};
  const Player& player = world.player();
  pose_.view.eye = player.position;
  previous_ = pose_;
  yaw_ = player.yaw;
  pitch_ = player.pitch;
  landed_ = world.landed_tick();
  jumped_ = world.jumped_tick();
  dashed_ = world.dash_tick();
  dry_ = world.dry_tick();
  shot_ = world.shot_tick();
  health_ = player.health;
  ammo_ = world.pistol().ammo;
  reload_stage_ = world.pistol().reload_stage;
  multiplier_ = multiplier(world.streak());
  streak_ = world.streak();
  hud_.health_ghost = static_cast<float>(player.health);
}

void Motion::step(const World& world) {
  const Player& player = world.player();
  const engine::Vec3 velocity = world.velocity();
  // 보는 쪽 기준의 속도 — 앞은 (sin, -cos), 오른쪽은 (cos, sin)
  const float sin_yaw = std::sin(player.yaw), cos_yaw = std::cos(player.yaw);
  const float forward = velocity.x * sin_yaw - velocity.z * cos_yaw, side = velocity.x * cos_yaw + velocity.z * sin_yaw;
  const float speed = std::sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  // 땅을 걷는 중에만 흔들린다 — 공중과 대시(미끄러지듯 간다)에서는 가라앉는다
  const bool walking = world.grounded() && !world.dashing();

  const float before = stride_;
  if (walking) stride_ = std::fmod(stride_ + speed * DT * TAU / BOB_STRIDE, TAU);
  // 발이 닿는 때 — 위아래 흔들림 sin(2·stride) 이 가장 낮은 위상 (3/8, 7/8 바퀴). 좌우 흔들림 sin(stride) 이 오른쪽일 때가 오른발이다
  const auto passed = [&](float phase) { return stride_ >= before ? before < phase && phase <= stride_ : phase > before || phase <= stride_; };
  footfall_.reset();
  if (walking && speed >= FOOTFALL_SPEED && stride_ != before) {
    if (passed(0.375f * TAU)) footfall_ = Foot::right;
    else if (passed(0.875f * TAU)) footfall_ = Foot::left;
  }
  bob_ += ((walking ? std::min(speed / WALK_SPEED, 1.0f) : 0.0f) - bob_) * BOB_FOLLOW;

  if (world.landed_tick() != landed_) {
    landed_ = world.landed_tick();
    dip_.v -= LAND_KICK * std::min(world.landing_speed(), LAND_SPEED_MAX);
  }
  if (world.jumped_tick() != jumped_) {
    jumped_ = world.jumped_tick();
    dip_.v += JUMP_KICK;
  }
  dip_.v += (-DIP_STIFFNESS * dip_.x - DIP_DAMPING * dip_.v) * DT;
  dip_.x += dip_.v * DT;

  if (world.dash_tick() != dashed_) {
    dashed_ = world.dash_tick();
    dash_drive_ = 1.0f;
    dash_direction_ = world.dash_direction();
  }
  dash_feel_ += (dash_drive_ - dash_feel_) * DASH_ATTACK;
  dash_drive_ *= DASH_FADE;
  // 시야각은 여운(치솟았다 꺼진다)이 아니라 대시 중인지를 부드럽게 따라간다 — 확 바뀌었다 사라지지 않게. 앞 대시에 가장 넓고 옆은 3/4, 뒤는 절반
  const float fov_goal = world.dashing() ? 0.75f + 0.25f * (dash_direction_.x * sin_yaw - dash_direction_.z * cos_yaw) : 0.0f;
  const float fov_rate = world.dashing() ? FOV_FOLLOW : FOV_RETURN;
  fov_lead_ += (fov_goal - fov_lead_) * fov_rate;
  fov_ += (fov_lead_ - fov_) * fov_rate;
  const float dash_forward = (dash_direction_.x * sin_yaw - dash_direction_.z * cos_yaw) * dash_feel_;
  const float dash_side = (dash_direction_.x * cos_yaw + dash_direction_.z * sin_yaw) * dash_feel_;

  lean_ += (std::clamp(side / WALK_SPEED, -1.0f, 1.0f) * STRAFE_ROLL - lean_) * LEAN_FOLLOW;

  // 발사의 반동 — 쏜 틱에서 지난 시간만으로 정해진다: 한 틱에 치솟고 VIEW_KICK_TICKS 틱째까지 처음엔 빨리, 끝에는 느리게 돌아온다
  const bool fired = world.shot_tick() != shot_;
  if (fired) {
    shot_ = world.shot_tick();
    shots_++;
  }
  float recoil = 0.0f;
  if (const float since = shot_ && *shot_ <= world.tick() ? static_cast<float>(world.tick() - *shot_) : static_cast<float>(VIEW_KICK_TICKS); since < static_cast<float>(VIEW_KICK_TICKS)) {
    const float back = 1.0f - (since - VIEW_KICK_PEAK) / (static_cast<float>(VIEW_KICK_TICKS) - VIEW_KICK_PEAK);
    recoil = since < VIEW_KICK_PEAK ? since / VIEW_KICK_PEAK : back * back;
  }

  sway_yaw_ = std::clamp(sway_yaw_ * SWAY_FADE + std::remainder(player.yaw - yaw_, TAU), -SWAY_MAX, SWAY_MAX);
  sway_pitch_ = std::clamp(sway_pitch_ * SWAY_FADE + (player.pitch - pitch_), -SWAY_MAX, SWAY_MAX);
  yaw_ = player.yaw;
  pitch_ = player.pitch;

  previous_ = pose_;
  ViewMotion& view = pose_.view;
  // 순간 이동(포털을 넘었다, 방 밖으로 떨어졌다 돌아왔다)은 잇지 않는다 — view 가 가른다
  view.eye = player.position;
  view.bob_x = BOB_SIDE * bob_ * std::sin(stride_);
  view.bob_y = BOB_LIFT * bob_ * std::sin(2.0f * stride_);
  view.dip = dip_.x;
  view.roll = lean_ + DASH_ROLL * dash_side + (shots_ % 2 ? VIEW_KICK_ROLL : -VIEW_KICK_ROLL) * recoil;
  view.kick = VIEW_KICK_PITCH * recoil;
  view.fov = DASH_FOV * fov_;
  // 총 — 걸음에는 눈과 반대로 흔들리고(view.weapon), 시선·오르내림·걸음·대시에는 뒤처진다 (sway — 화면 흔들림을 꺼도 남는다)
  view.weapon = {-WEAPON_BOB_SIDE * view.bob_x, -WEAPON_BOB_LIFT * view.bob_y, 0.0f};
  const float rise = std::clamp(velocity.y / 8.0f, -1.5f, 1.5f);
  // 움직임의 세기 (보는 쪽 기준 오른쪽·위·앞, 대시가 1) — 한 식으로 밀린다.
  // 대시의 몫은 대시 중에 빠르게 차고, 끝나면 천천히 빠진다 (여운 dash_feel_ 은 0.25 초에 걷혀 총이 튕겨 돌아왔다)
  const bool dashing = world.dashing();
  const float push_rate = dashing ? WEAPON_PUSH_OUT : WEAPON_PUSH_BACK;
  push_lead_side_ += ((dashing ? dash_direction_.x * cos_yaw + dash_direction_.z * sin_yaw : 0.0f) - push_lead_side_) * push_rate;
  push_lead_forward_ += ((dashing ? dash_direction_.x * sin_yaw - dash_direction_.z * cos_yaw : 0.0f) - push_lead_forward_) * push_rate;
  push_side_ += (push_lead_side_ - push_side_) * push_rate;
  push_forward_ += (push_lead_forward_ - push_forward_) * push_rate;
  const float push_side = std::clamp(push_side_ + WEAPON_PUSH_WALK * side / WALK_SPEED, -1.0f, 1.0f);
  const float push_forward = std::clamp(push_forward_ + WEAPON_PUSH_WALK * forward / WALK_SPEED, -1.0f, 1.0f);
  pose_.sway = {-WEAPON_SWAY * sway_yaw_ - WEAPON_PUSH * push_side,
                -WEAPON_SWAY * sway_pitch_ + WEAPON_DIP * dip_.x - WEAPON_PUSH * WEAPON_PUSH_WALK * rise,
                -WEAPON_PUSH_DEPTH * push_forward};

  // HUD — 움직임의 반대쪽 목표에 용수철로 매여 따라간다 (살짝 지나쳤다 돌아온다). 쏘면 아래로 툭 튄다. 길이를 상한 안에 둔다 — 상한에 닿으면 거기 선다
  const float target_x = -HUD_STRAFE * std::clamp(side / WALK_SPEED, -1.0f, 1.0f) - HUD_LOOK * sway_yaw_ / SWAY_MAX - HUD_DASH * dash_side;
  const float target_y = HUD_RISE * rise + HUD_LOOK * sway_pitch_ / SWAY_MAX - HUD_LAND * dip_.x;
  if (fired) {
    shove_vy_ += HUD_SHOT;
    spread_v_ -= HUD_SHOT_BACK;
  }
  const auto pull = [](float& x, float& v, float target) {
    v += (HUD_STIFFNESS * (target - x) - HUD_DAMPING * v) * DT;
    x += v * DT;
  };
  pull(hud_.shove_x, shove_vx_, target_x);
  pull(hud_.shove_y, shove_vy_, target_y);
  if (const float length = std::sqrt(hud_.shove_x * hud_.shove_x + hud_.shove_y * hud_.shove_y); length > HUD_SHOVE_MAX) {
    hud_.shove_x *= HUD_SHOVE_MAX / length;
    hud_.shove_y *= HUD_SHOVE_MAX / length;
    shove_vx_ = shove_vy_ = 0.0f;
  }
  pull(hud_.spread, spread_v_, HUD_SPREAD * dash_forward + HUD_WALK_SPREAD * std::clamp(forward / WALK_SPEED, -1.0f, 1.0f));
  if (std::abs(hud_.spread) > HUD_SPREAD_MAX) {
    hud_.spread = std::clamp(hud_.spread, -HUD_SPREAD_MAX, HUD_SPREAD_MAX);
    spread_v_ = 0.0f;
  }

  // 대시의 가장자리 빛 — 대시 중에 차고, 끝나면(다 갔다, 뛰었다, 포털에 닿았다) 틱마다 한 단계씩 걷힌다
  rush_ = world.dashing() ? std::min(rush_ + RUSH_RISE, HUD_RUSH_FADE) : rush_ > 0 ? rush_ - 1 : 0;
  rush_age_ = rush_ > 0 ? rush_age_ + 1 : 0;
  hud_.rush = static_cast<float>(rush_) / static_cast<float>(HUD_RUSH_FADE);
  hud_.rush_age = static_cast<float>(rush_age_);

  // 값이 바뀐 요소의 강조 — 체력은 잃었을 때, 탄은 쏘고 갈 때, 배수는 올랐을 때와 연속 수를 잃었을 때(미스·피격 — 내려간 것이 보인다). 바뀐 틱에 1 이고 HUD_PULSE_TICKS 틱 뒤에 0 이다
  if (health_flash_ > 0) health_flash_--;
  if (ammo_flash_ > 0) ammo_flash_--;
  if (multiplier_flash_ > 0) multiplier_flash_--;
  if (player.health < health_) {
    health_flash_ = HUD_PULSE_TICKS;
    ghost_hold_ = HEALTH_GHOST_HOLD + 1;
  }
  health_ = player.health;
  // 탄 없이 방아쇠를 당긴 것도 탄 쪽을 강조한다 — '탄 없음'이 글자 없이 보인다
  if (world.pistol().ammo != ammo_ || world.pistol().reload_stage != reload_stage_ || world.dry_tick() != dry_) ammo_flash_ = HUD_PULSE_TICKS;
  dry_ = world.dry_tick();
  ammo_ = world.pistol().ammo;
  reload_stage_ = world.pistol().reload_stage;
  if (const uint32_t now = multiplier(world.streak()); now > multiplier_ || world.streak() < streak_) multiplier_flash_ = HUD_PULSE_TICKS;
  multiplier_ = multiplier(world.streak());
  streak_ = world.streak();
  constexpr float PULSE = 1.0f / static_cast<float>(HUD_PULSE_TICKS);
  hud_.health_pulse = static_cast<float>(health_flash_) * PULSE;
  hud_.ammo_pulse = static_cast<float>(ammo_flash_) * PULSE;
  hud_.multiplier_pulse = static_cast<float>(multiplier_flash_) * PULSE;
  // 체력의 잔상 — 잃기 전의 값에 머물다 줄어든다
  const float health = static_cast<float>(std::max(player.health, 0));
  if (ghost_hold_ > 0) ghost_hold_--;
  else hud_.health_ghost -= HEALTH_GHOST_DRAIN;
  hud_.health_ghost = std::max(hud_.health_ghost, health);
}

ViewMotion Motion::view(float alpha, bool shake) const {
  // 지난 틱과 이번 틱 사이를 잇는다. 한 틱에 이만큼 넘게 옮겨 갔으면(대시는 0.4 m) 순간 이동이다 — 잇지 않는다
  constexpr float TELEPORT = 2.0f;
  const ViewMotion& from = previous_.view;
  const ViewMotion& to = pose_.view;
  const float t = std::clamp(alpha, 0.0f, 1.0f);
  const engine::Vec3 moved = to.eye - from.eye;
  ViewMotion out;
  out.eye = engine::dot(moved, moved) > TELEPORT * TELEPORT ? to.eye : from.eye + moved * t;
  const engine::Vec3 sway = previous_.sway + (pose_.sway - previous_.sway) * t;
  if (!shake) {
    out.weapon = sway;
    return out;
  }
  out.bob_x = mix(from.bob_x, to.bob_x, t);
  out.bob_y = mix(from.bob_y, to.bob_y, t);
  out.dip = mix(from.dip, to.dip, t);
  out.roll = mix(from.roll, to.roll, t);
  out.fov = mix(from.fov, to.fov, t);
  out.kick = mix(from.kick, to.kick, t);
  out.weapon = from.weapon + (to.weapon - from.weapon) * t + sway;
  return out;
}

HudMotion Motion::hud(bool shake) const {
  HudMotion out = hud_;
  if (!shake) out.shove_x = out.shove_y = out.spread = out.rush = out.rush_age = 0.0f;
  return out;
}

}  // namespace game
