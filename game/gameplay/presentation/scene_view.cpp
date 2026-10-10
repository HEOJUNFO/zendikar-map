#include "gameplay/presentation/scene_view.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numbers>
#include <optional>
#include <span>

#include "engine/foundation/color.hpp"
#include "engine/foundation/log.hpp"
#include "engine/spatial/static_mesh.hpp"
#include "gameplay/content/assets.hpp"
#include "gameplay/presentation/light.hpp"
#include "gameplay/presentation/portal_view.hpp"
#include "gameplay_shaders.generated.hpp"

namespace game {
namespace {

// scene.wgsl 의 Frame 과 같은 배치 (mat4 64 + vec4 16 × 4)
struct FrameUniforms {
  std::array<float, 16> view_proj;
  std::array<float, 4> params;
  std::array<float, 4> fog;
  std::array<float, 4> sun_direction;
  std::array<float, 4> sun_light;
};
static_assert(sizeof(FrameUniforms) == 128);
// 겉면의 묶음 — 틀, 막음돌, 석판, 그 뒤로 소품마다 하나
constexpr uint32_t BODY_GROUP = 0, SEALED_GROUP = 1, GATE_GROUP = 2, PROP_GROUP = 3;
// 막음돌과 석판의 빛을 재는 자리 — 북쪽 문 자리 바로 안쪽 (content/meshes/gate.mesh.txt·sealed.mesh.txt 의 가운데에서 방 쪽으로 — 프로브 격자의 가장자리)
constexpr engine::Vec3 GATE_CENTER{0.0f, 2.9f, -15.0f};
// 하늘빛에 잠기는 거리 — 방 하나(대각선 45 m)는 끝까지 또렷하다
constexpr float FOG_DISTANCE = 260.0f;
// scene.wgsl 의 @binding
constexpr uint32_t FRAME_BINDING = 0;
constexpr uint32_t AIM_BINDING = 1;

// 한 프레임에 그리는 색 메시 인스턴스의 상한 — 적 6 + 투사체. 넘는 것(투사체)은 그리지 않는다
constexpr std::size_t MAX_INSTANCES = 64;
// 한 프레임에 그리는 겉면 인스턴스의 상한 — 방 하나 (틀 + 문 자리 넷의 막음돌·석판) 와 거기 놓인 소품들. 넘는 것은 그리지 않는다
constexpr uint32_t MAX_SURFACES = 512;
// 조준이 닿는 거리 — 벽이 없으면 여기까지 (시뮬레이션의 총알처럼 방보다 길다)
constexpr float AIM_REACH = 1000.0f;
// 겨눌 수 없는 것의 겨눔 번호
constexpr float NOT_AIMABLE = -1.0f;

// 예고의 색 — 돌진형은 밝은 금빛, 원거리형은 투사체 빛에 가까운 밝은 주황. 맞았을 때는 흰빛이 잠깐 든다
constexpr engine::Color CHARGE_WARNING{1.0f, 0.86f, 0.32f};
constexpr engine::Color CAST_WARNING{1.0f, 0.74f, 0.3f};
constexpr engine::Color HURT_FLASH{1.0f, 1.0f, 0.96f};
/** 맞은 적이 희게 번쩍이는 시간 (틱) */
constexpr uint64_t HURT_FLASH_TICKS = 6;
// 열리는 석판이 마당 밑으로 내려가는 깊이 — 석판의 높이(5.8 m)보다 조금 더
constexpr float GATE_SINK = 6.0f;

constexpr engine::gpu::VertexAttribute VERTEX_ATTRIBUTES[] = {
    {0, 3, offsetof(engine::ColoredVertex, position)},
    {1, 3, offsetof(engine::ColoredVertex, normal)},
    {2, 4, offsetof(engine::ColoredVertex, color)},
};
constexpr engine::gpu::VertexAttribute INSTANCE_ATTRIBUTES[] = {
    {3, 4, offsetof(SceneView::Instance, placement)},
    {4, 4, offsetof(SceneView::Instance, pose)},
    {5, 4, offsetof(SceneView::Instance, tint)},
    {6, 4, offsetof(SceneView::Instance, light_up)},
    {7, 4, offsetof(SceneView::Instance, light_down)},
};
constexpr engine::gpu::VertexBufferLayout LAYOUTS[] = {
    {sizeof(engine::ColoredVertex), engine::gpu::VertexStep::vertex, VERTEX_ATTRIBUTES},
    {sizeof(SceneView::Instance), engine::gpu::VertexStep::instance, INSTANCE_ATTRIBUTES},
};

/** 놓인 것 — at 에, yaw 쪽을 보게, 그 자리의 빛을 받아 */
SceneView::Instance piece(engine::Vec3 at, float yaw, const LightProbe& light) {
  return {{at.x, at.y, at.z, yaw}, {1.0f, 0.0f, NOT_AIMABLE, 0.0f}, {}, {light.up[0], light.up[1], light.up[2], light.sun}, {light.down[0], light.down[1], light.down[2], 0.0f}};
}

/** 적 하나 — 예고·모으기는 색과 크기와 기울기로, 맞은 것은 흰 번쩍임으로 보인다 */
SceneView::Instance enemy_instance(const Enemy& enemy, uint32_t index, uint64_t tick, const LightProbe& light) {
  const EnemyTraits& t = traits(enemy.kind);
  const bool charger = enemy.kind == EnemyKind::charger;
  float scale = 1.0f, tilt = 0.0f, lift = 0.0f, glow = 0.0f;
  engine::Color tint = charger ? CHARGE_WARNING : CAST_WARNING;
  if (enemy.act == Enemy::Act::windup) {
    const float progress = static_cast<float>(enemy.act_ticks) / static_cast<float>(t.windup);
    // 끝으로 갈수록 빠르게 깜박인다
    const float blink = 0.5f + 0.5f * std::sin(progress * progress * 2.0f * std::numbers::pi_v<float> * 6.0f);
    glow = 0.15f + 0.45f * progress * (0.5f + 0.5f * blink);
    // 돌진형은 몸을 일으켜 뒤로 젖히고, 원거리형은 부풀어 오른다
    scale = 1.0f + (charger ? 0.18f : 0.3f) * progress;
    if (charger) tilt = 0.32f * progress;
  } else if (enemy.act == Enemy::Act::charge) {
    // 앞으로 숙이고 달려든다
    tilt = -0.3f;
    scale = 1.18f;
    glow = 0.45f;
  }
  // 원거리형은 떠서 천천히 오르내린다 (4 초에 두 번)
  if (!charger) lift = 0.12f * std::sin(static_cast<float>(tick % 240) * (4.0f * std::numbers::pi_v<float> / 240.0f) + static_cast<float>(index));
  if (enemy.hurt_tick && tick - *enemy.hurt_tick < HURT_FLASH_TICKS) {
    tint = HURT_FLASH;
    glow = 0.85f;
  }
  SceneView::Instance instance = piece({enemy.position.x, enemy.position.y + lift, enemy.position.z}, enemy.yaw, light);
  instance.pose = {scale, tilt, static_cast<float>(index), 0.0f};
  instance.tint = {tint.red, tint.green, tint.blue, glow};
  return instance;
}

}  // namespace

bool SceneView::create(engine::gpu::Device& device, engine::ShaderLibrary& shaders, const RoomMeshes& rooms) {
  const auto charger = engine::StaticMesh::decode(assets::enemy_charger());
  const auto caster = engine::StaticMesh::decode(assets::enemy_caster());
  const auto bolt = engine::StaticMesh::decode(assets::enemy_bolt());
  if (!charger || !caster || !bolt) {
    engine::log_error("[scene] 적 메시 에셋을 읽지 못했다");
    return false;
  }
  pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::scene)), LAYOUTS, true, true});
  if (!pipeline_ || !lbvh_.create(device, shaders, ROOM_ENEMIES)) return false;
  frame_uniforms_ = device.create_buffer({engine::gpu::BufferUsage::uniform, sizeof(FrameUniforms)});
  instance_buffer_ = device.create_buffer({engine::gpu::BufferUsage::vertex, MAX_INSTANCES * sizeof(Instance)});

  const auto upload = [&](uint32_t part, const engine::StaticMesh& mesh) {
    const std::span<const engine::ColoredVertex> vertices = mesh.vertices();
    meshes_[part] = {device.create_buffer({engine::gpu::BufferUsage::vertex, vertices.size_bytes(), vertices.data()}), static_cast<uint32_t>(vertices.size())};
    return static_cast<bool>(meshes_[part].vertices);
  };
  const auto upload_piece = [&](uint32_t piece, const engine::SurfaceMesh& mesh) {
    pieces_[piece] = {engine::SurfaceBatch::upload(device, mesh.vertices()), static_cast<uint32_t>(mesh.vertices().size())};
    return static_cast<bool>(pieces_[piece].vertices);
  };
  bool ok = instance_buffer_ && surfaces_.create(device, shaders, MAX_SURFACES);
  for (uint32_t shape = 0; shape < SHAPE_COUNT; shape++) ok = upload_piece(shape, rooms.rooms[shape]) && ok;
  ok = upload_piece(SEALED, rooms.sealed) && upload_piece(GATE, rooms.gate) && upload(CHARGER, *charger) && upload(CASTER, *caster) && upload(BOLT, *bolt) && ok;
  rooms_ = &rooms;
  boxes_.resize(ROOM_ENEMIES);
  return ok;
}

void SceneView::prepare(engine::gpu::Device& device, const World& world, bool aiming) {
  // 화면 주사율이 틱보다 빠르면 같은 틱을 여러 번 그린다 — 상자가 그대로면 GPU 트리도 그대로 둔다
  const std::span<const Enemy> enemies = world.enemies();
  bool moved = false;
  for (uint32_t i = 0; i < ROOM_ENEMIES; i++) {
    // 트리의 상자 수는 고정이다 — 빈 자리는 층 아래 먼 곳의 작은 상자로 채운다 (조준이 닿지 않는다)
    const float aside = static_cast<float>(i);
    const engine::Aabb solid = i < enemies.size() ? enemy_box(enemies[i]) : engine::Aabb{{aside, -5000.0f, 0.0f}, {aside + 0.5f, -4999.5f, 0.5f}};
    const engine::GpuBox box{{solid.min.x, solid.min.y, solid.min.z, 0.0f}, {solid.max.x, solid.max.y, solid.max.z, 0.0f}};
    if (boxes_[i] != box) {
      boxes_[i] = box;
      moved = true;
    }
  }
  if (moved) lbvh_.build(device, boxes_);

  const Player& player = world.player();
  const engine::Ray ray{player.position, engine::forward_from(player.yaw, player.pitch)};
  // 벽·기둥 뒤의 적은 겨눠지지 않는다 — 시뮬레이션의 발사 판정과 같게
  const std::optional<engine::Lbvh::Hit> wall = aiming ? world.stage().raycast(ray, AIM_REACH) : std::nullopt;
  const float distance = !aiming ? -1.0f : wall ? wall->distance : AIM_REACH;
  const auto same = [](engine::Vec3 a, engine::Vec3 b) { return a.x == b.x && a.y == b.y && a.z == b.z; };
  if (moved || !traced_ || distance != aim_distance_ || !same(ray.origin, aim_ray_.origin) || !same(ray.direction, aim_ray_.direction)) {
    aim_ray_ = ray;
    aim_distance_ = distance;
    traced_ = true;
    lbvh_.trace(device, aim_ray_, aim_distance_);
  }
}

void SceneView::draw_room(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery, float glow) {
  if (scenery.state() != Scenery::State::ready) return;
  const std::span<const Scenery::Prop> props = scenery.props();
  const Scenery::RoomLights& lights = scenery.room_lights();
  surface_groups_.resize(PROP_GROUP + props.size());
  for (std::vector<engine::SurfaceInstance>& group : surface_groups_) group.clear();
  // 지금 방 — 돌려 놓은 틀과 거기 고정해 놓인 소품들. 방 가운데가 원점이다. 틀은 구운 라이트맵을, 소품은 소품마다 구운 프로브를 받는다 (구운 것이 없으면 가리는 것 없는 빛으로)
  const Room& room = world.floor().rooms[world.room()];
  const engine::SurfaceMesh& mesh = rooms_->rooms[room.shape];
  const RoomLight* light = lights.body;
  const engine::Mat4 at = piece_matrix(static_cast<Direction>(room.turn % 4), {});
  surface_groups_[BODY_GROUP].push_back(light ? baked(at) : lit(at, OPEN_LIGHT));
  const std::span<const engine::Placement> placements = mesh.placements();
  const bool probed = light && light->placements.size() == placements.size();
  for (std::size_t i = 0; i < placements.size(); i++) {
    const engine::Placement& p = placements[i];
    // 팩의 소품 수보다 큰 번호(빌드와 팩이 어긋났다)는 그리지 않는다
    if (p.model < props.size()) surface_groups_[PROP_GROUP + p.model].push_back(lit(at * placement_matrix(p), probed ? light->placements[i] : OPEN_LIGHT));
  }
  // 문 자리 — 문이 나지 않은 곳은 막음돌이 메우고, 문이 난 곳은 잠긴 동안 룬 석판이 포털을 막는다 (다 잡으면 바닥 밑으로 내려가고 그 뒤에서 포털이 번져 나온다 — portal_view).
  // 둘 다 굽지 않는다 — 문 자리 안쪽의 빛을 프로브 격자에서 받는다 (격자는 틀의 좌표다)
  const float open = portal_open(world);
  // 내려갈수록 빨라진다
  const engine::Vec3 gate{0.0f, -GATE_SINK * open * open, 0.0f};
  for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
    if (!room.site(d)) continue;
    const LightProbe here = light ? light->at(room.to_shape(turned(GATE_CENTER, d)), OPEN_LIGHT) : OPEN_LIGHT;
    if (!room.door(d)) surface_groups_[SEALED_GROUP].push_back(lit(piece_matrix(d, {}), here));
    else if (open < 1.0f) surface_groups_[GATE_GROUP].push_back(lit(piece_matrix(d, gate), here));
  }

  surface_upload_.clear();
  surface_draws_.clear();
  for (uint32_t group = 0; group < surface_groups_.size(); group++) {
    const std::vector<engine::SurfaceInstance>& placed = surface_groups_[group];
    if (placed.empty()) continue;
    const Scenery::Prop* prop = group >= PROP_GROUP ? &props[group - PROP_GROUP] : nullptr;
    const uint32_t piece = group == BODY_GROUP ? room.shape : group == GATE_GROUP ? GATE : SEALED;
    const engine::gpu::TextureHandle lightmap = group == BODY_GROUP ? lights.body_map : engine::gpu::TextureHandle{};
    surface_draws_.push_back({.vertices = prop ? prop->vertices : pieces_[piece].vertices,
                              .vertex_count = prop ? prop->vertex_count : pieces_[piece].vertex_count,
                              .albedo = prop ? scenery.prop_textures() : scenery.tiles(),
                              .nar = prop ? scenery.prop_nars() : scenery.tile_nars(),
                              .lightmap = lightmap,
                              .direction = group == BODY_GROUP ? lights.body_direction : engine::gpu::TextureHandle{},
                              .two_sided = prop && prop->two_sided,
                              .cutout = prop && prop->cutout,
                              .first_instance = static_cast<uint32_t>(surface_upload_.size()),
                              .instance_count = static_cast<uint32_t>(placed.size())});
    surface_upload_.insert(surface_upload_.end(), placed.begin(), placed.end());
  }
  surfaces_.draw(device, {camera.view_proj, SKY_COLOR, FOG_DISTANCE, glow, 1.0f, room_sun(room), sky::SUN_LIGHT, camera.eye}, surface_upload_, surface_draws_);
}

void SceneView::draw(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery) {
  // 박의 머리에서 1, 곧 잦아든다 — 살아 있는 룬과 적의 불빛이 박자에 맞춰 밝아진다
  const float glow = 0.9f + 0.35f * std::exp(-6.0f * beat_phase(world.tick()));
  draw_room(device, world, camera, scenery, glow);

  // 적과 투사체는 제자리의 빛을 받는다 (바닥 위의 프로브 격자에서 — 격자는 틀의 좌표다) — 그늘에 든 것은 그늘의 빛으로
  const Room& room = world.floor().rooms[world.room()];
  const RoomLight* light = scenery.room_lights().body;
  const auto light_at = [&](engine::Vec3 at) { return light ? light->at(room.to_shape(at), OPEN_LIGHT) : OPEN_LIGHT; };
  for (std::vector<Instance>& group : placed_) group.clear();
  const std::span<const Enemy> enemies = world.enemies();
  for (uint32_t i = 0; i < enemies.size(); i++)
    placed_[enemies[i].kind == EnemyKind::charger ? CHARGER : CASTER].push_back(enemy_instance(enemies[i], i, world.tick(), light_at(enemies[i].position)));
  for (const Projectile& bolt : world.projectiles()) {
    // 날아가며 돌고 맥이 뛴다
    Instance instance = piece(bolt.position, static_cast<float>(bolt.age) * 0.35f, light_at(bolt.position));
    instance.pose[0] = 1.0f + 0.12f * std::sin(static_cast<float>(bolt.age) * 0.6f);
    placed_[BOLT].push_back(instance);
  }

  upload_.clear();
  uint32_t first[PART_COUNT], count[PART_COUNT];
  for (uint32_t part = 0; part < PART_COUNT; part++) {
    first[part] = static_cast<uint32_t>(upload_.size());
    count[part] = static_cast<uint32_t>(std::min(placed_[part].size(), MAX_INSTANCES - upload_.size()));
    upload_.insert(upload_.end(), placed_[part].begin(), placed_[part].begin() + count[part]);
  }
  if (upload_.empty()) return;
  device.write_buffer(instance_buffer_, std::as_bytes(std::span{upload_}));

  const FrameUniforms uniforms{camera.view_proj.m,
                               {glow, 0.0f, 0.0f, 0.0f},
                               {SKY_COLOR.red, SKY_COLOR.green, SKY_COLOR.blue, FOG_DISTANCE},
                               {room_sun(room).x, room_sun(room).y, room_sun(room).z, 0.0f},
                               {sky::SUN_LIGHT.x, sky::SUN_LIGHT.y, sky::SUN_LIGHT.z, 0.0f}};
  device.write_buffer(frame_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const engine::gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}, {AIM_BINDING, lbvh_.hit_buffer()}};
  for (uint32_t part = 0; part < PART_COUNT; part++) {
    if (!count[part]) continue;
    const engine::gpu::BufferHandle buffers[] = {meshes_[part].vertices, instance_buffer_};
    device.draw({.pipeline = pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = meshes_[part].vertex_count, .instance_count = count[part], .first_instance = first[part]});
  }
}

}  // namespace game
