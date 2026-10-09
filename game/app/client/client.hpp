#pragma once

#include <cstdint>
#include <string>
#include <string_view>

// 클라이언트 조립 지점 — 엔진과 게임플레이가 만나는 곳은 app/ 뿐이다.
// 아래는 RPC 표면(api/game_api.cpp)이 부르는 것들이다. 클라이언트가 서기 전에 불리면 아무 일도 하지 않는다.
namespace app {

// 버튼·글쇠 입력은 호스트에 해 달라는 일(gameplay/input/controls.hpp 의 HOST_* — 포인터 잡기, 소리 켜기, 옵션 저장)을 돌려준다.
// 조준 중(게임 중에 포인터가 잡힌 상태)의 입력은 게임 조작으로, 그 밖에는 메뉴(HUD 의 위젯)로 간다.
bool resize_surface(uint32_t width, uint32_t height);
/** (x, y) 는 화면에서의 자리 (그리는 버퍼의 픽셀), delta 는 움직인 양 (CSS 픽셀) */
void pointer_move(double x, double y, double delta_x, double delta_y);
void pointer_leave();
/** time_ms 는 그 사건이 일어난 시각 (1970 년부터의 ms — 호스트의 performance.timeOrigin + event.timeStamp). 박자 판정을 누른 때로 한다 */
uint32_t pointer_press(uint32_t button, double time_ms);
uint32_t pointer_release(uint32_t button);
/** delta_y 와 mode 는 브라우저의 WheelEvent.deltaY·deltaMode 그대로 */
void wheel(double delta_y, uint32_t mode);
void pointer_capture(bool captured);
/** 호스트의 소리 출력이 도는지와 그 표본율(Hz), 지연(초 — AudioContext 의 baseLatency·outputLatency) */
void audio_state(bool running, double sample_rate, double base_latency, double output_latency);
/** code 는 자판의 자리 이름 (KeyW …), key 는 그 글쇠가 내는 글자나 이름, modifiers 는 engine::hud 의 KEY_* 비트, time_ms 는 pointer_press 와 같다 */
uint32_t key(std::string_view code, std::string_view key, uint32_t modifiers, bool pressed, bool repeat, double time_ms);
/**
 * 호스트가 간직해 둔 옵션의 글을 넘긴다 (띄운 직후 한 번) — 게임이 적은 글(options_text)을 호스트가 뜻을 모르는 채 그대로 돌려주는 것이다.
 * 믿을 수 없는 글로 읽는다: 어긋나면 아무것도 고치지 않고 false. 클라이언트가 서기 전에 와도 서자마자 적용된다
 */
bool load_options(std::string_view text);
/** 지금 저장할 글 — 입력의 답에 HOST_SAVE_OPTIONS 가 실렸을 때 호스트가 받아 가 간직한다. 클라이언트가 서기 전이면 빈 글 */
std::string options_text();

}  // namespace app
