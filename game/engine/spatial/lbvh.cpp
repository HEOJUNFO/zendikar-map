#include "engine/spatial/lbvh.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <utility>

namespace engine {
namespace {

constexpr uint32_t LEAF = 0xFFFFFFFFu;
// 뿌리에서 잎까지의 내부 노드는 앞머리 길이가 다 다르다 — 키가 62 비트(Morton 30 + 번호 32)라 62 개를 넘지 않는다
constexpr int MAX_DEPTH = 64;
constexpr int RADIX_BITS = 10;
constexpr uint32_t RADIX_MASK = (1u << RADIX_BITS) - 1u;

/** 10 비트를 세 칸마다 한 비트씩 벌린다 */
constexpr uint32_t spread_bits(uint32_t v) {
  v = (v * 0x00010001u) & 0xFF0000FFu;
  v = (v * 0x00000101u) & 0x0F00F00Fu;
  v = (v * 0x00000011u) & 0xC30C30C3u;
  v = (v * 0x00000005u) & 0x49249249u;
  return v;
}

/** 0..1 로 맞춘 점의 30 비트 Morton 코드 */
uint32_t morton(float x, float y, float z) {
  const auto cell = [](float v) { return static_cast<uint32_t>(std::clamp(v * 1024.0f, 0.0f, 1023.0f)); };
  return spread_bits(cell(x)) << 2 | spread_bits(cell(y)) << 1 | spread_bits(cell(z));
}

Aabb merge(const Aabb& a, const Aabb& b) {
  return {{std::min(a.min.x, b.min.x), std::min(a.min.y, b.min.y), std::min(a.min.z, b.min.z)},
          {std::max(a.max.x, b.max.x), std::max(a.max.y, b.max.y), std::max(a.max.z, b.max.z)}};
}

/** 광선이 상자에 [0, limit] 안에서 닿으면 들어가는 거리 */
bool enter(const Aabb& box, const Ray& ray, Vec3 inverse, float limit, float& distance) {
  float near = 0.0f, far = limit;
  const auto slab = [&](float lo, float hi, float origin, float inv) {
    float a = (lo - origin) * inv, b = (hi - origin) * inv;
    if (a > b) std::swap(a, b);
    near = std::max(near, a);
    far = std::min(far, b);
  };
  slab(box.min.x, box.max.x, ray.origin.x, inverse.x);
  slab(box.min.y, box.max.y, ray.origin.y, inverse.y);
  slab(box.min.z, box.max.z, ray.origin.z, inverse.z);
  distance = near;
  return near <= far;
}

}  // namespace

void Lbvh::build(std::span<const Aabb> boxes) {
  const uint32_t n = static_cast<uint32_t>(boxes.size());
  nodes_.clear();
  if (n == 0) return;
  nodes_.resize(2 * static_cast<std::size_t>(n) - 1);

  // 1. 정렬 키 — 위 32 비트는 상자 중심의 Morton 코드(중심들이 놓인 범위를 0..1 로), 아래 32 비트는 상자 번호.
  //    번호가 붙어 키가 모두 다르다: 코드가 같은 상자들도 키의 비트만으로 갈린다
  const auto center = [](const Aabb& b) { return (b.min + b.max) * 0.5f; };
  Vec3 lo = center(boxes[0]), hi = lo;
  for (const Aabb& box : boxes) {
    const Vec3 c = center(box);
    lo = {std::min(lo.x, c.x), std::min(lo.y, c.y), std::min(lo.z, c.z)};
    hi = {std::max(hi.x, c.x), std::max(hi.y, c.y), std::max(hi.z, c.z)};
  }
  const Vec3 scale{hi.x > lo.x ? 1.0f / (hi.x - lo.x) : 0.0f, hi.y > lo.y ? 1.0f / (hi.y - lo.y) : 0.0f, hi.z > lo.z ? 1.0f / (hi.z - lo.z) : 0.0f};
  keys_.resize(n);
  scratch_.resize(n);
  // 세 자리(10 비트씩)의 개수를 한 번에 센다
  std::array<std::array<uint32_t, RADIX_MASK + 1>, 3> counts{};
  for (uint32_t i = 0; i < n; i++) {
    const Vec3 c = center(boxes[i]);
    const uint32_t code = morton((c.x - lo.x) * scale.x, (c.y - lo.y) * scale.y, (c.z - lo.z) * scale.z);
    keys_[i] = static_cast<uint64_t>(code) << 32 | i;
    counts[0][code & RADIX_MASK]++;
    counts[1][(code >> RADIX_BITS) & RADIX_MASK]++;
    counts[2][code >> (2 * RADIX_BITS)]++;
  }

  // 2. 코드 순으로 기수 정렬 (안정 정렬 — 같은 코드는 번호 순으로 남아, 끝나면 키 전체의 오름차순이다)
  for (int digit = 0; digit < 3; digit++) {
    uint32_t offset = 0;
    for (uint32_t& count : counts[static_cast<std::size_t>(digit)]) offset += std::exchange(count, offset);
    const int shift = 32 + digit * RADIX_BITS;
    for (uint32_t i = 0; i < n; i++) {
      const uint64_t key = keys_[i];
      scratch_[counts[static_cast<std::size_t>(digit)][(key >> shift) & RADIX_MASK]++] = key;
    }
    keys_.swap(scratch_);
  }

  // 잎 [n-1, 2n-1) — 정렬된 차례대로
  const uint32_t leaf_base = n - 1;
  for (uint32_t i = 0; i < n; i++) {
    const uint32_t primitive = static_cast<uint32_t>(keys_[i]);
    nodes_[leaf_base + i] = {boxes[primitive], primitive, LEAF};
  }
  root_ = leaf_base;
  if (n == 1) return;

  // 3. 내부 노드 [0, n-1) — 노드 i 는 정렬된 잎 i 와 i+1 사이를 가르고, 그 둘의 키가 앞에서부터 같은 비트 수가 깊이를 정한다.
  //    이 트리는 Karras(2012)의 이진 기수 트리와 같은 트리다. 그 트리는 '같은 비트 수' 수열의 데카르트 트리이므로,
  //    왼쪽에서 오른쪽으로 한 번 훑으며 스택으로 짓는다 (노드마다 이분 탐색을 하지 않는다). 상자도 그 자리에서 합친다:
  //    스택에서 내려오는 노드는 두 자식이 이미 다 지어져 있다.
  std::array<uint32_t, MAX_DEPTH> stack;
  int top = 0;
  const auto close = [&](uint32_t index) {
    Node& node = nodes_[index];
    node.bounds = merge(nodes_[node.left].bounds, nodes_[node.right].bounds);
  };
  std::array<int, MAX_DEPTH> prefixes;
  for (uint32_t i = 0; i < leaf_base; i++) {
    const int prefix = std::countl_zero(keys_[i] ^ keys_[i + 1]);
    // 더 깊은(앞머리가 더 긴) 노드들은 여기서 끝난다 — 마지막에 내려온 것이 이 노드의 왼쪽 자식이 된다
    uint32_t left = leaf_base + i;
    while (top > 0 && prefixes[static_cast<std::size_t>(top - 1)] > prefix) {
      left = stack[static_cast<std::size_t>(--top)];
      close(left);
    }
    nodes_[i].left = left;
    // 오른쪽은 일단 다음 잎 — 뒤에 오는 더 깊은 노드가 있으면 그것으로 바뀐다
    nodes_[i].right = leaf_base + i + 1;
    if (top > 0) nodes_[stack[static_cast<std::size_t>(top - 1)]].right = i;
    prefixes[static_cast<std::size_t>(top)] = prefix;
    stack[static_cast<std::size_t>(top++)] = i;
  }
  while (top > 0) close(root_ = stack[static_cast<std::size_t>(--top)]);
}

std::optional<Lbvh::Hit> Lbvh::raycast(const Ray& ray, float max_distance) const {
  std::optional<Hit> best;
  // 잎의 상자가 곧 맞는 것이다 — 들어가는 거리가 한계가 된다 (같은 거리의 것은 먼저 찾은 쪽이 남는다)
  traverse(ray, max_distance, [&](uint32_t primitive, float distance, float limit) {
    if (best && distance >= limit) return limit;
    best = Hit{primitive, distance};
    return distance;
  });
  return best;
}

void Lbvh::walk(const Ray& ray, float max_distance, float (*visit)(void*, uint32_t, float, float), void* context) const {
  if (nodes_.empty()) return;
  const Vec3 inverse{1.0f / ray.direction.x, 1.0f / ray.direction.y, 1.0f / ray.direction.z};
  float limit = max_distance;

  // 들어가는 거리를 함께 쌓는다 — 꺼낼 때 상자를 다시 대 보지 않고 거리만 견준다
  struct Entry {
    uint32_t node;
    float distance;
  };
  std::array<Entry, MAX_DEPTH> stack;
  int top = 0;
  float distance = 0.0f;
  if (enter(nodes_[root_].bounds, ray, inverse, limit, distance)) stack[static_cast<std::size_t>(top++)] = {root_, distance};
  while (top > 0 && limit >= 0.0f) {
    const Entry entry = stack[static_cast<std::size_t>(--top)];
    // 쌓아 둔 뒤로 한계가 줄어 닿지 않게 된 것은 볼 것이 없다
    if (entry.distance > limit) continue;
    const Node& node = nodes_[entry.node];
    if (node.right == LEAF) {
      limit = visit(context, node.left, entry.distance, limit);
      continue;
    }
    float left_distance = 0.0f, right_distance = 0.0f;
    const bool left = enter(nodes_[node.left].bounds, ray, inverse, limit, left_distance);
    const bool right = enter(nodes_[node.right].bounds, ray, inverse, limit, right_distance);
    // 가까운 쪽을 나중에 쌓아 먼저 본다
    if (left && right) {
      const bool left_first = left_distance <= right_distance;
      stack[static_cast<std::size_t>(top++)] = left_first ? Entry{node.right, right_distance} : Entry{node.left, left_distance};
      stack[static_cast<std::size_t>(top++)] = left_first ? Entry{node.left, left_distance} : Entry{node.right, right_distance};
    } else if (left) {
      stack[static_cast<std::size_t>(top++)] = {node.left, left_distance};
    } else if (right) {
      stack[static_cast<std::size_t>(top++)] = {node.right, right_distance};
    }
  }
}

bool Lbvh::overlaps(const Aabb& box) const {
  if (nodes_.empty()) return false;
  const auto touches = [&](const Aabb& b) {
    return b.min.x < box.max.x && b.max.x > box.min.x && b.min.y < box.max.y && b.max.y > box.min.y && b.min.z < box.max.z && b.max.z > box.min.z;
  };
  std::array<uint32_t, MAX_DEPTH> stack;
  int top = 0;
  stack[static_cast<std::size_t>(top++)] = root_;
  while (top > 0) {
    const Node& node = nodes_[stack[static_cast<std::size_t>(--top)]];
    if (!touches(node.bounds)) continue;
    // 잎의 상자는 넣은 상자 그대로다
    if (node.right == LEAF) return true;
    stack[static_cast<std::size_t>(top++)] = node.left;
    stack[static_cast<std::size_t>(top++)] = node.right;
  }
  return false;
}

}  // namespace engine
