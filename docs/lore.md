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
- 헤더의 '시점' 단추는 이 무렵들을 다섯 해로 나눠 본다(사용자 결정 2026-10-19·2026-10-20 — CLAUDE.md '시점별 지도', `src/data/timeline.ts`): **2009** 엘드라지가 깨어나기 전(ZEN·WWK), **2010** 깨어남(ROE), **2015** 젠디카르 전투(BFZ), **2016** 타이탄 이후(OGW), **2020** 젠디카르 라이징(ZNR — 바탕은 기본 지도와 같다, 2026-10-27 부터 보인다). 사가 보기가 세트(페이즈)마다 카드를 쌓는 것과 달리, 시점별 지도는 **있는 것은 이어 그린다** — 한 시점에 그린 인물·생물·종·주민·물건·지형지물은 설정상 사라졌다고 볼 까닭(죽음·파괴, 젠디카르를 떠남, 그 자리와 함께 먹히거나 무너짐)이 없으면 뒤의 시점에도, 생겨났다고 볼 까닭(태어남·만들어짐·깨어남, 젠디카르에 옴)이 없으면 앞의 시점에도 그린다(공식 근거가 없으면 패널에 '추정'). 엘드라지와 그 피해는 코질렉의 혈통까지 깨어남(2010)부터(그보다 늦게 그리는 것은 그 카드만의 근거 — 이름·플레이버·이야기 — 가 있을 때만: 엘드라지가 남긴 황무지에서 자랐다고 볼 것은 2015 부터, 2015년 말 코질렉과 함께 솟았거나 2016년 장면에 생겨났다고 볼 것은 2016 부터), 엘드라지와 싸우려 깨어난 원소와 그 전쟁으로 생긴 것은 생겨난 때부터 있다. 장면·주문·전투 순간은 그 무렵에만 그린다. 그래서 아이오나는 깨어남 뒤 경비 자리를 버리고 엘드라지와 싸웠지만 죽거나 떠났다는 서술이 없어 2020 까지 에메리아 곁에, 카줄은 2016 년에도 살아 있고(아트북) 그 뒤 죽었다는 서술이 없어 다섯 시점 모두에 그리고, 사르칸은 젠디카르를 떠난 뒤(2015–2020), 오란리프의 짐승은 숲이 죽은 2016 부터, 발라 게드의 짐승과 식물은 그 땅이 먹힌 2015 부터 그리지 않는다(2020 에는 그 땅이 다시 살아나 — 발라 게드는 2020년 이야기 끝에 다시 피어나고(Episode 5) 오란리프 아래는 다시 정글이다(우마라 하늘폭포 한국어판 플레이버) — 그 종·식물·주민을 다시 그린다. 돌아왔다는 서술은 없어 이 지도의 판단이고, 한 개체·물건(Everflowing Chalice·학습의 벽)과 전쟁의 원소(덤불 투사)는 빼 둔다. Bordermire·Umung 강가의 것도 같은 자리에 다시 그린다 — 아래 '시점 2020'). 시점의 경계에 걸친 인물은 공식 근거를 따른다: 소린은 엘드라지가 풀려난 뒤에야 젠디카르에 왔으므로(아트북, 2016) 2010 에, 제이스는 2015 년에 다시 Eye of Ugin에 갔으므로(Revelation at the Eye) 2015 에도 그린다. 그 무렵 바탕이 자리를 지운 대상(흰 가루·죽은 숲·마른 바닥·폐허)은 근처의 맞는 땅으로 옮기거나 그 위 하늘에 둔다. 2020 은 2016 에 그린 것마다 이어 그릴지 뺄지를 카드마다 정해 데이터에 달았고(`time.at`·`time.gone` — 뺀 까닭에는 그 해를 밝힌다), ZNR 의 있는 것도 생겨났다고 볼 까닭이 없으면 2009–2016 에 거꾸로 이어 그렸다(아래 '시점 2020').
- **ZNR (2020, 약 4561 AR)**: Sea Gate가 재건되었고 Roil이 돌아왔다. 일곱 하늘거주지(Skyclave)가 대륙마다 떠올랐다. 이야기 끝에 Singing City가 사라졌고 Bala Ged는 다시 푸르러졌다.
- **MOM (2023)**: 피렉시아화된 Nahiri가 Emeria 하늘거주지를 축으로 침공했다. 끝에 Emeria 하늘거주지가 땅으로 추락했다.
- Reality Fracture(2026)의 Echoverse는 대체 현실이라 반영하지 않는다.

## 젠디카르 라이징(2020) 자료 — 사가3

사가3(`src/data/phase6.ts`, 지금은 ZNR 미식 레어 20장, 레어 56장, 언커먼 79장, 커먼 101장과 다시 실은 앞 사가 카드 1장 — Anowon, the Ruin Sage, 아래)·ZNR 대지 카드(`src/data/cards.ts`, 주문//대지가 아닌 9장)와 시점 2020(T5)에 쓴 2020년 공식 자료다. 카드마다의 인용과 자리 판단은 그 카드의 `basis`·`estimate` 에 있다.

| 자료 | 이 지도에서 쓴 것 |
| --- | --- |
| *Zendikar: Things Have Changed* (Ari Zirulnik·James Wyatt, 2020-09-01) | 바다 관문 재건('Within a year, the city was restored' — Sea Gate Restoration·Tazri), 일곱 하늘거주지가 다시 떠오름과 그 방어가 깨어남(Ancient Greenwarden·Scourge of the Skyclaves), 굴 드라즈 하늘거주지는 늪에 가라앉았다 떠오름, 아쿰 하늘거주지 조각 가운데 '적어도 하나는 용의 둥지'(Leyline Tyrant), 무라사 하늘거주지는 바다 밑에 끌려 들어가 있었음(Lithoform Engine 의 앞 시점), 바다 관문 탐험 가문의 숨은 후원자 나히리, 살아 있는 마지막 혈족장 드라나, 아이오나가 떠나 지키는 이 없는 에메리아, 떠오른 하늘거주지는 '함정과 보물이 가득'(Nimble Trapfinder·Coveted Prize·Skyclave Relic), 바다 밑에 있는 동안 물에 잠긴 무라사 하늘거주지의 방(Confounding Conundrum), 엘프의 반란으로 무너졌던 발라 게드 하늘거주지(Nimble Trapfinder), 극지의 얼음에 갇혔던 세지리 하늘거주지(Skyclave Relic), 카르간 부족(Kargan Intimidator·Soul Shatter), 2020년 전부터 있던 다섯 탐험 가문(Glasspool Shore·Valakut 카드를 사가에 매지 않은 까닭) · 언커먼: 떠오른 하늘거주지를 뒤지는 원정대와 그 보물(Skyclave Plunder·Spoils of Adventure·Journey to Oblivion·Relic 카드들), 'military bases, government headquarters, and small cities'였던 하늘거주지(Skyclave Cleric // Skyclave Basilica 를 사가3 에 맨 까닭), 마킨디에 맞선 온두 하늘거주지(Jwari Disruption // Jwari Ruins), 'SKYCLAVE CREATURES' 절의 Skyclave Shadowcat 캡션, 살아 있는 마지막 혈족장 드라나와 흡혈귀의 재건(Bloodchief's Thirst·Cleric of Life's Bond·Scion of the Swarm), 용을 부리는 카르간 부족(Kargan Warleader), 'the irrepressible growth of Murasa'(Murasa Rootgrazer·Iridescent Hornbeetle), 엘드라지가 사라진 뒤에도 남은 탁류(Roiling Regrowth), 'the center of the Skyclave expeditions'인 바다 관문(Thundering Rebuke) · 커먼: 다섯 탐험 가문과 그 숙소·안내인('Each maintains hostels' — Cliffhaven Sell-Sword·Dauntless Unity·Expedition Healer·Practiced Tactics·Pyroclastic Hellion), 하늘거주지로 먼저 가려는 가문들의 다툼('the houses' infighting' — Vanquish the Weak), 바다 관문 탐험 가문을 세운 Kesenya(Sea Gate Banneret), 린발라가 곁에 있어 다시 선 바다 관문(Angelheart Protector·Sea Gate Colossus), 옛 수도 마킨디가 있던 Makindi Trenches(Disenchant·Broken Wings), 극지의 얼음에 갇혔던 세지리 하늘거주지(Chilling Trap·Negate·Vanquish the Weak), 물에 잠겼던 무라사 하늘거주지(Skyclave Squid), 늪에 삼켜진 굴 드라즈 하늘거주지와 깨어난 방어(Feed the Swarm·Skyclave Sentinel), 엘드라지가 사라진 뒤에도 이는 탁류(Into the Roil — 이 절 첫머리의 그 카드 그림 캡션 · Living Tempest·Roil Eruption), 살아 있는 마지막 혈족장 드라나(Drana's Silencer·Highborn Vampire·Marauding Blight-Priest), 아쿰의 용을 길들인 카르간 부족(Tormenting Voice), 무라사의 막을 수 없는 성장(Might of Murasa), 함정과 보물이 가득한 하늘거주지(Stonework Packbeast) · 시점 2020: 'the last living bloodchief'(2020년에 칼리타스를 빼는 판단), 'When Iona descended from Emeria to battle the Eldrazi, she left the Sky Ruin unguarded.'(간 곳은 밝히지 않아 아이오나를 잇는다), 바다 밑에 끌려 들어갔다가 엘드라지가 쓰러진 뒤 다시 떠오른 하늘거주지('dragged the Murasa Skyclave into the sea', 'all seven Skyclaves rose back up into the air' — 거꾸로 이어 그리기에서 Lithoform Engine 을 2020년에만 그린 까닭) |
| *The Legends of Zendikar Rising* (Ari Zirulnik, 2020-09-15) | 바다 관문 사령관 타즈리, 엘드라지가 사라진 뒤에도 자라는 옴나스, 아쿰의 야생에 사는 모라우그, 천사들은 높이 날며 위험을 살핌, 드라나 때문에 위험한 굴 드라즈 · 레어: 바다 관문에 내려온 린발라('the only angel without' 후광은 *Things Have Changed*), 바다 관문 재건에 낀 일행 — 엘드라지가 쓰러진 뒤의 아키리('Once the Eldrazi were defeated'), 하늘거주지가 다시 떠오른 뒤의 오라('When the Skyclaves rose again'), 때를 밝히지 않은 카자(자레스·아키리가 원소의 공격에서 구한 뒤), 타짐 폐허와 함께 깊은 곳에서 솟은 카릭스, 무라사 깊은 곳의 작은 정원의 파일라스, 마고시 폭포 뒤 굴의 베라졸, 'the will of the Makindi Trenches' 야샤른, 하늘거주지를 뒤지는 드라나의 오른팔 자그라스, 가장 큰 교단의 타보락스, 온두 하늘거주지의 그라크모 · 언커먼: 높이 날며 살피는 천사들(Emeria Captain), 타보락스의 교단(Demon's Disciple) · 커먼: 높이 나는 천사들(Shepherd of Heroes), 흡혈귀 아닌 이에게 위험한 굴 드라즈(Highborn Vampire·Mind Drain·Drana's Silencer), 하늘거주지 복도를 다니는 자그라스(Expedition Skulker), 온두 하늘거주지 복도의 커다란 지네(Nimana Skitter-Sneak), 야생에 사는 미노타우로스 모라우그(Inordinate Rage), 야샤른이 지키는 마킨디(Broken Wings), 바다 관문 사령관 타즈리(Sea Gate Colossus) · 다시 실은 앞 사가 카드: 하늘거주지가 떠오르자 옛 코르 문명의 비밀을 푸는 데 몸을 바친 아노원('With the rise of the ancient kor Skyclaves, Anowon has dedicated himself with renewed purpose to deciphering the secrets of this lost civilization …') · 시점 2020: 'Unlike other Elementals, Ashaya did not return to Zendikar when the battle was completed.'(엘드라지와 싸우려 깨어난 다른 원소들은 싸움이 끝나 땅으로 돌아갔다고 읽은 것은 이 지도의 판단) · 거꾸로 이어 그리기: 'Yasharn awoke as a direct response to the return of Kozilek.', 하늘거주지가 떠오를 때 깊은 곳에서 솟은 카릭스('breached from the depths'), 'When the Skyclaves rose again'(오라가 바다 관문 재건에 낀 때 — 생겨난 때로 읽지 않는다), 수백 년 동안 떨어진 하늘거주지 그늘에 있던 그라크모('lurked in the shadows of a fallen Skyclave for centuries'), 폭포 뒤 물굴에 사는 베라졸('dwells in a deep, aquatic cave behind the cascade') |
| *Zendikar Rising Art Descriptions* (2020-09-17, 보관본) | 옴나스 'Towering over the watery landscape of Tazeem', Forsaken Monument 'Fallen into the Guul Draz swamp' · 레어: 'A felidar lair'(Felidar Retreat), 폐허의 벽에서 빠져나오는 Skyclave Shade, 하늘거주지들 곁을 나는 Soul Shatter, 탁류를 잠재우는 산꼭대기와 도는 헤드론(Nahiri's Lithoforming), 폐허 안의 물 수수께끼(Confounding Conundrum), 바다(Charix), 파일라스의 쇼케이스 그림 · 언커먼: Canyon Jerboa 의 'Location: The ground of a rocky valley'(고마 파다 화자와 함께 아파의 대상 행렬 앞에 둔 근거) · 커먼: Spitfire Lagac(쇼케이스)의 'Location: A rocky Akoum region' |
| Magic Story *Episode 1–5* (A. T. Greenblatt, 2020-09-02 … 09-30) | 1: 아쿰 하늘거주지의 니사, 2: 바다 관문 탐험 가문의 나히리와 산산조각난 만의 제이스(자기 환영), 3: 무라사 하늘거주지 깊은 방의 Lithoform Core, 4: 아직 서 있던 노래하는 도시('Its stone towers were broken and toppled', 대리석 문)와 아샤야, 5: 노래하는 도시가 먼지가 됨, 발라 게드가 다시 푸르러짐 · 레어: 1 의 아쿰 하늘거주지 룬 방 장면에 실린 Inscription of Insight 캡션과 아쿰 용암 들판의 탁류를 잠재우는 나히리(Inscription 세 장·Nahiri's Lithoforming·Roiling Vortex), 2 의 산산조각난 만 harabaz 숲에서 덤빈 버섯 등 괴물(Swarm Shambler 캡션), 3 의 무라사 하늘거주지 밑에서 지팡이를 타고 뜬 카자, 벼랑·떠다니는 조각·헤드론·깎은 석회암(산산조각난 만 지역 상세), 4 의 노래하는 도시 장면 캡션(Maddening Cacophony) · 언커먼: 1 의 아쿰 하늘거주지에 매달린 거대한 geopede(Skyclave Geopede)와 'impossible precipices of Akoum'의 니사(Roiling Regrowth), 2·3 의 산산조각난 만 벼랑 오르기(Skyclave Pick-Axe), 3 의 무라사 하늘거주지 장면에 실린 Cinderclasm 캡션과 나히리 둘레가 잿빛이 된 장면(Lithoform Blight), 4 의 엘드라지가 망친 숲에 돋는 새 생명(Murasa Sproutling), 5 의 다시 피어나는 발라 게드(Springmantle Cleric·Tangled Florahedron) · 커먼: 1 의 아쿰 벼랑과 용암 들판(Nissa's Zendikon·Scorch Rider·Stonework Packbeast), 펠리다르의 갑옷 같은 돌기(Prowling Felidar), 2 의 다시 세운 등대(Tazeem Raptor·Sea Gate Colossus)와 harabaz 숲 위의 무라사 하늘거주지(Skyclave Squid), 4 의 산산조각난 만에서 Na Plateau 로 가는 길의 고블린(Sneaking Guide), 5 의 노래하는 도시 폐허 위 나히리의 요새와 제이스를 가둔 헤드론 고리(Nahiri's Binding), 다시 푸르러진 발라 게드(Cleansing Wildfire·Reclaim the Wastes) · 시점 2020: 기디온은 이미 죽었다(1 'And suddenly, the grief of his death hit her in a fresh wave.', 5 "She wouldn't be mourning Gideon's death."), 찬드라는 젠디카르에 없다(2 'He had tried to find her before coming here, but with no luck.') · 거꾸로 이어 그리기: 5 의 'blooming again'(2015·2016년의 뒤엉킨 계곡은 흰 가루 평원 — Tangled Florahedron) |
| *A Planeswalker's Guide to Zendikar* (2009-09-09, 첫 장) | 하그라 수조가 'a huge complex of ruins that's gradually sinking into the muck and water' — Forsaken Monument 를 그 둘레 늪에 둔 근거 |
| *The Magosi Steps*, *Beneath Riverroot Tree* (Magic Story, 2020) | 다시 물이 찬 내해 할리마르, Guum Wilds 위의 발라 게드 하늘거주지 · 레어: 폭포 밑 웅덩이에서 솟는 베라졸, 계단 굽이에 실린 자레스 산 캡션, 산호투구를 거쳐 바다 관문으로 가는 대상의 길('on to Coralhelm, then to Sea Gate' — Coralhelm Chronicler)과 밧줄 투척꾼의 연글라이더('kitesail' — Thieving Skydiver; 에메리아 원정은 Merfolk Falconer 플레이버와 *Things Have Changed*) · 언커먼: The Bulwark 의 상승 기류를 탄 연글라이더(Kitesail Cleric), 할리마르로 흘러드는 아래 우마라 협곡(Umara Mystic) · 커먼: 바다 관문 전투 뒤 잠깐 멎었다가 다시 인 탁류와 할리마르·대양의 진동 파도(Into the Roil·Tazeem Roilmage), 연글라이더로 내려앉는 코르(Cliffhaven Kitesail) |
| *Red Route* (Miguel Lopez, Magic Story, 2020-09-04) | 레어: 'the kor that run the Trenches in Ondu'(Squad Commander), 바다 관문 해방전의 아키리·자레스, 바다 관문의 카자·오라 · 우마라 강 협곡('In Tazeem's deep Umara River Gorge …')을 Magosi Portage 에서 거슬러 오르는 장면에 실린 'Clearwater Pathway \| Art by: Daarken' 캡션(그 장면 문단과 다음 짧은 문단 뒤, 그림 설명 글은 없다) — 이 카드 그림에 닿는 유일한 공식 글. 그림이 그 협곡이라고 쓰지는 않아, 캡션이 실린 자리를 보고 Clearwater Pathway 를 Umara River 에 이은 것은 이 지도의 읽기다 · 언커먼: 같은 협곡 장면 사이의 'Umara Skyfalls' 캡션(Umara Wizard // Umara Skyfalls), 낮게 뜬 에메리아 헤드론 조각(Emeria Captain) · 시점 2020: 엘드라지가 이 세계에서 사라짐("they're gone from this world. We won." — 엘드라지 98장을 2020년에 빼는 근거), 'I saw many of them in Ondu—landbound at one, even.'(땅에 박힌 온두 하늘거주지 — 그라크모) |
| *Hunger* (Magic Story, 2020-09-25) | 니마나의 자유도시 가장자리의 천막과 시장 끝 용병 모험가들의 천막(Base Camp 의 자리), 떨어지며 수도 마킨디를 무너뜨린 온두 하늘거주지(Throne of Makindi) · 레어: 'weaponry and siege tools' 시설이던 온두 하늘거주지(Maul of the Skyclaves·Myriad Construct), 그 어귀를 지키는 그라크모, 땅에 박혀 있다 떠오른 하늘거주지(Ondu Inversion // Ondu Skyruins 를 사가3 에 맨 까닭) · 언커먼: 니마나의 자유도시 가장자리에서 꾸려지는 원정대와 용병 천막(Allied Assault·Paired Tactician·Acquisitions Expert·Thundering Sparkmage·Veteran Adventurer·Spoils of Adventure), 마킨디에 맞서 반란한 하늘거주지(Jwari Disruption) · 커먼: 굴 드라즈에서 손꼽히는 원정대(Deadly Alliance·Synchronized Spellcraft·Strength of Solidarity), 니마나 가장자리의 원정대(Nimana Skydancer), Serpent's Maw 의 바람(Living Tempest) · 다시 실은 앞 사가 카드: 니마나의 자유도시 가장자리 시장 끝의 용병 천막가에서 Tarsa 의 일행에 드는 아노원('Just on the edge of the Free City of Nimana, a man in dark gray robes walked through the pitch-black night toward the camps …', 'Anowon stayed back, eavesdropping intently from a nearby alley.') · 거꾸로 이어 그리기: 2020년에야 뜬 온두 하늘거주지('still bearing the jagged red obsidian and pale striations of the earth it had fallen into, was now hovering' — 그 전의 그라크모는 좌르 섬 땅에 박힌 하늘거주지 곁) |
| *Making Magic: Odds & Ends: Zendikar Rising* (2020-10-05), *Zendikar Rising Art Descriptions* | Pathway 6장의 설계 이유만 있고 장소는 없다 · 이 9장의 대지는 실리지 않았다 — 9장 가운데 카드 그림에 닿는 공식 글은 Clearwater Pathway 의 Red Route 캡션뿐이고(그것도 자리를 밝히지는 않는다), 9장의 자리는 모두 `estimate` |
| 2020년 전 자료 (레어 단계) | *Plane Shift: Zendikar*(2016) — 집정관(p.22), 천사의 후광(p.21), 펠리다르(p.23), 스핑크스의 높은 곶(p.24), 늪 깊은 유적의 악마(p.27), 해골분쇄 거인의 통행세(p.30), 판갑 발로스(p.33), 결손자(null) · 아트북(2016) — luminarch, 하그라 늪, 천사가 지키는 에메리아 · PG(2009–10) — 아쿰의 거울연못·초화산, 고블린 부족(툭툭·그로타그), 무라사의 harabaz 숲·Tumbled Palace, 온두의 아가딤 · *The Journal of Javad Nasrin*(2009)의 아가딤 펠리다르 굴 · *Worldwake Player's Guide*(2010)의 탈 테리그 둘레 그로타그 정착지 — 모두 2020년의 자리를 고르는 단서로만 쓰고 카드의 `basis` 에 함께 적었다 |
| 2020년 전 자료 (커먼 단계) | PG(2009–10) — 굴 드라즈의 늪·Hanging Swamp 의 비단뱀·니마나·Pelakka Karst, 세지리의 Midnight Pass·Ikiral·툰드라 학자·펠리다르, 무라사의 Thunder Gap·카잔두의 자디 나무와 엘프 마을·Cliffs of Kazuul, 온두의 Teetering Peaks·Serpent's Maw·실룬디 바다, 아쿰의 거울연못 밑 폐허·고마 파다의 짐승·Affa·마그마 분출, 고블린의 그로타그·툭툭 부족과 길잡이 일 · *Plane Shift: Zendikar*(2016) — 웜·gnarlid·발로스·트롤·펠리다르·scythecat·굴 드라즈의 악어와 gloomhunter 박쥐 · 아트북(2016) — Cliffhaven, 연글라이더, 해일 뒤의 줄라포트, 발라 게드의 Lake of Dust, 변화림의 거인 · *Booster Quest!*(2009) — Outpost of Nirkana·하그라 폐허의 함정·Pelakka Karst 의 웜 · *Worldwake Player's Guide*(2010) — 코르 순례지 Ior Ruin(Kor Celebrant) · *Revelation at the Eye*(2015) — Eye 둘레의 툭툭 부족 · *Reclamation*(2016) — 무라사의 타주루 — 모두 2020년의 자리를 고르는 단서로만 쓰고 카드의 `basis` 에 함께 적었다 |
| 2020년 전 자료 (언커먼 단계) | PG(2009–10) — 온두의 Teetering Peaks('precarious', Fearless Fledgling)·카비라·마킨디의 협곡과 고원·베이인·파둔·실룬디의 바다 소용돌이, 굴 드라즈의 니마나의 자유도시·말라키르의 구역·Pelakka Karst·하그라 수조, 아쿰의 고마 파다 대상(hurda)·거울연못과 Ior·Teeth of Akoum·탈 테리그의 구조물과 함정, 무라사의 Raimunza River·Cliffs of Kazuul·Shatterskull Pass·노래하는 도시, 타짐의 소강마도사·우마라 협곡의 인어 글라이더·Pit Caves, 고블린의 그로타그 부족 · 아트북(2016) — The Sunspring·Calcite Flats·The Bulwark, 연글라이더(kitesail), Wren Grotto, Outpost at North Hada, 조프 맹그로브 늪, 광활림 오란리프와 엘프 씨족, Emeria creed 의 인어 마법사 · Plane Shift: Zendikar(2016) — 그리핀의 크기, 악마, 엘드라지 시대 폐허의 마법 무기와 골렘, 엘드라지 이전 유적(Ior Ruin), Emeria creed 인어가 타는 cloud manta · *Worldwake Player's Guide*(2010) — 거울연못 둘레 봉우리의 코르(Kor Blademaster) — 모두 2020년의 자리를 고르는 단서로만 쓰고 카드의 `basis` 에 함께 적었다 |
| 2020년 전 자료 (시점 2020·거꾸로 이어 그리기) | *Zendikar Resurgent*(Magic Story, 2016-02-24) — 두 타이탄이 죽은 뒤 남은 무리 사냥('hunted down the enthralled vampires and Eldrazi worshipers and what few of the brood had survived' — 엘드라지와 Carrier Thrall·Pawn of Ulamog), 달아난 오브 닉실리스('Ob Nixilis had escaped'), 아직 나타나지 않은 나히리('Ugin's missing allies, Sorin Markov and Nahiri the Lithomancer, still hadn't shown up'), 남아서 지킬 이로 떠올린 키오라('She thought of Tazri, of Munda, of Seble, and of Kiora.') · *Stone and Blood*(2016) — 2010년 이니스트라드에 갇힌 나히리('The three Eldrazi titans had escaped, while Zendikar's protector languished in Sorin Markov's pit.') · *The Silent Cry*(2015-08-26) — Fartree 마을 앞의 아샤야('"Two down, one to go." Nissa said to Ashaya.') · WAR(2019)·THB(2020-01) 카드 — 라브니카에 갇힌 오브 닉실리스('오브 닉실리스의 잔혹함' 한국어판 플레이버 '양측에 대해 아무런 감정도 없이 라브니카에 갇힌 오브 닉실리스는 내키는 대로 고통을 입히며 희열을 느꼈다.'), 라브니카·테로스의 키오라('거대괴물을 유혹하는 자, 키오라'·'키오라가 바다신을 이기다') · ROE Hand of Emrakul 플레이버('I believed in a beautiful god. But this is the true face of the divine.' —Ayli, Kamsa cleric — 영원의 순례자가 엘드라지를 받든 때, Forsaken Monument) — 모두 카드의 `time.basis`·`time.estimate` 에 함께 적었다 |
| ZNR 카드(한국어판 포함) | 카드 이름·유형·플레이버(Pathway 의 두 면 플레이버 화자 — 산산조각난 만의 크레크, 바다 관문 탐험 가문, 할리마르 원정대 대장 자르 가다, 코르 밧줄 투척꾼 아키리, 연글라이더 전문가 아만디), 양면 카드의 대지 면 이름(곧 장소 이름인 것 — Sea Gate, Reborn·Emeria, Shattered Skyclave·Agadeem, the Undercrypt·Shatterskull, the Hammer Pass·Turntimber, Serpentine Wood·Ondu Skyruins·Kazandu Valley, 장소에 잇는 링크 — Glasspool Shore·Hagra Broodpit·Valakut Stoneforge), 한국어 이름(인쇄된 것만) · 언커먼 양면 카드의 대지 면 20개 — 사가3 에 맨 것은 Skyclave Basilica·Jwari Ruins·Song-Mad Ruins, 나머지 17개는 늘 싣는다. 면 이름이 곧 장소 이름·별칭인 것은 Sejiri Glacier·Umara Skyfalls·Bala Ged Sanctuary·Tangled Vale·Akoum Teeth·Kazuul's Cliffs·Song-Mad Ruins, 나머지 13개는 장소에 잇는 링크 |

- 공식 한국어판 세트 이름은 '젠디카르 라이징'이다(magic.wizards.com/ko '젠디카르 라이징 제품 개요', 2020-09-02) — 사가3 과 시점 2020 의 이름.
- 노래하는 도시는 2020년 이야기 안에서 서 있다가(Episode 4) 그 끝에 먼지가 된다(Episode 5). 기본 지도는 끝의 먼지 그대로 두고, 사가3·T5 에는 서 있던 폐허로 그린다(사용자 결정 2026-10-24, 하늘이빨 지역 상세의 `phase6` 문).
- 2020년 이전 자료로 2020년의 자리를 고를 때(나히리가 2016년까지 젠디카르에 머물지 않았다(2015년 무렵 잠깐 돌아왔다 떠남) — *Stone and Blood*·*Zendikar Resurgent*, 2016; 악마는 늪 깊은 곳의 유적에 산다 — *Plane Shift: Zendikar*, 2016)는 그 글을 카드의 근거에 함께 적었다.
- 앞 사가 카드를 다시 싣는 것은 공식 자료가 2020년의 자리를 밝힌 것뿐이다(CLAUDE.md '사가를 넘어가면 카드 그림을 비우고 새로 시작한다'). 지금은 Anowon, the Ruin Sage(WWK 카드 그대로, 한국어판 카드가 없다 — '아노원'은 BFZ Transgress the Mind 한국어판 화자 표시 '폐허의 현자 아노원'의 표기) 한 장이다. *Hunger*(2020)가 그를 니마나의 자유도시 가장자리 시장 끝의 용병 천막가에 두고, *The Legends of Zendikar Rising*(2020)은 하늘거주지가 떠오른 뒤의 그를 쓴다 — 니마나 지역 상세의 도시 동쪽 끝, 지붕 없는 집들과 용병 천막 사이(도시 안의 자리는 이 지도의 판단)에 그린다. 시점별 지도에서는 이름이 같은 두 카드가 한 시점에 하나라 2009–2016년은 WWK 카드(아쿰의 League of Anowon 둘레), 2020년은 이 카드가 맡는다. 2020년에도 살아 있는 아일리·조리 엔은 2020년의 자리를 밝힌 글이 없어 다시 싣지 않고, 시점별 지도에서만 이어 그린다.

## 시점 2020 (T5) — 이어 그리기와 거꾸로 이어 그리기

시점 2020 의 바탕은 기본 지도다(2016년에 바탕 때문에 비켰던 대상은 사가 보기 자리로 돌아간다). 2016년에 그린 카드 가운데 같은 개체·같은 이름의 ZNR 카드가 맡지 않는 533장을 카드마다 정했다 — 418장을 잇고 115장을 뺐으며, 그 뒤 아노원은 사가3 에 다시 실은 카드가 2020년을 맡아 이어 그린 것은 417장이다(2020년 카드 674 = ZNR 256 + 아노원 1 + 이어 그린 417 — 그 뒤 다시 그린 20장을 더해 694, 아래 '다시 그린 것'). 카드마다의 인용은 그 카드의 `time.basis`(공식 근거)·`time.estimate`(이 지도의 판단)에 있다.

- **뺀 것**
  - 엘드라지 98장: 2016년 두 타이탄이 죽은 뒤 젠디카르 사람들이 남은 무리까지 사냥했고(*Zendikar Resurgent*, 2016), 2020년 글은 엘드라지가 이 세계에서 사라졌다고 쓴다(*Red Route*, 2020 — "they're gone from this world. We won.").
  - 엘드라지와 싸우려 깨어난 땅의 원소 9장: *The Legends of Zendikar Rising*(2020)의 'Unlike other Elementals, Ashaya did not return to Zendikar when the battle was completed.'를 다른 원소들은 싸움이 끝나 땅으로 돌아갔다는 뜻으로 읽었다(판단). 늘 있던 원소와 솟은 땅 Wall of Resurgence 는 잇는다.
  - 인물 5장: 기디온은 2020년 이야기에서 이미 죽은 사람이다(Episode 1·5, 2020 — 그는 2019년에 죽었다). 찬드라는 2020년 젠디카르에 없다(Episode 2 — 제이스가 오기 전에 찾았지만 찾지 못했다). 오브 닉실리스(2019년 라브니카에 갇힘)·키오라(2019년 라브니카, 2020년 1월 테로스)는 젠디카르로 돌아왔다는 글이 없어 뺐고, 칼리타스는 드라나가 'the last living bloodchief'(*Zendikar: Things Have Changed*, 2020)이고 고귀한 흡혈귀 한국어판 플레이버가 '자유로운 자들과 노예가 된 자들 간의 전투에서 혈족장들이 절멸하자, 말라키르 주변의 늪은 두각을 드러내고자 하는 젊고 위험한 흡혈귀들로 득실거렸다.'라 해서 뺐다 — 셋 다 이 지도의 판단이다(칼리타스의 죽음을 밝힌 글은 없다).
  - 엘드라지에 홀린 흡혈귀 2장(Carrier Thrall·Pawn of Ulamog — 'hunted down the enthralled vampires', 판단), 그림에 엘드라지가 든 Spawnbinder Mage.
- **이은 것**: 죽었거나 떠났다는 서술이 없는 인물은 잇는다. 아이오나는 엘드라지와 싸우러 에메리아를 비웠지만(*Zendikar: Things Have Changed*; 에메리아의 부름 한국어판 플레이버 '"이곳을 지키는 것은 더이상 아이오나가 아니다. 우리다." —에메리아 목동, 카슬라') 간 곳도 죽음도 밝히지 않아 에메리아 곁에 그대로 둔다. 아노원은 이어 그리지 않고, 사가3 에 다시 실은 카드가 니마나의 자유도시에서 2020년을 맡는다(위). 2020년 줄라포트의 모습은 공식 서술이 없어, 기본 지도의 해안 마을에 줄라포트 대상들을 세웠다(판단 — 사가 보기가 2016년 해일 뒤로 그리지 않는 Zulaport Cutthroat 도 잇는다). 2020년 카드·이어 그린 카드·손그림과 겹치거나 이름을 가린 118장은 크기 그대로 비켰다.
- **다시 그린 것**(사용자 결정 2026-10-28): 2016년에 그리지 않아 위의 결정에 들지 않았던 대상 가운데, 그 무렵 바탕 때문에만 빠졌고 그 땅이 2020년에 다시 살아난 것을 다시 본다. 발라 게드는 2015년에 먹혔지만 2020년 카드 무렵에 다시 자라고(뒤엉킨 식물헤드론(ZNR) 한국어판 플레이버 '"발라 게드가 다시 성장하면서, 새로운 모습의 생명이 구속받지 않은 경이로움과 함께 피어나고 있지." —발라 게드 안내인, 도랄'; 이야기 끝인 *Episode 5: The Two Guardians*(2020)도 'Bala Ged was blooming again, growing, the forest coming back at speeds that only magic could accomplish.'라고 쓴다), 2016년에 죽은 오란리프 아래는 2020년에 다시 정글이다(우마라 하늘폭포 한국어판 플레이버 '"우마라 강의 근원은 오란리프 상공에서 그 아래에 있는 정글에 끊임없이 물길을 쏟아내고 있어." —탐험 마법사, 코 다리'). 그 짐승·식물이 돌아왔다는 서술은 없지만 그 종이 끊겼다는 서술도 없어, 종·식물·주민 20장을 2020년에 다시 그린다(판단 — 2020년 카드 694).
  - 다시 그린 것: 발라 게드 12장(Mold Shambler·Gnarlid Pack·Snapping Creeper·Terastodon·토템길잡이 영양·Bala Ged Scorpion·Aura Gnarlid·Bramblesnap·포자모자 거미 — Bramblesnap 은 싸우려 깨어난 원소가 아니라 식물을 접붙여 만드는 정령 — 그리고 같은 자리에 다시 그린 Haze Frog·Nema Siltlurker·Mortician Beetle: 그 자리의 늪(Bordermire)·물길(2009년 Umung 강)·버려진 전초기지는 돌아왔다는 서술이 없어 기본 지도에 그 기호를 깔지 않지만, 흰 가루로 남았다는 서술도 없어 그 자리를 잃은 것으로 보지 않았다 — 기본 지도에서 그 자리는 발라 게드 숲과 그 가장자리다), 오란리프 8장(Grazing Gladehart·Oran-Rief Recluse·Timbermaw Larva·광활림의 대식가·오란리프 히드라·부패한 어기적괴물·거대한 사마귀·달려드는 날리드). 판단으로 이어 온 카드라 2020년 카드·이어 그린 카드와 겹치거나 기존 이름을 지우면 크기 그대로 비켰다(9장) — 붐비는 오란리프 숲 어디에 두어도 개관에서 이름 하나를 지우는 큰 광활림의 대식가는 할리마르 지역 상세의 남서쪽 끝(오란리프 숲 북서쪽 끝)에 지역 상세 대상으로 그린다.
  - 빼 둔 것: 흰 가루가 된 숲 바닥과 함께 사라졌다고 본 물건 Everflowing Chalice, 2016년에 무너진 등대에 붙은 학습의 벽(Mnemonic Wall — 바다 관문은 2020년에 다시 세워졌지만 그 벽을 다시 쌓았다는 서술이 없다), 전쟁의 원소 덤불 투사(위 원소 9장과 같은 까닭). 죽었거나 떠났거나 불려 나온 동안만 있던 것(Lorthos·Mordant Dragon·Tuktuk·Sarkhan·Sorin, 환영·화신 셋, 무너진 헤드론 고리)과 엘드라지 7장은 그 앞의 까닭 그대로다.
- **거꾸로 이어 그리기**(2026-10-28): ZNR 256장 가운데 주문·부여마법 88장은 장면이라 2020년에만 그린다. 나머지 168장 가운데 145장은 2009–2016년 모두에, 3장은 일부에 그리고, 20장은 2020년에만 그린다(2009·2010·2015·2016년 카드 720·809·789·761장).
  - 2020년에만: 같은 개체·같은 이름의 재판 7장(앞 사가의 카드가 그 앞 시점을 맡는다). 하늘거주지가 깨어날 때 함께 깨어난 방어 — 고대의 녹음수호자 한국어판 플레이버 '폐허들이 깨어났을 때, 그것들의 방어 또한 깨어났다.'(영어판 'When the ruins awakened, so did their defenses.')를 따라 Ancient Greenwarden·Skyclave Apparition·Skyclave Shade·Skyclave Sentinel·Myriad Construct — 와 가라앉은 하늘거주지 깊은 방에 붙박인 설비로 본 Lithoform Engine(판단). 2020년의 원정·재건과 함께 만들었다고 본 Skyclave Pick-Axe·Sea Gate Colossus(판단). 그 무렵 생겨났다고 본 Fearless Fledgling(첫 비행을 하는 새끼)·Highborn Vampire(혈족장들이 절멸한 뒤)·Tangled Florahedron(발라 게드가 다시 자라며 핀 새 생명 — 뒤엉킨 식물헤드론 한국어판 플레이버 '"발라 게드가 다시 성장하면서, 새로운 모습의 생명이 구속받지 않은 경이로움과 함께 피어나고 있지." —발라 게드 안내인, 도랄')(판단). 하늘거주지가 떠오를 때 깊은 곳에서 솟은 카릭스(공식). 그 무렵 젠디카르에 없던 나히리 — 2010년 이니스트라드에 갇혔고(*Stone and Blood*) 2016년에도 나타나지 않았으며(*Zendikar Resurgent*), 2015년 무렵 잠깐 돌아왔다가 곧 떠나 2015년도 뺐다(판단).
  - 일부만: 야샤른은 코질렉이 돌아온 데 맞서 깨어나('Yasharn awoke as a direct response to the return of Kozilek.') 이 지도가 코질렉과 함께 솟은 것을 그리는 2016년부터(판단). 아샤야는 니사가 엘드라지와 싸우려 불러낸 정령이라 2015년부터 — 2015년은 *The Silent Cry* 대로 오란리프의 Fartree 마을 앞이다. 버림받은 기념물은 엘드라지 석상(*Zendikar Rising Art Descriptions* — 'Only a portion of the Eldrazi statue remains')이고 한국어판 플레이버 '"우리는 영원히 떠돌 것이다." —영원의 순례자 고위 사제 아일리'의 영원의 순례자가 엘드라지를 받든 것은 깨어남 뒤라 2010년부터(판단).
  - 생겨난 때가 아닌 것: 2020년에 세운 바다 관문 탐험 가문에 든 것(Sea Gate Banneret)이나 하늘거주지가 다시 떠오른 뒤에야 바다 관문 재건에 낀 오라('When the Skyclaves rose again')는 그 앞에 없었다는 뜻이 아니라, 그 앞의 자리를 밝히지 않은 대상으로 같은 자리에 잇는다.
  - 하늘거주지에 산 대상(Skyclave Cleric·Squid·Shadowcat·Geopede·Relic, Maul of the Skyclaves, 자그라스, 카자, Nimble Trapfinder, 그라크모)은 생겨난 까닭이 없어 잇되, 그 무렵 하늘거주지는 얼음·늪·바다 밑·땅에 박힌 폐허라 폐허 표시 곁이나 근처의 맞는 땅·물, 또는 그 위 하늘에 둔다.
  - 땅·물에 매인 쪽이 자리를 지킨다(판단): 좌르 섬에서는 땅에 박힌 하늘거주지 곁의 그라크모가 섬 북쪽 기슭을 지키고 섬 위 하늘의 ZEN Sphinx of Jwar Isle·OGW Jwar Isle Avenger 가 북쪽 하늘로 비킨다. 2010년 마고시 폭포에서도 폭포 뒤 물굴과 폭포 밑 물에 매인 베라졸이 폭포 밑을 지키고 그해 카드인 ROE 마고시의 스핑크스가 폭포 남서쪽 하늘로 비킨다 — 둘 다 세트 시점 카드가 앞서는 자리 다툼 차례에 일부러 둔 예외다(자리가 정확한 대상끼리 한 장소를 나눌 때, 하늘의 쪽은 그 장소 위 하늘 어디든 그 장소다).

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
