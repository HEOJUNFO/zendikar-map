# 게임 (C++26 → wasm64, WebGPU). `pnpm game:build` (tools/build.mjs) 가 Emscripten 툴체인으로 부른다.
# 타깃이 곧 계층이다 — 엔진은 게임플레이를 링크하지 않고, 시뮬레이션은 GPU 쪽을 링크하지 않는다.
# (#include 단위의 규칙은 tools/check-layers.mjs 가 본다)
cmake_minimum_required(VERSION 3.25)
project(zendikar_game LANGUAGES CXX)

if(NOT EMSCRIPTEN)
  message(FATAL_ERROR "Emscripten 툴체인으로만 빌드한다 — pnpm game:build")
endif()

set(CMAKE_CXX_STANDARD 26)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

get_filename_component(ZK_REPO_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/.." ABSOLUTE)
# TS 쪽이 읽는 생성물 (git 제외) — VeilBind 클라이언트·Worker, Emscripten 글루, WASM policy
set(ZK_GENERATED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/host/generated")
# Worker 가 받아 가는 WASM
set(ZK_WASM_DIR "${ZK_REPO_ROOT}/public/wasm")
set(ZK_NAGA "naga" CACHE FILEPATH "WGSL 을 빌드 때 검사하는 naga-cli")
find_program(ZK_NODE node REQUIRED)

# wasm64 — 모든 오브젝트와 마지막 링크에 같이 걸려야 한다 (Emscripten 6 은 -sMEMORY64 대신 표준 -m64).
# 예외·RTTI 는 쓰지 않는다 (VeilBind 타깃이 요구하는 것과 같게 전체에 건다)
add_compile_options(-m64 -fno-exceptions -fno-rtti)
add_link_options(-m64)

# ── VeilBind (주 스레드 ↔ Worker RPC) ─────────────────────────────────────────
set(VEILBIND_CPP_DIR "${ZK_REPO_ROOT}/node_modules/@dentner-eng/veilbind/packages/veilbind-native-cpp")
if(NOT EXISTS "${VEILBIND_CPP_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "VeilBind 가 없다 — pnpm install")
endif()
set(VEILBIND_ADDRESS_WIDTH "64" CACHE STRING "" FORCE)
# Emscripten 모듈 팩토리가 전역 생성자를 돌린다 — VeilBind 가 첫 a() 에서 다시 돌리지 않게 (add_subdirectory 앞에 둔다)
set(VEILBIND_RUNTIME_CTORS_OWNER "host" CACHE STRING "" FORCE)
add_subdirectory("${VEILBIND_CPP_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/veilbind-native-cpp")

# 우리 코드에만 거는 경고
set(ZK_WARNINGS -Wall -Wextra)

# ── 엔진 — 게임을 모른다 ───────────────────────────────────────────────────────
# GPU 없이 도는 부분 (서버도 쓴다)
add_library(engine_core STATIC
  engine/foundation/log.cpp
  engine/hud/layout.cpp
  engine/spatial/lbvh.cpp
)
target_include_directories(engine_core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
target_compile_options(engine_core PRIVATE ${ZK_WARNINGS})

# 셰이더 헤더 만들기 (WGSL 을 naga 로 검사하고 engine::ShaderPackage 상수로 묻는다)
function(zk_shaders OUTPUT NAMESPACE)
  add_custom_command(
    OUTPUT "${OUTPUT}"
    COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/shaderc.mjs"
            "${ZK_NAGA}" "${OUTPUT}" "${NAMESPACE}" ${ARGN}
    DEPENDS ${ARGN} "${CMAKE_CURRENT_SOURCE_DIR}/tools/shaderc.mjs"
    VERBATIM
  )
endfunction()

# 화면에 그리는 부분 — gpu::Device 인터페이스만 본다 (백엔드를 모른다)
file(GLOB ZK_ENGINE_SHADERS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/engine/render/wgsl/*.wgsl")
set(ZK_ENGINE_SHADER_HEADER "${CMAKE_CURRENT_BINARY_DIR}/generated/engine_shaders.generated.hpp")
zk_shaders("${ZK_ENGINE_SHADER_HEADER}" "engine::shaders" ${ZK_ENGINE_SHADERS})
add_library(engine_client STATIC
  engine/platform/frame_loop.cpp
  engine/render/gpu_lbvh.cpp
  engine/render/instance_batch.cpp
  engine/render/overlay.cpp
  engine/shader/shader_library.cpp
  "${ZK_ENGINE_SHADER_HEADER}"
)
target_include_directories(engine_client PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/generated")
target_link_libraries(engine_client PUBLIC engine_core)
target_compile_options(engine_client PRIVATE ${ZK_WARNINGS})

# GPU 백엔드 (WebGPU — Dawn 의 emdawnwebgpu 포트) — 조립 지점(app)만 링크한다
set(ZK_WEBGPU_PORT "--use-port=emdawnwebgpu")
add_library(engine_gpu_webgpu STATIC engine/gpu/webgpu/webgpu_device.cpp)
target_link_libraries(engine_gpu_webgpu PUBLIC engine_core)
target_compile_options(engine_gpu_webgpu PRIVATE ${ZK_WARNINGS} ${ZK_WEBGPU_PORT})

# ── 게임플레이 ────────────────────────────────────────────────────────────────
# 규칙·시뮬레이션·입력 해석 — engine_core 만 본다
add_library(gameplay_sim STATIC
  gameplay/domain/rhythm.cpp
  gameplay/input/pointer_controls.cpp
  gameplay/simulation/world.cpp
)
target_link_libraries(gameplay_sim PUBLIC engine_core)
target_compile_options(gameplay_sim PRIVATE ${ZK_WARNINGS})

file(GLOB ZK_GAMEPLAY_SHADERS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/presentation/wgsl/*.wgsl")
set(ZK_GAMEPLAY_SHADER_HEADER "${CMAKE_CURRENT_BINARY_DIR}/generated/gameplay_shaders.generated.hpp")
zk_shaders("${ZK_GAMEPLAY_SHADER_HEADER}" "game::shaders" ${ZK_GAMEPLAY_SHADERS})

# 화면 표현 — 시뮬레이션을 읽어 엔진으로 그린다
add_library(gameplay_presentation STATIC
  gameplay/presentation/hud.cpp
  gameplay/presentation/scene_view.cpp
  "${ZK_GAMEPLAY_SHADER_HEADER}"
)
target_include_directories(gameplay_presentation PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/generated")
target_link_libraries(gameplay_presentation PUBLIC gameplay_sim engine_client)
target_compile_options(gameplay_presentation PRIVATE ${ZK_WARNINGS})

# ── 클라이언트 (조립 지점) ────────────────────────────────────────────────────
set(ZK_API_SOURCE "${CMAKE_CURRENT_SOURCE_DIR}/app/client/api/game_api.cpp")
set(ZK_WORKER_ADAPTER "${CMAKE_CURRENT_SOURCE_DIR}/host/worker-adapter.ts")
set(ZK_REGISTRY "${CMAKE_CURRENT_BINARY_DIR}/game_veilbind_registry.cpp")
set(ZK_VEILBIND_CODEGEN "${VEILBIND_CPP_DIR}/../veilbind-codegen/bin/veilbind-codegen.mjs")
file(MAKE_DIRECTORY "${ZK_GENERATED_DIR}" "${ZK_WASM_DIR}")
# 등록표(.cpp)와 함께 TS 클라이언트·Worker(game.*.generated.ts)를 ZK_GENERATED_DIR 에 쓴다.
# veilbind_generate_registry() 는 --worker-adapter 를 넘기지 못해 codegen 을 직접 부른다
add_custom_command(
  OUTPUT "${ZK_REGISTRY}"
  COMMAND "${ZK_NODE}" "${ZK_VEILBIND_CODEGEN}"
          --language cpp
          --source "${ZK_API_SOURCE}"
          --out "${ZK_REGISTRY}"
          --metadata "${ZK_GENERATED_DIR}/game.private.json"
          --worker-adapter "${ZK_WORKER_ADAPTER}"
  DEPENDS "${ZK_API_SOURCE}" "${ZK_VEILBIND_CODEGEN}"
  VERBATIM
)

add_executable(game_client
  app/client/main.cpp
  "${ZK_REGISTRY}"
)
target_compile_options(game_client PRIVATE ${ZK_WARNINGS})
# 등록표는 VeilBind 가 만든 코드다 — 우리 경고 기준을 걸지 않는다
set_source_files_properties("${ZK_REGISTRY}" PROPERTIES COMPILE_OPTIONS "-w")
# a/d/q/z 는 우리 코드가 부르지 않는 export 다 — 통째로 넣지 않으면 링커가 버린다
target_link_libraries(game_client PRIVATE gameplay_presentation engine_gpu_webgpu "$<LINK_LIBRARY:WHOLE_ARCHIVE,veilbind-native-cpp>")

set(ZK_HOST_IMPORTS "${CMAKE_CURRENT_SOURCE_DIR}/tools/veilbind_host_imports.js")
target_link_options(game_client PRIVATE
  # Emscripten 6 의 -O3 meta-DCE 는 memory64 에서 Binaryen 이 못 읽는 바이너리를 낸다 — 글루는 O2 로 링크한다
  "$<IF:$<CONFIG:Debug>,-O0,-O2>"
  "$<$<CONFIG:Debug>:-g>"
  "-sMODULARIZE=1"
  "-sEXPORT_ES6=1"
  "-sEXPORT_NAME=createGameClientModule"
  # 클라이언트는 Worker 안에서만 돈다 (화면은 넘겨받은 OffscreenCanvas)
  "-sENVIRONMENT=worker"
  "-sEXPORTED_RUNTIME_METHODS=['stackSave','stackRestore','specialHTMLTargets']"
  "${ZK_WEBGPU_PORT}"
  "-sALLOW_MEMORY_GROWTH=1"
  "-sINITIAL_MEMORY=67108864"
  "-sMAXIMUM_MEMORY=8589934592"
  "-sSTACK_SIZE=1048576"
  "-sFILESYSTEM=0"
  # VeilBind raw RPC 는 Asyncify unwind/rewind 를 받지 않는다
  "-sASYNCIFY=0"
  "-sSUPPORT_LONGJMP=0"
  "-sNO_EXIT_RUNTIME=1"
  "--js-library=${ZK_HOST_IMPORTS}"
  "-Wl,--no-entry"
)
set_property(TARGET game_client APPEND PROPERTY LINK_DEPENDS "${ZK_HOST_IMPORTS}")
set_target_properties(game_client PROPERTIES OUTPUT_NAME "game-client" SUFFIX ".mjs")

# 생성물을 TS 쪽이 읽는 자리로 — 글루와 그 타입, WASM, 그 WASM 의 policy
add_custom_command(TARGET game_client POST_BUILD
  COMMAND "${CMAKE_COMMAND}" -E copy_if_different
          "${CMAKE_CURRENT_BINARY_DIR}/game-client.mjs" "${ZK_GENERATED_DIR}/game-client.mjs"
  COMMAND "${CMAKE_COMMAND}" -E copy_if_different
          "${CMAKE_CURRENT_SOURCE_DIR}/tools/game-client.d.mts" "${ZK_GENERATED_DIR}/game-client.d.mts"
  COMMAND "${CMAKE_COMMAND}" -E copy_if_different
          "${CMAKE_CURRENT_BINARY_DIR}/game-client.wasm" "${ZK_WASM_DIR}/game-client.wasm"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/write_wasm_policy.mjs"
          "${CMAKE_CURRENT_BINARY_DIR}/game-client.wasm" "${ZK_GENERATED_DIR}/game-client-policy.generated.ts"
  VERBATIM
)

# ── 검증 프로브 — Node 에서 돈다 (pnpm game:test) ─────────────────────────────
# sim_probe 는 gameplay_sim 만 링크한다: 시뮬레이션이 GPU 쪽 없이 선다는 것을 링커가 확인한다
function(zk_probe NAME LIBRARY)
  add_executable(${NAME} tests/${NAME}.cpp)
  target_link_libraries(${NAME} PRIVATE ${LIBRARY})
  target_compile_options(${NAME} PRIVATE ${ZK_WARNINGS})
  target_link_options(${NAME} PRIVATE "-sENVIRONMENT=node" "-sEXIT_RUNTIME=1")
  # 저장소가 "type": "module" 이라 .js 는 ES 모듈로 읽힌다 — Emscripten 의 기본 출력은 CommonJS 다
  set_target_properties(${NAME} PROPERTIES SUFFIX ".cjs")
endfunction()
zk_probe(engine_probe engine_core)
zk_probe(sim_probe gameplay_sim)
zk_probe(presentation_probe gameplay_presentation)
