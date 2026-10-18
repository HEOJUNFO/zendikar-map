#pragma once

#include <optional>

#include "engine/foundation/math.hpp"

namespace engine {

/**
 * 광선이 삼각형 (a, b, c) 에 닿는 거리 — Möller–Trumbore (Tomas Möller · Ben Trumbore, "Fast, Minimum Storage Ray-Triangle Intersection", Journal of Graphics Tools 2(1), 1997, 21–28).
 * 앞뒤 어느 쪽에서 와도 닿는다 (어느 쪽인지는 부르는 쪽이 법선 cross(b - a, c - a) 와 광선의 방향으로 본다). 가장자리에 걸친 것은 닿은 것이고,
 * 광선과 나란한 삼각형과 광선 뒤쪽의 것은 닿지 않는다
 */
inline std::optional<float> intersect(const Ray& ray, Vec3 a, Vec3 b, Vec3 c) {
  const Vec3 ab = b - a, ac = c - a;
  const Vec3 p = cross(ray.direction, ac);
  const float determinant = dot(ab, p);
  // 나란하다 — 삼각형의 넓이에 견줘 작은 값인지로 본다 (작은 삼각형을 놓치지 않게)
  if (determinant * determinant < 1e-14f * dot(ab, ab) * dot(ac, ac)) return std::nullopt;
  const float inverse = 1.0f / determinant;
  const Vec3 from = ray.origin - a;
  const float u = dot(from, p) * inverse;
  if (u < 0.0f || u > 1.0f) return std::nullopt;
  const Vec3 q = cross(from, ab);
  const float v = dot(ray.direction, q) * inverse;
  if (v < 0.0f || u + v > 1.0f) return std::nullopt;
  const float distance = dot(ac, q) * inverse;
  if (distance < 0.0f) return std::nullopt;
  return distance;
}

}  // namespace engine
