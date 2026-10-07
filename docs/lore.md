# 젠디카르 설정 정리

지도에 무엇을 어떻게 그릴지 판단하는 근거다. 2026-10 기준으로 공식 자료를 조사해 정리했다.
대륙별 지명과 설명, 각각의 출처는 `src/data/locations.ts`·`continents.ts`에 있다.

## 자료 우선순위

1. 공식 자료
   - magic.wizards.com 기사: *A Planeswalker's Guide to Zendikar* 연재(2009–10, 이하 PG), *Zendikar: Things Have Changed*(2020), Magic Story 단편
   - *Plane Shift: Zendikar*(2016 PDF)
   - 카드의 이름·유형·플레이버 텍스트 (Scryfall로 확인)
2. MTG Wiki — 위 자료를 인용한 문장만 쓴다
3. 쓰지 않는 것: 팬 지도, 팬 기사, 출처 없는 위키 문장

## 공식 세계 지도는 없다

다음 자료 어디에도 대륙 배치를 보여 주는 세계 지도가 없다.
- PG 연재, *Zendikar/Worldwake Player's Guide*
- *Plane Shift: Zendikar*, *The Art of Magic: The Gathering – Zendikar*(2016)
- ZNR 자료

설정 안에서도 지도는 믿을 수 없는 것으로 그려진다.
> "Most inhabitants of Zendikar have given up on the idea of an accurate map." — *Spreading Seas* (ZEN)
>
> "A map is a brittle record; do not rely on images made of the past. The land makes itself new each day with the sun, so we celebrate its rebirth." — Tajuru 대변인 Sutina (PG: Bala Ged)

그래서 이 지도의 대륙 배치는 **글로 된 공식 단서에 어긋나지 않게 고른 배치**다. 해안선 모양은 팬 지도(`asset/`)에서 땄고, 자리만 아래 단서에 맞춰 옮겼다(`scripts/geo/extract_geo.py`의 `LAYOUT`).

| 단서 | 출처 | 반영 |
| --- | --- | --- |
| "Ondu is a continent in the southwestern quadrant of Zendikar that juts into the Silundi Sea." | PG: Ondu (2009) | Ondu를 남서쪽으로 옮김 (팬 지도는 북서) |
| Ondu = 본토 + 세 섬: 가장 크고 가장 남쪽인 Agadeem, Beyeen, 본토 남쪽 해안 가까이의 Jwar | PG: Ondu | 세 섬을 본토 남쪽에 둠 (팬 지도는 북동쪽 바다) |
| Agadeem 북쪽 해안과 본토(Turntimber) 사이는 Silundi Sea의 좁은 띠 | PG: Ondu, Javad Nasrin 일지 | Agadeem을 Turntimber 바로 남쪽 좁은 해협 너머에 둠 |
| Guul Draz 해안에서 "beyond the narrow waters, was Tazeem" | *Memories of Blood* (2015) | Tazeem을 Guul Draz 서쪽, 좁은 바다 건너에 둠 |
| Sea Gate에서 "dawn broke golden over the sea to the east" | *The Liberation of Sea Gate* (2015) | Sea Gate(동쪽 해안)가 그 바다를 마주 봄 |
| Akoum의 kor 난민은 두 대륙과 바다를 건너 Sea Gate에 왔다 | *The Survivors of Sky Rock* (2015) | Akoum → 섬 사슬 → Guul Draz → 해협 → Tazeem |
| "The island continent of Murasa… smaller than other continents" | PG: Murasa and Sejiri | Murasa를 0.8배로 줄여 가장 작게 |
| Singing City에서 Nissa가 "turned east… toward Bala Ged" | ZNR Episode 5 | Bala Ged가 Murasa 동쪽에 오게 함 |
| Bala Ged는 "separated from the continent of Guul Draz by a miles-long marsh" | PG: Bala Ged | 한 덩어리로 그리되 경계선을 긋는다. 두 땅이 이어지는 늪지는 엘드라지 전쟁으로 황폐해져 Lake of Dust라 불리므로(Art of Magic, 2016), ZNR 시점 지도에는 늪 기호를 두지 않는다 |
| "The northernmost part of Guul Draz is connected to Bala Ged" | The Art of Magic: Zendikar (2016) | 반영하지 못함 — 팬 지도 해안선에서 Bala Ged는 Guul Draz 동쪽(북동쪽) 덩어리라 두 땅은 동쪽 측면에서 이어진다. Lake of Dust는 그 접점의 북쪽 끝에 두었다 |
| Sejiri는 "polar region", Benthidrix는 "beneath the northern sea ice" | PG, *Cleric of Chill Depths* (ZNR) | Sejiri를 맨 위(북쪽)에 둠 |
| Tazeem 해안에서 Murasa까지는 "a great, wide ocean"을 건너는 "long and arduous" 뱃길 | *Home Waters* (2015) | Tazeem을 120단위 북쪽으로 옮겨 Murasa와의 바다를 넓힘 (팬 지도 그대로 옮긴 배치에서는 두 대륙 사이가 '좁은 바다'보다 좁았다). Guul Draz와의 '좁은 바다'는 그대로 |
| Midnight Pass는 절벽 사이로 깊이 파고드는 좁은 해협 | PG: Murasa and Sejiri (2010) | 팬 지도가 그린 물길을 해안선 추출에서 살림 (`extract_geo.py` 의 `CUTS`) |

팬 지도와 달리 이 지도는 대륙의 모양을 지어내지 않는다. 다만 위치는 위 단서를 지키는 한 가지 해석일 뿐이다.

## 시점

**Zendikar Rising(2020) 시점**을 기본으로 한다. 이전·이후의 변화는 장소마다 `history`에 적는다.

- **ZEN/WWK (2009–10, 약 4557 AR)**: 엘드라지가 Teeth of Akoum 아래에 잠들어 있던 모험의 시대다. PG 연재가 이 시점을 기준으로 한다.
- **ROE (2010)**: 타이탄이 풀려났다.
- **BFZ/OGW (2015–16)**: Sejiri와 Bala Ged가 전멸했다. Sea Gate·Malakir·Oran-Rief가 함락되었고 Halimar 분지는 물이 빠졌다. 타이탄은 Halimar 분지에서 소멸했다.
- **ZNR (2020, 약 4561 AR)**: Sea Gate가 재건되었고 Roil이 돌아왔다. 일곱 하늘거주지(Skyclave)가 대륙마다 떠올랐다. 이야기 끝에 Singing City가 사라졌고 Bala Ged는 다시 푸르러졌다.
- **MOM (2023)**: 피렉시아화된 Nahiri가 Emeria 하늘거주지를 축으로 침공했다. 끝에 Emeria 하늘거주지가 땅으로 추락했다.
- Reality Fracture(2026)의 Echoverse는 대체 현실이라 반영하지 않는다.

## 로일 (Roil, 공식 한국어 '탁류')

- 지형·기후·생물이 격렬하고 불규칙하게 바뀌는 현상 전체를 말한다.
  - 바위·결정이 솟았다 가라앉는다.
  - 깔때기 구름, 배를 삼키는 소용돌이, 싱크홀, 폭발적인 식생 성장이 일어난다.
- 실제로는 엘드라지라는 '감염'을 몰아내려는 젠디카르의 면역 반응이다. ZNR에도 계속된다.
  > "In theory, the death of the Eldrazi should have stilled the Roil. It did not." — *Into the Roil*
- 지역마다 다르게 나타난다.
  - Tazeem: '위에서' (떠 있는 헤드론 지대)
  - Akoum: '아래에서' (마그마, 가스, 결정 파편)
  - Akoum 해안선은 해마다 바뀌어 영구 항구가 없다.
- 지도 표현: 고정된 경계나 지형 유형으로 칠하지 않는다.

## 헤드론 (hedron, 카드명 '다면체' / 플레이버 '헤드론')

- Nahiri가 깎고 Ugin이 룬을 새겨 띄운, 엘드라지를 가두기 위한 돌이다. 약 6천 년 전에 만들어졌다.
  - Sorin이 미끼, Ugin이 무색 마법, Nahiri가 '돌 다이아몬드'를 맡았다.
- 모양: 삼각형 면 여덟 개로 된 길쭉한 팔면체다. 크기는 주먹만 한 것부터 10마일까지 있다.
- 룬은 활성화될 때만 빛난다(BFZ 헤드론 고리, MOM). 그래서 지도에서는 새긴 선으로만 그린다.
- 분포
  - **Tazeem 상공**: 거대한 잔해가 하늘을 메운다. Tazeem 경계를 넘지 못한다.
  - **Agadeem**: 쓰러져 반쯤 묻힌 '헤드론 묘지'다.
  - **Sejiri의 Ikiral**: 쪼개진 거대 헤드론 안에 있다.
  - **Sky Rock**: Sea Gate 남쪽에 떠 있는 거대 헤드론 땅덩이다.
- 헤드론과 하늘거주지는 다르다. 하늘거주지는 그보다 앞선 kor Makindi 제국의 것이다.

## 엘드라지

- Ulamog, Kozilek, Emrakul. 약 6천 년 전 Akoum 지하의 Eye of Ugin에서 봉인되었다.
- **Eye of Ugin은 지하의 방**이다. 지도에서는 지하 기호로 표시하고, 지표 위의 탑처럼 그리지 않는다.
- 남긴 흔적
  - Ulamog: 회백색 분필 먼지
  - Kozilek: 기름막 색의 기하학적 왜곡
  - Emrakul: 살·뼈·노란 먼지. ROE 때 Akoum에만 남겼다.
- 공식 한국어: 엘드라지, 울라목, 코질렉, 엠라쿨, 우진(Ugin)

## 하늘거주지 (Skyclave, 공식 한국어 '하늘거주지')

- 엘드라지 도래 수 세기 전, kor의 Makindi 제국이 대륙마다 하나씩 띄운 부유 요새다(Makindi는 Ondu에 있었다).
- 모두 무너졌다가 ZNR에 함께 다시 떠올랐다.
- 위치가 공식적으로 확인되는 곳

  | 대륙 | 위치 |
  | --- | --- |
  | Murasa | Sunder Bay 위 |
  | Ondu | Jwar 섬(추락했던 곳) |
  | Akoum | 용암 들판 위 |
  | Tazeem | Emeria. Sea Gate에서 먼 내륙 |

- 나머지 셋(Bala Ged, Guul Draz, Sejiri)은 '대륙 위 하늘' 말고는 알 수 없어 지도에 찍지 않는다.

## 종족 (공식 한국어 표기가 있는 것)

| 종족 | 사는 곳 |
| --- | --- |
| 코르 | 유목, 절벽 피난처 |
| 인어 | Tazeem 중심, Emeria/Ula/Cosi 신조 |
| 엘프 | Tajuru '타주루'(Murasa), Joraga '조라가'(Bala Ged), Mul Daya '물 다야'(Bala Ged) |
| 흡혈귀 | Guul Draz, Malakir |
| 고블린 | Tuktuk '툭툭', Grotag '그로타그', Lavastep '용암발자국' |
| 인간 | 모든 대륙 |
| 그 밖 | 미노타우로스, 오우거, 거인, 천사, 정령 |

- 도시급 정착지(인구 수천)는 Sea Gate, Affa, Free City of Nimana, Malakir 정도다. 젠디카르에는 대도시가 드물다.

## 신앙의 진실

- 인어의 세 신과 kor의 세 신은 모두 엘드라지 타이탄에 대한 흐려진 기억이다.

  | 인어 | kor | 실제 |
  | --- | --- | --- |
  | Emeria | Kamsa | Emrakul |
  | Ula | Mangeni | Ulamog |
  | Cosi | Talib | Kozilek |

## 지도에서 하지 않는 것

- 팬 지도의 지명·배치를 그대로 정사로 쓰지 않는다. 설정과 대조해서 맞는 것만 쓴다.
- 위치를 지어낸 것처럼 보이게 찍지 않는다. 공식 자료가 대륙(과 지형·이웃 같은 단서)까지만 밝힌 곳은 사용자 요청으로 지도에 찍되, 이 지도가 고른 자리라고 패널에 '추정'과 그 까닭을 적는다(`placement: 'estimate'`).
- 페이즈 카드의 그림을 지도에 붙이지 않는다. 카드의 대상을 지도 화풍의 그림으로 대상 크기에 맞춰 그리고, 카드는 패널에 근거로만 싣는다. 사람만 한 대상은 그 지역의 자식 지도에 넣는다.
- 자식 지도(그 지역을 따로 그린 지역 지도)에 공식 서술이 없는 지형지물을 지어 그리거나, 이름 없는 지형지물에 이름을 붙이지 않는다. 공식 서술이 위치까지 말하지 않는 것(말라키르의 구역 배치 등)을 그릴 때는 그 배치가 이 지도의 해석이라고 자식 지도의 해석 안내에 적는다.
- 작은 섬을 기호로 덮지 않는다. 섬이 화면에서 기호 한 칸(넓이의 제곱근 12px)보다 작은 배율에서는 그 섬 위의 기호를 그리지 않고, 확대하면 다시 그린다(`ZendikarMap.tsx` 의 `LAND_MIN_PX`).
- 공식 자료에 없는 지형(강·화산·폭포 등)은 그리지 않는다(근거와 추정의 기록은 `docs/landscape.md`). 공식 자료가 그 지형이 있다고만 하고 물길·자리·범위를 밝히지 않으면, 사용자 요청으로 이 지도가 골라 그리고 고른 까닭을 데이터의 `estimate` 에 적는다(`src/data/landscape/`). 추정한 지형도 모양은 근거 있는 지형과 같다.
- 카드 그림을 보고 어디인지 짐작해 장소에 잇지 않는다(`src/data/cards.ts`).
  - 공식 근거로 보는 것은 카드 이름이 곧 그 지명이거나(Refuge 대지도 지명을 따서 지었다 — Mark Rosewater, 2020), 공식 자료가 그 그림을 그 장소의 그림이라고 밝힌 경우뿐이다.
  - 공식 가이드·아트북이 설명 없이 어느 절에 그림을 실은 것은 삽화 배치일 뿐이다. 그런 카드와, 이은 장소의 위치가 알려지지 않은 카드도 사용자 요청에 따라 지도에 두되, 이 지도의 판단(추정)으로 표시한다 — 패널에 '추정'과 그 이유.
  - 카드 이름이 장소의 이름이나 공식 별칭과 같으면 같은 곳이다. 지도·검색·목록에 둘로 나누지 않고 장소 하나로 싣는다.
- 대륙 하나를 한 가지 마나 색으로 칠하지 않는다.
- 공식 종족 목록에 없는 종족을 넣지 않는다.
- 한국어판이 없는 이름(Eye of Ugin 등)에 한국어를 지어 붙이지 않는다.
- 'Ugin'을 '우긴', 'Ulamog'를 '울라모그'로 쓰지 않는다. 공식 표기는 '우진', '울라목'이다.
