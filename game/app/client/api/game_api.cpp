// 호스트(브라우저 주 스레드)가 부르는 RPC 표면 — VeilBind 가 이 파일을 읽어 TS 클라이언트와 네이티브 등록표를 만든다.
// 이 파일은 따로 컴파일되지 않고, 만들어진 등록표(.cpp)가 include 한다.
// 호스트는 화면 크기와 원시 입력만 넘긴다. 그 뜻을 정하는 것도, 화면에 무엇을 보일지도 모두 이쪽(C++)이다 —
// 게임의 상태를 호스트로 돌려보내 그쪽에서 그리게 하지 않는다.
//
// ceiling: 입력이 RPC 로 온다. Worker 에 닿는 시각으로 판정하므로 전달 지연만큼 판정이 밀린다.
// 판정 창(±50ms)에 견줘 지연이 보이면, 호스트가 입력에 시각을 찍어 공유 메모리 링으로 보내고 그 시각으로 판정한다.
#include <cstdint>

#include <veilbind/annotations.hpp>

#include "app/client/client.hpp"

namespace api {

// 그리는 버퍼 크기 (기기 픽셀)
VEILBIND_OPERATION("surface.resize")
bool resize(uint32_t width, uint32_t height) {
  return app::resize_surface(width, height);
}

// 포인터가 움직인 양 (CSS 픽셀)
VEILBIND_OPERATION("input.pointerMove")
bool pointer_move(double delta_x, double delta_y) {
  app::pointer_move(delta_x, delta_y);
  return true;
}

// 버튼을 눌렀다 (0 이 주 버튼) — 호스트에 해 달라는 일을 비트로 돌려준다 (1: 포인터를 잡아 달라)
VEILBIND_OPERATION("input.pointerPress")
uint32_t pointer_press(uint32_t button) {
  return app::pointer_press(button);
}

// 호스트가 포인터를 잡았거나 놓았다
VEILBIND_OPERATION("input.pointerCapture")
bool pointer_capture(bool captured) {
  app::pointer_capture(captured);
  return true;
}

}  // namespace api
