#pragma once

namespace engine {

/** 플랫폼이 넘겨받은 캔버스를 걸어 두는 이름 (host/worker-adapter.ts 와 같은 값) */
inline constexpr const char* CANVAS_TARGET = "#canvas";

/** 프레임 콜백 — time_ms 는 그 프레임의 시각. false 를 돌려주면 루프가 멈춘다 */
using FrameCallback = bool (*)(double time_ms, void* user);

/** 화면 주사율에 맞춰 콜백을 계속 부른다 (requestAnimationFrame) */
void run_frame_loop(FrameCallback callback, void* user);

/**
 * 이 스레드의 시계(프레임 콜백의 time_ms, performance.now)가 0 인 때 — 1970 년부터의 ms (performance.timeOrigin).
 * 다른 스레드(호스트의 주 스레드)가 제 시계로 잰 시각을 이 스레드의 시계로 옮길 때 쓴다: 두 스레드의 '0 인 때 + 시계' 는 같은 순간에 같다
 */
double time_origin_ms();

}  // namespace engine
