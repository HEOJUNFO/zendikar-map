#pragma once

#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"

namespace engine {

/** 하늘을 어떻게 볼지 — 눈의 세 축(길이 1)과 시야각 절반의 tan(가로·세로), 그림을 y 축으로 돌린 각 */
struct SkyView {
  Vec3 forward, right, up;
  float tan_x, tan_y;
  /** 그림의 방위 = 장면의 방위 − yaw (라디안). 그림의 가운데가 북(-z), 오른쪽이 동(+x) */
  float yaw;
};

/**
 * 하늘 — 등장방형 그림(가로 360 도 × 세로 180 도, 윗줄이 천정) 한 장을 화면 전체에 그린다. 그림의 색은 화면 값 그대로 나간다.
 * 깊이를 쓰지 않는다: 프레임에서 가장 먼저 그리면 뒤따르는 것이 그 위를 덮는다
 */
class SkyBatch {
 public:
  bool create(gpu::Device& device, ShaderLibrary& shaders);
  /** begin_frame 과 end_frame 사이에서, 프레임마다 많아야 한 번. image 는 rgba8 텍스처(밉 없음)이고 height 는 그 높이(픽셀). 빈 핸들이면 그리지 않는다 */
  void draw(gpu::Device& device, const SkyView& view, gpu::TextureHandle image, uint32_t height);

 private:
  gpu::PipelineHandle pipeline_;
  gpu::BufferHandle view_uniforms_;
  gpu::BufferHandle vertices_;
  gpu::SamplerHandle sampler_;
};

}  // namespace engine
