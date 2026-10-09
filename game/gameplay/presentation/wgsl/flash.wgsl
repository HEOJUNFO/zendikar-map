// 총구 섬광 셰이더 — 쏜 순간 총구 앞에 두세 틱 번쩍이는 불꽃 (gameplay/presentation/stage_view.cpp 의 draw_flash).
// 텍스처 없이 낸다: 눈을 보는 사각형 하나에 희게 달아오른 핵, 몇 갈래로 뻗는 불꽃, 옅은 번짐을 그려 이미 그려진 색에 더한다 (가산 혼합).
// 스스로 빛나는 것이라 조명은 받지 않지만, 장면의 다른 것과 같은 노출·톤 곡선을 지난다 (engine/render/wgsl/include/color.wgsl) —
// 선형 빛으로 셈해 밝은 가운데가 톤 곡선에서 흰빛으로 눌린다. 손에 든 총과 같은 시야각·당긴 깊이로 그려 벽에 묻히지 않고, 총보다 뒤인 곳은 총에 가린다.

#include "color.wgsl"

struct Frame {
  // 눈 공간(오른쪽 +x, 위 +y, 보는 쪽 -z) → 클립 — 손에 든 총의 시야각
  proj: mat4x4<f32>,
  // xyz 섬광의 가운데 (눈 공간), w 사각형의 한 변의 절반 (m)
  at: vec4<f32>,
  // x 밝기 0..1, y 불꽃 갈래가 돈 각 (라디안 — 발마다 다르다), z 깊이 배율 (손에 든 총과 같은 값)
  params: vec4<f32>,
}

@group(0) @binding(0) var<uniform> frame: Frame;

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  // 사각형 위의 자리 — 가운데가 0, 변이 ±1
  @location(0) at: vec2<f32>,
}

@vertex
fn vs_main(@location(0) corner: vec2<f32>) -> VertexOut {
  var out: VertexOut;
  let clip = frame.proj * vec4<f32>(frame.at.xyz + vec3<f32>(corner * frame.at.w, 0.0), 1.0);
  out.clip = vec4<f32>(clip.xy, clip.z * frame.params.z, clip.w);
  out.at = corner;
  return out;
}

// 희게 달아오른 핵, 불꽃 갈래, 번짐의 색 (선형 빛)
const HOT = vec3<f32>(1.0, 0.86, 0.6);
const FLAME = vec3<f32>(1.0, 0.42, 0.08);
const HAZE = vec3<f32>(1.0, 0.3, 0.05);

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  let r = length(in.at);
  let angle = atan2(in.at.y, in.at.x) + frame.params.y;
  // 핵 — 가운데의 작은 덩어리
  let core = exp(-r * r * 60.0);
  // 굵은 갈래 다섯 (길이가 저마다 다르다)과 그 사이의 가는 갈래 — 가운데에서 멀수록 꺼진다
  let reach = 0.7 + 0.3 * sin(2.0 * angle + 1.3);
  let thick = pow(0.5 + 0.5 * cos(5.0 * angle), 14.0) * exp(-r * 3.0 / reach);
  let thin = pow(0.5 + 0.5 * cos(9.0 * angle + 2.0), 30.0) * exp(-r * 6.0);
  let haze = exp(-r * r * 9.0);
  // 사각형의 변에 닿기 전에 다 꺼진다 — 모서리가 보이지 않게
  let fade = 1.0 - smoothstep(0.6, 1.0, r);
  let light = (HOT * (8.0 * core) + FLAME * (7.0 * thick + 3.0 * thin) + HAZE * (0.18 * haze)) * (fade * frame.params.x);
  // 가산 혼합 — 알파는 쓰이지 않는다
  return vec4<f32>(to_display(light), 1.0);
}
