# Zendikar Map

MTG 차원 **젠디카르(Zendikar)** 의 설정을 바탕으로 웹 지도를 만드는 프로젝트.

## 참고 자료
- `asset/` — 팬 제작 손그림 젠디카르 지도(원본, 수정 금지). 파일별 내용은 `docs/reference.md`.
- `docs/reference.md` — 에셋 인덱스, 대륙별 지명 판독, MTG 설정 요약. 지명·위치는 여기와 MTG 공식 설정을 기준으로 한다.

## 스택
- Vite + React 19 + TypeScript, 패키지 매니저 **pnpm**
- 린트: oxlint (`pnpm lint`)

## 명령어
- `pnpm dev` — 개발 서버
- `pnpm build` — 타입체크 + 빌드
- `pnpm lint`

## 구조
- `src/data/` — 대륙·지명 데이터와 타입 (`types.ts`는 초안)
- `src/components/` — 지도 UI 컴포넌트
- `src/index.css` — 양피지 톤 색상 토큰

## 현황
기본 세팅만 완료. 지도 렌더링 방식(SVG / 캔버스 / 타일 등)은 아직 정하지 않았다.
