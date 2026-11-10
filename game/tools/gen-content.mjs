// Turns a set's authoring tables (tools/specs/<set>-cards.mjs, <set>-enemies.mjs) into the game's
// card and enemy modules, and gives every number they hold a tuning value in data/config.json.
// It checks the tables against the map project's data (data/lore.json) before it writes anything:
// every id is a card of the set, a Korean name is the game's own only where none was printed, a
// card sits on the continent the data gives it, every effect and trait is one the game knows,
// and every card of the set has exactly one role.
//
// Usage: node tools/gen-content.mjs <set> [--check] [--force]
//   <set>     zen (the only set written so far)
//   --check   write nothing: say whether the set's modules are what the tables give, and which
//             values in data/config.json were tuned since the tables were written (exit 1 when
//             a module differs or a value is missing)
//   --force   write a module even when the one there differs (it may hold edits made by hand)
//
// The numbers in the tables are the ones first written. data/config.json is where the values
// live from then on: a value that is already there is never changed by this tool.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const GAME = path.resolve(here, '..');
const set = process.argv[2];
const CHECK = process.argv.includes('--check'), FORCE = process.argv.includes('--force');
if (!set || set.startsWith('--')) { console.error('usage: node tools/gen-content.mjs <set> [--check] [--force]'); process.exit(2); }

// Where a set's modules are. ZEN's were the game's second batch of files, hence their names.
// A later set gets a pair of its own; how its encounters and place lands join ZEN's (ROSTER and
// PLACE_LAND are declared in ZEN's modules) is decided with that set, so only ZEN is written here.
const MODULES = { zen: { cards: 'src/cards2.ts', enemies: 'src/enemies2.ts', after: ['cards', 'enemies'] } };
if (!MODULES[set]) { console.error(`no modules are laid out for the set "${set}" yet: see the note on MODULES in this file`); process.exit(2); }

const { cards, placeLand } = await import(path.join(here, 'specs', `${set}-cards.mjs`));
const { enemies, roster } = await import(path.join(here, 'specs', `${set}-enemies.mjs`));
const read = f => fs.readFileSync(path.join(GAME, f), 'utf8');
const LORE = JSON.parse(read('data/lore.json'));
const configText = read('data/config.json');
const CONFIG = JSON.parse(configText);

// The cards and enemies written by hand (src/cards.ts, src/enemies.ts): their ids, read off the tables.
const idsIn = f => [...read(f).matchAll(/^  (?:'([a-z0-9-]+)'|([a-z0-9]+)): \{/gm)].map(m => m[1] || m[2]);
const OLD_CARDS = idsIn('src/cards.ts'), OLD_ENEMIES = idsIn('src/enemies.ts').filter(k => !enemies.some(e => e.id === k));

let errors = 0;
const err = m => { errors++; console.error('ERROR', m); };

const OPS = new Set(['hit', 'pierce', 'hitall', 'hitrand', 'hitPerLandPlayed', 'hitrandPerLand', 'hitPerHand', 'hitHalf', 'block', 'blockNext', 'heal', 'healPerLand', 'draw', 'energy', 'gold',
  'burn', 'burnall', 'sap', 'sapall', 'strip', 'unblock', 'unblockall', 'cancel', 'stun', 'stunall', 'banish', 'bonus', 'piercing', 'fetch', 'extraLand', 'cleanse', 'discard', 'selfhurt',
  'retrieve', 'fetchTrap', 'fetchAlly', 'fetchPower', 'fetchDiscard', 'reshuffle', 'echo', 'freeTraps', 'makeLand', 'mutiny', 'weaken', 'weakenall', 'halve', 'scoutN', 'ifAttack']);
const TARGET_OPS = new Set(['hit', 'pierce', 'hitPerLandPlayed', 'hitPerHand', 'hitHalf', 'burn', 'sap', 'strip', 'unblock', 'cancel', 'stun', 'banish', 'mutiny', 'weaken', 'halve', 'ifAttack']);
const TRAPS = new Set(['attack', 'quiet', 'shielded', 'strong', 'crowd', 'fullhand', 'lowhp', 'enemyHealed', 'bigdiscard', 'threat']);
const EVENTS = new Set(['land', 'turn', 'attack', 'skill', 'ally', 'kill', 'hurt', 'unhurt', 'trap']);
const NUM = new Set(['d', 'hits', 'burn', 'mill', 'rob', 'jam', 'web', 'self', 'blk', 'str', 'heal', 'curse']);
const FLAG = new Set(['pierce', 'steal', 'lock', 'unquest', 'eat', 'all']);
const TRAITS = new Set(['territory', 'landhurt', 'landburn', 'landmill', 'armor', 'regen', 'revive', 'swarm', 'bloodthirst', 'uncounterable', 'shroud', 'sleeper', 'rage']);
const short = id => id.replace(/[^a-z0-9]+/g, '_');
const needsTarget = fx => fx.some(f => TARGET_OPS.has(f[0]));

// One pass over the tables. `taken`: the value names that are not this set's to give (a name
// already taken gets a 2, a 3 ...). Returns the modules' tables and the values, in order.
function build(taken, report) {
  const cfg = [], used = new Set(taken);
  const key = (base, name, v, kind) => {
    let k = `${base}_${name}`, i = 2;
    while (used.has(k)) k = `${base}_${name}${i++}`;
    used.add(k); cfg.push({ k, v, kind }); return k;
  };
  const e = report ? err : () => {};
  const fxKeys = (base, fx, pre, where) => fx.map(f => {
    if (!OPS.has(f[0])) e(`${where}: unknown op ${f[0]}`);
    return f.map((a, i) => i === 0 ? a : typeof a === 'number' ? key(base, pre + f[0].toLowerCase() + (i > 1 ? '_times' : ''), a) : Array.isArray(a) ? fxKeys(base, a, pre, where) : a);
  });

  const cardOut = {}, pools = {};
  for (const c of cards) {
    const lore = LORE[c.id];
    if (!lore) { e(`${c.id}: not in the map project's data for this set`); continue; }
    if (lore.set !== set) e(`${c.id}: a card of ${lore.set}, not ${set}`);
    if (cardOut[c.id]) e(`${c.id}: twice`);
    if (lore.ko && c.ko) e(`${c.id}: has an official Korean name (${lore.ko}); drop the game's own`);
    if (!lore.ko && !c.ko) e(`${c.id}: needs a Korean name`);
    if (lore.cont && lore.cont !== c.cont) e(`${c.id}: continent ${c.cont}, but the data says ${lore.cont}`);
    if ((c.type === 'land') !== !!lore.land) e(`${c.id}: land in one place and not the other`);
    const b = short(c.id), x = c.x, d = { cont: c.cont, type: c.type, cost: c.cost, target: c.target };
    if (c.ko) d.ko = c.ko;
    if (x.ally) d.ally = true;
    d.fx = fxKeys(b, c.fx, '', c.id);
    const all = c.fx.concat(x.lf || [], x.lfAdd || []);
    if (needsTarget(all) !== (c.target === 'enemy')) e(`${c.id}: target ${c.target} does not match its effects`);
    if (x.rally) d.rally = [x.rally[0], key(b, 'rally', x.rally[1])];
    if (x.lf) d.lf = fxKeys(b, x.lf, 'lf_', c.id);
    if (x.lfAdd) d.lfAdd = fxKeys(b, x.lfAdd, 'lf_', c.id);
    if (x.trap) { if (!TRAPS.has(x.trap)) e(`${c.id}: unknown trap ${x.trap}`); d.trap = x.trap; }
    const hooks = (o, pre) => { const out = {}; for (const ev in o) { if (!EVENTS.has(ev)) e(`${c.id}: unknown event ${ev}`); if (needsTarget(o[ev])) e(`${c.id}: a hook cannot aim`); out[ev] = fxKeys(b, o[ev], `${pre}${ev}_`, c.id); } return out; };
    const pas = (p, pre) => { const o = {}; for (const k in p) o[k] = p[k] === true ? true : key(b, pre + k.toLowerCase(), p[k]); return o; };
    if (x.on) d.on = hooks(x.on, 'on_');
    if (x.passive) d.passive = pas(x.passive, 'passive_');
    if (x.quest) {
      const q = x.quest;
      if (!EVENTS.has(q.on)) e(`${c.id}: unknown quest event ${q.on}`);
      d.quest = { on: q.on, need: key(b, 'quest_need', q.need) };
      if (q.reward) { if (needsTarget(q.reward)) e(`${c.id}: a reward cannot aim`); d.quest.reward = fxKeys(b, q.reward, 'reward_', c.id); }
      if (q.repeat) d.quest.repeat = true;
      if (q.then) { d.quest.then = {}; if (q.then.passive) d.quest.then.passive = pas(q.then.passive, 'then_'); if (q.then.on) d.quest.then.on = hooks(q.then.on, 'then_'); }
      if (c.type !== 'power') e(`${c.id}: a quest is a lasting card`);
    }
    if (x.recur) d.recur = true;
    if (x.req) d.req = x.req;
    if (x.notBig) d.notBig = true;
    if (x.timesIfPower) d.timesIfPower = key(b, 'times_with_lasting', x.timesIfPower);
    d.lore = c.lore;
    cardOut[c.id] = d;
    (pools[c.cont] = pools[c.cont] || []).push(c.id);
  }

  const enemyOut = {};
  for (const en of enemies) {
    const lore = LORE[en.id];
    if (!lore) { e(`${en.id}: not in the map project's data for this set`); continue; }
    if (lore.set !== set) e(`${en.id}: a card of ${lore.set}, not ${set}`);
    if (lore.ko && en.ko) e(`${en.id}: has an official Korean name (${lore.ko})`);
    if (!lore.ko && !en.ko) e(`${en.id}: needs a Korean name`);
    if (lore.cont && lore.cont !== en.cont) e(`${en.id}: continent ${en.cont}, but the data says ${lore.cont}`);
    const b = short(en.id), d = { cont: en.cont, hp: key(b, 'hp', en.hp, 'hp') };
    if (en.ko) d.ko = en.ko;
    if (en.flags.fly) d.fly = true;
    if (en.flags.big) d.big = true;
    if (en.flags.elite) d.elite = true;
    const tr = {};
    for (const t in en.traits) { if (!TRAITS.has(t)) e(`${en.id}: unknown trait ${t}`); tr[t] = (t === 'revive' || t === 'uncounterable' || t === 'shroud' || t === 'sleeper') ? true : key(b, t, en.traits[t]); }
    if (Object.keys(tr).length) d.traits = tr;
    d.moves = en.moves.map((m, i) => {
      const o = { k: m[0] };
      for (const f in m[1]) {
        const v = m[1][f];
        if (f === 'kind') { o.kind = v; continue; }
        if (NUM.has(f)) o[f] = key(b, `m${i}_${f}`, v);
        else if (FLAG.has(f)) o[f] = true;
        else e(`${en.id}: unknown move field ${f}`);
      }
      o.name = { ko: m[2], en: m[3] };
      return o;
    });
    d.lore = en.lore;
    enemyOut[en.id] = d;
  }
  return { cfg, cardOut, pools, enemyOut };
}

// The names this set gives are found in two passes: first as if nothing were taken, then with
// every other name in data/config.json taken, until the two agree.
let mine = new Set(build([], false).cfg.map(c => c.k)), built;
for (let i = 0; i < 5; i++) {
  built = build(Object.keys(CONFIG).filter(k => !mine.has(k)), false);
  const now = new Set(built.cfg.map(c => c.k));
  if (now.size === mine.size && [...now].every(k => mine.has(k))) break;
  mine = now;
}
const { cfg, cardOut, pools, enemyOut } = build(Object.keys(CONFIG).filter(k => !mine.has(k)), true);

// ---- every card of the set has exactly one role; every enemy can be met ----
for (const id in enemyOut) for (const m of enemyOut[id].moves) if (m.k === 'summon' && !enemyOut[m.kind] && !OLD_ENEMIES.includes(m.kind)) err(`${id}: summons an unknown ${m.kind}`);
const roles = new Map();
const put = (id, role) => { if (roles.has(id)) err(`${id}: both ${roles.get(id)} and ${role}`); roles.set(id, role); };
for (const id of OLD_CARDS) if (LORE[id]) put(id, 'card (written by hand)');
for (const id of OLD_ENEMIES) put(id, 'enemy (written by hand)');
for (const id in cardOut) put(id, cardOut[id].type === 'land' ? 'land' : 'card');
for (const id in enemyOut) put(id, 'enemy');
for (const id in LORE) if (LORE[id].set === set && !roles.has(id)) err(`${id}: no role`);
const allEnemies = new Set(OLD_ENEMIES.concat(Object.keys(enemyOut)));
const met = new Set(['roil-elemental']);
for (const stop in roster) { const r = roster[stop]; for (const g of r.wild || []) for (const k of g) { if (!allEnemies.has(k)) err(`roster ${stop}: unknown ${k}`); met.add(k); } for (const k of r.elite || []) { if (!allEnemies.has(k)) err(`roster ${stop}: unknown ${k}`); met.add(k); } }
for (const id in enemyOut) for (const m of enemyOut[id].moves) if (m.k === 'summon') met.add(m.kind);
for (const k of allEnemies) if (!met.has(k)) err(`${k}: an enemy nobody can meet`);
for (const s in placeLand) if (!cardOut[placeLand[s]] || cardOut[placeLand[s]].type !== 'land') err(`placeLand ${s}: ${placeLand[s]} is not a land`);
if (errors) { console.error(`${errors} error(s); nothing written`); process.exit(1); }

// ---- the modules' text ----
const row = (id, d) => `  ${JSON.stringify(id)}: ${JSON.stringify(d)},`;
const order = ['tazeem', 'sejiri', 'akoum', 'guul-draz', 'bala-ged', 'murasa', 'ondu'];
const M = MODULES[set];
let co = `import './${M.after[0]}'; // load order, as in the one-shot's page: this module runs after ${M.after[0]}
import { CARDS, POOLS } from './cards';
// The rest of the ZEN set as cards: one card a line. Names, numbers in the set and places come
// from data/lore.json; what a card does is this game's own design. Each number is a data/config.json
// value named here by its key. First written out from an authoring table; edit here from now on.
// fx: the effects, in order. lf / lfAdd: with landfall, instead / as well. rally: more for each
// ally card played earlier this fight. trap: when it costs 0. on: hooks of a lasting card.
// passive: what a lasting card changes while it is out. quest: marks, and what they earn.

Object.assign(CARDS, {
`;
for (const cont of order) {
  co += `  // ---- ${cont} ----\n`;
  for (const id in cardOut) if (cardOut[id].cont === cont && cardOut[id].type !== 'land') co += row(id, cardOut[id]) + '\n';
}
co += '  // ---- lands ----\n';
for (const id in cardOut) if (cardOut[id].type === 'land') co += row(id, cardOut[id]) + '\n';
co += '});\n\n// Each continent gives the cards the map project places there.\n';
co += `(function () {\n  const more: Record<string, string[]> = ${JSON.stringify(pools)};\n  for (const c in more) POOLS[c] = (POOLS[c] || []).concat(more[c]);\n})();\n\n`;
co += `// The land a stop always offers: in its rewards, or in its market.\nexport const PLACE_LAND: Record<string, string> = ${JSON.stringify(placeLand)};\n`;

let eo = `import './${M.after[1]}'; // load order, as in the one-shot's page: this module runs after ${M.after[1]}
import { ENEMIES, FIGURE_ORDER } from './enemies';
// The rest of the ZEN set's hostile creatures: one enemy a line, then who is met where. Names
// and numbers in the set come from data/lore.json; the moves are this game's own design. Each
// number is a data/config.json value named here by its key. First written out from an authoring
// table; edit here from now on.

Object.assign(ENEMIES, {
`;
for (const cont of order) {
  eo += `  // ---- ${cont} ----\n`;
  for (const id in enemyOut) if (enemyOut[id].cont === cont) eo += row(id, enemyOut[id]) + '\n';
}
eo += `});

// Who can be met where. wild: groups (the first is the place's own, met when it is a run's first
// fight); elite: great beasts; guard: a town or camp that may be watched this run.
/** Who is met at a stop: groups in the wilds, great beasts, whether the way in is watched, a backdrop of its own. */
export interface Encounters { wild?: string[][]; elite?: string[]; guard?: boolean; bg?: string }
export const ROSTER: Record<string, Encounters> = {
${Object.keys(roster).map(s => `  ${JSON.stringify(s)}: ${JSON.stringify(roster[s])},`).join('\n')}
};
FIGURE_ORDER.push(${Object.keys(enemyOut).map(k => JSON.stringify(k)).join(', ')});
`;

// ---- the values ----
const entry = ({ k, v, kind }) => `  ${JSON.stringify(k)}: { "value": ${v}, "min": ${kind === 'hp' ? 1 : 0}, "max": ${kind === 'hp' ? v * 4 : Math.max(10, v * 3)}, "step": 1 }`;
const missing = cfg.filter(c => CONFIG[c.k] === undefined);
const tuned = cfg.filter(c => CONFIG[c.k] !== undefined && CONFIG[c.k].value !== c.v);

const by = {}; for (const r of roles.values()) by[r] = (by[r] || 0) + 1;
console.log(`${set}: roles ${JSON.stringify(by)}, ${roles.size} of ${Object.values(LORE).filter(l => l.set === set).length} cards of the set`);
console.log(`cards ${Object.keys(cardOut).length} · enemies ${Object.keys(enemyOut).length} · values ${cfg.length} (missing from data/config.json: ${missing.length}; tuned since the tables were written: ${tuned.length})`);
for (const c of tuned) console.log(`  tuned  ${c.k}: ${c.v} in the table, ${CONFIG[c.k].value} now`);

let differs = 0;
for (const [file, text] of [[M.cards, co], [M.enemies, eo]]) {
  const p = path.join(GAME, file), was = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (was === text) { console.log(`${file}: the same as the tables give`); continue; }
  if (CHECK || (was !== null && !FORCE)) {
    differs++;
    console.log(`${file}: ${was === null ? 'not there' : 'DIFFERS from what the tables give'}${CHECK || was === null ? '' : ' (it may hold edits made by hand: --force writes over it)'}`);
    if (was !== null) { const a = was.split('\n'), b = text.split('\n'); for (let i = 0, n = 0; i < Math.max(a.length, b.length) && n < 5; i++) if (a[i] !== b[i]) { n++; console.log(`  line ${i + 1}\n    there:  ${(a[i] ?? '(none)').slice(0, 150)}\n    tables: ${(b[i] ?? '(none)').slice(0, 150)}`); } }
    if (!CHECK && was === null) { fs.writeFileSync(p, text); console.log(`${file}: written`); differs--; }
    continue;
  }
  fs.writeFileSync(p, text); console.log(`${file}: written`);
}
if (CHECK) process.exit(differs || missing.length ? 1 : 0);
if (differs) process.exit(1);
if (missing.length) {
  // new values go at the end of data/config.json, one a line like the rest
  const body = configText.replace(/\s*\}\s*$/, '');
  fs.writeFileSync(path.join(GAME, 'data/config.json'), body + ',\n' + missing.map(entry).join(',\n') + '\n}\n');
  console.log(`data/config.json: ${missing.length} value(s) added`);
}
