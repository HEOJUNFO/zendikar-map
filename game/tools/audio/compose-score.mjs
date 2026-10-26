// 게임 음악의 악보를 짓는다 — 화음과 선율의 표에서 층마다의 패턴을 펼쳐 content/audio/music/pulse.song.txt 를 적는다 (형식은 tools/songc.mjs 머리말).
// 손으로 고치는 것은 이 파일의 표(CHORDS·MELODY·OUTRO·FINISHERS)와 층을 펼치는 규칙이다 — 적힌 악보는 손대지 않고 이것을 다시 돌린다.
//
// 곡: D 단조의 시네마틱 오케스트라, 90 BPM, 열여섯 마디 고리 (사용자 결정 2026-10-26 — 2026-10-10 의 '드럼·베이스·디스토션 기타만'을 바꾼다).
//   현악(콘트라베이스·첼로·비올라의 스피카토 오스티나토, 첼로·비올라·바이올린의 긴 음), 금관(호른·트롬본·튜바), 팀파니·큰북·심벌·징, 하프 — VSCO 2 CE (CC0).
//   박자는 드럼 세트의 킥(박)·하이햇(8분)이 늘 맥박을 짚는다 (pulse — 박자 게임의 메트로놈). 높은 단음을 격자에 찍지 않는다 (2026-10-09 의 칩튠 소리 —
//   선율은 비브라토 긴 음의 바이올린 합주가 부르고 호른이 한 옥타브 아래에서 같이 부른다, 짧은 음은 낮은·가운데 음역의 현악 스피카토만)
// 층 이름은 게임이 켜고 끈다 (presentation/sound.hpp 의 MusicLayer — pulse calm roam combat x2 x3 x4 lead hum, 그리고 승리 뒤의 outro).
// fin1…fin5 는 켜지 않는 층이다 — 보스의 마무리 다섯 발이 저마다 그 층의 음을 한꺼번에 울린다 (presentation/sound.cpp 의 finisher).
// 사용: node game/tools/audio/compose-score.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { noteNumber, parseSampleList } from '../samplec.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SAMPLE_NAMES = parseSampleList(readFileSync(join(root, 'gameplay/content/audio/samples.txt'), 'utf8')).map((s) => s.name)
/** 그 앞머리의 샘플들 (samples.txt 차례) — 악기의 샘플 목록 */
const SAMPLES = parseSampleList(readFileSync(join(root, 'gameplay/content/audio/samples.txt'), 'utf8'))
const samplesOf = (prefix) => SAMPLE_NAMES.filter((s) => s.startsWith(prefix + '_')).join(' ')
/**
 * 화음의 음을 그 악기가 낼 수 있는 자리로 옥타브만 옮긴다 — 근음 둘레 3 반음 안에 드는 가장 가까운 옥타브 (선율에는 쓰지 않는다: 윤곽이 바뀐다).
 * 어느 옥타브에도 들지 않으면 그대로 둔다 (songc 가 멈춘다)
 */
const fit = (prefix, note) => {
  const roots = SAMPLES.filter((s) => s.name.startsWith(prefix + '_') && s.root !== null).map((s) => s.root)
  const playable = (m) => roots.some((r) => Math.abs(r - m) <= 3)
  for (const shift of [0, -12, 12, -24, 24]) if (playable(note + shift)) return note + shift
  return note
}
const CELLS = 16
const NAMES = ['c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'g#', 'a', 'bb', 'b']
const name = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
const n = (text) => noteNumber(text)

// 화음 — 마디마다 근음과 화음의 음 (음이름의 차례: 근음·3도·5도)
const CHORD = {
  Dm: ['d', 'f', 'a'], Bb: ['bb', 'd', 'f'], C: ['c', 'e', 'g'], Gm: ['g', 'bb', 'd'], A: ['a', 'c#', 'e'], F: ['f', 'a', 'c'], D: ['d', 'f#', 'a'],
}
//          A — 물음과 대답                         B — 노래하는 코러스
const CHORDS = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Gm', 'A']
// 15 마디는 반 마디씩 Gm · A 이다
const HALF = { 14: ['Gm', 'A'] }
const chordAt = (bar, cell) => (HALF[bar] ? HALF[bar][cell < 8 ? 0 : 1] : CHORDS[bar])
/** 그 화음의 음 가운데 octave 옥타브(과학적 표기)의 것 — degree 0 근음, 1 3도, 2 5도 */
const tone = (chord, degree, octave) => {
  const pc = CHORD[chord][degree]
  const base = n(`${pc}${octave}`)
  // 근음보다 아래로 내려간 3도·5도는 한 옥타브 올린다 (화음이 근음 위에 쌓인다)
  const rootPc = n(`${CHORD[chord][0]}${octave}`)
  return degree && base < rootPc ? base + 12 : base
}

// 주선율 — 마디마다 [음, 16분 칸 수]. 첫째·셋째 박의 머리에는 그 자리 화음의 음 (바이올린 합주 — A3…F5, 호른은 한 옥타브 아래)
const MELODY = [
  [['a3', 4], ['d4', 4], ['f4', 4], ['e4', 2], ['d4', 2]],
  [['a4', 8], ['f4', 4], ['e4', 4]],
  [['d4', 4], ['f4', 4], ['bb4', 6], ['a4', 2]],
  [['g4', 8], ['e4', 4], ['c4', 4]],
  [['a3', 4], ['d4', 4], ['f4', 4], ['a4', 4]],
  [['d5', 8], ['a4', 4], ['f4', 4]],
  [['g4', 6], ['a4', 2], ['bb4', 4], ['d5', 4]],
  [['c#5', 8], ['e4', 4], ['a4', 4]],
  [['f4', 8], ['d4', 8]],
  [['c5', 8], ['a4', 4], ['f4', 4]],
  [['e4', 4], ['g4', 4], ['c5', 8]],
  [['a4', 8], ['f4', 4], ['d4', 4]],
  [['bb4', 8], ['f4', 8]],
  [['a4', 6], ['c5', 2], ['f5', 8]],
  [['g4', 4], ['bb4', 4], ['a4', 4], ['c#5', 4]],
  [['e5', 8], ['c#5', 4], ['a4', 4]],
]

// 승리 뒤 — 여덟 마디의 잔잔한 하프와 현악 (북 없이). 화음과 바이올린의 긴 음
const OUTRO = [['Dm', 'f4'], ['Bb', 'd4'], ['F', 'c5'], ['C', 'e4'], ['Dm', 'a4'], ['Gm', 'bb4'], ['A', 'c#5'], ['D', 'd5']]

// 보스의 마무리 다섯 발 — 발마다 화음이 하나씩 오르고 악기가 쌓인다: Dm → Bb → C → A(딸림) → D 장조(피카르디 3도 — 승리)
const FINISHERS = ['Dm', 'Bb', 'C', 'A', 'D']

/** 팀파니의 음 — 북 넷의 근음(F#1…F#2, MIDI 30…42) 둘레 — A2 보다 높으면 한 옥타브 내린다 */
const timpani = (chord) => fit('timp_hit', tone(chord, 0, 2))

/** 칸 16 개의 음높이 줄 — notes: [{ at, len, note, vel }] (len 은 칸 수, 마디를 넘지 않는다) */
function line(notes) {
  const cells = Array(CELLS).fill('.')
  for (const { at, len, note, vel } of notes) {
    cells[at] = `${name(note)}${vel}`
    for (let k = 1; k < len && at + k < CELLS; k++) cells[at + k] = '-'
  }
  return cells.join(' ')
}
/** 타악 줄 — 칸마다 X x o . */
const hits = (text) => text.replaceAll(' ', '')

const patterns = []
const pattern = (id, rows) => patterns.push(`pattern ${id}\n${rows.filter(Boolean).map(([inst, row]) => `  ${inst.padEnd(3)} ${row}`).join('\n')}\nend`)
const layers = {}
const layer = (name, ids) => (layers[name] = ids)

// ── 맥박 — 박마다 킥, 8분마다 하이햇 (반박이 더 세다) ──
pattern('pulse_a', [['K', hits('X... x... X... x...')], ['H', hits('o.x. o.x. o.x. o.x.')]])
pattern('pulse_b', [['K', hits('X... x... X... x..o')], ['H', hits('o.x. o.x. o.x. o.xo')]])
layer('pulse', ['pulse_a', 'pulse_b'])

const bars = [...Array(16).keys()]
const perBar = (prefix, build) => bars.map((bar) => (pattern(`${prefix}_${bar + 1}`, build(bar)), `${prefix}_${bar + 1}`))

// ── calm — 첫 전투 앞: 첼로·비올라의 여린 긴 음, 하프의 8분 분산화음, 구간 끝의 팀파니 롤 ──
layer('calm', perBar('calm', (bar) => {
  const chord = CHORDS[bar]
  const arp = [tone(chord, 0, 3), tone(chord, 2, 3), tone(chord, 0, 4), tone(chord, 1, 4), tone(chord, 2, 4), tone(chord, 1, 4), tone(chord, 0, 4), tone(chord, 2, 3)]
  return [
    ['Cp', line([{ at: 0, len: 15, note: tone(chord, 0, 2), vel: 'o' }])],
    ['Vp', line([{ at: 0, len: 15, note: tone(chord, 1, 3), vel: 'o' }])],
    ['Vp', line([{ at: 0, len: 15, note: tone(chord, 2, 3), vel: 'o' }])],
    ['Hp', line(arp.map((note, i) => ({ at: i * 2, len: 2, note, vel: i % 4 ? 'o' : 'x' })))],
    bar % 8 === 7 ? ['R', hits('.... .... o... ....')] : null,
  ]
}))

// ── roam — 첫 전투부터 (방 사이에서도): 콘트라베이스 스피카토의 8분 오스티나토, 2·4 박의 사이드 스틱, 셰이커 ──
layer('roam', perBar('roam', (bar) => {
  const chord = CHORDS[bar], low = tone(chord, 0, 1) < n('e1') ? tone(chord, 0, 2) : tone(chord, 0, 1)
  const fifth = tone(chord, 2, 2) - (tone(chord, 2, 2) - low > 12 ? 12 : 0)
  const figure = [low, low, low + 12, low, fifth, low, low + 12, fifth]
  return [
    ['B', line(figure.map((note, i) => ({ at: i * 2, len: 2, note, vel: i % 4 === 0 ? 'X' : 'x' })))],
    ['X', hits('.... x... .... x...')],
    ['q', hits('o.o. o.o. o.o. o.oo')],
  ]
}))

// ── combat — 방에 적이 있는 동안: 반박마다 스네어(분당 180 의 백비트), 첼로 스피카토의 8분, 비올라 스피카토의 16분 오스티나토,
//    팀파니의 근음(첫째·셋째 박), 트롬본의 스타카토(첫 박), 구간의 머리에 크래시, 구간 끝의 탐 필인 ──
layer('combat', perBar('fight', (bar) => {
  const at = (cell) => chordAt(bar, cell)
  const cello = Array.from({ length: 8 }, (_, i) => ({ at: i * 2, len: 2, note: tone(at(i * 2), i % 2 ? 2 : 0, 2), vel: i % 4 === 0 ? 'X' : 'x' }))
  const viola = Array.from({ length: 16 }, (_, i) => ({ at: i, len: 1, note: tone(at(i), [2, 1, 0, 1][i % 4], i % 8 < 4 ? 4 : 3), vel: i % 4 === 0 ? 'x' : 'o' }))
  const fill = bar % 8 === 7
  return [
    ['S', hits(fill ? '..X. ..X. ..X. ....' : '..X. ..X. ..X. ..X.')],
    fill ? ['T', hits('.... .... .... XxX.')] : null,
    fill ? ['F', hits('.... .... .... ...X')] : null,
    bar % 8 === 0 ? ['C', hits('X... .... .... ....')] : null,
    ['Cs', line(cello)],
    ['Va', line(viola)],
    ['P', line([{ at: 0, len: 8, note: timpani(at(0)), vel: 'X' }, { at: 8, len: 8, note: timpani(at(8)), vel: 'x' }])],
    ['Ts', line([{ at: 0, len: 2, note: fit('tbn_stac', tone(at(0), 0, 3)), vel: 'X' }])],
    ['Ts', line([{ at: 0, len: 2, note: fit('tbn_stac', tone(at(0), 2, 3)), vel: 'x' }])],
  ]
}))

// ── lead — 전투 중의 주선율: 바이올린 합주와 한 옥타브 아래의 호른 ──
const melody = (bar, shift = 0, vel = 'x') => {
  let at = 0
  return MELODY[bar].map(([text, len], i) => {
    const note = { at, len, note: n(text) + shift, vel: i === 0 ? (vel === 'x' ? 'X' : vel) : vel }
    at += len
    return note
  })
}
// 호른은 E4…Bb4 의 녹음이 없다 — 그 음은 한 옥타브 더 아래에서 부른다 (바이올린의 두 옥타브 아래)
const horn = (notes) => notes.map((note) => ({ ...note, note: fit('horn_sus', note.note) }))
layer('lead', perBar('lead', (bar) => [['Vl', line(melody(bar))], ['Hn', line(horn(melody(bar, -12)))]]))

// ── hum — 전투방을 비운 뒤 이동 중: 선율의 뼈대를 호른이 여리게 (반 마디에 한 음) ──
layer('hum', perBar('hum', (bar) => {
  const skeleton = melody(bar, -12, 'o').filter((note) => note.at === 0 || note.at === 8).map((note) => ({ ...note, len: 7 }))
  return [['Hn', line(horn(skeleton))]]
}))

// ── x2 — 배수 2 부터: 바이올린의 높은 긴 음(3도·5도), 트롬본의 낮은 긴 음(근음·5도), 반박의 탬버린 ──
layer('x2', perBar('thick', (bar) => {
  const chord = CHORDS[bar]
  return [
    ['Vh', line([{ at: 0, len: 15, note: tone(chord, 1, 4), vel: 'o' }])],
    ['Vh', line([{ at: 0, len: 15, note: tone(chord, 2, 4), vel: 'o' }])],
    ['Tb', line([{ at: 0, len: 15, note: tone(chord, 0, 2), vel: 'x' }])],
    ['Tb', line([{ at: 0, len: 15, note: tone(chord, 2, 2), vel: 'o' }])],
    ['t', hits('..x. ..x. ..x. ..x.')],
  ]
}))

// ── x3 — 배수 3 부터 (전투 중): 호른 스타카토의 3-3-2 당김, 첫째·셋째 박의 큰북, 네 마디 끝의 팀파니 롤 ──
layer('x3', perBar('surge', (bar) => {
  const at = (cell) => chordAt(bar, cell)
  const stab = (cell, degree, vel) => ({ at: cell, len: 2, note: fit('horn_stac', tone(at(cell), degree, 3)), vel })
  return [
    ['Hs', line([stab(0, 0, 'X'), stab(3, 0, 'x'), stab(6, 0, 'x'), stab(8, 0, 'X'), stab(11, 0, 'x'), stab(14, 0, 'x')])],
    ['Hs', line([stab(0, 1, 'X'), stab(3, 1, 'x'), stab(6, 1, 'x'), stab(8, 1, 'X'), stab(11, 1, 'x'), stab(14, 1, 'x')])],
    ['G', hits('X... .... x... ....')],
    bar % 4 === 3 ? ['R', hits('.... .... x... ....')] : null,
  ]
}))

// ── x4 — 배수 4 (전투 중): 선율의 한 옥타브 위를 바이올린이 더 얹고 튜바가 근음을 받친다, 구간 머리의 오케스트라 크래시, 구간 끝의 심벌 스웰 ──
layer('x4', perBar('glory', (bar) => [
  ['Vh', line(melody(bar, 12, 'x'))],
  ['Tu', line([{ at: 0, len: 15, note: fit('tuba_sus', tone(CHORDS[bar], 0, 1)), vel: 'x' }])],
  bar % 8 === 0 ? ['Oc', hits('X... .... .... ....')] : null,
  bar % 8 === 6 ? ['Sw', hits('.... .... .... x...')] : null,
]))

// ── outro — 승리 뒤 (북 없이): 하프의 4분 분산화음, 첼로·비올라의 긴 음, 바이올린의 긴 노래 ──
layer('outro', OUTRO.map(([chord, sing], bar) => {
  const arp = [tone(chord, 0, 3), tone(chord, 2, 3), tone(chord, 1, 4), tone(chord, 2, 4)]
  pattern(`outro_${bar + 1}`, [
    ['Hp', line(arp.map((note, i) => ({ at: i * 4, len: 4, note, vel: i ? 'o' : 'x' })))],
    ['Cp', line([{ at: 0, len: 15, note: tone(chord, 0, 2), vel: 'o' }])],
    ['Vp', line([{ at: 0, len: 15, note: tone(chord, 1, 3), vel: 'o' }])],
    ['Vl', line([{ at: 0, len: 15, note: n(sing), vel: 'o' }])],
  ])
  return `outro_${bar + 1}`
}))

// ── fin1…fin5 — 보스의 마무리 다섯 발 (한 마디의 첫 칸에 화음 전체). 발마다 악기가 쌓인다 ──
FINISHERS.forEach((chord, i) => {
  const step = i + 1
  const PREFIX = { Tu: 'tuba_sus', Tb: 'tbn_sus', Hn: 'horn_sus', Cp: 'cello_sus', Vp: 'viola_sus', Vl: 'vln_sus', Vh: 'vln_sus', P: 'timp_hit' }
  const whole = (inst, note, vel = 'X') => [inst, line([{ at: 0, len: 16, note: fit(PREFIX[inst], note), vel }])]
  pattern(`finisher_${step}`, [
    whole('Tu', tone(chord, 0, 2)),
    whole('Tb', tone(chord, 0, 3)),
    whole('Tb', tone(chord, 2, 3)),
    whole('Hn', tone(chord, 1, 3)),
    whole('Hn', tone(chord, 2, 3)),
    whole('Cp', tone(chord, 0, 3)),
    whole('P', timpani(chord)),
    ['G', hits('X... .... .... ....')],
    step >= 2 ? whole('Vp', tone(chord, 1, 4), 'x') : null,
    step >= 2 ? whole('Vl', tone(chord, 2, 4), 'x') : null,
    step >= 3 ? whole('Vl', tone(chord, 0, 5), 'x') : null,
    step >= 3 ? ['Oc', hits('x... .... .... ....')] : null,
    step >= 4 ? ['R', hits('x... .... .... ....')] : null,
    step >= 4 ? whole('Vh', tone(chord, 1, 5), 'x') : null,
    step === 5 ? ['Gg', hits('X... .... .... ....')] : null,
    step === 5 ? ['Oc', hits('X... .... .... ....')] : null,
    step === 5 ? whole('Vh', tone(chord, 0, 6) > n('f6') ? tone(chord, 0, 5) : tone(chord, 0, 6)) : null,
  ])
  layer(`fin${step}`, [`finisher_${step}`])
})

const INSTRUMENTS = `
# ── 드럼 세트 (Big Rusty Drums) — 맥박과 전투의 백비트 ──
inst K kick_a kick_b kick_c kick_d gain=-1.5
inst H hat_closed_a hat_closed_b pan=0.3 gain=-3
inst S snare_crack_a snare_crack_b snare_crack_c snare_crack_d gain=1
inst X stick_a stick_b pan=-0.2 gain=-7
inst T tom_hi_a tom_hi_b pan=-0.4 gain=-5
inst F tom_low_a tom_low_b pan=0.5 gain=-5
inst C crash crash_b pan=-0.3 gain=-6
inst q shaker_down shaker_up pan=0.55 gain=-4
inst t tamb_a tamb_b pan=-0.5 gain=-4
# ── 관현악 타악 (VSCO 2 CE) — 팀파니는 음높이가 있다 (근음은 samples.txt), 롤은 그 북의 소리 그대로 ──
inst P timp_hit_1 timp_hit_2 timp_hit_3 timp_hit_5 pan=-0.1 gain=-3
inst R timp_roll_3 gain=-6
inst G gran_cassa gran_cassa_b gain=-4
inst Oc orch_crash pan=0.2 gain=-6
inst Sw cym_swell pan=0.25 gain=-8
inst Gg gong gain=-4
# ── 현악 (VSCO 2 CE) — 스피카토의 오스티나토, 긴 음 (패드·주선율) ──
inst B ${samplesOf('cb_spic')} pan=-0.1 gain=-6
inst Cs ${samplesOf('cello_spic')} pan=-0.2 gain=-8
inst Va ${samplesOf('viola_spic')} pan=0.25 gain=-14
inst Cp ${samplesOf('cello_sus')} pan=-0.25 gain=-13
inst Vp ${samplesOf('viola_sus')} pan=0.2 gain=-16
inst Vl ${samplesOf('vln_sus')} pan=-0.35 gain=-6
inst Vh ${samplesOf('vln_sus')} pan=0.4 gain=-12
inst Hp ${samplesOf('harp')} pan=0.3 gain=-11
# ── 금관 (VSCO 2 CE) — 호른(선율의 아래 옥타브, 스타카토), 트롬본, 튜바 ──
inst Hn ${samplesOf('horn_sus')} pan=0.15 gain=-8
inst Hs ${samplesOf('horn_stac')} pan=0.1 gain=-9
inst Tb ${samplesOf('tbn_sus')} pan=-0.15 gain=-11
inst Ts ${samplesOf('tbn_stac')} pan=-0.1 gain=-8
inst Tu ${samplesOf('tuba_sus')} gain=-8
`


const header = `# 게임 중의 음악 — 이 파일은 game/tools/audio/compose-score.mjs 가 적는다 (손으로 고치지 않는다: 그 도구의 표와 규칙을 고쳐 다시 돌린다).
# 형식은 game/tools/songc.mjs 머리말. 박자는 게임의 리듬 규칙(domain/rhythm.hpp, 90 BPM)과 같아야 한다. 16분 칸 하나가 10 틱이다.
#
# 곡: D 단조의 시네마틱 오케스트라, 열여섯 마디 고리 (사용자 결정 2026-10-26). 화성 진행:
#   A (1–8)   Dm | Dm | Bb | C | Dm | Dm | Gm | A          B (9–16)   Bb | F | C | Dm | Bb | F | Gm·A | A
# 주선율(lead)은 바이올린 합주의 긴 음과 한 옥타브 아래의 호른이다. 첫째·셋째 박의 머리에는 그 자리 화음의 음.
# 층 (게임이 이름으로 켜고 끈다 — presentation/sound.hpp 의 MusicLayer):
#   pulse  늘                          킥(박)과 하이햇(8분) — 박자의 메트로놈
#   calm   첫 전투 앞까지              첼로·비올라의 여린 긴 음, 하프의 분산화음, 구간 끝의 팀파니 롤
#   roam   첫 전투부터                 콘트라베이스 스피카토의 8분 오스티나토, 2·4 박의 사이드 스틱, 셰이커
#   combat 방에 적이 있는 동안         반박의 스네어, 첼로 8분·비올라 16분 스피카토, 팀파니, 트롬본 스타카토, 크래시, 필인
#   lead   방에 적이 있는 동안         주선율 — 바이올린 합주와 호른
#   hum    전투방을 비운 뒤 이동 중    선율의 뼈대 — 호른 (반 마디에 한 음)
#   x2     배수 2 부터                 바이올린의 높은 긴 음, 트롬본의 낮은 긴 음, 탬버린
#   x3     배수 3 부터, 전투 중        호른 스타카토의 3-3-2, 큰북, 팀파니 롤
#   x4     배수 4, 전투 중             선율의 한 옥타브 위 바이올린, 튜바의 근음, 오케스트라 크래시, 심벌 스웰
#   outro  승리 뒤                     하프·첼로·비올라·바이올린 (북 없이, 여덟 마디)
#   fin1…fin5  켜지 않는다              보스의 마무리 다섯 발 — 발마다 그 층의 화음을 한꺼번에 (Dm → Bb → C → A → D 장조)
tempo 90
meter 4
grid 16
`
const text = `${header}${INSTRUMENTS}\n${patterns.join('\n\n')}\n\n${Object.entries(layers).map(([name, ids]) => `layer ${name.padEnd(6)} ${ids.join(' ')}`).join('\n')}\n`
writeFileSync(join(root, 'gameplay/content/audio/music/pulse.song.txt'), text)
console.log('SCORE', Object.keys(layers).length, 'layers,', patterns.length, 'patterns')
