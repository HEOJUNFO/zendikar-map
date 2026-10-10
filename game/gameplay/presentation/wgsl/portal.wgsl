// Portal membrane over opaque black depth. Narrow emissive currents and the
// arch rim carry rune light; the interior remains translucent and dark.

#include "color.wgsl"

struct Frame {
  view_proj: mat4x4<f32>,
  // x: 시간 (초), y: 박자의 맥 (박의 머리에서 1, 곧 잦아든다)
  params: vec4<f32>,
}

@group(0) @binding(0) var<uniform> frame: Frame;

struct VertexIn {
  // 북쪽 문에 놓은 막의 자리 (방 가운데가 원점)
  @location(0) position: vec3<f32>,
  // yaw, opening amount, visited, opaque black backing
  @location(1) door: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  // 막 위의 자리 — x 는 문의 가운데에서 옆으로, y 는 문지방에서 위로 (m)
  @location(0) at: vec2<f32>,
  @location(1) open: f32,
  @location(2) visited: f32,
  @location(3) @interpolate(flat) backing: f32,
}

// 문의 폭의 절반, 문설주 머리의 높이, 아치 꼭대기의 높이 (portal_view.cpp 의 막과 같다)
const HALF_WIDTH = 2.0;
const SHOULDER = 5.9;
const APEX = 6.95;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let yaw = in.door.x;
  // Black depth sits 18 cm behind the visible membrane, inside the recess.
  let p = in.position + vec3<f32>(0.0, 0.0, -0.18 * in.door.w);
  let world = vec3<f32>(p.x * cos(yaw) - p.z * sin(yaw), p.y, p.x * sin(yaw) + p.z * cos(yaw));
  out.clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.at = in.position.xy;
  out.open = in.door.y;
  out.visited = in.door.z;
  out.backing = in.door.w;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  if (in.backing > 0.5) { return vec4<f32>(0.0, 0.0, 0.0, 1.0); }
  let t = frame.params.x;
  let middle = vec2<f32>(0.0, 3.2);
  var p = (in.at - middle) * vec2<f32>(1.0, 0.72);
  p += 0.22 * vec2<f32>(sin(p.y * 2.3 + t * 0.8), cos(p.x * 2.6 - t * 0.7));
  let radius = length(p);
  let angle = atan2(p.y, p.x);
  let swell = 0.5 + 0.5 * sin(p.x * 2.1 + t * 0.7) * cos(p.y * 1.9 - t * 0.9);
  let current = pow(0.5 + 0.5 * sin(radius * 6.0 - angle * 2.0 - t * 1.8), 18.0);
  let fine = pow(0.5 + 0.5 * sin(p.x * 10.0 + p.y * 4.0 + t * 0.6), 24.0);

  // Narrow emissive core at the membrane's contact with the stone arch.
  let roof = APEX - abs(in.at.x) * (APEX - SHOULDER) / HALF_WIDTH;
  let edge = max(min(min(HALF_WIDTH - abs(in.at.x), in.at.y), roof - in.at.y), 0.0);
  let rim = exp(-18.0 * edge) + 0.14 * exp(-3.0 * edge);
  let hue = mix(vec3<f32>(0.006, 0.68, 0.40), vec3<f32>(0.009, 0.37, 0.72), in.visited);
  let interior = mix(vec3<f32>(0.002, 0.035, 0.026), vec3<f32>(0.002, 0.022, 0.045), in.visited);
  let energy = 1.0 + 0.16 * frame.params.y;
  let emission = (interior * (0.7 + 0.5 * swell) + hue * (0.42 * current + 0.08 * fine + 1.65 * rim)) * energy;

  // Preserve the existing radial 0.5-second publication of the portal.
  let reach = length((in.at - middle) / vec2<f32>(HALF_WIDTH, 3.6)) + 0.05 * sin(p.x * 3.0 + p.y * 2.0);
  let front = in.open * 1.6 - reach;
  let veil = smoothstep(0.0, 0.12, front);
  let lip = (1.0 - smoothstep(0.0, 0.4, front)) * (1.0 - in.open);
  let alpha = veil * clamp(0.14 + 0.18 * swell + 0.22 * current + 0.50 * rim + 0.15 * lip, 0.0, 0.88);
  return vec4<f32>(to_display(emission * EMISSIVE), alpha);
}
