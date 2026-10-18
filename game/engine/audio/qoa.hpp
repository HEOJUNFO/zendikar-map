#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

namespace engine::audio {

/** 한 채널의 소리 — 16 비트 표본들과 그 표본율 */
struct Pcm {
  uint32_t rate{};
  std::vector<int16_t> frames;
};

/** 한 번에 푸는 길이의 상한 (표본) — 이보다 긴 소리는 거절한다 (48 kHz 로 두 분) */
inline constexpr uint32_t MAX_QOA_FRAMES = 48000 * 120;

/**
 * QOA(qoaformat.org) 파일 하나를 푼다 — 모노만. tools/samplec.mjs 가 WAV 에서 옮긴 것이다 (엔진은 WAV·FLAC·OGG 를 읽지 않는다).
 * 머리가 어긋났거나, 채널이 하나가 아니거나, 프레임마다 표본율이 다르거나, 데이터가 모자라거나 남으면 nullopt
 */
std::optional<Pcm> decode_qoa(std::span<const std::byte> bytes);

}  // namespace engine::audio
