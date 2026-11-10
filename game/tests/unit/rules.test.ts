// Vitest: the rules in src/game/, run in Node with no browser. The numbers come from
// data/config.json; a literal stands only where the exact number is the point (a rounding edge).
import { describe, expect, it } from 'vitest';
import config from '../../data/config.json';
import { getSeed, rng, setSeed } from '../../src/game/rng';
import { campHeal, campLands, cardKind, daysLeft, drawCount, enemyScale, hitDamage, landLimit, payMana, runScore, sailDays, shuffle, soak, walkDays } from '../../src/game/rules';

describe('rng', () => {
  it('repeats the same numbers for the same seed', () => {
    setSeed(config.seed);
    const first = [rng(), rng(), rng()];
    setSeed(config.seed);
    expect([rng(), rng(), rng()]).toEqual(first);
    expect(first.every(n => n >= 0 && n < 1)).toBe(true);
  });

  it('goes on with the same numbers from where it stood: what a save keeps', () => {
    setSeed(config.seed);
    rng(); rng();
    const stood = getSeed();
    const next = [rng(), rng(), rng()];

    setSeed(stood);

    expect([rng(), rng(), rng()]).toEqual(next);
  });

  it('gives another expedition other numbers', () => {
    setSeed(config.seed);
    const one = [rng(), rng(), rng()];
    setSeed(config.seed + 7919); // main.ts: each new run moves the seed by this much
    expect([rng(), rng(), rng()]).not.toEqual(one);
  });
});

describe('walkDays', () => {
  const far = config.hop_far.value;

  it('takes 1 day to a place of the same continent, 2 beyond the far mark', () => {
    expect(walkDays(0, far, false)).toBe(1);
    expect(walkDays(far, far, false)).toBe(1);
    expect(walkDays(far + 1, far, false)).toBe(2);
  });

  it('takes one more day on a way the Roil made rough', () => {
    expect(walkDays(far, far, true)).toBe(walkDays(far, far, false) + 1);
    expect(walkDays(far + 1, far, true)).toBe(3);
  });
});

describe('sailDays', () => {
  const far = config.sail_far.value;

  it('takes 2 days to another continent, 3 beyond the far mark', () => {
    expect(sailDays(far, far)).toBe(2);
    expect(sailDays(far + 1, far)).toBe(3);
  });

  it('is never as short as the shortest walk: crossing the sea costs more than walking', () => {
    expect(sailDays(0, far)).toBeGreaterThan(walkDays(0, config.hop_far.value, false));
  });
});

describe('daysLeft', () => {
  const journey = config.journey_days.value;

  it('counts down from the journey to the day the Roil comes', () => {
    expect(daysLeft(journey, 0)).toBe(journey);
    expect(daysLeft(journey, journey - 1)).toBe(1);
    expect(daysLeft(journey, journey)).toBe(0);
  });

  it('never goes below zero when the last trip ran past the journey', () => {
    expect(daysLeft(journey, journey + 2)).toBe(0);
  });
});

describe('enemyScale', () => {
  const grow = config.day_scale.value;

  it('leaves enemies as written on day 0 and grows them by the day', () => {
    expect(enemyScale(grow, 0, false)).toBe(1);
    expect(enemyScale(grow, 5, false)).toBeCloseTo(1 + grow * 5, 10);
  });

  it('keeps the first fight and the Roil Elemental the same on any day', () => {
    expect(enemyScale(grow, config.journey_days.value, true)).toBe(1);
  });
});

describe('hitDamage', () => {
  const bite = config.recluse_atk.value;

  it('is the move as written on day 0, with no strength', () => {
    expect(hitDamage(bite, 1, 0, 0, false, false, 0)).toBe(bite);
  });

  it('grows with the day, rounded to a whole number, then adds strength', () => {
    expect(hitDamage(5, 1.1, 0, 0, false, false, 0)).toBe(6); // 5.5 rounds up
    expect(hitDamage(5, 1.08, 0, 0, false, false, 0)).toBe(5); // 5.4 rounds down
    expect(hitDamage(bite, 1, 3, 0, false, false, 0)).toBe(bite + 3);
  });

  it('adds what bloodthirst gives before a charge doubles it', () => {
    expect(hitDamage(bite, 1, 0, 2, true, false, 0)).toBe((bite + 2) * 2);
  });

  it('halves after the charge, rounding up, and takes weakness off last', () => {
    expect(hitDamage(5, 1, 0, 0, false, true, 0)).toBe(3); // 2.5 rounds up
    expect(hitDamage(5, 1, 0, 0, true, true, 0)).toBe(5);
    expect(hitDamage(5, 1, 0, 0, false, true, 1)).toBe(2);
  });

  it('never goes below zero', () => {
    expect(hitDamage(bite, 1, 0, 0, false, false, bite + 4)).toBe(0);
  });
});

describe('landLimit', () => {
  it('allows one land a turn, one more with the Oracle out, and what cards add', () => {
    expect(landLimit(false, 0)).toBe(1);
    expect(landLimit(true, 0)).toBe(2);
    expect(landLimit(true, 1)).toBe(3);
  });
});

describe('campHeal', () => {
  const max = config.player_hp.value, share = config.camp_heal.value;

  it('gives back a share of max hp, rounded', () => {
    expect(campHeal(1, max, share)).toBe(Math.round(max * share));
    expect(campHeal(0, 35, 0.3)).toBe(11); // 10.5 rounds up
  });

  it('never heals past full', () => {
    expect(campHeal(max - 3, max, share)).toBe(3);
    expect(campHeal(max, max, share)).toBe(0);
  });
});

describe('runScore', () => {
  it('counts 10 a place, 15 a fight and 100 for the win', () => {
    expect(runScore(0, 0, false)).toBe(0);
    expect(runScore(4, 3, false)).toBe(85);
    expect(runScore(4, 3, true)).toBe(185);
  });
});

describe('shuffle', () => {
  it('keeps every card and gives the same order for the same seed', () => {
    const deck = (): number[] => Array.from({ length: 10 }, (_, i) => i + 1);
    setSeed(config.seed);
    const first = shuffle(deck(), rng);
    setSeed(config.seed);
    const again = shuffle(deck(), rng);
    expect(again).toEqual(first);
    expect([...first].sort((a, b) => a - b)).toEqual(deck());
  });

  it('shuffles the list it was given, in place', () => {
    const list = [1, 2, 3, 4, 5, 6];
    setSeed(config.seed);
    expect(shuffle(list, rng)).toBe(list);
  });
});

describe('drawCount', () => {
  const hand = config.hand_size.value;

  it('draws a full hand when nothing was kept, and fewer for each instant kept from last turn', () => {
    expect(drawCount(hand, 0, 0)).toBe(hand);
    expect(drawCount(hand, 0, 2)).toBe(hand - 2);
  });

  it('draws fewer when an enemy jammed the draw, and never fewer than one', () => {
    expect(drawCount(hand, 1, 0)).toBe(hand - 1);
    expect(drawCount(hand, 0, hand)).toBe(1);
    expect(drawCount(hand, 3, hand)).toBe(1);
  });
});

describe('soak', () => {
  it('stops an enemy on the ground with the ground guard first, then the block', () => {
    expect(soak(9, 4, 3, false)).toEqual({ left: 2, block: 0, ground: 0 });
    expect(soak(2, 4, 3, false)).toEqual({ left: 0, block: 4, ground: 1 });
  });

  it('lets an enemy that flies pass the ground guard: only the block stops it', () => {
    expect(soak(9, 4, 3, true)).toEqual({ left: 5, block: 0, ground: 3 });
    expect(soak(3, 4, 3, true)).toEqual({ left: 0, block: 1, ground: 3 });
  });
});

describe('cardKind', () => {
  it('reads what a card is off its type line', () => {
    expect(cardKind('Creature — Bird')).toBe('creature');
    expect(cardKind('Instant — Trap')).toBe('instant');
    expect(cardKind('Sorcery')).toBe('sorcery');
    expect(cardKind('Legendary Planeswalker — Nissa')).toBe('planeswalker');
    expect(cardKind('Land')).toBe('land');
  });

  it('takes an artifact creature for a creature, equipment for equipment and an aura for an aura', () => {
    expect(cardKind('Artifact Creature — Cat Ally')).toBe('creature');
    expect(cardKind('Artifact — Equipment')).toBe('equipment');
    expect(cardKind('Artifact')).toBe('artifact');
    expect(cardKind('Enchantment — Aura')).toBe('aura');
    expect(cardKind('Enchantment')).toBe('enchantment');
  });

  it('gives nothing for a line it does not know', () => {
    expect(cardKind('Scheme')).toBeNull();
  });
});

describe('payMana', () => {
  it('pays a cost only with one mana of the card\'s colour in it', () => {
    expect(payMana(['W', 'W'], 1, 'U', {})).toBeNull();
    expect(payMana(['W', 'U'], 2, 'U', {})!.sort()).toEqual([0, 1]);
    expect(payMana(['W', 'U'], 1, 'U', {})).toEqual([1]);
  });

  it('refuses a cost the pool is too small for, and pays nothing for a cost of 0', () => {
    expect(payMana(['U'], 2, 'U', {})).toBeNull();
    expect(payMana([], 0, 'U', {})).toEqual([]);
  });

  it('pays a colourless card with any mana', () => {
    expect(payMana(['R'], 1, '', {})).toEqual([0]);
  });

  it('spends mana of one colour before mana of two, and mana of any colour last', () => {
    expect(payMana(['*', 'WU', 'U'], 1, 'U', {})).toEqual([2]);
    expect(payMana(['*', 'WU'], 1, 'U', {})).toEqual([1]);
    expect(payMana(['*', 'R'], 1, 'U', {})).toEqual([0]);
  });

  it('leaves the colour the rest of the hand wants', () => {
    // a blue card of cost 2, with a white card still in hand: the second mana is the other blue, not the white
    expect(payMana(['U', 'W', 'U'], 2, 'U', { W: 1 })!.sort()).toEqual([0, 2]);
    expect(payMana(['U', 'W', 'U'], 2, 'U', { U: 1 })!.sort()).toEqual([0, 1]);
  });

  it('pays for a card of no colour with the colour it has most of, not the one mana a card in hand waits for', () => {
    // white, blue, white in the pool; a blue card and two white cards still in hand
    expect(payMana(['W', 'U', 'W'], 1, '', { U: 1, W: 2 })).toEqual([0]);
    expect(payMana(['U', 'W', 'W'], 1, '', { U: 1, W: 2 })).toEqual([1]);
  });

  it('finds a mana for each colour of a card of two colours', () => {
    expect(payMana(['UB', 'B'], 2, 'UB', {})!.sort()).toEqual([0, 1]);
    expect(payMana(['B', 'B'], 2, 'UB', {})).toBeNull();
  });
});

describe('campLands', () => {
  const basic = (colors: string) => ({ colors, basic: true });

  it('opens a fight with the lands of the colours the deck wants most, one of each for a deck of two', () => {
    const lands = [basic('W'), basic('W'), basic('U'), basic('U'), basic('U')];
    expect(campLands(lands, { W: 5, U: 3 }, 2)).toEqual([0, 2]);
    expect(campLands(lands, { W: 9, U: 1 }, 2)).toEqual([0, 1]);
  });

  it('takes a basic land before another land of the same colour', () => {
    expect(campLands([{ colors: 'R', basic: false }, basic('R')], { R: 4 }, 1)).toEqual([1]);
  });

  it('takes no more lands than there are, and none when none are asked for', () => {
    expect(campLands([basic('G')], { G: 2 }, 2)).toEqual([0]);
    expect(campLands([basic('G')], { G: 2 }, 0)).toEqual([]);
  });
});
