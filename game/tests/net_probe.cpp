// 로비 프로토콜 검증 프로브 — 소켓 없이 Node 에서 돈다 (tests/game.test.mjs 가 부른다).
// 기대값은 프로토콜 문서(server/protocol.mjs 머리말)대로 손으로 적은 리터럴 바이트다 — 서버 검증(tests/lobby.test.mjs)이
// 같은 바이트를 서버의 decode·encode 에 대 본다. '가' = EA B0 80.
#include <cstdio>
#include <initializer_list>
#include <string>
#include <variant>
#include <vector>

#include "gameplay/domain/lobby.hpp"
#include "gameplay/net/lobby_protocol.hpp"

namespace {

using game::Lobby;
using game::net::Frame;
namespace net = game::net;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

Frame bytes(std::initializer_list<int> values) {
  Frame frame;
  for (const int value : values) frame.push_back(static_cast<std::byte>(value));
  return frame;
}

/** 프레임 뒤에 이어 붙인다 */
Frame operator+(Frame frame, const Frame& tail) {
  frame.insert(frame.end(), tail.begin(), tail.end());
  return frame;
}

/** str — 길이 바이트와 글 */
Frame str(const std::string& text) {
  Frame frame{static_cast<std::byte>(text.size())};
  for (const char c : text) frame.push_back(static_cast<std::byte>(c));
  return frame;
}

std::string repeat(const std::string& text, int count) {
  std::string out;
  for (int i = 0; i < count; i++) out += text;
  return out;
}

bool rejected(const Frame& frame) { return !net::decode(frame); }

template <typename Message>
const Message* decoded(const Frame& frame, std::optional<net::ServerMessage>& keep) {
  keep = net::decode(frame);
  return keep ? std::get_if<Message>(&*keep) : nullptr;
}

// 서버 검증(lobby.test.mjs '서버 메시지를 문서의 바이트로 적는다')과 같은 프레임
const Frame WELCOME = bytes({0x81, 4, 3, 2, 1});
const Frame TWO_ROOMS = bytes({0x82, 2, 0, 7, 0, 0, 0, 0, 1, 4, 3, 0xea, 0xb0, 0x80, 2, 1, 0, 0, 1, 2, 2, 2, 0x61, 0x62});
const Frame ROOM = bytes({0x83, 7, 0, 0, 0, 1, 4, 2, 0, 0, 0, 2, 0x61, 0x62, 2, 2, 0, 0, 0, 0, 1, 0x78, 5, 0, 0, 0, 1, 3, 0xea, 0xb0, 0x80});

void encoding() {
  expect(net::encode_hello() == bytes({0x01, 2}), "HELLO 는 version 2 만 싣는다");
  expect(net::encode_create("ab", 4, "가") == bytes({0x02, 2, 0x61, 0x62, 4, 3, 0xea, 0xb0, 0x80}), "CREATE 는 방 이름, 최대 인원, 닉네임");
  expect(net::encode_join(0x12345678, "x") == bytes({0x03, 0x78, 0x56, 0x34, 0x12, 1, 0x78}), "JOIN 은 방 번호(리틀 엔디언)와 닉네임");
  expect(net::encode_leave() == bytes({0x04}), "LEAVE");
  expect(net::encode_ready(true) == bytes({0x05, 1}) && net::encode_ready(false) == bytes({0x05, 0}), "READY 는 0 또는 1");
  expect(net::encode_start() == bytes({0x06}), "START");
  // 가장 긴 요청 — 20 자·12 자의 4 바이트 글자: 1 + (1 + 80) + 1 + (1 + 48) = 132 바이트 (서버의 프레임 상한 160 안)
  expect(net::encode_create(repeat("\xf0\xa0\x80\x80", 20), 8, repeat("\xf0\xa0\x80\x80", 12)).size() == 132, "가장 긴 CREATE 는 132 바이트");
}

void decoding() {
  std::optional<net::ServerMessage> keep;
  const net::Welcome* welcome = decoded<net::Welcome>(WELCOME, keep);
  expect(welcome && welcome->player_id == 0x01020304, "WELCOME 은 참가자 번호");

  const net::RoomList* list = decoded<net::RoomList>(bytes({0x82, 0, 0}), keep);
  expect(list && list->rooms.empty(), "빈 ROOM_LIST");
  list = decoded<net::RoomList>(TWO_ROOMS, keep);
  expect(list && list->rooms == std::vector<Lobby::RoomEntry>{{.id = 7, .name = "가", .players = 1, .max_players = 4, .playing = false},
                                                               {.id = 258, .name = "ab", .players = 2, .max_players = 2, .playing = true}},
         "ROOM_LIST 는 방마다 번호·상태·인원·정원·이름");

  const net::RoomState* state = decoded<net::RoomState>(ROOM, keep);
  expect(state && state->room == Lobby::Room{.id = 7, .name = "ab", .max_players = 4, .host = 2, .playing = true,
                                             .members = {{.id = 2, .nickname = "x", .ready = false}, {.id = 5, .nickname = "가", .ready = true}}},
         "ROOM_STATE 는 방과 참가자들 (들어온 차례)");

  expect(decoded<net::Left>(bytes({0x84}), keep) != nullptr, "LEFT");
  const net::Refusal* refusal = decoded<net::Refusal>(bytes({0x8f, 13, 6}), keep);
  expect(refusal && refusal->code == 13 && refusal->request == 6, "ERROR 는 오류 코드와 거절당한 요청");

  // 이름의 한계 — 방 이름 20 자, 닉네임 12 자 (바이트가 아니라 글자 수)
  const Frame room_head = bytes({0x82, 1, 0, 1, 0, 0, 0, 0, 1, 2});
  expect(!rejected(room_head + str(repeat("가", 20))) && rejected(room_head + str(repeat("가", 21))), "방 이름은 20 자까지");
  const Frame member_head = bytes({0x83, 1, 0, 0, 0, 0, 2, 9, 0, 0, 0, 1, 0x61, 1, 9, 0, 0, 0, 0});
  expect(!rejected(member_head + str(repeat("가", 12))) && rejected(member_head + str(repeat("가", 13))), "닉네임은 12 자까지");
  expect(!rejected(member_head + str(repeat("\xf0\xa0\x80\x80", 12))), "4 바이트 글자도 한 글자다");
}

void rejecting() {
  // 빈 프레임과 모르는 종류 (클라이언트 → 서버 종류도 모르는 것이다)
  expect(rejected({}) && rejected(bytes({0x00})) && rejected(bytes({0x01, 2})) && rejected(bytes({0x85})) && rejected(bytes({0xff})), "빈 프레임과 모르는 종류");

  // 잘린 프레임과 남는 바이트
  expect(rejected(bytes({0x81})) && rejected(bytes({0x81, 4, 3, 2})) && rejected(bytes({0x81, 4, 3, 2, 1, 0})), "WELCOME 의 길이");
  expect(rejected(bytes({0x82})) && rejected(bytes({0x82, 0})) && rejected(bytes({0x82, 0, 0, 0})), "ROOM_LIST 의 길이");
  expect(rejected(bytes({0x84, 0})), "LEFT 뒤에 남는 바이트");
  expect(rejected(bytes({0x8f})) && rejected(bytes({0x8f, 13})) && rejected(bytes({0x8f, 13, 6, 0})), "ERROR 의 길이");
  for (std::size_t size = 0; size < TWO_ROOMS.size(); size++)
    if (!rejected(Frame(TWO_ROOMS.begin(), TWO_ROOMS.begin() + static_cast<std::ptrdiff_t>(size)))) expect(false, "ROOM_LIST 는 어디서 잘려도 받지 않는다");
  for (std::size_t size = 0; size < ROOM.size(); size++)
    if (!rejected(Frame(ROOM.begin(), ROOM.begin() + static_cast<std::ptrdiff_t>(size)))) expect(false, "ROOM_STATE 는 어디서 잘려도 받지 않는다");
  expect(rejected(TWO_ROOMS + bytes({0})) && rejected(ROOM + bytes({0})), "끝에 남는 바이트");

  // 적힌 개수와 실제가 다르다 — 방 하나를 적고 셋이라 하거나, 둘을 적고 하나라 한다
  expect(rejected(bytes({0x82, 3, 0, 7, 0, 0, 0, 0, 1, 4, 1, 0x61})), "ROOM_LIST 의 개수가 실제보다 많다");
  expect(rejected(bytes({0x82, 1, 0, 7, 0, 0, 0, 0, 1, 4, 1, 0x61, 8, 0, 0, 0, 0, 1, 4, 1, 0x62})), "ROOM_LIST 의 개수가 실제보다 적다");
  expect(rejected(bytes({0x82, 0xff, 0xff})), "ROOM_LIST 가 65535 개라 하고 비어 있다");
  // str 의 길이가 프레임을 넘는다
  expect(rejected(bytes({0x82, 1, 0, 7, 0, 0, 0, 0, 1, 4, 5, 0x61, 0x62})), "방 이름의 길이가 프레임을 넘는다");
  expect(rejected(bytes({0x83, 7, 0, 0, 0, 0, 4, 2, 0, 0, 0, 200, 0x61, 0x62, 1, 2, 0, 0, 0, 0, 1, 0x78})), "대기실 방 이름의 길이가 프레임을 넘는다");
  expect(rejected(bytes({0x83, 7, 0, 0, 0, 0, 4, 2, 0, 0, 0, 2, 0x61, 0x62, 1, 2, 0, 0, 0, 0, 9, 0x78})), "닉네임의 길이가 프레임을 넘는다");

  // 범위 밖의 값 — 올바른 방 한 줄: 번호 7, state 0, 1/4 명, 이름 a
  const auto listed = [](int state, int players, int max_players) { return bytes({0x82, 1, 0, 7, 0, 0, 0, state, players, max_players, 1, 0x61}); };
  expect(!rejected(listed(0, 1, 4)) && !rejected(listed(1, 8, 8)) && !rejected(listed(0, 2, 2)), "올바른 방 한 줄");
  expect(rejected(listed(2, 1, 4)), "state 는 0·1");
  expect(rejected(listed(0, 0, 4)) && rejected(listed(0, 5, 4)), "인원은 1…정원");
  expect(rejected(listed(0, 1, 1)) && rejected(listed(0, 1, 9)), "정원은 2…8");
  // 올바른 대기실: 방 7, state, 정원, 방장 2, 이름 a, 참가자 (2, ready, x)
  const auto waiting = [](int state, int max_players, int host, int count, int ready) {
    return bytes({0x83, 7, 0, 0, 0, state, max_players, host, 0, 0, 0, 1, 0x61, count, 2, 0, 0, 0, ready, 1, 0x78});
  };
  expect(!rejected(waiting(0, 2, 2, 1, 0)) && !rejected(waiting(1, 8, 2, 1, 1)), "올바른 대기실");
  expect(rejected(waiting(2, 2, 2, 1, 0)) && rejected(waiting(0, 2, 2, 1, 2)), "state·ready 는 0·1");
  expect(rejected(waiting(0, 1, 2, 1, 0)) && rejected(waiting(0, 9, 2, 1, 0)), "대기실의 정원은 2…8");
  expect(rejected(waiting(0, 2, 3, 1, 0)), "방장은 참가자 가운데 있어야 한다");
  expect(rejected(bytes({0x83, 7, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0x61, 0})), "참가자가 없는 대기실");
  // 정원 2 에 참가자 셋
  expect(rejected(bytes({0x83, 7, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0x61, 3, 2, 0, 0, 0, 0, 1, 0x78, 3, 0, 0, 0, 0, 1, 0x79, 4, 0, 0, 0, 0, 1, 0x7a})), "참가자가 정원을 넘는다");
  expect(rejected(bytes({0x8f, 0, 6})) && rejected(bytes({0x8f, 16, 6})) && !rejected(bytes({0x8f, 1, 0})) && !rejected(bytes({0x8f, 15, 2})), "오류 코드는 1…15");

  // 이름 — 빈 이름, 끊긴 UTF-8, 돌려 쓴 긴 표기, 대리 영역, 없는 바이트, U+10FFFF 초과
  const Frame head = bytes({0x82, 1, 0, 7, 0, 0, 0, 0, 1, 4});
  expect(rejected(head + bytes({0})), "빈 이름");
  expect(rejected(head + bytes({2, 0xea, 0xb0})) && rejected(head + bytes({2, 0x61, 0x80})), "끊긴 UTF-8");
  expect(rejected(head + bytes({2, 0xc0, 0xaf})) && rejected(head + bytes({3, 0xe0, 0x80, 0xaf})), "돌려 쓴 긴 표기");
  expect(rejected(head + bytes({3, 0xed, 0xa0, 0x80})) && rejected(head + bytes({1, 0xff})) && rejected(head + bytes({4, 0xf4, 0x90, 0x80, 0x80})), "대리 영역과 범위 밖");
  expect(!rejected(head + bytes({4, 0xf4, 0x8f, 0xbf, 0xbf})) && !rejected(head + bytes({3, 0xed, 0x9f, 0xbf})), "U+10FFFF 와 U+D7FF 는 된다");
}

void lobby_state() {
  Lobby lobby;
  lobby.error = "지난 오류";
  net::connecting(lobby);
  expect(lobby.link == Lobby::Link::connecting && lobby.error.empty() && lobby.rooms.empty() && !lobby.room, "연결을 시작하면 비우고 연결하는 중이 된다");

  net::apply(lobby, *net::decode(WELCOME));
  expect(lobby.link == Lobby::Link::online && lobby.player_id == 0x01020304, "WELCOME 을 받으면 연결됨이고 내 번호를 안다");
  net::apply(lobby, *net::decode(TWO_ROOMS));
  expect(lobby.rooms.size() == 2 && lobby.rooms[0].id == 7 && lobby.rooms[1].name == "ab" && !lobby.room, "ROOM_LIST 가 방 목록이 된다");
  net::apply(lobby, *net::decode(bytes({0x82, 1, 0, 9, 0, 0, 0, 0, 1, 2, 1, 0x7a})));
  expect(lobby.rooms == std::vector<Lobby::RoomEntry>{{.id = 9, .name = "z", .players = 1, .max_players = 2, .playing = false}}, "새 ROOM_LIST 는 목록 전체를 바꾼다");

  // 대기실 진입 — 방 7, 대기 중, 정원 4, 방장 2, 이름 ab, 참가자 x(2)
  net::apply(lobby, *net::decode(bytes({0x83, 7, 0, 0, 0, 0, 4, 2, 0, 0, 0, 2, 0x61, 0x62, 1, 2, 0, 0, 0, 0, 1, 0x78})));
  expect(lobby.room && lobby.room->id == 7 && !lobby.room->playing && lobby.room->members.size() == 1, "ROOM_STATE 를 받으면 대기실에 들어가 있다");
  // 갱신 — 가(5)가 들어와 준비했고 방이 시작됐다
  net::apply(lobby, *net::decode(ROOM));
  expect(lobby.room && lobby.room->playing && lobby.room->members.size() == 2 && lobby.room->members[1].ready && lobby.room->members[1].nickname == "가",
         "다음 ROOM_STATE 가 대기실 전체를 바꾼다");

  // 거절 — 문구는 짧은 한 줄. 대기실과 목록은 그대로다
  net::apply(lobby, *net::decode(bytes({0x8f, 14, 6})));
  expect(lobby.error == "준비 안 된 참가자 있음" && lobby.room && lobby.link == Lobby::Link::online, "ERROR 14 의 문구");
  net::apply(lobby, *net::decode(bytes({0x8f, 11, 3})));
  expect(lobby.error == "방이 가득 참", "ERROR 11 의 문구");
  net::apply(lobby, *net::decode(bytes({0x8f, 12, 3})));
  expect(lobby.error == "이미 시작한 방", "ERROR 12 — 참가를 거절당했다");
  net::apply(lobby, *net::decode(bytes({0x8f, 12, 5})));
  expect(lobby.error == "이미 시작한 게임", "ERROR 12 — 시작한 방에서 준비·시작을 거절당했다");
  for (int code = 1; code <= 15; code++) {
    const std::string_view text = net::refusal_text(static_cast<uint8_t>(code), 2);
    if (text.empty() || text.find('\n') != std::string_view::npos) expect(false, "오류 코드마다 한 줄 문구가 있다");
  }
  expect(net::refusal_text(0, 2).empty() && net::refusal_text(16, 2).empty(), "모르는 오류 코드에는 문구가 없다");

  net::apply(lobby, *net::decode(bytes({0x84})));
  expect(!lobby.room && lobby.link == Lobby::Link::online && lobby.rooms.size() == 1, "LEFT 를 받으면 방 밖이다");

  // 끊김 — 받은 것을 모두 비우고 까닭을 남긴다
  net::apply(lobby, *net::decode(ROOM));
  net::closed(lobby, 1006);
  expect(lobby.link == Lobby::Link::offline && lobby.player_id == 0 && lobby.rooms.empty() && !lobby.room, "끊기면 번호·목록·대기실을 비운다");
  expect(lobby.error == "서버 연결 끊김", "연결돼 있다가 끊긴 문구");
  net::connecting(lobby);
  net::closed(lobby, 1006);
  expect(lobby.link == Lobby::Link::offline && lobby.error == "서버 연결 실패", "연결하지 못한 문구");
  net::connecting(lobby);
  net::closed(lobby, 1013);
  expect(lobby.link == Lobby::Link::offline && lobby.error == "서버 정원 초과 — 잠시 뒤 다시 연결", "닫기 코드 1013 의 문구");
  net::connecting(lobby);
  net::apply(lobby, *net::decode(WELCOME));
  net::closed(lobby, 1009);
  expect(lobby.link == Lobby::Link::offline && lobby.error == "서버가 연결을 끊음 (요청 크기 초과)", "닫기 코드 1009 의 문구");
  net::connecting(lobby);
  net::apply(lobby, *net::decode(WELCOME));
  net::apply(lobby, *net::decode(ROOM));
  net::broken(lobby);
  expect(lobby.link == Lobby::Link::offline && !lobby.room && lobby.error == "서버 응답 오류 — 버전 불일치",
         "풀지 못한 프레임으로 끊은 문구");
}

}  // namespace

int main() {
  encoding();
  decoding();
  rejecting();
  lobby_state();
  if (failures == 0) std::printf("net_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
