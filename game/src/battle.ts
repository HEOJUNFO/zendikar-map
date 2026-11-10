import './sprites2'; // load order, as in the one-shot's page: this module runs after sprites2
import { tune } from './config';
import { getSeed, rng } from './game/rng';
import { events, state } from './game/state';
import { down } from './input';
import { sfx } from './audio';
import { LX, T } from './text';
import { CARDS, COLOR_ORDER, FIRST_HAND, LAND_OF, POOLS, RARITY_WEIGHT, RARITY_WEIGHT_ELITE, cardName, cardRarity, family, val } from './cards';
import { PLACE_LAND } from './cards2';
import { ENEMIES, curMove, intentDamage, intentIsAttack, isBig, moveHits, prey, trait } from './enemies';
import { COL } from './art';
import { battleLayout, finishRun, incomingDamage } from './screens2';
import type { Battle, CardDef, CardInPlay, Enemy, Fx, Loose, Member, QueueStep, Run } from './game/types';
import * as rules from './game/rules';
// The fight. Lands make mana; mana of a card's colour pays for it; a card is used as the kind it
// is: a creature takes the field and from then on strikes or guards each turn, equipment and
// auras are worn, enchantments, artifacts and planeswalkers stay out, instants and sorceries
// happen once (an instant not played stays in hand; the rest of the hand is discarded). A card
// with a kicker may be played for more mana, for its stronger effect. An enemy that flies is
// stopped only by block and by guards who fly or reach. Enemies show their next move. A queue resolves every effect one at a time so the
// player can see why each number changed. A card's effects are data (fx: a list of [op, values]);
// runFx turns them into queued steps. Everything runs on the fixed step; the only chance is the
// seeded rng().

export function shuffle(a: Loose[]) { return rules.shuffle(a, rng); }
function livingEnemies(b: Battle) { return b.enemies.filter((e: Enemy) => e.hp > 0); }
function presentEnemies(b: Battle) { return b.enemies.filter((e: Enemy) => e.hp > 0 && e.away <= 0); }
export function targetable(e: Enemy) { return e.hp > 0 && e.away <= 0 && !e.hidden; }

// What the cards in play add up to: 'atk' on every strike, 'def' on every guard, 'spell' on every
// hit of a spell, 'atkPerGear' on every strike for each piece of equipment worn, 'lands' more
// land plays a turn, 'fly' when all of yours fly, 'noHex' when one of them cancels what is not an
// attack. Lasting cards and creatures on the field count; a quest's share counts once it is done.
export function passive(b: Battle, key: string) {
  let n = 0;
  const add = (s: Loose) => { if (s && s[key] !== undefined) n += s[key] === true ? 1 : val(s[key]); };
  for (const p of b.powers) { const d = CARDS[p.id]; add(d.passive); if (p.done && d.quest && d.quest.then) add(d.quest.then.passive); }
  for (const m of b.party) if (m.id) add(CARDS[m.id].passive);
  return n;
}
export function landLimit(b: Battle) { return rules.landLimit(false, b.landExtra + passive(b, 'lands')); }
// Will this enemy's intent come to nothing? Cancelled by a card, or not an attack while Iona is out.
export function willCancel(b: Battle, e: Enemy) {
  if (e.cancelled) return true;
  if (!b || trait(e, 'uncounterable') || intentIsAttack(e)) return false;
  return passive(b, 'noHex') > 0;
}

// ---- The party: the leader first (id null), then the creatures played this fight ----
function newMember(c: CardInPlay | null): Member {
  const d = c ? CARDS[c.id] : null;
  return { id: c ? c.id : null, uid: c ? c.uid : 0, stance: d && d.defender ? 'grd' : 'atk', fresh: !!d && !d.haste, gAtk: 0, gDef: 0, tAtk: 0, tDef: 0, gear: [], lunge: 0 };
}
function mate(b: Battle, uid: number): Member | undefined { return b.party.find((m: Member) => m.uid === uid); }
function allyCount(b: Battle) { return b.party.filter((m: Member) => m.id && CARDS[m.id].ally).length; }
function gearCount(b: Battle) { let n = 0; for (const m of b.party) for (const g of m.gear) if (CARDS[g.id].kind === 'equipment') n++; return n; }
// A member's own attack and guard: what it has, what it grew this fight, what it gained this turn, what it wears.
export function memberAtk(b: Battle, m: Member) {
  let n = (m.id ? val(CARDS[m.id].atk!) : tune.leader_atk) + m.gAtk + m.tAtk;
  for (const g of m.gear) { const s = CARDS[g.id].gear!; if (s.atk) n += val(s.atk); }
  return Math.max(0, n);
}
export function memberDef(b: Battle, m: Member) {
  let n = (m.id ? val(CARDS[m.id].def!) : tune.leader_def) + m.gDef + m.tDef;
  for (const g of m.gear) { const s = CARDS[g.id].gear!; if (s.def) n += val(s.def); }
  return Math.max(0, n + passive(b, 'def'));
}
// What one strike of this member deals: nothing when it has no attack of its own.
export function strikeDamage(b: Battle, m: Member) {
  const a = memberAtk(b, m);
  return a <= 0 ? 0 : a + b.bonus + passive(b, 'atk') + passive(b, 'atkPerGear') * gearCount(b);
}
// Does this one fly? It prints flying, wears wings, the turn gave flight, or a lasting card gives it to all.
export function memberFlies(b: Battle, m: Member) { return !!(m.id && CARDS[m.id].fly) || m.gear.some((g: CardInPlay) => CARDS[g.id].gear!.fly) || b.flightTurn || passive(b, 'fly') > 0; }
// Can its guard stop an enemy that flies? The leader's can; so can the guard of one that flies or has reach.
export function memberAir(b: Battle, m: Member) { return !m.id || memberFlies(b, m) || m.gear.some((g: CardInPlay) => CARDS[g.id].gear!.reach); }
// A landwalker passes where the fight is on its land: the continent whose basic land makes that colour.
function walksHere(b: Battle, color: string) { const land = CARDS[LAND_OF[b.cont]]; return !!land && land.color === color; }
// Do its strikes ignore block? One that flies, one that cannot be blocked, a landwalker on its land, and what gear gives.
export function memberPierce(b: Battle, m: Member) {
  const d = m.id ? CARDS[m.id] : null;
  return memberFlies(b, m) || b.pierceTurn || !!(d && (d.pierce || (d.walk && walksHere(b, d.walk)))) || m.gear.some((g: CardInPlay) => CARDS[g.id].gear!.pierce);
}
export function strikesOf(m: Member) {
  const d = m.id ? CARDS[m.id] : null;
  return m.gear.some((g: CardInPlay) => CARDS[g.id].gear!.twice) || (d && d.twiceIfGear && m.gear.some((g: CardInPlay) => CARDS[g.id].kind === 'equipment')) ? 2 : 1;
}
// Who strikes when the turn ends, and who guards. One that came this turn only guards, unless it has haste.
export function willStrike(b: Battle, m: Member) { return m.stance === 'atk' && !m.fresh && !(m.id && CARDS[m.id].defender) && memberAtk(b, m) > 0; }
export function willGuard(b: Battle, m: Member) { return !willStrike(b, m) || !!(m.id && CARDS[m.id].vigil); }
// What the guards add to the block when the turn ends: air stops any attack, ground only an enemy that does not fly.
export function guardPools(b: Battle) {
  let air = 0, ground = 0;
  for (const m of b.party) if (willGuard(b, m)) { if (memberAir(b, m)) air += memberDef(b, m); else ground += memberDef(b, m); }
  return { air, ground };
}
// Does this enemy fly now? Some always; one takes wing on a turn a land of yours came into play.
export function enemyFlies(b: Battle, e: Enemy) { return !!ENEMIES[e.kind].fly || (!!trait(e, 'landfly') && b.landfall); }
function enemyPierces(b: Battle, e: Enemy) { return !!curMove(e).pierce || (!!trait(e, 'landpierce') && b.landfall); }
// What the enemies' attacks would take from the leader as things stand: each hit in turn against the block and the guards.
export function incomingNet(b: Battle) {
  const g = guardPools(b);
  let block = b.block + g.air, ground = b.blockGround + g.ground, total = 0;
  for (const e of b.enemies) {
    if (!intentIsAttack(e)) continue;
    const dmg = intentDamage(e), pierce = enemyPierces(b, e), fly = enemyFlies(b, e);
    for (let i = 0; i < moveHits(curMove(e)); i++) {
      if (pierce) { total += dmg; continue; }
      const r = rules.soak(dmg, block, ground, fly); total += r.left; block = r.block; ground = r.ground;
    }
  }
  return total;
}
export function toggleStance(i: number) {
  const b = state.battle;
  if (!canAct()) return false;
  const m = b.party[i]; if (!m) return false;
  const why = m.fresh ? 'no_fresh' : m.id && CARDS[m.id].defender ? 'no_defender' : null;
  if (why) { b.msg = T(why); b.msgT = 1.6; sfx('deny'); return false; }
  m.stance = m.stance === 'atk' ? 'grd' : 'atk';
  sfx('card'); events.push({ t: state.t, stance: m.stance, who: i });
  return true;
}

// ---- Lands and mana ----
// The colours a land in play makes: its own, and what an aura on it adds.
export function landColor(l: CardInPlay) { return CARDS[l.id].color + (l.add || ''); }
function landRank(id: string) { const d = CARDS[id]; return (d.basic ? 0 : 10) + COLOR_ORDER.indexOf(d.color[0]); }
// The land pile as the tray shows it: one stack for each land, basics first.
export function landStacks(b: Battle) {
  const out: { id: string; n: number }[] = [];
  for (const l of b.landPile) { const s = out.find(o => o.id === l.id); if (s) s.n++; else out.push({ id: l.id, n: 1 }); }
  return out;
}
// Why no land can be played now (a text key), or null when one can.
export function landReason(b: Battle) {
  if (!b.landPile.length) return 'no_landsleft';
  if (b.landLock) return 'no_landlock';
  if (b.landPlayed >= landLimit(b)) return 'no_land';
  return null;
}
// How many of the other cards in hand want each colour: what paying for a card leaves alone when it can.
function manaDemand(b: Battle, skip: number) {
  const out: Record<string, number> = {};
  b.hand.forEach((c: CardInPlay, i: number) => { const d = CARDS[c.id]; if (i !== skip && d.cost > 0) for (const ch of d.color) out[ch] = (out[ch] || 0) + 1; });
  return out;
}
// The colours the expedition's lands make, and whether it can ever pay for a card.
export function ownedColors(run: Run) { const s = new Set<string>(); for (const l of run.lands) for (const ch of CARDS[l.id].color) s.add(ch); return s; }
export function castable(run: Run, id: string) {
  const d = CARDS[id];
  if (d.kind === 'land' || d.cost <= 0) return true;
  const own = ownedColors(run);
  return d.color.split('').every((ch: string) => own.has(ch));
}
// A land comes into play: it makes its mana at once unless it is slow, its effects happen, and it is landfall.
function enterLand(b: Battle, c: CardInPlay) {
  const d = CARDS[c.id];
  b.lands.push(c);
  if (!d.slow) b.mana.push(landColor(c));
  runFx(d.fx || [], b, -1, {});
  b.landfall = true; Q.push({ k: 'landfall' });
}
export function playLand(si: number) {
  const b = state.battle;
  if (!canAct()) return false;
  const s = landStacks(b)[si];
  const why = landReason(b);
  if (why || !s) { b.msg = T(why || 'no_landsleft'); b.msgT = 1.6; sfx('deny'); return false; }
  const c = b.landPile.splice(b.landPile.findIndex((l: CardInPlay) => l.id === s.id), 1)[0];
  b.landPlayed++;
  sfx('card'); events.push({ t: state.t, land: c.id });
  Q.push({ k: 'fly', id: c.id, ti: -1, uid: 0, land: true });
  enterLand(b, c);
  b.landSel = Math.max(0, Math.min(b.landSel, landStacks(b).length - 1));
  return true;
}
// The land a card fetches from the pile: the first that makes a colour no land in play makes, or just the first.
function fetchPick(b: Battle) {
  const have = new Set<string>(); for (const l of b.lands) for (const ch of landColor(l)) have.add(ch);
  const i = b.landPile.findIndex((l: CardInPlay) => CARDS[l.id].color.split('').some((ch: string) => !have.has(ch)));
  return i < 0 ? 0 : i;
}

// ---- What a card may queue ----
const Q = {
  push(a: QueueStep) { state.battle.queue.push(a); },
  hit(ti: number, n: number, o?: { pierce?: boolean }) { Q.push({ k: 'hit', ti, n, pierce: !!(o && o.pierce) }); },
  hitRandom(n: number) { Q.push({ k: 'hitr', n }); },
  draw(n: number) { for (let i = 0; i < n; i++) Q.push({ k: 'draw' }); },
};

// Turn a card's effects into queued steps. ti: the enemy aimed at. cx: {mi: the one of yours they
// belong to or were cast on, spell: they are an instant's or a sorcery's}.
function runFx(fx: Fx[], b: Battle, ti: number, cx: Loose) {
  cx = cx || {};
  const who = cx.mi !== undefined && cx.mi >= 0 && b.party[cx.mi] ? b.party[cx.mi].uid : -1;
  const sp = cx.spell ? passive(b, 'spell') : 0;
  for (const f of fx) {
    const op = f[0], n = f[1] !== undefined ? val(f[1]) : 0, m = f[2] !== undefined ? val(f[2]) : 0;
    switch (op) {
      case 'hit': case 'pierce': for (let i = 0; i < (m || 1); i++) Q.hit(ti, n + sp, { pierce: op === 'pierce' }); break;
      case 'hitall': Q.push({ k: 'hitall', n: n + sp }); break;
      case 'hitrand': for (let i = 0; i < (m || 1); i++) Q.hitRandom(n + sp); break;
      case 'hitPerLand': Q.hit(ti, n * Math.max(1, b.lands.length) + sp); break;
      case 'hitrandPerLand': Q.hitRandom(n * Math.max(1, b.lands.length) + sp); break;
      case 'hitPerHand': Q.hit(ti, n * b.hand.length + sp); break;
      case 'hitHalf': Q.push({ k: 'hithalf', ti, cap: n }); break;
      case 'hitrandPerAlly': Q.hitRandom(n * Math.max(1, allyCount(b))); break;
      case 'block': Q.push({ k: 'block', n }); break;
      case 'blockNext': Q.push({ k: 'blockNext', n }); break;
      case 'heal': Q.push({ k: 'heal', n }); break;
      case 'healPerLand': Q.push({ k: 'heal', n: n * b.lands.length }); break;
      case 'healPerAlly': Q.push({ k: 'heal', n: n * Math.max(1, allyCount(b)) }); break;
      case 'draw': Q.draw(n); break;
      case 'mana': Q.push({ k: 'mana', n }); break;
      case 'gold': Q.push({ k: 'gold', n }); break;
      case 'burn': Q.push({ k: 'burnE', ti, n }); break;
      case 'burnall': Q.push({ k: 'burnall', n }); break;
      case 'rot': Q.push({ k: 'rot', ti, n }); break;
      case 'grasp': Q.push({ k: 'grasp', ti }); break;
      case 'sap': Q.push({ k: 'sap', ti, n }); break;
      case 'sapall': Q.push({ k: 'sapall', n }); break;
      case 'strip': Q.push({ k: 'strip', ti }); break;
      case 'unblock': Q.push({ k: 'unblock', ti }); break;
      case 'unblockall': Q.push({ k: 'unblockall' }); break;
      case 'cancel': Q.push({ k: 'cancel', ti }); break;
      case 'stun': Q.push({ k: 'stun', ti }); break;
      case 'stunall': Q.push({ k: 'stunall', big: f[1] === 'big' }); break;
      case 'banish': Q.push({ k: 'banish', ti, n }); break;
      case 'bonus': Q.push({ k: 'bonus', n }); break;
      case 'piercing': Q.push({ k: 'piercing' }); break;
      case 'flight': Q.push({ k: 'flight' }); break;
      case 'pump': Q.push({ k: 'pump', uid: who, a: n, d: m }); break;
      case 'pumpAll': Q.push({ k: 'pumpAll', a: n, d: m }); break;
      case 'pumpPerLand': Q.push({ k: 'pump', uid: who, a: n * b.lands.length, d: n * b.lands.length }); break;
      case 'grow': Q.push({ k: 'grow', uid: who, a: n, d: m }); break;
      case 'growAll': Q.push({ k: 'growAll', a: n, d: m, allies: false }); break;
      case 'growAllies': Q.push({ k: 'growAll', a: n, d: m, allies: true }); break;
      case 'fetch': Q.push({ k: 'fetch' }); break;
      case 'extraLand': Q.push({ k: 'extraLand', n }); break;
      case 'seas': Q.push({ k: 'seas' }); break;
      case 'cleanse': Q.push({ k: 'cleanse' }); break;
      case 'discard': Q.push({ k: 'discard', n }); break;
      case 'selfhurt': Q.push({ k: 'selfhurt', n }); break;
      case 'retrieve': for (let i = 0; i < (n || 1); i++) Q.push({ k: 'retrieve' }); break;
      case 'fetchTrap': Q.push({ k: 'fetchTag', tag: 'trap' }); break;
      case 'fetchCreature': Q.push({ k: 'fetchTag', tag: 'creature' }); break;
      case 'fetchGear': Q.push({ k: 'fetchTag', tag: 'gear' }); break;
      case 'fetchDiscard': Q.push({ k: 'fetchDiscard', what: f[1] }); break;
      case 'reshuffle': Q.push({ k: 'reshuffle' }); break;
      case 'echo': Q.push({ k: 'echo', n: n || 1 }); break;
      case 'freeTraps': Q.push({ k: 'freeTraps' }); break;
      case 'mutiny': Q.push({ k: 'mutiny', ti }); break;
      case 'weaken': Q.push({ k: 'weaken', ti, n }); break;
      case 'weakenall': Q.push({ k: 'weakenall', n }); break;
      case 'halve': Q.push({ k: 'halve', ti }); break;
      case 'ifAttack': { const e = b.enemies[ti]; runFx(e && intentIsAttack(e) ? f[1] : f[2], b, ti, cx); break; }
    }
  }
}

// Something happened that cards in play may answer: land (a land came into play), turn, spell
// (an instant or a sorcery was played), creature (one took the field), ally (an Ally did), strike
// (one of yours struck), trap, kill, hurt (you lost HP to an enemy), unhurt (an enemy turn went
// by and you lost none), shuffle (the discard pile was shuffled into the draw pile).
// cx: {mi: whose strike it was, ti: the enemy struck}.
// Lasting cards hear everything. A creature and what it wears hear their own strike, and
// everything else that is not a strike.
function fire(b: Battle, ev: string, cx?: { mi?: number; ti?: number }) {
  const whose = cx && cx.mi !== undefined ? cx.mi : -1, ti = cx && cx.ti !== undefined ? cx.ti : -1;
  for (const p of b.powers.slice()) {
    const d = CARDS[p.id];
    if (d.on && d.on[ev]) runFx(d.on[ev], b, ti, {});
    const q = d.quest;
    if (!q) continue;
    if (p.done) { if (q.then && q.then.on && q.then.on[ev]) runFx(q.then.on[ev], b, ti, {}); continue; }
    if (q.on !== ev) continue;
    p.n = (p.n || 0) + 1;
    if (p.n < val(q.need)) continue;
    Q.push({ k: 'quest', id: p.id });
    if (q.reward) runFx(q.reward, b, -1, {});
    if (q.repeat) p.n = 0; else p.done = true;
  }
  b.party.forEach((m: Member, i: number) => {
    if (ev === 'strike' && i !== whose) return;
    const defs: CardDef[] = (m.id ? [CARDS[m.id]] : []).concat(m.gear.map((g: CardInPlay) => CARDS[g.id]));
    for (const d of defs) {
      if (d.on && d.on[ev]) runFx(d.on[ev], b, ti, { mi: i });
      if (ev === 'ally' && d.rally) runFx(d.rally, b, -1, { mi: i });
    }
  });
}

function makeEnemy(kind: string, scale: number, slot: number, hpScale?: number) {
  const def = ENEMIES[kind];
  const hp = Math.max(1, Math.round(val(def.hp) * tune.foe_hp * (hpScale === undefined ? scale : hpScale)));
  const e = { kind, hp, maxHp: hp, block: 0, str: 0, mi: 0, scale, charged: false, hidden: false, away: 0, cancelled: false, burn: 0, rot: 0, grasp: false, auras: [] as CardInPlay[],
    enraged: false, revived: false, weak: 0, halved: false, slot, flash: 0, lunge: 0 };
  const ar = trait(e, 'armor'); if (ar) e.block = Math.max(1, Math.round(val(ar) * scale));
  return e;
}

// Start a fight with these kinds. o: {cont, stop, bg, boss, elite, first}
export function startBattle(kinds: string[], o: Loose) {
  const run = state.run;
  const seed = getSeed(); // the chance as it stands now: a fight left midway begins again from here (save.ts)
  const scale = rules.enemyScale(tune.day_scale, run.day, o.first || o.boss); // the Roil Elemental is the same on any day
  const enemies = kinds.map((kind, i) => {
    const e = makeEnemy(kind, scale, i, o.first ? tune.first_fight_scale : scale);
    if (kinds.length > 1) e.mi = i % ENEMIES[kind].moves.length; // a group does not move in step
    return e;
  });
  let draw = shuffle(run.deck.map((c: CardInPlay) => ({ id: c.id, uid: c.uid })));
  if (o.first) { // the first minute: a hand that teaches a land, a creature, gear and a guard
    const top = [];
    for (const id of FIRST_HAND) { const i = draw.findIndex(c => c.id === id); if (i >= 0) top.push(draw.splice(i, 1)[0]); }
    draw = draw.concat(top.reverse()); // drawn from the end
  }
  // The lands: a few are in play as the fight opens, picked for the colours the deck wants; the rest wait in the pile.
  const pile: CardInPlay[] = run.lands.map((c: CardInPlay) => ({ id: c.id, uid: c.uid }))
    .sort((a: CardInPlay, z: CardInPlay) => landRank(a.id) - landRank(z.id) || a.id.localeCompare(z.id) || a.uid - z.uid);
  const want: Record<string, number> = {};
  for (const c of run.deck) { const d = CARDS[c.id]; if (d.cost > 0) for (const ch of d.color) want[ch] = (want[ch] || 0) + 1; }
  const camp = rules.campLands(pile.map(l => ({ colors: CARDS[l.id].color, basic: !!CARDS[l.id].basic })), want, tune.start_lands);
  state.battle = {
    kinds, cont: o.cont, stop: o.stop, bg: o.bg || null, boss: !!o.boss, elite: !!o.elite, first: !!o.first, seed,
    turn: 0, hand: [], draw, discard: [], powers: [], party: [newMember(null)],
    mana: [], lands: camp.map(i => pile[i]), landPile: pile.filter((l, i) => !camp.includes(i)), landSel: 0,
    block: 0, blockGround: 0, blockNext: 0, burn: 0, web: 0, jam: 0, bonus: 0, landPlayed: 0, landExtra: 0, landLock: false, landLockNext: false,
    landfall: false, hurtLast: false, pierceTurn: false, flightTurn: false, freeTraps: false, echo: 0,
    enemyHealed: false, enemyHealedLast: false,
    enemies, queue: [], qt: 0, phase: 'player', floats: [], shake: 0, msg: '', msgT: 0, chain: 0, endT: 0, t: 0, target: 0,
    intro: o.boss ? 1.6 : 0.5, fly: null,
  };
  state.screen = 'battle';
  beginPlayerTurn();
}

function beginPlayerTurn() {
  const b = state.battle;
  b.turn++; b.phase = 'player'; b.chain = 0;
  b.block = b.blockNext; b.blockNext = 0; b.blockGround = 0;
  b.mana = b.lands.map(landColor); // every land in play makes one mana; a web holds one land down
  for (let i = 0; i < b.web && b.mana.length; i++) b.mana.pop();
  b.web = 0;
  for (const m of b.party) { m.fresh = false; m.tAtk = 0; m.tDef = 0; }
  b.landPlayed = 0; b.landExtra = 0; b.landfall = false; b.bonus = 0; b.pierceTurn = false; b.flightTurn = false; b.freeTraps = false; b.echo = 0;
  b.landLock = b.landLockNext; b.landLockNext = false;
  b.enemyHealedLast = b.enemyHealed; b.enemyHealed = false;
  if (b.burn > 0) Q.push({ k: 'pburn' });
  if (b.turn > 1 && !b.hurtLast) fire(b, 'unhurt');
  fire(b, 'turn');
  Q.draw(rules.drawCount(tune.hand_size, b.jam, b.hand.length)); b.jam = 0; // an instant kept from last turn takes a place in the new hand
  pickTarget();
}
function pickTarget() { // keep the target on something that can be hit
  const b = state.battle;
  if (b.enemies[b.target] && targetable(b.enemies[b.target])) return;
  const i = b.enemies.findIndex(targetable);
  if (i >= 0) b.target = i;
}

// When a trap costs 0. With one enemy named: is it met for that one; with none: for any.
export const TRAPS: Record<string, (b: Battle, e?: Enemy) => Loose> = {
  attack: (b: Battle, e: Enemy) => intentIsAttack(e),
  quiet: (b: Battle, e: Enemy) => !e.cancelled && !intentIsAttack(e),
  loneAttack: (b: Battle, e: Enemy) => intentIsAttack(e) && presentEnemies(b).filter(intentIsAttack).length === 1,
  shielded: (b: Battle, e: Enemy) => e.block > 0,
  strong: (b: Battle, e: Enemy) => e.str > 0,
  anyQuiet: (b: Battle) => presentEnemies(b).some((e: Enemy) => !e.cancelled && !intentIsAttack(e)),
  hurtLast: (b: Battle) => b.hurtLast,
  crowd: (b: Battle) => presentEnemies(b).length >= 2,
  fullhand: (b: Battle) => b.hand.length - 1 >= tune.trap_fullhand,
  lowhp: () => state.run.hp * 2 <= state.run.maxHp,
  enemyHealed: (b: Battle) => b.enemyHealedLast,
  bigdiscard: (b: Battle) => b.discard.length >= tune.trap_bigdiscard,
  threat: (b: Battle) => incomingDamage(b) >= tune.trap_threat,
};
function trapMet(b: Battle, d: CardDef, ti?: number) {
  const fn = d.trap ? TRAPS[d.trap] : null;
  if (!fn) return false;
  if (fn.length < 2) return !!fn(b);
  if (ti !== undefined && ti !== null && ti >= 0 && b.enemies[ti] && targetable(b.enemies[ti])) return !!fn(b, b.enemies[ti]);
  return b.enemies.some((e: Enemy) => targetable(e) && fn(b, e));
}
// Who a card is played on in the way it is played: its kicker may aim where the card alone does not.
export function modeTarget(d: CardDef, kicked?: boolean) { return kicked && d.kick ? d.kick.target : d.target; }
// What it costs now: a trap whose test is met costs 0; a kicker costs its mana on top.
export function costOf(b: Battle, id: string, ti?: number, kicked?: boolean) {
  const d = CARDS[id];
  return (d.trap && (b.freeTraps || trapMet(b, d, ti)) ? 0 : d.cost) + (kicked && d.kick ? d.kick.cost : 0);
}
// Why this card cannot be played now (a text key), or null when it can. ti: the enemy, or the one
// of yours, it is played on. kicked: with its kicker paid.
export function playReason(b: Battle, id: string, ti?: number, kicked?: boolean) {
  const d = CARDS[id], fam = family(d), target = modeTarget(d, kicked), fx: Fx[] = kicked && d.kick ? d.kick.fx : d.fx;
  if (kicked && !d.kick) return 'no_kicker';
  if (fam === 'creature' && b.party.length - 1 >= tune.party_max) return 'no_room';
  if (target === 'enemy') {
    const e = b.enemies[ti!];
    if (!e || e.hp <= 0 || e.away > 0) return 'no_target';
    if (e.hidden) return 'no_hidden';
    if ((fam === 'spell' || fam === 'curse') && trait(e, 'shroud')) return 'no_shroud';
    if (d.notBig && isBig(e)) return 'no_big';
    if (fx.length && fx.every((f: Fx) => f[0] === 'cancel') && (trait(e, 'uncounterable') || e.cancelled || intentIsAttack(e))) return 'no_effect';
  }
  if (target === 'mate' && !b.party[ti!]) return 'no_mate';
  if (d.req === 'sacLand' && !b.lands.length) return 'no_sacland';
  const cost = costOf(b, id, ti, kicked);
  if (cost > b.mana.length) return 'no_mana';
  if (cost > 0 && !rules.payMana(b.mana, cost, d.color, {})) return 'no_color';
  return null;
}
export function canAct() { const b = state.battle; return !!b && b.phase === 'player' && b.queue.length === 0 && b.intro <= 0; }

// Play the card at hand[hi] on ti: an enemy for a card that aims, one of yours for a card that is
// worn or cast on one. kicked: its kicker is paid as well, and its stronger effects happen instead.
export function tryPlay(hi: number, ti?: number, kicked?: boolean) {
  const b = state.battle;
  if (!canAct()) return false;
  const c = b.hand[hi]; if (!c) return false;
  const d = CARDS[c.id], fam = family(d), target = modeTarget(d, kicked);
  if (target === 'enemy' && (ti === undefined || ti === null || ti < 0)) { pickTarget(); ti = b.target; }
  if (target === 'mate' && (ti === undefined || ti === null || ti < 0)) ti = 0; // the leader
  const why = playReason(b, c.id, ti, kicked);
  if (why) { b.msg = T(why, { c: d.color.split('').map((ch: string) => T('col_' + ch)).join('·') }); b.msgT = 1.6; sfx('deny'); return false; }
  const cost = costOf(b, c.id, ti, kicked);
  const paid = rules.payMana(b.mana, cost, cost > 0 ? d.color : '', manaDemand(b, hi))!;
  for (const i of paid.slice().sort((x, y) => y - x)) b.mana.splice(i, 1);
  b.hand.splice(hi, 1);
  const fx: Fx[] = kicked && d.kick ? d.kick.fx : d.fx; // kicked: the stronger effects, instead
  const cx: Loose = { mi: target === 'mate' ? ti : -1, spell: fam === 'spell' };
  sfx('card');
  events.push(kicked ? { t: state.t, play: c.id, kicked: true } : { t: state.t, play: c.id });
  Q.push({ k: 'fly', id: c.id, ti: target === 'enemy' ? ti : -1, uid: target === 'mate' ? b.party[ti!].uid : fam === 'creature' ? c.uid : 0 });
  if (d.req === 'sacLand') b.lands.pop(); // the land played last is given up; the mana it made this turn is already made
  if (fam === 'creature') { // it takes the field, and stays
    b.party.push(newMember(c)); cx.mi = b.party.length - 1;
    Q.push({ k: 'arrive', uid: c.uid });
    runFx(fx, b, ti!, cx);
    fire(b, 'creature', { mi: cx.mi });
    if (d.ally) fire(b, 'ally', { mi: cx.mi });
  } else if (fam === 'gear') { // one of yours wears it for the rest of the fight
    b.party[ti!].gear.push(c);
    if (d.gear!.haste) b.party[ti!].fresh = false; // it may strike this very turn
    Q.push({ k: 'arrive', uid: b.party[ti!].uid });
    runFx(fx, b, -1, cx);
  } else if (fam === 'lasting') { // it stays out, unless it is used up by what it does
    runFx(fx, b, ti!, cx);
    if (!d.used) Q.push({ k: 'power', id: c.id });
  } else if (fam === 'curse') { // it stays on the enemy, and comes back to the discard pile when that enemy falls
    runFx(fx, b, ti!, cx);
    if (d.target === 'enemy') b.enemies[ti!].auras.push(c);
  } else { // an instant or a sorcery: once, then the discard pile
    const reps = 1 + b.echo; b.echo = 0; // an echo repeats the next of them
    for (let r = 0; r < reps; r++) runFx(fx, b, ti!, cx);
    fire(b, 'spell');
    if (d.trap) fire(b, 'trap');
    if (d.recur) b.draw.push(c); else b.discard.push(c);
  }
  return true;
}

// The turn ends: an instant not played stays in hand and the rest of the hand is discarded;
// those set to attack strike the target one after another, those who guard add their guard to
// the block, and then the enemies move.
export function endTurn() {
  const b = state.battle;
  if (!canAct()) return false;
  const kept = b.hand.filter((c: CardInPlay) => CARDS[c.id].kind === 'instant');
  for (let i = b.hand.length - 1; i >= 0; i--) if (CARDS[b.hand[i].id].kind !== 'instant') b.discard.push(b.hand[i]);
  b.hand = kept;
  b.phase = 'enemy'; b.hurtLast = false; b.chain = 0; b.mana = [];
  for (const m of b.party) if (willStrike(b, m)) for (let k = 0; k < strikesOf(m); k++) Q.push({ k: 'strike', uid: m.uid });
  Q.push({ k: 'guard' });
  for (let i = 0; i < b.enemies.length; i++) Q.push({ k: 'eact', ei: i });
  Q.push({ k: 'turn' });
  sfx('end');
  return true;
}

function addFloat(x: number, y: number, text: string, col: string) { state.battle.floats.push({ x, y, text: String(text), col, t: 0 }); }
// Where a number rises from. It climbs about 22 px (float_time x 24), so it starts over the body:
// an enemy's stops under the move shown above its head, the leader's beside the incoming-damage line.
function enemyXY(i: number) { const p = battleLayout().enemies[i]; return p ? { x: p.x, y: p.y - p.h + 20 } : { x: 480, y: 120 }; }
function playerXY() { const L = battleLayout(); return { x: L.player.x + 58, y: L.player.y - 24 }; }
function mateXY(b: Battle, uid: number) { const i = b.party.findIndex((m: Member) => m.uid === uid), p = battleLayout().party[i]; return p && i > 0 ? { x: p.x, y: p.y - 50 } : playerXY(); }
function mill(b: Battle, n: number) { for (let i = 0; i < n && b.draw.length; i++) b.discard.push(b.draw.pop()); }
function toHand(b: Battle, c: CardInPlay) { if (b.hand.length >= 10) b.discard.push(c); else b.hand.push(c); }

// An enemy at 0 hp: it comes back once if it can. True when it stays down.
function fell(b: Battle, ei: number) {
  const e = b.enemies[ei], at = enemyXY(ei);
  if (trait(e, 'revive') && !e.revived) { e.revived = true; e.hp = Math.ceil(e.maxHp / 2); addFloat(at.x, at.y - 12, T('revived'), COL.purple); sfx('roar'); return false; }
  while (e.auras.length) b.discard.push(e.auras.pop()); // what was cast on it comes back
  sfx('kill'); b.shake = Math.max(b.shake, 0.2); events.push({ t: state.t, kill: e.kind }); fire(b, 'kill');
  return true;
}
// Hurt one enemy by n. Block soaks it unless the hit pierces.
function hurtEnemy(b: Battle, ti: number, n: number, pierce: boolean) {
  let e = b.enemies[ti];
  if (!e || e.hp <= 0 || e.away > 0) { // the target is gone: the hit finds another
    const opts = b.enemies.map((x: number, i: number) => i).filter((i: number) => b.enemies[i].hp > 0 && b.enemies[i].away <= 0);
    if (!opts.length) return;
    ti = opts[Math.floor(rng() * opts.length)]; e = b.enemies[ti];
  }
  let dmg = Math.max(0, n);
  const at = enemyXY(ti);
  if (!pierce && e.block > 0) {
    const soak = Math.min(e.block, dmg); e.block -= soak; dmg -= soak;
    if (soak > 0 && dmg === 0) { addFloat(at.x, at.y, T('block'), COL.teal); sfx('block'); return; }
  }
  e.hp = Math.max(0, e.hp - dmg); e.flash = 0.18;
  addFloat(at.x, at.y, '-' + dmg, COL.white);
  sfx('hit', b.chain++); // each hit of the turn a note higher: the chain starts again with the next turn
  const rage = trait(e, 'rage');
  if (rage && !e.enraged && e.hp > 0 && e.hp <= e.maxHp / 2) { e.enraged = true; e.str += val(rage); addFloat(at.x, at.y - 14, '+' + val(rage) + ' ' + T('st_str'), COL.red); sfx('roar'); }
  if (e.hp <= 0) fell(b, ti);
}
// An enemy destroys one of your creatures or lasting cards. A creature's card, and what it wore, go to the discard pile.
function eatOne(b: Battle, at: Loose) {
  const nc = b.party.length - 1, k = Math.floor(rng() * (nc + b.powers.length));
  let id: string;
  if (k < nc) {
    const m = b.party.splice(k + 1, 1)[0]; id = m.id;
    b.discard.push({ id: m.id, uid: m.uid }); for (const g of m.gear) b.discard.push(g);
  } else id = b.powers.splice(k - nc, 1)[0].id;
  addFloat(at.x, at.y, '-' + cardName(id).text, COL.purple); sfx('roar'); b.shake = 0.3;
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
    fire(b, 'shuffle');
  }
  toHand(b, b.draw.pop());
  return true;
}
function takeFrom(pile: CardInPlay[], test: (c: CardInPlay) => boolean) { for (let k = pile.length - 1; k >= 0; k--) if (test(pile[k])) return pile.splice(k, 1)[0]; return null; }
const TAGS: Record<string, (c: CardInPlay) => boolean> = { trap: (c: CardInPlay) => !!CARDS[c.id].trap, creature: (c: CardInPlay) => CARDS[c.id].kind === 'creature', gear: (c: CardInPlay) => CARDS[c.id].kind === 'equipment' };

// Resolve one queued step; returns how long it holds the screen, in seconds.
function resolve(a: QueueStep) {
  const b = state.battle, run = state.run, P = playerXY(), R = tune.resolve_time;
  const each = (fn: (e: Enemy, i: number) => void) => b.enemies.forEach((e: Enemy, i: number) => { if (e.hp > 0 && e.away <= 0) fn(e, i); });
  switch (a.k) {
    case 'fly': b.fly = { id: a.id, ti: a.ti, uid: a.uid, land: !!a.land, t: 0 }; return 0.14;
    case 'arrive': sfx('power'); return R * 0.5;
    case 'strike': { // one of yours strikes the target; a hidden enemy cannot be struck
      const m = mate(b, a.uid); if (!m) return 0;
      const dmg = strikeDamage(b, m); if (dmg <= 0) return 0;
      pickTarget();
      const ti = b.enemies[b.target] && targetable(b.enemies[b.target]) ? b.target : -1;
      m.lunge = 0.18;
      if (ti < 0) { const at = mateXY(b, a.uid); addFloat(at.x, at.y, T('miss'), COL.dim); return R * 0.6; }
      hurtEnemy(b, ti, dmg, memberPierce(b, m));
      fire(b, 'strike', { mi: b.party.indexOf(m), ti });
      return R;
    }
    case 'guard': { // the guards' share: what stops any attack, and what stops only an enemy on the ground
      const g = guardPools(b); if (g.air + g.ground <= 0) return 0;
      b.block += g.air; b.blockGround += g.ground; addFloat(P.x, P.y, '+' + (g.air + g.ground) + ' ' + T('block'), COL.teal); sfx('block'); return R;
    }
    case 'hit': hurtEnemy(b, a.ti, a.n, a.pierce); return R;
    case 'hitr': {
      const opts = b.enemies.map((x: number, i: number) => i).filter((i: number) => b.enemies[i].hp > 0 && b.enemies[i].away <= 0);
      if (!opts.length) return 0;
      hurtEnemy(b, opts[Math.floor(rng() * opts.length)], a.n, false); return R;
    }
    case 'hitall': each((e, i) => hurtEnemy(b, i, a.n, false)); return R;
    case 'hithalf': { const e = b.enemies[a.ti]; if (e && e.hp > 0) hurtEnemy(b, a.ti, Math.min(a.cap, Math.ceil(e.hp / 2)), true); return R; }
    case 'block': b.block += a.n; addFloat(P.x, P.y, '+' + a.n + ' ' + T('block'), COL.teal); sfx('block'); return R;
    case 'blockNext': b.blockNext += a.n; return 0;
    case 'draw': if (drawFromPile(b)) { sfx('draw'); return 0.06; } return 0;
    case 'mana': for (let i = 0; i < a.n; i++) b.mana.push('*'); addFloat(60, 236, '+' + a.n, COL.gold); sfx('energy'); return R * 0.6;
    case 'heal': {
      const h = Math.min(a.n, run.maxHp - run.hp); run.hp += h;
      if (h > 0) { addFloat(P.x, P.y - 12, '+' + h, COL.green); sfx('heal'); return R; }
      return 0;
    }
    case 'gold': run.gold = Math.max(0, run.gold + a.n); addFloat(P.x, P.y - 24, (a.n > 0 ? '+' : '') + a.n + ' ' + T('gold'), COL.gold); return R * 0.5;
    case 'power': b.powers.push({ id: a.id, n: 0, done: false }); sfx('power'); return R;
    case 'quest': addFloat(P.x, P.y - 40, T('questDone'), COL.gold); sfx('win'); return R;
    case 'pump': case 'grow': { // one of yours gains attack and guard: for this turn, or for the fight
      const m = mate(b, a.uid); if (!m || (!a.a && !a.d)) return 0;
      if (a.k === 'pump') { m.tAtk += a.a; m.tDef += a.d; } else { m.gAtk += a.a; m.gDef += a.d; }
      const at = mateXY(b, a.uid); addFloat(at.x, at.y, '+' + a.a + '/+' + a.d, COL.amberL); sfx('power'); return R * 0.6;
    }
    case 'pumpAll': { // each of yours, the leader too, gains attack and guard for this turn
      for (const m of b.party) { m.tAtk += a.a; m.tDef += a.d; }
      addFloat(P.x, P.y, '+' + a.a + '/+' + a.d, COL.amberL); sfx('power'); return R;
    }
    case 'growAll': { // every creature on the field grows; with allies: only the Allies
      let any = false;
      for (const m of b.party) if (m.id && (!a.allies || CARDS[m.id].ally)) { m.gAtk += a.a; m.gDef += a.d; any = true; const at = mateXY(b, m.uid); addFloat(at.x, at.y, '+' + a.a + '/+' + a.d, COL.amberL); }
      if (any) sfx('power');
      return any ? R * 0.6 : 0;
    }
    case 'fetch': { // a land goes from the pile into play
      if (!b.landPile.length) return 0;
      enterLand(b, b.landPile.splice(fetchPick(b), 1)[0]);
      b.landSel = Math.max(0, Math.min(b.landSel, landStacks(b).length - 1));
      sfx('draw'); return R * 0.6;
    }
    case 'seas': { // a land in play that makes no blue makes blue as well, from now on
      const l = b.lands.find((x: CardInPlay) => !landColor(x).includes('U'));
      if (l) { l.add = (l.add || '') + 'U'; sfx('wave'); }
      return R * 0.5;
    }
    case 'fetchTag': {
      const c = takeFrom(b.draw, TAGS[a.tag]) || takeFrom(b.discard, TAGS[a.tag]);
      if (!c) return 0;
      toHand(b, c); sfx('draw'); return R * 0.6;
    }
    case 'fetchDiscard': { const c = takeFrom(b.discard, TAGS[a.what]); if (!c) return 0; toHand(b, c); sfx('draw'); return R * 0.6; }
    case 'retrieve': { if (!b.discard.length) return 0; toHand(b, b.discard.splice(Math.floor(rng() * b.discard.length), 1)[0]); sfx('draw'); return R * 0.6; }
    case 'reshuffle': b.draw = shuffle(b.draw.concat(b.discard)); b.discard = []; fire(b, 'shuffle'); sfx('wave'); return R * 0.6;
    case 'discard': for (let i = 0; i < a.n && b.hand.length; i++) b.discard.push(b.hand.splice(Math.floor(rng() * b.hand.length), 1)[0]); return R * 0.6;
    case 'selfhurt': { const n = Math.min(a.n, run.hp - 1); if (n > 0) { run.hp -= n; addFloat(P.x, P.y, '-' + n, COL.red); sfx('hurt'); } return R * 0.6; }
    case 'extraLand': b.landExtra += a.n; return 0;
    case 'cleanse': b.burn = 0; b.web = 0; return 0;
    case 'bonus': b.bonus += a.n; addFloat(P.x, P.y, '+' + a.n, COL.amberL); sfx('power'); return R;
    case 'piercing': if (!b.pierceTurn) { b.pierceTurn = true; addFloat(P.x, P.y, T('pierceOn'), COL.amberL); sfx('power'); } return R * 0.6;
    case 'flight': if (!b.flightTurn) { b.flightTurn = true; addFloat(P.x, P.y, T('flightOn'), COL.amberL); sfx('power'); } return R * 0.6;
    case 'echo': b.echo += a.n; sfx('power'); return R * 0.6;
    case 'freeTraps': b.freeTraps = true; sfx('power'); return R * 0.6;
    case 'burnE': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.burn += a.n; const at = enemyXY(a.ti); addFloat(at.x, at.y - 12, T('st_burn') + ' ' + a.n, '#f08a2c'); } return R * 0.5; }
    case 'burnall': each((e, i) => { e.burn += a.n; const at = enemyXY(i); addFloat(at.x, at.y - 12, T('st_burn') + ' ' + a.n, '#f08a2c'); }); return R * 0.5;
    case 'rot': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.rot += a.n; const at = enemyXY(a.ti); addFloat(at.x, at.y - 12, T('st_rot') + ' ' + a.n, COL.purple); sfx('wave'); } return R * 0.5; }
    case 'grasp': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.grasp = true; const at = enemyXY(a.ti); addFloat(at.x, at.y - 12, T('st_grasp'), COL.blue); sfx('wave'); } return R * 0.5; }
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
      e.cancelled = true; hurtEnemy(b, a.ti, dmg, true);
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
      if (!a.pierce) { const r = rules.soak(n, b.block, b.blockGround, !!a.fly); n = r.left; b.block = r.block; b.blockGround = r.ground; }
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
  if (e.burn > 0 || e.rot > 0) { // burn fades by one a turn; rot does not fade
    const n = e.burn + e.rot; if (e.burn > 0) e.burn--;
    e.hp = Math.max(0, e.hp - n); e.flash = 0.18;
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
      for (let i = 0; i < hits; i++) front.push({ k: 'ehit', ei, n: dmg, m, pierce: enemyPierces(b, e), fly: enemyFlies(b, e) });
      if (m.self) front.push({ k: 'eself', ei, n: val(m.self) });
      break;
    }
    case 'swallow':
      if (prey(b)) eatOne(b, at); else front.push({ k: 'ehit', ei, n: intentDamage(e), m: {}, pierce: false, fly: enemyFlies(b, e) });
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
      if (m.eat && prey(b)) eatOne(b, at);
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
  for (const m of b.party) if (m.lunge > 0) m.lunge -= dt;
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

// Weighted draw of n different cards from a pool. lean: a card's weight is multiplied by what it gives.
export function pickCards(pool: string[], n: number, weights: Record<string, number>, lean?: (id: string) => number) {
  const left = pool.slice(), out = [];
  const w = (id: string) => (weights[cardRarity(id)] || 1) * (lean ? lean(id) : 1);
  while (left.length && out.length < n) {
    let total = 0; for (const id of left) total += w(id);
    let r = rng() * total, pick = 0;
    for (let i = 0; i < left.length; i++) { r -= w(left[i]); if (r <= 0) { pick = i; break; } }
    out.push(left.splice(pick, 1)[0]);
  }
  return out;
}
// A card whose colour the expedition's lands cannot make is offered less often.
export function colourLean(id: string) { return castable(state.run, id) ? 1 : tune.offcolor_weight; }
// What a won fight offers: the place's own land first when you do not have it, then cards of this continent.
function rewardCards(b: Battle) {
  const out = [], pl = PLACE_LAND[b.stop];
  if (pl && !state.run.lands.some((c: CardInPlay) => c.id === pl)) out.push(pl);
  const pool = (POOLS[b.cont] || []).filter(id => id !== pl);
  return out.concat(pickCards(pool, 3 - out.length, b.elite ? RARITY_WEIGHT_ELITE : RARITY_WEIGHT, colourLean));
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
