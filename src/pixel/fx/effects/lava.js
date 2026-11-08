// 픽셀 지도(/pixel, S5) 효과 — 용암: 아쿰 용암 들판('akoum-lava-field', kind lava)에 흩뿌린 1x 용암 기호(식은 껍질의 빛나는 틈)를 움직인다.
// Based on pixelfx (MIT, a841596) fire/candle (calm breathing flicker) and fire/brazier (coals pulsing in core/sim.js
// FIRE_RAMP order — ember < lava < hot < white), redone as a hand-keyed 24-frame cycle on the map's 16-bit palette
// with no light buffer (glow would add off-palette colors). No code here is copied from Sprite Fusion files.
//
// 움직임: 2초(24 장)에 한 번 숨쉬듯 가운데가 밝아졌다 어두워진다(가장 어두운 0 장, 가장 밝은 12–14 장, 밝아질 때는 천천히·식을 때는 조금 빠르게).
// 틈 가장자리 8 픽셀은 저마다 다른 장에 한두 장 lava 로 일렁이고, 가장 어두울 때 밑 끝이 껍질로 덮인다.
// 15–21 장에 가운데 오른쪽 위에서 거품이 부풀어 흰빛으로 터지고 불티 둘이 위로 튄다(그 뒤 터진 자리는 한 장 껍질빛).
// 숨의 가운데인 6·8 장은 바탕 기호와 바이트까지 같아 기호 위에 겹쳐도 튀지 않는다.
import { hex } from "../../vendor/pixelfx/index.js";

export const meta = {
  name: "Lava vent",
  desc: "A glowing crack in cooled crust: the hot core slowly breathes brighter and dimmer, the crack edges flicker, and once a loop a bubble swells and pops with two embers.",
  tags: ["fire", "lava", "map", "loop", "ambient"],
  basedOn: "fire/candle, fire/brazier",
  size: [8, 8],
  origin: [3, 5],
  duration: 2,
  fps: 12,
  loop: true,
  options: {
    colors: {
      ink: "#3b2f22", rockLight: "#e3d6b8", rock: "#a8987a", rockShade: "#6f604b", snow: "#f6f7f2", snowShade: "#b4c4cf",
      lava: "#e2572a", lavaHot: "#ffcc4a", ember: "#7a2a1a", lavaCrust: "#5b3a30", water: "#4f8fa6", foam: "#cfe8e2",
      steam: "#f2f1ea", smoke: "#8c8781", void: "#1a1410", land: "#cdb98a", landShade: "#b8a372", shallow: "#4f8fa6",
      mid: "#336a88", deep: "#29506d", seaFoam: "#b9dcd6", ice: "#e8f3f5", iceShade: "#a6c3cf",
    },
    seed: 1,
    // false: no bubble (a calmer vent)
    bubble: true,
  },
};

/** The static map sprite this animates (terrainSprites lava glyph), anchor at column 3, row 2. */
export const SPRITE = { rows: ["...e....", "..eLe...", ".elLLle.", "..elle..", "...e...."], ax: 3, ay: 2 };

const N = 24; // frames in the loop at 12 fps
const W = 8, H = 5;
// heat steps, coolest first: 0 crust (reads as the ground), 1 ember, 2 lava, 3 hot, 4 white (the pop only)
const BASE_HEAT = { e: 1, l: 2, L: 3 };
const BASE = new Int8Array(W * H).fill(-1);
SPRITE.rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch in BASE_HEAT) BASE[r * W + c] = BASE_HEAT[ch]; }));
// the crack's edge pixels and when each flares to lava: [start frame, frames]
const EDGES = [[3, 0], [2, 1], [4, 1], [1, 2], [6, 2], [2, 3], [5, 3], [3, 4]];
const FLARE = [[9, 2], [13, 1], [5, 1], [11, 2], [16, 1], [7, 1], [14, 2], [20, 1]];
const BUBBLE_AT = 15;

// the breath: 0 at frame 0, 1 around frames 12–14; a slow rise and a slightly quicker settle
const breath = (f) => 0.5 - 0.5 * Math.cos((Math.PI * 2 * f) / N) + 0.08 * Math.sin((Math.PI * 4 * f) / N);

let palKey = null, palette = null;
function stepsOf(C) {
  if (C !== palKey) {
    palKey = C;
    palette = [hex(C.lavaCrust), hex(C.ember), hex(C.lava), hex(C.lavaHot), hex(C.steam)];
  }
  return palette;
}

const heat = new Int8Array(W * H);
export function draw(p, t, o) {
  const step = stepsOf(o.colors), seed = Math.max(1, Math.floor(o.seed ?? 1));
  const f = ((Math.floor(t * 12 + 1e-6) % N) + N) % N, b = breath(f);
  heat.set(BASE);
  const set = (c, r, h) => { heat[r * W + c] = h; };
  // the core: brightening spreads hot outwards, dimming pulls it back to the middle
  if (b < 0.45) set(3, 1, 2);
  if (b < 0.2) set(4, 2, 2);
  if (b > 0.85) set(2, 2, 3);
  if (b > 0.97) set(3, 3, 3);
  if (b < 0.1) set(4, 3, 1);
  // the crack edges: each flares to lava for a frame or two at its own time (seed rotates who flares when)
  EDGES.forEach(([c, r], i) => {
    const [s, n] = FLARE[(i + seed - 1) % FLARE.length];
    if ((f - s + N) % N < n) set(c, r, 2);
  });
  // at the dimmest the lower tip crusts over
  if (b < 0.06) set(3, 4, 0);
  // the bubble: swells up-right of the core as it settles, pops white, two embers fly off and one falls back
  let d0 = null, d1 = null;
  if (o.bubble !== false) {
    const k = f - BUBBLE_AT;
    if (k === 0) set(4, 1, 2);
    else if (k === 1) set(4, 1, 3);
    else if (k === 2) {
      set(4, 1, 3);
      d0 = [4, 0, 2];
    }
    else if (k === 3) {
      set(4, 1, 2);
      d0 = [4, 0, 4];
    }
    else if (k === 4) {
      set(4, 1, 0);
      d0 = [5, -1, 3];
      d1 = [2, -1, 2];
    }
    else if (k === 5) {
      d0 = [6, -2, 2];
      d1 = [1, -2, 1];
    }
    else if (k === 6) d0 = [6, -1, 1];
  }
  for (let i = 0; i < W * H; i++) if (heat[i] >= 0) p.px((i % W) - SPRITE.ax, Math.floor(i / W) - SPRITE.ay, step[heat[i]]);
  if (d0) p.px(d0[0] - SPRITE.ax, d0[1] - SPRITE.ay, step[d0[2]]);
  if (d1) p.px(d1[0] - SPRITE.ax, d1[1] - SPRITE.ay, step[d1[2]]);
}
