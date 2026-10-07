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
| Ghostwatch | — | 제외: The Art of Magic: Zendikar(2016)는 가시지대 한가운데 드러난 요새 폐허 Stone Havens 가운데 하나라고 밝히지만(가시지대 `history`에 적음), 가시지대 안의 자리는 공식 자료에 없다. 팬 지도 자리(세계 좌표 약 1616,499)는 지도의 가시지대 범위에서 한참 밖이라 쓰지 않았다 |
| Slab Haven | — | 제외: 공식 이름은 확인된다('Zada of Slab Haven' — Revelation at the Eye 2015, Zada's Commando OGW #120; 한국어판 '석판 피난처의 자다'). 그러나 Slab Haven이 아쿰에 있다는 1차 서술은 없고, 아쿰에서 만난 고블린 자다의 출신지라는 정황뿐이다. 대륙 미확인으로 제외(위치 설명은 Art of Magic 경유 MTG Wiki뿐) |
| Khalni Heart | — | 제외: 2009년 공식 기사(The Moment of Discovery)는 Khalni Heart가 '오라 온다르 숲 한가운데' 숨겨져 있다고 했지만, BFZ 스토리(Nissa's Resolve; Any Cost)의 Khalni Heart는 발라 게드에 '옮겨진' 꽃이고 니사가 가져갔다. 두 서술의 관계가 설명되지 않아 ZNR 시점의 위치·대륙을 확정할 수 없다. 팬지도 위치(숲 북동쪽)도 '숲 한가운데'와 맞지 않는다. 별도 지점 대신 오라 온다르 history에 기록했다 |

팬 지도에 없지만 공식 자료에서 찾아 더한 곳: Windblast Gorge(설정 서술로 자리 잡음), Rogah Throughway(추정 자리), Akoum's Belt(추정 자리), Pass of Woe(추정 자리), Fort Keff(추정 자리), Sawtooth Ridge(추정 자리), Akoum Skyclave(추정 자리)

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
| PELAKKA KARST | Pelakka Karst | 팬 지도 자리 사용. 팬 지도는 말라키르 남서쪽(지도 약 (1970,1205))에 'PELAKKA KARST' 를 한 번 더 적었다 — 장소 자리는 첫 라벨을 쓰고, 둘째 라벨은 카르스트 고리의 남쪽 띠(`pelakka-karst-south`)를 잡는 데 썼다 |
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
| Khalni Heart | — | 제외: 팬맵에서 아쿰 Ora Ondar 숲 안(1926,363)에 그려진 라벨이다. 발라 게드에 새로 돋은 Khalni Heart 꽃봉오리(BFZ)는 위치가 공식 서술에 없어 이 지도가 자리를 고른 추정 위치(`estimate`, 아래 '추정 위치' 표)로 두었고, 대륙이 다른 팬맵 자리는 재사용하지 않는다 |
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
| 213 | [Emeria, the Sky Ruin](https://scryfall.com/card/zen/213/emeria-the-sky-ruin) | Emeria (`emeria`) | [1212, 928] 추정 | 카드 이름이 곧 지명 **추정:** Emeria는 타짐 하늘을 메운 헤드론 잔해 지대 전체라 한 점이 없다(PG: Tazeem, 2009). 지도의 표시는 그 잔해 지대 한가운데에 두었다. |
| 214 | [Graypelt Refuge](https://scryfall.com/card/zen/214/graypelt-refuge) | Graypelt (`graypelt`) | [471, 1279] | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). 공식 가이드(PG: Ondu, 2009), Magic Story 'Nissa, Worldwaker'(2014), 아트북(2016)이 모두 이 그림을 Graypelt 서술 바로 곁에 실었다. |
| 215 | [Jwar Isle Refuge](https://scryfall.com/card/zen/215/jwar-isle-refuge) | Jwar Isle (`jwar-isle`) | [194, 1451] | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG: Ondu(2009)의 'Jwar, Isle of Secrets' 절과 아트북(2016)의 Jwar 절 바로 뒤에 이 그림이 실렸다. |
| 216 | [Kabira Crossroads](https://scryfall.com/card/zen/216/kabira-crossroads) | Kabira (`kabira`) | [313, 1497] | PG: Ondu(2009)가 Kabira 항목 바로 아래에, 아트북(2016)이 Kabira 서술 곁에 이 그림을 실었다. |
| 217 | [Kazandu Refuge](https://scryfall.com/card/zen/217/kazandu-refuge) | Kazandu (`kazandu`) | [1338, 1528] | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG: Murasa and Sejiri(2010)가 'Kazandu' 절 바로 뒤에 이 그림을 실었다. |
| 218 | [Magosi, the Waterveil](https://scryfall.com/card/zen/218/magosi-the-waterveil) | Magosi Falls (`magosi-falls`) | [1203, 839] 추정 | 카드 이름이 곧 지명 **추정:** 공식 스토리(Red Route·The Magosi Steps, 2020)가 밝힌 강의 순서 — 할리마르 ← 산호투구 ← 마고시 폭포 ← 상류 협곡 ← 북쪽 고지 — 를 따라, 이 지도가 우마라 강의 산호투구와 하다 북부 사이에 두었다. 거리는 공식 자료마다 달라 정확하지 않다. |
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
| 135 | [Dread Statuary](https://scryfall.com/card/wwk/135/dread-statuary) | 대륙 Tazeem | [1090, 930] 추정 | 카드 플레이버 'The last reliable landmark in Tazeem just walked away.'(타짐에 남아 있던 마지막 믿을 만한 지형지물이 방금 걸어가 버렸다)가 이 대지를 타짐의 지형지물이라고 말한다. 타짐 안 어디인지는 공식 자료에 없다. **추정:** 플레이버가 말하는 곳은 '타짐'까지라, 타짐 안의 자리는 이 지도가 정했다. |
| 136 | [Eye of Ugin](https://scryfall.com/card/wwk/136/eye-of-ugin) | Eye of Ugin (`eye-of-ugin`) | 장소 표시 | 카드 이름이 곧 지명이다. 공식 칼럼 'Gods and Monsters'(Savor the Flavor, 2010)는 이 그림을 'Eye of Ugin' 캡션으로 싣고, 엘드라지를 가둔 봉인이 'Eye of Ugin이라 불리는 지하 석실 깊은 곳'에 숨겨져 있다고 설명한다. |
| 137 | [Halimar Depths](https://scryfall.com/card/wwk/137/halimar-depths) | Halimar Depths (`halimar-depths`) | [1269, 939] 추정 | 카드 이름이 곧 지명이다. 아트북(2016)은 'Halimar Depths'를 바다 관문 댐으로 할리마르 내해의 수위가 오르면서 물에 잠긴 고대 유적들로 설명하고, 이 카드 그림을 'Halimar Depths' 캡션으로 할리마르 내해 절에 실었다. **추정:** 아트북은 물에 잠긴 유적 가운데 일부가 '할리마르 기슭 가까운 비교적 얕은 물속'에 있다고만 한다(자리가 밝혀진 곳은 우마라 강 어귀 근처의 Ula Temple 하나뿐이다). 이를 따라 할리마르 기슭 가까운 물에 둔 것은 이 지도의 추정이다. |
| 138 | [Khalni Garden](https://scryfall.com/card/wwk/138/khalni-garden) | Ora Ondar (`ora-ondar`) | 장소 표시 | 카드 이름이 곧 지명이다 — 공식 카드가 오라 온다르를 Khalni Garden이라 부른다(타주루 역병칼날, ZNR 2020: '칼니 정원인 오라 온다르는 아쿰의 거친 대지 속에서 자라난 것들이 뒤엉켜 있는 곳이다'). 아트북(2016)도 'Ora Ondar, the Khalni Garden' 절 안에 이 그림을 'Khalni Garden' 캡션으로 실었다. |
| 139 | [Lavaclaw Reaches](https://scryfall.com/card/wwk/139/lavaclaw-reaches) | 대륙 Akoum | [1878, 470] 추정 | 아트북 The Art of Magic: The Gathering – Zendikar(2016)이 아쿰 장의 'The Spike Fields' 절(아쿰의 결정 들판) 끝, 'The Teeth of Akoum' 절 바로 앞에 'Lavaclaw Reaches' 캡션으로 이 그림을 실었다(설명 글 없음). **추정:** 아트북이 이 그림을 아쿰 장 'The Spike Fields' 절 끝에 실은 것을 따라 이 지도가 가시지대 안에 두었다. 공식 자료가 이 그림을 가시지대라고 밝힌 것은 아니다. |
| 140 | [Quicksand](https://scryfall.com/card/wwk/140/quicksand) | 대륙 Guul Draz | [1690, 1110] 추정 | 이 카드가 어디인지 밝힌 공식 자료는 없다. 플레이버 'Not all deaths are etched with mythic meaning and iconic glory.'(모든 죽음이 신화적 의미와 상징적 영광으로 새겨지는 것은 아니다)도 장소를 말하지 않는다. **추정:** 아트북(2016)이 굴 드라즈를 두고 '유사(quicksand)·숨은 싱크홀·식충 식물·독 웅덩이 같은 지형마저 아쿰의 화산 지대만큼 확실히 목숨을 앗는다'고 한 것을 따라 이 지도가 굴 드라즈에 두었다. 이 그림이 굴 드라즈라는 공식 서술은 없다. |
| 141 | [Raging Ravine](https://scryfall.com/card/wwk/141/raging-ravine) | 대륙 Akoum | [1800, 430] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 월드웨이크 공식 글 'The Lands Awaken'(2009)은 '아쿰에서는 돌짐승 무리가 기반암에서 몸을 떼어 내 산비탈을 우르르 내려온다'는 문단 뒤에, 'Booster Quest: The Shaman's Orb'(2010)는 타짐을 무대로 한 싸움에서 '땅이 정령 무리로 일어나는' 장면에 이 그림을 실어(둘 다 설명 글 없음) 한 대륙으로 모이지 않는다. **추정:** 'The Lands Awaken'(2009)이 아쿰의 돌짐승 문단 바로 뒤에 이 그림을 실은 것을 따라 이 지도가 아쿰의 산지에 두었다. 같은 그림을 타짐 장면에 쓴 공식 글도 있어 정확한 곳은 알 수 없다. |
| 142 | [Sejiri Steppe](https://scryfall.com/card/wwk/142/sejiri-steppe) | Sejiri Steppe (`sejiri-steppe`) | [1460, 65] 추정 | 카드 이름이 곧 지명이다. PG: Murasa and Sejiri(2010)는 세지리 전체의 얼음 툰드라를 설명하는 'The Tundra Perilous' 절 바로 뒤에 이 그림을 실었다(설명 글 없음). **추정:** 공식 자료는 이 스텝이 세지리 어디인지 밝히지 않는다. 세지리를 '영구동토 스텝과 바람에 깎인 산들이 있고 깎아지른 절벽이 대륙을 두른 거대한 메사 같은 곳'으로 묘사한 2009년 공식 개요를 따라, 이 지도가 절벽 위 툰드라 고원 안쪽에 두었다. |
| 143 | [Smoldering Spires](https://scryfall.com/card/wwk/143/smoldering-spires) | 대륙 Akoum | [1790, 540] 추정 | 카드 이름은 지명이 아니고 플레이버도 없으며, 이 그림을 어느 대륙이나 장소 서술에 실은 공식 글도 찾지 못했다. **추정:** 아트북(2016)의 아쿰 장 첫머리는 '뾰족한 산봉우리들이 중력을 거스르는 아치와 첨탑을 이고 높이 솟아 있고' '마그마가 끓어 흐르는 심연'이 있다고 한다. 공식 가이드(PG: Akoum, 2010)도 아쿰을 '화산 대륙'이라 부른다. 이를 따라 이 지도가 아쿰에 두었다. 이 그림이 아쿰이라는 공식 서술은 없다. |
| 144 | [Stirring Wildwood](https://scryfall.com/card/wwk/144/stirring-wildwood) | Turntimber (`turntimber`) | [390, 1300] 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 공식 글은 이 카드를 월드웨이크 미리보기('A Brief History of Tap Lands', 2010)와 '이 주의 배경화면'(2010)으로 소개하고, 디자인 칼럼에 장식 그림으로 실었을 뿐 어느 숲인지 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서가 없다. 숲이 깨어나 움직이는 이 카드에 맞춰, 나무가 나선으로 치솟고 늘 삐걱이는 온두의 Turntimber(PG: Ondu, 2009)에 이 지도가 두었다. |
| 145 | [Tectonic Edge](https://scryfall.com/card/wwk/145/tectonic-edge) | 대륙 Tazeem | [1255, 1069] 추정 | 공식 칼럼 'The Look of an Awakening World'(Savor the Flavor, 2010)에서 화자는 '타짐 남부의 헤드론이 널린 초원'에 둔 장비 은닉처를 말하며 '그런데 지금 지각판 하나가 갑자기 그 일대를 휘청이며 가로지르고 있다고 들었다'고 한다. 칼럼은 이 문단 바로 뒤에 카드 이름과 화가만 적은 캡션을 달아 이 그림을 실었다. 플레이버의 화자 브루스 타를은 아쿰을 떠도는 대상단 고마 파다의 유목민이다. **추정:** 칼럼의 '타짐 남부, 헤드론이 널린 초원'과, 같은 해 Booster Quest: The Shaman's Orb의 '타짐 남부의 헤드론 지대'를 따라 이 지도가 타짐 남쪽 내륙에 두었다. 정확한 자리는 공식 자료에 없다. |

### ROE (Rise of the Eldrazi, 2010)

두 장 모두 어디를 그렸는지 밝힌 공식 자료가 없어 자리는 이 지도의 추정이다. Eldrazi Temple에는 한국어판이 없다.

| # | 카드 | 이은 곳 | 지도 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 227 | [Eldrazi Temple](https://scryfall.com/card/roe/227/eldrazi-temple) | Halimar Depths (`halimar-depths`) | [1258, 887] 추정 | 카드 이름은 지명이 아니고, 플레이버 'Each temple is a door to a horrible future.'(신전 하나하나가 끔찍한 미래로 가는 문이다)도 장소를 말하지 않는다. 공식 사이트는 이 그림을 ROE 배경화면(2010)과 젠디카르 차원 소개 페이지의 머리 그림으로 설명 글 없이 썼을 뿐이고, 이 카드나 그림을 어느 대륙·장소 서술에 실은 공식 글은 찾지 못했다. **추정:** ROE와 같은 달에 나온 공식 웹코믹 'Enter the Eldrazi' 1부(2010)에서 바다 관문 등대의 인어 현자는 'Halimar Depths에 있는 우리 신전에서 엘드라지가 꿈틀거린 지 열하루가 되었다'고 말하고, 아트북(2016)은 Halimar Depths 항목에서 우마라 강 어귀 근처에 가라앉은 Ula Temple을 두고 이름이 인어의 바다 신 울라와 이어져 있어 노얀 다르가 '엘드라지와 직접 이어져 있을지 모른다'고 믿는다고 쓴다(탐사대는 아직 엘드라지를 찾지 못했다). 이를 따라 이 지도가 이 카드를 Halimar Depths에 잇고 Ula Temple 곁 할리마르 물속에 두었다. 이 카드의 신전이 웹코믹의 신전이나 Ula Temple이라는 공식 서술은 없다. |
| 228 | [Evolving Wilds](https://scryfall.com/card/roe/228/evolving-wilds) (진화하는 야생지) | 대륙 Bala Ged | [2180, 1078] 추정 | 카드 이름은 지명이 아니고, 플레이버 'Every world is an organism, able to grow new lands. Some just do it faster than others.'(모든 세계는 새 땅을 키워 낼 수 있는 유기체다. 다만 어떤 세계는 남보다 빨리 그럴 뿐이다)도 장소를 말하지 않는다. 같은 그림으로 다시 찍힌 Magic 2013(2012) 등의 플레이버(한국어판 '자연은 문명의 손을 빌리지 않아도 언제나 환경에 맞게 변화를 거듭한다.')도 마찬가지이며, 이 그림을 어느 대륙이나 장소 서술에 실은 공식 글도 찾지 못했다. **추정:** Zendikar Rising(2020)의 공식 스토리 'Episode 5: The Two Guardians'는 끝부분에서 '발라 게드가 다시 꽃피며 자라나, 숲이 마법만이 낼 수 있는 속도로 돌아오고 있었다'고 쓴다. 새 땅을 '남보다 빨리' 키워 내는 세계를 말하는 플레이버에 맞춰 이 지도가 발라 게드에 두었으며, 이 그림이 발라 게드라는 공식 서술은 없다. |

## 페이즈1 — ZEN 미식 레어·레어 (`src/data/phase1.ts`)

헤더의 '페이즈1' 단추(주소 `?phase=1`)를 켜면 Zendikar(2009) 세트의 미식 레어 15장과 레어 43장(대지 레어는 대지 카드로 이미 지도에 있어 뺐다)이 지도에 오른다. 카드는 설정 근거일 뿐이라 카드 그림을 지도에 붙이지 않는다. 카드의 대상을 판타지 지도처럼 지도 화풍의 그림(`src/map/figures.ts`, 원본은 `scripts/figures/art/`)으로 그린다. 그림 크기는 대상에 맞춘다(크기는 그림의 가장 긴 변, 지도 단위).

- 자리는 대지 카드와 같은 규칙이다. 공식 근거가 닿는 곳에 두고, 닿지 않으면 이 지도의 판단으로 고른 자리를 패널에 '추정'과 그 이유로 적는다.
- 큰 대상(Lorthos, Iona, Ob Nixilis, Rampaging Baloths, Felidar Sovereign, Obsidian Fireheart)은 세계 지도에 그린다. 화면에서 14px 이상일 때만 그린다.
- 사람만 한 대상은 그 지역의 자식 지도에 넣는다(Eye of Ugin: Sorin Markov·Chandra Ablaze, Malakir: Kalitas, Tangled Vales: Nissa Revane, Makindi Trenches: Warren Instigator). 자리가 붐벼 세계 지도에 두면 장소 이름을 가리는 대상도 자식 지도에 넣었다(Eye of Ugin: Eldrazi Monument — 아쿰의 이빨 라벨과 겹침, Jwar Isle: Mindbreak Trap — 좌르 섬의 세 표시 사이). 세계 지도에는 이 대상들을 그리지 않고 틀도 두지 않는다. 대신 페이즈1에서는 그 장소 이름 뒤에 패널의 '지역 지도 보기' 단추와 같은 접힌 지도 아이콘을 붙여(사용자 요청, 범례에도 한 줄) 지역 지도가 있는 곳을 알린다. 아이콘은 이름이 보이는 배율에서 아이콘까지 들어갈 자리가 있을 때만 붙는다. 그 장소(Eye of Ugin, Malakir, Tangled Vales, Makindi Trenches, Jwar Isle)를 누르면 여느 장소처럼 패널이 열리고, 패널 맨 위의 '지역 지도 보기'를 누르면 그 지역을 큰 축척으로 따로 그린 지역 지도(자식 지도)가 세계 지도 자리에 열린다. 패널의 '페이즈1' 줄에 있는 대상 이름을 눌러도 그 자식 지도가 열린다. 자식 지도의 그림은 `scripts/childmaps/art/<id>.js`(→ `src/map/childmaps/<id>.ts`)이고, 무엇을 공식 서술에 따라 그렸고 무엇이 이 지도의 해석인지는 아래 '자식 지도' 절에 적는다.
- 작은 사물·생물(Lotus Cobra, Eternity Vessel)은 자식 지도 없이 세계 지도에서 확대하면 보인다. 링크로 열면 그림이 알아볼 만한 크기(가장 긴 변 64px, 최대 배율까지)가 되도록 들어간다.
- 레어 43장도 같은 규칙이다. 22장은 세계 지도에 그리고(그중 사람만 한 것과 작은 물건은 확대해야 보인다), 21장은 자식 지도에 넣었다. 레어가 여럿 모이는 곳에는 자식 지도 셋(Halimar, Kabira, Tal Terig)을 새로 그렸고, 자식 지도가 없는 곳에 홀로 떨어진 사람만 한 대상(Goblin Guide, Kazuul Warlord, Turntimber Ranger 등)은 세계 지도에 작게 그렸다. 주문·마법물체는 카드가 설정에서 가리키는 물건·현상을 그렸다(예: Grappling Hook은 코르의 갈고리, Day of Judgment는 소린 곁의 상징). 근거는 아래 '레어' 표.

| # | 카드 | 이은 곳 | 그림 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 12 | [Felidar Sovereign](https://scryfall.com/card/zen/12/felidar-sovereign) (펠리다르 지배자) | 대륙 Sejiri | [900, 55], 크기 28 추정 | 공식 가이드 A Planeswalker's Guide to Zendikar(2009)와 공식 글 The World of Zendikar(2009)는 세지리 단락에서 '펠리다르·그리핀·스핑크스 같은 생물이 눈 덮인 황무지에 산다'고 쓰고, 두 글 모두 그 단락 바로 뒤에 이 그림을 실었다(설명 글 없음). 공식 칼럼의 여행 일지 The Journal of Javad Nasrin(2009)도 펠리다르를 '세지리 극지방의 이름난 주민'이라 부른다(일지가 만난 것은 아가딤 사바나의 금빛 털 펠리다르다). 플레이버의 화자 Hazir는 '세지리 지도 제작자'지만, 이는 화자의 소속일 뿐 그림이 어디인지는 말하지 않는다. **추정:** 공식 자료는 세지리의 '눈 덮인 황무지'까지만 말해, 이 지도가 세지리 툰드라 고원 안쪽에 두었다. 정확한 자리는 공식 자료에 없다. |
| 13 | [Iona, Shield of Emeria](https://scryfall.com/card/zen/13/iona-shield-of-emeria) | Emeria (`emeria`) | [1206, 905], 크기 34 추정 | 아트북(The Art of Magic: The Gathering – Zendikar, 2016) 타짐 장의 'Emeria, The Sky Ruin' 절은 헤드론 지대의 잔해층 위로 아무도 오르지 못한 까닭의 하나로 'Shield of Emeria라 불리는 천사 아이오나가 늘 탐험가들이 너무 높이 오르지 못하게 막아 왔다'를 들고, 같은 책 인간 절은 타이탄들이 깨어난 뒤 아이오나가 엘드라지와 싸우며 '에메리아의 참된 영역으로 가는 통로를 지켜보던 전통적인 자리'를 버렸다고 쓴다. 'Zendikar: Things Have Changed'(2020)는 대천사 아이오나가 옛 타짐 하늘거주지를 무너뜨려 에메리아 하늘 폐허를 만들었고 '엘드라지와 싸우러 에메리아에서 내려오면서 하늘 폐허를 지키는 이가 없게 되었다'고 쓰며, 첫 원정대가 하늘 폐허에 들어간 것도 '아이오나가 엘드라지와 싸우러 경비 자리를 버린 뒤'라고 쓴다. 카드 '에메리아의 부름'(ZNR, 2020) 한국어판 플레이버는 '이곳을 지키는 것은 더이상 아이오나가 아니다. 우리다.'(에메리아 목동 카슬라의 말)이다. **추정:** 에메리아는 타짐 여러 곳의 하늘을 메운 헤드론 잔해 지대라 한 점이 없고(PG: Tazeem, 2009), 아이오나가 지킨 위층으로 가는 통로의 자리도 공식 자료에 없다. 이 지도가 'Emeria, the Sky Ruin' 카드 표시(잔해 지대 한가운데) 곁에 두었다. |
| 53 | [Lorthos, the Tidemaker](https://scryfall.com/card/zen/53/lorthos-the-tidemaker) | Sunder Bay (`sunder-bay`) | [1033, 1679], 크기 90 추정 | 아트북 The Art of Magic: The Gathering – Zendikar(2016)는 무라사 장의 'Lorthos the Tidemaker' 절에서 Lorthos를 'Sunder Bay 바깥에 사는, 움직임이 조수를 바꿀 만큼 거대한 생물'이라고 쓴다. 공식 가이드 PG: Bala Ged and Elves(2009)는 타주루 대변인 Sutina가 '조수를 바꾸는 괴물 Lorthos가 파괴적으로 수면에 떠오를 때' 산산조각난 만의 절벽에 자주 보인다고 하고, PG: Murasa and Sejiri(2010)는 Sunder Bay 항목에서 harabaz 나무가 '크라켄이나 거대한 바다 괴물 Lorthos가 떠오른 뒤' 밀려드는 거대한 파도를 가른다고 쓰며 그 항목 바로 뒤에 이 그림을 실었다(설명 글 없음). **추정:** 공식 자료는 'Sunder Bay 바깥'까지만 말하고 Lorthos가 살던 깊은 바다의 정확한 자리는 밝히지 않아, 이 지도가 산산조각난 만 바로 앞바다에 두었다. |
| 57 | [Mindbreak Trap](https://scryfall.com/card/zen/57/mindbreak-trap) | 대륙 Ondu | 자식 지도 Jwar Isle (세계 자리 [190, 1446]) 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 공식 가이드 PG: Ondu(2009)는 'Jwar, Isle of Secrets' 절의 Faduun 항목(과 거기 딸린 인용문) 뒤, 'Strand of Jwar' 항목 바로 앞에 설명 없이 이 그림을 실었고, 아트북(2016)도 'Ancient Sites of Ondu' 절의 'Faduun of Jwar Isle' 서술 끝(다음 'The Crypt of Agadeem' 서술 앞)에 카드 이름과 화가만 적은 캡션으로 실었다. 플레이버의 화자 노얀 다르('타짐 소강마도사')는 화자를 타짐에 잇는 단서일 뿐이고, 아트북은 이 플레이버 문구만 따로 아쿰 장의 'Tal Terig' 절에 실었다. **추정:** 두 공식 글이 모두 좌르 섬의 파둔 서술 바로 뒤에 이 그림을 실은 것을 따라 이 지도가 파둔 곁에 두었다. 아트북은 그 서술에서 파둔을 고대 인간 마법사 결사가 비밀 요새를 지키려고 만든 것이라 하고, Plane Shift(2016)는 엘드라지 이전 시대의 유적이 '흔히 마법 함정으로 지켜진다'며 그런 유적의 예로 파둔을 든다. 이 함정이 좌르 섬에 있다는 공식 서술은 없다. |
| 99 | [Kalitas, Bloodchief of Ghet](https://scryfall.com/card/zen/99/kalitas-bloodchief-of-ghet) | Malakir (`malakir`) | 자식 지도 Malakir (세계 자리 [1998, 1136]) | 공식 가이드 개관(A Planeswalker's Guide to Zendikar, 2009)은 흡혈귀 절에서 '혈족장들이 화려한 도시 말라키르를 다스린다'고 쓰고, 굴 드라즈의 다섯 대가문 가운데 하나로 게트를 들며 '게트의 혈족장 칼리타스'의 말을 싣는다. PG: Guul Draz(2009)는 말라키르가 다섯 구역으로 나뉘어 저마다 그 구역을 다스리는 흡혈귀 가문의 이름을 땄다며 그 하나로 게트 구역(Emevera 가문이 물길을 돌려 침수시킨 가난한 구역)을 들고, 대가문마다 다른 혈족장이 다스린다고 쓴다. 이 글은 'Bloodchiefs' 절 바로 뒤에 이 카드 그림을 설명 글 없이 실었다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016)의 말라키르 서술은 게트 구역을 침수된 황량한 폐허로 적고 게트 가문이 칼리타스의 지휘 아래 엘드라지를 섬기게 되었다고 쓰며, BFZ 이야기 'Memories of Blood'(2015)는 드라나가 말라키르를 되찾으며 '칼리타스와 그 배신자들을 도시에서 몰아냈다'고 쓴다. |
| 107 | [Ob Nixilis, the Fallen](https://scryfall.com/card/zen/107/ob-nixilis-the-fallen) | 대륙 Guul Draz | [1745, 1045], 크기 36 추정 | 공식 칼럼 'Booster Quest!'(Savor the Flavor, 2009)는 독자가 탐험대를 이끌고 부스터 팩과 주사위로 진행하는 게임 형식 글이다. 첫 퀘스트에서 Mul Daya 엘프 부족이라고 자칭한 두건 쓴 예언자가 굴 드라즈 어딘가로 이끄는 지도를 건네고, 세 번째 퀘스트 'The Ruins of Hagra'에서 하그라 수조 유적 깊은 곳의 봉인된 석실을 열어 헤드론 유물을 다 맞추자 그 인물이 나타나 망토를 벗고 오브 닉실리스로 정체를 드러낸다. 그는 그 유물로 '잃어버린 자기 플레인즈워커 불꽃을 없앤 이 세계에 복수하겠다'고 말하며, 칼럼은 이 장면 바로 앞에 이 카드 그림의 일부를 설명 글 없이 실었다. 공식 기사 'The Many Looks of Ob Nixilis'(2015)가 공개한 그림 주문서는 이 카드의 장소를 'Swamp environment'(늪 환경)라고만 적고, 뒤의 카드 '풀려난 오브 닉실리스'(M15, 2014)의 장소는 'Guul Draz, Zendikar'라고 적는다. **추정:** Booster Quest!(2009)에서 그가 나타난 하그라 수조 유적을 따라 이 지도가 하그라 수조 곁에 두었다. 독자가 주인공인 게임 형식 칼럼의 한 장면이라 그가 그곳에 머문다는 공식 서술은 없고, 굴 드라즈 안의 정확한 자리는 공식 자료에 없다. |
| 111 | [Sorin Markov](https://scryfall.com/card/zen/111/sorin-markov) (소린 마르코프) | Eye of Ugin (`eye-of-ugin`) | 자식 지도 Eye of Ugin (세계 자리 [1946.6, 435.2]) | 공식 기사 'The Eldrazi Arisen'(2010)은 흡혈귀 플레인즈워커 소린 마르코프가 우진 등 다른 두 플레인즈워커와 함께 수천 년 전 엘드라지를 젠디카르에 가두었고, 셋이 봉인 주문의 힘을 아쿰 산맥 깊은 곳의 지하 석실 Eye of Ugin에 모은 뒤 석실을 마법 자물쇠로 잠그고 차원을 떠났다고 쓴다. 'Gods and Monsters'(2010)도 소린을 그 셋 가운데 하나로 꼽으며 엘드라지의 감옥을 붙든 자물쇠 주문이 이 석실 깊이 숨겨져 있다고 쓰고, Magic Story 'The Lithomancer'(2014)에서는 나히리와 소린이 이 석실에 Eye of Ugin이라는 이름을 붙인다. 아트북(2016)은 엘드라지 무리가 풀려난 뒤 'Eye of Ugin의 변고에 불려' 마침내 젠디카르에 온 소린이 니사와 함께 Eye of Ugin에 이르러 타이탄의 결박을 되살리려 했다고 쓴다. |
| 120 | [Chandra Ablaze](https://scryfall.com/card/zen/120/chandra-ablaze) | Eye of Ugin (`eye-of-ugin`) | 자식 지도 Eye of Ugin (세계 자리 [1976.2, 420.6]) | 공식 기사 'The Eldrazi Arisen'(2010)은 화염술사 찬드라가 수수께끼의 두루마리 지도를 따라 젠디카르에 와 값진 유물이라 여긴 전설의 Eye of Ugin을 찾았고, 뒤쫓아 온 제이스가 Eye 석실 안에서 막 사르칸과 맞닥뜨린 찬드라를 따라잡았다고 쓴다. 웹코믹 'Enter the Eldrazi' 1부(2010)의 제이스도 '화염술사 소녀와 용의 싸움은 흡혈귀와 내가 석실에 닿았을 때 이미 벌어지고 있었다'고 말하며, ZEN과 같은 때 나온 웹코믹 'Journey to the Eye' 1부(2009)는 Eye로 가는 찬드라의 길을 아쿰 산맥의 아파 타운에서 시작한다. |
| 140 | [Obsidian Fireheart](https://scryfall.com/card/zen/140/obsidian-fireheart) | Skyfang Mountains (`skyfang-mountains`) | [1100, 1410], 크기 24 추정 | 공식 칼럼 'The Master at Arms'(Savor the Flavor, Doug Beyer, 2009)는 탐험 장비인 마체테가 '하늘이빨(Skyfang Mountains)의 지각을 부수며 나아가는 obsidian fireheart'를 베는 데도 똑같이 잘 든다고 쓴다. 이 카드에는 플레이버 텍스트가 없다. **추정:** 칼럼이 말하는 곳은 하늘이빨까지라, 산맥 안의 자리는 이 지도가 정했다. 정확한 자리는 공식 자료에 없다. |
| 154 | [Warren Instigator](https://scryfall.com/card/zen/154/warren-instigator) | Makindi Trenches (`makindi-trenches`) | 자식 지도 Makindi Trenches (세계 자리 [302.5, 1000]) 추정 | 카드 이름은 지명이 아니고, 플레이버 "Danger! Danger! Come out of the safety of your holes!"(위험이다! 위험이다! 안전한 굴 밖으로 나와라!)도 장소를 말하지 않는다. 공식 글 'Instigating the Warrens'(Magic Arcana, 2009)는 이 고블린이 동료들에게 굴(warren)에서 나오라고 외치고 있으며, 그림 위쪽 절벽면에서 고블린들이 고개를 내민 곳이 그 굴이라고 설명하지만 어디인지는 말하지 않는다. **추정:** Magic Arcana(2009)가 이 그림의 굴을 절벽면에 난 것으로 설명한 것과, PG: Goblins(2009)가 '마킨디 협곡에 지어진 고블린 굴은 대부분 드러난 암벽에 지어져 있다'고 쓴 것(아트북 2016도 같은 내용)을 이어 이 지도가 마킨디 협곡에 두었다. 고블린은 아쿰·무라사·온두를 비롯해 곳곳에 살며(가이드 개관, 2009), 이 카드가 마킨디 협곡이라는 공식 서술은 없다. |
| 168 | [Lotus Cobra](https://scryfall.com/card/zen/168/lotus-cobra) (연꽃 코브라) | 대륙 Akoum | [2178, 383], 크기 10 추정 | 연꽃 코브라가 어디 사는지 밝힌 공식 서술은 찾지 못했고, 플레이버 'Its scales contain the essence of thousands of lotus blooms.'(비늘에 수천 송이 연꽃의 정수가 담겨 있다)도, ZNR(2020) 재판의 플레이버도 장소를 말하지 않는다. 아트북 The Art of Magic: The Gathering – Zendikar(2016)는 아쿰 장의 'Ulamog's Devastation' 단락(울라목의 난동으로 아쿰의 넓은 지역이 파괴되었다는 대목)과 'Life in Akoum' 절 사이에 'Lotus Cobra' 캡션으로 이 그림을 실었다(설명 글 없음). **추정:** 같은 아트북의 아쿰 장이 오라 온다르 숲 한가운데 폭포 속에서 자라는 Khalni Heart를 '연꽃 같은 꽃(lotus-like bloom)'이라고 쓴 것을 따라, 연꽃의 정수를 지녔다는 이 코브라를 이 지도가 오라 온다르에 두었다. 연꽃 코브라가 그곳에 산다는 공식 서술은 없다. |
| 170 | [Nissa Revane](https://scryfall.com/card/zen/170/nissa-revane) | 대륙 Bala Ged | 자식 지도 Tangled Vales (세계 자리 [2221.8, 1050.6]) 추정 | 이 카드가 나온 해(2009)의 공식 가이드 'A Planeswalker's Guide to Zendikar'는 'Bala Ged is the homeland of the Joraga elves and the planeswalker Nissa Revane.'(발라 게드는 조라가 엘프와 플레인즈워커 니사의 고향이다)라고 쓰고, 아트북(2016)도 니사를 '발라 게드 태생의 조라가 부족 엘프'로 소개한다. 니사가 소린과 함께 Eye of Ugin에 이르러 타이탄들의 마지막 결박을 끊은 것은 그 뒤 엘드라지 타이탄들이 풀려날 때의 일이다(아트북, 2016). **추정:** 공식 가이드 PG: Bala Ged and Elves(2009)는 발라 게드 남부의 뒤엉킨 계곡에 '조라가 엘프 씨족들이 터전을 이룬다'고 하고, Magic Story 'Nissa's Resolve'(2015)의 니사는 대륙 깊숙한 곳의 옛 조라가 마을을 떠나 예전에 수없이 사냥하던 뒤엉킨 계곡을 지난다. 이를 따라 이 지도가 뒤엉킨 계곡에 두었다. 니사의 옛 마을이 정확히 어디였는지는 공식 자료에 없다. |
| 178 | [Rampaging Baloths](https://scryfall.com/card/zen/178/rampaging-baloths) | 대륙 Ondu | [345, 1274], 크기 50 추정 | 공식 가이드 PG: Ondu(2009)는 Turntimber 절의 야생 생물 단락('이곳의 최상위 포식자는 baloth다') 바로 뒤에 이 그림을 설명 없이 실었다. 아트북(2016)은 'Rampaging Baloths'(Eric Deschamps — 이 카드의 프리릴리스 판 화가) 캡션을 단 그림을 Baloths 항목에 싣고, 그 항목에서 'baloth 무리는 이따금 온두의 평원을 가로질러 내달리는데, 엘드라지가 일어난 뒤로는 마치 젠디카르의 분노를 함께 느끼는 듯 더 자주 그런다'고 쓴다(Plane Shift: Zendikar, 2016도 같은 글). 플레이버 'When the land is angry, so are they.'(땅이 성나면 그들도 성난다)의 화자 니사는 발라 게드 출신이지만(가이드 개관, 2009), 이는 화자의 고향일 뿐이다. **추정:** PG: Ondu(2009)가 이 그림을 Turntimber 절의 baloth 단락 바로 뒤에 실은 것을 따라 이 지도가 변화림(Turntimber)에 두었다. 공식 자료가 이 그림을 변화림이라고 밝힌 것은 아니며, 아트북이 무리가 내달린다고 한 '온두의 평원'이 어디인지도 밝혀지지 않았다. |
| 199 | [Eldrazi Monument](https://scryfall.com/card/zen/199/eldrazi-monument) | Teeth of Akoum (`teeth-of-akoum`) | 자식 지도 Eye of Ugin (세계 자리 [1982.2, 459]) 추정 | 이 카드를 다룬 공식 칼럼 'Monument to a Lost Age'(Savor the Flavor, 2009)는 '아쿰의 이빨로 들어가는 긴 탐험' 중에 아쿰의 날카로운 화강암 비탈을 오른 탐험가가 '아쿰에서 가장 큰, 어쩌면 젠디카르 전체에서 가장 큰 떠 있는 유적 지대'에서 이 석상을 발견하는 이야기를 싣고, 그 대목에 이 그림을 실었다. **추정:** 그 떠 있는 유적 지대가 아쿰의 이빨 어디인지는 공식 자료에 없어, 이 지도가 아쿰의 이빨 안에 자리를 골랐다. |
| 200 | [Eternity Vessel](https://scryfall.com/card/zen/200/eternity-vessel) | Calcite Flats (`calcite-flats`) | [1048, 884], 크기 8 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 없다. 플레이버가 없고, 공식 소개 글 'Deadly Perils, Priceless Treasures'(2009)는 젠디카르 전체를 소개하는 문단('규칙이 깨지는 곳… 젠디카르의 마나마저 남다르다') 뒤, 'The Roil' 절 앞에 설명 없이 이 그림을 실었을 뿐이다. 공식 칼럼 Ally Cuisine(2009)도 Vampire Hexmage를 풀이하며 'Eternity Vessel을 고갈시킬 수 있다'고 예로 들 뿐 장소는 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서가 없다. 생명점을 되돌려 주는 이 카드에 맞춰, 아트북(2016)이 '독과 병을 몰아내고 치명상까지 아물게 하는 강력한 치유 마법'을 품었다고 쓰고 Plane Shift(2016)가 엘드라지 이전 시대 유적으로 꼽은 Sunspring(Calcite Flats의 외딴 곳, 우뚝 솟은 Bulwark 아래) 곁에 이 지도가 두었다. 이 그릇이 Sunspring과 이어져 있다는 공식 서술은 없다. |

### 레어 (대지 제외 43장)

| # | 카드 | 이은 곳 | 그림 자리 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | [Armament Master](https://scryfall.com/card/zen/1/armament-master) | 대륙 Ondu | 자식 지도 Makindi Trenches (세계 자리 [332.6, 1026]) 추정 | 이 카드를 미리 공개한 공식 칼럼 'The Master at Arms'(Savor the Flavor, 2009)는 코르가 짐을 가볍게 꾸려 떠도는 유목민이라 튼튼하고 쓰임새 많은 장비가 필요하다고 쓴다. 칼럼은 코르가 장비를 떠돌이 삶의 실용품이자 결속과 힘을 뜻하는 신성한 상징으로 쓴다고 하고, 장비를 갖춘 코르 덱이 'Armament Master를 앞세운 돌격'으로 끝난다고 쓴다. 칼럼도 플레이버('알려진 것에는 단검·식량·밧줄·피톤으로, 알 수 없는 것에는 billycat 꼬리·pikku 뿌리·헤드론 조각으로 대비한다')도 이 코르가 어디 있는지 말하지 않는다. **추정:** 장소를 밝힌 공식 서술은 없다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016)은 '코르와 고블린은 마킨디 협곡의 삶에 특히 잘 적응했다'고 쓴다. 같은 책은 코르가 마킨디 협곡의 거처를 모두 Cliffhaven이라 부른다고 쓴다. 이를 따라 이 지도가 마킨디 협곡 지역 지도에 두었다. 같은 책은 코르가 늘 옮겨 다닌다고 쓰며, 이 인물이 그곳에 있다는 공식 서술은 없다. |
| 6 | [Celestial Mantle](https://scryfall.com/card/zen/6/celestial-mantle) | 대륙 Tazeem | [1180, 998], 크기 8 추정 | 이 카드를 어느 장소·대륙·인물과 이은 공식 자료는 찾지 못했다. 카드는 생물에 거는 Aura다. 그 생물에 +3/+3을 주고, 그 생물이 플레이어에게 전투 피해를 주면 생명점을 두 배로 한다. 플레이버 'Upon such armor, even a mountain would break.'(이런 갑옷 앞에서는 산조차 부서지리라)도 장소를 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서는 없다. 이 지도는 카드 이름의 'Celestial'(하늘의)을 따랐다. 인어들은 하늘·바람·구름을 아우르는 '바람의 영역'을 에메리아라 부른다(PG: Tazeem, 2009). 아트북(2016)은 타짐 위 하늘 폐허 에메리아를 천사들이 지켜본다고 쓴다. 이를 따라 이 지도가 타짐 하늘을 메운 헤드론 잔해 지대 에메리아 안에 두었다. 이 갑옷이 그곳에 있다는 공식 서술은 없고, 잔해 지대 안의 자리도 이 지도가 골랐다. |
| 8 | [Conqueror's Pledge](https://scryfall.com/card/zen/8/conquerors-pledge) | 대륙 Ondu | 자식 지도 Makindi Trenches (세계 자리 [319, 1029.6]) 추정 | Armament Master를 공개한 공식 칼럼 'The Master at Arms'(Savor the Flavor, 2009)는 이 카드를 이름 없이 소개한다. 칼럼은 '코르 병사 토큰 여섯을, 킥커를 내면 열둘을 만드는 주문'이 있다며 '곧바로 생기는 군대(Instant army). 장비만 더하면 된다'고 쓴다. 칼럼은 장비를 갖춘 코르 덱이 'Armament Master를 앞세운 돌격'으로 끝난다고 쓴다. 이 군대가 어디서 모이는지는 쓰지 않으며, 카드에 플레이버는 없다. **추정:** 장소를 밝힌 공식 서술은 없다. 같은 칼럼이 이 주문을 Armament Master와 한 코르 덱으로 소개했다. 이를 따라 이 지도가 마킨디 협곡 지역 지도에서 Armament Master 뒤에 두었다. 아트북(2016)은 코르가 마킨디 협곡의 삶에 특히 잘 적응했다고 쓴다. 이 군대가 그곳에 있다는 공식 서술은 없다. |
| 9 | [Day of Judgment](https://scryfall.com/card/zen/9/day-of-judgment) (심판의 날) | 대륙 Akoum | 자식 지도 Eye of Ugin (세계 자리 [1938, 441.4]) 추정 | 카드는 모든 생물을 파괴하는 주문이다. ZEN 판 플레이버는 소린 마르코프의 말 'I have seen planes leveled and all life rendered to dust. It brought no pleasure, even to a heart as dark as mine.'(나는 차원들이 무너지고 모든 생명이 먼지가 되는 것을 보았다. 나처럼 어두운 마음에도 기쁨은 없었다)이다. 이 말은 그가 여러 차원에서 본 일을 말할 뿐 젠디카르의 어느 곳도 말하지 않는다. 공식 칼럼 'Rise of the Inbox'(Savor the Flavor, 2010)는 게임과 달리 이야기 속 젠디카르 사람들은 Day of Judgment 한 번으로 엘드라지 문제를 끝낼 수 없다고 쓴다. 이 주문이 젠디카르 어디서 쓰였다고 밝힌 공식 자료는 없다. **추정:** 위치를 알려 주는 공식 단서는 플레이버의 화자뿐이다. 이 지도는 화자 소린 마르코프가 젠디카르에서 이어진 곳을 따랐다. 그곳은 소린을 포함한 세 플레인즈워커가 엘드라지를 가둔 봉인 주문의 힘을 모은 지하 석실 Eye of Ugin이다(The Eldrazi Arisen, 2010). 이 지도가 Eye of Ugin 지역 지도의 소린 곁에 이 주문의 상징을 두었다. 이 주문이 그곳에서 쓰였다는 공식 서술은 없다. |
| 10 | [Devout Lightcaster](https://scryfall.com/card/zen/10/devout-lightcaster) | 대륙 Ondu | 자식 지도 Makindi Trenches (세계 자리 [336.2, 977.4]) 추정 | 카드는 코르 성직자(Kor Cleric)다. 플레이버 'Goddess, grant us light to banish the world's shadows.'(여신이시여, 세상의 그림자를 몰아낼 빛을 내려 주소서)는 Kamsa에게 올리는 기도다. 공식 칼럼 Ally Cuisine(2009)은 다른 동료(Radrik the Ondu Cleric)를 소개하며 Kamsa를 '코르의 바람 여신'이라 한다. 아트북(2016)은 Kamsa를 'the Breath of the World'라 불리는 자애로운 바람의 여신으로, 코르의 연 돛을 채우고 사냥감을 내려 준다고 쓴다. 이 성직자가 어디 있는지 밝힌 공식 서술은 없다. **추정:** 이 지도는 공식 가이드 PG: Ondu(2009)에 인용된 화자 'Bebea, Cliffhaven lightcaster'의 칭호를 단서로 삼았다. 그 인용문 자체는 Beyeen의 떠오르는 산 이야기다. 아트북(2016)은 코르가 마킨디 협곡의 거처를 모두 Cliffhaven이라 부른다고 쓴다. 이 둘을 이어 이 지도가 마킨디 협곡 지역 지도의 코르 거처 곁에 두었다. Bebea는 이 카드의 인물이 아니며, 이 성직자가 그곳에 있다는 공식 서술은 없다. |
| 11 | [Emeria Angel](https://scryfall.com/card/zen/11/emeria-angel) | Emeria (`emeria`) | [1314, 1040], 크기 24 추정 | 아트북(The Art of Magic: The Gathering – Zendikar, 2016)의 인간 종교 절은 인간들이 '첫째 천사'로 믿는 에메리아가 인어의 하늘 여신에게서 빌린 이름이라고 쓴다. 같은 절은 '타짐 위 하늘 폐허, 흔히 그냥 에메리아(또는 에메리아의 영역)라 불리는 곳은 천사들이 지켜본다'고 쓴다. 공식 칼럼 'The Moment of Discovery'(2009)는 'Emeria Angel은 젠디카르의 천사 대부분처럼 후광을 눈 위로 낮게 쓴다'고 한다. 칼럼은 이 천사가 땅과 이어진 것이 자연과 손잡아서가 아니라 비극적인 거래의 해답을 찾아 하늘을 탐험해야 해서라고 쓴다. 'The Defiance of Angels'(2010)는 신 에메리아와 이어진 천사들을 다루는 대목에 이 그림을 실었다. 플레이버는 'When the earth shudders, the sky overflows.'(땅이 떨면 하늘이 넘친다)이다. **추정:** 에메리아는 타짐 여러 곳의 하늘을 메운 헤드론 잔해 지대라 한 점이 없다(PG: Tazeem, 2009). 이 천사가 그 안 어디에 있는지도 공식 자료에 없다. 잔해 지대 안의 자리(아이오나와 떨어진 오란리프 남동쪽 하늘)는 이 지도가 골랐다. |
| 15 | [Kabira Evangel](https://scryfall.com/card/zen/15/kabira-evangel) | Kabira (`kabira`) | 자식 지도 Kabira (세계 자리 [323.4, 1521.6]) | 공식 칼럼 Ally Cuisine(Savor the Flavor, 2009)은 이름난 동료들 가운데 'Father Rami the Kabira Evangel'을 '카비라 전초기지 출신의 헌신적인 성직자이자 뛰어난 이야기꾼'으로 소개한다. 칼럼은 그의 모닥불 이야기가 원정대에 용기를 준다고 쓴다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016)의 온두 장 Kabira 절은 엘드라지가 온 뒤 카비라에서 큰 세력을 얻은 인간 종파를 다룬다. 그 종파의 evangel들은 엘드라지를 '필멸 종족의 죄에 천사들이 내린 벌'이라 설교하며, 책은 그 대목에 'Kabira Evangel' 캡션으로 이 그림을 실었다. |
| 25 | [Luminarch Ascension](https://scryfall.com/card/zen/25/luminarch-ascension) | 대륙 Ondu | 자식 지도 Kabira (세계 자리 [344.2, 1522.1]) 추정 | 카드에는 플레이버가 없다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016)의 인간 종교 절은 천사를 따르는 이들 가운데 기도와 명상, 자비로운 행동으로 초월의 경지에 오르려는 이들이 있다고 쓴다. 책은 그 경지에 이른 소수를 luminarch 또는 transcendent master라 부르며, 이들이 스스로 빛을 내 섬기는 천사를 닮아 간다고 쓴다. 공식 칼럼 'The Defiance of Angels'(2010)는 첫머리에 이 그림을 실었을 뿐이다. 이 카드를 어느 장소와 이은 공식 자료는 찾지 못했다. **추정:** 공식 단서는 없다. Zendikar Rising(2020) 카드 '괴물의 격파'(Smite the Monstrous) 한국어판 플레이버의 화자는 '카비라의 찬란한 군주, 코르데인'이다. 이 칭호를 따라 이 지도가 카비라 곁에 두었다. 아트북(2016)은 엘드라지가 온 뒤 카비라에서 천사를 내세우는 인간 종파가 큰 세력을 얻었다고 쓴다. 이 카드가 카비라와 이어져 있다는 공식 서술은 없다. |
| 39 | [World Queller](https://scryfall.com/card/zen/39/world-queller) | Makindi Trenches (`makindi-trenches`) | [445, 915], 크기 34 추정 | 공식 칼럼 'Ally Cuisine'(Savor the Flavor, Doug Beyer, 2009)은 탐험대 동료(Ally)들을 소개하며, Makindi Shieldmate인 Moliq가 마킨디 협곡의 깎아지른 바위산 출신으로 모험을 떠나기 전 그곳에 채굴·탐험용 새 전초기지를 세우는 일을 이끌었고 'World Queller 하나가 그 갓 생긴 공동체의 대담함에 분노해 그곳을 쑥대밭으로 만들고 수백 명을 죽였다'고 쓴다. 이 카드의 유형인 화신(Avatar)을 Plane Shift: Zendikar(2016)와 아트북(2016)은 '정령과 비슷한 드문 존재로, 죽음의 그림자에서 젠디카르의 영혼 자체에 이르는 더 큰 추상적 힘의 한 면이나 투영'이라고 설명한다. 플레이버 'Why fight the world when you know who will win?'(누가 이길지 알면서 왜 세상과 싸우는가?)의 화자 니사는 화자일 뿐 장소를 말하지 않는다. **추정:** 칼럼은 그 전초기지가 마킨디 협곡의 깎아지른 바위산 어딘가라고만 하고 자리를 밝히지 않아, 세계 지도에 그리는 큰 그림인 이 화신을 이 지도가 협곡 지대의 북동쪽(지역 지도 범위 밖)에 두었다. 정확한 자리는 공식 자료에 없다. |
| 41 | [Archive Trap](https://scryfall.com/card/zen/41/archive-trap) | 대륙 Akoum | 자식 지도 Tal Terig (세계 자리 [1859.1, 425.4]) 추정 | 카드 이름은 지명이 아니고 플레이버도 없다. Trap 카드를 소개한 공식 개발 칼럼 'You Just Fell For The Trap'(Latest Developments, Tom LaPille, 2009)은 첫머리에 고블린이 판 지도를 따라 '잊힌 비밀을 간직한 지하 서고'에 들어간 독자의 이야기를 싣는다. 끝없는 서가에 고대의 책과 두루마리가 가득하고, 책을 하나 더 꺼내자 천장이 무너져 바위가 빗방울처럼 쏟아지며 '읽지도 못할 수천 권의 책'과 함께 묻히는데, 이 카드 그림은 묻히는 대목에 설명 없이 실렸다. 칼럼은 그 서고가 어디인지 말하지 않고, 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다. **추정:** 위치를 알려 주는 공식 단서가 없다. 이 지도가 아쿰의 탈 테리그 곁에 두었다 — PG: Akoum(2010)은 이 탑이 땅 위로 스무 층쯤 솟고 이백 층이 땅속에 묻혀 있으며 '모든 복도에 마법 함정이 늘어서 있다'고 쓰고, Plane Shift(2016)는 엘드라지 시대의 고대 서고에서 엘드라지에 관한 두루마리와 책이 아직 발견된다며 그 시대 유적의 하나로 탈 테리그를 꼽는다. 이 함정이 탈 테리그에 있다는 공식 서술은 없다. |
| 42 | [Archmage Ascension](https://scryfall.com/card/zen/42/archmage-ascension) | 대륙 Tazeem | 자식 지도 Halimar (세계 자리 [1192.4, 882.7]) 추정 | 카드 이름은 지명이 아니고 플레이버도 없다. 공식 칼럼 'Booster Quest: The Shaman's Orb'(Savor the Flavor, Doug Beyer, 2010)는 독자가 부스터 팩과 주사위로 진행하는 게임 형식 글이다. 바다 관문에서 시작한 퀘스트에서 동료 미노타우르스가 '할리마르 바다 건너편, 큰 서고가 있는 인어 거주지(a merfolk enclave)'로 가자고 하고, 다음 도전 'The Enclave's Lyceum'에서 '흔한 도서관이 아닌' 서고의 중앙 방에 들어서자 마법 룬이 둘레를 소용돌이친다. 칼럼은 그 도전 바로 앞에 이 카드 그림의 일부를 설명 없이 실었고, 이어지는 도전은 '타짐의 남쪽 헤드론 지대'로 간다. **추정:** 칼럼은 'a merfolk enclave'라고만 해, 그곳이 PG: Tazeem and Merfolk(2009)가 우마라 강의 가장 넓은 구간 한가운데 섬에 지었다고 쓴 Merfolk Enclave인지는 밝히지 않는다. 바다 관문에서 할리마르 건너편이라는 단서를 따라 이 지도가 Merfolk Enclave 곁에 두었다. 독자가 주인공인 게임 형식 칼럼의 한 장면이고, 정확한 자리는 공식 자료에 없다. |
| 45 | [Cosi's Trickster](https://scryfall.com/card/zen/45/cosis-trickster) | 대륙 Guul Draz | [1868, 1184], 크기 12 추정 | 카드 이름은 지명이 아니고, 플레이버 'She watches the chaos created by the Roil, seeking strength in the patterns of anarchy.'(그녀는 탁류가 일으킨 혼돈을 지켜보며 무질서의 패턴에서 힘을 찾는다)도 장소를 말하지 않는다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016)은 굴 드라즈 장의 'Lulea' 절 — Lake Jeft의 어두운 호숫가에 있는 인어 정착지로, 주민들이 엘드라지가 오기 전부터 전통 신조를 대부분 버렸고 지도자인 현자 Ennesh를 비롯해 다수가 Cosi를 따른다는 대목 — 끝에 카드 이름과 화가만 적은 캡션으로 이 그림을 실었다. 공식 가이드 PG: Tazeem and Merfolk(2009)는 인어 종족 부분의 'Merfolk Realms' 절(하늘과 물 밖의 모든 땅을 트릭스터 Cosi가 다스린다고 인어가 믿는다는 대목) 바로 뒤에 같은 그림을 설명 없이 실었다. **추정:** 아트북이 이 그림을 실은 절을 따라 이 지도가 Lulea 곁, Lake Jeft의 동쪽 호숫가에 두었다. 아트북은 그림에 카드 이름과 화가만 적었고, 이 인물이 Lulea 사람이라는 공식 서술은 없다. Lulea 서술은 2016년 책의 것이지만 주민들이 Cosi를 따른 것은 엘드라지가 오기 전부터라고 쓴다. |
| 54 | [Lullmage Mentor](https://scryfall.com/card/zen/54/lullmage-mentor) | 대륙 Akoum | [2205, 398], 크기 15 추정 | 카드 이름은 지명이 아니고, 플레이버 'Many voices are needed to quiet this land.'(이 땅을 잠재우려면 많은 목소리가 필요하다)도 장소를 말하지 않는다. 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다. 공식 자료가 소강마도사에 대해 밝힌 것은, 인어만 탁류를 느끼고 이 거친 땅을 잠재울 수 있다는 '타짐 소강마도사' 노얀 다르의 말(가이드 개관, 2009)과, '에메리아 신조의 마법사들은 땅과 그 생물, 다른 사람, 마법 자체를 잠재우는 통제 마법에 힘을 쏟았고 그 마법을 쓰는 이들을 소강마도사라 불렀다'는 아트북(2016)의 서술이다. **추정:** 이 지도가 아쿰의 오라 온다르에 두었다 — 아트북(2016) 아쿰 장은 이곳에서 '인간 드루이드 몇과 인어 소강마도사들이 엘프와 함께 Khalni Garden을 가꾸며 땅의 소란으로부터 지키려 한다'고 쓰는데, 이것이 땅을 잠재운다는 이 카드의 플레이버와 가장 가깝다. 이 인물이 그곳에 있다는 공식 서술은 없고, 아트북의 서술은 2016년 무렵의 모습이다. |
| 61 | [Rite of Replication](https://scryfall.com/card/zen/61/rite-of-replication) | 대륙 Tazeem | 자식 지도 Halimar (세계 자리 [1312, 869.6]) 추정 | 카드 이름은 지명이 아니고 플레이버도 없다. 공식 칼럼 'Angry Lands, Brave Adventurers, and Other Decks Vorthos'(Savor the Flavor, Doug Beyer, 2010)는 모험가 테마 덱에 어울리는 카드의 하나로 이 카드를 꼽을 뿐 장소를 말하지 않는다. 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다. **추정:** 위치를 알려 주는 공식 단서가 없다. 파란색 주문인 이 의식을, 아트북(2016)이 '인어는 파란 마나와 이어져 있다'고 쓰고 가이드 개관(2009)이 '인어는 타짐에 가장 많이 산다', PG: Tazeem and Merfolk(2009)가 '인어는 물에서 태어난다'고 쓴 것을 따라 이 지도가 타짐 할리마르의 물 위에 두었다. 이 의식이 할리마르나 인어와 이어져 있다는 공식 서술은 없다. |
| 62 | [Roil Elemental](https://scryfall.com/card/zen/62/roil-elemental) | 대륙 Tazeem | [1280, 1058], 크기 30 추정 | 카드 이름의 탁류(Roil)는 젠디카르 전체의 현상이라 지명이 아니고, 플레이버 'A vortex that devours everything—even the souls of the living.'(모든 것을, 산 자의 영혼까지 삼키는 소용돌이)도 장소를 말하지 않는다. 공식 칼럼 'The Moment of Discovery'(Savor the Flavor, Doug Beyer, 2009)는 이 정령을 '지도를 거스르는 젠디카르의 본성이 모습을 갖춘 것', '변화의 본질 그 자체로 이루어진 존재로 기존 질서를 삼킬 만큼 굶주린 소용돌이'라 하고, 아트북(2016)은 탁류를 설명하는 'The Roil' 절('때때로 탁류는 말 그대로 제 생명을 얻는다')에 이 그림을 실었다. PG: Goblins(2009)의 인용문에도 탐험대에 몰려오는 'roil elemental'이 나오지만, 어디에 나타났는지는 어느 글도 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서가 없다. PG: Akoum(2010)이 '타짐의 탁류는 땅에 위에서 작용하는 듯하고, 아쿰의 탁류는 아래에서 작용한다'고 쓴 것을 따라, 날아다니는 이 소용돌이를 이 지도가 타짐 남쪽 오란리프 숲 가장자리 하늘에 두었다. 이 정령이 타짐에 나타났다는 공식 서술은 없다. |
| 63 | [Sea Gate Loremaster](https://scryfall.com/card/zen/63/sea-gate-loremaster) | Sea Gate (`sea-gate`) | 자식 지도 Halimar (세계 자리 [1363.8, 895.6]) | 카드 이름이 바다 관문(Sea Gate)을 말한다. 공식 칼럼 'Ally Cuisine'(Savor the Flavor, Doug Beyer, 2009)은 'Sea Gate Loremaster' Vado Thal을 '바다 관문 등대에서 수련한 이름난 현장 학자이자 언어학자'로 소개하고, 고대 언어를 연구하는 그가 동료 모험가들이 '얻어 온' 지식과 유물을 분석해 앞으로 나올 유적의 단서를 준다고 쓴다. 공식 연재 Card of the Day(2009년 10월)는 '바다 관문 등대는 젠디카르 탐험가들의 학문의 중심이며 인어의 고향 타짐에 있다. 이 학자는 그 서고에도 없는 것을 안다'고 쓰고, 'Gods and Monsters'(2010)는 '울라 신조 인어들이 바다 관문 등대의 이름난 연구 시설을 운영한다'는 대목에 'Sea Gate Loremaster' 캡션으로 이 그림을 실었다. 플레이버의 화자 Zahr Gada는 '할리마르 원정대장'이다. |
| 68 | [Sphinx of Jwar Isle](https://scryfall.com/card/zen/68/sphinx-of-jwar-isle) | Jwar Isle (`jwar-isle`) | [136, 1440], 크기 26 추정 | 카드 이름이 좌르 섬(Jwar Isle)을 말한다. 아트북(The Art of Magic: The Gathering – Zendikar, 2016) 온두 장은 좌르 섬에 대해 '스핑크스들이 이 섬에 산다고 알려져 있고, 그 신비로운 생물에게서 비밀을 캐내려고 좌르를 찾는 이들도 있다'고 쓰고, 파둔 서술에서는 파둔이 요새 입구에 다가오는 이에게 무거운 두려움을 일으키지만 '스핑크스만은 이 효과를 받지 않는다'고 쓴다. 공식 가이드 PG: Ondu(2009)는 좌르 섬 절의 'Strand of Jwar' 항목 뒤에 이 그림을 설명 없이 실었다. 플레이버의 화자 Sachir(아쿰 탐험 가문)는 화자일 뿐 장소를 말하지 않고, OGW 카드 '좌르 섬 응징자'(스핑크스)의 플레이버는 '본래 혼자 있기를 좋아하는 스핑크스도 엘드라지와의 전투에 기꺼이 나섰다'이다. **추정:** 공식 자료는 스핑크스가 섬에 산다는 데까지만 말해, 날고 있는 모습을 이 지도가 파둔이 있는 섬 서쪽 앞바다 위(지역 지도 범위 밖)에 두었다. 정확한 자리는 공식 자료에 없다. |
| 69 | [Sphinx of Lost Truths](https://scryfall.com/card/zen/69/sphinx-of-lost-truths) | 대륙 Sejiri | [849, 106], 크기 26 추정 | 카드 이름은 지명이 아니고 플레이버도 없다. 공식 가이드 PG: Murasa and Sejiri(2010)는 세지리 절의 'Wildlife' 항목(툰드라 사슴과 그것을 먹는 드레이크·늑대·예티·눈 로크) 바로 뒤에 이 그림을 설명 없이 실었고, 가이드 개관(2009)과 The World of Zendikar(2009)는 세지리에 대해 '펠리다르·그리핀·스핑크스 같은 생물이 눈 덮인 황무지에 산다'고 쓴다. **추정:** 공식 자료는 세지리까지만 말한다. Plane Shift(2016)가 '스핑크스는 폭포·높은 곶·작은 섬처럼 자연의 아름다움이 큰 외딴 곳에 둥지를 튼다'고 하고 가이드 개관(2009)이 세지리를 '깎아지른 절벽이 둘레를 감싼' 거대한 메사라고 쓴 것을 따라, 이 지도가 세지리 남쪽 해안 절벽의 곶 위에 두었다. 정확한 자리는 공식 자료에 없다. |
| 79 | [Bala Ged Thief](https://scryfall.com/card/zen/79/bala-ged-thief) | 대륙 Bala Ged | 자식 지도 Tangled Vales (세계 자리 [2210.2, 1033.6]) 추정 | 카드 이름에 'Bala Ged'가 붙어 있다. 공식 칼럼 'Ally Cuisine'(Savor the Flavor, Doug Beyer, 2009)의 'Profiles of Famous Allies'는 이 동료를 'Niobe the Bala Ged Thief'로 소개한다. 그는 '발라 게드의 우글거리는 그늘에서 온 잘나가는 도둑(Hotshot rogue from the teeming shadows of Bala Ged)'이라는 말을 듣지만 원정대의 믿을 만한 일원으로 이름을 얻었고, 소매치기 솜씨를 원정대에 맞게 다듬어 '원시의 대륙(the primordial continent)에서 손꼽히는 유물 사냥꾼'이 되었다. 공식 가이드 PG: Bala Ged and Elves(2009)는 발라 게드를 '원시로 되돌아간 듯한(primordial throwback)' 땅이라 부른다. **추정:** 공식 자료는 '발라 게드의 그늘'까지만 말한다. PG: Bala Ged and Elves(2009)는 발라 게드에 '문명화된' 종족이 거의 살지 않는다고 하면서, 뒤엉킨 계곡에는 조라가 엘프 씨족과 함께 '사냥과 덫사냥을 하는 인간 몇몇(some human hunters and trappers)'이 산다고 쓴다. 이 지도는 이 서술을 따라 이 인간 도둑을 뒤엉킨 계곡 서쪽 숲에 두었다. 그가 그곳에 살았다는 공식 서술은 없다. |
| 81 | [Blood Tribute](https://scryfall.com/card/zen/81/blood-tribute) | 대륙 Guul Draz | 자식 지도 Malakir (세계 자리 [2076.8, 1120.5]) 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다. 플레이버가 없고, 아트북(2016)에도 실리지 않았다. 디자인 칼럼 'Care for a Bite?'(Making Magic, Mark Rosewater, 2009)는 상대를 '피 흘리게(bloodied)' 해 생명을 절반으로 떨어뜨리는 흡혈귀 메커니즘에 맞는 디자인으로 이 카드를 꼽을 뿐 장소는 말하지 않는다. 공식 가이드 PG: Guul Draz(2009)는 젠디카르의 흡혈귀가 '산 생물의 피에 깃든 기운을 먹고 살며, 그 기운은 공포와 고통 속에서 특히 강하다'고 쓴다. **추정:** 흡혈귀를 탭해 킥커를 치르는 카드다. 공식 가이드 PG: Guul Draz(2009)는 굴 드라즈를 '흡혈귀의 고향'이라 하고, 가이드 개관(2009)은 '혈족장들이 화려한 도시 말라키르를 다스린다'고 쓴다. 이 지도는 이를 따라 이 장면을 말라키르 동쪽 늪에 두었다. 이 주문이 말라키르나 굴 드라즈와 이어져 있다는 공식 서술은 없다. |
| 82 | [Bloodchief Ascension](https://scryfall.com/card/zen/82/bloodchief-ascension) | 대륙 Guul Draz | [1815, 963], 크기 12 추정 | 공식 칼럼 'Booster Quest!'(Savor the Flavor, Doug Beyer, 2009)는 독자가 탐험대를 이끌고 부스터 팩과 주사위로 진행하는 게임 형식 글로, 세 퀘스트가 모두 굴 드라즈를 지난다. 두 번째 퀘스트의 마지막 도전 'The Bloodchief's Avarice' 앞에 이 카드 그림의 일부를 설명 글 없이 실었다. 이 도전에서는 펠라카 카르스트의 깊은 싱크홀 아래에서 '오래된 유물에 끝없는 탐욕을 지닌 강력한 흡혈귀 혈족장 Thelzaia'가 null 무리를 거느리고 헤드론 조각을 지킨다. 칼럼은 그림이 Thelzaia라고 밝히지 않는다. 공식 가이드 PG: Guul Draz(2009)는 혈족장을 '종족의 시조인 고대 흡혈귀'라고 쓴다. **추정:** Booster Quest!(2009)가 이 그림을 펠라카 카르스트의 혈족장 장면 앞에 실은 것을 따라 이 지도가 펠라카 카르스트 북쪽 골짜기에 두었다. 독자가 주인공인 게임 형식 칼럼이고 그림에 설명이 없어, 이 카드가 그곳의 일이라는 공식 서술은 없고 카르스트 안의 정확한 자리도 공식 자료에 없다. |
| 83 | [Bloodghast](https://scryfall.com/card/zen/83/bloodghast) | 대륙 Guul Draz | 자식 지도 Malakir (세계 자리 [1971.2, 1135.2]) 추정 | 공식 칼럼 'The Moment of Discovery'(Savor the Flavor, Doug Beyer, 2009)는 Bloodghast를 '쓰러진 흡혈귀의 성난 영혼으로, 굴 드라즈의 썩은 늪에 대한 기억에 매달려 삶에 매달린다(clinging to life by clinging to its memories of the fetid marshes of Guul Draz)'고 쓴다. 같은 필자는 칼럼 'The Season for Costumes'(2009)의 독자 편지 답에서 이 유령을 쓰러질 때마다 황야로 떠나 새 지역에 출몰하는 존재로 '생각한다'고 쓴다. 이는 필자의 해석으로 밝힌 말이다. **추정:** 공식 자료는 '굴 드라즈의 썩은 늪'의 기억까지만 말하고, 같은 필자는 이 유령이 한곳에 머물지 않는다고 본다. 이 지도는 흡혈귀의 도시 말라키르 서쪽 늪, 말라키르 수렁 둘레에 두었다. 이 유령이 말라키르와 이어져 있다는 공식 서술은 없고, 정확한 자리도 공식 자료에 없다. |
| 92 | [Guul Draz Specter](https://scryfall.com/card/zen/92/guul-draz-specter) | 대륙 Guul Draz | [1640, 1075], 크기 20 추정 | 카드 이름에 'Guul Draz'가 붙어 있다. 공식 칼럼 'The Moment of Discovery'(Savor the Flavor, Doug Beyer, 2009)는 내부 문서를 인용해 스펙터(Specter)를 '흑색 언데드로, 비행을 지니고 거의 늘 손패 버리기 능력이 있으며, 흔히 사악한 날짐승을 탄 두건 쓴 언데드로 구상된다'고 쓰고, 그 목록 끝에 이 카드 그림을 실었다. **추정:** 공식 자료는 굴 드라즈까지만 말한다. 이 지도는 날아다니는 이 스펙터를 굴 드라즈 서쪽, 조프 늪과 하그라 수조 사이의 하늘에 두었다. 정확한 자리는 공식 자료에 없다. |
| 96 | [Halo Hunter](https://scryfall.com/card/zen/96/halo-hunter) | 대륙 Guul Draz | [1845, 1148], 크기 28 추정 | 어디 사는지 밝힌 공식 서술은 찾지 못했다. 플레이버 'Hanging on the walls of his lair, the fallen halos cast his depravity in everlasting light.'(그의 굴 벽에 걸린 떨어진 후광들이 그 타락을 영원한 빛으로 비춘다)는 굴(lair)이 있다고만 하고 어디인지는 말하지 않는다. 공식 칼럼 'The Moment of Discovery'(2009)는 '젠디카르의 천사 대부분이 눈 위로 낮게 후광을 쓴다'고 쓰고, 'The Defiance of Angels'(2010)는 그 후광이 엘드라지에게 맞섰던 천사들을 묶은 굴레였으며 이제 '억압의 후광들이 부서졌다'고 쓴다. **추정:** Plane Shift: Zendikar(2016)는 악마가 '흑색 마나가 자유롭게 흐르는 곳에 끌려 흔히 고대 묘실이나 늪지 깊은 곳의 유적에 산다'고 쓴다. 공식 가이드 PG: Guul Draz(2009)는 굴 드라즈를 다른 대륙보다 유적이 많은 늪의 대륙이라 하고, 그 글의 인용문(타짐의 Anbecan)은 굴 드라즈에서 잃은 동료가 '악마의 굴에 갇혔을지' 걱정한다. 이 지도는 이를 따라 하그라 늪의 남쪽 가장자리, Lake Jeft 북쪽에 두었다. Halo Hunter의 굴이 굴 드라즈에 있다는 공식 서술은 없고, 굴의 자리도 공식 자료에 없다. |
| 100 | [Malakir Bloodwitch](https://scryfall.com/card/zen/100/malakir-bloodwitch) | Malakir (`malakir`) | 자식 지도 Malakir (세계 자리 [2015.2, 1095.8]) | 카드 이름에 'Malakir'가 붙어 있다. 공식 가이드(2009)는 말라키르를 '종족의 시조인 혈족장들이 다스리는 화려한 도시'라고 쓴다. 공식 칼럼 'Booster Quest!'(2009)는 두 번째 퀘스트의 도전 'The Dangerous Bloodscent' 앞에 이 카드 그림의 일부를 설명 글 없이 실었다. 흡혈귀 전사들을 피한 탐험대가 '말라키르를 크게 돌아가려' 하지만, 냄새가 바람에 실려 다른 흡혈귀 정찰병이 가까이 있을 수 있는 장면이다. 'Malakir bloodwitch'는 BFZ·OGW 카드 플레이버의 화자 Harak의 직함으로도 나오지만(Malakir Familiar, Baloth Null), 이 카드의 인물이 Harak이라는 서술은 없다. |
| 110 | [Sadistic Sacrament](https://scryfall.com/card/zen/110/sadistic-sacrament) | 대륙 Guul Draz | 자식 지도 Malakir (세계 자리 [2024, 1156.2]) 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다. 플레이버가 없고, 아트북(2016)과 공식 기사에도 이 카드의 설정 서술은 없다. **추정:** 공식 가이드 PG: Guul Draz(2009)는 흡혈귀 정착지를 두고 '많은 흡혈귀가 예술과 의식(ritual)… 을 귀히 여긴다'고 하고, 다른 대목에서 '더 난폭하고 가학적인(sadistic) 흡혈귀'를 말한다. 이 지도는 카드 이름의 두 낱말이 흡혈귀 서술에 나오는 것을 따라 이 의식을 흡혈귀의 도시 말라키르 남쪽, Emevera 구역 아래 늪에 두었다. 그림 속 인물이 흡혈귀라는 것도, 이 의식이 말라키르의 것이라는 것도 공식 서술이 아니다. |
| 122 | [Electropotence](https://scryfall.com/card/zen/122/electropotence) | 대륙 Akoum | [1650, 520], 크기 16 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다. 플레이버 'Where life and force collide.'(생명과 힘이 부딪치는 곳)는 장소를 말하지 않고, ZEN 무렵 공식 글(A Planeswalker's Guide to Zendikar 연재 각 편, The World of Zendikar, Deadly Perils, Priceless Treasures 등)과 아트북(2016)에서도 이 카드나 그림을 찾지 못했다. **추정:** 위치를 알려 주는 공식 단서가 없다. 적색 마나 카드라, PG: Akoum(2010)이 '화산 지대답게 주로 적색 마나에 속한다'고 쓴 아쿰에 잇고 아쿰 서부 산지의 빈자리를 이 지도가 골랐다. 아쿰과 이은 것도 그 자리도 이 지도의 판단이며, 이 카드가 아쿰과 이어져 있다는 공식 서술은 없다. |
| 123 | [Elemental Appeal](https://scryfall.com/card/zen/123/elemental-appeal) | 대륙 Akoum | [1690, 430], 크기 24 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 찾지 못했다(플레이버 없음). 같은 7/1 적색 정령 토큰을 만드는 Zektar Shrine Expedition(ZEN #155)의 Zektar Shrine은 공식 칼럼 'The Moment of Discovery'(2009)가 '정령이 들끓는, 검은 돌의 Shatterskull Mountains 높은 곳'이라고만 해 대륙이 밝혀지지 않았고(이 지도에 없는 곳이다) 이 카드와 이은 서술도 없다. Plane Shift: Zendikar(2016) p.35는 젠디카르의 정령을 '이 세계를 이루는 근원적인 자연의 힘이 몸을 얻은 것'이라 쓴다. **추정:** 위치를 알려 주는 공식 단서가 없다. 적색 마나 카드라, PG: Akoum(2010)이 '화산 지대답게 주로 적색 마나에 속한다'고 쓴 아쿰에 잇고 아쿰 서부 산지의 빈자리를 이 지도가 골랐다. 아쿰과 이은 것도 그 자리도 이 지도의 판단이며, 이 정령이 아쿰에 나타난다는 공식 서술은 없다. |
| 126 | [Goblin Guide](https://scryfall.com/card/zen/126/goblin-guide) | Affa (`affa`) | [1903, 516], 크기 9 추정 | 공식 가이드 개관 A Planeswalker's Guide to Zendikar(2009)는 고블린 단락에서 '아쿰의 주 거주지 아파에서는 많은 고블린이 안내인이나 함정 찾는 이로 고용된다(물론 보통은 값진 것을 찾게 돕다가 일부러 함정을 터뜨리고 그것을 훔쳐 달아날 셈이다)'고 쓴다. 이 카드를 다룬 공식 칼럼 'The Moment of Discovery'(2009)는 공격할 때 상대 서고 맨 위의 대지를 상대 손에 넣어 주는 능력을 이 고블린이 '상대를 위해 우습게도 황야를 살펴 주는 것'이라 풀이할 뿐 장소는 말하지 않는다. PG: Goblins(2009)는 이 그림을 그로타그 부족 절(이 부족이 '발라 게드의 깊은 곳에서 살아남는 데 쓸모 있는 지식'을 얻었다는 단락 뒤)에 설명 없이 실었고, 아트북(2016)은 그로타그 부족이 발라 게드에 살았다고 쓴다. **추정:** 이 카드의 고블린이 아파에 있다는 공식 서술은 없다. 가이드 개관(2009)이 고블린 안내인을 아파와 이은 것을 따라 이 지도가 아파에 잇고 아파 바로 남쪽에 두었다. 그림이 실린 그로타그 부족 절은 발라 게드를 말하지만, Worldwake Player's Guide(2010)는 그로타그 고블린이 거주지에서 함정 찾는 이·길 안내인으로 일했고 아쿰의 탈 테리그 근처에 그로타그 정착지들이 있었다고 쓴다. |
| 131 | [Hellkite Charger](https://scryfall.com/card/zen/131/hellkite-charger) | 대륙 Akoum | [2074, 398], 크기 30 추정 | 카드에 플레이버가 없고, 이 지옥룡 한 마리를 어느 장소와 이은 공식 서술은 없다. Plane Shift: Zendikar(2016) p.29는 젠디카르의 드래곤이 '적색 마나가 풍부한 산악 지대 곳곳, 특히 아쿰에 살지만 결코 많지는 않다'고 쓰고, 아트북(2016)은 아쿰의 산에 '사나운 드래곤과 그들을 숭배하는 야만적인 인간 카르간 부족'이 산다고 쓴다. 'Zendikar: Things Have Changed'(2020)는 옛 카르간 부족이 '아쿰의 드래곤'을 길들여 타고 코르와 싸웠다고 쓰고, 카드 '아쿰 지옥룡'(BFZ, 2015)도 지옥룡을 아쿰과 잇는다. **추정:** 아쿰 안의 자리는 공식 자료에 없다. 아트북(2016)이 '카르간 부족은 아쿰의 이빨 높은 곳에 살며 산에서 사냥하는 드래곤과 영역을 다툰다'고 쓰고, 카드 '괴롭히는 목소리'(ZNR, 2020) 한국어판 플레이버가 '카르간 부족의 대지는 … 자신들의 용을 먹이는 일 또한 거의 어려움을 겪지 않는다'고 한 것을 따라, 이 지도가 카르간 부족의 대지 바로 북쪽 산지 하늘에 두었다. 이 지옥룡이 그곳에 산다는 공식 서술은 없다. |
| 134 | [Kazuul Warlord](https://scryfall.com/card/zen/134/kazuul-warlord) | Cliffs of Kazuul (`cliffs-of-kazuul`) | [1046, 1378], 크기 13 추정 | 공식 칼럼 'Ally Cuisine'(Savor the Flavor, 2009)은 ZEN의 Ally마다 내력을 붙이며 이 카드를 'Thraur the Kazuul Warlord'로 소개한다: '무라사의 이름난 카줄의 절벽은 포악한 오우거 노예주 카줄이 다스리고 그의 노예 전사들이 절벽을 오르는 모든 길목에서 통행세를 걷는다. 카줄의 노예는 결코 달아나지 못한다는 것이 철칙이지만 Thraur는 그 예외로, 이제 젠디카르에서 가장 험한 탐험대들과 함께 싸우지만 그 절벽에는 다시 돌아가지 않겠다고 맹세했다.' PG: Murasa and Sejiri(2010)는 카줄의 절벽을 Murasa's Wall 바깥을 오르는 유일하게 정비된 길로, 'The Tyrant of the Cliffs'(2010)는 카줄을 노예 전사들로 된 작은 군대를 거느린 오우거로 쓴다. **추정:** 달아난 뒤 Thraur가 어디 있는지는 공식 자료에 없다(Ally Cuisine은 그가 험한 탐험대들과 함께 싸운다고만 한다). 이 지도는 그의 이름이 가리키고 그가 노예 전사로 있던 카줄의 절벽 꼭대기에 두었다. 이 카드 무렵(2009) 그가 그곳에 있었다는 뜻은 아니며, 그는 절벽에 돌아가지 않겠다고 맹세했다. |
| 135 | [Lavaball Trap](https://scryfall.com/card/zen/135/lavaball-trap) | 대륙 Akoum | 자식 지도 Tal Terig (세계 자리 [1876.3, 429.7]) 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 없다(플레이버 없음). 공식 개발 칼럼 'You Just Fell For The Trap'(Latest Developments, Tom LaPille, 2009)은 Trap을 '실제 모험가가 마주칠 법한 함정'처럼 느껴지게 만들었다며 위에서 큰 바위를 떨어뜨리는 함정 같은 예를 들고, 할인 비용에도 마나를 내게 해 '더 화려한 효과를 낸 Trap'의 예로 이 카드를 실었을 뿐 장소는 말하지 않는다. **추정:** 위치를 알려 주는 공식 단서가 없다. 용암 함정이라 PG: Akoum(2010)이 '마그마가 끊임없이 굴을 채웠다 비운다'고 쓴 아쿰에 잇고, 같은 글이 '모든 복도마다 마법 함정이 늘어서 있다'고 쓴 탈 테리그 곁에 이 지도가 두었다. 아쿰과 이은 것도 그 자리도 이 지도의 판단이며, 이 함정이 아쿰이나 탈 테리그에 있다는 공식 서술은 없다. |
| 143 | [Pyromancer Ascension](https://scryfall.com/card/zen/143/pyromancer-ascension) | 대륙 Akoum | [1735, 495], 크기 26 추정 | 공식 가이드 PG: Goblins(2009)는 이 그림을 '용암발자국(Lavastep) 부족' 절에 설명 없이 실었다. 그 절은 이 부족이 '아쿰의 지열 활동에 관한 어렵게 얻은 지식'을 지녔고 지표에 사는 코르·엘프·인간을 자주 괴롭힌다고 하며, 그림 바로 앞 단락에서 '땅속의 불이 살아 있다고 믿고' 사제·예언자가 들이마시는 증기를 '깊은 곳의 불의 신들이 보내는 전언'으로 여기며 의식으로 몸을 태우고 흉터를 낸다고 쓴다(Plane Shift: Zendikar, 2016 p.17도 이 부족을 아쿰에 둔다). Worldwake Player's Guide(2010)는 '아쿰이 화염의 물결과 지진으로 들썩이자 용암발자국 부족이 신들이 곧 나타나리라 믿으며 그 파괴를 반긴다'고 쓴다. **추정:** 이 의식의 자리나 용암발자국 부족이 사는 곳은 공식 자료에 없어, 아쿰 서부 산지의 빈자리를 이 지도가 골랐다. 그림 속 인물이 용암발자국 고블린이라는 공식 서술은 없다. |
| 159 | [Beastmaster Ascension](https://scryfall.com/card/zen/159/beastmaster-ascension) | Tangled Vales (`tangled-vales`) | 자식 지도 Tangled Vales (세계 자리 [2242.5, 1073.5]) 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 없다. 플레이버가 없고, 이 카드를 다룬 공식 칼럼 'Are You the Beastmaster?'(Serious Fun, Kelly Digges, 2009)는 다섯 Ascension이 '집에 돌아간 뒤에도 남는 변모'를 주어 'Luminarch나 Pyromancer, 또는 Beastmaster의 경지에 오르게' 한다고만 쓰고 장소는 말하지 않는다. **추정:** 공식 가이드 PG: Bala Ged and Elves(2009)는 조라가 엘프 씨족들이 젠디카르의 여러 짐승을 그 이동이나 사냥 습성에 따라 좇고 '씨족마다 한 생물에 몸을 바쳐 그 특성을 무예와 주문에 받아들인다'고 쓰며, 조라가 씨족들이 뒤엉킨 계곡에 터전을 이룬다고 쓴다. 이를 따라 이 지도가 뒤엉킨 계곡에 두었다. 이 카드가 조라가나 뒤엉킨 계곡과 이어져 있다는 공식 서술은 없다. |
| 162 | [Gigantiform](https://scryfall.com/card/zen/162/gigantiform) | 대륙 Guul Draz | [1745, 1105], 크기 26 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 없다. 플레이버가 없고 이 카드를 다룬 공식 글도 찾지 못했다. Plane Shift: Zendikar(2016)는 젠디카르의 짐승 가운데 숲의 마나가 스며들어 '엄청나게 커진' 것들이 있다고 쓸 뿐 장소는 말하지 않는다. **추정:** Plane Shift: Zendikar(2016)가 흡혈귀들이 '고향 굴 드라즈의 늪과 정글에 사는 거대한 곤충'의 껍데기로 옷을 지어 입는다고 쓴 것을 따라, 거대한 딱정벌레를 그린 이 카드를 이 지도가 굴 드라즈에 두었다. 하그라 수조 남쪽의 늪과 정글이라는 자리도 이 지도가 골랐고, 이 카드가 굴 드라즈라는 공식 서술은 없다. |
| 172 | [Oracle of Mul Daya](https://scryfall.com/card/zen/172/oracle-of-mul-daya) | Guum Wilds (`guum-wilds`) | 자식 지도 Tangled Vales (세계 자리 [2219.5, 1016.2]) 추정 | 카드 이름이 이 엘프를 물 다야에 잇는다. 공식 가이드 PG: Bala Ged and Elves(2009)는 '물 다야 세력의 중심은 발라 게드의 신비롭고 치명적인 정글에 있다'고 하고 발라 게드 대부분을 덮은 정글을 Guum Wilds라 부르며, 공식 이야기 Reclamation(2016)의 물 다야 생존자 미나는 '우리 물 다야는 Guum의 집에 머물렀다'고 말한다. 엘드라지 침공(2015) 뒤로는, 아트북(2016)이 물 다야 생존자 가운데 많은 수가 타주루에 합류했고 다른 이들은 Speaker Hazzan을 따른다고 쓴다. **추정:** 물 다야의 집이 Guum Wilds에 있었다는 데까지가 공식 서술이고 이 엘프가 있던 자리는 밝혀지지 않아, 이 지도가 Guum Wilds 남쪽 가장자리(뒤엉킨 계곡 지역 지도의 북쪽 숲)에 두었다. |
| 175 | [Predatory Urge](https://scryfall.com/card/zen/175/predatory-urge) | Turntimber (`turntimber`) | [430, 1235], 크기 24 추정 | 이 카드를 어느 장소나 대륙과 이은 공식 자료는 없다. 플레이버가 없고 이 카드를 다룬 공식 글도 찾지 못했다. **추정:** 공식 가이드 PG: Ondu(2009)가 변화림을 '거칠고 대담한 생물만 사는' 숲으로 쓰고, 그곳에 '위험한 생물이 가득하다'며 최상위 포식자 baloth와 모든 크기의 포식자 자리를 채우는 뱀을 든 것을 따라, 포식 본능을 그린 이 카드를 이 지도가 변화림에 두었다. 그림의 맹수가 어떤 짐승인지, 이 싸움이 변화림이라는 공식 서술은 없다. |
| 182 | [Scute Mob](https://scryfall.com/card/zen/182/scute-mob) | 대륙 Akoum | [1780, 495], 크기 14 추정 | 경갑옷 벌레가 어디 사는지 밝힌 공식 서술은 찾지 못했다. 플레이버 'Survival rule 781: There are always more scute bugs.'(생존 법칙 781: 경갑옷 벌레는 늘 더 있다)의 화자는 고블린 지름길잡이 주르디이고, 공식 칼럼 Ally Cuisine(2009)은 그를 툭툭(Tuktuk) 부족의 고블린 삼남매 가운데 하나로 소개하지만, 이는 화자의 소속일 뿐이다. **추정:** 아트북(2016)은 툭툭 고블린이 울라목가 지나간 뒤 굳어 버린 땅으로 옮겨 가 용이나 카르간의 매복에 당하곤 한다고 쓰고(같은 책은 카르간을 아쿰의 부족으로 쓴다), 그들의 거처 Grip Haven이 작은 구멍을 '경갑옷 벌레의 두꺼운 껍데기'로 덮는다고 쓴다. 이를 따라 이 지도가 아쿰의 가시지대 남서쪽 가장자리에 두었다. 경갑옷 벌레가 사는 곳과 Grip Haven의 자리는 공식 자료에 없다. |
| 184 | [Summoning Trap](https://scryfall.com/card/zen/184/summoning-trap) | Tal Terig (`tal-terig`) | 자식 지도 Tal Terig (세계 자리 [1836.9, 415.6]) 추정 | 어디를 그렸는지 밝힌 공식 자료는 없다. 플레이버가 없고, Trap을 소개한 공식 개발 칼럼 'You Just Fell For The Trap'(Latest Developments, Tom LaPille, 2009)은 Trap이 '실제 모험가가 마주칠 법한 함정'처럼 느껴지게 만들었으며 '던전을 지키려고 마법 생물을 불러내는 함정' 같은 이야기에서 착안했다고 쓸 뿐 장소는 말하지 않는다. **추정:** 공식 가이드 PG: Akoum(2010)이 탈 테리그를 도굴꾼을 막으려고 둔 많은 구조물과 함정이 회랑을 지키고 '모든 회랑마다 마법 함정이 늘어선' 유적으로 쓴 것을 따라 이 지도가 탈 테리그 곁에 두었다. 이 함정이 탈 테리그에 있다는 공식 서술은 없다. |
| 187 | [Terra Stomper](https://scryfall.com/card/zen/187/terra-stomper) (대지를 짓밟는 야수) | 대륙 Murasa | [1158, 1556], 크기 30 추정 | 아트북 The Art of Magic: The Gathering – Zendikar(2016)는 무라사 장에서 gomazoa·jagwasp와 함께 'terra stomper라 불리는 네 발 달린 거대한 포식자'를 '무라사 정글 토박이'인 독특한 동물의 예로 들고, 같은 장 'Lorthos the Tidemaker' 절도 무라사에 사는 큰 생물로 terra stomper를 꼽는다. Plane Shift: Zendikar(2016)는 이들을 '타짐 Vastwood의 나무만큼 자랄 수 있는 여섯 다리의 거수'라 쓰고, 플레이버(지진·낙석·때아닌 먼지 폭풍을 소용돌이 탓으로 잘못 돌리기도 한다)는 장소를 말하지 않는다. **추정:** 공식 자료는 무라사의 정글까지만 말한다. Zendikar Rising 이야기 Episode 2(2020)에서 일행이 산산조각난 만(Sunder Bay)에 내렸을 때 harabaz 숲에서 여섯 다리의 stomper가 덤벼든 것(Episode 3도 이 일을 'Sunder Bay의 stomper'로 부른다)을 따라 이 지도가 산산조각난 만 북쪽의 숲에 두었다. 정확한 자리는 공식 자료에 없다. |
| 191 | [Turntimber Ranger](https://scryfall.com/card/zen/191/turntimber-ranger) | Wolfbriar (`wolfbriar`) | [212, 1334], 크기 15 추정 | 카드 이름이 이 레인저를 온두의 숲 변화림(Turntimber)에 잇는다. 공식 칼럼 Ally Cuisine(Savor the Flavor, Doug Beyer, 2009)은 ZEN 동료(Ally)들의 인물을 소개하는 'Profiles of Famous Allies'에서 이 카드의 인물을 'Zalek the Turntimber Ranger'로 소개하며, '온두에서 가장 뛰어난 레인저이자 야수조련사'인 그가 쉬는 때에도 야생에 머물고 '특히 Wolfbriar라 불리는 변화림의 으스스한 공터'에 있다고 쓴다. 같은 글은 Zalek이 늑대의 영혼을 지녔다고 말하는 이들도 있다고 전한다. **추정:** Wolfbriar의 자리는 공식 자료에 없어 이 지도가 변화림 남서쪽에 추정해 두었고, 이 레인저는 그 곁에 두었다. |
| 196 | [Blade of the Bloodchief](https://scryfall.com/card/zen/196/blade-of-the-bloodchief) | 대륙 Guul Draz | 자식 지도 Malakir (세계 자리 [2040.4, 1111.2]) 추정 | 카드 이름은 이 칼을 '혈족장'의 것이라 부를 뿐이다. 어느 혈족장의 것인지, 어디 있는지 밝힌 공식 서술은 찾지 못했다(플레이버 없음). 공식 가이드 개관(2009)은 '종족의 시조인 혈족장들이 화려한 도시 말라키르를 다스린다'고 하고, 공식 칼럼 'The Season for Costumes'(2009)는 젠디카르 흡혈귀의 무기를 '송곳니 같은 긴 쌍날 칼'이라고 쓴다. **추정:** 공식 가이드(2009)는 혈족장들이 말라키르를 다스린다고 쓴다. 이 지도는 그 서술을 따라 이 칼을 말라키르 북동쪽 가장자리에 두었다. 이 칼이 말라키르에 있다는 공식 서술은 없고, 어느 혈족장의 칼인지도 공식 자료에 없다. |
| 203 | [Grappling Hook](https://scryfall.com/card/zen/203/grappling-hook) | 대륙 Ondu | 자식 지도 Makindi Trenches (세계 자리 [316.4, 968.4]) 추정 | 공식 칼럼 'The Master at Arms'(Savor the Flavor, 2009)는 갈고리(grappling hook)를 '코르의 가장 기본이 되는 도구'라 한다. 칼럼은 갈고리가 반은 무기 반은 도구로, 코르가 벗이든 적이든 주변 세상과 자신을 잇는 수단이라고 쓴다. 그 단락 바로 위에는 이 카드 그림의 일부(사슬로 이은 양끝 갈고리)가 설명 없이 실렸다. 공식 가이드 개관(2009)도 코르가 밧줄과 갈고리로 여행하고 사냥하며, 갈고리 달린 줄을 서로와 세상을 잇는 사회적·신성한 상징으로 여긴다고 쓴다. 플레이버는 'Part tool, part weapon, part of the kor.'(반은 도구, 반은 무기, 그리고 코르의 일부)이다. 갈고리가 어디 있는지는 어느 글도 쓰지 않는다. **추정:** 어디 있는 물건인지 밝힌 공식 서술은 없다. 같은 칼럼은 코르가 갈고리의 한쪽 끝으로 '아찔한 수직 마을 Cliffhaven'에 몸을 붙들어 맨다는 예를 든다. 아트북(2016)은 코르가 마킨디 협곡의 거처를 모두 Cliffhaven이라 부른다고 쓴다. 이 둘을 이어 이 지도가 마킨디 협곡 지역 지도의 코르 거처(줄과 도르래에 매단 천막) 곁에 두었다. |

### 자식 지도 (`scripts/childmaps/art/<id>.js` → `src/map/childmaps/<id>.ts`)

자식 지도는 작은 대상이 사는 지역을 세계 지도의 약 10배 축척으로 따로 그린 지역 지도다. 세계 지도의 그 범위(`PHASE1_CHILD_MAPS` 의 `bounds`)를 늘린 좌표라 해안·호수·숲 빛깔과 장소·대지 카드 표시의 자리는 세계 지도에서 그대로 가져오고, 그 위에 지형 기호 칸(산·숲·늪·협곡)과 손으로 그린 지형지물, 공식 이름표, 작은 대상의 그림을 얹는다. 그리는 방식은 `scripts/childmaps/STYLE.md`, 공통 그리기 도구는 `scripts/childmaps/kit.js`.

지역마다 공식 자료로 '무엇을 그리고 이름을 달아도 되는지'를 먼저 조사하고 따로 검증한 뒤(그릴 시기, 그려도 되는 것, 지어 그리면 안 되는 것), 그 범위 안에서 그렸다. 이름표는 공식 이름만 달고, 한국어는 공식 한국어판 카드에 인쇄된 이름만 쓴다(구역 이름처럼 인쇄된 한국어가 없으면 영어 그대로). 공식 자료가 위치나 모양을 말하지 않는 것을 그린 곳은 이 지도의 해석이며, 머리말의 해석 안내(`PHASE1_CHILD_MAPS` 의 `note`)에 적었다.

- **Eye of Ugin** (Eldrazi Monument, Sorin Markov, Chandra Ablaze, Day of Judgment) — Eye of Ugin 자리의 구덩이·잔해 더미·쓰러지거나 떠도는 다면체·가루가 된 땅은 마지막 공식 묘사(2015–16년, The Art of Magic: Zendikar·Stone and Blood·Revelation at the Eye)를 따랐고, 2020년 이후의 모습은 알려지지 않았다. 아파로 흐르는 강의 물길, Windblast Gorge의 윗머리, 가시지대 결정 들판의 범위는 세계 지도가 추정으로 그은 자리를 그대로 옮겼다. 산줄기·절벽·협곡의 생김새, 떠 있는 유적 지대, 인물 그림과 Day of Judgment 상징의 자리는 공식 자료에 없어 이 지도가 정한 해석이며, Day of Judgment는 플레이버의 화자 소린 곁에 둔 상징일 뿐 이 주문이 이곳에서 쓰였다는 공식 서술은 없다.
- **Malakir** (Kalitas, Bloodchief of Ghet, Blood Tribute, Bloodghast, Malakir Bloodwitch, Sadistic Sacrament, Blade of the Bloodchief) — 구역 이름과 높낮이, Emevera 구역의 무너진 제방과 게트 구역의 침수는 공식 서술(2009년 가이드, 2016년 아트북)을 따랐고, Zendikar Rising 시점의 서술이 없어 구역들은 2016년의 무너진 모습으로 그렸다. 언덕의 모양, 구역들의 방위와 경계, 성벽·성문·운하·제방의 배치, 말라키르 수렁의 범위, 페이즈 그림 여섯의 자리는 이 지도의 해석이다. 도시 북쪽·동쪽의 늪숲과 성문으로 오는 길이 지나는 남동쪽 정글은 세계 지도가 추정으로 그린 풍경을 이 축척으로 옮긴 것이다.
- **Tangled Vales** (Nissa Revane, Bala Ged Thief, Beastmaster Ascension, Oracle of Mul Daya) — Tangled Vales·Guum Wilds·Bojuka Bay 이름, 대지 카드 '뒤엉킨 계곡'(ZNR #211)의 들꽃 빈터와 쓰러진 헤드론 두 개, 다시 자라는 발라 게드의 숲(Episode 5, 2020)은 공식 자료를 따랐고, Bojuka Bay 서쪽·남서쪽 기슭의 절벽은 세계 지도의 추정 선(bojuka-cliffs-southwest)을 이 축척으로 그대로 옮겼다(폭포는 그리지 않았다). 숲의 짙고 옅음과 빈터의 배치, 절벽 위의 좁은 늪, 니사와 Oracle of Mul Daya(북쪽 짙은 숲, Guum Wilds 남쪽 가장자리)·Bala Ged Thief(서쪽 숲)·Beastmaster Ascension 짐승 무리(헤드론 빈터 남쪽으로 이어진 빈터)의 자리는 이 지도의 해석이다. 2009년의 가파른 언덕과 Umung River의 물길은 엘드라지 침공 때 하얀 먼지가 되었다는 서술(2015–16)만 있고 되살아났다는 공식 서술이 없어 그리지 않았다.
- **Makindi Trenches** (Warren Instigator, Armament Master, Conqueror's Pledge, Devout Lightcaster, Grappling Hook) — 협곡의 미로와 지층 벽, 급류나 맨바위로 끝나는 바닥, 불안정한 봉우리, 암벽의 고블린 굴, 코르의 매달린 임시 거처는 공식 서술(PG: Ondu·PG: Goblins 2009, 아트북 2016, ZNR 카드)을 따랐고, 급류 두 줄기와 Prison of Omnath 메사의 서쪽 벼랑·꼭대기 숲은 세계 지도가 추정한 물길과 자리를 그대로 옮겼다. 협곡 갈래의 모양, 굴·거처·봉우리·유적·짐승의 자리, Warren Instigator와 코르 넷(Armament Master·Conqueror's Pledge·Devout Lightcaster·Grappling Hook)을 둔 자리는 공식 자료가 위치를 말하지 않아 이 지도가 정한 추정이다. 세계 지도가 마킨디 메사를 이 범위 밖에 두므로 이곳의 메사에는 이름을 달지 않았다.
- **Jwar Isle** (Mindbreak Trap) — 해안선, 장소 표시, 섬 가운데의 Strand 구덩이 자리, 섬을 에워싼 소용돌이 해류는 세계 지도와 공식 서술(PG: Ondu, Art of Magic, Hunger)을 따랐고, 큰 소용돌이를 네 방위에 둔 것은 세계 지도의 선택이다. 돌 절벽이 동쪽 만 안쪽에서 남쪽을 보고 선다는 것, 파둔 하나하나의 자리와 방향, 상륙 해변·밧줄 걸린 바위 발판·Strand 구덩이·하늘거주지 잔해의 모양과 크기, 바다뱀의 자리, Mindbreak Trap을 파둔 곁에 둔 것은 공식 서술에 기댄 이 지도(와 세계 지도)의 해석이다.
- **Halimar** (Archmage Ascension, Rite of Replication, Sea Gate Loremaster) — 다시 세운 바다 관문(댐 위 거리와 장터, 헤드론 여섯의 전쟁 기념비, 다시 선 등대)과 물이 다시 찬 할리마르, 마고시 폭포의 단애·계단·육로 거점은 2020년 무렵의 공식 서술을 따랐고, 2020년 모습이 서술되지 않은 Merfolk Enclave(폐허)·Tikal Harborage·Wren Grotto·산호투구·Sky Rock은 마지막 공식 묘사(2015–16)를 따랐다. 등대·성문·기념비의 자리와 댐 위 거리의 배치, 협곡 벽·Enclave 섬·Tikal 웅덩이의 모양과 어귀 가까이 넓어진 협곡, 물에 잠긴 유적의 모습, 떠 있는 헤드론과 뱃길의 자리, 세 인물의 자리는 이 지도의 해석이며, 오란리프는 세계 지도처럼 살아 있는 숲으로 그렸다.
- **Kabira** (Kabira Evangel, Luminarch Ascension) — 해안선과 장소·카드 표시는 세계 지도를 따랐고, 두 협곡의 자리와 협곡 북쪽을 덮는 습지 범위는 세계 지도의 추정을 따랐다. 헤드론의 모양과 문양을 본뜬 카비라 건물, 쓰러져 반쯤 묻힌 흰 헤드론 묘지, 솟았다 비스듬히 내려앉은 흙 원반과 별 모양으로 모인 헤드론 무리, 미끄러운 벼랑의 깊은 협곡, 해가 들지 않는 협곡 벽에 새긴 Crypt 아치(조각한 기둥, 작은 헤드론 테, 벽에서 솟은 가시, 박쥐)는 공식 서술(PG 2009, Javad 2009, AoM 2016)을 따랐다. 건물의 수·모양·배치와 Conservatory로 고른 건물, 교차로에서 갈라지는 길, Crypt 협곡 머리에서 서쪽으로 꺾여 아치에 이르는 갈래, 헤드론·흙 원반·별 무리·웅덩이의 자리와 크기, 두 인물의 자리는 이 지도의 해석이다.
- **Tal Terig** (Archive Trap, Lavaball Trap, Summoning Trap) — 탑의 모습(크고 작은 정육면체와 한 변 20피트의 정사면체를 아무렇게나 쌓은 듯한 기둥, 결정과 돌에 묻힌 밑동)은 PG: Akoum(2010)과 The Art of Magic(2016)의 서술을 따랐고, 2016년 이후의 모습은 알려지지 않았다. 해안선과 해안 벼랑, 화산 유리 첨탑과 물밑 결정 초의 자리, 두 산줄기와 가시지대 결정 들판의 범위는 세계 지도와 같다. 탑을 이룬 도형의 배치, 산줄기와 결정 가시 무리의 생김새, Raging Ravine 골짜기의 모양, 이름 없는 가시 지붕 굴과 점선 길, 세 함정 그림(Summoning·Archive·Lavaball Trap)의 자리는 이 지도의 해석이다.

처음 다섯 지도를 그린 뒤 세계 지도에 바탕 지형(강·절벽·협곡·숲·늪 영역, `src/data/landscape`, `docs/landscape.md`)이 생겨, 자식 지도도 그 범위 안의 바탕 지형을 같은 자리에 그렸다. 그래서 처음 설정 조사가 '지어 그리지 않는다'고 적었던 것 가운데 세계 지도가 추정으로 그리게 된 것(마킨디 협곡의 급류 물길, Eye of Ugin 범위의 아파로 흐르는 강과 Windblast Gorge, Bojuka Bay 서쪽 기슭의 절벽)은 두 지도가 어긋나지 않도록 세계 지도를 따랐고, 각 지도의 해석 안내에 적었다.

## 추정 위치 — 대륙까지만 알려진 장소 (`placement: 'estimate'`)

공식 자료가 대륙(과 지형·이웃 같은 단서)까지만 밝혀 예전에는 지도에 찍지 않던 장소들이다. 사용자 요청으로 모두 지도에 찍었다. 장소마다 공식 단서(이웃 장소, 지형, 이야기 속 길)를 먼저 모으고, 그에 맞는 땅·바다 위에서 기존 표시와 겹치지 않고 자식 지도 범위 밖인 자리를 이 지도가 골랐다. 고른 까닭은 `locations.ts` 의 `estimate` 에 있고 패널에 '추정'으로 보인다. 마커 모양은 다른 장소와 같다. 공식 위치 서술이 자리를 꽤 집어 주는 두 곳(Windblast Gorge, Murasa's Wall)은 `canon-hint` 로 두었다. 떠도는 곳(고마 파다, 하늘거주지 조각)과 길(Rogah Throughway·Akoum's Belt·Pass of Woe)은 대표 한 점이고, 이 지도가 고른 지역의 범위에는 지형 기호를 그리지 않는다(이름만). 이어진 대지 카드 표시가 곧 그 장소의 표시인 다섯 곳(Sejiri Steppe, Teetering Peaks, Emeria, Magosi Falls, Halimar Depths)은 카드 표시를 그대로 쓴다.

| 장소 | 대륙 | 자리 | 근거 |
| --- | --- | --- | --- |
| Akoum Skyclave (아쿰 하늘거주지) | 아쿰 | [1965, 532] | 추정 |
| Akoum's Belt | 아쿰 | [1720, 575] | 추정 |
| Fort Keff | 아쿰 | [2058, 492] | 추정 |
| Goma Fada (고마 파다) | 아쿰 | [1880, 565] | 추정 |
| Pass of Woe | 아쿰 | [1620, 440] | 추정 |
| Rogah Throughway | 아쿰 | [2100, 590] | 추정 |
| Sawtooth Ridge | 아쿰 | [2030, 518] | 추정 |
| Windblast Gorge | 아쿰 | [1920, 482] | 공식 위치 서술(canon-hint) |
| Bala Ged Sanctuary (발라 게드 성소) | 발라 게드 | [2200, 1112] | 추정 |
| Bala Ged Skyclave | 발라 게드 | [2330, 878] | 추정 |
| Bordermire | 발라 게드 | [2125, 1006] ±[9, 30] | 추정 |
| Khalni Heart | 발라 게드 | [2145, 978] | 추정 |
| Riverroot Village | 발라 게드 | [2142, 1030] | 추정 |
| Surrakar caves | 발라 게드 | [2175, 940] | 추정 |
| Throne of Obuun | 발라 게드 | [2252, 890] | 추정 |
| Guul Draz Skyclave | 굴 드라즈 | [1880, 1040] | 추정 |
| Outpost of Nirkana | 굴 드라즈 | [2098, 1222] | 추정 |
| Doom Maw | 무라사 | [1240, 1545] | 추정 |
| Grindstone Crucible | 무라사 | [1104, 1572] | 추정 |
| Kazandu Valley (카잔두 계곡) | 무라사 | [1322, 1494] ±[16, 20] | 추정 |
| Living Spire | 무라사 | [1094, 1562] | 추정 |
| Murasa's Wall | 무라사 | [1012, 1514] | 공식 위치 서술(canon-hint) |
| Silent Gap | 무라사 | [1360, 1562] | 추정 |
| Tajuru Grove | 무라사 | [1270, 1458] ±[16, 12] | 추정 |
| Cliffhaven (절벽피난처) | 온두 | [500, 960] | 추정 |
| Wolfbriar | 온두 | [225, 1350] | 추정 |
| Benthidrix (벤티드릭스) | 세지리 | [1060, 40] | 추정 |
| Sejiri Glacier (세지리 빙하) | 세지리 | [675, 60] ±[70, 35] | 추정 |
| Sejiri Skyclave | 세지리 | [1790, 45] | 추정 |
| Halimar Sea Caves | 타짐 | [1291, 840] | 추정 |
| Magosi Portage | 타짐 | [1219, 831] | 추정 |
| Merfolk Enclave | 타짐 | [1212, 873] | 추정 |
| Ruins of Ysterid | 타짐 | [1190, 836] | 추정 |
| The Sunspring | 타짐 | [1027, 866] | 추정 |
| Tikal Harborage | 타짐 | [1207, 858] | 추정 |
| Umara Skyfalls (우마라 하늘폭포) | 타짐 | [1184, 798] | 추정 |
| Wren Grotto | 타짐 | [1219, 847] | 추정 |
| Serpent's Maw | 대륙 밖 바다 | [770, 1400] ±[70, 40] | 추정 |
| Yawning Chasm | 대륙 밖 바다 | [645, 1295] ±[26, 14] | 추정 |

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
