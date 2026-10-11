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
  expect(purchase_card(world, game::CardId::stonefang) && world.weapon_damage() == 75 && world.gold() == 825, "card: stonefang deals seventy-five damage and costs seventy-five gold");
  expect(purchase_card(world, game::CardId::echo_quiver) && world.magazine_capacity() == 12 && world.pistol().ammo == 12 && world.gold() == 785, "card: quiver fills twelve rounds");
  expect(purchase_card(world, game::CardId::life_bloom) && world.max_health() == 125 && world.player().health == 125 && world.gold() == 735, "card: life bloom raises and heals max health to one hundred twenty-five");
  expect(purchase_card(world, game::CardId::vampiric_rite) && world.gold() == 650, "card: vampiric rite costs eighty-five gold");
  expect(purchase_card(world, game::CardId::hedron_ward) && world.incoming_damage() == 15 && world.gold() == 585, "card: ward reduces real incoming damage to fifteen");
  const uint32_t water = offer_slot(world, game::CardId::spring_water);
  world.heal_player(world.max_health());
  const auto last_offers = world.offers();
  expect(world.offer_count() == 1 && water == 0 && !world.reroll_shop() && world.shop_result() == game::ShopResult::no_new_offers && world.player().health == 125 && world.offers() == last_offers,
         "shop: all permanent cards owned leaves one healing offer; no alternative means no health charge");
  expect(!world.buy_card(water) && world.gold() == 585 && world.shop_result() == game::ShopResult::full_health, "shop: healing refuses a full-health player without charging");
  world.close_shop();
  next_slot(world); world.act(Action::fire); next_slot(world); world.act(Action::reload); next_slot(world); world.act(Action::reload);
  expect(world.pistol().ammo == 12 && world.pistol().reload_stage == 0, "card: public two-step reload restores all twelve rounds");
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
  World armored({{shop}}, FLAT, 77);
  steps(armored, 60); armored.award_gold(65, {});
  expect(purchase_card(armored, game::CardId::hedron_ward), "reroll armor fixture purchases its ward through an actual offer");
  armored.interact_shop(); armored.heal_player(100);
  expect(armored.reroll_shop() && armored.player().health == 75 && armored.incoming_damage() == 15,
         "reroll: armor cannot reduce the explicit twenty-five health price to combat damage");

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
  fighter.award_gold(225, {});
  expect(purchase_card(fighter, game::CardId::stonefang) && purchase_card(fighter, game::CardId::vampiric_rite) && purchase_card(fighter, game::CardId::hedron_ward) && fighter.gold() == 0, "combat cards bought through real offers cost exactly two hundred twenty-five");
  steps(fighter, 60); fighter.look(-fighter.player().yaw, -fighter.player().pitch); enter_north(fighter);
  for (int i = 0; i < 900 && fighter.player().health == 100; ++i) fighter.step();
  expect(fighter.player().health == 85 && fighter.hurt_tick(), "ward: real charger attack removes fifteen health");
  if (!fighter.enemies().empty() && fighter.outcome() == World::Outcome::playing) {
    next_slot(fighter); aim_at(fighter, middle(fighter.enemies()[0]));
    expect(fighter.act(Action::fire) && fighter.enemies().size() == 1 && fighter.enemies()[0].health == 25, "stonefang: one public shot leaves charger at twenty-five health");
    next_slot(fighter); if (!fighter.enemies().empty()) aim_at(fighter, middle(fighter.enemies()[0]));
    expect(fighter.act(Action::fire) && fighter.enemies().empty() && fighter.player().health == 90, "vampiric rite: real kill restores five health");
  } else expect(false, "combat card regression reaches a living enemy and player");
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

void merchant_revenge() {
  game::Room shop = START; shop.kind = game::RoomKind::shop; shop.doors = N;
  const Floor rooms{{shop, {.x = 0, .z = -1, .doors = S, .shape = 1, .turn = 0, .depth = 1, .chargers = 0, .casters = 0}}};
  World world(rooms, FLAT, 131);
  steps(world, 60);
  expect(world.merchant() && world.merchant()->health == 150 && world.merchant()->phase == game::MerchantPhase::seated && world.enemies().empty() && !world.locked(), "merchant: neutral seated woman is not a combat enemy and doors start open");
  world.look(PI, 0); world.move(1, 0); steps(world, 65); world.move(0, 0); steps(world, 12);
  for (int shot = 0; shot < 3; ++shot) {
    next_slot(world); aim_at(world, world.merchant()->position + engine::Vec3{0, 0.85f, 0});
    expect(world.act(Action::fire), "merchant: a real aimed shot hits the neutral vendor");
  }
  const uint64_t fallen = world.tick();
  expect(world.merchant()->phase == game::MerchantPhase::fallen && world.merchant()->health == 0 && world.locked() && !world.shop_open() && world.enemies().empty() && world.outcome() == World::Outcome::playing,
         "merchant: three fifty-damage shots kill, close shop and lock doors without winning");
  steps(world, 119);
  expect(world.merchant()->phase == game::MerchantPhase::fallen, "merchant corpse: remains fallen for the full one hundred twenty ticks");
  world.step();
  expect(world.merchant()->phase == game::MerchantPhase::rising && world.merchant()->phase_tick == fallen + 120 && world.enemies().empty(), "merchant: actual completion tick begins sixty-tick resurrection");
  steps(world, 59);
  expect(world.merchant()->phase == game::MerchantPhase::rising, "merchant: resurrection cannot attack before sixty ticks complete");
  world.step();
  expect(world.merchant()->phase == game::MerchantPhase::hunting && world.enemies().size() == 1 && world.enemies()[0].kind == EnemyKind::witch && world.enemies()[0].health == 3500 && world.locked() && !world.interact_shop(),
         "witch: one nightmare witch awakens at tick one hundred eighty with thirty-five hundred health and no vendor interaction");
  next_slot(world); aim_at(world, middle(world.enemies()[0])); world.act(Action::fire);
  const int32_t hurt_witch = world.enemies()[0].health;
  bool volley = false, drain = false, healed = false, telegraphed = true;
  std::optional<uint64_t> windup;
  for (int i = 0; i < 700; ++i) {
    world.heal_player(100);
    const uint64_t cursor = world.event_count();
    world.step();
    for (uint64_t at = cursor; at < world.event_count(); ++at) {
      const auto event = world.event(at);
      if (!event || event->enemy != EnemyKind::witch) continue;
      if (event->kind == WorldEvent::Kind::windup) windup = event->tick;
      if (event->kind == WorldEvent::Kind::bolt || event->kind == WorldEvent::Kind::life_drain) {
        telegraphed = telegraphed && windup && event->tick >= *windup + 80;
        volley = volley || event->kind == WorldEvent::Kind::bolt;
        drain = drain || event->kind == WorldEvent::Kind::life_drain;
      }
    }
    healed = healed || world.enemies()[0].health > hurt_witch;
  }
  expect(volley && drain && telegraphed && healed, "witch: distinct void volleys and life drain have eighty-tick telegraphs; a real drain restores damaged witch health");
  World evasive(rooms, FLAT, 131);
  steps(evasive, 60); evasive.look(PI, 0); evasive.move(1, 0); steps(evasive, 65); evasive.move(0, 0); steps(evasive, 12);
  for (int shot = 0; shot < 3; ++shot) {
    next_slot(evasive); aim_at(evasive, evasive.merchant()->position + engine::Vec3{0, 0.85f, 0}); evasive.act(Action::fire);
  }
  steps(evasive, 180);
  for (int i = 0; i < 700 && !(evasive.enemies()[0].act == Enemy::Act::windup && evasive.enemies()[0].attack_cycle == 1); ++i) { evasive.heal_player(100); evasive.step(); }
  const bool drain_warning = evasive.enemies()[0].act == Enemy::Act::windup && evasive.enemies()[0].attack_cycle == 1;
  evasive.heal_player(100); evasive.look(-evasive.player().yaw, -evasive.player().pitch); evasive.move(0, 1); steps(evasive, 80); evasive.move(0, 0);
  const int32_t escaped_health = evasive.player().health;
  const bool beam = std::any_of(evasive.hazards().begin(), evasive.hazards().end(), [](const auto& hazard) { return hazard.kind == game::GroundHazard::Kind::void_beam; });
  steps(evasive, 20);
  expect(drain_warning && beam && evasive.player().health == escaped_health && evasive.outcome() == World::Outcome::playing,
         "witch fairness: public lateral movement during the eighty-tick locked telegraph actually dodges the released life-drain beam");
  const uint64_t events = world.event_count();
  for (int i = 0; i < 400 && !world.enemies().empty() && world.outcome() == World::Outcome::playing; ++i) {
    world.heal_player(100); next_slot(world);
    if (!world.pistol().ammo || world.pistol().reload_stage) world.act(Action::reload);
    else { aim_at(world, middle(world.enemies()[0])); world.act(Action::fire); }
  }
  expect(world.enemies().empty() && world.merchant()->phase == game::MerchantPhase::defeated && !world.locked() && world.gold() == 100 && world.outcome() == World::Outcome::playing,
         "witch: public shots defeat her, unlock ruined shop and award once without normal dragon finisher or floor victory");
  bool finisher = false, cleared = false;
  for (uint64_t at = events; at < world.event_count(); ++at) if (const auto event = world.event(at)) { finisher = finisher || event->kind == WorldEvent::Kind::finisher; cleared = cleared || event->kind == WorldEvent::Kind::cleared; }
  expect(!finisher && !cleared, "witch: victory emits neither normal dragon finishing nor floor-clear events");
  world.look(-world.player().yaw, -world.player().pitch); walk_through(world);
  expect(world.room() == 1, "ruined shop: unlocked exit is physically traversable");
  world.look(PI - world.player().yaw, -world.player().pitch); walk_through(world);
  expect(world.room() == 0 && world.merchant()->phase == game::MerchantPhase::defeated && world.enemies().empty() && !world.interact_shop() && world.gold() == 100,
         "ruined shop: reentry cannot respawn the vendor, nightmare or reward");
}

void merchant_stage(const game::RoomKit& kit) {
  bool supported = true;
  for (uint8_t shape = 0; shape < game::SHAPE_COUNT; ++shape)
    for (uint8_t turn = 0; turn < 4; ++turn) {
      const game::Room shop{.x = 0, .z = 0, .doors = 0, .shape = shape, .turn = turn, .depth = 0, .chargers = 0, .casters = 0, .kind = game::RoomKind::shop};
      World world(Floor{{shop}}, kit, 7);
      const game::Merchant* merchant = world.merchant();
      supported = supported && merchant && !world.stage().overlaps(game::merchant_box(*merchant)) && std::hypot(merchant->position.x, merchant->position.z) <= 3.01f;
      if (!merchant) continue;
      const auto floor = world.stage().raycast({merchant->position + engine::Vec3{0, 0.05f, 0}, {0, -1, 0}}, 0.1f);
      const game::Enemy witch{.kind = EnemyKind::witch, .position = merchant->position, .health = 3500};
      supported = supported && floor && !world.stage().overlaps(game::enemy_box(witch));
    }
  expect(supported, "merchant: real authored kit, all six shapes and turns support both seated vendor and standing witch without clipping");
}
