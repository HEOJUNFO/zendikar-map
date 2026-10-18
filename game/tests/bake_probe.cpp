// 라이트 베이커 프로브 — 손으로 놓은 작은 장면을 굽고 이론값·리터럴과 견준다 (GPU 없이, Node 에서).
//   고른 하늘 아래 열린 바닥, 해만 있는 바닥, 상자의 그림자와 반그림자, 닫힌 상자 속, 흰 벽과 검은 벽 곁의 바닥(튕긴 빛),
//   같은 입력은 같은 바이트, 조각 사이로 새지 않고 빈 텍셀이 남지 않는다, 프로브, 하늘 표 읽기, QOI 적기,
//   색유리(지나는 볕과 하늘빛에 색을 곱한다 — 막지 않는다), 점광원(거리의 제곱으로 잦아들고 닿는 거리에서 끊긴다, 상자의 그림자, 광원의 크기만큼의 반그림자, 프로브),
//   맞닿은 곳의 어둠(벽 밑은 반, 벽에서 먼 곳은 그대로)과 고른 채움빛,
//   방향성 라이트맵(빛이 주로 오는 방향과 쏠림 — 해·점광원·하늘빛·채움빛마다 손으로 셈한 값, 법선을 기울였을 때 셰이더의 식이 내는 밝기),
//   무늬가 있는 색유리(자리마다의 투과색 — 유리 조각의 색대로 바닥이 물들고 납선은 막는다, 무늬는 되풀이된다)
#include <array>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

#include "engine/bake/lightbake.hpp"
#include "engine/hud/bitmap.hpp"

namespace {

using engine::Mat4;
using engine::SurfaceVertex;
using engine::Vec3;
using engine::bake::Lightmap;
using engine::bake::Scene;
using engine::bake::Settings;
using engine::bake::Sky;
using engine::bake::Triangle;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

/** 휘도가 고른 하늘과 해 */
Sky sky_of(float radiance, Vec3 sun_direction, float sun_light, float sun_radius = 0.0f) {
  Sky sky;
  sky.width = sky.height = 1;
  sky.table = {{radiance, radiance, radiance}};
  sky.sun_direction = engine::normalize(sun_direction);
  sky.sun_light = {sun_light, sun_light, sun_light};
  sky.sun_radius = sun_radius;
  return sky;
}

/** 네모 (a → b → c → d 가 밖에서 볼 때 반시계) 를 삼각형 둘로 장면에 넣는다 */
void add_quad(Scene& scene, Vec3 a, Vec3 b, Vec3 c, Vec3 d, float albedo = 0.5f) {
  scene.add({a, b, c, {albedo, albedo, albedo}});
  scene.add({a, c, d, {albedo, albedo, albedo}});
}

/** 가운데가 center 인 상자 — outward 가 거짓이면 면이 안쪽을 본다 (속이 빈 방) */
void add_box(Scene& scene, Vec3 center, Vec3 half, bool outward = true, float albedo = 0.5f) {
  const auto corner = [&](int x, int y, int z) { return Vec3{center.x + static_cast<float>(x) * half.x, center.y + static_cast<float>(y) * half.y, center.z + static_cast<float>(z) * half.z}; };
  const auto face = [&](Vec3 a, Vec3 b, Vec3 c, Vec3 d) { outward ? add_quad(scene, a, b, c, d, albedo) : add_quad(scene, d, c, b, a, albedo); };
  face(corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1));
  face(corner(1, -1, -1), corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1));
  face(corner(1, -1, 1), corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1));
  face(corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1));
  face(corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1), corner(-1, 1, -1));
  face(corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1));
}

/**
 * 위를 보는 바닥 (x, z 가 -half … half, y 0) 의 겉면 정점 — 라이트맵의 텍셀 (x0, y0) 부터 가로세로 side 칸을 쓴다.
 * 좌표는 가장자리 텍셀의 가운데까지 간다 (tools/meshc.mjs 와 같다): 텍셀 (x0 + i, y0 + j) 의 가운데가 x = -half + i · 2 half / (side − 1), z = -half + j · 2 half / (side − 1)
 */
std::vector<SurfaceVertex> floor_mesh(float half, uint32_t side, uint32_t atlas, uint32_t x0 = 0, uint32_t y0 = 0, float y = 0.0f, bool up = true) {
  const auto vertex = [&](float x, float z) {
    const float u = (static_cast<float>(x0) + 0.5f + (x + half) / (2.0f * half) * static_cast<float>(side - 1)) / static_cast<float>(atlas);
    const float v = (static_cast<float>(y0) + 0.5f + (z + half) / (2.0f * half) * static_cast<float>(side - 1)) / static_cast<float>(atlas);
    return SurfaceVertex{{x, y, z}, {0.0f, up ? 1.0f : -1.0f, 0.0f}, {0.0f, 0.0f}, {u, v}, {1.0f, 1.0f, 1.0f, 0.0f}, -1.0f};
  };
  if (up) return {vertex(-half, half), vertex(half, half), vertex(half, -half), vertex(-half, half), vertex(half, -half), vertex(-half, -half)};
  return {vertex(-half, half), vertex(half, -half), vertex(half, half), vertex(-half, half), vertex(-half, -half), vertex(half, -half)};
}

void add_mesh(Scene& scene, const std::vector<SurfaceVertex>& mesh, float albedo = 0.5f) {
  for (std::size_t i = 0; i + 2 < mesh.size(); i += 3) {
    const auto p = [&](std::size_t k) { return Vec3{mesh[i + k].position[0], mesh[i + k].position[1], mesh[i + k].position[2]}; };
    scene.add({p(0), p(1), p(2), {albedo, albedo, albedo}});
  }
}

bool near(float a, float b, float tolerance) { return std::fabs(a - b) <= tolerance; }

void open_floor() {
  const auto mesh = floor_mesh(5.0f, 16, 16);
  Scene scene;
  add_mesh(scene, mesh);
  scene.build();
  // 고른 하늘(휘도 0.5), 해 없음 — 열린 수평면의 빛은 0.5 (조도 = π · 0.5). 모든 광선이 하늘에 닿으니 잡음도 없다
  const Lightmap sky_only = engine::bake::bake_lightmap(scene, sky_of(0.5f, {0, 1, 0}, 0.0f), mesh, Mat4::identity(), 16, 16, {});
  bool all = true, covered = true;
  for (std::size_t i = 0; i < 256; i++) all = all && near(sky_only.light[i].x, 0.5f, 1e-5f) && near(sky_only.light[i].z, 0.5f, 1e-5f), covered = covered && sky_only.covered[i] && sky_only.filled[i];
  expect(covered, "바닥의 조각이 아틀라스 전체를 덮는다 (가장자리 텍셀까지)");
  expect(all, "고른 하늘(휘도 L) 아래 열린 바닥의 빛은 L 이다 (조도 = π L)");
  // 해만 — 높이의 sin 이 0.8 인 해, 빛 2: 수평면은 2 × 0.8 = 1.6
  const Lightmap sun_only = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0.6f, 0.8f, 0.0f}, 2.0f, 0.02f), mesh, Mat4::identity(), 16, 16, {});
  all = true;
  for (std::size_t i = 0; i < 256; i++) all = all && near(sun_only.light[i].y, 1.6f, 1e-5f);
  expect(all, "해만 있을 때 수평 바닥의 빛은 해의 빛 × cos (2 × 0.8 = 1.6)");
  // 8 비트로 — sqrt(빛 ÷ 4): 0.5 → 0.35355 × 255 = 90, 1.6 → 0.63246 × 255 = 161
  expect(sky_only.rgba8()[0] == std::byte{90} && sun_only.rgba8()[5] == std::byte{161} && sun_only.rgba8()[3] == std::byte{255}, "텍셀은 sqrt(빛 ÷ 4) 로 담는다");
  // 놓는 행렬 — 바닥을 x 로 100 옮겨 놓아도 같다
  Scene moved;
  for (std::size_t i = 0; i + 2 < mesh.size(); i += 3) {
    const auto p = [&](std::size_t k) { return Vec3{mesh[i + k].position[0] + 100.0f, 0.0f, mesh[i + k].position[2]}; };
    moved.add({p(0), p(1), p(2)});
  }
  moved.build();
  const Lightmap placed = engine::bake::bake_lightmap(moved, sky_of(0.25f, {0, 1, 0}, 1.0f), mesh, Mat4::from_basis({1, 0, 0}, {0, 1, 0}, {0, 0, 1}, {100, 0, 0}), 16, 16, {});
  expect(near(placed.light[100].x, 1.25f, 1e-5f), "놓는 행렬로 옮긴 메시도 제자리에서 굽는다 (하늘 0.25 + 머리 위의 해 1)");
}

void box_shadow() {
  // 20 m 바닥(텍셀 64 × 64 — 가운데 사이가 20 / 63 = 0.31746 m: 텍셀 i 의 가운데가 x = -10 + 0.31746 i)에 1.8 × 4 × 1.8 상자. 해는 +x 쪽, 높이의 sin 0.8
  const auto mesh = floor_mesh(10.0f, 64, 64);
  Scene scene;
  add_mesh(scene, mesh);
  add_box(scene, {0.0f, 2.0f, 0.0f}, {0.9f, 2.0f, 0.9f});
  scene.build();
  const Sky sky = sky_of(0.1f, {0.6f, 0.8f, 0.0f}, 2.0f, 0.05f);
  const Settings settings{.sun_rays = 64, .paths = 64, .seed = 7};
  const Lightmap map = engine::bake::bake_lightmap(scene, sky, mesh, Mat4::identity(), 64, 64, settings);
  const auto at = [&](uint32_t i, uint32_t j) { return map.light[static_cast<std::size_t>(j) * 64 + i].x; };
  // 그림자: 상자의 -x 쪽으로 4 × 0.6 / 0.8 = 3 m (x -3.9 … -0.9, z ±0.9). 가운데 줄은 텍셀 j = 31·32 (z = ∓0.159)
  expect(at(50, 50) > 1.68f && at(50, 50) < 1.76f, "열린 바닥: 해 1.6 + 하늘 0.1 (상자에서 튕긴 빛이 조금)");
  expect(at(21, 31) < 0.3f && at(24, 32) < 0.3f && at(27, 31) < 0.3f, "상자의 해 반대쪽 텍셀(x -3.33, -2.38, -1.43)은 그늘이다");
  expect(at(21, 20) > 1.6f && at(21, 43) > 1.6f, "그림자 옆(z ∓3.6)은 볕이 든다");
  // 반그림자: 그림자 끝(x -3.9)은 상자 윗모서리에서 5 m — 해 원반의 지름 0.1 rad × 5 m ÷ sin(높이) 0.8 = 0.625 m 에 걸쳐 밝아진다 (x -4.21 … -3.59)
  expect(at(18, 31) > 1.6f, "반그림자 밖(x -4.29)은 볕이 다 든다");
  expect(at(19, 31) > 0.4f && at(19, 31) < 1.4f, "그림자 끝의 텍셀(x -3.97)은 반그림자다");
  // 상자에 반쯤 깔린 텍셀 (가운데가 x 0.794 — 상자의 +x 면 0.9 안쪽으로 0.106 m, 반 텍셀 안) 은 면 밖으로 밀려 볕 든 값을 받는다
  expect(at(34, 31) > 1.0f && at(34, 32) > 1.0f, "상자에 반쯤 깔린 볕 쪽 텍셀은 밖으로 밀려 볕을 받는다 (그림자가 새지 않는다)");
  // 상자 밑 깊숙한 텍셀은 버려지고 이웃에서 채워진다 — 빈 텍셀이 남지 않는다
  bool filled = true;
  for (const uint8_t value : map.filled) filled = filled && value;
  expect(filled && map.covered[32 * 64 + 32], "상자 밑에 깔린 텍셀도 이웃의 값으로 채워진다 (빈 텍셀 0)");
  // 같은 입력을 두 번 구우면 바이트까지 같다. 씨앗이 다르면 잡음이 달라진다
  const Lightmap again = engine::bake::bake_lightmap(scene, sky, mesh, Mat4::identity(), 64, 64, settings);
  expect(map.rgba8() == again.rgba8() && std::memcmp(map.light.data(), again.light.data(), map.light.size() * sizeof(Vec3)) == 0, "같은 입력을 두 번 구운 결과가 바이트까지 같다");
  const Lightmap other = engine::bake::bake_lightmap(scene, sky, mesh, Mat4::identity(), 64, 64, {.sun_rays = 64, .paths = 64, .seed = 8});
  expect(std::memcmp(map.light.data(), other.light.data(), map.light.size() * sizeof(Vec3)) != 0, "씨앗이 다르면 표본이 다르다");

  // 프로브 — 열린 곳(x 6)은 해가 다 보이고 위에서 하늘빛 0.1 쯤, 그늘 속(x -2.4, 높이 0.5)은 해가 안 보인다. 아래에서는 볕 든 바닥이 되비친다 (albedo 0.5 × 1.7)
  const engine::bake::Probe open = engine::bake::probe(scene, sky, {6.0f, 1.0f, 0.0f}, Scene::NO_OWNER, settings, 0);
  const engine::bake::Probe shade = engine::bake::probe(scene, sky, {-2.4f, 0.5f, 0.0f}, Scene::NO_OWNER, settings, 1);
  expect(open.sun == 1.0f && open.up.x > 0.09f && open.up.x < 0.2f && open.down.x > 0.6f && open.down.x < 0.9f, "열린 곳의 프로브: 해가 다 보이고, 위는 하늘빛, 아래는 볕 든 바닥이 되비친 빛");
  expect(shade.sun == 0.0f && shade.down.x < open.down.x, "그늘 속의 프로브: 해가 보이지 않고 아래의 빛도 줄어든다");
  // 제 물체는 건너뛴다 — 상자 속의 점에서도 상자(owner 5)를 지나쳐 해를 본다
  Scene owned;
  add_mesh(owned, mesh);
  const std::size_t before = owned.triangles().size();
  add_box(owned, {0.0f, 2.0f, 0.0f}, {0.9f, 2.0f, 0.9f});
  std::vector<Triangle> triangles(owned.triangles().begin(), owned.triangles().end());
  Scene tagged;
  for (std::size_t i = 0; i < triangles.size(); i++) {
    if (i >= before) triangles[i].owner = 5;
    tagged.add(triangles[i]);
  }
  tagged.build();
  expect(engine::bake::probe(tagged, sky, {0.0f, 1.0f, 0.0f}, Scene::NO_OWNER, settings, 2).sun == 0.0f && engine::bake::probe(tagged, sky, {0.0f, 1.0f, 0.0f}, 5, settings, 2).sun == 1.0f,
         "프로브는 제 물체의 삼각형을 건너뛴다");
}

void closed_room() {
  // 면이 안쪽을 보는 닫힌 방 속의 바닥 — 해도 하늘도 닿지 않는다
  const auto mesh = floor_mesh(2.0f, 8, 8, 0, 0, -1.9f);
  Scene scene;
  add_mesh(scene, mesh);
  add_box(scene, {0.0f, 0.0f, 0.0f}, {3.0f, 2.0f, 3.0f}, false);
  scene.build();
  const Lightmap map = engine::bake::bake_lightmap(scene, sky_of(1.0f, {0.6f, 0.8f, 0.0f}, 2.0f, 0.05f), mesh, Mat4::identity(), 8, 8, {});
  bool dark = true;
  for (const Vec3& light : map.light) dark = dark && light.x == 0.0f && light.y == 0.0f && light.z == 0.0f;
  expect(dark, "닫힌 방 속의 빛은 0 이다");
}

void bounce() {
  // 해(-x 쪽)를 마주 보는 벽(x 2, -x 를 본다) 곁의 바닥 — 벽이 희면(albedo 0.9) 검을 때(0)보다 밝다. 하늘은 없다
  const auto mesh = floor_mesh(2.0f, 16, 16);
  const auto bake = [&](float albedo) {
    Scene scene;
    add_mesh(scene, mesh, 0.0f);
    add_quad(scene, {2.0f, 0.0f, -4.0f}, {2.0f, 0.0f, 4.0f}, {2.0f, 6.0f, 4.0f}, {2.0f, 6.0f, -4.0f}, albedo);
    scene.build();
    return engine::bake::bake_lightmap(scene, sky_of(0.0f, {-0.6f, 0.8f, 0.0f}, 2.0f, 0.02f), mesh, Mat4::identity(), 16, 16, {.sun_rays = 16, .paths = 256, .seed = 1});
  };
  const Lightmap white = bake(0.9f), black = bake(0.0f);
  // 벽 바로 앞 (x 1.47, z 0 — 텍셀 (13, 8)): 벽이 받는 해 = 2 × 0.6 = 1.2, 되비친 휘도 0.9 × 1.2 = 1.08, 벽이 반구에서 차지하는 몫만큼 바닥에 든다 (0.35 … 0.5 — 높이 6 m 의 벽이 0.53 m 앞의 바닥에서 반구의 0.44 쯤을 차지한다: ½ (1 − d / √(d² + h²)))
  const float gain = white.light[8 * 16 + 13].x - black.light[8 * 16 + 13].x;
  expect(near(black.light[8 * 16 + 13].x, 1.6f, 1e-4f), "검은 벽 곁의 바닥은 해의 직접광뿐이다 (1.6)");
  expect(gain > 0.35f && gain < 0.5f, "흰 벽 곁의 바닥은 벽에서 튕긴 빛만큼 더 밝다");
  expect(white.light[8 * 16 + 2].x - black.light[8 * 16 + 2].x < gain * 0.7f, "벽에서 먼 바닥은 튕긴 빛을 덜 받는다");
}

void charts() {
  // 한 아틀라스(16 × 8)에 조각 둘 — 왼쪽 7 칸은 위를 보는 바닥(볕), 한 칸 띄우고 오른쪽 7 칸은 그 밑에서 아래를 보는 면(빛 없음). 서로 새지 않는다
  auto top = floor_mesh(1.0f, 7, 16, 0, 0, 0.0f, true);
  auto bottom = floor_mesh(1.0f, 7, 16, 8, 0, -0.5f, false);
  for (auto* mesh : {&top, &bottom})
    for (SurfaceVertex& v : *mesh) v.lightmap[1] *= 2.0f;
  std::vector<SurfaceVertex> mesh = top;
  mesh.insert(mesh.end(), bottom.begin(), bottom.end());
  Scene scene;
  add_mesh(scene, mesh);
  scene.build();
  const Lightmap map = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0, 1, 0}, 1.0f), mesh, Mat4::identity(), 16, 8, {});
  bool apart = true, whole = true;
  uint32_t covered = 0;
  for (uint32_t y = 0; y < 7; y++)
    for (uint32_t x = 0; x < 16; x++) {
      const std::size_t i = static_cast<std::size_t>(y) * 16 + x;
      if (x < 7) apart = apart && map.covered[i] && map.light[i].x == 1.0f;
      if (x >= 8 && x < 15) apart = apart && map.covered[i] && map.light[i].x == 0.0f;
    }
  for (std::size_t i = 0; i < map.light.size(); i++) covered += map.covered[i], whole = whole && map.filled[i];
  expect(covered == 98 && apart, "이웃한 조각끼리 값이 새지 않는다 (볕 든 조각은 1, 그 밑면은 0 그대로)");
  expect(whole && map.light[7].x == 0.5f, "조각 사이의 틈은 두 조각의 값으로 채워진다 (빈 텍셀 0)");
}

void sky_table() {
  // 4 × 2 표 — 윗줄(천정 쪽) 네 칸, 아랫줄 네 칸. 돌린 각 0 이면 그림의 가운데(칸 1 과 2 사이)가 북(-z)이고 오른쪽이 동(+x)이다
  std::vector<std::byte> bytes(44 + 8 * 12);
  std::memcpy(bytes.data(), "ZKSY", 4);
  const uint32_t size[2] = {4, 2};
  const float head[8] = {0.0f, 0.0f, 1.0f, 0.0f, 3.0f, 2.0f, 1.0f, 0.02f};
  float cells[24];
  for (int i = 0; i < 8; i++) cells[i * 3] = cells[i * 3 + 1] = cells[i * 3 + 2] = static_cast<float>(i + 1);
  std::memcpy(bytes.data() + 4, size, 8), std::memcpy(bytes.data() + 12, head, 32), std::memcpy(bytes.data() + 44, cells, 96);
  auto sky = Sky::decode(bytes);
  expect(sky && sky->width == 4 && sky->height == 2 && sky->sun_light.y == 2.0f && sky->sun_radius == 0.02f, ".zksky 를 읽는다");
  if (!sky) return;
  const Vec3 up_east = engine::normalize({1.0f, 1.0f, -0.1f}), down_west = engine::normalize({-1.0f, -1.0f, -0.1f}), up_south = engine::normalize({0.1f, 1.0f, 1.0f});
  expect(sky->radiance(up_east).x == 3.0f && sky->radiance(down_west).x == 6.0f && sky->radiance(up_south).x == 4.0f, "방향에서 표의 칸을 찾는다 (북이 가운데, 동이 오른쪽, 남은 양 끝)");
  // 하늘을 90 도 돌리면(해를 동쪽으로 보내는 쪽) 북쪽 하늘에 있던 것이 동쪽에 온다
  sky->yaw = 1.5707963f;
  expect(sky->radiance(engine::normalize({1.0f, 1.0f, 0.3f})).x == 3.0f && sky->radiance(engine::normalize({-0.1f, 1.0f, 1.0f})).x == 4.0f, "돌린 각만큼 하늘이 돈다");
  bytes.pop_back();
  expect(!Sky::decode(bytes), "잘린 .zksky 는 거절한다");
}

void qoi() {
  // 되풀이·작은 차이·큰 차이·앞에 나온 색이 섞인 그림을 적고 엔진의 QOI 풀기로 되읽는다
  std::vector<std::byte> rgba;
  const uint8_t colors[][3] = {{0, 0, 0}, {0, 0, 0}, {10, 20, 30}, {11, 21, 29}, {40, 60, 45}, {200, 10, 90}, {10, 20, 30}, {10, 20, 30}};
  for (int repeat = 0; repeat < 40; repeat++)
    for (const auto& color : colors) {
      for (const uint8_t channel : color) rgba.push_back(static_cast<std::byte>(channel + (repeat == 39 ? 1 : 0)));
      rgba.push_back(std::byte{255});
    }
  const auto file = engine::bake::encode_qoi(16, 20, rgba);
  const auto back = engine::hud::Bitmap::decode(file);
  expect(back && back->width == 16 && back->height == 20 && back->rgba == rgba && file.size() < rgba.size(), "QOI 로 적은 그림을 엔진이 그대로 되읽는다");
}

/** 가운데가 center 인 얇은 색유리판 (닫힌 상자) */
void add_glass(Scene& scene, Vec3 center, Vec3 half, Vec3 tint) {
  Scene pane;
  add_box(pane, center, half);
  for (Triangle triangle : pane.triangles()) {
    triangle.translucent = true;
    triangle.tint = tint;
    scene.add(triangle);
  }
}

void stained_glass() {
  // 10 m 바닥 위 3 m 에 색유리판 — x < 0 쪽만 덮는다 (x -30 … 0, z ±30, 두께 0.1). 유리의 색 (0.2, 0.6, 1.0). 해는 머리 위(빛 2), 하늘은 없다.
  // 텍셀 16 × 16 — 가운데 사이가 10 / 15 = 0.667 m: 텍셀 i 의 가운데가 x = -5 + 0.667 i. 유리 밑(i ≤ 7)은 2 × 색, 그 밖(i ≥ 8)은 2
  const auto mesh = floor_mesh(5.0f, 16, 16);
  const Vec3 tint{0.2f, 0.6f, 1.0f};
  Scene scene;
  add_mesh(scene, mesh);
  add_glass(scene, {-15.0f, 3.0f, 0.0f}, {15.0f, 0.05f, 30.0f}, tint);
  scene.build();
  const Lightmap sun = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0, 1, 0}, 2.0f), mesh, Mat4::identity(), 16, 16, {});
  bool under = true, beside = true;
  for (uint32_t j = 0; j < 16; j++) {
    for (uint32_t i = 0; i < 7; i++) under = under && near(sun.light[j * 16 + i].x, 0.4f, 1e-5f) && near(sun.light[j * 16 + i].y, 1.2f, 1e-5f) && near(sun.light[j * 16 + i].z, 2.0f, 1e-5f);
    for (uint32_t i = 9; i < 16; i++) beside = beside && near(sun.light[j * 16 + i].x, 2.0f, 1e-5f) && near(sun.light[j * 16 + i].z, 2.0f, 1e-5f);
  }
  expect(under, "색유리 밑의 바닥: 해의 빛 × 유리의 색 (2 × (0.2, 0.6, 1.0) — 닫힌 유리판을 지나며 한 번 곱해진다)");
  expect(beside, "색유리 옆의 바닥: 해의 빛 그대로 (2)");
  // 하늘빛도 물든다 — 바닥 전체를 덮는 유리판(x, z ±1000) 아래, 고른 하늘 0.5: 모든 경로가 유리를 지나 하늘에 닿는다 → 0.5 × 색
  Scene covered;
  add_mesh(covered, mesh);
  add_glass(covered, {0.0f, 3.0f, 0.0f}, {1000.0f, 0.05f, 1000.0f}, tint);
  covered.build();
  const Lightmap sky = engine::bake::bake_lightmap(covered, sky_of(0.5f, {0, 1, 0}, 0.0f), mesh, Mat4::identity(), 16, 16, {});
  bool tinted = true, kept = true;
  for (std::size_t i = 0; i < 256; i++) tinted = tinted && near(sky.light[i].x, 0.1f, 1e-5f) && near(sky.light[i].y, 0.3f, 1e-5f) && near(sky.light[i].z, 0.5f, 1e-5f), kept = kept && sky.filled[i];
  expect(tinted && kept, "색유리 아래의 하늘빛: 휘도 × 유리의 색 (0.5 × (0.2, 0.6, 1.0)) — 유리는 막지 않는다");
  // 광선 — 유리는 막는 것으로 치지 않고(blocked), 지나는 몫은 유리의 색이고(transmit), 가장 먼저 닿는 것은 유리 너머의 것이다 (closest — 지난 유리의 색을 돌려준다)
  const engine::Ray up{{-1.0f, 1.0f, 0.0f}, {0.0f, 1.0f, 0.0f}}, down{{-1.0f, 5.0f, 0.0f}, {0.0f, -1.0f, 0.0f}};
  Vec3 through{1.0f, 1.0f, 1.0f};
  const auto beyond = scene.closest(down, 100.0f, Scene::NO_OWNER, 0, &through);
  expect(!scene.blocked(up, 100.0f, Scene::NO_OWNER, 0) && scene.transmit(up, 100.0f, Scene::NO_OWNER, 0).y == 0.6f && scene.transmit({{1.0f, 1.0f, 0.0f}, {0.0f, 1.0f, 0.0f}}, 100.0f, Scene::NO_OWNER, 0).y == 1.0f &&
             scene.transmit(down, 100.0f, Scene::NO_OWNER, 0).x == 0.0f && beyond && near(beyond->distance, 5.0f, 1e-4f) && through.x == 0.2f && through.z == 1.0f,
         "색유리는 광선을 막지 않는다: 지나는 몫은 유리의 색, 그 너머의 바닥에 닿는다 (바닥에 막힌 광선의 몫은 0)");
  // 유리 속의 점은 물체 속이 아니다 (묻힌 텍셀로 버리지 않는다), 프로브의 해는 유리 색의 밝기 (0.2 + 0.6 + 1.0) / 3 = 0.6
  expect(!scene.inside({-1.0f, 3.0f, 0.0f}) && near(engine::bake::probe(scene, sky_of(0.0f, {0, 1, 0}, 2.0f), {-1.0f, 1.0f, 0.0f}, Scene::NO_OWNER, {}, 0).sun, 0.6f, 1e-5f) &&
             engine::bake::probe(scene, sky_of(0.0f, {0, 1, 0}, 2.0f), {1.0f, 1.0f, 0.0f}, Scene::NO_OWNER, {}, 0).sun == 1.0f,
         "유리 속은 물체 속이 아니고, 유리 밑의 프로브에는 해가 유리 색의 밝기만큼 보인다 (0.6)");
}

void point_light() {
  // 10 m 바닥(텍셀 21 × 21 — 텍셀 i 의 가운데가 x = -5 + 0.5 i, 가운데 텍셀 (10, 10) 이 원점) 위 2 m 에 점광원: 1 m 에서의 빛 4, 닿는 거리 10 m, 크기 0. 해도 하늘도 없다.
  // 거리 d 에서 마주 보는 면의 빛 = 4 / d² × (1 − (d / 10)²)², 바닥에는 cos = 2 / d 가 곱해진다 (바닥은 검어서 튕긴 빛이 없다).
  // 표본 자리는 면에서 1 mm 띄운 곳이라 손으로 센 값과 천분의 일쯤 다르다 (바로 밑: d 1.999 → 0.9226)
  const auto mesh = floor_mesh(5.0f, 21, 21);
  const Sky dark = sky_of(0.0f, {0, 1, 0}, 0.0f);
  const auto row = [](const Lightmap& map, uint32_t i) { return map.light[10 * 21 + i].y; };
  Scene scene;
  add_mesh(scene, mesh, 0.0f);
  scene.add(engine::bake::PointLight{{0.0f, 2.0f, 0.0f}, {4.0f, 4.0f, 4.0f}, 10.0f, 0.0f});
  scene.build();
  const Lightmap map = engine::bake::bake_lightmap(scene, dark, mesh, Mat4::identity(), 21, 21, {});
  // 바로 밑 (d 2): 4/4 × (1 − 0.04)² = 0.9216. x 2 (d² 8, cos 0.7071): 0.5 × 0.92² × 0.7071 = 0.29925. x 4 (d² 20, cos 0.4472): 0.2 × 0.8² × 0.4472 = 0.05724
  expect(near(row(map, 10), 0.9216f, 2e-3f), "점광원 바로 밑 2 m: 4 / 2² × (1 − 0.2²)² = 0.9216");
  expect(near(row(map, 14), 0.29925f, 5e-4f) && near(row(map, 18), 0.05724f, 1e-4f) && near(row(map, 6), row(map, 14), 1e-6f), "거리의 제곱으로 잦아들고 비스듬히 받는 만큼(cos) 준다: x 2 에서 0.2993, x 4 에서 0.0572");
  // 닿는 거리 3 m — x 2 (d 2.83)는 닿고 (4/8 × (1 − 8/9)² × 0.7071 = 0.004365), x 2.5 (d 3.20)부터는 0
  Scene near_scene;
  add_mesh(near_scene, mesh, 0.0f);
  near_scene.add(engine::bake::PointLight{{0.0f, 2.0f, 0.0f}, {4.0f, 4.0f, 4.0f}, 3.0f, 0.0f});
  near_scene.build();
  const Lightmap cut = engine::bake::bake_lightmap(near_scene, dark, mesh, Mat4::identity(), 21, 21, {});
  expect(near(row(cut, 14), 0.004365f, 1e-4f) && row(cut, 15) == 0.0f && row(cut, 20) == 0.0f, "닿는 거리(3 m)에서 0 으로 잦아들고 그 밖은 0 이다");
  // 아주 가까이 (바닥 위 0.25 m) — 0.5 m 안쪽은 더 밝아지지 않는다: 4 / 0.5² × (1 − 0.025²)² = 15.98. 텍셀에는 상한 4 로 담긴다 (255)
  Scene close_scene;
  add_mesh(close_scene, mesh, 0.0f);
  close_scene.add(engine::bake::PointLight{{0.0f, 0.25f, 0.0f}, {4.0f, 4.0f, 4.0f}, 10.0f, 0.0f});
  close_scene.build();
  const Lightmap hot = engine::bake::bake_lightmap(close_scene, dark, mesh, Mat4::identity(), 21, 21, {});
  expect(near(row(hot, 10), 15.98f, 0.01f) && hot.rgba8()[(10 * 21 + 10) * 4 + 1] == std::byte{255}, "광원에 0.5 m 보다 가까운 자리는 더 밝아지지 않는다 (16 언저리 — 텍셀에는 상한으로 담긴다)");

  // 그림자 — 광원과 바닥 사이의 검은 상자 (x 0.75 … 1.25, y 0.75 … 1.25, z ±0.25). z 0 의 줄에서 그림자는 x 1.2 … 3.33:
  // 광원 (0, 2) 에서 상자의 왼쪽 아래 모서리 (0.75, 0.75) 를 지난 선이 바닥의 x 2 × 0.75 / 1.25 = 1.2 에, 오른쪽 위 모서리 (1.25, 1.25) 를 지난 선이 2 × 1.25 / 0.75 = 3.33 에 닿는다
  const auto shadowed = [&](float size) {
    Scene boxed;
    add_mesh(boxed, mesh, 0.0f);
    add_box(boxed, {1.0f, 1.0f, 0.0f}, {0.25f, 0.25f, 0.25f}, true, 0.0f);
    boxed.add(engine::bake::PointLight{{0.0f, 2.0f, 0.0f}, {4.0f, 4.0f, 4.0f}, 10.0f, size});
    boxed.build();
    return engine::bake::bake_lightmap(boxed, dark, mesh, Mat4::identity(), 21, 21, {.sun_rays = 16, .paths = 49, .seed = 3, .light_rays = 64});
  };
  const Lightmap hard = shadowed(0.0f);
  // x 0.5 (d² 4.25, cos 0.9701): 4/4.25 × (1 − 0.0425)² × 0.9701 = 0.8371 — 볕. x 1.5 … 3 은 그림자. x 4 는 다시 볕 (0.0572)
  expect(near(row(hard, 11), 0.8371f, 2e-3f) && row(hard, 13) == 0.0f && row(hard, 14) == 0.0f && row(hard, 16) == 0.0f && near(row(hard, 18), 0.05724f, 1e-4f) && near(row(hard, 6), 0.29925f, 5e-4f),
         "점광원의 그림자: 상자 너머 x 1.5 … 3 은 0, 그 앞뒤와 반대쪽은 그대로다");
  // 광원이 크면(반지름 0.3) 그림자의 가장자리가 번진다 — 그림자의 끝 x 3.33 곁의 텍셀(x 3.5 — 점광원이면 다 밝다: d² 16.25, 4/16.25 × 0.8375² × 0.4961 = 0.0857)이 반쯤 가려지고, 한가운데(x 2)는 여전히 0 이다
  const Lightmap soft = shadowed(0.3f);
  expect(row(soft, 14) == 0.0f && row(soft, 17) > 0.03f && row(soft, 17) < 0.07f && near(row(hard, 17), 0.0857f, 1e-4f), "광원의 크기만큼 반그림자가 진다 (그림자 끝 곁의 텍셀이 덜 밝다)");

  // 프로브 — 광원 바로 밑 1 m 의 점: 위에서 4 × (1 − 0.01)² = 3.9204 가 다 위의 빛으로. 광원과 같은 높이로 1 m 옆의 점: 반씩 (1.9602)
  const engine::bake::Probe below = engine::bake::probe(scene, dark, {0.0f, 1.0f, 0.0f}, Scene::NO_OWNER, {}, 0);
  const engine::bake::Probe aside = engine::bake::probe(scene, dark, {1.0f, 2.0f, 0.0f}, Scene::NO_OWNER, {}, 1);
  expect(near(below.up.y, 3.9204f, 1e-4f) && below.down.y == 0.0f && near(aside.up.y, 1.9602f, 1e-4f) && near(aside.down.y, 1.9602f, 1e-4f),
         "프로브가 받는 점광원의 빛: 위에서 오면 위의 빛에, 옆에서 오면 위아래에 반씩");
  // 튕긴 빛 — 광원 위에 흰 천장(y 3, albedo 0.9)을 두면 바닥이 천장에서 되비친 빛만큼 밝아진다 (광원 밑은 0.92 → 1.25, 광원에서 먼 x 4 의 텍셀은 0.057 → 0.14)
  Scene roofed;
  add_mesh(roofed, mesh, 0.0f);
  add_quad(roofed, {-20.0f, 3.0f, -20.0f}, {20.0f, 3.0f, -20.0f}, {20.0f, 3.0f, 20.0f}, {-20.0f, 3.0f, 20.0f}, 0.9f);
  roofed.add(engine::bake::PointLight{{0.0f, 2.0f, 0.0f}, {4.0f, 4.0f, 4.0f}, 10.0f, 0.0f});
  roofed.build();
  const Lightmap lifted = engine::bake::bake_lightmap(roofed, dark, mesh, Mat4::identity(), 21, 21, {.sun_rays = 16, .paths = 256, .seed = 5});
  expect(row(lifted, 18) > row(map, 18) + 0.05f && row(lifted, 18) < row(map, 18) + 0.15f && row(lifted, 10) > row(map, 10) + 0.2f && row(lifted, 10) < row(map, 10) + 0.5f, "점광원의 빛도 튕긴다 — 흰 천장 아래의 바닥이 더 밝다");
}

void contact_and_fill() {
  // 10 m 바닥(텍셀 21 × 21, 0.5 m 간격)의 x 2.5 에 선 검은 벽(-x 를 본다, 높이 8 m). 고른 하늘 0.5, 해 없음. 맞닿은 곳의 어둠을 켜면(contact 1, 닿는 거리 1.5 m)
  // 벽에서 1.5 m 넘게 떨어진 텍셀(벽 쪽으로 간 경로도 1.5 m 를 넘겨 닿는다)은 그대로이고, 벽 밑으로 갈수록 어두워진다 — 벽에 붙은 자리는 반(벽 쪽 반구가 0 m 에서 막힌다).
  // 잰 값: 벽에서 1.5 m 0.996, 1 m 0.962, 0.5 m 0.813
  const auto mesh = floor_mesh(5.0f, 21, 21);
  Scene scene;
  add_mesh(scene, mesh, 0.0f);
  add_quad(scene, {2.5f, 0.0f, -40.0f}, {2.5f, 0.0f, 40.0f}, {2.5f, 8.0f, 40.0f}, {2.5f, 8.0f, -40.0f}, 0.0f);
  scene.build();
  const Sky sky = sky_of(0.5f, {0, 1, 0}, 0.0f);
  const Settings plain{.sun_rays = 16, .paths = 256, .seed = 9}, dark{.sun_rays = 16, .paths = 256, .seed = 9, .light_rays = 8, .contact = 1.0f, .contact_reach = 1.5f};
  const Lightmap open = engine::bake::bake_lightmap(scene, sky, mesh, Mat4::identity(), 21, 21, plain), pressed = engine::bake::bake_lightmap(scene, sky, mesh, Mat4::identity(), 21, 21, dark);
  const auto ratio = [&](uint32_t i) { return pressed.light[10 * 21 + i].y / open.light[10 * 21 + i].y; };
  // 텍셀 i 의 가운데가 x = -5 + 0.5 i: i 4 (x -3, 벽에서 5.5 m), i 11 (x 0.5, 벽에서 2 m) 는 그대로. i 13 (벽에서 1 m), i 14 (0.5 m) 로 갈수록 어둡다
  expect(near(ratio(4), 1.0f, 1e-5f) && near(ratio(11), 1.0f, 1e-5f), "맞닿은 곳의 어둠: 벽에서 닿는 거리(1.5 m) 넘게 떨어진 바닥은 그대로다");
  expect(ratio(12) < 1.0f && ratio(12) > ratio(13) && ratio(13) < 0.98f && ratio(13) > ratio(14) && ratio(14) > 0.7f && ratio(14) < 0.9f, "벽 밑으로 갈수록 어두워진다 (벽에서 0.5 m: 0.7 과 0.9 사이)");
  // 고른 채움빛 — 하늘도 해도 없을 때 열린 바닥은 채움빛 그대로, 벽 밑은 거기에 맞닿은 곳의 어둠이 곱해진다. 프로브에도 더해진다
  const Vec3 fill{0.1f, 0.2f, 0.3f};
  Settings filled = dark;
  filled.ambient = fill;
  const Lightmap lit = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0, 1, 0}, 0.0f), mesh, Mat4::identity(), 21, 21, filled);
  expect(near(lit.light[10 * 21 + 4].x, 0.1f, 1e-6f) && near(lit.light[10 * 21 + 4].y, 0.2f, 1e-6f) && near(lit.light[10 * 21 + 4].z, 0.3f, 1e-6f), "고른 채움빛: 열린 바닥은 채움빛 그대로다");
  expect(near(lit.light[10 * 21 + 14].y / 0.2f, ratio(14), 1e-4f), "벽 밑의 채움빛에도 맞닿은 곳의 어둠이 곱해진다 (하늘빛에 곱해진 몫과 같다)");
  const engine::bake::Probe probe = engine::bake::probe(scene, sky_of(0.0f, {0, 1, 0}, 0.0f), {0.0f, 1.0f, 0.0f}, Scene::NO_OWNER, filled, 0);
  expect(near(probe.up.z, 0.3f, 1e-6f) && near(probe.down.x, 0.1f, 1e-6f), "프로브의 위·아래 빛에도 채움빛이 더해진다");
}

/**
 * 겉면 셰이더가 법선 맵의 법선 n 으로 구운 빛을 고치는 배수 (engine/render/wgsl/include/surface_shade.wgsl 의 relief — 같은 식, 같은 상수):
 * mix(1, min(max(n · 방향, 0) ÷ max(면의 법선 · 방향, ¼), 2), 쏠림)
 */
float relief(Vec3 n, Vec3 face, Vec3 toward, float focus) {
  const float ratio = std::min(std::max(engine::dot(n, toward), 0.0f) / std::max(engine::dot(face, toward), 0.25f), 2.0f);
  return 1.0f + (ratio - 1.0f) * focus;
}

void directional() {
  // 해만 (0.6, 0.8, 0 쪽에서 세기 2) 드는 열린 바닥 — 빛 1.6, 방향은 해 쪽, 쏠림 1
  const auto mesh = floor_mesh(5.0f, 16, 16);
  Scene scene;
  add_mesh(scene, mesh);
  scene.build();
  const Lightmap sun = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0.6f, 0.8f, 0.0f}, 2.0f), mesh, Mat4::identity(), 16, 16, {});
  const std::size_t middle = 8 * 16 + 8;
  expect(near(sun.light[middle].x, 1.6f, 1e-5f) && near(sun.toward[middle].x, 0.6f, 1e-5f) && near(sun.toward[middle].y, 0.8f, 1e-5f) && near(sun.toward[middle].z, 0.0f, 1e-5f) &&
             near(sun.focus[middle], 1.0f, 1e-5f),
         "한쪽에서만 드는 빛: 방향은 해 쪽 (0.6, 0.8, 0), 쏠림 1");
  // 방향 맵의 바이트 — 방향 × ½ + ½ → (0.8, 0.9, 0.5) × 255 = (204, 230, 128), 쏠림 255
  const std::vector<std::byte> coded = sun.direction_rgba8();
  expect(coded[middle * 4] == std::byte{204} && coded[middle * 4 + 1] == std::byte{230} && coded[middle * 4 + 2] == std::byte{128} && coded[middle * 4 + 3] == std::byte{255},
         "방향 맵의 텍셀은 방향 × ½ + ½ 과 쏠림이다");
  // 법선 맵이 면을 해 쪽으로 30 도 기울이면 n · d = 0.5 · 0.6 + 0.866 · 0.8 = 0.9928 → 0.9928 ÷ 0.8 = 1.241 배, 반대쪽으로 기울이면 0.3928 ÷ 0.8 = 0.491 배. 평평하면 그대로
  const Vec3 up{0.0f, 1.0f, 0.0f};
  expect(near(relief(up, up, sun.toward[middle], sun.focus[middle]), 1.0f, 1e-5f) && near(relief({0.5f, 0.8660254f, 0.0f}, up, sun.toward[middle], sun.focus[middle]), 1.2410f, 1e-3f) &&
             near(relief({-0.5f, 0.8660254f, 0.0f}, up, sun.toward[middle], sun.focus[middle]), 0.4910f, 1e-3f),
         "법선을 빛 쪽으로 기울이면 밝아지고(1.241 배) 반대쪽이면 어두워진다(0.491 배)");

  // 고른 하늘만 — 방향은 면의 법선, 쏠림은 ⅔ (반구에 고른 빛을 cos 로 잰 평균 방향의 길이. 층을 나눈 경로 49 개의 오차 안)
  const Lightmap sky = engine::bake::bake_lightmap(scene, sky_of(0.5f, {0, 1, 0}, 0.0f), mesh, Mat4::identity(), 16, 16, {});
  expect(near(sky.toward[middle].y, 1.0f, 2e-3f) && near(sky.focus[middle], 2.0f / 3.0f, 0.02f), "고른 하늘빛: 방향은 법선, 쏠림 ⅔");
  // 쏠림이 ⅔ 이면 같은 기울기에도 덜 바뀐다: 30 도 기운 법선(n · d = 0.866) → 1 + (0.866 − 1) · ⅔ = 0.911
  expect(near(relief({0.5f, 0.8660254f, 0.0f}, up, {0.0f, 1.0f, 0.0f}, 2.0f / 3.0f), 0.9107f, 1e-3f), "사방에서 드는 빛은 요철을 덜 드러낸다");
  // 고른 채움빛만 — 방향은 법선, 쏠림은 정확히 ⅔
  Settings filled;
  filled.ambient = {0.2f, 0.2f, 0.2f};
  const Lightmap fill = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0, 1, 0}, 0.0f), mesh, Mat4::identity(), 16, 16, filled);
  expect(near(fill.toward[middle].y, 1.0f, 1e-6f) && near(fill.focus[middle], 2.0f / 3.0f, 1e-5f), "고른 채움빛: 방향은 법선, 쏠림 ⅔");
  // 해와 채움빛이 같이 — Σ = 해 쪽 × 1.6 + 법선 × ⅔ × 0.2 = (0.96, 1.4133, 0), 길이 1.7085, 빛 1.8 → 쏠림 0.9492, 방향 (0.5619, 0.8272, 0)
  const Lightmap both = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0.6f, 0.8f, 0.0f}, 2.0f), mesh, Mat4::identity(), 16, 16, filled);
  expect(near(both.light[middle].x, 1.8f, 1e-5f) && near(both.toward[middle].x, 0.5619f, 1e-3f) && near(both.toward[middle].y, 0.8272f, 1e-3f) && near(both.focus[middle], 0.9492f, 1e-3f),
         "해와 채움빛이 같이 들면 방향은 밝기로 무게를 준 평균이다");

  // 점광원 — 바닥 위 2 m. 바로 밑의 텍셀은 위쪽, 옆으로 2 m 떨어진 텍셀은 45 도 위의 광원 쪽
  const auto wide = floor_mesh(5.0f, 21, 21);
  Scene lit;
  add_mesh(lit, wide);
  lit.add(engine::bake::PointLight{{0.0f, 2.0f, 0.0f}, {1.0f, 1.0f, 1.0f}, 20.0f, 0.0f});
  lit.build();
  const Lightmap lamp = engine::bake::bake_lightmap(lit, sky_of(0.0f, {0, 1, 0}, 0.0f), wide, Mat4::identity(), 21, 21, {});
  const std::size_t under = 10 * 21 + 10, aside = 10 * 21 + 14;
  expect(near(lamp.toward[under].y, 1.0f, 1e-4f) && near(lamp.focus[under], 1.0f, 1e-4f), "점광원 바로 밑: 방향은 위");
  expect(near(lamp.toward[aside].x, -0.70711f, 1e-3f) && near(lamp.toward[aside].y, 0.70711f, 1e-3f) && near(lamp.focus[aside], 1.0f, 1e-4f), "점광원에서 옆으로 2 m: 방향은 45 도 위의 광원 쪽");
  // 값이 없는 텍셀 둘레의 채움도 방향을 갖는다 (길이 1)
  bool whole = true;
  for (std::size_t i = 0; i < lamp.toward.size(); i++)
    if (lamp.filled[i]) whole = whole && near(engine::dot(lamp.toward[i], lamp.toward[i]), 1.0f, 1e-3f);
  expect(whole, "값이 있는 텍셀의 방향은 길이 1 이다");
}

void patterned_glass() {
  // 바닥 위 1 m 에 수평 유리판 (x, z -5 … 5, 아래를 보는 면 — 바닥에서 해로 가는 광선이 앞면으로 든다). 해는 바로 위 (세기 2), 유리의 색은 ½.
  // 무늬는 2 × 1 텍셀: 왼쪽은 주황 (1, 0.25, 0), 오른쪽은 납선 (0). 무늬 좌표 u = (x + 5) ÷ 5 — 판 위에서 두 번 되풀이된다:
  //   x -5 … -2.5 주황, -2.5 … 0 납선, 0 … 2.5 주황, 2.5 … 5 납선
  const auto mesh = floor_mesh(5.0f, 21, 21);
  Scene scene;
  add_mesh(scene, mesh);
  const uint32_t pane = scene.add(engine::bake::PaneTexture{2, 1, {{1.0f, 0.25f, 0.0f}, {0.0f, 0.0f, 0.0f}}});
  const Vec3 corners[4] = {{-5.0f, 1.0f, -5.0f}, {5.0f, 1.0f, -5.0f}, {5.0f, 1.0f, 5.0f}, {-5.0f, 1.0f, 5.0f}};
  const auto glass = [&](int a, int b, int c) {
    Triangle t{corners[a], corners[b], corners[c]};
    t.translucent = true;
    t.tint = {0.5f, 0.5f, 0.5f};
    t.pane = pane;
    const int index[3] = {a, b, c};
    for (int k = 0; k < 3; k++) t.uv[k][0] = (corners[index[k]].x + 5.0f) / 5.0f, t.uv[k][1] = (corners[index[k]].z + 5.0f) / 10.0f;
    scene.add(t);
  };
  // 밑에서 볼 때 반시계 (법선이 아래)
  glass(0, 1, 2);
  glass(0, 2, 3);
  scene.build();
  const Lightmap map = engine::bake::bake_lightmap(scene, sky_of(0.0f, {0, 1, 0}, 2.0f), mesh, Mat4::identity(), 21, 21, {});
  // 텍셀 i 의 가운데가 x = -5 + 0.5 i: i 2 (x -4) 주황, i 7 (x -1.5) 납선, i 12 (x 1) 주황, i 17 (x 3.5) 납선
  const auto at = [&](uint32_t i) { return map.light[10 * 21 + i]; };
  expect(near(at(2).x, 1.0f, 1e-5f) && near(at(2).y, 0.25f, 1e-5f) && at(2).z == 0.0f, "유리 조각 밑의 바닥은 해 × 유리의 색 × 그 자리의 무늬 색 (2 × ½ × (1, ¼, 0))");
  expect(at(7).x == 0.0f && at(7).y == 0.0f, "납선 밑의 바닥에는 볕이 들지 않는다");
  expect(near(at(12).x, 1.0f, 1e-5f) && near(at(12).y, 0.25f, 1e-5f) && at(17).x == 0.0f, "무늬는 되풀이된다");
  // 무늬를 걸지 않은 색유리는 예전처럼 제 색만 곱한다
  Scene plain;
  add_mesh(plain, mesh);
  for (const auto& [a, b, c] : {std::array<int, 3>{0, 1, 2}, std::array<int, 3>{0, 2, 3}}) {
    Triangle t{corners[a], corners[b], corners[c]};
    t.translucent = true;
    t.tint = {0.5f, 0.25f, 1.0f};
    plain.add(t);
  }
  plain.build();
  const Lightmap flat = engine::bake::bake_lightmap(plain, sky_of(0.0f, {0, 1, 0}, 2.0f), mesh, Mat4::identity(), 21, 21, {});
  expect(near(flat.light[10 * 21 + 7].x, 1.0f, 1e-5f) && near(flat.light[10 * 21 + 7].y, 0.5f, 1e-5f) && near(flat.light[10 * 21 + 7].z, 2.0f, 1e-5f), "무늬 없는 색유리는 제 색만 곱한다");
}

}  // namespace

int main() {
  open_floor();
  directional();
  patterned_glass();
  stained_glass();
  point_light();
  contact_and_fill();
  box_shadow();
  closed_room();
  bounce();
  charts();
  sky_table();
  qoi();
  if (failures == 0) std::printf("bake_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
