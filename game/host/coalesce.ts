// 밀림 방지 — 게임(Worker)이 앞서 보낸 것을 아직 처리하는 동안 생긴 원시 입력은 줄 세우지 않는다.
// 하나로 합쳐 두었다가(최신 값이 앞의 값을 대신하거나, 움직인 양처럼 더하거나 — merge 가 정한다) 앞의 것이 끝나면 한 번에 보낸다.
// 그래서 Worker 가 늦어도 기다리는 호출은 하나를 넘지 않고, 늦게 처리된 것이 뒤의 것을 밀지 않는다.
// 무엇을 뜻하는 입력인지는 모른다 — 전달 방식일 뿐이다 (뜻은 game/ 의 C++ 가 정한다).

export interface Latest<T> {
  /** 보낸다 — 앞서 보낸 것이 아직 끝나지 않았으면 기다리는 것과 합쳐 둔다 */
  push(value: T): void
  /** 기다리는 것이 있으면 앞의 것이 끝나기를 기다리지 않고 지금 보낸다 — 차례가 뜻을 갖는 다른 호출(버튼)의 바로 앞에 부른다 */
  flush(): void
}

/**
 * send 로 보내는 흐름 하나. merge(기다리던 것, 새 것)는 둘을 하나로 합친 값을 돌려준다.
 * send 가 실패해도 흐름은 멈추지 않는다 (실패는 failed 로 알린다)
 */
export function latest<T>(send: (value: T) => Promise<unknown>, merge: (waiting: T, next: T) => T, failed: (error: unknown) => void = () => {}): Latest<T> {
  let busy = false
  let waiting: { value: T } | null = null
  const start = () => {
    if (!waiting) return
    const { value } = waiting
    waiting = null
    busy = true
    const done = () => {
      busy = false
      start()
    }
    send(value).then(done, (error: unknown) => {
      failed(error)
      done()
    })
  }
  return {
    push(value) {
      waiting = { value: waiting ? merge(waiting.value, value) : value }
      if (!busy) start()
    },
    flush() {
      if (!waiting) return
      const { value } = waiting
      waiting = null
      send(value).catch(failed)
    },
  }
}

/** 포인터 이동 — 자리는 최신 것이, 움직인 양은 합이 남는다 */
export interface PointerMove {
  x: number
  y: number
  deltaX: number
  deltaY: number
}
export const mergeMove = (waiting: PointerMove, next: PointerMove): PointerMove => ({
  x: next.x,
  y: next.y,
  deltaX: waiting.deltaX + next.deltaX,
  deltaY: waiting.deltaY + next.deltaY,
})

/** 최신 값이 앞의 값을 대신하는 흐름 (화면 크기, 소리 출력의 상태) */
export const replace = <T>(_waiting: T, next: T): T => next
