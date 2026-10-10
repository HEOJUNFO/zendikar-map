// GPU LBVH 빌드 — 상자들에서 Morton 코드, 계층, 노드 상자까지 모두 컴퓨트로 만든다 (engine/render/gpu_lbvh.cpp 가 차례대로 돌린다).
// 정렬은 lbvh_radix.wgsl 이 한다. 계층은 Karras(2012)의 방법 — 내부 노드마다 독립으로 제 범위와 가르는 자리를 찾는다.
// 노드 [0, n-1) 이 내부, [n-1, 2n-1) 이 잎(정렬된 차례).

const INVALID: u32 = 0xffffffffu;
const FLOAT_MAX: f32 = 3.402823466e+38;

struct Params {
  primitive_count: u32,
  node_count: u32,
  _padding_0: u32,
  _padding_1: u32,
}

struct Box {
  // xyz 만 쓴다
  minimum: vec4<f32>,
  maximum: vec4<f32>,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> boxes: array<Box>;
// (Morton 코드, 상자 번호)
@group(0) @binding(2) var<storage, read_write> pairs: array<vec2<u32>>;
// 노드마다 (왼쪽, 오른쪽, 잎이면 상자 번호, 부모)
@group(0) @binding(3) var<storage, read_write> node_meta: array<vec4<u32>>;
// 노드마다 둘 — 최소, 최대
@group(0) @binding(4) var<storage, read_write> node_bounds: array<vec4<f32>>;
// 상자 중심들의 범위 — [0..2] 최소, [4..6] 최대 (차례가 지켜지는 정수로 바꾼 값)
@group(0) @binding(5) var<storage, read_write> scene_bounds: array<atomic<u32>, 8>;
// [0] 뿌리 노드, [1] 상태 (0 정상, 2 빈 상자, 3 트리가 어긋남)
@group(0) @binding(6) var<storage, read_write> state: array<atomic<u32>, 4>;

// 부동소수의 크기 차례가 부호 없는 정수의 차례가 되게 — atomicMin·Max 로 범위를 줄이려는 것이다
fn float_to_ordered(value: f32) -> u32 {
  let bits = bitcast<u32>(value);
  return select(bits ^ 0xffffffffu, bits ^ 0x80000000u, (bits & 0x80000000u) == 0u);
}

fn ordered_to_float(value: u32) -> f32 {
  let bits = select(value ^ 0xffffffffu, value ^ 0x80000000u, (value & 0x80000000u) != 0u);
  return bitcast<f32>(bits);
}

// 10 비트를 세 칸마다 한 비트씩 벌린다
fn expand_bits(value: u32) -> u32 {
  var result = value & 0x000003ffu;
  result = (result | (result << 16u)) & 0x030000ffu;
  result = (result | (result << 8u)) & 0x0300f00fu;
  result = (result | (result << 4u)) & 0x030c30c3u;
  result = (result | (result << 2u)) & 0x09249249u;
  return result;
}

fn center_of(primitive: u32) -> vec3<f32> {
  return (boxes[primitive].minimum.xyz + boxes[primitive].maximum.xyz) * 0.5;
}

// 정렬된 자리 left 와 right 의 코드가 앞에서부터 같은 비트 수. 코드가 같으면 자리 번호로 이어 가른다
fn common_prefix(left: i32, right: i32) -> i32 {
  let count = i32(params.primitive_count);
  if (right < 0 || right >= count) { return -1; }
  let a = pairs[u32(left)].x;
  let b = pairs[u32(right)].x;
  if (a == b) {
    return 32 + i32(countLeadingZeros(u32(left ^ right)));
  }
  return i32(countLeadingZeros(a ^ b));
}

@compute @workgroup_size(1)
fn initialize_scene_bounds() {
  atomicStore(&state[0], INVALID);
  atomicStore(&state[1], 0u);
  for (var axis = 0u; axis < 3u; axis += 1u) {
    atomicStore(&scene_bounds[axis], float_to_ordered(FLOAT_MAX));
    atomicStore(&scene_bounds[4u + axis], float_to_ordered(-FLOAT_MAX));
  }
}

@compute @workgroup_size(64)
fn reduce_scene_bounds(@builtin(global_invocation_id) id: vec3<u32>) {
  let primitive = id.x;
  if (primitive >= params.primitive_count) { return; }
  let center = center_of(primitive);
  for (var axis = 0u; axis < 3u; axis += 1u) {
    atomicMin(&scene_bounds[axis], float_to_ordered(center[axis]));
    atomicMax(&scene_bounds[4u + axis], float_to_ordered(center[axis]));
  }
}

@compute @workgroup_size(64)
fn generate_morton_codes(@builtin(global_invocation_id) id: vec3<u32>) {
  let primitive = id.x;
  if (primitive >= params.primitive_count) { return; }
  let minimum = vec3<f32>(
    ordered_to_float(atomicLoad(&scene_bounds[0])),
    ordered_to_float(atomicLoad(&scene_bounds[1])),
    ordered_to_float(atomicLoad(&scene_bounds[2])));
  let maximum = vec3<f32>(
    ordered_to_float(atomicLoad(&scene_bounds[4])),
    ordered_to_float(atomicLoad(&scene_bounds[5])),
    ordered_to_float(atomicLoad(&scene_bounds[6])));
  let extent = max(maximum - minimum, vec3<f32>(1.0e-20));
  let normalized = clamp((center_of(primitive) - minimum) / extent, vec3<f32>(0.0), vec3<f32>(1.0));
  let quantized = vec3<u32>(normalized * 1023.0);
  let code = expand_bits(quantized.x) | (expand_bits(quantized.y) << 1u) | (expand_bits(quantized.z) << 2u);
  pairs[primitive] = vec2<u32>(code, primitive);
}

@compute @workgroup_size(64)
fn initialize_hierarchy(@builtin(global_invocation_id) id: vec3<u32>) {
  let node = id.x;
  if (node >= params.node_count) { return; }
  node_meta[node] = vec4<u32>(INVALID, INVALID, INVALID, INVALID);
  node_bounds[node * 2u] = vec4<f32>(FLOAT_MAX);
  node_bounds[node * 2u + 1u] = vec4<f32>(-FLOAT_MAX);
  let leaf_offset = params.primitive_count - 1u;
  if (node >= leaf_offset) {
    let primitive = pairs[node - leaf_offset].y;
    node_meta[node].z = primitive;
    node_bounds[node * 2u] = boxes[primitive].minimum;
    node_bounds[node * 2u + 1u] = boxes[primitive].maximum;
  }
}

@compute @workgroup_size(64)
fn build_hierarchy(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (params.primitive_count <= 1u || index >= params.primitive_count - 1u) { return; }
  let i = i32(index);
  // 이 노드가 맡는 범위는 앞머리가 더 긴 쪽으로 뻗는다
  let direction = select(-1, 1, common_prefix(i, i + 1) > common_prefix(i, i - 1));
  let minimum_prefix = common_prefix(i, i - direction);
  var maximum_length = 2;
  while (common_prefix(i, i + maximum_length * direction) > minimum_prefix) {
    maximum_length *= 2;
  }
  var length = 0;
  var step = maximum_length / 2;
  while (step >= 1) {
    if (common_prefix(i, i + (length + step) * direction) > minimum_prefix) {
      length += step;
    }
    step /= 2;
  }
  let other = i + length * direction;
  // 범위를 둘로 가르는 자리 — 범위 전체보다 긴 앞머리를 나누는 가장 먼 곳
  let node_prefix = common_prefix(i, other);
  var split_offset = 0;
  step = (length + 1) / 2;
  while (step >= 1) {
    if (split_offset + step < length && common_prefix(i, i + (split_offset + step) * direction) > node_prefix) {
      split_offset += step;
    }
    if (step == 1) { break; }
    step = (step + 1) / 2;
  }
  let split = i + split_offset * direction + min(direction, 0);
  let first = min(i, other);
  let last = max(i, other);
  let leaf_offset = i32(params.primitive_count - 1u);
  let left = select(u32(split), u32(leaf_offset + split), split == first);
  let right_index = split + 1;
  let right = select(u32(right_index), u32(leaf_offset + right_index), right_index == last);
  node_meta[index].x = left;
  node_meta[index].y = right;
}

// 자식마다 부모가 하나라 서로 다른 칸에만 쓴다
@compute @workgroup_size(64)
fn link_hierarchy_parents(@builtin(global_invocation_id) id: vec3<u32>) {
  let node = id.x;
  if (params.primitive_count <= 1u || node >= params.primitive_count - 1u) { return; }
  node_meta[node_meta[node].x].w = node;
  node_meta[node_meta[node].y].w = node;
}

// 노드마다 제 밑의 잎들을 직접 돌아 상자를 구한다 (스택 없이 부모 링크로 걷는다).
// 아래에서 위로 올리는 방식은 쓰지 않는다 — 작업 묶음 사이에는 쓰기가 끝났다는 보장이 없어 덜 된 상자를 읽을 수 있다
@compute @workgroup_size(64)
fn rebuild_node_bounds(@builtin(global_invocation_id) id: vec3<u32>) {
  let node = id.x;
  if (node >= params.node_count) { return; }
  let leaf_offset = params.primitive_count - 1u;
  if (node >= leaf_offset) {
    // 잎의 상자는 initialize_hierarchy 가 넣었다. 상자가 하나뿐이면 그 잎이 뿌리다
    if (params.primitive_count == 1u) { atomicStore(&state[0], node); }
    return;
  }

  let boundary = node_meta[node].w;
  if (boundary == INVALID) { atomicStore(&state[0], node); }

  var minimum = vec3<f32>(FLOAT_MAX);
  var maximum = vec3<f32>(-FLOAT_MAX);
  var previous = boundary;
  var current = node;
  var visits = 0u;
  loop {
    visits += 1u;
    if (visits > params.node_count * 2u + 1u) {
      atomicStore(&state[1], 3u);
      return;
    }
    let data = node_meta[current];
    var next = data.w;
    if (previous == data.w) {
      // 위에서 내려왔다 — 잎이면 상자를 합치고 돌아가고, 아니면 왼쪽으로
      if (data.z != INVALID) {
        minimum = min(minimum, boxes[data.z].minimum.xyz);
        maximum = max(maximum, boxes[data.z].maximum.xyz);
      } else {
        next = data.x;
      }
    } else if (previous == data.x) {
      // 왼쪽에서 올라왔다 — 오른쪽으로
      next = data.y;
    }
    previous = current;
    current = next;
    if (current == boundary) { break; }
  }
  if (any(minimum > maximum)) {
    atomicStore(&state[1], 2u);
    return;
  }
  node_bounds[node * 2u] = vec4<f32>(minimum, 0.0);
  node_bounds[node * 2u + 1u] = vec4<f32>(maximum, 0.0);
}
