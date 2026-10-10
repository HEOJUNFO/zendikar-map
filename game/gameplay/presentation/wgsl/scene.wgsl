// 던전 셰이더 — 색이 칠해진 메시(적, 투사체)를 인스턴스로 그린다 (gameplay/presentation/scene_view.cpp).
// 노출·톤 곡선·안개는 엔진의 조각(engine/render/wgsl/include/color.wgsl)을 끼워 방(겉면)·원경·손에 든 것과 같이 쓴다 — 한 장면으로 보인다.
// 빛은 그 자리의 프로브(방의 구운 빛에서 — 위·아래 빛과 해가 보이는 정도)다: 그늘에 선 적은 그늘의 빛을 받는다.

#include "color.wgsl"

struct Frame {
  view_proj: mat4x4<f32>,
  // x: 빛나는 색의 세기 (박자에 맞춰 밝아진다)
  params: vec4<f32>,
  // rgb 안개 색, a 안개가 다 덮는 거리
  fog: vec4<f32>,
  // xyz 해가 있는 쪽 (길이 1) · rgb 해의 빛
  sun_direction: vec4<f32>,
  sun_light: vec4<f32>,
}

@group(0) @binding(0) var<uniform> frame: Frame;

struct VertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  // rgb 색, a 가 1 이면 스스로 빛난다
  @location(2) color: vec4<f32>,
  // 인스턴스 — xyz 자리, w 보는 쪽 (yaw: 0 은 -z, 양수는 오른쪽)
  @location(3) placement: vec4<f32>,
  // x 크기, y 기울기, w 다음 저작 포즈와의 보간율. z=1 충격파 효과의 w 는 실제 반지름(m).
  @location(4) pose: vec4<f32>,
  // 인스턴스 — rgb 덧입히는 색, a 그 정도
  @location(5) tint: vec4<f32>,
  // 인스턴스 — 그 자리의 빛: rgb 위를 보는 면이 받는 빛, a 해가 보이는 정도 · rgb 아래를 보는 면이 받는 빛
  @location(6) light_up: vec4<f32>,
  @location(7) light_down: vec4<f32>,
  @location(8) next_position: vec3<f32>,
  @location(9) next_normal: vec3<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) color: vec4<f32>,
  @location(2) tint: vec4<f32>,
  // 눈에서의 거리 (보는 방향으로)
  @location(3) depth: f32,
  @location(4) @interpolate(flat) light_up: vec4<f32>,
  @location(5) @interpolate(flat) light_down: vec4<f32>,
}

// x 축으로 젖히고(tilt) y 축으로 돌린다(yaw)
fn turned(v: vec3<f32>, tilt: f32, yaw: f32) -> vec3<f32> {
  let leaned = vec3<f32>(v.x, v.y * cos(tilt) - v.z * sin(tilt), v.y * sin(tilt) + v.z * cos(tilt));
  return vec3<f32>(leaned.x * cos(yaw) - leaned.z * sin(yaw), leaned.y, leaned.x * sin(yaw) + leaned.z * cos(yaw));
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let blend = select(in.pose.w, 0.0, in.pose.z == 1.0);
  var position = mix(in.position, in.next_position, blend);
  // Only the shockwave effect's unit ring expands; authored creature poses remain untouched.
  if (in.pose.z == 1.0) {
    let radius = length(position.xz);
    let band = select(-0.65, 0.65, radius > 1.0);
    position.x = position.x / radius * max(0.0, in.pose.w + band);
    position.z = position.z / radius * max(0.0, in.pose.w + band);
  }
  let normal = normalize(mix(in.normal, in.next_normal, blend));
  let world = turned(position * in.pose.x, in.pose.y, in.placement.w) + in.placement.xyz;
  let clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.clip = clip;
  out.normal = turned(normal, in.pose.y, in.placement.w);
  out.color = in.color;
  out.tint = in.tint;
  out.depth = clip.w;
  out.light_up = in.light_up;
  out.light_down = in.light_down;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  // 그 자리에 드는 해와, 위아래에서 그늘진 면을 채우는 빛
  let normal = normalize(in.normal);
  let albedo = srgb_to_linear(in.color.rgb);
  let lit = albedo * lit_by(normal, in.light_up.rgb, in.light_down.rgb, frame.sun_direction.xyz, frame.sun_light.rgb * in.light_up.a);
  let glowing = albedo * frame.params.x * EMISSIVE;
  var color = to_display(mix(lit, glowing, in.color.a));
  // 예고·피격의 색은 화면 값에 그대로 덧입힌다 (신호의 색이 조명에 따라 달라지지 않게). 면의 밝기를 조금 남겨 모양이 읽힌다
  let sun = max(dot(normal, frame.sun_direction.xyz), 0.0);
  color = mix(color, in.tint.rgb * (0.75 + 0.25 * sun), in.tint.a);
  return vec4<f32>(with_fog(color, frame.fog.rgb, in.depth, frame.fog.a, in.color.a), 1.0);
}
