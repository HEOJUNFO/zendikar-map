# The values' notes

What `prototypes/zendikar-expedition/config.js` said beside its values, kept here because `data/config.json`
holds no comments. The values themselves are in `data/config.json`.

- `seed`: every gameplay random call reads rng(), seeded from this (or ?seed= in the address)

---- The journey: how far the world lets you go before the Roil comes ----
- `journey_days`: days of travel before the Roil Elemental
- `near_dist`: map units: a trip this short takes 1 day
- `far_dist`: map units: up to this takes 2 days, farther 3
- `rough_stops`: stops the Roil puts 1 day farther, new each run
- `day_scale`: enemy hp and damage growth per day travelled (the Roil Elemental does not grow)
- `pair_day`: from this day on a wild fight has one more enemy; 99: never (a pair is too much for a three-energy deck)
- `first_fight_scale`: the first fight of a run is a lesson
- `elite_chance`: how often a wild place that has great beasts holds one this run
- `guard_chance`: how often the way into Kabira or the Makindi camp is watched this run

---- The expedition leader ----
- `energy`: energy each turn
- `hand_size`: cards drawn each turn

---- Rewards, towns and camps ----
- `gold_fight`: gold for a wild fight
- `gold_var`: plus up to this much, at random
- `gold_elite`: gold for a great beast
- `elite_heal`: hp back after a great beast
- `price_remove`: a town's fee to take a card out of the deck
- `camp_heal`: share of max hp a rest gives back

---- Pacing of what resolves on screen (seconds) ----
- `resolve_time`: one effect step
- `enemy_time`: pause before each enemy acts
- `travel_time`: the marker's trip across the map
- `float_time`: how long a damage number floats

---- Starter cards and lands ----
- `gear_blk`: Adventuring Gear: block on each landfall

---- Tazeem and Sejiri cards ----

---- Akoum cards ----
- `cobra_energy`: Lotus Cobra: energy on each landfall

---- Guul Draz cards ----
- `torch_burn`: burn left on the enemy
- `sellsword_fee`: gold he takes each time

---- Bala Ged cards ----
- `bellow_lf`: with landfall
- `cry_bonus`: added to every attack card this turn

---- Murasa cards ----
- `archer_dmg`: each of two arrows
- `blade_grow`: more each time it is played in a fight

---- Ondu cards ----
- `lynx_lf`: with landfall
- `shieldmate_lf`: with landfall
- `cobratrap_dmg`: each of four snakes
- `journey_turns`: turns an enemy stays away

---- What sets a trap off (the rest of the ZEN traps, cards2.js) ----
- `trap_fullhand`: other cards in hand
- `trap_bigdiscard`: cards in the discard pile
- `trap_threat`: damage the enemies intend, all told

---- Enemies: hp and what each move does ----
- `baloth_charge`: doubled by the mark it makes first
- `baloth_land_str`: strength it gains when you play a land
- `tiger_stalk_str`: strength it gains while it stalks
- `hellkite_twin`: each of its two passes
- `roil_rage`: strength it gains below half hp

---- The full ZEN set: one value for each number on a card or an enemy (cards2.js, enemies2.js) ----
