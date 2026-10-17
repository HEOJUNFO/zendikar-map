// 사가 — 젠디카르 이야기의 큰 시기. 사가마다 페이즈가 있고, 페이즈 n 은 그 사가의 페이즈 1..n 카드를 모두 그린다.
// 사가를 넘어가면 지도의 카드 그림을 비우고 새로 시작한다(사용자 결정 2026-10-11) — 앞 사가의 대상은 공식 자료가 새 사가의 시점에도
// 그 자리에 있다고 밝힌 것만 새 사가의 카드로 다시 싣는다. 바탕 지도와 대지 카드(cards.ts)는 사가와 상관없이 늘 같다.
// 안에서는 페이즈를 사가를 넘어 이어 센 번호(1, 2, 3 = 사가1, 4… = 사가2)로 다룬다 — phaseN.ts·그림 묶음 world-n·빈터의 phaseN 이 이 번호다.

export interface Saga {
  /** 헤더와 패널에 보이는 이름 (사가 이름은 이 지도가 붙였다 — 공식 블록·세트 이름에서) */
  name: string
  nameEn: string
  /** 사가의 세트 (페이즈 차례) */
  sets: readonly string[]
  /** 데이터가 있는 페이즈 수 — 0 이면 아직 헤더에 나오지 않는다 */
  phases: number
}

export const SAGAS: readonly Saga[] = [
  // 탐험과 보물찾기로 시작해 우진의 눈에서 엘드라지 거신 셋이 풀려나기까지 (2009–10)
  { name: '엘드라지의 깨어남', nameEn: 'The Awakening', sets: ['ZEN', 'WWK', 'ROE'], phases: 3 },
  // 풀려난 엘드라지와의 전쟁, 울라모그·코질렉이 쓰러지기까지 (2015–16). 공식 블록 이름이자 BFZ 의 공식 한국어판 세트 이름
  // 페이즈1(BFZ, phase4.ts)은 BFZ 의 대지가 아닌 미식 레어·레어·언커먼·커먼, 페이즈2(OGW, phase5.ts)는 OGW 의 대지가 아닌 미식 레어·레어·언커먼·커먼을 싣고,
  // 둘 다 엘드라지와 이어진 대지 카드(cards.ts 의 saga: 2)가 함께 나온다
  { name: '젠디카르 전투', nameEn: 'Battle for Zendikar', sets: ['BFZ', 'OGW'], phases: 2 },
]

export interface PhaseSlot {
  /** 사가를 넘어 이어 센 페이즈 번호 (1부터) */
  level: number
  /** 사가 번호 (1부터) */
  saga: number
  /** 그 사가 안의 페이즈 번호 (1부터) — 헤더·주소·패널에 보이는 번호 */
  local: number
}

/** 데이터가 있는 모든 페이즈 — 사가 차례, 그 안에서 페이즈 차례 */
export const PHASE_SLOTS: readonly PhaseSlot[] = (() => {
  let level = 0
  return SAGAS.flatMap((s, i) => Array.from({ length: s.phases }, (_, j) => ({ level: ++level, saga: i + 1, local: j + 1 })))
})()

/** 이어 센 페이즈 번호의 자리 (없는 번호면 undefined) */
export const slotOf = (level: number) => PHASE_SLOTS.find((p) => p.level === level)

/** 그 사가의 첫 페이즈 번호 (이어 센 번호) — 페이즈 level 은 이 번호부터 level 까지의 카드를 그린다 */
export const sagaStart = (level: number) => {
  const slot = slotOf(level)
  return slot ? level - slot.local + 1 : 1
}

/** 사가 saga 의 페이즈 local 의 이어 센 번호 — 없는 페이즈면 undefined */
export const levelOf = (saga: number, local = 1) => PHASE_SLOTS.find((p) => p.saga === saga && p.local === local)?.level

/** 페이즈 level 에서 그리는 페이즈들 (이어 센 번호, 그 사가의 첫 페이즈부터) — 0(끔)이면 [1] */
export const sagaLevels = (level: number) => {
  const from = sagaStart(level)
  return Array.from({ length: Math.max(level, from) - from + 1 }, (_, i) => from + i)
}

/**
 * 페이즈 문 — 붙은 칸·빈터·부분은 그 페이즈가 켜졌는지(이어 센 번호 n 이 켜졌다 = 같은 사가에서 페이즈 n 이상)가 값과 맞을 때만 그린다.
 * phase(1)·phase2·phase3 은 사가1(엘드라지의 깨어남), phase4·phase5 는 사가2(젠디카르 전투)의 페이즈1·2 — 다른 사가를 켜면 그 사가를 끈 것처럼 본다
 * (사가를 넘어가면 앞 사가의 그림 자리를 비우지 않는다). 페이즈 그림 자리를 비워 둔 빈터는 true, 페이즈를 끄면 그 자리를 채울 칸은 false 로 둔다.
 * 여럿이 붙으면 모두 맞을 때(AND). 지역 상세 그림(childMapArt.ts)이 쓰고, 세계 지도의 페이즈 바탕(src/data/periods)은 단계 목록(levels)을
 * gatesFor 로 이 문들(OR)로 옮겨 작가에게 준다 — 문 셈은 의존이 없는 이 파일에 두어 Node 도구(scripts/childmaps)도 그대로 읽는다
 */
export interface PhaseGate {
  phase?: boolean
  phase2?: boolean
  phase3?: boolean
  phase4?: boolean
  phase5?: boolean
}
/** 페이즈 문의 이름과 그 페이즈 (이어 센 번호) */
export const GATES = [['phase', 1], ['phase2', 2], ['phase3', 3], ['phase4', 4], ['phase5', 5]] as const

/** 붙은 페이즈 문만 (세계 지도 단위로 옮길 때 그대로 넘긴다) */
export const gateOf = (a: PhaseGate): PhaseGate => Object.fromEntries(GATES.filter(([k]) => a[k] !== undefined).map(([k]) => [k, a[k]]))

/** 페이즈 단계(0: 끔, 이어 센 번호)에서 그리는가 */
export const inPhase = (a: PhaseGate, level: number): boolean =>
  GATES.every(([k, n]) => a[k] === undefined || a[k] === (sagaStart(level) <= n && n <= level))

/** 페이즈 문이 붙었나 (inPhase 가 페이즈마다 달라질 수 있다) */
export const gated = (a: PhaseGate) => GATES.some(([k]) => a[k] !== undefined)

/** 문이 셈하는 단계 — 0(끔)과 데이터가 있는 모든 페이즈 (이어 센 번호) */
const LEVELS = [0, ...PHASE_SLOTS.map((p) => p.level)]

/** 문이 맞는 단계 (0..5, 오름차순) */
export const levelsOf = (g: PhaseGate): number[] => LEVELS.filter((l) => inPhase(g, l))

const maskOf = (levels: readonly number[]) => levels.reduce((m, l) => m | (1 << l), 0)
const keyCount = (g: PhaseGate) => GATES.filter(([k]) => g[k] !== undefined).length
/** 단계 집합(비트) → 그 집합을 정확히 덮는 가장 적은 문 — 처음 물을 때 한 번 셈한다 (앱은 쓰지 않아 첫 로딩에 셈하지 않는다) */
let covers: Map<number, readonly PhaseGate[]> | undefined
function coverTable(): Map<number, readonly PhaseGate[]> {
  if (covers) return covers
  // 문 3^5 = 243 개 (열쇠마다 없음·true·false) — 같은 단계 집합을 맞추는 문 가운데 열쇠가 가장 적은 것 하나만 (같으면 먼저 센 것)
  let all: PhaseGate[] = [{}]
  for (const [k] of GATES) all = all.flatMap((g) => [g, { ...g, [k]: true }, { ...g, [k]: false }])
  const byMask = new Map<number, PhaseGate>()
  for (const g of all) {
    const m = maskOf(levelsOf(g))
    const cur = byMask.get(m)
    if (m && (!cur || keyCount(g) < keyCount(cur))) byMask.set(m, g)
  }
  const unit = [...byMask].map(([m, g]) => ({ m, g, keys: keyCount(g) }))
  // 너비 우선 — 문 하나씩 더해 닿는 집합마다 가장 적은 문(같으면 열쇠 수 합이 가장 적은 것). 정확히 t 에 닿는 길의 문은 모두 t 안이라
  // 한 번의 탐색이 모든 집합의 답이 된다 (그 길의 앞부분도 저마다 가장 짧은 길이다)
  const best = new Map<number, { gates: PhaseGate[]; keys: number }>([[0, { gates: [], keys: 0 }]])
  let layer = [0]
  while (layer.length) {
    const next = new Map<number, { gates: PhaseGate[]; keys: number }>()
    for (const m of layer) {
      const from = best.get(m)!
      for (const u of unit) {
        const nm = m | u.m
        if (best.has(nm)) continue
        const keys = from.keys + u.keys
        const cur = next.get(nm)
        if (!cur || keys < cur.keys) next.set(nm, { gates: [...from.gates, u.g], keys })
      }
    }
    for (const [m, v] of next) best.set(m, v)
    layer = [...next.keys()]
  }
  // 문 차례는 맞는 가장 낮은 단계 차례 (읽기 쉽게 — [1..5] 는 {phase}, {phase4})
  const low = (g: PhaseGate) => levelsOf(g)[0]
  covers = new Map([...best].map(([m, v]) => [m, [...v.gates].sort((a, b) => low(a) - low(b))]))
  return covers
}

/**
 * 정확히 그 단계 집합(0..5, 차례·겹침 상관없음)에서만 그리는 문들 — 문 하나하나는 AND, 여럿이면 OR(그림 부분·칸·빈터를 문마다 하나씩 둔다).
 * 가장 적은 문으로, 같으면 붙는 열쇠가 가장 적게. 빈 집합이면 [] — [5] → {phase5}, [1, 2] → {phase, phase3: false}, [0, 3, 4, 5] → {phase: false}, {phase3}
 */
export function gatesFor(levels: readonly number[]): PhaseGate[] {
  for (const l of levels) if (!LEVELS.includes(l)) throw new Error(`gatesFor: 모르는 단계 ${l} — ${LEVELS.join('·')} 가운데`)
  const hit = coverTable().get(maskOf(levels))
  if (!hit) throw new Error(`gatesFor: [${levels.join(', ')}] 를 덮는 문이 없다`)
  return hit.map((g) => ({ ...g }))
}
