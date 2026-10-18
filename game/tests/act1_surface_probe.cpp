// Offline audit of the real runtime surface. This does not modify source assets
// or replace the game's rig with a diagnostic mesh.
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iomanip>
#include <string>
#include <unordered_map>
#include <vector>
#include "engine/asset/pack.hpp"
#include "engine/spatial/lbvh.hpp"
#include "gameplay/domain/creature_animation.hpp"

namespace {
constexpr double EPS=.00003; // metres: same 30 micrometre tolerance as surface ray fixtures
uint32_t reportLimit=20;
bool terminalDeath=false;
struct V {
  double x{},y{},z{};
  V operator+(V b)const{return {x+b.x,y+b.y,z+b.z};}
  V operator-(V b)const{return {x-b.x,y-b.y,z-b.z};}
  V operator*(double s)const{return {x*s,y*s,z*s};}
};
double dot(V a,V b){return a.x*b.x+a.y*b.y+a.z*b.z;}
V cross(V a,V b){return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};}
double length(V a){return std::sqrt(dot(a,a));}
struct Triangle {
  std::array<V,3> p;V normal{};bool valid{};
  explicit Triangle(std::array<V,3> points):p(points){
    const V n=cross(p[1]-p[0],p[2]-p[0]);const double area=length(n);
    valid=area>1e-12;if(valid)normal=n*(1/area);
  }
};
struct Crossing {double length{},straddle{};bool nearPlane{};};
// Proper crossing requires both triangles to strictly straddle the other's
// plane and a positive overlap of their line slices. Shared edges/vertices are
// retained as candidates; they are excluded by the geometric test itself.
Crossing intersect(const Triangle& a,const Triangle& b){
  if(!a.valid||!b.valid)return {};
  std::array<double,3> da,db;
  for(size_t k=0;k<3;++k){da[k]=dot(a.p[k]-b.p[0],b.normal);db[k]=dot(b.p[k]-a.p[0],a.normal);}
  const auto aminmax=std::minmax_element(da.begin(),da.end()),bminmax=std::minmax_element(db.begin(),db.end());
  const double amin=*aminmax.first,amax=*aminmax.second,bmin=*bminmax.first,bmax=*bminmax.second;
  if(amin>EPS||amax<-EPS||bmin>EPS||bmax<-EPS)return {};
  if(std::max(std::abs(amin),std::abs(amax))<=EPS&&std::max(std::abs(bmin),std::abs(bmax))<=EPS){
    // Separating axes in the common plane. This is a separate near-plane
    // overlap finding, never described as deep penetration.
    double minimum=INFINITY;
    for(const Triangle* t:{&a,&b})for(size_t edge=0;edge<3;++edge){
      V axis=cross(a.normal,t->p[(edge+1)%3]-t->p[edge]);const double size=length(axis);if(size<=1e-12)continue;axis=axis*(1/size);
      double loA=INFINITY,hiA=-INFINITY,loB=INFINITY,hiB=-INFINITY;
      for(size_t k=0;k<3;++k){const double x=dot(a.p[k],axis),y=dot(b.p[k],axis);loA=std::min(loA,x);hiA=std::max(hiA,x);loB=std::min(loB,y);hiB=std::max(hiB,y);}
      const double overlap=std::min(hiA,hiB)-std::max(loA,loB);if(overlap<=EPS)return {};minimum=std::min(minimum,overlap);
    }
    return {minimum,0,true};
  }
  if(!(amin<-EPS&&amax>EPS&&bmin<-EPS&&bmax>EPS))return {};
  V direction=cross(a.normal,b.normal);const double size=length(direction);if(size<1e-12)return {};direction=direction*(1/size);
  const auto slice=[&](const Triangle& t,const std::array<double,3>& distances){
    std::array<double,2> range{INFINITY,-INFINITY};
    const auto include=[&](V p){const double x=dot(p,direction);range[0]=std::min(range[0],x);range[1]=std::max(range[1],x);};
    for(size_t i=0;i<3;++i){const size_t j=(i+1)%3;
      if(std::abs(distances[i])<1e-12)include(t.p[i]);
      if(distances[i]*distances[j]<0)include(t.p[i]+(t.p[j]-t.p[i])*(distances[i]/(distances[i]-distances[j])));
    }return range;
  };
  const auto sa=slice(a,da),sb=slice(b,db);const double overlap=std::min(sa[1],sb[1])-std::max(sa[0],sb[0]);
  return overlap>EPS ? Crossing{overlap,std::min({-amin,amax,-bmin,bmax}),false} : Crossing{};
}
int failures=0;
void expect(bool value,const char* what){if(!value){std::printf("FAIL: %s\n",what);++failures;}}
void fixtures(){
  const Triangle a({V{-1,-1,0},V{1,-1,0},V{0,1,0}}),b({V{0,-.5,-1},V{0,-.5,1},V{0,.5,0}});
  const auto hit=intersect(a,b);expect(!hit.nearPlane&&std::abs(hit.length-1)<1e-12&&std::abs(hit.straddle-1)<1e-12,"independent perpendicular triangles cross for exactly one metre");
  Triangle far=b;for(auto& p:far.p)p.x+=3;expect(intersect(a,far).length==0,"separate coplanar line slices do not cross");
  const Triangle edge({V{-1,-1,0},V{1,-1,0},V{0,-1,1}});expect(intersect(a,edge).length==0,"a shared edge alone is not penetration");
  const Triangle vertex({V{0,1,0},V{0,2,-1},V{0,2,1}});expect(intersect(a,vertex).length==0,"a shared vertex alone is not penetration");
  const Triangle folded({V{0,1,0},V{.5,-.5,1},V{-.5,-.5,-1}});expect(intersect(a,folded).length>.5,"a shared vertex cannot hide a folded crossing");
  const Triangle flat({V{-.5,-.5,0},V{.5,-.5,0},V{0,.5,0}});expect(intersect(a,flat).nearPlane,"positive coplanar area is recorded separately");
  const Triangle flatEdge({V{-1,-1,0},V{1,-1,0},V{0,-2,0}});expect(intersect(a,flatEdge).length==0,"coplanar edge contact has zero interior overlap");
  const Triangle zero({V{0,0,0},V{0,0,0},V{0,0,0}});expect(intersect(a,zero).length==0,"degenerate source triangles are reported without false crossing");
  expect(std::abs(intersect(b,a).length-hit.length)<1e-12,"proper crossing is symmetric");
}
using Pairs=std::unordered_map<uint64_t,Crossing>;
struct Surface {
  std::vector<V> positions;std::vector<Triangle> triangles;std::vector<engine::Aabb> boxes;engine::Lbvh tree;
  void update(std::span<const V> points){
    triangles.clear();boxes.clear();triangles.reserve(points.size()/3);boxes.reserve(points.size()/3);
    for(size_t i=0;i+2<points.size();i+=3){
      triangles.emplace_back(std::array<V,3>{points[i],points[i+1],points[i+2]});
      engine::Aabb box{{INFINITY,INFINITY,INFINITY},{-INFINITY,-INFINITY,-INFINITY}};
      for(const V p:triangles.back().p){box.min.x=std::min(box.min.x,float(p.x-EPS));box.min.y=std::min(box.min.y,float(p.y-EPS));box.min.z=std::min(box.min.z,float(p.z-EPS));box.max.x=std::max(box.max.x,float(p.x+EPS));box.max.y=std::max(box.max.y,float(p.y+EPS));box.max.z=std::max(box.max.z,float(p.z+EPS));}
      boxes.push_back(box);
    }tree.build(boxes);
  }
  template<class Visit> void crossings(Visit&& visit)const{
    for(uint32_t i=0;i<triangles.size();++i)tree.overlap_primitives(boxes[i],[&](uint32_t j,const engine::Aabb&){
      if(j<=i)return;const auto hit=intersect(triangles[i],triangles[j]);if(hit.length>0)visit((uint64_t(i)<<32)|j,hit);
    });
  }
};
struct Finding {uint64_t pair{};double length{},straddle{};float tick{};bool nearPlane{},newPair{};};
struct Stats {
  uint32_t frames{},framesWithNew{},maximumNewPairs{},maximumWorsenedPairs{};uint64_t newPairSamples{},knownPairSamples{},nearPlaneSamples{};
  std::unordered_map<uint64_t,Finding> findings;
  void sample(const Surface& surface,const Pairs& baseline,float tick){
    uint32_t newCount=0,worsened=0;++frames;
    surface.crossings([&](uint64_t pair,Crossing hit){
      const auto old=baseline.find(pair);const bool fresh=old==baseline.end()||old->second.nearPlane!=hit.nearPlane;
      if(hit.nearPlane){++nearPlaneSamples;return;}
      if(fresh){++newCount;++newPairSamples;}else ++knownPairSamples;
      const bool worse=!fresh&&hit.straddle>old->second.straddle+EPS;
      if(worse)++worsened;
      if(fresh||worse){auto& f=findings[pair];if(hit.straddle>f.straddle)f={pair,hit.length,hit.straddle,tick,false,fresh};}
    });
    if(newCount)++framesWithNew;maximumNewPairs=std::max(maximumNewPairs,newCount);maximumWorsenedPairs=std::max(maximumWorsenedPairs,worsened);
  }
  void write(std::ostream& out)const{
    std::vector<Finding> sorted;for(const auto& [key,value]:findings)sorted.push_back(value);
    std::sort(sorted.begin(),sorted.end(),[](const Finding&a,const Finding&b){return a.straddle>b.straddle;});
    out<<"{\"frames\":"<<frames<<",\"framesWithNewCrossings\":"<<framesWithNew<<",\"maximumNewPairsInFrame\":"<<maximumNewPairs<<",\"maximumWorsenedBindPairsInFrame\":"<<maximumWorsenedPairs<<",\"newPairSamples\":"<<newPairSamples<<",\"knownPairSamples\":"<<knownPairSamples<<",\"nearPlaneSamples\":"<<nearPlaneSamples<<",\"distinctNewOrWorsenedPairs\":"<<findings.size()<<",\"worst\":[";
    for(size_t i=0;i<std::min<size_t>(sorted.size(),reportLimit);++i){const auto& f=sorted[i];if(i)out<<',';out<<"{\"triangles\":["<<(f.pair>>32)<<','<<uint32_t(f.pair)<<"],\"tick\":"<<f.tick<<",\"crossingLengthMetres\":"<<f.length<<",\"minimumPlaneStraddleMetres\":"<<f.straddle<<",\"newPair\":"<<(f.newPair?"true":"false")<<'}';}out<<"]}";
  }
};
struct Influence {std::array<uint32_t,8> joints;std::array<float,8> weights;engine::Vec3 bind;};
void audit(const engine::asset::Pack& pack,std::ostream& out,bool transitions,const std::string& selected,std::span<const std::byte> animationOverride,bool strict,uint32_t substeps,std::span<const std::byte> modelOverride={},std::span<const std::byte> skinOverride={}){
  const auto entry=[&](const std::string& name)->std::span<const std::byte>{
    if(!animationOverride.empty()&&name=="monster-animation/"+selected)return animationOverride;
    if(!modelOverride.empty()&&name=="monster/"+selected)return modelOverride;
    if(!skinOverride.empty()&&name=="monster-skin/"+selected)return skinOverride;
    for(const auto& e:pack.entries())if(e.name==name)return e.bytes;return {};
  };
  const char* names[]{"river-boa","living-tsunami","timbermaw-larva","sky-ruin-drake","roil-elemental"};const char* clips[]{"idle","move","attack","hit","death","shockwave","charge","shard_rain","sweep"};
  out<<std::setprecision(12)<<"{\"scope\":\"real runtime triangles; new and worsened crossings relative to unchanged bind surface\",\"transitionPolicy\":\""<<(terminalDeath?"terminal-death":"all-ordered")<<"\",\"samplingHz\":"<<60*substeps<<",\"toleranceMetres\":"<<EPS<<",\"models\":[";
  bool firstModel=true;
  for(size_t kind=0;kind<5;++kind){
    const std::string name=names[kind];if(!selected.empty()&&selected!=name)continue;
    auto model=engine::ModelMesh::decode(entry("monster/"+name));auto skin=engine::ModelSkin::decode(entry("monster/"+name),entry("monster-skin/"+name));auto animation=game::CreatureAnimation::decode(entry("monster-animation/"+name));
    expect(model&&skin&&animation,"production model, skin and animation decode");if(!model||!skin||!animation)return;
    expect(skin->bone_count==animation->bone_count(),"candidate skin and animation have the same actual skeleton");if(skin->bone_count!=animation->bone_count())return;
    std::vector<Influence> influences;Surface surface;influences.reserve(model->vertices.size());surface.positions.resize(model->vertices.size());
    for(size_t v=0;v<model->vertices.size();++v){const auto& p=model->vertices[v].position;const auto& w=skin->vertices[v];Influence influence;influence.bind={p[0],p[1],p[2]};
      for(size_t k=0;k<4;++k){influence.joints[k]=static_cast<uint32_t>(w.joints0[k]);influence.joints[k+4]=static_cast<uint32_t>(w.joints1[k]);influence.weights[k]=w.weights0[k];influence.weights[k+4]=w.weights1[k];}
      influences.push_back(influence);surface.positions[v]={p[0],p[1],p[2]};
    }
    surface.update(surface.positions);Pairs baseline;surface.crossings([&](uint64_t pair,Crossing hit){baseline[pair]=hit;});size_t proper=0,near=0,degenerate=0;for(const auto& [pair,hit]:baseline){if(hit.nearPlane)++near;else ++proper;}for(const auto& tri:surface.triangles)degenerate+=!tri.valid;
    if(!firstModel)out<<',';firstModel=false;out<<"{\"name\":\""<<name<<"\",\"triangles\":"<<surface.triangles.size()<<",\"bindProperCrossings\":"<<proper<<",\"bindNearPlaneOverlaps\":"<<near<<",\"bindDegenerateTriangles\":"<<degenerate<<",\"bindCrossingPairs\":[";
    bool firstBind=true;for(const auto& [pair,hit]:baseline)if(!hit.nearPlane){if(!firstBind)out<<',';firstBind=false;out<<'['<<(pair>>32)<<','<<uint32_t(pair)<<']';}out<<"],\"clips\":[";
    std::vector<engine::SkinTransform> palette(animation->bone_count()),from(animation->bone_count());
    const auto deform=[&](std::span<const engine::SkinTransform> poses,float mix=1.0f){
      for(size_t v=0;v<influences.size();++v){const auto& i=influences[v];auto p=engine::dual_quaternion_point(poses,i.joints,i.weights,i.bind);
        if(mix<1)p=p*mix+engine::dual_quaternion_point(from,i.joints,i.weights,i.bind)*(1-mix);
        surface.positions[v]={p.x,p.y,p.z};
      }surface.update(surface.positions);
    };
    for(uint32_t c=0;c<animation->clip_count();++c){
      const auto clip=static_cast<game::CreatureAnimation::Clip>(c);const auto& track=animation->track(clip);Stats stats;
      const auto start=std::chrono::steady_clock::now();
      for(uint32_t sample=0;sample<=(track.frames-1)*substeps;++sample){const float tick=float(sample)/float(substeps);animation->sample(clip,tick,palette);deform(palette);stats.sample(surface,baseline,tick);}
      if(strict)expect(stats.newPairSamples==0,"selected authored clip has no new proper surface crossings");
      if(c)out<<',';out<<"{\"name\":\""<<clips[c]<<"\",\"stats\":";stats.write(out);out<<'}';out.flush();
      const double seconds=std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();
      std::printf("SURFACE %s/%s: %u frames, %u with new crossings, %zu new/worsened pairs, %.2fs\n",names[kind],clips[c],stats.frames,stats.framesWithNew,stats.findings.size(),seconds);std::fflush(stdout);
    }out<<"],\"transitions\":[";
    if(transitions){bool first=true;
      for(uint32_t a=0;a<animation->clip_count();++a)for(uint32_t b=0;b<animation->clip_count();++b){if(a==b||(terminalDeath&&a==game::CreatureAnimation::death))continue;
        const auto source=static_cast<game::CreatureAnimation::Clip>(a),target=static_cast<game::CreatureAnimation::Clip>(b);const auto& track=animation->track(source);
        std::vector<uint32_t> starts{0,(track.frames-1)/2,track.frames-1};if(track.impact!=UINT32_MAX){starts.push_back(track.impact);starts.push_back(track.recovery);}std::sort(starts.begin(),starts.end());starts.erase(std::unique(starts.begin(),starts.end()),starts.end());
        for(uint32_t start:starts){animation->sample(source,float(start),from);Stats stats;
          for(uint32_t tick=1;tick<8;++tick){animation->sample(target,float(tick),palette);deform(palette,float(tick)/8);stats.sample(surface,baseline,tick);}
          if(strict)expect(stats.newPairSamples==0,"selected transition has no new proper surface crossings");
          if(!first)out<<',';first=false;out<<"{\"from\":\""<<clips[a]<<"\",\"fromTick\":"<<start<<",\"to\":\""<<clips[b]<<"\",\"stats\":";stats.write(out);out<<'}';
        }
      }
    }out<<"]}";out.flush();
  }out<<"]}";
}
} // namespace
int main(int argc,char** argv){
  fixtures();if(failures)return 1;if(argc==2&&std::string(argv[1])=="--fixtures"){std::printf("surface geometry fixtures: ok\n");return 0;}
  if(argc<3){std::fprintf(stderr,"Usage: act1_surface_probe <production pack> <report.json> [--transitions] [--substeps <1..16>] [--model <name>] [--animation <candidate.anim> | --runtime-folder <candidate folder>] [--require-no-new-crossings]\n");return 2;}
  bool transitions=false,strict=false;uint32_t substeps=1;std::string selected,animationPath,runtimeFolder;
  for(int i=3;i<argc;++i){const std::string option=argv[i];
    if(option=="--transitions")transitions=true;
    else if(option=="--require-no-new-crossings")strict=true;
    else if(option=="--terminal-death")terminalDeath=true;
    else if(option=="--pair-limit"&&i+1<argc){char* end;const auto value=std::strtoul(argv[++i],&end,10);if(*end||value<1||value>20000)return 2;reportLimit=static_cast<uint32_t>(value);}
    else if(option=="--substeps"&&i+1<argc){char* end;const auto value=std::strtoul(argv[++i],&end,10);if(*end||value<1||value>16)return 2;substeps=static_cast<uint32_t>(value);}
    else if(option=="--model"&&i+1<argc)selected=argv[++i];
    else if(option=="--runtime-folder"&&i+1<argc)runtimeFolder=argv[++i];
    else if(option=="--animation"&&i+1<argc)animationPath=argv[++i];else return 2;
  }
  if(!selected.empty()&&selected!="river-boa"&&selected!="living-tsunami"&&selected!="timbermaw-larva"&&selected!="sky-ruin-drake"&&selected!="roil-elemental")return 2;
  std::vector<std::byte> overrideBytes,modelOverride,skinOverride;
  const auto read=[](const std::string& path,std::vector<std::byte>& target){std::ifstream stream(path,std::ios::binary|std::ios::ate);if(!stream)return false;const auto count=stream.tellg();if(count<=0)return false;stream.seekg(0);target.resize(static_cast<size_t>(count));stream.read(reinterpret_cast<char*>(target.data()),count);return stream.good();};
  if(!animationPath.empty()){if(selected.empty()||!runtimeFolder.empty()||!read(animationPath,overrideBytes))return 2;}
  if(!runtimeFolder.empty()){
    if(selected.empty()||!read(runtimeFolder+"/"+selected+".zkmodel",modelOverride)||!read(runtimeFolder+"/"+selected+".skin",skinOverride)||!read(runtimeFolder+"/"+selected+".anim",overrideBytes))return 2;
  }
  std::ifstream input(argv[1],std::ios::binary|std::ios::ate);if(!input)return 2;const auto size=input.tellg();input.seekg(0);std::vector<std::byte> bytes(static_cast<size_t>(size));input.read(reinterpret_cast<char*>(bytes.data()),size);if(!input)return 2;
  auto pack=engine::asset::Pack::parse(bytes);if(!pack)return 2;std::ofstream output(argv[2]);if(!output)return 2;
  audit(*pack,output,transitions,selected,overrideBytes,strict,substeps,modelOverride,skinOverride);return failures?1:0;
}
