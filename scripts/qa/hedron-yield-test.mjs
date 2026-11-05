// 헤드론이 이름을 비키는 셈(src/map/hedronYield.ts)의 시험 — Node 만.
//   node scripts/qa/hedron-yield-test.mjs
import assert from 'node:assert/strict'
import { glyphHoles } from '../../src/map/glyphSpans.ts'
import { bodyBands, halfLength, HEDRON_DRIFT, hedronNameShape, hedronShape, KEEP_PX, polyHitsBox, sameMoves, SLIDE_MAX_LEN, SLIDE_MAX_PX, slideMax, yieldHedrons } from '../../src/map/hedronYield.ts'
import { layoutAreaLabels, placeLabels } from '../../src/map/labels.ts'

let n = 0
const test = (name, fn) => {
  fn()
  n++
  console.log('ok', name)
}
/** 똑바로 선 헤드론 — 길이 반 len, 폭 0.36·len (layoutHedrons 의 모양) */
const hedron = (key, x, y, { len = 8, lift = 12, grounded = false, single = false, home } = {}) => ({
  key,
  x,
  y,
  lift: grounded ? 0 : lift,
  grounded,
  single,
  home,
  corners: [
    [0, -len],
    [len * 0.36, len * 0.08],
    [0, len * 0.92],
    [-len * 0.36, len * 0.08],
  ],
})
const holes = (boxes) => glyphHoles(boxes, 48)
const ok = () => true

test('분리축 — 닿기만 하면 겹치지 않는다', () => {
  const sq = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ]
  assert.equal(polyHitsBox(sq, { x0: 1, y0: 1, x1: 3, y1: 3 }), true)
  assert.equal(polyHitsBox(sq, { x0: 2, y0: 0, x1: 3, y1: 2 }), false)
  // 마름모의 빈 귀퉁이에 든 상자 — 겉 상자는 겹치지만 다각형은 아니다
  const diamond = [
    [1, 0],
    [2, 1],
    [1, 2],
    [0, 1],
  ]
  assert.equal(polyHitsBox(diamond, { x0: 1.7, y0: 1.7, x1: 3, y1: 3 }), false)
})

test('떠 있는 헤드론은 떠다니는 폭까지 본다', () => {
  const h = hedron('a', 100, 100)
  // 띄운 몸통 꼭대기는 y = 100 - 12 - 8 = 80, 떠다니면 77.6
  const top = 100 - 12 - 8
  const [shape] = hedronShape(h)
  assert.equal(Math.min(...shape.map((p) => p[1])), top - HEDRON_DRIFT)
  assert.equal(polyHitsBox(shape, { x0: 95, y0: top - 2, x1: 105, y1: top - 1 }), true)
})

test('이름에 걸리지 않으면 그대로', () => {
  const m = yieldHedrons([hedron('a', 100, 100)], holes([{ x0: 200, y0: 200, x1: 220, y1: 210 }]), 1, ok)
  assert.equal(m.size, 0)
})

test('걸리면 가까운 빈 자리로 미끄러진다 — 화면 40px·길이 반 4 배 안에서', () => {
  const h = hedron('a', 100, 100)
  // 몸통 가운데를 지나는 가는 이름 상자
  const m = yieldHedrons([h], holes([{ x0: 90, y0: 86, x1: 101, y1: 90 }]), 1, ok)
  const mv = m.get('a')
  assert.ok(mv && mv !== 'hide', '미끄러졌다')
  const d = Math.hypot(mv.dx, mv.dy)
  assert.ok(d <= Math.min(SLIDE_MAX_LEN * halfLength(h), SLIDE_MAX_PX) + 1e-9, `거리 ${d}`)
  const [shape] = hedronShape(h, mv.dx, mv.dy)
  assert.equal(polyHitsBox(shape, { x0: 90, y0: 86, x1: 101, y1: 90 }), false)
})

test('자리가 없으면 옅어진다 — 땅에 쓰러진 것은 그 무리의 원 안에서만 미끄러진다', () => {
  const big = { x0: 0, y0: 0, x1: 400, y1: 400 }
  assert.equal(yieldHedrons([hedron('a', 100, 100)], holes([big]), 1, ok).get('a'), 'hide')
  const name = { x0: 95, y0: 95, x1: 105, y1: 101 }
  // 원이 몸통 자리뿐이면 옮길 데가 없다
  const g0 = hedron('g', 100, 100, { grounded: true, home: { x: 100, y: 100, r: 0.5 } })
  assert.equal(yieldHedrons([g0], holes([name]), 1, ok).get('g'), 'hide')
  // 원이 넉넉하면 미끄러지고, 옮긴 자리도 원 안
  const home = { x: 100, y: 100, r: 30 }
  const g = hedron('g', 100, 100, { grounded: true, home })
  const mv = yieldHedrons([g], holes([name]), 1, ok).get('g')
  assert.ok(mv && mv !== 'hide', '미끄러졌다')
  assert.ok(Math.hypot(mv.dx, mv.dy) <= home.r + 1e-9 && Math.hypot(mv.dx, mv.dy) <= SLIDE_MAX_PX + 1e-9)
  assert.equal(polyHitsBox(hedronShape(g, mv.dx, mv.dy)[0], name), false)
})

test('떠 있는 것의 그림자도 비키되, 그림자 때문에 지우지는 않는다', () => {
  const h = hedron('a', 100, 100)
  // 그림자(가운데 (102, 100))만 지나는 상자 — 몸통은 y < 92 에 떠 있다
  const shadow = { x0: 99, y0: 99, x1: 105, y1: 101 }
  assert.equal(polyHitsBox(hedronShape(h)[0], shadow), false)
  assert.ok(hedronNameShape(h).some((p) => polyHitsBox(p, shadow)))
  const mv = yieldHedrons([h], holes([shadow]), 1, ok).get('a')
  assert.ok(mv && mv !== 'hide', '그림자를 비켜 미끄러졌다')
  assert.ok(hedronNameShape(h, mv.dx, mv.dy).every((p) => !polyHitsBox(p, shadow)))
  // 옮길 자리가 없으면 제자리 (몸통은 이미 비켜 있다)
  assert.equal(yieldHedrons([h], holes([shadow]), 1, () => false).size, 0)
})

test('화면에서 큰 헤드론은 제 길이 반까지 미끄러진다', () => {
  const h = hedron('a', 1000, 1000, { len: 16 })
  const px = KEEP_PX / 16
  // 길이 반 2·16·px > KEEP_PX — 40px 보다 멀리 갈 수 있다
  assert.ok(slideMax(h, px) * px > SLIDE_MAX_PX)
  assert.ok(slideMax(h, px) <= halfLength(h) + 1e-9)
  // 몸통 아래쪽 반을 가로지르는 이름 — 40px 안에서는 벗어나지 못한다
  const name = { x0: 992, y0: 975, x1: 1008, y1: 985 }
  const mv = yieldHedrons([h], holes([name]), px, ok).get('a')
  assert.ok(mv && mv !== 'hide', '미끄러졌다')
  assert.ok(Math.hypot(mv.dx, mv.dy) * px > SLIDE_MAX_PX, `거리 ${Math.hypot(mv.dx, mv.dy) * px}px`)
  assert.equal(polyHitsBox(hedronShape(h, mv.dx, mv.dy)[0], name), false)
})

test('하나뿐인 거대 헤드론·지역 상세가 다시 그린 헤드론은 비키지 않는다', () => {
  const big = holes([{ x0: 0, y0: 0, x1: 400, y1: 400 }])
  assert.equal(yieldHedrons([hedron('s', 100, 100, { single: true })], big, 1, ok).size, 0)
  assert.equal(yieldHedrons([hedron('f', 100, 100)], big, 1, ok, () => true).size, 0)
})

test('화면에서 큰 헤드론은 비킬 자리가 없어도 남는다', () => {
  const big = holes([{ x0: 0, y0: 0, x1: 4000, y1: 4000 }])
  // 길이 16 — 화면 px0 배율에서 16·px0 > KEEP_PX 이면 남는다
  const h = hedron('a', 1000, 1000)
  assert.equal(yieldHedrons([h], big, KEEP_PX / 16 + 0.5, ok).size, 0)
  assert.equal(yieldHedrons([h], big, KEEP_PX / 16 - 0.5, ok).get('a'), 'hide')
})

test('무리의 테두리와 다른 헤드론·표시를 지킨다', () => {
  const h = hedron('a', 100, 100)
  const name = holes([{ x0: 90, y0: 86, x1: 101, y1: 90 }])
  // 오른쪽(x 가 커지는 쪽)만 허락
  const m = yieldHedrons([h], name, 1, (x) => x > 100)
  const mv = m.get('a')
  assert.ok(mv && mv !== 'hide' && mv.dx > 0)
  // 제자리에 남는 헤드론과 6 단위 넘게 떨어진다
  const other = hedron('b', 104, 100)
  const m2 = yieldHedrons([h, other], name, 1, ok)
  const mv2 = m2.get('a')
  if (mv2 && mv2 !== 'hide') assert.ok(Math.hypot(100 + mv2.dx - 104, 100 + mv2.dy - 100) >= 6)
  // 표시를 덮는 자리로는 가지 않는다
  const marks = holes([{ x0: 60, y0: 60, x1: 140, y1: 140 }])
  const m3 = yieldHedrons([h], name, 1, ok, undefined, marks)
  assert.equal(m3.get('a'), 'hide')
})

test('그림은 되도록 비키고, 그림밖에 자리가 없으면 그 위로도 간다', () => {
  const h = hedron('a', 100, 100)
  const name = holes([{ x0: 90, y0: 86, x1: 101, y1: 90 }])
  const free = yieldHedrons([h], name, 1, ok).get('a')
  // 아무 데도 막지 않으면 가는 자리를 그림이 덮으면 다른 자리로
  const [fb] = hedronShape(h, free.dx, free.dy)
  const xs = fb.map((p) => p[0])
  const ys = fb.map((p) => p[1])
  const fig = holes([{ x0: Math.min(...xs) - 0.5, y0: Math.min(...ys) - 0.5, x1: Math.max(...xs) + 0.5, y1: Math.max(...ys) + 0.5 }])
  const mv = yieldHedrons([h], name, 1, ok, undefined, undefined, fig).get('a')
  assert.ok(mv && mv !== 'hide' && (mv.dx !== free.dx || mv.dy !== free.dy))
  assert.ok(!hedronShape(h, mv.dx, mv.dy).some((p) => polyHitsBox(p, { x0: Math.min(...xs) - 0.5, y0: Math.min(...ys) - 0.5, x1: Math.max(...xs) + 0.5, y1: Math.max(...ys) + 0.5 })))
  // 사방이 그림이면 그래도 이름을 비켜 간다 (지우지 않는다)
  const all = holes([{ x0: 0, y0: 0, x1: 400, y1: 400 }])
  const m2 = yieldHedrons([h], name, 1, ok, undefined, undefined, all).get('a')
  assert.ok(m2 && m2 !== 'hide')
})

test('미끄러져 간 몸통은 다른 헤드론의 몸통과 겹치지 않는다', () => {
  // 오른쪽에만 자리가 있고, 바로 오른쪽(그림자 8 단위 — SPACING 6 보다 멀다)에 다른 헤드론이 있다
  const h = hedron('a', 100, 100)
  const other = hedron('b', 108, 100)
  const name = holes([{ x0: 92, y0: 70, x1: 100.5, y1: 100 }])
  const m = yieldHedrons([h, other], name, 1, (x) => x >= 100)
  const mv = m.get('a')
  if (mv && mv !== 'hide') {
    const [a] = hedronShape(h, mv.dx, mv.dy)
    const [b] = hedronShape(other)
    const xs = (p) => [Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[0]))]
    // 둘 다 똑바로 선 마름모 — 옆으로 나란하면 겹치지 않으려면 가로로 비켜야 한다
    assert.ok(xs(a)[1] <= xs(b)[0] + 1e-9 || xs(b)[1] <= xs(a)[0] + 1e-9 || Math.abs(mv.dy) > 0, '겹치지 않는다')
  }
})

test('하나뿐인 거대 헤드론의 몸통 띠 — 몸통을 모두 덮고 귀퉁이의 빈 하늘은 덜 막는다', () => {
  const h = hedron('s', 100, 100, { len: 20, single: true })
  // 기울인 몸통
  const a = (20 * Math.PI) / 180
  const tilted = { ...h, corners: h.corners.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]) }
  const bands = bodyBands(tilted)
  const [poly] = hedronShape(tilted)
  // 몸통의 꼭짓점은 모두 어느 띠 안
  for (const [x, y] of poly) assert.ok(bands.some((b) => x >= b.x0 - 1e-9 && x <= b.x1 + 1e-9 && y >= b.y0 - 1e-9 && y <= b.y1 + 1e-9))
  // 몸통 안의 점도 모두 (무게중심과 꼭짓점 사이)
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length
  for (const [x, y] of poly)
    for (const t of [0.25, 0.5, 0.75]) {
      const px = cx + (x - cx) * t
      const py = cy + (y - cy) * t
      assert.ok(bands.some((b) => px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1))
    }
  // 띠를 모두 합친 넓이가 겉 상자보다 작다
  const area = (b) => (b.x1 - b.x0) * (b.y1 - b.y0)
  const xs = poly.map((p) => p[0])
  const ys = poly.map((p) => p[1])
  assert.ok(bands.reduce((s, b) => s + area(b), 0) < 0.8 * (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)))
})

test('이름 배치의 무른 장애물 — 비킬 쪽이 있으면 비키고, 없으면 그 위에 앉는다 (사라지지 않는다)', () => {
  const l = { id: 'p', at: [100, 100], text: 'Sky', prominence: 3, fontPx: 12 }
  // 오른쪽 이름 자리를 덮는 무른 상자
  const softRight = [{ x0: 104, y0: 90, x1: 140, y1: 110 }]
  const a = placeLabels([l], [[]], [1], [0], undefined, [softRight])
  assert.equal(a.get('p').anchors[0], 'left')
  // 사방이 무른 상자 — 그래도 이름은 앉는다 (처음 쪽)
  const all = [{ x0: 40, y0: 40, x1: 160, y1: 160 }]
  const b = placeLabels([l], [[]], [1], [0], undefined, [all])
  assert.equal(b.get('p').anchors[0], 'right')
  // 지역 이름도 같다
  const style = () => ({ base: 12, minPx: 10, maxPx: 30, showPx: 1 })
  const area = { id: 'r', at: [100, 100], text: 'Halimar', prominence: 3 }
  const c = layoutAreaLabels([area], style, 1, [], all)
  assert.ok(c.at.has('r'), '무른 장애물 때문에 사라지지 않는다')
  const d = layoutAreaLabels([area], style, 1, all)
  assert.ok(!d.at.has('r'), '막힌 상자에는 앉지 않는다')
})

test('같은 입력이면 같은 결과, sameMoves', () => {
  const items = [hedron('a', 100, 100), hedron('b', 130, 100), hedron('c', 160, 100, { grounded: true, home: { x: 160, y: 100, r: 0 } })]
  const name = holes([
    { x0: 90, y0: 86, x1: 101, y1: 90 },
    { x0: 125, y0: 80, x1: 133, y1: 84 },
    { x0: 158, y0: 98, x1: 162, y1: 101 },
  ])
  const a = yieldHedrons(items, name, 1, ok)
  const b = yieldHedrons(items, name, 1, ok)
  assert.ok(sameMoves(a, b))
  assert.equal(a.get('c'), 'hide')
  assert.ok(!sameMoves(a, new Map()))
})

console.log(`hedron-yield-test: ${n} 통과`)
