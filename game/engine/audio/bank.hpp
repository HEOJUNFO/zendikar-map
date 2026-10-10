#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

// 샘플 뱅크 — 게임이 내는 소리의 재료 (짧은 한 채널 소리들). 무엇이 어떤 소리인지는 모른다: 이름과 번호로만 가린다.
// 데이터는 tools/samplec.mjs 가 WAV 들에서 옮긴 .samplebank 한 파일이다 (형식은 그 도구의 머리말). 소리는 QOA 로 눌려 있거나 누르지 않은 16 비트 표본이다.
namespace engine::audio {

struct Sample {
  std::string name;
  /** 표본율 (Hz) */
  uint32_t rate{};
  /** 이 샘플을 틀 때마다 곱하는 크기 */
  float gain{1.0f};
  /** 묶음 — 0 이 아니면, 같은 묶음의 소리가 새로 날 때 울리던 것이 끊긴다 (닫힌 하이햇이 열린 하이햇을 끊는다) */
  uint32_t group{};
  std::vector<int16_t> frames;
};

class Bank {
 public:
  /** 뱅크에 담을 수 있는 샘플 수 */
  static constexpr uint32_t MAX_SAMPLES = 1024;

  Bank() = default;
  explicit Bank(std::vector<Sample> samples) : samples_(std::move(samples)) {}

  /** 머리가 어긋났거나, 수·이름·크기·묶음이 범위 밖이거나, 데이터가 모자라거나 남으면 nullopt */
  static std::optional<Bank> decode(std::span<const std::byte> bytes);

  std::span<const Sample> samples() const { return samples_; }
  /** 그 이름의 샘플 번호 — 없으면 nullopt */
  std::optional<uint32_t> find(std::string_view name) const;

 private:
  std::vector<Sample> samples_;
};

}  // namespace engine::audio
