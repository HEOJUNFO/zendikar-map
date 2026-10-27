#include "gameplay/simulation/creature_pose.hpp"
#include "gameplay/presentation/scene_view.hpp"

#include <algorithm>
#include <bit>
#include <cmath>
#include <cstddef>
#include <numbers>
#include <optional>
#include <span>

#include "engine/foundation/color.hpp"
#include "engine/asset/pack.hpp"
#include "engine/foundation/log.hpp"
#include "engine/hud/bitmap.hpp"
#include "engine/spatial/static_mesh.hpp"
#include "gameplay/content/assets.hpp"
#include "gameplay/content/merchant-props/layout.hpp"
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
constexpr engine::Vec3 GATE_CENTER{0.0f, 2.9f, -23.0f};
// 하늘빛에 잠기는 거리 — 방 하나(대각선 45 m)는 끝까지 또렷하다
constexpr float FOG_DISTANCE = 260.0f;
// scene.wgsl 의 @binding
constexpr uint32_t FRAME_BINDING = 0;
// Neutral, achromatic review illumination still runs the production PBR shader.
constexpr LightProbe REVIEW_LIGHT{{.65f,.65f,.65f},{.35f,.35f,.35f},1.0f};
const engine::Vec3 REVIEW_SUN=engine::normalize(engine::Vec3{-.4f,.8f,-.5f});
constexpr engine::Vec3 REVIEW_KEY{.8f,.8f,.8f};

// 한 프레임의 투사체·전투 효과 인스턴스 상한. 캐릭터는 별도의 저작 겉면 포즈 묶음으로 그린다
constexpr std::size_t MAX_INSTANCES = 640;
// 한 프레임에 그리는 겉면 인스턴스의 상한 — 방 하나 (틀 + 문 자리 넷의 막음돌·석판) 와 거기 놓인 소품들. 넘는 것은 그리지 않는다
constexpr uint32_t MAX_SURFACES = 512;

// 예고의 색 — 돌진형은 밝은 금빛, 원거리형은 투사체 빛에 가까운 밝은 주황. 맞았을 때는 흰빛이 잠깐 든다
constexpr engine::Color CHARGE_WARNING{1.0f, 0.86f, 0.32f};
constexpr engine::Color CAST_WARNING{1.0f, 0.74f, 0.3f};
constexpr engine::Color HURT_FLASH{1.0f, 1.0f, 0.96f};
// 시체가 가라앉기 시작하는 틱 (쓰러진 뒤) — CORPSE_TICKS 에 몸 높이만큼 내려가 있다
constexpr float CORPSE_SINK = 100.0f;
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
  return {{at.x, at.y, at.z, yaw}, {1.0f, 0.0f, 0.0f, 0.0f}, {}, {light.up[0], light.up[1], light.up[2], light.sun}, {light.down[0], light.down[1], light.down[2], 0.0f}};
}

void effect_triangle(std::vector<engine::ColoredVertex>& vertices, engine::Vec3 a, engine::Vec3 b, engine::Vec3 c) {
  const auto normal = engine::normalize(engine::cross(b - a, c - a));
  for (const auto point : {a, b, c}) vertices.push_back({{point.x, point.y, point.z}, {normal.x, normal.y, normal.z}, {1.0f, 1.0f, 1.0f, 1.0f}});
}

/** Combat effect geometry; character geometry always comes from the original authored asset poses. */
std::vector<engine::ColoredVertex> floor_effect(bool ring, bool cone, float cosine = 0.85f) {
  std::vector<engine::ColoredVertex> vertices;
  constexpr uint32_t SEGMENTS = 48;
  const float arc = cone ? std::acos(cosine) : std::numbers::pi_v<float>;
  if (cone) {
    // Leave the authored floor visible: a segmented range edge, two inner
    // rune arcs and narrow side rails describe the same unit danger sector.
    for (uint32_t segment = 0; segment < SEGMENTS; segment++) {
      const float a = -arc + 2.0f * arc * static_cast<float>(segment) / SEGMENTS;
      const float b = -arc + 2.0f * arc * static_cast<float>(segment + 1) / SEGMENTS;
      const engine::Vec3 edge_a{std::sin(a), 0.0f, -std::cos(a)}, edge_b{std::sin(b), 0.0f, -std::cos(b)};
      for (const float radius : {0.33f, 0.66f, 1.0f}) {
        if (segment % (radius == 1.0f ? 8u : 6u) >= (radius == 1.0f ? 7u : 4u)) continue;
        const float inner = radius - (radius == 1.0f ? 0.007f : 0.004f);
        effect_triangle(vertices, edge_a * inner, edge_b * radius, edge_a * radius);
        effect_triangle(vertices, edge_a * inner, edge_b * inner, edge_b * radius);
      }
    }
    for (const float side : {-1.0f, 1.0f}) {
      const float angle = side * arc;
      const engine::Vec3 edge{std::sin(angle), 0.0f, -std::cos(angle)};
      const engine::Vec3 inset{std::cos(angle) * (-side * 0.004f), 0.0f, std::sin(angle) * (-side * 0.004f)};
      const auto begin = edge * 0.08f, end = edge;
      effect_triangle(vertices, begin, end + inset, end);
      effect_triangle(vertices, begin, begin + inset, end + inset);
    }
    return vertices;
  }
  for (uint32_t segment = 0; segment < SEGMENTS; segment++) {
    const float a = -arc + 2.0f * arc * static_cast<float>(segment) / SEGMENTS;
    const float b = -arc + 2.0f * arc * static_cast<float>(segment + 1) / SEGMENTS;
    const engine::Vec3 edge_a{std::sin(a), 0.0f, -std::cos(a)}, edge_b{std::sin(b), 0.0f, -std::cos(b)};
    if (!ring) {
      effect_triangle(vertices, {}, edge_b, edge_a);
    }
    else {
      const auto outer_a = edge_a * 1.05f, outer_b = edge_b * 1.05f, inner_a = edge_a * 0.95f, inner_b = edge_b * 0.95f;
      effect_triangle(vertices, inner_a, outer_b, outer_a);
      effect_triangle(vertices, inner_a, inner_b, outer_b);
      const engine::Vec3 rise{0.0f, 0.10f, 0.0f};
      effect_triangle(vertices, outer_a, outer_a + rise, outer_b + rise);
      effect_triangle(vertices, outer_a, outer_b + rise, outer_b);
    }
  }
  return vertices;
}

std::vector<engine::ColoredVertex> energy_ribbon() {
  std::vector<engine::ColoredVertex> vertices;
  // Six curved, separated filaments around an open core. Only longitudinal
  // extent scales with reach; beam thickness remains a physical metre value.
  for(uint32_t strand=0;strand<6;++strand) for(uint32_t step=0;step<24;++step) {
    const auto edge=[&](uint32_t at,float width) {
      const float z=float(at)/24.0f,angle=float(strand)*std::numbers::pi_v<float>/3+z*9;
      const float radius=(.18f+width)*std::sin(std::min(1.0f,z*5)*std::numbers::pi_v<float>*.5f);
      return engine::Vec3{std::cos(angle)*radius,std::sin(angle)*radius,-z};
    };
    effect_triangle(vertices,edge(step,-.025f),edge(step+1,.025f),edge(step,.025f));
    effect_triangle(vertices,edge(step,-.025f),edge(step+1,-.025f),edge(step+1,.025f));
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

/** 저작 포즈의 근원 변환과 짧은 예고·명중 신호 — 벽 거미와 기존 박쥐 비행만 근원을 돌린다 */
SceneView::Instance enemy_instance(const Enemy& enemy, uint64_t tick, const LightProbe& light) {
  const EnemyTraits& t = traits(enemy.kind);
  const bool charger = enemy.kind == EnemyKind::charger;
  float scale = 1.0f, tilt = 0.0f, glow = 0.0f;
  engine::Color tint = charger ? CHARGE_WARNING : CAST_WARNING;
  if (enemy.act == Enemy::Act::windup) {
    const uint32_t windup = enemy.kind==EnemyKind::boss ? boss_timing(enemy.boss_pattern,enemy.boss_phase).windup : t.windup;
    const float progress = std::clamp(static_cast<float>(enemy.act_ticks) / static_cast<float>(windup),0.0f,1.0f);
    // 끝으로 갈수록 빠르게 깜박인다
    const float blink = 0.5f + 0.5f * std::sin(progress * progress * 2.0f * std::numbers::pi_v<float> * 6.0f);
    glow = 0.15f + 0.45f * progress * (0.5f + 0.5f * blink);
  } else if (enemy.act == Enemy::Act::charge) {
    glow = 0.45f;
  }
  float yaw = enemy.yaw;
  if (enemy.kind == EnemyKind::spider && engine::dot(enemy.wall_normal, enemy.wall_normal) > 0.0f) {
    tilt = std::numbers::pi_v<float> * 0.5f;
    yaw = std::atan2(-enemy.wall_normal.x, enemy.wall_normal.z);
  }
  const bool corpse = enemy.kind == EnemyKind::boss && enemy.health <= 0;
  if (corpse) scale = 1.0f, tilt = 0.0f, glow = 0.0f;
  if (enemy.hurt_tick && tick - *enemy.hurt_tick < HURT_FLASH_TICKS) {
    tint = HURT_FLASH;
    glow = 0.85f;
  }
  SceneView::Instance instance = piece(enemy.position, yaw, light);
  instance.pose = {scale, tilt, 0.0f, 0.0f};
  instance.tint = {tint.red, tint.green, tint.blue, glow};
  return instance;
}

engine::SurfaceInstance textured_instance(const SceneView::Instance& pose) {
  const float scale = pose.pose[0], tilt = pose.pose[1], yaw = pose.placement[3];
  const float c = std::cos(yaw), s = std::sin(yaw), ct = std::cos(tilt), st = std::sin(tilt);
  const engine::Vec3 position{pose.placement[0], pose.placement[1], pose.placement[2]};
  const auto at = engine::Mat4::from_basis({c * scale, 0.0f, s * scale}, {-s * st * scale, ct * scale, c * st * scale},
                                         {-s * ct * scale, -st * scale, c * ct * scale}, position);
  engine::SurfaceInstance instance = engine::SurfaceInstance::from(at);
  instance.light_up = pose.light_up;
  instance.light_down = pose.light_down;
  const float flash = 1.0f + pose.tint[3] * 0.85f;
  for (uint32_t channel = 0; channel < 3; channel++) {
    instance.light_up[channel] *= flash;
    instance.light_down[channel] *= flash;
  }
  return instance;
}

}  // namespace

SceneView::ActorPose SceneView::creature_pose(const Enemy& enemy,uint64_t tick,const CreatureAnimation& animation,bool idle) {
  const auto selected=game::creature_pose(enemy,tick,animation,idle);return {selected.clip,selected.tick};
}

bool SceneView::create(engine::gpu::Device& device, engine::ShaderLibrary& shaders, const RoomMeshes& rooms) {
  const auto bolt = engine::StaticMesh::decode(assets::enemy_bolt());
  if (!bolt) {
    engine::log_error("[scene] 투사체 메시 에셋을 읽지 못했다");
    return false;
  }
  effect_pipeline_ = device.create_pipeline({shaders.resolve(shaders.add(shaders::scene)), LAYOUTS, true, false});
  if (!effect_pipeline_) return false;
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
  bool ok = instance_buffer_ && surfaces_.create(device, shaders, MAX_SURFACES) &&
       merchant_.create(device, shaders, 1) && monsters_.create(device, shaders, ROOM_ENEMIES*3,engine::SurfaceBatch::Deformation::skin);
  for(auto& palette:monster_palettes_) {palette=device.create_buffer({engine::gpu::BufferUsage::uniform,sizeof(engine::SkinPalette),nullptr});ok=bool(palette)&&ok;}
  for (uint32_t shape = 0; shape < SHAPE_COUNT; shape++) ok = upload_piece(shape, rooms.rooms[shape]) && ok;
  ok = upload_piece(SEALED, rooms.sealed) && upload_piece(GATE, rooms.gate) && effects_[MANA].vertices &&
       upload_effect(WEB, web_effect()) && upload_effect(GOO_POOL, floor_effect(false, false)) &&
       upload_effect(FIRE_BREATH, floor_effect(false, true)) && upload_effect(SHOCKWAVE, floor_effect(true, false)) && upload_effect(VOID_BEAM, floor_effect(false, true, 0.97f)) && upload_effect(ENERGY_RIBBON,energy_ribbon()) && upload_effect(IMPACT_SEAL,floor_effect(true,false)) && upload_effect(SWEEP_WARNING,floor_effect(false,true,std::cos(1.05f))) && ok;
  ok = sprites_.create(device, shaders) && ok;
  rooms_ = &rooms;
  return ok;
}

void SceneView::draw_room(engine::gpu::Device& device, const Room& room, float open, bool furniture, const Camera& camera, const Scenery& scenery, float glow, bool neutral) {
  if (scenery.state() != Scenery::State::ready) return;
  const std::span<const Scenery::Prop> props = scenery.props();
  const Scenery::RoomLights& lights = scenery.room_lights();
  surface_groups_.resize(PROP_GROUP + props.size());
  for (std::vector<engine::SurfaceInstance>& group : surface_groups_) group.clear();
  // 지금 방 — 돌려 놓은 틀과 거기 고정해 놓인 소품들. 방 가운데가 원점이다. 틀은 구운 라이트맵을, 소품은 소품마다 구운 프로브를 받는다 (구운 것이 없으면 가리는 것 없는 빛으로)
  const engine::SurfaceMesh& mesh = rooms_->rooms[room.shape];
  const RoomLight* light = neutral ? nullptr : lights.body;
  const engine::Mat4 at = piece_matrix(static_cast<Direction>(room.turn % 4), {});
  surface_groups_[BODY_GROUP].push_back(light ? baked(at) : lit(at, (neutral ? REVIEW_LIGHT : OPEN_LIGHT)));
  const std::span<const engine::Placement> placements = mesh.placements();
  const bool probed = light && light->placements.size() == placements.size();
  for (std::size_t i = 0; i < placements.size(); i++) {
    const engine::Placement& p = placements[i];
    // 팩의 소품 수보다 큰 번호(빌드와 팩이 어긋났다)는 그리지 않는다
    if (p.model < props.size()) surface_groups_[PROP_GROUP + p.model].push_back(lit(at * placement_matrix(p), probed ? light->placements[i] : (neutral ? REVIEW_LIGHT : OPEN_LIGHT)));
  }
  // 문 자리 — 문이 나지 않은 곳은 막음돌이 메우고, 문이 난 곳은 잠긴 동안 룬 석판이 포털을 막는다 (다 잡으면 바닥 밑으로 내려가고 그 뒤에서 포털이 번져 나온다 — portal_view).
  // 둘 다 굽지 않는다 — 문 자리 안쪽의 빛을 프로브 격자에서 받는다 (격자는 틀의 좌표다)
  // 내려갈수록 빨라진다
  const engine::Vec3 gate{0.0f, -GATE_SINK * open * open, 0.0f};
  for (const Direction d : {NORTH, EAST, SOUTH, WEST}) {
    if (!room.site(d)) continue;
    const LightProbe here = light ? light->at(room.to_shape(turned(GATE_CENTER, d)), (neutral ? REVIEW_LIGHT : OPEN_LIGHT)) : (neutral ? REVIEW_LIGHT : OPEN_LIGHT);
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
    const engine::gpu::TextureHandle lightmap = group == BODY_GROUP && !neutral ? lights.body_map : engine::gpu::TextureHandle{};
    surface_draws_.push_back({.vertices = prop ? prop->vertices : pieces_[piece].vertices,
                              .vertex_count = prop ? prop->vertex_count : pieces_[piece].vertex_count,
                              .albedo = prop ? scenery.prop_textures() : scenery.tiles(),
                              .nar = prop ? scenery.prop_nars() : scenery.tile_nars(),
                              .lightmap = lightmap,
                              .direction = group == BODY_GROUP && !neutral ? lights.body_direction : engine::gpu::TextureHandle{},
                              .two_sided = prop && prop->two_sided,
                              .cutout = prop && prop->cutout,
                              .first_instance = static_cast<uint32_t>(surface_upload_.size()),
                              .instance_count = static_cast<uint32_t>(placed.size())});
    surface_upload_.insert(surface_upload_.end(), placed.begin(), placed.end());
  }
  if (furniture) {
    // Furniture belongs to the chamber, including after the hunting witch dies
    // elsewhere. The source seat/top heights were fitted to the authored sit rig.
    for (uint32_t i = 0; i < Scenery::MERCHANT_PROP_COUNT; i++) {
      const auto role = static_cast<Scenery::MerchantProp>(i);
      const auto& prop = scenery.merchant_prop(role);
      const uint32_t first = static_cast<uint32_t>(surface_upload_.size());
      for (const auto& placement : merchant_art::PLACEMENTS) {
        if (placement.model != i) continue;
        const engine::Mat4 placed = at * placement.matrix;
        const engine::Vec3 middle = scenery.merchant_prop_center(role);
        const engine::Vec3 center{placed.m[0] * middle.x + placed.m[4] * middle.y + placed.m[8] * middle.z + placed.m[12],
                                  placed.m[1] * middle.x + placed.m[5] * middle.y + placed.m[9] * middle.z + placed.m[13],
                                  placed.m[2] * middle.x + placed.m[6] * middle.y + placed.m[10] * middle.z + placed.m[14]};
        const LightProbe probe = light ? light->at(room.to_shape(center), (neutral ? REVIEW_LIGHT : OPEN_LIGHT)) : (neutral ? REVIEW_LIGHT : OPEN_LIGHT);
        // 등은 제 빛으로 밝다 — 프로브(둘레의 빛)에 따뜻한 빛을 얹는다. 방을 비추는 것은 구운 점광원이다
        if (merchant_art::MODEL_GLOWS[i]) {
          LightProbe lamp = probe;
          for (int channel = 0; channel < 3; channel++) { lamp.up[channel] += LAMP_GLOW[channel]; lamp.down[channel] += LAMP_GLOW[channel]; }
          surface_upload_.push_back(lit(placed, lamp));
          continue;
        }
        surface_upload_.push_back(lit(placed, probe));
      }
      if (surface_upload_.size() == first) continue;  // 배치가 없는 가구(지금은 직물)는 그리지 않는다
      surface_draws_.push_back({.vertices = prop.vertices, .vertex_count = prop.vertex_count,
                                .albedo = scenery.merchant_prop_textures(),
                                .nar = scenery.merchant_prop_nars(),
                                .lightmap = {}, .direction = {}, .two_sided = prop.two_sided, .cutout = prop.cutout,
                                .first_instance = first, .instance_count = static_cast<uint32_t>(surface_upload_.size()) - first});
    }
  }
  surfaces_.draw(device, {camera.view_proj, SKY_COLOR, FOG_DISTANCE, glow, 1.0f, neutral ? REVIEW_SUN : room_sun(room), neutral ? REVIEW_KEY : sky::SUN_LIGHT, camera.eye}, surface_upload_, surface_draws_);
}

void SceneView::draw_merchant(engine::gpu::Device& device, const Preview& view, const Camera& camera, const Scenery& scenery) {
  const auto* vendor = view.merchant;
  if (!vendor || scenery.state() != Scenery::State::ready) return;
  engine::Vec3 position = vendor->position;
  float yaw = vendor->yaw;
  const auto& model = scenery.merchant_body(view.merchant_corrupted ? Scenery::CORRUPTED : Scenery::NORMAL);
  const float c = std::cos(yaw), s = std::sin(yaw);
  const Room& room = view.room;
  const RoomLight* light = view.neutral ? nullptr : scenery.room_lights().body;
  const LightProbe probe = light ? light->at(room.to_shape(position + engine::Vec3{0, 1, 0}), (view.neutral ? REVIEW_LIGHT : OPEN_LIGHT)) : (view.neutral ? REVIEW_LIGHT : OPEN_LIGHT);
  // The new owner-supplied mesh has no rig yet. Keep it static while trading;
  // a defeated merchant rests on the floor until authored poses are provided.
  const engine::Mat4 placement = vendor->phase == MerchantPhase::fallen
      ? engine::Mat4::from_basis({c, 0, s}, {s, 0, -c}, {0, 1, 0}, position + engine::Vec3{0, .25f, 0})
      : engine::Mat4::from_basis({c, 0, s}, {0, 1, 0}, {-s, 0, c}, position);
  engine::SurfaceInstance instance = lit(placement, probe);
  const engine::SurfaceDraw draw{.vertices = model.vertices, .vertex_count = model.vertex_count, .albedo = scenery.merchant_texture(), .nar = scenery.merchant_nar(),
                                 .lightmap = {}, .direction = {}, .two_sided = model.two_sided, .cutout = model.cutout,
                                 .first_instance = 0, .instance_count = 1};
  merchant_.draw(device, {camera.view_proj, SKY_COLOR, FOG_DISTANCE, 1.0f, 1.0f, view.neutral ? REVIEW_SUN : room_sun(room), view.neutral ? REVIEW_KEY : sky::SUN_LIGHT, camera.eye}, std::span{&instance, 1}, std::span{&draw, 1});
}

void SceneView::draw(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery) {
  const Preview view{.room=world.floor().rooms[world.room()], .enemies=world.enemies(), .corpses=world.corpses(), .merchant=world.merchant(),
    .projectiles=world.projectiles(), .hazards=world.hazards(), .spells=world.spells(), .outposts=world.outposts(), .flares=world.flares(), .tick=world.tick()};
  const float glow = 0.9f + 0.35f * std::exp(-6.0f * beat_phase(view.tick));
  draw_room(device, view.room, portal_open(world), view.room.kind == RoomKind::shop, camera, scenery, glow, false);
  draw_content(device, view, camera, scenery);
}

void SceneView::draw_preview(engine::gpu::Device& device,const Preview& view,const Camera& camera,const Scenery& scenery) {
  const float glow = 0.9f + 0.35f * std::exp(-6.0f * beat_phase(view.tick));
  if(!view.isolated)draw_room(device,view.room,1.0f,view.merchant != nullptr || view.room.shape == SHOP_SHAPE,camera,scenery,glow,view.neutral);
  draw_content(device,view,camera,scenery);
}

void SceneView::draw_content(engine::gpu::Device& device,const Preview& view,const Camera& camera,const Scenery& scenery) {
  const float glow = 0.9f + 0.35f * std::exp(-6.0f * beat_phase(view.tick));
  draw_merchant(device,view,camera,scenery);
  // 적과 투사체는 제자리의 빛을 받는다 (바닥 위의 프로브 격자에서 — 격자는 틀의 좌표다) — 그늘에 든 것은 그늘의 빛으로
  const Room& room = view.room;
  const RoomLight* light = view.neutral ? nullptr : scenery.room_lights().body;
  const auto light_at = [&](engine::Vec3 at) { return light ? light->at(room.to_shape(at), (view.neutral ? REVIEW_LIGHT : OPEN_LIGHT)) : (view.neutral ? REVIEW_LIGHT : OPEN_LIGHT); };
  for (std::vector<Instance>& group : placed_) group.clear();
  monster_upload_.clear();monster_draws_.clear();
  const auto effect = [&](Effect kind, engine::Vec3 at, engine::Vec3 direction, float radius, engine::Color color) -> Instance& {
    Instance instance = piece(at, std::atan2(direction.x, -direction.z), light_at(at));
    if (kind == ENERGY_RIBBON) instance.pose[1] = std::asin(std::clamp(direction.y, -1.0f, 1.0f));
    instance.pose[0] = kind == SHOCKWAVE ? 1.0f : radius;
    if (kind == SHOCKWAVE) instance.pose[2] = 1.0f, instance.pose[3] = radius;
    if (kind == ENERGY_RIBBON) instance.pose[2] = 2.0f, instance.pose[3] = float(view.tick%600)/60.0f;
    if (kind == GOO_POOL) instance.pose[2] = 3.0f, instance.pose[3] = float(view.tick%600)/60.0f;
    instance.tint = {color.red, color.green, color.blue, 1.0f};
    placed_[kind].push_back(instance);
    return placed_[kind].back();
  };
  const uint32_t actors=static_cast<uint32_t>(view.enemies.size()+view.corpses.size());
  for (uint32_t i = 0; i < std::min<uint32_t>(actors,monster_palettes_.size()); i++) {
    const Enemy& enemy = i<view.enemies.size() ? view.enemies[i] : view.corpses[i-view.enemies.size()];
    const engine::Aabb body = enemy_box(enemy);
    const engine::Vec3 lit_center = (body.min + body.max) * 0.5f;
    Instance pose = enemy_instance(enemy, view.tick, light_at(lit_center));
    // 시체는 사라지기 전에 바닥 밑으로 가라앉는다 — 바닥이 가리고, 그 위를 먼지·김이 덮는다 (place_sprites). 바닥에 없으면 덮개만
    if (enemy.kind != EnemyKind::boss && enemy.health <= 0 && enemy.death_tick && enemy.grounded) {
      const float sink = std::clamp((static_cast<float>(view.tick - *enemy.death_tick) - CORPSE_SINK) / (static_cast<float>(CORPSE_TICKS) - CORPSE_SINK), 0.0f, 1.0f);
      pose.placement[1] -= (body.max.y - body.min.y) * sink * sink;
    }
    if (enemy.kind == EnemyKind::boss && enemy.act == Enemy::Act::windup && enemy.health > 0) {
      const auto pattern=enemy.boss_pattern;
      const engine::Vec3 ground=enemy.position+engine::Vec3{0,.04f,0};
      if(pattern==BossPattern::breath)effect(FIRE_BREATH,ground,enemy.aim,boss_range(pattern),{.95f,.35f,.08f});
      else if(pattern==BossPattern::shockwave)effect(SHOCKWAVE,ground,{},3.0f,{.3f,.8f,1.0f});
      else if(pattern==BossPattern::charge)effect(VOID_BEAM,ground,enemy.aim,boss_range(pattern),{1.0f,.3f,.12f});
      else if(pattern==BossPattern::sweep)effect(SWEEP_WARNING,ground,enemy.aim,boss_range(pattern),{.8f,.35f,1.0f});
    }
    if (scenery.state() != Scenery::State::ready) continue;
    const auto creature = enemy.kind == EnemyKind::boss ? Scenery::ROIL : enemy.kind == EnemyKind::bat ? Scenery::DRAKE :
                          enemy.kind == EnemyKind::spider ? Scenery::LARVA : enemy.kind == EnemyKind::caster ? Scenery::TSUNAMI : Scenery::BOA;
    const auto& animation=scenery.creature_animation(creature);
    const auto palette=sample_creature_palette(enemy,view.tick,animation,view.idle);
    device.write_buffer(monster_palettes_[i],std::as_bytes(std::span{palette.bones}.first(palette.configuration[0]*palette.configuration[1])));
    device.write_buffer(monster_palettes_[i],std::as_bytes(std::span{&palette,1}).subspan(offsetof(engine::SkinPalette,weights)),offsetof(engine::SkinPalette,weights));
    const auto& model=scenery.creature(creature);
    monster_draws_.push_back({.vertices=model.vertices,.vertex_count=model.vertex_count,.albedo=scenery.monster_textures(),.nar=scenery.monster_nars(),.lightmap={},.direction={},.two_sided=model.two_sided,.cutout=model.cutout,
      .first_instance=static_cast<uint32_t>(monster_upload_.size()),.instance_count=1,.skin_vertices=scenery.creature_skin(creature),.skin_palette=monster_palettes_[i]});
    monster_upload_.push_back(textured_instance(pose));
  }
  if (scenery.state() == Scenery::State::ready) {
    monsters_.draw(device, {camera.view_proj, SKY_COLOR, FOG_DISTANCE, glow, 1.0f, view.neutral ? REVIEW_SUN : room_sun(room), view.neutral ? REVIEW_KEY : sky::SUN_LIGHT, camera.eye}, monster_upload_, monster_draws_);
  }
  for (const Projectile& bolt : view.projectiles) {
    // 날아가며 돌고 맥이 뛴다 (빛무리와 꼬리는 스프라이트 — place_sprites)
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
    placed_[kind].push_back(instance);
  }
  // 바닥의 공격 예고와 고리는 색 메시로 남긴다 — 어디가 위험한지 읽는 모양이다
  for (const GroundHazard& hazard : view.hazards) {
    const auto at = hazard.position + engine::Vec3{0.0f, hazard.kind == GroundHazard::Kind::fire_breath ? 0.0f : 0.025f, 0.0f};
    if (hazard.kind == GroundHazard::Kind::shard_impact) {
      const bool active = hazard.age >= hazard.delay;
      effect(IMPACT_SEAL, at, {}, hazard.radius, active ? engine::Color{1, .65f, .16f} : engine::Color{.75f, .25f, 1});
    } else if (hazard.kind == GroundHazard::Kind::sweep) effect(ENERGY_RIBBON, hazard.position, sweep_direction(hazard.direction, hazard.age, hazard.duration), hazard.radius, {.65f, .3f, 1});
    else if (hazard.kind == GroundHazard::Kind::goo) effect(GOO_POOL, at, {}, hazard.radius, {0.22f, 0.75f, 0.16f});
    else if (hazard.kind == GroundHazard::Kind::fire_breath) effect(FIRE_BREATH, {at.x, at.y - 2.36f, at.z}, hazard.direction, hazard.radius, {1, .32f, .06f});
    else effect(SHOCKWAVE, at, {}, hazard.radius, {.65f, .82f, 1});
  }
  const float pulse = 0.5f + 0.5f * std::sin(static_cast<float>(view.tick) * 0.21f);
  for (const Enemy& enemy : view.enemies) {
    if (enemy.health <= 0) continue;
    const engine::Aabb body = enemy_box(enemy);
    const engine::Vec3 crown{(body.min.x + body.max.x) * 0.5f, body.max.y + 0.35f, (body.min.z + body.max.z) * 0.5f};
    // 공명구 — 머리 위 인장의 바닥 고리 (인장은 스프라이트)
    if (enemy.sealed) effect(SHOCKWAVE, crown - engine::Vec3{0.0f, 0.05f, 0.0f}, {}, 0.45f + 0.08f * pulse, {1.0f, 0.62f, 0.2f});
    // 탁류에 묶임 — 묶은 자리의 가운데로 청록 띠가 이어진다
    if (view.tick < enemy.bound_until) {
      const engine::Vec3 center = (body.min + body.max) * 0.5f;
      engine::Vec3 middle{};
      uint32_t bound = 0;
      for (const Enemy& other : view.enemies)
        if (view.tick < other.bound_until && other.health > 0) middle = middle + other.bind_anchor, bound++;
      middle = middle * (1.0f / static_cast<float>(std::max(bound, 1u)));
      const engine::Vec3 link = middle - center;
      const float length = std::sqrt(engine::dot(link, link));
      if (length > 0.05f) effect(ENERGY_RIBBON, center, link * (1.0f / length), length, {0.25f, 0.95f, 0.9f});
      effect(SHOCKWAVE, center, {}, 0.9f + 0.15f * pulse, {0.3f, 1.0f, 0.92f});
    }
  }
  for (const Outpost& post : view.outposts) {
    const float rise = std::clamp(static_cast<float>(view.tick - post.raised) / 12.0f, 0.0f, 1.0f);
    effect(IMPACT_SEAL, post.position - engine::Vec3{0.0f, 1.25f, 0.0f}, {}, 1.2f * rise, {0.5f, 0.9f, 1.0f});
  }
  for (const Flare& flare : view.flares) {
    const float t = static_cast<float>(flare.age) / static_cast<float>(std::max(flare.duration, 1u));
    switch (flare.kind) {
      case Flare::Kind::guard: effect(SHOCKWAVE, flare.position, {}, 0.4f + 1.6f * t, {0.35f, 1.0f, 0.9f}); break;
      case Flare::Kind::fold: effect(SHOCKWAVE, flare.position, {}, 1.8f + 0.4f * std::sin(static_cast<float>(flare.age) * 0.3f), {0.25f, 0.95f, 0.9f}); break;
      case Flare::Kind::stomp:
        effect(SHOCKWAVE, flare.position + engine::Vec3{0.0f, 0.03f, 0.0f}, {}, 0.6f + 3.2f * t, {0.55f, 0.85f, 0.3f});
        effect(IMPACT_SEAL, flare.position + engine::Vec3{0.0f, 0.02f, 0.0f}, {}, 1.6f * (1.0f - t), {0.5f, 0.75f, 0.25f});
        break;
      default: break;
    }
  }
  place_sprites(view, camera.eye);

  upload_.clear();
  uint32_t first[EFFECT_COUNT], count[EFFECT_COUNT];
  for (uint32_t part = 0; part < EFFECT_COUNT; part++) {
    first[part] = static_cast<uint32_t>(upload_.size());
    count[part] = static_cast<uint32_t>(std::min(placed_[part].size(), MAX_INSTANCES - upload_.size()));
    upload_.insert(upload_.end(), placed_[part].begin(), placed_[part].begin() + count[part]);
  }
  const engine::SpriteView sprite_view{camera.view_proj, camera.right, camera.up, camera.eye, {SKY_COLOR.red, SKY_COLOR.green, SKY_COLOR.blue}, FOG_DISTANCE};
  if (upload_.empty()) {
    sprites_.draw(device, sprite_view, sprite_list_);
    return;
  }
  device.write_buffer(instance_buffer_, std::as_bytes(std::span{upload_}));

  const FrameUniforms uniforms{camera.view_proj.m,
                               {glow, 0.0f, 0.0f, 0.0f},
                               {SKY_COLOR.red, SKY_COLOR.green, SKY_COLOR.blue, FOG_DISTANCE},
                               {room_sun(room).x, room_sun(room).y, room_sun(room).z, 0.0f},
                               {sky::SUN_LIGHT.x, sky::SUN_LIGHT.y, sky::SUN_LIGHT.z, 0.0f}};
  device.write_buffer(frame_uniforms_, std::as_bytes(std::span{&uniforms, 1}));
  const engine::gpu::BufferBinding bindings[] = {{FRAME_BINDING, frame_uniforms_}};
  for (uint32_t part = 0; part < EFFECT_COUNT; part++) {
    if (!count[part]) continue;
    const auto& model = effects_[part];
    const engine::gpu::BufferHandle buffers[] = {model.vertices, instance_buffer_};
    device.draw({.pipeline = effect_pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = model.vertex_count, .instance_count = count[part], .first_instance = first[part]});
  }
  // 비치는 효과는 불투명한 것과 색 메시를 다 그린 뒤에 (깊이를 견주되 쓰지 않는다)
  sprites_.draw(device, sprite_view, sprite_list_);
}

namespace {

// 스프라이트의 층 — 에셋 팩의 vfx/ 차례 (tools/art/prepare-vfx.mjs)
enum SpriteLayer : uint32_t { EXPLOSION, FIREBALL, SMOKE, PARTICLES, SPRITE_LAYERS };
constexpr std::string_view SPRITE_ENTRIES[SPRITE_LAYERS] = {"vfx/explosion", "vfx/fireball", "vfx/smoke", "vfx/sprites"};
constexpr float EXPLOSION_GRID = 5.0f, FIREBALL_GRID = 8.0f, SMOKE_GRID = 8.0f, PARTICLE_GRID = 4.0f;
constexpr float EXPLOSION_FRAMES = 25.0f, LOOP_FRAMES = 64.0f;
// 파티클 아틀라스의 칸 — prepare-vfx.mjs 의 SPRITES 차례
enum Particle : uint32_t { CIRCLE, SOFT_DOT, DIRT, LIGHT, RUNE, RUNE_WIDE, FLARE, SCORCH, PUFF, PUFF_WIDE, TRACE, STAR, TWINKLE, TWIRL, FLAME, BURST };

/** 자리에서 얻는 0…1 의 값 — 효과마다 갈래·돌림을 달리하되 같은 효과는 프레임마다 같다 */
float scatter(engine::Vec3 at, uint32_t salt) {
  uint32_t h = std::bit_cast<uint32_t>(at.x) * 73856093u ^ std::bit_cast<uint32_t>(at.y) * 19349663u ^ std::bit_cast<uint32_t>(at.z) * 83492791u ^ (salt + 1u) * 2654435761u;
  h ^= h >> 15, h *= 2246822519u, h ^= h >> 13;
  return static_cast<float>(h & 0xffffffu) / 16777215.0f;
}

}  // namespace

bool SceneView::load_effects(engine::gpu::Device& device, std::span<const std::byte> bytes) {
  const auto pack = engine::asset::Pack::parse(bytes);
  if (!pack) return false;
  std::array<std::optional<engine::hud::Bitmap>, SPRITE_LAYERS> bitmaps;
  for (const engine::asset::PackEntry& entry : pack->entries())
    for (uint32_t layer = 0; layer < SPRITE_LAYERS; layer++)
      if (entry.name == SPRITE_ENTRIES[layer]) bitmaps[layer] = engine::hud::Bitmap::decode(entry.bytes);
  std::array<std::span<const std::byte>, SPRITE_LAYERS> layers;
  for (uint32_t layer = 0; layer < SPRITE_LAYERS; layer++) {
    if (!bitmaps[layer] || bitmaps[layer]->width != bitmaps[0]->width || bitmaps[layer]->height != bitmaps[layer]->width) {
      engine::log_error("[scene] 효과 그림 %.*s 를 풀지 못했다 — 스프라이트 효과 없이 그린다", static_cast<int>(SPRITE_ENTRIES[layer].size()), SPRITE_ENTRIES[layer].data());
      return false;
    }
    layers[layer] = std::as_bytes(std::span{bitmaps[layer]->rgba});
  }
  return sprites_.upload(device, bitmaps[0]->width, layers);
}

void SceneView::place_sprites(const Preview& view, engine::Vec3 eye) {
  sprite_list_.clear();
  if (!sprites_.ready()) return;
  using engine::Vec3;
  const float now = static_cast<float>(view.tick);
  // 빛 — 파티클 아틀라스의 흰 그림에 색을 입혀 더한다
  const auto glow = [&](Particle cell, Vec3 at, float size, engine::Color color, float strength, float turn = 0.0f) {
    if (size <= 0.001f || strength <= 0.001f) return;
    sprite_list_.push_back({.center = at, .size = size, .layer = PARTICLES, .frame = static_cast<float>(cell), .columns = PARTICLE_GRID, .rows = PARTICLE_GRID,
                            .red = color.red, .green = color.green, .blue = color.blue, .alpha = strength, .rotation = turn, .additive = true});
  };
  // 줄기 — from 에서 to 까지 늘인 빛 (총알의 길, 튀는 불티)
  const auto streak = [&](Vec3 from, Vec3 to, float width, engine::Color color, float strength) {
    const Vec3 path = to - from;
    const float length = std::sqrt(engine::dot(path, path));
    if (length < 0.01f || strength <= 0.001f) return;
    sprite_list_.push_back({.center = (from + to) * 0.5f, .size = width, .axis = path * (1.0f / length), .length = length, .layer = PARTICLES, .frame = static_cast<float>(TRACE),
                            .columns = PARTICLE_GRID, .rows = PARTICLE_GRID, .red = color.red, .green = color.green, .blue = color.blue, .alpha = strength, .additive = true});
  };
  // 플립북 한 장 — 폭발은 알파로 섞고, 불덩이는 더하고, 연기는 색을 입혀 섞는다
  const auto flipbook = [&](SpriteLayer layer, float frame, Vec3 at, float size, engine::Color color, float alpha, float turn = 0.0f) {
    if (size <= 0.001f || alpha <= 0.001f) return;
    const float grid = layer == EXPLOSION ? EXPLOSION_GRID : layer == FIREBALL ? FIREBALL_GRID : SMOKE_GRID;
    sprite_list_.push_back({.center = at, .size = size, .layer = static_cast<float>(layer), .frame = frame, .columns = grid, .rows = grid,
                            .red = color.red, .green = color.green, .blue = color.blue, .alpha = alpha, .rotation = turn, .additive = layer == FIREBALL});
  };
  // 조각 — 파티클 아틀라스의 흰 그림에 어두운 재질 색을 입혀 알파로 섞는다 (더하면 어두운 것이 보이지 않는다)
  const auto chip = [&](Particle cell, Vec3 at, float size, engine::Color color, float alpha, float turn = 0.0f) {
    if (size <= 0.001f || alpha <= 0.001f) return;
    sprite_list_.push_back({.center = at, .size = size, .layer = PARTICLES, .frame = static_cast<float>(cell), .columns = PARTICLE_GRID, .rows = PARTICLE_GRID,
                            .red = color.red, .green = color.green, .blue = color.blue, .alpha = alpha, .rotation = turn});
  };
  const auto ease_out = [](float t) { return 1.0f - (1.0f - t) * (1.0f - t); };

  for (const Projectile& bolt : view.projectiles) {
    const float speed = std::sqrt(engine::dot(bolt.velocity, bolt.velocity));
    const float age = static_cast<float>(bolt.age);
    if (bolt.kind == Projectile::Kind::mana) {
      glow(SOFT_DOT, bolt.position, 1.1f + 0.15f * std::sin(age * 0.6f), {1.0f, 0.55f, 0.25f}, 1.1f);
      glow(FLARE, bolt.position, 1.6f, {1.0f, 0.8f, 0.5f}, 0.8f, age * 0.2f);
      if (speed > 0.01f) streak(bolt.position - bolt.velocity * 0.09f, bolt.position, 0.45f, {1.0f, 0.45f, 0.15f}, 0.9f);
    } else if (bolt.kind == Projectile::Kind::goo) {
      glow(SOFT_DOT, bolt.position, 1.0f, {0.35f, 1.0f, 0.2f}, 0.6f);
      if (speed > 0.01f) for (uint32_t drop = 1; drop <= 3; drop++)
        glow(CIRCLE, bolt.position - bolt.velocity * (0.025f * static_cast<float>(drop)), 0.35f / static_cast<float>(drop), {0.4f, 1.0f, 0.25f}, 0.7f);
    }
  }

  for (const GroundHazard& hazard : view.hazards) {
    const float age = static_cast<float>(hazard.age);
    if (hazard.kind == GroundHazard::Kind::fire_breath) {
      // 불길 — 불덩이 플립북이 원뿔을 따라 굴러 나가며 커지고, 위로 검은 연기가 오른다
      const float yaw = std::atan2(hazard.direction.x, -hazard.direction.z);
      for (uint32_t billow = 0; billow < 14; billow++) {
        const float travel = std::fmod(age * 0.035f + static_cast<float>(billow) / 14.0f, 1.0f);
        const float spread = (static_cast<float>(billow % 5) - 2.0f) * 0.13f;
        const Vec3 direction{std::sin(yaw + spread), hazard.direction.y, -std::cos(yaw + spread)};
        const Vec3 at = hazard.position + direction * (hazard.radius * travel) + Vec3{0.0f, 0.4f * travel, 0.0f};
        const float fade = travel < 0.12f ? travel / 0.12f : 1.0f - (travel - 0.12f) / 0.88f;
        flipbook(FIREBALL, std::fmod(age * 0.9f + static_cast<float>(billow) * 9.0f, LOOP_FRAMES), at, 1.2f + 3.6f * travel, {1.0f, 0.75f, 0.45f}, 1.3f * fade, static_cast<float>(billow) * 1.7f);
        if (billow % 3 == 0)
          flipbook(SMOKE, std::fmod(age * 0.5f + static_cast<float>(billow) * 7.0f, LOOP_FRAMES), at + Vec3{0.0f, 1.2f + 1.5f * travel, 0.0f}, 2.0f + 3.0f * travel, {0.16f, 0.13f, 0.12f}, 0.55f * fade);
      }
      for (uint32_t ember = 0; ember < 10; ember++) {
        const float travel = std::fmod(age * 0.05f + static_cast<float>(ember) * 0.37f, 1.0f);
        const float spread = std::sin(static_cast<float>(ember) * 17.13f) * 0.46f;
        const Vec3 direction{std::sin(yaw + spread), hazard.direction.y, -std::cos(yaw + spread)};
        const Vec3 at = hazard.position + direction * (hazard.radius * travel) + Vec3{0.0f, 0.3f + 1.4f * travel * travel, 0.0f};
        glow(TWINKLE, at, 0.25f, {1.0f, 0.6f, 0.2f}, 1.5f * (1.0f - travel));
      }
    } else if (hazard.kind == GroundHazard::Kind::shard_impact) {
      if (hazard.age < hazard.delay) {
        // 떨어지는 조각 — 위에서 내려오는 보랏빛 혜성
        const float remaining = static_cast<float>(hazard.delay - hazard.age);
        const Vec3 at = hazard.position + Vec3{0.0f, std::min(7.0f, remaining * 0.22f), 0.0f};
        glow(SOFT_DOT, at, 1.4f, {0.85f, 0.4f, 1.0f}, 1.0f);
        glow(FLARE, at, 2.2f, {1.0f, 0.7f, 1.0f}, 0.9f, now * 0.1f);
        streak(at, at + Vec3{0.0f, 2.4f, 0.0f}, 0.6f, {0.7f, 0.35f, 1.0f}, 0.8f);
      } else {
        // 떨어진 자리 — 폭발과 흩어지는 불티
        const float t = std::clamp(static_cast<float>(hazard.age - hazard.delay) / static_cast<float>(TICKS_PER_SLOT * 2), 0.0f, 1.0f);
        flipbook(EXPLOSION, t * (EXPLOSION_FRAMES - 1.0f), hazard.position + Vec3{0.0f, hazard.radius * 0.45f, 0.0f}, hazard.radius * 2.4f, {1.0f, 0.85f, 1.0f}, 1.0f, scatter(hazard.position, 1) * 6.28f);
        for (uint32_t spark = 0; spark < 8; spark++) {
          const float angle = static_cast<float>(spark) * 0.785f + scatter(hazard.position, spark) * 0.5f;
          const Vec3 out{std::cos(angle), 0.0f, std::sin(angle)};
          const Vec3 head = hazard.position + out * (hazard.radius * ease_out(t)) + Vec3{0.0f, 2.0f * t - 2.5f * t * t + 0.2f, 0.0f};
          streak(head - out * 0.6f, head, 0.18f, {1.0f, 0.6f, 0.25f}, 1.4f * (1.0f - t));
        }
      }
    } else if (hazard.kind == GroundHazard::Kind::shockwave) {
      // 퍼지는 충격파 — 바닥 고리(색 메시)를 따라 도는 불티
      for (uint32_t spark = 0; spark < 10; spark++) {
        const float angle = static_cast<float>(spark) * std::numbers::pi_v<float> / 5.0f + age * 0.018f;
        glow(STAR, hazard.position + Vec3{std::cos(angle) * hazard.radius, 0.2f + 0.16f * std::sin(angle * 3.0f), std::sin(angle) * hazard.radius}, 0.55f, {0.45f, 0.8f, 1.0f}, 1.2f, angle);
      }
    } else if (hazard.kind == GroundHazard::Kind::goo) {
      // 끈적이는 물웅덩이 위로 거품이 오른다
      for (uint32_t bubble = 0; bubble < 5; bubble++) {
        const float rise = std::fmod(age * 0.02f + static_cast<float>(bubble) * 0.2f, 1.0f);
        const float angle = static_cast<float>(bubble) * 2.4f;
        glow(CIRCLE, hazard.position + Vec3{std::cos(angle) * hazard.radius * 0.5f, 0.1f + 0.6f * rise, std::sin(angle) * hazard.radius * 0.5f}, 0.3f, {0.35f, 1.0f, 0.25f}, 0.6f * (1.0f - rise));
      }
    }
  }

  const float pulse = 0.5f + 0.5f * std::sin(now * 0.21f);
  for (const Enemy& enemy : view.enemies) {
    if (enemy.health <= 0) continue;
    const engine::Aabb body = enemy_box(enemy);
    const Vec3 crown{(body.min.x + body.max.x) * 0.5f, body.max.y + 0.35f, (body.min.z + body.max.z) * 0.5f};
    // 공명구 — 머리 위에서 도는 호박색 룬
    if (enemy.sealed) {
      glow(RUNE, crown, 1.3f + 0.15f * pulse, {1.0f, 0.7f, 0.28f}, 1.2f, now * 0.05f);
      glow(SOFT_DOT, crown, 0.9f, {1.0f, 0.55f, 0.15f}, 0.5f);
    }
    if (view.tick < enemy.bound_until) glow(TWIRL, (body.min + body.max) * 0.5f, 2.4f, {0.25f, 1.0f, 0.9f}, 0.8f, -now * 0.12f);
    else if (view.tick < enemy.stunned_until)
      // 뿌리 발에 밟혀 기절 — 머리 위를 도는 이끼빛 별
      for (uint32_t spark = 0; spark < 3; spark++) {
        const float angle = now * 0.12f + static_cast<float>(spark) * 2.094f;
        glow(TWINKLE, crown + Vec3{std::cos(angle) * 0.5f, 0.0f, std::sin(angle) * 0.5f}, 0.6f, {0.62f, 0.95f, 0.3f}, 1.4f, angle);
      }
  }

  for (const Spell& spell : view.spells) {
    float size = 0.75f;
    engine::Color color{1.0f, 0.78f, 0.35f};
    Particle cell = FLARE;
    switch (spell.kind) {
      case Spell::Kind::seal_bolt: case Spell::Kind::outpost_bolt: size = 0.6f; color = {1.0f, 0.72f, 0.3f}; cell = RUNE; break;
      case Spell::Kind::reserved_bolt: size = 0.7f; color = {1.0f, 0.86f, 0.42f}; break;
      case Spell::Kind::crab: size = 0.85f; color = {0.55f, 0.86f, 1.0f}; cell = RUNE_WIDE; break;
      case Spell::Kind::memory: size = 1.5f; color = {0.62f, 0.86f, 1.0f}; cell = TWIRL; break;
      case Spell::Kind::returned_bolt: size = 0.75f; color = {0.35f, 1.0f, 0.88f}; break;
      case Spell::Kind::blood: size = 0.9f; color = {1.0f, 0.12f, 0.18f}; cell = BURST; break;
      case Spell::Kind::coin: size = 0.55f; color = {1.0f, 0.84f, 0.28f}; cell = TWINKLE; break;
    }
    const float age = static_cast<float>(spell.age);
    glow(SOFT_DOT, spell.position, size * 1.4f, color, 1.0f);
    glow(cell, spell.position, size * 2.2f, color, 1.1f, age * 0.25f);
    // 날아온 쪽으로 옅어지는 꼬리 — 기억 잔상은 길게 끈다
    const float speed = std::sqrt(engine::dot(spell.velocity, spell.velocity));
    if (speed > 0.01f) {
      const float tail = spell.kind == Spell::Kind::memory ? 0.12f : 0.07f;
      streak(spell.position - spell.velocity * tail, spell.position, size * 0.8f, color, 0.9f);
    }
  }
  for (const Outpost& post : view.outposts) {
    // 초소 잔상 — 떠 있는 유적 조각(돌고 맥이 뛰는 빛)과 그 둘레를 도는 돌조각
    const float left = std::clamp(static_cast<float>(post.until - std::min(post.until, view.tick)) / 30.0f, 0.0f, 1.0f);
    const float rise = std::clamp(static_cast<float>(view.tick - post.raised) / 12.0f, 0.0f, 1.0f);
    const float strength = left * rise;
    glow(SOFT_DOT, post.position, (1.8f + 0.3f * pulse) * strength, {0.62f, 0.88f, 1.0f}, 1.0f);
    glow(RUNE_WIDE, post.position, 3.0f * strength, {0.55f, 0.85f, 1.0f}, 0.9f, now * 0.04f);
    for (uint32_t stone = 0; stone < 4; stone++) {
      const float angle = now * 0.04f + static_cast<float>(stone) * 1.5708f;
      glow(STAR, post.position + Vec3{std::cos(angle) * 0.85f, 0.25f * std::sin(angle * 2.0f), std::sin(angle) * 0.85f}, 0.7f * strength, {0.95f, 0.8f, 0.45f}, 1.2f, angle);
    }
  }

  // 쓰러진 적 — 처치의 "탁"(흰-청록 빛과 바닥 고리), 재질의 조각, 사라질 때 덮는 먼지·김 (game/art-work/death-vfx.md). 불·폭발은 쓰지 않는다
  constexpr engine::Color RESONANCE{0.6f, 1.0f, 0.95f};
  constexpr float TURN = 2.0f * std::numbers::pi_v<float>;
  // 시체마다 다른 갈래 — visual_id 는 방마다 겹쳐서 쓰러진 틱을 섞는다
  const auto seed = [](const Enemy& fallen) { return Vec3{static_cast<float>(fallen.visual_id), static_cast<float>(*fallen.death_tick % 65536u), 0.37f}; };
  // 바닥에 눕힌 고리 — 원을 따라 늘인 짧은 줄기 열둘
  const auto ring = [&](Vec3 at, float radius, float strength) {
    for (uint32_t arc = 0; arc < 12; arc++) {
      const float from = static_cast<float>(arc) * TURN / 12.0f, to = from + TURN / 12.0f;
      streak(at + Vec3{std::cos(from) * radius, 0.05f, std::sin(from) * radius}, at + Vec3{std::cos(to) * radius, 0.05f, std::sin(to) * radius}, 0.28f, RESONANCE, strength);
    }
  };
  // 드레이크처럼 공중에서 쓰러진 시체가 바닥에 닿은 틱 — 틱이 바뀔 때만 견주고, 빠진 시체는 잊는다
  const auto same = [](const CorpseFall& fall, const Enemy& fallen) { return fall.id == fallen.visual_id && fall.death == *fallen.death_tick; };
  std::erase_if(falls_, [&](const CorpseFall& fall) { return std::none_of(view.corpses.begin(), view.corpses.end(), [&](const Enemy& fallen) { return fallen.death_tick && same(fall, fallen); }); });
  if (view.tick != falls_tick_)
    for (const Enemy& fallen : view.corpses) {
      if (!fallen.death_tick) continue;
      const auto fall = std::find_if(falls_.begin(), falls_.end(), [&](const CorpseFall& known) { return same(known, fallen); });
      if (fall == falls_.end()) falls_.push_back({.id = fallen.visual_id, .death = *fallen.death_tick, .grounded = fallen.grounded});
      else {
        if (!fall->grounded && fallen.grounded) fall->landed = view.tick;
        fall->grounded = fallen.grounded;
      }
    }
  falls_tick_ = view.tick;

  for (const Enemy& fallen : view.corpses) {
    if (!fallen.death_tick) continue;
    const float age = static_cast<float>(view.tick - *fallen.death_tick);
    const engine::Aabb body = enemy_box(fallen);
    const Vec3 center = (body.min + body.max) * 0.5f, feet = fallen.position, key = seed(fallen);
    const float height = body.max.y - body.min.y;
    const float span = std::max({body.max.x - body.min.x, body.max.z - body.min.z, height});
    // 0–12 틱: 끊긴 공명의 빛과 바닥 고리 (몸 × 1.6 까지)
    if (age < 6.0f) {
      const float left = 1.0f - age / 6.0f;
      glow(FLARE, center, span * 1.3f, RESONANCE, 2.2f * left, scatter(key, 0) * TURN);
      glow(SOFT_DOT, center, span * 0.7f, RESONANCE, 1.6f * left);
    }
    if (age < 12.0f) ring(feet, span * 0.5f * (1.0f + 0.6f * ease_out(age / 12.0f)), 2.2f * (1.0f - age / 12.0f));
    // 재질 — 조각의 그림·색·크기·수, 물이면 더해 그리는 물방울, 사라질 때의 덮개 색
    Particle cell = DIRT;
    engine::Color color{0.42f, 0.46f, 0.32f}, haze{0.72f, 0.75f, 0.66f};
    float size = 0.75f;
    uint32_t count = 4;
    bool water = false;
    switch (fallen.kind) {
      case EnemyKind::caster: cell = SOFT_DOT, color = {0.55f, 0.95f, 0.95f}, haze = {0.88f, 0.97f, 0.98f}, size = 0.24f, count = 6, water = true; break;
      case EnemyKind::spider: color = {0.5f, 0.4f, 0.28f}, haze = {0.76f, 0.66f, 0.52f}, count = 5; break;
      case EnemyKind::bat: color = {0.55f, 0.62f, 0.7f}, haze = {0.76f, 0.8f, 0.84f}, size = 0.6f, count = 4; break;
      default: break;
    }
    // 0–22 틱: 조각이 튀어 바닥으로 떨어진다 (초 단위의 포물선 — 반박 안에 닿게 무겁게 떨어뜨린다)
    if (age < 22.0f) {
      const float seconds = age / 60.0f, k = age / 22.0f, fade = k < 0.6f ? 1.0f : (1.0f - k) / 0.4f;
      for (uint32_t piece = 0; piece < count; piece++) {
        const float angle = static_cast<float>(piece) * TURN / static_cast<float>(count) + scatter(key, piece + 1) * 0.8f;
        const float out = 3.0f + 1.6f * scatter(key, piece + 20), up = (water ? 5.0f : 3.4f) * (0.7f + 0.5f * scatter(key, piece + 40));
        Vec3 at = center + Vec3{std::cos(angle) * out * seconds, up * seconds - 7.5f * seconds * seconds, std::sin(angle) * out * seconds};
        at.y = std::max(at.y, feet.y + 0.05f);
        if (water) glow(cell, at, size, color, 0.9f * fade);
        else chip(cell, at, size, color, fade, angle * 3.0f + age * 0.2f);
        // 무더기 그림만으로는 멀리서 흩어져 버려 — 단단한 알갱이 하나를 얹는다
        if (!water) {
          chip(SOFT_DOT, at, size * 0.45f, {color.red * 0.8f, color.green * 0.8f, color.blue * 0.8f}, fade);
          glow(SOFT_DOT, at, size * 0.6f, RESONANCE, 0.35f * fade);
        }
      }
    }
    // 떨어지는 동안의 옅은 줄기와, 바닥에 닿은 순간의 먼지와 고리
    if (fallen.kind == EnemyKind::bat && !fallen.grounded && age < 60.0f) streak(center, center + Vec3{0.0f, 1.0f, 0.0f}, 0.25f, {0.55f, 0.62f, 0.7f}, 0.5f);
    const auto fall = std::find_if(falls_.begin(), falls_.end(), [&](const CorpseFall& known) { return same(known, fallen); });
    if (fall != falls_.end() && fall->landed && view.tick - *fall->landed < 12) {
      const float k = static_cast<float>(view.tick - *fall->landed) / 12.0f;
      ring(feet, span * 0.5f * (1.0f + 0.6f * ease_out(k)), 1.0f * (1.0f - k));
      chip(PUFF_WIDE, feet + Vec3{0.0f, 0.3f, 0.0f}, span * (0.8f + 0.6f * ease_out(k)), haze, 0.7f * (1.0f - k), scatter(key, 70) * TURN);
    }
    // 90–120 틱: 덮개 — 112 틱에 가장 짙고, 시체가 빠지는 120 틱까지 조금만 엷어진다 (시체는 그동안 바닥 밑으로 — draw_preview)
    if (age >= 90.0f) {
      const float rise = std::clamp((age - 90.0f) / 22.0f, 0.0f, 1.0f);
      // 덮개는 눈 쪽으로 당긴다 — 몸 가운데에 세우면 그보다 앞으로 나온 모델이 덮개 앞에 그려진다
      Vec3 toward = eye - feet;
      toward.y = 0.0f;
      const float distance = std::sqrt(engine::dot(toward, toward));
      const Vec3 base = Vec3{center.x, feet.y, center.z} + (distance > 0.01f ? toward * (std::min(span * 0.6f, distance * 0.5f) / distance) : Vec3{});
      const float cover = ease_out(rise) * (age > 112.0f ? 1.0f - 0.25f * (age - 112.0f) / 8.0f : 1.0f);
      for (uint32_t puff = 0; puff < 3; puff++) {
        const float angle = static_cast<float>(puff) * TURN / 3.0f + scatter(key, 60) * TURN;
        const float puff_size = span * (0.9f + 0.5f * rise);
        const Vec3 at = base + Vec3{std::cos(angle) * span * 0.2f, puff_size * 0.3f + (water ? 0.5f * rise : 0.0f), std::sin(angle) * span * 0.2f};
        chip(puff ? PUFF : PUFF_WIDE, at, puff_size, haze, 0.9f * cover, angle + age * 0.01f);
      }
    }
  }

  // 쓰러진 탁류 정령 — 바위가 솟았다 가라앉고, 마무리를 기다리는 동안 박마다 공명이 한 알씩 빠져나간다
  for (const Enemy& boss : view.enemies) {
    if (boss.kind != EnemyKind::boss || boss.health > 0 || !boss.death_tick) continue;
    const float age = static_cast<float>(view.tick - *boss.death_tick);
    const engine::Aabb body = enemy_box(boss);
    const Vec3 center = (body.min + body.max) * 0.5f, feet = boss.position, key = seed(boss);
    const float span = std::max({body.max.x - body.min.x, body.max.z - body.min.z, body.max.y - body.min.y});
    if (age < 10.0f) {
      glow(FLARE, center, span * 1.2f, RESONANCE, 1.8f * (1.0f - age / 10.0f), scatter(key, 0) * TURN);
      glow(SOFT_DOT, center, span * 0.6f, RESONANCE, 1.2f * (1.0f - age / 10.0f));
    }
    for (uint32_t wave = 0; wave < 2; wave++) {
      const float local = (age - 8.0f * static_cast<float>(wave)) / 30.0f;
      if (local >= 0.0f && local < 1.0f) ring(feet, 1.5f + 7.5f * ease_out(local), (wave ? 1.6f : 3.0f) * (1.0f - local));
    }
    if (age < 40.0f) {
      const float k = age / 40.0f;
      for (uint32_t stone = 0; stone < 10; stone++) {
        const float angle = static_cast<float>(stone) * TURN / 10.0f + scatter(key, stone + 1) * 0.4f;
        const float reach = span * 0.45f * (0.8f + 0.5f * scatter(key, stone + 20));
        const float lift = (1.0f + 1.5f * scatter(key, stone + 40)) * std::sin(std::numbers::pi_v<float> * k);
        chip(DIRT, feet + Vec3{std::cos(angle) * reach, 0.25f + lift, std::sin(angle) * reach}, 1.3f, {0.4f, 0.41f, 0.42f}, std::min(1.0f, (1.0f - k) * 4.0f), angle + age * 0.03f);
        glow(SOFT_DOT, feet + Vec3{std::cos(angle) * reach, 0.25f + lift, std::sin(angle) * reach}, 0.9f, RESONANCE, 0.5f * (1.0f - k));
      }
    }
    if (age < 12.0f)
      for (uint32_t mote = 0; mote < 8; mote++) {
        const float angle = static_cast<float>(mote) * TURN / 8.0f + scatter(key, mote + 80);
        glow(TWINKLE, center + Vec3{std::cos(angle) * span * 0.25f, age * 0.08f, std::sin(angle) * span * 0.25f}, 0.35f, RESONANCE, 1.4f * (1.0f - age / 12.0f), angle);
      }
    if (age < 60.0f) {
      const float k = age / 60.0f;
      for (uint32_t puff = 0; puff < 4; puff++) {
        const float angle = static_cast<float>(puff) * TURN / 4.0f + scatter(key, 90) * TURN;
        chip(PUFF_WIDE, feet + Vec3{std::cos(angle) * span * 0.55f, 0.4f + 0.5f * k, std::sin(angle) * span * 0.55f}, span * 0.9f * (0.6f + 0.4f * k), {0.7f, 0.7f, 0.68f}, 0.7f * std::sin(std::numbers::pi_v<float> * k), angle);
      }
    } else if (view.tick % TICKS_PER_BEAT < TICKS_PER_SLOT) {
      const float k = static_cast<float>(view.tick % TICKS_PER_BEAT) / static_cast<float>(TICKS_PER_SLOT);
      const float angle = scatter(key, static_cast<uint32_t>(view.tick / TICKS_PER_BEAT % 997u) + 100u) * TURN;
      glow(TWINKLE, center + Vec3{std::cos(angle) * span * 0.3f, k * 0.8f - span * 0.1f, std::sin(angle) * span * 0.3f}, 0.4f, RESONANCE, 1.3f * (1.0f - k), angle);
    }
  }

  for (const Flare& flare : view.flares) {
    const float t = static_cast<float>(flare.age) / static_cast<float>(std::max(flare.duration, 1u));
    const float fade = 1.0f - t;
    const Vec3 at = flare.position;
    switch (flare.kind) {
      case Flare::Kind::burst:
        glow(FLARE, at, 1.2f + 2.6f * ease_out(t), {1.0f, 0.9f, 0.6f}, 1.6f * fade, scatter(at, 0) * 6.28f);
        glow(SOFT_DOT, at, 1.4f * fade + 0.2f, {1.0f, 0.75f, 0.4f}, 1.0f);
        break;
      case Flare::Kind::seal:
        glow(RUNE, at + Vec3{0.0f, 0.4f + 1.8f * t, 0.0f}, 2.0f * (0.6f + 0.4f * ease_out(t)), {1.0f, 0.7f, 0.25f}, 1.4f * fade, t * 3.0f);
        break;
      case Flare::Kind::heal:
        glow(SOFT_DOT, at + Vec3{0.0f, 1.2f * t, 0.0f}, 1.6f * fade + 0.2f, {1.0f, 0.15f, 0.2f}, 1.0f);
        glow(TWIRL, at + Vec3{0.0f, 0.8f * t, 0.0f}, 2.4f, {1.0f, 0.25f, 0.3f}, 1.0f * fade, t * 5.0f);
        break;
      case Flare::Kind::guard:
        // 막아 낸 자리 — 플레이어 몸에서도 나므로 화면을 덮지 않게 작게 (바닥 고리는 색 메시)
        glow(FLARE, at, 1.4f * fade, {0.6f, 1.0f, 0.95f}, 1.2f, scatter(at, 0) * 6.28f);
        break;
      case Flare::Kind::fold:
        glow(TWIRL, at, 4.5f, {0.25f, 0.95f, 0.9f}, 0.9f * std::min(1.0f, fade * 4.0f), -static_cast<float>(flare.age) * 0.15f);
        glow(SOFT_DOT, at, 2.2f + 0.4f * pulse, {0.2f, 0.8f, 0.85f}, 0.5f * std::min(1.0f, fade * 4.0f));
        break;
      case Flare::Kind::tracer: {
        // 총알이 지난 길 — 총구에서 맞은 자리까지 뜨거운 흰 줄기가 찰나에 걷힌다
        const Vec3 path = flare.to - at;
        streak(at + path * (0.35f * t), flare.to, 0.09f, {1.0f, 0.9f, 0.7f}, 2.2f * fade);
        streak(at + path * (0.35f * t), flare.to, 0.35f, {1.0f, 0.6f, 0.25f}, 0.5f * fade);
        break;
      }
      case Flare::Kind::impact: {
        // 벽의 자국 — 맞은 자리의 섬광, 거기서 튀는 불티, 피어오르는 돌먼지 (to 는 날아온 쪽)
        const float flash = std::max(0.0f, 1.0f - t * 5.0f);
        glow(FLARE, at, 0.9f + 0.6f * flash, {1.0f, 0.82f, 0.5f}, 2.0f * flash, scatter(at, 0) * 6.28f);
        glow(SOFT_DOT, at, 0.7f, {1.0f, 0.6f, 0.3f}, 1.2f * flash);
        flipbook(SMOKE, 8.0f + t * 40.0f, at - flare.to * (0.25f + 0.4f * t) + Vec3{0.0f, 0.35f * t, 0.0f}, 0.5f + 1.3f * ease_out(t), {0.62f, 0.58f, 0.52f}, 0.65f * fade, scatter(at, 1) * 6.28f);
        const float sparks = std::min(1.0f, t * 2.5f);
        for (uint32_t chip = 0; chip < 6; chip++) {
          const float angle = static_cast<float>(chip) * 1.047f + scatter(at, chip + 2) * 0.8f;
          const Vec3 out = flare.to * -1.6f + Vec3{std::cos(angle) * 1.1f, 0.9f + scatter(at, chip + 9), std::sin(angle) * 1.1f};
          const Vec3 head = at + out * sparks + Vec3{0.0f, -1.4f * sparks * sparks, 0.0f};
          streak(head - out * 0.08f, head, 0.06f, {1.0f, 0.7f, 0.35f}, 2.0f * std::max(0.0f, 1.0f - t * 2.5f));
        }
        break;
      }
      case Flare::Kind::stomp: {
        // 뿌리 발 — 위에서 내리꽂히는 이끼빛 덩어리, 닿는 순간 흙먼지와 튀는 흙
        if (t < 0.35f) {
          const Vec3 head = at + Vec3{0.0f, 4.5f * (1.0f - t / 0.35f) + 0.4f, 0.0f};
          glow(SOFT_DOT, head, 3.0f, {0.5f, 0.75f, 0.25f}, 1.0f);
          streak(head, head + Vec3{0.0f, 3.0f, 0.0f}, 1.2f, {0.45f, 0.7f, 0.25f}, 0.8f);
        } else {
          const float land = (t - 0.35f) / 0.65f;
          flipbook(SMOKE, 6.0f + land * 40.0f, at + Vec3{0.0f, 0.6f + 0.8f * land, 0.0f}, 2.5f + 3.5f * ease_out(land), {0.45f, 0.4f, 0.3f}, 0.8f * (1.0f - land), scatter(at, 1) * 6.28f);
          for (uint32_t clod = 0; clod < 8; clod++) {
            const float angle = static_cast<float>(clod) * 0.785f + scatter(at, clod) * 0.5f;
            const Vec3 head = at + Vec3{std::cos(angle) * 2.5f * land, 1.8f * land - 2.2f * land * land + 0.2f, std::sin(angle) * 2.5f * land};
            glow(DIRT, head, 0.7f * (1.0f - land), {0.55f, 0.65f, 0.35f}, 1.0f, angle);
          }
        }
        break;
      }
    }
  }
}

}  // namespace game
