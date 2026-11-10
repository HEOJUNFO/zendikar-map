import './enemies2'; // load order, as in the one-shot's page: this module runs after enemies2
import { SLIDERS, tune, type TuneKey } from './config';
import { LANG, LX, STR } from './text';
import { CARDS, family, val } from './cards';
import { ENEMIES, enemyName } from './enemies';
import { nameStr } from './screens';
import type { CardDef, Fx, Loose, Move } from './game/types';
// The words for the cards and the enemies, in Korean and English. A card's rules text is not
// written by hand: it is put together here from the card's kind and effects (cards2.ts), so the
// text always says what the card does and follows the tuning values. The same for an enemy's
// moves and traits (enemies2.ts).

Object.assign(STR, {
  kw_ally: { ko: '동료', en: 'Ally' },
  kw_quest: { ko: '퀘스트', en: 'Quest' },
  kwh_ally: { ko: '동료: 원정대의 일원. 결집은 동료가(자신도) 전장에 들어올 때마다 일어난다.', en: 'Ally: a member of the expedition. Rally happens whenever an Ally takes the field, itself too.' },
  kwh_quest: { ko: '퀘스트: 부여마법. 낸 뒤 조건이 일어날 때마다 표식이 쌓이고, 다 차면 보상을 준다.', en: 'Quest: an enchantment. It gains a mark each time its condition happens, and pays off when full.' },
  kwh_recur: { ko: '되돌아옴: 낸 뒤 버린 더미 대신 뽑을 더미 맨 위로 간다.', en: 'Recurring: after you play it, it goes on top of your draw pile.' },
  in_summon: { ko: '부름', en: 'Summon' },
  in_idle: { ko: '쉼', en: 'Resting' },
  revived: { ko: '되살아남', en: 'Revived' },
  woke: { ko: '깨어남!', en: 'Awake!' },
  immune: { ko: '면역', en: 'Immune' },
  questDone: { ko: '퀘스트 달성!', en: 'Quest done!' },
  pierceOn: { ko: '방어 무시', en: 'Piercing' },
  no_shroud: { ko: '주문과 마법진의 대상이 될 수 없습니다', en: 'Spells and auras cannot target it' },
  guardLine: { ko: '길목: {e}', en: 'On the way: {e}' },
  placeLandLine: { ko: '이곳의 대지: {c}', en: 'Land of this place: {c}' },
  pageLine: { ko: '{a}/{b}쪽 · 좌우 화살표', en: 'Page {a}/{b} · left and right arrows' },
  gallery: { ko: '카드 그림', en: 'Card pictures' },
  marks: { ko: '표식 {n}/{m}', en: 'Marks {n}/{m}' },
  marksDone: { ko: '달성', en: 'Done' },
  st_jam: { ko: '다음 턴 뽑기 −{n}', en: 'Next draw −{n}' },
});

// One effect, as a sentence: [Korean, English]. {0} {1}: its values; {s0}: 's' unless the first is 1.
// {S}: whose it is, for an effect on one of yours (the target of a spell, the creature itself, the wearer).
const FXT: Record<string, string[]> = {
  hit: ['피해 {0}.', 'Deal {0} damage.'],
  hit2: ['피해 {0}를 {1}번.', 'Deal {0} damage {1} times.'],
  pierce: ['방어를 무시하고 피해 {0}.', 'Deal {0} damage, ignoring block.'],
  pierce2: ['방어를 무시하고 피해 {0}를 {1}번.', 'Deal {0} damage {1} times, ignoring block.'],
  hitall: ['모든 적에게 피해 {0}.', 'Deal {0} damage to all enemies.'],
  hitrand: ['무작위 적에게 피해 {0}.', 'Deal {0} damage to a random enemy.'],
  hitrand2: ['무작위 적에게 피해 {0}를 {1}번.', 'Deal {0} damage to a random enemy, {1} times.'],
  hitPerLand: ['놓인 대지 한 장마다 피해 {0}.', 'Deal {0} damage for each land you have in play.'],
  hitrandPerLand: ['놓인 대지 한 장마다 무작위 적에게 피해 {0}.', 'Deal {0} damage to a random enemy for each land you have in play.'],
  hitPerHand: ['손에 남은 카드 한 장마다 피해 {0}.', 'Deal {0} damage for each other card in your hand.'],
  hitHalf: ['대상의 남은 체력 절반만큼 피해 (최대 {0}).', "Deal damage equal to half the target's HP (up to {0})."],
  hitrandPerAlly: ['전장의 동료 하나마다 무작위 적에게 피해 {0}.', 'Deal {0} damage to a random enemy for each Ally on the field.'],
  block: ['방어 {0}.', 'Gain {0} block.'],
  blockNext: ['다음 턴 시작에 방어 {0}.', 'Gain {0} block at the start of your next turn.'],
  heal: ['체력 {0} 회복.', 'Heal {0}.'],
  healPerLand: ['놓인 대지 한 장마다 체력 {0} 회복.', 'Heal {0} for each land you have in play.'],
  healPerAlly: ['전장의 동료 하나마다 체력 {0} 회복.', 'Heal {0} for each Ally on the field.'],
  draw: ['카드 {0}장을 뽑는다.', 'Draw {0} card{s0}.'],
  mana: ['아무 색 마나 +{0}.', 'Add {0} mana of any colour.'],
  gold: ['금화 +{0}.', 'Gain {0} gold.'],
  burn: ['대상에게 화상 {0}.', 'Burn the target for {0}.'],
  burnall: ['모든 적에게 화상 {0}.', 'Burn all enemies for {0}.'],
  rot: ['대상은 제 차례마다 피해 {0}을 받는다.', 'The target takes {0} damage on each of its turns.'],
  grasp: ['대상의 공격 피해가 절반이 된다 (큰 짐승 제외).', "The target's attacks deal half damage (not a great beast's)."],
  sap: ['대상의 힘 −{0}.', 'The target loses {0} strength.'],
  sapall: ['모든 적의 힘 −{0}.', 'All enemies lose {0} strength.'],
  strip: ['대상의 방어와 힘을 없앤다.', "Remove the target's block and strength."],
  unblock: ['대상의 방어를 없앤다.', "Remove the target's block."],
  unblockall: ['모든 적의 방어를 없앤다.', "Remove all enemies' block."],
  cancel: ['대상의 의도가 공격이 아니면 무효로 한다.', "If the target's intent is not an attack, cancel it."],
  stun: ['대상의 의도를 무효로 한다 (큰 짐승 제외).', "Cancel the target's intent (not a great beast's)."],
  stunall: ['모든 적의 의도를 무효로 한다 (큰 짐승 제외).', "Cancel every enemy's intent (not a great beast's)."],
  stunall_big: ['모든 적의 의도를 무효로 한다.', "Cancel every enemy's intent."],
  banish: ['대상을 {0}턴 동안 전투 밖으로 보낸다 (큰 짐승 제외).', 'Send the target out of the fight for {0} turns (not a great beast).'],
  bonus: ['이번 턴 내 타격마다 피해 +{0}.', 'Each of your strikes deals +{0} damage this turn.'],
  piercing: ['이번 턴 내 타격은 방어를 무시한다.', 'Your strikes ignore block this turn.'],
  pump: ['{S} 이번 턴 +{0}/+{1}.', '{S} +{0}/+{1} this turn.'],
  pumpPerLand: ['{S} 이번 턴 놓인 대지 한 장마다 +{0}/+{0}.', '{S} +{0}/+{0} this turn for each land you have in play.'],
  grow: ['{S} 이번 전투 동안 +{0}/+{1}.', '{S} +{0}/+{1} for the fight.'],
  growAll: ['내 생물이 모두 이번 전투 동안 +{0}/+{1}.', 'Each of your creatures gets +{0}/+{1} for the fight.'],
  growAllies: ['내 동료가 모두 이번 전투 동안 +{0}/+{1}.', 'Each of your Allies gets +{0}/+{1} for the fight.'],
  fetch: ['대지 더미에서 대지 1장을 전장에 놓는다.', 'Put a land from your land pile into play.'],
  extraLand: ['이번 턴 대지를 {0}장 더 놓을 수 있다.', 'You may play {0} more land{s0} this turn.'],
  seas: ['놓인 대지 하나가 청색 마나도 낸다.', 'One of your lands in play also makes blue mana.'],
  cleanse: ['내 화상과 거미줄을 없앤다.', 'Remove your burn and webbing.'],
  discard: ['손에서 무작위 카드 {0}장을 버린다.', 'Discard {0} card{s0} at random.'],
  selfhurt: ['체력 {0}을 잃는다.', 'Lose {0} HP.'],
  retrieve: ['버린 더미에서 무작위 카드 {0}장을 손으로.', 'Take {0} random card{s0} from your discard pile.'],
  fetchTrap: ['뽑을 더미에서 함정 카드 1장을 손으로.', 'Take a trap card from your draw pile.'],
  fetchCreature: ['뽑을 더미에서 생물 카드 1장을 손으로.', 'Take a creature card from your draw pile.'],
  fetchGear: ['뽑을 더미에서 장비 카드 1장을 손으로.', 'Take an equipment card from your draw pile.'],
  fetchDiscard_creature: ['버린 더미에서 생물 카드 1장을 손으로.', 'Take a creature card from your discard pile.'],
  reshuffle: ['버린 더미를 뽑을 더미에 섞는다.', 'Shuffle your discard pile into your draw pile.'],
  echo: ['이번 턴 다음에 내는 순간마법이나 집중마법의 효과가 한 번 더 일어난다.', 'The next instant or sorcery you play this turn takes effect twice.'],
  freeTraps: ['이번 턴 내 함정 카드의 비용은 0.', 'Your trap cards cost 0 this turn.'],
  mutiny: ['대상의 공격을 대상 자신에게 돌린다 (큰 짐승 제외).', "Turn the target's attack on itself (not a great beast)."],
  weaken: ['이번 턴 대상의 공격 피해 −{0}.', "The target's attacks deal {0} less this turn."],
  weakenall: ['이번 턴 모든 적의 공격 피해 −{0}.', "All enemies' attacks deal {0} less this turn."],
  halve: ['이번 턴 대상의 공격 피해를 절반으로.', "Halve the target's attack damage this turn."],
};
const TRAPT: Record<string, string[]> = {
  attack: ['대상이 공격하려 하면', 'if the target intends to attack'],
  quiet: ['대상이 공격하지 않으려 하면', 'if the target does not intend to attack'],
  loneAttack: ['공격하려는 적이 대상 하나뿐이면', 'if the target is the only enemy that intends to attack'],
  shielded: ['대상에게 방어가 있으면', 'if the target has block'],
  strong: ['대상의 힘이 1 이상이면', 'if the target has strength'],
  anyQuiet: ['공격하지 않으려는 적이 있으면', 'if an enemy does not intend to attack'],
  hurtLast: ['지난 적 턴에 체력을 잃었으면', "if you lost HP on the enemy's last turn"],
  crowd: ['적이 둘 이상이면', 'if there are two or more enemies'],
  fullhand: ['손에 다른 카드가 {n}장 이상이면', 'if you hold {n} or more other cards', 'trap_fullhand'],
  lowhp: ['내 체력이 절반 이하면', 'if you are at half HP or less'],
  enemyHealed: ['지난 적 턴에 적이 체력을 회복했으면', "if an enemy healed on the enemy's last turn"],
  bigdiscard: ['버린 더미가 {n}장 이상이면', 'if your discard pile holds {n} or more cards', 'trap_bigdiscard'],
  threat: ['적들이 주려는 피해가 모두 {n} 이상이면', 'if the enemies intend {n} or more damage in all', 'trap_threat'],
};
// When a hook happens. strike reads differently for a lasting card (anyone's), a creature (its own) and gear (the wearer's).
const ONT: Record<string, string[]> = {
  land: ['대지가 놓일 때마다', 'Whenever a land comes into play'], turn: ['턴을 시작할 때', 'At the start of your turn'],
  spell: ['순간마법이나 집중마법을 낼 때마다', 'Whenever you play an instant or a sorcery'],
  creature: ['생물이 전장에 들어올 때마다', 'Whenever a creature takes the field'], ally: ['동료가 전장에 들어올 때마다', 'Whenever an Ally takes the field'],
  strike: ['내 편이 칠 때마다', 'Whenever one of yours strikes'], strike_self: ['칠 때마다', 'Whenever it strikes'], strike_gear: ['착용자가 칠 때마다', 'Whenever the wearer strikes'],
  trap: ['함정 카드를 낼 때마다', 'Whenever you play a trap card'],
  kill: ['적이 쓰러질 때마다', 'Whenever an enemy falls'], hurt: ['적에게 체력을 잃을 때마다', 'Whenever you lose HP to an enemy'],
  unhurt: ['적 턴에 체력을 잃지 않을 때마다', 'Whenever an enemy turn costs you no HP'],
};
const QEV: Record<string, string[]> = {
  land: ['대지가 놓일 때마다', 'for each land that comes into play'], strike: ['내 편이 칠 때마다', 'for each strike of yours'],
  spell: ['순간마법이나 집중마법을 낼 때마다', 'for each instant or sorcery you play'], creature: ['생물이 전장에 들어올 때마다', 'for each creature that takes the field'],
  ally: ['동료가 전장에 들어올 때마다', 'for each Ally that takes the field'],
  hurt: ['적에게 체력을 잃을 때마다', 'each time you lose HP to an enemy'], unhurt: ['적 턴에 체력을 잃지 않을 때마다', 'for each enemy turn that costs you no HP'],
  kill: ['적이 쓰러질 때마다', 'for each enemy that falls'], turn: ['턴을 시작할 때마다', 'each turn'], trap: ['함정 카드를 낼 때마다', 'for each trap card you play'],
};
const PAST: Record<string, string[]> = {
  atk: ['내 타격마다 피해 +{n}.', 'Each of your strikes deals +{n} damage.'], def: ['수호하는 내 편마다 수호 +{n}.', 'Each of yours that guards has +{n} guard.'],
  spell: ['내 순간마법과 집중마법이 주는 피해마다 +{n}.', 'Each hit of your instants and sorceries deals +{n} damage.'],
  atkPerGear: ['지닌 장비 하나마다 내 타격 피해 +{n}.', 'Each of your strikes deals +{n} damage for each piece of equipment worn.'],
  lands: ['한 턴에 대지를 {n}장 더 놓을 수 있다.', 'You may play {n} more land each turn.'],
  noHex: ['적의 공격이 아닌 의도는 모두 무효가 된다.', 'Every enemy intent that is not an attack is cancelled.'],
};
// Whose an effect on one of yours is: [Korean, English], by where the effect is written.
const SUBJ: Record<string, string[]> = { target: ['대상이', 'The target gets'], self: ['이 생물이', 'It gets'], gear: ['착용자가', 'The wearer gets'] };
const FLAGT: Record<string, string[]> = {
  pierce: ['관통.', 'Piercing.'], haste: ['신속.', 'Haste.'], vigil: ['경계.', 'Vigilance.'], defender: ['수비대.', 'Defender.'],
  twiceIfGear: ['장비를 지니면 두 번 친다.', 'It strikes twice while it wears equipment.'],
};
export const COLOR_WORD: Record<string, string[]> = { W: ['백색', 'white'], U: ['청색', 'blue'], B: ['흑색', 'black'], R: ['적색', 'red'], G: ['녹색', 'green'] };

function fxLine(f: Fx, who: string): string {
  const L = LANG === 'ko' ? 0 : 1, op = f[0];
  if (op === 'ifAttack') return L ? 'If the target intends to attack: ' + fxText(f[1], who) + ' Otherwise: ' + fxText(f[2], who) : '대상이 공격하려 하면: ' + fxText(f[1], who) + ' 아니면: ' + fxText(f[2], who);
  let name = op;
  if ((op === 'hit' || op === 'hitrand' || op === 'pierce') && f[2] !== undefined) name = op + '2';
  if (op === 'fetchDiscard') name = 'fetchDiscard_' + f[1];
  if (op === 'stunall' && f[1] === 'big') name = 'stunall_big';
  const t = FXT[name];
  if (!t) return op;
  const a0: Loose = f[1] !== undefined ? val(f[1]) : '', a1: Loose = f[2] !== undefined ? val(f[2]) : '';
  return t[L].split('{S}').join(SUBJ[who][L]).split('{0}').join(a0).split('{1}').join(a1).split('{s0}').join(a0 === 1 ? '' : 's');
}
function fxText(fx: Fx[], who: string) { // the same sentence twice in a row is said once: "... (twice)."
  const out: { s: string; n: number }[] = [];
  for (const s of fx.map(f => fxLine(f, who))) {
    const last = out[out.length - 1];
    if (last && last.s === s) last.n++; else out.push({ s, n: 1 });
  }
  return out.map(o => o.n === 1 ? o.s : o.s.replace(/\.$/, '') + (LANG === 'ko' ? ' (' + o.n + '번).' : ' (' + o.n + ' times).')).join(' ');
}
function lowerFirst(s: string) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function passiveText(p: Loose) {
  const L = LANG === 'ko' ? 0 : 1, out: string[] = [];
  for (const k in p) if (PAST[k]) out.push(PAST[k][L].split('{n}').join(p[k] === true ? '' : val(p[k]) as Loose));
  return out.join(' ');
}
// The colours of mana a land makes, in words: "blue", "white or red".
export function colorWords(colors: string) { const L = LANG === 'ko' ? 0 : 1; return colors.split('').map(c => COLOR_WORD[c][L]).join(L ? ' or ' : '이나 '); }
// The rules text of a card: what its kind does with it, then its effects.
export function genCardText(id: string) {
  const d = CARDS[id], L = LANG === 'ko' ? 0 : 1, out: string[] = [], fam = family(d);
  const say = (ko: string, en: string) => out.push(L ? en : ko);
  const who = fam === 'creature' ? 'self' : fam === 'gear' ? 'gear' : 'target';
  const fx = d.fx && d.fx.length ? fxText(d.fx, who) : '';
  if (fam === 'creature') {
    out.push(val(d.atk!) + '/' + val(d.def!) + '.');
    for (const k in FLAGT) if (d[k]) out.push(FLAGT[k][L]);
    if (fx) say('들어올 때: ' + fx, 'When it takes the field: ' + lowerFirst(fx));
    if (d.rally) say('결집 — ' + fxText(d.rally, 'self'), 'Rally: ' + lowerFirst(fxText(d.rally, 'self')));
  } else if (fam === 'gear') {
    const g = d.gear!, a = g.atk ? val(g.atk) : 0, df = g.def ? val(g.def) : 0;
    if (a || df) say('착용자가 +' + a + '/+' + df + '.', 'The wearer gets +' + a + '/+' + df + '.');
    if (g.pierce) say('착용자의 타격은 방어를 무시한다.', "The wearer's strikes ignore block.");
    if (g.twice) say('착용자는 두 번 친다.', 'The wearer strikes twice.');
  } else if (fam === 'land') {
    say(colorWords(d.color) + ' 마나를 낸다.', 'Makes ' + colorWords(d.color) + ' mana.');
    if (d.slow) say('놓인 턴에는 내지 않는다.', 'None on the turn it comes into play.');
    if (fx) say('놓일 때: ' + fx, 'When it comes into play: ' + lowerFirst(fx));
  } else {
    if (d.trap) { const t = TRAPT[d.trap], n: Loose = t[2] ? tune[t[2] as TuneKey] : ''; say('함정 — ' + t[0].split('{n}').join(n) + ' 비용 0.', 'Trap: costs 0 ' + t[1].split('{n}').join(n) + '.'); }
    if (d.req === 'sacLand') say('놓인 대지 1장을 희생해야 낼 수 있다.', 'Give up a land you have in play to play it.');
    if (fx) out.push(fx);
    if (d.lf) say('상륙: 대신 ' + fxText(d.lf, who), 'Landfall: instead, ' + lowerFirst(fxText(d.lf, who)));
    if (d.lfAdd) say('상륙: 추가로 ' + fxText(d.lfAdd, who), 'Landfall: also ' + lowerFirst(fxText(d.lfAdd, who)));
  }
  if (d.passive) out.push(passiveText(d.passive));
  if (d.on) for (const ev in d.on) { const w = ONT[ev === 'strike' && fam === 'creature' ? 'strike_self' : ev === 'strike' && fam === 'gear' ? 'strike_gear' : ev]; say(w[0] + ': ' + fxText(d.on[ev], who), w[1] + ': ' + lowerFirst(fxText(d.on[ev], who))); }
  if (d.quest) {
    const q = d.quest, need = val(q.need);
    let ko = '퀘스트 — ' + QEV[q.on][0] + ' 표식 +1. 표식 ' + need + '개: ', en = 'Quest: a mark ' + QEV[q.on][1] + '. At ' + need + ' marks: ';
    if (q.reward) { ko += fxText(q.reward, who); en += lowerFirst(fxText(q.reward, who)); }
    if (q.then && q.then.passive) { ko += '그 뒤로 ' + passiveText(q.then.passive); en += 'from then on, ' + lowerFirst(passiveText(q.then.passive)); }
    if (q.then && q.then.on) for (const ev in q.then.on) { ko += '그 뒤로 ' + ONT[ev][0] + ': ' + fxText(q.then.on[ev], who); en += 'from then on, ' + lowerFirst(ONT[ev][1]) + ': ' + lowerFirst(fxText(q.then.on[ev], who)); }
    if (q.reward) { ko += q.repeat ? ' (되풀이)' : ' (한 번)'; en += q.repeat ? ' (Repeats)' : ' (Once)'; }
    say(ko, en);
  }
  if (d.used) say('소모.', 'Used up.');
  if (d.recur) say('되돌아옴.', 'Recurring.');
  return out.join(' ');
}
// The small icons on a card's face, worked out from its kind and effects: [[icon, value text], ...].
const FACE_ICON: Record<string, string> = { hit: 'atk', pierce: 'atk', hitall: 'atk', hitrand: 'atk', hitPerLand: 'atk', hitrandPerLand: 'atk', hitPerHand: 'atk', hitHalf: 'atk', hitrandPerAlly: 'atk', block: 'blk', blockNext: 'blk', heal: 'heal', healPerLand: 'heal', healPerAlly: 'heal',
  draw: 'draw', mana: 'nrg', gold: 'gold', burn: 'burn', burnall: 'burn', rot: 'burn', grasp: 'blk', sap: 'x', sapall: 'x', strip: 'x', unblock: 'x', unblockall: 'x', cancel: 'x', stun: 'x', stunall: 'x', banish: 'away', bonus: 'up', piercing: 'prc',
  pump: 'up', pumpPerLand: 'up', grow: 'up', growAll: 'up', growAllies: 'up', fetch: 'land', extraLand: 'land', seas: 'land', fetchDiscard: 'draw', retrieve: 'draw', fetchTrap: 'draw', fetchCreature: 'draw', fetchGear: 'draw', reshuffle: 'draw', discard: 'x', selfhurt: 'heal',
  echo: 'up', freeTraps: 'up', mutiny: 'x', weaken: 'blk', weakenall: 'blk', halve: 'blk', cleanse: 'heal' };
export function genFace(d: CardDef) {
  const out: string[][] = [], fam = family(d);
  const add = (fx: Fx[]) => { for (const f of fx) { if (out.length >= 3) return; if (f[0] === 'ifAttack') { add(f[1]); continue; } const ic = FACE_ICON[f[0]]; if (!ic) continue; let s = ''; if (typeof f[1] === 'string' && SLIDERS[f[1]]) { s = String(val(f[1])); if (f[0] === 'selfhurt' || f[0] === 'discard') s = '-' + s; if (f[2] !== undefined) s += (FACE_ICON[f[0]] === 'up' ? '/' : '×') + val(f[2]); } out.push([ic, s]); } };
  if (fam === 'creature') { out.push(['atk', String(val(d.atk!))], ['blk', String(val(d.def!))]); if (d.pierce) out.push(['prc', '']); }
  if (fam === 'gear') { const g = d.gear!; if (g.atk) out.push(['atk', '+' + val(g.atk)]); if (g.def) out.push(['blk', '+' + val(g.def)]); if (g.pierce) out.push(['prc', '']); if (g.twice) out.push(['atk', '×2']); }
  if (d.quest) { out.push(['quest', String(val(d.quest.need))]); if (d.quest.reward) add(d.quest.reward); return out; }
  add(d.fx || []);
  if (d.rally && out.length < 3) { out.push(['ally', '']); add(d.rally); }
  if (d.on) for (const ev in d.on) { if (out.length < 3) { out.push([ev === 'land' ? 'lf' : ev === 'ally' || ev === 'creature' ? 'ally' : 'up', '']); add(d.on[ev]); } }
  if (d.passive) for (const k in d.passive) if (out.length < 3) out.push([k === 'def' ? 'blk' : k === 'noHex' ? 'x' : k === 'lands' ? 'land' : 'atk', d.passive[k] === true ? '' : '+' + val(d.passive[k])]);
  return out.slice(0, 3);
}

// What an enemy's move does besides its number, as a note.
const MVT: Record<string, string[]> = {
  pierce: ['방어를 무시한다', 'Ignores block'], steal: ['준 피해만큼 회복한다', 'Heals by the damage it deals'],
  burn: ['막지 못하면 화상 {n}', 'Burns you for {n} if it gets through'], mill: ['막지 못하면 내 뽑을 더미에서 {n}장을 버린다', 'Discards {n} from your draw pile if it gets through'],
  rob: ['막지 못하면 금화 {n}을 빼앗는다', 'Takes {n} gold if it gets through'], jam: ['막지 못하면 다음 턴에 카드를 {n}장 덜 뽑는다', 'You draw {n} fewer next turn if it gets through'],
  web: ['막지 못하면 다음 턴 내 대지 {n}개가 마나를 내지 못한다', '{n} of your lands make no mana next turn if it gets through'], self: ['스스로 체력 {n}을 잃는다', 'It loses {n} HP itself'],
  blk: ['방어 {n}', 'Gains {n} block'], str: ['힘 +{n}', 'Gains {n} strength'], strAll: ['모든 적의 힘 +{n}', 'All enemies gain {n} strength'], heal: ['체력 {n} 회복', 'Heals {n}'],
  hexweb: ['다음 턴 내 대지 {n}개가 마나를 내지 못한다', '{n} of your lands make no mana next turn'], lock: ['다음 턴에 대지를 놓을 수 없다', 'You cannot play lands next turn'],
  hexjam: ['다음 턴에 카드를 {n}장 덜 뽑는다', 'You draw {n} fewer next turn'], curse: ['나에게 화상 {n}', 'Burns you for {n}'],
  unquest: ['내 퀘스트 표식을 모두 지운다', 'Wipes the marks off your quests'], eat: ['내 생물이나 지속 카드 하나를 없앤다', 'Destroys one of your creatures or lasting cards'],
  hexrob: ['금화 {n}을 빼앗는다', 'Takes {n} gold'], summon: ['부름: {n}', 'Calls: {n}'], idle: ['아무것도 하지 않는다', 'Does nothing'],
  hide: ['다음 내 턴 동안 겨눌 수 없다', 'Cannot be targeted on your next turn'], charge: ['다음 공격이 2배', 'Its next attack is doubled'],
};
export function moveNote(m: Move) {
  if (m.note) return LX(m.note);
  const L = LANG === 'ko' ? 0 : 1, out: string[] = [];
  const add = (k: string, n?: Loose) => out.push(MVT[k][L].split('{n}').join(n === undefined ? '' : n));
  if (m.k === 'atk') { for (const k of ['pierce', 'steal']) if (m[k]) add(k); for (const k of ['burn', 'mill', 'rob', 'jam', 'web', 'self']) if (m[k]) add(k, val(m[k])); }
  else if (m.k === 'buff') { if (m.blk) add('blk', val(m.blk)); if (m.str) add(m.all ? 'strAll' : 'str', val(m.str)); if (m.heal) add('heal', val(m.heal)); }
  else if (m.k === 'hex') {
    if (m.web) add('hexweb', val(m.web)); if (m.lock) add('lock'); if (m.jam) add('hexjam', val(m.jam)); if (m.curse) add('curse', val(m.curse));
    if (m.unquest) add('unquest'); if (m.eat) add('eat'); if (m.rob) add('hexrob', val(m.rob)); if (m.blk) add('blk', val(m.blk)); if (m.str) add('str', val(m.str));
  } else if (m.k === 'summon') add('summon', nameStr(enemyName(m.kind)));
  else if (m.k === 'idle') add('idle');
  else if (m.k === 'hide') add('hide');
  else if (m.k === 'charge') add('charge');
  return out.join(L ? '. ' : ', ');
}
const TRT: Record<string, string[]> = {
  territory: ['영역: 내 대지가 놓일 때마다 힘 +{n}', 'Territory: gains {n} strength whenever a land of yours comes into play'],
  landhurt: ['내 대지가 놓일 때마다 나에게 피해 {n}', 'Deals {n} damage to you whenever a land of yours comes into play'],
  landburn: ['내 대지가 놓일 때마다 나에게 화상 {n}', 'Burns you for {n} whenever a land of yours comes into play'],
  landmill: ['내 대지가 놓일 때마다 내 뽑을 더미에서 {n}장을 버린다', 'Discards {n} from your draw pile whenever a land of yours comes into play'],
  armor: ['장갑: 내 턴마다 방어 {n}으로 시작한다', 'Armored: has {n} block on each of your turns'],
  regen: ['재생: 제 차례마다 체력 {n} 회복', 'Regenerates {n} HP on its turn'],
  revive: ['한 번 쓰러져도 절반의 체력으로 되살아난다', 'The first time it falls it returns with half its HP'],
  swarm: ['불어남: 제 차례마다 힘 +{n}', 'Swarming: gains {n} strength on each of its turns'],
  bloodthirst: ['피의 갈증: 내 체력이 절반 이하면 공격 피해 +{n}', 'Bloodthirst: +{n} damage while you are at half HP or less'],
  uncounterable: ['무효로 할 수 없다', 'Its intent cannot be cancelled'],
  shroud: ['주문과 마법진의 대상이 될 수 없다', 'Instants, sorceries and auras cannot target it'],
  sleeper: ['내 대지가 놓이기 전에는 공격하지 않는다', 'It does not attack until a land of yours comes into play'],
  rage: ['체력이 절반 아래로 내려가면 힘 +{n}', 'Gains {n} strength when it falls below half HP'],
};
export function traitLines(kind: string) {
  const t = ENEMIES[kind].traits, L = LANG === 'ko' ? 0 : 1, out: string[] = [];
  if (t) for (const k in t) if (TRT[k]) out.push(TRT[k][L].split('{n}').join(t[k] === true ? '' : val(t[k]) as Loose));
  return out;
}
