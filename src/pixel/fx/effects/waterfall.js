// 픽셀 지도(/pixel)의 폭포 효과 (S5, docs/pixel-plan.md D6) — 타일에 구운 8×8 폭포 그림(src/pixel/raster/terrainSprites.ts 의
// LANDMARK.waterfall)을 그대로 두고 물줄기와 발치의 물보라만 움직인다. 물은 아래로 떨어지게 그린다 (옆으로 떨어지는 폭포는 런타임이 돌린다).
// 바탕: pixelfx water/waterfall (흰 줄무늬가 낙하 시간 √깊이 로 미끄러져 내려가 아래로 갈수록 빨라지고 늘어난다, 발치의 물보라) —
// 그 효과의 코드를 옮기지 않고 기법만 따왔다 (Sprite Fusion 출처 표시가 붙은 코드는 쓰지 않았다). 물방울이 튀어 나가 빨라지며 떨어지는 것은 water/drip.
// pixelfx a841596 (MIT) — src/pixel/vendor/pixelfx/LICENSE
//
// 그림 글자(rows): 테두리 k·R·r 는 정적 그림과 같은 색으로 늘 찍고, 정적 그림의 물·물보라 픽셀도 모든 프레임에 불투명하게 덮는다
// (런타임이 정적 그림 위에 겹쳐 그려도, 그림을 지우고 그려도 같다). 그 밖에는 투명 — 튀어 나간 물방울만 양옆 한 칸까지 나간다.
import { hex, rng, fract } from "../../vendor/pixelfx/index.js";

const COLORS = { ink: "#3b2f22", rockLight: "#e3d6b8", rock: "#a8987a", rockShade: "#6f604b", snow: "#f6f7f2", snowShade: "#b4c4cf", lava: "#e2572a", lavaHot: "#ffcc4a", ember: "#7a2a1a", lavaCrust: "#5b3a30", water: "#4f8fa6", foam: "#cfe8e2", steam: "#f2f1ea", smoke: "#8c8781", void: "#1a1410", land: "#cdb98a", landShade: "#b8a372", shallow: "#4f8fa6", mid: "#336a88", deep: "#29506d", seaFoam: "#b9dcd6", ice: "#e8f3f5", iceShade: "#a6c3cf" };
const KEYS = { k: "ink", R: "rockLight", r: "rock", d: "rockShade", w: "snow", W: "snowShade", l: "lava", L: "lavaHot", e: "ember", b: "water", f: "foam", y: "steam", o: "smoke", K: "void", i: "ice", I: "iceShade", "%": "ink" };
const SPRITE = { rows: ["kRRRRRk.", "krbfbbrk", ".kbffbk.", ".kbfbbk.", "..bffb..", "..bfbb..", ".fbffbf.", "f.f..f.f"], ax: 3, ay: 0 };

export const meta = {
  name: "Map waterfall",
  basedOn: "water/waterfall, water/drip",
  desc: "The map's 8x8 waterfall glyph: foam streaks slide down the falling water, speeding up, and spray hops off the foot.",
  tags: ["water", "waterfall", "map", "loop"],
  size: [10, 8],
  origin: [4, 0],
  duration: 1,
  loop: true,
  fps: 12,
  bg: "ground",
  options: { colors: COLORS, seed: 1 },
};

const FPS = 12, N = 12;
// fall-time position of row r below the lip: equal steps of it are equal times, so the water accelerates
// (about a row a frame at the lip, two rows a frame at the foot, at 3 streaks a second)
const fall = (r) => 0.72 * Math.sqrt(r + 0.5);
// a drop hopping off the foot, one sprite pixel a frame: up and out, then falling faster (left side; the right mirrors)
const HOPS = [
  [[1, 5], [0, 5], [-1, 6]],
  [[1, 5], [0, 4], [-1, 5], [-1, 6]],
];

// the palette as color numbers, once per colors object
const CACHE = new WeakMap();
const colorsOf = (colors) => {
  let C = CACHE.get(colors);
  if (!C) CACHE.set(colors, (C = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, hex(v)]))));
  return C;
};

export function draw(p, t, o) {
  const C = colorsOf(o.colors);
  const put = (c, r, col) => p.px(c - SPRITE.ax, r - SPRITE.ay, col);
  const f = ((Math.floor(t * FPS + 1e-6) % N) + N) % N;
  // the rock lip and the edges: static
  SPRITE.rows.forEach((row, r) => [...row].forEach((ch, c) => { if ("kRrd".includes(ch)) put(c, r, C[KEYS[ch]]); }));
  // the falling water, four lanes, rows 1..6; streaks slide down at whole cycles a second
  const lanes = [
    { c: 2, n: 3, w: 0.16, off: 0.18, on: C.foam, base: C.water },
    { c: 3, n: 3, w: 0.8, off: 0.0, on: C.foam, base: C.water },
    { c: 4, n: 3, w: 0.42, off: 0.62, on: C.foam, base: C.water },
    { c: 5, n: 2, w: 0.22, off: 0.85, on: C.mid, base: C.water },
  ];
  const F = f / FPS;
  for (const L of lanes)
    for (let r = 1; r <= 6; r++) {
      const v = fract(fall(r) - L.n * F + L.off);
      const on = v < L.w;
      // the white curl just over the lip stays put; at the foot the middle churns white, flashing as a streak lands
      if (r === 1 && L.c === 3) put(L.c, r, C.foam);
      else if (r === 6 && (L.c === 3 || L.c === 4)) put(L.c, r, on ? C.steam : C.foam);
      else put(L.c, r, on ? L.on : L.base);
    }
  // the foot: the splash pixels breathe between white, foam and pale sea foam — the rims flare just before a drop
  // hops off them, the outer spray just after it lands
  [[1, 6], [6, 6], [0, 7], [2, 7], [5, 7], [7, 7]].forEach(([c, r], i) => {
    const v = (f + [2, 8, 9, 6, 0, 3][i]) % 12;
    put(c, r, v < 3 ? C.steam : v < 8 ? C.foam : C.seaFoam);
  });
  // drops hop off both sides of the foot, alternating
  for (let i = 0; i < 2; i++) {
    const R = rng(o.seed, i), path = HOPS[Math.floor(R.next() * HOPS.length)], side = i % 2, born = i * 6 + 1;
    const age = (f - born + N) % N;
    if (age >= path.length) continue;
    const [c, r] = path[age];
    put(side ? 7 - c : c, r, [C.steam, C.foam, C.seaFoam, C.seaFoam][age]);
  }
}
