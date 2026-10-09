// LBVH 의 (Morton 코드, 상자 번호) 쌍을 코드 순으로 — 4 비트씩 여덟 번 도는 안정 기수 정렬 (engine/render/gpu_lbvh.cpp).
// 한 번은 세 단계다: 묶음(256 개) 안에서의 순위와 자릿값별 개수 → 그 개수들의 누적 합(scan_blocks) → 제자리로 옮기기.

struct RadixParams {
  count: u32,
  workgroup_count: u32,
  // 이번에 보는 자리의 시작 비트
  bit: u32,
  _padding: u32,
}

@group(0) @binding(0) var<uniform> params: RadixParams;
@group(0) @binding(1) var<storage, read> input_pairs: array<u32>;
@group(0) @binding(2) var<storage, read_write> output_pairs: array<u32>;
// 원소마다 — 같은 묶음 안에서 같은 자릿값을 가진 앞선 원소의 수
@group(0) @binding(3) var<storage, read_write> local_prefix: array<u32>;
// [자릿값 * 묶음 수 + 묶음] — 처음에는 개수, scan_blocks 뒤에는 그 앞까지의 합(= 옮겨 갈 자리의 시작)
@group(0) @binding(4) var<storage, read_write> block_sums: array<u32>;

var<workgroup> local_counts: array<atomic<u32>, 16>;
var<workgroup> local_digits: array<u32, 256>;

@compute @workgroup_size(256)
fn radix_local_prefix(@builtin(workgroup_id) group_id: vec3<u32>, @builtin(local_invocation_index) local: u32) {
  let group = group_id.x;
  if (group >= params.workgroup_count) { return; }
  let index = group * 256u + local;
  let in_range = index < params.count;
  if (local < 16u) { atomicStore(&local_counts[local], 0u); }
  var digit = 0xffffffffu;
  if (in_range) {
    digit = (input_pairs[index * 2u] >> params.bit) & 15u;
  }
  local_digits[local] = digit;
  workgroupBarrier();
  if (in_range) {
    var rank = 0u;
    for (var previous = 0u; previous < local; previous += 1u) {
      rank += select(0u, 1u, local_digits[previous] == digit);
    }
    local_prefix[index] = rank;
    atomicAdd(&local_counts[digit], 1u);
  }
  workgroupBarrier();
  if (local < 16u) {
    block_sums[local * params.workgroup_count + group] = atomicLoad(&local_counts[local]);
  }
}

@compute @workgroup_size(256)
fn radix_reorder(@builtin(workgroup_id) group_id: vec3<u32>, @builtin(local_invocation_index) local: u32) {
  let group = group_id.x;
  let index = group * 256u + local;
  if (group >= params.workgroup_count || index >= params.count) { return; }
  let key = input_pairs[index * 2u];
  let digit = (key >> params.bit) & 15u;
  let destination = block_sums[digit * params.workgroup_count + group] + local_prefix[index];
  output_pairs[destination * 2u] = key;
  output_pairs[destination * 2u + 1u] = input_pairs[index * 2u + 1u];
}

struct ScanParams {
  count: u32,
  _padding_0: u32,
  _padding_1: u32,
  _padding_2: u32,
}

@group(0) @binding(5) var<uniform> scan_params: ScanParams;
@group(0) @binding(6) var<storage, read_write> scan_items: array<u32>;

var<workgroup> scan_values: array<u32, 512>;

// 앞까지의 합으로 바꾼다 (제자리, 512 개까지) — 묶음 하나가 올려 쓸기·내려 쓸기로 한다
@compute @workgroup_size(256)
fn scan_blocks(@builtin(local_invocation_index) local: u32) {
  let first = local * 2u;
  scan_values[first] = 0u;
  scan_values[first + 1u] = 0u;
  if (first < scan_params.count) { scan_values[first] = scan_items[first]; }
  if (first + 1u < scan_params.count) { scan_values[first + 1u] = scan_items[first + 1u]; }

  var offset = 1u;
  for (var width = 256u; width > 0u; width >>= 1u) {
    workgroupBarrier();
    if (local < width) {
      let left = offset * (local * 2u + 1u) - 1u;
      let right = offset * (local * 2u + 2u) - 1u;
      scan_values[right] += scan_values[left];
    }
    offset <<= 1u;
  }
  workgroupBarrier();
  if (local == 0u) { scan_values[511u] = 0u; }
  for (var width = 1u; width < 512u; width <<= 1u) {
    offset >>= 1u;
    workgroupBarrier();
    if (local < width) {
      let left = offset * (local * 2u + 1u) - 1u;
      let right = offset * (local * 2u + 2u) - 1u;
      let value = scan_values[left];
      scan_values[left] = scan_values[right];
      scan_values[right] += value;
    }
  }
  workgroupBarrier();
  if (first < scan_params.count) { scan_items[first] = scan_values[first]; }
  if (first + 1u < scan_params.count) { scan_items[first + 1u] = scan_values[first + 1u]; }
}
