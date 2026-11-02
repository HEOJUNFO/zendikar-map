// 그림 이름(.figure-label)·장소와 카드 이름(.point-label)·지역 이름(.area-label)·지역 상세 이름(.child-label) 글자 상자 — 글꼴에서 잰 값.
// 세계 지도·지역 상세 지형 기호를 비울 상자(ZendikarMap 의 nameHoleBox·centredHoleBox)에만 쓴다.
// 이름 배치(labels.ts 의 textWidthEm 추정)는 이것을 쓰지 않는다 — 바꾸면 이름 자리가 옮겨 앉는다.
//
// 잰 방법 (2026-10-29, headless Chrome, 글자 크기 100px): 지도 SVG 안에 .figure-label(IM Fell English 이탤릭)과
// .figure-label.is-ko(고운바탕 700, 자간 0.04em) 글을 두고 글자 하나씩 getComputedTextLength(띄어쓰기는 'a a' − 'aa'), 기준선에서의 getBBox 위·아래.
// 그림 이름 전부(영어 1205·한국어 704 — 지금의 phase1.ts~phase6.ts)를 통째로 잰 것과 견주면:
//  - 영어: 글자 폭의 합에 짝 글자 조이기로 0.96–1.00 배. 글자 상자는 그 폭 밖으로 앞 0.09em·뒤 0.21em 까지 나간다(이탤릭 기울기) — FELL_LEAD·FELL_TAIL
//  - 한국어: 합과 꼭 같다 (자간 0.04em 은 글자마다 붙는다 — 마지막 글자 뒤에도). 한글 음절은 0.90–1.04em 이라 가장 넓은 것으로 센다
// 장소·카드 이름(.point-label — IM Fell English 바로 선 글자, 한국어는 고운바탕 700 자간 없이)도 같은 길로 쟀다 (2026-11-02, 장소·대지 카드·
// 대륙 이름 영어 207·한국어 114, 지역 상세 이름 영어 45·한국어 26): 바로 선 글자는 글자 폭의 합에 0.93–1.00 배, 글자 상자는 앞 0.09em·뒤 0.14em 까지,
// 고운바탕은 합과 꼭 같고 한글 음절은 가장 넓은 것이 0.999em 이다. 지역 이름(.area-label)은 그림 이름과 같은 이탤릭에 자간 0.12em,
// 지역 상세의 물 이름은 자간 0.08em — 자간은 글자마다(마지막 글자 뒤에도) 붙는다 (tracked).
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
/** IM Fell English 바로 선 글자 폭 (em) — 장소·카드 이름(.point-label), 지역 상세의 장소 이름(.child-label) */
const FELL_ROMAN: Record<string, number> = {
  ' ': 0.218, "'": 0.274, ',': 0.266, '-': 0.465,
  a: 0.432, A: 0.676, b: 0.535, B: 0.662, c: 0.429, C: 0.715, d: 0.533, D: 0.803, e: 0.459, E: 0.693, f: 0.363, F: 0.635,
  g: 0.543, G: 0.795, h: 0.532, H: 0.859, i: 0.268, I: 0.43, j: 0.238, J: 0.409, k: 0.535, K: 0.723, l: 0.274, L: 0.711,
  m: 0.773, M: 0.941, n: 0.533, N: 0.865, o: 0.539, O: 0.829, p: 0.542, P: 0.578, q: 0.499, Q: 0.82, r: 0.367, R: 0.756,
  s: 0.352, S: 0.513, t: 0.344, T: 0.728, u: 0.519, U: 0.847, v: 0.444, V: 0.654, w: 0.657, W: 0.954, x: 0.487,
  y: 0.492, Y: 0.68, z: 0.463, Z: 0.702,
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
  /** 기준선에서 글자 상자 위·아래 (em, 위는 음수) — 글꼴의 줄 상자. 잉크 표에 없는 글자는 이것으로 센다 */
  top: number
  bottom: number
  /** 그 이름의 글자 잉크가 기준선에서 닿는 위·아래 (em, 위는 음수) — 지형 기호를 비울 상자의 높이 */
  ink(name: string): readonly [number, number]
}

/**
 * 글자마다 잉크 위·아래 (em) — 잰 방법 (2026-11-02, headless Chrome 캔버스 measureText 의 actualBoundingBoxAscent·Descent, 글자 크기 100px,
 * 지도의 .figure-label·.point-label·.point-label.is-ko 와 같은 글꼴): 아스키 글자 하나씩, 한글 음절은 11172 자 가운데 가장 높고 낮은 것.
 * 줄 상자(top·bottom)는 글꼴의 올림·내림이라 x 높이 글자만 있는 이름(Turntimber 의 아래쪽, 내림 글자가 없는 이름)에는 0.3–0.5em 넓다 —
 * 그만큼 이름 위·아래로 기호가 더 빠졌다. 소수 둘째 자리까지 바깥으로 올림해 적는다. 띄어쓰기는 잉크가 없다
 */
function inkTable(chars: string, tops: readonly number[], bottoms: readonly number[], hangul: readonly [number, number]) {
  const table = new Map<string, readonly [number, number]>()
  ;[...chars].forEach((ch, i) => table.set(ch, [tops[i] / 100, bottoms[i] / 100]))
  table.set(' ', [0, 0])
  return { table, hangul }
}
type InkTable = ReturnType<typeof inkTable>
const FELL_ITALIC_INK = inkTable("0123456789!\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~", [-40,-42,-39,-41,-43,-45,-57,-40,-60,-44,-64,-72,-68,-78,-57,-67,-72,-70,-70,-74,-56,-10,-30,-14,-72,-41,-41,-68,-44,-68,-78,-72,-69,-70,-70,-69,-69,-70,-72,-69,-68,-72,-69,-68,-69,-69,-66,-67,-74,-69,-73,-76,-71,-72,-67,-70,-65,-66,-71,-73,-71,-62,0,-73,-42,-75,-43,-72,-42,-73,-43,-73,-68,-68,-66,-70,-42,-42,-43,-54,-41,-43,-41,-52,-40,-42,-45,-45,-44,-45,-74,-74,-75,-50], [1,1,1,23,24,22,0,24,1,12,1,-46,-4,8,13,2,-46,24,24,-30,-9,15,-22,1,4,1,13,-3,-13,-3,1,1,2,0,1,1,2,1,1,3,3,26,27,2,2,1,1,0,37,26,1,1,1,1,-1,2,2,34,24,23,24,-33,10,-47,1,1,2,2,0,27,35,2,1,33,2,1,2,1,0,32,32,1,0,2,1,0,1,0,31,28,26,23,25,-36], [-0.88, 0.24])
const FELL_ROMAN_INK = inkTable("0123456789!\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~", [-40,-42,-39,-41,-43,-45,-57,-40,-60,-44,-63,-74,-68,-79,-57,-65,-73,-74,-74,-74,-56,-13,-29,-13,-72,-41,-41,-68,-42,-68,-65,-73,-71,-69,-71,-70,-68,-70,-70,-68,-69,-71,-67,-70,-66,-72,-72,-69,-70,-70,-71,-73,-71,-72,-71,-69,-70,-68,-71,-73,-71,-60,1,-73,-47,-73,-48,-73,-48,-72,-47,-74,-70,-71,-72,-73,-46,-46,-46,-45,-46,-45,-47,-54,-48,-47,-46,-46,-47,-46,-74,-74,-75,-36], [1,1,1,23,24,22,0,24,1,12,0,-35,-4,10,13,4,-35,23,23,-30,-9,25,-17,0,4,0,25,-3,-12,-3,1,1,1,1,2,0,1,2,1,1,0,29,2,1,1,2,2,0,28,2,0,1,-1,3,3,2,1,1,24,23,24,-32,13,-50,0,1,1,2,1,0,29,1,1,29,1,1,1,1,0,29,29,1,1,2,1,2,0,0,28,1,26,23,25,-21], [-0.88, 0.24])
const GOWUN_INK = inkTable("0123456789!\"#$%&'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~", [-80,-79,-80,-80,-80,-79,-80,-78,-80,-80,-81,-87,-73,-88,-80,-81,-87,-87,-87,-80,-64,-17,-40,-17,-84,-62,-62,-69,-54,-69,-81,-73,-80,-78,-80,-78,-78,-78,-80,-78,-78,-78,-78,-78,-78,-78,-80,-78,-80,-78,-80,-78,-78,-78,-78,-78,-78,-78,-86,-84,-86,-85,-3,-82,-57,-81,-57,-81,-57,-82,-57,-81,-77,-77,-81,-81,-57,-57,-57,-57,-57,-57,-57,-67,-55,-55,-55,-55,-55,-55,-87,-87,-87,-50], [-6,-8,-8,-6,-4,-6,-6,-4,-6,-6,-2,-59,-7,3,-7,-4,-59,9,9,-37,-15,11,-31,-2,3,-9,6,-8,-24,-8,-2,6,-8,-8,-6,-7,-7,-8,-6,-8,-8,10,-6,-7,-8,-8,-6,-8,10,-6,-6,-8,-6,-6,-6,-8,-8,-8,8,3,8,-54,4,-61,-6,-6,-6,-6,-6,-8,12,-8,-8,12,-6,-8,-8,-8,-6,12,12,-8,-6,-6,-6,-6,-6,-7,12,-7,9,10,9,-32], [-0.88, 0.26])

const inkOf = (ink: InkTable, top: number, bottom: number) => {
  const cache = new Map<string, readonly [number, number]>()
  return (name: string): readonly [number, number] => {
    let r = cache.get(name)
    if (r) return r
    let t = 0
    let b = -Infinity
    for (const ch of name) {
      const c = ch.codePointAt(0) ?? 0
      const [ct, cb] = c >= 0xac00 && c <= 0xd7a3 ? ink.hangul : (ink.table.get(ch) ?? [top, bottom])
      if (ct < t) t = ct
      if (cb > b) b = cb
    }
    r = [t, Number.isFinite(b) ? b : 0]
    cache.set(name, r)
    return r
  }
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
export const FELL_CAPTION: CaptionFont = { width: widthOf(FELL, 1.3), lead: FELL_LEAD, tail: FELL_TAIL, top: -0.914, bottom: 0.364, ink: inkOf(FELL_ITALIC_INK, -0.914, 0.364) }
/** 한국어 이름 (.is-ko — 고운바탕 700) */
export const GOWUN_CAPTION: CaptionFont = { width: widthOf(GOWUN, GOWUN_HANGUL), lead: 0, tail: 0, top: -1.169, bottom: 0.298, ink: inkOf(GOWUN_INK, -1.169, 0.298) }

/** 장소·카드 이름 (.point-label — IM Fell English 바로 선 글자) */
export const FELL_POINT: CaptionFont = { width: widthOf(FELL_ROMAN, 1.3), lead: 0.092, tail: 0.142, top: -0.907, bottom: 0.359, ink: inkOf(FELL_ROMAN_INK, -0.907, 0.359) }
/** 장소·카드의 한국어 이름 (.point-label.is-ko — 고운바탕 700, 자간 없이: 그림 이름 표에서 글자마다 0.04em 을 덜어 낸다) */
export const GOWUN_POINT: CaptionFont = {
  width: (name) => GOWUN_CAPTION.width(name) - 0.04 * [...name].length,
  lead: 0,
  tail: 0,
  top: -1.169,
  bottom: 0.298,
  ink: GOWUN_CAPTION.ink,
}
/** 글자마다 자간(em)을 더한 글꼴 — 지역 이름(.area-label 0.12em)·지역 상세의 지역(0.12em)·물(0.08em) 이름 */
export function tracked(m: CaptionFont, tracking: number): CaptionFont {
  return { ...m, width: (name) => m.width(name) + tracking * [...name].length }
}
