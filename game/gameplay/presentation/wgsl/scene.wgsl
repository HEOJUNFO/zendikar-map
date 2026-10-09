// 장면 셰이더 — 과녁(상자)과 바닥을 인스턴스로 그린다.

struct Frame {
  view_proj: mat4x4<f32>,
  // x: 박자 맥동 0..1
  params: vec4<f32>,
}

// 지금 겨누고 있는 과녁 — GPU 가 지은 LBVH 에 조준 광선을 쏜 결과 (engine/render/wgsl/lbvh_trace.wgsl 의 Hit)
struct Aim {
  // 과녁 번호(= 인스턴스 번호). 겨눈 것이 없으면 0xffffffff
  primitive: u32,
  distance: f32,
  _padding_0: u32,
  _padding_1: u32,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> aim: Aim;

struct VertexIn {
  @builtin(instance_index) instance: u32,
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  // 인스턴스 — xyz 위치, w 크기
  @location(2) placement: vec4<f32>,
  // 인스턴스 — rgb 색, a 가 1 이면 바닥
  @location(3) tint: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) world: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) tint: vec4<f32>,
  // 1 이면 겨눠진 과녁
  @location(3) @interpolate(flat) aimed: u32,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let world = in.position * in.placement.w + in.placement.xyz;
  out.clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.world = world;
  out.normal = in.normal;
  out.tint = in.tint;
  out.aimed = select(0u, 1u, in.tint.a < 0.5 && in.instance == aim.primitive);
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let pulse = frame.params.x;
  // 화면 미분은 분기 밖에서 구한다 — WGSL 은 픽셀마다 갈리는 분기 안의 미분을 받지 않는다 (naga 는 못 잡고 브라우저가 거절한다)
  let footprint = fwidth(in.world.xz);
  var color = in.tint.rgb;
  if (in.tint.a > 0.5) {
    // 바닥 — 1 단위 격자선, 박자마다 밝아진다
    let cell = abs(fract(in.world.xz - 0.5) - 0.5) / footprint;
    let edge = 1.0 - min(min(cell.x, cell.y), 1.0);
    color = mix(color, vec3<f32>(1.0, 0.72, 0.25), edge * (0.25 + 0.75 * pulse));
  } else {
    let light = max(dot(normalize(in.normal), normalize(vec3<f32>(0.4, 0.8, 0.45))), 0.0);
    color = color * (0.35 + 0.65 * light) * (0.8 + 0.5 * pulse);
    // 겨눠진 과녁은 밝게 뜬다
    if (in.aimed == 1u) {
      color = mix(color, vec3<f32>(1.0, 0.96, 0.82), 0.6);
    }
  }
  // 멀수록 붉은 안개로
  let fog = clamp(length(in.world.xz) / 45.0, 0.0, 1.0);
  return vec4<f32>(mix(color, vec3<f32>(0.22, 0.03, 0.05), fog * fog), 1.0);
}
