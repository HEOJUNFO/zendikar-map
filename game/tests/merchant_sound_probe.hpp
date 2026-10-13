#pragma once

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <vector>

#include "gameplay/content/assets.hpp"
#include "gameplay/presentation/sound.hpp"

namespace merchant_sound_probe {
inline int run() {
  int failures = 0;
  const auto expect = [&](bool ok, const char* message) { if (!ok) { std::printf("FAIL: %s\n", message); ++failures; } };
  const auto bank = engine::audio::Bank::decode(game::assets::sample_bank());
  const auto song = bank ? engine::audio::Song::decode(game::assets::pulse_song(), static_cast<uint32_t>(bank->samples().size())) : std::nullopt;
  if (!bank || !song) return 1;
  const std::vector<engine::Aabb> floor{{{-16, -1, -16}, {16, 0, 16}}};
  game::RoomKit kit{};
  for (auto& room : kit.rooms) room = floor;
  const game::Room shop{.x = 0, .z = 0, .doors = 0, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0, .kind = game::RoomKind::shop};
  game::World world({{shop}}, kit);
  for (int tick = 0; tick < 60; ++tick) world.step();
  game::Sound sound(*bank, *song, 48000);
  const auto has = [&](const char* name, float pitch) {
    const auto sample = bank->find(name);
    const auto plays = sound.plays(world);
    return sample && std::any_of(plays.begin(), plays.end(), [&](const auto& play) {
      return play.sample == *sample && std::fabs(play.pitch - pitch) < 1e-5f && std::isfinite(play.gain) && play.gain > 0.0f;
    });
  };
  expect(world.interact_shop() && has("ui_press", 0.85f), "shop audio: approaching and opening emits a real purchase-panel cue");
  world.step();
  world.award_gold(1000, {});
  uint32_t slot = 0;
  while (slot < world.offer_count() && world.offers()[slot] == game::CardId::spring_water) ++slot;
  expect(slot < world.offer_count() && world.buy_card(slot) && has("ui_press", 1.15f), "shop audio: successful purchase emits its own accepted cue");
  const int32_t health = world.player().health;
  expect(world.reroll_shop() && world.player().health == health - 25 && has("hurt", 0.85f) && has("ui_move", 0.9f),
         "shop audio: paid reroll emits the blood-price and offer-change samples");
  world.close_shop();
  world.move(-1.0f, 0.0f);
  for (int tick = 0; tick < 50; ++tick) world.step();
  world.move(0.0f, 0.0f);
  for (int tick = 0; tick < 20; ++tick) world.step();
  const auto* merchant = world.merchant();
  if (!merchant) return failures + 1;
  const float distance = std::hypot(world.player().position.x - merchant->position.x, world.player().position.z - merchant->position.z);
  world.look(0.0f, std::atan2(merchant->position.y + 0.85f - world.player().position.y, distance) - world.player().pitch);
  for (int shot = 0; shot < 3 && world.merchant()->phase == game::MerchantPhase::seated; ++shot) {
    while (world.tick() % game::TICKS_PER_SLOT) world.step();
    world.act(game::Action::fire);
    for (uint32_t tick = 0; tick < game::TICKS_PER_SLOT; ++tick) world.step();
  }
  expect(world.merchant()->phase == game::MerchantPhase::fallen && has("kill_glass", 0.65f), "merchant audio: a real lethal shot emits the falling cue");
  return failures;
}
}  // namespace merchant_sound_probe
