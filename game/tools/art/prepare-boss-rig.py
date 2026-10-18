"""Export the frozen drake source's rest skin and physical anatomical rig.

Blender 3.6 --background --factory-startup --disable-autoexec
--python-exit-code 1 --python game/tools/art/prepare-boss-rig.py
Only boss_bind.zkmodel/boss.skin/boss.rig/boss-rig.json and the generated
simulation header are written. Existing living poses and PBR maps are preserved.
"""
import bpy, math, os, json, struct, hashlib, sys
import numpy as np
from mathutils import Matrix, Vector

repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
root=os.path.join(repo,'game/gameplay/content/creatures/high-detail')
source=os.path.join(root,'boss-prepared.blend')
destination=os.path.join(repo,'build/boss-rig-candidate') if '--candidate' in sys.argv else root
os.makedirs(destination,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=source)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
model=next(o for o in bpy.data.objects if o.type=='MESH')
bone_names=[b.name for b in rig.data.bones]
assert len(bone_names)==20
original=open(os.path.join(root,'boss_walk_00.zkmodel'),'rb').read()
magic,nv,ni,flags=struct.unpack_from('<4sIII',original)
assert magic==b'ZKMD'
runtime=np.frombuffer(original,dtype='<f4',offset=16,count=nv*9).reshape((nv,9))
original_indices=np.frombuffer(original,dtype='<u4',offset=16+nv*36,count=ni)
rotation=Matrix(((-1,0,0),(0,0,1),(0,1,0)))

def evaluated():
 active=model.evaluated_get(bpy.context.evaluated_depsgraph_get())
 mesh=active.to_mesh();mesh.calc_loop_triangles();mesh.calc_normals_split()
 return active,mesh

# The prepared source is saved at walk sample zero. Recover its exact split
# vertex slots rather than inventing a new order for the skin collaborator.
active,mesh=evaluated();records=[];indices=[];lookup={};uv=mesh.uv_layers['RuntimeAtlas']
for triangle in mesh.loop_triangles:
 for loop_id in triangle.loops:
  loop=mesh.loops[loop_id];tex=uv.data[loop_id].uv
  key=(loop.vertex_index,round(tex.x,7),round(tex.y,7),*(round(v,6) for v in loop.normal))
  if key not in lookup:lookup[key]=len(records);records.append((loop.vertex_index,loop_id))
  indices.append(lookup[key])
assert len(records)==nv and np.array_equal(np.array(indices,dtype=np.uint32),original_indices)
walk_points=np.array([tuple(rotation@(active.matrix_world@mesh.vertices[v].co)) for v,_ in records])
walk_normals=np.array([tuple(rotation@(active.matrix_world.to_3x3().inverted().transposed()@mesh.loops[l].normal).normalized()) for _,l in records])
centered=walk_points-walk_points.mean(axis=0)
scale=float(np.sum(centered*(runtime[:,:3]-runtime[:,:3].mean(axis=0)))/np.sum(centered*centered))
offset=scale*walk_points.mean(axis=0)-runtime[:,:3].mean(axis=0)
assert np.max(np.abs(scale*walk_points-offset-runtime[:,:3]))<2e-5
assert np.max(np.abs(walk_normals-runtime[:,3:6]))<2e-5
for slot,(_,loop) in enumerate(records):
 assert abs(uv.data[loop].uv.x-runtime[slot,6])<1e-6 and abs(1-uv.data[loop].uv.y-runtime[slot,7])<1e-6
active.to_mesh_clear()

if rig.animation_data:
 rig.animation_data.action=None
 for track in rig.animation_data.nla_tracks:track.mute=True
for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update()
active,mesh=evaluated();normal_matrix=active.matrix_world.to_3x3().inverted().transposed()
bind=runtime.copy()
for slot,(vertex,loop) in enumerate(records):
 bind[slot,:3]=np.array(rotation@(active.matrix_world@mesh.vertices[vertex].co))*scale-offset
 bind[slot,3:6]=tuple((rotation@(normal_matrix@mesh.loops[loop].normal)).normalized())
active.to_mesh_clear()

def atomic(path,data):
 temporary=path+'.tmp'
 with open(temporary,'wb') as stream:stream.write(data)
 os.replace(temporary,path)

bind_bytes=struct.pack('<4sIII',b'ZKMD',nv,ni,flags)+bind.astype('<f4').tobytes()+original_indices.tobytes()
atomic(os.path.join(destination,'boss_bind.zkmodel'),bind_bytes)

# The producer already fitted the anatomical bones and solved heat weights on
# the original-welded connected surface. Preserve that source skin verbatim.
group_to_bone={model.vertex_groups[name].index:i for i,name in enumerate(bone_names)}
full=np.zeros((nv,len(bone_names)))
for slot,(vertex,_) in enumerate(records):
 for item in model.data.vertices[vertex].groups:
  if item.group in group_to_bone:full[slot,group_to_bone[item.group]]=item.weight
 assert full[slot].sum()>1e-8
 full[slot]/=full[slot].sum()
order=np.argsort(-full,axis=1,kind='stable')
selected=order[:,:8];selected_weights=np.take_along_axis(full,selected,axis=1)
retained=selected_weights.sum(axis=1);selected_weights/=retained[:,None]
skin=bytearray(struct.pack('<4sIII',b'ZKSK',1,nv,len(bone_names)))
for bones,weights in zip(selected,selected_weights):skin.extend(struct.pack('<8I8f',*bones,*weights))
atomic(os.path.join(destination,'boss.skin'),skin)

sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from boss_contact_recipe import contacts

def physics(name):
 if name=='Body':return 18,.48,math.pi,-math.pi,math.pi
 if name=='Neck':return 5,.28,math.radians(45),math.radians(-35),math.radians(35)
 if name=='Head':return 4,.38,math.radians(40),math.radians(-35),math.radians(35)
 if name.startswith('Tail'):
  step=int(name[-1]);return 2/(step**.7),.22/(step**.45),math.radians(35),math.radians(-30),math.radians(30)
 if name.startswith('WingTip'):return .65,.09,math.radians(75),math.radians(-45),math.radians(45)
 if name.startswith('Wing'):return 2,.13,math.radians(65),math.radians(-40),math.radians(40)
 if 'Foot' in name:return .8,.12,math.radians(70),math.radians(-35),math.radians(35)
 return 2.5,.17,math.radians(75),math.radians(-35),math.radians(35)

rig_records=[];rig_bytes=bytearray(struct.pack('<4sIII',b'ZKRG',1,len(bone_names),112))
for bone in rig.data.bones:
 world=rig.matrix_world@bone.matrix_local
 basis=rotation@world.to_3x3()
 basis.normalize()
 head=np.array(rotation@(rig.matrix_world@bone.head_local))*scale-offset
 tail=np.array(rotation@(rig.matrix_world@bone.tail_local))*scale-offset
 rest=basis.to_4x4();rest.translation=Vector(head)
 inverse=rest.inverted();column=[inverse[row][col] for col in range(4) for row in range(4)]
 parent=bone_names.index(bone.parent.name) if bone.parent else -1
 mass,radius,swing,twist_min,twist_max=physics(bone.name)
 record={'name':bone.name,'parent':parent,'head':head.tolist(),'tail':tail.tolist(),'inverse_bind':column,
         'mass':mass,'radius':radius*scale,'swing_limit':swing,'twist_min':twist_min,'twist_max':twist_max}
 rig_records.append(record)
 rig_bytes.extend(struct.pack('<i27f',parent,*head,*tail,*column,mass,radius*scale,swing,twist_min,twist_max))
atomic(os.path.join(destination,'boss.rig'),rig_bytes)
contact_slots,contact_radii,contact_coverage=contacts(bind[:,:3],selected,selected_weights,rig_records)
contact_bytes=b''.join(struct.pack('<3f8I9f',*bind[slot,:3],*selected[slot],*selected_weights[slot],radius)
                       for slot,radius in zip(contact_slots,contact_radii))

sha=lambda data:hashlib.sha256(data).hexdigest()
stats={'source':'boss-prepared.blend','source_sha256':sha(open(source,'rb').read()),'canonical_transform':'(-x,z,+y)',
       'bind_sha256':sha(bind_bytes),'source_geometry_sha256':sha(bind_bytes),'skin_sha256':sha(skin),'rig_sha256':sha(rig_bytes),'vertex_count':nv,'bone_count':len(bone_names),
       'scale':scale,'origin_game_offset':offset.tolist(),'influences':8,'binding':'original-weld-before-decimation; asymmetric fitted bone-heat skin',
       'contact_count':len(contact_slots),'contact_vertex_slots':contact_slots,'contact_radii':contact_radii,'contact_coverage':contact_coverage,
       'contacts_sha256':sha(contact_bytes),
       'discarded_weight':{str(n):{'maximum':float(np.max(1-np.take_along_axis(full,order[:,:n],axis=1).sum(axis=1))),
                                      'p99':float(np.quantile(1-np.take_along_axis(full,order[:,:n],axis=1).sum(axis=1),.99))} for n in [4,8]},
       'bones':rig_records}
atomic(os.path.join(destination,'boss-rig.json'),json.dumps(stats,indent=2).encode())

def f(value):return ('%.9g'%value)+('f' if '.' in ('%.9g'%value) or 'e' in ('%.9g'%value) else '.0f')
def vec(values):return '{'+', '.join(map(f,values))+'}'
header=['#pragma once','#include <array>','#include "engine/physics/ragdoll.hpp"',
        '// Generated by tools/art/prepare-boss-rig.py; continuous eight-influence skin.',
        '// Source SHA256 '+stats['source_sha256'],'// Bind SHA256 '+stats['bind_sha256'],'// Skin SHA256 '+stats['skin_sha256'],
        'namespace game {',
        'inline constexpr char BOSS_BIND_SHA256[] = "'+stats['bind_sha256']+'";',
        'inline constexpr char BOSS_SKIN_SHA256[] = "'+stats['skin_sha256']+'";',
        'inline constexpr char BOSS_RIG_SHA256[] = "'+stats['rig_sha256']+'";',
        'inline constexpr char BOSS_CONTACTS_SHA256[] = "'+stats['contacts_sha256']+'";',
        'inline constexpr std::array<engine::RagdollBone, 20> BOSS_RIG{{']
for bone in rig_records:
 header.append('  // '+bone['name'])
 header.append('  {.parent = %d, .head = %s, .tail = %s, .inverse_bind = {.m = %s}, .mass = %s, .radius = %s, .swing_limit = %s, .twist_min = %s, .twist_max = %s},'%
               (bone['parent'],vec(bone['head']),vec(bone['tail']),vec(bone['inverse_bind']),f(bone['mass']),f(bone['radius']),f(bone['swing_limit']),f(bone['twist_min']),f(bone['twist_max'])))
header.extend(['}};','inline constexpr std::array<engine::RagdollContact, %d> BOSS_CONTACTS{{'%len(contact_slots)])
for slot,radius in zip(contact_slots,contact_radii):
 header.append('  {.position = %s, .bones = {%s}, .weights = %s, .radius = %s}, // bind vertex %d'%
               (vec(bind[slot,:3]),', '.join(str(int(i))+'u' for i in selected[slot]),vec(selected_weights[slot]),f(radius),slot))
header.extend(['}};','} // namespace game',''])
header_path=os.path.join(destination,'boss_rig_data.hpp') if '--candidate' in sys.argv else os.path.join(repo,'game/gameplay/domain/boss_rig_data.hpp')
atomic(header_path,'\n'.join(header).encode())
print('BOSS-RIG-EXPORT',json.dumps({k:v for k,v in stats.items() if k not in ['bones','contact_vertex_slots','contact_radii']}),flush=True)
