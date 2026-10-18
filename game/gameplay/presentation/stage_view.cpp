#include "gameplay/presentation/stage_view.hpp"

#include <cmath>
#include <numbers>
#include <span>

#include "engine/foundation/log.hpp"
#include "engine/spatial/static_mesh.hpp"
#include "gameplay/content/assets.hpp"
#include "gameplay_shaders.generated.hpp"

namespace game {
namespace {

// 안개(하늘빛)가 다 덮는 거리 — 원경은 먼 산이 하늘빛에 잠기고, 손에 든 총은 안개를 받지 않을 만큼 가깝다
constexpr float BACKDROP_FOG = 1100.0f;
constexpr float WEAPON_FOG = 260.0f;
// 방 번호 하나마다 원경이 도는 각 (라디안) — 황금각이라 열 방이 고르게 흩어진다
constexpr float BACKDROP_TURN = 2.4f;
// 총은 장면과 따로 제 시야각으로 그린다 — 옵션의 시야각(60…110)이나 대시의 넓어짐에 총이 일그러지지 않는다
constexpr float WEAPON_FOV = 50.0f * std::numbers::pi_v<float> / 180.0f;
constexpr float WEAPON_NEAR = 0.02f, WEAPON_FAR = 8.0f;
// 세계보다 늘 앞에 그려지게 당기는 깊이 배율
constexpr float WEAPON_DEPTH = 0.01f;
// 손에 든 것의 빛이 선 자리의 빛을 따라가는 빠르기 — 프레임마다 남은 차이의 이만큼 (그늘을 드나들 때 열 프레임쯤에 걸쳐 바뀐다)
constexpr float WEAPON_LIGHT_FOLLOW = 0.2f;
// 섬광이 가장 밝을 때 총에 더하는 빛 (따뜻한 빛 — 위·아래를 보는 면 모두에). 그 두세 틱의 총에만 얹는 값이다: 그림자도, 방을 비추는 셈도 없다
constexpr engine::Vec3 FLASH_LIGHT{1.5f, 0.9f, 0.4f};

// 섬광의 사각형 — 삼각형 둘, 가운데가 0 이고 변이 ±1 (wgsl/flash.wgsl 의 @location(0))
constexpr float FLASH_QUAD[] = {-1.0f, -1.0f, 1.0f, -1.0f, 1.0f, 1.0f, -1.0f, -1.0f, 1.0f, 1.0f, -1.0f, 1.0f};
constexpr engine::gpu::VertexAttribute FLASH_ATTRIBUTES[] = {{0, 2, 0}};
constexpr engine::gpu::VertexBufferLayout FLASH_LAYOUTS[] = {{2 * sizeof(float), engine::gpu::VertexStep::vertex, FLASH_ATTRIBUTES}};
constexpr uint32_t FLASH_BINDING = 0;

}  // namespace

bool StageView::create(engine::gpu::Device& device, engine::ShaderLibrary& shaders) {
  const auto backdrop = engine::StaticMesh::decode(assets::skyclave_backdrop());
  if (!backdrop) {
    engine::log_error("[stage] 메시 에셋을 읽지 못했다");
    return false;
  }
  static_assert(sizeof(FlashUniforms) == 96);
  // 섬광은 더하기만 한다 — 깊이는 견주기만 하고(총에 가린 곳은 그리지 않는다) 쓰지 않는다
  flash_pipeline_ =
      device.create_pipeline({.shader = shaders.resolve(shaders.add(shaders::flash)), .vertex_buffers = FLASH_LAYOUTS, .depth_test = true, .additive_blend = true, .depth_write = false});
  flash_uniforms_ = device.create_buffer({engine::gpu::BufferUsage::uniform, sizeof(FlashUniforms)});
  flash_vertices_ = device.create_buffer({engine::gpu::BufferUsage::vertex, sizeof FLASH_QUAD, FLASH_QUAD});
  return sky_.create(device, shaders) && backdrop_.create(device, shaders, backdrop->vertices()) && weapon_.create(device, shaders, WEAPON_PARTS) && flash_pipeline_ && flash_uniforms_ &&
         flash_vertices_;
}

void StageView::draw_sky(engine::gpu::Device& device, const World& world, const Camera& camera, const Scenery& scenery) {
  // 하늘은 방의 돌림만큼 돌린다 — 빛을 틀의 좌표에서 구웠으니, 창 밖의 해가 바닥의 빛 조각과 같은 쪽에 있어야 한다
  sky_.draw(device, {camera.forward, camera.right, camera.up, camera.tan_x, camera.tan_y, room_sky_yaw(world.floor().rooms[world.room()])}, scenery.sky(), scenery.sky_height());
}

void StageView::draw_backdrop(engine::gpu::Device& device, const World& world, const Camera& camera) {
  // 방마다 원경을 다른 쪽으로 돌려 놓는다 — 방은 저마다 다른 하늘에 떠 있다 (창 밖에 보이는 것이 방마다 다르다)
  const float turn = static_cast<float>(world.room()) * BACKDROP_TURN;
  const engine::Mat4 around = engine::Mat4::from_basis({std::cos(turn), 0.0f, std::sin(turn)}, {0.0f, 1.0f, 0.0f}, {-std::sin(turn), 0.0f, std::cos(turn)}, {});
  // 원경에는 구운 빛이 없다 — 가리는 것 없는 곳의 빛으로, 해는 그 방의 하늘과 같은 쪽에서. 하늘빛은 창으로 드는 몫을 키우기 전의 값이다 (키운 값으로는 헤드론이 음영 없이 하얗게 뜬다)
  const float outdoors = 1.0f / sky::SKY_GAIN;
  backdrop_.draw(device, {camera.view_proj, around, SKY_COLOR, BACKDROP_FOG, 1.0f, 1.0f, room_sun(world.floor().rooms[world.room()]), sky::SUN_LIGHT, sky::UP_LIGHT * outdoors, sky::DOWN_LIGHT * outdoors});
}

void StageView::draw_weapon(engine::gpu::Device& device, const World& world, const Camera& camera, const ViewMotion& motion, const Scenery& scenery, float alpha) {
  // 손에 든 총 — 눈에 붙어 다닌다. 쏘면 슬라이드가 물러나며 들리고, 재장전에는 탄창이 빠지고 든다 (weapon.hpp).
  // 걸음에는 눈과 반대로 흔들리고, 시선·착지·대시에는 뒤처졌다 따라온다 (motion.weapon)
  animator_.follow(world);
  flash_.reset();
  const std::span<const Scenery::Prop> parts = scenery.weapon_parts();
  if (scenery.state() != Scenery::State::ready || parts.size() != WEAPON_PARTS) return;
  const WeaponPlacement placement = place_weapon(animator_.pose(world, alpha), motion.weapon, beat_phase(world.tick()));
  // 총은 플레이어가 선 자리의 빛을 받는다 — 그늘에 들면 총도 그늘진다 (프로브 격자는 틀의 좌표다)
  const Room& room = world.floor().rooms[world.room()];
  const RoomLight* light = scenery.room_lights().body;
  weapon_light_ = toward(weapon_light_, light ? light->at(room.to_shape(world.player().position), OPEN_LIGHT) : OPEN_LIGHT, WEAPON_LIGHT_FOLLOW);
  // 눈 공간 → 세계 (빛은 세계의 해에서 든다), 그리고 제 시야각의 투영
  const engine::Mat4 eye = engine::Mat4::from_basis(camera.right, camera.up, camera.forward * -1.0f, camera.eye);
  const engine::Mat4 proj = engine::Mat4::perspective(WEAPON_FOV, static_cast<float>(device.width()) / static_cast<float>(device.height()), WEAPON_NEAR, WEAPON_FAR);
  const engine::Mat4 view_proj = proj * engine::Mat4::look_along(camera.eye, camera.forward, camera.up);
  // 섬광의 두세 틱 동안은 총이 그 빛을 받는다 (따라가는 빛에 얹기만 한다 — 섬광이 꺼지면 바로 본래 빛이다)
  LightProbe light_now = weapon_light_;
  if (placement.flash) {
    const float glow = placement.flash->glow;
    const float add[] = {FLASH_LIGHT.x * glow, FLASH_LIGHT.y * glow, FLASH_LIGHT.z * glow};
    for (int c = 0; c < 3; c++) {
      light_now.up[c] += add[c];
      light_now.down[c] += add[c];
    }
    flash_ = FlashUniforms{proj.m, {placement.flash->at.x, placement.flash->at.y, placement.flash->at.z, placement.flash->size}, {glow, placement.flash->turn, WEAPON_DEPTH, 0.0f}};
  }
  std::array<engine::SurfaceInstance, WEAPON_PARTS> instances{};
  std::array<engine::SurfaceDraw, WEAPON_PARTS> draws{};
  uint32_t count = 0;
  const auto add = [&](WeaponPart part, const engine::Mat4& model) {
    const Scenery::Prop& mesh = parts[static_cast<std::size_t>(part)];
    instances[count] = lit(eye * model, light_now);
    draws[count] = {.vertices = mesh.vertices,
                    .vertex_count = mesh.vertex_count,
                    .albedo = scenery.weapon_textures(),
                    .nar = scenery.weapon_nars(),
                    .lightmap = {},
                    .direction = {},
                    .two_sided = mesh.two_sided,
                    .cutout = mesh.cutout,
                    .first_instance = count,
                    .instance_count = 1};
    count++;
  };
  add(WeaponPart::body, placement.body);
  add(WeaponPart::slide, placement.slide);
  if (placement.magazine) add(placement.magazine_empty ? WeaponPart::magazine_empty : WeaponPart::magazine, *placement.magazine);
  weapon_.draw(device, {view_proj, SKY_COLOR, WEAPON_FOG, 1.0f, WEAPON_DEPTH, room_sun(room), sky::SUN_LIGHT, camera.eye}, std::span{instances}.first(count), std::span{draws}.first(count));
}

void StageView::draw_flash(engine::gpu::Device& device) {
  if (!flash_) return;
  device.write_buffer(flash_uniforms_, std::as_bytes(std::span{&*flash_, 1}));
  const engine::gpu::BufferHandle buffers[] = {flash_vertices_};
  const engine::gpu::BufferBinding bindings[] = {{FLASH_BINDING, flash_uniforms_}};
  device.draw({.pipeline = flash_pipeline_, .vertex_buffers = buffers, .bindings = bindings, .vertex_count = 6, .instance_count = 1});
}

}  // namespace game
