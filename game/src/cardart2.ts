import './cardart'; // load order, as in the one-shot's page: this module runs after cardart
import { COL, INK, hexRgb } from './art';
import { ART_PAINT, ringPts } from './cardart';
import type { Pen } from './art';
import type { Loose } from './game/types';
// Pictures for the rest of the ZEN set, 64 x 36 each, drawn in code from a small kit of motifs
// (a figure, a beast, a flame, a hedron ...). This game's own drawings of what each card is
// about, not the cards' art. A picture is named by its card's id.

export function shadeCol(hex: string, k: number) { return '#' + hexRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join(''); }
const SK: Record<string, string> = { human: '#e0b088', kor: '#d8dce4', mer: '#5aa8c8', elf: '#c8b088', gob: '#a06a54', vamp: '#cfc6d8', ogre: '#8a9a5a', mino: '#8a5a3a' };

const AK = {
  // A standing figure, feet at (x, y). o: skin, body, robe, cape, short, ears, hat, hatCol, hold, holdCol, tip.
  person(p: Pen, x: number, y: number, o: Loose) {
    o = o || {};
    const skin = o.skin || SK.human, body = o.body || '#8a6a3e', dark = o.dark || shadeCol(body, 0.62), L = o.short ? 4 : 8;
    const by = y - L, ty = by - 10, hy = ty - 4, hx = x + 6, tc = o.holdCol || '#cfd6de';
    if (o.cape) p.c(o.cape).p([x - 4, ty, x - 9, y - 2, x - 5, y - 1, x - 3, ty + 1]).p([x + 4, ty, x + 8, y - 2, x + 5, y - 1, x + 3, ty + 1]);
    p.c(dark).r(x - 3, by, 3, L).r(x + 1, by, 3, L);
    if (o.robe) p.c(body).p([x - 5, y - 1, x - 4, ty, x + 4, ty, x + 5, y - 1]); else p.c(body).r(x - 4, ty, 8, 11);
    p.atop().c(dark).r(x + 1, ty, 4, y - ty).over();
    p.c(skin).e(x, hy, 3.5, 3.5).r(x + 4, ty + 4, 2, 2);
    if (o.ears === 'point') p.c(skin).p([x - 3, hy - 1, x - 7, hy - 4, x - 3, hy + 1]).p([x + 3, hy - 1, x + 7, hy - 4, x + 3, hy + 1]);
    if (o.ears === 'big') p.c(skin).p([x - 3, hy - 1, x - 8, hy, x - 3, hy + 2]).p([x + 3, hy - 1, x + 8, hy, x + 3, hy + 2]);
    if (o.ears === 'fin') p.c(o.fin || COL.teal).p([x - 3, hy - 2, x - 7, hy - 5, x - 6, hy + 1]).p([x + 3, hy - 2, x + 7, hy - 5, x + 6, hy + 1]);
    const hc = o.hatCol || '#5a3b22';
    if (o.hat === 'hood') p.c(hc).p([x - 5, hy + 3, x - 4, hy - 4, x, hy - 6, x + 4, hy - 4, x + 5, hy + 3, x + 3, hy + 2, x + 2, hy - 2, x - 2, hy - 2, x - 3, hy + 2]);
    if (o.hat === 'hair') p.c(hc).p([x - 4, hy, x - 3, hy - 4, x + 3, hy - 4, x + 4, hy, x + 2, hy - 2, x - 2, hy - 2]);
    if (o.hat === 'long') p.c(hc).p([x - 4, hy + 2, x - 4, hy - 4, x + 4, hy - 4, x + 5, hy + 8, x + 3, hy + 8, x + 3, hy - 2, x - 3, hy - 2]);
    if (o.hat === 'helm') p.c(hc).p([x - 4, hy, x - 4, hy - 4, x + 4, hy - 4, x + 4, hy]).r(x - 1, hy - 6, 2, 2);
    if (o.hat === 'horns') p.c(hc).p([x - 3, hy - 3, x - 6, hy - 7, x - 2, hy - 4]).p([x + 3, hy - 3, x + 6, hy - 7, x + 2, hy - 4]);
    if (o.hat === 'brim') p.c(hc).r(x - 6, hy - 3, 12, 2).r(x - 3, hy - 6, 6, 3);
    if (o.hat === 'spikes') p.c(hc).p([x - 4, hy - 2, x - 5, hy - 7, x - 2, hy - 4, x, hy - 8, x + 2, hy - 4, x + 5, hy - 7, x + 4, hy - 2]);
    p.c(o.eye || INK).px(x - 2, hy).px(x + 1, hy);
    switch (o.hold) {
      case 'sword': p.c(tc).p([hx, ty + 5, hx + 1, ty - 9, hx + 3, ty - 9, hx + 2, ty + 5]); p.c('#5a3b22').r(hx - 1, ty + 5, 5, 2); break;
      case 'staff': p.c(o.holdCol || '#6b4a2e').l([hx + 1, y - 1, hx + 1, hy - 6], 1); p.c(o.tip || '#8ad0e8').e(hx + 1, hy - 7, 2, 2); break;
      case 'spear': p.c('#6b4a2e').l([hx + 1, y - 1, hx + 1, hy - 4], 1); p.c(tc).p([hx - 1, hy - 4, hx + 1, hy - 10, hx + 3, hy - 4]); break;
      case 'axe': p.c('#6b4a2e').l([hx + 1, ty + 8, hx + 1, hy - 4], 1); p.c(tc).p([hx + 1, hy - 4, hx + 6, hy - 6, hx + 6, hy + 2, hx + 1, hy + 1]); break;
      case 'torch': p.c('#6b4a2e').l([hx + 1, ty + 8, hx + 1, ty - 2], 2); p.c('#f08a2c').p([hx - 1, ty - 2, hx + 1, ty - 10, hx + 4, ty - 2]); p.c('#ffd45a').p([hx, ty - 2, hx + 1, ty - 6, hx + 3, ty - 2]); break;
      case 'bow': p.c('#6b4a2e').l([hx, hy - 2, hx + 4, ty + 4, hx, ty + 10], 1); p.c(COL.paper).l([hx, hy - 2, hx, ty + 10], 1); break;
      case 'shield': p.c(tc).p([hx - 2, ty, hx + 5, ty, hx + 5, ty + 8, hx + 1, ty + 13, hx - 2, ty + 8]); p.atop().c(o.tip || COL.tealD).r(hx + 1, ty, 4, 13).over(); break;
      case 'hook': p.c(COL.paper).l([hx + 1, ty + 5, hx + 6, ty - 4], 1); p.c(tc).l([hx + 6, ty - 4, hx + 9, ty - 6, hx + 10, ty - 2], 1); break;
      case 'book': p.c(o.holdCol || '#8a2a2a').r(hx - 1, ty + 1, 6, 7); p.c(COL.paper).r(hx, ty + 2, 4, 5); break;
      case 'orb': p.c(o.holdCol || COL.purple).e(hx + 2, ty + 2, 3, 3); p.c(COL.white).px(hx + 1, ty + 1); break;
      case 'dagger': p.c(tc).p([hx, ty + 6, hx + 1, ty - 1, hx + 2, ty + 6]); break;
      case 'map': p.c(COL.paper).r(hx - 1, ty, 7, 6); p.c(COL.red).px(hx + 1, ty + 2).px(hx + 3, ty + 3); break;
      case 'banner': p.c('#6b4a2e').l([hx + 1, y - 1, hx + 1, hy - 8], 1); p.c(o.holdCol || COL.red).p([hx + 2, hy - 8, hx + 9, hy - 6, hx + 2, hy - 2]); break;
    }
  },
  wings(p: Pen, x: number, y: number, col: string, s: number) {
    s = s || 1;
    p.c(col).p([x - 3, y, x - 16 * s, y - 12 * s, x - 13 * s, y - 2 * s, x - 9 * s, y + 6 * s]).p([x + 3, y, x + 16 * s, y - 12 * s, x + 13 * s, y - 2 * s, x + 9 * s, y + 6 * s]);
    p.c(shadeCol(col, 0.75)).l([x - 4, y + 1, x - 14 * s, y - 9 * s], 1).l([x + 4, y + 1, x + 14 * s, y - 9 * s], 1);
  },
  halo(p: Pen, x: number, y: number) { p.c(COL.gold).l(ringPts(x, y, 4, 1.5), 1); },
  // A four-legged beast facing left, feet at y, centre x. o: body, len, h, tail, horns, ears, stripes, eye.
  beast(p: Pen, x: number, y: number, o: Loose) {
    const b = o.body, d = shadeCol(b, 0.65), len = o.len || 14, h = o.h || 7, cy = y - 7 - h / 2, hx = x - len - 2;
    p.c(d).r(x - len + 3, y - 7, 3, 7).r(x + len - 7, y - 7, 3, 7);
    p.c(b).e(x, cy, len, h).e(hx, cy - 2, 5, 4.5).r(x - len + 7, y - 7, 3, 7).r(x + len - 3, y - 7, 3, 7);
    p.atop().c(d).e(x + 2, cy + h * 0.5, len, h * 0.6).over();
    if (o.tail) p.c(d).l([x + len - 1, cy - 2, x + len + 6, cy - 7], 2);
    if (o.horns) p.c(o.horns).p([hx - 2, cy - 6, hx - 5, cy - 13, hx, cy - 7]).p([hx + 2, cy - 6, hx + 3, cy - 13, hx + 4, cy - 6]);
    if (o.ears) p.c(b).p([hx - 2, cy - 6, hx - 3, cy - 10, hx + 1, cy - 7]).p([hx + 2, cy - 6, hx + 4, cy - 10, hx + 5, cy - 6]);
    if (o.stripes) { p.atop().c(d); for (let i = -1; i <= 1; i++) p.l([x + i * 7, cy - h, x + i * 7 + 2, cy + h], 2); p.over(); }
    p.c(o.eye || COL.white).px(hx - 2, cy - 3);
  },
  bird(p: Pen, x: number, y: number, col: string, s: number) {
    s = s || 1;
    p.c(col).p([x, y, x - 12 * s, y - 9 * s, x - 5 * s, y - 1 * s]).p([x, y, x + 12 * s, y - 9 * s, x + 5 * s, y - 1 * s]).e(x, y + 1, 3 * s, 2.5 * s);
    p.c(shadeCol(col, 0.7)).p([x - 1, y + 3 * s, x, y + 7 * s, x + 1, y + 3 * s]);
    p.c('#f08a2c').p([x - 3 * s, y + 1, x - 6 * s, y + 2, x - 3 * s, y + 3]);
  },
  flame(p: Pen, x: number, y: number, w: number, h: number, c1?: string, c2?: string) {
    p.c(c1 || '#f08a2c').p([x - w / 2, y, x - w * 0.3, y - h * 0.55, x - w * 0.12, y - h * 0.3, x, y - h, x + w * 0.15, y - h * 0.35, x + w * 0.32, y - h * 0.6, x + w / 2, y]);
    p.c(c2 || '#ffd45a').p([x - w * 0.25, y, x - w * 0.1, y - h * 0.35, x, y - h * 0.6, x + w * 0.12, y - h * 0.3, x + w * 0.25, y]);
  },
  bolt(p: Pen, x: number, y: number, h: number, col?: string) { p.c(col || '#ffe9a0').p([x + 4, y, x - 4, y + h * 0.5, x, y + h * 0.5, x - 5, y + h, x + 6, y + h * 0.4, x + 1, y + h * 0.4, x + 7, y]); },
  wave(p: Pen, x: number, y: number, w: number, h: number, col?: string) {
    col = col || '#2f7ab8';
    p.c(col).p([x, y, x + w * 0.1, y - h * 0.6, x + w * 0.35, y - h, x + w * 0.62, y - h * 0.85, x + w * 0.7, y - h * 0.5, x + w * 0.55, y - h * 0.55, x + w * 0.42, y - h * 0.35, x + w * 0.5, y, x + w, y]);
    p.c(shadeCol(col, 1.5)).l([x + w * 0.14, y - h * 0.55, x + w * 0.36, y - h * 0.9, x + w * 0.58, y - h * 0.8], 1);
    p.c(COL.white).px(Math.round(x + w * 0.66), Math.round(y - h * 0.62)).px(Math.round(x + w * 0.72), Math.round(y - h * 0.4));
  },
  hedron(p: Pen, x: number, y: number, w: number, h: number) {
    p.c(COL.hedron).p([x, y - h, x + w / 2, y - h * 0.58, x, y, x - w / 2, y - h * 0.58]);
    p.atop().c(COL.hedronD).p([x, y - h, x + w / 2, y - h * 0.58, x, y]).c(COL.hedronL).p([x, y - h + 1, x - w / 2 + 1, y - h * 0.58, x, y - h * 0.58]).over();
  },
  rock(p: Pen, x: number, y: number, w: number, h: number, col?: string) {
    col = col || '#7a6a5a';
    p.c(col).p([x - w / 2, y, x - w * 0.35, y - h * 0.8, x + w * 0.1, y - h, x + w / 2, y - h * 0.5, x + w * 0.4, y]);
    p.atop().c(shadeCol(col, 0.65)).p([x + w * 0.1, y - h, x + w / 2, y - h * 0.5, x + w * 0.4, y, x, y]).over();
  },
  peak(p: Pen, x: number, y: number, w: number, h: number, col: string) { p.c(col).p([x - w / 2, y, x, y - h, x + w / 2, y]); p.atop().c(shadeCol(col, 0.65)).p([x, y - h, x + w / 2, y, x + w * 0.1, y]).over(); },
  tree(p: Pen, x: number, y: number, h: number, col?: string) {
    col = col || '#3f8a4a';
    p.c('#6b4a2e').r(x - 1, y - h * 0.45, 3, h * 0.45); p.c(col).e(x, y - h * 0.68, h * 0.34, h * 0.32);
    p.atop().c(shadeCol(col, 0.7)).e(x + 2, y - h * 0.58, h * 0.32, h * 0.24).over();
  },
  skull(p: Pen, x: number, y: number, s: number) {
    s = s || 1;
    p.c(COL.paper).e(x, y, 5 * s, 4.5 * s).r(x - 3 * s, y + 3 * s, 6 * s, 3 * s);
    p.c(INK).r(x - 3 * s, y - 1, 2 * s, 2 * s).r(x + s, y - 1, 2 * s, 2 * s).px(x, y + 3 * s);
  },
  gem(p: Pen, x: number, y: number, s: number, col: string) {
    p.c(col).p([x - s, y - s * 0.4, x - s * 0.5, y - s, x + s * 0.5, y - s, x + s, y - s * 0.4, x, y + s]);
    p.atop().c(shadeCol(col, 0.65)).p([x, y - s, x + s, y - s * 0.4, x, y + s]).over(); p.c(COL.white).px(Math.round(x - s * 0.5), Math.round(y - s * 0.6));
  },
  arch(p: Pen, x: number, y: number, w: number, h: number, col: string) {
    col = col || '#8a8478';
    p.c(col).r(x - w / 2, y - h, 4, h).r(x + w / 2 - 4, y - h, 4, h).r(x - w / 2 - 1, y - h - 3, w + 2, 4);
    p.atop().c(shadeCol(col, 0.65)).r(x + w / 2 - 2, y - h, 2, h).over();
  },
  pillar(p: Pen, x: number, y: number, h: number, col?: string) { col = col || '#8a8478'; p.c(col).r(x - 2, y - h, 5, h).r(x - 3, y - h - 2, 7, 2); p.atop().c(shadeCol(col, 0.65)).r(x + 1, y - h, 2, h).over(); },
  paper(p: Pen, x: number, y: number, w: number, h: number) { p.c(COL.paper).r(x, y, w, h); p.c(COL.paperD).r(x, y, 2, h).r(x + w - 2, y, 2, h); },
  // The mark of a trap: a row of teeth along the bottom.
  jaws(p: Pen, x: number, y: number, w: number) { p.c('#6a7280').r(x - w / 2, y - 3, w, 3); p.c(COL.paper); for (let i = 0; i + 4 <= w; i += 4) p.p([x - w / 2 + i, y - 3, x - w / 2 + i + 2, y - 8, x - w / 2 + i + 4, y - 3]); },
  net(p: Pen, x: number, y: number, w: number, h: number, col?: string) { p.c(col || COL.paper); for (let i = 0; i <= w; i += 5) p.l([x + i, y, x + i, y + h], 1); for (let j = 0; j <= h; j += 5) p.l([x, y + j, x + w, y + j], 1); },
  ring(p: Pen, x: number, y: number, rx: number, ry: number, col: string, w: number) { p.c(col).l(ringPts(x, y, rx, ry), w || 2); },
  spark(p: Pen, x: number, y: number, col: string) { p.c(col || COL.white).l([x - 2, y, x + 2, y], 1).l([x, y - 2, x, y + 2], 1); },
  drop(p: Pen, x: number, y: number, col?: string) { p.c(col || COL.red).p([x, y - 4, x + 2, y, x - 2, y]).e(x, y + 1, 2, 2); },
  eye(p: Pen, x: number, y: number, col: string) { p.c(COL.white).e(x, y, 6, 3.5); p.c(col || COL.blue).e(x, y, 2.5, 2.5); p.c(INK).px(x, y); },
  cloud(p: Pen, x: number, y: number, w: number, col?: string) { p.c(col || '#c8d0d8').e(x, y, w * 0.5, 3).e(x - w * 0.2, y - 2, w * 0.25, 3).e(x + w * 0.18, y - 3, w * 0.22, 3); },
  sun(p: Pen, x: number, y: number, r: number) { p.c('#ffe9a0').e(x, y, r, r); },
  // The mark of a quest or an expedition: a small flag.
  flag(p: Pen, x: number, y: number, col?: string) { p.c('#6b4a2e').l([x, y, x, y - 14], 1); p.c(col || COL.red).p([x + 1, y - 14, x + 9, y - 11, x + 1, y - 8]); },
  urn(p: Pen, x: number, y: number, col: string) { p.c(col).p([x - 4, y, x - 6, y - 7, x - 3, y - 12, x + 3, y - 12, x + 6, y - 7, x + 4, y]).r(x - 3, y - 14, 6, 2); p.atop().c(shadeCol(col, 0.65)).r(x + 1, y - 12, 5, 12).over(); },
  blade(p: Pen, x1: number, y1: number, x2: number, y2: number, col?: string) { p.c(col || '#cfd6de').l([x1, y1, x2, y2], 3); p.c('#f4f8fc').l([x1, y1, x2, y2], 1); },
  hand(p: Pen, x: number, y: number, col: string, up?: number) {
    const u = up === -1 ? -1 : 1;
    p.c(col).e(x, y, 4, 4).r(x - 2, y + u * 2, 4, 5 * u)
      .l([x - 3, y - u * 2, x - 6, y - u * 9], 2).l([x - 1, y - u * 3, x - 2, y - u * 11], 2).l([x + 1, y - u * 3, x + 2, y - u * 11], 2).l([x + 3, y - u * 2, x + 6, y - u * 9], 2).l([x + 4, y + u, x + 8, y - u * 2], 2);
  },
  tent(p: Pen, x: number, y: number, col: string) { p.c(col).p([x - 8, y, x, y - 10, x + 8, y]); p.c(INK).p([x - 2, y, x, y - 5, x + 2, y]); },
  reeds(p: Pen, x: number, y: number, col?: string) { p.c(col || '#7a9a52').l([x, y, x, y - 8], 1).l([x + 3, y, x + 4, y - 6], 1).l([x - 3, y, x - 4, y - 5], 1); },
  water(p: Pen, y: number, col: string) { p.c(col || '#2f7ab8').r(0, y, 64, 36 - y); p.c(shadeCol(col || '#2f7ab8', 1.4)).l([6, y + 3, 16, y + 3], 1).l([30, y + 5, 44, y + 5], 1).l([50, y + 2, 60, y + 2], 1); },
};

(function () {
  const A = AK, kor = SK.kor, mer = SK.mer, elf = SK.elf, gob = SK.gob, vamp = SK.vamp;
  const P2: Record<string, (p: Pen) => void> = {
    // ---- Akoum ----
    'highland-berserker'(p: Pen) { A.peak(p, 50, 34, 22, 20, '#5a2428'); A.person(p, 28, 33, { body: '#8a3a2a', hat: 'hair', hatCol: '#b0502a', hold: 'axe' }); },
    'tuktuk-grunts'(p: Pen) { A.person(p, 16, 33, { skin: gob, body: '#6a5a3a', short: 1, ears: 'big', hold: 'torch' }); A.person(p, 32, 34, { skin: gob, body: '#5a4a6a', short: 1, ears: 'big', hold: 'dagger' }); A.person(p, 48, 33, { skin: gob, body: '#4a6a4a', short: 1, ears: 'big', hold: 'map' }); },
    'eldrazi-monument'(p: Pen) { p.c('#8a94a0').p([26, 32, 28, 14, 24, 9, 32, 2, 40, 9, 36, 14, 38, 32]); p.atop().c('#5f6a7a').p([32, 2, 40, 9, 36, 14, 38, 32, 32, 32]).over(); p.c('#8a94a0').l([27, 32, 22, 35], 2).l([37, 32, 43, 35], 2).l([32, 32, 32, 35], 2); p.c(INK).l([30, 8, 33, 14, 30, 20], 1); A.rock(p, 10, 14, 10, 6); A.rock(p, 54, 10, 8, 5); },
    'khalni-gem'(p: Pen) { A.gem(p, 32, 17, 10, '#4fc86a'); A.spark(p, 16, 9, '#c8f4c8'); A.spark(p, 48, 12, '#c8f4c8'); p.c(COL.pink).p([20, 30, 26, 25, 32, 30]).p([32, 30, 38, 25, 44, 30]); },
    'goblin-war-paint'(p: Pen) { p.c(gob).p([22, 15, 9, 9, 20, 23]).p([42, 15, 55, 9, 44, 23]).e(32, 19, 10, 11); p.c(COL.red).r(24, 14, 16, 2).l([26, 22, 30, 27], 2).l([38, 22, 34, 27], 2); p.c('#ffe9a0').r(27, 17, 3, 2).r(35, 17, 3, 2); p.c(INK).px(28, 17).px(36, 17).l([28, 30, 36, 30], 1); },
    'caravan-hurda'(p: Pen) { p.c('#8a6a3e').r(40, 16, 20, 11); p.c('#5a3b22').e(45, 30, 4, 4).e(57, 30, 4, 4); p.c(COL.paper).p([40, 16, 50, 8, 60, 16]); A.beast(p, 22, 33, { body: '#9a8a6a', len: 12, h: 9, tail: 1 }); },
    'goblin-shortcutter'(p: Pen) { p.c(COL.paper).r(8, 30, 3, 1).r(14, 27, 3, 1).r(20, 29, 3, 1).r(46, 28, 3, 1).r(52, 25, 3, 1); A.person(p, 32, 33, { skin: gob, body: '#6a5a3a', short: 1, ears: 'big', hold: 'map' }); p.c(COL.gold).p([50, 14, 58, 18, 50, 22]).r(42, 17, 8, 2); },
    'lullmage-mentor'(p: Pen) { A.ring(p, 32, 20, 22, 12, '#8ad0e8', 1); A.ring(p, 32, 20, 14, 8, '#8ad0e8', 1); A.person(p, 32, 33, { skin: mer, body: '#3a5a8a', robe: 1, ears: 'fin', hold: 'staff' }); },
    'reckless-scholar'(p: Pen) { p.c(COL.paper).r(10, 8, 6, 5).r(46, 6, 6, 5).r(50, 18, 6, 5).r(12, 20, 5, 4); A.person(p, 30, 33, { body: '#5a4a7a', robe: 1, hat: 'hair', hold: 'book' }); },
    'torch-slinger'(p: Pen) { A.person(p, 22, 33, { skin: gob, body: '#6a4a3a', short: 1, ears: 'big' }); p.c('#6b4a2e').l([40, 14, 48, 10], 2); A.flame(p, 50, 10, 8, 9); p.c('#f08a2c').px(34, 20).px(37, 17); },
    'zendikar-farguide'(p: Pen) { A.tree(p, 30, 26, 26, '#4f9a5a'); p.c('#6b4a2e').l([28, 26, 24, 33], 2).l([32, 26, 36, 33], 2); p.c('#ffe9a0').px(27, 12).px(33, 12); p.c(COL.paper).r(44, 31, 3, 1).r(50, 29, 3, 1).r(56, 31, 3, 1); },
    'electropotence'(p: Pen) { A.ring(p, 32, 18, 16, 13, COL.red, 2); A.bolt(p, 30, 3, 30); A.spark(p, 12, 10, '#ffe9a0'); A.spark(p, 52, 26, '#ffe9a0'); },
    'disfigure'(p: Pen) { p.c('#c8a0a0').e(32, 27, 11, 8); p.c(INK).px(27, 26).px(36, 26).l([29, 31, 35, 31], 1); A.hand(p, 32, 8, '#e8e0f0', -1); p.c(COL.purple).l([26, 20, 25, 30], 1).l([30, 21, 30, 32], 1).l([34, 21, 34, 32], 1).l([38, 20, 39, 30], 1); },
    'punishing-fire'(p: Pen) { A.ring(p, 32, 18, 20, 14, '#ffd45a', 1); p.c('#ffd45a').p([50, 10, 56, 12, 51, 16]); A.flame(p, 32, 32, 20, 26); },
    'seismic-shudder'(p: Pen) { p.c('#5a3e28').r(0, 24, 64, 12); p.c(INK).l([4, 26, 14, 30, 22, 25, 32, 33, 42, 26, 52, 31, 62, 27], 2); A.rock(p, 16, 20, 9, 7); A.rock(p, 44, 16, 11, 8); A.rock(p, 30, 10, 7, 5); },
    'summoners-bane'(p: Pen) { A.person(p, 28, 33, { skin: '#8ad0e8', body: '#4a8ac8', robe: 1, hat: 'hood', hatCol: '#4a8ac8', eye: COL.white }); p.c(COL.red).l([40, 8, 54, 22], 2).l([54, 8, 40, 22], 2); },
    'trapmakers-snare'(p: Pen) { p.c('#6b4a2e').l([14, 34, 14, 10], 2); p.c(COL.paper).l([14, 11, 30, 8, 36, 14], 1); A.ring(p, 38, 20, 8, 6, COL.paper, 1); A.jaws(p, 44, 35, 24); },
    'chandra-ablaze'(p: Pen) { A.flame(p, 12, 34, 14, 22); A.flame(p, 52, 34, 14, 20); A.person(p, 32, 33, { body: '#a8342c', hat: 'spikes', hatCol: '#f08a2c', cape: '#701c22' }); },
    'sorin-markov'(p: Pen) { p.c('#3a3048').e(32, 14, 22, 10); A.person(p, 30, 33, { skin: vamp, body: '#241c2c', hat: 'long', hatCol: '#e8e0f0', cape: '#4a1420', hold: 'sword' }); },
    'ior-ruin-expedition'(p: Pen) { A.water(p, 20, '#2f6a98'); A.arch(p, 34, 34, 16, 9, '#5a7a8a'); A.rock(p, 8, 22, 14, 8); A.flag(p, 9, 16); },
    'khalni-heart-expedition'(p: Pen) { p.c('#3f6a3a').r(4, 28, 56, 8).r(14, 22, 36, 6).r(24, 16, 16, 6); A.gem(p, 32, 9, 6, COL.pink); A.flag(p, 54, 28); },
    'pyromancer-ascension'(p: Pen) { A.flame(p, 28, 33, 22, 28); A.ring(p, 28, 18, 18, 15, '#ffd45a', 1); A.flag(p, 54, 33); },
    'quest-for-the-gemblades'(p: Pen) { A.blade(p, 14, 30, 36, 6); A.blade(p, 42, 30, 20, 6); A.gem(p, 28, 31, 3, '#4fc86a'); A.flag(p, 54, 33); },
    'day-of-judgment'(p: Pen) { A.sun(p, 32, 12, 8); p.c('#ffe9a0'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.l([32 + Math.cos(a) * 11, 12 + Math.sin(a) * 9, 32 + Math.cos(a) * 26, 12 + Math.sin(a) * 20], 1); } A.skull(p, 16, 29, 0.8); A.skull(p, 46, 30, 0.8); },
    'elemental-appeal'(p: Pen) { A.flame(p, 32, 34, 26, 32, '#d8483c', '#f08a2c'); p.c('#ffe9a0').r(27, 16, 3, 3).r(35, 16, 3, 3); p.c('#d8483c').l([20, 24, 10, 16], 3).l([44, 24, 54, 16], 3); },
    'landbind-ritual'(p: Pen) { A.ring(p, 32, 30, 20, 5, '#e0c860', 1); A.person(p, 22, 32, { skin: kor, body: '#8a6a3e', robe: 1 }); A.person(p, 42, 32, { skin: kor, body: '#7a5a3a', robe: 1 }); p.c('#5a3e28').e(32, 31, 5, 3); },
    'magma-rift'(p: Pen) { p.c('#3a2a22').r(0, 20, 64, 16); p.c('#f08a2c').p([20, 20, 30, 20, 36, 36, 26, 36]); p.c('#ffd45a').p([24, 20, 28, 20, 32, 36, 29, 36]); A.flame(p, 27, 20, 10, 12); },
    'mark-of-mutiny'(p: Pen) { A.beast(p, 34, 33, { body: '#7a5a4a', len: 13, h: 7, horns: COL.paper, tail: 1, eye: COL.red }); A.ring(p, 32, 9, 7, 6, COL.red, 2); p.c(COL.red).l([28, 9, 36, 9], 1).l([32, 5, 32, 13], 1); },
    'spire-barrage'(p: Pen) { A.rock(p, 14, 14, 10, 8); A.rock(p, 34, 9, 9, 7); A.rock(p, 50, 18, 11, 8); p.c('#48a8b8').p([24, 22, 27, 12, 30, 22]).p([44, 28, 46, 20, 48, 28]); A.person(p, 30, 35, { skin: gob, body: '#6a5a3a', short: 1, ears: 'big' }); },
    'archive-trap'(p: Pen) { A.paper(p, 8, 8, 10, 12); A.paper(p, 22, 6, 10, 14); p.c('#7a6a5a').r(36, 2, 22, 8).p([40, 12, 48, 12, 46, 20, 42, 20]); A.jaws(p, 32, 35, 40); },
    'lavaball-trap'(p: Pen) { p.c('#f08a2c').e(32, 15, 13, 12); p.c('#ffd45a').e(28, 11, 5, 4); p.c('#8a2a2a').e(37, 19, 3, 3).e(30, 22, 2, 2); A.jaws(p, 32, 35, 40); },
    'lethargy-trap'(p: Pen) { p.c(COL.purple).l([32, 16, 38, 16, 38, 22, 28, 22, 28, 10, 44, 10, 44, 26, 22, 26], 2); p.c(COL.white).l([10, 6, 16, 6, 10, 12, 16, 12], 1); A.jaws(p, 32, 35, 40); },
    'runeflare-trap'(p: Pen) { A.hedron(p, 32, 28, 16, 26); p.c('#ffe9a0').l([30, 12, 34, 12], 1).l([30, 16, 34, 18], 1).l([10, 8, 20, 12], 1).l([54, 8, 44, 12], 1).l([8, 20, 20, 18], 1).l([56, 20, 44, 18], 1); A.jaws(p, 32, 35, 40); },
    'summoning-trap'(p: Pen) { A.ring(p, 32, 15, 14, 12, COL.purple, 2); A.beast(p, 34, 24, { body: '#3a3048', len: 8, h: 5, horns: '#3a3048', eye: COL.red }); A.jaws(p, 32, 35, 40); },
    'whiplash-trap'(p: Pen) { p.c('#8a6a3e').l([8, 26, 20, 10, 34, 8, 44, 14, 40, 22, 32, 20], 2); p.c(COL.paper).l([32, 20, 28, 16], 1); A.jaws(p, 32, 35, 40); },
    // ---- Bala Ged ----
    'bala-ged-thief'(p: Pen) { A.person(p, 28, 33, { body: '#3a4a3a', hat: 'hood', hatCol: '#2a3a2a', hold: 'dagger' }); A.gem(p, 48, 22, 5, COL.gold); A.spark(p, 54, 12, COL.gold); },
    'joraga-bard'(p: Pen) { A.person(p, 28, 33, { skin: elf, body: '#4f7a4a', ears: 'point', hat: 'hair', hatCol: '#3a2a1e' }); p.c('#8a6a3e').e(40, 22, 4, 5).l([40, 18, 46, 8], 2); p.c(COL.white).px(50, 8).px(54, 14).px(48, 16); },
    'savage-silhouette'(p: Pen) { A.beast(p, 34, 33, { body: '#14241a', len: 14, h: 8, ears: 1, tail: 1, eye: '#8af0c0' }); A.ring(p, 32, 20, 24, 14, '#4f9a5a', 1); },
    'greenweaver-druid'(p: Pen) { A.person(p, 28, 33, { skin: elf, body: '#3f6a3a', robe: 1, ears: 'point', hat: 'hood', hatCol: '#2f5a2a', hold: 'staff', tip: '#7ac87a' }); p.c('#7ac87a').p([46, 26, 50, 16, 54, 26]).p([50, 30, 56, 22, 58, 30]); },
    'nissas-chosen'(p: Pen) { A.person(p, 30, 33, { skin: elf, body: '#3f6a3a', ears: 'point', hat: 'helm', hatCol: '#7ac87a', hold: 'spear' }); A.tree(p, 52, 34, 22); },
    'hideous-end'(p: Pen) { p.c('#4a2a5a').e(32, 20, 24, 12); A.skull(p, 32, 16, 1.4); p.c(INK).e(18, 28, 2, 1.5).e(46, 30, 2, 1.5).e(40, 8, 2, 1.5).e(22, 10, 2, 1.5); },
    'tanglesap'(p: Pen) { p.c('#3f6a3a').l([6, 6, 20, 16, 30, 8, 44, 18, 58, 8], 2).l([8, 28, 22, 20, 36, 30, 50, 22, 60, 30], 2); A.drop(p, 20, 22, COL.amber); A.drop(p, 44, 26, COL.amber); A.drop(p, 32, 14, COL.amberL); },
    'nissa-revane'(p: Pen) { A.ring(p, 32, 18, 20, 15, '#7ac87a', 1); A.person(p, 32, 33, { skin: elf, body: '#2f5a3a', robe: 1, ears: 'point', hat: 'long', hatCol: '#241a14', hold: 'staff', tip: '#7ac87a' }); },
    'beastmaster-ascension'(p: Pen) { A.beast(p, 28, 33, { body: '#6a5a3a', len: 13, h: 8, horns: COL.paper, tail: 1 }); A.flag(p, 54, 33); },
    // ---- Guul Draz ----
    'hagra-diabolist'(p: Pen) { A.ring(p, 46, 12, 7, 6, COL.red, 1); p.c(COL.red).l([42, 12, 50, 12], 1).l([46, 8, 46, 16], 1); A.person(p, 26, 33, { skin: SK.ogre, body: '#4a3a4a', robe: 1, hat: 'horns', hatCol: COL.paper, hold: 'staff', tip: COL.red }); },
    'gigantiform'(p: Pen) { p.c('#3a4a2a').e(32, 22, 18, 9); p.atop().c('#24301c').e(36, 26, 16, 6).over(); p.c('#3a4a2a').l([16, 20, 6, 10, 10, 8], 3).l([20, 30, 16, 35], 2).l([32, 31, 32, 35], 2).l([44, 30, 48, 35], 2); p.c(SK.human).e(34, 10, 2, 2); p.c('#8a3a2a').r(32, 11, 4, 4); },
    'mire-blight'(p: Pen) { p.c('#241a14').l([32, 34, 32, 12], 3).l([32, 18, 22, 8], 2).l([32, 14, 42, 6], 2); p.c('#7a9a52').e(14, 26, 3, 3).e(48, 22, 4, 4).e(52, 30, 2, 2).e(20, 16, 2, 2); },
    'cosis-trickster'(p: Pen) { p.c('#8ad0e8').l([44, 8, 54, 12, 52, 22, 42, 24, 38, 16, 46, 14], 1); A.person(p, 26, 33, { skin: mer, body: '#5a3a6a', robe: 1, ears: 'fin', hold: 'orb', holdCol: '#f08a2c' }); },
    'blade-of-the-bloodchief'(p: Pen) { A.blade(p, 14, 30, 46, 6, '#cfd6de'); A.blade(p, 20, 32, 52, 10, '#a8b0bc'); p.c('#5a1420').r(10, 28, 10, 5); A.gem(p, 15, 30, 2, COL.red); },
    'bloodchief-ascension'(p: Pen) { p.c(COL.white).p([22, 6, 27, 6, 25, 20]).p([35, 6, 40, 6, 38, 20]); A.drop(p, 25, 26); A.drop(p, 38, 28); A.flag(p, 54, 33); },
    'blood-tribute'(p: Pen) { A.urn(p, 32, 33, COL.goldD); p.c(COL.red).e(32, 19, 5, 2); A.drop(p, 32, 10); A.drop(p, 22, 14); A.drop(p, 42, 13); },
    'desecrated-earth'(p: Pen) { p.c('#2a3a24').r(0, 26, 64, 10); p.c('#4a6a3a').p([18, 28, 22, 12, 28, 22, 32, 4, 36, 22, 42, 10, 46, 28]); p.c('#7a9a52').e(12, 22, 2, 2).e(52, 18, 3, 3).e(50, 8, 2, 2); },
    'feast-of-blood'(p: Pen) { A.person(p, 20, 33, { skin: vamp, body: '#3a1420', cape: '#241c2c', hat: 'hair', hatCol: '#241c2c', eye: COL.red }); A.person(p, 44, 33, { skin: vamp, body: '#241c2c', cape: '#5a1420', hat: 'long', hatCol: '#e8e0f0', eye: COL.red }); A.drop(p, 32, 14); },
    'grim-discovery'(p: Pen) { A.arch(p, 44, 34, 18, 20, '#5a6a5a'); A.skull(p, 20, 26, 1.2); p.c('#7a9a52').l([6, 34, 34, 34], 1); },
    'marsh-casualties'(p: Pen) { A.water(p, 22, '#2a4a3a'); A.hand(p, 18, 17, SK.human); A.hand(p, 44, 15, kor); p.c('#2a4a3a').r(10, 22, 16, 4).r(36, 21, 16, 5); },
    'mind-sludge'(p: Pen) { p.c(SK.human).e(24, 14, 9, 10); p.c(INK).px(27, 12).e(30, 20, 3, 2); p.c('#14101c').p([28, 20, 34, 20, 40, 34, 30, 34]); p.c('#3a3048').l([33, 24, 37, 33], 1); },
    'sadistic-sacrament'(p: Pen) { p.c('#5a4a5a').r(18, 26, 28, 8).r(22, 22, 20, 4); p.c('#cfd6de').p([30, 4, 34, 4, 35, 8, 33, 10, 35, 13, 33, 15, 32, 20, 31, 15, 29, 13, 31, 10, 29, 8]); A.drop(p, 32, 24); },
    'needlebite-trap'(p: Pen) { p.c('#cfd6de').l([14, 4, 20, 22], 1).l([26, 2, 28, 22], 1).l([38, 2, 36, 22], 1).l([50, 4, 44, 22], 1); A.drop(p, 20, 25); A.drop(p, 44, 25); A.jaws(p, 32, 35, 40); },
    'ravenous-trap'(p: Pen) { p.c('#8a2a3a').e(32, 18, 26, 15); p.c('#3a1420').e(32, 18, 18, 9); p.c(COL.paper); for (let i = 0; i < 7; i++) p.p([16 + i * 5, 10, 18 + i * 5, 16, 20 + i * 5, 10]).p([16 + i * 5, 27, 18 + i * 5, 21, 20 + i * 5, 27]); },
    // ---- Murasa ----
    'kazuul-warlord'(p: Pen) { A.person(p, 28, 33, { skin: SK.mino, body: '#6a3a2a', hat: 'horns', hatCol: COL.paper, hold: 'banner' }); A.rock(p, 52, 34, 16, 14); },
    'murasa-pyromancer'(p: Pen) { A.flame(p, 50, 34, 16, 22); A.person(p, 26, 33, { body: '#8a3a2a', hat: 'hair', hatCol: '#241a14', hold: 'torch' }); },
    'carnage-altar'(p: Pen) { p.c('#6a7268').r(18, 24, 28, 9).r(14, 21, 36, 4); p.c(COL.red).r(26, 21, 10, 2).l([30, 23, 30, 30], 1); A.pillar(p, 8, 33, 16, '#5a6258'); A.pillar(p, 56, 33, 12, '#5a6258'); },
    'frontier-guide'(p: Pen) { A.tree(p, 52, 34, 26); A.person(p, 26, 33, { skin: elf, body: '#5a6a3a', ears: 'point', hat: 'hair', hatCol: '#8a6a3e', hold: 'map' }); },
    'pillarfield-ox'(p: Pen) { p.c('#8a8478').r(8, 26, 48, 10); p.c('#4f9a5a').r(8, 24, 48, 3); A.beast(p, 34, 25, { body: '#8a6a4a', len: 12, h: 7, horns: COL.paper, tail: 1 }); },
    'quest-for-pure-flame'(p: Pen) { A.flame(p, 28, 33, 18, 28, '#ffd45a', COL.white); A.flag(p, 54, 33); },
    'zektar-shrine-expedition'(p: Pen) { A.arch(p, 26, 34, 22, 20, '#7a6a5a'); A.flame(p, 26, 34, 10, 14, '#d8483c', '#f08a2c'); A.flag(p, 54, 33); },
    'trapfinders-trick'(p: Pen) { A.person(p, 20, 30, { body: '#5a6a4a', hat: 'hood', hatCol: '#4a5a3a', hold: 'staff', tip: COL.gold }); A.spark(p, 44, 20, COL.gold); A.jaws(p, 44, 35, 28); },
    // ---- Ondu ----
    'kabira-evangel'(p: Pen) { A.flame(p, 50, 34, 10, 12); A.person(p, 26, 33, { body: '#d8d0c0', robe: 1, hat: 'hair', hatCol: '#8a8478', hold: 'staff', tip: COL.gold }); },
    'ondu-cleric'(p: Pen) { A.person(p, 26, 33, { skin: kor, body: '#c8b888', robe: 1, hold: 'staff', tip: '#7ac87a' }); p.c('#7ac87a').r(46, 12, 2, 8).r(43, 15, 8, 2).r(52, 24, 2, 6).r(50, 26, 6, 2); },
    'turntimber-ranger'(p: Pen) { A.person(p, 20, 33, { skin: elf, body: '#4a6a3a', ears: 'point', hat: 'hood', hatCol: '#3a5a2a', hold: 'bow' }); A.beast(p, 48, 33, { body: '#7a7a82', len: 8, h: 5, ears: 1, tail: 1 }); },
    'expedition-map'(p: Pen) { A.paper(p, 10, 6, 44, 24); p.c('#8ab07a').p([18, 10, 28, 9, 26, 17, 19, 16]).p([36, 18, 46, 17, 47, 25, 38, 26]); p.c(COL.red).r(22, 22, 2, 1).r(26, 20, 2, 1).r(30, 21, 2, 1).r(34, 19, 2, 1).l([42, 9, 46, 13], 1).l([46, 9, 42, 13], 1); },
    'predatory-urge'(p: Pen) { A.bird(p, 46, 9, '#c8d0d8', 0.8); A.beast(p, 28, 30, { body: '#7a4a2a', len: 14, h: 8, ears: 1, tail: 1, eye: COL.gold }); p.c(COL.paper).l([10, 20, 6, 24], 1).l([13, 22, 10, 27], 1); },
    'aether-figment'(p: Pen) { A.person(p, 32, 33, { skin: '#c8b8f0', body: '#9a78d8', robe: 1, hat: 'hood', hatCol: '#9a78d8', eye: COL.white }); A.spark(p, 14, 12, '#c8b8f0'); A.spark(p, 50, 18, '#c8b8f0'); A.spark(p, 46, 6, COL.white); },
    'armament-master'(p: Pen) { A.person(p, 26, 33, { skin: kor, body: '#7a8494', hat: 'helm', hatCol: '#a8b0bc', hold: 'sword' }); p.c('#cfd6de').p([10, 14, 18, 14, 18, 23, 14, 28, 10, 23]); A.blade(p, 46, 30, 56, 10); p.c(COL.paper).l([42, 10, 48, 14, 50, 8], 1); },
    'cliff-threader'(p: Pen) { p.c('#7a5a4a').r(0, 10, 14, 26).r(50, 14, 14, 22); p.c(COL.paper).l([14, 12, 50, 16], 1); p.c(kor).e(32, 17, 2, 2); p.c('#8a6a3e').r(30, 19, 4, 6); },
    'devout-lightcaster'(p: Pen) { A.sun(p, 46, 9, 6); p.c('#ffe9a0').l([46, 17, 46, 30], 1).l([38, 14, 28, 24], 1).l([54, 14, 60, 22], 1); A.person(p, 24, 33, { skin: kor, body: '#d8d0b0', robe: 1, hold: 'staff', tip: '#ffe9a0' }); },
    'kor-aeronaut'(p: Pen) { A.cloud(p, 14, 28, 18); A.cloud(p, 50, 30, 16); A.wings(p, 32, 14, COL.paper, 1.1); A.person(p, 32, 30, { skin: kor, body: '#7a8494' }); },
    'kor-duelist'(p: Pen) { A.person(p, 26, 33, { skin: kor, body: '#6a7a8a', hat: 'hair', hatCol: '#a8b0bc', hold: 'sword' }); p.c('#a8b0bc').l([36, 22, 42, 26, 48, 22, 54, 26, 58, 20], 1); },
    'kor-hookmaster'(p: Pen) { A.person(p, 22, 33, { skin: kor, body: '#8a7a5a', hold: 'hook' }); A.ring(p, 48, 18, 8, 7, COL.paper, 1); p.c(COL.paper).l([32, 16, 40, 18], 1); },
    'kor-outfitter'(p: Pen) { A.person(p, 22, 33, { skin: kor, body: '#8a6a3e' }); p.c('#8a6a3e').r(40, 26, 14, 8); p.c('#6b4a2e').r(40, 24, 14, 3); p.c(COL.gold).r(46, 27, 2, 3); A.blade(p, 44, 22, 52, 8); },
    'kor-sanctifiers'(p: Pen) { A.person(p, 18, 33, { skin: kor, body: '#d8d0b0', robe: 1 }); A.person(p, 34, 33, { skin: kor, body: '#c8c0a0', robe: 1, hold: 'staff', tip: COL.white }); A.gem(p, 52, 26, 4, COL.purple); p.c(INK).l([50, 22, 54, 30], 1); },
    'kor-skyfisher'(p: Pen) { p.c(COL.paper).p([20, 4, 44, 10, 26, 20]); p.c('#8a6a3e').l([28, 12, 30, 24], 1); p.c(kor).e(30, 25, 2, 2); p.c('#5a8a9a').l([40, 26, 48, 22, 54, 28, 60, 24], 2); },
    'kraken-hatchling'(p: Pen) { A.water(p, 26, '#1c4a78'); p.c('#c8a070').p([22, 26, 26, 12, 34, 8, 42, 14, 44, 26]); p.atop().c('#a07a50').l([28, 14, 30, 26], 1).l([34, 10, 35, 26], 1).l([40, 14, 39, 26], 1).over(); p.c('#8a5a8a').l([24, 26, 18, 32], 2).l([32, 26, 32, 34], 2).l([42, 26, 48, 32], 2); p.c(INK).px(30, 19).px(37, 19); },
    'spidersilk-net'(p: Pen) { A.tree(p, 8, 34, 30); A.tree(p, 56, 34, 30); A.net(p, 14, 8, 36, 20); },
    'trailblazers-boots'(p: Pen) { p.c('#6b4a2e').p([14, 8, 22, 8, 22, 24, 30, 26, 30, 30, 14, 30]).p([36, 6, 44, 6, 44, 22, 52, 24, 52, 28, 36, 28]); p.atop().c('#4a321e').r(14, 27, 16, 3).r(36, 25, 16, 3).over(); A.spark(p, 54, 10, COL.gold); A.spark(p, 8, 20, COL.gold); },
    'cancel'(p: Pen) { A.ring(p, 32, 18, 14, 13, COL.blue, 3); p.c(COL.white).l([22, 8, 42, 28], 2).l([42, 8, 22, 28], 2); },
    'unstable-footing'(p: Pen) { p.c('#7a5a4a').p([0, 14, 30, 14, 26, 22, 30, 36, 0, 36]); A.rock(p, 38, 22, 6, 5); A.rock(p, 44, 30, 5, 4); p.c(kor).e(48, 12, 2, 2); p.c('#8a6a3e').r(46, 14, 4, 6).l([44, 14, 42, 10], 1).l([52, 14, 54, 10], 1); },
    'luminarch-ascension'(p: Pen) { A.wings(p, 28, 14, COL.white, 1); A.person(p, 28, 33, { body: '#e8dcc0', robe: 1, hat: 'long', hatCol: COL.gold }); A.halo(p, 28, 3); A.flag(p, 54, 33); },
    'quest-for-ancient-secrets'(p: Pen) { p.c('#7a8478').p([10, 34, 10, 14, 16, 8, 24, 8, 28, 16, 28, 34]); p.c(INK).r(14, 16, 3, 2).r(21, 16, 3, 2).r(16, 24, 6, 2); A.paper(p, 36, 16, 12, 9); A.flag(p, 56, 33); },
    'quest-for-the-gravelord'(p: Pen) { p.c('#2a2434').p([14, 34, 16, 14, 24, 6, 34, 6, 42, 14, 44, 34]); p.c('#8af0c0').r(24, 12, 3, 3).r(32, 12, 3, 3); A.skull(p, 28, 26, 0.9); A.flag(p, 56, 33); },
    'quest-for-the-holy-relic'(p: Pen) { p.c('#8a8478').r(22, 26, 16, 8); A.urn(p, 30, 26, COL.gold); A.spark(p, 16, 10, '#ffe9a0'); A.spark(p, 44, 8, '#ffe9a0'); A.flag(p, 56, 33); },
    'soul-stair-expedition'(p: Pen) { p.c('#3a2a3a').e(28, 20, 24, 15); p.c('#14101c').e(28, 21, 8, 5); for (let i = 0; i < 9; i++) { const a = i * 0.75 - 1, r = 20 - i * 1.6; p.c(i % 2 ? '#b8b0a0' : '#8a8478').r(Math.round(28 + Math.cos(a) * r - 4), Math.round(20 + Math.sin(a) * r * 0.6 - 1), 8, 3); } A.flag(p, 56, 33); },
    'beast-hunt'(p: Pen) { p.c('#6b4a2e').l([8, 6, 16, 16, 8, 26], 1); p.c(COL.paper).l([8, 6, 8, 26], 1).l([8, 16, 26, 16], 1); A.beast(p, 44, 33, { body: '#6a5a3a', len: 10, h: 6, horns: COL.paper, tail: 1 }); },
    'conquerors-pledge'(p: Pen) { for (let i = 0; i < 6; i++) { const x = 8 + i * 9, y = 33 - (i % 2) * 3; p.c('#6a7a8a').r(x - 2, y - 10, 5, 10); p.c(kor).e(x, y - 12, 2, 2); p.c('#cfd6de').l([x + 3, y - 4, x + 3, y - 16], 1); } A.flag(p, 58, 16, COL.gold); },
    'demolish'(p: Pen) { A.pillar(p, 14, 34, 22); p.c('#8a8478').p([28, 34, 30, 16, 40, 20, 38, 34]).r(40, 10, 8, 5); A.rock(p, 50, 34, 12, 8); A.rock(p, 38, 12, 5, 4); },
    'baloth-cage-trap'(p: Pen) { p.c('#3a2a1e').r(16, 6, 32, 20); p.c(COL.red).r(26, 14, 3, 2).r(36, 14, 3, 2); p.c('#8a8478'); for (let i = 0; i <= 6; i++) p.r(16 + i * 5, 4, 2, 24); p.r(14, 4, 36, 2).r(14, 26, 36, 2); A.jaws(p, 32, 35, 40); },
    'mindbreak-trap'(p: Pen) { p.c(COL.purple).e(32, 14, 13, 12); A.eye(p, 32, 13, COL.red); p.c(INK).l([24, 4, 28, 10, 25, 16], 1).l([40, 5, 37, 11, 41, 18], 1); A.jaws(p, 32, 35, 40); },
    // ---- Sejiri ----
    'felidar-sovereign'(p: Pen) { A.beast(p, 34, 33, { body: '#e8e4dc', len: 14, h: 8, ears: 1, tail: 1, eye: COL.blue }); p.c('#8ad0e8').p([14, 14, 16, 2, 19, 14]); },
    'sphinx-of-lost-truths'(p: Pen) { A.wings(p, 36, 16, '#8a94c8', 1.1); A.beast(p, 34, 33, { body: '#c8a070', len: 12, h: 7, tail: 1 }); p.c(SK.human).e(20, 17, 4, 4); p.c('#3a4a8a').p([15, 16, 20, 10, 25, 16]); },
    'tempest-owl'(p: Pen) { A.bird(p, 32, 16, '#c8c0b0', 1.3); p.c(COL.gold).r(28, 15, 2, 2).r(33, 15, 2, 2); p.c(COL.white).px(8, 8).px(14, 24).px(52, 6).px(56, 20).px(44, 30).px(20, 32); },
    // ---- Tazeem ----
    'oran-rief-survivalist'(p: Pen) { A.tree(p, 52, 34, 28); A.person(p, 26, 33, { body: '#6a5a3a', hat: 'brim', hatCol: '#4a3a24', hold: 'sword' }); },
    'sea-gate-loremaster'(p: Pen) { p.c('#c8d0d8').r(48, 6, 8, 28); p.c('#ffe9a0').r(49, 4, 6, 4); p.c('#8a94a4').r(47, 10, 10, 1).r(47, 20, 10, 1); A.person(p, 24, 33, { skin: mer, body: '#3a5a8a', robe: 1, ears: 'fin', hold: 'book' }); },
    'seascape-aerialist'(p: Pen) { A.rock(p, 12, 12, 16, 7); A.rock(p, 52, 30, 14, 6); A.wings(p, 32, 14, '#8ad0e8', 1); A.person(p, 32, 30, { skin: mer, body: '#4a6a9a', ears: 'fin' }); },
    'umara-raptor'(p: Pen) { A.bird(p, 32, 14, '#8a6a4a', 1.6); p.c(COL.gold).r(27, 13, 2, 2); A.cloud(p, 14, 30, 16); A.cloud(p, 52, 28, 14); },
    'eternity-vessel'(p: Pen) { A.ring(p, 32, 18, 16, 14, '#ffe9a0', 1); A.urn(p, 32, 30, COL.gold); A.spark(p, 14, 8, '#ffe9a0'); A.spark(p, 50, 10, '#ffe9a0'); p.c('#8ad0e8').l([18, 33, 46, 33], 1); },
    'celestial-mantle'(p: Pen) { p.c(COL.gold).p([20, 8, 44, 8, 50, 32, 14, 32]); p.atop().c(COL.goldD).p([32, 8, 44, 8, 50, 32, 32, 32]).over(); p.c(COL.white).p([26, 8, 32, 14, 38, 8]); A.spark(p, 10, 12, COL.white); A.spark(p, 54, 14, COL.white); },
    'nimbus-wings'(p: Pen) { A.cloud(p, 32, 30, 30); A.wings(p, 32, 20, COL.white, 1.5); },
    'paralyzing-grasp'(p: Pen) { A.beast(p, 36, 32, { body: '#6a5a3a', len: 7, h: 5, tail: 1 }); A.hand(p, 32, 10, '#5aa8c8', -1); p.c('#8ad0e8').l([20, 22, 20, 30], 1).l([46, 22, 46, 30], 1); },
    'spreading-seas'(p: Pen) { A.rock(p, 50, 34, 22, 16, '#7a8a6a'); A.wave(p, 2, 34, 44, 22); },
    'caller-of-gales'(p: Pen) { p.c(COL.white).l([36, 8, 52, 6, 58, 12], 1).l([38, 16, 54, 16, 60, 22], 1).l([36, 24, 50, 26], 1); A.person(p, 22, 33, { skin: mer, body: '#4a7a8a', robe: 1, ears: 'fin', hold: 'staff', tip: COL.white }); },
    'emeria-angel'(p: Pen) { A.wings(p, 30, 14, COL.white, 1.1); A.person(p, 30, 33, { body: '#d8d0e8', robe: 1, hat: 'long', hatCol: '#e0c860' }); p.c(COL.gold).r(26, 11, 9, 2); A.bird(p, 52, 10, COL.white, 0.5); A.bird(p, 10, 22, COL.white, 0.5); },
    'grazing-gladehart'(p: Pen) { p.c('#4f9a5a').r(0, 30, 64, 6); A.beast(p, 34, 31, { body: '#b88a5a', len: 11, h: 6, horns: '#6b4a2e', tail: 1 }); A.reeds(p, 10, 31); A.reeds(p, 56, 31); },
    'iona-shield-of-emeria'(p: Pen) { A.wings(p, 32, 13, COL.white, 1.35); A.person(p, 32, 33, { body: '#e8dcc0', hat: 'long', hatCol: COL.gold, hold: 'sword' }); p.c(COL.gold).p([18, 14, 26, 14, 26, 23, 22, 28, 18, 23]); A.halo(p, 32, 3); },
    'merfolk-seastalkers'(p: Pen) { A.water(p, 28, '#1c4a78'); A.person(p, 20, 31, { skin: mer, body: '#3a6a7a', ears: 'fin', hold: 'spear' }); A.person(p, 42, 30, { skin: mer, body: '#2f5a6a', ears: 'fin', hold: 'spear' }); },
    'merfolk-wayfinder'(p: Pen) { A.cloud(p, 14, 30, 18); A.wings(p, 30, 14, '#8ad0e8', 0.9); A.person(p, 30, 30, { skin: mer, body: '#4a7a8a', ears: 'fin', hold: 'map' }); A.cloud(p, 52, 10, 14); },
    'noble-vestige'(p: Pen) { A.ring(p, 32, 18, 18, 14, '#c8d0f0', 1); A.person(p, 32, 33, { skin: '#e8ecf8', body: '#c8d0f0', robe: 1, hat: 'hood', hatCol: '#c8d0f0', eye: COL.blue }); },
    'shepherd-of-the-lost'(p: Pen) { A.wings(p, 26, 14, COL.white, 1); A.person(p, 26, 33, { body: '#d8d0e8', robe: 1, hat: 'hair', hatCol: COL.gold, hold: 'sword' }); A.halo(p, 26, 4); A.person(p, 50, 34, { body: '#6a5a3a', short: 1 }); },
    'relic-crush'(p: Pen) { A.hedron(p, 22, 30, 14, 24); p.c(INK).l([20, 8, 24, 16, 19, 24], 1); A.rock(p, 44, 34, 12, 8); A.rock(p, 54, 30, 8, 5); A.rock(p, 40, 20, 5, 4); },
    'shieldmates-blessing'(p: Pen) { A.ring(p, 32, 18, 18, 15, '#ffe9a0', 1); p.c('#c8d0d8').p([22, 6, 42, 6, 42, 20, 32, 31, 22, 20]); p.atop().c('#8a94a4').p([32, 6, 42, 6, 42, 20, 32, 31]).over(); p.c(COL.gold).e(32, 15, 3, 3); },
    'vines-of-vastwood'(p: Pen) { A.person(p, 32, 33, { body: '#6a5a3a' }); p.c('#3f8a4a').l([20, 34, 24, 24, 40, 22, 26, 14, 40, 10, 30, 4], 2).l([46, 34, 42, 28, 22, 28], 2); p.c('#7ac87a').px(22, 22).px(42, 16).px(28, 8); },
    'archmage-ascension'(p: Pen) { A.paper(p, 20, 20, 18, 12); p.c('#8ad0e8').l([14, 8, 20, 6], 1).l([26, 4, 32, 8], 1).l([38, 6, 44, 10], 1).l([10, 16, 14, 12], 1).l([44, 16, 40, 14], 1); A.ring(p, 28, 12, 18, 9, '#8ad0e8', 1); A.flag(p, 56, 33); },
    'sunspring-expedition'(p: Pen) { A.sun(p, 12, 8, 5); p.c('#8ad0e8').p([24, 34, 28, 16, 32, 10, 36, 16, 40, 34]); p.c(COL.white).l([32, 12, 32, 30], 1).l([28, 20, 26, 32], 1).l([36, 20, 38, 32], 1); A.flag(p, 56, 33); },
    'rite-of-replication'(p: Pen) { A.ring(p, 32, 18, 26, 15, COL.blue, 1); A.person(p, 20, 33, { body: '#6a5a8a', robe: 1 }); A.person(p, 44, 33, { skin: '#8ad0e8', body: '#4a8ac8', robe: 1, eye: COL.white }); },
    'windborne-charge'(p: Pen) { p.c(COL.white).l([4, 30, 20, 26, 30, 30], 1).l([34, 32, 50, 28, 60, 32], 1).l([8, 22, 22, 18], 1); A.person(p, 22, 24, { skin: kor, body: '#7a8494', hold: 'spear' }); A.person(p, 44, 26, { body: '#8a6a3e', hold: 'sword' }); },
    // ---- Lands ----
    'akoum-refuge'(p: Pen) { A.peak(p, 16, 34, 26, 26, '#7a3028'); A.peak(p, 46, 34, 30, 30, '#8a4038'); A.tent(p, 32, 34, COL.paper); },
    'graypelt-refuge'(p: Pen) { A.tree(p, 10, 34, 26); A.tree(p, 54, 34, 30); A.tent(p, 32, 34, '#a8a098'); p.c('#f08a2c').px(44, 32).px(45, 31); },
    'jwar-isle-refuge'(p: Pen) { A.water(p, 26, '#1c4a78'); A.rock(p, 32, 28, 40, 12, '#7a8a6a'); p.c('#8a94a0').p([24, 22, 24, 10, 28, 6, 34, 6, 36, 12, 36, 22]); p.c(INK).r(27, 11, 2, 2).r(32, 11, 2, 2).r(28, 17, 5, 1); A.tent(p, 46, 22, COL.paper); },
    'kazandu-refuge'(p: Pen) { p.c('#6b4a2e').r(24, 6, 8, 28); p.c('#3f8a4a').e(28, 8, 22, 7).e(14, 12, 10, 5).e(44, 12, 12, 5); A.tent(p, 48, 34, COL.paper); },
    'sejiri-refuge'(p: Pen) { A.peak(p, 16, 34, 28, 24, '#8aa8c8'); A.peak(p, 46, 34, 30, 30, '#a8c0d8'); p.c(COL.white).p([46, 4, 42, 12, 50, 12]); A.tent(p, 30, 34, '#c8a070'); },
    'arid-mesa'(p: Pen) { A.sun(p, 52, 8, 5); p.c('#c8703a').p([8, 34, 12, 14, 34, 14, 38, 34]).p([40, 34, 42, 20, 58, 20, 60, 34]); p.atop().c('#8a4a2a').p([26, 14, 34, 14, 38, 34, 28, 34]).p([52, 20, 58, 20, 60, 34, 54, 34]).over(); },
    'marsh-flats'(p: Pen) { A.water(p, 22, '#3a5a5a'); A.reeds(p, 10, 26); A.reeds(p, 26, 30); A.reeds(p, 46, 25); A.reeds(p, 56, 31); p.c('#5a6a4a').r(14, 30, 18, 2).r(40, 27, 14, 2); },
    'misty-rainforest'(p: Pen) { A.tree(p, 12, 34, 30, '#2f6a3a'); A.tree(p, 32, 34, 34, '#3f8a4a'); A.tree(p, 52, 34, 28, '#2f6a3a'); A.cloud(p, 22, 22, 26, '#a8c0b8'); A.cloud(p, 46, 14, 20, '#a8c0b8'); },
    'scalding-tarn'(p: Pen) { A.rock(p, 10, 34, 16, 12); A.rock(p, 56, 34, 14, 14); p.c('#3fb8a8').e(32, 29, 18, 5); p.c(COL.white).l([24, 22, 22, 14, 26, 8], 1).l([32, 20, 34, 12, 30, 5], 1).l([40, 22, 42, 15, 39, 9], 1); },
    'verdant-catacombs'(p: Pen) { A.arch(p, 32, 34, 26, 20, '#5a6a5a'); p.c(INK).r(23, 16, 18, 18); p.c('#3f8a4a').e(32, 9, 18, 5).l([20, 12, 18, 24], 2).l([44, 12, 46, 22], 2); A.skull(p, 32, 27, 0.8); },
    'crypt-of-agadeem'(p: Pen) { A.arch(p, 32, 34, 28, 22, '#4a4458'); p.c(INK).r(22, 14, 20, 20); p.c(COL.purple).r(31, 18, 2, 12).r(27, 22, 10, 2); A.hedron(p, 8, 30, 8, 14); A.hedron(p, 56, 26, 8, 14); },
    'emeria-the-sky-ruin'(p: Pen) { A.cloud(p, 16, 30, 26); A.cloud(p, 48, 32, 24); A.hedron(p, 14, 18, 10, 16); A.hedron(p, 50, 14, 8, 12); A.arch(p, 32, 24, 16, 12, '#c8d0d8'); },
    'magosi-the-waterveil'(p: Pen) { A.rock(p, 10, 34, 20, 30); A.rock(p, 54, 34, 20, 28); p.c('#8ad0e8').r(22, 4, 20, 30); p.c(COL.white).l([26, 4, 26, 32], 1).l([32, 4, 32, 34], 1).l([38, 4, 38, 30], 1); },
    'oran-rief-the-vastwood'(p: Pen) { A.tree(p, 8, 34, 26, '#2f6a3a'); A.tree(p, 24, 34, 34, '#3f8a4a'); A.tree(p, 42, 34, 30, '#2f6a3a'); A.tree(p, 58, 34, 24, '#3f8a4a'); },
    'valakut-the-molten-pinnacle'(p: Pen) { A.peak(p, 32, 34, 48, 28, '#5a2428'); p.c('#f08a2c').p([28, 8, 36, 8, 34, 14, 36, 22, 31, 16, 29, 24]); A.flame(p, 32, 8, 10, 8); },
    'kabira-crossroads'(p: Pen) { p.c('#8a6a48').p([28, 36, 30, 20, 34, 20, 36, 36]).p([0, 26, 30, 22, 30, 25, 0, 31]).p([64, 26, 34, 22, 34, 25, 64, 31]); p.c('#6b4a2e').l([46, 20, 46, 6], 2); p.c(COL.paper).r(46, 7, 10, 4).r(38, 12, 9, 4); A.hedron(p, 12, 20, 8, 14); },
    'piranha-marsh'(p: Pen) { A.water(p, 18, '#2a4a3a'); A.reeds(p, 8, 20); A.reeds(p, 56, 22); p.c('#8a9aa4').p([20, 26, 30, 22, 30, 30]).p([36, 30, 46, 26, 46, 34]); p.c(COL.white).px(22, 26).px(38, 30); p.c(COL.red).px(29, 26).px(45, 30); },
    'soaring-seacliff'(p: Pen) { A.water(p, 28, '#1c4a78'); p.c('#7a8a6a').p([30, 34, 34, 4, 56, 2, 64, 6, 64, 34]); p.atop().c('#5a6a52').p([48, 2, 64, 6, 64, 34, 46, 34]).over(); A.bird(p, 14, 12, COL.white, 0.6); },
    'teetering-peaks'(p: Pen) { p.c('#8a6a48').p([8, 34, 22, 4, 28, 34]).p([30, 34, 46, 8, 44, 34]).p([46, 34, 58, 14, 62, 34]); p.atop().c('#5a3e28').p([22, 4, 28, 34, 20, 34]).p([46, 8, 44, 34, 40, 34]).over(); A.rock(p, 36, 8, 5, 4); },
    'turntimber-grove'(p: Pen) { p.c('#6b4a2e').l([14, 34, 18, 26, 12, 20, 18, 14, 14, 8], 3).l([34, 34, 30, 26, 36, 18, 30, 12], 3).l([52, 34, 56, 26, 50, 20, 54, 12], 3); p.c('#3f8a4a').e(15, 7, 8, 5).e(31, 9, 9, 5).e(54, 9, 8, 5); },
  };
  for (const k in P2) ART_PAINT[k] = P2[k];
})();
