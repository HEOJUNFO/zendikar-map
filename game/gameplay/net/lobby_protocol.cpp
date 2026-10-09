#include "gameplay/net/lobby_protocol.hpp"

#include <algorithm>
#include <string>

namespace game::net {
namespace {

// 메시지 종류 (프레임의 첫 바이트)
constexpr uint8_t HELLO = 0x01, CREATE = 0x02, JOIN = 0x03, LEAVE = 0x04, READY = 0x05, START = 0x06;
constexpr uint8_t WELCOME = 0x81, ROOM_LIST = 0x82, ROOM_STATE = 0x83, LEFT = 0x84, ERROR = 0x8f;
// WebSocket 닫기 코드 — 서버가 프레임이 커서(1009), 연결이 가득 차서(1013) 끊은 것
constexpr uint16_t CLOSE_TOO_BIG = 1009, CLOSE_TRY_LATER = 1013;

void put_u32(Frame& out, uint32_t value) {
  for (int shift = 0; shift < 32; shift += 8) out.push_back(static_cast<std::byte>(value >> shift & 0xff));
}

void put_str(Frame& out, std::string_view text) {
  // 길이 바이트에 드는 만큼만 — 입력 칸이 막아 넘지 않는다 (넘는 이름은 서버가 BAD_NAME 으로 거절한다)
  text = text.substr(0, 255);
  out.push_back(static_cast<std::byte>(text.size()));
  for (const char c : text) out.push_back(static_cast<std::byte>(c));
}

/**
 * 올바른 UTF-8 의 글자(코드 포인트) 수 — 끊긴 글자, 돌려 쓴 긴 표기, 대리 영역, U+10FFFF 초과가 있으면 nullopt.
 * (engine/hud 의 take_codepoint 는 잘못된 바이트를 U+FFFD 로 바꿔 그리는 쪽이다 — 여기서는 받지 않는다)
 */
std::optional<std::size_t> utf8_length(std::string_view text) {
  std::size_t count = 0;
  for (std::size_t at = 0; at < text.size(); count++) {
    const auto byte = [&](std::size_t i) { return static_cast<uint8_t>(text[i]); };
    const uint8_t lead = byte(at);
    const std::size_t size = lead < 0x80 ? 1 : lead >> 5 == 0b110 ? 2 : lead >> 4 == 0b1110 ? 3 : lead >> 3 == 0b11110 ? 4 : 0;
    if (size == 0 || at + size > text.size()) return std::nullopt;
    char32_t code = size == 1 ? lead : lead & (0xff >> (size + 1));
    for (std::size_t i = 1; i < size; i++) {
      if (byte(at + i) >> 6 != 0b10) return std::nullopt;
      code = code << 6 | (byte(at + i) & 0x3f);
    }
    constexpr char32_t SMALLEST[] = {0, 0, 0x80, 0x800, 0x10000};
    if (code < SMALLEST[size] || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return std::nullopt;
    at += size;
  }
  return count;
}

/** 프레임을 앞에서부터 읽는다 — 프레임을 넘거나 값이 어긋나면 ok 가 꺼지고, 그 뒤로 읽은 값은 뜻이 없다 */
struct Reader {
  std::span<const std::byte> frame;
  std::size_t at{};
  bool ok{true};

  bool has(std::size_t size) {
    if (ok && frame.size() - at < size) ok = false;
    return ok;
  }
  uint8_t u8() {
    if (!has(1)) return 0;
    return static_cast<uint8_t>(frame[at++]);
  }
  uint16_t u16() {
    const uint16_t low = u8();
    return static_cast<uint16_t>(low | u8() << 8);
  }
  uint32_t u32() {
    const uint32_t low = u16();
    return low | static_cast<uint32_t>(u16()) << 16;
  }
  /** 0 또는 1 */
  bool flag() {
    const uint8_t value = u8();
    if (value > 1) ok = false;
    return value == 1;
  }
  /** 올바른 UTF-8 로 1…max_chars 글자인 이름 */
  std::string name(std::size_t max_chars) {
    const std::size_t size = u8();
    if (!has(size)) return {};
    const std::string text(reinterpret_cast<const char*>(frame.data() + at), size);
    at += size;
    const std::optional<std::size_t> chars = utf8_length(text);
    if (!chars || *chars < 1 || *chars > max_chars) ok = false;
    return text;
  }
  /** 정원 2…8 */
  uint8_t capacity() {
    const uint8_t value = u8();
    if (value < MIN_PLAYERS || value > MAX_PLAYERS) ok = false;
    return value;
  }
  /** 어긋난 데 없이 프레임의 끝까지 읽었는가 */
  bool done() const { return ok && at == frame.size(); }
};

/** 받은 것을 모두 비우고 끊긴 상태로 — error 만 남긴다 */
void drop(Lobby& lobby, std::string_view error) {
  lobby = {};
  lobby.error = error;
}

}  // namespace

Frame encode_hello() { return {std::byte{HELLO}, std::byte{PROTOCOL_VERSION}}; }

Frame encode_create(std::string_view room_name, int max_players, std::string_view nickname) {
  Frame out{std::byte{CREATE}};
  put_str(out, room_name);
  out.push_back(static_cast<std::byte>(std::clamp(max_players, MIN_PLAYERS, MAX_PLAYERS)));
  put_str(out, nickname);
  return out;
}

Frame encode_join(uint32_t room, std::string_view nickname) {
  Frame out{std::byte{JOIN}};
  put_u32(out, room);
  put_str(out, nickname);
  return out;
}

Frame encode_leave() { return {std::byte{LEAVE}}; }
Frame encode_ready(bool ready) { return {std::byte{READY}, std::byte{ready}}; }
Frame encode_start() { return {std::byte{START}}; }

std::optional<ServerMessage> decode(std::span<const std::byte> frame) {
  Reader in{frame};
  switch (in.u8()) {
    case WELCOME: {
      const Welcome welcome{in.u32()};
      if (in.done()) return welcome;
      break;
    }
    case ROOM_LIST: {
      RoomList list;
      // 적힌 개수만큼 읽되, 프레임이 먼저 끝나면 거기서 멈춘다 (개수를 믿고 자리를 잡지 않는다)
      for (uint32_t left = in.u16(); in.ok && left > 0; left--) {
        Lobby::RoomEntry room{};
        room.id = in.u32();
        room.playing = in.flag();
        room.players = in.u8();
        room.max_players = in.capacity();
        room.name = in.name(ROOM_NAME_LENGTH);
        if (room.players < 1 || room.players > room.max_players) in.ok = false;
        list.rooms.push_back(std::move(room));
      }
      if (in.done()) return list;
      break;
    }
    case ROOM_STATE: {
      Lobby::Room room{};
      room.id = in.u32();
      room.playing = in.flag();
      room.max_players = in.capacity();
      room.host = in.u32();
      room.name = in.name(ROOM_NAME_LENGTH);
      const uint8_t count = in.u8();
      if (count < 1 || count > room.max_players) in.ok = false;
      bool has_host = false;
      for (uint8_t left = count; in.ok && left > 0; left--) {
        Lobby::Member member{};
        member.id = in.u32();
        member.ready = in.flag();
        member.nickname = in.name(NICKNAME_LENGTH);
        has_host |= member.id == room.host;
        room.members.push_back(std::move(member));
      }
      if (in.done() && has_host) return RoomState{std::move(room)};
      break;
    }
    case LEFT:
      if (in.done()) return Left{};
      break;
    case ERROR: {
      const Refusal refusal{.code = in.u8(), .request = in.u8()};
      if (in.done() && !refusal_text(refusal.code, refusal.request).empty()) return refusal;
      break;
    }
    default: break;
  }
  return std::nullopt;
}

void connecting(Lobby& lobby) {
  lobby = {};
  lobby.link = Lobby::Link::connecting;
}

void apply(Lobby& lobby, const ServerMessage& message) {
  if (const Welcome* welcome = std::get_if<Welcome>(&message)) {
    lobby.link = Lobby::Link::online;
    lobby.player_id = welcome->player_id;
  } else if (const RoomList* list = std::get_if<RoomList>(&message)) {
    lobby.rooms = list->rooms;
  } else if (const RoomState* state = std::get_if<RoomState>(&message)) {
    lobby.room = state->room;
  } else if (std::holds_alternative<Left>(message)) {
    lobby.room.reset();
  } else if (const Refusal* refusal = std::get_if<Refusal>(&message)) {
    lobby.error = refusal_text(refusal->code, refusal->request);
  }
}

void closed(Lobby& lobby, uint16_t code) {
  if (code == CLOSE_TOO_BIG) return drop(lobby, "서버가 연결을 끊음 (요청 크기 초과)");
  if (code == CLOSE_TRY_LATER) return drop(lobby, "서버 정원 초과 — 잠시 뒤 다시 연결");
  if (lobby.link != Lobby::Link::online) return drop(lobby, "서버 연결 실패");
  drop(lobby, "서버 연결 끊김");
}

void broken(Lobby& lobby) { drop(lobby, "서버 응답 오류 — 버전 불일치"); }

std::string_view refusal_text(uint8_t code, uint8_t request) {
  switch (code) {
    // 이쪽이 문서대로 보냈다면 오지 않는 것들 — 게임과 서버가 서로 다른 판이다
    case 1:
    case 2:
    case 4:
    case 5: return "요청 거부 — 버전 불일치";
    case 3: return "버전 불일치 — 새로 고침 필요";
    case 6: return "사용할 수 없는 이름";
    case 7: return "최대 인원은 2~8명";
    case 8: return "이미 방에 들어가 있음";
    case 9: return "들어가 있는 방 없음";
    case 10: return "없어진 방";
    case 11: return "방이 가득 참";
    case 12:
      if (request == JOIN) return "이미 시작한 방";
      return "이미 시작한 게임";
    case 13: return "방장만 시작 가능";
    case 14: return "준비 안 된 참가자 있음";
    case 15: return "서버의 방 수 초과";
    default: return {};
  }
}

}  // namespace game::net
