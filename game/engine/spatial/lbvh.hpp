#pragma once

#include <cstdint>
#include <optional>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"

namespace engine {

/**
 * LBVH — 상자들의 Morton 순서로 이진 기수 트리를 짓는다 (트리의 정의는 Karras 2012, "Maximizing Parallelism in the
 * Construction of BVHs, Octrees, and k-d Trees"). 움직이는 물체가 많아 매 틱 다시 짓는 쓰임에 맞춘 구조다.
 * 순수 CPU 코드라 GPU 없이(서버에서도) 돈다. 같은 입력이면 어디서나 같은 트리가 나온다.
 *
 * 짓는 방법은 한 스레드에 맞춘 것이다: 정렬한 키를 한 번 훑으며 스택으로 트리와 상자를 함께 만든다 (O(n), 노드마다의 이분 탐색이 없다).
 * 그리기 쪽은 같은 트리를 GPU 에서 Karras 의 방법으로 짓는다 (engine/render/gpu_lbvh.hpp) — 이것은 GPU 가 없는 곳(서버)과
 * 결과를 그 틱에 바로 써야 하는 판정을 위한 것이다.
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

 private:
  struct Node {
    Aabb bounds;
    // 잎이면 left 가 상자 번호, right 가 LEAF
    uint32_t left;
    uint32_t right;
  };

  // 상자가 n 개면 내부 노드 [0, n-1), 잎 [n-1, 2n-1)
  std::vector<Node> nodes_;
  uint32_t root_{};
  // 다시 지을 때마다 쓰는 작업 공간 — 정렬 키 (Morton 코드 << 32 | 상자 번호)
  std::vector<uint64_t> keys_;
  std::vector<uint64_t> scratch_;
};

}  // namespace engine
