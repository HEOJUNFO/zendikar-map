#pragma once
#include <cmath>
#include <cstdio>
#include <limits>
#include "app/client/quality.hpp"
namespace quality_probe {
inline int run(const game::RoomKit& kit) {
  int failures=0;
  const auto expect=[&](bool ok,const char* text){if(!ok){std::printf("FAIL: quality: %s\n",text);++failures;}};
  app::QualityController quality;
  expect(quality.configure(0,1,1,10,false,false,false,3.14159265,.15,7,kit),"explicit paused frame accepted");
  quality.advance(0,kit);quality.advance(1000,kit);
  expect(quality.view().tick==10 && quality.view().enemies.size()==1 && quality.view().enemies.front().kind==game::EnemyKind::charger,"paused animation stays at requested frame; actor selected without World/gameplay");
  const auto camera=quality.camera(16.0f/9.0f);
  expect(camera.eye.z<0 && camera.forward.z>0 && std::abs(engine::dot(camera.forward,camera.right))<.00001f,"default canonical front camera looks from negative Z and has orthogonal axes");
  expect(quality.configure(0,1,1,UINT32_MAX,true,true,false,1.5707963,.25,9,kit),"orbit/lighting change retains public animation time");
  quality.advance(1017,kit);
  expect(quality.view().tick==11 && quality.view().neutral,"one 60Hz animation frame advances without advancing gameplay");
  for(uint32_t pattern=0;pattern<5;++pattern) {
    const auto selected=static_cast<game::BossPattern>(pattern);
    const auto timing=game::boss_timing(selected,game::BossPhase::enraged);
    expect(quality.configure(0,5,4+pattern,timing.windup+1,false,false,true,3.14159265,.15,10,kit),"each actual public boss pattern accepted");
    const auto view=quality.view();const auto& enemy=view.enemies.front();
    expect(enemy.kind==game::EnemyKind::boss && enemy.boss_pattern==selected && enemy.boss_phase==game::BossPhase::enraged && enemy.act==game::Enemy::Act::charge && enemy.act_ticks==1,"public timing selects attack transition and phase exactly");
    const auto pose=game::SceneView::creature_pose(enemy,view.tick,0);
    expect(pose.frame>=11 && pose.frame<=13 && pose.blend>=0 && pose.blend<1,"viewer uses production boss pose selection at real active phase");
  }
  quality.configure(0,5,7,0,false,false,false,0,0,10,kit);
  auto effects=quality.view();
  expect(effects.enemies.front().act==game::Enemy::Act::windup && effects.hazards.size()==6,
         "rain publishes six locked supported seals at windup start");
  if(effects.hazards.size()==6) {
    const auto& first=effects.hazards[0];const auto& last=effects.hazards[5];
    expect(first.position.x==0 && first.position.z==-10 && std::abs(first.position.y)<.001f &&
      first.radius==2.2f && first.age==1 && first.delay==121 && first.duration==141 && last.delay==221 && last.duration==241,
      "rain source target feet and 120-tick warning plus 20-tick stagger/lifetime are exact");
  }
  quality.configure(0,5,7,119,false,false,false,0,0,10,kit);effects=quality.view();
  expect(effects.hazards.size()==6 && effects.hazards[0].age<effects.hazards[0].delay,
         "rain remains harmless through the final warning tick");
  quality.configure(0,5,7,120,false,false,false,0,0,10,kit);effects=quality.view();
  expect(effects.enemies.front().act==game::Enemy::Act::charge && effects.hazards.size()==6 &&
         effects.hazards[0].age==effects.hazards[0].delay,"rain first actual impact begins with active phase publication");
  quality.configure(0,5,7,140,false,false,false,0,0,10,kit);
  expect(quality.view().hazards.size()==5,"expired first impact is removed while five later locks persist");
  quality.configure(0,5,4,120,false,false,false,0,0,10,kit);effects=quality.view();
  expect(effects.hazards.size()==1 && effects.hazards[0].kind==game::GroundHazard::Kind::fire_breath &&
    effects.hazards[0].position.y==2.4f && effects.hazards[0].radius==16 && effects.hazards[0].age==1 &&
    std::abs(effects.hazards[0].direction.y+.07974522f)<.00001f,
    "breath uses actual 2.4m mouth, locked eye-height aim, reach and post-step age");
  quality.configure(0,5,5,179,false,false,false,0,0,10,kit);effects=quality.view();
  expect(effects.hazards.size()==1 && effects.hazards[0].kind==game::GroundHazard::Kind::shockwave &&
    effects.hazards[0].position.y==0 && effects.hazards[0].age==60 && effects.hazards[0].radius==16,
    "shockwave travels exactly 16m in 60 actual simulation ticks from floor origin");
  quality.configure(0,5,8,120,false,false,false,0,0,10,kit);effects=quality.view();
  expect(effects.hazards.size()==1 && effects.hazards[0].kind==game::GroundHazard::Kind::sweep &&
    effects.hazards[0].position.y==2.4f && effects.hazards[0].duration==120,
    "sweep keeps production mouth origin and actual public rotation duration");
  expect(quality.configure(0,6,2,30,false,false,false,0,0,7,kit) && quality.view().merchant && quality.view().merchant->phase==game::MerchantPhase::rising,"merchant resurrection is presentation state without combat");
  const auto fallen=game::SceneView::merchant_pose(game::MerchantPhase::fallen,12,12);
  const auto rising=game::SceneView::merchant_pose(game::MerchantPhase::rising,30,30);
  expect(fallen.frame==5 && fallen.next==6 && fallen.blend==.5f && rising.frame==11 && rising.next==12 && rising.blend==.5f,"merchant displayed pose info shares production fall/rise interpolation");
  expect(quality.configure(0,5,3,3,false,false,false,0,0,10,kit),"ragdoll frame scrub accepted");
  const auto first=quality.view().corpse_bones.front().m;
  expect(quality.view().corpse_bones.size()==20 && quality.view().enemies.front().health==0,"boss death uses actual articulated palette rather than static death pose");
  quality.configure(0,5,3,0,false,false,false,0,0,10,kit);
  quality.configure(0,5,3,3,false,false,false,0,0,10,kit);
  expect(quality.view().corpse_bones.front().m==first,"backward/forward scrub replays the same real physics deterministically");
  const auto before=quality.view().tick;
  expect(!quality.configure(game::SHAPE_COUNT,1,0,0,false,false,false,0,0,7,kit) &&
    !quality.configure(0,8,0,0,false,false,false,0,0,7,kit) &&
    !quality.configure(0,1,9,0,false,false,false,0,0,7,kit) &&
    !quality.configure(0,4,3,0,false,false,false,0,0,7,kit) &&
    !quality.configure(0,1,4,0,false,false,false,0,0,7,kit) &&
    !quality.configure(0,1,0,3601,false,false,false,0,0,7,kit) &&
    !quality.configure(0,1,0,0,false,false,false,std::numeric_limits<double>::quiet_NaN(),0,7,kit) &&
    quality.view().tick==before,"invalid scene/actor/action/tick/nonfinite camera fail atomically at command boundary");
  return failures;
}
} // namespace quality_probe
