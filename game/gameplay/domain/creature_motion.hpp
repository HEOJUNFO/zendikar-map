#pragma once
#include "gameplay/domain/creature_animation.hpp"
#include <numbers>

namespace game {
struct CreaturePose {CreatureAnimation::Clip clip{};float tick{},yaw{};};
/** Eight-tick vertex-space transitions. A prior layer keeps its original expiry
 * even when interrupted, so at most eight previous integer-tick poses coexist.
 * There is no layer eviction, pose approximation, or whole-mesh snapshot. */
struct CreatureMotion {
  static constexpr uint32_t FADE_TICKS=8,MAX_POSES=FADE_TICKS+1;
  struct Source {CreaturePose pose;float weight;uint64_t start,end;};
  struct Mix {
    std::array<CreaturePose,MAX_POSES> poses{};std::array<float,MAX_POSES> weights{};uint32_t count{};
    double root_yaw() const {
      double value=0,total=0;for(uint32_t i=0;i<count;++i){value+=double(poses[i].yaw)*weights[i];total+=weights[i];}
      return value/total;
    }
  };
  std::array<Source,FADE_TICKS> sources{};
  CreaturePose current{};
  uint64_t epoch{},transition_tick{},last_tick{};
  uint32_t count{};bool initialized{},transitioned{};
  static float weight(const Source& source,uint64_t tick) {
    return tick>=source.end ? 0 : source.weight*float(source.end-tick)/float(source.end-source.start);
  }
  static float nearest_yaw(float value,double reference) {
    return static_cast<float>(reference+std::remainder(double(value)-reference,2*std::numbers::pi));
  }
  bool update(CreaturePose pose,uint64_t key,uint64_t tick) {
    if(initialized && tick<last_tick)return false;
    if(!initialized){current=pose;epoch=key;last_tick=tick;initialized=true;return true;}
    if(pose.clip!=current.clip || key!=epoch){
      pose.yaw=nearest_yaw(pose.yaw,mix(current,tick).root_yaw());
      uint32_t kept=0;float sum=0;
      for(uint32_t i=0;i<count;++i){const float w=weight(sources[i],tick);if(w<=0)continue;
        auto source=sources[i];source.weight=w;source.start=tick;sources[kept++]=source;sum+=w;}
      // A second interruption in the same tick has no new target contribution.
      const float live=transitioned && tick==transition_tick ? 0 : std::max(0.0f,1-sum);
      if(live>0){if(kept==sources.size())return false;sources[kept++]={current,live,tick,tick+FADE_TICKS};}
      count=kept;transition_tick=tick;transitioned=true;epoch=key;
    } else pose.yaw=nearest_yaw(pose.yaw,current.yaw);
    // A common 2pi rebase preserves every orientation and relative angle while
    // keeping the finite history numerically bounded during repeated turns.
    if(std::abs(pose.yaw)>2*std::numbers::pi){
      const double offset=2*std::numbers::pi*std::round(double(pose.yaw)/(2*std::numbers::pi));
      pose.yaw=static_cast<float>(double(pose.yaw)-offset);
      for(uint32_t i=0;i<count;++i)sources[i].pose.yaw=static_cast<float>(double(sources[i].pose.yaw)-offset);
    }
    current=pose;last_tick=tick;return true;
  }
  Mix mix(CreaturePose live,uint64_t tick) const {
    if(initialized)live.yaw=nearest_yaw(live.yaw,current.yaw);
    Mix out;float total=0;
    for(uint32_t i=0;i<count;++i){const float w=weight(sources[i],tick);if(w<=0)continue;
      out.poses[out.count]=sources[i].pose;out.weights[out.count++]=w;total+=w;}
    const float now=std::max(0.0f,1-total);
    if(now>0 || out.count==0){out.poses[out.count]=live;out.weights[out.count++]=now;total+=now;}
    for(uint32_t i=0;i<out.count;++i)out.weights[i]/=total;
    return out;
  }
};
} // namespace game
