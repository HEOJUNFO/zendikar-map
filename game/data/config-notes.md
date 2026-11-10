# The values' notes

What `prototypes/zendikar-expedition/config.js` said beside its values, kept here because `data/config.json`
holds no comments. The values themselves are in `data/config.json`.

- `seed`: every gameplay random call reads rng(), seeded from this (or ?seed= in the address)

---- The journey: how far the world lets you go before the Roil comes ----
- `journey_days`: days of travel before the Roil Elemental
- `hop_far`: map units: a walk between two places of a continent takes 1 day up to this, 2 beyond
- `sail_far`: map units along the way by sea (`data/world.json`, `ways`): a crossing to another continent's port takes 2 days up to this, 3 beyond
- `rough_stops`: places (never a port) the Roil puts 1 day farther to walk to, new each run
- `day_scale`: enemy hp and damage growth per day travelled (the Roil Elemental does not grow)
- `pair_day`: from this day on a wild fight has one more enemy; 99: never (a pair is too much for a three-energy deck)
- `first_fight_scale`: the first fight of a run is a lesson
- `foe_hp`: every enemy's hp, times this
- `foe_damage`: every enemy attack, times this
- `elite_chance`: how often a wild place that has great beasts holds one this run
- `guard_chance`: how often the way into Kabira or the Makindi camp is watched this run

---- The expedition leader, the party and the lands ----
- `hand_size`: cards drawn each turn
- `start_lands`: lands already in play as a fight opens, picked for the colours the deck wants most
- `party_max`: creatures the field holds beside the leader
- `leader_atk`: what the leader's strike deals
- `leader_def`: what the leader's guard adds to the block

---- What happens on the way (events.ts) ----
- `event_chance`: how often a walk meets a happening before its stop (never a run's first trip, never the walk to a site, each happening once a run)
- `sea_event_chance`: the same for a crossing: the sea is where more happens
- `event_own_weight`: how many times likelier a happening of this continent is than one met anywhere
- `ev_odds`: the odds of the first side of a way that is a gamble
- `ev_days`: the days a way costs or wins back
- `ev_heal_small`, `ev_heal_big`: hp a way gives back
- `ev_hurt_small`, `ev_hurt_big`: hp a way costs (a happening never takes the last hp)
- `ev_gold_small`, `ev_gold_big`: gold a way gives, or loses
- `ev_toll`: a toll, a bribe, a wage or a price paid on the way; a way that pays is closed to one without the gold
- `ev_vigor`: max hp a way adds

---- Rewards, towns and camps ----
- `gold_fight`: gold for a wild fight
- `gold_var`: plus up to this much, at random
- `gold_elite`: gold for a great beast
- `elite_heal`: hp back after a great beast
- `price_remove`: a town's fee to take a card out of the deck
- `price_basic`: a town's price for a basic land of any colour
- `offcolor_weight`: how much less often a card is offered whose colour no land of the expedition makes (1: as often as any)
- `camp_heal`: share of max hp a rest gives back

---- Pacing of what resolves on screen (seconds) ----
- `resolve_time`: one effect step
- `enemy_time`: pause before each enemy acts
- `travel_time`: the marker's walk across a continent's map
- `sail_time`: the ship's crossing on the world map: longer than a walk, so a crossing feels like one
- `float_time`: how long a damage number floats

---- What sets a trap off (cards2.ts) ----
- `trap_fullhand`: other cards in hand
- `trap_bigdiscard`: cards in the discard pile
- `trap_threat`: damage the enemies intend, all told

---- Enemies: hp and what each move does ----
- `baloth_charge`: doubled by the mark it makes first
- `baloth_land_str`: strength it gains when a land of yours comes into play
- `tiger_stalk_str`: strength it gains while it stalks
- `hellkite_twin`: each of its two passes
- `roil_rage`: strength it gains below half hp

---- The full ZEN set: one value for each number on a card or an enemy (cards2.ts, enemies2.ts) ----
A card's values are named `<card>_<what>`: `_atk` and `_def` (a creature's attack and guard), `_gear_atk` and `_gear_def` (what the one who wears it gains), `_<effect>` (an effect when it is played), `_on_<event>_<effect>` (a hook), `_rally_<effect>`, `_quest_need`, `_reward_<effect>`, `_then_<...>`, `_passive_<...>`. `tools/gen-content.mjs` names them and writes them from `tools/specs/`.

---- Tuning, 2026-11-10: how hard the fights press, set by arithmetic and not yet by play ----
The brief's Challenge asks that, from the second fight on, ignoring the enemies' intents costs about a third of your hp (23 of 70), that the first fight is hard to lose, and that a deck nobody refined struggles against the Roil Elemental. An arithmetic read of the enemies' numbers (the player deals a fixed damage a turn and never blocks) gave 10, 8 and 7 hp lost in a fight in the wilds on days 2, 4 and 6: well under that, and falling as the deck grew. So:
- `day_scale`: 0.04 → 0.07. Enemies grow about as fast as a deck does; the Roil Elemental and a run's first fight do not grow.
- the hp of 38 enemies of the wilds: each × 1.4 (`recluse_hp` 24 → 34 ... `hedron_crab_hp` 14 → 20). A fight lasts about 4 turns, so a move that takes a turn to set up lands. Left as written: `shoal_serpent_hp`, `bloodghast_hp`, `goblin_bushwhacker_hp`, `warren_instigator_hp`, `mindless_null_hp`, every great beast and the Roil Elemental.
- `first_fight_scale`: 0.75 → 0.55, so the first fight's enemy has the hp it had (0.55 × 1.4 is about 0.75).
- `rampaging_baloths_m0_d`, `rampaging_baloths_m2_d`: 7 → 6. It was the one great beast that took most of a full hp bar from a leader who ignored it.
The same read now gives 18, 18 and 17 in the wilds and 32 to 37 from a great beast. Play has the last word: each of these is a slider.

---- The card system rewritten, 2026-11-10: cards used as the kind they are, lands that make mana, colours ----
The person said creatures and equipment played as attack cards were a wrong design, that lands worked oddly and that mana colours were missing. So energy is gone: lands make mana, a card costs mana with one of its colour, a creature stays on the field and strikes or guards each turn, equipment and auras are worn, and the 36 cards first written by hand were written again with the rest (`tools/specs/zen-cards.mjs`). Every card value was written anew from that table; the values of the old cards (`machete_dmg` ... `shieldmate_lf`, `energy`) were taken out.

The numbers below were set against a temporary auto-player (not kept in the project) that played each fight through the real rules two ways, one ignoring the enemies' intents and one guarding when it paid to. They are a starting point, not a finding: nobody has played them yet, and each is a slider.
- A creature's attack and guard: 4 or 5 in all at a cost of 1 and two or three more for each mana above that, more of it attack than guard, so striking is the default and guarding a choice; less when it does something else.
- `leader_atk` 3, `leader_def` 2: a turn with no card to play still does something.
- `start_lands` 2: with the turn's land, three mana on the first turn, as the three energy were.
- `bold_defense_block` 5, `shieldmates_blessing_block` 3: once the creatures are out, a thin deck draws its guard spells every turn.
- `foe_hp` 1.15, `foe_damage` 1.15: strikes cost no mana once a creature is out, so every enemy is a little tougher and hits a little harder than the numbers tuned for three energy.
- `rampaging_baloths_territory`, `baloth_woodcrasher_territory` 2 → 1, `ob_nixilis_the_fallen_landhurt` 3 → 2, `obsidian_fireheart_landburn` 2 → 1: a land comes into play nearly every turn now, not once in a while.
- `roil_hp` 110 → 135, `roil_atk` 8 → 11, `roil_slam` 16 → 20, `roil_swallow` 12 → 15: a full field stood through the old Roil Elemental without a scratch. Its swallow now takes a creature as well as a lasting card.
What the auto-player saw with these: the first fight costs 0 to 3 hp; from the second fight on a fight in the wilds costs a leader who ignores intents about 27 hp (the brief asks for a third of 70) and one who guards 6 on day 2, 10 on day 4, 18 on day 7; a great beast 17 to 29 with guarding; the Roil Elemental is beaten 4 times in 5 from 50 hp with a deck of ten picks nobody chose with care, and hardly ever by ignoring it. A fight runs 5 to 6 turns, the Roil Elemental about 10.

---- More of the cards' printed systems, 2026-11-10: kicker, instants kept, fliers and reach, and what the cards print ----
The person asked for a check of how the other systems of the cards were brought in. Each ZEN card's printed keywords and text were read against the game (fetched once, kept out of the project), and four things were chosen: a kicker on the 18 cards that print one and can use it, instants that stay in hand, enemies that fly, and about twenty cards put right (flying, haste, trample, landwalk, a lean to attack or guard the card does not print, landfall on cards that print none).
- A kicker's cost is written on the card's line in `src/cards2.ts` like the card's own cost; what the kicked effect does has values named `<card>_kick_<effect>`.
- `foe_damage` 1.15 → 1.3 and every creature's guard +1 (but a defender's), `shieldmates_blessing_block` 3 → 5: the starting deck's Bold Defense is now what the card prints (each of yours +1/+1 for the turn), so a leader who reads intents guards with creatures and instants, and one who does not is hit harder. The starting deck holds two Bold Defense and two Shieldmate's Blessing, not three and one.
- An enemy that flies is stopped only by block, the leader's guard and the guard of those who fly or reach: twelve enemies fly, the Roil Elemental among them, and the Geyser Glider on a turn a land of yours came into play.
The same temporary auto-player, with these: the first fight costs 1 hp; from the second on a fight in the wilds costs a leader who ignores intents 18 hp on day 2, 24 on day 4, 35 on day 7, and one who guards 7, 11 and 17; a great beast 9 to 26 with guarding; the Roil Elemental is beaten 5 times in 6 from 50 hp with ten picks nobody chose with care, never by ignoring it. A fight runs 4 to 6 turns, the Roil Elemental 9. Nobody has played these yet either.



---- Two kinds of travel, 41 places and what happens on the way, 2026-11-10 ----
The person asked that going from continent to continent feel unlike going about inside one, so that the map could grow and hold many more places. So there are two maps and two rules. Inside a continent the expedition walks on that continent's own enlarged map: `hop_far` 330 makes most walks one day (of the 108 pairs of places on one continent, 76 are a day apart and 32 two). To another continent it crosses on the world map to that continent's port, along a way by sea that goes round the land (`tools/gen-world.mjs` finds one for every two ports; they run from 416 to 2537 units): two days, three beyond `sail_far` 1300 (of the 42 crossings, 18 take two days; from Sea Gate: Sejiri, Akoum, Guul Draz and Murasa two, Bala Ged and Ondu three), never one, with `sail_time` 2.2 against a walk's 1.1 seconds on screen.
- `journey_days` 8 → 12: a crossing costs two or three days where the old trips cost one to three, and there are 41 places where there were 15. Walking nearest-first, an expedition reaches 8 or 9 places on 2 to 4 continents in 12 days (by arithmetic over `data/world.json`, not by play).
- `day_scale` 0.07 → 0.045: enemies on the last day are about as much stronger as they were on the old last day (x1.5), since the tuning of the fights was done against that.
- `rough_stops` 2 → 4: the same share of a larger map.
- `event_chance` 0.25, `sea_event_chance` 0.6, and the `ev_` values: set by eye. A way's cost is meant to be about a third of what a fight in the wilds costs (`ev_hurt_big` 9 against 27), a toll about half a card's price, a day one twelfth of the journey. Nobody has played them.
