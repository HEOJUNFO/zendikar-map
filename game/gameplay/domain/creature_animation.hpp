#pragma once
#include <algorithm>
#include <cmath>
#include <cstring>
#include <optional>
#include <span>
#include <vector>
#include "engine/spatial/surface_mesh.hpp"

namespace game {
/** Rate-tagged skin transforms baked from editable DCC armature Actions. Each
 * actor samples its own palette. No generated root wobble or static fallback. */
class CreatureAnimation {
 public:
  enum Clip : uint32_t { idle, move, attack, hit, death, shockwave, charge, shard_rain, sweep };
  struct Track {
    uint32_t frames{}, samples{}, hz{60}, impact{}, recovery{}; bool loop{}; float stride{};
    std::vector<engine::SkinTransform> transforms;
  };
  struct ClipInfo {uint32_t frames{},impact{},recovery{};float stride{};};
  struct Profile {
    std::array<ClipInfo,9> clips{};
    const ClipInfo& track(Clip clip) const {return clips[clip];}
  };
  Profile profile() const {
    Profile out;for(size_t i=0;i<tracks_.size();++i){const auto& t=tracks_[i];out.clips[i]={t.frames,t.impact,t.recovery,t.stride};}return out;
  }
  static std::optional<CreatureAnimation> decode(std::span<const std::byte> bytes) {
    if(bytes.size()<16 || std::memcmp(bytes.data(),"ZKAN",4))return std::nullopt;
    const auto u32=[&](size_t at){uint32_t v;std::memcpy(&v,bytes.data()+at,4);return v;};
    CreatureAnimation result;result.bones_=u32(8);const uint32_t count=u32(12),version=u32(4);
    if((version!=1&&version!=2) || !result.bones_ || result.bones_>engine::MAX_SKIN_BONES || (count!=5 && count!=9))return std::nullopt;
    constexpr const char* names[]{"idle","move","attack","hit","death","shockwave","charge","shard_rain","sweep"};size_t offset=16;
    for(uint32_t i=0;i<count;++i){
      if(bytes.size()-offset<56)return std::nullopt;
      char name[33]{};std::memcpy(name,bytes.data()+offset,32);
      if(std::strcmp(name,names[i]))return std::nullopt;
      Track t;t.samples=u32(offset+32);t.hz=u32(offset+48);const auto flags=u32(offset+36);t.loop=flags==1;t.impact=u32(offset+40);std::memcpy(&t.stride,bytes.data()+offset+44,4);
      if(t.samples<2 || t.samples>4097 || (t.hz!=60&&t.hz!=240) || (version==1&&t.hz!=60) || (t.samples-1)%(t.hz/60) || flags>1 || !std::isfinite(t.stride) || t.stride<0)return std::nullopt;
      t.frames=(t.samples-1)/(t.hz/60)+1;if(t.impact!=UINT32_MAX&&t.impact>=t.frames)return std::nullopt;
      if(i==move && t.stride<=0)return std::nullopt;
      t.recovery=u32(offset+52);if(t.impact!=UINT32_MAX && (t.recovery<t.impact || t.recovery>=t.frames))return std::nullopt;
      offset+=56;const size_t n=size_t(t.samples)*result.bones_,size=n*sizeof(engine::SkinTransform);
      if(size>bytes.size()-offset)return std::nullopt;
      t.transforms.resize(n);std::memcpy(t.transforms.data(),bytes.data()+offset,size);offset+=size;
      for(const auto& q:t.transforms){float square=0,parallel=0;for(size_t k=0;k<4;++k){if(!std::isfinite(q.real[k]) || !std::isfinite(q.dual[k]))return std::nullopt;square+=q.real[k]*q.real[k];parallel+=q.real[k]*q.dual[k];}if(std::abs(square-1)>.001f || std::abs(parallel)>.001f)return std::nullopt;}
      result.tracks_.push_back(std::move(t));
    }
    if(offset!=bytes.size())return std::nullopt;return result;
  }
  uint32_t bone_count() const {return bones_;}
  uint32_t clip_count() const {return static_cast<uint32_t>(tracks_.size());}
  const Track& track(Clip clip) const {return tracks_[clip];}
  static engine::SkinTransform interpolate(const engine::SkinTransform& a,const engine::SkinTransform& b,float fraction) {
    engine::SkinTransform out;float alignment=0;for(size_t k=0;k<4;++k)alignment+=a.real[k]*b.real[k];const float sign=alignment<0 ? -1.0f : 1.0f;float square=0;
    for(size_t k=0;k<4;++k){out.real[k]=a.real[k]*(1-fraction)+b.real[k]*fraction*sign;out.dual[k]=a.dual[k]*(1-fraction)+b.dual[k]*fraction*sign;square+=out.real[k]*out.real[k];}
    const float inverse=1/std::sqrt(square);float parallel=0;for(size_t k=0;k<4;++k){out.real[k]*=inverse;out.dual[k]*=inverse;parallel+=out.real[k]*out.dual[k];}for(size_t k=0;k<4;++k)out.dual[k]-=out.real[k]*parallel;return out;
  }
  void sample(Clip clip,float tick,std::span<engine::SkinTransform> out) const {
    const auto& t=tracks_[clip];const float duration=float(t.frames-1);
    tick=t.loop ? std::fmod(std::max(tick,0.0f),duration) : std::clamp(tick,0.0f,duration);
    tick*=float(t.hz)/60;const uint32_t frame=static_cast<uint32_t>(tick),next=std::min(frame+1,t.samples-1);const float fraction=tick-float(frame);
    for(uint32_t i=0;i<bones_;++i)out[i]=interpolate(t.transforms[size_t(frame)*bones_+i],t.transforms[size_t(next)*bones_+i],fraction);
  }
 private:
  uint32_t bones_{};std::vector<Track> tracks_;
};
} // namespace game
