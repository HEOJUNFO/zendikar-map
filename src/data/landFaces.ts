// 양면 카드(MDFC)의 대지 면 목록 — 페이즈 카드 원본(phaseN.ts 의 PhaseCard.land)에서 조각 플러그인(vite/phaseData.ts 의 `?lands`)이 뽑은 작은 목록을 정적으로 불러온다.
// 장소 패널은 페이즈 데이터를 받지 않고도(페이즈를 끈 지도에서도) 그 장소의 대지 면을 싣는다. 모양과 규칙은 ./landFace.ts.
// 조각은 사가의 세트마다 하나(phase.ts 의 MAPS 와 같은 차례)이고, 데이터가 있는 페이즈(sagas.ts 의 PHASE_SLOTS)의 것만 싣는다 —
// 아직 열지 않은 사가(phases: 0)의 대지 면은 그 카드 패널을 열 수 없어 장소 패널에도 싣지 않는다.
import type { LandFaceEntry } from './landFace'
import { SAGAS, slotOf } from './sagas'
import { FACES as F1 } from './phase1?lands'
import { FACES as F2 } from './phase2?lands'
import { FACES as F3 } from './phase3?lands'
import { FACES as F4 } from './phase4?lands'
import { FACES as F5 } from './phase5?lands'
import { FACES as F6 } from './phase6?lands'

const BY_PHASE = [F1, F2, F3, F4, F5, F6] as readonly (readonly LandFaceEntry[])[]
// 조각은 사가의 세트마다 하나 — 세트를 더하면 여기도 (phase.ts 의 MAPS·TEXTS 와 같다)
if (BY_PHASE.length !== SAGAS.reduce((n, s) => n + s.sets.length, 0)) throw new Error(`landFaces.ts 의 조각 수(${BY_PHASE.length})가 sagas.ts 의 세트 수와 다르다`)

export const LAND_FACES: readonly LandFaceEntry[] = BY_PHASE.flatMap((faces, i) => (slotOf(i + 1) ? faces : []))
