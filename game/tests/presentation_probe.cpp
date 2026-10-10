// HUD 검증 프로브 — 상태에서 화면 요소가 정해지는지, 메뉴가 입력에 따라 옳게 넘어가는지 본다. GPU 없이 Node 에서 돈다 (tests/game.test.mjs 가 부른다).
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <limits>
#include <numbers>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include "engine/audio/bank.hpp"
#include "engine/audio/sequencer.hpp"
#include "engine/hud/font.hpp"
#include "engine/hud/interaction.hpp"
#include "engine/hud/layout.hpp"
#include "gameplay/content/assets.hpp"
#include "gameplay/content/room_meshes.hpp"
#include "gameplay/domain/lobby.hpp"
#include "gameplay/net/lobby_protocol.hpp"
#include "gameplay/input/controls.hpp"
#include "gameplay/presentation/camera.hpp"
#include "gameplay/presentation/hud.hpp"
#include "gameplay/presentation/light.hpp"
#include "gameplay/presentation/menu.hpp"
#include "gameplay/presentation/sound.hpp"
#include "gameplay/presentation/weapon.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

using game::Lobby;
using game::LobbyRequest;
using game::Menu;
using game::MenuItem;
using game::Screen;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

/** 게임이 실제로 쓰는 글꼴 (빌드에 묻힌 것) */
std::optional<engine::hud::Font> font;
/** 게임이 실제로 쓰는 방 조각 (빌드에 묻힌 메시)과 그 충돌 상자 */
std::optional<game::RoomMeshes> rooms;
game::RoomKit kit;

/** 시작 방과 그 북쪽의 전투방 하나 (돌진형 하나) */
game::Floor two_rooms() {
  return {{{.x = 0, .z = 0, .doors = 1u << game::NORTH, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0},
           {.x = 0, .z = -1, .doors = 1u << game::SOUTH, .shape = 1, .turn = 0, .depth = 1, .chargers = 1, .casters = 0}}};
}

constexpr engine::hud::Viewport SCREEN{1280, 720, 3};
/** 게임 중 HUD 의 자리를 손으로 계산하는 화면 — 1920×1080 은 단위가 4 픽셀이라 480×270 단위로 딱 떨어진다 */
constexpr engine::hud::Viewport FULL{1920, 1080, 4};
/** 메뉴가 들어가야 하는 가장 작은 화면 — 800×600 에서 단위는 2 픽셀 */
constexpr engine::hud::Viewport SMALL{800, 600, 2};

engine::hud::DrawList drawn(const game::HudState& state, engine::hud::Viewport viewport = SCREEN) {
  engine::hud::DrawList list;
  engine::hud::Regions regions;
  engine::hud::layout(game::hud_root(state), viewport, *font, list, regions);
  return list;
}

/** 그 상태의 HUD 에 이 글자가 그려지는가 */
bool shows(const game::HudState& state, std::string_view content) {
  const engine::hud::DrawList list = drawn(state);
  return std::any_of(list.begin(), list.end(), [&](const engine::hud::DrawItem& item) { return item.content == content; });
}

/**
 * 그 상태의 HUD 글자가 모두 그 글자를 그리는 면(굵기)에 있는가 — 없는 글자는 화면에 '?' 로 나온다.
 * 굵은 면(1·2)은 content/fonts/bold.txt·display.txt 에 적은 글자만 갖는다: 굵은 글을 새로 쓰면 거기에 글자를 더한다
 */
bool all_baked(const game::HudState& state) {
  bool ok = true;
  for (const engine::hud::DrawItem& item : drawn(state)) {
    std::string_view rest = item.content;
    while (!rest.empty()) {
      const char32_t code = engine::hud::take_codepoint(rest);
      if (font->has(code, item.face)) continue;
      std::printf("글꼴의 면 %u 에 없는 글자 U+%04X: %s\n", item.face, static_cast<unsigned>(code), item.content.c_str());
      ok = false;
    }
  }
  return ok;
}

/** 게임 제목 — 큰 굵은 면(2)의 낱글자들을 놓인 차례(왼쪽부터)로 이으면 ZENDIKAR 인가 */
bool shows_logo(const game::HudState& state) {
  engine::hud::DrawList list = drawn(state);
  std::erase_if(list, [](const engine::hud::DrawItem& item) { return item.kind != engine::hud::DrawItem::Kind::text || item.face != 2; });
  std::sort(list.begin(), list.end(), [](const engine::hud::DrawItem& a, const engine::hud::DrawItem& b) { return a.x < b.x; });
  std::string letters;
  for (const engine::hud::DrawItem& item : list) letters += item.content;
  return letters == "ZENDIKAR";
}

/**
 * 800×600 (400×300 단위, 단위 2 픽셀)에서 메뉴가 제 틀 안에 있는가. 틀은 높이 216 단위, 화면 아래에서 12 단위 위 → y 72…288 단위 = 144…576 픽셀.
 *   왼쪽 단: 왼쪽 여백 20, 폭 112 단위 → x 40…264 픽셀
 *   패널: 그 오른쪽으로 12 단위 띄운 폭 208 단위 → x 288…704 픽셀, 위는 제목 자리(52 단위) 밑 → y 248 픽셀부터. 글자는 안쪽 여백 10 단위 안 → x 308…684
 * (글자의 자리는 정수 픽셀에 맞춰지므로 줄의 아래 끝은 1 픽셀까지 넘을 수 있다)
 * 글자는 제 단 안에, 패널의 판(x 288 에서 시작하는 폭 416 픽셀의 사각형)은 틀의 아래(576)를 넘지 않아야 한다
 */
bool fits(const game::HudState& state) {
  bool ok = true;
  for (const engine::hud::DrawItem& item : drawn(state, SMALL)) {
    if (item.kind == engine::hud::DrawItem::Kind::rect && item.x == 288.0f && item.width == 416.0f && (item.y < 248.0f || item.y + item.height > 576.0f)) {
      std::printf("틀 밖으로 나간 패널 (y %.0f…%.0f)\n", item.y, item.y + item.height);
      ok = false;
    }
    if (item.kind != engine::hud::DrawItem::Kind::text || item.content.empty()) continue;
    const float right = item.x + font->width(item.content, item.size, item.face), bottom = item.y + font->line_height(item.size, item.face);
    const bool column = item.x < 264.0f;
    if (item.x >= (column ? 40.0f : 308.0f) && right <= (column ? 264.0f : 684.0f) && item.y >= (column ? 144.0f : 248.0f) && bottom <= 576.0f + 1.0f) continue;
    std::printf("틀 밖으로 나간 글자 (x %.0f…%.0f, y %.0f…%.0f): %s\n", item.x, right, item.y, bottom, item.content.c_str());
    ok = false;
  }
  return ok;
}

/** 클라이언트(app/client/main.cpp)가 하는 것처럼 입력을 위젯에 대 보고, 사건을 메뉴에 넘기고, 포커스를 옮긴다 */
struct Session {
  game::World world{two_rooms(), kit};
  game::Controls controls;
  Menu menu;
  Lobby lobby;
  engine::hud::Interaction ui;
  engine::hud::DrawList list;
  engine::hud::Regions regions;

  Session() {
    ui.focus(game::HUD_MENU);
    arrange();
  }

  game::HudState state() const { return game::select_hud_state(world, menu, lobby, ui.ui()); }
  void arrange() { engine::hud::layout(game::hud_root(state()), SCREEN, *font, list, regions); }

  game::HudOutcome follow(game::HudOutcome outcome) {
    if (outcome.focus) ui.focus(outcome.focus);
    arrange();
    return outcome;
  }
  game::HudOutcome apply(std::span<const engine::hud::Event> events) { return follow(game::apply_hud_events(events, menu, lobby)); }
  game::HudOutcome key(const char* code, const char* produced = "") { return apply(ui.key(regions, *font, code, produced, 0, false)); }
  game::HudOutcome type(std::string_view utf8) { return apply(ui.type(regions, *font, utf8)); }
  game::HudOutcome escape() { return follow(game::apply_menu_back(menu, lobby)); }
  game::HudOutcome capture(bool captured) {
    const game::HudOutcome outcome = follow(game::apply_pointer_capture(menu, captured));
    controls.set_captured(world, captured);
    arrange();
    return outcome;
  }

  const engine::hud::Region* region(engine::hud::Id id) const {
    for (const engine::hud::Region& region : regions.items)
      if (region.control.id == id) return &region;
    return nullptr;
  }
  bool enabled(engine::hud::Id id) const { return region(id) && !region(id)->control.disabled; }
  bool disabled(engine::hud::Id id) const { return region(id) && region(id)->control.disabled; }

  /** 위젯의 한가운데를 눌렀다 뗀다. list 는 row 번째 줄을 누른다 */
  game::HudOutcome click(engine::hud::Id id, int row = -1) {
    const engine::hud::Region* target = region(id);
    if (!target) return {};
    const engine::hud::Rect rect = target->rect;
    const float y = row < 0 ? rect.y + rect.height / 2 : rect.y + (static_cast<float>(row) + 0.5f) * target->row_height;
    apply(ui.pointer_move(regions, rect.x + rect.width / 2, y));
    game::HudOutcome outcome = apply(ui.pointer_press(regions, *font));
    const game::HudOutcome released = apply(ui.pointer_release(regions));
    outcome.host |= released.host;
    if (released.focus) outcome.focus = released.focus;
    outcome.lobby.insert(outcome.lobby.end(), released.lobby.begin(), released.lobby.end());
    outcome.reload_assets = outcome.reload_assets || released.reload_assets;
    return outcome;
  }

  /** 화면의 그 자리를 눌렀다 뗀다 — 빈 곳이면 포커스가 풀리고, 그 화면이 포커스를 놓지 않는 화면이면 돌아온다 (app/client/main.cpp 의 pointer_press) */
  void press_at(float x, float y) {
    apply(ui.pointer_move(regions, x, y));
    apply(ui.pointer_press(regions, *font));
    if (!ui.ui().focus) ui.focus(game::resting_focus(menu));
    apply(ui.pointer_release(regions));
  }

  std::vector<engine::hud::Id> ids() const {
    std::vector<engine::hud::Id> ids;
    for (const engine::hud::Region& region : regions.items) ids.push_back(region.control.id);
    return ids;
  }
  bool shows(std::string_view content) const { return ::shows(state(), content); }
  bool shows_logo() const { return ::shows_logo(state()); }
};

bool only(const game::HudOutcome& outcome, LobbyRequest request) { return outcome.lobby == std::vector<LobbyRequest>{request}; }

/** 아직 행동이 들지 않은 다음 칸(반박, 20 틱마다)의 머리까지 나아간다 */
void next_slot(game::World& world) {
  do world.step();
  while (world.tick() % game::TICKS_PER_SLOT != 0);
}

void state_from_world() {
  using game::MapCell;
  game::World world(two_rooms(), kit);
  Menu menu;

  game::HudState state = game::select_hud_state(world, menu, {}, {});
  expect(state.health == 100 && state.ammo == 8 && state.reload_stage == 0 && state.multiplier == 1 && state.score == 0 && state.rooms_cleared == 0 && state.rooms_total == 1 &&
             state.outcome == game::World::Outcome::playing && state.backdrop == engine::hud::Picture{},
         "처음 상태: 체력 100, 탄 8, 배수 1, 0 점, 전투방 0/1, 배경 그림 없음");
  world.step();
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.beat == 0.0f && state.map.empty(), "메뉴에서는 박자도 미니맵도 상태에 없다 (메뉴가 프레임마다 다시 조립되지 않는다)");
  expect(game::select_hud_state(world, menu, {}, {}, {4, 1600, 900}).backdrop == engine::hud::Picture{4, 1600, 900}, "넘겨받은 배경 그림이 상태에 담긴다");
  expect(state.menu.screen == Screen::main && state.menu.item == MenuItem::solo && state.lobby.link == Lobby::Link::offline, "첫 화면은 메인 메뉴의 혼자 하기, 로비는 끊긴 상태");

  // 게임 중 — 90 BPM 은 한 박이 40 틱이다: 10 틱은 박의 1/4
  menu.screen = Screen::playing;
  for (int i = 0; i < 9; i++) world.step();
  state = game::select_hud_state(world, menu, {}, {});
  // 표식은 눈에 닿을 때의 자리로 그린다 — 두 틱 앞 (12 / 40)
  expect(state.beat == 0.3f, "게임 중에는 화면에 보일 때의 박 안에서의 위치가 상태에 있다 (10 틱 뒤, 두 틱 앞서 0.3)");
  expect(state.map == std::vector<MapCell>{{0, 0, MapCell::Kind::current, 1u << game::NORTH}, {0, -1, MapCell::Kind::known, 0}}, "미니맵: 지금 있는 시작 방과 그 문 너머의 안 가 본 방");
  expect(!state.on_beat && !state.off_beat && !state.timing && !state.hit && !state.hurt, "잠깐 보이는 표시는 아직 없다");
  expect(state.dash_ready == 1.0f && state.enemies_left == 0 && state.enemies_total == 0, "대시는 쓸 수 있고, 시작 방에는 적이 없다");
  // 틱 사이에서도 이어진다 — 틱에서 반 틱 지난 때는 12.5 / 40
  expect(game::select_hud_state(world, menu, {}, {}, {}, {}, 0.5f).beat == 0.3125f, "박자 표식의 위치는 틱 사이에서도 이어진다");

  // 칸 사이(10 틱)에 쏘면 미스다 — 나가지 않고, 미스의 표시가 12 틱 동안 상태에 있다
  expect(!world.act(game::Action::fire), "칸 사이의 발사는 나가지 않는다 (미스)");
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.miss == 0.0f && !state.off_beat && state.off_side == 0 && !state.on_beat && state.ammo == 8, "미스는 그 표시로 상태에 든다 — 탄은 그대로다");
  for (int i = 0; i < 6; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).miss == 0.5f, "6 틱 뒤에는 남은 시간의 절반이 지났다");
  for (int i = 0; i < 6; i++) world.step();
  expect(!game::select_hud_state(world, menu, {}, {}).miss, "12 틱 뒤에는 사라진다");
  // 26 틱 — 칸(20)의 머리에서 6 틱 늦었다: 나가되 어긋난 표시가 10 틱 동안 상태에 있다
  for (int i = 0; i < 4; i++) world.step();
  expect(world.act(game::Action::fire), "어긋난 발사는 나간다");
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.off_beat == 0.0f && state.off_side == 1 && !state.on_beat && !state.miss && state.ammo == 7, "어긋난 행동은 그 표시로 상태에 든다 — 늦었는지 일렀는지와 함께");
  for (int i = 0; i < 5; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).off_beat == 0.5f, "5 틱 뒤에는 남은 시간의 절반이 지났다");
  for (int i = 0; i < 5; i++) world.step();
  state = game::select_hud_state(world, menu, {}, {});
  expect(!state.off_beat && state.off_side == 0, "10 틱 뒤에는 사라진다");
  // 36 틱 — 그 칸(20)은 늦게 쏜 것이 썼다. 다음 칸의 머리(40)에서 쏘면 박에 맞은 번쩍임이 8 틱 동안 상태에 있다 (방에 적이 없어 배수는 쌓이지 않아도)
  next_slot(world);
  world.act(game::Action::fire);
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.on_beat == 0.0f && !state.off_beat && state.ammo == 6 && state.streak == 0, "박에 맞은 행동은 번쩍임으로 상태에 든다 — 빈 방에서도");
  for (int i = 0; i < 4; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).on_beat == 0.5f, "4 틱 뒤에는 번쩍임의 절반이 지났다");
  // 타이밍 표시는 처음부터 켜져 있다 (판정 보정을 얼마로 둘지 알려 주는 것이 이것뿐이다) — 옵션이 켜져 있을 때만 상태에 든다
  expect(Menu{}.options.timing && menu.options.timing, "타이밍 표시는 처음부터 켜져 있다");
  expect(game::select_hud_state(world, menu, {}, {}, {}, {}, 0.0f, game::Timing{23, -5}).timing == game::Timing{23, -5}, "켜져 있으면 판정이 잰 치우침이 상태에 든다");
  menu.options.timing = false;
  expect(!game::select_hud_state(world, menu, {}, {}, {}, {}, 0.0f, game::Timing{23, -5}).timing, "타이밍 표시 옵션이 꺼져 있으면 상태에 없다");
  next_slot(world);
  world.act(game::Action::reload);
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.ammo == 0 && state.reload_stage == 1 && !state.hit, "쏘고 탄창을 빼면 탄 0, 재장전 단계 1 (허공에 쏜 것은 맞힌 표시가 없다)");
  next_slot(world);
  world.act(game::Action::reload);

  // 북쪽 포털로 걸어 들어간다 — 넘는 동안 화면에 포털 빛이 번지고(24 틱, 12 틱째에 방이 바뀐다), 미니맵이 따라 바뀐다
  world.move(1.0f, 0.0f);
  for (int i = 0; i < 400 && !world.in_transit(); i++) world.step();
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.transit == 0.0f && state.map[0].kind == MapCell::Kind::current, "포털에 닿은 틱: 넘기의 진행도 0, 아직 앞 방이다");
  for (int i = 0; i < 12; i++) world.step();
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.transit == 0.5f && world.room() == 1, "12 틱 뒤: 진행도 0.5 — 이때 방이 바뀐다");
  for (int i = 0; i < 12; i++) world.step();
  expect(!game::select_hud_state(world, menu, {}, {}).transit, "24 틱 뒤에는 넘기가 끝나 상태에 없다");
  world.move(0.0f, 0.0f);
  // 적을 맞히면 맞힌 표시가, 맞으면 가장자리 띠가 든다
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.map == std::vector<MapCell>{{0, 0, MapCell::Kind::visited, 1u << game::NORTH}, {0, -1, MapCell::Kind::current, 1u << game::SOUTH}} && state.rooms_cleared == 0,
         "방에 들어서면 그 방이 지금 있는 방이 된다");
  expect(state.enemies_left == 1 && state.enemies_total == 1, "전투방에서는 남은 적 수와 처음 적 수가 상태에 든다 (돌진형 하나)");
  next_slot(world);
  const engine::Aabb body = game::enemy_box(world.enemies()[0]);
  const engine::Vec3 to = (body.min + body.max) * 0.5f - world.player().position;
  world.look(std::atan2(to.x, -to.z) - world.player().yaw, std::atan2(to.y, std::hypot(to.x, to.z)) - world.player().pitch);
  world.act(game::Action::fire);
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.hit == 0.0f && state.ammo == 7, "적을 맞힌 직후에는 맞힌 표시가 상태에 있다");
  for (int i = 0; i < 14; i++) world.step();
  expect(!game::select_hud_state(world, menu, {}, {}).hit, "14 틱 뒤에는 사라진다");
  for (int i = 0; i < 3000 && world.player().health == 100; i++) world.step();
  state = game::select_hud_state(world, menu, {}, {});
  expect(state.health == 75 && state.hurt == 0.0f && state.multiplier == 1, "돌진에 맞으면 체력 75, 가장자리 띠가 든다");
  for (int i = 0; i < 15; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).hurt == 0.5f, "15 틱 뒤에는 남은 시간의 절반이 지났다");
  menu.screen = Screen::paused;
  state = game::select_hud_state(world, menu, {}, {});
  expect(!state.hurt && state.map.empty() && state.beat == 0.0f && state.health == 75, "일시정지에는 박자·표시·미니맵이 상태에 없다 (수치는 남는다)");
}

/** 대시의 쿨다운 — 쓴 틱에 0, 반박 뒤에 절반, 다시 나갈 수 있는 칸의 머리(한 박 = 40 틱 뒤)에 가득 */
void dash_cooldown() {
  game::World world(two_rooms(), kit);
  Menu menu;
  menu.screen = Screen::playing;
  next_slot(world);
  expect(game::select_hud_state(world, menu, {}, {}).dash_ready == 1.0f, "대시를 쓰기 전에는 가득 차 있다");
  expect(world.act(game::Action::dash) && game::select_hud_state(world, menu, {}, {}).dash_ready == 0.0f, "칸의 머리에서 쓴 직후: 쿨다운 0");
  for (int i = 0; i < 10; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).dash_ready == 0.25f, "10 틱 뒤: 1/4");
  for (int i = 0; i < 10; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).dash_ready == 0.5f && !world.act(game::Action::dash), "다음 칸(반박 뒤)의 머리: 절반 — 아직 나가지 않는다");
  for (int i = 0; i < 19; i++) world.step();
  expect(game::select_hud_state(world, menu, {}, {}).dash_ready == 0.975f, "한 박에서 한 틱 모자란 때: 39/40");
  world.step();
  expect(game::select_hud_state(world, menu, {}, {}).dash_ready == 1.0f && world.act(game::Action::dash) && game::select_hud_state(world, menu, {}, {}).dash_ready == 0.0f,
         "한 박 뒤: 가득 — 다시 나가고, 쿨다운이 처음부터 다시 찬다");
  // 메뉴에서는 상태에 두지 않는다 (틱마다 달라지는 값이라 메뉴가 다시 조립된다)
  world.step();
  menu.screen = Screen::paused;
  expect(game::select_hud_state(world, menu, {}, {}).dash_ready == 1.0f, "일시정지에는 쿨다운이 상태에 없다");
}

/** 그 상태의 HUD(1920×1080)에서 이 자리·크기의 밝은(글자색) 사각형 수 — 그림자와 빈 바탕(어두운 것), 붉은 흙빛은 세지 않는다 */
int bright_bars(const game::HudState& state, float y, float width, float height) {
  int count = 0;
  for (const engine::hud::DrawItem& item : drawn(state, FULL))
    if (item.kind == engine::hud::DrawItem::Kind::rect && item.y == y && item.width == width && item.height == height && item.color.red > 0.9f && item.color.blue > 0.9f) count++;
  return count;
}

/**
 * 가장자리의 묶음들 — 1920×1080 (480×270 단위, 단위 4 픽셀)에서의 자리를 손으로 계산했다. 화면 가장자리에서 12 단위.
 *   체력(왼쪽 아래, 96×28 단위): x 12…108, y 230…258. 큰 숫자는 마름모 틀(22)과 5 단위를 띄운 묶음의 (27, 0) → (39, 230) 단위 = (156, 920) 픽셀, 크기 20 단위 = 80 픽셀.
 *     칸 넷은 숫자 밑(묶음에서 y 23 → 253 단위 = 1012 픽셀, 높이 5 단위 = 20 픽셀): 한 칸이 15 단위(60 픽셀, 그 가운데 2.5 단위 = 10 픽셀이 비껴 난 거리)이고 14 단위마다 놓인다 → x 156 + 56 i 픽셀
 *   탄(오른쪽 아래): x 372…468. 칸 여덟(8.5 단위, 7.5 단위마다 → 61 단위)은 틀과 5 단위를 띄운 묶음의 x 96 − 27 − 61 = 8 에서: x 380 + 7.5 i 단위 = 1520 + 30 i 픽셀, 폭 34, y 1012, 높이 20.
 *     숫자들의 오른쪽 끝은 x 468 − 27 = 441 단위 = 1764 픽셀
 *   배수·점수(오른쪽 위, 96×56): x 372…468, y 12…68. 글자의 오른쪽 끝은 2 단위 안쪽 x 466 단위 = 1864 픽셀. 배수는 y 12 단위 = 48 픽셀, 크기 26 단위 = 104 픽셀, 점수는 y 12 + 28 = 40 단위 = 160 픽셀, 크기 44 픽셀.
 *     다음 배수까지의 칸 열(5.5 단위, 5 단위마다 → 50.5 단위)은 x 372 + 96 − 2 − 50.5 = 415.5 단위에서: x 1662 + 20 i 픽셀, 22×12, y 12 + 43 = 55 단위 = 220 픽셀
 *   방 진행(위 가운데): 막대는 96 단위, 양 끝 마름모(8)의 한가운데에서 시작한다 → 묶음은 104 단위, x 188…292, y 12. 막대는 x 192 단위 = 768 픽셀, y 15 단위 = 60 픽셀, 384×8 픽셀. 마름모는 (752, 48)·(1136, 48) 의 32×32
 *   대시(아래 가운데): 마름모 틀 26 단위 = 104 픽셀, x 240 − 13 = 227 단위 = 908 픽셀
 */
void corners(game::HudState playing) {
  using Kind = engine::hud::DrawItem::Kind;
  using engine::hud::Shape;
  // 묶음은 여느 때 살짝 비친다 (불투명도 0.86) — 글자의 알파가 0.86 이다
  constexpr float REST = 0.86f;
  const auto find = [](const game::HudState& state, std::string_view content) {
    // 밝은 글자 (그림자는 어둡다)
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::text && item.content == content && item.color.red > 0.5f) return item;
    return engine::hud::DrawItem{Kind::rect, -1, -1, 0, 0, {}, {}, 0};
  };
  const auto rect = [](const game::HudState& state, float x, float y, float width, float height) -> std::optional<engine::hud::DrawItem> {
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.x == x && item.y == y && item.width == width && item.height == height) return item;
    return std::nullopt;
  };
  /** 그 높이(y)에 놓인 이 색(알파는 보지 않는다)의 사각형 수 */
  const auto tinted = [](const game::HudState& state, float y, engine::Color color) {
    int count = 0;
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.y == y && item.color.red == color.red && item.color.green == color.green && item.color.blue == color.blue) count++;
    return count;
  };
  const auto close = [](float a, float b) { return std::abs(a - b) < 0.01f; };
  constexpr engine::Color ALERT{1.0f, 0.66f, 0.56f}, MINT{0.62f, 0.97f, 0.87f}, GOLD{0.90f, 0.93f, 0.62f}, AMBER{1.0f, 0.80f, 0.45f};

  // 체력 75 — 큰 숫자와 작은 최대값, 세 칸이 찬 비스듬한 칸 넷
  engine::hud::DrawItem numeral = find(playing, "75");
  expect(numeral.x == 156 && numeral.y == 920 && numeral.size == 80 && numeral.face == 2 && close(numeral.color.alpha, REST), "체력의 큰 숫자는 왼쪽 아래에 있고, 여느 때에는 살짝 비친다");
  expect(find(playing, "/100").size == 36 && find(playing, "/100").x > numeral.x, "최대 체력은 큰 숫자 뒤에 작게 적는다");
  expect(bright_bars(playing, 1012, 60, 20) == 3 && rect(playing, 156, 1012, 60, 20) && rect(playing, 324, 1012, 60, 20), "체력 75: 네 칸 가운데 세 칸이 찬다");
  expect(rect(playing, 156, 1012, 60, 20)->shape == Shape::slant && rect(playing, 156, 1012, 60, 20)->shape_size == 10, "체력의 칸은 비스듬한 칸이다 (윗변이 2.5 단위 = 10 픽셀 오른쪽으로)");
  // 방금 25 를 잃었다 — 잃은 칸(넷째)에 붉은 흙빛 잔상이 남고, 묶음이 또렷해지며 왼쪽 아래 (48, 1032) 를 붙박고 6 % 커진다: 숫자는 (48 + 108 × 1.06, 1032 − 112 × 1.06), 크기 84.8
  game::HudState struck = playing;
  struck.motion.health_ghost = 100.0f;
  struck.motion.health_pulse = 1.0f;
  numeral = find(struck, "75");
  expect(close(numeral.x, 162.48f) && close(numeral.y, 913.28f) && close(numeral.size, 84.8f) && numeral.color.alpha == 1.0f, "방금 잃었으면 체력 묶음이 또렷해지고 살짝 커진다");
  struck.motion.health_pulse = 0.0f;
  expect(rect(struck, 324, 1012, 60, 20) && drawn(struck, FULL).size() == drawn(playing, FULL).size() + 1, "잃은 만큼은 잔상으로 남는다 (넷째 칸)");
  expect(tinted(struck, 1012, ALERT) == 1 && tinted(playing, 1012, ALERT) == 0, "잔상은 붉은 흙빛이다");
  // 잔상이 반쯤 줄었다 (87.5) — 넷째 칸이 채워지는 길이(12.5 단위)의 절반에 비껴 난 거리 2.5 를 더한 8.75 단위: x 81…89.75 단위 → 324…359 픽셀
  struck.motion.health_ghost = 87.5f;
  expect(rect(struck, 324, 1012, 35, 20).has_value(), "잔상은 지금 체력까지 줄어든다");
  // 바닥난 체력 (한 번 더 맞으면 죽는다) — 숫자와 칸이 붉은 흙빛이고 묶음이 늘 또렷하다
  game::HudState low = playing;
  low.health = 25;
  low.motion.health_ghost = 25.0f;
  numeral = find(low, "25");
  expect(numeral.x == 156 && numeral.color.alpha == 1.0f && numeral.color.green < 0.7f && bright_bars(low, 1012, 60, 20) == 0 && tinted(low, 1012, ALERT) == 1, "체력 25: 붉은 흙빛으로 늘 또렷하다");
  low.health = 50;
  low.motion.health_ghost = 50.0f;
  expect(close(find(low, "50").color.alpha, REST) && bright_bars(low, 1012, 60, 20) == 2, "체력 50 은 아직 여느 색이다");

  // 탄 5 — 비스듬한 칸 여덟 가운데 왼쪽 다섯이 찬다. 큰 숫자 5 와 작은 /8
  expect(bright_bars(playing, 1012, 34, 20) == 5 && rect(playing, 1520, 1012, 34, 20) && rect(playing, 1640, 1012, 34, 20) && rect(playing, 1730, 1012, 34, 20), "탄 5: 칸 여덟 가운데 다섯이 찬다");
  const engine::hud::DrawItem rounds = find(playing, "5"), magazine = find(playing, "/8");
  expect(rounds.size == 80 && rounds.face == 2 && magazine.size == 36 && rounds.x > 1640 && magazine.x > rounds.x && magazine.x + font->width("/8", 36, 2) <= 1764 + 1 && rounds.y == 920,
         "탄의 큰 숫자와 작은 탄창 크기는 오른쪽 아래에 있다 (오른쪽 끝이 마름모 틀 앞 x 1764)");
  for (uint32_t ammo = 0; ammo <= 8; ammo++) {
    playing.ammo = ammo;
    expect(bright_bars(playing, 1012, 34, 20) == static_cast<int>(ammo), "찬 칸 수는 남은 탄 수다");
  }
  // 재장전 단계의 표시 — 칸 위(묶음의 (8, 23 − 3.5 − 2) → (380, 247.5) 단위 = (1520, 990) 픽셀)의 작은 마름모 둘 (3.5 단위 = 14 픽셀)
  const auto pips = [](const game::HudState& state, Shape shape) {
    int count = 0;
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.shape == shape && item.y == 990 && item.width == 14 && item.height == 14 && item.color.red > 0.9f) count++;
    return count;
  };
  // 빈 탄창 — 칸이 모두 꺼지고 숫자가 붉은 흙빛, 단계 표시는 둘 다 빈 테다
  playing.ammo = 0;
  expect(find(playing, "0").color.green < 0.7f && bright_bars(playing, 1012, 34, 20) == 0 && tinted(playing, 1012, ALERT) == 0 && pips(playing, Shape::ring) == 2 && pips(playing, Shape::diamond) == 0,
         "빈 탄창: 칸이 모두 꺼지고 숫자가 붉은 흙빛, 재장전 단계 표시가 나온다");
  playing.ammo = 3;
  expect(pips(playing, Shape::ring) == 0 && pips(playing, Shape::diamond) == 0 && find(playing, "3").color.green > 0.9f, "탄이 있으면 재장전 단계 표시가 없다");
  // 탄창을 뺐다 (1 단계) — 칸이 모두 옅은 붉은 흙빛이 되고, 단계 표시의 첫째가 찬다
  playing.ammo = 0;
  playing.reload_stage = 1;
  expect(bright_bars(playing, 1012, 34, 20) == 0 && tinted(playing, 1012, ALERT) == 8 && rect(playing, 1520, 1012, 34, 20)->color.alpha < 0.5f && pips(playing, Shape::diamond) == 1 &&
             pips(playing, Shape::ring) == 1,
         "탄창을 빼면 칸이 모두 옅은 붉은 흙빛이 되고 단계 표시의 첫째가 찬다");
  // 끼웠다 — 모두 찬다
  playing.ammo = 8;
  playing.reload_stage = 0;
  expect(bright_bars(playing, 1012, 34, 20) == 8 && tinted(playing, 1012, ALERT) == 0 && pips(playing, Shape::diamond) == 0, "탄창을 끼우면 칸이 모두 찬다");
  playing.ammo = 5;

  // 배수 2, 이어 간 행동 13 — 아주 큰 청록 배수, 그 밑에 점수, 다음 배수까지의 칸 열 가운데 셋이 찬다 (다음 배수 x3 의 연한 금빛)
  numeral = find(playing, "x2");
  expect(numeral.y == 48 && numeral.size == 104 && numeral.face == 2 && std::abs(numeral.x + font->width("x2", 104, 2) - 1864) <= 1 && numeral.color.green > 0.9f && numeral.color.red < 0.7f,
         "배수는 오른쪽 위에 아주 크게, 오른쪽 끝에 맞춰 놓인다 (x2 는 청록)");
  const engine::hud::DrawItem score = find(playing, "250");
  expect(score.y == 160 && score.size == 44 && std::abs(score.x + font->width("250", 44, 2) - 1864) <= 1, "점수는 배수 밑에 있다");
  expect(tinted(playing, 220, GOLD) == 3 && rect(playing, 1662, 220, 22, 12) && rect(playing, 1842, 220, 22, 12) && rect(playing, 1662, 220, 22, 12)->shape == Shape::slant,
         "다음 배수까지의 칸 (13 번 → 셋)");
  playing.multiplier = 4;
  playing.streak = 47;
  expect(tinted(playing, 220, AMBER) == 10 && find(playing, "x4").color.blue < 0.5f && find(playing, "x4").color.red == 1.0f && find(playing, "x4").color.green >= 0.8f,
         "가장 높은 배수에서는 칸이 다 차고, 배수는 바랜 호박색이다 (붉지 않다)");
  playing.multiplier = 1;
  playing.streak = 0;
  expect(tinted(playing, 220, MINT) == 0 && find(playing, "x1").color.blue > 0.9f, "배수 1 은 여느 글자색이고 칸은 비어 있다");
  playing.multiplier = 2;
  playing.streak = 13;
  // 배수가 올랐다 — 오른쪽 위 (1872, 48) 을 붙박고 12 % 커진다: 글자의 위는 그대로, 오른쪽 끝에서의 거리와 크기가 1.12 배
  game::HudState risen = playing;
  risen.motion.multiplier_pulse = 1.0f;
  const engine::hud::DrawItem popped = find(risen, "x2");
  expect(close(popped.y, 48.0f) && close(popped.size, 116.48f) && close(1872.0f - popped.x, (1872.0f - numeral.x) * 1.12f) && popped.color.alpha == 1.0f, "배수가 오르면 그 묶음이 튄다");

  // 방 진행 — 층의 진행: 비운 전투방 1/3 → 막대의 1/3 (128 픽셀)이 청록으로 찬다. 양 끝은 마름모
  const auto progress = [&](const game::HudState& state) {
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.x == 768 && item.y == 60 && item.height == 8 && item.color.green > 0.7f) return item;
    return engine::hud::DrawItem{Kind::rect, -1, -1, 0, 0, {}, {}, 0};
  };
  expect(rect(playing, 768, 60, 384, 8) && progress(playing).width == 128 && progress(playing).color.red == MINT.red && rect(playing, 752, 48, 32, 32)->shape == Shape::diamond &&
             rect(playing, 1136, 48, 32, 32)->shape == Shape::diamond,
         "방 진행: 양 끝이 마름모인 얇은 막대가 비운 방만큼 찬다");
  // 전투 중 — 남은 적 3/4 → 막대의 3/4 (288 픽셀)이 호박색, 글은 남은 적 수
  game::HudState fight = playing;
  fight.enemies_left = 3;
  fight.enemies_total = 4;
  expect(progress(fight).width == 288 && progress(fight).color.green == AMBER.green && progress(fight).color.red == 1.0f && find(fight, "적 3").x > 0 && find(fight, "방 1/3").x < 0,
         "전투 중에는 막대가 이 방에 남은 적을 보인다");
  fight.enemies_left = 1;
  expect(progress(fight).width == 96 && find(fight, "적 1").x > 0, "적을 잡을수록 막대가 줄어든다");
  fight.rooms_cleared = 0;
  fight.enemies_left = 0;
  fight.enemies_total = 0;
  expect(progress(fight).x < 0 && rect(fight, 768, 60, 384, 8) && find(fight, "방 0/3").x > 0, "비운 방이 없으면 막대는 빈 바탕뿐이다");

  // 대시 — 아래 가운데의 마름모 틀 (x 908, 104 픽셀). 쓸 수 있으면 틀이 또렷하고 속이 비어 있다
  const auto slot = [](const game::HudState& state, Shape shape) {
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.shape == shape && item.x == 908 && item.width == 104 && item.height == 104) return item;
    return engine::hud::DrawItem{Kind::rect, -1, -1, 0, 0, {}, {}, 0};
  };
  /** 틀 속에서 차오르는 청록 마름모 */
  const auto charge = [&](const game::HudState& state) {
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.shape == Shape::diamond && item.color.red == MINT.red && item.color.green == MINT.green) return item;
    return engine::hud::DrawItem{Kind::rect, -1, -1, 0, 0, {}, {}, 0};
  };
  const auto glyphs = [](const game::HudState& state) {
    int count = 0;
    // 겹꺾쇠 — 4×8 단위 = 16×32 픽셀의 오른쪽 꺾쇠 둘
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.shape == Shape::chevron_right && item.width == 16 && item.height == 32 && item.y > 800) count++;
    return count;
  };
  expect(close(slot(playing, Shape::ring).color.alpha, REST) && slot(playing, Shape::ring).shape_size == 3 && charge(playing).x < 0 && glyphs(playing) == 2 && find(playing, "SHIFT").x > 0,
         "대시: 마름모 틀 안의 겹꺾쇠와 그 밑의 글쇠 — 쓸 수 있으면 또렷하다");
  // 쿨다운의 절반 — 틀과 겹꺾쇠가 옅고(0.45 × 0.86), 속의 청록 마름모가 절반 크기(13 단위 = 52 픽셀, 가운데 x 960)다
  game::HudState cooling = playing;
  cooling.dash_ready = 0.5f;
  expect(close(slot(cooling, Shape::ring).color.alpha, 0.45f * REST) && charge(cooling).x == 934 && charge(cooling).width == 52 && charge(cooling).height == 52 && glyphs(cooling) == 2,
         "쿨다운 중에는 틀이 옅고 속에서 마름모가 차오른다");
  cooling.dash_ready = 0.0f;
  expect(charge(cooling).x < 0 && close(slot(cooling, Shape::ring).color.alpha, 0.45f * REST), "쓴 직후에는 속이 비어 있다");
  cooling.dash_ready = 0.75f;
  expect(charge(cooling).width == 78, "차오르는 크기는 쿨다운의 진행만큼이다");

  // 밀림 — 가장자리의 묶음들은 밀리고, 조준점과 박자 표식은 그대로다. 가장 크게(오른쪽 6·위 6 단위) 밀리고 가장 크게(4 단위) 벌어지면:
  //   체력(왼쪽 아래, 깊이 1): x 12 + 6 − 4 = 14, 아래에서 12 + 6 − 4 = 14 → 숫자는 (41, 270 − 14 − 28 = 228) 단위 = (164, 912) 픽셀
  //   탄(오른쪽 아래, 깊이 1.1): 오른쪽에서 12 − 6.6 − 4 = 1.4 → 첫 칸은 x 480 − 1.4 − 96 + 8 = 390.6 단위 = 1562 픽셀 (1562.4),
  //     아래에서 12 + 6.6 − 4 = 14.6 → y 270 − 14.6 − 28 + 23 = 250.4 단위 = 1002 픽셀 (1001.6)
  game::HudState shoved = playing;
  shoved.motion.shove_x = game::HUD_SHOVE_MAX;
  shoved.motion.shove_y = -game::HUD_SHOVE_MAX;
  shoved.motion.spread = game::HUD_SPREAD_MAX;
  numeral = find(shoved, "75");
  expect(numeral.x == 164 && numeral.y == 912 && rect(shoved, 1562, 1002, 34, 20).has_value(), "묶음은 밀린 만큼 옮겨진다");
  // 위·아래 가운데의 묶음은 좌우로 벌어지지 않는다 — 방 진행(깊이 0.5)은 오른쪽으로 3 단위(768 → 780), 위로 3 + 4 = 7 단위(15 − 7 = 8 단위 = 32 픽셀)
  expect(rect(shoved, 780, 32, 384, 8).has_value() && slot(shoved, Shape::ring).x < 0, "가운데의 묶음(방 진행·대시)도 밀린다");
  const engine::hud::DrawList still = drawn(playing, FULL), moved = drawn(shoved, FULL);
  bool centre = still.size() == moved.size();
  int centred = 0;
  for (std::size_t i = 0; centre && i < still.size(); i++) {
    // 화면 가운데(조준점 960, 540)의 둘레 — 조준점(마름모의 두 꺾쇠와 점, 저마다 그림자와 속)과 박자 표식의 꺾쇠들
    if (std::abs(still[i].y - 540.0f) > 70.0f || still[i].x < 400.0f || still[i].x > 1500.0f) continue;
    centred++;
    centre = still[i].x == moved[i].x && still[i].y == moved[i].y && still[i].width == moved[i].width && still[i].shape == moved[i].shape;
  }
  expect(centre && centred >= 20, "조준점과 박자 표식은 밀리지 않는다");
  // 가장 크게 밀려도(네 대각선 쪽으로, 벌어지거나 모이거나) 묶음의 글자는 화면(1920×1080) 밖으로 나가지 않는다 — 여백 12 단위가 밀림의 가장 큰 양(탄: 6 × 1.1 + 4 = 10.6 단위)보다 크다
  bool inside = true;
  for (const float x : {-1.0f, 1.0f}) {
    for (const float y : {-1.0f, 1.0f}) {
      for (const float spread : {-1.0f, 1.0f}) {
        shoved.motion.shove_x = x * game::HUD_SHOVE_MAX;
        shoved.motion.shove_y = y * game::HUD_SHOVE_MAX;
        shoved.motion.spread = spread * game::HUD_SPREAD_MAX;
        for (const char* content : {"75", "/100", "5", "/8", "x2", "250", "연속 13", "방 1/3", "SHIFT"}) {
          const engine::hud::DrawItem item = find(shoved, content);
          inside = inside && item.x >= 0 && item.y >= 0 && item.x + font->width(content, item.size, item.face) <= 1920 && item.y + font->line_height(item.size, item.face) <= 1080;
        }
      }
    }
  }
  expect(inside, "가장 크게 밀려도 묶음의 글자는 화면 안에 있다");
}

/** 움직임의 연출 — 걸음의 흔들림, 착지, 대시, 화면 흔들림 옵션, HUD 의 밀림과 강조. 세계를 한 틱씩 돌리며 같이 나아간다 */
void motion() {
  game::World world(two_rooms(), kit);
  game::Motion feel;
  feel.reset(world);
  const auto steps = [&](int count) {
    for (int i = 0; i < count; i++) {
      world.step();
      feel.step(world);
    }
  };
  game::ViewMotion view = feel.view(1.0f);
  expect(view.bob_x == 0.0f && view.bob_y == 0.0f && view.dip == 0.0f && view.roll == 0.0f && view.fov == 0.0f && view.weapon.x == 0.0f && view.weapon.y == 0.0f && view.eye.y == world.player().position.y,
         "처음에는 흔들림이 없다");
  // 방 가운데 위에서 떨어져 선다 (시작 방의 바닥 — 1.2 m 를 떨어져 19 틱째에 초당 7.6 m 로). 눈이 눌렸다 돌아온다
  float deepest = 0.0f;
  for (int i = 0; i < 60; i++) {
    steps(1);
    deepest = std::min(deepest, feel.view(1.0f).dip);
  }
  const float first_landing = world.landing_speed();
  expect(world.grounded() && first_landing > 7.5f && first_landing < 7.7f && deepest < -0.035f && deepest > -0.065f, "내려서면 눈이 4…6 cm 눌린다");
  steps(120);
  view = feel.view(1.0f);
  expect(std::abs(view.dip) < 5e-4f && view.bob_x == 0.0f && view.bob_y == 0.0f && std::abs(view.roll) < 1e-5f, "가만히 서 있으면 흔들림이 가라앉아 없다");
  const game::HudMotion resting = feel.hud();
  expect(std::abs(resting.shove_x) < 1e-3f && std::abs(resting.shove_y) < 0.02f && std::abs(resting.spread) < 1e-3f && resting.health_pulse == 0.0f && resting.ammo_pulse == 0.0f, "HUD 도 제자리에 있다");

  // 옆으로 걷는다 (돌단 위에서 오른쪽으로 0.9 m — 돌단을 벗어나지 않는다): 걸음의 흔들림은 좌우 2 cm·위아래 2.8 cm 안, 오른쪽으로 기울고, HUD 는 왼쪽으로 밀린다
  world.move(0.0f, 1.0f);
  float side = 0.0f, lift = 0.0f, roll = 0.0f, shove = 0.0f;
  for (int i = 0; i < 12; i++) {
    steps(1);
    view = feel.view(1.0f);
    side = std::max(side, std::abs(view.bob_x));
    lift = std::max(lift, std::abs(view.bob_y));
    roll = std::max(roll, view.roll);
    shove = std::min(shove, feel.hud().shove_x);
  }
  expect(world.grounded() && side > 0.004f && side <= 0.0121f && lift > 0.006f && lift <= 0.0181f, "걸으면 눈이 흔들린다 — 좌우 1.2 cm, 위아래 1.8 cm 안에서");
  expect(roll > 0.003f && roll <= 0.0101f && shove < -0.5f && shove >= -game::HUD_SHOVE_MAX, "오른쪽으로 걸으면 오른쪽으로 살짝 기울고(0.6 도 안), HUD 는 왼쪽으로 밀린다");
  // 조준 방향은 흔들리지 않는다 — 눈의 자리만 몇 cm 움직인다
  {
    Menu menu;
    const game::Camera steady = game::scene_camera(menu, world, 1.0f), shaken = game::scene_camera(menu, world, 1.0f, view);
    const engine::Vec3 aim = engine::forward_from(world.player().yaw, world.player().pitch), apart = shaken.eye - steady.eye;
    expect(shaken.forward.x == aim.x && shaken.forward.y == aim.y && shaken.forward.z == aim.z && steady.forward.x == aim.x, "흔들려도 눈이 보는 쪽은 세계의 조준 방향 그대로다");
    expect(engine::dot(apart, apart) > 0.0f && engine::dot(apart, apart) < 0.05f * 0.05f && std::abs(engine::dot(apart, aim)) < 1e-6f, "눈은 보는 쪽에 수직으로 5 cm 안에서만 움직인다");
    // 화면 흔들림을 끄면 흔들림이 없다 — 눈은 세계의 눈 그대로
    const game::ViewMotion off = feel.view(1.0f, false);
    const game::Camera calm = game::scene_camera(menu, world, 1.0f, off);
    expect(off.bob_x == 0.0f && off.bob_y == 0.0f && off.dip == 0.0f && off.roll == 0.0f && off.fov == 0.0f && calm.eye.x == steady.eye.x && calm.eye.y == steady.eye.y && calm.eye.z == steady.eye.z &&
               calm.view_proj.m == steady.view_proj.m,
           "화면 흔들림을 끄면 시점이 흔들리지 않는다");
    const game::HudMotion still = feel.hud(false);
    expect(still.shove_x == 0.0f && still.shove_y == 0.0f && still.spread == 0.0f && feel.hud().shove_x != 0.0f, "화면 흔들림을 끄면 HUD 도 밀리지 않는다");
    // 틱 사이 — 눈은 지난 틱의 자리와 이번 틱의 자리를 잇는다 (오른쪽으로 걷는 중이라 x 가 그 사이에 있다)
    const game::ViewMotion half = feel.view(0.5f, false), start = feel.view(0.0f, false);
    expect(start.eye.x < half.eye.x && half.eye.x < off.eye.x && std::abs(half.eye.x - (start.eye.x + off.eye.x) * 0.5f) < 1e-6f && off.eye.x == world.player().position.x,
           "틱 사이에서는 눈의 자리를 잇는다");
  }
  // 멈춘다 — 10 틱에 서고, 그 뒤 30 틱이면 흔들림이 1 mm 밑으로 가라앉는다
  world.move(0.0f, 0.0f);
  steps(40);
  view = feel.view(1.0f);
  expect(std::abs(view.bob_x) < 1e-3f && std::abs(view.bob_y) < 1e-3f && std::abs(view.roll) < 1e-3f && std::abs(feel.hud().shove_x) < 0.01f, "멈추면 40 틱 안에 가라앉는다");

  // 뛴다 — 뛰어오를 때 살짝 들리고, 내려서면(초당 7.6(8.0) m) 눌린다: 눌리는 깊이는 내려선 빠르기에 비례한다 (처음 내려섰을 때와 견준다)
  world.jump();
  float lifted = 0.0f, pressed = 0.0f, hud_down = 0.0f;
  for (int i = 0; i < 70; i++) {
    steps(1);
    const float dip = feel.view(1.0f).dip;
    if (!world.grounded()) lifted = std::max(lifted, dip);
    else pressed = std::min(pressed, dip);
    hud_down = std::max(hud_down, feel.hud().shove_y);
  }
  expect(lifted > 0.005f && lifted < 0.03f && world.landing_speed() > 7.5f, "뛰어오를 때 눈이 살짝 들린다");
  expect(std::abs(pressed / deepest - world.landing_speed() / first_landing) < 0.08f, "내려설 때 눌리는 깊이는 내려선 빠르기에 비례한다");
  expect(hud_down > 1.0f && hud_down <= game::HUD_SHOVE_MAX, "내려서면 HUD 가 아래로 밀렸다 돌아온다");

  // 대시 — 앞으로: 시야각이 잠깐 넓어지고(16 도 안) HUD 가 벌어진다. 화면 흔들림을 끄면 없다
  while (world.tick() % game::TICKS_PER_SLOT != 0) steps(1);
  expect(world.act(game::Action::dash), "칸의 머리에서 대시");
  float widest = 0.0f, spread = 0.0f;
  for (int i = 0; i < 18; i++) {
    steps(1);
    widest = std::max(widest, feel.view(1.0f).fov);
    if (i == 0) expect(feel.view(1.0f).fov < 4.0f, "대시의 첫 틱에는 시야각이 4 도 안으로 넓어진다 (한 틱에 다 벌어지지 않는다)");
    spread = std::max(spread, feel.hud().spread);
    expect(feel.view(1.0f, false).fov == 0.0f, "화면 흔들림을 끄면 대시에도 시야각이 그대로다");
  }
  expect(widest > 8.0f && widest <= 16.0f && spread > 0.3f && spread <= game::HUD_SPREAD_MAX, "앞 대시: 시야각이 넓어지고 HUD 가 벌어진다");
  steps(90);
  expect(std::abs(feel.view(1.0f).fov) < 0.01f && std::abs(feel.hud().spread) < 0.01f, "대시의 여운은 걷힌다");

  // 온갖 움직임을 섞어도 HUD 의 밀림은 상한 안이다 — 옆 대시, 시선 돌리기, 뛰기
  float longest = 0.0f, widest_spread = 0.0f;
  for (int i = 0; i < 400; i++) {
    if (i % 40 == 0) world.move(i % 80 == 0 ? 1.0f : -1.0f, i % 120 == 0 ? 1.0f : -1.0f);
    if (world.tick() % game::TICKS_PER_SLOT == 0) world.act(game::Action::dash);
    if (i % 55 == 0) world.jump();
    world.look(i % 30 < 15 ? 0.15f : -0.15f, i % 20 < 10 ? 0.05f : -0.05f);
    steps(1);
    const game::HudMotion hud = feel.hud();
    longest = std::max(longest, std::hypot(hud.shove_x, hud.shove_y));
    widest_spread = std::max(widest_spread, std::abs(hud.spread));
  }
  expect(longest > 1.0f && longest <= game::HUD_SHOVE_MAX + 1e-4f && widest_spread <= game::HUD_SPREAD_MAX, "HUD 의 밀림은 상한(1.8 단위, 벌어짐 0.9)을 넘지 않는다");

  // 값이 바뀐 요소의 강조 — 쏜 틱에 1, 6 틱 뒤 0.5, 12 틱 뒤 0
  game::World range(two_rooms(), kit);
  feel.reset(range);
  const auto run = [&](int count) {
    for (int i = 0; i < count; i++) {
      range.step();
      feel.step(range);
    }
  };
  run(60);
  expect(range.act(game::Action::fire) && feel.hud().ammo_pulse == 0.0f, "쏘았다 (강조는 다음 틱부터)");
  run(1);
  expect(feel.hud().ammo_pulse == 1.0f && feel.hud().health_pulse == 0.0f, "탄이 줄면 탄 묶음이 강조된다");
  run(6);
  expect(feel.hud().ammo_pulse == 0.5f, "6 틱 뒤에는 절반");
  run(6);
  expect(feel.hud().ammo_pulse == 0.0f, "12 틱(0.2 초) 뒤에는 여느 때로 돌아온다");
  // 재장전의 단계도 강조한다
  next_slot(range);
  range.act(game::Action::reload);
  run(1);
  expect(feel.hud().ammo_pulse == 1.0f, "탄창을 빼면 탄 묶음이 강조된다");
  // 탄 없이 방아쇠를 당기면(빈 방아쇠) 탄은 그대로지만 탄 묶음이 강조된다 — '탄 없음'이 글자 없이 보인다
  run(12);
  expect(feel.hud().ammo_pulse == 0.0f && !range.act(game::Action::fire) && range.pistol().ammo == 0 && range.pistol().reload_stage == 1, "탄창을 빼 둔 동안의 발사는 나가지 않는다");
  run(1);
  expect(feel.hud().ammo_pulse == 1.0f, "빈 방아쇠에 탄 묶음이 강조된다");
  // 맞는다 — 북쪽 방에서 돌진형에 맞을 때까지. 체력 묶음이 강조되고, 잔상은 잃기 전의 값(100)에 15 틱 머물다 15 틱에 걸쳐 75 로 줄어든다
  range.move(1.0f, 0.0f);
  for (int i = 0; i < 400 && range.room() == 0; i++) run(1);
  range.move(0.0f, 0.0f);
  for (int i = 0; i < 3000 && range.player().health == 100; i++) run(1);
  expect(range.player().health == 75 && feel.hud().health_pulse == 1.0f && feel.hud().health_ghost == 100.0f, "맞으면 체력 묶음이 강조되고 잔상이 잃기 전의 값에 남는다");
  run(15);
  expect(feel.hud().health_ghost == 100.0f && feel.hud().health_pulse == 0.0f, "잔상은 15 틱 머문다 (강조는 12 틱에 걷힌다)");
  run(6);
  expect(std::abs(feel.hud().health_ghost - 90.0f) < 0.01f, "그 뒤 틱마다 25/15 씩 줄어든다 — 6 틱에 10");
  run(9);
  expect(std::abs(feel.hud().health_ghost - 75.0f) < 0.01f, "15 틱에 지금 체력까지 줄어든다");
  run(5);
  expect(feel.hud().health_ghost == 75.0f, "그 밑으로는 내려가지 않는다");
  // 미스 — 연속 수를 잃으면 배수 묶음이 강조된다 (내려간 것이 보인다): 적이 있는 방에서 정박 하나(R — 탄창 끼우기)로 연속 수 1, 그 뒤 칸 사이(10 틱)의 발사는 미스라 0
  while (range.tick() % game::TICKS_PER_SLOT != 0) run(1);
  expect(range.locked() && range.act(game::Action::reload) && range.streak() == 1 && range.pistol().ammo == 8, "칸의 머리에서 탄창을 끼웠다 — 연속 수 1");
  run(10);
  expect(feel.hud().multiplier_pulse == 0.0f && !range.act(game::Action::fire) && range.streak() == 0 && range.pistol().ammo == 8 && range.player().health == 75,
         "칸 사이의 발사는 미스다 — 나가지 않고 연속 수를 잃는다 (배수가 오른 것이 아니라 아직 강조는 없다)");
  run(1);
  expect(feel.hud().multiplier_pulse == 1.0f, "미스로 연속 수를 잃으면 배수 묶음이 강조된다");
  run(12);
  expect(feel.hud().multiplier_pulse == 0.0f, "12 틱 뒤에는 여느 때로 돌아온다");

  // 발사의 반동과 대시의 가장자리 빛 — 새 판에서, 내려서서 가라앉은 뒤에
  {
    game::World shooting(two_rooms(), kit);
    feel.reset(shooting);
    const auto go = [&](int count) {
      for (int i = 0; i < count; i++) {
        shooting.step();
        feel.step(shooting);
      }
    };
    const auto about = [](float value, float expected) { return std::abs(value - expected) < 1e-5f; };
    go(240);
    while (shooting.tick() % game::TICKS_PER_SLOT != 0) go(1);
    const float yaw = shooting.player().yaw, pitch = shooting.player().pitch;
    const float settled = feel.hud().shove_y;
    Menu menu;
    expect(feel.view(1.0f).kick == 0.0f && std::abs(feel.view(1.0f).roll) < 1e-5f && std::abs(settled) < 0.01f, "쏘기 전: 시점의 반동이 없다");
    // 쏜 다음 틱에 가장 크다 — 0.04 rad(2.3 도) 들리고 0.012 rad 기운다. 그리는 눈만 들린다: 세계의 조준 방향은 그대로
    expect(shooting.act(game::Action::fire), "한 발");
    go(1);
    game::ViewMotion kicked = feel.view(1.0f);
    expect(kicked.kick == 0.008f && about(std::abs(kicked.roll), 0.003f) && about(feel.view(0.5f).kick, 0.004f), "쏜 다음 틱: 시점이 0.008 rad 들린다 (틱 사이에서는 이어진다)");
    expect(shooting.player().yaw == yaw && shooting.player().pitch == pitch, "세계의 조준 방향은 반동에 움직이지 않는다");
    const game::Camera steady = game::scene_camera(menu, shooting, 1.0f), punched = game::scene_camera(menu, shooting, 1.0f, kicked);
    const engine::Vec3 aim = engine::forward_from(yaw, pitch), raised = engine::forward_from(yaw, pitch + 0.008f);
    expect(steady.forward.y == aim.y && punched.forward.y == raised.y && punched.forward.y > steady.forward.y, "그리는 눈만 0.04 rad 위를 본다");
    const game::ViewMotion calm = feel.view(1.0f, false);
    expect(calm.kick == 0.0f && calm.roll == 0.0f && game::scene_camera(menu, shooting, 1.0f, calm).view_proj.m == steady.view_proj.m, "화면 흔들림을 끄면 시점의 반동이 없다");
    // 돌아오는 길 — 1 → 9 틱에서 ((9 − t) / 8)²: 5 틱째에 1/4, 9 틱째에 0
    float jolt = 0.0f;
    for (int i = 0; i < 4; i++) {
      go(1);
      jolt = std::max(jolt, feel.hud().shove_y - settled);
    }
    expect(about(feel.view(1.0f).kick, 0.002f), "5 틱째: 1/4 만큼 남았다");
    expect(jolt > 0.9f && jolt <= game::HUD_SHOVE_MAX && feel.hud(false).shove_y == 0.0f, "쏘면 HUD 가 아래로 한 단위 반쯤 튄다 (화면 흔들림을 끄면 없다)");
    go(4);
    expect(feel.view(1.0f).kick == 0.0f && std::abs(feel.view(1.0f).roll) < 1e-5f, "9 틱째: 시점의 반동이 다 돌아왔다");
    // 칸마다 이어 쏴도 쏘는 순간에는 늘 제자리이고, 세계의 조준은 올라가지 않는다
    bool level = true;
    for (int shot = 0; shot < 4; shot++) {
      while (shooting.tick() % game::TICKS_PER_SLOT != 0) go(1);
      level = level && feel.view(1.0f).kick == 0.0f && shooting.act(game::Action::fire);
      go(1);
      level = level && feel.view(1.0f).kick == 0.008f;
    }
    expect(level && shooting.player().yaw == yaw && shooting.player().pitch == pitch, "이어 쏴도 쏘는 순간의 시점은 제자리이고 조준은 그대로다");

    // 대시의 가장자리 빛 — 대시 중에만: 두 틱에 차고(0.5, 1), 대시가 끝난 틱(8 틱째)부터 한 단계(1/6)씩 걷혀 13 틱째에 0
    while (shooting.tick() % game::TICKS_PER_SLOT != 0) go(1);
    expect(feel.hud().rush == 0.0f && feel.hud().rush_age == 0.0f, "대시 전에는 가장자리 빛이 없다");
    expect(shooting.act(game::Action::dash), "대시");
    go(1);
    expect(shooting.dashing() && feel.hud().rush == 0.5f && feel.hud().rush_age == 1.0f && feel.hud(false).rush == 0.0f && feel.hud(false).rush_age == 0.0f,
           "대시의 첫 틱: 빛이 반쯤 찼다 (화면 흔들림을 끄면 없다)");
    bool full = true;
    for (int i = 2; i <= 7; i++) {
      go(1);
      full = full && shooting.dashing() && feel.hud().rush == 1.0f;
    }
    expect(full && feel.hud().rush_age == 7.0f, "2 … 7 틱째: 대시 중에는 가득 차 있다");
    go(1);
    expect(!shooting.dashing() && about(feel.hud().rush, 5.0f / 6.0f), "8 틱째: 대시가 끝나 걷히기 시작한다");
    go(4);
    expect(about(feel.hud().rush, 1.0f / 6.0f), "12 틱째: 한 단계 남았다");
    go(1);
    expect(feel.hud().rush == 0.0f && feel.hud().rush_age == 0.0f, "13 틱째: 다 걷혔다");
    go(60);
    expect(feel.hud().rush == 0.0f, "그 뒤로는 없다");
  }

  // 상태에 실린다 — 게임 중에만 (메뉴는 프레임마다 다시 조립되지 않는다)
  Menu menu;
  game::HudMotion pushed;
  pushed.shove_x = 1.0f;
  expect(game::select_hud_state(range, menu, {}, {}, {}, pushed).motion == game::HudMotion{}, "메뉴에서는 HUD 의 움직임이 상태에 없다");
  menu.screen = Screen::playing;
  expect(game::select_hud_state(range, menu, {}, {}, {}, pushed).motion == pushed && game::select_hud_state(range, menu, {}, {}).streak == range.streak(), "게임 중에는 상태에 실린다");
}

void game_screen() {
  using game::MapCell;
  using Kind = engine::hud::DrawItem::Kind;
  using engine::hud::Shape;
  game::HudState playing{};
  playing.health = 75;
  playing.ammo = 5;
  playing.multiplier = 2;
  playing.score = 250;
  playing.rooms_cleared = 1;
  playing.rooms_total = 3;
  playing.beat = 0.5f;
  playing.menu.screen = Screen::playing;
  playing.map = {{0, 0, MapCell::Kind::visited, 1u << game::NORTH}, {0, -1, MapCell::Kind::current, (1u << game::SOUTH) | (1u << game::EAST)}, {1, -1, MapCell::Kind::known, 0}};
  playing.streak = 13;
  playing.motion.health_ghost = 75.0f;
  expect(shows(playing, "75") && shows(playing, "/100") && shows(playing, "5") && shows(playing, "/8") && shows(playing, "x2") && shows(playing, "250") && shows(playing, "연속 13") &&
             shows(playing, "방 1/3") && shows(playing, "SHIFT"),
         "게임 중에는 체력·탄(큰 값과 작은 최대값), 배수·점수·연속 수, 방 진행, 대시의 글쇠가 보인다");
  expect(!shows(playing, "체력") && !shows(playing, "탄") && !shows(playing, "배수") && !shows(playing, "점수"), "값의 이름표는 없다 — 자리와 모양(마름모 틀의 표시)으로 읽힌다");
  expect(!shows_logo(playing) && !shows(playing, "시작") && !shows(playing, "일시정지"), "게임 중에는 메뉴가 없다");
  expect(!shows(playing, "완벽") && !shows(playing, "좋음") && !shows(playing, "놓침") && !shows(playing, "콤보") && !shows(playing, "명중") && !shows(playing, "과녁 없음") && all_baked(playing),
         "판정·발사 결과를 풀어 쓴 글자는 없고, 글자는 모두 글꼴에 있다");
  {
    game::HudState fight = playing;
    fight.enemies_left = 3;
    fight.enemies_total = 4;
    fight.multiplier = 4;
    fight.streak = 78;
    expect(shows(fight, "적 3") && shows(fight, "x4") && shows(fight, "연속 78") && all_baked(fight), "전투 중의 글자(남은 적 수)도 모두 글꼴에 있다");
  }
  // 가운데 — 1920×1080 (단위 4 픽셀, 조준점 960, 540)에서의 자리를 손으로 계산했다
  /** 밝은(그림자가 아닌) 이 도형의 사각형들 */
  const auto shapes = [](const game::HudState& state, Shape shape) {
    std::vector<engine::hud::DrawItem> found;
    for (const engine::hud::DrawItem& item : drawn(state, FULL))
      if (item.kind == Kind::rect && item.shape == shape && item.color.red > 0.5f) found.push_back(item);
    return found;
  };
  /** 조준점의 마름모를 이루는 두 꺾쇠 (‹ 와 ›) — 세로 가운데가 화면 가운데인 그 도형 가운데 맨 나중에 그린 것 (박자 표식과 어긋남의 잔상 위에 그린다) */
  const auto gate = [&](const game::HudState& state, Shape shape, engine::hud::Viewport viewport = FULL) {
    engine::hud::DrawItem last{Kind::rect, -1, -1, 0, 0, {}, {}, 0};
    for (const engine::hud::DrawItem& item : drawn(state, viewport))
      if (item.kind == Kind::rect && item.shape == shape && item.color.red > 0.5f && std::abs(item.y + item.height / 2 - viewport.height / 2) < 0.75f) last = item;
    return last;
  };
  const auto placed_at = [](const engine::hud::DrawItem& item, float x, float y, float width, float height) {
    return std::abs(item.x - x) < 0.01f && std::abs(item.y - y) < 0.01f && std::abs(item.width - width) < 0.01f && std::abs(item.height - height) < 0.01f;
  };
  {
    // 조준점의 마름모 — 가운데에서 꼭짓점까지 15 단위(60 픽셀): 왼쪽 꺾쇠 ‹ 는 x 900…960, 오른쪽 꺾쇠 › 는 x 960…1020, 둘 다 y 480…600. 맞붙어 마름모가 된다
    const engine::hud::DrawItem left = gate(playing, Shape::chevron_left), right = gate(playing, Shape::chevron_right);
    expect(placed_at(left, 900, 480, 60, 120) && placed_at(right, 960, 480, 60, 120), "조준점: 가운데 점을 감싼 마름모 (맞붙은 꺾쇠 둘, 높이 30 단위)");
    // 선은 얇고(0.55 단위 → 2 픽셀) 살짝 비친다(0.7) — 박의 머리에서만 안쪽으로 굵어졌다(1.5 배 → 3 픽셀) 돌아온다. 바깥 가장자리(닿는 자리)는 그대로다
    game::HudState head = playing;
    head.beat = 0.0f;
    game::HudState between = playing;
    between.beat = 0.3f;
    expect(gate(head, Shape::chevron_left).shape_size == 3 && gate(between, Shape::chevron_left).shape_size == 2 && placed_at(gate(head, Shape::chevron_left), 900, 480, 60, 120) &&
               std::abs(left.color.alpha - 0.7f) < 1e-5f && std::abs(right.color.alpha - 0.7f) < 1e-5f,
           "마름모는 얇고 살짝 비친다 — 박의 머리에서 선이 굵어졌다 돌아온다 (자리는 그대로)");
    // 가운데 점 — 1 단위 = 4 픽셀 (958, 538), 그 밑의 테두리는 2 단위
    const engine::hud::DrawList list = drawn(playing, FULL);
    expect(std::any_of(list.begin(), list.end(), [](const engine::hud::DrawItem& item) { return item.kind == Kind::rect && item.x == 958 && item.y == 538 && item.width == 4 && item.height == 4 && item.color.red > 0.9f; }),
           "가운데 점은 작게 그대로다");

    // 박자 표식 — 양옆에서 마름모로 모여드는 꺾쇠 (왼쪽 것은 ‹, 오른쪽 것은 ›). 꼭짓점이 마름모의 좌우 꼭짓점(x 900·1020)에 닿는 때가 칸의 머리다.
    // 박 사이는 60 단위(240 픽셀). 박의 한가운데(0.5)에서 온박 꺾쇠의 꼭짓점은 마름모 꼭짓점에서 30·90 단위 밖(x 780·540), 반박 꺾쇠는 0·60 단위 밖(x 900·660) —
    // 반박 하나가 지금 꼭짓점에 닿아 있다 (반박의 머리). 닿을 때의 높이는 온박 30 단위(마름모와 같다), 반박 18 단위이고 멀수록 작다 (120 단위 밖에서 0.6 배):
    //   온박 30 밖 → 27 단위 = 108 픽셀, 90 밖 → 21 단위 = 84 픽셀 / 반박 0 밖 → 18 단위 = 72 픽셀, 60 밖 → 14.4 단위 (픽셀에 맞춰 58)
    const auto tips = [&](const game::HudState& state, Shape shape) {
      std::vector<std::pair<float, float>> found;
      for (const engine::hud::DrawItem& item : shapes(state, shape)) {
        // 조준점의 마름모(x 900·960 의 폭 60)와 아래 가운데의 대시 표시는 뺀다
        if (std::abs(item.y + item.height / 2 - 540.0f) > 1.0f || (item.width == 60 && (item.x == 900 || item.x == 960))) continue;
        found.push_back({shape == Shape::chevron_left ? item.x : item.x + item.width, item.height});
      }
      std::sort(found.begin(), found.end());
      return found;
    };
    using Tips = std::vector<std::pair<float, float>>;
    expect(tips(playing, Shape::chevron_left) == Tips{{540, 84}, {660, 58}, {780, 108}, {900, 72}}, "왼쪽의 박자 표식(‹): 큰 꺾쇠는 온박, 작은 꺾쇠는 반박 — 멀수록 작다");
    expect(tips(playing, Shape::chevron_right) == Tips{{1020, 72}, {1140, 108}, {1260, 58}, {1380, 84}}, "오른쪽의 박자 표식(›)은 왼쪽을 뒤집은 것이다");
    // 멀수록 옅다 — 마름모의 여느 불투명도 0.7 에 온박 30 밖은 0.75, 90 밖은 0.25 를 곱한다
    float near_alpha = 0.0f, far_alpha = 0.0f;
    for (const engine::hud::DrawItem& item : shapes(playing, Shape::chevron_left)) {
      if (item.x == 780) near_alpha = item.color.alpha;
      if (item.x == 540) far_alpha = item.color.alpha;
    }
    expect(std::abs(near_alpha - 0.525f) < 1e-5f && std::abs(far_alpha - 0.175f) < 1e-5f, "먼 표식일수록 옅다");
    // 온박의 꺾쇠가 닿아 가는 길 — 박의 3/4 에서 15 단위 밖(x 900 − 60 = 840), 머리 한 틱 전(0.975)에 1.5 단위 밖(x 894)이고 그때 높이는 마름모와 같다(120 픽셀):
    // 머리(위상 1 = 0)에서 꼭짓점이 x 900 — 마름모의 왼쪽 절반과 딱 겹친다. 머리를 지난 틱(0)에는 그 꺾쇠가 사라지고 다음 박의 것이 60 단위 밖(x 660)에 있다
    const auto leading = [&](float beat) {
      game::HudState state = playing;
      state.beat = beat;
      const Tips found = tips(state, Shape::chevron_left);
      // 가장 큰(온박) 꺾쇠 가운데 가장 안쪽 것
      std::pair<float, float> best{-1, 0};
      for (const auto& tip : found)
        if (tip.second >= 100 && tip.first > best.first) best = tip;
      return best;
    };
    game::HudState head_marks = playing;
    head_marks.beat = 0.0f;
    // 머리의 틱 — 온박은 60·120 단위 밖(x 660 의 96 픽셀, x 420 은 다 걷혀 안 보인다), 반박은 30·90 단위 밖(x 780·540)
    expect(leading(0.75f) == std::pair{840.0f, 114.0f} && leading(0.975f) == std::pair{894.0f, 120.0f} &&
               tips(head_marks, Shape::chevron_left) == Tips{{420, 72}, {540, 50}, {660, 96}, {780, 64}},
           "온박의 꺾쇠는 고른 빠르기로 다가와, 꼭짓점이 마름모의 꼭짓점에 닿는 때(마름모의 절반과 겹친다)가 박의 머리다");
    expect(tips(playing, Shape::chevron_left).back() == std::pair{gate(playing, Shape::chevron_left).x, 72.0f}, "반박의 머리에는 작은 꺾쇠의 꼭짓점이 마름모의 꼭짓점에 닿아 있다");
    // 앞세우는 양 — 프레임 간격의 두 배 (8 … 50 ms), 판정 보정만큼 덜 앞세운다. 틱으로: 60 Hz 는 2, 120 Hz 는 1
    const auto about = [](float value, float expected) { return std::abs(value - expected) < 1e-4f; };
    expect(about(game::display_lead(1000.0f / 60.0f, 0.0f), 2.0f) && about(game::display_lead(1000.0f / 120.0f, 0.0f), 1.0f), "표식의 앞섬: 60 Hz 에서 두 틱(33 ms), 120 Hz 에서 한 틱(17 ms)");
    expect(about(game::display_lead(2.0f, 0.0f), 0.48f) && about(game::display_lead(100.0f, 0.0f), 3.0f), "프레임 간격이 아주 짧거나 길면 8 ms · 50 ms 로 묶는다");
    expect(about(game::display_lead(1000.0f / 60.0f, 50.0f), -1.0f) && about(game::display_lead(1000.0f / 120.0f, -20.0f), 2.2f), "판정 보정 50 ms 면 표식도 50 ms 늦춘다 (소리가 그만큼 늦게 들린다)");
    // 위상 — 틱 38 에서 두 틱 앞세우면 박의 머리(0), 한 틱이면 39 / 40, 앞섬이 음수여도 0…1 안이다
    game::World clock(two_rooms(), kit);
    for (int i = 0; i < 38; i++) clock.step();
    Menu shown;
    shown.screen = Screen::playing;
    expect(game::select_hud_state(clock, shown, {}, {}).beat == 0.0f && game::select_hud_state(clock, shown, {}, {}, {}, {}, 0.0f, std::nullopt, 1.0f).beat == 0.975f &&
               game::select_hud_state(clock, shown, {}, {}, {}, {}, 0.5f, std::nullopt, -40.0f).beat == 0.9625f,
           "표식의 위상은 앞섬만큼 앞선 때의 것이다");
    // 갈매기 글자는 쓰지 않는다
    expect(!shows(playing, ">") && !shows(playing, "<") && !shows(playing, "‹") && !shows(playing, "›"), "박자 표식은 글자가 아니라 도형이다");
  }
  /** 이 색(알파는 보지 않는다)의 사각형 수 */
  const auto count = [](const game::HudState& state, engine::Color color) {
    const engine::hud::DrawList list = drawn(state, FULL);
    return std::count_if(list.begin(), list.end(), [&](const engine::hud::DrawItem& item) {
      return item.kind == Kind::rect && item.color.red == color.red && item.color.green == color.green && item.color.blue == color.blue;
    });
  };
  const auto has = [](const game::HudState& state, float x, float y, float width, float height, engine::hud::Viewport viewport = FULL) {
    const engine::hud::DrawList list = drawn(state, viewport);
    return std::any_of(list.begin(), list.end(), [&](const engine::hud::DrawItem& item) { return item.kind == Kind::rect && item.x == x && item.y == y && item.width == width && item.height == height; });
  };
  // 디자인 체계의 밝은 붉은 흙빛(나쁜 일)과 밝은 청록(지금 있는 곳)
  constexpr engine::Color ALERT{1.0f, 0.66f, 0.56f}, MINT{0.62f, 0.97f, 0.87f};

  // 미니맵 — 왼쪽 위(여백 12 단위)의 7×7 격자(칸 5 단위, 틈 2 단위). 옅다 (불투명도 0.8).
  // 지금 있는 방 (0, -1): 칸 (3, 2) → 격자의 (21, 14) 단위에서 1 단위씩 밖으로 큰 7 단위 네모 → (32, 25) 단위 = (128, 100) 픽셀의 28. 가 본 방 (0, 0): 칸 (3, 3) → (33, 33) 단위 = (132, 132) 의 20 픽셀 네모.
  // 문 너머의 방 (1, -1): 칸 (4, 2) → (40, 26) 단위 = (160, 104)
  expect(has(playing, 128, 100, 28, 28) && has(playing, 132, 132, 20, 20) && has(playing, 160, 104, 20, 20), "미니맵: 왼쪽 위에 지금 있는 방(큰 네모), 가 본 방, 문 너머의 방이 제 칸에 놓인다");
  {
    bool faint = false;
    for (const engine::hud::DrawItem& item : drawn(playing, FULL)) faint = faint || (item.kind == Kind::rect && item.x == 128 && item.y == 100 && item.color.green == MINT.green && std::abs(item.color.alpha - 0.8f) < 1e-5f);
    // 청록 사각형은 지금 있는 방과 방 진행의 막대(비운 방 1/3) 둘이다
    expect(faint && count(playing, MINT) == 2, "미니맵: 지금 있는 방은 청록 네모이고, 미니맵 전체가 옅다");
  }
  // 문 — 시작 방의 북쪽 문과 지금 방의 남쪽 문은 같은 틈: 칸 안에서 1.75 단위, 폭 1.5 단위 → x 34.75…36.25 단위 = 139…145 픽셀, y 31…33 단위 = 124…132.
  // 동쪽 문은 지금 방의 오른쪽 틈: x 38…40 단위 = 152…160, y 27.75…29.25 단위 = 111…117
  expect(has(playing, 139, 124, 6, 8) && has(playing, 152, 111, 8, 6), "미니맵: 가 본 방의 문은 칸 사이를 잇는 막대다");

  // 잠깐 보이는 표시들 — 글자가 아니라 모양으로
  const std::size_t plain = drawn(playing).size();
  expect(count(playing, ALERT) == 0, "여느 때에는 붉은 흙빛 표시가 없다");
  // 정박 — 마름모(꺾쇠 둘)와 가운데 점이 밝은 청록으로 또렷하게(불투명도 1) 번쩍이고, 가운데를 붙박고 통째로 15 % 커진다: 왼쪽 꺾쇠는 (960 − 69, 540 − 69) 의 69×138
  playing.on_beat = 0.0f;
  expect(count(playing, MINT) == 2 + 3 && count(playing, ALERT) == 0 && drawn(playing).size() == plain && placed_at(gate(playing, Shape::chevron_left), 891, 471, 69, 138) &&
             placed_at(gate(playing, Shape::chevron_right), 960, 471, 69, 138) && gate(playing, Shape::chevron_left).color.alpha == 1.0f,
         "박에 맞은 행동: 조준점의 마름모가 밝은 청록으로 번쩍이며 살짝 커진다");
  playing.on_beat = 1.0f;
  expect(count(playing, MINT) == 2 && placed_at(gate(playing, Shape::chevron_left), 900, 480, 60, 120), "번쩍임은 여느 색·여느 크기로 돌아온다");
  playing.on_beat.reset();
  // 박을 벗어난 행동 — 나가기는 했으므로 나쁜 일의 색을 쓰지 않는다. 마름모는 그대로이고, 같은 모양의 옅은 잔상(꺾쇠 둘, 저마다 그림자와 속)이 잠깐 남는다:
  // 일렀으면 바깥에 (꼭짓점까지 21 단위: 왼쪽 꺾쇠 (876, 456) 의 84×168), 늦었으면 안쪽에 (9 단위: (924, 504) 의 36×72). 처음에 0.6, 남은 시간만큼 걷힌다
  const auto echo = [&](const game::HudState& state, float x, float y, float width, float height) {
    for (const engine::hud::DrawItem& item : shapes(state, Shape::chevron_left))
      if (placed_at(item, x, y, width, height)) return item.color.alpha;
    return -1.0f;
  };
  playing.off_beat = 0.0f;
  playing.off_side = -1;
  expect(count(playing, ALERT) == 0 && count(playing, MINT) == 2 && drawn(playing).size() == plain + 4 && placed_at(gate(playing, Shape::chevron_left), 900, 480, 60, 120) &&
             placed_at(gate(playing, Shape::chevron_right), 960, 480, 60, 120) && std::abs(echo(playing, 876, 456, 84, 168) - 0.6f) < 1e-5f,
         "박을 벗어나 일렀던 행동: 마름모는 그대로이고 바깥에 같은 모양의 옅은 잔상이 남는다");
  playing.off_beat = 0.5f;
  expect(std::abs(echo(playing, 876, 456, 84, 168) - 0.3f) < 1e-5f, "잔상은 남은 시간만큼 걷힌다");
  playing.off_beat = 0.0f;
  playing.off_side = 1;
  // 늦은 잔상(x 924 의 36×72)은 지금 닿아 있는 반박 꺾쇠(x 900)와 자리가 다르다
  expect(count(playing, ALERT) == 0 && placed_at(gate(playing, Shape::chevron_left), 900, 480, 60, 120) && placed_at(gate(playing, Shape::chevron_right), 960, 480, 60, 120) &&
             std::abs(echo(playing, 924, 504, 36, 72) - 0.6f) < 1e-5f && echo(playing, 876, 456, 84, 168) < 0.0f,
         "늦었던 행동: 잔상이 마름모 안쪽에 남는다");
  playing.off_beat.reset();
  playing.off_side = 0;
  // 미스 — 나가지 않았다: 마름모와 점이 붉은 흙빛으로 또렷해지고, 마름모가 통째로 오른쪽으로 3 단위(12 픽셀) 밀린 데서 떨기 시작한다 (모양은 그대로, 가운데 점은 제자리):
  // 왼쪽 꺾쇠 x 912, 오른쪽 꺾쇠 x 972. 다 지나면(1) 제자리·제 색이다
  playing.miss = 0.0f;
  expect(count(playing, ALERT) == 3 && count(playing, MINT) == 2 && drawn(playing).size() == plain && placed_at(gate(playing, Shape::chevron_left), 912, 480, 60, 120) &&
             placed_at(gate(playing, Shape::chevron_right), 972, 480, 60, 120) && gate(playing, Shape::chevron_left).color.alpha == 1.0f && has(playing, 958, 538, 4, 4),
         "미스: 조준점이 붉은 흙빛으로 바뀌고 마름모가 통째로 옆으로 떤다 (가운데 점은 제자리)");
  playing.miss = 1.0f;
  expect(count(playing, ALERT) == 0 && placed_at(gate(playing, Shape::chevron_left), 900, 480, 60, 120) && placed_at(gate(playing, Shape::chevron_right), 960, 480, 60, 120),
         "미스의 표시는 제자리·제 색으로 돌아온다");
  playing.miss.reset();
  // 마름모의 모양 — 어느 판정 상태에서도, 어느 화면 비율에서도 가로(맞붙은 두 꺾쇠의 폭)와 세로가 같다 (픽셀에 맞추는 오차 1 안). 두 꺾쇠는 늘 맞붙어 있고, 밀림에도 그대로다
  {
    std::vector<game::HudState> states{playing};
    const auto vary = [&](auto&& change) {
      game::HudState state = playing;
      change(state);
      states.push_back(state);
    };
    for (const float age : {0.0f, 0.3f, 0.7f, 1.0f}) {
      vary([&](game::HudState& s) { s.on_beat = age; });
      vary([&](game::HudState& s) { s.miss = age; });
      vary([&](game::HudState& s) { s.off_beat = age, s.off_side = -1; });
      vary([&](game::HudState& s) { s.off_beat = age, s.off_side = 1; });
      vary([&](game::HudState& s) { s.beat = age * 0.99f; });
    }
    vary([](game::HudState& s) { s.motion.shove_x = game::HUD_SHOVE_MAX, s.motion.shove_y = -game::HUD_SHOVE_MAX, s.motion.spread = game::HUD_SPREAD_MAX, s.motion.health_pulse = 1.0f; });
    bool square = true;
    for (const auto& [width, height] : {std::pair{1920u, 1080u}, {1280u, 720u}, {800u, 450u}, {2560u, 1080u}, {1024u, 768u}, {800u, 600u}, {1080u, 1920u}}) {
      const engine::hud::Viewport viewport{static_cast<float>(width), static_cast<float>(height), game::hud_unit(width, height)};
      for (const game::HudState& state : states) {
        const engine::hud::DrawItem left = gate(state, Shape::chevron_left, viewport), right = gate(state, Shape::chevron_right, viewport);
        const bool ok = left.width > 0 && std::abs(left.width + right.width - left.height) <= 1.0f && left.height == right.height && left.y == right.y &&
                        std::abs(left.width - right.width) <= 1.0f && std::abs(left.x + left.width - right.x) < 0.01f;
        if (!ok) std::printf("찌그러진 마름모 (%u×%u): 왼쪽 %.2f×%.2f, 오른쪽 %.2f×%.2f\n", width, height, left.width, left.height, right.width, right.height);
        square = square && ok;
      }
    }
    expect(square, "어느 판정 상태·화면 비율에서도 조준점 마름모의 가로:세로 비는 같다 (1:1)");
    // 밀려도 제자리다
    expect(placed_at(gate(states.back(), Shape::chevron_left), 900, 480, 60, 120), "조준점의 마름모는 밀리지 않는다");
  }
  // 타이밍 표시 (옵션) — 조준점 아래에 마지막 누름과 최근 평균을 ms 로
  playing.timing = game::Timing{23, -5};
  expect(shows(playing, "+23 ms") && shows(playing, "평균 -5 ms") && all_baked(playing), "타이밍 표시: 마지막 치우침과 최근 평균");
  playing.timing = game::Timing{0, 12};
  expect(shows(playing, "0 ms") && shows(playing, "평균 +12 ms"), "타이밍 표시: 0 에는 부호가 없다");
  {
    // 마지막 누름의 색이 그 누름의 판정이다 — 정박(±5 틱 — 가장 가까운 틱으로 판정하니 5.5 틱: 91.7 ms 안)은 밝은 청록(0.62, 0.97, 0.87), 어긋남(±8 틱 — 8.5 틱: 141.7 ms 안)은 흰빛(0.99, 0.98, 0.95), 그 밖(미스)은 붉은 흙빛(1.0, 0.66, 0.56).
    // 글자는 작다 — 6 단위 (1280×720 에서 18 픽셀). 그림자(어두운 글자)가 아닌 것을 본다
    const auto ink = [&](int last_ms, std::string_view content) {
      playing.timing = game::Timing{last_ms, 0};
      for (const engine::hud::DrawItem& item : drawn(playing))
        if (item.kind == Kind::text && item.content == content && item.color.red > 0.5f && item.size == 18.0f) return item.color;
      return engine::Color{};
    };
    // 경계의 앞뒤: 91 ms 정박·92 ms 어긋남, 141 ms 어긋남·142 ms 미스
    const engine::Color on = ink(-91, "-91 ms"), off = ink(110, "+110 ms"), late = ink(141, "+141 ms"), miss = ink(-150, "-150 ms"), edge = ink(92, "+92 ms"), out = ink(142, "+142 ms");
    expect(on.red == 0.62f && on.green == 0.97f && off.red == 0.99f && off.green == 0.98f && late.red == 0.99f && late.green == 0.98f && miss.red == 1.0f && miss.green == 0.66f && edge.red == 0.99f &&
               edge.green == 0.98f && out.red == 1.0f && out.green == 0.66f,
           "타이밍 표시의 색: 정박은 밝은 청록, 어긋남은 흰빛, 미스는 붉은 흙빛 — 작은 글자");
  }
  playing.timing.reset();
  playing.hit = 0.0f;
  expect(drawn(playing).size() == plain + 8 && shapes(playing, Shape::diamond).size() == shapes([&] { game::HudState s = playing; s.hit.reset(); return s; }(), Shape::diamond).size() + 4,
         "맞힘: 조준점 둘레 네 귀의 작은 마름모 (하나가 그림자와 속 둘)");
  playing.hit.reset();
  playing.hurt = 0.0f;
  // 띠의 두께는 2 단위 — 1280×720 (단위 3 픽셀)에서 6 픽셀. 화면을 덮지 않는다
  expect(drawn(playing).size() == plain + 4 && has(playing, 0, 0, 1280, 6, SCREEN) && has(playing, 0, 714, 1280, 6, SCREEN) && has(playing, 0, 0, 6, 720, SCREEN) &&
             has(playing, 1274, 0, 6, 720, SCREEN),
         "피격: 화면 네 가장자리의 얇은 띠");
  playing.hurt.reset();
  // 대시 — 화면 네 가장자리에서 번지는 빛(좌우 30 단위 = 90 픽셀, 위아래 14 단위 = 42 픽셀)과 좌우 가장자리의 바람 줄기 스무 가닥. 가운데는 건드리지 않는다
  {
    const auto band = [](const game::HudState& state, float x, float y, float width, float height) {
      for (const engine::hud::DrawItem& item : drawn(state))
        if (item.kind == Kind::rect && item.x == x && item.y == y && item.width == width && item.height == height) return item;
      return engine::hud::DrawItem{};
    };
    const auto centre = [](const game::HudState& state) {
      const engine::hud::DrawList list = drawn(state);
      // 화면 가운데 (x 320…960, y 120…600) 에 걸친 것
      return std::count_if(list.begin(), list.end(), [](const engine::hud::DrawItem& item) { return item.x < 960.0f && item.x + item.width > 320.0f && item.y < 600.0f && item.y + item.height > 120.0f; });
    };
    const auto middle = centre(playing);
    playing.motion.rush = 1.0f;
    playing.motion.rush_age = 3.0f;
    const engine::hud::DrawItem left = band(playing, 0, 0, 90, 720), right = band(playing, 1190, 0, 90, 720), top = band(playing, 0, 0, 1280, 42), bottom = band(playing, 0, 678, 1280, 42);
    expect(drawn(playing).size() == plain + 24 && left.width == 90 && right.width == 90 && top.height == 42 && bottom.height == 42, "대시: 네 가장자리의 빛과 바람 줄기 스무 가닥");
    // 가장자리에서 가장 짙고(0.34) 안쪽으로 다 걷힌다 — 밝은 청록 하늘빛 (어둡거나 붉지 않다)
    expect(std::abs(left.color.alpha - 0.34f) < 1e-6f && left.color_end.alpha == 0.0f && right.color.alpha == 0.0f && std::abs(right.color_end.alpha - 0.34f) < 1e-6f &&
               std::abs(top.color.alpha - 0.34f) < 1e-6f && top.color_end.alpha == 0.0f && bottom.color.alpha == 0.0f && std::abs(bottom.color_end.alpha - 0.34f) < 1e-6f,
           "빛은 화면 가장자리에서 가장 짙고 안쪽으로 걷힌다");
    expect(left.color.red >= 0.7f && left.color.green >= 0.95f && left.color.blue >= 0.95f && left.color.green > left.color.red, "빛은 밝은 청록 하늘빛이다");
    expect(centre(playing) == middle && shows(playing, "75") && shows(playing, "방 1/3"), "가운데(조준점·박자 표식)는 가리지 않고, 수치는 그대로 보인다");
    playing.motion.rush = 0.5f;
    expect(std::abs(band(playing, 0, 0, 90, 720).color.alpha - 0.17f) < 1e-6f, "걷히는 중에는 그만큼 옅다");
    playing.motion.rush = 0.0f;
    playing.motion.rush_age = 0.0f;
    expect(drawn(playing).size() == plain, "대시가 아니면 가장자리 빛이 없다");
  }
  // 포털을 넘는 중 — 장면을 덮는 막 한 장이 맨 밑에 깔린다 (수치와 조준점은 그 위에 남는다). 한가운데(0.5)에서 다 덮고, 처음과 끝에서는 비친다.
  // 덮는 정도는 1 − |2p − 1| 을 부드럽게 한 것(3c² − 2c³): 0.25 와 0.75 에서 c 0.5 → 0.5, 0.5 에서 1
  const auto veil = [](const game::HudState& state) { return drawn(state)[0]; };
  playing.transit = 0.5f;
  expect(drawn(playing).size() == plain + 1 && veil(playing).kind == Kind::rect && veil(playing).x == 0 && veil(playing).y == 0 && veil(playing).width == 1280 &&
             veil(playing).height == 720 && veil(playing).color.alpha == 1.0f && veil(playing).color_end.alpha == 1.0f,
         "포털을 넘는 한가운데: 화면을 다 덮는 막");
  // 포털 빛 — 밝은 청록에서 흰 하늘빛으로 (어둡거나 붉지 않다)
  expect(veil(playing).color.red >= 0.75f && veil(playing).color.green >= 0.95f && veil(playing).color.blue >= 0.9f && veil(playing).color_end.red >= 0.9f, "막은 밝은 청록·하늘빛이다");
  playing.transit = 0.25f;
  const float rising = veil(playing).color.alpha;
  playing.transit = 0.75f;
  expect(rising == 0.5f && veil(playing).color.alpha == 0.5f, "넘기의 1/4 과 3/4 에서는 반쯤 덮는다 — 번졌다 걷힌다");
  playing.transit = 0.0f;
  expect(veil(playing).color.alpha == 0.0f && shows(playing, "75") && shows(playing, "방 1/3"), "닿은 틱에는 아직 덮지 않고, 수치와 방 진행은 그대로 보인다");
  playing.transit.reset();
  corners(playing);
  playing.health = 25;
  playing.motion.health_ghost = 25.0f;
  expect(shows(playing, "25") && all_baked(playing), "바닥난 체력");

  // 게임 중에는 닿을 위젯도 커서도 없다 (조준점이 포인터다)
  engine::hud::DrawList list;
  engine::hud::Regions regions;
  engine::hud::layout(game::hud_root(playing), SCREEN, *font, list, regions);
  const std::size_t without_pointer = list.size();
  playing.ui.pointer_inside = true;
  playing.ui.pointer_x = 50;
  playing.ui.pointer_y = 50;
  engine::hud::layout(game::hud_root(playing), SCREEN, *font, list, regions);
  expect(regions.items.empty() && list.size() == without_pointer, "게임 중에는 위젯이 없고 커서를 그리지 않는다");

  // 작은 화면(800×450, 단위 2 픽셀 → 400×225 단위)에서도 묶음들이 겹치지 않는다 — 왼쪽 것(미니맵·체력, x 12…108 단위)은 왼쪽에, 오른쪽 것(배수·탄, x 292…388 단위)은 오른쪽에,
  // 가운데 것(방 진행 x 148…252 단위, 대시)은 그 사이에 (박자 표식과 조준점은 가운데 높이 150…300 픽셀에만 있다)
  playing.score = 99999;
  playing.health = 100;
  float left_reach = 0.0f, right_reach = 800.0f, middle_left = 800.0f, middle_right = 0.0f;
  for (const engine::hud::DrawItem& item : drawn(playing, {800, 450, 2})) {
    if (item.y > 150.0f && item.y < 300.0f) continue;
    const float right = item.x + (item.kind == Kind::text ? font->width(item.content, item.size, item.face) : item.width);
    if (item.x < 250.0f) left_reach = std::max(left_reach, right);
    else if (item.x >= 550.0f) right_reach = std::min(right_reach, item.x);
    else middle_left = std::min(middle_left, item.x), middle_right = std::max(middle_right, right);
  }
  expect(left_reach > 0.0f && left_reach < 280.0f && middle_left >= 290.0f && middle_right <= 510.0f && right_reach > 520.0f && right_reach < 800.0f, "800×450 에서도 가장자리의 묶음들이 제자리에 들고 서로 겹치지 않는다");
}

/** 장면의 에셋(받는 팩)이 오기 전에는 판을 시작할 수 없다 — 메뉴는 먼저 뜨고, 단추가 꺼진 까닭이 한 줄로 보인다 */
void assets_gate() {
  expect(game::play_blocker(Menu{}).empty(), "받는 것이 없는 곳(프로브)에서는 에셋이 준비된 것으로 시작한다");
  Session s;
  s.menu.assets = game::Assets::loading;
  s.arrange();
  expect(game::play_blocker(s.menu) == "불러오는 중…" && s.shows("불러오는 중…") && s.disabled(game::HUD_SOLO_START) && !s.shows("다시 시도"), "받는 동안 시작 단추는 꺼져 있고 '불러오는 중…' 이 보인다");
  expect(s.shows("혼자 하기") && s.shows("옵션") && s.shows_logo(), "메뉴는 에셋을 기다리지 않고 뜬다");
  game::HudOutcome outcome = s.click(game::HUD_SOLO_START);
  expect(!(outcome.host & game::HOST_CAPTURE_POINTER) && s.menu.screen == Screen::main, "받는 동안에는 시작을 눌러도 판이 열리지 않는다");
  s.ui.focus(game::HUD_SOLO_START);
  outcome = s.key("Enter");
  expect(!(outcome.host & game::HOST_CAPTURE_POINTER), "글쇠로도 열리지 않는다");
  expect(all_baked(s.state()) && fits(s.state()), "받는 동안: 글자가 모두 글꼴에 있고 판 안에 든다");

  s.menu.assets = game::Assets::failed;
  s.arrange();
  expect(game::play_blocker(s.menu) == "에셋 불러오기 실패" && s.shows("에셋 불러오기 실패") && s.disabled(game::HUD_SOLO_START) && s.enabled(game::HUD_ASSETS_RETRY) && s.shows("다시 시도"),
         "받지 못했으면 까닭과 '다시 시도' 단추가 보인다");
  expect(all_baked(s.state()) && fits(s.state()), "받지 못했을 때: 글자가 모두 글꼴에 있고 판 안에 든다");
  outcome = s.click(game::HUD_ASSETS_RETRY);
  expect(outcome.reload_assets && !(outcome.host & game::HOST_CAPTURE_POINTER), "'다시 시도' 는 에셋을 다시 받아 달라고 한다");

  s.menu.assets = game::Assets::ready;
  s.arrange();
  expect(s.enabled(game::HUD_SOLO_START) && !s.shows("불러오는 중…") && !s.shows("에셋 불러오기 실패") && !s.region(game::HUD_ASSETS_RETRY), "준비되면 시작 단추가 켜지고 알림이 사라진다");
  outcome = s.click(game::HUD_ASSETS_RETRY);
  expect(!outcome.reload_assets, "준비된 뒤에는 다시 받지 않는다");
  expect(s.click(game::HUD_SOLO_START).host & game::HOST_CAPTURE_POINTER, "준비되면 시작이 포인터를 잡아 달라고 한다");

  // 대기실의 입장도 같다
  Session room;
  room.lobby.link = Lobby::Link::online;
  room.lobby.player_id = 1;
  room.lobby.room = Lobby::Room{.id = 7, .name = "방", .max_players = 4, .host = 1, .playing = true, .members = {{.id = 1, .nickname = "나", .ready = false}}};
  room.menu.assets = game::Assets::loading;
  room.arrange();
  expect(room.disabled(game::HUD_ROOM_ENTER) && room.shows("불러오는 중…"), "받는 동안 대기실의 입장 단추는 꺼져 있고 까닭이 보인다");
  expect(!(room.click(game::HUD_ROOM_ENTER).host & game::HOST_CAPTURE_POINTER), "받는 동안에는 입장을 눌러도 판이 열리지 않는다");
  room.menu.assets = game::Assets::failed;
  room.arrange();
  expect(room.shows("에셋 불러오기 실패") && room.enabled(game::HUD_ASSETS_RETRY) && room.click(game::HUD_ASSETS_RETRY).reload_assets, "받지 못했으면 대기실에도 '다시 시도' 가 있다");
  expect(all_baked(room.state()) && fits(room.state()), "대기실(받지 못했을 때): 글자가 모두 글꼴에 있고 판 안에 든다");
  room.menu.assets = game::Assets::ready;
  room.arrange();
  expect(room.enabled(game::HUD_ROOM_ENTER) && (room.click(game::HUD_ROOM_ENTER).host & game::HOST_CAPTURE_POINTER), "준비되면 입장이 열린다");
}

/** 메인 메뉴 — 글쇠만으로 항목을 고르고, 패널에 들어가고, 뒤로 나온다 */
void main_menu() {
  Session s;
  expect(s.menu.screen == Screen::main && s.ui.ui().focus == game::HUD_MENU, "첫 화면은 메인 메뉴이고 항목 목록이 포커스를 갖는다");
  expect(s.shows_logo() && s.shows("혼자 하기") && s.shows("방 찾기") && s.shows("방 만들기") && s.shows("옵션"), "제목(ZENDIKAR)과 네 항목이 보인다");
  expect(!s.shows("하늘거주지 박자 사격") && !s.shows("젠디카르"), "제목 밑에 설명 줄은 없다");
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_MENU, game::HUD_SOLO_START} && s.shows("시작"), "혼자 하기 패널에는 시작 단추가 있다");
  expect(!s.shows("점수") && !s.shows("체력"), "메인 메뉴에는 게임 중의 수치가 없다");
  expect(s.shows("재장전") && s.shows("R") && s.shows("대시") && s.shows("Shift") && s.shows("점프") && s.shows("Space") && s.shows("일시정지"), "혼자 하기 패널의 조작표에 재장전·대시·점프가 있다");
  expect(all_baked(s.state()) && fits(s.state()), "혼자 하기: 글자가 모두 글꼴에 있고 판 안에 든다");

  // 포인터가 화면에 오면 커서가 그려진다
  const std::size_t without_cursor = s.list.size();
  s.apply(s.ui.pointer_move(s.regions, 5, 700));
  expect(s.list.size() > without_cursor, "메뉴에서는 포인터 자리에 커서를 그린다");
  s.ui.pointer_leave();
  s.arrange();

  // 아래 화살표로 항목을 고르면 패널이 바뀐다
  s.key("ArrowDown");
  expect(s.menu.item == MenuItem::find && s.shows("닉네임") && s.shows("다시 연결") && s.shows("참가") && !s.shows("시작"), "방 찾기를 고르면 방 찾기 패널이 보인다");
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_MENU, game::HUD_NICKNAME, game::HUD_ROOMS, game::HUD_JOIN, game::HUD_RECONNECT}, "방 찾기 패널의 위젯은 화면 차례대로다");
  expect(s.enabled(game::HUD_RECONNECT) && s.disabled(game::HUD_JOIN) && s.enabled(game::HUD_NICKNAME), "연결이 없으면 참가는 꺼져 있고, 다시 연결할 수 있고, 닉네임은 적을 수 있다");
  expect(s.shows("서버 연결 끊김"), "빈 목록과 꺼진 단추의 까닭이 글로 보인다");
  expect(all_baked(s.state()) && fits(s.state()), "방 찾기: 글자가 모두 글꼴에 있고 판 안에 든다");

  s.key("ArrowDown");
  expect(s.menu.item == MenuItem::create && s.shows("방 이름") && s.shows("최대 인원") && s.shows("4명") && s.shows("만들기"), "방 만들기를 고르면 방 만들기 패널이 보인다");
  expect(s.disabled(game::HUD_CREATE) && s.shows("서버 연결 끊김"), "연결이 없으면 만들기는 꺼져 있고 까닭이 보인다");
  expect(all_baked(s.state()) && fits(s.state()), "방 만들기: 글자가 모두 글꼴에 있고 판 안에 든다");
  // 패널로 들어가(Enter) 방 이름을 적고, 최대 인원을 고친다
  expect(s.key("Enter").focus == game::HUD_ROOM_NAME && s.ui.ui().focus == game::HUD_ROOM_NAME, "Enter 는 패널의 첫 칸으로 간다");
  s.type("abcdefghijklmnopqrstuvwxyz");
  expect(s.menu.room_name == "abcdefghijklmnopqrst", "방 이름은 20 자까지만 들어간다");
  s.key("Tab");
  expect(s.ui.ui().focus == game::HUD_MAX_PLAYERS, "Tab 은 다음 칸(최대 인원)으로 간다");
  s.key("ArrowRight");
  expect(s.menu.max_players == 5 && s.shows("5명"), "오른쪽 화살표는 최대 인원을 한 명 늘린다");
  s.key("End");
  s.key("ArrowRight");
  expect(s.menu.max_players == 8, "최대 인원은 8 명까지다");
  s.key("Home");
  expect(s.menu.max_players == 2, "최대 인원은 2 명부터다");
  s.key("Tab");
  s.type("nickname-is-too-long");
  expect(s.menu.nickname == "nickname-is-", "닉네임은 12 자까지만 들어간다");
  expect(s.escape().focus == game::HUD_MENU && s.ui.ui().focus == game::HUD_MENU && s.menu.item == MenuItem::create, "ESC 는 패널에서 항목 목록으로 돌아온다");

  s.key("ArrowDown");
  expect(s.menu.item == MenuItem::options && s.shows("마우스 감도") && s.shows("1.0") && s.shows("시야각") && s.shows("75도") && s.shows("상하 반전") && s.shows("끔") && s.shows("음악") && s.shows("70") && s.shows("효과음") && s.shows("80"),
         "옵션을 고르면 옵션 패널이 지금 값과 함께 보인다");
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_MENU, game::HUD_SENSITIVITY, game::HUD_FOV, game::HUD_INVERT_Y, game::HUD_SHAKE, game::HUD_MUSIC_VOLUME, game::HUD_EFFECTS_VOLUME,
                                                 game::HUD_JUDGE_OFFSET, game::HUD_TIMING},
         "옵션 패널의 위젯");
  expect(s.shows("판정 보정") && s.shows("-100 ms") && s.shows("타이밍 표시"), "판정 보정은 처음에 -100 ms (사용자가 잰 치우침), 타이밍 표시도 옵션에 있다");
  expect(s.shows("화면 흔들림") && s.shows("켬"), "화면 흔들림은 처음에 켜져 있다");
  expect(all_baked(s.state()) && fits(s.state()), "옵션: 글자가 모두 글꼴에 있고 판 안에 든다");
  s.key("ArrowDown");
  expect(s.menu.item == MenuItem::options && s.ui.ui().focus == game::HUD_MENU, "마지막 항목에서 아래 화살표는 그대로 있다");

  // 맨 위 항목으로 돌아가 시작한다 — Enter 두 번
  s.key("Home");
  expect(s.menu.item == MenuItem::solo, "Home 은 첫 항목을 고른다");
  expect(s.key("Enter").focus == game::HUD_SOLO_START, "혼자 하기에서 Enter 는 시작 단추로 간다");
  const game::HudOutcome start = s.key("Enter");
  expect(start.host == (game::HOST_CAPTURE_POINTER | game::HOST_RESUME_AUDIO) && !start.new_game && s.menu.screen == Screen::main, "시작은 포인터를 잡아 달라고 한다 — 화면은 잡힌 뒤에 바뀐다");

  // 포인터로도 — 항목을 누르면 고르고, 단추를 눌렀다 떼면 시작한다
  Session mouse;
  mouse.click(game::HUD_MENU, 3);
  expect(mouse.menu.item == MenuItem::options, "넷째 줄을 누르면 옵션을 고른다");
  mouse.click(game::HUD_MENU, 0);
  expect(mouse.menu.item == MenuItem::solo && mouse.click(game::HUD_SOLO_START).host == (game::HOST_CAPTURE_POINTER | game::HOST_RESUME_AUDIO), "시작 단추를 눌렀다 떼면 포인터를 잡아 달라고 한다");
  mouse.apply(mouse.ui.pointer_move(mouse.regions, 5, 700));
  mouse.apply(mouse.ui.pointer_press(mouse.regions, *font));
  expect(mouse.apply(mouse.ui.pointer_release(mouse.regions)).host == 0, "빈 곳의 클릭은 아무것도 시작하지 않는다");
}

/** 옵션 — 슬라이더와 토글이 옵션 값을 바꾸고, 그 값이 시야각과 시선 감도에 닿는다 */
void options() {
  Session s;
  s.menu.item = MenuItem::options;
  s.arrange();
  expect(s.menu.options == game::Options{.sensitivity = 1.0f, .fov = 75.0f, .invert_y = false, .shake = true}, "옵션의 처음 값: 감도 1.0, 시야각 75 도, 상하 반전 꺼짐, 화면 흔들림 켜짐");
  s.key("Enter");
  expect(s.ui.ui().focus == game::HUD_SENSITIVITY, "옵션에서 Enter 는 감도 슬라이더로 간다");
  s.key("ArrowRight");
  expect(s.menu.options.sensitivity == 1.1f && s.shows("1.1"), "오른쪽 화살표는 감도를 0.1 올린다");
  s.key("ArrowLeft");
  s.key("ArrowLeft");
  expect(s.menu.options.sensitivity == 0.9f && s.shows("0.9"), "왼쪽 화살표 두 번은 0.9");
  s.key("End");
  expect(s.menu.options.sensitivity == 3.0f, "감도는 3.0 까지다");
  s.key("Home");
  expect(s.menu.options.sensitivity == 0.2f, "감도는 0.2 부터다");
  s.key("ArrowDown");
  expect(s.ui.ui().focus == game::HUD_FOV, "아래 화살표는 시야각으로 간다");
  s.key("ArrowRight");
  expect(s.menu.options.fov == 80.0f && s.shows("80도"), "오른쪽 화살표는 시야각을 5 도 넓힌다");
  s.key("End");
  expect(s.menu.options.fov == 110.0f, "시야각은 110 도까지다");
  s.key("Home");
  expect(s.menu.options.fov == 60.0f, "시야각은 60 도부터다");
  s.key("Tab");
  s.key("Space");
  expect(s.menu.options.invert_y, "Space 는 상하 반전을 켠다");
  // 스위치 셋(상하 반전, 화면 흔들림, 타이밍 표시)이 모두 켜져 있으면 끔이라는 글은 없다
  s.menu.options.timing = true;
  expect(s.shows("켬") && !s.shows("끔"), "켜진 스위치는 글로도 켬이라고 적는다");
  s.menu.options.timing = false;
  expect(s.shows("끔"), "꺼진 스위치는 끔이라고 적는다");
  s.key("Enter");
  expect(!s.menu.options.invert_y, "Enter 는 다시 끈다");
  // 화면 흔들림 — 처음에 켜져 있다. 끄면 시점 연출과 HUD 의 밀림이 없다 (motion 이 검증한다)
  s.key("Tab");
  expect(s.ui.ui().focus == game::HUD_SHAKE && s.menu.options.shake, "Tab 은 화면 흔들림으로 간다");
  s.key("Space");
  expect(!s.menu.options.shake && s.shows("끔") && all_baked(s.state()) && fits(s.state()), "Space 는 화면 흔들림을 끈다");
  s.key("Space");
  expect(s.menu.options.shake, "다시 켠다");
  // 음량 — 0.1 칸, 0…1. 화면에는 0…100 으로 적는다
  s.key("Tab");
  expect(s.ui.ui().focus == game::HUD_MUSIC_VOLUME && s.menu.options.music == 0.7f && s.menu.options.effects == 0.8f, "Tab 은 음악 음량으로 간다 — 처음 값은 음악 0.7, 효과음 0.8");
  s.key("ArrowLeft");
  expect(std::abs(s.menu.options.music - 0.6f) < 1e-6f && s.shows("60") && !s.shows("70"), "왼쪽 화살표는 음악 음량을 0.1 내린다");
  s.key("Home");
  expect(s.menu.options.music == 0.0f && s.shows("0"), "음량은 0 부터다");
  s.key("Tab");
  s.key("End");
  expect(s.ui.ui().focus == game::HUD_EFFECTS_VOLUME && s.menu.options.effects == 1.0f && s.shows("100"), "효과음 음량은 1 까지다");
  // 슬라이더의 4/5 자리를 누른다 — 60…110 의 4/5 는 100
  const engine::hud::Rect fov = s.region(game::HUD_FOV)->rect;
  const float inset = s.region(game::HUD_FOV)->inset;
  s.apply(s.ui.pointer_move(s.regions, fov.x + inset + (fov.width - 2 * inset) * 0.8f, fov.y + fov.height / 2));
  s.apply(s.ui.pointer_press(s.regions, *font));
  expect(s.menu.options.fov == 100.0f, "슬라이더의 4/5 자리를 누르면 시야각 100 도");

  // 시야각 90 도에서 투영의 세로 배율은 1/tan(45°) = 1, 60 도에서는 1/tan(30°) = √3 (눈이 -z 를 똑바로 보면 view 의 회전은 단위 행렬이다)
  const game::Player level{};
  expect(std::abs(game::camera_for(level, 1.0f, 90.0f).view_proj.m[5] - 1.0f) < 1e-5f, "시야각 90 도의 세로 배율은 1");
  expect(std::abs(game::camera_for(level, 1.0f, 60.0f).view_proj.m[5] - 1.7320508f) < 1e-5f, "시야각 60 도의 세로 배율은 √3");
  game::World world(two_rooms(), kit);
  Menu menu;
  expect(!game::shows_scene(menu), "메인 메뉴는 장면을 그리지 않는다 (배경 그림 한 장이다)");
  menu.screen = Screen::playing;
  expect(game::shows_scene(menu), "게임 중에는 장면을 그린다");
  menu.screen = Screen::paused;
  expect(game::shows_scene(menu), "일시정지는 멈춘 장면 위에 메뉴를 그린다");
  menu.options.fov = 90.0f;
  const game::Camera paused = game::scene_camera(menu, world, 1.0f);
  // 처음에는 시작 방 가운데 위 1.2 m 에 떠 있다 (눈높이 1.6 을 더해 2.8)
  expect(paused.eye.x == 0.0f && std::abs(paused.eye.y - 2.8f) < 1e-5f && paused.eye.z == 0.0f && std::abs(paused.view_proj.m[5] - 1.0f) < 1e-5f,
         "일시정지와 게임에서는 플레이어의 눈이고, 옵션의 시야각을 쓴다");
}

/** 메인 메뉴 → 게임 → 일시정지 → 게임 / 메인 메뉴 */
void play_and_pause() {
  Session s;
  expect(!game::simulating(s.menu), "메인 메뉴 뒤에서 세계는 돌지 않는다");
  expect(!s.capture(false).new_game && s.menu.screen == Screen::main, "메인 메뉴에서 포인터를 잡지 못했다는 통지는 아무것도 바꾸지 않는다");

  game::HudOutcome outcome = s.capture(true);
  expect(outcome.new_game && s.menu.screen == Screen::playing && game::simulating(s.menu), "메인 메뉴에서 포인터가 잡히면 새 판으로 게임이 시작된다");
  expect(s.regions.items.empty() && s.shows("0") && s.shows("100") && s.shows("/100") && s.shows("8") && s.shows("/8") && s.shows("x1") && s.shows("연속 0") && s.shows("방 0/1") && s.shows("SHIFT"),
         "게임 중에는 위젯이 없고 수치가 보인다");

  outcome = s.capture(false);
  expect(s.menu.screen == Screen::paused && !game::simulating(s.menu), "게임 중에 포인터가 풀리면 일시정지이고 시뮬레이션이 멈춘다");
  expect(outcome.focus == game::HUD_RESUME && s.ui.ui().focus == game::HUD_RESUME, "일시정지 메뉴는 계속하기에 포커스를 둔다");
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_RESUME, game::HUD_PAUSE_OPTIONS, game::HUD_QUIT}, "일시정지 메뉴의 단추 셋");
  expect(s.shows("일시정지") && s.shows("계속하기") && s.shows("옵션") && s.shows("메인 메뉴로") && s.shows("점수 0 · 방 0/1"), "일시정지 메뉴의 글");
  expect(all_baked(s.state()) && fits(s.state()), "일시정지: 글자가 모두 글꼴에 있고 판 안에 든다");
  expect(s.escape().focus == 0 && s.menu.screen == Screen::paused, "일시정지 메뉴에서 ESC 는 아무것도 바꾸지 않는다 (잠금을 푼 그 ESC 가 다시 잡지 않게)");

  // 옵션을 열었다 ESC 로 닫는다
  s.key("ArrowDown");
  expect(s.key("Enter").focus == game::HUD_SENSITIVITY && s.menu.pause_options, "옵션 단추는 옵션 패널을 열고 감도로 간다");
  expect(s.shows("옵션 닫기") && s.shows("마우스 감도") && all_baked(s.state()) && fits(s.state()), "열린 옵션 패널과 닫기 단추");
  s.key("ArrowRight");
  expect(s.menu.options.sensitivity == 1.1f, "일시정지의 옵션도 같은 옵션 값을 고친다");
  expect(s.escape().focus == game::HUD_PAUSE_OPTIONS && !s.menu.pause_options && !s.shows("마우스 감도"), "ESC 는 옵션 패널을 닫고 옵션 단추로 돌아온다");
  s.click(game::HUD_PAUSE_OPTIONS);
  s.click(game::HUD_PAUSE_OPTIONS);
  expect(!s.menu.pause_options, "옵션 단추를 두 번 누르면 열렸다 닫힌다");

  // 계속하기
  outcome = s.click(game::HUD_RESUME);
  expect(outcome.host == (game::HOST_CAPTURE_POINTER | game::HOST_RESUME_AUDIO) && s.menu.screen == Screen::paused, "계속하기는 포인터를 잡아 달라고 한다 — 잡힐 때까지는 일시정지다");
  outcome = s.capture(true);
  expect(!outcome.new_game && s.menu.screen == Screen::playing && game::simulating(s.menu), "일시정지에서 포인터가 잡히면 하던 판이 이어진다");

  // 메인 메뉴로
  s.capture(false);
  outcome = s.click(game::HUD_QUIT);
  expect(s.menu.screen == Screen::main && outcome.focus == game::HUD_MENU && outcome.host == game::HOST_RESUME_AUDIO && !game::simulating(s.menu), "메인 메뉴로 가면 항목 목록이 포커스를 갖고 세계는 멈춘다");
  expect(s.shows_logo() && !s.shows("계속하기") && s.menu.options.sensitivity == 1.1f, "메인 메뉴가 보이고 옵션 값은 남는다");
  expect(s.capture(true).new_game, "메인 메뉴에서 다시 시작하면 새 판이다");

  // 판이 끝난 화면 (죽음·층 완료) — 일시정지와 같은 양식에 다시 하기·메인 메뉴로
  s.capture(false);
  expect(game::apply_game_over(s.menu).focus == 0 && s.menu.screen == Screen::paused, "게임 중이 아니면 판이 끝났다는 통지는 아무것도 바꾸지 않는다");
  s.capture(true);
  outcome = s.follow(game::apply_game_over(s.menu));
  expect(s.menu.screen == Screen::over && outcome.focus == game::HUD_RETRY && s.ui.ui().focus == game::HUD_RETRY && !game::simulating(s.menu) && game::shows_scene(s.menu),
         "판이 끝나면 끝난 화면이고, 다시 하기에 포커스가 있고, 세계는 멈춘 채 장면이 보인다");
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_RETRY, game::HUD_QUIT} && s.shows("사망") && s.shows("다시 하기") && s.shows("메인 메뉴로") && s.shows("점수 0 · 방 0/1"),
         "끝난 화면: 제목, 점수와 비운 방 수, 단추 둘");
  expect(all_baked(s.state()) && fits(s.state()), "끝난 화면: 글자가 모두 글꼴에 있고 판 안에 든다");
  {
    game::HudState cleared = s.state();
    cleared.outcome = game::World::Outcome::cleared;
    cleared.score = 1234567;
    cleared.rooms_cleared = cleared.rooms_total = 9;
    expect(shows(cleared, "층 완료") && !shows(cleared, "사망") && shows(cleared, "점수 1234567 · 방 9/9") && all_baked(cleared) && fits(cleared), "층을 다 비웠으면 제목이 층 완료다");
  }
  expect(!s.capture(false).new_game && s.menu.screen == Screen::over && s.escape().focus == 0, "끝난 화면에서 포인터가 풀려도(ESC) 그 화면에 남는다");
  // 빈 곳을 눌러도 포커스가 풀리지 않는다 — 첫 단추로 돌아와 Enter 가 닿는다 (메인 메뉴·일시정지에서는 풀린 채로 둔다)
  s.key("ArrowDown");
  expect(s.ui.ui().focus == game::HUD_QUIT, "글쇠로 단추를 오간다");
  s.press_at(1000, 100);
  expect(s.ui.ui().focus == game::HUD_RETRY && game::resting_focus(s.menu) == game::HUD_RETRY, "끝난 화면: 빈 곳을 눌러도 포커스는 다시 하기에 남는다");
  {
    Menu other;
    expect(game::resting_focus(other) == 0, "메인 메뉴: 빈 곳을 누르면 포커스가 풀린다 (입력 칸에서 손을 뗀다)");
    other.screen = Screen::paused;
    expect(game::resting_focus(other) == 0, "일시정지도 그대로 둔다");
  }
  s.key("ArrowDown");
  expect(s.ui.ui().focus == game::HUD_QUIT, "글쇠로 단추를 오간다");
  s.key("ArrowUp");
  outcome = s.key("Enter");
  expect(outcome.host == (game::HOST_CAPTURE_POINTER | game::HOST_RESUME_AUDIO) && !outcome.new_game && s.menu.screen == Screen::over, "다시 하기는 포인터를 잡아 달라고 한다 — 잡힐 때까지는 그 화면이다");
  outcome = s.capture(true);
  expect(outcome.new_game && s.menu.screen == Screen::playing, "끝난 화면에서 포인터가 잡히면 새 판이다");
  s.follow(game::apply_game_over(s.menu));
  outcome = s.click(game::HUD_QUIT);
  expect(s.menu.screen == Screen::main && outcome.focus == game::HUD_MENU && s.shows_logo(), "끝난 화면에서 메인 메뉴로 간다");
}

/** 저장 — 옵션을 게임이 짧은 글로 적고 읽는다 (호스트는 그대로 간직했다 돌려줄 뿐이다). 읽는 글은 믿지 않는다 */
void saved_options() {
  game::Options options;
  expect(game::encode_options(options) == "zk2 10 75 0 1 7 8 -100 1", "처음 값의 글: 감도 1.0, 시야각 75, 반전 끔, 흔들림 켬, 음악 0.7, 효과음 0.8, 판정 보정 -100, 타이밍 표시 켬");
  options = {.sensitivity = 1.5f, .fov = 90.0f, .invert_y = true, .shake = false, .music = 0.3f, .effects = 1.0f, .judge_offset = -40.0f, .timing = false};
  const std::string text = game::encode_options(options);
  expect(text == "zk2 15 90 1 0 3 10 -40 0", "고친 값의 글");
  game::Options read;
  const auto near = [](float a, float b) { return std::abs(a - b) < 1e-6f; };
  expect(game::decode_options(text, read) && near(read.sensitivity, 1.5f) && read.fov == 90.0f && read.invert_y && !read.shake && near(read.music, 0.3f) && near(read.effects, 1.0f) &&
             read.judge_offset == -40.0f && !read.timing,
         "적은 글을 읽으면 같은 옵션이다");
  expect(game::encode_options(read) == text, "다시 적으면 같은 글이다");
  // 범위의 양 끝
  expect(game::decode_options("zk2 2 60 0 0 0 0 -200 0", read) && near(read.sensitivity, 0.2f) && read.fov == 60.0f && read.music == 0.0f && read.judge_offset == -200.0f, "범위의 아래 끝은 받는다");
  expect(game::decode_options("zk2 30 110 1 1 10 10 200 1", read) && near(read.sensitivity, 3.0f) && read.fov == 110.0f && near(read.effects, 1.0f) && read.judge_offset == 200.0f && read.timing,
         "범위의 위 끝은 받는다");
  // 범위 안의 값은 옵션의 칸에 맞춘다 — 시야각 77 은 75 (5 도 칸), 판정 보정 43 은 40 (10 ms 칸)
  expect(game::decode_options("zk2 10 77 0 1 7 8 43 0", read) && read.fov == 75.0f && read.judge_offset == 40.0f, "칸에 맞춘다");
  // 깨진 글과 범위 밖의 값은 통째로 버린다 — 아무것도 고치지 않는다
  const game::Options before = read;
  bool rejected = true;
  for (const char* broken : {"",
                             "zk2",
                             // 예전 버전의 글 — 그때의 처음 값(판정 보정 0)이 새 처음 값을 덮지 않게 버린다
                             "zk1 10 75 0 1 7 8 0 1",
                             "zk1 15 90 1 0 3 10 -40 0",
                             // 모르는 버전
                             "zk3 10 75 0 1 7 8 0 0",
                             "ZK2 10 75 0 1 7 8 0 0",
                             "zk20 75 0 1 7 8 0 0",
                             "zk2 10 75 0 1 7 8 0",
                             "zk2 10 75 0 1 7 8 0 0 0",
                             "zk2 10 75 0 1 7 8 0 0 ",
                             "zk2  10 75 0 1 7 8 0 0",
                             " zk2 10 75 0 1 7 8 0 0",
                             "zk2 1x 75 0 1 7 8 0 0",
                             "zk2 10 75 0 1 7 8 0.5 0",
                             "zk2 +10 75 0 1 7 8 0 0",
                             "zk2 10,75,0,1,7,8,0,0",
                             "zk2 1 75 0 1 7 8 0 0",
                             "zk2 31 75 0 1 7 8 0 0",
                             "zk2 10 59 0 1 7 8 0 0",
                             "zk2 10 111 0 1 7 8 0 0",
                             "zk2 10 75 2 1 7 8 0 0",
                             "zk2 10 75 0 -1 7 8 0 0",
                             "zk2 10 75 0 1 11 8 0 0",
                             "zk2 10 75 0 1 7 -1 0 0",
                             "zk2 10 75 0 1 7 8 201 0",
                             "zk2 10 75 0 1 7 8 -201 0",
                             "zk2 10 75 0 1 7 8 0 2",
                             "zk2 99999999999999999999 75 0 1 7 8 0 0",
                             // 값은 맞지만 너무 길다 (64 자 초과)
                             "zk2 00000000000000000000000000000000000000000000000000000010 75 0 1 7 8 0 0"}) {
    if (!game::decode_options(broken, read) && read == before) continue;
    std::printf("받아들인 깨진 글: \"%s\"\n", broken);
    rejected = false;
  }
  expect(rejected, "깨진 글·모르는 버전·칸 수가 다른 글·정수가 아닌 값·범위 밖의 값·너무 긴 글은 버리고 아무것도 고치지 않는다");
  // 위젯으로 닿는 값은 모두 적었다 읽으면 같다 (감도 0.2…3.0, 시야각 60…110, 음량 0…1, 판정 보정 ±200)
  bool round_trip = true;
  for (int i = 0; i <= 40; i++) {
    const game::Options from{.sensitivity = static_cast<float>(2 + i % 29) / 10.0f, .fov = 60.0f + 5.0f * static_cast<float>(i % 11), .invert_y = i % 2 == 0, .shake = i % 3 == 0,
                             .music = static_cast<float>(i % 11) * 0.1f, .effects = static_cast<float>((i * 7) % 11) * 0.1f, .judge_offset = static_cast<float>(i * 10 - 200), .timing = i % 5 == 0};
    game::Options to;
    round_trip = round_trip && game::decode_options(game::encode_options(from), to) && to == from;
  }
  expect(round_trip, "위젯으로 닿는 값은 적었다 읽으면 같다");
}

/** 방 찾기·방 만들기 — 서버와의 연결에 따라 누를 수 있는 조건과 서버에 보낼 요청 */
void lobby_panels() {
  Session s;
  expect(!game::wants_lobby(s.menu, s.lobby), "혼자 하기를 골라 둔 동안은 로비 서버에 붙지 않는다");
  s.menu.item = MenuItem::find;
  s.arrange();
  expect(game::wants_lobby(s.menu, s.lobby), "방 찾기를 고르면 로비 서버에 붙어야 한다");
  // 끊긴 상태 — 다시 연결 단추가 나오고, 그것만 요청을 낸다
  expect(s.shows("서버 연결 끊김") && s.disabled(game::HUD_JOIN) && s.enabled(game::HUD_RECONNECT),
         "끊겨 있으면 참가는 꺼지고 다시 연결 단추가 있다");
  expect(only(s.click(game::HUD_RECONNECT), {.kind = LobbyRequest::Kind::reconnect}), "다시 연결은 서버에 다시 붙으라고 요청한다");
  s.menu.item = MenuItem::create;
  s.arrange();
  expect(game::wants_lobby(s.menu, s.lobby) && s.disabled(game::HUD_CREATE) && only(s.click(game::HUD_RECONNECT), {.kind = LobbyRequest::Kind::reconnect}),
         "방 만들기에도 끊겨 있으면 다시 연결 단추가 있다");
  // 연결 실패·끊김·거절의 문구(한 줄)는 모두 글꼴에 있고 두 패널의 판 안에 든다
  for (const MenuItem item : {MenuItem::find, MenuItem::create}) {
    s.menu.item = item;
    for (const uint16_t code : {1006, 1009, 1013}) {
      game::net::closed(s.lobby, code);
      s.arrange();
      expect(s.lobby.link == Lobby::Link::offline && all_baked(s.state()) && fits(s.state()), "끊긴 까닭이 판 안에 든다");
    }
    s.lobby.link = Lobby::Link::online;
    game::net::closed(s.lobby, 1006);
    s.arrange();
    expect(s.shows("오류: 서버 연결 끊김") && all_baked(s.state()) && fits(s.state()), "오류는 앞에 '오류:' 를 붙인 한 줄로 보인다");
    game::net::broken(s.lobby);
    s.arrange();
    expect(all_baked(s.state()) && fits(s.state()), "풀지 못한 프레임으로 끊은 까닭이 판 안에 든다");
    s.lobby = {};
    s.lobby.link = Lobby::Link::online;
    for (int code = 1; code <= 15; code++) {
      for (const uint8_t request : {0x02, 0x03}) {
        s.lobby.error = game::net::refusal_text(static_cast<uint8_t>(code), request);
        s.arrange();
        expect(!s.lobby.error.empty() && all_baked(s.state()) && fits(s.state()), "서버가 거절한 까닭이 판 안에 든다");
      }
    }
    s.lobby = {};
  }

  s.lobby.link = Lobby::Link::connecting;
  s.menu.item = MenuItem::find;
  s.arrange();
  expect(s.shows("불러오는 중…") && s.shows("연결 중…") && s.disabled(game::HUD_JOIN) && !s.region(game::HUD_RECONNECT), "연결하는 중에는 단추가 꺼져 있고 그 까닭이 보인다 (다시 연결 단추는 없다)");
  expect(all_baked(s.state()), "연결하는 중: 글자가 모두 글꼴에 있다");

  s.lobby.link = Lobby::Link::online;
  s.lobby.player_id = 8;
  s.arrange();
  expect(s.shows("열린 방 없음") && !s.region(game::HUD_RECONNECT) && s.disabled(game::HUD_JOIN) && s.shows("닉네임 필요"), "연결됐지만 닉네임이 없다");
  s.menu.nickname = " kor";
  s.arrange();
  expect(s.disabled(game::HUD_JOIN) && s.shows("닉네임 앞뒤 공백 불가"), "공백으로 시작하는 닉네임은 받지 않는다");
  s.menu.nickname = "kor";
  s.arrange();
  expect(s.shows("열린 방 없음") && !s.shows("닉네임 필요") && s.disabled(game::HUD_JOIN), "방이 없으면 참가할 수 없다");

  s.lobby.rooms = {{.id = 3, .name = "first", .players = 1, .max_players = 4, .playing = false},
                   {.id = 5, .name = "full", .players = 2, .max_players = 2, .playing = false},
                   {.id = 9, .name = "busy", .players = 2, .max_players = 4, .playing = true}};
  s.arrange();
  expect(s.shows("first · 1/4 · 대기 중") && s.shows("full · 2/2 · 대기 중") && s.shows("busy · 2/4 · 진행 중"), "방마다 이름·인원·상태가 글로 보인다");
  expect(s.disabled(game::HUD_JOIN) && s.shows("방 선택 필요"), "방을 고르기 전에는 참가할 수 없다");
  expect(all_baked(s.state()) && fits(s.state()), "방 목록: 글자가 모두 글꼴에 있고 판 안에 든다");
  s.click(game::HUD_ROOMS, 1);
  expect(s.menu.room == 5u && s.disabled(game::HUD_JOIN) && s.shows("방이 가득 참"), "가득 찬 방");
  s.key("ArrowDown");
  expect(s.menu.room == 9u && s.disabled(game::HUD_JOIN) && s.shows("진행 중인 방"), "진행 중인 방");
  expect(s.key("Enter").lobby.empty(), "들어갈 수 없는 방에서 Enter 는 요청을 내지 않는다");
  s.key("Home");
  expect(s.menu.room == 3u && s.enabled(game::HUD_JOIN) && !s.shows("방 선택 필요"), "들어갈 수 있는 방을 고르면 참가가 켜진다");
  expect(only(s.key("Enter"), {.kind = LobbyRequest::Kind::join, .room = 3}), "목록에서 Enter 는 고른 방에 참가를 요청한다");
  expect(only(s.click(game::HUD_JOIN), {.kind = LobbyRequest::Kind::join, .room = 3}), "참가 단추도 같은 요청을 낸다");
  // 고른 방이 목록에서 없어지면 고른 것도 없다
  s.lobby.rooms.erase(s.lobby.rooms.begin());
  s.arrange();
  expect(s.disabled(game::HUD_JOIN) && s.shows("방 선택 필요"), "고른 방이 없어지면 다시 골라야 한다");

  s.lobby.error = game::net::refusal_text(10, 0x03);
  s.arrange();
  expect(s.shows("오류: 없어진 방") && !s.shows("방 선택 필요") && all_baked(s.state()) && fits(s.state()), "서버가 거절한 까닭이 있으면 누를 수 없는 까닭 대신 그것 한 줄이 보인다");
  s.lobby.error.clear();

  s.menu.item = MenuItem::create;
  s.arrange();
  expect(s.disabled(game::HUD_CREATE) && s.shows("방 이름 필요"), "방 이름이 없으면 만들 수 없다");
  s.menu.room_name = "room ";
  s.arrange();
  expect(s.disabled(game::HUD_CREATE) && s.shows("방 이름 앞뒤 공백 불가"), "공백으로 끝나는 방 이름은 받지 않는다");
  s.menu.room_name = "room";
  s.menu.nickname.clear();
  s.arrange();
  expect(s.disabled(game::HUD_CREATE) && s.shows("닉네임 필요"), "닉네임이 없으면 만들 수 없다");
  s.menu.nickname = "kor";
  s.arrange();
  expect(s.enabled(game::HUD_CREATE) && only(s.click(game::HUD_CREATE), {.kind = LobbyRequest::Kind::create}), "이름과 닉네임이 있으면 만들기를 요청한다");
}

/** 대기실 — 로비가 방에 들어가 있으면 메인 메뉴 대신 보인다 */
void waiting_room() {
  Session s;
  s.lobby.link = Lobby::Link::online;
  s.lobby.player_id = 8;
  s.lobby.room = Lobby::Room{.id = 3, .name = "first", .max_players = 4, .host = 7, .playing = false,
                             .members = {{.id = 7, .nickname = "host", .ready = false}, {.id = 8, .nickname = "kor", .ready = false}}};
  s.arrange();
  expect(s.shows("대기실") && s.shows("first") && s.shows("참가자 2/4") && !s.shows_logo(), "방에 들어가 있으면 대기실이 보인다");
  expect(s.shows("host · 방장") && s.shows("kor (나) · 준비 안 함"), "참가자마다 방장·준비가 글로 보이고 나는 표시된다");
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_READY, game::HUD_LEAVE} && s.shows("준비") && s.shows("나가기") && s.shows("방장 대기 중"),
         "방장이 아니면 준비와 나가기 단추가 있다");
  expect(all_baked(s.state()) && fits(s.state()), "대기실: 글자가 모두 글꼴에 있고 판 안에 든다");
  expect(only(s.click(game::HUD_READY), {.kind = LobbyRequest::Kind::ready, .ready = true}), "준비 단추는 준비를 요청한다");
  s.lobby.room->members[1].ready = true;
  s.arrange();
  expect(s.shows("kor (나) · 준비") && s.shows("준비 취소"), "준비한 뒤에는 준비 취소 단추가 된다");
  expect(only(s.click(game::HUD_READY), {.kind = LobbyRequest::Kind::ready, .ready = false}), "준비 취소는 준비를 푼다고 요청한다");
  expect(only(s.click(game::HUD_LEAVE), {.kind = LobbyRequest::Kind::leave}), "나가기는 방에서 나간다고 요청한다");
  expect(s.escape().focus == 0, "대기실에서 ESC 는 아무것도 바꾸지 않는다 (나가기는 단추로)");
  expect(game::wants_lobby(s.menu, s.lobby), "방에 들어가 있는 동안은 (혼자 하기 항목이어도) 서버와 이어져 있어야 한다");

  // 방장 — 모두 준비해야 시작할 수 있다
  s.lobby.player_id = 7;
  s.lobby.room->members[1].ready = false;
  s.arrange();
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_ROOM_START, game::HUD_LEAVE} && s.disabled(game::HUD_ROOM_START) && s.shows("전원 준비 대기 중"),
         "방장에게는 시작 단추가 있고, 준비하지 않은 사람이 있으면 꺼져 있다");
  expect(s.shows("host (나) · 방장") && s.shows("kor · 준비 안 함") && all_baked(s.state()) && fits(s.state()), "방장이 보는 대기실");
  s.lobby.room->members[1].ready = true;
  s.arrange();
  expect(s.enabled(game::HUD_ROOM_START) && only(s.click(game::HUD_ROOM_START), {.kind = LobbyRequest::Kind::start}), "모두 준비하면 시작을 요청할 수 있다");
  // 닉네임 12 자, 방 이름 20 자의 한글도 판 안에 든다
  s.lobby.room->name = "가나다라마바사아자차카타파하가나다라마바";
  s.lobby.room->members[1].nickname = "가나다라마바사아자차카타";
  s.lobby.room->members[1].ready = false;
  s.lobby.player_id = 8;
  s.arrange();
  expect(fits(s.state()), "가장 긴 방 이름과 닉네임도 판 안에 든다");
  // 정원 8 명이 다 차고 거절 문구까지 떠도 판 안에 든다
  s.lobby.room->max_players = 8;
  while (s.lobby.room->members.size() < 8) s.lobby.room->members.push_back({.id = 100 + static_cast<uint32_t>(s.lobby.room->members.size()), .nickname = "가나다라마바사아자차카타", .ready = true});
  s.lobby.error = game::net::refusal_text(14, 0x06);
  s.arrange();
  expect(s.shows("참가자 8/8") && s.shows("오류: 준비 안 된 참가자 있음") && fits(s.state()), "여덟 명의 대기실과 거절 문구가 판 안에 든다");

  // 방이 시작됐다 — 준비·시작 대신 입장. 서버가 판을 돌리지 않는다는 것을 그대로 적는다
  s.lobby.room->playing = true;
  s.arrange();
  expect(s.ids() == std::vector<engine::hud::Id>{game::HUD_ROOM_ENTER, game::HUD_LEAVE} && s.shows("입장") && s.shows("게임 시작 · 협동 미지원 — 각자 진행") &&
             !s.shows("가나다라마바사아자차카타 · 준비"),
         "시작된 방에는 입장과 나가기 단추가 있고, 함께 하는 판이 아니라고 적혀 있다");
  expect(all_baked(s.state()) && fits(s.state()), "시작된 방: 글자가 모두 글꼴에 있고 여덟 명과 거절 문구까지 판 안에 든다");
  s.lobby.error.clear();
  game::HudOutcome outcome = s.click(game::HUD_ROOM_ENTER);
  expect(outcome.host == (game::HOST_CAPTURE_POINTER | game::HOST_RESUME_AUDIO) && outcome.lobby.empty() && s.menu.screen == Screen::main, "입장은 포인터를 잡아 달라고 한다 (화면은 잡힌 뒤에 바뀐다)");
  expect(s.capture(true).new_game && s.menu.screen == Screen::playing && game::wants_lobby(s.menu, s.lobby), "포인터가 잡히면 새 판이 열리고, 방에 있는 동안 서버와 이어져 있다");
  s.capture(false);
  outcome = s.click(game::HUD_QUIT);
  expect(s.menu.screen == Screen::main && only(outcome, {.kind = LobbyRequest::Kind::leave}), "방의 판에서 메인 메뉴로 가면 방에서 나간다고 요청한다");

  // 서버가 보낸 것으로 로비가 바뀌면 포커스가 따라간다
  {
    const Menu menu;
    Lobby out;
    out.link = Lobby::Link::online;
    out.player_id = 8;
    Lobby guest = out, host = out, playing = out;
    guest.room = Lobby::Room{.id = 3, .name = "r", .max_players = 4, .host = 7, .playing = false, .members = {{.id = 7, .nickname = "h", .ready = false}, {.id = 8, .nickname = "k", .ready = false}}};
    host.room = Lobby::Room{.id = 3, .name = "r", .max_players = 4, .host = 8, .playing = false, .members = {{.id = 8, .nickname = "k", .ready = false}}};
    playing.room = guest.room;
    playing.room->playing = true;
    expect(game::lobby_focus(menu, out, guest) == game::HUD_READY && game::lobby_focus(menu, out, host) == game::HUD_ROOM_START, "대기실에 들어가면 준비(방장은 시작) 단추가 포커스를 갖는다");
    expect(game::lobby_focus(menu, guest, guest) == 0 && game::lobby_focus(menu, out, out) == 0, "방이 그대로면 포커스도 그대로다");
    expect(game::lobby_focus(menu, guest, host) == game::HUD_ROOM_START, "방장이 나가 내가 방장이 되면 시작 단추로");
    expect(game::lobby_focus(menu, guest, playing) == game::HUD_ROOM_ENTER && game::lobby_focus(menu, playing, playing) == 0, "방이 시작되면 입장 단추로");
    expect(game::lobby_focus(menu, guest, out) == game::HUD_MENU && game::lobby_focus(menu, playing, Lobby{}) == game::HUD_MENU, "방에서 나오거나 끊기면 메뉴 항목으로");
    Menu paused;
    paused.screen = Screen::paused;
    expect(game::lobby_focus(paused, playing, Lobby{}) == 0 && !game::wants_lobby(paused, Lobby{}), "일시정지 중에 끊기면 포커스는 그대로이고, 방이 없으니 서버에 붙지 않는다");
  }

  s.lobby.room.reset();
  s.lobby.rooms = {{.id = 3, .name = "가나다라마바사아자차카타파하가나다라마바", .players = 8, .max_players = 8, .playing = true}};
  s.menu.item = MenuItem::find;
  s.arrange();
  expect(s.shows("가나다라마바사아자차카타파하가나다라마바 · 8/8 · 진행 중") && fits(s.state()), "가장 긴 방 이름의 목록 줄도 판 안에 든다");
}

/** 메뉴의 바탕 — 배경 그림 한 장(없으면 번지는 기본 바탕)이 화면을 덮고, 게임 중·일시정지에는 깔리지 않는다 */
void backdrop() {
  using Kind = engine::hud::DrawItem::Kind;
  game::HudState state{};
  engine::hud::DrawList list = drawn(state);
  expect(!list.empty() && list[0].kind == Kind::rect && list[0].x == 0 && list[0].y == 0 && list[0].width == 1280 && list[0].height == 720 &&
             !(list[0].color == list[0].color_end) && list[0].fade == engine::hud::Fade::down,
         "그림이 없으면 맨 밑에 위에서 아래로 번지는 바탕이 화면을 덮는다");
  expect(std::none_of(list.begin(), list.end(), [](const engine::hud::DrawItem& item) { return item.kind == Kind::image; }), "그림이 없으면 그림을 그리지 않는다");

  // 2560×1440 그림은 1280×720 화면과 비율이 같다 — 전체가 보인다
  state.backdrop = {7, 2560, 1440};
  list = drawn(state);
  expect(!list.empty() && list[0].kind == Kind::image && list[0].image == 7 && list[0].width == 1280 && list[0].height == 720 &&
             list[0].source == engine::hud::Rect{0, 0, 2560, 1440},
         "그림이 있으면 맨 밑에 그림 한 장이 화면을 덮는다");
  // 1600×600 그림을 800×600 화면에 — 배율 1 로 800×600 이 보이고, 좌우로 남는 800 에서 6/10 자리(큰 헤드론 쪽)를 남긴다 → x 480
  state.backdrop = {7, 1600, 600};
  list = drawn(state, SMALL);
  expect(!list.empty() && list[0].kind == Kind::image && std::abs(list[0].source.x - 480.0f) < 0.01f && list[0].source.y == 0 && list[0].source.width == 800 &&
             list[0].source.height == 600,
         "화면이 그림보다 좁으면 가운데에서 오른쪽을 남기고 좌우를 자른다");
  // 600×1200 그림을 800×600 화면에 — 배율 4/3 으로 600×450 이 보이고, 위아래로 남는 750 에서 0.15 자리(위쪽)를 남긴다 → y 112.5
  state.backdrop = {7, 600, 1200};
  list = drawn(state, SMALL);
  expect(!list.empty() && list[0].kind == Kind::image && list[0].source.x == 0 && std::abs(list[0].source.y - 112.5f) < 0.01f && std::abs(list[0].source.height - 450.0f) < 0.01f,
         "화면이 그림보다 납작하면 위쪽을 남기고 위아래를 자른다");

  state.lobby.room = Lobby::Room{.id = 3, .name = "r", .max_players = 4, .host = 7, .playing = false, .members = {{.id = 7, .nickname = "h", .ready = false}}};
  list = drawn(state);
  expect(!list.empty() && list[0].kind == Kind::image, "대기실의 바탕도 그 그림이다");
  state.lobby.room.reset();
  for (const Screen screen : {Screen::playing, Screen::paused, Screen::over}) {
    state.menu.screen = screen;
    list = drawn(state);
    expect(std::none_of(list.begin(), list.end(), [](const engine::hud::DrawItem& item) { return item.kind == Kind::image; }), "게임 중과 일시정지·끝난 화면에는 배경 그림을 깔지 않는다 (장면이 보인다)");
  }
}

/** 스테레오 출력의 [from, to) 표본에서 가장 큰 크기 */
float loudest(const std::vector<float>& out, std::size_t from, std::size_t to) {
  float peak = 0.0f;
  for (std::size_t i = from * 2; i < to * 2 && i < out.size(); i++) peak = std::max(peak, std::fabs(out[i]));
  return peak;
}

/**
 * 효과음을 미리 써 둔 구간에 덧쓰기 — 이미 낸 구간으로 되돌아가(rewind) 효과음을 걸고 다시 내면, 처음부터 그 자리에 효과음을 건 것과 표본까지 같다.
 * 조립 지점은 50 ms 를 미리 써 두지만 효과음은 15 ms 뒤의 자리에 넣는다 (그만큼 덜 늦게 들린다)
 */
void sound_rewrite(const engine::audio::Bank& bank, const engine::audio::Song& song) {
  constexpr std::size_t BLOCK = 480, BLOCKS = 5, TOTAL = BLOCK * BLOCKS;
  const auto block = [](std::vector<float>& out, std::size_t from, std::size_t frames) { return std::span{out}.subspan(from * 2, frames * 2); };
  game::World world(two_rooms(), kit);
  for (int i = 0; i < 20; i++) world.step();

  // 덧쓰는 쪽 — 10 ms 씩 다섯 블록(0…2400)을 미리 냈다. 그 뒤에 총이 나갔고, 표본 700 에 발사음을 넣는다
  game::Sound ahead(bank, song, 48000);
  ahead.set_volume(game::Options{});
  ahead.restart(world);
  expect(!ahead.rewind(0), "낸 구간이 없으면 되돌아갈 자리가 없다");
  ahead.start_music(0, 0);
  std::vector<float> first(TOTAL * 2), rewritten(TOTAL * 2);
  for (std::size_t i = 0; i < BLOCKS; i++) ahead.render(block(first, i * BLOCK, BLOCK), i * BLOCK);
  world.act(game::Action::fire);
  expect(ahead.audible(world), "발사음을 낼 일이 있다");
  const auto from = ahead.rewind(700);
  expect(from == 480u, "표본 700 을 품은 블록의 처음(480)으로 되돌아간다");
  ahead.follow(world, 700 - 480);
  rewritten = first;
  ahead.render(block(rewritten, 480, TOTAL - 480), 480);

  // 기준 — 같은 음악을 표본 700 까지 내고, 거기서 발사음을 걸고 이어 낸다
  game::World quiet(two_rooms(), kit);
  for (int i = 0; i < 20; i++) quiet.step();
  game::Sound direct(bank, song, 48000);
  direct.set_volume(game::Options{});
  direct.restart(quiet);
  direct.start_music(0, 0);
  std::vector<float> expected(TOTAL * 2);
  direct.render(block(expected, 0, 700), 0);
  quiet.act(game::Action::fire);
  direct.follow(quiet);
  direct.render(block(expected, 700, TOTAL - 700), 700);

  expect(std::equal(first.begin(), first.begin() + 700 * 2, expected.begin()), "효과음 앞의 구간은 처음 낸 것 그대로다 (음악이 같다)");
  expect(rewritten == expected, "되돌아가 다시 낸 구간은 처음부터 그 자리에 효과음을 건 것과 표본까지 같다");
  expect(!std::equal(first.begin() + 700 * 2, first.end(), expected.begin() + 700 * 2) && loudest(rewritten, 700, 1180) > loudest(first, 700, 1180),
         "덧쓴 구간에는 발사음이 표본 700 부터 들어 있다");
  // 되돌아간 뒤에도 이어서 낼 수 있고, 다시 되돌아갈 수 있다 (다시 낸 구간이 새로 기억된다). 음악을 끊으면 기억이 지워진다
  expect(ahead.rewind(2399) == 480u && ahead.rewind(100) == 0u, "다시 낸 구간(480 부터)이 새로 기억되고, 그 앞의 기억(0)도 남아 있다");
  ahead.stop_music();
  expect(!ahead.rewind(2399), "음악을 끊으면 되돌아갈 자리가 없다");
}

/** 게임의 소리 — 묻힌 샘플 뱅크와 곡으로, 세계의 일이 효과음이 되고 전투의 흐름이 층이 된다 */
void sound() {
  const auto bank = engine::audio::Bank::decode(game::assets::sample_bank());
  expect(bank.has_value(), "묻힌 샘플 뱅크가 풀린다");
  if (!bank) return;
  const auto song = engine::audio::Song::decode(game::assets::pulse_song(), static_cast<uint32_t>(bank->samples().size()));
  expect(song.has_value(), "묻힌 곡이 그 뱅크의 샘플로 풀린다");
  if (!song) return;
  sound_rewrite(*bank, *song);
  for (const char* name : {"kick_a", "kick_b", "snare_a", "snare_b", "hat_closed_a", "hat_closed_b", "hat_open", "crash", "shot", "magazine_out", "magazine_in", "slide", "dry",
                           "dash", "jump", "land", "step_l1", "step_l2", "step_l3", "step_r1", "step_r2", "step_r3", "hurt", "hit", "kill_stone", "kill_glass", "windup_stone", "charge",
                           "windup_cast", "bolt", "bolt_wall", "gate_close", "gate_open", "portal_open", "portal_enter", "ui_move", "ui_press"}) {
    const auto index = bank->find(name);
    // 샘플은 44.1 kHz 로 손질해 두었고, 가장 긴 것(크래시)이 3.5 초다
    expect(index && bank->samples()[*index].rate == 44100 && !bank->samples()[*index].frames.empty() && bank->samples()[*index].frames.size() <= 44100 * 4, name);
  }
  // 예고의 소리는 예고만큼 길다 — 돌 정령 80 틱(1.33 초), 헤드론 조각 40 틱(0.67 초). 44.1 kHz 에서 58800·29400 표본 (손질 때 앞뒤 무음이 조금 잘린다)
  const auto length = [&](const char* name) { return bank->find(name) ? bank->samples()[*bank->find(name)].frames.size() : 0; };
  expect(length("windup_stone") > 56000 && length("windup_stone") <= 58800 && length("windup_cast") > 28000 && length("windup_cast") <= 29600, "예고의 소리는 예고의 길이와 같다");
  // 곡의 박자는 게임의 박자다 — 한 마디는 네 박(160 틱), 맥박 층은 박마다 킥을 친다
  const auto pulse = song->layer("pulse"), combat = song->layer("combat");
  expect(song->tick_rate == game::TICK_RATE && song->bar_ticks == 4 * game::TICKS_PER_BEAT && pulse && combat, "곡: 초당 60 틱, 한 마디 160 틱, 층 pulse 와 combat");
  if (!pulse || !combat) return;
  int kicks = 0, hats = 0;
  for (const engine::audio::Note& note : song->layers[*pulse].notes) {
    const std::string& name = bank->samples()[note.sample].name;
    if (name.starts_with("kick") && note.tick % game::TICKS_PER_BEAT == 0) kicks++;
    if (name.starts_with("hat") && note.tick % game::TICKS_PER_SLOT == 0) hats++;
  }
  expect(song->loop_ticks == 2560 && kicks == 64 && hats == 128, "맥박 층: 열여섯 마디에 박마다 킥 64, 반박마다 하이햇 128");
  // 층 — 게임이 이름으로 부르는 아홉이 모두 있다. 음높이가 있는 악기의 음은 E 단조(E F# G A B C D — 딸림화음 B 위에서는 D 가 D#) 안이고, 근음 샘플에서 3 반음 안으로만 옮겨 낸다
  const char* const layer_names[] = {"pulse", "calm", "roam", "combat", "x2", "x3", "x4", "lead", "hum"};
  bool layers_ok = true, in_key = true, in_reach = true;
  // 근음 (MIDI 번호) — content/audio/samples.txt 의 root 와 같아야 한다. tune 은 재생 속도에서 덜어 낸 센트
  struct Root {
    const char* name;
    int midi;
    float tune;
  };
  static constexpr Root ROOTS[] = {
      {"timp_fs2", 42, -43.0f}, {"timp_b2", 47, -14.0f}, {"timp_d3", 50, -42.0f}, {"bell_c4", 60, 3.0f}, {"bell_e4", 64, 4.0f}, {"bell_gs4", 68, 5.0f},
      {"bell_c5", 72, 6.0f}, {"bell_e5", 76, 11.0f}, {"bass_e1_a", 28, 23.0f}, {"bass_e1_b", 28, 23.0f}, {"bass_fs1", 30, 9.0f}, {"bass_fs1_b", 30, 4.0f},
      {"bass_a1_a", 33, 0.0f}, {"bass_a1_b", 33, 0.0f}, {"bass_c2", 36, 0.0f}, {"bass_c2_b", 36, -1.0f}, {"bass_eb2", 39, 8.0f}, {"bass_eb2_b", 39, 2.0f},
      {"bass_fs2", 42, 0.0f}, {"bass_fs2_b", 42, 0.0f}, {"bass_a2", 45, 7.0f}, {"bass_a2_b", 45, 1.0f}, {"gtr_e2_a", 40, 10.0f}, {"gtr_e2_b", 40, 10.0f},
      {"gtr_f2_a", 41, 8.0f}, {"gtr_f2_b", 41, 8.0f}, {"gtr_a2_a", 45, 9.0f}, {"gtr_a2_b", 45, 9.0f}, {"gtr_c3_a", 48, 5.0f}, {"gtr_c3_b", 48, 5.0f},
      {"gtr_d3_a", 50, 0.0f}, {"gtr_d3_b", 50, 0.0f}, {"gtr_e3_a", 52, 5.0f}, {"gtr_e3_b", 52, 6.0f}, {"gtr_g3_a", 55, 0.0f}, {"gtr_g3_b", 55, 0.0f},
      {"gtr_c2_a", 36, 20.0f}, {"gtr_c2_b", 36, 15.0f}, {"gtr_b3_a", 59, 0.0f}, {"gtr_b3_b", 59, 0.0f}, {"gtr_cs4_a", 61, -2.0f}, {"gtr_cs4_b", 61, -1.0f},
      {"gtr_e4_a", 64, -1.0f}, {"gtr_e4_b", 64, -2.0f}, {"gtr_g4_a", 67, 0.0f}, {"gtr_g4_b", 67, 1.0f},
      {"lead_e4_b", 64, -2.0f}, {"lead_g4_b", 67, 1.0f}, {"lead_b4_a", 71, 1.0f}, {"lead_b4_c", 71, 1.0f}, {"lead_b4_b", 71, 1.0f}, {"lead_d5_a", 74, 4.0f},
      {"lead_d5_c", 74, 4.0f}, {"lead_d5_b", 74, 4.0f}, {"lead_f5_a", 77, 2.0f}, {"lead_f5_c", 77, 2.0f}, {"lead_gs5_a", 80, 0.0f}, {"lead_gs5_c", 80, -1.0f},
      {"lead_bb5_a", 82, 3.0f}, {"lead_bb5_c", 82, 2.0f}, {"spic_fs4_a", 66, 1.0f}, {"spic_fs4_b", 66, -5.0f}, {"spic_a4_a", 69, -1.0f}, {"spic_a4_b", 69, 5.0f},
      {"spic_c5_a", 72, 0.0f}, {"spic_c5_b", 72, 5.0f}, {"spic_e5_a", 76, -1.0f}, {"spic_e5_b", 76, 0.0f}, {"spic_g5_a", 79, 1.0f}, {"spic_g5_b", 79, -2.0f},
      {"spic_b5_a", 83, 0.0f}, {"spic_b5_b", 83, 5.0f}, {"cello_c2", 36, 0.0f}, {"cello_e2", 40, -3.0f}, {"cello_g2", 43, 0.0f}, {"cello_b2", 47, 0.0f},
      {"cello_d3", 50, 0.0f}, {"violins_fs4", 66, 1.0f}, {"violins_c5", 72, -3.0f}, {"violins_e5", 76, -2.0f}, {"trumpet_bb4", 70, 1.0f}, {"trumpet_d5", 74, 5.0f},
      {"trumpet_f5", 77, 3.0f}, {"voice_c3", 48, -21.0f}, {"voice_eb3", 51, -44.0f}, {"voice_fs3", 54, -48.0f}, {"voice_a3", 57, -48.0f}};
  const auto root_of = [&](const engine::audio::Note& note) {
    const std::string& sample = bank->samples()[note.sample].name;
    const auto root = std::find_if(std::begin(ROOTS), std::end(ROOTS), [&](const Root& r) { return sample == r.name; });
    return root == std::end(ROOTS) ? nullptr : &*root;
  };
  // 음의 MIDI 번호 — 재생 속도에서 되짚는다: 반음 = 12·log2(속도) + tune / 100
  const auto midi_of = [&](const engine::audio::Note& note) { return root_of(note)->midi + static_cast<int>(std::lround(12.0f * std::log2(note.pitch) + root_of(note)->tune / 100.0f)); };
  // E 단조의 음 (C 부터의 반음 수): E 4, F# 6, G 7, A 9, B 11, C 0, D 2 — 그리고 딸림화음의 D# 3
  static constexpr bool E_MINOR[12] = {true, false, true, true, true, false, true, true, false, true, false, true};
  uint32_t pitched = 0, leading = 0;
  for (const char* name : layer_names) {
    const auto index = song->layer(name);
    layers_ok = layers_ok && index && !song->layers[*index].notes.empty();
    if (!index) continue;
    for (const engine::audio::Note& note : song->layers[*index].notes) {
      const Root* root = root_of(note);
      if (!root) {
        // 타악 — 제 속도로, 끝까지
        in_reach = in_reach && note.pitch == 1.0f && note.length == 0;
        continue;
      }
      pitched++;
      const float semitones = 12.0f * std::log2(note.pitch) + root->tune / 100.0f;
      const int shift = static_cast<int>(std::lround(semitones));
      in_reach = in_reach && std::abs(semitones - static_cast<float>(shift)) < 1e-3f && std::abs(shift) <= 3 && note.length >= 5 && note.length <= 160;
      in_key = in_key && E_MINOR[static_cast<std::size_t>((root->midi + shift) % 12)];
      // D# 은 B 화음의 자리(8 마디, 16 마디의 뒤 반)에만 온다
      if ((root->midi + shift) % 12 == 3) {
        leading++;
        in_key = in_key && (note.tick / 160 == 7 || (note.tick / 160 == 15 && note.tick % 160 >= 80));
      }
    }
  }
  expect(layers_ok, "곡의 층: pulse · calm · roam · combat · x2 · x3 · x4 · lead · hum");
  expect(pitched > 600 && in_reach, "음높이가 있는 악기의 음은 근음 샘플에서 3 반음 안으로 옮겨 내고, 32분 한 칸(5 틱)…한 마디 길이다. 타악은 제 속도로 끝까지");
  expect(in_key && leading > 0, "음은 모두 E 단조 음계 안이고, D# 은 딸림화음 B 의 자리(8 마디와 16 마디의 뒤 반)에만 온다");
  // 손으로 센 것: calm 의 첫 음은 베이스 E1 — 26 센트 높게 녹음된 샘플이라 2^(-23/1200) = 0.98680 배로 느리게, 14 칸(140 틱) 동안
  if (const auto calm = song->layer("calm"); calm && !song->layers[*calm].notes.empty()) {
    const engine::audio::Note& first = song->layers[*calm].notes[0];
    expect(first.tick == 0 && bank->samples()[first.sample].name == "bass_e1_a" && std::abs(first.pitch - 0.98680f) < 1e-5f && first.length == 140, "calm 의 첫 음: 베이스 E1");
  }
  // combat 의 아홉째 마디(틱 1280 — B 구간의 머리)는 G 파워코드 — 왼쪽·오른쪽에 근음 G2(F2 샘플을 2 반음 위로: 2^(2/12 - 8/1200) = 1.11729)와 5 도 D3(D3 샘플 그대로) 네 음이 여섯 칸 동안
  {
    uint32_t roots = 0, fifths = 0, snares = 0;
    float left = 0.0f, right = 0.0f;
    for (const engine::audio::Note& note : song->layers[*combat].notes) {
      const std::string& sample = bank->samples()[note.sample].name;
      // 반박(8분의 뒷박 — 틱 20, 60, 100, 140)의 백비트(밝은 스네어 snare_crack, 세게): 열여섯 마디에 64 번에서 필인이 대신하는 자리를 뺀 것
      snares += sample.starts_with("snare_crack") && note.tick % 40 == 20 && note.gain > 0.9f;
      if (note.tick != 1280 || !sample.starts_with("gtr_")) continue;
      roots += sample.starts_with("gtr_f2") && std::abs(note.pitch - 1.11729f) < 1e-5f && note.length == 60;
      fifths += sample.starts_with("gtr_d3") && note.pitch == 1.0f && note.length == 60;
      (note.pan < 0.0f ? left : right) += 1.0f;
    }
    expect(roots == 2 && fifths == 2 && left == 2.0f && right == 2.0f, "combat 의 G 파워코드(아홉째 마디): 근음과 5 도가 좌우에 하나씩");
    // 열여섯 마디의 반박 64 자리에서 필인이 대신하는 여섯(4·12 마디의 넷째 박에서 하나씩, 뒤 반이 롤인 8·16 마디에서 둘씩)을 뺀다
    expect(snares == 58, "combat: 반박마다 백비트의 스네어 (필인이 대신하는 여섯 자리를 뺀 58 번)");
  }
  // x3 의 첫 마디 머리 — 전투 기타보다 한 옥타브 위의 E 파워코드: 왼쪽·오른쪽에 근음 E3 과 5 도 B3(B3 샘플 그대로) 네 음이 다섯 칸(50 틱) 동안
  if (const auto x3 = song->layer("x3")) {
    uint32_t roots = 0, fifths = 0;
    for (const engine::audio::Note& note : song->layers[*x3].notes) {
      if (note.tick != 0) continue;
      const std::string& sample = bank->samples()[note.sample].name;
      roots += sample.starts_with("gtr_e3") && note.length == 50;
      fifths += sample.starts_with("gtr_b3") && note.pitch == 1.0f && note.length == 50;
    }
    expect(roots == 2 && fifths == 2, "x3 의 첫 화음: E3 와 B3 의 파워코드가 좌우에 하나씩, 다섯 칸 동안");
  }
  // 주 리프 — 손으로 적은 것 (악보의 lead_1 … lead_16): 리프 줄(M — gtr_b3·cs4·e4·g4 의 a 테이크)과 한 옥타브 아래의 같은 줄(m — b 테이크), 줄마다 음 59 개.
  // 첫 마디의 리프 줄은 E4(네 칸) G4(두 칸) F#4(두 칸) E4(네 칸) B3(네 칸), 고리의 마지막 음은 F#4(틱 2540, 두 칸 — 첫 마디의 E4 로 내려간다).
  // 재생 속도: E4 는 gtr_e4_a(1 센트 낮다) 2^(1/1200) = 1.00058, G4 는 gtr_g4_a 그대로, F#4 는 gtr_g4_a 를 1 반음 아래로 2^(-1/12) = 0.94387, B3 은 gtr_b3_a 그대로
  if (const auto lead = song->layer("lead")) {
    std::vector<engine::audio::Note> riff;
    for (const engine::audio::Note& note : song->layers[*lead].notes) {
      const std::string& sample = bank->samples()[note.sample].name;
      if (sample == "gtr_b3_a" || sample == "gtr_cs4_a" || sample == "gtr_e4_a" || sample == "gtr_g4_a") riff.push_back(note);
    }
    std::sort(riff.begin(), riff.end(), [](const engine::audio::Note& a, const engine::audio::Note& b) { return a.tick < b.tick; });
    struct Expected {
      uint32_t tick;
      const char* sample;
      float pitch;
      uint32_t length;
    };
    static constexpr Expected HEAD[] = {{0, "gtr_e4_a", 1.00058f, 40}, {40, "gtr_g4_a", 1.0f, 20}, {60, "gtr_g4_a", 0.94387f, 20}, {80, "gtr_e4_a", 1.00058f, 40}, {120, "gtr_b3_a", 1.0f, 40}};
    bool head = riff.size() == 59 && song->layers[*lead].notes.size() == 118;
    for (std::size_t i = 0; head && i < std::size(HEAD); i++)
      head = riff[i].tick == HEAD[i].tick && bank->samples()[riff[i].sample].name == HEAD[i].sample && std::abs(riff[i].pitch - HEAD[i].pitch) < 1e-5f && riff[i].length == HEAD[i].length;
    expect(head, "lead 의 첫 마디: E4(네 칸) G4 F#4 E4(네 칸) B3(네 칸) — 줄마다 음 59 개, 옥타브 아래 줄과 합쳐 118 개");
    expect(head && riff.back().tick == 2540 && bank->samples()[riff.back().sample].name == std::string_view{"gtr_g4_a"} && std::abs(riff.back().pitch - 0.94387f) < 1e-5f && riff.back().length == 20,
           "lead 의 마지막 음: F#4 — 고리의 처음(E4)으로 내려간다");
    // 첫째·셋째 박의 머리에 놓인 음은 그 자리 화음의 음이다 — Em|Em|C|D|Em|Em|C|B · G|D|Em|C|G|D|C·D|Em·B 의 3 화음 (C 부터의 반음 수로, 마디의 앞 반과 뒤 반)
    static constexpr int EM[3] = {4, 7, 11}, C[3] = {0, 4, 7}, D[3] = {2, 6, 9}, G[3] = {7, 11, 2}, B[3] = {11, 3, 6};
    static constexpr const int* CHORDS[16][2] = {{EM, EM}, {EM, EM}, {C, C}, {D, D}, {EM, EM}, {EM, EM}, {C, C}, {B, B}, {G, G}, {D, D}, {EM, EM}, {C, C}, {G, G}, {D, D}, {C, D}, {EM, B}};
    bool on_chord = true, long_enough = true;
    int lowest = 127, highest = 0, strong = 0;
    for (const engine::audio::Note& note : song->layers[*lead].notes) {
      const int midi = midi_of(note);
      lowest = std::min(lowest, midi), highest = std::max(highest, midi);
      // 짧은 단음을 이어 치지 않는다 — 모든 음이 두 칸(20 틱) 이상
      long_enough = long_enough && note.length >= 20;
      if (note.tick % 80) continue;
      strong++;
      const int* chord = CHORDS[note.tick / 160][note.tick % 160 / 80];
      on_chord = on_chord && (midi % 12 == chord[0] || midi % 12 == chord[1] || midi % 12 == chord[2]);
    }
    // 첫째 박은 열여섯 마디 모두에서, 셋째 박은 긴 음이 넘어가는 10·14 마디를 뺀 열네 마디에서 새 음이 시작한다 — 두 줄이라 (16 + 14) × 2 = 60
    expect(on_chord && long_enough && strong == 60 && lowest == 47 && highest == 69, "lead: 첫째·셋째 박 머리의 음은 그 자리 화음의 음이고, 음역은 B2…A4, 모든 음이 두 칸 이상");
  }

  // 걸릴 소리들을 샘플 이름으로 — "이름" 또는 늦게 나는 것은 "이름+틱"
  const auto names = [&](const game::Sound& sound, const game::World& world) {
    std::string all;
    for (const engine::audio::Play& play : sound.plays(world)) {
      if (!all.empty()) all += ' ';
      all += bank->samples()[play.sample].name;
      // 48 kHz 에서 틱 하나가 800 표본
      if (play.delay) all += '+' + std::to_string(play.delay / 800);
    }
    return all;
  };
  // 48 kHz — 틱 하나가 800 표본, 100 ms 가 4800 표본
  std::vector<float> out(4800 * 2);
  {
    game::World world(two_rooms(), kit);
    game::Sound sound(*bank, *song, 48000);
    sound.set_volume(game::Options{});
    sound.follow(world);
    sound.render(out, 0);
    expect(sound.voices() == 0 && loudest(out, 0, 4800) == 0.0f, "음악을 시작하지 않았고 일어난 일이 없으면 조용하다");
    // 시작 방의 바닥에 떨어져 선다 — 착지음 (느리게 내려서면 작게: 초당 7.6 m 면 7.6 / 8 = 0.95)
    for (int i = 0; i < 60; i++) world.step();
    const auto landing = sound.plays(world);
    expect(names(sound, world) == "land" && landing[0].gain > 0.94f && landing[0].gain < 0.96f && landing[0].pan == 0.0f, "내려서면 착지음이 내려선 빠르기만큼의 크기로 난다");
    sound.follow(world);
    for (int i = 0; i < 60; i++) world.step();
    sound.render(out, 4800);
    sound.render(out, 9600);
    sound.render(out, 14400);
    sound.render(out, 19200);
    expect(sound.voices() == 0, "착지음이 다 울렸다");

    // 발사음은 샘플 하나이고, 발마다 높이와 크기가 조금 다르다 — 세계의 일 번호에서 정해진 값 (손으로 섞어 본 것: 0 번 → 가장 낮고 작게, 1 번 → 1.00654 배·0.97517, 2 번 → 1.02181 배·1.11970)
    const auto voice = [](uint64_t event, float pitch, float gain) {
      const game::ShotVoice shot = game::shot_voice(event);
      return std::abs(shot.pitch - pitch) < 1e-5f && std::abs(shot.gain - gain) < 1e-5f;
    };
    expect(voice(0, 0.975f, 0.891251f) && voice(1, 1.006542f, 0.975172f) && voice(2, 1.021806f, 1.119703f), "발사음의 높이는 ±2.5 %, 크기는 ±1 dB 안에서 일 번호마다 정해진다");
    next_slot(world);
    world.act(game::Action::fire);
    expect(names(sound, world) == "shot", "첫 발");
    // 이 세계의 0 번 일은 착지, 1 번이 첫 발사다
    const engine::audio::Play first_shot = sound.plays(world)[0];
    expect(std::abs(first_shot.pitch - 1.006542f) < 1e-5f && std::abs(first_shot.gain - 0.975172f) < 1e-5f && first_shot.pan == 0.0f && sound.plays(world)[0].pitch == first_shot.pitch,
           "첫 발은 1 번 일의 높이와 크기로 — 다시 읽어도 같다");
    sound.follow(world);
    expect(sound.voices() == 1, "발사 하나에 소리 하나");
    sound.follow(world);
    expect(sound.voices() == 1, "같은 일을 두 번 내지 않는다");
    sound.render(out, 24000);
    expect(loudest(out, 0, 480) > 0.05f, "발사음은 곧바로(첫 10 ms 안에) 들린다");
    world.act(game::Action::fire);
    expect(!sound.audible(world), "같은 칸의 둘째 발사(연타)는 일이 아니다 — 낼 소리가 없다");
    sound.follow(world);
    expect(sound.voices() == 1, "연타에는 소리가 나지 않는다 (거절음이 없다)");
    next_slot(world);
    world.act(game::Action::fire);
    expect(names(sound, world) == "shot" && sound.plays(world)[0].pitch != first_shot.pitch && sound.plays(world)[0].gain != first_shot.gain, "둘째 발 — 같은 샘플을 다른 높이·크기로");
    sound.follow(world);
    next_slot(world);
    world.act(game::Action::fire);
    next_slot(world);
    world.act(game::Action::fire);
    expect(names(sound, world) == "shot shot" && sound.plays(world)[0].pitch != sound.plays(world)[1].pitch, "셋째·넷째 발 — 한 번에 읽어도 발마다 제 소리다");
    sound.follow(world);
    // 한 프레임에 여러 틱이 돌아도 그 사이의 일이 다 소리가 된다: 탄창 빼기, 끼우기(8 틱 뒤에 슬라이드), 발사
    next_slot(world);
    world.act(game::Action::reload);
    next_slot(world);
    world.act(game::Action::reload);
    next_slot(world);
    world.act(game::Action::fire);
    expect(sound.audible(world) && names(sound, world) == "magazine_out magazine_in slide+4 shot", "읽지 않은 사이의 일(탄창 빼기·끼우기·발사)이 모두 소리가 된다. 슬라이드는 끼운 뒤 4 틱째에");
    const uint32_t before_reload = sound.voices();
    sound.follow(world);
    expect(sound.voices() == before_reload + 4 && !sound.audible(world), "그 소리들이 걸렸다");
    // 빈 방아쇠 — 탄창을 빼 둔 동안의 발사는 총소리가 아니라 딸깍 소리 하나다 (제 샘플 — 박자 실수의 소리가 아니다)
    next_slot(world);
    world.act(game::Action::reload);
    world.act(game::Action::fire);
    expect(names(sound, world) == "magazine_out dry" && world.pistol().reload_stage == 1, "탄창을 빼고 당긴 빈 방아쇠도 소리가 난다 (탄창 빼기 + 빈 방아쇠)");
    sound.follow(world);
    next_slot(world);
    world.act(game::Action::reload);
    sound.follow(world);
    // 대시와 뛰어오름
    next_slot(world);
    world.act(game::Action::dash);
    expect(names(sound, world) == "dash", "대시");
    sound.follow(world);
    // 미스 — 칸 사이(10 틱)의 발사는 나가지 않는다: 총소리가 아니라 헛손질 소리 하나 (뛰는 소리의 샘플을 낮고 크게 — 빈 방아쇠의 딸깍과 다른 소리다)
    for (int i = 0; i < 10; i++) world.step();
    expect(!world.act(game::Action::fire) && names(sound, world) == "jump" && sound.plays(world)[0].pitch == 0.7f && sound.plays(world)[0].gain == 1.6f && sound.plays(world)[0].pan == 0.0f,
           "미스에는 제 소리가 난다 (총소리도 빈 방아쇠 소리도 아니다)");
    sound.follow(world);
    for (int i = 0; i < 70; i++) world.step();
    sound.follow(world);
    world.jump();
    world.step();
    expect(names(sound, world) == "jump", "뛰어오름");
    sound.follow(world);

    // 걸어 둔 소리 — 메뉴와 발소리. 발소리는 발마다 셋을 번갈아, 왼발은 왼쪽·오른발은 오른쪽에, 걸음마다 크기를 달리해서
    sound.cue(game::Cue::ui_move);
    sound.cue(game::Cue::ui_press);
    expect(sound.audible(world) && names(sound, world) == "ui_move ui_press", "메뉴의 옮김·누름 소리");
    sound.follow(world);
    expect(!sound.audible(world), "걸어 둔 소리는 한 번만 난다");
    for (int i = 0; i < 2; i++) sound.cue(game::Cue::step_left), sound.cue(game::Cue::step_right);
    const auto walk = sound.plays(world);
    expect(names(sound, world) == "step_l1 step_r1 step_l2 step_r2" && walk[0].pan == -0.15f && walk[1].pan == 0.15f && walk[0].gain == 0.8f && walk[2].gain == 1.0f, "발소리: 왼발·오른발을 번갈아, 발마다 다음 변주로");
    sound.follow(world);
    sound.cue(game::Cue::step_left);
    expect(names(sound, world) == "step_l3", "셋째 변주로 이어진다");
    sound.follow(world);
    // 내지 못한 채 쌓이면 여덟 개까지만 든다
    for (int i = 0; i < 20; i++) sound.cue(game::Cue::ui_move);
    expect(sound.plays(world).size() == 8, "걸어 둔 소리는 여덟 개까지만 쌓인다");
    sound.follow(world);

    // 효과음 음량 0 — 10 ms 에 걸쳐 줄어든 뒤로는 소리가 걸려 있어도 나오지 않는다
    game::Options quiet;
    quiet.effects = 0.0f;
    sound.set_volume(quiet);
    sound.render(out, 28800);
    next_slot(world);
    world.act(game::Action::fire);
    sound.follow(world);
    sound.render(out, 33600);
    expect(sound.voices() > 0 && loudest(out, 0, 4800) == 0.0f, "효과음 음량이 0 이면 효과음이 나오지 않는다");

    // 새 판 — 지난 판에서 읽은 데를 잊고 새 세계의 일부터 읽는다
    game::World fresh(two_rooms(), kit);
    sound.restart(fresh);
    next_slot(fresh);
    fresh.act(game::Action::fire);
    expect(names(sound, fresh) == "land shot" && sound.plays(fresh)[1].pitch == first_shot.pitch, "새 판의 일(돌단에 내려섬, 첫 발사)도 소리가 된다 (새 세계의 1 번 일 — 지난 판의 첫 발과 같은 소리)");
  }
  {
    // 들리는 자리와 크기 — 보는 쪽(yaw 0 은 -z) 기준의 좌우, 16 m 에서 반
    game::Player listener;
    game::Heard heard = game::hear(listener, {16.0f, 0.0f, 0.0f});
    expect(heard.pan == 0.7f && heard.gain == 0.5f, "오른쪽 16 m: 오른쪽으로 0.7, 크기 1/2");
    heard = game::hear(listener, {-48.0f, 5.0f, 0.0f});
    expect(heard.pan == -0.7f && heard.gain == 0.25f, "왼쪽 48 m: 왼쪽으로 0.7, 크기 1/4 (높이는 치지 않는다)");
    heard = game::hear(listener, {0.0f, 0.0f, -8.0f});
    expect(std::abs(heard.pan) < 1e-6f && std::abs(heard.gain - 1.0f / 1.5f) < 1e-6f, "앞 8 m: 가운데, 크기 2/3");
    heard = game::hear(listener, listener.position);
    expect(heard.pan == 0.0f && heard.gain == 1.0f, "제자리: 가운데, 제 크기");
    listener.yaw = std::numbers::pi_v<float> / 2.0f;
    heard = game::hear(listener, {0.0f, 0.0f, 16.0f});
    expect(std::abs(heard.pan - 0.7f) < 1e-6f, "오른쪽을 보고 있으면 +z 가 오른쪽이다");

    // 전투방 — 문이 잠기면 석판 닫히는 소리. 적의 예고·돌진·투사체·처치가 적이 있는 쪽에서 들린다
    game::World fight(game::Floor{{{.x = 0, .z = 0, .doors = 1u << game::NORTH, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0},
                                   {.x = 0, .z = -1, .doors = 1u << game::SOUTH, .shape = 1, .turn = 0, .depth = 1, .chargers = 3, .casters = 2}}},
                      kit);
    game::Sound sound(*bank, *song, 48000);
    sound.set_volume(game::Options{});
    for (int i = 0; i < 100; i++) fight.step();
    sound.restart(fight);
    fight.move(1.0f, 0.0f);
    std::string heard_all;
    bool spatial = true, merged = true;
    uint32_t windups = 0, windup_events = 0;
    uint64_t seen = fight.event_count();
    for (int i = 0; i < 1500 && fight.outcome() == game::World::Outcome::playing; i++) {
      fight.step();
      if (fight.locked() && !fight.in_transit()) fight.move(0.0f, 0.0f);
      for (; seen < fight.event_count(); seen++) windup_events += fight.event(seen)->kind == game::WorldEvent::Kind::windup;
      const auto plays = sound.plays(fight);
      for (std::size_t at = 0; at < plays.size(); at++) {
        const std::string& name = bank->samples()[plays[at].sample].name;
        if (heard_all.find(name) == std::string::npos) heard_all += name + ' ';
        windups += name.starts_with("windup");
        // 적의 소리는 멀수록 작다 (방 안이라 0.3 … 1), 내 몸의 소리는 가운데
        if (name.starts_with("windup") || name == "charge" || name == "bolt" || name == "bolt_wall") spatial = spatial && plays[at].gain > 0.3f && plays[at].gain <= 1.0f && std::abs(plays[at].pan) <= 0.7f;
        // 한 틱(한 번 읽은 것) 안에 같은 소리가 둘 걸리지 않는다
        for (std::size_t other = 0; other < at; other++) merged = merged && (plays[other].sample != plays[at].sample || plays[other].delay != plays[at].delay);
      }
      sound.follow(fight);
    }
    for (const char* name : {"portal_enter", "gate_close", "windup_stone", "windup_cast", "charge", "bolt", "hurt"})
      expect(heard_all.find(std::string(name) + ' ') != std::string::npos, name);
    expect(spatial && merged, "적의 소리는 자리와 거리대로, 같은 틱의 같은 소리는 하나로");
    // 헤드론 조각 둘은 같은 박에 모으기를 시작한다 (한꺼번에 둘까지) — 일은 둘이지만 소리는 하나다
    expect(windup_events > windups && windups > 0, "같은 박에 시작한 예고 여럿은 소리 하나로 줄어든다");

    // 처치와 방 비움 — 적을 차례로 겨눠 쏜다 (돌 정령은 돌 부서짐, 헤드론 조각은 수정 깨짐). 다 잡으면 석판이 내려가고 15 틱 뒤에 포털 소리
    game::World hunt(game::Floor{{{.x = 0, .z = 0, .doors = 1u << game::NORTH, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0},
                                  {.x = 0, .z = -1, .doors = 1u << game::SOUTH, .shape = 1, .turn = 0, .depth = 1, .chargers = 1, .casters = 1}}},
                     kit);
    hunt.move(1.0f, 0.0f);
    for (int i = 0; i < 600 && !hunt.locked(); i++) hunt.step();
    hunt.move(0.0f, 0.0f);
    game::Sound hunter(*bank, *song, 48000);
    hunter.restart(hunt);
    std::string kills;
    bool opened = false;
    for (int i = 0; i < 3000 && hunt.outcome() == game::World::Outcome::playing && !opened; i++) {
      hunt.step();
      if (hunt.tick() % game::TICKS_PER_SLOT == 0 && !hunt.enemies().empty()) {
        if (hunt.pistol().ammo == 0) hunt.act(game::Action::reload);
        else {
          const engine::Aabb box = game::enemy_box(hunt.enemies()[0]);
          const engine::Vec3 to = (box.min + box.max) * 0.5f - hunt.player().position;
          hunt.look(std::atan2(to.x, -to.z) - hunt.player().yaw, std::atan2(to.y, std::sqrt(to.x * to.x + to.z * to.z)) - hunt.player().pitch);
          hunt.act(game::Action::fire);
        }
      }
      const std::string now = names(hunter, hunt);
      for (const char* name : {"kill_stone", "kill_glass", "hit", "bolt_wall"})
        if (now.find(name) != std::string::npos && kills.find(name) == std::string::npos) kills += std::string(name) + ' ';
      if (now.find("gate_open") != std::string::npos) opened = now.find("gate_open portal_open+15") != std::string::npos;
      hunter.follow(hunt);
    }
    expect(kills.find("kill_stone") != std::string::npos && kills.find("kill_glass") != std::string::npos && kills.find("hit") != std::string::npos, "명중, 돌 정령의 처치(돌 부서짐), 헤드론 조각의 처치(수정 깨짐)");
    expect(opened, "방을 비우면 석판이 내려가는 소리, 15 틱 뒤에 포털이 열리는 소리");

  }
  {
    // 음악이 바라는 층 — 비트는 pulse 1, calm 2, roam 4, combat 8, x2 16, x3 32, x4 64, lead 128, hum 256. 인자는 (방에 적이 있는가, 전투방을 비운 적이 있는가, 배수)
    const auto target = [](bool combat, bool fought, uint32_t multiplier) { return game::music_target({combat, fought, multiplier}); };
    expect(target(false, false, 1) == 3u && target(false, false, 4) == 3u, "첫 전투 앞: 맥박 + calm");
    expect(target(true, false, 1) == 141u && target(true, false, 2) == 157u && target(true, true, 3) == 189u && target(true, true, 4) == 253u, "전투: 맥박 + roam + combat + lead(주선율 — 배수 1 부터)에 배수만큼의 층");
    expect(target(false, true, 1) == 261u && target(false, true, 2) == 277u && target(false, true, 4) == 277u, "이동(전투방을 비운 뒤): 맥박 + roam + hum(주선율의 뼈대), 배수가 2 이상이면 x2 의 리프까지");

    // 음악의 흐름 — follow 의 첫 인자는 마디 번호. 오를 때는 그 자리에서 한꺼번에, 내릴 때는 마디마다 하나씩
    game::MusicFlow flow;
    expect(flow.follow(0, {false, false, 1}) == 3u, "흐름: 처음에는 바라는 층 그대로 (맥박 + calm)");
    expect(flow.follow(0, {true, false, 1}) == 141u, "흐름: 전투가 시작되면 같은 마디에 calm 이 roam 으로 바뀌고 combat 과 주선율(lead)이 얹힌다");
    expect(flow.follow(1, {true, false, 3}) == 189u && flow.follow(1, {true, false, 4}) == 253u, "흐름: 배수가 오르면 그 층들이 기다리지 않고 한꺼번에 켜진다");
    // 마디 2 에서 방을 비웠다 — 마디 3·4 는 그대로(절정), 마디 5 부터 x4 → x3 → combat → lead 차례로 하나씩 (lead 가 꺼지는 마디에 hum 이 들어온다 — 그 앞에는 얹히지 않는다). 배수 4 는 남아 있으니 x2 의 리프는 꺼지지 않는다
    flow.cleared(2);
    expect(flow.follow(2, {false, true, 4}) == 253u && flow.follow(3, {false, true, 4}) == 253u && flow.follow(4, {false, true, 4}) == 253u,
           "흐름: 방을 비워도 그 마디와 다음 두 마디는 쌓인 층이 그대로다 (절정)");
    expect(flow.follow(5, {false, true, 4}) == 189u && flow.follow(5, {false, true, 4}) == 189u, "흐름: 절정 뒤 첫 마디에 x4 하나만 꺼진다 (같은 마디에 다시 불러도 그대로)");
    expect(flow.follow(6, {false, true, 4}) == 157u && flow.follow(7, {false, true, 4}) == 149u, "흐름: 다음 마디에 x3, 그 다음 마디에 combat — 주선율은 아직 lead 다");
    expect(flow.follow(8, {false, true, 4}) == 277u && flow.follow(40, {false, true, 4}) == 277u, "흐름: 그 다음 마디에 lead 가 hum 으로 바뀌고, 이동 중에는 맥박 + roam + x2 + hum 에서 더 내려가지 않는다 (calm 으로 돌아가지 않는다)");
    // 다음 전투방 — 배수 4 가 남아 있으면 그 층들이 한꺼번에 돌아온다
    flow.locked();
    expect(flow.follow(40, {true, true, 4}) == 253u, "흐름: 방이 바뀌어도 배수의 세기를 기억한다 — 다음 전투가 시작되면 x2·x3·x4 가 같이 켜지고 hum 이 lead 로 바뀐다");
    // 맞았다 (배수 1) — 그 마디에는 그대로, 마디마다 x4 → x3 → x2
    expect(flow.follow(40, {true, true, 1}) == 253u && flow.follow(41, {true, true, 1}) == 189u && flow.follow(42, {true, true, 1}) == 157u && flow.follow(43, {true, true, 1}) == 141u &&
               flow.follow(44, {true, true, 1}) == 141u,
           "흐름: 맞아 배수가 1 이 되면 마디마다 한 층씩 내려가 맥박 + roam + combat + lead 에 선다 (주선율은 꺼지지 않는다)");
    // 내려가는 중에 다시 오르면 모자란 층이 곧바로 켜지고, 남는 층만 이어서 꺼진다
    expect(flow.follow(44, {true, true, 4}) == 253u && flow.follow(44, {true, true, 1}) == 253u && flow.follow(45, {true, true, 1}) == 189u && flow.follow(45, {true, true, 2}) == 189u &&
               flow.follow(46, {true, true, 2}) == 157u && flow.follow(47, {true, true, 2}) == 157u,
           "흐름: 내려가는 중에 배수가 오르면 그 층은 꺼지지 않는다");
    // 한 번에 여러 마디가 지났으면 지난 마디만큼 내린다 (배수 1 로 방을 비운 뒤 절정이 지난 마디들)
    flow.cleared(47);
    expect(flow.follow(49, {false, true, 1}) == 157u && flow.follow(52, {false, true, 1}) == 261u, "흐름: 절정(마디 48·49) 뒤 세 마디가 한꺼번에 지나면 combat · lead · x2 가 꺼져 맥박 + roam + hum");
    // 절정 중에 다음 전투가 시작되면 절정은 거기서 끝난다
    flow.reset();
    expect(flow.follow(9, {true, true, 4}) == 253u, "흐름: 새 판은 바라는 층에서 시작한다");
    flow.cleared(9);
    flow.locked();
    expect(flow.follow(10, {true, true, 1}) == 189u, "흐름: 문이 잠기면 남은 절정은 끝난다 — 맞으면 다음 마디부터 내려간다");

    // 세계와 함께 — 방 셋(시작 방, 전투방 둘)을 차례로: 들어서면 combat, 비워도 꺼지지 않고, 걸어가는 동안 roam 이 남고, 연속 수(배수)는 방이 바뀌어도 그대로다
    game::World run(game::Floor{{{.x = 0, .z = 0, .doors = 1u << game::NORTH, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0},
                                 {.x = 0, .z = -1, .doors = 1u << game::SOUTH | 1u << game::NORTH, .shape = 1, .turn = 0, .depth = 1, .chargers = 1, .casters = 1},
                                 {.x = 0, .z = -2, .doors = 1u << game::SOUTH, .shape = 1, .turn = 0, .depth = 2, .chargers = 2, .casters = 1}}},
                    kit);
    game::Sound music(*bank, *song, 48000);
    music.set_volume(game::Options{});
    music.restart(run);
    music.follow(run);
    music.start_music(0, run.tick());
    expect(music.music_on() == 3u, "시작 방: 맥박 + calm");
    std::optional<uint64_t> locked_tick, opened_tick, relocked_tick;
    uint32_t at_lock = 0, at_open = 0, streak_at_open = 0, streak_at_relock = 0, least_while_fighting = ~0u;
    std::string lock_sounds, open_sounds;
    // 방을 비운 뒤: 절정이 끝나는 틱(비운 마디 + 2 마디 반)의 바로 앞과 그 틱의 층, 그 사이에 꺼진 적이 있는가
    uint32_t before_drop = 0, at_drop = 0;
    bool held = true, never_calm = true;
    uint64_t seen_events = run.event_count();
    for (int i = 0; i < 9000 && run.outcome() == game::World::Outcome::playing && !relocked_tick; i++) {
      run.step();
      if (run.locked() && !run.in_transit()) {
        run.move(0.0f, 0.0f);
        if (run.tick() % game::TICKS_PER_SLOT == 0) {
          if (run.pistol().ammo == 0 || run.pistol().reload_stage) run.act(game::Action::reload);
          else {
            const engine::Aabb box = game::enemy_box(run.enemies()[0]);
            const engine::Vec3 to = (box.min + box.max) * 0.5f - run.player().position;
            run.look(std::atan2(to.x, -to.z) - run.player().yaw, std::atan2(to.y, std::sqrt(to.x * to.x + to.z * to.z)) - run.player().pitch);
            run.act(game::Action::fire);
          }
        }
      } else if (!run.in_transit()) {
        // 북쪽 문의 축(x 0) 위로 먼저 가고, 거기서 포털로 곧게 걷는다. 방을 비운 뒤에는 절정과 내려가는 마디를 서서 듣고(다섯 마디) 간다
        const engine::Vec3 from = run.player().position;
        const engine::Vec3 to{0.0f, 0.0f, std::fabs(from.x) < 0.5f ? -17.0f : from.z - 0.5f};
        run.look(std::atan2(to.x - from.x, -(to.z - from.z)) - run.player().yaw, -run.player().pitch);
        const bool listening = opened_tick && run.tick() < (*opened_tick / 160 + 6) * 160;
        run.move(listening ? 0.0f : 1.0f, 0.0f);
      }
      const std::string now = names(music, run);
      const bool was_locked = locked_tick.has_value(), was_open = opened_tick.has_value();
      for (; seen_events < run.event_count(); seen_events++) {
        const game::WorldEvent event = *run.event(seen_events);
        if (event.kind == game::WorldEvent::Kind::locked) (locked_tick ? relocked_tick : locked_tick) = event.tick;
        if (event.kind == game::WorldEvent::Kind::opened && !opened_tick) opened_tick = event.tick;
      }
      music.follow(run);
      const uint32_t on = music.music_on();
      never_calm = never_calm && (!locked_tick || !(on & 2u));
      if (locked_tick && !was_locked) at_lock = on, lock_sounds = now;
      if (locked_tick && !opened_tick) least_while_fighting = std::min(least_while_fighting, on & 141u);
      if (opened_tick && !was_open) at_open = on, open_sounds = now, streak_at_open = run.streak();
      if (opened_tick && !relocked_tick) {
        // 비운 마디가 b 면 마디 b + 1 · b + 2 가 절정이고, 마디 b + 2 의 한가운데(틱 (b + 2) · 160 + 80)에서 첫 층을 끄기로 한다 (마디 b + 3 머리부터 빠져 들린다)
        const uint64_t drop = (*opened_tick / 160 + 2) * 160 + 80;
        if (run.tick() < drop) held = held && on == at_open;
        if (run.tick() == drop - 1) before_drop = on;
        if (run.tick() == drop) at_drop = on;
      }
      if (relocked_tick) streak_at_relock = run.streak();
    }
    expect(locked_tick && opened_tick && relocked_tick && run.room() == 2, "세계: 첫 전투방을 비우고 북쪽 포털로 둘째 전투방에 들어섰다");
    if (locked_tick && opened_tick && relocked_tick) {
      // 크래시는 그 일 뒤 첫 마디 머리에 — 음악을 틱 0 = 표본 0 에 놓았고 아직 아무것도 내지 않았으니 늦춤이 곧 그 마디 머리의 틱이다
      const auto crash_at = [](uint64_t tick) { return " crash+" + std::to_string((tick / 160 + 1) * 160); };
      expect(at_lock == 141u && least_while_fighting == 141u, "세계: 문이 잠긴 틱에 맥박 + roam + combat + lead 를 켜 달라고 하고, 싸우는 동안 꺼지지 않는다 (배수 1 에서도 주선율이 있다)");
      expect(lock_sounds.find("gate_close" + crash_at(*locked_tick)) != std::string::npos, "세계: 전투가 시작된 뒤 첫 마디 머리에 크래시");
      expect(open_sounds.find("gate_open portal_open+15" + crash_at(*opened_tick)) != std::string::npos, "세계: 방을 비운 뒤 첫 마디 머리에도 크래시 (절정의 첫 마디)");
      expect((at_open & 8u) && held && before_drop == at_open, "세계: 방을 비운 틱에도, 그 뒤 두 마디가 다 가도록 combat 과 쌓인 층이 그대로다");
      // 꺼지는 것은 한 번에 하나 — 비트 하나만 줄었다
      const uint32_t dropped = at_open & ~at_drop;
      expect(at_drop != at_open && (at_drop & ~at_open) == 0 && (dropped & (dropped - 1)) == 0, "세계: 절정이 끝나는 마디 한가운데에 층 하나만 꺼진다");
      expect(never_calm, "세계: 첫 전투 뒤로는 calm 으로 돌아가지 않는다 (이동 중에도 roam 이 깔린다)");
      // 배수는 세계가 기억한다 — 방을 비우고 포털을 넘어 다음 방의 문이 잠길 때까지 연속 수가 그대로다 (피격만 0 으로 돌린다. 걸어가는 동안은 맞을 일이 없다)
      expect(streak_at_relock == streak_at_open, "세계: 연속 수(배수)는 방을 비우고 다음 방에 들어서도 그대로다");
      expect(music.music_on() == game::music_target({true, true, game::multiplier(run.streak())}) && (music.music_on() & 13u) == 13u, "세계: 둘째 전투방의 문이 잠기면 combat 과 남아 있던 배수의 층이 한꺼번에 켜진다");
    }
  }
  {
    // 음악 — 세계의 틱 0 을 표본 0 에 놓는다. 박(32000 표본)마다 킥, 반박(16000)마다 하이햇
    game::World world(two_rooms(), kit);
    game::Sound sound(*bank, *song, 48000);
    sound.set_volume(game::Options{});
    sound.follow(world);
    sound.start_music(0, world.tick());
    // 게임처럼 짧은 블록(틱 하나 — 800 표본)마다 낸다: 한 마디를 한꺼번에 걸면 아직 시작하지 않은 음까지 믹서의 보이스를 차지한다
    const auto render_bar = [](game::Sound& from, std::vector<float>& to) {
      for (std::size_t at = 0; at < to.size() / 2; at += 800) from.render(std::span{to}.subspan(at * 2, 1600), at);
    };
    std::vector<float> bar(128000 * 2);
    render_bar(sound, bar);
    expect(loudest(bar, 0, 480) > 0.05f && loudest(bar, 32000, 32480) > 0.05f && loudest(bar, 64000, 64480) > 0.05f && loudest(bar, 96000, 96480) > 0.05f, "박마다 킥이 울린다");
    expect(loudest(bar, 16000, 16480) > 0.005f && loudest(bar, 48000, 48480) > 0.005f, "반박마다 하이햇이 울린다");
    // 박자 표식의 위상 0(틱이 40 의 배수)과 킥이 같은 틱이다 — 세계의 틱 100 을 표본 5000 에 놓으면 다음 박(틱 120·160)의 킥은 5000 + 20·800 = 21000, 5000 + 60·800 = 53000 에서 시작한다
    game::World late(two_rooms(), kit);
    for (int i = 0; i < 100; i++) late.step();
    game::Sound moved(*bank, *song, 48000);
    moved.set_volume(game::Options{});
    moved.restart(late);
    moved.follow(late);
    moved.start_music(5000, late.tick());
    std::vector<float> shifted(60000 * 2);
    moved.render(shifted, 5000);
    // 줄기의 표본 21000 은 이 버퍼의 16000 째다. 킥의 어택은 놓인 표본에서 바로 선다 (첫 2 ms 안에 크다) — 그 앞 5 ms 는 하이햇의 꼬리와 베이스뿐이라 작다
    expect(game::beat_phase(120) == 0.0f && loudest(shifted, 16000, 16096) > 0.05f && loudest(shifted, 15760, 16000) < loudest(shifted, 16000, 16096) * 0.5f &&
               loudest(shifted, 48000, 48096) > 0.05f,
           "박 k 의 킥은 위상 0 의 틱이 놓인 표본에서 울린다");
    // 반박 바로 앞(표본 15000…16000, 0.31 초 뒤)에는 킥과 하이햇의 꼬리, 깔려 있는 베이스의 긴 음(calm 층)만 남아 박 머리보다 작다
    expect(loudest(bar, 15000, 16000) < loudest(bar, 0, 480) * 0.5f, "박 사이에서는 박 머리보다 작다");

    // 적이 있는 방 — combat 층이 얹힌다 (놓을 때 켜 달라고 해 둔 층은 곧바로 켜진다): 반박의 스네어
    game::World fight(two_rooms(), kit);
    fight.move(1.0f, 0.0f);
    for (int i = 0; i < 600 && !fight.locked(); i++) fight.step();
    expect(fight.locked(), "북쪽 방에 닿아 문이 잠겼다");
    game::Sound busy(*bank, *song, 48000);
    busy.set_volume(game::Options{});
    busy.follow(fight);
    busy.start_music(0, 0);
    std::vector<float> loud(128000 * 2);
    render_bar(busy, loud);
    game::Sound calm(*bank, *song, 48000);
    calm.set_volume(game::Options{});
    calm.follow(world);
    calm.start_music(0, 0);
    std::vector<float> soft(128000 * 2);
    render_bar(calm, soft);
    // 첫 반박(틱 20 — 표본 16000)의 스네어
    float difference = 0.0f;
    for (std::size_t i = 16000 * 2; i < 16480 * 2; i++) difference = std::max(difference, std::fabs(loud[i] - soft[i]));
    expect(difference > 0.05f, "방에 적이 있으면 반박마다 스네어가 얹힌다");

    // 음악 음량 0, 그리고 음악 끊기
    game::Options quiet;
    quiet.music = 0.0f;
    busy.set_volume(quiet);
    busy.render(out, 128000);
    busy.render(loud, 132800);
    expect(busy.voices() > 0 && loudest(loud, 0, 128000) == 0.0f, "음악 음량이 0 이면 음악이 나오지 않는다");
    calm.render(out, 128000);
    calm.stop_music();
    calm.render(out, 132800);
    calm.render(soft, 137600);
    expect(calm.voices() == 0 && loudest(soft, 0, 128000) == 0.0f, "음악을 끊으면 울리던 음이 줄어 사라지고 새 음이 나지 않는다");
  }
}

// 발소리의 때 — 걸음의 흔들림이 가장 낮은 틱에 발이 닿는다: 걷는 빠르기(초당 6 m)에서 2 m 마다, 곧 20 틱(반박)마다 한 발, 왼발과 오른발이 번갈아
void footsteps() {
  game::World world(two_rooms(), kit);
  game::Motion feel;
  feel.reset(world);
  std::vector<std::pair<uint64_t, game::Foot>> falls;
  const auto steps = [&](int count) {
    for (int i = 0; i < count; i++) {
      world.step();
      feel.step(world);
      if (const auto foot = feel.footfall()) falls.push_back({world.tick(), *foot});
    }
  };
  steps(120);
  expect(falls.empty(), "서 있으면 발소리가 없다");
  // 북쪽으로 걷는다 — 돌단에서 내려선 뒤(공중에서는 발이 닿지 않는다) 마당을 걷는 동안의 마지막 네 걸음을 본다
  world.move(1.0f, 0.0f);
  steps(150);
  expect(falls.size() >= 5 && world.grounded() && !world.in_transit(), "걷는 동안 발이 닿는다");
  if (falls.size() >= 5) {
    bool even = true, alternate = true;
    for (std::size_t i = falls.size() - 4; i < falls.size(); i++) {
      const uint64_t gap = falls[i].first - falls[i - 1].first;
      even = even && gap >= 19 && gap <= 21;
      alternate = alternate && falls[i].second != falls[i - 1].second;
    }
    expect(even && falls.back().first - falls[falls.size() - 5].first >= 79 && falls.back().first - falls[falls.size() - 5].first <= 81, "20 틱(반박)마다 한 걸음");
    expect(alternate, "왼발과 오른발이 번갈아 닿는다");
  }
  // 멈추면 미끄러지는 끝자락에는 발소리가 없다
  world.move(0.0f, 0.0f);
  steps(10);
  const std::size_t stopped = falls.size();
  steps(60);
  expect(falls.size() == stopped, "멈춘 뒤에는 발이 닿지 않는다");
  // 뛰어오른 동안에도 없다 (문에서 멀어지는 쪽으로 걷다 뛴다)
  world.move(-1.0f, 0.0f);
  steps(10);
  world.jump();
  steps(2);
  const std::size_t airborne = falls.size();
  steps(20);
  expect(!world.grounded() && falls.size() == airborne, "공중에서는 발이 닿지 않는다");
}

// 손에 든 권총 — 세계에서 일어난 일이 부품의 자리로 옮겨진다 (weapon.hpp)
void weapon() {
  game::World world(two_rooms(), kit);
  game::WeaponAnimator gun;
  const auto near = [](float value, float expected) { return std::abs(value - expected) < 1e-5f; };
  const auto steps = [&](int count) {
    for (int i = 0; i < count; i++) world.step();
    gun.follow(world);
  };
  const auto still = [&](const game::WeaponPose& pose) {
    return pose.slide == 0.0f && pose.magazine == 0.0f && pose.magazine_shown && pose.back == 0.0f && pose.rise == 0.0f && pose.pitch == 0.0f && pose.twist == 0.0f && pose.cant == 0.0f;
  };
  steps(100);
  expect(still(gun.pose(world, 0.0f)), "가만히 든 총: 슬라이드와 탄창이 제자리, 반동도 기울임도 없다");

  // 발사 — 슬라이드가 1.5 틱에 끝까지(3.4 cm) 물러났다 6 틱째에 제자리.
  // 반동은 두 박자다: 총이 1 틱째에 손 쪽으로 가장 밀렸다(7.5 cm) 7 틱째에 제자리, 총구는 1.5 틱째에 가장 들렸다(0.28 rad, 오름 1.5 cm, 비틀림 0.09 rad)
  // 내려오며 제자리를 한 번 지나쳤다(7 틱째쯤 가장 높던 것의 1/6 쯤) 12 틱째에 선다. 돌아오는 길(1.5 → 12 틱)의 s 에서 (1 − s)² · cos(1.5 π s).
  // 총구 섬광은 쏜 틱에 1 이고 ((3 − t) / 3)² 로 사그라져 3 틱째에 없다 — 모양(돈 각, 크기)은 그 발사의 일 번호에서 정해진다
  expect(gun.pose(world, 0.0f).flash == 0.0f && !game::place_weapon(gun.pose(world, 0.0f), {}, 0.0f).flash, "쏘기 전에는 섬광이 없다");
  next_slot(world);
  expect(world.act(game::Action::fire), "한 발");
  gun.follow(world);
  const game::FlashShape first_flash = game::flash_shape(world.event_count() - 1);
  game::WeaponPose pose = gun.pose(world, 0.0f);
  expect(pose.flash == 1.0f && pose.flash_turn == first_flash.turn && pose.flash_size == first_flash.size && pose.pitch == 0.0f, "쏜 틱: 섬광이 가장 밝다 (총은 아직 제자리)");
  steps(1);
  pose = gun.pose(world, 0.0f);
  expect(near(pose.slide, 0.034f / 1.5f) && near(pose.pitch, 0.06f / 1.5f) && near(pose.back, 0.02f) && near(pose.twist, 0.02f / 1.5f) && pose.magazine == 0.0f && pose.magazine_shown,
         "쏜 다음 틱: 슬라이드가 물러나는 중이고, 총은 가장 밀렸고 총구가 들리는 중이다 (2/3)");
  expect(near(pose.flash, 4.0f / 9.0f) && pose.flash_turn == first_flash.turn && pose.flash_size == first_flash.size, "쏜 다음 틱: 섬광이 4/9 로 사그라졌다 (모양은 그대로)");
  pose = gun.pose(world, 0.5f);
  expect(near(pose.slide, 0.034f) && near(pose.pitch, 0.06f) && near(pose.rise, 0.004f) && near(pose.twist, 0.02f), "1.5 틱째: 슬라이드가 끝까지 물러났고 총구가 가장 들렸다");
  expect(near(pose.flash, 0.25f) && near(gun.pose(world, 1.0f).flash, 1.0f / 9.0f), "섬광: 1.5 틱째에 1/4, 2 틱째에 1/9");
  steps(2);
  expect(gun.pose(world, 0.0f).flash == 0.0f && !game::place_weapon(gun.pose(world, 0.0f), {}, 0.0f).flash, "3 틱째: 섬광이 꺼졌다 (총의 반동은 아직 남았다)");
  // 3 틱째: 돌아오는 길의 (3 − 1.5) / 4.5
  expect(near(gun.pose(world, 0.0f).slide, 0.034f * (1.0f - 1.5f / 4.5f)), "3 틱째: 슬라이드가 돌아오는 중");
  steps(2);
  // 5 틱째: s = 3.5 / 10.5 = 1/3 → cos(π/2) = 0. 밀림은 돌아오는 길의 4/6 → (1/3)²
  pose = gun.pose(world, 0.0f);
  expect(near(pose.pitch, 0.0f) && near(pose.twist, 0.0f) && near(pose.back, 0.02f / 9.0f), "5 틱째: 총구가 제자리를 지나는 중이다");
  steps(1);
  pose = gun.pose(world, 0.0f);
  expect(pose.slide == 0.0f && pose.pitch < 0.0f && pose.pitch > -0.06f / 5.0f && pose.back > 0.0f, "6 틱째: 슬라이드는 제자리, 총구는 제자리 밑으로 살짝 지나쳤다");
  steps(2);
  // 8.5 틱째: s = 2/3 → (1/3)² · cos(π) = −1/9
  pose = gun.pose(world, 0.5f);
  expect(near(pose.pitch, -0.06f / 9.0f) && near(pose.twist, -0.02f / 9.0f) && pose.back == 0.0f, "8.5 틱째: 제자리 밑 1/9 에서 돌아오는 중이다 (밀림은 7 틱째에 돌아왔다)");
  steps(4);
  expect(still(gun.pose(world, 0.0f)), "12 틱째: 다 돌아왔다 (반박 안에)");
  // 다음 발은 반대쪽으로 비틀린다. 섬광의 모양도 발마다 다르다
  next_slot(world);
  world.act(game::Action::fire);
  const game::FlashShape second_flash = game::flash_shape(world.event_count() - 1);
  steps(1);
  expect(near(gun.pose(world, 0.5f).twist, -0.02f) && near(gun.pose(world, 0.5f).pitch, 0.06f), "둘째 발: 비틀림이 반대쪽이다");
  pose = gun.pose(world, 0.0f);
  expect(near(pose.flash, 4.0f / 9.0f) && pose.flash_turn == second_flash.turn && pose.flash_size == second_flash.size && second_flash.turn != first_flash.turn && second_flash.size != first_flash.size,
         "둘째 발: 섬광이 다른 각·크기로 난다");
  // 모양은 일 번호만으로 정해진다 — 갈래가 돈 각 0…2π, 크기 5.5 cm ± 15 %
  const game::FlashShape one = game::flash_shape(1), two = game::flash_shape(2);
  expect(near(one.turn, 3.963615f) && near(one.size, 0.053198f) && near(two.turn, 5.881666f) && near(two.size, 0.063102f) && game::flash_shape(1).turn == one.turn,
         "섬광의 모양은 일 번호에서 정해진다 (같은 번호는 늘 같은 모양)");
  steps(12);

  // 마지막 발 — 빈 탄창이면 슬라이드가 2.8 cm 젖혀진 채 멈춘다
  for (int shot = 2; shot < 8; shot++) {
    next_slot(world);
    world.act(game::Action::fire);
    gun.follow(world);
  }
  expect(world.pistol().ammo == 0, "여덟 발을 다 쐈다");
  steps(1);
  expect(near(gun.pose(world, 0.5f).slide, 0.034f), "마지막 발도 끝까지 물러났다가");
  steps(12);
  pose = gun.pose(world, 0.0f);
  expect(near(pose.slide, 0.028f) && pose.pitch == 0.0f && pose.magazine == 0.0f, "빈 탄창: 슬라이드가 젖혀진 채 멈춰 있다");
  // 빈 방아쇠 — 아주 작은 까딱 (5 틱), 슬라이드는 그대로
  next_slot(world);
  world.act(game::Action::fire);
  expect(world.dry_tick() == world.tick(), "빈 방아쇠");
  steps(2);
  pose = gun.pose(world, 0.5f);
  expect(near(pose.pitch, -0.02f) && near(pose.rise, -0.003f) && near(pose.slide, 0.028f), "빈 방아쇠: 2.5 틱째에 총구가 0.02 rad 까딱 내려간다");
  expect(gun.pose(world, 0.0f).flash == 0.0f && gun.pose(world, 0.0f).back == 0.0f, "빈 방아쇠에는 섬광도 반동도 없다");
  steps(3);
  expect(gun.pose(world, 0.0f).pitch == 0.0f, "5 틱째에 돌아온다");

  // 탄창 빼기 — 탄창 길을 따라 5 틱에 11 cm(손잡이 밖)로 빠져 떨어지고 14 틱째에 사라진다. 총은 6 틱에 걸쳐 기울어진다. 다 쏜 탄창이라 빈 것이 보인다
  next_slot(world);
  expect(world.act(game::Action::reload) && world.pistol().reload_stage == 1, "탄창을 뺐다");
  gun.follow(world);
  pose = gun.pose(world, 0.0f);
  expect(pose.magazine == 0.0f && pose.magazine_shown && pose.magazine_empty && pose.cant == 0.0f, "뺀 틱: 탄창은 아직 제자리");
  steps(2);
  expect(near(gun.pose(world, 0.0f).magazine, 0.11f * 0.16f), "2 틱째: 11 cm 의 (2/5)²");
  steps(3);
  pose = gun.pose(world, 0.0f);
  expect(near(pose.magazine, 0.11f) && pose.magazine_shown && pose.cant > 0.9f && pose.cant < 1.0f, "5 틱째: 탄창이 손잡이를 다 빠져나왔다");
  steps(9);
  pose = gun.pose(world, 0.0f);
  expect(!pose.magazine_shown && pose.cant == 1.0f && near(pose.slide, 0.028f), "14 틱째: 탄창은 사라졌고 총은 기울인 채, 슬라이드는 젖혀진 채");

  // 끼우기 — 새 탄창(찬 것)이 15 cm 아래에서 올라와 3 틱째에 든다. 젖혀져 있던 슬라이드가 4 틱째부터 당겨져 7 틱째에 끝(3.4 cm), 12 틱째에 제자리. 13 틱째에 총이 바로 선다
  next_slot(world);
  expect(world.act(game::Action::reload) && world.pistol().reload_stage == 0 && world.pistol().ammo == 8, "탄창을 끼웠다");
  gun.follow(world);
  pose = gun.pose(world, 0.0f);
  expect(near(pose.magazine, 0.15f) && pose.magazine_shown && !pose.magazine_empty && pose.cant == 1.0f && near(pose.slide, 0.028f), "끼운 틱: 새 탄창이 15 cm 아래에 있다");
  steps(1);
  expect(near(gun.pose(world, 0.5f).magazine, 0.15f * 0.25f), "1.5 틱째: 15 cm 의 (1/2)²");
  steps(2);
  pose = gun.pose(world, 0.0f);
  expect(pose.magazine == 0.0f && near(pose.slide, 0.028f) && near(pose.rise, 0.008f) && pose.cant == 1.0f, "3 틱째: 탄창이 들었다 (총이 살짝 들린다)");
  steps(4);
  expect(near(gun.pose(world, 0.0f).slide, 0.034f), "7 틱째: 슬라이드가 끝까지 당겨졌다");
  steps(5);
  expect(gun.pose(world, 0.0f).slide == 0.0f && gun.pose(world, 0.0f).cant > 0.0f, "12 틱째: 슬라이드가 제자리");
  steps(1);
  expect(still(gun.pose(world, 0.0f)), "13 틱째: 재장전의 움직임이 반박(20 틱) 안에 끝났다");

  // 탄이 남은 탄창을 빼면 찬 탄창이 떨어지고 슬라이드는 닫힌 채다. 끼운 뒤 닫혀 있던 슬라이드가 한 번 왕복한다 (4 → 7 → 12 틱)
  next_slot(world);
  world.act(game::Action::fire);
  steps(20);
  next_slot(world);
  world.act(game::Action::reload);
  steps(3);
  pose = gun.pose(world, 0.0f);
  expect(!pose.magazine_empty && pose.magazine > 0.0f && pose.slide == 0.0f, "탄이 남은 탄창: 찬 것이 빠지고 슬라이드는 닫혀 있다");
  next_slot(world);
  world.act(game::Action::reload);
  steps(4);
  expect(gun.pose(world, 0.0f).slide == 0.0f && near(gun.pose(world, 0.5f).slide, 0.034f / 6.0f), "4 틱째부터 슬라이드를 당긴다");
  steps(3);
  expect(near(gun.pose(world, 0.0f).slide, 0.034f), "7 틱째에 끝까지");
  steps(5);
  expect(gun.pose(world, 0.0f).slide == 0.0f, "12 틱째에 제자리");

  // 놓는 자리 — 가만히 든 총의 손잡이는 눈에서 오른쪽 7.2 cm, 아래 11.5 cm, 앞 23.5 cm. 슬라이드는 총열을 따라 뒤로, 탄창은 탄창 길(아래로, 10.5 도 뒤로)을 따라 움직인다
  const game::WeaponPlacement rest = game::place_weapon({}, {}, 0.0f);
  expect(near(rest.body.m[12], 0.072f) && near(rest.body.m[13], -0.115f) && near(rest.body.m[14], -0.235f) && rest.magazine && rest.slide.m == rest.body.m && rest.magazine->m == rest.body.m,
         "가만히 든 총의 자리");
  // 총구(-z)는 앞을 본다 — 조금 왼쪽(가운데 쪽)과 위로
  expect(rest.body.m[10] > 0.99f && rest.body.m[8] > 0.0f && rest.body.m[8] < 0.1f && rest.body.m[9] < 0.0f && rest.body.m[9] > -0.1f, "총구는 화면 가운데 쪽을 본다");
  game::WeaponPose moved;
  moved.slide = 0.02f;
  moved.magazine = 0.1f;
  const game::WeaponPlacement placed = game::place_weapon(moved, {0.01f, 0.02f, 0.03f}, 0.0f);
  const auto offset = [&](const engine::Mat4& part, int axis) { return part.m[12 + axis] - placed.body.m[12 + axis]; };
  expect(near(placed.body.m[12], 0.082f) && near(placed.body.m[13], -0.095f) && near(placed.body.m[14], -0.265f), "움직임의 연출이 총을 옮긴다 (오른쪽, 위, 앞)");
  // 슬라이드: 몸통의 z 축(뒤)으로 2 cm. 탄창: 몸통의 y 축으로 −0.9833, z 축으로 +0.1822 를 10 cm
  bool slides = true, drops = true;
  for (int axis = 0; axis < 3; axis++) {
    slides = slides && near(offset(placed.slide, axis), 0.02f * placed.body.m[8 + axis]);
    drops = drops && near(offset(*placed.magazine, axis), 0.1f * (-0.9833f * placed.body.m[4 + axis] + 0.1822f * placed.body.m[8 + axis]));
  }
  expect(slides && drops, "슬라이드는 뒤로, 탄창은 탄창 길로");
  moved.magazine_shown = false;
  expect(!game::place_weapon(moved, {}, 0.0f).magazine, "사라진 탄창은 놓지 않는다");
  // 섬광은 총구 앞에 붙는다 — 몸통의 틀에서 위로 7.35 cm, 앞으로 18.2 + 2.5 cm. 반동으로 총이 움직이면 같이 움직인다
  expect(!rest.flash && !placed.flash, "섬광이 없는 자세에는 놓지 않는다");
  const auto at_muzzle = [&](const game::WeaponPlacement& gun_at) {
    const engine::Vec3 at = gun_at.flash->at;
    const float where[] = {at.x, at.y, at.z};
    bool on = true;
    for (int axis = 0; axis < 3; axis++) on = on && near(where[axis], gun_at.body.m[12 + axis] + 0.0735f * gun_at.body.m[4 + axis] - 0.207f * gun_at.body.m[8 + axis]);
    return on;
  };
  game::WeaponPose flashing;
  flashing.flash = 0.5f;
  flashing.flash_turn = 1.0f;
  flashing.flash_size = 0.05f;
  const game::WeaponPlacement lit_rest = game::place_weapon(flashing, {}, 0.0f);
  expect(lit_rest.flash && at_muzzle(lit_rest) && lit_rest.flash->glow == 0.5f && lit_rest.flash->turn == 1.0f && lit_rest.flash->size == 0.05f && lit_rest.body.m == rest.body.m,
         "섬광은 총구 앞에 놓인다 (밝기·각·크기는 자세의 것 그대로)");
  // 가만히 든 총의 총구는 눈에서 앞으로 44 cm 쯤, 화면 가운데의 오른쪽 아래다
  expect(lit_rest.flash->at.z < -0.42f && lit_rest.flash->at.z > -0.46f && lit_rest.flash->at.x > 0.0f && lit_rest.flash->at.x < 0.08f && lit_rest.flash->at.y < 0.0f && lit_rest.flash->at.y > -0.06f,
         "가만히 든 총의 섬광 자리");
  flashing.pitch = 0.28f;
  flashing.back = 0.075f;
  flashing.rise = 0.015f;
  const game::WeaponPlacement lit_kicked = game::place_weapon(flashing, {0.01f, 0.0f, 0.0f}, 0.0f);
  expect(lit_kicked.flash && at_muzzle(lit_kicked) && lit_kicked.flash->at.y > lit_rest.flash->at.y + 0.04f && lit_kicked.flash->at.z > lit_rest.flash->at.z + 0.05f, "반동에 총구가 들리고 밀리면 섬광도 따라간다");

  // 미스(칸 사이의 발사 — 나가지 않는다)에는 섬광도 반동도 없다
  steps(20);
  next_slot(world);
  steps(10);
  expect(!world.act(game::Action::fire), "칸 사이의 발사는 나가지 않는다");
  gun.follow(world);
  expect(gun.pose(world, 0.0f).flash == 0.0f && still(gun.pose(world, 0.0f)), "미스에는 섬광도 반동도 없다");
  steps(1);
  expect(gun.pose(world, 0.0f).flash == 0.0f && still(gun.pose(world, 0.0f)), "그 다음 틱에도 없다");

  // 새 판 — 지난 판의 일을 잊는다
  game::World fresh(two_rooms(), kit);
  gun.follow(fresh);
  expect(still(gun.pose(fresh, 0.0f)), "새 판에서는 가만히 든 총이다");
}

void unit() {
  // 높이 270 단위가 기준이고, 메뉴의 틀(좌우 여백 20, 왼쪽 단 112, 사이 12, 패널 208 = 372 단위)이 가로로 들어가야 한다
  expect(game::hud_unit(800, 600) == 2.0f && game::hud_unit(1280, 720) == 3.0f && game::hud_unit(1920, 1080) == 4.0f, "800×600 은 2, 1280×720 은 3, 1920×1080 은 4 픽셀");
  expect(game::hud_unit(1440, 1080) == 3.0f, "4:3 의 1440×1080 은 높이로는 4 지만 메뉴가 들어가게 3 픽셀");
  expect(game::hud_unit(400, 300) == 2.0f, "아주 작은 화면에서도 2 픽셀 밑으로는 내려가지 않는다");
}

}  // namespace

/** 구운 빛 — 팩의 항목 이름, 프로브 격자에서 제자리의 빛, 방의 돌림을 따라 도는 해와 하늘, 겉면 인스턴스에 싣는 빛, 하늘에서 뽑은 해 */
void baked_light() {
  using game::EAST, game::NORTH, game::SOUTH, game::WEST;
  // 틀마다 한 장 — 문이 났든 안 났든, 어떻게 돌려 놓든 같은 굽기다
  expect(game::room_light_name(0) == "light/0" && game::room_light_name(5) == "light/5", "팩의 항목 이름: light/<틀>");

  // 구운 틀을 적고 되읽는다 — 소품 프로브 둘, 격자 21 × 21. 격자의 점 (x 칸, z 줄) 에 해 = x 칸 / 20, 위의 빛 빨강 = z 줄
  std::vector<game::LightProbe> grid(441);
  for (uint32_t z = 0; z < 21; z++)
    for (uint32_t x = 0; x < 21; x++) grid[z * 21 + x] = {{static_cast<float>(z), 0.5f, 0.25f}, {0.125f, 0.0f, 0.0f}, static_cast<float>(x) / 20.0f};
  const game::LightProbe placements[] = {{{1.0f, 2.0f, 3.0f}, {4.0f, 5.0f, 6.0f}, 0.5f}, {{0.0f, 0.0f, 0.0f}, {0.0f, 0.0f, 0.0f}, 1.0f}};
  const std::byte image[] = {std::byte{'q'}, std::byte{'o'}, std::byte{'i'}, std::byte{'f'}, std::byte{9}};
  // 방향 맵 (빛이 주로 오는 쪽) — 라이트맵 뒤에 따로 실린다
  const std::byte toward[] = {std::byte{'q'}, std::byte{'o'}, std::byte{'i'}, std::byte{'f'}, std::byte{7}, std::byte{8}, std::byte{6}};
  const std::vector<std::byte> bytes = game::RoomLight::encode(1024, 556, placements, grid, image, toward);
  // 머리 28 + 프로브 (2 + 441) × 28 + 그림 5 + 방향 맵 7. 격자 점 수 441 = 0x01B9
  expect(bytes.size() == 28 + 443 * 28 + 5 + 7 && bytes[0] == std::byte{'Z'} && bytes[3] == std::byte{'2'} && bytes[4] == std::byte{0} && bytes[5] == std::byte{4} && bytes[12] == std::byte{2} &&
             bytes[16] == std::byte{0xB9} && bytes[17] == std::byte{1} && bytes[20] == std::byte{5} && bytes[24] == std::byte{7},
         "구운 틀의 바이트: 'ZKL2', 크기, 소품 수, 격자 점 수, 라이트맵의 길이, 방향 맵의 길이");
  const auto light = game::RoomLight::decode(bytes);
  expect(light && light->width == 1024 && light->height == 556 && light->placements.size() == 2 && light->placements[0].down[1] == 5.0f && light->placements[0].sun == 0.5f &&
             light->grid.size() == 441 && light->lightmap.size() == 5 && light->lightmap[4] == std::byte{9} && light->direction.size() == 7 && light->direction[4] == std::byte{7} &&
             light->direction[6] == std::byte{6},
         "구운 틀을 되읽는다 (라이트맵과 방향 맵이 따로)");
  if (!light) return;
  const game::LightProbe none{};
  // 격자는 x, z 가 -15 … 15 (1.5 m 간격): (-15, -15) 가 첫 점, (0, 0) 이 가운데 점(칸 10, 줄 10)
  expect(light->at({-15.0f, 0.0f, -15.0f}, none).sun == 0.0f && light->at({15.0f, 5.0f, 15.0f}, none).sun == 1.0f && light->at({15.0f, 0.0f, 15.0f}, none).up[0] == 20.0f, "격자의 모서리 점");
  expect(light->at({0.0f, 0.0f, 0.0f}, none).sun == 0.5f && light->at({0.0f, 0.0f, 0.0f}, none).up[0] == 10.0f, "격자의 가운데 점");
  // 점 사이는 선형으로 — x 0.75 는 칸 10 과 11 의 가운데(해 10.5 / 20 = 0.525), z -5.25 는 줄 6 과 7 의 가운데(위의 빛 6.5)
  const game::LightProbe between = light->at({0.75f, 0.0f, -5.25f}, none);
  expect(std::abs(between.sun - 0.525f) < 1e-6f && std::abs(between.up[0] - 6.5f) < 1e-6f && between.up[1] == 0.5f && between.down[0] == 0.125f, "격자의 점 사이는 선형으로 섞는다");
  expect(light->at({-40.0f, 0.0f, 99.0f}, none).sun == 0.0f && light->at({-40.0f, 0.0f, 99.0f}, none).up[0] == 20.0f, "격자 밖은 가장자리의 값이다");
  // 격자가 없으면 넘겨준 빛 그대로
  const auto bare = game::RoomLight::decode(game::RoomLight::encode(512, 195, placements, {}, image, toward));
  expect(bare && bare->grid.empty() && bare->at({0.0f, 0.0f, 0.0f}, game::OPEN_LIGHT).sun == 1.0f && bare->at({0.0f, 0.0f, 0.0f}, game::OPEN_LIGHT).up[2] == game::sky::UP_LIGHT.z, "격자가 없으면 넘겨준 빛");
  // 어긋난 것은 거절한다 — 잘린 것, 격자 점 수가 다른 것(예전의 9 × 9 도), 숫자가 아닌 값, 예전의 굽기(방향 맵이 없는 'ZKLT', 차이 굽기 'ZKLD')
  std::vector<std::byte> cut(bytes.begin(), bytes.end() - 1), wrong = bytes, old = bytes;
  wrong[16] = std::byte{0xB8};
  old[3] = std::byte{'T'};
  std::vector<game::LightProbe> bad(grid), small(81);
  bad[3].sun = std::nanf("");
  expect(!game::RoomLight::decode(cut) && !game::RoomLight::decode(wrong) && !game::RoomLight::decode(old) && !game::RoomLight::decode(game::RoomLight::encode(8, 8, {}, bad, image, toward)) &&
             !game::RoomLight::decode(game::RoomLight::encode(8, 8, {}, small, image, toward)),
         "어긋난 구운 틀은 거절한다");

  // 방의 돌림 — 빛은 틀의 좌표에서 구웠다. 한 번 돌린 방(틀의 북쪽이 방의 동쪽)에서는 해도 하늘도 방위 90 도를 돈다: 틀에서 남동쪽(x +, z +)의 해가 방에서는 남서쪽(x −, z +)
  const game::Room straight{.x = 0, .z = 0, .doors = 0, .shape = 1, .turn = 0, .depth = 1, .chargers = 0, .casters = 0};
  game::Room quarter = straight, half = straight;
  quarter.turn = 1, half.turn = 2;
  const engine::Vec3 sun0 = game::room_sun(straight), sun1 = game::room_sun(quarter), sun2 = game::room_sun(half);
  expect(sun0.x == game::sky::SUN_DIRECTION.x && sun0.z == game::sky::SUN_DIRECTION.z && sun1.x == -game::sky::SUN_DIRECTION.z && sun1.z == game::sky::SUN_DIRECTION.x && sun1.y == game::sky::SUN_DIRECTION.y &&
             sun2.x == -game::sky::SUN_DIRECTION.x && sun2.z == -game::sky::SUN_DIRECTION.z,
         "돌린 방의 해: 한 번 돌리면 (x, z) → (−z, x), 두 번이면 (−x, −z)");
  const float quarter_turn = std::numbers::pi_v<float> / 2.0f;
  expect(game::room_sky_yaw(straight) == game::sky::YAW && std::abs(game::room_sky_yaw(quarter) - game::sky::YAW - quarter_turn) < 1e-5f && std::abs(game::room_sky_yaw(half) - game::sky::YAW - 2.0f * quarter_turn) < 1e-5f,
         "돌린 방의 하늘 그림: 돌림 한 번에 90 도");
  // 하늘 그림 속의 해도 같은 쪽에 있다 — 방위(북에서 동으로)가 돌림 한 번에 90 도 는다
  const auto azimuth = [](engine::Vec3 v) { return std::atan2(v.x, -v.z); };
  expect(std::abs(std::remainder(azimuth(sun1) - azimuth(sun0) - quarter_turn, 2.0f * std::numbers::pi_v<float>)) < 1e-5f, "해의 방위와 하늘 그림이 같은 만큼 돈다");
  // 프로브 격자는 틀의 좌표다 — 한 번 돌린 방의 동쪽 (12, 0) 은 틀의 북쪽 (0, -12): 칸 10(해 0.5), 줄 2(위의 빛 2)
  const game::LightProbe east = light->at(quarter.to_shape({12.0f, 0.0f, 0.0f}), none);
  expect(east.sun == 0.5f && east.up[0] == 2.0f, "돌린 방에서는 방의 자리를 틀의 좌표로 옮겨 격자를 읽는다");

  // 겉면 인스턴스 — 구운 것은 넷째 칸이 1(라이트맵), 프로브를 받는 것은 위·아래 빛과 해가 실린다
  const engine::SurfaceInstance fixed = game::baked(engine::Mat4::identity()), moving = game::lit(engine::Mat4::identity(), placements[0]);
  expect(fixed.light_down[3] == 1.0f && fixed.x[0] == 1.0f && moving.light_down[3] == 0.0f && moving.light_up == std::array{1.0f, 2.0f, 3.0f, 0.5f} && moving.light_down[2] == 6.0f,
         "겉면 인스턴스의 빛: 구운 것과 프로브");
  // 손에 든 것의 빛은 프레임마다 남은 차이의 몇 분의 일씩 따라간다
  const game::LightProbe followed = game::toward(placements[1], placements[0], 0.25f);
  expect(followed.up[1] == 0.5f && followed.down[2] == 1.5f && followed.sun == 0.875f, "빛이 따라가는 한 걸음");

  // 하늘에서 뽑은 해 (content/sky/sky.txt) — 틀의 좌표에서 남동쪽(방위 139 도), 높이 48 도: 동·남쪽 벽의 창과 천장의 채광 구멍으로 볕이 든다
  const engine::Vec3 sun = game::sky::SUN_DIRECTION;
  expect(std::abs(engine::dot(sun, sun) - 1.0f) < 1e-5f && sun.x > 0.3f && sun.z > 0.3f && std::abs(sun.y - 0.7436f) < 2e-3f && std::abs(std::atan2(sun.x, -sun.z) - 139.0f * std::numbers::pi_v<float> / 180.0f) < 1e-4f,
         "해는 남동쪽 높이 48 도에 있다");
  // 볕 든 바닥(실내라 하늘은 가려 있다 — 해 × sin 높이)의 밝기는 1.0 언저리이고, 볕은 따뜻하고 하늘빛은 푸르다. 하늘빛은 창으로만 드니 키워 두었다 (sky_gain 4.5 — 열린 하늘 아래에서는 볕의 두 배쯤이다: 0.7152 × 2.81 = 2.01)
  const float lit_floor = 0.7152f * game::sky::SUN_LIGHT.y * sun.y, open_sky = 0.7152f * game::sky::UP_LIGHT.y;
  expect(lit_floor > 0.95f && lit_floor < 1.15f && open_sky > 1.8f * lit_floor && open_sky < 2.1f * lit_floor && game::sky::UP_LIGHT.z > game::sky::UP_LIGHT.x && game::sky::SUN_LIGHT.x > game::sky::SUN_LIGHT.z,
         "볕은 따뜻하고 하늘빛은 푸르다");
  // 구운 빛의 크기는 그 틀의 메시와 같아야 한다 — 틀마다 아틀라스 크기가 다르다 (CMake 의 틀 차례가 assets.cpp 와 어긋나면 에셋 팩 검사(game.test.mjs)가 잡는다)
  expect(rooms->rooms[0].lightmap_width() == 1024 && rooms->rooms[3].lightmap_width() == 1024 && rooms->rooms[0].lightmap_height() != rooms->rooms[3].lightmap_height(), "방 틀의 라이트맵 아틀라스");
}

int main() {
  font = engine::hud::Font::decode(game::assets::hud_font());
  rooms = game::RoomMeshes::decode();
  if (!font || !rooms) {
    std::printf("FAIL: 묻힌 글꼴(.fontbin)이나 방 메시가 풀리지 않는다\n");
    return 1;
  }
  kit = rooms->kit();
  // tools/fontc.mjs 가 면 0 에 굽는 글자: 영문·숫자·기호, 완성형 한글 2,350 자, 문장부호·화살표. 완성형 밖의 한글(뷁)은 없다
  expect(font->has(U'가') && font->has(U'힝') && font->has(U'~') && font->has(U'·') && font->has(U'→') && !font->has(U'뷁'), "글꼴은 완성형 한글과 문장부호를 갖고, 그 밖의 한글은 없다");
  // Pretendard Regular 를 32 픽셀로 구웠다: 줄 높이 (1950 + 494) / 2048 × 32 = 38.1875, 'A' 의 나아감 1322 / 2048 × 32 = 20.65625
  expect(font->size() == 32.0f && font->line_height(32.0f) == 38.1875f && font->width("A", 32.0f) == 20.65625f, "묻힌 글꼴은 32 픽셀로 구운 Pretendard 다");
  // 면 셋 — 1 은 Bold 32 픽셀('A' 의 나아감 1470 / 2048 × 32 = 22.96875), 2 는 Bold 64 픽셀. 굵은 면은 적어 둔 글자만 갖는다
  expect(font->faces() == 3 && font->size(1) == 32.0f && font->size(2) == 64.0f && font->width("A", 32.0f, 1) == 22.96875f && font->width("A", 32.0f, 2) == 22.96875f,
         "굵은 면 둘: 32 픽셀과 64 픽셀로 구운 Pretendard Bold");
  expect(font->has(U'시', 1) && !font->has(U'힝', 1) && font->has(U'대', 2) && font->has(U'층', 2) && !font->has(U'혼', 2) && font->has(U'Z', 2), "굵은 면은 적어 둔 한글과 영문·숫자만 갖는다");
  // 숫자는 고정 폭(tnum)으로 구웠다 — Regular 1258 / 2048 × 32 = 19.65625, Bold 1340 / 2048 × 32 = 20.9375. 여느 숫자였다면 '1' 이 '0' 보다 좁다
  expect(font->width("1", 32.0f) == 19.65625f && font->width("0", 32.0f) == 19.65625f && font->width("1111", 32.0f) == font->width("9080", 32.0f), "숫자는 폭이 모두 같다");
  expect(font->width("1", 32.0f, 1) == 20.9375f && font->width("8", 32.0f, 1) == 20.9375f && font->width("17", 64.0f, 2) == font->width("80", 64.0f, 2), "굵은 면의 숫자도 폭이 같다");
  state_from_world();
  dash_cooldown();
  baked_light();
  motion();
  footsteps();
  weapon();
  game_screen();
  assets_gate();
  main_menu();
  options();
  play_and_pause();
  saved_options();
  lobby_panels();
  waiting_room();
  backdrop();
  sound();
  unit();
  if (failures == 0) std::printf("presentation_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
