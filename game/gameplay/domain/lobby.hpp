#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

// 로비 — 로비 서버(game/server, 프로토콜은 server/protocol.mjs 머리말)에서 받은 것을 그대로 담는 상태.
// 채우는 것은 네트워크 클라이언트(net/lobby_protocol.hpp)이고, 메뉴(presentation/menu.hpp·hud.hpp)는 읽기만 한다.
namespace game {

/** 프로토콜의 한계 — 이름은 글자(코드 포인트) 수 */
inline constexpr std::size_t NICKNAME_LENGTH = 12;
inline constexpr std::size_t ROOM_NAME_LENGTH = 20;
inline constexpr int MIN_PLAYERS = 2;
inline constexpr int MAX_PLAYERS = 8;

struct Lobby {
  /** 서버와의 연결 — 끊김, 연결하는 중(소켓이 열리고 HELLO 의 답이 오기를 기다린다), 연결됨(WELCOME 을 받았다) */
  enum class Link { offline, connecting, online };

  /** ROOM_LIST 의 방 하나 */
  struct RoomEntry {
    uint32_t id;
    std::string name;
    uint8_t players;
    uint8_t max_players;
    /** state 1 — 진행 중인 방에는 들어갈 수 없다 */
    bool playing;
    bool operator==(const RoomEntry&) const = default;
  };

  /** ROOM_STATE 의 참가자 하나 */
  struct Member {
    uint32_t id;
    std::string nickname;
    bool ready;
    bool operator==(const Member&) const = default;
  };

  /** ROOM_STATE — 들어가 있는 방 (참가자는 들어온 차례) */
  struct Room {
    uint32_t id;
    std::string name;
    uint8_t max_players;
    /** 방장의 참가자 번호 */
    uint32_t host;
    bool playing;
    std::vector<Member> members;
    bool operator==(const Room&) const = default;
  };

  Link link{Link::offline};
  /** WELCOME 이 준 내 참가자 번호 */
  uint32_t player_id{};
  /** 방 목록 (만든 차례) */
  std::vector<RoomEntry> rooms;
  /** 들어가 있는 방 — 있으면 메뉴가 대기실을 보인다. LEFT 를 받거나 끊기면 비운다 */
  std::optional<Room> room;
  /** 화면에 보일 오류 문구 (연결 실패, 서버가 거절한 까닭) — 짧은 한 줄. 없으면 빈 글 */
  std::string error;
  bool operator==(const Lobby&) const = default;
};

}  // namespace game
