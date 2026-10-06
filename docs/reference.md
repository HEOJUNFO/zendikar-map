# 레퍼런스 정리

## asset/ 이미지 인덱스

팬이 손으로 그린 "Planar Map of Zendikar" (흑백 잉크 + 숲 영역 청록 채색). 원본은 수정하지 않는다.

| 파일 | 내용 |
| --- | --- |
| `planar-map-of-zendikar-v0-kx4omcy09xlb1.webp` | **전체도** — 모든 대륙 배치 기준 |
| `planar-map-of-zendikar-v0-0yxp1i219xlb1.webp` | 북서부 확대 — Ondu, Jwar / Beyeen / Agadeem 군도, Sejiri 남단 |
| `planar-map-of-zendikar-v0-96g2u3619xlb1.webp` | 북동부 확대 — Akoum, Sejiri 해안 |
| `planar-map-of-zendikar-v0-czuwb9c19xlb1.webp` | 남동부 확대 — Guul Draz, Bala Ged, Kazandu(Murasa 동부) |
| `planar-map-of-zendikar-v0-egk3rh919xlb1.webp` | 남서부 확대 — Tazeem, Murasa, Turntimber Forest(Ondu 남부) |

모두 약 1080×763px webp.

## 전체 배치 (전체도 기준)

```
            ~~~~~~~~~~~~ SEJIRI (최북단, 빙원 해안) ~~~~~~~~~~~~
   ONDU            Jwar·Beyeen·Agadeem          AKOUM
 (북서)               (중앙 북부 군도)             (북동)

                       ZENDIKAR

 TAZEEM            MURASA              GUUL DRAZ + BALA GED
 (남서)             (남중앙)                   (남동)
```

## 대륙별 지명 (에셋 지도에서 판독)

판독이 애매한 것은 `?` 표시.

### Sejiri
Ikiral, Midnight Pass, Soutoulix?

### Ondu
- 지역: Makindi Trenches, Turntimber Forest
- 지점: Cliffhavens (여러 곳), Prison of Emmadi?, Nomads of Silundi Sea, Graypelt, Mosscrack

### 중앙 군도
- Jwar
- Beyeen: Valakut, Zulaport
- Agadeem: Crypt of Agadeem, Kabira, Hedron Fields

### Akoum
- 지역: Spike Fields, Teeth of Akoum, Kargan Lands, Ora Ondar
- 지점: Goma Fada, Grip Haven, Tal Terig, Eye of Ugin, Ancient League?, Affa, Ghostwatch, Stalls Haven?, Khalni Heart, Glasspool, Ior Ruin

### Guul Draz
- 지역: Pelakka Karst, Hanging Swamp, Hagra Swamp, Zof Marsh, Lake Jest?
- 지점: Helix of Zof, Hagra Cistern, Malakir, Free City of Nimana, Lulea?

### Bala Ged
- 지역: Guum Wilds, Tangled Vales, Umung River, Bojuka Bog

### Tazeem
- 지역: The Bulwark, Oran-Rief, Halimar, Calcite Flats
- 지점: Sunspring, Coralhelm, Ula Temple, Sea Gate, Hada, Enclave?, Umara River, Moaqsi?, Tikal Harborage?

### Murasa
- 지역: Skyfang Mountains, Na Plateau, Sunder Bay, Kazandu, Pillar Plains
- 지점: Hazuul Pass?, Kabira Mines?, Tumbled Palace, Shatterskull Pass, Raimuna Falls?, Living Spire, Raimuna River?, Visimal?, Singing City, Vazi River, Thunder Gap

## MTG 공식 설정 요약

- 젠디카르는 마나가 매우 풍부하고 지형 자체가 살아 움직이는 차원. 거대한 지각 변동인 **Roil(로일)** 이 수시로 지형을 뒤바꾼다.
- 공중에 떠 있는 **헤드론(Hedron)** 들은 고대에 엘드라지를 봉인하기 위해 Nahiri·Sorin·Ugin이 설치한 것.
- 대표 블록: *Zendikar*(2009), *Rise of the Eldrazi*(2010), *Battle for Zendikar* / *Oath of the Gatewatch*(2015–16), *Zendikar Rising*(2020).
- 엘드라지 세 타이탄(Ulamog, Kozilek, Emrakul)의 봉인 장소: **Eye of Ugin**(Akoum).
- 주요 세력: Kor(유목민, 로프·갈고리), Merfolk(Emeria/Ula/Cosi 신앙), Elf(Tajuru, Joraga, Mul Daya), Vampire(Malakir 중심), Goblin, Human 탐험가 집단.
- 공식 대륙 7개: Akoum, Bala Ged, Guul Draz, Murasa, Ondu, Sejiri, Tazeem.

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
