# Zendikar Map

MTG 차원 **젠디카르(Zendikar)** 의 설정을 바탕으로 웹 지도를 만드는 프로젝트.

## 참고 자료
- `asset/` — 팬 제작 손그림 젠디카르 지도(원본, 수정 금지). 파일별 내용은 `docs/reference.md`.
- `references/` — 지형 생성 참고 repo (Azgaar FMG, mewo2/terrain). git 제외, `pnpm refs`로 받음. **읽기 전용 참고 코드이며 우리 코드에서 import 하지 않는다.**
- `docs/reference.md` — 에셋 인덱스, 팬 지도 라벨 판독과 설정 대조 결과, 지형 데이터 추출 방법.
- `docs/lore.md` — 공식 설정 조사 정리(대륙·시대·헤드론·지도 표현 원칙)와 출처.

## 설정 원칙 (위반 금지)
- 지명·소속 대륙·설명은 공식 자료(카드, magic.wizards.com 기사, Plane Shift 등)로 확인된 것만 싣는다. 팬 지도의 지명은 공식 설정과 맞을 때만 쓴다.
- 위치는 근거가 있을 때만 찍는다: `fan-map`(팬 지도 자리가 설정과 모순되지 않음) · `canon-hint`(공식 위치 서술, `placementBasis`에 근거) · 그 밖에는 `unplaced`(지도에 찍지 않고 대륙 설명에만).
- 한국어 지명(`nameKo`)은 공식 한국어판 카드에 인쇄된 표기만. ZEN/WWK/ROE(2009–10)는 한국어판이 없다.
- 지도는 Zendikar Rising(2020) 이후의 모습을 기준으로 하고, 이전 시대 상태는 `history`에 적는다.
- ZEN·WWK·ROE 대지 카드(기본대지가 아닌 것)는 사용자 요청으로 모두 지도에 나온다(`cards.ts` 의 `at`). 공식 근거(카드 이름이 곧 지명, 또는 공식 자료가 그 장소의 그림이라고 밝힘)가 장소와 자리까지 닿지 않는 카드는 이 지도의 판단으로 잇거나 자리를 고르되, `estimate` 에 그 판단을 적어 패널에 '추정'으로 보인다. 그림을 보고 짐작해 잇지 않는다.
- 페이즈1(헤더의 '페이즈1' 단추, `?phase=1`)은 ZEN 미식 레어 15장을 지도에 올린다. 카드는 설정 근거일 뿐이라 카드 그림을 지도에 붙이지 않고, 그 대상(바다 괴물·천사·짐승·인물…)을 지도 화풍의 그림으로 대상 크기에 맞춰 그린다. 자리는 대지 카드와 같은 규칙(`basis`·`estimate`). 사람만 한 대상, 또는 자리가 붐벼 세계 지도에 두면 장소 이름을 가리는 대상은 그 지역의 자식 지도에 넣는다.
- 자식 지도는 그 지역을 큰 축척으로 따로 그린 지역 지도다(세계 지도의 확대가 아니다). 세계 지도에는 그 범위에 틀만 보이고, 틀(또는 장소 패널의 '지역 지도 열기')을 누르면 세계 지도 자리에 열리며 '세계 지도로'·Esc 로 돌아온다. 해안·호수·숲과 장소·카드 표시의 자리는 세계 지도에서 그대로 가져오고, 지역의 지형지물은 공식 서술이 있는 것만 그린다. 이름은 공식 이름만 달고, 이 지도가 해석한 배치는 머리말의 해석 안내(`PHASE1_CHILD_MAPS` 의 `note`)에 적는다.
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
- `node scripts/figures/to_ts.mjs > src/map/figures.ts` — 페이즈 그림 원본(`scripts/figures/art/<카드id>.js`)에서 다시 만들기. 원본은 작업대 `scripts/figures/index.html?ids=…`(지도 배율별 미리보기)에서 보며 고치고, 화풍은 `scripts/figures/STYLE.md`
- `node scripts/childmaps/to_ts.mjs` — 자식 지도 원본(`scripts/childmaps/art/<id>.js`, 공통 그리기 도구 `kit.js`)에서 `src/map/childmaps/<id>.ts` 를 다시 만들기. 원본은 `pnpm dev` 뒤 `?phase=1&child=<id>&childsrc=1`(원본을 바로 읽는다)로 보며 고치고, 그 범위의 세계 지도 맥락(해안·장소·헤드론을 자식 지도 좌표로)은 `node scripts/childmaps/context.mjs <id>`, 화풍은 `scripts/childmaps/STYLE.md`
- `pnpm refs` — 참고 repo 받기/갱신 · `pnpm refs:fmg` — FMG 로컬 실행 (:5180)

## 구조
- 좌표계: **2400×1700 지도 단위**. 팬 지도 모자이크(2160×1520)에서 해안선을 따고, 대륙마다 설정 단서에 맞춰 옮긴 좌표다(`docs/lore.md` 배치 표). 지형·지명 데이터가 모두 이 좌표를 쓴다.
- `src/data/types.ts` — 데이터 모델 · `continents.ts` · `locations.ts` · `cards.ts`(ZEN·WWK·ROE 기본대지가 아닌 대지와 이어진 곳·지도 자리) · `phase1.ts`(페이즈1 카드와 그림 자리·크기, 자식 지도) · `index.ts`(카드를 장소·대륙에 이어 붙임, 장소와 하나인 카드 `placeCards`, 헤드론 무리, 시대 메모, `continentAt`)
- `src/data/geo/*.json` — 추출한 해안선·숲·내해 (생성물, 직접 고치지 않는다)
- `src/map/` — 렌더러: `geo.ts`(다듬기) · `terrain.ts`(산·숲·늪 기호) · `ripples.ts`(해안 물결선) · `raster.ts`(배치용 격자) · `labels.ts`(라벨 겹침 정리) · `figures.ts`(페이즈 그림 — 생성물, 페이즈를 처음 켤 때 따로 불러온다) · `useMapZoom.ts` · `ZendikarMap.tsx` · 자식 지도 `ChildMapView.tsx`(따로 그린 지역 지도 화면, 확대는 자체 d3-zoom) · `childmaps/<id>.ts`(지도마다 그림 — 생성물, 연 지도만 따로 불러온다) · `childMapArt.ts`(그림 데이터 모양) · `childTerrain.ts`(다각형 안에 세계 지도와 같은 산·숲·늪 기호를 흩뿌림)
- `src/components/` — 검색, 장소 패널, 확대 버튼, 범례
- `src/index.css` — 양피지 톤 색상 토큰
- URL: `#장소id`, `#continent/대륙id`, `#card/카드id`(대지 카드 패널 — 장소와 하나인 카드는 그 장소 패널) 로 선택 공유, `?view=x,y,k` 로 시점 지정, `?lang=ko` 로 한국어 지명, `?phase=1` 로 페이즈1, `?phase=1&child=<id>` 로 그 자식 지도
- 화면 폭 767px 이하는 휴대폰 배치(장소 패널이 아래쪽 시트). `App.css`·`PlacePanel.css`·`MapControls.css`·`Legend.css` 가 같은 기준을 쓴다.
