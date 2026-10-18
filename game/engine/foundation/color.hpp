#pragma once

namespace engine {

/** 선형 0..1. alpha 는 덮는 정도 — 1 이면 뒤를 다 가린다 (화면 위 2D 만 읽는다) */
struct Color {
  float red{}, green{}, blue{};
  float alpha{1.0f};
  constexpr bool operator==(const Color&) const = default;
};

}  // namespace engine
