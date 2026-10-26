// Included by sim_probe after its public-world helpers.
void directional_damage() {
  for (const float bearing : {0.0f, PI / 2.0f, PI, -PI / 2.0f, PI / 4.0f, -PI / 4.0f, 3.0f * PI / 4.0f, -3.0f * PI / 4.0f}) {
    World world(two_rooms(1, 0), FLAT, 77);
    steps(world, 60);
    enter_north(world);
    for (int i = 0; i < 900 && world.player().health == 100; i++) {
      const engine::Vec3 incoming = world.enemies()[0].position - world.player().position;
      world.look(std::atan2(incoming.x, -incoming.z) - bearing - world.player().yaw, 0.0f);
      world.step();
    }
    expect(world.player().health == 75 && std::abs(std::remainder(world.hurt_direction() - bearing, 2.0f * PI)) < 0.025f,
           "real incoming charger attacks capture front/right/rear/left and all four diagonal bearings");
    const float captured = world.hurt_direction();
    world.look(1.3f, 0.0f);
    steps(world, 5);
    expect(world.hurt_direction() == captured, "turning after an accepted hit preserves its captured incoming direction");
  }
  World caster(two_rooms(0, 1), FLAT, 77);
  steps(caster, 60);
  enter_north(caster);
  for (int i = 0; i < 900 && caster.player().health == 100; i++) {
    if (!caster.projectiles().empty()) {
      const game::Projectile& bolt = caster.projectiles()[0];
      const engine::Vec3 incoming = bolt.position - bolt.velocity - caster.player().position;
      caster.look(std::atan2(incoming.x, -incoming.z) - PI / 2.0f - caster.player().yaw, 0.0f);
    }
    caster.step();
  }
  expect(caster.player().health == 75 && std::abs(caster.hurt_direction() - PI / 2.0f) < 0.05f,
         "a real incoming projectile reports its upstream source side at collision");
}


// Exercise the actual three-offer API; rerolls spend real health and never
// replace offers merely by closing/reopening the modal.
void approach_merchant(World& world) {
  if (world.shop_open() || !world.merchant()) return;
  if (!world.near_merchant()) {
    aim_at(world, world.merchant()->position + engine::Vec3{0.0f, 0.85f, 0.0f});
    world.move(1.0f, 0.0f);
    for (int i = 0; i < 400 && !world.near_merchant(); ++i) world.step();
    world.move(0.0f, 0.0f);
    steps(world, 12);
  }
}
uint32_t offer_slot(World& world, game::CardId card) {
  approach_merchant(world);
  if (!world.shop_open()) world.interact_shop();
  if (!world.shop_open() || (world.owned(card) && !game::CARDS[static_cast<std::size_t>(card)].repeatable)) return world.offer_count();
  for (int attempt = 0; attempt < 64; ++attempt) {
    for (uint32_t slot = 0; slot < world.offer_count(); ++slot) if (world.offers()[slot] == card) return slot;
    world.heal_player(world.max_health());
    if (!world.reroll_shop()) break;
  }
  return world.offer_count();
}
bool purchase_card(World& world, game::CardId card) {
  const uint32_t slot = offer_slot(world, card);
  if (card != game::CardId::spring_water) world.heal_player(world.max_health());
  const bool bought = world.buy_card(slot);
  world.close_shop();
  return bought;
}

void economy_cards() {
  game::Room shop = START;
  shop.kind = game::RoomKind::shop;
  World world({{shop}}, FLAT);
  steps(world, 60);
  expect(world.interact_shop() && world.shop_open() && world.gold() == 0 && !world.buy_card(0) && world.shop_result() == game::ShopResult::insufficient_gold,
         "shop: approach E opens three offers; insufficient funds cannot charge gold");
  const auto original = world.offers();
  expect(world.offer_count() == 3 && original[0] != original[1] && original[0] != original[2] && original[1] != original[2], "shop: three random offers are distinct");
  world.close_shop(); world.interact_shop();
  expect(world.offers() == original, "shop: closing and reopening cannot obtain a free reroll");
  const auto position = world.player().position;
  const float yaw = world.player().yaw, pitch = world.player().pitch;
  const uint64_t tick = world.tick();
  world.move(1, 1); world.look(1, 1); world.jump();
  expect(!world.act(Action::fire) && !world.act(Action::dash) && !world.act(Action::reload), "shop modal: firing, dash and reload are refused at the public boundary");
  steps(world, 40);
  expect(world.tick() == tick + 40 && world.player().position.x == position.x && world.player().position.y == position.y && world.player().position.z == position.z &&
         world.player().yaw == yaw && world.player().pitch == pitch && !world.jumped_tick(), "shop modal: movement, look and jump freeze while actual animation ticks continue");
  expect(world.reroll_shop() && world.player().health == 75 && world.gold() == 0, "reroll: exactly twenty-five health is paid, no gold");
  bool changed = false;
  for (uint32_t i = 0; i < world.offer_count(); ++i) changed = changed || std::find(original.begin(), original.end(), world.offers()[i]) == original.end();
  expect(changed, "reroll: at least one different card is offered when four or more cards are eligible");
  world.reroll_shop(); world.reroll_shop();
  const auto at_limit = world.offers();
  expect(world.player().health == 25 && !world.reroll_shop() && world.player().health == 25 && world.offers() == at_limit && world.shop_result() == game::ShopResult::insufficient_health,
         "reroll: HP twenty-five refuses the purchase without killing the player or changing offers");
  world.heal_player(1);
  expect(world.reroll_shop() && world.player().health == 1 && world.outcome() == World::Outcome::playing,
         "reroll: HP twenty-six may pay twenty-five and leaves a living player at one health");
  world.heal_player(100);
  world.award_gold(1000, {});
  expect(purchase_card(world, game::CardId::kor_updraft) && world.gold() == 945 && world.owned(game::CardId::kor_updraft), "card: double jump costs exactly fifty-five gold");
  expect(!purchase_card(world, game::CardId::kor_updraft) && world.gold() == 945, "shop: an owned permanent card is absent and cannot charge twice");
  world.interact_shop();
  expect(!world.buy_card(99) && world.gold() == 945, "shop: invalid slot cannot charge gold");
  world.close_shop();
  world.jump(); world.step(); steps(world, 8); world.jump(); world.step();
  expect(!world.grounded() && near(world.velocity().y, 7.6f) && world.jumped_tick() == world.tick(), "card: second airborne jump renews upward velocity");
  world.jump(); world.step();
  expect(near(world.velocity().y, 7.2f), "card: a third airborne jump is refused");
  steps(world, 80); world.jump(); world.step(); steps(world, 4); world.jump(); world.step();
  expect(near(world.velocity().y, 7.6f), "card: landing replenishes the airborne jump");
  steps(world, 80); next_slot(world);
  expect(world.act(Action::dash), "card: base dash starts on a rhythm slot");
  next_slot(world);
  expect(!world.act(Action::dash), "card: base dash cannot repeat on the next half beat");
  const uint32_t roil = offer_slot(world, game::CardId::roil_step);
  world.heal_player(world.max_health());
  game::Controls controls;
  controls.set_captured(world, false);
  controls.key(world, "Digit3", true); controls.key(world, "ArrowRight", true);
  expect(world.selected_card() == 0, "modal controls: digit three and right arrow select and wrap three offer slots without capture");
  world.select_card(roil);
  controls.key(world, "KeyE", true);
  expect(world.owned(game::CardId::roil_step) && world.gold() == 900 && world.shop_result() == game::ShopResult::purchased, "modal controls: E purchases selected actual offer");
  controls.key(world, "Escape", true);
  expect(!world.shop_open() && world.dash_cooldown_slots() == 1, "modal controls: Escape closes; purchased half-beat dash stays active");
  world.award_gold(200, {});
  uint32_t spent = 0;
  for (const game::Card& card : game::CARDS) {
    if (card.repeatable || world.owned(card.id)) continue;
    const uint32_t before = world.gold();
    expect(purchase_card(world, card.id) && world.owned(card.id) && world.gold() == before - card.price, "card: every augment is sold through a real offer at its listed price");
    spent += card.price;
  }
  expect(spent == 995 && world.gold() == 105, "augments: the ten new seals cost nine hundred ninety-five gold in total");
  const uint32_t water = offer_slot(world, game::CardId::spring_water);
  world.heal_player(world.max_health());
  const auto last_offers = world.offers();
  expect(world.offer_count() == 1 && water == 0 && !world.reroll_shop() && world.shop_result() == game::ShopResult::no_new_offers && world.player().health == 100 && world.offers() == last_offers,
         "shop: all permanent cards owned leaves one healing offer; no alternative means no health charge");
  expect(!world.buy_card(water) && world.gold() == 105 && world.shop_result() == game::ShopResult::full_health, "shop: healing refuses a full-health player without charging");
  world.close_shop();
  next_slot(world); world.act(Action::fire); next_slot(world); world.act(Action::reload); next_slot(world); world.act(Action::reload);
  expect(world.pistol().ammo == 8 && world.pistol().reload_stage == 0, "card: public two-step reload restores all eight rounds");
  World outside({{START}}, FLAT);
  outside.award_gold(100, {});
  expect(!outside.buy_card(0) && outside.gold() == 100 && !outside.owned(game::CardId::kor_updraft), "shop: purchases outside an open merchant modal are refused");
  World fresh({{START}}, FLAT);
  expect(fresh.gold() == 0 && fresh.owned_cards() == 0 && fresh.magazine_capacity() == 8, "new run: economy and upgrades reset");
  World a({{shop}}, FLAT, 71), b({{shop}}, FLAT, 71);
  steps(a, 60); steps(b, 60); a.interact_shop(); b.interact_shop();
  bool deterministic = a.offers() == b.offers();
  for (int i = 0; i < 24; ++i) {
    a.heal_player(100); b.heal_player(100); a.reroll_shop(); b.reroll_shop();
    deterministic = deterministic && a.offers() == b.offers() && a.player().health == b.player().health;
  }
  expect(deterministic, "shop: same seed and public rerolls produce the same offer and health trace");

  game::Room entry = START; entry.doors = N;
  const Floor route{{entry,
      {.x = 0, .z = -1, .doors = N | S, .shape = 1, .turn = 0, .depth = 1, .chargers = 0, .casters = 2},
      {.x = 0, .z = -2, .doors = N | S, .shape = 1, .turn = 0, .depth = 2, .chargers = 0, .casters = 0, .kind = game::RoomKind::shop},
      {.x = 0, .z = -3, .doors = S, .shape = 1, .turn = 0, .depth = 3, .chargers = 0, .casters = 0, .kind = game::RoomKind::boss}}};
  World adventurer(route, FLAT, 77);
  steps(adventurer, 60); enter_north(adventurer);
  for (int shots = 0; shots < 6 && !adventurer.enemies().empty(); ++shots) {
    next_slot(adventurer); aim_at(adventurer, middle(adventurer.enemies()[0])); adventurer.act(Action::fire);
  }
  expect(adventurer.room() == 1 && !adventurer.locked() && adventurer.gold() == 55 && adventurer.outcome() == World::Outcome::playing, "economy: two caster kills and depth-one clear grant fifty-five gold");
  adventurer.look(-adventurer.player().yaw, -adventurer.player().pitch); walk_through(adventurer);
  expect(adventurer.room() == 2 && !adventurer.near_merchant() && !adventurer.interact_shop(), "merchant: entering the room from a portal is too far away to shop");
  expect(purchase_card(adventurer, game::CardId::kor_updraft) && adventurer.gold() == 0, "economy: approach actual merchant and buy double jump with earned gold");
  adventurer.look(PI - adventurer.player().yaw, -adventurer.player().pitch); walk_through(adventurer);
  expect(adventurer.room() == 1 && adventurer.enemies().empty() && adventurer.gold() == 0, "economy: revisiting a cleared room cannot farm rewards");
  const auto before_return = adventurer.room();
  adventurer.look(-adventurer.player().yaw, -adventurer.player().pitch); walk_through(adventurer);
  expect(before_return == 1 && adventurer.room() == 2 && adventurer.merchant() && adventurer.merchant()->phase == game::MerchantPhase::seated,
         "merchant: neutral vendor remains seated on room reentry");

  game::Room outfitter = shop; outfitter.doors = N;
  World fighter(Floor{{outfitter, {.x = 0, .z = -1, .doors = S, .shape = 1, .turn = 0, .depth = 1, .chargers = 1, .casters = 0}}}, FLAT, 77);
  fighter.award_gold(120, {});
  expect(purchase_card(fighter, game::CardId::blood_takeaway) && fighter.gold() == 0, "blood takeaway is bought through a real offer for one hundred twenty gold");
  steps(fighter, 60); fighter.look(-fighter.player().yaw, -fighter.player().pitch); enter_north(fighter);
  for (int i = 0; i < 900 && fighter.player().health == 100; ++i) fighter.step();
  expect(fighter.player().health == 75 && fighter.hurt_tick(), "a real charger attack removes twenty-five health");
  for (int shot = 0; shot < 6 && !fighter.enemies().empty() && fighter.outcome() == World::Outcome::playing; ++shot) {
    next_slot(fighter); aim_at(fighter, middle(fighter.enemies()[0])); fighter.act(Action::fire);
  }
  expect(fighter.enemies().empty() && fighter.player().health == 83 && fighter.blood_drops() == 0, "blood takeaway: a real kill while hurt restores eight health and stores nothing");
  const std::vector<engine::Aabb> platform{{{-3.0f, -1.0f, -4.0f}, {3.0f, 0.0f, 4.0f}}};
  game::RoomKit gap{.rooms = {platform, platform, platform, platform, platform, platform}, .nav = {}, .sealed = {}, .gate = {}};
  World falling({{shop}}, gap); steps(falling, 60); falling.move(0.0f, 1.0f);
  for (int i = 0; i < 140 && falling.player().position.y > -2.0f; ++i) falling.step();
  falling.move(0.0f, 0.0f); steps(falling, 160);
  expect(falling.grounded() && falling.player().health == 75 && falling.player().position.x < 2.71f && falling.player().position.y > 1.59f, "chasm: actual gravity deals one hit and recovers to supported footing");
  expect(near(falling.hurt_direction(), PI), "fall damage reports neutral bottom direction");
  falling.award_gold(100, {});
  expect(purchase_card(falling, game::CardId::spring_water) && falling.player().health == 100 && falling.gold() == 75, "shop: repeatable healing restores health and costs twenty-five gold");
}

void merchant_fall() {
  game::Room shop = START; shop.kind = game::RoomKind::shop; shop.doors = N;
  const Floor rooms{{shop, {.x = 0, .z = -1, .doors = S, .shape = 1, .turn = 0, .depth = 1, .chargers = 0, .casters = 0}}};
  World world(rooms, FLAT, 131);
  steps(world, 60);
  expect(world.merchant() && world.merchant()->health == 150 && world.merchant()->phase == game::MerchantPhase::seated && world.enemies().empty() && !world.locked(), "merchant: neutral seated woman is not a combat enemy and doors start open");
  world.look(PI, 0); world.move(1, 0); steps(world, 65); world.move(0, 0); steps(world, 12);
  const uint64_t events = world.event_count();
  for (int shot = 0; shot < 3; ++shot) {
    next_slot(world); aim_at(world, world.merchant()->position + engine::Vec3{0, 0.85f, 0});
    expect(world.act(Action::fire), "merchant: a real aimed shot hits the neutral vendor");
  }
  const uint64_t fallen = world.tick();
  expect(world.merchant()->phase == game::MerchantPhase::fallen && world.merchant()->health == 0 && world.merchant()->phase_tick == fallen && !world.locked() && !world.shop_open() && world.enemies().empty() && world.outcome() == World::Outcome::playing,
         "merchant: three fifty-damage shots kill and close the shop without locking doors, spawning an enemy or winning");
  uint32_t falls = 0;
  bool locked = false;
  for (uint64_t at = events; at < world.event_count(); ++at) if (const auto event = world.event(at)) { falls += event->kind == WorldEvent::Kind::merchant_fallen; locked = locked || event->kind == WorldEvent::Kind::locked; }
  expect(falls == 1 && !locked, "merchant: the lethal shot emits exactly one fallen event and no lock event");
  expect(!world.interact_shop() && !world.shop_open(), "merchant: a fallen vendor offers no shop interaction");
  steps(world, 400);
  expect(world.merchant()->phase == game::MerchantPhase::fallen && world.merchant()->phase_tick == fallen && world.enemies().empty() && !world.locked() && world.gold() == 0 && world.outcome() == World::Outcome::playing,
         "merchant corpse: stays fallen; nothing rises, attacks or pays out afterwards");
  world.look(-world.player().yaw, -world.player().pitch); walk_through(world);
  expect(world.room() == 1, "fallen shop: the open exit is physically traversable");
  world.look(PI - world.player().yaw, -world.player().pitch); walk_through(world);
  expect(world.room() == 0 && world.merchant() && world.merchant()->phase == game::MerchantPhase::fallen && world.enemies().empty() && !world.interact_shop() && world.gold() == 0,
         "fallen shop: reentry cannot respawn the vendor or reopen trade");
}

void merchant_stage(const game::RoomKit& kit) {
  bool supported = true;
  for (uint8_t shape = 0; shape < game::SHAPE_COUNT; ++shape)
    for (uint8_t turn = 0; turn < 4; ++turn) {
      const game::Room shop{.x = 0, .z = 0, .doors = 0, .shape = shape, .turn = turn, .depth = 0, .chargers = 0, .casters = 0, .kind = game::RoomKind::shop};
      World world(Floor{{shop}}, kit, 7);
      const game::Merchant* merchant = world.merchant();
      if (shape == game::SHOP_SHAPE) {
        // The authored chair is at the viewer's origin; its collision envelope
        // intentionally contains part of the seated body, unlike a standing NPC.
        supported = supported && merchant && near(merchant->position.x, 0) && near(merchant->position.z, 0) &&
                    near(merchant->position.y, .02f) && near(merchant->yaw, turn * PI / 2);
        continue;
      }
      supported = supported && merchant && !world.stage().overlaps(game::merchant_box(*merchant)) && std::hypot(merchant->position.x, merchant->position.z) <= 3.01f;
      if (!merchant) continue;
      const auto floor = world.stage().raycast({merchant->position + engine::Vec3{0, 0.05f, 0}, {0, -1, 0}}, 0.1f);
      supported = supported && floor;
    }
  expect(supported, "merchant: real authored kit, all shapes and turns support the seated vendor on real floor without clipping");
  for (uint8_t turn = 0; turn < 4; ++turn) {
    const auto entrance = static_cast<game::Direction>(turn);
    const auto approach = game::opposite(entrance);
    Room start = START;
    start.doors = static_cast<uint8_t>(1u << approach);
    const Room shop{.x=static_cast<int8_t>(game::DIRECTION_X[approach]), .z=static_cast<int8_t>(game::DIRECTION_Z[approach]),
                    .doors=static_cast<uint8_t>(1u << entrance), .shape=game::SHOP_SHAPE, .turn=turn, .depth=1,
                    .chargers=0, .casters=0, .kind=game::RoomKind::shop};
    World world(Floor{{start, shop}}, kit, 7);
    steps(world, 60);
    world.look(static_cast<float>(approach) * PI / 2, 0);
    walk_through(world);
    expect(world.room() == 1 && world.merchant(), "archive: each rotated entry is reachable through the real portal");
    world.move(1, 0);
    steps(world, 300);
    world.move(0, 0);
    steps(world, 30);
    const auto feet = shop.to_shape(world.player().position - engine::Vec3{0, game::EYE_HEIGHT, 0});
    expect(feet.z < -2.5f && feet.z > -2.8f && world.near_merchant() && world.interact_shop(),
           "archive: counter collision stops walking and permits real trade across its front");
    world.close_shop();
    world.look(PI, 0);
    walk_through(world);
    expect(world.room() == 0, "archive: the real single door returns to the connected floor");
  }
}

// 증강마다 공개 API 로만 — 상점에서 산 인장이 실제 전투에서 정해 둔 수치대로 움직이는가 (기대값은 cards.hpp 의 augment 수치에서 손으로 셈한 것)
World armed(std::initializer_list<game::CardId> cards, uint8_t chargers, uint8_t casters, uint32_t seed = 77) {
  game::Room outfitter = START;
  outfitter.kind = game::RoomKind::shop;
  outfitter.doors = N;
  World world(Floor{{outfitter, {.x = 0, .z = -1, .doors = S, .shape = 1, .turn = 0, .depth = 1, .chargers = chargers, .casters = casters}}}, FLAT, seed);
  world.award_gold(1000, {});
  for (const game::CardId card : cards) expect(purchase_card(world, card), "augment fixture buys its seal through a real offer");
  steps(world, 60);
  world.look(-world.player().yaw, -world.player().pitch);
  enter_north(world);
  return world;
}
uint32_t spells_cast(const World& world, uint64_t from, game::Spell::Kind kind) {
  uint32_t count = 0;
  for (uint64_t at = from; at < world.event_count(); at++)
    if (const auto event = world.event(at); event && event->kind == WorldEvent::Kind::spell && event->melody == static_cast<uint8_t>(kind)) count++;
  return count;
}
const Enemy* enemy_by(const World& world, uint32_t id) {
  for (const Enemy& enemy : world.enemies()) if (enemy.visual_id == id) return &enemy;
  return nullptr;
}
/** 다음 칸의 머리에서 그 적을 겨눠 쏜다 — 탄이 없으면 먼저 재장전한다 */
bool shoot(World& world, uint32_t id) {
  if (!world.pistol().ammo) { next_slot(world); world.act(Action::reload); next_slot(world); world.act(Action::reload); }
  next_slot(world);
  const Enemy* enemy = enemy_by(world, id);
  if (!enemy) return false;
  aim_at(world, middle(*enemy));
  return world.act(Action::fire);
}
/** 다음 칸의 머리에서 천장 쪽으로 쏜다 — 아무 적도 맞지 않는다 */
void shoot_air(World& world) {
  if (!world.pistol().ammo) { next_slot(world); world.act(Action::reload); next_slot(world); world.act(Action::reload); }
  next_slot(world);
  world.look(0.0f, 1.45f - world.player().pitch);
  world.act(Action::fire);
}

void augments() {
  expect(game::stage_health(200, 1) == 200 && game::stage_health(200, 2) == 270 && game::stage_health(3200, 3) == 5440,
         "campaign stages: enemies gain thirty-five percent health per later stage");
  {
    World world = armed({game::CardId::reserved_miss}, 1, 0);
    const uint32_t target = world.enemies()[0].visual_id;
    for (int miss = 0; miss < 7; miss++) shoot_air(world);
    expect(world.reserved_shots() == game::augment::RESERVED_LIMIT, "reserved miss: seven misses keep at most six reserved shots");
    const uint64_t from = world.event_count();
    expect(shoot(world, target) && world.reserved_shots() == 0 && spells_cast(world, from, game::Spell::Kind::reserved_bolt) == 6,
           "reserved miss: the next real hit releases all six reserved shots");
    steps(world, 120);
    expect(!enemy_by(world, target) && world.enemies().empty(), "reserved miss: fifty plus six times forty-five fells the two-hundred-health charger");
  }
  {
    World world = armed({game::CardId::bullet_friends}, 2, 0);
    const uint32_t host = world.enemies()[0].visual_id, other = world.enemies()[1].visual_id;
    for (int hit = 0; hit < 3; hit++) shoot(world, host);
    expect(world.seals() == 1 && enemy_by(world, host) && enemy_by(world, host)->sealed && enemy_by(world, host)->health == 50,
           "bullet friends: three real hits attach one emitter to the surviving charger");
    const int32_t before = enemy_by(world, other)->health;
    const uint64_t from = world.event_count();
    shoot_air(world);
    steps(world, 120);
    expect(spells_cast(world, from, game::Spell::Kind::seal_bolt) == 1 && enemy_by(world, other) && enemy_by(world, other)->health == before - game::augment::SEAL_DAMAGE,
           "bullet friends: even a missed shot makes the emitter fire once at the other enemy");
  }
  {
    World world = armed({game::CardId::casing_crabs}, 1, 0);
    const uint32_t target = world.enemies()[0].visual_id;
    shoot_air(world);
    next_slot(world); world.act(Action::reload);
    const uint64_t from = world.event_count();
    next_slot(world); world.act(Action::reload);
    expect(spells_cast(world, from, game::Spell::Kind::crab) == game::augment::CRAB_COUNT, "casing crabs: inserting the magazine releases three crab echoes");
    steps(world, 150);
    expect(enemy_by(world, target) && enemy_by(world, target)->health == 200 - 3 * game::augment::CRAB_BITE, "casing crabs: three bites of forty land on the only charger");
  }
  {
    World world = armed({game::CardId::self_funeral}, 0, 2);
    const uint32_t first = world.enemies()[0].visual_id, second = world.enemies()[1].visual_id;
    shoot(world, second);
    const uint64_t from = world.event_count();
    for (int hit = 0; hit < 3 && enemy_by(world, first); hit++) shoot(world, first);
    steps(world, 90);
    expect(spells_cast(world, from, game::Spell::Kind::memory) == 1 && world.enemies().empty() && world.cleared(1),
           "self funeral: the fallen caster's memory deals one hundred ten and finishes the wounded ally, clearing the room");
  }
  {
    World world = armed({game::CardId::illegal_extension}, 1, 0);
    const uint32_t target = world.enemies()[0].visual_id;
    next_slot(world);
    expect(world.act(Action::dash) && world.outposts().size() == 1, "illegal extension: an on-beat dash raises one outpost echo");
    const uint64_t from = world.event_count();
    shoot(world, target);
    steps(world, 120);
    expect(spells_cast(world, from, game::Spell::Kind::outpost_bolt) == 1 && enemy_by(world, target) && enemy_by(world, target)->health == 200 - 50 - game::augment::OUTPOST_DAMAGE,
           "illegal extension: the outpost copies the real shot for forty more damage");
    steps(world, static_cast<int>(game::augment::OUTPOST_TICKS));
    expect(world.outposts().empty(), "illegal extension: the outpost fades after four seconds");
  }
  {
    World world = armed({game::CardId::return_to_sender}, 0, 1);
    const uint32_t target = world.enemies()[0].visual_id;
    for (int i = 0; i < 1200 && world.held_bolts() == 0 && world.outcome() == World::Outcome::playing; i++) world.step();
    expect(world.held_bolts() == 1 && world.player().health == 100, "return to sender: the hedron catches a real caster glob before it hurts");
    const uint64_t from = world.event_count();
    shoot(world, target);
    steps(world, 120);
    expect(world.held_bolts() == 0 && spells_cast(world, from, game::Spell::Kind::returned_bolt) == game::augment::RETURN_SPLIT && world.enemies().empty(),
           "return to sender: an on-beat shot returns the glob three times and with the shot fells the caster");
  }
  {
    World world = armed({game::CardId::blood_takeaway}, 2, 0);
    const uint32_t first = world.enemies()[0].visual_id;
    for (int hit = 0; hit < 4 && enemy_by(world, first); hit++) {
      world.heal_player(100);
      shoot(world, first);
    }
    expect(!enemy_by(world, first) && world.blood_drops() == 1, "blood takeaway: a kill at full health stores one blood drop");
    world.heal_player(100);
    const uint64_t from = world.event_count();
    for (int i = 0; i < 900 && world.blood_drops() == 1; i++) world.step();
    expect(world.blood_drops() == 0 && world.player().health == 100 && spells_cast(world, from, game::Spell::Kind::blood) == 1,
           "blood takeaway: the stored drop absorbs the next real attack and flies back at an enemy");
  }
  {
    World world = armed({game::CardId::landing_service}, 1, 0);
    const uint32_t target = world.enemies()[0].visual_id;
    for (int i = 0; i < 600 && enemy_by(world, target) && flat_distance(enemy_by(world, target)->position, world.player().position) > 7.0f; i++) world.step();
    world.jump();
    for (int i = 0; i < 80 && !(world.jumped_tick() && world.landed_tick() && *world.landed_tick() > *world.jumped_tick()); i++) world.step();
    const Enemy* stomped = enemy_by(world, target);
    expect(stomped && stomped->health == 200 - game::augment::STOMP_DAMAGE && stomped->stunned_until > world.tick(),
           "landing service: landing after a jump stomps the near charger for eighty and stuns it");
  }
  {
    World world = armed({game::CardId::fold_roil}, 2, 0);
    const uint32_t host = world.enemies()[0].visual_id, other = world.enemies()[1].visual_id;
    for (int i = 0; i < 600 && flat_distance(enemy_by(world, host)->position, enemy_by(world, other)->position) > 5.0f; i++) world.step();
    shoot(world, host);
    shoot(world, host);
    expect(enemy_by(world, host)->bound_until > world.tick() && enemy_by(world, other)->bound_until > world.tick(), "fold roil: two on-beat hits bind the charger and its neighbour");
    const int32_t before = enemy_by(world, other)->health;
    shoot(world, host);
    expect(enemy_by(world, other) && enemy_by(world, other)->health == before - 50, "fold roil: hitting one bound enemy deals the same fifty to the other");
  }
  {
    World world = armed({game::CardId::biting_change}, 0, 2);
    const uint32_t first = world.enemies()[0].visual_id, second = world.enemies()[1].visual_id;
    const uint64_t from = world.event_count();
    for (int hit = 0; hit < 3 && enemy_by(world, first); hit++) shoot(world, first);
    steps(world, 120);
    expect(spells_cast(world, from, game::Spell::Kind::coin) == game::augment::COIN_COUNT && enemy_by(world, second) &&
           enemy_by(world, second)->health == 150 - static_cast<int32_t>(game::augment::COIN_COUNT) * game::augment::COIN_DAMAGE,
           "biting change: the kill's gold sends two coin echoes into the other caster");
  }
}
