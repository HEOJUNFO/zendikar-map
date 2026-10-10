// 오디오 스레드에서 도는 출력 끝 — 브라우저가 소리를 여기서만 내보내게 해 두어 있는 최소한이다.
// 게임(Worker 안의 C++, engine/audio/port)이 섞어 보낸 표본을 그대로 내보내고, 어디까지 가져갔는지를 알릴 뿐이다.
// 섞기도 음량도 박자도 모른다 — 무엇을 언제 낼지는 모두 C++ 가 정한다.
//   받는 것 (주 스레드가 node.port 로 한 번): Worker 와 이어진 MessagePort
//   받는 것 (그 포트로): { start, samples } — 줄기의 표본 start 부터 놓일 스테레오 인터리브 Float32Array
//   보내는 것 (그 포트로, 384 표본쯤마다): { consumed, underrun } — 가져간 표본의 절대 번호와, 써 넣은 것이 모자라 조용히 지나간 표본의 누적 수

/** 미리 받아 둘 수 있는 길이 (표본) — 48 kHz 로 1.3 초 */
const RING = 1 << 16
/** 통지 사이의 표본 수 — 렌더 퀀텀(128) 셋 */
const REPORT = 384

class PcmOut extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ring = new Float32Array(RING * 2)
    // 다음에 내보낼 표본의 번호 — 써 넣은 것이 없어도 시간과 함께 나아간다 (번호가 곧 장치의 시계다)
    this.read = 0
    // 써 넣은 것의 끝
    this.end = 0
    this.underrun = 0
    this.unreported = 0
    this.link = null
    this.port.onmessage = (event) => {
      if (!(event.data instanceof MessagePort)) return
      this.link = event.data
      this.link.onmessage = (message) => this.write(message.data)
    }
  }

  write(data) {
    const { start, samples } = data ?? {}
    if (!Number.isSafeInteger(start) || start < 0 || !(samples instanceof Float32Array)) return
    const frames = samples.length >> 1
    // 이미 지나간 자리와 고리보다 먼 자리는 버린다
    const from = Math.max(start, this.read)
    const to = Math.min(start + frames, this.read + RING)
    for (let at = from; at < to; at++) {
      const slot = (at % RING) * 2
      const source = (at - start) * 2
      this.ring[slot] = samples[source]
      this.ring[slot + 1] = samples[source + 1]
    }
    if (to > this.end) this.end = to
  }

  process(_inputs, outputs) {
    const left = outputs[0][0]
    const right = outputs[0][1] ?? left
    for (let i = 0; i < left.length; i++) {
      const at = this.read + i
      if (at >= this.end) {
        // 써 넣은 것이 모자란다 (한 번도 받지 않았으면 세지 않는다) — 출력은 0 인 채로 나간다
        if (this.end) this.underrun++
        continue
      }
      const slot = (at % RING) * 2
      left[i] = this.ring[slot]
      right[i] = this.ring[slot + 1]
      // 한 바퀴 뒤에 다시 나오지 않게 비운다
      this.ring[slot] = 0
      this.ring[slot + 1] = 0
    }
    this.read += left.length
    this.unreported += left.length
    if (this.link && this.unreported >= REPORT) {
      this.unreported = 0
      this.link.postMessage({ consumed: this.read, underrun: this.underrun })
    }
    return true
  }
}

registerProcessor('zk-pcm-out', PcmOut)
