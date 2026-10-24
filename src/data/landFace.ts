// 양면 카드(MDFC — 주문·생물 // 대지)의 대지 면 (사용자 결정 2026-10-24) — 앞면은 페이즈 그림(phaseN.ts 의 PhaseCard), 대지 면(PhaseCard.land)은 그 카드가 이어진
// 장소의 패널에 실린다. 여기는 대지 면의 목록 모양(LandFaceEntry)과 그 셈·검사 — 앱(src/data/landFaces.ts·index.ts)과 Node 도구(scripts/qa/timeline-check.mjs,
// scripts/qa/mdfc-test.mjs), 조각 플러그인(vite/phaseData.ts 의 `?lands`)이 함께 쓴다. Node 가 그대로 읽게 런타임 import 는 확장자를 붙인다.
//
// 규칙 (CLAUDE.md '한 곳은 한 번만'·'unplaced' 와 맞춘 것):
// - 대지 면 이름이 이어진 장소의 이름이나 별칭과 같으면 그 면은 곧 그 장소다 — 장소 패널에 면 그림과 함께 실린다. 다르면 '카드' 줄의 링크 (basis·estimate 로 이은 까닭)
// - 대지 면은 지도에 표시를 따로 두지 않고 장소의 표시를 같이 쓴다. 앞면 그림은 그 표시 바로 곁에 그린다(NEAR)
// - 자리가 없는 장소(에메리아 — unplaced)는 이어진 대지 카드의 표시(cards.ts — 'Emeria, the Sky Ruin')가 그 장소의 표시이고, 양면 카드의 앞면 그림은 그 표시가
//   되지 않는다 — 그림은 그 사가·시점에만 나오는 앞면의 대상(에메리아의 부름이 부른 천사)이지 장소가 아니고, 장소는 어느 보기에서나 늘 보여야 한다.
//   그래서 자리가 없는데 표시도 없는 장소를 가리키는 대지 면은 막는다 — 그 장소를 estimate 로 찍거나 표시가 되는 대지 카드를 먼저 둔다
// - sagaBound(2020년의 일과 이어진 면)는 그 카드의 사가·페이즈(시점별 보기는 landAt)에서만, 아니면 늘 장소 패널에 실린다
import { slotOf } from './sagas.ts'
import { isPlaced, type LandFace, type Location, type Point } from './types.ts'

/** 앞면 그림이 장소 표시에서 이만큼(지도 단위, 장소 범위 extent 가 있으면 그 바깥으로) 안에 있어야 한다 — '그 장소에, 또는 바로 곁에' */
export const FACE_NEAR = 40

/**
 * 대지 면 하나 — 장소 패널이 페이즈 데이터를 받지 않고도(페이즈를 끈 지도에서도) 싣도록 첫 조각에 드는 작은 목록의 모양.
 * 근거 글(basis·estimate)은 카드 원본(카드 패널)에만 있고 여기는 있는지만 — 패널은 면의 이름·그림·플레이버만 싣는다
 */
export interface LandFaceEntry extends Pick<LandFace, 'name' | 'nameKo' | 'typeLine' | 'flavor' | 'image' | 'sagaBound'> {
  /** 카드 id — 앞면 그림의 카드와 같다 (#card/카드id 가 그 카드 패널을 연다) */
  id: string
  /** 그 카드가 오르는 페이즈 (이어 센 번호 — phase<n>.ts 의 n) */
  level: number
  set: string
  number: string
  rarity: 'mythic' | 'rare' | 'uncommon' | 'common'
  artist: string
  /** Scryfall 카드 페이지 (두 면이 함께) */
  url: string
  /** 앞면 이름 (공식 영문, 공식 한국어판) */
  front: string
  frontKo?: string
  /** 카드가 이어진 곳 (PhaseCard.depicts — 대지 면은 늘 장소) */
  depicts: { type: string; id: string }
  /** 앞면 그림의 자리 — 검사(장소 표시 곁)에만 쓴다 */
  at: Point
  /** 대지 면을 이은 공식 근거·이 지도의 판단이 있는가 (글은 카드 원본에) */
  basis?: true
  estimate?: true
  /** 카드가 place: true 다 — 대지 면과 함께 달 수 없어 검사가 막는다 */
  placeFlag?: true
}

/** 페이즈 카드 원본 하나(phase<level>.ts)에서 대지 면의 목록 항목 — 대지 면이 없으면 null. 모양만 맞으면 된다 (조각 플러그인이 원본을 그대로 넘긴다) */
export function faceEntry(c: Record<string, unknown>, level: number): LandFaceEntry | null {
  const land = c.land as LandFace | undefined
  if (!land) return null
  return {
    id: c.id as string,
    level,
    set: c.set as string,
    number: c.number as string,
    rarity: c.rarity as LandFaceEntry['rarity'],
    artist: c.artist as string,
    url: c.url as string,
    front: c.name as string,
    frontKo: c.nameKo as string | undefined,
    depicts: c.depicts as LandFaceEntry['depicts'],
    at: c.at as Point,
    name: land.name,
    nameKo: land.nameKo,
    typeLine: land.typeLine,
    flavor: land.flavor,
    image: land.image,
    sagaBound: land.sagaBound ? true : undefined,
    basis: land.basis ? true : undefined,
    estimate: land.estimate ? true : undefined,
    placeFlag: c.place ? true : undefined,
  }
}

/** 페이즈 카드 원본(페이즈 차례 — [i] 가 이어 센 번호 i + 1)에서 대지 면의 목록 — Node 도구가 쓴다 (앱은 src/data/landFaces.ts 가 조각으로) */
export const faceEntriesOf = (byPhase: readonly (readonly Record<string, unknown>[])[]): LandFaceEntry[] =>
  byPhase.flatMap((cards, i) => cards.flatMap((c) => faceEntry(c, i + 1) ?? []))

/**
 * 대지 면이 장소 패널에 실리는 사가 — 대지 카드(cards.ts 의 saga·sagaPhase)와 같은 모양이라 landAt·landPhase 를 그대로 쓴다.
 * sagaBound 면 그 카드의 사가와 그 안의 페이즈, 아니면 비었다(늘)
 */
export function faceBinding(f: Pick<LandFaceEntry, 'level' | 'sagaBound'>): { saga?: number; sagaPhase?: number } {
  if (!f.sagaBound) return {}
  const slot = slotOf(f.level)
  if (!slot) throw new Error(`landFace: 페이즈 ${f.level} 이 sagas.ts 에 없다 (그 사가가 phases: 0 이면 그 대지 면은 목록에 넣지 않는다)`)
  return { saga: slot.saga, sagaPhase: slot.local }
}

/** 대지 면이 곧 그 장소인가 — 이름이 장소의 이름이나 별칭과 같다 */
export const faceIsPlace = (f: Pick<LandFaceEntry, 'name'>, place: Location | undefined) => Boolean(place && [place.name, ...(place.aliases ?? [])].includes(f.name))

/** 검사에 쓰는 대지 카드 (cards.ts 의 LandCard 와 같은 모양) */
interface LandLike {
  name: string
  depicts: { type: string; id: string }
  saga?: number
  at?: Point
}

/** 장소를 지도에서 가리키는 지점 — src/data/index.ts 의 placeMark 와 같은 셈 (자리, 없으면 그 장소와 하나인 사가에 매이지 않은 대지 카드의 표시) */
export function placeMarkOf(l: Location, landCards: readonly LandLike[]): Point | null {
  if (isPlaced(l)) return l.position
  const card = landCards.find((c) => c.saga === undefined && c.at && c.depicts.type === 'location' && c.depicts.id === l.id && [l.name, ...(l.aliases ?? [])].includes(c.name))
  return card?.at ?? null
}

/**
 * 대지 면의 어긋난 것 (없으면 빈 목록)
 * - F1 이어진 곳은 있는 장소여야 한다 (대지 면은 늘 장소를 가리킨다 — 대륙에 이은 양면 카드는 두지 않는다)
 * - F2 place: true(카드가 곧 장소 — 그림 없음)와 함께 달지 않는다 — 앞면은 그림이다
 * - F3 대지 면의 유형은 Land
 * - F4 대지 면 이름이 그 장소가 아니면 이은 까닭(basis 또는 estimate)이 있어야 한다
 * - F5 자리가 없는 장소는 표시(이어진 대지 카드의 표시)가 있어야 한다 — 앞면 그림은 장소의 표시가 되지 않는다
 * - F6 앞면 그림은 그 장소의 표시에, 또는 바로 곁에(FACE_NEAR, 범위 extent 바깥으로) 둔다
 * - F7 대지 면 이름은 하나씩 — 다른 양면 카드의 대지 면이나 대지 카드(cards.ts)와 같으면 한 대지가 두 번 나온다. 카드 id 도 하나씩
 */
export function landFaceProblems(entries: readonly LandFaceEntry[], ctx: { locations: readonly Location[]; landCards: readonly LandLike[] }): string[] {
  const problems: string[] = []
  const names = new Map<string, string>()
  const ids = new Set<string>()
  for (const f of entries) {
    const who = `phase${f.level}.ts: ${f.front} // ${f.name}`
    const place = f.depicts.type === 'location' ? ctx.locations.find((l) => l.id === f.depicts.id) : undefined
    if (!place) problems.push(`F1: ${who} — 대지 면이 이어진 곳은 장소여야 한다 (depicts 가 ${f.depicts.type} '${f.depicts.id}')`)
    if (f.placeFlag) problems.push(`F2: ${who} — 양면 카드의 앞면은 그림이라 place: true 를 달지 않는다`)
    if (!/\bLand\b/.test(f.typeLine)) problems.push(`F3: ${who} — 대지 면의 유형이 '${f.typeLine}' 다 (Land)`)
    if (place && !faceIsPlace(f, place) && !f.basis && !f.estimate)
      problems.push(`F4: ${who} — 대지 면 이름이 장소 '${place.id}' 의 이름·별칭이 아니니 이은 까닭을 land.basis(또는 land.estimate)에 적는다`)
    if (place) {
      const mark = placeMarkOf(place, ctx.landCards)
      if (!mark)
        problems.push(
          `F5: ${who} — 자리가 없는 장소 '${place.id}' 에 표시가 없다. 앞면 그림은 그 사가·시점에만 나와 장소의 표시가 되지 않으니, 장소를 estimate 로 찍거나 표시가 되는 대지 카드를 먼저 둔다`,
        )
      else {
        const reach = (isPlaced(place) && place.extent ? Math.max(...place.extent) : 0) + FACE_NEAR
        const d = Math.hypot(f.at[0] - mark[0], f.at[1] - mark[1])
        if (d > reach)
          problems.push(`F6: ${who} — 앞면 그림(${f.at.join(', ')})이 장소 '${place.id}' 의 표시(${mark.join(', ')})에서 ${d.toFixed(1)} 떨어졌다 (${reach} 안 — 그 장소에, 또는 바로 곁에)`)
      }
    }
    const twin = names.get(f.name) ?? (ctx.landCards.some((c) => c.name === f.name) ? 'cards.ts' : undefined)
    if (twin) problems.push(`F7: ${who} — 대지 면 이름 '${f.name}' 이 ${twin} 에도 있다 (한 대지는 한 번만)`)
    names.set(f.name, `phase${f.level}.ts 의 ${f.front}`)
    if (ids.has(f.id)) problems.push(`F7: ${who} — 카드 id '${f.id}' 가 둘이다`)
    ids.add(f.id)
  }
  return problems
}
