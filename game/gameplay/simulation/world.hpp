#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/spatial/lbvh.hpp"
#include "gameplay/domain/combat.hpp"
#include "gameplay/domain/dungeon.hpp"
#include "gameplay/domain/random.hpp"
#include "gameplay/domain/rhythm.hpp"

// 게임 시뮬레이션 — 고정 틱으로만 나아가고, 같은 시드와 같은 입력이면 어디서나 같은 결과가 나온다.
// GPU·화면·오디오 장치를 모른다 (서버가 같은 코드를 Node 에서 돌린다 — tests/sim_probe.cpp 가 그렇게 돌려 본다).
//   층: 세계에는 한 번에 방 하나만 있다 (방 가운데가 원점). 문은 이웃 방으로 넘어가는 포털이고, 열린 포털에 몸이 닿으면 짧게 넘어가 이웃 방의 맞은편 문 안쪽에 선다.
//       전투방에 처음 닿으면 곧바로 문이 잠기고 적이 나오며, 다 잡으면 열린다. 모든 전투방을 비우면 층이 끝난다.
//   방: 닫힌 실내이고 틀마다 모양이 다르다 (domain/dungeon.hpp — 정사각 홀, 긴 홀, ㄱ 자, 십자, T 자). 틀의 충돌 상자와 길의 점을 방의 돌림(Room::turn)만큼 돌려 올린다.
//   적의 길: 플레이어까지 곧게 걸어갈 수 있으면(walk_clear) 곧게 다가가고, 모퉁이에 가렸으면 틀의 길의 점을 따라 돌아간다 (route — 점들의 이음 위에서 플레이어까지 가장 짧은 길).
//       공격은 길이 트였을 때만 시작한다 (돌진형은 곧게 걸어갈 수 있을 때, 원거리형은 투사체가 곧게 닿을 때). 모두 고정 틱의 결정적인 셈이다.
//   박자: 발사·재장전·대시만 박자에 묶인다 (domain/rhythm.hpp) — 정박·어긋남이면 나가고(정박만 배수를 올린다) 미스면 나가지 않는다. 적은 박의 머리에서만 공격을 시작한다.
namespace game {

/** 눈높이, 걸어서 오를 수 있는 턱의 높이 */
inline constexpr float EYE_HEIGHT = 1.6f;
inline constexpr float STEP_HEIGHT = 0.5f;

// ── 움직임의 손맛 — 손으로 느껴 가며 고칠 값은 여기에 모여 있다 (빠르기는 초당 m, 가속은 m/s², 시간은 틱 = 1/60 초) ──
// 몸은 수평 속도를 갖는다: 걸으려는 쪽으로 가속해 붙고, 손을 떼면 마찰로 미끄러져 서고, 공중에서는 뛰기 전의 속도를 지닌다.
/** 걷는 빠르기의 상한 — 적의 수치(돌진 20, 투사체 12)가 이 값에 맞춰져 있다. 대각선으로 걸어도 같다 */
inline constexpr float WALK_SPEED = 6.0f;
/** 땅에서 걸으려는 속도로 다가가는 가속 — 틱마다 0.8 m/s: 선 자리에서 8 틱(0.13 초)에 최고 속도. 키우면 더 즉각적이다 */
inline constexpr float GROUND_ACCEL = 48.0f;
/**
 * 땅에서 걸음을 멈췄을 때의 마찰 — 틱마다 0.6 m/s: 최고 속도에서 10 틱(0.17 초), 0.45 m 를 미끄러져 선다. 줄이면 더 미끄럽다.
 * 가던 쪽과 맞서 걸으면 가속에 이것이 더해진다 (틱마다 1.4 m/s — 5 틱째에 돌아서고 12 틱째에 반대쪽 최고 속도)
 */
inline constexpr float GROUND_FRICTION = 36.0f;
/** 공중에서 걸으려는 쪽으로 붙는 가속 — 땅의 1/4 (틱마다 0.2 m/s). 방향을 조금 틀 뿐, 뛰기 전의 빠르기(와 걷는 빠르기)보다 빨라지지 않는다. 마찰은 없다 */
inline constexpr float AIR_ACCEL = 12.0f;
/**
 * 대시 — 빠르기가 틱마다 정해진 곡선을 따른다: DASH_RISE 틱에 DASH_SPEED 까지 치솟고(첫 틱부터 36), DASH_HOLD 틱 동안 지키고,
 * DASH_EASE 틱에 걸쳐 걷는 빠르기까지 줄어든다(26 → 16 → 6). 모두 8 틱(0.13 초)에 3.8 m — 빠르고 짧다
 * (사용자 피드백 2026-10-09: 길게도 멀리도 해 보았으나 BPM 의 대시는 빠르고 거리가 짧고 연출도 찰나다 — 그쪽으로).
 * 끝난 뒤에는 여느 걸음이다 — 걷고 있으면 그대로 걸음으로 이어지고, 손을 떼고 있으면 0.45 m 더 미끄러져 선다 (선 자리에서 모두 4.25 m).
 * 한 번 쓰면 다음 박(두 칸 뒤)부터 다시 쓴다
 */
inline constexpr float DASH_SPEED = 36.0f;
inline constexpr uint32_t DASH_RISE = 1;
inline constexpr uint32_t DASH_HOLD = 4;
inline constexpr uint32_t DASH_EASE = 3;
inline constexpr uint32_t DASH_TICKS = DASH_RISE + DASH_HOLD + DASH_EASE;
/** 대시 중에 뛰면 대시는 거기서 끝나고 그때의 속도를 싣고 뛴다 — 이 빠르기까지만 (한 번 뛰는 0.67 초에 6.7 m) */
inline constexpr float DASH_JUMP_SPEED = 10.0f;
/** 대시의 k 번째 틱(1 부터)의 빠르기 */
constexpr float dash_speed(uint32_t k) {
  if (k <= DASH_RISE) return DASH_SPEED * static_cast<float>(k) / static_cast<float>(DASH_RISE);
  if (k <= DASH_RISE + DASH_HOLD) return DASH_SPEED;
  return DASH_SPEED + (WALK_SPEED - DASH_SPEED) * static_cast<float>(k - DASH_RISE - DASH_HOLD) / static_cast<float>(DASH_EASE);
}

/** 맞은 뒤 다시 맞지 않는 시간 (틱) — 한 박 */
inline constexpr uint32_t HURT_GRACE = TICKS_PER_BEAT;
/**
 * 포털 넘기 — 열린 포털에 닿은 틱부터 이만큼(0.4 초) 이어지고, 그 한가운데(닿은 뒤 TRANSIT_SWAP 틱째)에 방이 바뀐다.
 * 넘는 동안에는 걷기·뛰기·박자 행동과 적이 멈추고, 박자(틱)와 시선만 간다
 */
inline constexpr uint32_t TRANSIT_TICKS = 24;
inline constexpr uint32_t TRANSIT_SWAP = 12;
/** 새 방에서 서는 자리 — 넘어온 포털 면에서 안쪽으로 (m). 포털에 닿는 자리보다 안쪽이라, 되돌아 걸어야 다시 넘어간다 */
inline constexpr float ARRIVAL_DEPTH = 2.5f;
/** 전투방에 닿은 뒤 적이 공격(예고·모으기)을 시작하지 않는 시간 (틱) — 두 박. 그동안에도 다가오기는 한다 */
inline constexpr uint32_t ARRIVAL_GRACE = 2 * TICKS_PER_BEAT;

struct Player {
  /** 눈의 자리 — 발은 EYE_HEIGHT 만큼 아래 */
  engine::Vec3 position{0.0f, EYE_HEIGHT, 0.0f};
  float yaw{};
  float pitch{};
  int32_t health{PLAYER_HEALTH};
};

/** 박자에 묶인 행동 */
enum class Action : uint8_t { fire, reload, dash };

enum class EnemyKind : uint8_t {
  /** 근접 — 다가와 두 박 예고한 뒤 곧게 돌진한다. 플레이어에 닿으면 거기서 멈춘다 */
  charger,
  /** 원거리 — 거리를 두고 한 박 모은 뒤 투사체를 쏜다 */
  caster,
};

struct EnemyTraits {
  int32_t health;
  /** 다가오는 빠르기 (초당) */
  float speed;
  /** 몸 — 가로 반폭과 높이 */
  float half_width;
  float height;
  /** 예고(모으기)의 길이 (틱) */
  uint32_t windup;
  /** 공격 뒤 다시 공격을 시작할 수 있을 때까지 (틱) */
  uint32_t recover;
  /** 한꺼번에 공격(예고·돌진, 모으기)할 수 있는 수 — 종류마다 따로 센다 */
  uint32_t tokens;
};
inline constexpr EnemyTraits CHARGER{.health = 100, .speed = 4.0f, .half_width = 0.6f, .height = 1.8f, .windup = 2 * TICKS_PER_BEAT, .recover = TICKS_PER_BEAT, .tokens = 1};
inline constexpr EnemyTraits CASTER{.health = 50, .speed = 3.0f, .half_width = 0.55f, .height = 2.4f, .windup = TICKS_PER_BEAT, .recover = 2 * TICKS_PER_BEAT, .tokens = 2};
constexpr const EnemyTraits& traits(EnemyKind kind) { return kind == EnemyKind::charger ? CHARGER : CASTER; }

/** 돌진형이 예고를 시작하는 거리, 돌진의 빠르기(초당)와 길이(틱) — 12 m */
inline constexpr float CHARGE_RANGE = 9.0f;
inline constexpr float CHARGE_SPEED = 20.0f;
inline constexpr uint32_t CHARGE_TICKS = 36;
/** 원거리형이 머무는 거리의 안팎, 투사체의 빠르기(초당)와 반지름, 사라질 때까지 (틱) */
inline constexpr float CASTER_NEAR = 10.0f;
inline constexpr float CASTER_FAR = 18.0f;
inline constexpr float BOLT_SPEED = 12.0f;
inline constexpr float BOLT_RADIUS = 0.3f;
inline constexpr uint32_t BOLT_TICKS = 6 * TICK_RATE;

struct Enemy {
  enum class Act : uint8_t {
    /** 다가가거나 거리를 잡는다 — 박의 머리에서 공격을 시작할 수 있다 */
    roam,
    /** 예고(돌진형)·모으기(원거리형) — 제자리에 서 있다 */
    windup,
    /** 돌진 중 (돌진형만) */
    charge,
    /** 공격을 마치고 쉰다 — roam 처럼 움직이지만 공격을 시작하지 않는다 */
    recover,
  };

  EnemyKind kind;
  /** 발의 자리 (몸의 가운데 아래) */
  engine::Vec3 position;
  /** 보는 쪽 */
  float yaw{};
  int32_t health;
  Act act{Act::roam};
  /** 지금 act 에 들어선 뒤로 지난 틱 */
  uint32_t act_ticks{};
  /** 돌진하는 쪽 (길이 1, 수평) — 예고를 시작할 때의 플레이어 쪽으로 굳는다 */
  engine::Vec3 aim{};
  /** 플레이어가 가려 길의 점을 따라 돌아가는 중이다 (그 틱의 판단) */
  bool routing{};
  /** 마지막으로 총에 맞은 틱 */
  std::optional<uint64_t> hurt_tick{};
  float fall_speed{};
  bool grounded{};
};

struct Projectile {
  engine::Vec3 position;
  /** 초당 — 쏜 뒤 바뀌지 않는다 (유도 없음) */
  engine::Vec3 velocity;
  uint32_t age{};
};

/** 적의 몸이 차지하는 상자 — 발사 판정과 화면(겨눈 적 밝히기)이 같이 쓴다 */
constexpr engine::Aabb enemy_box(const Enemy& enemy) {
  const EnemyTraits& t = traits(enemy.kind);
  return {{enemy.position.x - t.half_width, enemy.position.y, enemy.position.z - t.half_width},
          {enemy.position.x + t.half_width, enemy.position.y + t.height, enemy.position.z + t.half_width}};
}

/**
 * 세계에서 일어난 일 하나 — 화면 밖의 표현(소리)이 하나도 빠짐없이, 일어난 차례로 읽는다 (World::event).
 * 시뮬레이션은 누가 읽는지 모른다: 일어난 일을 적어 둘 뿐이고, 읽는 쪽이 어디까지 읽었는지를 스스로 센다
 */
struct WorldEvent {
  enum class Kind : uint8_t {
    /** 총이 나갔다 · 그 총알이 적에 맞았다 (at 은 그 적) · 그 적이 쓰러졌다 */
    shot,
    hit,
    kill,
    /** 재장전의 두 단계 — 탄창을 뺐다, 끼웠다 */
    magazine_out,
    magazine_in,
    /** 탄이 없는데 방아쇠를 당겼다 (빈 탄창, 또는 탄창을 빼 둔 동안) — 총은 나가지 않는다 */
    dry,
    /** 박을 크게 벗어나 눌러 행동(발사·재장전·대시)이 나가지 않았다 */
    miss,
    dash,
    /** 땅을 차고 뛰어올랐다 · 공중에 있다가 땅에 내려섰다 (턱에서 내려선 것, 처음 방에 떨어져 선 것도) */
    jumped,
    landed,
    /** 플레이어가 맞았다 · 그래서 죽었다 */
    hurt,
    dead,
    /** 적이 예고(돌진형)·모으기(원거리형)를 시작했다 · 돌진을 시작했다 · 투사체를 쐈다 (at 은 그 적, enemy 는 그 종류) */
    windup,
    charge,
    bolt,
    /** 투사체가 벽·기둥·잠긴 문에 맞아 사라졌다 (at 은 그 자리). 플레이어에 맞은 것(hurt)과 날다 사라진 것은 아니다 */
    bolt_wall,
    /** 전투방에 닿아 문이 잠겼다 · 방을 비워 포털이 열렸다 · 층의 전투방을 다 비웠다 */
    locked,
    opened,
    cleared,
    /** 포털에 닿아 넘기 시작했다 · 건너편 방에 섰다 */
    portal,
    arrived,
  };

  Kind kind;
  EnemyKind enemy{};
  uint64_t tick{};
  /** 일어난 자리 — 적의 일이면 그 적의 발, 그 밖에는 플레이어의 눈 */
  engine::Vec3 at{};
};

class World {
 public:
  /** 틱 하나의 길이 (초) */
  static constexpr double TICK = 1.0 / TICK_RATE;

  enum class Outcome : uint8_t { playing, dead, cleared };

  /** 시드로 층을 지어 시작 방 가운데에 선다 (방 가운데가 원점). kit 의 상자들은 세계보다 오래 살아야 한다 */
  World(uint32_t seed, const RoomKit& kit);
  /** 정해 준 층에서 (rooms[0] 이 시작 방) — 시드는 적이 나오는 자리만 정한다 */
  World(Floor floor, const RoomKit& kit, uint32_t seed = 1);

  /** 틱 하나만큼 나아간다. 판이 끝났으면(죽음·층 완료) 멈춰 있다 */
  void step();
  /** 시선을 돌린다 (라디안). pitch 는 위아래 끝에서 멈춘다 */
  void look(float delta_yaw, float delta_pitch);
  /** 걸으려는 방향 — 보는 쪽 기준 앞(+)·뒤(-), 오른쪽(+)·왼쪽(-). 다시 부를 때까지 이어진다 */
  void move(float forward, float strafe);
  /** 땅을 딛고 있으면 뛰어오른다 (박자와 무관하다) */
  void jump();
  /**
   * 박자에 묶인 행동 — 지금 나갔으면 true. 누른 때가 가장 가까운 칸의 머리에서 벗어난 정도로 판정한다 (verdict_at):
   *   정박: 나간다 (beat_tick). 방에 적이 있으면 연속 수가 오른다.
   *   어긋남: 나가되 연속 수는 그대로다 (off_tick 과 off_side 가 남는다).
   *   미스: 나가지 않는다 — 탄·재장전 단계·대시가 그대로이고 그 칸도 쓰지 않는다. 사건 miss 가 남고(miss_tick·miss_side), 방에 적이 있으면 배수가 한 단계 내려간다
   *         (streak_after_miss — 적이 없는 방에서는 오르지도 않으니 깎지도 않는다). 기억해 둔 행동은 건드리지 않는다.
   * 판정에 앞서 박자와 무관한 것을 거른다 (미스가 되지 않는다): 판이 끝났거나 포털을 넘는 중, 가득 찬 탄창의 재장전, 빈 방아쇠.
   * 무기의 행동(발사·재장전)은 한 칸에 하나다. 나가는 창 안에서 눌렀는데 그 칸에 이미 한 것이 있으면: 발사 뒤의 발사(연타)는 아무 일도 없고, 그 밖(쏘자마자 재장전, 재장전 두 번,
   * 끼우자마자 발사)은 하나만 기억해 두었다가(나중 것이 앞의 것을 대신한다) 다음 칸의 창이 열리는 틱에 내보낸다 — 그렇게 나간 것은 연속 수를 올리지 않는다. 포털에 닿으면 기억한 것은 버린다.
   * 대시는 무기와 칸을 나눠 쓰지 않는다 (박에 맞춰 대시하며 쏘면 둘 다 나간다). 포털을 넘는 중에는 아무 행동도 나가지 않는다.
   *   fire: 지금 보는 쪽으로 쏜다. 탄이 없으면(탄창이 비었거나 빼 두었다) 빈 방아쇠다 — 나가지 않고, 재장전도 나아가지 않고, 칸도 쓰지 않고, 판정도 하지 않는다
   *   reload: 재장전 한 단계 (탄창 빼기 → 끼우기) — 재장전은 이것으로만 한다. 탄이 남은 탄창도 뺄 수 있다 (남은 탄은 버린다). 가득 찬 탄창이면 아무 일도 없다
   *   dash: 걷는 쪽(안 걷고 있으면 앞)으로 짧고 빠르게 (dash_speed 의 곡선). 쓴 칸과 그 다음 칸에는 나가지 않는다 (나가는 창 안에서 누른 쿨다운 중의 대시는 미스가 아니다)
   * ago 는 누른 뒤 이 부름까지 지난 틱 — 어느 칸인가와 판정은 누른 때의 틱으로 정하고, 행동은 지금 나간다. 입력이 늦게 닿아도(프레임 사이, 전달 지연)
   * 판정이 밀리지 않는다. 음수면 누른 때를 그만큼 뒤로 본다 (조립 지점이 사람·기기의 일정한 치우침을 덜어 낸 값 — input/judge.hpp).
   * -MAX_INPUT_LEAD … MAX_INPUT_AGE 로 자른다
   */
  bool act(Action action, int32_t ago = 0);
  /** 입력이 닿기까지 지난 것으로 쳐 주는 틱의 상한과, 누른 때를 뒤로 보는 틱의 상한 — 한 칸씩 */
  static constexpr int32_t MAX_INPUT_AGE = TICKS_PER_SLOT;
  static constexpr int32_t MAX_INPUT_LEAD = TICKS_PER_SLOT;

  const Player& player() const { return player_; }
  // 몸의 움직임 — 화면의 연출(시점 흔들림, 손에 든 총, HUD 밀림)과 소리가 읽는다. 판정은 읽는 쪽과 무관하다
  /** 속도 (초당) — x·z 는 걷기·대시의 수평 속도, y 는 오르내리는 빠르기 (오르면 양수) */
  engine::Vec3 velocity() const { return {velocity_.x, fall_speed_, velocity_.z}; }
  bool grounded() const { return grounded_; }
  /** 마지막으로 뛰어오른 틱, 마지막으로 땅에 내려선 틱과 그때 내려오던 빠르기 (초당, 양수) */
  std::optional<uint64_t> jumped_tick() const { return jumped_tick_; }
  std::optional<uint64_t> landed_tick() const { return landed_tick_; }
  float landing_speed() const { return landing_speed_; }
  /** 마지막으로 대시가 나간 틱과 그 방향 (수평, 길이 1) — 그 뒤 DASH_TICKS 동안(뛰거나 포털에 닿으면 거기까지) 대시 중이다 */
  std::optional<uint64_t> dash_tick() const { return dash_tick_; }
  engine::Vec3 dash_direction() const { return dash_direction_; }
  bool dashing() const { return dash_left_ > 0; }
  /** 마지막으로 대시가 든 칸 — 그 칸과 다음 칸에는 대시가 나가지 않는다 (화면이 쿨다운을 보이는 데 읽는다) */
  std::optional<uint64_t> dash_slot() const { return dash_slot_; }
  const Pistol& pistol() const { return pistol_; }
  const Floor& floor() const { return floor_; }
  /** 지금 있는 방 — 세계에 있는 것은 이 방뿐이다 */
  uint32_t room() const { return room_; }
  /** 지금 방의 문이 잠겨 있다 (석판이 포털을 막는다) — 적이 남아 있는 동안 */
  bool locked() const { return !enemies_.empty(); }
  /** 지금 방의 포털이 열린 때 (적을 다 잡은 틱) — 올 때부터 열려 있던 방이면 없다 */
  std::optional<uint64_t> opened_tick() const { return opened_tick_; }
  /** 마지막으로 포털에 닿은 틱과 그 포털이 난 쪽 — 그 뒤 TRANSIT_TICKS 동안 넘는 중이고, 닿은 뒤 TRANSIT_SWAP 틱째에 방이 바뀐다 */
  std::optional<uint64_t> portal_tick() const { return portal_tick_; }
  Direction portal_side() const { return portal_side_; }
  bool in_transit() const { return portal_tick_ && tick_ - *portal_tick_ < TRANSIT_TICKS; }
  /** 방마다 — 들어가 본 적이 있는가, 비웠는가 (적이 없는 방은 처음부터 비운 방이다) */
  bool visited(uint32_t room) const { return visited_[room]; }
  bool cleared(uint32_t room) const { return cleared_[room]; }
  /** 비운 전투방 수와 전투방 수 (시작 방은 세지 않는다) */
  uint32_t rooms_cleared() const;
  uint32_t rooms_total() const;
  /** 지금 방의 적들과 날아가는 투사체들 — 다음 step·act 까지만 유효하다 */
  std::span<const Enemy> enemies() const { return enemies_; }
  std::span<const Projectile> projectiles() const { return projectiles_; }
  /** 지금 방의 충돌 상자 (잠긴 문을 막는 석판은 들어 있지 않다) */
  const engine::Lbvh& stage() const { return stage_; }
  /** 지금 방의 길의 점들 (방의 좌표 — 틀의 것을 돌려 놓았다) */
  std::span<const engine::NavNode> nav() const { return nav_; }
  /** 발의 자리 from 에서 to 까지 몸(반폭 half_width)이 곧게 걸어갈 수 있는가 — 무릎 높이의 두 광선(몸의 양옆)이 충돌 상자에 막히지 않는다. 걸어 오르는 턱은 막지 않는다 */
  bool walk_clear(engine::Vec3 from, engine::Vec3 to, float half_width) const;

  Outcome outcome() const { return outcome_; }
  /** 지금까지 지난 틱 수 */
  uint64_t tick() const { return tick_; }
  uint32_t score() const { return score_; }
  /** 박자에 맞춰 이어 간 행동 수 — 배수는 multiplier(streak) */
  uint32_t streak() const { return streak_; }
  // 화면이 잠깐 보여 주는 것들의 때 (틱) — 총이 나간 때, 그 총알이 적에 맞은 때, 플레이어가 맞은 때
  std::optional<uint64_t> shot_tick() const { return shot_tick_; }
  std::optional<uint64_t> hit_tick() const { return hit_tick_; }
  std::optional<uint64_t> hurt_tick() const { return hurt_tick_; }
  /** 마지막으로 정박으로 나간 행동의 틱 (방에 적이 없어 연속 수가 오르지 않을 때도 남는다) */
  std::optional<uint64_t> beat_tick() const { return beat_tick_; }
  /** 마지막으로 어긋나 나간(정박의 창 밖, 나가는 창 안) 행동의 틱과 그 쪽 — -1 일렀다 (칸의 머리 앞), +1 늦었다 (머리 뒤) */
  std::optional<uint64_t> off_tick() const { return off_tick_; }
  int off_side() const { return off_side_; }
  /** 마지막 미스(박을 크게 벗어나 나가지 않은 누름)의 틱과 그 쪽 (off_side 와 같다), 지금까지의 미스 수 (줄지 않는다 — 조립 지점이 그 누름이 미스였는지 안다) */
  std::optional<uint64_t> miss_tick() const { return miss_tick_; }
  int miss_side() const { return miss_side_; }
  uint32_t misses() const { return misses_; }
  /** 다음 칸에 내보내려고 기억해 둔 무기의 행동이 있다 */
  bool pending() const { return pending_.has_value(); }
  /** 마지막으로 빈 방아쇠를 당긴 틱 — 화면이 탄 쪽을 잠깐 강조한다 */
  std::optional<uint64_t> dry_tick() const { return dry_tick_; }

  /** 적어 두는 일의 수 — 이보다 오래된 것은 밀려난다 */
  static constexpr std::size_t EVENT_CAPACITY = 64;
  /** 지금까지 일어난 일의 수 (줄지 않는다) — 번호 event_count() - 1 이 가장 새 일이다 */
  uint64_t event_count() const { return event_count_; }
  /**
   * 번호 sequence 의 일. 읽는 쪽은 제가 읽은 데까지의 번호를 갖고 event_count() 까지 차례로 읽는다.
   * 가장 새 것에서 EVENT_CAPACITY 개까지만 남아 있다 — 그보다 오래된 번호(와 아직 없는 번호)는 nullopt 이고, 읽는 쪽이 건너뛴다
   */
  std::optional<WorldEvent> event(uint64_t sequence) const {
    if (sequence >= event_count_ || event_count_ - sequence > EVENT_CAPACITY) return std::nullopt;
    return events_[sequence % EVENT_CAPACITY];
  }

 private:
  /** 걷고 떨어지는 몸 — 플레이어와 적이 같이 쓴다 */
  struct Body {
    engine::Vec3 feet;
    float half_width;
    float height;
    float fall_speed;
    bool grounded;
    /** 이번 틱에 바닥에 닿았으면 그때 내려오던 빠르기 (초당, 양수) */
    float impact{};
  };
  /** advance 가 가로의 두 축을 저마다 다 갔는가 — 막힌 축은 false */
  struct Moved {
    bool x{true};
    bool z{true};
  };

  void begin();
  void load_room();
  float random_unit();
  bool fits(const Body& body, engine::Vec3 feet) const;
  /** 틱 하나만큼 (dx, dz) 를 걷고 떨어진다. 가로는 축마다 따로 옮긴다 — 막힌 축을 알려 준다 */
  Moved advance(Body& body, float dx, float dz) const;
  void walk_player();
  void enter_portal();
  void arrive();
  void lock_room();
  void step_enemies();
  /** 길의 점마다 플레이어의 발(feet)까지 걸어가는 길의 길이를 다시 셈한다 (route_cost_) — 닿지 못하는 점은 무한대 */
  void plan_routes(engine::Vec3 feet);
  /** 플레이어가 가려 있는 적이 지금 걸어갈 점 — 적에게서 곧게 닿는 점 가운데 플레이어까지의 길이 가장 짧은 것. 없으면 가장 가까운 점 */
  engine::Vec3 route_target(const Enemy& enemy) const;
  void step_projectiles();
  void fire();
  /** 박자에 묶인 행동을 지금 내보낸다 (칸과 연속 수는 부르는 쪽이 정해 두었다) */
  void perform(Action action);
  /** 기억해 둔 무기의 행동을, 그 칸의 창이 열렸으면 내보낸다 */
  void release_pending();
  void hurt();
  void reload();
  /** 일어난 일을 적는다 — at 을 주지 않으면 플레이어의 눈 */
  void emit(WorldEvent::Kind kind) { emit(kind, player_.position); }
  void emit(WorldEvent::Kind kind, engine::Vec3 at, EnemyKind enemy = {}) { events_[event_count_++ % EVENT_CAPACITY] = {kind, enemy, tick_, at}; }
  bool in_combat() const { return !enemies_.empty(); }

  const RoomKit* kit_;
  Rng rng_;
  Floor floor_;
  engine::Lbvh stage_;
  // 지금 방의 길의 점들 (방의 좌표)과, 점마다 플레이어까지의 길의 길이 (이번 틱에 셈했으면 route_tick_ 이 지금 틱)
  std::vector<engine::NavNode> nav_;
  std::vector<float> route_cost_;
  uint64_t route_tick_{~0ull};
  // 지금 방의 잠긴 문을 막는 상자들 — 적이 남아 있는 동안만
  std::vector<engine::Aabb> gates_;
  std::vector<bool> visited_;
  std::vector<bool> cleared_;
  uint32_t room_{};
  std::optional<uint64_t> opened_tick_, portal_tick_;
  Direction portal_side_{NORTH};
  // 적이 공격을 시작해도 되는 첫 틱
  uint64_t attack_at_{};

  Player player_;
  float move_forward_{};
  float move_strafe_{};
  // 수평 속도 (초당, y 는 0) — 오르내리는 빠르기는 fall_speed_
  engine::Vec3 velocity_{};
  float fall_speed_{};
  bool grounded_{};
  bool jump_{};
  // 대시가 남은 틱과 그 방향 (수평, 길이 1)
  uint32_t dash_left_{};
  engine::Vec3 dash_direction_{};
  std::optional<uint64_t> dash_tick_, jumped_tick_, landed_tick_;
  float landing_speed_{};
  // 맞아도 되는 첫 틱
  uint64_t vulnerable_at_{};

  Pistol pistol_;
  // 마지막으로 무기의 행동(발사·재장전)이 든 칸과 그 행동, 대시가 든 칸
  std::optional<uint64_t> used_slot_;
  Action used_action_{Action::fire};
  std::optional<uint64_t> dash_slot_;
  /** 다음 칸에 내보낼 무기의 행동 — 하나만 (나중 것이 앞의 것을 대신한다) */
  struct Pending {
    Action action;
    /** 들 칸 — 그 사이에 다른 행동이 이 칸을 쓰면 그 다음 칸으로 밀린다 */
    uint64_t slot;
    /** 누를 때 판정이 틱에 더한 양 (누른 때의 틱 − 그때의 틱) — 창이 열리는 때를 같은 눈금으로 본다 */
    int32_t shift;
  };
  std::optional<Pending> pending_;
  uint32_t streak_{};
  uint32_t score_{};
  uint64_t tick_{};
  Outcome outcome_{Outcome::playing};
  std::optional<uint64_t> shot_tick_, hit_tick_, hurt_tick_, dry_tick_, beat_tick_, off_tick_, miss_tick_;
  int off_side_{};
  int miss_side_{};
  uint32_t misses_{};
  std::array<WorldEvent, EVENT_CAPACITY> events_{};
  uint64_t event_count_{};

  std::vector<Enemy> enemies_;
  std::vector<Projectile> projectiles_;
  // 쏠 때마다 다시 짓는 히트스캔 구조와 그 입력
  engine::Lbvh bvh_;
  std::vector<engine::Aabb> boxes_;
};

}  // namespace game
