#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string_view>
#include <variant>
#include <vector>

#include "gameplay/domain/lobby.hpp"

// 로비 프로토콜의 클라이언트 쪽 — 프레임(바이트)을 적고 풀고, 받은 것으로 로비 상태(domain/lobby.hpp)를 고친다.
// 형식은 server/protocol.mjs 머리말이 문서다. 소켓도 화면도 모른다 (바이트만 다룬다 — 프로브가 리터럴 바이트로 검증한다).
namespace game::net {

inline constexpr uint8_t PROTOCOL_VERSION = 2;

using Frame = std::vector<std::byte>;

// ── 클라이언트 → 서버 ─────────────────────────────────────────────────────────
// 이름은 메뉴의 입력 칸이 길이를 막은 것이다 (닉네임 12 자, 방 이름 20 자 — 글자당 4 바이트까지라 str 의 255 바이트에 든다)
Frame encode_hello();
Frame encode_create(std::string_view room_name, int max_players, std::string_view nickname);
Frame encode_join(uint32_t room, std::string_view nickname);
Frame encode_leave();
Frame encode_ready(bool ready);
Frame encode_start();

// ── 서버 → 클라이언트 ─────────────────────────────────────────────────────────
struct Welcome {
  uint32_t player_id;
};
struct RoomList {
  std::vector<Lobby::RoomEntry> rooms;
};
struct RoomState {
  Lobby::Room room;
};
struct Left {};
struct Refusal {
  /** 오류 코드 1…15 */
  uint8_t code;
  /** 거절당한 요청의 종류 (프레임의 첫 바이트) */
  uint8_t request;
};
using ServerMessage = std::variant<Welcome, RoomList, RoomState, Left, Refusal>;

/**
 * 서버 프레임을 푼다. 문서와 어긋나면 nullopt — 빈 프레임, 모르는 종류, 길이가 필드의 합과 다름(잘림·남음, 프레임을 넘는 str·개수),
 * 범위 밖의 값(state·ready 가 0·1 이 아님, 인원이 2…8 밖이거나 정원을 넘음, 오류 코드가 1…15 밖, 방장이 참가자에 없음),
 * 이름이 올바른 UTF-8 이 아니거나 글자 수(닉네임 1…12, 방 이름 1…20)를 벗어남
 */
std::optional<ServerMessage> decode(std::span<const std::byte> frame);

// ── 로비 상태 ─────────────────────────────────────────────────────────────────
/** 연결을 시작했다 — 받은 것을 모두 비우고 연결하는 중으로 */
void connecting(Lobby& lobby);
/** 서버가 보낸 것을 반영한다 */
void apply(Lobby& lobby, const ServerMessage& message);
/**
 * 연결이 닫혔다 (code 는 WebSocket 닫기 코드 — 연결하지 못한 것도 이리로 온다). 받은 것을 모두 비우고,
 * 까닭을 error 에 적는다 (refusal_text 처럼 짧은 한 줄)
 */
void closed(Lobby& lobby, uint16_t code);
/** 서버가 문서와 어긋난 프레임을 보내 이쪽에서 끊었다 — closed 처럼 비우고 error 에 적는다 */
void broken(Lobby& lobby);

/**
 * 서버가 요청을 거절한 까닭 — 메뉴의 판 폭에 드는 짧은 한 줄.
 * code 가 1…15 밖이면 빈 글
 */
std::string_view refusal_text(uint8_t code, uint8_t request);

}  // namespace game::net
