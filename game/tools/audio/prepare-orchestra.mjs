// 오케스트라 샘플 손질 — VSCO 2 Community Edition(CC0)에서 곡에 쓰는 음만 받아 게임의 샘플로 옮긴다.
// 받은 원본은 git 밖의 game/audio-src/vsco2/ 에 두고(다시 받지 않는다), 손질한 모노 WAV 를 content/audio/samples/ 에 적는다.
// 손질: 소리의 시작(가장 큰 값의 -36 dB 를 처음 넘는 곳의 5 ms 앞)에서 자르고, 정한 길이에서 줄여 끝내고, 32 kHz 한 채널로 옮기고,
//       방의 울림(FDN 잔향 — 아래 reverb)을 꼬리에 구워 넣고(엔진의 믹서에는 잔향이 없다), 피크를 -1 dBFS 로 맞춘다.
//       음높이가 있는 소리는 0.25…1.25 초에서 기본 주파수를 재(YIN) 근음과 센트를 적는다 — samples.txt 의 root·tune.
// 결과(파일마다 원본·남긴 길이·잰 값)는 build/orchestra-samples.json 과 화면에 적는다 — CREDITS.md 의 표와 samples.txt 의 줄을 거기서 옮긴다.
// 사용: node game/tools/audio/prepare-orchestra.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeWav } from '../samplec.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const source = join(root, 'game/audio-src/vsco2')
const out = join(root, 'game/gameplay/content/audio/samples')
const RAW = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/'
const RATE = 32000

// 받을 소리 — 이름의 앞머리, 원본 폴더, 고를 파일(정규식 — 음이름을 첫 묶음으로), 세기(v 번호 — 없으면 가장 큰 것), 테이크 수,
// 남길 길이(초 — 원본의 소리), 끝을 줄이는 길이, 잔향의 양(0…1), 음높이가 있는가
const FAMILIES = [
  { name: 'cb_spic', folder: 'Strings/Solo Contrabass/Spic', file: /^BKCtbss_Spic_([A-G]#?\d)_v(\d)_rr(\d)\.wav$/, takes: 2, keep: 0.45, fade: 0.15, wet: 0.3, pitched: true },
  { name: 'cello_spic', folder: 'Strings/Cello Section/spic', file: /^spic_([A-G]#?\d)_v(\d)_RR(\d)\.wav$/, takes: 2, keep: 0.45, fade: 0.15, wet: 0.3, pitched: true },
  { name: 'viola_spic', folder: 'Strings/Viola Section/spic', file: /^Violas_spic_([A-G]#?\d)_v(\d)_rr(\d)\.wav$/, takes: 1, keep: 0.4, fade: 0.12, wet: 0.32, pitched: true },
  { name: 'cello_sus', folder: 'Strings/Cello Section/susvib', file: /^susvib_([A-G]#?\d)_v(\d)_(\d)\.wav$/, takes: 1, keep: 5.2, fade: 0.5, wet: 0.22, pitched: true },
  { name: 'viola_sus', folder: 'Strings/Viola Section/susvib', file: /^ViolaEns_susvib_([A-G]#?\d)_v(\d)_(\d)\.wav$/, takes: 1, keep: 5.2, fade: 0.5, wet: 0.22, pitched: true },
  { name: 'vln_sus', folder: 'Strings/Violin Section/susVib', file: /^VlnEns_susVib_([A-G]#?\d)_v(\d)()\.wav$/, takes: 1, keep: 5.2, fade: 0.5, wet: 0.24, pitched: true },
  { name: 'horn_sus', folder: 'Brass/F Horn/sus', file: /^MOHorn_sus_([A-G]#?\d)_v(\d)_(\d)\.wav$/, takes: 1, keep: 4.0, fade: 0.45, wet: 0.26, pitched: true },
  { name: 'horn_stac', folder: 'Brass/F Horn/stac', file: /^MOHorn_stac_([A-G]#?\d)_v(\d)_rr(\d)\.wav$/, takes: 1, keep: 0.6, fade: 0.15, wet: 0.32, pitched: true },
  { name: 'tbn_sus', folder: 'Brass/Tenor Trombone/sus', file: /^tenortbn_sus_([A-G]#?\d)_v(\d)_(\d)\.wav$/, takes: 1, keep: 4.0, fade: 0.45, wet: 0.24, pitched: true },
  { name: 'tbn_stac', folder: 'Brass/Tenor Trombone/stac', file: /^tenortbn_stac_([A-G]#?\d)_v(\d)_rr(\d)\.wav$/, takes: 1, keep: 0.6, fade: 0.15, wet: 0.3, pitched: true },
  { name: 'tuba_sus', folder: 'Brass/Tuba/sus', file: /^Tuba3_sus_([A-G]#?\d)_v(\d)_rr(\d)_Mid\.wav$/, takes: 1, keep: 4.0, fade: 0.45, wet: 0.2, pitched: true },
  { name: 'harp', folder: 'Strings/Harp', file: /^KSHarp_([A-G]#?\d)_(m?f|mp)()\.wav$/, takes: 1, keep: 2.6, fade: 0.8, wet: 0.3, pitched: true },
]
// 음높이를 재지 않는 타악 — 하나씩 정한 파일
const SINGLES = [
  ...[1, 2, 3, 4, 5].map((n) => ({ name: `timp_hit_${n}`, path: `Percussion/Timpani/Timpani${n}_Hit_v${n === 1 ? 3 : 4}_rr1_Sum.wav`, keep: 2.4, fade: 0.8, wet: 0.25, pitched: true })),
  { name: 'timp_roll_3', path: 'Percussion/Timpani/Rolls/Timpani3_Roll_v5_rr1_Sum.wav', keep: 3.2, fade: 0.6, wet: 0.22 },
  { name: 'gran_cassa', path: 'VSCO 1 Percussion/drums/bass/bdrum_fff_1.wav', keep: 2.2, fade: 0.8, wet: 0.25 },
  { name: 'gran_cassa_b', path: 'VSCO 1 Percussion/drums/bass/bdrum3_fff_1.wav', keep: 2.2, fade: 0.8, wet: 0.25 },
  { name: 'orch_crash', path: 'VSCO 1 Percussion/varMetal/Cymbals/clash/crash_hit_fff_loose.wav', keep: 3.2, fade: 1.2, wet: 0.2 },
  { name: 'cym_swell', path: 'VSCO 1 Percussion/varMetal/Cymbals/susp/susp_hit_softmall_roll2_cresc.wav', keep: 4.0, fade: 0.5, wet: 0.2 },
  { name: 'gong', path: 'VSCO 1 Percussion/varMetal/Gong/gong_hit_fff.wav', keep: 6.0, fade: 2.5, wet: 0.2 },
]

/** 음이름(c4, f#2) ↔ MIDI 번호 */
const NAMES = ['c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'g#', 'a', 'bb', 'b']
const midiOf = (text) => {
  const m = /^([A-G])(#?)(-?\d)$/.exec(text)
  return 12 * (Number(m[3]) + 1) + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1])] + (m[2] ? 1 : 0)
}
const noteName = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`

async function fetchSource(path) {
  const local = join(source, path)
  if (existsSync(local)) return readFileSync(local)
  const response = await fetch(RAW + path.split('/').map(encodeURIComponent).join('/'))
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  mkdirSync(dirname(local), { recursive: true })
  writeFileSync(local, bytes)
  return bytes
}

/** 창 씌운 sinc 로 표본율을 옮긴다 (낮출 때는 새 나이퀴스트에서 자른다) */
function resample(frames, from, to) {
  if (from === to) return Float64Array.from(frames)
  const ratio = to / from, cutoff = Math.min(1, ratio), taps = 24
  const outLength = Math.floor(frames.length * ratio)
  const result = new Float64Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const center = i / ratio, base = Math.floor(center)
    let sum = 0
    for (let k = base - taps + 1; k <= base + taps; k++) {
      if (k < 0 || k >= frames.length) continue
      const x = center - k
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x * cutoff) / (Math.PI * x * cutoff)
      const window = 0.5 + 0.5 * Math.cos((Math.PI * x) / (taps + 1))
      sum += frames[k] * sinc * window * cutoff
    }
    result[i] = sum
  }
  return result
}

/**
 * 잔향 — 지연 여덟의 되먹임 행렬(하우스홀더) 망. 줄마다 1 차 저역 통과로 높은 소리가 먼저 잦아든다. 잔향 시간 2.1 초, 앞 지연 18 ms.
 * 같은 입력이면 같은 바이트가 나온다. 돌려주는 것은 마른 소리 + wet × 잔향이고, 꼬리 tail 초를 더 붙인다
 */
function reverb(dry, wet, tail) {
  const LINES = [1117, 1301, 1493, 1621, 1801, 1949, 2111, 2297].map((n) => Math.round((n * RATE) / 44100))
  const RT60 = 2.1, PREDELAY = Math.round(0.018 * RATE), DAMP = 0.32
  const gains = LINES.map((length) => 10 ** ((-3 * length) / (RT60 * RATE)))
  const buffers = LINES.map((length) => new Float64Array(length))
  const cursors = LINES.map(() => 0), lowpass = LINES.map(() => 0)
  const length = dry.length + Math.round(tail * RATE)
  const result = new Float64Array(length)
  const pre = new Float64Array(PREDELAY + 1)
  let preAt = 0
  for (let i = 0; i < length; i++) {
    const input = i < dry.length ? dry[i] : 0
    const delayed = pre[preAt]
    pre[preAt] = input
    preAt = (preAt + 1) % pre.length
    const outs = buffers.map((buffer, l) => buffer[cursors[l]])
    const sum = outs.reduce((a, b) => a + b, 0) * (2 / LINES.length)
    let wetSample = 0
    for (let l = 0; l < LINES.length; l++) {
      // 하우스홀더: y = x − (2/N)·Σx — 에너지를 지키며 줄끼리 섞는다
      const mixed = outs[l] - sum
      lowpass[l] += (1 - DAMP) * (mixed - lowpass[l])
      buffers[l][cursors[l]] = delayed * 0.5 + lowpass[l] * gains[l]
      cursors[l] = (cursors[l] + 1) % buffers[l].length
      wetSample += outs[l] * (l % 2 ? -1 : 1)
    }
    result[i] = input + wet * wetSample * 0.35
  }
  return result
}

/** YIN — 기본 주파수 (Hz). 못 재면 null */
function pitch(frames, from, to) {
  const window = Math.round(0.08 * RATE), minLag = Math.floor(RATE / 1400), maxLag = Math.floor(RATE / 25)
  const estimates = []
  for (let start = Math.round(from * RATE); start + window + maxLag < Math.min(frames.length, to * RATE); start += Math.round(0.1 * RATE)) {
    const d = new Float64Array(maxLag + 1)
    for (let lag = 1; lag <= maxLag; lag++) {
      let s = 0
      for (let i = 0; i < window; i++) { const x = frames[start + i] - frames[start + i + lag]; s += x * x }
      d[lag] = s
    }
    let running = 0, found = null
    for (let lag = 1; lag <= maxLag; lag++) {
      running += d[lag]
      const normalized = (d[lag] * lag) / (running || 1)
      if (lag >= minLag && normalized < 0.12) {
        while (lag + 1 <= maxLag && d[lag + 1] < d[lag]) lag++
        // 포물선으로 사이 값을 어림한다
        const a = d[lag - 1], b = d[lag], c = d[lag + 1] ?? b
        found = lag + (a - c) / (2 * (a - 2 * b + c) || 1)
        break
      }
    }
    if (found) estimates.push(RATE / found)
  }
  if (estimates.length < 2) return null
  estimates.sort((a, b) => a - b)
  return estimates[Math.floor(estimates.length / 2)]
}

function writeWav(path, frames) {
  const bytes = Buffer.alloc(44 + frames.length * 2)
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + frames.length * 2, 4); bytes.write('WAVE', 8)
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36); bytes.writeUInt32LE(frames.length * 2, 40)
  frames.forEach((v, i) => bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2))
  writeFileSync(path, bytes)
}

async function prepareOne({ name, path, keep, fade, wet, pitched }) {
  const decoded = decodeWav(new Uint8Array(await fetchSource(path)))
  let frames = resample(decoded.frames, decoded.rate, RATE)
  const peak = frames.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  let start = frames.findIndex((v) => Math.abs(v) > peak * 0.0158)
  start = Math.max(0, start - Math.round(0.005 * RATE))
  frames = frames.subarray(start, Math.min(frames.length, start + Math.round(keep * RATE)))
  const fadeFrames = Math.min(frames.length, Math.round(fade * RATE))
  const shaped = Float64Array.from(frames, (v, i) => {
    const left = frames.length - 1 - i
    return left < fadeFrames ? v * (left / fadeFrames) ** 1.5 : v
  })
  // 짧은 음(스피카토·스타카토)은 앞쪽에서, 긴 음은 어택이 지난 뒤에서 잰다
  const measured = pitched ? (keep < 1 ? pitch(shaped, 0.03, 0.42) : pitch(shaped, 0.25, 1.25)) : null
  const wetted = reverb(shaped, wet, 1.2 + wet * 2)
  // 꼬리의 끝 0.3 초를 줄이고 피크를 -1 dBFS 로
  const end = Math.round(0.3 * RATE)
  for (let i = 0; i < end; i++) wetted[wetted.length - 1 - i] *= i / end
  const top = wetted.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
  const scaled = wetted.map((v) => (v / top) * 0.891)
  writeWav(join(out, `${name}.wav`), scaled)
  const record = { name, source: path, kept: +(frames.length / RATE).toFixed(3), seconds: +(scaled.length / RATE).toFixed(3) }
  if (measured) {
    const exact = 69 + 12 * Math.log2(measured / 440), midi = Math.round(exact)
    Object.assign(record, { hz: +measured.toFixed(2), root: noteName(midi), tune: Math.round((exact - midi) * 100) })
  }
  return record
}

const tree = JSON.parse(readFileSync(process.argv[2] ?? join(root, 'build/vsco-tree.json'), 'utf8')).tree
const jobs = []
for (const family of FAMILIES) {
  const notes = new Map()
  for (const entry of tree) {
    if (entry.type !== 'blob' || !entry.path.startsWith(family.folder + '/')) continue
    const m = family.file.exec(entry.path.slice(family.folder.length + 1))
    if (!m) continue
    const [, note, velocity, take] = m
    const list = notes.get(note) ?? []
    list.push({ path: entry.path, velocity: Number.isNaN(Number(velocity)) ? 0 : Number(velocity), take: Number(take || 1) })
    notes.set(note, list)
  }
  for (const [note, list] of notes) {
    const loudest = Math.max(...list.map((f) => f.velocity))
    const picks = list.filter((f) => f.velocity === loudest).sort((a, b) => a.take - b.take).slice(0, family.takes)
    picks.forEach((pick, i) => jobs.push({ ...family, file: undefined, label: note, take: i, path: pick.path }))
  }
}
mkdirSync(out, { recursive: true })
const records = []
for (const job of jobs) {
  const record = await prepareOne({ ...job, name: `${job.name}_tmp` })
  const { renameSync, rmSync } = await import('node:fs')
  // 음높이를 잴 수 없던 녹음(가장 낮은 음들)과 호른의 페달 음(G2 아래)은 넣지 않는다
  if (!record.root || (job.name === 'horn_sus' && midiOf(record.root.toUpperCase().replace('BB', 'A#').replace('EB', 'D#')) < 43)) {
    rmSync(join(out, `${job.name}_tmp.wav`))
    continue
  }
  // 이름은 잰 근음으로 — 원본 파일 이름의 옥타브는 믿지 않는다 (VSCO 는 대개 한 옥타브 낮게 적었다)
  let final = `${job.name}_${(record.root ?? job.label.toLowerCase()).replace('#', 's')}${job.takes > 1 ? '_' + 'ab'[job.take] : ''}`
  // 다른 원본이 같은 음으로 재졌으면 (하프의 이웃한 두 녹음) 뒤의 것에 표시를 붙인다
  while (records.some((other) => other.name === final)) final += 'x'
  renameSync(join(out, `${job.name}_tmp.wav`), join(out, `${final}.wav`))
  records.push({ ...record, name: final, label: job.label })
  console.log(final, record.source, record.hz ?? '', record.root ?? '', record.tune ?? '')
}
for (const single of SINGLES) {
  const record = await prepareOne(single)
  records.push(record)
  console.log(record.name, record.source, record.hz ?? '', record.root ?? '', record.tune ?? '')
}
mkdirSync(join(root, 'build'), { recursive: true })
writeFileSync(join(root, 'build/orchestra-samples.json'), JSON.stringify(records, null, 2) + '\n')
console.log('ORCHESTRA', records.length, 'samples')
