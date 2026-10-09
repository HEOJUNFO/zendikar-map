#include "engine/platform/frame_loop.hpp"

#include <emscripten/em_js.h>
#include <emscripten/html5.h>

namespace engine {
namespace {

EM_JS(double, zk_time_origin, (), { return performance.timeOrigin; });

}  // namespace

void run_frame_loop(FrameCallback callback, void* user) { emscripten_request_animation_frame_loop(callback, user); }

double time_origin_ms() { return zk_time_origin(); }

}  // namespace engine
