#pragma once

#include <array>
#include <cstdint>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"

namespace engine {

/** 스프라이트 하나 — wgsl/sprite.wgsl 의 인스턴스 (@location 1…5) */
struct Sprite {
  /** 가운데 (m) */
  Vec3 center;
  /** 너비 (m) — 빌보드면 정사각형의 변 */
  float size;
  /** 늘이는 축 (0 이면 눈을 보는 빌보드)과 그 쪽의 길이 (m) */
  Vec3 axis{};
  float length{};
  /** 텍스처 배열의 층, 그 층의 격자에서 몇째 칸(플립북의 프레임 — 소수는 버린다), 격자의 열·행 수 */
  float layer{};
  float frame{};
  float columns{1.0f};
  float rows{1.0f};
  /** 입히는 색 (화면 값 0…1)과 불투명도(섞을 때) · 세기(더할 때 — 1 을 넘어도 된다) */
  float red{1.0f}, green{1.0f}, blue{1.0f}, alpha{1.0f};
  /** 화면에서 돌린 각 (라디안 — 빌보드만) */
  float rotation{};
  /** 빛처럼 더해 그린다 (켜지 않으면 알파로 섞는다) */
  bool additive{};
};

/** 스프라이트를 어떻게 볼지 — 눈의 변환, 오른쪽·위(길이 1), 자리, 안개 */
struct SpriteView {
  Mat4 view_proj;
  Vec3 right, up, eye;
  Vec3 fog_color;
  float fog_distance;
};

/**
 * 장면 속 스프라이트 — 같은 크기의 RGBA 그림 몇 장(층)을 텍스처 배열로 올려 두고(밉과 함께), 프레임마다 받은 스프라이트를 그린다.
 * 깊이를 견주되 쓰지 않는다 (불투명한 것을 다 그린 뒤에 부른다). 섞는 것은 먼 것부터 차례로 그리고, 더하는 것은 그 뒤에 한꺼번에 그린다
 */
class SpriteBatch {
 public:
  static constexpr uint32_t CAPACITY = 2048;
  /** 밉 단계 — 칸이 작은 플립북(128²)에서 이웃 칸이 번져 들지 않게 다섯 단계까지 */
  static constexpr uint32_t MIP_LEVELS = 5;

  bool create(gpu::Device& device, ShaderLibrary& shaders);
  /** 층들을 올린다 — 모두 size × size 의 RGBA (윗줄부터). 다시 부르면 갈아 끼운다. 실패하면 false 이고 그리지 않는다 */
  bool upload(gpu::Device& device, uint32_t size, std::span<const std::span<const std::byte>> layers);
  bool ready() const { return static_cast<bool>(atlas_); }
  /** begin_frame 과 end_frame 사이, 장면 패스에서. CAPACITY 를 넘는 것은 그리지 않는다 */
  void draw(gpu::Device& device, const SpriteView& view, std::span<const Sprite> sprites);

 private:
  struct Instance {
    std::array<float, 4> center, axis, cell, tint, extra;
  };
  gpu::PipelineHandle blend_pipeline_, add_pipeline_;
  gpu::BufferHandle frame_uniforms_, corners_, instances_;
  gpu::SamplerHandle sampler_;
  gpu::TextureHandle atlas_;
  std::vector<Instance> upload_;
  std::vector<uint32_t> order_;
};

}  // namespace engine
