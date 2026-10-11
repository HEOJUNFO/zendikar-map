// 페이즈4 — 사가2(젠디카르 전투)의 페이즈1, Battle for Zendikar(BFZ, 2015) 세트. 페이즈1·2·3 과 같은 모양·규칙(phase1.ts 의 PhaseCard)으로 싣는다.
// 사가를 넘어왔으므로 사가1(ZEN·WWK·ROE)의 그림은 그리지 않는다 — 사가1의 대상은 공식 자료가 BFZ 무렵에도 그 자리에 있다고 밝힌 것만 여기 새 카드로 다시 싣는다.
// 아직 BFZ 의 대지가 아닌 카드는 없다. 지금 이 페이즈를 켜면 엘드라지가 깨어난 것과 이어진 BFZ 대지 카드(cards.ts 의 saga: 2)만 지도에 더해진다.
import type { PhaseCard } from './phase1'

export const PHASE4_CARDS: PhaseCard[] = []
