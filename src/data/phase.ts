// 페이즈 데이터 — 원본(phase1.ts~phase5.ts, 카드 설명·근거 글이 길다)에서 뽑은 조각과 거기서 만든 조회표.
// 첫 화면에는 필요 없어 따로 나뉜 조각으로 둔다: 페이즈를 켜거나 모르는 카드 주소(#card/카드id)가 들어올 때 App 이 불러온다.
// 지도는 원본에서 그림·카메라에 쓰는 필드만 뽑은 작은 지도 조각(`?map`)으로 그린다 — 페이즈마다 따로 나뉘어, 페이즈1만 켜면 페이즈2·3 의 조각은 받지 않는다.
// 원본(패널의 긴 글)은 통째로 받지 않고 패널에 실을 카드 한 장씩(loadCardText) 받는다. 조각은 vite/phaseData.ts 의 플러그인이 원본에서 뽑는다
import { LAND_CARDS } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents } from './continents'
import { locations } from './locations'
import type { PhaseCard } from './phase1'
import { levelOf, PHASE_SLOTS, SAGAS, slotOf } from './sagas'

/** 그림의 상자 — 그림 자체의 좌표 [x, y, 너비, 높이] 와 지도 위 자리에 놓이는 기준점 [x, y] (그림 원본의 viewBox·anchor) */
export type FigureFrame = readonly [number, number, number, number, number, number]

/**
 * 지도 조각의 카드 — 그림의 자리·크기·이름과 가리키는 곳. estimate 는 자리가 추정인지만 (까닭 글은 원본에).
 * 그림이 있는 카드는 그 상자(frame)와 그림 묶음(group)도 — 그림이 오기 전에 이름 자리를 정하고, 필요한 묶음만 고른다 (vite/phaseData.ts)
 */
export type PhaseMapCard = Pick<PhaseCard, 'id' | 'name' | 'nameKo' | 'set' | 'depicts' | 'at' | 'size' | 'flip' | 'childMap' | 'label' | 'place' | 'until'> & {
  estimate?: true
  frame?: FigureFrame
  group?: string
}

/** 페이즈마다 새로 오르는 카드의 지도 조각 — 페이즈 n 은 1..n 의 카드를 모두 그린다 (페이즈2 = 페이즈1 + WWK, 페이즈3 = 페이즈2 + ROE) */
const MAPS: readonly (() => Promise<PhaseMapCard[]>)[] = [
  () => import('./phase1?map').then((m) => m.CARDS as PhaseMapCard[]),
  () => import('./phase2?map').then((m) => m.CARDS as PhaseMapCard[]),
  () => import('./phase3?map').then((m) => m.CARDS as PhaseMapCard[]),
  // 사가2(젠디카르 전투)의 페이즈1 — BFZ
  () => import('./phase4?map').then((m) => m.CARDS as PhaseMapCard[]),
  // 사가2 의 페이즈2 — OGW
  () => import('./phase5?map').then((m) => m.CARDS as PhaseMapCard[]),
]
/** 페이즈마다 카드 id → 그 카드 원본 하나를 불러오는 함수 — 패널에 싣는 설명·근거 글 (카드마다 따로 나뉜 조각) */
const TEXTS: readonly (() => Promise<Readonly<Record<string, () => Promise<{ CARD: unknown }>>>>)[] = [
  () => import('./phase1?cards').then((m) => m.TEXT),
  () => import('./phase2?cards').then((m) => m.TEXT),
  () => import('./phase3?cards').then((m) => m.TEXT),
  () => import('./phase4?cards').then((m) => m.TEXT),
  () => import('./phase5?cards').then((m) => m.TEXT),
]
/** 페이즈 수 */
export const PHASE_COUNT = MAPS.length
// 사가의 페이즈 수(sagas.ts)와 여기 조각 수가 같아야 이어 센 번호가 맞는다
if (PHASE_COUNT !== PHASE_SLOTS.length || TEXTS.length !== PHASE_SLOTS.length)
  throw new Error(`phase.ts 의 조각 수(${PHASE_COUNT}·${TEXTS.length})가 sagas.ts 의 페이즈 수(${PHASE_SLOTS.length})와 다르다`)

// 페이즈 카드도 가리키는 곳이 있어야 하고, 카드 패널 주소(#card/카드id)가 대지 카드나 다른 페이즈 카드와 겹치면 안 된다. level 은 그 파일의 페이즈 (이어 센 번호)
function check(cards: PhaseMapCard[], file: string, level: number, seen: Set<string>) {
  const slot = slotOf(level)
  for (const c of cards) {
    // until — 그 사가 안의 페이즈 번호로, 카드가 오르는 페이즈부터 그 사가의 마지막 페이즈 앞까지 (마지막 페이즈까지면 달 까닭이 없다)
    if (c.until !== undefined && (!slot || !Number.isInteger(c.until) || c.until < slot.local || c.until >= SAGAS[slot.saga - 1].phases))
      throw new Error(`${file}: ${c.name} 의 until ${c.until} — 이 카드가 오르는 페이즈(${slot?.local})부터 그 사가의 마지막 페이즈 앞까지의 페이즈 번호를 단다`)
    const d = c.depicts
    const place = d.type === 'location' ? locations.find((l) => l.id === d.id) : undefined
    const ok = d.type === 'location' ? place : continents.some((x) => x.id === d.id)
    if (!ok) throw new Error(`${file}: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
    // 카드 이름이 이어진 장소의 이름이나 별칭과 같으면 그 카드는 곧 그 장소다 — 그림 없이 장소 패널에 싣는다 (index.ts 의 placeCards 와 같은 규칙)
    const same = Boolean(place && [place.name, ...(place.aliases ?? [])].includes(c.name))
    if (same !== Boolean(c.place)) throw new Error(`${file}: ${c.name} — ${same ? `장소 '${d.id}' 와 하나인 카드라 place: true 를 단다` : 'place: true 는 장소와 이름이 같은 카드에만 단다'}`)
    if (c.place && (c.size !== 0 || c.childMap)) throw new Error(`${file}: ${c.name} — 장소와 하나인 카드는 그림이 없으니 size 0, childMap 없이 둔다`)
    if (!c.place && (c.frame?.length !== 6 || !c.group)) throw new Error(`${file}: ${c.name} 의 그림 상자·묶음이 없다 (node scripts/figures/to_ts.mjs > src/map/figures.ts)`)
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
  /** 페이즈 카드의 지도 조각 — 페이즈를 켜면 그 대상이 지도에 그려진다 (지역 상세에 사는 작은 대상은 그 지역 상세가 나오는 배율부터) */
  cards: PhaseMapCard[]
  /** 카드가 처음 오르는 페이즈 (1: ZEN, 2: WWK, 3: ROE) — 페이즈 n 은 이 값이 n 이하인 카드를 그린다. 페이즈 카드인지도 이것으로 가른다 */
  phaseOf: ReadonlyMap<string, number>
  /** 그 사가 안에서 끝나는 카드(until) id → 그 카드를 그리는 마지막 페이즈 (이어 센 번호) — 페이즈 n 은 이 값이 n 보다 작은 카드를 그리지 않는다 */
  lastOf: ReadonlyMap<string, number>
  /** 장소와 하나인 카드(place) id → 그 장소 id — 그림 없이 그 장소 패널에 실린다 */
  placeOf: ReadonlyMap<string, string>
}

/** 받는 중이거나 받은 조각 (페이즈 차례) — 못 온 것은 지워 다음에 다시 받는다 */
function cached<T>(files: readonly (() => Promise<T>)[]): (i: number) => Promise<T> {
  const got = new Map<number, Promise<T>>()
  return (i) => {
    let p = got.get(i)
    if (!p) {
      p = files[i]()
      got.set(i, p)
      p.catch(() => got.delete(i))
    }
    return p
  }
}
const loadMap = cached(MAPS)
const loadTextIndex = cached(TEXTS)
/** level 을 1..페이즈 수로 묶어 페이즈 1..level 의 차례 */
const upTo = (level: number) => Array.from({ length: Math.min(Math.max(Math.trunc(level), 1), PHASE_COUNT) }, (_, i) => i)

/** 페이즈 1..level 의 지도 조각을 불러와 조회표를 만든다 */
export async function loadPhaseData(level: number): Promise<PhaseData> {
  const byPhase = await Promise.all(upTo(level).map(loadMap))
  const seen = new Set<string>()
  byPhase.forEach((cards, i) => check(cards, `phase${i + 1}.ts`, i + 1, seen))
  return {
    level: byPhase.length,
    cards: byPhase.flat(),
    phaseOf: new Map(byPhase.flatMap((cards, i) => cards.map((c) => [c.id, i + 1] as const))),
    lastOf: new Map(
      byPhase.flatMap((cards, i) => cards.flatMap((c) => (c.until === undefined ? [] : [[c.id, levelOf(slotOf(i + 1)!.saga, c.until)!] as const]))),
    ),
    placeOf: new Map(byPhase.flat().flatMap((c) => (c.place ? [[c.id, c.depicts.id] as const] : []))),
  }
}

/** 받는 중이거나 받은 카드 원본 (카드 id) — 못 온 것은 지워 다음에 다시 청한다 (목록이 못 왔으면 다시 받지만, 카드 조각 자체를 못 받았으면 브라우저가 그 실패를 기억해 새로 고치기 전에는 대개 다시 실패한다) */
const cardTexts = new Map<string, Promise<PhaseCard>>()

/** 카드 한 장의 원본을 불러온다 — 패널에 쓴다 (자리·이름은 지도 조각과 같은 원본에서 나온다). phase 는 그 카드가 오르는 페이즈 (PhaseData.phaseOf) */
export function loadCardText(id: string, phase: number): Promise<PhaseCard> {
  let p = cardTexts.get(id)
  if (!p) {
    p = loadTextIndex(phase - 1).then((text) => {
      const load = text[id]
      if (!load) throw new Error(`phase${phase}.ts 에 카드 '${id}' 가 없다`)
      return load().then((m) => m.CARD as PhaseCard)
    })
    cardTexts.set(id, p)
    p.catch(() => cardTexts.delete(id))
  }
  return p
}

/** 페이즈 1..level 의 카드 원본 목록(카드마다 불러오는 함수, 작다)을 미리 받아 둔다 — 카드를 열면 그 카드의 글만 한 번 받으면 된다 */
export function preloadCardTexts(level: number) {
  for (const i of upTo(level)) loadTextIndex(i).catch(() => {})
}
