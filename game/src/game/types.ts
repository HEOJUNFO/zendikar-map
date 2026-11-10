// The game's shared types. Nothing here touches the browser.

/**
 * An object the code builds field by field, kind by kind: a run, a fight, an enemy in a fight, a
 * card's or an enemy's definition, an effect, a queued step of a fight. Typing them is still to
 * do; production/qa/evidence/grow-zendikar-expedition/grow.md names each kind that uses this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;

/** One expedition's state; window.game.state reports it to the checks. */
export interface State {
  /** Seconds of play. */
  t: number;
  score: number;
  /** What this run gained or learned: the line the ending shows. */
  gained: string;
  won: boolean;
  /** What the play scene shows: map, travel, battle, reward, shop or camp. */
  screen: string;
  /** The expedition: hp, gold, day, where it stands, the deck (screens.ts, newRun). */
  run: Loose;
  /** The fight in progress, or null (battle.ts, startBattle). */
  battle: Loose;
  /** The cards offered after a fight, or null. */
  reward: Loose;
  /** A town's market, or null. */
  shop: Loose;
  /** A camp's choice, or null. */
  camp: Loose;
  /** The trip being drawn, or null. */
  travel: Loose;
  /** The line shown on arrival, or null. */
  banner: Loose;
  /** What follows a guard fight at this stop, or null. */
  pending: Loose;
}

/** The two languages every word has. */
export type Lang = 'ko' | 'en';

/** A word or a name in both languages; ko is null where no Korean name exists. */
export interface Words {
  ko?: string | null;
  en: string;
}

/** A name ready to draw. star: this game's own Korean translation, not an official printed name. */
export interface Name {
  text: string;
  star: boolean;
}

/** A rectangle on the 640 x 360 screen. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---- The kinds still typed as Loose: each is built field by field in the file named ----

/** The expedition: hp, gold, day, where it stands, the deck (screens.ts, newRun). */
export type Run = Loose;
/** A fight in progress: piles, hand, energy, enemies, powers, the queue (battle.ts, startBattle). */
export type Battle = Loose;
/** An enemy in a fight: hp, block, strength, its place in its moves (battle.ts, makeEnemy). */
export type Enemy = Loose;
/** One move of an enemy kind: k (what it does) and its numbers (enemies.ts, enemies2.ts). */
export type Move = Loose;
/** A card in a pile or the hand: its id and what this fight changed on it (battle.ts). */
export type CardInPlay = Loose;
/** One effect of a card, [op, value, ...], and what a play carries along (battle.ts, runFx). */
export type Fx = Loose;
/** A queued step of a fight: k (what happens) and its numbers (battle.ts, resolve). */
export type QueueStep = Loose;

/**
 * A card's definition (cards.ts, cards2.ts). The first cards carry their own play();
 * the rest are made of effects (fx, quest, rally, lf, on, passive ...), read as Loose.
 */
export interface CardDef {
  /** attack, skill, power or land. */
  type: string;
  cost: number;
  play?(b: Battle, ti: number, c: CardInPlay): void;
  /** A reason the card cannot be played now, or nothing. */
  can?(b: Battle, ti: number): Loose;
  pay?(b: Battle): void;
  onLand?(b: Battle): void;
  onTurn?(b: Battle): void;
  /** A trap costs 0 when its test is met: the name of a test in battle.ts (TRAPS), or the card's own. */
  trap?: string | ((b: Battle, ti: number) => Loose);
  [field: string]: Loose;
}

/** An enemy kind's definition (enemies.ts, enemies2.ts): its numbers name sliders in data/config.json. */
export interface EnemyDef {
  /** Its continent; null for the Roil Elemental, which comes wherever the expedition stands. */
  cont: string | null;
  moves: Move[];
  [field: string]: Loose;
}
