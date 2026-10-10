// 로비 프로토콜 — WebSocket 바이너리 프레임 하나가 메시지 하나다 (텍스트 프레임은 받지 않는다).
// 클라이언트는 wasm 안의 C++ 가 Emscripten WebSocket API 로 직접 붙는다. C++ 쪽에 JSON 파서가 없어
// 고정된 필드를 차례로 적은 바이너리로 정했다 — 읽고 쓰는 데 바이트 복사만 든다.
//
// 표기
//   u8·u16·u32   부호 없는 정수, 리틀 엔디언
//   str          u8 바이트 수 + 그만큼의 UTF-8 (끝의 0 없음)
//   프레임의 첫 바이트(u8)가 메시지 종류다. 아래 표는 그 뒤에 오는 필드를 차례로 적는다.
//   프레임 길이는 필드의 합과 정확히 같아야 한다 (모자라거나 남으면 BAD_FRAME).
//
// 클라이언트 → 서버 (프레임은 160 바이트까지 — 넘으면 서버가 닫기 코드 1009 로 끊는다)
//   0x01 HELLO   u8 version(=2)                     맨 처음 한 번. → WELCOME, 이어서 ROOM_LIST
//   0x02 CREATE  str roomName, u8 maxPlayers(2…8), str nickname
//                                                   방을 만들고 방장으로 들어간다. → ROOM_STATE
//   0x03 JOIN    u32 roomId, str nickname           대기 중인 방에 들어간다. → ROOM_STATE
//   0x04 LEAVE   (없음)                             방에서 나온다. → LEFT, 이어서 ROOM_LIST
//   0x05 READY   u8 ready(0|1)                      준비 상태를 바꾼다. → ROOM_STATE
//   0x06 START   (없음)                             방장만. 방장 말고 모두 준비여야 한다. → ROOM_STATE(state=1)
// 닉네임은 방에 들어갈 때(CREATE·JOIN)마다 적는다 — 그 방에서의 이름이다. 방 목록은 이름 없이 본다.
//
// 서버 → 클라이언트
//   0x81 WELCOME     u32 playerId                   이 연결의 참가자 번호 (연결마다 새 번호)
//   0x82 ROOM_LIST   u16 count, count × { u32 roomId, u8 state, u8 players, u8 maxPlayers, str roomName }
//                    방 목록 전체 (만든 차례). HELLO 를 마치고 방에 들어가 있지 않은 연결에게,
//                    들어올 때(HELLO·LEAVE 뒤) 한 번, 그 뒤 목록이 바뀔 때마다 (방 생김·없어짐·인원·시작) 온다.
//   0x83 ROOM_STATE  u32 roomId, u8 state, u8 maxPlayers, u32 hostId, str roomName,
//                    u8 count, count × { u32 playerId, u8 ready, str nickname }
//                    대기실 전체 (들어온 차례). 그 방에 있는 모두에게, 방이 바뀔 때마다
//                    (들어옴·나감·끊김·방장 바뀜·준비·시작) 온다.
//   0x84 LEFT        (없음)                         LEAVE 의 응답. 이제 방 밖이다.
//   0x8f ERROR       u8 code, u8 request            request 는 거절한 프레임의 첫 바이트 (빈 프레임·텍스트 프레임이면 0).
//                    거절한 요청은 아무것도 바꾸지 않고, 연결은 그대로 둔다.
//
// state: 0 대기 중 · 1 진행 중. 진행 중인 방에는 들어갈 수 없고 준비·시작을 받지 않는다 (나가기는 된다).
// 방장이 나가거나 끊기면 남은 사람 가운데 가장 먼저 들어온 사람이 방장이 된다. 아무도 남지 않은 방은 없어진다.
// 방장의 ready 는 시작 조건에 들지 않는다 (혼자 있는 방장은 바로 시작할 수 있다).
//
// 이름 (nickname·roomName): 올바른 UTF-8, 닉네임 1…12 글자 · 방 이름 1…20 글자 (바이트가 아니라 코드 포인트 수),
// 제어 문자(Cc)·서식 문자(Cf — 폭 없는 문자, BOM, 방향 바꿈)·줄/문단 구분자가 없고, 앞뒤가 공백이 아니어야 한다.
// 어긋나면 BAD_NAME.
//
// 오류 코드
//    1 BAD_FRAME      길이가 필드와 맞지 않는다, 빈 프레임, 텍스트 프레임
//    2 UNKNOWN_TYPE   모르는 메시지 종류
//    3 BAD_VERSION    HELLO 의 version 이 2 가 아니다
//    4 NEED_HELLO     HELLO 전에 다른 요청을 보냈다
//    5 ALREADY_HELLO  HELLO 를 두 번 보냈다
//    6 BAD_NAME       이름 규칙에 어긋난다
//    7 BAD_ARG        maxPlayers 가 2…8 밖, ready 가 0·1 이 아니다
//    8 IN_ROOM        이미 방에 있는데 CREATE·JOIN
//    9 NOT_IN_ROOM    방에 없는데 LEAVE·READY·START
//   10 NO_ROOM        그런 방이 없다
//   11 ROOM_FULL      방이 찼다
//   12 PLAYING        진행 중인 방이다 (JOIN·READY·START)
//   13 NOT_HOST       방장이 아닌데 START
//   14 NOT_READY      준비하지 않은 사람이 있다
//   15 LOBBY_FULL     방이 64 개라 더 만들 수 없다
// 연결이 256 개면 새 연결은 닫기 코드 1013 으로 끊는다.

export const VERSION = 2
// 가장 긴 요청은 CREATE — 1 + (1 + 80) + 1 + (1 + 48) = 132 바이트
export const MAX_FRAME = 160
export const C = { HELLO: 0x01, CREATE: 0x02, JOIN: 0x03, LEAVE: 0x04, READY: 0x05, START: 0x06 }
export const S = { WELCOME: 0x81, ROOM_LIST: 0x82, ROOM_STATE: 0x83, LEFT: 0x84, ERROR: 0x8f }
export const E = {
  BAD_FRAME: 1,
  UNKNOWN_TYPE: 2,
  BAD_VERSION: 3,
  NEED_HELLO: 4,
  ALREADY_HELLO: 5,
  BAD_NAME: 6,
  BAD_ARG: 7,
  IN_ROOM: 8,
  NOT_IN_ROOM: 9,
  NO_ROOM: 10,
  ROOM_FULL: 11,
  PLAYING: 12,
  NOT_HOST: 13,
  NOT_READY: 14,
  LOBBY_FULL: 15,
}

const NICKNAME_CHARS = 12
const ROOM_NAME_CHARS = 20
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const FORBIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u

/** 클라이언트 프레임(Uint8Array)을 요청으로 푼다 — 어긋나면 오류 코드(숫자)를 돌려준다 */
export function decode(bytes) {
  if (bytes.length === 0) return E.BAD_FRAME
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length)
  const type = bytes[0]
  // 필드를 차례로 읽는 자리 — 프레임을 넘으면 -1 로 남는다
  let at = 1
  const skip = (size) => {
    const from = at
    at = at < 0 || at + size > bytes.length ? -1 : at + size
    return from
  }
  /** str 의 바이트 (길이 바이트 뒤) — 프레임을 넘으면 null */
  const str = () => {
    const length = bytes[skip(1)]
    const from = skip(length ?? 0)
    return at < 0 ? null : bytes.subarray(from, from + length)
  }
  /** 이름 규칙에 맞는 글 — 어긋나면 null */
  const name = (raw, maxChars) => {
    let text
    try {
      text = utf8.decode(raw)
    } catch {
      return null
    }
    const chars = [...text].length
    return chars < 1 || chars > maxChars || FORBIDDEN.test(text) || text !== text.trim() ? null : text
  }
  // 길이(BAD_FRAME)를 먼저 보고, 그다음 이름(BAD_NAME), 값(BAD_ARG)을 본다
  switch (type) {
    case C.HELLO:
      if (bytes.length !== 2) return E.BAD_FRAME
      return bytes[1] === VERSION ? { type } : E.BAD_VERSION
    case C.CREATE: {
      const rawRoom = str()
      const maxPlayers = bytes[skip(1)]
      const rawNickname = str()
      if (at !== bytes.length) return E.BAD_FRAME
      const roomName = name(rawRoom, ROOM_NAME_CHARS)
      const nickname = name(rawNickname, NICKNAME_CHARS)
      if (roomName === null || nickname === null) return E.BAD_NAME
      return maxPlayers < 2 || maxPlayers > 8 ? E.BAD_ARG : { type, name: roomName, maxPlayers, nickname }
    }
    case C.JOIN: {
      const id = skip(4)
      const rawNickname = str()
      if (at !== bytes.length) return E.BAD_FRAME
      const nickname = name(rawNickname, NICKNAME_CHARS)
      return nickname === null ? E.BAD_NAME : { type, roomId: view.getUint32(id, true), nickname }
    }
    case C.READY:
      if (bytes.length !== 2) return E.BAD_FRAME
      return bytes[1] > 1 ? E.BAD_ARG : { type, ready: bytes[1] === 1 }
    case C.LEAVE:
    case C.START:
      return bytes.length === 1 ? { type } : E.BAD_FRAME
    default:
      return E.UNKNOWN_TYPE
  }
}

/** 서버 메시지를 프레임(Uint8Array)으로 적는다 */
export function encode(message) {
  const out = [message.type]
  const u32 = (v) => out.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, v >>> 24)
  const str = (text) => {
    const bytes = new TextEncoder().encode(text)
    out.push(bytes.length, ...bytes)
  }
  switch (message.type) {
    case S.WELCOME:
      u32(message.playerId)
      break
    case S.ROOM_LIST:
      out.push(message.rooms.length & 255, message.rooms.length >>> 8)
      for (const room of message.rooms) {
        u32(room.id)
        out.push(room.playing ? 1 : 0, room.players, room.maxPlayers)
        str(room.name)
      }
      break
    case S.ROOM_STATE:
      u32(message.id)
      out.push(message.playing ? 1 : 0, message.maxPlayers)
      u32(message.hostId)
      str(message.name)
      out.push(message.members.length)
      for (const member of message.members) {
        u32(member.id)
        out.push(member.ready ? 1 : 0)
        str(member.nickname)
      }
      break
    case S.ERROR:
      out.push(message.code, message.request)
      break
  }
  return Uint8Array.from(out)
}
