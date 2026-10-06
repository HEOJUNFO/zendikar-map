// 지도 데이터 타입 초안 — 실제 지도 작업 시작할 때 확정한다.

export type LocationKind =
  | 'city' // 도시·거점 (Sea Gate, Malakir 등)
  | 'ruin' // 엘드라지 유적·사원
  | 'landmark' // 지형 랜드마크 (Valakut, Eye of Ugin 등)
  | 'region' // 대륙 내 하위 지역 (Halimar, Hagra Swamp 등)

export interface Location {
  id: string
  name: string
  nameKo?: string
  kind: LocationKind
  continentId: string
  description?: string
}

export interface Continent {
  id: string
  name: string
  nameKo?: string
  description?: string
}
