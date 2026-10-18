#include "engine/hud/bitmap.hpp"

#include <array>
#include <cstring>

namespace engine::hud {
namespace {

// QOI — 머리 14 바이트('qoif', 너비·높이(빅 엔디언 u32), 채널 수, 색 공간) + 픽셀 묶음들 + 끝 표시 8 바이트
constexpr std::size_t HEADER_BYTES = 14;
constexpr uint8_t END_MARK[] = {0, 0, 0, 0, 0, 0, 0, 1};

struct Pixel {
  uint8_t r{}, g{}, b{}, a{255};
};

uint32_t read_be32(std::span<const std::byte> bytes, std::size_t at) {
  return static_cast<uint32_t>(bytes[at]) << 24 | static_cast<uint32_t>(bytes[at + 1]) << 16 | static_cast<uint32_t>(bytes[at + 2]) << 8 | static_cast<uint32_t>(bytes[at + 3]);
}

}  // namespace

std::optional<Bitmap> Bitmap::decode(std::span<const std::byte> qoi) {
  if (qoi.size() < HEADER_BYTES + sizeof END_MARK || std::memcmp(qoi.data(), "qoif", 4) != 0) return std::nullopt;
  Bitmap bitmap{.width = read_be32(qoi, 4), .height = read_be32(qoi, 8), .rgba = {}};
  const uint8_t channels = static_cast<uint8_t>(qoi[12]);
  if (!bitmap.width || !bitmap.height || bitmap.width > MAX_SIDE || bitmap.height > MAX_SIDE || (channels != 3 && channels != 4)) return std::nullopt;

  const std::span<const std::byte> data = qoi.subspan(HEADER_BYTES, qoi.size() - HEADER_BYTES - sizeof END_MARK);
  const std::size_t pixel_count = static_cast<std::size_t>(bitmap.width) * bitmap.height;
  bitmap.rgba.resize(pixel_count * 4);
  // 지나온 픽셀 64 칸 — 색의 해시 자리에 둔다 (INDEX 묶음이 가리킨다)
  std::array<Pixel, 64> seen;
  seen.fill({0, 0, 0, 0});
  // 첫 픽셀의 '앞 픽셀'은 불투명한 검정이다
  Pixel pixel;
  std::size_t at = 0;
  const auto next = [&] { return static_cast<uint8_t>(data[at++]); };
  for (std::size_t written = 0; written < pixel_count;) {
    if (at >= data.size()) return std::nullopt;
    const uint8_t tag = next();
    std::size_t run = 1;
    if (tag == 0xFE || tag == 0xFF) {
      // RGB · RGBA — 색을 그대로 적은 묶음
      const std::size_t operands = tag == 0xFE ? 3 : 4;
      if (data.size() - at < operands) return std::nullopt;
      pixel.r = next();
      pixel.g = next();
      pixel.b = next();
      if (tag == 0xFF) pixel.a = next();
    } else if (tag >> 6 == 0) {
      pixel = seen[tag];
    } else if (tag >> 6 == 1) {
      // DIFF — 앞 픽셀과의 차이, 채널마다 -2…1
      pixel.r = static_cast<uint8_t>(pixel.r + ((tag >> 4) & 3) - 2);
      pixel.g = static_cast<uint8_t>(pixel.g + ((tag >> 2) & 3) - 2);
      pixel.b = static_cast<uint8_t>(pixel.b + (tag & 3) - 2);
    } else if (tag >> 6 == 2) {
      // LUMA — 초록의 차이 -32…31, 빨강·파랑은 그 초록 차이에서 -8…7
      if (at >= data.size()) return std::nullopt;
      const uint8_t second = next();
      const int green = (tag & 0x3F) - 32;
      pixel.r = static_cast<uint8_t>(pixel.r + green - 8 + (second >> 4));
      pixel.g = static_cast<uint8_t>(pixel.g + green);
      pixel.b = static_cast<uint8_t>(pixel.b + green - 8 + (second & 0x0F));
    } else {
      // RUN — 앞 픽셀을 1…62 번 되풀이
      run = (tag & 0x3Fu) + 1;
      if (run > pixel_count - written) return std::nullopt;
    }
    seen[(pixel.r * 3 + pixel.g * 5 + pixel.b * 7 + pixel.a * 11) % 64] = pixel;
    for (; run > 0; run--, written++) std::memcpy(bitmap.rgba.data() + written * 4, &pixel, 4);
  }
  // 픽셀을 다 채우고 남는 묶음이 있으면 크기가 어긋난 파일이다
  if (at != data.size() || std::memcmp(qoi.data() + qoi.size() - sizeof END_MARK, END_MARK, sizeof END_MARK) != 0) return std::nullopt;
  return bitmap;
}

}  // namespace engine::hud
