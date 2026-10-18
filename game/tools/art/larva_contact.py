"""Reviewed actual-joint contact curves. This module never edits mesh/weights."""
import bpy,hashlib,json,numpy as np
from mathutils import Matrix

NAMES=['Abdomen.Rear','Abdomen.Middle','Thorax','Neck']

def signatures(rig,model,action=None):
 model.data.calc_loop_triangles();bones=list(rig.data.bones);lookup={b.name:i for i,b in enumerate(bones)};groups={g.index:g.name for g in model.vertex_groups}
 geometry=hashlib.sha256(np.asarray([list(v.co) for v in model.data.vertices],dtype='<f4').tobytes()+np.asarray([list(t.vertices) for t in model.data.loop_triangles],dtype='<u4').tobytes()).hexdigest()
 skin=hashlib.sha256()
 for v in model.data.vertices:
  row=sorted([(lookup[groups[g.group]],g.weight) for g in v.groups if groups.get(g.group) in lookup and g.weight>0],key=lambda v:-v[1])[:8];total=sum(w for _,w in row);row=[(i,w/total) for i,w in row]+[(0,0)]*(8-len(row));skin.update(np.asarray([i for i,w in row],dtype='<u4').tobytes());skin.update(np.asarray([w for i,w in row],dtype='<f4').tobytes())
 skeleton=[{'name':b.name,'parent':lookup[b.parent.name] if b.parent else -1,'matrix':[v for row in b.matrix_local for v in row]} for b in bones]
 channels=[{'path':c.data_path,'index':c.array_index,'keys':[{'co':list(k.co),'interpolation':k.interpolation,'left':list(k.handle_left),'right':list(k.handle_right),'leftType':k.handle_left_type,'rightType':k.handle_right_type} for k in c.keyframe_points]} for c in sorted(action.fcurves,key=lambda c:(c.data_path,c.array_index))] if action is not None else []
 digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 return {'geometry':geometry,'skin':skin.hexdigest(),'skeleton':digest(skeleton),'objectTransforms':digest([list(v for row in o.matrix_world for v in row) for o in [rig,model]]),'baselineDeathChannels':digest(channels)}

def apply_curve(rig,model,path):
 data=json.load(open(path,encoding='utf-8'));baseline=bpy.data.actions['death'];rig.animation_data.action=baseline;bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
 if data.get('version')!=1 or data.get('names')!=NAMES or not isinstance(data.get('frames'),list) or len(data['frames'])!=91 or int(baseline.get('duration_ticks',-1))!=90:raise RuntimeError('unsupported reviewed Larva contact curve')
 actual=signatures(rig,model,baseline)
 if set(data.get('signatures',{}))!=set(actual):raise RuntimeError('reviewed Larva contact curve requires every source signature')
 for key,value in data['signatures'].items():
  if actual.get(key)!=value:raise RuntimeError('reviewed Larva contact curve has stale '+key+'; regenerate baseline and solve again')
 if any(rig.pose.bones[n].rotation_mode!='XYZ' or rig.pose.bones[n].constraints for n in NAMES):raise RuntimeError('Larva contact curve requires the original editable Euler controls')
 for tick,record in enumerate(data['frames']):
  if record.get('tick')!=tick:raise RuntimeError('reviewed Larva contact curve misses a60Hz frame')
  for field in ['anglesRadians','yRadians','zRadians']:
   if not isinstance(record.get(field),list) or len(record[field])!=4 or not all(isinstance(v,(int,float)) and np.isfinite(v) for v in record[field]):raise RuntimeError('invalid reviewed joint rotation')
 action=baseline.copy();baseline.name='before_skin_contact::death';baseline.use_fake_user=True;action.name='death';action.use_fake_user=True;rig.animation_data.action=action
 for curve in list(action.fcurves):
  if curve.data_path in ['pose.bones["'+name+'"].rotation_euler' for name in NAMES]:action.fcurves.remove(curve)
 rotations=[np.array(rig.data.bones[name].matrix_local.to_quaternion().to_matrix()) for name in NAMES]
 for tick,record in enumerate(data['frames']):
  if record['tick']!=tick:raise RuntimeError('reviewed Larva contact curve misses a60Hz frame')
  for k,name in enumerate(NAMES):
   values=[record[key][k] for key in ['anglesRadians','yRadians','zRadians']]
   if not all(np.isfinite(v) for v in values):raise RuntimeError('nonfinite reviewed joint rotation')
   x,y,z=values;c,s=np.cos(x),np.sin(x);cy,sy=np.cos(y),np.sin(y);cz,sz=np.cos(z),np.sin(z);rx=np.array([[1,0,0],[0,c,-s],[0,s,c]]);ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]);rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]);r=rotations[k];rig.pose.bones[name].rotation_euler=Matrix(r.T@rz@ry@rx@r).to_euler();rig.pose.bones[name].keyframe_insert('rotation_euler',frame=tick)
 for curve in action.fcurves:
  if curve.data_path in ['pose.bones["'+name+'"].rotation_euler' for name in NAMES]:
   for key in curve.keyframe_points:key.interpolation='LINEAR'
 rig['death_contact_method']='Actual skinned-vertex constrained inverse kinematics; four joint rotations; roots/translations unchanged'
 rig['death_contact_curve_sha256']=hashlib.sha256(open(path,'rb').read()).hexdigest()
