# 타일 텍스처의 출처

이 폴더의 `*.jpg` 는 **Poly Haven** (https://polyhaven.com) · **ambientCG** (https://ambientcg.com) · **3dtextures.me** (https://3dtextures.me) 의 재질에서 가져와 손질한 것이다.
라이선스는 모두 **CC0 1.0** — Poly Haven: https://polyhaven.com/license ("Our assets are all licensed as CC0 … You can redistribute them … even in a product you sell", 2026-10-09 확인),
ambientCG·3dtextures.me: 에셋 페이지의 표기 (받을 때 읽은 것 — `game/art-src/INVENTORY.md` 의 둘째 받기 절).
출처 표기는 의무가 아니지만 여기 적어 둔다. 받은 원본과 그 md5 는 저장소 밖의 `game/art-src/INVENTORY.md` 에 있다.
(같이 받아 둔 OpenGameArt 의 Keith333 색유리 사진(CC BY 3.0)과 Wikimedia 의 창 사진, 재배포 불가인 Sponza 는 쓰지 않았다.)

손질은 `game/tools/art/prepare.mjs` 가 한 번에 한다 (ffmpeg) — 텍스처마다 1024×1024 baseline JPEG 둘 또는 셋:
- `<이름>.jpg` — 색(Diffuse·Color·basecolor). `textures.txt` 의 `eq=…` 만큼 채도·대비·밝기를 고치고(사진 albedo 가 기준 그림의 밝은 회백색 돌보다 누렇고 어두워서),
  AO 그림(ARM 의 빨강, 또는 따로 있는 AO)이 있으면 `AO × 0.6 + 0.4` 를 색에 곱한다. 4:2:0, `-q:v 4`.
- `<이름>.nar.jpg` — 빨강·초록에 법선 맵(OpenGL 식)의 xy, 파랑에 거칠기. 4:4:4, `-q:v 5`.
- `<이름>.metal.jpg` — 금속성 (회색) — 삭은 청동, 색유리의 납선.
색유리(`glass_window_001`)는 유리 조각의 색을 다시 입혔다: 원본의 초록·노랑·흰색 조각을 3×3 행렬(`textures.txt` 의 `mix=`)로 청록·호박색·옅은 흰빛으로 옮기고,
원본의 `glass` 그림(유리 자리가 흰 그림)을 뒤집어 납선의 금속성으로 쓴다.

| 파일 | 원본 | 만든 사람 | 실제 크기 | 손질 (색) | 쓰는 곳 |
| --- | --- | --- | --- | --- | --- |
| `medieval_blocks_03` | Poly Haven [Medieval Blocks 03](https://polyhaven.com/a/medieval_blocks_03) | Rob Tuytel | — | 채도 0.45, 밝기 +0.05 | 벽 아랫단의 애슐러 |
| `white_sandstone_blocks_02` | Poly Haven [White Sandstone Blocks 02](https://polyhaven.com/a/white_sandstone_blocks_02) | Rob Tuytel | — | 채도 0.55, 밝기 −0.03 | 벽 윗단의 잔 블록 |
| `marble_01` | Poly Haven [Marble 01](https://polyhaven.com/a/marble_01) | Rob Tuytel | — | 채도 0.45, 밝기 −0.02 | 다듬은 돌 — 몰딩·벽기둥·창틀·아치·들보·돌길 |
| `travertine014` | ambientCG [Travertine014](https://ambientcg.com/a/Travertine014) | ambientCG | 1.2 m | 채도 0.6, 밝기 +0.04 | 기둥의 몸, 벽 아랫단의 판, 헤드론 |
| `seaworn_stone_tiles` | Poly Haven [Seaworn Stone Tiles](https://polyhaven.com/a/seaworn_stone_tiles) | Dimitrios Savva | — | 채도 0.5 | 벽·기둥의 밑단 |
| `granite_tile` | Poly Haven [Granite Tile](https://polyhaven.com/a/granite_tile) | Charlotte Baglioni | — | 밝기 +0.05 | 바닥의 테두리 띠, 벽감의 안, 쐐기돌, 문 자리의 띠돌 |
| `stone_tiles_02` | Poly Haven [Stone Tiles 02](https://polyhaven.com/a/stone_tiles_02) | Charlotte Baglioni | — | 채도 0.5, 밝기 +0.03 | 바닥의 판석 |
| `marble_mosaic_tiles` | Poly Haven [Marble Mosaic Tiles](https://polyhaven.com/a/marble_mosaic_tiles) | Amal Kumar | — | 채도 0.4, 밝기 +0.04 | 바닥 가운데 무늬 |
| `sandstone_cracks` | Poly Haven [Sandstone Cracks](https://polyhaven.com/a/sandstone_cracks) | Rob Tuytel | — | 채도 0.22, 밝기 −0.04 | 천장의 회벽 |
| `marble014` | ambientCG [Marble014](https://ambientcg.com/a/Marble014) | ambientCG | — | — | (받아 두었다 — 색을 곱해 쓰는 매끈한 돌) |
| `onyx006` | ambientCG [Onyx006](https://ambientcg.com/a/Onyx006) | ambientCG | — | — | 청록 포인트 — 벽·바닥·기둥의 띠, 색유리창의 쐐기돌, 석판의 띠 |
| `onyx007` | ambientCG [Onyx007](https://ambientcg.com/a/Onyx007) | ambientCG | — | 채도 0.85 | 호박색 포인트 — 벽기둥의 마름모, 바닥 무늬의 테 |
| `metal017` | ambientCG [Metal017](https://ambientcg.com/a/Metal017) | ambientCG | — | — (금속성 그림을 같이 쓴다) | 삭은 청동 — 띠, 징, 창살, 등의 팔, 석판의 테 |
| `glass_window_001` | 3dtextures.me [Glass Window 001](https://3dtextures.me/2020/04/29/glass-window-001/) | 3dtextures.me | — | 유리 조각의 색을 다시 입힘, 납선을 금속으로 | 색유리창의 유리 |
| `mossy_rock` | Poly Haven [Mossy Rock](https://polyhaven.com/a/mossy_rock) | Rob Tuytel | 3.0 m | 채도 0.7 | 바닥의 이끼 자리 |
| `sand_01` | Poly Haven [Sand 01](https://polyhaven.com/a/sand_01) | Rob Tuytel | 1.5 m | 채도 0.6 | 구석·벽 밑에 쌓인 모래 |
| `stone_tile_wall` | Poly Haven [Stone Tile Wall](https://polyhaven.com/a/stone_tile_wall) | Charlotte Baglioni | 2.0 m | — | 잠긴 문의 석판, 막음돌의 돌판 |
| `medieval_blocks_05` | Poly Haven [Medieval Blocks 05](https://polyhaven.com/a/medieval_blocks_05) | Rob Tuytel | — | 채도 0.35, 밝기 −0.02 | 막음돌의 막돌 쌓기 |

ambientCG·3dtextures.me 의 재질은 사이트 이름으로 적었다 (만든 사람의 이름은 받을 때 따로 확인하지 않았다 — 표기 의무가 없는 CC0 다).
"실제 크기"가 — 인 것은 인벤토리에 적어 두지 않은 것이다 (타일 크기는 `make-rooms.mjs` 의 재질 표가 정한다).
