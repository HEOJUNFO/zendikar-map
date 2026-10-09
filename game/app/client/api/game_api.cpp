// 호스트(브라우저 주 스레드)가 부르는 RPC 표면 — VeilBind 가 이 파일을 읽어 TS 클라이언트와 네이티브 등록표를 만든다.
// 이 파일은 따로 컴파일되지 않고, 만들어진 등록표(.cpp)가 include 한다.
// 호스트는 화면 크기와 원시 입력, 소리 출력의 상태만 넘긴다. 그 뜻을 정하는 것도, 화면에 무엇을 보일지도 모두 이쪽(C++)이다 —
// 게임의 상태를 호스트로 돌려보내 그쪽에서 그리게 하지 않는다.
//
// 박자에 묶인 입력(버튼, 글쇠)에는 호스트가 그 사건이 일어난 시각을 찍어 보낸다 (time_ms — 1970 년부터의 ms: performance.timeOrigin + event.timeStamp).
// 입력은 RPC 로 와서 전달 지연과 Worker 가 바쁜 동안만큼 늦게 닿는다 — 판정은 닿은 때가 아니라 그 시각(누른 때)으로 한다. 너무 늦게 닿은 누름은 박자 행동이 되지 않는다.
// 포인터 이동·휠·화면 크기·소리 상태는 호스트가 앞의 호출이 끝날 때까지 합쳐 두었다가 한 번에 보낸다 (host/coalesce.ts — 쌓여 밀리지 않는다).
#include <cstdint>
#include <string>

#include <veilbind/annotations.hpp>

#include "app/client/client.hpp"

namespace api {

// 그리는 버퍼 크기 (기기 픽셀)
VEILBIND_OPERATION("surface.resize")
bool resize(uint32_t width, uint32_t height) {
  return app::resize_surface(width, height);
}

// 버튼·글쇠 입력은 호스트에 해 달라는 일을 비트로 돌려준다 (1: 포인터를 잡아 달라, 2: 소리 출력을 켜 달라, 4: 옵션의 글을 받아 가 저장해 달라).
// 앞의 둘은 사용자 동작에 이어서만 되는 일이라, 셋째는 옵션이 입력으로만 바뀌어서 그 입력의 답으로 준다 (타이머로 묻지 않는다).

// 포인터가 움직였다 — (x, y) 는 캔버스 안의 자리 (그리는 버퍼의 픽셀, 포인터가 잡힌 동안은 뜻이 없다), delta 는 움직인 양 (CSS 픽셀)
VEILBIND_OPERATION("input.pointerMove")
bool pointer_move(double x, double y, double delta_x, double delta_y) {
  app::pointer_move(x, y, delta_x, delta_y);
  return true;
}

// 포인터가 화면을 떠났다 (inside 가 false) — 돌아온 것은 다음 pointerMove 가 알린다
VEILBIND_OPERATION("input.pointerInside")
bool pointer_inside(bool inside) {
  if (!inside) app::pointer_leave();
  return true;
}

// 버튼을 눌렀다·뗐다 (0 이 주 버튼)
VEILBIND_OPERATION("input.pointerPress")
uint32_t pointer_press(uint32_t button, double time_ms) {
  return app::pointer_press(button, time_ms);
}

VEILBIND_OPERATION("input.pointerRelease")
uint32_t pointer_release(uint32_t button) {
  return app::pointer_release(button);
}

// 휠 — 브라우저의 WheelEvent.deltaY 와 deltaMode 그대로 (0 픽셀, 1 줄, 2 쪽)
VEILBIND_OPERATION("input.wheel")
bool wheel(double delta_y, uint32_t mode) {
  app::wheel(delta_y, mode);
  return true;
}

// 글쇠를 눌렀거나 뗐다 — 브라우저의 KeyboardEvent 그대로: code 는 자판의 자리 이름, key 는 그 글쇠가 내는 글자나 이름,
// modifiers 는 함께 눌린 보조 글쇠 (1 Shift, 2 Ctrl, 4 Alt, 8 Meta), repeat 는 누르고 있어 되풀이된 것
VEILBIND_OPERATION("input.key")
uint32_t key(std::string code, std::string key, uint32_t modifiers, bool pressed, bool repeat, double time_ms) {
  return app::key(code, key, modifiers, pressed, repeat, time_ms);
}

// 호스트가 포인터를 잡았거나 놓았다
VEILBIND_OPERATION("input.pointerCapture")
bool pointer_capture(bool captured) {
  app::pointer_capture(captured);
  return true;
}

// 소리 출력(AudioContext)의 상태가 바뀌었다 — 도는지(브라우저는 사용자가 무언가 누른 뒤에야 돌린다), 표본율(Hz),
// 써 넣은 소리가 들릴 때까지의 지연(초 — baseLatency 와 outputLatency). 소리 자체는 이 길로 오가지 않는다:
// 호스트는 출력에 이어진 핸들을 캔버스와 함께 넘겼고, 게임이 그 핸들에 직접 쓴다 (engine/audio/port)
VEILBIND_OPERATION("audio.state")
bool audio_state(bool running, double sample_rate, double base_latency, double output_latency) {
  app::audio_state(running, sample_rate, base_latency, output_latency);
  return true;
}

// 저장 — 옵션은 게임이 짧은 글로 적고 읽는다 (presentation/menu.hpp 의 encode_options·decode_options). 호스트는 그 글의 뜻을 모르는 채
// 한 곳(localStorage 의 한 키)에 간직했다가, 다음에 띄울 때 그대로 돌려줄 뿐이다. 간직할 곳이 막혀 있으면(시크릿 창) 아무 일도 없다 — 게임은 기본값으로 뜬다.

// 띄운 직후 한 번 — 간직해 둔 글을 넘긴다. 게임은 그 글을 믿지 않는다: 어긋나면 버리고 false
VEILBIND_OPERATION("options.load")
bool options_load(std::string text) {
  return app::load_options(text);
}

// 입력의 답에 4 가 실렸을 때 — 지금 저장할 글을 받아 간다
VEILBIND_OPERATION("options.text")
std::string options_text() {
  return app::options_text();
}

}  // namespace api
