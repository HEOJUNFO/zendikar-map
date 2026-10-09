# Zendikar Map

MTG 차원 **젠디카르(Zendikar)** 의 설정을 바탕으로 웹 지도를 만드는 프로젝트.

## 참고 자료
- `asset/` — 팬 제작 손그림 젠디카르 지도(원본, 수정 금지). 파일별 내용은 `docs/reference.md`.
- `references/` — 지형 생성 참고 repo (Azgaar FMG, mewo2/terrain). git 제외, `pnpm refs`로 받음. **읽기 전용 참고 코드이며 우리 코드에서 import 하지 않는다.**
- `docs/reference.md` — 에셋 인덱스, 팬 지도 라벨 판독과 설정 대조 결과, 지형 데이터 추출 방법.
- `docs/lore.md` — 공식 설정 조사 정리(대륙·시대·헤드론·지도 표현 원칙)와 출처.
- `docs/landscape.md` — 바탕 지형(강·화산·폭포·절벽·숲·늪 등)마다 공식 근거와 이 지도의 추정.

## 설정 원칙 (위반 금지)
- 지명·소속 대륙·설명은 공식 자료(카드, magic.wizards.com 기사, Plane Shift 등)로 확인된 것만 싣는다. 팬 지도의 지명은 공식 설정과 맞을 때만 쓴다.
- 위치는 근거가 있을 때만 찍는다: `fan-map`(팬 지도 자리가 설정과 모순되지 않음) · `canon-hint`(공식 위치 서술, `placementBasis`에 근거) · 그 밖에는 `unplaced`(지도에 찍지 않고 대륙 설명에만). 공식 자료가 대륙(과 지형·이웃 같은 단서)까지만 밝힌 곳은 사용자 요청으로 모두 `estimate` 로 찍는다 — 단서에 맞춰 이 지도가 자리를 고르고, 고른 까닭을 `estimate` 에 적어 패널에 '추정'으로 보인다(마커 모양은 다른 장소와 같다). `unplaced` 는 이어진 대지 카드 표시가 그 장소의 표시가 되는 곳에만 남는다.
- 한국어 지명(`nameKo`)은 공식 한국어판 카드에 인쇄된 표기만. ZEN/WWK/ROE(2009–10)는 한국어판이 없다.
- 지도는 Zendikar Rising(2020) 이후의 모습을 기준으로 하고, 이전 시대 상태는 `history`에 적는다.
- 바탕 지형(강·화산·폭포·절벽·협곡·숲·늪·수정·용암·툰드라·바다 얼음)도 공식 자료가 있다고 한 것만 그린다. 물길·자리·범위를 공식 자료가 밝히지 않으면 사용자 요청으로 이 지도가 골라 그리고 `estimate` 에 까닭을 적는다(`src/data/landscape/<대륙>.ts`, 장소·대륙 패널에 '추정'). 모양은 근거 있는 지형과 같다.
- ZEN·WWK·ROE 대지 카드(기본대지가 아닌 것)는 사용자 요청으로 모두 지도에 나온다(`cards.ts` 의 `at`). 공식 근거(카드 이름이 곧 지명, 또는 공식 자료가 그 장소의 그림이라고 밝힘)가 장소와 자리까지 닿지 않는 카드는 이 지도의 판단으로 잇거나 자리를 고르되, `estimate` 에 그 판단을 적어 패널에 '추정'으로 보인다. 그림을 보고 짐작해 잇지 않는다.
- 페이즈1(헤더의 '페이즈1' 단추, `?phase=1`)은 ZEN 미식 레어 15장, 레어 43장, 언커먼 55장, 커먼 96장(대지 카드는 대지 카드로 이미 지도에 있어 뺀다)을 지도에 올린다. 카드는 설정 근거일 뿐이라 카드 그림을 지도에 붙이지 않고, 그 대상(바다 괴물·천사·짐승·인물…)을 지도 화풍의 그림으로 대상 크기에 맞춰 그린다. 자리는 대지 카드와 같은 규칙(`basis`·`estimate`). 사람만 한 대상, 또는 자리가 붐벼 세계 지도에 두면 장소 이름을 가리는 대상은 그 지역의 지역 상세(자식 지도)에 넣는다(대상이 여럿 모이는 곳은 새 지역 상세를 그린다) — 세계 지도를 깊이 확대해 그 지역 상세가 나오는 배율부터 그려진다. 그런 대상의 `at`·`size`·`flip` 은 지역 상세 그림의 `subjects` 를 세계 지도 단위로 옮긴 값이다(그린 크기가 원본, `to_ts.mjs` 가 어긋나면 멈춘다). 지역 상세가 없는 곳에 홀로 떨어진 작은 대상은 세계 지도에 작게 그려 확대하면 보이게 둔다.
- 페이즈2(헤더의 '페이즈2' 단추, `?phase=2`)는 페이즈1 지도를 그대로 가져와 WWK 카드를 더한다(사용자 요청 2026-10-09) — 지금은 WWK 미식 레어 9장, 레어 30장, 언커먼 38장, 커먼 54장(대지 카드 — 미식 레어 Eye of Ugin, 레어 대지 5장, 언커먼 대지 2장, 커먼 대지 6장 — 은 뺀다). 페이즈 n 은 1..n 의 카드를 모두 그린다(`src/data/phase.ts` 의 `phaseOf`). WWK 카드는 `src/data/phase2.ts` 에 페이즈1과 같은 모양·규칙(자리·크기·지역 상세·그림)으로 싣고, 그 카드 무렵(2010년 초, 엘드라지가 깨어나기 직전)의 자리에 그린다. 장소 패널의 페이즈 줄은 카드가 오른 페이즈마다 한 줄이다. 페이즈 카드도 '한 곳은 한 번만' 규칙을 따른다 — 이름이 이어진 장소의 이름과 같은 카드(Seer's Sundial)는 `place: true` 로 그림 없이 그 장소 패널에 실리고(`#card/카드id` 도 그 장소로), `phase.ts` 와 `scripts/figures/to_ts.mjs` 가 어긋나면 멈춘다. 이미 있는 지역 상세에 대상을 더할 때는 빈터(`clearings`, `phase2: true`)와, 자리를 비켜야 하는 손그림 부분의 `phase2: false` 로 페이즈1의 모습을 그대로 둔다.
- 지역 상세(자식 지도)는 그 지역을 큰 축척으로 따로 그린 그림이다(세계 지도를 키운 것이 아니다). 따로 여는 화면 대신 세계 지도의 깊은 확대 단계에 합쳤다(사용자 결정 2026-10-08, `docs/deep-zoom-plan.md`): 그림 1 단위가 화면 0.6px 이상이 되는 tier(`DEEP_TIER` 이상)부터 그 자리에 나오고, 페이즈와 상관없이 보인다(그 안의 작은 대상만 그 카드의 페이즈를 켰을 때 — 나중 페이즈의 대상 자리는 빈터 `clearings` 가 그 페이즈에서만 지형 기호를 비운다). 지도 위에 틀·격자·사각형 경계를 두지 않는다 — 지형 기호는 그 그림의 지형 다각형으로 주변과 같은 크기로 다시 뿌리고 가장자리 띠는 자리마다 섞어 맡으며, 그림이 다시 그린 강·절벽·한 점 기호·헤드론·지역 이름은 그 범위에서 세계 지도 것을 숨기고, 한 이름은 한 번만 나온다. 세계 지도에 그리는 페이즈 그림(큰 대상)은 지역 상세가 나와도 그대로 그려지므로, 지역 상세는 그 그림을 다시 그리지 않고 그 그림과 이름표 자리를 비켜 그린다. 그 장소 이름 뒤에 패널 단추와 같은 접힌 지도 아이콘(`glyphs.ts` 의 `CHILD_MAP_ICON`, 범례 '확대하면 지역 상세가 있는 곳')을 붙인다(사용자 요청) — 이름이 자리를 받은 배율에서 아이콘까지 들어갈 자리가 있을 때만, 누르면 이름을 누른 것과 같다. 그 장소(`place`)를 누르면 여느 장소처럼 패널이 열리고, 패널 맨 위의 '가까이 보기'(한 단계 더)가 그 지역 상세가 보이는 배율로 간다(사용자 요청: 격자로 표시하지 말고 그 지역을 눌러 한 단계 두고 열기). 해석 안내(`childMaps.ts` 의 `note`)는 그 단추 밑에 보인다. 해안·호수·숲과 장소·카드 표시의 자리는 세계 지도에서 그대로 가져오고, 지역의 지형지물은 공식 서술이 있는 것만 그린다. 이름은 공식 이름만 단다. 하나로 이어진 지도라 범위 밖을 가리키는 표시(화살표·이웃 장소 이름)는 그리지 않는다.
- 설정상 대상이 한 곳에 몰릴 때는 이 차례로 푼다 (사용자 결정 2026-10-08).
  1. 공식 근거가 대륙·지역까지만 닿는 대상(`estimate`)은 한 점에 모으지 말고, 근거가 허락하는 범위(그 지역 전체, 지형·이웃 단서가 맞는 빈 땅) 안에서 흩어 자리를 고른다. 고른 까닭은 여느 추정처럼 `estimate` 에 적는다. 근거가 정확한 자리(장소·지형지물)를 밝힌 대상은 옮기지 않는다.
  2. 그래도 한 지역 상세가 붐비면(그림·이름이 서로 가리거나, 지역 하나에 대상이 15장 남짓을 넘으면) 그 안의 붐비는 구역을 더 큰 축척으로 따로 그린 '더 깊은 지역 상세'로 나눈다. 부모 지역 상세 안에 놓이고 더 깊은 배율에서 나오며, 부모 그림은 그 범위에서 물러난다(경계는 지금처럼 띠에서 섞고 틀을 두지 않는다). 렌더러는 아직 지역 상세끼리 겹치는 것을 지원하지 않으므로(`childDetail.ts`·`ZendikarMap.tsx`), 처음 필요해질 때 부모·자식 관계(범위 안의 부모 그림·지형 물러남, 더 깊은 tier)를 먼저 넣는다.
  - 지도 위에 확대창·상자를 띄우는 방식은 쓰지 않는다 (틀 금지).
- 한 곳은 한 번만 나온다. 카드 이름이 이어진 장소의 이름이나 별칭(`aliases`)과 같으면(Eye of Ugin, Khalni Garden = Ora Ondar 등) 그 카드는 곧 그 장소다 — 지도 표시·검색 결과·대륙 목록에 장소로 한 번만 나오고, 카드 그림과 정보는 장소 패널에 실린다(`#card/카드id` 도 장소 패널로 연다). 장소가 지도에 있으면 장소 표시를 같이 써서 `at` 를 두지 않고, 자리가 없는 장소면 카드 표시가 그 장소의 표시가 된다(자리는 `estimate`).

## 스택
- Vite + React 19 + TypeScript, 패키지 매니저 **pnpm**
- 지도: SVG + d3-zoom. 폰트는 @fontsource (IM Fell English, Gowun Batang)
- 린트: oxlint (`pnpm lint`)

## Claude Code 플러그인 (project scope, `.claude/settings.json`)
- `example-skills@anthropic-agent-skills` — `algorithmic-art`(양피지 질감·해안선·해칭 패턴 실험), `frontend-design`, `canvas-design` 등
- `impeccable@impeccable` — `/impeccable polish|audit|critique …` 디자인 점검. Edit/Write·Stop 시 UI 검사 훅이 자동 실행됨
- `ui-ux-pro-max@ui-ux-pro-max-skill` — 스타일·팔레트·폰트 조합 검색

## 명령어
- `pnpm dev` — 개발 서버
- `pnpm build` — 타입체크 + 빌드
- `pnpm lint`
- `python3 scripts/geo/extract_geo.py` — 팬 지도에서 해안선·숲·내해를 다시 추출하고 대륙 배치(`LAYOUT`)를 적용 (opencv-python, numpy 필요). 팬 지도 좌표를 새 좌표로 옮길 때는 같은 폴더의 `relocate.py`
- `node scripts/figures/to_ts.mjs > src/map/figures.ts` — 페이즈 그림 원본(`scripts/figures/art/<카드id>.js`)에서 다시 만들기 (그림은 묶음마다 `src/map/figures/<world|지역 상세 id>.ts` 에 함께 쓴다). 원본은 작업대 `scripts/figures/index.html?ids=…`(지도 배율별 미리보기)에서 보며 고치고, 화풍은 `scripts/figures/STYLE.md`
- `node scripts/childmaps/to_ts.mjs` — 지역 상세 원본(`scripts/childmaps/art/<id>.js`, 공통 그리기 도구 `kit.js`)에서 `src/map/childmaps/<id>.ts` 와 그림 크기 목록 `src/map/childMapSizes.ts` 를 다시 만들기. 원본은 `pnpm dev` 뒤 `?phase=1&childsrc=1`(원본을 바로 읽는다)에 그 장소 패널의 '가까이 보기'(또는 `&view=x,y,k`)로 가 보며 고치고, 그 범위의 세계 지도 맥락(해안·장소·헤드론을 그림 좌표로)은 `node scripts/childmaps/context.mjs <id>`, 화풍은 `scripts/childmaps/STYLE.md`
- `node scripts/qa/shots.mjs <폴더> 이름='?view=x,y,k' …` — 스크린샷 (`--w --h --mobile --wait`) · `node scripts/perf/measure.mjs` — 배율별 화면 안 요소 수와 끌기·휠 확대 중 프레임 간격 (둘 다 `pnpm dev` 뒤). 첫 로딩(느린 망의 FCP·긴 작업·바이트)은 `node scripts/perf/load.mjs [--mobile]`, 어느 함수가 시간을 쓰는지는 `node scripts/perf/profile.mjs [--view x,y,k] [--incl=함수,…]` (둘 다 `pnpm build && pnpm preview` 뒤 — `--minify false` 빌드면 함수 이름이 읽힌다)
- 측정·스크린샷용 headless Chrome 은 **반드시 `scripts/qa/chrome.mjs` 의 `launchChrome()`** 으로 띄우고 끝나면 `await chrome.close()`. Chrome 을 직접 spawn 하지 않는다 — 예전 스크립트가 오류·타임아웃 때 Chrome 을 못 닫아 수십 개(15GB)가 쌓인 적이 있다. `launchChrome()` 은 파이프로 node 와 이어 node 가 죽으면 Chrome 도 꺼진다. 남은 것은 `pnpm chrome:reap`(`scripts/qa/reap-chrome.sh`, 훅이 세션 시작·턴 끝마다 자동 실행)이 부모 잃은 headless Chrome 과 10분 넘게 안 쓴 프로필 폴더를 치운다
- `pnpm refs` — 참고 repo 받기/갱신 · `pnpm refs:fmg` — FMG 로컬 실행 (:5180)

## 구조
- 확대: 배율 1 이 세계 전체를 화면에 맞춘 상태, 최대 256배(`useMapZoom.ts`). 라벨 배치는 화면 px/단위의 tier 별(4 단계 2.6 위로는 배율이 두 배가 될 때마다 한 tier). `DEEP_TIER`(5)부터 해안을 한 번 더 다듬어 그리고, 지형 기호를 지도 칸마다 반 크기·반 간격으로 다시 뿌리며(`fineTerrain.ts`, 보이는 곳만), 지역 상세가 나온다. 보이는 영역에서 그 폭의 절반 넘게 떨어진 마커·그림·라벨·지역 상세는 그리지 않는다(`MapView.cull`). 좌표를 키우지 않고 깊이 확대해 자리를 늘린다 — 새 대상은 소수 좌표로 넣는다.
- 좌표계: **2400×1700 지도 단위**. 팬 지도 모자이크(2160×1520)에서 해안선을 따고, 대륙을 모두 1.2배로 키워(바다 비율을 줄이려는 사용자 요청) 대륙마다 설정 단서에 맞춰 옮긴 좌표다(`docs/lore.md` 배치 표). 해안선은 소수 한 자리까지 남겨 배치를 바꿔도 대륙마다 정확한 닮음 변환이 된다. 지형·지명 데이터가 모두 이 좌표를 쓴다.
- `src/data/types.ts` — 데이터 모델 · `continents.ts` · `locations.ts` · `cards.ts`(ZEN·WWK·ROE 기본대지가 아닌 대지와 이어진 곳·지도 자리) · `phase1.ts`·`phase2.ts`(페이즈1·2 카드와 그림 자리·크기 — 페이즈마다 따로 나뉜 조각이라 페이즈1만 켜면 페이즈2 의 글은 받지 않는다. `phase.ts` 의 `loadPhaseData(n)` 가 1..n 을 불러와 검사하고 조회표를 만든다) · `childMaps.ts`(지역 상세 — 장소·범위·해석 안내) · `index.ts`(카드를 장소·대륙에 이어 붙임, 장소와 하나인 카드 `placeCards`, 헤드론 무리, 시대 메모, `continentAt`)
- `src/data/landscape/<대륙>.ts` — 바탕 지형 데이터 (강·선 지형·지형 영역·점 기호·바다 표시)
- `src/data/geo/*.json` — 추출한 해안선·숲·내해 (생성물, 직접 고치지 않는다)
- `src/map/` — 렌더러: `geo.ts`(다듬기) · `terrain.ts`(산·숲·늪·대지·수정·용암·툰드라 기호) · `landscape.ts`·`landscapeGlyphs.ts`(강·절벽·협곡·화산·폭포 등 바탕 지형) · `ripples.ts`(해안 물결선) · `raster.ts`(배치용 격자) · `labels.ts`(라벨 겹침 정리) · `figures.ts`·`figures/<묶음>.ts`(페이즈 그림 — 생성물. 개관에서도 그려지는 세계 지도 그림 `world` 는 페이즈를 켤 때 카드 데이터와 함께, 더 가까이에서 그려지는 `world-near` 는 그 뒤에, 지역 상세에 사는 작은 대상은 그 지역 상세가 나올 때 묶음째 불러온다. 페이즈2부터의 그림은 `world-2`·`world-near-2`·`<지역 상세 id>-2` … 에 따로 실어 그 페이즈를 켰을 때만 받고, 켠 페이즈까지의 개관 묶음(그리고 한 지역 상세의 페이즈별 묶음)은 한 번에 넣는다. 경로는 `scripts/figures/compact-path.mjs` 가 같은 점을 지나는 짧은 글로 줄인다) · `fineTerrain.ts`(깊은 확대의 잘게 뿌린 지형 기호 — 칸마다, 정확한 해안 판정) · `useMapZoom.ts` · `ZendikarMap.tsx` · 지역 상세 `childDetail.ts`(나오는 배율, 가장자리 섞기, 지형 기호, 그림 불러오기) · `ChildDetailArt.tsx`(손으로 그린 지형지물과 이름) · `childmaps/<id>.ts`(지도마다 그림 — 생성물, 그 지역이 화면에 들 때 따로 불러온다) · `childMapSizes.ts`(그림 크기 — 생성물) · `childMapArt.ts`(그림 데이터 모양)
- `src/components/` — 검색, 장소 패널, 확대 버튼, 범례
- `src/index.css` — 양피지 톤 색상 토큰
- URL: `#장소id`, `#continent/대륙id`, `#card/카드id`(대지 카드 패널 — 장소와 하나인 카드는 그 장소 패널) 로 선택 공유, `?view=x,y,k` 로 시점 지정, `?lang=ko` 로 한국어 지명, `?phase=1`·`?phase=2` 로 페이즈1·2 (예전 `?child=<id>` 주소는 그 지역 상세가 보이는 `?view=` 로 바뀌어 열린다)
- 화면 폭 767px 이하는 휴대폰 배치(장소 패널이 아래쪽 시트). `App.css`·`PlacePanel.css`·`MapControls.css`·`Legend.css` 가 같은 기준을 쓴다.
