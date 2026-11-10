// An expedition kept between visits: what a save holds and how one is read back. Nothing here
// touches the browser or the content: the page hands in the text it stored and what the game
// knows (save.ts). A save is a checkpoint, not a film: it is written when the expedition comes to
// a new screen (the map, a fight's first turn, a reward, a market, a camp, a happening), and a
// fight left midway begins again from its first turn with the chance it began with.
import type { Loose } from './types';

/** The shape of a save. Raise it when the shape changes: an older save is then not read. */
export const SAVE_VERSION = 1;

/** The screens an expedition is saved on. A trip in progress is not one: the map before it is. */
export const SAVE_SCREENS = ['map', 'battle', 'reward', 'shop', 'camp', 'event'];

/** The fight a save stands in: who is fought, where, and how the fight was begun (battle.ts, startBattle). */
export interface SavedFight {
  kinds: string[];
  cont: string;
  stop: string;
  bg: string | null;
  elite: boolean;
  boss: boolean;
  first: boolean;
}

/** What is written. */
export interface Saved {
  v: number;
  /** The content the save was written with (stampOf): a save from other content is not read. */
  stamp: string;
  /** The chance sequence at the checkpoint; in a fight, as it stood when the fight began. */
  seed: number;
  screen: string;
  /** Seconds of play so far. */
  t: number;
  run: Loose;
  fight: SavedFight | null;
  reward: Loose;
  shop: Loose;
  camp: Loose;
  event: Loose;
  pending: Loose;
}

/** What a save may name: the page answers from the world, the cards, the enemies and the happenings. */
export interface Known {
  stop(id: unknown): boolean;
  cont(id: unknown): boolean;
  card(id: unknown): boolean;
  enemy(id: unknown): boolean;
  happening(id: unknown): boolean;
}

/** A short mark of the content's ids, in any order: builds with the same stops, cards, enemies and happenings share it. */
export function stampOf(ids: string[]): string {
  let h = 5381;
  for (const id of ids.slice().sort()) {
    for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) ^ id.charCodeAt(i)) | 0;
    h = (Math.imul(h, 33) ^ 124) | 0; // a bar between ids: 'ab','c' is not 'a','bc'
  }
  return (h >>> 0).toString(36);
}

const GOT = ['heal', 'hurt', 'gain', 'pay', 'delay', 'haste', 'vigor'];
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const str = (x: unknown): boolean => typeof x === 'string';
const list = (x: unknown, ok: (v: unknown) => boolean): boolean => Array.isArray(x) && x.every(v => ok(v));

/** True when the save is whole, was written with this content, and names only what the game knows. */
export function soundSave(s: Loose, stamp: string, known: Known): boolean {
  if (!s || typeof s !== 'object' || s.v !== SAVE_VERSION || s.stamp !== stamp) return false;
  if (!SAVE_SCREENS.includes(s.screen) || !Number.isInteger(s.seed) || !num(s.t)) return false;
  const run = s.run;
  if (!run || typeof run !== 'object') return false;
  for (const k of ['hp', 'maxHp', 'gold', 'day', 'uid', 'fights']) if (!num(run[k])) return false;
  if (run.hp < 1 || run.hp > run.maxHp || run.gold < 0 || run.day < 0) return false;
  const card = (c: Loose): boolean => !!c && known.card(c.id) && num(c.uid);
  // what a way did: an amount of something, a card gained, or nothing (screens2.ts, takeWay)
  const got = (g: Loose): boolean => Array.isArray(g) && (g[0] === 'nothing' || (g[0] === 'card' ? known.card(g[1]) : GOT.includes(g[0]) && num(g[1])));
  if (!known.stop(run.at) || !list(run.visited, known.stop) || !list(run.route, known.stop) || !list(run.rough, known.stop)) return false;
  if (!list(run.conts, known.cont) || !list(run.seen, str) || !list(run.deck, card) || !list(run.lands, card)) return false;
  if (!run.enc || typeof run.enc !== 'object') return false;
  for (const id in run.enc) if (!known.stop(id) || !run.enc[id] || !list(run.enc[id].kinds, known.enemy)) return false;
  if (s.pending && !((s.pending.kind === 'shop' || s.pending.kind === 'camp') && known.stop(s.pending.stop))) return false;
  switch (s.screen) {
    case 'battle': return !!s.fight && list(s.fight.kinds, known.enemy) && s.fight.kinds.length > 0 && known.stop(s.fight.stop) && known.cont(s.fight.cont);
    case 'reward': return !!s.reward && list(s.reward.cards, known.card) && num(s.reward.gold) && known.cont(s.reward.cont);
    case 'shop': return !!s.shop && known.stop(s.shop.stop) && known.cont(s.shop.cont) && list(s.shop.items, (it: Loose) => !!it && known.card(it.id) && num(it.price));
    case 'camp': return !!s.camp && known.stop(s.camp.stop) && known.cont(s.camp.cont);
    case 'event': return !!s.event && known.happening(s.event.id) && known.stop(s.event.stop) && known.cont(s.event.cont) && list(s.event.got, got) && num(s.event.pick);
  }
  return true;
}

/** Reads a save's text: the save, or null when there is none or it is not one this game can go on from. */
export function readSave(text: string | null, stamp: string, known: Known): Saved | null {
  if (!text) return null;
  let s: Loose;
  try { s = JSON.parse(text); } catch { return null; }
  return soundSave(s, stamp, known) ? (s as Saved) : null;
}
