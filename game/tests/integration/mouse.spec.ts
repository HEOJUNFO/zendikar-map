// Playwright: the game played with the mouse alone. A real pointer moves, presses and lets go
// over the canvas of the single-file build; the game is stepped through its hook (?manual=1),
// and what happened is read from its state and its events.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const config = JSON.parse(readFileSync('data/config.json', 'utf8'));
const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as { stops: { id: string; cont: string; x: number; y: number; ux: number; uy: number; sea?: number[] }[]; views: Record<string, { x: number; y: number; s: number }>; ways: Record<string, { len: number }> };
const happenings = [...readFileSync('src/events.ts', 'utf8').matchAll(/^    id: '([a-z-]+)', at: '(road|sea|site)'/gm)].map(m => ({ id: m[1], at: m[2] }));
const build = (query: string): string => `${pathToFileURL(resolve('dist-single/index.html')).href}?${query}`;

// ---- where things are on the 640 x 360 screen (src/screens.ts, src/screens2.ts) ----
/** A stop on its continent's own map. */
const stopAt = (id: string) => { const s = world.stops.find(x => x.id === id)!, v = world.views[s.cont]; return { x: 6 + Math.round((s.ux - v.x) * v.s), y: 18 + Math.round((s.uy - v.y) * v.s) }; };
/** A continent's port on the world map: its ship, on the water off the port. */
const portAt = (id: string) => { const s = world.stops.find(x => x.id === id)!; return { x: 6 + s.sea![0], y: 18 + s.sea![1] }; };
const SAIL = { x: 566, y: 266 };
/** The middle of card i in a hand of n. */
const cardAt = (i: number, n: number) => {
  const sp = n <= 5 ? 84 : Math.floor(396 / (n - 1));
  const x0 = Math.round((n <= 5 ? 320 : 308) - ((n - 1) * sp) / 2 - 40);
  return { x: x0 + i * sp + Math.min(40, Math.floor(sp / 2)), y: 300 };
};
/** The kicker gem of card i in a hand of n, as the card stands when the pointer is on it. */
const kickAt = (i: number, n: number) => ({ x: cardAt(i, n).x - Math.min(40, Math.floor((n <= 5 ? 84 : Math.floor(396 / (n - 1))) / 2)) + 11, y: 295 });
const ENEMY = { x: 476, y: 190 };       // a lone enemy
const FIELD = { x: 300, y: 120 };       // open ground above the hand
const LEADER = { x: 111, y: 192 };
/** Creature i on the field, 1 for the first to come. */
const creatureAt = (i: number) => ({ x: 136 + i * 42, y: 186 });
/** Stack i of the land pile, in the left column. */
const landAt = (i: number) => ({ x: 11 + (i % 3) * 18 + 6, y: 287 + Math.floor(i / 3) * 14 + 6 });
const END_TURN = { x: 595, y: 281 };
const rewardAt = (i: number, n: number) => ({ x: Math.round(320 + (i - (n - 1) / 2) * 150), y: 118 });
const shopAt = (i: number) => ({ x: 70 + i * 120, y: 104 });
/** The market's basic land of colour i, in the order white, blue, black, red, green. */
const basicAt = (i: number) => ({ x: 330 + i * 34 + 14, y: 297 });
const SHOP_REMOVE = { x: 225, y: 340 }, SHOP_LEAVE = { x: 415, y: 340 };
const CAMP_REST = { x: 320, y: 163 }, CAMP_TRIM = { x: 320, y: 199 };
const deckCardAt = (i: number) => ({ x: 26 + (i % 7) * 85 + 40, y: 30 + Math.floor(i / 7) * 112 + 54 });
const LANG_BUTTON = { x: 606, y: 9 }, DECK_BUTTON = { x: 565, y: 9 };
const v = (k: string): number => config[k].value;
/** A card's kicker cost, as its line in the generated module writes it (src/cards2.ts). */
const v0 = (id: string): number => Number(new RegExp(`"${id}": \\{.*?"kick":\\{"cost":(\\d+)`).exec(readFileSync('src/cards2.ts', 'utf8'))![1]);

interface Seen {
  scene: string;
  screen: string;
  at: string;
  day: number;
  conts: string[];
  hp: number;
  gold: number;
  deck: string[];
  lands: string[];
  battle: null | {
    mana: string[]; block: number; turn: number; phase: string; hand: string[]; inPlay: string[]; pile: string[]; drawPile: number; discardPile: number;
    party: { id: string; stance: string; fresh: boolean; gear: string[]; up: number[] }[];
    enemies: { kind: string; hp: number }[];
  };
  reward: null | string[];
  shop: null | { removed: boolean; items: { id: string; price: number; sold: boolean }[] };
  camp: boolean;
  events: Record<string, unknown>[];
}

async function open(page: Page, query = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(build(`manual=1&seed=${config.seed}&lang=en${query}`));
  await expect.poll(() => page.evaluate(() => typeof window.game?.step)).toBe('function');
  return errors;
}
const step = (page: Page, n = 1): Promise<void> => page.evaluate(k => window.game!.step(k), n);
/** What the game holds now, as plain values; the events logged since the last look. */
const look = (page: Page): Promise<Seen> => page.evaluate(() => {
  const g = window.game!;
  type Card = { id: string };
  type Live = {
    screen: string; reward: null | { cards: string[] }; camp: unknown;
    run: { at: string; day: number; conts: string[]; hp: number; gold: number; deck: Card[]; lands: Card[] };
    battle: null | {
      mana: string[]; block: number; turn: number; phase: string; hand: Card[]; lands: Card[]; landPile: Card[]; draw: Card[]; discard: Card[];
      party: { id: string | null; stance: string; fresh: boolean; gear: Card[]; tAtk: number; tDef: number }[];
      enemies: { kind: string; hp: number }[];
    };
    shop: null | { removed: boolean; items: { id: string; price: number; sold: boolean }[] };
  };
  const s = g.state as Live, b = s.battle, ev = (g.events ?? []) as Record<string, unknown>[];
  return {
    scene: g.scene, screen: s.screen, at: s.run.at, day: s.run.day, conts: s.run.conts.slice(), hp: s.run.hp, gold: s.run.gold, deck: s.run.deck.map(c => c.id), lands: s.run.lands.map(c => c.id),
    battle: b ? {
      mana: b.mana.slice(), block: b.block, turn: b.turn, phase: b.phase, hand: b.hand.map(c => c.id), inPlay: b.lands.map(c => c.id), pile: b.landPile.map(c => c.id),
      drawPile: b.draw.length, discardPile: b.discard.length,
      party: b.party.map(m => ({ id: m.id || 'leader', stance: m.stance, fresh: m.fresh, gear: m.gear.map(c => c.id), up: [m.tAtk, m.tDef] })),
      enemies: b.enemies.map(e => ({ kind: e.kind, hp: e.hp })),
    } : null,
    reward: s.reward ? s.reward.cards.slice() : null,
    shop: s.shop ? { removed: s.shop.removed, items: s.shop.items.map(i => ({ id: i.id, price: i.price, sold: i.sold })) } : null,
    camp: !!s.camp,
    events: ev.splice(0, ev.length).map(e => ({ ...e })),
  };
});
/** Moves the pointer to a point of the game's own 640 x 360 screen. */
async function moveTo(page: Page, p: { x: number; y: number }): Promise<void> {
  const b = (await page.locator('#game').boundingBox())!;
  await page.mouse.move(b.x + (p.x * b.width) / 640, b.y + (p.y * b.height) / 360);
}
async function click(page: Page, p: { x: number; y: number }): Promise<void> {
  await moveTo(page, p); await step(page);
  await page.mouse.down(); await step(page);
  await page.mouse.up(); await step(page);
}
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await moveTo(page, from); await step(page);
  await page.mouse.down(); await step(page);
  await moveTo(page, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }); await step(page);
  await moveTo(page, to); await step(page);
  await page.mouse.up(); await step(page);
}
/** No happening on a walk or a crossing this run: each counts as met already. A site keeps its own. */
const quietRoads = (page: Page): Promise<void> => page.evaluate(ids => { (window.game!.state as { run: { seen: string[] } }).run.seen = ids; }, happenings.filter(h => h.at !== 'site').map(h => h.id));
/** From the title to the player's first turn of the first fight, by clicks alone. */
async function toFirstFight(page: Page): Promise<Seen> {
  await click(page, { x: 320, y: 222 });           // the title: anywhere but its buttons
  await quietRoads(page);
  await click(page, stopAt('oran-rief'));          // the map: the place itself
  await step(page, 150);                           // the trip, and the fight opening
  return look(page);
}
/** Plays the fight out with the keys (already under test in boot.spec.ts), to the reward. */
async function winFightByKeys(page: Page): Promise<Seen> {
  for (let turn = 0; turn < 14; turn++) {
    // a land, then each card in hand in turn; a card worn by one of yours asks who, and 1 is the leader
    for (const key of ['KeyZ', 'Digit1', 'Digit1', 'Digit2', 'Digit1', 'Digit1', 'Digit2', 'Digit1', 'Escape']) {
      await page.evaluate(k => { window.game!.press(k); window.game!.step(40); }, key);
      if ((await page.evaluate(() => (window.game!.state as { screen: string }).screen)) !== 'battle') { await step(page, 30); return look(page); }
    }
    await page.evaluate(() => { window.game!.press('KeyE'); window.game!.step(240); });
    if ((await page.evaluate(() => (window.game!.state as { screen: string }).screen)) !== 'battle') { await step(page, 30); return look(page); }
  }
  return look(page);
}
/** Puts a card in the hand and mana of any colour in the pool: for a card the starting deck does not hold. */
const give = (page: Page, id: string, mana: number): Promise<void> => page.evaluate(([card, n]) => {
  const b = (window.game!.state as { battle: { hand: { id: string; uid: number }[]; mana: string[] } }).battle;
  b.hand.push({ id: card as string, uid: 9001 });
  for (let i = 0; i < (n as number); i++) b.mana.push('*');
}, [id, mana]);

test('a click begins the expedition, and a click on a place on the map goes there', async ({ page }) => {
  const errors = await open(page);

  await click(page, { x: 320, y: 222 });
  const started = await look(page);
  await click(page, stopAt('oran-rief'));
  const leaving = await look(page);
  await step(page, 150);
  const arrived = await look(page);

  expect(started).toMatchObject({ scene: 'play', screen: 'map', at: 'sea-gate' });
  expect(leaving.screen).toBe('travel');
  expect(leaving.events).toContainEqual(expect.objectContaining({ travel: 'oran-rief' }));
  expect(arrived).toMatchObject({ screen: 'battle', at: 'oran-rief' });
  expect(errors).toEqual([]);
});

test('a click on a land of the pile puts it into play for one more mana, and a second land the same turn is refused', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);

  await click(page, landAt(0));
  await step(page, 60);
  const played = await look(page);
  await click(page, landAt(0));
  await step(page, 60);
  const again = await look(page);

  expect(before.battle!.inPlay).toHaveLength(v('start_lands'));
  expect(played.events).toContainEqual(expect.objectContaining({ land: before.battle!.pile[0] }));
  expect(played.battle!.inPlay).toHaveLength(v('start_lands') + 1);
  expect(played.battle!.mana).toHaveLength(before.battle!.mana.length + 1);
  expect(played.battle!.pile).toHaveLength(before.battle!.pile.length - 1);
  expect(again.events.filter(e => 'land' in e)).toEqual([]);
  expect(again.battle!.inPlay).toHaveLength(v('start_lands') + 1);
});

test('a creature dragged up onto the field takes the field for mana of its colour, and stays there', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  const i = before.battle!.hand.indexOf('welkin-tern');

  await drag(page, cardAt(i, before.battle!.hand.length), FIELD);
  await step(page, 60);
  const after = await look(page);

  expect(after.events).toContainEqual(expect.objectContaining({ play: 'welkin-tern' }));
  expect(after.battle!.party.map(m => m.id)).toEqual(['leader', 'welkin-tern']);
  expect(after.battle!.party[1]).toMatchObject({ fresh: true, gear: [] });
  expect(after.battle!.mana).toEqual(before.battle!.mana.filter(m => m !== 'U'));
  expect(after.battle!.hand).toHaveLength(before.battle!.hand.length - 1);
});

test('equipment dragged onto the leader is worn by the leader, and onto a creature by the creature', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await click(page, landAt(0));                                             // three mana: the machete, the tern, the gear
  await step(page, 60);
  const n = before.battle!.hand.length;

  await drag(page, cardAt(before.battle!.hand.indexOf('trusty-machete'), n), LEADER);
  await step(page, 60);
  const armed = await look(page);
  await click(page, cardAt(armed.battle!.hand.indexOf('welkin-tern'), n - 1));   // no target to name: a click plays it
  await step(page, 60);
  const fielded = await look(page);
  await drag(page, cardAt(fielded.battle!.hand.indexOf('adventuring-gear'), n - 2), creatureAt(1));
  await step(page, 60);
  const geared = await look(page);

  expect(armed.battle!.party[0].gear).toEqual(['trusty-machete']);
  expect(geared.battle!.party[1]).toMatchObject({ id: 'welkin-tern', gear: ['adventuring-gear'] });
  expect(geared.battle!.party[0].gear).toEqual(['trusty-machete']);
  expect(geared.battle!.mana).toEqual([]);
});

test('a card that aims, dragged onto an enemy, is played on it', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await give(page, 'burst-lightning', 1);
  const n = before.battle!.hand.length + 1;

  await drag(page, cardAt(n - 1, n), ENEMY);
  await step(page, 60);
  const after = await look(page);

  expect(after.events).toContainEqual(expect.objectContaining({ play: 'burst-lightning' }));
  expect(after.battle!.enemies[0].hp).toBe(before.battle!.enemies[0].hp - v('burst_lightning_hit'));
  expect(after.battle!.mana).toEqual(before.battle!.mana);   // the one mana given paid for it
});

test('a card that needs no target is played when dragged up onto the field, and goes back when let go low', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  const n = before.battle!.hand.length, i = before.battle!.hand.indexOf('bold-defense');
  const from = cardAt(i, n);

  await drag(page, from, { x: from.x + 60, y: 290 });   // moved, but still down among the cards
  await step(page, 30);
  const putBack = await look(page);
  await drag(page, from, FIELD);
  await step(page, 60);
  const played = await look(page);

  expect(putBack.battle!.party[0].up).toEqual([0, 0]);
  expect(putBack.battle!.hand).toHaveLength(n);
  expect(played.events).toContainEqual(expect.objectContaining({ play: 'bold-defense' }));
  expect(played.battle!.party[0].up).toEqual([v('bold_defense_pumpall_atk'), v('bold_defense_pumpall_def')]);   // each of yours, for the turn
  expect(played.battle!.mana).toHaveLength(before.battle!.mana.length - 1);
  expect(played.battle!.mana).not.toContain('W');
});

test('a card grabbed by its kicker gem is played with the kicker paid: more mana, and the stronger effect instead', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await give(page, 'burst-lightning', 4);            // 1 for the card and 3 for its kicker
  await page.evaluate(() => { (window.game!.state as { battle: { enemies: { hp: number; maxHp: number }[] } }).battle.enemies[0].hp = 40; });
  const n = before.battle!.hand.length + 1;

  await drag(page, kickAt(n - 1, n), ENEMY);
  await step(page, 60);
  const after = await look(page);

  expect(after.events).toContainEqual(expect.objectContaining({ play: 'burst-lightning', kicked: true }));
  expect(after.battle!.enemies[0].hp).toBe(40 - v('burst_lightning_kick_hit'));
  expect(after.battle!.mana).toHaveLength(before.battle!.mana.length + 4 - (1 + v0('burst-lightning')));   // four mana went: one for the card, three for its kicker
});

test('K arms the kicker for the next card played by its number, and a card without the mana for it stays in hand', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await give(page, 'burst-lightning', 1);            // enough for the card, not for its kicker
  await page.evaluate(() => { (window.game!.state as { battle: { enemies: { hp: number; maxHp: number }[] } }).battle.enemies[0].hp = 40; });
  const n = before.battle!.hand.length + 1;
  const key = (k: string): Promise<void> => page.evaluate(c => { window.game!.press(c); window.game!.step(40); }, k);

  await key('KeyK'); await key('Digit' + n);
  const refused = await look(page);
  await page.evaluate(() => { const b = (window.game!.state as { battle: { mana: string[] } }).battle; b.mana.push('*', '*', '*'); });
  await key('KeyK'); await key('Digit' + n);
  const kicked = await look(page);

  expect(refused.events.filter(e => 'play' in e)).toEqual([]);
  expect(refused.battle!.hand).toHaveLength(n);
  expect(kicked.events).toContainEqual(expect.objectContaining({ play: 'burst-lightning', kicked: true }));
  expect(kicked.battle!.enemies[0].hp).toBe(40 - v('burst_lightning_kick_hit'));
});

test('when the turn ends an instant not played stays in hand, the other cards are discarded, and the hand is drawn up to full', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  const instants = before.battle!.hand.filter(id => id === 'bold-defense' || id === 'shieldmates-blessing');

  await click(page, END_TURN);
  await step(page, 220);
  const next = await look(page);

  expect(instants).toEqual(['bold-defense']);
  expect(next.battle!.hand[0]).toBe('bold-defense');                                   // kept, in its place at the front
  expect(next.battle!.hand).toHaveLength(v('hand_size'));
  expect(next.battle!.discardPile).toBe(before.battle!.hand.length - 1);               // the four that are not instants
  expect(next.battle!.drawPile).toBe(before.battle!.drawPile - (v('hand_size') - 1));  // four drawn, not five
});

test('an enemy that flies passes the guard of a creature on the ground, and is stopped by the guard of one that flies', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await give(page, 'pillarfield-ox', 2);              // a creature of the ground; the tern in hand flies
  await page.evaluate(() => { (window.game!.state as { battle: { enemies: { kind: string }[] } }).battle.enemies[0].kind = 'sky-ruin-drake'; });
  const n = before.battle!.hand.length + 1;
  const swoop = Math.round(v('sky_ruin_drake_m0_d') * v('foe_damage'));

  await click(page, cardAt(n - 1, n));                // the ox takes the field
  await step(page, 60);
  await click(page, cardAt(before.battle!.hand.indexOf('welkin-tern'), n - 1));
  await step(page, 60);
  const fielded = await look(page);
  await click(page, END_TURN);                        // both just came, so both guard; the leader strikes
  await step(page, 220);
  const after = await look(page);

  expect(fielded.battle!.party.map(m => m.id)).toEqual(['leader', 'pillarfield-ox', 'welkin-tern']);
  expect(v('pillarfield_ox_def')).toBeGreaterThan(0);
  expect(after.hp).toBe(v('player_hp') - (swoop - v('welkin_tern_def')));   // the tern's guard counts, the ox's does not
});

test('a card of a colour no mana in the pool can pay for stays in hand', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await page.evaluate(() => { (window.game!.state as { battle: { hand: { id: string; uid: number }[] } }).battle.hand.push({ id: 'burst-lightning', uid: 9001 }); });
  const n = before.battle!.hand.length + 1;

  await drag(page, cardAt(n - 1, n), ENEMY);   // a red card, with white and blue mana
  await step(page, 60);
  const after = await look(page);

  expect(after.events.filter(e => 'play' in e)).toEqual([]);
  expect(after.battle!.hand).toHaveLength(n);
  expect(after.battle!.enemies[0].hp).toBe(before.battle!.enemies[0].hp);
  expect(after.battle!.mana).toEqual(before.battle!.mana);
});

test('a click on one of yours turns it between strike and guard, but not one that just arrived', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await click(page, cardAt(before.battle!.hand.indexOf('welkin-tern'), before.battle!.hand.length));
  await step(page, 60);

  await click(page, LEADER);
  const guarding = await look(page);
  await click(page, creatureAt(1));
  const fresh = await look(page);
  await click(page, LEADER);
  const striking = await look(page);

  expect(before.battle!.party[0].stance).toBe('atk');
  expect(guarding.battle!.party[0].stance).toBe('grd');
  expect(fresh.battle!.party[1]).toMatchObject({ id: 'welkin-tern', fresh: true, stance: 'atk' });
  expect(fresh.events.filter(e => 'stance' in e)).toEqual([]);
  expect(striking.battle!.party[0].stance).toBe('atk');
});

test('End turn: the one set to strike strikes, the one set to guard blocks, and the lands make mana again', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  const bite = Math.round(v('recluse_atk') * v('foe_damage'));

  await click(page, LEADER);            // the leader guards this turn
  await click(page, END_TURN);
  await step(page, 220);
  const guarded = await look(page);
  await click(page, LEADER);            // and strikes the next
  await click(page, END_TURN);
  await step(page, 220);
  const struck = await look(page);

  expect(guarded.battle).toMatchObject({ turn: before.battle!.turn + 1, phase: 'player' });
  expect(guarded.battle!.enemies[0].hp).toBe(before.battle!.enemies[0].hp);
  expect(guarded.hp).toBe(v('player_hp') - Math.max(0, bite - v('leader_def')));
  expect(guarded.battle!.mana).toHaveLength(v('start_lands'));
  expect(struck.battle!.enemies[0].hp).toBe(before.battle!.enemies[0].hp - v('leader_atk'));
});

test('with six cards in hand, a click on the edge of End turn ends the turn and plays no card', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await page.evaluate(() => { // a sixth card, as a card that draws would give
    const b = (window.game!.state as { battle: { hand: { id: string; uid: number }[] } }).battle;
    b.hand.push({ id: 'bold-defense', uid: 9001 });
  });

  await click(page, { x: 558, y: 281 });   // inside the button, at its left edge
  await step(page, 220);
  const after = await look(page);

  expect(after.events.filter(e => 'play' in e)).toEqual([]);
  expect(after.battle!.turn).toBe(before.battle!.turn + 1);
});

test('after a fight, a click on a card of the reward takes it: a land into the land pile, any other card into the deck', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  const won = await winFightByKeys(page);
  const n = won.reward!.length;

  await moveTo(page, rewardAt(0, n)); await step(page, 30);   // the reward waits a moment before it takes a click
  await click(page, rewardAt(0, n));
  const after = await look(page);

  expect(won.screen).toBe('reward');
  expect(won.reward![0]).toBe('oran-rief-the-vastwood');      // the place's own land comes first
  expect(after.events).toContainEqual(expect.objectContaining({ reward: won.reward![0] }));
  expect(after.lands).toHaveLength(won.lands.length + 1);
  expect(after.deck).toHaveLength(won.deck.length);
  expect(after.screen).toBe('map');
});

test('in a town, a click takes a card out of the deck for a fee, buys a card, buys a basic land, and Leave leaves', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  await winFightByKeys(page);
  await page.evaluate(() => { window.game!.press('Digit0'); window.game!.step(10); });   // skip the reward
  await click(page, stopAt('sea-gate'));
  await step(page, 150);
  const town = await look(page);
  await page.evaluate(() => { (window.game!.state as { run: { gold: number } }).run.gold = 300; });   // gold enough for all three
  const rich = await look(page);

  await click(page, SHOP_REMOVE);
  await click(page, deckCardAt(0));
  const trimmed = await look(page);
  await click(page, shopAt(0));
  const bought = await look(page);
  await click(page, basicAt(3));           // a mountain
  const landed = await look(page);
  await click(page, SHOP_LEAVE);
  const left = await look(page);

  expect(town.screen).toBe('shop');
  expect(trimmed.deck).toHaveLength(rich.deck.length - 1);
  expect(trimmed.gold).toBe(300 - v('price_remove'));
  expect(trimmed.shop!.removed).toBe(true);
  expect(bought.events).toContainEqual(expect.objectContaining({ buy: town.shop!.items[0].id }));
  expect(bought.gold).toBe(trimmed.gold - town.shop!.items[0].price);
  expect(bought.deck.length + bought.lands.length).toBe(trimmed.deck.length + trimmed.lands.length + 1);
  expect(landed.lands).toEqual([...bought.lands, 'mountain']);
  expect(landed.gold).toBe(bought.gold - v('price_basic'));
  expect(left.screen).toBe('map');
});

test('at a camp, a click on Rest heals and moves on', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  await winFightByKeys(page);
  await page.evaluate(() => { window.game!.press('Digit0'); window.game!.step(10); });
  await click(page, stopAt('the-sunspring'));
  await step(page, 150);
  await page.evaluate(() => { (window.game!.state as { run: { hp: number } }).run.hp = 30; });   // hurt, so a rest shows
  const camp = await look(page);

  await click(page, CAMP_REST);
  const rested = await look(page);

  expect(camp).toMatchObject({ screen: 'camp', camp: true });
  expect(rested.hp).toBe(30 + Math.round(v('player_hp') * v('camp_heal')));
  expect(rested.screen).toBe('map');
});

test('at a camp, Trim opens the deck and a click on a card takes it out; the lands stay', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  await winFightByKeys(page);
  await page.evaluate(() => { window.game!.press('Digit0'); window.game!.step(10); });
  await click(page, stopAt('the-sunspring'));
  await step(page, 150);
  const camp = await look(page);

  await click(page, CAMP_TRIM);
  await click(page, deckCardAt(0));
  const trimmed = await look(page);

  expect(camp.screen).toBe('camp');
  expect(trimmed.deck).toHaveLength(camp.deck.length - 1);
  expect(trimmed.lands).toEqual(camp.lands);
  expect(trimmed.screen).toBe('map');
});

test('the world map opens from the continent\'s, a click on another continent\'s port crosses to it, and landing gives that land', async ({ page }) => {
  await open(page);
  await click(page, { x: 320, y: 222 });
  await quietRoads(page);
  const home = await look(page);
  const days = world.ways['sea-gate|midnight-pass'].len <= v('sail_far') ? 2 : 3;   // by the length of the way by sea

  await click(page, SAIL);
  const chart = await look(page);
  await click(page, portAt('midnight-pass'));
  const leaving = await look(page);
  await step(page, Math.ceil(v('sail_time') * 60) + 30);
  const landed = await look(page);

  expect(chart.screen).toBe('sea');
  expect(leaving.screen).toBe('travel');
  expect(leaving.events).toContainEqual(expect.objectContaining({ travel: 'midnight-pass', sea: true }));
  expect(landed).toMatchObject({ at: 'midnight-pass', day: days, screen: 'camp' });
  expect(landed.conts).toEqual([...home.conts, 'sejiri']);
  expect(landed.lands).toEqual([...home.lands, 'plains']);      // Sejiri's land
});

test('a site is a stop of its own: its happening opens, the way taken costs and gives what it says, and then the map is back', async ({ page }) => {
  await open(page);
  await click(page, { x: 320, y: 222 });
  await quietRoads(page);
  await page.evaluate(() => { (window.game!.state as { run: { hp: number } }).run.hp = 40; });   // hurt, so a healing shows
  const before = await look(page);

  await click(page, stopAt('halimar'));
  await step(page, 150);
  const there = await look(page);
  await click(page, { x: 320, y: 209 });            // the first way: coins to Ula, and a quiet crossing
  const taken = await look(page);
  await click(page, { x: 320, y: 327 });            // go on
  const after = await look(page);

  expect(there).toMatchObject({ screen: 'event', at: 'halimar' });
  expect(there.events).toContainEqual(expect.objectContaining({ event: 'halimar-deep' }));
  expect(taken.gold).toBe(before.gold - v('ev_toll'));
  expect(taken.hp).toBe(40 + v('ev_heal_big'));
  expect(after.screen).toBe('map');
  expect(after.events.filter(e => 'play' in e)).toEqual([]);   // a site has no fight
});

test('something that happens on the way comes before the stop: a way through it, then the stop itself', async ({ page }) => {
  await open(page);
  await click(page, { x: 320, y: 222 });
  await page.evaluate(() => {   // on the road to the Sunspring, the Roil crosses the way
    const s = window.game!.state as unknown as { screen: string; event: unknown };
    s.event = { id: 'roil-on-the-road', stop: 'the-sunspring', cont: 'tazeem', site: false, pick: -1, got: [], t: 1 };
    s.screen = 'event';
  });
  const before = await look(page);

  await click(page, { x: 320, y: 253 });            // the second way: push through
  const taken = await look(page);
  await click(page, { x: 320, y: 327 });            // go on: the camp at the Sunspring
  const after = await look(page);

  expect(taken.hp).toBe(before.hp - v('ev_hurt_big'));
  expect(after).toMatchObject({ screen: 'camp', camp: true });
});

test('the language button switches the language, and the deck button opens the deck', async ({ page }) => {
  await open(page);
  await click(page, { x: 320, y: 222 });
  const picture = (): Promise<string> => page.evaluate(() => (document.getElementById('game') as HTMLCanvasElement).toDataURL());

  const langBefore = await page.evaluate(() => document.documentElement.lang);
  await click(page, LANG_BUTTON);
  const langAfter = await page.evaluate(() => document.documentElement.lang);
  await moveTo(page, { x: 320, y: 200 }); await step(page);
  const mapPicture = await picture();
  await click(page, DECK_BUTTON);
  const deckPicture = await picture();
  const stillOnMap = await look(page);

  expect(langBefore).toBe('en');
  expect(langAfter).toBe('ko');
  expect(deckPicture).not.toBe(mapPicture);
  expect(stillOnMap.screen).toBe('map');
});

test('resting the pointer on a card in hand, an enemy, a land of the pile or one of yours shows what it is', async ({ page }) => {
  await open(page);
  const fight = await toFirstFight(page);
  const picture = (): Promise<string> => page.evaluate(() => (document.getElementById('game') as HTMLCanvasElement).toDataURL());

  await moveTo(page, { x: 320, y: 120 }); await step(page);
  const plain = await picture();
  await moveTo(page, cardAt(0, fight.battle!.hand.length)); await step(page);
  const overCard = await picture();
  await moveTo(page, ENEMY); await step(page);
  const overEnemy = await picture();
  await moveTo(page, landAt(0)); await step(page);
  const overLand = await picture();
  await moveTo(page, LEADER); await step(page);
  const overLeader = await picture();

  expect(new Set([plain, overCard, overEnemy, overLand, overLeader]).size).toBe(5);
});
