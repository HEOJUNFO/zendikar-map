// Playwright: the single-file build opened from disk, driven through the
// game-state hook (src/hook.ts). npm run smoke runs only the @boot test.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const config = JSON.parse(readFileSync('data/config.json', 'utf8'));
const build = (query: string): string => `${pathToFileURL(resolve('dist-single/index.html')).href}?${query}`;

/** Opens the build and collects every page error and console error. */
async function open(page: Page, query: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(build(query));
  // Until the game installs its hook, window.game is the canvas (an element's id is a window
  // property), so wait for the hook itself.
  await expect.poll(() => page.evaluate(() => typeof window.game?.step)).toBe('function');
  return errors;
}

/** What a check reads of the run at one moment: plain values, copied out of the live state. */
interface Seen {
  scene: string;
  screen: string;
  at: string;
  day: number;
  hp: number;
  gold: number;
  deck: number;
  energy: number | null;
  hand: string[] | null;
  enemies: { kind: string; hp: number; maxHp: number }[] | null;
}

test('boots to the title screen with no errors @boot', async ({ page }) => {
  const errors = await open(page, 'manual=1');
  expect(await page.evaluate(() => window.game!.scene)).toBe('title');
  const size = await page.locator('#game').boundingBox();
  expect(size && size.width > 0 && size.height > 0).toBe(true);
  expect(errors).toEqual([]);
});

test('a scripted run leaves Sea Gate, fights its first fight by the numbers, and the same seed repeats it exactly', async ({ page }) => {
  // ?manual=1 stops the loop, so only step() moves the game: one mechanism, no fake clock.
  // The inputs are the opening of the grow's reference replay: begin, go to the first place
  // offered, play the first card, end the turn.
  async function run(): Promise<{ errors: string[]; start: Seen; arrived: Seen; played: Seen; nextTurn: Seen }> {
    const errors = await open(page, `manual=1&seed=${config.seed}`);
    const seen = await page.evaluate(() => {
      const g = window.game!;
      type Card = { id: string };
      type Foe = { kind: string; hp: number; maxHp: number };
      type Live = { screen: string; run: { at: string; day: number; hp: number; gold: number; deck: Card[] }; battle: null | { energy: number; hand: Card[]; enemies: Foe[] } };
      const look = () => {
        const s = g.state as Live, b = s.battle;
        return {
          scene: g.scene, screen: s.screen, at: s.run.at, day: s.run.day, hp: s.run.hp, gold: s.run.gold, deck: s.run.deck.length,
          energy: b ? b.energy : null, hand: b ? b.hand.map(c => c.id) : null,
          enemies: b ? b.enemies.map(e => ({ kind: e.kind, hp: e.hp, maxHp: e.maxHp })) : null,
        };
      };
      g.press('Enter'); g.step(30);     // the title: begin the expedition
      const start = look();
      g.press('Digit1'); g.step(150);   // the map: the first place offered, and the trip there
      const arrived = look();
      g.press('Digit1'); g.step(60);    // the fight: the first card in hand
      const played = look();
      g.press('KeyE'); g.step(180);     // end the turn; the enemy acts and a new hand comes
      const nextTurn = look();
      return { start, arrived, played, nextTurn };
    });
    return { errors, ...seen };
  }

  const first = await run();

  // The expedition starts at Sea Gate with the starting deck, hp and gold.
  expect(first.start).toMatchObject({ scene: 'play', screen: 'map', at: 'sea-gate', day: 0, hp: config.player_hp.value, gold: config.start_gold.value, deck: 10 });
  // The first place offered is a day away; a run's first fight is a lesson: full energy, a full
  // hand that opens with the machete, and an enemy at the first fight's share of its hp.
  expect(first.arrived).toMatchObject({ screen: 'battle', day: 1, energy: config.energy.value, hp: config.player_hp.value });
  expect(first.arrived.at).not.toBe('sea-gate');
  expect(first.arrived.hand).toHaveLength(config.hand_size.value);
  expect(first.arrived.hand![0]).toBe('trusty-machete');
  const foe = first.arrived.enemies![0];
  expect(foe).toEqual({ kind: 'oran-rief-recluse', hp: Math.round(config.recluse_hp.value * config.first_fight_scale.value), maxHp: Math.round(config.recluse_hp.value * config.first_fight_scale.value) });
  // The machete costs 1 energy and deals its damage.
  expect(first.played.energy).toBe(config.energy.value - 1);
  expect(first.played.enemies![0].hp).toBe(foe.hp - config.machete_dmg.value);
  expect(first.played.hand).toHaveLength(config.hand_size.value - 1);
  // With no block, the recluse's bite lands in full; then the next turn brings energy and a hand.
  expect(first.nextTurn.hp).toBe(config.player_hp.value - config.recluse_atk.value);
  expect(first.nextTurn.energy).toBe(config.energy.value);
  expect(first.nextTurn.hand).toHaveLength(config.hand_size.value);
  expect(first.errors).toEqual([]);

  expect(await run()).toEqual(first);
});
