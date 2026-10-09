// 라이트 베이커 — 방의 틀 하나의 빛을 빌드 때 굽는다 (Node 에서 돈다. CMake 가 틀마다 부른다 — 입력이 바뀐 것만 다시 굽는다).
// 조립 지점이다: 엔진의 베이커(engine/bake — 장면을 모른다)에 게임의 방 틀(.meshbin)과 소품(에셋 팩)과 하늘(tools/skyc.mjs)을 이어 준다.
// 게임에 묻히는 에셋(assets.cpp)을 링크하지 않고 파일로 읽는다 — 소리나 글꼴이 바뀌었다고 다시 굽지 않게.
// 무엇을 어느 문맥에서 굽는지는 content/room_light.hpp 머리말에 있다: 틀마다 한 장, 틀의 좌표에서 (문틀 속은 막힌 벽감이라 문이 났든 안 났든 빛이 같다).
// 소품은 그리는 쪽(presentation/scene_view)과 같은 행렬로 놓는다 (placement_matrix).
//
// 사용: node lightbake.cjs <base.zkpack> <sky.zksky> <out.zklight> <틀.meshbin> <틀 번호>
//   <base.zkpack> — 타일·소품의 텍스처와 소품 모델이 든 팩 (tools/packc.mjs — 구운 빛을 싣기 전의 것). 텍스처에서는 평균 색(튕긴 빛의 albedo)만 쓴다
// 틀의 색유리는 빛을 막지 않고 제 색을 곱한다 — 단색 유리(층이 LAYER_GLASS 인 면)는 그 색을, 텍스처를 입힌 유리(색의 a 가 GLASS_PANE)는 지나는 자리의 텍스처 색을
// (유리 조각의 색 배치가 바닥의 빛 조각에 그대로 떨어진다. 납선 — 그 텍스처의 금속성 그림이 흰 곳 — 은 빛을 막는다). 틀에 적은 빛(light 줄)은 점광원으로 굽는다.
// 결과에는 라이트맵과 함께 방향 맵(빛이 주로 오는 쪽 — engine/bake/lightbake.hpp)이 실린다: 겉면 셰이더가 법선 맵의 요철을 구운 빛에 잇는다.
// 소품은 그림자를 드리우지만 제 라이트맵은 없다 — 소품마다 프로브 하나를 굽는다 (그 소품의 삼각형은 건너뛰고 잰다). 잎(잘라 낼 모양이 있는 텍스처)은 광선의 반만 막는다.
// 굽지 않는 것(적, 투사체, 손에 든 것, 문 자리의 막음돌과 석판)을 위해 바닥 위의 프로브 격자도 굽는다 — 방 밖의 점(벽 속, 바닥이 없는 자리)은 가장 가까운 방 안의 점의 값으로 채운다.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "engine/asset/pack.hpp"
#include "engine/bake/lightbake.hpp"
#include "engine/hud/jpeg.hpp"
#include "engine/spatial/surface_mesh.hpp"
#include "gameplay/content/room_light.hpp"
#include "gameplay/content/room_meshes.hpp"

namespace {

using engine::Mat4;
using engine::Vec3;
namespace bake = engine::bake;

// 굽기의 품질 — 텍셀마다 해 그림자 광선 16 (부표본 2×2 에 넷씩), 반구 경로 49 (7×7 칸), 점광원마다 그림자 광선 8. 프로브는 한 점뿐이라 넉넉히.
// 맞닿은 곳의 어둠 (engine/bake/lightbake.hpp 의 Settings::contact) — 벽·바닥·기둥 밑이 만나는 1.8 m 안이 눈에 띄게 어둡다 (화면으로 보며 맞춘 값)
// 고른 채움빛 — 닫힌 방에서 여러 번 오간 빛의 어림 (경로는 두 번까지만 튕긴다). 시원한 돌빛: 볕 든 바닥(1.6)의 일곱째쯤이라 볕 든 바닥과 깊은 그늘의 대비는 남는다
constexpr Vec3 FILL{0.205f, 0.215f, 0.23f};
constexpr bake::Settings TEXELS{.sun_rays = 16, .paths = 49, .seed = 0, .light_rays = 8, .contact = 1.6f, .contact_reach = 1.8f, .ambient = FILL};
constexpr bake::Settings PROBES{.sun_rays = 64, .paths = 256, .seed = 0, .light_rays = 16, .contact = 0.0f, .contact_reach = 1.5f, .ambient = FILL};
// 프로브 격자의 점이 방 안이라고 보는 조건 — 발밑 이 거리 안에 바닥이 있고 물체 속이 아니다
constexpr float GRID_FLOOR_REACH = game::GRID_HEIGHT + 0.6f;

std::optional<std::vector<std::byte>> read_file(const char* path) {
  std::FILE* file = std::fopen(path, "rb");
  if (!file) return std::nullopt;
  std::fseek(file, 0, SEEK_END);
  std::vector<std::byte> bytes(static_cast<std::size_t>(std::ftell(file)));
  std::fseek(file, 0, SEEK_SET);
  const bool whole = std::fread(bytes.data(), 1, bytes.size(), file) == bytes.size();
  std::fclose(file);
  if (!whole) return std::nullopt;
  return bytes;
}

/** 그림의 평균 색 (선형 빛) — mask 가 있으면 그 밝기로 무게를 준다 (잎 밖의 바탕색을 빼려고) */
std::optional<Vec3> mean_color(std::span<const std::byte> jpeg, std::span<const std::byte> mask) {
  const auto image = engine::hud::decode_jpeg(jpeg);
  const auto shape = mask.empty() ? std::nullopt : engine::hud::decode_jpeg(mask);
  if (!image || (!mask.empty() && (!shape || shape->rgba.size() != image->rgba.size()))) return std::nullopt;
  double sum[3] = {}, weight = 0.0;
  for (std::size_t at = 0; at < image->rgba.size(); at += 4) {
    const double share = shape ? static_cast<double>(shape->rgba[at]) / 255.0 : 1.0;
    for (int c = 0; c < 3; c++) sum[c] += share * std::pow(static_cast<double>(image->rgba[at + static_cast<std::size_t>(c)]) / 255.0, 2.2);
    weight += share;
  }
  if (weight <= 0.0) return Vec3{0.5f, 0.5f, 0.5f};
  return Vec3{static_cast<float>(sum[0] / weight), static_cast<float>(sum[1] / weight), static_cast<float>(sum[2] / weight)};
}

Vec3 at(const Mat4& m, const float p[3]) {
  return {m.m[0] * p[0] + m.m[4] * p[1] + m.m[8] * p[2] + m.m[12], m.m[1] * p[0] + m.m[5] * p[1] + m.m[9] * p[2] + m.m[13], m.m[2] * p[0] + m.m[6] * p[1] + m.m[10] * p[2] + m.m[14]};
}

// 색유리의 무늬를 광선이 읽는 크기 (한 변) — 바닥에 떨어지는 무늬는 라이트맵의 텍셀(10 cm)보다 잘게 갈리지 않는다
constexpr uint32_t PANE_SIDE = 256;

/**
 * 색유리 타일의 투과색 — 색 그림(선형 빛으로)에 유리인 정도(1 − 금속성 그림 — 납선이 흰 그림)를 곱해 PANE_SIDE 로 줄인다.
 * 색은 가장 밝은 채널이 1 이 되게 올린다 — 유리 사진의 어두움(그늘, 때)이 아니라 색만 빛에 곱한다
 */
std::optional<bake::PaneTexture> pane_texture(std::span<const std::byte> jpeg, std::span<const std::byte> lead) {
  const auto image = engine::hud::decode_jpeg(jpeg);
  const auto metal = lead.empty() ? std::nullopt : engine::hud::decode_jpeg(lead);
  if (!image || image->width < PANE_SIDE || image->height < PANE_SIDE || image->width % PANE_SIDE || image->height % PANE_SIDE) return std::nullopt;
  if (!lead.empty() && (!metal || metal->width != image->width || metal->height != image->height)) return std::nullopt;
  bake::PaneTexture pane{PANE_SIDE, PANE_SIDE, std::vector<Vec3>(PANE_SIDE * PANE_SIDE)};
  const uint32_t step_x = image->width / PANE_SIDE, step_y = image->height / PANE_SIDE;
  for (uint32_t y = 0; y < PANE_SIDE; y++)
    for (uint32_t x = 0; x < PANE_SIDE; x++) {
      double sum[3] = {}, open = 0.0;
      for (uint32_t dy = 0; dy < step_y; dy++)
        for (uint32_t dx = 0; dx < step_x; dx++) {
          const std::size_t at = (static_cast<std::size_t>(y * step_y + dy) * image->width + x * step_x + dx) * 4;
          const double glass = metal ? 1.0 - static_cast<double>(metal->rgba[at]) / 255.0 : 1.0;
          for (int c = 0; c < 3; c++) sum[c] += glass * std::pow(static_cast<double>(image->rgba[at + static_cast<std::size_t>(c)]) / 255.0, 2.2);
          open += glass;
        }
      const double cells = static_cast<double>(step_x) * step_y, peak = std::max({sum[0], sum[1], sum[2]});
      // 유리인 몫만큼 지나고, 그 색은 가장 밝은 채널을 1 로
      const double share = open / cells, lift = peak > 1e-9 ? share / peak : 0.0;
      pane.tint[static_cast<std::size_t>(y) * PANE_SIDE + x] = {static_cast<float>(sum[0] * lift), static_cast<float>(sum[1] * lift), static_cast<float>(sum[2] * lift)};
    }
  return pane;
}

/** 팩에서 읽은 것 */
struct Library {
  std::vector<Vec3> tiles;
  /** 타일마다 — 색 그림과 금속성 그림(없으면 비어 있다)의 바이트 (색유리로 쓰인 타일만 푼다) */
  std::vector<std::span<const std::byte>> tile_images;
  std::vector<std::span<const std::byte>> tile_leads;
  std::vector<Vec3> prop_colors;
  /** 소품 텍스처에 잘라 낼 모양이 있다 (잎) */
  std::vector<bool> prop_masked;
  std::vector<engine::ModelMesh> props;
};

/** 장면에 넣은 소품 하나 — 프로브를 잴 자리와 제 번호 */
struct Placed {
  Vec3 center;
  uint32_t owner;
};

struct Builder {
  const Library& library;
  bake::Scene scene;
  uint32_t owners = 0;
  /** 타일 층 → 장면에 넣은 색유리 무늬의 번호 (아직 안 넣었으면 NO_PANE) */
  std::vector<uint32_t> panes{};
  bool failed = false;

  uint32_t pane_of(std::size_t layer) {
    if (panes.size() < library.tiles.size()) panes.resize(library.tiles.size(), bake::Triangle::NO_PANE);
    if (panes[layer] == bake::Triangle::NO_PANE) {
      auto texture = pane_texture(library.tile_images[layer], library.tile_leads[layer]);
      if (!texture) {
        failed = true;
        return bake::Triangle::NO_PANE;
      }
      panes[layer] = scene.add(std::move(*texture));
    }
    return panes[layer];
  }

  /** 겉면 메시와 거기 놓인 소품들을 장면에 넣는다. 소품들의 자리를 placements 차례로 돌려준다 */
  std::vector<Placed> add(const engine::SurfaceMesh& mesh, const Mat4& matrix) {
    const uint32_t owner = owners++;
    const std::span<const engine::SurfaceVertex> v = mesh.vertices();
    for (std::size_t i = 0; i + 2 < v.size(); i += 3) {
      // 색은 화면 값으로 적혀 있다 (wgsl/surface.wgsl 의 srgb_to_linear 와 같게), 텍스처가 있으면 그 평균 색을 곱한다
      Vec3 albedo{std::pow(v[i].color[0], 2.2f), std::pow(v[i].color[1], 2.2f), std::pow(v[i].color[2], 2.2f)};
      const bool pane = v[i].layer >= 0.0f && v[i].color[3] > 1.5f;
      if (pane) {
        // 텍스처를 입힌 색유리 — 막지 않고, 지나는 자리의 텍스처 색(× 재질의 색)을 곱한다
        bake::Triangle triangle{at(matrix, v[i].position), at(matrix, v[i + 1].position), at(matrix, v[i + 2].position), {}, owner};
        triangle.translucent = true;
        triangle.tint = albedo;
        triangle.pane = pane_of(static_cast<std::size_t>(v[i].layer));
        for (int k = 0; k < 3; k++) triangle.uv[k][0] = v[i + static_cast<std::size_t>(k)].uv[0], triangle.uv[k][1] = v[i + static_cast<std::size_t>(k)].uv[1];
        scene.add(triangle);
        continue;
      }
      if (v[i].layer >= 0.0f) {
        const Vec3 tile = library.tiles[static_cast<std::size_t>(v[i].layer)];
        albedo = {albedo.x * tile.x, albedo.y * tile.y, albedo.z * tile.z};
      }
      bake::Triangle triangle{at(matrix, v[i].position), at(matrix, v[i + 1].position), at(matrix, v[i + 2].position), albedo, owner};
      // 색유리 — 막지 않고, 지나는 빛에 제 색(선형 빛으로 옮긴 것)을 곱한다.
      // 스스로 빛나는 면(룬, 빛나는 조각)도 막지 않는다 — 그 속에 둔 점광원의 빛이 나온다 (빛에 색을 곱하지는 않는다)
      if (v[i].layer == engine::LAYER_GLASS) {
        triangle.translucent = true;
        triangle.tint = albedo;
      } else if (v[i].color[3] > 0.5f) {
        triangle.translucent = true;
      }
      scene.add(triangle);
    }
    // 틀에 적은 빛 — 점광원
    for (const engine::MeshLight& light : mesh.lights())
      scene.add(bake::PointLight{at(matrix, light.position), {light.light[0], light.light[1], light.light[2]}, light.reach, light.size});
    std::vector<Placed> placed;
    for (const engine::Placement& p : mesh.placements()) {
      const engine::ModelMesh& model = library.props[p.model];
      const Mat4 world = matrix * game::placement_matrix(p);
      const uint32_t prop_owner = owners++;
      for (std::size_t i = 0; i + 2 < model.vertices.size(); i += 3) {
        const std::size_t layer = static_cast<std::size_t>(model.vertices[i].layer);
        scene.add({at(world, model.vertices[i].position), at(world, model.vertices[i + 1].position), at(world, model.vertices[i + 2].position), library.prop_colors[layer], prop_owner,
                   model.two_sided, library.prop_masked[layer]});
      }
      const float middle[3] = {(model.bounds.min.x + model.bounds.max.x) * 0.5f, (model.bounds.min.y + model.bounds.max.y) * 0.5f, (model.bounds.min.z + model.bounds.max.z) * 0.5f};
      placed.push_back({at(world, middle), prop_owner});
    }
    return placed;
  }
};

game::LightProbe to_light(const bake::Probe& probe) { return {{probe.up.x, probe.up.y, probe.up.z}, {probe.down.x, probe.down.y, probe.down.z}, probe.sun}; }

int fail(const char* message) {
  std::fprintf(stderr, "lightbake: %s\n", message);
  return 1;
}

}  // namespace

int main(int argc, char** argv) {
  if (argc != 6) return fail("usage: lightbake <base.zkpack> <sky.zksky> <out.zklight> <room.meshbin> <shape>");
  const auto pack_bytes = read_file(argv[1]);
  const auto sky_bytes = read_file(argv[2]);
  const auto room_bytes = read_file(argv[4]);
  if (!pack_bytes || !sky_bytes || !room_bytes) return fail("팩·하늘·메시 파일을 읽지 못했다");
  const auto pack = engine::asset::Pack::parse(*pack_bytes);
  const auto sky = bake::Sky::decode(*sky_bytes);
  const auto room = engine::SurfaceMesh::decode(*room_bytes);
  if (!pack || !sky || !room) return fail("팩·하늘·방 메시의 형식이 어긋났다");
  const unsigned shape = static_cast<unsigned>(std::atoi(argv[5]));
  if (shape >= game::SHAPE_COUNT) return fail("틀 번호가 범위 밖이다");

  Library library;
  const std::span<const engine::asset::PackEntry> entries = pack->entries();
  for (std::size_t i = 0; i < entries.size(); i++) {
    const engine::asset::PackEntry& entry = entries[i];
    if (entry.name.starts_with("tile/")) {
      const auto color = mean_color(entry.bytes, {});
      if (!color) return fail("타일 텍스처를 풀지 못했다");
      library.tiles.push_back(*color);
      library.tile_images.push_back(entry.bytes);
      // 금속성 그림은 바로 뒤에 같은 이름으로 온다 (tools/packc.mjs)
      const bool lead = i + 1 < entries.size() && entries[i + 1].name.starts_with("tile-metal/");
      library.tile_leads.push_back(lead ? entries[i + 1].bytes : std::span<const std::byte>{});
    } else if (entry.name.starts_with("prop-texture/")) {
      // 잘라 낼 모양은 바로 뒤에 같은 이름으로 온다 (tools/packc.mjs)
      const bool masked = i + 1 < entries.size() && entries[i + 1].name.starts_with("prop-mask/");
      // 금속성 그림(prop-metal/)이 뒤따르는 텍스처는 그대로 평균한다 (금속의 색이 곧 되비치는 색이다)
      const auto color = mean_color(entry.bytes, masked ? entries[i + 1].bytes : std::span<const std::byte>{});
      if (!color) return fail("소품 텍스처를 풀지 못했다");
      library.prop_colors.push_back(*color);
      library.prop_masked.push_back(masked);
    } else if (entry.name.starts_with("prop/")) {
      auto model = engine::ModelMesh::decode(entry.bytes);
      if (!model) return fail("소품 모델을 풀지 못했다");
      library.props.push_back(std::move(*model));
    }
  }
  // 메시가 가리키는 층·소품 번호가 팩 안에 있어야 한다
  for (const engine::ModelMesh& model : library.props)
    for (const engine::SurfaceVertex& v : model.vertices)
      if (v.layer < 0.0f || v.layer >= static_cast<float>(library.prop_colors.size())) return fail("소품의 텍스처 층이 팩 밖이다");
  const engine::SurfaceMesh* pieces[] = {&*room};
  for (const engine::SurfaceMesh* mesh : pieces) {
    for (const engine::SurfaceVertex& v : mesh->vertices())
      if (v.layer >= static_cast<float>(library.tiles.size())) return fail("방 메시의 텍스처 층이 팩 밖이다");
    for (const engine::Placement& p : mesh->placements())
      if (p.model >= library.props.size()) return fail("방 메시의 소품 번호가 팩 밖이다");
  }

  // 장면 — 틀 하나가 통째다 (문틀 속은 막힌 벽감이다 — 문이 났든 안 났든 같은 빛이다)
  Builder builder{library, {}, 0};
  const std::vector<Placed> placed = builder.add(*room, Mat4::identity());
  if (builder.failed) return fail("색유리 타일의 그림을 풀지 못했다 (한 변이 256 의 배수여야 한다)");
  builder.scene.build();

  // 틀마다 난수가 겹치지 않게
  bake::Settings texels = TEXELS, probes = PROBES;
  texels.seed = probes.seed = shape * 64u;
  const bake::Lightmap map = bake::bake_lightmap(builder.scene, *sky, room->vertices(), Mat4::identity(), room->lightmap_width(), room->lightmap_height(), texels);
  std::vector<game::LightProbe> placement_lights, grid;
  for (std::size_t i = 0; i < placed.size(); i++) placement_lights.push_back(to_light(bake::probe(builder.scene, *sky, placed[i].center, placed[i].owner, probes, static_cast<uint32_t>(i))));
  // 프로브 격자 — 방 안의 점만 잰다 (발밑에 바닥이 있고 물체 속이 아니다). 방 밖의 점은 가장 가까운 방 안의 점의 값으로 채운다
  const auto along = [](uint32_t i) { return -game::GRID_REACH + 2.0f * game::GRID_REACH * static_cast<float>(i) / static_cast<float>(game::GRID_SIDE - 1); };
  std::vector<uint8_t> inside(game::GRID_SIDE * game::GRID_SIDE);
  grid.resize(inside.size());
  for (uint32_t z = 0; z < game::GRID_SIDE; z++)
    for (uint32_t x = 0; x < game::GRID_SIDE; x++) {
      const Vec3 point{along(x), game::GRID_HEIGHT, along(z)};
      const uint32_t cell = z * game::GRID_SIDE + x;
      const auto floor = builder.scene.closest({point, {0.0f, -1.0f, 0.0f}}, GRID_FLOOR_REACH, bake::Scene::NO_OWNER, cell);
      if (!floor || floor->back || builder.scene.inside(point)) continue;
      inside[cell] = 1;
      grid[cell] = to_light(bake::probe(builder.scene, *sky, point, bake::Scene::NO_OWNER, probes, 100000u + cell));
    }
  for (uint32_t z = 0; z < game::GRID_SIDE; z++)
    for (uint32_t x = 0; x < game::GRID_SIDE; x++) {
      if (inside[z * game::GRID_SIDE + x]) continue;
      // 가장 가까운 방 안의 점 (같은 거리면 먼저 나온 것 — 줄, 칸 차례)
      int best = -1, best_distance = 0;
      for (uint32_t nz = 0; nz < game::GRID_SIDE; nz++)
        for (uint32_t nx = 0; nx < game::GRID_SIDE; nx++) {
          if (!inside[nz * game::GRID_SIDE + nx]) continue;
          const int dx = static_cast<int>(nx) - static_cast<int>(x), dz = static_cast<int>(nz) - static_cast<int>(z), distance = dx * dx + dz * dz;
          if (best < 0 || distance < best_distance) best = static_cast<int>(nz * game::GRID_SIDE + nx), best_distance = distance;
        }
      if (best < 0) return fail("프로브 격자에 방 안의 점이 하나도 없다");
      grid[z * game::GRID_SIDE + x] = grid[static_cast<std::size_t>(best)];
    }

  const std::vector<std::byte> pixels = map.rgba8();
  const std::vector<std::byte> qoi = bake::encode_qoi(map.width, map.height, pixels);
  const std::vector<std::byte> direction = bake::encode_qoi(map.width, map.height, map.direction_rgba8());
  const std::vector<std::byte> out = game::RoomLight::encode(map.width, map.height, placement_lights, grid, qoi, direction);
  std::FILE* file = std::fopen(argv[3], "wb");
  if (!file || std::fwrite(out.data(), 1, out.size(), file) != out.size()) return fail("결과를 적지 못했다");
  std::fclose(file);
  return 0;
}
