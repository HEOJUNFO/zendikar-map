import './sprites2'; // load order, as in the one-shot's page: this module runs after sprites2
import { tune } from './config';
import { rng } from './game/rng';
import { events, state } from './game/state';
import { down } from './input';
import { sfx } from './audio';
import { LX, T } from './text';
import { CARDS, FIRST_HAND, POOLS, RARITY_WEIGHT, RARITY_WEIGHT_ELITE, cardName, cardRarity, isLand, val } from './cards';
import { PLACE_LAND } from './cards2';
import { ENEMIES, curMove, intentDamage, intentIsAttack, isBig, moveHits, trait } from './enemies';
import { COL } from './art';
import { battleLayout, finishRun, incomingDamage } from './screens2';
import type { Battle, CardDef, CardInPlay, Enemy, Fx, Loose, QueueStep } from './game/types';
import * as rules from './game/rules';
// The fight: a deck, a hand, energy, enemies that show their next move, and a queue that
// resolves every effect one at a time so the player can see why each number changed.
// A card's effects are data (fx: a list of [op, values]); runFx turns them into queued steps.
// Everything runs on the fixed step; the only chance is the seeded rng().

export function shuffle(a: Loose[]) { return rules.shuffle(a, rng); }
function hasPower(id: string) { const b = state.battle; return !!b && b.powers.some((p: CardInPlay) => p.id === id); }
export function landLimit(b: Battle) { return rules.landLimit(hasPower('oracle-of-mul-daya'), b.landExtra); }
function livingEnemies(b: Battle) { return b.enemies.filter((e: Enemy) => e.hp > 0); }
function presentEnemies(b: Battle) { return b.enemies.filter((e: Enemy) => e.hp > 0 && e.away <= 0); }
export function targetable(e: Enemy) { return e.hp > 0 && e.away <= 0 && !e.hidden; }

// What the lasting cards in play add up to: 'atk' on every hit, 'blk' on every gain of block,
// 'noHex' when one of them cancels what is not an attack. A quest's share counts once it is done.
export function passive(b: Battle, key: string) {
  let n = 0;
  for (const p of b.powers) {
    const d = CARDS[p.id];
    for (const s of [d.passive, p.done && d.quest && d.quest.then ? d.quest.then.passive : null]) {
      if (!s) continue;
      if (s[key] !== undefined) n += s[key] === true ? 1 : val(s[key]);
      if (key === 'atk' && s.atkPerPower !== undefined) n += val(s.atkPerPower) * b.powers.length;
    }
  }
  return n;
}
// Will this enemy's intent come to nothing? Cancelled by a card, or not an attack while Iona is out.
export function willCancel(b: Battle, e: Enemy) {
  if (e.cancelled) return true;
  if (!b || trait(e, 'uncounterable') || intentIsAttack(e)) return false;
  return passive(b, 'noHex') > 0;
}

// ---- What a card may queue ----
export const Q = {
  push(a: QueueStep) { state.battle.queue.push(a); },
  hit(ti: number, n: number, o?: { pierce?: boolean }) { Q.push({ k: 'hit', ti, n, pierce: !!(o && o.pierce) }); },
  hitRandom(n: number) { Q.push({ k: 'hitr', n }); },
  block(n: number) { Q.push({ k: 'block', n }); },
  draw(n: number) { for (let i = 0; i < n; i++) Q.push({ k: 'draw' }); },
  energy(n: number) { Q.push({ k: 'energy', n }); },
  heal(n: number) { Q.push({ k: 'heal', n }); },
  gold(n: number) { Q.push({ k: 'gold', n }); },
  power(id: string) { Q.push({ k: 'power', id }); },
  fetchLand() { Q.push({ k: 'fetch' }); },
  scout() { Q.push({ k: 'scout' }); },
  extraLand(n: number) { Q.push({ k: 'extraLand', n }); },
  cleanse() { Q.push({ k: 'cleanse' }); },
  bonus(n: number) { Q.push({ k: 'bonus', n }); },
  burnEnemy(ti: number, n: number) { Q.push({ k: 'burnE', ti, n }); },
  strip(ti: number) { Q.push({ k: 'strip', ti }); },
  cancel(ti: number) { Q.push({ k: 'cancel', ti }); },
  banish(ti: number, n: number) { Q.push({ k: 'banish', ti, n }); },
};

// Turn a card's effects into queued steps. cx: {lf: landfall, n: times played, allies: played before}.
function runFx(fx: Fx[], b: Battle, ti: number, cx: Loose, d?: CardDef) {
  cx = cx || {};
  const rl = d && d.rally ? d.rally : null;
  const rb = (op: string) => (rl && rl[0] === op ? val(rl[1]) * (cx.allies || 0) : 0);
  for (const f of fx) {
    const op = f[0], n = f[1] !== undefined ? val(f[1]) : 0, m = f[2] !== undefined ? val(f[2]) : 0;
    switch (op) {
      case 'hit': case 'pierce': {
        let times = m || 1;
        if (d && d.timesIfPower && b.powers.length) times = val(d.timesIfPower);
        for (let i = 0; i < times; i++) Q.hit(ti, n + rb('hit'), { pierce: op === 'pierce' });
        break;
      }
      case 'hitall': Q.push({ k: 'hitall', n: n + rb('hit') }); break;
      case 'hitrand': for (let i = 0; i < (m || 1); i++) Q.hitRandom(n + rb('hit')); break;
      case 'hitPerLandPlayed': Q.hit(ti, n * Math.max(1, b.landsFight)); break;
      case 'hitrandPerLand': Q.hitRandom(n * Math.max(1, b.landsFight)); break;
      case 'hitPerHand': Q.hit(ti, n * b.hand.length); break;
      case 'hitHalf': Q.push({ k: 'hithalf', ti, cap: n }); break;
      case 'block': Q.block(n + rb('block')); break;
      case 'blockNext': Q.push({ k: 'blockNext', n }); break;
      case 'heal': Q.heal(n + rb('heal')); break;
      case 'healPerLand': { let k = 0; for (const c of b.hand.concat(b.draw, b.discard)) if (isLand(c.id)) k++; Q.heal(n * k); break; }
      case 'draw': Q.draw(n + rb('draw')); break;
      case 'energy': Q.energy(n); break;
      case 'gold': Q.gold(n + rb('gold')); break;
      case 'burn': Q.burnEnemy(ti, n); break;
      case 'burnall': Q.push({ k: 'burnall', n }); break;
      case 'sap': Q.push({ k: 'sap', ti, n }); break;
      case 'sapall': Q.push({ k: 'sapall', n }); break;
      case 'strip': Q.strip(ti); break;
      case 'unblock': Q.push({ k: 'unblock', ti }); break;
      case 'unblockall': Q.push({ k: 'unblockall' }); break;
      case 'cancel': Q.cancel(ti); break;
      case 'stun': Q.push({ k: 'stun', ti }); break;
      case 'stunall': Q.push({ k: 'stunall', big: f[1] === 'big' }); break;
      case 'banish': Q.banish(ti, n); break;
      case 'bonus': Q.bonus(n + rb('bonus')); break;
      case 'piercing': Q.push({ k: 'piercing' }); break;
      case 'fetch': Q.fetchLand(); break;
      case 'extraLand': Q.extraLand(n); break;
      case 'cleanse': Q.cleanse(); break;
      case 'discard': Q.push({ k: 'discard', n }); break;
      case 'selfhurt': Q.push({ k: 'selfhurt', n }); break;
      case 'retrieve': for (let i = 0; i < (n || 1); i++) Q.push({ k: 'retrieve' }); break;
      case 'fetchTrap': Q.push({ k: 'fetchTag', tag: 'trap' }); break;
      case 'fetchAlly': Q.push({ k: 'fetchTag', tag: 'ally' }); break;
      case 'fetchPower': Q.push({ k: 'fetchTag', tag: 'power' }); break;
      case 'fetchDiscard': Q.push({ k: 'fetchDiscard', what: f[1] }); break;
      case 'reshuffle': Q.push({ k: 'reshuffle' }); break;
      case 'echo': Q.push({ k: 'echo' }); break;
      case 'freeTraps': Q.push({ k: 'freeTraps' }); break;
      case 'makeLand': Q.push({ k: 'makeLand', id: f[1] }); break;
      case 'mutiny': Q.push({ k: 'mutiny', ti }); break;
      case 'weaken': Q.push({ k: 'weaken', ti, n }); break;
      case 'weakenall': Q.push({ k: 'weakenall', n }); break;
      case 'halve': Q.push({ k: 'halve', ti }); break;
      case 'scoutN': Q.push({ k: 'scoutN', n }); break;
      case 'ifAttack': { const e = b.enemies[ti]; runFx(e && intentIsAttack(e) ? f[1] : f[2], b, ti, cx, d); break; }
    }
  }
}
function playEffects(b: Battle, d: CardDef, ti: number, cx: Loose) {
  if (d.play) { d.play(b, ti, cx); return; }
  runFx(cx.lf && d.lf ? d.lf : d.fx || [], b, ti, cx, d);
  if (cx.lf && d.lfAdd) runFx(d.lfAdd, b, ti, cx, d);
  if (d.type === 'power') Q.power(d.id);
}

// Something happened that lasting cards may answer: land, turn, attack, skill, ally, trap, kill,
// hurt (you lost HP to an enemy), unhurt (an enemy turn went by and you lost none).
function fire(b: Battle, ev: string) {
  for (const p of b.powers.slice()) {
    const d = CARDS[p.id];
    if (ev === 'land' && d.onLand) d.onLand(b);
    if (ev === 'turn' && d.onTurn) d.onTurn(b);
    if (d.on && d.on[ev]) runFx(d.on[ev], b, -1, {});
    const q = d.quest;
    if (!q) continue;
    if (p.done) { if (q.then && q.then.on && q.then.on[ev]) runFx(q.then.on[ev], b, -1, {}); continue; }
    if (q.on !== ev) continue;
    p.n = (p.n || 0) + 1;
    if (p.n < val(q.need)) continue;
    Q.push({ k: 'quest', id: p.id });
    if (q.reward) runFx(q.reward, b, -1, {});
    if (q.repeat) p.n = 0; else p.done = true;
  }
}

function makeEnemy(kind: string, scale: number, slot: number, hpScale?: number) {
  const def = ENEMIES[kind];
  const hp = Math.max(1, Math.round(val(def.hp) * (hpScale === undefined ? scale : hpScale)));
  const e = { kind, hp, maxHp: hp, block: 0, str: 0, mi: 0, scale, charged: false, hidden: false, away: 0, cancelled: false, burn: 0, enraged: false, revived: false, weak: 0, halved: false, slot, flash: 0, lunge: 0 };
  const ar = trait(e, 'armor'); if (ar) e.block = Math.max(1, Math.round(val(ar) * scale));
  return e;
}

// Start a fight with these kinds. o: {cont, stop, bg, boss, elite, first}
export function startBattle(kinds: string[], o: Loose) {
  const run = state.run;
  const scale = rules.enemyScale(tune.day_scale, run.day, o.first || o.boss); // the Roil Elemental is the same on any day
  const enemies = kinds.map((kind, i) => {
    const e = makeEnemy(kind, scale, i, o.first ? tune.first_fight_scale : scale);
    if (kinds.length > 1) e.mi = i % ENEMIES[kind].moves.length; // a group does not move in step
    return e;
  });
  let draw = shuffle(run.deck.map((c: CardInPlay) => ({ id: c.id, uid: c.uid })));
  if (o.first) { // the first minute: a hand that teaches attack, block and landfall
    const top = [];
    for (const id of FIRST_HAND) { const i = draw.findIndex(c => c.id === id); if (i >= 0) top.push(draw.splice(i, 1)[0]); }
    draw = draw.concat(top.reverse()); // drawn from the end
  }
  state.battle = {
    kinds, cont: o.cont, stop: o.stop, bg: o.bg || null, boss: !!o.boss, elite: !!o.elite, first: !!o.first,
    turn: 0, energy: 0, hand: [], draw, discard: [], powers: [],
    block: 0, blockNext: 0, burn: 0, web: 0, jam: 0, bonus: 0, landPlayed: 0, landExtra: 0, landsFight: 0, landLock: false, landLockNext: false,
    landfall: false, hurtLast: false, hookUsed: false, pierceTurn: false, freeTraps: false, echo: 0, allies: 0,
    enemyHealed: false, enemyHealedLast: false, counts: {}, tempUid: 0,
    enemies, queue: [], qt: 0, phase: 'player', floats: [], shake: 0, msg: '', msgT: 0, chain: 0, endT: 0, t: 0, target: 0,
    intro: o.boss ? 1.6 : 0.5, fly: null,
  };
  state.screen = 'battle';
  beginPlayerTurn();
}

function beginPlayerTurn() {
  const b = state.battle;
  b.turn++; b.phase = 'player'; b.chain = 0;
  b.block = b.blockNext; b.blockNext = 0;
  b.energy = Math.max(0, tune.energy - b.web); b.web = 0;
  b.landPlayed = 0; b.landExtra = 0; b.landfall = false; b.bonus = 0; b.hookUsed = false; b.pierceTurn = false; b.freeTraps = false; b.echo = 0;
  b.landLock = b.landLockNext; b.landLockNext = false;
  b.enemyHealedLast = b.enemyHealed; b.enemyHealed = false;
  if (b.burn > 0) Q.push({ k: 'pburn' });
  if (b.turn > 1 && !b.hurtLast) fire(b, 'unhurt');
  fire(b, 'turn');
  Q.draw(Math.max(1, tune.hand_size - b.jam)); b.jam = 0;
  pickTarget();
}
function pickTarget() { // keep the keyboard's target on something that can be hit
  const b = state.battle;
  if (b.enemies[b.target] && targetable(b.enemies[b.target])) return;
  const i = b.enemies.findIndex(targetable);
  if (i >= 0) b.target = i;
}

// When a trap costs 0. With one enemy named: is it met for that one; with none: for any.
export const TRAPS: Record<string, (b: Battle, e?: Enemy) => Loose> = {
  attack: (b: Battle, e: Enemy) => intentIsAttack(e),
  quiet: (b: Battle, e: Enemy) => !e.cancelled && !intentIsAttack(e),
  shielded: (b: Battle, e: Enemy) => e.block > 0,
  strong: (b: Battle, e: Enemy) => e.str > 0,
  crowd: (b: Battle) => presentEnemies(b).length >= 2,
  fullhand: (b: Battle) => b.hand.length - 1 >= tune.trap_fullhand,
  lowhp: () => state.run.hp * 2 <= state.run.maxHp,
  enemyHealed: (b: Battle) => b.enemyHealedLast,
  bigdiscard: (b: Battle) => b.discard.length >= tune.trap_bigdiscard,
  threat: (b: Battle) => incomingDamage(b) >= tune.trap_threat,
};
function trapMet(b: Battle, d: Loose, ti?: number) {
  if (!d.trap) return false;
  const named = ti !== undefined && ti !== null && ti >= 0 && b.enemies[ti] && targetable(b.enemies[ti]);
  if (typeof d.trap === 'function') {
    if (d.target === 'enemy' && !named) return b.enemies.some((e: Enemy, i: number) => targetable(e) && d.trap(b, i));
    return !!d.trap(b, ti);
  }
  const fn = TRAPS[d.trap];
  if (!fn) return false;
  if (fn.length < 2) return !!fn(b);
  if (named) return !!fn(b, b.enemies[ti]);
  return b.enemies.some((e: Enemy) => targetable(e) && fn(b, e));
}
export function costOf(b: Battle, id: string, ti?: number) { const d = CARDS[id]; return d.trap && (b.freeTraps || trapMet(b, d, ti)) ? 0 : d.cost; }
// Why this card cannot be played now (a text key), or null when it can.
export function playReason(b: Battle, id: string, ti?: number) {
  const d = CARDS[id];
  if (d.type === 'land') {
    if (b.landLock) return 'no_landlock';
    if (b.landPlayed >= landLimit(b)) return 'no_land';
  }
  if (d.target === 'enemy') {
    const e = b.enemies[ti!];
    if (!e || e.hp <= 0 || e.away > 0) return 'no_target';
    if (e.hidden) return 'no_hidden';
    if (d.type === 'skill' && trait(e, 'shroud')) return 'no_shroud';
    if (d.notBig && isBig(e)) return 'no_big';
  }
  if (d.req === 'landInHand' && !b.hand.some((c: CardInPlay) => isLand(c.id))) return 'no_landhand';
  if (d.can) { const r = d.can(b, ti!); if (r) return r; }
  if (costOf(b, id, ti) > b.energy) return 'no_energy';
  return null;
}
export function canAct() { const b = state.battle; return !!b && b.phase === 'player' && b.queue.length === 0 && b.intro <= 0; }

export function tryPlay(hi: number, ti?: number) {
  const b = state.battle;
  if (!canAct()) return false;
  const c = b.hand[hi]; if (!c) return false;
  const d = CARDS[c.id];
  if (d.target === 'enemy' && (ti === undefined || ti === null || ti < 0)) { pickTarget(); ti = b.target; }
  const why = playReason(b, c.id, ti);
  if (why) { b.msg = T(why); b.msgT = 1.6; sfx('deny'); return false; }
  b.energy -= costOf(b, c.id, ti);
  b.hand.splice(hi, 1);
  b.chain = 0;
  const n = b.counts[c.id] || 0; b.counts[c.id] = n + 1;
  const cx = { lf: b.landfall, n, allies: b.allies };
  sfx('card');
  events.push({ t: state.t, play: c.id });
  Q.push({ k: 'fly', id: c.id, ti: d.target === 'enemy' ? ti : -1 });
  if (d.pay) d.pay(b);
  if (d.req === 'landInHand') { const li = b.hand.findIndex((x: CardInPlay) => isLand(x.id)); if (li >= 0) b.discard.push(b.hand.splice(li, 1)[0]); }
  if (d.type === 'land') { b.landPlayed++; b.landsFight++; }
  let reps = 1;
  if (b.echo > 0 && d.type !== 'land' && d.type !== 'power') { reps++; b.echo--; }
  if (d.type === 'attack' && !b.hookUsed && hasPower('grappling-hook')) { b.hookUsed = true; reps++; }
  for (let r = 0; r < reps; r++) playEffects(b, Object.assign({ id: c.id }, d), ti!, cx);
  if (d.ally) b.allies++;
  if (d.type === 'land') { b.landfall = true; Q.push({ k: 'landfall' }); }
  else if (d.type === 'attack' || d.type === 'skill') fire(b, d.type);
  if (d.ally) fire(b, 'ally');
  if (d.trap) fire(b, 'trap');
  if (d.type === 'power') { /* it stays in play */ }
  else if (d.recur) b.draw.push(c);
  else b.discard.push(c);
  return true;
}

export function endTurn() {
  const b = state.battle;
  if (!canAct()) return false;
  while (b.hand.length) b.discard.push(b.hand.pop());
  b.phase = 'enemy'; b.hurtLast = false; b.chain = 0;
  for (let i = 0; i < b.enemies.length; i++) Q.push({ k: 'eact', ei: i });
  Q.push({ k: 'turn' });
  sfx('end');
  return true;
}

function addFloat(x: number, y: number, text: string, col: string) { state.battle.floats.push({ x, y, text: String(text), col, t: 0 }); }
function enemyXY(i: number) { const p = battleLayout().enemies[i]; return p ? { x: p.x, y: p.y - p.h - 8 } : { x: 480, y: 120 }; }
function playerXY() { const L = battleLayout(); return { x: L.player.x, y: L.player.y - 52 }; }
function mill(b: Battle, n: number) { for (let i = 0; i < n && b.draw.length; i++) b.discard.push(b.draw.pop()); }
function toHand(b: Battle, c: CardInPlay) { if (b.hand.length >= 10) b.discard.push(c); else b.hand.push(c); }

// An enemy at 0 hp: it comes back once if it can. True when it stays down.
function fell(b: Battle, ei: number) {
  const e = b.enemies[ei], at = enemyXY(ei);
  if (trait(e, 'revive') && !e.revived) { e.revived = true; e.hp = Math.ceil(e.maxHp / 2); addFloat(at.x, at.y - 12, T('revived'), COL.purple); sfx('roar'); return false; }
  sfx('kill'); b.shake = Math.max(b.shake, 0.2); events.push({ t: state.t, kill: e.kind }); fire(b, 'kill');
  return true;
}
// Hurt one enemy. Block soaks it unless the hit pierces; raw: the number as it is, no bonus.
function hurtEnemy(b: Battle, ti: number, n: number, pierce: boolean, raw?: boolean) {
  let e = b.enemies[ti];
  if (!e || e.hp <= 0 || e.away > 0) { // the target is gone: the hit finds another
    const opts = b.enemies.map((x: number, i: number) => i).filter((i: number) => b.enemies[i].hp > 0 && b.enemies[i].away <= 0);
    if (!opts.length) return;
    ti = opts[Math.floor(rng() * opts.length)]; e = b.enemies[ti];
  }
  let dmg = Math.max(0, raw ? n : n + b.bonus + passive(b, 'atk'));
  const at = enemyXY(ti);
  if (!(pierce || b.pierceTurn) && e.block > 0) {
    const soak = Math.min(e.block, dmg); e.block -= soak; dmg -= soak;
    if (soak > 0 && dmg === 0) { addFloat(at.x, at.y, T('block'), COL.teal); sfx('block'); return; }
  }
  e.hp = Math.max(0, e.hp - dmg); e.flash = 0.18;
  addFloat(at.x, at.y, '-' + dmg, COL.white);
  sfx('hit', b.chain++);
  const rage = trait(e, 'rage');
  if (rage && !e.enraged && e.hp > 0 && e.hp <= e.maxHp / 2) { e.enraged = true; e.str += val(rage); addFloat(at.x, at.y - 14, '+' + val(rage) + ' ' + T('st_str'), COL.red); sfx('roar'); }
  if (e.hp <= 0) fell(b, ti);
}
function eatPower(b: Battle, at: Loose) {
  const i = Math.floor(rng() * b.powers.length), gone = b.powers.splice(i, 1)[0];
  addFloat(at.x, at.y, '-' + cardName(gone.id).text, COL.purple); sfx('roar'); b.shake = 0.3;
}
// A new enemy joins the fight, in an empty place if there is one. False when the field is full.
function summon(b: Battle, kind: string, from: Enemy) {
  if (livingEnemies(b).length >= 3) return false;
  let slot = b.enemies.findIndex((x: Enemy) => x.hp <= 0);
  if (slot < 0) { if (b.enemies.length >= 3) return false; slot = b.enemies.length; }
  b.enemies[slot] = makeEnemy(kind, from.scale, slot);
  return true;
}

function drawFromPile(b: Battle) {
  if (!b.draw.length) {
    if (!b.discard.length) return false;
    b.draw = shuffle(b.discard); b.discard = [];
  }
  toHand(b, b.draw.pop());
  return true;
}
function takeFrom(pile: CardInPlay[], test: (c: CardInPlay) => boolean) { for (let k = pile.length - 1; k >= 0; k--) if (test(pile[k])) return pile.splice(k, 1)[0]; return null; }
const TAGS: Record<string, (c: CardInPlay) => boolean> = { trap: (c: CardInPlay) => !!CARDS[c.id].trap, ally: (c: CardInPlay) => !!CARDS[c.id].ally, power: (c: CardInPlay) => CARDS[c.id].type === 'power', land: (c: CardInPlay) => isLand(c.id) };

// Resolve one queued step; returns how long it holds the screen, in seconds.
function resolve(a: QueueStep) {
  const b = state.battle, run = state.run, P = playerXY(), R = tune.resolve_time;
  const each = (fn: (e: Enemy, i: number) => void) => b.enemies.forEach((e: Enemy, i: number) => { if (e.hp > 0 && e.away <= 0) fn(e, i); });
  switch (a.k) {
    case 'fly': b.fly = { id: a.id, ti: a.ti, t: 0 }; return 0.14;
    case 'hit': hurtEnemy(b, a.ti, a.n, a.pierce); return R;
    case 'hitr': {
      const opts = b.enemies.map((x: number, i: number) => i).filter((i: number) => b.enemies[i].hp > 0 && b.enemies[i].away <= 0);
      if (!opts.length) return 0;
      hurtEnemy(b, opts[Math.floor(rng() * opts.length)], a.n, false); return R;
    }
    case 'hitall': each((e, i) => hurtEnemy(b, i, a.n, false)); return R;
    case 'hithalf': { const e = b.enemies[a.ti]; if (e && e.hp > 0) hurtEnemy(b, a.ti, Math.min(a.cap, Math.ceil(e.hp / 2)), true, true); return R; }
    case 'block': { const n = a.n + passive(b, 'blk'); b.block += n; addFloat(P.x, P.y, '+' + n + ' ' + T('block'), COL.teal); sfx('block'); return R; }
    case 'blockNext': b.blockNext += a.n; return 0;
    case 'draw': if (drawFromPile(b)) { sfx('draw'); return 0.06; } return 0;
    case 'energy': b.energy += a.n; addFloat(60, 236, '+' + a.n, COL.gold); sfx('energy'); return R * 0.6;
    case 'heal': {
      const h = Math.min(a.n, run.maxHp - run.hp); run.hp += h;
      if (h > 0) { addFloat(P.x, P.y - 12, '+' + h, COL.green); sfx('heal'); return R; }
      return 0;
    }
    case 'gold': run.gold = Math.max(0, run.gold + a.n); addFloat(P.x, P.y - 24, (a.n > 0 ? '+' : '') + a.n + ' ' + T('gold'), COL.gold); return R * 0.5;
    case 'power': b.powers.push({ id: a.id, n: 0, done: false }); sfx('power'); return R;
    case 'quest': addFloat(P.x, P.y - 40, T('questDone'), COL.gold); sfx('win'); return R;
    case 'fetch': {
      const c = takeFrom(b.draw, TAGS.land) || takeFrom(b.discard, TAGS.land);
      if (!c) return 0;
      toHand(b, c); sfx('draw'); return R * 0.6;
    }
    case 'fetchTag': {
      const c = takeFrom(b.draw, TAGS[a.tag]) || takeFrom(b.discard, TAGS[a.tag]);
      if (!c) return 0;
      toHand(b, c); sfx('draw'); return R * 0.6;
    }
    case 'fetchDiscard': { const c = takeFrom(b.discard, TAGS[a.what]); if (!c) return 0; toHand(b, c); sfx('draw'); return R * 0.6; }
    case 'retrieve': { if (!b.discard.length) return 0; toHand(b, b.discard.splice(Math.floor(rng() * b.discard.length), 1)[0]); sfx('draw'); return R * 0.6; }
    case 'reshuffle': b.draw = shuffle(b.draw.concat(b.discard)); b.discard = []; sfx('wave'); return R * 0.6;
    case 'scout': {
      const c = b.draw[b.draw.length - 1];
      if (c && isLand(c.id) && b.hand.length < 10) { b.hand.push(b.draw.pop()); addFloat(60, 300, '+' + T('n_land'), COL.green); sfx('draw'); return R * 0.6; }
      return 0;
    }
    case 'scoutN': {
      let got = 0;
      for (let k = 0; k < a.n; k++) { const i = b.draw.length - 1 - k + got; if (i < 0) break; if (isLand(b.draw[i].id) && b.hand.length < 10) { b.hand.push(b.draw.splice(i, 1)[0]); got++; } }
      if (got) { addFloat(60, 300, '+' + got + ' ' + T('n_land'), COL.green); sfx('draw'); return R * 0.6; }
      return 0;
    }
    case 'makeLand': toHand(b, { id: a.id, uid: -(++b.tempUid) }); sfx('draw'); return R * 0.6;
    case 'discard': for (let i = 0; i < a.n && b.hand.length; i++) b.discard.push(b.hand.splice(Math.floor(rng() * b.hand.length), 1)[0]); return R * 0.6;
    case 'selfhurt': { const n = Math.min(a.n, run.hp - 1); if (n > 0) { run.hp -= n; addFloat(P.x, P.y, '-' + n, COL.red); sfx('hurt'); } return R * 0.6; }
    case 'extraLand': b.landExtra += a.n; return 0;
    case 'cleanse': b.burn = 0; b.web = 0; return 0;
    case 'bonus': b.bonus += a.n; addFloat(P.x, P.y, '+' + a.n, COL.amberL); sfx('power'); return R;
    case 'piercing': b.pierceTurn = true; addFloat(P.x, P.y, T('pierceOn'), COL.amberL); sfx('power'); return R * 0.6;
    case 'echo': b.echo++; sfx('power'); return R * 0.6;
    case 'freeTraps': b.freeTraps = true; sfx('power'); return R * 0.6;
    case 'burnE': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.burn += a.n; const at = enemyXY(a.ti); addFloat(at.x, at.y - 12, T('st_burn') + ' ' + a.n, '#f08a2c'); } return R * 0.5; }
    case 'burnall': each((e, i) => { e.burn += a.n; const at = enemyXY(i); addFloat(at.x, at.y - 12, T('st_burn') + ' ' + a.n, '#f08a2c'); }); return R * 0.5;
    case 'sap': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.str -= a.n; const at = enemyXY(a.ti); addFloat(at.x, at.y, '-' + a.n + ' ' + T('st_str'), COL.blue); sfx('wave'); } return R; }
    case 'sapall': each((e, i) => { e.str -= a.n; const at = enemyXY(i); addFloat(at.x, at.y, '-' + a.n + ' ' + T('st_str'), COL.blue); }); sfx('wave'); return R;
    case 'strip': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.block = 0; e.str = Math.min(e.str, 0); e.charged = false; const at = enemyXY(a.ti); addFloat(at.x, at.y, '0', COL.blue); sfx('wave'); } return R; }
    case 'unblock': { const e = b.enemies[a.ti]; if (e && e.hp > 0 && e.block > 0) { e.block = 0; const at = enemyXY(a.ti); addFloat(at.x, at.y, '0', COL.blue); sfx('wave'); } return R * 0.5; }
    case 'unblockall': each(e => { e.block = 0; }); sfx('wave'); return R * 0.5;
    case 'cancel': { const e = b.enemies[a.ti]; if (e && e.hp > 0 && !intentIsAttack(e) && !trait(e, 'uncounterable')) { e.cancelled = true; const at = enemyXY(a.ti); addFloat(at.x, at.y, T('in_none'), COL.blue); sfx('wave'); } return R; }
    case 'stun': {
      const e = b.enemies[a.ti]; if (!e || e.hp <= 0) return 0;
      const at = enemyXY(a.ti);
      if (isBig(e) || trait(e, 'uncounterable')) { addFloat(at.x, at.y, T('immune'), COL.dim); sfx('deny'); }
      else { e.cancelled = true; addFloat(at.x, at.y, T('in_none'), COL.blue); sfx('wave'); }
      return R;
    }
    case 'stunall': each((e, i) => { if (trait(e, 'uncounterable') || (isBig(e) && !a.big)) return; e.cancelled = true; const at = enemyXY(i); addFloat(at.x, at.y, T('in_none'), COL.blue); }); sfx('wave'); return R;
    case 'mutiny': {
      const e = b.enemies[a.ti]; if (!e || e.hp <= 0) return 0;
      const at = enemyXY(a.ti);
      if (!intentIsAttack(e)) { addFloat(at.x, at.y, T('no_effect'), COL.dim); return R; }
      const dmg = intentDamage(e) * moveHits(curMove(e));
      e.cancelled = true; hurtEnemy(b, a.ti, dmg, true, true);
      return R;
    }
    case 'weaken': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.weak += a.n; sfx('wave'); } return R * 0.6; }
    case 'weakenall': each(e => { e.weak += a.n; }); sfx('wave'); return R * 0.6;
    case 'halve': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.halved = true; sfx('wave'); } return R * 0.6; }
    case 'banish': { const e = b.enemies[a.ti]; if (e && e.hp > 0 && !isBig(e)) { e.away = a.n; e.hidden = false; sfx('wave'); pickTarget(); } return R; }
    case 'landfall': {
      b.shake = 0.35; sfx('rumble'); addFloat(P.x, P.y - 30, T('kw_landfall') + '!', COL.green);
      fire(b, 'land');
      each((e, i) => {
        const at = enemyXY(i), t1 = trait(e, 'territory'), t2 = trait(e, 'landhurt'), t3 = trait(e, 'landburn'), t4 = trait(e, 'landmill');
        if (t1) { e.str += val(t1); addFloat(at.x, at.y - 12, '+' + val(t1) + ' ' + T('st_str'), COL.red); }
        if (t2) { run.hp = Math.max(0, run.hp - val(t2)); addFloat(P.x, P.y, '-' + val(t2), COL.red); sfx('hurt'); }
        if (t3) { b.burn += val(t3); addFloat(P.x, P.y - 14, T('st_burn') + ' ' + val(t3), '#f08a2c'); }
        if (t4) mill(b, val(t4));
        if (trait(e, 'sleeper') && e.mi === 0) { e.mi = 1; addFloat(at.x, at.y, T('woke'), COL.red); sfx('roar'); }
      });
      return R;
    }
    case 'pburn': {
      const n = b.burn; b.burn = Math.max(0, b.burn - 1);
      run.hp = Math.max(0, run.hp - n); addFloat(P.x, P.y, '-' + n + ' ' + T('st_burn'), '#f08a2c'); sfx('hurt');
      return R;
    }
    case 'eact': return enemyAct(b, a.ei);
    case 'ehit': {
      const e = b.enemies[a.ei]; if (!e || e.hp <= 0) return 0;
      e.lunge = 0.2;
      const m = a.m || {};
      let n = a.n;
      if (!m.pierce) { const soak = Math.min(b.block, n); b.block -= soak; n -= soak; }
      if (n > 0) {
        run.hp = Math.max(0, run.hp - n); b.hurtLast = true; b.shake = Math.max(b.shake, 0.18);
        addFloat(P.x, P.y, '-' + n, COL.red); sfx('hurt');
        if (m.steal) { e.hp = Math.min(e.maxHp, e.hp + n); b.enemyHealed = true; }
        if (m.burn) { b.burn += val(m.burn); addFloat(P.x, P.y - 14, T('st_burn') + ' ' + val(m.burn), '#f08a2c'); }
        if (m.mill) mill(b, val(m.mill));
        if (m.rob) { const g = Math.min(run.gold, val(m.rob)); run.gold -= g; if (g) addFloat(P.x, P.y - 26, '-' + g + ' ' + T('gold'), COL.gold); }
        if (m.jam) b.jam += val(m.jam);
        if (m.web) b.web += val(m.web);
        fire(b, 'hurt');
      } else { addFloat(P.x, P.y, T('block'), COL.teal); sfx('block'); }
      return tune.resolve_time * 1.4;
    }
    case 'eself': { const e = b.enemies[a.ei]; if (e && e.hp > 0) { e.hp = Math.max(0, e.hp - a.n); const at = enemyXY(a.ei); addFloat(at.x, at.y, '-' + a.n, COL.red); if (e.hp <= 0) fell(b, a.ei); } return R * 0.6; }
    case 'eend': {
      const e = b.enemies[a.ei];
      if (e && e.hp > 0) {
        if (!a.keepCharge) e.charged = false;
        e.weak = 0; e.halved = false;
        e.mi = trait(e, 'sleeper') ? 0 : e.mi + 1;
        const ar = trait(e, 'armor'), sw = trait(e, 'swarm');
        if (ar) e.block += Math.max(1, Math.round(val(ar) * e.scale));
        if (sw) e.str += val(sw);
      }
      return 0;
    }
    case 'turn': if (livingEnemies(b).length) beginPlayerTurn(); return 0;
  }
  return 0;
}

// One enemy takes its move. Its block from last turn is gone as it starts.
function enemyAct(b: Battle, ei: number) {
  const e = b.enemies[ei];
  if (!e || e.hp <= 0) return 0;
  const run = state.run, at = enemyXY(ei), P = playerXY();
  if (e.away > 0) { e.away--; if (e.away === 0) { addFloat(at.x, at.y, '!', COL.purple); sfx('wave'); } return tune.enemy_time * 0.5; }
  e.block = 0; e.hidden = false;
  if (e.burn > 0) {
    const n = e.burn; e.burn--; e.hp = Math.max(0, e.hp - n); e.flash = 0.18;
    addFloat(at.x, at.y, '-' + n, '#f08a2c'); sfx('hit', 0);
    if (e.hp <= 0 && fell(b, ei)) return tune.enemy_time;
  }
  const rg = trait(e, 'regen');
  if (rg && e.hp < e.maxHp) { const h = Math.min(val(rg), e.maxHp - e.hp); e.hp += h; b.enemyHealed = true; addFloat(at.x, at.y - 12, '+' + h, COL.green); }
  if (willCancel(b, e)) { e.cancelled = false; addFloat(at.x, at.y, T('in_none'), COL.blue); b.queue.unshift({ k: 'eend', ei }); return tune.enemy_time; }
  const m = curMove(e), sc = (v: Loose) => Math.max(1, Math.round(val(v) * e.scale));
  const front = [];
  switch (m.k) {
    case 'atk': {
      const hits = moveHits(m), dmg = intentDamage(e);
      for (let i = 0; i < hits; i++) front.push({ k: 'ehit', ei, n: dmg, m });
      if (m.self) front.push({ k: 'eself', ei, n: val(m.self) });
      break;
    }
    case 'swallow':
      if (b.powers.length) eatPower(b, at); else front.push({ k: 'ehit', ei, n: intentDamage(e), m: {} });
      break;
    case 'web': e.block += sc(m.b); b.web += 1; addFloat(P.x, P.y, T('st_web'), COL.paper); sfx('wave'); break;
    case 'lock': e.block += sc(m.blk); b.landLockNext = true; b.shake = 0.35; addFloat(P.x, P.y, LX(m.name), COL.purple); sfx('rumble'); break;
    case 'buff': {
      if (m.blk) e.block += sc(m.blk);
      if (m.str) { const n = val(m.str); for (const x of (m.all ? presentEnemies(b) : [e])) x.str += n; addFloat(at.x, at.y, '+' + n + ' ' + T('st_str'), COL.red); }
      if (m.heal) { const h = Math.min(sc(m.heal), e.maxHp - e.hp); if (h > 0) { e.hp += h; b.enemyHealed = true; addFloat(at.x, at.y - 12, '+' + h, COL.green); } }
      sfx('roar'); break;
    }
    case 'hex': {
      if (m.blk) e.block += sc(m.blk);
      if (m.str) { e.str += val(m.str); addFloat(at.x, at.y, '+' + val(m.str) + ' ' + T('st_str'), COL.red); }
      if (m.web) b.web += val(m.web);
      if (m.lock) { b.landLockNext = true; b.shake = 0.35; }
      if (m.jam) b.jam += val(m.jam);
      if (m.curse) { b.burn += val(m.curse); addFloat(P.x, P.y - 14, T('st_burn') + ' ' + val(m.curse), '#f08a2c'); }
      if (m.unquest) for (const p of b.powers) if (CARDS[p.id].quest && !p.done) p.n = 0;
      if (m.eat && b.powers.length) eatPower(b, at);
      if (m.rob) { const g = Math.min(run.gold, val(m.rob)); run.gold -= g; if (g) addFloat(P.x, P.y - 26, '-' + g + ' ' + T('gold'), COL.gold); }
      addFloat(P.x, P.y, LX(m.name), COL.purple); sfx(m.lock ? 'rumble' : 'wave'); break;
    }
    case 'summon':
      if (summon(b, m.kind, e)) { addFloat(at.x, at.y, LX(m.name), COL.red); sfx('roar'); }
      else { e.str += 1; addFloat(at.x, at.y, '+1 ' + T('st_str'), COL.red); }
      break;
    case 'charge': e.charged = true; addFloat(at.x, at.y, T('st_charged'), COL.red); sfx('roar'); break;
    case 'hide': e.hidden = true; if (m.str) e.str += val(m.str); addFloat(at.x, at.y, T('st_hidden'), COL.dim); sfx('wave'); break;
    case 'idle': break;
  }
  front.push({ k: 'eend', ei, keepCharge: m.k === 'charge' });
  for (let i = front.length - 1; i >= 0; i--) b.queue.unshift(front[i]);
  return tune.enemy_time;
}

export function updateBattle(dt: number) {
  const b = state.battle, run = state.run;
  b.t += dt;
  if (b.intro > 0) b.intro -= dt;
  if (b.shake > 0) b.shake = Math.max(0, b.shake - dt);
  if (b.msgT > 0) b.msgT -= dt;
  for (const e of b.enemies) { if (e.flash > 0) e.flash -= dt; if (e.lunge > 0) e.lunge -= dt; }
  if (b.fly) { b.fly.t += dt; if (b.fly.t > 0.16) b.fly = null; }
  for (const f of b.floats) f.t += dt;
  b.floats = b.floats.filter((f: Loose) => f.t < tune.float_time);
  if (b.phase === 'won' || b.phase === 'lost') {
    b.endT -= dt;
    if (b.endT <= 0) { if (b.phase === 'won') battleWon(); else finishRun(false); }
    return;
  }
  if (b.intro > 0) return;
  const fast = down.has('Space') || down.has('KeyE') ? 3 : 1; // hold to hurry a long chain or the enemy turn
  b.qt -= dt * fast;
  let guard = 0;
  while (b.qt <= 0 && b.queue.length && guard++ < 40) {
    const a = b.queue.shift();
    b.qt += resolve(a);
    if (run.hp <= 0) { b.phase = 'lost'; b.endT = 1.0; b.queue = []; sfx('lose'); return; }
    if (!livingEnemies(b).length) { b.phase = 'won'; b.endT = 0.9; b.queue = []; sfx('win'); return; }
  }
  if (!b.queue.length && b.qt < 0) b.qt = 0;
  if (b.phase === 'player') pickTarget();
}

// Weighted draw of n different cards from a pool.
export function pickCards(pool: string[], n: number, weights: Record<string, number>) {
  const left = pool.slice(), out = [];
  while (left.length && out.length < n) {
    let total = 0; for (const id of left) total += weights[cardRarity(id)] || 1;
    let r = rng() * total, pick = 0;
    for (let i = 0; i < left.length; i++) { r -= weights[cardRarity(left[i])] || 1; if (r <= 0) { pick = i; break; } }
    out.push(left.splice(pick, 1)[0]);
  }
  return out;
}
// What a won fight offers: the place's own land first when you do not have it, then cards of this continent.
function rewardCards(b: Battle) {
  const out = [], pl = PLACE_LAND[b.stop];
  if (pl && !state.run.deck.some((c: CardInPlay) => c.id === pl)) out.push(pl);
  const pool = (POOLS[b.cont] || []).filter(id => id !== pl);
  return out.concat(pickCards(pool, 3 - out.length, b.elite ? RARITY_WEIGHT_ELITE : RARITY_WEIGHT));
}

function battleWon() {
  const b = state.battle, run = state.run;
  run.fights++;
  if (b.boss) { run.won = true; state.battle = null; finishRun(true); return; }
  const gold = b.elite ? tune.gold_elite : tune.gold_fight + Math.floor(rng() * (tune.gold_var + 1));
  run.gold += gold;
  let heal = 0;
  if (b.elite) { heal = Math.min(tune.elite_heal, run.maxHp - run.hp); run.hp += heal; }
  state.reward = { gold, heal, cards: rewardCards(b), cont: b.cont, bg: b.bg, t: 0 };
  state.battle = null;
  state.screen = 'reward';
}
