// 페이즈 바탕 검사 — 개발 서버(pnpm dev)에 띄운 지도에서 src/map/period.ts 를 불러 단계 1–5 의 바탕(PeriodView)을 만들어 본다.
//   node scripts/qa/period-check.mjs [--base http://localhost:5361] [--loads 2] [--json 결과.json] [--time 1,2,3,4]
// --time 은 시점별 보기(?time=t)의 시점 — 그 시점의 바탕 단계(src/data/timeline.ts 의 periodLevel: T1 2, T2 3, T3 4, T4 5)만 보고, 지도는 ?time=<첫 시점> 으로 연다.
// 시점별 보기는 바탕을 사가 보기와 같은 엔진·같은 단계로 그리므로 이 검사는 그 단계의 검사와 같고, 결과에 시점을 붙인다
// 세계 지도 축척은 바탕 지형의 기록(terrain.ts 의 terrainLogOf)이 있으면 그것을 다시 잇고(B — periodTerrain.ts 의 replayTerrain),
// 없으면 켠 항목의 페이즈로 buildTerrain 을 바로 다시 돌린다(A). 그래서 이 검사는
// 1. 아무것도 바꾸지 않는 페이즈로 다시 만든 지형이 바탕과 문자열까지 같다 (terrain.ts 의 assertNeutralPhase — 세계 지도와 깊은 확대 칸 몇 개,
//    기록이 있으면 다시 잇기로도)
// 2. 단계마다 결정적이다 — 새로 만든 createPeriods() 두 번, 그리고 페이지를 새로 불러(--loads) 만든 결과의 지문이 같다
// 3. A/B — 판정을 센 페이즈로 buildTerrain 을 바로 다시 돌린 지형(A)이 at() 의 지형(기록이 있으면 B)과 문자열까지 같다
// 4. 깊은 확대 칸 — 항목에 닿는 칸은 열쇠(~p…)와 페이즈가 있고 두 번 만들면 같으며, 닿지 않는 칸은 열쇠가 비고 페이즈가 없다
// 를 보고, 단계마다 기호 수(남김·뺌·죽은 나무, 더한 기호), 바뀐 칸, 칠 path 길이, 걸린 시간을 적는다. 어긋나면 1 로 끝난다.
// headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import fs from 'node:fs'
import { launchChrome } from './chrome.mjs'

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', 'http://localhost:5361')
const LOADS = Number(arg('loads', 2))
const JSON_OUT = arg('json', '')
const { TIMES } = await import('../../src/data/timeline.ts')
const TIME_ARG = arg('time', '')
/** 볼 시점 (--time) — 없으면 [] */
const TIMES_RUN = TIME_ARG ? TIME_ARG.split(',').map(Number) : []
for (const t of TIMES_RUN) if (!TIMES.some((x) => x.t === t)) throw new Error(`--time 은 ${TIMES.map((x) => x.t).join('·')} 가운데 — '${t}'`)
/** 볼 단계 — 시점이면 그 바탕 단계, 아니면 1–5 */
const LEVELS_RUN = TIMES_RUN.length ? [...new Set(TIMES_RUN.map((t) => TIMES[t - 1].periodLevel))] : [1, 2, 3, 4, 5]
/** 단계를 부르는 이름 — 시점이면 '시점 t (단계 L)' */
const levelName = (level) => {
  const ts = TIMES_RUN.filter((t) => TIMES[t - 1].periodLevel === level)
  return ts.length ? `시점 ${ts.join('·')} (단계 ${level})` : `단계 ${level}`
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 페이지 안에서 — 앱이 이미 불러온 모듈 주소(terrain.ts·raster.ts)를 그대로 써서 같은 모듈(래스터 캐시)을 공유한다
const PAGE_SRC = String.raw`(async () => {
  const urlOf = (p) => {
    const hit = performance.getEntriesByType('resource').map((e) => e.name).filter((x) => new URL(x).pathname === p)
    if (!hit.length) return p
    const u = new URL(hit[hit.length - 1]); return u.pathname + u.search
  }
  const T = await import(urlOf('/src/map/terrain.ts'))
  const R = await import(urlOf('/src/map/raster.ts'))
  const P = await import('/src/map/period.ts')
  const PT = await import('/src/map/periodTerrain.ts')
  const svg = document.querySelector('svg.zendikar-map')
  const fk = Object.keys(svg).find((k) => k.startsWith('__reactFiber$'))
  let input, terrain, riverShapes, rivers, props
  for (let fiber = svg[fk]; fiber; fiber = fiber.return) {
    const mp = fiber.memoizedProps
    if (!props && mp && mp.landscape && mp.continents && mp.locations) props = mp
    for (let h = fiber.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) {
      const v = Array.isArray(h.memoizedState) && h.memoizedState.length === 2 ? h.memoizedState[0] : undefined
      if (!v || typeof v !== 'object') continue
      if (v.profileFor && v.patches && v.labelBoxes) input ??= v
      if (v.mountains && 'gorgeFloors' in v) terrain ??= v
      if (Array.isArray(v) && v.length && v[0] && v[0].samples && v[0].widths) riverShapes ??= v
      if (Array.isArray(v.water) && Array.isArray(v.banks) && !('mountains' in v)) rivers ??= v
    }
    if (input && terrain && riverShapes && rivers && props) break
  }
  if (!input || !terrain || !riverShapes || !rivers || !props) throw new Error('지도에서 지형 입력·바탕 지형·강·props 를 찾지 못했다')
  // 바탕 지형의 기록 — terrain.ts 가 기록하면(terrainLogOf) 다시 잇기(B)를 쓴다
  const log = typeof T.terrainLogOf === 'function' ? T.terrainLogOf(terrain) : undefined
  const ctx = { terrain, log, input, riverShapes, landscape: props.landscape, avoid: input.avoid, continents: props.continents, locations: props.locations }
  const fails = []
  const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16).padStart(8, '0') }
  // 'M' 명령 수 — 기호 수를 어림한다 (숲 수관 셋, 늪 다섯 …)
  const ms = (ds) => ds.reduce((n, d) => n + (d.match(/M/g)?.length ?? 0), 0)
  const fills = (bands, k) => bands.reduce((n, b) => n + (b[k].match(/M/g)?.length ?? 0), 0)
  const changedTiles = (a, b) => { let n = 0; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) n++; return n }
  const viewSig = (v) => JSON.stringify({
    key: v.key, terrain: v.terrain, washes: v.washes && { world: v.washes.world, deep: v.washes.deep() }, basin: v.basin && { world: v.basin.world, deep: v.basin.deep() },
    rivers: v.rivers, extraRivers: v.extraRivers, landmarks: v.landmarks, marks: [...v.marks], dryLabels: [...v.dryLabels], legend: v.legend,
  })

  // 1. 아무것도 바꾸지 않는 페이즈 — 세계 지도
  const neutralWorld = T.assertNeutralPhase(input, terrain)
  if (neutralWorld.length) fails.push('세계 지도: 아무것도 바꾸지 않는 페이즈로 다시 만든 지형이 바탕과 다르다 — ' + neutralWorld.join(', '))
  const NEUTRAL = { key: '', hideLines: new Set(), prepare: () => ({ verdict: () => 0, peaks: [], marsh: [], period: { dust: [], chalk: [], drybed: [] }, dead: () => '' }) }
  let neutralReplay = null
  if (log) {
    const t0 = performance.now()
    const { period, ...rest } = PT.replayTerrain(terrain, log, input, NEUTRAL)
    neutralReplay = +(performance.now() - t0).toFixed(1)
    if (JSON.stringify(rest) !== JSON.stringify(terrain) || Object.values(period).some((l) => l.length))
      fails.push('세계 지도: 아무것도 바꾸지 않는 페이즈로 바탕 기록을 다시 이은 지형이 바탕과 다르다')
  }

  const raster = R.getTerrainRaster()
  const src = P.periodSourcesOf(ctx)
  const levels = []
  for (const level of __LEVELS__) {
    const t0 = performance.now()
    const v = P.createPeriods().at(level, ctx)
    const ms1 = performance.now() - t0
    if (!v) { levels.push({ level, view: false }); continue }
    const t1 = performance.now()
    const sig = viewSig(v)
    const msPaths = performance.now() - t1
    // 2. 결정성 — 새 createPeriods 로 다시
    const again = viewSig(P.createPeriods().at(level, ctx))
    if (again !== sig) fails.push('단계 ' + level + ': 같은 입력으로 두 번 만든 바탕이 다르다')
    // 3. 판정을 세며 다시 — at() 의 지형과 같아야 한다
    const { rules, phase } = P.periodPhase(level, src)
    const counts = { keep: {}, drop: {}, dead: {} }
    let added = null
    const counted = { ...phase, prepare(probe, near) {
      const plan = phase.prepare(probe, near)
      added = { peaks: plan.peaks.length, marsh: plan.marsh.length, dust: plan.period.dust.length, chalk: plan.period.chalk.length, drybed: plan.period.drybed.length }
      return { ...plan, verdict(k, x, y) { const r = plan.verdict(k, x, y); const c = counts[['keep', 'drop', 'dead'][r]]; c[k] = (c[k] ?? 0) + 1; return r } }
    } }
    const t2 = performance.now()
    const tc = T.buildTerrain(input, undefined, counted)
    const msA = performance.now() - t2
    if (JSON.stringify(tc) !== JSON.stringify(v.terrain))
      fails.push('단계 ' + level + (log ? ': A/B — 바로 적용(buildTerrain)과 다시 잇기(replayTerrain)가 다르다' : ': 판정을 세며 다시 돌린 지형이 at() 의 지형과 다르다'))
    let msB = null
    if (log) {
      const t3 = performance.now()
      PT.replayTerrain(terrain, log, input, phase)
      msB = +(performance.now() - t3).toFixed(1)
    }
    const tt = v.terrain
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0)
    const stat = {
      level, key: v.key, msView: +ms1.toFixed(1), msPaths: +msPaths.toFixed(1), msBuildTerrain: +msA.toFixed(1), msReplay: msB, hash: fnv(sig),
      verdict: { keep: sum(counts.keep), drop: counts.drop, dead: counts.dead },
      added,
      glyphs: {
        treeCrowns: [ms(terrain.trees.crowns) / 3, ms(tt.trees.crowns) / 3],
        marshM: [ms(terrain.marsh), ms(tt.marsh)],
        peakFills: [fills(terrain.mountains, 'fill'), fills(tt.mountains, 'fill')],
        crystalFills: [fills(terrain.mountains, 'crystal'), fills(tt.mountains, 'crystal')],
        bands: [terrain.mountains.length, tt.mountains.length],
        period: tt.period ? { dustM: ms(tt.period.dust), chalkM: ms(tt.period.chalk), drybedM: ms(tt.period.drybed), deadwoodM: ms(tt.period.deadwood) } : null,
      },
      tiles: {
        crowns: [terrain.trees.crowns.length, tt.trees.crowns.length, changedTiles(terrain.trees.crowns, tt.trees.crowns), tt.trees.crowns.filter((d) => !d).length],
        marsh: [terrain.marsh.length, tt.marsh.length, changedTiles(terrain.marsh, tt.marsh), tt.marsh.filter((d) => !d).length],
        cliffs: [terrain.cliffs.length, tt.cliffs.length, changedTiles(terrain.cliffs, tt.cliffs)],
        gorgeFloors: [terrain.gorgeFloors.length, tt.gorgeFloors.length],
        mountainBandsChanged: changedTiles(terrain.mountains.map((b) => JSON.stringify(b)), tt.mountains.map((b) => JSON.stringify(b))),
      },
      paint: v.washes ? Object.fromEntries(Object.entries(v.washes.world).map(([k, s]) => [k, Array.isArray(s) ? s.length : s.length])) : null,
      paintDeep: v.washes ? Object.fromEntries(Object.entries(v.washes.deep()).map(([k, s]) => [k, Array.isArray(s) ? s.length : s.length])) : null,
      basin: v.basin ? { floor: v.basin.world.floor.length, pools: v.basin.world.pools.length, floorDeep: v.basin.deep().floor.length } : null,
      rivers: v.rivers ? { waterTilesChanged: changedTiles(rivers.water, v.rivers.water), banksTilesChanged: changedTiles(rivers.banks, v.rivers.banks) } : null,
      extraRivers: v.extraRivers ? { water: v.extraRivers.water.length, banks: v.extraRivers.banks.length, dry: v.extraRivers.dry.length } : null,
      landmarks: v.landmarks?.length ?? 0,
      marks: [...v.marks].map(([k, m]) => k + ':' + m),
      dryLabels: [...v.dryLabels],
      legend: v.legend,
      features: { place: ['tangled-vales', 'oran-rief', 'halimar', 'lake-of-dust', 'spikefields', 'umung-river', 'bojuka-bay', 'guum-wilds'].map((id) => id + ':' + v.featuresOf(id, 'place').length + '/' + v.notesOf(id).length) },
    }
    if (tt.period && Object.values(tt.period).some((l) => l.some((d) => d === undefined))) fails.push('단계 ' + level + ': 페이즈 층에 빈 칸이 아닌 undefined 가 있다')
    // 4. 깊은 확대 칸 — 항목마다 그 범위 가운데의 칸(단계 3, 칸 25 단위)과 지도 구석의 칸
    const fine = []
    const LV = 3
    const size = 200 * 2 ** -LV
    for (const r of rules.reach) {
      const cx = (r.bounds.x0 + r.bounds.x1) / 2
      const cy = (r.bounds.y0 + r.bounds.y1) / 2
      const tx = Math.floor(cx / size), ty = Math.floor(cy / size)
      const region = { x0: tx * size, y0: ty * size, x1: (tx + 1) * size, y1: (ty + 1) * size }
      const key = v.fine.keyFor(LV, region)
      const ph = v.fine.phaseFor(LV, region)
      if (!key.includes(r.id) || !ph) { fails.push('단계 ' + level + ': 깊은 확대 칸 ' + tx + ',' + ty + ' 에 닿는 ' + r.id + ' 가 열쇠·페이즈에 없다 (' + key + ')'); continue }
      const lod = { g: 2 ** -LV, region, seed: 'fine:' + LV + ':' + tx + ':' + ty, geo: raster, phase: ph }
      const a = JSON.stringify(T.buildTerrain(input, lod))
      const b = JSON.stringify(T.buildTerrain(input, { ...lod, phase: v.fine.phaseFor(LV, region) }))
      if (a !== b) fails.push('단계 ' + level + ': 깊은 확대 칸 ' + tx + ',' + ty + ' 를 두 번 만든 결과가 다르다')
      const base = { g: 2 ** -LV, region, seed: lod.seed, geo: raster }
      const bad = T.assertNeutralPhase(input, T.buildTerrain(input, base), base)
      if (bad.length) fails.push('깊은 확대 칸 ' + tx + ',' + ty + ': 아무것도 바꾸지 않는 페이즈로 다시 만든 칸이 바탕 칸과 다르다 — ' + bad.join(', '))
      fine.push({ id: r.id, tile: tx + ',' + ty, key, hash: fnv(a) })
    }
    const far = { x0: 0, y0: 0, x1: size, y1: size }
    if (v.fine.keyFor(LV, far) !== '' || v.fine.phaseFor(LV, far)) fails.push('단계 ' + level + ': 아무 항목도 닿지 않는 칸에 열쇠·페이즈가 있다')
    stat.fine = fine
    levels.push(stat)
  }
  // 끔(0)·모르는 단계는 바탕이 없다
  for (const off of [0, 6, -1]) if (P.createPeriods().at(off, ctx)) fails.push('단계 ' + off + ' 에 바탕이 있다 (끔은 늘 바탕 그대로여야)')
  return { fails, levels, log: log ? { symbols: log.kinds.length, pieces: log.pieces.sym.length, glyphs: log.glyphs.sym.length, bytes: log.xs.byteLength * 2 + Object.values(log.pieces).reduce((n, a) => n + a.byteLength, 0) + log.glyphs.sym.byteLength + log.glyphs.lens.byteLength, neutralReplay } : null }
})()`
const PAGE = PAGE_SRC.replace('__LEVELS__', JSON.stringify(LEVELS_RUN))

const chrome = await launchChrome({ width: 1440, height: 900 })
let failed = 0
const runs = []
try {
  for (let i = 0; i < LOADS; i++) {
    const { sessionId, targetId } = await chrome.newPage(`${BASE}/${TIMES_RUN.length ? `?time=${TIMES_RUN[0]}` : ''}`, { w: 1440, h: 900 })
    // 첫 렌더와 바탕 지형을 기다린다
    for (let k = 0; k < 60; k++) {
      const r = await chrome.send('Runtime.evaluate', { expression: "!!document.querySelector('svg.zendikar-map .terrain-scatter')", returnByValue: true }, sessionId)
      if (r.result.value) break
      await sleep(250)
    }
    const res = await chrome.send('Runtime.evaluate', { expression: PAGE, awaitPromise: true, returnByValue: true }, sessionId)
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text)
    runs.push(res.result.value)
    await chrome.send('Target.closeTarget', { targetId })
  }
} finally {
  await chrome.close()
}

for (const [i, r] of runs.entries()) for (const f of r.fails) {
  failed++
  console.error(`✗ [불러오기 ${i + 1}] ${f}`)
}
// 페이지를 새로 불러도 같은 지문
for (let i = 1; i < runs.length; i++)
  for (const l of runs[0].levels) {
    const o = runs[i].levels.find((x) => x.level === l.level)
    if (o?.hash !== l.hash) {
      failed++
      console.error(`✗ 단계 ${l.level}: 페이지를 새로 불러 만든 바탕의 지문이 다르다 (${l.hash} / ${o?.hash})`)
    }
    for (const [k, f] of (l.fine ?? []).entries())
      if (o?.fine?.[k]?.hash !== f.hash) {
        failed++
        console.error(`✗ 단계 ${l.level}: 깊은 확대 칸 ${f.tile} 의 지문이 페이지마다 다르다`)
      }
  }

console.log(runs[0].log ? `바탕 지형의 기록: 기호 ${runs[0].log.symbols} · 칸 조각 ${runs[0].log.pieces} · 산 띠 봉우리 ${runs[0].log.glyphs} · 숫자 ${(runs[0].log.bytes / 1024).toFixed(0)}KB · 아무것도 바꾸지 않는 다시 잇기 ${runs[0].log.neutralReplay}ms — 세계 지도는 다시 잇기(B), A/B 대조`
  : '바탕 지형의 기록이 없다(terrain.ts 에 terrainLogOf 가 없다) — 세계 지도는 바로 적용(A)')
for (const l of runs[0].levels) {
  console.log(`\n== ${levelName(l.level)}  key=${l.key}`)
  console.log(`  시간(개발 서버): at() ${l.msView}ms (A buildTerrain ${l.msBuildTerrain}ms${l.msReplay != null ? ` · B replayTerrain ${l.msReplay}ms` : ''}) · 칠 path(깊은 확대 포함) ${l.msPaths}ms · 지문 ${l.hash}`)
  console.log(`  판정: 남김 ${l.verdict.keep} · 뺌 ${JSON.stringify(l.verdict.drop)} · 죽은 나무 ${JSON.stringify(l.verdict.dead)}`)
  console.log(`  더한 기호: ${JSON.stringify(l.added)}`)
  console.log(`  기호 [바탕, 이 단계]: ${JSON.stringify(l.glyphs)}`)
  console.log(`  칸 [바탕 수, 이 단계 수, 바뀐 칸, 빈 칸]: ${JSON.stringify(l.tiles)}`)
  console.log(`  칠 path 길이(세계 지도): ${JSON.stringify(l.paint)} · 깊은 확대: ${JSON.stringify(l.paintDeep)} · 바닥: ${JSON.stringify(l.basin)}`)
  console.log(`  강: ${JSON.stringify(l.rivers)} · 그 무렵의 강: ${JSON.stringify(l.extraRivers)} · 폭포 ${l.landmarks}`)
  console.log(`  표시: ${l.marks.join(' ')} · 물빛 뗀 이름: ${l.dryLabels.join(' ')} · 범례: ${l.legend.join(' ')}`)
  console.log(`  패널(지형/이 무렵): ${l.features.place.join(' ')}`)
  console.log(`  깊은 확대 칸: ${l.fine.map((f) => `${f.id}@${f.tile}`).join(' ')}`)
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(runs, null, 1))
console.log(failed ? `\n✗ ${failed} 건 어긋남` : `\n✓ ${TIMES_RUN.length ? LEVELS_RUN.map(levelName).join(', ') : '단계 1–5'} 모두 만들어지고, 바탕과 같음(아무것도 바꾸지 않는 페이즈)·결정성(${LOADS}번 불러오기)·깊은 확대 칸 검사를 통과`)
process.exit(failed ? 1 : 0)
