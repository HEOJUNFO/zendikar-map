// 자식 지도 원본(art/<id>.js)을 src/map/childMaps.ts 로 옮긴다: node scripts/childmaps/to_ts.mjs > src/map/childMaps.ts
// 원본은 앱에서 그대로 보며 고친다: pnpm dev 뒤 http://localhost:5173/?phase=1&child=<id>&childsrc=1 (원본을 바로 읽는다)
// 원본은 그리기 도구 kit.js(KIT.house·KIT.cliff…)를 쓸 수 있다 — 지침은 STYLE.md
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { PHASE1_CARDS, PHASE1_CHILD_MAPS } from '../../src/data/phase1.ts'
const here = path.dirname(new URL(import.meta.url).pathname)
const dir = path.join(here, 'art')
// 그리기 도구(kit.js)를 먼저 실행한 같은 자리에서 원본을 실행한다
const kit = fs.readFileSync(path.join(here, 'kit.js'), 'utf8')
const CHILDMAPS = []
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  const ctx = vm.createContext({ CHILDMAPS })
  vm.runInContext(kit, ctx)
  vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), ctx)
  if (CHILDMAPS.at(-1).id !== file.replace(/\.js$/, '')) throw new Error(`${file}: id 가 파일 이름과 다르다`)
}
// 자식 지도 목록(phase1.ts)과 그림이 맞아야 한다 — 빠진 자리의 작은 대상은 어디에도 그려지지 않는다
for (const m of PHASE1_CHILD_MAPS) {
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
}
const num = (s) => s.replace(/-?\d*\.\d+|-?\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))
const pt = (p) => `[${p.map((v) => Math.round(v * 10) / 10).join(', ')}]`
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const out = [
  '// 자식 지도 그림 — 생성물. scripts/childmaps/art/*.js 를 고친 뒤 `node scripts/childmaps/to_ts.mjs > src/map/childMaps.ts` 로 다시 만든다.',
  "import type { ChildMapArt } from './childMapArt'",
  '',
  'export const CHILD_MAP_ART: Record<string, ChildMapArt> = {',
]
for (const m of CHILDMAPS) {
  out.push(`  ${q(m.id)}: {`, `    id: ${q(m.id)},`, `    size: [${m.size.join(', ')}],`, `    glyphScale: ${m.glyphScale},`, '    terrain: [')
  for (const t of m.terrain) out.push(`      { kind: ${q(t.kind)}, points: [${t.points.map(pt).join(', ')}]${t.density ? `, density: ${t.density}` : ''} },`)
  out.push('    ],', '    parts: [')
  for (const p of m.parts) out.push(`      { cls: ${q(p.cls)}, d: ${q(num(p.d.replace(/\s+/g, ' ').trim()))} },`)
  out.push('    ],', '    labels: [')
  for (const l of m.labels)
    out.push(`      { text: ${q(l.text)}${l.textKo ? `, textKo: ${q(l.textKo)}` : ''}, at: ${pt(l.at)}, size: ${l.size}, kind: ${q(l.kind)}${l.rotate ? `, rotate: ${l.rotate}` : ''} },`)
  out.push('    ],', '    subjects: {')
  for (const [id, s] of Object.entries(m.subjects)) out.push(`      ${q(id)}: { at: ${pt(s.at)}, size: ${s.size}${s.flip ? ', flip: true' : ''} },`)
  out.push('    },')
  if (m.markAnchors && Object.keys(m.markAnchors).length) {
    out.push('    markAnchors: {')
    for (const [id, a] of Object.entries(m.markAnchors)) out.push(`      ${q(id)}: ${q(a)},`)
    out.push('    },')
  }
  out.push('  },')
}
out.push('}')
process.stdout.write(out.join('\n') + '\n')
