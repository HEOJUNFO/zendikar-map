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

// 한 프레임에 그리는 색 메시 인스턴스의 상한 — 적 6 + 투사체. 넘는 것(투사체)은 그리지 않는다
constexpr std::size_t MAX_INSTANCES = 64;
// 한 프레임에 그리는 겉면 인스턴스의 상한 — 방 하나 (틀 + 문 자리 넷의 막음돌·석판) 와 거기 놓인 소품들. 넘는 것은 그리지 않는다
constexpr uint32_t MAX_SURFACES = 512;
// Full author clip cycles, sampled at eight equally spaced poses (60 Hz simulation).
constexpr std::array<uint32_t, Scenery::CREATURE_COUNT> CREATURE_CYCLE_TICKS{60, 50, 50, 100};

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
constexpr engine::gpu::VertexAttribute NEXT_POSE_ATTRIBUTES[] = {
    {8, 3, offsetof(engine::ColoredVertex, position)},
    {9, 3, offsetof(engine::ColoredVertex, normal)},
};
constexpr engine::gpu::VertexBufferLayout LAYOUTS[] = {
    {sizeof(engine::ColoredVertex), engine::gpu::VertexStep::vertex, VERTEX_ATTRIBUTES},
    {sizeof(SceneView::Instance), engine::gpu::VertexStep::instance, INSTANCE_ATTRIBUTES},
    {sizeof(engine::ColoredVertex), engine::gpu::VertexStep::vertex, NEXT_POSE_ATTRIBUTES},
};

/** 놓인 것 — at 에, yaw 쪽을 보게, 그 자리의 빛을 받아 */
SceneView::Instance piece(engine::Vec3 at, float yaw, const LightProbe& light) {
  return {{at.x, at.y, at.z, yaw}, {1.0f, 0.0f, 0.0f, 0.0f}, {}, {light.up[0], light.up[1], light.up[2], light.sun}, {light.down[0], light.down[1], light.down[2], 0.0f}};
}

void effect_triangle(std::vector<engine::ColoredVertex>& vertices, engine::Vec3 a, engine::Vec3 b, engine::Vec3 c) {
  const auto normal = engine::normalize(engine::cross(b - a, c - a));
  for (const auto point : {a, b, c}) vertices.push_back({{point.x, point.y, point.z}, {normal.x, normal.y, normal.z}, {1.0f, 1.0f, 1.0f, 1.0f}});
}

/** Combat effect geometry; character geometry always comes from the original authored asset poses. */
std::vector<engine::ColoredVertex> floor_effect(bool ring, bool cone) {
  std::vector<engine::ColoredVertex> vertices;
  constexpr uint32_t SEGMENTS = 48;
  const float arc = cone ? std::acos(0.85f) : std::numbers::pi_v<float>;
  for (uint32_t segment = 0; segment < SEGMENTS; segment++) {
    const float a = -arc + 2.0f * arc * static_cast<float>(segment) / SEGMENTS;
    const float b = -arc + 2.0f * arc * static_cast<float>(segment + 1) / SEGMENTS;
    const engine::Vec3 edge_a{std::sin(a), 0.0f, -std::cos(a)}, edge_b{std::sin(b), 0.0f, -std::cos(b)};
    if (!ring) {
      effect_triangle(vertices, {}, edge_b, edge_a);
      if (cone && segment % 6 == 0) {
        const auto peak = (edge_a + edge_b) * 0.34f + engine::Vec3{0.0f, 0.18f, 0.0f};
        effect_triangle(vertices, edge_a * 0.12f, edge_b * 0.95f, peak);
      }
    }
    else {
      const auto outer_a = edge_a * 1.05f, outer_b = edge_b * 1.05f, inner_a = edge_a * 0.95f, inner_b = edge_b * 0.95f;
      effect_triangle(vertices, inner_a, outer_b, outer_a);
      effect_triangle(vertices, inner_a, inner_b, outer_b);
      const engine::Vec3 rise{0.0f, 0.775f, 0.0f};
      effect_triangle(vertices, outer_a, outer_a + rise, outer_b + rise);
      effect_triangle(vertices, outer_a, outer_b + rise, outer_b);
    }
  }
  return vertices;
}

std::vector<engine::ColoredVertex> web_effect() {
  std::vector<engine::ColoredVertex> vertices;
  constexpr uint32_t SPOKES = 8;
  for (uint32_t spoke = 0; spoke < SPOKES; spoke++) {
    const float a = 2.0f * std::numbers::pi_v<float> * static_cast<float>(spoke) / SPOKES;
    const float b = 2.0f * std::numbers::pi_v<float> * static_cast<float>(spoke + 1) / SPOKES;
    const engine::Vec3 end{0.32f * std::cos(a), 0.32f * std::sin(a), 0.0f};
    const engine::Vec3 next{0.32f * std::cos(b), 0.32f * std::sin(b), 0.0f};
    const engine::Vec3 width{-0.012f * std::sin(a), 0.012f * std::cos(a), 0.0f};
    effect_triangle(vertices, width, end, width * -1.0f);
    effect_triangle(vertices, end, next, next * 0.92f);
    effect_triangle(vertices, end, next * 0.92f, end * 0.92f);
  }
  return vertices;
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
  if (enemy.kind == EnemyKind::caster) lift = 0.12f * std::sin(static_cast<float>(tick % 240) * (4.0f * std::numbers::pi_v<float> / 240.0f) + static_cast<float>(index));
  float yaw = enemy.yaw;
  if (enemy.kind == EnemyKind::spider && engine::dot(enemy.wall_normal, enemy.wall_normal) > 0.0f) {
    tilt = std::numbers::pi_v<float> * 0.5f;
    yaw = std::atan2(-enemy.wall_normal.x, enemy.wall_normal.z);
  }
  const bool corpse = enemy.kind == EnemyKind::boss && enemy.health <= 0;
  if (corpse) scale = 1.0f, tilt = 0.0f, lift = 0.0f, glow = 0.15f;
  if (enemy.hurt_tick && tick - *enemy.hurt_tick < HURT_FLASH_TICKS) {
    tint = HURT_FLASH;
    glow = 0.85f;
  }
  SceneView::Instance instance = piece({enemy.position.x, enemy.position.y + lift, enemy.position.z}, yaw, light);
  instance.pose = {scale, tilt, 0.0f, 0.0f};
  instance.tint = {tint.red, tint.green, tint.blue, glow};
  return instance;
}

}  // namespace

bool SceneView::create(engine::gpu::Device& device, engine::ShaderLibrary& shaders, const RoomMeshes& rooms) {
  const auto bolt = engine::StaticMesh::decode(assets::enemy_bolt());
  if (!bolt) {
    engine::log_error("[scene] 적 메시 에셋을 읽지 못했다");
    return false;
  }
  pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::scene)), LAYOUTS, true, true});
  effect_pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::scene)), LAYOUTS, true, false});
  if (!pipeline_ || !effect_pipeline_) return false;
  frame_uniforms_ = device.create_buffer({engine::gpu::BufferUsage::uniform, sizeof(FrameUniforms)});
  instance_buffer_ = device.create_buffer({engine::gpu::BufferUsage::vertex, MAX_INSTANCES * sizeof(Instance)});

  const auto vertices = bolt->vertices();
  effects_[MANA] = {device.create_buffer({engine::gpu::BufferUsage::vertex, vertices.size_bytes(), vertices.data()}), static_cast<uint32_t>(vertices.size())};
  effects_[GOO] = effects_[MANA];
  const auto upload_effect = [&](Effect effect, const std::vector<engine::ColoredVertex>& points) {
    effects_[effect] = {device.create_buffer({engine::gpu::BufferUsage::vertex, points.size() * sizeof(engine::ColoredVertex), points.data()}), static_cast<uint32_t>(points.size())};
    return static_cast<bool>(effects_[effect].vertices);
  };
  const auto upload_piece = [&](uint32_t piece, const engine::SurfaceMesh& mesh) {
    pieces_[piece] = {engine::SurfaceBatch::upload(device, mesh.vertices()), static_cast<uint32_t>(mesh.vertices().size())};
    return static_cast<bool>(pieces_[piece].vertices);
  };
  bool ok = instance_buffer_ && surfaces_.create(device, shaders, MAX_SURFACES) && creatures_.create(device, shaders, ROOM_ENEMIES);
  for (uint32_t shape = 0; shape < SHAPE_COUNT; shape++) ok = upload_piece(shape, rooms.rooms[shape]) && ok;
  ok = upload_piece(SEALED, rooms.sealed) && upload_piece(GATE, rooms.gate) && effects_[MANA].vertices &&
       upload_effect(WEB, web_effect()) && upload_effect(GOO_POOL, floor_effect(false, false)) &&
       upload_effect(FIRE_BREATH, floor_effect(false, true)) && upload_effect(SHOCKWAVE, floor_effect(true, false)) && ok;
  rooms_ = &rooms;
  return ok;
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
  for (auto& group : bat_groups_) group.clear();
  const auto effect = [&](Effect kind, engine::Vec3 at, engine::Vec3 direction, float radius, engine::Color color) {
    Instance instance = piece(at, std::atan2(direction.x, -direction.z), light_at(at));
    if (kind == FIRE_BREATH) instance.pose[1] = std::asin(std::clamp(direction.y, -1.0f, 1.0f));
    instance.pose[0] = kind == SHOCKWAVE ? 1.0f : radius;
    if (kind == SHOCKWAVE) instance.pose[2] = 1.0f, instance.pose[3] = radius;
    instance.tint = {color.red, color.green, color.blue, 1.0f};
    placed_[BOLT + kind].push_back(instance);
  };
  const std::span<const Enemy> enemies = world.enemies();
  for (uint32_t i = 0; i < enemies.size(); i++) {
    const Enemy& enemy = enemies[i];
    const engine::Vec3 lit_center{enemy.position.x, enemy.position.y + traits(enemy.kind).height * 0.5f, enemy.position.z};
    Instance pose = enemy_instance(enemy, i, world.tick(), light_at(lit_center));
    if (enemy.kind == EnemyKind::boss && enemy.act == Enemy::Act::windup && enemy.health > 0) {
      const bool breath = enemy.attack_cycle % 2 == 0;
      effect(breath ? FIRE_BREATH : SHOCKWAVE, enemy.position + engine::Vec3{0.0f, breath ? 1.5f : 0.04f, 0.0f}, enemy.aim,
             breath ? 12.0f : 3.0f, breath ? engine::Color{0.55f, 0.23f, 0.05f} : engine::Color{0.38f, 0.48f, 0.7f});
    }
    if (enemy.kind != EnemyKind::bat) {
      if (scenery.state() != Scenery::State::ready) continue;
      const auto creature = enemy.kind == EnemyKind::boss ? Scenery::BOSS : static_cast<Scenery::Creature>(enemy.kind);
      const auto& t = traits(enemy.kind);
      float phase = static_cast<float>(world.tick() % CREATURE_CYCLE_TICKS[creature]) * Scenery::CREATURE_FRAME_COUNT / CREATURE_CYCLE_TICKS[creature] + static_cast<float>(i);
      uint32_t frame = static_cast<uint32_t>(phase) % Scenery::CREATURE_FRAME_COUNT;
      if (enemy.health <= 0) frame = Scenery::CREATURE_DEATH_FRAME, phase = 0.0f;
      else if (enemy.act == Enemy::Act::windup || enemy.act == Enemy::Act::charge) {
        const uint32_t duration = enemy.act == Enemy::Act::windup ? t.windup : CHARGE_TICKS;
        phase = std::min(static_cast<float>(Scenery::CREATURE_FRAME_COUNT - 1), static_cast<float>(enemy.act_ticks) * Scenery::CREATURE_FRAME_COUNT / duration);
        frame = Scenery::CREATURE_ATTACK_OFFSET + static_cast<uint32_t>(phase);
      } else if (enemy.act == Enemy::Act::recover && enemy.act_ticks < t.recover / 2) {
        phase = static_cast<float>(Scenery::CREATURE_FRAME_COUNT / 2) + std::min(static_cast<float>(Scenery::CREATURE_FRAME_COUNT / 2 - 1), static_cast<float>(enemy.act_ticks) * Scenery::CREATURE_FRAME_COUNT / t.recover);
        frame = Scenery::CREATURE_ATTACK_OFFSET + static_cast<uint32_t>(phase);
      }
      pose.pose[3] = phase - std::floor(phase);
      placed_[creature * Scenery::CREATURE_POSE_COUNT + frame].push_back(pose);
      continue;
    }
    const float scale = pose.pose[0], tilt = pose.pose[1], yaw = pose.placement[3];
    const float c = std::cos(yaw), s = std::sin(yaw), ct = std::cos(tilt), st = std::sin(tilt);
    const auto at = engine::Mat4::from_basis({c * scale, 0.0f, s * scale}, {-s * st * scale, ct * scale, c * st * scale},
                                            {-s * ct * scale, -st * scale, c * ct * scale}, enemy.position);
    engine::SurfaceInstance instance = lit(at, light_at(lit_center));
    // Brightening the material's incident light retains its authored skin, wing and mouth textures.
    for (uint32_t channel = 0; channel < 3; channel++) {
      const float flash = pose.tint[channel] * pose.tint[3] * 3.0f;
      instance.light_up[channel] += flash;
      instance.light_down[channel] += flash;
    }
    const uint32_t frame = static_cast<uint32_t>((world.tick() % 20) * 24 / 60 + i) % Scenery::BAT_FRAME_COUNT;
    bat_groups_[frame].push_back(instance);
  }
  bat_upload_.clear();
  bat_draws_.clear();
  if (scenery.state() == Scenery::State::ready) {
    const auto frames = scenery.bat_frames();
    for (uint32_t frame = 0; frame < frames.size(); frame++) {
      const auto& group = bat_groups_[frame];
      if (group.empty()) continue;
      const auto& model = frames[frame];
      bat_draws_.push_back({.vertices = model.vertices, .vertex_count = model.vertex_count,
                            .albedo = scenery.creature_textures(), .nar = scenery.creature_nars(),
                            .lightmap = {}, .direction = {},
                            .two_sided = model.two_sided, .cutout = model.cutout,
                            .first_instance = static_cast<uint32_t>(bat_upload_.size()), .instance_count = static_cast<uint32_t>(group.size())});
      bat_upload_.insert(bat_upload_.end(), group.begin(), group.end());
    }
    creatures_.draw(device, {camera.view_proj, SKY_COLOR, FOG_DISTANCE, glow, 1.0f, room_sun(room), sky::SUN_LIGHT, camera.eye}, bat_upload_, bat_draws_);
  }
  for (const Projectile& bolt : world.projectiles()) {
    // 날아가며 돌고 맥이 뛴다
    Instance instance = piece(bolt.position, static_cast<float>(bolt.age) * 0.35f, light_at(bolt.position));
    instance.pose[0] = 1.0f + 0.12f * std::sin(static_cast<float>(bolt.age) * 0.6f);
    Effect kind = MANA;
    if (bolt.kind == Projectile::Kind::goo) {
      kind = GOO;
      instance.pose[0] *= 1.4f;
      instance.tint = {0.32f, 0.95f, 0.18f, 1.0f};
    } else if (bolt.kind == Projectile::Kind::web) {
      kind = WEB;
      instance.placement[3] = std::atan2(bolt.velocity.x, -bolt.velocity.z);
      instance.pose[1] = std::atan2(bolt.velocity.y, std::hypot(bolt.velocity.x, bolt.velocity.z));
      instance.tint = {0.83f, 0.96f, 1.0f, 1.0f};
    }
    placed_[BOLT + kind].push_back(instance);
  }
  for (const GroundHazard& hazard : world.hazards()) {
    const auto at = hazard.position + engine::Vec3{0.0f, hazard.kind == GroundHazard::Kind::fire_breath ? 0.0f : 0.025f, 0.0f};
    if (hazard.kind == GroundHazard::Kind::goo) effect(GOO_POOL, at, {}, hazard.radius, {0.22f, 0.75f, 0.16f});
    else if (hazard.kind == GroundHazard::Kind::fire_breath) effect(FIRE_BREATH, at, hazard.direction, hazard.radius, {1.0f, 0.46f, 0.05f});
    else effect(SHOCKWAVE, at, {}, hazard.radius, {0.65f, 0.82f, 1.0f});
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
  const engine::gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}};
  for (uint32_t part = 0; part < PART_COUNT; part++) {
    if (!count[part]) continue;
    const auto creature = static_cast<Scenery::Creature>(part / Scenery::CREATURE_POSE_COUNT);
    const auto& model = part >= BOLT ? Scenery::Prop{effects_[part - BOLT].vertices, effects_[part - BOLT].vertex_count, true, false} : scenery.creature_frames(creature)[part % Scenery::CREATURE_POSE_COUNT];
    const uint32_t frame = part % Scenery::CREATURE_POSE_COUNT;
    const uint32_t next_frame = frame < Scenery::CREATURE_ATTACK_OFFSET ? (frame + 1) % Scenery::CREATURE_FRAME_COUNT : std::min(frame + 1, frame == Scenery::CREATURE_DEATH_FRAME ? Scenery::CREATURE_DEATH_FRAME : Scenery::CREATURE_DEATH_FRAME - 1);
    const auto next = part >= BOLT ? model.vertices : scenery.creature_frames(creature)[next_frame].vertices;
    const engine::gpu::BufferHandle buffers[] = {model.vertices, instance_buffer_, next};
    device.draw({.pipeline = part >= BOLT ? effect_pipeline_ : pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = model.vertex_count, .instance_count = count[part], .first_instance = first[part]});
  }
}

}  // namespace game
