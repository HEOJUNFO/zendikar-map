#pragma once

#include <array>
#include <cstdint>
#include <string_view>

namespace game {

// Skyclave memory seals: original names and text, no licensed card artwork.
enum class CardId : uint8_t { kor_updraft, roil_step, stonefang, echo_quiver, life_bloom, vampiric_rite, hedron_ward, spring_water };
struct Card {
  CardId id;
  std::string_view name;
  std::string_view effect;
  uint32_t price;
  bool repeatable{};
};
inline constexpr std::array<Card, 8> CARDS{{
    {CardId::kor_updraft, "코르의 상승기류", "공중에서 한 번 더 점프", 55},
    {CardId::roil_step, "탁류의 발걸음", "반박마다 대시 가능", 45},
    {CardId::stonefang, "석송곳니의 기억", "총알 피해 +25", 75},
    {CardId::echo_quiver, "하늘유적의 화살통", "탄창 +4발 / 즉시 채움", 40},
    {CardId::life_bloom, "무라사의 생명", "최대 체력 +25 / 회복 50", 50},
    {CardId::vampiric_rite, "구울 드라즈의 의식", "적 처치마다 체력 회복 5", 85},
    {CardId::hedron_ward, "헤드론의 수호", "피격 피해 25에서 15로", 65},
    {CardId::spring_water, "오란리에프의 샘", "체력 회복 40 / 반복 구매", 25, true},
}};
enum class ShopResult : uint8_t { browsing, purchased, insufficient_gold, already_owned, full_health, unavailable };

}  // namespace game
