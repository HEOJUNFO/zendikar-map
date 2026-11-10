// Vitest: what a save holds and how one is read back (src/game/save.ts), run in Node with no
// browser. The saves here are made in the test: a small expedition that names a few stops, cards,
// enemies and happenings, and a game that knows exactly those.
import { describe, expect, it } from 'vitest';
import { SAVE_SCREENS, SAVE_VERSION, readSave, soundSave, stampOf, type Known, type Saved } from '../../src/game/save';

const STOPS = ['sea-gate', 'oran-rief', 'halimar'], CONTS = ['tazeem'], CARDS = ['island', 'welkin-tern'], ENEMIES = ['giant-scorpion'], HAPPENINGS = ['halimar-deep'];
const known: Known = {
  stop: id => STOPS.includes(id as string),
  cont: id => CONTS.includes(id as string),
  card: id => CARDS.includes(id as string),
  enemy: id => ENEMIES.includes(id as string),
  happening: id => HAPPENINGS.includes(id as string),
};
const STAMP = stampOf([...STOPS, ...CARDS, ...ENEMIES, ...HAPPENINGS]);

/** A whole save on the map, with the given fields laid over it. */
function save(over: Partial<Saved> = {}, run: Record<string, unknown> = {}): Saved {
  return {
    v: SAVE_VERSION, stamp: STAMP, seed: 12345, screen: 'map', t: 61.5,
    run: {
      hp: 52, maxHp: 70, gold: 40, day: 3, at: 'oran-rief', visited: ['oran-rief'], route: ['sea-gate', 'oran-rief'],
      deck: [{ id: 'welkin-tern', uid: 1 }], lands: [{ id: 'island', uid: 2 }], uid: 3, conts: ['tazeem'], fights: 1, seen: [],
      rough: ['halimar'], enc: { 'oran-rief': { kinds: ['giant-scorpion'], elite: false } }, won: false, ...run,
    },
    fight: null, reward: null, shop: null, camp: null, event: null, pending: null, ...over,
  };
}
const read = (s: unknown): Saved | null => readSave(JSON.stringify(s), STAMP, known);

describe('readSave', () => {
  it('reads back a save as it was written', () => {
    const written = save();

    const back = read(written);

    expect(back).toEqual(written);
  });

  it('reads a save on every screen an expedition is saved on', () => {
    const on: Record<string, Partial<Saved>> = {
      map: {},
      battle: { fight: { kinds: ['giant-scorpion'], cont: 'tazeem', stop: 'oran-rief', bg: null, elite: false, boss: false, first: true } },
      reward: { reward: { gold: 12, heal: 0, cards: ['welkin-tern'], cont: 'tazeem', bg: null, t: 0 } },
      shop: { shop: { stop: 'sea-gate', cont: 'tazeem', removed: false, items: [{ id: 'welkin-tern', price: 30, sold: true }] } },
      camp: { camp: { stop: 'halimar', cont: 'tazeem' } },
      event: { event: { id: 'halimar-deep', stop: 'halimar', cont: 'tazeem', site: true, pick: 0, got: [['pay', 15], ['heal', 6], ['card', 'welkin-tern'], ['nothing']], t: 2 } },
    };

    const back = SAVE_SCREENS.map(screen => read(save({ screen, ...on[screen] })));

    expect(Object.keys(on)).toEqual(SAVE_SCREENS);
    expect(back.map(s => s && s.screen)).toEqual(SAVE_SCREENS);
  });

  it('reads nothing where nothing was kept, or where what was kept is not a save', () => {
    const cut = JSON.stringify(save()).slice(0, 80); // a write that was cut short

    const back = [readSave(null, STAMP, known), readSave('', STAMP, known), readSave(cut, STAMP, known), readSave('"a word"', STAMP, known), readSave('[1,2]', STAMP, known)];

    expect(back).toEqual([null, null, null, null, null]);
  });

  it('does not read a save written with other content, or one of another shape', () => {
    const otherContent = stampOf([...STOPS, ...CARDS, ...ENEMIES, ...HAPPENINGS, 'a-new-card']);

    const back = [readSave(JSON.stringify(save()), otherContent, known), read(save({ v: SAVE_VERSION + 1 }))];

    expect(back).toEqual([null, null]);
  });

  it('does not read a save that names a stop, a continent, a card, an enemy or a happening the game does not know', () => {
    const unknown = [
      save({}, { at: 'atlantis' }),
      save({}, { route: ['sea-gate', 'atlantis'] }),
      save({}, { conts: ['tazeem', 'lemuria'] }),
      save({}, { deck: [{ id: 'black-lotus', uid: 1 }] }),
      save({}, { lands: [{ id: 'island' }] }),                                   // a card with no uid
      save({}, { enc: { 'oran-rief': { kinds: ['tarrasque'], elite: false } } }),
      save({ screen: 'event', event: { id: 'no-such-thing', stop: 'halimar', cont: 'tazeem', site: true, pick: -1, got: [], t: 0 } }),
      save({ screen: 'event', event: { id: 'halimar-deep', stop: 'halimar', cont: 'tazeem', site: true, pick: 1, got: [['card', 'black-lotus']], t: 0 } }),
      save({ screen: 'event', event: { id: 'halimar-deep', stop: 'halimar', cont: 'tazeem', site: true, pick: 1, got: [['wish', 3]], t: 0 } }),
      save({ screen: 'event', event: { id: 'halimar-deep', stop: 'halimar', cont: 'tazeem', site: true, pick: 1, got: ['Gold −15'], t: 0 } }),   // words, not what happened
      save({ pending: { kind: 'shop', stop: 'atlantis' } }),
    ];

    const back = unknown.map(read);

    expect(back).toEqual(unknown.map(() => null));
  });

  it('does not read a save whose screen has nothing to show: a fight with no one in it, a market with no market', () => {
    const empty = [
      save({ screen: 'battle' }),
      save({ screen: 'battle', fight: { kinds: [], cont: 'tazeem', stop: 'oran-rief', bg: null, elite: false, boss: false, first: false } }),
      save({ screen: 'reward' }),
      save({ screen: 'shop' }),
      save({ screen: 'camp' }),
      save({ screen: 'event' }),
      save({ screen: 'travel' }),                                                 // a trip is never saved
    ];

    const back = empty.map(read);

    expect(back).toEqual(empty.map(() => null));
  });

  it('does not read an expedition that could not be: no hp left, more hp than its most, gold below nothing, a seed that is no whole number', () => {
    const wrong = [save({}, { hp: 0 }), save({}, { hp: 71 }), save({}, { gold: -1 }), save({}, { day: null }), save({ seed: 1.5 }), save({ seed: NaN })];

    const back = wrong.map(read);

    expect(back).toEqual(wrong.map(() => null));
  });
});

describe('soundSave', () => {
  it('takes a whole save and refuses what is not an object', () => {
    expect(soundSave(save(), STAMP, known)).toBe(true);
    expect(soundSave(null, STAMP, known)).toBe(false);
    expect(soundSave('save', STAMP, known)).toBe(false);
  });
});

describe('stampOf', () => {
  it('is the same for the same ids in any order', () => {
    expect(stampOf(['sea-gate', 'island', 'giant-scorpion'])).toBe(stampOf(['giant-scorpion', 'sea-gate', 'island']));
  });

  it('changes when an id is added, taken away or renamed', () => {
    const base = stampOf(['sea-gate', 'island']);

    expect(stampOf(['sea-gate', 'island', 'forest'])).not.toBe(base);
    expect(stampOf(['sea-gate'])).not.toBe(base);
    expect(stampOf(['sea-gate', 'islands'])).not.toBe(base);
  });

  it('tells where one id ends and the next begins', () => {
    expect(stampOf(['ab', 'c'])).not.toBe(stampOf(['a', 'bc']));
  });
});
