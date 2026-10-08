// 페이즈 그림 원본(art/<카드id>.js)을 앱 그림으로 옮긴다: node scripts/figures/to_ts.mjs > src/map/figures.ts
// (stdout 은 모양·불러오기, 그림은 묶음마다 src/map/figures/<world|지역 상세 id>.ts 에 직접 쓴다)
// 원본은 작업대(index.html)에서 지도 배율별로 보며 고친다 — 지침은 STYLE.md
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { PHASE1_CARDS } from '../../src/data/phase1.ts'
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'art')
const FIGURES = []
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  vm.runInNewContext(fs.readFileSync(path.join(dir, file), 'utf8'), { FIGURES })
  if (FIGURES.at(-1).id !== file.replace(/\.js$/, '')) throw new Error(`${file}: id 가 파일 이름(카드 id)과 다르다`)
}
// 그림이 없는 카드는 지도 어디에도 그려지지 않는다
for (const c of PHASE1_CARDS) if (!FIGURES.some((f) => f.id === c.id)) throw new Error(`phase1.ts 의 '${c.id}' 그림(art/${c.id}.js)이 없다`)
const num = (s) => s.replace(/-?\d*\.\d+|-?\d+/g, (n) => String(Math.round(Number(n) * 100) / 100))
// 그림은 묶음으로 나눠 싣는다 — 세계 지도 그림(world)은 페이즈를 켤 때, 지역 상세에 사는 작은 대상은 그 지역 상세가 나올 때 (src/map/figures/<묶음>.ts)
const groupOf = (id) => PHASE1_CARDS.find((c) => c.id === id)?.childMap ?? 'world'
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
    for (const p of f.parts) body.push(`      { cls: '${p.cls}', d: '${num(p.d.replace(/\s+/g, ' ').trim())}' },`)
    body.push('    ],', '  },')
  }
  body.push('}', '', 'export default art', '')
  fs.writeFileSync(path.join(outDir, `${g}.ts`), body.join('\n'))
}
const out = [
  '// 페이즈 그림 — 판타지 지도처럼 지도 위에 그려 넣는 대상(바다 괴물·천사·짐승·인물…).',
  '// 잉크 선과 양피지 채움으로 지도의 산·숲 기호와 같은 화풍을 쓰고, 지도 단위로 함께 확대·축소된다.',
  '// 카드 그림을 베끼지 않은 지도용 그림이다. 자리·크기는 src/data/phase1.ts 에 있다.',
  '// 생성물 — scripts/figures/art/*.js 를 고친 뒤 `node scripts/figures/to_ts.mjs > src/map/figures.ts` 로 다시 만든다 (그림은 src/map/figures/<묶음>.ts 에 함께 쓴다).',
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
  '/** 그림 묶음 — world(세계 지도 그림)와 지역 상세 id (그 지역 상세에 사는 작은 대상) */',
  "const FILES = import.meta.glob<{ default: Record<string, FigureArt> }>('./figures/*.ts')",
  `export const FIGURE_GROUPS: readonly string[] = [${[...groups.keys()].map((g) => `'${g}'`).join(', ')}]`,
  '',
  '/** 그림 묶음 하나를 불러온다 (카드 id → 그림) */',
  'export function loadFigureGroup(group: string): Promise<Record<string, FigureArt>> {',
  '  const file = FILES[`./figures/${group}.ts`]',
  "  return file ? file().then((m) => m.default) : Promise.reject(new Error(`페이즈 그림 묶음 '${group}' 이 없다`))",
  '}',
]
process.stdout.write(out.join('\n') + '\n')
