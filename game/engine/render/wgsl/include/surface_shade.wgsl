// 겉면의 몸통 — 겉면 셰이더 둘(surface.wgsl: 불투명한 겉, surface_cutout.wgsl: 알파로 잘라 내는 잎)이 끼워 쓴다. 앞에 color.wgsl 이 끼워져 있어야 한다.
// 재질은 텍스처 배열 둘이다: albedo(색 — AO 는 손질 때 색에 곱해 두었다. 알파는 불투명한 겉에서는 1 − 금속성, 잎에서는 잘라 낼 모양)와
//   NAR(rg = 접선 공간 법선의 xy(OpenGL 식 — 초록이 그림의 위쪽), b = 거칠기). 접선 틀은 정점에 싣지 않고 화면 미분에서 얻는다 (uv 가 있는 면이면 어느 메시든 된다).
// 빛은 인스턴스마다 둘 가운데 하나다 — 실행 중에 광원·그림자를 셈하지 않는다:
//   구운 것 — 라이트맵(면이 받는 빛)과 방향 맵(그 빛이 주로 오는 쪽 rgb, 한쪽으로 쏠린 정도 a — engine/bake/lightbake). 요철은
//     빛 × mix(1, max(n·d, 0) ÷ max(n₀·d, ¼), a) 로 살린다 (n 은 법선 맵을 얹은 법선, n₀ 은 면의 법선). 거칠기에 따라 d 쪽에서 오는 빛의 약한 반사광(Blinn-Phong)을 더한다
//   프로브 — 그 자리의 위·아래 빛과 해가 보이는 정도 (라이트맵이 없는 것: 소품, 움직이는 것). 같은 법선으로 lit_by_along 을 부르고 반사광은 해 쪽에서
// 셈은 모두 모델 공간에서 한다 (구운 방향이 메시의 좌표라서) — 정점 셰이더가 눈·해·위쪽을 모델 공간으로 옮겨 준다. 크기가 고른 변환만 온다.
// 프래그먼트마다 텍스처 읽기는 넷이다: albedo, NAR, 라이트맵, 방향 맵.

// 라이트맵의 텍셀 = sqrt(빛 ÷ LIGHT_RANGE) (engine/bake/lightbake.hpp 의 LIGHT_RANGE)
const LIGHT_RANGE = 4.0;
// 단색 색유리의 층 (engine/spatial/surface_mesh.hpp 의 LAYER_GLASS) 과 그 밝기 — 제 색의 이 배로 빛난다 (프레임의 빛나는 세기와 무관하다)
const LAYER_GLASS = -2.0;
const GLASS_GLOW = 1.15;
// 텍스처를 입힌 색유리(정점 색의 a 가 2 — surface_mesh.hpp 의 GLASS_PANE)의 유리 조각이 내는 빛 — 창 밖의 하늘빛 × 유리의 색.
// 낮의 유리가 톤 곡선에서 하얗게 타지 않고 색이 남는 세기다 (노출 0.42 에서 밝은 조각이 화면 값 0.7 쯤)
const PANE_LIGHT = 1.9;
// 텍스처 없는 면의 거칠기, 법선 맵이 빛을 키울 수 있는 상한, 구운 방향과 면이 이루는 각의 하한(스치는 빛에서 나눗셈이 튀지 않게)
const PLAIN_ROUGHNESS = 0.85;
const RELIEF_MAX = 2.0;
const GRAZE_MIN = 0.25;
// 거칠기의 하한 (매끈한 유리의 번쩍임이 픽셀보다 잘게 깜박이지 않게), 금속이 받는 빛을 줄이는 몫 —
// 둘레가 비치는 것(반사 프로브)을 셈하지 않으므로 금속을 검게 두지 않고 받는 빛의 대부분을 제 색으로 되비치게 둔다 (번들거림은 반사광이 얹는다)
// 법선 맵의 기울기에 곱하는 배 — 사방에서 고르게 드는 구운 간접광에서는 요철이 실제보다 덜 드러나 조금 과장한다
const RELIEF_STRENGTH = 1.4;
const ROUGHNESS_MIN = 0.12;
const METAL_DIM = 0.35;

struct Frame {
  view_proj: mat4x4<f32>,
  // rgb 안개 색 (화면 값), a 안개가 다 덮는 거리
  fog: vec4<f32>,
  // x 빛나는 색의 세기 (1 이 본래 세기), y 깊이 배율 (1 이면 그대로. 1 보다 작으면 그만큼 앞으로 당겨 그린다 — 손에 든 것이 벽에 묻히지 않게)
  params: vec4<f32>,
  // xyz 해가 있는 쪽 (길이 1)
  sun_direction: vec4<f32>,
  // rgb 해의 빛 (해를 똑바로 보는 면이 받는 빛)
  sun_light: vec4<f32>,
  // xyz 눈의 자리 (세계)
  eye: vec4<f32>,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var albedo: texture_2d_array<f32>;
@group(0) @binding(2) var material_sampler: sampler;
@group(0) @binding(3) var lightmap: texture_2d<f32>;
@group(0) @binding(4) var lightmap_sampler: sampler;
@group(0) @binding(5) var nar: texture_2d_array<f32>;
@group(0) @binding(6) var light_direction: texture_2d<f32>;

struct VertexIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) lightmap_uv: vec2<f32>,
  // rgb 텍스처에 곱하는 색 (화면 값으로 적은 것), a 가 1 이면 스스로 빛난다, 2 면 텍스처를 입힌 색유리다
  @location(4) color: vec4<f32>,
  // 텍스처 배열의 층. 음수면 텍스처 없이 색만
  @location(5) layer: f32,
  // 인스턴스 — 모델 공간 → 세계의 3×4 행렬 (줄 셋)
  @location(6) model_x: vec4<f32>,
  @location(7) model_y: vec4<f32>,
  @location(8) model_z: vec4<f32>,
  // 인스턴스 — rgb 위를 보는 면이 받는 빛, a 해가 보이는 정도 (프로브)
  @location(9) light_up: vec4<f32>,
  // 인스턴스 — rgb 아래를 보는 면이 받는 빛, a 가 1 이면 프로브 대신 라이트맵을 쓴다
  @location(10) light_down: vec4<f32>,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  // 모델 공간의 법선과, 그 점에서 눈으로 가는 벡터 (모델 공간)
  @location(0) normal: vec3<f32>,
  @location(1) to_eye: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) lightmap_uv: vec2<f32>,
  @location(4) color: vec4<f32>,
  @location(5) @interpolate(flat) layer: f32,
  // 눈에서의 거리 (보는 방향으로)
  @location(6) depth: f32,
  @location(7) @interpolate(flat) light_up: vec4<f32>,
  @location(8) @interpolate(flat) light_down: vec4<f32>,
  // 모델 공간에서 해가 있는 쪽, 위쪽 (길이 1)
  @location(9) @interpolate(flat) sun: vec3<f32>,
  @location(10) @interpolate(flat) up: vec3<f32>,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let local = vec4<f32>(in.position, 1.0);
  let world = vec3<f32>(dot(in.model_x, local), dot(in.model_y, local), dot(in.model_z, local));
  let clip = frame.view_proj * vec4<f32>(world, 1.0);
  out.clip = vec4<f32>(clip.xy, clip.z * frame.params.y, clip.w);
  // 세계 → 모델: 크기가 고른 변환(s·R)의 역은 전치 ÷ s²
  let toward = frame.eye.xyz - vec3<f32>(in.model_x.w, in.model_y.w, in.model_z.w);
  let scale2 = dot(in.model_x.xyz, in.model_x.xyz);
  let eye = (in.model_x.xyz * toward.x + in.model_y.xyz * toward.y + in.model_z.xyz * toward.z) / scale2;
  let sun = frame.sun_direction.xyz;
  out.normal = in.normal;
  out.to_eye = eye - in.position;
  out.uv = in.uv;
  out.lightmap_uv = in.lightmap_uv;
  out.color = in.color;
  out.layer = in.layer;
  out.depth = clip.w;
  out.light_up = in.light_up;
  out.light_down = in.light_down;
  out.sun = normalize(in.model_x.xyz * sun.x + in.model_y.xyz * sun.y + in.model_z.xyz * sun.z);
  out.up = normalize(in.model_y.xyz);
  return out;
}

// 프래그먼트가 읽은 것 — 텍스처와 화면 미분은 진입점이 갈래 밖에서 읽어 넘긴다 (픽셀마다 갈리는 갈래 안에서는 미분을 낼 수 없다)
struct Sampled {
  texel: vec4<f32>,
  nar: vec4<f32>,
  coded: vec3<f32>,
  toward: vec4<f32>,
  // 그 점의 자리(모델 공간)와 uv 의 화면 미분 — 가로, 세로(위쪽으로)
  dp1: vec3<f32>,
  dp2: vec3<f32>,
  duv1: vec2<f32>,
  duv2: vec2<f32>,
}

fn sample_surface(in: VertexOut) -> Sampled {
  var s: Sampled;
  let layer = i32(max(in.layer, 0.0));
  s.texel = textureSample(albedo, material_sampler, in.uv, layer);
  s.nar = textureSample(nar, material_sampler, in.uv, layer);
  s.coded = textureSample(lightmap, lightmap_sampler, in.lightmap_uv).rgb;
  s.toward = textureSample(light_direction, lightmap_sampler, in.lightmap_uv);
  // 화면의 y 는 아래로 간다 — 세로 미분의 부호를 뒤집어 '위쪽으로'로 맞춘다 (접선 틀의 방향이 그래야 맞는다)
  s.dp1 = -dpdx(in.to_eye);
  s.dp2 = dpdy(in.to_eye);
  s.duv1 = dpdx(in.uv);
  s.duv2 = -dpdy(in.uv);
  return s;
}

// metal_in: 금속성 0…1 (불투명한 겉은 1 − albedo 의 알파, 잎은 0)
fn shade(in: VertexOut, front: bool, s: Sampled, metal_in: f32) -> vec4<f32> {
  let textured = in.layer >= 0.0;
  // 양면을 그리는 겉(잎)의 뒷면은 법선을 뒤집어 본다
  let flat_normal = normalize(in.normal) * select(-1.0, 1.0, front);
  // 접선 틀 (Schüler, "Followup: Normal Mapping Without Precomputed Tangents", 2013 — 열어 읽지 않고 기억하는 식대로 썼다): uv 가 느는 쪽 t, v 가 느는 쪽 b
  let dp2perp = cross(s.dp2, flat_normal);
  let dp1perp = cross(flat_normal, s.dp1);
  let t = dp2perp * s.duv1.x + dp1perp * s.duv2.x;
  let b = dp2perp * s.duv1.y + dp1perp * s.duv2.y;
  let frame_scale = inverseSqrt(max(max(dot(t, t), dot(b, b)), 1e-24));
  let tilt = s.nar.rg * 2.0 - 1.0;
  let lift = sqrt(max(1.0 - dot(tilt, tilt), 0.04));
  let bend = tilt * RELIEF_STRENGTH;
  // 그림의 위쪽(초록 +)은 v 가 주는 쪽이다
  let bumped = normalize((t * bend.x - b * bend.y) * frame_scale + flat_normal * lift);
  let normal = select(flat_normal, bumped, textured);
  let roughness = select(PLAIN_ROUGHNESS, max(s.nar.b, ROUGHNESS_MIN), textured);
  let metal = select(0.0, metal_in, textured);
  let view = normalize(in.to_eye);

  let tint = srgb_to_linear(in.color.rgb);
  let base = select(tint, tint * s.texel.rgb, textured);

  // 빛 — 면이 받는 빛(diffuse)과, 한쪽에서 오는 몫(arriving: 그 방향 toward 를 똑바로 보는 면이 받을 빛)
  let is_baked = in.light_down.a > 0.5;
  let baked = s.coded * s.coded * LIGHT_RANGE;
  let baked_toward = normalize(s.toward.xyz * 2.0 - 1.0 + flat_normal * 1e-3);
  let facing = max(dot(flat_normal, baked_toward), GRAZE_MIN);
  let relief = min(max(dot(normal, baked_toward), 0.0) / facing, RELIEF_MAX);
  let baked_diffuse = baked * mix(1.0, relief, s.toward.a);
  let baked_arriving = baked * (s.toward.a / facing);
  let sun = frame.sun_light.rgb * in.light_up.a;
  let probed_diffuse = lit_by_along(normal, in.up, in.light_up.rgb, in.light_down.rgb, in.sun, sun);
  let probed_toward = normalize(in.sun * (0.05 + in.light_up.a) + in.up * 0.3);
  let probed_arriving = sun + in.light_up.rgb * 0.5;
  let diffuse = select(probed_diffuse, baked_diffuse, is_baked);
  let toward = select(probed_toward, baked_toward, is_baked);
  let arriving = select(probed_arriving, baked_arriving, is_baked);

  // 반사광 — 정규화한 Blinn-Phong. 거친 돌에서는 거의 보이지 않고, 다듬은 돌·금속·유리에서 빛이 오는 쪽의 번들거림으로 남는다
  let gloss = 1.0 - roughness;
  let power = exp2(1.0 + 9.0 * gloss);
  let halfway = normalize(toward + view);
  let f0 = mix(vec3<f32>(0.04), base, metal);
  let glint = (power + 8.0) * 0.125 * pow(max(dot(normal, halfway), 0.0), power) * max(dot(normal, toward), 0.0) * gloss;
  let lit = base * (1.0 - METAL_DIM * metal) * diffuse + f0 * arriving * glint;

  // 색유리 조각 — 뒤에서 하늘빛이 비친다: 제 색으로 빛나고, 유리의 울퉁불퉁함만큼 보는 각에 따라 밝기가 달라진다. 납선(알파 0)은 여느 금속처럼 빛을 받는다
  let pane = select(0.0, s.texel.a, textured && in.color.a > 1.5);
  let facing_eye = max(dot(normal, view), 0.0);
  let through = base * PANE_LIGHT * (0.62 + 0.5 * facing_eye * facing_eye) + vec3<f32>(0.04) * arriving * glint;
  // 스스로 빛나는 색 (텍스처 없는 면) — 그 가운데 단색 색유리(층 -2)는 박자에 맞춰 밝아지지 않고 고르게 빛난다
  let glow = select(clamp(in.color.a, 0.0, 1.0), 0.0, textured);
  let glowing = tint * select(frame.params.x, GLASS_GLOW, in.layer < LAYER_GLASS + 0.5) * EMISSIVE;
  let display = to_display(mix(mix(lit, through, pane), glowing, glow));
  return vec4<f32>(with_fog(display, frame.fog.rgb, in.depth, frame.fog.a, max(glow, pane)), 1.0);
}
