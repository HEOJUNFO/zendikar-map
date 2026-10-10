#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <span>
#include <string_view>
#include <vector>

#include "engine/foundation/color.hpp"
#include "engine/gpu/device.hpp"
#include "engine/hud/font.hpp"
#include "engine/hud/layout.hpp"
#include "engine/shader/shader_library.hpp"

namespace engine {

/**
 * 화면 위 2D 그리기 — 픽셀 좌표(왼쪽 위가 원점)의 색 사각형(과 그 안에 그리는 도형 — 마름모·꺾쇠·비스듬한 칸)과 글자, 그림. 장면 위에 그린 차례대로 덮는다.
 * 프레임마다 그리기 목록을 쌓고(submit) flush 로 한 번에 그린다. HUD 엔진(engine/hud)의 그리기 목록을 화면에 옮기는 곳이다.
 * 글자는 글꼴의 아틀라스 칸을 입힌 사각형이고, 색 사각형은 아틀라스의 가득 찬 칸을 입힌다 — 그림이 끼지 않으면 그리기 호출은 하나다
 * (그림은 제 텍스처를 입힌 사각형이라, 그림을 만날 때마다 호출이 끊긴다).
 *
 * ceiling: 글자는 구운 크기의 그림을 늘이고 줄여 그린다 (밉맵 없음, 커닝 없음, 한 줄, 왼쪽에서 오른쪽).
 * 구운 크기의 절반보다 작게 그려 글자가 깨지거나 두 배 넘게 키워 흐려지면, 크기별 아틀라스나 거리장(SDF) 글꼴로 바꾼다.
 */
class Overlay {
 public:
  /** 한 프레임에 그릴 수 있는 사각형 수 (글자 하나가 사각형 하나) */
  static constexpr uint32_t CAPACITY = 4096;

  /** font 의 아틀라스를 GPU 에 올린다. font 는 Overlay 보다 오래 살아야 한다 — HUD 를 배치할 때 쓴 것과 같은 글꼴을 준다 */
  bool create(gpu::Device& device, ShaderLibrary& shaders, const hud::Font& font);

  /**
   * 그림 한 장을 GPU 에 올린다 — rgba 는 width × height × 4 바이트 (윗줄부터, 빨강·초록·파랑·알파).
   * 돌려준 번호를 hud::Picture 의 id 로 쓴다. 올리지 못했으면 0
   */
  uint32_t add_image(gpu::Device& device, uint32_t width, uint32_t height, std::span<const std::byte> rgba);

  /** HUD 그리기 목록을 그 차례대로 쌓는다. CAPACITY 를 넘는 것은 그려지지 않는다 */
  void submit(const hud::DrawList& items);
  /** 쌓인 것을 그리고 비운다. begin_frame 과 end_frame 사이에서 한 번 */
  void flush(gpu::Device& device);

 private:
  /** 사각형 하나 — overlay.wgsl·image.wgsl 의 인스턴스 속성 */
  struct Quad {
    /** xy 왼쪽 위, zw 크기 (화면 픽셀) */
    std::array<float, 4> placement;
    /** 입힐 텍스처(아틀라스나 그림)의 칸 — xy 왼쪽 위, zw 크기 (그 텍스처의 픽셀) */
    std::array<float, 4> cell;
    /** 시작 색과 끝 색 — 번지지 않으면 둘이 같다 */
    std::array<float, 4> tint;
    std::array<float, 4> tint_end;
    /** 색이 번지는 방향 — 0 은 위에서 아래, 1 은 왼쪽에서 오른쪽 */
    float fade;
    /** 도형(hud::Shape 번호)과 치수(픽셀; pointer 는 라디안). 그림은 읽지 않는다 */
    std::array<float, 2> shape;
    /** 사각형 중심에서 시계 방향 회전(라디안) */
    float rotation{};
  };
  /** 같은 텍스처로 이어 그리는 사각형들 — image 가 0 이면 글리프 아틀라스, 아니면 그 번호의 그림 */
  struct Run {
    uint32_t image;
    uint32_t first;
    uint32_t count;
  };

  void push(const Quad& quad, uint32_t image);
  /** (x, y) 가 줄의 왼쪽 위. size 는 글자 크기 (픽셀). clip 이 있으면 그 밖은 잘라 낸다 */
  void text(float x, float y, float size, std::string_view text, Color color, uint32_t face, const std::optional<hud::Rect>& clip);

  const hud::Font* font_{};
  gpu::PipelineHandle pipeline_;
  gpu::PipelineHandle image_pipeline_;
  gpu::BufferHandle surface_uniforms_;
  gpu::TextureHandle atlas_;
  // 올린 그림들 — 번호는 자리 + 1
  std::vector<gpu::TextureHandle> images_;
  gpu::SamplerHandle sampler_;
  gpu::BufferHandle corners_;
  gpu::BufferHandle quads_;
  std::vector<Quad> pending_;
  std::vector<Run> runs_;
};

}  // namespace engine
