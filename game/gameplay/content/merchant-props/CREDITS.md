# 상점 방의 가구

이 폴더에는 **게임이 실제로 쓰는 것만** 있다: `merchant-props.txt`(목록), `models/<이름>.zkmodel`, `textures/<이름>*.jpg`,
배치와 충돌 상자 `layout.json`·`layout.hpp`(생성물 — `game/tools/art/prepare-merchant-layout.mjs`).
콘셉트 그림·생성한 GLB·풀어 둔 원본은 작업 폴더 `game/art-work/shop-room/` 에 있다 (`game/art-work/README.md`).

가구는 모두 이 프로젝트의 콘셉트 그림에서 본인 Tripo Studio 계정으로 만든 모델이다 (절차는 `docs/tripo-studio-api.md`).
생성의 입력은 소품마다 `game/art-work/shop-room/concepts/props/<소품>/` 의 `front.png`·`back.png` 두 장이고,
소품마다의 Studio project·workflow·해시는 `game/art-work/shop-room/generated/<소품>/manifest.json` 에 있다.
방의 생김새와 기물은 공식 자료에 없어 이 게임이 지어낸 것이다.

| 이름 | 콘셉트 | 메모 |
| --- | --- | --- |
| `counter` | `main-counter` | 3,999 삼각형. 1K PBR 을 배열 규격(2048²)에 맞춰 늘려 싣는다. Studio project `c69dc315-4793-47ab-8634-8d67cd3ad66c` |

2026-10-13 에 예전 가구(Poly Haven 의 책상·의자·서가·책·촛대·직물, CC0)와 방의 구석 소품·벽등을 모두 걷어 냈다 —
그 원본과 손질 도구는 git 기록에 남아 있다.

재현:

```powershell
node game/tools/art/extract-glb.mjs game/art-work/shop-room/generated/main-counter/main-counter.glb game/art-work/shop-room/extracted/main-counter main_counter
node game/tools/art/prepare.mjs <ffmpeg> --only merchant-props
node game/tools/art/make-rooms.mjs
```
