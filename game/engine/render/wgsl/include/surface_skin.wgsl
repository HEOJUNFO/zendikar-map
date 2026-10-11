// Physics palette maps the immutable bind model directly to world space.
struct DualQuaternion { real: vec4<f32>, dual: vec4<f32>, }
struct SkinPalette { bones: array<DualQuaternion, 32>, }
@group(0) @binding(7) var<uniform> skin: SkinPalette;

struct SkinVertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) lightmap_uv: vec2<f32>,
  @location(4) color: vec4<f32>,
  @location(5) layer: f32,
  @location(6) model_x: vec4<f32>,
  @location(7) model_y: vec4<f32>,
  @location(8) model_z: vec4<f32>,
  @location(9) light_up: vec4<f32>,
  @location(10) light_down: vec4<f32>,
  @location(12) joints0: vec4<f32>,
  @location(13) weights0: vec4<f32>,
  @location(14) joints1: vec4<f32>,
  @location(15) weights1: vec4<f32>,
}

@vertex
fn vs_main(in: SkinVertexIn) -> VertexOut {
  let joints = array<f32, 8>(in.joints0.x, in.joints0.y, in.joints0.z, in.joints0.w, in.joints1.x, in.joints1.y, in.joints1.z, in.joints1.w);
  let weights = array<f32, 8>(in.weights0.x, in.weights0.y, in.weights0.z, in.weights0.w, in.weights1.x, in.weights1.y, in.weights1.z, in.weights1.w);
  var reference = skin.bones[u32(joints[0])].real;
  var greatest = weights[0];
  for (var i = 1u; i < 8u; i++) {
    if (weights[i] > greatest) { reference = skin.bones[u32(joints[i])].real; greatest = weights[i]; }
  }
  var real = vec4<f32>(0.0);
  var dual = vec4<f32>(0.0);
  for (var i = 0u; i < 8u; i++) {
    let bone = skin.bones[u32(joints[i])];
    let weight = weights[i] * select(1.0, -1.0, dot(reference, bone.real) < 0.0);
    real += bone.real * weight;
    dual += bone.dual * weight;
  }
  let norm = length(real);
  real /= norm;
  dual /= norm;
  dual -= real * dot(real, dual);
  let translation = 2.0 * (real.w * dual.xyz - dual.w * real.xyz + cross(real.xyz, dual.xyz));
  let position = in.position + 2.0 * cross(real.xyz, cross(real.xyz, in.position) + real.w * in.position) + translation;
  let normal = normalize(in.normal + 2.0 * cross(real.xyz, cross(real.xyz, in.normal) + real.w * in.normal));
  return surface_vertex(VertexIn(position, normal, in.uv, in.lightmap_uv, in.color, in.layer,
      in.model_x, in.model_y, in.model_z, in.light_up, in.light_down));
}
