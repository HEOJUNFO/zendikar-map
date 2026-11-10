// Playwright: the single-file build opened from disk, driven through the
// game-state hook (src/hook.ts). npm run smoke runs only the @boot test.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const config = JSON.parse(readFileSync('data/config.json', 'utf8'));
const world = JSON.parse(readFileSync('data/world.json', 'utf8')) as { stops: { id: string; cont: string; ux: number; uy: number }[] };
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
  lands: number;
  mana: string[] | null;
  inPlay: string[] | null;
  hand: string[] | null;
  party: string[] | null;
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
  // The inputs: begin, go to the first place offered, play a land, play the first card in hand
  // (a creature), end the turn.
  // Each visit is a first visit: nothing is kept from the one before, so the second run begins a
  // new expedition as the first did, and does not go on with the fight the first one left
  // (what a second visit finds kept is save.spec.ts's to check).
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* no storage: nothing is kept anyway */ } });
  async function run(): Promise<{ errors: string[]; start: Seen; arrived: Seen; landed: Seen; played: Seen; nextTurn: Seen }> {
    const errors = await open(page, `manual=1&seed=${config.seed}`);
    const seen = await page.evaluate(([stops, hopFar]) => {
      const g = window.game!;
      type Card = { id: string };
      type Foe = { kind: string; hp: number; maxHp: number };
      type Live = {
        screen: string; run: { at: string; day: number; hp: number; gold: number; deck: Card[]; lands: Card[] };
        battle: null | { mana: string[]; lands: Card[]; hand: Card[]; party: { id: string | null }[]; enemies: Foe[] };
      };
      const look = () => {
        const s = g.state as Live, b = s.battle;
        return {
          scene: g.scene, screen: s.screen, at: s.run.at, day: s.run.day, hp: s.run.hp, gold: s.run.gold, deck: s.run.deck.length, lands: s.run.lands.length,
          mana: b ? b.mana.slice() : null, inPlay: b ? b.lands.map(c => c.id) : null, hand: b ? b.hand.map(c => c.id) : null,
          party: b ? b.party.map(m => m.id || 'leader') : null,
          enemies: b ? b.enemies.map(e => ({ kind: e.kind, hp: e.hp, maxHp: e.maxHp })) : null,
        };
      };
      g.press('Enter'); g.step(30);     // the title: begin the expedition
      const start = look();
      // the map lists the places of this continent by days, then by distance: Oran-Rief's number on it
      const rough = (g.state as unknown as { run: { rough: string[] } }).run.rough;
      const here = stops.find(s => s.id === 'sea-gate')!;
      const list = stops.filter(s => s.cont === here.cont && s.id !== here.id)
        .map(s => { const far = Math.hypot(s.ux - here.ux, s.uy - here.uy); return { id: s.id, far, days: (far <= hopFar ? 1 : 2) + (rough.includes(s.id) ? 1 : 0) }; })
        .sort((a, b) => a.days - b.days || a.far - b.far);
      g.press('Digit' + (list.findIndex(o => o.id === 'oran-rief') + 1)); g.step(150);   // the walk there
      const arrived = look();
      g.press('KeyZ'); g.step(60);      // the fight: a land from the pile
      const landed = look();
      g.press('Digit1'); g.step(60);    // the first card in hand
      const played = look();
      g.press('KeyE'); g.step(220);     // end the turn: strikes, guards, the enemy's move, a new hand
      const nextTurn = look();
      return { start, arrived, landed, played, nextTurn };
    }, [world.stops, config.hop_far.value] as const);
    return { errors, ...seen };
  }

  const first = await run();
  const v = (k: string): number => config[k].value;

  // The expedition starts at Sea Gate with the starting deck and lands, hp and gold.
  expect(first.start).toMatchObject({ scene: 'play', screen: 'map', at: 'sea-gate', day: 0, hp: v('player_hp'), gold: v('start_gold'), deck: 10, lands: 5 });
  // Oran-Rief is a day's walk from Sea Gate, or two when the Roil tore the road up. A run's first fight is a lesson: the camp's lands in
  // play and their mana, a full hand that opens with a creature, the leader alone on the field,
  // and an enemy at the first fight's share of its hp.
  expect(first.arrived).toMatchObject({ screen: 'battle', at: 'oran-rief', hp: v('player_hp'), party: ['leader'] });
  expect([1, 2]).toContain(first.arrived.day);
  expect(first.arrived.inPlay).toEqual(['plains', 'island']);
  expect(first.arrived.mana).toEqual(['W', 'U']);
  expect(first.arrived.hand).toHaveLength(v('hand_size'));
  expect(first.arrived.hand![0]).toBe('welkin-tern');
  const foeHp = Math.round(v('recluse_hp') * v('foe_hp') * v('first_fight_scale'));
  expect(first.arrived.enemies![0]).toEqual({ kind: 'oran-rief-recluse', hp: foeHp, maxHp: foeHp });
  // A land played makes its mana at once.
  expect(first.landed.inPlay).toHaveLength(v('start_lands') + 1);
  expect(first.landed.mana).toHaveLength(v('start_lands') + 1);
  // The tern costs 1 mana, blue: it takes the field and stays there.
  expect(first.played.party).toEqual(['leader', 'welkin-tern']);
  expect(first.played.mana).toHaveLength(v('start_lands'));
  expect(first.played.mana).not.toContain('U');
  expect(first.played.hand).toHaveLength(v('hand_size') - 1);
  // The turn ends: the leader strikes, the tern just came so it guards, and the recluse's bite
  // lands on what the guard leaves. Then every land in play makes mana again, and a new hand comes.
  const bite = Math.round(v('recluse_atk') * v('foe_damage'));
  expect(first.nextTurn.enemies![0].hp).toBe(foeHp - v('leader_atk'));
  expect(first.nextTurn.hp).toBe(v('player_hp') - Math.max(0, bite - v('welkin_tern_def')));
  expect(first.nextTurn.mana).toHaveLength(v('start_lands') + 1);
  expect(first.nextTurn.hand).toHaveLength(v('hand_size'));
  expect(first.nextTurn.party).toEqual(['leader', 'welkin-tern']);
  expect(first.errors).toEqual([]);

  expect(await run()).toEqual(first);
});
