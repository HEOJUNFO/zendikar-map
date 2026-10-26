기존 원칙은 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)(MIT), [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)(MIT), [obra/superpowers](https://github.com/obra/superpowers)(MIT), [mattpocock/skills](https://github.com/mattpocock/skills)(MIT), [pbakaus/impeccable](https://github.com/pbakaus/impeccable)(Apache-2.0)을 이 프로젝트에 맞게 재구성했다. 사용자 지시와 상위 지침이 우선한다.

## 목표와 중단

- 시작할 때 요청 범위·완료 조건·대표 검증을 짧게 고정한다. 여러 단계면 `단계 → 검증`으로 적는다. 이미 합의한 목표를 다시 설계하지 않는다.
- 사용자에게 전체 버전이 필요하면 전체 목표를 유지하고 구현 단위만 나눈다. 최소판으로 축소하거나 확장 여부를 다시 묻지 않는다.
- 문서의 장래 계획과 현재 요청을 구분한다. 새 발견이 합의된 목표에 필수면 초기 완료 목록에 연결하고, 별도 개선이면 기록만 한다. 끝난 단계에 관련 없는 다음 원자를 계속 붙이지 않는다.
- 사용자에게 중단·일시정지 지시를 받으면 에이전트와 자신이 시작한 실행도 멈추고 변경·증거를 보존한다. 중단한 실행은 완료로 집계하지 않는다. 사용자 Vite와 다른 작업의 프로세스는 건드리지 않는다.
- 기본값으로 해결할 수 있는 선택은 진행한다. 필요한 정보만 묻고 독립 작업을 계속한다. 커밋·푸시는 요청한 경우만 한다.

## 실행 속도: 같은 품질로 최소 5배 목표

- 기준은 같은 범위·완료 조건의 벽시계 시간이다. 목표는 `새 시간 ≤ 기준 시간 / 5`다. 작업 시작/종료·빌드/검사 횟수·재작업 사유를 간단히 기록해 비교한다. 검사 생략·품질 저하·범위 축소를 속도 향상으로 계산하지 않는다. 실측 미달은 숨기지 않고 남은 병목을 보고한다.
- 반복 대기·중복 검사·긴 무진행 판단을 먼저 없앤다. 스레드 수나 모델 설정부터 바꾸지 않는다. 기존 실행 제약은 유지한다.
- 소규모 변경은 영향 코드와 호출부를 읽고 바로 편집/재현한다. 이미 읽은 전체 문서·로그·저장소 지도를 다시 훑지 않는다. 조사 5분 동안 새 근거가 없으면 관측 지점을 보강하거나 다른 가설로 전환한다.
- 같은 선택을 장시간 재검토하지 않는다. 두 가지 선택의 결과가 같으면 기존 구현·표준 기능 중 작은 것을 택한다. 판단은 필요한 코드·재현으로 확인한다.
- 독립 검색·읽기·가벼운 검사는 한 호출에서 병렬 실행한다. 출력은 필요한 행·오류·합계만 읽는다. 큰 생성 파일/로그 전체를 컨텍스트에 넣지 않는다.
- 에이전트는 사용자가 허용했거나 적용 지침이 요구할 때만 쓴다. 맡길 때 출력·파일 소유권·완료 조건을 정하고 전체 맥락을 불필요하게 복제하지 않는다. 성공 결과는 diff와 실행 증거로 통합한다.
- 하나의 통합 묶음을 끝내고 다음 묶음을 연다. 작업 중간에 반복 인계 문서를 쓰거나 무관한 설계·검증 작업을 병행하지 않는다.
- 진행 보고는 완료·현재 병목·남은 작업을 구분한다. 60초 이상 긴 작업에는 의미 있는 상황을 알리고, 새 위험으로 예상 범위/시간이 커지면 즉시 설명한다. 근거 없는 종료 시각을 약속하지 않는다.

## 빌드와 검증을 다시 쓰는 기준

- 검증 증거는 `관련 소스/헤더·fixture·빌드 flags·실제 실행 artifact·환경`에 묶는다. 이 입력이 같은 성공 결과는 그대로 유효하다. 새 답변·다른 파일 변경·에이전트 작업이라는 이유만으로 재실행하지 않는다.
- 명령·종료 코드·로그·artifact 경로/hash·적용 범위를 한 번 기록한다. 에이전트가 원시 증거를 제공하면 읽고 확인한다. 성공 주장만 믿거나, 반대로 같은 검사를 이유 없이 다시 돌리지 않는다.
- 작은 수정은 영향 TU/공개 probe/해당 브라우저 시나리오부터 확인한다. 독립 전체 빌드·생산 포장·전체 E2E는 안정된 소스의 최종 통합에서 한 번 수행한다. 새 실패나 관련 입력 변경이 있을 때만 해당 범위를 다시 검증한다.
- 공통 헤더/ABI 변경은 함께 모으고 의존 대상들을 일관되게 다시 만든다. 옛 객체와 새 헤더를 섞지 않는다. 빌드 완료 후 소스가 안정됐는지 확인하고 최종 검사를 시작한다.
- 공유 `.wasm-build`/생성 출력에는 한 빌드 작성자만 둔다. 빌드가 JS/WASM을 교체하는 동안 그 파일을 읽는 브라우저·서버 검사를 시작하지 않는다. 독립 probe는 자기 출력 디렉터리를 쓴다.
- 실제 소비하는 경로부터 확인한다: 생산 release/public 파일, `current-game-test`, `session-runtime-test`를 구별한다. 진단용으로 다른 바이너리를 만들고 실제 사용됐다고 가정하지 않는다.
- 진단마다 전체 생산 빌드/자산 포장을 반복하지 않는다. 기존 집중 probe와 안전한 테스트 전용 경로를 쓴다. 최종 생산 빌드의 무결성/정책 검증은 유지한다.

## 구현

- 수정 지점과 실제 호출 흐름을 이해한다. 기존 헬퍼·표준 라이브러리·플랫폼·설치된 의존성 순으로 재사용하고 필요한 최소 코드를 쓴다.
- 원인을 공유 지점에서 고친다. 호출부마다 가드를 늘리거나 게임/맵별 예외로 감추지 않는다. 요청과 무관한 서식·이름·데드 코드를 고치지 않는다.
- 요청하지 않은 추상화, 나중을 위한 골격, 중복 상태, 불필요한 복사·정렬·질의를 만들지 않는다. 내 변경으로 죽은 import·상태·호환 계약은 함께 제거한다.
- 신뢰 경계의 검증, 데이터 손실 방지, 보안, 접근성, 명시된 기능과 원래 품질은 줄이지 않는다. 독립 golden을 구현 결과에 맞춰 바꾸지 않는다.
- 의도적 단순화에는 `ceiling:`으로 한계와 실제 교체 조건을 적는다. 사용 중인 자산·다른 작업의 변경은 의존 관계를 확인하고 보존한다.

## 디버깅

- 먼저 사람이 개입하지 않는 짧은 재현을 만든다. 기존 Node/공개 C++ probe/브라우저 경로를 쓰고 새 테스트 프레임워크를 추가하지 않는다.
- 느린 E2E 전에 fixture의 manifest·콜백 서명·포커스·ready 이벤트·실제 SDK 경로를 확인한다. fixture/교체 race/누락된 관측과 제품 오류를 구분한다.
- 첫 깨진 경계를 찾으면 이후 전체 흐름 검사를 멈추고 그 경계의 원인을 고친다. 동일 실패/timeout을 관측 보강 없이 두 번 넘게 반복하지 않는다.
- 여러 계층을 지나는 오류는 한 진단에서 필요한 입력/출력을 함께 기록한다. 예: 요청→적용→GPU 저장→복원→화면 제출. 경계 하나씩 로그를 추가하며 매번 전체 빌드하지 않는다.
- 가설은 반증 가능하게 세우고 한 번에 원인 변수 하나를 바꾼다. 로그/스택은 끝까지 확인한다. 세 번의 수정이 실패하면 같은 접근의 네 번째 수정을 멈추고 구조를 재검토해 알린다.
- 준비/완료는 실제 publication·completion 이벤트로 기다린다. 진단 무신호는 짧은 명시적 timeout으로 실패시킨다. 대기 시간을 늘려 결함을 숨기지 않는다.
- 비결정적 문제만 근거 있는 반복/부하로 확인한다. 임시 계측은 고유 `[DEBUG-...]` 태그를 쓰고 해당 작업을 닫기 전에 제거한다.

## 테스트와 완료

- 실제 오류는 공개 호출 경로의 red→green을 남긴다. 독립 리터럴·명세·손으로 계산한 기대를 쓴다. private 우회, 가짜 readiness, 내부 협력자만 검사하는 모킹은 근거가 아니다.
- 분기·파서·보안·수명처럼 중요한 로직은 적절한 회귀를 남긴다. 자명한 한 줄, 문서·지침 편집에는 구현을 그대로 따라가는 테스트나 제품 전체 빌드를 만들지 않는다.
- 아래는 변경 영향에 맞춘 최종 검증 지도다. 모든 편집마다 전부 실행하는 체크리스트가 아니다. 필수 범위를 빠뜨리지 않고, 이미 유효한 증거와 새 실행을 구분한다.

| 변경 영역 | 최종 대표 검증 |
| --- | --- |
| `packages/*` C++ | `build:cpp-packages`, `audit:architecture` |
| 클라이언트·서버 WASM | `wasm:build`의 해당 제품/일관된 통합 |
| 프로토콜·세션·네트워크 | `test:session-runtime`, `audit:client-network` |
| 로비 서버 | `test:multiplayer` |
| 봇 모델 응답 | `test:bot-model` |
| 클라이언트 UI | 해당 시나리오 및 최종 `test:runtime-ui:browser` |
| 에셋·카탈로그 | `audit:assets` |
| 리깅 도구 | `rig:test` |

- 완료 주장은 현재 관련 입력에 유효한 실제 실행 증거로 한다. 린트/빌드를 실제 동작 검증으로 바꾸어 말하지 않는다. 실행하지 못한 검증·남은 목표를 명시한다.
- 최종 보고는 결과·검증·남은 한계 순으로 간결하게 쓴다. 생략은 `생략: X — 필요 조건: Y`로 세 줄 이내에 적는다.

## 스킬과 문서

- Tripo는 본인 Studio 계정의 웹 API를 직접 쓴다 (사용자 위임 2026-10-17, 2026-10-26 쿠키 방식): 사용자가 터미널 마스킹 입력에 `ory_kratos_session` 쿠키를 한 번 넣으면 스크립트가 JWT를 실제 `exp` 1분 전마다 스스로 재발급한다. 인증 입력·갱신 승인을 반복해서 묻지 않는다. 쿠키·토큰 원문을 답변·로그·인수·환경 변수·저장소에 남기지 않고, 인증 갱신 때문에 유료 작업을 재제출하지 않는다. 파일·명령·현재 cutoff는 `docs/tripo-studio-api.md`를 읽는다.

- 스킬은 현재 산출물·플랫폼에 실제 도움이 될 때만 적용한다. Vite 실행이나 `process.env` 같은 문자열만으로 Vercel 배포·환경 작업을 추가하지 않는다.
- 선택한 스킬의 필요한 경로만 읽고 같은 내용은 다시 읽지 않는다. task 범위를 넓히는 자동 연쇄는 실제 필요를 확인한다. 스킬의 중단 조건도 적용한다.
- 스킬과 이 파일이 검사 의무를 중복 기술하면 같은 유효한 실행 하나로 충족한다. 현재 요청과 직접 충돌하는 스킬 지침보다 사용자 지시를 따른다.
- 문서는 API/계약 변화와 실제 검증 cutoff를 반영한다. 장래 약속을 구현됐다고 쓰거나, 그 약속을 현재 요청에 설명 없이 추가하지 않는다.

## 세계관·게임 아트

- 카드·증강·캐릭터·무기·배경을 설계하거나 이미지를 생성하기 전에 `src/data/sagas.ts`, `game/gameplay/content/campaign.json`, `docs/lore.md`, `docs/game-art-lore.md`, `game/gameplay/content/README.md`의 관련 부분을 읽는다. **게임은 1막부터 개발한다.** 1막은 지도 saga 1의 ZEN→WWK→ROE(2009–10) 순서이며 시작은 ZEN의 타짐 에메리아 하층·주변 폐허 원정이다. 지도의 최신 사가를 게임의 시작 막으로 선택하지 않는다. 지도에 saga 2(BFZ/OGW)가 있어도 우리는 BFZ 전쟁부터 만들지 않는다. ZNR은 미구현 saga 3이다. `docs/lore.md`의 ZNR 지형 참고를 현재 시점으로 오독하지 않는다. ZEN 시작부터 엘드라지 침공군·BFZ 바다 관문 탈환전·ZNR 하늘거주지 재부상·후대 생물·Echoverse를 섞지 않는다.
- 지도 연결은 설명문으로 주장하지 않고 `node --test game/tests/campaign.test.mjs`로 실제 사가·페이즈·카드 ID를 검증한다. 신규 시대는 지도 데이터가 생기기 전 구현된 것으로 표시하지 않는다. 잘못된 시대의 고품질 자산도 이름만 바꿔 정당화하지 않는다.
- 공식 설정, 프로젝트가 정한 게임 연출, 근거 없는 추정을 구분한다. 재미있는 증강의 승인은 세계관 변경의 승인이 아니다. 창작·기억·환영이라는 꼬리표로 명백히 잘못 그린 기원·재질·기술을 정당화하지 않는다.
- 헤드론은 나히리·우진이 만든 룬 새긴 돌이며, 그보다 앞선 코르 하늘거주지의 수정 엔진·일반 보석·범용 로봇 부품과 혼동하지 않는다. 하늘거주지 파편과 일시적인 공명 복제품을 새로운 정사 하늘거주지로 쓰지 않는다.
- 기존 권총 모델을 근거로 코르 제국의 근대 총기·금속 탄약·산업 로봇 문명을 확장하지 않는다. 신규 무기 연출은 기존 문서의 게임용 공명 발사기 범위에서 검토한다. 원본 사용자 자산은 보존한다.
- 신박한 증강은 유물·국소 주문·일시적 정령·기억 잔상의 작용으로 설계하되 공식 자연법칙·종족 특성으로 단정하지 않는다. 반박자 대시와 더블점프는 유지하며, 플레이어에게 새 체력·골드 비용이나 강제 이동 패널티를 붙이지 않는다.
- 생성 전 공식 근거·창작 범위·그리면 안 되는 요소를 프롬프트에 넣고, 생성 후 실제 픽셀을 확인한다. 프롬프트 문구만으로 통과시키지 않는다. 문제가 있는 이미지는 수정 전 소비 경로에 연결하지 않고, 이유·원본 해시·수정 방향을 해당 자산의 검토표에 남긴다.
- 카드의 구체적인 생물은 공식 카드/가이드의 이름과 외형 참고를 먼저 확보한다. AI가 만든 이전 콘셉트나 사용자 모델의 존재 자체를 정사 근거로 삼지 않는다. 근거 없는 인간형 돌 괴물·기계 게·얼굴 달린 동전 종족을 만들지 않는다. 신박한 증강은 확인된 생물에 작용하는 주문으로 표현하고, 인간형 골렘으로 모든 적을 대체하지 않는다.
- 현재 카드 이미지 검토와 사용 보류 목록은 `docs/game-art-lore.md` 및 `game/gameplay/content/images/cards/lore-review.json`을 따른다. 이 검토표는 이미지 리소스 검토이며 신규 전투 효과의 구현 완료 증거가 아니다.

## 성능 최적화

- 실제 병목을 측정하고 관련 공식 구현/문서·연구를 필요한 범위만 조사한다. 문구 수정이나 단순 정리에 광범위한 최신 연구 탐색을 붙이지 않는다.
- 같은 입력·환경의 전후 시간/할당/메모리와 기능·화질·음질·규칙을 비교한다. 일부 연산 개선을 전체 FPS/작업 속도 개선으로 표현하지 않는다.

## UI

- 기존 색·간격·글꼴과 의미 있는 `<button>`/`<a>`를 쓴다. 레이블·키보드 순서·포커스 표시를 유지한다. 상태는 색만으로 표현하지 않고 본문 대비4.5:1을 지킨다.
- 숫자는 `tabular-nums`를 쓴다. 컨트롤의 hover/focus/disabled/loading/error/빈 상태와 복구 방법을 제공한다.
- 피드백100–150ms, 상태 전환150–300ms, 오버레이300–500ms를 기본으로 하며 reduced motion과 비표시 애니메이션 중지를 지킨다. 레이아웃 속성 애니메이션·상시 will-change·장식용 그라디언트/블러/카드 중첩/이모지 아이콘은 쓰지 않는다.

## 정리 기능

- 현재 요구사항·실제 실행 진입점에서 폴백·레거시·중복·데드 코드, 비효율, 불필요한 상태/복사/정렬/질의를 감사한다. 교체로 남은 공개 헤더·직렬화·빌드 목록·fixture·진단·문서도 함께 정리한다.
- 데이터 전체 복사는 금지하며 필요한 범위만 증분 처리한다. 관측용 raw DTO의 작은 명시적 전달과 전체 상태 복제를 구분한다.
- 상태 변화·준비·작업 완료 감지용 timer polling은 금지한다. `setTimeout(0)` 재귀, `setInterval`, 임의 지연 재시도, RAF/마이크로태스크 반복 확인도 포함한다. 실제 이벤트/명시적 상태 전이로 후속 작업을 한 번 구동한다.
- 게임 시뮬레이션 시간 진행과 준비 재시도를 구분한다. 한계가 해소된 `ceiling:`과 오래된 소비 경로는 제거하고 재유입 방지 감사는 유지한다.

## 게임 에셋 렌더링·품질 뷰어

- 기존 진입점은 `/game/quality/`다. 루트에서 `pnpm dev`로 Vite를 켠 뒤 연다. 포트가 다른 프로젝트에 사용 중이면 그 서버를 건드리지 말고 `pnpm dev --host 127.0.0.1 --port 5181 --strictPort`처럼 빈 포트를 지정한다. 실제 검증 주소: `http://127.0.0.1:5181/game/quality/` (2026-10-12).
- 실제 게임의 F7은 고정 시드의 4종 전투 검토 경로다. `node game/tools/perf.mjs --base http://127.0.0.1:5181 --rig-combat --seconds 2 --sizes 1280x720`은 실제 공개 F7/F3 입력과 상태 발행으로 네 종의 성능을 잰다. 적 0마리 또는 이미 종료된 판의 창을 전투 성능으로 통과시키지 않는다.
- 실제 게임의 WebGPU·PBR·전투 효과 경로를 사용한다. 1막 몹·보스 5종은 실제 골격·8영향 스킨과 29개 DCC 클립을 사용한다. 옴라 두 형태는 정적 메시다. 소비 파일은 `public/wasm/game-client.wasm`, `public/wasm/game-assets.zkpack`, `game/host/generated/`다. 소스는 `gameplay/content/creatures/act1/runtime`이며, 실제 구현·검증과 AAA 품질 승인은 구분한다 (`docs/game-animation-quality.md`). 이 파일이 없거나 관련 소스/에셋을 바꿨을 때만 `pnpm game:build`로 일관되게 재생성한다. 캡처만 하려고 전체 빌드를 반복하지 않는다. WebGPU 가능한 Chrome/Edge와 개발 서버가 필요하며, 현재 `startEngine`은 production/`vite preview`를 거부한다.
- UI에서 방·대상·동작·격노·조명을 선택한다. 드래그/방향키로 회전, 휠/+/-/거리 슬라이더로 확대, 프레임 슬라이더로 60Hz 시각을 고정한다. `PNG 저장`, `클립 녹화`, `상태 JSON 저장`을 지원한다. 같은 프레임의 정면·측면·후면·위쪽을 비교할 때는 먼저 일시정지하고 조명과 카메라만 바꾼다. `정면 맞춤`은 yaw=π, pitch=0.15다.

| `actor` | 대상 | 권장 시작 거리 (m) |
| --- | --- | --- |
| 0 | 방만 보기 | 18 |
| 1 | 강 보아 | 3.2 |
| 2 | 살아있는 해일 | 3.2 |
| 3 | 하늘 폐허 드레이크 | 3.8 |
| 4 | 팀버모 유충 | 3.2 |
| 5 | 탁류 정령 보스 | 10 |
| 6 | 기억 중개인 옴라 (사용자 제공 평상형) | 5.5 (`scene: 6`) |
| 7 | 흑화한 옴라 (사용자 제공 흑화형) | 5.5 (`scene: 6`) |

- `scene`: 0 시작 방, 1 정사각 홀, 2 긴 홀, 3 ㄱ자, 4 십자, 5 T자, 6 옴라의 상점, 7 대상만 보기(방·소품·배경 제거, 중립 조명, 드레이크 비행 높이 오프셋 제거). `action`: 0 대기, 1 이동, 2 공격, 3 사망, 4 첫 보스 패턴, 5 충격파, 6 돌진, 7 파편 비, 8 휩쓸기, 9 피격, 10 180° 방향 전환 검토(1–5; 0–8틱, 중간 4틱). 4–8은 actor=5만 허용한다. actor=6/7은 0–1만 허용하고 메시 자세는 같다. 방만 보기는 action=0이다. 1–5는 실제 스키닝 클립을 재생한다. `.state.pose`는 클립 번호, `.state.blend`는 해당 클립 틱, `.state.bones`는 실제 본 수이며 `.settled`는 사망 클립 종료 여부다. 보스 사체는 렌더와 같은 실제 직전 포즈/가중치를 보존한 스킨 표면을 CPU에서 계산해 실제 삼각형으로 명중을 판정한다. 큰 경계 상자는 후보만 찾으며 명중으로 세지 않는다. `.settled`는 실제 사망 클립 종료다. 게임 상점 NPC는 평상형이고 흑화형은 현재 뷰어 선택만 가능하다.
- 자동화 공개 API는 `window.qualityViewer.configure({...})`, `.state`, `.canvas`다 (`game/host/quality.ts`). 지정 가능한 필드는 `scene, actor, action, tick, playing, neutral, enraged, yaw, pitch, distance`. URL도 `action`, `tick`, `playing`을 복원하며, 예를 들어 `?scene=7&actor=5&action=10&tick=4&playing=false`로 회전 중간 자세를 고정할 수 있다. yaw/pitch는 라디안, distance는 1–65m, pitch는 -1.3–1.3, tick은 0–3600이다. `tick` 생략은 현재 시각 유지 요청이지만 대상/동작/방/격노를 바꾸면 재생 초기화가 일어나므로 재현 캡처에는 tick을 명시한다. 중립 조명은 `neutral: true`다. 카메라 예: 정면 `Math.PI`, 사선 `2.55`, 측면 `Math.PI / 2`, 후면 `0`, 높은 시점 `pitch: 0.6`.
- 준비와 명령 적용은 `qualitystate` 이벤트의 실제 제출 프레임을 기다린다. `configure()`의 true는 명령 수락이며 화면 제출 완료가 아니다. 이벤트를 명령보다 먼저 구독하고, `ready && !failed`, 이전보다 큰 `revision`, 요청한 actor/action/tick/playing 등을 확인한 뒤 캡처한다. 기존 상태도 즉시 확인하고, 무신호는 명시적 timeout으로 실패시킨다. 임의 sleep·timer/RAF polling으로 준비를 추측하지 않는다. 콘솔 예시:

```js
// 준비 완료 상태에서 실행. wait는 이벤트만 사용하며 timeout은 실패 한계다.
const wait = (predicate, timeout = 15000) => new Promise((resolve, reject) => {
  let timer;
  const receive = ({ detail }) => {
    if (!predicate(detail)) return;
    clearTimeout(timer);
    window.removeEventListener('qualitystate', receive);
    resolve(detail);
  };
  window.addEventListener('qualitystate', receive);
  timer = setTimeout(() => {
    window.removeEventListener('qualitystate', receive);
    reject(new Error('qualitystate 제출 프레임 없음'));
  }, timeout);
  if (window.qualityViewer?.state) receive({ detail: window.qualityViewer.state });
});
await wait(s => s.ready && !s.failed);
const next = { scene: 0, actor: 5, action: 0, tick: 0, playing: false,
  neutral: true, enraged: false, yaw: 2.55, pitch: 0.12, distance: 11 };
const before = window.qualityViewer.state.revision;
const submitted = wait(s => s.ready && !s.failed && s.revision > before &&
  ['scene', 'actor', 'action', 'tick', 'playing', 'neutral', 'enraged'].every(k => s[k] === next[k]));
if (!await window.qualityViewer.configure(next)) throw new Error('뷰어 설정 거부');
await submitted; // 이제 PNG 저장 또는 브라우저의 canvas 영역 스크린샷
```

- 브라우저 자동화의 기존 Chrome 실행기는 `scripts/qa/chrome.mjs`의 `launchChrome`이다. 새 Chrome 프로세스를 직접 spawn하지 말고 이 실행기를 쓰며 `finally`에서 `chrome.close()`한다. `scripts/qa/shots.mjs`는 지도용 고정 지연 캡처라 이 뷰어의 readiness 검증에는 그대로 쓰지 않는다. 기존 공개 검증은 뷰어 페이지에서 `await (await import('/game/tests/quality-viewer.browser.mjs')).runQualityViewerChecks()`다. 7개 방·분리 뷰, 7개 대상의 지원 동작, 보스 패턴, 재생/일시정지, 조명·카메라 변경, 잘못된 설정 거부를 검사한다. 옴라 두 형태의 실제 WebGPU 캡처는 `build/merchant-new/browser/`에 상태·소비 파일 해시와 함께 있다.
- 구현 위치: 화면/제어 `game/quality/index.html`, `game/host/quality.ts`; 대상·카메라·시간 `game/app/client/quality.hpp`; 실제 프레임 제출/상태 발행 `game/app/client/main.cpp`의 `quality_frame`; 실제 장면 렌더 `game/gameplay/presentation/scene_view.cpp`의 `draw_preview`.
- 현재 선택 단위는 위의 대상 하나와 방 하나다. `scene: 7`은 실제 렌더 경로에서 방·소품·배경을 제거한 분리 검토다. 임의 에셋 파일/개별 소품 선택·동시 다중 대상·카메라 타깃 이동은 공개 제어에 없다. 필요하면 그 기능부터 실제 렌더 경로에 추가한다. 콘셉트 이미지나 Blender 진단 렌더를 게임 내 실제 렌더링 증거로 대체하지 않는다.
- 캡처는 무시되는 `build/<작업명>/`에 PNG와 상태 JSON을 함께 보존한다. 관련 WASM/팩/소스 hash, 명령·브라우저·화면 크기, 검사 결과와 실행 시각을 남긴다. 2026-10-16 실제 1막 리그 결과는 `build/act1-overhaul/browser-rigs/`, 실제 UI 녹화 5개는 `build/act1-overhaul/clips/`, 통합 증거는 `build/act1-overhaul/final-rig-evidence.json`이다. 과거 2026-10-12 정적 몹 결과는 `build/asset-viewer-20261012/`다.

공식 참고: [스킬·AGENTS 지침의 과도한 맥락/검사 줄이기](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), [AGENTS 적용 범위와 우선순위](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
