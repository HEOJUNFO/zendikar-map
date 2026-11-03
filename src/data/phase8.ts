// 페이즈8 — 사가4(March of the Machine)의 페이즈2, March of the Machine: The Aftermath(MAT, 2023) 세트. 페이즈1~7 과 같은 모양·규칙(phase1.ts 의 PhaseCard)으로 싣는다. 이 파일이 원본이다 — 손으로 고친다.
// - 공식 자료가 젠디카르의 일이라고 밝힌 MAT 카드만 싣는다(사용자 결정 2026-11-03): 공식 이야기 'Beyond Repair'(2023-05-02)가 그 장면에 그림을 실은 나히리 카드 셋.
//   Tazri, Stalwart Survivor 는 싣지 않는다 — 카드에 플레이버·장소가 없고, Beyond Repair 에 타즈리가 나오지 않으며, 'Battles in the Field and in the Mind'(MOM 이야기)는
//   침공 무렵(사가4 페이즈1)의 타즈리만 쓴다(바다 관문 → 에메리아 하늘거주지 → 떠도는 바위 턱). 침공이 끝난 뒤 그의 자리를 밝힌 공식 자료가 없다.
//   Kiora, Sovereign of the Deep 등 근거가 팬 자료·커뮤니티 태그뿐인 카드, Commander·Multiverse Legends·Jumpstart 카드도 싣지 않는다.
// - 페이즈1(MOM)의 그림 위에 쌓아 그린다 — 침공이 끝난 MAT 무렵 그 자리(그 상태)에 없다고 공식 자료가 밝힌 대상은 phase7.ts 에서 until: 1 로 끝냈다.
// - 세 카드 모두 떨어진 에메리아 하늘거주지(그 무렵 모습, periods/tazeem.ts 의 emeria-2023-crash) 위와 그 둘레 죽은 금속 평원(emeria-2023-plain) 위에 산다 —
//   그 자리는 이 지도의 추정이다(숲이나 덤불이 없는 평평한 평원이라는 것뿐).
//   나히리 자신은 Nahiri, Forged in Fury 하나로 그리고, 그를 말하는 다른 두 카드(Reckless Handling·Nahiri's Resolve)는 그 곁에 상징으로 둔다.
// - MAT 는 한국어판이 인쇄되지 않아(Wizards, 'Changes to Magic Product Languages', 2022-07-18) 이 파일의 카드에는 nameKo 를 달지 않는다.
import type { PhaseCard } from './phase1'

const BEYOND = {
  label: 'Magic Story: March of the Machine: The Aftermath | Beyond Repair (Emily Teng, 2023-05-02)',
  url: 'https://magic.wizards.com/en/news/magic-story/beyond-repair',
}
const NO_KO = {
  label: 'Changes to Magic Product Languages (Wizards, 2022-07-18) — \'starting with Dominaria United, we will no longer publish tabletop Magic in Russian, Korean, or Chinese (Traditional)\' (MAT 한국어판이 없는 근거)',
  url: 'https://magic.wizards.com/en/news/announcements/changes-to-magic-product-languages',
}

export const PHASE8_CARDS: PhaseCard[] = [
  {
    id: 'reckless-handling',
    name: 'Reckless Handling',
    set: 'mat',
    number: '19',
    rarity: 'uncommon',
    typeLine: 'Sorcery',
    url: 'https://scryfall.com/card/mat/19/reckless-handling',
    image: 'https://cards.scryfall.io/normal/front/2/3/239165bb-7819-4d54-a84c-2911934253d6.jpg?1783916521',
    artist: 'Miguel Mercado',
    subject: '떨어진 에메리아 하늘거주지의 둥근 지붕이 무너지며 나히리가 쥐고 있던 유물 — 그의 플레인즈워커 불꽃을 얇은 돌 켜로 감싼 주먹만 한 다면체 — 이 깨지는 장면(카드 플레이버, Beyond Repair 2023 — 이 그림이 실린 장면). 켜켜이 쌓인 다면체가 금 가며 조각나 흩어지고 가운데의 빛이 꺼진 상징으로 그린다. 나히리 자신은 Nahiri, Forged in Fury 가 같은 하늘거주지 위에 그려 사람은 다시 그리지 않는다. 크기 등급: 손에 쥐는 유물의 장면 상징 — 지역 상세(산호투구).',
    depicts: { type: 'location', id: 'emeria' },
    at: [982, 652],
    size: 6,
    childMap: 'coralhelm',
    basis: '플레이버는 \'The relic shattered, and something in Nahiri broke as well.\'이다. 공식 이야기 Beyond Repair(2023)에서 나히리는 떨어진 하늘거주지 안의 방 벽에서 자기 불꽃이 든 다면체를 찾아내고(\'It was a hedron, if that hedron had grown in impossibly thin slices of stone layer by layer around a central seed\', \'It was her Planeswalker spark.\'), 선체 위에서 아자니와 다투다 \'the dome of the Skyclave collapsed beneath her feet\' — 바로 뒤에 이 카드의 그림(Art by: Miguel Mercado)이 실린다. 떨어진 뒤 그 다면체는 깨져 있다(\'The slices of thin, fragile stone that had petaled around the core were cracked\', \'She couldn\'t feel her spark at all.\').',
    estimate: '장면은 하늘거주지의 무너진 둥근 지붕과 그 밑이지만, 이 지도는 떨어진 하늘거주지(그 무렵 모습)를 가리지 않게 산호투구 지역 상세에서 선체 바로 동쪽 곁, 하늘거주지가 떨어진 죽은 금속 평원 위에 상징으로 두었다 — 나히리(Nahiri, Forged in Fury)가 선 지붕 꼭대기의 곁이다. 상징의 모양은 이 지도의 그림이다.',
    flavor: 'The relic shattered, and something in Nahiri broke as well.',
    sources: [{ label: 'Card: Reckless Handling (MAT #19)', url: 'https://scryfall.com/card/mat/19/reckless-handling' }, { label: `${BEYOND.label} — 'the dome of the Skyclave collapsed beneath her feet' 뒤에 이 그림(Art by: Miguel Mercado)`, url: BEYOND.url }, NO_KO],
  },
  {
    id: 'nahiri-forged-in-fury',
    name: 'Nahiri, Forged in Fury',
    set: 'mat',
    number: '36',
    rarity: 'mythic',
    typeLine: 'Legendary Creature — Kor Artificer',
    url: 'https://scryfall.com/card/mat/36/nahiri-forged-in-fury',
    image: 'https://cards.scryfall.io/normal/front/9/0/90eb0859-d24e-4703-8930-1cd4ac1fb3b6.jpg?1783916513',
    artist: 'Marta Nael',
    subject: '피렉시아의 침공이 끝난 뒤 컴플리트에서 벗어나고 플레인즈워커의 불꽃을 잃은 코르 암석술사 나히리 — 떨어진 에메리아 하늘거주지 안에서 하늘거주지와 제 몸에 박힌 피렉시아의 금속을 뜯어내고, 하늘거주지의 둥근 지붕을 뚫어 밖으로 이어지는 거친 돌계단을 낸다(Beyond Repair, 2023). 그 돌계단 꼭대기에 서서 달군 돌칼을 쥐고 다른 손에 열기를 피운 모습으로, 팔과 몸에는 금속을 뜯어낸 마름모꼴 흉터를 그린다. 크기 등급: 사람만 한 대상 — 지역 상세(산호투구).',
    depicts: { type: 'location', id: 'emeria' },
    at: [962.8, 653],
    size: 9,
    childMap: 'coralhelm',
    label: 'above',
    basis: '카드에는 플레이버가 없다. 공식 이야기 Beyond Repair(2023)는 \'Deep within the bowels of what had once been the Emeria Skyclave, Nahiri ripped the taint of Phyrexia from her plane.\'로 시작한다. 나히리가 하늘거주지 안의 방에서 돌을 밀어 올려 \'it pierced the vaulted roof of the Skyclave itself, a rough set of stairs that stretched from her feet all the way to the outside\' 한 바로 뒤, 흉터를 처음 보는 대목(\'The diamond pattern of the Skyclaves seared into her where flesh had fused to metal\')에 이 카드의 그림(Art by: Marta Nael)이 실린다. 이어 그는 그 계단을 올라 선체 위로 나온다(\'By the time she emerged onto the Skyclave\'s hull\'). 하늘거주지는 평평한 평원에 떨어져 있다(\'Luckily, the Skyclave had crashed into a flat plain\').',
    estimate: '이야기는 떨어진 에메리아 하늘거주지 안과 그 위라는 데까지 밝히고, 하늘거주지가 떨어진 자리는 밝히지 않는다 — 그 자리는 이 지도의 바탕(그 무렵 모습)이 고른 자리다. 그림이 실린 장면은 하늘거주지 안의 방이지만, 이 지도는 떨어진 하늘거주지를 가리지 않게 산호투구 지역 상세에서 둥근 지붕 꼭대기, 그가 뚫어 낸 돌계단이 밖으로 나온 자리에 세웠다 — 이야기에서 그가 그 계단을 올라 나온 곳이다. 이름은 위에 단다 — 밑은 하늘거주지의 둥근 지붕에 걸린다.',
    time: {
      at: [6],
      same: 'nahiri',
      estimate: '이 카드가 그리는 것은 피렉시아의 침공이 끝난 뒤 컴플리트에서 벗어나고 불꽃을 잃은 나히리(Beyond Repair, 2023)라 2023년에만 그린다. 2020년의 나히리는 같은 개체의 Nahiri, Heir of the Ancients 가 맡고, 2009·2010·2015·2016년에는 그 카드의 시점 글대로 그리지 않는다.',
    },
    sources: [{ label: 'Card: Nahiri, Forged in Fury (MAT #36) — Legendary Creature — Kor Artificer, 플레이버 없음', url: 'https://scryfall.com/card/mat/36/nahiri-forged-in-fury' }, { label: `${BEYOND.label} — 'Deep within the bowels of what had once been the Emeria Skyclave', 'a rough set of stairs that stretched from her feet all the way to the outside' 뒤에 이 그림(Art by: Marta Nael), 'the Skyclave had crashed into a flat plain'`, url: BEYOND.url }, NO_KO],
  },
  {
    id: 'nahiris-resolve',
    name: 'Nahiri\'s Resolve',
    set: 'mat',
    number: '37',
    rarity: 'rare',
    typeLine: 'Enchantment',
    url: 'https://scryfall.com/card/mat/37/nahiris-resolve',
    image: 'https://cards.scryfall.io/normal/front/d/f/df9acf30-b4f4-4e99-9763-a3055e91fefb.jpg?1783916513',
    artist: 'Alexey Kruglov',
    subject: '젠디카르를 바깥의 힘에서 닫아걸겠다는 나히리의 다짐 — 떨어진 하늘거주지 꼭대기에서 망가진 고향을 내려다보며 다시는 플레인즈워커가 젠디카르에 발을 딛지 못하게 하겠다고 맹세하는 장면(Beyond Repair, 2023 — 이 그림이 실린 장면). 둥글게 솟아 안으로 기운 돌 조각의 울타리가 가운데 다면체 하나를 감싸 닫는 상징으로 그린다. 나히리 자신은 Nahiri, Forged in Fury 가 같은 하늘거주지 위에 그려 사람은 다시 그리지 않는다. 크기 등급: 사람만 한 장면 상징 — 지역 상세(산호투구).',
    depicts: { type: 'location', id: 'emeria' },
    at: [944.5, 656],
    size: 6,
    childMap: 'coralhelm',
    basis: '플레이버는 \'"Zendikar is *my* home!"\'이다. 공식 이야기 Beyond Repair(2023)는 떨어진 하늘거주지 꼭대기에 다시 나온 나히리가(\'By the time she finally emerged back to the top of the Skyclave\') \'Still ways, perhaps, to close Zendikar off from outside forces who would do it harm.\'라고 생각하는 대목 바로 뒤에 이 카드의 그림(Art by: Alexey Kruglov)을 싣고, \'Nahiri looked out over the wreck of her plane, her beautiful, blighted, broken home.\', \'"Whatever it takes, I swear. No Planeswalker will set foot on Zendikar ever again."\'으로 맺는다.',
    estimate: '자리는 이야기가 밝힌 떨어진 에메리아 하늘거주지의 꼭대기이지만, 나히리 자신은 Nahiri, Forged in Fury 가 그 꼭대기에 그려 이 카드는 그 곁 — 산호투구 지역 상세에서 선체 서쪽 곁, 하늘거주지가 떨어진 죽은 금속 평원 위 — 에 상징으로 두었다. 상징의 모양(닫히는 돌 울타리)은 이 지도의 그림이다.',
    flavor: '"Zendikar is *my* home!"',
    sources: [{ label: 'Card: Nahiri\'s Resolve (MAT #37)', url: 'https://scryfall.com/card/mat/37/nahiris-resolve' }, { label: `${BEYOND.label} — 'to close Zendikar off from outside forces' 뒤에 이 그림(Art by: Alexey Kruglov), 'No Planeswalker will set foot on Zendikar ever again.'`, url: BEYOND.url }, NO_KO],
  },
]
