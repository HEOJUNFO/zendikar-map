#include "gameplay/content/assets.hpp"

namespace game::assets {
namespace {

constexpr unsigned char ROOM_START[] = {
#embed "room_start.meshbin"
};
constexpr unsigned char ROOM_HALL[] = {
#embed "room_hall.meshbin"
};
constexpr unsigned char ROOM_NAVE[] = {
#embed "room_nave.meshbin"
};
constexpr unsigned char ROOM_ELL[] = {
#embed "room_ell.meshbin"
};
constexpr unsigned char ROOM_CROSS[] = {
#embed "room_cross.meshbin"
};
constexpr unsigned char ROOM_TEE[] = {
#embed "room_tee.meshbin"
};
constexpr unsigned char SEALED[] = {
#embed "sealed.meshbin"
};
constexpr unsigned char GATE[] = {
#embed "gate.meshbin"
};
constexpr unsigned char ENEMY_BOLT[] = {
#embed "enemy_bolt.meshbin"
};
constexpr unsigned char SKYCLAVE_BACKDROP[] = {
#embed "skyclave_backdrop.meshbin"
};
constexpr unsigned char HUD_FONT[] = {
#embed "hud.fontbin"
};
constexpr unsigned char SAMPLE_BANK[] = {
#embed "samples.samplebank"
};
constexpr unsigned char PULSE_SONG[] = {
#embed "pulse.song"
};
#ifdef ZK_HAS_MENU_BACKGROUND
constexpr unsigned char MENU_BACKGROUND[] = {
#embed "menu_background.qoi"
};
#endif

}  // namespace

std::span<const std::byte> room(unsigned shape) {
  switch (shape) {
    case 0: return std::as_bytes(std::span{ROOM_START});
    case 1: return std::as_bytes(std::span{ROOM_HALL});
    case 2: return std::as_bytes(std::span{ROOM_NAVE});
    case 3: return std::as_bytes(std::span{ROOM_ELL});
    case 4: return std::as_bytes(std::span{ROOM_CROSS});
    case 5: return std::as_bytes(std::span{ROOM_TEE});
    default: return {};
  }
}
std::span<const std::byte> sealed() { return std::as_bytes(std::span{SEALED}); }
std::span<const std::byte> gate() { return std::as_bytes(std::span{GATE}); }
std::span<const std::byte> enemy_bolt() { return std::as_bytes(std::span{ENEMY_BOLT}); }
std::span<const std::byte> skyclave_backdrop() { return std::as_bytes(std::span{SKYCLAVE_BACKDROP}); }
std::span<const std::byte> hud_font() { return std::as_bytes(std::span{HUD_FONT}); }

std::span<const std::byte> sample_bank() { return std::as_bytes(std::span{SAMPLE_BANK}); }
std::span<const std::byte> pulse_song() { return std::as_bytes(std::span{PULSE_SONG}); }

std::span<const std::byte> menu_background() {
#ifdef ZK_HAS_MENU_BACKGROUND
  return std::as_bytes(std::span{MENU_BACKGROUND});
#else
  return {};
#endif
}

}  // namespace game::assets
