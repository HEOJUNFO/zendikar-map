#pragma once

#include <cstddef>
#include <optional>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"

namespace engine {

/** 색이 칠해진 정점 — 셰이더의 @location(0) position, (1) normal, (2) color (rgb 색, a 가 1 이면 스스로 빛난다) */
struct ColoredVertex {
  float position[3];
  float normal[3];
  float color[4];
};

/**
 * 도형을 조립해 만든 메시 — 삼각형 목록(정점 셋씩, 밖에서 볼 때 반시계 방향)과 부딪히는 상자들.
 * 데이터는 tools/meshc.mjs 가 .mesh.txt 에서 만든 .meshbin 이다
 */
class StaticMesh {
 public:
  /** .meshbin 을 푼다. 형식이 어긋나면 nullopt */
  static std::optional<StaticMesh> decode(std::span<const std::byte> bytes);

  std::span<const ColoredVertex> vertices() const { return vertices_; }
  /** 충돌 상자 — 축에 나란하다 */
  std::span<const Aabb> solids() const { return solids_; }

 private:
  std::vector<ColoredVertex> vertices_;
  std::vector<Aabb> solids_;
};

}  // namespace engine
