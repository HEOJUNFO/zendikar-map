#pragma once

namespace engine {

/** 플랫폼이 넘겨받은 캔버스를 걸어 두는 이름 (host/worker-adapter.ts 와 같은 값) */
inline constexpr const char* CANVAS_TARGET = "#canvas";

/** 프레임 콜백 — time_ms 는 그 프레임의 시각. false 를 돌려주면 루프가 멈춘다 */
using FrameCallback = bool (*)(double time_ms, void* user);

/** 화면 주사율에 맞춰 콜백을 계속 부른다 (requestAnimationFrame) */
void run_frame_loop(FrameCallback callback, void* user);

}  // namespace engine
