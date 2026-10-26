# 젠디카르 설정 정리

지도에 무엇을 어떻게 그릴지 판단하는 근거다. 2026-10 기준으로 공식 자료를 조사해 정리했다.
대륙별 지명과 설명, 각각의 출처는 `src/data/locations.ts`·`continents.ts`에 있다.

## 자료 우선순위

1. 공식 자료
   - magic.wizards.com 기사: *A Planeswalker's Guide to Zendikar* 연재(2009–10, 이하 PG), *Zendikar: Things Have Changed*(2020), *The Legends of Zendikar Rising*(2020), *Zendikar Rising Art Descriptions*(2020), Magic Story 단편
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

그래서 이 지도의 대륙 배치는 **글로 된 공식 단서에 어긋나지 않게 고른 배치**다. 해안선 모양은 팬 지도(`asset/`)에서 땄고, 자리만 아래 단서에 맞춰 옮겼다(`scripts/geo/extract_geo.py`의 `LAYOUT`). 바다가 지도의 대부분을 차지하지 않게 모든 대륙을 팬 지도의 1.2배로 키웠다(사용자 요청, 땅 0.27 → 0.39) — 대륙 사이 간격은 아래 단서를 지키며 계산으로 다시 골랐다.

| 단서 | 출처 | 반영 |
| --- | --- | --- |
| "Ondu is a continent in the southwestern quadrant of Zendikar that juts into the Silundi Sea." | PG: Ondu (2009) | Ondu를 남서쪽으로 옮김 (팬 지도는 북서) |
| Ondu = 본토 + 세 섬: 가장 크고 가장 남쪽인 Agadeem, Beyeen, 본토 남쪽 해안 가까이의 Jwar | PG: Ondu | 세 섬을 본토 남쪽에 둠 (팬 지도는 북동쪽 바다) |
| Agadeem 북쪽 해안과 본토(Turntimber) 사이는 Silundi Sea의 좁은 띠 | PG: Ondu, Javad Nasrin 일지 | Agadeem을 Turntimber 바로 남쪽 좁은 해협 너머에 둠 |
| Guul Draz 해안에서 "beyond the narrow waters, was Tazeem" | *Memories of Blood* (2015) | Tazeem을 Guul Draz 서쪽, 좁은 바다 건너에 둠 |
| Sea Gate에서 "dawn broke golden over the sea to the east" | *The Liberation of Sea Gate* (2015) | Sea Gate(동쪽 해안)가 그 바다를 마주 봄 |
| Akoum의 kor 난민은 두 대륙과 바다를 건너 Sea Gate에 왔다 | *The Survivors of Sky Rock* (2015) | Akoum → 섬 사슬 → Guul Draz → 해협 → Tazeem |
| "The island continent of Murasa… smaller than other continents" | PG: Murasa and Sejiri | Murasa를 다른 대륙의 0.8배로 줄여 가장 작게 |
| Singing City에서 Nissa가 "turned east… toward Bala Ged" | ZNR Episode 5 | Bala Ged가 Murasa 동쪽에 오게 함 |
| Bala Ged는 "separated from the continent of Guul Draz by a miles-long marsh" | PG: Bala Ged | 한 덩어리로 그리되, 두 땅은 북쪽 끝의 이어진 땅(이 늪)에서만 맞닿게 하고(아래 줄) 그 구간에 경계선을 긋는다. 두 땅이 이어지는 늪지는 엘드라지 전쟁으로 황폐해져 Lake of Dust라 불리므로(Art of Magic, 2016), ZNR 시점 지도에는 늪 기호를 두지 않는다 |
| "The northernmost part of Guul Draz is connected to Bala Ged" | The Art of Magic: Zendikar (2016) | 팬 지도 해안선에서 Bala Ged는 Guul Draz의 북동쪽 덩어리라, 두 땅을 Guul Draz 북쪽 해안의 동쪽 끝(Lake of Dust)에서만 잇고 그 남쪽은 해협으로 갈랐다(`extract_geo.py` 의 `CUTS`, 해협의 자리·폭은 이 지도의 판단). 이어진 땅은 2009년의 '수 마일 길이의 늪'이자 2016년의 Lake of Dust로 읽는다 |
| Sejiri는 "polar region", Benthidrix는 "beneath the northern sea ice" | PG, *Cleric of Chill Depths* (ZNR) | Sejiri를 맨 위(북쪽)에 둠 |
| Tazeem 해안에서 Murasa까지는 "a great, wide ocean"을 건너는 "long and arduous" 뱃길 | *Home Waters* (2015) | Tazeem과 Murasa 사이를 170단위 넘게(지금 약 360) 벌려 Guul Draz와의 '좁은 바다'(25–45단위)보다 훨씬 넓게 둔다 (팬 지도 그대로 옮긴 배치에서는 두 대륙 사이가 '좁은 바다'보다 좁았다) |
| Midnight Pass는 절벽 사이로 깊이 파고드는 좁은 해협 | PG: Murasa and Sejiri (2010) | 팬 지도가 그린 물길을 해안선 추출에서 살림 (`extract_geo.py` 의 `CUTS`) |

팬 지도와 달리 이 지도는 대륙의 모양을 지어내지 않는다. 다만 위치는 위 단서를 지키는 한 가지 해석일 뿐이다.

## 시점

**Zendikar Rising(2020) 시점**을 기본으로 한다. 이전·이후의 변화는 장소마다 `history`에 적는다.

- **ZEN/WWK (2009–10, 약 4557 AR)**: 엘드라지가 Teeth of Akoum 아래에 잠들어 있던 모험의 시대다. PG 연재가 이 시점을 기준으로 한다.
- **ROE (2010)**: 타이탄이 풀려났다.
- **BFZ/OGW (2015–16)**: Sejiri와 Bala Ged가 전멸했다(BFZ). Sea Gate·Malakir가 함락되었다 — Sea Gate 는 BFZ 이야기에서 탈환되었다가 OGW 첫머리에 코질렉이 방파제를 뚫어 무너졌고, 그 틈으로 Halimar 의 물이 빠졌다(BFZ 무렵 Halimar 는 찼다). Oran-Rief 는 OGW 무렵 죽은 숲이 되었다. 타이탄은 물이 빠진 Halimar 분지에서 소멸했다.
- 페이즈를 켜면 그 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그린다(사용자 결정 2026-10-15 — CLAUDE.md '그 무렵 모습', 세계 지도는 `src/data/periods/`).
- 헤더의 '시점' 단추는 이 네 무렵을 해로 나눠 본다(사용자 결정 2026-10-19·2026-10-20 — CLAUDE.md '시점별 지도', `src/data/timeline.ts`): **2009** 엘드라지가 깨어나기 전(ZEN·WWK), **2010** 깨어남(ROE), **2015** 젠디카르 전투(BFZ), **2016** 타이탄 이후(OGW). 사가 보기가 세트(페이즈)마다 카드를 쌓는 것과 달리, 시점별 지도는 **있는 것은 이어 그린다** — 한 시점에 그린 인물·생물·종·주민·물건·지형지물은 설정상 사라졌다고 볼 까닭(죽음·파괴, 젠디카르를 떠남, 그 자리와 함께 먹히거나 무너짐)이 없으면 뒤의 시점에도, 생겨났다고 볼 까닭(태어남·만들어짐·깨어남, 젠디카르에 옴)이 없으면 앞의 시점에도 그린다(공식 근거가 없으면 패널에 '추정'). 엘드라지와 그 피해는 코질렉의 혈통까지 깨어남(2010)부터(그보다 늦게 그리는 것은 그 카드만의 근거 — 이름·플레이버·이야기 — 가 있을 때만: 엘드라지가 남긴 황무지에서 자랐다고 볼 것은 2015 부터, 2015년 말 코질렉과 함께 솟았거나 2016년 장면에 생겨났다고 볼 것은 2016 부터), 엘드라지와 싸우려 깨어난 원소와 그 전쟁으로 생긴 것은 생겨난 때부터 있다. 장면·주문·전투 순간은 그 무렵에만 그린다. 그래서 아이오나는 깨어남 뒤 경비 자리를 버리고 엘드라지와 싸웠지만 죽거나 떠났다는 서술이 없어 2016 까지 에메리아 곁에, 카줄은 2016 년에도 살아 있으므로(아트북) 네 시점 모두에 그리고, 사르칸은 젠디카르를 떠난 뒤(2015–2016), 오란리프의 짐승은 숲이 죽은 2016, 발라 게드의 짐승과 식물은 그 땅이 먹힌 2015–2016 에 그리지 않는다. 시점의 경계에 걸친 인물은 공식 근거를 따른다: 소린은 엘드라지가 풀려난 뒤에야 젠디카르에 왔으므로(아트북, 2016) 2010 에, 제이스는 2015 년에 다시 Eye of Ugin에 갔으므로(Revelation at the Eye) 2015 에도 그린다. 그 무렵 바탕이 자리를 지운 대상(흰 가루·죽은 숲·마른 바닥·폐허)은 근처의 맞는 땅으로 옮기거나 그 위 하늘에 둔다.
- **ZNR (2020, 약 4561 AR)**: Sea Gate가 재건되었고 Roil이 돌아왔다. 일곱 하늘거주지(Skyclave)가 대륙마다 떠올랐다. 이야기 끝에 Singing City가 사라졌고 Bala Ged는 다시 푸르러졌다.
- **MOM (2023)**: 피렉시아화된 Nahiri가 Emeria 하늘거주지를 축으로 침공했다. 끝에 Emeria 하늘거주지가 땅으로 추락했다.
- Reality Fracture(2026)의 Echoverse는 대체 현실이라 반영하지 않는다.

## 젠디카르 라이징(2020) 자료 — 사가3

사가3(`src/data/phase6.ts`, 지금은 ZNR 미식 레어 20장과 레어 56장)·ZNR 대지 카드(`src/data/cards.ts`, 주문//대지가 아닌 9장)와 시점 2020(T5)에 쓴 2020년 공식 자료다. 카드마다의 인용과 자리 판단은 그 카드의 `basis`·`estimate` 에 있다.

| 자료 | 이 지도에서 쓴 것 |
| --- | --- |
| *Zendikar: Things Have Changed* (Ari Zirulnik·James Wyatt, 2020-09-01) | 바다 관문 재건('Within a year, the city was restored' — Sea Gate Restoration·Tazri), 일곱 하늘거주지가 다시 떠오름과 그 방어가 깨어남(Ancient Greenwarden·Scourge of the Skyclaves), 굴 드라즈 하늘거주지는 늪에 가라앉았다 떠오름, 아쿰 하늘거주지 조각 가운데 '적어도 하나는 용의 둥지'(Leyline Tyrant), 무라사 하늘거주지는 바다 밑에 끌려 들어가 있었음(Lithoform Engine 의 앞 시점), 바다 관문 탐험 가문의 숨은 후원자 나히리, 살아 있는 마지막 혈족장 드라나, 아이오나가 떠나 지키는 이 없는 에메리아, 떠오른 하늘거주지는 '함정과 보물이 가득'(Nimble Trapfinder·Coveted Prize·Skyclave Relic), 바다 밑에 있는 동안 물에 잠긴 무라사 하늘거주지의 방(Confounding Conundrum), 엘프의 반란으로 무너졌던 발라 게드 하늘거주지(Nimble Trapfinder), 극지의 얼음에 갇혔던 세지리 하늘거주지(Skyclave Relic), 카르간 부족(Kargan Intimidator·Soul Shatter), 2020년 전부터 있던 다섯 탐험 가문(Glasspool Shore·Valakut 카드를 사가에 매지 않은 까닭) |
| *The Legends of Zendikar Rising* (Ari Zirulnik, 2020-09-15) | 바다 관문 사령관 타즈리, 엘드라지가 사라진 뒤에도 자라는 옴나스, 아쿰의 야생에 사는 모라우그, 천사들은 높이 날며 위험을 살핌, 드라나 때문에 위험한 굴 드라즈 · 레어: 바다 관문에 내려온 린발라('the only angel without' 후광은 *Things Have Changed*), 바다 관문 재건에 낀 일행 — 엘드라지가 쓰러진 뒤의 아키리('Once the Eldrazi were defeated'), 하늘거주지가 다시 떠오른 뒤의 오라('When the Skyclaves rose again'), 때를 밝히지 않은 카자(자레스·아키리가 원소의 공격에서 구한 뒤), 타짐 폐허와 함께 깊은 곳에서 솟은 카릭스, 무라사 깊은 곳의 작은 정원의 파일라스, 마고시 폭포 뒤 굴의 베라졸, 'the will of the Makindi Trenches' 야샤른, 하늘거주지를 뒤지는 드라나의 오른팔 자그라스, 가장 큰 교단의 타보락스, 온두 하늘거주지의 그라크모 |
| *Zendikar Rising Art Descriptions* (2020-09-17, 보관본) | 옴나스 'Towering over the watery landscape of Tazeem', Forsaken Monument 'Fallen into the Guul Draz swamp' · 레어: 'A felidar lair'(Felidar Retreat), 폐허의 벽에서 빠져나오는 Skyclave Shade, 하늘거주지들 곁을 나는 Soul Shatter, 탁류를 잠재우는 산꼭대기와 도는 헤드론(Nahiri's Lithoforming), 폐허 안의 물 수수께끼(Confounding Conundrum), 바다(Charix), 파일라스의 쇼케이스 그림 |
| Magic Story *Episode 1–5* (A. T. Greenblatt, 2020-09-02 … 09-30) | 1: 아쿰 하늘거주지의 니사, 2: 바다 관문 탐험 가문의 나히리와 산산조각난 만의 제이스(자기 환영), 3: 무라사 하늘거주지 깊은 방의 Lithoform Core, 4: 아직 서 있던 노래하는 도시('Its stone towers were broken and toppled', 대리석 문)와 아샤야, 5: 노래하는 도시가 먼지가 됨, 발라 게드가 다시 푸르러짐 · 레어: 1 의 아쿰 하늘거주지 룬 방 장면에 실린 Inscription of Insight 캡션과 아쿰 용암 들판의 탁류를 잠재우는 나히리(Inscription 세 장·Nahiri's Lithoforming·Roiling Vortex), 2 의 산산조각난 만 harabaz 숲에서 덤빈 버섯 등 괴물(Swarm Shambler 캡션), 3 의 무라사 하늘거주지 밑에서 지팡이를 타고 뜬 카자, 벼랑·떠다니는 조각·헤드론·깎은 석회암(산산조각난 만 지역 상세), 4 의 노래하는 도시 장면 캡션(Maddening Cacophony) |
| *A Planeswalker's Guide to Zendikar* (2009-09-09, 첫 장) | 하그라 수조가 'a huge complex of ruins that's gradually sinking into the muck and water' — Forsaken Monument 를 그 둘레 늪에 둔 근거 |
| *The Magosi Steps*, *Beneath Riverroot Tree* (Magic Story, 2020) | 다시 물이 찬 내해 할리마르, Guum Wilds 위의 발라 게드 하늘거주지 · 레어: 폭포 밑 웅덩이에서 솟는 베라졸, 계단 굽이에 실린 자레스 산 캡션, 산호투구를 거쳐 바다 관문으로 가는 대상의 길('on to Coralhelm, then to Sea Gate' — Coralhelm Chronicler)과 밧줄 투척꾼의 연글라이더('kitesail' — Thieving Skydiver; 에메리아 원정은 Merfolk Falconer 플레이버와 *Things Have Changed*) |
| *Red Route* (Miguel Lopez, Magic Story, 2020-09-04) | 레어: 'the kor that run the Trenches in Ondu'(Squad Commander), 바다 관문 해방전의 아키리·자레스, 바다 관문의 카자·오라 · 우마라 강 협곡('In Tazeem's deep Umara River Gorge …')을 Magosi Portage 에서 거슬러 오르는 장면에 실린 'Clearwater Pathway \| Art by: Daarken' 캡션(그 장면 문단과 다음 짧은 문단 뒤, 그림 설명 글은 없다) — 이 카드 그림에 닿는 유일한 공식 글. 그림이 그 협곡이라고 쓰지는 않아, 캡션이 실린 자리를 보고 Clearwater Pathway 를 Umara River 에 이은 것은 이 지도의 읽기다 |
| *Hunger* (Magic Story, 2020-09-25) | 니마나의 자유도시 가장자리의 천막과 시장 끝 용병 모험가들의 천막(Base Camp 의 자리), 떨어지며 수도 마킨디를 무너뜨린 온두 하늘거주지(Throne of Makindi) · 레어: 'weaponry and siege tools' 시설이던 온두 하늘거주지(Maul of the Skyclaves·Myriad Construct), 그 어귀를 지키는 그라크모, 땅에 박혀 있다 떠오른 하늘거주지(Ondu Inversion // Ondu Skyruins 를 사가3 에 맨 까닭) |
| *Making Magic: Odds & Ends: Zendikar Rising* (2020-10-05), *Zendikar Rising Art Descriptions* | Pathway 6장의 설계 이유만 있고 장소는 없다 · 이 9장의 대지는 실리지 않았다 — 9장 가운데 카드 그림에 닿는 공식 글은 Clearwater Pathway 의 Red Route 캡션뿐이고(그것도 자리를 밝히지는 않는다), 9장의 자리는 모두 `estimate` |
| 2020년 전 자료 (레어 단계) | *Plane Shift: Zendikar*(2016) — 집정관(p.22), 천사의 후광(p.21), 펠리다르(p.23), 스핑크스의 높은 곶(p.24), 늪 깊은 유적의 악마(p.27), 해골분쇄 거인의 통행세(p.30), 판갑 발로스(p.33), 결손자(null) · 아트북(2016) — luminarch, 하그라 늪, 천사가 지키는 에메리아 · PG(2009–10) — 아쿰의 거울연못·초화산, 고블린 부족(툭툭·그로타그), 무라사의 harabaz 숲·Tumbled Palace, 온두의 아가딤 · *The Journal of Javad Nasrin*(2009)의 아가딤 펠리다르 굴 · *Worldwake Player's Guide*(2010)의 탈 테리그 둘레 그로타그 정착지 — 모두 2020년의 자리를 고르는 단서로만 쓰고 카드의 `basis` 에 함께 적었다 |
| ZNR 카드(한국어판 포함) | 카드 이름·유형·플레이버(Pathway 의 두 면 플레이버 화자 — 산산조각난 만의 크레크, 바다 관문 탐험 가문, 할리마르 원정대 대장 자르 가다, 코르 밧줄 투척꾼 아키리, 연글라이더 전문가 아만디), 양면 카드의 대지 면 이름(곧 장소 이름인 것 — Sea Gate, Reborn·Emeria, Shattered Skyclave·Agadeem, the Undercrypt·Shatterskull, the Hammer Pass·Turntimber, Serpentine Wood·Ondu Skyruins·Kazandu Valley, 장소에 잇는 링크 — Glasspool Shore·Hagra Broodpit·Valakut Stoneforge), 한국어 이름(인쇄된 것만) |

- 공식 한국어판 세트 이름은 '젠디카르 라이징'이다(magic.wizards.com/ko '젠디카르 라이징 제품 개요', 2020-09-02) — 사가3 과 시점 2020 의 이름.
- 노래하는 도시는 2020년 이야기 안에서 서 있다가(Episode 4) 그 끝에 먼지가 된다(Episode 5). 기본 지도는 끝의 먼지 그대로 두고, 사가3·T5 에는 서 있던 폐허로 그린다(사용자 결정 2026-10-24, 하늘이빨 지역 상세의 `phase6` 문).
- 2020년 이전 자료로 2020년의 자리를 고를 때(나히리가 2016년까지 젠디카르에 머물지 않았다(2015년 무렵 잠깐 돌아왔다 떠남) — *Stone and Blood*·*Zendikar Resurgent*, 2016; 악마는 늪 깊은 곳의 유적에 산다 — *Plane Shift: Zendikar*, 2016)는 그 글을 카드의 근거에 함께 적었다.

## 탁류 (Roil, 공식 한국어 '탁류')

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
- 페이즈 카드의 그림을 지도에 붙이지 않는다. 카드의 대상을 지도 화풍의 그림으로 대상 크기에 맞춰 그리고, 카드는 패널에 근거로만 싣는다. 사람만 한 대상은 그 지역의 지역 상세(자식 지도)에 넣는다 — 세계 지도를 깊이 확대하면 나온다.
- 지역 상세(자식 지도, 그 지역을 따로 그린 그림 — 깊이 확대하면 세계 지도 그 자리에 나온다)에 공식 서술이 없는 지형지물을 지어 그리거나, 이름 없는 지형지물에 이름을 붙이지 않는다. 공식 서술이 위치까지 말하지 않는 것(말라키르의 구역 배치 등)을 그릴 때는 그 배치가 이 지도의 해석이라고 해석 안내(`childMaps.ts` 의 `note`, 장소 패널에 보인다)에 적는다.
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
