// pixelfx core — 픽셀 지도(/pixel)의 효과가 쓰는 몫만 (docs/pixel-plan.md D6, S5). 원본 src/core/index.js 에서 캐릭터 연기(act·rig·actor·poses·chain)·
// 글꼴(font)·장면(scene)을 뺐다 — README.md
export * from "./core/math.js";
export * from "./core/color.js";
export * from "./core/particles.js";
export * from "./core/shapes.js";
export { Particles, Bits, Lights, Blazes, P, PF, B, GRAVITY, FIRE_RAMP, SMOKE_RAMP, sparkle, flare, band, crystal } from "./core/sim.js";
export { Painter } from "./core/painter.js";
export { createFrame, clearFrame, createFx, composite, painterFor, resolveOptions } from "./core/fx.js";
