// Playwright: the game played with the mouse alone. A real pointer moves, presses and lets go
// over the canvas of the single-file build; the game is stepped through its hook (?manual=1),
// and what happened is read from its state and its events.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const config = JSON.parse(readFileSync('data/config.json', 'utf8'));
const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as { stops: { id: string; x: number; y: number }[] };
const build = (query: string): string => `${pathToFileURL(resolve('dist-single/index.html')).href}?${query}`;

// ---- where things are on the 640 x 360 screen (src/screens.ts, src/screens2.ts) ----
const stopAt = (id: string) => { const s = world.stops.find(x => x.id === id)!; return { x: 6 + s.x, y: 18 + s.y }; };
/** The middle of card i in a hand of n. */
const cardAt = (i: number, n: number) => {
  const sp = n <= 5 ? 84 : Math.floor(396 / (n - 1));
  const x0 = Math.round((n <= 5 ? 320 : 308) - ((n - 1) * sp) / 2 - 40);
  return { x: x0 + i * sp + Math.min(40, Math.floor(sp / 2)), y: 300 };
};
const ENEMY = { x: 476, y: 190 };       // a lone enemy
const FIELD = { x: 300, y: 150 };       // open ground above the hand
const END_TURN = { x: 595, y: 281 };
const rewardAt = (i: number, n: number) => ({ x: Math.round(320 + (i - (n - 1) / 2) * 150), y: 118 });
const shopAt = (i: number) => ({ x: 70 + i * 120, y: 104 });
const SHOP_REMOVE = { x: 225, y: 340 }, SHOP_LEAVE = { x: 415, y: 340 };
const CAMP_REST = { x: 320, y: 163 }, CAMP_TRIM = { x: 320, y: 199 };
const deckCardAt = (i: number) => ({ x: 26 + (i % 7) * 85 + 40, y: 30 + Math.floor(i / 7) * 112 + 54 });
const LANG_BUTTON = { x: 606, y: 9 }, DECK_BUTTON = { x: 565, y: 9 };

interface Seen {
  scene: string;
  screen: string;
  at: string;
  hp: number;
  gold: number;
  deck: string[];
  battle: null | { energy: number; block: number; turn: number; phase: string; hand: string[]; enemies: { kind: string; hp: number }[] };
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
    run: { at: string; hp: number; gold: number; deck: Card[] };
    battle: null | { energy: number; block: number; turn: number; phase: string; hand: Card[]; enemies: { kind: string; hp: number }[] };
    shop: null | { removed: boolean; items: { id: string; price: number; sold: boolean }[] };
  };
  const s = g.state as Live, b = s.battle, ev = (g.events ?? []) as Record<string, unknown>[];
  return {
    scene: g.scene, screen: s.screen, at: s.run.at, hp: s.run.hp, gold: s.run.gold, deck: s.run.deck.map(c => c.id),
    battle: b ? { energy: b.energy, block: b.block, turn: b.turn, phase: b.phase, hand: b.hand.map(c => c.id), enemies: b.enemies.map(e => ({ kind: e.kind, hp: e.hp })) } : null,
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
/** From the title to the player's first turn of the first fight, by clicks alone. */
async function toFirstFight(page: Page): Promise<Seen> {
  await click(page, { x: 320, y: 222 });           // the title: anywhere but its buttons
  await click(page, stopAt('oran-rief'));          // the map: the place itself
  await step(page, 150);                           // the trip, and the fight opening
  return look(page);
}
/** Plays the fight out with the keys (already under test in boot.spec.ts), to the reward. */
async function winFightByKeys(page: Page): Promise<Seen> {
  for (let turn = 0; turn < 12; turn++) {
    for (const key of ['Digit1', 'Digit1', 'Digit1', 'Digit2', 'Digit1']) {
      await page.evaluate(k => { window.game!.press(k); window.game!.step(40); }, key);
      if ((await page.evaluate(() => (window.game!.state as { screen: string }).screen)) !== 'battle') { await step(page, 30); return look(page); }
    }
    await page.evaluate(() => { window.game!.press('KeyE'); window.game!.step(200); });
  }
  return look(page);
}

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

test('a card dragged onto an enemy is played on it', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  const i = before.battle!.hand.indexOf('trusty-machete');

  await drag(page, cardAt(i, before.battle!.hand.length), ENEMY);
  await step(page, 60);
  const after = await look(page);

  expect(after.events).toContainEqual(expect.objectContaining({ play: 'trusty-machete' }));
  expect(after.battle!.energy).toBe(config.energy.value - 1);
  expect(after.battle!.enemies[0].hp).toBe(before.battle!.enemies[0].hp - config.machete_dmg.value);
  expect(after.battle!.hand).toHaveLength(before.battle!.hand.length - 1);
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

  expect(putBack.battle).toMatchObject({ energy: config.energy.value, block: 0 });
  expect(putBack.battle!.hand).toHaveLength(n);
  expect(played.events).toContainEqual(expect.objectContaining({ play: 'bold-defense' }));
  expect(played.battle).toMatchObject({ energy: config.energy.value - 1, block: config.defense_blk.value });
});

test('a click on a card plays it when there is one enemy to aim at, and a click on End turn ends the turn', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  const i = before.battle!.hand.indexOf('trusty-machete');

  await click(page, cardAt(i, before.battle!.hand.length));
  await step(page, 60);
  const played = await look(page);
  await click(page, END_TURN);
  await step(page, 200);
  const next = await look(page);

  expect(played.events).toContainEqual(expect.objectContaining({ play: 'trusty-machete' }));
  expect(played.battle!.enemies[0].hp).toBe(before.battle!.enemies[0].hp - config.machete_dmg.value);
  expect(next.battle).toMatchObject({ turn: before.battle!.turn + 1, phase: 'player', energy: config.energy.value });
  expect(next.hp).toBe(config.player_hp.value - config.recluse_atk.value);
});

test('with six cards in hand, a click on the edge of End turn ends the turn and plays no card', async ({ page }) => {
  await open(page);
  const before = await toFirstFight(page);
  await page.evaluate(() => { // a sixth card, as a card that draws would give
    const b = (window.game!.state as { battle: { hand: { id: string; uid: number }[] } }).battle;
    b.hand.push({ id: 'trusty-machete', uid: 9001 });
  });

  await click(page, { x: 558, y: 281 });   // inside the button, at its left edge
  await step(page, 200);
  const after = await look(page);

  expect(after.events.filter(e => 'play' in e)).toEqual([]);
  expect(after.battle!.turn).toBe(before.battle!.turn + 1);
});

test('after a fight, a click on a card of the reward takes it', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  const won = await winFightByKeys(page);
  const n = won.reward!.length;

  await moveTo(page, rewardAt(0, n)); await step(page, 30);   // the reward waits a moment before it takes a click
  await click(page, rewardAt(0, n));
  const after = await look(page);

  expect(won.screen).toBe('reward');
  expect(after.events).toContainEqual(expect.objectContaining({ reward: won.reward![0] }));
  expect(after.deck).toHaveLength(won.deck.length + 1);
  expect(after.screen).toBe('map');
});

test('in a town, a click takes a card out of the deck for a fee, a click buys what the gold allows, and Leave leaves', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  await winFightByKeys(page);
  await page.evaluate(() => { window.game!.press('Digit0'); window.game!.step(10); });   // skip the reward
  await click(page, stopAt('sea-gate'));
  await step(page, 150);
  const town = await look(page);
  await page.evaluate(() => { (window.game!.state as { run: { gold: number } }).run.gold = 200; });   // gold enough for both
  const rich = await look(page);

  await click(page, SHOP_REMOVE);
  await click(page, deckCardAt(0));
  const trimmed = await look(page);
  await click(page, shopAt(0));
  const bought = await look(page);
  await click(page, SHOP_LEAVE);
  const left = await look(page);

  expect(town.screen).toBe('shop');
  expect(trimmed.deck).toHaveLength(rich.deck.length - 1);
  expect(trimmed.gold).toBe(200 - config.price_remove.value);
  expect(trimmed.shop!.removed).toBe(true);
  expect(bought.events).toContainEqual(expect.objectContaining({ buy: town.shop!.items[0].id }));
  expect(bought.gold).toBe(trimmed.gold - town.shop!.items[0].price);
  expect(bought.deck).toHaveLength(trimmed.deck.length + 1);
  expect(left.screen).toBe('map');
});

test('at a camp, a click on Rest heals and moves on', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  await winFightByKeys(page);
  await page.evaluate(() => { window.game!.press('Digit0'); window.game!.step(10); });
  await click(page, stopAt('midnight-pass'));
  await step(page, 150);
  await page.evaluate(() => { (window.game!.state as { run: { hp: number } }).run.hp = 30; });   // hurt, so a rest shows
  const camp = await look(page);

  await click(page, CAMP_REST);
  const rested = await look(page);

  expect(camp).toMatchObject({ screen: 'camp', camp: true });
  expect(rested.hp).toBe(30 + Math.round(config.player_hp.value * config.camp_heal.value));
  expect(rested.screen).toBe('map');
});

test('at a camp, Trim opens the deck and a click on a card takes it out', async ({ page }) => {
  await open(page);
  await toFirstFight(page);
  await winFightByKeys(page);
  await page.evaluate(() => { window.game!.press('Digit0'); window.game!.step(10); });
  await click(page, stopAt('midnight-pass'));
  await step(page, 150);
  const camp = await look(page);

  await click(page, CAMP_TRIM);
  await click(page, deckCardAt(0));
  const trimmed = await look(page);

  expect(camp.screen).toBe('camp');
  expect(trimmed.deck).toHaveLength(camp.deck.length - 1);
  expect(trimmed.screen).toBe('map');
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

test('resting the pointer on a card in hand shows its panel, and on an enemy shows what it will do', async ({ page }) => {
  await open(page);
  const fight = await toFirstFight(page);
  const picture = (): Promise<string> => page.evaluate(() => (document.getElementById('game') as HTMLCanvasElement).toDataURL());

  await moveTo(page, { x: 320, y: 120 }); await step(page);
  const plain = await picture();
  await moveTo(page, cardAt(0, fight.battle!.hand.length)); await step(page);
  const overCard = await picture();
  await moveTo(page, ENEMY); await step(page);
  const overEnemy = await picture();

  expect(overCard).not.toBe(plain);
  expect(overEnemy).not.toBe(plain);
  expect(overEnemy).not.toBe(overCard);
});
