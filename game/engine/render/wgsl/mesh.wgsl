// 색이 칠해진 메시 — 삼각형 목록을 그대로 그린다 (engine/render/mesh_batch.hpp). 메시 하나가 그리기 호출 하나다.

#include "color.wgsl"

struct View {
  view_proj: mat4x4<f32>,
  // 모델 공간 → 세계
  model: mat4x4<f32>,
  // rgb 안개 색 (화면 값), a 안개가 다 덮는 거리
  fog: vec4<f32>,
  // x 빛나는 색의 세기, y 깊이 배율 (1 이면 그대로. 1 보다 작으면 그만큼 앞으로 당겨 그린다 — 손에 든 것이 벽에 묻히지 않게)
  params: vec4<f32>,
  // xyz 해가 있는 쪽 (길이 1) · rgb 해의 빛 · rgb 위를 보는 면이 받는 빛 · rgb 아래를 보는 면이 받는 빛
  sun_direction: vec4<f32>,
  sun_light: vec4<f32>,
  up_light: vec4<f32>,
  down_light: vec4<f32>,
}

@group(0) @binding(0) var<uniform> view: View;

struct VertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  // rgb 색, a 가 1 이면 스스로 빛난다
  @location(2) color: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) color: vec4<f32>,
  // 눈에서의 거리 (보는 방향으로)
  @location(2) depth: f32,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let clip = view.view_proj * (view.model * vec4<f32>(in.position, 1.0));
  out.clip = vec4<f32>(clip.xy, clip.z * view.params.y, clip.w);
  out.normal = (view.model * vec4<f32>(in.normal, 0.0)).xyz;
  out.color = in.color;
  out.depth = clip.w;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  // 해와, 위아래에서 그늘진 면을 채우는 빛
  let albedo = srgb_to_linear(in.color.rgb);
  let lit = albedo * lit_by(normalize(in.normal), view.up_light.rgb, view.down_light.rgb, view.sun_direction.xyz, view.sun_light.rgb);
  let glowing = albedo * view.params.x * EMISSIVE;
  let color = to_display(mix(lit, glowing, in.color.a));
  return vec4<f32>(with_fog(color, view.fog.rgb, in.depth, view.fog.a, in.color.a), 1.0);
}
