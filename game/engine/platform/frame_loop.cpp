#include "engine/platform/frame_loop.hpp"

#include <emscripten/html5.h>

namespace engine {

void run_frame_loop(FrameCallback callback, void* user) { emscripten_request_animation_frame_loop(callback, user); }

}  // namespace engine
