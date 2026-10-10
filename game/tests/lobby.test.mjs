// 로비 서버 검증 — `pnpm game:test` (빌드 없이 돈다)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Lobby } from '../server/lobby.mjs'
import { decode, encode } from '../server/protocol.mjs'
import { startServer } from '../server/server.mjs'

// 프로토콜 문서(protocol.mjs 머리말)대로 손으로 적는 프레임 조각
const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, v >>> 24]
const str = (text) => {
  const bytes = [...new TextEncoder().encode(text)]
  return [bytes.length, ...bytes]
}
const frame = (...parts) => Uint8Array.from(parts.flat())

test('로비 프로토콜: 클라이언트 프레임을 풀고 잘못된 것은 오류 코드로 거절한다', () => {
  // 리터럴 바이트 — 클라이언트(C++)의 인코더가 내는 것과 같다 (tests/net_probe.cpp). '가' = EA B0 80
  assert.deepEqual(decode(frame(0x01, 2)), { type: 1 })
  assert.deepEqual(decode(frame(0x02, 2, 0x61, 0x62, 4, 3, 0xea, 0xb0, 0x80)), { type: 2, name: 'ab', maxPlayers: 4, nickname: '가' })
  assert.deepEqual(decode(frame(0x03, 0x78, 0x56, 0x34, 0x12, 1, 0x78)), { type: 3, roomId: 0x12345678, nickname: 'x' })
  assert.deepEqual(decode(frame(0x04)), { type: 4 })
  assert.deepEqual(decode(frame(0x05, 1)), { type: 5, ready: true })
  assert.deepEqual(decode(frame(0x05, 0)), { type: 5, ready: false })
  assert.deepEqual(decode(frame(0x06)), { type: 6 })
  assert.deepEqual(decode(frame(0x02, str('연습 방'), 4, str('가람'))), { type: 2, name: '연습 방', maxPlayers: 4, nickname: '가람' })
  // 글자 수로 센다 — 한글 12 자(36 바이트)는 되고 13 자는 안 된다. 방 이름은 20 자까지
  assert.equal(decode(frame(0x03, u32(1), str('가나다라마바사아자차카타'))).nickname, '가나다라마바사아자차카타')
  assert.equal(decode(frame(0x03, u32(1), str('가나다라마바사아자차카타파'))), 6)
  assert.equal(decode(frame(0x02, str('가'.repeat(20)), 2, str('가'))).name, '가'.repeat(20))
  assert.equal(decode(frame(0x02, str('가'.repeat(21)), 2, str('가'))), 6)
  // 보충 평면 글자(4 바이트)도 한 글자다 — 가장 긴 요청(132 바이트)이 프레임 상한 안에 든다
  assert.equal(decode(frame(0x03, u32(1), str('\u{20000}'.repeat(12)))).nickname, '\u{20000}'.repeat(12))
  const longest = frame(0x02, str('\u{20000}'.repeat(20)), 8, str('\u{20000}'.repeat(12)))
  assert.equal(longest.length, 132)
  assert.equal(decode(longest).maxPlayers, 8)

  // 1 BAD_FRAME — 빈 프레임, 모자람, 남음, 적힌 길이와 다름 (str 이 프레임을 넘는다)
  assert.equal(decode(frame()), 1)
  assert.equal(decode(frame(0x01)), 1)
  assert.equal(decode(frame(0x01, 2, 0)), 1)
  assert.equal(decode(frame(0x02)), 1)
  assert.equal(decode(frame(0x02, 1, 0x41)), 1)
  assert.equal(decode(frame(0x02, 1, 0x41, 4)), 1)
  assert.equal(decode(frame(0x02, 3, 0x41, 4, 1, 0x42)), 1)
  assert.equal(decode(frame(0x02, 1, 0x41, 4, 2, 0x42)), 1)
  assert.equal(decode(frame(0x02, 1, 0x41, 4, 1, 0x42, 0x43)), 1)
  assert.equal(decode(frame(0x03, 1, 0, 0)), 1)
  assert.equal(decode(frame(0x03, u32(1))), 1)
  assert.equal(decode(frame(0x03, u32(1), 3, 0xea, 0xb0)), 1)
  assert.equal(decode(frame(0x03, u32(1), 1, 0x41, 0x42)), 1)
  assert.equal(decode(frame(0x04, 0)), 1)
  assert.equal(decode(frame(0x05)), 1)
  assert.equal(decode(frame(0x06, 1)), 1)
  // 2 UNKNOWN_TYPE — 서버 → 클라이언트 종류도 모르는 것이다
  assert.equal(decode(frame(0x00)), 2)
  assert.equal(decode(frame(0x07)), 2)
  assert.equal(decode(frame(0x81, 1, 0, 0, 0)), 2)
  // 3 BAD_VERSION — 닉네임을 HELLO 에 싣던 version 1 의 프레임은 길이부터 어긋난다
  assert.equal(decode(frame(0x01, 1)), 3)
  assert.equal(decode(frame(0x01, 3)), 3)
  assert.equal(decode(frame(0x01, 1, str('가'))), 1)
  // 6 BAD_NAME — 빈 이름, 잘린 UTF-8, 긴 인코딩(overlong), 대리 코드, 제어 문자, 폭 없는 문자, BOM, 줄 구분자, 앞뒤 공백
  assert.equal(decode(frame(0x03, u32(1), 0)), 6)
  assert.equal(decode(frame(0x03, u32(1), 2, 0xea, 0xb0)), 6)
  assert.equal(decode(frame(0x03, u32(1), 2, 0xc0, 0xaf)), 6)
  assert.equal(decode(frame(0x03, u32(1), 3, 0xed, 0xa0, 0x80)), 6)
  assert.equal(decode(frame(0x03, u32(1), 1, 0xff)), 6)
  assert.equal(decode(frame(0x03, u32(1), 2, 0x41, 0x00)), 6)
  assert.equal(decode(frame(0x03, u32(1), 3, 0x41, 0x0a, 0x42)), 6)
  assert.equal(decode(frame(0x03, u32(1), 2, 0x41, 0x7f)), 6)
  assert.equal(decode(frame(0x03, u32(1), str('a​b'))), 6)
  assert.equal(decode(frame(0x03, u32(1), str('﻿ab'))), 6)
  assert.equal(decode(frame(0x03, u32(1), str('a b'))), 6)
  assert.equal(decode(frame(0x03, u32(1), str('a‮b'))), 6)
  assert.equal(decode(frame(0x03, u32(1), str(' 가'))), 6)
  assert.equal(decode(frame(0x03, u32(1), str('가　'))), 6)
  assert.equal(decode(frame(0x02, str(' '), 4, str('가'))), 6)
  assert.equal(decode(frame(0x02, str('방'), 4, str(''))), 6)
  assert.equal(decode(frame(0x02, str('방'), 4, str('가 '))), 6)
  // 7 BAD_ARG — 인원 2…8, 준비 0·1
  assert.equal(decode(frame(0x02, str('방'), 1, str('가'))), 7)
  assert.equal(decode(frame(0x02, str('방'), 9, str('가'))), 7)
  assert.equal(decode(frame(0x02, str('방'), 8, str('가'))).maxPlayers, 8)
  assert.equal(decode(frame(0x05, 2)), 7)
})

test('로비 프로토콜: 서버 메시지를 문서의 바이트로 적는다', () => {
  assert.deepEqual([...encode({ type: 0x81, playerId: 0x01020304 })], [0x81, 4, 3, 2, 1])
  assert.deepEqual([...encode({ type: 0x82, rooms: [] })], [0x82, 0, 0])
  assert.deepEqual(
    [...encode({ type: 0x82, rooms: [{ id: 7, playing: false, players: 1, maxPlayers: 4, name: '가' }, { id: 258, playing: true, players: 2, maxPlayers: 2, name: 'ab' }] })],
    [0x82, 2, 0, 7, 0, 0, 0, 0, 1, 4, 3, 0xea, 0xb0, 0x80, 2, 1, 0, 0, 1, 2, 2, 2, 0x61, 0x62],
  )
  assert.deepEqual(
    [...encode({ type: 0x83, id: 7, playing: true, maxPlayers: 4, hostId: 2, name: 'ab', members: [{ id: 2, ready: false, nickname: 'x' }, { id: 5, ready: true, nickname: '가' }] })],
    [0x83, 7, 0, 0, 0, 1, 4, 2, 0, 0, 0, 2, 0x61, 0x62, 2, 2, 0, 0, 0, 0, 1, 0x78, 5, 0, 0, 0, 1, 3, 0xea, 0xb0, 0x80],
  )
  assert.deepEqual([...encode({ type: 0x84 })], [0x84])
  assert.deepEqual([...encode({ type: 0x8f, code: 13, request: 6 })], [0x8f, 13, 6])
})

test('로비: 방 만들기·참가·준비·시작·나가기와 방장 넘기기, 상태에 맞지 않는 요청 거절', () => {
  const sent = []
  const lobby = new Lobby((ids, message) => sent.push([ids, message]))
  /** 그 사이에 밀려 나온 것을 꺼낸다 */
  const take = () => sent.splice(0)
  const list = (...rooms) => ({ type: 0x82, rooms })

  lobby.enter(1)
  assert.deepEqual(take(), [[[1], { type: 0x81, playerId: 1 }], [[1], list()]])
  lobby.enter(2)
  lobby.enter(3)
  take()

  // 방에 없는데 나가기·준비·시작 → 9, 없는 방 → 10. 거절한 요청은 아무것도 밀지 않는다
  assert.equal(lobby.leave(1), 9)
  assert.equal(lobby.ready(1, true), 9)
  assert.equal(lobby.start(1), 9)
  assert.equal(lobby.join(1, 1, '가람'), 10)
  assert.deepEqual(take(), [])

  // 만들면 만든 사람이 방장으로 들어가고, 방 밖의 사람들에게 목록이 간다
  assert.equal(lobby.create(1, '연습방', 2, '가람'), 0)
  const room = (over) => ({ type: 0x83, id: 1, playing: false, maxPlayers: 2, hostId: 1, name: '연습방', members: [], ...over })
  const row = (over) => ({ id: 1, playing: false, players: 1, maxPlayers: 2, name: '연습방', ...over })
  assert.deepEqual(take(), [
    [[1], room({ members: [{ id: 1, ready: false, nickname: '가람' }] })],
    [[2, 3], list(row())],
  ])
  // 이미 방에 있으면 만들기·참가 → 8
  assert.equal(lobby.create(1, '또', 2, '바뀜'), 8)
  assert.equal(lobby.join(1, 1, '바뀜'), 8)

  assert.equal(lobby.join(2, 1, '나래'), 0)
  const both = (ready) => [{ id: 1, ready: false, nickname: '가람' }, { id: 2, ready, nickname: '나래' }]
  assert.deepEqual(take(), [
    [[1, 2], room({ members: both(false) })],
    [[3], list(row({ players: 2 }))],
  ])
  // 찬 방 → 11
  assert.equal(lobby.join(3, 1, '다솜'), 11)

  // 방장이 아니면 시작 → 13, 준비 안 한 사람이 있으면 → 14
  assert.equal(lobby.start(2), 13)
  assert.equal(lobby.start(1), 14)
  assert.deepEqual(take(), [])
  // 준비는 대기실에만 간다 (목록은 그대로)
  assert.equal(lobby.ready(2, true), 0)
  assert.deepEqual(take(), [[[1, 2], room({ members: both(true) })]])
  assert.equal(lobby.ready(2, false), 0)
  assert.equal(lobby.start(1), 14)
  assert.equal(lobby.ready(2, true), 0)
  take()

  assert.equal(lobby.start(1), 0)
  assert.deepEqual(take(), [
    [[1, 2], room({ playing: true, members: both(true) })],
    [[3], list(row({ playing: true, players: 2 }))],
  ])
  // 진행 중인 방 — 참가·준비·시작 → 12
  assert.equal(lobby.join(3, 1, '다솜'), 12)
  assert.equal(lobby.ready(2, false), 12)
  assert.equal(lobby.start(1), 12)
  assert.deepEqual(take(), [])

  // 방장이 나가면 남은 사람이 방장이 되고, 나간 사람은 다시 목록을 받는다
  assert.equal(lobby.leave(1), 0)
  assert.deepEqual(take(), [
    [[1], { type: 0x84 }],
    [[2], room({ playing: true, hostId: 2, members: [{ id: 2, ready: true, nickname: '나래' }] })],
    [[1, 3], list(row({ playing: true }))],
  ])
  // 마지막 사람이 끊기면 방이 없어진다
  lobby.exit(2)
  assert.deepEqual(take(), [[[1, 3], list()]])
  assert.equal(lobby.join(3, 1, '다솜'), 10)

  // 방장 넘기기는 들어온 차례 — 방장(1)이 끊기면 먼저 들어온 3 이 방장, 준비 상태는 그대로
  // 이름은 들어갈 때마다 정한다 — 1 은 새 이름으로 방을 만든다
  assert.equal(lobby.create(1, '둘째', 8, '가온'), 0)
  assert.deepEqual(take()[0], [[1], { type: 0x83, id: 2, playing: false, maxPlayers: 8, hostId: 1, name: '둘째', members: [{ id: 1, ready: false, nickname: '가온' }] }])
  assert.equal(lobby.join(3, 2, '다솜'), 0)
  lobby.enter(4)
  assert.equal(lobby.join(4, 2, '라온'), 0)
  assert.equal(lobby.ready(4, true), 0)
  take()
  lobby.exit(1)
  assert.deepEqual(take(), [
    [[3, 4], { type: 0x83, id: 2, playing: false, maxPlayers: 8, hostId: 3, name: '둘째', members: [{ id: 3, ready: false, nickname: '다솜' }, { id: 4, ready: true, nickname: '라온' }] }],
  ])
  // 방장의 준비는 시작 조건이 아니다
  assert.equal(lobby.start(3), 0)
  // 방 밖에 아무도 없으면 목록은 보내지 않는다
  assert.deepEqual(take().map(([ids]) => ids), [[3, 4]])
})

test('로비: 방은 64 개까지', () => {
  const lobby = new Lobby(() => {})
  for (let id = 1; id <= 65; id++) lobby.enter(id)
  for (let id = 1; id <= 64; id++) assert.equal(lobby.create(id, `r${id}`, 2, `p${id}`), 0)
  assert.equal(lobby.create(65, 'r65', 2, 'p65'), 15)
  // 하나가 비면 다시 만들 수 있다
  assert.equal(lobby.leave(1), 0)
  assert.equal(lobby.create(65, 'r65', 2, 'p65'), 0)
})

/** 서버에 붙은 클라이언트 — 받은 프레임을 차례로 꺼낸다 (올 때까지 기다린다) */
async function connect(port) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`)
  socket.binaryType = 'arraybuffer'
  const inbox = []
  let waiting = null
  const deliver = (item) => {
    if (waiting) waiting(item)
    else inbox.push(item)
    waiting = null
  }
  socket.addEventListener('message', (event) => deliver([...new Uint8Array(event.data)]))
  const closed = new Promise((done) => socket.addEventListener('close', (event) => (deliver({ closed: event.code }), done(event.code))))
  await new Promise((done, fail) => {
    socket.addEventListener('open', done)
    socket.addEventListener('error', fail)
  })
  return {
    send: (...parts) => socket.send(typeof parts[0] === 'string' ? parts[0] : frame(...parts)),
    next: () => (inbox.length > 0 ? Promise.resolve(inbox.shift()) : new Promise((done) => (waiting = done))),
    close: () => (socket.close(), closed),
    closed,
  }
}

test('로비 서버: 두 클라이언트가 만들고, 목록을 받고, 들어가 준비하고, 시작하고, 나가고, 끊긴다', async () => {
  const server = await startServer({ port: 0 })
  const clients = []
  const open = async () => clients[clients.push(await connect(server.port)) - 1]
  try {
    const a = await open()
    const b = await open()
    const c = await open()

    // HELLO 전에는 다른 요청을 받지 않는다 → 4
    a.send(0x02, str('방'), 4, str('가람'))
    assert.deepEqual(await a.next(), [0x8f, 4, 0x02])
    // 예전 version → 3 (연결은 그대로). HELLO 는 닉네임 없이 목록을 받는다
    a.send(0x01, 1)
    assert.deepEqual(await a.next(), [0x8f, 3, 0x01])
    a.send(0x01, 2)
    assert.deepEqual(await a.next(), [0x81, u32(1)].flat())
    assert.deepEqual(await a.next(), [0x82, 0, 0])
    b.send(0x01, 2)
    assert.deepEqual(await b.next(), [0x81, u32(2)].flat())
    assert.deepEqual(await b.next(), [0x82, 0, 0])
    // HELLO 두 번 → 5
    a.send(0x01, 2)
    assert.deepEqual(await a.next(), [0x8f, 5, 0x01])

    // a 가 방을 만든다 — a 는 대기실을, 방 밖의 b 는 목록을 받는다 (HELLO 를 안 한 c 는 아무것도 받지 않는다)
    const members = (...rows) => [rows.length, ...rows.flatMap(([id, ready, nickname]) => [u32(id), ready, str(nickname)].flat())]
    const state = (playing, hostId, ...rows) => [0x83, u32(1), playing, 4, u32(hostId), str('연습방'), members(...rows)].flat()
    const listed = (playing, players) => [0x82, 1, 0, u32(1), playing, players, 4, str('연습방')].flat()
    a.send(0x02, str('연습방'), 4, str('가람'))
    assert.deepEqual(await a.next(), state(0, 1, [1, 0, '가람']))
    assert.deepEqual(await b.next(), listed(0, 1))

    // 늦게 들어온 c 는 지금 목록을 받는다
    c.send(0x01, 2)
    assert.deepEqual(await c.next(), [0x81, u32(3)].flat())
    assert.deepEqual(await c.next(), listed(0, 1))

    // 없는 방 → 10. b 가 들어간다 — 둘 다 대기실을, c 는 목록(2 명)을 받는다
    b.send(0x03, u32(9), str('나래'))
    assert.deepEqual(await b.next(), [0x8f, 10, 0x03])
    b.send(0x03, u32(1), str('나래'))
    assert.deepEqual(await b.next(), state(0, 1, [1, 0, '가람'], [2, 0, '나래']))
    assert.deepEqual(await a.next(), state(0, 1, [1, 0, '가람'], [2, 0, '나래']))
    assert.deepEqual(await c.next(), listed(0, 2))

    // 방장이 아닌데 시작 → 13, 준비 전 시작 → 14, 방에 없는데 준비 → 9
    b.send(0x06)
    assert.deepEqual(await b.next(), [0x8f, 13, 0x06])
    a.send(0x06)
    assert.deepEqual(await a.next(), [0x8f, 14, 0x06])
    c.send(0x05, 1)
    assert.deepEqual(await c.next(), [0x8f, 9, 0x05])

    b.send(0x05, 1)
    assert.deepEqual(await a.next(), state(0, 1, [1, 0, '가람'], [2, 1, '나래']))
    assert.deepEqual(await b.next(), state(0, 1, [1, 0, '가람'], [2, 1, '나래']))
    a.send(0x06)
    assert.deepEqual(await a.next(), state(1, 1, [1, 0, '가람'], [2, 1, '나래']))
    assert.deepEqual(await b.next(), state(1, 1, [1, 0, '가람'], [2, 1, '나래']))
    assert.deepEqual(await c.next(), listed(1, 2))
    // 진행 중인 방에는 못 들어간다 → 12
    c.send(0x03, u32(1), str('다솜'))
    assert.deepEqual(await c.next(), [0x8f, 12, 0x03])

    // 방장 a 가 나간다 — a 는 LEFT 와 목록, b 는 방장이 된 대기실, c 는 목록(1 명)
    a.send(0x04)
    assert.deepEqual(await a.next(), [0x84])
    assert.deepEqual(await a.next(), listed(1, 1))
    assert.deepEqual(await b.next(), state(1, 2, [2, 1, '나래']))
    assert.deepEqual(await c.next(), listed(1, 1))

    // b 가 끊기면 방이 없어진다 — 방 밖의 둘이 빈 목록을 받는다
    await b.close()
    assert.deepEqual(await a.next(), [0x82, 0, 0])
    assert.deepEqual(await c.next(), [0x82, 0, 0])

    // 잘못된 프레임 — 텍스트 → 1(request 0), 모르는 종류 → 2, 깨진 UTF-8 → 6. 연결은 살아 있다
    a.send('{"type":"create"}')
    assert.deepEqual(await a.next(), [0x8f, 1, 0])
    a.send(0x7f, 1, 2)
    assert.deepEqual(await a.next(), [0x8f, 2, 0x7f])
    a.send(0x02, 2, 0xea, 0xb0, 4, str('가람'))
    assert.deepEqual(await a.next(), [0x8f, 6, 0x02])
    // 방을 다시 만들 때 적은 닉네임이 그 방에서의 이름이다
    a.send(0x02, str('새 방'), 2, str('가온'))
    assert.deepEqual(await a.next(), [0x83, u32(2), 0, 2, u32(1), str('새 방'), members([1, 0, '가온'])].flat())
    assert.deepEqual(await c.next(), [0x82, 1, 0, u32(2), 0, 1, 2, str('새 방')].flat())

    // 160 바이트를 넘는 프레임은 연결을 끊는다 (1009) — 그 사람이 있던 방도 정리된다
    a.send(new Array(161).fill(0x01))
    assert.deepEqual(await a.next(), { closed: 1009 })
    assert.deepEqual(await c.next(), [0x82, 0, 0])
  } finally {
    await Promise.all(clients.map((client) => client.close()))
    await server.close()
  }
})
