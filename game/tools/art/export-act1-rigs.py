"""Bake actual Blender armature Actions to the existing eight-weight DQS path.
No geometry reduction or generated motion is performed here. All source loops,
UVs and PBR images survive; .rig keeps hierarchy and inverse bind for review.
"""
import bpy,os,json,math,struct,hashlib,sys
from mathutils import Matrix,Vector,Quaternion
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));base=repo+'/game/art-work/act1/rigging';out=repo+'/game/gameplay/content/creatures/act1/runtime';os.makedirs(out,exist_ok=True)
names=['river-boa','living-tsunami','timbermaw-larva','sky-ruin-drake','roil-elemental']
if '--rig-dir' in sys.argv:base=os.path.abspath(sys.argv[sys.argv.index('--rig-dir')+1])
if '--output-dir' in sys.argv:out=os.path.abspath(sys.argv[sys.argv.index('--output-dir')+1]);os.makedirs(out,exist_ok=True)
selected=sys.argv[sys.argv.index('--model')+1] if '--model' in sys.argv else None
if selected is not None and selected not in names:raise ValueError('unknown act1 creature: '+selected)
C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)));Ci=C.inverted()
def sha(path):return hashlib.sha256(open(path,'rb').read()).hexdigest()
def dq(matrix):
 if abs(matrix.determinant()-1)>1e-4 or any(abs(v-1)>1e-4 for v in matrix.to_scale()):raise RuntimeError('nonrigid transform cannot be silently baked into DQS')
 q=matrix.to_quaternion().normalized();t=matrix.translation;d=Quaternion((0,t.x,t.y,t.z))@q
 return [q.x,q.y,q.z,q.w,d.x*.5,d.y*.5,d.z*.5,d.w*.5]
records=[]
for layer,name in enumerate(names):
 if selected is not None and name!=selected:continue
 source=base+'/'+name+'/ground-rig.blend';bpy.ops.wm.open_mainfile(filepath=source)
 if not bpy.context.scene.objects:raise RuntimeError(name+': missing contact-solved DCC source')
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');model=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('runtime_bind'))
 if not rig.get('contact_method') or rig.get('contact_source_sha256')!=sha(base+'/'+name+'/control-rig.blend'):raise RuntimeError(name+': contact solve is missing or belongs to stale authored rig data')
 bones=list(rig.data.bones);lookup={b.name:i for i,b in enumerate(bones)};groups={g.index:g.name for g in model.vertex_groups}
 weights={};max_loss=0
 for v in model.data.vertices:
  influences=sorted([(lookup[groups[g.group]],g.weight) for g in v.groups if groups.get(g.group) in lookup and g.weight>0],key=lambda x:-x[1]);total=sum(w for _,w in influences)
  if total<1e-8:raise RuntimeError(name+': unweighted original vertex '+str(v.index))
  kept=influences[:8];s=sum(w for _,w in kept);max_loss=max(max_loss,(total-s)/total)
  weights[v.index]=[(i,w/s) for i,w in kept]+[(0,0)]*(8-len(kept))
 if max_loss>.01:raise RuntimeError(name+': eight-weight reduction loses more than 1% influence')
 rig.animation_data.action=None;bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
 mesh=model.data;mesh.calc_loop_triangles();mesh.calc_normals_split();uv=mesh.uv_layers.active
 if not uv:raise RuntimeError(name+': missing source UV')
 verts=[];skins=[]
 for tri in mesh.loop_triangles:
  for li in tri.loops:
   loop=mesh.loops[li];p=C@model.matrix_world@mesh.vertices[loop.vertex_index].co;n=(C@model.matrix_world).to_3x3()@loop.normal;n.normalize();tex=uv.data[li].uv
   verts.extend([*p,*n,tex.x,1-tex.y,float(layer)]);skins.append(weights[loop.vertex_index])
 count=len(skins)
 model_path=out+'/'+name+'.zkmodel';skin_path=out+'/'+name+'.skin';anim_path=out+'/'+name+'.anim';rig_path=out+'/'+name+'.rig'
 with open(model_path,'wb') as f:
  f.write(struct.pack('<4sIII',b'ZKMD',count,count,0));f.write(struct.pack('<'+'f'*len(verts),*verts));f.write(struct.pack('<'+'I'*count,*range(count)))
 with open(skin_path,'wb') as f:
  f.write(struct.pack('<4sIII',b'ZKSK',1,count,len(bones)))
  for influence in skins:f.write(struct.pack('<8I8f',*[i for i,w in influence],*[w for i,w in influence]))
 root=next(b for b in bones if b.parent is None);rest={b.name:b.matrix_local.inverted() for b in bones}
 hierarchy=[{'name':b.name,'parent':lookup[b.parent.name] if b.parent else -1,'inverseBind':list(v for row in (C@rig.matrix_world@b.matrix_local).inverted() for v in row)} for b in bones]
 json.dump({'format':'actual-DCC-hierarchy-v1','source':os.path.relpath(source,repo),'sourceSha256':sha(source),'bones':hierarchy},open(rig_path,'w'),indent=2)
 actions=[bpy.data.actions[n] for n in ['idle','move','attack','hit','death']+(['shockwave','charge','shard_rain','sweep'] if name=='roil-elemental' else [])]
 clips=[]
 with open(anim_path,'wb') as f:
  version=2 if any(int(a.get('sample_hz',60))!=60 for a in actions) else 1
  f.write(struct.pack('<4sIII',b'ZKAN',version,len(bones),len(actions)))
  for a in actions:
   duration=int(a['duration_ticks']);hz=int(a.get('sample_hz',60))
   if hz not in [60,240]:raise RuntimeError(name+'/'+a.name+': unsupported sample rate')
   frames=duration*(hz//60)+1;impact=int(a.get('impact_tick',0xffffffff));stride=float(a.get('root_stride_m',0));rig.animation_data.action=a
   recovery={'river-boa':{'attack':52},'living-tsunami':{'attack':65},'timbermaw-larva':{'attack':54},'sky-ruin-drake':{'attack':58},'roil-elemental':{'attack':190,'shockwave':260,'charge':220,'shard_rain':260,'sweep':300}}[name].get(a.name,0xffffffff)
   f.write(struct.pack('<32sIIIfII',a.name.encode(),frames,int(a.get('loop',False)),impact,stride,hz,recovery))
   max_shift=0
   for frame in range(frames):
    tick=frame*60/hz;bpy.context.scene.frame_set(int(tick),subframe=tick%1);bpy.context.view_layer.update()
    motion=rig.pose.bones[root.name].matrix.translation-root.matrix_local.translation if a.name=='move' else Vector((0,0,0))
    remove=Matrix.Translation(-motion)
    for b in bones:
     skin=C@rig.matrix_world@remove@rig.pose.bones[b.name].matrix@rest[b.name]@rig.matrix_world.inverted()@Ci
     transform=dq(skin);f.write(struct.pack('<8f',*transform));max_shift=max(max_shift,skin.translation.length)
   clips.append({'name':a.name,'durationTicks':duration,'sampleHz':hz,'samples':frames,'loop':bool(a.get('loop',False)),'impactTick':None if impact==0xffffffff else impact,'rootStride':stride,'maximumBoneTranslation':max_shift})
 # Save actual material input images; packing keeps normal and roughness data.
 images={}
 for mat in mesh.materials:
  for node in mat.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:
    image=node.image;key='normal' if 'normal' in image.name.lower() else 'orm' if any(s in image.name.lower() for s in ['metal','rough','orm']) else 'base'
    if key in images:continue
    path=out+'/'+name+'.'+key+'.png';image.filepath_raw=path;image.file_format='PNG';image.save();images[key]=os.path.basename(path)
 record={'name':name,'model':name+'.zkmodel','skin':name+'.skin','rig':name+'.rig','animation':name+'.anim','sha256':sha(model_path),'skinSha256':sha(skin_path),'rigSha256':sha(rig_path),'animationSha256':sha(anim_path),'rigged':True,'animated':True,'boneCount':len(bones),'clips':[c['name'] for c in clips],'clipDetails':clips,'vertices':count,'triangles':count//3,'weightedVertices':count,'maximumDiscardedInfluence':max_loss,'images':images,'source':os.path.relpath(source,repo),'qualityStatus':'real skin and clips exported; motion/contact/WebGPU review pending'}
 records.append(record);print('RIG-EXPORT',name,len(bones),len(actions),images,flush=True)
json.dump({'act':1,'set':'ZEN','reviewStatus':'pending','models':records},open(out+'/models.json','w'),indent=2)
