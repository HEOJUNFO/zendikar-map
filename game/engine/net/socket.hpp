#pragma once

#include <cstddef>
#include <cstdint>
#include <span>
#include <string>

// 소켓 — 바이트 프레임을 주고받는 연결 하나 (브라우저의 WebSocket, 바이너리 프레임). 프레임에 무엇이 담겼는지는 모른다.
// 사건(열림·프레임·닫힘)은 브라우저의 소켓 사건이 올 때 그대로 불린다 — 상태를 물어 보며 기다리지 않는다.
namespace engine::net {

/** 소켓의 사건을 받는 쪽 — user 는 open 에 넘긴 값 그대로 */
struct SocketEvents {
  /** 연결이 열렸다 — 이제 보낼 수 있다 */
  void (*opened)(void* user);
  /** 바이너리 프레임 하나가 왔다. frame 은 이 부름 동안만 살아 있다 */
  void (*frame)(std::span<const std::byte> frame, void* user);
  /** 연결이 닫혔다 (못 열린 것도 이리로 온다) — code 는 WebSocket 닫기 코드 (못 열렸거나 갑자기 끊기면 1006). 이 뒤로는 사건이 오지 않고 소켓은 닫힌 상태다 */
  void (*closed)(uint16_t code, void* user);
  void* user;
};

class Socket {
 public:
  Socket() = default;
  ~Socket() { close(); }
  Socket(const Socket&) = delete;
  Socket& operator=(const Socket&) = delete;

  /** url(ws:// 또는 wss://)에 붙기 시작한다 — 열려 있던 연결은 먼저 닫는다. 시작하지 못하면 false (사건은 오지 않는다) */
  bool open(const char* url, SocketEvents events);
  /** 프레임 하나를 보낸다. 열리기 전이거나 닫혔으면 false */
  bool send(std::span<const std::byte> frame);
  /** 연결을 닫는다 — 이쪽에서 닫은 것은 closed 사건으로 알리지 않는다 */
  void close();
  /** 붙는 중이거나 열려 있다 */
  bool active() const { return handle_ > 0; }

 private:
  // Emscripten 의 소켓 번호 — 0 이면 없다
  int handle_{};
  bool open_{};
  SocketEvents events_{};

  friend struct SocketCallbacks;
};

/**
 * 이 코드를 받아 온 페이지의 호스트 이름 (예: localhost) — 같은 기기에서 도는 서버의 주소를 만들 때 쓴다.
 * 알 수 없으면 빈 글
 */
std::string page_host();

}  // namespace engine::net
