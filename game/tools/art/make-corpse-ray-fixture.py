"""Independent Blender ray oracle for the actual Roil corpse surface.
This is a reviewed fixture authoring tool, never run by build/test to rewrite
expected answers. Snapshot comes from the public shot/reload simulation path.
"""
import bpy,json,os,math,hashlib
from mathutils import Matrix,Vector
from mathutils.bvhtree import BVHTree
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));out=repo+'/build/act1-corpse';runtime=repo+'/game/gameplay/content/creatures/act1/runtime/'
# Reviewed public scenario, fixed independently of native collision results.
snapshot=json.load(open(repo+'/game/tests/fixtures/roil-corpse-rays.json',encoding='utf-8'))['snapshot']
source=repo+'/game/art-work/act1/rigging/roil-elemental/ground-rig.blend';bpy.ops.wm.open_mainfile(filepath=source)
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');model=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('runtime_bind'))
C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)));yaw=snapshot['yaw'];c=math.cos(yaw);s=math.sin(yaw)
world=Matrix(((c,0,-s,snapshot['position'][0]),(0,1,0,snapshot['position'][1]),(s,0,c,snapshot['position'][2]),(0,0,0,1)));eye=Vector(snapshot['eye']);local_eye=world.inverted()@eye
results=[]
for age in [0,6,30,90,120]:
 rig.animation_data.action=bpy.data.actions['death'];bpy.context.scene.frame_set(age);bpy.context.view_layer.update();evaluated=model.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();mesh.calc_loop_triangles();points=[C@evaluated.matrix_world@v.co for v in mesh.vertices];triangles=[tuple(t.vertices) for t in mesh.loop_triangles];evaluated.to_mesh_clear()
 if age<8:
  rig.animation_data.action=bpy.data.actions['move'];bpy.context.scene.frame_set(snapshot['deathTick']%60);bpy.context.view_layer.update();evaluated=model.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();previous=[C@evaluated.matrix_world@v.co for v in mesh.vertices];evaluated.to_mesh_clear();points=[a.lerp(b,age/8) for a,b in zip(previous,points)]
 tree=BVHTree.FromPolygons(points,triangles,all_triangles=True);candidates=[]
 for ix in range(-20,21):
  for iy in range(2,48):
   target=Vector((ix*.2,iy*.1,0));direction=(target-local_eye).normalized();origin=local_eye.copy();distance_base=0.;hit=None
   for attempt in range(32):
    p,n,index,d=tree.ray_cast(origin,direction,100-distance_base)
    if p is None:break
    if n.dot(direction)<-1e-5:hit=(distance_base+d,index);break
    distance_base+=d+1e-5;origin=p+direction*1e-5
   target_world=world@target;wd=(target_world-eye).normalized();lo=0.;hi=100.
   for axis in range(3):
    minimum=snapshot['position'][axis]-(0 if axis==1 else 2.2);maximum=snapshot['position'][axis]+(4.84 if axis==1 else 2.2)
    if abs(wd[axis])<1e-12:
     if eye[axis]<minimum or eye[axis]>maximum:hi=-1
    else:
     a=(minimum-eye[axis])/wd[axis];b=(maximum-eye[axis])/wd[axis];lo=max(lo,min(a,b));hi=min(hi,max(a,b))
   box_hit=lo<=hi;kind='empty_inside_old_box' if box_hit and hit is None else 'visible_outside_old_box' if not box_hit and hit else 'visible_surface' if hit else None
   if kind:candidates.append({'kind':kind,'modelTarget':list(target),'worldTarget':list(target_world),'worldRay':list(wd),'hit':hit is not None,'distance':hit[0] if hit else None,'legacyBoxHit':box_hit,'score':abs(ix)+abs(iy-24)})
 chosen=[]
 for kind in ['empty_inside_old_box','visible_outside_old_box','visible_surface']:
  group=sorted([x for x in candidates if x['kind']==kind],key=lambda x:x['score'])
  if group:chosen.append({k:v for k,v in group[0].items() if k!='score'})
 if not any(x['kind']=='empty_inside_old_box' for x in chosen) or not any(x['hit'] for x in chosen):raise RuntimeError('oracle lacks independent solid/empty rays')
 results.append({'deathAge':age,'rays':chosen});print('ORACLE',age,[(x['kind'],x['distance']) for x in chosen],flush=True)
sources={ext:hashlib.sha256(open(runtime+'roil-elemental.'+ext,'rb').read()).hexdigest() for ext in ['zkmodel','skin','anim']}
fixture=repo+'/game/tests/fixtures/roil-corpse-rays.json';os.makedirs(os.path.dirname(fixture),exist_ok=True)
json.dump({'oracle':'Blender evaluated armature skin + Blender BVHTree front-face ray casting; independent of native triangle/World ray implementation','sourceSha256':sources,'snapshot':snapshot,'transition':{'sourceClip':'move','sourceTick':0,'destinationClip':'death','startTick':snapshot['deathTick'],'durationTicks':8,'sourceYaw':snapshot['yaw'],'note':'Explicit two-pose oracle input; actual World interruptions retain their own pre-impact pose mixture.'},'poses':results},open(fixture,'w'),indent=2)
def vec(value):return '{'+','.join(f'{x:.9f}f' for x in value)+'}'
lines=[]
for pose in results:
 for ray in pose['rays']:lines.append('  {'+str(pose['deathAge'])+','+str(ray['hit']).lower()+','+f"{(ray['distance'] or 0):.9f}f,"+vec(ray['worldRay'])+','+vec(ray['worldTarget'])+','+str(ray['legacyBoxHit']).lower()+'},')
header='''// Independent Blender fixture. Do not regenerate from native collision output.
#pragma once
#include <array>
#include "engine/foundation/math.hpp"
namespace corpse_fixture {
struct Ray { unsigned age;bool hit;float distance;engine::Vec3 direction,target;bool legacy_box_hit; };
'''
header+='inline constexpr engine::Vec3 POSITION='+vec(snapshot['position'])+', EYE='+vec(snapshot['eye'])+';\n'
header+=f"inline constexpr float YAW={snapshot['yaw']:.9f}f;\ninline constexpr unsigned DEATH_TICK={snapshot['deathTick']};\n"
header+='inline constexpr std::array<Ray,'+str(len(lines))+'> RAYS{{\n'+'\n'.join(lines)+'\n}};\n}\n'
open(repo+'/game/tests/fixtures/roil-corpse-rays.hpp','w',encoding='utf-8').write(header)
