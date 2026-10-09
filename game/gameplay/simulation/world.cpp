#include "gameplay/simulation/world.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>
#include <utility>

namespace game {
namespace {

constexpr float PITCH_LIMIT = 1.5f;
constexpr float FIRE_RANGE = 200.0f;
constexpr uint32_t PERFECT_SCORE = 100;
constexpr uint32_t GOOD_SCORE = 50;

}  // namespace

World::World(std::vector<Target> targets, uint32_t seed) : targets_(std::move(targets)), rng_(seed ? seed : 1) {}

World World::scattered(uint32_t target_count, uint32_t seed) {
  World world({}, seed);
  world.targets_.reserve(target_count);
  for (uint32_t i = 0; i < target_count; i++) world.targets_.push_back(world.random_target());
  return world;
}

// xorshift32 — 표준 분포는 구현마다 결과가 달라 클라이언트와 서버가 어긋난다
uint32_t World::random() {
  rng_ ^= rng_ << 13;
  rng_ ^= rng_ >> 17;
  rng_ ^= rng_ << 5;
  return rng_;
}

float World::random_range(float from, float to) { return from + (to - from) * (static_cast<float>(random() >> 8) / 16777216.0f); }

Target World::random_target() {
  const float direction = (random() & 1u) ? 1.0f : -1.0f;
  return {
      .orbit_radius = random_range(6.0f, 30.0f),
      .orbit_height = random_range(0.8f, 7.0f),
      .orbit_phase = random_range(0.0f, 2.0f * std::numbers::pi_v<float>),
      .orbit_speed = direction * random_range(0.05f, 0.35f),
      .half_extent = random_range(0.35f, 0.8f),
  };
}

std::span<const engine::Vec3> World::target_centers() const {
  if (centers_stale_) {
    const float time = static_cast<float>(static_cast<double>(tick_) * TICK);
    centers_.resize(targets_.size());
    for (std::size_t i = 0; i < targets_.size(); i++) {
      const Target& target = targets_[i];
      const float angle = target.orbit_phase + target.orbit_speed * time;
      centers_[i] = {target.orbit_radius * std::cos(angle), target.orbit_height, target.orbit_radius * std::sin(angle)};
    }
    centers_stale_ = false;
  }
  return centers_;
}

void World::step() {
  tick_++;
  conductor_.advance(TICK);
  centers_stale_ = true;
}

void World::look(float delta_yaw, float delta_pitch) {
  if (!std::isfinite(delta_yaw) || !std::isfinite(delta_pitch)) return;
  player_.yaw = std::remainder(player_.yaw + delta_yaw, 2.0f * std::numbers::pi_v<float>);
  player_.pitch = std::clamp(player_.pitch + delta_pitch, -PITCH_LIMIT, PITCH_LIMIT);
}

FireResult World::fire() {
  const Judgement judgement = conductor_.judge();
  bool hit = false;
  if (judgement != Judgement::miss) {
    const std::span<const engine::Vec3> centers = target_centers();
    boxes_.resize(targets_.size());
    for (std::size_t i = 0; i < targets_.size(); i++) {
      const float h = targets_[i].half_extent;
      boxes_[i] = {centers[i] - engine::Vec3{h, h, h}, centers[i] + engine::Vec3{h, h, h}};
    }
    bvh_.build(boxes_);
    const engine::Ray ray{player_.position, engine::forward_from(player_.yaw, player_.pitch)};
    if (const auto found = bvh_.raycast(ray, FIRE_RANGE)) {
      hit = true;
      // 맞은 과녁은 새 자리에서 다시 나온다
      targets_[found->primitive] = random_target();
      centers_stale_ = true;
    }
  }
  if (hit) {
    combo_++;
    score_ += judgement == Judgement::perfect ? PERFECT_SCORE : GOOD_SCORE;
  } else {
    combo_ = 0;
  }
  return {judgement, hit, score_, combo_};
}

}  // namespace game
