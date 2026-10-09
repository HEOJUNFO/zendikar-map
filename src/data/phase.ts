// 페이즈 데이터 — 원본(phase1.ts·phase2.ts, 카드 설명·근거 글이 길다)과 거기서 만든 조회표.
// 첫 화면에는 필요 없어 따로 나뉜 조각으로 둔다: 페이즈를 켜거나 모르는 카드 주소(#card/카드id)가 들어올 때 App 이 불러온다.
// 페이즈마다의 원본도 따로 나뉜 조각이다 — 페이즈1만 켜면 페이즈2(WWK) 카드의 글은 받지 않는다
import { LAND_CARDS } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents } from './continents'
import { locations } from './locations'
import type { PhaseCard } from './phase1'

/** 페이즈마다 새로 오르는 카드 원본 — 페이즈 n 은 1..n 의 카드를 모두 그린다 (페이즈2 = 페이즈1 + WWK) */
const FILES: readonly (() => Promise<PhaseCard[]>)[] = [
  () => import('./phase1').then((m) => m.PHASE1_CARDS),
  () => import('./phase2').then((m) => m.PHASE2_CARDS),
]

// 페이즈 카드도 가리키는 곳이 있어야 하고, 카드 패널 주소(#card/카드id)가 대지 카드나 다른 페이즈 카드와 겹치면 안 된다
function check(cards: PhaseCard[], file: string, seen: Set<string>) {
  for (const c of cards) {
    const d = c.depicts
    const place = d.type === 'location' ? locations.find((l) => l.id === d.id) : undefined
    const ok = d.type === 'location' ? place : continents.some((x) => x.id === d.id)
    if (!ok) throw new Error(`${file}: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
    // 카드 이름이 이어진 장소의 이름이나 별칭과 같으면 그 카드는 곧 그 장소다 — 그림 없이 장소 패널에 싣는다 (index.ts 의 placeCards 와 같은 규칙)
    const same = Boolean(place && [place.name, ...(place.aliases ?? [])].includes(c.name))
    if (same !== Boolean(c.place)) throw new Error(`${file}: ${c.name} — ${same ? `장소 '${d.id}' 와 하나인 카드라 place: true 를 단다` : 'place: true 는 장소와 이름이 같은 카드에만 단다'}`)
    if (c.place && (c.size !== 0 || c.childMap)) throw new Error(`${file}: ${c.name} — 장소와 하나인 카드는 그림이 없으니 size 0, childMap 없이 둔다`)
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
}

export interface PhaseData {
  /** 불러온 페이즈 — cards 는 페이즈 1..level 의 카드다 */
  level: number
  /** 페이즈 카드 — 페이즈를 켜면 그 대상이 지도에 그려진다 (지역 상세에 사는 작은 대상은 그 지역 상세가 나오는 배율부터) */
  cards: PhaseCard[]
  /** 카드가 처음 오르는 페이즈 (1: ZEN, 2: WWK) — 페이즈 n 은 이 값이 n 이하인 카드를 그린다. 페이즈 카드인지도 이것으로 가른다 */
  phaseOf: ReadonlyMap<string, number>
  /** 장소와 하나인 카드(place) id → 그 장소 id — 그림 없이 그 장소 패널에 실린다 */
  placeOf: ReadonlyMap<string, string>
}

/** 받는 중이거나 받은 원본 (페이즈 차례) — 못 온 것은 지워 다음에 다시 받는다 */
const files = new Map<number, Promise<PhaseCard[]>>()
function loadFile(i: number): Promise<PhaseCard[]> {
  let p = files.get(i)
  if (!p) {
    p = FILES[i]()
    files.set(i, p)
    p.catch(() => files.delete(i))
  }
  return p
}

/** 페이즈 1..level 의 카드를 불러와 조회표를 만든다 (level 은 1..페이즈 수로 묶는다) */
export async function loadPhaseData(level: number): Promise<PhaseData> {
  const n = Math.min(Math.max(Math.trunc(level), 1), FILES.length)
  const byPhase = await Promise.all(Array.from({ length: n }, (_, i) => loadFile(i)))
  const seen = new Set<string>()
  byPhase.forEach((cards, i) => check(cards, `phase${i + 1}.ts`, seen))
  return {
    level: n,
    cards: byPhase.flat(),
    phaseOf: new Map(byPhase.flatMap((cards, i) => cards.map((c) => [c.id, i + 1] as const))),
    placeOf: new Map(byPhase.flat().flatMap((c) => (c.place ? [[c.id, c.depicts.id] as const] : []))),
  }
}
