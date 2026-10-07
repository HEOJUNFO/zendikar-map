# 레퍼런스 정리

## asset/ 이미지 인덱스

팬이 손으로 그린 "Planar Map of Zendikar"다. 흑백 잉크로 그렸고 숲 영역에만 청록 채색이 있다. **공식 지도가 아니며**, 원본은 수정하지 않는다.

| 파일 | 내용 |
| --- | --- |
| `planar-map-of-zendikar-v0-kx4omcy09xlb1.webp` | 전체도 (1080×760) |
| `planar-map-of-zendikar-v0-0yxp1i219xlb1.webp` | 북서 사분면을 2배로 확대 |
| `planar-map-of-zendikar-v0-96g2u3619xlb1.webp` | 북동 사분면을 2배로 확대 |
| `planar-map-of-zendikar-v0-czuwb9c19xlb1.webp` | 남동 사분면을 2배로 확대 |
| `planar-map-of-zendikar-v0-egk3rh919xlb1.webp` | 남서 사분면을 2배로 확대 |

사분면 이미지 넷은 전체도를 정확히 4등분해 2배(축척 약 0.503)로 확대한 것이다. SIFT 특징점으로 전체도에 정합하면 2160×1520 모자이크가 된다.

## 지형 데이터 추출 (`scripts/geo/extract_geo.py`)

팬 지도에서 해안선, 숲, 내해를 뽑아 `src/data/geo/*.json`으로 저장한다. 다시 돌리려면 `python3 scripts/geo/extract_geo.py`를 실행한다. opencv-python과 numpy가 필요하다.

1. **모자이크**: 사분면 4장을 전체도에 정합해 2배 해상도로 이어 붙인다.
2. **육지**
   - 잉크(회색값 < 170)를 벽으로 삼아 바다를 flood fill하고, 나머지를 육지로 본다.
   - 바다 위 글자(대륙명, 제목, 섬 이름)는 미리 지운다(`OCEAN_TEXT`).
   - 해안선이 끊긴 하구는 다각형으로 막는다(`SEALS`).
   - 틈을 메우는 반경은 영역마다 다르다(`CLOSE_RADIUS`). 남동 대륙은 11(위로 솟은 Bala Ged 북단까지), 중앙 군도는 1이고, Nimana 만은 메워지지 않게 1로 둔다.
3. **숲**: 옅은 청록 채색의 밀도로 영역을 잡는다. 사분면 이음매(y≈766)에서 채색이 끊기는 곳은 아래쪽에서 이어 붙인다.
4. **내해**
   - Halimar(Tazeem)와 Bojuka Bay(Bala Ged)는 테두리 안쪽을 flood fill해서 잡는다.
   - Lake Jeft(Guul Draz)는 테두리가 옅은 파란 선이라 타원으로 근사한다.
5. **배치 조정**(`LAYOUT`): 공식 설정과 어긋나는 대륙 배치를 덩어리째 옮긴다. 근거는 `docs/lore.md`의 '공식 세계 지도는 없다' 절에 있다. 모양은 그대로 두고 자리만 옮기며, Murasa만 0.8배로 줄였다. 지도 화면은 2400×1700으로 넓혔다.
6. **지명 좌표 변환**(`scripts/geo/relocate.py`): 팬 지도 좌표로 적힌 지명을 옮긴 배치에 맞춘다. 점이 속한(또는 가장 가까운) 원래 덩어리의 변환을 쓴다.

손글씨 라벨 판독, 설정 대조, 데이터 작성은 조사 워크플로로 했다. 대륙마다 1차 조사를 하고, 이를 다시 검증하면서 데이터를 작성했다.

## 배치 조정 요약

| 덩어리 | 팬 지도 | 이 지도 |
| --- | --- | --- |
| Sejiri | 맨 위 | 맨 위 (가운데로 이동) |
| Ondu 본토 | 북서 | 남서 |
| Agadeem·Beyeen·Jwar | 지도 가운데 북쪽의 독립 군도 | Ondu 본토 바로 남쪽 |
| Tazeem | 남서 | 가운데, Guul Draz와 좁은 바다를 사이에 둔 서쪽 |
| Murasa | 남쪽 가운데 | 남쪽 가운데 (0.8배) |
| Akoum, Guul Draz·Bala Ged | 북동, 남동 | 같은 자리 (화면이 넓어진 만큼 이동) |

## 팬 지도 라벨 대조

팬 지도의 손글씨 라벨을 확대해 다시 읽고(판독), 공식 설정과 하나씩 대조한 결과다. 좌표는 데이터에 있다.
- **팬 지도 자리 사용**: 설정과 어긋나지 않아 팬 지도의 자리를 그대로 썼다.
- **설정 서술로 옮김**: 이름은 공식이지만 팬 지도의 자리가 설정 서술과 어긋나 옮겼다. 근거는 장소 패널의 `placementBasis`에 있다.
- **지도에 찍지 않음**: 공식 장소지만 대륙 안의 위치를 알 수 없다.
- **제외**: 공식 지명으로 확인되지 않았거나 장소가 아니다.

### Sejiri

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| Midnight Pass | Midnight Pass | 팬 지도 자리 사용 |
| IKIRAL | Ikiral | 팬 지도 자리 사용 |
| Benthidrix | Benthidrix | 지도에 찍지 않음 |
| SEJIRI | — | 제외: 대륙 이름 라벨(1082,228, 해안 남쪽 바다 위)이다. 개별 지명 항목이 아니라 대륙 프로필(continent)로 반영했다 |
| Soutoulix? | — | 제외: docs/reference.md(전체도 판독)의 오독이다. 확대도에서 같은 라벨은 'Benthidrix'(손글씨라 'Benthidix'처럼 보임)이며 'Soutoulix'라는 공식 지명은 없다. Benthidrix 항목으로 반영했다 |
| Chill Depths | — | 제외: 공식 자료에서는 ZNR 카드 Cleric of Chill Depths(차디찬 심해의 성직자)의 이름에만 나온다. 장소 이름인지, 세지리에 있는지 확인되지 않는다(플레이버는 '북해의 얼음 아래' 도시와 벤티드릭스만 말함). MTG Wiki의 '세지리의 인어 거주지' 서술에는 출처가 없다. 대륙 확인 불가로 제외 |
| Kozilek's Ruin | — | 제외: MTG Wiki만 The Art of Magic: The Gathering – Zendikar(2016)를 출처로 들며, 이번 세션에서 그 원문이나 카드·magic.wizards.com 기사로 확인할 수 없었다. 원문의 고유명사인지 위키 항목 제목인지도 불명이다. 확인 불가로 제외 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Sejiri Skyclave(지도에 찍지 않음), Sejiri Glacier(지도에 찍지 않음), Sejiri Steppe(지도에 찍지 않음)

### Ondu (본토와 세 섬)

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| MAKINDI TRENCHES | Makindi Trenches | 팬 지도 자리 사용 |
| TURNTIMBER FOREST | Turntimber | 팬 지도 자리 사용 |
| Graypelt | Graypelt | 팬 지도 자리 사용 |
| Prison of Omnath | Prison of Omnath | 팬 지도 자리 사용 |
| Cliffhavens | Cliffhaven | 지도에 찍지 않음 |
| AGADEEM | Agadeem | 팬 지도 자리 사용 |
| Hedron Fields | Hedron Fields of Agadeem | 팬 지도 자리 사용 |
| Kabira | Kabira | 팬 지도 자리 사용 |
| Crypt of Agadeem | Crypt of Agadeem | 팬 지도 자리 사용 |
| BEYEEN | Beyeen | 팬 지도 자리 사용 |
| Valakut | Valakut | 팬 지도 자리 사용 |
| Zulaport | Zulaport | 팬 지도 자리 사용 |
| JWAR | Jwar Isle | 팬 지도 자리 사용 |
| ONDU (대륙 제목, 314,318) | — | 제외: 대륙 이름 라벨이다. 지명 항목이 아니라 대륙 프로필로 처리하며, 대륙 라벨 위치는 index.ts가 정한다 |
| Nomads of Silundi Sea (487,424) | — | 제외: 장소가 아니라 집단이다(Art of Zendikar의 'Nomads of the Silundi Sea', 카드 플레이버의 'Jaby, Silundi Sea nomad'). 공식상 이들은 '온두 해안을 따라' 물 위에 살아 북쪽 만이라는 위치가 모순은 아니지만, 지명이 아니므로 peoples로 옮겼다. 바다 이름 실룬디의 바다는 공식 단서가 분명한 남쪽 섬들 곁에 canon-hint로 따로 두었다 |
| Mosscrack (점 327,921) | — | 제외: 2010년 소설 Zendikar: In the Teeth of Akoum에만 나오는 지명으로, 위키 요약 말고는 공식 1차 자료(카드·magic.wizards.com·Plane Shift)에서 확인할 수 없다. 위키 요약끼리도 Tajuru/Joraga home tree로 엇갈린다. 소설 속에서도 엘드라지에 파괴된 마을이다 |
| Throne of Makindi (ZNR #265, 팬 지도 라벨 아님) | — | 제외: 카드명뿐이고 플레이버도 없어 어디에 있는지 공식 서술이 없다. 대륙을 확인할 수 없어 제외 |
| Valakut Stoneforge (ZNR #174, 팬 지도 라벨 아님) | — | 제외: 카드명과 플레이버(타즈 오란)뿐이며 화산 발라쿠트에 있다는 서술이 없다(Sea Gate의 Valakut House도 같은 이름을 쓴다). 위치·대륙 확인 불가 |
| Silundi Isle (ZNR #80, 팬 지도 라벨 아님) | — | 제외: 플레이버가 실룬디의 바다 섬들 일반을 말할 뿐 어느 섬인지 특정할 수 없다. 실룬디의 바다·아가딤 항목에 언급만 했다 |
| Bay of Beyeen (팬 지도 라벨 아님) | — | 제외: 소설을 요약한 MTG Wiki에만 있고 원문 확인 불가 |
| Piston Mountains (팬 지도 라벨 아님) | — | 제외: PG의 '"piston" mountains'는 베이인 바위산에서 봉우리가 떠올랐다 내려찍는 현상의 묘사라 Beyeen 항목에 담았다. 소설 요약의 'Piston Mountains'(Makindi와 Zulaport 사이)는 확인 불가 |
| Whiteshag (팬 지도 라벨 아님) | — | 제외: MTG Wiki의 Turntimber 하위 목록에만 있고 출처가 없다 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Seer's Sundial(설정 서술로 자리 잡음), Wolfbriar(지도에 찍지 않음), Teetering Peaks(지도에 찍지 않음), Boilbasin(설정 서술로 자리 잡음), Faduun(설정 서술로 자리 잡음), Ondu Skyclave(설정 서술로 자리 잡음), Silundi Sea(설정 서술로 자리 잡음), Serpent's Maw(지도에 찍지 않음), Yawning Chasm(지도에 찍지 않음)

### Akoum

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| TEETH OF AKOUM | Teeth of Akoum | 설정 서술로 옮김 |
| Eye of Ugin | Eye of Ugin | 팬 지도 자리 사용 |
| Affa | Affa | 팬 지도 자리 사용 |
| Anowon League | League of Anowon | 팬 지도 자리 사용 |
| SPIKE FIELDS | Spikefields | 설정 서술로 옮김 |
| Goma Fada | Goma Fada | 지도에 찍지 않음 |
| Tal Terig | Tal Terig | 팬 지도 자리 사용 |
| ORA ONDAR | Ora Ondar | 팬 지도 자리 사용 |
| Glasspool | Glasspool | 팬 지도 자리 사용 |
| Ior Ruin | Ior Ruin | 팬 지도 자리 사용 |
| KARGAN LANDS | Kargan tribal lands | 팬 지도 자리 사용 |
| AKOUM | — | 제외: 대륙 이름 표제 라벨이라 지명 항목이 아니다(continent 프로필로 반영) |
| Grip Haven | — | 제외: '고블린 헤이븐'이라는 설명이 Art of Magic: Zendikar를 인용한 MTG Wiki에만 있다. 허용된 1차 자료(카드·magic.wizards.com 기사·Plane Shift·Player's Guide)에서 이름도 대륙도 확인하지 못했다 |
| Ghostwatch | — | 제외: 가시지대의 '스톤 헤이븐'이라는 설명이 Art of Magic: Zendikar를 인용한 MTG Wiki에만 있다. 허용된 1차 자료에서 이름도 대륙도 확인하지 못했다 |
| Slab Haven | — | 제외: 공식 이름은 확인된다('Zada of Slab Haven' — Revelation at the Eye 2015, Zada's Commando OGW #120; 한국어판 '석판 피난처의 자다'). 그러나 Slab Haven이 아쿰에 있다는 1차 서술은 없고, 아쿰에서 만난 고블린 자다의 출신지라는 정황뿐이다. 대륙 미확인으로 제외(위치 설명은 Art of Magic 경유 MTG Wiki뿐) |
| Khalni Heart | — | 제외: 2009년 공식 기사(The Moment of Discovery)는 Khalni Heart가 '오라 온다르 숲 한가운데' 숨겨져 있다고 했지만, BFZ 스토리(Nissa's Resolve; Any Cost)의 Khalni Heart는 발라 게드에 '옮겨진' 꽃이고 니사가 가져갔다. 두 서술의 관계가 설명되지 않아 ZNR 시점의 위치·대륙을 확정할 수 없다. 팬지도 위치(숲 북동쪽)도 '숲 한가운데'와 맞지 않는다. 별도 지점 대신 오라 온다르 history에 기록했다 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Windblast Gorge(지도에 찍지 않음), Rogah Throughway(지도에 찍지 않음), Akoum's Belt(지도에 찍지 않음), Pass of Woe(지도에 찍지 않음), Fort Keff(지도에 찍지 않음), Sawtooth Ridge(지도에 찍지 않음), Akoum Skyclave(지도에 찍지 않음)

### Tazeem

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| Sea Gate | Sea Gate | 팬 지도 자리 사용 |
| HALIMAR | Halimar | 팬 지도 자리 사용 |
| ORAN RIEF | Oran-Rief | 팬 지도 자리 사용 |
| Umara River | Umara River | 설정 서술로 옮김 |
| THE BULWARK | The Bulwark | 팬 지도 자리 사용 |
| Calcite Flats | Calcite Flats | 팬 지도 자리 사용 |
| Coralhelm | Coralhelm | 설정 서술로 옮김 |
| Ula Temple | Ula Temple | 설정 서술로 옮김 |
| Hada | North Hada | 설정 서술로 옮김 |
| Maogsi | Magosi Falls | 지도에 찍지 않음 |
| Enclave | Merfolk Enclave | 지도에 찍지 않음 |
| Tikal Harborage | Tikal Harborage | 지도에 찍지 않음 |
| Sunspring | The Sunspring | 지도에 찍지 않음 |
| TAZEEM | — | 제외: 대륙 이름 라벨 — 지명 항목이 아니라 대륙 라벨(타짐)로만 쓴다 |
| Hadatown (1차 조사 후보) | — | 제외: Worldwake 플레이어 가이드(2010)는 '탐사대 생존자가 Hadatown으로 비틀거리며 들어왔다'고만 하고 대륙을 밝히지 않는다(타짐 분류는 MTG Wiki). 대륙 미확인으로 제외 |
| Jade Room (1차 조사 후보) | — | 제외: 2009 가이드 서문의 Chadir 일지는 '할리마르 둑에서 깨어났다', '지하로 몇 마일 쫓겼다'고만 해 Jade Room의 대륙을 명시하지 않는다. 제외 |
| Lun Bulwark (1차 조사 별칭 후보) | — | 제외: Worldwake 플레이어 가이드의 'Lun Bulwark'(염원 근처)가 타짐의 the Bulwark와 같다는 공식 서술이 없고 대륙도 미명시. MTG Wiki가 근거로 드는 Red Route에는 'the Bulwark'만 나온다. 별칭으로 쓰지 않음 |
| Vorik's camp / Vorik's gully (1차 조사 후보) | — | 제외: Slaughter at the Refuge의 임시 피난처를 대화에서 부른 표현일 뿐 고유 지명으로 보기 어렵고, 2015년에 파괴되었다. 제외 |
| Lighthouse at Sea Gate (1차 조사 후보) | — | 제외: 별도 항목 대신 Sea Gate 항목에 포함 — 2009 가이드: '방파제와 등대를 합쳐 Sea Gate라 부른다'. 등대의 댐 위 위치 서술도 출처마다 다르다(2009 동쪽, 2015 도시 한가운데, 2020 도시 입구) |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Sky Rock(설정 서술로 자리 잡음), Emeria(지도에 찍지 않음), Magosi Portage(지도에 찍지 않음), Wren Grotto(지도에 찍지 않음), Ruins of Ysterid(지도에 찍지 않음), Halimar Depths(지도에 찍지 않음), Halimar Sea Caves(지도에 찍지 않음), Umara Skyfalls(지도에 찍지 않음)

### Murasa

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| SUNDER BAY | Sunder Bay | 설정 서술로 옮김 |
| Tumbled Palace | Tumbled Palace | 설정 서술로 옮김 |
| Kazuul Pass | Cliffs of Kazuul | 팬 지도 자리 사용 |
| SKYFANG MOUNTAINS | Skyfang Mountains | 팬 지도 자리 사용 |
| Shatterskull Pass | Shatterskull Pass | 팬 지도 자리 사용 |
| NA PLATEAU | Na Plateau | 팬 지도 자리 사용 |
| Singing City | Singing City | 설정 서술로 옮김 |
| Raimunea Falls | Raimunza Falls | 팬 지도 자리 사용 |
| Raimunea River | Raimunza River | 설정 서술로 옮김 |
| KAZANDU | Kazandu | 팬 지도 자리 사용 |
| PILLAR PLAINS | Pillar Plains | 팬 지도 자리 사용 |
| Thunder Gap | Thunder Gap | 설정 서술로 옮김 |
| Vazi River | Vazi River | 팬 지도 자리 사용 |
| Visimal | Visimal | 팬 지도 자리 사용 |
| Living Spire | Living Spire | 지도에 찍지 않음 |
| MURASA | — | 제외: 대륙 제목 라벨이다. 장소 항목이 아니며 대륙 프로필에 반영했다 |
| KAZUUL MINES | — | 제외: '카줄의 광산(Kazuul's mines)'은 WWK 카드 Hada Freeblade 플레이버로 이름만 확인된다. 위치(성벽 안, 산지의 내륙 쪽)는 물론 무라사라는 대륙도 MTG Wiki가 The Art of Magic: Zendikar를 인용한 내용뿐이라 이번 세션의 1차 자료(카드·PGZ·Plane Shift·ZNR 기사)로 확인하지 못했다 |
| ZOF MARSH | — | 제외: 무라사가 아니라 북동쪽의 굴 드라즈 땅덩어리에 그려진 라벨이다(Zof는 Plane Shift의 'Helix of Zof (Guul Draz)'처럼 굴 드라즈 지명). 무라사 항목에 넣지 않는다 |
| Skyfang Peak | — | 제외: WWK 카드 Summit Apes 플레이버('If you climb Skyfang Peak, avoid the pass')에만 나오며 대륙을 밝히지 않는다. 이름이 하늘이빨과 비슷하다는 것만으로는 무라사로 확정할 수 없다 |
| Zektar Shrine | — | 제외: 'The Moment of Discovery'(2009)는 '검은 돌의 Shatterskull Mountains 높은 곳'이라고만 하고 대륙을 밝히지 않는다. Shatterskull Mountains가 하늘이빨(무라사)과 같은 산맥이라는 공식 근거가 없다 |
| Wall of Omens | — | 제외: PGZ Thunder Gap 항목에서 온두 성직자 Anitan이 '엘프들이 여기 있다던 Wall of Omens는 흔적도 없다'고 할 뿐이다. 실재 여부부터 확인되지 않는다 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Murasa Skyclave(설정 서술로 자리 잡음), Raimunza Hive(설정 서술로 자리 잡음), Blackbloom Lake(설정 서술로 자리 잡음), Kazandu Valley(지도에 찍지 않음), Glint Pass(설정 서술로 자리 잡음), Cipher in Flames(설정 서술로 자리 잡음), Murasa's Wall(지도에 찍지 않음), Grindstone Crucible(지도에 찍지 않음), Doom Maw(지도에 찍지 않음), Silent Gap(지도에 찍지 않음), Tajuru Grove(지도에 찍지 않음)

### Guul Draz

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| Malakir | Malakir | 팬 지도 자리 사용 |
| HAGRA SWAMP | Hagra Swamp | 팬 지도 자리 사용 |
| PELAKKA KARST | Pelakka Karst | 팬 지도 자리 사용 |
| Hagra Cistern | Hagra Cistern | 팬 지도 자리 사용 |
| HANGING SWAMP | Hanging Swamp | 설정 서술로 옮김 |
| Free City of Nimana | Free City of Nimana | 팬 지도 자리 사용 |
| ZOF MARSH | Zof Marsh | 설정 서술로 옮김 |
| Helix of Zof | Helix of Zof | 팬 지도 자리 사용 |
| Lake Jeft | Lake Jeft | 팬 지도 자리 사용 |
| Lulea | Lulea | 팬 지도 자리 사용 |
| guuldraz | — | 제외: GUUL DRAZ (1542,1246): 대륙 제목 라벨. 장소 항목이 아니라 대륙 프로필(continent)에 반영했다 |
| guumwilds | — | 제외: GUUM WILDS: 공식 설정상 발라 게드의 정글(PWG: Bala Ged and Elves 2009). 굴 드라즈 항목이 아니므로 제외하며, 정사 여부와는 무관하게 발라 게드 데이터에서 다룰 라벨이다 |
| umungriver | — | 제외: Umung River: 공식 설정상 발라 게드를 흐르는 강(PWG: Bala Ged and Elves 2009). 굴 드라즈 항목이 아니므로 제외하며, 발라 게드 데이터에서 다룰 라벨이다 |
| tangledvales | — | 제외: Tangled Vales: 공식 설정상 발라 게드 남부의 골짜기들(PWG: Bala Ged and Elves 2009). 굴 드라즈 항목이 아니므로 제외하며, 발라 게드 데이터에서 다룰 라벨이다 |
| bojukabog | — | 제외: Bojuka Bog: 발라 게드 Guum Wilds 가장자리의 늪 만(PWG 표기 'Bojuka Bay', WWK 대지 카드 'Bojuka Bog'). 굴 드라즈 항목이 아니므로 제외하며, 발라 게드 데이터에서 다룰 라벨이다 |
| balaged | — | 제외: BALA GED: 이웃 대륙(발라 게드)의 제목 라벨 |
| Bordermire | — | 제외: 1차 조사 후보(팬 라벨 아님). PWG: Bala Ged and Elves(2009) 탐험 일지에 '발라 게드 가장자리에 닿기 직전' 지난 늪으로만 나와 발라 게드 바깥이라는 것만 알 수 있고, 어느 대륙 소속인지 공식 서술이 없어 제외했다. 두 땅을 가르는 '수 마일 길이의 습지'와 같은 곳인지도 추론일 뿐이다 |
| Forsaken Monument | — | 제외: 1차 조사 후보(팬 라벨 아님). MTG Wiki가 굴 드라즈로 분류하지만 근거가 아티스트의 reddit 글뿐이고, 카드(ZNR) 플레이버에도 위치가 없어 제외했다 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Lake of Dust(설정 서술로 자리 잡음), Guul Draz Skyclave(지도에 찍지 않음), Outpost of Nirkana(지도에 찍지 않음)

### Bala Ged

| 팬 지도 판독 | 공식 이름 | 결과 |
| --- | --- | --- |
| GUUM WILDS | Guum Wilds | 팬 지도 자리 사용 |
| Bojuka Bog | Bojuka Bay | 팬 지도 자리 사용 |
| Tangled Vales | Tangled Vales | 팬 지도 자리 사용 |
| Umung River | Umung River | 팬 지도 자리 사용 |
| BALA GED | — | 제외: 대륙명 타이틀 라벨(2065,1055)이라 지명 항목이 아니다. continent 프로필의 라벨 위치로만 쓴다 |
| Khalni Heart | — | 제외: 팬맵에서 아쿰 Ora Ondar 숲 안(1926,363)에 그려진 라벨이다. 발라 게드에 새로 돋은 Khalni Heart 꽃봉오리(BFZ)는 위치가 공식 서술에 없어 unplaced로 두었고, 대륙이 다른 팬맵 자리는 재사용하지 않는다 |
| Umungshore | — | 제외: 'Marak, hunter of Umungshore'라는 인용 출처 표기에만 나온다. 이름이 Umung을 연상시킬 뿐, 대륙과 위치가 공식 서술로 확인되지 않는다 |
| The Great Hollow Tree | — | 제외: 소설 Zendikar: In the Teeth of Akoum(2010) 전용 지명이다. 원문을 확인하지 못했고 MTG Wiki와 팬 요약 같은 2차 자료뿐이다 |
| The Slim Blade | — | 제외: 같은 소설 전용 지명으로 원문을 확인하지 못했다(2차 요약뿐) |
| Bojuka Route | — | 제외: 지명이 아니라 Bojuka Bay로 들어가는 해로라서 별도 항목 대신 Bojuka Bay의 history에 넣었다. 출발지와 경로는 공식 서술에 없다 |
| Bala Ged Expeditionary House | — | 제외: 발라 게드가 아니라 바다 관문(Tazeem)에 있는 탐험 가문이다. 첫 원정지였던 발라 게드의 이름만 땄다 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Bala Ged Skyclave(지도에 찍지 않음), Surrakar caves(지도에 찍지 않음), Riverroot Village(지도에 찍지 않음), Throne of Obuun(지도에 찍지 않음), Khalni Heart(지도에 찍지 않음), Bala Ged Sanctuary(지도에 찍지 않음), Bordermire(지도에 찍지 않음)

## 대지 카드 — ZEN·WWK·ROE (`src/data/cards.ts`)

Zendikar(2009, #210–229), Worldwake(2010, #132–145), Rise of the Eldrazi(2010, #227–228) 세트의 기본대지가 아닌 대지다. 카드 정보와 그림은 Scryfall에서 가져왔다. 사용자 요청으로 모두 지도에 나온다. 카드 표시는 장소와 같은 기호이고, 누르면 장소 패널과 같은 모양의 카드 패널(`#card/카드id`)이 열린다. 카드 그림·근거·추정은 카드 패널에 있고, 장소 패널에는 그 카드로 가는 링크가 있다.

카드 이름이 이어진 장소의 이름이나 별칭과 같은 10장은 그 장소와 같은 곳이라 따로 나오지 않는다. 지도 표시·검색 결과·대륙 목록에 장소로 한 번만 나오고, 카드 그림과 정보는 장소 패널에 실린다.
- 장소가 지도에 있는 5장(Crypt of Agadeem, Oran-Rief, Valakut, Eye of Ugin, Khalni Garden = Ora Ondar)은 장소 표시를 같이 쓴다.
- 자리가 없는 장소의 5장(Emeria, Magosi Falls, Teetering Peaks, Halimar Depths, Sejiri Steppe)은 카드 표시가 그 장소의 표시가 된다. 표시에는 장소 이름을 달고, 장소 패널에 그 자리를 고른 까닭이 '추정'으로 나온다.

- 공식 근거로 보는 것은 카드 이름이 곧 그 지명이거나(Refuge 대지도 지명을 따서 지었다 — Mark Rosewater, Making Magic 2020-06-22), 공식 자료가 그 그림을 그 장소의 그림이라고 밝힌 경우뿐이다. 플레이버가 대륙을 밝히면(Dread Statuary — 타짐) 그 대륙까지 잇는다.
- 그 근거가 장소나 자리까지 닿지 않는 카드는 이 지도의 판단(추정)으로 잇거나 자리를 골랐다. 패널에 '추정'과 그 이유가 보인다. 공식 가이드·아트북·칼럼이 설명 없이 그림을 실은 절, 공식 스토리의 위치 순서, 카드 이름과 맞는 공식 지형 서술 같은 단서를 따랐다.
- ZEN·WWK·ROE는 한국어판이 없다. 카드의 한국어 이름은 재판(MH2·ZNE·M13 등)의 한국어판에 인쇄된 것만 쓴다. 이는 카드 이름이지 지명이 아니다.
- 조사 결과 지도 데이터에서 'Sejiri Refuge' 정착지 항목을 지웠다. 공식 자료에 그런 장소의 서술이 없고, 카드 이름은 세지리를 딴 것이다.

### ZEN (Zendikar, 2009)

| # | 카드 | 이은 곳 | 지도 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 210 | [Akoum Refuge](https://scryfall.com/card/zen/210/akoum-refuge) | Teeth of Akoum (`teeth-of-akoum`) | [2015, 445] 추정 | 카드 이름이 아쿰을 가리킨다 — Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Mark Rosewater, Making Magic, 2020). **추정:** 아쿰의 어디인지는 공식 자료가 밝히지 않는다. 공식 가이드(PG: Akoum, 2010)가 'Teeth of Akoum' 절 뒤에 이 그림을 실은 것을 따라 이 지도가 아쿰의 이빨에 두었다. |
| 211 | [Arid Mesa](https://scryfall.com/card/zen/211/arid-mesa) | Na Plateau (`na-plateau`) | [1166, 1462] 추정 | 공식 글이 같은 그림을 두 곳에 썼다 — 가이드 개관(2009)은 온두 단락 뒤에, PG: Murasa and Sejiri(2010)는 무라사 Na Plateau 항목 바로 뒤에 실었다(설명 글 없음). **추정:** 두 자리 가운데 항목이 더 구체적인 Na Plateau 쪽을 골라 이 지도가 여기에 두었다. |
| 212 | [Crypt of Agadeem](https://scryfall.com/card/zen/212/crypt-of-agadeem) | Crypt of Agadeem (`crypt-of-agadeem`) | 장소 표시 | 카드 이름이 곧 지명 |
| 213 | [Emeria, the Sky Ruin](https://scryfall.com/card/zen/213/emeria-the-sky-ruin) | Emeria (`emeria`) | [1212, 1048] 추정 | 카드 이름이 곧 지명 **추정:** Emeria는 타짐 하늘을 메운 헤드론 잔해 지대 전체라 한 점이 없다(PG: Tazeem, 2009). 지도의 표시는 그 잔해 지대 한가운데에 두었다. |
| 214 | [Graypelt Refuge](https://scryfall.com/card/zen/214/graypelt-refuge) | Graypelt (`graypelt`) | [471, 1279] | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). 공식 가이드(PG: Ondu, 2009), Magic Story 'Nissa, Worldwaker'(2014), 아트북(2016)이 모두 이 그림을 Graypelt 서술 바로 곁에 실었다. |
| 215 | [Jwar Isle Refuge](https://scryfall.com/card/zen/215/jwar-isle-refuge) | Jwar Isle (`jwar-isle`) | [194, 1451] | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG: Ondu(2009)의 'Jwar, Isle of Secrets' 절과 아트북(2016)의 Jwar 절 바로 뒤에 이 그림이 실렸다. |
| 216 | [Kabira Crossroads](https://scryfall.com/card/zen/216/kabira-crossroads) | Kabira (`kabira`) | [313, 1497] | PG: Ondu(2009)가 Kabira 항목 바로 아래에, 아트북(2016)이 Kabira 서술 곁에 이 그림을 실었다. |
| 217 | [Kazandu Refuge](https://scryfall.com/card/zen/217/kazandu-refuge) | Kazandu (`kazandu`) | [1340, 1521] | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG: Murasa and Sejiri(2010)가 'Kazandu' 절 바로 뒤에 이 그림을 실었다. |
| 218 | [Magosi, the Waterveil](https://scryfall.com/card/zen/218/magosi-the-waterveil) | Magosi Falls (`magosi-falls`) | [1206, 928] 추정 | 카드 이름이 곧 지명 **추정:** 공식 스토리(Red Route·The Magosi Steps, 2020)가 밝힌 강의 순서 — 할리마르 ← 산호투구 ← 마고시 폭포 ← 상류 협곡 ← 북쪽 고지 — 를 따라, 이 지도가 우마라 강의 산호투구와 하다 북부 사이에 두었다. 거리는 공식 자료마다 달라 정확하지 않다. |
| 219 | [Marsh Flats](https://scryfall.com/card/zen/219/marsh-flats) | Agadeem (`agadeem`) | [337, 1474] 추정 | 공식 칼럼의 여행 일지 'The Journal of Javad Nasrin'(2009)이 카비라에서 북쪽으로 아가딤 섬을 가로지르는 대목(헤드론 지대와 습지를 가르는 협곡으로 들어가기 전날)에 이 그림 조각을 실었다(설명 글 없음). **추정:** 일지가 말하는 'Crypt를 둘러싼 습지'를 따라 이 지도가 카비라 북쪽, Crypt of Agadeem 가까이에 두었다. |
| 220 | [Misty Rainforest](https://scryfall.com/card/zen/220/misty-rainforest) | Guum Wilds (`guum-wilds`) | [2214, 922] 추정 | 공식 글 세 곳이 모두 발라 게드 서술에 이 그림을 실었다 — The World of Zendikar(2009)는 발라 게드 소개 뒤에, PG: Bala Ged and Elves(2009)는 Guum Wilds 항목 뒤에, 아트북(2016)은 Bala Ged 절 첫머리에(모두 설명 글 없음). 엘드라지 침공 전인 2009년의 그림이다. **추정:** PG: Bala Ged and Elves(2009)가 Guum Wilds 항목 뒤에 실은 것을 따라 이 지도가 Guum Wilds에 두었다. |
| 221 | [Oran-Rief, the Vastwood](https://scryfall.com/card/zen/221/oran-rief-the-vastwood) | Oran-Rief (`oran-rief`) | 장소 표시 | 공식 기사 'Ruins of Oran-Rief'(2015)가 이 카드 그림을 처음의 오란리프를 그린 그림으로 소개한다. |
| 222 | [Piranha Marsh](https://scryfall.com/card/zen/222/piranha-marsh) | Hagra Swamp (`hagra-swamp`) | [1965, 1098] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 공식 기사는 '피라냐가 사는 위험한 늪'이라는 분위기만 말한다(Savor the Flavor, 2009). **추정:** 공식 기사 Booster Quest!(2009)의 '펠라카 카르스트가 둘러싼 내륙 분지는 피라냐가 들끓는 늪으로 가득하다'를 따라 이 지도가 하그라 늪에 두었다. |
| 223 | [Scalding Tarn](https://scryfall.com/card/zen/223/scalding-tarn) | Boilbasin (`boilbasin`) | [449, 1505] 추정 | PG: Ondu(2009)가 베이인 섬 절 끝, The Boilbasin 항목(바닷물과 지열 온천이 섞여 김이 끓는 조수 웅덩이)과 탐험 일지 인용문 바로 뒤에 이 그림을 실었다(설명 글 없음). **추정:** 그림이 실린 자리를 따라 이 지도가 Boilbasin 곁에 두었다. 공식 자료가 이 그림을 Boilbasin이라고 밝힌 것은 아니다. |
| 224 | [Sejiri Refuge](https://scryfall.com/card/zen/224/sejiri-refuge) | 대륙 Sejiri | [1150, 130] 추정 | 카드 이름이 세지리를 가리킨다 — Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG(2010)와 아트북(2016)이 세지리의 거점·탐험가 서술 곁에 실었지만 특정 장소를 밝히지는 않는다. **추정:** 카드 표시는 이 지도가 세지리 남쪽 해안 가까이에 두었다. |
| 225 | [Soaring Seacliff](https://scryfall.com/card/zen/225/soaring-seacliff) | 대륙 Murasa | [1110, 1645] 추정 | 지명이 아닌 카드지만, 공식 기사 'The Tyrant of the Cliffs'(2010)가 무라사 해안 절벽 장면에, 아트북(2016)이 무라사 서술 한가운데에 이 그림을 실었다. **추정:** 무라사 안의 어느 해안인지는 밝혀지지 않았다. 아트북이 Raimunza Falls 서술에 실은 것을 따라 이 지도가 그 남쪽 해안 절벽에 두었다. |
| 226 | [Teetering Peaks](https://scryfall.com/card/zen/226/teetering-peaks) | Teetering Peaks (`teetering-peaks`) | [255, 945] 추정 | PG: Ondu(2009)가 Teetering Peaks 항목 바로 아래에 이 그림을 실었다. **추정:** 공식 서술은 'Makindi의 협곡과 고원 곳곳'이라고만 한다. 지도의 표시는 Makindi 협곡 서쪽에 두었다. |
| 227 | [Turntimber Grove](https://scryfall.com/card/zen/227/turntimber-grove) | Turntimber (`turntimber`) | [300, 1250] | PG: Ondu(2009)와 아트북(2016)이 이 그림을 Turntimber 숲 서술 안에 실었다. |
| 228 | [Valakut, the Molten Pinnacle](https://scryfall.com/card/zen/228/valakut-the-molten-pinnacle) | Valakut (`valakut`) | 장소 표시 | 카드 이름이 곧 지명 |
| 229 | [Verdant Catacombs](https://scryfall.com/card/zen/229/verdant-catacombs) | Kazandu (`kazandu`) | [1272, 1572] 추정 | PG: Murasa and Sejiri(2010)가 카잔두의 Root Caves 항목(자디 나무 뿌리가 만든 골짜기에서 땅속으로 열린 틈) 바로 뒤에 이 그림을 실었다(설명 글 없음). **추정:** 카잔두의 Root Caves 항목 뒤에 실린 것을 따라 이 지도가 카잔두의 골짜기에 두었다. 공식 자료가 이 그림을 Root Caves라고 밝힌 것은 아니다. |

### WWK (Worldwake, 2010)

| # | 카드 | 이은 곳 | 지도 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 132 | [Bojuka Bog](https://scryfall.com/card/wwk/132/bojuka-bog) | 대륙 Bala Ged | [2283, 985] 추정 | 카드 이름의 'Bojuka'는 공식 설정 글에서 발라 게드의 지명으로만 나온다 — Guum Wilds 가장자리의 늪 같은 만 Bojuka Bay와, 그 만으로 드는 해로 Bojuka Route(PG: Bala Ged and Elves, 2009; 아트북, 2016). 같은 이름을 쓴 카드 Bojuka Brigand(WWK #51)도 자리를 말하지 않는다. 이 늪이 Bojuka Bay 자체인지, 그림이 어디인지 밝힌 공식 자료는 없다. **추정:** 공식 가이드(2009)는 Bojuka Bay를 'Umung River와 주변 절벽의 폭포들이 흘러드는 거대한 습지'로 묘사한다. 이 묘사와 같은 이름을 따라 이 지도가 Bojuka Bay 곁에 두었으며, 공식 자료가 이 카드를 Bojuka Bay라고 밝힌 것은 아니다. |
| 133 | [Celestial Colonnade](https://scryfall.com/card/wwk/133/celestial-colonnade) | Pillar Plains (`pillar-plains`) | [1320, 1595] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 공식 글 'Worldwake: A Plane in Revolt'(2010)는 '땅 자체가 살아나 정령과 성난 화신이 되어 움직인다'는 문단 뒤에, 월드웨이크 플레이어 가이드(2010)는 '월드웨이크에서는 땅 자체가 적이다'라는 세트 소개 머리에 이 그림을 실었다. 같은 가이드의 'The Ten Coolest Worldwake Cards'도 이 카드를 '젠디카르 곳곳에서 땅 자체가 꿈틀거리며 일어난다'고만 소개한다. **추정:** 위치를 알려 주는 공식 단서가 없다. 돌기둥들이 깨어나는 이 카드에 맞춰, 무라사 성벽의 한 구간이 수천 개의 거대한 돌기둥으로 갈라진 Pillar Plains에 이 지도가 두었다. |
| 134 | [Creeping Tar Pit](https://scryfall.com/card/wwk/134/creeping-tar-pit) | 대륙 Guul Draz | [1590, 1030] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 월드웨이크 플레이어 가이드(2010)는 '두 색 마나를 내면서 생물이 되어 공격하는 월드웨이크 대지 다섯 장'의 예로, 다른 공식 칼럼들은 카드 그림이나 장식으로 이 그림을 실었을 뿐 장소는 말하지 않는다. **추정:** 공식 근거는 없다. 월드웨이크 공식 글 'The Lands Awaken'(2009)이 '변경의 흡혈귀들이 가까이 오는 것은 무엇이든 삼키는 살아 있는 늪지를 피해 말라키르로 몰려든다'고 쓴 굴 드라즈의 늪지를 이 지도가 골랐다(그 글에 이 카드는 나오지 않는다). |
| 135 | [Dread Statuary](https://scryfall.com/card/wwk/135/dread-statuary) | 대륙 Tazeem | [1090, 1050] 추정 | 카드 플레이버 'The last reliable landmark in Tazeem just walked away.'(타짐에 남아 있던 마지막 믿을 만한 지형지물이 방금 걸어가 버렸다)가 이 대지를 타짐의 지형지물이라고 말한다. 타짐 안 어디인지는 공식 자료에 없다. **추정:** 플레이버가 말하는 곳은 '타짐'까지라, 타짐 안의 자리는 이 지도가 정했다. |
| 136 | [Eye of Ugin](https://scryfall.com/card/wwk/136/eye-of-ugin) | Eye of Ugin (`eye-of-ugin`) | 장소 표시 | 카드 이름이 곧 지명이다. 공식 칼럼 'Gods and Monsters'(Savor the Flavor, 2010)는 이 그림을 'Eye of Ugin' 캡션으로 싣고, 엘드라지를 가둔 봉인이 'Eye of Ugin이라 불리는 지하 석실 깊은 곳'에 숨겨져 있다고 설명한다. |
| 137 | [Halimar Depths](https://scryfall.com/card/wwk/137/halimar-depths) | Halimar Depths (`halimar-depths`) | [1269, 1059] 추정 | 카드 이름이 곧 지명이다. 아트북(2016)은 'Halimar Depths'를 바다 관문 댐으로 할리마르 내해의 수위가 오르면서 물에 잠긴 고대 유적들로 설명하고, 이 카드 그림을 'Halimar Depths' 캡션으로 할리마르 내해 절에 실었다. **추정:** 아트북은 물에 잠긴 유적 가운데 일부가 '할리마르 기슭 가까운 비교적 얕은 물속'에 있다고만 한다(자리가 밝혀진 곳은 우마라 강 어귀 근처의 Ula Temple 하나뿐이다). 이를 따라 할리마르 기슭 가까운 물에 둔 것은 이 지도의 추정이다. |
| 138 | [Khalni Garden](https://scryfall.com/card/wwk/138/khalni-garden) | Ora Ondar (`ora-ondar`) | 장소 표시 | 카드 이름이 곧 지명이다 — 공식 카드가 오라 온다르를 Khalni Garden이라 부른다(타주루 역병칼날, ZNR 2020: '칼니 정원인 오라 온다르는 아쿰의 거친 대지 속에서 자라난 것들이 뒤엉켜 있는 곳이다'). 아트북(2016)도 'Ora Ondar, the Khalni Garden' 절 안에 이 그림을 'Khalni Garden' 캡션으로 실었다. |
| 139 | [Lavaclaw Reaches](https://scryfall.com/card/wwk/139/lavaclaw-reaches) | 대륙 Akoum | [1878, 470] 추정 | 아트북 The Art of Magic: The Gathering – Zendikar(2016)이 아쿰 장의 'The Spike Fields' 절(아쿰의 결정 들판) 끝, 'The Teeth of Akoum' 절 바로 앞에 'Lavaclaw Reaches' 캡션으로 이 그림을 실었다(설명 글 없음). **추정:** 아트북이 이 그림을 아쿰 장 'The Spike Fields' 절 끝에 실은 것을 따라 이 지도가 가시지대 곁에 두었다. 공식 자료가 이 그림을 가시지대라고 밝힌 것은 아니다. |
| 140 | [Quicksand](https://scryfall.com/card/wwk/140/quicksand) | 대륙 Guul Draz | [1690, 1110] 추정 | 이 카드가 어디인지 밝힌 공식 자료는 없다. 플레이버 'Not all deaths are etched with mythic meaning and iconic glory.'(모든 죽음이 신화적 의미와 상징적 영광으로 새겨지는 것은 아니다)도 장소를 말하지 않는다. **추정:** 아트북(2016)이 굴 드라즈를 두고 '유사(quicksand)·숨은 싱크홀·식충 식물·독 웅덩이 같은 지형마저 아쿰의 화산 지대만큼 확실히 목숨을 앗는다'고 한 것을 따라 이 지도가 굴 드라즈에 두었다. 이 그림이 굴 드라즈라는 공식 서술은 없다. |
| 141 | [Raging Ravine](https://scryfall.com/card/wwk/141/raging-ravine) | 대륙 Akoum | [1800, 430] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 월드웨이크 공식 글 'The Lands Awaken'(2009)은 '아쿰에서는 돌짐승 무리가 기반암에서 몸을 떼어 내 산비탈을 우르르 내려온다'는 문단 뒤에, 'Booster Quest: The Shaman's Orb'(2010)는 타짐을 무대로 한 싸움에서 '땅이 정령 무리로 일어나는' 장면에 이 그림을 실어(둘 다 설명 글 없음) 한 대륙으로 모이지 않는다. **추정:** 'The Lands Awaken'(2009)이 아쿰의 돌짐승 문단 바로 뒤에 이 그림을 실은 것을 따라 이 지도가 아쿰의 산지에 두었다. 같은 그림을 타짐 장면에 쓴 공식 글도 있어 정확한 곳은 알 수 없다. |
| 142 | [Sejiri Steppe](https://scryfall.com/card/wwk/142/sejiri-steppe) | Sejiri Steppe (`sejiri-steppe`) | [1460, 65] 추정 | 카드 이름이 곧 지명이다. PG: Murasa and Sejiri(2010)는 세지리 전체의 얼음 툰드라를 설명하는 'The Tundra Perilous' 절 바로 뒤에 이 그림을 실었다(설명 글 없음). **추정:** 공식 자료는 이 스텝이 세지리 어디인지 밝히지 않는다. 세지리를 '영구동토 스텝과 바람에 깎인 산들이 있고 깎아지른 절벽이 대륙을 두른 거대한 메사 같은 곳'으로 묘사한 2009년 공식 개요를 따라, 이 지도가 절벽 위 툰드라 고원 안쪽에 두었다. |
| 143 | [Smoldering Spires](https://scryfall.com/card/wwk/143/smoldering-spires) | 대륙 Akoum | [1790, 540] 추정 | 카드 이름은 지명이 아니고 플레이버도 없으며, 이 그림을 어느 대륙이나 장소 서술에 실은 공식 글도 찾지 못했다. **추정:** 아트북(2016)의 아쿰 장 첫머리는 '뾰족한 산봉우리들이 중력을 거스르는 아치와 첨탑을 이고 높이 솟아 있고' '마그마가 끓어 흐르는 심연'이 있다고 한다. 공식 가이드(PG: Akoum, 2010)도 아쿰을 '화산 대륙'이라 부른다. 이를 따라 이 지도가 아쿰에 두었다. 이 그림이 아쿰이라는 공식 서술은 없다. |
| 144 | [Stirring Wildwood](https://scryfall.com/card/wwk/144/stirring-wildwood) | Turntimber (`turntimber`) | [390, 1300] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 공식 글은 이 카드를 월드웨이크 미리보기('A Brief History of Tap Lands', 2010)와 '이 주의 배경화면'(2010)으로 소개하고, 디자인 칼럼에 장식 그림으로 실었을 뿐 어느 숲인지 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서가 없다. 숲이 깨어나 움직이는 이 카드에 맞춰, 나무가 나선으로 치솟고 늘 삐걱이는 온두의 Turntimber(PG: Ondu, 2009)에 이 지도가 두었다. |
| 145 | [Tectonic Edge](https://scryfall.com/card/wwk/145/tectonic-edge) | 대륙 Tazeem | [1220, 1210] 추정 | 공식 칼럼 'The Look of an Awakening World'(Savor the Flavor, 2010)에서 화자는 '타짐 남부의 헤드론이 널린 초원'에 둔 장비 은닉처를 말하며 '그런데 지금 지각판 하나가 갑자기 그 일대를 휘청이며 가로지르고 있다고 들었다'고 한다. 칼럼은 이 문단 바로 뒤에 카드 이름과 화가만 적은 캡션을 달아 이 그림을 실었다. 플레이버의 화자 브루스 타를은 아쿰을 떠도는 대상단 고마 파다의 유목민이다. **추정:** 칼럼의 '타짐 남부, 헤드론이 널린 초원'과, 같은 해 Booster Quest: The Shaman's Orb의 '타짐 남부의 헤드론 지대'를 따라 이 지도가 타짐 남쪽 내륙에 두었다. 정확한 자리는 공식 자료에 없다. |

### ROE (Rise of the Eldrazi, 2010)

두 장 모두 어디를 그렸는지 밝힌 공식 자료가 없어 자리는 이 지도의 추정이다. Eldrazi Temple에는 한국어판이 없다.

| # | 카드 | 이은 곳 | 지도 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 227 | [Eldrazi Temple](https://scryfall.com/card/roe/227/eldrazi-temple) | Halimar Depths (`halimar-depths`) | [1258, 1007] 추정 | 카드 이름은 지명이 아니고, 플레이버 'Each temple is a door to a horrible future.'(신전 하나하나가 끔찍한 미래로 가는 문이다)도 장소를 말하지 않는다. 공식 사이트는 이 그림을 ROE 배경화면(2010)과 젠디카르 차원 소개 페이지의 머리 그림으로 설명 글 없이 썼을 뿐이고, 이 카드나 그림을 어느 대륙·장소 서술에 실은 공식 글은 찾지 못했다. **추정:** ROE와 같은 달에 나온 공식 웹코믹 'Enter the Eldrazi' 1부(2010)에서 바다 관문 등대의 인어 현자는 'Halimar Depths에 있는 우리 신전에서 엘드라지가 꿈틀거린 지 열하루가 되었다'고 말하고, 아트북(2016)은 Halimar Depths 항목에서 우마라 강 어귀 근처에 가라앉은 Ula Temple을 두고 이름이 인어의 바다 신 울라와 이어져 있어 노얀 다르가 '엘드라지와 직접 이어져 있을지 모른다'고 믿는다고 쓴다(탐사대는 아직 엘드라지를 찾지 못했다). 이를 따라 이 지도가 이 카드를 Halimar Depths에 잇고 Ula Temple 곁 할리마르 물속에 두었다. 이 카드의 신전이 웹코믹의 신전이나 Ula Temple이라는 공식 서술은 없다. |
| 228 | [Evolving Wilds](https://scryfall.com/card/roe/228/evolving-wilds) (진화하는 야생지) | 대륙 Bala Ged | [2180, 1090] 추정 | 카드 이름은 지명이 아니고, 플레이버 'Every world is an organism, able to grow new lands. Some just do it faster than others.'(모든 세계는 새 땅을 키워 낼 수 있는 유기체다. 다만 어떤 세계는 남보다 빨리 그럴 뿐이다)도 장소를 말하지 않는다. 같은 그림으로 다시 찍힌 Magic 2013(2012) 등의 플레이버(한국어판 '자연은 문명의 손을 빌리지 않아도 언제나 환경에 맞게 변화를 거듭한다.')도 마찬가지이며, 이 그림을 어느 대륙이나 장소 서술에 실은 공식 글도 찾지 못했다. **추정:** Zendikar Rising(2020)의 공식 스토리 'Episode 5: The Two Guardians'는 끝부분에서 '발라 게드가 다시 꽃피며 자라나, 숲이 마법만이 낼 수 있는 속도로 돌아오고 있었다'고 쓴다. 새 땅을 '남보다 빨리' 키워 내는 세계를 말하는 플레이버에 맞춰 이 지도가 발라 게드에 두었으며, 이 그림이 발라 게드라는 공식 서술은 없다. |

## 페이즈1 — ZEN 미식 레어 (`src/data/phase1.ts`)

헤더의 '페이즈1' 단추(주소 `?phase=1`)를 켜면 Zendikar(2009) 세트의 미식 레어 15장이 지도에 오른다. 카드는 설정 근거일 뿐이라 카드 그림을 지도에 붙이지 않는다. 카드의 대상을 판타지 지도처럼 지도 화풍의 그림(`src/map/figures.ts`, 원본은 `scripts/figures/art/`)으로 그린다. 그림 크기는 대상에 맞춘다(크기는 그림의 가장 긴 변, 지도 단위).

- 자리는 대지 카드와 같은 규칙이다. 공식 근거가 닿는 곳에 두고, 닿지 않으면 이 지도의 판단으로 고른 자리를 패널에 '추정'과 그 이유로 적는다.
- 큰 대상(Lorthos, Iona, Ob Nixilis, Rampaging Baloths, Felidar Sovereign, Obsidian Fireheart)은 세계 지도에 그린다. 화면에서 14px 이상일 때만 그린다.
- 사람만 한 대상은 그 지역의 자식 지도에 넣는다(Eye of Ugin: Sorin Markov·Chandra Ablaze, Malakir: Kalitas, Tangled Vales: Nissa Revane, Makindi Trenches: Warren Instigator). 자리가 붐벼 세계 지도에 두면 장소 이름을 가리는 대상도 자식 지도에 넣었다(Eye of Ugin: Eldrazi Monument — 아쿰의 이빨 라벨과 겹침, Jwar Isle: Mindbreak Trap — 좌르 섬의 세 표시 사이). 세계 지도에는 그 범위에 틀과 이름표만 보이고, 틀을 누르면 그 지역을 큰 축척으로 따로 그린 지역 지도(자식 지도)가 세계 지도 자리에 열린다. 자식 지도의 그림은 `scripts/childmaps/art/<id>.js`(→ `src/map/childMaps.ts`)이고, 무엇을 공식 서술에 따라 그렸고 무엇이 이 지도의 해석인지는 아래 '자식 지도' 절에 적는다.
- 작은 사물·생물(Lotus Cobra, Eternity Vessel)은 자식 지도 없이 세계 지도에서 확대하면 보인다. 링크로 열면 그림이 알아볼 만한 크기(가장 긴 변 64px, 최대 배율까지)가 되도록 들어간다.

| # | 카드 | 이은 곳 | 그림 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 12 | [Felidar Sovereign](https://scryfall.com/card/zen/12/felidar-sovereign) (펠리다르 지배자) | 대륙 Sejiri | [900, 55], 크기 28 추정 | 공식 가이드 A Planeswalker's Guide to Zendikar(2009)와 공식 글 The World of Zendikar(2009)는 세지리 단락에서 '펠리다르·그리핀·스핑크스 같은 생물이 눈 덮인 황무지에 산다'고 쓰고, 두 글 모두 그 단락 바로 뒤에 이 그림을 실었다(설명 글 없음). 공식 칼럼의 여행 일지 The Journal of Javad Nasrin(2009)도 펠리다르를 '세지리 극지방의 이름난 주민'이라 부른다(일지가 만난 것은 아가딤 사바나의 금빛 털 펠리다르다). 플레이버의 화자 Hazir는 '세지리 지도 제작자'지만, 이는 화자의 소속일 뿐 그림이 어디인지는 말하지 않는다. **추정:** 공식 자료는 세지리의 '눈 덮인 황무지'까지만 말해, 이 지도가 세지리 툰드라 고원 안쪽에 두었다. 정확한 자리는 공식 자료에 없다. |
| 13 | [Iona, Shield of Emeria](https://scryfall.com/card/zen/13/iona-shield-of-emeria) | Emeria (`emeria`) | [1206, 1025], 크기 34 추정 | 아트북(The Art of Magic: The Gathering – Zendikar, 2016) 타짐 장의 'Emeria, The Sky Ruin' 절은 헤드론 지대의 잔해층 위로 아무도 오르지 못한 까닭의 하나로 'Shield of Emeria라 불리는 천사 아이오나가 늘 탐험가들이 너무 높이 오르지 못하게 막아 왔다'를 들고, 같은 책 인간 절은 타이탄들이 깨어난 뒤 아이오나가 엘드라지와 싸우며 '에메리아의 참된 영역으로 가는 통로를 지켜보던 전통적인 자리'를 버렸다고 쓴다. 'Zendikar: Things Have Changed'(2020)는 대천사 아이오나가 옛 타짐 하늘거주지를 무너뜨려 에메리아 하늘 폐허를 만들었고 '엘드라지와 싸우러 에메리아에서 내려오면서 하늘 폐허를 지키는 이가 없게 되었다'고 쓰며, 첫 원정대가 하늘 폐허에 들어간 것도 '아이오나가 엘드라지와 싸우러 경비 자리를 버린 뒤'라고 쓴다. 카드 '에메리아의 부름'(ZNR, 2020) 한국어판 플레이버는 '이곳을 지키는 것은 더이상 아이오나가 아니다. 우리다.'(에메리아 목동 카슬라의 말)이다. **추정:** 에메리아는 타짐 여러 곳의 하늘을 메운 헤드론 잔해 지대라 한 점이 없고(PG: Tazeem, 2009), 아이오나가 지킨 위층으로 가는 통로의 자리도 공식 자료에 없다. 이 지도가 'Emeria, the Sky Ruin' 카드 표시(잔해 지대 한가운데) 곁에 두었다. |
| 53 | [Lorthos, the Tidemaker](https://scryfall.com/card/zen/53/lorthos-the-tidemaker) | Sunder Bay (`sunder-bay`) | [1033, 1679], 크기 90 추정 | 아트북 The Art of Magic: The Gathering – Zendikar(2016)는 무라사 장의 'Lorthos the Tidemaker' 절에서 Lorthos를 'Sunder Bay 바깥에 사는, 움직임이 조수를 바꿀 만큼 거대한 생물'이라고 쓴다. 공식 가이드 PG: Bala Ged and Elves(2009)는 타주루 대변인 Sutina가 '조수를 바꾸는 괴물 Lorthos가 파괴적으로 수면에 떠오를 때' 산산조각난 만의 절벽에 자주 보인다고 하고, PG: Murasa and Sejiri(2010)는 Sunder Bay 항목에서 harabaz 나무가 '크라켄이나 거대한 바다 괴물 Lorthos가 떠오른 뒤' 밀려드는 거대한 파도를 가른다고 쓰며 그 항목 바로 뒤에 이 그림을 실었다(설명 글 없음). **추정:** 공식 자료는 'Sunder Bay 바깥'까지만 말하고 Lorthos가 살던 깊은 바다의 정확한 자리는 밝히지 않아, 이 지도가 산산조각난 만 바로 앞바다에 두었다. |
| 57 | [Mindbreak Trap](https://scryfall.com/card/zen/57/mindbreak-trap) | 대륙 Ondu | [183, 1449], 크기 12 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 공식 가이드 PG: Ondu(2009)는 'Jwar, Isle of Secrets' 절의 Faduun 항목(과 거기 딸린 인용문) 뒤, 'Strand of Jwar' 항목 바로 앞에 설명 없이 이 그림을 실었고, 아트북(2016)도 'Ancient Sites of Ondu' 절의 'Faduun of Jwar Isle' 서술 끝(다음 'The Crypt of Agadeem' 서술 앞)에 카드 이름과 화가만 적은 캡션으로 실었다. 플레이버의 화자 노얀 다르('타짐 소강마도사')는 화자를 타짐에 잇는 단서일 뿐이고, 아트북은 이 플레이버 문구만 따로 아쿰 장의 'Tal Terig' 절에 실었다. **추정:** 두 공식 글이 모두 좌르 섬의 파둔 서술 바로 뒤에 이 그림을 실은 것을 따라 이 지도가 파둔 곁에 두었다. 아트북은 그 서술에서 파둔을 고대 인간 마법사 결사가 비밀 요새를 지키려고 만든 것이라 하고, Plane Shift(2016)는 엘드라지 이전 시대의 유적이 '흔히 마법 함정으로 지켜진다'며 그런 유적의 예로 파둔을 든다. 이 함정이 좌르 섬에 있다는 공식 서술은 없다. |
| 99 | [Kalitas, Bloodchief of Ghet](https://scryfall.com/card/zen/99/kalitas-bloodchief-of-ghet) | Malakir (`malakir`) | 자식 지도 Malakir, [1998, 1136], 크기 12 | 공식 가이드 개관(A Planeswalker's Guide to Zendikar, 2009)은 흡혈귀 절에서 '혈족장들이 화려한 도시 말라키르를 다스린다'고 쓰고, 굴 드라즈의 다섯 대가문 가운데 하나로 게트를 들며 '게트의 혈족장 칼리타스'의 말을 싣는다. PG: Guul Draz(2009)는 말라키르가 다섯 구역으로 나뉘어 저마다 그 구역을 다스리는 흡혈귀 가문의 이름을 땄다며 그 하나로 게트 구역(Emevera 가문이 물길을 돌려 침수시킨 가난한 구역)을 들고, 대가문마다 다른 혈족장이 다스린다고 쓴다. 이 글은 'Bloodchiefs' 절 바로 뒤에 이 카드 그림을 설명 글 없이 실었다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016)의 말라키르 서술은 게트 구역을 침수된 황량한 폐허로 적고 게트 가문이 칼리타스의 지휘 아래 엘드라지를 섬기게 되었다고 쓰며, BFZ 이야기 'Memories of Blood'(2015)는 드라나가 말라키르를 되찾으며 '칼리타스와 그 배신자들을 도시에서 몰아냈다'고 쓴다. |
| 107 | [Ob Nixilis, the Fallen](https://scryfall.com/card/zen/107/ob-nixilis-the-fallen) | 대륙 Guul Draz | [1745, 1045], 크기 36 추정 | 공식 칼럼 'Booster Quest!'(Savor the Flavor, 2009)는 독자가 탐험대를 이끌고 부스터 팩과 주사위로 진행하는 게임 형식 글이다. 첫 퀘스트에서 Mul Daya 엘프 부족이라고 자칭한 두건 쓴 예언자가 굴 드라즈 어딘가로 이끄는 지도를 건네고, 세 번째 퀘스트 'The Ruins of Hagra'에서 하그라 수조 유적 깊은 곳의 봉인된 석실을 열어 헤드론 유물을 다 맞추자 그 인물이 나타나 망토를 벗고 오브 닉실리스로 정체를 드러낸다. 그는 그 유물로 '잃어버린 자기 플레인즈워커 불꽃을 없앤 이 세계에 복수하겠다'고 말하며, 칼럼은 이 장면 바로 앞에 이 카드 그림의 일부를 설명 글 없이 실었다. 공식 기사 'The Many Looks of Ob Nixilis'(2015)가 공개한 그림 주문서는 이 카드의 장소를 'Swamp environment'(늪 환경)라고만 적고, 뒤의 카드 '풀려난 오브 닉실리스'(M15, 2014)의 장소는 'Guul Draz, Zendikar'라고 적는다. **추정:** Booster Quest!(2009)에서 그가 나타난 하그라 수조 유적을 따라 이 지도가 하그라 수조 곁에 두었다. 독자가 주인공인 게임 형식 칼럼의 한 장면이라 그가 그곳에 머문다는 공식 서술은 없고, 굴 드라즈 안의 정확한 자리는 공식 자료에 없다. |
| 111 | [Sorin Markov](https://scryfall.com/card/zen/111/sorin-markov) (소린 마르코프) | Eye of Ugin (`eye-of-ugin`) | 자식 지도 Eye of Ugin, [1937, 431], 크기 12 | 공식 기사 'The Eldrazi Arisen'(2010)은 흡혈귀 플레인즈워커 소린 마르코프가 우진 등 다른 두 플레인즈워커와 함께 수천 년 전 엘드라지를 젠디카르에 가두었고, 셋이 봉인 주문의 힘을 아쿰 산맥 깊은 곳의 지하 석실 Eye of Ugin에 모은 뒤 석실을 마법 자물쇠로 잠그고 차원을 떠났다고 쓴다. 'Gods and Monsters'(2010)도 소린을 그 셋 가운데 하나로 꼽으며 엘드라지의 감옥을 붙든 자물쇠 주문이 이 석실 깊이 숨겨져 있다고 쓰고, Magic Story 'The Lithomancer'(2014)에서는 나히리와 소린이 이 석실에 Eye of Ugin이라는 이름을 붙인다. 아트북(2016)은 엘드라지 무리가 풀려난 뒤 'Eye of Ugin의 변고에 불려' 마침내 젠디카르에 온 소린이 니사와 함께 Eye of Ugin에 이르러 타이탄의 결박을 되살리려 했다고 쓴다. |
| 120 | [Chandra Ablaze](https://scryfall.com/card/zen/120/chandra-ablaze) | Eye of Ugin (`eye-of-ugin`) | 자식 지도 Eye of Ugin, [1971, 430], 크기 13 | 공식 기사 'The Eldrazi Arisen'(2010)은 화염술사 찬드라가 수수께끼의 두루마리 지도를 따라 젠디카르에 와 값진 유물이라 여긴 전설의 Eye of Ugin을 찾았고, 뒤쫓아 온 제이스가 Eye 석실 안에서 막 사르칸과 맞닥뜨린 찬드라를 따라잡았다고 쓴다. 웹코믹 'Enter the Eldrazi' 1부(2010)의 제이스도 '화염술사 소녀와 용의 싸움은 흡혈귀와 내가 석실에 닿았을 때 이미 벌어지고 있었다'고 말하며, ZEN과 같은 때 나온 웹코믹 'Journey to the Eye' 1부(2009)는 Eye로 가는 찬드라의 길을 아쿰 산맥의 아파 타운에서 시작한다. |
| 140 | [Obsidian Fireheart](https://scryfall.com/card/zen/140/obsidian-fireheart) | Skyfang Mountains (`skyfang-mountains`) | [1100, 1410], 크기 24 추정 | 공식 칼럼 'The Master at Arms'(Savor the Flavor, Doug Beyer, 2009)는 탐험 장비인 마체테가 '하늘이빨(Skyfang Mountains)의 지각을 부수며 나아가는 obsidian fireheart'를 베는 데도 똑같이 잘 든다고 쓴다. 이 카드에는 플레이버 텍스트가 없다. **추정:** 칼럼이 말하는 곳은 하늘이빨까지라, 산맥 안의 자리는 이 지도가 정했다. 정확한 자리는 공식 자료에 없다. |
| 154 | [Warren Instigator](https://scryfall.com/card/zen/154/warren-instigator) | Makindi Trenches (`makindi-trenches`) | 자식 지도 Makindi Trenches, [300, 1000], 크기 9 추정 | 카드 이름은 지명이 아니고, 플레이버 "Danger! Danger! Come out of the safety of your holes!"(위험이다! 위험이다! 안전한 굴 밖으로 나와라!)도 장소를 말하지 않는다. 공식 글 'Instigating the Warrens'(Magic Arcana, 2009)는 이 고블린이 동료들에게 굴(warren)에서 나오라고 외치고 있으며, 그림 위쪽 절벽면에서 고블린들이 고개를 내민 곳이 그 굴이라고 설명하지만 어디인지는 말하지 않는다. **추정:** Magic Arcana(2009)가 이 그림의 굴을 절벽면에 난 것으로 설명한 것과, PG: Goblins(2009)가 '마킨디 협곡에 지어진 고블린 굴은 대부분 드러난 암벽에 지어져 있다'고 쓴 것(아트북 2016도 같은 내용)을 이어 이 지도가 마킨디 협곡에 두었다. 고블린은 아쿰·무라사·온두를 비롯해 곳곳에 살며(가이드 개관, 2009), 이 카드가 마킨디 협곡이라는 공식 서술은 없다. |
| 168 | [Lotus Cobra](https://scryfall.com/card/zen/168/lotus-cobra) (연꽃 코브라) | 대륙 Akoum | [2178, 383], 크기 10 추정 | 연꽃 코브라가 어디 사는지 밝힌 공식 서술은 찾지 못했고, 플레이버 'Its scales contain the essence of thousands of lotus blooms.'(비늘에 수천 송이 연꽃의 정수가 담겨 있다)도, ZNR(2020) 재판의 플레이버도 장소를 말하지 않는다. 아트북 The Art of Magic: The Gathering – Zendikar(2016)는 아쿰 장의 'Ulamog's Devastation' 단락(울라모그의 난동으로 아쿰의 넓은 지역이 파괴되었다는 대목)과 'Life in Akoum' 절 사이에 'Lotus Cobra' 캡션으로 이 그림을 실었다(설명 글 없음). **추정:** 같은 아트북의 아쿰 장이 오라 온다르 숲 한가운데 폭포 속에서 자라는 Khalni Heart를 '연꽃 같은 꽃(lotus-like bloom)'이라고 쓴 것을 따라, 연꽃의 정수를 지녔다는 이 코브라를 이 지도가 오라 온다르에 두었다. 연꽃 코브라가 그곳에 산다는 공식 서술은 없다. |
| 170 | [Nissa Revane](https://scryfall.com/card/zen/170/nissa-revane) | 대륙 Bala Ged | 자식 지도 Tangled Vales, [2222, 1050], 크기 12 추정 | 이 카드가 나온 해(2009)의 공식 가이드 'A Planeswalker's Guide to Zendikar'는 'Bala Ged is the homeland of the Joraga elves and the planeswalker Nissa Revane.'(발라 게드는 조라가 엘프와 플레인즈워커 니사의 고향이다)라고 쓰고, 아트북(2016)도 니사를 '발라 게드 태생의 조라가 부족 엘프'로 소개한다. 니사가 소린과 함께 Eye of Ugin에 이르러 타이탄들의 마지막 결박을 끊은 것은 그 뒤 엘드라지 타이탄들이 풀려날 때의 일이다(아트북, 2016). **추정:** 공식 가이드 PG: Bala Ged and Elves(2009)는 발라 게드 남부의 뒤엉킨 계곡에 '조라가 엘프 씨족들이 터전을 이룬다'고 하고, Magic Story 'Nissa's Resolve'(2015)의 니사는 대륙 깊숙한 곳의 옛 조라가 마을을 떠나 예전에 수없이 사냥하던 뒤엉킨 계곡을 지난다. 이를 따라 이 지도가 뒤엉킨 계곡에 두었다. 니사의 옛 마을이 정확히 어디였는지는 공식 자료에 없다. |
| 178 | [Rampaging Baloths](https://scryfall.com/card/zen/178/rampaging-baloths) | 대륙 Ondu | [345, 1274], 크기 50 추정 | 공식 가이드 PG: Ondu(2009)는 Turntimber 절의 야생 생물 단락('이곳의 최상위 포식자는 baloth다') 바로 뒤에 이 그림을 설명 없이 실었다. 아트북(2016)은 'Rampaging Baloths'(Eric Deschamps — 이 카드의 프리릴리스 판 화가) 캡션을 단 그림을 Baloths 항목에 싣고, 그 항목에서 'baloth 무리는 이따금 온두의 평원을 가로질러 내달리는데, 엘드라지가 일어난 뒤로는 마치 젠디카르의 분노를 함께 느끼는 듯 더 자주 그런다'고 쓴다(Plane Shift: Zendikar, 2016도 같은 글). 플레이버 'When the land is angry, so are they.'(땅이 성나면 그들도 성난다)의 화자 니사는 발라 게드 출신이지만(가이드 개관, 2009), 이는 화자의 고향일 뿐이다. **추정:** PG: Ondu(2009)가 이 그림을 Turntimber 절의 baloth 단락 바로 뒤에 실은 것을 따라 이 지도가 변화림(Turntimber)에 두었다. 공식 자료가 이 그림을 변화림이라고 밝힌 것은 아니며, 아트북이 무리가 내달린다고 한 '온두의 평원'이 어디인지도 밝혀지지 않았다. |
| 199 | [Eldrazi Monument](https://scryfall.com/card/zen/199/eldrazi-monument) | Teeth of Akoum (`teeth-of-akoum`) | [1985, 455], 크기 18 추정 | 이 카드를 다룬 공식 칼럼 'Monument to a Lost Age'(Savor the Flavor, 2009)는 '아쿰의 이빨로 들어가는 긴 탐험' 중에 아쿰의 날카로운 화강암 비탈을 오른 탐험가가 '아쿰에서 가장 큰, 어쩌면 젠디카르 전체에서 가장 큰 떠 있는 유적 지대'에서 이 석상을 발견하는 이야기를 싣고, 그 대목에 이 그림을 실었다. **추정:** 그 떠 있는 유적 지대가 아쿰의 이빨 어디인지는 공식 자료에 없어, 이 지도가 아쿰의 이빨 안에 자리를 골랐다. |
| 200 | [Eternity Vessel](https://scryfall.com/card/zen/200/eternity-vessel) | Calcite Flats (`calcite-flats`) | [1140, 1185], 크기 8 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 없다. 플레이버가 없고, 공식 소개 글 'Deadly Perils, Priceless Treasures'(2009)는 젠디카르 전체를 소개하는 문단('규칙이 깨지는 곳… 젠디카르의 마나마저 남다르다') 뒤, 'The Roil' 절 앞에 설명 없이 이 그림을 실었을 뿐이다. 공식 칼럼 Ally Cuisine(2009)도 Vampire Hexmage를 풀이하며 'Eternity Vessel을 고갈시킬 수 있다'고 예로 들 뿐 장소는 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서가 없다. 생명점을 되돌려 주는 이 카드에 맞춰, 아트북(2016)이 '독과 병을 몰아내고 치명상까지 아물게 하는 강력한 치유 마법'을 품었다고 쓰고 Plane Shift(2016)가 엘드라지 이전 시대 유적으로 꼽은 Sunspring(Calcite Flats의 외딴 곳, 우뚝 솟은 Bulwark 아래) 곁에 이 지도가 두었다. 이 그릇이 Sunspring과 이어져 있다는 공식 서술은 없다. |

## 지형 생성 참고 repo (`references/`, git 제외)

`pnpm refs`로 받는다(없으면 clone, 있으면 pull). FMG를 로컬에서 띄우려면 `pnpm refs:fmg`를 실행한다. 주소는 http://localhost:5180/Fantasy-Map-Generator/ 이고, 호스팅 버전은 https://azgaar.github.io/Fantasy-Map-Generator/ 이다.

### Azgaar/Fantasy-Map-Generator (MIT, TS + Vite + d3, SVG 출력)
이 프로젝트와 관련 있는 부분은 다음과 같다.
- `src/generators/heightmap-generator.ts`, `coastline-generator.ts`, `river-generator.ts`, `biomes-generator.ts`: 지형 생성 파이프라인
- `src/renderers/draw-relief-icons.ts`와 `src/assets/icons/relief/{gray,simple,…}`: 산·숲 아이콘을 흩뿌리는 방식. 손그림 산맥과 숲 표현에 바로 참고할 수 있다.
- `src/renderers/heightmap-hachures.ts`: 잉크 해칭(hachure)으로 경사 표현
- `src/renderers/draw-coastline.ts`, `draw-coastal-bands.ts`, `draw-texture.ts`: 해안선, 해안 띠, 양피지 질감
- `src/renderers/labels/`: 지명 라벨 배치

### mewo2/terrain (MIT, 2016, `terrain.js` 단일 파일, d3 v4)
Martin O'Leary의 판타지 지도 생성기다. 설명 글은 https://mewo2.com/notes/terrain/ 에 있다. 코드가 짧아서 알고리즘을 이해하기 좋다.
- 메시: `generateGoodMesh`(Voronoi + Lloyd relaxation)
- 지형과 침식: `mountains`, `doErosion`, `fillSinks`, `cleanCoast`
- 해안선과 강: `contour`, `getRivers`, `relaxPath`(곡선을 자연스럽게 다듬기)
- 손그림 표현: `visualizeSlopes`(경사 해칭 선)
- 라벨: `drawLabels`(지명이 겹치지 않게 배치)
