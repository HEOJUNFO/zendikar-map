#pragma once

#include <array>
#include <cmath>

// 열 우선(column-major) 4×4 행렬과 3차원 벡터 — 오른손 좌표
namespace engine {

struct Vec3 {
  float x{}, y{}, z{};

  constexpr Vec3 operator+(Vec3 o) const { return {x + o.x, y + o.y, z + o.z}; }
  constexpr Vec3 operator-(Vec3 o) const { return {x - o.x, y - o.y, z - o.z}; }
  constexpr Vec3 operator*(float s) const { return {x * s, y * s, z * s}; }
};

constexpr float dot(Vec3 a, Vec3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
constexpr Vec3 cross(Vec3 a, Vec3 b) { return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x}; }
inline Vec3 normalize(Vec3 v) {
  const float len = std::sqrt(dot(v, v));
  return len > 0.0f ? v * (1.0f / len) : v;
}

/** 보는 방향 — yaw 0 은 -z, 양수 yaw 는 오른쪽(+x), 양수 pitch 는 위 */
inline Vec3 forward_from(float yaw, float pitch) {
  return {std::sin(yaw) * std::cos(pitch), std::sin(pitch), -std::cos(yaw) * std::cos(pitch)};
}

struct Aabb {
  Vec3 min, max;
};

struct Ray {
  Vec3 origin;
  /** 길이 1 */
  Vec3 direction;
};

struct Mat4 {
  // m[열 * 4 + 행]
  std::array<float, 16> m{};

  /** 세로 시야각(라디안)·가로세로비·가까운 면·먼 면. 보는 쪽은 -z, 클립 z 는 가까운 면 0 · 먼 면 1 (WebGPU 규약) */
  static Mat4 perspective(float fov_y, float aspect, float near, float far) {
    Mat4 r;
    const float f = 1.0f / std::tan(fov_y * 0.5f);
    r.m[0] = f / aspect;
    r.m[5] = f;
    r.m[10] = far / (near - far);
    r.m[11] = -1.0f;
    r.m[14] = far * near / (near - far);
    return r;
  }

  /** eye 에서 forward(길이 1) 쪽을 본다 */
  static Mat4 look_along(Vec3 eye, Vec3 forward, Vec3 up) {
    const Vec3 s = normalize(cross(forward, up));
    const Vec3 u = cross(s, forward);
    Mat4 r;
    r.m[0] = s.x;
    r.m[4] = s.y;
    r.m[8] = s.z;
    r.m[1] = u.x;
    r.m[5] = u.y;
    r.m[9] = u.z;
    r.m[2] = -forward.x;
    r.m[6] = -forward.y;
    r.m[10] = -forward.z;
    r.m[12] = -dot(s, eye);
    r.m[13] = -dot(u, eye);
    r.m[14] = dot(forward, eye);
    r.m[15] = 1.0f;
    return r;
  }

  constexpr Mat4 operator*(const Mat4& b) const {
    Mat4 r;
    for (int col = 0; col < 4; col++)
      for (int row = 0; row < 4; row++) {
        float sum = 0.0f;
        for (int k = 0; k < 4; k++) sum += m[k * 4 + row] * b.m[col * 4 + k];
        r.m[col * 4 + row] = sum;
      }
    return r;
  }
};

}  // namespace engine
