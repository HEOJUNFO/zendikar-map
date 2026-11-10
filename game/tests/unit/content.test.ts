// Vitest: the game's content, read as a whole. Every card and enemy has its words in both
// languages, its picture, its numbers in data/config.json and a place it can be met; every card
// is used as the kind its type line says, in the colour the data gives it; every card of the map
// project's data for the sets the game holds has a role. A set added later is held to the same
// rules.
//
// The content sits in modules that also draw, so the test gives them the little of a browser
// their loading touches (a canvas that draws nothing, an empty address, no saved language).
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const ctx = { setTransform() {}, imageSmoothingEnabled: false };
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx };
  Object.assign(globalThis, {
    window: globalThis,
    location: { search: '', protocol: 'file:', hostname: '' },
    document: { documentElement: {}, getElementById: () => canvas },
    localStorage: { getItem: () => null, setItem() {} },
    addEventListener() {},
    innerWidth: 640, innerHeight: 360, devicePixelRatio: 1,
  });
});
vi.mock('../../src/dev/tune', () => ({})); // the dev server's tweak panel: not part of the content

import '../../src/screens2'; // the modules load in the page's order from the last one, as main.ts loads them
import config from '../../data/config.json';
import colors from '../../data/colors.json';
import { LORE, WORLD } from '../../src/game/data';
import { setState } from '../../src/game/state';
import type { Pen } from '../../src/art';
import { STR, setLang } from '../../src/text';
import { BASIC_OF, CARDS, LAND_OF, POOLS, STARTER, STARTER_LANDS, cardFace, cardKw, cardName, cardText, family } from '../../src/cards';
import { PLACE_LAND } from '../../src/cards2';
import { ENEMIES, enemyName } from '../../src/enemies';
import { ROSTER } from '../../src/enemies2';
import { moveNote, traitLines } from '../../src/text2';
import { ART_PAINT } from '../../src/cardart';
import { SPRITES2 } from '../../src/sprites2';
import { TRAPS } from '../../src/battle';
import { HAPPENINGS } from '../../src/events';
import { STOP_TEXT, stopName } from '../../src/text';
import { cardKind } from '../../src/game/rules';

const sources = import.meta.glob('../../src/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const code = Object.values(sources).join('\n');
const sliders = config as unknown as Record<string, { value: number; min: number; max: number; step: number } | number | undefined>;
const isSlider = (k: unknown): boolean => typeof k === 'string' && typeof sliders[k] === 'object';
const LANGS = ['ko', 'en'] as const;
const icons = new Set([...code.matchAll(/ICON\.([a-zA-Z]+) = /g)].map(m => m[1]));

// A pen that draws nothing and refuses a number that is not one: a picture that would paint NaN fails here.
function dryPen(): Pen {
  const p: Record<string, unknown> = { cols: [] };
  for (const k of ['c', 'r', 'e', 'p', 'l', 'px', 'atop', 'under', 'over']) {
    p[k] = (...args: unknown[]) => {
      for (const a of args) if (typeof a === 'number' && !isFinite(a)) throw new Error('not a number in ' + k);
      if (k === 'p' || k === 'l') for (const v of args[0] as unknown[]) if (typeof v !== 'number' || !isFinite(v)) throw new Error('a bad point in ' + k);
      return p;
    };
  }
  return p as unknown as Pen;
}
// The words an effect may take in place of a number.
const WORDS = new Set(['creature', 'big']);
// Every value name inside a card's effects (fx, lf, on, quest ...), however deep.
function valueNames(x: unknown, out: string[] = []): string[] {
  if (Array.isArray(x)) {
    if (typeof x[0] === 'string' && !Array.isArray(x[1])) x.slice(1).forEach(a => { if (typeof a === 'string' && !WORDS.has(a)) out.push(a); else valueNames(a, out); });
    else x.forEach(a => valueNames(a, out));
  } else if (x && typeof x === 'object') Object.values(x).forEach(v => { if (typeof v === 'string') out.push(v); else valueNames(v, out); });
  return out;
}

setState({ t: 0, score: 0, gained: '', won: false, screen: 'map', run: { hp: config.player_hp.value, maxHp: config.player_hp.value }, battle: null, reward: null, shop: null, camp: null, travel: null, banner: null, pending: null, event: null });

describe('data/config.json', () => {
  it('holds a seed, and a value with min, max and step under every other name', () => {
    const bad = Object.keys(sliders).filter(k => k !== 'seed').filter(k => {
      const s = sliders[k];
      return !(typeof s === 'object' && [s.value, s.min, s.max, s.step].every(n => typeof n === 'number' && isFinite(n)));
    });
    expect(typeof sliders.seed).toBe('number');
    expect(bad).toEqual([]);
  });

  it('gives every rarity a card can have a weight, for the wilds and for a great beast', () => {
    const rarities = [...new Set(Object.values(LORE).map(l => l.rarity))];

    const without = rarities.filter(r => !isSlider('weight_' + r) || !isSlider('elite_weight_' + r));

    expect(rarities.length).toBeGreaterThan(0);
    expect(without).toEqual([]);
  });
});

describe('cards', () => {
  const ids = Object.keys(CARDS);

  it('each has rules text, a name, lore and help for its keywords in both languages', () => {
    const bad: string[] = [];
    for (const lang of LANGS) {
      setLang(lang);
      for (const id of ids) {
        const text = cardText(id);
        if (!text || /undefined|NaN|\{[0-9a-zA-Z]+\}/.test(text)) bad.push(`${id}: text (${lang}): ${text}`);
        if (!cardName(id).text) bad.push(`${id}: no name (${lang})`);
        if (!CARDS[id].lore || !CARDS[id].lore[lang]) bad.push(`${id}: no lore (${lang})`);
        for (const k of cardKw(id)) if (!STR['kwh_' + k]) bad.push(`${id}: no help for the keyword ${k}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('each names only values that data/config.json holds', () => {
    const bad: string[] = [];
    for (const id of ids) {
      const d = CARDS[id];
      const names = valueNames([d.fx, d.kick && d.kick.fx, d.rally, d.on, d.passive, d.gear, d.quest && [d.quest.need, d.quest.reward, d.quest.then]])
        .concat(d.atk ? [d.atk] : [], d.def ? [d.def] : []);
      for (const n of names) if (!isSlider(n)) bad.push(`${id}: ${n}`);
    }
    expect(bad).toEqual([]);
  });

  it('each shows icons the game draws on its face', () => {
    const bad: string[] = [];
    for (const id of ids) for (const f of cardFace(id)) if (!icons.has(f[0])) bad.push(`${id}: ${f[0]}`);
    expect(bad).toEqual([]);
  });

  it('each has a picture, and the picture paints', () => {
    const bad: string[] = [];
    for (const id of ids) {
      const paint = ART_PAINT[CARDS[id].art || id];
      if (!paint) { bad.push(`${id}: no picture`); continue; }
      try { paint(dryPen()); } catch (e) { bad.push(`${id}: ${(e as Error).message}`); }
    }
    expect(bad).toEqual([]);
  });

  it('each is used as the kind its type line says, in the colour the data gives it', () => {
    const bad: string[] = [];
    const paints = colors as Record<string, string>;
    for (const id of ids) {
      const d = CARDS[id], lore = LORE[id];
      if (!STR['kd_' + d.kind]) bad.push(`${id}: kind ${d.kind}`);
      if (!lore) continue; // a basic land: not in the map project's data
      if (d.kind !== cardKind(lore.type)) bad.push(`${id}: used as ${d.kind}, but its type line is "${lore.type}"`);
      if (d.color !== paints[id]) bad.push(`${id}: colour ${d.color}, but the data says ${paints[id]}`);
      if (!!d.ally !== /\bAlly\b/.test(lore.type)) bad.push(`${id}: Ally in one place and not the other`);
    }
    expect(bad).toEqual([]);
  });

  it('each has what its kind needs: a creature its attack and guard, equipment what it gives, a land its mana', () => {
    const bad: string[] = [];
    for (const id of ids) {
      const d = CARDS[id], fam = family(d);
      if ((d.kind === 'creature') !== (isSlider(d.atk) && isSlider(d.def))) bad.push(`${id}: attack and guard`);
      if (d.kind === 'equipment' && !d.gear) bad.push(`${id}: equipment that gives nothing to wear`);
      if (!!d.gear !== (fam === 'gear') || (fam === 'gear') !== (d.target === 'mate' && !!d.gear)) bad.push(`${id}: gear and who wears it`);
      if (d.kind === 'land' && (!d.color || d.cost !== 0)) bad.push(`${id}: a land makes mana and costs none`);
      if (d.kind !== 'land' && !(d.cost >= 1)) bad.push(`${id}: a card that costs no mana needs no colour`);
      if (d.trap && (d.kind !== 'instant' || !TRAPS[d.trap])) bad.push(`${id}: trap ${d.trap}`);
      if (d.quest && d.kind !== 'enchantment') bad.push(`${id}: a quest is an enchantment`);
      if (d.rally && !d.ally) bad.push(`${id}: rally on one that is not an Ally`);
      if (d.kick && !(d.kick.cost >= 1 && d.kick.fx.length && ['enemy', 'mate', 'none'].includes(d.kick.target) && fam !== 'gear' && fam !== 'land')) bad.push(`${id}: a kicker has a cost, effects and someone to play it on`);
      if ((d.fly || d.pierce || d.walk || d.haste || d.vigil || d.defender) && d.kind !== 'creature') bad.push(`${id}: what a creature prints, on a card that is not one`);
      if (d.walk && !BASIC_OF[d.walk]) bad.push(`${id}: landwalk over no land`);
    }
    expect(bad).toEqual([]);
  });

  it('each can be found: in the starting deck or lands, as a continent\'s land, as a basic land, or in a continent\'s cards', () => {
    const found = new Set([...Object.values(POOLS).flat(), ...STARTER, ...STARTER_LANDS, ...Object.values(LAND_OF), ...Object.values(BASIC_OF)]);
    expect(ids.filter(id => !found.has(id))).toEqual([]);
    expect(Object.values(POOLS).flat().filter(id => !CARDS[id])).toEqual([]);
  });

  it('each but a basic land is a card of the map project\'s data', () => {
    const basic = new Set(Object.values(BASIC_OF));
    expect(ids.filter(id => !LORE[id] && !basic.has(id))).toEqual([]);
    expect([...basic].filter(id => !CARDS[id] || !CARDS[id].basic)).toEqual([]);
  });

  it('a place\'s own land is a land, at a stop on the map', () => {
    const bad = Object.entries(PLACE_LAND).filter(([stop, id]) => !WORLD.stops.some(s => s.id === stop) || !CARDS[id] || CARDS[id].kind !== 'land');
    expect(bad).toEqual([]);
  });

  it('the starting lands can pay for every card of the starting deck, and the deck holds no land', () => {
    const made = new Set(STARTER_LANDS.flatMap(id => CARDS[id].color.split('')));
    const unpaid = STARTER.filter(id => CARDS[id].kind === 'land' || !CARDS[id].color.split('').every((c: string) => made.has(c)));
    expect(unpaid).toEqual([]);
    expect(STARTER_LANDS.filter(id => CARDS[id].kind !== 'land')).toEqual([]);
  });

  it('every colour has a basic land, and every continent\'s land is one', () => {
    expect(Object.keys(BASIC_OF).sort()).toEqual(['B', 'G', 'R', 'U', 'W']);
    expect(Object.entries(BASIC_OF).filter(([c, id]) => CARDS[id].color !== c)).toEqual([]);
    expect(Object.values(LAND_OF).filter(id => !CARDS[id].basic)).toEqual([]);
  });
});

describe('enemies', () => {
  const kinds = Object.keys(ENEMIES);
  const NUMBERS = ['d', 'hits', 'b', 'blk', 'str', 'burn', 'mill', 'rob', 'jam', 'web', 'self', 'heal', 'curse'];

  it('each has a name, lore, and words for its moves and traits in both languages', () => {
    const bad: string[] = [];
    for (const lang of LANGS) {
      setLang(lang);
      for (const k of kinds) {
        const d = ENEMIES[k];
        if (!enemyName(k).text) bad.push(`${k}: no name (${lang})`);
        if (!d.lore || !d.lore[lang]) bad.push(`${k}: no lore (${lang})`);
        for (const t of traitLines(k)) if (/undefined|\{n\}/.test(t)) bad.push(`${k}: trait text (${lang}): ${t}`);
        d.moves.forEach((m, i) => {
          if (!m.name || !m.name[lang]) bad.push(`${k}: move ${i} has no name (${lang})`);
          const note = moveNote(m);
          if (/undefined|\{n\}/.test(note)) bad.push(`${k}: move ${i} note (${lang}): ${note}`);
        });
      }
    }
    expect(bad).toEqual([]);
  });

  it('each names only values that data/config.json holds', () => {
    const bad: string[] = [];
    for (const k of kinds) {
      const d = ENEMIES[k];
      if (!isSlider(d.hp)) bad.push(`${k}: hp ${d.hp}`);
      for (const m of d.moves) for (const f of NUMBERS) if (typeof m[f] === 'string' && !isSlider(m[f])) bad.push(`${k}: ${m[f]}`);
      for (const t in d.traits || {}) if (typeof d.traits[t] === 'string' && !isSlider(d.traits[t])) bad.push(`${k}: ${d.traits[t]}`);
    }
    expect(bad).toEqual([]);
  });

  it('each is a card of the map project\'s data', () => {
    expect(kinds.filter(k => !LORE[k])).toEqual([]);
  });

  it('each but the Roil Elemental, which is drawn live, has a figure, and the figure paints', () => {
    const drawn = new Set([...Object.keys(SPRITES2), ...[...code.matchAll(/SPR\['([a-z-]+)'\] = /g)].map(m => m[1])]);
    const bad: string[] = [];
    for (const k of kinds) {
      if (k !== 'roil-elemental' && !drawn.has(k)) bad.push(`${k}: no figure`);
      if (SPRITES2[k]) { try { SPRITES2[k][2](dryPen()); } catch (e) { bad.push(`${k}: ${(e as Error).message}`); } }
    }
    expect(bad).toEqual([]);
  });

  it('each can be met: at a stop, called by another enemy, or at the journey\'s end', () => {
    const met = new Set(['roil-elemental']);
    for (const r of Object.values(ROSTER)) { for (const g of r.wild || []) g.forEach(k => met.add(k)); for (const k of r.elite || []) met.add(k); }
    for (const k of kinds) for (const m of ENEMIES[k].moves) if (m.k === 'summon') met.add(m.kind);
    expect(kinds.filter(k => !met.has(k))).toEqual([]);
    expect([...met].filter(k => !ENEMIES[k])).toEqual([]);
  });
});

describe('the map', () => {
  it('has someone to meet at every wild place and great beast\'s ground, and no encounter off the map', () => {
    expect(WORLD.stops.filter(s => (s.cls === 'wild' || s.cls === 'elite') && !ROSTER[s.id]).map(s => s.id)).toEqual([]);
    expect(Object.keys(ROSTER).filter(id => !WORLD.stops.some(s => s.id === id))).toEqual([]);
  });

  it('gives every stop a kind the game knows, a note and a name in both languages', () => {
    const bad: string[] = [];
    for (const s of WORLD.stops) {
      if (!['town', 'wild', 'elite', 'camp', 'site'].includes(s.cls) || !STR['cls_' + s.cls]) bad.push(`${s.id}: kind ${s.cls}`);
      if (!STOP_TEXT[s.id] || !STOP_TEXT[s.id].ko || !STOP_TEXT[s.id].en) bad.push(`${s.id}: no note`);
      for (const lang of LANGS) { setLang(lang); if (!stopName(s).text) bad.push(`${s.id}: no name (${lang})`); }
      setLang('ko'); if (!s.ko && !stopName(s).star) bad.push(`${s.id}: no Korean name, official or the game's own`);
    }
    expect(bad).toEqual([]);
  });

  it('has a map of its own for every continent, with all its stops on it, and one port to land at', () => {
    const bad: string[] = [];
    for (const cont of Object.keys(WORLD.continents)) {
      const v = WORLD.views[cont], mine = WORLD.stops.filter(s => s.cont === cont);
      if (!v || !mine.length) { bad.push(`${cont}: no map or no stops`); continue; }
      if (mine.filter(s => s.port).length !== 1) bad.push(`${cont}: ports ${mine.filter(s => s.port).length}`);
      for (const s of mine) { const x = (s.ux - v.x) * v.s, y = (s.uy - v.y) * v.s; if (x < 12 || y < 12 || x > WORLD.w - 12 || y > WORLD.h - 12) bad.push(`${s.id}: off its continent's map (${Math.round(x)}, ${Math.round(y)})`); }
    }
    expect(bad).toEqual([]);
  });
});

describe('the ways by sea', () => {
  // the lands as the world map draws them, and the rule the ways were made by: a cell of the map
  // (2 px) is sea when its middle lies on none of the lands (tools/gen-world.mjs)
  const rings = WORLD.lands.map(l => { const r: number[][] = []; for (let i = 0; i < l.pts.length; i += 2) r.push([l.pts[i], l.pts[i + 1]]); return r; });
  const inRing = (x: number, y: number, r: number[][]): boolean => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const dry = (x: number, y: number): boolean => { const mx = Math.floor(x / 2) * 2 + 1, my = Math.floor(y / 2) * 2 + 1; return rings.some(r => inRing(mx, my, r)); };
  const ports = WORLD.stops.filter(s => s.port);
  const way = (a: string, b: string) => WORLD.ways[a + '|' + b] || WORLD.ways[b + '|' + a];

  it('every port has a roadstead on the water, and no other stop has one', () => {
    expect(ports.filter(p => !p.sea || p.sea.length !== 2 || dry(p.sea[0], p.sea[1])).map(p => p.id)).toEqual([]);
    expect(WORLD.stops.filter(s => !s.port && s.sea).map(s => s.id)).toEqual([]);
  });

  it('there is one way between every two ports, from the one\'s roadstead to the other\'s, and no way to anywhere else', () => {
    const bad: string[] = [];
    for (const a of ports) for (const b of ports) {
      if (a.id >= b.id) continue;
      const fwd = WORLD.ways[a.id + '|' + b.id], back = WORLD.ways[b.id + '|' + a.id];
      if (!!fwd === !!back) { bad.push(`${a.id}, ${b.id}: ${fwd ? 'two ways' : 'no way'}`); continue; }
      const w = fwd || back, from = fwd ? a : b, to = fwd ? b : a, n = w.pts.length;
      if (w.pts[0] !== from.sea![0] || w.pts[1] !== from.sea![1] || w.pts[n - 2] !== to.sea![0] || w.pts[n - 1] !== to.sea![1]) bad.push(`${a.id}, ${b.id}: does not run from roadstead to roadstead`);
    }
    expect(bad).toEqual([]);
    expect(Object.keys(WORLD.ways)).toHaveLength(ports.length * (ports.length - 1) / 2);
  });

  it('every way keeps to the water: no point along it lies on land', () => {
    const bad: string[] = [];
    for (const key in WORLD.ways) {
      const p = WORLD.ways[key].pts; let onLand = 0, all = 0;
      for (let i = 2; i < p.length; i += 2) {
        const n = Math.ceil(Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]));
        for (let k = 0; k <= n; k++) { all++; if (dry(p[i - 2] + (p[i] - p[i - 2]) * k / n, p[i - 1] + (p[i + 1] - p[i - 1]) * k / n)) onLand++; }
      }
      if (onLand || all < 2) bad.push(`${key}: ${onLand} of ${all} points on land`);
    }
    expect(bad).toEqual([]);
  });

  it('a way\'s length is the length of its line, in the map\'s units, and no shorter than the straight line between its ends', () => {
    const bad: string[] = [];
    for (const key in WORLD.ways) {
      const w = WORLD.ways[key], p = w.pts; let px = 0;
      for (let i = 2; i < p.length; i += 2) px += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
      const straight = Math.hypot(p[p.length - 2] - p[0], p[p.length - 1] - p[1]);
      if (Math.abs(w.len - px / WORLD.scale) > 1 || px < straight - 0.01) bad.push(`${key}: len ${w.len}, its line ${Math.round(px / WORLD.scale)}`);
    }
    expect(bad).toEqual([]);
  });

  it('from Sea Gate some crossings take two days and some three: a near continent and a far one are not the same choice', () => {
    const days = ports.filter(p => p.id !== 'sea-gate').map(p => (way('sea-gate', p.id).len <= config.sail_far.value ? 2 : 3));

    expect(days).toContain(2);
    expect(days).toContain(3);
  });
});

describe('happenings', () => {
  const OPS: Record<string, number> = { heal: 1, hurt: 1, gain: 1, pay: 1, lose: 1, delay: 1, haste: 1, vigor: 1, card: 1, land: 1, chance: 3 };
  // every effect of a way is one the game knows, with a value data/config.json holds or a card that exists
  const check = (fx: unknown[], bad: string[], where: string): void => {
    for (const f of fx as unknown[][]) {
      if (!(f[0] as string in OPS) || f.length !== OPS[f[0] as string] + 1) { bad.push(`${where}: ${JSON.stringify(f)}`); continue; }
      if (f[0] === 'chance') { if (!isSlider(f[1])) bad.push(`${where}: odds ${f[1]}`); check(f[2] as unknown[], bad, where); check(f[3] as unknown[], bad, where); }
      else if (f[0] === 'card') { if (f[1] !== 'pool' && !CARDS[f[1] as string]) bad.push(`${where}: card ${f[1]}`); }
      else if (f[0] === 'land') { if (f[1] !== 'basic' && !(CARDS[f[1] as string] && CARDS[f[1] as string].kind === 'land')) bad.push(`${where}: land ${f[1]}`); }
      else if (!isSlider(f[1])) bad.push(`${where}: ${f[1]}`);
    }
  };

  it('each has its words in both languages and two ways whose effects the game knows', () => {
    const bad: string[] = [];
    const ids = new Set<string>();
    for (const h of HAPPENINGS) {
      if (ids.has(h.id)) bad.push(`${h.id}: twice`); ids.add(h.id);
      for (const w of [h.title, h.text, h.ways[0].label, h.ways[0].after, h.ways[1].label, h.ways[1].after]) if (!w || !w.ko || !w.en) bad.push(`${h.id}: words missing`);
      if (h.ways.length !== 2) bad.push(`${h.id}: ways ${h.ways.length}`);
      h.ways.forEach((w, i) => check(w.fx, bad, `${h.id} way ${i + 1}`));
      if (h.ways.every(w => w.fx.some(f => f[0] === 'pay'))) bad.push(`${h.id}: both ways cost gold, so one with none has no way through`);
      if (h.ways.every(w => !w.fx.length)) bad.push(`${h.id}: neither way does anything, so there is nothing to choose`);
    }
    expect(bad).toEqual([]);
  });

  it('each is met somewhere: a site at its own stop, the others on a walk or a crossing', () => {
    const bad: string[] = [];
    for (const h of HAPPENINGS) {
      if (h.at === 'site') { const s = WORLD.stops.find(q => q.id === h.stop); if (!s || s.cls !== 'site') bad.push(`${h.id}: its stop ${h.stop} is not a site`); }
      else if (h.at !== 'road' && h.at !== 'sea') bad.push(`${h.id}: met ${h.at}`);
      else if (h.stop) bad.push(`${h.id}: a stop, though it is met on the way`);
      if (h.cont && !WORLD.continents[h.cont]) bad.push(`${h.id}: continent ${h.cont}`);
    }
    expect(bad).toEqual([]);
  });

  it('every site has its happening, and no site has two', () => {
    const sites = WORLD.stops.filter(s => s.cls === 'site').map(s => s.id);
    expect(sites.filter(id => HAPPENINGS.filter(h => h.at === 'site' && h.stop === id).length !== 1)).toEqual([]);
  });

  it('there is something to meet on a walk anywhere and on a crossing anywhere', () => {
    expect(HAPPENINGS.some(h => h.at === 'road' && !h.cont)).toBe(true);
    expect(HAPPENINGS.some(h => h.at === 'sea' && !h.cont)).toBe(true);
  });

  it('every continent has a happening of its own on its roads', () => {
    const without = Object.keys(WORLD.continents).filter(cont => !HAPPENINGS.some(h => h.at === 'road' && h.cont === cont));

    expect(without).toEqual([]);
  });
});

describe('the code', () => {
  it('asks only for words that are written and icons that are drawn', () => {
    const words = [...code.matchAll(/\bT\('([a-zA-Z_0-9]+)'/g)].map(m => m[1]).filter(k => !/_$/.test(k) && !STR[k]);
    const drawn = [...code.matchAll(/ICON\.([a-zA-Z]+)\b(?! =)/g)].map(m => m[1]).filter(k => !icons.has(k));
    expect(words).toEqual([]);
    expect(drawn).toEqual([]);
  });
});

describe('the map project\'s cards', () => {
  it('each has a role in the game: a card or an enemy', () => {
    const have = new Set([...Object.keys(CARDS), ...Object.keys(ENEMIES)]);
    expect(Object.keys(LORE).filter(id => !have.has(id))).toEqual([]);
  });
});
