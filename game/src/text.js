import './lore-data.js'; // the page's script order: this file ran after lore-data.js
// Every word on screen, in Korean and English. The player picks the language (the KO/EN button
// or L); the pick is remembered in this browser. A Korean name is the official printed one when
// the map project has it; otherwise it is this game's own translation and is drawn with a '*'.
'use strict';

export let LANG = 'en';
(function pickLanguage() {
  let saved = null;
  try { saved = localStorage.getItem('zx-lang'); } catch (e) { /* no storage: use the browser's */ }
  if (saved === 'ko' || saved === 'en') LANG = saved;
  else LANG = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ko' || q === 'en') LANG = q;
  document.documentElement.lang = LANG;
})();
export function setLang(l) {
  LANG = l; document.documentElement.lang = l;
  try { localStorage.setItem('zx-lang', l); } catch (e) { /* not remembered */ }
}

export const STR = {
  title: { ko: '젠디카르 원정대', en: 'Zendikar Expedition' },
  subtitle: { ko: '사가1 · 페이즈1 — 2009년, 엘드라지가 깨어나기 전', en: 'Saga 1 · Phase 1: 2009, before the Eldrazi woke' },
  start: { ko: 'Enter 또는 클릭: 원정 시작', en: 'Enter or click: begin the expedition' },
  ctl1: { ko: '마우스: 갈 곳 클릭 · 카드를 끌어 적에게 놓기', en: 'Mouse: click a place · drag a card onto an enemy' },
  ctl2: { ko: '숫자 키: 카드와 선택지 · E 또는 스페이스: 턴 종료', en: 'Number keys: cards and choices · E or Space: end turn' },
  ctl3: { ko: 'D: 덱 보기 · L: 한국어/English · M: 음소거', en: 'D: deck · L: 한국어/English · M: mute' },
  fan1: { ko: '비공식 팬 콘텐츠입니다. Wizards of the Coast의 승인이나 후원을 받지 않았습니다.', en: 'Unofficial Fan Content. Not approved or endorsed by Wizards of the Coast.' },
  fan2: { ko: '젠디카르와 카드 이름은 Wizards of the Coast의 자산입니다.', en: 'Zendikar and the card names are property of Wizards of the Coast.' },
  starNote: { ko: '* 게임 전용 번역 (공식 한국어판 이름 아님)', en: '' },

  day: { ko: '{d}일째', en: 'Day {d}' },
  daysLeft: { ko: '탁류까지 {n}일', en: '{n} days to the Roil' },
  hp: { ko: '체력', en: 'HP' },
  gold: { ko: '금화', en: 'Gold' },
  deck: { ko: '덱', en: 'Deck' },
  choose: { ko: '갈 곳을 고르세요', en: 'Choose where to go' },
  costDays: { ko: '{n}일 걸림', en: '{n}-day trip' },
  dayShort: { ko: '{n}일', en: '{n}d' },
  tooFar: { ko: '{n}일 걸림 — 날이 모자람', en: '{n}-day trip: not enough days' },
  visited: { ko: '지나온 곳', en: 'Already visited' },
  here: { ko: '지금 여기', en: 'You are here' },
  rough: { ko: '탁류로 길이 험함 (+1일)', en: 'The Roil tore up the way (+1 day)' },
  roughLegend: { ko: '길이 험함 (+1일)', en: 'Rough way (+1 day)' },
  cls_town: { ko: '마을 — 장터', en: 'Town: market' },
  cls_wild: { ko: '야생 — 전투', en: 'Wilds: a fight' },
  cls_elite: { ko: '큰 짐승 — 정예', en: 'Great beast: elite' },
  cls_camp: { ko: '야영 — 휴식', en: 'Camp: rest' },
  faceRoil: { ko: '여기서 탁류를 맞이한다 (Enter)', en: 'Face the Roil here (Enter)' },
  landfall: { ko: '상륙! {land} 카드를 얻었다', en: 'Landfall! You gain {land}' },
  arrive: { ko: '{cont}에 닿았다', en: 'You reach {cont}' },
  roilComes: { ko: '탁류가 덮친다', en: 'The Roil is upon you' },
  legend: { ko: '마을 · 야생 · 큰 짐승 · 야영', en: 'Town · Wilds · Beast · Camp' },

  endTurn: { ko: '턴 종료 (E)', en: 'End turn (E)' },
  energy: { ko: '에너지', en: 'Energy' },
  drawPile: { ko: '뽑을 더미', en: 'Draw' },
  discardPile: { ko: '버린 더미', en: 'Discard' },
  incoming: { ko: '받을 피해 {n}', en: 'Incoming {n}' },
  block: { ko: '방어', en: 'Block' },
  yourTurn: { ko: '내 턴', en: 'Your turn' },
  enemyTurn: { ko: '적의 턴', en: 'Enemy turn' },
  turnN: { ko: '{n}턴', en: 'Turn {n}' },
  in_atk: { ko: '공격', en: 'Attack' },
  in_blk: { ko: '방어', en: 'Block' },
  in_buff: { ko: '강화', en: 'Buff' },
  in_hex: { ko: '방해', en: 'Hex' },
  in_charge: { ko: '힘 모으기', en: 'Winding up' },
  in_hide: { ko: '숨기', en: 'Hiding' },
  in_none: { ko: '무효', en: 'Cancelled' },
  in_away: { ko: '{n}턴 뒤 돌아옴', en: 'Back in {n}' },
  no_energy: { ko: '에너지가 모자랍니다', en: 'Not enough energy' },
  no_land: { ko: '이번 턴엔 대지를 더 낼 수 없습니다', en: 'No more lands this turn' },
  no_landlock: { ko: '땅이 뒤집혀 이번 턴엔 대지를 낼 수 없습니다', en: 'The ground has turned: no lands this turn' },
  no_target: { ko: '대상이 필요합니다: 적에게 끌어다 놓으세요', en: 'It needs a target: drag it onto an enemy' },
  no_gold: { ko: '금화가 모자랍니다', en: 'Not enough gold' },
  no_hidden: { ko: '숨어 있어 겨눌 수 없습니다', en: 'It is hidden and cannot be targeted' },
  no_effect: { ko: '지금은 효과가 없습니다', en: 'It would do nothing now' },
  no_big: { ko: '큰 짐승에게는 통하지 않습니다', en: 'It does not work on a great beast' },
  st_burn: { ko: '화상', en: 'Burn' },
  st_web: { ko: '거미줄', en: 'Webbed' },
  st_str: { ko: '힘', en: 'Strength' },
  st_charged: { ko: '돌진 준비', en: 'Wound up' },
  st_hidden: { ko: '숨음', en: 'Hidden' },
  st_away: { ko: '추방', en: 'Away' },
  kw_landfall: { ko: '상륙', en: 'Landfall' },
  kw_trap: { ko: '함정', en: 'Trap' },
  kw_land: { ko: '대지', en: 'Land' },
  kw_power: { ko: '지속', en: 'Lasting' },
  kwh_landfall: { ko: '상륙: 이번 턴에 대지를 냈다면 일어난다.', en: 'Landfall: happens if you played a land this turn.' },
  kwh_trap: { ko: '함정: 조건이 맞으면 비용이 0이 된다.', en: 'Trap: costs 0 when its condition is met.' },
  kwh_land: { ko: '대지: 비용 0, 한 턴에 1장. 내면 상륙이 일어난다.', en: 'Land: costs 0, one a turn. Playing it is landfall.' },
  kwh_power: { ko: '지속: 낸 뒤 이번 전투 내내 남는다.', en: 'Lasting: stays for the rest of the fight.' },
  kwh_burn: { ko: '화상: 턴 시작에 그만큼 피해를 받고 1 줄어든다.', en: 'Burn: deals that much at turn start, then drops by 1.' },
  ty_attack: { ko: '공격', en: 'Attack' },
  ty_skill: { ko: '기술', en: 'Skill' },
  ty_power: { ko: '지속', en: 'Lasting' },
  ty_land: { ko: '대지', en: 'Land' },
  foundIn: { ko: '놓인 곳: {p}', en: 'Found in: {p}' },
  trait: { ko: '특성', en: 'Trait' },

  rewardTitle: { ko: '이 땅에서 얻은 것', en: 'Found in this land' },
  rewardHint: { ko: '카드 하나를 고르거나 건너뛰세요 (1·2·3, S)', en: 'Take one card, or skip (1, 2, 3, S)' },
  skip: { ko: '건너뛰기 (S)', en: 'Skip (S)' },
  goldGain: { ko: '금화 +{n}', en: '+{n} gold' },
  healGain: { ko: '체력 +{n}', en: '+{n} HP' },
  shopTitle: { ko: '{p} 장터', en: '{p} market' },
  shopHint: { ko: '카드를 눌러 산다 (1–5) · R: 카드 제거 · Enter: 떠나기', en: 'Click a card to buy (1-5) · R: remove a card · Enter: leave' },
  shopRemove: { ko: '카드 제거: 금화 {p} (R)', en: 'Remove a card: {p} gold (R)' },
  sold: { ko: '팔림', en: 'Sold' },
  leave: { ko: '떠나기 (Enter)', en: 'Leave (Enter)' },
  price: { ko: '금화 {p}', en: '{p} gold' },
  campTitle: { ko: '야영', en: 'Camp' },
  campHint: { ko: '하나를 고르세요 (1, 2)', en: 'Choose one (1, 2)' },
  campRest: { ko: '쉬기: 체력 +{n}', en: 'Rest: +{n} HP' },
  campTrim: { ko: '덱 다듬기: 카드 1장 제거', en: 'Trim the deck: remove 1 card' },
  deckTitle: { ko: '덱 ({n}장)', en: 'Deck ({n} cards)' },
  deckPick: { ko: '제거할 카드를 고르세요 (Esc: 취소)', en: 'Choose a card to remove (Esc: cancel)' },
  close: { ko: '닫기 (Esc)', en: 'Close (Esc)' },
  removed: { ko: '{c} 제거', en: 'Removed {c}' },

  overTitle: { ko: '원정이 끝났다', en: 'The expedition ends' },
  overAt: { ko: '{d}일째, {p}에서 쓰러졌다', en: 'You fell at {p} on day {d}' },
  restart: { ko: 'R 또는 Enter: 새 원정', en: 'R or Enter: a new expedition' },
  winTitle: { ko: '탁류를 넘었다!', en: 'You outlasted the Roil!' },
  summary: { ko: '{n}곳을 여행 · 대륙 {c}곳 · 덱 {k}장', en: '{n} places · {c} continents · {k} cards' },
  again: { ko: 'Enter: 새 원정', en: 'Enter: a new expedition' },
  figures: { ko: '원정대와 적', en: 'The expedition and its foes' },
  mute: { ko: '음소거', en: 'Mute' },
  you: { ko: '원정대장', en: 'Expedition leader' },
  n_land: { ko: '대지', en: 'land' },
};

export function T(key, vars) {
  const e = STR[key];
  let s = e ? (e[LANG] != null ? e[LANG] : e.en) : key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
// Pick this language's text from a {ko, en} pair.
export function LX(pair) { return pair ? (pair[LANG] != null ? pair[LANG] : pair.en) : ''; }

// One-line notes on each stop, shortened from the map project's own descriptions.
export const STOP_TEXT = {
  'sea-gate': { ko: '할리마르 만 입구를 막은 고대 댐 위의 도시. 다섯 탐험 가문의 출발지.', en: 'A city on the ancient dam across the mouth of Halimar. Home port of five expedition houses.' },
  'oran-rief': { ko: '자라는 암초 바위 위에 거목과 덩굴이 뒤엉킨 거대한 숲.', en: 'A huge forest of giant trees and vines tangled over growing reef-rock.' },
  'ikiral': { ko: '쪼개진 거대한 다면체 안에 자리 잡은 세지리의 교역소.', en: 'A trading post in Sejiri, set inside a huge split hedron.' },
  'midnight-pass': { ko: '절벽을 오르지 않고 세지리로 들어가는 유일한 길인 좁은 해협.', en: 'A narrow strait, the only way into Sejiri short of climbing the cliffs.' },
  'affa': { ko: '아쿰의 이빨 기슭에 있는 아쿰의 주 거주지이자 교역 중심.', en: "Akoum's main settlement and trading center, at the foot of the Teeth." },
  'tal-terig': { ko: "분지에서 수백 피트 솟은 '퍼즐 탑' 유적. 함정투성이다.", en: "The ruin of the 'Puzzle Tower', hundreds of feet high and full of traps." },
  'teeth-of-akoum': { ko: '아쿰 북부의 험준한 산맥. 날개나 노련한 안내인 없이는 넘을 수 없다.', en: 'Rugged ranges across northern Akoum, impassable without wings or a seasoned guide.' },
  'free-city-of-nimana': { ko: '인간이 세운 굴 드라즈의 해안 도시이자 주요 항구.', en: 'A coastal city and main port of Guul Draz, built by humans.' },
  'hagra-swamp': { ko: '피라냐가 들끓는 습지와 가라앉는 고대 유적으로 가득한 늪.', en: 'A swamp of piranha-infested marshes and sinking ancient ruins.' },
  'tangled-vales': { ko: '가파른 언덕 사이로 정글 계곡이 이어진 조라가 엘프의 터전.', en: 'Jungle valleys between steep hills, home of the Joraga elves.' },
  'kazandu': { ko: '꺼진 땅의 협곡과 골짜기를 거대한 자디 나무가 덮은 땅.', en: 'Canyons and valleys of collapsed land under giant jaddi trees.' },
  'sunder-bay': { ko: "Murasa's Wall에서 가장 큰 틈인, 조수가 거센 거대한 만.", en: "A huge bay with violent tides, the largest break in Murasa's Wall." },
  'kabira': { ko: '아가딤의 다면체 지역 곁의 정착지. 헤드론을 연구하고 숭배하는 이들이 모인다.', en: 'A settlement by the Hedron Fields of Agadeem, drawing those who study and worship hedrons.' },
  'turntimber': { ko: '나선형으로 치솟는 나무들로 유명한 온두의 광활한 온대림.', en: "Ondu's vast temperate forest, famous for trees that spiral upward." },
  'makindi-trenches': { ko: '깎아지른 벽의 협곡 미로. 절벽에 코르가 산다.', en: 'A maze of sheer-walled canyons. Kor live on the cliffs.' },
};
// This game's own Korean names for places the map project has no official Korean name for.
const STOP_KO = { 'ikiral': '이키랄', 'midnight-pass': '한밤 해협' };

// A stop's or a continent's name in this language: {text, star} (star: an unofficial Korean name).
export function stopName(s) {
  if (LANG === 'ko') {
    if (s.ko) return { text: s.ko, star: false };
    if (STOP_KO[s.id]) return { text: STOP_KO[s.id], star: true };
  }
  return { text: s.en, star: false };
}
export function contName(id) { const c = WORLD.continents[id]; return c ? LX(c) : id; }
