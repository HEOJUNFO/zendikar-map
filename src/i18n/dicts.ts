// 데이터 글의 영어 사전 받기 — base(장소·대륙·대지 카드·지역 상세 안내·바탕 지형·페이즈 바탕)는 영어 보기면 한 번.
// 페이즈 카드 글의 영어(src/i18n/en/phase<n>.json)는 통째로 받지 않고 카드 글과 함께 카드 한 장씩 온다 (vite/phaseData.ts 의 EN)
import type { Dict } from './units'

let base: Promise<Dict> | null = null

export function loadBaseDict(): Promise<Dict> {
  if (!base) {
    base = import('./en/base.json').then((m) => m.default as Dict)
    // 못 받으면 다음에 다시
    base.catch(() => (base = null))
  }
  return base
}
