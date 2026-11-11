# Tripo Studio 직접 API 사용

본인 Tripo Studio 계정으로 Studio 웹 서비스의 HTTP API를 직접 호출해 모델을 생성·조회한다. 인증(쿠키 → JWT 자동 갱신)·워크플로 라이브러리·operation/HTTP 계약·오류 처리·라이브러리 패치는 여러 프로젝트가 같이 쓰는 공용 도구 `Projects/tripo-studio/`(그 [README](../../tripo-studio/README.md))에 있다. 이 문서는 이 저장소의 스크립트와 게임 자산 예산만 다룬다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `scripts/tripo-studio/direct-studio.mjs` | 1막 적 5종 모델 생성(유료, 정확히 5회만 — `validatePlan`) |
| `scripts/tripo-studio/inspect-act1-rigs.mjs` | 생성된 5종의 리깅 사전 검사(읽기), 사람이 승인한 리깅/애니메이션 계획만 제출 |
| `scripts/tripo-studio/optimize-glb.mjs` | 받은 GLB를 게임 예산으로 줄이기(로컬) — 아래 '게임 자산 예산' |
| `game/tools/art/collect-act1.mjs` | `direct-studio.mjs` 결과 5종을 작업 폴더로 모으고 최적화 |
| `game/tools/art/collect-tripo.mjs` | (과거 MCP 경로) Windows MCP 보관 폴더의 GLB를 모으기 — 상점 소품에 썼다 |

앞의 두 스크립트는 공용 도구의 `studio-auth.mjs`(`--clipboard`·`--keychain`)와 `library.mjs` 를 `../../../tripo-studio/` 에서 불러온다. 라이브러리가 없으면 `node ../tripo-studio/setup-library.mjs` 로 다시 만든다.

테스트: `node --test scripts/tripo-studio/direct-studio.test.mjs scripts/tripo-studio/optimize-glb.test.mjs` (`pnpm install` 뒤 — `direct-studio` 테스트가 `game/tools/campaign.mjs` 를 거쳐 `typescript` 를 쓴다. 1막 콘셉트 PNG(`game/art-work/**/*.png`, git 제외)가 있어야 plan 검사 세 개가 돈다).

**사용자 위임(2026-10-17, 이후 2026-10-26 쿠키 방식으로 바뀜):** 인증 입력·갱신 때문에 매번 승인을 다시 묻지 않는다. 진행 중인 작업에는 새 JWT를 적용하고 기존 작업 ID를 이어서 조사한다. **인증 갱신을 유료 생성의 재제출로 처리하지 않는다.** 쿠키·JWT 원문은 답변·로그·명령줄 인수·환경 변수·파일·저장소에 남기지 않는다.

## 실행

```bash
node ../tripo-studio/list-models.mjs                 # 읽기 전용 인증 점검 (공용 도구)
node scripts/tripo-studio/direct-studio.mjs --plan build/act1-overhaul/model-plan.json --check
node scripts/tripo-studio/direct-studio.mjs --plan build/act1-overhaul/model-plan.json
```

`direct-studio.mjs` 는 최신 1막의 검토된 이미지 5개·해시·유료 생성 정확히 5회만 받는다. 추가 remesh·rig·animation은 자동 제출하지 않는다. 생성 입력·제출 기록·완료 메타데이터에 토큰은 들어가지 않는다. 완료는 네이티브 작업 실행기가 쓰는 durable ledger 파일의 실제 변경 사건으로 받는다 — timer polling이나 자동 유료 재제출이 없다. 제출 시작 marker(`build/act1-overhaul/studio-direct/submission.json`)가 있으면 같은 plan을 다시 실행해도 새 생성은 거부하고, 실패/불명 결과는 기존 작업 ID로 조사한다.

## 모델 생성 예시

다음은 카운터 같은 큰 정적 소품 **1개**의 향후 기본값이다. 실제 파일 절대 경로를 넣고 생성 수량이 승인된 경우에만 `tripo_start_workflow`에 전달한다. 이번 이미 완료한 작업을 다시 실행하는 명령이 아니다.

```json
{
  "name": "main-counter",
  "steps": [{
    "step_id": "counter",
    "operation": "model.generate",
    "input": {
      "source": {
        "kind": "local_multiview",
        "front": "C:/projects/zendikar/game/art-work/shop-room/concepts/props/main-counter/front.png",
        "back": "C:/projects/zendikar/game/art-work/shop-room/concepts/props/main-counter/back.png"
      },
      "tier": "high_detail",
      "model_version": "v3.1-20260211",
      "geometry_quality": "standard",
      "face_limit": 4000,
      "texture": true,
      "texture_quality": "standard",
      "texture_alignment": "original_image",
      "pbr": true,
      "quad": false,
      "smart_poly": false,
      "generate_parts": false,
      "enable_image_autofix": false,
      "allow_sensitive": false,
      "visibility": "private"
    }
  }]
}
```

## 게임 자산 예산과 로컬 최적화

BPM 느낌의 적당한 그래픽을 목표로 한다. 아래 수치는 **최종 삼각형 수**와 텍스처 한 변의 상한이다. 화면 점유·실루엣·동시 개체 수로 작은 값을 먼저 선택한다. 쿼드 face 수, API face_limit, LOD 총합을 같은 수치로 취급하지 않는다.

| 용도 | 보통 범위 | 도구 preset 상한 | 텍스처 상한 |
| --- | --- | --- | --- |
| 작은 일반 소품 | 500–2,000 | `prop`: 1,500 | 512 |
| 카운터·큰 가구 | 2,000–5,000 | `large-prop`: 4,000 | 1K |
| 가까이 보는 무기 | 2,000–5,000 | `weapon`: 5,000 | 1K |
| 일반 적 | 3,000–6,000 | `creature`: 6,000 | 1K |
| 큰 보스 | 8,000–12,000 | `boss`: 12,000 | 2K |

8K를 기본 옵션으로 제안하지 않는다. 생성 시 `geometry_quality=standard`, `texture_quality=standard`를 명시하고, 내려받은 실제 결과를 검사한다. 해상도·mesh가 예산을 넘으면 먼저 로컬에서 줄이며 유료 upscale/remesh를 자동 추가하지 않는다. 실루엣을 지키면서 예산에 들 수 없으면 도구는 출력 전에 실패한다. 예산 확대는 실제 화면에서 드러난 손실이 있을 때 판단한다.

```bash
pnpm install --frozen-lockfile
node --test scripts/tripo-studio/optimize-glb.test.mjs
node scripts/tripo-studio/optimize-glb.mjs source.glb optimized.glb --preset large-prop --report build/tripo/optimization.json
node scripts/tripo-studio/optimize-glb.mjs --inspect optimized.glb
```

Node.js 22 이상을 권장한다. `--triangles`(1–20,000), `--texture-size`(256/512/1024/2048)로 더 작은 예산을 지정할 수 있다. 입력·출력은 별도 경로이며 기존 출력 교체에는 `--overwrite`가 필요하다. 재생성하지 않고 원본 archive를 보존한다.

최적화 도구는 meshopt decode/역양자화, 경계 보존 mesh 단순화, JPEG/PNG 축소를 수행한다. 작은 이미지를 확대하지 않고 종횡비를 유지한다. PBR 맵 바인딩을 유지하며 JPEG는 4:4:4로 저장한다. GLB 외부 참조와 알 수 없는 확장은 거절하고, 예산·재질/primitive 수·경계 변화(최장 변의 1% 이내)를 확인한 뒤 임시 파일에서 결과를 교체한다. 검사 시 실제 파일을 다시 읽는다.

`ceiling:` 현재 최적화는 정적·단일 scene·내장 리소스 GLB와 JPEG/PNG에 한정된다. skin, animation, morph target은 거절한다. creature/boss preset은 리깅 전 정적 mesh에만 적용한다. 리깅/모프를 보존하는 별도 경로를 검증하기 전에는 애니메이션 자산에 이 도구를 사용하지 않는다. 실제 게임 화면의 품질 판정과 LOD·collision·스케일·배치 처리는 별도 통합 단계다.

## 이번 카운터 결과와 검증 범위

산출물: [main-counter.glb](../game/art-work/shop-room/generated/main-counter/main-counter.glb), [manifest.json](../game/art-work/shop-room/generated/main-counter/manifest.json).

| 항목 | 원본 | 최종 |
| --- | --- | --- |
| 삼각형 | 7,033 | **3,999** |
| 정점 | 4,791 | 3,249 |
| 텍스처 | 4K × 3 | **1K × 3** — base color/ORM/normal |
| 파일 크기 | 15,517,172 bytes | **1,687,288 bytes** |
| 구조 | mesh/primitive/material 각각 1 | 동일, PBR 유지, skin/animation 없음 |

생성 workflow `c4e8b8ee-11a1-4b81-a5df-d18809265fd0`, Studio project `c69dc315-4793-47ab-8634-8d67cd3ad66c`. 단일 원격 생성은 2026-10-13 10:27:14–10:29:10 KST에 성공했다. 이 작업은 품질 지시 전 `face_limit=10000`, `texture_quality=detailed`로 이미 제출되어 있었으므로 재생성 없이 로컬 최적화했다. 앞·뒤 이미지 두 장의 hash, 원본/최종 hash, 실행 설정은 manifest에 있다.

최종 경계 변화는 최장 변의 약 0.0061%다. 원본의 최장 변은 약 1 단위이며 게임 미터 스케일로 확정한 값이 아니다. 최종 GLB에는 필수 압축 확장이 없다. 원본은 로컬 Tripo archive에 보존하고, 작업 폴더의 구조는 `game/art-work/README.md`.

실제 검증: JWT 읽기 인증 → 두 이미지 업로드/audit → high_detail 1건 생성 → PBR GLB 다운로드 → 로컬 최적화 → 최종 파일 재검사. 다른 operation들은 schema·소스 계약과 오프라인 검사로 확인했으며 유료 실사용을 모두 검증했다는 뜻은 아니다. 로컬 수정 플러그인 검사 663개/51파일, 타입 검사, 패키지 검사와 stdio 실행 검사가 통과했다. 이 저장소의 독립 최적화 회귀 검사 4개도 통과했다. 게임 catalog/WASM에는 아직 연결하지 않았고 브라우저·실제 게임 렌더 검사는 실행하지 않았다.

검증 로그와 원본 해시는 무시되는 `build/main-counter-tripo-20261013/`에 보존한다. 이 checkout에는 `audit:assets` 명령이 등록되어 있지 않아 실제 GLB 구조·재질·텍스처·hash 검사를 사용했다. 추가 유료 생성이나 후처리는 실행하지 않았다. 원격 생성 소요 시간은 약 116초다. 비교 기준 실행이 없어 5배 속도 향상을 주장하지 않는다.

## 유지보수

이 저장소의 GLB 최적화 도구는 독립 작성했다. 최적화에 사용한 glTF Transform, meshoptimizer, sharp는 package.json/pnpm-lock.yaml에 고정한 개발 의존성이다. 토큰이나 외부 플러그인 구현을 결과물·commit에 포함하지 않는다. 인증 모듈과 워크플로 라이브러리(upstream 라이선스·패치)는 공용 도구의 README가 다룬다.
