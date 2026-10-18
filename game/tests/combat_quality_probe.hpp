/** Public production World regressions: no forced actor state or private memory. */
void combat_quality_patterns() {
  expect(game::CHARGER.health==200 && game::CASTER.health==150 && game::SPIDER.health==180 && game::BAT.health==100,
         "역할별 기본 체력: 해골4발, caster3발, 거미4발, 박쥐2발의 50피해 권총 대응");
  Room arena=START;arena.kind=game::RoomKind::boss;
  // Keep the Node probe's 64KiB stack independent of compiler inlining into
  // main. Each actual World is constructed normally and destroyed by RAII.
  auto storage=std::make_unique<World>(Floor{{arena}},FLAT,7);World& world=*storage;
  bool patterns[5]{},active[5]{},recovered[5]{};
  bool rain_warning=false,rain_strike=false,sweep=false,charge_moved=false,safe=true,beat_starts=true;
  uint32_t previous_cycle=0;engine::Vec3 previous{};
  for(uint32_t i=0;i<2400;++i) {
    world.heal_player(100);
    const auto before=world.enemies()[0];world.step();
    const auto& enemy=world.enemies()[0];
    const auto pattern=static_cast<uint32_t>(enemy.boss_pattern);
    if(enemy.attack_cycle!=previous_cycle) {
      patterns[pattern]=true;previous_cycle=enemy.attack_cycle;
      beat_starts=beat_starts&&game::beat_head(world.tick())&&enemy.act==Enemy::Act::windup&&enemy.act_ticks==0;
    }
    active[pattern]=active[pattern]||enemy.act==Enemy::Act::charge;
    recovered[pattern]=recovered[pattern]||enemy.act==Enemy::Act::recover;
    if(enemy.boss_pattern==game::BossPattern::charge && before.act==Enemy::Act::charge)
      charge_moved=charge_moved||flat_distance(previous,enemy.position)>.15f;
    previous=enemy.position;
    safe=safe&&std::fabs(enemy.position.x)+game::BOSS_MESH_RADIUS<=24.701f&&std::fabs(enemy.position.z)+game::BOSS_MESH_RADIUS<=24.701f;
    for(const auto& hazard:world.hazards()) {
      rain_warning=rain_warning||(hazard.kind==game::GroundHazard::Kind::shard_impact&&hazard.age<hazard.delay);
      rain_strike=rain_strike||(hazard.kind==game::GroundHazard::Kind::shard_impact&&hazard.age>=hazard.delay);
      sweep=sweep||hazard.kind==game::GroundHazard::Kind::sweep;
    }
  }
  expect(std::all_of(std::begin(patterns),std::end(patterns),[](bool b){return b;})&&std::all_of(std::begin(active),std::end(active),[](bool b){return b;})&&std::all_of(std::begin(recovered),std::end(recovered),[](bool b){return b;}),
         "실제 보스는 다섯 패턴을 각각 예고·공격·회복하며 한 패턴의 active 상태를 생략하지 않는다");
  expect(beat_starts&&charge_moved&&safe,"보스 패턴은 박 머리에 시작하고 실제 큰 몸 돌진은 방 충돌 경계를 지킨다");
  expect(rain_warning&&rain_strike&&sweep,"낙하 헤드론은 무피해 예고 후 실제 폭발하고 광선은 별도 회전 위험으로 존재한다");
  const engine::Vec3 aim{0,0,-1};
  const auto left=game::sweep_direction(aim,0,120),centre=game::sweep_direction(aim,60,120),right=game::sweep_direction(aim,120,120);
  expect(left.x<-.8f&&near(centre.x,0)&&right.x>.8f&&near(engine::dot(left,left),1),"회전 광선은 실제 방향을 -60도에서 정면을 거쳐 +60도로 쓸며 길이가 변하지 않는다");
}

void combat_quality_phase() {
  Room arena=START;arena.kind=game::RoomKind::boss;
  auto storage=std::make_unique<World>(Floor{{arena}},FLAT,7);World& phase=*storage;
  bool enraged=false,warning_safe=true,damage=false;
  for(uint32_t i=0;i<2000&&!enraged;++i) {
    phase.heal_player(100);phase.step();
    const auto& enemy=phase.enemies()[0];
    if(enemy.attack_cycle==1&&enemy.act==Enemy::Act::windup)warning_safe=warning_safe&&phase.player().health==100;
    damage=damage||phase.player().health<100;
    if(enemy.health>1600 && phase.tick()%20==0) {
      aim_at(phase,middle(enemy));phase.act(phase.pistol().ammo==0||phase.pistol().reload_stage?Action::reload:Action::fire);
    }
    enraged=enemy.boss_phase==game::BossPhase::enraged;
  }
  expect(warning_safe&&damage,"보스의 첫 실제 화염은 예고 중에는 피해가 없고 공격에 들어선 뒤에만 피해를 준다");
  expect(enraged&&phase.enemies()[0].health>0&&game::boss_timing(phase.enemies()[0].boss_pattern,phase.enemies()[0].boss_phase).windup==80,
         "실제 권총 명중으로 절반 체력을 깎으면 살아 있는 보스가 다음 예고부터 2박 광폭화 단계에 든다");
}

void combat_quality_rain() {
  Room arena=START;arena.kind=game::RoomKind::boss;
  auto first=std::make_unique<World>(Floor{{arena}},FLAT,7),second=std::make_unique<World>(Floor{{arena}},FLAT,7);
  World& standing=*first;World& evading=*second;bool warned=false,impacted=false;
  for(uint32_t i=0;i<1600&&!impacted;++i) {
    if(!warned)standing.heal_player(100),evading.heal_player(100);
    standing.step();evading.step();
    if(!warned&&standing.enemies()[0].boss_pattern==game::BossPattern::shard_rain&&standing.enemies()[0].act==Enemy::Act::windup) {
      warned=true;evading.move(1,0);
    }
    for(const auto& hazard:standing.hazards())if(hazard.kind==game::GroundHazard::Kind::shard_impact&&hazard.age>=hazard.delay)impacted=true;
  }
  expect(warned&&impacted&&standing.player().health==75&&evading.player().health==100,
         "낙하 헤드론의 실제 발 위치 표식에 머무르면 25 피해를 받고 예고 중 공개 이동으로 벗어나면 같은 공격을 피한다");
}

void combat_quality() { combat_quality_patterns();combat_quality_phase();combat_quality_rain(); }
