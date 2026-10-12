# 게임 검증

## 2026-10-12 원본 통합·정리

원본 `origin/main`의 `fd45531`까지 13개 커밋을 기존 게임 브랜치에 충돌 없이 통합했다. 지도 사가·페이즈·카드 데이터와 Vite 분할 로딩은 원본 동작을 유지한다. 기존 게임 WebGPU Worker 설정과 private 파일 차단, 에셋 뷰어는 보존했다.

- 그림 묶음은 `FigureArtStore`에 원본 객체를 그대로 보관한다. 완료한 묶음만 증분 등록하고 한 배치당 한 번 발행하며, 받은 그림 조회표 전체 복사와 별도 완료 그룹 상태를 제거했다. `pnpm test:map`의 회귀 3개는 배치 발행, 중복 완료·늦은 묶음, 구독 해제와 원본 객체 보존을 확인한다.
- 페이즈 조회표는 중복 `flat`/`flatMap` 임시 배열 없이 한 번 구축하고, 고정 지명·대륙·대지 카드·지역 상세 검증은 인덱스로 조회한다. 카드 우선순위 정렬은 확대 단계마다 반복하지 않는다. 로딩 측정의 RAF readiness polling은 `MutationObserver`로 바꿨다. 지형 생성의 시간 예산별 작업 분할과 실제 애니메이션 프레임은 준비 polling과 구별하여 유지했다.
- 오디오 미리듣기 최초 회귀는 **51/52**였다. `phase1.wav`의 두 번째 전투에서 고정 플레이어가 사망해 재생 흐름 검증이 중단됐다. 이 오디오 픽스처만 공개 `heal_player`로 생존 수명을 분리했고 실제 공격·피격 이벤트와 기존 피해 규칙은 유지했다. 실제 피격 로그 회귀를 추가하고 `audio_preview`만 다시 빌드한 뒤 **52/52** 통과했다. 독립 음향 golden과 게임 규칙은 바꾸지 않았다.

최종 검증: `pnpm build`, `pnpm lint`, `pnpm game:typecheck`, 지도 회귀 **3/3**, `pnpm game:test` **52/52**, 공개 품질 뷰어 **43개 제출 상태**, 실제 지도 사가1 페이즈1→3→사가2 페이즈2→사가1 페이즈3 복귀 및 카드 패널 본문 publication 모두 통과했다. 지도 브라우저 오류·경고는 없었다. Vite의 기존 500kB 청크 안내는 남는다.

동일 실제 그림 **118묶음·565개**, Node v26.7.0, 삽입 50회 비교는 기존 조회표 복사 **255.19ms**→증분 등록 **1.34ms**였다. 이는 그림 등록 연산만의 비교이며 전체 로딩/FPS 개선 수치가 아니다. 전체 작업 시간의 동등한 이전 기준이 없어 5배 단축은 주장하지 않는다. 원시 로그·전후 측정·백업은 `build/upstream-merge-20261012/`에 보존했다.

게임 클라이언트·팩은 교체하지 않았다. WASM SHA-256 `353a52fb0a15e2244a2c1600ad57318a021621ac89c8511e1a2ee094f6c91346`, 팩 SHA-256 `ad777a95957f03fdee4b17ae034164b69d8244e0a05076a35d7449fa7c14cd9d`. 아래 2026-10-11 기록은 당시 산출물의 별도 검증 cutoff다.

## 2026-10-11 생산 게임 검증

최종 생산 클라이언트와 실제 에셋 팩으로 검사했다. 공유 빌드는 한 작성자만 수행했고, 브라우저는 빌드가 끝난 뒤 실행했다. `build/`의 원시 로그와 캡처는 로컬 증거이며 일반 빌드는 저장소의 준비된 에셋을 사용한다.

## 실행 산출물

| 파일 | 바이트 | SHA-256 |
| --- | ---: | --- |
| `public/wasm/game-client.wasm` | 16,840,661 | `4e79fdff0b898aa7ea670eb7e1faffce86f98af48bfd2f2f6b5fe1b55bb7e086` |
| `public/wasm/game-assets.zkpack` | 118,900,690 | `94fb7366ba0ae63c072c2683a4c8a8023a1409ed82754920334ffcef9a411e99` |

최종 보스 브라우저 결과의 `sourceArtifacts`가 실제 응답·소스·WASM·팩 해시를 함께 기록하고 실행 중 변경이 없음을 검사한다. 무료 원본, 라이선스, 생성 프롬프트와 재현 도구는 `game/gameplay/content/`에 보존했다. 다운로드한 출처 HTML은 원본 공백까지 보존하며 해당 두 파일만 whitespace 검사의 예외다.

## 대표 검증

| 실행 | 결과 / 원시 증거 |
| --- | --- |
| `pnpm game:build` 및 마지막 클라이언트·공유 물리·프로브 재빌드 | 종료 0. `build/quality-final-production-build.log`, `quality-final-publication-build.log`, `quality-final-ragdoll-engine-build.log` |
| `pnpm game:test` | **49/49 통과**, 종료 0, 30.75초. 아키텍처·에셋·게임플레이·UI 상태·오디오·로비·호스트·rig 회귀. `build/quality-final-game-test.log` |
| `pnpm game:typecheck`, `pnpm lint`, `pnpm build` | 모두 종료 0. `build/quality-final-{typecheck,lint,vite-build}.log`. Vite의 기존 500kB 청크 안내는 남는다. 지도 웹사이트 빌드와 게임 WASM 빌드는 별도다. |
| `node game/tests/creature-lighting.browser.mjs` | 실제 WebGPU 픽셀 통과. 빛 0은 검정이고 그늘·채움빛·햇빛·피격과 법선 방향이 구별된다. `build/qa-final/creature-lighting-gpu.{log,json}` |
| `node game/tests/ragdoll-skinning.browser.mjs` | 실제 GPU DQS의 기본·90° 변환·반대 부호 quaternion 결과 통과. `build/qa-final/ragdoll-skinning-gpu.{log,json}` |
| `node build/game-wasm64/ragdoll_engine_probe.cjs` | 종료 0. 실제 접촉·관절·문·벽·빈 바닥·수면·명중·입력 검증, 독립 미분 및 공개 포즈 속도 비교. `build/quality-final-ragdoll-engine.log` |
| 세 `sim_probe.cjs --ragdoll-poses --ragdoll-case=0/1/2` | 모두 종료 0. 서로 다른 실제 사망 방향·움직이는 시체·다섯 발 마무리. `build/qa-final/ragdoll-case-{0,1,2}.log` |
| `node game/tests/ragdoll-surface.mjs <위 세 로그> --out build/qa-final/ragdoll-surface.json` | **23,999정점 × 12포즈**의 바닥·벽·천장 침투 없음. `build/qa-final/ragdoll-surface.{log,json}` |
| `node game/tests/boss-ragdoll.browser.mjs --base http://localhost:5173 --out build/qa-final/boss-ragdoll-final --require-over-motion` | **PASS**, 오류 없음, 66.8초. 실제 보스 전투·시체·다섯 선율 명중·승리 뒤 물리 계속 진행·자연 정지. PNG와 301프레임 MP4, 신뢰된 입력·공개 F3/judge 증거를 저장했다. |
| `node game/tools/perf.mjs --base http://localhost:5173 --sizes 1920x1080 --dpr 1 --tour --seconds 0 --shots build/qa-final/world-gallery-final --json build/qa-final/world-gallery-final.json --label skyclave-balanced` | **PASS**, 오류 없음. 여섯 방 유형과 실제 포털, 홀·심연의 계단 왕복(눈높이 1.6→5.1→1.6m), PNG 21장. 실제 출력에서 바닥·벽·계단·심연 가장자리 가시성을 확인했다. |
| `node game/tests/shop-flow.browser.mjs --base http://localhost:5173 --out build/qa-final/shop-flow-final` | **PASS**, 오류 없음, 29.8초. E로 세 카드 열기, 포인터 해제·복귀, R 체력 100→75, 상인 살해→쓰러짐→부활→3500 체력 추격 보스. 최종 WASM·팩 해시 일치. |

세 World 경우는 시드 7/131/557을 사용한다. 경우 0은 생존 전투를 유지하고, 경우 1/2는 공개 회복으로 사망 물리만 분리한다. 사망 후 1206/1528/1496틱에 자연 정지했으며 선속도는 0.02850/0.02324/0.02886m/s, 각속도는 0.02161/0.01658/0.01292rad/s였다. 실제 피부의 전체 검사 최소 y는 세 경우 모두 양수다.

## 발견한 오류와 수정

최초 전체 검사는 47/49였다. 오래된 유리 이름과 32m presentation fixture를 현재 카탈로그·48m 방으로 이행했다. 소리 표적이 원거리 공격에 먼저 죽는 재현은 공개 회복으로 분리했고, 소리 이름·공간화·피해량 기대는 보존했다. 집중 검사 뒤 최종 전체 49/49를 확인했다. Node presentation은 디코더·업로드 계약 fixture이며 실제 GPU 검증은 위 브라우저 결과다.

보스 브라우저에서 최초에는 오디오 269표본 부족이 관측됐다. 정확한 DQS 접촉 기울기를 공유 역미분으로 계산하고, 보정하지 않은 점의 중복 질의를 제거했다. 이후 예약된 재장전 완료를 즉시 판정 문자열만으로 기다리던 QA 오류도 실제 공개 탄 수·단계 전이로 고쳤다. 최종 전체 보스 브라우저에는 오디오·GPU·리소스 오류가 없다.

한 사망 방향의 미세한 잔떨림은 2ms 내부 제약 보정을 수면 속도로 집계하던 데서 드러났다. 최종 60Hz 공개 포즈의 모든 관절 끝점·반경 점·피부 접촉점과 회전의 실제 이동량을 측정한다. **0.04m/s·0.08rad/s 이하가 60틱 연속**인 조건, 중력·마찰·감쇠·접촉점 1024개·관절 20개·8 substep × 6회 제약 계산은 유지했다. 타이머로 강제 정지하지 않는다.

## 화질·성능의 적용 범위

최종 게임의 원본 캡처: [2층 회랑](game-preview/skyclave-gallery.png), [심연](game-preview/skyclave-abyss.png), [노파](game-preview/merchant.png), [세 카드](game-preview/cards.png). F3 성능 표시는 QA를 위해 켠 것이며 기본 게임 화면에는 표시되지 않는다. 보스 MP4는 화면만 녹화한 무음 영상이고 오디오는 별도의 실행·샘플 검사로 확인했다.

맵과 몹·노파·무기는 같은 방 조명과 표면 표시 곡선을 사용한다. 물리 표면 노출 1.0·그늘 지수 0.8로 암부를 읽게 하되, 하늘·발광·유리·포털의 기존 0.42 노출과 검은 심연은 유지한다. 공격 예고는 바닥을 덮는 면 대신 얇은 룬 선으로 표시한다.

1920×1080 캡처는 출력 크기다. 내부 장면은 GPU 부하에 따라 해상도를 조절하므로 이를 고정 1080p FPS로 주장하지 않는다. 구운 빛은 16.35MiB, 전체 팩은 113.39MiB로 각각 20/128MiB 예산 안이다. 피부 접촉은 원본을 덮는 유한한 물리 근사이며, 큰 보스의 정지 포즈에는 약 11cm의 접촉 여유가 남을 수 있다. 메시를 들어 올리는 보정은 없다.

역미분 최적화만 분리한 동일 공개 물리 실험은 5.476→3.925ms/틱이었다(`build/ragdoll-contact-benchmark.json`). 이 값은 이후 안정 판정까지 포함한 게임 전체 FPS 비교가 아니다. 전체 작업 시간의 동등한 기준 측정이 없어 5배 단축을 달성했다고 주장하지 않는다. 빌드 중 공유 SDK 캐시 재생성과 전체 헤더 재컴파일이 남은 시간 병목으로 관측됐다.
