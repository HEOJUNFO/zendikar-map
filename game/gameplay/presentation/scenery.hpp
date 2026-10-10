#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string>
#include <vector>

#include "engine/asset/pack.hpp"
#include "engine/gpu/device.hpp"
#include "engine/hud/bitmap.hpp"
#include "gameplay/content/room_light.hpp"

namespace game {

/**
 * 받은 에셋 팩(public/wasm/game-assets.zkpack — tools/packc.mjs)에서 푼 장면의 재료: 방 표면의 타일 텍스처 배열, 소품의 텍스처 배열과 메시,
 * 손에 드는 무기의 텍스처 배열과 부품 메시, 하늘 그림, 방의 구운 빛(라이트맵·방향 맵과 프로브 — content/room_light.hpp).
 * 텍스처 배열은 묶음(타일·소품·무기)마다 둘이다 — 색(rgba8_srgb: 알파는 잎이면 잘라 낼 모양, 금속성 그림이 딸린 텍스처면 1 − 금속성, 그 밖에는 1)과
 * NAR(rgba8: rg 법선의 xy, b 거칠기 — engine/render/wgsl/include/surface_shade.wgsl). 둘의 층 번호는 같다.
 * 구운 빛은 틀마다 한 장이고 한꺼번에 올리지 않는다: 가 본 틀의 것만 올려 둔다 (틀마다 텍스처 하나 — 같은 틀의 방에 다시 들면 할 일이 없다). 다 푼 뒤에는 팩에서 구운 빛의 바이트만 남기고 나머지는 놓는다.
 * 방을 넘어갈 때의 일은 프레임에 나눈다: 포털에 닿으면 건너편 방의 틀을 알려 두고(prepare_room) 다음 프레임에 그 그림을 풀어(step_light) 방이 바뀌는 프레임에는 올리기만 한다 (light_room).
 * ceiling: 미리 알려 두지 않은 방(판의 첫 방), 또는 방이 바뀔 때까지 풀지 못한 그림(프레임이 아주 느릴 때)은 light_room 이 그 프레임에 푼다 — 그 프레임이 길어진다.
 * 판을 시작하는 프레임이 눈에 띄게 끊기면 메뉴에서 '시작'을 누르기 전에 첫 방(틀 0)을 미리 풀어 둔다.
 * 팩은 빌드에 묻히지 않고 실행 중에 온다 (조립 지점이 받아 넘긴다). 받은 것은 믿지 않는다 — 어긋나면 failed 가 되고 아무것도 그리지 않는다.
 * 푸는 일은 한 번에 하지 않고 step 마다 한 걸음씩 한다 (텍스처는 JPEG 풀기와, 밉을 만들어 GPU 에 올리기의 두 걸음) — 그동안에도 메뉴가 그려진다.
 * ceiling: 1024² 텍스처의 한 걸음이 한 프레임을 넘겨(풀기와 올리기를 한 걸음에 했을 때 잰 값이 45–65 ms) 받는 1 초쯤 동안 메뉴의 프레임이 끊기고,
 * 소리 블록이 늦어 장치가 조용히 지나가는 표본이 생긴다 (그동안 낼 소리는 없다). 텍스처가 늘거나 메뉴에 소리가 생겨 걸리면 JPEG 풀기를 MCU 줄 단위로
 * 나눠 여러 프레임에 걸치거나, GPU 가 바로 읽는 압축 형식(BC7·ASTC)으로 팩에 싣는다.
 * ceiling: 텍스처의 층 번호와 소품 번호는 방 메시(WASM)에 구워져 있고 팩에는 그 차례로만 들어 있다 — 팩과 WASM 이 다른 빌드의 것이면
 * (따로 캐시됐을 때) 알아채지 못하고 텍스처가 뒤바뀌어 보인다. 게임을 내보내게 되면 팩의 주소에 빌드마다 바뀌는 값을 넣어 함께 갱신되게 한다
 */
class Scenery {
 public:
  enum class State { empty, loading, ready, failed };

  /** 소품 하나의 메시 */
  struct Prop {
    engine::gpu::BufferHandle vertices;
    uint32_t vertex_count{};
    /** 양면을 다 그린다 (잎, 재질이 양면이라고 한 기물) */
    bool two_sided{};
    /** 텍스처의 알파로 잘라 낸다 (잎) */
    bool cutout{};
  };

  /** 받은 팩을 풀기 시작한다 (팩의 바이트를 넘겨받아 다 풀 때까지 든다). 앞서 올린 것은 장치에 남는다 — 실패한 뒤 다시 받았을 때만 다시 부른다 */
  void begin(std::vector<std::byte> pack);
  /** 받지 못했다 */
  void fail();
  /** 한 걸음 — 항목 하나를 풀거나, 푼 텍스처를 올린다. loading 인 동안 프레임마다 한 번 부른다. 마지막 항목 뒤에 ready, 어긋난 항목을 만나면 failed */
  void step(engine::gpu::Device& device);

  State state() const { return state_; }
  /** 타일 텍스처 배열 — 층 번호는 content/textures/textures.txt 의 차례 (방 메시의 정점이 그 번호를 쓴다). 색과 NAR */
  engine::gpu::TextureHandle tiles() const { return tiles_.texture; }
  engine::gpu::TextureHandle tile_nars() const { return tile_nars_.texture; }
  /** 소품 텍스처 배열 — 층 번호는 content/props/props.txt 의 texture 차례 */
  engine::gpu::TextureHandle prop_textures() const { return prop_textures_.texture; }
  engine::gpu::TextureHandle prop_nars() const { return prop_nars_.texture; }
  /** 소품 — 번호는 props.txt 의 prop 차례 (방 메시의 놓인 소품이 그 번호를 쓴다) */
  std::span<const Prop> props() const { return props_; }
  /** 무기 텍스처 배열 — 층 번호는 content/weapons/weapons.txt 의 texture 차례. 팩에 무기가 없으면 빈 핸들 */
  engine::gpu::TextureHandle weapon_textures() const { return weapon_textures_.texture; }
  engine::gpu::TextureHandle weapon_nars() const { return weapon_nars_.texture; }
  /** 무기의 부품 — 번호는 weapons.txt 의 part 차례. 모두 같은 틀(손잡이가 원점, 총구가 -z)에 놓여 있다 */
  std::span<const Prop> weapon_parts() const { return weapon_parts_; }
  /** Authored, textured flight poses share two material layers (body and mouth/parts). */
  static constexpr uint32_t BAT_FRAME_COUNT = 8;
  engine::gpu::TextureHandle creature_textures() const { return creature_textures_.texture; }
  engine::gpu::TextureHandle creature_nars() const { return creature_nars_.texture; }
  std::span<const Prop> bat_frames() const { return bat_frames_; }
  enum Creature : uint32_t { CHARGER, CASTER, SPIDER, BOSS, CREATURE_COUNT };
  static constexpr uint32_t CREATURE_FRAME_COUNT = 8;
  static constexpr uint32_t CREATURE_ATTACK_OFFSET = CREATURE_FRAME_COUNT, CREATURE_DEATH_FRAME = 2 * CREATURE_FRAME_COUNT, CREATURE_POSE_COUNT = CREATURE_DEATH_FRAME + 1;
  /** Evaluated poses from the asset authors' rigged animation clips, uploaded once and shared. */
  std::span<const Prop> creature_frames(Creature creature) const { return creature_frames_[creature]; }
  /** 하늘 그림 (등장방형, 화면 값 그대로의 rgba8) 과 그 높이(픽셀). 팩에 없으면 빈 핸들 */
  engine::gpu::TextureHandle sky() const { return sky_; }
  uint32_t sky_height() const { return sky_height_; }

  /** 방 하나의 구운 빛 — 그 틀의 라이트맵·방향 맵과 프로브 (틀의 좌표). 없으면(팩이 어긋났다) nullptr·빈 핸들이고, 그 방은 가리는 것 없는 빛으로 그린다 */
  struct RoomLights {
    const RoomLight* body{};
    engine::gpu::TextureHandle body_map;
    engine::gpu::TextureHandle body_direction;
  };
  /** 곧 들어설 방의 틀을 알린다 — 그 틀의 구운 빛을 step_light 가 미리 풀어 둔다. 같은 틀을 거듭 알려도 된다 */
  void prepare_room(uint8_t shape);
  /** 알려 둔 틀의 그림을 한 번 푼다 (QOI 둘 — 라이트맵과 방향 맵). 다음 호출은 다른 틀을 알려 주기 전까지 아무 일도 하지 않는다 */
  void step_light();
  /** 그 틀의 구운 빛을 올려 둔다 — 이미 그 틀이면 아무 일도 없다. 미리 풀어 둔 것은 올리기만 하고, 안 푼 것은 여기서 푼다. ready 인 동안 프레임마다 그리기 전에 부른다 */
  void light_room(engine::gpu::Device& device, uint8_t shape);
  /** light_room 이 올려 둔 것 */
  const RoomLights& room_lights() const { return lights_; }

 private:
  /** 같은 크기의 그림을 층으로 쌓는 텍스처 배열 — 첫 그림이 크기를 정한다 */
  struct Layers {
    engine::gpu::TextureHandle texture;
    uint32_t side{};
    uint32_t count{};
    uint32_t filled{};
    /** 색이 아닌 값 (NAR) — 선형 형식으로 올리고 밉도 값을 그대로 평균한다 */
    bool linear{};
  };
  /** 알파에 무엇을 싣는가 — 없음(1), 잘라 낼 모양(회색 그림 그대로), 금속성(회색 그림을 뒤집어: 1 − 금속성) */
  enum class Alpha { none, mask, metal };
  /** JPEG(과 알파에 실을 회색 그림)을 풀어 staged_ 에 둔다 — 다음 걸음에 upload_layer 가 올린다 */
  bool decode_layer(Layers& layers, std::span<const std::byte> jpeg, std::span<const std::byte> gray, Alpha alpha);
  /** staged_ 의 그림을 밉과 함께 그 배열의 다음 층에 올린다 */
  bool upload_layer(engine::gpu::Device& device);
  /** 틀 하나의 구운 빛이 올라가는 자리 — 텍스처는 처음 그 틀의 방에 들 때 한 번 만든다 */
  struct LightSlot {
    engine::gpu::TextureHandle texture;
    engine::gpu::TextureHandle direction;
    bool loaded{};
    RoomLight light;
  };
  /** 미리 푸는 틀 */
  struct Staged {
    enum class State { pending, decoded, uploaded, failed };
    State state{State::pending};
    RoomLight light;
    std::optional<engine::hud::Bitmap> pixels;
    std::optional<engine::hud::Bitmap> direction;
  };
  std::span<const std::byte> light_bytes(const std::string& name) const;
  /** 다 푼 뒤 — 구운 빛의 항목만 남긴다 */
  void keep_lights();

  State state_{State::empty};
  std::vector<std::byte> bytes_;
  std::vector<engine::asset::PackEntry> entries_;
  std::size_t next_{};
  Layers tiles_;
  Layers prop_textures_;
  Layers weapon_textures_;
  Layers creature_textures_;
  Layers tile_nars_{{}, 0, 0, 0, true};
  Layers prop_nars_{{}, 0, 0, 0, true};
  Layers weapon_nars_{{}, 0, 0, 0, true};
  Layers creature_nars_{{}, 0, 0, 0, true};
  // 풀어 두고 아직 올리지 않은 그림과, 그것이 올라갈 배열
  std::optional<engine::hud::Bitmap> staged_;
  Layers* staged_into_{};
  std::vector<Prop> props_;
  std::vector<Prop> weapon_parts_;
  std::vector<Prop> bat_frames_;
  std::array<std::vector<Prop>, CREATURE_COUNT> creature_frames_;
  // 하늘 — 푼 그림을 다음 걸음에 올린다
  std::optional<engine::hud::Bitmap> staged_sky_;
  engine::gpu::TextureHandle sky_;
  uint32_t sky_height_{};
  // 구운 빛 — 틀마다 한 자리
  std::array<LightSlot, SHAPE_COUNT> body_slots_;
  RoomLights lights_;
  /** 올라 있는 틀과 미리 푸는 틀. 없으면 -1 */
  int lit_{-1};
  int staged_room_{-1};
  Staged staged_light_;
};

}  // namespace game
