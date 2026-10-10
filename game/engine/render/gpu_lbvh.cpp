#include "engine/render/gpu_lbvh.hpp"

#include <initializer_list>

#include "engine/foundation/log.hpp"
#include "engine_shaders.generated.hpp"

namespace engine {
namespace {

// wgsl/lbvh_build.wgsl
constexpr uint32_t BUILD_WORKGROUP = 64;
struct BuildParams {
  uint32_t primitive_count;
  uint32_t node_count;
  uint32_t padding[2];
};
// wgsl/lbvh_radix.wgsl
constexpr uint32_t RADIX_WORKGROUP = 256;
constexpr uint32_t RADIX_BITS = 4;
// Morton 코드 30 비트 → 4 비트씩 여덟 번 (짝수 번이라 끝나면 처음 버퍼로 돌아온다)
constexpr uint32_t RADIX_PASSES = 8;
struct RadixParams {
  uint32_t count;
  uint32_t workgroup_count;
  uint32_t bit;
  uint32_t padding;
};
struct ScanParams {
  uint32_t count;
  uint32_t padding[3];
};
// wgsl/lbvh_trace.wgsl
struct RayUniforms {
  std::array<float, 4> origin;
  std::array<float, 4> direction;
};
struct Hit {
  uint32_t primitive;
  float distance;
  uint32_t padding[2];
};

constexpr uint32_t groups_for(uint32_t count, uint32_t size) { return (count + size - 1) / size; }

}  // namespace

bool GpuLbvh::create(gpu::Device& device, ShaderLibrary& shaders, uint32_t primitive_count) {
  if (primitive_count == 0 || primitive_count > MAX_PRIMITIVES) {
    log_error("[gpu_lbvh] 상자 수(%u)는 1 이상 %u 이하여야 한다", primitive_count, MAX_PRIMITIVES);
    return false;
  }
  primitive_count_ = primitive_count;
  const uint32_t node_count = 2 * primitive_count - 1;
  const uint32_t radix_groups = groups_for(primitive_count, RADIX_WORKGROUP);

  using gpu::BufferUsage;
  const auto storage = [&](std::size_t bytes) { return device.create_buffer({BufferUsage::storage, bytes}); };
  const auto uniform = [&](const auto& value) { return device.create_buffer({BufferUsage::uniform, sizeof(value), &value}); };

  boxes_ = storage(primitive_count * sizeof(GpuBox));
  const gpu::BufferHandle pairs_a = storage(primitive_count * 8);
  const gpu::BufferHandle pairs_b = storage(primitive_count * 8);
  const gpu::BufferHandle local_prefix = storage(primitive_count * 4);
  const gpu::BufferHandle block_sums = storage(16 * radix_groups * 4);
  const gpu::BufferHandle node_meta = storage(node_count * 16);
  const gpu::BufferHandle node_bounds = storage(node_count * 32);
  const gpu::BufferHandle scene_bounds = storage(8 * 4);
  const gpu::BufferHandle state = storage(4 * 4);
  hit_ = storage(sizeof(Hit));
  ray_ = device.create_buffer({BufferUsage::uniform, sizeof(RayUniforms)});
  const gpu::BufferHandle build_params = uniform(BuildParams{primitive_count, node_count, {}});
  const gpu::BufferHandle scan_params = uniform(ScanParams{16 * radix_groups, {}});

  const gpu::ShaderHandle build = shaders.resolve(shaders.add(shaders::lbvh_build));
  const gpu::ShaderHandle radix = shaders.resolve(shaders.add(shaders::lbvh_radix));
  const gpu::ShaderHandle trace = shaders.resolve(shaders.add(shaders::lbvh_trace));

  // 단계마다 (파이프라인, 그 진입점이 쓰는 바인딩들, 작업 묶음 수) — 바인딩은 한 벡터에 이어 담고 끝에 구간으로 잇는다
  struct Step {
    gpu::ComputePipelineHandle pipeline;
    std::size_t first;
    std::size_t count;
    uint32_t workgroups;
  };
  std::vector<Step> steps;
  bool ok = true;
  const auto step = [&](gpu::ComputePipelineHandle pipeline, uint32_t workgroups, std::initializer_list<gpu::BufferBinding> bindings) {
    ok = ok && static_cast<bool>(pipeline);
    steps.push_back({pipeline, bindings_.size(), bindings.size(), workgroups});
    bindings_.insert(bindings_.end(), bindings);
  };
  const auto pipeline = [&](gpu::ShaderHandle shader, const char* entry) { return device.create_compute_pipeline(shader, entry); };

  const uint32_t primitive_groups = groups_for(primitive_count, BUILD_WORKGROUP);
  const uint32_t node_groups = groups_for(node_count, BUILD_WORKGROUP);

  // 1. 상자 중심들의 범위 → Morton 코드
  step(pipeline(build, "initialize_scene_bounds"), 1, {{5, scene_bounds}, {6, state}});
  step(pipeline(build, "reduce_scene_bounds"), primitive_groups, {{0, build_params}, {1, boxes_}, {5, scene_bounds}});
  step(pipeline(build, "generate_morton_codes"), primitive_groups, {{0, build_params}, {1, boxes_}, {2, pairs_a}, {5, scene_bounds}});

  // 2. 코드 순으로 정렬 — 번갈아 a → b, b → a
  const gpu::ComputePipelineHandle local_prefix_pass = pipeline(radix, "radix_local_prefix");
  const gpu::ComputePipelineHandle scan_pass = pipeline(radix, "scan_blocks");
  const gpu::ComputePipelineHandle reorder_pass = pipeline(radix, "radix_reorder");
  for (uint32_t pass = 0; pass < RADIX_PASSES; pass++) {
    const gpu::BufferHandle params = uniform(RadixParams{primitive_count, radix_groups, pass * RADIX_BITS, 0});
    const gpu::BufferHandle input = pass % 2 == 0 ? pairs_a : pairs_b;
    const gpu::BufferHandle output = pass % 2 == 0 ? pairs_b : pairs_a;
    step(local_prefix_pass, radix_groups, {{0, params}, {1, input}, {3, local_prefix}, {4, block_sums}});
    step(scan_pass, 1, {{5, scan_params}, {6, block_sums}});
    step(reorder_pass, radix_groups, {{0, params}, {1, input}, {2, output}, {3, local_prefix}, {4, block_sums}});
  }

  // 3. 계층과 노드 상자
  step(pipeline(build, "initialize_hierarchy"), node_groups, {{0, build_params}, {1, boxes_}, {2, pairs_a}, {3, node_meta}, {4, node_bounds}});
  step(pipeline(build, "build_hierarchy"), primitive_groups, {{0, build_params}, {2, pairs_a}, {3, node_meta}});
  step(pipeline(build, "link_hierarchy_parents"), primitive_groups, {{0, build_params}, {3, node_meta}});
  step(pipeline(build, "rebuild_node_bounds"), node_groups, {{0, build_params}, {1, boxes_}, {3, node_meta}, {4, node_bounds}, {6, state}});

  // 4. 지은 트리에 광선 하나 — 맨 끝에 둔다 (trace 가 이 단계만 따로 돌린다)
  step(pipeline(trace, "trace_ray"), 1, {{0, ray_}, {1, node_meta}, {2, node_bounds}, {3, state}, {4, hit_}});

  if (!ok) {
    log_error("[gpu_lbvh] 컴퓨트 파이프라인을 만들지 못했다");
    return false;
  }
  calls_.reserve(steps.size());
  for (const Step& s : steps) calls_.push_back({s.pipeline, std::span{bindings_}.subspan(s.first, s.count), s.workgroups});
  return true;
}

void GpuLbvh::build(gpu::Device& device, std::span<const GpuBox> boxes) {
  if (calls_.empty() || boxes.size() != primitive_count_) return;
  device.write_buffer(boxes_, std::as_bytes(boxes));
  device.compute(std::span{calls_}.first(calls_.size() - 1));
}

void GpuLbvh::trace(gpu::Device& device, const Ray& ray, float max_distance) {
  if (calls_.empty()) return;
  const RayUniforms uniforms{{ray.origin.x, ray.origin.y, ray.origin.z, 0.0f}, {ray.direction.x, ray.direction.y, ray.direction.z, max_distance}};
  device.write_buffer(ray_, std::as_bytes(std::span{&uniforms, 1}));
  device.compute(std::span{calls_}.last(1));
}

}  // namespace engine
