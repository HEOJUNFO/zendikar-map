// 화면 위 2D 의 그림 — 픽셀 좌표의 사각형에 그림(rgba)의 한 부분을 입힌다 (engine/render/overlay.hpp). 왼쪽 위가 (0, 0).
// 인스턴스 속성은 overlay.wgsl 과 같다 — 같은 버퍼의 한 구간을 그린다.

struct Surface {
  // xy: 화면 크기 (픽셀). zw 는 쓰지 않는다 (글리프 아틀라스의 크기)
  size: vec4<f32>,
}

@group(0) @binding(0) var<uniform> surface: Surface;
@group(0) @binding(1) var picture: texture_2d<f32>;
@group(0) @binding(2) var picture_sampler: sampler;

struct VertexIn {
  // 0..1 사각형
  @location(0) position: vec3<f32>,
  // 인스턴스 — xy 왼쪽 위, zw 크기 (화면 픽셀)
  @location(1) placement: vec4<f32>,
  // 입힐 그림의 부분 — xy 왼쪽 위, zw 크기 (그림 픽셀)
  @location(2) cell: vec4<f32>,
  // 그림에 곱하는 색 (끝 색과 방향은 쓰지 않는다)
  @location(3) tint: vec4<f32>,
  @location(4) tint_end: vec4<f32>,
  @location(5) fade: f32,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) tint: vec4<f32>,
  @location(1) uv: vec2<f32>,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let pixel = in.placement.xy + in.position.xy * in.placement.zw;
  let unit = pixel / surface.size.xy;
  out.clip = vec4<f32>(unit.x * 2.0 - 1.0, 1.0 - unit.y * 2.0, 0.5, 1.0);
  out.tint = in.tint;
  out.uv = (in.cell.xy + in.position.xy * in.cell.zw) / vec2<f32>(textureDimensions(picture));
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  return textureSample(picture, picture_sampler, in.uv) * in.tint;
}
