// 화면 글 — 지명 언어(?lang=ko, 오른쪽 아래 단추)를 따라 바뀌는 UI 글. 라이브러리 없이 언어마다 같은 꼴의 객체 하나라 빌드가 그대로 넣고,
// 한 언어에 빠진 열쇠·다른 꼴의 함수는 타입 검사에서 멈춘다 (en: Messages). 데이터의 글(설명·근거·추정)은 한국어 원본뿐이라 여기에 없다.
import type { LocationKind, Placement, Terrain } from '../data/types'
import type { LandscapeFeature } from '../data'
import type { PeriodFeatureKind } from '../map/periodTypes'
import type { LabelLang } from '../map/names'

type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic'
type LandscapeKind = LandscapeFeature['kind'] | PeriodFeatureKind

/** 양면 카드의 대지 면이 장소 패널에 언제 실리는지 — bound 가 null 이면 늘 */
export interface FaceShownIn {
  /** 그 카드가 오르는 사가·페이즈 (모르면 null — '그 사가를 켰을 때') */
  slot: { saga: number; name: string; nameEn: string; local: number } | null
  /** 시점별 보기에서 실리는 시점의 단추 글 (2015 …) */
  years: string[]
}

/**
 * 이름 뒤의 주제 조사 — 읽히는 마지막 말(한국어판 이름이 있으면 괄호 안 그 이름)의 끝 글자에 받침이 있으면 '은', 없으면 '는'.
 * 한국어 글자가 없는 이름(영어 이름만)은 읽는 법을 정할 수 없어 '은(는)'
 */
const topicParticle = (text: string) => {
  const last = [...text].reverse().find((ch) => ch >= '가' && ch <= '힣')
  if (!last) return '은(는)'
  return (last.charCodeAt(0) - 0xac00) % 28 ? '은' : '는'
}

/** 숫자 뒤의 목적격 조사 — 끝 숫자를 읽는 소리(영·일·이·삼·사·오·육·칠·팔·구)의 받침으로 '을'·'를' */
const objectParticleOfDigit = (n: number) => ([0, 1, 3, 6, 7, 8].includes(n % 10) ? '을' : '를')

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const ko = {
  close: '닫기',
  // 왼쪽 위 머리말의 접기 단추 (App.tsx)
  foldHeader: '사가·시점 단추 접기',
  unfoldHeader: '사가·시점 단추 펼치기',
  fold: '접기',
  unfold: '펼치기',
  estimate: '추정',
  sources: '출처',
  type: '종류',
  continent: '대륙',
  linkedPlace: '이은 곳',
  card: '카드',
  cards: '카드',
  terrain: '지형',
  peoples: '사는 이들',
  history: '시대별 변화',
  openSea: '대륙 밖 바다',
  closer: '가까이 보기',
  landCard: '대지 카드',
  cardAlt: (name: string) => `${name} 카드 — Scryfall 에서 보기`,
  /** 카드 줄 — 세트·번호·유형·희귀도·그림 */
  cardLine: (set: string, number: string, type: string, rarity: string, artist: string) => `${set} #${number} ${type}, ${rarity} · 그림 ${artist}`,
  cardNumber: (set: string, number: string, artist: string) => `${set} #${number} · 그림 ${artist}`,
  landFaceOfDfc: '양면 카드의 대지 면',
  /** 앞면 링크 앞의 글 */
  frontFaceLead: '앞면',
  /** 앞면 링크 뒤의 글 — slot 은 그 앞면이 그려지는 사가·페이즈 (지금 그려지면 null) */
  frontFaceTail: (front: string, slot: { saga: number; local: number } | null) =>
    `${topicParticle(front)} ${slot ? `사가${slot.saga} 페이즈${slot.local}${objectParticleOfDigit(slot.local)} 켜면 지도에 그림으로 나옵니다.` : '지도에 그림으로 그렸습니다.'}`,
  phaseTag: (local: number) => `페이즈${local}`,
  timeTitle: (t: { name: string; nameEn: string; years: string }) => `이 시점 · ${t.name} (${t.years})`,
  cardNamedForPlace: '카드 이름이 곧 지명이다.',
  cardPlacedAtLink: (figure: boolean) => `지도의 ${figure ? '그림은' : '카드 표시는'} 이 카드가 이어진 곳에 두었습니다.`,
  dfc: '양면 카드',
  frontFace: '앞면',
  backFace: '뒷면',
  landFace: '대지 면',
  bothLands: '두 면이 모두 대지라 지도에는 표시 하나로 두었습니다.',
  drawnAsFigure: '지도에 그림으로 그렸습니다.',
  faceShownIn: (s: FaceShownIn | null) =>
    !s
      ? '패널에 늘 실립니다.'
      : `패널에 ${s.slot ? `사가${s.slot.saga}(${s.slot.name})의 페이즈${s.slot.local}부터 그 사가 안에서` : '그 사가를 켰을 때'}${s.years.length ? `, 시점별 보기는 ${s.years.join('·')}에` : ''} 실립니다.`,
  cardUnavailable: '카드 설명을 불러오지 못했습니다. 페이지를 새로 고치면 다시 받습니다.',
  thisPeriod: '이 무렵',
  notYetHere: '이 무렵에는 아직 없던 곳이라 지도에 표시하지 않았습니다.',
  ruinedHere: '이 무렵에는 무너진 모습이라 유적 기호로 그렸습니다.',
  basisLead: '근거: ',
  featuresHere: '지도에 그린 지형',
  /** 같은 이름으로 묶은 지형의 수 — 이름 뒤에 붙인다. 강·절벽·협곡은 줄기, 그 밖은 곳 (0 이면 그 쪽은 달지 않는다) */
  featureCount: (lines: number, places: number) => {
    const text = [lines ? `${lines}줄기` : '', places ? `${places}곳` : ''].filter(Boolean).join(' ')
    return text ? ` ${text}` : ''
  },
  placesOnContinent: '이 대륙의 장소',
  absentPlaces: '이 무렵에는 없던 곳',
  absentPlacesNote: '켠 페이즈 무렵에는 아직 없던 곳이라 지도에 표시하지 않았습니다.',
  unknownPlaces: '위치가 알려지지 않은 곳',
  unknownPlacesNote: '공식 설정이 대륙까지만 밝힌 곳이라 지도에 찍지 않았습니다.',
  estimatedFeatures: '지도가 자리를 고른 지형',
  estimatedFeaturesNote: '공식 설정에 있는 지형이지만 자리나 범위는 밝히지 않아, 이 지도가 골라 그렸습니다.',
  rarity: { common: '커먼', uncommon: '언커먼', rare: '레어', mythic: '미식 레어' } as Record<Rarity, string>,
  kind: {
    settlement: '정착지',
    ruin: '유적',
    landmark: '지형지물',
    sky: '하늘 폐허',
    underground: '지하 유적',
    region: '지역',
    water: '물길',
  } as Record<LocationKind, string>,
  terrainKind: {
    forest: '숲',
    mountain: '산지',
    swamp: '늪지',
    plain: '평원',
    plateau: '고원',
    canyon: '협곡',
    ice: '빙원',
    volcanic: '화산 지대',
    sea: '바다',
    river: '강',
  } as Record<Terrain, string>,
  placement: {
    'fan-map': '위치는 참고한 팬 지도의 표기를 따랐습니다. 공식 설정과 어긋나지 않는 것만 옮겼습니다.',
    'canon-hint': '공식 설정의 위치 서술을 근거로 자리를 잡은 추정 위치입니다.',
    estimate: '공식 설정은 정확한 자리를 밝히지 않아, 이 지도가 자리를 골랐습니다.',
    unplaced: '공식 설정은 어느 대륙인지까지만 밝힙니다. 자리를 지어내지 않으려고 지도에는 표시하지 않았습니다.',
  } as Record<Placement, string>,
  /** 바탕 지형의 종류 이름 — 지형에 label 이 없을 때 패널에 쓴다 (페이즈 바탕에만 있는 종류까지) */
  landscapeKind: {
    forest: '숲',
    swamp: '늪',
    mangrove: '물에 뿌리박은 숲',
    mountain: '산줄기',
    hills: '언덕',
    plain: '트인 땅',
    mesa: '대지(메사)',
    canyon: '협곡 지대',
    ice: '빙원',
    crystal: '수정 첨탑 들판',
    lava: '용암 들판',
    tundra: '툰드라',
    river: '강',
    cliff: '절벽',
    gorge: '협곡',
    volcano: '화산',
    caldera: '초화산 분화구',
    waterfall: '폭포',
    geyser: '간헐천·온천',
    pit: '수직 동굴',
    spire: '첨탑',
    'floating-rock': '떠 있는 바위',
    urn: '떠 있는 돌 항아리',
    'sea-ice': '유빙',
    whirl: '소용돌이',
    reef: '암초',
    rough: '거친 물결',
    dust: '흰 가루 평원',
    chalk: '백악 흉터',
    drybed: '물이 빠진 바닥',
    deadwood: '죽은 숲',
  } as Record<LandscapeKind, string>,
}

export type Messages = typeof ko

const en: Messages = {
  close: 'Close',
  foldHeader: 'Collapse the saga and timeline buttons',
  unfoldHeader: 'Expand the saga and timeline buttons',
  fold: 'Collapse',
  unfold: 'Expand',
  estimate: 'Estimate',
  sources: 'Sources',
  type: 'Type',
  continent: 'Continent',
  linkedPlace: 'Linked to',
  card: 'Card',
  cards: 'Cards',
  terrain: 'Terrain',
  peoples: 'Peoples',
  history: 'Through the eras',
  openSea: 'Open sea',
  closer: 'Look closer',
  landCard: 'Land card',
  cardAlt: (name) => `${name} card — view on Scryfall`,
  cardLine: (set, number, type, rarity, artist) => `${set} #${number} ${type}, ${rarity} · Illus. ${artist}`,
  cardNumber: (set, number, artist) => `${set} #${number} · Illus. ${artist}`,
  landFaceOfDfc: 'land face of a double-faced card',
  frontFaceLead: 'Front face',
  frontFaceTail: (_front, slot) =>
    slot ? ` appears on the map as a figure when Saga ${slot.saga}, Phase ${slot.local} is on.` : ' is drawn on the map as a figure.',
  phaseTag: (local) => `Phase ${local}`,
  timeTitle: (t) => `At this time · ${t.nameEn} (${t.years})`,
  cardNamedForPlace: 'The card is named for this place.',
  cardPlacedAtLink: (figure) => `The ${figure ? 'figure' : 'card marker'} on the map sits at the place this card is linked to.`,
  dfc: 'Double-faced card',
  frontFace: 'Front',
  backFace: 'Back',
  landFace: 'Land face',
  bothLands: 'Both faces are lands, so the map shows a single marker.',
  drawnAsFigure: 'Drawn on the map as a figure.',
  faceShownIn: (s) =>
    !s
      ? 'Always listed in the panel.'
      : `Listed in the panel ${s.slot ? `from Saga ${s.slot.saga} (${s.slot.nameEn}), Phase ${s.slot.local}, within that saga` : 'when its saga is on'}${s.years.length ? `; in the timeline, in ${s.years.join(', ')}` : ''}.`,
  cardUnavailable: 'Could not load the card text. Reload the page to try again.',
  thisPeriod: 'This period',
  notYetHere: 'Not yet here in this period, so the map leaves it unmarked.',
  ruinedHere: 'In ruins in this period, so the map marks it as a ruin.',
  basisLead: 'Basis: ',
  featuresHere: 'Terrain drawn on the map',
  featureCount: (lines, places) => {
    const text = [lines ? plural(lines, 'stretch', 'stretches') : '', places ? plural(places, 'site', 'sites') : ''].filter(Boolean).join(', ')
    return text ? ` (${text})` : ''
  },
  placesOnContinent: 'Places on this continent',
  absentPlaces: 'Not yet here in this period',
  absentPlacesNote: 'These places did not exist yet in the selected phase, so the map leaves them unmarked.',
  unknownPlaces: 'Location unknown',
  unknownPlacesNote: 'Official sources name only the continent, so these are not placed on the map.',
  estimatedFeatures: 'Terrain placed by this map',
  estimatedFeaturesNote: 'This terrain is in the official setting, but its position or extent is not given, so this map chose where to draw it.',
  rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', mythic: 'Mythic rare' },
  kind: {
    settlement: 'Settlement',
    ruin: 'Ruin',
    landmark: 'Landmark',
    sky: 'Sky ruin',
    underground: 'Underground ruin',
    region: 'Region',
    water: 'Waterway',
  },
  terrainKind: {
    forest: 'forest',
    mountain: 'mountains',
    swamp: 'swamp',
    plain: 'plains',
    plateau: 'plateau',
    canyon: 'canyon',
    ice: 'ice field',
    volcanic: 'volcanic land',
    sea: 'sea',
    river: 'river',
  },
  placement: {
    'fan-map': 'Position follows the fan map this project draws on, kept only where it agrees with the official setting.',
    'canon-hint': 'An estimated position based on how official sources describe the location.',
    estimate: 'Official sources do not give an exact position, so this map chose one.',
    unplaced: 'Official sources name only the continent. To avoid inventing a position, the map does not mark it.',
  },
  landscapeKind: {
    forest: 'Forest',
    swamp: 'Swamp',
    mangrove: 'Water-rooted forest',
    mountain: 'Mountain range',
    hills: 'Hills',
    plain: 'Open land',
    mesa: 'Mesa',
    canyon: 'Canyonland',
    ice: 'Ice field',
    crystal: 'Crystal spire field',
    lava: 'Lava field',
    tundra: 'Tundra',
    river: 'River',
    cliff: 'Cliff',
    gorge: 'Gorge',
    volcano: 'Volcano',
    caldera: 'Supervolcano caldera',
    waterfall: 'Waterfall',
    geyser: 'Geyser and hot spring',
    pit: 'Sinkhole',
    spire: 'Spire',
    'floating-rock': 'Floating rock',
    urn: 'Floating stone urn',
    'sea-ice': 'Sea ice',
    whirl: 'Whirlpool',
    reef: 'Reef',
    rough: 'Rough water',
    dust: 'White dust plain',
    chalk: 'Chalk scar',
    drybed: 'Drained bed',
    deadwood: 'Dead forest',
  },
}

export const MESSAGES: Record<LabelLang, Messages> = { ko, en }
