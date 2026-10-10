#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <utility>
#include <vector>

#include "engine/foundation/math.hpp"
#include "engine/spatial/lbvh.hpp"
#include "engine/spatial/surface_mesh.hpp"

// 라이트 베이커 — 움직이지 않는 장면의 빛을 빌드 때 미리 셈한다 (CPU, 결정적: 같은 입력이면 같은 바이트).
// 굽는 것: 해의 직접광과 그 그림자(해 원반 안으로 흩은 광선 — 부드러운 반그림자), 하늘빛(하늘의 휘도 표를 반구로 모은 것), 두 번 튕긴 빛,
//   장면에 놓은 점광원(PointLight — 거리의 제곱으로 잦아들고 reach 에서 끊긴다, 광원의 크기만큼 부드러운 그림자)의 직접광과 그것이 튕긴 빛.
//   색유리(Triangle::translucent)는 광선을 막지 않고 지나는 빛에 제 색을 곱한다 — 해·하늘빛·점광원 모두. 유리를 지난 볕은 그 색의 빛 조각으로 떨어진다.
//   맞닿은 곳의 어둠(Settings::contact) — 반구 경로가 가까이서 막힌 정도를 따로 뽑아 하늘빛·튕긴 빛에 곱한다: 벽·바닥·기둥 밑이 만나는 곳이 눈에 띄게 어둡다.
//     색유리에 텍스처(Scene::add(PaneTexture) — 자리마다의 투과색)를 걸면 유리 조각의 색 배치대로 물든다: 납선(투과색 0)은 막고, 조각마다 제 색으로 — 바닥에 창의 무늬가 떨어진다.
//   겉면 메시의 라이트맵 (bake_lightmap) — 정점의 lightmap 좌표가 가리키는 아틀라스에, 텍셀마다 빛 하나와 **그 빛이 주로 오는 방향**(방향성 라이트맵):
//     방향 = Σ (들어오는 빛의 밝기 × 그 방향) 을 길이 1 로 — 해·점광원의 직접광은 그 광원 쪽, 하늘빛·튕긴 빛은 반구 경로마다의 방향, 고른 채움빛은 면의 법선 쪽(반구에 고른 빛의 평균 방향 — 무게 ⅔).
//     쏠림 = |Σ| ÷ (빛의 밝기) 0…1 — 한 방향에서만 오면 1, 사방에서 고르게 오면 0. 겉면 셰이더(wgsl/include/surface_shade.wgsl)가 법선 맵의 요철을
//     빛 × mix(1, (n·방향) ÷ (면의 법선·방향), 쏠림) 으로 살린다 (Unity 의 directional lightmap 과 같은 생각 — 그 문서는 열어 읽지 않았다). 방향은 메시의 좌표다.
//     하늘빛·튕긴 빛의 방향은 빛과 같은 무게로 잡음을 고른다 (à-trous 의 같은 핵)
//   프로브 (probe) — 한 점에서 위·아래를 보는 면이 받는 하늘빛·되비친 빛과, 해가 보이는 정도 (라이트맵이 없는 것 — 소품, 움직이는 것 — 을 비춘다)
// 빛의 단위: 겉면의 색 = albedo × 빛 (조도 ÷ π). 휘도 L 로 고른 하늘 아래 열린 수평면의 빛이 L 이다.
// 광선은 엔진의 CPU LBVH(삼각형마다 잎, 잎 방문 순회)로 쏜다. 누가 무엇을 굽는지(방, 소품)는 모른다 — 삼각형과 하늘을 받을 뿐이다.
// 참고한 글 (2026-10-09 에 열어 읽고 구현과 견줬다):
//   Mr F, "Baking artifact-free lightmaps" (2018, https://ndotl.wordpress.com/2018/08/29/baking-artifact-free-lightmaps/) — Bakery 의 굽는 차례:
//     UV 로 그린 G 버퍼(어림한 conservative 래스터) → 물체 속의 표본을 밖으로 밀기 → 빛 → dilation → 잡음 지우기 → UV 이음매 고치기 → bicubic 으로 읽기
//   Ignacio Castaño, "Lightmap Parameterization" (https://www.ludicon.com/castano/blog/articles/lightmap-parameterization/) — The Witness 의 차트 나누기·펼치기·채우기
// 그 글과 같은 것:
//   묻힌 표본 밀기 — 텍셀 가운데에서 접선 방향 넷으로 텍셀 반 칸 길이의 광선을 쏘아, 뒷면에 닿으면 그 면 밖으로 옮긴다 (settle). 광선을 짧게 묶는 것도 같다 (먼 면이 그림자를 드리우지 않게)
//   dilation — 빈 텍셀을 이웃의 값으로 채운다. 빛을 다 구한 뒤, 잡음을 고른 뒤에 한다 (여기는 네 칸까지만 — 그보다 깊이 묻힌 텍셀은 읽히지 않는다)
//   광선을 띄우는 거리를 자리의 크기에 맞춘다 (bias_at) — 글은 자리 × 2e-7, 여기는 1e-3 × max(1, 자리 ÷ 10) 로 값이 다르다
// 그 글과 다른 것:
//   밀어낸 자리 — 글은 '처음 닿은 뒷면'에서 그 면의 법선 쪽으로 띄운다. 여기는 넷 중 가장 가까운 뒷면을 골라 광선 방향으로 더 나아가 띄운다
//   밀어도 속인 텍셀 — 글에 없다. 여기는 면을 드나든 횟수로 속인지 가려(Scene::inside) 값을 두지 않고 dilation 으로 채운다
//     (이 게임의 방은 상자를 겹쳐 쌓아, 묻힌 면이 텍셀 반 칸보다 깊이 든 곳이 많다 — 접선 광선이 닿지 않는다)
//   부표본 — 글은 느리고 덜 듣는다며 쓰지 않는다. 여기는 해의 그림자만 텍셀 안 2×2 자리에서 잰다 (자리마다 settle)
//   잡음 — 글은 OptiX AI 디노이저(톤 곡선으로 감싸서). 여기는 하늘빛·튕긴 빛만 같은 면 안에서 고른다: edge-avoiding à-trous
//     (Dammertz 외, "Edge-Avoiding À-Trous Wavelet Transform for fast Global Illumination Filtering", HPG 2010 — 5×5 핵을 간격 1·2·4 로 세 번)에,
//     밝기의 자를 표본의 분산에서 얻는 것(Schied 외, "Spatiotemporal Variance-Guided Filtering", HPG 2017 의 공간 필터 부분)을 더했다. 이 두 글은 열어 읽지 않았다 — 기억하는 방법대로 썼다.
//     경로 784 개로 구운 것과 견준 오차(시작 방 본체, 8 비트 단계의 RMSE): 이웃 3×3 평균일 때 5.56 → 3.00
//   래스터 — 글은 반 텍셀 안에서 자리를 옮겨 25 번 그려 conservative 를 어림한다. 여기는 텍셀 가운데가 삼각형 안(변 위 포함)일 때만 그 텍셀을 굽는다:
//     tools/meshc.mjs 가 평평한 면마다 축에 나란한 직사각형 차트를 텍셀 가운데에 맞춰 놓으므로 차트의 텍셀은 모두 가운데가 면 안이다 (원기둥 뚜껑·팔면체의 빗변만 dilation 이 채운다)
//   맞닿은 곳의 어둠 — 글의 굽기는 경로 추적 그대로다 (가려짐은 빛의 셈에 이미 들어 있다). 여기는 그 위에 가려짐 항을 한 번 더 곱한다 (2026-10-09, 닫힌 실내로 바꾸며):
//     튕긴 빛이 구석을 채우고 잡음 고르기(반경 0.8 m)가 그 기울기를 뭉개 구조물이 떠 보였다. 가려짐은 잡음 고르기를 거치지 않고 같은 면의 3×3 으로만 고른다.
//     물리적으로는 가려짐을 두 번 세는 셈이다 — 연출이다. Settings::contact 가 0 이면 곱하지 않는다 (글과 같다)
//   고른 채움빛 (Settings::ambient) — 글에 없다. 두 번까지만 튕기는 경로가 놓치는 빛(닫힌 방에서 여러 번 오간 빛)을 고른 값 하나로 어림해 더한다. 가려짐 항이 여기에도 곱해진다
//   색유리·점광원 — 글이 다루지 않는다 (Bakery 에는 있지만 그 글의 주제가 아니다). 점광원은 튕긴 자리마다 하나를 골라 그 몫의 역수를 곱한다 (광원이 많아도 경로마다 그림자 광선 하나)
// 그 글에 있고 여기 없는 것:
//   UV 이음매 고치기 — 맞닿은 두 차트의 가장자리 값을 맞추는 일. 여기는 차트 가장자리 텍셀의 가운데가 면의 모서리 위에 오므로(meshc) 맞닿은 두 면이 같은 자리에서 구워지지만, 법선이 달라 값은 다르다 (꺾인 모서리 — 맞추지 않는 것이 옳다).
//     한 평면이 여러 차트로 갈린 곳(맞닿은 상자의 윗면들)은 잡음만큼 어긋날 수 있다
//   bicubic 읽기 — 여기는 선형 보간 (wgsl/surface.wgsl). Phong tessellation 으로 표본 자리 옮기기 — 여기 메시는 면마다 법선이 하나라 쓸 데가 없다. 라이트맵 밉 — 쓰지 않는다
// Castaño 의 글에서는 차트 사이를 한 텍셀 띄우는 것만 같다 (meshc.mjs). 차트 나누기(법선으로 자라는 군집)·LSCM 펼치기는 쓰지 않는다 — 면이 모두 평면이라 면마다 차트 하나를 그대로 펼친다.
namespace engine::bake {

/** 라이트맵에 담는 빛의 상한 — 8 비트 텍셀에 sqrt(빛 ÷ LIGHT_RANGE) 로 담는다 (wgsl/surface.wgsl 이 같은 값으로 푼다) */
inline constexpr float LIGHT_RANGE = 4.0f;

struct Triangle {
  /** 밖에서 볼 때 반시계 방향 */
  Vec3 a, b, c;
  /** 되비치는 색 (선형 빛) */
  Vec3 albedo{0.5f, 0.5f, 0.5f};
  /** 이 삼각형이 속한 물체의 번호 — probe 가 제 물체를 건너뛸 때 쓴다 */
  uint32_t owner{};
  /** 양면 (뒤가 열린 껍데기, 잎) — 뒷면에 닿아도 물체 속으로 치지 않는다 */
  bool two_sided{};
  /** 성긴 것 (잎) — 광선의 반만 막는다 */
  bool sparse{};
  /** 색유리 — 광선을 막지 않는다. 앞면으로 들어서는 광선의 빛에 tint 를 곱한다 (닫힌 유리 덩어리를 지나면 한 번 곱해진다). 빛을 받지도 되비치지도 않는다 */
  bool translucent{};
  Vec3 tint{1.0f, 1.0f, 1.0f};
  /** 색유리의 텍스처 (Scene::add(PaneTexture) 가 돌려준 번호) — 있으면 지나는 자리의 투과색을 tint 에 곱한다. uv 는 꼭짓점마다의 무늬 좌표 (1 이 무늬 한 번, 되풀이된다) */
  uint32_t pane{NO_PANE};
  float uv[3][2]{};
  static constexpr uint32_t NO_PANE = 0xFFFFFFFFu;
};

/** 색유리의 무늬 — 자리마다의 투과색 (선형 빛. 납선은 0). width × height, 윗줄부터 */
struct PaneTexture {
  uint32_t width{};
  uint32_t height{};
  std::vector<Vec3> tint;
};

/** 점광원 — 거리 d 에서 마주 보는 면이 받는 빛 = light ÷ max(d, ½ m)² × (1 − (d ÷ reach)²)² (reach 밖은 0). 그림자는 반지름 size 의 공 안에서 흩은 광선으로 잰다 */
struct PointLight {
  Vec3 position;
  /** 1 m 떨어져 마주 보는 면이 받는 빛 */
  Vec3 light;
  float reach{1.0f};
  float size{};
};

/** 하늘 — tools/skyc.mjs 가 만든 .zksky (형식은 그 머리말) */
struct Sky {
  uint32_t width{};
  uint32_t height{};
  /** 하늘을 y 축으로 돌린 각 (라디안) */
  float yaw{};
  /** 해가 있는 쪽 (길이 1) 과 해를 똑바로 보는 면이 받는 빛, 해 원반의 반지름 (라디안) */
  Vec3 sun_direction{0.0f, 1.0f, 0.0f};
  Vec3 sun_light{};
  float sun_radius{};
  /** 해를 떼어 낸 하늘의 휘도 — width × height, 윗줄이 천정 */
  std::vector<Vec3> table;

  /** 형식이 어긋나면 nullopt */
  static std::optional<Sky> decode(std::span<const std::byte> bytes);
  /** 그 방향(길이 1)의 하늘 휘도 */
  Vec3 radiance(Vec3 direction) const;
};

class Scene {
 public:
  struct Hit {
    uint32_t triangle;
    float distance;
    /** 삼각형의 뒷면에 닿았다 */
    bool back;
  };

  void add(const Triangle& triangle) { triangles_.push_back(triangle); }
  void add(const PointLight& light) { lights_.push_back(light); }
  /** 색유리의 무늬를 넣고 그 번호를 돌려준다 (Triangle::pane) */
  uint32_t add(PaneTexture texture) {
    panes_.push_back(std::move(texture));
    return static_cast<uint32_t>(panes_.size() - 1);
  }
  std::span<const PointLight> lights() const { return lights_; }
  /** add 를 마친 뒤 한 번 */
  void build();
  std::span<const Triangle> triangles() const { return triangles_; }

  /**
   * 가장 먼저 닿는 (색유리가 아닌) 삼각형. skip_owner 의 삼각형은 지나친다 (없으면 NO_OWNER). sparse 삼각형이 막는지는 salt 가 정한다.
   * filter 를 주면 거기까지(안 닿았으면 max_distance 까지) 지난 색유리의 색을 곱해 적는다
   */
  std::optional<Hit> closest(const Ray& ray, float max_distance, uint32_t skip_owner, uint32_t salt, Vec3* filter = nullptr) const;
  /** max_distance 안에 막는 것이 있는가 (색유리는 막지 않는다) */
  bool blocked(const Ray& ray, float max_distance, uint32_t skip_owner, uint32_t salt) const;
  /** max_distance 까지 빛이 지나는 몫 — 막혔으면 0, 색유리를 지났으면 그 색, 아무것도 없으면 1 */
  Vec3 transmit(const Ray& ray, float max_distance, uint32_t skip_owner, uint32_t salt) const;
  /**
   * 그 점이 닫힌 물체 속인가 — 점에서 나가는 광선이 물체의 면을 안에서 밖으로 지난 횟수가 밖에서 안으로 지난 횟수보다 많으면 속이다
   * (물체가 겹치거나 물체 속에 다른 물체가 들어 있어도 맞는다. 양면 삼각형과 색유리는 세지 않는다). 모서리를 스치는 광선에 속지 않게 세 방향으로 재서 둘 이상이 그렇다고 할 때
   */
  bool inside(Vec3 point) const;

  static constexpr uint32_t NO_OWNER = 0xFFFFFFFFu;

 private:
  /** 색유리 t 를 광선이 distance 에서 지날 때 곱해지는 색 */
  Vec3 pane_tint(const Triangle& t, const Ray& ray, float distance) const;

  std::vector<Triangle> triangles_;
  std::vector<PointLight> lights_;
  std::vector<PaneTexture> panes_;
  Lbvh bvh_;
};

struct Settings {
  /** 텍셀 하나의 해 그림자 광선 — 부표본 2×2 에 고르게 나눈다 (4 의 배수) */
  uint32_t sun_rays{16};
  /** 텍셀 하나의 반구 경로 수 — 제곱수면 층을 고르게 나눈다 */
  uint32_t paths{49};
  /** 같은 장면의 다른 굽기끼리 난수가 겹치지 않게 하는 값 */
  uint32_t seed{};
  /** 텍셀 하나에서 점광원 하나로 쏘는 그림자 광선 */
  uint32_t light_rays{8};
  /**
   * 맞닿은 곳의 어둠 — 하늘빛·튕긴 빛에 (트인 정도)^contact 를 곱한다. 트인 정도는 반구 경로들의 min(1, 닿은 거리 ÷ contact_reach) 의 평균 (아무것도 안 닿았으면 1).
   * 0 이면 곱하지 않는다. 해와 점광원의 직접광에는 곱하지 않는다 (볕 든 자리는 또렷하게 남는다)
   */
  float contact{};
  float contact_reach{1.5f};
  /**
   * 고른 채움빛 — 어디에나 같은 양으로 더하는 빛 (셈하지 않는 여러 번 튕긴 빛의 어림: 닫힌 방은 빛이 벽 사이를 여러 번 오간다). 맞닿은 곳의 어둠이 곱해진다 —
   * 채움빛만 받는 그늘에서도 벽 밑·구석이 어둡게 남는다. 프로브에도 더한다 (위·아래 빛에 같이)
   */
  Vec3 ambient{};
};

struct Lightmap {
  uint32_t width{};
  uint32_t height{};
  /** 텍셀마다의 빛 — width × height */
  std::vector<Vec3> light;
  /** 그 빛이 주로 오는 방향 (길이 1, 메시를 놓은 뒤의 좌표) 과 한쪽으로 쏠린 정도 0…1 */
  std::vector<Vec3> toward;
  std::vector<float> focus;
  /** 텍셀이 조각(메시의 면) 안에 든다 */
  std::vector<uint8_t> covered;
  /** 값이 있다 — 구운 텍셀과, 이웃에서 번져 채워진 텍셀 (값이 있는 텍셀에서 네 칸 안). 나머지는 겉면이 읽지 않는 자리다 */
  std::vector<uint8_t> filled;

  /** 8 비트 RGBA (알파 255) — 채널마다 sqrt(빛 ÷ LIGHT_RANGE). 값이 없는 텍셀은 앞 텍셀과 같게 적는다 (잘 눌리게) */
  std::vector<std::byte> rgba8() const;
  /** 방향 맵 — 8 비트 RGBA: rgb = 방향 × ½ + ½, a = 쏠림. 값이 없는 텍셀은 앞 텍셀과 같게 적는다 */
  std::vector<std::byte> direction_rgba8() const;
};

/**
 * 겉면 메시의 라이트맵을 굽는다 — vertices 는 셋씩 삼각형이고 placement 로 장면에 놓인다 (장면에는 이 메시의 삼각형도 들어 있어야 한다 — 제 그림자를 드리운다).
 * 정점의 lightmap 좌표 × (width, height) 가 텍셀 자리다. 값이 있는 텍셀의 둘레도 이웃의 값으로 채워 둔다 (선형 보간이 묻힌 텍셀 곁에서 검정을 끌어오지 않게)
 */
Lightmap bake_lightmap(const Scene& scene, const Sky& sky, std::span<const SurfaceVertex> vertices, const Mat4& placement, uint32_t width, uint32_t height, const Settings& settings);

/** 한 점의 빛 — 라이트맵이 없는 것을 비춘다: 색 = albedo × (mix(down, up, ½ + ½ 법선.y) + 해의 빛 × sun × max(법선 · 해의 방향, 0)) */
struct Probe {
  /**
   * 위를 보는 면이 받는 하늘빛과 되비친 빛 (해의 직접광은 빼고), 아래를 보는 면이 받는 빛.
   * 점광원의 빛은 방향을 접어 둘에 나눠 담는다 (위에서 오는 빛은 up 에, 아래에서 오는 빛은 down 에, 옆에서 오는 빛은 반씩)
   */
  Vec3 up;
  Vec3 down;
  /** 해가 보이는 정도 0…1 — 색유리를 지난 볕은 그 색의 밝기만큼 */
  float sun{};
};
/**
 * skip_owner 의 삼각형은 이 점에서 나가는 광선이 지나친다 (제 물체 속의 점에서 재려고). id 는 같은 굽기 안에서 프로브마다 다른 번호.
 * 프로브는 한 점이 아니라 물체 하나를 통째로 비춘다 — 점광원은 1 m 보다 가깝게 보지 않는다 (등에 매달린 소품, 화덕 곁의 적이 한 점의 밝기로 타지 않게)
 */
Probe probe(const Scene& scene, const Sky& sky, Vec3 point, uint32_t skip_owner, const Settings& settings, uint32_t id);

/** QOI 파일로 적는다 (engine::hud::Bitmap::decode 가 읽는다) — rgba 는 width × height × 4 바이트 */
std::vector<std::byte> encode_qoi(uint32_t width, uint32_t height, std::span<const std::byte> rgba);

}  // namespace engine::bake
