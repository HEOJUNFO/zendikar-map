// 소리 출력의 배선 — 브라우저의 출력(AudioContext)을 열고, 거기 이어진 핸들을 내준다. 그 핸들은 캔버스처럼 Worker 로 넘어가고,
// 게임(C++)이 섞은 소리를 거기에 직접 쓴다 (game/engine/audio/port). 여기서는 소리를 섞지도, 고르지도, 크기를 바꾸지도 않는다.

export interface AudioOut {
  /** 출력 — 사용자가 무언가 누르기 전에는 멈춰 있다 (suspended). 게임이 켜 달라고 하면 resume 한다 (main.ts) */
  readonly context: AudioContext
  /** 오디오 스레드의 출력 끝(pcm-worklet.js)과 이어진 핸들 — Worker 로 넘긴다 */
  readonly port: MessagePort
}

/** 소리 출력을 연다. 열지 못하면(브라우저가 막았거나 장치가 없다) null — 게임은 소리 없이 뜬다 */
export async function openAudioOut(): Promise<AudioOut | null> {
  let context: AudioContext | undefined
  try {
    context = new AudioContext({ latencyHint: 'interactive' })
    await context.audioWorklet.addModule(new URL('./pcm-worklet.js', import.meta.url))
    const node = new AudioWorkletNode(context, 'zk-pcm-out', { numberOfInputs: 0, outputChannelCount: [2] })
    node.connect(context.destination)
    const channel = new MessageChannel()
    node.port.postMessage(channel.port1, [channel.port1])
    return { context, port: channel.port2 }
  } catch (error) {
    await context?.close().catch(() => {})
    console.error('소리 출력을 열지 못했다 — 소리 없이 간다', error)
    return null
  }
}
