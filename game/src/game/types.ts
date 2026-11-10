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

/** The expedition: hp, gold, day, where it stands, the deck and the lands (screens.ts, newRun). */
export type Run = Loose;
/** A fight in progress: piles, hand, mana, lands, the party, enemies, lasting cards, the queue (battle.ts, startBattle). */
export type Battle = Loose;
/** An enemy in a fight: hp, block, strength, its place in its moves (battle.ts, makeEnemy). */
export type Enemy = Loose;
/** One move of an enemy kind: k (what it does) and its numbers (enemies.ts, enemies2.ts). */
export type Move = Loose;
/** A card in a pile, the hand or the land pile: its id and the uid it has in this run (battle.ts). */
export type CardInPlay = Loose;
/** One of yours on the field: the leader (id null) or a creature, its stance, what it grew and what it wears (battle.ts). */
export type Member = Loose;
/** One effect of a card, [op, value, ...], and what a play carries along (battle.ts, runFx). */
export type Fx = Loose;
/** A queued step of a fight: k (what happens) and its numbers (battle.ts, resolve). */
export type QueueStep = Loose;

/**
 * A card's definition (cards.ts for the five basic lands, cards2.ts for the set). What it does is
 * made of effects (fx, on, rally, passive, quest ...), read as Loose.
 */
export interface CardDef {
  /** What the card is, from its type line: how it is used follows from this (game/rules.ts, cardKind). */
  kind: 'creature' | 'equipment' | 'aura' | 'enchantment' | 'artifact' | 'planeswalker' | 'instant' | 'sorcery' | 'land';
  /** Its colour, of W U B R G: the mana its cost needs one of. '' is colourless. A land's: the mana it makes. */
  color: string;
  cost: number;
  /** Who it is played on: an enemy, one of yours (mate), or no one. */
  target: 'enemy' | 'mate' | 'none';
  /** A creature's attack and guard: names of values in data/config.json. */
  atk?: string;
  def?: string;
  /** What the one who wears it gains (equipment, and an aura worn by one of yours). */
  gear?: { atk?: string; def?: string; pierce?: boolean; twice?: boolean; fly?: boolean; reach?: boolean; haste?: boolean };
  /** A kicker: for this much more mana, these effects happen instead; it may aim where the card alone does not. */
  kick?: { cost: number; target: 'enemy' | 'mate' | 'none'; fx: Fx[] };
  /** A trap costs 0 when its test is met: the name of a test in battle.ts (TRAPS). */
  trap?: string;
  [field: string]: Loose;
}

/** An enemy kind's definition (enemies.ts, enemies2.ts): its numbers name sliders in data/config.json. */
export interface EnemyDef {
  /** Its continent; null for the Roil Elemental, which comes wherever the expedition stands. */
  cont: string | null;
  moves: Move[];
  [field: string]: Loose;
}
