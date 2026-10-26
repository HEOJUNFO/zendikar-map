#pragma once

#include <array>
#include <cstdint>
#include <string_view>

namespace game {

// 기억 인장(증강) — 이 게임이 지어낸 이름·효과·그림이다 (판매용 카드의 그림을 쓰지 않는다).
// 효과는 유물·국소 주문·일시적 잔상의 작용이고, 젠디카르의 자연법칙이나 종족 특성이 아니다 (docs/game-art-lore.md).
// 그림과 등급·문구의 원본은 content/images/cards/manifest.json — 차례와 이름이 이 표와 같아야 한다 (tools/art/prepare-card-art.mjs 가 본다).
enum class CardId : uint8_t {
  kor_updraft,
  roil_step,
  bullet_friends,
  reserved_miss,
  casing_crabs,
  self_funeral,
  illegal_extension,
  return_to_sender,
  blood_takeaway,
  landing_service,
  fold_roil,
  biting_change,
  spring_water,
};
/** 그림의 등급 — 프레임의 실버·골드·프리즘. 샘물은 그림 없이 룬으로 그린다 */
enum class CardTier : uint8_t { silver, gold, prism, supply };
struct Card {
  CardId id;
  /** 그림·프레임의 이름 (content/images/cards 의 art-<art>-v3.png) — 비어 있으면 그림이 없다 */
  std::string_view art;
  std::string_view name;
  /** 효과 — 줄은 " / " 로 가른다 (두 줄까지) */
  std::string_view effect;
  uint32_t price;
  CardTier tier;
  bool repeatable{};
};
inline constexpr std::array<Card, 13> CARDS{{
    {CardId::kor_updraft, "kor-updraft", "코르의 상승기류", "공중에서 한 번 더 점프", 55, CardTier::silver},
    {CardId::roil_step, "roil-step", "탁류의 발걸음", "반박자마다 대시 가능", 45, CardTier::silver},
    {CardId::bullet_friends, "bullet-friends", "총알도 친구가 필요해", "같은 적 3회 명중 시 공명구 / 내 사격마다 다른 적 추격", 130, CardTier::prism},
    {CardId::reserved_miss, "reserved-miss", "빗나간 게 아니라 예약한 거다", "빗나간 탄 최대 6발 저장 / 다음 명중 때 사방 집중 사격", 85, CardTier::gold},
    {CardId::casing_crabs, "casing-crabs", "탄창에 헤드론 게가 산다", "재장전하면 게 잔상 3마리 / 적을 물고 폭발", 60, CardTier::silver},
    {CardId::self_funeral, "self-funeral", "장례식은 본인이 진행하세요", "처치한 적의 기억이 동료 공격 / 처치하면 이어서 5연쇄까지", 90, CardTier::gold},
    {CardId::illegal_extension, "illegal-extension", "하늘폐허 무허가 증축", "정박 대시로 유적 초소 잔상 / 4초간 내 사격 복제, 최대 2채", 140, CardTier::prism},
    {CardId::return_to_sender, "return-to-sender", "헤드론은 반품을 거절하지 않는다", "적 투사체를 막아 3발 보관 / 정박 사격 때 3배로 반송", 80, CardTier::gold},
    {CardId::blood_takeaway, "blood-takeaway", "피는 포장해 드릴게요", "처치마다 체력 8 회복 / 만피면 핏방울: 막고 반격", 120, CardTier::prism},
    {CardId::landing_service, "landing-service", "무라사 착지 청소 대행", "점프 착지 때 뿌리 발 강림 / 가까운 적 3에 피해와 기절", 85, CardTier::gold},
    {CardId::fold_roil, "fold-roil", "탁류야, 저놈 접어라", "같은 적 정박 2회 명중 시 / 주변까지 묶고 피해 공유", 150, CardTier::prism},
    {CardId::biting_change, "biting-change", "잔돈에 이빨이 났다", "골드를 얻으면 동전 잔상 / 가까운 적을 쫓아 공격", 55, CardTier::silver},
    {CardId::spring_water, "", "오란리에프의 샘", "체력 40 회복 / 반복 구매 가능", 25, CardTier::supply, true},
}};
inline constexpr int32_t SHOP_REROLL_HEALTH = 25;
inline constexpr std::size_t SHOP_OFFERS = 3;
enum class ShopResult : uint8_t { browsing, purchased, insufficient_gold, already_owned, full_health, unavailable, insufficient_health, rerolled, no_new_offers };

// ── 증강의 수치 — 손으로 느껴 가며 고칠 값 (피해는 체력, 시간은 틱, 거리는 m) ──
namespace augment {
/** 총알도 친구가 필요해 — 같은 적에게 이만큼 맞히면 공명구가 붙는다. 한꺼번에 붙어 있는 공명구의 상한, 공명구가 쏘는 한 발의 피해 */
inline constexpr uint8_t SEAL_HITS = 3;
inline constexpr uint32_t SEAL_LIMIT = 3;
inline constexpr int32_t SEAL_DAMAGE = 35;
/** 빗나간 게 아니라 예약한 거다 — 저장하는 빗나간 탄의 상한과 한 발의 피해 */
inline constexpr uint32_t RESERVED_LIMIT = 6;
inline constexpr int32_t RESERVED_DAMAGE = 45;
/** 탄창에 헤드론 게가 산다 — 탄창을 끼울 때마다 나오는 게 잔상의 수, 무는 피해, 터지는 피해와 반지름 */
inline constexpr uint32_t CRAB_COUNT = 3;
inline constexpr int32_t CRAB_BITE = 40;
inline constexpr int32_t CRAB_BURST = 30;
inline constexpr float CRAB_BURST_RADIUS = 2.5f;
/** 장례식은 본인이 진행하세요 — 기억 잔상의 마지막 공격 피해와 연쇄의 상한 */
inline constexpr int32_t FUNERAL_DAMAGE = 110;
inline constexpr uint8_t FUNERAL_CHAIN = 5;
/** 하늘폐허 무허가 증축 — 초소 잔상이 남는 시간(4 초), 한꺼번에 서 있는 수, 복제한 사격의 피해 */
inline constexpr uint32_t OUTPOST_TICKS = 240;
inline constexpr uint32_t OUTPOST_LIMIT = 2;
inline constexpr int32_t OUTPOST_DAMAGE = 40;
/** 헤드론은 반품을 거절하지 않는다 — 보관하는 투사체의 상한, 막는 반지름(몸의 가운데에서), 반송할 때 한 발이 갈라지는 수와 그 피해 */
inline constexpr uint32_t RETURN_LIMIT = 3;
inline constexpr float RETURN_GUARD = 1.6f;
inline constexpr uint32_t RETURN_SPLIT = 3;
inline constexpr int32_t RETURN_DAMAGE = 40;
/** 피는 포장해 드릴게요 — 처치마다 회복, 만피일 때 보관하는 핏방울의 상한, 핏방울이 반격하는 피해 */
inline constexpr int32_t BLOOD_HEAL = 8;
inline constexpr uint32_t BLOOD_LIMIT = 3;
inline constexpr int32_t BLOOD_DAMAGE = 120;
/** 무라사 착지 청소 대행 — 점프 뒤 착지에서 밟는 거리, 한 번에 밟는 적의 수, 피해, 기절(두 박) */
inline constexpr float STOMP_REACH = 9.0f;
inline constexpr uint32_t STOMP_TARGETS = 3;
inline constexpr int32_t STOMP_DAMAGE = 80;
inline constexpr uint32_t STOMP_STUN = 80;
/** 탁류야, 저놈 접어라 — 같은 적에게 정박으로 맞힌 수, 함께 묶는 반지름, 묶어 두는 시간(세 박), 들어 올리는 높이 */
inline constexpr uint8_t FOLD_HITS = 2;
inline constexpr float FOLD_RADIUS = 7.0f;
inline constexpr uint32_t FOLD_TICKS = 120;
inline constexpr float FOLD_LIFT = 1.6f;
/** 잔돈에 이빨이 났다 — 골드를 얻을 때마다 나오는 동전 잔상의 수와 피해 */
inline constexpr uint32_t COIN_COUNT = 2;
inline constexpr int32_t COIN_DAMAGE = 45;
}  // namespace augment

}  // namespace game
