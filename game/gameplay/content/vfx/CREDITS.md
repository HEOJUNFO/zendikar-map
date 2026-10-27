# 전투 효과 그림의 출처

이 폴더의 `*.qoi` 넷은 모두 **CC0 1.0** 원본에서 `game/tools/art/prepare-vfx.mjs` 가 만든 1024×1024 RGBA 층이다 (2026-10-27 받음).
원본은 저장소 밖의 `game/vfx-src/`(git 제외)에 두고, 빌드는 원본을 읽지 않는다. 다시 만들려면 원본을 받아 두고 prepare-vfx 를 돌린다.
게임은 에셋 팩의 `vfx/<이름>` 항목으로 받아 `presentation/scene_view` 의 스프라이트(`engine/render/sprite_batch`)가 텍스처 배열의 층으로 쓴다.

| 층 (`vfx/…`) | 원본 | 만든 곳 | 라이선스 | 손질 |
| --- | --- | --- | --- | --- |
| `explosion` | VFX Image Sequences & Flipbooks — `Explosion02_5x5.tga` (5 × 5, 25 프레임) | Unity Technologies (Unity Labs) — https://unity.com/blog/engine-platform/free-vfx-image-sequences-flipbooks | CC0 1.0 | 무압축 TGA 를 위 줄부터의 RGBA 로 그대로 옮김 (알파는 원본의 것) |
| `fireball` | 같은 묶음 — `FireBall01_8x8.tga` (8 × 8, 64 프레임) | Unity Technologies (Unity Labs) | CC0 1.0 | 검은 바탕이라 알파를 RGB 의 가장 큰 값으로 채움 (더해 그린다) |
| `smoke` | 같은 묶음 — `WispySmoke01_8x8.tga` (8 × 8, 64 프레임) | Unity Technologies (Unity Labs) | CC0 1.0 | 그대로 옮김 (알파는 원본의 것, 색은 그릴 때 입힌다) |
| `sprites` | Particle Pack 1.1 — `PNG (Transparent)` 의 열여섯 장 (`prepare-vfx.mjs` 의 `SPRITES` 차례) | Kenney Vleugels (Kenney.nl) — https://kenney.nl/assets/particle-pack | CC0 1.0 (`License.txt`) | 512² 를 256² 로 줄여 4 × 4 아틀라스에 놓음 |
