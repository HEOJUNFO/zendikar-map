#pragma once
#include "gameplay/domain/creature_animation.hpp"
#include "gameplay/simulation/world.hpp"

namespace game {
template<class Animation>
inline CreaturePose creature_pose(const Enemy& enemy,uint64_t tick,const Animation& animation,bool idle) {
  const auto select=[&]()->CreaturePose {
  using A=CreatureAnimation;
  if(enemy.health<=0)return {A::death,float(tick-enemy.death_tick.value_or(0))};
  if(enemy.hurt_tick && tick>=*enemy.hurt_tick && tick-*enemy.hurt_tick<animation.track(A::hit).frames-1)return {A::hit,float(tick-*enemy.hurt_tick)};
  if(enemy.act==Enemy::Act::roam){
    if(idle || (!enemy.moving && enemy.animation_distance>=0))return {A::idle,float(tick)+float(enemy.visual_id*17)};
    const auto& move=animation.track(A::move);
    const float phase=enemy.animation_distance<0 ? float(tick) : enemy.animation_distance/move.stride*float(move.frames-1);
    return {A::move,phase+float(enemy.visual_id*17)};
  }
  const auto clip=enemy.kind!=EnemyKind::boss || enemy.boss_pattern==BossPattern::breath ? A::attack :
    enemy.boss_pattern==BossPattern::shockwave ? A::shockwave : enemy.boss_pattern==BossPattern::charge ? A::charge : enemy.boss_pattern==BossPattern::shard_rain ? A::shard_rain : A::sweep;
  const auto& track=animation.track(clip);const auto& t=traits(enemy.kind);
  const auto timing=enemy.kind==EnemyKind::boss ? boss_timing(enemy.boss_pattern,enemy.boss_phase) : BossPatternTiming{t.windup,enemy.kind==EnemyKind::bat ? 42u : CHARGE_TICKS,t.recover};
  const float age=float(enemy.act_ticks);
  if(enemy.act==Enemy::Act::windup)return {clip,float(track.impact)*std::min(age/float(timing.windup),1.0f)};
  if(enemy.act==Enemy::Act::charge)return {clip,float(track.impact)+float(track.recovery-track.impact)*std::min(age/float(timing.active),1.0f)};
  const uint32_t start=enemy.attack_had_active_phase ? track.recovery : track.impact;
  return {clip,float(start)+float(track.frames-1-start)*std::min(age/float(timing.recover),1.0f)};
  };auto pose=select();pose.yaw=enemy.yaw;return pose;
}

/** Rendering and precise shots consume the exact same finite pose mixture. */
inline engine::SkinPalette sample_creature_palette(const Enemy& enemy,uint64_t tick,const CreatureAnimation& animation,bool idle) {
  static_assert(CreatureMotion::MAX_POSES==engine::MAX_SKIN_POSES);
  const auto selected=creature_pose(enemy,tick,animation,idle);
  const auto mix=enemy.motion.mix(selected,tick);engine::SkinPalette palette;
  const uint32_t bones=animation.bone_count();palette.configuration={mix.count,bones,0,0};
  const double angle=std::remainder(mix.root_yaw()-enemy.yaw,2*std::numbers::pi);
  palette.root={static_cast<float>(std::cos(angle)),static_cast<float>(std::sin(angle)),0,0};
  for(uint32_t i=0;i<mix.count;++i){
    auto out=std::span{palette.bones}.subspan(i*bones,bones);animation.sample(mix.poses[i].clip,mix.poses[i].tick,out);
    palette.weights[i/4][i%4]=mix.weights[i];
  }
  return palette;
}
inline engine::Vec3 skinned_point(const engine::SkinPalette& palette,const std::array<uint32_t,8>& joints,const std::array<float,8>& weights,engine::Vec3 bind) {
  engine::Vec3 out{};const auto count=palette.configuration[0],bones=palette.configuration[1];
  for(uint32_t i=0;i<count;++i)out=out+engine::dual_quaternion_point(std::span{palette.bones}.subspan(i*bones,bones),joints,weights,bind)*palette.weights[i/4][i%4];
  const auto& r=palette.root;return {r[0]*out.x-r[1]*out.z,out.y,r[1]*out.x+r[0]*out.z};
}
} // namespace game
