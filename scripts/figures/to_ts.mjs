// 페이즈 그림 원본(art/<카드id>.js)을 앱 그림으로 옮긴다: node scripts/figures/to_ts.mjs > src/map/figures.ts
// (stdout 은 모양·불러오기, 그림은 묶음마다 src/map/figures/<world…|지역 상세 id>.ts 에, 그림마다의 상자·묶음은 src/map/figures/frames.json 에 직접 쓴다)
// 원본은 작업대(index.html)에서 지도 배율별로 보며 고친다 — 지침은 STYLE.md
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { PHASE1_CARDS } from '../../src/data/phase1.ts'
import { PHASE2_CARDS } from '../../src/data/phase2.ts'
import { PHASE3_CARDS } from '../../src/data/phase3.ts'
import { PHASE4_CARDS } from '../../src/data/phase4.ts'
import { PHASE5_CARDS } from '../../src/data/phase5.ts'
import { SAGAS, levelOf, slotOf } from '../../src/data/sagas.ts'
import { compactPath } from './compact-path.mjs'
// 페이즈마다의 카드 — 세계 지도 그림도 지역 상세에 사는 작은 대상도 페이즈마다 따로 싣는다 (groupOf: world-2, <지역 상세 id>-2 …)
const BY_PHASE = [PHASE1_CARDS, PHASE2_CARDS, PHASE3_CARDS, PHASE4_CARDS, PHASE5_CARDS]
const CARDS = BY_PHASE.flat()
const PHASE_OF = new Map(BY_PHASE.flatMap((cards, i) => cards.map((c) => [c.id, i + 1])))
// until(그 사가의 이 페이즈까지만 그린다)은 그 사가 안의 페이즈 번호 — 카드가 오르는 페이즈부터 그 사가의 마지막 페이즈 앞까지 (src/data/phase.ts 의 check 와 같다).
// 그림 묶음은 카드가 처음 오르는 페이즈로 정하니 until 과 상관없다
for (const c of CARDS) {
  if (c.until === undefined) continue
  const slot = slotOf(PHASE_OF.get(c.id))
  if (!Number.isInteger(c.until) || c.until < slot.local || c.until >= SAGAS[slot.saga - 1].phases)
    throw new Error(`페이즈 카드 '${c.id}' 의 until ${c.until} — 이 카드가 오르는 페이즈(${slot.local})부터 그 사가의 마지막 페이즈 앞까지의 페이즈 번호를 단다`)
}
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'art')
const FIGURES = []
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  vm.runInNewContext(fs.readFileSync(path.join(dir, file), 'utf8'), { FIGURES })
  if (FIGURES.at(-1).id !== file.replace(/\.js$/, '')) throw new Error(`${file}: id 가 파일 이름(카드 id)과 다르다`)
}
// 그림이 없는 카드는 지도 어디에도 그려지지 않는다 — 장소와 하나인 카드(place)만 그림 없이 그 장소로 나온다
for (const c of CARDS) {
  const has = FIGURES.some((f) => f.id === c.id)
  if (c.place && has) throw new Error(`페이즈 카드 '${c.id}' 는 장소와 하나라 그림(art/${c.id}.js)을 두지 않는다`)
  if (!c.place && !has) throw new Error(`페이즈 카드 '${c.id}' 그림(art/${c.id}.js)이 없다`)
}
// 카드가 없는 그림은 어느 묶음에도 넣지 않는다 — 묶음을 모르면 페이즈1 묶음에 섞여 들어간다
for (const f of FIGURES) if (!CARDS.some((c) => c.id === f.id)) throw new Error(`art/${f.id}.js 에 맞는 페이즈 카드가 phase1.ts~phase5.ts 에 없다`)
// 그림은 묶음으로 나눠 싣는다 (src/map/figures/<묶음>.ts) — 지도는 지금 화면(그릴 범위)에 그려질 그림의 묶음을 먼저, 그것이 다 오면 한 번 더
// 확대했을 때 그려질 묶음을 미리, 그것도 다 오면 남은 세계 지도 묶음을 모두(가까운 칸부터) 받는다(ZendikarMap.tsx). 지역 상세에 사는 작은 대상(<지역 상세 id>)은 그 지역 상세가 나올 때.
// 세계 지도 그림은 화면에서 가장 긴 변이 FIGURE_MIN_PX 가 될 때부터 그려지니 크기 띠마다 그려지기 시작하는 배율이 다르다 — 띠마다 묶어
// 개관에 그려지는 큰 그림이 작은 묶음으로 먼저 오게 하고, 더 가까이에서만 그려지는 작은 그림(world-near)은 자리 칸(NEAR_CELL)마다 나눠 본 곳의 것만 받는다.
// 이름 자리는 그림의 상자(frames.json → 지도 조각의 frame)로 정하니, 묶음이 어떤 차례로 와도 이름이 움직이지 않는다.
// 기준은 ZendikarMap.tsx 의 FIGURE_MIN_PX(14px) — 바꾸면 여기도 고친다.
// 페이즈2부터의 그림은 world-2·world-mid-2·world-near-x1y2-2·<지역 상세 id>-2 … 에 따로 — 앞 페이즈만 켠 사람은 받지 않는다
const FIGURE_MIN_PX = 14
/** 세계 지도 그림의 크기 띠 — [묶음, 이 크기(지도 단위) 이상] */
const BANDS = [
  // 0.3px/단위(tier 1 의 시작 — 휴대폰의 처음 화면)부터 그려진다: 어느 화면에서든 개관에 나와, 페이즈를 켜면 카드 데이터와 함께 받기 시작한다
  ['world', FIGURE_MIN_PX / 0.3],
  // 0.5px/단위부터 — 데스크톱의 개관(1440×900 이 0.53)
  ['world-mid', FIGURE_MIN_PX / 0.5],
  // tier 1 의 끝(0.95)까지 — 개관을 조금만 확대해도
  ['world-small', FIGURE_MIN_PX / 0.95],
]
/** 작은 그림(world-near)을 나누는 자리 칸의 한 변 (지도 단위) — 묶음 이름은 world-near-x<칸>y<칸> */
const NEAR_CELL = 400
const groupOf = (id) => {
  const card = CARDS.find((c) => c.id === id)
  const p = PHASE_OF.get(id) ?? 1
  const g =
    card.childMap ??
    BANDS.find(([, min]) => card.size >= min)?.[0] ??
    `world-near-x${Math.floor(card.at[0] / NEAR_CELL)}y${Math.floor(card.at[1] / NEAR_CELL)}`
  return p > 1 ? `${g}-${p}` : g
}
const groups = new Map()
for (const f of FIGURES) {
  const g = groupOf(f.id)
  groups.set(g, [...(groups.get(g) ?? []), f])
}
const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), '../../src/map/figures')
fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.ts') && !groups.has(f.replace(/\.ts$/, ''))) fs.rmSync(path.join(outDir, f))
for (const [g, figs] of groups) {
  const body = [
    `// 페이즈 그림 묶음 '${g}' — 생성물. scripts/figures/art/*.js 를 고친 뒤 \`node scripts/figures/to_ts.mjs > src/map/figures.ts\` 로 다시 만든다.`,
    "import type { FigureArt } from '../figures'",
    '',
    'const art: Record<string, FigureArt> = {',
  ]
  for (const f of figs) {
    body.push(`  '${f.id}': {`, `    viewBox: [${f.viewBox.join(', ')}],`, `    anchor: [${f.anchor.join(', ')}],`, '    parts: [')
    for (const p of f.parts) body.push(`      { cls: '${p.cls}', d: '${compactPath(p.d)}' },`)
    body.push('    ],', '  },')
  }
  body.push('}', '', 'export default art', '')
  fs.writeFileSync(path.join(outDir, `${g}.ts`), body.join('\n'))
}
// 그림마다의 상자와 묶음 — vite/phaseData.ts 의 플러그인이 페이즈 카드의 지도 조각(?map)에 frame·group 으로 붙인다.
// 지도는 이것으로 그림이 오기 전에 이름 자리를 정하고, 지금 화면에 필요한 묶음을 고른다
const frames = FIGURES.map((f) => `  ${JSON.stringify(f.id)}: ${JSON.stringify([groupOf(f.id), ...f.viewBox, ...f.anchor])}`)
fs.writeFileSync(path.join(outDir, 'frames.json'), `{\n${frames.join(',\n')}\n}\n`)
/** 페이즈마다 가장 큰 그림 묶음 (world, world-2 …) */
const lead = [...new Set(FIGURES.map((f) => groupOf(f.id)).filter((g) => /^world(-\d+)?$/.test(g)))].sort((a, b) => a.length - b.length || a.localeCompare(b))
// 카드를 그리는 마지막 페이즈(이어 센 번호) — until 이 있으면 그 사가의 그 페이즈, 없으면 그 사가의 마지막 페이즈
const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]))
const lastLevelOf = (id) => {
  const slot = slotOf(PHASE_OF.get(id))
  return levelOf(slot.saga, CARD_BY_ID.get(id).until ?? SAGAS[slot.saga - 1].phases)
}
// 묶음마다 그 안의 그림이 그려지는 마지막 페이즈 — 모든 그림이 until 로 끝난 페이즈부터는 그 묶음을 미리 받지 않는다
const leadLast = (g) => Math.max(...FIGURES.filter((f) => groupOf(f.id) === g).map((f) => lastLevelOf(f.id)))
const out = [
  '// 페이즈 그림 — 판타지 지도처럼 지도 위에 그려 넣는 대상(바다 괴물·천사·짐승·인물…).',
  '// 잉크 선과 양피지 채움으로 지도의 산·숲 기호와 같은 화풍을 쓰고, 지도 단위로 함께 확대·축소된다.',
  '// 카드 그림을 베끼지 않은 지도용 그림이다. 자리·크기는 src/data/phase1.ts~phase5.ts 에 있다.',
  '// 생성물 — scripts/figures/art/*.js 를 고친 뒤 `node scripts/figures/to_ts.mjs > src/map/figures.ts` 로 다시 만든다 (그림은 src/map/figures/<묶음>.ts 에 함께 쓴다).',
  "import { sagaLevels } from '../data/sagas'",
  "import type { Point } from './geometry'",
  '',
  "export type FigurePart = 'fill' | 'shade' | 'stone' | 'forest' | 'sea' | 'fire' | 'blood' | 'gold' | 'dark' | 'hatch' | 'ink' | 'ink-bold' | 'fire-ink' | 'sea-ink'",
  '',
  'export interface FigureArt {',
  '  /** 그림 자체의 좌표 상자 [x, y, 너비, 높이] */',
  '  viewBox: readonly [number, number, number, number]',
  '  /** 지도 위 자리에 놓이는 점 (발밑·몸 가운데) */',
  '  anchor: Point',
  '  /** 아래부터 차례로 그린다 — 채움, 해칭, 잉크 선 */',
  '  parts: readonly { cls: FigurePart; d: string }[]',
  '}',
  '',
  '/**',
  ' * 그림 묶음 — 세계 지도 그림은 크기 띠마다 world(개관 어디서나 그려지는 큰 그림)·world-mid·world-small, 더 가까이에서만 그려지는 작은 그림은',
  ' * 자리 칸마다 world-near-x<칸>y<칸>, 지역 상세에 사는 작은 대상은 지역 상세 id. 페이즈2부터의 그림은 world-2·world-near-x1y2-2·<지역 상세 id>-2 … 에 따로 싣는다.',
  ' * 그림마다의 묶음과 상자는 figures/frames.json — 페이즈 카드의 지도 조각(frame·group)에 붙어 온다',
  ' */',
  "const FILES = import.meta.glob<{ default: Record<string, FigureArt> }>('./figures/*.ts')",
  `export const FIGURE_GROUPS: readonly string[] = [${[...groups.keys()].map((g) => `'${g}'`).join(', ')}]`,
  '',
  '/** 페이즈마다 가장 큰 그림 묶음 (이어 센 페이즈 번호 → [묶음, 그 안의 그림이 그려지는 마지막 페이즈 — 모두 until 로 끝나면 그 뒤로는 받지 않는다]) */',
  `const LEAD_GROUPS: Readonly<Record<number, readonly [string, number]>> = { ${lead.map((g) => `${g === 'world' ? 1 : g.slice('world-'.length)}: ['${g}', ${leadLast(g)}]`).join(', ')} }`,
  '',
  '/** 페이즈 phase 의 가장 큰 그림 묶음 — 그 사가의 첫 페이즈부터 phase 까지(그 페이즈에 그릴 그림이 남은 것만). 어느 화면에서든 개관에 그려져, 페이즈를 켜면 카드 데이터와 함께 받기 시작한다 */',
  'export const leadGroups = (phase: number): string[] =>',
  '  sagaLevels(phase).flatMap((p) => {',
  '    const lead = LEAD_GROUPS[p]',
  '    return lead && phase <= lead[1] ? [lead[0]] : []',
  '  })',
  '',
  '/** 그림 묶음 하나를 불러온다 (카드 id → 그림) */',
  'export function loadFigureGroup(group: string): Promise<Record<string, FigureArt>> {',
  '  const file = FILES[`./figures/${group}.ts`]',
  "  return file ? file().then((m) => m.default) : Promise.reject(new Error(`페이즈 그림 묶음 '${group}' 이 없다`))",
  '}',
]
process.stdout.write(out.join('\n') + '\n')
