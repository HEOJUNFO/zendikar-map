// 그림 이름(.figure-label) 글자 상자 — 글꼴에서 잰 값. 세계 지도 지형 기호를 비울 상자(ZendikarMap 의 captionHoleBox)에만 쓴다.
// 이름 배치(labels.ts 의 textWidthEm 추정)는 이것을 쓰지 않는다 — 바꾸면 이름 자리가 옮겨 앉는다.
//
// 잰 방법 (2026-10-29, headless Chrome, 글자 크기 100px): 지도 SVG 안에 .figure-label(IM Fell English 이탤릭)과
// .figure-label.is-ko(고운바탕 700, 자간 0.04em) 글을 두고 글자 하나씩 getComputedTextLength(띄어쓰기는 'a a' − 'aa'), 기준선에서의 getBBox 위·아래.
// 그림 이름 전부(영어 1205·한국어 704 — 지금의 phase1.ts~phase6.ts)를 통째로 잰 것과 견주면:
//  - 영어: 글자 폭의 합에 짝 글자 조이기로 0.96–1.00 배. 글자 상자는 그 폭 밖으로 앞 0.09em·뒤 0.21em 까지 나간다(이탤릭 기울기) — FELL_LEAD·FELL_TAIL
//  - 한국어: 합과 꼭 같다 (자간 0.04em 은 글자마다 붙는다 — 마지막 글자 뒤에도). 한글 음절은 0.90–1.04em 이라 가장 넓은 것으로 센다
// 표에 없는 글자는 추정(textWidthEm)의 1.3 배로 넉넉히 센다 — 새 이름에 낯선 글자가 들면 이 표에 더한다.
import { textWidthEm } from './labels'

/** IM Fell English 이탤릭 글자 폭 (em) — 그림 이름에 쓰인 글자 */
const FELL: Record<string, number> = {
  ' ': 0.211, '-': 0.444, ',': 0.245, "'": 0.272, '2': 0.46,
  a: 0.445, A: 0.715, b: 0.389, B: 0.623, c: 0.302, C: 0.501, d: 0.471, D: 0.708, e: 0.333, E: 0.669, f: 0.303, F: 0.568,
  g: 0.379, G: 0.688, h: 0.423, H: 0.867, i: 0.288, I: 0.397, j: 0.259, J: 0.537, k: 0.402, K: 0.67, l: 0.234, L: 0.651,
  m: 0.686, M: 1.01, n: 0.469, N: 0.826, o: 0.365, O: 0.592, p: 0.399, P: 0.573, q: 0.417, Q: 0.708, r: 0.34, R: 0.655,
  s: 0.286, S: 0.52, t: 0.324, T: 0.769, u: 0.459, U: 1.018, v: 0.472, V: 0.649, w: 0.672, W: 0.955, x: 0.482,
  y: 0.375, Y: 0.65, z: 0.378, Z: 0.667,
}
/** 고운바탕 700 + 자간 0.04em 의 한글 밖 글자 폭 (em) — 한국어 이름에 쓰인 것 */
const GOWUN: Record<string, number> = { ' ': 0.35, ',': 0.34, '2': 0.6 }
/** 고운바탕 700 한글 음절 하나 (자간 포함) — 잰 것 가운데 가장 넓은 것 */
const GOWUN_HANGUL = 1.039

/** 글자 상자가 글자 폭의 합 밖으로 나가는 몫 (em) — 영어 이탤릭의 첫 글자 앞·마지막 글자 뒤 */
const FELL_LEAD = 0.09
const FELL_TAIL = 0.21

export interface CaptionFont {
  /** 이름 폭 (em) */
  width(name: string): number
  /** 글자 상자가 그 폭 밖으로 나가는 몫 (em) — 앞·뒤 */
  lead: number
  tail: number
  /** 기준선에서 글자 상자 위·아래 (em, 위는 음수) */
  top: number
  bottom: number
}

const widthOf = (table: Record<string, number>, hangul: number) => {
  const cache = new Map<string, number>()
  return (name: string) => {
    let w = cache.get(name)
    if (w !== undefined) return w
    w = 0
    for (const ch of name) {
      const c = ch.codePointAt(0) ?? 0
      w += c >= 0xac00 && c <= 0xd7a3 ? hangul : (table[ch] ?? textWidthEm(ch) * 1.3)
    }
    cache.set(name, w)
    return w
  }
}

/** 영어 이름 (IM Fell English 이탤릭 — 한국어 보기에서 한국어판 이름이 없는 그림도) */
export const FELL_CAPTION: CaptionFont = { width: widthOf(FELL, 1.3), lead: FELL_LEAD, tail: FELL_TAIL, top: -0.914, bottom: 0.364 }
/** 한국어 이름 (.is-ko — 고운바탕 700) */
export const GOWUN_CAPTION: CaptionFont = { width: widthOf(GOWUN, GOWUN_HANGUL), lead: 0, tail: 0, top: -1.169, bottom: 0.298 }
