// 장면을 화면에 올린다 — 장면 타깃의 색(engine::gpu::Device::scene_texture)을 캔버스 전체에 한 번 그린다 (engine/render/present_batch.hpp).
// 장면은 화면보다 작게 그려졌을 수 있다 — 픽셀 사이를 선형으로 메워 늘인다. 색은 이미 화면 값이다 (톤 곡선은 장면의 셰이더가 걸었다) — 읽은 그대로 낸다.

@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var scene_sampler: sampler;

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> VertexOut {
  var out: VertexOut;
  out.clip = vec4<f32>(position, 0.0, 1.0);
  // 텍스처의 윗줄이 화면의 위다
  out.uv = vec2<f32>(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  return vec4<f32>(textureSampleLevel(scene, scene_sampler, in.uv, 0.0).rgb, 1.0);
}
