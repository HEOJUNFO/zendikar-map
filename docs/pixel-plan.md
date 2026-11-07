# 픽셀 아트 지도 (/pixel) 계획

사용자 결정 2026-11-07. 지금 지도(양피지 SVG)와 나란히, 같은 데이터를 픽셀 아트로 그린 지도를 따로 된 페이지 `/pixel` 로 만든다.
움직이는 효과는 [pixelfx](https://github.com/patch-gg/pixelfx)(MIT, Patch)로 그린다. 한 번에 다 하지 않고 아래 단계마다 사용자가 보고 정한다.

## 결정

- **D1 주소**: `/pixel`. 루트의 `pixel.html` → `src/pixel/main.tsx`. 라우터는 두지 않는다 (react-router 를 쓰지 않는다).
- **D2 따로 빌드**: `vite/pixel.config.ts` 가 지금 지도를 빌드한 `dist/` 에 덧쓴다 (`emptyOutDir: false`). 한 빌드에 진입점 둘을 두면 함께 쓰는 모듈이 공유 조각으로 빠져
  지금 지도의 진입 조각이 바뀐다 (`entry-check`·`load.mjs` 기준값). `pnpm build` = `tsc -b && vite build && vite build -c vite/pixel.config.ts`,
  Vercel 은 `vercel.json` 의 `buildCommand` 로 이 명령을 쓰고 `/pixel` 을 `/pixel.html` 로 다시 쓴다(rewrites). 개발 서버는 `vite.config.ts` 하나로 두 페이지를 낸다.
  `pixel/index.html` 꼴은 쓰지 않는다 (개발 서버가 끝 `/` 없는 `/pixel` 에 지금 지도를 낸다).
- **D3 지금 지도는 그대로**: S1–S7 은 지금 지도의 모듈을 고치지 않고, 순수한 데이터·기하만 가져다 쓴다 (`geo.ts`·`geometry.ts`·`src/data/*` 가운데 DOM 이 없는 것).
  지금 지도의 셈(`labels.ts`·`layoutHedrons` …)이 필요하면 **복사**해 쓰고, 나중에 함께 쓸 모듈로 빼더라도 옮김마다 커밋 하나로, `saga-regress`·`labels-diff`·`entry-check` 를 지키며 한다.
  S8 의 '픽셀 지도로' 링크가 처음으로 지금 지도의 번들을 일부러 바꾸는 커밋이다.
- **D4 범위**: 세계 지도의 페이즈 그림까지 지금 지도와 맞춘다. 지역 상세(자식 지도)는 픽셀로 그리지 않는다 — 지역 상세에 사는 대상은 패널에만 싣는다 (S9 에서 따로 정한다).
  확대에는 상한을 둔다 (한 픽셀 = 0.25 단위).
- **D5 설정 원칙은 같다**: CLAUDE.md 의 설정 원칙(공식 근거·`estimate`·`nameKo`·그 무렵 모습·한 곳은 한 번만 …)과 저장한 선호(추정 자리에 다른 표시 모양을 쓰지 않는다 — '추정'은 패널에만,
  카드 모아보기 화면을 두지 않는다)를 픽셀 지도에도 그대로 따른다. 데이터가 같으니 새 설정 주장을 만들지 않는다 — 데이터에 없는 지형·효과는 그리지 않는다.
- **D6 pixelfx**: 앱이 쓰는 코드는 고정 커밋(`a841596`, v0.3.0)을 `src/pixel/vendor/pixelfx/` 에 LICENSE·NOTICE 와 함께 복사한다 (S5 — 쓰는 효과만, 캐릭터 연기 `act`·`rig`·`actor`·`poses` 와 `gallery/` 는 빼고).
  `src/fx/index.js`(244개 전부)나 패키지 루트를 import 하지 않는다. `gallery/fonts` 의 Patch Pixel 글꼴은 MIT 가 아니라 쓰지 않는다.
  `tools/`(render·check·sheets …)는 `references/pixelfx`(`pnpm refs` 로 받는 작업대, git 제외)에서 돌려도 된다. pixelfx Claude Code 스킬은 프로젝트 범위로 설치했다
  (`.claude/settings.json` 의 `pixelfx@pixelfx`) — 스킬이 말하는 'pixelfx checkout' 은 `references/pixelfx` 다. 만든 효과는 검토한 뒤 복사해 넣는다.
- **D7 한 픽셀의 크기**: `?s=` 는 한 픽셀의 화면 크기(CSS px, 1·2·3), 기기 픽셀로는 정수로 반올림한다 (DPR 1.5 화면에서 픽셀마다 폭이 달라지지 않게). 배율은 정수 배율만 —
  소수 배율에서 픽셀이 고르지 않게 깨진다. `?view=x,y,k` 는 지금 지도와 같은 뜻이라 두 페이지를 오가도 같은 자리를 본다 (k 에 가장 가까운 단계로 맞춘다).

## 단계

| | 하는 것 | 통과 조건 | 사용자가 정할 것 |
|---|---|---|---|
| **S1** ✅ | 페이지 뼈대, 해안·내해·숲을 단계마다 세계 한 장으로 (u = 8·4·2·1), 시험 스위치 `?pal=a\|b\|c`(양피지·16비트·밤) `?s=1\|2\|3` `?shore=dither\|band\|none` | `entry-check` 진입 조각 같음, `saga-regress`·`labels-diff` 가 `37ba6ec` 기준선과 같음, `/pixel` 이 dev·preview·Vercel 에서 열림 | 휴대폰에서 보고 팔레트·픽셀 크기·물가 |
| S2 | 확대 단계(정수 배율, 상한 u = 0.25), 256² 타일 + Worker(OffscreenCanvas → ImageBitmap), LRU 캐시, d3-zoom 은 몸짓만 | 타일 이음매 없음·그린 차례와 상관없이 같은 해시, 휴대폰 끌기 p95 ≤ 16.7ms, 메모리 상한 | 휴대폰도 데스크톱과 같은 깊이까지 |
| S3 | 이름·장소 표시·대지 카드 표시·패널(한/영), 한글 픽셀 글꼴(Galmuri·NeoDGM — OFL 확인), 이름 배치는 `labels.ts` 복사 | 모든 장소 이름이 어느 단계에선가 en·ko 로 보임, `nameKo` 는 데이터에 있을 때만, Tab 으로 모든 표시 | 글꼴·한글 크기, 패널 모양 |
| S4 | 바탕 지형(늪·용암·툰드라·얼음·수정, 강, 절벽, 헤드론), 손으로 찍은 스프라이트 15–20개 | 그린 것마다 데이터 항목이 있음, 성능 기준 유지 | 스프라이트 판, 단계마다 밀도 |
| S5 | pixelfx 복사·지도 크기로 고친 효과 (폭포 → 용암 → 작은 소용돌이 → 간헐천), 12fps, 보일 때만, 움직임 줄이기면 멈춘 한 장 | 효과마다 지형 id 가 있음, 아무것도 안 보이면 CPU ≈ 0, 고리 이음매 | 데이터 없는 장식(반짝임) 허용 여부 |
| S6 | 사가·페이즈·시점의 바탕 — `sagas.ts`·`timeline.ts`·`periods/*` 를 그대로 쓴다 | 그 무렵이 아니면 S4 와 같은 타일, 그 무렵 모습은 그 범위 안에서만 | 먼저 보일 보기 (2020·2023 추천) |
| S7 | 세계 지도 페이즈 그림 — path 를 팔레트 색으로 채우고 1px 윤곽, 너무 작은 것은 숨김 | 보기마다 그림 id·자리가 지금 지도의 `?map` 과 같음 | 큰 그림 몇 장 손질 |
| S8 | 지금 지도 ↔ 픽셀 지도 링크, 휴대폰 다듬기 | `saga-regress` 같음, 왕복해도 사가·시점·자리·언어·`#` 유지 | 링크 자리·글 |
| S9 | (선택) 지역 상세를 픽셀로, 또는 부드러운 확대를 위한 WebGL | — | 할지 말지 (기본은 하지 않음) |

## 피할 것

- 처음 불러올 때 `src/data/index.ts` 를 import 하기 (검사가 돌고 약 550KB) — 패널을 처음 열 때 받는다.
- `useMapZoom.ts`(React·d3), `raster.ts`(`document.createElement`)를 Worker 나 Node 에서 쓰기. `geo.ts` 는 Node 에서 import 되지 않는다(JSON import) — 시험 도구는 JSON 을 읽어 `geometry.ts` 로 같은 고리를 만든다.
- 해안선을 pixelfx `poly()` 로 그리기 (픽셀마다 모든 꼭짓점을 본다 — `src/pixel/raster/fill.ts` 의 활성 변 채우기를 쓴다), pixelfx `font.js`(영어 대문자만).
- 화면 전체 `putImageData`(DPR 3 휴대폰에서 한 프레임 약 12MB), 상한 없는 `dt`(시뮬레이션 효과가 120Hz 로 따라잡는다), 소수 배율의 nearest-neighbour.
- 데이터에 근거가 없는 효과, 1282개 그림을 모두 손으로 찍기, 처음부터 지역 상세까지.

## S1 메모

- **S1 결정 (2026-11-07, 사용자가 추천대로)**: 팔레트 b(16비트) — 양피지(a)는 픽셀 크기에서 물빛과 땅이 흐려 보였다. 한 픽셀 2×, 물가 디더링. 기본값으로 두고 `?pal`·`?s`·`?shore` 시험 스위치는 남긴다.

- 칸 종류(바다·땅·숲·육지 안의 물)는 `fill.ts` 가 짝홀 규칙으로 채우고, 물가 띠는 3-4 챔퍼 거리(`world.ts`)로 센다. 얼룩 노이즈는 지도 좌표에 붙어 단계가 바뀌어도 같은 자리에 있다.
- u = 1 장(2400×1700)은 아직 주 스레드에서 한 번에 그린다 — Worker·타일은 S2.
- 글자는 시스템 고정폭 글꼴 (픽셀 글꼴은 S3).
