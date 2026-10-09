#include <emscripten/emscripten.h>

#include <algorithm>
#include <memory>
#include <new>

#include "app/client/client.hpp"
#include "engine/foundation/log.hpp"
#include "engine/gpu/device.hpp"
#include "engine/gpu/webgpu/webgpu_device.hpp"
#include "engine/hud/view.hpp"
#include "engine/platform/frame_loop.hpp"
#include "engine/render/overlay.hpp"
#include "engine/shader/shader_library.hpp"
#include "gameplay/input/pointer_controls.hpp"
#include "gameplay/presentation/hud.hpp"
#include "gameplay/presentation/scene_view.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

constexpr uint32_t TARGET_COUNT = 256;
constexpr uint32_t WORLD_SEED = 20261009;
// 탭이 멈췄다 돌아왔을 때 한꺼번에 따라잡는 시간의 상한 (초)
constexpr double MAX_CATCH_UP = 0.25;
constexpr engine::gpu::ClearColor SKY{0.22f, 0.03f, 0.05f};

struct Client {
  explicit Client(std::unique_ptr<engine::gpu::Device> gpu) : device(std::move(gpu)), shaders(*device) {}

  // 장치가 맨 나중에 없어진다 (선언 차례의 거꾸로)
  std::unique_ptr<engine::gpu::Device> device;
  engine::ShaderLibrary shaders;
  engine::Overlay overlay;
  game::World world{game::World::scattered(TARGET_COUNT, WORLD_SEED)};
  game::PointerControls controls;
  game::SceneView scene;
  engine::hud::View<game::HudState> hud{game::hud_root};
  double last_ms{-1.0};
  double accumulator{};
};

enum class Boot { idle, requesting, running };

Client* client = nullptr;
Boot boot = Boot::idle;
// 장치를 기다리는 동안 내려 달라는 요청이 왔다 — 장치가 오면 버린다
bool shutdown_requested = false;
// 클라이언트가 서기 전에 온 화면 크기 — 서자마자 적용한다
uint32_t pending_width = 0;
uint32_t pending_height = 0;

bool frame(double time_ms, void*) {
  if (!client) return false;
  Client& c = *client;
  if (c.last_ms < 0.0) c.last_ms = time_ms;
  c.accumulator += std::clamp((time_ms - c.last_ms) / 1000.0, 0.0, MAX_CATCH_UP);
  c.last_ms = time_ms;
  // 시뮬레이션은 고정 틱으로만 나아간다 — 화면 주사율과 상관없이 같은 결과
  while (c.accumulator >= game::World::TICK) {
    c.world.step();
    c.accumulator -= game::World::TICK;
  }
  engine::gpu::Device& device = *c.device;
  // 컴퓨트(과녁 LBVH 빌드와 조준)는 그리기 패스를 열기 전에 돈다
  c.scene.prepare(device, c.world, c.controls.aiming());
  device.begin_frame(SKY);
  c.scene.draw(device, c.world);
  // HUD — 상태가 바뀌었을 때만 다시 조립된다
  const engine::hud::Viewport viewport{static_cast<float>(device.width()), static_cast<float>(device.height()), game::hud_unit(device.height())};
  c.overlay.submit(c.hud.update(game::select_hud_state(c.world, c.controls), viewport, engine::Overlay::TEXT_METRICS));
  c.overlay.flush(device);
  device.end_frame();
  return true;
}

/** 요청한 장치가 왔다 (또는 못 받았다) — 여기서 클라이언트를 세우고 프레임 루프를 건다 */
void on_device(std::unique_ptr<engine::gpu::Device> device, void*) {
  boot = Boot::idle;
  if (shutdown_requested) return;
  if (!device) {
    engine::log_error("[app] GPU 장치가 없어 클라이언트를 시작하지 못했다");
    return;
  }
  Client* created = new (std::nothrow) Client(std::move(device));
  if (!created) return;
  if (!created->overlay.create(*created->device, created->shaders) ||
      !created->scene.create(*created->device, created->shaders, TARGET_COUNT)) {
    engine::log_error("[app] 그리기 자원을 만들지 못했다");
    delete created;
    return;
  }
  if (pending_width && pending_height) created->device->resize(pending_width, pending_height);
  client = created;
  boot = Boot::running;
  engine::run_frame_loop(frame, nullptr);
  engine::log_info("[app] 클라이언트 시작 — WebGPU / OffscreenCanvas");
}

}  // namespace

namespace app {

bool resize_surface(uint32_t width, uint32_t height) {
  if (!width || !height) return false;
  pending_width = width;
  pending_height = height;
  if (client) client->device->resize(width, height);
  return true;
}

void pointer_move(double delta_x, double delta_y) {
  if (client) client->controls.move(client->world, delta_x, delta_y);
}

uint32_t pointer_press(uint32_t button) { return client ? client->controls.press(client->world, button) : 0; }

void pointer_capture(bool captured) {
  if (client) client->controls.set_captured(captured);
}

}  // namespace app

// Worker 어댑터가 부르는 진입점 (host/worker-adapter.ts) — VeilBind RPC 밖이다
extern "C" {

/**
 * 넘겨받은 캔버스로 GPU 장치를 요청한다. 장치는 나중에 오므로(WebGPU 의 어댑터·장치 요청은 비동기다)
 * 여기서는 요청만 하고 돌아간다 — 클라이언트는 장치가 온 뒤에 서고, 그때까지의 입력은 버려진다
 */
EMSCRIPTEN_KEEPALIVE void app_boot() {
  if (boot != Boot::idle) return;
  boot = Boot::requesting;
  shutdown_requested = false;
  // 백엔드는 여기서 고른다 — 엔진과 게임은 engine::gpu::Device 만 본다
  engine::gpu::request_webgpu_device(engine::CANVAS_TARGET, on_device, nullptr);
}

EMSCRIPTEN_KEEPALIVE void app_shutdown() {
  if (boot == Boot::requesting) shutdown_requested = true;
  // 프레임 루프는 다음 콜백에서 client 가 없는 것을 보고 멈춘다
  delete client;
  client = nullptr;
  if (boot == Boot::running) boot = Boot::idle;
}

}
