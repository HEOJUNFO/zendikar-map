// 픽셀 지도(/pixel, S5) 효과 — 간헐천: 아쿰·굴 드라즈·온두·타짐의 한 점 기호 'geyser'(10곳)에 구운 1x 그림을 움직인다.
// Based on pixelfx (MIT, a841596) water/geyser (the pool heaving faster before it blows, the column with a foam head
// raining back in droplets that fleck where they land, the steam left hanging) and water/fountain (beads arcing out and
// falling back), with the steam puffs read off core/sim.js VAPOUR (swell, thin, drift) — all redone by hand as a keyed
// 36-frame loop on the map's 16-bit palette with no light buffer (glow would add off-palette colors). No code here is
// copied from the Sprite Fusion-derived parts of those files (water/geyser's column and slam follow holy-light), so no
// Sprite Fusion credit line is carried.
//
// 움직임 (3초, 36 장): 0–11 장은 고요 — 웅덩이 물빛이 3 장마다 가운데 거품 → 둘레 → 앞 기슭으로 번지고, 김 줄기 윗줄이
// 깜박이며 김 덩이가 줄기에서 떨어져(한 점 → 2×2 → 갈라짐 → 옅은 한 점) 빨리 오르다 느려지고 바람에 밀려 사라진다
// (그림 위로 6 픽셀까지). 12–17 장은 웅덩이가 거품으로 끓고 15 장에 한 번 짧게 뿜는다. 18–22 장에 물기둥이 3 장 만에
// 그림 위 끝까지 솟아(밝은 왼쪽 김빛, 그늘진 오른쪽 거품빛에 물줄이 위로 흐른다) 거품 머리가 우산처럼 처지고 둘레로
// 넘친다. 22 장부터 머리가 찢겨 물방울 여섯이 바깥으로 떨어져 땅에 거품 점을 남기고(웅덩이에 든 것은 물결), 기둥은
// 3 장에 걸쳐 내려앉으며 머리의 김은 구름으로 남아 떠오르다 옅어진다. 28 장부터 다시 고요.
//
// 덧그리기: 웅덩이 윤곽(ink)과 줄기 밑줄(y = -3, 작은 것은 -2)은 늘 바탕 그림과 같다. 바탕 그림의 김 픽셀 가운데
// 어떤 장에서는 비는 것을 meta.erase 에 적었다 — 런타임이 구운 기호 위에 그냥 겹치면 그 자리에 바탕의 김이 남는다.
import { hex } from "../../vendor/pixelfx/index.js";

const COLORS = {
  ink: "#3b2f22", rockLight: "#e3d6b8", rock: "#a8987a", rockShade: "#6f604b", snow: "#f6f7f2", snowShade: "#b4c4cf",
  lava: "#e2572a", lavaHot: "#ffcc4a", ember: "#7a2a1a", lavaCrust: "#5b3a30", water: "#4f8fa6", foam: "#cfe8e2",
  steam: "#f2f1ea", smoke: "#8c8781", void: "#1a1410", land: "#cdb98a", landShade: "#b8a372", shallow: "#4f8fa6",
  mid: "#336a88", deep: "#29506d", seaFoam: "#b9dcd6", ice: "#e8f3f5", iceShade: "#a6c3cf",
};
const INK = { k: "ink", R: "rockLight", r: "rock", d: "rockShade", w: "snow", W: "snowShade", l: "lava", L: "lavaHot", e: "ember", b: "water", f: "foam", y: "steam", o: "smoke", K: "void", i: "ice", I: "iceShade", "%": "ink" };

const D = 3, FPS = 12, N = D * FPS;

// Per-variant geometry, in local pixels: (0, 0) is the anchor pixel (bottom middle of the vent).
// Times are frame numbers in the 36-frame loop: calm 0..11, the pool churns 12..17, it blows 18..22, rains 22..30.
const V = {
  normal: {
    sprite: { rows: ["..y.y...", "...yy...", "..yy.y..", "...yy...", "...yy...", "..fbbf..", ".kbbbbk.", "..kkkk.."], ax: 3, ay: 7 },
    size: [10, 14], origin: [4, 13],
    pool: [-2, -1], poolX: -1, poolW: 4, // water rows (y) and their x span
    calm: [["fbbf", "bbbb"], ["bffb", "bbbb"], ["fbbf", "bbbb"], ["bbbb", "fbbf"]],
    churn: [["ffff", "bffb"], ["fbbf", "ffff"]],
    stem: -3, top2: -4, // the stem: a full row, and a row above it that flickers as the steam pulls away
    // puffs: [birth frame, x, wind]; big puffs are 2x2, the eruption's cloud bigger again
    puffs: [[2, 0, 1], [8, 1, 0], [27, 0, 1], [32, 1, -1]], y0: -5, rise: 8, life: 16,
    cloud: [22, 0, -11, 2, 13, 1],
    // the column's top per frame (a burp at 15), and its width rows: top rows are 1 px, then 2 px
    tops: { 15: -5, 18: -7, 19: -11, 20: -13, 21: -13, 22: -12, 23: -9, 24: -6 },
    // droplets thrown off the head at frame 22: [x, y, vx, vy] in px and px per frame
    drops: [[-1, -12, -0.4, -0.3], [2, -12, 0.42, -0.2], [-2, -11, -0.25, 0], [3, -11, 0.3, 0.1], [0, -13, -0.12, -0.4], [1, -12, 0.15, -0.5]],
    land: { min: -1, max: 2, poolY: -1, groundY: 0 }, g: 0.62,
  },
  small: {
    sprite: { rows: [".y..", "..y.", ".yy.", "kbbk", ".kk."], ax: 1, ay: 4 },
    size: [8, 9], origin: [3, 8],
    pool: [-1], poolX: 0, poolW: 2,
    calm: [["bb"], ["fb"], ["bb"], ["bf"]],
    churn: [["ff"], ["bf"]],
    stem: -2, top2: null,
    puffs: [[2, 0, 1], [9, 1, 0], [27, 1, 0], [33, 0, 1]], y0: -3, rise: 5, life: 14, small: true,
    cloud: [22, 0, -7, 1, 10, 0],
    tops: { 15: -3, 18: -4, 19: -6, 20: -8, 21: -8, 22: -7, 23: -5, 24: -3 },
    drops: [[0, -8, -0.3, -0.2], [1, -8, 0.3, -0.3], [1, -6, 0.45, 0]],
    land: { min: 0, max: 1, poolY: -1, groundY: 0 }, g: 0.55,
  },
};

export const meta = {
  name: "Geyser",
  desc: "A tiny steam vent: the pool ripples, puffs leave the stem, rise, drift and thin out, and once a loop a column blasts up, droops a foam head and rains back down in droplets.",
  tags: ["water", "geyser", "steam", "map", "loop", "ambient"],
  basedOn: "water/geyser, water/fountain, core/sim VAPOUR",
  size: V.normal.size,
  origin: V.normal.origin,
  duration: D,
  fps: FPS,
  loop: true,
  options: {
    erupt: null, colors: COLORS, seed: 1, variant: "normal" },
  // small: the sprite drawn for a geyser whose data size is below 0.6
  variants: { small: { size: V.small.size, origin: V.small.origin } },
  // static-sprite pixels (local coords) that some frames leave empty: the steam the animation moves
  erase: {
    normal: [[-1, -7], [1, -7], [0, -6], [1, -6], [-1, -5], [0, -5], [2, -5], [0, -4], [1, -4]],
    small: [[0, -4], [1, -3]],
  },
};

/** { meta, draw } for one variant ("normal" | "small"): its own size, origin and options.variant. */
export function variant(name) {
  const g = V[name] ?? V.normal;
  return {
    meta: { ...meta, size: g.size, origin: g.origin, options: { ...meta.options, variant: V[name] ? name : "normal" } },
    draw: (p, t, o) => draw(p, t, { ...o, variant: V[name] ? name : "normal" }),
  };
}

// a puff u (0..1) through its life at (x, y): a bead leaving the stem, swelling into a lit 2x2, splitting, thinning
function puff(put, x, y, u, kind) {
  if (kind === "dot") return put(x, y, u < 0.65 ? "y" : "W");
  if (kind === "cloud") {
    if (u < 0.3) { put(x - 1, y, "y"); put(x, y, "y"); put(x + 1, y, "y"); put(x, y + 1, "y"); put(x + 1, y + 1, "W"); put(x - 1, y + 1, "W"); return; }
    if (u < 0.55) { put(x, y, "y"); put(x + 1, y, "y"); put(x, y - 1, "y"); put(x + 1, y - 1, "W"); put(x - 1, y + 1, "W"); return; }
  }
  if (u < 0.2) put(x, y, "y");
  else if (u < 0.55) { put(x, y, "y"); put(x + 1, y, "y"); put(x, y + 1, "y"); put(x + 1, y + 1, "W"); }
  else if (u < 0.8) { put(x, y, "y"); put(x + 2, y + 1, "W"); }
  else put(x + 1, y, "W");
}

export function draw(p, t, o) {
  const G = V[o.variant] ?? V.normal, C = {}, cols = o.colors ?? COLORS;
  for (const k in INK) C[k] = hex(cols[INK[k]]);
  const f = ((Math.floor(t * FPS + 1e-6) % N) + N) % N;
  const put = (x, y, k) => p.px(x, y, C[k]);
  // 솟구침 — 데이터가 솟구친다고 한 곳만 (zendikar-map, docs/pixel-plan.md S5 검토): o.erupt 'water'(끓는 물 — 타짐의 간헐천 동굴), 'magma'(마그마 — 아쿰의 마그마 간헐천),
  // 없으면 김만 (가스 분출구·지열 늪의 김·김 나는 조수 웅덩이). 마그마는 기둥·물방울을 용암 빛으로, 머리의 구름을 연기 빛으로 바꾼다
  const erupt = o.erupt === "water" || o.erupt === "magma" ? o.erupt : null;
  const CE = erupt === "magma" ? { ...C, y: C.L, f: C.l, b: C.e, W: C.o } : C;
  const putE = (x, y, k) => p.px(x, y, CE[k]);
  const putCloud = erupt === "magma" ? (x, y, k) => p.px(x, y, k === "y" ? C.o : C.d) : put;

  // 1. Puffs behind everything: they leave the stem fast and slow down as they rise, drift with the wind and thin out
  for (const [b, x0, wind] of G.puffs) {
    const a = (f - b + N) % N;
    if (a >= G.life) continue;
    const u = a / G.life, y = G.y0 - Math.round(G.rise * (1 - (1 - u) * (1 - u)));
    puff(put, x0 + Math.round(wind * u * u * 1.6), y, u, G.small ? "dot" : "big");
  }
  // the eruption's cloud: the head of the column left hanging, swelling, drifting off and thinning
  if (erupt) {
    const [b, x0, y0, rise, life, wind] = G.cloud, a = (f - b + N) % N;
    if (a < life) {
      const u = a / life, y = y0 - Math.round(rise * u);
      if (G.small) { if (u < 0.4) { putCloud(x0, y, "y"); putCloud(x0 + 1, y, "y"); } else puff(putCloud, x0 + Math.round(u), y, u, "dot"); }
      else puff(putCloud, x0 + Math.round(wind * u * 1.5), y, u, "cloud");
    }
  }

  // 2. The stem leaving the pool; its top row flickers as steam pulls away
  const top = erupt ? G.tops[f] : undefined;
  put(0, G.stem, "y"); put(1, G.stem, "y");
  if (G.top2 !== null && top === undefined) {
    const s = Math.floor(f / 2) % 4;
    if (s !== 3) put(0, G.top2, "y");
    if (s !== 1) put(1, G.top2, "y");
  }

  // 3. The column: steam-white on the lit left, foam on the shaded right with water streaks running up it,
  //    thinning to a 1 px spout at the top, foam spraying off its head
  if (top !== undefined) {
    const base = G.stem, cap = !G.small && f >= 20 && f <= 22;
    for (let y = base; y >= top; y--) {
      const h = base - y, tip = !cap && h >= (G.small ? 99 : base - top - 1);
      if (G.small) {
        putE(0, y, "y");
        if (y >= top + 2) putE(1, y, (y + f) % 3 === 0 ? "b" : "f");
      } else if (tip) putE(0, y, "y");
      else if (f === 22 && y === top + 2) { putE(0, y, "y"); } // the head tearing off the column
      else { putE(0, y, "y"); putE(1, y, (y * 3 + f * 2 + 30) % 5 === 0 ? "b" : "f"); }
    }
    if (cap) {
      // a foam head boiling over the top and drooping into an umbrella of spray
      putE(-1, top + 1, "f"); putE(2, top + 1, "f");
      if (f === 20) { putE(-1, top + 2, "f"); putE(2, top + 2, "f"); }
      if (f >= 21) { putE(-2, top + 2, "b"); putE(3, top + 2, "b"); }
      if (f === 22) { putE(-1, top + 2, "f"); putE(2, top + 3, "f"); }
    }
    if (!G.small && f >= 19 && f <= 22) { putE(-1, base, "f"); putE(2, base, "f"); } // boiling over the rim
    if (G.small && (f === 20 || f === 21)) { putE(-1, top + 1 + (f - 20), "b"); putE(1, top + 1, "f"); }
  }

  // 4. The pool: the sprite's rim and basin, the water rippling (calm), churning before and while it blows
  const S = G.sprite;
  for (let r = 0; r < S.rows.length; r++)
    for (let c = 0; c < S.rows[r].length; c++) if (S.rows[r][c] === "k") put(c - S.ax, r - S.ay, "k");
  let water;
  if (!erupt) water = G.calm[Math.floor((f % 12) / 3)];
  else if (f >= 12 && f < 18) water = G.churn[Math.floor(f / (f < 15 ? 2 : 1)) % 2];
  else if (f >= 18 && f < 23) water = G.churn[0];
  else if (f >= 23 && f < 29) water = G.calm[f < 26 ? 3 : f < 28 ? 1 : 0];
  else water = G.calm[Math.floor((f % 12) / 3)];
  G.pool.forEach((y, i) => { for (let j = 0; j < G.poolW; j++) put(G.poolX + j, y, water[i][j]); });

  // 5. Droplets thrown off the head as it breaks, arcing out and falling back; a fleck where each lands
  const L = G.land, k0 = f - 22;
  if (erupt && k0 >= 0)
    for (const [x0, y0, vx, vy] of G.drops)
      for (let k = 0; k <= k0; k++) {
        const y = y0 + vy * k + 0.5 * G.g * k * k, X = Math.round(x0 + vx * k);
        const inPool = X >= L.min && X <= L.max, ground = inPool ? L.poolY : L.groundY;
        if (y >= ground) {
          if (k === k0) putE(X, ground, "f");
          else if (k + 1 === k0 && !inPool) putE(X, ground, "W");
          break;
        }
        if (k === k0) putE(X, Math.round(y), k < 2 ? "f" : "b");
      }
}
