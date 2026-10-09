// 페이즈 데이터 — 원본(phase1.ts·phase2.ts, 카드 설명·근거 글이 길다)과 거기서 만든 조회표.
// 첫 화면에는 필요 없어 따로 나뉜 조각으로 둔다: 페이즈를 켜거나 모르는 카드 주소(#card/카드id)가 들어올 때 App 이 불러온다.
import { LAND_CARDS } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents } from './continents'
import { locations } from './locations'
import { PHASE1_CARDS, type PhaseCard } from './phase1'
import { PHASE2_CARDS } from './phase2'

/** 페이즈마다 새로 오르는 카드 — 페이즈 n 은 1..n 의 카드를 모두 그린다 (페이즈2 = 페이즈1 + WWK) */
const BY_PHASE: readonly PhaseCard[][] = [PHASE1_CARDS, PHASE2_CARDS]

// 페이즈 카드도 가리키는 곳이 있어야 하고, 카드 패널 주소(#card/카드id)가 대지 카드나 다른 페이즈 카드와 겹치면 안 된다
const seen = new Set<string>()
BY_PHASE.forEach((cards, i) => {
  const file = `phase${i + 1}.ts`
  for (const c of cards) {
    const d = c.depicts
    const ok = d.type === 'location' ? locations.some((l) => l.id === d.id) : continents.some((x) => x.id === d.id)
    if (!ok) throw new Error(`${file}: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
    if (LAND_CARDS.some((l) => l.id === c.id)) throw new Error(`${file}: '${c.id}' 가 대지 카드 id 와 겹친다`)
    if (seen.has(c.id)) throw new Error(`${file}: '${c.id}' 가 다른 페이즈 카드 id 와 겹친다`)
    seen.add(c.id)
    const child = c.childMap ? CHILD_MAPS.find((m) => m.id === c.childMap) : undefined
    if (c.childMap && !child) throw new Error(`${file}: ${c.name} 의 지역 상세 '${c.childMap}' 가 없다`)
    if (child) {
      const b = child.bounds
      if (c.at[0] < b.x0 || c.at[0] > b.x1 || c.at[1] < b.y0 || c.at[1] > b.y1) throw new Error(`${file}: ${c.name} 의 자리가 지역 상세 '${child.id}' 범위 밖이다`)
    }
  }
})

export interface PhaseData {
  /** 페이즈 카드 — 페이즈를 켜면 그 대상이 지도에 그려진다 (지역 상세에 사는 작은 대상은 그 지역 상세가 나오는 배율부터) */
  cards: PhaseCard[]
  /** 카드가 처음 오르는 페이즈 (1: ZEN, 2: WWK) — 페이즈 n 은 이 값이 n 이하인 카드를 그린다. 페이즈 카드인지도 이것으로 가른다 */
  phaseOf: ReadonlyMap<string, number>
}

export const PHASE: PhaseData = {
  cards: BY_PHASE.flat(),
  phaseOf: new Map(BY_PHASE.flatMap((cards, i) => cards.map((c) => [c.id, i + 1] as const))),
}
