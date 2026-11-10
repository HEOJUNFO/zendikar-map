import './text'; // load order, as in the one-shot's page: this module runs after text
import { SLIDERS, tune, type TuneKey } from './config';
import { LORE } from './game/data';
import { LANG, contName } from './text';
import { genCardText, genFace } from './text2';
import { ART } from './cardart';
import type { CardDef } from './game/types';
// The cards. Names, numbers in the set, rarity, the type line and the place each belongs to come
// from the zendikar-map project's saga 1 phase 1 data (data/lore.json); colours from
// data/colors.json. A card is used as the kind its type line says: a creature stays on the field
// and strikes or guards, equipment and auras are worn, enchantments, artifacts and planeswalkers
// stay out, instants and sorceries are played once, and lands make mana. What a card does here is
// this game's own design, written to fit that kind and what the card shows; it is not the card's
// printed rules. `ko` is this game's own Korean name, used only where no official one was printed.
// The set's cards are in cards2.ts. Here: the five basic lands, which are not in the map
// project's data; their Korean names are the printed ones.

const FREE = 0; // a land is put into play, not paid for
export const CARDS: Record<string, CardDef> = {
  'plains': { art: 'plains', kind: 'land', color: 'W', basic: true, cost: FREE, target: 'none', en: 'Plains', ko: '들', koOfficial: true, fx: [], lore: { ko: '온두와 세지리의 땅.', en: 'The land of Ondu and Sejiri.' } },
  'island': { art: 'island', kind: 'land', color: 'U', basic: true, cost: FREE, target: 'none', en: 'Island', ko: '섬', koOfficial: true, fx: [], lore: { ko: '타짐의 땅.', en: 'The land of Tazeem.' } },
  'swamp': { art: 'swamp', kind: 'land', color: 'B', basic: true, cost: FREE, target: 'none', en: 'Swamp', ko: '늪', koOfficial: true, fx: [], lore: { ko: '굴 드라즈의 땅.', en: 'The land of Guul Draz.' } },
  'mountain': { art: 'mountain', kind: 'land', color: 'R', basic: true, cost: FREE, target: 'none', en: 'Mountain', ko: '산', koOfficial: true, fx: [], lore: { ko: '아쿰의 땅.', en: 'The land of Akoum.' } },
  'forest': { art: 'forest', kind: 'land', color: 'G', basic: true, cost: FREE, target: 'none', en: 'Forest', ko: '숲', koOfficial: true, fx: [], lore: { ko: '무라사와 발라 게드의 땅.', en: 'The land of Murasa and Bala Ged.' } },
};
// The five colours in their usual order, and the basic land that makes each.
export const COLOR_ORDER = 'WUBRG';
export const BASIC_OF: Record<string, string> = { W: 'plains', U: 'island', B: 'swamp', R: 'mountain', G: 'forest' };

// The deck every expedition leaves Sea Gate with: creatures to field, gear to wear, instants to hold for the right turn.
export const STARTER = [
  'welkin-tern', 'welkin-tern', 'umara-raptor', 'noble-vestige',
  'trusty-machete', 'adventuring-gear',
  'bold-defense', 'bold-defense', 'shieldmates-blessing', 'shieldmates-blessing',
];
// The lands it leaves with: Tazeem's islands, and plains for the kor and the faithful who come along.
export const STARTER_LANDS = ['island', 'island', 'island', 'plains', 'plains'];
// The first hand of a run's first fight, so the first minute teaches a land, a creature, gear and a guard.
export const FIRST_HAND = ['welkin-tern', 'trusty-machete', 'bold-defense', 'noble-vestige', 'adventuring-gear'];

// The land you gain the first time you reach a continent.
export const LAND_OF: Record<string, string> = { tazeem: 'island', akoum: 'mountain', 'guul-draz': 'swamp', 'bala-ged': 'forest', murasa: 'forest', ondu: 'plains', sejiri: 'plains' };

// The cards each continent gives: the ones the map project places there (filled in by cards2.ts).
export const POOLS: Record<string, string[]> = {};
// How often a card of each rarity is offered, each against the others: after a fight in the
// wilds, in a market and by a happening (weight_...), or after a great beast, where the rare
// cards are (elite_weight_...). The numbers are data/config.json's, read as they are now.
export function rarityWeights(elite?: boolean): Record<string, number> {
  const of = (rarity: string) => tune[((elite ? 'elite_weight_' : 'weight_') + rarity) as TuneKey];
  return { common: of('common'), uncommon: of('uncommon'), rare: of('rare'), mythic: of('mythic') };
}

// A value on a card or an enemy: a data/config.json key (read live) or a plain number.
// (A name with no slider would come back as the name itself; every name the content uses has one.)
export function val(x: string | number): number { return (typeof x === 'string' ? (SLIDERS[x] ? SLIDERS[x].value : x) : x) as number; }
export function cardRarity(id: string) { const l = LORE[id]; return l ? l.rarity : 'common'; }
export function cardPrice(id: string) { return tune[('price_' + cardRarity(id)) as TuneKey] || tune.price_common; }
// A card's name in this language: {text, star}; star marks this game's own Korean translation.
export function cardName(id: string) {
  const d = CARDS[id], l = LORE[id];
  const en = (d && d.en) || (l && l.en) || id;
  if (LANG === 'ko') {
    if (l && l.ko) return { text: l.ko, star: false };
    if (d && d.ko) return { text: d.ko, star: !d.koOfficial };
  }
  return { text: en, star: false };
}
export function cardEnglish(id: string) { const d = CARDS[id], l = LORE[id]; return (d && d.en) || (l && l.en) || id; }
// What the card does, in words put together from its effects (text2.ts), so they follow the tuning values.
export function cardText(id: string) { return genCardText(id); }
// Where the map project places the card: "ZEN #209 · Kazandu, Murasa".
export function cardOrigin(id: string) {
  const l = LORE[id];
  if (!l) return '';
  let place = '';
  if (l.placeEn) place = (LANG === 'ko' && l.placeKo) ? l.placeKo : l.placeEn;
  const cont = l.cont ? contName(l.cont) : '';
  const where = place && cont ? place + ', ' + cont : (place || cont);
  return 'ZEN #' + l.no + (where ? ' · ' + where : '');
}
export function isLand(id: string) { return CARDS[id].kind === 'land'; }
// What becomes of a card when it is played: a creature takes the field; gear is worn by one of
// yours; a lasting card stays out; a curse (an aura cast on an enemy or a land) stays on what it
// was cast on; a spell is done and goes to the discard pile; a land goes into play.
export function family(d: CardDef): 'creature' | 'gear' | 'lasting' | 'curse' | 'spell' | 'land' {
  if (d.kind === 'creature' || d.kind === 'land') return d.kind;
  if (d.gear) return 'gear';
  if (d.kind === 'aura') return 'curse';
  return d.kind === 'instant' || d.kind === 'sorcery' ? 'spell' : 'lasting';
}
export function cardArt(id: string) { return ART[CARDS[id].art || id]; }
// The icons and numbers on a card's face: [[icon, text], ...].
export function cardFace(id: string) { return genFace(CARDS[id]); }
// The keywords a card's panel explains: its kind first, then what is special about it.
export function cardKw(id: string) {
  const d = CARDS[id], out: string[] = [d.trap ? 'trap' : d.quest ? 'quest' : d.kind];
  const add = (k: string) => { if (out.indexOf(k) < 0) out.push(k); };
  if (d.kick) add('kicker');
  for (const k of ['fly', 'pierce', 'walk', 'haste', 'vigil', 'defender', 'slow', 'used', 'recur']) if (d[k]) add(k);
  if (d.gear) for (const k of ['fly', 'reach', 'pierce'] as const) if (d.gear[k]) add(k);
  if ((d.on && d.on.land) || (d.quest && d.quest.on === 'land')) add('landfall');
  if (d.ally) add('ally');
  return out;
}
