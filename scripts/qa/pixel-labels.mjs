// 픽셀 지도(/pixel)의 이름 시험 — Node 만 (docs/pixel-plan.md S3 의 통과 조건).
//   node scripts/qa/pixel-labels.mjs            # 실패하면 종료 코드 1
// - 장소·지역·물·대지 카드·대륙의 이름이 en·ko 모두 어느 단계에선가 자리를 받는가 (한 픽셀의 화면 크기 1·2·3 × DPR 1·1.5·2·3)
// - 기호(장소·카드)가 모두 어느 단계에선가 그려지는가 — 그려진 기호는 모두 Tab 으로 닿는다
// - 한국어 보기의 이름은 데이터에 nameKo 가 있을 때만 한국어인가 (지어낸 이름이 없다)
// - 단계마다 놓인 이름끼리 겹치지 않는가
// - 시점별 지도(S6)의 시점마다 — 그 시점의 카드(사가에 매인 대지 카드 포함)·폐허로 바꾼 장소의 이름도 같고, 그 무렵 없던 장소는 빼고 본다.
//   2023 은 지역 이름이 그 무렵 바탕의 큰 기호 상자(labelAvoid.ts)에 얹히지 않는가
// - 시점마다의 페이즈 그림(S7) — 그림 이름이 en·ko 모두 어느 단계에선가 자리를 받는가(한 픽셀 2×·3× — 시험 스위치 1× 는 수만 보인다:
//   이름이 지도에 견줘 가장 커 그림이 몰린 곳의 몇 이름이 자리를 잃는다), 이름이 그 단계에 그리는 그림 상자에 얹히지 않는가
//   (가장 깊은 단계는 네 쪽이 모두 막힌 그림 이름이 이웃 그림 위에 앉을 수 있다 — layout.ts — 그 수만 보인다)
import './pixel-hooks.mjs'

const ROOT = new URL('../../', import.meta.url).pathname
const { locations } = await import(`${ROOT}src/data/locations.ts`)
const { LAND_CARDS } = await import(`${ROOT}src/data/cards.ts`)
const { continents } = await import(`${ROOT}src/data/continents.ts`)
const { slimMarks } = await import(`${ROOT}src/pixel/marks/slim.ts`)
const L = await import(`${ROOT}src/pixel/labels/layout.ts`)
const { LEVELS, MAP_W, cssPerUnit } = await import(`${ROOT}src/pixel/view.ts`)
const { timeMarks } = await import(`${ROOT}src/pixel/time.ts`)
const { TIMES, SHOWN_TIME_POINTS, landAt } = await import(`${ROOT}src/data/timeline.ts`)
const { periodAt } = await import(`${ROOT}src/data/periods/index.ts`)
const { PERIOD_LABEL_AVOID, PERIOD_MARK_ANCHOR } = await import(`${ROOT}src/data/labelAvoid.ts`)
const { buildPixelFigures } = await import(`${ROOT}scripts/pixel/figures.mjs`)
const { figuresAt } = await import(`${ROOT}src/pixel/figures/store.ts`)
const figMeta = (await buildPixelFigures()).meta
// 지역 상세의 이름 (S9) — 앱의 detail 과 같은 셈 (그림은 굽지 않고 이름·범위만)
const CM = await import(`${ROOT}scripts/pixel/childmaps.mjs`)
const childMeta = { u: CM.CHILD_U, maps: (await CM.buildChildArt(await CM.childSetup())).maps, cells: [] }
const { detailLayout, detailLevelOf } = await import(`${ROOT}src/pixel/detail.ts`)
// 작은 섬 위 기호의 땅 크기 (S15) — 앱과 같은 셈
const landSizes = await (await import(`${ROOT}scripts/pixel/terrain.mjs`)).pixelLandSizes()
const detailInfo = { overlap: 0, labels: 0, yielded: 0 }

const every = slimMarks(locations, LAND_CARDS, continents, (c) => SHOWN_TIME_POINTS.filter((t) => landAt(c, t)))
const problems = []
const hangul = /[가-힣]/

for (const m of [...every.points, ...every.areas, ...every.cards, ...every.continents]) {
  if (m.nameKo !== undefined && !hangul.test(m.nameKo)) problems.push(`${m.id}: nameKo 에 한글이 없다 (${m.nameKo})`)
  if (hangul.test(m.name)) problems.push(`${m.id}: 영어 이름에 한글이 있다`)
}

const latest = new Map()
/** 그림 이름 — 1× 에서 자리를 잃은 수, 가장 깊은 단계에서 이웃 그림 위에 앉은 수 */
const figInfo = { lost1: 0, overDeep: 0 }
const VIEWS = [null, ...SHOWN_TIME_POINTS]
for (const time of VIEWS) {
  const level = time === null ? null : TIMES.find((t) => t.t === time).periodLevel
  const set = level === null ? null : periodAt(level)
  // 앱의 virtual:pixel-times 와 같은 몫 (scripts/pixel/periods.mjs 의 placeMarks·dryLabels — 페이즈 바탕 항목 그대로)
  const info = set && { placeMarks: set.marks.map((m) => [m.place, m.kind]), dryLabels: set.labels.filter((l) => l.dry).map((l) => l.place) }
  const tm = timeMarks(every, time, info)
  const marks = tm.marks
  const shownMark = (m) => !tm.hidden.has(m.id)
  const all = [...marks.points, ...marks.areas, ...marks.cards, ...marks.continents].filter(shownMark)
  const avoid = level === null ? undefined : PERIOD_LABEL_AVOID[level]
  // 페이즈 그림 — 앱(PixelApp.tsx 의 layouts)과 같은 입력
  const figs = time === null ? [] : figuresAt(figMeta, time)
  const figInputs = figs.map((f) => ({ key: `f${f.pi}`, name: f.name, nameKo: f.nameKo, size: f.size, box: f.box, prefer: f.label, fromLevel: f.fromLevel }))
  const detail = detailLayout(childMeta, marks, time ?? 0, detailLevelOf(childMeta, LEVELS))
  const opts = { avoid, prefer: level === null ? undefined : PERIOD_MARK_ANCHOR[level], figures: figInputs, uAt: LEVELS, figureMinPx: figMeta.minPx, detail, landSizes }
for (const size of [1, 2, 3]) {
  for (const dpr of [1, 1.5, 2, 3]) {
    const px = LEVELS.map((_, i) => cssPerUnit(i, size, dpr))
    for (const lang of ['en', 'ko']) {
      const lay = L.layoutLevels(marks, lang, px, MAP_W, opts)
      const first = L.firstLevels(lay)
      const firstMark = L.firstMarkLevels(lay)
      const tag = `${time === null ? '끔' : `T${time}`} s${size} dpr${dpr} ${lang}`
      // 지역 상세가 같은 이름을 다는 지역 이름은 그 이름이 놓이면 보인다 (S9)
      const viaDetail = (id) => {
        const name = all.find((m) => m.id === id)?.name
        return lay[detail.level]?.hiddenAreas.has(id) && detail.labels.some((d) => d.name === name && lay[detail.level].details.has(d.key))
      }
      for (const m of all) if (!first.has(m.id) && !viaDetail(m.id)) problems.push(`${tag}: '${L.displayName(m, lang)}' (${m.id}) 이름이 어느 단계에도 자리를 받지 못했다`)
      for (const m of [...marks.points, ...marks.cards].filter(shownMark)) if (!firstMark.has(m.id)) problems.push(`${tag}: ${m.id} 기호가 어느 단계에도 그려지지 않는다`)
      for (const f of figInputs)
        if (!first.has(f.key)) {
          if (size === 1) figInfo.lost1++
          else problems.push(`${tag}: 그림 '${L.displayName(f, lang)}' 이름이 어느 단계에도 자리를 받지 못했다`)
        }
      // 놓인 이름끼리 겹침
      lay.forEach((lv, level) => {
        const boxes = []
        for (const p of [...marks.points, ...marks.cards].filter(shownMark)) {
          const a = lv.anchors.get(p.id)
          if (a) boxes.push([p.id, L.pointLabelBox(p.at, L.displayName(p, lang), a, px[level])])
        }
        for (const a of marks.areas) {
          const at = lv.areas.get(a.id)
          if (!at) continue
          const box = L.areaLabelBox(L.displayName(a, lang), at.at, at.fontPx, px[level])
          boxes.push([a.id, box])
          for (const b of avoid ?? []) if (box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1) problems.push(`${tag} 단계 ${level}: 지역 이름 ${a.id} 가 그 무렵 바탕의 큰 기호 상자에 얹힌다`)
        }
        // 대륙명끼리 (검토: 휴대폰 개관에서 Bala Ged 가 Guul Draz 에 얹혔다) — 놓인 자리로 옮긴 상자
        const contBoxes = []
        for (const c of marks.continents) {
          const at = lv.continents.get(c.id)
          if (!at) continue
          const { at: a0, box } = L.continentLabel(c, lang, px[level], MAP_W)
          const dx = at[0] - a0[0]
          const dy = at[1] - a0[1]
          contBoxes.push([c.id, { x0: box.x0 + dx, y0: box.y0 + dy, x1: box.x1 + dx, y1: box.y1 + dy }])
        }
        for (let i = 0; i < contBoxes.length; i++)
          for (let j = i + 1; j < contBoxes.length; j++) {
            const [ia, a] = contBoxes[i]
            const [ib, b] = contBoxes[j]
            // 시험 스위치 1× 의 개관은 세계가 화면에 매우 작게 담겨 대륙명이 비킬 자리가 없다 (그림 이름처럼 1× 는 세기만)
            if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
              if (size === 1) figInfo.cont1 = (figInfo.cont1 ?? 0) + 1
              else problems.push(`${tag} 단계 ${level}: 대륙명 ${ia} 와 ${ib} 가 겹친다`)
            }
          }
        // 그림 이름과, 이름이 얹히면 안 되는 그 단계의 그림 상자
        const figBoxes = []
        for (const f of figInputs) {
          const b = lv.figureLabels.get(f.key)
          if (b) boxes.push([f.key, b])
          if (lv.figures.has(f.key)) figBoxes.push([f.key, L.figurePixelBox(f.box, LEVELS[level])])
        }
        for (const [ia, a] of boxes)
          for (const [ib, b] of figBoxes)
            if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
              if (level === LEVELS.length - 1 && ia.startsWith('f')) figInfo.overDeep++
              else problems.push(`${tag} 단계 ${level}: ${ia} 이름이 그림 ${ib} 에 얹힌다`)
            }
        // 지역 상세의 이름 (S9) — 그 단계에 모두 놓이고, 다른 이름은 그 이름을 비킨다 (지역 상세 이름끼리는 그림이 정한 자리라 세기만 한다)
        if (level === detail.level) {
          for (const d of detail.labels) {
            const at = lv.details.get(d.key)
            // 네 쪽이 모두 막힌 장소·카드 이름에 자리를 내준 것 (세기만)
            if (!at) {
              detailInfo.yielded++
              continue
            }
            detailInfo.labels++
            for (const [ib, b] of boxes) if (at.box.x0 < b.x1 && b.x0 < at.box.x1 && at.box.y0 < b.y1 && b.y0 < at.box.y1) problems.push(`${tag} 단계 ${level}: ${ib} 이름이 지역 상세 이름 ${d.key} 에 얹힌다`)
          }
          const dl = [...lv.details.values()]
          for (let i = 0; i < dl.length; i++) for (let j = i + 1; j < dl.length; j++) if (dl[i].box.x0 < dl[j].box.x1 && dl[j].box.x0 < dl[i].box.x1 && dl[i].box.y0 < dl[j].box.y1 && dl[j].box.y0 < dl[i].box.y1) detailInfo.overlap++
        }
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const [ia, a] = boxes[i]
            const [ib, b] = boxes[j]
            if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) problems.push(`${tag} 단계 ${level}: ${ia} 와 ${ib} 이름이 겹친다`)
          }
      })
      if (size === 2 && dpr === 2 && time === null) latest.set(lang, { lay, first })
    }
  }
}
  if (time !== null) console.log(`T${time}: 그림 ${figs.length} · 카드 ${marks.cards.length} (사가에 매인 것 ${marks.cards.filter((c) => c.times).length}) · 폐허로 바꾼 장소 ${marks.points.filter((p) => p.kind === 'ruin').length} · 숨긴 장소 ${tm.hidden.size}`)
}
const marks = timeMarks(every, null, undefined).marks

for (const [lang, { lay, first }] of latest) {
  const counts = lay.map((l) => `${l.anchors.size + l.areas.size + l.continents.size}`)
  const late = [...first.values()].filter((v) => v >= 5).length
  console.log(`${lang} (2×·DPR 2): 단계마다 이름 ${counts.join(' · ')} / 모두 ${first.size}개, 한 픽셀 ≤ 0.5 단위에서야 나오는 이름 ${late}개`)
}
console.log(`지역 상세 이름 — 놓인 것 ${detailInfo.labels}, 장소·카드 이름에 자리를 내준 것 ${detailInfo.yielded} (모든 보기·크기·DPR·언어를 합친 수), 서로 겹친 쌍 ${detailInfo.overlap}`)
console.log(`대륙명 — 1× 에서 겹친 쌍 ${figInfo.cont1 ?? 0}`)
console.log(`그림 이름 — 1× 에서 자리를 잃은 것 ${figInfo.lost1} (모든 시점·DPR·언어를 합친 수), 가장 깊은 단계에서 이웃 그림 위에 앉은 것 ${figInfo.overDeep}`)
console.log(`표시 — 장소 ${marks.points.length}, 지역·물 ${marks.areas.length}, 대지 카드 ${marks.cards.length}, 대륙 ${marks.continents.length}`)
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  for (const p of [...new Set(problems)].slice(0, process.env.ALL ? 1e5 : 60)) console.log(' -', p)
  process.exit(1)
}
console.log('통과')
