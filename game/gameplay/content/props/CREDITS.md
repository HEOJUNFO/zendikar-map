# 소품(모델과 텍스처)의 출처

이 폴더의 `*.zkmodel` 과 `textures/*.jpg` 는 모두 **Poly Haven** (https://polyhaven.com) 의 모델(glTF 2.0, 1K 텍스처)에서 가져와 손질한 것이다.
라이선스는 모두 **CC0 1.0** — https://polyhaven.com/license (2026-10-09 확인). 받은 원본과 그 md5 는 저장소 밖의 `game/art-src/INVENTORY.md` 에 있다.

손질은 `game/tools/art/prepare.mjs` 가 한 번에 한다:
- 모델 — `game/tools/gltfc.mjs` 가 glTF 의 노드를 떼어(여럿이면 합쳐 — `props.txt` 의 노드 칸에 `*` 를 적은 것은 메시가 있는 노드 모두) 세계 좌표로 옮기고,
  삼각형이 목표보다 많으면 격자 정점 군집화로 줄이고, 배율을 곱해 밑면을 y 0 에 놓는다 (`props.txt` 의 목표 삼각형·배율).
  반투명 재질의 면(등의 유리와 불꽃)은 뺐다 — 불빛은 방 메시의 빛나는 도형과 구운 점광원이 낸다.
  원본 glTF 는 저장소에 두지 않는다 — 줄인 결과만 둔다. 다시 만들려면 원본을 `game/art-src` 에 받아 두고 prepare 를 돌린다.
- 텍스처 — 512×512 baseline JPEG: 색(`<이름>.jpg` — `props.txt` 의 `eq=…` 만큼 감마·채도를 고치고, ARM 의 AO 가 있으면 `AO × 0.6 + 0.4` 를 곱한다),
  법선의 xy 와 거칠기(`<이름>.nar.jpg`), 금속이 섞인 것은 금속성(`<이름>.metal.jpg` — ARM 의 파랑).
- 잎의 잘라 낼 모양(`*.mask.jpg`) — 원본의 색 그림(JPG)에는 알파가 없어, 같은 묶음의 ARM 그림에서 잎 자리(빨강 > 128 이고 초록 < 245)를 가리거나(`fern_02`·`shrub_03`),
  바탕이 검게 칠해진 묶음은 색 그림의 밝기에서 가린다(`nettle_plant`·`weed_plant_02`).

| 소품 (`props.txt`) | 원본 (Poly Haven) · 노드 | 만든 사람 | 삼각형 (원본 → 손질) | 배율 |
| --- | --- | --- | --- | --- |
| `rock_big_a` · `rock_big_b` · `rock_big_c` | [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) · rock01 · rock04 · rock03 | Kless Gyzen | 11,000 · 10,589 · 5,000 → 1,500 | 1.0 |
| `rock_mid_a` · `rock_mid_b` · `rock_mid_c` | [Rock Moss Set 02](https://polyhaven.com/a/rock_moss_set_02) · rock13 · rock12 · rock08 | Kless Gyzen | 7,928 · 7,999 · 8,000 → 1,500 | 1.0 |
| `boulder` | [Namaqualand Boulder 05](https://polyhaven.com/a/namaqualand_boulder_05) | Jenelle van Heerden, Dario Barresi | 89,618 → 1,500 | 1.6 |
| `stone_a` · `stone_b` · `stone_c` | [Namaqualand Stones 01](https://polyhaven.com/a/namaqualand_stones_01) · b · d · e | Greg Zaal, Jenelle van Heerden | 9,086 · 5,864 · 11,160 → 500 | 4.0 · 5.0 · 4.0 |
| `fern_a` · `fern_b` · `fern_c` | [Fern 02](https://polyhaven.com/a/fern_02) · b · c · a | Rob Tuytel, Rico Cilliers | 2,384 · 2,248 · 784 (그대로) | 1.6 · 1.6 · 1.8 |
| `shrub_a` · `shrub_b` | [Shrub 03](https://polyhaven.com/a/shrub_03) · a · b | Rico Cilliers | 2,385 · 2,134 (그대로) | 2.2 |
| `lion_head` | [Lion Head](https://polyhaven.com/a/lion_head) | Tina | 47,214 → 2,999 | 2.4 |
| `bull_head` | [Bull Head](https://polyhaven.com/a/bull_head) | Tina | 17,148 → 3,000 | 2.4 |
| `bust` | [Marble Bust 01](https://polyhaven.com/a/marble_bust_01) | Rico Cilliers | 17,456 → 2,500 | 2.2 |
| `fire_pit` | [Stone Fire Pit](https://polyhaven.com/a/stone_fire_pit) | Sebastian Platen | 3,887 → 1,800 | 1.0 |
| `brass_lantern` | [Brass Diya Lantern](https://polyhaven.com/a/brass_diya_lantern) · 모든 노드 (유리·불꽃 빼고) | Bhargav Kubal | 12,502 → 2,436 | 3.0 |
| `wood_lantern` | [Wooden Lantern 01](https://polyhaven.com/a/wooden_lantern_01) · 모든 노드 (유리 빼고) | James Ray Cock | 8,273 → 1,963 | 1.6 |
| `amphora` | [Antique Ceramic Vase 01](https://polyhaven.com/a/antique_ceramic_vase_01) | James Ray Cock | 9,408 → 1,400 | 2.4 |
| `vase_a` · `vase_b` · `vase_c` | [Ceramic Vase 01](https://polyhaven.com/a/ceramic_vase_01) · [02](https://polyhaven.com/a/ceramic_vase_02) · [04](https://polyhaven.com/a/ceramic_vase_04) | James Ray Cock | 10,296 · 11,128 · 9,000 → 1,200 | 2.2 · 2.4 · 2.4 |
| `brass_vase_a` · `brass_vase_b` | [Brass Vase 01](https://polyhaven.com/a/brass_vase_01) · [02](https://polyhaven.com/a/brass_vase_02) | Rico Cilliers | 21,440 → 1,434 · 6,890 → 1,198 | 1.7 · 1.9 |
| `brass_pot` | [Brass Pot 01](https://polyhaven.com/a/brass_pot_01) | Rico Cilliers | 3,760 → 1,000 | 2.2 |
| `jug` | [Jug 01](https://polyhaven.com/a/jug_01) | Kuutti Siitonen | 5,770 → 999 | 2.0 |
| `clay_pot` | [Planter Pot Clay](https://polyhaven.com/a/planter_pot_clay) | Amal Kumar | 3,080 → 800 | 2.4 |
| `rubble_a` | [Rock 07](https://polyhaven.com/a/rock_07) | Jenelle van Heerden | 14,844 → 900 | 3.6 |
| `rubble_b` | [Rock 09](https://polyhaven.com/a/rock_09) | Jenelle van Heerden | 12,416 → 699 | 6.0 |
| `chest` | [Treasure Chest](https://polyhaven.com/a/treasure_chest) · 모든 노드 | Rico Cilliers | 103,330 → 3,422 | 1.25 |
| `barrel` | [Wine Barrel 01](https://polyhaven.com/a/wine_barrel_01) · 모든 노드 | James Ray Cock | 10,820 → 2,200 | 1.3 |
| `crate` | [Wooden Crate 02](https://polyhaven.com/a/wooden_crate_02) · 모든 노드 | James Ray Cock, Jurita Burger | 5,176 → 1,198 | 1.4 |
| `nettle_a` · `nettle_b` | [Nettle Plant](https://polyhaven.com/a/nettle_plant) · tall_a · medium_a | Rob Tuytel, Rico Cilliers | 6,984 → 5,990 · 5,896 (그대로) | 3.2 |
| `weed_a` · `weed_b` | [Weed Plant 02](https://polyhaven.com/a/weed_plant_02) · a · c | Rob Tuytel, Rico Cilliers | 2,967 · 1,766 (그대로) | 3.0 |
| `root` | [Single Root](https://polyhaven.com/a/single_root) | Jenelle van Heerden | 61,027 → 2,498 | 1.5 |
| `root_cluster` | [Root Cluster 01](https://polyhaven.com/a/root_cluster_01) | Jenelle van Heerden, Rico Cilliers | 225,261 → 5,999 | 0.8 |

텍스처(`textures/<이름>.jpg` 와 `.nar.jpg`)는 위 묶음마다 하나씩이고 이름은 Poly Haven 의 에셋 이름이다. 색을 고친 것: `rock_moss_set_01`·`rock_moss_set_02`(감마 1.45, 채도 0.6),
`namaqualand_boulder_05`(감마 1.15, 채도 0.55), `namaqualand_stones_01`(채도 0.45), `lion_head`·`bull_head`·`stone_fire_pit`(채도 0.6), `marble_bust_01`·`planter_pot_clay`(채도 0.7),
`rock_07`·`rock_09`(감마 1.2, 채도 0.5). 금속성이 딸린 것: `brass_diya_lantern`·`wooden_lantern_01`·`brass_vase_01`·`brass_vase_02`·`brass_pot_01`·`treasure_chest`·`wine_barrel_01`.
잎의 모양이 딸린 것: `fern_02`·`shrub_03`·`nettle_plant`·`weed_plant_02`.

배율은 실물보다 크다 — 높이 9 m 의 홀에서 눈에 띄게 항아리·조각을 두 배쯤 키웠다 (하늘거주지의 큰 기물로 본다). 사자·황소 머리는 벽감 위의 짐승 머리 조각으로 쓴다 (펠리다·허다를 닮은 짐승으로 본다 — 이 게임이 지어낸 쓰임이다).
받아 두고 쓰지 않은 것: `gothic_statue`(고딕 양식), `horse_head`, `kite_shield`·`wooden_barrels_01`(텍스처가 여럿), `brass_candleholders`·`lantern_chandelier_01`(glTF 확장을 써서 gltfc 가 읽지 않는다),
`wooden_candlestick`·`periwinkle_plant`·`shrub_sorrel_01`·`dry_branches_medium_01`·`boulder_01`·`stone_01`, 문짝들(`large_castle_door`·`large_iron_gate` — 문은 포털이다).
