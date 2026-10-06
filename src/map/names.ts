/** 지도에서 고른 것 — 장소, 대륙, 또는 대지 카드 (카드마다 패널이 따로 있다) */
export type Selection = { type: 'location'; id: string } | { type: 'continent'; id: string } | { type: 'card'; id: string }

export type LabelLang = 'en' | 'ko'

/** 한국어 표기는 공식 한국어 카드에 인쇄된 것이 있을 때만 쓴다 */
export const displayName = (l: { name: string; nameKo?: string }, lang: LabelLang) =>
  lang === 'ko' && l.nameKo ? l.nameKo : l.name
