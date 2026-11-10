// Authoring table for the game's ZEN cards: one line a card, numbers written in place.
// tools/gen-content.mjs reads a card's kind (creature, equipment, aura, enchantment, artifact,
// planeswalker, instant, sorcery, land) from its type line in data/lore.json and its colour from
// data/colors.json, turns each number here into a data/config.json value, and writes src/cards2.ts.
// The numbers here are the ones first written; data/config.json holds the values as they are now.
// What a card does is this game's own design, written to fit the card's kind and what it shows.
//
// Every line: (continent, id, the game's own Korean name or null when an
// official one exists, ..., extras, lore in Korean, lore in English)
//   C  a creature: cost, [attack, guard], effects when it comes in. It stays on the field and each
//      turn strikes or guards. extras, as the card prints them: fly (its strikes ignore block and
//      its guard stops fliers), pierce (it cannot be blocked), walk (a landwalker: W U B R G, the
//      land it walks), haste (it may strike the turn it comes), vigil (it guards while it strikes),
//      defender (it never strikes); and twiceIfGear, rally (effects whenever an Ally comes in,
//      itself too), on (hooks), passive, kick
//   G  equipment, or an aura worn by one of yours: cost, { atk, def, pierce, twice, fly, reach,
//      haste }. extras: on (hooks, run for the one who wears it)
//   S  an instant or a sorcery, or an aura cast on an enemy or a land: cost, effects. extras: trap
//      (when it costs 0), kick, recur, req, notBig
//   K  an enchantment, an artifact or a planeswalker, which stays out: cost, effects when played.
//      extras: on (hooks), passive, quest, used (it goes away once its effects are done)
//   L  a land: effects when it comes into play. extras: slow (no mana on the turn it is played)
// kick: { cost, fx }: the card's kicker. Played for that much more mana, these effects happen
// instead of the card's own (a creature's: when it comes in). Gigantiform prints a kicker that
// finds a second copy; in a deck of single cards it has none here.
export const cards = [];
const add = (h, cont, id, ko, o, x, lk, le) => cards.push(Object.assign({ h, cont, id, ko, cost: 0, fx: [], x: x || {}, lore: { ko: lk, en: le } }, o));
const C = (cont, id, ko, cost, stats, fx, x, lk, le) => add('C', cont, id, ko, { cost, atk: stats[0], def: stats[1], fx }, x, lk, le);
const G = (cont, id, ko, cost, gear, x, lk, le) => add('G', cont, id, ko, { cost, gear }, x, lk, le);
const S = (cont, id, ko, cost, fx, x, lk, le) => add('S', cont, id, ko, { cost, fx }, x, lk, le);
const K = (cont, id, ko, cost, fx, x, lk, le) => add('K', cont, id, ko, { cost, fx }, x, lk, le);
const L = (cont, id, ko, fx, x, lk, le) => add('L', cont, id, ko, { fx }, x, lk, le);

// ---- Tazeem (28) ----
C('tazeem', 'grazing-gladehart', '풀 뜯는 숲사슴', 2, [3, 2], [], { on: { land: [['heal', 2]] } }, '숲속 빈터에서 풀을 뜯는 영양.', 'An antelope grazing in a glade.');
C('tazeem', 'oran-rief-survivalist', '오란리프 생존 전문가', 1, [2, 2], [], { rally: [['grow', 1, 1]] }, '생존 전문가이자 숲의 길잡이 Yon Basrel.', 'Yon Basrel, a survival expert and forest guide.');
C('tazeem', 'caller-of-gales', '돌풍을 부르는 자', 1, [2, 2], [], { on: { turn: [['flight']] } }, '돌풍을 불러 생물을 날게 하는 인어 마도사.', 'A merfolk wizard who calls gusts to make creatures fly.');
C('tazeem', 'umara-raptor', '우마라 랩터', 2, [2, 2], [], { fly: 1, rally: [['grow', 1, 1]] }, '원정대의 일원으로 치는 어린 랩터 Sharpwing.', 'Sharpwing, a young raptor counted as an expedition member.');
C('tazeem', 'welkin-tern', null, 1, [3, 2], [], { fly: 1, art: 'tern' }, '하늘에 뜬 헤드론에 둥지를 트는 제비갈매기.', 'A tern that nests on hedrons floating in the sky.');
C('tazeem', 'sea-gate-loremaster', '바다 관문 전승학자', 3, [2, 3], [], { rally: [['draw', 1]] }, '바다 관문 등대에서 배운 인어 현장 학자 Vado Thal.', 'Vado Thal, a merfolk field scholar trained at the Sea Gate lighthouse.');
C('tazeem', 'merfolk-seastalkers', '인어 바다추적자들', 2, [2, 4], [['halve']], { walk: 'U' }, '유망한 원정대를 지키는 정예 인어 정찰병들.', 'Elite merfolk scout-soldiers who guard promising expeditions.');
C('tazeem', 'merfolk-wayfinder', '인어 길잡이', 2, [2, 4], [['extraLand', 1]], { fly: 1 }, '하늘을 나는 인어 정찰병.', 'A flying merfolk scout.');
C('tazeem', 'seascape-aerialist', '바다풍경 곡예비행사', 3, [3, 5], [], { rally: [['flight']] }, '떠 있는 섬들을 탐사한 인어 마도사 Thairin.', 'Thairin, a merfolk wizard who explored the floating islands.');
C('tazeem', 'noble-vestige', '고귀한 잔영', 1, [1, 4], [], { fly: 1 }, '세상에 묶여 남을 지키는, 희망을 잃지 않은 영혼.', 'A hopeful protective spirit bound to the world.');
C('tazeem', 'iona-shield-of-emeria', '에메리아의 방패, 아이오나', 5, [7, 6], [], { fly: 1, passive: { noHex: true } }, '에메리아의 윗층으로 가는 길을 지키는 대천사.', "The archangel who guards the way to Emeria's upper levels.");
C('tazeem', 'emeria-angel', '에메리아 천사', 4, [4, 3], [], { fly: 1, on: { land: [['hitrand', 3]] } }, '후광이 눈을 가린, 에메리아의 이름을 지닌 천사.', "An angel bearing Emeria's name, her halo low over her eyes.");
C('tazeem', 'shepherd-of-the-lost', '길 잃은 자들의 인도자', 4, [5, 4], [], { fly: 1, vigil: 1 }, '야생에서 쓰러진 이들에게 응답하는 천사.', 'An angel who answers those who fall in the wilds.');
G('tazeem', 'explorers-scope', '탐험가의 망원경', 1, { def: 1 }, { on: { strike: [['fetch']] }, art: 'scope' }, '바다 관문에서 렌즈를 간 탐험가의 망원경.', "An explorer's spyglass, its lenses ground in Sea Gate.");
G('tazeem', 'nimbus-wings', '후광구름 날개', 1, { atk: 1, def: 2, fly: 1 }, {}, '하늘을 날게 하는 구름 날개.', 'Wings of cloud that grant flight.');
G('tazeem', 'celestial-mantle', '천상의 망토', 3, { atk: 2, def: 3 }, { on: { strike: [['heal', 3]] } }, '생물을 감싸는 하늘의 갑옷.', 'Heavenly armor wrapped around a creature.');
K('tazeem', 'eternity-vessel', '영원의 그릇', 3, [], { on: { land: [['heal', 3]] } }, '생명을 되돌려 주는 그릇. 치유의 태양샘 곁에 놓여 있다.', 'A life-restoring vessel, set beside the healing Sunspring.');
K('tazeem', 'archmage-ascension', '대마법사의 승천', 2, [], { quest: { on: 'spell', need: 4, then: { on: { turn: [['draw', 1]] } } } }, '인어의 문서고에서 소용돌이치는 룬.', 'Runes swirling in a merfolk archive.');
K('tazeem', 'sunspring-expedition', '태양샘 원정', 1, [], { quest: { on: 'land', need: 3, reward: [['heal', 8]] } }, '전설의 치유 샘 Sunspring 을 찾는 원정대.', 'An expedition seeking the legendary healing Sunspring.');
S('tazeem', 'paralyzing-grasp', null, 2, [['grasp']], { notBig: 1 }, '생물을 꼼짝 못 하게 붙드는 손아귀.', 'A grasp that holds a creature immobile.');
S('tazeem', 'spreading-seas', '번지는 바다', 1, [['seas'], ['draw', 1]], {}, '뭍으로 번져 오는 바다.', 'The sea, spreading onto the land.');
S('tazeem', 'harrow', '갈아엎기', 2, [['fetch'], ['fetch']], { req: 'sacLand' }, '탁류가 지나가며 땅을 다시 빚는다. 헤드론만 그대로 남는다.', 'The Roil passes and reshapes the land. Only the hedrons stay as they were.');
S('tazeem', 'relic-crush', '유물 분쇄', 2, [['unblockall'], ['hitall', 5]], {}, "부서지는 유물과 폐허. '예전엔 훨씬 많았지.'", "Relics and ruins being crushed: 'there used to be many more.'");
S('tazeem', 'vines-of-vastwood', '광활림의 덩굴', 1, [['pump', 2, 2]], { kick: { cost: 1, fx: [['pump', 4, 4]] } }, '생물을 감싸 지키는 광활림의 덩굴.', 'Protective vines of the Vastwood wrapping a creature.');
S('tazeem', 'spell-pierce', null, 1, [['cancel']], { art: 'pierce' }, "타짐의 소강마도사 노얀 다르: '네 계획엔 구멍이 있어.'", "Noyan Dar, Tazeem lullmage: 'There's a hole in your plan.'");
S('tazeem', 'shieldmates-blessing', '방패 동료의 축복', 1, [['block', 5], ['draw', 1]], {}, '피해를 막아 주는 에메리아의 은총.', "A blessing of Emeria's grace that prevents harm.");
S('tazeem', 'rite-of-replication', '복제 의식', 2, [['echo', 1], ['draw', 1]], { kick: { cost: 3, fx: [['echo', 3], ['draw', 1]] } }, '생물을 베끼는 의식 주문.', 'A ritual spell that copies a creature.');
S('tazeem', 'windborne-charge', '바람을 탄 돌격', 2, [['bonus', 2], ['flight']], {}, '동료 둘을 하늘로 띄우는 하늘 여신의 축복.', "The sky goddess's blessing, lifting two allies into flight.");

// ---- Sejiri (5) ----
C('sejiri', 'tempest-owl', '폭풍 올빼미', 1, [1, 3], [], { fly: 1, kick: { cost: 2, fx: [['weakenall', 4]] } }, '얼음 폭풍이 몰아치는 툰드라의 올빼미.', 'An owl of the ice-storm-pelted tundra.');
C('sejiri', 'sphinx-of-lost-truths', '잃어버린 진실의 스핑크스', 4, [4, 5], [['draw', 3], ['discard', 2]], { fly: 1, kick: { cost: 1, fx: [['draw', 3]] } }, '외딴 보금자리에 지식을 쌓아 둔 속 모를 스핑크스.', 'An inscrutable sphinx hoarding knowledge in a remote lair.');
C('sejiri', 'kor-cartographer', '코르 지도 제작자', 3, [3, 2], [['fetch']], { art: 'map' }, '잊힌 고향으로 돌아가며 지도를 그리는 코르 정찰병.', 'A kor scout drawing maps on the way back to forgotten homelands.');
C('sejiri', 'felidar-sovereign', null, 4, [5, 6], [], { vigil: 1, on: { strike: [['heal', 3]] } }, '수정 뿔을 지닌 거대한 흰 고양이 짐승.', 'A huge white cat beast with a crystal horn.');
S('sejiri', 'brave-the-elements', null, 1, [['block', 7], ['cleanse']], { art: 'brave' }, '세지리의 혹한을 무릅쓰는 원정대.', "An expedition braving Sejiri's bitter cold.");

// ---- Akoum (41) ----
C('akoum', 'zendikar-farguide', '젠디카르 먼길잡이', 2, [4, 4], [], { walk: 'G' }, '숲을 걷는 정령. 원정대는 그 발자취를 따라간다.', 'A forest-walking elemental whose trails expeditions follow.');
C('akoum', 'lotus-cobra', null, 2, [3, 2], [], { on: { land: [['mana', 1]] }, art: 'cobra' }, '비늘에 수천 송이 연꽃의 정수가 담겨 있다는 코브라.', 'A cobra whose scales hold the essence of thousands of lotus blooms.');
C('akoum', 'goblin-shortcutter', null, 1, [3, 2], [['unblock']], {}, '지름길을 아는 고블린 정찰병. 값은 싸지만 손버릇이 나쁘다.', 'A goblin scout who knows the shortcuts: cheap, but thieving.');
C('akoum', 'highland-berserker', '고지대 광전사', 2, [4, 2], [], { rally: [['bonus', 1]] }, '싸움을 찾아다니며 도끼를 휘두르는 광전사 Dronn.', 'Dronn, an axe-swinging berserker who goes looking for fights.');
C('akoum', 'torch-slinger', '횃불 투척꾼', 2, [3, 2], [], { kick: { cost: 1, fx: [['hit', 5]] } }, '불붙은 횃불을 던지는 원정대의 고블린 주술사.', 'An expedition goblin shaman who hurls flaming torches.');
C('akoum', 'tuktuk-grunts', '툭툭 졸개들', 3, [4, 3], [], { haste: 1, rally: [['grow', 1, 1]] }, '툭툭 부족의 열성적인 고블린 탐험가 삼남매 Bindi, Paldi, Zurdi.', 'Bindi, Paldi and Zurdi, zealous Tuktuk goblin explorer siblings.');
C('akoum', 'goblin-guide', '고블린 안내인', 1, [4, 2], [], { haste: 1, art: 'goblin' }, "'이 세상 안 가 본 데가 없지. 몇 군데는 기억도 나.'", "'I've been all over this world. I even remember some of those places.'");
C('akoum', 'reckless-scholar', null, 2, [3, 2], [], { on: { turn: [['draw', 1], ['discard', 1]] } }, '남들이 가지 않는 곳에서 지식을 캐는 무모한 학자.', "A reckless scholar sifting knowledge where others won't go.");
C('akoum', 'lullmage-mentor', '소강마도사 스승', 3, [3, 3], [['stun']], {}, '땅과 마법을 잠재우는 소강마도사들을 가르치는 인어 스승.', 'A merfolk teacher of lullmages, who quiet land and magic.');
C('akoum', 'caravan-hurda', '대상단 후르다', 3, [2, 6], [], { on: { turn: [['heal', 1]] } }, '고마 파다 대상단의 수레를 끄는 거대한 짐승.', "A huge beast that hauls the Goma Fada caravan's wagons.");
G('akoum', 'adventuring-gear', '모험 장비', 1, {}, { on: { land: [['pump', 2, 2]] }, art: 'pack' }, '탐험가의 기본 장비 — 배낭, 연장 띠, 물주머니.', "An explorer's basic kit: pack, tool belt, waterskin.");
G('akoum', 'goblin-war-paint', null, 1, { atk: 2, def: 1, haste: 1 }, {}, '감각을 벼리고 두려움을 무디게 하는 kolya 열매 출진 물감.', 'Kolya-fruit war paint that sharpens the senses and dulls fear.');
K('akoum', 'eldrazi-monument', '엘드라지 기념비', 3, [], { passive: { atk: 1, def: 1, fly: true }, on: { turn: [['selfhurt', 2]] } }, '떠 있는 폐허 벌판에 선, 알 수 없는 존재를 새긴 금 간 고대 석상.', 'An ancient cracked statue of an unknown creature in a floating ruin field.');
K('akoum', 'khalni-gem', '칼니 보석', 2, [], { on: { turn: [['mana', 1]] } }, "'오라 온다르의 심장부에서 잃어버린 고대 힘의 조각'이라는 마나 보석.", "A mana gem, 'a fragment of ancient power lost in the heart of Ora Ondar'.");
K('akoum', 'khalni-heart-expedition', '칼니 심장 원정', 2, [], { quest: { on: 'land', need: 3, reward: [['fetch'], ['fetch']] } }, '오라 온다르에 숨은 Khalni Heart 를 찾는 원정대.', 'An expedition seeking the Khalni Heart hidden in Ora Ondar.');
K('akoum', 'quest-for-the-gemblades', '보석칼날 탐색', 1, [], { quest: { on: 'strike', need: 4, reward: [['growAll', 2, 2]] } }, "정체가 밝혀지지 않은 '보석칼날'을 찾는 탐색.", "A quest for the unexplained 'Gemblades'.");
K('akoum', 'electropotence', '전기 잠재력', 2, [], { on: { creature: [['hitrand', 4]] } }, "'생명과 힘이 부딪치는 곳'의 붉은 부여마법.", "A red enchantment 'where life and force collide'.");
K('akoum', 'pyromancer-ascension', '화염술사의 승천', 2, [], { quest: { on: 'spell', need: 3, then: { passive: { spell: 3 } } } }, '같은 주문을 되풀이해 불길을 키우는 화염술사의 의식.', "A pyromancer's ritual: repeat a spell and the fire grows.");
K('akoum', 'ior-ruin-expedition', '이오르 유적 원정', 1, [], { quest: { on: 'land', need: 3, reward: [['draw', 2]] } }, '호수 바닥에 가라앉은 Ior Ruin 을 내려다보는 원정대.', 'An expedition looking down on the sunken Ior Ruin on the lake bed.');
K('akoum', 'sorin-markov', null, 4, [], { on: { turn: [['hitrand', 3], ['heal', 2]] } }, '엘드라지를 가두는 일을 도왔던 흡혈귀 플레인즈워커.', 'The vampire planeswalker who helped imprison the Eldrazi.');
K('akoum', 'chandra-ablaze', '불타오르는 찬드라', 4, [], { on: { turn: [['hitrand', 6]] } }, '두루마리 지도를 따라 Eye of Ugin 을 찾아온 화염술사 플레인즈워커.', 'The pyromancer planeswalker who followed a scroll map to the Eye of Ugin.');
S('akoum', 'disfigure', null, 1, [['hit', 4], ['sap', 2]], {}, '손가락이 긴 흰 손이 얼굴을 할퀴는 약화 주문.', 'A weakening spell: a long-fingered white hand clawing a face.');
S('akoum', 'burst-lightning', '터지는 번개', 1, [['hit', 7]], { kick: { cost: 3, fx: [['hit', 15]] }, art: 'bolt' }, '아쿰의 봉우리에 내리꽂히는 번개.', 'Lightning striking a peak in Akoum.');
S('akoum', 'seismic-shudder', '지진의 떨림', 1, [['hitall', 4]], {}, '땅 위의 모든 것을 흔드는 지진.', 'An earthquake that shakes everything on the ground.');
S('akoum', 'punishing-fire', '응징의 불길', 1, [['hit', 5]], { recur: 1 }, '되풀이해 돌아오는 불의 주문.', 'A fire spell that keeps coming back.');
S('akoum', 'summoners-bane', '소환사의 파멸', 2, [['cancel'], ['hit', 7]], {}, '푸른 환영을 남기는 무효화 주문.', 'A counterspell that leaves a blue illusion behind.');
S('akoum', 'trapmakers-snare', '함정 제작자의 올가미', 1, [['fetchTrap'], ['draw', 1]], {}, "함정 제작자의 올가미, '몸으로 푸는 수수께끼'.", "A trapmaker's snare, 'a corporeal riddle'.");
S('akoum', 'summoning-trap', '소환 함정', 3, [['fetchCreature'], ['fetchCreature'], ['mana', 2]], { trap: 'lowhp' }, '침입자 앞에 수호자를 불러내는 함정.', 'A trap that summons a guardian before the intruder.');
S('akoum', 'lavaball-trap', '용암구 함정', 3, [['hitall', 10]], { trap: 'crowd' }, '땅을 부수고 모든 것을 태우는 용암 함정.', 'A lava trap that wrecks the land and burns every creature.');
S('akoum', 'inferno-trap', '불지옥 함정', 2, [['hit', 11]], { trap: 'hurtLast', art: 'firetrap' }, "'뭐 타는 냄새 안 나?'", "'Do you smell something burning?'");
S('akoum', 'runeflare-trap', '룬섬광 함정', 2, [['hitPerHand', 3]], { trap: 'fullhand' }, '보물을 노리고 헤드론을 쪼던 고블린이 건드린 룬 함정.', 'A rune trap goblins set off when chipping hedrons open for treasure.');
S('akoum', 'lethargy-trap', '무기력 함정', 1, [['sapall', 2]], { trap: 'crowd' }, '기운을 빼앗는 마법 함정. 고블린 Zurdi 는 아무래도 좋아졌다.', 'An energy-sapping magical trap. The goblin Zurdi stopped caring.');
S('akoum', 'whiplash-trap', '채찍 함정', 2, [['strip'], ['hit', 6]], { trap: 'shielded' }, '생물 둘을 주인에게 튕겨 보내는 함정.', 'A trap that flings two creatures back to their owners.');
S('akoum', 'archive-trap', '문서고 함정', 3, [['stun'], ['hit', 8]], { trap: 'quiet' }, '고대 지하 문서고의 천장이 무너지는 함정.', 'A ceiling-collapse trap in an ancient underground archive.');
S('akoum', 'arrow-volley-trap', '화살 세례 함정', 2, [['hit', 9]], { trap: 'attack', art: 'arrows' }, '달갑지 않은 모험가에게 화살을 퍼붓는 함정.', 'A trap that looses arrows on unwelcome adventurers.');
S('akoum', 'magma-rift', '마그마 균열', 1, [['hit', 14]], { req: 'sacLand' }, '땅을 가르는 마그마의 균열.', 'A rift of magma splitting the ground.');
S('akoum', 'spire-barrage', '첨탑 포화', 2, [['hitPerLand', 3]], {}, '쏟아지는 바위와 수정 조각.', 'Falling rocks and crystal shards.');
S('akoum', 'elemental-appeal', '정령의 호소', 3, [['hit', 14]], { kick: { cost: 3, fx: [['hit', 26]] } }, '잠깐 불려 나오는 붉은 정령.', 'A red elemental called up for a moment.');
S('akoum', 'mark-of-mutiny', null, 2, [['mutiny']], { notBig: 1 }, '생물이 분노해 제 주인에게 등을 돌리게 하는 주문.', 'A spell that turns a creature against its master in anger.');
S('akoum', 'day-of-judgment', null, 4, [['hitall', 16]], {}, '모든 것을 쓸어버리는 주문.', 'A spell that sweeps everything away.');
S('akoum', 'landbind-ritual', '대지 결속 의식', 1, [['healPerLand', 2]], {}, '성스러운 흙을 살갗에 문질러 땅과의 유대를 새기는 코르 순례단.', 'Kor pilgrims rubbing sacred soil on their skin to renew their bond with the land.');

// ---- Guul Draz (19) ----
C('guul-draz', 'nimana-sell-sword', '니마나 용병', 2, [4, 2], [], { rally: [['grow', 1, 1]], art: 'sellsword' }, '니마나의 자유도시의 용병 Khalish. 돈을 받는 동안은 충실하다.', 'Khalish, a sell-sword of the Free City of Nimana. Loyal while paid.');
C('guul-draz', 'hagra-diabolist', '하그라 악마술사', 3, [5, 3], [], { rally: [['hitrandPerAlly', 1], ['healPerAlly', 1]] }, '악마의 마법에 손댄 오우거 용병 주술사 Morodrath.', 'Morodrath, an ogre mercenary shaman who dabbles in demonic magic.');
C('guul-draz', 'cosis-trickster', '코시의 책략가', 1, [1, 2], [], { on: { shuffle: [['grow', 1, 1]] } }, '탁류의 혼돈에서 힘을 찾는, 사기꾼 신 Cosi 의 인어 마도사.', "A merfolk mage of the trickster god Cosi, seeking strength in the Roil's chaos.");
G('guul-draz', 'blade-of-the-bloodchief', '혈족장의 칼', 1, { atk: 1 }, { on: { kill: [['grow', 1, 1]] } }, '송곳니처럼 긴 혈족장의 쌍날 칼.', 'The long, fang-like double blade of a bloodchief.');
G('guul-draz', 'blazing-torch', null, 1, { atk: 1 }, { on: { strike: [['burn', 1]] }, art: 'torch' }, '흡혈귀와 좀비를 물리치는 횃불.', 'A torch that wards off vampires and zombies.');
G('guul-draz', 'gigantiform', '거대화 형상', 3, { atk: 4, def: 4, pierce: 1 }, {}, '생물을 거대하게 만드는 마법. 뿔 달린 거대한 딱정벌레를 탄 모습.', 'Magic that makes a creature gigantic, shown as a ridden giant horned beetle.');
K('guul-draz', 'bloodchief-ascension', '혈족장의 승천', 1, [], { quest: { on: 'strike', need: 4, repeat: 1, reward: [['hitrand', 3], ['heal', 2]] } }, '옛 흡혈귀 혈족장들의 이름을 딴 탐색.', 'A quest named for the ancient vampire bloodchiefs.');
S('guul-draz', 'mire-blight', '늪 역병', 1, [['rot', 3]], {}, '걸린 자를 시들게 하는 늪의 병.', 'A swamp disease that withers its victims.');
S('guul-draz', 'vampires-bite', '흡혈귀의 물기', 1, [['pump', 4, 0]], { kick: { cost: 2, fx: [['pump', 4, 0], ['heal', 4]] }, art: 'fangs' }, '흡혈귀의 물기.', "A vampire's bite.");
S('guul-draz', 'needlebite-trap', '바늘물림 함정', 2, [['pierce', 7], ['heal', 5]], { trap: 'enemyHealed' }, '흡혈귀의 갈증을 닮은 미늘 바늘 함정.', "A barbed-needle trap that hints at the vampires' thirst.");
S('guul-draz', 'ravenous-trap', '굶주린 함정', 2, [['reshuffle'], ['hit', 10]], { trap: 'bigdiscard' }, '탐험가 둘을 삼키려 닫히는, 이빨 돋은 살덩이 굴.', 'A toothed, fleshy burrow closing on two explorers.');
S('guul-draz', 'pitfall-trap', '구덩이 함정', 2, [['hit', 12]], { trap: 'loneAttack', art: 'pit' }, "가시마다 독을 발랐다 — '함정 제작자 나름의 자비'.", "Every spike is poisoned: 'the trapmaker's idea of mercy.'");
S('guul-draz', 'desecrated-earth', '더럽혀진 대지', 1, [['unblock'], ['hit', 6]], {}, "독한 진흙이 터져 나와 땅을 망치는 '오물 폭발'.", "A 'filth burst' of toxic sludge that ruins the land.");
S('guul-draz', 'grim-discovery', '섬뜩한 발견', 2, [['fetchDiscard', 'creature'], ['fetch']], {}, '죽은 자들의 폐허에서 건진 섬뜩한 발견.', 'A grim find among the ruins of the dead.');
S('guul-draz', 'blood-tribute', '피의 공물', 3, [['hitHalf', 25]], { kick: { cost: 2, fx: [['hitHalf', 25], ['heal', 8]] } }, '흡혈귀의 힘으로 생명을 빨아들이는 주문.', 'A vampire-powered spell that drains life.');
S('guul-draz', 'sadistic-sacrament', '가학의 성사', 2, [['hit', 9], ['burn', 4]], { kick: { cost: 4, fx: [['hit', 16], ['burn', 8]] } }, '톱날 칼을 치켜든 흡혈귀의 의식.', 'A vampire rite: a jagged blade held over another.');
S('guul-draz', 'feast-of-blood', '피의 향연', 2, [['hit', 11], ['heal', 4]], {}, '사냥감을 포식하는 흡혈귀들.', 'Vampires gorging on a kill.');
S('guul-draz', 'marsh-casualties', '늪의 사상자', 2, [['sapall', 1], ['hitall', 3]], { kick: { cost: 2, fx: [['sapall', 2], ['hitall', 6]] } }, '붙잡는 수렁에 빠져 죽어 가는 원정대.', 'An expedition dying in the grasping mire.');
S('guul-draz', 'mind-sludge', '정신 오물', 3, [['stunall']], {}, '피해자의 입에서 쏟아지는 검은 오물.', "Black sludge pouring from a victim's mouth.");

// ---- Bala Ged (13) ----
C('bala-ged', 'stonework-puma', '석조 퓨마', 1, [3, 3], [], { art: 'puma' }, "돌 퓨마 'Tawny'. 많은 원정대가 믿고 데려간다.", "'Tawny', a stone puma many expeditions trust enough to take along.");
C('bala-ged', 'bala-ged-thief', '발라 게드 도둑', 2, [3, 3], [], { rally: [['gold', 4]] }, '원정대에 낀 으뜸가는 유물 사냥꾼 Niobe.', 'Niobe, a top relic hunter who joined an expedition.');
C('bala-ged', 'joraga-bard', '조라가 음유시인', 2, [2, 5], [], { rally: [['block', 3]] }, "'읊는 자의 서사시'에 구절을 보탠 조라가 엘프 음유시인 Nikou.", "Nikou, a Joraga elf bard who wrote lines for the Chanter's Epics.");
C('bala-ged', 'nissas-chosen', '니사의 선택받은 자', 1, [2, 4], [], {}, '니사를 호위하는 정예 엘프 전사.', "One of Nissa's elite elf warrior escorts.");
C('bala-ged', 'oracle-of-mul-daya', '물 다야의 신탁자', 3, [3, 3], [], { passive: { lands: 1 }, art: 'oracle' }, '조상의 영혼과 이어진 엘프 나라 물 다야의 주술사.', "A shaman of Mul Daya, the elf nation tied to its ancestors' spirits.");
C('bala-ged', 'greenweaver-druid', '녹색 직조 드루이드', 2, [2, 2], [], { on: { turn: [['mana', 1]] } }, "물 다야 엘프 드루이드. '녹색 직조자'는 그들의 칭호다.", "A Mul Daya elf druid. 'Greenweaver' is their title.");
G('bala-ged', 'savage-silhouette', '야만의 실루엣', 2, { atk: 2, def: 2 }, {}, '사나운 생존 본능의 기운. 엘프들은 환생을 믿는다.', 'An aura of savage survival instinct. The elves believe in reincarnation.');
K('bala-ged', 'beastmaster-ascension', '야수조련사의 승천', 2, [], { quest: { on: 'strike', need: 7, then: { passive: { atk: 3 } } } }, '짐승을 따르는 조라가 엘프들 사이에서 야수조련사로 오르는 길.', 'Rising to Beastmaster among the beast-following Joraga elves.');
K('bala-ged', 'nissa-revane', '니사 레베인', 4, [], { on: { turn: [['heal', 2], ['block', 4]] } }, '발라 게드에서 태어난 조라가 엘프 플레인즈워커.', 'The Joraga elf planeswalker, born in Bala Ged.');
S('bala-ged', 'hideous-end', '끔찍한 최후', 2, [['hit', 14]], {}, '저주받은 보물 때문에 죽어 가는 조라가 유물 사냥꾼 Radavi.', 'Radavi, a Joraga relic hunter dying of a cursed treasure.');
S('bala-ged', 'tanglesap', '엉킴수액', 1, [['weakenall', 6]], {}, '싸움을 멈추게 하는 끈적한 숲의 수액.', 'Tangling forest sap that stops a fight.');
S('bala-ged', 'primal-bellow', '원초의 포효', 1, [['pumpPerLand', 1]], { art: 'bellow' }, '숲 위로 거인처럼 솟아 포효하는 뾰족귀의 인물.', 'A pointy-eared figure towering over the forest, roaring.');
S('bala-ged', 'slaughter-cry', null, 2, [['bonus', 3]], { art: 'cry' }, '창을 꼬나 쥐고 소리 지르며 돌진한다.', 'Charging and shouting, spear leveled.');

// ---- Murasa (13) ----
C('murasa', 'frontier-guide', '변경 안내인', 2, [2, 2], [['fetch']], {}, '길잡이로 이름난 엘프 정찰병.', 'An elf scout prized as a guide.');
C('murasa', 'tajuru-archer', '타주루 궁수', 2, [2, 4], [], { rally: [['hitrandPerAlly', 1]], art: 'bow' }, '타주루 엘프 궁수 Elenar. 활은 카잔두의 수관 가지로 깎았다.', 'Elenar, a Tajuru elf archer. His bow was carved from Kazandu canopy wood.');
C('murasa', 'kazuul-warlord', '카줄 전쟁군주', 3, [4, 3], [], { rally: [['growAllies', 1, 1]] }, '오우거 노예상 Kazuul 에게서 달아나 원정대에 든 미노타우로스 전사 Thraur.', 'Thraur, a minotaur warrior who escaped the ogre slaver Kazuul and joins expeditions.');
C('murasa', 'murasa-pyromancer', '무라사 화염술사', 3, [4, 2], [], { rally: [['hitrandPerAlly', 2]] }, "야생에 불을 지르는 무모한 불 주술사 'Scorcher'.", "'Scorcher', a reckless fire shaman who torches the wilderness.");
C('murasa', 'pillarfield-ox', null, 2, [3, 5], [], {}, '풀 돋은 돌기둥 위에서 코르가 기르던 튼튼한 들소.', 'A sturdy feral ox once herded by kor clans atop grassy pillars.');
C('murasa', 'kazandu-blademaster', '카잔두 검술사', 2, [2, 2], [], { vigil: 1, rally: [['grow', 1, 1]], art: 'blade' }, '카잔두의 숲 협곡에서 모험을 시작한 용병 검사 Assar Ihmad.', "Assar Ihmad, a mercenary swordsman who began adventuring in Kazandu's forest canyons.");
G('murasa', 'trusty-machete', '믿음직한 마체테', 1, { atk: 2, def: 1 }, { art: 'machete' }, '탐험가의 필수품인 정글도. 타주루 엘프가 날을 갈았다고 한다.', "An explorer's necessity. They say Tajuru elves honed its edge.");
K('murasa', 'carnage-altar', '살육의 제단', 1, [], { on: { turn: [['selfhurt', 1], ['draw', 1]] } }, '무덤 위에 선 정글 폐허의 제단.', 'A jungle ruin altar standing over a tomb.');
K('murasa', 'zektar-shrine-expedition', '젝타르 성소 원정', 1, [], { quest: { on: 'land', need: 3, reward: [['hitrand', 14]] } }, '정령이 들끓는 Zektar Shrine 으로 가는 원정.', 'An expedition to the elemental-infested Zektar Shrine.');
K('murasa', 'quest-for-pure-flame', '순수한 불꽃 탐색', 1, [], { quest: { on: 'spell', need: 3, reward: [['hitall', 8]] } }, '순수한 불꽃을 찾는 탐색.', 'A quest for pure flame.');
S('murasa', 'into-the-roil', null, 2, [['banish', 1]], { notBig: 1, kick: { cost: 1, fx: [['banish', 1], ['draw', 1]] }, art: 'wave' }, "'탁류다! 탁류다! 몸을 묶어!'", "'Roil tide! Roil tide! Tie yourselves down!'");
S('murasa', 'narrow-escape', '아슬아슬한 탈출', 2, [['block', 9], ['heal', 4]], { art: 'escape' }, '탐험가의 아슬아슬한 탈출.', "An explorer's narrow escape.");
S('murasa', 'trapfinders-trick', '함정 탐지꾼의 재주', 1, [['freeTraps'], ['draw', 1]], {}, '숨은 함정을 드러내는 카잔두의 함정 탐지꾼 Arhana.', 'Arhana, a Kazandu trapfinder, exposing hidden traps.');

// ---- Ondu (36) ----
C('ondu', 'turntimber-ranger', '변화림 순찰자', 3, [4, 3], [], { rally: [['grow', 1, 1], ['hitrand', 2]] }, '온두에서 으뜸가는 야수조련사인 엘프 순찰자 Zalek.', "Zalek, an elf ranger and Ondu's finest beastmaster.");
C('ondu', 'kraken-hatchling', null, 1, [0, 5], [], {}, '껍데기와 촉수를 지닌, 갓 깨어난 크라켄.', 'A newly hatched kraken with a shell and tentacles.');
C('ondu', 'aether-figment', '에테르 허상', 1, [2, 2], [], { pierce: 1, kick: { cost: 2, fx: [['grow', 2, 2]] } }, '에테르로 이루어진, 막을 수 없는 환영.', 'An unblockable illusion made of aether.');
C('ondu', 'cliff-threader', '절벽 줄타기꾼', 1, [2, 2], [], { walk: 'R' }, '밧줄과 갈고리로 절벽 사이를 건너는 코르 정찰병.', 'A kor scout crossing between cliffs on ropes and hooks.');
C('ondu', 'kor-hookmaster', '코르 갈고리꾼', 2, [3, 2], [['weaken', 6]], {}, '밧줄과 갈고리로 적을 옭아매는 코르 병사.', 'A kor soldier who snares foes with rope and hook.');
C('ondu', 'kor-outfitter', '코르 장비공', 2, [3, 2], [['fetchGear']], {}, '동료에게 장비를 채워 주는 코르 병사.', 'A kor soldier who equips companions.');
C('ondu', 'kor-sanctifiers', '코르 정화자들', 2, [2, 4], [], { kick: { cost: 1, fx: [['strip']] } }, '쓸모없는 장신구를 부수는 코르 성직자들.', 'Kor clerics who destroy needless trinkets.');
C('ondu', 'kor-skyfisher', '코르 하늘낚시꾼', 2, [2, 4], [['retrieve', 1]], { fly: 1 }, '연날개를 타고 하늘의 뱀장어를 낚는 코르.', 'A kor on a kitesail, a hunter of flying windrider eels.');
C('ondu', 'makindi-shieldmate', '마킨디 방패병', 2, [0, 4], [], { defender: 1, rally: [['grow', 0, 2]], art: 'kite' }, '코르 방패병 Moliq. 일행의 마법사와 학자에게 갈 상처를 몸으로 막는다.', "Moliq, a kor shieldmate who takes the blows meant for the party's mages and scholars.");
C('ondu', 'ondu-cleric', '온두 성직자', 1, [2, 2], [], { rally: [['healPerAlly', 1]] }, '바람의 여신 Kamsa 를 섬기며 원정대를 치료하는 코르 성직자 Radrik.', 'Radrik, a kor cleric of the wind goddess Kamsa who heals an expedition.');
C('ondu', 'steppe-lynx', '초원 스라소니', 1, [0, 2], [], { on: { land: [['pump', 3, 2]] }, art: 'lynx' }, '새 사냥터의 낯선 냄새에 피가 끓는 스라소니.', 'A lynx whose blood stirs at the scents of a new hunting ground.');
C('ondu', 'armament-master', '무장의 달인', 2, [3, 2], [], { passive: { atkPerGear: 1 } }, '장비를 잔뜩 짊어진 코르 병사.', 'A kor soldier laden with gear.');
C('ondu', 'devout-lightcaster', '독실한 빛술사', 3, [4, 3], [['pierce', 8]], {}, '그림자를 몰아내는 빛을 Kamsa 에게 비는 코르 성직자.', 'A kor cleric praying to Kamsa for shadow-banishing light.');
C('ondu', 'kabira-evangel', '카비라 전도사', 3, [3, 5], [], { rally: [['block', 4], ['cleanse']] }, '모닥불 이야기로 원정대의 기운을 북돋는 사제 Father Rami.', 'Father Rami, a priest whose campfire tales hearten expeditions.');
C('ondu', 'kor-aeronaut', '코르 비행사', 2, [3, 2], [], { fly: 1, kick: { cost: 1, fx: [['flight']] } }, '하늘을 나는 코르 병사.', 'A flying kor soldier.');
C('ondu', 'kor-duelist', '코르 결투사', 1, [2, 2], [], { twiceIfGear: 1 }, '칼과 사슬로 싸우는 코르 병사.', 'A kor soldier who fights with sword and chain.');
G('ondu', 'spidersilk-net', null, 1, { def: 3, reach: 1 }, {}, '하늘을 나는 것도 잡는 굵은 거미비단 그물.', 'A net of thick spidersilk cord that can snare fliers.');
G('ondu', 'grappling-hook', '갈고리', 3, { twice: 1 }, { art: 'hook' }, '코르의 가장 기본이 되는 도구.', 'The most basic tool of the kor.');
G('ondu', 'trailblazers-boots', '개척자의 장화', 1, { def: 1, pierce: 1 }, {}, '매복 없는 지름길을 찾아 주는, 닳고 닳은 마법 장화.', 'Worn enchanted boots that find ambush-free shortcuts.');
G('ondu', 'predatory-urge', '포식 충동', 2, { atk: 1 }, { on: { strike: [['hitrand', 3]] } }, '하늘을 나는 탈것의 기수를 덮치는 거대한 짐승.', 'A huge beast pouncing on a flying-mount rider.');
K('ondu', 'expedition-map', '원정 지도', 1, [['fetch']], { used: 1 }, '온두의 유물 사냥꾼 Javad Nasrin 의 원정 지도.', 'The expedition map of the Ondu relic hunter Javad Nasrin.');
K('ondu', 'soul-stair-expedition', '영혼 계단 원정', 1, [], { quest: { on: 'land', need: 3, reward: [['retrieve', 2]] } }, 'Omnath 의 감옥 구덩이로 끝없이 내려가는 나선 계단 Soul Stair.', "The endless spiral Soul Stair, down into the pit of Omnath's prison.");
K('ondu', 'quest-for-the-gravelord', '무덤군주 탐색', 1, [], { quest: { on: 'hurt', need: 3, reward: [['hitrand', 15]] } }, '시체를 이어 붙인 거인을 일으키는 탐색.', 'A quest that raises a giant of fused corpses.');
K('ondu', 'quest-for-ancient-secrets', '고대의 비밀 탐색', 1, [], { quest: { on: 'spell', need: 3, repeat: 1, reward: [['draw', 2]] } }, '두루마리를 든 탐험가가 Faduun 을 가리킨다.', 'An explorer with a scroll, pointing toward the Faduun.');
K('ondu', 'journey-to-nowhere', '기약 없는 여정', 2, [['banish', 2]], { used: 1, notBig: 1, art: 'portal' }, '허공의 구멍 너머 다른 곳으로 보낸다.', 'Sent elsewhere, through a hole in the air.');
K('ondu', 'luminarch-ascension', '빛의 집정관의 승천', 2, [], { quest: { on: 'unhurt', need: 2, then: { on: { turn: [['hitrand', 6]] } } } }, '천사를 따르는 이가 빛의 집정관으로 올라 천사를 부른다.', 'An angel-follower rising to luminarch, calling down an angel.');
K('ondu', 'quest-for-the-holy-relic', '성유물 탐색', 1, [], { quest: { on: 'creature', need: 3, reward: [['fetchGear'], ['mana', 2]] } }, '성스러운 유물을 찾는 원정대.', 'An expedition seeking a sacred relic.');
S('ondu', 'unstable-footing', '불안한 발판', 1, [['piercing']], { kick: { cost: 2, fx: [['piercing'], ['pierce', 8]] } }, '흔들리는 발밑과 긴 추락.', 'Shaky ground underfoot, and a long fall.');
S('ondu', 'cancel', null, 2, [['stun']], { notBig: 1 }, '불안정한 마나 속에서 주문을 무효로 한다.', "A counterspell amid Zendikar's volatile mana.");
S('ondu', 'bold-defense', '대담한 방어', 1, [['pumpAll', 1, 1]], { kick: { cost: 2, fx: [['pumpAll', 2, 2]] }, art: 'shields' }, '함께 버티는 방어.', 'A defense of standing together.');
S('ondu', 'baloth-cage-trap', '발로스 우리 함정', 3, [['hit', 14]], { trap: 'strong' }, '침입자에게 우리 속 발로스를 풀어놓는 함정.', 'A trap that releases a caged baloth on intruders.');
S('ondu', 'cobra-trap', '코브라 함정', 3, [['hitrand', 3, 4]], { trap: 'anyQuiet', art: 'snakes' }, "뱀 네 마리를 풀어놓는 함정. '젠디카르의 자연 방어' 가운데 하나.", "A trap that looses four snakes: one of Zendikar's natural defenses.");
S('ondu', 'mindbreak-trap', '정신파괴 함정', 3, [['stunall', 'big']], { trap: 'threat' }, '모험가가 건드릴 법한, 정신을 부수는 함정.', 'A mind-breaking trap, the kind of hazard an adventurer might trigger.');
S('ondu', 'beast-hunt', '짐승 사냥', 1, [['fetchCreature'], ['draw', 1]], {}, '길들일 짐승을 잡는 사냥.', 'A hunt to catch beasts for taming.');
S('ondu', 'demolish', null, 2, [['unblock'], ['hit', 12]], {}, '버려진 코르 도시의 석조물을 무너뜨린다.', "The destruction of an abandoned kor city's stonework.");
S('ondu', 'conquerors-pledge', '정복자의 서약', 3, [['hitrand', 4, 6]], { kick: { cost: 3, fx: [['hitrand', 4, 12]] } }, '한꺼번에 불려 나온 코르 병사 여섯.', 'Six kor soldiers, summoned all at once.');

// ---- Lands (20): found in their own continent; a place's land is always offered at that place ----
L('tazeem', 'emeria-the-sky-ruin', '하늘 유적 에메리아', [['fetchDiscard', 'creature']], { slow: 1 }, '타짐의 하늘에 뜬 헤드론 잔해, 하늘 유적.', "The Sky Ruin, hedron debris adrift in Tazeem's sky.");
L('tazeem', 'magosi-the-waterveil', '물의 장막 마고시', [['draw', 1]], { slow: 1 }, '마고시 폭포의 물의 장막.', 'The water veil of Magosi Falls.');
L('tazeem', 'oran-rief-the-vastwood', '광활림 오란리프', [['growAll', 1, 1]], { slow: 1 }, '자라는 암초 바위 위의 거대한 숲.', 'The huge forest on growing reef-rock.');
L('sejiri', 'sejiri-refuge', '세지리 피난처', [['heal', 1]], { slow: 1 }, '얼어붙은 세지리의 피난처.', 'A refuge in frozen Sejiri.');
L('akoum', 'akoum-refuge', '아쿰 피난처', [['heal', 1]], { slow: 1 }, '아쿰의 이빨 기슭의 피난처.', 'A refuge at the foot of the Teeth of Akoum.');
L('guul-draz', 'piranha-marsh', '피라냐 늪', [['hitall', 2]], { slow: 1 }, '피라냐가 들끓는 하그라의 습지.', 'A piranha-infested marsh of Hagra.');
L('bala-ged', 'misty-rainforest', null, [['selfhurt', 1]], {}, 'Guum Wilds 의 안개 낀 우림.', 'The misty rainforest of the Guum Wilds.');
L('murasa', 'kazandu-refuge', '카잔두 피난처', [['heal', 1]], { slow: 1 }, '자디 나무 아래 카잔두의 피난처.', 'A refuge under the jaddi trees of Kazandu.');
L('murasa', 'arid-mesa', null, [['selfhurt', 1]], {}, 'Na Plateau 의 메마른 고원.', 'The dry tableland of the Na Plateau.');
L('murasa', 'verdant-catacombs', null, [['selfhurt', 1]], {}, '카잔두의 푸르게 덮인 지하묘지.', 'The overgrown catacombs of Kazandu.');
L('murasa', 'soaring-seacliff', '치솟은 바다절벽', [['flight']], { slow: 1 }, '무라사를 두른 깎아지른 바다 절벽.', 'The sheer sea cliffs that wall Murasa.');
L('ondu', 'graypelt-refuge', '회색가죽 피난처', [['heal', 1]], { slow: 1 }, '온두의 정착지 회색가죽.', 'Graypelt, a settlement of Ondu.');
L('ondu', 'jwar-isle-refuge', '좌르 섬 피난처', [['heal', 1]], { slow: 1 }, '바다뱀이 에워싼 좌르 섬.', 'Jwar Isle, ringed by sea serpents.');
L('ondu', 'marsh-flats', null, [['selfhurt', 1]], {}, '아가딤의 축축한 평지.', 'The wet flats of Agadeem.');
L('ondu', 'scalding-tarn', null, [['selfhurt', 1]], {}, '용이 몸을 담그는 Boilbasin 의 끓는 웅덩이.', 'A steaming pool of Boilbasin, where dragons bathe.');
L('ondu', 'crypt-of-agadeem', '아가딤의 지하묘지', [['retrieve', 1]], { slow: 1 }, "'죽음의 시간'에 열린다는, 함정으로 가득한 무덤.", "A trapped tomb said to open at the 'hour of death'.");
L('ondu', 'valakut-the-molten-pinnacle', null, [['hitrandPerLand', 2]], { slow: 1 }, '고블린 벽화 위로 솟은 활화산.', 'An active volcano over goblin murals.');
L('ondu', 'kabira-crossroads', '카비라 갈림길', [['heal', 2]], { slow: 1 }, '헤드론 벌판 곁 카비라의 갈림길.', 'The crossroads of Kabira, by the hedron fields.');
L('ondu', 'teetering-peaks', '위태로운 봉우리', [['bonus', 2]], { slow: 1 }, '금방이라도 무너질 듯한 온두의 봉우리.', 'Peaks of Ondu that look ready to fall.');
L('ondu', 'turntimber-grove', '변화림 숲', [['bonus', 1], ['block', 2]], { slow: 1 }, '나선으로 치솟는 나무들의 숲.', 'A grove of trees that spiral upward.');

// The land each stop always offers (in its rewards, or in its market).
export const placeLand = {
  'oran-rief': 'oran-rief-the-vastwood', 'teeth-of-akoum': 'akoum-refuge', 'kazandu': 'kazandu-refuge',
  'hagra-swamp': 'piranha-marsh', 'turntimber': 'turntimber-grove', 'kabira': 'kabira-crossroads',
};
