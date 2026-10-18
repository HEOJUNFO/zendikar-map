// Shared by the actual vertex shader and its GPU readback regression.
struct DualQuaternion { real: vec4<f32>, dual: vec4<f32>, }
// A finite convex mixture of real rig poses, shared with precise CPU shots.
struct SkinPalette { bones: array<DualQuaternion,1152>, weights:array<vec4<f32>,3>, configuration:vec4<u32>, root:vec4<f32>, }
@group(0) @binding(7) var<uniform> skin: SkinPalette;
struct SkinResult { position: vec3<f32>, normal: vec3<f32>, }
fn skin_deform_at(position_in:vec3<f32>,normal_in:vec3<f32>,joints:array<f32,8>,weights:array<f32,8>,offset:u32)->SkinResult {
  var reference = skin.bones[offset+u32(joints[0])].real;
  var greatest = weights[0];
  for (var i = 1u; i < 8u; i++) {
    if (weights[i] > greatest) { reference = skin.bones[offset+u32(joints[i])].real; greatest = weights[i]; }
  }
  var real = vec4<f32>(0.0);
  var dual = vec4<f32>(0.0);
  for (var i = 0u; i < 8u; i++) {
    let bone = skin.bones[offset+u32(joints[i])];
    let weight = weights[i] * select(1.0, -1.0, dot(reference, bone.real) < 0.0);
    real += bone.real * weight;
    dual += bone.dual * weight;
  }
  let norm = length(real);
  real /= norm;
  dual /= norm;
  dual -= real * dot(real, dual);
  let translation = 2.0 * (real.w * dual.xyz - dual.w * real.xyz + cross(real.xyz, dual.xyz));
  let position = position_in + 2.0 * cross(real.xyz, cross(real.xyz, position_in) + real.w * position_in) + translation;
  let normal = normalize(normal_in + 2.0 * cross(real.xyz, cross(real.xyz, normal_in) + real.w * normal_in));
  return SkinResult(position,normal);
}
fn skin_deform(position_in:vec3<f32>,normal_in:vec3<f32>,joints:array<f32,8>,weights:array<f32,8>)->SkinResult {
  return skin_deform_at(position_in,normal_in,joints,weights,0u);
}
fn skin_deform_mixed(position_in:vec3<f32>,normal_in:vec3<f32>,joints:array<f32,8>,weights:array<f32,8>)->SkinResult {
  var position=vec3<f32>(0.0);var normal=vec3<f32>(0.0);
  for(var pose=0u;pose<skin.configuration.x;pose++){
    let result=skin_deform_at(position_in,normal_in,joints,weights,pose*skin.configuration.y);
    let weight=skin.weights[pose/4u][pose%4u];position+=result.position*weight;normal+=result.normal*weight;
  }
  // Root direction is a common rigid transform after local skin mixing.
  // Averaging differently rotated vertex surfaces would collapse a half-turn.
  position=vec3<f32>(skin.root.x*position.x-skin.root.y*position.z,position.y,skin.root.y*position.x+skin.root.x*position.z);
  normal=vec3<f32>(skin.root.x*normal.x-skin.root.y*normal.z,normal.y,skin.root.y*normal.x+skin.root.x*normal.z);
  return SkinResult(position,normalize(normal));
}
