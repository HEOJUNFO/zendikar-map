// 페이즈1 데이터 — 원본(phase1.ts, 카드 설명·근거 글이 길다)과 거기서 만든 조회표.
// 첫 화면에는 필요 없어 따로 나뉜 조각으로 둔다: 페이즈1을 켜거나 모르는 카드 주소(#card/카드id)가 들어올 때 App 이 불러온다.
import { LAND_CARDS } from './cards'
import { continents } from './continents'
import { locations } from './locations'
import { PHASE1_CARDS, PHASE1_CHILD_MAPS, type ChildMap, type PhaseCard } from './phase1'

// 페이즈1 카드도 가리키는 곳이 있어야 하고, 카드 패널 주소(#card/카드id)가 대지 카드와 겹치면 안 된다
for (const c of PHASE1_CARDS) {
  const d = c.depicts
  const ok = d.type === 'location' ? locations.some((l) => l.id === d.id) : continents.some((x) => x.id === d.id)
  if (!ok) throw new Error(`phase1.ts: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
  if (LAND_CARDS.some((l) => l.id === c.id)) throw new Error(`phase1.ts: '${c.id}' 가 대지 카드 id 와 겹친다`)
  const child = c.childMap ? PHASE1_CHILD_MAPS.find((m) => m.id === c.childMap) : undefined
  if (c.childMap && !child) throw new Error(`phase1.ts: ${c.name} 의 자식 지도 '${c.childMap}' 가 없다`)
  if (child) {
    const b = child.bounds
    if (c.at[0] < b.x0 || c.at[0] > b.x1 || c.at[1] < b.y0 || c.at[1] > b.y1) throw new Error(`phase1.ts: ${c.name} 의 자리가 자식 지도 '${child.id}' 범위 밖이다`)
  }
}
for (const m of PHASE1_CHILD_MAPS) {
  if (!locations.some((l) => l.id === m.place)) throw new Error(`phase1.ts: 자식 지도 '${m.id}' 의 장소 '${m.place}' 가 없다`)
}

/** 자식 지도 — 이름은 그 장소의 이름 */
export interface ChildMapInfo extends ChildMap {
  name: string
  nameKo?: string
}

export interface PhaseData {
  cards: PhaseCard[]
  /** 페이즈1 카드 id — 페이즈를 켜면 그 대상이 지도에 그려진다 */
  ids: ReadonlySet<string>
  childMaps: ReadonlyMap<string, ChildMapInfo>
  /** 지역 지도가 있는 장소 — 페이즈1 세계 지도에서 이름 뒤에 접힌 지도 아이콘이 붙는다 */
  childMapPlaces: ReadonlySet<string>
  /** 세계 지도의 그림 — 작은 대상(자식 지도에 그리는 것)은 뺀다 */
  worldFigures: PhaseCard[]
  /** 카드의 대상이 사는 자식 지도 */
  childOf: (cardId: string) => string | undefined
  /** 자식 지도에 그리는 작은 대상 */
  subjectsOf: (childMapId: string) => PhaseCard[]
}

const subjects = new Map<string, PhaseCard[]>()
for (const c of PHASE1_CARDS) if (c.childMap) subjects.set(c.childMap, [...(subjects.get(c.childMap) ?? []), c])
const NONE: PhaseCard[] = []

export const PHASE: PhaseData = {
  cards: PHASE1_CARDS,
  ids: new Set(PHASE1_CARDS.map((c) => c.id)),
  childMaps: new Map(
    PHASE1_CHILD_MAPS.map((m) => {
      const place = locations.find((l) => l.id === m.place)
      return [m.id, { ...m, name: place?.name ?? m.id, nameKo: place?.nameKo }]
    }),
  ),
  childMapPlaces: new Set(PHASE1_CHILD_MAPS.map((m) => m.place)),
  worldFigures: PHASE1_CARDS.filter((c) => !c.childMap),
  childOf: (id) => PHASE1_CARDS.find((c) => c.id === id)?.childMap,
  subjectsOf: (id) => subjects.get(id) ?? NONE,
}
