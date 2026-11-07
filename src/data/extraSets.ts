// 젠디카르 이야기 세트(sagas.ts 의 sets) 밖의 제품 — 사용자 결정(2026-11-06): 이 제품의 카드도 카드 이름·플레이버·규칙 글이나 공식 기사가 젠디카르와 이으면 싣는다
// (Commander·코어 세트·Modern Horizons·Jumpstart·Foundations·Planechase … — Zendikar Rising Commander 의 새 카드도. Zendikar Expeditions 와 이야기 세트 카드의 재판만인 인쇄는 싣지 않는다).
// 카드는 그 장면 무렵의 페이즈 파일(phaseN.ts) 끝에 싣고 sagaSet 에 그 무렵의 이야기 세트를, era 에 그 무렵을 고른 까닭을 단다 (phase1.ts 의 PhaseCard.era).
// 무렵을 고르는 차례(D2): 카드 글이나 공식 기사가 무렵을 밝히면 그것 · 글이 기간만 좁히면 그 기간 안에서 카드가 처음 인쇄된 날보다 늦지 않은 가장 늦은 무렵 ·
// 아니면 카드가 처음 인쇄된 날까지 나온 가장 늦은 이야기 세트(defaultEraSet — ZEN 보다 먼저 나왔거나 2009년 앞의 장면이면 ZEN).
// 의존이 없게 둔다 (sagas.ts 만) — Node 도구도 이 파일을 그대로 읽는다. 런타임 import 는 확장자를 붙인다
import { SAGAS } from './sagas.ts'

/** 이야기 세트가 나온 날 (sagas.ts 의 세트 차례와 같은 차례, 대문자 코드) */
export const STORY_RELEASED: Readonly<Record<string, string>> = {
  ZEN: '2009-10-02',
  WWK: '2010-02-05',
  ROE: '2010-04-23',
  BFZ: '2015-10-02',
  OGW: '2016-01-22',
  ZNR: '2020-09-25',
  MOM: '2023-04-21',
  MAT: '2023-05-12',
}

export interface ExtraSet {
  /** 제품 이름 — 영어 이름 그대로 (한국어 보기도 — 인쇄된 한국어 제품 이름을 확인한 것이 없다) */
  name: string
  /** 제품이 나온 날 (Scryfall 의 released_at). 카드의 무렵은 이 날이 아니라 카드가 처음 인쇄된 날(era.released)로 센다 — DCI Promos 처럼 한 제품 코드에 여러 해의 카드가 든다 */
  released: string
}

/** 이야기 세트 밖의 인쇄 제품 (소문자 코드 — Scryfall 의 코드). 날짜는 Scryfall 로 확인했다 (2026-11-06) */
export const EXTRA_SETS: Readonly<Record<string, ExtraSet>> = {
  ohop: { name: 'Planechase Planes', released: '2009-09-04' },
  // Scryfall 의 DCI Promos 는 여러 해의 판촉 카드를 한 코드에 담는다 (세트 날짜 2006-01-01 — Tazeem 은 2009-09-30)
  dci: { name: 'DCI Promos', released: '2006-01-01' },
  opc2: { name: 'Planechase 2012 Planes', released: '2012-06-01' },
  m14: { name: 'Magic 2014', released: '2013-07-19' },
  c13: { name: 'Commander 2013', released: '2013-11-01' },
  m15: { name: 'Magic 2015', released: '2014-07-18' },
  frf: { name: 'Fate Reforged', released: '2015-01-23' },
  ori: { name: 'Magic Origins', released: '2015-07-17' },
  c16: { name: 'Commander 2016', released: '2016-11-11' },
  m19: { name: 'Core Set 2019', released: '2018-07-13' },
  c18: { name: 'Commander 2018', released: '2018-08-10' },
  mh1: { name: 'Modern Horizons', released: '2019-06-14' },
  m20: { name: 'Core Set 2020', released: '2019-07-12' },
  jmp: { name: 'Jumpstart', released: '2020-07-17' },
  znc: { name: 'Zendikar Rising Commander', released: '2020-09-25' },
  cmr: { name: 'Commander Legends', released: '2020-11-20' },
  cmm: { name: 'Commander Masters', released: '2023-08-04' },
  mh3: { name: 'Modern Horizons 3', released: '2024-06-14' },
  m3c: { name: 'Modern Horizons 3 Commander', released: '2024-06-14' },
  fdn: { name: 'Foundations', released: '2024-11-15' },
  j25: { name: 'Foundations Jumpstart', released: '2024-11-15' },
  mbc: { name: 'Mystery Booster Commander Edition', released: '2026-10-19' },
}

/** 이야기 세트인가 (대소문자 상관없음 — sagas.ts 의 sets) */
export const isStorySet = (set: string): boolean => SAGAS.some((s) => s.sets.includes(set.toUpperCase()))

/** 날짜 꼴 (YYYY-MM-DD) */
export const isDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d)

/**
 * 그날까지 나온 가장 늦은 이야기 세트 (소문자 — 같은 날 나온 것도 든다: ZNC 는 ZNR). 그보다 먼저면(ZEN 앞에 나온 Planechase 의 Murasa·DCI 의 Tazeem) ZEN.
 * released 는 카드가 처음 인쇄된 날 (PhaseCard.era.released)
 */
export function defaultEraSet(released: string): string {
  if (!isDate(released)) throw new Error(`extraSets: '${released}' 는 날짜(YYYY-MM-DD)가 아니다`)
  const before = Object.entries(STORY_RELEASED).filter(([, d]) => d <= released)
  return (before.at(-1)?.[0] ?? 'ZEN').toLowerCase()
}

/** 제품 이름 — 이야기 세트 밖이면 EXTRA_SETS 의 이름, 아니면 대문자 코드 */
export const productName = (set: string): string => EXTRA_SETS[set.toLowerCase()]?.name ?? set.toUpperCase()
