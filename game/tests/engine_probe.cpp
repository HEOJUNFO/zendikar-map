// 엔진 검증 프로브(LBVH, 투영 행렬, HUD 배치) — Node 에서 돈다 (tests/game.test.mjs 가 부른다). 실패하면 까닭을 찍고 1 로 끝난다.
// 기대값: 손으로 계산한 작은 장면, 그리고 모든 상자를 하나씩 대 보는 전수 검사와의 비교.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <optional>
#include <vector>

#include "engine/hud/element.hpp"
#include "engine/hud/layout.hpp"
#include "engine/hud/view.hpp"
#include "engine/spatial/lbvh.hpp"

namespace {

using engine::Aabb;
using engine::Lbvh;
using engine::Ray;
using engine::Vec3;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

Aabb box(Vec3 center, float half) { return {center - Vec3{half, half, half}, center + Vec3{half, half, half}}; }

bool hits(const std::optional<Lbvh::Hit>& hit, uint32_t primitive, float distance) {
  return hit && hit->primitive == primitive && std::fabs(hit->distance - distance) < 1e-5f;
}

void literal_cases() {
  // x 축 위의 세 상자: [1.5, 2.5], [4.5, 5.5], [8.5, 9.5]
  const std::vector<Aabb> boxes{box({2, 0, 0}, 0.5f), box({5, 0, 0}, 0.5f), box({9, 0, 0}, 0.5f)};
  Lbvh bvh;
  bvh.build(boxes);
  expect(hits(bvh.raycast({{0, 0, 0}, {1, 0, 0}}, 100.0f), 0, 1.5f), "+x 광선은 첫 상자에 1.5 에서 닿는다");
  expect(hits(bvh.raycast({{20, 0, 0}, {-1, 0, 0}}, 100.0f), 2, 10.5f), "-x 광선은 끝 상자에 10.5 에서 닿는다");
  expect(hits(bvh.raycast({{5, 0, 0}, {1, 0, 0}}, 100.0f), 1, 0.0f), "상자 안에서 쏘면 그 상자에 0 에서 닿는다");
  expect(!bvh.raycast({{0, 0, 0}, {0, 1, 0}}, 100.0f), "+y 광선은 아무것도 맞지 않는다");
  expect(!bvh.raycast({{0, 0, 0}, {1, 0, 0}}, 1.0f), "거리 1 안에는 아무것도 없다");
  expect(hits(bvh.raycast({{0, 0, 0}, {1, 0, 0}}, 1.5f), 0, 1.5f), "거리 한계에 딱 걸친 상자는 닿는다");

  Lbvh single;
  single.build(std::vector<Aabb>{box({0, 0, -4}, 1.0f)});
  expect(hits(single.raycast({{0, 0, 0}, {0, 0, -1}}, 100.0f), 0, 3.0f), "상자 하나짜리 트리");

  Lbvh empty;
  empty.build({});
  expect(!empty.raycast({{0, 0, 0}, {1, 0, 0}}, 100.0f), "빈 트리는 아무것도 맞지 않는다");

  // 다시 지으면 앞의 내용이 남지 않는다
  bvh.build(std::vector<Aabb>{box({0, 7, 0}, 0.5f)});
  expect(!bvh.raycast({{0, 0, 0}, {1, 0, 0}}, 100.0f), "다시 지은 뒤 옛 상자는 없다");
  expect(hits(bvh.raycast({{0, 0, 0}, {0, 1, 0}}, 100.0f), 0, 6.5f), "다시 지은 뒤 새 상자가 닿는다");
}

// 전수 검사 — 트리와 따로 쓴 구현 (축마다 구간을 좁힌다)
bool brute_enter(const Aabb& b, const Ray& ray, float limit, float& distance) {
  const float lo[3] = {b.min.x, b.min.y, b.min.z}, hi[3] = {b.max.x, b.max.y, b.max.z};
  const float o[3] = {ray.origin.x, ray.origin.y, ray.origin.z}, d[3] = {ray.direction.x, ray.direction.y, ray.direction.z};
  float near = 0.0f, far = limit;
  for (int axis = 0; axis < 3; axis++) {
    if (d[axis] == 0.0f) {
      if (o[axis] < lo[axis] || o[axis] > hi[axis]) return false;
      continue;
    }
    float a = (lo[axis] - o[axis]) / d[axis], c = (hi[axis] - o[axis]) / d[axis];
    if (a > c) std::swap(a, c);
    near = std::max(near, a);
    far = std::min(far, c);
    if (near > far) return false;
  }
  distance = near;
  return true;
}

uint32_t lcg_state = 12345;
float lcg(float from, float to) {
  lcg_state = lcg_state * 1664525u + 1013904223u;
  return from + (to - from) * (static_cast<float>(lcg_state >> 8) / 16777216.0f);
}

void against_brute_force() {
  std::vector<Aabb> boxes;
  for (int i = 0; i < 2000; i++) boxes.push_back(box({lcg(-50, 50), lcg(-50, 50), lcg(-50, 50)}, lcg(0.1f, 1.5f)));
  // 같은 자리에 겹친 상자들 — Morton 코드가 같을 때의 가르기를 지난다
  for (int i = 0; i < 64; i++) boxes.push_back(box({3, 3, 3}, 0.5f));
  Lbvh bvh;
  bvh.build(boxes);

  int mismatches = 0, hit_count = 0;
  for (int i = 0; i < 2000; i++) {
    const Ray ray{{lcg(-60, 60), lcg(-60, 60), lcg(-60, 60)}, engine::normalize({lcg(-1, 1), lcg(-1, 1), lcg(-1, 1)})};
    const float limit = lcg(5.0f, 150.0f);
    float best = -1.0f;
    for (const Aabb& b : boxes) {
      float distance = 0.0f;
      if (brute_enter(b, ray, limit, distance) && (best < 0.0f || distance < best)) best = distance;
    }
    const auto hit = bvh.raycast(ray, limit);
    if (hit) hit_count++;
    bool same = hit.has_value() == (best >= 0.0f);
    if (same && hit) {
      // 같은 거리의 상자가 여럿이면 어느 것이든 된다 — 돌려준 상자가 정말 그 거리에 있는지 본다
      float own = 0.0f;
      same = std::fabs(hit->distance - best) < 1e-4f && hit->primitive < boxes.size() &&
             brute_enter(boxes[hit->primitive], ray, limit, own) && std::fabs(own - best) < 1e-4f;
    }
    if (!same) mismatches++;
  }
  expect(mismatches == 0, "무작위 광선 2000 개가 전수 검사와 같은 답을 낸다");
  // 광선이 실제로 맞는 경우가 섞여 있어야 비교가 뜻이 있다
  expect(hit_count > 200 && hit_count < 1900, "무작위 광선에 맞는 것과 빗나가는 것이 섞여 있다");
}

// 투영한 뒤의 z/w — 보는 쪽이 -z 라 거리 d 의 점은 (0, 0, -d)
float projected_depth(const engine::Mat4& m, float distance) {
  const float z = m.m[10] * -distance + m.m[14];
  const float w = m.m[11] * -distance;
  return z / w;
}

// 가까운 면 1, 먼 면 3 — 손 계산 (WebGPU 규약 0..1): z' = (-1.5·(-d) - 1.5) / d → d=1: 0, d=2: 0.75, d=3: 1
void clip_depth() {
  const auto projection = engine::Mat4::perspective(1.0f, 1.0f, 1.0f, 3.0f);
  expect(std::fabs(projected_depth(projection, 1.0f)) < 1e-6f, "가까운 면은 0");
  expect(std::fabs(projected_depth(projection, 2.0f) - 0.75f) < 1e-6f, "거리 2 는 0.75");
  expect(std::fabs(projected_depth(projection, 3.0f) - 1.0f) < 1e-6f, "먼 면은 1");
}

namespace hud = engine::hud;

bool is_rect(const hud::DrawItem& item, float x, float y, float width, float height) {
  return item.kind == hud::DrawItem::Kind::rect && item.x == x && item.y == y && item.width == width && item.height == height;
}

bool is_text(const hud::DrawItem& item, float x, float y, float scale, const char* content) {
  return item.kind == hud::DrawItem::Kind::text && item.x == x && item.y == y && item.scale == scale && item.content == content;
}

// 화면 200×100 픽셀, 단위 2 픽셀 → 100×50 단위. 글꼴: 글자 폭 5, 칸 6, 높이 7. 기대값은 손으로 계산했다
void hud_layout() {
  const engine::Color ink{1, 1, 1}, shade{0, 0, 0};
  const hud::Element root = hud::box({.axis = hud::Axis::stack},
      // 왼쪽 위에서 (2, 2) — 안쪽 여백 1, 줄 사이 1 인 세로 상자. "AB" 는 폭 6+5=11, "C" 는 폭 5 → 상자 13×(1+7+1+7+1=17)
      hud::box({.padding = 1, .gap = 1, .background = shade, .offset_x = 2, .offset_y = 2},
          hud::text("AB", ink),
          hud::Element{},
          hud::text("C", ink)),
      // 오른쪽 아래에서 (-1, -1) — 10×4 → x 100-10-1=89, y 50-4-1=45
      hud::box({.width = 10, .height = 4, .background = shade, .anchor_x = hud::Align::end, .anchor_y = hud::Align::end, .offset_x = -1, .offset_y = -1}),
      // 한가운데 20×2 가로 상자 → x 40, y 24. 그 안 가운데의 6×2 → x 40+7=47
      hud::box({.axis = hud::Axis::row, .justify = hud::Align::center, .width = 20, .height = 2, .background = shade,
                .anchor_x = hud::Align::center, .anchor_y = hud::Align::center},
               hud::box({.width = 6, .height = 2, .background = ink})),
      // 글자 크기 2 — 한가운데 아래쪽. "A" 는 10×14 → x 45, y 50-14=36
      hud::box({.anchor_x = hud::Align::center, .anchor_y = hud::Align::end}, hud::text("A", ink, 2.0f)));
  hud::DrawList list;
  hud::layout(root, {200, 100, 2}, {5, 6, 7}, list);
  expect(list.size() == 7, "그릴 것은 일곱 개 (빈 요소는 빠진다)");
  if (list.size() != 7) return;
  expect(is_rect(list[0], 4, 4, 26, 34), "세로 상자의 바탕: (2,2) 13×17 단위 → (4,4) 26×34 픽셀");
  expect(is_text(list[1], 6, 6, 2, "AB"), "첫 줄 글자: (3,3) 단위 → (6,6) 픽셀, 점 2 픽셀");
  expect(is_text(list[2], 6, 22, 2, "C"), "둘째 줄 글자: y 3+7+1=11 단위 → 22 픽셀 (빈 요소는 자리를 차지하지 않는다)");
  expect(is_rect(list[3], 178, 90, 20, 8), "오른쪽 아래 상자: (89,45) 10×4 단위 → (178,90) 20×8 픽셀");
  expect(is_rect(list[4], 80, 48, 40, 4), "가운데 상자: (40,24) 20×2 단위 → (80,48) 40×4 픽셀");
  expect(is_rect(list[5], 94, 48, 12, 4), "그 안 가운데 상자: (47,24) 6×2 단위 → (94,48) 12×4 픽셀");
  expect(is_text(list[6], 90, 72, 4, "A"), "큰 글자: (45,36) 단위 → (90,72) 픽셀, 점 4 픽셀");
}

struct CounterState {
  int value;
  bool operator==(const CounterState&) const = default;
};
int renders = 0;
hud::Element counter_component(const CounterState& state) {
  renders++;
  return hud::box({}, hud::text(state.value == 1 ? "A" : "B", engine::Color{1, 1, 1}));
}

void hud_view() {
  hud::View<CounterState> view{counter_component};
  const hud::Viewport viewport{200, 100, 2};
  const hud::TextMetrics metrics{5, 6, 7};
  const hud::DrawList& first = view.update({1}, viewport, metrics);
  expect(renders == 1 && first.size() == 1 && first[0].content == "A", "처음에는 조립한다");
  view.update({1}, viewport, metrics);
  expect(renders == 1, "상태가 같으면 다시 조립하지 않는다");
  const hud::DrawList& changed = view.update({2}, viewport, metrics);
  expect(renders == 2 && changed.size() == 1 && changed[0].content == "B", "상태가 바뀌면 다시 조립한다");
  view.update({2}, {400, 200, 4}, metrics);
  expect(renders == 3, "화면이 바뀌면 다시 조립한다");
}

}  // namespace

int main() {
  literal_cases();
  against_brute_force();
  clip_depth();
  hud_layout();
  hud_view();
  if (failures == 0) std::printf("engine_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
