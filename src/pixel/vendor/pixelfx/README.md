# pixelfx (vendored)

pixelfx `a841596` (v0.3.0) — https://github.com/patch-gg/pixelfx — MIT (`LICENSE`, `NOTICE.md`).
픽셀 지도(/pixel)의 효과(S5, `docs/pixel-plan.md` D6)가 쓰는 core 만 옮겼다:

- `core/math.js`·`color.js`·`particles.js`·`shapes.js`·`sim.js` — 그대로.
- `core/painter.js` — `text()`·`measure()` 를 뺐다 (`font.js` 를 싣지 않는다 — 픽셀 지도의 글자는 'Zendikar Pixel').
- `core/fx.js` — 캐릭터(`stockActor`)를 넣는 줄을 뺐다 (캐릭터 연기 `act`·`rig`·`actor`·`poses` 는 싣지 않는다).
- `water-lib.js` — `src/fx/water/_lib.js` 그대로 (import 경로만 `./index.js`).
- `index.js` — 위의 것만 다시 내보낸다.

효과(지도 크기로 고친 것)는 `src/pixel/fx/effects/` 에 있고, 그 머리 주석에 바탕으로 삼은 pixelfx 효과를 적는다.
고친 효과를 만들고 볼 때는 `references/pixelfx`(`pnpm refs`)의 `tools/render.mjs`·`check.mjs` 를 쓴다.
