// Authoring table for the game's ZEN enemies (all but the first 9, which are written by hand in
// src/enemies.ts): numbers written in place. tools/gen-content.mjs turns each number into a
// data/config.json value and writes src/enemies2.ts. The numbers here are the ones first written;
// data/config.json holds the values as they are now.
// E(continent, id, game's own Korean name or null when an official one exists, hp,
//   flags {fly, big, elite}, traits, moves, lore in Korean, lore in English)
// A move: [kind, fields, name in Korean, name in English].
export const enemies = [];
const E = (cont, id, ko, hp, flags, traits, moves, lk, le) => enemies.push({ cont, id, ko, hp, flags: flags || {}, traits: traits || {}, moves, lore: { ko: lk, en: le } });
const A = (d, o, ko, en) => ['atk', Object.assign({ d }, o || {}), ko, en];
const B = (o, ko, en) => ['buff', o, ko, en];
const H = (o, ko, en) => ['hex', o, ko, en];
const I = (ko, en) => ['idle', {}, ko, en];
const HIDE = (ko, en) => ['hide', {}, ko, en];
const S = (kind, ko, en) => ['summon', { kind }, ko, en];
const BIG = { big: 1, elite: 1 };

// ---- Tazeem ----
E('tazeem', 'timbermaw-larva', '목재턱 유충', 13, {}, {}, [A(3, 0, '물기', 'Bite'), B({ str: 2 }, '파고들기', 'Burrow in'), A(3, 0, '물기', 'Bite')], '속 빈 떠 있는 나무에서 튀어나와 먹이를 덮치는 목재턱의 유충.', 'The larva of the timbermaw, which bursts from hollow floating trees at its prey.');
E('tazeem', 'river-boa', '강 보아뱀', 22, {}, { regen: 3 }, [A(6, 0, '물기', 'Bite'), A(4, { web: 1 }, '조이기', 'Constrict')], '물이 스미지 않는 가죽으로 값진, 물에 사는 커다란 보아뱀.', 'A large water-dwelling boa, prized for its waterproof hide.');
E('tazeem', 'sky-ruin-drake', '하늘 유적 드레이크', 28, { fly: 1 }, {}, [A(7, 0, '내리덮치기', 'Swoop'), B({ blk: 8 }, '날아오르기', 'Soar'), A(7, 0, '내리덮치기', 'Swoop')], '하늘 유적에 사는 두 발 달린 푸른 드레이크.', 'A two-legged blue drake of the Sky Ruin.');
E('tazeem', 'living-tsunami', '살아 있는 해일', 28, {}, {}, [A(9, 0, '덮치기', 'Crash'), H({ lock: 1, blk: 5 }, '물러나는 물', 'Undertow'), A(9, 0, '덮치기', 'Crash')], '밀물 때 모든 것을 삼키는 해일의 정령.', 'A living tidal-wave elemental that devours at high tide.');
E('tazeem', 'vastwood-gorger', null, 36, {}, {}, [A(12, 0, '통째로 삼키기', 'Swallow whole'), I('소화', 'Digesting')], '곤충 같은 눈으로 먹이를 통째로 삼키는 광활림의 웜.', 'A wurm of the Vastwood with insect-like eyes that swallows its prey whole.');

// ---- Akoum ----
E('akoum', 'bladetusk-boar', null, 22, {}, {}, [A(6, { pierce: 1 }, '엄니 돌진', 'Tusk rush'), B({ str: 2 }, '콧김', 'Snort'), A(6, { pierce: 1 }, '엄니 돌진', 'Tusk rush')], '칼날 같은 엄니로 겁을 주는 멧돼지.', 'A boar that intimidates with blade-like tusks.');
E('akoum', 'goblin-ruinblaster', '고블린 폐허폭파꾼', 14, {}, {}, [A(5, 0, '폭파', 'Blast'), H({ lock: 1 }, '땅 무너뜨리기', 'Ruin the ground'), A(5, 0, '폭파', 'Blast')], '땅을 날려 버리는 성급한 고블린 주술사.', 'A hasty goblin shaman who blasts lands apart.');
E('akoum', 'hedron-scrabbler', '다면체 기는 것', 14, {}, { territory: 1 }, [A(4, 0, '긁기', 'Scrape'), A(4, 0, '긁기', 'Scrape'), B({ blk: 6 }, '굳히기', 'Harden')], '엘드라지 시대의 폐허를 지키는, 다면체 돌조각으로 된 기계.', 'A construct of hedron-shaped stone fragments that guards Eldrazi-era ruins.');
E('akoum', 'molten-ravager', '용융 파괴자', 28, {}, {}, [B({ str: 3 }, '불 지피기', 'Stoke'), A(4, 0, '분출', 'Eruption'), A(4, 0, '분출', 'Eruption')], '날뛰는 바위와 살아 있는 불의 정령.', 'An elemental of raging rock and living fire.');
E('akoum', 'plated-geopede', '장갑 지네', 18, {}, { armor: 4, territory: 1 }, [A(5, 0, '물기', 'Bite'), A(5, 0, '물기', 'Bite'), HIDE('땅속으로', 'Burrow')], '굴에서 솟아나오는 장갑 두른 땅벌레.', 'An armored burrowing insect emerging from its burrow.');
E('akoum', 'scute-mob', '딱정벌레 떼', 22, {}, { swarm: 2 }, [A(2, { hits: 2 }, '떼 지어 물기', 'Swarm')], '껍질 두꺼운 딱정벌레 떼.', 'A swarm of thick-shelled scute bugs.');

// ---- Guul Draz ----
E('guul-draz', 'mindless-null', '넋 없는 눌', 9, {}, {}, [A(3, 0, '할퀴기', 'Claw'), I('비척거림', 'Shamble'), A(3, 0, '할퀴기', 'Claw')], '흡혈귀에게 빨려 얼굴을 잃고 산 자를 쫓는 언데드 노예.', "A null: a faceless undead thrall made by a vampire's draining, hunting the living.");
E('guul-draz', 'vampire-lacerator', '흡혈귀 난도질꾼', 24, {}, {}, [A(8, { self: 2 }, '난도질', 'Lacerate')], '사냥 전마다 제 몸을 베는 Nirkana 암살 전사.', 'A Nirkana assassin-warrior who cuts himself before each hunt.');
E('guul-draz', 'blood-seeker', null, 14, {}, {}, [H({ curse: 2 }, '피의 주술', 'Blood hex'), A(5, 0, '찌르기', 'Stab'), A(5, 0, '찌르기', 'Stab')], '피 한 방울로 상대를 쫓는 흡혈귀 주술사.', 'A vampire shaman who can track you by one drop of blood.');
E('guul-draz', 'guul-draz-vampire', '굴 드라즈 흡혈귀', 16, {}, { bloodthirst: 3 }, [A(5, { steal: 1 }, '물기', 'Bite'), A(6, 0, '베기', 'Slash')], '피 냄새로 먹이를 쫓는 흡혈귀 도적.', 'A vampire rogue who tracks prey by bloodscent.');
E('guul-draz', 'gatekeeper-of-malakir', '말라키르의 문지기', 26, {}, {}, [A(4, { rob: 10 }, '통행세', 'Toll'), A(8, 0, '창 찌르기', 'Spear'), B({ blk: 8 }, '문 지키기', 'Guard the gate')], '들어가려는 자에게 통행세를 받는 흡혈귀 문지기.', 'A vampire gatekeeper who takes the toll to enter.');
E('guul-draz', 'vampire-hexmage', '흡혈귀 주술마도사', 16, {}, {}, [A(6, 0, '선제공격', 'First strike'), H({ unquest: 1, blk: 6 }, '표식 지우기', 'Unmake'), A(6, 0, '선제공격', 'First strike')], '저주 마법으로 피보다 더한 것을 빨아들이는 흡혈귀.', 'A vampire hexmage who drains more than blood.');
E('guul-draz', 'crypt-ripper', '지하묘지 찢는 자', 14, {}, {}, [A(5, 0, '찢기', 'Rip'), B({ str: 2 }, '어둠 부풀리기', 'Swell with dark'), A(5, 0, '찢기', 'Rip')], '산 자의 숨을 끊는 살인자의 그림자 혼령.', 'A shade, the shadow spirit of a murderer, that snuffs out the living.');
E('guul-draz', 'vampire-nighthawk', null, 20, { fly: 1 }, {}, [A(6, { steal: 1, burn: 1 }, '밤의 급강하', 'Night dive'), B({ blk: 5 }, '맴돌기', 'Circle'), A(6, { steal: 1, burn: 1 }, '밤의 급강하', 'Night dive')], '말라키르의 하늘을 나는 흡혈귀 주술사.', 'A flying vampire shaman over Malakir.');
E('guul-draz', 'malakir-bloodwitch', '말라키르 혈마녀', 30, { fly: 1 }, {}, [A(4, { pierce: 1, steal: 1 }, '피의 의식', 'Blood rite'), A(8, 0, '발톱', 'Talon'), A(8, 0, '발톱', 'Talon')], "하늘을 나는 말라키르의 흡혈귀 주술사, '혈마녀'.", "A flying vampire shaman, a 'bloodwitch' of Malakir.");
E('guul-draz', 'bloodghast', '피의 망령', 10, {}, { revive: 1 }, [A(4, 0, '할퀴기', 'Rake')], '늪의 기억에 매달리는, 쓰러진 흡혈귀의 성난 혼.', 'The angry spirit of a fallen vampire, clinging to marsh memories.');
E('guul-draz', 'bog-tatters', '늪의 누더기', 20, {}, {}, [HIDE('떠돌기', 'Drift'), A(8, { pierce: 1 }, '울부짖음', 'Wail')], '살해당한 이의 괴로운 넋, 늪을 걷는 망령.', 'A swamp-walking wraith, the tormented soul of the murdered.');
E('guul-draz', 'geyser-glider', '간헐천 활공수', 26, { fly: 1 }, {}, [A(7, { burn: 1 }, '데우기', 'Scald'), B({ blk: 6 }, '활공', 'Glide'), A(7, { burn: 1 }, '데우기', 'Scald')], '펠라카의 날개 달린 불 짐승.', 'A winged fire beast of Pelakka.');
E('guul-draz', 'giant-scorpion', null, 11, {}, {}, [A(3, { burn: 2 }, '독침', 'Sting'), B({ blk: 6 }, '집게 세우기', 'Raise pincers'), A(3, { burn: 2 }, '독침', 'Sting')], '집게 하나로 흡혈귀를 붙들 만큼 큰 전갈.', 'A scorpion big enough to hold a vampire in one claw.');
E('guul-draz', 'guul-draz-specter', '굴 드라즈 유령기수', 26, { fly: 1 }, {}, [A(5, { jam: 1 }, '습격', 'Raid'), A(5, { jam: 1 }, '습격', 'Raid'), B({ str: 2 }, '비명', 'Shriek')], '사악한 탈것을 탄, 두건 쓴 언데드 기수.', 'A hooded undead specter flying on an evil mount.');
E('guul-draz', 'hagra-crocodile', '하그라 악어', 30, {}, { territory: 1 }, [A(9, 0, '덥석 물기', 'Snap'), I('숨어 기다림', 'Lurk'), A(9, 0, '덥석 물기', 'Snap')], '고블린이든 배든 삼키는 거대한 악어.', 'An enormous crocodile that eats goblins or boats alike.');
E('guul-draz', 'halo-hunter', '후광 사냥꾼', 50, BIG, {}, [A(9, { pierce: 1 }, '베어 거두기', 'Reap'), H({ eat: 1, str: 2 }, '후광 빼앗기', 'Claim a halo'), A(9, { pierce: 1 }, '베어 거두기', 'Reap')], '쓰러뜨린 천사의 후광을 굴에 걸어 두는 악마.', 'An angel-killing demon who hangs fallen halos in his lair.');
E('guul-draz', 'kalitas-bloodchief-of-ghet', '게트의 혈족장, 칼리타스', 54, BIG, {}, [A(8, { steal: 1 }, '피 빨기', 'Drain'), S('mindless-null', '노예 일으키기', 'Raise a thrall'), A(11, 0, '혈족장의 칼', 'Bloodchief blade')], '다섯 흡혈귀 대가문 가운데 게트 가문의 혈족장.', 'The bloodchief of House Ghet, one of the five great vampire houses.');
E('guul-draz', 'ob-nixilis-the-fallen', '타락한 자, 오브 닉실리스', 60, BIG, { landhurt: 3, territory: 1 }, [A(9, 0, '내리치기', 'Smite'), B({ blk: 8 }, '벼르기', 'Brood'), A(9, 0, '내리치기', 'Smite')], '불꽃을 잃고 악마가 되어 젠디카르에 갇힌 옛 플레인즈워커.', 'A sparkless former planeswalker turned demon, trapped on Zendikar and plotting revenge.');

// ---- Murasa ----
E('murasa', 'ruinous-minotaur', '파멸의 미노타우로스', 20, {}, {}, [A(10, { mill: 2 }, '내리찍기', 'Smash'), I('숨 고르기', 'Catch its breath'), A(10, { mill: 2 }, '내리찍기', 'Smash')], '말 없는 포식자로 사는 사나운 미노타우로스.', 'A feral minotaur living as a wordless predator.');
E('murasa', 'shatterskull-giant', '해골분쇄 거인', 32, {}, {}, [A(5, { rob: 12 }, '통행세', 'Toll'), A(10, 0, '몽둥이', 'Club'), A(10, 0, '몽둥이', 'Club')], "지나는 이에게 '통행세'를 뜯는 해골분쇄 부족의 거인 도적.", "A giant bandit of the Shatterskull tribe who extorts 'tolls' from travelers.");
E('murasa', 'lorthos-the-tidemaker', '조수를 만드는 자, 로르토스', 60, BIG, {}, [H({ web: 1, jam: 1, blk: 8 }, '조수의 손아귀', 'Tidal grasp'), A(13, 0, '으깨기', 'Crush'), A(13, 0, '으깨기', 'Crush')], '조수를 움직이는 깊은 바다의 거대한 문어.', 'A colossal tide-shifting octopus of the deep.');
E('murasa', 'obsidian-fireheart', '흑요석 불심장', 52, BIG, { landburn: 2 }, [H({ curse: 3 }, '불 지르기', 'Set ablaze'), A(9, 0, '불주먹', 'Fire fist'), A(9, 0, '불주먹', 'Fire fist')], '땅에 불을 지르는 흑요석 정령.', 'An obsidian elemental that sets the land aflame.');

// ---- Ondu (the Shoal Serpent lives in the Silundi Sea, off Ondu) ----
E('ondu', 'baloth-woodcrasher', '나무부수는 발로스', 32, {}, { territory: 2 }, [A(8, 0, '들이받기', 'Crash'), B({ blk: 6 }, '나무 타기', 'Leap away'), A(8, 0, '들이받기', 'Crash')], '큰 발톱으로 나선 나무를 움켜쥐고 나무에서 나무로 뛰는 발로스.', 'A baloth leaping tree to tree, clutching spiral trunks with great claws.');
E('ondu', 'turntimber-basilisk', '변화림 바실리스크', 22, {}, {}, [H({ web: 1 }, '석화의 눈길', 'Petrifying gaze'), A(4, { burn: 3 }, '독니', 'Venom bite'), A(4, { burn: 3 }, '독니', 'Venom bite')], '눈길로 돌을 만드는, 뿔 달린 여섯 다리 바실리스크.', 'A six-legged horned basilisk whose gaze petrifies.');
E('ondu', 'rampaging-baloths', '날뛰는 발로스 떼', 58, BIG, { territory: 2 }, [A(7, { hits: 2 }, '우르르 짓밟기', 'Stampede'), B({ blk: 8, str: 1 }, '울부짖음', 'Bellow'), A(7, { hits: 2 }, '우르르 짓밟기', 'Stampede')], '뿔과 가시를 지닌 잡식 사냥꾼, 날뛰는 발로스 무리.', 'A rampaging herd of baloths: horned, spiked omnivorous hunters.');
E('ondu', 'goblin-bushwhacker', '고블린 매복병', 10, {}, {}, [B({ str: 1, all: 1 }, '함성', 'War cry'), A(4, 0, '몽둥이', 'Club'), A(4, 0, '몽둥이', 'Club')], '아군을 몰아쳐 돌격시키는 고블린 매복 전사.', 'A goblin ambusher who spurs allies into a rush.');
E('ondu', 'warren-instigator', '소굴 선동가', 18, {}, {}, [A(3, { hits: 2 }, '이단 공격', 'Double strike'), S('goblin-bushwhacker', '소굴 부르기', 'Call the warren'), A(3, { hits: 2 }, '이단 공격', 'Double strike')], '소굴 동료들을 싸움터로 불러내는 고블린 광전사.', 'A goblin berserker who shouts his warren-mates out to fight.');
E('ondu', 'gomazoa', '고마조아', 24, { fly: 1 }, {}, [H({ jam: 1 }, '휘감기', 'Engulf'), A(5, 0, '촉수 쏘기', 'Sting'), B({ blk: 7 }, '떠다니기', 'Drift')], '늘어뜨린 촉수로 먹이를 붙드는, 돌껍데기의 하늘 해파리.', 'A flying stone-shelled jellyfish that seizes prey with dangling tentacles.');
E('ondu', 'windrider-eel', '바람타는 뱀장어', 22, { fly: 1 }, { territory: 1 }, [A(6, 0, '꼬리 치기', 'Tail lash'), A(6, 0, '꼬리 치기', 'Tail lash'), B({ blk: 6 }, '솟구치기', 'Soar')], '탁류의 바람을 타는, 2톤짜리 가죽질 하늘 뱀장어.', 'A two-ton leathery flying eel that rides the Roil winds.');
E('ondu', 'world-queller', '세계의 진압자', 56, BIG, {}, [H({ eat: 1, blk: 6 }, '진압', 'Quell'), A(10, 0, '심판', 'Judgment'), A(10, 0, '심판', 'Judgment')], '채굴 전초기지를 부숴 수백을 죽인 성난 화신.', 'An enraged avatar that wrecked a mining outpost, killing hundreds.');
E('ondu', 'shoal-serpent', '여울 바다뱀', 36, {}, { sleeper: 1 }, [B({ blk: 8 }, '또아리', 'Coil'), A(13, 0, '들이받기', 'Ram')], "배를 부수는 거대한 바다뱀, '배 위로 올라앉는 암초'.", "A giant ship-wrecking serpent, 'a reef that runs aground on ships'.");
E('ondu', 'hedron-crab', '다면체 게', 14, {}, { landmill: 2 }, [A(4, 0, '집게질', 'Pinch'), B({ blk: 7 }, '껍데기 속으로', 'Into its shell'), A(4, 0, '집게질', 'Pinch')], '정신을 흐리는 작은 헤드론으로 껍데기를 꾸미는 바닷가 게.', 'A shore crab that decorates its shell with small mind-bending hedrons.');
E('ondu', 'sphinx-of-jwar-isle', '좌르 섬의 스핑크스', 54, { big: 1, elite: 1, fly: 1 }, { shroud: 1 }, [H({ jam: 2 }, '수수께끼', 'Riddle'), A(10, 0, '발톱', 'Talon'), A(10, 0, '발톱', 'Talon')], '지식을 쌓아 두는 좌르 섬의 스핑크스.', 'The knowledge-hoarding sphinx of Jwar Isle.');

// ---- Bala Ged ----
E('bala-ged', 'mold-shambler', '곰팡이 걸음꾼', 30, {}, {}, [A(8, 0, '내리치기', 'Slam'), H({ jam: 1 }, '포자 구름', 'Spore cloud'), A(8, 0, '내리치기', 'Slam')], '곰팡이와 버섯에 뒤덮인 짐승. 자연이 되찾아 오는 중이다.', 'A beast overgrown with mold and fungi: nature encroaching back.');

// Who can be met where. wild: groups, one of them a run (the first is the place's own, met when
// it is a run's first fight); elite: great beasts; guard: a town or camp that may be watched.
export const roster = {
  'oran-rief': { wild: [['oran-rief-recluse'], ['timbermaw-larva', 'timbermaw-larva'], ['river-boa'], ['sky-ruin-drake'], ['living-tsunami'], ['vastwood-gorger']] },
  'tal-terig': { wild: [['hellfire-mongrel'], ['bladetusk-boar'], ['goblin-ruinblaster', 'goblin-ruinblaster'], ['hedron-scrabbler', 'hedron-scrabbler'], ['molten-ravager'], ['plated-geopede'], ['scute-mob']] },
  'teeth-of-akoum': { elite: ['hellkite-charger'] },
  'hagra-swamp': {
    wild: [['heartstabber-mosquito', 'heartstabber-mosquito'], ['mindless-null', 'mindless-null', 'mindless-null'], ['vampire-lacerator'], ['blood-seeker', 'guul-draz-vampire'],
      ['gatekeeper-of-malakir'], ['vampire-hexmage', 'crypt-ripper'], ['vampire-nighthawk'], ['malakir-bloodwitch'], ['bloodghast', 'bloodghast'], ['bog-tatters'],
      ['geyser-glider'], ['giant-scorpion', 'giant-scorpion'], ['guul-draz-specter'], ['hagra-crocodile']],
    elite: ['halo-hunter', 'kalitas-bloodchief-of-ghet', 'ob-nixilis-the-fallen'],
  },
  'tangled-vales': { wild: [['surrakar-marauder'], ['mold-shambler']] },
  'kazandu': { wild: [['territorial-baloth'], ['ruinous-minotaur'], ['shatterskull-giant']] },
  'sunder-bay': { elite: ['terra-stomper', 'lorthos-the-tidemaker', 'obsidian-fireheart'] },
  'turntimber': { wild: [['scythe-tiger'], ['baloth-woodcrasher'], ['turntimber-basilisk']], elite: ['rampaging-baloths'] },
  'makindi-trenches': { guard: true, wild: [['goblin-bushwhacker', 'warren-instigator'], ['gomazoa'], ['windrider-eel']], elite: ['world-queller'] },
  'kabira': { guard: true, bg: 'sea', wild: [['shoal-serpent'], ['hedron-crab', 'hedron-crab']], elite: ['sphinx-of-jwar-isle'] },
};
