// 픽셀 지도(/pixel)의 페이즈 그림 시험 (S7, docs/pixel-plan.md) — 개발 서버(pnpm dev) 뒤 (지금 지도의 지도 조각 ?map 을 받는다).
//   node scripts/qa/pixel-figures.mjs [--base http://localhost:5173] [--sheet <png> --time t]
// - 시점마다 그리는 세계 지도 그림(id·차례·자리·크기·뒤집힘·이름 쪽·상자)이 지금 지도가 그 시점에 그리는 것과 같은가 —
//   지금 지도의 지도 조각(src/data/phaseN.ts?map, vite/phaseData.ts)에 App.tsx 의 phaseCards 셈(shownAtTimeOf·movedAt·time.label)과
//   ZendikarMap.tsx 의 그리는 차례(밑에 까는 그림 먼저)·figureBox 를 따로 적용해 견준다
// - 자리마다 어느 단계에선가 구운 그림이 있고(크기 7 픽셀 이상인 단계마다), 그림의 몫 번호가 0–16 이며, 그림 자리가 상자와 맞는가
// - 두 번 구운 것이 같은가
import './pixel-hooks.mjs'
import crypto from 'node:crypto'
import fs from 'node:fs'
import zlib from 'node:zlib'

const ROOT = new URL('../../', import.meta.url).pathname
const argv = process.argv.slice(2)
const opt = (k, d = null) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
const BASE = opt('base', 'http://localhost:5173')
const T = await import(`${ROOT}src/data/timeline.ts`)
const F = await import(`${ROOT}scripts/pixel/figures.mjs`)
const problems = []
const ok = (cond, msg) => {
  if (!cond) problems.push(msg)
}

// 지금 지도의 지도 조각 — 페이즈 1..8 차례 (phase.ts 의 MAPS)
const cards = []
for (let n = 1; n <= 8; n++) {
  const text = await (await fetch(`${BASE}/src/data/phase${n}.ts?map`)).text()
  const m = await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)
  cards.push(...m.CARDS)
}
const byId = new Map(cards.map((c) => [c.id, c]))
const data = await F.buildPixelFigures()
const again = await F.buildPixelFigures()
const sha = (o) => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex')
ok(sha(data) === sha(again), '두 번 구운 그림이 다르다')

const { meta, chunks } = data
// 카드 — 어느 시점에도 그리지 않는 카드까지 모두 (패널이 그 까닭을 싣는다), 장소와 하나인 카드는 그 표시
ok(meta.cards.length === cards.length, `카드 ${meta.cards.length} — 지도 조각은 ${cards.length}`)
for (const r of meta.cards) ok(Boolean(r[7]) === Boolean(byId.get(r[0])?.place), `${r[0]}: 장소와 하나인 카드 표시가 지도 조각과 다르다`)
const r1 = (v) => Math.round(v * 10)
for (const t of T.SHOWN_TIME_POINTS) {
  // App.tsx 의 phaseCards (시점별 보기) — 그 시점에 다른 자리면 그 자리·뒤집힘·이름 쪽, 아니면 그 시점의 이름 쪽
  const shown = cards
    .filter((c) => T.shownAtTimeOf(c, t, (id) => byId.get(id)))
    .map((c) => {
      const m = T.movedAt(c, t)
      if (m) return { ...c, at: m.at, flip: m.flip ?? c.flip, label: m.label ?? c.label, ...(m.childMap !== undefined ? { childMap: m.childMap ?? undefined } : {}) }
      const side = c.time?.label?.[t]
      return side ? { ...c, label: side } : c
    })
  // 세계 지도 그림 — 장소와 하나인 카드(place)는 빼고, 밑에 까는 그림이 먼저 (ZendikarMap.tsx 의 FigureLayer). 지역 상세의 대상(S9)은 그 뒤에
  const world = shown.filter((c) => !c.place && !c.childMap)
  const inDetail = shown.filter((c) => !c.place && c.childMap)
  const want = [...world.filter((c) => c.under), ...world.filter((c) => !c.under), ...inDetail]
  const got = meta.times[t]
  ok(got.length === want.length, `T${t}: 그림 ${got.length}장 — 지금 지도는 ${want.length}장`)
  for (let i = 0; i < Math.min(got.length, want.length); i++) {
    const [pi, label] = got[i]
    const [ci, x, y, s, flip, bx0, by0, bx1, by1, det] = meta.places[pi]
    const id = meta.cards[ci][0]
    const c = want[i]
    if (id !== c.id) {
      problems.push(`T${t} #${i}: ${id} — 지금 지도는 ${c.id}`)
      break
    }
    ok(x === r1(c.at[0]) && y === r1(c.at[1]), `T${t} ${id}: 자리 (${x / 10}, ${y / 10}) — 지금 지도는 (${c.at})`)
    ok(s === r1(c.size), `T${t} ${id}: 크기 ${s / 10} — 지금 지도는 ${c.size}`)
    ok(Boolean(flip) === Boolean(c.flip), `T${t} ${id}: 뒤집힘이 다르다`)
    ok(Boolean(det) === Boolean(c.childMap), `T${t} ${id}: 지역 상세의 대상 표시가 ${det ? '있다' : '없다'} — 지금 지도의 지역 상세 ${c.childMap ?? '-'}`)
    ok((label || undefined) === c.label, `T${t} ${id}: 이름 쪽 '${label}' — 지금 지도는 '${c.label}'`)
    const b = F.figureBox(c.frame, c.at, c.size, c.flip)
    ok(bx0 === r1(b.x0) && by0 === r1(b.y0) && bx1 === r1(b.x1) && by1 === r1(b.y1), `T${t} ${id}: 상자가 지금 지도의 figureBox 와 다르다`)
  }
  // 패널이 싣는 그 시점의 카드 — 지역 상세의 대상까지 (그 시점의 지역 상세도 지금 지도와 같다)
  const drawn = new Map(meta.drawn[t].map(([ci, cm]) => [meta.cards[ci][0], cm || undefined]))
  ok(drawn.size === shown.length && shown.every((c) => drawn.has(c.id)), `T${t}: 그 시점에 그리는 카드 ${drawn.size} — 지금 지도는 ${shown.length}`)
  for (const c of shown) if (drawn.has(c.id)) ok(drawn.get(c.id) === c.childMap, `T${t} ${c.id}: 지역 상세 ${drawn.get(c.id)} — 지금 지도는 ${c.childMap}`)
  // 그 시점에 그리는 카드는 모두 어느 패널에선가 닿는다 — 장소와 하나인 카드는 그 장소·대륙 패널, 나머지는 가리키는 장소나 그 시점의 지역 상세의 장소 패널
  // (App.tsx 의 phaseCardsHere — 대륙을 가리키는 지역 상세의 대상은 그 지역 상세의 장소 패널에)
  for (const c of shown) {
    const cm = drawn.get(c.id)
    // 세계 지도 그림은 그 그림을 눌러 닿는다
    const reach = c.place || !cm || c.depicts.type === 'location' || meta.details[cm]?.length
    ok(Boolean(reach), `T${t} ${c.id}: 어느 패널에도 실리지 않는다 (가리키는 곳 ${c.depicts.type}/${c.depicts.id}, 지역 상세 ${cm ?? '-'})`)
  }
}

// 구운 그림 — 자리마다 크기 7 픽셀 이상인 단계마다 그림이 있고, 몫 번호가 0–16, 그림 상자가 자리의 상자를 덮는다
const sprites = new Map()
for (const [key, rows] of Object.entries(chunks)) {
  ok(meta.chunks.includes(key), `조각 ${key} 가 meta 에 없다`)
  for (const r of rows) {
    const k = `${r[0]}|${r[1]}`
    ok(!sprites.has(k), `그림 ${k} 가 두 조각에 있다`)
    sprites.set(k, r)
    const cell = meta.cell[r[1]]
    const [, x, y] = meta.places[r[0]]
    if (cell) ok(key === `${r[1]}-${Math.floor(x / 10 / cell)}-${Math.floor(y / 10 / cell)}`, `그림 ${k} 가 제 칸의 조각에 없다 (${key})`)
  }
}
const decode = (b64, n) => {
  const b = Buffer.from(b64, 'base64')
  const o = new Uint8Array(n)
  let k = 0
  for (let i = 0; i < b.length; i += 2) {
    o.fill(b[i], k, k + b[i + 1])
    k += b[i + 1]
  }
  ok(k === n, `그림의 몫 번호 길이 ${k} 가 ${n} 이 아니다`)
  return o
}
let count = 0
meta.places.forEach(([, , , s, , bx0, by0, bx1, by1, det], pi) => {
  let any = false
  meta.levels.forEach((u, li) => {
    const r = sprites.get(`${pi}|${li}`)
    // 지역 상세의 대상은 지역 상세가 나오는 단계부터 (S9)
    const want = s / 10 / u >= meta.minPx && (!det || li >= meta.detailLevel)
    ok(Boolean(r) === want, `자리 ${pi} (${meta.cards[meta.places[pi][0]][0]}) 단계 ${u}: 그림이 ${r ? '있다' : '없다'} (크기 ${s / 10}${det ? ', 지역 상세의 대상' : ''})`)
    if (!r) return
    any = true
    count++
    const idx = decode(r[6], r[4] * r[5])
    // 0 빔, 1–15 몫, 16 둘레 윤곽, 17 안쪽 먹선 (scripts/pixel/figures.mjs 의 INNER_INK — 객체 다듬기 B1), 18 밝은 칠 위의 흐린 물빛 (SEA_TINT — B93)
    ok(idx.every((v) => v <= 18), `자리 ${pi} 단계 ${u}: 모르는 몫 번호`)
    ok(idx.some((v) => v && v !== 16), `자리 ${pi} 단계 ${u}: 칠한 픽셀이 없다`)
    ok(r[2] <= Math.floor(bx0 / 10 / u) && r[3] <= Math.floor(by0 / 10 / u) && r[2] + r[4] >= Math.floor(bx1 / 10 / u) && r[3] + r[5] >= Math.floor(by1 / 10 / u), `자리 ${pi} 단계 ${u}: 그림이 상자를 덮지 않는다`)
  })
  ok(any, `자리 ${pi} 에 어느 단계에도 그림이 없다`)
})

if (opt('sheet')) {
  const { PALETTES } = await import(`${ROOT}src/pixel/raster/palette.ts`)
  const pal = PALETTES.b
  const t = opt('time', '2')
  const list = meta.times[t].map(([pi]) => pi).sort((a, b) => meta.places[b][3] - meta.places[a][3])
  const rows = [4, 5].map((li) => list.map((pi) => sprites.get(`${pi}|${li}`)).filter(Boolean).slice(0, 40))
  const W = Math.max(...rows.map((r) => r.reduce((a, x) => a + x[4] + 2, 0)))
  const H = rows.reduce((a, r) => a + Math.max(...r.map((x) => x[5])) + 2, 0)
  const out = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) out.set([...pal.land, 255], i * 4)
  let y0 = 0
  for (const r of rows) {
    let x0 = 0
    for (const s of r) {
      const idx = decode(s[6], s[4] * s[5])
      for (let y = 0; y < s[5]; y++) for (let x = 0; x < s[4]; x++) if (idx[y * s[4] + x]) out.set([...pal.fig[idx[y * s[4] + x]], 255], ((y0 + y) * W + x0 + x) * 4)
      x0 += s[4] + 2
    }
    y0 += Math.max(...r.map((x) => x[5])) + 2
  }
  const raw = Buffer.alloc((W * 4 + 1) * H)
  for (let y = 0; y < H; y++) out.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
  const tb = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b) => {
    let r = 0xffffffff
    for (const x of b) r = tb[(r ^ x) & 255] ^ (r >>> 8)
    return (r ^ 0xffffffff) >>> 0
  }
  const ch = (ty, d) => {
    const l = Buffer.alloc(4)
    l.writeUInt32BE(d.length)
    const td = Buffer.concat([Buffer.from(ty), d])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([l, td, c])
  }
  const ih = Buffer.alloc(13)
  ih.writeUInt32BE(W, 0)
  ih.writeUInt32BE(H, 4)
  ih[8] = 8
  ih[9] = 6
  fs.writeFileSync(opt('sheet'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]))
  console.log(`그림판 → ${opt('sheet')}`)
}

console.log(`시점마다 세계 지도 그림 ${T.SHOWN_TIME_POINTS.map((t) => meta.times[t].length).join(' · ')} · 자리 ${meta.places.length} · 구운 그림 ${count}장 · 조각 ${meta.chunks.length}`)
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  for (const p of problems.slice(0, 40)) console.log(' -', p)
  process.exit(1)
}
console.log('통과')
