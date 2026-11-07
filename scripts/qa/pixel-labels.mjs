// 픽셀 지도(/pixel)의 이름 시험 — Node 만 (docs/pixel-plan.md S3 의 통과 조건).
//   node scripts/qa/pixel-labels.mjs            # 실패하면 종료 코드 1
// - 장소·지역·물·대지 카드·대륙의 이름이 en·ko 모두 어느 단계에선가 자리를 받는가 (한 픽셀의 화면 크기 1·2·3 × DPR 1·1.5·2·3)
// - 기호(장소·카드)가 모두 어느 단계에선가 그려지는가 — 그려진 기호는 모두 Tab 으로 닿는다
// - 한국어 보기의 이름은 데이터에 nameKo 가 있을 때만 한국어인가 (지어낸 이름이 없다)
// - 단계마다 놓인 이름끼리 겹치지 않는가
import './pixel-hooks.mjs'

const ROOT = new URL('../../', import.meta.url).pathname
const { locations } = await import(`${ROOT}src/data/locations.ts`)
const { LAND_CARDS } = await import(`${ROOT}src/data/cards.ts`)
const { continents } = await import(`${ROOT}src/data/continents.ts`)
const { slimMarks } = await import(`${ROOT}src/pixel/marks/slim.ts`)
const L = await import(`${ROOT}src/pixel/labels/layout.ts`)
const { LEVELS, MAP_W, cssPerUnit } = await import(`${ROOT}src/pixel/view.ts`)

const marks = slimMarks(locations, LAND_CARDS, continents)
const problems = []
const all = [...marks.points, ...marks.areas, ...marks.cards, ...marks.continents]
const hangul = /[가-힣]/

for (const m of all) {
  if (m.nameKo !== undefined && !hangul.test(m.nameKo)) problems.push(`${m.id}: nameKo 에 한글이 없다 (${m.nameKo})`)
  if (hangul.test(m.name)) problems.push(`${m.id}: 영어 이름에 한글이 있다`)
}

const latest = new Map()
for (const size of [1, 2, 3]) {
  for (const dpr of [1, 1.5, 2, 3]) {
    const px = LEVELS.map((_, i) => cssPerUnit(i, size, dpr))
    for (const lang of ['en', 'ko']) {
      const lay = L.layoutLevels(marks, lang, px, MAP_W)
      const first = L.firstLevels(lay)
      const firstMark = L.firstMarkLevels(lay)
      const tag = `s${size} dpr${dpr} ${lang}`
      for (const m of all) if (!first.has(m.id)) problems.push(`${tag}: '${L.displayName(m, lang)}' (${m.id}) 이름이 어느 단계에도 자리를 받지 못했다`)
      for (const m of [...marks.points, ...marks.cards]) if (!firstMark.has(m.id)) problems.push(`${tag}: ${m.id} 기호가 어느 단계에도 그려지지 않는다`)
      // 놓인 이름끼리 겹침
      lay.forEach((lv, level) => {
        const boxes = []
        for (const p of [...marks.points, ...marks.cards]) {
          const a = lv.anchors.get(p.id)
          if (a) boxes.push([p.id, L.pointLabelBox(p.at, L.displayName(p, lang), a, px[level])])
        }
        for (const a of marks.areas) {
          const at = lv.areas.get(a.id)
          if (at) boxes.push([a.id, L.areaLabelBox(L.displayName(a, lang), at.at, at.fontPx, px[level])])
        }
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const [ia, a] = boxes[i]
            const [ib, b] = boxes[j]
            if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) problems.push(`${tag} 단계 ${level}: ${ia} 와 ${ib} 이름이 겹친다`)
          }
      })
      if (size === 2 && dpr === 2) latest.set(lang, { lay, first })
    }
  }
}

for (const [lang, { lay, first }] of latest) {
  const counts = lay.map((l) => `${l.anchors.size + l.areas.size + l.continents.size}`)
  const late = [...first.values()].filter((v) => v >= 5).length
  console.log(`${lang} (2×·DPR 2): 단계마다 이름 ${counts.join(' · ')} / 모두 ${first.size}개, 한 픽셀 ≤ 0.5 단위에서야 나오는 이름 ${late}개`)
}
console.log(`표시 — 장소 ${marks.points.length}, 지역·물 ${marks.areas.length}, 대지 카드 ${marks.cards.length}, 대륙 ${marks.continents.length}`)
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  for (const p of [...new Set(problems)].slice(0, 60)) console.log(' -', p)
  process.exit(1)
}
console.log('통과')
