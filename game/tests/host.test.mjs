import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { openAudioOut } from '../host/audio-out.ts'
import { waitForState } from '../tools/perf-events.mjs'

test('소리 출력: 초기화 중 실패하면 이미 연 AudioContext 를 닫고 소리 없이 시작한다', async (t) => {
  const originals = new Map(['AudioContext', 'AudioWorkletNode', 'MessageChannel'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  })
  t.mock.method(console, 'error', () => {})
  for (const stage of ['module', 'node', 'connect', 'closed', 'success']) {
    await t.test(stage, async () => {
      let closed = 0
      const context = {
        audioWorklet: { async addModule() { if (stage === 'module' || stage === 'closed') throw new Error('module failed') } },
        async close() { closed++; if (stage === 'closed') throw new Error('already closed') },
        destination: {},
      }
      const port = {}
      Object.assign(globalThis, {
        AudioContext: class { constructor() { return context } },
        AudioWorkletNode: class {
          constructor() { if (stage === 'node') throw new Error('node failed') }
          connect() { if (stage === 'connect') throw new Error('connect failed') }
          port = { postMessage() {} }
        },
        MessageChannel: class { port1 = {}; port2 = port },
      })
      const result = await openAudioOut()
      if (stage === 'success') {
        assert.equal(result.context, context)
        assert.equal(result.port, port)
        assert.equal(closed, 0, '사용 중인 출력은 열어 둔다')
      } else {
        assert.equal(result, null)
        assert.equal(closed, 1, '실패한 출력은 한 번 닫는다')
      }
    })
  }
})

test('성능 대기: 실제 상태 통지로 완료하고 구독을 해제한다', async () => {
  const events = new EventEmitter()
  let ready = false
  const waiting = waitForState(events, () => ready, 1000, 'ready missing')
  assert.equal(events.listenerCount('change'), 1)
  events.emit('change')
  assert.equal(events.listenerCount('change'), 1, '관계없는 상태 통지는 완료시키지 않는다')
  ready = true
  events.emit('change')
  await waiting
  assert.equal(events.listenerCount('change'), 0)
  await waitForState(events, () => ready, 1000, 'ready missing')
  assert.equal(events.listenerCount('change'), 0, '이미 발행된 상태에는 구독을 만들지 않는다')
})

test('성능 대기: 무신호 timeout 과 실제 오류에도 구독을 해제한다', async () => {
  const events = new EventEmitter()
  await assert.rejects(waitForState(events, () => false, 1, 'ready missing'), /ready missing/)
  assert.equal(events.listenerCount('change'), 0)
  const waiting = waitForState(events, () => false, 1000, 'ready missing')
  events.emit('error', new Error('CDP disconnected'))
  await assert.rejects(waiting, /CDP disconnected/)
  assert.equal(events.listenerCount('change'), 0)
})
