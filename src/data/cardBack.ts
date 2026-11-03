// 변신하는 양면 카드(MOM 의 배틀 // 생물, 변신 생물 — 사용자 결정 2026-11-03)의 뒷면 검사 — PhaseCard.back (types.ts 의 CardBack).
// 앞면을 그림으로 그리고 뒷면은 카드 패널의 '양면 카드'에만 싣는다. 주문·생물 // 대지 카드의 대지 면(PhaseCard.land — src/data/landFace.ts)과는 다른 칸이다.
// 부르는 곳: vite/phaseData.ts 의 지도 조각(?map — 빌드·개발 서버가 페이즈 원본을 읽을 때 멈춘다), scripts/qa/back-face-test.mjs.
// Node 가 그대로 읽게 런타임 import 는 확장자를 붙인다 (지금은 타입만).
import type { CardBack, Location } from './types.ts'

/** 검사가 보는 카드 — 페이즈 원본(phase<n>.ts 의 PhaseCard)과 같은 모양이면 된다 */
interface CardLike {
  id?: unknown
  name?: unknown
  place?: unknown
  land?: unknown
  back?: unknown
}

/**
 * 뒷면의 어긋난 것 (없으면 빈 목록) — file 은 메시지에 쓰는 원본 이름
 * - B1 대지 면(land)과 함께 달지 않는다 — 둘째 면은 하나다. 대지인 둘째 면은 land 에 (장소 패널에 실린다)
 * - B2 place: true(카드가 곧 장소 — 그림 없음)와 함께 달지 않는다 — 뒷면은 그린 앞면의 둘째 면이다
 * - B3 이름이 있고 앞면 이름과 다르다
 * - B4 유형 줄이 있고 Land 가 없다 — 대지인 면은 land 에 (Awakened Skyclave 의 '대지이기도 하다'는 능력 글이지 유형 줄이 아니다)
 * - B5 그림은 Scryfall 의 뒷면 그림(cards.scryfall.io/…/back/…)
 * - B6 이름이 장소 이름·별칭이 아니다 — 한 곳은 한 번만 (그 장소와 하나인 면이면 대지 면이나 장소와 하나인 카드로)
 */
export function cardBackProblems(cards: readonly CardLike[], ctx: { locations: readonly Location[] }, file = 'phase<n>.ts'): string[] {
  const problems: string[] = []
  for (const c of cards) {
    const back = c.back as Partial<CardBack> | undefined
    if (back === undefined) continue
    const who = `${file}: ${String(c.name)} // ${String(back?.name)}`
    if (c.land !== undefined) problems.push(`B1: ${who} — 뒷면(back)과 대지 면(land)을 함께 달지 않는다 (둘째 면은 하나 — 대지인 면은 land 에)`)
    if (c.place) problems.push(`B2: ${who} — 장소와 하나인 카드(place: true)는 그림이 없어 뒷면을 달지 않는다`)
    if (typeof back.name !== 'string' || !back.name.trim()) problems.push(`B3: ${who} — 뒷면 이름이 없다`)
    else if (back.name === c.name) problems.push(`B3: ${who} — 뒷면 이름이 앞면 이름과 같다`)
    if (typeof back.typeLine !== 'string' || !back.typeLine.trim()) problems.push(`B4: ${who} — 뒷면 유형 줄(typeLine)이 없다`)
    else if (/\bLand\b/.test(back.typeLine)) problems.push(`B4: ${who} — 뒷면 유형 '${back.typeLine}' 에 Land 가 있다 — 대지인 둘째 면은 land 에 단다 (장소 패널에 실린다)`)
    if (typeof back.image !== 'string' || !/^https:\/\/cards\.scryfall\.io\/[^/]+\/back\//.test(back.image)) problems.push(`B5: ${who} — 뒷면 그림이 Scryfall 뒷면 그림(cards.scryfall.io/…/back/…)이 아니다`)
    const place = typeof back.name === 'string' ? ctx.locations.find((l) => [l.name, ...(l.aliases ?? [])].includes(back.name as string)) : undefined
    if (place) problems.push(`B6: ${who} — 뒷면 이름이 장소 '${place.id}' 의 이름·별칭이다 (한 곳은 한 번만 — 그 장소와 하나인 면은 대지 면이나 장소와 하나인 카드로)`)
  }
  return problems
}
