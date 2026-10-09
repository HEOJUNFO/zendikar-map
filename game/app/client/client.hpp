#pragma once

#include <cstdint>

// 클라이언트 조립 지점 — 엔진과 게임플레이가 만나는 곳은 app/ 뿐이다.
// 아래는 RPC 표면(api/game_api.cpp)이 부르는 것들이다. 클라이언트가 서기 전에 불리면 아무 일도 하지 않는다.
namespace app {

bool resize_surface(uint32_t width, uint32_t height);
void pointer_move(double delta_x, double delta_y);
/** 호스트에 해 달라는 일 (gameplay/input/pointer_controls.hpp 의 HOST_*) */
uint32_t pointer_press(uint32_t button);
void pointer_capture(bool captured);

}  // namespace app
