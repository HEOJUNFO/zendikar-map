// Shared UV topology, evaluated author rig poses. Only positions and normals change.
struct PoseVertexIn {
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
  @location(11) blend: f32,
  @location(12) next_position: vec3<f32>,
  @location(13) next_normal: vec3<f32>,
}

@vertex
fn vs_main(in: PoseVertexIn) -> VertexOut {
  return surface_vertex(VertexIn(mix(in.position, in.next_position, in.blend), normalize(mix(in.normal, in.next_normal, in.blend)),
      in.uv, in.lightmap_uv, in.color, in.layer, in.model_x, in.model_y, in.model_z, in.light_up, in.light_down));
}
