import './screens2'; // load order: this module runs after the screens
import { WORLD } from './game/data';
import { getSeed, setSeed } from './game/rng';
import { scene, setState, state } from './game/state';
import { manual, params } from './hook';
import { CARDS } from './cards';
import { ENEMIES } from './enemies';
import { HAPPENINGS } from './events';
import { startBattle } from './battle';
import { SAVE_VERSION, readSave, stampOf, type Known, type Saved } from './game/save';
import type { Loose } from './game/types';
// The expedition kept in this browser, so a page closed and opened again goes on from where it
// stood. It is written by itself at every checkpoint: when the expedition comes to the map, to a
// fight's first turn, a reward, a market, a camp or a happening, and when something is bought or
// chosen there. A fight left midway begins again from its first turn, with the same chance, hp and
// gold it began with. An expedition that has ended is forgotten: a new one begins from the
// starting deck. What a save holds and how one is checked is in game/save.ts.

const KEY = 'zx-save', COUNT = 'zx-runs';
function get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function put(key: string, text: string): boolean { try { localStorage.setItem(key, text); return true; } catch { return false; } }
function drop(key: string): void { try { localStorage.removeItem(key); } catch { /* nothing was kept */ } }

// A save is read only by the content that wrote it: the same stops (each of the same kind, on the
// same continent), cards, enemies and happenings.
const STAMP = stampOf(WORLD.stops.map(s => s.id + ':' + s.cls + ':' + s.cont).concat(Object.keys(CARDS), Object.keys(ENEMIES), HAPPENINGS.map(h => h.id)));
const has = (table: object, id: unknown): boolean => typeof id === 'string' && Object.prototype.hasOwnProperty.call(table, id);
const known: Known = {
  stop: id => WORLD.stops.some(s => s.id === id),
  cont: id => has(WORLD.views, id),
  card: id => has(CARDS, id),
  enemy: id => has(ENEMIES, id),
  happening: id => HAPPENINGS.some(h => h.id === id),
};

/** True when this browser lets the game keep things (a window with storage shut off does not). Reading is enough to know: nothing is written as the page opens. */
export const canKeep = ((): boolean => { try { localStorage.getItem(KEY); return true; } catch { return false; } })();

/** The expedition kept in this browser, or null. unread: something is kept, and this game cannot go on from it. */
export function kept(): { save: Saved | null; unread: boolean } {
  const text = get(KEY), save = readSave(text, STAMP, known);
  return { save, unread: !!text && !save };
}

// What the expedition has come to: when this changes, there is a new checkpoint to write. A
// fight has one, its first turn: nothing in it changes while the fight goes on.
function markOf(): string {
  const run = state.run, own = run.deck.length + '/' + run.lands.length + '/' + run.gold + '/' + run.hp + '/' + run.maxHp;
  switch (state.screen) {
    case 'battle': return 'battle|' + run.fights + '|' + state.battle.stop + '|' + state.battle.seed;
    case 'reward': return 'reward|' + run.fights;
    case 'shop': return 'shop|' + state.shop.stop + '|' + own + '|' + state.shop.removed + '|' + state.shop.items.map((it: Loose) => (it.sold ? 1 : 0)).join('');
    case 'camp': return 'camp|' + state.camp.stop + '|' + own;
    case 'event': return 'event|' + state.event.id + '|' + state.event.pick;
    default: return 'map|' + run.at + '|' + run.day + '|' + own; // the world map (sea) is the map looked at from farther off
  }
}
function write(): void {
  const b = state.battle, fight = state.screen === 'battle';
  const save: Saved = {
    v: SAVE_VERSION, stamp: STAMP, seed: fight ? b.seed : getSeed(), screen: state.screen === 'sea' ? 'map' : state.screen, t: state.t, run: state.run,
    fight: fight ? { kinds: b.kinds, cont: b.cont, stop: b.stop, bg: b.bg, elite: b.elite, boss: b.boss, first: b.first } : null,
    reward: state.reward, shop: state.shop, camp: state.camp, event: state.event, pending: state.pending,
  };
  put(KEY, JSON.stringify(save));
}

let last = '';
/** After every step: writes the expedition when it has come to a new checkpoint, and forgets it once it has ended. */
export function keep(): void {
  if (scene === 'over' || scene === 'results') { if (last !== 'ended') { last = 'ended'; drop(KEY); } return; }
  // A trip in progress is not a checkpoint: the map it left is. Nor is a fight that has just been taken away.
  if (scene !== 'play' || state.screen === 'travel' || (state.screen === 'battle' && !state.battle)) return;
  const mark = markOf();
  if (mark === last) return;
  last = mark; write();
}

/** Puts a kept expedition back in play. A fight begins again from its first turn, with the chance it began with. */
export function resume(s: Saved): void {
  setState({ t: s.t, score: 0, gained: '', won: false, screen: s.screen, run: s.run, battle: null, reward: s.reward, shop: s.shop, camp: s.camp, travel: null, banner: null, pending: s.pending, event: s.event });
  setSeed(s.seed);
  if (s.fight) startBattle(s.fight.kinds, s.fight);
  last = markOf(); // what is on screen is what is kept
}

/** Forgets the kept expedition: a new one is beginning in its place. */
export function forget(): void { drop(KEY); last = ''; }

// How many expeditions this browser has begun: each one begins from another seed, so a page opened
// again does not begin with a world already seen. A check (?manual=1) and a seed given in the
// address begin from 0 every time: they are there to see the same worlds again.
const counted = !manual && !params.get('seed');
export function runsBegun(): number { const n = counted ? Number(get(COUNT)) : 0; return Number.isInteger(n) && n > 0 ? n : 0; }
export function countRuns(n: number): void { if (counted) put(COUNT, String(n)); }
