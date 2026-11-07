// 픽셀 지도(/pixel)의 움직이는 효과 시험 (docs/pixel-plan.md S5).
//   node scripts/qa/pixel-fx.mjs                 # Node — 효과마다 고리 이음매·프레임 수, 타일이 그린 효과 자리마다 데이터 id, 데이터마다 어느 단계에선가 효과
//   node scripts/qa/pixel-fx.mjs --browser [--base URL]   # 브라우저(빌드 미리보기 :4173 — ?perf) — 효과가 안 보이면 시계가 돌지 않는다(CPU ≈ 0),
//                                                          보이면 약 12fps 로 돈다, 확대하는 동안은 숨는다, 움직임 줄이기면 돌지 않는다
// --sheet <png> — 효과마다 한 줄에 모든 프레임 (한 칸 8배)
import './pixel-hooks.mjs'
import fs from 'node:fs'
import zlib from 'node:zlib'

const ROOT = new URL('../../', import.meta.url).pathname
const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
let fail = 0
const ok = (cond, msg) => {
  if (!cond) {
    fail++
    console.log(`실패: ${msg}`)
  }
}

if (argv.includes('--browser')) {
  const { launchChrome } = await import('./chrome.mjs')
  const BASE = opt('base', 'http://localhost:4173').replace(/\/$/, '')
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const chrome = await launchChrome({ width: 1280, height: 800 })
  try {
    const run = async (name, view, { reduce = false, act } = {}) => {
      const { sessionId: s } = await chrome.newPage(null, { w: 1280, h: 800, scale: 2 })
      if (reduce) await chrome.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, s)
      // 새 탭은 뒤에 열려 document.hidden 이라 효과의 시계가 서 있다 — 앞으로 가져온다
      await chrome.send('Page.bringToFront', {}, s)
      await chrome.send('Emulation.setFocusEmulationEnabled', { enabled: true }, s).catch(() => {})
      await chrome.send('Page.navigate', { url: `${BASE}/pixel?view=${view}&perf` }, s)
      const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
      // 타일이 다 올 때까지
      for (let i = 0; i < 100; i++) {
        await sleep(100)
        if (await ev('!!window.__pixel && window.__pixel.frames.length > 0 && window.__pixel.missing === 0 && !window.__pixel.anim')) break
      }
      await sleep(400)
      const hidden = await ev('document.hidden')
      if (hidden) console.log(`  (${name}: 탭이 숨은 채 — 시계가 서는 것이 맞다)`)
      const fxNow = 'JSON.stringify(window.__pixel.fx ? { visible: window.__pixel.fx.visible, ticks: window.__pixel.fx.ticks } : null)'
      const a = await ev(fxNow)
      if (act) await act(ev)
      await sleep(1000)
      const b = await ev(fxNow)
      await chrome.send('Target.closeTarget', { targetId: (await chrome.send('Target.getTargets')).targetInfos.find((t) => t.url.includes('/pixel'))?.targetId }).catch(() => {})
      const fa = JSON.parse(a ?? 'null')
      const fb = JSON.parse(b ?? 'null')
      console.log(`${name.padEnd(28)} 보이는 효과 ${fb?.visible ?? '—'} · 1초에 시계 ${fb && fa ? fb.ticks - fa.ticks : '—'}번`)
      return { visible: fb?.visible ?? 0, ticks: fb && fa ? fb.ticks - fa.ticks : 0 }
    }
    // 열린 바다 (효과 없음) — 시계가 돌지 않는다
    const sea = await run('먼 바다 (효과 없음)', '200,1000,8')
    ok(sea.visible === 0 && sea.ticks === 0, `효과가 없는데 시계가 돈다 (${sea.ticks})`)
    // 개관 (그림을 그리지 않는 단계)
    const over = await run('개관', '1200,850,1')
    ok(over.visible === 0 && over.ticks === 0, `개관에서 시계가 돈다 (${over.ticks})`)
    // 아쿰의 용암 들판·간헐천 (한 픽셀 1 단위)
    const lava = await run('아쿰 용암 들판', '1900,500,8')
    ok(lava.visible > 0 && lava.ticks >= 9 && lava.ticks <= 14, `용암 들판에서 효과 ${lava.visible} · 1초에 ${lava.ticks}번 (약 12번이어야)`)
    // 움직임 줄이기 — 돌지 않는다
    const still = await run('아쿰 · 움직임 줄이기', '1900,500,8', { reduce: true })
    ok(still.visible === 0 && still.ticks === 0, `움직임 줄이기에서 효과 ${still.visible} · 시계 ${still.ticks}`)
  } finally {
    await chrome.close()
  }
  console.log(fail ? `실패 ${fail}` : '통과')
  process.exit(fail ? 1 : 0)
}

// --- Node: 효과 모듈 ---
const { EFFECT_FILES } = await import(`${ROOT}src/pixel/fx/effects.ts`)
const core = await import(`${ROOT}src/pixel/vendor/pixelfx/index.js`)
const { PALETTES } = await import(`${ROOT}src/pixel/raster/palette.ts`)
const FPS = 12
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
const pal = PALETTES.b
const colors = { ...Object.fromEntries(Object.entries(pal.t).map(([k, c]) => [k, hex(c)])), land: hex(pal.land), landShade: hex(pal.landShade), shallow: hex(pal.shallow), mid: hex(pal.mid), deep: hex(pal.deep), seaFoam: hex(pal.foam) }

const renderAt = (mod, variant, t, extra = {}) => {
  const m = variant && mod.variant ? mod.variant(variant) : mod
  const v = variant ? m.meta.variants?.[variant] : undefined
  const [w, h] = v?.size ?? m.meta.size
  const [ox, oy] = v?.origin ?? m.meta.origin
  const f = core.createFrame(w, h)
  const p = core.painterFor(f)
  p.place(ox, oy)
  const o = { ...(m.meta.options ?? {}), colors, ...(variant ? { variant } : {}), seed: m.meta.options?.seed ?? 1, ...extra }
  m.drawBack?.(p, t, o)
  m.draw(p, t, o)
  return { w, h, rgba: core.composite(f, new Uint8ClampedArray(w * h * 4), null) }
}

const sheet = []
for (const [kind, mod] of Object.entries(EFFECT_FILES)) {
  const meta = mod.meta
  const n = meta.duration * FPS
  ok(meta.fps === FPS, `효과 '${kind}' 의 fps 가 ${meta.fps} (12 여야)`)
  ok(Math.abs(n - Math.round(n)) < 1e-9 && n >= 2, `효과 '${kind}' 의 고리 ${meta.duration}초가 12fps 의 프레임 수로 나뉘지 않는다`)
  ok(meta.loop === true, `효과 '${kind}' 가 고리가 아니다`)
  // 간헐천은 솟구침(끓는 물·마그마)과 김만 — 셋 모두
  const extras = kind === 'geyser' ? [{}, { erupt: 'water' }, { erupt: 'magma' }] : [{}]
  for (const variant of [null, ...Object.keys(meta.variants ?? {})])
  for (const extra of extras) {
    const name = `${kind}${variant ? `/${variant}` : ''}${extra.erupt ? `/${extra.erupt}` : ''}`
    const a = renderAt(mod, variant, 0, extra)
    const b = renderAt(mod, variant, meta.duration, extra)
    ok(a.rgba.every((v, i) => v === b.rgba[i]), `효과 '${name}' 의 고리 이음매 — t=0 과 t=고리 길이가 다르다`)
    const frames = Array.from({ length: Math.round(n) }, (_, i) => renderAt(mod, variant, i / FPS, extra))
    ok(frames.some((f, i) => i > 0 && f.rgba.some((v, j) => v !== frames[0].rgba[j])), `효과 '${name}' 가 움직이지 않는다`)
    ok(frames.every((f) => f.rgba.some((v, j) => j % 4 === 3 && v > 0)), `효과 '${name}' 에 빈 프레임이 있다`)
    sheet.push(frames)
  }
}

// --- 타일이 그린 효과 자리 — 데이터 id ---
const { ringsFor } = await import(`${ROOT}src/pixel/rings.ts`)
const { renderTile } = await import(`${ROOT}src/pixel/raster/world.ts`)
const { gridFor } = await import(`${ROOT}src/pixel/raster/fill.ts`)
const { decodeTerrain } = await import(`${ROOT}src/pixel/raster/terrain.ts`)
const { buildPixelTerrain } = await import(`${ROOT}scripts/pixel/terrain.mjs`)
const raw = await buildPixelTerrain()
const d = decodeTerrain(raw)
const LS = await Promise.all(['sejiri', 'akoum', 'tazeem', 'murasa', 'ondu', 'guul-draz', 'bala-ged'].map((n) => import(`${ROOT}src/data/landscape/${n}.ts`)))
const land = LS.map((m) => m.landscape)
const glyphs = land.flatMap((l) => l.glyphs ?? [])
const sea = land.flatMap((l) => l.sea ?? [])
const areas = land.flatMap((l) => l.areas ?? [])
const want = {
  waterfall: new Set(glyphs.filter((g) => g.kind === 'waterfall').map((g) => g.id)),
  geyser: new Set(glyphs.filter((g) => g.kind === 'geyser').map((g) => g.id)),
  whirl: new Set(sea.filter((m) => m.kind === 'whirl').map((m) => m.id)),
  lava: new Set(areas.filter((a) => a.kind === 'lava').map((a) => a.id)),
}
const seen = { waterfall: new Set(), geyser: new Set(), whirl: new Set(), lava: new Set() }
let spots = 0
let drawn = 0
let skipped = 0
const { fxBox } = await import(`${ROOT}src/pixel/fx/effects.ts`)
for (const u of [2, 1]) {
  // 한 자리의 몫을 모은다 (fx/layer.ts 의 groupFx 와 같다) — 몫이 모두 깨끗하고 기준점의 몫이 있으면 그린다
  const groups = new Map()
  const g = gridFor(2400, 1700, u)
  for (let ty = 0; ty * 256 < g.h; ty++)
    for (let tx = 0; tx * 256 < g.w; tx++) {
      const t = { x0: tx * 256, y0: ty * 256, w: Math.min(256, g.w - tx * 256), h: Math.min(256, g.h - ty * 256) }
      const fx = []
      renderTile(ringsFor(u), u, t, pal, { shore: 'dither', terrain: d, fx, fxBox })
      for (const s of fx) {
        spots++
        ok(want[s.k]?.has(s.id), `효과 자리 ${s.k} (${s.x}, ${s.y}) 의 id '${s.id}' 가 그 종류의 데이터에 없다`)
        const inside = s.x >= t.x0 && s.x < t.x0 + t.w && s.y >= t.y0 && s.y < t.y0 + t.h
        ok(inside === s.main, `효과 자리 ${s.k} '${s.id}' 의 main(${s.main})이 기준점이 타일 안인지(${inside})와 다르다`)
        const key = `${s.k}|${s.x}|${s.y}|${s.v}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(s)
      }
    }
  for (const parts of groups.values()) {
    const mains = parts.filter((p) => p.main)
    ok(mains.length === 1, `효과 자리 ${parts[0].k} '${parts[0].id}' 의 기준점 몫이 ${mains.length}개`)
    if (mains.length === 1 && parts.every((p) => p.clean)) {
      drawn++
      seen[parts[0].k]?.add(parts[0].id)
    } else skipped++
  }
}
for (const [k, ids] of Object.entries(want)) for (const id of ids) ok(seen[k].has(id), `${k} '${id}' 에 어느 단계에서도 효과가 없다`)
ok(Object.keys(EFFECT_FILES).sort().join() === Object.keys(want).sort().join(), `효과 모듈(${Object.keys(EFFECT_FILES)})과 효과 종류가 다르다`)

// 시점별 바탕(S6)의 폭포 — 2009·2010 의 Umung 강 계단 물길·Bojuka Bay 폭포는 그 시점의 타일에서 효과가 붙는다 (데이터 id 는 그 무렵의 항목)
const { decodePeriod } = await import(`${ROOT}src/pixel/raster/period.ts`)
const { withPeriod } = await import(`${ROOT}src/pixel/raster/terrain.ts`)
const withP = await buildPixelTerrain({ fine: false, periods: true })
const periodFalls = []
for (const [L, p] of Object.entries(withP.periods)) {
  const falls = p.worker.marks.filter((m) => m.k === 'waterfall')
  if (!falls.length) continue
  const dp = withPeriod(d, decodePeriod(p.worker, raw.kinds, raw.hatch.length / 4), raw.kinds)
  for (const m of falls) {
    let got = false
    for (const u of [2, 1]) {
      const px = Math.floor(m.x / 10 / u)
      const py = Math.floor(m.y / 10 / u)
      const t = { x0: Math.floor(px / 256) * 256, y0: Math.floor(py / 256) * 256, w: 256, h: 256 }
      const fx = []
      renderTile(ringsFor(u), u, t, pal, { shore: 'dither', terrain: dp, fx, fxBox })
      if (fx.some((s) => s.k === 'waterfall' && s.id === m.id && s.main)) got = true
    }
    ok(got, `단계 ${L}: 그 무렵의 폭포 '${m.id}' 에 효과가 없다`)
    if (got) periodFalls.push(`${m.id}@L${L}`)
  }
}
console.log(`시점별 바탕의 폭포 효과 ${periodFalls.length} — ${periodFalls.join(', ')}`)

if (opt('sheet', null)) {
  const Z = 8
  const W = Math.max(...sheet.map((r) => r.reduce((s, f) => s + f.w + 1, 0))) * Z
  const H = sheet.reduce((s, r) => s + Math.max(...r.map((f) => f.h)) + 1, 0) * Z
  const out = new Uint8ClampedArray(W * H * 4)
  const bg = [0x5b, 0x3a, 0x30]
  for (let i = 0; i < W * H; i++) out.set([...bg, 255], i * 4)
  let y0 = 0
  for (const row of sheet) {
    let x0 = 0
    for (const f of row) {
      for (let y = 0; y < f.h * Z; y++)
        for (let x = 0; x < f.w * Z; x++) {
          const s = (((y / Z) | 0) * f.w + ((x / Z) | 0)) * 4
          const a = f.rgba[s + 3] / 255
          const o = ((y0 * Z + y) * W + x0 * Z + x) * 4
          for (let c = 0; c < 3; c++) out[o + c] = f.rgba[s + c] * a + out[o + c] * (1 - a)
        }
      x0 += f.w + 1
    }
    y0 += Math.max(...row.map((f) => f.h)) + 1
  }
  const raw2 = Buffer.alloc((W * 4 + 1) * H)
  for (let y = 0; y < H; y++) out.subarray(y * W * 4, (y + 1) * W * 4).forEach((v, i) => (raw2[y * (W * 4 + 1) + 1 + i] = v))
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
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  fs.writeFileSync(opt('sheet'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw2)), chunk('IEND', Buffer.alloc(0))]))
  console.log(`효과 그림판 → ${opt('sheet')}`)
}

console.log(
  `효과 ${Object.keys(EFFECT_FILES).length}가지 · 한 픽셀 2·1 단위에서 효과 몫 ${spots}개 · 그리는 자리 ${drawn} (겹쳐 멈춘 그림으로 두는 자리 ${skipped}) — 폭포 ${seen.waterfall.size}/${want.waterfall.size} · 간헐천 ${seen.geyser.size}/${want.geyser.size} · 소용돌이 ${seen.whirl.size}/${want.whirl.size} · 용암 들판 ${seen.lava.size}/${want.lava.size}`,
)
console.log(fail ? `실패 ${fail}` : '통과')
process.exit(fail ? 1 : 0)
