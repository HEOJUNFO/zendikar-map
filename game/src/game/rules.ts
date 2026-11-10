// The rules with no browser in them: small functions the game calls, so Vitest can run them in
// Node (tests/unit/). Each takes its numbers as arguments; the callers read data/config.json.

/** Days a trip takes: 1 when the stop is near, 2 up to far, 3 beyond; a way the Roil made rough adds 1. */
export function tripDays(dist: number, near: number, far: number, rough: boolean): number {
  return (dist <= near ? 1 : dist <= far ? 2 : 3) + (rough ? 1 : 0);
}

/** Days of travel left before the Roil Elemental comes. */
export function daysLeft(journeyDays: number, day: number): number {
  return Math.max(0, journeyDays - day);
}

/** How much stronger enemies are on this day. fixed: a run's first fight and the Roil Elemental, the same on any day. */
export function enemyScale(dayScale: number, day: number, fixed: boolean): number {
  return fixed ? 1 : 1 + dayScale * day;
}

/**
 * The damage one hit of an enemy's attack would do, before your block. base: the move's damage;
 * scale: the day's growth; str: strength gained; thirst: what bloodthirst adds now (0 when it
 * does not apply); charged: the hit is doubled; halved: then halved, rounded up; weak: taken off last.
 */
export function hitDamage(base: number, scale: number, str: number, thirst: number, charged: boolean, halved: boolean, weak: number): number {
  let d = Math.round(base * scale) + str;
  d += thirst;
  if (charged) d *= 2;
  if (halved) d = Math.ceil(d / 2);
  return Math.max(0, d - weak);
}

/** How many lands a turn allows: one, one more with the Oracle of Mul Daya out, and what cards added. */
export function landLimit(oracle: boolean, extra: number): number {
  return 1 + (oracle ? 1 : 0) + extra;
}

/** What a rest at camp gives back: a share of max hp, never past full. */
export function campHeal(hp: number, maxHp: number, share: number): number {
  return Math.min(maxHp - hp, Math.round(maxHp * share));
}

/** A run's score: the places it reached, the fights it won, and the win itself. */
export function runScore(places: number, fights: number, won: boolean): number {
  return places * 10 + fights * 15 + (won ? 100 : 0);
}

/** Shuffles a list in place with the given source of chance (Fisher-Yates), and returns it. */
export function shuffle<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
