// 엔진 검증 프로브(LBVH, 투영 행렬, UTF-8·글꼴(면), 그림(QOI·JPEG) 풀기와 밉, HUD 배치(채우기·번지는 바탕·그림 덮기)·잘라 내기·위젯과 입력, 메시 읽기(색 메시·겉면 메시·모델), 에셋 팩 읽기) — Node 에서 돈다 (tests/game.test.mjs 가 부른다). 실패하면 까닭을 찍고 1 로 끝난다.
// 기대값: 손으로 계산한 작은 장면, 그리고 모든 상자를 하나씩 대 보는 전수 검사와의 비교.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <initializer_list>
#include <limits>
#include <optional>
#include <span>
#include <string_view>
#include <utility>
#include <vector>

#include "engine/asset/pack.hpp"
#include "engine/foundation/frame_governor.hpp"
#include "engine/hud/bitmap.hpp"
#include "engine/hud/element.hpp"
#include "engine/hud/font.hpp"
#include "engine/hud/interaction.hpp"
#include "engine/hud/jpeg.hpp"
#include "engine/hud/layout.hpp"
#include "engine/hud/view.hpp"
#include "engine/hud/widgets.hpp"
#include "engine/spatial/lbvh.hpp"
#include "engine/spatial/triangle.hpp"
#include "engine/spatial/static_mesh.hpp"
#include "engine/spatial/surface_mesh.hpp"
#include "tests/jpeg_fixtures.hpp"

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

/** 잎 방문 — 삼각형마다 감싸는 상자를 잎으로 넣고, 잎에서 삼각형 판정을 해 가장 가까운 것을 고른다 (라이트 베이커가 이렇게 쓴다) */
void triangle_traversal() {
  struct Triangle {
    Vec3 a, b, c;
  };
  // 손으로 놓은 장면: z = -5 와 z = -9 에 xy 평면과 나란한 큰 삼각형 둘(뒤의 것이 먼저 들어 있다), 옆으로 비켜난 것 하나, 광선과 나란한 것 하나
  const std::vector<Triangle> triangles = {
      {{-4, -4, -9}, {4, -4, -9}, {0, 4, -9}}, {{-4, -4, -5}, {4, -4, -5}, {0, 4, -5}}, {{10, 0, -3}, {12, 0, -3}, {11, 2, -3}}, {{-1, 3.5f, -2}, {1, 3.5f, -2}, {0, 3.5f, -7}}};
  std::vector<Aabb> boxes;
  for (const Triangle& t : triangles)
    boxes.push_back({{std::min({t.a.x, t.b.x, t.c.x}), std::min({t.a.y, t.b.y, t.c.y}), std::min({t.a.z, t.b.z, t.c.z})},
                     {std::max({t.a.x, t.b.x, t.c.x}), std::max({t.a.y, t.b.y, t.c.y}), std::max({t.a.z, t.b.z, t.c.z})}});
  Lbvh bvh;
  bvh.build(boxes);
  int visited = 0;
  const auto closest = [&](const Ray& ray, float limit) {
    std::optional<Lbvh::Hit> best;
    visited = 0;
    bvh.traverse(ray, limit, [&](uint32_t primitive, float, float reach) {
      visited++;
      const Triangle& t = triangles[primitive];
      const auto distance = engine::intersect(ray, t.a, t.b, t.c);
      if (!distance || *distance > reach) return reach;
      best = Lbvh::Hit{primitive, *distance};
      return *distance;
    });
    return best;
  };
  expect(hits(closest({{0, 0, 0}, {0, 0, -1}}, 100.0f), 1, 5.0f), "삼각형: 겹쳐 놓인 둘 가운데 가까운 것(z = -5)에 5 에서 닿는다");
  expect(hits(closest({{0, 0, -6}, {0, 0, -1}}, 100.0f), 0, 3.0f), "삼각형: 둘 사이에서 쏘면 뒤의 것에 3 에서 닿는다");
  expect(hits(closest({{0, 0, -6}, {0, 0, 1}}, 100.0f), 1, 1.0f), "삼각형: 뒷면에서 와도 닿는다 (뒤로 쏘면 앞의 것에 1 에서)");
  expect(!closest({{3.5f, 3.5f, 0}, {0, 0, -1}}, 100.0f) && visited >= 2, "삼각형: 감싸는 상자는 지나지만 삼각형 밖(귀퉁이)이면 빗나간다");
  expect(!closest({{0, 0, 0}, {0, 0, -1}}, 4.9f) && hits(closest({{0, 0, 0}, {0, 0, -1}}, 5.0f), 1, 5.0f), "삼각형: 한계 거리 안의 것만 — 4.9 에서는 없고 5 에서는 닿는다");
  expect(!closest({{0, 3.5f, 0}, {0, 0, -1}}, 4.0f), "삼각형: 광선과 나란한 삼각형은 닿지 않는다");
  expect(hits(closest({{0, -4, 0}, {0, 0, -1}}, 100.0f), 1, 5.0f), "삼각형: 가장자리에 걸친 광선은 닿는다");
  expect(hits(closest({{11, 1, 5}, {0, 0, -1}}, 100.0f), 2, 8.0f) && visited == 1, "삼각형: 비켜난 삼각형만 지나는 광선은 그 잎만 찾아간다");
  // 한계를 0 아래로 돌려주면 거기서 끝난다 (가려졌는지만 볼 때 — 첫 삼각형에서 멈춘다)
  int seen = 0;
  bvh.traverse({{0, 0, 0}, {0, 0, -1}}, 100.0f, [&](uint32_t, float, float) {
    seen++;
    return -1.0f;
  });
  expect(seen == 1, "잎 방문: 한계를 0 아래로 주면 더 찾아가지 않는다");
  // 방문은 상자에 닿는 잎을 빠짐없이 지난다 — 한계를 줄이지 않으면 겹쳐 놓인 둘과 나란한 것까지 셋
  seen = 0;
  bvh.traverse({{0, 0, 0}, {0, 0, -1}}, 100.0f, [&](uint32_t, float, float reach) {
    seen++;
    return reach;
  });
  expect(seen == 2, "잎 방문: 한계를 줄이지 않으면 광선이 상자를 지나는 잎을 모두 찾아간다 (z 축 위의 두 삼각형)");
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

bool is_image(const hud::DrawItem& item, float x, float y, float width, float height) {
  return item.kind == hud::DrawItem::Kind::image && item.x == x && item.y == y && item.width == width && item.height == height;
}

bool is_text(const hud::DrawItem& item, float x, float y, float size, const char* content) {
  return item.kind == hud::DrawItem::Kind::text && item.x == x && item.y == y && item.size == size && item.content == content;
}

std::vector<char32_t> codepoints(std::string_view text) {
  std::vector<char32_t> out;
  while (!text.empty()) out.push_back(hud::take_codepoint(text));
  return out;
}

void utf8() {
  using Codes = std::vector<char32_t>;
  // 1·2·3·4 바이트 글자: A, 가운뎃점(C2 B7), 가(EA B0 80), U+1F600(F0 9F 98 80)
  expect(codepoints("A\xC2\xB7\xEA\xB0\x80\xF0\x9F\x98\x80z") == Codes{0x41, 0xB7, 0xAC00, 0x1F600, 0x7A}, "1~4 바이트 글자를 차례대로 푼다");
  std::string_view rest = "\xEA\xB0\x80z";
  expect(hud::take_codepoint(rest) == 0xAC00 && rest == "z", "뗀 글자의 바이트만큼만 줄어든다");
  std::string_view empty;
  expect(hud::take_codepoint(empty) == 0 && empty.empty(), "빈 글은 0");
  // 잘못된 바이트는 하나씩 U+FFFD — 뒤의 올바른 글자는 살아남는다
  expect(codepoints("\x80" "A") == Codes{0xFFFD, 0x41}, "머리 없이 온 이음 바이트");
  expect(codepoints("\xEA\xB0") == Codes{0xFFFD, 0xFFFD}, "끝이 잘린 3 바이트 글자");
  expect(codepoints("\xEA" "A") == Codes{0xFFFD, 0x41}, "이음 바이트 자리에 온 다른 글자");
  expect(codepoints("\xC0\x80") == Codes{0xFFFD, 0xFFFD}, "2 바이트로 돌려 쓴 U+0000");
  expect(codepoints("\xE0\x80\xAF") == Codes{0xFFFD, 0xFFFD, 0xFFFD}, "3 바이트로 돌려 쓴 '/'");
  expect(codepoints("\xED\xA0\x80") == Codes{0xFFFD, 0xFFFD, 0xFFFD}, "대리 영역 U+D800");
  expect(codepoints("\xF4\x90\x80\x80") == Codes{0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD}, "U+10FFFF 를 넘는 값");
  expect(codepoints("\xFF") == Codes{0xFFFD}, "UTF-8 에 없는 바이트");
  expect(codepoints("\xF4\x8F\xBF\xBF") == Codes{0x10FFFF}, "가장 큰 글자 U+10FFFF");
}

template <class T>
void put(std::vector<uint8_t>& bytes, T value) {
  const auto* raw = reinterpret_cast<const uint8_t*>(&value);
  bytes.insert(bytes.end(), raw, raw + sizeof(T));
}

// 손으로 적은 .fontbin — 머리 12 바이트('ZKFT', 아틀라스 8×4, 면 수) + 면마다 16 바이트(구운 크기, 줄 높이, ascent, 글자 수) + 글자마다 24 바이트 + 아틀라스.
// 면 0: 구운 크기 10, 줄 높이 14. 글자(코드 순)와 나아감: '?' 4, 'A' 12, 'B' 10, 'C' 10, '가'(U+AC00) 10.
// second_face 면 1: 구운 크기 20, 줄 높이 28. 글자는 'A'(나아감 30) 하나 — '?' 가 없다
std::vector<uint8_t> font_bytes(bool second_face = false) {
  std::vector<uint8_t> bytes{'Z', 'K', 'F', 'T'};
  put<uint16_t>(bytes, 8);
  put<uint16_t>(bytes, 4);
  put<uint32_t>(bytes, second_face ? 2 : 1);
  put<float>(bytes, 10.0f);
  put<float>(bytes, 14.0f);
  put<float>(bytes, 11.0f);
  put<uint32_t>(bytes, 5);
  if (second_face) {
    put<float>(bytes, 20.0f);
    put<float>(bytes, 28.0f);
    put<float>(bytes, 22.0f);
    put<uint32_t>(bytes, 1);
  }
  const auto glyph = [&](uint32_t code, uint16_t x, uint16_t y, uint16_t w, uint16_t h, float left, float top, float advance) {
    put(bytes, code);
    for (const uint16_t value : {x, y, w, h}) put(bytes, value);
    for (const float value : {left, top, advance}) put(bytes, value);
  };
  glyph('?', 2, 0, 1, 1, 0, 0, 4);
  glyph('A', 3, 0, 2, 2, 0, 1, 12);
  glyph('B', 5, 0, 2, 2, 0, 1, 10);
  glyph('C', 0, 2, 2, 2, 0, 1, 10);
  glyph(0xAC00, 2, 1, 3, 2, 1, 2, 10);
  if (second_face) glyph('A', 4, 2, 4, 2, 0, 2, 30);
  for (int i = 0; i < 32; i++) bytes.push_back(i == 0 ? 255 : static_cast<uint8_t>(i));
  return bytes;
}

std::span<const std::byte> as_bytes(const std::vector<uint8_t>& data) { return std::as_bytes(std::span{data}); }

void font_data() {
  const std::vector<uint8_t> bytes = font_bytes();
  const auto font = hud::Font::decode(as_bytes(bytes));
  expect(font.has_value(), "올바른 .fontbin 은 풀린다");
  if (!font) return;
  expect(font->faces() == 1 && font->size() == 10.0f && font->atlas_width() == 8 && font->atlas_height() == 4, "면 하나, 구운 크기와 아틀라스 크기");
  expect(font->atlas().size() == 32 && font->atlas()[0] == std::byte{255} && font->atlas()[31] == std::byte{31}, "아틀라스는 글자 표 뒤의 32 바이트");
  expect(font->has('A') && font->has(0xAC00) && !font->has('D') && !font->has(0xAC01), "가진 글자와 없는 글자");
  const hud::Font::Glyph& ga = font->glyph(0xAC00);
  expect(ga.x == 2 && ga.y == 1 && ga.width == 3 && ga.height == 2 && ga.left == 1.0f && ga.top == 2.0f && ga.advance == 10.0f, "'가' 의 칸과 자리");
  expect(font->glyph('D').code == '?' && font->glyph(0xFFFD).advance == 4.0f, "없는 글자는 '?' 로");
  // 줄 높이 14 → 크기 5 에서는 절반
  expect(font->line_height(10.0f) == 14.0f && font->line_height(5.0f) == 7.0f, "줄 높이는 글자 크기에 비례한다");
  expect(font->width("", 10.0f) == 0.0f, "빈 글의 폭은 0");
  expect(font->width("AB", 10.0f) == 22.0f, "구운 크기에서 'AB' 는 12+10");
  // "A가" 는 UTF-8 로 4 바이트지만 글자는 둘이다: (12+10)·5/10
  expect(font->width("A\xEA\xB0\x80", 5.0f) == 11.0f, "크기 5 에서 'A가' 는 11");
  expect(font->width("AD", 10.0f) == 16.0f, "없는 글자는 '?' 의 나아감(4)으로 잰다");
  expect(font->width("\xEA\xB0", 10.0f) == 8.0f, "잘못된 바이트 둘은 '?' 둘");

  auto broken = bytes;
  broken[0] = 'X';
  expect(!hud::Font::decode(as_bytes(broken)), "머리가 다르면 거절한다");
  broken = bytes;
  broken.pop_back();
  expect(!hud::Font::decode(as_bytes(broken)), "아틀라스가 잘렸으면 거절한다");
  broken = bytes;
  broken.push_back(0);
  expect(!hud::Font::decode(as_bytes(broken)), "뒤에 남는 바이트가 있으면 거절한다");
  broken = bytes;
  // 구운 크기(12 번째 바이트부터 f32)를 0 으로
  std::memset(broken.data() + 12, 0, 4);
  expect(!hud::Font::decode(as_bytes(broken)), "구운 크기가 0 이면 거절한다");
  broken = bytes;
  // 셋째 글자('B', 28+2·24 바이트부터)의 코드를 'A' 로 — 코드 순이 아니다
  broken[28 + 2 * 24] = 'A';
  expect(!hud::Font::decode(as_bytes(broken)), "코드 순이 아니면 거절한다");
  broken = bytes;
  // 첫 글자의 칸 x(코드 뒤 u16)를 8 로 — 폭 1 을 더하면 아틀라스(8) 밖이다
  broken[28 + 4] = 8;
  expect(!hud::Font::decode(as_bytes(broken)), "아틀라스 밖의 칸은 거절한다");
  broken = bytes;
  // 면 수(8 번째 바이트부터 u32)를 0 으로, 그리고 면의 표가 다 들어 있지 않은 수(2)로
  broken[8] = 0;
  expect(!hud::Font::decode(as_bytes(broken)), "면이 없으면 거절한다");
  broken[8] = 2;
  expect(!hud::Font::decode(as_bytes(broken)), "면 수와 데이터 크기가 맞지 않으면 거절한다");

  // '?' 가 없는 글꼴 — 글자 수를 0 으로 줄이고 표를 뺀다
  std::vector<uint8_t> bare(bytes.begin(), bytes.begin() + 28);
  std::memset(bare.data() + 24, 0, 4);
  bare.insert(bare.end(), bytes.end() - 32, bytes.end());
  const auto empty = hud::Font::decode(as_bytes(bare));
  expect(empty && empty->width("AB", 10.0f) == 0.0f, "'?' 도 없으면 없는 글자는 자리를 차지하지 않는다");

  // 면 둘 — 면마다 구운 크기와 글자 묶음이 다르다
  const std::vector<uint8_t> two_bytes = font_bytes(true);
  const auto two = hud::Font::decode(as_bytes(two_bytes));
  expect(two && two->faces() == 2 && two->size(0) == 10.0f && two->size(1) == 20.0f, "면 둘의 구운 크기");
  if (!two) return;
  // 면 1 의 'A' 는 구운 크기 20 에서 나아감 30 → 크기 10 에서는 15. 줄 높이 28 → 크기 10 에서 14 (면 0 과 같다)
  expect(two->width("A", 10.0f, 0) == 12.0f && two->width("A", 10.0f, 1) == 15.0f && two->line_height(10.0f, 1) == 14.0f, "같은 글자도 면에 따라 폭이 다르다");
  expect(two->has('B', 0) && !two->has('B', 1) && two->glyph('A', 1).x == 4, "면마다 가진 글자가 다르다");
  expect(two->width("AB", 10.0f, 1) == 15.0f, "그 면에 없는 글자는 그 면의 '?' 로 — '?' 도 없으면 자리를 차지하지 않는다");
  expect(two->width("A", 10.0f, 7) == 12.0f && two->has('B', 7), "없는 면 번호는 면 0 으로 친다");
  // 배치는 면으로 재고, 그리기 목록에 면을 적는다 — "A" 를 크기 5 단위로: 면 1 에서 폭 7.5 단위
  hud::DrawList list;
  hud::Regions regions;
  hud::layout(hud::box({.axis = hud::Axis::row}, hud::text("A", engine::Color{1, 1, 1}, 5.0f, 1), hud::text("A", engine::Color{1, 1, 1}, 5.0f)), {200, 100, 2}, *two, list, regions);
  expect(list.size() == 2 && list[0].face == 1 && list[1].face == 0 && list[1].x == 15.0f, "굵기(면)를 고른 글자: 면 1 의 'A'(7.5 단위 = 15 픽셀) 뒤에 면 0 의 'A'");
}

// 손으로 적은 QOI — 7×1 픽셀, 묶음 종류마다 하나씩:
//   RGB(16,32,48) · DIFF(+1,-2,0) → (17,30,48) · LUMA(초록 +5, 빨강 +2, 파랑 +7) → (19,35,55) · RUN 2 → 같은 픽셀 둘
//   · INDEX 21 → 첫 픽셀 ((16·3 + 32·5 + 48·7 + 255·11) mod 64 = 21) · RGBA(1,2,3,4)
std::vector<uint8_t> qoi_bytes() {
  return {'q', 'o', 'i', 'f', 0, 0, 0, 7, 0, 0, 0, 1, 4, 0,
          0xFE, 16, 32, 48, 0x72, 0xA5, 0x5A, 0xC1, 0x15, 0xFF, 1, 2, 3, 4,
          0, 0, 0, 0, 0, 0, 0, 1};
}

void bitmap_data() {
  const std::vector<uint8_t> bytes = qoi_bytes();
  const auto bitmap = hud::Bitmap::decode(as_bytes(bytes));
  expect(bitmap && bitmap->width == 7 && bitmap->height == 1, "올바른 QOI 는 풀린다");
  if (!bitmap) return;
  const std::vector<uint8_t> expected{16, 32, 48, 255, 17, 30, 48, 255, 19, 35, 55, 255, 19, 35, 55, 255, 19, 35, 55, 255, 16, 32, 48, 255, 1, 2, 3, 4};
  expect(bitmap->rgba.size() == expected.size() && std::memcmp(bitmap->rgba.data(), expected.data(), expected.size()) == 0, "묶음(RGB·DIFF·LUMA·RUN·INDEX·RGBA)마다 픽셀이 맞다");

  auto broken = bytes;
  broken[0] = 'x';
  expect(!hud::Bitmap::decode(as_bytes(broken)), "머리가 다르면 거절한다");
  broken = bytes;
  broken[7] = 0;
  expect(!hud::Bitmap::decode(as_bytes(broken)), "너비가 0 이면 거절한다");
  broken = bytes;
  // 너비(4…7 번째 바이트, 빅 엔디언)를 8193 으로 — 한 변의 상한(8192)을 넘는다
  broken[6] = 0x20;
  broken[7] = 0x01;
  expect(!hud::Bitmap::decode(as_bytes(broken)), "상한보다 큰 그림은 거절한다");
  broken = bytes;
  broken[12] = 5;
  expect(!hud::Bitmap::decode(as_bytes(broken)), "채널 수가 3·4 가 아니면 거절한다");
  broken = bytes;
  // RUN 묶음(21 번째 바이트)을 빼면 픽셀이 둘 모자란다
  broken.erase(broken.begin() + 21);
  expect(!hud::Bitmap::decode(as_bytes(broken)), "픽셀이 모자라면 거절한다");
  broken = bytes;
  // RUN 2 를 RUN 6 으로 — 남은 자리(넷)를 넘는다
  broken[21] = 0xC5;
  expect(!hud::Bitmap::decode(as_bytes(broken)), "남은 자리를 넘는 RUN 은 거절한다");
  broken = bytes;
  // 너비를 6 으로 — 픽셀을 다 채우고도 묶음이 남는다
  broken[7] = 6;
  expect(!hud::Bitmap::decode(as_bytes(broken)), "묶음이 남으면 거절한다");
  broken = bytes;
  broken.back() = 0;
  expect(!hud::Bitmap::decode(as_bytes(broken)), "끝 표시가 없으면 거절한다");
  broken = bytes;
  broken.resize(20);
  expect(!hud::Bitmap::decode(as_bytes(broken)), "잘린 데이터는 거절한다");
}

// 화면 200×100 픽셀, 단위 2 픽셀 → 100×50 단위. 글꼴은 font_bytes(): 글자 크기 5 단위에서 'A' 폭 6, 'B'·'C' 폭 5, 줄 높이 7.
// 기대값은 손으로 계산했다
constexpr hud::Viewport SCREEN_200{200, 100, 2};

/** 그림의 (x, y) 픽셀이 기대한 색과 채널마다 tolerance 안인가 */
bool pixel_near(const hud::Bitmap& bitmap, uint32_t x, uint32_t y, int r, int g, int b, int tolerance) {
  const std::byte* p = bitmap.rgba.data() + (static_cast<std::size_t>(y) * bitmap.width + x) * 4;
  const int got[] = {static_cast<int>(p[0]), static_cast<int>(p[1]), static_cast<int>(p[2])};
  return std::abs(got[0] - r) <= tolerance && std::abs(got[1] - g) <= tolerance && std::abs(got[2] - b) <= tolerance && p[3] == std::byte{255};
}

/** 표식(0xFF, kind)의 자리 — 없으면 bytes 의 크기 */
std::size_t find_marker(const std::vector<uint8_t>& bytes, uint8_t kind) {
  for (std::size_t i = 0; i + 1 < bytes.size(); i++)
    if (bytes[i] == 0xFF && bytes[i + 1] == kind) return i;
  return bytes.size();
}

// 기대 픽셀은 ffmpeg 가 같은 파일을 푼 값이다 (tests/jpeg_fixtures.hpp). 역 DCT 의 반올림과 색 변환의 끝자리가 구현마다 달라 ±3 까지 본다
void jpeg_data() {
  using namespace jpeg_fixtures;
  constexpr int TOLERANCE = 3;
  const auto solid = hud::decode_jpeg(std::as_bytes(std::span{SOLID_JPEG}));
  expect(solid && solid->width == 8 && solid->height == 8 && solid->rgba.size() == 256, "8×8 단색 JPEG 이 풀린다");
  if (solid) expect(pixel_near(*solid, 0, 0, 199, 121, 39, TOLERANCE) && pixel_near(*solid, 7, 7, 199, 121, 39, TOLERANCE), "단색 JPEG 의 픽셀이 ffmpeg 가 푼 색이다 (세 성분이 모두 1×2 인 4:4:4)");

  const auto quad = hud::decode_jpeg(std::as_bytes(std::span{QUAD_JPEG}));
  expect(quad && quad->width == 32 && quad->height == 32, "4:2:0 JPEG 이 풀린다");
  if (quad)
    expect(pixel_near(*quad, 8, 8, 219, 59, 52, TOLERANCE) && pixel_near(*quad, 24, 8, 38, 160, 89, TOLERANCE) && pixel_near(*quad, 8, 24, 48, 80, 210, TOLERANCE) &&
               pixel_near(*quad, 24, 24, 229, 219, 179, TOLERANCE),
           "4:2:0 JPEG 의 네 칸 가운데가 ffmpeg 가 푼 색이다");

  const auto grad = hud::decode_jpeg(std::as_bytes(std::span{GRAD_JPEG}));
  expect(grad && grad->width == 13 && grad->height == 11, "8 의 배수가 아닌 크기의 JPEG 이 풀린다");
  bool same = static_cast<bool>(grad);
  for (uint32_t i = 0; same && i < 13 * 11; i++) same = pixel_near(*grad, i % 13, i / 13, GRAD_PIXELS[i * 3], GRAD_PIXELS[i * 3 + 1], GRAD_PIXELS[i * 3 + 2], TOLERANCE);
  expect(same, "색 기울기 JPEG 의 모든 픽셀이 ffmpeg 가 푼 값과 ±3 안이다");

  const auto gray = hud::decode_jpeg(std::as_bytes(std::span{GRAY_JPEG}));
  expect(gray && gray->width == 16 && gray->height == 8, "회색 JPEG 이 풀린다");
  same = static_cast<bool>(gray);
  for (uint32_t i = 0; same && i < 16 * 8; i++) same = pixel_near(*gray, i % 16, i / 16, GRAY_PIXELS[i * 3], GRAY_PIXELS[i * 3 + 1], GRAY_PIXELS[i * 3 + 2], 2);
  expect(same, "회색 JPEG 의 모든 픽셀이 ffmpeg 가 푼 값과 ±2 안이다");

  // 잘린 파일 — 어느 자리에서 잘려도 거절한다
  const std::vector<uint8_t> whole(std::begin(QUAD_JPEG), std::end(QUAD_JPEG));
  bool rejected = true;
  for (std::size_t size = 0; size < whole.size(); size++) rejected = rejected && !hud::decode_jpeg(as_bytes(whole).first(size));
  expect(rejected, "잘린 JPEG 은 어디서 잘렸든 거절한다");
  std::vector<uint8_t> broken = whole;
  broken.push_back(0);
  expect(!hud::decode_jpeg(as_bytes(broken)), "끝 표식 뒤에 바이트가 남으면 거절한다");
  const std::size_t frame = find_marker(whole, 0xC0), scan = find_marker(whole, 0xDA), tables = find_marker(whole, 0xDB), codes = find_marker(whole, 0xC4);
  expect(frame < whole.size() && scan < whole.size() && tables < whole.size() && codes < whole.size(), "재료 JPEG 에 SOF0·SOS·DQT·DHT 가 있다");
  broken = whole;
  broken[frame + 1] = 0xC2;
  expect(!hud::decode_jpeg(as_bytes(broken)), "progressive(SOF2)는 거절한다");
  broken = whole;
  broken[frame + 1] = 0xC9;
  expect(!hud::decode_jpeg(as_bytes(broken)), "산술 부호화(SOF9)는 거절한다");
  broken = whole;
  broken[frame + 4] = 12;
  expect(!hud::decode_jpeg(as_bytes(broken)), "12 비트 표본은 거절한다");
  broken = whole;
  broken[frame + 5] = 0x20;
  expect(!hud::decode_jpeg(as_bytes(broken)), "상한(4096)보다 큰 그림은 거절한다");
  broken = whole;
  broken[frame + 12] = 4;
  expect(!hud::decode_jpeg(as_bytes(broken)), "범위 밖의 양자화 표 번호는 거절한다");
  broken = whole;
  broken[frame + 11] = 0x33;
  expect(!hud::decode_jpeg(as_bytes(broken)), "표본 비가 2 를 넘으면 거절한다");
  broken = whole;
  broken[tables + 4] = 0x14;
  expect(!hud::decode_jpeg(as_bytes(broken)), "16 비트 양자화 표·범위 밖의 표 번호는 거절한다");
  broken = whole;
  broken[codes + 4] = 0x04;
  expect(!hud::decode_jpeg(as_bytes(broken)), "범위 밖의 Huffman 표 번호는 거절한다");
  broken = whole;
  broken[codes + 5] = 3;
  expect(!hud::decode_jpeg(as_bytes(broken)), "길이 1 인 부호가 셋이라는 Huffman 표는 거절한다");
  broken = whole;
  broken[scan + 6] = 0x41;
  expect(!hud::decode_jpeg(as_bytes(broken)), "스캔이 정의되지 않은 Huffman 표를 가리키면 거절한다");
  broken = whole;
  broken[scan + 12] = 5;
  expect(!hud::decode_jpeg(as_bytes(broken)), "계수의 일부만 싣는 스캔은 거절한다");
  broken = whole;
  broken[1] = 0xD9;
  expect(!hud::decode_jpeg(as_bytes(broken)), "시작 표식이 없으면 거절한다");

  // 밉 — 2×2 를 1×1 로: 선형 빛에서 평균한다. 검정과 흰색 반반이면 선형 0.5 = sRGB 188 (감마 값의 평균 128 이 아니다)
  hud::Bitmap checker{.width = 2, .height = 2, .rgba = {}};
  for (const int value : {0, 255, 255, 0})
    for (const int channel : {value, value, value, value == 0 ? 100 : 200}) checker.rgba.push_back(static_cast<std::byte>(channel));
  const hud::Bitmap half = hud::halved_srgb(checker);
  expect(half.width == 1 && half.height == 1 && half.rgba.size() == 4, "2×2 의 밉은 1×1 이다");
  expect(half.rgba.size() == 4 && half.rgba[0] == std::byte{188} && half.rgba[1] == std::byte{188} && half.rgba[2] == std::byte{188}, "밉의 색은 선형 빛의 평균이다 (검정·흰색 반반 → 188)");
  expect(half.rgba.size() == 4 && half.rgba[3] == std::byte{150}, "밉의 알파는 그대로 평균한다");
  // 색이 아닌 그림(법선·거칠기)의 밉은 값을 그대로 평균한다 — (0, 255, 255, 0) → 128 (sRGB 로 보는 평균 188 이 아니다), 알파도 같이
  const hud::Bitmap linear = hud::halved_linear(checker);
  expect(linear.width == 1 && linear.rgba.size() == 4 && linear.rgba[0] == std::byte{128} && linear.rgba[2] == std::byte{128} && linear.rgba[3] == std::byte{150}, "값의 밉은 그대로 평균한다 (128)");
  hud::Bitmap strip{.width = 4, .height = 1, .rgba = {}};
  for (const int value : {10, 10, 200, 200})
    for (const int channel : {value, value, value, 255}) strip.rgba.push_back(static_cast<std::byte>(channel));
  const hud::Bitmap narrow = hud::halved_srgb(strip);
  expect(narrow.width == 2 && narrow.height == 1 && narrow.rgba.size() == 8 && narrow.rgba[0] == std::byte{10} && narrow.rgba[4] == std::byte{200}, "한 변이 1 인 그림은 다른 변만 준다");
}

void hud_layout() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  const engine::Color ink{1, 1, 1}, shade{0, 0, 0};
  const hud::Element root = hud::box({.axis = hud::Axis::stack},
      // 왼쪽 위에서 (2, 2) — 안쪽 여백 1, 줄 사이 1 인 세로 상자. "AB" 는 폭 6+5=11, "C" 는 폭 5 → 상자 (1+11+1=13)×(1+7+1+7+1=17)
      hud::box({.padding = 1, .gap = 1, .background = shade, .offset_x = 2, .offset_y = 2},
          hud::text("AB", ink, 5.0f),
          hud::Element{},
          hud::text("C", ink, 5.0f)),
      // 오른쪽 아래에서 (-1, -1) — 10×4 → x 100-10-1=89, y 50-4-1=45
      hud::box({.width = 10, .height = 4, .background = shade, .anchor_x = hud::Align::end, .anchor_y = hud::Align::end, .offset_x = -1, .offset_y = -1}),
      // 한가운데 20×2 가로 상자 → x 40, y 24. 그 안 가운데의 6×2 → x 40+7=47
      hud::box({.axis = hud::Axis::row, .justify = hud::Align::center, .width = 20, .height = 2, .background = shade,
                .anchor_x = hud::Align::center, .anchor_y = hud::Align::center},
               hud::box({.width = 6, .height = 2, .background = ink})),
      // 글자 크기 10 — 한가운데 아래쪽. "A" 는 12×14 → x (100-12)/2=44, y 50-14=36
      hud::box({.anchor_x = hud::Align::center, .anchor_y = hud::Align::end}, hud::text("A", ink, 10.0f)));
  hud::DrawList list;
  hud::Regions regions;
  hud::layout(root, {200, 100, 2}, font, list, regions);
  expect(regions.items.empty(), "위젯이 없으면 닿을 자리도 없다");
  expect(list.size() == 7, "그릴 것은 일곱 개 (빈 요소는 빠진다)");
  if (list.size() != 7) return;
  expect(is_rect(list[0], 4, 4, 26, 34), "세로 상자의 바탕: (2,2) 13×17 단위 → (4,4) 26×34 픽셀");
  expect(is_text(list[1], 6, 6, 10, "AB"), "첫 줄 글자: (3,3) 단위 → (6,6) 픽셀, 글자 크기 5 단위 → 10 픽셀");
  expect(is_text(list[2], 6, 22, 10, "C"), "둘째 줄 글자: y 3+7+1=11 단위 → 22 픽셀 (빈 요소는 자리를 차지하지 않는다)");
  expect(is_rect(list[3], 178, 90, 20, 8), "오른쪽 아래 상자: (89,45) 10×4 단위 → (178,90) 20×8 픽셀");
  expect(is_rect(list[4], 80, 48, 40, 4), "가운데 상자: (40,24) 20×2 단위 → (80,48) 40×4 픽셀");
  expect(is_rect(list[5], 94, 48, 12, 4), "그 안 가운데 상자: (47,24) 6×2 단위 → (94,48) 12×4 픽셀");
  expect(is_text(list[6], 88, 72, 20, "A"), "큰 글자: (44,36) 단위 → (88,72) 픽셀, 글자 크기 20 픽셀");
  expect(list[0].color_end == shade && list[0].face == 0, "번지지 않는 바탕은 끝 색이 시작 색과 같다");
}

// 부모를 채우는 상자, 좌우 여백, 번지는 바탕, 그림 — 화면 200×100 픽셀, 단위 2 픽셀 (100×50 단위). 기대값은 손으로 계산했다
void hud_fill_and_image() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  const engine::Color black{0, 0, 0}, white{1, 1, 1}, grey{0.5f, 0.5f, 0.5f};
  hud::DrawList list;
  hud::Regions regions;
  hud::layout(hud::box({.axis = hud::Axis::stack},
                  // 화면을 다 채우는 상자 — 부모의 내용 크기에는 들지 않는다
                  hud::box({.fill_x = true, .fill_y = true, .background = black}),
                  // (10, 10) 의 40×10 가로 상자, 사이 2: 6×4 · 남는 폭을 채우는 상자 · 8×4.
                  //   남는 폭 40 - 6 - 8 - 2·2 = 22 → 가운데 상자는 x 10+6+2 = 18, 폭 22, 높이는 부모만큼 10. 셋째는 x 18+22+2 = 42
                  hud::box({.axis = hud::Axis::row, .gap = 2, .width = 40, .height = 10, .offset_x = 10, .offset_y = 10},
                           hud::box({.width = 6, .height = 4, .background = white}), hud::box({.fill_x = true, .fill_y = true, .background = grey}),
                           hud::box({.width = 8, .height = 4, .background = white})),
                  // (10, 30) — 여백 1 에 좌우로 3 을 더한 상자 안의 "A"(6×7): 상자 6+2·4 = 14 × 7+2·1 = 9, 글자는 x 10+4 = 14, y 31
                  hud::box({.padding = 1, .padding_x = 3, .background = white, .offset_x = 10, .offset_y = 30}, hud::text("A", black, 5.0f))),
              SCREEN_200, font, list, regions);
  expect(list.size() == 6, "그릴 것은 여섯 개");
  if (list.size() != 6) return;
  expect(is_rect(list[0], 0, 0, 200, 100), "stack 의 부모를 채우는 상자는 화면 전체");
  expect(is_rect(list[1], 20, 20, 12, 8) && is_rect(list[2], 36, 20, 44, 20) && is_rect(list[3], 84, 20, 16, 8), "row 에서 남는 폭을 채우는 상자: (18,10) 22×10 단위");
  expect(is_rect(list[4], 20, 60, 28, 18) && is_text(list[5], 28, 62, 10, "A"), "좌우에 더한 여백: 상자 14×9 단위, 글자는 4 단위 들어간 자리");

  // 세로로 쌓은 상자에서 남는 높이를 둘이 고르게 나눈다 — 높이 20 에서 4 를 빼고 사이 1·2 를 뺀 14 를 7 씩. 폭은 fill_x 인 것만 부모만큼
  hud::layout(hud::box({.axis = hud::Axis::stack},
                  hud::box({.gap = 1, .width = 10, .height = 20},
                           hud::box({.width = 3, .fill_y = true, .background = white}), hud::box({.width = 4, .height = 4, .background = grey}),
                           hud::box({.fill_x = true, .fill_y = true, .background = white}))),
              SCREEN_200, font, list, regions);
  expect(list.size() == 3 && is_rect(list[0], 0, 0, 6, 14) && is_rect(list[1], 0, 16, 8, 8) && is_rect(list[2], 0, 26, 20, 14), "column 에서 남는 높이를 둘이 7 단위씩 나눈다");

  // 번지는 바탕 — 검정에서 흰색으로, 왼쪽에서 오른쪽. (10,10) 의 폭 5 잘린 상자 안의 10×10: 왼쪽 절반만 남고 끝 색은 한가운데의 회색
  hud::layout(hud::box({.axis = hud::Axis::stack},
                  hud::box({.width = 10, .height = 10, .background = black, .background_end = white, .fade = hud::Fade::right}),
                  hud::box({.width = 5, .height = 10, .clip = true, .offset_x = 10, .offset_y = 10},
                           hud::box({.width = 10, .height = 10, .background = black, .background_end = white, .fade = hud::Fade::right})),
                  // 위에서 아래로 — (30,10) 의 높이 10 잘린 상자 안에서 5 내려간 10×20: 위 1/4 이 가려지고 가운데 절반이 남는다 → 색은 1/4 … 3/4
                  hud::box({.width = 10, .height = 10, .clip = true, .offset_x = 30, .offset_y = 10},
                           hud::box({.axis = hud::Axis::stack}, hud::box({.width = 10, .height = 20, .background = black, .background_end = white, .offset_y = -5})))),
              SCREEN_200, font, list, regions);
  expect(list.size() == 3 && is_rect(list[0], 0, 0, 20, 20) && list[0].color == black && list[0].color_end == white && list[0].fade == hud::Fade::right,
         "번지는 바탕은 시작 색과 끝 색, 방향을 낸다");
  expect(list.size() == 3 && is_rect(list[1], 20, 20, 10, 20) && list[1].color == black && list[1].color_end == grey, "잘린 번지는 바탕은 남은 부분의 끝 색으로");
  expect(list.size() == 3 && is_rect(list[2], 60, 20, 20, 20) && list[2].color == engine::Color{0.25f, 0.25f, 0.25f} && list[2].color_end == engine::Color{0.75f, 0.75f, 0.75f} &&
             list[2].fade == hud::Fade::down,
         "위아래로 잘린 번지는 바탕: 1/4 … 3/4 의 색");

  // 그림이 상자를 덮을 때 보이는 부분 — 1600×800 그림
  //   400×400 상자: 배율 max(400/1600, 400/800) = 1/2 → 800×800 이 보인다. 가운데를 남기면 x 400, 오른쪽 끝을 남기면 x 800
  expect(hud::cover(1600, 800, 400, 400, 0.5f, 0.5f) == hud::Rect{400, 0, 800, 800} && hud::cover(1600, 800, 400, 400, 1.0f, 0.5f) == hud::Rect{800, 0, 800, 800},
         "좁은 상자는 그림의 좌우가 잘린다");
  //   100×400 그림, 200×200 상자: 배율 2 → 100×100 이 보인다. 위에서 1/4 자리를 남기면 y (400-100)/4 = 75
  expect(hud::cover(100, 400, 200, 200, 0.5f, 0.25f) == hud::Rect{0, 75, 100, 100}, "납작한 상자는 그림의 위아래가 잘린다");
  expect(hud::cover(1600, 800, 400, 200, 0.3f, 0.9f) == hud::Rect{0, 0, 1600, 800}, "비율이 같으면 그림 전체");
  expect(hud::cover(1600, 800, 400, 400, 7.0f, -3.0f) == hud::Rect{800, 0, 800, 800}, "남길 자리는 0…1 로 묶는다");
  expect(hud::cover(0, 900, 800, 600, 0.5f, 0.5f) == hud::Rect{} && hud::cover(1600, 900, 0, 600, 0.5f, 0.5f) == hud::Rect{}, "크기가 0 이면 빈 사각형");

  // 화면(200×100)을 채우는 그림 요소 — 배율 max(200/1600, 100/900) = 1/8 → 1600×800 이 보이고, 위아래 가운데면 y 50
  const hud::Picture picture{3, 1600, 900};
  hud::layout(hud::box({.axis = hud::Axis::stack}, hud::image(picture, {.fill_x = true, .fill_y = true}), hud::image({}, {.width = 10, .height = 10}),
                       // (10,10) 의 폭 10 잘린 상자 안의 20×10 그림(80×40 그림 전체) — 왼쪽 절반만 남는다
                       hud::box({.width = 10, .height = 10, .clip = true, .offset_x = 10, .offset_y = 10}, hud::image({4, 80, 40}, {.width = 20, .height = 10}, 0.5f, 0.5f, grey))),
              SCREEN_200, font, list, regions);
  expect(list.size() == 2 && is_image(list[0], 0, 0, 200, 100) && list[0].image == 3 && list[0].source == hud::Rect{0, 50, 1600, 800} &&
             list[0].color == white,
         "화면을 덮는 그림: 번호와 보이는 부분 (번호 0 인 그림은 그리지 않는다)");
  expect(list.size() == 2 && is_image(list[1], 20, 20, 20, 20) && list[1].image == 4 && list[1].source == hud::Rect{0, 0, 40, 40} && list[1].color == grey,
         "잘린 그림은 남은 만큼만, 보이는 부분도 같은 비율로. 곱하는 색을 낸다");
  expect(regions.items.empty(), "그림은 입력에 닿지 않는다");
}

// 요소와 자손에 거는 변환 — 불투명도와 크기 (화면 200×100 픽셀, 단위 2 픽셀). 배치는 그대로 두고 그린 것만 origin 을 붙박아 키운다. 기대값은 손으로 계산했다
void hud_transform() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  const engine::Color white{1, 1, 1}, grey{0.5f, 0.5f, 0.5f};
  hud::DrawList list;
  hud::Regions regions;
  hud::layout(hud::box({.axis = hud::Axis::stack},
                  // (10,10) 의 20×10 상자 → 픽셀 (20,20) 40×20, 가운데 (40,30) 을 붙박고 1.5 배: (40 − 20·1.5, 30 − 10·1.5) = (10,15) 60×30. 알파는 절반.
                  //   그 안 (2,2) 의 4×4 → 픽셀 (24,24) 8×8 → (40 − 16·1.5, 30 − 6·1.5) = (16,21) 12×12
                  hud::box({.axis = hud::Axis::stack, .width = 20, .height = 10, .background = white, .offset_x = 10, .offset_y = 10, .opacity = 0.5f, .scale = 1.5f},
                           hud::box({.width = 4, .height = 4, .background = grey, .offset_x = 2, .offset_y = 2})),
                  // (10,30) 의 "A"(6×7 단위 → 픽셀 (20,60) 12×14) 를 오른쪽 아래 (32,74) 를 붙박고 2 배: 글자는 (32 − 12·2, 74 − 14·2) = (8,46), 크기 10 → 20 픽셀
                  hud::box({.offset_x = 10, .offset_y = 30, .scale = 2.0f, .origin_x = hud::Align::end, .origin_y = hud::Align::end}, hud::text("A", white, 5.0f)),
                  // 겹친 변환 — 화면 왼쪽 위를 붙박은 2 배·알파 1/2 안에서, (5,5) 의 2×2(픽셀 (10,10) 4×4)를 제 왼쪽 위를 붙박고 1/2 배·알파 1/2:
                  //   자리는 (10,10) 그대로에서 바깥의 2 배 → (20,20), 크기 4 × 1/2 × 2 = 4, 알파 1/4. 그 옆 (8,5) 의 2×2 는 바깥 것만: (32,20) 8×8, 알파 1/2
                  hud::box({.axis = hud::Axis::stack, .width = 10, .height = 10, .opacity = 0.5f, .scale = 2.0f, .origin_x = hud::Align::start, .origin_y = hud::Align::start},
                           hud::box({.width = 2, .height = 2, .background = white, .offset_x = 5, .offset_y = 5, .opacity = 0.5f, .scale = 0.5f, .origin_x = hud::Align::start,
                                     .origin_y = hud::Align::start}),
                           hud::box({.width = 2, .height = 2, .background = white, .offset_x = 8, .offset_y = 5})),
                  // 변환이 없는 이웃은 그대로다
                  hud::box({.width = 3, .height = 3, .background = grey, .offset_x = 90, .offset_y = 40})),
              SCREEN_200, font, list, regions);
  expect(list.size() == 6, "그릴 것은 여섯 개");
  if (list.size() != 6) return;
  expect(is_rect(list[0], 10, 15, 60, 30) && list[0].color == engine::Color{1, 1, 1, 0.5f}, "키운 상자: 가운데를 붙박고 1.5 배, 알파 절반");
  expect(is_rect(list[1], 16, 21, 12, 12) && list[1].color == engine::Color{0.5f, 0.5f, 0.5f, 0.5f}, "그 자손도 같은 자리를 붙박고 커지고 같이 옅어진다");
  expect(is_text(list[2], 8, 46, 20, "A") && list[2].color == white, "글자도 커진다 — 오른쪽 아래를 붙박으면 왼쪽 위로 자란다");
  expect(is_rect(list[3], 20, 20, 4, 4) && list[3].color == engine::Color{1, 1, 1, 0.25f}, "겹친 변환은 곱해진다");
  expect(is_rect(list[4], 32, 20, 8, 8) && list[4].color == engine::Color{1, 1, 1, 0.5f} && is_rect(list[5], 180, 80, 6, 6) && list[5].color == grey, "변환은 그 가지에만 닿는다");
}

// 바탕의 도형 — 사각형째로 나가고 도형과 그 치수(픽셀)가 실린다 (화면 200×100 픽셀, 단위 2 픽셀). 기대값은 손으로 계산했다
void hud_shapes() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  const engine::Color white{1, 1, 1}, grey{0.5f, 0.5f, 0.5f};
  hud::DrawList list;
  hud::Regions regions;
  hud::layout(hud::box({.axis = hud::Axis::stack},
                  // 마름모는 치수가 없다. 테의 두께 1 단위 = 2 픽셀
                  hud::box({.width = 10, .height = 10, .background = white, .shape = hud::Shape::diamond, .shape_size = 3}),
                  hud::box({.width = 10, .height = 10, .background = white, .shape = hud::Shape::ring, .shape_size = 1, .offset_x = 20}),
                  // 선은 적어도 1 픽셀 (0.1 단위 = 0.2 픽셀 → 1)
                  hud::box({.width = 5, .height = 10, .background = white, .shape = hud::Shape::chevron_left, .shape_size = 0.1f, .offset_x = 40}),
                  // 비스듬한 칸 — 비껴 난 거리 1.5 단위 = 3 픽셀, 음수면 왼쪽으로 (그대로 음수). 번지는 바탕도 실린다
                  hud::box({.width = 8, .height = 4, .background = white, .background_end = grey, .fade = hud::Fade::right, .shape = hud::Shape::slant, .shape_size = -1.5f, .offset_x = 60}),
                  // 변환 안에서는 치수도 같이 커진다 — (10,30) 의 10×10 을 왼쪽 위를 붙박고 2 배: 픽셀 (20,60) 40×40, 선 2 → 4 픽셀. 알파 절반
                  hud::box({.width = 10, .height = 10, .background = white, .shape = hud::Shape::chevron_right, .shape_size = 1, .offset_x = 10, .offset_y = 30, .opacity = 0.5f,
                            .scale = 2.0f, .origin_x = hud::Align::start, .origin_y = hud::Align::start}),
                  // 잘린 상자 안의 도형은 자르지 않는다 — 다 밖이면 빠지고, 걸쳤으면 사각형째로 나간다
                  hud::box({.axis = hud::Axis::stack, .width = 10, .height = 10, .clip = true, .offset_x = 80},
                           hud::box({.width = 4, .height = 4, .background = white, .shape = hud::Shape::diamond, .offset_x = 20}),
                           hud::box({.width = 4, .height = 4, .background = grey, .shape = hud::Shape::diamond, .offset_x = 8})),
                  // 도형이 없는 이웃은 여느 사각형이다
                  hud::box({.width = 3, .height = 3, .background = grey, .offset_x = 90, .offset_y = 40})),
              SCREEN_200, font, list, regions);
  expect(list.size() == 7, "그릴 것은 일곱 개 (잘린 상자 밖의 도형은 빠진다)");
  if (list.size() != 7) return;
  expect(is_rect(list[0], 0, 0, 20, 20) && list[0].shape == hud::Shape::diamond && list[0].shape_size == 0.0f, "마름모: 상자의 사각형과 도형이 나간다");
  expect(is_rect(list[1], 40, 0, 20, 20) && list[1].shape == hud::Shape::ring && list[1].shape_size == 2.0f, "마름모 테: 선의 두께는 픽셀로");
  expect(is_rect(list[2], 80, 0, 10, 20) && list[2].shape == hud::Shape::chevron_left && list[2].shape_size == 1.0f, "꺾쇠: 선은 적어도 1 픽셀");
  expect(is_rect(list[3], 120, 0, 16, 8) && list[3].shape == hud::Shape::slant && list[3].shape_size == -3.0f && list[3].color == white && list[3].color_end == grey &&
             list[3].fade == hud::Fade::right,
         "비스듬한 칸: 비껴 난 거리(부호 그대로)와 번지는 바탕");
  expect(is_rect(list[4], 20, 60, 40, 40) && list[4].shape == hud::Shape::chevron_right && list[4].shape_size == 4.0f && list[4].color == engine::Color{1, 1, 1, 0.5f},
         "변환 안의 도형: 자리·크기와 함께 선도 커지고 같이 옅어진다");
  expect(is_rect(list[5], 176, 0, 8, 8) && list[5].shape == hud::Shape::diamond && list[5].color == grey, "잘린 상자에 걸친 도형은 자르지 않고 사각형째로 나간다");
  expect(is_rect(list[6], 180, 80, 6, 6) && list[6].shape == hud::Shape::rect, "도형이 없는 상자는 여느 사각형이다");
}

struct CounterState {
  int value;
  bool operator==(const CounterState&) const = default;
};
int renders = 0;
hud::Element counter_component(const CounterState& state) {
  renders++;
  return hud::box({}, hud::text(state.value == 1 ? "A" : "B", engine::Color{1, 1, 1}, 5.0f));
}

void hud_view() {
  hud::View<CounterState> view{counter_component};
  const hud::Viewport viewport{200, 100, 2};
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  const hud::DrawList& first = view.update({1}, viewport, font);
  expect(renders == 1 && first.size() == 1 && first[0].content == "A", "처음에는 조립한다");
  view.update({1}, viewport, font);
  expect(renders == 1, "상태가 같으면 다시 조립하지 않는다");
  const hud::DrawList& changed = view.update({2}, viewport, font);
  expect(renders == 2 && changed.size() == 1 && changed[0].content == "B", "상태가 바뀌면 다시 조립한다");
  view.update({2}, {400, 200, 4}, font);
  expect(renders == 3, "화면이 바뀌면 다시 조립한다");
}

// ── 상호작용 — 화면 200×100 픽셀, 단위 2 픽셀. 글꼴은 font_bytes(): 글자 크기 5 단위에서 'A' 폭 6, 'B'·'C'·'가' 폭 5, 줄 높이 7.
// 기대값은 손으로 계산했다 (테두리와 캐럿의 두께는 0.5 단위 = 1 픽셀)

constexpr engine::Color INK{1, 1, 1}, MUTED{0.5f, 0.5f, 0.5f}, SURFACE{0, 0, 0}, HOVER{0.2f, 0.2f, 0.2f}, ACTIVE{0.4f, 0.4f, 0.4f}, ACCENT{1, 0, 0}, LINE{0, 1, 0}, FOCUS{0, 0, 1};
/** 얇은 테두리가 없는 양식 (Theme::line 의 알파 0) */
constexpr hud::Theme THEME{.text = INK, .muted = MUTED, .surface = SURFACE, .hover = HOVER, .active = ACTIVE, .accent = ACCENT, .focus = FOCUS, .size = 5, .padding = 1, .row = 8};
/** 얇은 테두리를 두르는 양식 */
constexpr hud::Theme LINED = [] {
  hud::Theme theme = THEME;
  theme.line = LINE;
  return theme;
}();
constexpr hud::Viewport SCREEN{200, 100, 2};

bool is_fill(const hud::DrawItem& item, float x, float y, float width, float height, engine::Color color) {
  return is_rect(item, x, y, width, height) && item.color == color;
}

bool is_press(const std::vector<hud::Event>& events, hud::Id id, int item = -1) {
  return events.size() == 1 && events[0] == hud::Event{.kind = hud::Event::Kind::press, .id = id, .item = item};
}

bool is_change(const std::vector<hud::Event>& events, hud::Id id, float value) {
  return events.size() == 1 && events[0] == hud::Event{.kind = hud::Event::Kind::change, .id = id, .value = value};
}

bool is_select(const std::vector<hud::Event>& events, hud::Id id, int item) {
  return events.size() == 1 && events[0] == hud::Event{.kind = hud::Event::Kind::select, .id = id, .item = item};
}

bool is_edit(const std::vector<hud::Event>& events, hud::Id id, const char* text) {
  return events.size() == 1 && events[0] == hud::Event{.kind = hud::Event::Kind::edit, .id = id, .text = text};
}

/** (10, 10) 단위에 놓은 요소 하나 — 화면 (20, 20) 픽셀에서 시작한다 */
hud::Element at_ten(hud::Element element) {
  element.style.offset_x = 10;
  element.style.offset_y = 10;
  return hud::box({.axis = hud::Axis::stack}, std::move(element));
}

void hud_clipping() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  // (5, 5) 단위의 10×10 잘린 상자 → (10, 10) 20×20 픽셀. 그 안의 세로 줄:
  //   20×4 위젯 상자 → (10,10) 40×8 가 폭 20 으로 잘린다 · "A" → y 9 단위 = 18 픽셀, 12×14 로 아래가 걸친다 (그대로 내고 clip 을 단다)
  //   4×4 상자 → y 16 단위 = 32 픽셀로 다 나갔다 · "B" → y 20 단위 = 40 픽셀로 다 나갔다
  hud::Element widget = hud::box({.width = 20, .height = 4, .background = SURFACE});
  widget.control = {.kind = hud::Control::Kind::button, .id = 9};
  const hud::Element root = hud::box({.axis = hud::Axis::stack},
      hud::box({.width = 10, .height = 10, .clip = true, .offset_x = 5, .offset_y = 5},
          std::move(widget), hud::text("A", INK, 5.0f), hud::box({.width = 4, .height = 4, .background = INK}), hud::text("B", INK, 5.0f)));
  hud::DrawList list;
  hud::Regions regions;
  hud::layout(root, SCREEN, font, list, regions);
  expect(list.size() == 2, "잘린 상자 밖으로 다 나간 사각형과 글자는 내지 않는다");
  if (list.size() != 2) return;
  expect(is_rect(list[0], 10, 10, 20, 8), "걸친 사각형은 잘라서 낸다: 40×8 → 20×8");
  expect(is_text(list[1], 10, 18, 10, "A") && list[1].clip == hud::Rect{10, 10, 20, 20}, "걸친 글자는 그대로 내고 자를 사각형을 단다");
  expect(regions.unit == 2.0f && regions.items.size() == 1 && regions.items[0].rect == hud::Rect{10, 10, 40, 8} && regions.items[0].visible == hud::Rect{10, 10, 20, 8},
         "위젯의 자리는 전체와 보이는 부분을 함께 적는다");
  hud::Interaction interaction;
  interaction.pointer_move(regions, 25, 12);
  expect(interaction.ui().hover == 9, "보이는 부분에는 닿는다");
  interaction.pointer_move(regions, 35, 12);
  expect(interaction.ui().hover == 0, "잘려 나간 부분에는 닿지 않는다");

  // 글자 사각형 (0,0) 10×20 에 아틀라스 칸 (100,50) 5×10 — (4,5) 부터만 보이면 6×15 가 남고 칸도 절반 비율로 (102, 52.5) 3×7.5
  hud::Rect placement{0, 0, 10, 20}, cell{100, 50, 5, 10};
  expect(hud::clip_quad(placement, cell, {4, 5, 100, 100}) && placement == hud::Rect{4, 5, 6, 15} && cell == hud::Rect{102, 52.5f, 3, 7.5f},
         "잘린 글자는 남은 만큼만, 아틀라스 칸도 같은 비율로");
  expect(!hud::clip_quad(placement, cell, {50, 50, 10, 10}), "다 잘리면 그리지 않는다");
  expect(hud::intersect({0, 0, 10, 10}, {5, 8, 10, 10}) == hud::Rect{5, 8, 5, 2}, "겹치는 부분");
}

void hud_buttons() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  hud::Interaction interaction;
  hud::DrawList list;
  hud::Regions regions;
  // (10, 10) 단위에서 사이 2 로 쌓은 단추 셋 — 안쪽 여백 1:
  //   1 "AB" 13×9 → (20,20) 26×18 픽셀 · 2 "C"(쓸 수 없음) 7×9, y 21 → (20,42) 14×18 · 3 "A" 8×9, y 32 → (20,64) 16×18
  const auto arrange = [&] {
    const hud::Ui& ui = interaction.ui();
    hud::layout(hud::box({.axis = hud::Axis::stack},
                    hud::box({.gap = 2, .offset_x = 10, .offset_y = 10},
                        hud::button(ui, THEME, 1, "AB"), hud::button(ui, THEME, 2, "C", true), hud::button(ui, THEME, 3, "A"))),
                SCREEN, font, list, regions);
  };
  arrange();
  expect(regions.items.size() == 3 && regions.items[0].rect == hud::Rect{20, 20, 26, 18} && regions.items[1].rect == hud::Rect{20, 42, 14, 18} &&
             regions.items[2].rect == hud::Rect{20, 64, 16, 18},
         "단추 셋의 자리");
  expect(list.size() == 5 && is_fill(list[0], 20, 20, 26, 18, SURFACE) && list[1].color == INK && is_text(list[2], 22, 44, 10, "C") && list[2].color == MUTED &&
             is_fill(list[3], 20, 64, 16, 18, SURFACE),
         "여느 단추는 바탕색, 쓸 수 없는 단추는 바탕 없이 흐린 글자");

  // 가리킴 — 오른쪽 끝(20+26=46)은 밖이다
  expect(interaction.pointer_move(regions, 45, 30).empty() && interaction.ui().hover == 1, "단추 안이면 가리킨다");
  expect(interaction.ui().pointer_inside && interaction.ui().pointer_x == 22.5f && interaction.ui().pointer_y == 15.0f, "포인터 자리는 단위로: (45, 30) 픽셀 → (22.5, 15)");
  interaction.pointer_move(regions, 46, 30);
  expect(interaction.ui().hover == 0, "오른쪽 끝 픽셀은 밖이다");
  interaction.pointer_move(regions, 30, 50);
  expect(interaction.ui().hover == 0, "쓸 수 없는 단추는 가리켜지지 않는다");

  // 누르기 — 누른 단추 위에서 떼야 눌린 것이다
  interaction.pointer_move(regions, 30, 30);
  expect(interaction.pointer_press(regions, font).empty() && interaction.ui().pressed == 1 && interaction.ui().focus == 1, "누르면 눌림과 포커스가 간다 (사건은 아직)");
  arrange();
  // 포커스 테두리(1 픽셀)는 글자 뒤에 — 위 (20,20) 26×1, 아래 (20,37) 26×1, 왼쪽 (20,21) 1×16, 오른쪽 (45,21) 1×16
  expect(list.size() == 9 && is_fill(list[0], 20, 20, 26, 18, ACTIVE) && is_fill(list[2], 20, 20, 26, 1, FOCUS) && is_fill(list[3], 20, 37, 26, 1, FOCUS) &&
             is_fill(list[4], 20, 21, 1, 16, FOCUS) && is_fill(list[5], 45, 21, 1, 16, FOCUS),
         "눌린 단추는 눌린 바탕에 포커스 테두리를 두른다");
  expect(is_press(interaction.pointer_release(regions), 1) && interaction.ui().pressed == 0, "그 위에서 떼면 press");
  arrange();
  expect(is_fill(list[0], 20, 20, 26, 18, HOVER), "뗀 뒤에는 가리킨 바탕");
  interaction.pointer_press(regions, font);
  interaction.pointer_move(regions, 30, 70);
  expect(interaction.pointer_release(regions).empty() && interaction.ui().pressed == 0, "다른 단추 위에서 떼면 눌리지 않는다");
  interaction.pointer_move(regions, 150, 80);
  interaction.pointer_press(regions, font);
  expect(interaction.ui().focus == 0, "빈 곳을 누르면 포커스가 풀린다");
  expect(interaction.pointer_release(regions).empty(), "빈 곳에서는 사건이 없다");

  // 글쇠 포커스 — 화면 차례로, 쓸 수 없는 단추는 건너뛰고, 끝에서 돈다
  const auto press = [&](const char* code, uint32_t modifiers = 0, bool repeat = false) { return interaction.key(regions, font, code, "", modifiers, repeat); };
  press("Tab");
  expect(interaction.ui().focus == 1, "포커스가 없을 때 Tab 은 첫 위젯으로");
  press("Tab");
  expect(interaction.ui().focus == 3, "Tab 은 쓸 수 없는 단추를 건너뛴다");
  press("Tab");
  expect(interaction.ui().focus == 1, "끝에서 Tab 은 처음으로 돈다");
  press("Tab", hud::KEY_SHIFT);
  expect(interaction.ui().focus == 3, "Shift+Tab 은 거꾸로");
  press("ArrowUp");
  expect(interaction.ui().focus == 1, "위 화살표는 앞 위젯으로");
  press("ArrowDown");
  expect(interaction.ui().focus == 3, "아래 화살표는 다음 위젯으로");
  expect(is_press(press("Enter"), 3) && is_press(press("Space"), 3) && is_press(press("NumpadEnter"), 3), "Enter·Space 는 포커스를 가진 단추를 누른다");
  expect(press("Enter", 0, true).empty(), "누르고 있어 되풀이된 Enter 는 다시 누르지 않는다");
  expect(press("Enter", hud::KEY_CTRL).empty() && press("Tab", hud::KEY_ALT).empty() && interaction.ui().focus == 3, "Ctrl·Alt 조합은 받지 않는다");
  interaction.focus(0);
  press("Tab", hud::KEY_SHIFT);
  expect(interaction.ui().focus == 3, "포커스가 없을 때 Shift+Tab 은 끝 위젯으로");

  interaction.pointer_move(regions, 30, 30);
  interaction.pointer_press(regions, font);
  interaction.clear();
  expect(interaction.ui().hover == 0 && interaction.ui().pressed == 0 && interaction.ui().pointer_inside, "clear 는 가리킴과 눌림만 지운다");
  interaction.pointer_leave();
  expect(!interaction.ui().pointer_inside, "화면을 떠나면 포인터가 없다");

  // 테두리를 두르는 양식 — 쓸 수 있는 단추도 쓸 수 없는 단추도 얇은 테두리를 두르고, 좌우 여백과 글자의 면을 양식에서 받는다
  {
    hud::Theme wide = LINED;
    wide.padding_x = 2;
    wide.face = 1;
    interaction.focus(0);
    // "AB" 11×7 에 여백 1, 좌우로 2 더 → 17×9 단위 → (20,20) 34×18 픽셀. 글자는 x 10+3 = 13 → 26 픽셀
    hud::layout(at_ten(hud::button(interaction.ui(), wide, 1, "AB", true)), SCREEN, font, list, regions);
    expect(list.size() == 5 && is_text(list[0], 26, 22, 10, "AB") && list[0].face == 1 && is_fill(list[1], 20, 20, 34, 1, LINE), "쓸 수 없는 단추: 글자와 얇은 테두리뿐");
  }

  // 켜고 끄는 스위치 — 누르면 반대 값
  hud::layout(at_ten(hud::toggle(interaction.ui(), THEME, 5, "A", false)), SCREEN, font, list, regions);
  // 스위치 10×5 + 사이 1 + "A" 6×7, 안쪽 여백 1 → 19×9 단위 → (20,20) 38×18 픽셀
  expect(regions.items.size() == 1 && regions.items[0].rect == hud::Rect{20, 20, 38, 18}, "토글의 자리");
  // 가리키지 않으면 줄의 바탕이 없다. 스위치는 줄 가운데 (11,12) 10×5 단위, 손잡이 3×3 은 왼쪽에서 1 들어간 (12,13) → (24,26) 6×6 픽셀.
  // 꺼진 스위치의 테두리(위 (22,24) 20×1)는 얇은 테두리가 없는 양식이면 흐린 색
  expect(list.size() == 6 && is_fill(list[0], 24, 26, 6, 6, MUTED) && is_fill(list[1], 22, 24, 20, 1, MUTED) && is_text(list[5], 44, 22, 10, "A"), "꺼진 스위치: 손잡이가 왼쪽에 있고 채우지 않는다");
  interaction.pointer_move(regions, 30, 30);
  interaction.pointer_press(regions, font);
  expect(is_change(interaction.pointer_release(regions), 5, 1.0f), "꺼진 토글을 누르면 켜라는 change 1");
  hud::layout(at_ten(hud::toggle(interaction.ui(), THEME, 5, "A", false)), SCREEN, font, list, regions);
  // 포인터가 올라가 있고 포커스를 가졌다 — 줄의 바탕(가리킴)이 맨 먼저, 포커스 테두리가 맨 끝에
  expect(list.size() == 11 && is_fill(list[0], 20, 20, 38, 18, HOVER) && is_fill(list[1], 24, 26, 6, 6, MUTED) && is_fill(list[7], 20, 20, 38, 1, FOCUS), "가리킨 스위치 줄은 바탕이 깔리고 포커스 테두리를 두른다");
  hud::layout(at_ten(hud::toggle(interaction.ui(), THEME, 5, "A", true)), SCREEN, font, list, regions);
  // 켜지면 스위치가 채워지고((22,24) 20×10) 손잡이가 오른쪽 끝에서 1 들어간 (17,13) 단위 → (34,26) 픽셀로 간다
  expect(list.size() == 12 && is_fill(list[1], 22, 24, 20, 10, ACCENT) && is_fill(list[2], 34, 26, 6, 6, SURFACE) && is_fill(list[3], 22, 24, 20, 1, ACCENT),
         "켜진 스위치: 채워지고 손잡이가 오른쪽으로 간다");
  expect(is_change(press("Space"), 5, 0.0f), "켜진 토글에서 Space 는 끄라는 change 0");
}

void hud_slider() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  hud::Theme theme = LINED;
  theme.size = 4;
  hud::Interaction interaction;
  hud::DrawList list;
  hud::Regions regions;
  // 0…10 을 1 씩, 폭 22·높이 4 단위 → (20,20) 44×8 픽셀. 손잡이 폭 2 단위라 값이 닿는 길은 양 끝에서 2 픽셀 들어간 x 22…62 (40 픽셀)
  const auto arrange = [&](float value, float step = 1.0f) { hud::layout(at_ten(hud::slider(interaction.ui(), theme, 4, value, 0, 10, step, 22)), SCREEN, font, list, regions); };
  arrange(5);
  expect(regions.items.size() == 1 && regions.items[0].rect == hud::Rect{20, 20, 44, 8} && regions.items[0].inset == 2.0f, "슬라이더의 자리와 양 끝 여백");
  // 길 (22,23) 40×2 · 찬 만큼 (22,23) 20×2 · 손잡이는 길의 절반(10 단위) 자리 → (40,20) 4×8
  expect(list.size() == 3 && is_fill(list[0], 22, 23, 40, 2, LINE) && is_fill(list[1], 22, 23, 20, 2, ACCENT) && is_fill(list[2], 40, 20, 4, 8, INK), "값 5 의 길(얇은 선의 색)·찬 만큼·손잡이");

  arrange(0);
  interaction.pointer_move(regions, 42, 24);
  expect(is_change(interaction.pointer_press(regions, font), 4, 5.0f) && interaction.ui().focus == 4, "x 42 는 길의 절반 → 5");
  arrange(5);
  expect(is_change(interaction.pointer_move(regions, 45, 24), 4, 6.0f), "누른 채 x 45 로 끌면 5.75 → 한 칸에 맞춰 6");
  expect(interaction.pointer_move(regions, 43, 24).empty(), "x 43 은 5.25 → 5, 지금 값과 같아 사건이 없다");
  expect(is_change(interaction.pointer_move(regions, 500, 90), 4, 10.0f), "누른 채면 밖으로 끌어도 따라온다 — 오른쪽 끝 너머는 10");
  expect(is_change(interaction.pointer_move(regions, 0, 24), 4, 0.0f), "왼쪽 끝 너머는 0");
  expect(interaction.pointer_release(regions).empty(), "떼는 것은 사건이 없다");
  expect(interaction.pointer_move(regions, 60, 24).empty(), "뗀 뒤에는 움직여도 값이 바뀌지 않는다");

  const auto press = [&](const char* code) { return interaction.key(regions, font, code, "", 0, false); };
  expect(is_change(press("ArrowRight"), 4, 6.0f) && is_change(press("ArrowLeft"), 4, 4.0f), "좌우 화살표는 한 칸씩");
  expect(is_change(press("Home"), 4, 0.0f) && is_change(press("End"), 4, 10.0f), "Home·End 는 양 끝");
  arrange(10);
  expect(press("ArrowRight").empty() && press("End").empty(), "끝에서는 더 가지 않는다");

  // 칸 없는 슬라이더 — x 45 는 (45-22)/40 = 0.575 → 5.75
  arrange(0, 0);
  interaction.pointer_move(regions, 45, 24);
  const std::vector<hud::Event> smooth = interaction.pointer_press(regions, font);
  expect(smooth.size() == 1 && std::fabs(smooth[0].value - 5.75f) < 1e-4f, "칸이 없으면 이어진 값");
  interaction.pointer_release(regions);
  expect(is_change(press("ArrowRight"), 4, 1.0f), "칸이 없으면 화살표는 범위의 1/10");
}

void hud_list() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  const std::string_view items[] = {"A", "B", "C", "A", "B", "C"};
  hud::Interaction interaction;
  hud::DrawList list;
  hud::Regions regions;
  // 여섯 줄 가운데 세 줄이 보이는 폭 30 목록, 줄 높이 8 단위 → (20,20) 60×48 픽셀, 줄 16 픽셀
  const auto arrange = [&](int selected) { hud::layout(at_ten(hud::list(interaction.ui(), THEME, 6, items, selected, 30, 3)), SCREEN, font, list, regions); };
  const hud::Rect frame{20, 20, 60, 48};
  arrange(1);
  expect(regions.items.size() == 1 && regions.items[0].rect == frame && regions.items[0].row_height == 16.0f, "목록의 자리와 줄 높이");
  // 글자는 띠 1 + 사이 1 뒤(x 12 단위 = 24 픽셀), 줄 가운데(줄 8, 글자 7 → 0.5 단위 = 1 픽셀 아래). 스크롤 막대는 오른쪽 끝 1 단위, 높이 24×3/6 = 12 단위
  expect(list.size() == 7 && is_fill(list[0], 20, 20, 60, 48, SURFACE) && is_text(list[1], 24, 21, 10, "A") && is_fill(list[2], 20, 36, 60, 16, ACTIVE) &&
             is_fill(list[3], 20, 36, 2, 16, ACCENT) && is_text(list[4], 24, 37, 10, "B") && is_text(list[5], 24, 53, 10, "C") && is_fill(list[6], 78, 20, 2, 24, MUTED),
         "보이는 세 줄 — 고른 줄은 바탕과 왼쪽 띠, 넘치면 스크롤 막대");
  expect(list[1].clip == frame, "줄의 글자는 목록의 틀로 잘린다");

  interaction.pointer_move(regions, 30, 60);
  expect(interaction.ui().hover == 6 && interaction.ui().hover_item == 2, "y 60 은 셋째 줄 (40/16 = 2.5)");
  expect(is_select(interaction.pointer_press(regions, font), 6, 2) && interaction.ui().focus == 6, "줄을 누르면 select");
  interaction.pointer_release(regions);
  interaction.pointer_move(regions, 30, 40);
  expect(interaction.pointer_press(regions, font).empty(), "이미 고른 줄을 누르면 사건이 없다");
  interaction.pointer_release(regions);

  // 굴리기 — 24 픽셀은 한 줄 반. 끝은 6 - 3 = 3 줄
  interaction.pointer_move(regions, 30, 60);
  interaction.wheel(regions, 24);
  expect(interaction.ui().scroll(6) == 1.5f && interaction.ui().hover_item == 4, "24 픽셀 굴리면 1.5 줄 — 포인터 밑은 다섯째 줄 (2.5 + 1.5)");
  arrange(1);
  // 줄들이 4 단위(8 픽셀) 올라간다: 둘째 줄(고른 줄)은 y 12…28 이라 위 8 픽셀이 잘리고, 다섯째 줄(포인터 밑)은 y 60…76 이라 아래 8 픽셀이 잘리고,
  // 여섯째 줄은 아직 밖이다. 스크롤 막대는 24×1.5/6 = 6 단위 내려간다. 끝의 넷은 포커스 테두리
  expect(list.size() == 13 && is_fill(list[1], 20, 20, 60, 8, ACTIVE) && is_fill(list[2], 20, 20, 2, 8, ACCENT) && is_text(list[3], 24, 13, 10, "B") &&
             is_text(list[4], 24, 29, 10, "C") && is_text(list[5], 24, 45, 10, "A") && is_fill(list[6], 20, 60, 60, 8, HOVER) && is_text(list[7], 24, 61, 10, "B") &&
             is_fill(list[8], 78, 32, 2, 24, MUTED) && is_fill(list[9], 20, 20, 60, 1, FOCUS),
         "1.5 줄 굴린 목록 — 걸친 줄은 잘리고 네 줄이 그려진다");
  interaction.wheel(regions, 1000);
  expect(interaction.ui().scroll(6) == 3.0f, "끝(3 줄) 너머로는 굴러가지 않는다");
  arrange(1);
  // 포인터 밑은 여섯째 줄 (2.5 + 3) — 가리킨 바탕이 깔린다
  expect(list.size() == 10 && is_text(list[1], 24, 21, 10, "A") && is_text(list[2], 24, 37, 10, "B") && is_fill(list[3], 20, 52, 60, 16, HOVER) &&
             is_text(list[4], 24, 53, 10, "C") && is_fill(list[5], 78, 44, 2, 24, MUTED),
         "끝까지 굴리면 뒤의 세 줄만");
  interaction.wheel(regions, -5000);
  expect(interaction.ui().scroll(6) == 0.0f, "처음 너머로도 굴러가지 않는다");
  interaction.pointer_move(regions, 150, 80);
  interaction.wheel(regions, 24);
  expect(interaction.ui().scroll(6) == 0.0f, "포인터가 목록 밖이면 굴리지 않는다");

  // 글쇠 — 고른 줄을 옮기고, 그 줄이 보이는 데까지만 굴린다
  const auto press = [&](const char* code) { return interaction.key(regions, font, code, "", 0, false); };
  arrange(1);
  expect(is_select(press("ArrowDown"), 6, 2) && interaction.ui().scroll(6) == 0.0f, "아래 화살표: 셋째 줄은 보여서 굴리지 않는다");
  arrange(2);
  expect(is_select(press("ArrowDown"), 6, 3) && interaction.ui().scroll(6) == 1.0f, "넷째 줄은 한 줄 굴려야 보인다");
  arrange(3);
  expect(is_select(press("End"), 6, 5) && interaction.ui().scroll(6) == 3.0f, "End 는 끝 줄로");
  arrange(5);
  expect(press("ArrowDown").empty(), "끝 줄에서 아래 화살표는 사건이 없다");
  expect(is_select(press("ArrowUp"), 6, 4) && interaction.ui().scroll(6) == 3.0f, "위 화살표: 다섯째 줄은 보여서 굴리지 않는다");
  expect(is_select(press("Home"), 6, 0) && interaction.ui().scroll(6) == 0.0f, "Home 은 첫 줄로");
  arrange(0);
  expect(is_select(press("PageDown"), 6, 3) && interaction.ui().scroll(6) == 1.0f, "PageDown 은 보이는 줄 수(3)만큼");
  expect(is_press(press("Enter"), 6, 0), "Enter 는 고른 줄을 달고 press");
  arrange(-1);
  expect(is_select(press("ArrowDown"), 6, 0), "고른 줄이 없으면 아래 화살표는 첫 줄");

  // 빈 목록 — 안내 글이 한가운데에: "AB" 11×7 단위 → x 10+(30-11)/2 = 19.5 → 39 픽셀, y 10+(24-7)/2 = 18.5 → 37 픽셀
  hud::layout(at_ten(hud::list(interaction.ui(), THEME, 6, {}, -1, 30, 3, "AB")), SCREEN, font, list, regions);
  expect(list.size() >= 2 && is_text(list[1], 39, 37, 10, "AB") && list[1].color == MUTED, "빈 목록은 안내 글을 보인다");
  expect(press("ArrowDown").empty() && press("End").empty(), "빈 목록에서는 고를 줄이 없다");
}

void hud_input() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));

  // "A가B" — A 는 0, 가 는 1…3, B 는 4 번째 바이트
  const std::string_view mixed = "A\xEA\xB0\x80" "B";
  expect(hud::previous_boundary(mixed, 5) == 4 && hud::previous_boundary(mixed, 4) == 1 && hud::previous_boundary(mixed, 1) == 0 && hud::previous_boundary(mixed, 0) == 0,
         "앞 글자 경계: 한글은 세 바이트를 한 번에 넘는다");
  expect(hud::previous_boundary(mixed, 3) == 1 && hud::next_boundary(mixed, 2) == 4, "글자 한가운데에서는 그 글자의 앞과 뒤");
  expect(hud::next_boundary(mixed, 0) == 1 && hud::next_boundary(mixed, 1) == 4 && hud::next_boundary(mixed, 4) == 5 && hud::next_boundary(mixed, 5) == 5, "뒤 글자 경계");
  expect(hud::previous_boundary("\xB0\x80", 2) == 1 && hud::next_boundary("\xB0\x80", 0) == 1, "잘못된 바이트는 한 바이트가 한 글자");

  hud::Interaction interaction;
  hud::DrawList list;
  hud::Regions regions;
  // 폭 20 단위, 안쪽 여백 1, 글자 5 자까지 → 틀 (20,20) 40×18 픽셀, 글이 놓이는 안쪽 (22,22) 36×14
  const auto arrange = [&](std::string_view value, std::size_t max_length = 5) {
    hud::layout(at_ten(hud::input(interaction.ui(), LINED, 7, value, max_length, 20)), SCREEN, font, list, regions);
  };
  const auto press = [&](const char* code, const char* key = "") { return interaction.key(regions, font, code, key, 0, false); };
  const hud::Rect inner{22, 22, 36, 14};
  const char* ab_ga = "AB\xEA\xB0\x80";
  arrange(ab_ga);
  expect(regions.items.size() == 1 && regions.items[0].rect == hud::Rect{20, 20, 40, 18} && regions.items[0].text == ab_ga && regions.items[0].text_x == 22.0f &&
             regions.items[0].text_size == 10.0f,
         "입력 칸의 자리와 글");
  expect(list.size() == 6 && is_fill(list[0], 20, 20, 40, 18, SURFACE) && is_text(list[1], 22, 22, 10, ab_ga) && list[1].clip == inner && list[2].color == LINE,
         "포커스가 없으면 캐럿 없이 얇은 테두리");

  // 누른 자리에서 가장 가까운 글자 경계 — 경계는 x 22, 34(A 뒤), 44(B 뒤), 54(가 뒤)
  interaction.pointer_move(regions, 38, 30);
  interaction.pointer_press(regions, font);
  expect(interaction.ui().focus == 7 && interaction.ui().caret == 1, "x 38 은 34 가 가장 가깝다 → A 뒤");
  interaction.pointer_move(regions, 40, 30);
  interaction.pointer_press(regions, font);
  expect(interaction.ui().caret == 2, "x 40 은 44 가 가장 가깝다 → B 뒤");
  arrange(ab_ga);
  // 캐럿은 "AB"(11 단위) 뒤 — x (11+11)×2 = 44, 폭 1 픽셀, 줄 높이 14
  expect(list.size() == 7 && is_text(list[1], 22, 22, 10, ab_ga) && is_fill(list[2], 44, 22, 1, 14, INK) && list[3].color == FOCUS, "포커스가 있으면 캐럿과 포커스 테두리");
  interaction.pointer_move(regions, 50, 30);
  interaction.pointer_press(regions, font);
  interaction.pointer_release(regions);
  expect(interaction.ui().caret == 5, "x 50 은 54 가 가장 가깝다 → 가 뒤 (바이트 5)");

  // 캐럿 옮기기 — 한글은 세 바이트를 한 번에
  press("ArrowLeft");
  expect(interaction.ui().caret == 2, "왼쪽: 가 앞으로 (5 → 2)");
  press("ArrowLeft");
  expect(interaction.ui().caret == 1, "왼쪽: B 앞으로");
  press("ArrowRight");
  press("ArrowRight");
  expect(interaction.ui().caret == 5, "오른쪽 두 번: 다시 끝으로 (1 → 2 → 5)");
  press("ArrowRight");
  expect(interaction.ui().caret == 5, "끝에서는 더 가지 않는다");
  press("Home");
  expect(interaction.ui().caret == 0, "Home");
  expect(press("Backspace").empty(), "맨 앞에서 Backspace 는 지울 것이 없다");
  expect(is_edit(press("Delete"), 7, "B\xEA\xB0\x80") && interaction.ui().caret == 0, "맨 앞에서 Delete 는 A 를 지운다");
  press("End");
  expect(interaction.ui().caret == 5, "End");
  expect(press("Delete").empty(), "맨 끝에서 Delete 는 지울 것이 없다");
  expect(is_edit(press("Backspace"), 7, "AB") && interaction.ui().caret == 2, "끝에서 Backspace 는 가(세 바이트)를 통째로 지운다");
  arrange(ab_ga);
  expect(is_edit(press("Delete"), 7, "AB") && interaction.ui().caret == 2, "가 앞에서 Delete 도 세 바이트를 통째로 지운다");

  // 글자 넣기 — 글쇠가 내는 글자를 캐럿 자리에
  arrange("AB");
  expect(is_edit(press("KeyC", "C"), 7, "ABC") && interaction.ui().caret == 3, "글자 글쇠는 캐럿 자리에 넣는다");
  arrange("ABC");
  expect(press("ShiftLeft", "Shift").empty() && press("F5", "F5").empty(), "이름뿐인 글쇠는 글자가 아니다");
  expect(press("KeyD", "D").empty() && press("KeyX", "\xEA\xB0\x81").empty(), "글꼴에 없는 글자(D, 각)는 넣지 않는다");
  expect(interaction.key(regions, font, "KeyC", "C", hud::KEY_CTRL, false).empty(), "Ctrl 조합은 글자가 아니다");
  press("Home");
  press("ArrowRight");
  // "ABC"(3 자)의 A 뒤에 "C가C" — 5 자까지라 둘만 들어간다
  expect(is_edit(interaction.type(regions, font, "C\xEA\xB0\x80" "C"), 7, "AC\xEA\xB0\x80" "BC") && interaction.ui().caret == 5, "최대 길이까지만 넣는다 (캐럿 1 → 5)");
  arrange("AC\xEA\xB0\x80" "BC");
  expect(interaction.type(regions, font, "A").empty() && press("KeyA", "A").empty(), "가득 차면 더 들어가지 않는다");
  expect(is_press(press("Enter"), 7), "Enter 는 press");
  press("ArrowDown");
  expect(interaction.ui().focus == 7, "위젯이 하나면 포커스는 제자리로 돈다");

  // 칸보다 긴 글 — "AAAA" 는 24 단위(48 픽셀), 안쪽은 36 픽셀(x 22…58). 캐럿이 오른쪽 밖이면 보이는 데까지 글을 민다
  press("Home");
  arrange("AAAA", 0);
  interaction.pointer_move(regions, 57, 30);
  interaction.pointer_press(regions, font);
  expect(interaction.ui().caret == 3, "x 57 은 58(셋째 A 뒤)이 가장 가깝다");
  arrange("AAAA", 0);
  expect(is_text(list[1], 21, 22, 10, "AAAA") && is_fill(list[2], 57, 22, 1, 14, INK), "캐럿(58…59)이 1 픽셀 넘쳐 글이 1 픽셀 밀린다");
  press("End");
  arrange("AAAA", 0);
  // 캐럿 70…71 은 13 픽셀 넘친다 → 글은 x 9 에서, 캐럿은 57 에. 글은 틀에서 잘린다
  expect(is_text(list[1], 9, 22, 10, "AAAA") && list[1].clip == inner && is_fill(list[2], 57, 22, 1, 14, INK) && regions.items[0].text_x == 9.0f, "끝으로 가면 글이 13 픽셀 밀린다");
  interaction.pointer_move(regions, 33, 30);
  interaction.pointer_press(regions, font);
  expect(interaction.ui().caret == 2, "밀린 글에서도 누른 자리의 경계를 찾는다 — 경계는 x 9, 21, 33, 45, 57");

  // 쓸 수 없는 입력 칸
  hud::layout(at_ten(hud::input(interaction.ui(), LINED, 7, "AB", 5, 20, true)), SCREEN, font, list, regions);
  interaction.pointer_press(regions, font);
  expect(interaction.ui().focus == 0 && interaction.type(regions, font, "A").empty(), "쓸 수 없는 입력 칸은 포커스도 글자도 받지 않는다");
}

void hud_cursor() {
  const std::vector<uint8_t> bytes = font_bytes();
  const hud::Font font = *hud::Font::decode(as_bytes(bytes));
  hud::Interaction interaction;
  hud::DrawList list;
  hud::Regions regions;
  const auto arrange = [&] { hud::layout(hud::box({.axis = hud::Axis::stack}, hud::cursor(interaction.ui(), INK, SURFACE)), SCREEN, font, list, regions); };
  arrange();
  expect(list.empty(), "포인터가 화면에 오기 전에는 커서가 없다");
  interaction.pointer_move(regions, 30, 40);
  arrange();
  // 열세 줄의 가장자리를 먼저, 그 위에 속 — 끝은 포인터 자리. 첫 줄: 가장자리 (14.5,19.5) 1.5×1.5 단위 → (29,39) 3×3 픽셀, 속 (15,20) 0.5×0.5 → (30,40) 1×1.
  // 열째 줄(가장 넓다, 10 칸): 속 (15, 24.5) 5×0.5 단위 → (30,49) 10×1 픽셀
  expect(list.size() == 26 && is_fill(list[0], 29, 39, 3, 3, SURFACE) && is_fill(list[13], 30, 40, 1, 1, INK) && is_fill(list[22], 30, 49, 10, 1, INK),
         "커서는 포인터 자리가 끝인 화살촉이다");
  expect(regions.items.empty(), "커서는 입력에 닿지 않는다");
  interaction.pointer_leave();
  arrange();
  expect(list.empty(), "화면을 떠나면 커서가 없다");
}

// 손으로 적은 .meshbin — 삼각형 하나(정점 셋)와 충돌 상자 하나
void static_mesh() {
  std::vector<uint8_t> bytes{'Z', 'K', 'M', 'S', 3, 0, 0, 0, 1, 0, 0, 0};
  const auto put = [&](std::initializer_list<float> values) {
    for (const float value : values) {
      const auto* raw = reinterpret_cast<const uint8_t*>(&value);
      bytes.insert(bytes.end(), raw, raw + sizeof(float));
    }
  };
  // 위치, 법선, 색(빛남)
  put({0, 0, 0, 0, 1, 0, 1.0f, 0.5f, 0.25f, 1});
  put({1, 0, 0, 0, 1, 0, 1.0f, 0.5f, 0.25f, 1});
  put({0, 0, 1, 0, 1, 0, 1.0f, 0.5f, 0.25f, 1});
  put({-1, -2, -3, 4, 5, 6});
  const auto mesh = engine::StaticMesh::decode(as_bytes(bytes));
  expect(mesh.has_value(), "올바른 .meshbin 은 풀린다");
  if (!mesh) return;
  expect(mesh->vertices().size() == 3 && mesh->solids().size() == 1, "정점 셋, 충돌 상자 하나");
  expect(mesh->vertices()[1].position[0] == 1.0f && mesh->vertices()[2].position[2] == 1.0f && mesh->vertices()[0].normal[1] == 1.0f, "정점의 위치와 법선");
  expect(mesh->vertices()[0].color[1] == 0.5f && mesh->vertices()[0].color[3] == 1.0f, "정점의 색과 빛남");
  expect(mesh->solids()[0].min.z == -3.0f && mesh->solids()[0].max.y == 5.0f, "충돌 상자");

  auto broken = bytes;
  broken[0] = 'X';
  expect(!engine::StaticMesh::decode(as_bytes(broken)), "머리가 다르면 거절한다");
  broken = bytes;
  broken.pop_back();
  expect(!engine::StaticMesh::decode(as_bytes(broken)), "끝이 잘렸으면 거절한다");
  broken = bytes;
  broken.push_back(0);
  expect(!engine::StaticMesh::decode(as_bytes(broken)), "뒤에 남는 바이트가 있으면 거절한다");
  broken = bytes;
  broken[4] = 4;
  expect(!engine::StaticMesh::decode(as_bytes(broken)), "정점 수가 셋의 배수가 아니면 거절한다");
  broken = bytes;
  // 상자의 최소 x 를 최대보다 크게 (-1 → 9)
  const float nine = 9.0f;
  std::memcpy(broken.data() + 12 + 3 * 40, &nine, sizeof(nine));
  expect(!engine::StaticMesh::decode(as_bytes(broken)), "뒤집힌 충돌 상자는 거절한다");
}

/** 바이트열 끝에 값들을 리틀 엔디언으로 붙인다 */
template <typename T>
void append(std::vector<uint8_t>& bytes, std::initializer_list<T> values) {
  for (const T value : values) {
    const auto* raw = reinterpret_cast<const uint8_t*>(&value);
    bytes.insert(bytes.end(), raw, raw + sizeof(T));
  }
}

/** 줄여 적은 겉면 메시('ZKSC') — 삼각형마다 같은 값(법선·색·층)을 한 번만 적은 것이 정점을 그대로 적은 것과 같은 메시로 풀린다 */
void compact_surface_mesh() {
  // 머리는 'ZKSF' 와 같다 (정점 6 = 삼각형 둘, 충돌 상자 1, 소품 0, 라이트맵 64 × 32, 빛 0, 길의 점 0) · 겉 2 개
  std::vector<uint8_t> bytes{'Z', 'K', 'S', 'C', 6, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
  append<uint32_t>(bytes, {2});
  // 겉: 색 rgb, 빛남, 층 — 텍스처 3 을 입힌 돌, 텍스처 5 를 입힌 색유리(빛남 2)
  append<float>(bytes, {1.0f, 0.5f, 0.25f, 0.0f, 3.0f});
  append<float>(bytes, {1.0f, 1.0f, 1.0f, 2.0f, 5.0f});
  // 삼각형: 법선, 겉 번호, 꼭짓점 셋마다 자리·uv·라이트맵 좌표(u16 — 65535 가 1)
  const auto corner = [&](float x, float y, float z, float u, float v, uint16_t lu, uint16_t lv) {
    append<float>(bytes, {x, y, z, u, v});
    append<uint16_t>(bytes, {lu, lv});
  };
  append<float>(bytes, {0, 1, 0});
  append<uint32_t>(bytes, {0});
  corner(0, 0, 0, 0.5f, 1.5f, 0, 65535);
  corner(1, 0, 0, 2.0f, -1.0f, 32768, 13107);
  corner(0, 0, 1, 0.0f, 0.0f, 65535, 0);
  append<float>(bytes, {0, 0, 1});
  append<uint32_t>(bytes, {1});
  corner(0, 0, 0, 0, 0, 0, 0);
  corner(1, 0, 0, 1, 0, 0, 0);
  corner(0, 1, 0, 0, 1, 0, 0);
  append<float>(bytes, {-1, -2, -3, 4, 5, 6});
  const auto mesh = engine::SurfaceMesh::decode(as_bytes(bytes));
  expect(mesh.has_value(), "줄여 적은 겉면 메시는 풀린다");
  if (mesh) {
    const std::span<const engine::SurfaceVertex> v = mesh->vertices();
    expect(v.size() == 6 && mesh->solids().size() == 1 && mesh->solids()[0].max.y == 5.0f && mesh->lightmap_width() == 64, "정점 여섯, 충돌 상자 하나");
    expect(v[1].position[0] == 1.0f && v[1].normal[1] == 1.0f && v[1].uv[0] == 2.0f && v[1].uv[1] == -1.0f && v[1].color[1] == 0.5f && v[1].color[3] == 0.0f && v[1].layer == 3.0f,
           "꼭짓점마다 자리와 uv, 삼각형의 법선과 겉(색·층)이 실린다");
    expect(v[0].lightmap[0] == 0.0f && v[0].lightmap[1] == 1.0f && std::fabs(v[1].lightmap[0] - 0.5f) < 1e-5f && std::fabs(v[1].lightmap[1] - 0.2f) < 1e-5f, "라이트맵 좌표는 16 비트에서 0…1 로");
    expect(v[4].normal[2] == 1.0f && v[4].layer == 5.0f && v[4].color[3] == engine::GLASS_PANE, "둘째 삼각형은 둘째 겉 — 텍스처를 입힌 색유리");
  }
  auto broken = bytes;
  broken[36 + 40 + 12] = 2;
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "없는 겉 번호는 거절한다");
  broken = bytes;
  broken.pop_back();
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "끝이 잘린 것은 거절한다");
  broken = bytes;
  broken[32] = 3;
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "겉의 수가 어긋나면 거절한다");
}

void surface_mesh() {
  compact_surface_mesh();
  // 'ZKSF' · 정점 3 · 충돌 상자 1 · 놓인 소품 1 · 라이트맵 64 × 32 · 빛 1 · 길의 점 2
  std::vector<uint8_t> bytes{'Z', 'K', 'S', 'F', 3, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 64, 0, 0, 0, 32, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0};
  // 위치, 법선, uv, 라이트맵 uv, 색(빛남), 층
  append<float>(bytes, {0, 0, 0, 0, 1, 0, 0.5f, 1.5f, 0.25f, 0.75f, 1.0f, 0.5f, 0.25f, 0, 3});
  append<float>(bytes, {1, 0, 0, 0, 1, 0, 2.0f, -1.0f, 0.5f, 1.0f, 1.0f, 0.5f, 0.25f, 0, 3});
  append<float>(bytes, {0, 0, 1, 0, 1, 0, 0.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.5f, 0.25f, 1, -1});
  append<float>(bytes, {-1, -2, -3, 4, 5, 6});
  append<uint32_t>(bytes, {7});
  append<float>(bytes, {10, 0, 5, 1.5f, 2});
  // 빛: 자리, 1 m 에서의 빛, 닿는 거리, 광원의 반지름 · 길의 점 둘: 자리와 이어진 점들 (서로를 가리킨다)
  append<float>(bytes, {1, 3, 2, 0.5f, 2.0f, 1.5f, 9, 0.25f});
  append<float>(bytes, {-4, 0, 6});
  append<uint32_t>(bytes, {2});
  append<float>(bytes, {4, 0.5f, 6});
  append<uint32_t>(bytes, {1});
  const auto mesh = engine::SurfaceMesh::decode(as_bytes(bytes));
  expect(mesh.has_value(), "올바른 겉면 메시는 풀린다");
  if (!mesh) return;
  expect(mesh->vertices().size() == 3 && mesh->solids().size() == 1 && mesh->placements().size() == 1 && mesh->lightmap_width() == 64 && mesh->lightmap_height() == 32,
         "정점 셋, 충돌 상자 하나, 놓인 소품 하나, 라이트맵 64 × 32");
  const engine::SurfaceVertex& v = mesh->vertices()[1];
  expect(v.position[0] == 1.0f && v.normal[1] == 1.0f && v.uv[0] == 2.0f && v.uv[1] == -1.0f && v.lightmap[0] == 0.5f && v.lightmap[1] == 1.0f && v.color[1] == 0.5f && v.layer == 3.0f,
         "정점의 위치·법선·무늬 좌표·라이트맵 좌표·색·층");
  expect(mesh->vertices()[2].layer == -1.0f && mesh->vertices()[2].color[3] == 1.0f, "색만 칠한 면은 층 -1");
  expect(mesh->solids()[0].min.z == -3.0f && mesh->solids()[0].max.y == 5.0f, "충돌 상자");
  const engine::Placement& p = mesh->placements()[0];
  expect(p.model == 7 && p.position[0] == 10.0f && p.position[2] == 5.0f && p.yaw == 1.5f && p.scale == 2.0f, "놓인 소품의 번호·자리·yaw·배율");
  expect(mesh->lights().size() == 1 && mesh->lights()[0].position[1] == 3.0f && mesh->lights()[0].light[1] == 2.0f && mesh->lights()[0].reach == 9.0f && mesh->lights()[0].size == 0.25f, "빛의 자리·세기·닿는 거리·크기");
  expect(mesh->nav().size() == 2 && mesh->nav()[0].position[0] == -4.0f && mesh->nav()[0].links == 2u && mesh->nav()[1].position[1] == 0.5f && mesh->nav()[1].links == 1u, "길의 점 둘과 그 이음");
  // 빛과 길의 점은 꼬리에 온다 — 꼬리의 자리: 머리 32 + 정점 180 + 상자 24 + 소품 24 = 260 에서 빛(32 바이트), 292 에서 점 둘(16 바이트씩, 이음은 자리 뒤 12 바이트째)
  const auto tail = [&](std::size_t at, uint32_t value) {
    auto copy = bytes;
    std::memcpy(copy.data() + at, &value, sizeof(value));
    return engine::SurfaceMesh::decode(as_bytes(copy)).has_value();
  };
  expect(!tail(292 + 12, 0u), "한쪽만 가리키는 이음은 거절한다 (0 번이 1 번을 가리키지 않는데 1 번은 0 번을 가리킨다)");
  expect(!tail(292 + 12, 3u), "저를 가리키는 이음은 거절한다");
  expect(!tail(292 + 12, 6u), "없는 점(2 번)을 가리키는 이음은 거절한다");
  expect(!tail(28, 33u), "길의 점이 32 개를 넘는다는 메시는 거절한다");
  const float negative = -1.0f, zero = 0.0f;
  auto dim = bytes;
  std::memcpy(dim.data() + 260 + 12, &negative, sizeof(negative));
  expect(!engine::SurfaceMesh::decode(as_bytes(dim)), "빛의 세기가 음수면 거절한다");
  dim = bytes;
  std::memcpy(dim.data() + 260 + 24, &zero, sizeof(zero));
  expect(!engine::SurfaceMesh::decode(as_bytes(dim)), "닿는 거리가 0 인 빛은 거절한다");

  auto broken = bytes;
  broken[3] = 'S';
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "머리가 다르면 거절한다 (색 메시의 머리도)");
  broken = bytes;
  broken.pop_back();
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "끝이 잘렸으면 거절한다");
  broken = bytes;
  broken.push_back(0);
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "뒤에 남는 바이트가 있으면 거절한다");
  broken = bytes;
  broken[4] = 4;
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "정점 수가 셋의 배수가 아니면 거절한다");
  broken = bytes;
  broken[18] = 1;
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "터무니없이 큰 라이트맵(65600)은 거절한다");
  const auto patch = [&](std::size_t at, float value) {
    broken = bytes;
    std::memcpy(broken.data() + at, &value, sizeof(value));
  };
  // 둘째 정점의 라이트맵 v (1.0 → 1.5)
  patch(32 + 60 + 9 * 4, 1.5f);
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "아틀라스 밖을 가리키는 라이트맵 좌표는 거절한다");
  patch(32 + 6 * 4, std::nanf(""));
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "숫자가 아닌 값이 든 정점은 거절한다");
  patch(32 + 3 * 60, 9.0f);
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "뒤집힌 충돌 상자는 거절한다");
  patch(32 + 3 * 60 + 24 + 20, 0.0f);
  expect(!engine::SurfaceMesh::decode(as_bytes(broken)), "배율이 0 인 소품은 거절한다");
}

void model_mesh() {
  // 'ZKMD' · 정점 4 · 인덱스 6 · 표시 1 (양면) — xz 평면의 사각형을 삼각형 둘로
  std::vector<uint8_t> bytes{'Z', 'K', 'M', 'D', 4, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0, 0};
  // 위치, 법선, uv, 층
  append<float>(bytes, {-1, 0, -2, 0, 1, 0, 0.0f, 0.0f, 2});
  append<float>(bytes, {3, 0, -2, 0, 1, 0, 1.0f, 0.0f, 2});
  append<float>(bytes, {3, 0.5f, 4, 0, 1, 0, 1.0f, 1.0f, 2});
  append<float>(bytes, {-1, 0, 4, 0, 1, 0, 0.0f, 1.0f, 2});
  append<uint32_t>(bytes, {0, 2, 1, 0, 3, 2});
  const auto model = engine::ModelMesh::decode(as_bytes(bytes));
  expect(model.has_value(), "올바른 .zkmodel 은 풀린다");
  if (!model) return;
  expect(model->vertices.size() == 6 && model->two_sided, "인덱스 여섯을 정점 여섯(삼각형 둘)으로 편다");
  const engine::SurfaceVertex& v = model->vertices[1];
  expect(v.position[0] == 3.0f && v.position[1] == 0.5f && v.position[2] == 4.0f && v.uv[0] == 1.0f && v.uv[1] == 1.0f && v.layer == 2.0f, "둘째 꼭짓점은 인덱스 2 의 정점이다");
  expect(v.lightmap[0] == 0.0f && v.color[0] == 1.0f && v.color[2] == 1.0f && v.color[3] == 0.0f, "모델의 정점은 라이트맵 좌표가 0 이고 색이 흰색이다");
  expect(model->vertices[4].position[0] == -1.0f && model->vertices[4].position[2] == 4.0f, "다섯째 꼭짓점은 인덱스 3 의 정점이다");
  expect(model->bounds.min.x == -1.0f && model->bounds.min.y == 0.0f && model->bounds.min.z == -2.0f && model->bounds.max.x == 3.0f && model->bounds.max.y == 0.5f && model->bounds.max.z == 4.0f,
         "감싸는 상자");

  auto broken = bytes;
  broken[0] = 'X';
  expect(!engine::ModelMesh::decode(as_bytes(broken)), "머리가 다르면 거절한다");
  broken = bytes;
  broken.pop_back();
  expect(!engine::ModelMesh::decode(as_bytes(broken)), "끝이 잘렸으면 거절한다");
  broken = bytes;
  broken[16 + 4 * 36] = 4;
  expect(!engine::ModelMesh::decode(as_bytes(broken)), "정점 밖을 가리키는 인덱스는 거절한다");
  broken = bytes;
  broken[12] = 4;
  expect(!engine::ModelMesh::decode(as_bytes(broken)), "모르는 표시는 거절한다");
  // 표시 3 — 양면이고 알파로 잘라 낸다 (잎). 표시 1 은 양면이지만 잘라 내지 않는다
  broken = bytes;
  broken[12] = 3;
  const auto leaf = engine::ModelMesh::decode(as_bytes(broken));
  expect(leaf && leaf->two_sided && leaf->cutout && !model->cutout, "양면과 잘라 내기는 따로 실린다");
  broken = bytes;
  broken[8] = 5;
  expect(!engine::ModelMesh::decode(as_bytes(broken)), "인덱스 수가 셋의 배수가 아니면 거절한다");
  broken = bytes;
  const float huge = std::numeric_limits<float>::infinity();
  std::memcpy(broken.data() + 16, &huge, sizeof(huge));
  expect(!engine::ModelMesh::decode(as_bytes(broken)), "숫자가 아닌 값이 든 정점은 거절한다");
}

// 에셋 팩 — tests/game.test.mjs 의 팩 도구 검증과 같은 바이트다 (도구가 쓴 것을 엔진이 읽는다)
void asset_pack() {
  using engine::asset::Pack;
  const std::vector<uint8_t> bytes{'Z', 'K', 'P', 'K', 1,  0, 0, 0, 2, 0, 0,   0,   50,  0,   0,   0,   6,  't', 'i', 'l', 'e', '/', 'a', 46, 0,
                                   0,   0,   3,   0,   0,  0, 6, 'p', 'r', 'o', 'p', '/', 'b', 49,  0,   0,   0,  1,   0,   0,   0,   1,   2,   3,  9};
  const auto pack = Pack::parse(as_bytes(bytes));
  expect(pack.has_value(), "올바른 팩은 읽힌다");
  if (!pack) return;
  const auto entries = pack->entries();
  expect(entries.size() == 2 && entries[0].name == "tile/a" && entries[1].name == "prop/b", "항목 둘의 이름");
  expect(entries.size() == 2 && entries[0].bytes.size() == 3 && entries[0].bytes[0] == std::byte{1} && entries[0].bytes[2] == std::byte{3} && entries[1].bytes.size() == 1 &&
             entries[1].bytes[0] == std::byte{9},
         "항목의 데이터");

  // 덜 받은 팩 — 어디서 잘렸든 거절한다 (머리의 전체 길이와 어긋난다)
  bool rejected = true;
  for (std::size_t size = 0; size < bytes.size(); size++) rejected = rejected && !Pack::parse(as_bytes(bytes).first(size));
  expect(rejected, "잘린 팩은 어디서 잘렸든 거절한다");
  auto broken = bytes;
  broken.push_back(0);
  expect(!Pack::parse(as_bytes(broken)), "더 받은 팩은 거절한다");
  broken = bytes;
  broken[1] = 'X';
  expect(!Pack::parse(as_bytes(broken)), "머리가 다르면 거절한다");
  broken = bytes;
  broken[4] = 2;
  expect(!Pack::parse(as_bytes(broken)), "모르는 판은 거절한다");
  broken = bytes;
  broken[8] = 3;
  expect(!Pack::parse(as_bytes(broken)), "항목 수가 표보다 많으면 거절한다");
  broken = bytes;
  broken[9] = 0x20;
  expect(!Pack::parse(as_bytes(broken)), "터무니없는 항목 수(8194)는 거절한다");
  broken = bytes;
  broken[23] = 20;
  expect(!Pack::parse(as_bytes(broken)), "항목의 데이터가 표와 겹치면 거절한다");
  broken = bytes;
  broken[42] = 2;
  expect(!Pack::parse(as_bytes(broken)), "항목의 데이터가 파일을 벗어나면 거절한다");
  broken = bytes;
  broken[38] = 0xFF;
  broken[39] = 0xFF;
  broken[40] = 0xFF;
  broken[41] = 0xFF;
  expect(!Pack::parse(as_bytes(broken)), "자리가 4 GB 끝인 항목은 거절한다 (넘침)");
  broken = bytes;
  broken[19] = ' ';
  expect(!Pack::parse(as_bytes(broken)), "이름에 빈칸이 있으면 거절한다");
  broken = bytes;
  broken[16] = 0;
  expect(!Pack::parse(as_bytes(broken)), "이름이 빈 항목은 거절한다");
}

// 상자 겹침 질의 — 손 계산과 전수 검사
void overlap_query() {
  const std::vector<Aabb> boxes{box({2, 0, 0}, 0.5f), box({5, 0, 0}, 0.5f), box({9, 0, 0}, 0.5f)};
  Lbvh bvh;
  bvh.build(boxes);
  expect(bvh.overlaps(box({2.4f, 0, 0}, 0.2f)), "첫 상자에 걸친 상자는 겹친다");
  expect(bvh.overlaps({{0, -9, -9}, {20, 9, 9}}), "모두를 감싸는 상자는 겹친다");
  expect(!bvh.overlaps(box({3.5f, 0, 0}, 0.4f)), "상자 사이의 빈 곳은 겹치지 않는다");
  expect(!bvh.overlaps({{2.5f, -0.5f, -0.5f}, {4.5f, 0.5f, 0.5f}}), "두 상자에 면만 닿은 상자는 겹치지 않는다");
  expect(!bvh.overlaps(box({2, 5, 0}, 0.5f)), "위로 떨어진 상자는 겹치지 않는다");
  Lbvh empty;
  empty.build({});
  expect(!empty.overlaps({{-1, -1, -1}, {1, 1, 1}}), "빈 트리는 아무것과도 겹치지 않는다");

  std::vector<Aabb> many;
  for (int i = 0; i < 1500; i++) many.push_back(box({lcg(-50, 50), lcg(-50, 50), lcg(-50, 50)}, lcg(0.1f, 1.5f)));
  Lbvh tree;
  tree.build(many);
  int mismatches = 0, hits = 0;
  for (int i = 0; i < 2000; i++) {
    const Aabb query = box({lcg(-55, 55), lcg(-55, 55), lcg(-55, 55)}, lcg(0.1f, 4.0f));
    bool expected = false;
    for (const Aabb& b : many)
      if (b.min.x < query.max.x && b.max.x > query.min.x && b.min.y < query.max.y && b.max.y > query.min.y && b.min.z < query.max.z && b.max.z > query.min.z)
        expected = true;
    if (tree.overlaps(query) != expected) mismatches++;
    if (expected) hits++;
  }
  expect(mismatches == 0, "무작위 상자 2000 개의 겹침이 전수 검사와 같다");
  expect(hits > 200 && hits < 1800, "무작위 상자에 겹치는 것과 안 겹치는 것이 섞여 있다");
}

/**
 * 프레임 예산 — 화면은 120 Hz, GPU 시간은 픽셀 수와 무관한 몫(fixed)에 픽셀 수에 비례하는 몫(full — 배율 1 일 때)을 더한 것이고,
 * 그 시간이 예산(갱신 간격 × 나누는 수)의 limit 몫을 넘으면 프레임이 한 갱신 늦는 기기를 흉내 낸다. seconds 동안 돌리고 그동안 품질이 바뀐 횟수를 돌려준다
 */
int run_governor(engine::FrameGovernor& governor, float seconds, float fixed, float full, float limit = 0.75f) {
  constexpr float REFRESH = 1000.0f / 120.0f;
  int changes = 0;
  for (float elapsed = 0.0f; elapsed < seconds * 1000.0f;) {
    const engine::FrameQuality quality = governor.quality();
    const float gpu = fixed + full * quality.scale * quality.scale * (quality.multisample ? 1.5f : 1.0f);
    const float budget = REFRESH * static_cast<float>(quality.divisor);
    const float interval = gpu > limit * budget ? budget + REFRESH : budget;
    changes += governor.frame(interval, REFRESH, gpu);
    elapsed += interval;
  }
  return changes;
}

void frame_governor() {
  using engine::FrameGovernor;
  expect(engine::scene_extent(3440, 1440, 0.5f) == engine::SceneExtent{1720, 720}, "장면 크기: 배율 0.5 는 변마다 절반");
  expect(engine::scene_extent(7680, 4320, 1.0f) == engine::SceneExtent{3840, 2160}, "장면 크기: 픽셀 수의 상한 안으로 비율을 지켜 줄인다");
  {
    // 1920×1080 은 배율 1 에서, 3440×1440 은 0.63 에서 시작한다 (픽셀 수가 1920×1080 을 넘지 않는 가장 높은 단계)
    FrameGovernor governor;
    governor.reset(1920ull * 1080ull);
    expect(governor.quality() == engine::FrameQuality{1.0f, false, 1}, "프레임 예산: 1920×1080 은 배율 1 에서 시작");
    governor.reset(3440ull * 1440ull);
    expect(governor.quality() == engine::FrameQuality{0.63f, false, 1}, "프레임 예산: 3440×1440 은 배율 0.63 에서 시작");
  }
  {
    // 넉넉한 기기 — 배율 1 과 다중 표본까지 오르고 거기 머문다
    FrameGovernor governor;
    governor.reset(3440ull * 1440ull);
    run_governor(governor, 20.0f, 0.3f, 0.8f);
    expect(governor.quality() == engine::FrameQuality{1.0f, true, 1}, "프레임 예산: 넉넉하면 배율 1 과 다중 표본까지 오른다");
    expect(run_governor(governor, 60.0f, 0.3f, 0.8f) == 0, "프레임 예산: 넉넉한 기기에서 품질이 흔들리지 않는다");
  }
  {
    // 배율 0.707 까지만 제때 내는 기기 (1.8 + 9.2 × 0.5 = 6.4 ms > 6.25 ms 가 0.794 에서 넘친다) — 그 아래에 머물고, 넘쳤던 단계를 드물게만 다시 해 본다
    FrameGovernor governor;
    governor.reset(1920ull * 1080ull);
    run_governor(governor, 20.0f, 1.8f, 9.2f);
    expect(governor.quality().divisor == 1 && governor.quality().scale <= 0.707f, "프레임 예산: 넘치는 단계에서 내려와 제 주사율을 지킨다");
    expect(run_governor(governor, 60.0f, 1.8f, 9.2f) <= 6, "프레임 예산: 넘쳤던 단계를 다시 해 보는 일이 드물다");
    expect(governor.quality().divisor == 1, "프레임 예산: 내릴 품질이 있으면 주사율을 절반으로 내리지 않는다");
  }
  {
    // 맨 아래 단계(6.15 ms — 예산 안)까지 내려온 기기가 가끔 한 프레임 늦는 것으로는 주사율을 절반으로 내리지 않는다
    FrameGovernor governor;
    governor.reset(3440ull * 1440ull);
    constexpr float REFRESH = 1000.0f / 120.0f;
    run_governor(governor, 8.0f, 3.9f, 9.0f);
    for (int frame = 0; frame < 120 * 30; frame++) governor.frame(frame % 90 == 0 ? 2.0f * REFRESH : REFRESH, REFRESH, 4.0f);
    expect(governor.quality().divisor == 1, "프레임 예산: 가끔 늦는 것으로는 주사율을 절반으로 내리지 않는다");
  }
  {
    // 맨 아래 단계(3.5 + 5 × 0.25 = 4.75 ms > 4.58 ms)도 제 주사율로 못 내는 기기 — 주사율의 절반(9.17 ms 까지)으로 내려 배율 1(8.5 ms)까지 올리고, 거기 머문다.
    // GPU 시간의 고정 몫이 커서 픽셀 수로 어림하면 맨 아래 단계가 가벼워 보이지만(8.5 ms × 0.25 = 2.1 ms), 그것으로 제 주사율에 돌아갔다 다시 내려오기를 되풀이하지 않는다
    FrameGovernor governor;
    governor.reset(3440ull * 1440ull);
    run_governor(governor, 30.0f, 3.5f, 5.0f, 0.55f);
    expect(governor.quality() == engine::FrameQuality{1.0f, false, 2}, "프레임 예산: 맨 아래 단계도 넘치면 주사율의 절반에서 배율을 올린다");
    bool held = true;
    for (int second = 0; second < 180; second++) {
      run_governor(governor, 1.0f, 3.5f, 5.0f, 0.55f);
      held &= governor.quality().divisor == 2;
    }
    expect(held, "프레임 예산: 주사율의 절반과 제 주사율을 오가지 않는다");
    // 장면이 훨씬 가벼워지면 제 주사율로 돌아간다
    run_governor(governor, 20.0f, 0.5f, 3.0f, 0.55f);
    expect(governor.quality().divisor == 1, "프레임 예산: 장면이 가벼워지면 제 주사율로 돌아간다");
  }
}

}  // namespace

int main() {
  literal_cases();
  against_brute_force();
  triangle_traversal();
  clip_depth();
  utf8();
  font_data();
  bitmap_data();
  jpeg_data();
  hud_layout();
  hud_fill_and_image();
  hud_transform();
  hud_shapes();
  hud_view();
  hud_clipping();
  hud_buttons();
  hud_slider();
  hud_list();
  hud_input();
  hud_cursor();
  static_mesh();
  surface_mesh();
  model_mesh();
  asset_pack();
  overlap_query();
  frame_governor();
  if (failures == 0) std::printf("engine_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
