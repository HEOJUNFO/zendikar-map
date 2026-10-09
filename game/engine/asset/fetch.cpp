#include "engine/asset/fetch.hpp"

#include <emscripten/em_js.h>
#include <emscripten/emscripten.h>

#include <cmath>
#include <cstdint>
#include <utility>

namespace engine::asset {
namespace {

// 받고 있는 것 하나 — ticket 은 받기마다 새로 매기는 번호다 (취소한 받기의 뒤늦은 답을 가려낸다)
FetchEvents events{};
std::size_t limit = 0;
std::vector<std::byte> received;
uint32_t ticket = 0;
bool pending = false;

void finish(bool ok) {
  const FetchEvents target = events;
  pending = false;
  events = {};
  std::vector<std::byte> bytes = ok ? std::move(received) : std::vector<std::byte>{};
  received = {};
  target.done(std::move(bytes), ok, target.user);
}

}  // namespace
}  // namespace engine::asset

extern "C" {

/** 응답의 크기를 알았다 (아래 zk_fetch_start 가 부른다) — 담을 자리를 잡아 그 주소를 준다. 받지 않을 것(취소됨·상한 넘음·정수가 아님)이면 0 */
EMSCRIPTEN_KEEPALIVE std::byte* zk_fetch_reserve(uint32_t id, double size) {
  using namespace engine::asset;
  if (!pending || id != ticket || !(size >= 1.0) || size > static_cast<double>(limit) || size != std::floor(size)) return nullptr;
  received.assign(static_cast<std::size_t>(size), std::byte{});
  return received.data();
}

/** 받기가 끝났다 — ok 면 zk_fetch_reserve 가 준 자리에 응답이 다 적혀 있다 */
EMSCRIPTEN_KEEPALIVE void zk_fetch_done(uint32_t id, int ok) {
  using namespace engine::asset;
  if (pending && id == ticket) finish(ok != 0 && !received.empty());
}

}

namespace engine::asset {
namespace {

// wasm64 에서는 포인터가 BigInt 로 오간다 — 힙의 자리로 쓰려면 Number 로 바꾼다.
// 자리를 잡는 동안 힙이 자랄 수 있다: HEAPU8 은 그 뒤에 읽는다 (Emscripten 이 자란 힙으로 바꿔 둔다)
EM_JS(void, zk_fetch_start, (const char* url, uint32_t id), {
  fetch(UTF8ToString(Number(url)))
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const at = Number(_zk_fetch_reserve(id, buffer.byteLength));
      if (at) HEAPU8.set(new Uint8Array(buffer), at);
      _zk_fetch_done(id, at ? 1 : 0);
    })
    .catch(() => _zk_fetch_done(id, 0));
});

}  // namespace

bool fetch(const char* url, std::size_t max_bytes, FetchEvents target) {
  if (pending) return false;
  pending = true;
  events = target;
  limit = max_bytes;
  zk_fetch_start(url, ++ticket);
  return true;
}

void cancel_fetch() {
  pending = false;
  events = {};
  received = {};
}

}  // namespace engine::asset
