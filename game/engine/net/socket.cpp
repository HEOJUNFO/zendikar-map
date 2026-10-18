#include "engine/net/socket.hpp"

#include <emscripten/em_js.h>
#include <emscripten/websocket.h>

#include "engine/foundation/log.hpp"

namespace engine::net {

namespace {

// wasm64 에서는 포인터가 BigInt 로 넘어온다 — 힙의 자리로 쓰려면 Number 로 바꾼다.
// Worker 에도 location 이 있다 (Worker 스크립트의 주소 — 페이지와 같은 호스트에서 받는다)
EM_JS(int, zk_page_host, (char* out, int capacity), {
  return stringToUTF8(globalThis.location?.hostname ?? "", Number(out), capacity);
});

}  // namespace

/** Emscripten 이 부르는 콜백 — userData 는 그 Socket */
struct SocketCallbacks {
  static bool opened(int, const EmscriptenWebSocketOpenEvent*, void* user) {
    Socket& socket = *static_cast<Socket*>(user);
    socket.open_ = true;
    socket.events_.opened(socket.events_.user);
    return true;
  }

  static bool message(int, const EmscriptenWebSocketMessageEvent* event, void* user) {
    const Socket& socket = *static_cast<Socket*>(user);
    // 텍스트 프레임은 바이트 프레임이 아니다 — 올려 보내지 않는다
    if (event->isText) {
      log_error("[net] 텍스트 프레임을 버렸다 (%u 바이트)", event->numBytes);
      return true;
    }
    socket.events_.frame({reinterpret_cast<const std::byte*>(event->data), event->numBytes}, socket.events_.user);
    return true;
  }

  static bool closed(int, const EmscriptenWebSocketCloseEvent* event, void* user) {
    Socket& socket = *static_cast<Socket*>(user);
    // 받는 쪽이 이 사건 안에서 다시 열 수 있게 먼저 비운다
    const SocketEvents events = socket.events_;
    const uint16_t code = event->code;
    socket.close();
    events.closed(code, events.user);
    return true;
  }
};

bool Socket::open(const char* url, SocketEvents events) {
  close();
  if (!emscripten_websocket_is_supported()) return false;
  EmscriptenWebSocketCreateAttributes attributes;
  emscripten_websocket_init_create_attributes(&attributes);
  attributes.url = url;
  // 주소가 잘못됐으면(SyntaxError) 브라우저가 예외를 던진다 — 주소는 부르는 쪽이 만든 것이라 여기서 받지 않는다
  const EMSCRIPTEN_WEBSOCKET_T handle = emscripten_websocket_new(&attributes);
  if (handle <= 0) return false;
  handle_ = handle;
  events_ = events;
  emscripten_websocket_set_onopen_callback(handle, this, SocketCallbacks::opened);
  emscripten_websocket_set_onmessage_callback(handle, this, SocketCallbacks::message);
  // 못 열린 연결은 error 에 이어 close(1006)가 온다 — close 하나만 듣는다
  emscripten_websocket_set_onclose_callback(handle, this, SocketCallbacks::closed);
  return true;
}

bool Socket::send(std::span<const std::byte> frame) {
  if (!open_) return false;
  return emscripten_websocket_send_binary(handle_, const_cast<std::byte*>(frame.data()), static_cast<uint32_t>(frame.size())) == EMSCRIPTEN_RESULT_SUCCESS;
}

void Socket::close() {
  if (handle_ <= 0) return;
  // 이미 닫힌 소켓을 닫는 것은 아무 일도 아니다. delete 가 사건 콜백을 떼어 낸다
  emscripten_websocket_close(handle_, 1000, nullptr);
  emscripten_websocket_delete(handle_);
  handle_ = 0;
  open_ = false;
  events_ = {};
}

std::string page_host() {
  // 호스트 이름(DNS)은 253 바이트까지다
  char host[256];
  zk_page_host(host, sizeof host);
  return host;
}

}  // namespace engine::net
