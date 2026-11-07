// 픽셀 지도가 첫 화면에 쓰는 표시 데이터 — 장소·대지 카드·대륙의 이름과 자리만 (설명·근거 글은 패널을 열 때 원본에서 받는다).
// vite/pixelMarks.ts 가 빌드·개발 서버에서 원본(src/data/locations.ts·cards.ts·continents.ts)으로 이것을 만들어 `virtual:pixel-marks` 로 싣고,
// Node 시험(scripts/qa/pixel-labels.mjs)도 같은 함수를 부른다. src/data/index.ts 는 부르지 않는다 (검사가 돌고 바탕 지형까지 끌려온다) —
// 장소와 하나인 카드를 가리는 셈만 그 파일과 같게 옮겼다. 타입만 지우면 되는 문법만 쓴다 (Node 가 바로 읽는다)
import type { LandCard } from '../../data/cards.ts'
import type { Continent, ContinentId, Location, LocationKind, Point } from '../../data/types.ts'

export type MarkKind = Exclude<LocationKind, 'region' | 'water'>

/** 지도에 표시(기호)가 있는 장소 */
export interface PointMark {
  id: string
  name: string
  nameKo?: string
  kind: MarkKind
  at: Point
  prominence: number
}

/** 이름만 있는 곳 — 지역(숲·산맥·늪 …)과 물(강·호수·바다) */
export interface AreaMark {
  id: string
  name: string
  nameKo?: string
  water: boolean
  at: Point
  extent?: readonly [number, number]
  prominence: number
}

/** 대지 카드 표시 — 자리가 없는 장소와 하나인 카드는 그 장소의 표시다 (이름도 그 장소의 것, place 가 그 장소) */
export interface CardMark {
  id: string
  name: string
  nameKo?: string
  kind: MarkKind
  at: Point
  /** 공식 근거로 이은 카드가 먼저 자리를 잡는다 — 이 지도가 자리를 고른 카드(estimate)는 나중 */
  est: boolean
  /** 카드 차례 (세트·번호) — 겹치는 카드 기호 가운데 먼저 남기는 차례 */
  order: string
  place?: string
}

export interface ContinentMark {
  id: ContinentId
  name: string
  nameKo: string
  at: Point
}

export interface PixelMarks {
  points: PointMark[]
  areas: AreaMark[]
  cards: CardMark[]
  continents: ContinentMark[]
  /** 지도에 있는 장소와 하나인 카드 id → 그 장소 id — 표시가 따로 없다 (#card/<id> 는 그 장소로 간다) */
  cardPlaces: Record<string, string>
}

const ko = (nameKo: string | undefined) => (nameKo ? { nameKo } : {})

export function slimMarks(locations: readonly Location[], cards: readonly LandCard[], continents: readonly Continent[]): PixelMarks {
  const points: PointMark[] = []
  const areas: AreaMark[] = []
  for (const l of locations) {
    if (l.placement === 'unplaced') continue
    const base = { id: l.id, name: l.name, ...ko(l.nameKo), at: l.position, prominence: l.prominence }
    if (l.kind === 'region' || l.kind === 'water') areas.push({ ...base, water: l.kind === 'water', ...(l.extent ? { extent: l.extent } : {}) })
    else points.push({ ...base, kind: l.kind })
  }
  const byId = new Map(locations.map((l) => [l.id, l]))
  const out: CardMark[] = []
  const cardPlaces: Record<string, string> = {}
  for (const c of cards) {
    // 페이즈를 끈 지도의 카드만 — 사가에 매인 카드는 그 사가를 켰을 때 (S6)
    if (c.saga !== undefined) continue
    const d = c.depicts
    const place = d.type === 'location' ? byId.get(d.id) : undefined
    // 장소와 하나인 카드 (카드 이름이 장소의 이름·별칭) — 지도에 있는 장소면 at 가 없어 장소 표시를 같이 쓰고, 자리가 없는 장소면 이 표시가 그 장소의 표시다
    const same = place && [place.name, ...(place.aliases ?? [])].includes(c.name) ? place : undefined
    if (!c.at) {
      if (same) cardPlaces[c.id] = same.id
      continue
    }
    const named = same ?? c
    out.push({
      id: c.id,
      name: named.name,
      ...ko(named.nameKo),
      kind: c.kind,
      at: c.at,
      est: Boolean(c.estimate),
      order: `${c.number.padStart(4, '0')}|${c.set}`,
      ...(same ? { place: same.id } : {}),
    })
  }
  return {
    points,
    areas,
    cards: out,
    cardPlaces,
    continents: continents.map((c) => ({ id: c.id, name: c.name, nameKo: c.nameKo, at: c.label.at })),
  }
}
