// GPU 가 지은 LBVH 에 광선 하나를 쏜다 — 가장 먼저 닿는 상자를 hit 에 적는다 (engine/render/gpu_lbvh.cpp).
// 결과는 GPU 에 남는다: 그리는 셰이더가 hit 을 읽어 쓴다.

const INVALID: u32 = 0xffffffffu;
// 깊이는 Morton 30 비트 + 같은 코드끼리 가르는 번호 32 비트를 넘지 않는다
const STACK_SIZE: u32 = 64u;

struct Ray {
  origin: vec4<f32>,
  // xyz 방향(길이 1), w 최대 거리
  direction: vec4<f32>,
}

struct Hit {
  // 닿은 것이 없으면 INVALID
  primitive: u32,
  distance: f32,
  _padding_0: u32,
  _padding_1: u32,
}

@group(0) @binding(0) var<uniform> ray: Ray;
@group(0) @binding(1) var<storage, read> node_meta: array<vec4<u32>>;
@group(0) @binding(2) var<storage, read> node_bounds: array<vec4<f32>>;
// [0] 뿌리 노드, [1] 상태 (lbvh_build.wgsl)
@group(0) @binding(3) var<storage, read> state: array<u32, 4>;
@group(0) @binding(4) var<storage, read_write> hit: Hit;

// 광선이 노드의 상자에 [0, limit] 안에서 닿으면 들어가는 거리, 아니면 -1
fn enter(node: u32, inverse: vec3<f32>, limit: f32) -> f32 {
  let a = (node_bounds[node * 2u].xyz - ray.origin.xyz) * inverse;
  let b = (node_bounds[node * 2u + 1u].xyz - ray.origin.xyz) * inverse;
  let lo = min(a, b);
  let hi = max(a, b);
  let near = max(max(lo.x, lo.y), max(lo.z, 0.0));
  let far = min(min(hi.x, hi.y), min(hi.z, limit));
  return select(-1.0, near, near <= far);
}

@compute @workgroup_size(1)
fn trace_ray() {
  hit.primitive = INVALID;
  hit.distance = 0.0;
  let root = state[0];
  if (root == INVALID || state[1] != 0u) { return; }
  let inverse = vec3<f32>(1.0) / ray.direction.xyz;
  var limit = ray.direction.w;

  var stack: array<u32, STACK_SIZE>;
  var distances: array<f32, STACK_SIZE>;
  var top = 0u;
  let root_distance = enter(root, inverse, limit);
  if (root_distance >= 0.0) {
    stack[0] = root;
    distances[0] = root_distance;
    top = 1u;
  }
  while (top > 0u) {
    top -= 1u;
    let node = stack[top];
    let distance = distances[top];
    // 쌓아 둔 뒤로 그만큼 가깝거나 더 가까운 것을 찾았으면 볼 것이 없다
    if (hit.primitive != INVALID && distance >= limit) { continue; }
    let data = node_meta[node];
    if (data.z != INVALID) {
      hit.primitive = data.z;
      hit.distance = distance;
      limit = distance;
      continue;
    }
    let left = enter(data.x, inverse, limit);
    let right = enter(data.y, inverse, limit);
    // 가까운 쪽을 나중에 쌓아 먼저 본다
    let left_first = left <= right;
    let far_node = select(data.x, data.y, left_first);
    let far_distance = select(left, right, left_first);
    let near_node = select(data.y, data.x, left_first);
    let near_distance = select(right, left, left_first);
    if (far_distance >= 0.0 && top < STACK_SIZE) {
      stack[top] = far_node;
      distances[top] = far_distance;
      top += 1u;
    }
    if (near_distance >= 0.0 && top < STACK_SIZE) {
      stack[top] = near_node;
      distances[top] = near_distance;
      top += 1u;
    }
  }
}
