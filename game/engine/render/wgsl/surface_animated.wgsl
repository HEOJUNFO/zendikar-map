#include "color.wgsl"
#include "surface_shade.wgsl"
#include "surface_pose.wgsl"

@fragment
fn fs_main(in: VertexOut, @builtin(front_facing) front: bool) -> @location(0) vec4<f32> {
  let s = sample_surface(in);
  return shade(in, front, s, 1.0 - s.texel.a);
}
