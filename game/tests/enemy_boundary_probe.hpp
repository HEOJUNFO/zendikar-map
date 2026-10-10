#pragma once

#include <array>
#include <cmath>
#include <cstdio>
#include <numbers>
#include <optional>

#include "gameplay/simulation/world.hpp"

namespace enemy_boundary_probe {

// Independent authored room footprints (make-rooms.mjs): flight over the nave's
// abyss is valid, but a creature on the other side of a wall is outside the room.
inline bool inside(uint8_t shape, float x, float z) {
  constexpr float epsilon = 1e-4f;
  const auto rect = [&](float x0, float z0, float x1, float z1) {
    return x >= x0 - epsilon && x <= x1 + epsilon && z >= z0 - epsilon && z <= z1 + epsilon;
  };
  switch (shape) {
    case 1: return rect(-16, -16, 16, 16);
    case 2: return rect(-9, -16, 9, 16);
    case 3: return rect(-6, -16, 6, 6) || rect(6, -6, 16, 6);
    case 4: return rect(-6, -16, 6, 16) || rect(-16, -6, 16, 6);
    case 5: return rect(-16, -6, 16, 6) || rect(-6, 6, 6, 16);
    default: return false;
  }
}

inline int run(const game::RoomKit& kit) {
  bool entered = true, clear = true, contained = true, reachable = true, alive = true;
  bool spider_attack = false, bat_attack = false, upper_spawn = false;
  bool wall_crawl = false, bat_motion = false, deterministic = true;
  uint32_t cases = 0, diagnostics = 0;
  constexpr uint32_t seeds[]{7, 131, 557, 1103};
  const auto same_vector = [](engine::Vec3 a, engine::Vec3 b) { return a.x == b.x && a.y == b.y && a.z == b.z; };
  const auto same_trace = [&](const game::World& a, const game::World& b) {
    if (a.tick() != b.tick() || a.room() != b.room() || a.player().health != b.player().health || !same_vector(a.player().position, b.player().position) ||
        a.enemies().size() != b.enemies().size() || a.projectiles().size() != b.projectiles().size() || a.event_count() != b.event_count()) return false;
    for (std::size_t i = 0; i < a.enemies().size(); ++i) {
      const game::Enemy& x = a.enemies()[i];
      const game::Enemy& y = b.enemies()[i];
      if (x.kind != y.kind || !same_vector(x.position, y.position) || !same_vector(x.wall_normal, y.wall_normal) || !same_vector(x.aim, y.aim) ||
          x.act != y.act || x.act_ticks != y.act_ticks || x.health != y.health || x.hover_height != y.hover_height) return false;
    }
    for (std::size_t i = 0; i < a.projectiles().size(); ++i) {
      const game::Projectile& x = a.projectiles()[i];
      const game::Projectile& y = b.projectiles()[i];
      if (x.kind != y.kind || x.age != y.age || !same_vector(x.position, y.position) || !same_vector(x.velocity, y.velocity)) return false;
    }
    const uint64_t from = a.event_count() > game::World::EVENT_CAPACITY ? a.event_count() - game::World::EVENT_CAPACITY : 0;
    for (uint64_t at = from; at < a.event_count(); ++at) {
      const auto x = a.event(at), y = b.event(at);
      if (!x || !y || x->kind != y->kind || x->enemy != y->enemy || x->tick != y->tick || !same_vector(x->at, y->at)) return false;
    }
    return true;
  };
  const auto diagnose = [&](const char* what, const game::Room& room, game::Direction door, uint32_t seed, const game::World& world, const game::Enemy& enemy) {
    if (diagnostics++ >= 8) return;
    std::printf("enemy boundary: %s shape=%u turn=%u door=%u seed=%u tick=%llu kind=%u at=(%.4f,%.4f,%.4f) normal=(%.1f,%.1f,%.1f)\n", what,
                room.shape, room.turn, static_cast<unsigned>(door), seed, static_cast<unsigned long long>(world.tick()), static_cast<unsigned>(enemy.kind),
                enemy.position.x, enemy.position.y, enemy.position.z, enemy.wall_normal.x, enemy.wall_normal.y, enemy.wall_normal.z);
  };
  for (uint8_t shape = 1; shape < game::SHAPE_COUNT; ++shape)
    for (uint8_t turn = 0; turn < 4; ++turn)
      for (const game::Direction door : {game::NORTH, game::EAST, game::SOUTH, game::WEST})
        for (const uint32_t seed : seeds) {
          game::Room room{.x = 0, .z = 0, .doors = static_cast<uint8_t>(1u << door), .shape = shape, .turn = turn, .depth = 1,
                          .chargers = 0, .casters = 0, .spiders = 2, .bats = 2};
          if (!room.site(door)) continue;
          const game::Direction outgoing = game::opposite(door);
          room.x = static_cast<int8_t>(game::DIRECTION_X[outgoing]);
          room.z = static_cast<int8_t>(game::DIRECTION_Z[outgoing]);
          const game::Room start{.x = 0, .z = 0, .doors = static_cast<uint8_t>(1u << outgoing), .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0};
          game::World world(game::Floor{{start, room}}, kit, seed);
          // One case also runs the same public input in a twin, comparing the
          // actual creature/projectile/event trace at every tick without copying it.
          std::optional<game::World> twin;
          if (cases == 0) twin.emplace(game::Floor{{start, room}}, kit, seed);
          for (int tick = 0; tick < 60; ++tick) { world.step(); if (twin) twin->step(); }
          world.look(static_cast<float>(outgoing) * std::numbers::pi_v<float> / 2.0f, 0.0f);
          if (twin) twin->look(static_cast<float>(outgoing) * std::numbers::pi_v<float> / 2.0f, 0.0f);
          world.move(1.0f, 0.0f);
          if (twin) twin->move(1.0f, 0.0f);
          for (int tick = 0; tick < 600 && world.room() == 0; ++tick) { world.step(); if (twin) twin->step(); }
          world.move(0.0f, 0.0f);
          if (twin) twin->move(0.0f, 0.0f);
          ++cases;
          entered = entered && world.room() == 1 && world.enemies().size() == 4;
          std::array<engine::Vec3, 4> spawned{};
          for (std::size_t i = 0; i < world.enemies().size() && i < spawned.size(); ++i) spawned[i] = world.enemies()[i].position;
          bool case_clear = true, case_contained = true, case_reachable = true;
          for (int tick = 0; tick <= 2400; ++tick) {
            if (twin) deterministic = deterministic && same_trace(world, *twin);
            for (std::size_t i = 0; i < world.enemies().size(); ++i) {
              const game::Enemy& enemy = world.enemies()[i];
              if (i < spawned.size()) {
                const engine::Vec3 moved = enemy.position - spawned[i];
                const bool displaced = engine::dot(moved, moved) > 0.01f; // More than 10 cm: stationary actors cannot satisfy this.
                wall_crawl = wall_crawl || (enemy.kind == game::EnemyKind::spider && engine::dot(enemy.wall_normal, enemy.wall_normal) > 0.5f && displaced);
                bat_motion = bat_motion || (enemy.kind == game::EnemyKind::bat && displaced);
              }
              const engine::Aabb body = game::enemy_box(enemy);
              const bool body_clear = !world.stage().overlaps(body);
              const engine::Aabb canonical = game::turned(body, static_cast<game::Direction>((4 - turn) % 4));
              const bool finite = std::isfinite(enemy.position.x) && std::isfinite(enemy.position.y) && std::isfinite(enemy.position.z);
              const bool body_inside = finite && body.min.y >= -0.01f && body.max.y <= 9.01f &&
                  inside(shape, canonical.min.x, canonical.min.z) && inside(shape, canonical.min.x, canonical.max.z) &&
                  inside(shape, canonical.max.x, canonical.min.z) && inside(shape, canonical.max.x, canonical.max.z);
              if (case_clear && !body_clear) diagnose("solid overlap", room, door, seed, world, enemy);
              if (case_contained && !body_inside) diagnose("outside authored interior", room, door, seed, world, enemy);
              case_clear = case_clear && body_clear;
              case_contained = case_contained && body_inside;
              if (tick == 0 && enemy.position.y > 3.5f) upper_spawn = true;
            }
            if (tick == 2400) break;
            // A living stationary target on the arrival platform exercises flight,
            // crawling and attacks for forty seconds without shooting actors away.
            world.heal_player(world.max_health());
            if (twin) twin->heal_player(twin->max_health());
            const uint64_t cursor = world.event_count();
            world.step();
            if (twin) twin->step();
            alive = alive && world.outcome() == game::World::Outcome::playing;
            for (uint64_t at = cursor; at < world.event_count(); ++at) {
              const auto event = world.event(at);
              if (!event || event->kind != game::WorldEvent::Kind::windup || (event->enemy != game::EnemyKind::spider && event->enemy != game::EnemyKind::bat)) continue;
              spider_attack = spider_attack || event->enemy == game::EnemyKind::spider;
              bat_attack = bat_attack || event->enemy == game::EnemyKind::bat;
              for (const game::Enemy& enemy : world.enemies()) {
                if (enemy.kind != event->enemy || enemy.position.x != event->at.x || enemy.position.y != event->at.y || enemy.position.z != event->at.z) continue;
                const engine::Aabb body = game::enemy_box(enemy);
                const engine::Vec3 center = (body.min + body.max) * 0.5f;
                const engine::Vec3 aim = world.player().position - center;
                const float distance = std::sqrt(engine::dot(aim, aim));
                const bool sight = distance < 0.01f || !world.stage().raycast({center, aim * (1.0f / distance)}, distance - 1e-4f);
                if (case_reachable && !sight) diagnose("attack behind solid", room, door, seed, world, enemy);
                case_reachable = case_reachable && sight;
              }
            }
          }
          clear = clear && case_clear;
          contained = contained && case_contained;
          reachable = reachable && case_reachable;
        }
  int failures = 0;
  const auto expect = [&](bool ok, const char* text) { if (!ok) { std::printf("FAIL: %s\n", text); ++failures; } };
  expect(cases == 240 && entered, "거미·박쥐: 실제 틀 다섯·돌림 넷·모든 문·시드 넷의 240개 방을 공개 포털 이동으로 들어간다");
  expect(clear, "거미·박쥐: 실제 몸 전체가 생성 직후와 2400틱 동안 벽·기둥·위층 바닥 속에 겹치지 않는다");
  expect(contained, "거미·박쥐: 몸 전체가 방의 실제 ㄱ·십자·T·긴 홀 내부에 남고 허공 아래로 떨어지지 않는다");
  expect(reachable && spider_attack && bat_attack, "거미·박쥐: 두 종류 모두 공격하며 시작 시 실제 몸의 가운데와 플레이어 사이에 벽이 없다");
  expect(alive && upper_spawn, "거미·박쥐: 위층에서 나온 적도 포함하고 실제 적의 움직임을 40초 동안 끝까지 검증한다");
  expect(wall_crawl && bat_motion, "실제 벽에 붙은 거미는 기어 움직이고 박쥐도 생성 자리에서 10cm 넘게 이동한다 (정지한 적은 실패)");
  expect(deterministic, "같은 시드·공개 입력의 두 세계는 2400틱 동안 거미·박쥐·투사체·공격 사건의 실제 추적이 같다");
  return failures;
}

}  // namespace enemy_boundary_probe
