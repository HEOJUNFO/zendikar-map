#include "engine/audio/qoa.hpp"

#include <algorithm>
#include <cstring>

namespace engine::audio {
namespace {

// QOA — 파일 머리 8 바이트('qoaf', 표본 수) + 프레임들. 수는 모두 빅 엔디언.
// 프레임: 머리 8 바이트(채널 수 u8, 표본율 u24, 이 프레임의 표본 수 u16, 프레임 바이트 수 u16) + 채널마다 LMS 상태 16 바이트(지난 표본 넷, 가중치 넷 — i16)
//         + 조각들 (조각 하나 8 바이트 = 눈금 번호 4 비트 + 잔차 3 비트 × 20 표본, 프레임 하나에 256 조각까지)
constexpr std::size_t FILE_HEADER = 8, FRAME_HEADER = 8, LMS_BYTES = 16, SLICE_BYTES = 8;
constexpr uint32_t SLICE_FRAMES = 20, FRAME_SLICES = 256;

// 잔차 3 비트가 뜻하는 값 — 눈금 번호 s 의 눈금 round((s + 1)^2.75) 에 (0.75, -0.75, 2.5, -2.5, 4.5, -4.5, 7, -7) 을 곱해 0 에서 먼 쪽으로 반올림한 것 (명세의 표)
constexpr int32_t DEQUANT[16][8] = {
    {1, -1, 3, -3, 5, -5, 7, -7},
    {5, -5, 18, -18, 32, -32, 49, -49},
    {16, -16, 53, -53, 95, -95, 147, -147},
    {34, -34, 113, -113, 203, -203, 315, -315},
    {63, -63, 210, -210, 378, -378, 588, -588},
    {104, -104, 345, -345, 621, -621, 966, -966},
    {158, -158, 528, -528, 950, -950, 1477, -1477},
    {228, -228, 760, -760, 1368, -1368, 2128, -2128},
    {316, -316, 1053, -1053, 1895, -1895, 2947, -2947},
    {422, -422, 1405, -1405, 2529, -2529, 3934, -3934},
    {548, -548, 1828, -1828, 3290, -3290, 5117, -5117},
    {696, -696, 2320, -2320, 4176, -4176, 6496, -6496},
    {868, -868, 2893, -2893, 5207, -5207, 8099, -8099},
    {1064, -1064, 3548, -3548, 6386, -6386, 9933, -9933},
    {1286, -1286, 4288, -4288, 7718, -7718, 12005, -12005},
    {1536, -1536, 5120, -5120, 9216, -9216, 14336, -14336},
};

uint32_t be(std::span<const std::byte> bytes, std::size_t at, int count) {
  uint32_t value = 0;
  for (int i = 0; i < count; i++) value = value << 8 | static_cast<uint32_t>(bytes[at + static_cast<std::size_t>(i)]);
  return value;
}

}  // namespace

std::optional<Pcm> decode_qoa(std::span<const std::byte> bytes) {
  if (bytes.size() < FILE_HEADER || std::memcmp(bytes.data(), "qoaf", 4) != 0) return std::nullopt;
  const uint32_t total = be(bytes, 4, 4);
  if (!total || total > MAX_QOA_FRAMES) return std::nullopt;
  Pcm pcm;
  pcm.frames.reserve(total);
  std::size_t at = FILE_HEADER;
  while (pcm.frames.size() < total) {
    if (bytes.size() - at < FRAME_HEADER + LMS_BYTES) return std::nullopt;
    const uint32_t channels = be(bytes, at, 1), rate = be(bytes, at + 1, 3), count = be(bytes, at + 4, 2), size = be(bytes, at + 6, 2);
    const uint32_t slices = (count + SLICE_FRAMES - 1) / SLICE_FRAMES;
    const uint32_t left = total - static_cast<uint32_t>(pcm.frames.size());
    if (channels != 1 || !rate || (pcm.rate && rate != pcm.rate)) return std::nullopt;
    // 프레임은 가득 차 있고, 마지막 프레임만 남은 만큼이다
    if (count != std::min(left, SLICE_FRAMES * FRAME_SLICES)) return std::nullopt;
    if (size != FRAME_HEADER + LMS_BYTES + slices * SLICE_BYTES || bytes.size() - at < size) return std::nullopt;
    pcm.rate = rate;
    int32_t history[4], weights[4];
    for (int i = 0; i < 4; i++) {
      history[i] = static_cast<int16_t>(be(bytes, at + FRAME_HEADER + static_cast<std::size_t>(i) * 2, 2));
      weights[i] = static_cast<int16_t>(be(bytes, at + FRAME_HEADER + 8 + static_cast<std::size_t>(i) * 2, 2));
    }
    at += FRAME_HEADER + LMS_BYTES;
    for (uint32_t pending = count; pending; at += SLICE_BYTES) {
      uint64_t slice = static_cast<uint64_t>(be(bytes, at, 4)) << 32 | be(bytes, at + 4, 4);
      const int32_t* dequant = DEQUANT[slice >> 60];
      slice <<= 4;
      for (uint32_t i = std::min(pending, SLICE_FRAMES); i; i--, pending--, slice <<= 3) {
        // 지난 표본 넷으로 내다본 값에 잔차를 더한다. 가중치는 잔차의 부호 쪽으로 조금씩 따라간다 (LMS)
        // (지어낸 파일의 가중치는 얼마든 커질 수 있다 — 넘치지 않게 64 비트로 더한다. 가중치 자체는 한 프레임에 5120 × 896 넘게 움직이지 못한다)
        int64_t predicted = 0;
        for (int k = 0; k < 4; k++) predicted += static_cast<int64_t>(weights[k]) * history[k];
        const int32_t residual = dequant[slice >> 61];
        const int32_t sample = static_cast<int32_t>(std::clamp<int64_t>((predicted >> 13) + residual, -32768, 32767));
        const int32_t delta = residual >> 4;
        for (int k = 0; k < 4; k++) weights[k] += history[k] < 0 ? -delta : delta;
        history[0] = history[1];
        history[1] = history[2];
        history[2] = history[3];
        history[3] = sample;
        pcm.frames.push_back(static_cast<int16_t>(sample));
      }
    }
  }
  return at == bytes.size() ? std::optional{std::move(pcm)} : std::nullopt;
}

}  // namespace engine::audio
