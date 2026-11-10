import type { Loose, Words } from './game/types';
// What may happen on the way: a short scene from the place's own lore (the zendikar-map
// project's descriptions), and two ways through it. A happening is met on a walk between two
// places of a continent (road), on a crossing between continents (sea), or it is what a site
// holds (site: a ruin or a landmark that is a stop of its own). Each way costs and gives in
// plain sight: hp, gold, a card, a land, a day. The numbers are data/config.json values.
//
// A way's effects, in order: ['heal', n] ['hurt', n] (hp; a happening never kills) · ['gain', n]
// ['pay', n] ['lose', n] (gold; a way that pays is closed without the gold, one that loses takes
// what there is) · ['delay', n] ['haste', n] (days lost, days won back) · ['vigor', n] (max hp) ·
// ['card', 'pool' | id] (a card of this continent, or the one named) · ['land', 'basic' | id] ·
// ['chance', p, [...], [...]] (with odds p the first effects, otherwise the second). A way, or a
// side of a chance, with no effects is the way on which nothing happens.

/** One way through a happening: what the button says, what it costs and gives, and the line shown after. */
export interface Way {
  label: Words;
  fx: Loose[];
  after: Words;
}
/** A happening: where it is met, its words and its two ways. */
export interface Happening {
  id: string;
  /** On a walk, on a crossing, or at the site that is its stop. */
  at: 'road' | 'sea' | 'site';
  /** A site's stop. */
  stop?: string;
  /** For the road and the sea: only on the way to a place of this continent; anywhere when unset. */
  cont?: string;
  title: Words;
  text: Words;
  ways: [Way, Way];
}

export const HAPPENINGS: Happening[] = [
  // ---- sites: a ruin or a landmark that is a stop; what happens there is the place's own story ----
  {
    id: 'halimar-deep', at: 'site', stop: 'halimar',
    title: { ko: '할리마르의 깊은 물', en: 'The deep water of Halimar' },
    text: { ko: '댐 위에서 내려다본 내해는 깊고 잔잔하다. 맞은편 우마라 협곡 어귀로 가는 나룻배가 뜨고, 인어 뱃사공은 해신 울라가 저 바닥을 헤엄친다고 말한다. 물 아래에서 무언가 반짝인다.', en: 'From the dam the inland sea lies deep and still. A ferry leaves for the mouth of the Umara gorge, and its merfolk pilot says the sea god Ula swims the floor below. Something glints under the water.' },
    ways: [
      { label: { ko: '울라에게 금화를 바치고 조용히 건넌다', en: 'Give coins to Ula and cross in peace' }, fx: [['pay', 'ev_toll'], ['heal', 'ev_heal_big']], after: { ko: '금화가 가라앉는 동안 배는 흔들리지 않았다. 오랜만에 깊이 잤다.', en: 'The boat did not rock while the coins sank. You slept deeply for once.' } },
      { label: { ko: '반짝이는 것을 건지러 잠수한다', en: 'Dive for what glints' }, fx: [['chance', 'ev_odds', [['gain', 'ev_gold_big']], [['hurt', 'ev_hurt_big']]]], after: { ko: '물은 생각보다 훨씬 깊었고, 그 아래 무언가 컸다.', en: 'The water was far deeper than it looked, and something large was in it.' } },
    ],
  },
  {
    id: 'benthidrix-ice', at: 'site', stop: 'benthidrix',
    title: { ko: '얼음 아래의 벤티드릭스', en: 'Benthidrix under the ice' },
    text: { ko: '얼어붙은 강 위에 섰다. 이 아래 어딘가에 전설의 수중 신전 벤티드릭스가 있다고들 하지만, 정말 있는지는 아무도 모른다. 얼음 밑으로 푸른 빛이 어른거린다. 그렇게 보일 뿐일지도 모른다.', en: 'You stand on a frozen river. Somewhere beneath it, they say, lies the legendary sunken temple Benthidrix, though nobody knows that it exists. A blue light wavers under the ice. Or seems to.' },
    ways: [
      { label: { ko: '얼음을 깨고 내려가 본다', en: 'Break the ice and go down' }, fx: [['chance', 'ev_odds', [['card', 'pool']], [['hurt', 'ev_hurt_big']]]], after: { ko: '숨이 닿는 데까지 내려갔다 올라왔다.', en: 'You went down as far as a breath would take you, and came up.' } },
      { label: { ko: '전설은 전설로 두고 얼음 위에서 쉰다', en: 'Leave the legend be, and rest on the ice' }, fx: [['heal', 'ev_heal_small']], after: { ko: '바람막이를 세우고 불을 피웠다. 빛은 밤새 어른거렸다.', en: 'You raised a windbreak and lit a fire. The light wavered all night.' } },
    ],
  },
  {
    id: 'glasspool-still', at: 'site', stop: 'glasspool',
    title: { ko: '거울연못의 고요', en: 'The stillness of Glasspool' },
    text: { ko: '육각형 호수는 발밑의 땅이 흔들려도 물결 하나 일지 않는다. 호숫가의 코르 순례자들은 바닥에 잠긴 Ior Ruin 을 향해 절하고, 이 고요함이 수상하니 물을 긷지 말라고 일러 준다. 그래도 이 산지에서 푸른 마나가 솟는 곳은 여기뿐이다.', en: 'The hexagonal lake does not ripple even when the ground under you shakes. Kor pilgrims on the shore bow toward Ior Ruin on its floor, and warn you that such stillness is suspect: take no water. Yet nowhere else in these mountains does blue mana well up.' },
    ways: [
      { label: { ko: '순례자들 곁에서 하루를 묵는다', en: 'Stay a day beside the pilgrims' }, fx: [['delay', 'ev_days'], ['heal', 'ev_heal_big']], after: { ko: '코르는 말이 적었지만 불과 음식을 나눠 주었다.', en: 'The kor said little, but shared their fire and food.' } },
      { label: { ko: '경고를 흘려듣고 호수의 마나를 받아 간다', en: "Ignore the warning and take the lake's mana" }, fx: [['land', 'island'], ['hurt', 'ev_hurt_small']], after: { ko: '손을 담그자 차가움이 팔을 타고 올라왔다. 푸른 마나는 분명히 따라왔다.', en: 'The cold climbed your arm when you put a hand in. The blue mana came with you all the same.' } },
    ],
  },
  {
    id: 'lulea-toll', at: 'site', stop: 'lulea',
    title: { ko: 'Lulea 의 통행료', en: 'The toll of Lulea' },
    text: { ko: 'Lake Jeft 의 어두운 호숫가, 인어들이 물길을 막아섰다. 물 위로 가든 물속으로 가든 지나려면 통행료를 내야 한다. 부두에는 인가받은 사략단이 빼앗아 온 물건이 쌓여 있다.', en: 'On the dark shore of Lake Jeft, merfolk bar the waterway. Over the water or under it, all who pass pay the toll. On the quay lies what the licensed privateers have brought in.' },
    ways: [
      { label: { ko: '통행료를 내고 사략단의 물건을 살펴본다', en: "Pay the toll and look over the privateers' haul" }, fx: [['pay', 'ev_toll'], ['card', 'pool']], after: { ko: '통행료를 낸 이에게는 물건 하나를 골라 가게 해 주었다.', en: 'Those who pay the toll may pick one thing from the haul.' } },
      { label: { ko: '밤을 틈타 물길을 몰래 지난다', en: 'Slip through the waterway by night' }, fx: [['chance', 'ev_odds', [['gain', 'ev_gold_small']], [['lose', 'ev_gold_big']]]], after: { ko: '물속에는 생각보다 눈이 많았다.', en: 'There were more eyes under the water than you had thought.' } },
    ],
  },
  {
    id: 'hagra-cistern-shaft', at: 'site', stop: 'hagra-cistern',
    title: { ko: '하그라 수조의 수직갱', en: 'The shaft of the Hagra Cistern' },
    text: { ko: '늪 한가운데 아찔하게 깊은 구멍이 입을 벌리고 있다. 돌 유적은 진흙과 물속으로 서서히 가라앉는 중이고, 아래 어딘가에서 오우거 부족의 북소리가 올라온다.', en: 'A dizzying hole gapes in the middle of the swamp. The stone ruin is sinking slowly into mud and water, and from somewhere below comes the drumming of an ogre tribe.' },
    ways: [
      { label: { ko: '밧줄을 타고 끝까지 내려간다', en: 'Go down the rope to the bottom' }, fx: [['chance', 'ev_odds', [['gain', 'ev_gold_big'], ['card', 'pool']], [['hurt', 'ev_hurt_big']]]], after: { ko: '북소리가 멎었을 때는 이미 깊이 내려와 있었다.', en: 'By the time the drums stopped you were already far down.' } },
      { label: { ko: '입구 언저리만 뒤지고 물러난다', en: 'Search only the rim, and leave' }, fx: [['gain', 'ev_gold_small']], after: { ko: '가라앉다 만 돌 틈에서 옛 동전 몇 닢을 건졌다.', en: 'You picked a few old coins out of the half-sunk stones.' } },
    ],
  },
  {
    id: 'kazuul-road', at: 'site', stop: 'cliffs-of-kazuul',
    title: { ko: '카줄의 길', en: 'Kazuul Road' },
    text: { ko: "Murasa's Wall 을 오르는 단 하나의 정비된 길. 지그재그로 깎은 길과 통나무 승강기 앞에 오우거 노예주 카줄의 부하들이 서 있다. 통행세를 내지 않은 자는 내쫓기고, 때로는 바다로 던져진다.", en: "The one kept road up Murasa's Wall. Before the switchbacks and the log lifts stand the men of the ogre slaver Kazuul. Those who do not pay the toll are thrown out, and sometimes into the sea." },
    ways: [
      { label: { ko: '통행세를 내고 승강기를 탄다', en: 'Pay the toll and ride the lift' }, fx: [['pay', 'ev_toll']], after: { ko: '통나무 승강기가 삐걱거리며 절벽 위로 올라갔다.', en: 'The log lift creaked its way up the cliff.' } },
      { label: { ko: '길을 벗어나 맨 절벽을 오른다', en: 'Leave the road and climb the bare cliff' }, fx: [['hurt', 'ev_hurt_big']], after: { ko: '손바닥이 다 벗겨졌지만, 금화는 그대로다.', en: 'Your palms are raw, but your gold is all there.' } },
    ],
  },
  {
    id: 'ritual-of-lights', at: 'site', stop: 'prison-of-omnath',
    title: { ko: '촛불의 의식', en: 'The Ritual of Lights' },
    text: { ko: '메사 꼭대기의 어두운 늪, 깊은 구덩이 둘레에 순례자들이 모여 있다. 한 해에 두 번, 일흔일곱 개의 촛불로 구덩이를 둘러 Omnath 의 감옥을 지킨다는 의식이다. 결속의 원을 이룬 헤드론 조각들이 발치에서 낮게 운다.', en: 'In the dark swamp atop the mesa, pilgrims have gathered round a deep pit. Twice a year they ring it with seventy-seven candles, the rite they believe keeps the prison of Omnath shut. The hedron shards of the binding circle hum low at your feet.' },
    ways: [
      { label: { ko: '순례자들과 함께 촛불을 밝힌다', en: 'Light the candles with the pilgrims' }, fx: [['delay', 'ev_days'], ['vigor', 'ev_vigor']], after: { ko: '일흔일곱 번째 촛불이 켜지자 늪의 공기가 가벼워졌다.', en: 'When the seventy-seventh candle was lit, the air of the swamp grew lighter.' } },
      { label: { ko: '원에서 헤드론 조각 하나를 빼 간다', en: 'Take a hedron shard from the circle' }, fx: [['gain', 'ev_gold_big'], ['hurt', 'ev_hurt_small']], after: { ko: '조각을 뽑자 코피가 흘렀다. 순례자들은 아무 말도 하지 않았다.', en: 'Your nose bled as you pulled the shard free. The pilgrims said nothing.' } },
    ],
  },

  // ---- on a walk: anywhere ----
  {
    id: 'roil-on-the-road', at: 'road',
    title: { ko: '길 위의 탁류', en: 'The Roil on the road' },
    text: { ko: '앞쪽 땅이 물결처럼 일어선다. 바위가 떠오르고 길이 뒤집힌다. 탁류가 지나가는 중이다.', en: 'The ground ahead rises like a wave. Rocks lift into the air and the road turns over. The Roil is passing.' },
    ways: [
      { label: { ko: '지나갈 때까지 기다린다', en: 'Wait until it has passed' }, fx: [['delay', 'ev_days']], after: { ko: '탁류가 잦아들자 길은 다른 모양이 되어 있었다.', en: 'When the Roil settled, the road had a different shape.' } },
      { label: { ko: '뚫고 지나간다', en: 'Push through it' }, fx: [['hurt', 'ev_hurt_big']], after: { ko: '구르는 바위 사이를 달려 빠져나왔다.', en: 'You ran between the rolling stones and came out the far side.' } },
    ],
  },
  {
    id: 'brittle-map', at: 'road',
    title: { ko: '부서지기 쉬운 기록', en: 'A brittle record' },
    text: { ko: '지도에는 여기 길이 있다. 눈앞에는 없다. 젠디카르에서 정확한 지도를 믿는 이는 이제 드물다. 근처에서 덫을 놓던 이가, 품삯을 주면 오늘의 길을 일러 주겠다고 한다.', en: 'The map shows a road here. There is none. Few on Zendikar still believe in an accurate map. A trapper working nearby offers, for a wage, to show you the road as it is today.' },
    ways: [
      { label: { ko: '품삯을 주고 길을 묻는다', en: 'Pay the wage and ask the way' }, fx: [['pay', 'ev_toll']], after: { ko: '덫사냥꾼은 어느 지도에도 없는 길로 앞장섰다.', en: 'The trapper led off by a way that is on no map.' } },
      { label: { ko: '지도를 믿고 그대로 간다', en: 'Trust the map and go on' }, fx: [['chance', 'ev_odds', [], [['delay', 'ev_days']]]], after: { ko: '지도는 지나간 날의 그림일 뿐이라고, 타주루의 대변인 Sutina 는 말했다.', en: 'A map is only a picture of days gone, the Tajuru Speaker Sutina has said.' } },
    ],
  },
  // ---- on a walk: Tazeem ----
  {
    id: 'pathway-stones', at: 'road', cont: 'tazeem',
    title: { ko: 'Dojir 유목민의 통로 보석', en: 'The pathway stones of the Dojir' },
    text: { ko: '방해석 모래 위로 Dojir 유목민 한 무리가 지나간다. 떨어진 다면체를 쪼개 만든 통로 보석을 판다고 한다. 어디서든 다면체 지대의 한가운데를 가리켜서 길잡이로 쓴다고.', en: 'A band of Dojir nomads crosses the calcite sand. They sell pathway stones, split from fallen hedrons: a stone points always to the heart of the hedron field, they say, and so shows the way.' },
    ways: [
      { label: { ko: '통로 보석을 하나 산다', en: 'Buy a pathway stone' }, fx: [['pay', 'ev_toll'], ['haste', 'ev_days']], after: { ko: '보석이 가리키는 쪽을 기준 삼아 걸었더니 길이 하루나 줄었다.', en: 'Steering by where the stone pointed took a day off the road.' } },
      { label: { ko: '물과 소식만 나누고 헤어진다', en: 'Share water and news, and part' }, fx: [['heal', 'ev_heal_small']], after: { ko: '유목민들은 빠지기 쉬운 곳 몇 군데를 모래에 그려 주었다.', en: 'The nomads drew in the sand a few places where one sinks.' } },
    ],
  },
  {
    id: 'magosi-portage', at: 'road', cont: 'tazeem',
    title: { ko: 'Magosi Portage 의 밤', en: 'A night at Magosi Portage' },
    text: { ko: '마고시 폭포 꼭대기의 육로 운반 거점. 긴 홀 하나와 부속 건물 몇 채뿐이지만, 내륙에서 통로 보석과 물자와 인어 주문 두루마리를 구하기에는 여기가 제일이다. 다만 밤사이 사람이 사라지곤 하는 야영지라고들 한다.', en: 'The portage at the top of Magosi Falls: one long hall and a few outbuildings, yet the best market inland for pathway stones, supplies and merfolk spell scrolls. But it is a camp, they say, where people vanish in the night.' },
    ways: [
      { label: { ko: '장을 보고, 밤에는 번갈아 불침번을 선다', en: 'Trade, and keep watch by turns all night' }, fx: [['pay', 'ev_toll'], ['card', 'pool']], after: { ko: '밤새 아무도 사라지지 않았다. 적어도 우리 중에서는.', en: 'Nobody vanished in the night. None of yours, at least.' } },
      { label: { ko: '홀에 자리를 얻어 깊이 잔다', en: 'Take a place in the hall and sleep deep' }, fx: [['heal', 'ev_heal_big'], ['chance', 'ev_odds', [], [['lose', 'ev_gold_small']]]], after: { ko: '아침에 세어 보니 사람은 그대로였다.', en: 'In the morning the head count was right.' } },
    ],
  },
  // ---- on a walk: Akoum ----
  {
    id: 'spikes-overhead', at: 'road', cont: 'akoum',
    title: { ko: '머리 위의 가시', en: 'The spikes overhead' },
    text: { ko: '결정 들판을 지나는 길은 하나뿐이다. 머리 위로 결정 가시가 빽빽하게 매달려 있고, 비명은커녕 속삭임의 메아리만으로도 쏟아져 내린다고 한다.', en: 'There is one way through the crystal field. Crystal spikes hang thick overhead, and the echo of a whisper, let alone a scream, is said to bring them down.' },
    ways: [
      { label: { ko: '숨죽이고 한 걸음씩 지난다', en: 'Go a step at a time, not breathing' }, fx: [['delay', 'ev_days']], after: { ko: '해가 지고 다시 뜰 때까지 걸렸다. 가시는 하나도 떨어지지 않았다.', en: 'It took until the sun had set and risen. Not one spike fell.' } },
      { label: { ko: '단숨에 달려 지난다', en: 'Run for it' }, fx: [['chance', 'ev_odds', [], [['hurt', 'ev_hurt_big']]]], after: { ko: '발소리가 메아리쳤다.', en: 'Your footsteps echoed.' } },
    ],
  },
  {
    id: 'shard-rain', at: 'road', cont: 'akoum',
    title: { ko: '결정 파편 비', en: 'A rain of crystal shards' },
    text: { ko: '아쿰의 탁류는 땅 아래에서 온다. 발밑이 울리더니 능선 너머에서 가스가 터지고, 화살보다 치명적이라는 결정 파편이 비처럼 쏟아지기 시작한다.', en: 'On Akoum the Roil works from below. The ground drums underfoot, gas bursts beyond the ridge, and crystal shards begin to fall like rain: deadlier than arrows, they say.' },
    ways: [
      { label: { ko: '바위턱 아래에서 그치기를 기다린다', en: 'Wait it out under a ledge' }, fx: [['delay', 'ev_days']], after: { ko: '파편은 해 질 녘까지 내렸다.', en: 'The shards fell until dusk.' } },
      { label: { ko: '방패를 머리에 이고 달린다', en: 'Run with shields overhead' }, fx: [['hurt', 'ev_hurt_small']], after: { ko: '방패에 결정이 고슴도치처럼 박혔다.', en: 'The shields came out of it bristling with crystal.' } },
    ],
  },
  // ---- on a walk: Murasa ----
  {
    id: 'singing-city', at: 'road', cont: 'murasa',
    title: { ko: '노래하는 도시의 소리', en: 'The sound of the Singing City' },
    text: { ko: '숲 어딘가에서 음악 같은 소리가 들려온다. 거석 폐허의 지하 방들에서 난다는 그 소리다. 저 소리에 미쳐 동료를 공격하거나 높은 데서 몸을 던진 탐험가가 있다고 들었다.', en: 'From somewhere in the forest comes a sound like music: the sound said to rise from the vaults under the megalithic ruin. You have heard of explorers it drove to attack their companions, or to leap from high places.' },
    ways: [
      { label: { ko: '소리를 따라 폐허로 들어간다', en: 'Follow the sound into the ruin' }, fx: [['chance', 'ev_odds', [['card', 'pool']], [['hurt', 'ev_hurt_big']]]], after: { ko: '돌아 나왔을 때 손에는 무언가 들려 있었다. 어떻게 나왔는지는 기억나지 않는다.', en: 'You came out with something in your hand. You do not remember how you came out.' } },
      { label: { ko: '귀를 막고 멀리 돌아간다', en: 'Stop your ears and go the long way round' }, fx: [['delay', 'ev_days']], after: { ko: '소리는 한참 뒤에야 멎었다.', en: 'The sound was a long time fading.' } },
    ],
  },
  {
    id: 'falling-fangs', at: 'road', cont: 'murasa',
    title: { ko: '떨어지는 바위 이빨', en: 'The falling fangs' },
    text: { ko: "머리 위에 종유석 모양의 거대한 바위 'fangs' 가 떠 있다. 햇빛을 받는 동안은 떠 있지만, 구름이 해를 가리면 산비탈에 내리꽂힌다. 서쪽에서 구름이 몰려온다.", en: "Huge stalactite rocks, the 'fangs', float overhead. They float while the sun is on them; when cloud hides the sun they drop onto the slopes. Cloud is coming in from the west." },
    ways: [
      { label: { ko: '해가 다시 날 때까지 바위 밑에 숨는다', en: 'Shelter under a ledge until the sun is back' }, fx: [['delay', 'ev_days']], after: { ko: '밤새 망치가 모루를 내리치는 것 같은 소리가 났다.', en: 'All night it sounded like hammers on anvils.' } },
      { label: { ko: '구름보다 먼저 건넌다', en: 'Cross before the cloud does' }, fx: [['chance', 'ev_odds', [['haste', 'ev_days']], [['hurt', 'ev_hurt_big']]]], after: { ko: '그림자가 발뒤꿈치를 쫓아왔다.', en: 'The shadow came on at your heels.' } },
    ],
  },
  // ---- on a walk: Sejiri ----
  {
    id: 'ice-bridge', at: 'road', cont: 'sejiri',
    title: { ko: '얼음다리', en: 'The ice bridge' },
    text: { ko: '빠르게 흐르는 강 위에 얼음다리 하나가 걸려 있다. 부서지기 쉬워 보인다. 바람과 얼음폭풍이 몇 주면 지형지물을 지워 버리는 고원이라, 다른 다리가 어디 있는지는 아무도 모른다.', en: 'A single bridge of ice spans a fast river. It looks brittle. On this plateau wind and ice storms wipe out landmarks within weeks, and nobody knows where another bridge may be.' },
    ways: [
      { label: { ko: '한 사람씩 얼음다리를 건넌다', en: 'Cross the bridge one at a time' }, fx: [['chance', 'ev_odds', [], [['hurt', 'ev_hurt_big']]]], after: { ko: '다리는 마지막 사람의 발밑에서 소리를 냈다.', en: 'The bridge spoke under the last one across.' } },
      { label: { ko: '상류로 올라가 얕은 여울을 찾는다', en: 'Go upstream and look for a ford' }, fx: [['delay', 'ev_days']], after: { ko: '여울을 찾는 데 하루가 갔다.', en: 'Finding a ford cost a day.' } },
    ],
  },
  // ---- on a walk: Guul Draz ----
  {
    id: 'hanging-swamp', at: 'road', cont: 'guul-draz',
    title: { ko: 'Hanging Swamp', en: 'The Hanging Swamp' },
    text: { ko: '지름이 20마일쯤 되는 싱크홀 위에, 갈대로 이어진 물방울 덩어리들이 반짝이는 호를 그리며 떠 있다. 가로지르면 길이 훨씬 짧다. 다만 탁류 탓에 늪 전체가 쉬지 않고 움직여서, 들어온 길로는 되돌아 나갈 수 없다.', en: 'Over a sinkhole some twenty miles across hang globes of water strung on reeds, in a glittering arc. Straight across is far the shorter way. But the Roil keeps the whole swamp moving, and nobody goes out by the way they came in.' },
    ways: [
      { label: { ko: '매달린 늪을 가로지른다', en: 'Go straight across the hanging swamp' }, fx: [['chance', 'ev_odds', [['haste', 'ev_days']], [['hurt', 'ev_hurt_big']]]], after: { ko: '뒤를 돌아보니 지나온 길은 벌써 없었다.', en: 'When you looked back, the way you had come was already gone.' } },
      { label: { ko: '싱크홀 가장자리를 따라 돌아간다', en: 'Go round by the rim of the sinkhole' }, fx: [['delay', 'ev_days']], after: { ko: '물방울들이 그리는 호는 밤에도 반짝였다.', en: 'The arc of water went on glittering through the night.' } },
    ],
  },
  // ---- on a walk: Bala Ged ----
  {
    id: 'bloodbriar-walls', at: 'road', cont: 'bala-ged',
    title: { ko: 'bloodbriar 방벽', en: 'The bloodbriar walls' },
    text: { ko: '조라가 엘프는 bloodbriar 같은 적대적인 식물을 길러 길과 마을 둘레에 방벽을 두른다. 방벽 안쪽 길은 비교적 안전하지만 굽이굽이 멀다. 버섯이 뒤덮은 언덕 꼭대기를 넘으면 곧장인데, 변덕스러운 바람과 gomazoa 때문에 엘프들도 피하는 곳이다.', en: 'The Joraga elves grow hostile plants such as bloodbriar into walls round their trails and villages. The walled trail is fairly safe, and winds a long way. Over the fungus-covered hilltop is the straight way: a place even the elves shun, for its fickle winds and its gomazoa.' },
    ways: [
      { label: { ko: '방벽을 따라 돌아간다', en: 'Follow the walled trail' }, fx: [['delay', 'ev_days'], ['heal', 'ev_heal_small']], after: { ko: '가시 너머에서 무언가 밤새 따라왔지만, 넘어오지는 못했다.', en: 'Something followed all night beyond the thorns, and could not get through.' } },
      { label: { ko: '언덕 꼭대기를 넘는다', en: 'Go over the hilltop' }, fx: [['chance', 'ev_odds', [], [['hurt', 'ev_hurt_big']]]], after: { ko: '바람이 세 번 방향을 바꿨다.', en: 'The wind changed three times.' } },
    ],
  },
  // ---- on a walk: Ondu ----
  {
    id: 'makindi-rapids', at: 'road', cont: 'ondu',
    title: { ko: '마킨디 협곡의 급류', en: 'The rapids of the Makindi Trenches' },
    text: { ko: '수백 피트 높이로 깎아지른 협곡 벽 사이로, 마나가 일으키는 돌풍이 불규칙하게 몰아친다. 여행자는 대개 절벽 가장자리의 마차길을 따른다. 바닥의 급류를 타면 빠르지만 위험하다.', en: 'Between canyon walls hundreds of feet sheer, gusts raised by mana blow at no set time. Travellers mostly keep to the wagon trail along the rim. Riding the rapids on the canyon floor is faster, and dangerous.' },
    ways: [
      { label: { ko: '가장자리의 마차길을 따른다', en: 'Keep to the wagon trail on the rim' }, fx: [], after: { ko: '돌풍이 마차길을 두 번 쓸었지만, 길은 넓었다.', en: 'Twice a gust swept the trail, but the trail was wide.' } },
      { label: { ko: '뗏목을 엮어 급류를 탄다', en: 'Lash a raft and ride the rapids' }, fx: [['chance', 'ev_odds', [['haste', 'ev_days']], [['hurt', 'ev_hurt_big']]]], after: { ko: '급류는 들은 것보다 빨랐다.', en: 'The rapids were faster than you had been told.' } },
    ],
  },

  // ---- on a crossing: anywhere ----
  {
    id: 'roil-tide', at: 'sea',
    title: { ko: '탁류의 물결', en: 'A Roil tide' },
    text: { ko: "망루에서 외침이 터진다. '탁류다! 탁류다! 몸을 묶어!' 수평선이 통째로 솟아오르며 다가온다.", en: "A shout from the lookout: 'Roil tide! Roil tide! Tie yourselves down!' The whole horizon rises and comes on." },
    ways: [
      { label: { ko: '몸을 묶고 그대로 넘는다', en: 'Tie down and ride over it' }, fx: [['hurt', 'ev_hurt_small']], after: { ko: '배는 물마루를 넘었다. 갑판에 남아 있던 것은 대부분 쓸려 갔다.', en: 'The ship went over the crest. Most of what was loose on deck went with the water.' } },
      { label: { ko: '뱃머리를 돌려 물결을 피해 돈다', en: 'Turn and run round it' }, fx: [['delay', 'ev_days']], after: { ko: '멀리 돌아가는 동안 수평선은 한참을 들썩였다.', en: 'The horizon heaved for a long while as you went the long way round.' } },
    ],
  },
  {
    id: 'expedition-ship', at: 'sea',
    title: { ko: '돌아오는 탐험대의 배', en: "A returning expedition's ship" },
    text: { ko: '바다 관문의 탐험 가문 깃발을 단 배가 마주 온다. 우리가 가려는 땅에서 돌아오는 길이라고 한다. 식량이 떨어졌다며, 그 땅에서 얻은 것을 팔겠다고 한다.', en: "A ship under the flag of one of Sea Gate's expedition houses comes the other way: on its way back, they say, from the land you are bound for. Out of food, they offer to sell what they found there." },
    ways: [
      { label: { ko: '값을 치르고 그들이 얻은 것을 산다', en: 'Pay, and buy what they found' }, fx: [['pay', 'ev_toll'], ['card', 'pool']], after: { ko: '그들은 값을 세어 보지도 않고 식량부터 실었다.', en: 'They loaded the food before they counted the price.' } },
      { label: { ko: '소식만 나누고 지나간다', en: 'Trade news, and pass' }, fx: [], after: { ko: '두 배는 깃발을 한 번씩 내렸다 올렸다.', en: 'Each ship dipped its flag once.' } },
    ],
  },
  // ---- on a crossing to Ondu ----
  {
    id: 'silundi-serpents', at: 'sea', cont: 'ondu',
    title: { ko: '실룬디의 바다뱀', en: 'The serpents of the Silundi Sea' },
    text: { ko: '온두는 실룬디의 바다로 뻗어 나와 있다. 해류가 소용돌이치는 바다고, 좌르 섬 둘레에는 제 영역을 지키는 바다뱀이 늘 돈다고 한다. 물 밑으로 긴 그림자가 배와 나란히 미끄러진다.', en: 'Ondu juts into the Silundi Sea. Its currents whirl, and round Jwar Isle, they say, sea serpents keep their waters always. A long shadow slides under the surface, alongside the ship.' },
    ways: [
      { label: { ko: '짐을 던져 주의를 돌린다', en: 'Throw cargo overboard to draw it off' }, fx: [['lose', 'ev_gold_small']], after: { ko: '그림자는 가라앉는 궤짝을 따라 내려갔다.', en: 'The shadow went down after the sinking crates.' } },
      { label: { ko: '노를 더해 그대로 지나간다', en: 'Man the oars and hold the course' }, fx: [['chance', 'ev_odds', [], [['hurt', 'ev_hurt_big']]]], after: { ko: '그림자는 한참을 따라왔다.', en: 'The shadow followed for a long time.' } },
    ],
  },
  // ---- on a crossing to Bala Ged ----
  {
    id: 'bojuka-route', at: 'sea', cont: 'bala-ged',
    title: { ko: 'Bojuka Route', en: 'The Bojuka Route' },
    text: { ko: '바다 관문의 선장 Jin Kalau 가 스무 해의 숙원 끝에 열었다고 선언한 뱃길이다. 수천 그루의 나무 사이로 난 물길은 좁고, 나무 위의 그로타그 고블린들이 내려다본다. 뇌물을 받으면 길을 터 준다고 한다.', en: 'The sea lane that Captain Jin Kalau of Sea Gate declared open after twenty years of trying. The channel between thousands of trees is narrow, and Grotag goblins look down from the branches. For a bribe, they say, they see a ship through.' },
    ways: [
      { label: { ko: '고블린에게 뇌물을 주고 지름길로 든다', en: 'Bribe the goblins and take the short way in' }, fx: [['pay', 'ev_toll'], ['haste', 'ev_days']], after: { ko: '고블린들이 가지를 걷어 올리자 맑고 깊은 물길이 드러났다.', en: 'The goblins hauled the branches up, and a clear, deep channel showed.' } },
      { label: { ko: '뇌물 없이 물길을 더듬어 간다', en: 'Feel your way in without a bribe' }, fx: [['hurt', 'ev_hurt_small']], after: { ko: '배 밑이 뿌리에 두 번 긁혔고, 나무 위에서 무언가 떨어졌다.', en: 'The hull scraped roots twice, and things fell from the trees.' } },
    ],
  },
  // ---- on a crossing to Sejiri ----
  {
    id: 'midnight-surge', at: 'sea', cont: 'sejiri',
    title: { ko: 'Midnight Pass 의 물살', en: 'The surge of Midnight Pass' },
    text: { ko: '절벽 사이의 좁은 해협으로 주변 바다가 거세게 밀려든다. 절벽을 맨손으로 오르지 않는 한 세지리로 들어가는 길은 여기뿐이고, Ula 신앙을 따르는 인어 항해사가 있는 배만 무사히 들어갈 가망이 있다고 한다. 해협 어귀에서 기다리던 인어 하나가 삯을 부른다.', en: 'The sea drives hard into the narrow strait between the cliffs. Short of climbing the cliffs it is the only way into Sejiri, and only a ship with a merfolk navigator of the Ula creed, they say, has a hope of entering safely. One such, waiting at the mouth of the strait, names a price.' },
    ways: [
      { label: { ko: '인어 항해사에게 키를 맡긴다', en: 'Give the helm to the merfolk navigator' }, fx: [['pay', 'ev_toll']], after: { ko: '항해사는 물살이 숨을 고르는 틈을 정확히 짚었다.', en: 'The navigator knew to the moment when the surge drew breath.' } },
      { label: { ko: '우리 손으로 해협에 든다', en: 'Take her in yourselves' }, fx: [['chance', 'ev_odds', [], [['hurt', 'ev_hurt_big']]]], after: { ko: '빛이 거의 들지 않는 해협 안에서 선체가 절벽을 스쳤다.', en: 'Inside the strait, where almost no light falls, the hull brushed the cliff.' } },
    ],
  },
  // ---- on a crossing to Akoum ----
  {
    id: 'akoum-reefs', at: 'sea', cont: 'akoum',
    title: { ko: '항구 없는 해안', en: 'A coast with no harbour' },
    text: { ko: '아쿰의 해안은 화산 유리 첨탑이 선 붉은 절벽이고, 물 밑에는 눈에 보이지 않는 결정 암초가 도사린다. 해마다 모양이 크게 바뀌어 영구 항구가 없다. 지난해 배를 댔다는 자리는 사라지고 없다.', en: "Akoum's coast is red cliff set with spires of volcanic glass, and under the water lie crystal reefs no eye can see. It changes its shape so much each year that there is no lasting harbour. The place where ships lay last year is gone." },
    ways: [
      { label: { ko: '그나마 안전하다는 동쪽 해안으로 돌아간다', en: 'Go round to the east coast, said to be safer' }, fx: [['delay', 'ev_days']], after: { ko: '동쪽 해안에도 암초는 있었지만, 눈에 보였다.', en: 'The east coast had reefs too, but ones you could see.' } },
      { label: { ko: '수심을 재며 그대로 댄다', en: 'Sound the depth and go straight in' }, fx: [['chance', 'ev_odds', [], [['hurt', 'ev_hurt_big']]]], after: { ko: '배 밑에서 유리 긁히는 소리가 났다.', en: 'There was a sound of glass along the keel.' } },
    ],
  },
  // ---- on a crossing to Murasa ----
  {
    id: 'glint-pass', at: 'sea', cont: 'murasa',
    title: { ko: 'Glint Pass 어귀', en: 'The mouth of Glint Pass' },
    text: { ko: "Murasa's Wall 동쪽 아래로 거대한 해식 동굴이 입을 벌리고 있다. 바위 곳곳에 박힌 flame-quartz 결정이 불빛처럼 빛난다. 안쪽 입구는 썰물 때만 열리고, 물이 다시 차기 전에 나와야 한다.", en: "Under the east side of Murasa's Wall a huge sea cave stands open. Flame-quartz crystals set in the rock shine like firelight. The inner mouth opens only at low tide, and one must be out again before the water returns." },
    ways: [
      { label: { ko: '썰물을 기다려 어귀의 결정을 캐 온다', en: 'Wait for low tide and cut crystal at the mouth' }, fx: [['delay', 'ev_days'], ['gain', 'ev_gold_big']], after: { ko: '물이 발목까지 찼을 때 마지막 결정이 빠졌다.', en: 'The last crystal came free with the water at your ankles.' } },
      { label: { ko: '배를 세우지 않고 지나간다', en: 'Sail on by' }, fx: [], after: { ko: '불빛 같은 것이 한동안 고물 쪽에서 반짝였다.', en: 'Something like firelight glittered astern for a while.' } },
    ],
  },
];
