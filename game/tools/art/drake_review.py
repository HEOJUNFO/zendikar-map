"""Apply reviewed source geometry, sparse skin paint and actual joint curves."""
import bpy,json,hashlib,numpy as np
from mathutils import Quaternion,Vector
from larva_contact import signatures

LIVE=['bone_24','bone_25','bone_26','tripo::Spine_3','bone_32','bone_33','tripo::0_Left_Limb_0','tripo::0_Right_Limb_0']
DEATH=LIVE+['tripo::Spine_2','tripo::Head_0','tripo::Head_1','tripo::Tail_0']
def uv_signature(model):return hashlib.sha256(np.asarray([list(v.uv) for v in model.data.uv_layers.active.data],dtype='<f4').tobytes()).hexdigest()
def source_signatures(rig,model):
 result=signatures(rig,model);result.pop('baselineDeathChannels');return result
def load(path):
 data=json.load(open(path,encoding='utf-8'))
 if data.get('version')!=1 or set(data.get('actions',{}))!={'idle','move','attack','hit','death'}:raise RuntimeError('unsupported reviewed Drake source')
 return data
def apply_skin_geometry(rig,model,path):
 data=load(path)
 if source_signatures(rig,model)!=data['sourceSignatures'] or uv_signature(model)!=data['uvSignature'] or len(model.data.vertices)!=data['vertexCount']:raise RuntimeError('reviewed Drake geometry/skin belongs to a different original source')
 bones={b.name for b in rig.data.bones};seen=set()
 for patch in data['positionPatches']:
  index=patch['vertex']
  if not isinstance(index,int) or index<0 or index>=len(model.data.vertices) or index in seen or list(model.data.vertices[index].co)!=patch['before'] or len(patch['after'])!=3 or not all(np.isfinite(v) for v in patch['after']):raise RuntimeError('invalid reviewed original geometry patch')
  if (Vector(patch['after'])-Vector(patch['before'])).length>.002:raise RuntimeError('reviewed static repair exceeds its2mm source envelope')
  seen.add(index)
 seen=set()
 for patch in data['weightPatches']:
  index=patch['vertex'];weights=patch['weights']
  if not isinstance(index,int) or index<0 or index>=len(model.data.vertices) or index in seen or not weights or len(weights)>8 or not set(weights)<=bones or any(not np.isfinite(v) or v<0 for v in weights.values()) or abs(sum(weights.values())-1)>1e-5:raise RuntimeError('invalid reviewed sparse skin patch')
  seen.add(index)
 for patch in data['positionPatches']:model.data.vertices[patch['vertex']].co=patch['after']
 for patch in data['weightPatches']:
  index=patch['vertex']
  for g in list(model.data.vertices[index].groups):model.vertex_groups[g.group].remove([index])
  for name,weight in patch['weights'].items():model.vertex_groups[name].add([index],weight,'REPLACE')
 # The imported file orders equal-weight groups differently. Preserve the
 # reviewed bone-order accumulation without changing any normalized influence.
 group_names={g.index:g.name for g in model.vertex_groups}
 for vertex in model.data.vertices:
  weights={group_names[g.group]:g.weight for g in vertex.groups if g.weight>0}
  for g in list(vertex.groups):model.vertex_groups[g.group].remove([vertex.index])
  for bone in rig.data.bones:
   if bone.name in weights:model.vertex_groups[bone.name].add([vertex.index],weights[bone.name],'REPLACE')
 model.data.update()
 derived=source_signatures(rig,model)
 for key,value in data['derivedSignatures'].items():
  if derived.get(key)!=value:raise RuntimeError('reviewed Drake derivative differs in '+key+' '+str(derived.get(key))+' versus '+value)
 if uv_signature(model)!=data['uvSignature']:raise RuntimeError('reviewed Drake derivative changes UVs')
 model['reviewed_source_derivative_sha256']=hashlib.sha256(open(path,'rb').read()).hexdigest()
def apply_motion(rig,model,path):
 data=load(path)
 if source_signatures(rig,model)!=data['derivedSignatures']:raise RuntimeError('reviewed Drake motion requires the reviewed derivative')
 for name,record in data['actions'].items():
  action=bpy.data.actions[name];controls=DEATH if name=='death' else LIVE;hz=record['sampleHz'];frames=record['frames']
  if controls!=record['controls'] or hz not in [60,240] or int(action['duration_ticks'])!=record['durationTicks'] or len(frames)!=record['durationTicks']*(hz//60)+1 or signatures(rig,model,action)['baselineDeathChannels']!=record['baselineSignature']:raise RuntimeError('reviewed Drake motion has stale baseline channels')
  for i,frame in enumerate(frames):
   if frame['tick']!=i*60/hz or set(frame['rotations'])!=set(controls):raise RuntimeError('reviewed Drake motion misses an exact sample')
   for bone,q in frame['rotations'].items():
    if rig.pose.bones[bone].rotation_mode!='QUATERNION' or len(q)!=4 or not all(np.isfinite(v) for v in q) or abs(sum(v*v for v in q)-1)>.001:raise RuntimeError('invalid reviewed actual joint quaternion')
   if name=='death' and (len(frame.get('rootLocation',[]))!=3 or not all(np.isfinite(v) for v in frame['rootLocation'])):raise RuntimeError('invalid actual skin-derived root trajectory')
 for name,record in data['actions'].items():
  old=bpy.data.actions[name];action=old.copy();old.name='before_reviewed_contact::'+name;old.use_fake_user=True;action.name=name;action.use_fake_user=True;action['sample_hz']=record['sampleHz'];rig.animation_data.action=action;paths=['pose.bones["'+bone+'"].rotation_quaternion' for bone in record['controls']]
  if name=='death':paths.append('pose.bones["tripo::Root"].location')
  for curve in list(action.fcurves):
   if curve.data_path in paths:action.fcurves.remove(curve)
  for frame in record['frames']:
   for bone,q in frame['rotations'].items():rig.pose.bones[bone].rotation_quaternion=Quaternion(q);rig.pose.bones[bone].keyframe_insert('rotation_quaternion',frame=frame['tick'])
   if name=='death':rig.pose.bones['tripo::Root'].location=frame['rootLocation'];rig.pose.bones['tripo::Root'].keyframe_insert('location',frame=frame['tick'])
  for curve in action.fcurves:
   if curve.data_path in paths or name=='death':
    for key in curve.keyframe_points:key.interpolation='LINEAR'
 rig['reviewed_contact_motion_sha256']=hashlib.sha256(open(path,'rb').read()).hexdigest()
