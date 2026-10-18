# 옴라 상점 소품 멀티뷰

상위 폴더의 방 콘셉트 두 장을 기준으로 각 물건을 분리했다. 모델링 입력용 PNG는 오브젝트별 폴더에 `front.png`, `back.png`, `left.png`, `right.png`로 저장했다. 정면은 상점의 손님 또는 사용자를 향한 면이고, 좌우는 그 정면을 기준으로 물건 자신의 좌우다. 바닥 러너는 얇은 평면이라 네 방향 모두 윗면을 보는 45도 카메라다.

| 분류 | 오브젝트 폴더 |
| --- | --- |
| 주요 가구 | `main-counter`, `merchant-chair`, `examination-table`, `crystal-display-table`, `low-stool` |
| 방 구조와 장식 | `merchant-niche-arch`, `wall-shelf-alcove`, `kor-window-module`, `rune-pillar`, `ceiling-rib`, `indigo-floor-runner`, `hanging-banner`, `wall-sconce` |
| 작은 소품 | `amber-crystal-lamp`, `memory-crystal`, `ledger-books`, `bronze-bowl`, `ceramic-urn`, `storage-chest`, `supply-barrel` |
| 카드(사용자 중단 지점 보존) | `memory-card-single`, `memory-card-deck`, `memory-card-spread`는 네 방향이 있고, `memory-card-box`는 정면만 있다. 카드 생성은 더 진행하지 않는다. |

20개 비카드 오브젝트는 각 4장, 카드 결과는 현재 13장이다. 모든 파일은 RGBA PNG이며 모서리의 배경은 투명하다. 생성된 네 방향은 동일한 디자인을 따르지만 사진 측량/CAD처럼 정확히 같은 메시는 아니다. 3D화 후 상판·다리·문양 위치와 창/벽감의 실제 깊이를 확인한다. 카드는 데스크와 합치지 않고 독립 메시로 배치할 수 있게 분리했다.

이 폴더는 콘셉트/모델링 참조이며 게임의 현재 런타임 방 에셋은 바꾸지 않았다.
