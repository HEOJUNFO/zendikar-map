// 손으로 찍은 픽셀 그림 (그림별 다듬기 F14, docs/pixel-plan.md) — 규칙으로 굽은 그림이 그 단계에서 알아볼 수 없는 (카드 id, 단계)만.
// 몫 번호로 찍어 팔레트가 그대로 걸린다. 굽은 그림과 크기(가로·세로 픽셀)가 SLACK 안이어야 한다 — 그림 원본·크기가 바뀌어 굽은 크기가 달라지면 빌드가 멈춘다
// (그림 상자·이름 자리는 굽은 것을 따른다). 글자: . 빈 칸 · F 칠 · S 그늘 · T 돌 · K 먹 · h 굵은 먹 · Z 중간 톤 · y 물 먹 · A 작은 그림의 테

/** 글자 → 몫 번호 (figures.mjs 의 FIG_CLASSES 차례 + 1, 19 중간 톤, 22 작은 그림의 테) */
export const SPRITE_CLASS = { '.': 0, F: 1, S: 2, T: 3, K: 11, h: 12, y: 15, Z: 19, A: 22 }

export const FIGURE_SPRITES = {
  // u2 — 테 두른 덩이였다. 둥근 등, 네 다리, 오른쪽 아래로 내린 코
  terastodon: {
    2: [
      '..................',
      '.......AAAA.......',
      '.....AAKKKKAA.....',
      '....AKKFFFFKKA....',
      '...AKFFFFFFFFKA...',
      '..AKFFFFFFFFFFKA..',
      '..AKFFFFFFFFFFKA..',
      '..AKZZFFFFFFFZKKA.',
      '..AKSSSSSSSSZFFKKA',
      '..AKSKKSKKSKKFKKKA',
      '..AKSKAKSAKSKKKAKA',
      '..AKSKAKSAKSKAAAKA',
      '..AKKKAKKAKKAA..A.',
      '..AAAAAAAAAAA.....',
    ],
  },
  // u4 — 그루터기였다. 밝은 갓과 그 밑으로 늘어진 가는 촉수 여덟, 밑의 물결
  'emrakul-the-aeons-torn': {
    4: [
      '......................',
      '......................',
      '.......AAAAAAA........',
      '.....AAFFFFFFFAA......',
      '....AFFFFFFFFFFFA.....',
      '...AFFFFFFFFFFFFFA....',
      '...AFFFFFFFFFFFFFFA...',
      '..AZFFFFFFFFFFFFFFZA..',
      '..AZZZZZZZZZZZZZZZZA..',
      '..AKKKKKKKKKKKKKKKKA..',
      '..AK.K.K.K.K.K.K.KKA..',
      '..AK.K.K.K.K.K.K..KA..',
      '..AK.K.K..K.K.K.K.KA..',
      '..AK.K..K.K..K.K.K.A..',
      '...K.K..K.K..K.K.K....',
      '...K..K.K..K.K..K.K...',
      '...K..K..K.K.K..K.K...',
      '..K...K..K.K..K.K..K..',
      '..K..K...K..K.K..K.K..',
      '..K..K..K...K.K..K..K.',
      '...K.K..K..K..K..K..K.',
      '...K..K.K..K...K.K.K..',
      '....K.K..K.K...K..K...',
      '....K..K.K..K..K.K....',
      '..yyyyKyyKyyKyyKyyyy..',
      '....yyyyyyyyyyyyyy....',
      '......................',
    ],
  },
  // u1 — 비스듬한 먹선 하나라 '?' 로 읽혔다. 바위 턱 위에 선 사람과 위로 휘두른 채찍
  'gideon-jura': {
    1: [
      '...........',
      '.KK........',
      'K..K..KK...',
      'K...KKFFK..',
      '.K....KFK..',
      '......KFFK.',
      '.....KFFSK.',
      '.....KFFSK.',
      '.....KSKSK.',
      '.....KF.KK.',
      '.....KF..K.',
      '..KKKKKKKKK',
      '...........',
    ],
  },
  // u1 — 죽은 나무 같은 막대였다. 등뼈와 2 픽셀마다의 갈비, 오른쪽의 밝은 머리뼈
  'skeletal-wurm': {
    1: [
      '.......................',
      '.....F.F.F.F.F.F.F.....',
      '....KFKFKFKFKFKFKFKKKK.',
      '..KKKKKKKKKKKKKKKKKFFFK',
      '.K...F.F.F.F.F.F.F.KKK.',
      'K....K.K.K.K.K.K.K.....',
      '.......................',
      '.......................',
    ],
  },
  // u4 — 병으로 읽혔다. 둥근 머리에 눈 둘, 양옆으로 말린 촉수(바다 위라 밝은 칠에 그늘쪽 — 아래·오른쪽 — 만 먹 테), 밑의 물
  // (가독성 다듬기 R74: 촉수가 밝은 칠뿐이라 양피지의 옅은 바다와 1.27:1 이어서 머리만 남은 흰 유령·해파리로 읽혔다. 먹은 바다 위라 R59 의 슬레이트 먹이 된다)
  'lorthos-the-tidemaker': {
    4: [
      '.........................',
      '..........KKKKK..........',
      '........KKFFFFFKK........',
      '.......KFFFFFFFFFK.......',
      '.......KFFFFFFFFFK.......',
      '.......KFFKFFFKFFK.......',
      '........KFFFFFFFK........',
      '.FFFK....KFFFFFK.....FFFK',
      'FKKKFK...KFFFFFK....FKKKF',
      'FK.FK...KFKFKFKFK...KFK.F',
      'KFFK...KFKFFKFFKFK...KFFK',
      '.KK...FFK.FFKFFKKFFK..KK.',
      '.....FFK..FFKFFK.KFFK....',
      '....FFK...FFKFFK..KFFK...',
      '..FFFK...FFK.KFFK..KFFFK.',
      'yyyyyyyyyyyyyyyyyyyyyyyyy',
      '.yyy.yyy.yyy.yyy.yyy.yyy.',
      '.........................',
    ],
  },
}

/** 굽은 그림과 손 그림의 크기가 이만큼까지 다르면 가운데·밑에 맞춰 얹는다 — 같은 그림이 시점마다 다른 자리에 서면 격자에 걸치는 칸 수가 한 칸씩 다르다 */
const SLACK = 2

/** 그 (카드 id, 단계) 의 손 그림이 있으면 굽은 그림을 바꾼다 — 크기가 SLACK 넘게 다르면 멈춘다 */
export function applySprite(id, u, s) {
  const rows = FIGURE_SPRITES[id]?.[u]
  if (!rows) return s
  const w = rows[0].length
  const h = rows.length
  if (rows.some((r) => r.length !== w)) throw new Error(`pixel figures: ${id} 의 u${u} 손 그림의 줄 길이가 다르다`)
  if (Math.abs(w - s.w) > SLACK || Math.abs(h - s.h) > SLACK)
    throw new Error(`pixel figures: ${id} 의 u${u} 손 그림은 ${w}×${h} 인데 굽은 그림은 ${s.w}×${s.h} — 그림 원본이나 크기가 바뀌었으니 다시 찍는다 (scripts/pixel/figureSprites.mjs)`)
  const ox = Math.floor((s.w - w) / 2)
  const oy = s.h - h
  const idx = new Uint8Array(s.w * s.h)
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const v = SPRITE_CLASS[ch]
      if (v === undefined) throw new Error(`pixel figures: ${id} 의 u${u} 손 그림에 모르는 글자 '${ch}'`)
      const X = x + ox
      const Y = y + oy
      if (X >= 0 && Y >= 0 && X < s.w && Y < s.h) idx[Y * s.w + X] = v
    }),
  )
  return { ...s, idx }
}
