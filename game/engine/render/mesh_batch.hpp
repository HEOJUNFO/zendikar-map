#pragma once

#include <cstdint>
#include <span>

#include "engine/foundation/color.hpp"
#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"
#include "engine/spatial/static_mesh.hpp"

namespace engine {

/** 메시 하나를 어떻게 그릴지 */
struct MeshView {
  Mat4 view_proj;
  /** 모델 공간 → 세계 */
  Mat4 model;
  Color fog;
  /** 안개가 다 덮는 거리 */
  float fog_distance;
  /** 빛나는 색의 세기 (1 이 본래 색) */
  float glow;
  /** 1 이면 그대로. 1 보다 작으면 그만큼 앞으로 당겨 그린다 (손에 든 것) */
  float depth_scale;
  /** 해가 있는 쪽 (길이 1) 과 해의 빛, 위·아래를 보는 면이 받는 빛 (하늘빛과 되비친 빛) */
  Vec3 sun_direction{0.0f, 1.0f, 0.0f};
  Vec3 sun_light{};
  Vec3 up_light{1.0f, 1.0f, 1.0f};
  Vec3 down_light{1.0f, 1.0f, 1.0f};
};

/**
 * 색이 칠해진 메시를 그리는 묶음 — 정점을 GPU 에 한 번 올려 두고 그리기 호출 한 번으로 그린다. 뒤를 보는 면은 GPU 가 버린다.
 * 메시는 만든 뒤 바뀌지 않는다 (바뀌는 것은 MeshView 뿐)
 */
class MeshBatch {
 public:
  bool create(gpu::Device& device, ShaderLibrary& shaders, std::span<const ColoredVertex> vertices);
  /** begin_frame 과 end_frame 사이에서, 프레임마다 많아야 한 번 */
  void draw(gpu::Device& device, const MeshView& view);

 private:
  gpu::PipelineHandle pipeline_;
  gpu::BufferHandle view_uniforms_;
  gpu::BufferHandle vertices_;
  uint32_t vertex_count_{};
};

}  // namespace engine
