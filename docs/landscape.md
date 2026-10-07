# 바탕 지형 — 공식 근거와 이 지도의 추정

세계 지도의 바탕 그림(강·화산·폭포·절벽·협곡·숲·늪·수정 들판·용암 들판·툰드라·바다 얼음 등)에 공식 서술을 옮긴 기록이다.
데이터는 `src/data/landscape/<대륙>.ts`(모양은 `src/data/types.ts` 의 `Landscape`), 그리는 쪽은 `src/map/landscape.ts`·`landscapeGlyphs.ts`·`terrain.ts`.

원칙
- 공식 자료가 그 지형이 **있다고** 말한 것만 그린다. 자리·물길·범위를 공식 자료가 밝히지 않으면 이 지도가 고르고, 그 까닭을 데이터의 `estimate` 에 적는다 (사용자 요청, 2026-10).
- 추정한 지형도 모양은 근거 있는 지형과 같다. 장소와 하나인 지형은 그 장소 패널의 '지도에 그린 지형'에, 장소 없는 추정 지형은 대륙 패널의 '지도가 자리를 고른 지형'에 까닭이 나온다.
- 2020년(Zendikar Rising) 무렵에도 남아 있다고 볼 수 있는 것만 그린다. 사라졌다고 서술된 것(Umung River의 물길, Bala Ged 의 폭포 등)은 그리지 않는다.
- 점검의 출발점: 공식 서술과 바탕 그림을 대조한 점검(2026-10-07) — 확인된 빠짐 77건, 기각 20건.

## 세지리

- **세지리 툰드라** — 근거: PG: Murasa and Sejiri(2010) 'Sejiri is a vast, icy tundra', PG(2009) 'permafrost steppes, wind-blasted mountains'. 대륙 전체가 얼음 툰드라라는 것은 공식이라 대륙 지형(`continents.ts` 의 `relief.tundra`)으로 봉우리 사이 땅 전체에 드문 풀포기와 서리 점을 깐다. 이것은 추정이 아니다.
- **영구동토 스텝** (`sejiri-tundra-steppe`) — 근거: 같은 서술과 대지 카드 Sejiri Steppe(WWK #142). 어디가 스텝이고 Sejiri Steppe 가 어디인지는 공식 자료에 없다. 그래서 이 지도가 Sejiri Steppe 카드 표시(장소 패널의 '추정') 둘레를 산이 없는 트인 스텝으로 그렸고, 범위도 이 지도가 정했다(추정).
- **세지리 빙하 빙원** (`sejiri-glacier-ice`) — 근거: ZNR 카드 Sejiri Shelter // Sejiri Glacier(2020). 자리와 범위는 장소의 추정 자리·범위([675,60], ±70×35)를 따르고, 서쪽 산 무리 동쪽의 빈 고원을 메운 빙원 모양은 이 지도가 정했다(추정).
- **Benthidrix 위를 흐르는 강과 그 지류** — 근거: PG: Murasa and Sejiri(2010) 'brittle ice bridges over rapidly-flowing rivers', Benthidrix 'lies under one of Sejiri's deep riverbeds'. 강의 이름·수·물길은 이 지도의 추정이다. 본류는 Benthidrix 표시([1060,40], 이 자리도 추정) 바로 위를 지나 강바닥 서술에 맞춘다. 세지리는 둘레 전체를 엄청나게 높은 절벽이 두르므로(PG 2010), 남쪽 바다로 떨어지는 폭포를 지어내지 않도록 절벽 테 안쪽 고지에서 솟아 북쪽(지도 위쪽 바깥)으로 흐르게 했다. 지류 하나가 서남쪽에서 합친다. 얼음다리는 자리를 알 수 없어 그리지 않았다.
- **떠다니는 돌 '항아리'** (`urn` 기호 셋) — 근거: PG: Murasa and Sejiri(2010) 'enormous, floating stone "urns" that spill avalanches of ice and snow across the landscape'. 자리와 수는 이 지도의 추정이다(Benthidrix 서쪽 산 무리 곁, Ikiral 서쪽 고원, Sejiri Steppe 동쪽 산 무리 북쪽). 헤드론이라는 서술이 없어 헤드론이 아닌 기울어진 돌 항아리로 그린다.
- **Ikiral 의 쓰러져 쪼개진 헤드론** — 근거: PG: Murasa and Sejiri(2010) 'The huge hedron lies awkwardly on its side, partly sunken into the icy tundra, split down the middle'. 정착지의 팬 지도 자리에 쓰러져 둘로 쪼개진 헤드론 하나를 크게 둔다(`hedrons` 의 `ikiral`, `split`). 2015년 이후의 상태는 공식 언급이 없다.
- **북해의 얼음** — 근거: ZNR 카드 Cleric of Chill Depths(2020) 'a glittering city beneath the northern sea ice'. 어느 바다인지와 범위는 이 지도의 추정이다. 극지 대륙 세지리를 지도 위쪽 가장자리에 두었으므로, 세지리 양 끝 너머 위쪽 가장자리의 트인 바다(서쪽 x<400, 동쪽 x>2030)에 떠다니는 얼음을 그렸다. PG(2010)의 '세지리 빙붕'은 고원 위 얼음으로 읽혀 이 바다 얼음의 근거로 쓰지 않았다.
- **Midnight Pass** — 팬 지도에 그려진 좁은 해협 물길을 해안선 추출(`extract_geo.py` 의 CUTS)로 되살렸다. 팬 지도가 근거이고 추정이 아니다. 이름표는 [1344,174]에 그대로 둔다.

## 타짐

- **우마라 강** (`umara-river`, 장소 umara-river): 하늘폭포 밑에서 시작해 협곡 위 평원을 지나 마고시 폭포로 떨어지고, 우렌 동굴·티칼 정박지 곁과 Merfolk Enclave(강 위의 섬)를 지나 바다 관문 맞은편 할리마르 서쪽 끝으로 흘러드는 굵은 급류.
  - 근거: 2009 가이드('a great white-water river that bisects the continent', 깊은 협곡, 일련의 폭포), 아트북 2016(북쪽 끝 고지에서 발원해 할리마르로 떨어진다), Red Route 2020(할리마르의 먼 기슭에서 협곡이 시작된다), Umara Skyfalls(ZNR, 강의 근원은 오란리프 상공).
  - 추정: 두 끝과 장소의 순서만 공식 자료에 있고, 그 사이 물길은 이 지도가 그었다. 흐름 방향은 2016·2020 자료를 따랐다(2009 가이드는 반대 방향으로 읽힌다). 이 해안선에서는 '대륙을 가로지르는' 길이를 나타낼 수 없다.
- **우마라 협곡** (`umara-gorge`): 강 물길을 그대로 따라 하늘폭포 밑에서 할리마르 어귀까지 그은 협곡 단애.
  - 근거: Red Route 2020('sheer walls plunging hundreds of feet from rim to river'), 2009 가이드('a deep gorge').
  - 추정: 자리는 강 물길을 따랐다.
- **마고시 폭포** (`magosi-falls-drop`, 폭포 기호): 강이 300피트를 한 번에 떨어지는 단애. 위 협곡(약 40단위)과 아래 협곡이 비슷한 길이가 되는 물길 가운데쯤에 있다.
  - 근거: 2009 가이드, Red Route 2020.
  - 추정: 자리는 카드 Magosi, the Waterveil 표시를 따랐다. 그 표시는 Red Route의 거리(마고시 육로에서 협곡 위 평원까지 이틀 가까이, 할리마르 기슭에서 마고시 육로까지 며칠)에 맞춰 강의 가운데쯤에 두었다. '일련의 폭포' 가운데 나머지는 자리를 밝힌 자료가 없어 그리지 않는다.
- **우마라 하늘폭포** (`umara-skyfalls-veil`, 폭포 기호)와 그 아래 **정글** (`umara-skyfalls-jungle`, 숲 영역):
  - 근거: Umara Skyfalls 카드('sits high above Oran-Rief, ever weeping on the jungle below').
  - 추정: 자리는 장소 표시를 따랐다. 정글은 하늘폭포 아래, 북쪽 Bulwark 산줄기 바로 남쪽에 그렸다. 물이 무엇에서 떨어지는지는 공식 자료에 없어 떨어지는 물줄기만 그린다.
- **섬 북쪽 끝의 높은 Bulwark** (`bulwark-north-heights-west` / `-east`, 빽빽한 산, 장소 the-bulwark): 협곡 위 평원·하늘폭포 아래 정글과 북쪽 해안 사이의 Bulwark 띠다. 하다 북부가 이 띠 안에 있다.
  - 근거: 아트북 2016 'The Bulwark'(섬을 고리처럼 두르고 북쪽 끝이 가장 높다), Red Route 2020('low foothills and, eventually, the bruised darkness of the Bulwark').
  - 추정: 띠의 범위는 이 지도가 골랐다. 하다 북부 표시 둘레에는 산을 놓지 않아 띠가 끊기므로, 영역을 둘로 나눴다(겉모습은 하나의 산줄기다).
- **협곡 위 평원** (`umara-gorge-rim-plains`, 평원)과 **낮은 언덕** (`umara-gorge-foothills`, 언덕): 하늘폭포 밑에서 마고시 폭포까지의 위 협곡을 중심으로, 폭포 조금 아래까지 협곡 양쪽 둔덕을 평원으로 그린다. 평원과 북쪽 Bulwark 사이에는 얇은 언덕 띠를 둔다.
  - 근거: Red Route 2020('The plains atop the gorge stretched to the horizon … low foothills and, eventually, the bruised darkness of the Bulwark').
  - 추정: 범위는 이 지도가 골랐다. 이야기의 순서(평원 → 언덕 → Bulwark)는 지키지만, 협곡과 북쪽 해안 사이가 40단위 남짓이라 '먼 북쪽'의 거리와 '이틀 가까이'의 길이는 나타내지 못한다.
- **바다 관문 가까이에서 낮은 Bulwark** (`bulwark-low-near-sea-gate-south` / `-north`, 언덕, 장소 the-bulwark): 바다 관문 둘레의 Bulwark 띠를 산 대신 언덕으로 그린다.
  - 근거: Slaughter at the Refuge 2015('the ring was lower here, close to Sea Gate, than it was on the other side of the island').
  - 추정: 범위(댐 양쪽으로 약 35~145단위)는 이 지도가 골랐다. 댐 바로 곁의 좁은 땅은 할리마르 쪽이 완만한 비탈과 해변, 대양 쪽이 절벽이라(The Liberation of Sea Gate) 비운다.
- **할리마르의 바위 절벽** (`halimar-cliffs-north` / `-south`): 빗금은 물 쪽으로 떨어진다. 북쪽 기슭은 우마라 강 어귀부터 바다 관문에서 약 80단위 떨어진 곳까지 긋는다. 남쪽 기슭은 남쪽 강의 어귀부터 서쪽으로 긋는다.
  - 근거: 2009 가이드('Surrounded on three sides by rocky cliffs'). 바다 관문 쪽은 The Liberation of Sea Gate 2015('a gentle slope down to a quiet beach')를 따라 비웠다. 북쪽 기슭의 동쪽 끝은 Slaughter at the Refuge 2015('the land sloped gradually down to the Halimar')를 따라 낮은 Bulwark 아래를 비웠다.
  - 추정: 비운 구간의 경계와 강 어귀마다 끊은 자리는 이 지도가 골랐다.
- **바다 관문 대양 쪽 절벽** (`sea-gate-ocean-cliffs-south` / `-north`): 댐 양쪽 어깨의 좁아지는 땅에서 대양 쪽에 긋는다.
  - 근거: The Liberation of Sea Gate 2015('cliffs on the other side stretched down to the churning ocean below'), Slaughter at the Refuge 2015('a much sharper slope led down to the ocean').
  - 추정: 어느 어깨인지와 길이는 공식 자료에 없다. 이 지도가 북쪽 어깨는 댐에서 약 15~40단위, 남쪽 어깨는 약 15~65단위에 그었다. 남쪽 끝은 낮은 Bulwark 곁까지 이어진다.
- **할리마르로 흘러드는 강 두 줄기** (`halimar-west-river`, `halimar-south-river`): 이름은 없다. 남쪽 강의 가운데 구간은 두 갈래 물길(`halimar-south-river-east-channel` / `-west-channel`)로 갈라졌다 합쳐진다.
  - 근거: Slaughter at the Refuge 2015('fed by Tazeem's many rivers'), Meandering River(OGW) 플레이버('The river split into many channels as it flowed to the Halimar Sea').
  - 추정: 강의 수·물길·갈래의 자리는 모두 이 지도가 골랐다. 카드 이름은 지명이 아니라 붙이지 않는다.
- **우마라의 지류** (`umara-west-tributary`): 서쪽 Bulwark 안쪽 기슭에서 오란리프를 지나 마고시 폭포 아래 협곡으로 흘러드는 한 줄기.
  - 근거: 2009 가이드('Hundreds of tributaries … wind through the Oran-Rief').
  - 추정: 수와 물길은 이 지도가 골랐다. 2009 가이드의 '갈라져 나간다'는 흐름 방향이 반대로 읽히는 시기의 서술이라, 본류로 흘러드는 물길로 그렸다.
- **수직 동굴·간헐천** (`ruins-of-ysterid-pit`, `tazeem-pit-cave-west` / `-east`, `tazeem-geyser-pit`):
  - 근거: 2009 가이드 'Pit Caves'('numerous pit caves all over Tazeem … actually geysers that blast boiling water'). Piqua의 말에 따르면 Ruins of Ysterid는 마고시 폭포 근처 깊은 동굴 바닥에 있다.
  - 추정: Ysterid의 동굴은 유적 표시(마고시 폭포 서쪽) 곁에 그렸다. 나머지는 이 지도가 Bulwark 안쪽 내륙에서 본보기로 고른 자리다.
- **타짐 남부의 헤드론 초원** (`tazeem-southern-grassland`, 평원): 오란리프 숲 남쪽 끝 바로 바깥에서 남쪽 Bulwark까지. 숲 안으로는 파고들지 않는다.
  - 근거: The Look of an Awakening World 2010('a hedron-laden grassland in southern Tazeem'), Booster Quest: The Shaman's Orb 2010('the southern hedron-fields of Tazeem').
  - 추정: 자리와 범위는 이 지도가 골랐다. 2010년 서술이고, 그때 지각판 하나가 그 일대를 가로지르고 있었으며 2020년 이후 모습은 서술되지 않았다. 떠오른 헤드론은 타짐 하늘의 헤드론 무리가 그린다. Tectonic Edge 카드 표시는 이 초원 안에 있다.

## 무라사

- **Murasa's Wall (산 띠와 안쪽 단애)** — 근거: PG: Murasa and Sejiri(2010) 'a vast, steep-walled plateau that rises sharply from the sea… Inland from these cliffs, the land drops off sharply, wreathing Murasa in an irregular "wall" of mountainous cliffs. The largest break in this wall is the Sunder Cove'. 해안 절벽 안쪽에 내륙으로 떨어지는 안쪽 단애(`murasas-wall-inner`)를 긋고, 그 바깥 띠를 산 영역(`murasas-wall-west`·`murasas-wall-east`)으로 그렸다. 한국어판 이름이 없어 패널 이름은 'Murasa's Wall 의 산'·'Murasa's Wall 의 안쪽 단애'로 쓴다. **추정:** 띠의 폭과 단애의 자리는 이 지도가 골랐다. 해안에서 서쪽·북쪽은 약 31단위, 동쪽은 약 27단위 안쪽이다. 북동쪽 모서리는 꺼진 카잔두(팬 지도 자리)가 해안 가까이까지 닿아 약 10단위로 좁다. 띠는 Visimal('성벽 안'의 도시)·Glint Pass를 지나 북동·동해안을 따라 Thunder Gap 동쪽 모서리까지 둘렀다. 끊은 곳은 가장 큰 틈인 Sunder Bay와, 성벽이 돌기둥으로 갈라진 Pillar Plains뿐이다. 카잔두 쪽에서는 안쪽 단애가 곧 카잔두의 바다 쪽 경계 절벽이다. 그래서 카잔두 안의 Kazandu Valley·Tajuru Grove·Silent Gap·Kazandu Refuge 표시는 모두 단애의 카잔두 쪽에 둔다. 단애는 Na Plateau 북쪽에서 고원 절벽과 겹치지 않게 해안 쪽으로 당겼고, Grindstone Crucible 둘레에서는 표시를 비켜 안쪽으로 물렸다. 팬 지도의 숲이 덮인 곳은 숲 채색과 드문 나무를 남겼다.
- **내륙 구릉** — 근거: 같은 가이드 'The interior of Murasa is a rugged landscape of steep, windy hills and precipitous jungle valleys'. 대륙 기호를 산 대신 언덕(`hills`)으로 그린다. 가이드가 예외로 든 하늘이빨 산맥·Na Plateau·카잔두만 따로 그린다.
- **하늘이빨 산맥(Skyfang Mountains)** — 근거: 'These high, steep-sided mountains are covered in forests. They extend from the western side of Murasa and wind deep into its interior, dividing the western half of the continent in two'. 산 영역으로 그리고, 팬 지도가 숲을 칠하지 않은 동쪽에 숲 채색을 더했다. **추정:** 산줄기의 자리는 이 지도가 골랐다. 서해안의 Murasa's Wall에서 팬 지도 라벨 자리를 지나 Shatterskull Pass를 품고 Na Plateau 서쪽 기슭까지 잇는 띠다.
- **이빨(fangs)** — 근거: Skyfang 'huge stalactite-like shards of rock that float above the mountains when the sun shines on them', Shatterskull Pass 'dozens of "fangs" hang above the pass'. 떠 있는 바위 기호로 그렸다(낮의 모습). **추정:** 자리와 수는 이 지도가 골랐다. 고개 둘레에 셋, 산줄기 서쪽과 가운데에 하나씩이다.
- **Na Plateau** — 근거: 'Roughly a quarter mile high, its forested top is about as high as Murasa's Wall… Wurms dwell in the cracked cliffs of the plateau'. 팬 지도에 그려진 고원 윤곽을 따라 바깥으로 떨어지는 절벽을 두르고, 꼭대기에 숲을 그렸다. 남쪽 절벽의 틈이 Raimunza Falls 자리다.
- **Raimunza Falls** — 근거: Raimunza Hive 항목 'Raimunza Falls, a raging torrent of water that cascades off the southern side of the Na Plateau'. 팬 지도가 폭포 물줄기를 그린 고원 남쪽 절벽에 폭포 기호를 두었다. 라이문자 강과는 잇지 않았다(공식 자료가 이 폭포를 그 강의 물줄기라고 하지 않는다).
- **라이문자 강(Raimunza River)** — 근거: 'runs from the base of the Na Plateau… to the edge of Kazandu. There it falls onto the wide branch of a jaddi tree… flows along jaddi branches for miles… plunges into the marshy Blackbloom Lake in the center of Kazandu'. Blackbloom Bog(ZNR) 플레이버도 같은 물길을 말한다. 두 끝은 서술대로 두었다. **추정:** 그 사이 물길은 이 지도가 골랐다. 고원 동남쪽 기슭에서 카잔두 서쪽 경계 절벽을 넘어 호수로 간다. 절벽을 넘는 곳의 폭포('falls onto the wide branch')도 이 지도가 고른 자리다.
- **검은꽃 연못(Blackbloom Lake)과 둘레의 늪** — 근거: 'the marshy Blackbloom Lake in the center of Kazandu'. 장소 자리에 작은 호수(`scripts/geo/extract_geo.py` 의 `INLAND_WATER_ELLIPSES`)를 그리고, 둘레(가로 약 54·세로 약 34단위)를 나무가 걷힌 늪으로 그렸다. **추정:** 호수 크기와 늪의 범위는 이 지도가 정했다.
- **카잔두 경계 절벽** — 근거: 카잔두는 'collapsed into the earth as though a bubble burst… Only the sheer cliffs at Kazandu's borders keep the titanic jaddi trees from crawling across more of the world'. 바다 쪽 경계는 Murasa's Wall의 안쪽 단애와 같다고 보고, 서쪽 경계에 꺼진 쪽으로 떨어지는 절벽을 그었다. 북쪽 끝은 안쪽 단애에 닿는다. **추정:** 경계선은 이 지도가 골랐다. Na Plateau와 카잔두 사이(라이문자 강이 '카잔두 가장자리'에 닿는 곳)를 지나 Sunder Bay 머리 가까이까지다.
- **카잔두의 잔존 고원** — 근거: 'dotted here and there by plateaus that tower above the landscape—surviving pillars of the previous ground level'. 대지(mesa) 기호로 그렸다. **추정:** 두 곳의 자리는 이 지도가 이름·표시를 피해 골랐다. 하나는 라이문자 강 북쪽, 하나는 동쪽이며, 팬 지도도 카잔두 안에 고원 윤곽을 몇 개 그렸다.
- **Pillar Plains** — 근거: 'Thunder Gap cuts through a section of Murasa's Wall known as the Pillar Plains. There the wall is cracked and broken into thousands of massive pillars, the tops of which are grassy plains buffeted by sea winds'. 대지 기호로 빽빽하게 그리고 팬 지도의 숲 채색을 걷었다. **추정:** 범위는 팬 지도 자리를 바탕으로 이 지도가 정했다. '성벽의 한 구간'이라 남해안까지 잇고, 카잔두 골짜기(Verdant Catacombs 자리) 쪽으로는 넘지 않았다. 동쪽은 Murasa's Wall 산 띠와 맞닿는다.
- **Vazi 강과 갈래·폭포** — 근거: 'The Vazi River rushes down a sloping and twisting canyon to crash into the sea. The river splits many times as it passes through the Pillar Plains, but these side channels typically rejoin with the river in crashing waterfalls'. 물길은 팬 지도가 Vazi River 라벨에서 Pillar Plains를 지나 Thunder Gap으로 그린 물줄기를 따랐다. **추정:** 세 가지는 이 지도가 골랐다. 하나는 라벨 위쪽(카잔두 북동쪽)으로 짧게 늘인 상류다. 하나는 갈래의 수(서·동 두 갈래)와 물길이다. 하나는 갈래가 다시 만나는 폭포의 자리다. 검은꽃 연못과는 잇지 않았다.
- **Thunder Gap 협곡** — 근거: 'Boats can navigate the rough waters for a couple miles inland through the canyon of Thunder Gap… precarious trails and rope bridges that run along the canyon walls', 길은 'beneath or above the many waterfalls that burst from side canyons or the plains above'. 팬 지도도 Thunder Gap 라벨 아래에 좁은 물길을 그렸다. 협곡과 그 벽의 폭포를 그렸다. **추정:** 협곡이 시작하는 곳(갈래가 다시 모이는 곳)과 폭포 자리는 이 지도가 골랐다.
- **Sunder Bay와 바닷속 harabaz 숲** — 근거: 개관 'the Sunder Cove, an enormous, tide-wracked bay clotted by the massively trunked harabaz trees', Sunder Bay 'filled with a maze of the multi-trunked harabaz trees… grip the seabed in their entwined roots'. ZNR Episode 2 'a forest of giant harabaz trees surrounded them'. 팬 지도의 작은 만입부를 거대한 만으로 넓혔다(`extract_geo.py` 의 `CUTS`). 만 안을 물에 선 harabaz 숲으로 채우고, 어귀 앞바다에 거친 물결을 그렸다('giant waves that smash toward land during the worst of the tides'). **추정:** 만의 크기·모양(너비 약 80·깊이 약 55단위)과 물결 자리는 이 지도가 정했다.

## 아쿰

## 아쿰 (`src/data/landscape/akoum.ts`)
- **아쿰의 이빨, 여섯 줄기 산맥** (`akoum-teeth-west`·`-north`·`-eye`·`-central`·`-northeast`·`-far-northeast`, 빽빽한 산 영역 0.95, 장소 teeth-of-akoum): 근거는 PG: Akoum(2010) 'The northern reaches of Akoum become more mountainous. The Teeth of Akoum are a series of mountain ranges'이다. ZNR 대지 아쿰의 이빨과 MH3 Volcanic Fissure를 보면 지금도 험한 산맥이다. 이 지도의 추정은 줄기의 수(여섯)·방향·자리다. 줄기는 북서쪽 곶의 등줄기, 탈 테리그 서쪽 북해안, 탈 테리그에서 Eye of Ugin 사이 북해안, Eye 남쪽 가운데, Eye 동쪽 북해안, 북동쪽 곶 끝에 두었다. 가운데 줄기의 서쪽 끝은 League of Anowon 캠프를 감싸고 내려온다. 그래서 '이빨 높은 곳'의 캠프는 줄기의 높은 곳에, '이빨 기슭'의 아파는 그 아래에 놓인다.
- **아쿰의 이빨 줄기 사이 골짜기** (`akoum-teeth-valleys`, 산 영역 0.7, 장소 teeth-of-akoum): 범위는 장소 teeth-of-akoum의 범위(canon-hint)다. 이 지도의 추정은 골짜기의 밀도다. 대륙 전체의 산 밀도(relief 0.5)를 남쪽 기준으로 보고 그보다 높게 두어, 이빨 지역 어디도 남부보다 덜 험해 보이지 않게 했다. 그 위에 더 빽빽한 줄기를 얹어 여러 줄기의 산맥으로 읽히게 했다.
- **가시지대, 산이 아닌 결정 들판** (`akoum-spikefields`, 수정 첨탑 영역): 근거는 PG: Akoum의 'crystalline fields'·'spires of semi-reflective rock'·탈 테리그가 '아쿰의 분지에서 솟았다'는 서술, 아트북(2016)의 '탈 테리그는 가시지대에서 솟았다', ZNR 아쿰 지옥견·가시지대 위험물(머리 위의 가시)이다. 범위는 장소 spikefields의 범위(canon-hint)를 그대로 썼다.
- **가시지대의 협곡** (`akoum-spikefields-chasm`, 협곡선): 근거는 mtg.wiki 'Spikefields'가 아트북(2016)을 옮겨 쓴 문장이다. 아트북 원문은 확인하지 못했다. 그 문장에 따르면 BFZ 시기 화산암 층이 무너지며 가시지대 아래 묻혀 있던 고대 요새 폐허(Stone Havens)가 'a deep chasm stretching for miles' 속에 드러났다. 이 지도의 추정은 자리와 방향이다. 들판 안에서 탈 테리그·이름·카드 표시를 피해 조금 남쪽에 동서로 그었다.
- **오라 온다르 아래 결정 분지** (`akoum-basin-east`, 수정 첨탑 영역): 근거는 PG: Akoum 'a five-tiered outgrowth of rock that juts dramatically out of the crystalline basin'이다. 이 지도의 추정은 범위다. 숲 남쪽 기슭과 거울연못 사이를 골랐고, 거울연못 곁 '들쭉날쭉한 봉우리'(Ior) 앞에서 멈춘다.
- **초화산** (`akoum-supervolcano`, 칼데라 기호): 근거는 PG: Akoum 'At the center of the sprawling region is a massive supervolcano — not precisely dormant'이다. 공식 이름이 없어 라벨은 달지 않았다. 이 지도의 추정은 자리다. 대륙 무게중심(약 1929,468)은 공식 단서로 자리 잡은 이빨 산맥·League of Anowon·아파가 차지한다. 그래서 같은 가로 위치에서 남북 폭 가운데쯤인 아파 남쪽(1930,530)에 두었다. 하늘거주지 아래 용암 들판을 그 동쪽 기슭으로 본 것도 이 지도의 판단이다(akoum-skyclave·용암 들판과 같은 판단).
- **용암 들판** (`akoum-lava-field`, 용암 영역): 근거는 Episode 1: In the Heart of the Skyclave(2020)에서 하늘거주지 아래를 그린 'A lava field was spread out before her feet', PG 개요(2009) 'magma glows from crevasses in the earth', PG: Akoum의 용암 흐름 서술이다. 이 지도의 추정은 자리다. akoum-skyclave의 추정과 같이 초화산 가까이로 보고, 초화산 동쪽 기슭 하늘거주지 표시 아래에 두었다.
- **이빨에서 아파로 흐르는 강** (`akoum-affa-river`): 근거는 PG: Akoum의 Affa 항목 'A river flows down from the Teeth of Akoum and provides the town with one of the few safe, reliable sources of fresh water'이다. 공식 이름이 없어 지도에 이름을 달지 않았고, 패널의 이름도 설명으로만 붙였다. 이 지도의 추정은 물길이다. 가운데 줄기 남쪽 비탈에서 시작해 Windblast Gorge 남쪽을 돌아 아파에 닿게 그었다. 아쿰의 물은 땅 밑으로 빠져 사라지므로(PG) 바다까지 잇지 않고 아파에서 끝냈다.
- **Windblast Gorge** (`akoum-windblast-gorge`, 협곡선, 장소 windblast-gorge): 근거는 PG(2009)에서 아쿰의 사치르가 찬드라에게 한 경고다(Journey to the Eye 1부에서는 아파에서 한 말). 자리는 Journey to the Eye 1부의 아파와 아노원 캠프 사이 오르막을 따른 canon-hint다. 이 지도의 추정은 길이와 방향이다. 아파에서 캠프 쪽으로 북동쪽에 짧게 그었고, 가운데 줄기 안으로 오른다.
- **오라 온다르의 다섯 단 바위** (`akoum-ora-ondar-tier-1`~`5`, 단애선, 장소 ora-ondar): 근거는 PG: Akoum 'a five-tiered outgrowth of rock … Each layer is home to a different era's flora'이다. 다섯 단을 다섯 개의 단애선으로 그렸다. 바깥 단과 꼭대기 단은 닫힌 고리이고, 가운데 세 단은 북쪽에만 드러나 끝이 이웃 단으로 잦아든다. 단 사이는 9 단위 이상이다. 이 지도의 추정은 바위의 크기와 모양이다. 숲 안쪽에 두고, 남쪽은 한 벽으로 합쳐지고 북쪽에 단이 드러나게 했다. 아트북의 폭포는 세계 지도 축척에 비해 너무 작고 BFZ 이후 상태도 불분명해 그리지 않았다.
- **가스 분출구·마그마 간헐천** (`akoum-vent-*` 네 곳, 분출구 기호): 근거는 PG 개요(2009) 'Gases occasionally spew from the ground … magma geysers erupt unexpectedly'와 Cinder Glade(BFZ) 'bizarre vegetation clusters around gas vents'이다. 이 지도의 추정은 네 자리 모두다(용암 들판 안, 오라 온다르 남쪽 분지, 서부 내륙, 남부). 라이프 블룸은 1~2년이면 사라져(PG) 숲은 그리지 않았다.
- **화산 유리 첨탑·물밑 결정 초** (`akoum-glass-spire-*`, `akoum-reef-*`): 근거는 PG: Akoum 'Deadly Coasts'('spires of volcanic glass', 'jagged underwater crystals, essentially invisible', 'The eastern shores are safest')와 아트북 'Spires of volcanic glass jut from the sea'이다. 이 지도의 추정은 자리 모두다. 서·북·남쪽 앞바다에만 두고 '그나마 가장 안전한' 동쪽 해안에는 두지 않았다. 북쪽 만 어귀의 첨탑과 암초(1945,368)는 Eye of Ugin 자식 지도의 첨탑·암초와 같은 자리다. 해마다 바뀌는 해안선은 그릴 수 없어 설명에만 남긴다.

## 온두 (Agadeem·Beyeen·Jwar 포함)

## 온두 (src/data/landscape/ondu.ts)
- **마킨디 협곡의 급류** (`makindi-north-river`, `makindi-west-river`, 지류 `makindi-west-branch`): 근거는 PG: Ondu(2009)의 'some terminating in whitewater rivers, others ending in bare rock', 'Fast-moving whitewater rivers course through many branches of the Trenches'. 공식 자료에는 물길이 나오지 않는다. **추정**: 북쪽 갈래는 Omnath 메사 북쪽에서 북쪽 해안의 만으로, 서쪽 갈래는 서쪽 협곡 무늬의 결을 따라 서해안의 만으로 흐르게 했다. 맨바위로 끝나는 협곡도 있으므로 모든 갈래에 강을 두지는 않았다.
- **고원의 굽이치는 강** (`ondu-east-plateau-river`, `ondu-west-plateau-river`): 근거는 Prairie Stream(BFZ)의 'a vast plateau crisscrossed by deep trenches and meandering rivers'. 대륙 단위의 서술뿐이다. **추정**: 하나는 동쪽 고원에서 남동 해안의 긴 만 안쪽 끝으로, 다른 하나는 마킨디 남쪽 고원에서 팬 지도의 두 숲 사이 트인 땅을 지나 서해안으로 흐르게 했다.
- **마킨디 메사** (`makindi-mesas`, 메사 기호): 근거는 PG의 'Throughout the canyons and plateaus of Makindi…', Prairie Stream의 'a vast plateau crisscrossed by deep trenches', ZNR 대지면 카드 Makindi Mesas(마킨디 메사). PG의 'a high mesa of Ondu'는 Prison of Omnath의 메사를 말하는 문장이어서 여기 근거로 쓰지 않았다. **추정**: 범위는 협곡 무늬가 성긴 마킨디 동남쪽 가장자리에서 동쪽 고원까지로 잡았다. 협곡이 빽빽한 서쪽·북쪽과 변화림은 덮지 않는다.
- **Omnath 감옥의 메사·숲·늪** (`prison-of-omnath-mesa` 절벽 고리, `prison-of-omnath-forest`, `prison-of-omnath-mire`): 근거는 PG의 'a real site on a high mesa of Ondu has been dubbed the Prison of Omnath', 'the top of a soaring Onduan mesa, through the dense forest that crowns it, and into a murky mire at the grove's heart'. 자리는 팬 지도의 Prison of Omnath 점을 따랐다. **추정**: 메사의 둘레와 숲·늪의 크기는 이 지도가 정했다.
- **Crypt of Agadeem을 둘러싼 습지** (`agadeem-marsh`): 근거는 Javad Nasrin 일지(2009)의 'the marshlands that surround the famous Crypt'. 일지에서 가는 순서는 헤드론 들판, 협곡, 습지, Crypt, 북쪽 해안이다. **추정**: 팬 지도의 Crypt 점을 가운데 두고, 협곡 북쪽 가장자리부터 북쪽 해안까지를 습지로 잡았다. 작은 섬이므로 늪 풀포기를 땅 크기에 맞춰 촘촘히 그린다.
- **아가딤 협곡** (`agadeem-ravine` 협곡선, 가지 `agadeem-crypt-canyon` 'Crypt of Agadeem이 깃든 협곡'): 근거는 일지의 'the deep ravine that separates the hedron fields from the marshlands'와 PG의 'Nestled into the canyons on the island of Agadeem is the Crypt'. 협곡이 카비라·헤드론 들판과 Crypt 사이에 있다는 순서는 공식 근거를 따랐다. **추정**: 동서 길이와 Crypt 옆으로 갈라지는 짧은 가지는 이 지도가 정했다. Crypt of Agadeem은 한국어판이 없는 ZEN 시대 이름이라 지형 이름에서도 영어로 둔다.
- **Crown of Talib와 발라쿠트** (`valakut-volcano`, `crown-of-talib-*` 화산 기호 6개): 근거는 PG의 'A ring of jagged, volcanic peaks rises from the center of the island… home to a number of volcanoes, including Valakut… largest and most active peak'. 발라쿠트는 팬 지도 점에 크게 그렸다. **추정**: 나머지 봉우리 여섯은 발라쿠트와 함께 섬 가운데를 두르도록 자리를 골랐다. 고리가 고리로 읽히도록 안쪽(`beyeen-crown-basin`, 트인 땅)에는 기호를 두지 않았다. 고리 안쪽에 대한 공식 서술은 없다.
- **베이인 저지대 우림** (`beyeen-rainforest`): 근거는 PG의 'The lowland valleys of Beyeen are a temperate rainforest'. **추정**: 고리 산 바깥의 낮은 땅 가운데 서쪽 산비탈(Boilbasin)을 뺀 남쪽 기슭과, 줄라포트 둘레의 동쪽을 우림으로 잡았다.
- **피스톤 산** (`beyeen-piston-crag`, 떠 있는 바위 기호): 근거는 PG의 'Other, smaller crags on Beyeen… these "piston" mountains fly up and smash down again unpredictably'. 고리 봉우리와는 다른 바위산이다. **추정**: 고리 동쪽, 줄라포트 북쪽 곶에 하나만 그렸다.
- **Boilbasin 웅덩이** (`boilbasin-pool-*` 간헐천 기호 3개): 근거는 PG의 'massive tide pools that stair-step down the mountainous slope toward the sea… basins that seethe with steam'. 서해안이라는 것까지는 공식 근거다. **추정**: Boilbasin 점에서 서쪽 끝 바다까지 계단처럼 내려가는 웅덩이 셋의 자리는 이 지도가 정했다.
- **좌르 섬의 구덩이** (`jwar-strand-pit`): 근거는 PG의 'a streak of bluish light radiates skyward from the center of Jwar… originates from a deep, seawater-filled pit'와 Hunger(2020)의 'the Strand further off to the island's center'. 섬 가운데라는 공식 서술을 따랐고, 지역 지도(좌르 섬)의 구덩이와 같은 자리다.
- **좌르 섬의 절벽** (`jwar-cliffs`): 근거는 Hunger(2020)의 'worked their way vertically through the stone cliffs'. **추정**: 어느 해안인지는 공식 서술이 없다. 지역 지도의 해석과 맞춰, 하늘거주지가 절벽 위 '위·북동쪽'에 오도록 섬 동쪽 만에서 남쪽을 보고 선 절벽으로 그렸다.
- **좌르를 에워싼 소용돌이 해류** (`jwar-currents-*` 소용돌이 표시 4개): 근거는 PG의 'the swirling Silundi Sea currents… that constantly encircle it'. 섬 둘레 네 방위에 두었다.
- **Serpent's Maw의 거친 바다** (`serpents-maw-storms`): 근거는 PG의 'skirting the storms of Serpent's Maw'와 Hunger의 'the eager winds of the Serpent's Maw'. **추정**: 장소 자체가 추정 자리(온두와 무라사 사이 바다)이므로 그 범위 안에 거친 물결을 그렸다.
- 추정한 지형도 다른 지형과 똑같은 모양으로 그린다. '추정'은 데이터의 `estimate`에만 적고, 범례에는 따로 줄을 두지 않는다.

## 굴 드라즈·발라 게드

## 굴 드라즈 (`src/data/landscape/guul-draz.ts`)
- **하그라 분지의 늪숲** (`hagra-swamp-forest-west`·`-east` = Hagra Swamp, 물에 잠긴 나무와 늪): 근거는 아트북(2016, MTG Wiki 요약)의 "moss-draped trees that shroud the sun under a gloomy canopy … Low trees and rising mist"와 PG(2009)의 "mangrove jungles"다. 이 지도는 하그라 수조 둘레와 말라키르 둘레에 늪숲을 그리고 분지 가운데는 트인 늪으로 남겼다(추정). 팬 지도가 그 두 곳에 나무를 그렸다.
- **조프의 맹그로브** (`zof-mangroves` = Zof Marsh): 아트북은 "northwest coast … enormous mangrove swamp with crimson-colored water"라고 쓴다(북서 해안은 공식). 범위는 이 지도가 조프 늪 자리를 해안에 붙여 잡았다(추정). 진홍빛 물은 단색 화풍이라 그리지 않고 장소 설명에만 적는다.
- **해안 저지대의 정글** (`guul-draz-jungle-southeast`·`-southwest`·`-nimana-east`·`-north`): 근거는 PWG(2009) "tangled jungles … overgrown with trees and roots", Booster Quest!(2009) "jungle proper"·"rainforest", Plane Shift(2016) "wooded regions"다. 공식 자료는 정글의 자리를 밝히지 않는다(추정). 남동쪽은 Booster Quest!의 길(굴 드라즈 가장자리 가까이의 니르카나 전초기지 → 정글 → 말라키르 근처)을 따랐고, 나머지는 펠라카 고리 바깥의 해안 저지대다.
- **펠라카 카르스트의 고리** (`pelakka-karst-west`·`-north`·`-south` = Pelakka Karst, 협곡 기호): 하그라 분지를 둘러싼다는 것은 공식이다(PWG "badlands encircling the Cistern", Booster Quest! "surrounds and feeds a vast inland basin", MTG Wiki 'Pelakka'의 아트북 요약 "surrounds the Hagra Swamp with a labyrinth of narrow canyons … shifting sinkholes"). 띠의 폭과 경계는 이 지도가 팬 지도의 언덕 띠와 두 번째 'PELAKKA KARST' 라벨(말라키르 남서쪽, 약 (1970,1205))을 따라 잡았다(추정). 남쪽 띠는 하그라 분지 남쪽, Lulea 동쪽에서 남동쪽 정글 앞까지다. Lake Jeft 북쪽은 분지가 호수에 닿아 비웠다. 북서 띠는 기존 pelakka-karst 범위가 그리고, 동쪽은 발라 게드와의 경계(Lake of Dust·Bordermire)라 비운다.
- **카르스트의 싱크홀** (`pelakka-sinkhole-west`·`-south`): PWG "limestone gullies, sinkholes", Booster Quest! "a deep sinkhole". 자리는 이 지도가 골랐다(추정).
- **행잉 스웜프의 싱크홀** (`hanging-swamp-sinkhole` = Hanging Swamp): PWG "a giant sinkhole, 20 miles in diameter … north of the Hagra Cistern"(자리는 canon-hint). 떠 있는 물방울 늪은 기호로 그리지 않는다.
- **펠라카 → Lake Jeft 강 둘** (`pelakka-jeft-west`·`-north`, Lake Jeft 에 이어짐): 아트북 "Rivers that flow south out of Pelakka wind their way to Lake Jeft"를 따랐다. 물길은 공식 서술이 없다(추정). 서쪽 강은 팬 지도의 호수 북서쪽 유입 물줄기를 카르스트 서쪽 띠까지 이었고, 북쪽 강은 원문이 강을 여럿(rivers)이라 해서 하나 더 그렸다.
- **니마나 곁의 강** (`nimana-river`): 근거는 PWG "rivers that make the best highways throughout Guul Draz … villages along every major waterway"다. 팬 지도의 니마나 곁 강을 카르스트에서 니마나 만 머리까지 이었다(추정). 이 강을 니마나와 잇는 공식 서술은 없어서 장소에 잇지 않는다.
- **Lake Jeft에서 바다로 나가는 물길 둘** (`jeft-outflow-west`·`-east`)과 **남쪽 해안의 늪·석호** (`jeft-delta-lagoons`): 근거는 PWG "waterways that twist and spread into vast marshes and lagoons", PG "teeming lagoons"다. 나가는 물길도 석호의 자리도 공식 자료에 없어 팬 지도의 남쪽 물줄기를 따라 골랐다(추정). 물길은 Lake Jeft 장소에 잇지 않는다.
- **지열 김** (`hagra-steam-west`·`-east`): Smoldering Marsh(BFZ) "a geothermal swampland"는 대륙 전체를 말할 뿐이다. 하그라의 트인 늪에 둘만 두었고(추정), 하그라 장소에는 잇지 않는다.
- **굴 드라즈–발라 게드 사이 해협** (`scripts/geo/extract_geo.py` 의 `CUTS`): 아트북(2016)이 'The northernmost part of Guul Draz is connected to Bala Ged'라고 하므로 두 땅을 굴 드라즈 북쪽 해안의 동쪽 끝(Lake of Dust)에서만 잇고, 팬 지도에서 동쪽 측면 전체로 붙어 있던 나머지는 남동 해안의 좁은 만을 북서쪽으로 이어 판 해협으로 갈랐다. 해협의 자리·폭·길이는 이 지도의 추정이다. 이어진 땅(약 90단위)은 2009년 가이드의 '수 마일 길이의 늪'이자 2016년의 Lake of Dust로 읽는다.
- 그리지 않는 것: Lake of Dust의 백악 흉터와 마른 강바닥(BFZ 시점), 경계 늪 Bordermire의 늪 기호(ZNR 이후 상태를 알 수 없음), 카르스트의 소용돌이, 이름 없는 수로망 전체.

## 발라 게드 (`src/data/landscape/bala-ged.ts`)
- **Bojuka Bay의 절벽** (`bojuka-cliffs-southwest`·`-north` = Bojuka Bay): 근거는 PG(2009) "waterfalls that cascade down the surrounding cliffs"다. 바다 쪽은 "thousands of trees between it and the ocean"이 막는다고 했으므로 뭍 쪽인 서·남·북 기슭에만 그렸고, 어느 기슭에 둘지는 이 지도가 골랐다(추정). 엘드라지 침공 뒤 만의 모습은 공식 서술이 없다. 절벽은 바위 지형이라 남은 것으로 보고 그렸다(만 자체도 지도에 남아 있다). 폭포는 2009년의 모습이라 그리지 않는다(발라 게드의 강은 BFZ 때 먼지가 되었다). 서·남쪽 절벽은 뒤엉킨 계곡 자식 지도에도 같은 자리에 그린다. 그 지도의 늪 가장자리는 절벽 위에 있다.
- **만과 바다 사이의 나무 띠**: `extract_geo.py`가 만을 바다에서 9단위 떨어지게 잘라, 팬 지도 숲(Guum Wilds)의 나무가 그 띠에 선다(PG 2009). 만의 자리와 모양은 팬 지도 그대로다.
- **surrakar의 석회암 언덕** (`surrakar-limestone-hillocks` = Surrakar caves, 언덕 기호 몇 개): 근거는 PG(2009) "limestone outcroppings … dotted with cave mouths … the limestone hillocks"다. 아트북(2016)은 같은 노두를 과거형으로 적는다. 침공 뒤에도 남았다고 본 근거는 Nissa's Resolve(2015)다. 니사가 엘드라지가 휩쓴 발라 게드에서 "the partially collapsed and corrupted mouth of a surrakar tunnel"을 찾는다. 그래서 동굴 입구가 뚫린 바위 노두만 Surrakar caves 둘레에 듬성듬성 그렸다(범위는 추정). 같은 이야기에서 뒤엉킨 계곡의 언덕은 사라졌으므로 뒤엉킨 계곡에는 언덕을 그리지 않는다.
- **되살아난 늪** (`guum-bog-surrakar`·`guum-bog-riverroot`): PG(2009)는 "algae-choked marshes"가 발라 게드를 정의한다고 쓰고, Sanguine Syphoner(FDN, 2024)는 "As life returned to the bogs of Bala Ged"라고 쓴다. 자리는 이 지도가 골랐다(추정). 하나는 "surrakar … never far from either their caves or a bog"를 따라 언덕 남동쪽에, 하나는 코르 제국 말기 이야기의 Riverroot 나무 동쪽 늪(Beneath Riverroot Tree, 2020)을 따라 마을 동쪽 곁에 두었다. 둘 다 뒤엉킨 계곡 자식 지도의 범위(x 2165–2300, y 990–1090) 밖이다. 그 지도가 그리지 않는 늪이 범위 안에 들어가지 않게 했다.
- 그리지 않는 것: Umung River의 물길과 계단식 급류·폭포(2009년 모습, ZNR 이후 서술 없음), 뒤엉킨 계곡의 가파른 언덕(BFZ에서 사라짐), 조라가의 구름 고원(대륙이 밝혀지지 않음), Slim Blade(소설에만 나옴), 동굴·터널 기호.

## 두 대륙의 이음목
- 아트북의 "The northernmost part of Guul Draz is connected to Bala Ged"는 아직 반영하지 못했다. 땅이 한 덩어리로 이어져 있어, 대륙 경계(area)만 고쳐서는 좁은 목을 만들 수 없다. 해협을 파면 팬 지도에 없는 해안선을 지어내게 된다.
