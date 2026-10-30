// 지역 상세 원본의 시점별 보기 열쇠 (src/data/sagas.ts 의 Gated·inView) — to_ts.mjs 와 context.mjs 가 함께 쓴다.
// 1. 빈터 → 카드 (for): 원본의 빈터 줄 끝 주석이 카드 id 로 시작하면(`// card-id …`, 더 깊은 지역 상세가 옮겨 그린 부모 빈터는 `// 할리마르 빈터 — card-id`)
//    그 빈터는 그 카드의 자리를 비운 것이다 — 원본을 실행하기 전에 그 줄의 객체에 for: ['card-id'] 를 넣는다. 원본에 for 를 직접 써도 된다
//    (그 줄에 for 가 이미 있으면 주석을 읽지 않는다). 카드 id 가 아닌 주석(장소 이름 자리, 페이즈 바탕 자리 …)은 for 를 달지 않는다
// 2. 시점 열쇠 (time): for 가 있는 빈터는 시점마다 timeline.ts 의 forTimeGate 로 셈해 기본값과 다른 시점만 단다 — 원본에 time 을 쓰지 않는다.
//    그 시점에 그 카드가 그려지는지는 앱의 셈(timeline.ts 의 shownAtTimeOf — 곁의 상징은 그 그림도 그릴 때만)으로 본다
//    손그림 부분·지형 칸·이름의 time·timeOnly 는 원본이 단 그대로 옮긴다 (지역 상세 손그림, S7)
// 3. 옮긴 자리의 빈터 (movedFor): 시점별 보기에서 카드를 그 시점에만 다른 자리(time.moved)에 그리면 원본은 그 자리에 movedFor: ['card-id'] 빈터를 둔다
//    (문 없이). 앱이 그 카드를 그 시점에 옮긴 자리에 그리고 그 빈터가 그 시점의 옮긴 자리(그림·이름 상자)를 비우는 데 쓰일 때만 켜는 시점별 보기만의
//    빈터(timeOnly)가 된다 — 한 카드를 시점마다 다른 자리로 옮기면 자리마다 빈터를 두고, 다른 시점의 자리 빈터는 켜지 않는다(movedClearingsAt).
//    어느 시점에도 켜지지 않으면 싣지 않는다. 세계 지도 그림을 그 시점에 세계 지도 그림 그대로(time.moved 에 childMap 없이) 이 그림의 범위 위로 옮길 때도
//    — 그 그림 상자나 이 그림이 처음 나오는 배율의 이름 상자가 이 그림의 범위에 걸치면(worldHostsOf) — 같은 빈터가 연다 (사가 보기처럼 지역 상세가 세계 지도 그림의 자리를 비켜 그린다)
//    원래 자리의 빈터(for)는 옮긴 시점에 꺼진다(forTimeGate)
// 4. 대상을 비킨 부분 (dodge): 손그림 부분·지형 칸·이름이 대상의 자리를 비우려고 그 대상이 그려지는 단계에 꺼져 있으면 원본은 dodge: ['card-id'] 를 단다
//    (KIT.dodge). 시점마다 그 카드가 그 자리에 그려지면 끄고, 그리지 않는데 사가 보기가 그 단계에 그리면 켠다 (timeline.ts 의 dodgeTimeGate).
//    생성물에는 dodge 를 싣지 않고 셈한 time 만 단다
// 5. 대상 묶음마다의 변형 (KIT.bySubjects): 원본을 실행하는 쪽이 전역 TIMELINE(timelineFor)을 넣어 두면 kit.js 의 bySubjects 가 시점마다 그려지는
//    대상 묶음을 보고 사가 보기의 변형에 시점 열쇠를 달고, 사가 보기에 없는 묶음은 시점별 보기만의 변형(timeOnly)으로 만든다
import { inPhase, TIME_KEYS } from '../../src/data/sagas.ts'
import { childMapAt, dodgeTimeGate, forTimeGate, movedAt, sagaLevelsOf, shownAtTimeOf, timeInfo, TIME_POINTS } from '../../src/data/timeline.ts'
import { CHILD_MAPS } from '../../src/data/childMaps.ts'
import { detailTierOf, TIER_PX_PER_UNIT } from '../../src/map/detailScale.ts'
import { CHILD_MAP_SIZES } from '../../src/map/childMapSizes.ts'

const ID = /[a-z0-9]+(?:-[a-z0-9]+)*/y
/** 주석 머리의 카드 id 들 — 'id', 'id · id', 'id + id', '<지명> 빈터 — id' (카드가 아니면 빈 목록) */
export function cardIdsOfNote(note, isCard) {
  let text = note.trim()
  const copied = text.match(/^[^—a-z]*빈터\s*—\s*/)
  if (copied) text = text.slice(copied[0].length)
  const ids = []
  let at = 0
  for (;;) {
    ID.lastIndex = at
    const m = ID.exec(text)
    if (!m) break
    ids.push(m[0])
    at = ID.lastIndex
    const sep = text.slice(at).match(/^\s*[·+,]\s*/)
    if (!sep) break
    at += sep[0].length
  }
  // 첫 낱말이 카드가 아니면(장소 id·지명) for 를 달지 않는다 — 뒤의 것만 카드인 주석도 그 카드의 빈터로 보지 않는다
  if (!ids.length || !isCard(ids[0])) return []
  return ids.filter(isCard)
}

/**
 * 원본 글에서 빈터 줄(`{ points: … }` 한 줄, 끝에 `// 주석`)에 for 를 넣은 글 — 주석 머리가 카드 id 면.
 * notes: 넣은 줄마다 { line, ids } (1부터 센 줄 번호)
 */
export function annotateClearings(src, isCard) {
  const notes = []
  const lines = src.split('\n').map((line, i) => {
    const cut = line.indexOf('//')
    if (cut < 0) return line
    const code = line.slice(0, cut)
    if (!/^\s*\{\s*points:/.test(code) || /\b(?:for|movedFor)\s*:/.test(code)) return line
    const close = code.lastIndexOf('}')
    if (close < 0 || !/^\s*,?\s*$/.test(code.slice(close + 1))) return line
    const ids = cardIdsOfNote(line.slice(cut + 2), isCard)
    if (!ids.length) return line
    notes.push({ line: i + 1, ids })
    return `${code.slice(0, close).replace(/\s*$/, '')}, for: ${JSON.stringify(ids)} ${code.slice(close)}${line.slice(cut)}`
  })
  return { src: lines.join('\n'), notes }
}

/** 시점 열쇠가 맞는 모양인가 — 어긋나면 그 까닭 (없으면 null). timeOnly 는 true 만, 켜는 시점 열쇠가 하나는 있어야 한다 */
export function timeKeyProblem(o) {
  if (o.time !== undefined) {
    if (typeof o.time !== 'object' || o.time === null) return `time 은 { ${TIME_KEYS[0][0]}…${TIME_KEYS.at(-1)[0]}: true|false } 객체`
    for (const [k, v] of Object.entries(o.time)) {
      if (!TIME_KEYS.some(([n]) => n === k)) return `time 의 모르는 열쇠 '${k}' — ${TIME_KEYS.map(([n]) => n).join('·')} 가운데`
      if (typeof v !== 'boolean') return `time.${k} 은 true 나 false`
    }
  }
  if (o.timeOnly !== undefined) {
    if (o.timeOnly !== true) return 'timeOnly 는 true 만'
    if (!Object.values(o.time ?? {}).some(Boolean)) return 'timeOnly 인데 켜는 시점 열쇠(time 의 true)가 없다 — 어느 보기에도 그려지지 않는다'
  }
  return null
}

/** 앱이 시점 t 에 그 카드를 그리는가 (timeline.ts 의 shownAtTimeOf — App.tsx 의 shownAtTime 과 같은 셈). cardOf: 카드 id → 페이즈 카드 */
export function drawsAtOf(cardOf) {
  return (c, t) => shownAtTimeOf(c, t, (id) => cardOf.get(id))
}

/**
 * 원본을 실행하는 자리에 넣는 전역 TIMELINE — kit.js 의 bySubjects 가 시점마다 그려지는 대상 묶음을 셈할 때 쓴다 (to_ts.mjs·context.mjs·childDetail.ts 의 ?childsrc).
 * drawn(id, t): 앱이 시점 t 에 그 카드를 그 자리에 그리는가 (옮긴 시점은 아니다), inPhase(문, 단계): 사가 보기의 문 셈, levelOf(t): 시점의 바탕 단계
 */
export function timelineFor(cardOf) {
  const drawsAt = drawsAtOf(cardOf)
  const card = (id) => {
    const c = cardOf.get(id)
    if (!c) throw new Error(`bySubjects: '${id}' 는 페이즈 카드가 아니다`)
    return c
  }
  return {
    times: [...TIME_POINTS],
    levelOf: (t) => timeInfo(t).periodLevel,
    drawn: (id, t) => drawsAt(card(id), t) && !movedAt(card(id), t),
    sagaDrawn: (id, level) => sagaLevelsOf(card(id)).includes(level),
    inPhase: (g, level) => inPhase(g, level),
  }
}

/**
 * 대상을 비킨 부분(dodge, dodgeMoved)에 시점 열쇠를 단다 — 손그림 부분·지형 칸·이름. dodge 는 그 대상의 자리(timeline.ts 의 dodgeTimeGate),
 * dodgeMoved 는 그 대상을 시점별 보기에서 옮긴 자리(time.moved — 그 시점에 앱이 옮긴 자리에 그리면 끈다)다. 둘 다 지운다. 어긋난 것은 problems 로
 */
export function deriveDodgeTimes(art, cardOf) {
  const drawsAt = drawsAtOf(cardOf)
  const problems = []
  const idsOk = (what, i, key, ids) => {
    if (!Array.isArray(ids) || !ids.length || ids.some((x) => typeof x !== 'string')) return problems.push(`${what} ${i} 번의 ${key} 는 카드 id 목록`) && false
    const missing = ids.filter((id) => !cardOf.has(id))
    if (missing.length) return problems.push(`${what} ${i} 번의 ${key} '${missing.join("', '")}' 는 페이즈 카드가 아니다`) && false
    return true
  }
  for (const [what, list] of [['terrain', art.terrain], ['parts', art.parts], ['labels', art.labels ?? []]])
    for (const [i, o] of list.entries()) {
      if (o.dodge === undefined && o.dodgeMoved === undefined) continue
      const { dodge, dodgeMoved } = o
      delete o.dodge
      delete o.dodgeMoved
      if (o.time !== undefined || o.timeOnly !== undefined) {
        problems.push(`${what} ${i} 번(dodge)에 원본이 time·timeOnly 를 썼다 — dodge 의 시점 열쇠는 카드에서 셈한다`)
        continue
      }
      if (dodge !== undefined && !idsOk(what, i, 'dodge', dodge)) continue
      if (dodgeMoved !== undefined && !idsOk(what, i, 'dodgeMoved', dodgeMoved)) continue
      const time = (dodge && dodgeTimeGate(o, dodge.map((id) => cardOf.get(id)), drawsAt)) || {}
      for (const [k, t] of TIME_KEYS) {
        const movedHere = (dodgeMoved ?? []).some((id) => drawsAt(cardOf.get(id), t) && movedAt(cardOf.get(id), t) && childMapAt(cardOf.get(id), t) === art.id)
        if (movedHere && (time[k] ?? inPhase(o, timeInfo(t).periodLevel))) time[k] = false
      }
      if (Object.keys(time).length) o.time = time
    }
  return problems
}

/** 카드 그림의 상자 (지도 단위) — at 자리, frames(frames.json — 없으면 카드의 frame) */
export function worldBoxOf(card, at, flip, frames) {
  const f = frames?.[card.id]?.slice(1) ?? card.frame
  if (f?.length !== 6) return { x0: at[0] - card.size / 2, y0: at[1] - card.size, x1: at[0] + card.size / 2, y1: at[1] }
  const [vx, vy, vw, vh, ax, ay] = f
  const q = card.size / Math.max(vw, vh)
  const [l, r] = flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
  return { x0: at[0] - l * q, y0: at[1] - (ay - vy) * q, x1: at[0] + r * q, y1: at[1] + (vy + vh - ay) * q }
}

/**
 * 세계 지도 그림의 이름 상자(지도 단위) — 그 지역 상세가 처음 나오는 배율의 13px 이름(영어·한국어 가운데 넓은 것), side 쪽 (movedSpotBoxes 와 같은 셈).
 * 그림 크기를 모르는 지역 상세면 null
 */
export function worldCapOf(card, box, side, m) {
  const size = CHILD_MAP_SIZES[m.id]
  if (!size) return null
  const k = size[0] / (m.bounds.x1 - m.bounds.x0)
  const px = TIER_PX_PER_UNIT[detailTierOf(k)]
  const font = 13
  const w = (Math.max(...[card.name, card.nameKo].filter(Boolean).map(textEm)) * font * 1.25 + 4) / px
  if (side === 'right' || side === 'left') {
    const y = (box.y0 + box.y1) / 2
    const h = font / px
    return side === 'right' ? { x0: box.x1, y0: y - h, x1: box.x1 + 7 / px + w, y1: y + h } : { x0: box.x0 - 7 / px - w, y0: y - h, x1: box.x0, y1: y + h }
  }
  const x = (box.x0 + box.x1) / 2
  return side === 'above'
    ? { x0: x - w / 2 - 4 / px, y0: box.y0 - (6 + 2 * font) / px, x1: x + w / 2 + 4 / px, y1: box.y0 }
    : { x0: x - w / 2 - 4 / px, y0: box.y1, x1: x + w / 2 + 4 / px, y1: box.y1 + (6 + 2 * font) / px }
}

/**
 * 세계 지도 그림의 상자(지도 단위)가 걸치는 지역 상세들 — 그림 넓이의 15% 넘게 범위에 드는 것, 또는 (capOf 가 있으면) 그 지역 상세가 처음 나오는
 * 배율의 이름 상자가 15% 넘게 드는 것(그림은 거의 밖이고 이름만 범위 안 — 그 지역 상세는 이름 자리만 비킨다). 더 깊은 지역 상세가 든 곳의 부모는
 * 그 더 깊은 범위 밖의 부모 몫에 그림이나 이름이 15% 넘게 들 때만 남긴다 (부모 그림은 더 깊은 범위에서 옅어지지만, 부모가 처음 나오는 배율에는
 * 더 깊은 지역 상세가 아직 없어 부모의 기호가 그 자리에 있다). 그 그림들이 그 자리를 비켜 그린다
 */
/**
 * 그림 상자 넓이 total 가운데 inside 만큼이 지역 상세의 범위에 들면 그 지역 상세가 맡는가 — 넓이의 15% 넘게, 또는 큰 그림이면 HOST_AREA(지도 단위², 8×8)
 * 넘게 (15% 만 보면 큰 그림은 지역 상세의 기호 위로 제법 넓게 걸쳐도 검사를 받지 않는다). 이름 상자도 같다. to_ts.mjs 의 [15] 도 이것으로 그림·이름이 범위에 드는지 본다
 */
export const HOST_AREA = 64
export const hostsShare = (inside, total, perUnit = 1) => inside > Math.min(0.15 * total, HOST_AREA * perUnit * perUnit)

export function worldHostsOf(box, capOf) {
  const area = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
  const over = (m, b) => area({ x0: Math.max(b.x0, m.bounds.x0), y0: Math.max(b.y0, m.bounds.y0), x1: Math.min(b.x1, m.bounds.x1), y1: Math.min(b.y1, m.bounds.y1) })
  const capIn = (m) => {
    const c = capOf?.(m)
    return c && area(c) > 0 && hostsShare(over(m, c), area(c)) ? c : null
  }
  const hit = CHILD_MAPS.filter((m) => hostsShare(over(m, box), area(box)) || capIn(m))
  return hit
    .filter((m) => {
      const deeper = hit.filter((d) => d.parent === m.id)
      if (!deeper.length) return true
      // 더 깊은 범위 밖의 부모 몫 (같은 부모의 더 깊은 지역 상세끼리는 겹치지 않는다)
      const rest = (b) => over(m, b) - deeper.reduce((n, d) => n + over(d, b), 0)
      const c = capOf?.(m)
      return hostsShare(rest(box), area(box)) || (c && area(c) > 0 && hostsShare(rest(c), area(c)))
    })
    .map((m) => m.id)
}

/**
 * 앱이 시점 t 에 그 카드의 이름을 먼저 두는 쪽 — App.tsx 의 phaseCards 와 같은 셈: 옮긴 시점은 time.moved[t] 의 label ?? 카드의 label,
 * 옮기지 않은 시점은 time.label[t] ?? 카드의 label, 없으면 밑 (timeline.ts 의 V1 이 옮긴 시점의 time.label 을 막는다). t 가 없으면 사가 보기의 쪽
 */
export function labelSideAt(card, t) {
  if (t === undefined) return card.label ?? 'below'
  const mv = card.time?.moved?.[t]
  return (mv ? (mv.label ?? card.label) : (card.time?.label?.[t] ?? card.label)) ?? 'below'
}

/** 시점 t 에 그 카드를 제자리에 두고 이름 쪽만 사가 보기와 다르게 그리는가 (time.label — 옮긴 시점은 moved 의 label 이 맡는다) */
export function sideOnlyAt(card, t) {
  return !card.time?.moved?.[t] && Boolean(card.time?.label?.[t]) && labelSideAt(card, t) !== labelSideAt(card)
}

/** 세계 지도 그림을 시점 t 에 세계 지도 그림 그대로 옮긴 자리가 걸치는 지역 상세들 (worldHostsOf — 그림 상자와 그 시점의 이름 쪽 상자) */
export function worldMoveHostsOf(card, t, frames) {
  const mv = card.time?.moved?.[t]
  if (!mv) return []
  const box = worldBoxOf(card, mv.at, mv.flip ?? card.flip, frames)
  const side = labelSideAt(card, t)
  return worldHostsOf(box, (m) => worldCapOf(card, box, side, m))
}

/**
 * 세계 지도 그림의 제자리 상자가 시점 t 의 이름 쪽(t 가 없으면 사가 보기의 쪽 — labelSideAt)으로 걸치는 지역 상세들 (worldHostsOf). 제자리가 지역 상세
 * 여럿에 걸치거나 기준점이 어느 범위에도 들지 않아도 상자가 걸치는 것을 모두 — 기준점을 담은 지역 상세 하나만이 아니다
 */
export function worldHomeHostsOf(card, frames, t) {
  if (!card.at) return []
  const box = worldBoxOf(card, card.at, card.flip, frames)
  const side = labelSideAt(card, t)
  return worldHostsOf(box, (m) => worldCapOf(card, box, side, m))
}

/**
 * 시점 t 에 그 카드를 옮긴 자리를 이 그림이 비켜 그려야 하는가 — time.moved 의 childMap(다른 지역 상세로 옮겨 옴)이나 카드의 지역 상세가 이 그림이거나,
 * 세계 지도 그림 그대로 옮긴 자리(time.moved 에 childMap 없이)가 이 그림의 범위에 걸치면(worldHostsOf). 옮기지 않고 이름 쪽만 바꾼 시점(sideOnlyAt)은
 * 카드의 지역 상세가 이 그림이거나, 세계 지도 그림의 제자리가 그 시점의 이름 쪽으로 이 그림에 걸치면(worldHomeHostsOf)
 */
export function movedOnto(card, t, artId, frames) {
  if (sideOnlyAt(card, t)) return card.childMap !== undefined ? card.childMap === artId : worldHomeHostsOf(card, frames, t).includes(artId)
  const mv = card.time?.moved?.[t]
  if (!mv) return false
  const cm = childMapAt(card, t)
  if (cm !== undefined) return cm === artId
  return worldMoveHostsOf(card, t, frames).includes(artId)
}

/** 원본을 실행한 그림에 시점별 보기의 열쇠를 모두 단다 — 빈터(for·movedFor)와 대상을 비킨 부분(dodge) */
export function deriveTimeKeys(art, cardOf, frames) {
  return [...deriveClearingTimes(art, cardOf, frames), ...deriveDodgeTimes(art, cardOf)]
}

/**
 * 그림의 빈터에 시점 열쇠를 단다 (for·movedFor 가 있는 것만, 고쳐 쓴다). cardOf: 카드 id → 페이즈 카드, frames: src/map/figures/frames.json (없으면 카드의 frame). 어긋난 것(모르는 카드, 원본이 직접 쓴 time)은 problems 로 돌려준다
 */
export function deriveClearingTimes(art, cardOf, frames) {
  const drawsAt = drawsAtOf(cardOf)
  const problems = []
  const never = []
  for (const [i, c] of (art.clearings ?? []).entries()) {
    if (c.movedFor !== undefined) {
      // 옮긴 자리의 빈터 — 시점별 보기에서 그 카드를 그 시점에만 옮긴 자리(time.moved)에 앱이 그릴 때만 켠다. 사가 보기에는 없다(timeOnly)
      const p = movedClearingProblem(c, cardOf)
      if (p) {
        problems.push(`clearings ${i} 번 — ${p}`)
        continue
      }
      const cards = c.movedFor.map((id) => cardOf.get(id))
      // 그 시점에 이 그림에 옮겨 그릴 때만 — 다른 지역 상세·세계 지도로 옮긴 시점(time.moved 의 childMap)은 이 그림이 아니다. 다른 지역 상세의 카드가 그 시점에
      // 이 그림으로 옮겨 오면(childMap 이 이 그림) 그 자리도 이 빈터가 연다. 한 카드를 여러 시점에 다른 자리로 옮기면 빈터도 자리마다 따로라, 그 시점의 옮긴
      // 자리(그림·이름 상자)를 덮는 데 쓰이는 빈터만 연다(movedClearingsAt) — 다른 시점의 자리를 비운 빈터가 이 시점에 빈 구멍으로 남지 않게
      const opens = new Set(
        cards.flatMap((card) =>
          TIME_POINTS.filter(
            (t) => (card.time?.moved?.[t] || sideOnlyAt(card, t)) && drawsAt(card, t) && movedOnto(card, t, art.id, frames) && movedClearingsAt(art, card, t, frames).includes(c),
          ),
        ),
      )
      const time = Object.fromEntries(TIME_KEYS.filter(([, t]) => opens.has(t)).map(([k]) => [k, true]))
      if (Object.keys(time).length) {
        c.time = time
        c.timeOnly = true
      } else never.push(c)
      continue
    }
    if (c.for === undefined) continue
    if (!Array.isArray(c.for) || !c.for.length || c.for.some((x) => typeof x !== 'string')) {
      problems.push(`clearings ${i} 번의 for 는 카드 id 목록`)
      continue
    }
    const missing = c.for.filter((id) => !cardOf.has(id))
    if (missing.length) {
      problems.push(`clearings ${i} 번의 for '${missing.join("', '")}' 는 페이즈 카드가 아니다`)
      continue
    }
    if (c.time !== undefined) {
      problems.push(`clearings ${i} 번(for ${c.for.join('·')})에 원본이 time 을 썼다 — 빈터의 시점 열쇠는 for 에서 셈한다 (지운다)`)
      continue
    }
    const time = forTimeGate(c, c.for.map((id) => cardOf.get(id)), drawsAt)
    if (time) c.time = time
  }
  // 앱이 어느 시점에도 그 자리에 그리지 않는 옮긴 자리의 빈터는 싣지 않는다
  if (never.length) art.clearings = art.clearings.filter((c) => !never.includes(c))
  return problems
}

/** 글자 폭 (em) — src/map/labels.ts 의 textWidthEm 과 같은 어림 (to_ts.mjs 의 textEm) */
function textEm(text) {
  let w = 0
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if (c >= 0xac00 && c <= 0xd7a3) w += 0.98
    else if (ch === ' ') w += 0.26
    else if (/[A-Z]/.test(ch)) w += 0.66
    else if (/[il'’.,]/.test(ch)) w += 0.26
    else w += 0.47
  }
  return w
}
const boxArea = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)

/**
 * 시점 t 에 그 카드를 옮긴 자리(그림 좌표)의 그림 상자와 이름 상자 — 이 그림의 대상이면 subjects 의 moved[t], 다른 지역 상세·세계 지도에서 옮겨 오면
 * 카드의 time.moved[t] 를 그림 좌표로. 그림 상자는 frames(frames.json — 묶음 이름 뒤 viewBox·기준점, 없으면 카드의 frame), 이름 상자는 지역 상세가
 * 나오는 배율의 13px 이름(영어·한국어 가운데 넓은 것, label 쪽 — to_ts.mjs 의 captionBox). 옮긴 자리를 모르면 null
 */
function movedSpotBoxes(art, card, t, frames) {
  const m = CHILD_MAPS.find((x) => x.id === art.id)
  if (!m) return null
  const k = art.size[0] / (m.bounds.x1 - m.bounds.x0)
  const spot = art.subjects?.[card.id]
  const mv = card.time?.moved?.[t]
  let at, size, flip, side
  // 이름 쪽만 바꾼 시점 — 그림은 제자리(그 자리는 그 카드의 빈터 for 가 비운다)라 이름 상자만 본다
  let capOnly = false
  if (sideOnlyAt(card, t)) {
    capOnly = true
    ;[at, size, flip, side] = spot
      ? [spot.at, spot.size, spot.flip, labelSideAt(card, t)]
      : [[(card.at[0] - m.bounds.x0) * k, (card.at[1] - m.bounds.y0) * k], card.size * k, card.flip, labelSideAt(card, t)]
  } else if (spot?.moved?.[t]) {
    const sm = spot.moved[t]
    ;[at, size, flip, side] = [sm.at, spot.size, sm.flip ?? spot.flip, sm.label ?? spot.label ?? 'below']
  } else if (!spot && mv) {
    ;[at, size, flip, side] = [[(mv.at[0] - m.bounds.x0) * k, (mv.at[1] - m.bounds.y0) * k], card.size * k, mv.flip ?? card.flip, labelSideAt(card, t)]
  } else return null
  const f = frames?.[card.id]?.slice(1) ?? card.frame
  let fig
  if (f?.length === 6) {
    const [vx, vy, vw, vh, ax, ay] = f
    const q = size / Math.max(vw, vh)
    const [l, r] = flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
    fig = { x0: at[0] - l * q, y0: at[1] - (ay - vy) * q, x1: at[0] + r * q, y1: at[1] + (vy + vh - ay) * q }
  } else fig = { x0: at[0] - size / 2, y0: at[1] - size, x1: at[0] + size / 2, y1: at[1] }
  const px = TIER_PX_PER_UNIT[detailTierOf(k)] / k
  const font = 13
  const w = (Math.max(...[card.name, card.nameKo].filter(Boolean).map(textEm)) * font * 1.25 + 4) / px
  let cap
  if (side === 'right' || side === 'left') {
    const y = (fig.y0 + fig.y1) / 2
    const h = font / px
    cap = side === 'right' ? { x0: fig.x1, y0: y - h, x1: fig.x1 + 7 / px + w, y1: y + h } : { x0: fig.x0 - 7 / px - w, y0: y - h, x1: fig.x0, y1: y + h }
  } else {
    const x = (fig.x0 + fig.x1) / 2
    cap = side === 'above' ? { x0: x - w / 2 - 4 / px, y0: fig.y0 - (6 + 2 * font) / px, x1: x + w / 2 + 4 / px, y1: fig.y0 } : { x0: x - w / 2 - 4 / px, y0: fig.y1, x1: x + w / 2 + 4 / px, y1: fig.y1 + (6 + 2 * font) / px }
  }
  return { fig, cap, capOnly }
}

/** 점이 고리 안인가 (짝수-홀수) */
function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * 시점 t 에 그 카드를 이 그림에 옮긴 자리를 비우는 빈터들 — 그 카드의 movedFor 빈터 가운데, 그 자리(그림·이름 상자를 고르게 찍은 표본, 넓이로 무게)를
 * 가장 많이 덮는 것부터 하나씩 골라 아직 덮이지 않은 표본을 그 자리 넓이의 15% 넘게 더 덮는 것만. 같은 카드의 다른 시점 자리를 비운 빈터가 이 자리에
 * 조금 걸쳐도 열리지 않고, 그림과 이름을 따로 비운 두 빈터(이름만 쪽을 바꾼 시점)는 함께 열린다. 옮긴 자리를 모르면 그 카드의 movedFor 빈터를 모두 연다
 */
function movedClearingsAt(art, card, t, frames) {
  const mine = (art.clearings ?? []).filter((c) => Array.isArray(c.movedFor) && c.movedFor.includes(card.id) && c.points?.length >= 3)
  const boxes = movedSpotBoxes(art, card, t, frames)
  if (!boxes) return mine
  const N = 12
  const samples = (boxes.capOnly ? [boxes.cap] : [boxes.fig, boxes.cap]).flatMap((b) =>
    Array.from({ length: N * N }, (_, i) => ({ x: b.x0 + ((i % N) + 0.5) * ((b.x1 - b.x0) / N), y: b.y0 + (Math.floor(i / N) + 0.5) * ((b.y1 - b.y0) / N), w: boxArea(b) / (N * N) })),
  )
  const total = samples.reduce((n, q) => n + q.w, 0) || 1
  const hits = new Map(mine.map((c) => [c, samples.map((q) => inRing(q.x, q.y, c.points))]))
  const covered = samples.map(() => false)
  const chosen = []
  for (;;) {
    let best = null
    let gain = 0
    for (const c of mine) {
      if (chosen.includes(c)) continue
      const g = samples.reduce((n, q, i) => n + (hits.get(c)[i] && !covered[i] ? q.w : 0), 0)
      if (g > gain) [best, gain] = [c, g]
    }
    if (!best || gain <= 0.15 * total) break
    chosen.push(best)
    hits.get(best).forEach((h, i) => h && (covered[i] = true))
  }
  return chosen
}

/** 옮긴 자리의 빈터(movedFor)가 맞는 모양인가 — 어긋나면 그 까닭. 원본은 문(페이즈·시점 열쇠)·for 를 쓰지 않는다 (시점 열쇠는 카드의 time.moved 에서 셈한다) */
export function movedClearingProblem(c, cardOf) {
  if (!Array.isArray(c.movedFor) || !c.movedFor.length || c.movedFor.some((x) => typeof x !== 'string')) return 'movedFor 는 카드 id 목록'
  const missing = c.movedFor.filter((id) => !cardOf.has(id))
  if (missing.length) return `movedFor '${missing.join("', '")}' 는 페이즈 카드가 아니다`
  const still = c.movedFor.filter((id) => !Object.keys(cardOf.get(id).time?.moved ?? {}).length && !Object.keys(cardOf.get(id).time?.label ?? {}).length)
  if (still.length) return `movedFor '${still.join("', '")}' 는 어느 시점에도 옮기거나 이름 쪽을 바꾸지 않은 카드다 (time.moved·time.label 이 없다)`
  if (c.for !== undefined || c.time !== undefined || c.timeOnly !== undefined || Object.keys(c).some((k) => /^phase\d?$/.test(k)))
    return 'movedFor 빈터에는 for·time·timeOnly·페이즈 문을 쓰지 않는다 — 카드의 time.moved 에서 셈한다'
  return null
}
