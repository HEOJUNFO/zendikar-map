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
  engine/asset/pack.cpp
  engine/audio/bank.cpp
  engine/audio/mixer.cpp
  engine/audio/qoa.cpp
  engine/audio/sequencer.cpp
  engine/bake/lightbake.cpp
  engine/foundation/log.cpp
  engine/hud/bitmap.cpp
  engine/hud/font.cpp
  engine/hud/interaction.cpp
  engine/hud/jpeg.cpp
  engine/hud/layout.cpp
  engine/hud/widgets.cpp
  engine/spatial/lbvh.cpp
  engine/spatial/static_mesh.cpp
  engine/spatial/surface_mesh.cpp
)
target_include_directories(engine_core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
target_compile_options(engine_core PRIVATE ${ZK_WARNINGS})

# 셰이더 헤더 만들기 (WGSL 을 naga 로 검사하고 engine::ShaderPackage 상수로 묻는다)
# 여러 셰이더가 끼워 쓰는 조각(#include "이름.wgsl") — 엔진과 게임의 셰이더가 같은 조각을 쓴다 (장면의 빛·노출·톤 곡선)
set(ZK_SHADER_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/engine/render/wgsl/include")
file(GLOB ZK_SHADER_INCLUDES CONFIGURE_DEPENDS "${ZK_SHADER_INCLUDE_DIR}/*.wgsl")
function(zk_shaders OUTPUT NAMESPACE)
  add_custom_command(
    OUTPUT "${OUTPUT}"
    COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/shaderc.mjs"
            "${ZK_NAGA}" "${OUTPUT}" "${NAMESPACE}" "${ZK_SHADER_INCLUDE_DIR}" ${ARGN}
    DEPENDS ${ARGN} ${ZK_SHADER_INCLUDES} "${CMAKE_CURRENT_SOURCE_DIR}/tools/shaderc.mjs"
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
  engine/render/mesh_batch.cpp
  engine/render/overlay.cpp
  engine/render/present_batch.cpp
  engine/render/sky_batch.cpp
  engine/render/surface_batch.cpp
  engine/shader/shader_library.cpp
  "${ZK_ENGINE_SHADER_HEADER}"
)
target_include_directories(engine_client PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/generated")
target_link_libraries(engine_client PUBLIC engine_core)
target_compile_options(engine_client PRIVATE ${ZK_WARNINGS})

# 네트워크 (브라우저의 WebSocket — Emscripten WebSocket API) — 조립 지점(app)만 링크한다. Node 에서 도는 프로브에는 들어가지 않는다
add_library(engine_net STATIC engine/net/socket.cpp)
target_link_libraries(engine_net PUBLIC engine_core)
target_link_options(engine_net INTERFACE "-lwebsocket.js")
target_compile_options(engine_net PRIVATE ${ZK_WARNINGS})

# 받기 (브라우저의 fetch) — 조립 지점(app)만 링크한다. Node 에서 도는 프로브에는 들어가지 않는다
add_library(engine_fetch STATIC engine/asset/fetch.cpp)
target_link_libraries(engine_fetch PUBLIC engine_core)
target_compile_options(engine_fetch PRIVATE ${ZK_WARNINGS})

# 소리 출력 통로 (호스트가 넘긴 핸들에 쓴다 — 브라우저의 MessagePort) — 조립 지점(app)만 링크한다. Node 에서 도는 프로브에는 들어가지 않는다
add_library(engine_audio_port STATIC engine/audio/port.cpp)
target_link_libraries(engine_audio_port PUBLIC engine_core)
target_compile_options(engine_audio_port PRIVATE ${ZK_WARNINGS})

# GPU 백엔드 (WebGPU — Dawn 의 emdawnwebgpu 포트) — 조립 지점(app)만 링크한다
set(ZK_WEBGPU_PORT "--use-port=emdawnwebgpu")
add_library(engine_gpu_webgpu STATIC engine/gpu/webgpu/webgpu_device.cpp)
target_link_libraries(engine_gpu_webgpu PUBLIC engine_core)
target_compile_options(engine_gpu_webgpu PRIVATE ${ZK_WARNINGS} ${ZK_WEBGPU_PORT})

# ── 게임플레이 ────────────────────────────────────────────────────────────────
# 규칙·시뮬레이션·입력 해석·로비 프로토콜(바이트 처리) — engine_core 만 본다
# 장면의 텍스처와 소품, 손에 드는 무기 (content/textures, content/props, content/weapons — CC0 원본을 tools/art/prepare.mjs 가 손질해 둔 것) — WASM 에 묻지 않고
# 에셋 팩 한 파일로 묶어 WASM 옆에 둔다 (tools/packc.mjs). 게임이 실행 중에 받는다 (engine/asset/fetch, gameplay/presentation/scenery)
set(ZK_TEXTURE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/textures")
set(ZK_PROP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/props")
set(ZK_WEAPON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/weapons")
file(GLOB ZK_PACK_SOURCES CONFIGURE_DEPENDS "${ZK_TEXTURE_DIR}/*.jpg" "${ZK_PROP_DIR}/textures/*.jpg" "${ZK_PROP_DIR}/*.zkmodel"
     "${ZK_WEAPON_DIR}/textures/*.jpg" "${ZK_WEAPON_DIR}/*.zkmodel")
file(GLOB ZK_PROP_MODELS CONFIGURE_DEPENDS "${ZK_PROP_DIR}/*.zkmodel")
set(ZK_ASSET_PACK "${ZK_WASM_DIR}/game-assets.zkpack")
file(MAKE_DIRECTORY "${ZK_WASM_DIR}")
set(ZK_PACK_LISTS "${ZK_TEXTURE_DIR}/textures.txt" "${ZK_TEXTURE_DIR}" "${ZK_PROP_DIR}/props.txt" "${ZK_PROP_DIR}" "${ZK_WEAPON_DIR}/weapons.txt" "${ZK_WEAPON_DIR}")
set(ZK_PACK_DEPENDS ${ZK_PACK_SOURCES} "${ZK_TEXTURE_DIR}/textures.txt" "${ZK_PROP_DIR}/props.txt" "${ZK_WEAPON_DIR}/weapons.txt" "${CMAKE_CURRENT_SOURCE_DIR}/tools/packc.mjs")
# 구운 빛을 싣기 전의 팩 — 라이트 베이커가 여기서 소품 모델과 텍스처(평균 색)를 읽는다. 게임이 받는 팩은 구운 빛까지 실어 아래(라이트 베이킹)에서 만든다
set(ZK_BASE_PACK "${CMAKE_CURRENT_BINARY_DIR}/generated/base.zkpack")
add_custom_command(
  OUTPUT "${ZK_BASE_PACK}"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/packc.mjs" "${ZK_BASE_PACK}" ${ZK_PACK_LISTS}
  DEPENDS ${ZK_PACK_DEPENDS}
  VERBATIM
)

# 하늘 (content/sky) — HDR 에서 해(방향·빛)와 하늘빛의 표를 뽑는다: 베이커가 읽는 .zksky 와, 게임이 쓰는 값의 헤더 (tools/skyc.mjs)
set(ZK_SKY_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/sky")
set(ZK_SKY "${CMAKE_CURRENT_BINARY_DIR}/generated/sky.zksky")
set(ZK_SKY_HEADER "${CMAKE_CURRENT_BINARY_DIR}/generated/sky.generated.hpp")
add_custom_command(
  OUTPUT "${ZK_SKY}" "${ZK_SKY_HEADER}"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/skyc.mjs" "${ZK_SKY_SOURCE_DIR}" "${ZK_SKY}" "${ZK_SKY_HEADER}"
  DEPENDS "${ZK_SKY_SOURCE_DIR}/sky.txt" "${ZK_SKY_SOURCE_DIR}/sky.hdr" "${CMAKE_CURRENT_SOURCE_DIR}/tools/skyc.mjs" "${ZK_SHADER_INCLUDE_DIR}/color.wgsl"
  VERBATIM
)

# 메시 에셋 (content/meshes/*.mesh.txt → .meshbin) — content/assets.cpp 가 #embed 로 묻는다.
# 재질을 쓴 메시(방의 조각)는 텍스처 목록에서 층 번호를, 소품 목록과 모델에서 소품 번호와 부딪히는 소품의 상자를 얻는다
file(GLOB ZK_MESH_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/meshes/*.mesh.txt")
set(ZK_MESH_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated/meshes")
file(MAKE_DIRECTORY "${ZK_MESH_DIR}")
set(ZK_MESH_BINARIES "")
foreach(mesh_source IN LISTS ZK_MESH_SOURCES)
  get_filename_component(mesh_name "${mesh_source}" NAME)
  string(REPLACE ".mesh.txt" ".meshbin" mesh_name "${mesh_name}")
  add_custom_command(
    OUTPUT "${ZK_MESH_DIR}/${mesh_name}"
    COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/meshc.mjs" "${mesh_source}" "${ZK_MESH_DIR}/${mesh_name}"
            --textures "${ZK_TEXTURE_DIR}/textures.txt" --props "${ZK_PROP_DIR}/props.txt" "${ZK_PROP_DIR}"
    DEPENDS "${mesh_source}" "${ZK_TEXTURE_DIR}/textures.txt" "${ZK_PROP_DIR}/props.txt" ${ZK_PROP_MODELS}
            "${CMAKE_CURRENT_SOURCE_DIR}/tools/meshc.mjs" "${CMAKE_CURRENT_SOURCE_DIR}/tools/gltfc.mjs" "${CMAKE_CURRENT_SOURCE_DIR}/tools/packc.mjs"
    VERBATIM
  )
  list(APPEND ZK_MESH_BINARIES "${ZK_MESH_DIR}/${mesh_name}")
endforeach()

# 화면 글자의 글꼴 (Pretendard → 글리프 아틀라스 .fontbin) — 메시처럼 content/assets.cpp 가 #embed 로 묻는다.
# 면 셋을 한 아틀라스에 굽는다 (번호는 gameplay/presentation/hud.cpp 의 FACE_*):
#   0 Regular 32px, 완성형 한글 전부 (본문·입력) · 1 Bold 32px, fonts/bold.txt 의 글자 (단추·제목) · 2 Bold 64px, fonts/display.txt 의 글자 (큰 제목·큰 숫자)
# 구울 글자가 글꼴에 없으면 fontc 가 빌드를 멈춘다
set(ZK_FONT_WOFF_DIR "${ZK_REPO_ROOT}/node_modules/pretendard/dist/web/static/woff")
set(ZK_FONT_GLYPH_DIR "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/fonts")
set(ZK_FONT_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated/fonts")
file(MAKE_DIRECTORY "${ZK_FONT_DIR}")
set(ZK_HUD_FONT "${ZK_FONT_DIR}/hud.fontbin")
add_custom_command(
  OUTPUT "${ZK_HUD_FONT}"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/fontc.mjs" "${ZK_HUD_FONT}"
          --face 32 "${ZK_FONT_WOFF_DIR}/Pretendard-Regular.woff" full
          --face 32 "${ZK_FONT_WOFF_DIR}/Pretendard-Bold.woff" "${ZK_FONT_GLYPH_DIR}/bold.txt"
          --face 64 "${ZK_FONT_WOFF_DIR}/Pretendard-Bold.woff" "${ZK_FONT_GLYPH_DIR}/display.txt"
  DEPENDS "${ZK_FONT_WOFF_DIR}/Pretendard-Regular.woff" "${ZK_FONT_WOFF_DIR}/Pretendard-Bold.woff"
          "${ZK_FONT_GLYPH_DIR}/bold.txt" "${ZK_FONT_GLYPH_DIR}/display.txt" "${CMAKE_CURRENT_SOURCE_DIR}/tools/fontc.mjs"
  VERBATIM
)

# 메인 메뉴의 배경 그림 (PNG → QOI) — 있으면 content/assets.cpp 가 #embed 로 묻고, 없으면 메뉴는 그림 없는 기본 바탕으로 나온다.
# 이보다 큰 그림은 imagec 가 비율을 지켜 줄인다 (묻히는 크기를 묶어 둔다)
set(ZK_MENU_BACKGROUND_SOURCE "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/images/zendikar-main-tazeem-v1.png")
set(ZK_IMAGE_MAX_WIDTH 1920)
set(ZK_IMAGE_MAX_HEIGHT 1080)
set(ZK_IMAGE_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated/images")
file(MAKE_DIRECTORY "${ZK_IMAGE_DIR}")
set(ZK_IMAGE_BINARIES "")
set(ZK_ASSET_DEFINITIONS "")
if(EXISTS "${ZK_MENU_BACKGROUND_SOURCE}")
  set(ZK_MENU_BACKGROUND "${ZK_IMAGE_DIR}/menu_background.qoi")
  add_custom_command(
    OUTPUT "${ZK_MENU_BACKGROUND}"
    COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/imagec.mjs" "${ZK_MENU_BACKGROUND_SOURCE}" "${ZK_MENU_BACKGROUND}"
            "${ZK_IMAGE_MAX_WIDTH}" "${ZK_IMAGE_MAX_HEIGHT}"
    DEPENDS "${ZK_MENU_BACKGROUND_SOURCE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/imagec.mjs"
    VERBATIM
  )
  list(APPEND ZK_IMAGE_BINARIES "${ZK_MENU_BACKGROUND}")
  list(APPEND ZK_ASSET_DEFINITIONS "ZK_HAS_MENU_BACKGROUND")
endif()

# 소리 (content/audio) — 샘플 뱅크(samples.txt 의 WAV 들 → QOA 로 누른 .samplebank)와 곡(music/*.song.txt → .song). content/assets.cpp 가 #embed 로 묻는다.
# samples.txt 의 파일이 CREDITS.md 에 없으면 samplec 가, 악보의 박자가 domain/rhythm.hpp 와 다르면 songc 가 빌드를 멈춘다
set(ZK_AUDIO_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/content/audio")
set(ZK_AUDIO_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated/audio")
file(MAKE_DIRECTORY "${ZK_AUDIO_DIR}")
file(GLOB ZK_SAMPLE_SOURCES CONFIGURE_DEPENDS "${ZK_AUDIO_SOURCE_DIR}/samples/*.wav")
set(ZK_SAMPLE_BANK "${ZK_AUDIO_DIR}/samples.samplebank")
add_custom_command(
  OUTPUT "${ZK_SAMPLE_BANK}"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/samplec.mjs" "${ZK_AUDIO_SOURCE_DIR}" "${ZK_SAMPLE_BANK}"
  DEPENDS ${ZK_SAMPLE_SOURCES} "${ZK_AUDIO_SOURCE_DIR}/samples.txt" "${ZK_AUDIO_SOURCE_DIR}/CREDITS.md" "${CMAKE_CURRENT_SOURCE_DIR}/tools/samplec.mjs"
  VERBATIM
)
set(ZK_SONG "${ZK_AUDIO_DIR}/pulse.song")
add_custom_command(
  OUTPUT "${ZK_SONG}"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/songc.mjs" "${ZK_AUDIO_SOURCE_DIR}/music/pulse.song.txt" "${ZK_AUDIO_SOURCE_DIR}/samples.txt"
          "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/domain/rhythm.hpp" "${ZK_SONG}"
  DEPENDS "${ZK_AUDIO_SOURCE_DIR}/music/pulse.song.txt" "${ZK_AUDIO_SOURCE_DIR}/samples.txt" "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/domain/rhythm.hpp"
          "${CMAKE_CURRENT_SOURCE_DIR}/tools/songc.mjs" "${CMAKE_CURRENT_SOURCE_DIR}/tools/samplec.mjs"
  VERBATIM
)
set(ZK_AUDIO_BINARIES "${ZK_SAMPLE_BANK}" "${ZK_SONG}")

# ── 라이트 베이킹 ─────────────────────────────────────────────────────────────
# 베이커(app/lightbake)를 먼저 짓고, 방의 틀마다 한 번씩 Node 로 돌려 빛을 굽는다 (.zklight — gameplay/content/room_light.hpp). 틀마다 명령이 따로라
# Ninja 가 나란히 돌리고, 그 틀의 입력(메시·소품·하늘·베이커)이 바뀐 것만 다시 굽는다. 게임에 묻히는 에셋(소리·글꼴)과는 얽히지 않는다.
# 틀의 차례는 content/assets.cpp 의 room(shape), domain/dungeon.hpp 의 SHAPE_SITES 와 같아야 한다 (presentation_probe 가 구운 빛의 크기를 그 틀의 메시와 견준다)
set(ZK_ROOM_SHAPES room_start room_hall room_nave room_ell room_cross room_tee)
add_executable(lightbake app/lightbake/main.cpp gameplay/content/room_light.cpp)
target_link_libraries(lightbake PRIVATE engine_core)
target_compile_options(lightbake PRIVATE ${ZK_WARNINGS})
target_link_options(lightbake PRIVATE "-sENVIRONMENT=node" "-sEXIT_RUNTIME=1" "-sNODERAWFS=1" "-sALLOW_MEMORY_GROWTH=1")
set_target_properties(lightbake PROPERTIES SUFFIX ".cjs")
set(ZK_LIGHT_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated/light")
file(MAKE_DIRECTORY "${ZK_LIGHT_DIR}")
set(ZK_LIGHT_FILES "")
set(ZK_LIGHT_ENTRIES "")
set(zk_shape 0)
foreach(zk_room IN LISTS ZK_ROOM_SHAPES)
  set(zk_light "${ZK_LIGHT_DIR}/light_${zk_shape}.zklight")
  add_custom_command(
    OUTPUT "${zk_light}"
    COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_BINARY_DIR}/lightbake.cjs" "${ZK_BASE_PACK}" "${ZK_SKY}" "${zk_light}" "${ZK_MESH_DIR}/${zk_room}.meshbin" ${zk_shape}
    DEPENDS lightbake "${ZK_BASE_PACK}" "${ZK_SKY}" "${ZK_MESH_DIR}/${zk_room}.meshbin"
    COMMENT "Baking light ${zk_room}"
    VERBATIM
  )
  list(APPEND ZK_LIGHT_FILES "${zk_light}")
  list(APPEND ZK_LIGHT_ENTRIES "light/${zk_shape}=${zk_light}")
  math(EXPR zk_shape "${zk_shape} + 1")
endforeach()
# 게임이 받는 팩 — 텍스처·소품·무기에 하늘 그림과 구운 빛을 더한다
add_custom_command(
  OUTPUT "${ZK_ASSET_PACK}"
  COMMAND "${ZK_NODE}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/packc.mjs" "${ZK_ASSET_PACK}" ${ZK_PACK_LISTS} "sky/image=${ZK_SKY_SOURCE_DIR}/sky.jpg" ${ZK_LIGHT_ENTRIES}
  DEPENDS ${ZK_PACK_DEPENDS} "${ZK_SKY_SOURCE_DIR}/sky.jpg" ${ZK_LIGHT_FILES}
  VERBATIM
)
add_custom_target(game_assets ALL DEPENDS "${ZK_ASSET_PACK}")

add_library(gameplay_sim STATIC
  gameplay/content/assets.cpp
  gameplay/content/room_light.cpp
  gameplay/content/room_meshes.cpp
  gameplay/domain/dungeon.cpp
  gameplay/input/controls.cpp
  gameplay/net/lobby_protocol.cpp
  gameplay/simulation/world.cpp
  ${ZK_MESH_BINARIES}
  "${ZK_HUD_FONT}"
  ${ZK_IMAGE_BINARIES}
  ${ZK_AUDIO_BINARIES}
)
set_source_files_properties(gameplay/content/assets.cpp PROPERTIES
  # #embed 는 C++26 표준이지만 이 Clang 은 아직 확장으로 알린다 — 이 파일에서만 그 경고를 끈다
  COMPILE_OPTIONS "--embed-dir=${ZK_MESH_DIR};--embed-dir=${ZK_FONT_DIR};--embed-dir=${ZK_IMAGE_DIR};--embed-dir=${ZK_AUDIO_DIR};-Wno-c23-extensions"
  COMPILE_DEFINITIONS "${ZK_ASSET_DEFINITIONS}"
  OBJECT_DEPENDS "${ZK_MESH_BINARIES};${ZK_HUD_FONT};${ZK_IMAGE_BINARIES};${ZK_AUDIO_BINARIES}"
)
target_link_libraries(gameplay_sim PUBLIC engine_core)
target_compile_options(gameplay_sim PRIVATE ${ZK_WARNINGS})

file(GLOB ZK_GAMEPLAY_SHADERS CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/gameplay/presentation/wgsl/*.wgsl")
set(ZK_GAMEPLAY_SHADER_HEADER "${CMAKE_CURRENT_BINARY_DIR}/generated/gameplay_shaders.generated.hpp")
zk_shaders("${ZK_GAMEPLAY_SHADER_HEADER}" "game::shaders" ${ZK_GAMEPLAY_SHADERS})

# 화면 표현 — 시뮬레이션을 읽어 엔진으로 그린다
add_library(gameplay_presentation STATIC
  gameplay/presentation/hud.cpp
  gameplay/presentation/menu.cpp
  gameplay/presentation/motion.cpp
  gameplay/presentation/portal_view.cpp
  gameplay/presentation/scene_view.cpp
  gameplay/presentation/scenery.cpp
  gameplay/presentation/sound.cpp
  gameplay/presentation/stage_view.cpp
  gameplay/presentation/weapon.cpp
  "${ZK_GAMEPLAY_SHADER_HEADER}"
  "${ZK_SKY_HEADER}"
)
# 하늘에서 뽑은 값의 헤더(sky.generated.hpp)는 화면 표현의 공개 헤더가 끼운다 — 이 타깃을 쓰는 쪽도 그 폴더를 본다
target_include_directories(gameplay_presentation PUBLIC "${CMAKE_CURRENT_BINARY_DIR}/generated")
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
target_link_libraries(game_client PRIVATE gameplay_presentation engine_gpu_webgpu engine_net engine_fetch engine_audio_port "$<LINK_LIBRARY:WHOLE_ARCHIVE,veilbind-native-cpp>")

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
# 라이트 베이커 — 손으로 놓은 장면을 굽고 이론값과 견준다
zk_probe(bake_probe engine_core)
# 소리 엔진(뱅크·믹서·시퀀서·시계)은 출력 장치 없이 선다
zk_probe(audio_probe engine_core)
zk_probe(sim_probe gameplay_sim)
# 로비 프로토콜은 소켓 없이 바이트만으로 선다
zk_probe(net_probe gameplay_sim)
zk_probe(presentation_probe gameplay_presentation)
# 샘플 뱅크를 풀어 든다 (QOA 3 MB → 16 비트 표본 17 MB 쯤) — 기본 메모리(16 MB)로는 모자란다
target_link_options(presentation_probe PRIVATE "-sALLOW_MEMORY_GROWTH=1")
# 소리 미리듣기 — 음악의 층, 효과음 한 벌, 게임 한 판의 처음 몇 마디를 섞어 WAV 로 적는다 (사람이 들어 보는 용도). 파일을 써야 해서 Node 의 파일 시스템을 그대로 쓴다
zk_probe(audio_preview gameplay_presentation)
# 수십 초의 소리를 통째로 들고 섞는다 — 기본 메모리(16 MB)로는 모자란다
target_link_options(audio_preview PRIVATE "-sNODERAWFS=1" "-sALLOW_MEMORY_GROWTH=1")
