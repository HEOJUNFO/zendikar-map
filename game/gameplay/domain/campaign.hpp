// Generated from validated map era/region references by game/tools/campaign.mjs.
#pragma once
#include <array>
#include <string_view>
namespace game::campaign {
inline constexpr unsigned ACT = 1, SAGA = 1, PHASE_COUNT = 3;
inline constexpr std::string_view TITLE = "1막 · 에메리아 하층 폐허 원정";
struct Stage { std::string_view set, focus; };
inline constexpr std::array<Stage, PHASE_COUNT> STAGES{{
  {"ZEN", "엘드라지 해방 전 위험한 젠디카르의 탐험"},
  {"WWK", "격화된 탁류를 뚫고 타짐에서 원정을 계속"},
  {"ROE", "정사 엘드라지 해방 이후 원정대의 생존과 탈출"},
}};
inline constexpr std::array<std::string_view, 5> CREATURE_NAMES{{"river-boa", "living-tsunami", "timbermaw-larva", "sky-ruin-drake", "roil-elemental"}};
}
