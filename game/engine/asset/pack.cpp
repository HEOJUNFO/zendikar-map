#include "engine/asset/pack.hpp"

#include <algorithm>
#include <cstring>

namespace engine::asset {
namespace {

constexpr std::size_t HEADER_BYTES = 16;
constexpr uint32_t VERSION = 1;

uint32_t read_u32(std::span<const std::byte> bytes, std::size_t at) {
  uint32_t value;
  std::memcpy(&value, bytes.data() + at, sizeof(value));
  return value;
}

}  // namespace

std::optional<Pack> Pack::parse(std::span<const std::byte> bytes) {
  // 'ZKPK' · u32 판 · u32 항목 수 · u32 파일 전체의 바이트 수 · 항목 표 · 데이터
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKPK", 4) != 0 || read_u32(bytes, 4) != VERSION) return std::nullopt;
  const uint32_t count = read_u32(bytes, 8);
  // 덜 받았거나 더 받은 파일
  if (count > MAX_ENTRIES || read_u32(bytes, 12) != bytes.size()) return std::nullopt;

  Pack pack;
  pack.entries_.reserve(count);
  std::size_t at = HEADER_BYTES;
  for (uint32_t i = 0; i < count; i++) {
    // 항목: u8 이름 길이 · 이름 · u32 데이터의 자리 · u32 데이터의 바이트 수
    if (bytes.size() - at < 1) return std::nullopt;
    const std::size_t length = static_cast<uint8_t>(bytes[at]);
    if (!length || bytes.size() - at - 1 < length + 8) return std::nullopt;
    const std::string_view name{reinterpret_cast<const char*>(bytes.data()) + at + 1, length};
    if (!std::all_of(name.begin(), name.end(), [](char c) { return c > 0x20 && c < 0x7F; })) return std::nullopt;
    pack.entries_.push_back({name, {}});
    at += 1 + length + 8;
  }
  // 데이터는 표 뒤, 파일 안에 있어야 한다
  std::size_t entry_at = HEADER_BYTES;
  for (PackEntry& entry : pack.entries_) {
    const std::size_t fields = entry_at + 1 + entry.name.size();
    const uint64_t offset = read_u32(bytes, fields), size = read_u32(bytes, fields + 4);
    if (offset < at || offset + size > bytes.size()) return std::nullopt;
    entry.bytes = bytes.subspan(offset, size);
    entry_at = fields + 8;
  }
  return pack;
}

}  // namespace engine::asset
