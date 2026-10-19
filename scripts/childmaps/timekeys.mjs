// 지역 상세 원본의 시점별 보기 열쇠 (src/data/sagas.ts 의 Gated·inView) — to_ts.mjs 와 context.mjs 가 함께 쓴다.
// 1. 빈터 → 카드 (for): 원본의 빈터 줄 끝 주석이 카드 id 로 시작하면(`// card-id …`, 더 깊은 지역 상세가 옮겨 그린 부모 빈터는 `// 할리마르 빈터 — card-id`)
//    그 빈터는 그 카드의 자리를 비운 것이다 — 원본을 실행하기 전에 그 줄의 객체에 for: ['card-id'] 를 넣는다. 원본에 for 를 직접 써도 된다
//    (그 줄에 for 가 이미 있으면 주석을 읽지 않는다). 카드 id 가 아닌 주석(장소 이름 자리, 페이즈 바탕 자리 …)은 for 를 달지 않는다
// 2. 시점 열쇠 (time): for 가 있는 빈터는 시점마다 timeline.ts 의 forTimeGate 로 셈해 기본값과 다른 시점만 단다 — 원본에 time 을 쓰지 않는다.
//    그 시점에 그 카드가 그려지는지는 앱의 셈(timeline.ts 의 shownAtTimeOf — 곁의 상징은 그 그림도 그릴 때만)으로 본다
//    손그림 부분·지형 칸·이름의 time·timeOnly 는 원본이 단 그대로 옮긴다 (지역 상세 손그림, S7)
// 3. 옮긴 자리의 빈터 (movedFor): 시점별 보기에서 카드를 그 시점에만 다른 자리(time.moved)에 그리면 원본은 그 자리에 movedFor: ['card-id'] 빈터를 둔다
//    (문 없이). 앱이 그 카드를 그 시점에 옮긴 자리에 그리는 시점만 켜는 시점별 보기만의 빈터(timeOnly)가 된다 — 어느 시점에도 그리지 않으면 싣지 않는다.
//    원래 자리의 빈터(for)는 옮긴 시점에 꺼진다(forTimeGate)
// 4. 대상을 비킨 부분 (dodge): 손그림 부분·지형 칸·이름이 대상의 자리를 비우려고 그 대상이 그려지는 단계에 꺼져 있으면 원본은 dodge: ['card-id'] 를 단다
//    (KIT.dodge). 시점마다 그 카드가 그 자리에 그려지면 끄고, 그리지 않는데 사가 보기가 그 단계에 그리면 켠다 (timeline.ts 의 dodgeTimeGate).
//    생성물에는 dodge 를 싣지 않고 셈한 time 만 단다
// 5. 대상 묶음마다의 변형 (KIT.bySubjects): 원본을 실행하는 쪽이 전역 TIMELINE(timelineFor)을 넣어 두면 kit.js 의 bySubjects 가 시점마다 그려지는
//    대상 묶음을 보고 사가 보기의 변형에 시점 열쇠를 달고, 사가 보기에 없는 묶음은 시점별 보기만의 변형(timeOnly)으로 만든다
import { inPhase, TIME_KEYS } from '../../src/data/sagas.ts'
import { dodgeTimeGate, forTimeGate, movedAt, sagaLevelsOf, shownAtTimeOf, timeInfo, TIME_POINTS } from '../../src/data/timeline.ts'

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
    if (typeof o.time !== 'object' || o.time === null) return 'time 은 { t1…t4: true|false } 객체'
    for (const [k, v] of Object.entries(o.time)) {
      if (!TIME_KEYS.some(([n]) => n === k)) return `time 의 모르는 열쇠 '${k}' — t1·t2·t3·t4 가운데`
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
        const movedHere = (dodgeMoved ?? []).some((id) => drawsAt(cardOf.get(id), t) && movedAt(cardOf.get(id), t))
        if (movedHere && (time[k] ?? inPhase(o, timeInfo(t).periodLevel))) time[k] = false
      }
      if (Object.keys(time).length) o.time = time
    }
  return problems
}

/** 원본을 실행한 그림에 시점별 보기의 열쇠를 모두 단다 — 빈터(for·movedFor)와 대상을 비킨 부분(dodge) */
export function deriveTimeKeys(art, cardOf) {
  return [...deriveClearingTimes(art, cardOf), ...deriveDodgeTimes(art, cardOf)]
}

/**
 * 그림의 빈터에 시점 열쇠를 단다 (for·movedFor 가 있는 것만, 고쳐 쓴다). cardOf: 카드 id → 페이즈 카드. 어긋난 것(모르는 카드, 원본이 직접 쓴 time)은 problems 로 돌려준다
 */
export function deriveClearingTimes(art, cardOf) {
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
      const time = Object.fromEntries(TIME_KEYS.filter(([, t]) => cards.some((card) => card.time?.moved?.[t] && drawsAt(card, t))).map(([k]) => [k, true]))
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

/** 옮긴 자리의 빈터(movedFor)가 맞는 모양인가 — 어긋나면 그 까닭. 원본은 문(페이즈·시점 열쇠)·for 를 쓰지 않는다 (시점 열쇠는 카드의 time.moved 에서 셈한다) */
export function movedClearingProblem(c, cardOf) {
  if (!Array.isArray(c.movedFor) || !c.movedFor.length || c.movedFor.some((x) => typeof x !== 'string')) return 'movedFor 는 카드 id 목록'
  const missing = c.movedFor.filter((id) => !cardOf.has(id))
  if (missing.length) return `movedFor '${missing.join("', '")}' 는 페이즈 카드가 아니다`
  const still = c.movedFor.filter((id) => !Object.keys(cardOf.get(id).time?.moved ?? {}).length)
  if (still.length) return `movedFor '${still.join("', '")}' 는 어느 시점에도 옮기지 않은 카드다 (time.moved 가 없다)`
  if (c.for !== undefined || c.time !== undefined || c.timeOnly !== undefined || Object.keys(c).some((k) => /^phase\d?$/.test(k)))
    return 'movedFor 빈터에는 for·time·timeOnly·페이즈 문을 쓰지 않는다 — 카드의 time.moved 에서 셈한다'
  return null
}
