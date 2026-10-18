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
  let result=skin_deform_mixed(in.position,in.normal,joints,weights);
  return surface_vertex(VertexIn(result.position, result.normal, in.uv, in.lightmap_uv, in.color, in.layer,
      in.model_x, in.model_y, in.model_z, in.light_up, in.light_down));
}
