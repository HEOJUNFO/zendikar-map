#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string>
#include <vector>

#include "engine/foundation/math.hpp"
#include "gameplay/domain/dungeon.hpp"

// 방의 구운 빛 — 라이트 베이커(app/lightbake)가 빌드 때 굽고, 에셋 팩에 실려 와 화면(presentation)이 읽는다. 시뮬레이션은 쓰지 않는다.
// 방은 닫힌 실내라 빛이 창(뚫린 창, 색유리, 천장의 채광 구멍)과 틀에 적은 점광원으로만 든다. 문은 포털이라 빛이 새지 않는다 — 문이 났든 안 났든 틀의 빛이 같다.
// 그래서 **틀마다 한 장**만 굽는다 (예전에는 열린 마당이라 문 조합마다 그림자가 달라 틀마다 열두 장이었다): 틀의 좌표에서. 문틀 속은 틀에 지어 둔 막힌 벽감이다.
// 방은 틀을 돌려 놓는다 (Room::turn) — 구운 빛도 틀과 함께 돈다. 해의 방향은 틀의 좌표에 묶여 있으므로 화면은 방마다 해(프로브로 비추는 것의 볕)와 하늘 그림을 같은 만큼 돌린다
// (presentation/light.hpp 의 room_sun, stage_view 의 하늘) — 창 밖에 보이는 해와 바닥의 빛 조각이 어느 방에서나 맞는다. 방들은 한 공간에 있지 않아 방마다 해의 쪽이 달라도 어긋나지 않는다.
// 문 자리(벽감)에 서는 막음돌(sealed)과 움직이는 석판(gate)은 굽지 않는다 — 프로브로 비춘다 (그림자도 드리우지 않는다).
namespace game {

/** 한 점의 빛 — 라이트맵이 없는 것(소품, 적, 석판, 손에 든 것)을 비춘다 (engine/bake/lightbake.hpp 의 Probe) */
struct LightProbe {
  /** 위를 보는 면이 받는 하늘빛과 되비친 빛, 아래를 보는 면이 받는 빛 */
  float up[3]{};
  float down[3]{};
  /** 해가 보이는 정도 0…1 */
  float sun{};
};

/** 에셋 팩의 항목 이름 — "light/<틀>" */
std::string room_light_name(uint8_t shape);

/**
 * 움직이는 것을 비추는 두 층의 프로브 격자 — x,z 간격 1.5 m, 높이 1.2·4.7 m.
 * 층 → z 줄 → x 칸 순서이며 높이 사이에서도 빛을 선형 보간한다.
 * 방 밖의 점(벽 속, ㄱ·십자·T 자의 빈 귀)은 구울 때 가장 가까운 방 안의 점의 값으로 채워 둔다 — 벽 가까이의 적이 벽 너머(바깥의 볕)의 빛을 끌어오지 않는다
 */
inline constexpr uint32_t GRID_SIDE = 21;
inline constexpr float GRID_REACH = 15.0f;
inline constexpr float GRID_HEIGHT = 1.2f;
inline constexpr uint32_t GRID_PLANES = 2;
inline constexpr uint32_t GRID_PLANE_SIZE = GRID_SIDE * GRID_SIDE;
inline constexpr uint32_t GRID_COUNT = GRID_PLANES * GRID_PLANE_SIZE;
inline constexpr float GRID_LEVEL_HEIGHT = 3.5f;

/**
 * 구운 틀 하나 (.zklight, 리틀 엔디언): 'ZKL3' · u32 라이트맵 너비 · u32 높이 · u32 놓인 소품 수 · u32 격자 점 수(GRID_COUNT) · u32 라이트맵 QOI 바이트 수 · u32 방향 맵 QOI 바이트 수
 *   · 프로브 f32 × 7 (위 rgb, 아래 rgb, 해) 씩 — 소품마다(메시의 placements 차례), 이어서 격자 점마다 · 라이트맵 QOI (rgba8, 채널마다 sqrt(빛 ÷ 4))
 *   · 방향 맵 QOI (같은 크기의 rgba8 — rgb 빛이 주로 오는 쪽(틀의 좌표) × ½ + ½, a 한쪽으로 쏠린 정도. engine/bake/lightbake.hpp — 법선 맵의 요철을 구운 빛에 잇는다)
 * 아무 데서도 읽히지 않는 텍셀(조각 밖, 다른 도형에 묻힌 면)은 앞 텍셀의 값으로 적혀 있다 — 줄로 눌린다
 */
struct RoomLight {
  uint32_t width{};
  uint32_t height{};
  std::vector<LightProbe> placements;
  std::vector<LightProbe> grid;
  /** 라이트맵과 방향 맵 (QOI) — decode 에 넘긴 바이트를 가리킨다 */
  std::span<const std::byte> lightmap;
  std::span<const std::byte> direction;

  /** 받은 것은 믿지 않는다 — 길이·수·숫자가 어긋나면 nullopt */
  static std::optional<RoomLight> decode(std::span<const std::byte> bytes);
  static std::vector<std::byte> encode(uint32_t width, uint32_t height, std::span<const LightProbe> placements, std::span<const LightProbe> grid, std::span<const std::byte> qoi,
                                       std::span<const std::byte> direction_qoi);

  /** 격자에서 그 자리(틀의 좌표)의 빛 (두 높이의 x, z 격자 사이를 삼선형 보간, 격자 밖은 가장자리 값). 격자가 없으면 fallback */
  LightProbe at(engine::Vec3 position, const LightProbe& fallback) const;
};

}  // namespace game
