// Authoring table for the game's ZEN cards (all but the first 36, which are written by hand in
// src/cards.ts): one line a card, numbers written in place. tools/gen-content.mjs turns each
// number into a data/config.json value and writes src/cards2.ts. The numbers here are the ones
// first written; data/config.json holds the values as they are now.
// P(continent, id, game's own Korean name or null when an official one exists, type, cost,
//   target 'e' (an enemy) or 'n', effects, extras, lore in Korean, lore in English)
export const cards = [];
const P = (cont, id, ko, type, cost, tg, fx, x, lk, le) => cards.push({ cont, id, ko, type, cost, target: tg === 'e' ? 'enemy' : 'none', fx, x: x || {}, lore: { ko: lk, en: le } });
const L = (cont, id, ko, fx, lk, le) => P(cont, id, ko, 'land', 0, 'n', fx, {}, lk, le);
const FETCH = () => [['selfhurt', 1], ['fetch'], ['extraLand', 1]];

// ---- Akoum (35) ----
P('akoum', 'highland-berserker', '고지대 광전사', 'attack', 1, 'e', [['hit', 6]], { ally: 1, rally: ['hit', 2] }, '싸움을 찾아다니며 도끼를 휘두르는 광전사 Dronn.', 'Dronn, an axe-swinging berserker who goes looking for fights.');
P('akoum', 'tuktuk-grunts', '툭툭 졸개들', 'attack', 1, 'e', [['hit', 2, 3]], { ally: 1, rally: ['hit', 1] }, '툭툭 부족의 열성적인 고블린 탐험가 삼남매 Bindi, Paldi, Zurdi.', 'Bindi, Paldi and Zurdi, zealous Tuktuk goblin explorer siblings.');
P('akoum', 'eldrazi-monument', '엘드라지 기념비', 'power', 3, 'n', [], { passive: { atk: 2, blk: 2 }, on: { turn: [['selfhurt', 2]] } }, '떠 있는 폐허 벌판에 선, 알 수 없는 존재를 새긴 금 간 고대 석상.', 'An ancient cracked statue of an unknown creature in a floating ruin field.');
P('akoum', 'khalni-gem', '칼니 보석', 'skill', 1, 'n', [['energy', 2], ['fetchDiscard', 'land']], {}, "'오라 온다르의 심장부에서 잃어버린 고대 힘의 조각'이라는 마나 보석.", "A mana gem, 'a fragment of ancient power lost in the heart of Ora Ondar'.");
P('akoum', 'goblin-war-paint', null, 'power', 1, 'n', [], { passive: { atk: 1 } }, '감각을 벼리고 두려움을 무디게 하는 kolya 열매 출진 물감.', 'Kolya-fruit war paint that sharpens the senses and dulls fear.');
P('akoum', 'caravan-hurda', '대상단 후르다', 'skill', 1, 'n', [['block', 6], ['heal', 2]], {}, '고마 파다 대상단의 수레를 끄는 거대한 짐승.', "A huge beast that hauls the Goma Fada caravan's wagons.");
P('akoum', 'goblin-shortcutter', null, 'skill', 0, 'e', [['unblock'], ['draw', 1]], {}, '지름길을 아는 고블린 정찰병. 값은 싸지만 손버릇이 나쁘다.', 'A goblin scout who knows the shortcuts: cheap, but thieving.');
P('akoum', 'lullmage-mentor', '소강마도사 스승', 'skill', 2, 'e', [['stun'], ['draw', 1]], {}, '땅과 마법을 잠재우는 소강마도사들을 가르치는 인어 스승.', 'A merfolk teacher of lullmages, who quiet land and magic.');
P('akoum', 'reckless-scholar', null, 'skill', 0, 'n', [['draw', 2], ['discard', 1]], {}, '남들이 가지 않는 곳에서 지식을 캐는 무모한 학자.', "A reckless scholar sifting knowledge where others won't go.");
P('akoum', 'torch-slinger', '횃불 투척꾼', 'attack', 1, 'e', [['hit', 5], ['burn', 2]], {}, '불붙은 횃불을 던지는 원정대의 고블린 주술사.', 'An expedition goblin shaman who hurls flaming torches.');
P('akoum', 'zendikar-farguide', '젠디카르 먼길잡이', 'skill', 1, 'n', [['block', 4], ['extraLand', 1]], {}, '숲을 걷는 정령. 원정대는 그 발자취를 따라간다.', 'A forest-walking elemental whose trails expeditions follow.');
P('akoum', 'electropotence', '전기 잠재력', 'power', 2, 'n', [], { on: { ally: [['hitrand', 4]] } }, "'생명과 힘이 부딪치는 곳'의 붉은 부여마법.", "A red enchantment 'where life and force collide'.");
P('akoum', 'disfigure', null, 'attack', 1, 'e', [['hit', 4], ['sap', 2]], {}, '손가락이 긴 흰 손이 얼굴을 할퀴는 약화 주문.', 'A weakening spell: a long-fingered white hand clawing a face.');
P('akoum', 'punishing-fire', '응징의 불길', 'attack', 1, 'e', [['hit', 5]], { recur: 1 }, '되풀이해 돌아오는 불의 주문.', 'A fire spell that keeps coming back.');
P('akoum', 'seismic-shudder', '지진의 떨림', 'attack', 1, 'n', [['hitall', 4]], {}, '땅 위의 모든 것을 흔드는 지진.', 'An earthquake that shakes everything on the ground.');
P('akoum', 'summoners-bane', '소환사의 파멸', 'attack', 1, 'e', [['cancel'], ['hit', 5]], {}, '푸른 환영을 남기는 무효화 주문.', 'A counterspell that leaves a blue illusion behind.');
P('akoum', 'trapmakers-snare', '함정 제작자의 올가미', 'skill', 1, 'n', [['fetchTrap'], ['draw', 1]], {}, "함정 제작자의 올가미, '몸으로 푸는 수수께끼'.", "A trapmaker's snare, 'a corporeal riddle'.");
P('akoum', 'chandra-ablaze', '불타오르는 찬드라', 'power', 3, 'n', [], { on: { turn: [['hitrand', 5]] } }, '두루마리 지도를 따라 Eye of Ugin 을 찾아온 화염술사 플레인즈워커.', 'The pyromancer planeswalker who followed a scroll map to the Eye of Ugin.');
P('akoum', 'sorin-markov', null, 'power', 3, 'n', [], { on: { turn: [['hitrand', 2], ['heal', 2]] } }, '엘드라지를 가두는 일을 도왔던 흡혈귀 플레인즈워커.', 'The vampire planeswalker who helped imprison the Eldrazi.');
P('akoum', 'ior-ruin-expedition', '이오르 유적 원정', 'power', 1, 'n', [], { quest: { on: 'land', need: 4, reward: [['draw', 2]] } }, '호수 바닥에 가라앉은 Ior Ruin 을 내려다보는 원정대.', 'An expedition looking down on the sunken Ior Ruin on the lake bed.');
P('akoum', 'khalni-heart-expedition', '칼니 심장 원정', 'power', 1, 'n', [], { quest: { on: 'land', need: 3, reward: [['fetch'], ['fetch'], ['extraLand', 2]] } }, '오라 온다르에 숨은 Khalni Heart 를 찾는 원정대.', 'An expedition seeking the Khalni Heart hidden in Ora Ondar.');
P('akoum', 'pyromancer-ascension', '화염술사의 승천', 'power', 2, 'n', [], { quest: { on: 'attack', need: 3, then: { passive: { atk: 3 } } } }, '같은 주문을 되풀이해 불길을 키우는 화염술사의 의식.', "A pyromancer's ritual: repeat a spell and the fire grows.");
P('akoum', 'quest-for-the-gemblades', '보석칼날 탐색', 'power', 1, 'n', [], { quest: { on: 'attack', need: 3, repeat: 1, reward: [['hitrand', 6]] } }, "정체가 밝혀지지 않은 '보석칼날'을 찾는 탐색.", "A quest for the unexplained 'Gemblades'.");
P('akoum', 'day-of-judgment', null, 'attack', 3, 'n', [['hitall', 15]], {}, '모든 것을 쓸어버리는 주문.', 'A spell that sweeps everything away.');
P('akoum', 'elemental-appeal', '정령의 호소', 'attack', 2, 'e', [['hit', 12]], { lf: [['hit', 18]] }, '잠깐 불려 나오는 붉은 정령.', 'A red elemental called up for a moment.');
P('akoum', 'landbind-ritual', '대지 결속 의식', 'skill', 1, 'n', [['healPerLand', 2]], {}, '성스러운 흙을 살갗에 문질러 땅과의 유대를 새기는 코르 순례단.', 'Kor pilgrims rubbing sacred soil on their skin to renew their bond with the land.');
P('akoum', 'magma-rift', '마그마 균열', 'attack', 1, 'e', [['hit', 12]], { req: 'landInHand' }, '땅을 가르는 마그마의 균열.', 'A rift of magma splitting the ground.');
P('akoum', 'mark-of-mutiny', null, 'skill', 2, 'e', [['mutiny']], { notBig: 1 }, '생물이 분노해 제 주인에게 등을 돌리게 하는 주문.', 'A spell that turns a creature against its master in anger.');
P('akoum', 'spire-barrage', '첨탑 포화', 'attack', 2, 'e', [['hitPerLandPlayed', 5]], {}, '쏟아지는 바위와 수정 조각.', 'Falling rocks and crystal shards.');
P('akoum', 'archive-trap', '문서고 함정', 'attack', 3, 'e', [['stun'], ['hit', 8]], { trap: 'quiet' }, '고대 지하 문서고의 천장이 무너지는 함정.', 'A ceiling-collapse trap in an ancient underground archive.');
P('akoum', 'lavaball-trap', '용암구 함정', 'attack', 3, 'n', [['hitall', 10]], { trap: 'crowd' }, '땅을 부수고 모든 것을 태우는 용암 함정.', 'A lava trap that wrecks the land and burns every creature.');
P('akoum', 'lethargy-trap', '무기력 함정', 'skill', 1, 'n', [['sapall', 2]], { trap: 'crowd' }, '기운을 빼앗는 마법 함정. 고블린 Zurdi 는 아무래도 좋아졌다.', 'An energy-sapping magical trap. The goblin Zurdi stopped caring.');
P('akoum', 'runeflare-trap', '룬섬광 함정', 'attack', 2, 'e', [['hitPerHand', 3]], { trap: 'fullhand' }, '보물을 노리고 헤드론을 쪼던 고블린이 건드린 룬 함정.', 'A rune trap goblins set off when chipping hedrons open for treasure.');
P('akoum', 'summoning-trap', '소환 함정', 'skill', 2, 'n', [['fetchAlly'], ['fetchAlly'], ['energy', 1]], { trap: 'lowhp' }, '침입자 앞에 수호자를 불러내는 함정.', 'A trap that summons a guardian before the intruder.');
P('akoum', 'whiplash-trap', '채찍 함정', 'attack', 2, 'e', [['strip'], ['hit', 6]], { trap: 'shielded' }, '생물 둘을 주인에게 튕겨 보내는 함정.', 'A trap that flings two creatures back to their owners.');

// ---- Bala Ged (9) ----
P('bala-ged', 'bala-ged-thief', '발라 게드 도둑', 'attack', 1, 'e', [['hit', 5], ['gold', 4]], { ally: 1, rally: ['hit', 2] }, '원정대에 낀 으뜸가는 유물 사냥꾼 Niobe.', 'Niobe, a top relic hunter who joined an expedition.');
P('bala-ged', 'joraga-bard', '조라가 음유시인', 'skill', 1, 'n', [['block', 5]], { ally: 1, rally: ['block', 2] }, "'읊는 자의 서사시'에 구절을 보탠 조라가 엘프 음유시인 Nikou.", "Nikou, a Joraga elf bard who wrote lines for the Chanter's Epics.");
P('bala-ged', 'savage-silhouette', '야만의 실루엣', 'power', 1, 'n', [], { on: { turn: [['heal', 1]] } }, '사나운 생존 본능의 기운. 엘프들은 환생을 믿는다.', 'An aura of savage survival instinct. The elves believe in reincarnation.');
P('bala-ged', 'greenweaver-druid', '녹색 직조 드루이드', 'skill', 1, 'n', [['energy', 2], ['draw', 1]], {}, "물 다야 엘프 드루이드. '녹색 직조자'는 그들의 칭호다.", "A Mul Daya elf druid. 'Greenweaver' is their title.");
P('bala-ged', 'nissas-chosen', '니사의 선택받은 자', 'attack', 1, 'e', [['hit', 4, 2]], {}, '니사를 호위하는 정예 엘프 전사.', "One of Nissa's elite elf warrior escorts.");
P('bala-ged', 'hideous-end', '끔찍한 최후', 'attack', 2, 'e', [['hit', 14]], {}, '저주받은 보물 때문에 죽어 가는 조라가 유물 사냥꾼 Radavi.', 'Radavi, a Joraga relic hunter dying of a cursed treasure.');
P('bala-ged', 'tanglesap', '엉킴수액', 'skill', 1, 'n', [['block', 8]], {}, '싸움을 멈추게 하는 끈적한 숲의 수액.', 'Tangling forest sap that stops a fight.');
P('bala-ged', 'nissa-revane', '니사 레베인', 'power', 3, 'n', [], { on: { turn: [['heal', 2], ['block', 3]] } }, '발라 게드에서 태어난 조라가 엘프 플레인즈워커.', 'The Joraga elf planeswalker, born in Bala Ged.');
P('bala-ged', 'beastmaster-ascension', '야수조련사의 승천', 'power', 2, 'n', [], { quest: { on: 'attack', need: 6, then: { passive: { atk: 5 } } } }, '짐승을 따르는 조라가 엘프들 사이에서 야수조련사로 오르는 길.', 'Rising to Beastmaster among the beast-following Joraga elves.');

// ---- Guul Draz (15) ----
P('guul-draz', 'hagra-diabolist', '하그라 악마술사', 'attack', 1, 'e', [['pierce', 4]], { ally: 1, rally: ['hit', 2] }, '악마의 마법에 손댄 오우거 용병 주술사 Morodrath.', 'Morodrath, an ogre mercenary shaman who dabbles in demonic magic.');
P('guul-draz', 'gigantiform', '거대화 형상', 'power', 2, 'n', [], { passive: { atk: 3 } }, '생물을 거대하게 만드는 마법. 뿔 달린 거대한 딱정벌레를 탄 모습.', 'Magic that makes a creature gigantic, shown as a ridden giant horned beetle.');
P('guul-draz', 'mire-blight', '늪 역병', 'skill', 1, 'e', [['burn', 4]], {}, '걸린 자를 시들게 하는 늪의 병.', 'A swamp disease that withers its victims.');
P('guul-draz', 'cosis-trickster', '코시의 책략가', 'skill', 1, 'n', [['reshuffle'], ['draw', 2]], {}, '탁류의 혼돈에서 힘을 찾는, 사기꾼 신 Cosi 의 인어 마도사.', "A merfolk mage of the trickster god Cosi, seeking strength in the Roil's chaos.");
P('guul-draz', 'blade-of-the-bloodchief', '혈족장의 칼', 'power', 1, 'n', [], { on: { attack: [['heal', 1]] } }, '송곳니처럼 긴 혈족장의 쌍날 칼.', 'The long, fang-like double blade of a bloodchief.');
P('guul-draz', 'bloodchief-ascension', '혈족장의 승천', 'power', 1, 'n', [], { quest: { on: 'attack', need: 3, repeat: 1, reward: [['hitrand', 3], ['heal', 3]] } }, '옛 흡혈귀 혈족장들의 이름을 딴 탐색.', 'A quest named for the ancient vampire bloodchiefs.');
P('guul-draz', 'blood-tribute', '피의 공물', 'attack', 3, 'e', [['hitHalf', 25]], {}, '흡혈귀의 힘으로 생명을 빨아들이는 주문.', 'A vampire-powered spell that drains life.');
P('guul-draz', 'desecrated-earth', '더럽혀진 대지', 'attack', 1, 'e', [['unblock'], ['hit', 7]], {}, "독한 진흙이 터져 나와 땅을 망치는 '오물 폭발'.", "A 'filth burst' of toxic sludge that ruins the land.");
P('guul-draz', 'feast-of-blood', '피의 향연', 'attack', 2, 'e', [['hit', 12], ['heal', 5]], {}, '사냥감을 포식하는 흡혈귀들.', 'Vampires gorging on a kill.');
P('guul-draz', 'grim-discovery', '섬뜩한 발견', 'skill', 1, 'n', [['fetchDiscard', 'land'], ['fetchDiscard', 'ally']], {}, '죽은 자들의 폐허에서 건진 섬뜩한 발견.', 'A grim find among the ruins of the dead.');
P('guul-draz', 'marsh-casualties', '늪의 사상자', 'attack', 2, 'n', [['sapall', 2], ['hitall', 4]], {}, '붙잡는 수렁에 빠져 죽어 가는 원정대.', 'An expedition dying in the grasping mire.');
P('guul-draz', 'mind-sludge', '정신 오물', 'skill', 2, 'n', [['stunall']], {}, '피해자의 입에서 쏟아지는 검은 오물.', "Black sludge pouring from a victim's mouth.");
P('guul-draz', 'sadistic-sacrament', '가학의 성사', 'attack', 2, 'e', [['hit', 9], ['burn', 4]], {}, '톱날 칼을 치켜든 흡혈귀의 의식.', 'A vampire rite: a jagged blade held over another.');
P('guul-draz', 'needlebite-trap', '바늘물림 함정', 'attack', 2, 'e', [['pierce', 7], ['heal', 5]], { trap: 'enemyHealed' }, '흡혈귀의 갈증을 닮은 미늘 바늘 함정.', "A barbed-needle trap that hints at the vampires' thirst.");
P('guul-draz', 'ravenous-trap', '굶주린 함정', 'attack', 2, 'e', [['reshuffle'], ['hit', 10]], { trap: 'bigdiscard' }, '탐험가 둘을 삼키려 닫히는, 이빨 돋은 살덩이 굴.', 'A toothed, fleshy burrow closing on two explorers.');

// ---- Murasa (8) ----
P('murasa', 'kazuul-warlord', '카줄 전쟁군주', 'power', 1, 'n', [], { ally: 1, on: { ally: [['block', 3]] } }, '오우거 노예상 Kazuul 에게서 달아나 원정대에 든 미노타우로스 전사 Thraur.', 'Thraur, a minotaur warrior who escaped the ogre slaver Kazuul and joins expeditions.');
P('murasa', 'murasa-pyromancer', '무라사 화염술사', 'attack', 2, 'e', [['hit', 6]], { ally: 1, rally: ['hit', 3] }, "야생에 불을 지르는 무모한 불 주술사 'Scorcher'.", "'Scorcher', a reckless fire shaman who torches the wilderness.");
P('murasa', 'carnage-altar', '살육의 제단', 'skill', 1, 'n', [['selfhurt', 3], ['draw', 3]], {}, '무덤 위에 선 정글 폐허의 제단.', 'A jungle ruin altar standing over a tomb.');
P('murasa', 'frontier-guide', '변경 안내인', 'skill', 1, 'n', [['fetch'], ['draw', 1]], {}, '길잡이로 이름난 엘프 정찰병.', 'An elf scout prized as a guide.');
P('murasa', 'pillarfield-ox', null, 'skill', 1, 'n', [['block', 7]], {}, '풀 돋은 돌기둥 위에서 코르가 기르던 튼튼한 들소.', 'A sturdy feral ox once herded by kor clans atop grassy pillars.');
P('murasa', 'quest-for-pure-flame', '순수한 불꽃 탐색', 'power', 1, 'n', [], { quest: { on: 'attack', need: 4, reward: [['bonus', 6]] } }, '순수한 불꽃을 찾는 탐색.', 'A quest for pure flame.');
P('murasa', 'zektar-shrine-expedition', '젝타르 성소 원정', 'power', 1, 'n', [], { quest: { on: 'land', need: 3, reward: [['hitrand', 14]] } }, '정령이 들끓는 Zektar Shrine 으로 가는 원정.', 'An expedition to the elemental-infested Zektar Shrine.');
P('murasa', 'trapfinders-trick', '함정 탐지꾼의 재주', 'skill', 1, 'n', [['freeTraps'], ['draw', 1]], {}, '숨은 함정을 드러내는 카잔두의 함정 탐지꾼 Arhana.', 'Arhana, a Kazandu trapfinder, exposing hidden traps.');

// ---- Ondu (30) ----
P('ondu', 'kabira-evangel', '카비라 전도사', 'skill', 1, 'n', [['block', 6], ['cleanse']], { ally: 1, rally: ['block', 2] }, '모닥불 이야기로 원정대의 기운을 북돋는 사제 Father Rami.', 'Father Rami, a priest whose campfire tales hearten expeditions.');
P('ondu', 'ondu-cleric', '온두 성직자', 'skill', 1, 'n', [['heal', 3]], { ally: 1, rally: ['heal', 2] }, '바람의 여신 Kamsa 를 섬기며 원정대를 치료하는 코르 성직자 Radrik.', 'Radrik, a kor cleric of the wind goddess Kamsa who heals an expedition.');
P('ondu', 'turntimber-ranger', '변화림 순찰자', 'attack', 2, 'e', [['hit', 7], ['hitrand', 4]], { ally: 1, rally: ['hit', 2] }, '온두에서 으뜸가는 야수조련사인 엘프 순찰자 Zalek.', "Zalek, an elf ranger and Ondu's finest beastmaster.");
P('ondu', 'expedition-map', '원정 지도', 'skill', 0, 'n', [['fetch']], {}, '온두의 유물 사냥꾼 Javad Nasrin 의 원정 지도.', 'The expedition map of the Ondu relic hunter Javad Nasrin.');
P('ondu', 'predatory-urge', '포식 충동', 'attack', 2, 'e', [['hit', 7, 2]], {}, '하늘을 나는 탈것의 기수를 덮치는 거대한 짐승.', 'A huge beast pouncing on a flying-mount rider.');
P('ondu', 'aether-figment', '에테르 허상', 'attack', 1, 'e', [['pierce', 6]], { lf: [['pierce', 9]] }, '에테르로 이루어진, 막을 수 없는 환영.', 'An unblockable illusion made of aether.');
P('ondu', 'armament-master', '무장의 달인', 'power', 1, 'n', [], { passive: { atkPerPower: 1 } }, '장비를 잔뜩 짊어진 코르 병사.', 'A kor soldier laden with gear.');
P('ondu', 'cliff-threader', '절벽 줄타기꾼', 'attack', 0, 'e', [['hit', 3]], { lfAdd: [['block', 3]] }, '밧줄과 갈고리로 절벽 사이를 건너는 코르 정찰병.', 'A kor scout crossing between cliffs on ropes and hooks.');
P('ondu', 'devout-lightcaster', '독실한 빛술사', 'attack', 2, 'e', [['pierce', 10], ['cleanse']], {}, '그림자를 몰아내는 빛을 Kamsa 에게 비는 코르 성직자.', 'A kor cleric praying to Kamsa for shadow-banishing light.');
P('ondu', 'kor-aeronaut', '코르 비행사', 'attack', 1, 'e', [['pierce', 5], ['draw', 1]], {}, '하늘을 나는 코르 병사.', 'A flying kor soldier.');
P('ondu', 'kor-duelist', '코르 결투사', 'attack', 1, 'e', [['hit', 4, 2]], { timesIfPower: 3 }, '칼과 사슬로 싸우는 코르 병사.', 'A kor soldier who fights with sword and chain.');
P('ondu', 'kor-hookmaster', '코르 갈고리꾼', 'skill', 1, 'e', [['weaken', 6], ['draw', 1]], {}, '밧줄과 갈고리로 적을 옭아매는 코르 병사.', 'A kor soldier who snares foes with rope and hook.');
P('ondu', 'kor-outfitter', '코르 장비공', 'skill', 1, 'n', [['fetchPower'], ['block', 3]], {}, '동료에게 장비를 채워 주는 코르 병사.', 'A kor soldier who equips companions.');
P('ondu', 'kor-sanctifiers', '코르 정화자들', 'skill', 1, 'e', [['strip'], ['block', 4]], {}, '쓸모없는 장신구를 부수는 코르 성직자들.', 'Kor clerics who destroy needless trinkets.');
P('ondu', 'kor-skyfisher', '코르 하늘낚시꾼', 'attack', 1, 'e', [['hit', 5], ['retrieve', 1]], {}, '연날개를 타고 하늘의 뱀장어를 낚는 코르.', 'A kor on a kitesail, a hunter of flying windrider eels.');
P('ondu', 'kraken-hatchling', null, 'skill', 1, 'n', [['block', 5], ['blockNext', 5]], {}, '껍데기와 촉수를 지닌, 갓 깨어난 크라켄.', 'A newly hatched kraken with a shell and tentacles.');
P('ondu', 'spidersilk-net', null, 'power', 1, 'n', [], { on: { turn: [['block', 3]] } }, '하늘을 나는 것도 잡는 굵은 거미비단 그물.', 'A net of thick spidersilk cord that can snare fliers.');
P('ondu', 'trailblazers-boots', '개척자의 장화', 'power', 1, 'n', [], { on: { land: [['draw', 1]] } }, '매복 없는 지름길을 찾아 주는, 닳고 닳은 마법 장화.', 'Worn enchanted boots that find ambush-free shortcuts.');
P('ondu', 'cancel', null, 'skill', 2, 'e', [['stun']], { notBig: 1 }, '불안정한 마나 속에서 주문을 무효로 한다.', "A counterspell amid Zendikar's volatile mana.");
P('ondu', 'unstable-footing', '불안한 발판', 'attack', 1, 'e', [['pierce', 8]], {}, '흔들리는 발밑과 긴 추락.', 'Shaky ground underfoot, and a long fall.');
P('ondu', 'luminarch-ascension', '빛의 집정관의 승천', 'power', 2, 'n', [], { quest: { on: 'unhurt', need: 2, then: { on: { turn: [['hitrand', 8]] } } } }, '천사를 따르는 이가 빛의 집정관으로 올라 천사를 부른다.', 'An angel-follower rising to luminarch, calling down an angel.');
P('ondu', 'quest-for-ancient-secrets', '고대의 비밀 탐색', 'power', 1, 'n', [], { quest: { on: 'skill', need: 3, repeat: 1, reward: [['draw', 2]] } }, '두루마리를 든 탐험가가 Faduun 을 가리킨다.', 'An explorer with a scroll, pointing toward the Faduun.');
P('ondu', 'quest-for-the-gravelord', '무덤군주 탐색', 'power', 1, 'n', [], { quest: { on: 'hurt', need: 3, reward: [['hitrand', 15]] } }, '시체를 이어 붙인 거인을 일으키는 탐색.', 'A quest that raises a giant of fused corpses.');
P('ondu', 'quest-for-the-holy-relic', '성유물 탐색', 'power', 1, 'n', [], { quest: { on: 'ally', need: 2, reward: [['fetchPower'], ['energy', 1]] } }, '성스러운 유물을 찾는 원정대.', 'An expedition seeking a sacred relic.');
P('ondu', 'soul-stair-expedition', '영혼 계단 원정', 'power', 1, 'n', [], { quest: { on: 'land', need: 3, reward: [['retrieve', 2]] } }, 'Omnath 의 감옥 구덩이로 끝없이 내려가는 나선 계단 Soul Stair.', "The endless spiral Soul Stair, down into the pit of Omnath's prison.");
P('ondu', 'beast-hunt', '짐승 사냥', 'skill', 1, 'n', [['fetchAlly'], ['draw', 1]], {}, '길들일 짐승을 잡는 사냥.', 'A hunt to catch beasts for taming.');
P('ondu', 'conquerors-pledge', '정복자의 서약', 'attack', 3, 'n', [['hitrand', 4, 6]], {}, '한꺼번에 불려 나온 코르 병사 여섯.', 'Six kor soldiers, summoned all at once.');
P('ondu', 'demolish', null, 'attack', 2, 'e', [['unblock'], ['hit', 13]], {}, '버려진 코르 도시의 석조물을 무너뜨린다.', "The destruction of an abandoned kor city's stonework.");
P('ondu', 'baloth-cage-trap', '발로스 우리 함정', 'attack', 3, 'e', [['hit', 14]], { trap: 'strong' }, '침입자에게 우리 속 발로스를 풀어놓는 함정.', 'A trap that releases a caged baloth on intruders.');
P('ondu', 'mindbreak-trap', '정신파괴 함정', 'skill', 3, 'n', [['stunall', 'big']], { trap: 'threat' }, '모험가가 건드릴 법한, 정신을 부수는 함정.', 'A mind-breaking trap, the kind of hazard an adventurer might trigger.');

// ---- Sejiri (3) ----
P('sejiri', 'felidar-sovereign', null, 'power', 3, 'n', [], { on: { turn: [['heal', 3]] } }, '수정 뿔을 지닌 거대한 흰 고양이 짐승.', 'A huge white cat beast with a crystal horn.');
P('sejiri', 'sphinx-of-lost-truths', '잃어버린 진실의 스핑크스', 'skill', 1, 'n', [['draw', 3], ['discard', 2]], {}, '외딴 보금자리에 지식을 쌓아 둔 속 모를 스핑크스.', 'An inscrutable sphinx hoarding knowledge in a remote lair.');
P('sejiri', 'tempest-owl', '폭풍 올빼미', 'attack', 1, 'e', [['hit', 3], ['weakenall', 3]], {}, '얼음 폭풍이 몰아치는 툰드라의 올빼미.', 'An owl of the ice-storm-pelted tundra.');

// ---- Tazeem (24) ----
P('tazeem', 'oran-rief-survivalist', '오란리프 생존 전문가', 'attack', 1, 'e', [['hit', 4], ['block', 2]], { ally: 1, rally: ['hit', 2] }, '생존 전문가이자 숲의 길잡이 Yon Basrel.', 'Yon Basrel, a survival expert and forest guide.');
P('tazeem', 'sea-gate-loremaster', '바다 관문 전승학자', 'skill', 1, 'n', [['draw', 1]], { ally: 1, rally: ['draw', 1] }, '바다 관문 등대에서 배운 인어 현장 학자 Vado Thal.', 'Vado Thal, a merfolk field scholar trained at the Sea Gate lighthouse.');
P('tazeem', 'seascape-aerialist', '바다풍경 곡예비행사', 'skill', 1, 'n', [['piercing'], ['bonus', 1]], { ally: 1, rally: ['bonus', 1] }, '떠 있는 섬들을 탐사한 인어 마도사 Thairin.', 'Thairin, a merfolk wizard who explored the floating islands.');
P('tazeem', 'umara-raptor', '우마라 랩터', 'attack', 0, 'e', [['hit', 2]], { ally: 1, rally: ['hit', 2] }, '원정대의 일원으로 치는 어린 랩터 Sharpwing.', 'Sharpwing, a young raptor counted as an expedition member.');
P('tazeem', 'eternity-vessel', '영원의 그릇', 'power', 2, 'n', [], { on: { land: [['heal', 4]] } }, '생명을 되돌려 주는 그릇. 치유의 태양샘 곁에 놓여 있다.', 'A life-restoring vessel, set beside the healing Sunspring.');
P('tazeem', 'celestial-mantle', '천상의 망토', 'power', 2, 'n', [], { passive: { blk: 2 } }, '생물을 감싸는 하늘의 갑옷.', 'Heavenly armor wrapped around a creature.');
P('tazeem', 'nimbus-wings', '후광구름 날개', 'skill', 1, 'n', [['block', 5], ['piercing']], {}, '하늘을 날게 하는 구름 날개.', 'Wings of cloud that grant flight.');
P('tazeem', 'paralyzing-grasp', null, 'skill', 1, 'e', [['halve'], ['draw', 1]], {}, '생물을 꼼짝 못 하게 붙드는 손아귀.', 'A grasp that holds a creature immobile.');
P('tazeem', 'spreading-seas', '번지는 바다', 'skill', 1, 'n', [['makeLand', 'island'], ['draw', 1]], {}, '뭍으로 번져 오는 바다.', 'The sea, spreading onto the land.');
P('tazeem', 'caller-of-gales', '돌풍을 부르는 자', 'skill', 0, 'n', [['piercing']], {}, '돌풍을 불러 생물을 날게 하는 인어 마도사.', 'A merfolk wizard who calls gusts to make creatures fly.');
P('tazeem', 'emeria-angel', '에메리아 천사', 'power', 2, 'n', [], { on: { land: [['hitrand', 4]] } }, '후광이 눈을 가린, 에메리아의 이름을 지닌 천사.', "An angel bearing Emeria's name, her halo low over her eyes.");
P('tazeem', 'grazing-gladehart', '풀 뜯는 숲사슴', 'power', 1, 'n', [], { on: { land: [['heal', 2]] } }, '숲속 빈터에서 풀을 뜯는 영양.', 'An antelope grazing in a glade.');
P('tazeem', 'iona-shield-of-emeria', '에메리아의 방패, 아이오나', 'power', 3, 'n', [], { passive: { noHex: true } }, '에메리아의 윗층으로 가는 길을 지키는 대천사.', "The archangel who guards the way to Emeria's upper levels.");
P('tazeem', 'merfolk-seastalkers', '인어 바다추적자들', 'skill', 1, 'e', [['ifAttack', [['block', 8]], [['draw', 2]]]], {}, '유망한 원정대를 지키는 정예 인어 정찰병들.', 'Elite merfolk scout-soldiers who guard promising expeditions.');
P('tazeem', 'merfolk-wayfinder', '인어 길잡이', 'skill', 1, 'n', [['scoutN', 3], ['block', 3]], {}, '하늘을 나는 인어 정찰병.', 'A flying merfolk scout.');
P('tazeem', 'noble-vestige', '고귀한 잔영', 'skill', 0, 'n', [['block', 2], ['draw', 1]], {}, '세상에 묶여 남을 지키는, 희망을 잃지 않은 영혼.', 'A hopeful protective spirit bound to the world.');
P('tazeem', 'shepherd-of-the-lost', '길 잃은 자들의 인도자', 'attack', 2, 'e', [['hit', 9], ['block', 6]], {}, '야생에서 쓰러진 이들에게 응답하는 천사.', 'An angel who answers those who fall in the wilds.');
P('tazeem', 'relic-crush', '유물 분쇄', 'attack', 2, 'n', [['unblockall'], ['hitall', 5]], {}, "부서지는 유물과 폐허. '예전엔 훨씬 많았지.'", "Relics and ruins being crushed: 'there used to be many more.'");
P('tazeem', 'shieldmates-blessing', '방패 동료의 축복', 'skill', 0, 'n', [['block', 3]], {}, '피해를 막아 주는 에메리아의 은총.', "A blessing of Emeria's grace that prevents harm.");
P('tazeem', 'vines-of-vastwood', '광활림의 덩굴', 'skill', 1, 'n', [['block', 4], ['bonus', 3]], {}, '생물을 감싸 지키는 광활림의 덩굴.', 'Protective vines of the Vastwood wrapping a creature.');
P('tazeem', 'archmage-ascension', '대마법사의 승천', 'power', 1, 'n', [], { quest: { on: 'skill', need: 4, then: { on: { turn: [['draw', 1]] } } } }, '인어의 문서고에서 소용돌이치는 룬.', 'Runes swirling in a merfolk archive.');
P('tazeem', 'sunspring-expedition', '태양샘 원정', 'power', 1, 'n', [], { quest: { on: 'land', need: 3, reward: [['heal', 8]] } }, '전설의 치유 샘 Sunspring 을 찾는 원정대.', 'An expedition seeking the legendary healing Sunspring.');
P('tazeem', 'rite-of-replication', '복제 의식', 'skill', 2, 'n', [['echo'], ['draw', 1]], {}, '생물을 베끼는 의식 주문.', 'A ritual spell that copies a creature.');
P('tazeem', 'windborne-charge', '바람을 탄 돌격', 'skill', 2, 'n', [['bonus', 3], ['piercing']], {}, '동료 둘을 하늘로 띄우는 하늘 여신의 축복.', "The sky goddess's blessing, lifting two allies into flight.");

// ---- Lands (20): found in their own continent; a place's land is always offered at that place ----
L('akoum', 'akoum-refuge', '아쿰 피난처', [['heal', 1], ['hitrand', 3]], '아쿰의 이빨 기슭의 피난처.', 'A refuge at the foot of the Teeth of Akoum.');
L('ondu', 'graypelt-refuge', '회색가죽 피난처', [['heal', 1], ['block', 3]], '온두의 정착지 회색가죽.', 'Graypelt, a settlement of Ondu.');
L('ondu', 'jwar-isle-refuge', '좌르 섬 피난처', [['heal', 1], ['draw', 1]], '바다뱀이 에워싼 좌르 섬.', 'Jwar Isle, ringed by sea serpents.');
L('murasa', 'kazandu-refuge', '카잔두 피난처', [['heal', 1], ['hitrand', 2], ['block', 2]], '자디 나무 아래 카잔두의 피난처.', 'A refuge under the jaddi trees of Kazandu.');
L('sejiri', 'sejiri-refuge', '세지리 피난처', [['heal', 3]], '얼어붙은 세지리의 피난처.', 'A refuge in frozen Sejiri.');
L('murasa', 'arid-mesa', null, FETCH(), 'Na Plateau 의 메마른 고원.', 'The dry tableland of the Na Plateau.');
L('ondu', 'marsh-flats', null, FETCH(), '아가딤의 축축한 평지.', 'The wet flats of Agadeem.');
L('bala-ged', 'misty-rainforest', null, FETCH(), 'Guum Wilds 의 안개 낀 우림.', 'The misty rainforest of the Guum Wilds.');
L('ondu', 'scalding-tarn', null, FETCH(), '용이 몸을 담그는 Boilbasin 의 끓는 웅덩이.', 'A steaming pool of Boilbasin, where dragons bathe.');
L('murasa', 'verdant-catacombs', null, FETCH(), '카잔두의 푸르게 덮인 지하묘지.', 'The overgrown catacombs of Kazandu.');
L('ondu', 'crypt-of-agadeem', '아가딤의 지하묘지', [['energy', 1]], "'죽음의 시간'에 열린다는, 함정으로 가득한 무덤.", "A trapped tomb said to open at the 'hour of death'.");
L('tazeem', 'emeria-the-sky-ruin', '하늘 유적 에메리아', [['fetchDiscard', 'ally'], ['heal', 1]], '타짐의 하늘에 뜬 헤드론 잔해, 하늘 유적.', "The Sky Ruin, hedron debris adrift in Tazeem's sky.");
L('tazeem', 'magosi-the-waterveil', '물의 장막 마고시', [['draw', 2]], '마고시 폭포의 물의 장막.', 'The water veil of Magosi Falls.');
L('tazeem', 'oran-rief-the-vastwood', '광활림 오란리프', [['bonus', 2], ['block', 2]], '자라는 암초 바위 위의 거대한 숲.', 'The huge forest on growing reef-rock.');
L('ondu', 'valakut-the-molten-pinnacle', null, [['hitrandPerLand', 2]], '고블린 벽화 위로 솟은 활화산.', 'An active volcano over goblin murals.');
L('ondu', 'kabira-crossroads', '카비라 갈림길', [['heal', 3]], '헤드론 벌판 곁 카비라의 갈림길.', 'The crossroads of Kabira, by the hedron fields.');
L('guul-draz', 'piranha-marsh', '피라냐 늪', [['hitall', 2]], '피라냐가 들끓는 하그라의 습지.', 'A piranha-infested marsh of Hagra.');
L('murasa', 'soaring-seacliff', '치솟은 바다절벽', [['piercing']], '무라사를 두른 깎아지른 바다 절벽.', 'The sheer sea cliffs that wall Murasa.');
L('ondu', 'teetering-peaks', '위태로운 봉우리', [['bonus', 2]], '금방이라도 무너질 듯한 온두의 봉우리.', 'Peaks of Ondu that look ready to fall.');
L('ondu', 'turntimber-grove', '변화림 숲', [['bonus', 1], ['block', 2]], '나선으로 치솟는 나무들의 숲.', 'A grove of trees that spiral upward.');

// The land each stop always offers (in its rewards, or in its market).
export const placeLand = {
  'oran-rief': 'oran-rief-the-vastwood', 'teeth-of-akoum': 'akoum-refuge', 'kazandu': 'kazandu-refuge',
  'hagra-swamp': 'piranha-marsh', 'turntimber': 'turntimber-grove', 'kabira': 'kabira-crossroads',
};
