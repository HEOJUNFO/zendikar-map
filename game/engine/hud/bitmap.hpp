#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

namespace engine::hud {

/**
 * 그림 한 장의 픽셀 — 화면에 그림(Element 의 image)으로 올릴 것. 데이터는 tools/imagec.mjs 가 옮긴 QOI(qoiformat.org) 파일이다:
 * 엔진은 PNG·JPEG 을 읽지 않는다
 */
struct Bitmap {
  /** 한 변의 상한 (픽셀) — 이보다 큰 그림은 거절한다 */
  static constexpr uint32_t MAX_SIDE = 8192;

  uint32_t width{};
  uint32_t height{};
  /** width × height × 4 바이트 — 픽셀마다 빨강·초록·파랑·알파, 윗줄부터 */
  std::vector<std::byte> rgba;

  /** QOI 를 푼다. 머리가 어긋났거나, 크기가 0 이거나 상한을 넘거나, 데이터가 모자라거나 남으면 nullopt */
  static std::optional<Bitmap> decode(std::span<const std::byte> qoi);
};

}  // namespace engine::hud
