// 데이터 글(설명·근거·추정 — 한국어 원본)을 영어로 옮길 때의 단위. 글을 한국어 문장 끝('…다. ')에서 잘라 문장마다 영어를 단다 —
// 패널이 여러 추정 메모의 함께 시작하는 문장을 한 번만 싣는 것(FeatureList)도 이 단위로 자르면 잘린 조각마다 영어가 있다.
// 사전(src/i18n/en/*.json)은 한국어 문장의 열쇠(unitKey) → 영어. 한국어 원본을 고치면 열쇠가 바뀌어 그 문장은 한국어로 남고,
// node scripts/i18n/extract.mjs 가 옮길 문장으로 센다. Node 도구도 그대로 읽는다 (타입만 지우면 되는 문법만 쓴다)

/** 한국어 글자가 있는가 — 없는 조각(영어 인용, 숫자)은 옮기지 않는다 */
export const hasHangul = (s: string) => /[가-힣]/.test(s)

/** 한국어 문장 끝(한글 바로 뒤의 마침표) 뒤의 빈칸에서 자른다 — 영어 인용 안의 마침표에서는 자르지 않는다 */
export function splitUnits(s: string): string[] {
  return s
    .split(/(?<=[가-힣]\.)\s+/)
    .map((u) => u.trim())
    .filter(Boolean)
}

/** 문장의 열쇠 — cyrb53 (53비트) 를 36진수로 */
export function unitKey(s: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export type Dict = Readonly<Record<string, string>>

/** 글을 영어로 — 문장마다 사전에서 찾고, 하나라도 없으면 null (한 글 안에서 두 언어를 섞지 않는다) */
export function translate(s: string, dict: Dict): string | null {
  if (!hasHangul(s)) return s
  const out: string[] = []
  for (const u of splitUnits(s)) {
    if (!hasHangul(u)) {
      out.push(u)
      continue
    }
    const en = dict[unitKey(u)]
    if (en === undefined) return null
    out.push(en)
  }
  return out.join(' ')
}
