#pragma once

#include <cstdint>
#include <string_view>
#include <vector>

#include "engine/foundation/color.hpp"
#include "engine/gpu/device.hpp"
#include "engine/hud/layout.hpp"
#include "engine/render/instance_batch.hpp"
#include "engine/shader/shader_library.hpp"

namespace engine {

/**
 * 화면 위 2D 그리기 — 픽셀 좌표(왼쪽 위가 원점)의 색 사각형과 글자. 장면 위에 그린 차례대로 덮는다.
 * 프레임마다 그리기 목록을 쌓고(submit) flush 로 한 번에 그린다. HUD 엔진(engine/hud)의 그리기 목록을 화면에 옮기는 곳이다.
 *
 * ceiling: 글자는 5×7 점 글꼴이고(영문 대문자·숫자·몇 가지 기호), 켜진 점의 가로 줄마다 사각형 하나로 그린다.
 * 한글이나 매끄러운 글자가 필요해지거나 글자 사각형이 CAPACITY 에 가까워지면, 장치 인터페이스에 텍스처를 더하고 글리프 아틀라스로 바꾼다.
 */
class Overlay {
 public:
  /** 한 프레임에 그릴 수 있는 사각형 수 */
  static constexpr uint32_t CAPACITY = 4096;
  /** 이 글꼴의 치수 — HUD 배치가 글자 크기를 잴 때 쓴다 */
  static constexpr hud::TextMetrics TEXT_METRICS{5.0f, 6.0f, 7.0f};

  bool create(gpu::Device& device, ShaderLibrary& shaders);

  /** HUD 그리기 목록을 그 차례대로 쌓는다 */
  void submit(const hud::DrawList& items);
  /** 쌓인 것을 그리고 비운다. begin_frame 과 end_frame 사이에서 한 번 */
  void flush(gpu::Device& device);

 private:
  void rect(float x, float y, float width, float height, Color color);
  /** (x, y) 가 첫 글자의 왼쪽 위. scale 은 점 하나의 픽셀 크기. 소문자는 대문자로 그린다 */
  void text(float x, float y, float scale, std::string_view text, Color color);

  gpu::PipelineHandle pipeline_;
  gpu::BufferHandle surface_uniforms_;
  InstanceBatch quads_;
  std::vector<Instance> pending_;
};

}  // namespace engine
