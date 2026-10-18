#include "engine/bake/lightbake.hpp"

#include <algorithm>
#include <array>
#include <bit>
#include <cmath>
#include <cstring>
#include <numbers>

#include "engine/spatial/triangle.hpp"

namespace engine::bake {
namespace {

constexpr float PI = std::numbers::pi_v<float>;
// 광선이 떠난 면에 다시 닿지 않게 띄우는 거리 — 자리가 원점에서 멀수록 조금 더 (float 의 눈금이 커진다)
constexpr float BIAS = 1e-3f;
constexpr float FAR = 1e9f;
// 이웃 텍셀과 섞을 때 같은 면으로 치는 법선의 내적
constexpr float SAME_FACE = 0.95f;
// 잡음 고르기 (à-trous) — 5×5 B-스플라인 핵을 간격 1·2·4 텍셀로 세 번. 밝기가 다른 이웃은 그 텍셀의 잡음(표본 평균의 표준편차)의 이 배수를 자로 삼아 덜 섞는다
constexpr int DENOISE_PASSES = 3;
constexpr float DENOISE_EDGE = 4.0f;
// 채우기(dilation)를 되풀이하는 횟수 — 값이 있는 텍셀에서 이만큼 떨어진 자리까지 채운다. 선형 보간이 읽는 것은 겉면의 점을 둘러싼 네 텍셀이라
// 한 칸이면 되지만(좌표는 조각의 가장자리 텍셀 가운데까지만 간다 — tools/meshc.mjs), 텍셀보다 좁은 틈에 남은 면을 위해 넉넉히 둔다.
// 그보다 깊이 묻힌 텍셀은 아무 데서도 읽히지 않는다 — 값을 두지 않고(filled 0) rgba8 이 누르기 좋은 값으로 적는다
constexpr int FILL_PASSES = 4;
// 고른 채움빛이 '오는 방향'에 싣는 무게 — 반구에 고르게 든 빛을 cos 로 잰 평균 방향은 법선 쪽이고 그 길이가 빛의 ⅔ 다
constexpr float AMBIENT_FOCUS = 2.0f / 3.0f;

float bias_at(Vec3 p) { return BIAS * std::max(1.0f, std::max({std::fabs(p.x), std::fabs(p.y), std::fabs(p.z)}) * 0.1f); }

/** 수들을 섞어 고른 32 비트로 (PCG 의 출력 섞기) — 난수는 모두 여기서 나온다: 같은 입력이면 같은 값 */
constexpr uint32_t mix(uint32_t value) {
  value = value * 747796405u + 2891336453u;
  const uint32_t word = ((value >> ((value >> 28u) + 4u)) ^ value) * 277803737u;
  return (word >> 22u) ^ word;
}
constexpr uint32_t mix(uint32_t a, uint32_t b) { return mix(mix(a) ^ (b + 0x9E3779B9u)); }

struct Random {
  uint32_t state;
  /** 0 이상 1 미만 */
  float next() {
    state = mix(state);
    return static_cast<float>(state >> 8) * (1.0f / 16777216.0f);
  }
};

/** 성긴 삼각형이 그 광선(salt)을 막는가 — 삼각형의 자리에서 정한다 (장면에 넣은 차례와 상관없다: 다른 조각이 바뀌어도 같은 광선은 같은 답을 얻는다) */
bool sparse_blocks(const Triangle& t, uint32_t salt) { return !(mix(mix(salt, std::bit_cast<uint32_t>(t.a.x)), mix(std::bit_cast<uint32_t>(t.a.y), std::bit_cast<uint32_t>(t.a.z))) & 1u); }

Vec3 operator*(Vec3 a, Vec3 b) { return {a.x * b.x, a.y * b.y, a.z * b.z}; }
float length(Vec3 v) { return std::sqrt(dot(v, v)); }

/** n 에 수직인 두 축 */
void basis(Vec3 n, Vec3& t, Vec3& b) {
  t = normalize(std::fabs(n.y) < 0.9f ? cross(Vec3{0.0f, 1.0f, 0.0f}, n) : cross(Vec3{1.0f, 0.0f, 0.0f}, n));
  b = cross(n, t);
}

/** n 둘레의 반구에서 cos 에 비례해 뽑은 방향 — (u, v) 는 0…1 */
Vec3 cosine_direction(Vec3 n, float u, float v) {
  Vec3 t, b;
  basis(n, t, b);
  const float r = std::sqrt(u), phi = 2.0f * PI * v;
  return normalize(t * (r * std::cos(phi)) + b * (r * std::sin(phi)) + n * std::sqrt(std::max(0.0f, 1.0f - u)));
}

/** 해 원반 안의 한 방향 */
Vec3 sun_ray(const Sky& sky, float u, float v) {
  Vec3 t, b;
  basis(sky.sun_direction, t, b);
  const float r = std::tan(sky.sun_radius) * std::sqrt(u), phi = 2.0f * PI * v;
  return normalize(sky.sun_direction + t * (r * std::cos(phi)) + b * (r * std::sin(phi)));
}

/** point(면에서 이미 띄운 자리)에서 해가 보이는 정도 (색유리를 지났으면 그 색) — 광선 rays 개 */
Vec3 sun_visibility(const Scene& scene, const Sky& sky, Vec3 point, uint32_t rays, Random& random, uint32_t skip_owner) {
  Vec3 open{};
  for (uint32_t i = 0; i < rays; i++) {
    // 원반을 넓이가 같은 고리 rays 개로 나눠 하나씩
    const float u = (static_cast<float>(i) + random.next()) / static_cast<float>(rays);
    const Vec3 direction = sun_ray(sky, u, random.next());
    open = open + scene.transmit({point, direction}, FAR, skip_owner, random.state);
  }
  return open * (1.0f / static_cast<float>(rays));
}

/** 법선이 normal 인 면의 point 가 해에서 바로 받는 빛 — 그림자 광선 하나 */
Vec3 sun_once(const Scene& scene, const Sky& sky, Vec3 point, Vec3 normal, Random& random) {
  const float cosine = dot(normal, sky.sun_direction);
  if (cosine <= 0.0f) return {};
  const Vec3 direction = sun_ray(sky, random.next(), random.next());
  return sky.sun_light * scene.transmit({point, direction}, FAR, Scene::NO_OWNER, random.state) * cosine;
}

float brightness(Vec3 light) { return (light.x + light.y + light.z) * (1.0f / 3.0f); }

// 점광원에 이보다 가까운 자리는 더 밝아지지 않는다 (m)
constexpr float LIGHT_NEAR = 0.5f;
// 프로브는 한 점이 아니라 물체 하나(소품, 적, 손에 든 것)를 통째로 비춘다 — 등에 매달린 소품이나 화덕 곁의 적이 한 점의 밝기로 하얗게 타지 않게, 점광원을 이 거리보다 가깝게 보지 않는다 (m)
constexpr float PROBE_LIGHT_NEAR = 1.0f;

/** 거리 distance 에서 마주 보는 면이 그 점광원에서 받는 빛 (그림자는 빼고) */
Vec3 light_falloff(const PointLight& light, float distance) {
  if (distance >= light.reach) return {};
  const float near = std::max(distance, LIGHT_NEAR), share = distance / light.reach, window = 1.0f - share * share;
  return light.light * (window * window / (near * near));
}

/** 공 안의 고른 한 점 (반지름 1) */
Vec3 in_ball(Random& random) {
  const float z = 1.0f - 2.0f * random.next(), phi = 2.0f * PI * random.next(), r = std::sqrt(std::max(0.0f, 1.0f - z * z)) * 1.0f;
  return Vec3{r * std::cos(phi), z, r * std::sin(phi)} * std::cbrt(random.next());
}

/** point 에서 그 점광원이 보이는 몫 (색유리를 지났으면 그 색) — 광원의 공 안으로 흩은 광선 rays 개 */
Vec3 light_visibility(const Scene& scene, const PointLight& light, Vec3 point, uint32_t rays, Random& random, uint32_t skip_owner) {
  Vec3 open{};
  for (uint32_t i = 0; i < rays; i++) {
    const Vec3 toward = light.position + in_ball(random) * light.size - point;
    const float distance = length(toward);
    if (distance <= 0.0f) continue;
    open = open + scene.transmit({point, toward * (1.0f / distance)}, distance, skip_owner, random.state);
  }
  return open * (1.0f / static_cast<float>(rays));
}

/** 법선이 normal 인 면의 point 가 점광원들에서 바로 받는 빛 — 닿는 광원마다 그림자 광선 rays 개 */
Vec3 lights_direct(const Scene& scene, Vec3 point, Vec3 normal, uint32_t rays, Random& random, Vec3* toward_sum = nullptr) {
  Vec3 sum{};
  for (const PointLight& light : scene.lights()) {
    const Vec3 toward = light.position - point;
    const float distance = length(toward);
    if (distance >= light.reach || distance <= 0.0f) continue;
    const float cosine = dot(normal, toward) / distance;
    if (cosine <= 0.0f) continue;
    const Vec3 arriving = light_falloff(light, distance) * light_visibility(scene, light, point, rays, random, Scene::NO_OWNER) * cosine;
    sum = sum + arriving;
    if (toward_sum) *toward_sum = *toward_sum + toward * (brightness(arriving) / distance);
  }
  return sum;
}

/** 같은 빛을 광원 하나만 골라 어림한다 (튕긴 자리에서 — 닿는 광원 가운데 고르게 하나, 그 수를 곱한다). 그림자 광선 하나 */
Vec3 lights_once(const Scene& scene, Vec3 point, Vec3 normal, Random& random) {
  const std::span<const PointLight> lights = scene.lights();
  if (lights.empty()) return {};
  uint32_t reaching = 0;
  for (const PointLight& light : lights) {
    const Vec3 toward = light.position - point;
    reaching += dot(toward, toward) < light.reach * light.reach && dot(normal, toward) > 0.0f;
  }
  if (!reaching) return {};
  uint32_t pick = std::min(static_cast<uint32_t>(random.next() * static_cast<float>(reaching)), reaching - 1);
  for (const PointLight& light : lights) {
    const Vec3 toward = light.position - point;
    const float squared = dot(toward, toward);
    if (!(squared < light.reach * light.reach && dot(normal, toward) > 0.0f)) continue;
    if (pick--) continue;
    const float distance = std::sqrt(squared);
    return light_falloff(light, distance) * light_visibility(scene, light, point, 1, random, Scene::NO_OWNER) * (dot(normal, toward) / distance * static_cast<float>(reaching));
  }
  return {};
}

/**
 * point(면에서 이미 띄운 자리)에서 normal 둘레의 반구로 들어오는 빛 — 하늘빛과 두 번까지 튕긴 빛 (해의 직접광은 빼고).
 * 경로마다 난수가 따로다 (seed 와 경로 번호에서) — 장면의 한쪽이 바뀌어도 거기 닿지 않은 경로의 값은 그대로다 (문만 다른 굽기끼리 견줄 수 있다).
 * variance 를 주면 이 평균의 분산(밝기의)을 어림해 적는다 — 잡음을 고를 때의 자.
 * openness 를 주면 트인 정도를 적는다 — 경로들의 min(1, 처음 닿은 거리 ÷ contact_reach) 의 평균 (맞닿은 곳의 어둠 — Settings::contact).
 * toward 를 주면 빛이 온 방향을 적는다 — 경로마다 (그 경로로 온 빛의 밝기 × 방향) 의 평균 (길이는 빛의 밝기를 넘지 않는다)
 */
Vec3 gather(const Scene& scene, const Sky& sky, Vec3 point, Vec3 normal, uint32_t paths, uint32_t seed, uint32_t skip_owner, float* variance = nullptr, float* openness = nullptr,
            float contact_reach = 1.0f, Vec3* toward = nullptr) {
  // 반구를 side × side 칸으로 나눠 칸마다 하나씩 (남는 것은 아무 데나)
  const uint32_t side = static_cast<uint32_t>(std::sqrt(static_cast<float>(paths)));
  Vec3 sum{}, toward_sum{};
  float squares = 0.0f, open_sum = 0.0f;
  for (uint32_t i = 0; i < paths; i++) {
    Random random{mix(seed, i)};
    const bool cell = i < side * side;
    const float u = cell ? (static_cast<float>(i % side) + random.next()) / static_cast<float>(side) : random.next();
    const float v = cell ? (static_cast<float>(i / side) + random.next()) / static_cast<float>(side) : random.next();
    const Vec3 direction = cosine_direction(normal, u, v);
    // 색유리를 지난 경로는 그 뒤의 빛에 유리의 색이 곱해진다
    Vec3 through{1.0f, 1.0f, 1.0f};
    const auto hit = scene.closest({point, direction}, FAR, skip_owner, random.state, &through);
    open_sum += hit ? std::min(1.0f, hit->distance / contact_reach) : 1.0f;
    if (!hit) {
      const Vec3 open = sky.radiance(direction) * through;
      sum = sum + open;
      toward_sum = toward_sum + direction * brightness(open);
      squares += brightness(open) * brightness(open);
      continue;
    }
    const Triangle& first = scene.triangles()[hit->triangle];
    // 물체 속에서 본 면 — 빛이 오지 않는다
    if (hit->back && !first.two_sided) continue;
    // 닿은 자리가 해와 점광원에서 받는 빛과, 거기서 한 번 더 튕겨 온 빛 (하늘이거나, 또 닿은 자리가 해와 점광원에서 받는 빛)
    Vec3 facing = normalize(cross(first.b - first.a, first.c - first.a));
    if (hit->back) facing = facing * -1.0f;
    const Vec3 at = point + direction * hit->distance + facing * bias_at(point);
    Vec3 arriving = sun_once(scene, sky, at, facing, random) + lights_once(scene, at, facing, random);
    const Vec3 onward = cosine_direction(facing, random.next(), random.next());
    Vec3 beyond{1.0f, 1.0f, 1.0f};
    const auto second = scene.closest({at, onward}, FAR, Scene::NO_OWNER, random.state, &beyond);
    if (!second) {
      arriving = arriving + sky.radiance(onward) * beyond;
    } else if (const Triangle& far = scene.triangles()[second->triangle]; !second->back || far.two_sided) {
      Vec3 far_facing = normalize(cross(far.b - far.a, far.c - far.a));
      if (second->back) far_facing = far_facing * -1.0f;
      const Vec3 far_at = at + onward * second->distance + far_facing * bias_at(at);
      arriving = arriving + far.albedo * beyond * (sun_once(scene, sky, far_at, far_facing, random) + lights_once(scene, far_at, far_facing, random));
    }
    const Vec3 arrived = first.albedo * through * arriving;
    sum = sum + arrived;
    toward_sum = toward_sum + direction * brightness(arrived);
    squares += brightness(arrived) * brightness(arrived);
  }
  const float n = static_cast<float>(paths);
  const Vec3 mean = sum * (1.0f / n);
  if (variance) *variance = paths > 1 ? std::max(0.0f, squares / n - brightness(mean) * brightness(mean)) / (n - 1.0f) : 0.0f;
  if (openness) *openness = open_sum / n;
  if (toward) *toward = toward_sum * (1.0f / n);
  return mean;
}

Vec3 transform(const Mat4& m, const float p[3], float w) {
  return {m.m[0] * p[0] + m.m[4] * p[1] + m.m[8] * p[2] + m.m[12] * w, m.m[1] * p[0] + m.m[5] * p[1] + m.m[9] * p[2] + m.m[13] * w, m.m[2] * p[0] + m.m[6] * p[1] + m.m[10] * p[2] + m.m[14] * w};
}

/** 텍셀 하나의 표본 자리 */
struct Texel {
  Vec3 position;
  Vec3 normal;
  /** 텍셀 한 칸이 세계에서 가는 길 (가로, 세로) — 선으로 눌린 조각은 0 */
  Vec3 across, down;
};

/**
 * 표본 자리를 정한다 — 면에서 띄우고, 접선 방향으로 반 텍셀 안에 뒷면이 있으면(물체 속에 묻혔다) 그 면 밖으로 민다
 * (벽이 바닥에 서 있는 자리처럼, 텍셀이 다른 물체에 반쯤 깔린 곳에서 그림자가 새어 나오지 않게)
 */
Vec3 settle(const Scene& scene, const Texel& texel, Vec3 position, uint32_t salt) {
  const Vec3 origin = position + texel.normal * bias_at(position);
  float nearest = FAR;
  Vec3 moved = origin;
  for (const Vec3 step : {texel.across, texel.across * -1.0f, texel.down, texel.down * -1.0f}) {
    const float reach = length(step) * 0.5f;
    if (reach <= 0.0f) continue;
    const Vec3 direction = step * (0.5f / reach);
    const auto hit = scene.closest({origin, direction}, reach, Scene::NO_OWNER, salt);
    if (!hit || !hit->back || scene.triangles()[hit->triangle].two_sided || hit->distance >= nearest) continue;
    nearest = hit->distance;
    moved = origin + direction * (hit->distance + bias_at(origin));
  }
  return moved;
}

}  // namespace

std::optional<Sky> Sky::decode(std::span<const std::byte> bytes) {
  constexpr std::size_t HEADER_BYTES = 44;
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKSY", 4) != 0) return std::nullopt;
  Sky sky;
  std::memcpy(&sky.width, bytes.data() + 4, 4);
  std::memcpy(&sky.height, bytes.data() + 8, 4);
  if (!sky.width || !sky.height || sky.width > 4096 || sky.height > 2048) return std::nullopt;
  const std::size_t cells = static_cast<std::size_t>(sky.width) * sky.height;
  if (bytes.size() != HEADER_BYTES + cells * 12) return std::nullopt;
  float head[8];
  std::memcpy(head, bytes.data() + 12, sizeof head);
  sky.table.resize(cells);
  static_assert(sizeof(Vec3) == 12);
  std::memcpy(sky.table.data(), bytes.data() + HEADER_BYTES, cells * 12);
  for (const float value : head)
    if (!std::isfinite(value)) return std::nullopt;
  for (const Vec3& cell : sky.table)
    if (!std::isfinite(cell.x) || !std::isfinite(cell.y) || !std::isfinite(cell.z) || cell.x < 0.0f || cell.y < 0.0f || cell.z < 0.0f) return std::nullopt;
  sky.yaw = head[0];
  sky.sun_direction = {head[1], head[2], head[3]};
  sky.sun_light = {head[4], head[5], head[6]};
  sky.sun_radius = head[7];
  if (std::fabs(length(sky.sun_direction) - 1.0f) > 1e-3f || sky.sun_radius < 0.0f || sky.sun_radius > 0.5f) return std::nullopt;
  return sky;
}

Vec3 Sky::radiance(Vec3 direction) const {
  if (table.empty()) return {};
  // 칸의 방향은 tools/skyc.mjs 머리말 — 방위 φ = atan2(x, -z) 에서 돌린 각을 뺀다
  float turn = (std::atan2(direction.x, -direction.z) - yaw) / (2.0f * PI) + 0.5f;
  turn -= std::floor(turn);
  const float fall = std::acos(std::clamp(direction.y, -1.0f, 1.0f)) / PI;
  const uint32_t x = std::min(static_cast<uint32_t>(turn * static_cast<float>(width)), width - 1);
  const uint32_t y = std::min(static_cast<uint32_t>(fall * static_cast<float>(height)), height - 1);
  return table[static_cast<std::size_t>(y) * width + x];
}

void Scene::build() {
  std::vector<Aabb> boxes;
  boxes.reserve(triangles_.size());
  for (const Triangle& t : triangles_)
    boxes.push_back({{std::min({t.a.x, t.b.x, t.c.x}), std::min({t.a.y, t.b.y, t.c.y}), std::min({t.a.z, t.b.z, t.c.z})},
                     {std::max({t.a.x, t.b.x, t.c.x}), std::max({t.a.y, t.b.y, t.c.y}), std::max({t.a.z, t.b.z, t.c.z})}});
  bvh_.build(boxes);
}

std::optional<Scene::Hit> Scene::closest(const Ray& ray, float max_distance, uint32_t skip_owner, uint32_t salt, Vec3* filter) const {
  std::optional<Hit> best;
  // 지나친 색유리 — 닿은 자리보다 앞의 것만 곱한다 (순회는 거리 차례가 아니다). 한 광선이 이보다 많은 유리를 지나면 나머지는 맑은 유리로 친다
  struct Pane {
    float distance;
    uint32_t triangle;
  };
  std::array<Pane, 16> panes;
  uint32_t pane_count = 0;
  bvh_.traverse(ray, max_distance, [&](uint32_t index, float, float limit) {
    const Triangle& t = triangles_[index];
    if (t.owner == skip_owner) return limit;
    const auto distance = intersect(ray, t.a, t.b, t.c);
    if (!distance || *distance > limit || (best && *distance >= best->distance)) return limit;
    const bool back = dot(cross(t.b - t.a, t.c - t.a), ray.direction) > 0.0f;
    if (t.translucent) {
      if (filter && !back && pane_count < panes.size()) panes[pane_count++] = {*distance, index};
      return limit;
    }
    if (t.sparse && !sparse_blocks(t, salt)) return limit;
    best = Hit{index, *distance, back};
    return *distance;
  });
  if (filter)
    for (uint32_t i = 0; i < pane_count; i++)
      if (!best || panes[i].distance < best->distance) *filter = *filter * pane_tint(triangles_[panes[i].triangle], ray, panes[i].distance);
  return best;
}

bool Scene::blocked(const Ray& ray, float max_distance, uint32_t skip_owner, uint32_t salt) const {
  bool found = false;
  bvh_.traverse(ray, max_distance, [&](uint32_t index, float, float limit) {
    const Triangle& t = triangles_[index];
    if (t.owner == skip_owner || t.translucent) return limit;
    const auto distance = intersect(ray, t.a, t.b, t.c);
    if (!distance || *distance > limit || (t.sparse && !sparse_blocks(t, salt))) return limit;
    found = true;
    // 하나면 된다 — 더 찾지 않는다
    return -1.0f;
  });
  return found;
}

Vec3 Scene::transmit(const Ray& ray, float max_distance, uint32_t skip_owner, uint32_t salt) const {
  bool found = false;
  Vec3 through{1.0f, 1.0f, 1.0f};
  bvh_.traverse(ray, max_distance, [&](uint32_t index, float, float limit) {
    const Triangle& t = triangles_[index];
    if (t.owner == skip_owner) return limit;
    const auto distance = intersect(ray, t.a, t.b, t.c);
    if (!distance || *distance > limit) return limit;
    if (t.translucent) {
      // 앞면으로 들어설 때만 곱한다 (닫힌 유리 덩어리를 지나면 한 번)
      if (dot(cross(t.b - t.a, t.c - t.a), ray.direction) < 0.0f) through = through * pane_tint(t, ray, *distance);
      return limit;
    }
    if (t.sparse && !sparse_blocks(t, salt)) return limit;
    found = true;
    return -1.0f;
  });
  return found ? Vec3{} : through;
}

Vec3 Scene::pane_tint(const Triangle& t, const Ray& ray, float distance) const {
  if (t.pane >= panes_.size()) return t.tint;
  const PaneTexture& pane = panes_[t.pane];
  if (!pane.width || !pane.height) return t.tint;
  // 닿은 자리의 무게중심 좌표 → 무늬 좌표 → 가장 가까운 텍셀 (무늬는 되풀이된다)
  const Vec3 p = ray.origin + ray.direction * distance, e1 = t.b - t.a, e2 = t.c - t.a, q = p - t.a;
  const float d11 = dot(e1, e1), d12 = dot(e1, e2), d22 = dot(e2, e2), q1 = dot(q, e1), q2 = dot(q, e2), det = d11 * d22 - d12 * d12;
  if (std::fabs(det) < 1e-20f) return t.tint;
  const float b1 = (d22 * q1 - d12 * q2) / det, b2 = (d11 * q2 - d12 * q1) / det, b0 = 1.0f - b1 - b2;
  float u = t.uv[0][0] * b0 + t.uv[1][0] * b1 + t.uv[2][0] * b2, v = t.uv[0][1] * b0 + t.uv[1][1] * b1 + t.uv[2][1] * b2;
  u -= std::floor(u), v -= std::floor(v);
  const uint32_t x = std::min(static_cast<uint32_t>(u * static_cast<float>(pane.width)), pane.width - 1), y = std::min(static_cast<uint32_t>(v * static_cast<float>(pane.height)), pane.height - 1);
  return t.tint * pane.tint[static_cast<std::size_t>(y) * pane.width + x];
}

bool Scene::inside(Vec3 point) const {
  // 축과 어긋난 세 방향 — 상자의 면·모서리와 나란하지 않다
  static const Vec3 DIRECTIONS[] = {normalize({0.3713f, 0.8291f, 0.4187f}), normalize({-0.6131f, 0.2417f, -0.7519f}), normalize({0.5419f, -0.5873f, -0.6011f})};
  int votes = 0;
  for (const Vec3 direction : DIRECTIONS) {
    const Ray ray{point, direction};
    int out = 0;
    bvh_.traverse(ray, FAR, [&](uint32_t index, float, float limit) {
      const Triangle& t = triangles_[index];
      if (!t.two_sided && !t.translucent && intersect(ray, t.a, t.b, t.c)) out += dot(cross(t.b - t.a, t.c - t.a), direction) > 0.0f ? 1 : -1;
      return limit;
    });
    votes += out > 0;
  }
  return votes >= 2;
}

Lightmap bake_lightmap(const Scene& scene, const Sky& sky, std::span<const SurfaceVertex> vertices, const Mat4& placement, uint32_t width, uint32_t height, const Settings& settings) {
  const std::size_t count = static_cast<std::size_t>(width) * height;
  Lightmap map{.width = width,
               .height = height,
               .light = std::vector<Vec3>(count),
               .toward = std::vector<Vec3>(count),
               .focus = std::vector<float>(count),
               .covered = std::vector<uint8_t>(count),
               .filled = std::vector<uint8_t>(count)};
  if (!count) return map;
  std::vector<Texel> texels(count);

  // 1. 삼각형을 아틀라스에 칠해 텍셀마다의 자리를 정한다 (텍셀의 가운데가 삼각형 안이면 그 삼각형의 것)
  const float w = static_cast<float>(width), h = static_cast<float>(height);
  for (std::size_t first = 0; first + 2 < vertices.size(); first += 3) {
    const SurfaceVertex* v = &vertices[first];
    const Vec3 p[3] = {transform(placement, v[0].position, 1.0f), transform(placement, v[1].position, 1.0f), transform(placement, v[2].position, 1.0f)};
    const Vec3 normal = normalize(transform(placement, v[0].normal, 0.0f));
    const float tx[3] = {v[0].lightmap[0] * w, v[1].lightmap[0] * w, v[2].lightmap[0] * w}, ty[3] = {v[0].lightmap[1] * h, v[1].lightmap[1] * h, v[2].lightmap[1] * h};
    const float e1x = tx[1] - tx[0], e1y = ty[1] - ty[0], e2x = tx[2] - tx[0], e2y = ty[2] - ty[0];
    const float area = e1x * e2y - e1y * e2x;
    // 좌표는 가장자리 텍셀의 가운데까지 온다 — 그 텍셀들이 빠지지 않게 조금 넉넉히 본다
    constexpr float EDGE = 1e-3f;
    const int x0 = std::max(0, static_cast<int>(std::floor(std::min({tx[0], tx[1], tx[2]}) - 0.5f + EDGE))), x1 = std::min(static_cast<int>(width) - 1, static_cast<int>(std::floor(std::max({tx[0], tx[1], tx[2]}) - 0.5f + 2.0f * EDGE)));
    const int y0 = std::max(0, static_cast<int>(std::floor(std::min({ty[0], ty[1], ty[2]}) - 0.5f + EDGE))), y1 = std::min(static_cast<int>(height) - 1, static_cast<int>(std::floor(std::max({ty[0], ty[1], ty[2]}) - 0.5f + 2.0f * EDGE)));
    if (std::fabs(area) > 1e-4f) {
      const float inverse = 1.0f / area;
      // 텍셀 한 칸이 세계에서 가는 길 — 삼각형 위의 선형 대응에서
      const Vec3 across = (p[1] - p[0]) * (e2y * inverse) - (p[2] - p[0]) * (e1y * inverse), down = (p[2] - p[0]) * (e1x * inverse) - (p[1] - p[0]) * (e2x * inverse);
      for (int y = y0; y <= y1; y++)
        for (int x = x0; x <= x1; x++) {
          const float dx = static_cast<float>(x) + 0.5f - tx[0], dy = static_cast<float>(y) + 0.5f - ty[0];
          const float b1 = (dx * e2y - dy * e2x) * inverse, b2 = (dy * e1x - dx * e1y) * inverse;
          // 변에 걸친 텍셀도 든다 (가장자리 텍셀의 가운데가 변 위다)
          const float slack = EDGE * (std::fabs(inverse) * (std::fabs(e1x) + std::fabs(e1y) + std::fabs(e2x) + std::fabs(e2y)) + 1.0f);
          if (b1 < -slack || b2 < -slack || b1 + b2 > 1.0f + slack) continue;
          const std::size_t at = static_cast<std::size_t>(y) * width + static_cast<std::size_t>(x);
          texels[at] = {p[0] + (p[1] - p[0]) * b1 + (p[2] - p[0]) * b2, normal, across, down};
          map.covered[at] = 1;
        }
    } else {
      // 한 텍셀 폭으로 눌린 조각 (얇은 띠의 옆면) — 가장 긴 변을 따라 자리를 잡는다
      int from = 0, to = 1;
      float longest = -1.0f;
      for (int i = 0; i < 3; i++) {
        const int j = (i + 1) % 3;
        const float span = (tx[j] - tx[i]) * (tx[j] - tx[i]) + (ty[j] - ty[i]) * (ty[j] - ty[i]);
        if (span > longest) longest = span, from = i, to = j;
      }
      for (int y = y0; y <= y1; y++)
        for (int x = x0; x <= x1; x++) {
          const float along = longest > 0.0f ? std::clamp(((static_cast<float>(x) + 0.5f - tx[from]) * (tx[to] - tx[from]) + (static_cast<float>(y) + 0.5f - ty[from]) * (ty[to] - ty[from])) / longest, 0.0f, 1.0f) : 0.5f;
          const std::size_t at = static_cast<std::size_t>(y) * width + static_cast<std::size_t>(x);
          if (map.covered[at]) continue;
          texels[at] = {p[from] + (p[to] - p[from]) * along, normal, {}, {}};
          map.covered[at] = 1;
        }
    }
  }

  // 2. 텍셀마다 — 해의 직접광(부표본 2×2 로 그림자의 가장자리를 고르게)과, 가운데에서 모은 하늘빛·튕긴 빛
  std::vector<Vec3> direct(count), indirect(count);
  // 빛이 오는 방향 — 직접광의 것(밝기 × 광원 쪽)과, 하늘빛·튕긴 빛의 것(경로들의 밝기 × 방향의 평균 — 빛과 같이 잡음을 고른다)
  std::vector<Vec3> direct_toward(count), indirect_toward(count);
  std::vector<float> noise(count), openness(count, 1.0f);
  const uint32_t per_sub = std::max(1u, settings.sun_rays / 4);
  for (std::size_t at = 0; at < count; at++) {
    if (!map.covered[at]) continue;
    const Texel& texel = texels[at];
    Random random{mix(settings.seed, static_cast<uint32_t>(at))};
    const Vec3 center = settle(scene, texel, texel.position, random.state);
    // 물체 속의 텍셀 (다른 물체에 깔린 면) — 값을 두지 않는다 (이웃에서 번져 채워진다)
    if (scene.inside(center)) continue;
    const Vec3 around =
        gather(scene, sky, center, texel.normal, settings.paths, mix(random.state, 0x47415448u), Scene::NO_OWNER, &noise[at], &openness[at], settings.contact_reach, &indirect_toward[at]);
    const float cosine = dot(texel.normal, sky.sun_direction);
    Vec3 open{};
    if (cosine > 0.0f) {
      static constexpr float OFFSETS[4][2] = {{-0.25f, -0.25f}, {0.25f, -0.25f}, {-0.25f, 0.25f}, {0.25f, 0.25f}};
      for (const auto& offset : OFFSETS) {
        const Vec3 sub = settle(scene, texel, texel.position + texel.across * offset[0] + texel.down * offset[1], random.state);
        open = open + sun_visibility(scene, sky, sub, per_sub, random, Scene::NO_OWNER) * 0.25f;
      }
    }
    direct[at] = sky.sun_light * open * std::max(cosine, 0.0f);
    direct_toward[at] = sky.sun_direction * brightness(direct[at]);
    if (!scene.lights().empty()) direct[at] = direct[at] + lights_direct(scene, center, texel.normal, std::max(1u, settings.light_rays), random, &direct_toward[at]);
    indirect[at] = around;
    map.filled[at] = 1;
  }

  // 3. 하늘빛·튕긴 빛의 잡음을 고른다 (edge-avoiding à-trous — Dammertz 외 2010. 밝기의 자는 SVGF — Schied 외 2017 — 처럼 표본의 분산에서 얻는다) — 해의 그림자는 그대로 둔다.
  //    같은 면의 이웃하고만 섞는다: 법선이 같고, 그 텍셀이 이 텍셀의 조각을 그대로 이어 간 자리에 있을 때 (아틀라스에서만 이웃인 다른 조각을 가른다)
  const auto same_face = [&](std::size_t at, std::size_t near, int dx, int dy) {
    if (!map.filled[near] || dot(texels[near].normal, texels[at].normal) < SAME_FACE) return false;
    const Texel& texel = texels[at];
    const Vec3 off = texels[near].position - (texel.position + texel.across * static_cast<float>(dx) + texel.down * static_cast<float>(dy));
    return dot(off, off) <= 0.25f * std::max(dot(texel.across, texel.across), dot(texel.down, texel.down));
  };
  std::vector<Vec3> smooth(count), smooth_toward(count);
  std::vector<float> spread(count), smooth_noise(count);
  for (int pass = 0; pass < DENOISE_PASSES; pass++) {
    const int step = 1 << pass;
    // 잡음의 어림도 잡음이 있다 — 이웃 3×3 과 고른 것을 자로 쓴다
    for (uint32_t y = 0; y < height; y++)
      for (uint32_t x = 0; x < width; x++) {
        const std::size_t at = static_cast<std::size_t>(y) * width + x;
        if (!map.filled[at]) continue;
        float sum = 0.0f, weight = 0.0f;
        for (int dy = -1; dy <= 1; dy++)
          for (int dx = -1; dx <= 1; dx++) {
            const int nx = static_cast<int>(x) + dx, ny = static_cast<int>(y) + dy;
            if (nx < 0 || ny < 0 || nx >= static_cast<int>(width) || ny >= static_cast<int>(height)) continue;
            const std::size_t near = static_cast<std::size_t>(ny) * width + static_cast<std::size_t>(nx);
            if (!same_face(at, near, dx, dy)) continue;
            const float share = static_cast<float>((2 - std::abs(dx)) * (2 - std::abs(dy)));
            sum += noise[near] * share;
            weight += share;
          }
        spread[at] = std::sqrt(sum / weight);
      }
    for (uint32_t y = 0; y < height; y++)
      for (uint32_t x = 0; x < width; x++) {
        const std::size_t at = static_cast<std::size_t>(y) * width + x;
        if (!map.filled[at]) continue;
        static constexpr float KERNEL[5] = {1.0f, 4.0f, 6.0f, 4.0f, 1.0f};
        Vec3 sum{}, toward_sum{};
        float weight = 0.0f, variance = 0.0f;
        for (int dy = -2; dy <= 2; dy++)
          for (int dx = -2; dx <= 2; dx++) {
            const int nx = static_cast<int>(x) + dx * step, ny = static_cast<int>(y) + dy * step;
            if (nx < 0 || ny < 0 || nx >= static_cast<int>(width) || ny >= static_cast<int>(height)) continue;
            const std::size_t near = static_cast<std::size_t>(ny) * width + static_cast<std::size_t>(nx);
            if (!same_face(at, near, dx * step, dy * step)) continue;
            const float share = KERNEL[dx + 2] * KERNEL[dy + 2] * std::exp(-std::fabs(brightness(indirect[near]) - brightness(indirect[at])) / (DENOISE_EDGE * spread[at] + 1e-4f));
            sum = sum + indirect[near] * share;
            toward_sum = toward_sum + indirect_toward[near] * share;
            variance += noise[near] * share * share;
            weight += share;
          }
        smooth[at] = sum * (1.0f / weight);
        smooth_toward[at] = toward_sum * (1.0f / weight);
        smooth_noise[at] = variance / (weight * weight);
      }
    indirect.swap(smooth);
    indirect_toward.swap(smooth_toward);
    noise.swap(smooth_noise);
  }
  // 맞닿은 곳의 어둠 — 트인 정도는 잡음 고르기를 거치지 않는다 (그 반경이 벽 밑의 기울기를 뭉갠다). 같은 면의 3×3 으로만 고르고 하늘빛·튕긴 빛에 곱한다
  if (settings.contact > 0.0f) {
    for (uint32_t y = 0; y < height; y++)
      for (uint32_t x = 0; x < width; x++) {
        const std::size_t at = static_cast<std::size_t>(y) * width + x;
        if (!map.filled[at]) continue;
        float sum = 0.0f, weight = 0.0f;
        for (int dy = -1; dy <= 1; dy++)
          for (int dx = -1; dx <= 1; dx++) {
            const int nx = static_cast<int>(x) + dx, ny = static_cast<int>(y) + dy;
            if (nx < 0 || ny < 0 || nx >= static_cast<int>(width) || ny >= static_cast<int>(height)) continue;
            const std::size_t near = static_cast<std::size_t>(ny) * width + static_cast<std::size_t>(nx);
            if (!same_face(at, near, dx, dy)) continue;
            const float share = static_cast<float>((2 - std::abs(dx)) * (2 - std::abs(dy)));
            sum += openness[near] * share;
            weight += share;
          }
        spread[at] = sum / weight;
      }
    for (std::size_t at = 0; at < count; at++) {
      if (!map.filled[at]) continue;
      const float pressed = std::pow(std::clamp(spread[at], 0.0f, 1.0f), settings.contact);
      indirect[at] = (indirect[at] + settings.ambient) * pressed;
      indirect_toward[at] = (indirect_toward[at] + texels[at].normal * (AMBIENT_FOCUS * brightness(settings.ambient))) * pressed;
    }
  } else {
    for (std::size_t at = 0; at < count; at++) {
      if (!map.filled[at]) continue;
      indirect[at] = indirect[at] + settings.ambient;
      indirect_toward[at] = indirect_toward[at] + texels[at].normal * (AMBIENT_FOCUS * brightness(settings.ambient));
    }
  }
  for (std::size_t at = 0; at < count; at++) {
    if (!map.filled[at]) continue;
    map.light[at] = direct[at] + indirect[at];
    // 주로 오는 방향과 쏠림 — 빛이 없는 텍셀은 면의 법선 쪽, 쏠림 0
    const Vec3 sum = direct_toward[at] + indirect_toward[at];
    const float reach = length(sum), total = brightness(map.light[at]);
    map.toward[at] = reach > 1e-6f ? sum * (1.0f / reach) : texels[at].normal;
    map.focus[at] = total > 1e-6f ? std::clamp(reach / total, 0.0f, 1.0f) : 0.0f;
  }

  // 4. 빈 텍셀을 이웃의 값으로 채워 나간다 (dilation) — 조각 밖의 틈과, 조각 안의 버려진 텍셀
  std::vector<std::size_t> edge;
  for (int pass = 0; pass < FILL_PASSES; pass++) {
    edge.clear();
    std::vector<Vec3> values, towards;
    std::vector<float> focuses;
    for (uint32_t y = 0; y < height; y++)
      for (uint32_t x = 0; x < width; x++) {
        const std::size_t at = static_cast<std::size_t>(y) * width + x;
        if (map.filled[at]) continue;
        Vec3 sum{}, toward_sum{};
        float weight = 0.0f, focus_sum = 0.0f;
        for (int dy = -1; dy <= 1; dy++)
          for (int dx = -1; dx <= 1; dx++) {
            const int nx = static_cast<int>(x) + dx, ny = static_cast<int>(y) + dy;
            if (nx < 0 || ny < 0 || nx >= static_cast<int>(width) || ny >= static_cast<int>(height)) continue;
            const std::size_t near = static_cast<std::size_t>(ny) * width + static_cast<std::size_t>(nx);
            if (!map.filled[near]) continue;
            sum = sum + map.light[near];
            toward_sum = toward_sum + map.toward[near];
            focus_sum += map.focus[near];
            weight += 1.0f;
          }
        if (weight == 0.0f) continue;
        edge.push_back(at);
        values.push_back(sum * (1.0f / weight));
        const float reach = length(toward_sum);
        towards.push_back(reach > 1e-6f ? toward_sum * (1.0f / reach) : Vec3{0.0f, 1.0f, 0.0f});
        focuses.push_back(focus_sum / weight);
      }
    if (edge.empty()) break;
    for (std::size_t i = 0; i < edge.size(); i++) {
      map.light[edge[i]] = values[i];
      map.toward[edge[i]] = towards[i];
      map.focus[edge[i]] = focuses[i];
      map.filled[edge[i]] = 1;
    }
  }
  return map;
}

std::vector<std::byte> Lightmap::rgba8() const {
  std::vector<std::byte> out(light.size() * 4);
  const auto pack = [](float value) { return static_cast<std::byte>(std::lround(std::sqrt(std::clamp(value / LIGHT_RANGE, 0.0f, 1.0f)) * 255.0f)); };
  for (std::size_t i = 0; i < light.size(); i++) {
    if (!filled[i]) {
      // 읽히지 않는 텍셀 — 앞 텍셀과 같게 (QOI 의 줄이 된다)
      for (std::size_t c = 0; c < 3; c++) out[i * 4 + c] = i ? out[i * 4 - 4 + c] : std::byte{0};
      out[i * 4 + 3] = std::byte{255};
      continue;
    }
    out[i * 4] = pack(light[i].x);
    out[i * 4 + 1] = pack(light[i].y);
    out[i * 4 + 2] = pack(light[i].z);
    out[i * 4 + 3] = std::byte{255};
  }
  return out;
}

std::vector<std::byte> Lightmap::direction_rgba8() const {
  std::vector<std::byte> out(toward.size() * 4);
  const auto pack = [](float value) { return static_cast<std::byte>(std::lround(std::clamp(value, 0.0f, 1.0f) * 255.0f)); };
  for (std::size_t i = 0; i < toward.size(); i++) {
    if (!filled[i]) {
      for (std::size_t c = 0; c < 4; c++) out[i * 4 + c] = i ? out[i * 4 - 4 + c] : std::byte{128};
      continue;
    }
    out[i * 4] = pack(toward[i].x * 0.5f + 0.5f);
    out[i * 4 + 1] = pack(toward[i].y * 0.5f + 0.5f);
    out[i * 4 + 2] = pack(toward[i].z * 0.5f + 0.5f);
    out[i * 4 + 3] = pack(focus[i]);
  }
  return out;
}

Probe probe(const Scene& scene, const Sky& sky, Vec3 point, uint32_t skip_owner, const Settings& settings, uint32_t id) {
  Random random{mix(settings.seed ^ 0x50524F42u, id)};
  Probe out;
  out.up = gather(scene, sky, point, {0.0f, 1.0f, 0.0f}, settings.paths, mix(random.state, 1u), skip_owner);
  out.down = gather(scene, sky, point, {0.0f, -1.0f, 0.0f}, settings.paths, mix(random.state, 2u), skip_owner);
  out.up = out.up + settings.ambient;
  out.down = out.down + settings.ambient;
  out.sun = brightness(sun_visibility(scene, sky, point, settings.sun_rays, random, skip_owner));
  // 점광원 — 방향을 접어 위·아래 빛에 나눠 담는다
  for (const PointLight& light : scene.lights()) {
    const Vec3 toward = light.position - point;
    const float distance = length(toward);
    if (distance >= light.reach || distance <= 0.0f) continue;
    const Vec3 arriving = light_falloff(light, std::max(distance, PROBE_LIGHT_NEAR)) * light_visibility(scene, light, point, std::max(1u, settings.light_rays), random, skip_owner);
    const float upward = 0.5f + 0.5f * toward.y / distance;
    out.up = out.up + arriving * upward;
    out.down = out.down + arriving * (1.0f - upward);
  }
  return out;
}

std::vector<std::byte> encode_qoi(uint32_t width, uint32_t height, std::span<const std::byte> rgba) {
  std::vector<std::byte> out;
  const auto put = [&](uint32_t value) { out.push_back(static_cast<std::byte>(value)); };
  for (const char c : {'q', 'o', 'i', 'f'}) put(static_cast<uint8_t>(c));
  for (const uint32_t side : {width, height})
    for (int shift = 24; shift >= 0; shift -= 8) put(side >> shift & 255u);
  // 채널 4, 색 공간 1 (선형 — 그림이 아니라 값이다)
  put(4), put(1);
  struct Pixel {
    uint8_t r, g, b, a;
    bool operator==(const Pixel&) const = default;
  };
  std::array<Pixel, 64> seen{};
  Pixel before{0, 0, 0, 255};
  uint32_t run = 0;
  const std::size_t pixels = static_cast<std::size_t>(width) * height;
  for (std::size_t i = 0; i < pixels; i++) {
    const Pixel now{static_cast<uint8_t>(rgba[i * 4]), static_cast<uint8_t>(rgba[i * 4 + 1]), static_cast<uint8_t>(rgba[i * 4 + 2]), static_cast<uint8_t>(rgba[i * 4 + 3])};
    if (now == before) {
      if (++run == 62 || i + 1 == pixels) put(0xC0u | (run - 1)), run = 0;
      continue;
    }
    if (run) put(0xC0u | (run - 1)), run = 0;
    const uint32_t slot = (now.r * 3u + now.g * 5u + now.b * 7u + now.a * 11u) % 64u;
    const int dr = static_cast<int8_t>(now.r - before.r), dg = static_cast<int8_t>(now.g - before.g), db = static_cast<int8_t>(now.b - before.b);
    if (seen[slot] == now) {
      put(slot);
    } else if (now.a != before.a) {
      put(0xFF), put(now.r), put(now.g), put(now.b), put(now.a);
    } else if (dr >= -2 && dr <= 1 && dg >= -2 && dg <= 1 && db >= -2 && db <= 1) {
      put(0x40u | static_cast<uint32_t>(dr + 2) << 4 | static_cast<uint32_t>(dg + 2) << 2 | static_cast<uint32_t>(db + 2));
    } else if (dg >= -32 && dg <= 31 && dr - dg >= -8 && dr - dg <= 7 && db - dg >= -8 && db - dg <= 7) {
      put(0x80u | static_cast<uint32_t>(dg + 32)), put(static_cast<uint32_t>(dr - dg + 8) << 4 | static_cast<uint32_t>(db - dg + 8));
    } else {
      put(0xFE), put(now.r), put(now.g), put(now.b);
    }
    seen[slot] = now;
    before = now;
  }
  for (const uint8_t end : {0, 0, 0, 0, 0, 0, 0, 1}) put(end);
  return out;
}

}  // namespace engine::bake
