#include "engine/audio/port.hpp"

#include <emscripten/em_js.h>
#include <emscripten/emscripten.h>

#include <cmath>

namespace engine::audio {
namespace {

// 받는 쪽 — 통로가 하나라 여기 하나만 둔다
PortEvents events{};

// 2^53 — 이 아래의 정수는 double 에 그대로 담긴다
constexpr double MAX_COUNT = 9007199254740992.0;

}  // namespace
}  // namespace engine::audio

extern "C" {

/** 핸들에 통지가 닿았다 (아래 zk_audio_open 의 onmessage 가 부른다). 수는 double 로 온다 — 정수이고 범위 안인 것만 올려 보낸다 */
EMSCRIPTEN_KEEPALIVE void zk_audio_consumed(double consumed, double underruns) {
  using namespace engine::audio;
  if (!events.consumed) return;
  if (!(consumed >= 0.0 && consumed < MAX_COUNT && underruns >= 0.0 && underruns < MAX_COUNT) || consumed != std::floor(consumed) || underruns != std::floor(underruns)) return;
  events.consumed(static_cast<uint64_t>(consumed), static_cast<uint64_t>(underruns), emscripten_get_now(), events.user);
}

}

namespace engine::audio {
namespace {

EM_JS(int, zk_audio_open, (), {
  const port = Module.audioPort;
  if (!port) return 0;
  port.onmessage = (event) => {
    const data = event.data;
    if (data && typeof data.consumed === "number" && typeof data.underrun === "number") _zk_audio_consumed(data.consumed, data.underrun);
  };
  return 1;
});

EM_JS(void, zk_audio_close, (), {
  if (Module.audioPort) Module.audioPort.onmessage = null;
});

// wasm64 에서는 포인터가 BigInt 로 넘어온다 — 힙의 자리로 쓰려면 Number 로 바꾼다. 표본은 새 버퍼에 베껴 그 버퍼째 넘긴다 (힙은 넘길 수 없다)
EM_JS(void, zk_audio_write, (double start, const float* samples, int count), {
  const at = Number(samples) / 4;
  const block = HEAPF32.slice(at, at + count);
  Module.audioPort.postMessage({start, samples: block}, [block.buffer]);
});

}  // namespace

bool Port::open(PortEvents received) {
  close();
  if (!zk_audio_open()) return false;
  events = received;
  open_ = true;
  return true;
}

void Port::write(uint64_t start, std::span<const float> interleaved) {
  if (open_ && !interleaved.empty()) zk_audio_write(static_cast<double>(start), interleaved.data(), static_cast<int>(interleaved.size()));
}

void Port::close() {
  if (!open_) return;
  zk_audio_close();
  events = {};
  open_ = false;
}

double now_ms() { return emscripten_get_now(); }

}  // namespace engine::audio
