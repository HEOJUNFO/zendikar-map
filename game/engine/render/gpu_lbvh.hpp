#pragma once

#include <array>
#include <cstdint>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/gpu/device.hpp"
#include "engine/shader/shader_library.hpp"

namespace engine {

/** GPU 에 올리는 상자 — xyz 만 쓴다 (wgsl/lbvh_build.wgsl 의 Box) */
struct GpuBox {
  std::array<float, 4> minimum;
  std::array<float, 4> maximum;
  bool operator==(const GpuBox&) const = default;
};

/**
 * GPU 에서 짓는 LBVH — 상자들을 올리면 Morton 코드, 정렬, 계층, 노드 상자까지 모두 컴퓨트 셰이더가 만든다 (CPU 는 차례만 정한다).
 * 지은 트리는 GPU 에 남고, 그 트리에 광선을 쏜 결과(hit_buffer)도 GPU 에 남아 그리는 셰이더가 읽는다.
 * 방법: Karras 2012 의 노드별 독립 빌드 + 4 비트 기수 정렬 여덟 번 + 노드별 리핏.
 *
 * CPU 쪽의 engine::Lbvh 와는 쓰임이 다르다: 서버도 도는 시뮬레이션의 판정은 CPU 트리가 하고, 이것은 그리기 쪽 질의에 쓴다.
 *
 * ceiling: 상자는 MAX_PRIMITIVES(8192) 개까지다 — 기수 정렬의 누적 합(scan_blocks)이 한 단계라 512 칸(= 16 자릿값 × 32 묶음)까지만 센다.
 * 그보다 많은 상자를 넣게 되면 누적 합을 여러 단계로 나눈다 (묶음별 합을 다시 누적해 더하는 단계를 더한다).
 */
class GpuLbvh {
 public:
  static constexpr uint32_t MAX_PRIMITIVES = 8192;

  /** primitive_count: 상자 수 — 만든 뒤 바뀌지 않는다 (1 이상 MAX_PRIMITIVES 이하) */
  bool create(gpu::Device& device, ShaderLibrary& shaders, uint32_t primitive_count);

  // 아래 둘은 begin_frame 앞에서, 프레임마다 많아야 한 번씩 부른다 (build 를 먼저)
  /** 상자들(primitive_count 개)로 트리를 다시 짓는다 */
  void build(gpu::Device& device, std::span<const GpuBox> boxes);
  /** 지은 트리에 광선을 쏴 결과를 hit_buffer 에 적는다. max_distance 가 음수면 아무것도 닿지 않는다 */
  void trace(gpu::Device& device, const Ray& ray, float max_distance);

  /** 방금 쏜 광선의 결과 — wgsl/lbvh_trace.wgsl 의 Hit (닿은 상자 번호, 없으면 0xffffffff) */
  gpu::BufferHandle hit_buffer() const { return hit_; }

 private:
  uint32_t primitive_count_{};
  gpu::BufferHandle boxes_;
  gpu::BufferHandle ray_;
  gpu::BufferHandle hit_;
  // 돌릴 차례 — create 에서 한 번 짜 둔다. 맨 끝이 광선, 그 앞이 모두 빌드다
  std::vector<gpu::BufferBinding> bindings_;
  std::vector<gpu::ComputeCall> calls_;
};

}  // namespace engine
