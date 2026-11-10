import './screens.js'; // the page's script order: this file ran after screens.js
import { LANG, LX, STOP_TEXT, T, contName, stopName } from './text.js';
import { CARDS, POOLS, RARITY_WEIGHT, cardArt, cardName, cardOrigin, cardPrice, cardText, val } from './cards.js';
import { PLACE_LAND } from './cards2.js';
import { BOSS, ENEMIES, curMove, enemyName, intentDamage, intentIsAttack, moveHits } from './enemies.js';
import { moveNote, traitLines } from './text2.js';
import { BG, COL, ICON, INK, SPR, drawEnemyKind } from './art.js';
import { canAct, costOf, endTurn, landLimit, passive, pickCards, playReason, targetable, tryPlay, updateBattle, willCancel } from './battle.js';
import { MAP_X, MAP_Y, TYPE_COL, addCard, afterStop, box, clicked, drawBanner, drawButton, drawCard, drawCardInfo, drawDeckView, drawHudButtons, drawMap, drawMarker, drawStat, drawTrail, drawTravel, drawWorld, nameStr, over, para, stopById, textW, txt, txtS, ui, updateDeckView, updateHudButtons, updateMap, updateTravel, wrap } from './screens.js';
import { H, W, ctx, events, mouse, pressed, setScene, sfx, state, tune } from './main.js';
// The fight on screen (hand, intents, the panel that explains a card), and what follows a
// stop: the reward, a town's market, a camp. Input is read on the step; drawing only draws.
'use strict';

// ---- where things stand in a fight ----
export function battleLayout() {
  const b = state.battle, n = b.enemies.length;
  const xs = n === 1 ? [476] : n === 2 ? [416, 548] : [372, 470, 568];
  const enemies = b.enemies.map((e, i) => {
    const s = SPR[e.kind];
    const w = e.kind === BOSS ? 96 : s.width, h = e.kind === BOSS ? 96 : s.height + (ENEMIES[e.kind].fly ? 12 : 0);
    return { x: xs[i], y: 214, w, h };
  });
  return { player: { x: 118, y: 214 }, enemies };
}
function enemyBox(p) { const w = Math.max(p.w, 50); return { x: p.x - w / 2 - 4, y: p.y - p.h - 26, w: w + 8, h: p.h + 52 }; }
function handSlots() {
  const n = state.battle.hand.length;
  const sp = n <= 5 ? 84 : Math.floor(420 / (n - 1));
  const x0 = Math.round(320 - ((n - 1) * sp) / 2 - 40);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + i * sp, y: 254 + Math.round(Math.abs(i - (n - 1) / 2) * 2), vis: i === n - 1 ? 80 : Math.min(80, sp) });
  return out;
}
const R_END = { x: 554, y: 270, w: 82, h: 22 };

function updateBattleInput() {
  const b = state.battle;
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  const L = battleLayout(), slots = handSlots();
  ui.hoverEnemy = -1;
  L.enemies.forEach((p, i) => { if (b.enemies[i].hp > 0 && over(enemyBox(p))) ui.hoverEnemy = i; });
  ui.hoverCard = -1;
  if (mouse.y >= 244) slots.forEach((s, i) => { if (mouse.x >= s.x && mouse.x < s.x + s.vis) ui.hoverCard = i; });
  ui.hoverPower = -1;
  b.powers.forEach((pw, i) => { if (over(powerSlot(i))) ui.hoverPower = i; });
  if (ui.sel >= b.hand.length) ui.sel = -1;
  if (!canAct()) { ui.drag = null; return; }

  if (mouse.pressed && ui.hoverCard >= 0) ui.drag = { hi: ui.hoverCard, moved: false };
  if (ui.drag && Math.hypot(mouse.x - mouse.dx, mouse.y - mouse.dy) > 6) ui.drag.moved = true;
  if (mouse.released) {
    if (ui.drag && b.hand[ui.drag.hi]) {
      const hi = ui.drag.hi, d = CARDS[b.hand[hi].id];
      if (ui.drag.moved) {
        if (d.target === 'enemy') { if (ui.hoverEnemy >= 0) tryPlay(hi, ui.hoverEnemy); }
        else if (mouse.y < 236) tryPlay(hi);
      } else if (d.target === 'enemy') {
        const ts = b.enemies.map((e, i) => i).filter(i => targetable(b.enemies[i]));
        if (ts.length === 1) tryPlay(hi, ts[0]); else ui.sel = ui.sel === hi ? -1 : hi;
      } else tryPlay(hi);
      ui.drag = null;
      return;
    }
    ui.drag = null;
    if (ui.hoverEnemy >= 0) {
      if (ui.sel >= 0) { tryPlay(ui.sel, ui.hoverEnemy); ui.sel = -1; } else if (targetable(b.enemies[ui.hoverEnemy])) b.target = ui.hoverEnemy;
      return;
    }
    if (clicked(R_END)) { endTurn(); return; }
  }
  for (let i = 0; i < 10; i++) if (pressed('Digit' + ((i + 1) % 10))) { if (b.hand[i]) tryPlay(i, b.target); return; }
  if (pressed('Tab')) {
    for (let k = 1; k <= b.enemies.length; k++) { const j = (b.target + k) % b.enemies.length; if (targetable(b.enemies[j])) { b.target = j; break; } }
  }
  if (pressed('KeyE') || pressed('Space') || pressed('Enter')) endTurn();
}

function intentLabel(e) { // {icon, text, col}
  const b = state.battle;
  if (willCancel(b, e)) return { icon: 'x', text: T('in_none'), col: COL.blue };
  const m = curMove(e);
  if (m.k === 'atk' || (m.k === 'swallow' && !b.powers.length)) {
    const d = intentDamage(e), hits = moveHits(m);
    return { icon: 'atk', text: hits > 1 ? d + '×' + hits : String(d), col: COL.red };
  }
  if (m.k === 'buff') return { icon: 'buff', text: '', col: COL.amberL };
  if (m.k === 'charge') return { icon: 'charge', text: '', col: COL.amberL };
  if (m.k === 'hide') return { icon: 'hide', text: '', col: COL.dim };
  if (m.k === 'summon') return { icon: 'summon', text: '', col: COL.purple };
  if (m.k === 'idle') return { icon: 'idle', text: '', col: COL.dim };
  return { icon: 'hex', text: '', col: COL.purple };
}
export function incomingDamage(b) {
  let total = 0;
  for (const e of b.enemies) if (intentIsAttack(e)) total += intentDamage(e) * moveHits(curMove(e));
  return total;
}
function bar(x, y, w, frac, col) {
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, 9);
  ctx.fillStyle = '#3a2430'; ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, Math.round(w * frac)), 7);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, Math.max(0, Math.round(w * frac)), 2);
}

function drawEnemyInfo(i) {
  const b = state.battle, e = b.enemies[i], def = ENEMIES[e.kind], m = curMove(e), w = 250, x = 150;
  const lines = [], il = intentLabel(e), note = willCancel(b, e) ? '' : moveNote(m);
  lines.push({ s: LX(m.name) + (il.icon === 'atk' ? ' ' + il.text : il.icon === 'x' ? ' — ' + il.text : ''), col: il.col });
  if (note) lines.push({ s: note, col: COL.text });
  for (const t of traitLines(e.kind)) lines.push({ s: T('trait') + ': ' + t, col: COL.amberL });
  lines.push({ s: LX(def.lore), col: COL.dim });
  const l = LORE[e.kind];
  if (l) { const place = l.placeEn ? (LANG === 'ko' && l.placeKo ? l.placeKo : l.placeEn) : ''; lines.push({ s: 'ZEN #' + l.no + (place ? ' · ' + place : '') + (l.cont ? ' · ' + contName(l.cont) : ''), col: COL.dim }); }
  let n = 0; const wrapped = lines.map(q => { const ws = wrap(q.s, w - 16); n += ws.length; return ws; });
  const nm = enemyName(e.kind), en = (l && l.en) || '';
  const h = 8 + 13 + (nm.text !== en ? 13 : 0) + 15 + n * 13 + 8;
  const y = Math.max(2, Math.min(24, 356 - h));
  box(x, y, w, h, COL.panel, COL.redD);
  let cy = y + 7;
  txt(nameStr(nm), x + 8, cy, COL.amberL); cy += 13;
  if (nm.text !== en) { txt(en, x + 8, cy, COL.dim); cy += 13; }
  txt(T('hp') + ' ' + e.hp + '/' + e.maxHp + (e.str ? ' · ' + T('st_str') + ' ' + e.str : '') + (e.block ? ' · ' + T('block') + ' ' + e.block : '') + (e.burn ? ' · ' + T('st_burn') + ' ' + e.burn : ''), x + 8, cy, COL.text); cy += 15;
  wrapped.forEach((ws, k) => { for (const s of ws) { txt(s, x + 8, cy, lines[k].col); cy += 13; } });
}

function powerSlot(i) { return { x: 8 + (i % 10) * 30, y: 24 + Math.floor(i / 10) * 20, w: 28, h: 18 }; }
function drawBattle() {
  const b = state.battle, run = state.run, L = battleLayout();
  const sh = b.shake > 0 ? b.shake / 0.35 : 0;
  const sx = Math.round(Math.sin(b.t * 90) * 4 * sh), sy = Math.round(Math.cos(b.t * 70) * 3 * sh);
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(BG[b.bg || b.cont] || BG.tazeem, sx, sy);
  // hedrons adrift in the sky: they sway, and the Roil cannot move them
  for (let i = 0; i < 3; i++) {
    const s = i === 0 ? SPR.hedronL : SPR.hedronM;
    ctx.drawImage(s, Math.round(((b.t * (3 + i * 2) + i * 230) % 700) - 30), Math.round(34 + i * 24 + Math.sin(b.t * 0.8 + i * 2) * 3));
  }
  // the expedition leader
  ctx.drawImage(SPR.leader, L.player.x - 16 + sx, L.player.y - 44 + sy);
  bar(78, 220, 80, run.hp / run.maxHp, COL.red);
  txt(run.hp + '/' + run.maxHp, 118, 230, COL.text, 'center');
  if (b.block > 0) { ctx.drawImage(ICON.blk, 64, 219); txt(String(b.block), 62, 218, COL.teal, 'right'); }
  let stx = 163;
  const plus = b.bonus + passive(b, 'atk');
  if (b.burn > 0) { ctx.drawImage(ICON.burn, stx, 219); txt(String(b.burn), stx + 11, 218, '#f08a2c'); stx += 26; }
  if (b.web > 0) { ctx.drawImage(ICON.web, stx, 219); stx += 13; }
  if (b.jam > 0) { ctx.drawImage(ICON.draw, stx, 219); txt('-' + b.jam, stx + 11, 218, COL.purple); stx += 28; }
  if (plus > 0) { ctx.drawImage(ICON.atk, stx, 219); txt('+' + plus, stx + 11, 218, COL.amberL); stx += 30; }
  if (b.pierceTurn) { ctx.drawImage(ICON.prc, stx, 219); stx += 13; }
  if (b.echo > 0) ctx.drawImage(ICON.up, stx, 219);
  const inc = incomingDamage(b);
  if (inc > 0 && b.phase === 'player') { const net = Math.max(0, inc - b.block); txtS(T('incoming', { n: net }), 118, 152, net > 0 ? COL.red : COL.teal, 'center'); }

  // the enemies, each with its next move over its head
  b.enemies.forEach((e, i) => {
    const p = L.enemies[i];
    if (e.hp <= 0) return;
    if (e.away > 0) { ctx.drawImage(ICON.away, p.x - 4, p.y - 40); txt(T('in_away', { n: e.away }), p.x, p.y - 26, COL.purple, 'center'); return; }
    const blink = e.flash > 0 && Math.floor(b.t * 30) % 2 === 0;
    ctx.globalAlpha = e.hidden ? 0.4 : 1;
    if (!blink) drawEnemyKind(ctx, e.kind, p.x + sx - (e.lunge > 0 ? 8 : 0), p.y + sy, b.t);
    ctx.globalAlpha = 1;
    const bw = Math.max(44, Math.min(p.w, 80));
    bar(p.x - bw / 2, 220, bw, e.hp / e.maxHp, COL.red);
    txt(e.hp + '/' + e.maxHp, p.x, 230, COL.text, 'center');
    if (e.block > 0) { ctx.drawImage(ICON.blk, p.x - bw / 2 - 12, 219); txt(String(e.block), p.x - bw / 2 - 14, 218, COL.teal, 'right'); }
    let ex = p.x + bw / 2 + 4;
    if (e.str !== 0) { ctx.drawImage(ICON.str, ex, 219); txt(String(e.str), ex + 10, 218, e.str > 0 ? COL.red : COL.blue); ex += 12 + textW(String(e.str)) + 2; }
    if (e.burn > 0) { ctx.drawImage(ICON.burn, ex, 219); txt(String(e.burn), ex + 10, 218, '#f08a2c'); }
    const il = intentLabel(e), tw = il.text ? textW(il.text) + 2 : 0, iy = Math.max(20, p.y - p.h - 20);
    const ix = Math.round(p.x - (10 + tw) / 2);
    ctx.drawImage(ICON[il.icon], ix, iy + 1);
    if (il.text) txtS(il.text, ix + 11, iy, il.col);
    if (e.charged) ctx.drawImage(ICON.charge, ix - 12, iy + 1);
    const want = ui.drag && ui.drag.moved && b.hand[ui.drag.hi] && CARDS[b.hand[ui.drag.hi].id].target === 'enemy';
    if ((i === b.target && b.enemies.filter(targetable).length > 1) || (ui.hoverEnemy === i && (want || ui.sel >= 0))) {
      const r = enemyBox(p); ctx.fillStyle = ui.hoverEnemy === i && (want || ui.sel >= 0) ? COL.white : COL.amber;
      ctx.fillRect(r.x, r.y + 18, 6, 1); ctx.fillRect(r.x, r.y + 18, 1, 6); ctx.fillRect(r.x + r.w - 6, r.y + 18, 6, 1); ctx.fillRect(r.x + r.w - 1, r.y + 18, 1, 6);
      ctx.fillRect(r.x, r.y + r.h - 30, 1, 6); ctx.fillRect(r.x, r.y + r.h - 25, 6, 1); ctx.fillRect(r.x + r.w - 1, r.y + r.h - 30, 1, 6); ctx.fillRect(r.x + r.w - 6, r.y + r.h - 25, 6, 1);
    }
  });

  // the top bar
  ctx.fillStyle = 'rgba(20,16,28,0.8)'; ctx.fillRect(0, 0, W, 19);
  const st = stopById(b.stop);
  txt(nameStr(stopName(st)) + ' · ' + T('day', { d: run.day }) + ' · ' + T('turnN', { n: b.turn }), 8, 3, COL.text);
  let hx = drawStat('heal', run.hp + '/' + run.maxHp, 330, 3, COL.text);
  drawStat('gold', String(run.gold), hx + 8, 3, COL.gold);
  drawHudButtons(true);
  // lasting cards in play; a quest shows its marks
  b.powers.forEach((pw, i) => {
    const r = powerSlot(i), q = CARDS[pw.id].quest;
    ctx.fillStyle = INK; ctx.fillRect(r.x, r.y, 28, 18); ctx.fillStyle = ui.hoverPower === i ? COL.amberL : q ? COL.goldD : COL.purple; ctx.fillRect(r.x + 1, r.y + 1, 26, 16);
    ctx.drawImage(cardArt(pw.id), 20, 11, 24, 14, r.x + 2, r.y + 2, 24, 14);
    if (q) txtS(pw.done ? 'OK' : (pw.n || 0) + '/' + val(q.need), r.x + 27, r.y + 6, pw.done ? COL.green : COL.white, 'right');
  });
  // energy, lands, piles
  box(8, 244, 58, 20, COL.panel, COL.goldD);
  ctx.drawImage(ICON.nrg, 13, 249); txt(b.energy + '/' + tune.energy, 27, 248, COL.gold);
  box(8, 266, 58, 20, COL.panel, b.landLock ? COL.purple : '#2f6a3a');
  ctx.drawImage(ICON.land, 13, 271); txt(b.landLock ? 'x' : b.landPlayed + '/' + landLimit(b), 27, 270, b.landLock ? COL.purple : COL.green);
  ctx.drawImage(ICON.draw, 13, 294); txt(String(b.draw.length), 27, 293, COL.text);
  ctx.globalAlpha = 0.6; ctx.drawImage(ICON.draw, 13, 312); ctx.globalAlpha = 1; txt(String(b.discard.length), 27, 311, COL.dim);
  if (over({ x: 8, y: 290, w: 58, h: 16 })) txtS(T('drawPile'), 70, 293, COL.text);
  if (over({ x: 8, y: 308, w: 58, h: 16 })) txtS(T('discardPile'), 70, 311, COL.text);
  if (over({ x: 8, y: 244, w: 58, h: 20 })) txtS(T('energy'), 70, 248, COL.gold);
  if (over({ x: 8, y: 266, w: 58, h: 20 })) txtS(T(b.landLock ? 'no_landlock' : 'kwh_land'), 70, 270, COL.green);
  const act = canAct();
  drawButton(R_END, T('endTurn'), act && b.energy === 0 && Math.floor(b.t * 2) % 2 === 0, !act);
  txt(T(b.phase === 'enemy' ? 'enemyTurn' : 'yourTurn'), 595, 254, b.phase === 'enemy' ? COL.red : COL.teal, 'center');

  // the hand
  const slots = handSlots();
  const lifted = ui.drag && ui.drag.moved ? ui.drag.hi : -1;
  const drawOne = (i, x, y) => {
    const id = b.hand[i].id, d = CARDS[id];
    const cost = costOf(b, id);
    const landOff = d.type === 'land' && (b.landLock || b.landPlayed >= landLimit(b));
    const noTarget = d.target === 'enemy' && ui.hoverEnemy >= 0 && lifted === i ? playReason(b, id, ui.hoverEnemy) : null;
    drawCard(id, x, y, { cost, dim: !act || cost > b.energy || landOff || !!noTarget, hot: ui.sel === i });
    if (i < 10) txt(String((i + 1) % 10), x + 70, y + 92, COL.dim);
  };
  slots.forEach((s, i) => { if (i !== ui.hoverCard && i !== lifted) drawOne(i, s.x, s.y); });
  if (ui.hoverCard >= 0 && ui.hoverCard !== lifted && slots[ui.hoverCard]) drawOne(ui.hoverCard, slots[ui.hoverCard].x, 246);
  if (lifted >= 0 && b.hand[lifted]) drawOne(lifted, mouse.x - 40, mouse.y - 60);

  if (b.fly) { // the card just played, on its way to its target
    const k = Math.min(1, b.fly.t / 0.14), pe = b.fly.ti >= 0 ? L.enemies[b.fly.ti] : null;
    const to = pe ? { x: pe.x, y: pe.y - pe.h / 2 } : { x: L.player.x, y: L.player.y - 30 };
    const fx = Math.round(320 + (to.x - 320) * k), fy = Math.round(262 + (to.y - 262) * k - Math.sin(k * Math.PI) * 24);
    ctx.fillStyle = INK; ctx.fillRect(fx - 8, fy - 10, 16, 20);
    ctx.fillStyle = TYPE_COL[CARDS[b.fly.id].type]; ctx.fillRect(fx - 7, fy - 9, 14, 18);
    ctx.fillStyle = COL.paper; ctx.fillRect(fx - 5, fy - 6, 10, 7);
  }
  // numbers that rise as each effect lands
  for (const f of b.floats) {
    ctx.globalAlpha = f.t > tune.float_time * 0.7 ? 0.5 : 1;
    txtS(f.text, f.x, f.y - f.t * 24, f.col, 'center');
  }
  ctx.globalAlpha = 1;
  if (b.msgT > 0 && b.msg) { const w = textW(b.msg) + 20; box(Math.round(320 - w / 2), 196, w, 20, COL.panel, COL.red); txt(b.msg, 320, 200, COL.text, 'center'); }
  if (lifted < 0 && !ui.deck) {
    if (ui.hoverCard >= 0 && b.hand[ui.hoverCard]) drawCardInfo(b.hand[ui.hoverCard].id, Math.max(150, Math.min(slots[ui.hoverCard].x - 85, 380)), 24, 250);
    else if (ui.hoverEnemy >= 0) drawEnemyInfo(ui.hoverEnemy);
    else if (ui.hoverPower >= 0 && b.powers[ui.hoverPower]) {
      const pw = b.powers[ui.hoverPower], q = CARDS[pw.id].quest;
      drawCardInfo(pw.id, 8, 46, 250, q ? (pw.done ? T('marksDone') : T('marks', { n: pw.n || 0, m: val(q.need) })) : '');
    }
  }
  if (ui.deck) drawDeckView();
}

// ---- after a fight: gold, and one of this land's cards, or none ----
const R_SKIP = { x: 270, y: 330, w: 100, h: 20 };
function rewardSlot(i, n) { return { x: Math.round(320 + (i - (n - 1) / 2) * 150 - 40), y: 64, w: 80, h: 108 }; }
function takeReward(i) {
  const rw = state.reward;
  if (i >= 0 && rw.cards[i]) { addCard(rw.cards[i]); sfx('power'); events.push({ t: state.t, reward: rw.cards[i] }); } else sfx('card');
  state.reward = null; afterStop();
}
function updateReward(dt) {
  const rw = state.reward; rw.t += dt;
  if (updateHudButtons(false)) return;
  ui.hoverCard = -1;
  rw.cards.forEach((id, i) => { if (over(rewardSlot(i, rw.cards.length))) ui.hoverCard = i; });
  if (rw.t < 0.3) return;
  for (let i = 0; i < rw.cards.length; i++) if (pressed('Digit' + (i + 1))) { takeReward(i); return; }
  if (pressed('KeyS') || pressed('Digit0') || pressed('Escape') || clicked(R_SKIP)) { takeReward(-1); return; }
  if (mouse.released && ui.hoverCard >= 0) takeReward(ui.hoverCard);
}
function dimBackdrop(cont) {
  ctx.drawImage(BG[cont] || BG.tazeem, 0, 0);
  ctx.fillStyle = 'rgba(20,16,28,0.78)'; ctx.fillRect(0, 0, W, H);
}
function drawReward() {
  const rw = state.reward, run = state.run;
  dimBackdrop(rw.bg || rw.cont);
  txt(T('rewardTitle') + ' — ' + contName(rw.cont), 320, 16, COL.amberL, 'center');
  txt(T('goldGain', { n: rw.gold }) + (rw.heal ? ' · ' + T('healGain', { n: rw.heal }) : ''), 320, 34, COL.gold, 'center');
  rw.cards.forEach((id, i) => {
    const r = rewardSlot(i, rw.cards.length);
    drawCard(id, r.x, r.y - (ui.hoverCard === i ? 4 : 0), { hot: ui.hoverCard === i });
    txt(String(i + 1), r.x + 40, r.y + 112, COL.amberL, 'center');
    const lines = wrap(cardText(id), 146).slice(0, 6);
    lines.forEach((ln, k) => txt(ln, r.x + 40, r.y + 126 + k * 13, COL.text, 'center'));
  });
  txt(T('rewardHint'), 320, 312, COL.dim, 'center');
  drawButton(R_SKIP, T('skip'));
  drawStat('heal', run.hp + '/' + run.maxHp, 8, 3, COL.text);
  drawStat('gold', String(run.gold), 80, 3, COL.gold);
  drawHudButtons(false);
  if (ui.hoverCard >= 0 && rw.cards[ui.hoverCard]) { const r = rewardSlot(ui.hoverCard, rw.cards.length); drawCardInfo(rw.cards[ui.hoverCard], r.x + 40 < 320 ? r.x + 88 : r.x - 258, 40, 250); }
}

// ---- a town's market ----
const R_SREM = { x: 130, y: 330, w: 190, h: 20 }, R_SLEAVE = { x: 340, y: 330, w: 150, h: 20 };
function shopSlot(i) { return { x: 30 + i * 120, y: 50, w: 80, h: 108 }; }
export function openShop(s) {
  const pl = PLACE_LAND[s.id], first = pl && !state.run.deck.some(c => c.id === pl) ? [pl] : []; // the place's own land, while you lack it
  const local = pickCards((POOLS[s.cont] || []).filter(id => id !== pl), 3 - first.length, RARITY_WEIGHT);
  let rest = [];
  for (const c in POOLS) if (c !== s.cont) rest = rest.concat(POOLS[c]);
  const far = pickCards(rest, 5 - first.length - local.length, RARITY_WEIGHT);
  state.shop = { stop: s.id, cont: s.cont, removed: false, items: first.concat(local, far).map(id => ({ id, price: cardPrice(id), sold: false })) };
  state.screen = 'shop';
}
function buyItem(i) {
  const sh = state.shop, it = sh.items[i], run = state.run;
  if (!it || it.sold) return;
  if (run.gold < it.price) { state.banner = { text: T('no_gold'), t: 1.2 }; sfx('deny'); return; }
  run.gold -= it.price; it.sold = true; addCard(it.id); sfx('power'); events.push({ t: state.t, buy: it.id });
}
function updateShop(dt) {
  const sh = state.shop, run = state.run;
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  ui.hoverCard = -1;
  sh.items.forEach((it, i) => { if (over(shopSlot(i))) ui.hoverCard = i; });
  for (let i = 0; i < sh.items.length; i++) if (pressed('Digit' + (i + 1))) { buyItem(i); return; }
  if (mouse.released && ui.hoverCard >= 0) { buyItem(ui.hoverCard); return; }
  if ((pressed('KeyR') || clicked(R_SREM)) && !sh.removed) {
    if (run.gold < tune.price_remove) { state.banner = { text: T('no_gold'), t: 1.2 }; sfx('deny'); return; }
    ui.deck = { mode: 'remove', page: 0, done() { state.run.gold -= tune.price_remove; if (state.shop) state.shop.removed = true; } };
    return;
  }
  if (pressed('Enter') || pressed('Escape') || clicked(R_SLEAVE)) { state.shop = null; sfx('card'); afterStop(); }
}
function drawShop() {
  const sh = state.shop, run = state.run, st = stopById(sh.stop);
  dimBackdrop(sh.cont);
  txt(T('shopTitle', { p: nameStr(stopName(st)) }), 30, 24, COL.amberL);
  drawStat('heal', run.hp + '/' + run.maxHp, 8, 3, COL.text);
  drawStat('gold', String(run.gold), 80, 3, COL.gold);
  sh.items.forEach((it, i) => {
    const r = shopSlot(i);
    drawCard(it.id, r.x, r.y, { dim: it.sold || run.gold < it.price, hot: ui.hoverCard === i && !it.sold });
    if (it.sold) txt(T('sold'), r.x + 40, r.y + 112, COL.dim, 'center');
    else { ctx.drawImage(ICON.gold, r.x + 16, r.y + 113); txt((i + 1) + ': ' + it.price, r.x + 30, r.y + 112, run.gold >= it.price ? COL.gold : COL.red); }
    const lines = wrap(cardText(it.id), 114).slice(0, 6);
    lines.forEach((ln, k) => txt(ln, r.x + 40, r.y + 128 + k * 13, it.sold ? COL.dim : COL.text, 'center'));
  });
  if (ui.hoverCard >= 0 && sh.items[ui.hoverCard]) {
    const id = sh.items[ui.hoverCard].id;
    txt(nameStr(cardName(id)) + ' · ' + cardOrigin(id), 320, 262, COL.amberL, 'center');
    para(LX(CARDS[id].lore), 60, 277, 520, COL.dim, 2);
  }
  txt(T('shopHint'), 320, 312, COL.dim, 'center');
  drawButton(R_SREM, sh.removed ? T('sold') : T('shopRemove', { p: tune.price_remove }), false, sh.removed || run.gold < tune.price_remove);
  drawButton(R_SLEAVE, T('leave'));
  drawHudButtons(true);
  if (ui.deck) drawDeckView();
}

// ---- a camp: rest, or take a card out of the deck ----
const R_REST = { x: 170, y: 150, w: 300, h: 26 }, R_TRIM = { x: 170, y: 186, w: 300, h: 26 };
export function openCamp(s) { state.camp = { stop: s.id, cont: s.cont }; state.screen = 'camp'; }
function campHeal() { const run = state.run; return Math.min(run.maxHp - run.hp, Math.round(run.maxHp * tune.camp_heal)); }
function updateCamp(dt) {
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  if (pressed('Digit1') || clicked(R_REST)) { state.run.hp += campHeal(); sfx('heal'); state.camp = null; afterStop(); return; }
  if (pressed('Digit2') || clicked(R_TRIM)) ui.deck = { mode: 'remove', page: 0, done() { state.camp = null; afterStop(); } };
}
function drawCamp() {
  const cp = state.camp, run = state.run, st = stopById(cp.stop);
  dimBackdrop(cp.cont);
  ctx.drawImage(SPR.leader, 304, 84);
  ctx.drawImage(ICON.burn, 344, 116); ctx.drawImage(ICON.camp, 262, 114);
  txt(T('campTitle') + ' — ' + nameStr(stopName(st)), 320, 40, COL.amberL, 'center');
  para(LX(STOP_TEXT[st.id]), 120, 58, 400, COL.dim, 2);
  drawButton(R_REST, '1  ' + T('campRest', { n: campHeal() }));
  drawButton(R_TRIM, '2  ' + T('campTrim'));
  txt(T('campHint'), 320, 222, COL.dim, 'center');
  drawStat('heal', run.hp + '/' + run.maxHp, 8, 3, COL.text);
  drawStat('gold', String(run.gold), 80, 3, COL.gold);
  drawHudButtons(true);
  if (ui.deck) drawDeckView();
}

// ---- the whole of play, one step and one frame ----
export function updatePlay(dt) {
  state.t += dt; ui.t += dt;
  if (state.banner && state.banner.t > 0) state.banner.t -= dt;
  switch (state.screen) {
    case 'map': updateMap(dt); break;
    case 'travel': updateTravel(dt); break;
    case 'battle': updateBattleInput(); if (state.battle) updateBattle(dt); break;
    case 'reward': updateReward(dt); break;
    case 'shop': updateShop(dt); break;
    case 'camp': updateCamp(dt); break;
  }
}
export function drawPlay() {
  switch (state.screen) {
    case 'map': drawMap(); break;
    case 'travel': drawTravel(); break;
    case 'battle': if (state.battle) drawBattle(); break;
    case 'reward': drawReward(); break;
    case 'shop': drawShop(); break;
    case 'camp': drawCamp(); break;
  }
  drawBanner();
}

// The run is over: what it gained, for the ending screen.
export function finishRun(won) {
  const run = state.run;
  const places = run.route.length - 1;
  state.gained = T('summary', { n: places, c: run.conts.length, k: run.deck.length });
  state.score = places * 10 + run.fights * 15 + (won ? 100 : 0);
  state.won = won;
  ui.deck = null; ui.drag = null; ui.sel = -1; state.pending = null;
  setScene(won ? 'results' : 'over');
  events.push({ t: state.t, end: won ? 'won' : 'lost' });
}
export function drawEnding(won) {
  ctx.fillStyle = COL.panel; ctx.fillRect(0, 0, W, H);
  const run = state.run, here = stopById(run.at);
  drawWorld();
  drawTrail(run.route, COL.amberL);
  for (const id of run.route) { const s = stopById(id); ctx.drawImage(ICON[s.cls], MAP_X + s.x - 5, MAP_Y + s.y - 5); }
  drawMarker(MAP_X + here.x, MAP_Y + here.y);
  box(490, 20, 148, 338, COL.panel, won ? COL.amber : COL.redD);
  let y = para(won ? T('winTitle') : T('overTitle'), 496, 28, 136, won ? COL.amberL : COL.red, 0) + 6;
  if (!won) y = para(T('overAt', { d: run.day, p: nameStr(stopName(here)) }), 496, y, 136, COL.text, 0) + 6;
  y = para(state.gained, 496, y, 136, COL.text, 0) + 6;
  const names = run.route.map(id => nameStr(stopName(stopById(id)))).join(' → ');
  y = para(names, 496, y, 136, COL.dim, 12) + 8;
  para(won ? T('again') : T('restart'), 496, Math.max(y, 300), 136, COL.amberL, 0);
  drawHudButtons(false);
}
