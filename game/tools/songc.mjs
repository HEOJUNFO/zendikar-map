// 악보 빌드 — 글로 적은 악보(.song.txt)를 엔진의 시퀀서가 읽는 곡 데이터(.song)로 옮긴다 (engine/audio/sequencer).
// 곡의 시간은 게임의 틱이다: 박자는 게임의 리듬 규칙(gameplay/domain/rhythm.hpp)과 같아야 하고, 다르면 빌드를 멈춘다.
//
// 사용: node songc.mjs <in.song.txt> <samples.txt> <rhythm.hpp> <out.song>
// 악보 (줄 머리나 빈칸 뒤의 # 부터는 주석 — f#2 같은 음이름의 # 은 아니다):
//   tempo 90                  분당 박 수 — rhythm.hpp 의 박 길이(TICK_RATE · 60 / TICKS_PER_BEAT)와 같아야 한다
//   meter 4                   한 마디의 박 수 (기본 4)
//   grid 16                   한 마디를 나누는 칸 수 (16 이면 16분음표 — 칸 하나가 틱으로 떨어져야 한다)
//                             줄 하나만 더 잘게 적을 수 있다: 칸 수가 grid 의 배수(32, 64 …)인 줄은 그 줄만 그만큼 잘게 나눈다 (32분음표의 롤·갤럽 —
//                             그 칸도 틱으로 떨어져야 한다). 같은 패턴의 다른 줄은 grid 대로 적는다
//   inst K kick_a kick_b [gain=dB] [pan=-1…1]
//                             악기 — 줄 머리에 쓸 이름과 samples.txt 의 샘플들. 타악(근음이 없는 샘플)은 샘플이 여럿이면 칠 때마다 번갈아 쓴다.
//                             샘플에 근음(samples.txt 의 root=)이 있으면 음높이가 있는 악기다 (베이스·기타) — 모든 샘플에 근음이 있어야 한다
//   pattern 이름 … end        한 마디. 줄마다 `악기 칸들`.
//                             타악: X 세게(1.0) · x 보통(0.7) · o 여리게(0.4) · . 쉼. | 와 띄어쓰기는 읽기 좋으라고 넣는 것이다
//                             음높이가 있는 악기: 칸을 띄어 적는다 — `e1X`(음이름 + 세기) · `-`(앞의 음을 한 칸 더 끈다) · `.` 쉼 · `|` 는 읽기 좋으라고.
//                               음은 적은 칸 수만큼 울리고 끊긴다 (마디를 넘지 못한다). 가장 가까운 근음의 샘플을 골라(같은 근음의 샘플이 여럿이면 번갈아)
//                               재생 속도 2^(반음/12)로 낸다 — 근음에서 3 반음 넘게 떨어진 음은 빌드를 멈춘다 (음색이 틀어진다). 샘플의 tune(센트)만큼 되돌려 맞춘다.
//                               화음은 같은 악기의 줄을 여러 번 적는다 (파워코드 = 근음 줄 + 5도 줄)
//   layer 이름 패턴 패턴 …    층 — 패턴들을 차례로 이은 것 (마디 수가 곡의 되풀이 길이를 나눠야 한다). 게임이 이름으로 켜고 끈다
//
// .song (리틀 엔디언): 'ZKSG', 초당 틱 수, 되풀이 길이(틱), 마디 길이(틱), 층 수 (모두 u32),
//   층마다 [이름 16 바이트(남는 자리는 0), 음 수 u32, 음마다 24 바이트: 자리(틱) u32, 샘플 번호 u32, 길이(틱 — 0 은 샘플의 끝까지) u32, 높이·크기·자리(pan) f32] — 음은 자리 차례
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { noteNumber, parseSampleList } from './samplec.mjs'

const NAME_BYTES = 16
const VELOCITY = { X: 1, x: 0.7, o: 0.4 }
/** 근음에서 이보다 멀리(반음) 옮겨 내지 않는다 */
const MAX_SHIFT = 3

/** rhythm.hpp 에서 초당 틱 수와 한 박의 틱 수를 읽는다 */
export function readRhythm(header) {
  const constant = (name) => {
    const found = header.match(new RegExp(`constexpr\\s+uint32_t\\s+${name}\\s*=\\s*(\\d+)\\s*;`))
    if (!found) throw new Error(`rhythm.hpp 에서 ${name} 을 찾지 못했다`)
    return Number(found[1])
  }
  return { tickRate: constant('TICK_RATE'), ticksPerBeat: constant('TICKS_PER_BEAT') }
}

/**
 * 악보 글을 { tickRate, loopTicks, barTicks, layers: [{ name, notes: [{ tick, sample, length, pitch, gain, pan }] }] } 로 옮긴다.
 * sampleNames 는 뱅크의 샘플 이름들 (번호 차례), rhythm 은 { tickRate, ticksPerBeat },
 * tuning 은 샘플마다(번호 차례)의 { root(MIDI 번호 — 없으면 null), tune(센트) } — 음높이가 있는 악기를 쓸 때만 준다
 */
export function compileSong(text, sampleNames, rhythm, tuning = []) {
  let meter = 4
  let grid = null
  let tempo = null
  const instruments = new Map()
  const patterns = new Map()
  const layers = []
  let open = null
  text.split(/\r?\n/).forEach((raw, index) => {
    const fail = (message) => {
      throw new Error(`${index + 1} 줄: ${message}`)
    }
    const words = raw.replace(/(^|\s)#.*/, '').trim().split(/\s+/)
    const [command, ...rest] = words
    if (!command) return
    if (open) {
      if (command === 'end') {
        open = null
        return
      }
      const instrument = instruments.get(command) ?? fail(`정하지 않은 악기다: ${command}`)
      if (!grid) fail('pattern 앞에 grid 가 있어야 한다')
      // 줄의 칸 수 — grid 이거나 그 배수 (그 줄만 잘게). 칸 하나의 틱 수를 돌려준다
      const cellTicksOf = (count) => {
        if (!count || count % grid) fail(`한 마디는 ${grid} 칸이다 (${count} 칸을 적었다)`)
        const barTicks = meter * rhythm.ticksPerBeat
        if (barTicks % count) fail(`${count} 칸의 칸이 틱으로 떨어지지 않는다 (한 마디 ${barTicks} 틱)`)
        return barTicks / count
      }
      if (instrument.pitched) {
        const cells = rest.filter((cell) => cell !== '|')
        const ticks = cellTicksOf(cells.length)
        let held = null
        cells.forEach((cell, at) => {
          if (cell === '.') held = null
          else if (cell === '-') (held ?? fail('- 앞에 끌 음이 없다')).length += ticks
          else {
            const note = noteNumber(cell.slice(0, -1))
            if (note === null || !(cell.at(-1) in VELOCITY)) fail(`모르는 칸이다 (음이름 + X x o, 또는 - .): ${cell}`)
            // 가장 가까운 근음 — 같은 거리면 먼저 적은 샘플
            const root = instrument.samples.map((sample) => tuning[sample].root).reduce((best, each) => (Math.abs(each - note) < Math.abs(best - note) ? each : best))
            if (Math.abs(root - note) > MAX_SHIFT) fail(`${cell.slice(0, -1)} 은 악기 ${command} 의 어느 근음에서도 ${MAX_SHIFT} 반음 넘게 떨어져 있다`)
            held = { tick: at * ticks, instrument, velocity: VELOCITY[cell.at(-1)], note, root, length: ticks }
            open.hits.push(held)
          }
        })
        return
      }
      const cells = rest.join('').replaceAll('|', '')
      const ticks = cellTicksOf(cells.length)
      ;[...cells].forEach((cell, at) => {
        if (cell === '.') return
        if (!(cell in VELOCITY)) fail(`모르는 칸이다 (X x o . 만 쓴다): ${cell}`)
        open.hits.push({ tick: at * ticks, instrument, velocity: VELOCITY[cell] })
      })
      return
    }
    const count = Number(rest[0])
    if (command === 'tempo') {
      if (rest.length !== 1 || !(count > 0)) fail('tempo 는 분당 박 수 하나다')
      if (count * rhythm.ticksPerBeat !== rhythm.tickRate * 60) fail(`tempo ${count} 은 게임의 박자(rhythm.hpp — ${(rhythm.tickRate * 60) / rhythm.ticksPerBeat} BPM)와 다르다`)
      tempo = count
    } else if (command === 'meter' || command === 'grid') {
      if (rest.length !== 1 || !Number.isInteger(count) || count < 1) fail(`${command} 는 자연수 하나다`)
      if (patterns.size) fail(`${command} 는 pattern 앞에 적는다`)
      if (command === 'meter') meter = count
      else grid = count
    } else if (command === 'inst') {
      const [name, ...values] = rest
      if (!name || instruments.has(name)) fail(`악기 이름이 없거나 두 번 나온다: ${name ?? ''}`)
      const instrument = { samples: [], gain: 1, pan: 0 }
      for (const value of values) {
        const [key, number] = value.split('=')
        if (number === undefined) {
          const sample = sampleNames.indexOf(value)
          if (sample < 0) fail(`samples.txt 에 없는 샘플이다: ${value}`)
          instrument.samples.push(sample)
        } else if (key === 'gain' && number !== '' && Number(number) >= -60 && Number(number) <= 12) instrument.gain = 10 ** (Number(number) / 20)
        else if (key === 'pan' && number !== '' && Number(number) >= -1 && Number(number) <= 1) instrument.pan = Number(number)
        else fail(`모르는 옵션이다 (gain=-60…12 dB, pan=-1…1): ${value}`)
      }
      if (!instrument.samples.length) fail(`악기에 샘플이 없다: ${name}`)
      const rooted = instrument.samples.filter((sample) => (tuning[sample]?.root ?? null) !== null).length
      if (rooted && rooted !== instrument.samples.length) fail(`악기 ${name} 의 샘플 가운데 근음(root=)이 없는 것이 있다`)
      instrument.pitched = rooted > 0
      instruments.set(name, instrument)
    } else if (command === 'pattern') {
      if (rest.length !== 1 || patterns.has(rest[0])) fail(`패턴 이름이 없거나 두 번 나온다: ${rest[0] ?? ''}`)
      open = { hits: [] }
      patterns.set(rest[0], open)
    } else if (command === 'layer') {
      const [name, ...bars] = rest
      if (!name || name.length >= NAME_BYTES || !/^[a-z0-9_]+$/.test(name) || layers.some((layer) => layer.name === name))
        fail(`층 이름은 영문 소문자·숫자·밑줄 ${NAME_BYTES - 1} 자까지이고 한 번만 나온다: ${name ?? ''}`)
      if (!bars.length) fail(`층에 패턴이 없다: ${name}`)
      layers.push({ name, bars: bars.map((bar) => patterns.get(bar) ?? fail(`정하지 않은 패턴이다: ${bar}`)) })
    } else fail(`모르는 명령이다: ${command}`)
  })
  if (open) throw new Error('pattern 을 end 로 닫지 않았다')
  if (tempo === null) throw new Error('tempo 가 없다')
  if (!layers.length) throw new Error('layer 가 없다')
  const barTicks = meter * rhythm.ticksPerBeat
  if (barTicks % grid) throw new Error(`grid ${grid} 의 칸이 틱으로 떨어지지 않는다 (한 마디 ${barTicks} 틱)`)
  const loopBars = Math.max(...layers.map((layer) => layer.bars.length))
  return {
    tickRate: rhythm.tickRate,
    loopTicks: loopBars * barTicks,
    barTicks,
    layers: layers.map(({ name, bars }) => {
      if (loopBars % bars.length) throw new Error(`층 ${name} 의 마디 수(${bars.length})가 곡의 되풀이 길이(${loopBars} 마디)를 나누지 못한다`)
      const notes = []
      for (let bar = 0; bar < loopBars; bar++) {
        for (const hit of bars[bar % bars.length].hits) {
          const { samples, gain, pan } = hit.instrument
          // 음높이가 있는 음은 그 근음의 샘플들만 번갈아 쓰고, 적은 칸 수만큼 울린다
          const takes = hit.root === undefined ? samples : samples.filter((sample) => tuning[sample].root === hit.root)
          notes.push({ tick: bar * barTicks + hit.tick, order: notes.length, turn: `${[...instruments.values()].indexOf(hit.instrument)}:${hit.root ?? ''}`, hit, gain: gain * hit.velocity, pan, takes })
        }
      }
      // 자리 차례로 (같은 자리는 적은 차례) — 번갈아 쓰는 샘플은 그 층에서 울리는 차례로 돌아간다
      notes.sort((a, b) => a.tick - b.tick || a.order - b.order)
      const turns = new Map()
      return {
        name,
        notes: notes.map(({ tick, turn: key, hit, gain, pan, takes }) => {
          const turn = turns.get(key) ?? 0
          turns.set(key, turn + 1)
          const sample = takes[turn % takes.length]
          const pitch = hit.root === undefined ? 1 : 2 ** ((hit.note - hit.root) / 12 - tuning[sample].tune / 1200)
          return { tick, sample, length: hit.root === undefined ? 0 : hit.length, pitch, gain, pan }
        }),
      }
    }),
  }
}

/** compileSong 의 결과를 .song 으로 적는다 */
export function encodeSong(song) {
  const out = new Uint8Array(20 + song.layers.reduce((sum, layer) => sum + NAME_BYTES + 4 + layer.notes.length * 24, 0))
  const view = new DataView(out.buffer)
  out.set([0x5a, 0x4b, 0x53, 0x47])
  ;[song.tickRate, song.loopTicks, song.barTicks, song.layers.length].forEach((value, i) => view.setUint32(4 + i * 4, value, true))
  let at = 20
  for (const layer of song.layers) {
    out.set([...layer.name].map((char) => char.charCodeAt(0)), at)
    view.setUint32(at + NAME_BYTES, layer.notes.length, true)
    at += NAME_BYTES + 4
    for (const note of layer.notes) {
      view.setUint32(at, note.tick, true)
      view.setUint32(at + 4, note.sample, true)
      view.setUint32(at + 8, note.length, true)
      view.setFloat32(at + 12, note.pitch, true)
      view.setFloat32(at + 16, note.gain, true)
      view.setFloat32(at + 20, note.pan, true)
      at += 24
    }
  }
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, sampleList, rhythmHeader, output] = process.argv.slice(2)
  if (!input || !sampleList || !rhythmHeader || !output) {
    console.error('usage: songc.mjs <in.song.txt> <samples.txt> <rhythm.hpp> <out.song>')
    process.exit(2)
  }
  try {
    const samples = parseSampleList(readFileSync(sampleList, 'utf8'))
    writeFileSync(output, encodeSong(compileSong(readFileSync(input, 'utf8'), samples.map((sample) => sample.name), readRhythm(readFileSync(rhythmHeader, 'utf8')), samples)))
  } catch (error) {
    console.error(`songc: ${input}: ${error.message}`)
    process.exit(1)
  }
}
