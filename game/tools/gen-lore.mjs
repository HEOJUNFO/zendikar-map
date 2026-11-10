// Writes data/lore.json from the zendikar-map project's data, read only: for every card of the
// sets the game holds, its official English name, its official Korean name where one was printed
// (ko: null otherwise), its number in the set, rarity and type line, and the continent and place
// the map project ties it to. A set's cards come from its phase file; its non-basic lands from
// src/data/cards.ts.
//
// Usage: node tools/gen-lore.mjs [--check]
//   --check   write nothing: say whether data/lore.json is what this would write (exit 1 if not)
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const GAME = path.resolve(here, '..'), MAP = path.resolve(GAME, '..');
const CHECK = process.argv.includes('--check');
const imp = p => import(path.join(MAP, p));
const arr = m => Object.values(m).find(v => Array.isArray(v));

// The sets the game holds, in the order they were added. The next is saga 1 phase 2:
// { set: 'wwk', phase: 'src/data/phase2.ts' }.
const SETS = [
  { set: 'zen', phase: 'src/data/phase1.ts' },
];

const LOCS = arr(await imp('src/data/locations.ts'));
const LANDS = (await imp('src/data/cards.ts')).LAND_CARDS;
const where = dep => {
  let placeEn = null, placeKo = null, cont = null;
  if (dep && dep.type === 'location') { const l = LOCS.find(x => x.id === dep.id); if (l) { placeEn = l.name; placeKo = l.nameKo || null; cont = l.continentId || null; } }
  else if (dep && dep.type === 'continent') cont = dep.id;
  return { cont, placeEn, placeKo };
};

const lore = {}, count = {};
for (const { set, phase } of SETS) {
  let cards = 0, lands = 0;
  for (const c of arr(await imp(phase))) {
    if (c.set !== set) continue;
    if (lore[c.id]) throw new Error('the same id twice: ' + c.id);
    lore[c.id] = { en: c.name, ko: c.nameKo || null, set, no: c.number, rarity: c.rarity, type: c.typeLine, ...where(c.depicts) }; cards++;
  }
  for (const c of LANDS) {
    if ((c.set || '').toLowerCase() !== set) continue;
    if (lore[c.id]) throw new Error('the same id twice: ' + c.id);
    lore[c.id] = { en: c.name, ko: c.nameKo || null, set, no: c.number, rarity: c.rarity, type: 'Land', land: true, ...where(c.depicts) }; lands++;
  }
  count[set] = { cards, lands };
}

// One card a line, so a later change shows as one line in a diff.
const text = '{\n' + Object.keys(lore).map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(lore[k])).join(',\n') + '\n}\n';
const file = path.join(GAME, 'data/lore.json');
const was = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
const ids = Object.keys(lore);
console.log(`entries ${ids.length} · ${Object.entries(count).map(([s, n]) => `${s}: ${n.cards} cards, ${n.lands} lands`).join(' · ')} · with an official Korean name ${ids.filter(i => lore[i].ko).length}`);
if (CHECK) {
  console.log(was === text ? 'data/lore.json: the same as the map data gives now' : 'data/lore.json: DIFFERS from what the map data gives now');
  process.exit(was === text ? 0 : 1);
}
if (was === text) console.log('data/lore.json: already up to date');
else { fs.writeFileSync(file, text); console.log('data/lore.json: written'); }
