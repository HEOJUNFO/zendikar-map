// 페이즈1 데이터 — 원본(phase1.ts, 카드 설명·근거 글이 길다)과 거기서 만든 조회표.
// 첫 화면에는 필요 없어 따로 나뉜 조각으로 둔다: 페이즈1을 켜거나 모르는 카드 주소(#card/카드id)가 들어올 때 App 이 불러온다.
import { LAND_CARDS } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents } from './continents'
import { locations } from './locations'
import { PHASE1_CARDS, type PhaseCard } from './phase1'

// 페이즈1 카드도 가리키는 곳이 있어야 하고, 카드 패널 주소(#card/카드id)가 대지 카드와 겹치면 안 된다
for (const c of PHASE1_CARDS) {
  const d = c.depicts
  const ok = d.type === 'location' ? locations.some((l) => l.id === d.id) : continents.some((x) => x.id === d.id)
  if (!ok) throw new Error(`phase1.ts: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
  if (LAND_CARDS.some((l) => l.id === c.id)) throw new Error(`phase1.ts: '${c.id}' 가 대지 카드 id 와 겹친다`)
  const child = c.childMap ? CHILD_MAPS.find((m) => m.id === c.childMap) : undefined
  if (c.childMap && !child) throw new Error(`phase1.ts: ${c.name} 의 지역 상세 '${c.childMap}' 가 없다`)
  if (child) {
    const b = child.bounds
    if (c.at[0] < b.x0 || c.at[0] > b.x1 || c.at[1] < b.y0 || c.at[1] > b.y1) throw new Error(`phase1.ts: ${c.name} 의 자리가 지역 상세 '${child.id}' 범위 밖이다`)
  }
}

export interface PhaseData {
  /** 페이즈1 카드 — 페이즈를 켜면 그 대상이 지도에 그려진다 (지역 상세에 사는 작은 대상은 그 지역 상세가 나오는 배율부터) */
  cards: PhaseCard[]
  ids: ReadonlySet<string>
}

export const PHASE: PhaseData = {
  cards: PHASE1_CARDS,
  ids: new Set(PHASE1_CARDS.map((c) => c.id)),
}
