#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string_view>
#include <vector>

// 에셋 팩 — 이름 붙은 바이트 덩어리들을 한 파일로 묶은 것 (tools/packc.mjs 가 만든다, 형식은 그 머리말).
// 프로그램 밖에 두고 실행 중에 받는 에셋을 담는다. 덩어리에 무엇이 담겼는지는 모른다 (그림인지 모델인지는 쓰는 쪽이 안다).
namespace engine::asset {

struct PackEntry {
  std::string_view name;
  std::span<const std::byte> bytes;
};

class Pack {
 public:
  /** 항목 수의 상한 — 이보다 많다는 팩은 거절한다 */
  static constexpr uint32_t MAX_ENTRIES = 4096;

  /**
   * 팩을 읽는다 — 받은 파일은 믿지 않는다: 머리·판·전체 길이가 어긋나거나, 항목 표가 잘렸거나, 이름이 빈칸 없는 ASCII 가 아니거나,
   * 항목이 표와 겹치거나 파일을 벗어나면 nullopt. 항목은 bytes 를 가리키기만 한다 — bytes 가 살아 있는 동안만 유효하다
   */
  static std::optional<Pack> parse(std::span<const std::byte> bytes);

  /** 팩에 적힌 차례대로 */
  std::span<const PackEntry> entries() const { return entries_; }

 private:
  std::vector<PackEntry> entries_;
};

}  // namespace engine::asset
