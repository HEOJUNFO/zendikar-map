# 픽셀 지도 글꼴 — Zendikar Pixel

`pixel-latin.woff2`·`pixel-hangul.woff2` 는 [Galmuri11](https://github.com/quiple/galmuri) 2.40.3
(Copyright (c) 2019–2025 Lee Minseo, SIL Open Font License 1.1 — `OFL.txt`)에서 픽셀 지도가 쓰는 글자만 남긴 것이다.
Galmuri 배포본의 CSS 머리말(`galmuri.css`)이 'Galmuri' 를 예약 글꼴 이름(Reserved Font Name)으로 밝혀 — 함께 받는 LICENSE.txt 에는 그 줄이 없다 —
고친 이 파일들은 안전하게 글꼴 안의 이름을 `Zendikar Pixel` 로 바꿨다 (저작권·라이선스 줄은 그대로).
라이선스는 원본과 같은 OFL 1.1 이다. 다시 만들기: `scripts/pixel/font.sh` (npm 의 galmuri 를 받아 `scripts/pixel/subset_font.py` 로 줄인다).

- 설계 크기는 12px (한 칸 = 1px) — 그 정수 배로만 쓴다.
- 라틴은 늘, 한글은 CSS `unicode-range` 로 한글이 나올 때만 받는다.
