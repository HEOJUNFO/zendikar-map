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
  // 페이즈1(BFZ, phase4.ts)은 BFZ 의 대지가 아닌 미식 레어·레어·언커먼·커먼, 페이즈2(OGW, phase5.ts)는 지금 OGW 의 대지가 아닌 미식 레어·레어·언커먼만 싣고,
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
