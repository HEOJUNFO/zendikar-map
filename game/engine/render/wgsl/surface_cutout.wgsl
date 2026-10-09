// 겉면 (잘라 내기) — 잎처럼 albedo 의 알파로 잘라 내는 양면의 겉 (engine/render/surface_batch.hpp 의 SurfaceDraw::two_sided).
// 몸통은 include/surface_shade.wgsl — surface.wgsl 과 같은 셈이고, 알파가 반보다 낮은 프래그먼트를 버리는 것만 다르다 (금속성은 없다).

#include "color.wgsl"
#include "surface_shade.wgsl"

@fragment
fn fs_main(in: VertexOut, @builtin(front_facing) front: bool) -> @location(0) vec4<f32> {
  // 텍스처와 미분은 버리기 전에 읽는다
  let s = sample_surface(in);
  if (in.layer >= 0.0 && s.texel.a < 0.5) {
    discard;
  }
  return shade(in, front, s, 0.0);
}
