#pragma once

#include <span>

namespace engine {

/** 메시 정점 — 셰이더의 @location(0) position, @location(1) normal */
struct MeshVertex {
  float position[3];
  float normal[3];
};

/** z=0 평면의 0..1 정사각형, 삼각형 목록 */
std::span<const MeshVertex> unit_quad();

}  // namespace engine
