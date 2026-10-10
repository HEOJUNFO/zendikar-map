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

// 지금 겨누고 있는 적 — GPU 가 지은 LBVH 에 조준 광선을 쏜 결과 (engine/render/wgsl/lbvh_trace.wgsl 의 Hit)
struct Aim {
  // 적의 번호. 겨눈 것이 없으면 0xffffffff
  primitive: u32,
  distance: f32,
  _padding_0: u32,
  _padding_1: u32,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> aim: Aim;

struct VertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  // rgb 색, a 가 1 이면 스스로 빛난다
  @location(2) color: vec4<f32>,
  // 인스턴스 — xyz 자리, w 보는 쪽 (yaw: 0 은 -z, 양수는 오른쪽)
  @location(3) placement: vec4<f32>,
  // 인스턴스 — x 크기, y 뒤로 젖힌 각(음수면 앞으로 숙인다), z 겨눔 번호 (음수면 겨눌 수 없는 것)
  @location(4) pose: vec4<f32>,
  // 인스턴스 — rgb 덧입히는 색, a 그 정도
  @location(5) tint: vec4<f32>,
  // 인스턴스 — 그 자리의 빛: rgb 위를 보는 면이 받는 빛, a 해가 보이는 정도 · rgb 아래를 보는 면이 받는 빛
  @location(6) light_up: vec4<f32>,
  @location(7) light_down: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) color: vec4<f32>,
  @location(2) tint: vec4<f32>,
  // 눈에서의 거리 (보는 방향으로)
  @location(3) depth: f32,
  // 1 이면 겨눠진 적
  @location(4) @interpolate(flat) aimed: u32,
  @location(5) @interpolate(flat) light_up: vec4<f32>,
  @location(6) @interpolate(flat) light_down: vec4<f32>,
}

// x 축으로 젖히고(tilt) y 축으로 돌린다(yaw)
fn turned(v: vec3<f32>, tilt: f32, yaw: f32) -> vec3<f32> {
  let leaned = vec3<f32>(v.x, v.y * cos(tilt) - v.z * sin(tilt), v.y * sin(tilt) + v.z * cos(tilt));
  return vec3<f32>(leaned.x * cos(yaw) - leaned.z * sin(yaw), leaned.y, leaned.x * sin(yaw) + leaned.z * cos(yaw));
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let world = turned(in.position * in.pose.x, in.pose.y, in.placement.w) + in.placement.xyz;
  let clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.clip = clip;
  out.normal = turned(in.normal, in.pose.y, in.placement.w);
  out.color = in.color;
  out.tint = in.tint;
  out.depth = clip.w;
  out.aimed = select(0u, 1u, in.pose.z >= 0.0 && u32(in.pose.z) == aim.primitive);
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
  // 예고·피격의 색과 겨눔은 화면 값에 그대로 덧입힌다 (신호의 색이 조명에 따라 달라지지 않게). 면의 밝기를 조금 남겨 모양이 읽힌다
  let sun = max(dot(normal, frame.sun_direction.xyz), 0.0);
  color = mix(color, in.tint.rgb * (0.75 + 0.25 * sun), in.tint.a);
  // 겨눠진 적은 밝게 뜬다
  if (in.aimed == 1u) {
    color = mix(color, vec3<f32>(1.0, 0.96, 0.82), 0.4);
  }
  return vec4<f32>(with_fog(color, frame.fog.rgb, in.depth, frame.fog.a, in.color.a), 1.0);
}
