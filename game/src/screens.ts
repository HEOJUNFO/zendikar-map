import './battle'; // load order, as in the one-shot's page: this module runs after battle
import { tune } from './config';
import { WORLD } from './game/data';
import { rng } from './game/rng';
import { events, state } from './game/state';
import { FONT, H, W, ctx } from './screen';
import { mouse, pressed } from './input';
import { muted, setMuted, sfx } from './audio';
import { LANG, LX, STOP_TEXT, T, contName, setLang, stopName } from './text';
import { CARDS, COLOR_ORDER, LAND_OF, STARTER, STARTER_LANDS, cardArt, cardEnglish, cardFace, cardKw, cardName, cardOrigin, cardText, family, isLand } from './cards';
import { PLACE_LAND } from './cards2';
import { BOSS, enemyName } from './enemies';
import { ROSTER } from './enemies2';
import { COL, ICON, INK, WORLD_IMG } from './art';
import { castable, shuffle, startBattle } from './battle';
import { openCamp, openShop } from './screens2';
import type { Stop } from './game/data';
import type { CardDef, CardInPlay, Loose, Name, Rect } from './game/types';
import * as rules from './game/rules';
// Shared drawing helpers, the run, and the world map: choosing where to go, the trip, arriving.

// What the pointer and the keyboard focus are on. Not part of the game's state: it never
// changes what happens, only what is shown and which card a click means.
export const ui: { hoverStop: string | null; hoverCard: number; hoverEnemy: number; hoverPower: number; hoverMate: number; hoverLand: number; hoverBasic: number; drag: Loose; sel: number; inspect: Loose; deck: Loose; t: number } = { hoverStop: null, hoverCard: -1, hoverEnemy: -1, hoverPower: -1, hoverMate: -1, hoverLand: -1, hoverBasic: -1, drag: null, sel: -1, inspect: null, deck: null, t: 0 };

// ---- text ----
export function txt(s: string | number, x: number, y: number, col: string | null, align?: CanvasTextAlign, size?: number) {
  ctx.font = (size || 12) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = col || COL.text; ctx.fillText(s as string, Math.round(x), Math.round(y));
}
export function txtS(s: string | number, x: number, y: number, col: string | null, align?: CanvasTextAlign, size?: number) { txt(s, x + 1, y + 1, INK, align, size); txt(s, x, y, col, align, size); }
export function textW(s: string | number, size?: number) { ctx.font = (size || 12) + 'px ' + FONT; return ctx.measureText(s as string).width; }
export function wrap(s: string | number, maxW: number, size?: number) {
  const out = []; let line = '';
  for (const word of String(s).split(' ')) {
    const tryLine = line ? line + ' ' + word : word;
    if (textW(tryLine, size) <= maxW) { line = tryLine; continue; }
    if (line) out.push(line);
    if (textW(word, size) <= maxW) { line = word; continue; }
    let part = ''; // one word wider than the box: break it by letter
    for (const ch of word) { if (textW(part + ch, size) > maxW && part) { out.push(part); part = ch; } else part += ch; }
    line = part;
  }
  if (line) out.push(line);
  return out;
}
export function para(s: string | number, x: number, y: number, maxW: number, col: string | null, maxLines: number) {
  const lines = wrap(s, maxW);
  const n = maxLines ? Math.min(lines.length, maxLines) : lines.length;
  for (let i = 0; i < n; i++) txt(lines[i], x, y + i * 13, col);
  return y + n * 13;
}
// A name with its star when it is this game's own Korean translation.
export function nameStr(n: Name) { return n.star ? n.text + '*' : n.text; }

// ---- boxes and buttons ----
export function box(x: number, y: number, w: number, h: number, fill: string | null, edge: string | null) {
  ctx.fillStyle = INK; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = edge || COL.panelLL; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = fill || COL.panel; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}
function inRect(px: number, py: number, r: Rect) { return px >= r.x && py >= r.y && px < r.x + r.w && py < r.y + r.h; }
export function over(r: Rect) { return inRect(mouse.x, mouse.y, r); }
export function clicked(r: Rect) { return mouse.released && inRect(mouse.x, mouse.y, r) && inRect(mouse.dx, mouse.dy, r); }
export function drawButton(r: Rect, label: string, hot?: boolean, off?: boolean) {
  box(r.x, r.y, r.w, r.h, off ? COL.panel : (over(r) || hot ? COL.panelLL : COL.panelL), off ? COL.panelL : COL.amberD);
  txt(label, r.x + r.w / 2, r.y + Math.floor((r.h - 12) / 2) + 1, off ? COL.dim : COL.text, 'center');
}
export const R_LANG = { x: 594, y: 1, w: 24, h: 17 }, R_MUTE = { x: 620, y: 1, w: 18, h: 17 }, R_DECK = { x: 538, y: 1, w: 54, h: 17 };
export function updateHudButtons(withDeck: boolean) {
  if (clicked(R_LANG) || pressed('KeyL')) { setLang(LANG === 'ko' ? 'en' : 'ko'); sfx('card'); return true; }
  if (clicked(R_MUTE)) { setMuted(!muted); return true; }
  if (withDeck && !ui.deck && (clicked(R_DECK) || pressed('KeyD'))) { ui.deck = { mode: 'view', page: 0 }; sfx('card'); return true; }
  return false;
}
export function drawHudButtons(withDeck: boolean) {
  drawButton(R_LANG, LANG === 'ko' ? 'EN' : 'KO');
  box(R_MUTE.x, R_MUTE.y, R_MUTE.w, R_MUTE.h, over(R_MUTE) ? COL.panelLL : COL.panelL, COL.amberD);
  txt(muted ? 'x' : 'M', R_MUTE.x + 9, R_MUTE.y + 3, muted ? COL.red : COL.text, 'center');
  if (withDeck) drawButton(R_DECK, T('deck') + ' ' + state.run.deck.length);
}
export function drawStat(icon: string, s: string | number, x: number, y: number, col: string | null) { ctx.drawImage(ICON[icon], x, y + 1); txt(s, x + 12, y, col || COL.text); return x + 14 + textW(s); }

// ---- the run ----
export function stopById(id: string) { return WORLD.stops.find(s => s.id === id)!; }
function stopDist(a: Stop, b: Stop) { return Math.hypot(a.ux - b.ux, a.uy - b.uy); }
function tripDays(a: Stop, b: Stop) {
  return rules.tripDays(stopDist(a, b), tune.near_dist, tune.far_dist, state.run.rough.indexOf(b.id) >= 0);
}
export function newRun() {
  const deck = STARTER.map((id, i) => ({ id, uid: i + 1 }));
  const lands = STARTER_LANDS.map((id, i) => ({ id, uid: deck.length + i + 1 }));
  const others = shuffle(WORLD.stops.map(s => s.id).filter(id => id !== 'sea-gate'));
  const rough = others.slice(0, tune.rough_stops);
  return {
    hp: tune.player_hp, maxHp: tune.player_hp, gold: tune.start_gold, day: 0, at: 'sea-gate',
    visited: [], route: ['sea-gate'], deck, lands, uid: deck.length + lands.length + 1, conts: ['tazeem'], fights: 0,
    rough, enc: rollEncounters(), won: false,
  };
}
// Who is where this run (ROSTER, enemies2.ts). A wild place that has great beasts may hold one;
// the way into a guarded town or camp may be watched.
function rollEncounters() {
  const enc: Record<string, Loose> = {};
  for (const id in ROSTER) {
    const r = ROSTER[id];
    if (r.guard && rng() >= tune.guard_chance) continue;
    const beast = r.elite && r.elite.length && (!r.wild || rng() < tune.elite_chance);
    enc[id] = beast ? { kinds: [r.elite![Math.floor(rng() * r.elite!.length)]], elite: true }
      : { kinds: r.wild![Math.floor(rng() * r.wild!.length)].slice(), elite: false };
  }
  return enc;
}
// What waits at a stop: {kinds, elite, guard, bg}, or null. A run's first fight, when it is at a
// wild place, is with that place's own creature: the first minute is the same lesson every time.
function encounterOf(s: Stop) {
  const r = ROSTER[s.id], e = state.run.enc[s.id];
  if (!r || !e) return null;
  if (state.run.fights === 0 && !r.guard && !e.elite && r.wild) return { kinds: r.wild[0], elite: false, guard: false };
  return { kinds: e.kinds, elite: e.elite, guard: !!r.guard, bg: r.bg };
}
// A stop's kind this run: a wild place shows as a great beast's when one is there.
function stopCls(s: Stop) {
  if (s.cls !== 'wild' && s.cls !== 'elite') return s.cls;
  const e = encounterOf(s);
  return e && e.elite ? 'elite' : 'wild';
}
// "Mindless Null x3, Vampire Hexmage"
function groupNames(kinds: string[]) {
  const seen: string[] = [], n: number[] = [];
  for (const k of kinds) { const i = seen.indexOf(k); if (i < 0) { seen.push(k); n.push(1); } else n[i]++; }
  return seen.map((k, i) => nameStr(enemyName(k)) + (n[i] > 1 ? ' ×' + n[i] : '')).join(', ');
}
// A card gained on the way: a land joins the land pile, anything else the deck.
export function addCard(id: string) { const run = state.run; (isLand(id) ? run.lands : run.deck).push({ id, uid: run.uid++ }); }
function daysLeft() { return rules.daysLeft(tune.journey_days, state.run.day); }
// Every stop you could still go to, nearest first; ok: there are days enough for the trip.
interface MapOption { s: Stop; days: number; far: number; ok?: boolean }
function mapOptions() {
  const run = state.run, here = stopById(run.at), left = daysLeft();
  return WORLD.stops.filter(s => s.id !== run.at && run.visited.indexOf(s.id) < 0)
    .map((s): MapOption => ({ s, days: tripDays(here, s), far: stopDist(here, s) }))
    .map(o => { o.ok = o.days <= left; return o; })
    .sort((a, b) => a.days - b.days || a.far - b.far);
}

export const MAP_X = 6, MAP_Y = 18;
const R_ROIL = { x: 496, y: 318, w: 140, h: 18 };

function startTravel(o: MapOption) {
  state.travel = { from: state.run.at, to: o.s.id, t: 0, days: o.days };
  state.screen = 'travel'; sfx('travel');
  events.push({ t: state.t, travel: o.s.id });
}
export function updateMap(dt: number) {
  const opts = mapOptions(), go = opts.filter(o => o.ok);
  ui.hoverStop = null;
  for (const s of WORLD.stops) if (Math.hypot(mouse.x - (MAP_X + s.x), mouse.y - (MAP_Y + s.y)) < 9) ui.hoverStop = s.id;
  if (ui.deck) { updateDeckView(); return; }
  if (updateHudButtons(true)) return;
  if (!go.length) { if (clicked(R_ROIL) || pressed('Enter')) startBoss(); return; }
  for (let i = 0; i < go.length && i < 9; i++) if (pressed('Digit' + (i + 1))) { startTravel(go[i]); return; }
  if (mouse.released && ui.hoverStop) {
    const o = opts.find(x => x.s.id === ui.hoverStop);
    if (o && o.ok) startTravel(o); else if (o) sfx('deny');
  }
}
export function updateTravel(dt: number) {
  const tr = state.travel; tr.t += dt;
  if (tr.t >= tune.travel_time) arrive();
}
function arrive() {
  const run = state.run, tr = state.travel, s = stopById(tr.to);
  const enc = encounterOf(s);
  run.day += tr.days; run.at = s.id; run.visited.push(s.id); run.route.push(s.id);
  state.travel = null;
  if (run.conts.indexOf(s.cont) < 0) { // landfall: the first step on a new continent gives its land
    run.conts.push(s.cont);
    const land = LAND_OF[s.cont]; addCard(land);
    state.banner = { text: T('arrive', { cont: contName(s.cont) }) + ' — ' + T('landfall', { land: cardName(land).text }), t: 2.6 };
    sfx('rumble');
  }
  // a town or a camp whose way in is watched: the fight first, then what the stop holds
  const inside = s.cls === 'town' ? { kind: 'shop', stop: s.id } : s.cls === 'camp' ? { kind: 'camp', stop: s.id } : null;
  if (enc) { state.pending = inside; startBattle(enc.kinds, { cont: s.cont, stop: s.id, bg: enc.bg, elite: enc.elite, first: run.fights === 0 }); }
  else if (s.cls === 'town') openShop(s);
  else openCamp(s);
}
// A stop is done: back to the map, or the Roil comes when the days are spent.
export function afterStop() {
  if (state.pending) { const p = state.pending, s = stopById(p.stop); state.pending = null; if (p.kind === 'shop') openShop(s); else openCamp(s); return; }
  if (state.run.day >= tune.journey_days) startBoss(); else state.screen = 'map';
}
function startBoss() {
  const s = stopById(state.run.at);
  state.banner = { text: T('roilComes'), t: 2.4 };
  startBattle([BOSS], { cont: s.cont, stop: s.id, boss: true });
}

export function drawTrail(route: string[], col: string) {
  ctx.fillStyle = col;
  for (let i = 1; i < route.length; i++) {
    const a = stopById(route[i - 1]), b = stopById(route[i]);
    dotted(MAP_X + a.x, MAP_Y + a.y, MAP_X + b.x, MAP_Y + b.y, 1);
  }
}
function dotted(x0: number, y0: number, x1: number, y1: number, upTo: number) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(d / 5);
  for (let i = 1; i < n * upTo; i++) { const k = i / n; ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), 2, 2); }
}
export function drawWorld(dimVisited?: boolean) {
  ctx.fillStyle = INK; ctx.fillRect(MAP_X - 2, MAP_Y - 2, WORLD.w + 4, WORLD.h + 4);
  ctx.drawImage(WORLD_IMG, MAP_X, MAP_Y);
  for (const id in WORLD.continents) { // the map project's own label positions
    const c = WORLD.continents[id]; if (!c.label) continue;
    txtS(LX(c).toUpperCase().split('').join(' '), MAP_X + c.label.at[0] * WORLD.scale, MAP_Y + c.label.at[1] * WORLD.scale - 6 + (CONT_LABEL_DY[id] || 0), '#c8bfa8', 'center');
  }
}
// Where each stop's name sits beside its icon: [dx, dy, align].
const STOP_LABEL: Record<string, [number, number, CanvasTextAlign]> = {
  'sea-gate': [9, -6, 'left'], 'oran-rief': [9, -6, 'left'], 'ikiral': [9, -6, 'left'], 'midnight-pass': [9, -6, 'left'],
  'affa': [0, 7, 'center'], 'tal-terig': [-9, -2, 'right'], 'teeth-of-akoum': [0, -19, 'center'],
  'free-city-of-nimana': [0, 7, 'center'], 'hagra-swamp': [-9, -6, 'right'], 'tangled-vales': [0, 7, 'center'],
  'kazandu': [9, -6, 'left'], 'sunder-bay': [-9, -6, 'right'], 'kabira': [9, -6, 'left'], 'turntimber': [9, -6, 'left'], 'makindi-trenches': [9, -6, 'left'],
};
const CONT_LABEL_DY: Record<string, number> = { tazeem: 12, akoum: 16 };
function drawStops(opts: MapOption[] | null) {
  const run = state.run;
  const go = opts ? opts.filter(o => o.ok) : [];
  for (const s of WORLD.stops) {
    const x = MAP_X + s.x, y = MAP_Y + s.y;
    const visited = run.visited.indexOf(s.id) >= 0 && s.id !== run.at;
    const o = opts ? opts.find(q => q.s.id === s.id) : null;
    ctx.globalAlpha = visited ? 0.35 : (o && !o.ok ? 0.55 : 1);
    if (o && o.ok && Math.floor(state.t * 3) % 2 === 0) { ctx.fillStyle = COL.amberL; ctx.fillRect(x - 8, y - 8, 16, 1); ctx.fillRect(x - 8, y + 7, 16, 1); ctx.fillRect(x - 8, y - 8, 1, 16); ctx.fillRect(x + 7, y - 8, 1, 16); }
    ctx.drawImage(ICON[stopCls(s)], x - 5, y - 5);
    if (!visited && s.id !== run.at && (s.cls === 'town' || s.cls === 'camp') && encounterOf(s)) { ctx.fillStyle = INK; ctx.fillRect(x + 3, y - 9, 6, 6); ctx.fillStyle = COL.red; ctx.fillRect(x + 4, y - 8, 4, 4); }
    ctx.globalAlpha = 1;
    const lb: [number, number, CanvasTextAlign] = STOP_LABEL[s.id] || [9, -6, 'left'];
    const roughWay = run.rough.indexOf(s.id) >= 0 && !visited && s.id !== run.at;
    txtS(nameStr(stopName(s)), x + lb[0], y + lb[1], ui.hoverStop === s.id ? COL.amberL : (visited || (o && !o.ok) ? COL.dim : roughWay ? COL.blue : COL.white), lb[2]);
    const gi = go.findIndex(q => q.s.id === s.id);
    if (gi >= 0 && gi < 9) txtS(String(gi + 1), lb[2] === 'right' ? x + 7 : x - 13, lb[2] === 'center' && lb[1] < 0 ? y - 5 : y - 13, COL.amberL);
  }
}
export function drawMarker(x: number, y: number) { ctx.drawImage(ICON.mark, Math.round(x - 1), Math.round(y - 16 + Math.sin(state.t * 4) * 1.5)); }

function drawSidePanel(lines: Loose[]) {
  const run = state.run, x = 496;
  box(490, 20, 148, 338, COL.panel, COL.panelL);
  txt(T('title'), x, 26, COL.amberL);
  txt(T('day', { d: run.day }), x, 41, COL.text);
  txt(T('daysLeft', { n: daysLeft() }), x, 54, daysLeft() <= 2 ? COL.red : COL.text);
  drawStat('heal', run.hp + '/' + run.maxHp, x, 70, COL.text);
  drawStat('gold', String(run.gold), x + 74, 70, COL.gold);
  drawLandRow(x, 86, 136);
  ctx.fillStyle = COL.panelL; ctx.fillRect(x, 99, 136, 1);
  let y = 104;
  for (const ln of lines) {
    if (ln.gap) { y += ln.gap; continue; }
    y = para(ln.s, x, y, 136, ln.col || COL.text, ln.max || 0) + 1;
  }
}
// The lands the expedition owns, as a row of mana gems in the colours' order.
export function drawLandRow(x: number, y: number, w: number) {
  const lands = state.run.lands.map((c: CardInPlay) => CARDS[c.id].color).sort((a: string, b: string) => COLOR_ORDER.indexOf(a[0]) - COLOR_ORDER.indexOf(b[0]) || a.length - b.length);
  const sp = Math.min(11, Math.floor((w - 9) / Math.max(1, lands.length - 1)));
  lands.forEach((c: string, i: number) => drawGem(x + i * sp, y, c, 9));
}
function stopInfoLines(s: Stop, o: Loose) {
  const n = stopName(s), lines = [], cls = stopCls(s), here = s.id === state.run.at, enc = here ? null : encounterOf(s);
  lines.push({ s: nameStr(n), col: COL.amberL });
  lines.push({ s: contName(s.cont), col: COL.dim });
  lines.push({ s: T('cls_' + cls), col: cls === 'elite' ? COL.red : cls === 'town' ? COL.gold : cls === 'camp' ? COL.teal : COL.text });
  if (enc && (o || here)) lines.push({ s: enc.guard ? T('guardLine', { e: groupNames(enc.kinds) }) : groupNames(enc.kinds), col: enc.guard || enc.elite ? COL.red : COL.text });
  if (PLACE_LAND[s.id]) lines.push({ s: T('placeLandLine', { c: nameStr(cardName(PLACE_LAND[s.id])) }), col: COL.green });
  if (here) lines.push({ s: T('here'), col: COL.green });
  else if (!o) lines.push({ s: T('visited'), col: COL.dim });
  else {
    lines.push({ s: o.ok ? T('costDays', { n: o.days }) : T('tooFar', { n: o.days }), col: o.ok ? COL.green : COL.red });
    if (state.run.rough.indexOf(s.id) >= 0) lines.push({ s: T('rough'), col: COL.blue });
  }
  lines.push({ gap: 4 });
  lines.push({ s: LX(STOP_TEXT[s.id]), col: COL.dim, max: 5 });
  return lines;
}
export function drawMap() {
  ctx.fillStyle = COL.panel; ctx.fillRect(0, 0, W, H);
  const opts = mapOptions(), run = state.run, here = stopById(run.at);
  drawWorld();
  drawTrail(run.route, COL.amber);
  const hs = ui.hoverStop ? stopById(ui.hoverStop) : null;
  const ho = hs ? opts.find(o => o.s.id === hs.id) : null;
  if (hs && ho) { ctx.fillStyle = ho.ok ? COL.white : COL.red; dotted(MAP_X + here.x, MAP_Y + here.y, MAP_X + hs.x, MAP_Y + hs.y, 1); }
  drawStops(opts);
  drawMarker(MAP_X + here.x, MAP_Y + here.y);
  const go = opts.filter(o => o.ok);
  let lines;
  if (hs) lines = stopInfoLines(hs, ho);
  else {
    lines = [{ s: T('choose'), col: COL.amberL }, { gap: 2 }];
    go.slice(0, 9).forEach((o, i) => lines.push({ s: (i + 1) + ' ' + nameStr(stopName(o.s)) + ' · ' + T('dayShort', { n: o.days }), col: COL.text, max: 2 }));
  }
  drawSidePanel(lines);
  if (!go.length) drawButton(R_ROIL, T('faceRoil'), Math.floor(state.t * 2) % 2 === 0);
  else { let ly = 288; for (const k of ['town', 'wild', 'elite', 'camp']) { ctx.drawImage(ICON[k], 496, ly); txt(T('cls_' + k), 512, ly - 1, COL.dim); ly += 14; } ctx.drawImage(ICON.roil, 497, ly + 1); txt(T('roughLegend'), 512, ly - 1, COL.blue); }
  const sn = stopName(here);
  txtS(nameStr(sn) + ' · ' + contName(here.cont), 8, 3, COL.text);
  drawHudButtons(true);
  if (ui.deck) drawDeckView();
}
export function drawTravel() {
  ctx.fillStyle = COL.panel; ctx.fillRect(0, 0, W, H);
  const tr = state.travel, a = stopById(tr.from), b = stopById(tr.to), k = Math.min(1, tr.t / tune.travel_time);
  drawWorld();
  drawTrail(state.run.route, COL.amber);
  ctx.fillStyle = COL.white; dotted(MAP_X + a.x, MAP_Y + a.y, MAP_X + b.x, MAP_Y + b.y, k);
  drawStops(null);
  drawMarker(MAP_X + a.x + (b.x - a.x) * k, MAP_Y + a.y + (b.y - a.y) * k);
  drawSidePanel(stopInfoLines(b, { ok: true, days: tr.days }));
  txtS(nameStr(stopName(b)), 8, 3, COL.text);
}
export function drawBanner() {
  const bn = state.banner; if (!bn || bn.t <= 0) return;
  const w = Math.min(600, textW(bn.text) + 24), x = Math.round((W - w) / 2);
  box(x, 21, w, 22, COL.panel, COL.amber);
  txt(bn.text, W / 2, 26, COL.amberL, 'center');
}

// ---- the deck, laid out to look through or to take a card out of ----
const DECK_PER = 14;
const R_DCLOSE = { x: 270, y: 336, w: 100, h: 18 }, R_DPREV = { x: 20, y: 336, w: 30, h: 18 }, R_DNEXT = { x: 590, y: 336, w: 30, h: 18 };
function deckSlot(i: number) { return { x: 26 + (i % 7) * 85, y: 30 + Math.floor(i / 7) * 112, w: 80, h: 108 }; }
const FAMILY_ORDER = ['creature', 'gear', 'lasting', 'curse', 'spell', 'land'];
// The deck's cards by what they are, then the lands when the deck is only looked through: a land is not in the deck, and cannot be taken out of it.
function sortedDeck(withLands: boolean) {
  const run = state.run, rank = (c: CardInPlay) => FAMILY_ORDER.indexOf(family(CARDS[c.id]));
  const cards = run.deck.slice().sort((a: CardInPlay, b: CardInPlay) => rank(a) - rank(b) || a.id.localeCompare(b.id) || a.uid - b.uid);
  const lands = run.lands.slice().sort((a: CardInPlay, b: CardInPlay) => (CARDS[a.id].basic ? 0 : 1) - (CARDS[b.id].basic ? 0 : 1) || COLOR_ORDER.indexOf(CARDS[a.id].color[0]) - COLOR_ORDER.indexOf(CARDS[b.id].color[0]) || a.id.localeCompare(b.id) || a.uid - b.uid);
  return withLands ? cards.concat(lands) : cards;
}
export function updateDeckView() {
  const dk = ui.deck, deck = sortedDeck(dk.mode === 'view'), pages = Math.max(1, Math.ceil(deck.length / DECK_PER));
  if (pressed('Escape') || clicked(R_DCLOSE) || (dk.mode === 'view' && pressed('KeyD'))) { ui.deck = null; return; }
  if (pages > 1 && (clicked(R_DNEXT) || pressed('ArrowRight'))) dk.page = (dk.page + 1) % pages;
  if (pages > 1 && (clicked(R_DPREV) || pressed('ArrowLeft'))) dk.page = (dk.page + pages - 1) % pages;
  ui.hoverCard = -1;
  const shown = deck.slice(dk.page * DECK_PER, dk.page * DECK_PER + DECK_PER);
  shown.forEach((c: CardInPlay, i: number) => { if (over(deckSlot(i))) ui.hoverCard = i; });
  if (dk.mode === 'remove' && mouse.released && ui.hoverCard >= 0) {
    const c = shown[ui.hoverCard], run = state.run;
    run.deck.splice(run.deck.findIndex((x: CardInPlay) => x.uid === c.uid), 1);
    state.banner = { text: T('removed', { c: cardName(c.id).text }), t: 1.6 };
    sfx('wave'); ui.deck = null;
    if (dk.done) dk.done();
  }
}
export function drawDeckView() {
  const dk = ui.deck, deck = sortedDeck(dk.mode === 'view'), pages = Math.max(1, Math.ceil(deck.length / DECK_PER));
  ctx.fillStyle = 'rgba(20,16,28,0.94)'; ctx.fillRect(0, 0, W, H);
  txt(dk.mode === 'remove' ? T('deckPick') : T('deckTitle', { n: state.run.deck.length, m: state.run.lands.length }), 26, 8, COL.amberL);
  if (pages > 1) txt((dk.page + 1) + '/' + pages, 614, 8, COL.dim, 'right');
  const shown = deck.slice(dk.page * DECK_PER, dk.page * DECK_PER + DECK_PER);
  shown.forEach((c: CardInPlay, i: number) => { const r = deckSlot(i); drawCard(c.id, r.x, r.y, { hot: ui.hoverCard === i }); });
  if (ui.hoverCard >= 0 && shown[ui.hoverCard]) {
    const id = shown[ui.hoverCard].id;
    const end = para(nameStr(cardName(id)) + ' — ' + cardText(id), 26, 258, 590, COL.text, 3);
    para(LX(CARDS[id].lore), 26, end + 2, 590, COL.dim, 2);
    txt(cardOrigin(id), 26, 322, COL.dim);
  }
  drawButton(R_DCLOSE, T('close'));
  if (pages > 1) { drawButton(R_DPREV, '<'); drawButton(R_DNEXT, '>'); }
}

// ---- mana, as gems of this game's own: a square in the colour's hue, split for a land of two colours ----
export const MANA_COL: Record<string, string> = { W: '#f0e2b0', U: '#4a90d9', B: '#7a6a90', R: '#d9523c', G: '#4f9a3c', '': '#9aa0a8' };
// token: the colours a mana can be spent as ('U', 'WR'), '' for no colour, '*' for any colour.
export function drawGem(x: number, y: number, token: string, s: number) {
  ctx.fillStyle = INK; ctx.fillRect(x, y, s, s);
  const w = s - 2;
  if (token === '*') { ctx.fillStyle = '#f4f0ff'; ctx.fillRect(x + 1, y + 1, w, w); ctx.fillStyle = COL.hedron; ctx.fillRect(x + 3, y + 3, s - 6, s - 6); return; }
  const cols = token ? token.split('') : [''];
  cols.forEach((c, i) => { const x0 = x + 1 + Math.round((i * w) / cols.length), x1 = x + 1 + Math.round(((i + 1) * w) / cols.length); ctx.fillStyle = MANA_COL[c]; ctx.fillRect(x0, y + 1, x1 - x0, w); });
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 1, y + 1, w, 1);
}

// ---- a card, 80 x 108 ----
// The edge of a card says what becomes of it when played: it takes the field, is worn, stays out, happens once, or is a land.
export const FAMILY_COL: Record<string, string> = { creature: '#b8843c', gear: '#5f8fa8', lasting: '#7a5ab8', curse: '#7a5ab8', spell: '#b8483c', land: '#4f8a3c' };
export function cardEdge(d: CardDef) { return FAMILY_COL[family(d)]; }
export function drawCard(id: string, x: number, y: number, o: Loose) {
  o = o || {};
  const d = CARDS[id], land = d.kind === 'land';
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = INK; ctx.fillRect(x, y, 80, 108);
  ctx.fillStyle = o.hot ? COL.amberL : cardEdge(d); ctx.fillRect(x + 1, y + 1, 78, 106);
  ctx.fillStyle = COL.panelL; ctx.fillRect(x + 3, y + 3, 74, 102);
  const nm = cardName(id), lines = wrap(nameStr(nm), 72).slice(0, 2);
  const ny = lines.length === 1 ? y + 10 : y + 4;
  lines.forEach((ln, i) => txt(ln, x + 40, ny + i * 12, COL.text, 'center'));
  ctx.fillStyle = INK; ctx.fillRect(x + 7, y + 30, 66, 38);
  ctx.drawImage(cardArt(id), x + 8, y + 31);
  // on the picture's corner: the cost on a gem of the card's colour; a land shows the mana it makes
  const cost = o.cost !== undefined ? o.cost : d.cost;
  drawGem(x + 3, y + 27, d.color, 15);
  if (!land) {
    if (o.cost !== undefined && o.cost < d.cost) { ctx.fillStyle = COL.green; ctx.fillRect(x + 5, y + 29, 11, 11); }
    txt(String(cost), x + 11, y + 28, d.color === 'W' && !(o.cost !== undefined && o.cost < d.cost) ? INK : COL.white, 'center');
  }
  // what it does, in icons and numbers
  let fx = x + 6;
  for (const f of cardFace(id)) {
    const w = f[1] ? 13 + textW(f[1]) + 3 : 12;
    if (fx + w > x + 78) break;
    ctx.drawImage(ICON[f[0]] || ICON.up, fx, y + 73);
    if (f[1]) txt(f[1], fx + 11, y + 72, COL.text);
    fx += w;
  }
  const tag = d.trap ? 'kw_trap' : d.quest ? 'kw_quest' : 'kd_' + d.kind;
  txt(T(tag), x + 40, y + 89, tag === 'kw_trap' ? COL.red : tag === 'kw_quest' ? COL.gold : d.ally ? COL.blue : COL.dim, 'center');
  if (o.dim) { ctx.fillStyle = 'rgba(20,16,28,0.55)'; ctx.fillRect(x + 1, y + 1, 78, 106); }
}

// The panel that explains a card in full: both names, what it is and costs, what it does, its
// keywords, where it is from. o: {extra: a line of its own, room: the height it may take (lore
// goes first when it does not fit), off: its colour is one no land of yours makes, known: leave
// out what its kind means (it is already in play, or one of many alike)}.
export function drawCardInfo(id: string, x: number, y: number, w: number, o?: Loose) {
  o = o || {};
  const d = CARDS[id], nm = cardName(id), en = cardEnglish(id), text = cardText(id);
  const body = wrap(text, w - 16);
  const kws = cardKw(id).slice(o.known ? 1 : 0).map((k: string) => T('kwh_' + k));
  if (/화상|[Bb]urn/.test(text)) kws.push(T('kwh_burn'));
  let kwLines: string[] = []; for (const k of kws) kwLines = kwLines.concat(wrap(k, w - 16));
  let lore = wrap(LX(d.lore), w - 16).slice(0, 3);
  const origin = wrap(cardOrigin(id), w - 16); // a long place name takes a second line in a narrow panel
  const extra: string[] = o.extra ? wrap(o.extra, w - 16) : [];
  const extras = extra.length + (o.off ? 1 : 0);
  const height = () => 12 + 13 + (nm.text !== en ? 13 : 0) + 15 + extras * 13 + body.length * 13 + 4 + kwLines.length * 13 + (kwLines.length ? 4 : 0) + lore.length * 13 + (lore.length ? 4 : 0) + origin.length * 13 + 8;
  while (o.room && height() > o.room && lore.length) lore = lore.slice(0, -1);
  const h = height();
  if (y + h > 356) y = Math.max(2, 356 - h);
  box(x, y, w, h, COL.panel, COL.amberD);
  let cy = y + 7;
  txt(nameStr(nm), x + 8, cy, COL.amberL); cy += 13;
  if (nm.text !== en) { txt(en, x + 8, cy, COL.dim); cy += 13; }
  // what it is, and what it costs: "Creature · Ally · blue 2"; a land: "Land · white or red"
  const kind = T(d.trap ? 'kw_trap' : 'kd_' + d.kind) + (d.ally ? ' · ' + T('kw_ally') : '');
  const hue = d.color ? d.color.split('').map((c: string) => T('col_' + c)).join('/') : T('col_');
  const cost = d.kind === 'land' ? hue : hue + ' ' + d.cost;
  drawGem(x + 8, cy + 2, d.color, 9);
  txt(kind + ' · ' + cost, x + 20, cy, cardEdge(d)); cy += 15;
  for (const ln of extra) { txt(ln, x + 8, cy, COL.gold); cy += 13; }
  if (o.off) { txt(T('offColor'), x + 8, cy, COL.red); cy += 13; }
  for (const ln of body) { txt(ln, x + 8, cy, COL.text); cy += 13; }
  cy += 4;
  for (const ln of kwLines) { txt(ln, x + 8, cy, COL.green); cy += 13; }
  if (kwLines.length) cy += 4;
  for (const ln of lore) { txt(ln, x + 8, cy, COL.dim); cy += 13; }
  if (lore.length) cy += 4;
  for (const ln of origin) { txt(ln, x + 8, cy, COL.dim); cy += 13; }
  return h;
}
// Is this card's colour one the expedition's lands cannot make yet? (Shown where a card is offered.)
export function offColour(id: string) { return !castable(state.run, id); }
