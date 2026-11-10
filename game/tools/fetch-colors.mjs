// Writes data/colors.json: the colour of every card in data/lore.json. The map project's data
// holds a card's name, number, rarity and type line but not its colour, so this one fact comes
// from Scryfall's public card database (api.scryfall.com: no key, a few requests for a set).
// Only colour letters are kept: W white, U blue, B black, R red, G green; "" is colourless.
// A land's letters are the colours of mana the game lets it make (see LANDS below).
//
// Usage: node tools/fetch-colors.mjs [--check]
//   --check   write nothing: say whether data/colors.json is what this would write (exit 1 if not)
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const GAME = path.resolve(here, '..');
const CHECK = process.argv.includes('--check');
const LORE = JSON.parse(fs.readFileSync(path.join(GAME, 'data/lore.json'), 'utf8'));
const ORDER = 'WUBRG';
const letters = a => ORDER.split('').filter(c => (a || []).includes(c)).join('');

// Lands that fetch other lands make no mana of their own on the printed card. In this game each
// stands for the two basic lands it can find, so it carries their two colours.
const LANDS = { 'arid-mesa': 'WR', 'marsh-flats': 'WB', 'misty-rainforest': 'UG', 'scalding-tarn': 'UR', 'verdant-catacombs': 'BG' };

const sets = [...new Set(Object.values(LORE).map(l => l.set))];
const byNumber = {};
for (const set of sets) {
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent('e:' + set)}&unique=prints&order=set`;
  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'card-colour-fetch/1.0', Accept: 'application/json' } });
    if (!res.ok) { console.error(`Scryfall answered ${res.status} for the set ${set}`); process.exit(1); }
    const page = await res.json();
    for (const c of page.data) byNumber[set + '/' + c.collector_number] = c;
    url = page.has_more ? page.next_page : null;
    await new Promise(r => setTimeout(r, 120)); // their guideline: no more than ten requests a second
  }
}

const colors = {}, missing = [];
for (const id in LORE) {
  const l = LORE[id], c = byNumber[l.set + '/' + l.no];
  if (!c) { missing.push(id); continue; }
  if (c.name !== l.en && !(c.name || '').startsWith(l.en)) { console.error(`${id}: number ${l.no} is "${c.name}" there, "${l.en}" here`); process.exit(1); }
  colors[id] = l.land ? (LANDS[id] ?? letters(c.produced_mana)) : letters(c.colors ?? (c.card_faces && c.card_faces[0].colors));
}
if (missing.length) { console.error('not found on Scryfall: ' + missing.join(', ')); process.exit(1); }

const text = '{\n' + Object.keys(colors).map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(colors[k])).join(',\n') + '\n}\n';
const file = path.join(GAME, 'data/colors.json');
const was = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
const count = {};
for (const v of Object.values(colors)) count[v || 'colourless'] = (count[v || 'colourless'] || 0) + 1;
console.log(`cards ${Object.keys(colors).length} · ${Object.entries(count).map(([k, n]) => k + ' ' + n).join(' · ')}`);
if (CHECK) { console.log(was === text ? 'data/colors.json: the same as Scryfall gives now' : 'data/colors.json: DIFFERS from what Scryfall gives now'); process.exit(was === text ? 0 : 1); }
if (was === text) console.log('data/colors.json: already up to date');
else { fs.writeFileSync(file, text); console.log('data/colors.json: written'); }
