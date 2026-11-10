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

/** What a card is, read off its type line. How a card is used in a fight follows from this alone. */
export type Kind = 'creature' | 'equipment' | 'aura' | 'enchantment' | 'artifact' | 'planeswalker' | 'instant' | 'sorcery' | 'land';
/** An artifact creature is a creature, equipment is not just an artifact, an aura is not just an enchantment. */
export function cardKind(typeLine: string): Kind | null {
  if (/Land/.test(typeLine)) return 'land';
  if (/Creature/.test(typeLine)) return 'creature';
  if (/Planeswalker/.test(typeLine)) return 'planeswalker';
  if (/Equipment/.test(typeLine)) return 'equipment';
  if (/Aura/.test(typeLine)) return 'aura';
  if (/Artifact/.test(typeLine)) return 'artifact';
  if (/Enchantment/.test(typeLine)) return 'enchantment';
  if (/Instant/.test(typeLine)) return 'instant';
  if (/Sorcery/.test(typeLine)) return 'sorcery';
  return null;
}

/**
 * Which mana of the pool pays a cost: `cost` mana in all, one of them of each of the card's
 * colours. A mana is the colours it can be spent as ('U', 'WR'), or '*' for any colour. Returns
 * the places in the pool to spend, or null when the pool cannot pay.
 *
 * The rest of the cost is paid with what the other cards in hand can best do without (demand:
 * how many of them want each colour): mana of one colour before mana of two and mana of any
 * colour last, and among those the colour the pool has most of beyond what the hand wants. So a
 * card of no colour does not take the one blue mana a blue card in hand is waiting for.
 */
export function payMana(pool: string[], cost: number, colors: string, demand: Record<string, number>): number[] | null {
  if (cost <= 0) return [];
  const need = colors.split('');
  if (pool.length < Math.max(cost, need.length)) return null;
  const used: number[] = [];
  const free = (): number[] => pool.map((_, i) => i).filter(i => !used.includes(i));
  // how many unspent mana could pay a colour, and how many of them are beyond what the cards in hand want
  const have = (c: string): number => free().filter(i => pool[i] !== '*' && pool[i].includes(c)).length;
  const spare = (c: string): number => have(c) - (demand[c] || 0);
  // the mana to give up first: the least flexible, then the colour most to spare, then the colour there is most of
  const rank = (i: number): number[] => {
    const m = pool[i];
    if (m === '*') return [2, 0, 0, i];
    if (!m) return [-1, 0, 0, i]; // mana of no colour pays for nothing else
    return [m.length > 1 ? 1 : 0, -Math.min(...m.split('').map(spare)), -Math.min(...m.split('').map(have)), i];
  };
  const byRank = (a: number, b: number): number => { const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || x[3] - y[3]; };
  const colour = (k: number): boolean => { // one mana for each colour the card has
    if (k === need.length) return true;
    for (const i of free().filter(j => pool[j] === '*' || pool[j].includes(need[k])).sort(byRank)) {
      used.push(i);
      if (colour(k + 1)) return true;
      used.pop();
    }
    return false;
  };
  if (!colour(0)) return null;
  while (used.length < cost) used.push(free().sort(byRank)[0]);
  return used;
}

/**
 * The lands a fight opens with already in play: `n` of the lands owned, picked for the colours
 * the deck's cards want most (demand: cards of each colour). A colour once covered counts half
 * for the next pick, so a deck of two colours opens with one land of each. A basic land goes
 * before another land of the same worth, which keeps a land with an effect for the hand to play.
 */
export function campLands(lands: { colors: string; basic: boolean }[], demand: Record<string, number>, n: number): number[] {
  const want: Record<string, number> = { ...demand }, out: number[] = [];
  while (out.length < n && out.length < lands.length) {
    let best = -1, top = -1;
    lands.forEach((l, i) => {
      if (out.includes(i)) return;
      const score = l.colors.split('').reduce((v, c) => Math.max(v, want[c] || 0), 0) * (l.basic ? 1 : 0.6);
      if (score > top) { top = score; best = i; }
    });
    out.push(best);
    for (const c of lands[best].colors) want[c] = (want[c] || 0) / 2;
  }
  return out;
}
