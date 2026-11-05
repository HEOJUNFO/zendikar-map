// 헤드론이 이름을 비키는 셈(src/map/hedronYield.ts)의 시험 — Node 만.
//   node scripts/qa/hedron-yield-test.mjs
import assert from 'node:assert/strict'
import { glyphHoles } from '../../src/map/glyphSpans.ts'
import { HEDRON_DRIFT, hedronShape, KEEP_PX, polyHitsBox, sameMoves, SLIDE_MAX_PX, yieldHedrons } from '../../src/map/hedronYield.ts'

let n = 0
const test = (name, fn) => {
  fn()
  n++
  console.log('ok', name)
}
/** 똑바로 선 헤드론 — 길이 반 len, 폭 0.36·len (layoutHedrons 의 모양) */
const hedron = (key, x, y, { len = 8, lift = 12, grounded = false, single = false } = {}) => ({
  key,
  x,
  y,
  lift: grounded ? 0 : lift,
  grounded,
  single,
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

test('걸리면 가까운 빈 자리로 미끄러진다 — 화면 40px·길이 반 2.5 배 안에서', () => {
  const h = hedron('a', 100, 100)
  // 몸통 가운데를 지나는 가는 이름 상자
  const m = yieldHedrons([h], holes([{ x0: 90, y0: 86, x1: 101, y1: 90 }]), 1, ok)
  const mv = m.get('a')
  assert.ok(mv && mv !== 'hide', '미끄러졌다')
  const d = Math.hypot(mv.dx, mv.dy)
  assert.ok(d <= Math.min(2.5 * 8, SLIDE_MAX_PX) + 1e-9, `거리 ${d}`)
  const [shape] = hedronShape(h, mv.dx, mv.dy)
  assert.equal(polyHitsBox(shape, { x0: 90, y0: 86, x1: 101, y1: 90 }), false)
})

test('자리가 없으면 옅어진다 — 땅에 쓰러진 것은 미끄러지지 않는다', () => {
  const big = { x0: 0, y0: 0, x1: 400, y1: 400 }
  assert.equal(yieldHedrons([hedron('a', 100, 100)], holes([big]), 1, ok).get('a'), 'hide')
  const g = hedron('g', 100, 100, { grounded: true })
  assert.equal(yieldHedrons([g], holes([{ x0: 99, y0: 99, x1: 101, y1: 101 }]), 1, ok).get('g'), 'hide')
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
    assert.ok(xs(a)[1] <= xs(b)[0] + 1e-9 || Math.abs(mv.dy) > 0, '겹치지 않는다')
  }
})

test('같은 입력이면 같은 결과, sameMoves', () => {
  const items = [hedron('a', 100, 100), hedron('b', 130, 100), hedron('c', 160, 100, { grounded: true })]
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
