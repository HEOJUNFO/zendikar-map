#pragma once

#include <cstdint>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/render/gpu_lbvh.hpp"
#include "engine/render/instance_batch.hpp"
#include "engine/shader/shader_library.hpp"
#include "gameplay/simulation/world.hpp"

namespace game {

/**
 * 시뮬레이션 상태를 3D 장면으로 — 세계를 읽기만 한다.
 * 과녁들의 LBVH 를 GPU 에서 짓고 조준 광선을 쏴, 겨눈 과녁을 셰이더가 밝힌다
 * (발사 판정은 여기가 아니라 시뮬레이션이 CPU 트리로 한다 — 서버도 같은 판정을 한다)
 */
class SceneView {
 public:
  /** target_count: 세계의 과녁 수 — 만든 뒤 바뀌지 않는다 */
  bool create(engine::gpu::Device& device, engine::ShaderLibrary& shaders, uint32_t target_count);
  /**
   * 프레임을 열기 전에 — 과녁이 움직였으면 GPU 트리를 다시 짓고, 그랬거나 조준이 바뀌었으면 조준 광선을 다시 쏜다.
   * aiming 이 아니면 아무것도 겨누지 않는다
   */
  void prepare(engine::gpu::Device& device, const World& world, bool aiming);
  /** begin_frame 과 end_frame 사이에서 한 번 (prepare 뒤) */
  void draw(engine::gpu::Device& device, const World& world);

 private:
  engine::gpu::PipelineHandle pipeline_;
  engine::gpu::BufferHandle frame_uniforms_;
  engine::InstanceBatch targets_;
  engine::InstanceBatch ground_;
  engine::GpuLbvh lbvh_;
  std::vector<engine::Instance> instances_;
  // GPU 트리에 들어 있는 상자들과 마지막으로 쏜 조준 — 달라졌을 때만 다시 돌린다
  std::vector<engine::GpuBox> boxes_;
  engine::Ray aim_ray_{};
  float aim_distance_{};
  bool traced_{};
};

}  // namespace game
