#include "engine/audio/bank.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>

#include "engine/audio/qoa.hpp"

namespace engine::audio {
namespace {

// .samplebank — 'ZKSB', 샘플 수(u32), 샘플마다 머리 36 바이트(이름 24 바이트(남는 자리는 0), 크기 f32, 묶음 u32, QOA 바이트 수 u32),
// 이어서 소리 덩어리들이 그 차례로. 리틀 엔디언. 덩어리는 QOA 파일('qoaf' 로 시작 — 안은 QOA 대로 빅 엔디언)이거나,
// 누르지 않은 소리('zpcm', 표본율 u32, 이어서 16 비트 표본들 — QOA 가 뭉개는 날카로운 충격음에 쓴다)다
constexpr std::size_t HEADER_BYTES = 8, ENTRY_BYTES = 36, NAME_BYTES = 24;
constexpr float MAX_GAIN = 8.0f;
constexpr uint32_t MAX_GROUP = 255;
constexpr std::size_t PCM_HEADER_BYTES = 8;
constexpr uint32_t MAX_RATE = 192000;

template <typename T>
T read(std::span<const std::byte> bytes, std::size_t at) {
  T value;
  std::memcpy(&value, bytes.data() + at, sizeof value);
  return value;
}

}  // namespace

std::optional<Bank> Bank::decode(std::span<const std::byte> bytes) {
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKSB", 4) != 0) return std::nullopt;
  const uint32_t count = read<uint32_t>(bytes, 4);
  if (count > MAX_SAMPLES || (bytes.size() - HEADER_BYTES) / ENTRY_BYTES < count) return std::nullopt;
  Bank bank;
  std::size_t data = HEADER_BYTES + count * ENTRY_BYTES;
  for (uint32_t i = 0; i < count; i++) {
    const std::size_t at = HEADER_BYTES + i * ENTRY_BYTES;
    const char* name = reinterpret_cast<const char*>(bytes.data() + at);
    const std::size_t length = static_cast<std::size_t>(std::find(name, name + NAME_BYTES, '\0') - name);
    const float gain = read<float>(bytes, at + NAME_BYTES);
    const uint32_t group = read<uint32_t>(bytes, at + NAME_BYTES + 4), size = read<uint32_t>(bytes, at + NAME_BYTES + 8);
    if (!length || !std::isfinite(gain) || gain < 0.0f || gain > MAX_GAIN || group > MAX_GROUP || size > bytes.size() - data) return std::nullopt;
    const std::span<const std::byte> blob = bytes.subspan(data, size);
    data += size;
    if (size >= PCM_HEADER_BYTES && std::memcmp(blob.data(), "zpcm", 4) == 0) {
      // 누르지 않은 소리 — 표본율이 0 이거나 표본이 반 토막 나 있으면 거절한다
      const uint32_t rate = read<uint32_t>(blob, 4);
      if (!rate || rate > MAX_RATE || (size - PCM_HEADER_BYTES) % 2 != 0) return std::nullopt;
      std::vector<int16_t> frames((size - PCM_HEADER_BYTES) / 2);
      if (!frames.empty()) std::memcpy(frames.data(), blob.data() + PCM_HEADER_BYTES, frames.size() * 2);
      bank.samples_.push_back({.name = {name, length}, .rate = rate, .gain = gain, .group = group, .frames = std::move(frames)});
      continue;
    }
    auto pcm = decode_qoa(blob);
    if (!pcm) return std::nullopt;
    bank.samples_.push_back({.name = {name, length}, .rate = pcm->rate, .gain = gain, .group = group, .frames = std::move(pcm->frames)});
  }
  return data == bytes.size() ? std::optional{std::move(bank)} : std::nullopt;
}

std::optional<uint32_t> Bank::find(std::string_view name) const {
  for (uint32_t i = 0; i < samples_.size(); i++)
    if (samples_[i].name == name) return i;
  return std::nullopt;
}

}  // namespace engine::audio
