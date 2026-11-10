// PROTOTYPE - NOT FOR PRODUCTION
// Question: 세계 지도에서 갈 곳을 고르는 것이 곧 덱을 짓는 일이 될 때, 젠디카르를 여행하는 느낌과 덱빌더의 재미가 한 판 안에서 함께 살아나는가?
// Date: 2026-11-10
// Every figure, icon and backdrop, drawn in code as pixel art: shapes are painted small, then
// snapped to hard pixels in a fixed palette with a 1px dark outline. One pixel density everywhere.
'use strict';

const INK = '#14101c';
const COL = {
  amber: '#d8962e', amberL: '#f2c25a', amberD: '#8a5a1e',
  red: '#d8483c', redD: '#8a2a2a', teal: '#3fb8a8', tealD: '#1f6a68',
  gold: '#f2c84a', goldD: '#a8781e', hedron: '#9fb2c4', hedronL: '#d0dce8', hedronD: '#5f7488',
  paper: '#e8dcc0', paperD: '#b8a888', white: '#f4f0e8', panel: '#1a1622', panelL: '#2c2638', panelLL: '#453c58',
  text: '#f4f0e8', dim: '#a8a0b8', green: '#6fc86a', blue: '#6aa8e8', pink: '#e87aa8', purple: '#9a78d8',
};

// A small generator for where art puts things. Gameplay never reads it: gameplay reads rng().
function artRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- The pen: paints shapes on a small canvas and remembers its colours ----
function Pen(g) { this.g = g; this.cols = []; }
Pen.prototype.c = function (col) {
  this.g.fillStyle = col; this.g.strokeStyle = col;
  if (this.cols.indexOf(col) < 0) this.cols.push(col);
  return this;
};
Pen.prototype.r = function (x, y, w, h) { this.g.fillRect(x, y, w, h); return this; };
Pen.prototype.e = function (cx, cy, rx, ry, rot) {
  const g = this.g; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); g.fill(); return this;
};
Pen.prototype.p = function (pts) {
  const g = this.g; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fill(); return this;
};
// A line or a bent line of the given width, through the points.
Pen.prototype.l = function (pts, w) {
  const g = this.g; w = w || 1; const o = (w % 2) ? 0.5 : 0;
  g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0] + o, pts[1] + o);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] + o, pts[i + 1] + o);
  g.stroke(); return this;
};
Pen.prototype.px = function (x, y) { this.g.fillRect(x, y, 1, 1); return this; };
// atop(): what is painted next only lands on what is already there (shading inside a shape).
Pen.prototype.atop = function () { this.g.globalCompositeOperation = 'source-atop'; return this; };
Pen.prototype.under = function () { this.g.globalCompositeOperation = 'destination-over'; return this; };
Pen.prototype.over = function () { this.g.globalCompositeOperation = 'source-over'; return this; };

function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

// Snap a painted canvas to hard pixels: every pixel becomes clear or one of the palette's
// colours, and (when ink is given) the shape gets a 1px outline.
function snap(c, cols, ink) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const im = g.getImageData(0, 0, w, h), d = im.data;
  const pal = cols.map(hexRgb);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    let best = 0, bd = 1e9;
    for (let k = 0; k < pal.length; k++) {
      const dr = d[i] - pal[k][0], dg = d[i + 1] - pal[k][1], db = d[i + 2] - pal[k][2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bd) { bd = dist; best = k; }
    }
    d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; d[i + 3] = 255;
  }
  if (ink) {
    const k = hexRgb(ink), solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
        d[i * 4] = k[0]; d[i * 4 + 1] = k[1]; d[i * 4 + 2] = k[2]; d[i * 4 + 3] = 255;
      }
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}
function makeSprite(w, h, paint, ink) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const pen = new Pen(c.getContext('2d'));
  paint(pen);
  return snap(c, pen.cols, ink === undefined ? INK : ink);
}
// A tiny icon from rows of letters; each letter is a colour in pal, '.' is clear.
function bitmap(rows, pal) {
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    const ch = rows[y][x]; if (ch === '.') continue;
    g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1);
  }
  return c;
}
function flipped(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}

const SPR = {};   // creatures and props, by name
const ICON = {};  // small icons, by name
const BG = {};    // battle backdrops, by continent
let WORLD_IMG = null;

// ---- The expedition leader (faces right) ----
function paintLeader(p) {
  p.c('#3a2a1e').r(11, 31, 4, 8).r(16, 31, 4, 8);                 // legs
  p.c('#241a14').r(10, 38, 6, 3).r(16, 38, 7, 3);                 // boots
  p.c('#6b4a2e').r(3, 17, 7, 11);                                 // pack
  p.c('#8a6a3e').r(3, 17, 7, 2).r(5, 22, 3, 3);
  p.c(COL.amber).p([8, 15, 22, 15, 25, 32, 6, 32]);               // cloak
  p.atop().c(COL.amberD).p([16, 15, 26, 15, 26, 33, 19, 33]).c(COL.amberL).p([9, 16, 12, 16, 10, 31, 7, 31]).over();
  p.c(COL.teal).r(11, 14, 9, 3);                                  // scarf
  p.c('#e0b088').e(15, 11, 4, 4);                                 // face
  p.c('#b8845e').r(16, 12, 3, 2);
  p.c('#5a3b22').p([6, 9, 24, 9, 22, 7, 8, 7]).p([10, 8, 20, 8, 18, 2, 12, 2]); // hat
  p.c('#8a5a34').r(10, 6, 10, 1);
  p.c(COL.amberD).l([21, 19, 25, 23], 3);                         // arm
  p.c('#cfd6de').p([25, 23, 29, 9, 27, 8, 23, 21]);               // machete
  p.c('#f4f8fc').l([27, 10, 24, 20], 1);
  p.c('#5a3b22').r(23, 22, 4, 3);
}

// ---- Enemies (all face left) ----
function paintRecluse(p) {
  const far = '#2c3826', body = '#4f6240', lite = '#7a9060', dark = '#33402a';
  p.c(far).l([19, 15, 26, 4, 40, 27], 2).l([20, 16, 31, 7, 44, 25], 2).l([16, 15, 11, 4, 6, 27], 2).l([15, 16, 7, 8, 1, 26], 2);
  p.c(body).e(30, 16, 11, 9).e(17, 18, 7, 6);
  p.atop().c(dark).e(33, 21, 11, 7).c(lite).e(27, 11, 6, 3).c('#c8b060').r(28, 14, 2, 6).r(25, 16, 8, 2).over();
  p.c(body).l([16, 20, 9, 22, 4, 29], 2).l([19, 21, 14, 26, 12, 30], 2).l([22, 21, 27, 27, 31, 30], 2).l([24, 20, 34, 25, 38, 30], 2);
  p.c(COL.red).px(12, 16).px(14, 15).px(13, 18).px(15, 17);
  p.c(COL.paper).l([11, 21, 10, 24], 1).l([14, 22, 13, 25], 1);
}
function paintMongrel(p) {
  const body = '#5a2320', dark = '#34141a', hot = '#f08a2c', glow = '#ffd45a';
  p.c(hot).p([12, 16, 14, 5, 17, 12, 20, 3, 23, 12, 27, 5, 29, 13, 33, 8, 35, 16]);   // burning mane
  p.c(glow).p([15, 15, 16, 9, 18, 14, 21, 8, 23, 14, 27, 10, 29, 15]);
  p.c(hot).p([39, 19, 47, 9, 44, 17, 47, 16, 42, 24]);                                 // tail of flame
  p.c(body).e(27, 21, 13, 7).e(17, 19, 7, 7).e(9, 16, 6, 5).p([1, 16, 9, 13, 9, 20, 2, 20]);
  p.c(body).p([9, 11, 12, 5, 14, 12]).r(13, 25, 3, 9).r(18, 26, 3, 8).r(31, 25, 3, 9).r(36, 24, 3, 10);
  p.atop().c(dark).e(28, 26, 13, 5).r(13, 30, 3, 4).r(31, 30, 3, 4).c(hot).l([20, 20, 24, 23, 29, 21, 33, 24], 1).over();
  p.c(dark).r(12, 33, 5, 2).r(17, 33, 5, 2).r(30, 33, 5, 2).r(35, 33, 5, 2);
  p.c(glow).px(7, 15).px(6, 15);
  p.c(COL.white).px(2, 20).px(4, 20).px(6, 20);
}
function paintMosquito(p) {
  const body = '#3a3048', wing = '#b8c4e0', wingD = '#8090b8';
  p.c(wing).e(21, 6, 9, 3, -0.5).e(26, 8, 9, 3, -0.15);
  p.atop().c(wingD).l([15, 10, 28, 3], 1).l([19, 10, 33, 7], 1).over();
  p.c(body).e(18, 14, 4, 4).e(12, 12, 3, 3).e(26, 19, 8, 3, 0.5);
  p.atop().c(COL.red).r(22, 16, 2, 6).r(26, 18, 2, 6).r(30, 20, 2, 6).over();
  p.c(body).l([16, 17, 12, 24, 9, 30], 1).l([19, 18, 18, 26, 15, 31], 1).l([22, 18, 25, 26, 23, 31], 1);
  p.c(COL.paper).l([10, 13, 1, 23], 1);
  p.c(COL.red).px(11, 11).px(12, 11);
}
function paintSurrakar(p) {
  const skin = '#3f7a6a', dark = '#27504a', belly = '#a8c8a0';
  p.c(dark).l([30, 16, 36, 28, 34, 39], 5).p([22, 10, 28, 5, 33, 14, 36, 24]);
  p.c(skin).p([10, 16, 30, 13, 34, 31, 12, 34]).e(12, 11, 7, 6).r(14, 32, 7, 12).r(24, 31, 7, 13);
  p.atop().c(belly).e(15, 25, 5, 8).c(dark).p([24, 13, 36, 13, 36, 34, 28, 34]).r(14, 40, 7, 4).r(24, 40, 7, 4).over();
  p.c(skin).p([10, 44, 22, 44, 23, 46, 9, 46]).p([22, 44, 32, 44, 34, 46, 21, 46]);
  p.c(skin).l([13, 19, 6, 30, 5, 40], 5);
  p.c(dark).r(3, 40, 5, 3);
  p.c('#16242a').r(6, 13, 9, 2);
  p.c(COL.white).p([6, 13, 7, 9, 8, 13]).p([11, 14, 12, 10, 13, 14]);
  p.c(COL.gold).px(9, 9).px(10, 9).px(14, 8);
}
function paintBaloth(p) {
  const hide = '#5e6b34', dark = '#3c4624', bone = '#e8dcc0', lite = '#869650';
  p.c(dark).p([22, 10, 24, 3, 27, 11]).p([29, 12, 32, 5, 35, 13]).p([37, 14, 40, 8, 42, 16]);
  p.c(dark).r(22, 30, 6, 10).r(43, 27, 6, 12);
  p.c(hide).e(32, 22, 17, 10).e(20, 18, 10, 10).e(9, 22, 7, 6).p([48, 20, 55, 15, 54, 20, 49, 26]);
  p.c(hide).r(14, 28, 6, 11).r(36, 29, 6, 11).p([3, 24, 14, 24, 13, 30, 5, 29]);
  p.atop().c(dark).e(34, 29, 17, 6).r(14, 34, 6, 5).r(36, 35, 6, 5).c(lite).e(22, 12, 7, 3).e(34, 14, 9, 2).over();
  p.c(bone).p([5, 19, 1, 8, 4, 9, 8, 18]).p([10, 17, 9, 5, 12, 7, 13, 17]);
  p.c(bone).r(13, 39, 2, 2).r(17, 39, 2, 2).r(35, 40, 2, 1).r(39, 40, 2, 1).px(5, 28).px(8, 29).px(11, 29);
  p.c(COL.red).px(7, 20).px(8, 20);
}
function paintTiger(p) {
  const fur = '#c8823a', dark = '#7a4a24', lite = '#e8b070', steel = '#d5dde8';
  p.c(dark).l([44, 17, 51, 12, 52, 5], 2).r(43, 20, 4, 10);
  p.c(fur).e(30, 18, 15, 6).e(11, 14, 6, 5).p([8, 10, 9, 5, 12, 10]).p([12, 10, 15, 5, 16, 11]);
  p.c(fur).r(38, 21, 4, 9).r(14, 20, 4, 6).r(20, 21, 4, 6).p([4, 15, 12, 13, 12, 19, 5, 18]);
  p.atop().c(dark).l([22, 12, 25, 24], 2).l([28, 12, 31, 24], 2).l([34, 12, 37, 24], 2).l([40, 13, 42, 22], 2).c(lite).e(26, 22, 12, 2).over();
  p.c(steel).p([14, 24, 6, 22, 1, 28, 4, 32, 6, 27, 12, 28]).p([21, 26, 15, 25, 10, 31, 13, 33, 15, 29, 20, 29]);
  p.c('#f4f8fc').l([3, 28, 7, 23], 1).l([12, 30, 16, 26], 1);
  p.c(COL.green).px(8, 13).px(9, 13);
  p.c(dark).px(5, 16).r(37, 30, 5, 2).r(42, 30, 5, 2);
}
function paintHellkite(p) {
  const scale = '#b0342c', dark = '#701c22', wing = '#8a242a', bone = '#d85a40', belly = '#e8a860';
  p.c(dark).p([40, 30, 22, 8, 34, 13, 42, 3, 47, 28]);                                   // far wing
  p.c(wing).p([44, 30, 34, 3, 50, 13, 62, 1, 66, 17, 80, 8, 75, 29, 60, 33]);            // near wing
  p.atop().c(bone).l([44, 30, 34, 4], 2).l([45, 30, 62, 2], 2).l([46, 31, 79, 9], 2).over();
  p.c(scale).l([62, 38, 76, 45, 85, 41], 5).p([83, 36, 89, 41, 83, 46]);
  p.c(scale).e(48, 36, 16, 8).l([37, 33, 25, 26, 16, 20], 7);
  p.c(scale).p([17, 15, 4, 17, 1, 22, 12, 25, 19, 23]).p([15, 16, 23, 9, 20, 19]);
  p.c(scale).r(44, 42, 4, 7).r(54, 43, 4, 6);
  p.atop().c(belly).e(46, 42, 13, 3).l([33, 36, 22, 29], 2).c(dark).e(52, 31, 12, 3).over();
  p.c(COL.paper).r(43, 48, 2, 2).r(46, 48, 2, 2).r(53, 48, 2, 2).r(56, 48, 2, 2).px(3, 23).px(6, 24).px(9, 24);
  p.c(COL.gold).px(8, 19).px(9, 19);
  p.c('#ffd45a').p([1, 23, -3, 26, 1, 26]);
}
function paintStomper(p) {
  const hide = '#6e5c38', dark = '#463a24', lite = '#94804e', moss = '#4f8a3c', mossD = '#2f5a2a';
  p.c(mossD).p([35, 20, 40, 7, 45, 20]).p([47, 18, 53, 3, 59, 19]).p([61, 22, 66, 10, 71, 24]);
  p.c(moss).p([37, 20, 40, 11, 43, 20]).p([49, 18, 53, 8, 57, 19]).p([63, 22, 66, 14, 69, 23]);
  p.c(dark).r(40, 52, 10, 16).r(68, 46, 10, 22);
  p.c(hide).e(48, 36, 26, 18).e(16, 34, 12, 11).p([72, 33, 84, 29, 85, 36, 74, 43]);
  p.c(hide).r(26, 48, 11, 20).r(56, 50, 11, 18).p([4, 38, 23, 40, 21, 49, 8, 48]);
  p.atop().c(dark).e(52, 48, 26, 9).r(26, 60, 11, 8).r(56, 61, 11, 7).c(lite).e(44, 23, 18, 4).e(14, 26, 8, 3).over();
  p.c(moss).e(46, 20, 14, 3);
  p.c('#241c14').r(5, 40, 17, 2);
  p.c(COL.white).p([6, 40, 8, 44, 10, 40]).p([11, 40, 13, 44, 15, 40]).p([16, 40, 18, 44, 20, 40]).p([8, 40, 3, 33, 6, 33, 12, 39]);
  p.c(COL.paper).r(25, 67, 3, 2).r(29, 67, 3, 2).r(33, 67, 3, 2).r(55, 67, 3, 2).r(59, 67, 3, 2).r(63, 67, 3, 2);
  p.c(COL.gold).px(11, 29).px(12, 29).px(12, 30);
}
function paintRoilCore(p) {
  const a = '#2f8aa8', b = '#5cc0d8', c = '#c8f4ff', d = '#1c5870';
  p.c(a).p([2, 3, 44, 3, 40, 14, 35, 30, 31, 48, 28, 66, 25, 85, 21, 85, 18, 66, 15, 48, 11, 30, 6, 14]);
  p.atop().c(d).p([27, 3, 46, 3, 34, 85, 23, 85]);
  p.c(b).l([4, 8, 42, 5], 2).l([8, 17, 38, 12], 2).l([11, 27, 36, 22], 2).l([13, 38, 33, 33], 2).l([15, 49, 31, 44], 2).l([17, 60, 29, 56], 2).l([19, 71, 27, 68], 2).over();
  p.c(c).e(22, 18, 6, 7);
  p.c(COL.white).e(21, 17, 2, 3);
}
function paintRock(w, h, seed) {
  return function (p) {
    const r = artRng(seed);
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const an = i / 6 * Math.PI * 2, rad = 0.7 + r() * 0.3;
      pts.push(w / 2 + Math.cos(an) * (w / 2 - 1) * rad, h / 2 + Math.sin(an) * (h / 2 - 1) * rad);
    }
    p.c('#7a6a5a').p(pts);
    p.atop().c('#4a3e36').p([0, h * 0.55, w, h * 0.45, w, h, 0, h]).c('#a89880').l([2, 2, w - 4, 2], 1).over();
  };
}
function paintHedron(w, h) {
  return function (p) {
    const cx = (w - 1) / 2, my = h * 0.42;
    p.c(COL.hedron).p([cx, 0.5, w - 1, my, cx, h - 1, 1, my]);
    p.atop().c(COL.hedronD).p([cx, 0, w, my, cx, h]).c(COL.hedronL).p([cx, 1, 2, my, cx, my]).c(COL.hedronD).l([1, my, w - 1, my], 1).over();
  };
}

// ---- Small icons ----
function buildIcons() {
  const P = { w: COL.white, s: '#cfd6de', d: '#6a7280', r: COL.red, R: COL.redD, t: COL.teal, T: COL.tealD, g: COL.gold, G: COL.goldD,
    a: COL.amber, k: INK, b: COL.blue, p: COL.pink, n: COL.green, N: '#2f6a3a', o: '#f08a2c', y: '#ffd45a', h: COL.hedron, m: '#8a6a3e', v: COL.purple };
  ICON.atk = bitmap(['......kk.', '.....ksk.', '....kswk.', '...kswk..', 'k.kswk...', 'kmksk....', '.kmk.....', 'kmkmk....', 'kk.kk....'], P);
  ICON.blk = bitmap(['kkkkkkkkk', 'ktttTtttk', 'ktwtTtttk', 'ktwtTtttk', 'ktttTtttk', '.ktTTTtk.', '.kttTttk.', '..ktTtk..', '...kkk...'], P);
  ICON.draw = bitmap(['..kkkkkk.', '.kwwwwwk.', 'kkwsssswk', 'kwkwwwwwk', 'kwkwsswwk', 'kwkwwwwwk', 'kwkkkkkkk', 'kwwwwwk..', 'kkkkkkk..'], P);
  ICON.nrg = bitmap(['....kkk..', '...kyyk..', '..kyyk...', '.kyykkk..', 'kyyyyyk..', 'kkkyyk...', '..kyk....', '.kyk.....', '.kk......'], P);
  ICON.heal = bitmap(['.kk...kk.', 'krrk.krrk', 'krprkrrrk', 'krrrrrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'], P);
  ICON.gold = bitmap(['..kkkkk..', '.kgggggk.', 'kgyggGggk', 'kgygggGgk', 'kgygggGgk', 'kgggggGgk', 'kggGGGggk', '.kgggggk.', '..kkkkk..'], P);
  ICON.burn = bitmap(['....k....', '...kok...', '..kook.k.', '.kooyokok', 'kooyyooyk', 'koyyyyook', 'koyyyyook', '.koyyook.', '..kkkkk..'], P);
  ICON.eye = bitmap(['.........', '..kkkkk..', '.kwwwwwk.', 'kwwkbkwwk', 'kwkbkbkwk', 'kwwkbkwwk', '.kwwwwwk.', '..kkkkk..', '.........'], P);
  ICON.land = bitmap(['....k....', '...knk...', '..knnnk..', '.knnNnnk.', 'knnNNNnnk', 'kmmmmmmmk', 'kmmmmmmmk', 'kkkkkkkkk', '.........'], P);
  ICON.x = bitmap(['kk.....kk', 'krk...krk', '.krk.krk.', '..krkrk..', '...krk...', '..krkrk..', '.krk.krk.', 'krk...krk', 'kk.....kk'], P);
  ICON.prc = bitmap(['......kkk', '.....kwwk', '....kwwwk', 'kkkkwwkk.', 'ktkwwk...', 'ktwwkk...', 'kwwktk...', '.kkttk...', '..kkk....'], P);
  ICON.up = bitmap(['....k....', '...knk...', '..knnnk..', '.knnnnnk.', 'kkkknkkkk', '...knk...', '...knk...', '...knk...', '...kkk...'], P);
  ICON.away = bitmap(['..kkkkk..', '.kvvvvvk.', 'kvvkkkvvk', 'kvk...kvk', 'kvk...kvk', 'kvk...kvk', 'kvvkkkvvk', '.kvvvvvk.', '..kkkkk..'], P);
  ICON.lf = bitmap(['...kkk...', '..knnnk..', '.knnnnnk.', 'kkknnnkkk', '..knnnk..', 'kkkkkkkkk', 'kmmmmmmmk', 'kkkkkkkkk', '.........'], P);
  ICON.buff = bitmap(['....k....', '...kok...', '..kooyk..', '.kooyook.', 'kkkoookkk', '..kooyk..', '..kooyk..', '..kooyk..', '..kkkkk..'], P);
  ICON.hex = bitmap(['..kkkkk..', '.kvvvvvk.', 'kvkvvvkvk', 'kvvvvvvvk', 'kvvkkkvvk', 'kvkvvvkvk', '.kvvvvvk.', '..kkkkk..', '.........'], P);
  ICON.hide = bitmap(['.........', '..kkkkk..', '.kdddddk.', 'kddkdkddk', 'kdddddddk', '.kdddddk.', '..kkkkk..', '.........', '.........'], P);
  ICON.charge = bitmap(['kk...kk..', 'kok..kok.', '.kok..kok', '..kok..ko', '.kok..kok', 'kok..kok.', 'kk...kk..', '.........', '.........'], P);
  ICON.str = bitmap(['.kkk.....', 'kooook...', 'koyyook..', '.kkoyok..', '..kooyok.', '.koooyok.', 'koyyyook.', 'kooooook.', '.kkkkkk..'], P);
  ICON.web = bitmap(['k...k...k', '.k..k..k.', '..kkkkk..', '..k.k.k..', 'kkkkkkkkk', '..k.k.k..', '..kkkkk..', '.k..k..k.', 'k...k...k'], { k: COL.paper });
  // Map stops: town, wilds, great beast, camp; and the expedition's marker.
  ICON.town = bitmap(['....kkk....', '...kaaak...', '..kaaaaak..', '.kaaaaaaak.', 'kkkkkkkkkkk', '.kwwwkwwwk.', '.kwkwkwkwk.', '.kwwwkwwwk.', '.kwwwkmmwk.', '.kwwwkmmwk.', '.kkkkkkkkk.'], P);
  ICON.wild = bitmap(['k.........k', 'kk.......kk', 'ksk.....ksk', '.ksk...ksk.', '..ksk.ksk..', '...kskwk...', '..ksk.ksk..', '.kmk...kmk.', 'kmk.....kmk', 'kk.......kk', '...........'], P);
  ICON.elite = bitmap(['kk.......kk', 'kwk.....kwk', 'kwwk...kwwk', '.kwwkkkwwk.', '.krrrrrrrk.', 'krrkrrrkrrk', 'krrrrrrrrrk', '.krrrkrrrk.', '.krkrkrkrk.', '..kkkkkkk..', '...........'], P);
  ICON.camp = bitmap(['.....k.....', '....kak....', '...kaaak...', '...kaaak...', '..kaakaak..', '..kakkkak..', '.kaak.kaak.', '.kak...kak.', 'kkkkkkkkkkk', '...........', '...........'], P);
  ICON.mark = bitmap(['.kkkkkk..', '.krrrrrk.', '.krrwrrk.', '.krrrrrk.', '.kkkkkk..', '.kk......', '.kk......', '.kk......', 'kkkk.....'], P);
  ICON.roil = bitmap(['..kkkkk..', '.kbbbbbk.', 'kbkkkkbbk', 'kbkbbkkbk', 'kbkbkbkbk', 'kbkkbbkbk', 'kbbkkkkbk', '.kbbbbbk.', '..kkkkk..'], P);
}

// ---- Battle backdrops: one for each continent, dark and narrow in value so figures read ----
function bands(g, cols, y0, y1) {
  const n = cols.length, bh = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i]; g.fillRect(0, Math.round(y0 + i * bh), 640, Math.ceil(bh) + 1);
    if (i < n - 1) { // a dithered seam into the next band
      g.fillStyle = cols[i + 1];
      const y = Math.round(y0 + (i + 1) * bh) - 2;
      for (let x = 0; x < 640; x += 2) { g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
    }
  }
}
function poly(g, col, pts) {
  g.fillStyle = col; g.beginPath(); g.moveTo(Math.round(pts[0]), Math.round(pts[1]));
  for (let i = 2; i < pts.length; i += 2) g.lineTo(Math.round(pts[i]), Math.round(pts[i + 1]));
  g.closePath(); g.fill();
}
function ridge(g, col, r, base, lo, hi, step, flat) {
  const pts = [0, 250];
  let x = 0;
  while (x <= 640) {
    const y = base - lo - r() * (hi - lo);
    pts.push(x, y);
    if (flat) { const w = step * (0.5 + r()); pts.push(x + w, y); x += w; }
    x += step * (0.4 + r() * 0.8);
  }
  pts.push(640, base, 640, 250);
  poly(g, col, pts);
}
function buildBackdrop(cont) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 360;
  const g = c.getContext('2d');
  const seeds = { tazeem: 11, akoum: 23, 'guul-draz': 37, murasa: 41, ondu: 53, 'bala-ged': 67, sejiri: 79 };
  const r = artRng(seeds[cont] || 5);
  const ground = 196;
  if (cont === 'tazeem') {
    bands(g, ['#16323c', '#1c4350', '#28606c', '#3a7c80'], 0, ground);
    ridge(g, '#1c4048', r, ground, 30, 80, 46, true);
    ridge(g, '#17343a', r, ground, 8, 40, 30, true);
    for (let i = 0; i < 5; i++) { const x = 40 + i * 140 + r() * 40, w = 10 + r() * 8; g.fillStyle = '#12282c'; g.fillRect(x, 60 + r() * 30, w, 140); g.fillStyle = '#1a3c34'; const cy = 58 + r() * 16; for (const q of [[0, 0, 36, 18], [-16, 14, 24, 12], [18, 16, 22, 11], [2, 26, 28, 10]]) { g.beginPath(); g.ellipse(x + w / 2 + q[0], cy + q[1], q[2], q[3], 0, 0, Math.PI * 2); g.fill(); } }
    bands(g, ['#274838', '#1f3a30'], ground, 250);
  } else if (cont === 'akoum') {
    bands(g, ['#1c0f1e', '#2e1524', '#4a1c26', '#6a2c24'], 0, ground);
    ridge(g, '#2a1622', r, ground, 40, 120, 30, false);
    ridge(g, '#20101c', r, ground, 10, 60, 22, false);
    for (let i = 0; i < 9; i++) { const x = 20 + r() * 600, h = 20 + r() * 46, w = 6 + r() * 8; poly(g, i % 2 ? '#7a3080' : '#2f7a88', [x, ground + 6, x + w / 2 + (r() - 0.5) * 16, ground - h, x + w, ground + 6]); poly(g, i % 2 ? '#b0509a' : '#48a8b8', [x + 1, ground + 6, x + w / 2 + 2, ground - h * 0.7, x + 3, ground + 6]); }
    bands(g, ['#2a1a22', '#20141c'], ground, 250);
    g.fillStyle = '#d8582a'; for (let i = 0; i < 14; i++) { const x = r() * 620, y = ground + 8 + r() * 40; g.fillRect(x, y, 6 + r() * 14, 1); g.fillRect(x + 4, y + 1, 5, 1); }
  } else if (cont === 'guul-draz') {
    bands(g, ['#0f1a16', '#15251f', '#1d332a', '#274034'], 0, ground);
    ridge(g, '#13211c', r, ground, 20, 50, 60, true);
    for (let i = 0; i < 8; i++) { const x = 20 + i * 82 + r() * 30; g.fillStyle = '#0c1512'; g.fillRect(x, 70 + r() * 40, 5, 130); g.fillRect(x - 12, 110 + r() * 20, 12, 3); g.fillRect(x + 5, 96 + r() * 20, 14, 3); poly(g, '#0c1512', [x - 10, ground + 2, x + 2, ground - 22, x + 16, ground + 2]); }
    for (let i = 0; i < 3; i++) { const x = 90 + i * 210 + r() * 40; g.fillStyle = '#22332e'; g.fillRect(x, ground - 30, 26, 34); g.fillRect(x + 6, ground - 40, 14, 10); }
    bands(g, ['#183029', '#122620'], ground, 250);
    g.fillStyle = '#2c4a3e'; for (let i = 0; i < 40; i++) g.fillRect(r() * 630, ground + 6 + r() * 44, 5 + r() * 12, 1);
  } else if (cont === 'murasa') {
    bands(g, ['#12241c', '#193424', '#224c30', '#34683f'], 0, ground);
    poly(g, '#1a2a22', [0, 250, 0, 60, 180, 52, 200, 84, 420, 78, 440, 46, 640, 40, 640, 250]);
    for (let i = 0; i < 5; i++) { const x = 30 + i * 135 + r() * 40, w = 16 + r() * 10; g.fillStyle = '#14201a'; g.fillRect(x, 0, w, 200); poly(g, '#1c3a26', [x - 34, 44, x + w / 2, 4, x + w + 34, 40, x + w / 2, 62]); g.fillStyle = '#2a5030'; for (let k = 0; k < 3; k++) g.fillRect(x + r() * w, 60, 1, 30 + r() * 60); }
    bands(g, ['#22381f', '#1a2c1a'], ground, 250);
  } else if (cont === 'ondu') {
    bands(g, ['#2a1c2e', '#48283a', '#70403a', '#985a3a'], 0, ground);
    ridge(g, '#3c2434', r, ground, 50, 110, 70, true);
    ridge(g, '#2e1c2a', r, ground, 16, 56, 50, true);
    for (let i = 0; i < 6; i++) { const x = 30 + i * 110 + r() * 40; let y = ground + 2; g.fillStyle = '#221620'; for (let k = 0; k < 10; k++) { g.fillRect(x + (k % 2 ? 4 : 0), y - 10, 6, 10); y -= 9; } poly(g, '#2c2a24', [x - 16, y, x + 5, y - 22, x + 26, y]); }
    bands(g, ['#4a3428', '#3a2820'], ground, 250);
  } else if (cont === 'bala-ged') {
    bands(g, ['#0f2018', '#152e1e', '#1d4228', '#2a5a34'], 0, ground);
    for (let row = 0; row < 3; row++) { g.fillStyle = ['#17301f', '#132819', '#0f2014'][row]; for (let i = 0; i < 12; i++) { const x = i * 58 + r() * 30, y = 80 + row * 38 + r() * 16; g.beginPath(); g.ellipse(x, y, 40 + r() * 16, 22 + r() * 8, 0, 0, Math.PI * 2); g.fill(); } g.fillRect(0, 110 + row * 38, 640, 100); }
    for (let i = 0; i < 7; i++) { const x = r() * 620; g.fillStyle = '#0c1810'; g.fillRect(x, 90, 4, 110); }
    bands(g, ['#1c3420', '#152818'], ground, 250);
    poly(g, '#234a2a', [0, 250, 0, 214, 40, 196, 70, 250]); poly(g, '#234a2a', [640, 250, 640, 210, 600, 190, 566, 250]);
  } else { // sejiri
    bands(g, ['#1a2434', '#273850', '#3c5674', '#5a7a9a'], 0, ground);
    ridge(g, '#3a5470', r, ground, 30, 60, 90, true);
    poly(g, '#56708c', [380, ground + 4, 470, 60, 560, ground + 4]); poly(g, '#7892ac', [380, ground + 4, 470, 60, 470, ground + 4]);
    g.fillStyle = '#3a5470'; g.fillRect(396, 150, 150, 2);
    bands(g, ['#5a7890', '#48647c'], ground, 250);
    g.fillStyle = '#7e9ab2'; for (let i = 0; i < 30; i++) g.fillRect(r() * 630, ground + 6 + r() * 44, 8 + r() * 16, 1);
  }
  // floating hedrons: everywhere on Zendikar, thickest in Tazeem's sky
  const nh = cont === 'tazeem' ? 7 : 3;
  for (let i = 0; i < nh; i++) {
    const big = r() < 0.35, s = big ? SPR.hedronM : SPR.hedronS;
    g.globalAlpha = 0.55; g.drawImage(s, Math.round(40 + r() * 560), Math.round(14 + r() * 70)); g.globalAlpha = 1;
  }
  g.fillStyle = COL.panel; g.fillRect(0, 250, 640, 110);
  g.fillStyle = COL.panelL; g.fillRect(0, 250, 640, 1);
  return c;
}

// ---- The world map, from the map project's coastline ----
const LAND_COL = { sejiri: '#6e8496', ondu: '#8a6a48', agadeem: '#8a6a48', beyeen: '#8a6a48', jwar: '#8a6a48', akoum: '#7a4038',
  tazeem: '#4f7a5a', murasa: '#3f6a44', 'guul-draz-bala-ged': '#56603c' };
function buildWorldMap() {
  const W = WORLD.w, H = WORLD.h;
  const land = document.createElement('canvas'); land.width = W; land.height = H;
  const g = land.getContext('2d'), cols = [];
  for (const l of WORLD.lands) {
    const col = LAND_COL[l.id] || '#6a6a52';
    if (cols.indexOf(col) < 0) cols.push(col);
    poly(g, col, l.pts);
  }
  g.globalCompositeOperation = 'source-atop';
  cols.push('#2f5a3a'); for (const f of WORLD.forests) poly(g, '#2f5a3a', f);
  g.globalCompositeOperation = 'destination-out';
  for (const w of WORLD.waters) poly(g, '#000', w.pts);
  g.globalCompositeOperation = 'source-over';
  snap(land, cols, null);
  const im = g.getImageData(0, 0, W, H), d = im.data;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d'), r = artRng(7);
  og.fillStyle = '#0f2b35'; og.fillRect(0, 0, W, H);
  og.fillStyle = '#143944'; for (let i = 0; i < 260; i++) og.fillRect(Math.floor(r() * W), Math.floor(r() * H), 3 + Math.floor(r() * 5), 1);
  const om = og.getImageData(0, 0, W, H), o = om.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (solid(x, y)) {
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      const sp = r();
      let k = edge ? 1.28 : (sp < 0.06 ? 0.86 : sp > 0.95 ? 1.1 : 1);
      o[i] = Math.min(255, d[i] * k); o[i + 1] = Math.min(255, d[i + 1] * k); o[i + 2] = Math.min(255, d[i + 2] * k); o[i + 3] = 255;
    } else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
      o[i] = 20; o[i + 1] = 16; o[i + 2] = 28; o[i + 3] = 255;
    } else if (solid(x - 2, y) || solid(x + 2, y) || solid(x, y - 2) || solid(x, y + 2)) {
      o[i] = 30; o[i + 1] = 78; o[i + 2] = 92; o[i + 3] = 255;
    }
  }
  og.putImageData(om, 0, 0);
  return out;
}

function buildArt() {
  SPR.leader = makeSprite(32, 44, paintLeader);
  SPR['oran-rief-recluse'] = makeSprite(46, 32, paintRecluse);
  SPR['hellfire-mongrel'] = makeSprite(50, 37, paintMongrel);
  SPR['heartstabber-mosquito'] = makeSprite(37, 33, paintMosquito);
  SPR['surrakar-marauder'] = makeSprite(42, 48, paintSurrakar);
  SPR['territorial-baloth'] = makeSprite(57, 42, paintBaloth);
  SPR['scythe-tiger'] = makeSprite(55, 35, paintTiger);
  SPR['hellkite-charger'] = makeSprite(91, 52, paintHellkite);
  SPR['terra-stomper'] = makeSprite(87, 71, paintStomper);
  SPR.roilCore = makeSprite(48, 88, paintRoilCore);
  SPR.rockA = makeSprite(15, 12, paintRock(13, 10, 3));
  SPR.rockB = makeSprite(20, 15, paintRock(18, 13, 9));
  SPR.rockC = makeSprite(11, 9, paintRock(9, 7, 17));
  SPR.hedronL = makeSprite(15, 27, paintHedron(15, 27));
  SPR.hedronM = makeSprite(10, 18, paintHedron(10, 18));
  SPR.hedronS = makeSprite(6, 11, paintHedron(6, 11));
  buildIcons();
  buildSprites2();
  buildCardArt();
  for (const k of ['tazeem', 'akoum', 'guul-draz', 'murasa', 'ondu', 'bala-ged', 'sejiri']) BG[k] = buildBackdrop(k);
  WORLD_IMG = buildWorldMap();
}

// The Roil Elemental is drawn live: stones and a hedron circling a funnel of wind.
// cx, by: its centre and its foot. t: seconds. Returns nothing; draws on ctx.
function drawRoil(g, cx, by, t) {
  const parts = [
    { s: SPR.rockB, R: 40, h: 62, sp: 1.1, ph: 0 }, { s: SPR.rockA, R: 34, h: 40, sp: 1.5, ph: 2.1 },
    { s: SPR.rockC, R: 26, h: 20, sp: 2.0, ph: 4.0 }, { s: SPR.hedronM, R: 44, h: 48, sp: 0.8, ph: 3.2 },
    { s: SPR.rockA, R: 30, h: 72, sp: 1.3, ph: 5.2 }, { s: SPR.rockC, R: 38, h: 30, sp: 1.7, ph: 1.0 },
  ];
  const place = q => { const a = t * q.sp + q.ph; return { x: Math.round(cx + Math.cos(a) * q.R - q.s.width / 2), y: Math.round(by - q.h + Math.sin(a) * 5 - q.s.height / 2), z: Math.sin(a) }; };
  for (const q of parts) { const o = place(q); if (o.z < 0) g.drawImage(q.s, o.x, o.y); }
  g.drawImage(SPR.roilCore, Math.round(cx - 24), Math.round(by - 88 + Math.sin(t * 2) * 2));
  for (const q of parts) { const o = place(q); if (o.z >= 0) g.drawImage(q.s, o.x, o.y); }
}
// Draw an enemy kind with its feet at (cx, by). Flying kinds bob.
function drawEnemyKind(g, kind, cx, by, t) {
  if (kind === 'roil-elemental') { drawRoil(g, cx, by, t); return; }
  const s = SPR[kind], def = ENEMIES[kind];
  const bob = def.fly ? Math.round(Math.sin(t * 3 + cx) * 2) - 10 : 0;
  g.drawImage(s, Math.round(cx - s.width / 2), Math.round(by - s.height + bob));
}
