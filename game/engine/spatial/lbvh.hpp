#pragma once

#include <cstdint>
#include <optional>
#include <span>
#include <type_traits>
#include <vector>

#include "engine/foundation/math.hpp"

namespace engine {

/**
 * LBVH — 상자들의 Morton 순서로 이진 기수 트리를 짓는다 (트리의 정의는 Tero Karras, "Maximizing Parallelism in the
 * Construction of BVHs, Octrees, and k-d Trees", High Performance Graphics 2012, 33–37). 움직이는 물체가 많아 매 틱 다시 짓는 쓰임에 맞춘 구조다.
 * 순수 CPU 코드라 GPU 없이(서버에서도) 돈다. 같은 입력이면 어디서나 같은 트리가 나온다.
 *
 * 짓는 방법은 한 스레드에 맞춘 것이다: 정렬한 키를 한 번 훑으며 스택으로 트리와 상자를 함께 만든다 (O(n), 노드마다의 이분 탐색이 없다).
 * ceiling: 병렬로 나눌 수 없는 방법이다. build() 가 틱 예산에 보이는 규모가 되면 wasm 스레드와 함께
 * 노드마다 독립으로 짓는 Karras 의 방법으로 바꾼다 (트리는 같다).
 */
class Lbvh {
 public:
  struct Hit {
    /** build() 에 넘긴 상자의 번호 */
    uint32_t primitive;
    /** 광선이 그 상자에 들어가는 거리 (원점이 상자 안이면 0) */
    float distance;
  };

  /** 상자들로 다시 짓는다. 저장 공간은 다시 쓴다 */
  void build(std::span<const Aabb> boxes);

  /** max_distance 안에서 가장 먼저 닿는 상자 */
  std::optional<Hit> raycast(const Ray& ray, float max_distance) const;
  /**
   * 잎 방문 — 광선이 [0, 한계 거리] 안에서 상자에 닿는 잎을 찾아가며 visit(상자 번호, 그 상자에 들어가는 거리, 지금의 한계 거리)를 부른다. visit 가 돌려준 값이 새 한계 거리다
   * (그대로 돌려주면 계속 찾고, 줄이면 그보다 멀리서 들어가는 상자는 건너뛴다. 0 보다 작게 주면 거기서 끝난다). 상자 속의 것(삼각형 등)과의 판정은 부르는 쪽이 visit 에서 한다:
   * 닿았으면 그 거리를 돌려줘 한계를 줄인다. 가까운 가지를 먼저 보지만 잎이 꼭 가까운 차례로 오지는 않는다 — 가장 가까운 것은 부르는 쪽이 견줘 고른다
   */
  template <typename Visit>
  void traverse(const Ray& ray, float max_distance, Visit&& visit) const {
    walk(ray, max_distance, [](void* context, uint32_t primitive, float distance, float limit) -> float { return (*static_cast<std::remove_reference_t<Visit>*>(context))(primitive, distance, limit); },
         &visit);
  }
  /** 상자와 겹치는 것이 하나라도 있는가 — 면이 닿기만 한 것은 겹친 것이 아니다 */
  bool overlaps(const Aabb& box) const;

 private:
  struct Node {
    Aabb bounds;
    // 잎이면 left 가 상자 번호, right 가 LEAF
    uint32_t left;
    uint32_t right;
  };

  void walk(const Ray& ray, float max_distance, float (*visit)(void*, uint32_t, float, float), void* context) const;

  // 상자가 n 개면 내부 노드 [0, n-1), 잎 [n-1, 2n-1)
  std::vector<Node> nodes_;
  uint32_t root_{};
  // 다시 지을 때마다 쓰는 작업 공간 — 정렬 키 (Morton 코드 << 32 | 상자 번호)
  std::vector<uint64_t> keys_;
  std::vector<uint64_t> scratch_;
};

}  // namespace engine
