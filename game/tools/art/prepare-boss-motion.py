"""Export only 16 living poses; frozen bind/skin/rig/contact/PBR never change.

Reproduce the connected source with high-detail/prepare.py -- boss --keep-maps,
then prepare-boss-rig.py, then this motion pass. Existing generated skin data is
an immutable input to this pass, including its canonical scale and origin.
"""
import bpy, os, sys, struct, json, hashlib, math
from mathutils import Matrix, Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from boss_motion_recipe import apply_pose

repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
root=os.path.join(repo,'game/gameplay/content/creatures/high-detail')
source=os.path.join(root,'boss-prepared.blend')
if not os.path.exists(source):source=os.path.join(repo,'game/art-src/creature-research/boss-prepared.blend')
metadata=json.load(open(os.path.join(root,'boss-rig.json')))
immutable=['boss_bind.zkmodel','boss.skin','boss.rig','boss-rig.json','boss.jpg','boss.nar.jpg','boss.metal.jpg']
sha=lambda path:hashlib.sha256(open(path,'rb').read()).hexdigest()
before={name:sha(os.path.join(root,name)) for name in immutable}
assert sha(source)==metadata['source_sha256']
bpy.ops.wm.open_mainfile(filepath=source)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
obj=next(o for o in bpy.data.objects if o.type=='MESH')
if rig.animation_data:
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=True
rotation=Matrix(((-1,0,0),(0,0,1),(0,1,0)))
scale=metadata['scale'];offset=Vector(metadata['origin_game_offset'])
def evaluated():
    bpy.context.view_layer.update()
    active=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=active.to_mesh();mesh.calc_loop_triangles();mesh.calc_normals_split()
    return active,mesh
# Recover split slots from the preserved prepared source, not from a newly
# triangulated animated quad. This is the same ordering used by the skin pass.
active,mesh=evaluated();records=[];indices=[];lookup={};uv=mesh.uv_layers['RuntimeAtlas']
for triangle in mesh.loop_triangles:
    for loop_id in triangle.loops:
        loop=mesh.loops[loop_id];tex=uv.data[loop_id].uv
        key=(loop.vertex_index,round(tex.x,7),round(tex.y,7),*(round(v,6) for v in loop.normal))
        if key not in lookup:lookup[key]=len(records);records.append((loop.vertex_index,loop_id,tex.copy()))
        indices.append(lookup[key])
active.to_mesh_clear()
bind=open(os.path.join(root,'boss_bind.zkmodel'),'rb').read();_,nv,ni,_=struct.unpack_from('<4sIII',bind)
assert nv==len(records) and ni==len(indices)
assert struct.pack('<%dI'%ni,*indices)==bind[16+nv*36:]
for slot,(_,_,tex) in enumerate(records):
    assert abs(tex.x-struct.unpack_from('<f',bind,16+slot*36+24)[0])<1e-6
    assert abs(1-tex.y-struct.unpack_from('<f',bind,16+slot*36+28)[0])<1e-6
result=[];max_height=0;max_radius=0
for clip in ['walk','attack']:
    for frame in range(8):
        apply_pose(rig,clip,frame/(8 if clip=='walk' else 7))
        active,mesh=evaluated();normal_matrix=rotation@active.matrix_world.to_3x3().inverted().transposed()
        points=[rotation@(active.matrix_world@v.co)*scale-offset for v in mesh.vertices]
        low=min(v.y for v in points)
        # Root motion is owned by World. Preserve fixed physical size and ground
        # each standing sample without changing the corpse's original bind.
        points=[p-Vector((0,low,0)) for p in points]
        data=bytearray(struct.pack('<4sIII',b'ZKMD',nv,ni,1))
        for slot,(vertex,loop,tex) in enumerate(records):
            normal=normal_matrix@mesh.loops[loop].normal
            if normal.length_squared<1e-12:raise RuntimeError('zero live normal')
            normal.normalize();p=points[vertex]
            data.extend(struct.pack('<9f',*p,*normal,tex.x,1-tex.y,3))
        data.extend(bind[16+nv*36:]);active.to_mesh_clear()
        name='boss_%s_%02d.zkmodel'%(clip,frame);path=os.path.join(root,name)
        with open(path+'.tmp','wb') as stream:stream.write(data)
        os.replace(path+'.tmp',path)
        height=max(p.y for p in points);radius=max(math.hypot(p.x,p.z) for p in points)
        max_height=max(max_height,height);max_radius=max(max_radius,radius)
        tips={name:list(rotation@(rig.matrix_world@rig.pose.bones[name].tail)*scale-offset-Vector((0,low,0))) for name in ['Head','WingTip.L','WingTip.R','FrontFoot.L','Tail5']}
        result.append({'file':name,'sha256':hashlib.sha256(data).hexdigest(),'maximum_height':height,'maximum_xz_radius':radius,'bone_tips':tips})
        print('BOSS-MOTION',name,'height',height,'radius',radius,flush=True)
assert before=={name:sha(os.path.join(root,name)) for name in immutable},'immutable ragdoll/PBR inputs changed'
manifest={'vertices':nv,'triangles':ni//3,'walk_frames':8,'attack_frames':8,'death_frames':0,'cycle_ticks':120,'maximum_height':max_height,'maximum_xz_radius':max_radius,'frozen_inputs':before,'source_sha256':sha(source),'clip_contract':'windup0..3; active3..5; recover5..7','poses':result}
with open(os.path.join(root,'boss-motion.json'),'w') as stream:json.dump(manifest,stream,indent=2)
print('BOSS-MOTION-SUMMARY',json.dumps({k:manifest[k] for k in ['vertices','triangles','maximum_height','maximum_xz_radius']}),flush=True)
