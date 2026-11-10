import './cardart2'; // load order, as in the one-shot's page: this module runs after cardart2
import { BG, COL, ICON, INK, SPR, artRng, bands, bitmap, makeSprite, poly } from './art';
import { ringPts } from './cardart';
import { shadeCol } from './cardart2';
import type { Pen } from './art';
import type { Loose } from './game/types';
// The figures of the rest of the ZEN set's enemies, each drawn in code with its own outline,
// a few more icons, and the shore where the way into Kabira is fought over.

// The trunk of a two-legged figure: legs, torso and head, centred on x with its feet at y.
// Returns where its hips, shoulders and head are, for the arms, horns and weapons each adds.
function sBiped(p: Pen, x: number, y: number, o: Loose) {
  const H = o.h, W = o.w, body = o.body, dark = shadeCol(body, 0.62), skin = o.skin || body;
  const legH = Math.round(H * 0.36), torsoH = Math.round(H * 0.4), r = Math.max(3, Math.round(H * 0.1));
  const hipY = y - legH, shY = hipY - torsoH, hy = shY - r + 1;
  if (o.cape) p.c(o.cape).p([x - W * 0.5, shY, x - W * 0.8, y - 1, x + W * 0.8, y - 1, x + W * 0.5, shY]);
  p.c(dark).r(Math.round(x - W * 0.42), hipY, Math.round(W * 0.34), legH).r(Math.round(x + W * 0.08), hipY, Math.round(W * 0.34), legH);
  p.c(body).p([x - W * 0.45, hipY + 2, x - W * 0.55, shY, x + W * 0.55, shY, x + W * 0.45, hipY + 2]);
  p.atop().c(dark).r(Math.round(x + W * 0.1), shY, Math.round(W * 0.5), torsoH + 2).over();
  p.c(skin).e(x, hy, r + 1, r);
  return { hipY, shY, hy, r };
}

export const SPRITES2: Record<string, [number, number, (p: Pen) => void]> = {
  // ---- Tazeem ----
  'timbermaw-larva': [34, 26, (p: Pen) => {
    p.c('#c8b070').e(24, 15, 7, 6).e(17, 14, 7, 7).e(10, 14, 6, 6);
    p.atop().c('#a08a50').e(20, 19, 12, 3).l([14, 8, 14, 20], 1).l([21, 8, 21, 21], 1).over();
    p.c('#6b4a2e').p([5, 11, 0, 8, 3, 14]).p([5, 17, 0, 21, 3, 15]);
    p.c(INK).px(8, 12); p.c('#c8b070').l([12, 20, 11, 23], 1).l([18, 21, 18, 24], 1).l([24, 20, 25, 23], 1);
  }],
  'river-boa': [44, 30, (p: Pen) => {
    p.c('#3f7a8a').l(ringPts(27, 20, 13, 6), 5).l([14, 20, 10, 12, 12, 6], 5).e(11, 5, 5, 3.5);
    p.atop().c('#2a5a6a').l(ringPts(27, 22, 13, 5), 2).c('#7ac8c8').l([13, 16, 10, 10], 1).over();
    p.c(COL.gold).px(9, 4); p.c(COL.red).l([6, 6, 2, 8], 1);
  }],
  'sky-ruin-drake': [54, 44, (p: Pen) => {
    p.c('#3a5a8a').p([26, 22, 10, 4, 22, 10, 30, 2, 34, 20]).p([30, 22, 40, 3, 50, 12, 44, 24]);
    p.c('#4a7ab8').e(28, 27, 12, 7).l([18, 25, 10, 18], 5).e(8, 16, 5, 3.5).l([39, 28, 50, 34], 4).l([24, 32, 22, 40], 3).l([32, 32, 34, 40], 3);
    p.atop().c('#2a4a7a').e(30, 31, 11, 3).c('#c8d8f0').e(24, 24, 6, 2).over();
    p.c(COL.gold).px(6, 15); p.c(COL.paper).p([3, 17, 0, 18, 3, 19]);
  }],
  'living-tsunami': [52, 46, (p: Pen) => {
    p.c('#2f7ab8').p([48, 44, 46, 26, 38, 10, 24, 2, 10, 6, 4, 16, 8, 24, 16, 18, 24, 16, 30, 24, 26, 36, 2, 44]);
    p.atop().c('#1c4a78').p([30, 24, 26, 36, 2, 44, 38, 44]).c('#6ab0e0').l([42, 26, 36, 12, 24, 5, 12, 8], 2).over();
    p.c(COL.white).e(8, 20, 3, 2).e(12, 24, 2, 2).px(5, 12).r(33, 20, 3, 3).r(41, 28, 3, 3); p.c(INK).px(34, 21).px(42, 29);
  }],
  'vastwood-gorger': [56, 52, (p: Pen) => {
    p.c('#3a2a1e').e(45, 49, 9, 2);
    p.c('#5a7a3a').l([46, 48, 44, 34, 34, 20, 20, 14], 13).e(14, 14, 10, 9);
    p.atop().c('#3a5a2a').l([50, 48, 48, 34, 38, 24, 24, 20], 4).c('#8aa85a').l([40, 46, 38, 34, 30, 22], 2).over();
    p.c('#3a1420').p([4, 12, 14, 12, 12, 20, 5, 19]);
    p.c(COL.paper).p([5, 12, 6, 15, 7, 12]).p([9, 12, 10, 15, 11, 12]).p([6, 19, 7, 16, 8, 19]);
    p.c('#f08a2c').e(15, 8, 2, 2).e(20, 10, 2, 2);
  }],
  // ---- Akoum ----
  'bladetusk-boar': [48, 34, (p: Pen) => {
    p.c('#3a2a22').p([18, 10, 21, 4, 24, 10, 27, 4, 30, 10, 33, 5, 35, 11]);
    p.c('#6a4a3a').e(28, 18, 14, 8).e(13, 19, 7, 6).r(18, 24, 4, 8).r(24, 25, 4, 7).r(34, 24, 4, 8).r(39, 23, 3, 9).p([10, 12, 12, 8, 15, 13]);
    p.atop().c('#4a3226').e(30, 23, 14, 4).r(18, 29, 4, 3).r(34, 29, 4, 3).over();
    p.c('#d5dde8').p([8, 20, 1, 12, 3, 11, 11, 18]).p([11, 22, 5, 14, 7, 13, 14, 20]);
    p.c(COL.red).px(11, 16); p.c('#3a2a22').l([42, 16, 46, 12], 1);
  }],
  'goblin-ruinblaster': [30, 38, (p: Pen) => {
    const g = sBiped(p, 14, 36, { h: 26, w: 11, body: '#5a4a6a', skin: '#a06a54' });
    p.c('#a06a54').p([9, g.hy - 1, 3, g.hy - 4, 9, g.hy + 2]).p([19, g.hy - 1, 25, g.hy - 4, 19, g.hy + 2]);
    p.c('#5a4a6a').l([18, g.shY + 3, 23, g.shY - 2], 2);
    p.c('#6b4a2e').l([23, g.shY - 2, 24, g.shY - 10], 1); p.c('#2a2434').e(24, g.shY - 12, 4, 4); p.c('#ffd45a').px(26, 0).px(27, 1);
    p.c(INK).px(12, g.hy).px(15, g.hy);
  }],
  'hedron-scrabbler': [36, 30, (p: Pen) => {
    p.c(COL.hedronD).l([10, 16, 4, 22, 3, 28], 2).l([14, 18, 12, 28], 2).l([24, 18, 26, 28], 2).l([28, 16, 33, 22, 34, 28], 2);
    p.c(COL.hedron).p([18, 2, 28, 12, 18, 22, 8, 12]);
    p.atop().c(COL.hedronD).p([18, 2, 28, 12, 18, 22]).c(COL.hedronL).p([18, 4, 10, 12, 18, 12]).over();
    p.c('#8ad0e8').r(13, 11, 2, 2).r(19, 11, 2, 2);
  }],
  'molten-ravager': [44, 48, (p: Pen) => {
    p.c('#f08a2c').p([14, 12, 17, 2, 21, 9, 25, 1, 28, 12]);
    p.c('#4a3a36').p([8, 14, 34, 12, 38, 30, 32, 44, 12, 44, 6, 30]).l([8, 18, 2, 30, 4, 38], 6).l([36, 18, 41, 30, 39, 38], 6);
    p.atop().c('#2a2224').p([24, 12, 34, 12, 38, 30, 32, 44, 24, 44]).c('#f08a2c').l([12, 20, 18, 26, 14, 34, 20, 40], 1).l([26, 18, 30, 28, 26, 36], 1).over();
    p.c('#ffd45a').r(13, 17, 3, 2).r(20, 17, 3, 2); p.c('#2a2224').r(12, 44, 8, 3).r(24, 44, 8, 3);
  }],
  'plated-geopede': [50, 26, (p: Pen) => {
    for (let i = 0; i < 6; i++) {
      const x = 9 + i * 7, y = 14 - Math.round(Math.sin(i / 5 * Math.PI) * 5);
      p.c('#8a5a3a').e(x, y + 2, 4.5, 4.5); p.c('#b88a5a').e(x, y, 4.5, 3); p.c('#5a3a24').l([x - 1, y + 6, x - 3, y + 10], 1).l([x + 2, y + 6, x + 3, y + 10], 1);
    }
    p.c('#5a3a24').p([5, 12, 0, 8, 3, 14]).p([5, 17, 0, 20, 3, 15]); p.c(COL.gold).px(7, 12);
  }],
  'scute-mob': [46, 32, (p: Pen) => {
    for (const [x, y] of [[8, 22], [18, 16], [16, 26], [28, 22], [30, 12], [38, 20], [40, 27], [22, 8]]) {
      p.c('#3a4a2a').e(x, y, 4.5, 3.5); p.c('#6a8a4a').e(x - 1, y - 1, 2.5, 1.5); p.c('#24301c').l([x - 3, y + 3, x - 5, y + 5], 1).l([x + 3, y + 3, x + 5, y + 5], 1).px(x - 5, y - 1);
    }
  }],
  // ---- Guul Draz ----
  'mindless-null': [28, 40, (p: Pen) => {
    p.c('#3a3440').r(9, 26, 4, 12).r(15, 26, 4, 12);
    p.c('#5a5262').p([7, 27, 6, 14, 12, 9, 20, 11, 21, 27]);
    p.atop().c('#3a3440').r(14, 10, 8, 18).over();
    p.c('#c8c0d0').e(10, 8, 5, 5);
    p.c('#5a5262').l([8, 15, 3, 26, 4, 34], 3).l([19, 15, 23, 27, 22, 35], 3);
    p.c('#c8c0d0').r(2, 33, 4, 3).r(20, 34, 4, 3);
  }],
  'vampire-lacerator': [40, 44, (p: Pen) => {
    const g = sBiped(p, 20, 42, { h: 38, w: 12, body: '#3a1420', skin: '#cfc6d8' });
    p.c('#241c2c').p([16, g.hy - 2, 20, g.hy - 7, 24, g.hy - 2]);
    p.c('#3a1420').l([14, g.shY + 2, 6, g.shY + 10], 3).l([26, g.shY + 2, 34, g.shY + 10], 3);
    p.c('#cfd6de').l([6, g.shY + 10, 1, g.shY - 10], 2).l([34, g.shY + 10, 39, g.shY - 10], 2);
    p.c(COL.red).l([16, g.shY + 6, 24, g.shY + 12], 1).px(18, g.hy).px(21, g.hy);
  }],
  'blood-seeker': [30, 44, (p: Pen) => {
    p.c('#4a1c28').p([4, 42, 9, 16, 14, 8, 19, 16, 24, 42]);
    p.atop().c('#2a1018').p([14, 8, 19, 16, 24, 42, 15, 42]).over();
    p.c('#2a1018').p([8, 16, 14, 4, 20, 16, 16, 13, 12, 13]);
    p.c('#cfc6d8').r(12, 13, 4, 3); p.c(COL.red).px(12, 14).px(15, 14);
    p.c('#6b4a2e').l([25, 42, 25, 8], 1); p.c(COL.red).e(25, 6, 3, 4); p.c(COL.white).px(24, 4);
  }],
  'guul-draz-vampire': [38, 36, (p: Pen) => {
    p.c('#4a3458').p([8, 34, 12, 24, 20, 20, 30, 24, 32, 34, 26, 34, 24, 28, 16, 28, 14, 34]);
    p.c('#6a4a72').p([12, 24, 14, 12, 24, 10, 28, 22]).l([14, 16, 5, 20], 3).l([26, 16, 34, 14], 3);
    p.c('#cfc6d8').e(14, 9, 4, 4); p.c('#241c2c').p([11, 7, 14, 2, 19, 6, 17, 8]);
    p.c('#cfd6de').p([5, 20, 0, 24, 4, 22]).p([34, 14, 37, 7, 36, 15]);
    p.c(COL.red).px(12, 9);
  }],
  'gatekeeper-of-malakir': [40, 50, (p: Pen) => {
    const g = sBiped(p, 22, 48, { h: 40, w: 14, body: '#4a4458', skin: '#cfc6d8' });
    p.c('#2a2434').p([17, g.hy - 2, 21, g.hy - 8, 27, g.hy - 2, 26, g.hy + 1, 18, g.hy + 1]);
    p.c('#6b4a2e').l([34, 48, 34, 2], 2); p.c('#cfd6de').p([34, 2, 39, 8, 35, 14]).p([33, 4, 29, 9, 33, 12]);
    p.c('#5a1420').p([4, g.shY + 2, 16, g.shY + 2, 16, 40, 10, 46, 4, 40]);
    p.atop().c('#3a0c14').r(10, g.shY + 2, 6, 28).over(); p.c(COL.gold).e(10, g.shY + 14, 2, 2);
    p.c(COL.red).px(20, g.hy).px(23, g.hy);
  }],
  'vampire-hexmage': [36, 48, (p: Pen) => {
    const g = sBiped(p, 16, 46, { h: 38, w: 12, body: '#5a4278', skin: '#cfc6d8', cape: '#3a2c50' });
    p.c('#e8e0f0').p([11, g.hy - 2, 9, g.hy - 9, 13, g.hy - 5, 15, g.hy - 11, 17, g.hy - 5, 21, g.hy - 9, 19, g.hy - 2]);
    p.c('#5a4278').l([20, g.shY + 3, 27, g.shY - 6], 3);
    p.c(COL.purple).e(28, g.shY - 10, 4, 4).l(ringPts(28, g.shY - 10, 6, 6), 1); p.c(COL.white).px(27, g.shY - 11);
    p.c(COL.red).px(14, g.hy).px(17, g.hy);
  }],
  'crypt-ripper': [36, 40, (p: Pen) => {
    p.c('#4a4270').e(18, 37, 14, 3).p([8, 37, 12, 18, 18, 8, 24, 18, 28, 37]).l([12, 20, 3, 14, 1, 20], 3).l([24, 20, 33, 14, 35, 20], 3);
    p.c('#2a2444').p([13, 30, 16, 16, 20, 16, 23, 30]);
    p.c('#8af0c0').r(14, 13, 3, 2).r(20, 13, 3, 2);
    p.c('#4a4270').p([1, 20, 0, 25, 3, 22]).p([35, 20, 36, 25, 33, 22]);
  }],
  'vampire-nighthawk': [52, 42, (p: Pen) => {
    p.c('#6a5290').p([24, 16, 2, 4, 6, 16, 2, 22, 12, 22, 14, 28, 22, 24]).p([28, 16, 50, 4, 46, 16, 50, 22, 40, 22, 38, 28, 30, 24]);
    p.atop().c('#8a72b0').l([24, 17, 6, 8], 1).l([28, 17, 46, 8], 1).over();
    p.c('#3a2c50').p([21, 16, 31, 16, 30, 32, 26, 40, 22, 32]);
    p.c('#cfc6d8').e(26, 12, 4, 4); p.c('#3a2c50').p([22, 10, 26, 5, 30, 10]);
    p.c(COL.red).px(24, 12).px(27, 12);
  }],
  'malakir-bloodwitch': [50, 48, (p: Pen) => {
    p.c('#5a1420').p([25, 14, 4, 30, 10, 44, 18, 36, 25, 46, 32, 36, 40, 44, 46, 30]);
    p.atop().c('#3a0c14').p([25, 14, 46, 30, 40, 44, 32, 36, 25, 46]).over();
    p.c('#241c2c').p([20, 16, 30, 16, 29, 30, 21, 30]);
    p.c('#cfc6d8').e(25, 11, 4, 4); p.c('#e8e0f0').p([21, 9, 25, 4, 30, 8, 38, 6, 31, 12]);
    p.c('#6b4a2e').l([12, 6, 20, 26], 1); p.c(COL.red).e(11, 4, 3, 3).px(23, 11).px(26, 11);
  }],
  'bloodghast': [32, 40, (p: Pen) => {
    p.c('#b8b0c8').p([8, 14, 16, 4, 24, 14, 25, 26, 21, 38, 18, 30, 15, 39, 12, 30, 8, 37, 7, 26]);
    p.atop().c('#8a80a0').p([16, 4, 24, 14, 25, 26, 21, 38, 17, 30]).over();
    p.c('#b8b0c8').l([10, 18, 2, 20, 0, 24], 3).l([12, 22, 4, 26], 2);
    p.c('#5a1420').r(11, 11, 3, 3).r(17, 11, 3, 3).l([12, 18, 18, 18], 1);
  }],
  'bog-tatters': [36, 44, (p: Pen) => {
    p.c('#3a4a3a').p([10, 16, 18, 2, 26, 16, 30, 28, 27, 42, 24, 30, 21, 43, 18, 32, 15, 43, 12, 30, 8, 41, 6, 28]);
    p.atop().c('#24301c').p([18, 2, 26, 16, 30, 28, 27, 42, 20, 30]).over();
    p.c('#14101c').e(18, 12, 4, 5); p.c('#c8f4c8').px(16, 11).px(19, 11);
    p.c('#3a4a3a').l([8, 18, 1, 24, 3, 30], 2).l([28, 18, 34, 26, 32, 32], 2);
  }],
  'geyser-glider': [56, 36, (p: Pen) => {
    p.c('#8a3a2a').p([28, 14, 2, 8, 12, 22, 22, 22]).p([28, 14, 54, 8, 44, 22, 34, 22]);
    p.c('#a8482c').e(28, 18, 8, 6).l([34, 22, 46, 30, 54, 28], 2).e(20, 16, 4, 3);
    p.atop().c('#f08a2c').e(28, 21, 6, 2).over();
    p.c('#ffd45a').px(18, 15); p.c('#5a2018').l([24, 16, 6, 10], 1).l([32, 16, 50, 10], 1);
  }],
  'giant-scorpion': [44, 32, (p: Pen) => {
    p.c('#5a3a2a').e(24, 23, 10, 5).e(14, 23, 5, 4).l([10, 21, 4, 17], 3).l([10, 25, 4, 27], 3).l([32, 21, 40, 15, 40, 7, 34, 3, 28, 6], 3);
    p.c('#7a5236').e(3, 15, 4, 3).e(3, 28, 4, 3);
    p.c(COL.green).p([28, 6, 23, 7, 27, 10]);
    p.c('#3a2418').l([18, 27, 15, 30], 1).l([23, 28, 22, 30], 1).l([28, 28, 29, 30], 1).l([32, 26, 35, 30], 1);
    p.c(COL.red).px(12, 21);
  }],
  'guul-draz-specter': [56, 48, (p: Pen) => {
    p.c('#5a4a80').p([26, 24, 6, 8, 12, 24, 20, 28]).p([32, 24, 52, 8, 46, 24, 38, 28]);
    p.c('#6a5a90').e(28, 30, 12, 6).l([18, 28, 9, 22], 4).l([38, 32, 50, 40], 3).l([24, 35, 22, 44], 2).l([32, 35, 34, 44], 2);
    p.c(COL.paper).e(7, 20, 4, 3); p.c(INK).px(6, 19);
    p.c('#2a2444').p([24, 26, 26, 12, 30, 8, 34, 12, 34, 26]);
    p.c('#8af0c0').px(28, 13).px(31, 13);
  }],
  'hagra-crocodile': [60, 26, (p: Pen) => {
    p.c('#24402a'); for (let i = 0; i < 7; i++) p.p([18 + i * 4, 11, 20 + i * 4, 6, 22 + i * 4, 11]);
    p.c('#3a5a3a').p([2, 15, 16, 11, 44, 10, 58, 17, 44, 20, 16, 21, 2, 19]).r(16, 20, 4, 4).r(38, 19, 4, 4);
    p.atop().c('#24402a').p([16, 17, 44, 16, 58, 17, 44, 20, 16, 21]).over();
    p.c(COL.paper).px(4, 19).px(7, 19).px(10, 20).px(13, 20); p.c(COL.gold).px(15, 12);
  }],
  'halo-hunter': [72, 72, (p: Pen) => {
    const g = sBiped(p, 36, 70, { h: 58, w: 26, body: '#4a1c28', skin: '#6a2a34' });
    p.c('#2a1018').p([27, g.hy - 4, 18, g.hy - 16, 28, g.hy - 8]).p([43, g.hy - 4, 52, g.hy - 16, 42, g.hy - 8]);
    p.c('#4a1c28').l([24, g.shY + 4, 12, g.shY + 16, 10, g.shY + 28], 6).l([48, g.shY + 4, 58, g.shY + 14], 6);
    p.c('#cfd6de').p([58, g.shY + 14, 66, g.shY - 22, 69, g.shY - 20, 62, g.shY + 16]);
    p.c(COL.gold).l(ringPts(8, 56, 4, 2), 1).l(ringPts(10, 61, 4, 2), 1).l(ringPts(7, 66, 4, 2), 1);
    p.c('#ffd45a').r(31, g.hy - 1, 3, 2).r(38, g.hy - 1, 3, 2);
  }],
  'kalitas-bloodchief-of-ghet': [58, 68, (p: Pen) => {
    const g = sBiped(p, 26, 66, { h: 54, w: 20, body: '#3a1420', skin: '#cfc6d8', cape: '#5a1420' });
    p.c(COL.gold).p([19, g.hy - 4, 20, g.hy - 12, 23, g.hy - 6, 26, g.hy - 14, 29, g.hy - 6, 32, g.hy - 12, 33, g.hy - 4]);
    p.c('#5a1420').p([14, g.shY, 8, g.shY - 10, 18, g.shY - 2]).p([38, g.shY, 44, g.shY - 10, 34, g.shY - 2]);
    p.c('#3a1420').l([36, g.shY + 4, 46, g.shY + 18], 5);
    p.c('#cfd6de').p([44, g.shY + 16, 50, g.shY + 16, 54, 64, 51, 66]);
    p.c(COL.gold).r(42, g.shY + 14, 10, 3); p.c(COL.red).px(23, g.hy).px(27, g.hy).e(26, g.shY + 8, 2, 2);
  }],
  'ob-nixilis-the-fallen': [84, 72, (p: Pen) => {
    p.c('#4a3a60').p([34, 30, 4, 4, 12, 26, 6, 40, 20, 38, 26, 48]).p([50, 30, 80, 4, 72, 26, 78, 40, 64, 38, 58, 48]);
    const g = sBiped(p, 42, 70, { h: 56, w: 28, body: '#5a4a78', skin: '#6a5a88' });
    p.c('#cfc6d8').p([34, g.hy - 2, 24, g.hy - 6, 22, g.hy - 16, 28, g.hy - 8, 35, g.hy - 6]).p([48, g.hy - 2, 58, g.hy - 6, 60, g.hy - 16, 54, g.hy - 8, 47, g.hy - 6]);
    p.c('#5a4a78').l([28, g.shY + 4, 18, g.shY + 20, 20, g.shY + 30], 7).l([56, g.shY + 4, 66, g.shY + 20, 64, g.shY + 30], 7);
    p.c('#f08a2c').r(37, g.hy - 1, 3, 2).r(44, g.hy - 1, 3, 2).l([36, g.shY + 8, 48, g.shY + 8], 1).l([40, g.shY + 12, 44, g.shY + 16], 1);
  }],
  // ---- Murasa ----
  'ruinous-minotaur': [46, 52, (p: Pen) => {
    const g = sBiped(p, 24, 50, { h: 40, w: 20, body: '#6a4a3a', skin: '#7a5a46' });
    p.c('#7a5a46').p([14, g.hy - 2, 6, g.hy + 3, 14, g.hy + 6]);
    p.c(COL.paper).p([16, g.hy - 4, 8, g.hy - 12, 12, g.hy - 4]).p([28, g.hy - 4, 36, g.hy - 12, 32, g.hy - 4]);
    p.c('#6a4a3a').l([14, g.shY + 4, 6, g.shY + 16], 6).l([34, g.shY + 4, 41, g.shY + 16], 6);
    p.c(COL.red).px(17, g.hy); p.c(COL.gold).l(ringPts(8, g.hy + 5, 2, 2), 1);
  }],
  'shatterskull-giant': [50, 60, (p: Pen) => {
    const g = sBiped(p, 22, 58, { h: 46, w: 24, body: '#7a6a5a', skin: '#b89878' });
    p.c('#6b4a2e').l([34, g.shY + 10, 44, g.shY - 14], 5); p.c('#4a321e').e(44, g.shY - 16, 5, 6);
    p.c('#7a6a5a').l([10, g.shY + 4, 3, g.shY + 18], 6).l([34, g.shY + 4, 36, g.shY + 12], 6);
    p.c(COL.paper).e(16, g.shY + 5, 2, 2).e(22, g.shY + 7, 2, 2).e(28, g.shY + 5, 2, 2);
    p.c(INK).px(19, g.hy).px(23, g.hy);
  }],
  'lorthos-the-tidemaker': [96, 72, (p: Pen) => {
    const t = [[30, 36, 14, 44, 6, 30, 10, 20], [34, 42, 20, 58, 6, 60, 2, 50], [42, 44, 36, 62, 24, 68], [54, 44, 60, 62, 72, 68], [62, 42, 76, 58, 90, 60, 94, 50], [66, 36, 82, 44, 90, 30, 86, 20]];
    p.c('#3a6a8a'); for (const q of t) p.l(q, 6);
    p.c('#3a6a8a').e(48, 24, 22, 20);
    p.atop().c('#2a4a6a').e(54, 30, 20, 14).c('#6aa8c8').e(40, 14, 8, 5).over();
    p.c('#6aa8c8'); for (const q of t) p.l(q, 1);
    p.c('#ffe9a0').e(40, 28, 3, 4).e(56, 28, 3, 4); p.c(INK).r(39, 27, 2, 4).r(55, 27, 2, 4);
  }],
  'obsidian-fireheart': [64, 66, (p: Pen) => {
    p.c('#f08a2c').p([14, 20, 18, 6, 22, 16]).p([42, 18, 48, 4, 52, 18]);
    p.c('#3a3458').p([32, 6, 44, 14, 54, 30, 50, 50, 44, 64, 20, 64, 14, 50, 10, 30, 20, 14]).l([12, 30, 4, 44, 8, 54], 6).l([52, 30, 60, 44, 56, 54], 6);
    p.atop().c('#5a5280').p([32, 6, 20, 14, 10, 30, 14, 50, 24, 50, 26, 20]).over();
    p.c('#f08a2c').e(32, 34, 8, 8).r(26, 16, 4, 2).r(35, 16, 4, 2).l([24, 46, 28, 54], 1).l([40, 46, 36, 56], 1); p.c('#ffd45a').e(32, 34, 4, 4);
  }],
  // ---- Ondu ----
  'baloth-woodcrasher': [56, 50, (p: Pen) => {
    p.c('#3c4624').p([34, 12, 40, 4, 40, 14]).p([40, 20, 47, 14, 45, 24]).p([42, 30, 50, 26, 46, 34]).l([40, 40, 52, 44], 4);
    p.c('#5e6b34').p([18, 14, 34, 10, 42, 26, 40, 40, 26, 44, 18, 30]).e(16, 12, 8, 7).r(24, 40, 7, 8).r(34, 38, 7, 10).l([20, 20, 8, 22], 5).l([22, 28, 10, 32], 5);
    p.atop().c('#3c4624').p([34, 10, 42, 26, 40, 40, 32, 42]).over();
    p.c(COL.paper).p([8, 22, 2, 18, 4, 24]).p([8, 22, 2, 24, 5, 27]).p([10, 32, 4, 30, 6, 35]).p([12, 8, 6, 2, 10, 2]).p([18, 6, 16, 0, 20, 1]);
    p.c(COL.red).px(13, 11);
  }],
  'turntimber-basilisk': [56, 30, (p: Pen) => {
    p.c('#2a5a3a').l([20, 20, 19, 27], 2).l([30, 20, 31, 27], 2).l([40, 19, 43, 26], 2);
    p.c('#4a7a5a').p([6, 16, 14, 10, 40, 10, 54, 18, 40, 20, 14, 21]).l([16, 20, 13, 27], 3).l([26, 20, 25, 27], 3).l([36, 20, 38, 27], 3);
    p.atop().c('#2a5a3a').p([14, 16, 40, 16, 54, 18, 40, 20, 14, 21]).over();
    p.c(COL.paper).p([6, 14, 1, 8, 8, 12]).p([12, 10, 12, 4, 15, 9]); p.c('#ffd45a').r(10, 13, 2, 2);
  }],
  'goblin-bushwhacker': [28, 34, (p: Pen) => {
    const g = sBiped(p, 14, 32, { h: 24, w: 10, body: '#6a5a3a', skin: '#a06a54' });
    p.c('#a06a54').p([9, g.hy - 1, 3, g.hy - 4, 9, g.hy + 2]).p([17, g.hy - 1, 23, g.hy - 4, 17, g.hy + 2]);
    p.c('#6a5a3a').l([18, g.shY + 3, 23, g.shY - 3], 2); p.c('#6b4a2e').l([23, g.shY - 3, 25, g.shY - 12], 3);
    p.c(INK).px(11, g.hy).px(14, g.hy);
  }],
  'warren-instigator': [36, 40, (p: Pen) => {
    const g = sBiped(p, 17, 38, { h: 28, w: 12, body: '#8a3a2a', skin: '#a06a54' });
    p.c('#a06a54').p([12, g.hy - 1, 6, g.hy - 4, 12, g.hy + 2]).p([20, g.hy - 1, 26, g.hy - 4, 20, g.hy + 2]);
    p.c(COL.red).p([14, g.hy - 3, 16, g.hy - 9, 18, g.hy - 3]);
    p.c('#8a3a2a').l([11, g.shY + 3, 4, g.shY - 3], 2).l([23, g.shY + 3, 30, g.shY - 3], 2);
    p.c('#cfd6de').p([4, g.shY - 3, 0, g.shY - 10, 6, g.shY - 9]).p([30, g.shY - 3, 34, g.shY - 10, 28, g.shY - 9]);
    p.c(INK).px(14, g.hy).px(17, g.hy).l([14, g.hy + 3, 18, g.hy + 3], 1);
  }],
  'gomazoa': [40, 48, (p: Pen) => {
    p.c('#8ad0e8').l([10, 24, 8, 34, 12, 44], 1).l([16, 24, 16, 38, 13, 46], 1).l([22, 24, 24, 36, 21, 46], 1).l([28, 24, 30, 34, 27, 42], 1).p([6, 18, 34, 18, 30, 24, 10, 24]);
    p.c('#8a8478').p([4, 18, 8, 8, 20, 2, 32, 8, 36, 18]);
    p.atop().c('#5f5a52').p([20, 2, 32, 8, 36, 18, 22, 18]).c('#a8a098').l([8, 12, 18, 5], 1).over();
    p.c(COL.white).px(14, 20).px(24, 20);
  }],
  'windrider-eel': [64, 30, (p: Pen) => {
    p.c('#7ab0c0').p([14, 8, 20, 0, 24, 10]).p([36, 18, 42, 8, 46, 16]).p([56, 10, 62, 2, 62, 12]);
    p.c('#5a8a9a').l([6, 16, 16, 10, 28, 16, 40, 22, 52, 16, 60, 10], 6).e(6, 16, 5, 4);
    p.atop().c('#3a6a7a').l([8, 18, 16, 13, 28, 19, 40, 25, 52, 19, 60, 13], 2).over();
    p.c('#3a1420').p([1, 15, 6, 16, 2, 19]); p.c(COL.gold).px(6, 14);
  }],
  'world-queller': [60, 76, (p: Pen) => {
    p.c(COL.gold).l(ringPts(30, 14, 12, 12), 2);
    p.c('#c8c0d8').p([30, 20, 44, 28, 50, 74, 10, 74, 16, 28]).l([18, 30, 4, 22, 2, 14], 4).l([42, 30, 56, 22, 58, 14], 4);
    p.atop().c('#8a80a0').p([30, 20, 44, 28, 50, 74, 32, 74]).c('#e8e0f0').l([22, 34, 20, 70], 1).over();
    p.c('#e8e0f0').e(30, 14, 6, 7); p.c('#5a4a7a').r(27, 12, 2, 2).r(31, 12, 2, 2);
    p.c(COL.gold).r(27, 32, 6, 2).r(29, 36, 2, 20);
  }],
  'shoal-serpent': [66, 52, (p: Pen) => {
    p.c('#2f6a7a').l([10, 46, 10, 22, 16, 10], 8).l(ringPts(36, 46, 9, 14).slice(16, 34), 8).l(ringPts(56, 48, 7, 9).slice(16, 34), 6).e(18, 9, 8, 5);
    p.atop().c('#1c4a58').l([13, 46, 13, 24], 2).c('#6ab0b8').l([7, 44, 7, 22, 12, 12], 1).over();
    p.c('#6ab0b8').p([12, 5, 16, 0, 20, 5]).p([20, 6, 25, 2, 26, 8]);
    p.c(COL.gold).px(14, 8); p.c(COL.paper).p([10, 11, 11, 14, 12, 11]).p([14, 12, 15, 15, 16, 12]);
    p.c('#8ad0e8').r(2, 46, 62, 4); p.c(COL.white).l([4, 46, 16, 46], 1).l([28, 46, 44, 46], 1).l([50, 47, 62, 47], 1);
  }],
  'hedron-crab': [40, 30, (p: Pen) => {
    p.c('#b85a3a').e(20, 20, 11, 6).l([10, 19, 4, 13], 3).l([30, 19, 36, 13], 3);
    p.c('#d8784a').e(4, 11, 4, 3).e(36, 11, 4, 3);
    p.c('#8a3a24').l([12, 24, 8, 27], 1).l([16, 25, 14, 28], 1).l([24, 25, 26, 28], 1).l([28, 24, 32, 27], 1);
    p.c(COL.hedron).p([16, 4, 20, 9, 16, 16, 12, 9]).p([25, 6, 28, 10, 25, 16, 22, 10]); p.c(COL.hedronD).p([16, 4, 20, 9, 16, 16]);
    p.c(INK).px(17, 20).px(22, 20);
  }],
  'sphinx-of-jwar-isle': [84, 66, (p: Pen) => {
    p.c('#5a6aa8').p([44, 28, 30, 2, 52, 14, 62, 0, 66, 26]).p([50, 30, 70, 6, 80, 22, 70, 36]);
    p.c('#c8a070').e(46, 44, 20, 12).p([26, 30, 34, 26, 38, 44, 28, 48]).r(24, 44, 7, 18).r(34, 46, 7, 16).r(54, 50, 8, 12).l([64, 46, 76, 40, 78, 30], 3);
    p.atop().c('#a07a50').e(50, 50, 18, 6).r(34, 54, 7, 8).over();
    p.c('#e0b088').e(26, 22, 7, 8); p.c('#3a4a8a').p([18, 26, 20, 12, 26, 8, 32, 12, 34, 26, 30, 16, 22, 16]);
    p.c(INK).px(23, 22).px(27, 22); p.c(COL.gold).r(24, 12, 4, 2);
    p.c(COL.paper).r(23, 61, 3, 2).r(27, 61, 3, 2).r(34, 61, 3, 2).r(38, 61, 3, 2);
  }],
  // ---- Bala Ged ----
  'mold-shambler': [46, 46, (p: Pen) => {
    p.c('#4a5a3a').e(23, 22, 16, 15).e(14, 28, 8, 9).e(32, 28, 9, 9).r(14, 36, 7, 8).r(26, 36, 7, 8).l([9, 22, 3, 32, 4, 38], 4).l([37, 22, 43, 32, 41, 38], 4);
    p.atop().c('#2f3a26').e(28, 30, 14, 9).over();
    p.c('#c8a0b8').e(16, 9, 5, 3).e(30, 6, 4, 3).e(36, 14, 4, 2); p.c(COL.paper).r(15, 10, 2, 4).r(29, 7, 2, 5).r(35, 15, 2, 3);
    p.c('#c8f4a0').px(18, 20).px(25, 20);
  }],
};

export function buildSprites2() {
  for (const k in SPRITES2) { const s = SPRITES2[k]; SPR[k] = makeSprite(s[0], s[1], s[2]); }
  // a herd: three baloths charging together
  const herd = document.createElement('canvas'); herd.width = 97; herd.height = 58;
  const hg = herd.getContext('2d')!, one = SPR['territorial-baloth'];
  hg.drawImage(one, 38, 0); hg.drawImage(one, 0, 9); hg.drawImage(one, 40, 16);
  SPR['rampaging-baloths'] = herd;
  const P = { k: INK, w: COL.white, r: COL.red, g: COL.gold, n: COL.green, v: COL.purple, b: COL.blue, m: '#8a6a3e' };
  ICON.idle = bitmap(['.........', 'kkkkk....', 'kwwwk....', '..kwk....', '.kwk.kkk.', 'kwwwkkwk.', 'kkkkkwkk.', '....kwwk.', '....kkkk.'], P);
  ICON.quest = bitmap(['kk.......', 'kmkkkk...', 'kmkrrrk..', 'kmkrrrrk.', 'kmkrrrk..', 'kmkkkk...', 'kmk......', 'kmk......', 'kkk......'], P);
  ICON.ally = bitmap(['..kkk....', '.kgggk...', '.kgggk...', '..kkk....', '.kbbbk...', 'kbbbbbk..', 'kbbbbbk..', 'kbkbkbk..', 'kkkkkkk..'], P);
  ICON.fly = bitmap(['.........', 'k.....kk.', 'kk..kkwk.', 'kwkkwwwk.', 'kwwwwwk..', '.kwwwwkk.', '..kwwwwwk', '...kkkkk.', '.........'], P);
  ICON.summon = bitmap(['....k....', '...kvk...', '..kvvvk..', '.kvkvkvk.', 'kvk.k.kvk', '.k..k..k.', '...kvk...', '...kvk...', '...kkk...'], P);
  BG.sea = buildSea();
}

// The shore of Agadeem, where the way into Kabira is fought over.
function buildSea() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 360;
  const g = c.getContext('2d')!, r = artRng(91);
  bands(g, ['#12283a', '#183a50', '#1f4f68', '#2a6a80'], 0, 124);
  poly(g, '#16303c', [40, 124, 96, 100, 170, 124]); poly(g, '#16303c', [430, 124, 500, 92, 548, 110, 600, 124]);
  bands(g, ['#1c4a66', '#173e58', '#12324a'], 124, 196);
  g.fillStyle = '#3a7a98'; for (let i = 0; i < 40; i++) g.fillRect(r() * 630, 130 + r() * 62, 6 + r() * 14, 1);
  bands(g, ['#4a5248', '#3a4238'], 196, 250);
  g.fillStyle = '#5a6458'; for (let i = 0; i < 26; i++) g.fillRect(r() * 630, 202 + r() * 44, 4 + r() * 10, 1);
  for (let i = 0; i < 4; i++) { g.globalAlpha = 0.55; g.drawImage(r() < 0.4 ? SPR.hedronM : SPR.hedronS, Math.round(40 + r() * 560), Math.round(14 + r() * 60)); g.globalAlpha = 1; }
  g.fillStyle = COL.panel; g.fillRect(0, 250, 640, 110);
  g.fillStyle = COL.panelL; g.fillRect(0, 250, 640, 1);
  return c;
}
