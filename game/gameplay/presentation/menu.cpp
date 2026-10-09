#include "gameplay/presentation/menu.hpp"

#include <algorithm>
#include <charconv>
#include <cmath>

namespace game {
namespace {

using engine::hud::Event;

/** 프로토콜의 이름 규칙 가운데 입력 칸이 막지 못하는 것 — 앞뒤가 공백이 아니다 (비어 있지 않은 이름에만 묻는다. 길이는 입력 칸이 막는다) */
bool padded(std::string_view name) { return name.front() == ' ' || name.back() == ' '; }

std::string_view link_blocker(const Lobby& lobby) {
  if (lobby.link == Lobby::Link::offline) return "서버 연결 끊김";
  if (lobby.link == Lobby::Link::connecting) return "연결 중…";
  return {};
}

/** 고른 항목의 패널에서 맨 먼저 포커스를 받는 위젯 */
engine::hud::Id first_widget(MenuItem item) {
  switch (item) {
    case MenuItem::solo: return HUD_SOLO_START;
    case MenuItem::find: return HUD_NICKNAME;
    case MenuItem::create: return HUD_ROOM_NAME;
    case MenuItem::options: return HUD_SENSITIVITY;
  }
  return 0;
}

void join(const Menu& menu, const Lobby& lobby, HudOutcome& out) {
  if (join_blocker(menu, lobby).empty()) out.lobby.push_back({.kind = LobbyRequest::Kind::join, .room = *menu.room});
}

void press(engine::hud::Id id, Menu& menu, const Lobby& lobby, HudOutcome& out) {
  switch (id) {
    case HUD_MENU: out.focus = first_widget(menu.item); break;
    // 화면은 포인터가 잡힌 뒤에 바뀐다 (apply_pointer_capture) — 호스트가 못 잡으면 그대로 남는다
    case HUD_SOLO_START:
      if (play_blocker(menu).empty()) out.host |= HOST_CAPTURE_POINTER;
      break;
    case HUD_RESUME:
    case HUD_RETRY: out.host |= HOST_CAPTURE_POINTER; break;
    case HUD_ASSETS_RETRY:
      if (menu.assets == Assets::failed) out.reload_assets = true;
      break;
    case HUD_PAUSE_OPTIONS:
      menu.pause_options = !menu.pause_options;
      if (menu.pause_options) out.focus = HUD_SENSITIVITY;
      break;
    case HUD_QUIT:
      // 방의 판에서 나오는 것은 그 방에서 나가는 것이다
      if (lobby.room) out.lobby.push_back({.kind = LobbyRequest::Kind::leave});
      menu.screen = Screen::main;
      menu.pause_options = false;
      out.focus = HUD_MENU;
      break;
    case HUD_RECONNECT:
      if (lobby.link == Lobby::Link::offline) out.lobby.push_back({.kind = LobbyRequest::Kind::reconnect});
      break;
    case HUD_ROOMS:
    case HUD_JOIN: join(menu, lobby, out); break;
    case HUD_CREATE:
      if (create_blocker(menu, lobby).empty()) out.lobby.push_back({.kind = LobbyRequest::Kind::create});
      break;
    case HUD_READY:
      if (lobby.room)
        for (const Lobby::Member& member : lobby.room->members)
          if (member.id == lobby.player_id) out.lobby.push_back({.kind = LobbyRequest::Kind::ready, .ready = !member.ready});
      break;
    case HUD_ROOM_START:
      if (start_blocker(lobby).empty()) out.lobby.push_back({.kind = LobbyRequest::Kind::start});
      break;
    case HUD_ROOM_ENTER:
      if (lobby.room && lobby.room->playing && play_blocker(menu).empty()) out.host |= HOST_CAPTURE_POINTER;
      break;
    case HUD_LEAVE:
      if (lobby.room) out.lobby.push_back({.kind = LobbyRequest::Kind::leave});
      break;
    default: break;
  }
}

}  // namespace

std::string_view join_blocker(const Menu& menu, const Lobby& lobby) {
  if (const std::string_view link = link_blocker(lobby); !link.empty()) return link;
  if (menu.nickname.empty()) return "닉네임 필요";
  if (padded(menu.nickname)) return "닉네임 앞뒤 공백 불가";
  if (lobby.rooms.empty()) return "열린 방 없음";
  const auto room = std::find_if(lobby.rooms.begin(), lobby.rooms.end(), [&](const Lobby::RoomEntry& entry) { return menu.room == entry.id; });
  if (room == lobby.rooms.end()) return "방 선택 필요";
  if (room->playing) return "진행 중인 방";
  if (room->players >= room->max_players) return "방이 가득 참";
  return {};
}

std::string_view create_blocker(const Menu& menu, const Lobby& lobby) {
  if (const std::string_view link = link_blocker(lobby); !link.empty()) return link;
  if (menu.room_name.empty()) return "방 이름 필요";
  if (padded(menu.room_name)) return "방 이름 앞뒤 공백 불가";
  if (menu.nickname.empty()) return "닉네임 필요";
  if (padded(menu.nickname)) return "닉네임 앞뒤 공백 불가";
  return {};
}

std::string_view start_blocker(const Lobby& lobby) {
  if (!lobby.room || lobby.room->host != lobby.player_id) return "방장만 시작 가능";
  // 방장의 준비는 시작 조건에 들지 않는다
  for (const Lobby::Member& member : lobby.room->members)
    if (member.id != lobby.room->host && !member.ready) return "전원 준비 대기 중";
  return {};
}

std::string_view play_blocker(const Menu& menu) {
  if (menu.assets == Assets::loading) return "불러오는 중…";
  if (menu.assets == Assets::failed) return "에셋 불러오기 실패";
  return {};
}

bool wants_lobby(const Menu& menu, const Lobby& lobby) {
  return lobby.room || (menu.screen == Screen::main && (menu.item == MenuItem::find || menu.item == MenuItem::create));
}

engine::hud::Id lobby_focus(const Menu& menu, const Lobby& before, const Lobby& after) {
  // 게임 중·일시정지에는 대기실이 보이지 않는다 — 그 화면의 포커스를 건드리지 않는다
  if (menu.screen != Screen::main) return 0;
  if (!after.room) return before.room ? HUD_MENU : 0;
  const bool host = after.room->host == after.player_id;
  if (after.room->playing) return before.room && before.room->playing ? 0 : HUD_ROOM_ENTER;
  if (!before.room) return host ? HUD_ROOM_START : HUD_READY;
  // 방장이 나가 내가 방장이 됐다 — 준비 단추가 시작 단추로 바뀐다
  return host && before.room->host != before.player_id ? HUD_ROOM_START : 0;
}

HudOutcome apply_hud_events(std::span<const Event> events, Menu& menu, const Lobby& lobby) {
  HudOutcome out;
  for (const Event& event : events) {
    switch (event.kind) {
      case Event::Kind::press:
        // 브라우저는 사용자가 무언가 누른 뒤에야 소리를 내 준다 — 누른 답마다 소리를 켜 달라고 한다 (이미 켜져 있으면 호스트가 넘긴다)
        out.host |= HOST_RESUME_AUDIO;
        press(event.id, menu, lobby, out);
        break;
      case Event::Kind::select:
        if (event.id == HUD_MENU && event.item >= 0 && event.item <= static_cast<int>(MenuItem::options)) menu.item = static_cast<MenuItem>(event.item);
        if (event.id == HUD_ROOMS && event.item >= 0 && static_cast<std::size_t>(event.item) < lobby.rooms.size())
          menu.room = lobby.rooms[static_cast<std::size_t>(event.item)].id;
        break;
      case Event::Kind::change:
        // 칸에 맞춘다 — 슬라이더가 준 값의 끝자리 오차가 쌓이지 않는다
        if (event.id == HUD_SENSITIVITY) menu.options.sensitivity = std::clamp(std::round(event.value * 10.0f) / 10.0f, SENSITIVITY_MIN, SENSITIVITY_MAX);
        if (event.id == HUD_FOV) menu.options.fov = std::clamp(std::round(event.value / FOV_STEP) * FOV_STEP, FOV_MIN, FOV_MAX);
        if (event.id == HUD_INVERT_Y) menu.options.invert_y = event.value != 0.0f;
        if (event.id == HUD_SHAKE) menu.options.shake = event.value != 0.0f;
        if (event.id == HUD_JUDGE_OFFSET) menu.options.judge_offset = std::clamp(std::round(event.value / JUDGE_OFFSET_STEP) * JUDGE_OFFSET_STEP, -JUDGE_OFFSET_MAX, JUDGE_OFFSET_MAX);
        if (event.id == HUD_TIMING) menu.options.timing = event.value != 0.0f;
        if (event.id == HUD_MUSIC_VOLUME) menu.options.music = std::clamp(std::round(event.value / VOLUME_STEP) * VOLUME_STEP, 0.0f, 1.0f);
        if (event.id == HUD_EFFECTS_VOLUME) menu.options.effects = std::clamp(std::round(event.value / VOLUME_STEP) * VOLUME_STEP, 0.0f, 1.0f);
        if (event.id == HUD_MAX_PLAYERS) menu.max_players = std::clamp(static_cast<int>(std::lround(event.value)), MIN_PLAYERS, MAX_PLAYERS);
        break;
      case Event::Kind::edit:
        if (event.id == HUD_NICKNAME) menu.nickname = event.text;
        if (event.id == HUD_ROOM_NAME) menu.room_name = event.text;
        break;
    }
  }
  return out;
}

HudOutcome apply_pointer_capture(Menu& menu, bool captured) {
  HudOutcome out;
  if (captured) {
    out.new_game = menu.screen == Screen::main || menu.screen == Screen::over;
    menu.screen = Screen::playing;
    menu.pause_options = false;
  } else if (menu.screen == Screen::playing) {
    menu.screen = Screen::paused;
    out.focus = HUD_RESUME;
  }
  return out;
}

HudOutcome apply_game_over(Menu& menu) {
  HudOutcome out;
  if (menu.screen != Screen::playing) return out;
  menu.screen = Screen::over;
  out.focus = HUD_RETRY;
  return out;
}

HudOutcome apply_menu_back(Menu& menu, const Lobby& lobby) {
  HudOutcome out;
  if (menu.screen == Screen::main && !lobby.room) out.focus = HUD_MENU;
  if (menu.screen == Screen::paused && menu.pause_options) {
    menu.pause_options = false;
    out.focus = HUD_PAUSE_OPTIONS;
  }
  return out;
}

namespace {

constexpr std::string_view OPTIONS_VERSION = "zk1";
constexpr std::size_t OPTIONS_FIELDS = 8;

}  // namespace

std::string encode_options(const Options& options) {
  const long fields[OPTIONS_FIELDS] = {std::lround(options.sensitivity * 10.0f), std::lround(options.fov),          options.invert_y ? 1 : 0,          options.shake ? 1 : 0,
                                       std::lround(options.music * 10.0f),       std::lround(options.effects * 10.0f), std::lround(options.judge_offset), options.timing ? 1 : 0};
  std::string text{OPTIONS_VERSION};
  for (const long field : fields) text += " " + std::to_string(field);
  return text;
}

bool decode_options(std::string_view text, Options& options) {
  if (text.size() > OPTIONS_TEXT_MAX || !text.starts_with(OPTIONS_VERSION)) return false;
  text.remove_prefix(OPTIONS_VERSION.size());
  int fields[OPTIONS_FIELDS];
  for (int& field : fields) {
    // 빈칸 하나, 그 뒤에 정수 (부호는 − 만) — 다른 글자가 끼어 있으면 깨진 글이다
    if (text.empty() || text.front() != ' ') return false;
    const auto [end, error] = std::from_chars(text.data() + 1, text.data() + text.size(), field);
    if (error != std::errc{}) return false;
    text.remove_prefix(static_cast<std::size_t>(end - text.data()));
  }
  if (!text.empty()) return false;
  const auto within = [](int value, float low, float high) { return static_cast<float>(value) >= low && static_cast<float>(value) <= high; };
  const auto flag = [](int value) { return value == 0 || value == 1; };
  if (!within(fields[0], SENSITIVITY_MIN * 10.0f, SENSITIVITY_MAX * 10.0f) || !within(fields[1], FOV_MIN, FOV_MAX) || !flag(fields[2]) || !flag(fields[3]) || !within(fields[4], 0.0f, 10.0f) ||
      !within(fields[5], 0.0f, 10.0f) || !within(fields[6], -JUDGE_OFFSET_MAX, JUDGE_OFFSET_MAX) || !flag(fields[7]))
    return false;
  // 칸에 맞춘다 — 위젯이 값을 고칠 때와 같은 식이라, 적었다 읽으면 같은 값이다
  options = {.sensitivity = static_cast<float>(fields[0]) / 10.0f,
             .fov = std::round(static_cast<float>(fields[1]) / FOV_STEP) * FOV_STEP,
             .invert_y = fields[2] != 0,
             .shake = fields[3] != 0,
             .music = static_cast<float>(fields[4]) * VOLUME_STEP,
             .effects = static_cast<float>(fields[5]) * VOLUME_STEP,
             .judge_offset = std::round(static_cast<float>(fields[6]) / JUDGE_OFFSET_STEP) * JUDGE_OFFSET_STEP,
             .timing = fields[7] != 0};
  return true;
}

}  // namespace game
