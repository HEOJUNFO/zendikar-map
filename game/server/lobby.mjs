// 로비 — 방과 참가자의 상태 전이. 소켓을 모른다: 바뀐 것은 `send(받는 참가자 번호들, 메시지)` 로 밀어 준다.
// 요청 함수는 0(됨) 또는 오류 코드를 돌려주고, 거절한 요청은 아무것도 바꾸지 않는다.
// 필드 모양(이름 규칙, 인원 범위)은 protocol.mjs 의 decode 가 이미 걸렀다고 본다.
import { E, S } from './protocol.mjs'

export const MAX_ROOMS = 64

export class Lobby {
  #send
  #players = new Map()
  #rooms = new Map()
  #nextRoom = 1

  constructor(send) {
    this.#send = send
  }

  /** 새 참가자 — `id` 는 부르는 쪽이 연결마다 새로 준다. 이름은 방에 들어갈 때 정한다 */
  enter(id) {
    this.#players.set(id, { id, nickname: '', room: null })
    this.#send([id], { type: S.WELCOME, playerId: id })
    this.#send([id], this.#list())
  }

  create(id, name, maxPlayers, nickname) {
    const player = this.#players.get(id)
    if (player.room) return E.IN_ROOM
    if (this.#rooms.size >= MAX_ROOMS) return E.LOBBY_FULL
    player.nickname = nickname
    const room = { id: this.#nextRoom++, name, maxPlayers, playing: false, host: player, members: [player], ready: new Set() }
    this.#rooms.set(room.id, room)
    player.room = room
    this.#roomChanged(room)
    this.#listChanged()
    return 0
  }

  join(id, roomId, nickname) {
    const player = this.#players.get(id)
    if (player.room) return E.IN_ROOM
    const room = this.#rooms.get(roomId)
    if (!room) return E.NO_ROOM
    if (room.playing) return E.PLAYING
    if (room.members.length >= room.maxPlayers) return E.ROOM_FULL
    room.members.push(player)
    player.nickname = nickname
    player.room = room
    this.#roomChanged(room)
    this.#listChanged()
    return 0
  }

  leave(id) {
    const player = this.#players.get(id)
    if (!player.room) return E.NOT_IN_ROOM
    const room = this.#detach(player)
    this.#send([id], { type: S.LEFT })
    this.#roomChanged(room)
    this.#listChanged()
    return 0
  }

  ready(id, ready) {
    const player = this.#players.get(id)
    const room = player.room
    if (!room) return E.NOT_IN_ROOM
    if (room.playing) return E.PLAYING
    if (ready) room.ready.add(player)
    else room.ready.delete(player)
    this.#roomChanged(room)
    return 0
  }

  start(id) {
    const player = this.#players.get(id)
    const room = player.room
    if (!room) return E.NOT_IN_ROOM
    if (room.host !== player) return E.NOT_HOST
    if (room.playing) return E.PLAYING
    if (room.members.some((member) => member !== player && !room.ready.has(member))) return E.NOT_READY
    room.playing = true
    this.#roomChanged(room)
    this.#listChanged()
    return 0
  }

  /** 연결이 끊긴 참가자를 지운다 */
  exit(id) {
    const player = this.#players.get(id)
    this.#players.delete(id)
    if (!player.room) return
    const room = this.#detach(player)
    this.#roomChanged(room)
    this.#listChanged()
  }

  /** 방에서 빼고, 방장이었으면 넘기고, 빈 방이면 없앤다 */
  #detach(player) {
    const room = player.room
    player.room = null
    room.members.splice(room.members.indexOf(player), 1)
    room.ready.delete(player)
    if (room.members.length === 0) this.#rooms.delete(room.id)
    else if (room.host === player) room.host = room.members[0]
    return room
  }

  #roomChanged(room) {
    if (room.members.length === 0) return
    this.#send(
      room.members.map((member) => member.id),
      {
        type: S.ROOM_STATE,
        id: room.id,
        playing: room.playing,
        maxPlayers: room.maxPlayers,
        hostId: room.host.id,
        name: room.name,
        members: room.members.map((member) => ({ id: member.id, ready: room.ready.has(member), nickname: member.nickname })),
      },
    )
  }

  // ceiling: 목록이 바뀔 때마다 전체를 방 밖의 모두에게 다시 보낸다 (방 64 개 × 최대 88 바이트 = 5.6KB 까지).
  // 방 수 상한을 수백으로 올리거나 목록 갱신이 눈에 띄는 트래픽이 되면 방 하나의 추가·변경·삭제 메시지로 바꾼다.
  #listChanged() {
    const outside = [...this.#players.values()].filter((player) => !player.room).map((player) => player.id)
    if (outside.length > 0) this.#send(outside, this.#list())
  }

  #list() {
    return {
      type: S.ROOM_LIST,
      rooms: [...this.#rooms.values()].map((room) => ({
        id: room.id,
        playing: room.playing,
        players: room.members.length,
        maxPlayers: room.maxPlayers,
        name: room.name,
      })),
    }
  }
}
