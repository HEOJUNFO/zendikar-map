import { WORLD } from './game/data';
import type { Stop } from './game/data';
import type { Lang, Words } from './game/types';
// Every word on screen, in Korean and English. The player picks the language (the KO/EN button
// or L); the pick is remembered in this browser. A Korean name is the official printed one when
// the map project has it; otherwise it is this game's own translation and is drawn with a '*'.

export let LANG: Lang = 'en';
(function pickLanguage() {
  let saved = null;
  try { saved = localStorage.getItem('zx-lang'); } catch (e) { /* no storage: use the browser's */ }
  if (saved === 'ko' || saved === 'en') LANG = saved;
  else LANG = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ko' || q === 'en') LANG = q;
  document.documentElement.lang = LANG;
})();
export function setLang(l: Lang) {
  LANG = l; document.documentElement.lang = l;
  try { localStorage.setItem('zx-lang', l); } catch (e) { /* not remembered */ }
}

export const STR: Record<string, { ko: string; en: string }> = {
  title: { ko: '젠디카르 원정대', en: 'Zendikar Expedition' },
  subtitle: { ko: '사가1 · 페이즈1 — 2009년, 엘드라지가 깨어나기 전', en: 'Saga 1 · Phase 1: 2009, before the Eldrazi woke' },
  start: { ko: 'Enter 또는 클릭: 원정 시작', en: 'Enter or click: begin the expedition' },
  ctl1: { ko: '마우스: 갈 곳 클릭 · 카드를 끌어 적이나 동료에게 · 대지와 동료는 클릭', en: 'Mouse: click a place · drag a card onto an enemy or one of yours · click a land or one of yours' },
  ctl2: { ko: '숫자: 카드 (K: 키커) · Z: 대지 놓기 (X: 다른 대지) · Q W R T Y: 공격/수호 · E: 턴 종료', en: 'Numbers: cards (K: kicker) · Z: land (X: another) · Q W R T Y: strike or guard · E: end turn' },
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
  costDays: { ko: '걸어서 {n}일', en: '{n}-day walk' },
  costSail: { ko: '건너는 데 {n}일', en: '{n}-day crossing' },
  chooseSail: { ko: '어느 대륙으로 건너갈까', en: 'Cross to which continent' },
  sail: { ko: '다른 대륙으로 (S)', en: 'Other continents (S)' },
  sailBack: { ko: '대륙 지도로 (Esc)', en: 'Back to the land (Esc)' },
  landsAt: { ko: '닿는 곳: {p}', en: 'Landing: {p}' },
  crossing: { ko: '{c} 가는 뱃길', en: 'Crossing to {c}' },
  atSea: { ko: '바다 위 {n}일째', en: 'Day {n} at sea' },
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
  cls_site: { ko: '명소 — 사건', en: 'Site: a happening' },
  faceRoil: { ko: '여기서 탁류를 맞이한다 (Enter)', en: 'Face the Roil here (Enter)' },
  landfall: { ko: '상륙! 대지 더미에 {land} 한 장', en: 'Landfall! {land} joins your land pile' },
  arrive: { ko: '{cont}에 닿았다', en: 'You reach {cont}' },
  roilComes: { ko: '탁류가 덮친다', en: 'The Roil is upon you' },
  legend: { ko: '마을 · 야생 · 큰 짐승 · 야영', en: 'Town · Wilds · Beast · Camp' },

  endTurn: { ko: '턴 종료 (E)', en: 'End turn (E)' },
  mana: { ko: '마나', en: 'Mana' },
  manaHelp: { ko: '마나: 놓인 대지마다 턴에 1. 카드 값만큼 쓰고, 그중 하나는 카드의 색이어야 한다.', en: 'Mana: 1 a turn from each land in play. A card takes its cost, one of it in its colour.' },
  landPile: { ko: '대지 더미', en: 'Land pile' },
  landsIn: { ko: '놓인 대지 {n}', en: '{n} lands in play' },
  drawPile: { ko: '뽑을 더미', en: 'Draw' },
  discardPile: { ko: '버린 더미', en: 'Discard' },
  incoming: { ko: '받을 피해 {n}', en: 'Incoming {n}' },
  block: { ko: '방어', en: 'Block' },
  yourTurn: { ko: '내 턴', en: 'Your turn' },
  enemyTurn: { ko: '적의 턴', en: 'Enemy turn' },
  turnN: { ko: '{n}턴', en: 'Turn {n}' },
  stance_atk: { ko: '공격', en: 'Strike' },
  stance_grd: { ko: '수호', en: 'Guard' },
  stance_new: { ko: '막 도착: 이번 턴은 수호', en: 'Just arrived: guards this turn' },
  stanceHelp: { ko: '클릭: 공격 ↔ 수호', en: 'Click: strike ↔ guard' },
  wears: { ko: '착용: {c}', en: 'Wears: {c}' },
  leaderHelp: { ko: '원정대장: 쓰러지면 원정이 끝난다. 장비와 마법진을 달 수 있다.', en: 'The leader: the expedition ends if they fall. They can wear equipment and auras.' },
  miss: { ko: '닿지 않음', en: 'No reach' },
  flightOn: { ko: '비행', en: 'Flying' },
  groundOnly: { ko: '비행하는 적은 못 막음', en: 'not against fliers' },
  kickerArmed: { ko: '키커: 다음 카드를 강화해서 낸다', en: 'Kicker: the next card is played kicked' },
  no_kicker: { ko: '키커가 없는 카드입니다', en: 'This card has no kicker' },
  in_atk: { ko: '공격', en: 'Attack' },
  in_blk: { ko: '방어', en: 'Block' },
  in_buff: { ko: '강화', en: 'Buff' },
  in_hex: { ko: '방해', en: 'Hex' },
  in_charge: { ko: '힘 모으기', en: 'Winding up' },
  in_hide: { ko: '숨기', en: 'Hiding' },
  in_none: { ko: '무효', en: 'Cancelled' },
  in_away: { ko: '{n}턴 뒤 돌아옴', en: 'Back in {n}' },
  no_mana: { ko: '마나가 모자랍니다', en: 'Not enough mana' },
  no_color: { ko: '{c} 마나가 필요합니다', en: 'It needs {c} mana' },
  no_land: { ko: '이번 턴엔 대지를 더 놓을 수 없습니다', en: 'No more lands this turn' },
  no_landsleft: { ko: '대지 더미가 비었습니다', en: 'The land pile is empty' },
  no_landlock: { ko: '땅이 뒤집혀 이번 턴엔 대지를 놓을 수 없습니다', en: 'The ground has turned: no lands this turn' },
  no_sacland: { ko: '희생할 대지가 놓여 있어야 합니다', en: 'You need a land in play to give up' },
  no_target: { ko: '대상이 필요합니다: 적에게 끌어다 놓으세요', en: 'It needs a target: drag it onto an enemy' },
  no_mate: { ko: '원정대장이나 생물에게 끌어다 놓으세요', en: 'Drag it onto the leader or a creature' },
  no_room: { ko: '전장에 생물 자리가 없습니다', en: 'No room for another creature' },
  no_fresh: { ko: '막 도착했습니다: 이번 턴은 수호만 합니다', en: 'It just arrived: it only guards this turn' },
  no_defender: { ko: '수비대는 공격하지 않습니다', en: 'A defender does not strike' },
  no_gold: { ko: '금화가 모자랍니다', en: 'Not enough gold' },
  no_hidden: { ko: '숨어 있어 겨눌 수 없습니다', en: 'It is hidden and cannot be targeted' },
  no_effect: { ko: '지금은 효과가 없습니다', en: 'It would do nothing now' },
  no_big: { ko: '큰 짐승에게는 통하지 않습니다', en: 'It does not work on a great beast' },
  st_burn: { ko: '화상', en: 'Burn' },
  st_rot: { ko: '역병', en: 'Blight' },
  st_grasp: { ko: '붙들림', en: 'Held' },
  st_web: { ko: '거미줄', en: 'Webbed' },
  st_str: { ko: '힘', en: 'Strength' },
  st_charged: { ko: '돌진 준비', en: 'Wound up' },
  st_hidden: { ko: '숨음', en: 'Hidden' },
  st_away: { ko: '추방', en: 'Away' },
  col_W: { ko: '백색', en: 'white' },
  col_U: { ko: '청색', en: 'blue' },
  col_B: { ko: '흑색', en: 'black' },
  col_R: { ko: '적색', en: 'red' },
  col_G: { ko: '녹색', en: 'green' },
  col_: { ko: '무색', en: 'colourless' },
  kd_creature: { ko: '생물', en: 'Creature' },
  kd_equipment: { ko: '장비', en: 'Equipment' },
  kd_aura: { ko: '마법진', en: 'Aura' },
  kd_enchantment: { ko: '부여마법', en: 'Enchantment' },
  kd_artifact: { ko: '마법물체', en: 'Artifact' },
  kd_planeswalker: { ko: '플레인즈워커', en: 'Planeswalker' },
  kd_instant: { ko: '순간마법', en: 'Instant' },
  kd_sorcery: { ko: '집중마법', en: 'Sorcery' },
  kd_land: { ko: '대지', en: 'Land' },
  kw_landfall: { ko: '상륙', en: 'Landfall' },
  kw_kicker: { ko: '키커', en: 'Kicker' },
  kw_trap: { ko: '함정', en: 'Trap' },
  kwh_creature: { ko: '생물: 전장에 남는다. 턴이 끝날 때 공격(대상을 친다)하거나 수호(방어를 더한다)한다.', en: 'Creature: it stays on the field. As the turn ends it strikes the target, or guards and adds to your block.' },
  kwh_equipment: { ko: '장비: 원정대장이나 생물 하나가 전투 내내 지닌다.', en: 'Equipment: the leader or a creature wears it for the rest of the fight.' },
  kwh_aura: { ko: '마법진: 붙은 대상에 전투 내내 남는다.', en: 'Aura: it stays on what it is put on for the rest of the fight.' },
  kwh_enchantment: { ko: '부여마법: 낸 뒤 이번 전투 내내 남는다.', en: 'Enchantment: it stays for the rest of the fight.' },
  kwh_artifact: { ko: '마법물체: 낸 뒤 이번 전투 내내 남는다.', en: 'Artifact: it stays for the rest of the fight.' },
  kwh_planeswalker: { ko: '플레인즈워커: 곁에 남아 턴마다 돕는다.', en: 'Planeswalker: stays at your side and helps every turn.' },
  kwh_instant: { ko: '순간마법: 한 번 일어난다. 내지 않으면 턴이 끝나도 손에 남는다.', en: 'Instant: it happens once. Not played, it stays in your hand when the turn ends.' },
  kwh_sorcery: { ko: '집중마법: 한 번 일어난다. 내지 않으면 턴이 끝날 때 버려진다.', en: 'Sorcery: it happens once. Not played, it is discarded when the turn ends.' },
  kwh_land: { ko: '대지: 덱이 아닌 대지 더미에 있다. 한 턴에 1장 놓고, 놓인 대지는 턴마다 제 색 마나를 1 낸다.', en: 'Land: kept in the land pile, not the deck. Play one a turn; a land in play makes 1 mana of its colour every turn.' },
  kwh_landfall: { ko: '상륙: 대지가 전장에 놓일 때 일어난다.', en: 'Landfall: happens when a land comes into play.' },
  kwh_trap: { ko: '함정: 순간마법. 조건이 맞으면 비용이 0이 된다. 내지 않으면 손에 남아 때를 기다린다.', en: 'Trap: an instant. It costs 0 when its condition is met. Not played, it stays in hand and waits.' },
  kwh_kicker: { ko: '키커: 마나를 더 내면 강화된 효과가 대신 일어난다. 카드의 +N 보석을 잡고 내거나, K를 누르고 낸다.', en: 'Kicker: pay the extra mana and the stronger effect happens instead. Grab the card by its +N gem, or press K and play it.' },
  kwh_fly: { ko: '비행: 타격이 적의 방어를 무시하고, 수호하면 비행하는 적의 공격도 막는다.', en: 'Flying: its strikes ignore block, and its guard stops enemies that fly too.' },
  kwh_reach: { ko: '대공: 수호하면 비행하는 적의 공격도 막는다.', en: 'Reach: its guard stops enemies that fly too.' },
  kwh_walk: { ko: '지형 행군: 그 기본 대지를 주는 대륙에서 싸울 때 타격이 방어를 무시한다 (섬 타짐 · 산 아쿰 · 늪 굴 드라즈 · 숲 발라 게드·무라사 · 들 온두·세지리).', en: 'Landwalk: its strikes ignore block in a fight on the continent that gives that basic land (Island Tazeem · Mountain Akoum · Swamp Guul Draz · Forest Bala Ged, Murasa · Plains Ondu, Sejiri).' },
  kwh_pierce: { ko: '관통: 타격이 적의 방어를 무시한다.', en: 'Piercing: its strikes ignore block.' },
  kwh_haste: { ko: '신속: 도착한 턴에도 공격할 수 있다.', en: 'Haste: it may strike the turn it arrives.' },
  kwh_vigil: { ko: '경계: 공격하면서 수호도 한다.', en: 'Vigilance: it guards even while it strikes.' },
  kwh_defender: { ko: '수비대: 공격하지 않고 늘 수호한다.', en: 'Defender: it never strikes and always guards.' },
  kwh_slow: { ko: '느린 대지: 놓인 턴에는 마나를 내지 않는다.', en: 'Slow land: it makes no mana on the turn it comes into play.' },
  kwh_used: { ko: '소모: 효과를 내고 나면 이번 전투에서 사라진다.', en: 'Used up: once it has done its work it is gone for this fight.' },
  kwh_burn: { ko: '화상: 턴 시작에 그만큼 피해를 받고 1 줄어든다.', en: 'Burn: deals that much at turn start, then drops by 1.' },
  foundIn: { ko: '놓인 곳: {p}', en: 'Found in: {p}' },
  trait: { ko: '특성', en: 'Trait' },

  rewardTitle: { ko: '이 땅에서 얻은 것', en: 'Found in this land' },
  rewardHint: { ko: '카드 하나를 고르거나 건너뛰세요 (1·2·3, S)', en: 'Take one card, or skip (1, 2, 3, S)' },
  skip: { ko: '건너뛰기 (S)', en: 'Skip (S)' },
  goldGain: { ko: '금화 +{n}', en: '+{n} gold' },
  healGain: { ko: '체력 +{n}', en: '+{n} HP' },
  shopTitle: { ko: '{p} 장터', en: '{p} market' },
  shopHint: { ko: '눌러서 산다: 카드 1–5, 기본 대지 6–0 · R: 카드 제거 · Enter: 떠나기', en: 'Click to buy: cards 1-5, basic lands 6-0 · R: remove a card · Enter: leave' },
  shopBasics: { ko: '기본 대지 한 장: 금화 {p}', en: 'A basic land: {p} gold' },
  offColor: { ko: '이 색을 내는 대지가 없다', en: 'No land of yours makes this colour' },
  shopRemove: { ko: '카드 제거: 금화 {p} (R)', en: 'Remove a card: {p} gold (R)' },
  sold: { ko: '팔림', en: 'Sold' },
  leave: { ko: '떠나기 (Enter)', en: 'Leave (Enter)' },
  price: { ko: '금화 {p}', en: '{p} gold' },
  onTheWay: { ko: '{c} · {p} 가는 길', en: 'On the way to {p}, {c}' },
  eventHint: { ko: '하나를 고르세요 (1, 2)', en: 'Choose one (1, 2)' },
  eventGo: { ko: '계속 (Enter)', en: 'Go on (Enter)' },
  campTitle: { ko: '야영', en: 'Camp' },
  campHint: { ko: '하나를 고르세요 (1, 2)', en: 'Choose one (1, 2)' },
  campRest: { ko: '쉬기: 체력 +{n}', en: 'Rest: +{n} HP' },
  campTrim: { ko: '덱 다듬기: 카드 1장 제거', en: 'Trim the deck: remove 1 card' },
  deckTitle: { ko: '덱 {n}장 · 대지 {m}장', en: 'Deck: {n} cards · {m} lands' },
  deckPick: { ko: '제거할 카드를 고르세요 (Esc: 취소)', en: 'Choose a card to remove (Esc: cancel)' },
  close: { ko: '닫기 (Esc)', en: 'Close (Esc)' },
  removed: { ko: '{c} 제거', en: 'Removed {c}' },

  overTitle: { ko: '원정이 끝났다', en: 'The expedition ends' },
  overAt: { ko: '{d}일째, {p}에서 쓰러졌다', en: 'You fell at {p} on day {d}' },
  restart: { ko: 'R 또는 Enter: 새 원정', en: 'R or Enter: a new expedition' },
  winTitle: { ko: '탁류를 넘었다!', en: 'You outlasted the Roil!' },
  summary: { ko: '{n}곳을 여행 · 대륙 {c}곳 · 덱 {k}장 · 대지 {l}장', en: '{n} places · {c} continents · {k} cards · {l} lands' },
  again: { ko: 'Enter: 새 원정', en: 'Enter: a new expedition' },
  figures: { ko: '원정대와 적', en: 'The expedition and its foes' },
  mute: { ko: '음소거', en: 'Mute' },
  you: { ko: '원정대장', en: 'Expedition leader' },
  n_land: { ko: '대지', en: 'land' },
};

export function T(key: string, vars?: Record<string, string | number>) {
  const e = STR[key];
  let s = e ? (e[LANG] != null ? e[LANG] : e.en) : key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
// Pick this language's text from a {ko, en} pair.
export function LX(pair: Words | null | undefined) { return pair ? (pair[LANG] != null ? pair[LANG]! : pair.en) : ''; }

// One-line notes on each stop, shortened from the map project's own descriptions.
export const STOP_TEXT: Record<string, Words> = {
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
  // Tazeem
  'halimar': { ko: '고대 댐 바다 관문이 만의 입구를 막아 생긴 깊은 내해. 인어들은 해신 울라가 그 바닥을 헤엄친다고 믿는다.', en: 'A deep inland sea, made when the ancient dam of Sea Gate closed the mouth of a bay. Merfolk believe the sea god Ula swims its floor.' },
  'umara-river': { ko: '깊은 협곡을 따라 여러 폭포로 떨어지는 타짐의 급류. 협곡은 탁류가 가장 덜 미치는 곳이다.', en: "Tazeem's torrent, falling through a deep gorge over many waterfalls. The gorge is where the Roil reaches least." },
  'calcite-flats': { ko: '타짐의 해변을 고리처럼 두른 방해석 모래 평원. 얇은 겉껍질 아래가 진흙이라 빠지기 쉽다.', en: 'Plains of calcite sand ringing the shores of Tazeem. Under a thin crust lies mud that swallows the careless.' },
  'the-sunspring': { ko: '우뚝 솟은 Bulwark 아래의 흰 대리석 샘. 그 물이 독과 병을 씻고 치명상까지 아물게 한다고 전해진다.', en: 'A white marble spring under the towering Bulwark. Its water is said to wash out poison and sickness and to close mortal wounds.' },
  // Sejiri
  'benthidrix': { ko: '세지리의 얼음 아래 있다는 전설의 수중 신전. 실제로 있는지는 아무도 모른다.', en: 'A legendary sunken temple said to lie under the ice of Sejiri. Nobody knows that it exists.' },
  // Akoum
  'spikefields': { ko: '뜨거운 볕 아래 무지갯빛으로 반짝이는 결정 들판. 가장 작은 조각도 날이 서 있고, 지옥견 무리가 돌아다닌다.', en: 'Crystal fields that shimmer under the hot sun. The smallest shard is edged, and packs of hellhounds roam.' },
  'goma-fada': { ko: "수레 수백 대로 이루어진 거대한 대상단, '걷는 도시'. 한곳에 오래 머물면 죽는 아쿰에서 멈추지 않고 떠돈다.", en: "A huge caravan of hundreds of wagons, 'the City that Walks'. In Akoum, where staying put kills, it never stops." },
  'ora-ondar': { ko: "아쿰의 거친 땅에 우거진 숲, '불가능한 정원'. 엘프 '양육자'들이 돌보며, 위험한 생물도 산다.", en: "A lush forest in harsh Akoum, the 'Impossible Garden'. Elf 'nourishers' tend it, and dangerous things live there too." },
  'glasspool': { ko: '지름 2마일이 넘는 육각형 호수. 땅이 흔들려도 수면은 고요하고, 바닥에는 코르의 성지 Ior Ruin 이 잠겨 있다.', en: 'A hexagonal lake more than two miles across. Its surface stays still when the ground shakes, and Ior Ruin, a kor holy site, lies on its floor.' },
  // Guul Draz
  'lulea': { ko: 'Lake Jeft 호숫가의 인어 정착지. 물 위와 물속으로 지나는 모든 이에게 통행료를 걷는다.', en: 'A merfolk settlement on the shore of Lake Jeft. It takes a toll from all who pass, over the water or under it.' },
  'hagra-cistern': { ko: '진흙과 물속으로 가라앉고 있는 거대한 고대 유적. 입구는 아찔하게 깊은 수직갱이고, 오우거 부족들이 산다.', en: 'A vast ancient ruin sinking into mud and water. Its entrance is a dizzying shaft, and ogre tribes live in it.' },
  'pelakka-karst': { ko: '석회암 협곡과 싱크홀, 탁한 운하로 이루어진 악지. 갑자기 생기는 소용돌이 때문에 인어들도 먼 길을 돌아간다.', en: 'Badlands of limestone gorges, sinkholes and murky canals. Sudden whirlpools make even merfolk go the long way round.' },
  'helix-of-zof': { ko: '조프 늪 한가운데, 맹그로브 뿌리 위에 뜬 덩굴 덮인 나선형 고대 유적.', en: 'A vine-covered ancient spiral, afloat over mangrove roots in the middle of Zof Marsh.' },
  'malakir': { ko: '하그라 늪 한가운데 낮은 언덕 위에 선 흡혈귀의 도시. 들어가기는 어렵지 않지만 나오기가 어렵다.', en: 'The city of the vampires, on a low hill in the middle of Hagra. It is not hard to enter; it is hard to leave.' },
  // Bala Ged
  'bojuka-bay': { ko: '수천 그루의 나무가 파도를 막아 주는 늪 같은 후미. 늪 트롤이 살고, 그로타그 고블린이 뇌물을 받으면 뱃길을 터 준다.', en: 'A swampy inlet sheltered from the waves by thousands of trees. Swamp trolls live here, and Grotag goblins see a ship through for a bribe.' },
  'guum-wilds': { ko: '발라 게드 대부분을 덮은 정글. 숲 밑으로 동굴과 터널이 얽혀 있다.', en: 'The jungle that covers most of Bala Ged. Caves and tunnels tangle under it.' },
  'surrakar-caves': { ko: '동굴 입구가 숭숭 뚫린 미끄러운 석회암 언덕. surrakar 가 둥지를 틀어, 노련한 탐험대도 피해 간다.', en: 'Slick limestone hills riddled with cave mouths. Surrakar nest here, and seasoned expeditions keep away.' },
  // Murasa
  'cliffs-of-kazuul': { ko: "Murasa's Wall 을 오르는 단 하나의 정비된 길. 오우거 노예주 카줄이 통행세를 걷는다.", en: "The one kept road up Murasa's Wall. The ogre slaver Kazuul takes a toll on it." },
  'skyfang-mountains': { ko: "무라사 서쪽을 가르는 가파른 산맥. 해가 가리면 떠 있던 바위 'fangs' 가 산비탈에 내리꽂힌다.", en: "Steep ranges that split western Murasa. When the sun is hidden, the floating rock 'fangs' drop onto the slopes." },
  'shatterskull-pass': { ko: '하늘이빨을 걸어서 넘는 가장 나은 길. 해골분쇄 거인 부족이 지나는 이에게 통행세를 뜯는다.', en: 'The best way over the Skyfangs on foot. The Shatterskull giants squeeze a toll from all who pass.' },
  'na-plateau': { ko: '무라사 한가운데 동쪽에 솟은 고원. 꼭대기 숲 어딘가에 노래하는 도시의 폐허가 숨어 있고, 고블린 부족들이 다툰다.', en: "A plateau rising east of Murasa's heart. Somewhere in the forest on top hide the ruins of the Singing City, and goblin tribes squabble." },
  'tumbled-palace': { ko: '산산조각난 만의 절벽 위, 거대한 가시나무에 휘감긴 무너져 가는 궁전. 타주루 엘프의 대변인이 이곳에서 다스린다.', en: 'A crumbling palace on the cliffs of Sunder Bay, in the grip of a huge thorned tree. The speaker of the Tajuru elves rules from it.' },
  // Ondu
  'jwar-isle': { ko: "바다뱀과 소용돌이 해류가 에워싼 '비밀의 섬'. 거대한 화강암 두상이 반쯤 묻혀 있고, 스핑크스가 산다.", en: "The 'Isle of Secrets', ringed by sea serpents and whirling currents. Huge granite heads lie half buried, and a sphinx lives here." },
  'valakut': { ko: "화산 고리에서 가장 크고 활발한 화산, '녹아내린 봉우리'. 그 아래 굴에는 고블린 왕조의 벽화가 수 마일 이어진다.", en: "The largest, most active volcano of its ring, 'the Molten Pinnacle'. In the tunnels beneath, the murals of a goblin dynasty run for miles." },
  'graypelt': { ko: '변화림 가장자리의 드루이드·사냥꾼·개척자들의 작은 정착지. 혹멧돼지의 회색 털가죽 천막에서 이름이 왔다.', en: "A small settlement of druids, hunters and pioneers at Turntimber's edge, named for its tents of gray warthog hide." },
  'prison-of-omnath': { ko: 'Omnath 를 가둔 구덩이. 순례자들이 한 해에 두 번 일흔일곱 개의 촛불로 둘레를 감싸 감옥을 지킨다고 믿는다.', en: 'The pit where Omnath is bound. Twice a year pilgrims ring it with seventy-seven candles, and believe that keeps the prison shut.' },
};
// This game's own Korean names for places the map project has no official Korean name for.
const STOP_KO: Record<string, string> = {
  'ikiral': '이키랄', 'midnight-pass': '한밤 해협', 'the-sunspring': '태양샘', 'calcite-flats': '방해석 평원', 'lulea': '룰레아', 'helix-of-zof': '조프의 나선',
  'bojuka-bay': '보주카 만', 'guum-wilds': '굼 야생지', 'surrakar-caves': '수라카 동굴', 'na-plateau': '나 고원', 'tumbled-palace': '무너진 궁전', 'prison-of-omnath': '옴나스의 감옥',
};

// A stop's or a continent's name in this language: {text, star} (star: an unofficial Korean name).
export function stopName(s: Stop) {
  if (LANG === 'ko') {
    if (s.ko) return { text: s.ko, star: false };
    if (STOP_KO[s.id]) return { text: STOP_KO[s.id], star: true };
  }
  return { text: s.en, star: false };
}
export function contName(id: string) { const c = WORLD.continents[id]; return c ? LX(c) : id; }
