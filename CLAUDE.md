# Zendikar Map

MTG 차원 **젠디카르(Zendikar)** 의 설정을 바탕으로 웹 지도를 만드는 프로젝트.

> **이 파일은 요약이다** (2026-11-10 — 세션마다 실리는 양을 줄이려고 나눴다). 규칙의 전문·결정 날짜·카드 목록·수치·그때그때의 까닭은 `docs/map-rules/` 에 옮기기 전 글 그대로 있다. **아래 표의 일을 하기 전에 그 파일을 먼저 읽는다** — 요약만 보고 데이터·그림·검사를 고치지 않는다. 코드 주석의 "CLAUDE.md '시점별 지도'" 같은 말은 아래 같은 이름의 요약과 그 전문 파일을 가리킨다. 규칙을 새로 정하거나 고치면 전문 파일에 적고, 요약이 달라질 때만 이 파일을 고친다(이 파일에 긴 글을 다시 쌓지 않는다).

| 하는 일 | 먼저 읽을 전문 |
|---|---|
| 페이즈 바탕(`src/data/periods/`), 지역 상세의 페이즈 문, 사가4 의 2023년 바탕 기호 | `docs/map-rules/period.md` |
| 대지 카드(`cards.ts`), 사가·페이즈 규칙, 사가1·2 카드(`phase1.ts`–`phase5.ts`) | `docs/map-rules/cards-and-sagas.md` |
| 사가3 ZNR(`phase6.ts`), 양면 카드·대지 면(`land`·`back`), ZNR 을 앞 시점에 거꾸로 잇기 | `docs/map-rules/saga3.md` |
| 사가4 MOM·MAT(`phase7.ts`·`phase8.ts`) | `docs/map-rules/saga4.md` |
| 이야기 세트 밖 카드(`extraSets.ts`·`extraCard.ts`) | `docs/map-rules/extra-sets.md` |
| 시점별 지도(`timeline.ts`, 카드의 `time`), T5·T6 의 결정 | `docs/map-rules/timeline.md` |
| 지역 상세 그리기·나누기, 몰림, 자리 다툼, 그림 이름표, 한 곳은 한 번만 | `docs/map-rules/placement.md` |
| 픽셀 지도 `/pixel`(`src/pixel/`, `scripts/pixel/`) | `docs/map-rules/pixel.md`, `docs/pixel-plan.md` |
| 생성기·QA·성능·i18n 도구를 돌리거나 고칠 때 | `docs/map-rules/commands.md` |
| 렌더러(`src/map/`)·확대·이름 밑 기호 비우기·헤드론·머리말·조각 나누기 | `docs/map-rules/structure.md` |

## 참고 자료
- `asset/` — 팬 제작 손그림 젠디카르 지도(u/maussius 원본, 수정 금지). git 제외 — 원작자 이미지라 저장소에 싣지 않는다(r/mtgvorthos 'Planar map of Zendikar' 게시물에서 받아 둔다). 파일별 내용은 `docs/reference.md`.
- `references/` — 지형 생성 참고 repo (Azgaar FMG, mewo2/terrain). git 제외, `pnpm refs`로 받음. **읽기 전용 참고 코드이며 우리 코드에서 import 하지 않는다.**
- `docs/reference.md` — 에셋 인덱스, 팬 지도 라벨 판독과 설정 대조 결과, 지형 데이터 추출 방법.
- `docs/lore.md` — 공식 설정 조사 정리(대륙·시대·헤드론·지도 표현 원칙)와 출처.
- `docs/landscape.md` — 바탕 지형(강·화산·폭포·절벽·숲·늪 등)마다 공식 근거와 이 지도의 추정.

## 설정 원칙 (위반 금지)
- 지명·소속 대륙·설명은 공식 자료(카드, magic.wizards.com 기사, Plane Shift 등)로 확인된 것만 싣는다. 팬 지도의 지명은 공식 설정과 맞을 때만 쓴다.
- 위치는 근거가 있을 때만 찍는다: `fan-map`(팬 지도 자리가 설정과 모순되지 않음) · `canon-hint`(공식 위치 서술, `placementBasis`에 근거) · 그 밖에는 `unplaced`(지도에 찍지 않고 대륙 설명에만). 공식 자료가 대륙(과 지형·이웃 같은 단서)까지만 밝힌 곳은 사용자 요청으로 모두 `estimate` 로 찍는다 — 단서에 맞춰 이 지도가 자리를 고르고, 고른 까닭을 `estimate` 에 적어 패널에 '추정'으로 보인다(마커 모양은 다른 장소와 같다). `unplaced` 는 이어진 대지 카드 표시가 그 장소의 표시가 되는 곳에만 남는다.
- 한국어 지명(`nameKo`)은 공식 한국어판 카드에 인쇄된 표기만. ZEN/WWK/ROE(2009–10)는 한국어판이 없다.
- 지도는 Zendikar Rising(2020) 이후의 모습을 기준으로 하고, 이전 시대 상태는 `history`에 적는다.
- 바탕 지형(강·화산·폭포·절벽·협곡·숲·늪·수정·용암·툰드라·바다 얼음)도 공식 자료가 있다고 한 것만 그린다. 물길·자리·범위를 공식 자료가 밝히지 않으면 사용자 요청으로 이 지도가 골라 그리고 `estimate` 에 까닭을 적는다(`src/data/landscape/<대륙>.ts`, 장소·대륙 패널에 '추정'). 모양은 근거 있는 지형과 같다. 그 무렵에만 있던 지형과 엘드라지가 바꾼 모습은 기본 지도에 그리지 않고 그 페이즈에서만 그린다(아래 '그 무렵 모습').
- **그 무렵 모습** (사용자 결정 2026-10-15, 전문 `docs/map-rules/period.md`): 페이즈를 켜면, 공식 자료가 그 페이즈 무렵 모습이 기본 지도(2020년 이후)와 눈에 띄게 달랐다고 밝힌 장소·지형지물만 그 무렵 모습으로 따로 그린다(무너짐·폐허, 물이 빠짐, 엘드라지에게 먹힘, 아직 없었음, 그 무렵에만 있었음). 지도 축척에서 보이는 물리적 모습만 다룬다(누가 살았는지·다스렸는지는 `history`).
  - 공식 자료가 모습을 밝힌 페이즈만 바꾼다. '함락됐다'·'황폐가 보인다'처럼 모습·범위를 말하지 않는 근거로는 바꾸지 않는다. 모습은 밝혔지만 자리·범위·모양을 밝히지 않은 부분은 이 지도가 골라 그리고 `estimate` 에 적는다.
  - 세계 지도는 `src/data/periods/<대륙>.ts` 의 항목(`levels` — 이어 센 1–8)으로 그 페이즈에서만 덧그리고 바탕 데이터·지형 입력은 고치지 않는다. **페이즈를 끈 기본 지도는 바이트까지 같아야 한다.** 지역 상세는 손그림 부분·이름·지형 칸·빈터의 페이즈 문(`phaseN: true|false`)으로 그린다.
  - 바뀐 바탕과 모순되는 페이즈 대상은 자리를 맞추고, 다음 페이즈에 그 자리 자체가 사라지면 `until`.
- **대지 카드** (전문 `docs/map-rules/cards-and-sagas.md`): ZEN·WWK·ROE·BFZ·OGW·ZNR 의 기본대지가 아닌 대지는 모두 지도에 나온다(`cards.ts` 의 `at`). BFZ·OGW·ZNR 대지는 그 사가의 일(엘드라지와 그 피해·전쟁, 2020년의 일)과 이어진 것만 `saga` 로 그 사가에 매고 나머지는 페이즈를 끈 지도부터 늘 나온다 — 카드 이름·플레이버·공식 자료로 가르고 그림만 보고 가르지 않는다. 공식 근거가 장소와 자리까지 닿지 않으면 이 지도가 잇거나 자리를 고르고 `estimate` 에 적는다. 그림을 보고 짐작해 잇지 않는다.
- **사가·페이즈** (사용자 결정 2026-10-11, `src/data/sagas.ts`, 전문 `docs/map-rules/cards-and-sagas.md`): 사가1 '엘드라지의 깨어남'(ZEN·WWK·ROE = 페이즈1·2·3), 사가2 '젠디카르 전투'(BFZ·OGW), 사가3 '젠디카르 라이징'(ZNR), 사가4 'March of the Machine'(MOM·MAT). 안에서는 이어 센 번호 1–8 을 쓴다(`phaseN.ts`, 그림 묶음 끝의 `-n`, 지역 상세 문 `phase`·`phase2`…`phase8`). 주소 `?saga=s&phase=p`.
  - 카드는 설정 근거일 뿐이라 카드 그림을 지도에 붙이지 않고, 그 대상을 지도 화풍의 그림으로 대상 크기에 맞춰 그린다. 자리는 대지 카드와 같은 규칙(`basis`·`estimate`). 사람만 한 대상이나 세계 지도에 두면 이름을 가리는 대상은 지역 상세에 넣는다.
  - 사가 안에서는 페이즈를 쌓아 그리되, 다음 페이즈에 그 자리(그 상태)에 없다고 공식 자료가 밝힌 대상은 `until` 로 그 페이즈까지만 그린다(까닭은 `basis`, 옮겨 그리지 않는다).
  - **사가를 넘어가면 카드 그림을 비우고 새로 시작한다** — 앞 사가의 대상은 공식 자료가 새 사가의 시점에도 있다고 그 자리(그 상태)까지 밝힌 것만 새 사가의 카드로 다시 싣는다. 근거 없이 '아마 아직 있겠지'로 남기지 않는다.
  - 인물 자신의 카드는 그 카드 무렵의 자리에 따로 그리고, 그 인물을 말하는 주문 등 인물 자신이 아닌 카드는 인물을 다시 그리지 않고 곁에 상징을 둔다.
  - 이름이 이어진 장소의 이름과 같은 페이즈 카드는 `place: true` 로 그림 없이 그 장소 패널에 실린다.
- **사가3** (사용자 결정 2026-10-24, 전문 `docs/map-rules/saga3.md`): ZNR 256장을 2020년 무렵의 자리에 그린다. 양면 카드는 앞면을 그림으로 그리고 대지 면(`PhaseCard.land`)은 그 면이 가리키는 장소의 패널에 싣는다(그림은 그 장소 표시 곁 40 단위 + `extent`). 변신하는 양면 카드의 뒷면(`PhaseCard.back`)은 그리지 않고 카드 패널에만 싣는다. **새 대지 표시는 기존 낮은 지형 기호(툰드라·늪 풀포기·빙원·용암 획)에서 8 단위 넘게 떨어진 자리에 둔다** — 안에 두면 그 대륙의 기호가 통째로 다시 뿌려져 모든 보기가 바뀐다.
- **사가4** (사용자 결정 2026-11-03, 전문 `docs/map-rules/saga4.md`): 공식 자료가 젠디카르의 일이라고 밝힌 MOM 10장·MAT 3장만 싣는다. 헤더 이름은 한국어 보기도 영어이고, 한국어판이 없어 새 카드에 `nameKo` 를 달지 않는다. 2023년의 자리는 모두 `estimate`.
- **이야기 세트 밖 카드** (사용자 결정 2026-11-06, 전문 `docs/map-rules/extra-sets.md`): 이야기 세트(ZEN·WWK·ROE·BFZ·OGW·ZNR·MOM·MAT) 밖에서 처음 인쇄된 카드도 이름·플레이버·규칙 글이나 공식 기사가 젠디카르와 이으면 싣는다(54장). 무렵은 글이 밝힌 것, 아니면 처음 인쇄된 날 앞의 가장 늦은 이야기 세트 — 그 페이즈 파일 끝에 싣고 `sagaSet`·`era` 에 적는다. Zendikar Expeditions 와 재판뿐인 인쇄는 싣지 않는다.
- **시점별 지도** (사용자 결정 2026-10-19, `src/data/timeline.ts`, 전문 `docs/map-rules/timeline.md`): 사가 보기와 나란한 헤더의 셋째 무리 '시점'(2009·2010·2015·2016·2020·2023, `?time=1..6` — `saga`·`phase` 보다 앞서고 함께 두지 않는다). T1 ZEN·WWK, T2 ROE, T3 BFZ, T4 OGW, T5 ZNR, T6 MOM·MAT(바탕 단계 2·3·4·5·6·8). 사가 보기의 규칙(쌓기·비우기·`until`)과 따로 자기 규칙을 따른다.
  - **있는 것은 이어 그린다**: 한 시점에 그린 대상은 사라졌다고 볼 까닭(죽음·파괴, 떠남, 그 자리와 함께 먹히거나 무너짐)이 없으면 뒤 시점에도, 생겨났다고 볼 까닭이 없으면 앞 시점에도 그린다(`time.at`). 까닭은 공식 근거 `time.basis` 나 이 지도의 판단 `time.estimate` 에 그 해와 함께 적고, 까닭 없이 시점을 빼지 않는다. T5 부터는 카드마다 결정을 데이터로 단다(`time.at`·`time.gone`).
  - 일어난 일(장면·주문·전투 순간·배틀 — `isEffect`)은 그 시점에만 그린다. 같은 개체(`time.same`)와 같은 이름의 재판은 한 시점에 하나 — 세트 시점 쪽이 이긴다.
  - 이어 그린 시점의 바탕에서 그 자리를 잃는 대상은 근처의 맞는 자리로 옮기고(`time.moved`, 하늘이면 `time.aloft`), 그 자리와 함께 사라졌다고 보는 것이 맞을 때만 그 시점을 뺀다.
  - **자리 다툼**: 자리가 정확한 대상 > 그 시점이 세트 시점인 카드 > 공식 근거로 이어 온 카드 > 판단으로 이어 온 카드. 진 카드는 그 시점에만 `time.moved`(크기 그대로)로 비키고 사가 보기의 자리는 바꾸지 않는다. 자리 다툼 때문에 시점을 빼지 않는다. 이름 쪽만 바꿀 때는 `time.label`. **이름은 옮겨 앉아도 되지만 사라지면 안 된다.**
  - 글은 한국어로 쓰고, 지명·카드 이름은 공식 한국어 표기가 있을 때만 한국어로 — 한국어 이름을 지어내지 않는다.
  - 사가 보기와 페이즈를 끈 지도는 시점별 지도 때문에 바뀌지 않는다(`saga-regress`).
- **지역 상세**(자식 지도, 사용자 결정 2026-10-08, 전문 `docs/map-rules/placement.md`): 그 지역을 큰 축척으로 따로 그린 그림을 세계 지도의 깊은 확대 단계(`DEEP_TIER` 이상)에 합친다. 지도 위에 틀·격자·사각형 경계·확대창·상자를 두지 않는다. 한 이름은 한 번만 나오고, 지형지물은 공식 서술이 있는 것만, 이름은 공식 이름만 단다. 범위 밖을 가리키는 표시는 그리지 않는다. 세계 지도에 그리는 페이즈 그림은 다시 그리지 않고 그 그림과 이름표 자리를 비켜 그린다. 그 장소 패널의 '가까이 보기'로 연다.
- **몰림 규칙** (사용자 결정 2026-10-08, 코드 주석의 '붐빔 규칙'): (1) 공식 근거가 대륙·지역까지만 닿는 대상(`estimate`)은 한 점에 모으지 말고 근거가 허락하는 범위 안에서 흩는다 — 근거가 정확한 자리를 밝힌 대상은 옮기지 않는다. (2) 그래도 한 지역 상세가 붐비면(대상 15장 남짓) 붐비는 구역을 '더 깊은 지역 상세'(`childMaps.ts` 의 `parent`, 한 겹만)로 나눈다.
- **자리가 정확한 대상이 먼저다** (사용자 결정 2026-10-18): 공식 근거가 정확한 자리를 밝힌 대상은 추정 대상·다른 그림과 그 이름표·지역 상세의 손그림 부분 때문에 밀려나지 않는다 — 약한 쪽이 비킨다. 큰 대상의 크기를 줄여 자리를 내지 않는다. 세계 지도 축척에서 보일 만큼 큰 대상은 세계 지도 그림으로 두고, 그 그림 때문에 이름이 사라질 때만 지역 상세에 넣는다. 그림 이름표가 손그림 지형지물이나 다른 그림에 걸치면 `label` > `time.label` > 추정 대상만 가까운 빈 땅으로 > 그대로 둔다 — 손그림 부분은 숨기거나 고치지 않는다.
- **한 곳은 한 번만 나온다**: 카드 이름이 이어진 장소의 이름이나 별칭(`aliases`)과 같으면 그 카드는 곧 그 장소다 — 지도 표시·검색 결과·대륙 목록에 장소로 한 번만 나오고, 카드 그림과 정보는 장소 패널에 실린다(`#card/카드id` 도 장소 패널로). 자리가 없는 장소면 카드 표시가 그 장소의 표시가 된다(자리는 `estimate`).

## 픽셀 아트 지도 (/pixel)
- 사용자 결정 2026-11-07, 전문 `docs/map-rules/pixel.md`·`docs/pixel-plan.md`: 같은 데이터를 픽셀 아트로 그린 지도를 따로 된 페이지 `/pixel`(`pixel.html` → `src/pixel/`)로 만든다. 시점별 지도만 한다(사가·페이즈 보기는 하지 않는다).
- 따로 빌드한다(`vite/pixel.config.ts`, `pnpm build` 가 두 번 빌드). **지금 지도의 모듈은 고치지 않고** 순수한 데이터·기하만 가져다 쓰거나 복사한다 — 지금 지도의 사가 보기는 바이트까지 그대로여야 한다(예외는 `src/App.tsx` 의 '픽셀 지도로 보기' 링크 하나).
- 위의 설정 원칙과 저장한 선호(추정 자리에 다른 표시 모양 없음, 카드 모아보기 없음)는 픽셀 지도에도 그대로다.
- 글자는 'Zendikar Pixel'(Galmuri11 을 줄인 것) 12·24px 로만 쓴다. 'Galmuri' 는 OFL 예약 이름이라 고친 글꼴 파일에 쓰지 않는다. Patch Pixel 글꼴은 쓰지 않는다.
- 픽셀 작업의 타입 검사는 `pnpm -s tsc -b`.

## 스택
- Vite + React 19 + TypeScript, 패키지 매니저 **pnpm**
- 지도: SVG + d3-zoom. 폰트는 @fontsource (IM Fell English, Gowun Batang) — 고운바탕 CSS 는 `vite/fontRanges.ts` 가 빌드·개발 서버에서 한국어 조각의 범위에서 라틴 조각이 그리는 글자(라틴 woff 의 cmap 으로 센다)를 빼서 싣는다(영어 글만으로 한국어 조각을 받지 않게, 2026-11-05). 범례(`Legend.tsx`)의 펼친 내용은 처음 펼칠 때 그린다 — 접힌 범례의 글도 브라우저가 그 글꼴을 받았다
- 린트: oxlint (`pnpm lint`)

## Claude Code 플러그인 (project scope, `.claude/settings.json`)
- `example-skills@anthropic-agent-skills` — `algorithmic-art`(양피지 질감·해안선·해칭 패턴 실험), `frontend-design`, `canvas-design` 등
- `impeccable@impeccable` — `/impeccable polish|audit|critique …` 디자인 점검. Edit/Write·Stop 시 UI 검사 훅이 자동 실행됨
- `ui-ux-pro-max@ui-ux-pro-max-skill` — 스타일·팔레트·폰트 조합 검색

## 명령어
전문(도구마다의 선택지·기준선 남기는 법·시험 절차)은 `docs/map-rules/commands.md` — 아래에 없는 도구나 선택지는 거기서 찾는다.
- `pnpm dev` — 개발 서버 · `pnpm build` — 타입체크 + 빌드(지도와 픽셀 지도 두 번) · `pnpm lint` · `pnpm refs` — 참고 repo 받기
- `node scripts/figures/to_ts.mjs > src/map/figures.ts` — 페이즈 그림 원본(`scripts/figures/art/<카드id>.js`)에서 다시 만들기. 화풍은 `scripts/figures/STYLE.md`
- `node scripts/childmaps/to_ts.mjs [--check [id …]]` — 지역 상세 원본(`scripts/childmaps/art/<id>.js`)에서 다시 만들기. 맥락은 `node scripts/childmaps/context.mjs <id>`, 화풍은 `scripts/childmaps/STYLE.md`
- 측정·스크린샷용 headless Chrome 은 **반드시 `scripts/qa/chrome.mjs` 의 `launchChrome()`** 으로 띄우고 끝나면 `await chrome.close()`. Chrome 을 직접 spawn 하지 않는다(못 닫힌 Chrome 이 수십 개 쌓인 적이 있다). 남은 것은 `pnpm chrome:reap`.
- 고친 뒤 볼 것:
  - 마커·그림·이름을 더하거나 옮겼다 → `node scripts/qa/labels-diff.mjs --compare <기준선>`(기존 이름이 사라졌는지 — labels-check·saga-regress 는 이것을 보지 못한다)와 `node scripts/qa/labels-check.mjs`
  - 사가 보기·끔 지도가 바뀌면 안 되는 작업 → `node scripts/qa/saga-regress.mjs --compare <main 에서 남긴 기준선>`(기준선은 `.qa-baselines/` 에)
  - 카드의 `time` 을 고쳤다 → `node scripts/qa/timeline-check.mjs`
  - 페이즈 바탕을 고쳤다 → `gates-test.mjs`·`period-mark-test.mjs`·`period-check.mjs`·`svgdiff.mjs`
  - 데이터 글(한국어 원본)을 고쳤다 → `node scripts/i18n/extract.mjs --check`(영어 사전에서 빠진 문장), 옮기는 법은 `scripts/i18n/BRIEF.md`
  - 스크린샷 `node scripts/qa/shots.mjs <폴더> 이름='?view=x,y,k' …`, 성능 `scripts/perf/measure.mjs`·`load.mjs`·`profile.mjs`

## 구조
전문(렌더러의 파일마다 맡은 일, 이름 밑 기호 비우기·헤드론 비키기·머리말 접기의 규칙과 그 까닭)은 `docs/map-rules/structure.md` — `src/map/` 이나 화면 배치를 고치기 전에 읽는다.
- 좌표계: **2400×1700 지도 단위**. 지형·지명 데이터가 모두 이 좌표를 쓴다. 좌표를 키우지 않고 깊이 확대해 자리를 늘린다 — 새 대상은 소수 좌표로 넣는다.
- 확대: 배율 1 이 세계 전체, 최대 256배(`useMapZoom.ts`). 라벨 배치는 화면 px/단위의 tier 별. `DEEP_TIER`(5)부터 지형 기호를 잘게 다시 뿌리고 지역 상세가 나온다.
- `src/data/` — `types.ts` · `continents.ts` · `locations.ts` · `cards.ts`(대지 카드) · `phase1.ts`–`phase8.ts`(페이즈 카드 — 지도는 `?map` 조각, 긴 글은 카드 한 장씩 `?card=`, 뽑는 것은 `vite/phaseData.ts`) · `sagas.ts` · `timeline.ts` · `childMaps.ts` · `landscape/<대륙>.ts`(바탕 지형) · `periods/<대륙>.ts`(페이즈 바탕) · `index.ts`(카드를 장소·대륙에 잇고 검사)
- 생성물은 직접 고치지 않는다: `src/data/geo/*.json`, `src/map/figures.ts`·`figures/`·`figures-time/`, `src/map/childmaps/<id>.ts`·`childMapSizes.ts`.
- `src/map/` — 렌더러(지형 `terrain.ts`·`fineTerrain.ts`, 바탕 지형 `landscape.ts`, 이름 `labels.ts`, 기호 비우기 `glyphSpans.ts`, 헤드론 `hedronYield.ts`, 페이즈 바탕 `period.ts`, 지역 상세 `childDetail.ts`·`ChildDetailArt.tsx`, `ZendikarMap.tsx`) · `src/components/` — 검색·장소 패널·확대 버튼·범례 · `src/i18n/` — 화면 글과 영어 사전
- 이름 밑의 흩뿌린 지형 기호와 떠 있는 헤드론은 이름 상자를 비킨다 — 다 뿌린 뒤 빼서 남은 기호의 자리는 그대로이고 이름 배치에는 되먹이지 않는다. 선(해안 절벽·단애·강)과 지역 상세의 손그림 부분은 빼지 않고, 칠은 자르지 않는다.
- URL: `#장소id`·`#continent/대륙id`·`#card/카드id` 로 선택 공유, `?view=x,y,k`, `?lang=ko`, `?saga=s&phase=p`, `?time=1..6`(사가보다 앞선다).
- 화면 폭 767px 이하는 휴대폰 배치(장소 패널이 아래쪽 시트). `App.css`·`PlacePanel.css`·`MapControls.css`·`Legend.css` 가 같은 기준을 쓴다.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. Route only to skills in the session's available-skills list; answer directly for quick questions or small scoped edits.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- QA/testing site behavior → invoke /qa
- Code review/diff check → invoke /review
- Ship/deploy/PR → invoke /ship

Do not suggest or auto-invoke other gstack skills: they run when the user types them, or when a running skill hands off to them (`gstack-config set proactive all` routes every skill).

# Claude Code Game Studios -- Game Studio Agent Architecture

> **이 절의 범위** (2026-11-10 설치 — CCGS 1.3.0, `Donchitos/Claude-Code-Game-Studios`, MIT): 이 저장소는 여전히 Zendikar Map 이고, 아래는 같은 저장소에 얹은 게임 스튜디오 틀(CCGS)의 지침이다. CCGS 스킬(`/start`·`/prototype`·`/next-step` …)이나 CCGS 에이전트(`.claude/agents/`)로 하는 게임 스튜디오 작업과 그 산출물(`design/`·`production/`·`prototypes/`·`docs/architecture/`·`docs/engine-reference/`)에만 적용한다. 지도 작업(위의 모든 절)에는 아래의 Collaboration Protocol('May I write …' 묻기)과 Coding Standards 를 적용하지 않고, 둘이 부딪히면 위의 규칙이 먼저다.
> - 지도 앱의 코드가 `src/` 에 있다. 엔진을 정하지 않으면 CCGS 는 `src/` 를 code root 로 읽으니(`.claude/docs/code-root-resolution.md`), 게임 코드를 새로 만들 때는 지도 앱과 섞이지 않게 자리를 먼저 사용자에게 묻는다(`project.yaml` 의 `engine.code_root`). 템플릿의 `src/CLAUDE.md` 는 넣지 않았다.
> - 키운 게임 「젠디카르 원정대」는 `game/` 에 있다 (사용자 결정 2026-11-10 — 저장소 맨 위는 지도 앱이라 CCGS 의 키우기 도구가 그 자리에는 만들지 못한다). `game/` 가 게임의 웹 프로젝트 뿌리다: `npm` 명령은 `game/` 에서 돌리고, CCGS 스크립트(`one-shot-grow.sh`·`one-shot-run.sh`·`one-shot-tune.sh`·`test-run.sh`)에는 `--root game` 을 붙인다. `game/prototypes`·`game/production`·`game/design` 은 저장소의 같은 이름 폴더로 가는 링크이고, `project.yaml` 의 `engine.code_root`·`engine.test_root`·`commands.*` 가 이 자리를 가리킨다. 지도의 린트는 `game/` 를 보지 않는다(`game/.oxlintrc.json`). 키운 기록은 `production/qa/evidence/grow-zendikar-expedition/grow.md`.
> - CCGS 문서가 말하는 루트의 `README.md`·`UPGRADING.md`·`CHANGELOG.md`·`LICENSE` 는 `docs/ccgs/` 에 있다(루트 `README.md` 는 지도 것). 템플릿의 `.github/` 는 넣지 않았다.
> - 설치하며 바꾼 이름: 우리 클라우드 준비 훅은 `.claude/hooks/cloud-setup.sh`(CCGS 의 `session-start.sh` 와 겹쳤다), emilkowalski 의 UI 변형 스킬 `prototype` 은 `prototype-ui`(CCGS 의 `/prototype` 과 겹쳤다 — `skills-lock.json` 에서 뺐다).
> - `.claude/settings.json` 에는 CCGS 의 훅과 허용·거부 규칙을 합쳤다. `statusLine`(`.claude/statusline.sh`)과 `permissions.defaultMode` 는 넣지 않았다.

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: Web (Vite 8.3.4)
- **Language**: TypeScript
- **Version Control**: Git with trunk-based development
- **Build System**: Vite, in `game/` — `npm run build` for `game/dist/`, `npm run build:single` for one self-contained HTML file
- **Asset Pipeline**: plain files in `game/assets/` (the two fonts the page's styles load)

> **Note**: Engine-specialist agents exist for Godot, Unity, and Unreal with
> dedicated sub-specialists. Use the set matching your engine.

## Project Structure

Read `.claude/docs/directory-structure.md` on demand — before creating any game source or test file (the code root and test root are engine-specific). It is not imported here, to keep session context small.

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line under this comment is engine-specific,
     and there is none until an engine is set. /setup-engine, the grow's record
     step and /project-settings (engine.name) write
     @docs/engine-reference/<engine>/VERSION.md here for the chosen engine. Skills
     that need the pinned version read that file on demand either way. -->


## Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

## Coordination Rules

Read `.claude/docs/coordination-rules.md` on demand — before spawning CCGS agents or running a `team-*` or orchestration skill. It is not imported here, to keep session context small. One rule applies everywhere, so it is restated: **Nothing Goes Upstream** — never file, open or comment on an issue or pull request in an engine, plugin or vendor repository, even when asked; write a draft and the user submits it.

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** Say "make me a game" (`/prototype`), or run `/start` to begin
> the guided onboarding flow.

## Coding Standards

Read `.claude/docs/coding-standards.md` on demand — before writing game code, design docs or tests, and before closing a story. It is not imported here, to keep session context small.

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
