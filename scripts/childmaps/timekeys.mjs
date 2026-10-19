// 지역 상세 원본의 시점별 보기 열쇠 (src/data/sagas.ts 의 Gated·inView) — to_ts.mjs 와 context.mjs 가 함께 쓴다.
// 1. 빈터 → 카드 (for): 원본의 빈터 줄 끝 주석이 카드 id 로 시작하면(`// card-id …`, 더 깊은 지역 상세가 옮겨 그린 부모 빈터는 `// 할리마르 빈터 — card-id`)
//    그 빈터는 그 카드의 자리를 비운 것이다 — 원본을 실행하기 전에 그 줄의 객체에 for: ['card-id'] 를 넣는다. 원본에 for 를 직접 써도 된다
//    (그 줄에 for 가 이미 있으면 주석을 읽지 않는다). 카드 id 가 아닌 주석(장소 이름 자리, 페이즈 바탕 자리 …)은 for 를 달지 않는다
// 2. 시점 열쇠 (time): for 가 있는 빈터는 시점마다 timeline.ts 의 forTimeGate 로 셈해 기본값과 다른 시점만 단다 — 원본에 time 을 쓰지 않는다.
//    그 시점에 그 카드가 그려지는지는 앱의 셈(timeline.ts 의 shownAtTimeOf — 지역 상세 그림이 맞추지 않은 대상은 그리지 않는다)으로 본다
//    손그림 부분·지형 칸·이름의 time·timeOnly 는 원본이 단 그대로 옮긴다 (지역 상세 손그림, S7)
import { TIME_KEYS } from '../../src/data/sagas.ts'
import { forTimeGate, sagaLookupOf, shownAtTimeOf } from '../../src/data/timeline.ts'

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
    if (!/^\s*\{\s*points:/.test(code) || /\bfor\s*:/.test(code)) return line
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

const lookups = new WeakMap()
/**
 * 앱이 시점 t 에 그 카드를 그리는가 (timeline.ts 의 shownAtTimeOf — App.tsx 의 shownAtTime 과 같은 셈). cardOf: 카드 id → 페이즈 카드,
 * arts: 읽은 지역 상세 그림 — 그림의 timeReady(그 대상의 손그림을 그 시점에 맞췄다)를 본다 (S7 에 앱도 같은 표를 받는다)
 */
export function drawsAtOf(cardOf, arts = []) {
  let lookup = lookups.get(cardOf)
  if (!lookup) lookups.set(cardOf, (lookup = sagaLookupOf([...cardOf.values()])))
  const timeReady = (map, id, t) => Boolean(arts.find((a) => a.id === map)?.timeReady?.[id]?.includes(t))
  return (c, t) => shownAtTimeOf(c, t, lookup, (id) => cardOf.get(id), timeReady)
}

/**
 * 그림의 빈터에 시점 열쇠를 단다 (for 가 있는 것만, 고쳐 쓴다). cardOf: 카드 id → 페이즈 카드, arts: timeReady 를 볼 지역 상세 그림
 * (이 그림과 그 부모·더 깊은 지역 상세 — 없으면 이 그림만). 어긋난 것(모르는 카드, 원본이 직접 쓴 time)은 problems 로 돌려준다
 */
export function deriveClearingTimes(art, cardOf, arts = [art]) {
  const drawsAt = drawsAtOf(cardOf, arts)
  const problems = []
  for (const [i, c] of (art.clearings ?? []).entries()) {
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
  return problems
}
