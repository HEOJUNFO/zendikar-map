#pragma once

namespace engine {

/** 선형 0..1 */
struct Color {
  float red{}, green{}, blue{};
  constexpr bool operator==(const Color&) const = default;
};

}  // namespace engine
