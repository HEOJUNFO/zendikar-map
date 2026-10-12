# 기억 중개인의 가구와 직물

다음 원본은 원작자가 제공한 Poly Haven 자료이며 **CC0-1.0**이다. 원본 glTF,
버퍼, 2K PBR 그림을 `source/`에 보존했다. `source/sources.json`에는 원작자,
직접 다운로드 주소, 게시자 MD5, 실제 파일의 SHA256과 크기가 있다.

| 사용 | 원본·원작자 |
| --- | --- |
| 목재 작업 책상 | [Painted Wooden Table](https://polyhaven.com/a/painted_wooden_table) — Kirill Sannikov |
| 조각된 의자 | [Gallinera Chair](https://polyhaven.com/a/gallinera_chair) — Ulan Cabanilla |
| 서가 | [Wooden Bookshelf Worn](https://polyhaven.com/a/wooden_bookshelf_worn) — Ulan Cabanilla |
| 가죽 장정 장부·서적 | [Book Encyclopedia Set 01](https://polyhaven.com/a/book_encyclopedia_set_01) — John Malcolm |
| 촛대와 녹은 초 | [Wooden Candlestick](https://polyhaven.com/a/wooden_candlestick) — Josh Dean |
| 버건디 자카드 직물 | [Quatrefoil Jacquard Fabric](https://polyhaven.com/a/quatrefoil_jacquard_fabric) — colormass 촬영, Rico Cilliers 처리 |

[Poly Haven의 라이선스](https://polyhaven.com/license)는 상업 사용, 변형과 재배포를
허용하는 CC0이다. 공식 [CC0 법문](https://creativecommons.org/publicdomain/zero/1.0/)
사본은 `LICENSE-CC0.txt`에 보존한다.

새 가구를 상자 조합으로 만들지 않는다. 원작자의 실제 메시·UV·법선을 보존하고
접지 원점만 정리한다. 책상 600, 의자 11,560, 서가 10,106, 책 3,392 삼각형은
원본 그대로다. 촛대의 과도하게 세분된 212,992면 원본은 실제 윤곽과 원본 2K 법선
그림을 유지하며 14,998면으로 정리했다. 직물의 드레이프 형상은 이 프로젝트가
작성했으며 원작 직물 사진과 법선·거칠기를 사용한다. 1K 그림을 2K로 확대하지 않는다.
직물 원본은 채널에 따라 2K보다 조금 긴 변이 있어 런타임 배열 규격에 맞춰 정사각형
2K로 정리하고 픽셀 종횡비를 통일한다.

선반 위의 작은 토기는 기존 `props/amphora.zkmodel`을 재사용한다. 원작과 CC0 출처는
기존 [소품 크레딧](../props/CREDITS.md)을 따른다.

재현:

```powershell
node game/tools/art/fetch-merchant-sources.mjs
node game/tools/art/prepare.mjs --only merchant-props
node game/tools/art/make-rooms.mjs
```

`prepare-merchant-cloth.mjs`와 `prepare-merchant-layout.mjs`는 위 준비 단계에서 호출한다.
`layout.json`과 `layout.hpp`는 같은 실제 출력 모델의 치수·배치·가구 부품 충돌 상자에서
만든다. 렌더러와 베이커는 같은 행렬을 써서 가구와 실제 가구 그림자가 일치한다.
책상 무릎 공간을 전체 AABB로 메우지 않는다. 중립 노파는 방 가운데에 북쪽을 보며
앉고, 가구는 노파의 전투·시체 위치와 무관하게 방 원점에 고정된다.

검토용 원본 출력 렌더:

```powershell
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --factory-startup --disable-autoexec --python-exit-code 1 --python game/tools/art/preview-merchant-staging.py -- build/merchant-staging
```

이 검토는 실제 게임 렌더·그림자·GPU 메모리의 생산 품질 뷰어 검증을 대신하지 않는다.
