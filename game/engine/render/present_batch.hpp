#pragma once

#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"

namespace engine {

/**
 * 장면을 화면에 올린다 — 장면 패스가 그린 것(장치의 scene_texture)을 캔버스 전체에 늘여 그린다. 캔버스 패스의 맨 처음에 한 번 그리고,
 * 그 위에 화면 위 2D(Overlay)를 화면 해상도로 그린다. 장면을 화면보다 작게 그려도 HUD 의 글자는 흐려지지 않는다
 */
class PresentBatch {
 public:
  bool create(gpu::Device& device, ShaderLibrary& shaders);
  /** begin_canvas 와 end_frame 사이에서 */
  void draw(gpu::Device& device);

 private:
  gpu::PipelineHandle pipeline_;
  gpu::BufferHandle vertices_;
  gpu::SamplerHandle sampler_;
};

}  // namespace engine
