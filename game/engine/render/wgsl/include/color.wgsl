// 장면의 빛과 색 — 실제 재질은 함께 같은 실내 표시 곡선을 쓰고, 하늘·발광·포털은 저작된 노출을 유지한다.
// 색은 선형 빛으로 셈하고 마지막에 화면 값(sRGB)으로 바꾼다 — 렌더 타깃이 없어 톤매핑을 셰이더마다 건다.
// 해의 방향과 빛은 여기 없다: 부르는 쪽이 프레임 값으로 준다 (구운 라이트맵과 같은 해여야 한다 — 게임은 하늘 에셋에서 뽑은 값을 준다).
// 화면 위 2D(오버레이)는 이 길을 지나지 않는다.

// 저작된 하늘·발광·포털의 노출. 화면용 하늘 JPEG와 지평선도 이 값으로 미리 굽는다.
// tools/art/prepare-sky.mjs·skyc.mjs가 읽는 계약이며 실제 표면의 보정과 독립이다.
const EXPOSURE = 0.42;
// 실제 1080p 폐허에서 어두운 재질·적의 윤곽이 ACES의 낮은 발에 묻혔다.
// 물리 조도와 재질을 유지한 채 표면의 노출과 그늘 대비만 화면에서 보정한다.
// 0은 그대로 0이며, 하늘 JPEG·발광·투명 포털에는 이 보정을 걸지 않는다.
const SCENE_EXPOSURE = 1.0;
const SHADOW_POWER = 0.8;
// 스스로 빛나는 색(룬, 불빛)의 세기 — 톤 곡선을 지나 제 색보다 조금 밝게 나온다
const EMISSIVE = 1.3;

// 화면 값(sRGB)으로 적은 색 → 선형 빛 (정점 색처럼 텍스처가 아닌 것. sRGB 텍스처는 GPU 가 바꿔 준다)
fn srgb_to_linear(color: vec3<f32>) -> vec3<f32> {
  return pow(color, vec3<f32>(2.2));
}

// 구운 라이트맵이 없는 면에 드는 빛 — 위·아래에서 채우는 빛(그 자리의 프로브: 하늘빛과 되비친 빛)과 해.
// sun 은 해의 빛 × 그 자리에서 해가 보이는 정도 (그늘 속이면 0)
fn lit_by(normal: vec3<f32>, up: vec3<f32>, down: vec3<f32>, sun_direction: vec3<f32>, sun: vec3<f32>) -> vec3<f32> {
  return mix(down, up, 0.5 + 0.5 * normal.y) + sun * max(dot(normal, sun_direction), 0.0);
}

// 같은 빛 — '위'가 y 축이 아닌 좌표(모델 공간)에서. up_axis 는 그 좌표에서 위쪽 (길이 1)
fn lit_by_along(normal: vec3<f32>, up_axis: vec3<f32>, up: vec3<f32>, down: vec3<f32>, sun_direction: vec3<f32>, sun: vec3<f32>) -> vec3<f32> {
  return mix(down, up, 0.5 + 0.5 * dot(normal, up_axis)) + sun * max(dot(normal, sun_direction), 0.0);
}

// 선형 빛 → 화면에 낼 값: 노출을 곱하고, 밝은 곳이 타지 않게 누르고(ACES 근사 — Narkowicz 2015), 감마를 건다
fn tone_display(light: vec3<f32>, exposure: f32) -> vec3<f32> {
  let x = max(light, vec3<f32>(0.0)) * exposure;
  let mapped = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3<f32>(0.0), vec3<f32>(1.0));
  return pow(mapped, vec3<f32>(1.0 / 2.2));
}

fn to_display(light: vec3<f32>) -> vec3<f32> {
  return tone_display(light, EXPOSURE);
}

// Static rooms, props, weapons and every animated/skinned actor share this.
fn to_scene_display(light: vec3<f32>) -> vec3<f32> {
  return pow(tone_display(light, SCENE_EXPOSURE), vec3<f32>(SHADOW_POWER));
}

// 멀수록 안개(지평선의 하늘빛)로 — 화면 값끼리 섞는다.
// depth 는 눈에서의 거리, reach 는 안개가 다 덮는 거리, glow 가 1 이면(빛나는 색) 안개를 반만 받는다
fn with_fog(display: vec3<f32>, fog: vec3<f32>, depth: f32, reach: f32, glow: f32) -> vec3<f32> {
  let haze = clamp(depth / reach, 0.0, 1.0);
  return mix(display, fog, haze * haze * (1.0 - 0.5 * glow));
}
