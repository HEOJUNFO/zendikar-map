#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

#include "engine/foundation/math.hpp"

namespace engine {

/**
 * 텍스처를 입힌 겉면의 정점 — 셰이더의 @location(0) position, (1) normal, (2) uv, (3) lightmap, (4) color, (5) layer
 * (engine/render/wgsl/surface.wgsl). 셋씩 삼각형, 밖에서 볼 때 반시계 방향
 */
struct SurfaceVertex {
  float position[3];
  float normal[3];
  /** 타일 텍스처의 좌표 — 1 이 무늬 한 번 */
  float uv[2];
  /** 라이트맵의 좌표 0..1 — 그 메시의 라이트맵 아틀라스 안 (없는 메시는 0) */
  float lightmap[2];
  /** rgb 텍스처에 곱하는 색(sRGB 로 적은 값), a 가 1 이면 스스로 빛난다, GLASS_PANE 이면 텍스처를 입힌 색유리다 */
  float color[4];
  /** 텍스처 배열의 층. 음수면 텍스처 없이 color 만 — 그 가운데 LAYER_GLASS 는 색유리다 (제 색으로 고르게 빛나고, 라이트 베이커는 지나는 빛에 그 색을 곱한다) */
  float layer;
};
inline constexpr float LAYER_GLASS = -2.0f;
/**
 * 텍스처를 입힌 색유리 — color 의 a 가 이 값이고 layer 는 그 유리의 텍스처다 (albedo 의 알파가 1 인 곳이 유리 조각, 0 인 곳이 납선).
 * 화면에서는 유리 조각이 제 색으로 빛나고, 라이트 베이커는 지나는 빛에 그 자리의 텍스처 색을 곱한다 (납선은 막는다)
 */
inline constexpr float GLASS_PANE = 2.0f;

/** 메시에 고정해 놓은 모델 하나 (소품) — model 은 부르는 쪽이 아는 모델 목록의 번호, 밑면 가운데가 position 에 오고 yaw(라디안, y 축)만큼 돌고 scale 배다 */
struct Placement {
  uint32_t model;
  float position[3];
  float yaw;
  float scale;
};

/** 메시에 적어 둔 빛 하나 (점광원) — 라이트 베이커가 굽는다. 실행 중에는 셈하지 않는다 */
struct MeshLight {
  float position[3];
  /** 1 m 떨어져 마주 보는 면이 받는 빛 (선형) */
  float light[3];
  /** 빛이 닿는 끝 (m) — 거기서 0 으로 잦아든다 */
  float reach;
  /** 광원의 반지름 (m) — 클수록 그림자가 부드럽다 */
  float size;
};

/** 메시에 적어 둔 길의 점 하나 — links 의 비트 i 가 서 있으면 i 번 점과 곧게 걸어 오갈 수 있다 (tools/meshc.mjs 가 충돌 상자로 가려 이었다) */
struct NavNode {
  float position[3];
  uint32_t links;
};
inline constexpr uint32_t NAV_NODE_LIMIT = 32;

/**
 * 도형을 조립해 만든 겉면 메시 — 삼각형 목록, 부딪히는 상자들, 놓인 소품들, 라이트맵 아틀라스의 크기(텍셀), 구울 빛들, 길의 점들.
 * 데이터는 tools/meshc.mjs 가 재질(material)을 쓴 .mesh.txt 에서 만든 .meshbin 이다 — 정점을 그대로 적은 것('ZKSF')이거나,
 * 삼각형마다 같은 값(법선·색·층)을 한 번만 적고 라이트맵 좌표를 16 비트로 줄인 것('ZKSC' — 묻히는 방 메시가 이 꼴이다. 형식은 meshc.mjs 머리말)
 */
class SurfaceMesh {
 public:
  /** .meshbin 을 푼다. 형식이 어긋나면 nullopt */
  static std::optional<SurfaceMesh> decode(std::span<const std::byte> bytes);

  std::span<const SurfaceVertex> vertices() const { return vertices_; }
  /** 충돌 상자 — 축에 나란하다. 부딪히는 소품(solid)의 상자도 여기 들어 있다 */
  std::span<const Aabb> solids() const { return solids_; }
  std::span<const Placement> placements() const { return placements_; }
  std::span<const MeshLight> lights() const { return lights_; }
  /** 길의 점들 — 이음은 서로 맞물려 있다 (i 가 j 를 가리키면 j 도 i 를 가리킨다) */
  std::span<const NavNode> nav() const { return nav_; }
  /** 정점의 lightmap 좌표가 가리키는 아틀라스의 크기 (텍셀) */
  uint32_t lightmap_width() const { return lightmap_width_; }
  uint32_t lightmap_height() const { return lightmap_height_; }

 private:
  std::vector<SurfaceVertex> vertices_;
  std::vector<Aabb> solids_;
  std::vector<Placement> placements_;
  std::vector<MeshLight> lights_;
  std::vector<NavNode> nav_;
  uint32_t lightmap_width_{};
  uint32_t lightmap_height_{};
};

/**
 * 밖에서 만든 모델(glTF)을 옮긴 메시 — 삼각형 목록으로 펴 둔다 (정점의 lightmap 은 0, color 는 흰색).
 * 데이터는 tools/gltfc.mjs 가 만든 .zkmodel 이다 ('ZKMD': 정점과 인덱스)
 */
struct ModelMesh {
  std::vector<SurfaceVertex> vertices;
  /** 양면을 다 그린다 — 텍스처의 알파로 잘라 내는 잎, 뒤가 열린 껍데기, 재질이 양면이라고 한 기물 */
  bool two_sided{};
  /** 텍스처의 알파로 잘라 낸다 (잎). 아니면 알파는 잘라 낼 모양이 아니다 (1 − 금속성) */
  bool cutout{};
  /** 정점들을 감싸는 상자 */
  Aabb bounds{};

  /** .zkmodel 을 푼다. 형식이 어긋났거나 인덱스가 정점 밖을 가리키면 nullopt */
  static std::optional<ModelMesh> decode(std::span<const std::byte> bytes);
};

}  // namespace engine
