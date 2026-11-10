import './screens'; // load order, as in the one-shot's page: this module runs after screens
import { tune } from './config';
import { LORE } from './game/data';
import { events, setScene, state } from './game/state';
import { H, W, ctx } from './screen';
import { mouse, pressed } from './input';
import { sfx } from './audio';
import { LANG, LX, STOP_TEXT, T, contName, stopName } from './text';
import { BASIC_OF, CARDS, COLOR_ORDER, LAND_OF, POOLS, cardArt, cardName, cardOrigin, cardPrice, cardText, family, rarityWeights, val } from './cards';
import { HAPPENINGS, type Way } from './events';
import { rng } from './game/rng';
import { PLACE_LAND } from './cards2';
import { BOSS, ENEMIES, curMove, enemyName, intentDamage, intentIsAttack, moveHits, prey } from './enemies';
import { moveNote, traitLines } from './text2';
import { BG, COL, ICON, INK, SPR, drawEnemyKind } from './art';
import { canAct, colourLean, costOf, endTurn, enemyFlies, incomingNet, landColor, landLimit, landReason, landStacks, memberAir, memberAtk, memberDef, memberPierce, modeTarget, pickCards, playLand, playReason, strikeDamage, strikesOf, targetable, toggleStance, tryPlay, updateBattle, willCancel, willGuard, willStrike } from './battle';
import { MAP_X, MAP_Y, addCard, afterStop, enterStop, box, cardEdge, clicked, kickGem, drawBanner, drawButton, drawCard, drawCardInfo, drawDeckView, drawGem, drawHudButtons, drawMap, drawSea, updateSea, drawMarker, drawStat, drawTrail, drawTravel, drawWorld, nameStr, offColour, over, para, stopById, textW, txt, txtS, ui, updateDeckView, updateHudButtons, updateMap, updateTravel, wrap } from './screens';
import type { Stop } from './game/data';
import type { Battle, CardInPlay, Enemy, Loose, Member } from './game/types';
import * as rules from './game/rules';
// The fight on screen (the party, mana and lands, the hand, intents, the panel that explains a
// card), and what follows a stop: the reward, a town's market, a camp. Input is read on the step;
// drawing only draws.

// ---- where things stand in a fight ----
export function battleLayout() {
  const b = state.battle, n = b.enemies.length;
  const xs = n === 1 ? [476] : n === 2 ? [416, 548] : [372, 470, 568];
  const enemies = b.enemies.map((e: Enemy, i: number) => {
    const s = SPR[e.kind] || { width: 48, height: 40 }; // (no picture is built when a check runs without a page)
    const w = e.kind === BOSS ? 96 : s.width, h = e.kind === BOSS ? 96 : s.height + (ENEMIES[e.kind].fly ? 12 : 0);
    return { x: xs[i], y: 214, w, h };
  });
  // the leader, then the creatures in the order they came, between the leader and the enemies
  const party = b.party.map((m: Member, i: number) => ({ x: i === 0 ? 118 : 136 + i * 42, y: 214 }));
  return { player: { x: 118, y: 214 }, party, enemies };
}
function enemyBox(p: Loose) { const w = Math.max(p.w, 50); return { x: p.x - w / 2 - 4, y: p.y - p.h - 26, w: w + 8, h: p.h + 52 }; }
function mateBox(i: number) { const p = battleLayout().party[i]; return i === 0 ? { x: 84, y: 166, w: 54, h: 50 } : { x: p.x - 20, y: 158, w: 40, h: 56 }; }
// Up to five cards sit mid-screen. A bigger hand closes up and moves left, so that its last card
// stays clear of the End turn button (x 554 on): a click on the button's edge is never a card's.
function handSlots() {
  const n = state.battle.hand.length;
  const sp = n <= 5 ? 84 : Math.floor(396 / (n - 1));
  const x0 = Math.round((n <= 5 ? 320 : 308) - ((n - 1) * sp) / 2 - 40);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + i * sp, y: 254 + Math.round(Math.abs(i - (n - 1) / 2) * 2), vis: i === n - 1 ? 80 : Math.min(80, sp) });
  return out;
}
const R_END = { x: 554, y: 270, w: 82, h: 22 };
// The left column: the mana to spend, the lands (in play, and the pile to play one from), the piles.
const R_MANA = { x: 8, y: 242, w: 58, h: 26 }, R_LANDS = { x: 8, y: 270, w: 58, h: 60 };
function landSlot(i: number) { return { x: 11 + (i % 3) * 18, y: 287 + Math.floor(i / 3) * 14, w: 17, h: 13 }; }
const STANCE_KEYS = ['KeyQ', 'KeyW', 'KeyR', 'KeyT', 'KeyY'];
// Where a card's panel goes in a fight: between the leader and the enemies still standing, so it
// covers neither the move shown over an enemy's head nor the incoming-damage line over the leader.
function infoPlace() {
  const b = state.battle;
  let left = 408;
  battleLayout().enemies.forEach((p: Loose, i: number) => { if (b.enemies[i].hp > 0) left = Math.min(left, enemyBox(p).x); });
  return { x: 158, w: Math.max(170, Math.min(242, left - 8 - 158)) };
}
// Who a card in hand would be played on when none is named: the target for one that aims, the leader for one that is worn.
function aimOf(b: Battle, id: string, kicked?: boolean) { return modeTarget(CARDS[id], kicked) === 'mate' ? 0 : b.target; }
// Is this card to be played with its kicker? K armed it, or it was grabbed by its kicker gem.
function kickOf(b: Battle, hi: number, grabbed?: boolean) { return !!(b.hand[hi] && CARDS[b.hand[hi].id].kick && (ui.kick || grabbed)); }

function updateBattleInput() {
  const b = state.battle;
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  const L = battleLayout(), slots = handSlots(), stacks = landStacks(b);
  ui.hoverEnemy = -1;
  L.enemies.forEach((p: Loose, i: number) => { if (b.enemies[i].hp > 0 && over(enemyBox(p))) ui.hoverEnemy = i; });
  ui.hoverCard = -1;
  if (mouse.y >= 244) slots.forEach((s, i) => { if (mouse.x >= s.x && mouse.x < s.x + s.vis) ui.hoverCard = i; });
  ui.hoverPower = -1;
  b.powers.forEach((pw: CardInPlay, i: number) => { if (over(powerSlot(i))) ui.hoverPower = i; });
  ui.hoverMate = -1;
  b.party.forEach((m: Member, i: number) => { if (over(mateBox(i))) ui.hoverMate = i; });
  ui.hoverLand = -1;
  stacks.forEach((st, i) => { if (i < 9 && over(landSlot(i))) ui.hoverLand = i; });
  if (ui.sel >= b.hand.length) ui.sel = -1;
  if (!canAct()) { ui.drag = null; return; }

  // a card grabbed by its kicker gem is played with the kicker paid
  if (mouse.pressed && ui.hoverCard >= 0) { const s = slots[ui.hoverCard], g = kickGem(s.x, 246); ui.drag = { hi: ui.hoverCard, moved: false, kick: !!CARDS[b.hand[ui.hoverCard].id].kick && over(g) }; }
  if (ui.drag && Math.hypot(mouse.x - mouse.dx, mouse.y - mouse.dy) > 6) ui.drag.moved = true;
  // a play ends what was armed and picked up; a card only picked up keeps its kicker for the click that follows
  const play = (hi: number, ti: number | undefined, kicked: boolean) => { tryPlay(hi, ti, kicked); ui.kick = false; ui.sel = -1; };
  const pick = (hi: number, kicked: boolean) => { if (ui.sel === hi) { ui.sel = -1; ui.kick = false; } else { ui.sel = hi; ui.kick = kicked; } };
  if (mouse.released) {
    if (ui.drag && b.hand[ui.drag.hi]) {
      const hi = ui.drag.hi, kicked = kickOf(b, hi, ui.drag.kick), target = modeTarget(CARDS[b.hand[hi].id], kicked);
      if (ui.drag.moved) { // let go over what it is played on: an enemy, one of yours, or the field
        if (target === 'enemy') { if (ui.hoverEnemy >= 0) play(hi, ui.hoverEnemy, kicked); }
        else if (target === 'mate') { if (ui.hoverMate >= 0) play(hi, ui.hoverMate, kicked); else if (mouse.y < 236 && b.party.length === 1) play(hi, 0, kicked); }
        else if (mouse.y < 236) play(hi, undefined, kicked);
      } else if (target === 'enemy') { // a click: played at once when there is one to play it on, picked up otherwise
        const ts = b.enemies.map((e: Enemy, i: number) => i).filter((i: number) => targetable(b.enemies[i]));
        if (ts.length === 1) play(hi, ts[0], kicked); else pick(hi, kicked);
      } else if (target === 'mate') {
        if (b.party.length === 1) play(hi, 0, kicked); else pick(hi, kicked);
      } else play(hi, undefined, kicked);
      ui.drag = null;
      return;
    }
    ui.drag = null;
    const held = ui.sel >= 0 && b.hand[ui.sel] ? modeTarget(CARDS[b.hand[ui.sel].id], kickOf(b, ui.sel)) : '';
    if (ui.hoverEnemy >= 0) {
      if (held === 'enemy') play(ui.sel, ui.hoverEnemy, kickOf(b, ui.sel)); else if (targetable(b.enemies[ui.hoverEnemy])) b.target = ui.hoverEnemy;
      return;
    }
    if (ui.hoverMate >= 0) { // a card picked up for one of yours goes on them; otherwise the click turns them between strike and guard
      if (held === 'mate') play(ui.sel, ui.hoverMate, kickOf(b, ui.sel)); else toggleStance(ui.hoverMate);
      return;
    }
    if (ui.hoverLand >= 0) { b.landSel = ui.hoverLand; playLand(ui.hoverLand); return; }
    if (clicked(R_END)) { ui.sel = -1; ui.kick = false; endTurn(); return; }
  }
  if (pressed('KeyK')) ui.kick = !ui.kick; // the next card played is played with its kicker
  for (let i = 0; i < 10; i++) if (pressed('Digit' + ((i + 1) % 10))) {
    // with a card picked up for one of yours, the number names who: 1 the leader, 2 on the creatures
    if (ui.sel >= 0 && b.hand[ui.sel] && modeTarget(CARDS[b.hand[ui.sel].id], kickOf(b, ui.sel)) === 'mate') { if (i < b.party.length) play(ui.sel, i, kickOf(b, ui.sel)); return; }
    if (!b.hand[i]) return;
    const kicked = kickOf(b, i);
    if (modeTarget(CARDS[b.hand[i].id], kicked) === 'mate' && b.party.length > 1) { pick(i, kicked); return; }
    play(i, aimOf(b, b.hand[i].id, kicked), kicked);
    return;
  }
  if (pressed('Escape')) { ui.sel = -1; ui.kick = false; }
  if (pressed('KeyZ')) { playLand(b.landSel); return; }
  if (pressed('KeyX') && stacks.length) b.landSel = (b.landSel + 1) % stacks.length;
  STANCE_KEYS.forEach((k, i) => { if (pressed(k) && i < b.party.length) toggleStance(i); });
  if (pressed('Tab')) {
    for (let k = 1; k <= b.enemies.length; k++) { const j = (b.target + k) % b.enemies.length; if (targetable(b.enemies[j])) { b.target = j; break; } }
  }
  if (pressed('KeyE') || pressed('Space') || pressed('Enter')) { ui.sel = -1; ui.kick = false; endTurn(); }
}

function intentLabel(e: Enemy) { // {icon, text, col}
  const b = state.battle;
  if (willCancel(b, e)) return { icon: 'x', text: T('in_none'), col: COL.blue };
  const m = curMove(e);
  if (m.k === 'atk' || (m.k === 'swallow' && !prey(b))) {
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
export function incomingDamage(b: Battle) {
  let total = 0;
  for (const e of b.enemies) if (intentIsAttack(e)) total += intentDamage(e) * moveHits(curMove(e));
  return total;
}
function bar(x: number, y: number, w: number, frac: number, col: string) {
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, 9);
  ctx.fillStyle = '#3a2430'; ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, Math.round(w * frac)), 7);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, Math.max(0, Math.round(w * frac)), 2);
}
function corners(r: { x: number; y: number; w: number; h: number }, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(r.x, r.y, 6, 1); ctx.fillRect(r.x, r.y, 1, 6); ctx.fillRect(r.x + r.w - 6, r.y, 6, 1); ctx.fillRect(r.x + r.w - 1, r.y, 1, 6);
  ctx.fillRect(r.x, r.y + r.h - 6, 1, 6); ctx.fillRect(r.x, r.y + r.h - 1, 6, 1); ctx.fillRect(r.x + r.w - 1, r.y + r.h - 6, 1, 6); ctx.fillRect(r.x + r.w - 6, r.y + r.h - 1, 6, 1);
}

function drawEnemyInfo(i: number) {
  const b = state.battle, e = b.enemies[i], def = ENEMIES[e.kind], m = curMove(e), w = 250, x = 150;
  const lines: Loose[] = [], il = intentLabel(e), note = willCancel(b, e) ? '' : moveNote(m);
  lines.push({ s: LX(m.name) + (il.icon === 'atk' ? ' ' + il.text : il.icon === 'x' ? ' — ' + il.text : ''), col: il.col });
  if (note) lines.push({ s: note, col: COL.text });
  for (const t of traitLines(e.kind)) lines.push({ s: T('trait') + ': ' + t, col: COL.amberL });
  for (const c of e.auras) lines.push({ s: nameStr(cardName(c.id)) + ': ' + cardText(c.id), col: COL.purple });
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
  txt(T('hp') + ' ' + e.hp + '/' + e.maxHp + (e.str ? ' · ' + T('st_str') + ' ' + e.str : '') + (e.block ? ' · ' + T('block') + ' ' + e.block : '') + (e.burn ? ' · ' + T('st_burn') + ' ' + e.burn : '') + (e.rot ? ' · ' + T('st_rot') + ' ' + e.rot : '') + (e.grasp ? ' · ' + T('st_grasp') : ''), x + 8, cy, COL.text); cy += 15;
  wrapped.forEach((ws, k) => { for (const s of ws) { txt(s, x + 8, cy, lines[k].col); cy += 13; } });
}
// What one of yours is doing this turn, in a line: "Strike 5 ×2 · Guard 3".
function stanceLine(b: Battle, m: Member) {
  if (m.fresh) return T('stance_new') + ' ' + memberDef(b, m);
  const out: string[] = [];
  if (willStrike(b, m)) out.push(T('stance_atk') + ' ' + strikeDamage(b, m) + (strikesOf(m) > 1 ? ' ×2' : ''));
  if (willGuard(b, m)) out.push(T('stance_grd') + ' ' + memberDef(b, m) + (!memberAir(b, m) && b.enemies.some((e: Enemy) => e.hp > 0 && enemyFlies(b, e)) ? ' (' + T('groundOnly') + ')' : ''));
  return out.join(' · ');
}
function wornLine(m: Member) { return m.gear.length ? T('wears', { c: m.gear.map((g: CardInPlay) => nameStr(cardName(g.id))).join(', ') }) : ''; }
// The leader's panel: what they do this turn and what they wear.
function drawLeaderInfo(x: number, w: number) {
  const b = state.battle, m = b.party[0];
  const lines: { s: string; col: string }[] = [{ s: stanceLine(b, m), col: COL.gold }];
  if (m.gear.length) lines.push({ s: wornLine(m), col: COL.text });
  for (const g of m.gear) lines.push({ s: nameStr(cardName(g.id)) + ': ' + cardText(g.id), col: COL.dim });
  lines.push({ s: T('stanceHelp'), col: COL.green }, { s: T('leaderHelp'), col: COL.dim });
  let n = 0; const wrapped = lines.map(q => { const ws = wrap(q.s, w - 16); n += ws.length; return ws; });
  const h = 8 + 15 + n * 13 + 8;
  box(x, 24, w, h, COL.panel, COL.amberD);
  let cy = 31;
  txt(T('you') + ' · ' + memberAtk(b, m) + '/' + memberDef(b, m), x + 8, cy, COL.amberL); cy += 15;
  wrapped.forEach((ws, k) => { for (const s of ws) { txt(s, x + 8, cy, lines[k].col); cy += 13; } });
}

function powerSlot(i: number) { return { x: 8 + (i % 10) * 30, y: 24 + Math.floor(i / 10) * 20, w: 28, h: 18 }; }
// One of yours on the field: a creature as its card's picture in a frame, with what it does this
// turn over it (a sword: it strikes; a shield: it guards) and its attack and guard under it.
function drawMate(b: Battle, i: number, sx: number, sy: number, aim: boolean) {
  const m = b.party[i], p = battleLayout().party[i], strike = willStrike(b, m), guard = willGuard(b, m);
  const lunge = m.lunge > 0 ? 6 : 0;
  const cx = p.x + sx + lunge, top = i === 0 ? 170 : 171;
  if (i === 0) ctx.drawImage(SPR.leader, p.x - 16 + sx + lunge, p.y - 44 + sy);
  else {
    ctx.fillStyle = INK; ctx.fillRect(cx - 19, top + sy, 38, 28);
    ctx.fillStyle = m.fresh ? COL.panelLL : strike ? COL.amber : COL.teal; ctx.fillRect(cx - 18, top + 1 + sy, 36, 26);
    ctx.globalAlpha = m.fresh ? 0.6 : 1;
    ctx.drawImage(cardArt(m.id), 15, 6, 34, 24, cx - 17, top + 2 + sy, 34, 24);
    ctx.globalAlpha = 1;
    m.gear.slice(0, 4).forEach((g: CardInPlay, k: number) => { ctx.fillStyle = INK; ctx.fillRect(cx + 12 - k * 6, top + 1 + sy, 6, 6); ctx.fillStyle = cardEdge(CARDS[g.id]); ctx.fillRect(cx + 13 - k * 6, top + 2 + sy, 4, 4); });
  }
  // what it does this turn, over its head; its numbers, with the one in use lit
  const ix = i === 0 ? 90 : cx - (strike && guard ? 10 : 4), iy = i === 0 ? 172 : 160;
  if (strike) ctx.drawImage(ICON.atk, ix, iy);
  if (guard) { ctx.globalAlpha = m.fresh ? 0.55 : 1; ctx.drawImage(ICON.blk, strike ? ix + 11 : ix, iy); ctx.globalAlpha = 1; }
  if (memberPierce(b, m) && strike) ctx.drawImage(ICON.prc, i === 0 ? 78 : cx + 8, iy);
  const a = String(strike ? strikeDamage(b, m) : memberAtk(b, m)) + (strike && strikesOf(m) > 1 ? '×2' : ''), d = String(memberDef(b, m));
  const tx = i === 0 ? 96 : cx, ty = i === 0 ? 184 : 200, wA = textW(a), wAll = wA + textW('/' + d);
  txtS(a, tx - wAll / 2, ty, strike ? COL.amberL : COL.dim);
  txtS('/', tx - wAll / 2 + wA, ty, COL.dim);
  const passed = guard && !memberAir(b, m) && b.enemies.some((e: Enemy) => intentIsAttack(e) && enemyFlies(b, e)); // a flier would pass this guard
  txtS(d, tx - wAll / 2 + wA + textW('/'), ty, !guard ? COL.dim : passed ? '#7a9a96' : COL.teal);
  if (aim) { corners(mateBox(i), ui.hoverMate === i ? COL.white : COL.amber); txtS(String(i + 1), mateBox(i).x + 2, mateBox(i).y - 2, COL.amberL); }
}
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
  const act = canAct();
  const lifted = ui.drag && ui.drag.moved ? ui.drag.hi : -1;
  const held = lifted >= 0 ? lifted : ui.sel; // the card in the air or picked up: what it may be played on is marked
  const heldFor = held >= 0 && b.hand[held] ? modeTarget(CARDS[b.hand[held].id], kickOf(b, held, lifted >= 0 && ui.drag.kick)) : '';
  // the expedition: the leader, and the creatures on the field
  b.party.forEach((m: Member, i: number) => drawMate(b, i, sx, sy, heldFor === 'mate'));
  bar(78, 220, 80, run.hp / run.maxHp, COL.red);
  txt(run.hp + '/' + run.maxHp, 118, 230, COL.text, 'center');
  if (b.block + b.blockGround > 0) { ctx.drawImage(ICON.blk, 64, 219); txt(String(b.block + b.blockGround), 62, 218, COL.teal, 'right'); }
  let stx = 163;
  if (b.burn > 0) { ctx.drawImage(ICON.burn, stx, 219); txt(String(b.burn), stx + 11, 218, '#f08a2c'); stx += 26; }
  if (b.web > 0) { ctx.drawImage(ICON.web, stx, 219); stx += 13; }
  if (b.jam > 0) { ctx.drawImage(ICON.draw, stx, 219); txt('-' + b.jam, stx + 11, 218, COL.purple); stx += 28; }
  if (b.bonus > 0) { ctx.drawImage(ICON.atk, stx, 219); txt('+' + b.bonus, stx + 11, 218, COL.amberL); stx += 30; }
  if (b.pierceTurn) { ctx.drawImage(ICON.prc, stx, 219); stx += 13; }
  if (b.flightTurn) { ctx.drawImage(ICON.fly, stx, 219); stx += 13; }
  if (b.echo > 0) ctx.drawImage(ICON.up, stx, 219);
  const inc = incomingDamage(b);
  if (inc > 0 && b.phase === 'player') { const net = incomingNet(b); txtS(T('incoming', { n: net }), 118, 152, net > 0 ? COL.red : COL.teal, 'center'); }

  // the enemies, each with its next move over its head
  b.enemies.forEach((e: Enemy, i: number) => {
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
    if (e.burn + e.rot > 0) { ctx.drawImage(ICON.burn, ex, 219); txt(String(e.burn + e.rot), ex + 10, 218, e.rot ? COL.purple : '#f08a2c'); }
    const il = intentLabel(e), tw = il.text ? textW(il.text) + 2 : 0, iy = Math.max(20, p.y - p.h - 20);
    const ix = Math.round(p.x - (10 + tw) / 2);
    ctx.drawImage(ICON[il.icon], ix, iy + 1);
    if (il.text) txtS(il.text, ix + 11, iy, il.col);
    if (e.charged) ctx.drawImage(ICON.charge, ix - 12, iy + 1);
    if (e.grasp) ctx.drawImage(ICON.web, ix + 12 + tw, iy + 1);
    if (enemyFlies(b, e)) ctx.drawImage(ICON.fly, ix - (e.charged ? 24 : 12), iy + 1);
    const want = heldFor === 'enemy';
    if (i === b.target || (ui.hoverEnemy === i && want)) { // the target: where the strikes go, and a card that aims
      const r = enemyBox(p);
      corners({ x: r.x, y: r.y + 18, w: r.w, h: r.h - 42 }, ui.hoverEnemy === i && want ? COL.white : COL.amber);
    }
  });

  // the top bar
  ctx.fillStyle = 'rgba(20,16,28,0.8)'; ctx.fillRect(0, 0, W, 19);
  const st = stopById(b.stop);
  txt(nameStr(stopName(st)) + ' · ' + T('day', { d: run.day }) + ' · ' + T('turnN', { n: b.turn }), 8, 3, COL.text);
  const hx = drawStat('heal', run.hp + '/' + run.maxHp, 330, 3, COL.text);
  drawStat('gold', String(run.gold), hx + 8, 3, COL.gold);
  drawHudButtons(true);
  // lasting cards in play; a quest shows its marks
  b.powers.forEach((pw: CardInPlay, i: number) => {
    const r = powerSlot(i), q = CARDS[pw.id].quest;
    ctx.fillStyle = INK; ctx.fillRect(r.x, r.y, 28, 18); ctx.fillStyle = ui.hoverPower === i ? COL.amberL : q ? COL.goldD : COL.purple; ctx.fillRect(r.x + 1, r.y + 1, 26, 16);
    ctx.drawImage(cardArt(pw.id), 20, 11, 24, 14, r.x + 2, r.y + 2, 24, 14);
    if (q) txtS(pw.done ? 'OK' : (pw.n || 0) + '/' + val(q.need), r.x + 27, r.y + 6, pw.done ? COL.green : COL.white, 'right');
  });
  // the mana to spend this turn
  box(R_MANA.x, R_MANA.y, R_MANA.w, R_MANA.h, COL.panel, COL.goldD);
  b.mana.slice(0, 10).forEach((m: string, i: number) => drawGem(12 + (i % 5) * 10, 246 + Math.floor(i / 5) * 10, m, 9));
  if (b.mana.length > 10) txt('+' + (b.mana.length - 10), 64, 255, COL.gold, 'right');
  // the lands: how many are in play, how many more may be played this turn, and the pile to play one from
  const why = landReason(b), left = Math.max(0, landLimit(b) - b.landPlayed), stacks = landStacks(b);
  box(R_LANDS.x, R_LANDS.y, R_LANDS.w, R_LANDS.h, COL.panel, b.landLock ? COL.purple : '#2f6a3a');
  ctx.drawImage(ICON.land, 12, 274); txt(String(b.lands.length), 24, 273, COL.green);
  txt(b.landLock ? 'x' : '+' + left, 62, 273, b.landLock ? COL.purple : left > 0 && stacks.length ? COL.amberL : COL.dim, 'right');
  stacks.slice(0, 9).forEach((st2, i) => {
    const r = landSlot(i);
    if (act && !why && (i === b.landSel || ui.hoverLand === i)) { ctx.fillStyle = ui.hoverLand === i ? COL.white : COL.amberL; ctx.fillRect(r.x - 1, r.y - 1, 13, 13); }
    ctx.globalAlpha = why ? 0.5 : 1;
    drawGem(r.x, r.y, CARDS[st2.id].color, 11);
    ctx.globalAlpha = 1;
    if (st2.n > 1) txt(String(st2.n), r.x + 12, r.y - 1, COL.dim);
    else if (!CARDS[st2.id].basic) { ctx.fillStyle = COL.gold; ctx.fillRect(r.x + 12, r.y + 4, 3, 3); } // a land with something of its own
  });
  if (stacks.length > 9) txt('…', 62, 316, COL.dim, 'right');
  // the piles
  ctx.drawImage(ICON.draw, 12, 335); txt(String(b.draw.length), 24, 334, COL.text);
  ctx.globalAlpha = 0.6; ctx.drawImage(ICON.draw, 12, 347); ctx.globalAlpha = 1; txt(String(b.discard.length), 24, 346, COL.dim);
  const stuck = act && !!why && !b.hand.some((c: CardInPlay) => !playReason(b, c.id, aimOf(b, c.id))); // nothing left to play
  drawButton(R_END, T('endTurn'), stuck && Math.floor(b.t * 2) % 2 === 0, !act);
  txt(T(b.phase === 'enemy' ? 'enemyTurn' : 'yourTurn'), 595, 254, b.phase === 'enemy' ? COL.red : COL.teal, 'center');

  // the hand
  const slots = handSlots();
  const drawOne = (i: number, x: number, y: number) => {
    const id = b.hand[i].id, d = CARDS[id];
    const kicked = kickOf(b, i, lifted === i && ui.drag.kick), target = modeTarget(d, kicked);
    const over2 = lifted === i ? (target === 'enemy' ? ui.hoverEnemy : target === 'mate' ? ui.hoverMate : -1) : -1;
    const ti = over2 >= 0 ? over2 : aimOf(b, id, kicked);
    const kick = !d.kick ? '' : kicked ? 'armed' : act && !playReason(b, id, aimOf(b, id, true), true) ? 'can' : 'no';
    drawCard(id, x, y, { cost: costOf(b, id, ti), dim: !act || !!playReason(b, id, ti, kicked), hot: ui.sel === i, kick });
    if (i < 10) txt(String((i + 1) % 10), x + 70, y + 92, COL.dim);
  };
  slots.forEach((s, i) => { if (i !== ui.hoverCard && i !== lifted) drawOne(i, s.x, s.y); });
  if (ui.hoverCard >= 0 && ui.hoverCard !== lifted && slots[ui.hoverCard]) drawOne(ui.hoverCard, slots[ui.hoverCard].x, 246);
  if (lifted >= 0 && b.hand[lifted]) drawOne(lifted, mouse.x - 40, mouse.y - 60);

  if (b.fly) { // the card just played, on its way to where it goes
    const k = Math.min(1, b.fly.t / 0.14), pe = b.fly.ti >= 0 ? L.enemies[b.fly.ti] : null;
    const mi = b.party.findIndex((m: Member) => m.uid === b.fly.uid), pm = mi > 0 ? L.party[mi] : null;
    const to = pe ? { x: pe.x, y: pe.y - pe.h / 2 } : pm ? { x: pm.x, y: pm.y - 30 } : { x: L.player.x, y: L.player.y - 30 };
    const from = b.fly.land ? { x: 37, y: 300 } : { x: 320, y: 262 };
    const fx = Math.round(from.x + (to.x - from.x) * k), fy = Math.round(from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 24);
    ctx.fillStyle = INK; ctx.fillRect(fx - 8, fy - 10, 16, 20);
    ctx.fillStyle = cardEdge(CARDS[b.fly.id]); ctx.fillRect(fx - 7, fy - 9, 14, 18);
    ctx.fillStyle = COL.paper; ctx.fillRect(fx - 5, fy - 6, 10, 7);
  }
  // numbers that rise as each effect lands
  for (const f of b.floats) {
    ctx.globalAlpha = f.t > tune.float_time * 0.7 ? 0.5 : 1;
    txtS(f.text, f.x, f.y - f.t * 24, f.col, 'center');
  }
  ctx.globalAlpha = 1;
  if (ui.kick && act) txtS(T('kickerArmed'), 320, 232, COL.amberL, 'center');
  if (b.msgT > 0 && b.msg) { const w = textW(b.msg) + 20; box(Math.round(320 - w / 2), 196, w, 20, COL.panel, COL.red); txt(b.msg, 320, 200, COL.text, 'center'); }
  if (lifted < 0 && !ui.deck) { // what the pointer rests on, explained
    const at = infoPlace();
    if (ui.hoverCard >= 0 && b.hand[ui.hoverCard]) drawCardInfo(b.hand[ui.hoverCard].id, at.x, 22, at.w, { room: 178 });
    else if (ui.hoverEnemy >= 0) drawEnemyInfo(ui.hoverEnemy);
    else if (ui.hoverPower >= 0 && b.powers[ui.hoverPower]) {
      const pw = b.powers[ui.hoverPower], q = CARDS[pw.id].quest;
      drawCardInfo(pw.id, at.x, 46, at.w, { extra: q ? (pw.done ? T('marksDone') : T('marks', { n: pw.n || 0, m: val(q.need) })) : '' });
    } else if (ui.hoverMate === 0) drawLeaderInfo(at.x, at.w);
    else if (ui.hoverMate > 0 && b.party[ui.hoverMate]) {
      const m = b.party[ui.hoverMate];
      drawCardInfo(m.id, at.x, 22, at.w, { extra: stanceLine(b, m) + (m.gear.length ? ' · ' + wornLine(m) : ''), room: 136, known: true });
    } else if (ui.hoverLand >= 0 && stacks[ui.hoverLand]) drawCardInfo(stacks[ui.hoverLand].id, 70, 222, 280, { extra: why ? T(why) : '', known: true });
    else if (over(R_MANA)) { const ws = wrap(T('manaHelp'), 224); box(70, 240, 240, ws.length * 13 + 10, COL.panel, COL.goldD); ws.forEach((ln, k) => txt(ln, 78, 245 + k * 13, COL.text)); }
    else if (over({ x: 8, y: 270, w: 58, h: 16 })) { const ws = [T('landsIn', { n: b.lands.length })].concat(wrap(T('kwh_land'), 224)); box(70, 268, 240, ws.length * 13 + 10, COL.panel, '#2f6a3a'); ws.forEach((ln, k) => txt(ln, 78, 273 + k * 13, k ? COL.text : COL.green)); b.lands.forEach((l: CardInPlay, k: number) => drawGem(300 - b.lands.length * 10 + k * 10, 275, landColor(l), 9)); }
    else if (over({ x: 8, y: 332, w: 58, h: 12 })) txtS(T('drawPile'), 70, 334, COL.text);
    else if (over({ x: 8, y: 344, w: 58, h: 14 })) txtS(T('discardPile'), 70, 346, COL.text);
  }
  if (ui.deck) drawDeckView();
}

// ---- after a fight: gold, and one of this land's cards, or none ----
const R_SKIP = { x: 270, y: 330, w: 100, h: 20 };
function rewardSlot(i: number, n: number) { return { x: Math.round(320 + (i - (n - 1) / 2) * 150 - 40), y: 64, w: 80, h: 108 }; }
function takeReward(i: number) {
  const rw = state.reward;
  if (i >= 0 && rw.cards[i]) { addCard(rw.cards[i]); sfx('power'); events.push({ t: state.t, reward: rw.cards[i] }); } else sfx('card');
  state.reward = null; afterStop();
}
function updateReward(dt: number) {
  const rw = state.reward; rw.t += dt;
  if (updateHudButtons(false)) return;
  ui.hoverCard = -1;
  rw.cards.forEach((id: string, i: number) => { if (over(rewardSlot(i, rw.cards.length))) ui.hoverCard = i; });
  if (rw.t < 0.3) return;
  for (let i = 0; i < rw.cards.length; i++) if (pressed('Digit' + (i + 1))) { takeReward(i); return; }
  if (pressed('KeyS') || pressed('Digit0') || pressed('Escape') || clicked(R_SKIP)) { takeReward(-1); return; }
  if (mouse.released && ui.hoverCard >= 0) takeReward(ui.hoverCard);
}
function dimBackdrop(cont: string) {
  ctx.drawImage(BG[cont] || BG.tazeem, 0, 0);
  ctx.fillStyle = 'rgba(20,16,28,0.78)'; ctx.fillRect(0, 0, W, H);
}
function drawReward() {
  const rw = state.reward, run = state.run;
  dimBackdrop(rw.bg || rw.cont);
  txt(T('rewardTitle') + ' — ' + contName(rw.cont), 320, 16, COL.amberL, 'center');
  txt(T('goldGain', { n: rw.gold }) + (rw.heal ? ' · ' + T('healGain', { n: rw.heal }) : ''), 320, 34, COL.gold, 'center');
  rw.cards.forEach((id: string, i: number) => {
    const r = rewardSlot(i, rw.cards.length);
    drawCard(id, r.x, r.y - (ui.hoverCard === i ? 4 : 0), { hot: ui.hoverCard === i });
    if (offColour(id)) offMark(r.x, r.y - (ui.hoverCard === i ? 4 : 0));
    txt(String(i + 1), r.x + 40, r.y + 112, COL.amberL, 'center');
    const lines = wrap(cardText(id), 146).slice(0, 6);
    lines.forEach((ln, k) => txt(ln, r.x + 40, r.y + 126 + k * 13, COL.text, 'center'));
  });
  txt(T('rewardHint'), 320, 312, COL.dim, 'center');
  drawButton(R_SKIP, T('skip'));
  drawStat('heal', run.hp + '/' + run.maxHp, 8, 3, COL.text);
  drawStat('gold', String(run.gold), 80, 3, COL.gold);
  drawLandRow2(150, 5);
  drawHudButtons(false);
  if (ui.hoverCard >= 0 && rw.cards[ui.hoverCard]) { const r = rewardSlot(ui.hoverCard, rw.cards.length); drawCardInfo(rw.cards[ui.hoverCard], r.x + 40 < 320 ? r.x + 88 : r.x - 258, 40, 250, { off: offColour(rw.cards[ui.hoverCard]) }); }
}
// A mark on a card offered whose colour no land of the expedition makes yet.
function offMark(x: number, y: number) { ctx.fillStyle = INK; ctx.fillRect(x + 66, y + 2, 12, 14); ctx.fillStyle = COL.red; ctx.fillRect(x + 67, y + 3, 10, 12); txt('!', x + 72, y + 3, COL.white, 'center'); }

// ---- a town's market: cards, a basic land of any colour, and a card taken out of the deck ----
const R_SREM = { x: 130, y: 330, w: 190, h: 20 }, R_SLEAVE = { x: 340, y: 330, w: 150, h: 20 };
function shopSlot(i: number) { return { x: 30 + i * 120, y: 50, w: 80, h: 108 }; }
function basicSlot(i: number) { return { x: 330 + i * 34, y: 288, w: 28, h: 18 }; }
export function openShop(s: Stop) {
  const pl = PLACE_LAND[s.id], first = pl && !state.run.lands.some((c: CardInPlay) => c.id === pl) ? [pl] : []; // the place's own land, while you lack it
  const local = pickCards((POOLS[s.cont] || []).filter(id => id !== pl), tune.shop_local - first.length, rarityWeights(), colourLean);
  let rest: string[] = [];
  for (const c in POOLS) if (c !== s.cont) rest = rest.concat(POOLS[c]);
  const far = pickCards(rest, tune.shop_cards - first.length - local.length, rarityWeights(), colourLean);
  state.shop = { stop: s.id, cont: s.cont, removed: false, items: first.concat(local, far).map(id => ({ id, price: cardPrice(id), sold: false })) };
  state.screen = 'shop';
}
function buyItem(i: number) {
  const sh = state.shop, it = sh.items[i], run = state.run;
  if (!it || it.sold) return;
  if (run.gold < it.price) { state.banner = { text: T('no_gold'), t: 1.2 }; sfx('deny'); return; }
  run.gold -= it.price; it.sold = true; addCard(it.id); sfx('power'); events.push({ t: state.t, buy: it.id });
}
// A basic land of the colour asked for: the market's way to a colour the road has not given yet.
function buyBasic(i: number) {
  const run = state.run, id = BASIC_OF[COLOR_ORDER[i]];
  if (run.gold < tune.price_basic) { state.banner = { text: T('no_gold'), t: 1.2 }; sfx('deny'); return; }
  run.gold -= tune.price_basic; addCard(id); sfx('power'); events.push({ t: state.t, buy: id });
}
function updateShop(dt: number) {
  const sh = state.shop, run = state.run;
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  ui.hoverCard = -1; ui.hoverBasic = -1;
  sh.items.forEach((it: Loose, i: number) => { if (over(shopSlot(i))) ui.hoverCard = i; });
  for (let i = 0; i < 5; i++) if (over(basicSlot(i))) ui.hoverBasic = i;
  for (let i = 0; i < sh.items.length; i++) if (pressed('Digit' + (i + 1))) { buyItem(i); return; }
  for (let i = 0; i < 5; i++) if (pressed('Digit' + ((i + 6) % 10))) { buyBasic(i); return; }
  if (mouse.released && ui.hoverCard >= 0) { buyItem(ui.hoverCard); return; }
  if (mouse.released && ui.hoverBasic >= 0) { buyBasic(ui.hoverBasic); return; }
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
  drawLandRow2(150, 5);
  sh.items.forEach((it: Loose, i: number) => {
    const r = shopSlot(i);
    drawCard(it.id, r.x, r.y, { dim: it.sold || run.gold < it.price, hot: ui.hoverCard === i && !it.sold });
    if (!it.sold && offColour(it.id)) offMark(r.x, r.y);
    if (it.sold) txt(T('sold'), r.x + 40, r.y + 112, COL.dim, 'center');
    else { ctx.drawImage(ICON.gold, r.x + 16, r.y + 113); txt((i + 1) + ': ' + it.price, r.x + 30, r.y + 112, run.gold >= it.price ? COL.gold : COL.red); }
    const lines = wrap(cardText(it.id), 114).slice(0, 6);
    lines.forEach((ln, k) => txt(ln, r.x + 40, r.y + 128 + k * 13, it.sold ? COL.dim : COL.text, 'center'));
  });
  if (ui.hoverCard >= 0 && sh.items[ui.hoverCard]) {
    const id = sh.items[ui.hoverCard].id, off = !sh.items[ui.hoverCard].sold && offColour(id);
    txt(nameStr(cardName(id)) + ' · ' + T(CARDS[id].trap ? 'kw_trap' : 'kd_' + CARDS[id].kind) + ' · ' + cardOrigin(id), 320, 258, COL.amberL, 'center');
    if (off) txt(T('offColor'), 320, 272, COL.red, 'center'); else para(LX(CARDS[id].lore), 60, 272, 520, COL.dim, 1);
  }
  // a basic land of any colour
  txt(T('shopBasics', { p: tune.price_basic }), 322, 291, run.gold >= tune.price_basic ? COL.text : COL.dim, 'right');
  for (let i = 0; i < 5; i++) {
    const r = basicSlot(i), id = BASIC_OF[COLOR_ORDER[i]];
    box(r.x, r.y, r.w, r.h, ui.hoverBasic === i ? COL.panelLL : COL.panelL, COL.amberD);
    drawGem(r.x + 4, r.y + 4, CARDS[id].color, 10);
    txt(String((i + 6) % 10), r.x + 17, r.y + 3, COL.dim);
  }
  if (ui.hoverBasic >= 0) txt(nameStr(cardName(BASIC_OF[COLOR_ORDER[ui.hoverBasic]])) + ' — ' + cardText(BASIC_OF[COLOR_ORDER[ui.hoverBasic]]), 320, 272, COL.green, 'center');
  txt(T('shopHint'), 320, 312, COL.dim, 'center');
  drawButton(R_SREM, sh.removed ? T('sold') : T('shopRemove', { p: tune.price_remove }), false, sh.removed || run.gold < tune.price_remove);
  drawButton(R_SLEAVE, T('leave'));
  drawHudButtons(true);
  if (ui.deck) drawDeckView();
}
// The lands the expedition owns, beside its gold, where a card is offered: what colours it can pay.
function drawLandRow2(x: number, y: number) {
  const lands = state.run.lands.map((c: CardInPlay) => CARDS[c.id].color).sort((a: string, b: string) => COLOR_ORDER.indexOf(a[0]) - COLOR_ORDER.indexOf(b[0]) || a.length - b.length);
  lands.slice(0, 16).forEach((c: string, i: number) => drawGem(x + i * 10, y, c, 9));
}

// ---- a camp: rest, or take a card out of the deck ----
const R_REST = { x: 170, y: 150, w: 300, h: 26 }, R_TRIM = { x: 170, y: 186, w: 300, h: 26 };
export function openCamp(s: Stop) { state.camp = { stop: s.id, cont: s.cont }; state.screen = 'camp'; }
function campHeal() { const run = state.run; return rules.campHeal(run.hp, run.maxHp, tune.camp_heal); }
function updateCamp(dt: number) {
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

// ---- on the road: something happens, and there are two ways through it ----
const R_WAY = [{ x: 110, y: 190, w: 420, h: 38 }, { x: 110, y: 234, w: 420, h: 38 }], R_EVGO = { x: 250, y: 316, w: 140, h: 22 };
function happening() { return HAPPENINGS.find(h => h.id === state.event.id)!; }
// A way that pays gold is closed to one who has not got it.
function wayOpen(w: Way) { return !w.fx.some((f: Loose) => f[0] === 'pay' && state.run.gold < val(f[1])); }
// What a way costs and gives, in a line: "Gold −15 · HP +6".
const STAKE: Record<string, string[]> = {
  heal: ['체력 +{n}', 'HP +{n}'], hurt: ['체력 −{n}', 'HP −{n}'], gain: ['금화 +{n}', 'Gold +{n}'], pay: ['금화 −{n}', 'Gold −{n}'], lose: ['금화 −{n}', 'Gold −{n}'],
  delay: ['{n}일을 잃는다', 'Lose {n} day'], haste: ['{n}일을 번다', 'Win back {n} day'], vigor: ['최대 체력 +{n}', 'Max HP +{n}'],
};
const NOTHING = ['아무 일 없음', 'Nothing'];
function stakes(fx: Loose[], cont: string): string {
  const L = LANG === 'ko' ? 0 : 1;
  if (!fx.length) return NOTHING[L];
  return fx.map((f: Loose) => {
    if (f[0] === 'chance') { const p = Math.round(val(f[1]) * 100); return `${p}%: ${stakes(f[2], cont)} · ${L ? 'otherwise' : '아니면'}: ${stakes(f[3], cont)}`; }
    if (f[0] === 'card') return f[1] === 'pool' ? (L ? 'A card of ' + contName(cont) : contName(cont) + '의 카드 1장') : nameStr(cardName(f[1]));
    if (f[0] === 'land') return nameStr(cardName(f[1] === 'basic' ? LAND_OF[cont] : f[1]));
    return STAKE[f[0]][L].split('{n}').join(String(val(f[1])));
  }).join(' · ');
}
// A way taken: each effect happens, and what it did is kept as it was (how much, which card),
// not as words: the screen says it in the language of the moment. A happening never kills: hp
// stops at 1. A day lost never goes past the journey's end.
function takeWay(fx: Loose[], cont: string, got: Loose[]) {
  const run = state.run;
  for (const f of fx) {
    const n = typeof f[1] === 'string' || typeof f[1] === 'number' ? val(f[1]) : 0;
    switch (f[0]) {
      case 'heal': { const h = Math.min(n, run.maxHp - run.hp); run.hp += h; got.push(['heal', h]); break; }
      case 'hurt': { const h = Math.min(n, run.hp - 1); run.hp -= h; got.push(['hurt', h]); break; }
      case 'gain': run.gold += n; got.push(['gain', n]); break;
      case 'pay': case 'lose': { const g = Math.min(n, run.gold); run.gold -= g; got.push(['pay', g]); break; }
      case 'delay': { const d = Math.max(0, Math.min(n, tune.journey_days - run.day)); run.day += d; got.push(['delay', d]); break; }
      case 'haste': { const d = Math.min(n, run.day); run.day -= d; got.push(['haste', d]); break; }
      case 'vigor': run.maxHp += n; run.hp += n; got.push(['vigor', n]); break;
      case 'card': { const id = f[1] === 'pool' ? pickCards((POOLS[cont] || []).filter(c => CARDS[c].kind !== 'land'), 1, rarityWeights(), colourLean)[0] : f[1]; if (id) { addCard(id); got.push(['card', id]); } break; }
      case 'land': { const id = f[1] === 'basic' ? LAND_OF[cont] : f[1]; addCard(id); got.push(['card', id]); break; }
      case 'chance': { const side = rng() < val(f[1]) ? f[2] : f[3]; if (side.length) takeWay(side, cont, got); else got.push(['nothing']); break; }
    }
  }
}
// What a way did, in a line: "Gold −15 · HP +6 · Welkin Tern".
function gotLine(got: Loose[]): string {
  const L = LANG === 'ko' ? 0 : 1;
  return got.map((g: Loose) => g[0] === 'nothing' ? NOTHING[L] : g[0] === 'card' ? nameStr(cardName(g[1])) : STAKE[g[0]][L].split('{n}').join(String(g[1]))).join(' · ');
}
function updateEvent(dt: number) {
  const ev = state.event; ev.t += dt;
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  if (ev.pick < 0) {
    if (ev.t < 0.3) return; // a click that began the trip is not a choice
    const ways = happening().ways;
    for (let i = 0; i < 2; i++) if (pressed('Digit' + (i + 1)) || clicked(R_WAY[i])) {
      if (!wayOpen(ways[i])) { state.banner = { text: T('no_gold'), t: 1.2 }; sfx('deny'); return; }
      ev.pick = i; takeWay(ways[i].fx, ev.cont, ev.got); sfx('power');
      if (!ev.got.length) ev.got.push(['nothing']);
      events.push({ t: state.t, way: i, of: ev.id });
      return;
    }
  } else if (pressed('Enter') || pressed('Space') || clicked(R_EVGO)) { // a site was the stop itself; a happening on the way comes before the stop
    const s = stopById(ev.stop), site = ev.site; state.event = null; sfx('card');
    if (site) afterStop(); else enterStop(s);
  }
}
function drawEvent() {
  const ev = state.event, h = happening(), run = state.run, st = stopById(ev.stop);
  dimBackdrop(ev.cont);
  drawStat('heal', run.hp + '/' + run.maxHp, 8, 3, COL.text);
  drawStat('gold', String(run.gold), 80, 3, COL.gold);
  drawLandRow2(150, 5);
  const left = Math.max(0, tune.journey_days - run.day);
  txt(T('daysLeft', { n: left }), 532, 3, left <= 2 ? COL.red : COL.text, 'right'); // ends before the deck button, in either language
  txt(ev.site ? nameStr(stopName(st)) + ' · ' + contName(ev.cont) : T('onTheWay', { p: nameStr(stopName(st)), c: contName(ev.cont) }), 320, 34, COL.dim, 'center');
  txt(LX(h.title), 320, 52, COL.amberL, 'center', 24);
  const end = para(LX(h.text), 110, 92, 420, COL.text, 6);
  if (ev.pick < 0) {
    h.ways.forEach((w, i) => {
      const r = R_WAY[i], open = wayOpen(w);
      box(r.x, r.y, r.w, r.h, !open ? COL.panel : over(r) ? COL.panelLL : COL.panelL, open ? COL.amberD : COL.panelL);
      txt((i + 1) + '  ' + LX(w.label), r.x + 10, r.y + 5, open ? COL.text : COL.dim);
      txt(stakes(w.fx, ev.cont), r.x + 26, r.y + 20, open ? COL.gold : COL.dim);
    });
    txt(T('eventHint'), 320, 284, COL.dim, 'center');
  } else {
    const w = h.ways[ev.pick];
    const y = para(LX(w.after), 110, Math.max(end + 14, 190), 420, COL.amberL, 4);
    txt(gotLine(ev.got), 110, y + 8, COL.gold);
    drawButton(R_EVGO, T('eventGo'), Math.floor(state.t * 2) % 2 === 0);
  }
  drawHudButtons(true);
  if (ui.deck) drawDeckView();
}

// ---- the whole of play, one step and one frame ----
export function updatePlay(dt: number) {
  state.t += dt; ui.t += dt;
  if (state.banner && state.banner.t > 0) state.banner.t -= dt;
  switch (state.screen) {
    case 'map': updateMap(dt); break;
    case 'sea': updateSea(dt); break;
    case 'travel': updateTravel(dt); break;
    case 'battle': updateBattleInput(); if (state.battle) updateBattle(dt); break;
    case 'reward': updateReward(dt); break;
    case 'shop': updateShop(dt); break;
    case 'camp': updateCamp(dt); break;
    case 'event': updateEvent(dt); break;
  }
}
export function drawPlay() {
  switch (state.screen) {
    case 'map': drawMap(); break;
    case 'sea': drawSea(); break;
    case 'travel': drawTravel(); break;
    case 'battle': if (state.battle) drawBattle(); break;
    case 'reward': drawReward(); break;
    case 'shop': drawShop(); break;
    case 'camp': drawCamp(); break;
    case 'event': drawEvent(); break;
  }
  drawBanner();
}

// The run is over: what it gained, for the ending screen.
export function finishRun(won: boolean) {
  const run = state.run;
  const places = run.route.length - 1;
  state.gained = T('summary', { n: places, c: run.conts.length, k: run.deck.length, l: run.lands.length });
  state.score = rules.runScore(places, run.fights, won);
  state.won = won;
  ui.deck = null; ui.drag = null; ui.sel = -1; ui.kick = false; ui.hoverMate = -1; ui.hoverLand = -1; state.pending = null;
  setScene(won ? 'results' : 'over');
  events.push({ t: state.t, end: won ? 'won' : 'lost' });
}
export function drawEnding(won: boolean) {
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
  const names = run.route.map((id: string) => nameStr(stopName(stopById(id)))).join(' → ');
  y = para(names, 496, y, 136, COL.dim, 12) + 8;
  para(won ? T('again') : T('restart'), 496, Math.max(y, 300), 136, COL.amberL, 0);
  drawHudButtons(false);
}
