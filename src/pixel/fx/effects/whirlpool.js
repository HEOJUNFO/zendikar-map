// 픽셀 지도(/pixel, S5) 효과 — 소용돌이: 좌르 섬을 에워싼 해류('jwar-currents-n|e|s|w', 바다 표시 kind whirl — src/data/landscape/ondu.ts)의
// 1x 소용돌이 그림(열린 바다 위 거품 나선)을 움직인다.
// Based on pixelfx (MIT, a841596) water/whirlpool (foam drawn in along a spiral, faster toward a dark eye, flecks of foam circling in)
// and water/ripples (breaks travelling along a line of foam), redone as hand-keyed cells on the map's 16-bit palette with no light
// buffer (glow would add off-palette colors). No code here is copied from Sprite Fusion files (water/whirlpool's
// black-hole streak texture is not used — at 8x6 the arm is the sprite's own pixels).
//
// 움직임: 거품 나선(그림의 팔)은 제자리에 두고, 팔의 끊김이 1초마다 하나씩 바깥 끝(동쪽)에서 시계 반대 방향으로 팔을 따라 들어간다 —
// 테두리에서는 두 칸 폭으로 천천히, 눈 둘레 갈고리에서는 한 칸 폭으로 빨라져 2초에 걸쳐 눈 속으로 가라앉는다(갈고리의 끊김은 어둠 — 눈이 한순간 커진다).
// 눈 두 칸(그림 (3,3)·(4,3) — 그림에서는 바다였다)은 늘 어둡다. 고리마다 한 번(3–16 장) 거품 한 점이 테두리의 틈으로 들어와
// 감긴 팔 사이의 어두운 물길을 따라 시계 반대 방향으로 빨라지며 돌아 눈에 빠진다. 프레임은 그림 상자 8×6 위아래에 빈 줄 하나씩(8×8 — pixelfx 의 최소 크기).
// 그림의 거품 칸 가운데 이 장에 끊긴 칸은 바다색(o.sea, 기본 deep — 해류 넷은 모두 해안에서 7 단위 넘게 떨어져 deep 띠다)으로 덮는다(타일에 구운 그림이 비치지 않게).
import { hex } from "../../vendor/pixelfx/index.js";

const FPS = 12, D = 2, N = D * FPS; // 24 frames

/** The static map sprite this animates (terrainSprites.ts SEA_SPRITES.whirl), anchor at column 3, row 2. */
export const SPRITE = { rows: ["..ffff..", ".f....f.", "f..ff..f", "f.f..f..", ".f..f...", "..ff...."], ax: 3, ay: 2 };

export const meta = {
  name: "Whirlpool (map)",
  desc: "A tiny sea vortex seen from above: breaks in the foam spiral run counter-clockwise down it, speeding up into a dark eye, and a fleck of foam circles in between the windings.",
  tags: ["water", "whirlpool", "map", "loop", "ambient"],
  basedOn: "water/whirlpool, water/ripples",
  // a transparent row above and below the 8x6 sprite (pixelfx frames are at least 8 px each way)
  size: [8, 8],
  origin: [3, 3],
  duration: D,
  fps: FPS,
  loop: true,
  options: {
    colors: {
      ink: "#3b2f22", rockLight: "#e3d6b8", rock: "#a8987a", rockShade: "#6f604b", snow: "#f6f7f2", snowShade: "#b4c4cf",
      lava: "#e2572a", lavaHot: "#ffcc4a", ember: "#7a2a1a", lavaCrust: "#5b3a30", water: "#4f8fa6", foam: "#cfe8e2",
      steam: "#f2f1ea", smoke: "#8c8781", void: "#1a1410", land: "#cdb98a", landShade: "#b8a372", shallow: "#4f8fa6",
      mid: "#336a88", deep: "#29506d", seaFoam: "#b9dcd6", ice: "#e8f3f5", iceShade: "#a6c3cf",
    },
    seed: 1,
    // the color key of the sea under the sprite: static foam the break has left is painted back in it
    sea: null,
    // the color key of the eye
    eye: "void",
    // false: no fleck circling in
    fleck: true,
  },
};

// the sprite's arm, in sprite cells from the outer tip (east) counter-clockwise round the rim and in round the eye
const ARM = [[7, 2], [6, 1], [5, 0], [4, 0], [3, 0], [2, 0], [1, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 5], [4, 4], [5, 3], [4, 2], [3, 2], [2, 3]];
const HOOK = 14; // from here on the arm curls round the eye: a break there sinks into the dark
// the dark water between the windings, from the rim's gap counter-clockwise in to the eye: the fleck rides it
const CHANNEL = [[7, 3], [6, 3], [6, 2], [5, 1], [4, 1], [3, 1], [2, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 3]];
const EYE = [[3, 3], [4, 3]];
// a break sets off down the arm every second and takes the whole loop to sink (eased: slow on the rim, fast round the eye)
const BREAK = { every: N / 2, frames: N, ease: 1.6, from: -2, span: 22, wide: 12 };
// the fleck: the frame it comes in through the rim's gap, the frames it takes to reach the eye
const FLECK = { at: 3, frames: 14, ease: 1.25 };

const mod = (a, n) => ((a % n) + n) % n;

export function draw(p, t, o) {
  const colors = o.colors ?? meta.options.colors, C = {};
  for (const k in colors) C[k] = hex(colors[k]);
  const f = mod(Math.floor(t * FPS + 1e-6), N);
  const put = ([c, r], k) => p.px(c - SPRITE.ax, r - SPRITE.ay, C[k]);
  const broken = new Set();
  for (let b = 0; b < N / BREAK.every; b++) {
    const age = mod(f - b * BREAK.every, N);
    if (age >= BREAK.frames) continue;
    // it starts short of the tip and ends past the eye (both off the arm), so it slides on and off
    const i = Math.floor(BREAK.from + BREAK.span * Math.pow(age / BREAK.frames, BREAK.ease));
    broken.add(i);
    if (i < BREAK.wide) broken.add(i - 1); // two cells wide on the slow rim
  }
  // 틈은 비워 둔다 — 효과 밑에 타일이 기호를 찍기 전의 바다를 깐다(fx/layer.ts) (zendikar-map: 정한 바다 빛으로 칠하면 얕은 물에서 어두운 네모가 지나갔다, S5 검토).
  // o.sea 를 주면 예전처럼 그 빛으로 (pixelfx 작업대에서 볼 때)
  ARM.forEach((cell, i) => {
    if (!broken.has(i)) put(cell, "foam");
    else if (i >= HOOK) put(cell, o.eye ?? "void");
    else if (o.sea) put(cell, o.sea);
  });
  for (const cell of EYE) put(cell, o.eye ?? "void");
  if (o.fleck === false) return;
  const age = mod(f - FLECK.at, N);
  if (age < FLECK.frames) {
    const i = Math.floor(CHANNEL.length * Math.pow(age / FLECK.frames, FLECK.ease));
    // its last cell is the eye's lip: a dimmer gleam as it goes down
    put(CHANNEL[i], i === CHANNEL.length - 1 ? "seaFoam" : "foam");
  }
}
