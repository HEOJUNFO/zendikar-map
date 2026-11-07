// 페이즈 카드의 세트 검사 (E0–E4) — 인쇄된 세트(set), 그 페이즈의 이야기 세트(sagaSet), 이야기 세트 밖의 카드가 그 무렵에 오른 까닭(era).
// src/data/phase.ts(지도 조각)와 vite/phaseData.ts(원본 — 글의 해까지)가 부르고, scripts/qa/extra-set-test.mjs 가 시험한다.
// 의존이 없게 둔다 (sagas.ts·timeline.ts·extraSets.ts 만) — Node 도구도 이 파일을 그대로 읽는다. 런타임 import 는 확장자를 붙인다
import { defaultEraSet, EXTRA_SETS, isDate, isStorySet } from './extraSets.ts'
import { levelOfSet, sagaSetOf, timeInfo, timeOfSet } from './timeline.ts'

/** 검사가 보는 카드 — 원본(PhaseCard — era 의 글)이든 지도 조각(PhaseMapCard — era 의 글은 있는지만)이든 */
export interface SetCard {
  name: string
  set: string
  sagaSet?: string
  era?: { released: string; basis?: string | true; estimate?: string | true }
}

/**
 * 카드의 세트가 이 파일의 페이즈(level — 이어 센 번호)에 맞는가 (없으면 빈 목록)
 * - E1 인쇄된 세트가 이야기 세트면: sagaSet 은 그 세트가 이 페이즈보다 앞설 때만(앞 사가의 카드를 다시 실은 카드). era 는 달지 않는다
 * - E2 인쇄된 세트가 이야기 세트가 아니면: extraSets.ts 의 EXTRA_SETS 에 있고, sagaSet 에 이야기 세트를, era.released 에 카드가 처음 인쇄된 날(YYYY-MM-DD)을 단다
 * - E3 그 무렵은 카드가 처음 인쇄된 날보다 뒤일 수 없다 — sagaSet 의 단계가 defaultEraSet(era.released) 의 단계를 넘지 않는다
 * - E4 era 에 basis(카드 글·공식 기사가 밝힌 무렵)나 estimate(이 지도의 판단 — 패널에 '추정')가 있고, 글이면 그 무렵의 해(시점 단추 글 — 2016)를 적는다
 *   (지도 조각은 글이 있는지만 — 해는 원본에서 본다)
 * - E0 sagaSetOf(c) 가 이 파일의 페이즈의 세트다
 */
export function setProblems(c: SetCard, file: string, level: number): string[] {
  const out: string[] = []
  const tag = `${file}: ${c.name}`
  if (isStorySet(c.set)) {
    if (c.sagaSet !== undefined && levelOfSet(c.set) >= level) out.push(`E1: ${tag} — sagaSet 은 앞 사가의 카드를 다시 실을 때만 단다 (인쇄된 세트 ${c.set})`)
    if (c.era) out.push(`E1: ${tag} — era 는 이야기 세트 밖의 카드에만 단다 (인쇄된 세트 ${c.set})`)
  } else {
    if (!EXTRA_SETS[c.set]) out.push(`E2: ${tag} — 세트 '${c.set}' 가 이야기 세트도 아니고 extraSets.ts 의 EXTRA_SETS 에도 없다 (소문자 Scryfall 코드)`)
    if (c.sagaSet === undefined || !isStorySet(c.sagaSet))
      out.push(`E2: ${tag} — 이야기 세트 밖(${c.set})의 카드는 sagaSet 에 그 장면 무렵의 이야기 세트를 단다 (지금 ${c.sagaSet ?? '없음'})`)
    if (!c.era || typeof c.era.released !== 'string' || !isDate(c.era.released))
      out.push(`E2: ${tag} — 이야기 세트 밖의 카드는 era.released 에 카드가 처음 인쇄된 날(YYYY-MM-DD)을 단다`)
    if (out.length) return out
    const era = c.era!
    const latest = defaultEraSet(era.released)
    if (levelOfSet(c.sagaSet!) > levelOfSet(latest))
      out.push(`E3: ${tag} — 그 무렵(${c.sagaSet})이 카드가 처음 인쇄된 날(${era.released}) 뒤다 — ${latest} 까지만`)
    const year = timeInfo(timeOfSet(c.sagaSet!)).button
    const text = [era.basis, era.estimate].filter((x): x is string => typeof x === 'string').join(' ')
    if (!era.basis && !era.estimate) out.push(`E4: ${tag} — 그 무렵(${c.sagaSet})에 오른 까닭을 era.basis(글이 밝힘)나 era.estimate(이 지도의 판단)에 적는다`)
    else if (text && !text.includes(year)) out.push(`E4: ${tag} — era 글에 그 무렵의 해(${year})를 적는다`)
  }
  if (isStorySet(sagaSetOf(c)) && levelOfSet(sagaSetOf(c)) !== level) out.push(`E0: ${tag} 의 세트 ${sagaSetOf(c)} 가 이 파일의 페이즈(${level})의 세트가 아니다`)
  return out
}
