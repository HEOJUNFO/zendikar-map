#include <emscripten/emscripten.h>

#include <algorithm>
#include <cmath>
#include <memory>
#include <new>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include "app/client/client.hpp"
#include "engine/asset/fetch.hpp"
#include "engine/audio/bank.hpp"
#include "engine/audio/clock.hpp"
#include "engine/audio/port.hpp"
#include "engine/audio/sequencer.hpp"
#include "engine/foundation/frame_governor.hpp"
#include "engine/foundation/frame_stats.hpp"
#include "engine/foundation/log.hpp"
#include "engine/gpu/device.hpp"
#include "engine/gpu/webgpu/webgpu_device.hpp"
#include "engine/hud/bitmap.hpp"
#include "engine/hud/font.hpp"
#include "engine/hud/interaction.hpp"
#include "engine/hud/view.hpp"
#include "engine/net/socket.hpp"
#include "engine/platform/frame_loop.hpp"
#include "engine/render/overlay.hpp"
#include "engine/render/present_batch.hpp"
#include "engine/shader/shader_library.hpp"
#include "gameplay/content/assets.hpp"
#include "gameplay/content/room_meshes.hpp"
#include "gameplay/domain/lobby.hpp"
#include "gameplay/input/controls.hpp"
#include "gameplay/input/judge.hpp"
#include "gameplay/net/lobby_protocol.hpp"
#include "gameplay/presentation/camera.hpp"
#include "gameplay/presentation/hud.hpp"
#include "gameplay/presentation/menu.hpp"
#include "gameplay/presentation/motion.hpp"
#include "gameplay/presentation/portal_view.hpp"
#include "gameplay/presentation/scene_view.hpp"
#include "gameplay/presentation/scenery.hpp"
#include "gameplay/presentation/sound.hpp"
#include "gameplay/presentation/stage_view.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

// 첫 층의 시드 — 판을 시작할 때마다 그때의 시각을 섞어 새로 뽑는다 (next_seed)
constexpr uint32_t WORLD_SEED = 20261009;
// 탭이 멈췄다 돌아왔을 때 한꺼번에 따라잡는 시간의 상한 (초)
constexpr double MAX_CATCH_UP = 0.25;
constexpr uint32_t PRIMARY_BUTTON = 0;
// 소리 — 장치가 가져간 데서 이만큼 앞까지 미리 써 둔다 (ms). 통지(8 ms 쯤마다)가 프레임 하나에 밀려 늦어도 끊기지 않을 만큼
constexpr uint32_t AUDIO_LEAD_MS = 50;
// 프레임 간격으로 치는 범위 (ms — 240 Hz … 25 Hz)와 잰 값을 따라가는 빠르기 (프레임마다 차이의 이만큼)
constexpr double FRAME_GAP_MIN_MS = 3.0, FRAME_GAP_MAX_MS = 40.0;
// 그린 프레임 사이가 이보다 길면(가려졌다 돌아옴) 프레임 예산이 늦은 프레임으로 치지 않는다 (ms)
constexpr double FRAME_GAP_BREAK_MS = 1000.0;
constexpr float FRAME_GAP_FOLLOW = 0.05f;
// 효과음은 미리 써 둔 구간의 끝이 아니라 장치가 가져간 데서 이만큼 뒤에 넣는다 (ms) — 그 자리부터 다시 섞어 덧쓴다 (sound_follow).
// 덧쓴 것이 닿기 전에 장치가 가져가는 양(한 번에 10 ms 쯤)과 전달 시간보다 길어야 효과음의 머리가 잘리지 않는다
constexpr uint32_t AUDIO_REWRITE_MS = 15;
// 출력 지연의 값이 바뀌면 틱이 뛰지 않게 이 빠르기로 따라간다 (지연 ms / 초 — 한 틱에 1 ms)
constexpr double AUDIO_LATENCY_SLEW = 60.0;
// 통지가 이보다 오래 끊기면 장치가 멈춘 것으로 보고 화면의 시간으로 틱을 돌린다 (ms)
constexpr double AUDIO_STALE_MS = 250.0;
// 한 번에 섞는 길이의 상한 (표본) — 오래 밀린 뒤에도 한꺼번에 몰아 섞지 않는다
constexpr uint64_t AUDIO_MAX_BLOCK = 8192;
// 호스트가 알려 준 값의 범위 — 벗어나면 소리 출력이 없는 것으로 친다
constexpr double AUDIO_MIN_RATE = 8000.0, AUDIO_MAX_RATE = 192000.0, AUDIO_MAX_LATENCY = 1.0;
// 휠 한 줄·한 쪽을 픽셀로 (WheelEvent.deltaMode 1·2) — 브라우저가 픽셀로 줄 때의 한 칸(100)에 맞춘다
constexpr double WHEEL_LINE = 100.0 / 3.0;
constexpr double WHEEL_PAGE = 800.0;
// 로비 서버 — 이 페이지를 준 호스트의 7777 포트 (game/server/server.mjs 의 기본값).
// ceiling: 암호화하지 않은 ws:// 로만 붙는다. https 로 내보낸 페이지에서는 브라우저가 ws:// 를 막으므로(mixed content),
// 게임을 https 로 내보낼 때 서버 앞에 TLS 를 두고 여기를 wss:// 로 바꾼다.
constexpr const char* LOBBY_SCHEME = "ws://";
constexpr int LOBBY_PORT = 7777;
// 장면의 에셋 팩 (tools/packc.mjs 가 public/wasm 에 쓴다) — 게임 WASM 과 같은 자리에서 받는다.
// ceiling: 사이트의 뿌리(/)에 내보낸 것으로 본다. 다른 경로 밑에 내보내게 되면 호스트가 그 경로를 넘기게 한다 (host/engine-client.ts 의 WASM_URL 처럼)
constexpr const char* ASSET_PACK_URL = "/wasm/game-assets.zkpack";
// 팩의 크기 상한 — 이보다 큰 응답은 메모리에 올리지 않는다
constexpr std::size_t ASSET_PACK_MAX_BYTES = 256u << 20;
// 연결하지 못했을 때 브라우저가 주는 닫기 코드 — 소켓을 열지도 못한 것을 같은 까닭으로 알린다
constexpr uint16_t CLOSE_ABNORMAL = 1006;
constexpr engine::gpu::ClearColor SKY{game::SKY_COLOR.red, game::SKY_COLOR.green, game::SKY_COLOR.blue};
// 성능 표시를 켜고 끄는 글쇠 (KeyboardEvent.code) — 화면 어디서나 듣는다
constexpr std::string_view PERF_KEY = "F3";
// 틀 둘러보기를 여는 글쇠 — 게임 중에 누르면 정해 둔 층(tour_floor)으로 바꾼다. 화면 검증용이다 (tools/perf.mjs 의 --tour 가 누른다): 판의 시드가 그때그때 달라 틀을 골라 볼 수 없어서 둔다
constexpr std::string_view TOUR_KEY = "F6";
// 프레임 통계의 구간 (engine::FrameStats 의 번호) — 이 스레드가 프레임 하나에 쓰는 CPU 시간을 어디에 썼는가.
// tick 세계의 틱과 움직임 · sound 소리 블록 섞기(장치의 통지와 효과음 덧쓰기) · assets 에셋 풀기와 구운 빛 올리기
// scene 장면의 그리기 호출 짓기 · hud HUD 조립과 그리기 목록 · submit 명령을 GPU 에 넘기기 · frame 프레임 콜백 전체
enum Section : std::size_t { SECTION_TICK, SECTION_SOUND, SECTION_ASSETS, SECTION_SCENE, SECTION_HUD, SECTION_SUBMIT, SECTION_FRAME };

struct Client {
  Client(std::unique_ptr<engine::gpu::Device> gpu, game::RoomMeshes room_meshes, engine::hud::Font hud_font)
      : device(std::move(gpu)), shaders(*device), font(std::move(hud_font)), rooms(std::move(room_meshes)) {}

  // 장치가 맨 나중에 없어진다 (선언 차례의 거꾸로)
  std::unique_ptr<engine::gpu::Device> device;
  engine::ShaderLibrary shaders;
  // HUD 를 배치하고(hud) 그리는(overlay) 글꼴 — 둘보다 먼저 선언해 더 오래 산다
  engine::hud::Font font;
  engine::Overlay overlay;
  // 장면 타깃을 화면에 올린다
  engine::PresentBatch present;
  // 메뉴 화면의 배경 그림 (overlay 에 올린 것) — 그림 없이 빌드했으면 빈 값이고, 메뉴는 기본 바탕으로 나온다
  engine::hud::Picture menu_backdrop;
  // 방 조각의 메시와 그 충돌 상자들 — 세계가 여기에 부딪힌다 (세계보다 먼저 선언해 더 오래 산다)
  game::RoomMeshes rooms;
  game::RoomKit kit{rooms.kit()};
  uint32_t seed{WORLD_SEED};
  game::World world{seed, kit};
  // 움직임의 연출(시점 흔들림, 총의 흔들림, HUD 밀림) — 세계가 한 틱 나아갈 때마다 따라 나아간다
  game::Motion motion;
  // 지난 틱에서 이번 틱으로 가는 사이의 위치 0..1 — advance 가 구한 시간의 소수 부분. 눈을 틱 사이에서 잇는 데 쓴다
  float tick_alpha{1.0f};
  // 지금이 세계의 틱에서 얼마나 지났는가 0..1 — 박자에 묶인 입력을 누른 때로 옮기고(judge), 박자 표식을 틱 사이에서 잇는 데 쓴다
  double tick_phase{};
  game::Controls controls;
  // 박자에 묶인 입력의 시각을 틱으로 옮긴 기록 (타이밍 표시) — 판정 자체는 들어간 값만으로 정해진다 (Judge::press)
  game::Judge judge;
  // 호스트가 포인터를 잡고 있다 — 게임 중이면 조준이고, 판이 끝난 화면·메뉴에서는 움직인 양으로 HUD 의 포인터를 옮긴다
  bool pointer_locked{};
  double pointer_x{};
  double pointer_y{};
  // 받은 에셋 팩에서 푼 방의 텍스처와 소품 — 다 풀리기 전에는 판을 시작할 수 없다 (menu.assets)
  game::Scenery scenery;
  game::SceneView scene;
  game::StageView stage;
  game::PortalView portals;
  engine::hud::View<game::HudState> hud{game::hud_root};
  // HUD 위젯에 닿는 포인터와 포커스
  engine::hud::Interaction ui;
  // 지금 화면(메인 메뉴·게임·일시정지)과 옵션
  game::Menu menu;
  // 호스트가 간직하고 있는 옵션의 글 — 지금의 글(game::encode_options)이 이것과 달라지면 입력의 답으로 저장해 달라고 한다 (HOST_SAVE_OPTIONS)
  std::string saved_options{game::encode_options(menu.options)};
  // 로비 서버와의 연결과 거기서 받은 것 — 소켓의 사건(lobby_opened·lobby_frame·lobby_closed)이 채운다
  engine::net::Socket socket;
  game::Lobby lobby;
  // 지난번에 본 game::wants_lobby — 바뀔 때만 연결하거나 끊는다 (sync_lobby_link)
  bool lobby_wanted{};
  double last_ms{-1.0};
  // 화면 프레임의 간격 (ms) — 잰 값을 고르게 따라간다. 박자 표식을 앞세우는 양이 여기서 나온다 (game::display_lead)
  double frame_ms{-1.0};
  float frame_interval{1000.0f / 60.0f};
  double accumulator{};
  // 이 스레드의 시계가 0 인 때 — 호스트가 입력에 찍어 보낸 시각(1970 년부터의 ms)을 이 스레드의 시계로 옮긴다
  double time_origin{engine::time_origin_ms()};

  // 소리의 재료 (묻힌 샘플 뱅크와 곡) — 풀지 못했으면 소리 없이 돈다. sound 가 이 둘을 가리킨다
  engine::audio::Bank bank;
  std::optional<engine::audio::Song> song;
  // 믹서와 시퀀서 — 출력의 표본율을 알아야 선다 (호스트가 audio_state 로 알려 준 뒤)
  std::optional<game::Sound> sound;
  // 출력 통로와, 장치가 가져간 양으로 가는 시계
  engine::audio::Port port;
  engine::audio::Clock clock;
  uint32_t audio_rate{};
  // 장치가 돌고 있다 (브라우저는 사용자가 무언가 누른 뒤에야 돌려 준다)
  bool audio_running{};
  // 써 넣은 표본이 들릴 때까지의 지연 (표본) — 호스트가 알려 준 값(goal)을 조금씩 따라간다
  uint64_t audio_latency{};
  uint64_t audio_latency_goal{};
  // 줄기에서 다음에 써 넣을 표본
  uint64_t audio_written{};
  uint64_t audio_underruns{};
  std::vector<float> audio_block;
  // 틱을 소리에 묶은 기준점 — 세계의 틱 anchor_tick 이 줄기의 표본 anchor_frame 에서 들린다. 게임 중에 장치가 돌 때만 잡혀 있다
  bool anchored{};
  uint64_t anchor_frame{};
  uint64_t anchor_tick{};

  // 프레임 예산 — 장면을 얼마로 그리고(배율, 다중 표본) 화면 갱신 몇 번에 한 프레임을 낼지를 프레임이 제때 나오는지 보고 정한다.
  // 화면 갱신 간격은 프레임 콜백의 간격에서 어림한다 (호스트에 묻지 않는다)
  engine::FrameGovernor governor;
  engine::RefreshEstimate refresh;
  // 마지막으로 그린 프레임의 시각과, 가장 최근에 잰 GPU 시간 (장면을 그린 프레임의 것, ms — 잴 수 없으면 0)
  double drawn_ms{-1.0};
  float gpu_ms{};
  // 장면 타깃에 남아 있는 그림이 지금 보일 그대로다 (멈춘 장면 — 일시정지·끝난 화면) — 그때의 눈. 다시 그리지 않고 화면에 올리기만 한다
  std::optional<engine::Mat4> still_view;

  // 성능 — 프레임 간격과 구간별 시간을 늘 모은다 (모으는 값은 싸다). 표시(F3)가 켜져 있으면 1 초마다 화면의 숫자를 갈고 로그 한 줄을 낸다
  engine::FrameStats stats;
  bool perf_shown{};
  std::optional<game::PerfReadout> perf;
};

/** 호스트가 알려 준 소리 출력의 상태 — 클라이언트가 서기 전에 온 것은 서자마자 적용한다 */
struct AudioState {
  bool running{};
  uint32_t rate{};
  double latency{};
};

enum class Boot { idle, requesting, running };

Client* client = nullptr;
Boot boot = Boot::idle;
// 장치를 기다리는 동안 내려 달라는 요청이 왔다 — 장치가 오면 버린다
bool shutdown_requested = false;
// 클라이언트가 서기 전에 온 화면 크기 — 서자마자 적용한다
uint32_t pending_width = 0;
uint32_t pending_height = 0;
AudioState pending_audio;
// 클라이언트가 서기 전에 온 저장된 옵션의 글 — 서자마자 읽는다 (없으면 빈 글)
std::string pending_options;

/**
 * 지금 상태의 HUD — 상태가 바뀌었을 때만 다시 조립·배치된다. 프레임은 이것을 그리고,
 * 입력은 그 전에 이것을 불러 방금의 변화까지 반영된 자리(hud.regions)에 닿는다
 */
const engine::hud::DrawList& compose_hud(Client& c) {
  const engine::hud::Viewport viewport{static_cast<float>(c.device->width()), static_cast<float>(c.device->height()),
                                       game::hud_unit(c.device->width(), c.device->height())};
  std::optional<game::Timing> timing;
  if (const auto last = c.judge.last_ms()) timing = game::Timing{static_cast<int>(std::lround(*last)), static_cast<int>(std::lround(*c.judge.mean_ms()))};
  game::HudState state = game::select_hud_state(c.world, c.menu, c.lobby, c.ui.ui(), c.menu_backdrop, c.motion.hud(c.menu.options.shake), static_cast<float>(c.tick_phase), timing,
                                                game::display_lead(c.frame_interval, c.menu.options.judge_offset));
  state.perf = c.perf;
  return c.hud.update(state, viewport, c.font);
}

/** 한 구간에 든 시간을 재서 통계에 더한다 — 만든 데서 없어질 때까지 */
struct Timed {
  Timed(Client& c, Section section) : client(c), section(section), start(engine::audio::now_ms()) {}
  ~Timed() { client.stats.section(section, engine::audio::now_ms() - start); }
  Timed(const Timed&) = delete;
  Timed& operator=(const Timed&) = delete;
  Client& client;
  Section section;
  double start;
};

/** 창 하나(1 초)의 통계가 찼다 — 표시가 켜져 있으면 화면의 숫자를 갈고, 측정 스크립트(tools/perf.mjs)가 읽는 로그 한 줄을 낸다 */
void report_perf(Client& c, const engine::FrameReport& report) {
  if (!c.perf_shown) return;
  const engine::gpu::FrameCounters drawn = c.device->counters();
  const auto mean = [&](Section section) { return report.section_mean[section]; };
  c.perf = game::PerfReadout{.frames = report.frames,
                             .span_ms = report.span,
                             .p50 = report.p50,
                             .p99 = report.p99,
                             .longest = report.longest,
                             .over_120 = report.over_120,
                             .over_60 = report.over_60,
                             .over_30 = report.over_30,
                             .gpu = report.gpu_samples ? std::optional{report.gpu_mean} : std::nullopt,
                             .gpu_longest = report.gpu_longest,
                             .gpu_scene = report.gpu_scene_mean,
                             .cpu = mean(SECTION_FRAME),
                             .cpu_longest = report.section_longest[SECTION_FRAME],
                             .tick = mean(SECTION_TICK),
                             .sound = mean(SECTION_SOUND),
                             .assets = mean(SECTION_ASSETS),
                             .scene = mean(SECTION_SCENE),
                             .hud = mean(SECTION_HUD),
                             .submit = mean(SECTION_SUBMIT),
                             .draws = drawn.draws,
                             .triangles = drawn.triangles,
                             .surface_width = c.device->width(),
                             .surface_height = c.device->height(),
                             .scene_width = game::shows_scene(c.menu) ? c.device->scene_target().width : 0,
                             .scene_height = game::shows_scene(c.menu) ? c.device->scene_target().height : 0,
                             .scale = c.governor.quality().scale,
                             .multisample = c.governor.quality().multisample,
                             .divisor = c.governor.quality().divisor,
                             .refresh_ms = c.refresh.interval()};
  const game::PerfReadout& p = *c.perf;
  engine::log_info(
      "[perf] frames=%u span=%.0f p50=%.2f p95=%.2f p99=%.2f max=%.2f over120=%u over60=%u over30=%u gpu=%.2f gpumax=%.2f gpuscene=%.2f gpun=%u cpu=%.2f cpumax=%.2f tick=%.2f sound=%.2f "
      "soundmax=%.2f assets=%.2f assetsmax=%.2f scene=%.2f hud=%.2f submit=%.2f draws=%u tris=%u surface=%ux%u render=%ux%u scale=%.3f msaa=%d div=%u refresh=%.2f screen=%d room=%u "
      "enemies=%zu",
      p.frames, p.span_ms, p.p50, report.p95, p.p99, p.longest, p.over_120, p.over_60, p.over_30, report.gpu_mean, report.gpu_longest, report.gpu_scene_mean, report.gpu_samples, p.cpu, p.cpu_longest,
      p.tick, p.sound, report.section_longest[SECTION_SOUND], p.assets, report.section_longest[SECTION_ASSETS], p.scene, p.hud, p.submit, p.draws, p.triangles, p.surface_width,
      p.surface_height, p.scene_width, p.scene_height, p.scale, p.multisample ? 1 : 0, p.divisor, p.refresh_ms, static_cast<int>(c.menu.screen), c.world.room(), c.world.enemies().size());
}

void connect_lobby(Client& c);

/** 메뉴나 로비가 바뀐 뒤 — 로비 서버와 이어져 있어야 하는지가 바뀌었으면 연결하거나 끊는다 */
void sync_lobby_link(Client& c) {
  const bool wanted = game::wants_lobby(c.menu, c.lobby);
  if (wanted == c.lobby_wanted) return;
  c.lobby_wanted = wanted;
  if (wanted) return connect_lobby(c);
  c.socket.close();
  c.lobby = {};
}

/** 소켓의 사건이 로비를 before 에서 지금으로 바꿨다 — 바뀐 화면에 맞게 포커스와 연결을 맞춘다 */
void lobby_changed(Client& c, const game::Lobby& before) {
  if (const engine::hud::Id focus = game::lobby_focus(c.menu, before, c.lobby)) c.ui.focus(focus);
  sync_lobby_link(c);
}

void lobby_opened(void* user) {
  Client& c = *static_cast<Client*>(user);
  c.socket.send(game::net::encode_hello());
}

void lobby_frame(std::span<const std::byte> frame, void* user) {
  Client& c = *static_cast<Client*>(user);
  const game::Lobby before = c.lobby;
  if (const auto message = game::net::decode(frame)) {
    game::net::apply(c.lobby, *message);
  } else {
    // 문서와 어긋난 프레임 — 그 뒤에 오는 것도 믿을 수 없다
    engine::log_error("[app] 로비 서버가 보낸 프레임을 풀지 못해 연결을 끊는다 (%zu 바이트)", frame.size());
    c.socket.close();
    game::net::broken(c.lobby);
  }
  lobby_changed(c, before);
}

void lobby_closed(uint16_t code, void* user) {
  Client& c = *static_cast<Client*>(user);
  const game::Lobby before = c.lobby;
  game::net::closed(c.lobby, code);
  lobby_changed(c, before);
}

void connect_lobby(Client& c) {
  game::net::connecting(c.lobby);
  const std::string host = engine::net::page_host();
  const std::string url = LOBBY_SCHEME + host + ":" + std::to_string(LOBBY_PORT);
  if (host.empty() || !c.socket.open(url.c_str(), {.opened = lobby_opened, .frame = lobby_frame, .closed = lobby_closed, .user = &c}))
    game::net::closed(c.lobby, CLOSE_ABNORMAL);
}

/** 메뉴가 낸 요청을 로비 서버에 보낸다 — 요청을 내는 단추는 연결돼 있을 때만 켜진다 (menu.cpp 의 *_blocker) */
void send_lobby(Client& c, const game::LobbyRequest& request) {
  using Kind = game::LobbyRequest::Kind;
  game::net::Frame frame;
  switch (request.kind) {
    case Kind::reconnect: return connect_lobby(c);
    case Kind::create: frame = game::net::encode_create(c.menu.room_name, c.menu.max_players, c.menu.nickname); break;
    case Kind::join: frame = game::net::encode_join(request.room, c.menu.nickname); break;
    case Kind::leave: frame = game::net::encode_leave(); break;
    case Kind::ready: frame = game::net::encode_ready(request.ready); break;
    case Kind::start: frame = game::net::encode_start(); break;
  }
  // 새 요청을 보내면 지난 요청의 오류는 지운다 — 이 요청이 거절되면 서버가 다시 알린다
  if (c.socket.send(frame)) c.lobby.error.clear();
}

/** 에셋 팩을 다 받았다 (또는 받지 못했다) — 푸는 것은 프레임마다 조금씩 한다 (frame 의 scenery.step) */
void assets_fetched(std::vector<std::byte> bytes, bool ok, void* user) {
  Client& c = *static_cast<Client*>(user);
  if (ok) {
    c.scenery.begin(std::move(bytes));
  } else {
    engine::log_error("[app] 에셋 팩(%s)을 받지 못했다", ASSET_PACK_URL);
    c.scenery.fail();
  }
}

/** 에셋 팩을 받기 시작한다 — 메뉴는 기다리지 않고 뜬다 */
void load_assets(Client& c) {
  c.menu.assets = game::Assets::loading;
  if (!engine::asset::fetch(ASSET_PACK_URL, ASSET_PACK_MAX_BYTES, {.done = assets_fetched, .user = &c})) c.scenery.fail();
}

/** 다음 판의 시드 — 지난 시드에 지금 시각을 섞는다. 시뮬레이션은 받은 시드로만 정해진다 (같은 시드면 같은 판) */
uint32_t next_seed(Client& c) {
  c.seed = c.seed * 1664525u + 1013904223u + static_cast<uint32_t>(static_cast<uint64_t>(c.last_ms * 1000.0));
  return c.seed;
}

void capture_pointer(Client& c, bool captured);

/** 틱과 음악을 소리 줄기에 묶는다 — 지금의 틱이 이제부터 써 넣는 첫 표본에서 들린다. 그 표본이 들릴 때까지(미리 써 둔 양 + 장치의 지연, 0.1 초쯤) 틱은 기다린다 */
void anchor(Client& c) {
  c.anchored = true;
  c.anchor_frame = c.audio_written;
  c.anchor_tick = c.world.tick();
  c.sound->start_music(c.anchor_frame, c.anchor_tick);
}

/** 묶은 것을 푼다 (게임이 멈췄거나 장치가 멈췄다) — 음악이 끊긴다 */
void release_anchor(Client& c) {
  if (!c.anchored) return;
  c.anchored = false;
  c.sound->stop_music();
}

/**
 * 세계에서 방금 일어난 일을 소리로 — 틱이 돈 뒤와 게임 조작을 받은 바로 뒤에 부른다 (발사음을 다음 프레임까지 미루지 않는다).
 * 효과음은 미리 써 둔 구간(AUDIO_LEAD_MS)의 끝에 붙이지 않는다: 장치가 곧 가져갈 자리(AUDIO_REWRITE_MS 뒤)로 되돌아가 그 자리부터 다시 섞어 덧쓴다 —
 * 통로는 표본의 절대 번호로 쓰고, 장치는 아직 가져가지 않은 자리만 바꿔 놓는다
 */
void sound_follow(Client& c, double now_ms) {
  if (!c.sound) return;
  const Timed timed(c, SECTION_SOUND);
  if (c.audio_running && c.sound->audible(c.world)) {
    const uint64_t soon = c.clock.peek(now_ms) + static_cast<uint64_t>(c.audio_rate) * AUDIO_REWRITE_MS / 1000;
    if (const auto from = soon < c.audio_written ? c.sound->rewind(soon) : std::nullopt) {
      c.sound->follow(c.world, static_cast<uint32_t>(soon - *from));
      c.audio_block.resize((c.audio_written - *from) * 2);
      c.sound->render(c.audio_block, *from);
      c.port.write(*from, c.audio_block);
      return;
    }
  }
  c.sound->follow(c.world);
}

/**
 * 장치가 줄기를 consumed 앞까지 가져갔다 — 미리 써 둘 양이 찰 때까지 다음 블록을 섞어 보낸다.
 * 소리는 이 통지가 올 때만 만든다 (타이머로 장치를 물어 보지 않는다). 메뉴·일시정지에서도 믹서는 돈다 (효과음의 꼬리, 2단계의 메뉴 소리)
 */
void audio_consumed(uint64_t consumed, uint64_t underruns, double at_ms, void* user) {
  Client& c = *static_cast<Client*>(user);
  const Timed timed(c, SECTION_SOUND);
  c.clock.notify(consumed, at_ms);
  // 밀려 한꺼번에 닿은 통지들을 하나씩 따라 섞지 않는다 — 지금 장치가 있을 자리 하나로 본다 (묵은 통지는 시계의 표본으로만 남는다)
  consumed = std::max(consumed, c.clock.peek(engine::audio::now_ms()));
  if (underruns != c.audio_underruns) {
    engine::log_error("[app] 소리가 끊겼다 — 써 넣은 것이 모자라 조용히 지나간 표본 %llu (누적)", static_cast<unsigned long long>(underruns));
    c.audio_underruns = underruns;
  }
  if (!c.sound) return;
  // 늦었으면 지나간 자리는 건너뛴다
  c.audio_written = std::max(c.audio_written, consumed);
  const uint64_t goal = consumed + static_cast<uint64_t>(c.audio_rate) * AUDIO_LEAD_MS / 1000;
  if (goal <= c.audio_written) return;
  c.audio_block.resize(std::min(goal - c.audio_written, AUDIO_MAX_BLOCK) * 2);
  c.sound->render(c.audio_block, c.audio_written);
  c.port.write(c.audio_written, c.audio_block);
  c.audio_written += c.audio_block.size() / 2;
}

/** 호스트가 알려 준 소리 출력의 상태를 적용한다 — 표본율이 정해지면(바뀌면) 믹서를 세운다 */
void apply_audio_state(Client& c, const AudioState& state) {
  if (state.rate != c.audio_rate) {
    release_anchor(c);
    c.sound.reset();
    c.audio_rate = state.rate;
    c.clock = engine::audio::Clock(state.rate);
    if (state.rate && c.song) {
      c.sound.emplace(c.bank, *c.song, state.rate);
      c.sound->set_volume(c.menu.options);
      c.sound->restart(c.world);
    }
  }
  // 멈췄다 다시 도는 장치의 지난 통지는 시각이 맞지 않는다 — 잊는다
  if (state.running && !c.audio_running) c.clock = engine::audio::Clock(state.rate);
  c.audio_running = state.running;
  c.audio_latency_goal = static_cast<uint64_t>(state.latency * state.rate);
  // 틱이 소리에 묶여 있지 않으면 바로 옮긴다 — 묶여 있으면 advance 가 조금씩 따라간다 (틱이 뛰지 않게)
  if (!c.anchored) c.audio_latency = c.audio_latency_goal;
}

/**
 * 틀 둘러보기의 층 — 시작 방에서 동쪽으로 틀을 하나씩 지난다 (적이 없어 문이 다 열려 있다), 맨 끝 방에만 적이 있다:
 * 시작 방 → 정사각 홀(한 번 돌린 것) → 긴 홀 → ㄱ 자(여기서 남쪽으로 꺾인다) → 십자 → T 자(서쪽으로 꺾인다)
 * → 정사각 홀(돌진형·원거리형·거미·박쥐) → 카드 상점 → 수호자 보스. 골드는 실제 전투 보상으로만 얻는다.
 */
game::Floor tour_floor() {
  constexpr uint8_t N = 1u << game::NORTH, E = 1u << game::EAST, S = 1u << game::SOUTH, W = 1u << game::WEST;
  return game::Floor{{{.x = 0, .z = 0, .doors = E, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0},
                      {.x = 1, .z = 0, .doors = static_cast<uint8_t>(W | E), .shape = 1, .turn = 1, .depth = 1, .chargers = 0, .casters = 0},
                      {.x = 2, .z = 0, .doors = static_cast<uint8_t>(W | E), .shape = 2, .turn = 1, .depth = 2, .chargers = 0, .casters = 0},
                      {.x = 3, .z = 0, .doors = static_cast<uint8_t>(W | S), .shape = 3, .turn = 2, .depth = 3, .chargers = 0, .casters = 0},
                      {.x = 3, .z = 1, .doors = static_cast<uint8_t>(N | S), .shape = 4, .turn = 0, .depth = 4, .chargers = 0, .casters = 0},
                      {.x = 3, .z = 2, .doors = static_cast<uint8_t>(N | W), .shape = 5, .turn = 1, .depth = 5, .chargers = 0, .casters = 0},
                      {.x = 2, .z = 2, .doors = static_cast<uint8_t>(E | W), .shape = 1, .turn = 0, .depth = 6, .chargers = 1, .casters = 1, .spiders = 1, .bats = 1},
                      {.x = 1, .z = 2, .doors = static_cast<uint8_t>(E | W), .shape = 0, .turn = 0, .depth = 7, .chargers = 0, .casters = 0, .kind = game::RoomKind::shop},
                      {.x = 0, .z = 2, .doors = E, .shape = 1, .turn = 0, .depth = 8, .chargers = 0, .casters = 0, .kind = game::RoomKind::boss}}};
}

/** 메뉴가 상태를 고친 뒤 밖에서 해 줄 일을 한다. 호스트에 해 달라는 일(HOST_*)을 돌려준다 */
uint32_t follow(Client& c, const game::HudOutcome& outcome) {
  if (outcome.focus) c.ui.focus(outcome.focus);
  if (outcome.new_game) {
    c.world = game::World(next_seed(c), c.kit);
    c.motion.reset(c.world);
    c.controls = {};
    // 새 세계는 틱 0 부터다 — 소리와의 기준점을 다시 잡는다
    release_anchor(c);
    if (c.sound) c.sound->restart(c.world);
  }
  for (const game::LobbyRequest& request : outcome.lobby) send_lobby(c, request);
  sync_lobby_link(c);
  if (outcome.reload_assets) load_assets(c);
  if ((outcome.host & game::HOST_CAPTURE_POINTER) && c.pointer_locked) {
    // 이미 잡혀 있다 (판이 끝난 화면에서 풀지 않고 왔다) — 호스트가 다시 알려 주지 않으니 잡힌 것으로 바로 넘어간다
    capture_pointer(c, true);
    return outcome.host & ~game::HOST_CAPTURE_POINTER;
  }
  return outcome.host;
}

/**
 * 위젯이 낸 사건을 메뉴에 넘기고 메뉴 소리를 건다 — 가리킨 위젯(포인터)이나 포커스(글쇠)가 before 에서 다른 위젯으로 옮겨 갔으면 옮김 소리, 눌렀거나 골랐으면 누름 소리.
 * before 는 입력을 넣기 전의 그 위젯 (포인터면 Ui::hover, 글쇠면 Ui::focus)
 */
uint32_t widget_events(Client& c, std::span<const engine::hud::Event> events, engine::hud::Id before, engine::hud::Id now) {
  if (c.sound && c.audio_running) {
    if (now && now != before) c.sound->cue(game::Cue::ui_move);
    if (std::any_of(events.begin(), events.end(), [](const engine::hud::Event& e) { return e.kind == engine::hud::Event::Kind::press || e.kind == engine::hud::Event::Kind::select; }))
      c.sound->cue(game::Cue::ui_press);
  }
  return follow(c, game::apply_hud_events(events, c.menu, c.lobby));
}

/** 호스트가 포인터를 잡았거나 놓았다 — 잡히면 게임이 시작되고(메인 메뉴·끝난 화면에서면 새 판 — 세계를 먼저 돌려놓는다), 게임 중에 풀리면(ESC) 일시정지다 */
void capture_pointer(Client& c, bool captured) {
  c.pointer_locked = captured;
  follow(c, game::apply_pointer_capture(c.menu, captured));
  c.controls.set_captured(c.world, captured);
  // 조준 중에는 포인터가 위젯에 닿지 않는다
  if (captured) c.ui.clear();
}

/** 세계를 한 틱 나아가게 한다 — 움직임의 연출이 같은 틱을 따라간다. 틱은 여기(advance)에서만 돈다 */
void tick(Client& c) {
  c.world.step();
  c.motion.step(c.world);
  if (const auto foot = c.motion.footfall(); foot && c.sound) c.sound->cue(*foot == game::Foot::left ? game::Cue::step_left : game::Cue::step_right);
}

/**
 * 세계를 지금(now_ms)까지 나아가게 한다 — 프레임마다, 그리고 게임 조작이 닿았을 때 그 조작을 판정하기 바로 앞에
 * (조작을 '마지막으로 그린 프레임의 틱'이 아니라 지금의 틱에서 받는다)
 */
void advance(Client& c, double now_ms) {
  const double started = engine::audio::now_ms();
  if (c.last_ms < 0.0) c.last_ms = now_ms;
  const double passed = std::clamp((now_ms - c.last_ms) / 1000.0, 0.0, MAX_CATCH_UP);
  c.accumulator += passed;
  c.last_ms = now_ms;
  if (c.audio_latency != c.audio_latency_goal) {
    const uint64_t step = c.anchored ? static_cast<uint64_t>(passed * AUDIO_LATENCY_SLEW * c.audio_rate / 1000.0) : UINT64_MAX;
    c.audio_latency = c.audio_latency < c.audio_latency_goal ? c.audio_latency + std::min(step, c.audio_latency_goal - c.audio_latency)
                                                             : c.audio_latency - std::min(step, c.audio_latency - c.audio_latency_goal);
  }
  // 게임 중이 아니면(메뉴, 일시정지) 시간이 쌓이지 않는다 — 다시 시작했을 때 따라잡지 않는다
  if (!game::simulating(c.menu)) c.accumulator = 0.0;
  if (c.sound) c.sound->set_volume(c.menu.options);
  // 시뮬레이션은 고정 틱으로만 나아간다 — 화면 주사율과 상관없이 같은 결과.
  // 게임 중에 소리 장치가 돌고 있으면 틱은 실제로 들린 표본 수를 따라간다 (음악의 박과 판정의 박이 같은 시계다). 아니면 화면의 시간으로 간다 — 소리 없이도 게임은 돈다
  if (game::simulating(c.menu) && c.sound && c.audio_running && c.clock.live(now_ms, AUDIO_STALE_MS)) {
    if (!c.anchored) anchor(c);
    const uint64_t consumed = c.clock.estimate(now_ms, c.audio_written);
    const uint64_t heard = consumed > c.audio_latency ? consumed - c.audio_latency : 0;
    // 기준점에서 들린 시간 — 틱의 수와 그 소수 부분 (표본 × 틱/초 를 표본율로 나눈 몫과 나머지)
    const uint64_t elapsed = heard > c.anchor_frame ? (heard - c.anchor_frame) * game::TICK_RATE : 0;
    const uint64_t target = c.anchor_tick + elapsed / c.audio_rate;
    const uint64_t behind = target > c.world.tick() ? target - c.world.tick() : 0;
    // 너무 밀렸으면(탭이 멈췄다 돌아왔다) 따라잡지 않고 지금을 새 기준점으로 삼는다. 판이 끝나면 세계가 더 나아가지 않는다
    if (behind > static_cast<uint64_t>(MAX_CATCH_UP * game::TICK_RATE)) {
      anchor(c);
      c.tick_alpha = 1.0f;
      c.tick_phase = 0.0;
    } else {
      for (uint64_t i = 0; i < behind && c.world.outcome() == game::World::Outcome::playing; i++) tick(c);
      // 세계가 목표 틱에 있을 때만 소수 부분이 그 틱의 것이다 (기준점을 막 잡아 기다리는 중이면 0 — 지난 틱의 자리에서 이어 간다)
      c.tick_phase = c.world.tick() == target ? static_cast<double>(elapsed % c.audio_rate) / static_cast<double>(c.audio_rate) : 0.0;
      c.tick_alpha = c.world.tick() == target ? static_cast<float>(c.tick_phase) : 1.0f;
    }
    c.accumulator = 0.0;
  } else {
    if (c.sound) release_anchor(c);
    while (c.accumulator >= game::World::TICK) {
      tick(c);
      c.accumulator -= game::World::TICK;
    }
    if (game::simulating(c.menu)) {
      c.tick_phase = c.accumulator / game::World::TICK;
      c.tick_alpha = static_cast<float>(c.tick_phase);
    }
  }
  c.stats.section(SECTION_TICK, engine::audio::now_ms() - started);
  sound_follow(c, now_ms);
}

/**
 * 박자에 묶인 조작을 누른 때로 판정한다 — happened_ms 는 호스트가 그 사건에 찍은 시각 (1970 년부터의 ms). advance 로 세계를 지금까지 나아가게 한 뒤에 부른다.
 * 주 스레드에서 여기까지 오는 동안, 그리고 이 스레드가 프레임을 그리느라 받지 못한 동안이 판정을 밀지 않는다 (World::act 의 ago).
 * 호스트가 준 시각도 범위를 본다 — 앞날이거나 숫자가 아니면 방금으로 치고, 너무 오래됐으면 판정하지 않는다 (nullopt — 그 누름은 박자 행동이 되지 않는다)
 */
std::optional<game::Judge::Press> judge_press(const Client& c, double now_ms, double happened_ms) {
  return c.judge.press(c.world.tick(), c.tick_phase, now_ms - (happened_ms - c.time_origin), c.menu.options.judge_offset);
}

/** 그 누름이 판정을 받았다 (나갔거나 미스였다) — 타이밍 표시에 남는다. 판정의 눈금은 옮기지 않는다: 치우침은 옵션의 판정 보정 하나다 */
void judge_learn(Client& c, const std::optional<game::Judge::Press>& press) {
  if (press) c.judge.record(*press);
}

std::optional<int32_t> ago_of(const std::optional<game::Judge::Press>& press) { return press ? std::optional{press->ago} : std::nullopt; }

/**
 * 판정의 기록 — 성능 표시(F3)가 켜져 있을 때 박자에 묶인 누름마다 로그 한 줄: 판정에 들어간 값을 그대로 낸다 (판정이 흔들릴 때 어느 값이 흔들렸는지 본다).
 *   what 무엇을 눌렀나 · tick·phase 지금의 틱과 소수 · age 누름이 닿기까지 (ms) · raw 가장 가까운 칸의 머리에서 벗어난 양 (ms, 보정 전) ·
 *   bias 지금 쓰는 판정 보정 (ms — 옵션의 값) · ago World::act 에 준 값 ·
 *   off 판정받은 틱이 칸의 머리에서 벗어난 틱 수 · result 그 누름으로 세계에 남은 일 (없으면 none — 쓴 칸의 연타, 쿨다운, 기억됨) ·
 *   lat·goal 틱의 시계에 쓰는 소리 지연과 장치가 알린 값 (ms) · anchored 틱이 소리에 묶였는가 · lead 써 둔 소리가 장치보다 앞선 양 (ms)
 */
void judge_log(const Client& c, const char* what, const std::optional<game::Judge::Press>& press, double now_ms, double age_ms, uint64_t events_before) {
  if (!c.perf_shown) return;
  if (!press) return engine::log_info("[judge] what=%s stale=1", what);
  const char* result = "none";
  for (uint64_t at = events_before; at < c.world.event_count(); at++) {
    switch (c.world.event(at)->kind) {
      case game::WorldEvent::Kind::shot: result = "shot"; break;
      case game::WorldEvent::Kind::miss: result = "miss"; break;
      case game::WorldEvent::Kind::dry: result = "dry"; break;
      case game::WorldEvent::Kind::dash: result = "dash"; break;
      case game::WorldEvent::Kind::magazine_out: result = "magazine_out"; break;
      case game::WorldEvent::Kind::magazine_in: result = "magazine_in"; break;
      default: break;
    }
  }
  const double rate = c.audio_rate ? static_cast<double>(c.audio_rate) : 1.0;
  const int64_t pressed = static_cast<int64_t>(c.world.tick()) - press->ago;
  engine::log_info("[judge] what=%s tick=%llu phase=%.3f age=%.1f raw=%.1f bias=%.1f ago=%d off=%d result=%s beat=%d pending=%d lat=%.1f goal=%.1f anchored=%d lead=%.1f now=%.1f", what,
                   static_cast<unsigned long long>(c.world.tick()), c.tick_phase, age_ms, press->raw_ms,
                   static_cast<double>(c.menu.options.judge_offset), press->ago, pressed >= 0 ? game::slot_offset(static_cast<uint64_t>(pressed)) : 0, result, c.world.beat_tick() == c.world.tick() ? 1 : 0,
                   c.world.pending() ? 1 : 0, c.audio_latency * 1000.0 / rate, c.audio_latency_goal * 1000.0 / rate, c.anchored ? 1 : 0,
                   (static_cast<double>(c.audio_written) - static_cast<double>(c.clock.peek(now_ms))) * 1000.0 / rate, now_ms);
}

bool frame(double, void*) {
  if (!client) return false;
  Client& c = *client;
  // 시각은 소리의 통지와 같은 시계로 잰다 (performance.now)
  const double frame_now = engine::audio::now_ms();
  // 프레임 콜백의 간격 — 끊긴 프레임(가려졌다 돌아옴, 로딩)은 치지 않고 여느 간격만 따라간다. 그리지 않고 건너뛰는 콜백도 센다 (화면 갱신의 간격이다)
  if (const double gap = frame_now - c.frame_ms; c.frame_ms >= 0.0) {
    if (gap > FRAME_GAP_MIN_MS && gap < FRAME_GAP_MAX_MS) c.frame_interval += (static_cast<float>(gap) - c.frame_interval) * FRAME_GAP_FOLLOW;
    c.refresh.sample(static_cast<float>(gap));
  }
  c.frame_ms = frame_now;
  // 세계가 도는 동안의 장면은 프레임 예산이 정한 대로 낸다 — 화면 주사율을 대지 못하는 기기에서는 갱신 두 번에 한 프레임 (그리지 않는 콜백은 아무 일도 하지 않는다:
  // 틱은 다음에 그릴 때 따라잡고, 입력은 닿는 대로 제 틱에서 받는다). 메뉴와 멈춘 장면은 갱신마다 그린다 (가볍다 — 커서가 고르게 움직인다)
  const engine::FrameQuality quality = c.governor.quality();
  const bool playing = game::simulating(c.menu);
  const double since_drawn = c.drawn_ms >= 0.0 ? frame_now - c.drawn_ms : 0.0;
  if (playing && c.drawn_ms >= 0.0 && since_drawn < (static_cast<double>(quality.divisor) - 0.5) * c.refresh.interval()) return true;
  c.drawn_ms = frame_now;
  c.stats.frame(frame_now);
  if (c.stats.due(frame_now)) report_perf(c, c.stats.take(frame_now));
  engine::gpu::GpuTime gpu_times[8];
  for (const engine::gpu::GpuTime& time : std::span{gpu_times}.first(c.device->take_gpu_times(gpu_times))) {
    c.stats.gpu(time.scene + time.canvas, time.scene);
    if (time.scene > 0.0f) c.gpu_ms = time.scene + time.canvas;
  }
  if (playing && since_drawn > 0.0 && since_drawn < FRAME_GAP_BREAK_MS) c.governor.frame(static_cast<float>(since_drawn), c.refresh.interval(), c.gpu_ms);
  else c.governor.pause();
  advance(c, frame_now);
  if (game::simulating(c.menu) && c.world.outcome() != game::World::Outcome::playing) {
    // 판이 끝났다 (죽음·층 완료) — 끝난 화면으로. 포인터는 잡힌 채라, 그 화면의 포인터는 화면 가운데에서 시작해 움직인 양으로 옮긴다
    follow(c, game::apply_game_over(c.menu));
    c.controls.set_captured(c.world, false);
    c.pointer_x = c.device->width() * 0.5;
    c.pointer_y = c.device->height() * 0.5;
    compose_hud(c);
    const engine::hud::Id hover = c.ui.ui().hover;
    const auto events = c.ui.pointer_move(c.hud.regions(), static_cast<float>(c.pointer_x), static_cast<float>(c.pointer_y));
    widget_events(c, events, hover, c.ui.ui().hover);
  }
  engine::gpu::Device& device = *c.device;
  // 받은 에셋 팩을 한 항목씩 풀어 올린다 — 끝나면(또는 어긋났으면) 메뉴의 단추가 그에 맞게 바뀐다
  std::optional<Timed> timed;
  timed.emplace(c, SECTION_ASSETS);
  if (c.menu.assets == game::Assets::loading) {
    c.scenery.step(device);
    if (c.scenery.state() == game::Scenery::State::ready) {
      c.menu.assets = game::Assets::ready;
      engine::log_info("[game] assets ready");
    } else if (c.scenery.state() == game::Scenery::State::failed) {
      c.menu.assets = game::Assets::failed;
      engine::log_error("[game] assets failed");
    }
  }
  // 메인 메뉴·대기실은 장면 없이 HUD(배경 그림과 메뉴)만 그린다
  const bool scene = game::shows_scene(c.menu);
  if (scene) {
    const game::Floor& floor = c.world.floor();
    const game::Room& here = floor.rooms[c.world.room()];
    // 포털을 넘는 중이고 방이 아직 바뀌지 않았으면 건너편 방의 구운 빛을 미리 푼다 — 프레임마다 그림 하나씩, 방이 바뀌는 프레임에는 올리기만 하게
    if (const auto touched = c.world.portal_tick(); touched && c.world.tick() - *touched < game::TRANSIT_SWAP)
      if (const auto next = floor.at(here.x + game::DIRECTION_X[c.world.portal_side()], here.z + game::DIRECTION_Z[c.world.portal_side()]))
        c.scenery.prepare_room(floor.rooms[*next].shape);
    c.scenery.step_light();
    // 지금 방의 구운 빛(그 틀의 라이트맵 한 장)을 올려 둔다 — 방이 바뀐 프레임에만 일이 있다
    c.scenery.light_room(device, here.shape);
  }
  // 장면은 제 타깃에 프레임 예산이 정한 크기로 그린다 (화면보다 작을 수 있다) — 화면에는 한 번 올려 그리고 HUD 는 그 위에 화면 해상도로 그린다
  const engine::SceneExtent extent = engine::scene_extent(device.width(), device.height(), quality.scale);
  const engine::gpu::SceneTarget target{extent.width, extent.height, quality.multisample};
  // 눈은 움직임의 연출을 얹은 것 — 걸음·착지·대시에 살짝 흔들리고 기운다 (조준 방향과 발사 판정은 세계의 것 그대로다)
  const game::ViewMotion motion = c.motion.view(c.tick_alpha, c.menu.options.shake);
  const game::Camera camera = game::scene_camera(c.menu, c.world, static_cast<float>(device.width()) / static_cast<float>(device.height()), motion);
  // 멈춘 장면(일시정지, 끝난 화면)은 한 번 그린 뒤 다시 그리지 않는다 — 눈(옵션의 시야각)이나 타깃이 바뀌었을 때만
  if (playing || !scene) c.still_view.reset();
  const bool redraw = scene && (!c.still_view || c.still_view->m != camera.view_proj.m || device.scene_target() != target);
  timed.emplace(c, SECTION_SCENE);
  device.begin_frame();
  if (redraw) {
    device.begin_scene(target, SKY);
    // 가까운 것부터 그린다 — 뒤에 그리는 것은 가려진 픽셀을 깊이 판정에서 버린다 (픽셀마다의 셈을 하지 않는다):
    // 손에 든 총(늘 맨 앞), 방과 소품과 적, 원경, 그리고 남은 픽셀에 하늘. 반투명한 포털은 그 뒤에 — 뒤의 하늘과 원경 위에 섞인다.
    // 총구 섬광은 맨 나중에 더한다 (총과 같은 당긴 깊이라 벽·포털에 묻히지 않고, 총에 가린 곳만 빠진다)
    c.stage.draw_weapon(device, c.world, camera, motion, c.scenery, c.tick_alpha);
    c.scene.draw(device, c.world, camera, c.scenery);
    c.stage.draw_backdrop(device, c.world, camera);
    c.stage.draw_sky(device, c.world, camera, c.scenery);
    c.portals.draw(device, c.world, camera);
    c.stage.draw_flash(device);
    device.end_scene();
    if (!playing) c.still_view = camera.view_proj;
  }
  device.begin_canvas(SKY);
  if (scene) c.present.draw(device);
  timed.emplace(c, SECTION_HUD);
  c.overlay.submit(compose_hud(c));
  c.overlay.flush(device);
  timed.emplace(c, SECTION_SUBMIT);
  device.end_frame();
  timed.reset();
  c.stats.section(SECTION_FRAME, engine::audio::now_ms() - frame_now);
  c.stats.end_frame();
  return true;
}

/** 요청한 장치가 왔다 (또는 못 받았다) — 여기서 클라이언트를 세우고 프레임 루프를 건다 */
void on_device(std::unique_ptr<engine::gpu::Device> device, void*) {
  boot = Boot::idle;
  if (shutdown_requested) return;
  if (!device) {
    engine::log_error("[app] GPU 장치가 없어 클라이언트를 시작하지 못했다");
    return;
  }
  auto rooms = game::RoomMeshes::decode();
  if (!rooms) {
    engine::log_error("[app] 방 메시 에셋을 읽지 못했다");
    return;
  }
  auto font = engine::hud::Font::decode(game::assets::hud_font());
  if (!font) {
    engine::log_error("[app] 글꼴 에셋을 읽지 못했다");
    return;
  }
  Client* created = new (std::nothrow) Client(std::move(device), std::move(*rooms), std::move(*font));
  if (!created) return;
  if (!created->overlay.create(*created->device, created->shaders, created->font) || !created->present.create(*created->device, created->shaders) ||
      !created->scene.create(*created->device, created->shaders, created->rooms) || !created->stage.create(*created->device, created->shaders) ||
      !created->portals.create(*created->device, created->shaders)) {
    engine::log_error("[app] 그리기 자원을 만들지 못했다");
    delete created;
    return;
  }
  // 메뉴 배경 그림 — 없거나 올리지 못해도 게임은 뜬다 (메뉴가 기본 바탕으로 나온다)
  if (const std::span<const std::byte> packed = game::assets::menu_background(); !packed.empty()) {
    const auto bitmap = engine::hud::Bitmap::decode(packed);
    const uint32_t id = bitmap ? created->overlay.add_image(*created->device, bitmap->width, bitmap->height, bitmap->rgba) : 0;
    if (id) created->menu_backdrop = {id, static_cast<float>(bitmap->width), static_cast<float>(bitmap->height)};
    else engine::log_error("[app] 메뉴 배경 그림을 올리지 못했다 — 기본 바탕으로 나온다");
  }
  if (pending_width && pending_height) created->device->resize(pending_width, pending_height);
  created->governor.reset(static_cast<uint64_t>(created->device->width()) * created->device->height());
  // 소리 — 재료를 풀지 못했거나 호스트가 통로를 넘기지 않았으면 소리 없이 돈다
  if (auto bank = engine::audio::Bank::decode(game::assets::sample_bank())) {
    created->bank = std::move(*bank);
    created->song = engine::audio::Song::decode(game::assets::pulse_song(), static_cast<uint32_t>(created->bank.samples().size()));
  }
  if (!created->song) engine::log_error("[app] 소리 에셋(샘플 뱅크·곡)을 읽지 못했다 — 소리 없이 돈다");
  else if (!created->port.open({.consumed = audio_consumed, .user = created})) engine::log_error("[app] 소리 출력 통로가 없다 — 소리 없이 돈다");
  // 저장해 둔 옵션 — 믿을 수 없는 글이라 어긋나면 기본값 그대로다 (decode_options 가 아무것도 고치지 않는다)
  if (!pending_options.empty() && game::decode_options(pending_options, created->menu.options)) created->saved_options = game::encode_options(created->menu.options);
  apply_audio_state(*created, pending_audio);
  created->motion.reset(created->world);
  load_assets(*created);
  // 첫 화면은 메인 메뉴다 — 글쇠만으로도 고를 수 있게 항목 목록에 포커스를 둔다
  created->ui.focus(game::HUD_MENU);
  client = created;
  boot = Boot::running;
  engine::run_frame_loop(frame, nullptr);
  engine::log_info("[app] 클라이언트 시작 — WebGPU / OffscreenCanvas");
}

}  // namespace

namespace app {

bool resize_surface(uint32_t width, uint32_t height) {
  if (!width || !height) return false;
  pending_width = width;
  pending_height = height;
  if (client && (width != client->device->width() || height != client->device->height())) {
    client->device->resize(width, height);
    // 캔버스가 달라졌다 — 프레임 예산은 그 크기에 맞는 데서 다시 잰다
    client->governor.reset(static_cast<uint64_t>(width) * height);
  }
  return true;
}

void pointer_move(double x, double y, double delta_x, double delta_y) {
  if (!client) return;
  Client& c = *client;
  if (c.controls.aiming()) return c.controls.move(c.world, delta_x, delta_y, c.menu.options.sensitivity, c.menu.options.invert_y);
  if (c.pointer_locked) {
    // 잡힌 포인터는 자리가 없다 — 움직인 양을 쌓아 화면 안에서 옮긴다.
    // ceiling: 움직인 양(CSS 픽셀)을 그리는 버퍼의 픽셀로 그대로 쓴다. 배율이 1 이 아닌 화면에서는 그만큼 느리게 움직인다 —
    // 눈에 띄면 호스트가 surface.resize 와 함께 배율을 넘기게 한다.
    c.pointer_x = std::clamp(c.pointer_x + delta_x, 0.0, static_cast<double>(c.device->width()));
    c.pointer_y = std::clamp(c.pointer_y + delta_y, 0.0, static_cast<double>(c.device->height()));
    x = c.pointer_x;
    y = c.pointer_y;
  }
  compose_hud(c);
  // 포인터가 움직인 것은 사용자 동작으로 치지 않는다 — 호스트에 바랄 것이 없다
  const engine::hud::Id hover = c.ui.ui().hover;
  const auto events = c.ui.pointer_move(c.hud.regions(), static_cast<float>(x), static_cast<float>(y));
  widget_events(c, events, hover, c.ui.ui().hover);
}

void pointer_leave() {
  if (client) client->ui.pointer_leave();
}

namespace {

/** 저장할 것이 호스트가 간직한 글과 달라졌으면 저장해 달라고 한다 — 버튼·글쇠 입력의 답에 싣는다 (타이머로 묻지 않는다) */
uint32_t save_request(const Client& c) { return game::encode_options(c.menu.options) != c.saved_options ? game::HOST_SAVE_OPTIONS : 0; }

uint32_t press_input(Client& c, uint32_t button, double time_ms) {
  if (c.controls.aiming()) {
    const double now_ms = engine::audio::now_ms();
    advance(c, now_ms);
    const auto press = judge_press(c, now_ms, time_ms);
    const uint64_t events_before = c.world.event_count();
    if (c.controls.press(c.world, button, ago_of(press))) judge_learn(c, press);
    if (button == PRIMARY_BUTTON || button == 2) judge_log(c, button == PRIMARY_BUTTON ? "fire" : "dash", press, now_ms, now_ms - (time_ms - c.time_origin), events_before);
    sound_follow(c, now_ms);
    return 0;
  }
  if (button != PRIMARY_BUTTON) return 0;
  compose_hud(c);
  const auto events = c.ui.pointer_press(c.hud.regions(), c.font);
  const uint32_t host = widget_events(c, events, {}, {});
  // 빈 곳을 눌러 포커스가 풀렸다 — 그 화면이 포커스를 놓지 않는 화면이면 돌려놓는다
  if (!c.ui.ui().focus) c.ui.focus(game::resting_focus(c.menu));
  return host;
}

uint32_t release_input(Client& c, uint32_t button) {
  if (c.controls.aiming() || button != PRIMARY_BUTTON) return 0;
  compose_hud(c);
  const auto events = c.ui.pointer_release(c.hud.regions());
  return widget_events(c, events, {}, {});
}

uint32_t key_input(Client& c, std::string_view code, std::string_view key, uint32_t modifiers, bool pressed, bool repeat, double time_ms);

}  // namespace

uint32_t pointer_press(uint32_t button, double time_ms) {
  if (!client) return 0;
  const uint32_t host = press_input(*client, button, time_ms);
  return host | save_request(*client);
}

uint32_t pointer_release(uint32_t button) {
  if (!client) return 0;
  const uint32_t host = release_input(*client, button);
  return host | save_request(*client);
}

uint32_t key(std::string_view code, std::string_view key, uint32_t modifiers, bool pressed, bool repeat, double time_ms) {
  if (!client) return 0;
  const uint32_t host = key_input(*client, code, key, modifiers, pressed, repeat, time_ms);
  return host | save_request(*client);
}

bool load_options(std::string_view text) {
  // 호스트가 간직했던 글도 믿지 않는다 — 어긋나면 버리고 기본값으로 뜬다
  game::Options read;
  if (!game::decode_options(text, read)) return false;
  pending_options = text;
  if (client) {
    client->menu.options = read;
    client->saved_options = game::encode_options(read);
  }
  return true;
}

std::string options_text() {
  if (!client) return {};
  // 호스트가 이 글을 간직한다 — 다시 달라질 때까지 저장해 달라고 하지 않는다
  client->saved_options = game::encode_options(client->menu.options);
  return client->saved_options;
}

void wheel(double delta_y, uint32_t mode) {
  if (!client || client->controls.aiming()) return;
  Client& c = *client;
  compose_hud(c);
  c.ui.wheel(c.hud.regions(), static_cast<float>(delta_y * (mode == 1 ? WHEEL_LINE : mode == 2 ? WHEEL_PAGE : 1.0)));
}

void pointer_capture(bool captured) {
  if (client) capture_pointer(*client, captured);
}

void audio_state(bool running, double sample_rate, double base_latency, double output_latency) {
  // 호스트가 준 값도 범위를 본다 — 어긋나면 소리 출력이 없는 것으로 친다 (게임은 화면의 시간으로 돈다)
  const double latency = base_latency + output_latency;
  const bool valid = sample_rate >= AUDIO_MIN_RATE && sample_rate <= AUDIO_MAX_RATE && sample_rate == std::floor(sample_rate) && latency >= 0.0 && latency <= AUDIO_MAX_LATENCY;
  pending_audio = valid ? AudioState{running, static_cast<uint32_t>(sample_rate), latency} : AudioState{};
  if (client) apply_audio_state(*client, pending_audio);
}

namespace {

uint32_t key_input(Client& c, std::string_view code, std::string_view key, uint32_t modifiers, bool pressed, bool repeat, double time_ms) {
  // 성능 표시 — 게임 중에도 메뉴에서도 같은 글쇠다 (게임의 조작과 메뉴의 포커스는 건드리지 않는다)
  if (code == PERF_KEY) {
    if (pressed && !repeat && !(c.perf_shown = !c.perf_shown)) c.perf.reset();
    return 0;
  }
  if (code == TOUR_KEY) {
    if (pressed && !repeat && c.controls.aiming()) {
      c.world = game::World(tour_floor(), c.kit);
      c.motion.reset(c.world);
      release_anchor(c);
      if (c.sound) c.sound->restart(c.world);
    }
    return 0;
  }
  if (c.controls.aiming()) {
    if (repeat) return 0;
    const double now_ms = engine::audio::now_ms();
    advance(c, now_ms);
    const auto press = judge_press(c, now_ms, time_ms);
    const uint64_t events_before = c.world.event_count();
    if (c.controls.key(c.world, code, pressed, ago_of(press))) judge_learn(c, press);
    if (pressed && (code == "KeyR" || code == "ShiftLeft" || code == "ShiftRight")) judge_log(c, code == "KeyR" ? "reload" : "dash", press, now_ms, now_ms - (time_ms - c.time_origin), events_before);
    sound_follow(c, now_ms);
    return 0;
  }
  if (!pressed) return 0;
  if (code == "Escape") return repeat ? 0 : follow(c, game::apply_menu_back(c.menu, c.lobby));
  compose_hud(c);
  const engine::hud::Id focus = c.ui.ui().focus;
  const auto events = c.ui.key(c.hud.regions(), c.font, code, key, modifiers, repeat);
  return widget_events(c, events, focus, c.ui.ui().focus);
}

}  // namespace

}  // namespace app

// Worker 어댑터가 부르는 진입점 (host/worker-adapter.ts) — VeilBind RPC 밖이다
extern "C" {

/**
 * 넘겨받은 캔버스로 GPU 장치를 요청한다. 장치는 나중에 오므로(WebGPU 의 어댑터·장치 요청은 비동기다)
 * 여기서는 요청만 하고 돌아간다 — 클라이언트는 장치가 온 뒤에 서고, 그때까지의 입력은 버려진다
 */
EMSCRIPTEN_KEEPALIVE void app_boot() {
  if (boot != Boot::idle) return;
  boot = Boot::requesting;
  shutdown_requested = false;
  // 백엔드는 여기서 고른다 — 엔진과 게임은 engine::gpu::Device 만 본다
  engine::gpu::request_webgpu_device(engine::CANVAS_TARGET, on_device, nullptr);
}

EMSCRIPTEN_KEEPALIVE void app_shutdown() {
  if (boot == Boot::requesting) shutdown_requested = true;
  // 받고 있던 에셋 팩의 결과는 받을 곳이 없다
  engine::asset::cancel_fetch();
  // 프레임 루프는 다음 콜백에서 client 가 없는 것을 보고 멈춘다
  delete client;
  client = nullptr;
  if (boot == Boot::running) boot = Boot::idle;
}

}
