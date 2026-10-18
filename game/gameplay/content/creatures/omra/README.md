# 옴라 런타임 모델

사용자가 제공한 Tripo GLB 두 개를 상점 NPC의 평상형과 흑화형으로 사용한다. 원본은 `game/art-src/merchant/`에 보존하고, 팩에는 이 폴더의 2K 텍스처와 경량화된 `.zkmodel`만 싣는다.

| 형태 | 원본 GLB | SHA-256 |
| --- | --- | --- |
| 평상형 | `fantasy-character-3d-model.glb` | `DD8A940C6A195F174298381428B4E6EC5DB6D3F5AEA6A88F1702E541ECB90D00` |
| 흑화형 | `undead-female-warrior-3d-model.glb` | `3DDF574ECC722FB5F0F66D2A0A1398A646B85D9C73E1B30BDF05D451972D04E9` |

두 GLB에는 리깅과 애니메이션이 없다. 따라서 런타임 모델은 정적인 T포즈다. 현재 게임의 상점에는 평상형을 표시하고, 흑화형은 `/game/quality/`의 actor 7에서 따로 검토한다. 흑화 전환과 동작 구현은 이 모델 교체에 포함하지 않았다.

재생성: 번들 Blender 3.6에서 `game/tools/art/prepare-omra-model.py -- normal` 및 `-- corrupted`를 실행하고, 번들 Python/Pillow에서 `game/tools/art/prepare-omra-textures.py normal` 및 `corrupted`를 실행한다. 모델 변환은 닫힌 복셀 표면으로 재구성한 뒤 런타임 삼각형 예산으로 줄이고 원본 UV를 다시 투영한다. 결과의 상세 수치와 해시는 `body.json`, `corrupted.json`에 기록한다.
