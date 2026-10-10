#pragma once

#include <array>
#include <cstdint>
#include <span>

#include "engine/foundation/color.hpp"
#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"
#include "engine/spatial/surface_mesh.hpp"

namespace engine {

/**
 * 놓인 겉면 메시 하나 — 모델 공간 → 세계의 3×4 행렬을 줄 셋으로 (wgsl/surface.wgsl 의 @location(6)…(8)). 크기는 축마다 같아야 한다.
 * 빛은 둘 가운데 하나: 구운 것(light_down 의 넷째가 1 — SurfaceDraw 의 lightmap 을 읽는다)이거나 그 자리의 프로브(위·아래 빛과 해가 보이는 정도)
 */
struct SurfaceInstance {
  std::array<float, 4> x, y, z;
  /** rgb 위를 보는 면이 받는 빛, 넷째는 해가 보이는 정도 0…1 */
  std::array<float, 4> light_up{};
  /** rgb 아래를 보는 면이 받는 빛, 넷째가 1 이면 프로브 대신 라이트맵 */
  std::array<float, 4> light_down{};

  /** 열 우선 4×4 에서 (맨 아랫줄은 버린다) */
  static constexpr SurfaceInstance from(const Mat4& m) {
    return {{m.m[0], m.m[4], m.m[8], m.m[12]}, {m.m[1], m.m[5], m.m[9], m.m[13]}, {m.m[2], m.m[6], m.m[10], m.m[14]}, {}, {}};
  }
};

/** 겉면들을 어떻게 볼지 */
struct SurfaceView {
  Mat4 view_proj;
  /** 안개 색 — 화면에 낼 값 그대로 (하늘을 지우는 색과 같은 값을 준다) */
  Color fog;
  /** 안개가 다 덮는 거리 */
  float fog_distance;
  /** 빛나는 색의 세기 (1 이 본래 세기) */
  float glow;
  /** 1 이면 그대로. 1 보다 작으면 그만큼 앞으로 당겨 그린다 (손에 든 것이 벽에 묻히지 않게) */
  float depth_scale{1.0f};
  /** 해가 있는 쪽 (길이 1) 과 해의 빛 — 프로브로 비추는 인스턴스에 쓴다 (라이트맵을 구운 해와 같아야 한다) */
  Vec3 sun_direction{0.0f, 1.0f, 0.0f};
  Vec3 sun_light{};
  /** 눈의 자리 (세계) — 반사광과 색유리의 밝기가 보는 쪽에 따라 달라진다 */
  Vec3 eye{};
};

/** 그리기 호출 하나 — 메시 하나를 인스턴스 버퍼의 한 구간만큼 */
struct SurfaceDraw {
  gpu::BufferHandle vertices;
  uint32_t vertex_count;
  /** 정점의 layer 가 가리키는 텍스처 배열 (rgba8_srgb, 층이 있는 텍스처) — 색. 알파는 불투명한 겉에서는 1 − 금속성, two_sided 인 겉에서는 잘라 낼 모양 */
  gpu::TextureHandle albedo;
  /** 같은 층 번호의 NAR 배열 (rgba8, 층이 있는 텍스처) — rg 접선 공간 법선의 xy, b 거칠기. 빈 핸들이면 평평하고 거친 겉으로 그린다 */
  gpu::TextureHandle nar;
  /** 정점의 lightmap 좌표로 읽는 라이트맵 (rgba8, 채널마다 sqrt(빛 ÷ 4) — engine/bake/lightbake). 구운 빛을 쓰는 인스턴스가 없으면 빈 핸들 */
  gpu::TextureHandle lightmap;
  /** 같은 좌표로 읽는 방향 맵 (rgba8 — rgb 빛이 주로 오는 쪽(메시의 좌표) × ½ + ½, a 한쪽으로 쏠린 정도). 없으면 빈 핸들 (요철 없이 라이트맵 그대로) */
  gpu::TextureHandle direction;
  /** 양면을 다 그린다. 끄면 뒤를 보는 면을 버린다 */
  bool two_sided;
  /** 알파로 잘라 낸다 (잎) — 잘라 내는 셰이더로 양면을 다 그린다. 끄면 프래그먼트를 버리지 않는다 (가려진 픽셀을 깊이로 먼저 거른다 — albedo 의 알파는 1 − 금속성으로 읽는다) */
  bool cutout{};
  uint32_t first_instance;
  uint32_t instance_count;
};

/**
 * 텍스처를 입힌 메시(SurfaceVertex)를 인스턴스로 그린다 — 방의 조각과 소품처럼 같은 메시를 여러 자리에 놓는 것.
 * 메시의 정점 버퍼와 텍스처는 부르는 쪽이 만들어 들고 있고, 여기는 파이프라인·샘플러·프레임 값과 인스턴스 버퍼를 갖는다
 */
class SurfaceBatch {
 public:
  /** capacity: 한 프레임에 그리는 인스턴스의 상한 */
  bool create(gpu::Device& device, ShaderLibrary& shaders, uint32_t capacity);
  /** 겉면 메시의 정점을 올린다 (그 뒤로 SurfaceDraw 에 쓴다). 비었거나 못 올리면 빈 핸들 */
  static gpu::BufferHandle upload(gpu::Device& device, std::span<const SurfaceVertex> vertices);
  /**
   * begin_frame 과 end_frame 사이에서, 프레임마다 많아야 한 번 (프레임 값과 인스턴스 버퍼가 하나다 — 보는 법이 다른 것은 묶음을 따로 둔다) — instances 를 올리고 draws 를 차례로 그린다.
   * capacity 를 넘는 인스턴스는 그리지 않는다
   */
  void draw(gpu::Device& device, const SurfaceView& view, std::span<const SurfaceInstance> instances, std::span<const SurfaceDraw> draws);

 private:
  gpu::PipelineHandle pipeline_;
  gpu::PipelineHandle two_sided_pipeline_;
  gpu::PipelineHandle cutout_pipeline_;
  gpu::BufferHandle frame_uniforms_;
  gpu::BufferHandle instances_;
  gpu::SamplerHandle albedo_sampler_;
  gpu::SamplerHandle lightmap_sampler_;
  // 빈 핸들 대신 거는 것 — 흰 라이트맵, 쏠림 없는 방향 맵, 평평하고 거친 NAR
  gpu::TextureHandle white_;
  gpu::TextureHandle undirected_;
  gpu::TextureHandle flat_nar_;
  uint32_t capacity_{};
};

}  // namespace engine
