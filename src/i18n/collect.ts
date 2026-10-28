// 영어로 옮길 데이터 글 모으기 — 패널에 싣는 글의 칸만 (이름 nameKo·지도 라벨은 옮기지 않는다: 한국어 이름은 공식 한국어판 표기라 영어는 name 이다).
// scripts/i18n(사전 만들기)과 vite/phaseData.ts(카드마다의 조각에 그 카드의 영어 싣기)가 함께 쓴다 — 타입만 지우면 되는 문법만
import { hasHangul, splitUnits, unitKey, type Dict } from './units.ts'

/** 패널에 싣는 글의 칸 — 이 이름의 칸에 든 한국어 글(과 글 목록)을 모은다. sources 는 그 label 만 */
const TEXT_KEYS = new Set(['description', 'history', 'placementBasis', 'estimate', 'basis', 'label', 'summary', 'terrain', 'peoples', 'note', 'subject'])

const SKIP_NONE: ReadonlySet<string> = new Set()

/** 값 나무를 돌며 [자리, 글] — 자리는 사람이 읽는 길 (locations/eye-of-ugin.description). skip 의 칸은 넘어간다 (바탕 지형의 basis 처럼 패널에 싣지 않는 것) */
export function collectTexts(value: unknown, where: string, out: [string, string][], key?: string, skip: ReadonlySet<string> = SKIP_NONE) {
  if (typeof value === 'string') {
    if (key && TEXT_KEYS.has(key) && !skip.has(key) && hasHangul(value)) out.push([where, value])
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectTexts(v, `${where}[${i}]`, out, key === 'peoples' ? key : undefined, skip))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'sources' && Array.isArray(v)) {
        v.forEach((s, i) => s && typeof s.label === 'string' && hasHangul(s.label) && out.push([`${where}.sources[${i}]`, s.label]))
        continue
      }
      collectTexts(v, `${where}.${k}`, out, k, skip)
    }
  }
}

/** 페이즈 카드 한 장의 영어 — 그 카드 글의 문장 가운데 사전에 있는 것 (vite/phaseData.ts 가 카드마다의 조각에 싣는다) */
export function englishOfCard(card: unknown, dict: Dict): Record<string, string> {
  const out: Record<string, string> = {}
  const texts: [string, string][] = []
  collectTexts(card, 'card', texts)
  for (const [, text] of texts)
    for (const u of splitUnits(text)) {
      if (!hasHangul(u)) continue
      const k = unitKey(u)
      if (dict[k] !== undefined) out[k] = dict[k]
    }
  return out
}
