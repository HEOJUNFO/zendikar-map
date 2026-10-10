// 포털 셰이더 — 문틀(돌 아치) 속에 서는 흐릿하고 출렁이는 막 (gameplay/presentation/portal_view.cpp).
// 무늬는 텍스처 없이 겹친 물결로 낸다: 막 위의 자리를 두 번 일그러뜨린 뒤 너울과 동심 물결을 얹는다. 반투명이라 뒤의 하늘이 흐리게 비친다.
// 색은 헤드론의 힘을 떠올리게 하는 밝은 청록(안 가 본 방)과 하늘빛(가 본 방) — 어둡거나 붉게 가지 않는다.
// 스스로 빛나는 막이라 조명은 받지 않지만, 장면의 다른 것과 같은 노출·톤 곡선을 지난다 (engine/render/wgsl/include/color.wgsl).

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
  // 인스턴스 — x 문이 난 쪽 (yaw: 0 은 북쪽, 양수는 시계 방향), y 열린 정도 0..1, z 가 본 방으로 가는가 (0 또는 1)
  @location(1) door: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  // 막 위의 자리 — x 는 문의 가운데에서 옆으로, y 는 문지방에서 위로 (m)
  @location(0) at: vec2<f32>,
  @location(1) open: f32,
  @location(2) visited: f32,
}

// 문의 폭의 절반, 문설주 머리의 높이, 아치 꼭대기의 높이 (portal_view.cpp 의 막과 같다)
const HALF_WIDTH = 2.0;
const SHOULDER = 5.9;
const APEX = 6.95;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let yaw = in.door.x;
  let world = vec3<f32>(in.position.x * cos(yaw) - in.position.z * sin(yaw), in.position.y, in.position.x * sin(yaw) + in.position.z * cos(yaw));
  out.clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.at = in.position.xy;
  out.open = in.door.y;
  out.visited = in.door.z;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let t = frame.params.x;
  // 막 위의 자리를 두 겹으로 일그러뜨린다 — 서로 다른 빠르기의 물결이 엇갈려 흐른다
  var p = in.at * 0.9;
  p += 0.42 * vec2<f32>(sin(p.y * 1.6 + t * 1.3), cos(p.x * 1.8 - t * 1.1));
  p += 0.24 * vec2<f32>(sin(p.y * 3.3 - t * 1.9 + p.x), cos(p.x * 2.9 + t * 1.6));
  // 천천히 오르내리는 너울과 가운데에서 번져 나가는 동심 물결
  let swell = 0.5 + 0.5 * sin(p.x * 2.1 + t * 0.7) * cos(p.y * 1.9 - t * 0.9);
  let middle = vec2<f32>(0.0, 3.2);
  let ring = 0.5 + 0.5 * sin(length(p - middle * 0.9) * 3.4 - t * 2.6);
  let crest = pow(ring, 4.0);

  let deep = mix(vec3<f32>(0.34, 0.80, 0.78), vec3<f32>(0.52, 0.76, 0.94), in.visited);
  let pale = mix(vec3<f32>(0.86, 1.0, 0.95), vec3<f32>(0.92, 0.97, 1.0), in.visited);
  // 무늬의 대비는 낮게 둔다 — 또렷한 결이 아니라 흐릿한 막으로 읽히게
  var color = mix(deep, pale, 0.3 + 0.4 * swell + 0.15 * ring);
  color += vec3<f32>(0.14 * crest + 0.06 * frame.params.y);

  // 문틀에 닿는 가장자리는 밝게 번진다 — 문설주, 문지방, 아치의 두 들보까지의 거리
  let roof = APEX - abs(in.at.x) * (APEX - SHOULDER) / HALF_WIDTH;
  let edge = min(min(HALF_WIDTH - abs(in.at.x), in.at.y), roof - in.at.y);
  let rim = exp(-3.0 * max(edge, 0.0));
  color = mix(color, vec3<f32>(0.95, 1.0, 0.98), 0.75 * rim);

  // 열리는 동안에는 가운데에서 출렁이며 번져 나온다 — 번지는 끝이 희게 빛난다
  let reach = length((in.at - middle) / vec2<f32>(HALF_WIDTH, 3.6)) + 0.05 * sin(p.x * 3.0 + p.y * 2.0);
  let front = in.open * 1.6 - reach;
  let veil = smoothstep(0.0, 0.12, front);
  let lip = (1.0 - smoothstep(0.0, 0.4, front)) * (1.0 - in.open);
  color = mix(color, vec3<f32>(1.0, 1.0, 1.0), lip);

  let alpha = veil * clamp(0.62 + 0.22 * swell + 0.12 * crest + 0.3 * rim + 0.3 * lip, 0.0, 0.95);
  return vec4<f32>(to_display(srgb_to_linear(color) * EMISSIVE), alpha);
}
