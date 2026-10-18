"""Bake unilateral skin/plane contact constraints into actual DCC bone poses.

Original control-rig.blend files and their authored IK remain untouched. The
derived ground-rig.blend bakes evaluated constraints, then corrects non-root
joint translations using the exact normalized-DQS vertical Jacobian. No vertex
warping, nearest-bone assignment or whole-model/root lift is performed.
"""
import bpy,os,json,hashlib,sys,numpy as np
from mathutils import Matrix,Vector
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
base=repo+'/game/art-work/act1/rigging';report_dir=repo+'/build/act1-polish';os.makedirs(report_dir,exist_ok=True)
if '--rig-dir' in sys.argv:base=os.path.abspath(sys.argv[sys.argv.index('--rig-dir')+1])
if '--report-dir' in sys.argv:report_dir=os.path.abspath(sys.argv[sys.argv.index('--report-dir')+1]);os.makedirs(report_dir,exist_ok=True)
names=['river-boa','living-tsunami','timbermaw-larva','sky-ruin-drake','roil-elemental']
if '--model' in sys.argv:
 selected=sys.argv[sys.argv.index('--model')+1]
 if selected not in names:raise ValueError('unknown act1 creature: '+selected)
 names=[selected]
GUARD=.0005;TOLERANCE=2e-7

def sha(path):return hashlib.sha256(open(path,'rb').read()).hexdigest()

def minimum_joint_correction(matrix,bounds):
 # Hildreth dual coordinate ascent solves min 1/2 ||x||² subject to A x >= b.
 # Constraint generation keeps the working set small; all original vertices
 # are checked after each solve. Root columns are absent, not clamped later.
 count=matrix.shape[1];a=np.concatenate((matrix,np.eye(count)));b=np.concatenate((bounds,np.zeros(count)))
 x=np.zeros(count);active=[];multipliers=[];iterations=0
 for outer in range(128):
  residual=b-a@x;worst=int(np.argmax(residual))
  if residual[worst]<=TOLERANCE:return x,iterations
  if np.dot(a[worst],a[worst])<1e-16:raise RuntimeError('a root-only contact cannot be corrected by non-root joints')
  if worst not in active:active.append(worst);multipliers.append(0.)
  for sweep in range(512):
   delta_max=0.
   for i,index in enumerate(active):
    row=a[index];updated=max(0.,multipliers[i]+(b[index]-row@x)/(row@row));delta=updated-multipliers[i]
    x+=delta*row;multipliers[i]=updated;delta_max=max(delta_max,abs(delta));iterations+=1
   if delta_max<1e-10:break
 if np.max(b-a@x)>2e-6:raise RuntimeError('contact QP did not converge; geometry needs review')
 return x,iterations

reports=[]
for name in names:
 source=base+'/'+name+'/control-rig.blend';bpy.ops.wm.open_mainfile(filepath=source)
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');model=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('runtime_bind'))
 bones=list(rig.data.bones);indices={b.name:i for i,b in enumerate(bones)};roots={i for i,b in enumerate(bones) if b.parent is None};variables=[i for i,b in enumerate(bones) if i not in roots and b.use_deform]
 groups={g.index:g.name for g in model.vertex_groups};bind=np.array([list(model.matrix_world@v.co) for v in model.data.vertices]);joints=[];weights=[]
 for v in model.data.vertices:
  row=sorted([(indices[groups[g.group]],g.weight) for g in v.groups if groups.get(g.group) in indices and g.weight>0],key=lambda a:-a[1])[:8];total=sum(w for i,w in row)
  if total<1e-8:raise RuntimeError(name+': source has an unweighted vertex')
  row=[(i,w/total) for i,w in row]+[(0,0)]*(8-len(row));joints.append([i for i,w in row]);weights.append([w for i,w in row])
 joints=np.array(joints);weights=np.array(weights);rest=[b.matrix_local.inverted() for b in bones];world=rig.matrix_world;world_inverse=world.inverted();vertical=world.to_3x3().inverted()@Vector((0,0,1))
 actions=[bpy.data.actions[n] for n in ['idle','move','attack','hit','death']+(['shockwave','charge','shard_rain','sweep'] if name=='roil-elemental' else [])]
 baked=[];clip_reports=[]
 for action in actions:
  rig.animation_data.action=action;duration=int(action['duration_ticks']);hz=int(action.get('sample_hz',60));poses=[];root_samples=[];maximum=0.;minimum_before=0.;maximum_residual=0.;maximum_iterations=0
  if hz not in [60,240]:raise RuntimeError('unsupported contact authoring rate')
  for sample in range(duration*(hz//60)+1):
   frame=sample*60/hz;bpy.context.scene.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update();posed=[rig.pose.bones[b.name].matrix.copy() for b in bones];real=[];dual=[]
   root_samples.append({i:posed[i].copy() for i in roots})
   for i,b in enumerate(bones):
    skin=world@posed[i]@rest[i]@world_inverse;q=skin.to_quaternion().normalized();t=skin.translation
    real.append([q.x,q.y,q.z,q.w]);dual.append([.5*(q.w*t.x+t.y*q.z-t.z*q.y),.5*(q.w*t.y+t.z*q.x-t.x*q.z),.5*(q.w*t.z+t.x*q.y-t.y*q.x),-.5*(t.x*q.x+t.y*q.y+t.z*q.z)])
   real=np.array(real);rq=real[joints];dq=np.array(dual)[joints];anchor=rq[:,0,:];sign=np.where(np.sum(rq*anchor[:,None,:],axis=2)<0,-1.,1.);signed=weights*sign
   r=np.sum(rq*signed[:,:,None],axis=1);d=np.sum(dq*signed[:,:,None],axis=1);norm=np.linalg.norm(r,axis=1);r/=norm[:,None];d/=norm[:,None];d-=r*np.sum(r*d,axis=1)[:,None]
   transformed=bind+2*np.cross(r[:,:3],np.cross(r[:,:3],bind)+r[:,3,None]*bind)+2*(d[:,:3]*r[:,3,None]-r[:,:3]*d[:,3,None]+np.cross(r[:,:3],d[:,:3]))
   # d(height_v)/d(world_vertical_translation_b) is exactly
   # signed_weight_vb * dot(real_b, normalized_real_v) / blend_norm_v.
   coefficients=signed*np.sum(rq*r[:,None,:],axis=2)/norm[:,None];jacobian=np.zeros((len(bind),len(bones)))
   for k in range(8):np.add.at(jacobian,(np.arange(len(bind)),joints[:,k]),coefficients[:,k])
   a=jacobian[:,variables];floor=GUARD*np.maximum(a.sum(axis=1),0);height=transformed[:,2];minimum_before=min(minimum_before,float(height.min()))
   offset,iterations=minimum_joint_correction(a,floor-height);maximum=max(maximum,float(np.max(np.abs(offset))));maximum_iterations=max(maximum_iterations,iterations)
   if maximum>.10:raise RuntimeError(name+'/'+action.name+' frame '+str(frame)+': contact correction '+str(maximum)+'m exceeds 10cm; minimum skin height '+str(float(height.min()))+'m at source vertex '+str(int(np.argmin(height)))+'; revise the authored pose')
   maximum_residual=max(maximum_residual,float(np.max(floor-height-a@offset)))
   corrected=[m.copy() for m in posed]
   for i,change in zip(variables,offset):corrected[i].translation+=vertical*float(change)
   local=[]
   for i,b in enumerate(bones):
    kwargs={'parent_matrix':corrected[indices[b.parent.name]],'parent_matrix_local':b.parent.matrix_local} if b.parent else {}
    basis=b.convert_local_to_pose(corrected[i],b.matrix_local,invert=True,**kwargs);translation,rotation,scale=basis.decompose()
    if max(abs(s-1) for s in scale)>1e-4:raise RuntimeError(name+': nonrigid bone scale would be lost')
    rotation.normalize()
    if poses and rotation.dot(poses[-1][i][1])<0:rotation.negate()
    local.append((translation,rotation))
   poses.append(local)
  baked.append((action,poses,root_samples,hz));clip_reports.append({'clip':action.name,'frames':duration+1,'samples':len(poses),'sampleHz':hz,'lowestBeforeMetres':minimum_before,'maximumNonRootJointCorrectionMetres':maximum,'maximumConstraintResidualMetres':maximum_residual,'maximumSolverCoordinateUpdates':maximum_iterations})
  print('GROUND-SOLVE',name,action.name,minimum_before,maximum,maximum_residual,flush=True)
 # Baked constraint matrices preserve the original IK result without applying
 # the original constraint a second time. Editable authoring stays in source.
 for p in rig.pose.bones:
  for constraint in p.constraints:constraint.mute=True
 root_error=0.
 for original,poses,root_samples,hz in baked:
  name_clip=original.name;original.name='authored::'+name_clip;original.use_fake_user=True;action=bpy.data.actions.new(name_clip)
  for key in original.keys():action[key]=original[key]
  action['ground_contact_solved']=True;action['ground_guard_metres']=GUARD;action.use_fake_user=True;rig.animation_data.action=action
  for sample,local in enumerate(poses):
   frame=sample*60/hz
   for b,(translation,rotation) in zip(bones,local):
    p=rig.pose.bones[b.name];p.rotation_mode='QUATERNION';p.location=translation;p.rotation_quaternion=rotation;p.scale=(1,1,1);p.keyframe_insert('location',frame=frame);p.keyframe_insert('rotation_quaternion',frame=frame)
  for curve in action.fcurves:
   for key in curve.keyframe_points:key.interpolation='LINEAR'
  for sample,expected in enumerate(root_samples):
   frame=sample*60/hz;bpy.context.scene.frame_set(int(frame),subframe=frame%1);bpy.context.view_layer.update()
   for i,matrix in expected.items():root_error=max(root_error,max(abs(rig.pose.bones[bones[i].name].matrix[r][c]-matrix[r][c]) for r in range(4) for c in range(4)))
 if root_error>1e-5:raise RuntimeError(name+': ground contact baking altered authored root motion')
 rig.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
 rig['contact_source_sha256']=sha(source);rig['contact_method']='exact DQS skin-plane Jacobian; minimum joint translation QP; roots fixed';rig['contact_guard_metres']=GUARD
 target=base+'/'+name+'/ground-rig.blend';bpy.ops.wm.save_as_mainfile(filepath=target)
 reports.append({'name':name,'sourceSha256':sha(source),'outputSha256':sha(target),'output':os.path.relpath(target,repo),'rootCorrectionMetres':0,'maximumRootMatrixError':root_error,'guardMetres':GUARD,'clips':clip_reports})
report_name='ground-solve-'+names[0]+'.json' if len(names)==1 else 'ground-solve.json'
json.dump({'ok':True,'method':'unilateral skin/plane constraints solved in actual bone poses; original controls and IK preserved separately','models':reports},open(report_dir+'/'+report_name,'w'),indent=2)
