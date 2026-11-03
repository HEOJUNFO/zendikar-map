// 페이즈 바탕의 자리 없는 장소 표시와 떨어진 하늘거주지 기호 시험 (사가4 — 단계 7·8 의 에메리아) — 지어낸 바탕 항목 묶음(픽스처)으로 본다.
// 실제 항목은 src/data/periods/tazeem.ts 의 emeria-2023-*·mark-emeria-2023 이다 — 이 시험은 엔진이 그 모양을 받는지만 본다.
//   node scripts/qa/period-mark-test.mjs [--base http://localhost:5173]
// 1. checkPeriods(P2): 자리가 없는 장소(에메리아)의 표시는 그 표시가 되는 대지 카드(Emeria, the Sky Ruin)로 바꿀 수 있고, 숨길 수 없다. 표시도 없는 장소는 받지 않는다
// 2. checkPeriods: 떨어진 하늘거주지 기호(glyphs 의 crashed-skyclave)는 자리를 이 지도가 고른 것이라 estimate 가 있어야 한다
// 3. periodMarkProblems·timeMarkProblems(M1·M2·V6): 폐허로 바꾼 자리 없는 장소는 그 장소를 가리키는 카드를 막지 않는다
// 3b. src/data/labelAvoid.ts 의 이름이 비키는 상자가 표(GLYPH_CLEAR)의 기호를 그린 상자와 같다
// 4. (--base 가 있으면) 개발 서버의 브라우저에서: 표(GLYPH_CLEAR)의 기호마다 — 그림 전체를 비우는 기호(떨어진 하늘거주지·흰 금속 땅)는 그림이 그 원 안에 들고, 막힘 마스크가 그 그림이 덮는 자리를
//    (흰 금속 땅은 원 안의 가장자리 밖을 남기고 — glyphClearTest), 나머지는 그 원을 비우며,
//    periodTerrain 의 GLYPH_REACH·scripts/childmaps/periods.mjs 의 glyphClear 가 그 원을 덮는다
// 하나라도 어긋나면 종료 코드 1. headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import { LAND_CARDS } from '../../src/data/cards.ts'
import { placeMarkCardOf, placeMarkOf } from '../../src/data/landFace.ts'
import { locations } from '../../src/data/locations.ts'
import { periodMarkProblems, timeMarkProblems } from '../../src/data/periods/check.ts'
import { checkPeriods, PERIODS } from '../../src/data/periods/index.ts'
import { PERIOD_LABEL_AVOID } from '../../src/data/labelAvoid.ts'
import { GLYPH_CLEAR, landmarkBox, landmarkParts } from '../../src/map/landscapeGlyphs.ts'
import { glyphClear } from '../childmaps/periods.mjs'
import { launchChrome } from './chrome.mjs'

let failed = 0
const ok = (cond, msg) => {
  if (cond) console.log(`✓ ${msg}`)
  else {
    failed++
    console.log(`✗ ${msg}`)
  }
}
const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const BASE = arg('base')

const emeria = locations.find((l) => l.id === 'emeria')
const pinCard = placeMarkCardOf(emeria, LAND_CARDS)
const pin = placeMarkOf(emeria, LAND_CARDS)
ok(emeria.placement === 'unplaced' && pinCard?.id === 'emeria-the-sky-ruin' && pin?.join() === pinCard.at.join(), "에메리아는 자리가 없고 그 표시는 'Emeria, the Sky Ruin' 카드 표시다")

const EMPTY = { grounds: [], reliefs: [], drains: [], rivers: [], glyphs: [], hides: [], marks: [], labels: [] }
const mark = (over = {}) => ({ id: 'test-emeria-mark', op: 'test', place: 'emeria', kind: 'ruin', levels: [7, 8], basis: '시험 근거', ...over })
// 땅 위 자리 — 시험용 (실제 추락 자리는 tazeem.ts 의 emeria-2023-crash)
const wreck = (over = {}) => ({ id: 'test-crashed-skyclave', op: 'test', kind: 'crashed-skyclave', at: [1004, 620], levels: [8], label: '시험 추락', location: 'emeria', basis: '시험 근거', estimate: '시험 추정', ...over })
const errorsOf = (set) => {
  try {
    checkPeriods({ ...EMPTY, ...set })
    return []
  } catch (e) {
    return String(e.message).split('\n')
  }
}

// 1. 자리 없는 장소의 표시
ok(errorsOf({ marks: [mark()] }).length === 0, 'P2: 자리 없는 장소(에메리아)의 표시를 단계 7·8 에 폐허로 바꿀 수 있다')
ok(errorsOf({ marks: [mark({ kind: null })] }).some((e) => e.includes('숨기지 않는다')), 'P2: 자리 없는 장소의 표시는 숨기지 않는다 (그 카드 표시가 곧 그 장소)')
{
  const lost = { id: 'test-lost', name: 'Test Lost', kind: 'ruin', continentId: 'tazeem', description: '', prominence: 0, sources: [], placement: 'unplaced' }
  locations.push(lost)
  try {
    ok(errorsOf({ marks: [mark({ place: 'test-lost' })] }).some((e) => e.includes("'test-lost'")), 'P2: 자리도 표시도 없는 장소는 받지 않는다')
  } finally {
    locations.pop()
  }
}
{
  const region = locations.find((l) => l.kind === 'region' && l.placement !== 'unplaced')
  ok(errorsOf({ marks: [mark({ place: region.id })] }).length > 0, `P2: 지역 이름(${region.id})은 표시가 없어 받지 않는다`)
}
ok(errorsOf({ marks: [mark(), mark({ id: 'test-emeria-mark-2', levels: [8] })] }).some((e) => e.includes('겹친다')), 'P4: 한 장소·한 단계에 표시 바꿈은 하나')
ok(errorsOf({ marks: [mark({ levels: [9] })] }).length > 0, 'P1: 단계는 1–8')

// 2. 떨어진 하늘거주지 기호
ok(errorsOf({ glyphs: [wreck()] }).length === 0, '기호: 떨어진 하늘거주지(crashed-skyclave)를 단계 8 에 그 자리에 둔다')
ok(errorsOf({ glyphs: [wreck({ estimate: undefined })] }).some((e) => e.includes('estimate')), '기호: 이 지도가 고른 자리라 estimate 가 있어야 한다')
ok(errorsOf({ marks: [mark()], glyphs: [wreck()] }).length === 0, '표시 바꿈과 기호를 함께')
ok(glyphClear(wreck()) === 20 && glyphClear(wreck({ size: 1.5 })) === 30 && glyphClear({ kind: 'waterfall' }) === 10, 'glyphClear: 떨어진 하늘거주지는 크기 1 에 20 (폭포는 그대로 10)')
// 사가4 의 2023년 기호 — 표(landscapeGlyphs.ts 의 GLYPH_CLEAR)의 |dy| + r
ok(
  glyphClear({ kind: 'compleated-ground', size: 2 }) === 29 && glyphClear({ kind: 'compleated-skyclave' }) === 16 && glyphClear({ kind: 'realmbreaker-sky' }) === 5.5 && glyphClear({ kind: 'realmbreaker-sea' }) === 7,
  'glyphClear: 2023년 기호는 GLYPH_CLEAR 의 |dy| + r (흰 금속 땅 크기 2 에 29, 떠 있는 하늘거주지 16, 가지 5.5·7)',
)

// 3. 카드 검사 — 폐허로 바꾼 자리 없는 장소는 그 장소를 가리키는 카드(그 표시인 대지 카드, 페이즈 카드)를 막지 않는다
{
  const set = { ...EMPTY, marks: [mark()] }
  const phaseCards = [{ id: 'test-card', name: 'Test Card', set: 'znr', depicts: { type: 'location', id: 'emeria' } }]
  const input = { phaseCards, phaseOf: new Map([['test-card', 6]]), lastOf: new Map(), landCards: LAND_CARDS, landPhase: () => undefined, sagaPlaceCards: new Map() }
  ok(periodMarkProblems(input, set).length === 0, 'M1·M2: 폐허로 바꾼 에메리아는 카드를 막지 않는다')
  ok(timeMarkProblems({ phaseCards, landCards: LAND_CARDS, sagaPlaceCards: new Map() }, set).length === 0, 'V6: 시점판도 같다')
}

// 3b. 이름이 비키는 상자 (src/data/labelAvoid.ts) — 표(GLYPH_CLEAR)의 기호마다 그린 상자를 0.1 단위 바깥으로 올린 값과 같다
{
  const want = {}
  for (const g of PERIODS.glyphs) {
    if (!GLYPH_CLEAR[g.kind]) continue
    const b = landmarkBox(landmarkParts(g))
    const box = { x0: Math.floor(b.x0 * 10) / 10, y0: Math.floor(b.y0 * 10) / 10, x1: Math.ceil(b.x1 * 10) / 10, y1: Math.ceil(b.y1 * 10) / 10 }
    for (const l of g.levels) (want[l] ??= []).push({ ...box, id: g.id })
  }
  const key = (b) => [b.x0, b.y0, b.x1, b.y1].join(',')
  const levels = [...new Set([...Object.keys(want), ...Object.keys(PERIOD_LABEL_AVOID)])].map(Number).sort((a, b) => a - b)
  for (const l of levels) {
    const w = (want[l] ?? []).map(key).sort().join(' ')
    const got = (PERIOD_LABEL_AVOID[l] ?? []).map(key).sort().join(' ')
    if (w !== got) console.log(`  단계 ${l} 의 값:\n${(want[l] ?? []).map((b) => `    { x0: ${b.x0}, y0: ${b.y0}, x1: ${b.x1}, y1: ${b.y1} }, // ${b.id}`).join('\n')}`)
    ok(w === got, `labelAvoid: 단계 ${l} 의 이름이 비키는 상자 ${(want[l] ?? []).length}개가 그 무렵 기호의 상자와 같다`)
  }
}

// 4. 브라우저 — 그림·막힘·닿는 범위
if (BASE) {
  const chrome = await launchChrome({ width: 800, height: 600, maxMinutes: 5 })
  try {
    const { sessionId, targetId } = await chrome.newPage(`${BASE}/?view=1000,620,4`, { w: 800, h: 600 })
    await new Promise((r) => setTimeout(r, 4000))
    const { result } = await chrome.send(
      'Runtime.evaluate',
      {
        awaitPromise: true,
        returnByValue: true,
        expression: `(async () => {
          const g = await import('/src/map/landscapeGlyphs.ts')
          const l = await import('/src/map/landscape.ts')
          const p = await import('/src/map/periodTerrain.ts')
          const out = []
          // 그림 전체가 비우는 원 안에 드는 기호 (가지·떠 있는 하늘거주지는 밑동 둘레만 비워 그림이 원 밖으로 나간다 — 그림 검사는 하지 않는다)
          const WHOLE = ['crashed-skyclave', 'compleated-ground', 'compleated-ground-oil']
          for (const kind of Object.keys(g.GLYPH_CLEAR)) for (const size of [0.6, 1, 1.8]) {
            const C = g.GLYPH_CLEAR[kind]
            const at = [1004, 620]
            const parts = g.landmarkParts({ kind, at, size })
            const nums = parts.flatMap((q) => (q.d.match(/-?\\d+(?:\\.\\d+)?/g) ?? []).map(Number))
            // 경로의 점(타원 a 명령의 반지름·각도는 빼고 — 타원은 둘레를 따로 본다)
            const pts = []
            for (const q of parts) {
              const re = /([MLQCa])([^MLQCaZh]*)/g
              let m
              let cur = [0, 0]
              while ((m = re.exec(q.d))) {
                const v = (m[2].match(/-?\\d+(?:\\.\\d+)?/g) ?? []).map(Number)
                // 반 타원 — 가운데는 시작점과 끝점(상대)의 가운데, 끝점은 그 축의 두 끝
                if (m[1] === 'a') { const rx = v[0], ry = v[1], c0 = cur[0] + v[5] / 2, c1 = cur[1] + v[6] / 2; pts.push([c0 - rx, c1], [c0 + rx, c1], [c0, c1 - ry], [c0, c1 + ry]); cur = [cur[0] + v[5], cur[1] + v[6]]; continue }
                for (let i = 0; i + 1 < v.length; i += 2) { pts.push([v[i], v[i + 1]]); cur = [v[i], v[i + 1]] }
              }
            }
            const cx = at[0], cy = at[1] + C.dy * size, r = C.r * size
            const far = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)))
            // 막힘 격자는 2 단위 칸의 가운데로 찍어 작은 원의 가장자리는 칸 반 대각선(1.4)만큼 덜 찬다 — 0.85·r 과 r − 1.5 가운데 안쪽을 본다
            const blocked = l.buildBlockedMask([], [], [{ id: 't', kind, at, size }])
            // 그림 둘레에 맞춘 기호(흰 금속 땅·떨어진 하늘거주지 — glyphClearTest)는 그림이 덮는 점마다 (칸 반 대각선만큼 원 가운데 쪽으로 당겨) 비우고,
            // 흰 금속 땅은 원 안이라도 가장자리 밖 어딘가는 비우지 않는다 (나무 없는 띠가 남지 않게 — 2026-11-03 검토). 나머지는 원의 둘레를 비운다
            const FIT = ['crashed-skyclave', 'compleated-ground', 'compleated-ground-oil']
            const pull = ([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; const k = Math.max(0, d - 1.5) / d; return [cx + (x - cx) * k, cy + (y - cy) * k] }
            const ringPts = (rr) => Array.from({ length: 36 }, (_, i) => { const a = (i * 10 * Math.PI) / 180; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] })
            const ringOk = FIT.includes(kind)
              ? g.drawnPoints(parts).every((q) => blocked(...q) || blocked(...pull(q)))
              : ringPts(Math.min(r * 0.85, r - 1.5)).every((q) => blocked(...q))
            const fitted = kind.startsWith('compleated-ground') ? ringPts(r * 0.95).some((q) => !blocked(...q)) : true
            out.push({ kind, whole: WHOLE.includes(kind), size, parts: parts.length, nums: nums.length, finite: nums.every(Number.isFinite), far: +far.toFixed(2), r, ringOk, fitted, reach: p.GLYPH_REACH({ kind, size }), need: (Math.abs(C.dy) + C.r) * size })
          }
          return out
        })()`,
      },
      sessionId,
    )
    await chrome.send('Target.closeTarget', { targetId })
    const rows = result.value ?? []
    if (!rows.length) console.log(result)
    for (const r of rows) {
      ok(r.parts >= 3 && r.nums > 30 && r.finite, `그림(${r.kind}, 크기 ${r.size}): 부분 ${r.parts}개, 수 ${r.nums}개 모두 유한`)
      if (r.whole) ok(r.far <= r.r, `그림(${r.kind}, 크기 ${r.size}): 가장 먼 점 ${r.far} 가 비우는 원 반지름 ${r.r} 안`)
      ok(r.ringOk, `막힘(${r.kind}, 크기 ${r.size}): buildBlockedMask 가 ${['crashed-skyclave', 'compleated-ground', 'compleated-ground-oil'].includes(r.kind) ? '그림이 덮는 자리를' : '그 원 안을'} 비운다`)
      ok(r.fitted, `막힘(${r.kind}, 크기 ${r.size}): 비우는 자리가 그림 둘레에 맞다 (원 둘레 0.95r 에 비우지 않는 곳이 있다)`)
      ok(r.reach >= r.need && glyphClear({ kind: r.kind, size: r.size }) >= r.need - 1e-9, `닿는 범위(${r.kind}, 크기 ${r.size}): GLYPH_REACH ${r.reach}·glyphClear ${glyphClear({ kind: r.kind, size: r.size })} ≥ ${r.need}`)
    }
    ok(rows.length === 18, '브라우저 검사 6 종류 × 3 크기')
  } finally {
    await chrome.close()
  }
} else console.log('· --base 가 없어 브라우저 검사(그림·막힘·닿는 범위)는 건너뛴다')

console.log(failed ? `\n${failed}개 어긋남` : '\n모두 맞다')
process.exit(failed ? 1 : 0)
