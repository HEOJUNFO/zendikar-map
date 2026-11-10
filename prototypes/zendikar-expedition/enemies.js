// PROTOTYPE - NOT FOR PRODUCTION
// Question: 세계 지도에서 갈 곳을 고르는 것이 곧 덱을 짓는 일이 될 때, 젠디카르를 여행하는 느낌과 덱빌더의 재미가 한 판 안에서 함께 살아나는가?
// Date: 2026-11-10
// The enemies: one kind for each continent's wilds, two great beasts, and the Roil Elemental.
// Each is a creature the zendikar-map project places on that continent in saga 1 phase 1
// (lore-data.js has its name and number). Its moves here are this game's own design.
// Every number is a config.js key. A move: k (what it does), d (damage), hits, b/blk (block),
// str (strength gained), burn (burn left on you), steal (it heals by the damage it deals).
'use strict';

const ENEMIES = {
  'oran-rief-recluse': {
    ko: '오란리프 은둔거미', cont: 'tazeem', hp: 'recluse_hp', w: 44, h: 30,
    moves: [
      { k: 'atk', d: 'recluse_atk', name: { ko: '물기', en: 'Bite' } },
      { k: 'web', b: 'recluse_blk', name: { ko: '거미줄', en: 'Webbing' }, note: { ko: '다음 턴 내 에너지 −1', en: 'You have 1 less energy next turn' } },
      { k: 'atk', d: 'recluse_atk2', name: { ko: '덮치기', en: 'Pounce' } },
    ],
    lore: { ko: '오란리프의 커다란 거미.', en: 'A large spider of Oran-Rief.' },
  },
  'hellfire-mongrel': {
    ko: '지옥불 잡종견', cont: 'akoum', hp: 'mongrel_hp', w: 46, h: 34,
    moves: [
      { k: 'atk', d: 'mongrel_atk', name: { ko: '물어뜯기', en: 'Maul' } },
      { k: 'atk', d: 'mongrel_fire', burn: 'mongrel_burn', name: { ko: '지옥불', en: 'Hellfire' }, note: { ko: '화상을 남긴다', en: 'Leaves you burning' } },
    ],
    lore: { ko: '아쿰에 사는, 개를 닮은 불의 정령 짐승.', en: 'A dog-like fire elemental beast of Akoum.' },
  },
  'heartstabber-mosquito': {
    ko: '심장찌르기 모기', cont: 'guul-draz', hp: 'mosquito_hp', w: 34, h: 30, fly: true, pack: 2,
    moves: [
      { k: 'atk', d: 'mosquito_atk', steal: true, name: { ko: '흡혈', en: 'Drain' }, note: { ko: '준 피해만큼 회복한다', en: 'Heals by the damage it deals' } },
      { k: 'atk', d: 'mosquito_atk', name: { ko: '찌르기', en: 'Stab' } },
      { k: 'atk', d: 'mosquito_dive', name: { ko: '급강하', en: 'Dive' } },
    ],
    lore: { ko: '굴 드라즈의 늪에 사는 거대한 모기. 침이 투창 같다.', en: 'A giant mosquito of the Guul Draz swamps, its stinger like a javelin.' },
  },
  'surrakar-marauder': {
    ko: '수라카 약탈자', cont: 'bala-ged', hp: 'surrakar_hp', w: 40, h: 46,
    moves: [
      { k: 'buff', blk: 'surrakar_blk', str: 'surrakar_str', name: { ko: '위협', en: 'Menace' } },
      { k: 'atk', d: 'surrakar_atk', name: { ko: '강타', en: 'Smash' } },
      { k: 'atk', d: 'surrakar_atk', name: { ko: '강타', en: 'Smash' } },
    ],
    lore: { ko: '발라 게드 토박이인 덩치 큰 양서류 종족.', en: 'A hulking amphibious race native to Bala Ged.' },
  },
  'territorial-baloth': {
    cont: 'murasa', hp: 'baloth_hp', w: 54, h: 40, traits: { territory: 'baloth_land_str' },
    moves: [
      { k: 'charge', name: { ko: '영역 표시', en: 'Marking its ground' }, note: { ko: '다음 공격이 2배', en: 'Its next attack is doubled' } },
      { k: 'atk', d: 'baloth_charge', name: { ko: '돌진', en: 'Charge' } },
      { k: 'atk', d: 'baloth_atk', name: { ko: '들이받기', en: 'Gore' } },
    ],
    lore: { ko: '냄새가 닿는 땅이면 어디든 제 영역으로 삼는다.', en: 'It claims any ground within smelling distance.' },
  },
  'scythe-tiger': {
    ko: '낫 호랑이', cont: 'ondu', hp: 'tiger_hp', w: 52, h: 32,
    moves: [
      { k: 'atk', d: 'tiger_atk', name: { ko: '낫 베기', en: 'Scythe' } },
      { k: 'hide', str: 'tiger_stalk_str', name: { ko: '숨어들기', en: 'Stalk' }, note: { ko: '다음 내 턴 동안 겨눌 수 없다', en: 'Cannot be targeted on your next turn' } },
      { k: 'atk', d: 'tiger_ambush', name: { ko: '기습', en: 'Ambush' } },
    ],
    lore: { ko: "'환경에 맞춰 바뀌는 대신 환경을 제게 맞춘다.'", en: "'Instead of adapting to its environment, it adapts its environment to itself.'" },
  },
  'hellkite-charger': {
    ko: '돌격하는 지옥룡', cont: 'akoum', hp: 'hellkite_hp', w: 88, h: 62, fly: true, big: true, elite: true,
    moves: [
      { k: 'atk', d: 'hellkite_dive', name: { ko: '급강하', en: 'Dive' } },
      { k: 'atk', d: 'hellkite_twin', hits: 2, name: { ko: '재돌격', en: 'Second pass' } },
      { k: 'buff', blk: 'hellkite_blk', str: 'hellkite_str', name: { ko: '선회', en: 'Wheel about' } },
    ],
    lore: { ko: '아쿰의 산악에 사는 지옥룡. 결코 많지는 않다.', en: "A hellkite of Akoum's mountains. They are never numerous." },
  },
  'terra-stomper': {
    cont: 'murasa', hp: 'stomper_hp', w: 84, h: 70, big: true, elite: true, traits: { uncounterable: true },
    moves: [
      { k: 'atk', d: 'stomper_atk', name: { ko: '짓밟기', en: 'Stomp' } },
      { k: 'buff', str: 'stomper_roar', name: { ko: '포효', en: 'Roar' } },
      { k: 'atk', d: 'stomper_atk', name: { ko: '짓밟기', en: 'Stomp' } },
    ],
    lore: { ko: '무라사의 정글에 사는, 나무만큼 자라는 포식 짐승.', en: "A predatory beast of Murasa's jungles that grows as tall as a tree." },
  },
  'roil-elemental': {
    ko: '탁류의 정령', cont: null, hp: 'roil_hp', w: 96, h: 84, fly: true, big: true, boss: true, traits: { rage: 'roil_rage' },
    moves: [
      { k: 'atk', d: 'roil_atk', name: { ko: '휘몰아침', en: 'Maelstrom' } },
      { k: 'lock', blk: 'roil_blk', name: { ko: '뒤집힌 땅', en: 'Upturned ground' }, note: { ko: '다음 턴에 대지를 낼 수 없다', en: 'You cannot play lands next turn' } },
      { k: 'atk', d: 'roil_slam', name: { ko: '솟구친 암석', en: 'Rising stone' } },
      { k: 'swallow', d: 'roil_swallow', name: { ko: '삼킴', en: 'Devour' }, note: { ko: '내 지속 카드 하나를 삼킨다 (없으면 공격)', en: 'Swallows one of your lasting cards (or attacks if you have none)' } },
    ],
    lore: { ko: '탁류 그 자체로 이루어진 정령. 기존 질서를 삼킬 만큼 굶주린 소용돌이.', en: 'An elemental made of the Roil itself: a vortex hungry enough to devour the status quo.' },
  },
};

// Who is met where is in enemies2.js (ROSTER). The one that ends every journey:
const BOSS = 'roil-elemental';
const FIGURE_ORDER = ['oran-rief-recluse', 'hellfire-mongrel', 'heartstabber-mosquito', 'surrakar-marauder',
  'territorial-baloth', 'scythe-tiger', 'hellkite-charger', 'terra-stomper', 'roil-elemental'];

function enemyName(kind) {
  const d = ENEMIES[kind], l = LORE[kind];
  if (LANG === 'ko') {
    if (l && l.ko) return { text: l.ko, star: false };
    if (d.ko) return { text: d.ko, star: true };
  }
  return { text: (l && l.en) || kind, star: false };
}
function isBig(e) { return !!ENEMIES[e.kind].big; }
function curMove(e) { const m = ENEMIES[e.kind].moves; return m[e.mi % m.length]; }
// True when the enemy's shown intent is an attack on you.
function intentIsAttack(e) {
  if (e.hp <= 0 || e.away > 0 || e.cancelled) return false;
  const m = curMove(e);
  if (m.k === 'atk') return true;
  if (m.k === 'swallow') return !(state.battle && state.battle.powers.length);
  return false;
}
// The damage one hit of the enemy's current attack would do, before your block.
function trait(e, name) { const t = ENEMIES[e.kind].traits; return t ? t[name] : undefined; }
function moveHits(m) { return m.hits ? val(m.hits) : 1; }
// The damage one hit of the enemy's current attack would do, before your block.
function intentDamage(e) {
  const m = curMove(e);
  if (!m.d) return 0;
  let d = Math.round(val(m.d) * e.scale) + e.str;
  const bt = trait(e, 'bloodthirst');
  if (bt && state.run.hp * 2 <= state.run.maxHp) d += val(bt);
  if (e.charged) d *= 2;
  if (e.halved) d = Math.ceil(d / 2);
  return Math.max(0, d - (e.weak || 0));
}
