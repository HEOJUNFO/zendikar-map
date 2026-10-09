// 샘플 뱅크 빌드 — 손질해 둔 WAV 들을 엔진이 읽는 뱅크 한 파일(.samplebank)로 옮긴다. 엔진은 WAV 를 읽지 않는다 (engine/audio/bank).
// 소리는 QOA(qoaformat.org — 표본 하나에 3.2 비트)로 눌러 담는다. samples.txt 에 pcm 을 붙인 샘플은 누르지 않고 16 비트 표본 그대로 담는다 —
// QOA 는 날카로운 충격음(총소리의 첫 몇 ms)과 밝고 큰 잡음(슬라이드)을 뭉갠다 (잰 값은 content/audio/CREDITS.md).
//
// 사용: node samplec.mjs <소리 폴더> <out.samplebank>
//   <소리 폴더>/samples.txt — 한 줄에 샘플 하나: `이름 파일 [gain=dB] [group=묶음] [root=음이름] [tune=센트] [pcm]` (줄 머리나 빈칸 뒤의 # 부터는 주석 — f#1 같은 음이름의 # 은 아니다)
//       이름은 게임과 악보가 부르는 이름(영문 소문자·숫자·밑줄, 23 자까지), 파일은 samples/ 안의 WAV.
//       gain 은 틀 때마다 곱하는 크기(dB, 기본 0), group 은 묶음 번호 1…255 (같은 묶음의 소리가 새로 나면 울리던 것이 끊긴다).
//       root 는 음높이가 있는 샘플의 근음 — 그 소리가 실제로 내는 음 (e1, f#2, eb3 … 과학적 표기: a4 = 440 Hz), tune 은 그 음에서 벗어난 양(센트, 높으면 양수).
//       둘은 뱅크에 담기지 않고 악보 도구(songc.mjs)가 읽는다: 악보의 음에 가장 가까운 근음의 샘플을 골라 재생 속도를 정하고, tune 만큼 되돌려 맞춘다
//   <소리 폴더>/samples/*.wav — 읽는 WAV: PCM 16·24·32 비트, float 32 비트, WAVE_FORMAT_EXTENSIBLE 로 싼 것, 채널은 몇이든 (평균해 한 채널로)
//   <소리 폴더>/CREDITS.md — 파일마다 출처와 라이선스. samples.txt 의 파일이 여기 `파일.wav` 로 적혀 있지 않으면 빌드를 멈춘다
// 옮기며 하는 손질: 앞머리의 무음을 잘라 소리가 첫 표본에서 시작하게 하고, 꼬리의 무음을 자르고, 끝 5 ms 를 줄여 딸깍하지 않게 한다.
//
// .samplebank (리틀 엔디언): 'ZKSB', 샘플 수 u32, 샘플마다 머리 36 바이트(이름 24 바이트(남는 자리는 0), 크기 f32, 묶음 u32, QOA 바이트 수 u32),
//   이어서 소리 덩어리들이 그 차례로 — QOA 파일('qoaf' 로 시작, 안은 빅 엔디언, 모노)이거나 누르지 않은 소리('zpcm', 표본율 u32, 16 비트 표본들 — 리틀 엔디언)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const NAME_BYTES = 24
/** 이보다 작은 표본은 무음으로 친다 (-60 dB) */
const SILENCE = 0.001
const FADE_SECONDS = 0.005

/** WAV 바이트를 { rate, frames } 로 푼다 — frames 는 한 채널로 평균한 표본들 (-1…1, Float64Array) */
export function decodeWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (at) => String.fromCharCode(...bytes.subarray(at, at + 4))
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('WAV 파일이 아니다')
  let format = null
  let data = null
  // 조각은 짝수 바이트에 맞춰 놓인다
  for (let at = 12; at + 8 <= bytes.length; ) {
    const size = view.getUint32(at + 4, true)
    const body = bytes.subarray(at + 8, at + 8 + size)
    if (tag(at) === 'fmt ') {
      if (size < 16) throw new Error('WAV 의 fmt 조각이 짧다')
      let kind = view.getUint16(at + 8, true)
      // EXTENSIBLE — 실제 종류는 SubFormat GUID 의 앞 두 바이트
      if (kind === 0xfffe && size >= 26) kind = view.getUint16(at + 8 + 24, true)
      format = { kind, channels: view.getUint16(at + 10, true), rate: view.getUint32(at + 12, true), bits: view.getUint16(at + 22, true) }
    } else if (tag(at) === 'data') {
      // 길이가 파일보다 길게 적힌 것(스트림으로 쓴 WAV)은 있는 만큼만 읽는다
      data = body
    }
    at += 8 + size + (size & 1)
  }
  if (!format || !data) throw new Error('WAV 에 fmt 나 data 조각이 없다')
  const { kind, channels, rate, bits } = format
  const read =
    kind === 1 && bits === 16 ? (v, at) => v.getInt16(at, true) / 32768
    : kind === 1 && bits === 24 ? (v, at) => ((v.getInt8(at + 2) << 16) | v.getUint16(at, true)) / 8388608
    : kind === 1 && bits === 32 ? (v, at) => v.getInt32(at, true) / 2147483648
    : kind === 3 && bits === 32 ? (v, at) => v.getFloat32(at, true)
    : null
  if (!read || !channels || !rate) throw new Error(`읽지 못하는 WAV 다 (종류 ${kind}, ${bits} 비트, 채널 ${channels}, ${rate} Hz) — PCM 16·24·32 비트나 float 32 비트로 다시 저장한다`)
  const step = (bits / 8) * channels
  const count = Math.floor(data.length / step)
  const samples = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const frames = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    let sum = 0
    for (let c = 0; c < channels; c++) sum += read(samples, i * step + c * (bits / 8))
    frames[i] = sum / channels
  }
  return { rate, frames }
}

/** 앞뒤의 무음을 자르고(소리가 첫 표본에서 시작한다) 끝 5 ms 를 0 으로 줄인다. 16 비트 표본으로 돌려준다 */
export function prepare({ rate, frames }) {
  let first = 0
  while (first < frames.length && Math.abs(frames[first]) < SILENCE) first++
  let last = frames.length
  while (last > first && Math.abs(frames[last - 1]) < SILENCE) last--
  if (first === last) throw new Error('소리가 없다 (모든 표본이 -60 dB 아래다)')
  const out = new Int16Array(last - first)
  const fade = Math.min(Math.round(rate * FADE_SECONDS), out.length)
  for (let i = 0; i < out.length; i++) {
    const left = out.length - 1 - i
    const value = frames[first + i] * (left < fade ? left / fade : 1)
    out[i] = Math.max(-32768, Math.min(32767, Math.round(value * 32768)))
  }
  return out
}

// ── QOA ──────────────────────────────────────────────────────────────────────
// 프레임(5120 표본)마다 머리 8 바이트와 LMS 상태 16 바이트, 이어서 조각(20 표본 = 8 바이트: 눈금 번호 4 비트 + 잔차 3 비트 × 20)들.
// 표본마다 지난 표본 넷으로 내다본 값과의 차이를, 조각마다 고른 눈금으로 3 비트에 담는다. 푸는 쪽은 engine/audio/qoa.cpp.
const SLICE = 20
const FRAME_SLICES = 256
/** 잔차 3 비트의 뜻 — 눈금 번호마다 (명세의 표, engine/audio/qoa.cpp 의 DEQUANT 와 같다) */
const DEQUANT = [
  [1, -1, 3, -3, 5, -5, 7, -7],
  [5, -5, 18, -18, 32, -32, 49, -49],
  [16, -16, 53, -53, 95, -95, 147, -147],
  [34, -34, 113, -113, 203, -203, 315, -315],
  [63, -63, 210, -210, 378, -378, 588, -588],
  [104, -104, 345, -345, 621, -621, 966, -966],
  [158, -158, 528, -528, 950, -950, 1477, -1477],
  [228, -228, 760, -760, 1368, -1368, 2128, -2128],
  [316, -316, 1053, -1053, 1895, -1895, 2947, -2947],
  [422, -422, 1405, -1405, 2529, -2529, 3934, -3934],
  [548, -548, 1828, -1828, 3290, -3290, 5117, -5117],
  [696, -696, 2320, -2320, 4176, -4176, 6496, -6496],
  [868, -868, 2893, -2893, 5207, -5207, 8099, -8099],
  [1064, -1064, 3548, -3548, 6386, -6386, 9933, -9933],
  [1286, -1286, 4288, -4288, 7718, -7718, 12005, -12005],
  [1536, -1536, 5120, -5120, 9216, -9216, 14336, -14336],
]
/** 눈금 번호 s 의 눈금 — round((s + 1)^2.75) */
const SCALE = DEQUANT.map((_, s) => Math.round((s + 1) ** 2.75))
/** 눈금으로 나눈 잔차(-8…8, 반올림) → 3 비트 */
const QUANT = [7, 7, 7, 5, 5, 3, 3, 1, 0, 0, 2, 2, 4, 4, 6, 6, 6]

/** 16 비트 모노 표본들을 QOA 파일로 적는다 */
export function encodeQoa(samples, rate) {
  if (!samples.length) throw new Error('빈 소리는 QOA 로 적지 못한다')
  if (!(rate >= 1 && rate < 1 << 24)) throw new Error(`QOA 가 담지 못하는 표본율이다: ${rate}`)
  const slices = Math.ceil(samples.length / SLICE)
  const frames = Math.ceil(samples.length / (SLICE * FRAME_SLICES))
  const out = new Uint8Array(8 + frames * 24 + slices * 8)
  const view = new DataView(out.buffer)
  out.set([0x71, 0x6f, 0x61, 0x66])
  view.setUint32(4, samples.length)
  // 지난 표본 넷과 가중치 넷 — 처음에는 직선으로 이어 내다본다 (2·마지막 - 그 앞)
  let history = [0, 0, 0, 0]
  let weights = [0, 0, -8192, 16384]
  let at = 8
  for (let start = 0; start < samples.length; start += SLICE * FRAME_SLICES) {
    const count = Math.min(SLICE * FRAME_SLICES, samples.length - start)
    const frameSlices = Math.ceil(count / SLICE)
    view.setUint32(at, (1 << 24) | rate)
    view.setUint16(at + 4, count)
    view.setUint16(at + 6, 24 + frameSlices * 8)
    for (let i = 0; i < 4; i++) {
      view.setInt16(at + 8 + i * 2, history[i])
      // 가중치는 16 비트로 적힌다 — 넘친 값은 푸는 쪽이 읽을 값으로 맞춰 둔다 (두 쪽의 상태가 어긋나지 않게)
      weights[i] = (weights[i] << 16) >> 16
      view.setInt16(at + 16 + i * 2, weights[i])
    }
    at += 24
    for (let s = 0; s < frameSlices; s++, at += 8) {
      const from = start + s * SLICE
      const length = Math.min(SLICE, start + count - from)
      // 눈금 16 가지를 다 해 보고 오차가 가장 작은 것을 고른다
      let best = null
      for (let scale = 0; scale < 16; scale++) {
        const h = [...history]
        const w = [...weights]
        const bits = []
        let error = 0
        for (let i = 0; i < length && (!best || error < best.error); i++) {
          const predicted = Math.floor((w[0] * h[0] + w[1] * h[1] + w[2] * h[2] + w[3] * h[3]) / 8192)
          const residual = samples[from + i] - predicted
          const scaled = Math.max(-8, Math.min(8, Math.sign(residual) * Math.floor(Math.abs(residual) / SCALE[scale] + 0.5)))
          const quantized = QUANT[scaled + 8]
          const dequantized = DEQUANT[scale][quantized]
          const sample = Math.max(-32768, Math.min(32767, predicted + dequantized))
          // 가중치가 16 비트를 넘어가려 하면 그 눈금을 꺼린다 (명세의 참조 구현과 같은 벌점)
          const penalty = Math.max(0, Math.floor((w[0] * w[0] + w[1] * w[1] + w[2] * w[2] + w[3] * w[3]) / 262144) - 0x8ff)
          error += (samples[from + i] - sample) ** 2 + penalty * penalty
          const delta = dequantized >> 4
          for (let k = 0; k < 4; k++) w[k] += h[k] < 0 ? -delta : delta
          h.shift()
          h.push(sample)
          bits.push(quantized)
        }
        if (bits.length === length && (!best || error < best.error)) best = { scale, bits, error, h, w }
      }
      history = best.h
      weights = best.w
      let slice = BigInt(best.scale)
      for (let i = 0; i < SLICE; i++) slice = (slice << 3n) | BigInt(best.bits[i] ?? 0)
      view.setBigUint64(at, slice)
    }
  }
  return out
}

/** 음이름(e1, f#2, eb3 — a4 = 440 Hz 가 69)을 MIDI 번호로. 음이름이 아니면 null */
export function noteNumber(text) {
  const found = /^([a-g])([#b]?)(-?\d)$/.exec(text ?? '')
  if (!found) return null
  return 12 * (Number(found[3]) + 1) + { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[found[1]] + (found[2] === '#' ? 1 : found[2] === 'b' ? -1 : 0)
}

/** samples.txt 를 [{ name, file, gain(곱하는 크기), group, root(MIDI 번호 — 없으면 null), tune(센트) }] 로 읽는다 */
export function parseSampleList(text) {
  const samples = []
  text.split(/\r?\n/).forEach((raw, index) => {
    const fail = (message) => {
      throw new Error(`samples.txt ${index + 1} 줄: ${message}`)
    }
    const [name, file, ...options] = raw.replace(/(^|\s)#.*/, '').trim().split(/\s+/)
    if (!name) return
    if (!/^[a-z0-9_]+$/.test(name) || name.length >= NAME_BYTES) fail(`샘플 이름은 영문 소문자·숫자·밑줄 ${NAME_BYTES - 1} 자까지다: ${name}`)
    if (samples.some((sample) => sample.name === name)) fail(`같은 이름이 두 번 나온다: ${name}`)
    if (!file || !/^[A-Za-z0-9_.-]+\.wav$/.test(file)) fail(`파일은 samples/ 안의 WAV 이름이다: ${file ?? ''}`)
    const sample = { name, file, gain: 1, group: 0, root: null, tune: 0, pcm: false }
    for (const option of options) {
      const [key, value] = option.split('=')
      const number = Number(value)
      if (option === 'pcm') sample.pcm = true
      else if (key === 'gain' && value !== '' && number >= -60 && number <= 18) sample.gain = 10 ** (number / 20)
      else if (key === 'group' && Number.isInteger(number) && number >= 1 && number <= 255) sample.group = number
      else if (key === 'root' && noteNumber(value) !== null) sample.root = noteNumber(value)
      else if (key === 'tune' && value !== '' && number >= -50 && number <= 50) sample.tune = number
      else fail(`모르는 옵션이다 (gain=-60…18 dB, group=1…255, root=음이름, tune=-50…50 센트): ${option}`)
    }
    if (sample.tune && sample.root === null) fail(`tune 은 root 가 있는 샘플에만 쓴다: ${name}`)
    samples.push(sample)
  })
  return samples
}

/** samples.txt 의 파일이 모두 CREDITS.md 에 `파일` 로 적혀 있는지 본다 — 출처를 적지 않은 소리는 싣지 않는다 */
export function checkCredits(samples, credits) {
  const missing = [...new Set(samples.map((sample) => sample.file))].filter((file) => !credits.includes(`\`${file}\``))
  if (missing.length) throw new Error(`CREDITS.md 에 출처가 없는 파일이 있다: ${missing.join(', ')}`)
}

/** 16 비트 표본들을 누르지 않은 덩어리로 — 'zpcm', 표본율 u32, 표본들 (리틀 엔디언) */
export function encodePcm(samples, rate) {
  const out = new Uint8Array(8 + samples.length * 2)
  const view = new DataView(out.buffer)
  out.set([0x7a, 0x70, 0x63, 0x6d])
  view.setUint32(4, rate, true)
  samples.forEach((value, i) => view.setInt16(8 + i * 2, value, true))
  return out
}

/** [{ name, gain, group, qoa(소리 덩어리 — QOA 파일이나 encodePcm 의 것) }] 를 .samplebank 로 적는다 */
export function encodeBank(samples) {
  const out = new Uint8Array(8 + samples.length * 36 + samples.reduce((sum, sample) => sum + sample.qoa.length, 0))
  const view = new DataView(out.buffer)
  out.set([0x5a, 0x4b, 0x53, 0x42])
  view.setUint32(4, samples.length, true)
  let data = 8 + samples.length * 36
  samples.forEach((sample, i) => {
    const at = 8 + i * 36
    out.set([...sample.name].map((char) => char.charCodeAt(0)), at)
    view.setFloat32(at + NAME_BYTES, sample.gain, true)
    view.setUint32(at + NAME_BYTES + 4, sample.group, true)
    view.setUint32(at + NAME_BYTES + 8, sample.qoa.length, true)
    out.set(sample.qoa, data)
    data += sample.qoa.length
  })
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [folder, output] = process.argv.slice(2)
  if (!folder || !output) {
    console.error('usage: samplec.mjs <소리 폴더> <out.samplebank>')
    process.exit(2)
  }
  try {
    const samples = parseSampleList(readFileSync(join(folder, 'samples.txt'), 'utf8'))
    checkCredits(samples, readFileSync(join(folder, 'CREDITS.md'), 'utf8'))
    for (const sample of samples) {
      try {
        const wav = decodeWav(readFileSync(join(folder, 'samples', sample.file)))
        sample.qoa = sample.pcm ? encodePcm(prepare(wav), wav.rate) : encodeQoa(prepare(wav), wav.rate)
      } catch (error) {
        throw new Error(`${sample.file}: ${error.message}`, { cause: error })
      }
    }
    writeFileSync(output, encodeBank(samples))
  } catch (error) {
    console.error(`samplec: ${error.message}`)
    process.exit(1)
  }
}
