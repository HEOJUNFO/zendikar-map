# 무기(모델과 텍스처)의 출처

이 폴더의 `*.zkmodel` 과 `textures/*.jpg` 는 **Poly Haven** 의 모델 하나에서 가져와 손질한 것이다.

| 무기 | 원본 | 만든 사람 | 라이선스 |
| --- | --- | --- | --- |
| 권총 (`pistol_*`, `textures/service_pistol.jpg`) | [Service Pistol](https://polyhaven.com/a/service_pistol) — glTF 2.0, 1K 텍스처 | Mateusz Sadek | **CC0 1.0** — https://polyhaven.com/license (2026-10-09 확인) |

받은 원본과 그 md5 는 저장소 밖의 `game/art-src/weapons/INVENTORY.md` 에 있다. 원본 glTF(.bin 1 MB + 텍스처 셋)는 저장소에 두지 않는다 — 다시 만들려면 원본을
`game/art-src/weapons/polyhaven-service-pistol/` 에 받아 두고 `node game/tools/art/prepare.mjs [ffmpeg 경로]` 를 돌린다.

손질 (`weapons.txt` 가 적고 `game/tools/art/prepare.mjs` 가 한다):

- 원본에는 권총 두 자루(손잡이가 나무인 `_a` 와 파란 테이프를 감은 `_b`), 탄창 둘(찬 것·빈 것), 탄알 하나가 나란히 진열돼 있다. 나무 손잡이의 `_a` 만 쓴다.
- 부품 — `game/tools/gltfc.mjs` 가 노드를 떼어 한 틀로 옮긴다: 원본은 총구가 +x 라 y 축으로 돌려 총구가 −z 가 되게 하고, 원점을 손잡이 가운데(원본 좌표 x −0.008, y −0.010)로 옮긴다. 크기는 원본 그대로(실제 치수, m)이고 삼각형은 줄이지 않는다.

  | 파일 | 원본의 노드 | 삼각형 |
  | --- | --- | --- |
  | `pistol_body.zkmodel` | `service_pistol_pistol_a` + `service_pistol_hammer_a` + `service_pistol_trigger_a` | 5,344 |
  | `pistol_slide.zkmodel` | `service_pistol_slide_a` | 2,212 |
  | `pistol_magazine.zkmodel` | `service_pistol_magazine_loaded` — 총 뒤 10 cm 에 진열된 것을 손잡이 속으로 옮겼다 (노드의 자리 이동을 버리면 손잡이 속에 든다) | 9,094 |
  | `pistol_magazine_empty.zkmodel` | `service_pistol_magazine_empty` — 같은 손질 | 1,894 |

- 텍스처 — 색(Diffuse) 그림만 1024×1024 baseline JPEG(4:2:0, `-q:v 4`)으로 다시 누르고, 감마 0.7·대비 1.1 로 어둡게 했다 (밝은 돌바닥 앞에서 강철이 옅은 회색으로 묻혀서). 노멀·ARM 그림은 쓰지 않는다 (엔진에 그 길이 없다).
