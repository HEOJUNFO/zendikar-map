#pragma once

#include <cstdint>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/spatial/lbvh.hpp"
#include "gameplay/domain/rhythm.hpp"

// 게임 시뮬레이션 — 고정 틱으로만 나아가고, 같은 입력이면 어디서나 같은 결과가 나온다.
// GPU·화면·오디오 장치를 모른다 (서버가 같은 코드를 Node 에서 돌린다 — tests/sim_probe.cpp 가 그렇게 돌려 본다).
namespace game {

/** 과녁 — 원점 둘레를 도는 상자 */
struct Target {
  float orbit_radius;
  float orbit_height;
  /** 처음 각도 (라디안) — 0 은 +x, -π/2 는 -z(처음 보는 쪽) */
  float orbit_phase;
  /** 초당 라디안 */
  float orbit_speed;
  float half_extent;
};

struct Player {
  engine::Vec3 position{0.0f, 1.6f, 0.0f};
  float yaw{};
  float pitch{};
};

struct FireResult {
  Judgement judgement;
  /** 박자에 맞았고 과녁에도 맞았다 */
  bool hit;
  uint32_t score;
  uint32_t combo;
};

class World {
 public:
  /** 틱 하나의 길이 (초) */
  static constexpr double TICK = 1.0 / 60.0;

  explicit World(std::vector<Target> targets, uint32_t seed = 1);
  /** 과녁을 seed 로 정해진 자리에 흩어 놓은 세계 */
  static World scattered(uint32_t target_count, uint32_t seed);

  /** 틱 하나만큼 나아간다 */
  void step();
  /** 시선을 돌린다 (라디안). pitch 는 위아래 끝에서 멈춘다 */
  void look(float delta_yaw, float delta_pitch);
  /** 지금 보는 쪽으로 쏜다. 박자에서 벗어났으면 나가지 않는다 */
  FireResult fire();

  const Player& player() const { return player_; }
  const Conductor& conductor() const { return conductor_; }
  std::span<const Target> targets() const { return targets_; }
  /** 지금 틱에서 과녁들의 가운데 — targets() 와 같은 차례. 다음 step·fire 까지만 유효하다 */
  std::span<const engine::Vec3> target_centers() const;
  /** 지금까지 지난 틱 수 */
  uint64_t tick() const { return tick_; }
  uint32_t score() const { return score_; }
  uint32_t combo() const { return combo_; }

 private:
  uint32_t random();
  float random_range(float from, float to);
  Target random_target();

  std::vector<Target> targets_;
  Player player_;
  Conductor conductor_;
  uint64_t tick_{};
  uint32_t rng_;
  uint32_t score_{};
  uint32_t combo_{};
  // 지금 틱의 과녁 위치 — 틱마다 처음 물을 때 한 번 계산한다 (발사 판정과 화면이 같이 쓴다)
  mutable std::vector<engine::Vec3> centers_;
  mutable bool centers_stale_{true};
  // 쏠 때마다 다시 짓는 히트스캔 구조와 그 입력
  engine::Lbvh bvh_;
  std::vector<engine::Aabb> boxes_;
};

}  // namespace game
