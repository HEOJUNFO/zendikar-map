// 페이즈 바탕 — tazeem. 모양·규칙은 ./types.ts
// 할리마르는 OGW 무렵(사가2 페이즈2) 코질렉이 바다 관문 방파제를 뚫어 물이 빠졌다 — BFZ 무렵(사가2 페이즈1)에는 물이 찼고, 2020년에는 다시 물이 있다.
// 오란리프는 BFZ 무렵 숲 사이로 엘드라지가 낸 백악 자국과 빈터가 생겼고, OGW 무렵 숲이 죽었다(바다 관문 둘레의 숲 짙은 언덕은 남았다).
// 장소 표시: 바다 관문은 OGW 무렵 폐허, 인어 Enclave 는 사가2 내내 폐허. 산호투구는 사가1 에도 표시한다 — Coralhelm 이라는 곳은 그 전부터 있었고(The Blight We Were Born For 의
// 20년 전 회상), 사가1 에 없던 것은 노얀 다르가 세운 피난처(소라 수도)뿐이라 지역 상세(halimar·coralhelm)가 그 무렵 그 그림만 지운다.
// 할리마르 이름은 글자 그대로 두고 물이 빠진 무렵에만 물빛 테두리를 뗀다(라벨 자리가 움직이지 않게).
// 사가4(2023): 침공 무렵(MOM, 단계 7)에는 에메리아 하늘거주지가 흰 금속으로 바뀌어 떠 있고 그 밑 땅이 흰 금속·붉은 힘줄로 바뀌며, Invasion Tree 가지가
// 하늘·바다의 차원문에서 나온다(하늘거주지 밑, 바다 관문 앞). 전쟁 뒤(MAT, 단계 8)에는 하늘거주지가 그 자리 바로 밑의 숲 없는 평평한 평원에 떨어져 있고
// 둘레는 눈 닿는 데까지 죽은 금속·힘줄·기름의 강이다 — 오란리프 숲 북서쪽 자락을 죽은 금속 평원(grounds 의 metal)으로 바꾸고 그 위에 선체와 힘줄·기름의 강을,
// 에메리아 표시는 폐허 기호로, 가지는 없다. 평원 말고는 한 점 기호(glyphs)로 그리고 자리·범위·모양은 이 지도의 추정이다. 바다 관문의 모습은 바꾸지 않는다.
import type { PeriodSet } from './types.ts'

const ART = 'The Art of Magic: The Gathering – Zendikar (2016)'
const DRAINED = `Magic Story: The Rise of Kozilek(2015-12-09): "the Halimar Sea, its water level held high above the ocean by Sea Gate itself, began to pour through the gap" — 코질렉이 방파제를 뚫자 대양보다 높이 붙들려 있던 할리마르 물이 그 틈으로 쏟아져 나갔다. ${ART}: "With the breaking of the dam, the inland sea had begun to drain, leaving waterlogged shores littered with coral-crusted ruins and the bones of ancient sea creatures" / "The draining seabed was transformed in their wake, corrupted by the two Eldrazi titans into a mixture of crumbling white rock and iridescent geometric shapes". Brink of Extinction(2016-02-10): "still water in the low-lying areas … floor of the newly drained basin". Zendikar's Last Stand(2016-02-17): "Kiora had emptied the entire Halimar Sea, and was holding it through the strength of her will. … Rescuers gathered around sinkholes or seawater-filled trenches." Zendikar Resurgent(2016-02-24): "the newly emptied Halimar Basin". Umara Entangler(OGW #65) 플레이버: "Sea Gate is gone, the Halimar basin empty." BFZ 무렵(사가2 페이즈1)에는 물이 찼다 — Promises to Keep(2015-12-02): "Waves surged and splashed over the seawall from the Halimar side", The Liberation of Sea Gate(2015-10-28): "The mighty dam itself had held". 2020년에는 다시 물이 있다(The Magosi Steps). 언제 다시 찼는지는 공식 자료에 없다.`
const SILENT_CRY = 'Magic Story: The Silent Cry(2015-08-26)'

// 사가4(2023) — 피렉시아 침공(MOM, 단계 7)과 그 뒤(MAT, 단계 8). 젠디카르의 지리를 말하는 2023년 글은 이 둘뿐이다
const BATTLES = 'Magic Story: Battles in the Field and in the Mind(2023-03-27)'
const BEYOND = 'Magic Story: Beyond Repair(2023-05-02)'
/** 하늘거주지가 떠 있던 자리와 떨어진 자리 — 이 지도가 고른 한 자리 (에메리아 표시 바로 남서쪽 — 2020년 지도의 오란리프 숲 북서쪽 자락) */
const EMERIA_2023: readonly [number, number] = [962, 664]
const EMERIA_2023_SPOT =
  '공식 자료는 하늘거주지가 에메리아(타짐 상공의 하늘 폐허)에 떠 있었다는 것만 밝히고 그 안의 자리는 밝히지 않는다. 이 지도는 에메리아 표시(하늘 폐허 한가운데로 고른 자리) 바로 남서쪽, 오란리프 숲 위에 두었다 — 표시와 그 이름을 가리지 않는 가장 가까운 자리다.'
/** 죽은 금속 평원의 힘줄·기름의 강 — 평원의 남동쪽 (선체와 Rugged Highlands 표시·이름을 가리지 않게) */
const EMERIA_2023_OIL: readonly [number, number] = [1004, 697]
/**
 * 죽은 금속 평원 (단계 8) — 떨어진 하늘거주지를 북쪽 가운데에 두고 2020년 지도의 오란리프 숲 북서쪽 자락을 덮는다. 북쪽은 에메리아 표시(967.4, 634.6)
 * 밑, 서쪽은 Timber Gorge 표시(924, 636) 동쪽, 동쪽은 할리마르 물가 벼랑(x 1019–1031)과 Halimar Depths 표시의 남쪽, 남서쪽은 간헐천(947, 709)과 그 김 기둥을
 * 비켜, 남쪽은 오란리프 이름 자리 위에서 그었다. 가장자리는 금속이 숲으로 혀처럼 번진 모양으로 들쭉날쭉하게
 */
const EMERIA_2023_PLAIN: readonly [number, number][] = [
  [938, 650], [945, 646.5], [951, 647.5], [956, 643.8], [963, 644.6], [970, 643.6], [977, 645.2], [984, 644.4], [991, 646.4], [998, 646], [1004, 649.5],
  [1009, 654.5], [1012, 660.5], [1017, 663.5], [1024, 664.5], [1030, 668.5], [1031, 675], [1026.5, 680], [1029, 687], [1026, 694], [1021.5, 699],
  [1022, 707], [1016, 713], [1009, 716.5], [1003, 722], [995, 724.5], [987, 721], [980, 724], [972, 721.5], [966, 715], [960, 707], [957, 700],
  [952, 693], [946, 688.5], [940, 685], [936, 679], [932, 673], [933.5, 665.5], [932.5, 658], [935, 653],
]
const BRANCHES = `${BATTLES}: "White, cracked, metallic, and massive, the branches burst from the portals opening in the sky, and in the sea." / "From each new branch, a wave of Phyrexian invaders spill onto the battlefield." — 바다 관문 앞 싸움터.`

export const period: PeriodSet = {
  grounds: [
    // 사가4 페이즈2(MAT) — 떨어진 에메리아 하늘거주지 둘레의 죽은 금속 평원
    {
      id: 'emeria-2023-plain',
      op: 'emeria-2023',
      levels: [8],
      kind: 'metal',
      clears: 'all',
      density: 1,
      label: '떨어진 하늘거주지 둘레의 죽은 금속 평원',
      location: 'emeria',
      alsoAt: ['oran-rief'],
      shapes: [{ ring: EMERIA_2023_PLAIN }],
      basis: `${BEYOND}: "Luckily, the Skyclave had crashed into a flat plain, so at least she wouldn't have to fight through tangled forests or thickets." / "Sinew and metal extended as far as she could see, warped and rent with rivers of oil. She saw all too plainly the brute force of Phyrexia at work, the blind bulldozing of native earth" — 떨어진 하늘거주지에서 나온 나히리가 본 둘레. ${BATTLES}: 침공 때 하늘거주지 밑의 땅이 흰 금속으로 바뀌었다("Below their feet, the land transforms into cracked white metal, broken by thick red sinew-like veins.", "Then to the dead landscape below. 'A few days ago, the land was green.'"). 땅이 되돌아왔다는 서술은 없다.`,
      estimate: '평원의 자리와 범위는 공식 자료에 없다 — 하늘거주지가 숲이나 덤불이 없는 평평한 평원에 떨어졌고, 그 둘레에 금속과 힘줄이 눈 닿는 데까지 이어졌다는 것뿐이다. 이 지도는 떨어진 하늘거주지(떠 있던 자리 바로 밑)를 북쪽 가운데에 두고, 2020년 지도의 오란리프 숲 북서쪽 자락을 동서 약 100·남북 약 80 단위의 숲 없는 죽은 금속 평원으로 바꿨다 — 침공 무렵 하늘거주지 밑에서 금속으로 바뀐 땅(사가4 페이즈1)이 그 뒤 이만큼 퍼져 있었다고 읽었다. 크기는 개관 가까이에서 트인 평원으로 읽히되 에메리아·Timber Gorge·Halimar Depths 표시와 그 이름, 할리마르 물가 벼랑, 간헐천, 오란리프 이름을 덮지 않을 만큼으로 골랐고, 가장자리는 금속이 숲으로 번져 든 모양으로 들쭉날쭉하게 그었다 — 실제로는 더 넓었을 수 있다. 안의 숲·산·늪 기호를 모두 걷고 금속판 이음매 무늬를 깔았으며, 칠의 빛과 이음매의 모양은 이 지도의 그림이다. 대지 Rugged Highlands 의 표시가 이 평원 안에 든다 — 그 그림이 하늘거주지 밑의 죽어 가는 땅이라는 읽기와 맞는다.',
    },
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
        // heart tree 빈터
        { ring: [[1078, 748], [1082, 745.5], [1088, 746], [1091, 750], [1090.5, 756], [1086, 759], [1080, 758.5], [1077.5, 754]] },
      ],
      basis: `${SILENT_CRY}: "There were three, just as Nissa had felt, and each was leaving a trail of corruption behind it as it moved. The trails ran like rivulets through the Vastwood. Two of the monstrosities were moving very close to each other, their destructive paths running in parallel." / "All that remained of the grove of ancient heart trees was a single pair. They stood, linked by their tether, in the middle of a chalky white clearing." Magic Story: For Zendikar(2015-08-12) — Vastwood 를 내려다보며: "she knew the chalky parts were there; they ran in rivulets through the land like dried out riverbeds." Nissa's Resolve(2015-10-07): "great swaths of chalky white corruption, dead trees … a falling continent, not a fallen one". BFZ 무렵 숲은 아직 서 있었다 — Slaughter at the Refuge(2015-08-19): "The curve of the land and the tangled trees of the Vastwood shielded Sea Gate from view.", Giant Mantis(BFZ #173) 플레이버: "Now I welcome the sight of mantises perched in the treetops."`,
      estimate: '자국과 빈터의 자리는 공식 자료에 없다. 나란히 기어간 두 엘드라지의 자국을 이 지도가 오란리프 숲 남동쪽에서 Desolation Twin 그림(1110,805)이 선 둔덕의 동쪽 가장자리까지 굽이치며 가늘어지는 두 띠로 그어 숲 안에서 끝냈고, 그림 안에서 쌍둥이의 발밑부터 둔덕을 나서는 두 자국과 그 가장자리에서 잇는다. 자국은 지나간 뒤에 남으므로 쌍둥이가 향하던 서쪽 마을(Natural Connection 그림, 1087,792) 쪽으로는 긋지 않았다. heart tree 빈터는 그 북서쪽 숲 속에 작게 골랐다. 셋째 엘드라지의 자국은 그리지 않았다.',
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
  glyphs: [
    // 사가4 — 차례가 그리는 차례다 (땅 → 하늘거주지 → 가지)
    {
      id: 'emeria-2023-ground',
      op: 'emeria-2023',
      levels: [7],
      kind: 'compleated-ground',
      at: EMERIA_2023,
      size: 1.15,
      label: '하늘거주지 밑에서 흰 금속으로 바뀌는 땅',
      location: 'emeria',
      basis: `${BATTLES}: "Below their feet, the land transforms into cracked white metal, broken by thick red sinew-like veins." / "Then to the dead landscape below. 'A few days ago, the land was green.'" — 에메리아 하늘거주지 밑으로 나아가는 군대의 발밑.`,
      estimate: `${EMERIA_2023_SPOT} 바뀐 땅의 범위는 공식 자료에 없어, 하늘거주지 바로 밑만 지름 32 단위 남짓으로 작게 그렸다. 금의 모양과 힘줄의 수는 이 지도의 선택이다.`,
    },
    {
      id: 'emeria-2023-ground-dead',
      op: 'emeria-2023',
      levels: [8],
      kind: 'compleated-ground-oil',
      at: EMERIA_2023_OIL,
      size: 1.6,
      label: '죽은 금속 평원의 힘줄과 기름의 강',
      location: 'emeria',
      basis: `${BEYOND}: "Sinew and metal extended as far as she could see, warped and rent with rivers of oil." — 금속은 죽어 있다("to reassure herself that the metal was, in fact, dead"). 땅이 되돌아왔다는 서술은 없다.`,
      estimate: '금속과 힘줄, 기름의 강이 어디로 났는지는 공식 자료에 없다. 이 지도는 죽은 금속 평원(같은 무렵의 땅 칠) 가운데, 평원 남동쪽(선체와 대지 Rugged Highlands 의 표시·이름을 가리지 않는 자리)에 붉은 힘줄 넷과 기름의 강 둘, 고인 기름 하나를 그렸다 — 그 자리·모양·수는 이 지도의 그림이다. 평원의 땅빛은 땅 칠이 맡아 이 기호에는 땅 칠과 가장자리가 없다.',
    },
    {
      id: 'emeria-2023-skyclave',
      op: 'emeria-2023',
      levels: [7],
      kind: 'compleated-skyclave',
      at: EMERIA_2023,
      label: '흰 금속으로 바뀐 에메리아 하늘거주지',
      location: 'emeria',
      basis: `${BATTLES}: "She's witnessed the Skyclave's broken stone mend and transform into white metal." / "There's oil now seeping from the cracks of the reforged stones." — 나히리가 다면체망을 잇는 자리로 고른 에메리아 하늘거주지. 이야기의 끝에야 떨어진다("The Emeria Skyclave is falling to the earth.").`,
      estimate: `${EMERIA_2023_SPOT} 하늘거주지의 모양(거꾸로 선 바위 밑동 위의 둥근 지붕과 탑 둘, 둘레의 헤드론)과 크기는 이 지도의 그림이다.`,
    },
    {
      id: 'emeria-2023-crash',
      op: 'emeria-2023',
      levels: [8],
      kind: 'crashed-skyclave',
      at: EMERIA_2023,
      label: '땅에 떨어진 에메리아 하늘거주지',
      location: 'emeria',
      basis: `${BATTLES}: "The Emeria Skyclave is falling to the earth." ${BEYOND}: "Luckily, the Skyclave had crashed into a flat plain" — 그래서 나히리는 엉킨 숲이나 덤불을 헤치지 않아도 되었다. 선체(hull)와 둥근 지붕(dome)이 남았고, 나히리가 그 지붕을 뚫고 밖으로 이어지는 거친 계단을 냈다.`,
      estimate: '떨어진 자리는 공식 자료에 없다 — 숲이나 덤불이 없는 평평한 평원이라는 것뿐이다. 이 지도는 떠 있던 자리 바로 밑에 두었다: 떨어졌다고만 하니 바로 밑이 가장 덜 꾸민 자리다. 그 땅은 2020년 지도에서는 오란리프 숲이지만 침공 무렵 하늘거주지 밑에서 흰 금속으로 바뀌어 "dead landscape"가 되었으므로(Battles in the Field and in the Mind), 이 무렵(사가4 페이즈2)에는 둘레를 숲 없는 죽은 금속 평원(같은 무렵의 땅 칠)으로 그리고 그 북쪽 가운데에 선체를 두었다. 선체의 기울기·방향·크기는 이 지도의 그림이다.',
    },
    {
      id: 'realmbreaker-2023-emeria',
      op: 'realmbreaker-2023',
      levels: [7],
      kind: 'realmbreaker-sky',
      at: [942, 676],
      label: '하늘거주지 밑의 Invasion Tree 가지',
      location: 'emeria',
      basis: `${BATTLES}: "With each change to the Skyclave above, more enemies arrive below. They burst through portals, the Invasion Tree's branches horrifically long and gargantuan" — 하늘거주지 밑의 땅.`,
      estimate: '가지의 수와 자리는 공식 자료에 없다. 읽히는 최소인 하나만, 하늘거주지 서남쪽 숲에 하늘의 차원문에서 내리꽂힌 모습으로 그렸다 — 하늘거주지와 에메리아 표시, Timber Gorge 를 가리지 않는 자리다. 크기는 이 지도의 그림이다.',
    },
    {
      id: 'realmbreaker-2023-sea-gate-sea',
      op: 'realmbreaker-2023',
      levels: [7],
      kind: 'realmbreaker-sea',
      at: [1158, 546],
      label: '바다 관문 앞바다의 Invasion Tree 가지',
      location: 'sea-gate',
      basis: BRANCHES,
      estimate: '가지의 수와 자리는 공식 자료에 없다 — 하늘과 바다의 차원문에서 나왔다는 것뿐이다. 이 지도는 바다 쪽 하나를 바다 관문 등대 동쪽 앞바다에, 하늘 쪽 하나를 관문 남쪽 어깨의 땅에 그렸다(둘 다 도시·등대·성문을 가리지 않는 자리). 바다 관문 자체의 모습은 바꾸지 않았다 — 공식 자료는 도시를 잃었다("The city is lost")고만 하고 무너졌다고 하지 않는다.',
    },
    {
      id: 'realmbreaker-2023-sea-gate-land',
      op: 'realmbreaker-2023',
      levels: [7],
      kind: 'realmbreaker-sky',
      at: [1160, 605],
      label: '바다 관문 남쪽 싸움터의 Invasion Tree 가지',
      location: 'sea-gate',
      basis: BRANCHES,
      estimate: '가지의 수와 자리는 공식 자료에 없다 — 하늘과 바다의 차원문에서 나왔다는 것뿐이다. 이 지도는 바다 쪽 하나를 바다 관문 등대 동쪽 앞바다에, 하늘 쪽 하나를 관문 남쪽 어깨의 땅에 그렸다(둘 다 도시·등대·성문을 가리지 않는 자리). 바다 관문 자체의 모습은 바꾸지 않았다 — 공식 자료는 도시를 잃었다("The city is lost")고만 하고 무너졌다고 하지 않는다.',
    },
  ],
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
    {
      id: 'mark-emeria-2023',
      op: 'emeria-2023',
      place: 'emeria',
      kind: 'ruin',
      levels: [8],
      basis: `${BATTLES}: "The Emeria Skyclave is falling to the earth." / 떠 있는 땅은 남는다("a ledge where the drifting ground is stable for the moment"). ${BEYOND}: 하늘거주지는 평평한 평원에 떨어져 있다.`,
      estimate: '에메리아 표시(Emeria, the Sky Ruin 카드 표시 — 하늘 폐허 한가운데)는 옮기지 않고 기호만 폐허로 바꿨다: 하늘거주지가 떨어져 그 자리 하늘에는 떠도는 잔해와 헤드론만 남았다고 읽었다. 이 지도의 다른 하늘거주지도 땅에 무너져 있던 무렵(사가1·2)에는 폐허 기호다. 침공 무렵(사가4 페이즈1)에는 하늘거주지가 아직 떠 있어 원래 기호 그대로 둔다.',
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
