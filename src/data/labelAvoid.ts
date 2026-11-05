// 그 무렵 바탕(페이즈 바탕)의 큰 기호가 차지하는 상자 — 단계(이어 센 페이즈 번호)마다. 지역 이름이 페이즈 그림처럼 이 상자를 비킨다
// (장소·카드·그림 이름은 비키지 않는다 — 개관 가까이에서는 기호에 견줘 이름 상자가 커서, 비키면 바다 관문·에메리아 표시의 이름이 사라졌다).
// 사가4 의 2023년 기호(src/map/landscapeGlyphs.ts 의 GLYPH_CLEAR 종류 — 흰 금속의 땅·하늘거주지, 떨어진 하늘거주지, Invasion Tree 가지)만 —
// 폭포 같은 작은 기호는 이름이 비키지 않아 사가1–3·끔·시점 T1–T5 의 이름 자리는 그대로다 (2026-11-03 검토: 오란리프 이름이 흰 금속 땅에 얹혔다).
// 페이즈 바탕 조각(src/map/period.ts·src/data/periods — 늦게 받는다)을 받기 전에도, ?noperiod(scripts/qa/svgdiff.mjs 의 기준)에서도 이름이 같은 자리에 앉게
// 값을 적어 둔다 (그래서 src/data/periods 밖에 둔다 — 첫 조각에 페이즈 바탕을 끌어들이지 않게, scripts/qa/entry-check.mjs).
// 값은 src/data/periods/<대륙>.ts 의 glyphs 를 landscapeGlyphs.ts 의 landmarkParts 로 그린 상자(landmarkBox, 흐린 그림자는 빼고)를
// 0.1 단위 바깥으로 올린 것 — 기호의 자리·크기·모양을 고치면 scripts/qa/period-mark-test.mjs 가 어긋남을 알리고 새 값을 보인다.
// 단계 8 의 죽은 금속 평원(땅 칠 metal — emeria-2023-plain)도 그 고리의 상자로 넣었다: 오란리프의 한 자락이라 오란리프 이름이 평원 위에 앉았다(2026-11-03 검토 2)
export interface AvoidBox {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

export const PERIOD_LABEL_AVOID: Readonly<Record<number, readonly AvoidBox[]>> = {
  7: [
    { x0: 949.4, y0: 652, x1: 977.6, y1: 674.5 }, // emeria-2023-ground
    { x0: 946.3, y0: 642.7, x1: 977.5, y1: 663.6 }, // emeria-2023-skyclave
    { x0: 932.3, y0: 646.6, x1: 946.7, y1: 679 }, // realmbreaker-2023-emeria
    { x0: 1148.4, y0: 524, x1: 1167.6, y1: 548.7 }, // realmbreaker-2023-sea-gate-sea
    { x0: 1150.3, y0: 575.6, x1: 1164.7, y1: 608 }, // realmbreaker-2023-sea-gate-land
  ],
  8: [
    { x0: 932, y0: 643.6, x1: 1031, y1: 724.5 }, // emeria-2023-plain
    { x0: 990.6, y0: 684, x1: 1022, y1: 710.6 }, // emeria-2023-ground-dead
    { x0: 946.4, y0: 652.4, x1: 977, y1: 667.2 }, // emeria-2023-crash
  ],
}

/**
 * 그 무렵 바탕의 큰 기호 바로 위에 놓인 표시의 이름 쪽 — 단계마다 대지 카드 id → 쪽. 그 쪽이 비어 있으면 늘 먼저 두고(앞 tier 의 쪽보다도),
 * 지역 이름이 그 쪽 자리를 비워 둔다(그 때문에 그 tier 에 자리를 잃는 지역 이름이 생기면 비워 두지 않는다 — 지역 이름은 사라지지 않는다).
 * 사가4 의 에메리아 표시(Emeria, the Sky Ruin — 자리가 없는 장소의 표시)는 바로 밑에 2023년의 하늘거주지(단계 7 은 떠 있는 흰 금속 하늘거주지,
 * 단계 8 은 떨어진 하늘거주지)가 있어 이름을 위에 단다 — 한국어 보기의 tier 2 에서 할리마르 물 이름·산림 협곡 표시에 막혀 밑에 앉은 '에메리아'와
 * 그 글자 테두리가 떨어진 하늘거주지의 둥근 지붕을 덮었다 (2026-11-05). 위 PERIOD_LABEL_AVOID 처럼 페이즈 바탕 조각을 기다리지 않는다
 */
export const PERIOD_MARK_ANCHOR: Readonly<Record<number, Readonly<Record<string, 'right' | 'left' | 'above' | 'below'>>>> = {
  7: { 'emeria-the-sky-ruin': 'above' },
  8: { 'emeria-the-sky-ruin': 'above' },
}
