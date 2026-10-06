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

## ZEN 대지 카드 (`src/data/cards.ts`)

Zendikar(2009) 세트의 기본대지가 아닌 대지 20장(#210–229)이다. 카드 정보와 그림은 Scryfall에서 가져왔다. 지도에서는 이은 장소·대륙의 패널에 카드가 나온다.

- 장소에 잇는 것은 카드 이름이 곧 그 지명이거나(Refuge 대지도 지명을 따서 지었다 — Mark Rosewater, Making Magic 2020-06-22), 공식 자료가 그 그림을 그 장소의 그림이라고 밝힌 경우뿐이다.
- 공식 가이드·아트북이 설명 없이 어느 절에 그림을 실은 것은 삽화 배치일 뿐이라 대륙까지만 잇는다. 같은 그림을 다른 대륙에도 실은 Arid Mesa는 잇지 않는다.
- ZEN은 한국어판이 없다. 카드의 한국어 이름은 재판(MH2·ZNE)의 한국어판에 인쇄된 것만 쓴다. 이는 카드 이름이지 지명이 아니다.
- 조사 결과 지도 데이터에서 'Sejiri Refuge' 정착지 항목을 지웠다. 공식 자료에 그런 장소의 서술이 없고, 카드 이름은 세지리를 딴 것이다.

| # | 카드 | 이은 곳 | 근거 |
| --- | --- | --- | --- |
| 210 | [Akoum Refuge](https://scryfall.com/card/zen/210/akoum-refuge) | 대륙 Akoum | 카드 이름이 아쿰을 가리킨다 — Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Mark Rosewater, Making Magic, 2020). 아쿰 안의 어느 곳을 그렸는지는 공식 자료가 밝히지 않는다. |
| 211 | [Arid Mesa](https://scryfall.com/card/zen/211/arid-mesa) | 잇지 않음 | 공식 글이 같은 그림을 서로 다른 곳에 썼다 — 가이드 개관(2009)은 온두 단락 뒤에, PG: Murasa and Sejiri(2010)는 무라사 Na Plateau 항목 뒤에 실었다. 한 곳으로 정할 근거가 없다. |
| 212 | [Crypt of Agadeem](https://scryfall.com/card/zen/212/crypt-of-agadeem) | Crypt of Agadeem (`crypt-of-agadeem`) | 카드 이름이 곧 지명 |
| 213 | [Emeria, the Sky Ruin](https://scryfall.com/card/zen/213/emeria-the-sky-ruin) | Emeria (`emeria`) | 카드 이름이 곧 지명 |
| 214 | [Graypelt Refuge](https://scryfall.com/card/zen/214/graypelt-refuge) | Graypelt (`graypelt`) | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). 공식 가이드(PG: Ondu, 2009), Magic Story 'Nissa, Worldwaker'(2014), 아트북(2016)이 모두 이 그림을 Graypelt 서술 바로 곁에 실었다. |
| 215 | [Jwar Isle Refuge](https://scryfall.com/card/zen/215/jwar-isle-refuge) | Jwar Isle (`jwar-isle`) | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG: Ondu(2009)의 'Jwar, Isle of Secrets' 절과 아트북(2016)의 Jwar 절 바로 뒤에 이 그림이 실렸다. |
| 216 | [Kabira Crossroads](https://scryfall.com/card/zen/216/kabira-crossroads) | Kabira (`kabira`) | PG: Ondu(2009)가 Kabira 항목 바로 아래에, 아트북(2016)이 Kabira 서술 곁에 이 그림을 실었다. |
| 217 | [Kazandu Refuge](https://scryfall.com/card/zen/217/kazandu-refuge) | Kazandu (`kazandu`) | Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG: Murasa and Sejiri(2010)가 'Kazandu' 절 바로 뒤에 이 그림을 실었다. |
| 218 | [Magosi, the Waterveil](https://scryfall.com/card/zen/218/magosi-the-waterveil) | Magosi Falls (`magosi-falls`) | 카드 이름이 곧 지명 |
| 219 | [Marsh Flats](https://scryfall.com/card/zen/219/marsh-flats) | 대륙 Ondu | 공식 칼럼의 여행 일지 'The Journal of Javad Nasrin'(2009)이 카비라에서 북쪽으로 아가딤 섬을 가로지르는 대목(헤드론 지대와 습지를 가르는 협곡으로 들어가기 전날)에 이 그림 조각을 실었다(설명 글 없음). |
| 220 | [Misty Rainforest](https://scryfall.com/card/zen/220/misty-rainforest) | 대륙 Bala Ged | 공식 글 세 곳이 모두 발라 게드 서술에 이 그림을 실었다 — The World of Zendikar(2009)는 발라 게드 소개 뒤에, PG: Bala Ged and Elves(2009)는 Guum Wilds 항목 뒤에, 아트북(2016)은 Bala Ged 절 첫머리에(모두 설명 글 없음). 엘드라지 침공 전인 2009년의 그림이다. |
| 221 | [Oran-Rief, the Vastwood](https://scryfall.com/card/zen/221/oran-rief-the-vastwood) | Oran-Rief (`oran-rief`) | 공식 기사 'Ruins of Oran-Rief'(2015)가 이 카드 그림을 처음의 오란리프를 그린 그림으로 소개한다. |
| 222 | [Piranha Marsh](https://scryfall.com/card/zen/222/piranha-marsh) | 잇지 않음 | 어디를 그렸는지 밝힌 공식 자료가 없다 — 공식 기사는 '피라냐가 사는 위험한 늪'이라는 분위기만 말한다(Savor the Flavor, 2009). |
| 223 | [Scalding Tarn](https://scryfall.com/card/zen/223/scalding-tarn) | 대륙 Ondu | PG: Ondu(2009)가 베이인 섬 절 끝, The Boilbasin 항목(바닷물과 지열 온천이 섞여 김이 끓는 조수 웅덩이)과 탐험 일지 인용문 바로 뒤에 이 그림을 실었다(설명 글 없음). |
| 224 | [Sejiri Refuge](https://scryfall.com/card/zen/224/sejiri-refuge) | 대륙 Sejiri | 카드 이름이 세지리를 가리킨다 — Refuge 대지는 젠디카르의 지명을 따서 이름 지었다(Rosewater, 2020). PG(2010)와 아트북(2016)이 세지리의 거점·탐험가 서술 곁에 실었지만 특정 장소를 밝히지는 않는다. |
| 225 | [Soaring Seacliff](https://scryfall.com/card/zen/225/soaring-seacliff) | 대륙 Murasa | 지명이 아닌 카드지만, 공식 기사 'The Tyrant of the Cliffs'(2010)가 무라사 해안 절벽 장면에, 아트북(2016)이 무라사 서술 한가운데에 이 그림을 실었다. |
| 226 | [Teetering Peaks](https://scryfall.com/card/zen/226/teetering-peaks) | Teetering Peaks (`teetering-peaks`) | PG: Ondu(2009)가 Teetering Peaks 항목 바로 아래에 이 그림을 실었다. |
| 227 | [Turntimber Grove](https://scryfall.com/card/zen/227/turntimber-grove) | Turntimber (`turntimber`) | PG: Ondu(2009)와 아트북(2016)이 이 그림을 Turntimber 숲 서술 안에 실었다. |
| 228 | [Valakut, the Molten Pinnacle](https://scryfall.com/card/zen/228/valakut-the-molten-pinnacle) | Valakut (`valakut`) | 카드 이름이 곧 지명 |
| 229 | [Verdant Catacombs](https://scryfall.com/card/zen/229/verdant-catacombs) | 대륙 Murasa | PG: Murasa and Sejiri(2010)가 카잔두의 Root Caves 항목(자디 나무 뿌리가 만든 골짜기에서 땅속으로 열린 틈) 바로 뒤에 이 그림을 실었다(설명 글 없음). |

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
