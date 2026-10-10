#pragma once

#include <cstdint>
#include <optional>
#include <vector>

#include "engine/hud/element.hpp"
#include "engine/hud/interaction.hpp"
#include "gameplay/domain/lobby.hpp"
#include "gameplay/presentation/menu.hpp"
#include "gameplay/presentation/motion.hpp"
#include "gameplay/simulation/world.hpp"

// 게임 HUD — 엔진의 HUD 엔진(engine/hud) 위에 컴포넌트를 조립한다. 메뉴(메인 메뉴·대기실·일시정지·끝난 화면)도 HUD 다.
// 게임 화면의 모든 요소는 엔진이 그린다 (브라우저의 DOM·TS 로 게임 화면의 어떤 부분도 대신하지 않는다).
//   세계·입력·메뉴·로비 상태 → select_hud_state → HudState → hud_root(컴포넌트) → 요소 트리
// 색·글자 크기·간격·판과 단추의 양식(디자인 체계)은 hud.cpp 머리에 이름 붙은 상수로 모여 있다 — 새 요소도 그것으로 짓는다.
//   포인터·글쇠 → engine::hud::Interaction → 사건 → apply_hud_events(menu.hpp) → 상태 → 다시 조립
namespace game {

/** 미니맵의 한 칸 — 가 본 방, 지금 있는 방, 가 본 방의 문 너머에 있는 안 가 본 방 */
struct MapCell {
  enum class Kind : uint8_t { known, visited, current };

  /** 층의 칸 (시작 방이 0, 0 — 북쪽이 -z) */
  int8_t x;
  int8_t z;
  Kind kind;
  /** 문이 난 쪽 (1 << Direction 의 합) — 안 가 본 방은 0 (아직 모른다) */
  uint8_t doors;
  bool operator==(const MapCell&) const = default;
};

/** 박자에 묶인 누름이 박에서 벗어난 양 (ms, 판정 보정을 던 뒤 — 판정이 본 그대로) — 조립 지점의 판정(input/judge.hpp)이 잰다 */
struct Timing {
  int last_ms{};
  int mean_ms{};
  bool operator==(const Timing&) const = default;
};

/**
 * 성능 표시 (개발용 — F3) — 지난 1 초의 프레임 통계. 조립 지점이 재서 채운다 (시간은 ms).
 * 간격은 화면 프레임 사이의 시간, cpu 는 이 스레드가 프레임 하나에 쓴 시간(그 아래는 어디에 썼는가), gpu 는 GPU 가 프레임 하나를 그린 시간
 */
struct PerfReadout {
  uint32_t frames{};
  float span_ms{};
  float p50{}, p99{}, longest{};
  /** 간격이 120·60·30 Hz 의 한 프레임을 넘긴 프레임 수 */
  uint32_t over_120{}, over_60{}, over_30{};
  /** 잴 수 없는 장치면 없다 */
  std::optional<float> gpu{};
  float gpu_longest{};
  /** gpu 가운데 장면 패스의 몫 (나머지는 화면에 올리기와 HUD) */
  float gpu_scene{};
  float cpu{}, cpu_longest{};
  float tick{}, sound{}, assets{}, prepare{}, scene{}, hud{}, submit{};
  uint32_t draws{}, triangles{};
  /** 화면(캔버스)의 픽셀 크기와 장면을 그리는 크기 (장면을 그리지 않는 화면이면 0) */
  uint32_t surface_width{}, surface_height{};
  uint32_t scene_width{}, scene_height{};
  /** 프레임 예산이 정한 것 — 장면의 해상도 배율, 다중 표본, 화면 갱신 몇 번에 한 프레임을 내는가 — 와 어림한 화면 갱신 간격 */
  float scale{1.0f};
  bool multisample{};
  uint32_t divisor{1};
  float refresh_ms{};
  bool operator==(const PerfReadout&) const = default;
};

/** HUD 가 보는 상태의 전부 — 컴포넌트는 이것만 읽는다. 값이 같으면 화면도 같다 */
struct HudState {
  int32_t health{PLAYER_HEALTH};
  /** 탄창에 남은 탄과 재장전의 단계 (1 이면 탄창을 빼 두었다) */
  uint32_t ammo{Pistol::MAGAZINE};
  uint32_t reload_stage{};
  uint32_t multiplier{1};
  /** 박자에 맞춰 이어 간 행동 수 — 다음 배수까지의 칸(열 번에 한 단계)을 채운다. 게임 중에만 들어 있다 */
  uint32_t streak{};
  uint32_t score{};
  /** 비운 전투방 수와 전투방 수 */
  uint32_t rooms_cleared{};
  uint32_t rooms_total{};
  /** 지금 방에 남은 적 수와 그 방의 처음 적 수 — 전투 중에만 들어 있다 (그 밖에는 둘 다 0: 위 가운데의 막대가 층의 진행을 보인다) */
  uint32_t enemies_left{};
  uint32_t enemies_total{};
  /** 대시의 쿨다운 0..1 — 쓴 틱에 0, 다시 나갈 수 있는 칸의 머리(한 박 뒤)에 1. 쓸 수 있으면 1 */
  float dash_ready{1.0f};
  /** 판이 어떻게 되었는가 — 끝난 화면의 제목이 갈린다 */
  World::Outcome outcome{World::Outcome::playing};
  /** 화면에 보일 때의 박 안에서의 위치 0..1 — 박의 머리에서 0. 틱 사이에서도 이어진다. 게임 중이 아니면 0 (보이지 않는다) */
  float beat{};
  // 잠깐 보이는 것들 — 생긴 뒤로 지난 시간 0..1 (1 에서 사라진다). 게임 중에, 보이는 동안만 들어 있다
  /** 행동이 박에 맞춰 나갔다 — 조준점의 마름모가 밝은 청록으로 번쩍이며 살짝 커진다 (방에 적이 없어 배수가 쌓이지 않을 때도) */
  std::optional<float> on_beat{};
  /** 행동이 박에서 어긋나 나갔다 (나가기는 했다 — 배수만 그대로다) — 조준점의 마름모는 그대로이고 같은 모양의 옅은 잔상이 잠깐 남는다. on_beat·off_beat·miss 는 함께 들어 있지 않다 (나중 것만) */
  std::optional<float> off_beat{};
  /** 그 행동이 박을 어느 쪽으로 벗어났는가 — -1 일렀다 (잔상이 마름모 바깥에), +1 늦었다 (안쪽에) */
  int off_side{};
  /** 박을 크게 벗어나 눌러 행동이 나가지 않았다 (미스) — 조준점이 나쁜 일의 색으로 바뀌고 마름모가 통째로 좌우로 떨다 잦아든다 (모양은 그대로) */
  std::optional<float> miss{};
  /** 타이밍 표시 (옵션) — 마지막으로 판정을 받은 누름(미스도)이 박에서 벗어난 양과 최근 평균 (ms, 음수면 일렀다). 옵션이 켜져 있고 누른 적이 있을 때만 */
  std::optional<Timing> timing{};
  /** 쏜 총알이 적에 맞았다 — 조준점 둘레 네 귀에 작은 마름모가 찍힌다 */
  std::optional<float> hit{};
  /** 맞았다 — 화면 가장자리에 얇은 띠가 든다 */
  std::optional<float> hurt{};
  /** 포털을 넘는 중 — 화면이 포털 빛으로 번졌다 걷힌다. 한가운데(0.5)에서 방이 바뀐다 */
  std::optional<float> transit{};
  /** 미니맵 — 방 번호 차례. 게임 중에만 들어 있다 */
  std::vector<MapCell> map{};
  /** 움직임에 밀리는 양과 대시의 가장자리 빛, 값이 바뀐 요소의 강조, 체력의 잔상 — 틱마다 정해진다 (presentation/motion.hpp). 게임 중에만 들어 있다 */
  HudMotion motion{};
  /** 지금 화면과 옵션, 메뉴에 적은 글 */
  Menu menu;
  /** 로비 서버에서 받은 것 — 방 찾기·방 만들기·대기실이 읽는다 */
  Lobby lobby;
  /** 포인터·포커스가 어디 있는지 — 위젯과 커서의 모습 */
  engine::hud::Ui ui;
  /** 메뉴 화면(메인 메뉴·대기실)의 배경 그림 — id 가 0 이면 그림 없이 기본 바탕 */
  engine::hud::Picture backdrop{};
  /** 성능 표시 — 켜져 있을 때만 들어 있다 (어느 화면에서나 맨 위에 그린다) */
  std::optional<PerfReadout> perf{};
  bool operator==(const HudState&) const = default;
};

/**
 * 박자 표식을 앞세우는 양 (틱) — 표식은 이만큼 앞선 때의 자리에 그린다. 그린 프레임이 눈에 닿기까지(다음 화면 갱신 + 합성, 두 프레임쯤) 박자가 그만큼 가 있어서다:
 * 표식(꺾쇠)이 조준점의 마름모에 겹쳐 보이는 때가 그 칸의 소리가 들리는 때가 되게 한다. frame_ms 는 잰 프레임 간격 — 60 Hz(16.7 ms)면 33 ms(두 틱), 120 Hz(8.3 ms)면 17 ms(한 틱).
 * judge_offset_ms 는 옵션의 판정 보정이다: 소리가 틱의 시계보다 그만큼 늦게 들린다는 값(장치가 지연을 작게 알릴 때 — 무선 이어폰)이라, 표식도 그만큼 늦춰야 들리는 소리와 맞는다.
 * 판정과 표식을 한 값으로 같이 옮긴다 (화면 쪽 오차는 프레임 간격으로 이미 덜었고, 남는 것은 몇 ms 다 — 따로 맞출 옵션을 두지 않는다)
 */
inline constexpr float DISPLAY_LEAD_FRAMES = 2.0f, DISPLAY_LEAD_MIN_MS = 8.0f, DISPLAY_LEAD_MAX_MS = 50.0f;
constexpr float display_lead(float frame_ms, float judge_offset_ms) {
  const float screen = DISPLAY_LEAD_FRAMES * frame_ms;
  return ((screen < DISPLAY_LEAD_MIN_MS ? DISPLAY_LEAD_MIN_MS : screen > DISPLAY_LEAD_MAX_MS ? DISPLAY_LEAD_MAX_MS : screen) - judge_offset_ms) * static_cast<float>(TICK_RATE) / 1000.0f;
}

/**
 * backdrop 은 그리는 쪽에 올려 둔 메뉴 배경 그림 (없으면 빈 값), motion 은 이번 틱의 HUD 움직임 (Motion::hud — 없으면 가만히 있는 HUD),
 * tick_phase 는 지금이 세계의 틱에서 얼마나 지났는가 0…1 (박자 표식을 틱 사이에서 잇는다), timing 은 판정이 잰 치우침 (옵션이 켜져 있을 때만 보인다),
 * lead 는 박자 표식을 앞세우는 양 (틱 — display_lead. 기본값은 60 Hz 화면의 두 틱)
 */
HudState select_hud_state(const World& world, const Menu& menu, const Lobby& lobby, const engine::hud::Ui& ui, const engine::hud::Picture& backdrop = {},
                          const HudMotion& motion = {}, float tick_phase = 0.0f, std::optional<Timing> timing = std::nullopt, float lead = 2.0f);

/** 뿌리 컴포넌트 — engine::hud::View<HudState> 에 넘긴다 */
engine::hud::Element hud_root(const HudState& state);

/** 화면 크기에 맞는 HUD 단위의 픽셀 크기 */
float hud_unit(uint32_t surface_width, uint32_t surface_height);

}  // namespace game
