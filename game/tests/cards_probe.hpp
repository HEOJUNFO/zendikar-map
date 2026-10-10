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

void economy_cards() {
  game::Room shop = START;
  shop.kind = game::RoomKind::shop;
  World world({{shop}}, FLAT);
  steps(world, 60);
  expect(world.in_shop() && world.gold() == 0 && !world.buy_card(0) && world.shop_result() == game::ShopResult::insufficient_gold,
         "shop: insufficient funds cannot buy or change gold");
  world.award_gold(1000, {});
  expect(world.buy_card(0) && world.gold() == 945 && world.owned(game::CardId::kor_updraft), "shop: double jump costs exactly 55 gold");
  expect(!world.buy_card(0) && world.gold() == 945 && world.shop_result() == game::ShopResult::already_owned, "shop: a permanent card cannot charge twice");
  expect(!world.buy_card(99) && world.gold() == 945, "shop: invalid offer index cannot charge gold");
  world.jump();
  world.step();
  steps(world, 8);
  world.jump();
  world.step();
  expect(!world.grounded() && near(world.velocity().y, 7.6f) && world.jumped_tick() == world.tick(), "card: second airborne jump renews upward velocity");
  world.jump();
  world.step();
  expect(near(world.velocity().y, 7.2f), "card: a third airborne jump is refused");
  steps(world, 80);
  world.jump();
  world.step();
  steps(world, 4);
  world.jump();
  world.step();
  expect(near(world.velocity().y, 7.6f), "card: landing replenishes the one airborne jump");
  steps(world, 80);
  next_slot(world);
  expect(world.act(Action::dash), "card: base dash starts on a rhythm slot");
  next_slot(world);
  expect(!world.act(Action::dash), "card: base dash cannot repeat on the next half beat");
  game::Controls controls;
  controls.set_captured(world, true);
  controls.key(world, "Digit2", true);
  controls.key(world, "KeyE", true);
  expect(world.selected_card() == 1 && world.owned(game::CardId::roil_step) && world.gold() == 900 && world.shop_result() == game::ShopResult::purchased,
         "shop controls: 2 selects and E purchases without releasing pointer capture");
  expect(controls.aiming() && world.act(Action::dash) && world.dash_cooldown_slots() == 1, "card: half beat dash removes one cooldown slot");
  expect(world.buy_card(2) && world.weapon_damage() == 75 && world.gold() == 825, "card: stonefang grants 75 damage and charges 75 gold");
  expect(world.buy_card(3) && world.magazine_capacity() == 12 && world.pistol().ammo == 12 && world.gold() == 785, "card: quiver fills the upgraded twelve-round magazine");
  expect(world.buy_card(4) && world.max_health() == 125 && world.player().health == 125 && world.gold() == 735, "card: life bloom increases max health and clamps healing to 125");
  expect(world.buy_card(5) && world.owned(game::CardId::vampiric_rite) && world.gold() == 650, "card: vampiric rite costs 85 gold");
  expect(world.buy_card(6) && world.incoming_damage() == 15 && world.gold() == 585, "card: ward reduces incoming hit damage to fifteen");
  expect(!world.buy_card(7) && world.gold() == 585 && world.shop_result() == game::ShopResult::full_health, "shop: repeatable healing does not charge a full-health player");
  next_slot(world);
  world.act(Action::fire);
  next_slot(world);
  world.act(Action::reload);
  next_slot(world);
  world.act(Action::reload);
  expect(world.pistol().ammo == 12 && world.pistol().reload_stage == 0, "card: two-step public reload restores all twelve rounds");
  World outside({{START}}, FLAT);
  outside.award_gold(100, {});
  expect(!outside.buy_card(0) && outside.gold() == 100 && !outside.owned(game::CardId::kor_updraft), "shop: purchase is refused outside a shop room");
  World fresh({{START}}, FLAT);
  expect(fresh.gold() == 0 && fresh.owned_cards() == 0 && fresh.magazine_capacity() == 8, "new run: economy and upgrades reset");

  game::Room entry = START;
  entry.doors = N;
  const Floor route{{entry,
                     {.x = 0, .z = -1, .doors = N | S, .shape = 1, .turn = 0, .depth = 1, .chargers = 0, .casters = 2},
                     {.x = 0, .z = -2, .doors = N | S, .shape = 1, .turn = 0, .depth = 2, .chargers = 0, .casters = 0, .kind = game::RoomKind::shop},
                     {.x = 0, .z = -3, .doors = S, .shape = 1, .turn = 0, .depth = 3, .chargers = 0, .casters = 0, .kind = game::RoomKind::boss}}};
  World adventurer(route, FLAT, 77);
  steps(adventurer, 60);
  enter_north(adventurer);
  for (int shots = 0; shots < 6 && !adventurer.enemies().empty(); shots++) {
    next_slot(adventurer);
    aim_at(adventurer, middle(adventurer.enemies()[0]));
    adventurer.act(Action::fire);
  }
  expect(adventurer.room() == 1 && !adventurer.locked() && adventurer.gold() == 55 && adventurer.outcome() == World::Outcome::playing,
         "economy public flow: two caster kills (10+10) and one depth-one clear (35) grant 55 gold");
  adventurer.look(-adventurer.player().yaw, -adventurer.player().pitch);
  walk_through(adventurer);
  game::Controls buying;
  buying.set_captured(adventurer, true);
  buying.key(adventurer, "Digit1", true);
  buying.key(adventurer, "KeyE", true);
  expect(adventurer.room() == 2 && adventurer.in_shop() && adventurer.gold() == 0 && adventurer.owned(game::CardId::kor_updraft),
         "economy public flow: walk through the unlocked portal, enter shop, buy double jump with earned gold");
  adventurer.look(PI, 0.0f);
  walk_through(adventurer);
  expect(adventurer.room() == 1 && adventurer.enemies().empty() && adventurer.gold() == 0, "economy public flow: revisiting a cleared room cannot farm rewards");

  // Apply the three combat cards through purchases, then observe real enemy
  // attacks and hits rather than testing the stat getters alone.
  game::Room outfitter = shop;
  outfitter.doors = N;
  World fighter(Floor{{outfitter, {.x = 0, .z = -1, .doors = S, .shape = 1, .turn = 0, .depth = 1, .chargers = 1, .casters = 0}}}, FLAT, 77);
  fighter.award_gold(225, {});
  expect(fighter.buy_card(2) && fighter.buy_card(5) && fighter.buy_card(6) && fighter.gold() == 0, "combat cards are bought through the public shop before entering battle");
  steps(fighter, 60);
  enter_north(fighter);
  for (int i = 0; i < 900 && fighter.player().health == 100; i++) fighter.step();
  expect(fighter.player().health == 85 && fighter.hurt_tick().has_value(), "ward: a real charger attack removes fifteen health");
  if (!fighter.enemies().empty() && fighter.outcome() == World::Outcome::playing) {
    next_slot(fighter);
    aim_at(fighter, middle(fighter.enemies()[0]));
    expect(fighter.act(Action::fire) && fighter.enemies().size() == 1 && fighter.enemies()[0].health == 25,
           "stonefang: one public shot deals seventy-five damage, leaving a 100-health charger at twenty-five");
    next_slot(fighter);
    if (!fighter.enemies().empty()) aim_at(fighter, middle(fighter.enemies()[0]));
    expect(fighter.act(Action::fire) && fighter.enemies().empty() && fighter.player().health == 90,
           "vampiric rite: the real kill restores five health after the received fifteen-damage attack");
  } else {
    expect(false, "combat card regression reaches a living enemy and player");
  }

  // A real collision gap: only the centre platform has floor. Walk off it,
  // stop after falling, then let gravity and public step finish recovery.
  const std::vector<engine::Aabb> platform{{{-3.0f, -1.0f, -4.0f}, {3.0f, 0.0f, 4.0f}}};
  game::RoomKit gap{.rooms = {platform, platform, platform, platform, platform, platform}, .nav = {}, .sealed = {}, .gate = {}};
  World falling({{shop}}, gap);
  steps(falling, 60);
  falling.move(0.0f, 1.0f);
  for (int i = 0; i < 140 && falling.player().position.y > -2.0f; i++) falling.step();
  falling.move(0.0f, 0.0f);
  steps(falling, 160);
  expect(falling.grounded() && falling.player().health == 75 && falling.player().position.x < 2.71f && falling.player().position.y > 1.59f,
         "chasm: gravity crosses the gap, deals one hit, and recovers to supported footing");
  expect(near(falling.hurt_direction(), PI), "fall damage reports only the neutral bottom direction");
  falling.award_gold(100, {});
  expect(falling.buy_card(7) && falling.player().health == 100 && falling.gold() == 75, "shop: repeatable healing restores health and charges exactly 25");
}
