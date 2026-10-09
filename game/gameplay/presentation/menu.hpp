#pragma once

#include <cstdint>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include "engine/hud/element.hpp"
#include "engine/hud/interaction.hpp"
#include "gameplay/domain/lobby.hpp"
#include "gameplay/input/controls.hpp"

// 메뉴 — 지금 화면(메인 메뉴·게임·일시정지·판이 끝난 화면)과 옵션 값, 메뉴에 적은 글. 화면도 GPU 도 모른다:
// 위젯의 사건과 포인터 잡힘을 받아 상태를 고치고, 밖에서 해 줄 일(HudOutcome)을 돌려준다. 그리는 것은 hud.cpp 의 컴포넌트다.
//   메인 메뉴 ─(시작 → 포인터가 잡힘)→ 게임 ─(포인터가 풀림: ESC)→ 일시정지 ─(계속하기 → 잡힘)→ 게임
//                                                                    └─(메인 메뉴로)→ 메인 메뉴
//   게임 ─(죽음·층 완료: apply_game_over)→ 끝난 화면 ─(다시 하기 → 잡힘)→ 새 판 / ─(메인 메뉴로)→ 메인 메뉴
// 대기실은 화면 값이 아니다 — 메인 메뉴에서 로비가 방에 들어가 있으면(Lobby::room) 대기실이 보인다.
// 방이 시작되면(Room::playing) 대기실의 '입장' 단추가 게임으로 들어간다. 서버는 아직 판을 돌리지 않아 그 판은 혼자 하기와 같은 로컬 판이다.
namespace game {

/** HUD 위젯의 식별자 — 사건이 어느 위젯의 것인지 가린다 */
enum HudId : engine::hud::Id {
  /** 메인 메뉴의 항목 목록 (줄은 MenuItem 차례) */
  HUD_MENU = 1,
  HUD_SOLO_START,
  HUD_NICKNAME,
  HUD_ROOMS,
  /** 끊긴 로비 서버에 다시 붙는다 (방 찾기·방 만들기) */
  HUD_RECONNECT,
  HUD_JOIN,
  HUD_ROOM_NAME,
  HUD_MAX_PLAYERS,
  HUD_CREATE,
  HUD_SENSITIVITY,
  HUD_FOV,
  HUD_INVERT_Y,
  HUD_SHAKE,
  HUD_MUSIC_VOLUME,
  HUD_EFFECTS_VOLUME,
  HUD_JUDGE_OFFSET,
  HUD_TIMING,
  /** 일시정지 */
  HUD_RESUME,
  HUD_PAUSE_OPTIONS,
  HUD_QUIT,
  /** 대기실 */
  HUD_READY,
  HUD_ROOM_START,
  /** 시작된 방의 판으로 들어간다 */
  HUD_ROOM_ENTER,
  HUD_LEAVE,
  /** 판이 끝난 화면 (죽음·층 완료) — 새 판을 시작한다 */
  HUD_RETRY,
  /** 받지 못한 에셋 팩을 다시 받는다 (혼자 하기·대기실) */
  HUD_ASSETS_RETRY,
};

/** over 는 판이 끝난 화면 — 죽었거나 층을 다 비웠다 (어느 쪽인지는 세계가 안다) */
enum class Screen { main, playing, paused, over };
/** 메인 메뉴의 항목 — 고른 항목의 패널이 오른쪽에 보인다 */
enum class MenuItem { solo, find, create, options };

/** 옵션 — 저장된다 (encode_options — 호스트가 그 글을 그대로 간직했다 띄울 때 돌려준다) */
struct Options {
  /** 마우스 감도의 배율 (0.1 칸) */
  float sensitivity{1.0f};
  /** 위아래 시야각 (도, 5 칸) */
  float fov{75.0f};
  bool invert_y{};
  /** 화면 흔들림 — 걸음·착지·대시의 시점 연출과 HUD 의 밀림. 끄면 시점이 흔들리지 않는다 (멀미가 나는 사람을 위해) */
  bool shake{true};
  /** 음악과 효과음의 음량 0…1 (0.1 칸) */
  float music{0.7f};
  float effects{0.8f};
  /**
   * 판정 보정 (ms, 10 칸) — 박자에 묶인 입력을 누른 때에서 이만큼 이르게 본다. 양수는 늘 늦게 눌리는(소리가 늦게 들리는) 쪽을 덜어 낸다.
   * 판정이 쓰는 치우침은 이 값 하나이고 처음 값은 0 이다 — 스스로 움직이지 않는다 (input/judge.hpp). 타이밍 표시가 보여 주는 벗어난 양을 보고 사용자가 슬라이더로만 바꾼다
   */
  float judge_offset{};
  /** 타이밍 표시 — 조준점 아래에 마지막 누름이 박에서 벗어난 양과 최근 평균(ms)을 보인다. 처음부터 켜져 있다: 판정 보정을 얼마로 둘지 알려 주는 것이 이것뿐이다 */
  bool timing{true};
  bool operator==(const Options&) const = default;
};
inline constexpr float JUDGE_OFFSET_MAX = 200.0f, JUDGE_OFFSET_STEP = 10.0f;
inline constexpr float SENSITIVITY_MIN = 0.2f, SENSITIVITY_MAX = 3.0f, SENSITIVITY_STEP = 0.1f;
inline constexpr float FOV_MIN = 60.0f, FOV_MAX = 110.0f, FOV_STEP = 5.0f;
inline constexpr float VOLUME_STEP = 0.1f;

/**
 * 장면의 에셋(방의 텍스처와 소품 — 실행 중에 받는 에셋 팩)이 준비됐는가. 메뉴는 팩을 기다리지 않고 먼저 뜨고, 판은 ready 여야 시작된다.
 * 조립 지점이 받기 시작할 때 loading 으로 두고 결과에 따라 바꾼다 (받는 것이 없는 곳 — 검증 프로브 — 에서는 처음 값 ready 그대로다)
 */
enum class Assets { loading, ready, failed };

struct Menu {
  Screen screen{Screen::main};
  Assets assets{Assets::ready};
  MenuItem item{MenuItem::solo};
  /** 일시정지 메뉴에서 옵션 패널을 열었다 */
  bool pause_options{};
  Options options;
  /** 방 찾기·방 만들기에 적은 글 */
  std::string nickname;
  std::string room_name;
  int max_players{4};
  /** 방 찾기 목록에서 고른 방의 번호 */
  std::optional<uint32_t> room;
  bool operator==(const Menu&) const = default;
};

/**
 * 로비 서버에 보낼 요청 — 프로토콜의 메시지와 하나씩 맞는다. reconnect 만 예외: 끊긴 서버에 다시 붙는다
 * (방 목록은 연결돼 있는 동안 서버가 바뀔 때마다 밀어 주므로 다시 달라는 요청이 없다)
 */
struct LobbyRequest {
  /** create 는 Menu 의 room_name·max_players·nickname, join 은 room 과 Menu 의 nickname 을 쓴다 */
  enum class Kind { reconnect, create, join, leave, ready, start };

  Kind kind;
  uint32_t room{};
  bool ready{};
  bool operator==(const LobbyRequest&) const = default;
};

/** 상태를 고친 뒤 밖에서 해 줄 일 */
struct HudOutcome {
  /** 호스트에 해 달라는 일 (input/controls.hpp 의 HOST_*) — 단추를 누른 답에는 늘 HOST_RESUME_AUDIO 가 실린다 */
  uint32_t host{};
  /** 포커스를 옮길 위젯 — 0 이면 그대로 */
  engine::hud::Id focus{};
  /** 새 판을 시작한다 — 세계를 처음으로 돌린다 */
  bool new_game{};
  /** 받지 못한 에셋 팩을 다시 받는다 */
  bool reload_assets{};
  std::vector<LobbyRequest> lobby;
};

/** HUD 위젯이 낸 사건을 처리한다 */
HudOutcome apply_hud_events(std::span<const engine::hud::Event> events, Menu& menu, const Lobby& lobby);
/** 호스트가 포인터를 잡았거나 놓았다 — 잡히면 게임이 시작되고(메인 메뉴·끝난 화면에서면 새 판), 게임 중에 풀리면 일시정지다 */
HudOutcome apply_pointer_capture(Menu& menu, bool captured);
/** 판이 끝났다 (죽음·층 완료) — 끝난 화면으로 간다 */
HudOutcome apply_game_over(Menu& menu);
/** ESC — 한 단계 뒤로: 패널에서 메뉴 항목으로, 일시정지의 옵션에서 일시정지 메뉴로 */
HudOutcome apply_menu_back(Menu& menu, const Lobby& lobby);

/**
 * 로비 서버와 이어져 있어야 하는가 — 메인 메뉴에서 방 찾기·방 만들기를 골라 둔 동안과 방에 들어가 있는 동안.
 * 거짓에서 참이 될 때 연결하고 참에서 거짓이 될 때 끊는다 (끊긴 뒤 다시 붙는 것은 reconnect 요청으로만 — 저절로 다시 시도하지 않는다)
 */
bool wants_lobby(const Menu& menu, const Lobby& lobby);
/** 서버가 보낸 것으로 로비가 before 에서 after 로 바뀌었다 — 포커스를 옮길 위젯 (대기실에 들어감·나옴, 방이 시작됨, 방장이 됨). 0 이면 그대로 */
engine::hud::Id lobby_focus(const Menu& menu, const Lobby& before, const Lobby& after);

/**
 * 포커스가 풀렸을 때(빈 곳을 눌렀다) 돌아갈 위젯 — 0 이면 풀린 채로 둔다. 판이 끝난 화면은 단추뿐이라 포커스가 풀릴 까닭이 없고,
 * 풀리면 Enter 가 닿지 않는다: 첫 단추로 돌아온다. 다른 화면은 그대로 둔다 (메인 메뉴는 빈 곳을 눌러 입력 칸에서 손을 뗀다)
 */
constexpr engine::hud::Id resting_focus(const Menu& menu) { return menu.screen == Screen::over ? HUD_RETRY : 0; }

/** 시뮬레이션이 나아가는가 — 게임 중에만. 메뉴(메인 메뉴·대기실) 뒤에서는 세계가 돌지 않고, 일시정지와 끝난 화면에서는 멈춘다 */
constexpr bool simulating(const Menu& menu) { return menu.screen == Screen::playing; }
/** 장면(방·적·손에 든 총)을 그리는가 — 게임 중과 일시정지·끝난 화면(멈춘 장면 위에 메뉴). 메인 메뉴·대기실은 배경 그림 한 장이다 */
constexpr bool shows_scene(const Menu& menu) { return menu.screen != Screen::main; }

/**
 * 옵션을 짧은 글로 적는다 (저장) — 호스트는 뜻을 모르는 채 그대로 간직했다 띄울 때 돌려준다.
 *   "zk1 <감도×10> <시야각> <상하 반전> <화면 흔들림> <음악×10> <효과음×10> <판정 보정 ms> <타이밍 표시>" — 정수 여덟을 빈칸 하나씩으로 띄운다
 */
std::string encode_options(const Options& options);
/**
 * 그 글을 읽어 options 에 넣는다. 밖에서 온 글이라 믿지 않는다: 길이·버전·칸 수가 다르거나, 정수가 아니거나, 값이 옵션의 범위 밖이면
 * 아무것도 고치지 않고 false (기본값으로 뜬다). 범위 안의 값은 옵션의 칸에 맞춘다
 */
bool decode_options(std::string_view text, Options& options);
inline constexpr std::size_t OPTIONS_TEXT_MAX = 64;

/** 단추를 누를 수 없는 까닭 — 누를 수 있으면 빈 글. 단추의 disabled 와 그 밑의 안내문이 같이 쓴다 */
std::string_view join_blocker(const Menu& menu, const Lobby& lobby);
std::string_view create_blocker(const Menu& menu, const Lobby& lobby);
/** 대기실의 시작 단추 (방장) */
std::string_view start_blocker(const Lobby& lobby);
/** 판으로 들어가는 단추 (혼자 하기의 시작, 대기실의 입장) — 장면의 에셋이 준비돼야 한다 */
std::string_view play_blocker(const Menu& menu);

}  // namespace game
