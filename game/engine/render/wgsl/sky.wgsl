// 하늘 — 등장방형 그림 한 장을 화면 전체에 그린다 (engine/render/sky_batch.hpp). 깊이를 쓰지 않으니 프레임의 맨 처음에 그리고, 장면이 그 위를 덮는다.
// 그림은 이미 화면 값이다 (장면과 같은 노출·톤 곡선을 미리 건 것) — 읽은 색을 그대로 낸다.

struct View {
  // xyz 눈의 오른쪽, w 가로 시야각 절반의 tan
  right: vec4<f32>,
  // xyz 눈의 위쪽, w 세로 시야각 절반의 tan
  up: vec4<f32>,
  // xyz 보는 쪽, w 그림을 y 축으로 돌린 각 (라디안) — 그림의 방위 = 장면의 방위 − 이 값
  forward: vec4<f32>,
  // x 그림의 높이 (픽셀)
  image: vec4<f32>,
}

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var image: texture_2d<f32>;
@group(0) @binding(2) var image_sampler: sampler;

const PI = 3.14159265;

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) screen: vec2<f32>,
}

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> VertexOut {
  var out: VertexOut;
  out.clip = vec4<f32>(position, 1.0, 1.0);
  out.screen = position;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let direction = normalize(view.forward.xyz + view.right.xyz * (in.screen.x * view.right.w) + view.up.xyz * (in.screen.y * view.up.w));
  // 그림의 가운데가 북(-z), 오른쪽이 동(+x), 윗줄이 천정 (tools/skyc.mjs 머리말)
  let u = (atan2(direction.x, -direction.z) - view.forward.w) / (2.0 * PI) + 0.5;
  // 맨 윗줄·아랫줄의 가운데 밖으로는 읽지 않는다 (위아래로는 되풀이되지 않는다)
  let edge = 0.5 / view.image.x;
  let v = clamp(acos(clamp(direction.y, -1.0, 1.0)) / PI, edge, 1.0 - edge);
  // 방위가 한 바퀴 도는 이음매에서 미분이 튀어 밉을 고를 수 없다 — 밉 없이 읽는다
  return vec4<f32>(textureSampleLevel(image, image_sampler, vec2<f32>(u, v), 0.0).rgb, 1.0);
}
