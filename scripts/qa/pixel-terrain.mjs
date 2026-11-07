// 픽셀 지도(/pixel)의 바탕 지형 시험 — Node 만 (docs/pixel-plan.md S4).
//   node scripts/qa/pixel-terrain.mjs               # 그린 것마다 데이터가 있는지, 데이터마다 어느 단계에선가 그려지는지, 뽑기가 늘 같은지 (실패하면 1)
//   node scripts/qa/pixel-terrain.mjs --sheet <파일.png>   # 지형 그림판을 한 장으로 (한 칸 6배, 무리마다 한 줄)
// 그린 것: 흩뿌린 기호(지금 지도의 GLYPH_KINDS — 대륙 relief·지형 영역·장소 범위에서 뿌린다), 단애(바탕 지형 선 또는 relief.cliffs 대륙의 해안),
//   협곡 바닥·강·한 점 기호·바다 표시(데이터 id), 채색 영역(바탕 지형 영역 id 또는 장소 id), 헤드론(src/data/index.ts 의 무리)
import './pixel-hooks.mjs'
import crypto from 'node:crypto'
import fs from 'node:fs'
import zlib from 'node:zlib'

const ROOT = new URL('../../', import.meta.url).pathname
const { buildPixelTerrain, readHedrons } = await import(`${ROOT}scripts/pixel/terrain.mjs`)
const { decodeTerrain, RIVER, RIVER_WIDE, TERRAIN_FROM } = await import(`${ROOT}src/pixel/raster/terrain.ts`)
const S = await import(`${ROOT}src/pixel/raster/terrainSprites.ts`)
const { rasterRegion } = await import(`${ROOT}src/pixel/raster/world.ts`)
const { ringsFor } = await import(`${ROOT}src/pixel/rings.ts`)
const { PALETTES } = await import(`${ROOT}src/pixel/raster/palette.ts`)
const { renderTile } = await import(`${ROOT}src/pixel/raster/world.ts`)
const { distanceToPolyline } = await import(`${ROOT}src/map/geometry.ts`)
const { landmasses } = await import(`${ROOT}src/map/geo.ts`)
const { continents } = await import(`${ROOT}src/data/continents.ts`)
const { locations } = await import(`${ROOT}src/data/locations.ts`)

const argv = process.argv.slice(2)
const opt = (k) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : null)

function png(path, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) rgba.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, i) => (raw[y * (w * 4 + 1) + 1 + i] = v))
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b) => {
    let r = 0xffffffff
    for (const x of b) r = table[(r ^ x) & 255] ^ (r >>> 8)
    return (r ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  fs.writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}

if (opt('sheet')) {
  // 무리마다 한 줄: 흩뿌린 기호 · 한 점 기호 · 바다 표시 · 넓은 배율의 작은 무늬. 칸 10×10, 6배, 땅 빛 바탕(바다 표시는 물빛)
  const pal = PALETTES.b
  const rows = [
    Object.entries(S.GLYPH_SPRITES).flatMap(([, l]) => l),
    [...Object.values(S.LANDMARK_SPRITES), ...Object.values(S.LANDMARK_SMALL), S.scaleSprite(S.LANDMARK_SPRITES.pit, 2)],
    Object.values(S.SEA_SPRITES),
    Object.values(S.MICRO_SPRITES),
  ]
  const CELL = 18
  const Z = 6
  const cols = Math.max(...rows.map((r) => r.length))
  const W = cols * CELL * Z
  const H = rows.length * CELL * Z
  const out = new Uint8ClampedArray(W * H * 4)
  const fill = (x, y, c) => {
    for (let dy = 0; dy < Z; dy++)
      for (let dx = 0; dx < Z; dx++) {
        const o = ((y * Z + dy) * W + x * Z + dx) * 4
        out[o] = c[0]
        out[o + 1] = c[1]
        out[o + 2] = c[2]
        out[o + 3] = 255
      }
  }
  rows.forEach((row, ri) => {
    for (let c = 0; c < cols; c++)
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) fill(c * CELL + x, ri * CELL + y, ri === 2 ? pal.shallow : (x + y) % 2 ? pal.land : pal.landShade)
    row.forEach((s, ci) => {
      const ox = ci * CELL + 1
      const oy = ri * CELL + 1
      s.rows.forEach((line, y) =>
        [...line].forEach((ch, x) => {
          if (ch === '.' || (ch === '%' && (x + y) % 2)) return
          fill(ox + x, oy + y, pal.t[S.INK[ch]])
        }),
      )
    })
  })
  png(opt('sheet'), W, H, out)
  console.log(`그림판 ${S.spriteCount()}장 (작은 무늬 ${Object.keys(S.MICRO_SPRITES).length}장 따로) → ${opt('sheet')}`)
  process.exit(0)
}

let fail = 0
const ok = (cond, msg) => {
  if (!cond) {
    fail++
    console.log(`실패: ${msg}`)
  }
}

const raw = await buildPixelTerrain()
// 1. 뽑기가 늘 같다 (새 프로세스의 다른 모듈 상태와 상관없이 — 같은 프로세스에서 한 번 더)
const sha = (o) => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 16)
const again = await buildPixelTerrain()
ok(sha(raw) === sha(again), '같은 원본에서 두 번 뽑은 지형이 다르다')

const d = decodeTerrain(raw)

// 0. 그림판 — 줄마다 폭이 같고, 기준점이 그림 안 (기준점이 밖이면 기호가 데이터 자리에서 비켜 그려진다 — S4 검토)
const allSprites = [
  ...Object.entries(S.GLYPH_SPRITES).flatMap(([k, l]) => l.map((sp, i) => [`glyph:${k}:${i}`, sp])),
  ...Object.entries(S.LANDMARK_SPRITES).map(([k, sp]) => [`mark:${k}`, sp]),
  ...Object.entries(S.LANDMARK_SMALL).map(([k, sp]) => [`small:${k}`, sp]),
  ...Object.entries(S.SEA_SPRITES).map(([k, sp]) => [`sea:${k}`, sp]),
  ...Object.entries(S.MICRO_SPRITES).map(([k, sp]) => [`micro:${k}`, sp]),
  ['waterfall:-80', S.turnSprite(S.LANDMARK_SPRITES.waterfall, -80)],
  ['waterfall:80', S.turnSprite(S.LANDMARK_SPRITES.waterfall, 80)],
  ['pit:x2', S.scaleSprite(S.LANDMARK_SPRITES.pit, 2)],
]
for (const [name, sp] of allSprites) {
  const w = sp.rows[0].length
  ok(sp.rows.every((r) => r.length === w), `그림 '${name}' 의 줄 폭이 다르다`)
  ok(sp.ax >= 0 && sp.ax < w && sp.ay >= 0 && sp.ay < sp.rows.length, `그림 '${name}' 의 기준점 (${sp.ax}, ${sp.ay}) 이 그림 밖이다`)
  ok(sp.rows.every((r) => [...r].every((c) => c === '.' || S.INK[c])), `그림 '${name}' 에 팔레트에 없는 글자가 있다`)
}
const LS = await Promise.all(['sejiri', 'akoum', 'tazeem', 'murasa', 'ondu', 'guul-draz', 'bala-ged'].map((n) => import(`${ROOT}src/data/landscape/${n}.ts`)))
const land = LS.map((m) => m.landscape)
const areas = land.flatMap((l) => l.areas ?? [])
const rivers = land.flatMap((l) => l.rivers ?? [])
const lines = land.flatMap((l) => l.lines ?? [])
const glyphs = land.flatMap((l) => l.glyphs ?? [])
const sea = land.flatMap((l) => l.sea ?? [])

// 2. 흩뿌린 기호 — 종류마다 그림이 있고, 종류는 지금 지도의 기호 종류
// 나무는 넓은 배율에서 숲 칠이 맡아 작은 무늬가 없다
for (const k of new Set(d.items.map((i) => i.kind))) ok(S.GLYPH_SPRITES[k] && (k === 'tree' || S.MICRO_SPRITES[k]), `흩뿌린 기호 '${k}' 의 그림이 없다`)
const kinds = new Set()
for (let i = 0; i < raw.g.length; i += 3) kinds.add(raw.kinds[raw.g[i]])
for (const k of kinds) ok(S.GLYPH_SPRITES[k], `흩뿌린 기호 '${k}' 를 그리지 않는다 (그림판에 없다)`)

// 3. 한 점 기호·바다 표시·강·채색 영역·헤드론 — 데이터 id 와 하나씩 맞는다
ok(raw.marks.length === glyphs.length && glyphs.every((g) => raw.marks.some((m) => m.id === g.id)), '한 점 기호의 수·id 가 데이터와 다르다')
for (const m of raw.marks) {
  ok(S.LANDMARK_SPRITES[m.k] && S.MICRO_SPRITES[m.k], `한 점 기호 '${m.id}' (${m.k}) 의 그림이 없다`)
  // 크기 갈래 — 작은 것(size < 0.6)은 따로 찍은 작은 그림이 있어야 한다 (데이터의 크기를 버리지 않는다)
  if (S.sizeClass(m.s) === 'small') ok(S.LANDMARK_SMALL[m.k], `작은 한 점 기호 '${m.id}' (${m.k} ${m.s}) 의 작은 그림이 없다`)
}
ok(raw.sea.length === sea.length && sea.every((m) => raw.sea.some((x) => x.id === m.id)), '바다 표시의 id 가 데이터와 다르다')
for (const m of raw.sea) {
  ok(m.p.length >= 2, `바다 표시 '${m.id}' 에 그릴 자리가 없다`)
  ok(S.SEA_SPRITES[m.k], `바다 표시 '${m.id}' (${m.k}) 의 그림이 없다`)
}
ok(raw.rivers.length === rivers.length && rivers.every((r) => raw.rivers.some((x) => x.id === r.id)), '강의 id 가 데이터와 다르다')
const areaIds = new Set([...areas.map((a) => a.id), ...locations.map((l) => l.id)])
for (const w of raw.washes) ok(areaIds.has(w.id), `채색 영역 '${w.id}' 의 데이터가 없다`)
for (const a of areas.filter((a) => a.kind === 'lava' || a.kind === 'plain' || a.kind === 'forest')) ok(raw.washes.some((w) => w.id === a.id), `영역 '${a.id}' (${a.kind}) 를 칠하지 않는다`)
const clusters = readHedrons()
for (const c of clusters) ok(raw.hedrons.filter((h) => h.c === c.id).length === c.count, `헤드론 무리 '${c.id}' 의 수가 ${c.count} 가 아니다`)

// 4. 단애 — 그린 선마다 바탕 지형 선이나 절벽 해안 대륙의 해안 가까이 (해안 절벽은 해안에서 9 단위 안쪽)
const cliffCoasts = landmasses.filter((l) => continents.some((c) => c.landmass === l.id && c.relief.cliffs)).map((l) => l.smooth)
const near = ([x, y]) => lines.some((l) => distanceToPolyline(x, y, l.line, Boolean(l.closed)) < 14) || cliffCoasts.some((r) => distanceToPolyline(x, y, r, true) < 12)
const strays = d.lines.filter((l) => !near(l.pts[0]))
ok(strays.length === 0, `데이터와 닿지 않는 단애 선 ${strays.length}개 (첫 점 ${strays[0]?.pts[0]})`)
for (const l of lines) ok(d.lines.some((x) => x.pts.some(([px, py]) => distanceToPolyline(px, py, l.line, Boolean(l.closed)) < 8)), `바탕 지형 선 '${l.id}' 를 그리지 않는다`)

// 5. 그려지는지 — 강과 한 점 기호는 한 픽셀 = 1 단위에서 그 자리를 그린 타일이 지형 없이 그린 것과 다르다
const pal = PALETTES.b
const u = 1
const tileAt = (x, y, terrain) => {
  const t = { x0: Math.floor(x / u) - 16, y0: Math.floor(y / u) - 16, w: 32, h: 32 }
  return renderTile(ringsFor(u), u, t, pal, { shore: 'dither', terrain })
}
const differs = (a, b) => a.some((v, i) => v !== b[i])
for (const m of d.marks) ok(differs(tileAt(m.x, m.y, d), tileAt(m.x, m.y, undefined)), `한 점 기호 (${m.kind} ${m.x},${m.y}) 가 그려지지 않는다`)
for (const r of d.rivers) {
  const [x, y] = r.pts[r.pts.length >> 1]
  const cells = rasterRegion(ringsFor(u), u, { x0: Math.floor(x) - 4, y0: Math.floor(y) - 4, w: 9, h: 9 }, d)
  ok(cells.kind.some((k) => k === RIVER || k === RIVER_WIDE), `강 (${x},${y}) 가운데가 그려지지 않는다`)
}
for (const h of d.hedrons) {
  const lv = h.single ? TERRAIN_FROM.bigHedrons : TERRAIN_FROM.hedrons
  const t = { x0: Math.floor(h.x / lv) - 16, y0: Math.floor((h.y - h.lift) / lv) - 16, w: 32, h: 32 }
  const a = renderTile(ringsFor(lv), lv, t, pal, { shore: 'dither', terrain: d })
  const noHedron = { ...d, hedrons: [] }
  ok(differs(a, renderTile(ringsFor(lv), lv, t, pal, { shore: 'dither', terrain: noHedron })), `헤드론 '${h.id}' 가 한 픽셀 = ${lv} 단위에서 그려지지 않는다`)
}

console.log(
  `흩뿌린 기호 ${d.items.length} · 단애 선 ${d.lines.length}·빗금 ${d.hatch.length / 4} · 협곡 ${d.gorges.length} · 강 ${d.rivers.length} · 한 점 기호 ${d.marks.length} · 바다 표시 ${d.sea.length} · 채색 ${raw.washes.length} · 헤드론 ${d.hedrons.length} · 그림판 ${S.spriteCount()}장 · ${(JSON.stringify(raw).length / 1024).toFixed(0)}KB`,
)
console.log(fail ? `실패 ${fail}` : '통과')
process.exit(fail ? 1 : 0)
