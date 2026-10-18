// 로비 서버 — WebSocket 연결을 로비(lobby.mjs)에 잇는다. 프레임 형식은 protocol.mjs 머리말.
// 실행: `pnpm game:server` (PORT 기본 7777, HOST 기본 127.0.0.1). 개발용이다 — 인증·Origin 검사가 없다.
import { WebSocketServer } from 'ws'
import { Lobby } from './lobby.mjs'
import { C, E, MAX_FRAME, S, decode, encode } from './protocol.mjs'

const MAX_CONNECTIONS = 256
// 읽지 않는 연결에 쌓아 둘 수 있는 바이트 — 넘으면 끊는다
const MAX_BUFFERED = 1 << 20

/** 서버를 띄운다 (port 0 이면 빈 포트). 듣기 시작하면 `{ port, close }` 를 준다 */
export function startServer({ port = 7777, host = '127.0.0.1' } = {}) {
  const sockets = new Map()
  let nextId = 1
  const push = (socket, bytes) => {
    if (socket.bufferedAmount > MAX_BUFFERED) socket.terminate()
    else socket.send(bytes)
  }
  const lobby = new Lobby((ids, message) => {
    const bytes = encode(message)
    for (const id of ids) push(sockets.get(id), bytes)
  })

  const request = (id, message) => {
    switch (message.type) {
      case C.HELLO:
        return E.ALREADY_HELLO
      case C.CREATE:
        return lobby.create(id, message.name, message.maxPlayers, message.nickname)
      case C.JOIN:
        return lobby.join(id, message.roomId, message.nickname)
      case C.LEAVE:
        return lobby.leave(id)
      case C.READY:
        return lobby.ready(id, message.ready)
      case C.START:
        return lobby.start(id)
    }
  }

  const wss = new WebSocketServer({ port, host, maxPayload: MAX_FRAME })
  wss.on('connection', (socket) => {
    // 프레임이 너무 크거나 깨졌으면 ws 가 오류를 내고 스스로 끊는다 — 정리는 close 에서 한다
    socket.on('error', () => {})
    if (wss.clients.size > MAX_CONNECTIONS) return socket.close(1013)
    let id = 0
    socket.on('message', (data, isBinary) => {
      const message = isBinary ? decode(data) : E.BAD_FRAME
      let code = 0
      if (typeof message === 'number') code = message
      else if (id) code = request(id, message)
      else if (message.type !== C.HELLO) code = E.NEED_HELLO
      else {
        id = nextId++
        sockets.set(id, socket)
        lobby.enter(id)
      }
      if (code) push(socket, encode({ type: S.ERROR, code, request: isBinary && data.length > 0 ? data[0] : 0 }))
    })
    socket.on('close', () => {
      if (!id) return
      sockets.delete(id)
      lobby.exit(id)
    })
  })

  return new Promise((resolve, reject) => {
    wss.once('error', reject)
    wss.once('listening', () =>
      resolve({
        port: wss.address().port,
        close: () =>
          new Promise((done) => {
            for (const socket of wss.clients) socket.terminate()
            wss.close(done)
          }),
      }),
    )
  })
}

if (import.meta.main) {
  const host = process.env.HOST || '127.0.0.1'
  const server = await startServer({ port: Number(process.env.PORT) || 7777, host })
  console.log(`[lobby] ws://${host}:${server.port}`)
}
