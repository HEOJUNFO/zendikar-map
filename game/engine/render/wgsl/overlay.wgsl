// 화면 위 2D — 픽셀 좌표의 색 사각형 (engine/render/overlay.hpp). 왼쪽 위가 (0, 0).

struct Surface {
  // xy: 화면 크기 (픽셀)
  size: vec4<f32>,
}

@group(0) @binding(0) var<uniform> surface: Surface;

struct VertexIn {
  // 0..1 사각형
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  // 인스턴스 — xy 왼쪽 위, zw 크기 (픽셀)
  @location(2) placement: vec4<f32>,
  @location(3) tint: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) tint: vec4<f32>,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let pixel = in.placement.xy + in.position.xy * in.placement.zw;
  let unit = pixel / surface.size.xy;
  // 깊이 판정을 끈 파이프라인으로 그린다 — z 는 클립 범위(0..1) 안이면 된다
  out.clip = vec4<f32>(unit.x * 2.0 - 1.0, 1.0 - unit.y * 2.0, 0.5, 1.0);
  out.tint = in.tint;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.tint.rgb, 1.0);
}
