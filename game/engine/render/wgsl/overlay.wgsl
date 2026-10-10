// 화면 위 2D — 픽셀 좌표의 사각형에 글리프 아틀라스의 칸을 입힌다 (engine/render/overlay.hpp). 왼쪽 위가 (0, 0).
// 아틀라스는 덮인 정도(0..1) 한 장이다: 글자는 그 글자의 칸을, 색 사각형은 가득 찬 칸을 읽는다.
// 색 사각형은 그 안에 도형(engine/hud/element.hpp 의 Shape)을 그린다: 가장자리까지의 거리(픽셀)로 덮인 정도를 구해 한 픽셀에 걸쳐 부드럽게 한다.

struct Surface {
  // xy: 화면 크기, zw: 아틀라스 크기 (픽셀)
  size: vec4<f32>,
}

@group(0) @binding(0) var<uniform> surface: Surface;
@group(0) @binding(1) var atlas: texture_2d<f32>;
@group(0) @binding(2) var atlas_sampler: sampler;

struct VertexIn {
  // 0..1 사각형
  @location(0) position: vec3<f32>,
  // 인스턴스 — xy 왼쪽 위, zw 크기 (화면 픽셀)
  @location(1) placement: vec4<f32>,
  // 입힐 아틀라스 칸 — xy 왼쪽 위, zw 크기 (아틀라스 픽셀)
  @location(2) cell: vec4<f32>,
  // 시작 색과 끝 색 — fade 가 0 이면 위에서 아래로, 1 이면 왼쪽에서 오른쪽으로 번진다 (번지지 않으면 둘이 같다)
  @location(3) tint: vec4<f32>,
  @location(4) tint_end: vec4<f32>,
  @location(5) fade: f32,
  // x: Shape 번호, y: 치수(픽셀), pointer(6)만 시계 방향 회전각(라디안)
  @location(6) shape: vec2<f32>,
  @location(7) rotation: f32,
}

struct VertexOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) tint: vec4<f32>,
  @location(1) uv: vec2<f32>,
  // 사각형 한가운데에서 잰 자리 (픽셀)
  @location(2) local: vec2<f32>,
  // 사각형 크기의 절반 (픽셀)과 도형
  @location(3) @interpolate(flat) extent: vec2<f32>,
  @location(4) @interpolate(flat) shape: vec2<f32>,
}

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let local = (in.position.xy - vec2<f32>(0.5)) * in.placement.zw;
  let c = cos(in.rotation);
  let s = sin(in.rotation);
  let rotated = vec2<f32>(c * local.x - s * local.y, s * local.x + c * local.y);
  let pixel = in.placement.xy + in.placement.zw * 0.5 + rotated;
  let unit = pixel / surface.size.xy;
  // 깊이 판정을 끈 파이프라인으로 그린다 — z 는 클립 범위(0..1) 안이면 된다
  out.clip = vec4<f32>(unit.x * 2.0 - 1.0, 1.0 - unit.y * 2.0, 0.5, 1.0);
  out.tint = mix(in.tint, in.tint_end, mix(in.position.y, in.position.x, in.fade));
  out.uv = (in.cell.xy + in.position.xy * in.cell.zw) / surface.size.zw;
  out.local = (in.position.xy - vec2<f32>(0.5)) * in.placement.zw;
  out.extent = in.placement.zw * 0.5;
  out.shape = in.shape;
  return out;
}

// 가장자리에서 안쪽으로 잰 거리(픽셀, 안이 양수) → 덮인 정도. 가장자리에서 반, 반 픽셀 안에서 1
fn edge(inside: f32) -> f32 {
  return clamp(inside + 0.5, 0.0, 1.0);
}

// 도형이 이 픽셀을 덮은 정도. p 는 사각형 한가운데에서 잰 자리, h 는 사각형 크기의 절반 (픽셀)
fn shape_coverage(shape: vec2<f32>, p: vec2<f32>, h: vec2<f32>) -> f32 {
  let kind = shape.x;
  let size = shape.y;
  if (kind < 0.5) {
    return 1.0;
  }
  if (kind < 2.5) {
    // 마름모 — 변 x/hx + y/hy = 1 까지의 거리. 테는 그 안쪽 size 까지만
    let inside = (1.0 - abs(p.x) / h.x - abs(p.y) / h.y) * h.x * h.y / length(h);
    if (kind < 1.5) {
      return edge(inside);
    }
    return edge(inside) * edge(size - inside);
  }
  if (kind < 4.5) {
    // 꺾쇠 — 꼭짓점(왼쪽·오른쪽 변의 가운데)에서 맞은편 두 귀로 가는 선의 안쪽 size 까지. u 는 꼭짓점이 있는 변에서 잰 가로 거리
    let width = 2.0 * h.x;
    let u = select(h.x - p.x, p.x + h.x, kind < 3.5);
    let inside = (u / width - abs(p.y) / h.y) * width * h.y / length(vec2<f32>(width, h.y));
    return edge(inside) * edge(size - inside);
  }
  if (kind > 5.5) {
    let radius = min(h.x, h.y);
    if (kind < 6.5) {
      // 회전해도 상자 안에 남는 화살촉: 북쪽이 0, 동쪽이 +pi/2.
      let c = cos(size);
      let s = sin(size);
      let q = vec2<f32>(c * p.x + s * p.y, -s * p.x + c * p.y) / radius;
      let sides = (q.y + 0.92 - 2.615385 * abs(q.x)) / 2.8;
      let tail = (0.2944 + 0.584615 * abs(q.x) - q.y) / 1.16;
      return edge(min(sides, tail) * radius);
    }
    let q = p / radius;
    if (kind < 7.5) {
      // 두 갈래로 잘린 교역소 깃발. 글꼴·색 이모지에 의존하지 않는다.
      return edge(min(min(0.72 - abs(q.x), q.y + 0.85), (0.42 + 0.6 * abs(q.x) - q.y) / 1.17) * radius);
    }
    // 해골: 머리·턱의 합집합에서 두 눈, 코, 이 사이를 뺀 실루엣.
    let head = min(0.78 - abs(q.x), min(q.y + 0.70, 0.32 - q.y));
    let brow = 0.78 - length(q - vec2<f32>(0.0, -0.12));
    let jaw = min(0.50 - abs(q.x), min(q.y - 0.20, 0.82 - q.y));
    let body = max(max(head, brow), jaw);
    let eyes = length(vec2<f32>(abs(q.x) - 0.35, q.y + 0.08)) - 0.21;
    let nose = max(abs(q.x) - 0.11, abs(q.y - 0.26) - 0.12);
    let teeth = max(abs(abs(q.x) - 0.17) - 0.05, 0.55 - q.y);
    return edge(min(min(body, eyes), min(nose, teeth)) * radius);
  }
  // 비스듬한 칸 — 왼쪽 변이 아래에서 위로 가며 |size| 만큼 오른쪽으로 간다 (음수면 좌우를 뒤집는다). 위아래 변은 사각형의 것
  let lean = abs(size);
  let x = select(p.x, -p.x, size < 0.0) + h.x;
  let along = x - lean * (h.y - p.y) / (2.0 * h.y);
  let steep = 2.0 * h.y / length(vec2<f32>(2.0 * h.y, lean));
  return edge(along * steep) * edge((2.0 * h.x - lean - along) * steep);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  // 알파 섞기를 켠 파이프라인 — 덮인 정도만큼 색이 얹힌다
  // 아틀라스는 갈림(도형의 분기) 밖에서 읽는다 — 픽셀마다 갈리는 분기 안의 텍스처 읽기는 브라우저가 거절한다
  let coverage = textureSample(atlas, atlas_sampler, in.uv).r;
  return vec4<f32>(in.tint.rgb, in.tint.a * coverage * shape_coverage(in.shape, in.local, in.extent));
}
