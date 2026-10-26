# Tripo Studio 직접 API 사용

본인 Tripo Studio 계정으로 **Studio 웹 서비스의 HTTP API**(`https://api.tripo3d.ai/v2/studio/...`)를 직접 호출해 모델을 생성·조회한다. 브라우저 자동화도, MCP 서버도 쓰지 않는다. 공개 Tripo API가 아니라 Studio 웹앱의 내부 API라서 안정성 보장은 없다. 생성 워크플로 계약은 로컬 `tripo-studio-mcp` 라이브러리 **0.8.2+codex.20261013.directapi** 기준이다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `scripts/tripo-studio/studio-auth.mjs` | 세션 쿠키 마스킹 입력, JWT 발급·`exp` 1분 전 자동 갱신 |
| `scripts/tripo-studio/list-models.mjs` | 읽기 전용 점검 — 쿠키로 JWT 발급 → 계정 확인 → 최근 모델 목록 |
| `scripts/tripo-studio/direct-studio.mjs` | 1막 적 5종 모델 생성(유료, 정확히 5회만 — `validatePlan`) |
| `scripts/tripo-studio/inspect-act1-rigs.mjs` | 생성된 5종의 리깅 사전 검사(읽기), 사람이 승인한 리깅/애니메이션 계획만 제출 |
| `scripts/tripo-studio/optimize-glb.mjs` | 받은 GLB를 게임 예산으로 줄이기(로컬) — 아래 '게임 자산 예산' |
| `scripts/tripo-studio/contracts.json` | 워크플로 operation 계약 스냅샷(참고용) |
| `game/tools/art/collect-act1.mjs` | `direct-studio.mjs` 결과 5종을 작업 폴더로 모으고 최적화 |
| `game/tools/art/collect-tripo.mjs` | (과거 MCP 경로) Windows MCP 보관 폴더의 GLB를 모으기 — 상점 소품에 썼다 |

테스트: `node --test scripts/tripo-studio/direct-studio.test.mjs scripts/tripo-studio/optimize-glb.test.mjs` (`pnpm install` 뒤 — `direct-studio` 테스트가 `game/tools/campaign.mjs` 를 거쳐 `typescript` 를 쓴다).

## 인증 — 세션 쿠키 한 번, JWT는 자동 갱신

Studio 웹 인증은 Ory Kratos다. 브라우저에는 수명이 긴 HttpOnly 쿠키 `ory_kratos_session` 이 있고, 웹앱은 이 쿠키로 짧은(약 15분) JWT를 받아 `Authorization: Bearer` 로 쓴다.

| 단계 | 요청 |
| --- | --- |
| JWT 발급 | `GET https://api.tripo3d.ai/v2/studio/studio/whoami?tokenizeAs=default_jwt`, `Cookie: ory_kratos_session=<값>` → JSON `tokenized` |
| API 호출 | `Authorization: Bearer <JWT>`, **`Origin: https://studio.tripo3d.ai`**(와 `Referer`) 필수 — 없으면 403 `code 1017 invalid domain for organization`. 웹앱처럼 `x-tripo-device-id` 도 보낸다 |

2026-10-26 실제 로그인 세션으로 확인했다(`list-models.mjs` — JWT 발급 → `user/profile/payment` 200 → 모델 20개).

스크립트는 시작할 때 터미널에서 쿠키 값을 **한 번** 마스킹 입력(에코 없음)으로 받는다. 값은 브라우저 개발자 도구 → Application → Cookies → `https://studio.tripo3d.ai` 의 `ory_kratos_session` 이다(쿠키 헤더 전체를 붙여 넣어도 된다). macOS·Windows 모두 대화형 터미널에서 돌린다. 그 뒤로는 즉시 JWT를 받아 적용하고, JWT `exp` 1분 전마다 새로 받아 `tripo_set_session` 으로 다시 적용한다. 갱신이 실패하면 현재 JWT 만료 전까지 10초 간격으로 재시도하고, 만료되면 실행을 실패로 끝낸다. 쿠키가 만료되면(발급 HTTP 401) Studio에 다시 로그인해 새 값을 넣는다.

**사용자 위임(2026-10-17, 이후 2026-10-26 쿠키 방식으로 바뀜):** 인증 입력·갱신 때문에 매번 승인을 다시 묻지 않는다. 진행 중인 작업에는 새 JWT를 적용하고 기존 작업 ID를 이어서 조사한다. **인증 갱신을 유료 생성의 재제출로 처리하지 않는다.** 쿠키·JWT 원문은 프로세스 메모리에만 두고 답변·로그·명령줄 인수·환경 변수·파일·저장소에 남기지 않는다. MCP가 동작하지 않아도 이 직접 HTTP 경로를 쓴다(2026-10-16).

## 실행

```bash
node scripts/tripo-studio/list-models.mjs            # 읽기 전용 인증 점검
node scripts/tripo-studio/direct-studio.mjs --plan build/act1-overhaul/model-plan.json --check
node scripts/tripo-studio/direct-studio.mjs --plan build/act1-overhaul/model-plan.json
```

`direct-studio.mjs` 는 최신 1막의 검토된 이미지 5개·해시·유료 생성 정확히 5회만 받는다. 추가 remesh·rig·animation은 자동 제출하지 않는다. 생성 입력·제출 기록·완료 메타데이터에 토큰은 들어가지 않는다. 완료는 네이티브 작업 실행기가 쓰는 durable ledger 파일의 실제 변경 사건으로 받는다 — timer polling이나 자동 유료 재제출이 없다. 제출 시작 marker(`build/act1-overhaul/studio-direct/submission.json`)가 있으면 같은 plan을 다시 실행해도 새 생성은 거부하고, 실패/불명 결과는 기존 작업 ID로 조사한다.

`ceiling:` 생성·리깅 스크립트는 저장소에 없는 별도 로컬 라이브러리 `build/main-counter-tripo-20261013/plugin-src/dist`(또는 `TRIPO_LIBRARY_DIR`)를 프로세스 안에서 불러 쓴다. 구현을 저장소에 복사하지 않는다(아래 '유지보수'). 2026-10-26 현재 macOS checkout에는 이 라이브러리가 없어 `list-models.mjs` 만 돌 수 있다. 라이브러리의 HTTP 계층이 Studio origin/referer·device id 헤더를 붙인다.

## 작업 실행과 완료

아래 `tripo_*` 이름은 로컬 라이브러리 런타임의 호출 이름이다(`runtime.call(name, input)` — MCP 서버를 띄우지 않는다).

1. `tripo_get_workflow_capabilities`를 읽어 현재 operation, 입력 schema, 결과 binding을 확인한다. [계약 스냅샷](../scripts/tripo-studio/contracts.json)은 참고용이며 실행 중 런타임 응답이 우선한다.
2. 입력 이미지·기존 project ID·부품 이름·애니메이션 preset은 실제 파일이나 조회 결과로 확정한다. 생성할 개수와 옵션을 사용자 요청에 맞게 고정한다.
3. `tripo_start_workflow`를 **한 번** 호출한다. 반환된 `workflow_id`는 접수 ID다. 성공이나 다운로드 완료를 의미하지 않는다.
4. 필요할 때 `tripo_get_workflow`, `tripo_list_workflows`, `tripo_get_workflow_log`로 상태를 조회한다. 클라이언트에 timer/RAF/임의 지연 polling을 만들지 않는다. 원격 관찰과 다운로드는 기존 백엔드가 담당한다.
5. `succeeded`와 해당 단계의 결과를 확인하고, 내려받은 실제 GLB를 검사·최적화한다. 제출 옵션을 최종 품질 증거로 쓰지 않는다.

외부 상태는 `queued`, `running`, `succeeded`, `failed`다. `workflow_id`는 로컬 작업, `project_id`는 Studio 모델 프로젝트, `operator_id`는 원격 연산, `asset_id`는 이미지 자산을 식별한다. 서로 대체하지 않는다. 단계 간에는 `depends_on`과 `bindings`를 사용한다. 예를 들어 앞 단계 `/project_ids/0`을 뒤 단계 `/project_id`에 연결한다. 정확한 허용 경로는 snapshot의 각 `results`/`accepts_results`와 시작 도구 schema에 있다.

계정·목록·조회 도구는 `tripo_get_status`, `tripo_set_session`, `tripo_clear_account`, `tripo_list_models`, `tripo_get_model`, `tripo_list_images`, `tripo_get_image`, `tripo_list_templates`다. 작업 관리 도구는 위 능력/시작/조회/목록/로그와 `tripo_cancel_workflow`, `tripo_retry_workflow`다. 잔액 조회를 모든 생성의 선행 조건으로 추가하지 않는다.

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

로컬 이미지는 파일 hash로 확정하고, 임시 S3 자격 증명 발급 → 업로드 → 이미지 audit → 단일 생성 제출 순으로 처리한다. S3 임시 토큰과 서명 URL은 기록하지 않는다. multiview의 원격 `image` 배열 순서는 **front, left, back, right**이며 없는 방향은 `null`이다. 앞·뒤 두 장만 주었으면 옆면을 생성하거나 다른 입력으로 바꾸지 않는다.

`source.kind`는 `text`, `local_image`, `local_multiview`, `studio_image`, `studio_multiview`를 지원한다. 텍스트·이미지 생성은 별도 크레딧 작업으로 이어질 수 있으므로 이미지를 제공한 요청에서 임의로 추가하지 않는다.

| 선택/조합 | 현재 계약의 조건 |
| --- | --- |
| `high_detail` | `v2.5-20250123`, `v3.0-20250812`, `v3.1-20260211` |
| `geometry_quality` | v3.1에서만 지정. 프로젝트 기본은 명시적으로 `standard` |
| `smart_mesh` | 내부 모델 `Nexus-v1.0-20260214`, 500–20,000 faces. source/tier 외 생성 옵션은 `face_limit`, `visibility`, `allow_sensitive`만 지정. texture/PBR/custom version/geometry 옵션을 붙이지 않음 |
| `generate_parts` | texture 또는 quad와 함께 사용 불가. `segmentation_granularity`는 parts일 때만 사용 |
| `smart_poly` | `geometry_quality=detailed`와 함께 사용 불가 |
| texture 옵션 | `texture_quality`, `texture_alignment`, `pbr=true`는 `texture=true` 필요 |
| `enable_image_autofix` | 단일 이미지 모드만 지원. 제공된 multiview는 false |
| face 범위 | 보통 최소 500, parts 최소 10,000. 최대 smart_poly: quad 10,000/삼각형 20,000; 일반 quad 50,000; standard 1,000,000/detailed 2,000,000. API 최대치는 게임 예산으로 사용하지 않음 |

Smart Mesh와 texture 옵션을 섞은 첫 시도는 로컬 `INVALID_INPUT`으로 원격 제출 전에 거절됐다. 이후 high_detail 1건만 원격 생성했다. 이처럼 **미제출이 입증된 입력 오류 수정**과 **제출 결과가 불확실한 유료 요청 재시도**를 구분한다.

## Operation 계약

전체 입력 type/enum/범위/기본값/required/추가 필드 허용 여부와 결과 binding은 [contracts.json](../scripts/tripo-studio/contracts.json)에 저장되어 있다. 아래는 호출 선택을 위한 요약이다. API는 옵션 조합에 따른 추가 검증도 수행한다.

| Operation | 주요 입력 | 원격 처리 |
| --- | --- | --- |
| `image.generate` | prompt, amount, reference_images, ratio, resolution, model, template_id | `image/gen_image_v2` |
| `image.multiview` | image_asset_id, output_index | `image/gen_multiview` |
| `image.regenerate` | image_asset_id, kind | `image/re_gen_image` 또는 `image/re_gen_multiview` |
| `model.generate` | source, tier, face_limit, texture/PBR 등 | `operation/image_to_model`, `multiview_to_model`, `text_to_model` |
| `model.import` | model_path, use_original_uv, transform_matrix | `operation/import_user_model` |
| `model.segment` | project_id, granularity | `operation/ai_segmentation` |
| `model.complete_parts` | project_id, mode, part_names | `operation/ai_completion` 또는 `mesh_fill` |
| `model.remesh` | project_id, face_limit, quad, smart_poly, part_names | `operation/remesh` |
| `texture.generate` | project_id, source, alignment, quality, part_names, style | `operation/texture_model` |
| `texture.edit_preview` | project_id, render_image_path, camera_matrix, prompt, strength | `operation/retexture_generate` |
| `texture.edit_apply` | project_id, textures | `operation/apply_retexture` |
| `texture.upscale` | project_id, quality | `operation/texture_upscaler` |
| `texture.pbr` | project_id | `operation/pbr_generate` |
| `model.rig` | project_id, model_version | `operation/rigging_model` |
| `model.animate` | project_id, preset, rig_type | `operation/retarget_model` |

이 snapshot에서 `model.import`를 제외한 14개 operation은 `may_consume_credits=true`다. 이는 고정 가격표가 아니다. 생성 개수·후처리 범위를 임의 확대하거나, 실패했다고 처음부터 다시 제출하지 않는다. 부품 이름·rig 지원 여부·animation preset은 `tripo_get_model`의 실제 capabilities를 먼저 확인한다. `texture.edit_preview`도 무료 로컬 미리보기라고 가정하지 않는다.

## HTTP 계약과 오류

Studio HTTP 요청은 Bearer 인증, JSON Accept/Content-Type, Studio origin/referer, `x-tripo-device-id`, `x-tripo-region`(이번 실행 `rg1`), `x-tripo-start`를 사용한다. 기존 전송 계층이 이를 구성한다. HTTP 200이어도 JSON envelope의 `code=0` 및 응답 schema 확인이 필요하다.

아래 모든 경로 앞에는 `/v2/studio/`가 붙는다. 생성/후처리는 POST이며 전체 원격 JSON을 직접 짜는 대신 위 workflow 계약을 사용한다.

| 메서드·경로 | 본문/쿼리 또는 역할 |
| --- | --- |
| GET `user/profile/payment` | 세션 검증 및 명시적 계정 상태 조회 |
| POST `storage/temporary_token` | `{client:"aws", format}` → 임시 업로드 권한 |
| POST `audit/image` | `{image}` → 업로드 이미지 audit |
| GET `assets/v2` | `asset_type`(`mine`·`collected`·`team`), `type`(`all`·`textured`·`rigged` …), `locale`, `offset`, `size=20` — 응답 `data.projects`(`id`, `project_name`, `type`, `model_url` …) 모델 목록 |
| POST `progress` | `{ids:[operator_id,...]}` — 1–20개 |
| GET `project/detail/v3/{project_id}` | 실제 프로젝트 결과·모델 정보 |
| POST `operation/pre_rig_check` | `{model_version,project_id}` |
| POST `operation/get_retexture`, `operation/get_retexture_images` | 텍스처 편집 결과 조회 |
| GET `image/available_templates` | 사용 가능한 템플릿 |
| POST `image/image_assets` | `{page_num,page_size}` |
| POST `image/get_image_asset` | `{asset_id}` |

| 오류 | 처리 |
| --- | --- |
| 로컬 `INVALID_INPUT` / `CONFIGURATION_ERROR` | schema/옵션 조합 수정. 원격 미제출 증거를 확인 |
| 401 / 만료 세션 | 쿠키로 JWT 재발급(자동). 쿠키도 만료면 다시 로그인해 새 쿠키 입력. 유료 쓰기를 자동 재제출하지 않음 |
| 403 | `code 1017` 이면 Studio `Origin` 헤더 누락. 그 밖은 거절 원인 보고 |
| envelope code 2010 | 크레딧 부족. 임의 결제·구독 변경 없음 |
| 429 / 5xx / 네트워크 오류 | 검증된 읽기만 기존 전송 계층의 제한된 재시도 허용 |
| 유료 쓰기 dispatch 후 timeout·연결 단절 | `OUTCOME_UNKNOWN`. 기존 workflow/project를 조사하고 자동 재제출 금지 |
| `STALLED` | 실제 진행 로그·원격 상태 확인. 새 작업으로 대체하지 않음 |

`tripo_retry_workflow`는 새 ID로 첫 단계부터 실행하며 크레딧을 다시 쓸 수 있다. 사용자가 그 재시도를 명시적으로 요청한 경우에만 사용한다. 취소도 이미 제출된 원격 작업의 취소나 환불을 보장하지 않는다.

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

`contracts.json` 은 2026-10-13 에 MCP 도구 정의에서 내보낸 스냅샷이다(내보내기 도구는 MCP 경로와 함께 지웠다). snapshot은 17개 도구와 15개 operation의 기능 계약이다. 설명문을 제외하고 type/enum/required/범위·결과 경로를 보존한다. 버전이 바뀌면 런타임의 `tripo_get_workflow_capabilities` 로 실제 계약을 새로 읽고 변경된 호출만 검증한다. Studio의 내부 HTTP 경로가 바뀌면 HTTP 200이나 비슷한 공개 API 문서만으로 호환된다고 판단하지 않는다.

로컬 의존성의 출처는 [Ador-able/tripo-studio-mcp](https://github.com/Ador-able/tripo-studio-mcp), 기준 commit `45df024ff8196ddd3f9226a082b87ce5b4c459c2`다. 해당 [LICENSE](https://github.com/Ador-able/tripo-studio-mcp/blob/45df024ff8196ddd3f9226a082b87ce5b4c459c2/LICENSE)는 all rights reserved이므로 이 저장소에 그 구현·번들·수정 patch를 재배포하지 않는다. 설치된 로컬 수정본과 등록된 marketplace source는 로컬 의존성으로 유지한다. 이 저장소만 clone하면 그 수정 플러그인까지 설치되는 구조는 아니다. 공개 upstream의 기존 버전이 `tripo_set_session`을 지원한다고 가정하지 않는다.

이 저장소의 인증 모듈(`studio-auth.mjs`)과 GLB 최적화 도구는 독립 작성했다. 최적화에 사용한 glTF Transform, meshoptimizer, sharp는 package.json/pnpm-lock.yaml에 고정한 개발 의존성이다. 토큰이나 외부 플러그인 구현을 결과물·commit에 포함하지 않는다.
