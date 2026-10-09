// 겉면 (불투명) — 텍스처를 입힌 메시를 인스턴스로 그린다 (engine/render/surface_batch.hpp). 방의 조각과 소품, 손에 든 것이 나간다.
// 몸통은 include/surface_shade.wgsl 에 있다. 여기는 프래그먼트를 버리지 않는다 (깊이를 먼저 견줘 가려진 픽셀은 셈하지 않는다 — early-Z):
// albedo 의 알파는 잘라 낼 모양이 아니라 1 − 금속성이다. 알파로 잘라 내는 잎은 surface_cutout.wgsl 로 그린다.

#include "color.wgsl"
#include "surface_shade.wgsl"

@fragment
fn fs_main(in: VertexOut, @builtin(front_facing) front: bool) -> @location(0) vec4<f32> {
  let s = sample_surface(in);
  return shade(in, front, s, 1.0 - s.texel.a);
}
