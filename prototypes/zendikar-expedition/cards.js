// PROTOTYPE - NOT FOR PRODUCTION
// Question: 세계 지도에서 갈 곳을 고르는 것이 곧 덱을 짓는 일이 될 때, 젠디카르를 여행하는 느낌과 덱빌더의 재미가 한 판 안에서 함께 살아나는가?
// Date: 2026-11-10
// The cards. Names, numbers in the set, rarity and the place each belongs to come from the
// zendikar-map project's saga 1 phase 1 data (lore-data.js). What a card does here is this
// game's own design, written to fit what the card shows; it is not the card's printed rules.
// `ko` is this game's own Korean name, used only where no official Korean name was printed.
// The five basic lands are not in the map project's data; their Korean names are the printed ones.
'use strict';

const CARDS = {
  // ---- The expedition's starting kit ----
  'trusty-machete': {
    art: 'machete', type: 'attack', cost: 1, target: 'enemy', ko: '믿음직한 마체테',
    text: { ko: '피해 {d}.', en: 'Deal {d} damage.' }, v: { d: 'machete_dmg' }, face: [['atk', 'machete_dmg']],
    play(b, ti) { Q.hit(ti, tune.machete_dmg); },
    lore: { ko: '탐험가의 필수품인 정글도. 타주루 엘프가 날을 갈았다고 한다.', en: "An explorer's necessity. They say Tajuru elves honed its edge." },
  },
  'bold-defense': {
    art: 'shields', type: 'skill', cost: 1, target: 'none', ko: '대담한 방어',
    text: { ko: '방어 {b}.', en: 'Gain {b} block.' }, v: { b: 'defense_blk' }, face: [['blk', 'defense_blk']],
    play(b) { Q.block(tune.defense_blk); },
    lore: { ko: '함께 버티는 방어.', en: 'A defense of standing together.' },
  },
  'adventuring-gear': {
    art: 'pack', type: 'power', cost: 1, target: 'none', ko: '모험 장비', kw: ['power', 'landfall'],
    text: { ko: '지속. 대지를 낼 때마다 방어 {b}.', en: 'Lasting. Whenever you play a land, gain {b} block.' },
    v: { b: 'gear_blk' }, face: [['lf'], ['blk', 'gear_blk']],
    play(b) { Q.power('adventuring-gear'); },
    onLand(b) { Q.block(tune.gear_blk); },
    lore: { ko: '탐험가의 기본 장비 — 배낭, 연장 띠, 물주머니.', en: "An explorer's basic kit: pack, tool belt, waterskin." },
  },

  // ---- Lands: one for each continent you set foot on ----
  'island': {
    art: 'island', type: 'land', cost: 0, target: 'none', en: 'Island', ko: '섬', koOfficial: true, kw: ['land'],
    text: { ko: '대지. 카드 {n}장을 뽑는다.', en: 'Land. Draw {n} card.' }, v: { n: 'island_draw' }, face: [['draw', 'island_draw']],
    play(b) { Q.draw(tune.island_draw); },
    lore: { ko: '타짐의 땅.', en: 'The land of Tazeem.' },
  },
  'mountain': {
    art: 'mountain', type: 'land', cost: 0, target: 'none', en: 'Mountain', ko: '산', koOfficial: true, kw: ['land'],
    text: { ko: '대지. 무작위 적에게 피해 {d}.', en: 'Land. Deal {d} damage to a random enemy.' }, v: { d: 'mountain_dmg' }, face: [['atk', 'mountain_dmg']],
    play(b) { Q.hitRandom(tune.mountain_dmg); },
    lore: { ko: '아쿰의 땅.', en: 'The land of Akoum.' },
  },
  'swamp': {
    art: 'swamp', type: 'land', cost: 0, target: 'none', en: 'Swamp', ko: '늪', koOfficial: true, kw: ['land'],
    text: { ko: '대지. 무작위 적에게 피해 {d}, 체력 {h} 회복.', en: 'Land. Deal {d} damage to a random enemy and heal {h}.' },
    v: { d: 'swamp_dmg', h: 'swamp_heal' }, face: [['atk', 'swamp_dmg'], ['heal', 'swamp_heal']],
    play(b) { Q.hitRandom(tune.swamp_dmg); Q.heal(tune.swamp_heal); },
    lore: { ko: '굴 드라즈의 땅.', en: 'The land of Guul Draz.' },
  },
  'forest': {
    art: 'forest', type: 'land', cost: 0, target: 'none', en: 'Forest', ko: '숲', koOfficial: true, kw: ['land'],
    text: { ko: '대지. 방어 {b}.', en: 'Land. Gain {b} block.' }, v: { b: 'forest_blk' }, face: [['blk', 'forest_blk']],
    play(b) { Q.block(tune.forest_blk); },
    lore: { ko: '무라사와 발라 게드의 땅.', en: 'The land of Murasa and Bala Ged.' },
  },
  'plains': {
    art: 'plains', type: 'land', cost: 0, target: 'none', en: 'Plains', ko: '들', koOfficial: true, kw: ['land'],
    text: { ko: '대지. 체력 {h} 회복.', en: 'Land. Heal {h}.' }, v: { h: 'plains_heal' }, face: [['heal', 'plains_heal']],
    play(b) { Q.heal(tune.plains_heal); },
    lore: { ko: '온두와 세지리의 땅.', en: 'The land of Ondu and Sejiri.' },
  },

  // ---- Tazeem ----
  'explorers-scope': {
    art: 'scope', type: 'power', cost: 1, target: 'none', ko: '탐험가의 망원경', kw: ['power'],
    text: { ko: '지속. 턴을 시작할 때 뽑을 더미 맨 위가 대지면 손으로 가져온다.', en: 'Lasting. At the start of your turn, if the top card of your draw pile is a land, take it.' },
    face: [['eye'], ['land']],
    play(b) { Q.power('explorers-scope'); },
    onTurn(b) { Q.scout(); },
    lore: { ko: '바다 관문에서 렌즈를 간 탐험가의 망원경.', en: "An explorer's spyglass, its lenses ground in Sea Gate." },
  },
  'harrow': {
    art: 'harrow', type: 'skill', cost: 1, target: 'none', ko: '갈아엎기',
    text: { ko: '뽑을 더미에서 대지 1장을 손으로. 이번 턴 대지를 1장 더 낼 수 있다.', en: 'Take a land from your draw pile. You may play one more land this turn.' },
    face: [['land', '+1']],
    play(b) { Q.fetchLand(); Q.extraLand(1); },
    lore: { ko: '탁류가 지나가며 땅을 다시 빚는다. 헤드론만 그대로 남는다.', en: 'The Roil passes and reshapes the land. Only the hedrons stay as they were.' },
  },
  'welkin-tern': {
    art: 'tern', type: 'attack', cost: 1, target: 'enemy',
    text: { ko: '피해 {d}. 방어를 무시한다.', en: 'Deal {d} damage, ignoring block.' }, v: { d: 'tern_dmg' }, face: [['atk', 'tern_dmg'], ['prc']],
    play(b, ti) { Q.hit(ti, tune.tern_dmg, { pierce: true }); },
    lore: { ko: '하늘에 뜬 헤드론에 둥지를 트는 제비갈매기.', en: 'A tern that nests on hedrons floating in the sky.' },
  },
  'spell-pierce': {
    art: 'pierce', type: 'skill', cost: 1, target: 'enemy',
    text: { ko: '대상의 의도가 공격이 아니면 그 의도를 무효로 한다.', en: "If the target's intent is not an attack, cancel it." },
    face: [['x']],
    can(b, ti) { const e = b.enemies[ti]; if (!e) return null; if (trait(e, 'uncounterable')) return 'no_effect'; return intentIsAttack(e) || e.cancelled ? 'no_effect' : null; },
    play(b, ti) { Q.cancel(ti); },
    lore: { ko: "타짐의 소강마도사 노얀 다르: '네 계획엔 구멍이 있어.'", en: "Noyan Dar, Tazeem lullmage: 'There's a hole in your plan.'" },
  },

  // ---- Sejiri ----
  'brave-the-elements': {
    art: 'brave', type: 'skill', cost: 1, target: 'none',
    text: { ko: '방어 {b}. 내 화상과 거미줄을 없앤다.', en: 'Gain {b} block. Remove your burn and webbing.' }, v: { b: 'brave_blk' }, face: [['blk', 'brave_blk']],
    play(b) { Q.block(tune.brave_blk); Q.cleanse(); },
    lore: { ko: '세지리의 혹한을 무릅쓰는 원정대.', en: "An expedition braving Sejiri's bitter cold." },
  },
  'kor-cartographer': {
    art: 'map', type: 'skill', cost: 1, target: 'none', ko: '코르 지도 제작자',
    text: { ko: '방어 {b}. 뽑을 더미에서 대지 1장을 손으로.', en: 'Gain {b} block. Take a land from your draw pile.' }, v: { b: 'carto_blk' }, face: [['blk', 'carto_blk'], ['land']],
    play(b) { Q.block(tune.carto_blk); Q.fetchLand(); },
    lore: { ko: '잊힌 고향으로 돌아가며 지도를 그리는 코르 정찰병.', en: 'A kor scout drawing maps on the way back to forgotten homelands.' },
  },

  // ---- Akoum ----
  'burst-lightning': {
    art: 'bolt', type: 'attack', cost: 1, target: 'enemy', ko: '터지는 번개',
    text: { ko: '피해 {d}.', en: 'Deal {d} damage.' }, v: { d: 'burst_dmg' }, face: [['atk', 'burst_dmg']],
    play(b, ti) { Q.hit(ti, tune.burst_dmg); },
    lore: { ko: '아쿰의 봉우리에 내리꽂히는 번개.', en: 'Lightning striking a peak in Akoum.' },
  },
  'arrow-volley-trap': {
    art: 'arrows', type: 'attack', cost: 2, target: 'enemy', ko: '화살 세례 함정', kw: ['trap'],
    text: { ko: '함정 — 대상이 공격하려 하면 비용 0. 피해 {d}.', en: 'Trap: costs 0 if the target intends to attack. Deal {d} damage.' },
    v: { d: 'arrow_dmg' }, face: [['atk', 'arrow_dmg']],
    trap(b, ti) { const e = b.enemies[ti]; return !!e && intentIsAttack(e); },
    play(b, ti) { Q.hit(ti, tune.arrow_dmg); },
    lore: { ko: '달갑지 않은 모험가에게 화살을 퍼붓는 함정.', en: 'A trap that looses arrows on unwelcome adventurers.' },
  },
  'inferno-trap': {
    art: 'firetrap', type: 'attack', cost: 2, target: 'enemy', ko: '불지옥 함정', kw: ['trap'],
    text: { ko: '함정 — 지난 적 턴에 체력을 잃었으면 비용 0. 피해 {d}.', en: "Trap: costs 0 if you lost HP on the enemy's last turn. Deal {d} damage." },
    v: { d: 'inferno_dmg' }, face: [['atk', 'inferno_dmg']],
    trap(b) { return b.hurtLast; },
    play(b, ti) { Q.hit(ti, tune.inferno_dmg); },
    lore: { ko: "'뭐 타는 냄새 안 나?'", en: "'Do you smell something burning?'" },
  },
  'goblin-guide': {
    art: 'goblin', type: 'attack', cost: 0, target: 'enemy', ko: '고블린 안내인',
    text: { ko: '피해 {d}.', en: 'Deal {d} damage.' }, v: { d: 'guide_dmg' }, face: [['atk', 'guide_dmg']],
    play(b, ti) { Q.hit(ti, tune.guide_dmg); },
    lore: { ko: "'이 세상 안 가 본 데가 없지. 몇 군데는 기억도 나.'", en: "'I've been all over this world. I even remember some of those places.'" },
  },
  'lotus-cobra': {
    art: 'cobra', type: 'power', cost: 1, target: 'none', kw: ['power', 'landfall'],
    text: { ko: '지속. 대지를 낼 때마다 에너지 +{n}.', en: 'Lasting. Whenever you play a land, gain {n} energy.' }, v: { n: 'cobra_energy' }, face: [['lf'], ['nrg', 'cobra_energy']],
    play(b) { Q.power('lotus-cobra'); },
    onLand(b) { Q.energy(tune.cobra_energy); },
    lore: { ko: '비늘에 수천 송이 연꽃의 정수가 담겨 있다는 코브라.', en: 'A cobra whose scales hold the essence of thousands of lotus blooms.' },
  },

  // ---- Guul Draz ----
  'vampires-bite': {
    art: 'fangs', type: 'attack', cost: 1, target: 'enemy', ko: '흡혈귀의 물기',
    text: { ko: '피해 {d}. 체력 {h} 회복.', en: 'Deal {d} damage. Heal {h}.' }, v: { d: 'bite_dmg', h: 'bite_heal' }, face: [['atk', 'bite_dmg'], ['heal', 'bite_heal']],
    play(b, ti) { Q.hit(ti, tune.bite_dmg); Q.heal(tune.bite_heal); },
    lore: { ko: '흡혈귀의 물기.', en: "A vampire's bite." },
  },
  'blazing-torch': {
    art: 'torch', type: 'attack', cost: 1, target: 'enemy',
    text: { ko: '피해 {d}. 대상에게 화상 {n}.', en: 'Deal {d} damage. Burn the target for {n}.' }, v: { d: 'torch_dmg', n: 'torch_burn' }, face: [['atk', 'torch_dmg'], ['burn', 'torch_burn']],
    play(b, ti) { Q.hit(ti, tune.torch_dmg); Q.burnEnemy(ti, tune.torch_burn); },
    lore: { ko: '흡혈귀와 좀비를 물리치는 횃불.', en: 'A torch that wards off vampires and zombies.' },
  },
  'pitfall-trap': {
    art: 'pit', type: 'attack', cost: 2, target: 'enemy', ko: '구덩이 함정', kw: ['trap'],
    text: { ko: '함정 — 공격하려는 적이 대상 하나뿐이면 비용 0. 피해 {d}.', en: 'Trap: costs 0 if the target is the only enemy that intends to attack. Deal {d} damage.' },
    v: { d: 'pitfall_dmg' }, face: [['atk', 'pitfall_dmg']],
    trap(b, ti) {
      const e = b.enemies[ti]; if (!e || !intentIsAttack(e)) return false;
      return b.enemies.filter(x => x.hp > 0 && x.away <= 0 && intentIsAttack(x)).length === 1;
    },
    play(b, ti) { Q.hit(ti, tune.pitfall_dmg); },
    lore: { ko: "가시마다 독을 발랐다 — '함정 제작자 나름의 자비'.", en: "Every spike is poisoned: 'the trapmaker's idea of mercy.'" },
  },
  'nimana-sell-sword': {
    art: 'sellsword', ally: true, type: 'attack', cost: 1, target: 'enemy', ko: '니마나 용병',
    text: { ko: '금화 {g} 지불. 피해 {d}.', en: 'Pay {g} gold. Deal {d} damage.' }, v: { d: 'sellsword_dmg', g: 'sellsword_fee' }, face: [['atk', 'sellsword_dmg'], ['gold', '-', 'sellsword_fee']],
    can(b) { return state.run.gold < tune.sellsword_fee ? 'no_gold' : null; },
    pay(b) { Q.gold(-tune.sellsword_fee); },
    play(b, ti) { Q.hit(ti, tune.sellsword_dmg); },
    lore: { ko: '니마나의 자유도시의 용병 Khalish. 돈을 받는 동안은 충실하다.', en: 'Khalish, a sell-sword of the Free City of Nimana. Loyal while paid.' },
  },

  // ---- Bala Ged ----
  'primal-bellow': {
    art: 'bellow', type: 'attack', cost: 1, target: 'enemy', ko: '원초의 포효', kw: ['landfall'],
    text: { ko: '피해 {d}. 상륙: 대신 피해 {D}.', en: 'Deal {d} damage. Landfall: deal {D} instead.' }, v: { d: 'bellow_dmg', D: 'bellow_lf' }, face: [['atk', 'bellow_dmg'], ['lfv', 'bellow_lf']],
    play(b, ti, c) { Q.hit(ti, c.lf ? tune.bellow_lf : tune.bellow_dmg); },
    lore: { ko: '숲 위로 거인처럼 솟아 포효하는 뾰족귀의 인물.', en: 'A pointy-eared figure towering over the forest, roaring.' },
  },
  'slaughter-cry': {
    art: 'cry', type: 'skill', cost: 1, target: 'none',
    text: { ko: '이번 턴 내 공격 피해 +{n}.', en: 'Your attacks deal +{n} damage this turn.' }, v: { n: 'cry_bonus' }, face: [['atk', '+', 'cry_bonus']],
    play(b) { Q.bonus(tune.cry_bonus); },
    lore: { ko: '창을 꼬나 쥐고 소리 지르며 돌진한다.', en: 'Charging and shouting, spear leveled.' },
  },
  'stonework-puma': {
    art: 'puma', ally: true, type: 'attack', cost: 1, target: 'enemy', ko: '석조 퓨마',
    text: { ko: '피해 {d}. 방어 {b}.', en: 'Deal {d} damage. Gain {b} block.' }, v: { d: 'puma_dmg', b: 'puma_blk' }, face: [['atk', 'puma_dmg'], ['blk', 'puma_blk']],
    play(b, ti) { Q.hit(ti, tune.puma_dmg); Q.block(tune.puma_blk); },
    lore: { ko: "돌 퓨마 'Tawny'. 많은 원정대가 믿고 데려간다.", en: "'Tawny', a stone puma many expeditions trust enough to take along." },
  },
  'oracle-of-mul-daya': {
    art: 'oracle', type: 'power', cost: 2, target: 'none', ko: '물 다야의 신탁자', kw: ['power'],
    text: { ko: '지속. 한 턴에 대지를 2장까지 낼 수 있다.', en: 'Lasting. You may play two lands each turn.' }, face: [['land', '×2']],
    play(b) { Q.power('oracle-of-mul-daya'); },
    lore: { ko: '조상의 영혼과 이어진 엘프 나라 물 다야의 주술사.', en: "A shaman of Mul Daya, the elf nation tied to its ancestors' spirits." },
  },

  // ---- Murasa ----
  'narrow-escape': {
    art: 'escape', type: 'skill', cost: 1, target: 'none', ko: '아슬아슬한 탈출',
    text: { ko: '방어 {b}. 체력 {h} 회복.', en: 'Gain {b} block. Heal {h}.' }, v: { b: 'escape_blk', h: 'escape_heal' }, face: [['blk', 'escape_blk'], ['heal', 'escape_heal']],
    play(b) { Q.block(tune.escape_blk); Q.heal(tune.escape_heal); },
    lore: { ko: '탐험가의 아슬아슬한 탈출.', en: "An explorer's narrow escape." },
  },
  'tajuru-archer': {
    art: 'bow', ally: true, type: 'attack', cost: 1, target: 'enemy', ko: '타주루 궁수',
    text: { ko: '피해 {d}를 2번.', en: 'Deal {d} damage twice.' }, v: { d: 'archer_dmg' }, face: [['atk', 'archer_dmg', '×2']],
    play(b, ti) { Q.hit(ti, tune.archer_dmg); Q.hit(ti, tune.archer_dmg); },
    lore: { ko: '타주루 엘프 궁수 Elenar. 활은 카잔두의 수관 가지로 깎았다.', en: 'Elenar, a Tajuru elf archer. His bow was carved from Kazandu canopy wood.' },
  },
  'kazandu-blademaster': {
    art: 'blade', ally: true, type: 'attack', cost: 1, target: 'enemy', ko: '카잔두 검술사',
    text: { ko: '피해 {d}. 이번 전투에서 낼 때마다 피해 +{g}.', en: 'Deal {d} damage. +{g} each time you play it this fight.' }, v: { d: 'blade_dmg', g: 'blade_grow' }, face: [['atk', 'blade_dmg'], ['up', 'blade_grow']],
    play(b, ti, c) { Q.hit(ti, tune.blade_dmg + tune.blade_grow * c.n); },
    lore: { ko: '카잔두의 숲 협곡에서 모험을 시작한 용병 검사 Assar Ihmad.', en: "Assar Ihmad, a mercenary swordsman who began adventuring in Kazandu's forest canyons." },
  },
  'into-the-roil': {
    art: 'wave', type: 'skill', cost: 1, target: 'enemy',
    text: { ko: '대상의 방어와 힘을 없앤다. 카드 1장을 뽑는다.', en: "Remove the target's block and strength. Draw a card." }, face: [['x'], ['draw', '1']],
    play(b, ti) { Q.strip(ti); Q.draw(1); },
    lore: { ko: "'탁류다! 탁류다! 몸을 묶어!'", en: "'Roil tide! Roil tide! Tie yourselves down!'" },
  },

  // ---- Ondu ----
  'steppe-lynx': {
    art: 'lynx', type: 'attack', cost: 0, target: 'enemy', ko: '초원 스라소니', kw: ['landfall'],
    text: { ko: '피해 {d}. 상륙: 대신 피해 {D}.', en: 'Deal {d} damage. Landfall: deal {D} instead.' }, v: { d: 'lynx_dmg', D: 'lynx_lf' }, face: [['atk', 'lynx_dmg'], ['lfv', 'lynx_lf']],
    play(b, ti, c) { Q.hit(ti, c.lf ? tune.lynx_lf : tune.lynx_dmg); },
    lore: { ko: '새 사냥터의 낯선 냄새에 피가 끓는 스라소니.', en: 'A lynx whose blood stirs at the scents of a new hunting ground.' },
  },
  'makindi-shieldmate': {
    art: 'kite', ally: true, type: 'skill', cost: 1, target: 'none', ko: '마킨디 방패병', kw: ['landfall'],
    text: { ko: '방어 {b}. 상륙: 대신 방어 {B}.', en: 'Gain {b} block. Landfall: gain {B} instead.' }, v: { b: 'shieldmate_blk', B: 'shieldmate_lf' }, face: [['blk', 'shieldmate_blk'], ['lfv', 'shieldmate_lf']],
    play(b, ti, c) { Q.block(c.lf ? tune.shieldmate_lf : tune.shieldmate_blk); },
    lore: { ko: '코르 방패병 Moliq. 일행의 마법사와 학자에게 갈 상처를 몸으로 막는다.', en: "Moliq, a kor shieldmate who takes the blows meant for the party's mages and scholars." },
  },
  'cobra-trap': {
    art: 'snakes', type: 'attack', cost: 2, target: 'none', ko: '코브라 함정', kw: ['trap'],
    text: { ko: '함정 — 공격하지 않으려는 적이 있으면 비용 0. 무작위 적에게 피해 {d}를 4번.', en: 'Trap: costs 0 if an enemy does not intend to attack. Deal {d} damage to a random enemy, four times.' },
    v: { d: 'cobratrap_dmg' }, face: [['atk', 'cobratrap_dmg', '×4']],
    trap(b) { return b.enemies.some(e => e.hp > 0 && e.away <= 0 && !e.cancelled && !intentIsAttack(e)); },
    play(b) { for (let i = 0; i < 4; i++) Q.hitRandom(tune.cobratrap_dmg); },
    lore: { ko: "뱀 네 마리를 풀어놓는 함정. '젠디카르의 자연 방어' 가운데 하나.", en: "A trap that looses four snakes: one of Zendikar's natural defenses." },
  },
  'journey-to-nowhere': {
    art: 'portal', type: 'skill', cost: 2, target: 'enemy', ko: '기약 없는 여정',
    text: { ko: '큰 짐승이 아닌 적 하나를 {n}턴 동안 전투 밖으로 보낸다.', en: 'Send an enemy that is not a great beast out of the fight for {n} turns.' }, v: { n: 'journey_turns' }, face: [['away', 'journey_turns']],
    can(b, ti) { const e = b.enemies[ti]; return e && isBig(e) ? 'no_big' : null; },
    play(b, ti) { Q.banish(ti, tune.journey_turns); },
    lore: { ko: '허공의 구멍 너머 다른 곳으로 보낸다.', en: 'Sent elsewhere, through a hole in the air.' },
  },
  'grappling-hook': {
    art: 'hook', type: 'power', cost: 2, target: 'none', ko: '갈고리', kw: ['power'],
    text: { ko: '지속. 매 턴 처음 내는 공격 카드의 효과가 한 번 더 일어난다.', en: 'Lasting. The first attack card you play each turn takes effect twice.' }, face: [['atk', '×2']],
    play(b) { Q.power('grappling-hook'); },
    lore: { ko: '코르의 가장 기본이 되는 도구.', en: 'The most basic tool of the kor.' },
  },
};

// The deck every expedition leaves Sea Gate with (Tazeem's land is the island).
const STARTER = [
  'trusty-machete', 'trusty-machete', 'trusty-machete', 'trusty-machete',
  'bold-defense', 'bold-defense', 'bold-defense', 'bold-defense',
  'adventuring-gear', 'island',
];
// The first hand of a run's first fight, so the first minute teaches attack, block and landfall.
const FIRST_HAND = ['trusty-machete', 'trusty-machete', 'bold-defense', 'island', 'adventuring-gear'];

// The land you gain the first time you reach a continent.
const LAND_OF = { tazeem: 'island', akoum: 'mountain', 'guul-draz': 'swamp', 'bala-ged': 'forest', murasa: 'forest', ondu: 'plains', sejiri: 'plains' };

// The cards each continent gives: the ones the map project places there in saga 1 phase 1.
const POOLS = {
  tazeem: ['explorers-scope', 'harrow', 'welkin-tern', 'spell-pierce'],
  sejiri: ['brave-the-elements', 'kor-cartographer'],
  akoum: ['burst-lightning', 'arrow-volley-trap', 'inferno-trap', 'goblin-guide', 'lotus-cobra'],
  'guul-draz': ['vampires-bite', 'blazing-torch', 'pitfall-trap', 'nimana-sell-sword'],
  'bala-ged': ['primal-bellow', 'slaughter-cry', 'stonework-puma', 'oracle-of-mul-daya'],
  murasa: ['narrow-escape', 'tajuru-archer', 'kazandu-blademaster', 'into-the-roil'],
  ondu: ['steppe-lynx', 'makindi-shieldmate', 'cobra-trap', 'journey-to-nowhere', 'grappling-hook'],
};
const RARITY_WEIGHT = { common: 10, uncommon: 6, rare: 3, mythic: 1.5 };
const RARITY_WEIGHT_ELITE = { common: 2, uncommon: 6, rare: 9, mythic: 6 };

// A value on a card or an enemy: a config.js key (read live) or a plain number.
function val(x) { return typeof x === 'string' ? (CONFIG[x] ? CONFIG[x].value : x) : x; }
function cardRarity(id) { const l = LORE[id]; return l ? l.rarity : 'common'; }
function cardPrice(id) { return tune['price_' + cardRarity(id)] || tune.price_common; }
// A card's name in this language: {text, star}; star marks this game's own Korean translation.
function cardName(id) {
  const d = CARDS[id], l = LORE[id];
  const en = (d && d.en) || (l && l.en) || id;
  if (LANG === 'ko') {
    if (l && l.ko) return { text: l.ko, star: false };
    if (d && d.ko) return { text: d.ko, star: !d.koOfficial };
  }
  return { text: en, star: false };
}
function cardEnglish(id) { const d = CARDS[id], l = LORE[id]; return (d && d.en) || (l && l.en) || id; }
function cardText(id) {
  const d = CARDS[id];
  if (!d.text) return genCardText(id); // made of effects: the text is put together from them (text2.js)
  let s = LX(d.text);
  if (d.v) for (const k in d.v) s = s.split('{' + k + '}').join(String(tune[d.v[k]]));
  return s;
}
// Where the map project places the card: "ZEN #209 · Kazandu, Murasa".
function cardOrigin(id) {
  const l = LORE[id];
  if (!l) return '';
  let place = '';
  if (l.placeEn) place = (LANG === 'ko' && l.placeKo) ? l.placeKo : l.placeEn;
  const cont = l.cont ? contName(l.cont) : '';
  const where = place && cont ? place + ', ' + cont : (place || cont);
  return 'ZEN #' + l.no + (where ? ' · ' + where : '');
}
function isLand(id) { return CARDS[id].type === 'land'; }
function cardArt(id) { return ART[CARDS[id].art || id]; }
// The icons and numbers on a card's face: [[icon, text], ...].
function cardFace(id) { const d = CARDS[id]; return d.face ? d.face.map(f => [f[0], faceTokens(f)]) : genFace(d); }
// The keywords a card's panel explains.
function cardKw(id) {
  const d = CARDS[id], out = (d.kw || []).slice();
  const add = k => { if (out.indexOf(k) < 0) out.push(k); };
  if (d.type === 'land') add('land');
  if (d.type === 'power' && !d.quest) add('power');
  if (d.quest) add('quest');
  if (d.trap) add('trap');
  if (d.lf || d.lfAdd || (d.on && d.on.land) || (d.quest && d.quest.on === 'land')) add('landfall');
  if (d.ally || d.rally) add('ally');
  if (d.recur) add('recur');
  return out;
}
