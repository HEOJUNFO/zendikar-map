// PROTOTYPE - NOT FOR PRODUCTION
// Question: 세계 지도에서 갈 곳을 고르는 것이 곧 덱을 짓는 일이 될 때, 젠디카르를 여행하는 느낌과 덱빌더의 재미가 한 판 안에서 함께 살아나는가?
// Date: 2026-11-10
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- The journey: how far the world lets you go before the Roil comes ----
  journey_days: { value: 8, min: 4, max: 14, step: 1 }, // days of travel before the Roil Elemental
  near_dist: { value: 520, min: 200, max: 1000, step: 20 }, // map units: a trip this short takes 1 day
  far_dist: { value: 1060, min: 600, max: 2000, step: 20 }, // map units: up to this takes 2 days, farther 3
  rough_stops: { value: 2, min: 0, max: 5, step: 1 }, // stops the Roil puts 1 day farther, new each run
  day_scale: { value: 0.04, min: 0, max: 0.3, step: 0.01 }, // enemy hp and damage growth per day travelled (the Roil Elemental does not grow)
  pair_day: { value: 99, min: 1, max: 99, step: 1 }, // from this day on a wild fight has one more enemy; 99: never (a pair is too much for a three-energy deck)
  first_fight_scale: { value: 0.75, min: 0.4, max: 1, step: 0.05 }, // the first fight of a run is a lesson

  // ---- The expedition leader ----
  player_hp: { value: 70, min: 20, max: 120, step: 5 },
  energy: { value: 3, min: 1, max: 6, step: 1 }, // energy each turn
  hand_size: { value: 5, min: 3, max: 8, step: 1 }, // cards drawn each turn
  start_gold: { value: 40, min: 0, max: 200, step: 5 },

  // ---- Rewards, towns and camps ----
  gold_fight: { value: 14, min: 0, max: 60, step: 1 }, // gold for a wild fight
  gold_var: { value: 6, min: 0, max: 20, step: 1 }, // plus up to this much, at random
  gold_elite: { value: 30, min: 0, max: 100, step: 5 }, // gold for a great beast
  elite_heal: { value: 8, min: 0, max: 30, step: 1 }, // hp back after a great beast
  price_common: { value: 30, min: 5, max: 100, step: 5 },
  price_uncommon: { value: 45, min: 5, max: 150, step: 5 },
  price_rare: { value: 70, min: 5, max: 200, step: 5 },
  price_mythic: { value: 95, min: 5, max: 250, step: 5 },
  price_remove: { value: 40, min: 0, max: 150, step: 5 }, // a town's fee to take a card out of the deck
  camp_heal: { value: 0.3, min: 0.1, max: 1, step: 0.05 }, // share of max hp a rest gives back

  // ---- Pacing of what resolves on screen (seconds) ----
  resolve_time: { value: 0.2, min: 0.05, max: 0.6, step: 0.01 }, // one effect step
  enemy_time: { value: 0.45, min: 0.1, max: 1.2, step: 0.05 }, // pause before each enemy acts
  travel_time: { value: 1.1, min: 0.2, max: 3, step: 0.1 }, // the marker's trip across the map
  float_time: { value: 0.9, min: 0.3, max: 2, step: 0.1 }, // how long a damage number floats

  // ---- Starter cards and lands ----
  machete_dmg: { value: 6, min: 1, max: 20, step: 1 },
  defense_blk: { value: 5, min: 1, max: 20, step: 1 },
  gear_blk: { value: 4, min: 1, max: 12, step: 1 }, // Adventuring Gear: block on each landfall
  island_draw: { value: 1, min: 0, max: 3, step: 1 },
  mountain_dmg: { value: 3, min: 0, max: 10, step: 1 },
  swamp_dmg: { value: 2, min: 0, max: 10, step: 1 },
  swamp_heal: { value: 1, min: 0, max: 6, step: 1 },
  forest_blk: { value: 3, min: 0, max: 10, step: 1 },
  plains_heal: { value: 2, min: 0, max: 8, step: 1 },

  // ---- Tazeem and Sejiri cards ----
  tern_dmg: { value: 5, min: 1, max: 20, step: 1 },
  brave_blk: { value: 9, min: 1, max: 24, step: 1 },
  carto_blk: { value: 4, min: 0, max: 16, step: 1 },

  // ---- Akoum cards ----
  burst_dmg: { value: 9, min: 1, max: 24, step: 1 },
  arrow_dmg: { value: 9, min: 1, max: 30, step: 1 },
  inferno_dmg: { value: 11, min: 1, max: 30, step: 1 },
  guide_dmg: { value: 4, min: 1, max: 12, step: 1 },
  cobra_energy: { value: 1, min: 1, max: 3, step: 1 }, // Lotus Cobra: energy on each landfall

  // ---- Guul Draz cards ----
  bite_dmg: { value: 6, min: 1, max: 20, step: 1 },
  bite_heal: { value: 3, min: 0, max: 10, step: 1 },
  torch_dmg: { value: 8, min: 1, max: 24, step: 1 },
  torch_burn: { value: 3, min: 0, max: 8, step: 1 }, // burn left on the enemy
  pitfall_dmg: { value: 12, min: 1, max: 36, step: 1 },
  sellsword_dmg: { value: 9, min: 1, max: 24, step: 1 },
  sellsword_fee: { value: 2, min: 0, max: 10, step: 1 }, // gold he takes each time

  // ---- Bala Ged cards ----
  bellow_dmg: { value: 4, min: 1, max: 20, step: 1 },
  bellow_lf: { value: 12, min: 1, max: 36, step: 1 }, // with landfall
  cry_bonus: { value: 4, min: 1, max: 12, step: 1 }, // added to every attack card this turn
  puma_dmg: { value: 5, min: 1, max: 20, step: 1 },
  puma_blk: { value: 3, min: 0, max: 12, step: 1 },

  // ---- Murasa cards ----
  escape_blk: { value: 8, min: 1, max: 24, step: 1 },
  escape_heal: { value: 2, min: 0, max: 10, step: 1 },
  archer_dmg: { value: 4, min: 1, max: 12, step: 1 }, // each of two arrows
  blade_dmg: { value: 5, min: 1, max: 20, step: 1 },
  blade_grow: { value: 3, min: 0, max: 8, step: 1 }, // more each time it is played in a fight

  // ---- Ondu cards ----
  lynx_dmg: { value: 2, min: 0, max: 12, step: 1 },
  lynx_lf: { value: 8, min: 1, max: 24, step: 1 }, // with landfall
  shieldmate_blk: { value: 7, min: 1, max: 20, step: 1 },
  shieldmate_lf: { value: 11, min: 1, max: 30, step: 1 }, // with landfall
  cobratrap_dmg: { value: 3, min: 1, max: 10, step: 1 }, // each of four snakes
  journey_turns: { value: 2, min: 1, max: 4, step: 1 }, // turns an enemy stays away

  // ---- Enemies: hp and what each move does ----
  recluse_hp: { value: 24, min: 5, max: 80, step: 1 },
  recluse_atk: { value: 6, min: 1, max: 20, step: 1 },
  recluse_atk2: { value: 9, min: 1, max: 24, step: 1 },
  recluse_blk: { value: 4, min: 0, max: 16, step: 1 },
  mongrel_hp: { value: 26, min: 5, max: 80, step: 1 },
  mongrel_atk: { value: 7, min: 1, max: 20, step: 1 },
  mongrel_fire: { value: 4, min: 1, max: 16, step: 1 },
  mongrel_burn: { value: 2, min: 0, max: 6, step: 1 },
  mosquito_hp: { value: 12, min: 3, max: 50, step: 1 },
  mosquito_atk: { value: 3, min: 1, max: 12, step: 1 },
  mosquito_dive: { value: 6, min: 1, max: 20, step: 1 },
  surrakar_hp: { value: 30, min: 5, max: 90, step: 1 },
  surrakar_atk: { value: 9, min: 1, max: 24, step: 1 },
  surrakar_blk: { value: 6, min: 0, max: 20, step: 1 },
  surrakar_str: { value: 2, min: 0, max: 6, step: 1 },
  baloth_hp: { value: 30, min: 5, max: 90, step: 1 },
  baloth_atk: { value: 7, min: 1, max: 20, step: 1 },
  baloth_charge: { value: 10, min: 1, max: 20, step: 1 }, // doubled by the mark it makes first
  baloth_land_str: { value: 1, min: 0, max: 4, step: 1 }, // strength it gains when you play a land
  tiger_hp: { value: 28, min: 5, max: 80, step: 1 },
  tiger_atk: { value: 8, min: 1, max: 20, step: 1 },
  tiger_ambush: { value: 11, min: 1, max: 28, step: 1 },
  hellkite_hp: { value: 55, min: 20, max: 200, step: 5 },
  hellkite_dive: { value: 9, min: 1, max: 30, step: 1 },
  hellkite_twin: { value: 5, min: 1, max: 20, step: 1 }, // each of its two passes
  hellkite_blk: { value: 8, min: 0, max: 30, step: 1 },
  hellkite_str: { value: 2, min: 0, max: 6, step: 1 },
  stomper_hp: { value: 55, min: 20, max: 240, step: 5 },
  stomper_atk: { value: 10, min: 1, max: 40, step: 1 },
  stomper_roar: { value: 2, min: 0, max: 8, step: 1 },
  roil_hp: { value: 110, min: 40, max: 400, step: 5 },
  roil_atk: { value: 8, min: 1, max: 30, step: 1 },
  roil_slam: { value: 16, min: 1, max: 40, step: 1 },
  roil_blk: { value: 12, min: 0, max: 40, step: 1 },
  roil_swallow: { value: 12, min: 1, max: 30, step: 1 },
  roil_rage: { value: 3, min: 0, max: 8, step: 1 }, // strength it gains below half hp
};
