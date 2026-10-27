// 스프라이트 — 텍스처 배열의 층에 놓인 그림(칸의 격자 — 칸 하나가 플립북의 한 프레임)을 장면 속 사각형으로 그린다 (engine/render/sprite_batch).
// 사각형은 눈을 보거나(빌보드 — 화면에서 돌릴 수 있다) 정한 축을 따라 길게 늘어난다(불꽃 줄기·총알의 길 — 축을 품고 눈 쪽으로 돌아선다).
// 그림의 색은 화면 값 그대로다 (밝은 효과는 톤 곡선을 거치지 않는다). 안개만 장면처럼 건다.
// 같은 셰이더를 두 파이프라인이 쓴다: 섞어 그리는 것(연기·폭발 — 알파)과 더해 그리는 것(빛·불꽃 — 세기를 색에 곱해 낸다). 인스턴스의 extra.y 가 1 이면 더한다.

#include "color.wgsl"

struct Frame {
  view_proj: mat4x4<f32>,
  // xyz 눈의 오른쪽·위 (길이 1)
  right: vec4<f32>,
  up: vec4<f32>,
  // xyz 눈의 자리
  eye: vec4<f32>,
  // rgb 안개 색, a 안개가 다 덮는 거리
  fog: vec4<f32>,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var atlas: texture_2d_array<f32>;
@group(0) @binding(2) var atlas_sampler: sampler;

struct VertexIn {
  // 사각형의 귀 (-0.5…0.5)
  @location(0) corner: vec2<f32>,
  // 인스턴스 — xyz 가운데, w 너비 (m)
  @location(1) center: vec4<f32>,
  // xyz 늘이는 축 (0 이면 빌보드), w 축 쪽의 길이 (m)
  @location(2) axis: vec4<f32>,
  // x 층, y 프레임, z 열 수, w 행 수
  @location(3) cell: vec4<f32>,
  // rgb 입히는 색, a 불투명도(섞을 때) · 세기(더할 때)
  @location(4) tint: vec4<f32>,
  // x 화면에서 돌린 각(빌보드), y 1 이면 더해 그린다
  @location(5) extra: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) layer: i32,
  @location(2) tint: vec4<f32>,
  @location(3) depth: f32,
  @location(4) @interpolate(flat) additive: f32,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  var world: vec3<f32>;
  let along = length(in.axis.xyz);
  if (along > 0.0001) {
    let dir = in.axis.xyz / along;
    var side = cross(dir, frame.eye.xyz - in.center.xyz);
    let reach = length(side);
    side = select(frame.right.xyz, side / reach, reach > 0.0001);
    world = in.center.xyz + dir * (in.corner.y * in.axis.w) + side * (in.corner.x * in.center.w);
  } else {
    let c = cos(in.extra.x);
    let s = sin(in.extra.x);
    let turned = vec2<f32>(in.corner.x * c - in.corner.y * s, in.corner.x * s + in.corner.y * c);
    world = in.center.xyz + (frame.right.xyz * turned.x + frame.up.xyz * turned.y) * in.center.w;
  }
  let clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.clip = clip;
  out.depth = clip.w;
  // 칸 — 왼쪽 위부터 줄마다. 귀의 위(+0.5)가 칸의 윗줄이다
  let cols = max(in.cell.z, 1.0);
  let rows = max(in.cell.w, 1.0);
  let index = clamp(floor(in.cell.y), 0.0, cols * rows - 1.0);
  let column = index - cols * floor(index / cols);
  let row = floor(index / cols);
  out.uv = vec2<f32>((column + in.corner.x + 0.5) / cols, (row + 0.5 - in.corner.y) / rows);
  out.layer = i32(in.cell.x);
  out.tint = in.tint;
  out.additive = in.extra.y;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let texel = textureSample(atlas, atlas_sampler, in.uv, in.layer);
  let haze = clamp(in.depth / frame.fog.a, 0.0, 1.0);
  if (in.additive > 0.5) {
    // 더한다 — 그림의 밝기 × 알파 × 세기. 멀수록 안개에 묻혀 옅어진다
    return vec4<f32>(texel.rgb * texel.a * in.tint.rgb * in.tint.a * (1.0 - haze * haze), 1.0);
  }
  let color = with_fog(texel.rgb * in.tint.rgb, frame.fog.rgb, in.depth, frame.fog.a, 0.0);
  return vec4<f32>(color, texel.a * in.tint.a);
}
