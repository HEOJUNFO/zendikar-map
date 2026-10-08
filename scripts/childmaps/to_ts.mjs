// 자식 지도 원본(art/<id>.js)을 앱의 그림 파일 src/map/childmaps/<id>.ts 로 옮긴다: node scripts/childmaps/to_ts.mjs
// 지도마다 파일이 따로라 앱은 연 지도의 그림만 불러온다 (App.tsx 의 import.meta.glob).
// 원본은 앱에서 그대로 보며 고친다: pnpm dev 뒤 http://localhost:5173/?phase=1&child=<id>&childsrc=1 (원본을 바로 읽는다)
// 원본은 그리기 도구 kit.js(KIT.house·KIT.cliff…)를 쓸 수 있다 — 지침은 STYLE.md
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { locations } from '../../src/data/locations.ts'
import { CHILD_MAPS } from '../../src/data/childMaps.ts'
import { PHASE1_CARDS } from '../../src/data/phase1.ts'
const here = path.dirname(new URL(import.meta.url).pathname)
const dir = path.join(here, 'art')
// 그리기 도구(kit.js)를 먼저 실행한 같은 자리에서 원본을 실행한다
const kit = fs.readFileSync(path.join(here, 'kit.js'), 'utf8')
// --check [id …] — 원본을 검사만 하고 아무것도 쓰지 않는다 (id 를 주면 그 그림만)
const checkAt = process.argv.indexOf('--check')
const checkOnly = checkAt >= 0
const only = checkOnly ? process.argv.slice(checkAt + 1) : []
const CHILDMAPS = []
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js') && (!only.length || only.includes(f.replace(/\.js$/, '')))).sort()) {
  const ctx = vm.createContext({ CHILDMAPS })
  vm.runInContext(kit, ctx)
  const before = CHILDMAPS.length
  vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), ctx)
  if (CHILDMAPS.length !== before + 1) throw new Error(`${file}: CHILDMAPS.push 를 꼭 한 번 해야 한다 (${CHILDMAPS.length - before}번)`)
  const id = file.replace(/\.js$/, '')
  if (CHILDMAPS.at(-1).id !== id) throw new Error(`${file}: id 가 파일 이름과 다르다`)
  if (!CHILD_MAPS.some((m) => m.id === id)) throw new Error(`${file}: childMaps.ts 의 CHILD_MAPS 에 없는 지역 상세다`)
}
// 지역 상세 목록(childMaps.ts)과 그림이 맞아야 한다 — 빠진 자리의 작은 대상은 어디에도 그려지지 않는다
for (const m of CHILD_MAPS.filter((c) => !only.length || only.includes(c.id))) {
  const art = CHILDMAPS.find((a) => a.id === m.id)
  if (!art) throw new Error(`자식 지도 '${m.id}' 그림(art/${m.id}.js)이 없다`)
  const [w, h] = art.size
  const aspect = (m.bounds.x1 - m.bounds.x0) / (m.bounds.y1 - m.bounds.y0)
  if (Math.abs(w / h - aspect) > 0.01) throw new Error(`${m.id}: size ${w}×${h} 가 범위의 가로세로 비율(${aspect.toFixed(3)})과 다르다`)
  for (const c of PHASE1_CARDS.filter((p) => p.childMap === m.id)) {
    const s = art.subjects[c.id]
    if (!s) throw new Error(`${m.id}: '${c.id}' 의 자리(subjects)가 없다`)
    if (s.at[0] < 0 || s.at[0] > w || s.at[1] < 0 || s.at[1] > h) throw new Error(`${m.id}: '${c.id}' 의 자리가 지도 밖이다`)
  }
  for (const id of Object.keys(art.subjects)) {
    if (!PHASE1_CARDS.some((p) => p.id === id && p.childMap === m.id)) throw new Error(`${m.id}: subjects 의 '${id}' 는 이 자식 지도의 카드가 아니다`)
  }
  // 세계 지도는 카드의 at·size·flip 으로 그린다 — 그림의 subjects 를 세계 지도 단위로 옮긴 값과 같아야 한다 (소수 한 자리)
  const s = w / (m.bounds.x1 - m.bounds.x0)
  const r1 = (v) => Math.round(v * 10) / 10
  for (const [id, spot] of Object.entries(art.subjects)) {
    const card = PHASE1_CARDS.find((p) => p.id === id)
    const at = [r1(m.bounds.x0 + spot.at[0] / s), r1(m.bounds.y0 + spot.at[1] / s)]
    const size = r1(spot.size / s)
    const off = Math.abs(card.at[0] - at[0]) > 0.15 || Math.abs(card.at[1] - at[1]) > 0.15 || Math.abs(card.size - size) > 0.15 || Boolean(card.flip) !== Boolean(spot.flip)
    if (off) throw new Error(`${m.id}: '${id}' — phase1.ts 를 그림에 맞춘다: at: [${at.join(', ')}], size: ${size}${spot.flip ? ', flip: true' : ' (flip 없음)'}`)
  }
  if (art.focus && (art.focus[0] < 0 || art.focus[0] > w || art.focus[1] < 0 || art.focus[1] > h)) throw new Error(`${m.id}: focus 가 지도 밖이다`)
  // 이름 쪽(markAnchors)은 범위 안의 장소·카드 표시에만
  const inside = ([x, y]) => x >= m.bounds.x0 && x <= m.bounds.x1 && y >= m.bounds.y0 && y <= m.bounds.y1
  const marks = new Set([
    ...LAND_CARDS.filter((c) => c.at && inside(c.at)).map((c) => `card:${c.id}`),
    ...locations.filter((l) => l.placement !== 'unplaced' && l.kind !== 'region' && l.kind !== 'water' && inside(l.position)).map((l) => l.id),
  ])
  for (const key of Object.keys(art.markAnchors ?? {})) if (!marks.has(key)) throw new Error(`${m.id}: markAnchors 의 '${key}' 는 이 지도 범위의 표시가 아니다`)
}
if (checkOnly) {
  console.log(`검사만 했다: ${CHILDMAPS.map((m) => m.id).join(', ')}`)
  process.exit(0)
}
const num = (s) => s.replace(/-?\d*\.\d+|-?\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))
const pt = (p) => `[${p.map((v) => Math.round(v * 10) / 10).join(', ')}]`
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`
const outDir = path.join(here, '../../src/map/childmaps')
fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.ts') && !CHILDMAPS.some((m) => `${m.id}.ts` === f)) fs.rmSync(path.join(outDir, f))
// 그림 크기 목록 — 앱은 그림을 불러오기 전에도 지역 상세가 나올 배율을 안다 (그림 크기 ÷ 범위 폭)
fs.writeFileSync(
  path.join(here, '../../src/map/childMapSizes.ts'),
  [
    '// 지역 상세 그림 크기 — 생성물. scripts/childmaps/to_ts.mjs 가 만든다.',
    'export const CHILD_MAP_SIZES: Readonly<Record<string, readonly [number, number]>> = {',
    ...CHILDMAPS.map((m) => `  ${q(m.id)}: [${m.size.join(', ')}],`),
    '}',
    '',
  ].join('\n'),
)
for (const m of CHILDMAPS) {
  const out = [
    `// 자식 지도 '${m.id}' 그림 — 생성물. scripts/childmaps/art/${m.id}.js 를 고친 뒤 \`node scripts/childmaps/to_ts.mjs\` 로 다시 만든다.`,
    "import type { ChildMapArt } from '../childMapArt'",
    '',
    'const art: ChildMapArt = {',
  ]
  out.push(`    id: ${q(m.id)},`, `    size: [${m.size.join(', ')}],`, `    glyphScale: ${m.glyphScale},`, '    terrain: [')
  for (const t of m.terrain) out.push(`      { kind: ${q(t.kind)}, points: [${t.points.map(pt).join(', ')}]${t.density ? `, density: ${t.density}` : ''} },`)
  out.push('    ],', '    parts: [')
  for (const p of m.parts) out.push(`      { cls: ${q(p.cls)}, d: ${q(num(p.d.replace(/\s+/g, ' ').trim()))} },`)
  out.push('    ],', '    labels: [')
  for (const l of m.labels)
    out.push(`      { text: ${q(l.text)}${l.textKo ? `, textKo: ${q(l.textKo)}` : ''}, at: ${pt(l.at)}, size: ${l.size}, kind: ${q(l.kind)}${l.rotate ? `, rotate: ${l.rotate}` : ''} },`)
  out.push('    ],', '    subjects: {')
  for (const [id, s] of Object.entries(m.subjects)) out.push(`      ${q(id)}: { at: ${pt(s.at)}, size: ${s.size}${s.flip ? ', flip: true' : ''} },`)
  out.push('    },')
  if (m.focus) out.push(`    focus: ${pt(m.focus)},`)
  if (m.ripples === false) out.push('    ripples: false,')
  if (m.markAnchors && Object.keys(m.markAnchors).length) {
    out.push('    markAnchors: {')
    for (const [id, a] of Object.entries(m.markAnchors)) out.push(`      ${q(id)}: ${q(a)},`)
    out.push('    },')
  }
  out.push('}', '', 'export default art', '')
  fs.writeFileSync(path.join(outDir, `${m.id}.ts`), out.join('\n').replace(/^ {2}/gm, ''))
  console.log(`src/map/childmaps/${m.id}.ts`)
}
