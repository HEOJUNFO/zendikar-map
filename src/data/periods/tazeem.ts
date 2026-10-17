// 페이즈 바탕 — tazeem. 모양·규칙은 ./types.ts
// 할리마르는 OGW 무렵(사가2 페이즈2) 코질렉이 바다 관문 방파제를 뚫어 물이 빠졌다 — BFZ 무렵(사가2 페이즈1)에는 물이 찼고, 2020년에는 다시 물이 있다.
// 오란리프는 BFZ 무렵 숲 사이로 엘드라지가 낸 백악 자국과 빈터가 생겼고, OGW 무렵 숲이 죽었다(바다 관문 둘레의 숲 짙은 언덕은 남았다).
// 장소 표시: 바다 관문은 OGW 무렵 폐허, 인어 Enclave 는 사가2 내내 폐허. 산호투구는 사가1 에도 표시한다 — Coralhelm 이라는 곳은 그 전부터 있었고(The Blight We Were Born For 의
// 20년 전 회상), 사가1 에 없던 것은 노얀 다르가 세운 피난처(소라 수도)뿐이라 지역 상세(halimar·coralhelm)가 그 무렵 그 그림만 지운다.
// 할리마르 이름은 글자 그대로 두고 물이 빠진 무렵에만 물빛 테두리를 뗀다(라벨 자리가 움직이지 않게).
import type { PeriodSet } from './types.ts'

const ART = 'The Art of Magic: The Gathering – Zendikar (2016)'
const DRAINED = `Magic Story: The Rise of Kozilek(2015-12-09): "the Halimar Sea, its water level held high above the ocean by Sea Gate itself, began to pour through the gap" — 코질렉이 방파제를 뚫자 대양보다 높이 붙들려 있던 할리마르 물이 그 틈으로 쏟아져 나갔다. ${ART}: "With the breaking of the dam, the inland sea had begun to drain, leaving waterlogged shores littered with coral-crusted ruins and the bones of ancient sea creatures" / "The draining seabed was transformed in their wake, corrupted by the two Eldrazi titans into a mixture of crumbling white rock and iridescent geometric shapes". Brink of Extinction(2016-02-10): "still water in the low-lying areas … floor of the newly drained basin". Zendikar's Last Stand(2016-02-17): "Kiora had emptied the entire Halimar Sea, and was holding it through the strength of her will. … Rescuers gathered around sinkholes or seawater-filled trenches." Zendikar Resurgent(2016-02-24): "the newly emptied Halimar Basin". Umara Entangler(OGW #65) 플레이버: "Sea Gate is gone, the Halimar basin empty." BFZ 무렵(사가2 페이즈1)에는 물이 찼다 — Promises to Keep(2015-12-02): "Waves surged and splashed over the seawall from the Halimar side", The Liberation of Sea Gate(2015-10-28): "The mighty dam itself had held". 2020년에는 다시 물이 있다(The Magosi Steps). 언제 다시 찼는지는 공식 자료에 없다.`
const SILENT_CRY = 'Magic Story: The Silent Cry(2015-08-26)'

export const period: PeriodSet = {
  grounds: [
    {
      id: 'oran-rief-l5-dead',
      op: 'oran-rief-dead',
      levels: [5],
      kind: 'deadwood',
      clears: ['tree', 'mangrove'],
      label: '죽은 오란리프',
      location: 'oran-rief',
      shapes: [{ forest: 1, expect: 'tazeem' }, { place: 'oran-rief' }, { area: 'umara-skyfalls-jungle' }],
      // 남는 숲 — 해안 낮은 언덕 띠(바탕 bulwark-low-near-sea-gate-south)의 안쪽 기슭을 따라 남동쪽으로 길게 뻗은 한 자락.
      // 북쪽 변(1101,712 – 1180,694)은 할리마르·바다 관문 지역 상세의 남쪽 변(y 682.6)에 걸쳐 그 그림의 숲 칸과 맞춘 자리라 그대로 둔다
      minus: [
        {
          ring: [
            [1104, 690], [1120, 682], [1140, 678], [1152, 676], [1168, 684], [1180, 694], [1188, 699], [1195, 707], [1201, 713], [1207, 721], [1206, 728],
            [1200, 731], [1193, 728], [1185, 726], [1178, 729], [1172, 730], [1167, 721], [1160, 731], [1153, 738], [1146, 737], [1140, 733], [1134, 734],
            [1126, 733], [1119, 728], [1113, 724], [1108, 718], [1101, 712],
          ],
        },
      ],
      basis: `My Favorite Flavor: Ruins of Oran-Rief(Chas Andres, 2015-12-29, OGW 카드를 소개하는 공식 칼럼): "Oran-Rief is dead now. The trees are gone. The creatures are gone. The rocks are brittle and chalky. The Eldrazi sucked the land dry." — OGW 무렵 오란리프 숲은 죽었다(OGW 대지 카드 Ruins of Oran-Rief). 같은 무렵 바다 관문 둘레에는 숲 짙은 언덕이 남았다 — The Blight We Were Born For(2016-01-13): "Tazri aimed them toward the cover of thick-wooded hills inland, to regroup and plan." 2020년에 얼마나 되살아났는지는 서술이 없다.`,
      estimate: '칼럼은 죽은 숲의 범위를 나누지 않아 팬 지도 숲, 장소 오란리프의 범위, 하늘폭포 아래 정글(Umara Skyfalls, ZNR #86 "The source of the Umara River sits high above Oran-Rief, ever weeping on the jungle below")을 모두 넣었다. 바다 관문 밖 "숲 짙은 내륙 언덕"으로 해안 낮은 언덕 띠의 안쪽 기슭을 따라 남동쪽으로 길게 뻗은 한 자락을 남겼다(자락의 모양은 이 지도의 선택). 뺀 나무 가운데 넷에 하나를 죽은 나무로 남긴 것도 이 지도의 선택이다. 장소 범위는 그 안의 나무를 죽은 나무로 바꾸는 데만 쓰고, 죽은 숲의 옅은 덧칠은 숲(팬 지도 숲과 하늘폭포 아래 정글)에만 둔다 — 숲이 아니던 둘레 땅까지 칠하지 않는다. 산·언덕·강·절벽은 그대로 둔다(OGW 대지 Meandering River 가 할리마르로 흘러드는 여러 갈래 강을 말한다).',
    },
    {
      id: 'oran-rief-l4-trails',
      op: 'oran-rief-dead',
      levels: [4],
      kind: 'chalk',
      clears: 'all',
      label: '숲을 가로지른 백악 자국',
      location: 'oran-rief',
      shapes: [
        // 나란히 기어간 두 자국 — 동쪽 숲에서 실개천처럼 굽이쳐 와, 쌍둥이(Desolation Twin 그림)가 선 둔덕의 동쪽 가장자리에서
        // 그 그림 안의 두 자국(발밑에서 동북동쪽으로 둔덕을 나서는 자리 — 세계 좌표 약 1126.3, 794.5 / 1126.7, 796.2)과 이어진다 (북쪽, 남쪽).
        // 띠 끝은 둔덕 가장자리 조금 안쪽(그림 밑)에서 끝난다. 첫 점(시드)은 그대로다.
        // 자국은 지나간 뒤에 남으므로 쌍둥이가 향하던 서쪽 마을(Natural Connection 그림) 쪽으로는 긋지 않는다
        { band: [[1149.3, 814.3], [1145.4, 813.3], [1141.1, 813.1], [1139.4, 809.6], [1138.3, 805.8], [1136.8, 801.9], [1134.4, 798.4], [1131.2, 795.9], [1127.9, 794.6], [1125.4, 794.6]], width: 1.6 },
        { band: [[1150.5, 818.9], [1146.9, 817.3], [1143.1, 816.2], [1138.9, 816.2], [1136.2, 813], [1134.8, 809.2], [1133.7, 805.2], [1132.1, 801.6], [1129.8, 798.4], [1127.4, 796.6], [1125.4, 796.1]], width: 1.6 },
        // 심장나무 빈터
        { ring: [[1078, 748], [1082, 745.5], [1088, 746], [1091, 750], [1090.5, 756], [1086, 759], [1080, 758.5], [1077.5, 754]] },
      ],
      basis: `${SILENT_CRY}: "There were three, just as Nissa had felt, and each was leaving a trail of corruption behind it as it moved. The trails ran like rivulets through the Vastwood. Two of the monstrosities were moving very close to each other, their destructive paths running in parallel." / "All that remained of the grove of ancient heart trees was a single pair. They stood, linked by their tether, in the middle of a chalky white clearing." Magic Story: For Zendikar(2015-08-12) — Vastwood 를 내려다보며: "she knew the chalky parts were there; they ran in rivulets through the land like dried out riverbeds." Nissa's Resolve(2015-10-07): "great swaths of chalky white corruption, dead trees … a falling continent, not a fallen one". BFZ 무렵 숲은 아직 서 있었다 — Slaughter at the Refuge(2015-08-19): "The curve of the land and the tangled trees of the Vastwood shielded Sea Gate from view.", Giant Mantis(BFZ #173) 플레이버: "Now I welcome the sight of mantises perched in the treetops."`,
      estimate: '자국과 빈터의 자리는 공식 자료에 없다. 나란히 기어간 두 엘드라지의 자국을 이 지도가 오란리프 숲 남동쪽에서 Desolation Twin 그림(1110,805)이 선 둔덕의 동쪽 가장자리까지 굽이치며 가늘어지는 두 띠로 그어 숲 안에서 끝냈고, 그림 안에서 쌍둥이의 발밑부터 둔덕을 나서는 두 자국과 그 가장자리에서 잇는다. 자국은 지나간 뒤에 남으므로 쌍둥이가 향하던 서쪽 마을(Natural Connection 그림, 1087,792) 쪽으로는 긋지 않았다. 심장나무 빈터는 그 북서쪽 숲 속에 작게 골랐다. 셋째 엘드라지의 자국은 그리지 않았다.',
    },
  ],
  reliefs: [],
  drains: [
    {
      id: 'halimar-drained',
      op: 'halimar-drained',
      levels: [5],
      label: '물이 빠진 할리마르 유역',
      location: 'halimar',
      water: 'halimar',
      density: 1,
      craze: 0.25,
      dryMouths: ['umara-river', 'halimar-west-river', 'halimar-south-river'],
      pools: [
        // A — Grip of the Roil(물기둥) 밑. 그 그림이 발치에 그린 물 타원·물결이 다듬은 고리 안 2 단위 넘게 들도록 남쪽 가장자리를 조금 내렸다
        [[1067, 566], [1071, 560], [1079, 557.5], [1088, 558.5], [1094, 562], [1095, 568], [1091, 575], [1081, 578.5], [1071.5, 577], [1066.5, 572]],
        // B — 서쪽 가운데
        [[1038, 603], [1041, 598.5], [1048, 597.5], [1054, 600], [1055, 605], [1050, 609], [1042, 609]],
      ],
      basis: DRAINED,
      estimate: '언제부터 비었는지를 공식 자료가 나누지 않아 OGW 무렵(사가2 페이즈2) 하나로 그렸다. 바닥은 옛 물가 고리 그대로다. 남은 물의 자리(물기둥을 그린 Grip of the Roil 밑과 서쪽 가운데의 작은 웅덩이)와 바닥 무늬의 넷에 하나를 기하 무늬로 섞은 것은 이 지도의 선택이다. 물이 빠진 물가에 산호 덮인 폐허가 드러났다는 것은 아트북 원문("littered with coral-crusted ruins")이고, 그 폐허로 지역 상세가 Ula Temple·Eldrazi Temple·Halimar Depths 를 물 밖에 드러낸 모습으로 그린 것과 그 모습은 이 지도의 해석이다. 할리마르로 드는 세 강은 옛 물가에서 끝난다 — 아트북은 "The Umara streams and pools of water turned to dust." 라고 쓰지만 범위가 없어 물길은 그대로 둔다.',
    },
  ],
  rivers: [],
  glyphs: [],
  hides: [],
  marks: [
    {
      id: 'mark-sea-gate',
      op: 'sea-gate-world-marker',
      place: 'sea-gate',
      kind: 'ruin',
      levels: [5],
      basis: 'Umara Entangler(OGW #65) 플레이버: "Sea Gate is gone, the Halimar basin empty." Tears of Valakut(OGW #118) 플레이버: "When Kozilek destroyed Sea Gate, distant Valakut could not contain its grief." Magic Story: Zendikar Resurgent(2016-02-24): "a crumbling stump of its former self—a rotted tooth in the mouth of the bay." Zendikar: Things Have Changed(2020): "In the battle against the Eldrazi, the shining city of Sea Gate was completely annihilated. … Within a year, the city was restored." — OGW 무렵 코질렉이 방파제를 뚫고 등대를 쓰러뜨려 도시가 무너졌다(OGW 대지 카드 Sea Gate Wreckage). BFZ 무렵(사가2 페이즈1)에는 시가지가 폐허였지만 댐·등대·대양 쪽 흉벽이 서 있었고 연합군이 되찾아 거점으로 썼다(The Liberation of Sea Gate "The city was in ruins. … The mighty dam itself had held") — 그래서 그때는 정착지 표시를 그대로 둔다.',
    },
    {
      id: 'mark-merfolk-enclave',
      op: 'merfolk-enclave-marker',
      place: 'merfolk-enclave',
      kind: 'ruin',
      levels: [4, 5],
      basis: `${ART}: "When Sea Gate and the merfolk Enclave fell to the Eldrazi spawn, he found himself thrust into a position of leadership"(노얀 다르 항목) / "overrun by the Eldrazi, and its graceful dome and buttressed walls lie in ruin." — 바다 관문과 함께 엘드라지에게 함락되어 돔과 버팀벽이 무너졌다. 2020년 이후의 모습은 서술이 없다.`,
    },
  ],
  labels: [
    {
      id: 'label-halimar-dry',
      op: 'halimar-drained',
      place: 'halimar',
      dry: true,
      levels: [5],
      basis: DRAINED,
    },
  ],
}
