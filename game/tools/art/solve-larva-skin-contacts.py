"""Offline constrained IK on actual DQS points and exact triangle SAT contacts.

Install scipy1.11.4 into a task-local --python-deps directory. Source reference:
https://docs.scipy.org/doc/scipy-1.11.4/reference/optimize.minimize-slsqp.html
No runtime solver, bone translation, vertex displacement or root lift is added.
"""
import bpy,os,sys,json,math,hashlib,numpy as np
from mathutils import Matrix
sys.path.insert(0,os.path.dirname(__file__))
from larva_contact import signatures
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
def option(name,default):return os.path.abspath(sys.argv[sys.argv.index(name)+1]) if name in sys.argv else default
reportDir=option('--report-dir',root+'/build/act1-larva-contact');outRoot=option('--output-dir',reportDir+'/skin-ik');os.makedirs(reportDir,exist_ok=True)
sys.path.insert(0,option('--python-deps',root+'/build/act1-larva-contact/python-deps'))
from scipy.optimize import minimize
source=option('--source',root+'/game/art-work/act1/rigging/timbermaw-larva/control-rig.blend')
bpy.ops.wm.open_mainfile(filepath=source);rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');model=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('runtime_bind'));rig.animation_data.action=bpy.data.actions['death'];bpy.context.scene.frame_set(90);bpy.context.view_layer.update()
inputSignatures=signatures(rig,model,rig.animation_data.action)
bones=list(rig.data.bones);lookup={b.name:i for i,b in enumerate(bones)};parents=[lookup[b.parent.name] if b.parent else -1 for b in bones];rest=np.array([b.matrix_local for b in bones]);inverse=np.linalg.inv(rest);relative=np.array([inverse[p]@rest[i] if p>=0 else rest[i] for i,p in enumerate(parents)]);basis=np.array([rig.pose.bones[b.name].matrix_basis for b in bones]);world=np.array(rig.matrix_world);worldInverse=np.linalg.inv(world)
groups={g.index:g.name for g in model.vertex_groups};points=np.array([list(model.matrix_world@v.co) for v in model.data.vertices]);head=np.where((points[:,2]>.75)&(points[:,1]>.15))[0];joints=[];weights=[]
for v in model.data.vertices:
 row=sorted([(lookup[groups[g.group]],g.weight) for g in v.groups if groups.get(g.group) in lookup and g.weight>0],key=lambda v:-v[1])[:8];total=sum(w for _,w in row);row=[(i,w/total) for i,w in row]+[(0,0)]*(8-len(row));joints.append([i for i,w in row]);weights.append([w for i,w in row])
joints=np.array(joints);weights=np.array(weights);names=['Abdomen.Rear','Abdomen.Middle','Thorax','Neck'];indices=[lookup[n] for n in names];seed=np.radians([8,0,-10,-12]);yaw=np.radians([-18,0,12,5]);fixedY=np.zeros(4);rotations=np.array([bones[i].matrix_local.to_quaternion().to_matrix() for i in indices])
def quaternion(m):
 trace=np.trace(m)
 if trace>0:
  s=math.sqrt(1+trace)*2;q=np.array([(m[2,1]-m[1,2])/s,(m[0,2]-m[2,0])/s,(m[1,0]-m[0,1])/s,s*.25])
 else:
  i=int(np.argmax(np.diag(m)));j=(i+1)%3;k=(i+2)%3;s=math.sqrt(max(0,1+m[i,i]-m[j,j]-m[k,k]))*2;q=np.zeros(4);q[i]=.25*s;q[j]=(m[i,j]+m[j,i])/s;q[k]=(m[i,k]+m[k,i])/s;q[3]=(m[k,j]-m[j,k])/s
 return q/np.linalg.norm(q)
def evaluate(x):
 local=basis.copy()
 for k,i in enumerate(indices):
  c,s=np.cos(x[k]),np.sin(x[k]);cy,sy=np.cos(fixedY[k]),np.sin(fixedY[k]);z=x[k+4] if len(x)==8 else yaw[k];cz,sz=np.cos(z),np.sin(z);rx=np.array([[1,0,0],[0,c,-s],[0,s,c]]);ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]);rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]);r=rotations[k];local[i,:3,:3]=r.T@rz@ry@rx@r
 posed=np.zeros_like(rest)
 for i,p in enumerate(parents):posed[i]=(posed[p] if p>=0 else np.eye(4))@relative[i]@local[i]
 skin=world@posed@inverse@worldInverse;real=np.array([quaternion(m[:3,:3]) for m in skin]);t=skin[:,:3,3];dual=np.zeros_like(real);dual[:,:3]=.5*(t*real[:,3,None]+np.cross(t,real[:,:3]));dual[:,3]=-.5*np.sum(t*real[:,:3],axis=1)
 rq=real[joints];dq=dual[joints];sign=np.where(np.sum(rq*rq[:,0,None,:],axis=2)<0,-1.,1.);signed=weights*sign;r=np.sum(rq*signed[:,:,None],axis=1);d=np.sum(dq*signed[:,:,None],axis=1);norm=np.linalg.norm(r,axis=1);r/=norm[:,None];d/=norm[:,None];d-=r*np.sum(r*d,axis=1)[:,None]
 out=points+2*np.cross(r[:,:3],np.cross(r[:,:3],points)+r[:,3,None]*points)+2*(d[:,:3]*r[:,3,None]-r[:,:3]*d[:,3,None]+np.cross(r[:,:3],d[:,:3]))
 return out,posed
error=0
guard=.0005;goal=.65;last=None;cached=None;calls=0
pairData=json.load(open(option('--pairs',root+'/game/art-work/act1/rigging/timbermaw-larva/death-contact-pairs.json')))
if pairData.get('version')!=1 or pairData['geometrySignature']!=inputSignatures['geometry']:raise RuntimeError('self-contact triangle indices belong to a different source geometry')
pairs=pairData['pairs']
for pair in pairs:
 for key,index in [('a',0),('b',1)]:
  ids=pair.get(key);triangle=pair['triangles'][index]
  if not isinstance(ids,list) or len(ids)!=3 or any(not isinstance(i,int) or i<0 or i>=len(points) for i in ids) or not isinstance(triangle,int) or triangle<0 or triangle>=len(model.data.loop_triangles) or list(model.data.loop_triangles[triangle].vertices)!=ids:raise RuntimeError('self-contact pair does not identify an actual source triangle')
idsA=np.array([v['a'] for v in pairs]);idsB=np.array([v['b'] for v in pairs]);restA=points[idsA];restB=points[idsB];areasA=np.linalg.norm(np.cross(restA[:,1]-restA[:,0],restA[:,2]-restA[:,0]),axis=1);areasB=np.linalg.norm(np.cross(restB[:,1]-restB[:,0],restB[:,2]-restB[:,0]),axis=1)
def sample(x):
 global last,cached,calls
 if last is None or not np.array_equal(last,x):cached=evaluate(x)[0];last=x.copy();calls+=1
 return cached
def constraints(x):
 p=sample(x);center=p[head].mean(axis=0);a=p[idsA];b=p[idsB];ea=np.roll(a,-1,axis=1)-a;eb=np.roll(b,-1,axis=1)-b;na=np.cross(ea[:,0],ea[:,1]);nb=np.cross(eb[:,0],eb[:,1]);axes=np.concatenate((na[:,None,:],nb[:,None,:],np.cross(ea[:,:,None,:],eb[:,None,:,:]).reshape(len(a),9,3)),axis=1);sizes=np.linalg.norm(axes,axis=2);axes/=np.maximum(sizes,1e-12)[:,:,None];pa=np.einsum('pvi,pai->pav',a,axes);pb=np.einsum('pvi,pai->pav',b,axes);gaps=np.maximum(pa.min(axis=2)-pb.max(axis=2),pb.min(axis=2)-pa.max(axis=2));gaps[sizes<1e-12]=-1e3;separation=gaps.max(axis=1)
 return np.r_[p[:,2]-guard,goal-center[2],center[1]-.42,separation+1e-7,np.linalg.norm(na,axis=1)-areasA*.1,np.linalg.norm(nb,axis=1)-areasB*.1]
def objective(x):return float(np.sum((x-seed)**2*np.r_[np.ones(4),np.ones(4)*2]))
bounds=np.radians([[-15,25],[-25,35],[-60,35],[-60,25],[-30,30],[-25,25],[-30,30],[-30,30]])
records=[];previous=None;lastProblem=None;lastSolution=None;totalCalls=0;maximumError=error
for frame in range(91):
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();basis=np.array([rig.pose.bones[b.name].matrix_basis for b in bones]);seed=[];fixedY=[];yaw=[]
 for k,i in enumerate(indices):
  m=rotations[k]@basis[i,:3,:3]@rotations[k].T;seed.append(math.atan2(m[2,1],m[2,2]));fixedY.append(math.asin(np.clip(-m[2,0],-1,1)));yaw.append(math.atan2(m[1,0],m[0,0]))
 fixedY=np.array(fixedY);yaw=np.array(yaw);seed=np.r_[seed,yaw];initial,posed=evaluate(seed);reference=np.array([rig.pose.bones[b.name].matrix for b in bones]);difference=float(abs(posed-reference).max());maximumError=max(maximumError,difference)
 if difference>2e-5:raise RuntimeError('animated forward kinematics mismatch '+str(frame)+' '+str(difference))
 phase=np.clip((frame-14)/31,0,1);ease=phase*phase*(3-2*phase);goal=float((1-ease)*initial[head,2].mean()+ease*.65);last=None;cached=None;calls=0
 problem=np.r_[basis.ravel(),seed,fixedY,yaw,goal]
 if frame<15:x=seed;success=True;iterations=0
 elif lastProblem is not None and np.array_equal(lastProblem,problem):x=lastSolution.copy();success=True;iterations=0
 else:
  result=minimize(objective,previous if previous is not None else seed,method='SLSQP',bounds=bounds,constraints=[{'type':'ineq','fun':constraints}],options={'maxiter':120,'ftol':1e-9,'eps':2e-5});x=result.x;success=bool(result.success);iterations=int(result.nit)
  if constraints(x).min()<-2e-6:raise RuntimeError('actual skin/contact IK failed '+str(frame)+' '+str(result.message)+' '+str(constraints(x).min()))
 final=sample(x);previous=x.copy();lastProblem=problem.copy();lastSolution=x.copy();totalCalls+=calls
 record={'tick':frame,'anglesRadians':x[:4].tolist(),'yRadians':fixedY.tolist(),'zRadians':x[4:].tolist(),'iterations':iterations,'success':success,'headBefore':initial[head].mean(axis=0).tolist(),'headAfter':final[head].mean(axis=0).tolist(),'goalHeight':goal,'minimumHeight':float(final[:,2].min())};records.append(record)
 if frame>=15:print('SKIN-IK-FRAME',frame,iterations,record['headAfter'][2],record['minimumHeight'],flush=True)
# Preserve all unmodified source channels; replace only the four solved actual
# joint rotations, using editable Euler keyframes in the existing action mode.
original=rig.animation_data.action;action=original.copy();original.name='before_skin_contact::death';original.use_fake_user=True;action.name='death';action.use_fake_user=True;rig.animation_data.action=action
for curve in list(action.fcurves):
 if curve.data_path in ['pose.bones["'+name+'"].rotation_euler' for name in names]:action.fcurves.remove(curve)
for record in records:
 for k,name in enumerate(names):
  x,y,z=[record[key][k] for key in ['anglesRadians','yRadians','zRadians']];c,s=np.cos(x),np.sin(x);cy,sy=np.cos(y),np.sin(y);cz,sz=np.cos(z),np.sin(z);rx=np.array([[1,0,0],[0,c,-s],[0,s,c]]);ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]);rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]);r=rotations[k];rig.pose.bones[name].rotation_euler=Matrix(r.T@rz@ry@rx@r).to_euler();rig.pose.bones[name].keyframe_insert('rotation_euler',frame=record['tick'])
for curve in action.fcurves:
 if curve.data_path in ['pose.bones["'+name+'"].rotation_euler' for name in names]:
  for key in curve.keyframe_points:key.interpolation='LINEAR'
rig['death_contact_method']='Actual skinned-vertex constrained IK; four joint rotations only; fixed roots and joint translations'
out=outRoot+'/timbermaw-larva';os.makedirs(out,exist_ok=True);rig.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.frame_set(0);bpy.ops.wm.save_as_mainfile(filepath=out+'/control-rig.blend')
report={'version':1,'ok':True,'sourceSha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'signatures':inputSignatures,'forwardKinematicsMaximumMatrixError':maximumError,'evaluations':totalCalls,'names':names,'rootChanged':False,'jointTranslationsChanged':False,'frames':records}
json.dump(report,open(reportDir+'/skin-ik-curve.json','w'),indent=2);print('ACTUAL-SKIN-IK-CLIP',len(records),totalCalls,maximumError,flush=True)
