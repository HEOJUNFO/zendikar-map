#pragma once

#include <array>
#include <cstdint>
#include <span>

#include "engine/gpu/device.hpp"

namespace engine {

/** 메시 정점 — 셰이더의 @location(0) position, @location(1) normal */
struct MeshVertex {
  float position[3];
  float normal[3];
};

/** 인스턴스 하나 — 셰이더의 @location(2), @location(3). 두 vec4 의 뜻은 그 셰이더가 정한다 */
struct Instance {
  std::array<float, 4> placement;
  std::array<float, 4> tint;
};

/** 한 변이 1 인 정육면체 (가운데가 원점), 삼각형 목록 */
std::span<const MeshVertex> unit_cube();
/** z=0 평면의 0..1 정사각형, 삼각형 목록 */
std::span<const MeshVertex> unit_quad();

/** 같은 메시를 여러 개 — 인스턴스 버퍼 하나에 올려 그리기 호출 한 번으로 그린다 */
class InstanceBatch {
 public:
  /** 이 배치로 그리는 파이프라인이 가져야 할 정점 배치 */
  static std::span<const gpu::VertexBufferLayout> vertex_layouts();

  void create(gpu::Device& device, std::span<const MeshVertex> mesh, uint32_t capacity);
  /** 그릴 인스턴스들을 올린다 — capacity 를 넘는 것은 버린다. 프레임마다 많아야 한 번 (바뀌지 않는 것은 처음 한 번만) */
  void upload(gpu::Device& device, std::span<const Instance> instances);
  /** 올려 둔 인스턴스들을 그린다 */
  void draw(gpu::Device& device, gpu::PipelineHandle pipeline, std::span<const gpu::BufferBinding> bindings) const;

 private:
  gpu::BufferHandle vertices_;
  gpu::BufferHandle instances_;
  uint32_t vertex_count_{};
  uint32_t capacity_{};
  uint32_t count_{};
};

}  // namespace engine
