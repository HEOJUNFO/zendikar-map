#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <sstream>
#include "gameplay/domain/boss_rig_data.hpp"
#include "gameplay/presentation/scene_view.hpp"

namespace app {
/** An explicit presentation controller: no gameplay World, input or combat.
 * Animation time is fixed 60Hz; a scrub deterministically replays ragdoll from
 * its bind state against the selected production room collision geometry. */
class QualityController {
 public:
  uint32_t shape{}, actor{1}, action{}, tick{};
  bool playing{true}, neutral{}, enraged{};
  float yaw{3.14159265f}, pitch{.15f}, distance{7.0f};
  uint64_t revision{};
  static constexpr uint32_t MAX_TICK=3600;
  bool configure(uint32_t next_shape,uint32_t next_actor,uint32_t next_action,uint32_t next_tick,
                 bool play,bool review,bool rage,double orbit_yaw,double orbit_pitch,double zoom,const game::RoomKit& kit) {
    if (next_shape>=game::SHAPE_COUNT || next_actor>7 || next_action>8 || (next_tick>MAX_TICK && next_tick!=UINT32_MAX) ||
        (next_action>=4 && next_actor!=5) || (next_actor==4 && next_action==3) || (next_actor==0 && next_action!=0) ||
        !std::isfinite(orbit_yaw) || !std::isfinite(orbit_pitch) || !std::isfinite(zoom)) return false;
    const bool replay=shape!=next_shape || actor!=next_actor || action!=next_action || enraged!=rage || (next_tick!=UINT32_MAX && tick!=next_tick);
    shape=next_shape; actor=next_actor; action=next_action; playing=play; neutral=review; enraged=rage;
    yaw=static_cast<float>(std::remainder(orbit_yaw,6.283185307179586)); pitch=std::clamp(static_cast<float>(orbit_pitch),-1.3f,1.3f);
    distance=std::clamp(static_cast<float>(zoom),1.0f,65.0f);
    if (replay || !initialized_) { const auto target=next_tick==UINT32_MAX ? 0 : next_tick; reset(kit); for (uint32_t i=0;i<target;++i) step(); }
    ++revision; return true;
  }
  void advance(double now,const game::RoomKit& kit) {
    if (!initialized_) reset(kit);
    if (last_ms_<0) last_ms_=now;
    if (playing) {
      fraction_+=std::clamp((now-last_ms_)*.06,0.0,8.0);
      while (fraction_>=1) { step(); fraction_-=1; }
    }
    last_ms_=now;
  }
  game::Camera camera(float aspect) const {
    const float height=actor==0 ? 2.3f : actor==5 ? 2.1f : actor>=6 ? 1.05f : actor==4 ? 2.0f : .8f;
    engine::Vec3 center{0,height,0};
    if (actor==5 && action==3 && ragdoll_) center=(ragdoll_->bounds().min+ragdoll_->bounds().max)*.5f;
    const auto forward=engine::forward_from(yaw,-pitch);
    return game::camera_at(center-forward*distance,yaw,-pitch,0,aspect,55);
  }
  game::SceneView::Preview view() {
    game::SceneView::Preview result{.room={0,0,15,static_cast<uint8_t>(shape),0,0,0,0},.tick=tick,.neutral=neutral,.idle=action==0};
    enemy_={.kind=game::EnemyKind::charger,.position={},.health=100};
    hazard_count_=0;
    if (actor>0 && actor<6) {
      constexpr std::array kinds{game::EnemyKind::charger,game::EnemyKind::caster,game::EnemyKind::spider,game::EnemyKind::bat,game::EnemyKind::boss};
      enemy_.kind=kinds[actor-1]; enemy_.health=game::traits(enemy_.kind).health;
      enemy_.aim={0,0,-1};
      if (actor==4) enemy_.position.y=2.0f;
      if (action==3) enemy_.health=0;
      else if (action>=2) {
        const auto& traits=game::traits(enemy_.kind);
        const auto pattern=static_cast<game::BossPattern>(action>=4 ? action-4 : 0);
        const auto phase=enraged ? game::BossPhase::enraged : game::BossPhase::first;
        const auto timing=actor==5 ? game::boss_timing(pattern,phase) : game::BossPatternTiming{traits.windup,game::CHARGE_TICKS,traits.recover};
        const uint32_t age=tick%(timing.windup+timing.active+timing.recover);
        enemy_.act=age<timing.windup ? game::Enemy::Act::windup : age<timing.windup+timing.active ? game::Enemy::Act::charge : game::Enemy::Act::recover;
        enemy_.act_ticks=age-(age<timing.windup ? 0 : age<timing.windup+timing.active ? timing.windup : timing.windup+timing.active);
        enemy_.boss_pattern=pattern;enemy_.boss_phase=phase;
        if (actor==5) {
          // A fixed review target supplies the same locked aim and supported
          // impact geometry as combat; only the encounter/AI is omitted.
          constexpr engine::Vec3 feet{0,0,-10};
          const engine::Vec3 mouth=enemy_.position+engine::Vec3{0,2.4f,0};
          enemy_.aim=pattern==game::BossPattern::breath || pattern==game::BossPattern::sweep
            ? engine::normalize(feet+engine::Vec3{0,game::EYE_HEIGHT,0}-mouth) : engine::Vec3{0,0,-1};
          // Production publishes hazards after step_hazards has advanced them
          // in the same tick that step_boss creates them.
          if(pattern==game::BossPattern::shard_rain) {
            for(uint32_t i=0;i<6;++i) {
              const uint32_t delay=timing.windup+i*game::TICKS_PER_SLOT+1;
              const uint32_t duration=delay+game::TICKS_PER_SLOT;
              if(age+1>=duration) continue;
              const auto target=game::boss_shard_target(feet,i);
              if(std::fabs(target.x)>game::ROOM_HALF-2 || std::fabs(target.z)>game::ROOM_HALF-2) continue;
              const auto floor=stage_.raycast({target+engine::Vec3{0,4,0},{0,-1,0}},5);
              if(!floor)continue;
              hazards_[hazard_count_++]={.kind=game::GroundHazard::Kind::shard_impact,
                .position={target.x,target.y+4-floor->distance,target.z},.age=age+1,.duration=duration,.radius=2.2f,.delay=delay};
            }
          } else if(enemy_.act==game::Enemy::Act::charge) {
            const uint32_t at=enemy_.act_ticks+1;
            if(pattern!=game::BossPattern::charge && at<timing.active) {
              const auto kind=pattern==game::BossPattern::shockwave ? game::GroundHazard::Kind::shockwave :
                pattern==game::BossPattern::sweep ? game::GroundHazard::Kind::sweep : game::GroundHazard::Kind::fire_breath;
              hazards_[0]={.kind=kind,.position=pattern==game::BossPattern::shockwave ? enemy_.position : mouth,
                .direction=pattern==game::BossPattern::shockwave ? engine::Vec3{} : enemy_.aim,.age=at,.duration=timing.active,
                .radius=pattern==game::BossPattern::shockwave ? float(at)*16.0f/game::TICK_RATE : game::boss_range(pattern)};
              hazard_count_=1;
            } else if(pattern==game::BossPattern::charge) enemy_.position.z=-std::sin(float(enemy_.act_ticks)/timing.active*3.14159265f)*8;
          }
        }
      }
      result.enemies={&enemy_,1};
    } else if (actor>=6) {
      merchant_={.position={},.yaw=0,.phase=game::MerchantPhase::seated,.phase_tick=0};
      if (actor==7) {
        merchant_.phase=game::MerchantPhase::hunting;
        enemy_={.kind=game::EnemyKind::witch,.position={},.health=game::WITCH.health};
        result.enemies={&enemy_,1};
      }
      if (action==3) merchant_.phase=game::MerchantPhase::fallen;
      else if (action==2) merchant_.phase=game::MerchantPhase::rising;
      result.merchant=&merchant_;
    }
    if (ragdoll_) {result.corpse_bones=ragdoll_->palette();result.corpse_bounds=ragdoll_->bounds();enemy_.corpse_bounds=result.corpse_bounds;}
    result.hazards={hazards_.data(),hazard_count_}; return result;
  }
  std::string state(game::Scenery::State ready,const game::Scenery& scenery,uint64_t frame) {
    const game::Scenery::Prop* model=nullptr;
    uint32_t pose=0; float blend=0;
    if (ready==game::Scenery::State::ready) {
      if (actor>0 && actor<6 && actor!=4 && !(actor==5 && action==3)) {
        const auto kind=actor==5 ? game::Scenery::BOSS : static_cast<game::Scenery::Creature>(actor-1);
        const auto poses=scenery.creature_frames(kind);
        const auto selected=game::SceneView::creature_pose(view().enemies.front(),tick,0,action==0);
        pose=selected.frame;blend=selected.blend;if(pose<poses.size())model=&poses[pose];
      } else if (actor==4) {const auto selected=game::SceneView::creature_pose(view().enemies.front(),tick,0,action==0);pose=selected.frame;blend=selected.blend;model=&scenery.bat_frames()[pose];}
      else if (actor>=6) {const auto vendor=view().merchant;const auto selected=game::SceneView::merchant_pose(vendor->phase,tick-vendor->phase_tick,tick);pose=selected.frame;blend=selected.blend;model=&scenery.merchant_poses()[pose];}
      else if (actor==5 && action==3) model=&scenery.boss_skin().model;
    }
    const auto bounds=ragdoll_ ? ragdoll_->bounds() : model ? model->bounds : engine::Aabb{{-24,0,-24},{24,9,24}};
    const auto size=bounds.max-bounds.min;
    std::ostringstream out;
    out<<"{\"ready\":"<<(ready==game::Scenery::State::ready ? "true":"false")<<",\"failed\":"<<(ready==game::Scenery::State::failed ? "true":"false")
       <<",\"frame\":"<<frame<<",\"revision\":"<<revision<<",\"scene\":"<<shape<<",\"actor\":"<<actor<<",\"action\":"<<action<<",\"tick\":"<<tick
       <<",\"playing\":"<<(playing?"true":"false")<<",\"neutral\":"<<(neutral?"true":"false")<<",\"enraged\":"<<(enraged?"true":"false")<<",\"pose\":"<<pose<<",\"blend\":"<<blend
       <<",\"vertices\":"<<(model?model->vertex_count:0)<<",\"dimensions\":["<<size.x<<","<<size.y<<","<<size.z<<"],\"settled\":"<<(ragdoll_&&ragdoll_->settled()?"true":"false")
       <<",\"act\":"<<static_cast<uint32_t>(enemy_.act)<<",\"actTicks\":"<<enemy_.act_ticks<<",\"contactSha256\":\""<<game::BOSS_CONTACTS_SHA256<<"\""
       <<",\"camera\":["<<yaw<<","<<pitch<<","<<distance<<"]}";
    return out.str();
  }
 private:
  void reset(const game::RoomKit& kit) {
    initialized_=true;tick=0;fraction_=0;ragdoll_.reset();stage_.build(kit.rooms[shape]);
    if (actor==5 && action==3) {ragdoll_.emplace();ragdoll_->start(game::BOSS_RIG,engine::Mat4::identity(),{0,.2f,-2},game::BOSS_CONTACTS);}
  }
  void step() {
    if (tick>=MAX_TICK) {if (action==3) {playing=false;return;} tick=0;} ++tick;
    if (ragdoll_) ragdoll_->step(stage_,{},{{-24,-40,-24},{24,9,24}});
  }
  bool initialized_{};double last_ms_{-1},fraction_{};
  engine::Lbvh stage_;std::optional<engine::Ragdoll> ragdoll_;
  game::Enemy enemy_{.kind=game::EnemyKind::charger,.position={},.health=100};
  game::Merchant merchant_{};std::array<game::GroundHazard,8> hazards_{};uint32_t hazard_count_{};
};
} // namespace app
