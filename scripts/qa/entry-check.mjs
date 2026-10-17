// 진입 조각 검사 — 페이즈 바탕 모듈(src/data/periods/**·src/map/period*.ts)이 첫 로딩의 정적 import 닫힘에 들지 않고
// 늦게 받는 조각(dynamic import)에만 있는지 본다 (명세 §11.3). 진입 닫힘과 페이즈 바탕 조각의 크기(gz)도 낸다 (명세 §12 의 기준값).
//   node scripts/qa/entry-check.mjs [--json 결과.json] [--late <정규식> …]
//   --late: 첫 로딩에 들면 안 되는 모듈(뿌리에서 본 경로)의 정규식 — 주면 기본(페이즈 바탕) 대신 그것을 본다 (검사 자체를 시험할 때 등)
// vite build 를 메모리에서 돌린다(write: false — dist/ 를 건드리지 않는다). 조각 목록이 모듈 단위라 manifest(조각 단위)보다 정확하다.
// 실패(진입 닫힘에 페이즈 바탕 모듈이 있다)면 종료 코드 1.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { build } from 'vite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null
/** 첫 로딩에 들면 안 되는 모듈 (뿌리에서 본 경로) */
const lateArgs = argv.flatMap((a, i) => (a === '--late' ? [argv[i + 1]] : []))
const LATE = lateArgs.length ? lateArgs.map((r) => new RegExp(r)) : [/^src\/data\/periods\//, /^src\/map\/period[^/]*\.ts$/]

const rel = (id) => {
  const clean = id.replace(/\0/g, '').replace(/[?#].*$/, '')
  return path.isAbsolute(clean) ? path.relative(ROOT, clean) : clean
}
const isLate = (id) => LATE.some((re) => re.test(rel(id)))

const t0 = Date.now()
const result = await build({ root: ROOT, logLevel: 'warn', build: { write: false, reportCompressedSize: false } })
const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output)
const chunks = new Map(outputs.filter((o) => o.type === 'chunk').map((c) => [c.fileName, c]))
const assets = new Map(outputs.filter((o) => o.type === 'asset').map((a) => [a.fileName, a]))
const modulesOf = (c) => c.moduleIds ?? Object.keys(c.modules ?? {})

// 진입 조각들의 정적 import 닫힘
const entries = [...chunks.values()].filter((c) => c.isEntry)
const closure = new Set()
const stack = entries.map((c) => c.fileName)
while (stack.length) {
  const f = stack.pop()
  if (closure.has(f)) continue
  closure.add(f)
  for (const i of chunks.get(f)?.imports ?? []) stack.push(i)
}
const gz = (s) => zlib.gzipSync(typeof s === 'string' ? Buffer.from(s) : Buffer.from(s), { level: 9 }).length
const sizeOf = (files) => {
  let raw = 0
  let packed = 0
  for (const f of files) {
    const c = chunks.get(f)
    const body = c ? c.code : assets.get(f)?.source
    if (body === undefined) continue
    raw += Buffer.byteLength(body)
    packed += gz(body)
  }
  return { raw, gz: packed }
}
// 진입 닫힘이 함께 받는 CSS
const css = new Set()
for (const f of closure) for (const c of chunks.get(f)?.viteMetadata?.importedCss ?? []) css.add(c)

const bad = []
for (const f of closure) for (const id of modulesOf(chunks.get(f))) if (isLate(id)) bad.push({ chunk: f, module: rel(id) })

// 페이즈 바탕 모듈이 든 조각 (늦게 받는 것)
const lateChunks = [...chunks.values()]
  .filter((c) => modulesOf(c).some(isLate))
  .map((c) => ({ file: c.fileName, dynamicEntry: Boolean(c.isDynamicEntry), modules: modulesOf(c).filter(isLate).map(rel), ...sizeOf([c.fileName]) }))

const js = sizeOf(closure)
const cssSize = sizeOf(css)
const kb = (n) => (n / 1024).toFixed(1)
console.log(`vite build (메모리) ${((Date.now() - t0) / 1000).toFixed(1)}s — 조각 ${chunks.size}, 진입 ${entries.map((c) => c.fileName).join(', ')}`)
console.log(`진입 닫힘 JS ${closure.size}조각 ${kb(js.raw)}KB (gz ${kb(js.gz)}KB) · CSS ${css.size}개 ${kb(cssSize.raw)}KB (gz ${kb(cssSize.gz)}KB) · 합 gz ${kb(js.gz + cssSize.gz)}KB`)
if (lateChunks.length) {
  const total = lateChunks.reduce((a, c) => ({ raw: a.raw + c.raw, gz: a.gz + c.gz }), { raw: 0, gz: 0 })
  console.log(`늦게 받는 조각 ${lateChunks.length}개 ${kb(total.raw)}KB (gz ${kb(total.gz)}KB)`)
  for (const c of [...lateChunks].sort((a, b) => b.gz - a.gz).slice(0, 8))
    console.log(`  ${c.file}${c.dynamicEntry ? ' (dynamic entry)' : ''}: ${kb(c.raw)}KB (gz ${kb(c.gz)}KB) — ${c.modules.join(', ')}`)
  if (lateChunks.length > 8) console.log(`  … ${lateChunks.length - 8}개 더 (--json 에 모두)`)
}
else console.log(`늦게 받아야 할 모듈(${LATE.map(String).join(' ')})이 든 조각이 없다`)
if (bad.length) {
  console.error(`✗ 진입 닫힘에 늦게 받아야 할 모듈 ${bad.length}개:`)
  for (const b of bad) console.error(`  ${b.module}  (조각 ${b.chunk})`)
} else console.log('진입 닫힘에 늦게 받아야 할 모듈이 없다 — 통과')
if (JSON_OUT)
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify({ entries: entries.map((c) => c.fileName), closure: [...closure], css: [...css], js, cssSize, lateChunks, bad }, null, 1),
  )
process.exit(bad.length ? 1 : 0)
