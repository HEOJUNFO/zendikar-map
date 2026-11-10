// Playwright: the expedition kept in this browser. The page is closed and opened again (a reload
// in the same browser context, so what the page stored is still there), and what the game then
// holds is read through its hook. Each test begins in a context of its own: nothing is kept from
// another test. The game is stepped through its hook (?manual=1).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const config = JSON.parse(readFileSync('data/config.json', 'utf8'));
const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as { stops: { id: string; cont: string; x: number; y: number; ux: number; uy: number; sea?: number[] }[]; views: Record<string, { x: number; y: number; s: number }> };
const v = (k: string): number => config[k].value;
const address = `${pathToFileURL(resolve('dist-single/index.html')).href}?manual=1&seed=${config.seed}&lang=en`;

// ---- where things are on the 640 x 360 screen (src/screens.ts) ----
const stopAt = (id: string) => { const s = world.stops.find(x => x.id === id)!, w = world.views[s.cont]; return { x: 6 + Math.round((s.ux - w.x) * w.s), y: 18 + Math.round((s.uy - w.y) * w.s) }; };
const portAt = (id: string) => { const s = world.stops.find(x => x.id === id)!; return { x: 6 + s.sea![0], y: 18 + s.sea![1] }; };   // a port's ship, on the water off it
const SAIL = { x: 566, y: 266 };
const CROSSING = Math.ceil(v('sail_time') * 60) + 30, WALK = Math.ceil(v('travel_time') * 60) + 60; // steps: the trip, and the stop opening

interface Seen {
  scene: string;
  screen: string;
  at: string;
  day: number;
  hp: number;
  gold: number;
  deck: string[];
  lands: string[];
  fight: null | { turn: number; hand: string[]; mana: string[]; inPlay: string[]; pile: string[]; drawPile: number; enemies: { kind: string; hp: number }[] };
  shop: null | { id: string; sold: boolean }[];
  event: null | { id: string; pick: number; got: (string | number)[][] };
  /** What the browser keeps: the saved screen, place and day, or null. */
  kept: null | { screen: string; at: string; day: number };
}

async function ready(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => typeof window.game?.step)).toBe('function');
}
async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(address);
  await ready(page);
  return errors;
}
/** The page closed and opened again in the same browser: what it kept is still there. */
async function reopen(page: Page): Promise<void> {
  await page.reload();
  await ready(page);
}
const step = (page: Page, n = 1): Promise<void> => page.evaluate(k => window.game!.step(k), n);
const press = (page: Page, code: string, steps = 3): Promise<void> => page.evaluate(([k, n]) => { window.game!.press(k as string); window.game!.step(n as number); }, [code, steps]);
async function click(page: Page, p: { x: number; y: number }): Promise<void> {
  const b = (await page.locator('#game').boundingBox())!;
  await page.mouse.move(b.x + (p.x * b.width) / 640, b.y + (p.y * b.height) / 360); await step(page);
  await page.mouse.down(); await step(page);
  await page.mouse.up(); await step(page);
}
const look = (page: Page): Promise<Seen> => page.evaluate(() => {
  type Card = { id: string };
  type Live = {
    screen: string;
    run: { at: string; day: number; hp: number; gold: number; deck: Card[]; lands: Card[] };
    battle: null | { turn: number; hand: Card[]; mana: string[]; lands: Card[]; landPile: Card[]; draw: Card[]; enemies: { kind: string; hp: number }[] };
    shop: null | { items: { id: string; sold: boolean }[] };
    event: null | { id: string; pick: number; got: (string | number)[][] };
  };
  const g = window.game!, s = g.state as Live, b = s.battle;
  const text = localStorage.getItem('zx-save'), k = text ? (JSON.parse(text) as { screen: string; run?: { at: string; day: number } }) : null;
  return {
    scene: g.scene, screen: s.screen, at: s.run.at, day: s.run.day, hp: s.run.hp, gold: s.run.gold, deck: s.run.deck.map(c => c.id), lands: s.run.lands.map(c => c.id),
    fight: b ? { turn: b.turn, hand: b.hand.map(c => c.id), mana: b.mana.slice(), inPlay: b.lands.map(c => c.id), pile: b.landPile.map(c => c.id), drawPile: b.draw.length, enemies: b.enemies.map(e => ({ kind: e.kind, hp: e.hp })) } : null,
    shop: s.shop ? s.shop.items.map(i => ({ id: i.id, sold: i.sold })) : null,
    event: s.event ? { id: s.event.id, pick: s.event.pick, got: s.event.got.map(g => g.slice()) } : null,
    kept: k ? { screen: k.screen, at: k.run ? k.run.at : '', day: k.run ? k.run.day : -1 } : null,
  };
});
/** From the title: across the sea to Midnight Pass (a camp), a rest there, and the map of Sejiri. */
async function toSejiri(page: Page): Promise<Seen> {
  await press(page, 'Enter');
  await click(page, SAIL);
  await click(page, portAt('midnight-pass'));
  await step(page, CROSSING);
  await press(page, 'Digit1');             // the camp: rest
  return look(page);
}
/** From the title: the walk to Oran-Rief, and the first turn of the fight there. */
async function toFirstFight(page: Page): Promise<Seen> {
  await press(page, 'Enter');
  await click(page, stopAt('oran-rief'));
  await step(page, WALK + 60);
  return look(page);
}

test('an expedition left on the map goes on from the same place, day, hp, gold, deck and lands when the page is opened again', async ({ page }) => {
  const errors = await open(page);
  const before = await toSejiri(page);

  await reopen(page);
  const title = await look(page);
  await press(page, 'Enter');
  const after = await look(page);

  expect(before).toMatchObject({ scene: 'play', screen: 'map', at: 'midnight-pass' });
  expect(before.day).toBeGreaterThan(0);
  expect(title.scene).toBe('title');
  expect(title.kept).toEqual({ screen: 'map', at: 'midnight-pass', day: before.day });
  expect(after).toEqual(before);
  expect(errors).toEqual([]);
});

test('a fight left midway begins again from its first turn, with the hand, hp and enemies it began with, and plays out the same', async ({ page }) => {
  const errors = await open(page);
  const first = await toFirstFight(page);
  await press(page, 'KeyZ', 60);           // a land
  await press(page, 'KeyE', 300);          // end the turn: the enemy acts
  const second = await look(page);

  await reopen(page);
  await press(page, 'Enter', 120);
  const again = await look(page);
  await press(page, 'KeyZ', 60);
  await press(page, 'KeyE', 300);
  const againSecond = await look(page);

  expect(first.screen).toBe('battle');
  expect(first.fight!.turn).toBe(1);
  expect(second.fight!.turn).toBe(2);
  expect(second.hp).toBeLessThan(first.hp);                    // the fight had cost something when the page was closed
  expect(again).toEqual(first);                                // and all of it is given back
  expect(againSecond).toEqual(second);                         // the same chance: the same turn again
  expect(errors).toEqual([]);
});

test('what is bought in a market stays bought: the page opened again shows it sold, the gold spent and the card owned', async ({ page }) => {
  const errors = await open(page);
  await press(page, 'Enter');
  await click(page, SAIL);
  await click(page, portAt('affa'));
  await step(page, CROSSING);
  await page.evaluate(() => { (window.game!.state as { run: { gold: number } }).run.gold = 300; });   // gold enough for any card
  const market = await look(page);
  await press(page, 'Digit1');             // buy the first card
  const bought = await look(page);

  await reopen(page);
  await press(page, 'Enter');
  const after = await look(page);

  expect(market.screen).toBe('shop');
  expect(bought.shop![0].sold).toBe(true);
  expect(bought.gold).toBeLessThan(300);
  expect([...bought.deck, ...bought.lands]).toContain(market.shop![0].id);
  expect(after).toEqual(bought);
  expect(errors).toEqual([]);
});

test('a way taken at a happening stays taken: the page opened again shows its outcome and does not offer the choice again', async ({ page }) => {
  const errors = await open(page);
  await press(page, 'Enter');
  await click(page, stopAt('halimar'));    // a site: its happening is the stop
  await step(page, WALK + 60);
  const offered = await look(page);
  await press(page, 'Digit1');             // the first way: pay the toll, and rest
  const taken = await look(page);

  await reopen(page);
  await press(page, 'Enter');
  const after = await look(page);
  await press(page, 'Digit2');             // the other way, were the choice still open
  const pressed = await look(page);

  expect(offered.event).toEqual({ id: 'halimar-deep', pick: -1, got: [] });
  // what the way did is kept as what happened (the toll paid, no hp to give back to a leader at full hp),
  // not as words: the screen says it in whichever language it is in when it is drawn
  expect(taken.event).toEqual({ id: 'halimar-deep', pick: 0, got: [['pay', v('ev_toll')], ['heal', 0]] });
  expect(taken.gold).toBe(v('start_gold') - v('ev_toll'));
  expect(after).toEqual(taken);
  expect(pressed.event).toEqual(taken.event);
  expect(pressed.gold).toBe(taken.gold);
  expect(errors).toEqual([]);
});

test('an expedition that has ended is forgotten: the page opened again begins a new one from Sea Gate', async ({ page }) => {
  const errors = await open(page);
  await toFirstFight(page);
  await page.evaluate(() => { (window.game!.state as { run: { hp: number } }).run.hp = 1; });   // one blow from the end
  for (let turn = 0; turn < 4 && (await look(page)).scene === 'play'; turn++) await press(page, 'KeyE', 360);
  const ended = await look(page);

  await reopen(page);
  const title = await look(page);
  await press(page, 'Enter');
  const after = await look(page);

  expect(ended.scene).toBe('over');
  expect(ended.kept).toBeNull();
  expect(title.kept).toBeNull();
  expect(after).toMatchObject({ scene: 'play', screen: 'map', at: 'sea-gate', day: 0, hp: v('player_hp'), gold: v('start_gold') });
  expect(errors).toEqual([]);
});

test('a new expedition over a kept one must be asked for twice: once changes nothing, Esc takes the asking back, twice begins anew', async ({ page }) => {
  const errors = await open(page);
  const before = await toSejiri(page);
  await reopen(page);

  await press(page, 'KeyN');
  const asked = await look(page);
  await press(page, 'Escape');
  await press(page, 'KeyN');
  const askedAgain = await look(page);
  await press(page, 'KeyN');
  const begun = await look(page);

  expect(asked.scene).toBe('title');
  expect(asked.kept).toEqual({ screen: 'map', at: 'midnight-pass', day: before.day });
  expect(askedAgain.scene).toBe('title');
  expect(askedAgain.kept).toEqual(asked.kept);
  expect(begun).toMatchObject({ scene: 'play', screen: 'map', at: 'sea-gate', day: 0 });
  expect(begun.kept).toEqual({ screen: 'map', at: 'sea-gate', day: 0 });
  expect(errors).toEqual([]);
});

test('a kept expedition that other content wrote is not gone on with: Enter begins a new one, and its first checkpoint takes the old one\'s place', async ({ page }) => {
  const errors = await open(page);
  const before = await toSejiri(page);
  await page.evaluate(() => {              // the same save, as another version of the game would have marked it
    const kept = JSON.parse(localStorage.getItem('zx-save')!);
    localStorage.setItem('zx-save', JSON.stringify({ ...kept, stamp: 'other-content' }));
  });

  await reopen(page);
  await press(page, 'Enter');
  const after = await look(page);

  expect(before.at).toBe('midnight-pass');
  expect(after).toMatchObject({ scene: 'play', screen: 'map', at: 'sea-gate', day: 0 });
  expect(after.kept).toEqual({ screen: 'map', at: 'sea-gate', day: 0 });
  expect(errors).toEqual([]);
});

test('a new expedition begun on a later visit is another world, not the first one over again', async ({ page }) => {
  // The page as a player has it: its own loop running, no seed in the address. (A check's page,
  // with ?manual=1 or a seed, begins from the same world every time: boot.spec.ts counts on that.)
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const world = (): Promise<string> => page.evaluate(() => { const r = (window.game!.state as { run: { enc: unknown; rough: string[] } }).run; return JSON.stringify([r.rough, r.enc]); });
  const scene = (): Promise<string> => page.evaluate(() => window.game!.scene);
  await page.goto(`${pathToFileURL(resolve('dist-single/index.html')).href}?lang=en`);
  await ready(page);
  await page.keyboard.press('Enter');
  await expect.poll(scene).toBe('play');
  const first = await world();

  await reopen(page);
  await page.keyboard.press('KeyN');       // a new expedition, asked for twice over the kept one
  await page.waitForTimeout(200);          // the page's own loop takes the first asking before the second comes
  await page.keyboard.press('KeyN');
  await expect.poll(scene).toBe('play');
  const second = await world();

  expect(JSON.parse(first)[0]).toHaveLength(v('rough_stops'));
  expect(second).not.toBe(first);
  expect(errors).toEqual([]);
});
