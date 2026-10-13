# 작업 폴더 (art-work)

게임에 넣을 에셋을 **만드는 중인 재료**가 여기 있다. 게임은 이 폴더를 읽지 않는다.

| 폴더 | 무엇 | git |
| --- | --- | --- |
| `game/art-src/` | 밖에서 내려받은 원본 (Poly Haven 등) | 제외 |
| `game/art-work/` | 우리가 만드는 재료 — 콘셉트 그림, 생성한 메시, 풀어 둔 원본 | 글만 올린다 (그림·GLB·zip 은 제외) |
| `game/gameplay/content/` | **게임이 실제로 쓰는 것** — 빌드가 읽는 사본 (`.zkmodel`·JPEG·목록) | 올린다 |

재료가 게임에 들어가는 길은 한 방향이다: `art-work/<작업>/concepts` → `generated` → `extracted` → `content/…`.
`content/` 밑에는 콘셉트·원본·작업 메모를 두지 않는다.

## 작업마다

```
<작업>/
  STATUS.md      진행 체크리스트 (도구가 다시 적는다)
  concepts/      콘셉트 그림과 프롬프트 — 메시 생성의 입력
  generated/     Tripo Studio 에서 받은 GLB 와 manifest.json (소품마다 한 폴더)
  extracted/     generated 의 GLB 를 .gltf + 그림으로 푼 것 — 다시 만들 수 있어 git 제외
```

- `shop-room/` — 기억 중개인 옴라의 상점 방 소품 (런타임: `game/gameplay/content/merchant-props/`). 절차는 아래.
- `omra/` — 옴라의 콘셉트 그림과 멀티뷰 입력 (런타임: `game/gameplay/content/creatures/omra/`, 받은 원본 GLB 는 `game/art-src/merchant/`).

## 상점 방 소품 하나를 게임에 넣기

```powershell
# 1. 생성 — Tripo Studio (docs/tripo-studio-api.md). 입력은 concepts/props/<소품>/front.png·back.png 두 장만.
# 2. 받은 GLB 를 generated/ 로 (예산을 넘으면 줄인다)
node game/tools/art/collect-tripo.mjs game/art-work/shop-room <workflows.json> --large <큰 가구 이름,…>
# 3. 풀기
node game/tools/art/extract-glb.mjs game/art-work/shop-room/generated/<소품>/<소품>.glb game/art-work/shop-room/extracted/<소품> <이름>
# 4. content/merchant-props/merchant-props.txt 에 texture·prop 줄, tools/art/prepare-merchant-layout.mjs 에 배치 줄을 더하고
#    (가구 목록은 scenery.cpp·scenery.hpp·CMakeLists.txt·tests 의 이름표와 같아야 한다)
node game/tools/art/prepare.mjs <ffmpeg> --only merchant-props
node game/tools/art/make-rooms.mjs
pnpm game:build
# 5. 뷰어(/game/quality/?scene=6)에서 확인하고 concepts/props/<소품>/DONE 을 둔 뒤
node game/tools/art/shop-status.mjs
```
