"""Independent CPU DQS vs Blender armature evaluation, on the real sources.
Measures every original vertex, retaining skin seam pairs and source topology.
"""
import bpy,json,os,struct,math,sys,hashlib,numpy as np
from mathutils import Matrix,Vector
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));base=repo+'/game/art-work/act1/rigging';runtime=repo+'/game/gameplay/content/creatures/act1/runtime';manifest=json.load(open(runtime+'/models.json'))
C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)));Ci=C.inverted();reports=[]
selected=sys.argv[sys.argv.index('--model')+1] if '--model' in sys.argv else None
if selected is not None and selected not in [m['name'] for m in manifest['models']]:raise ValueError('unknown act1 creature: '+selected)
for record in manifest['models']:
 if selected is not None and record['name']!=selected:continue
 name=record['name'];source=base+'/'+name+'/ground-rig.blend' if '--ground' in sys.argv else os.path.join(repo,record['source']);bpy.ops.wm.open_mainfile(filepath=source);rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');model=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('runtime_bind'))
 bones=list(rig.data.bones);root=next(b for b in bones if not b.parent);lookup={b.name:i for i,b in enumerate(bones)};groups={g.index:g.name for g in model.vertex_groups}
 bind=np.array([list(C@model.matrix_world@v.co) for v in model.data.vertices]);js=[];ws=[];seams={};seam_error=0
 for v in model.data.vertices:
  influence=sorted([(lookup[groups[g.group]],g.weight) for g in v.groups if groups.get(g.group) in lookup and g.weight>0],key=lambda a:-a[1])[:8];total=sum(w for i,w in influence);influence=[(i,w/total) for i,w in influence]+[(0,0)]*(8-len(influence));js.append([i for i,w in influence]);ws.append([w for i,w in influence]);dense=np.zeros(len(bones))
  for i,w in influence:dense[i]+=w
  position=tuple(v.co)
  if position in seams:seam_error=max(seam_error,float(np.max(np.abs(seams[position]-dense))))
  else:seams[position]=dense
 joints=np.array(js);weights=np.array(ws);checks=[];worst=0
 edges=np.array([list(e.vertices) for e in model.data.edges]);edge_length=np.linalg.norm(bind[edges[:,0]]-bind[edges[:,1]],axis=1);keep=edge_length>1e-5;edges=edges[keep];edge_length=edge_length[keep]
 for clip in record['clips']:
  action=bpy.data.actions[clip];rig.animation_data.action=action;duration=int(action['duration_ticks']);samples=list(range(duration+1))
  motions=[];ground=[];stretch=[];growth=[]
  for frame in samples:
   bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();motion=rig.pose.bones[root.name].matrix.translation-root.matrix_local.translation if clip=='move' else Vector((0,0,0));remove=Matrix.Translation(-motion);real=[];dual=[]
   for b in bones:
    m=C@rig.matrix_world@remove@rig.pose.bones[b.name].matrix@b.matrix_local.inverted()@rig.matrix_world.inverted()@Ci;q=m.to_quaternion().normalized();t=m.translation
    real.append([q.x,q.y,q.z,q.w]);dual.append([.5*(q.w*t.x+t.y*q.z-t.z*q.y),.5*(q.w*t.y+t.z*q.x-t.x*q.z),.5*(q.w*t.z+t.x*q.y-t.y*q.x),-.5*(t.x*q.x+t.y*q.y+t.z*q.z)])
   rq=np.array(real)[joints];dq=np.array(dual)[joints];reference=rq[:,0,:];sign=np.where(np.sum(rq*reference[:,None,:],axis=2)<0,-1,1);signed=weights*sign;r=np.sum(rq*signed[:,:,None],axis=1);d=np.sum(dq*signed[:,:,None],axis=1);length=np.linalg.norm(r,axis=1);r/=length[:,None];d/=length[:,None];d-=r*np.sum(r*d,axis=1)[:,None]
   transformed=bind+2*np.cross(r[:,:3],np.cross(r[:,:3],bind)+r[:,3,None]*bind)+2*(d[:,:3]*r[:,3,None]-r[:,:3]*d[:,3,None]+np.cross(r[:,:3],d[:,:3]))
   evaluated=model.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();reference=np.array([list(C@evaluated.matrix_world@v.co-C.to_3x3()@motion) for v in mesh.vertices]);evaluated.to_mesh_clear()
   if len(reference)!=len(bind):raise RuntimeError(name+': rig changed original topology')
   error=float(np.max(np.linalg.norm(reference-transformed,axis=1)));worst=max(worst,error)
   if error>.00003:raise RuntimeError(name+': CPU skin diverges from actual Blender skin '+str(error))
   # Remove best-fit whole-body rigid motion before measuring actual deformation.
   p=bind-bind.mean(axis=0);q=transformed-transformed.mean(axis=0);u,s,v=np.linalg.svd(p.T@q);rotation=u@v
   if np.linalg.det(rotation)<0:u[:,-1]*=-1;rotation=u@v
   motions.append(float(np.sqrt(np.mean(np.sum((p@rotation-q)**2,axis=1)))));ground.append(float(transformed[:,1].min()));lengths=np.linalg.norm(transformed[edges[:,0]]-transformed[edges[:,1]],axis=1);stretch.append(float(np.max(lengths/edge_length)));growth.append(float(np.max(lengths-edge_length)))
  if max(motions)<.001:raise RuntimeError(name+'/'+clip+': rigid motion only, not real creature deformation')
  if '--strict-ground' in sys.argv and min(ground)<-.00005:raise RuntimeError(name+'/'+clip+': actual skin penetrates the ground '+str(min(ground)))
  checks.append({'clip':clip,'sampleTicks':samples,'nonrigidRmsMetres':motions,'lowestYMetres':ground,'maximumEdgeStretch':stretch,'maximumEdgeGrowthMetres':growth})
 if seam_error>1e-4:raise RuntimeError(name+': mismatched seam weights '+str(seam_error))
 forward_attack=None
 if name in ['river-boa','sky-ruin-drake']:
  rig.animation_data.action=bpy.data.actions['attack'];tip='tripo::Head_4' if name=='river-boa' else 'tripo::Head_3'
  bpy.context.scene.frame_set(23 if name=='river-boa' else 22);bpy.context.view_layer.update();ready=rig.pose.bones[tip].tail.copy()
  bpy.context.scene.frame_set(40);bpy.context.view_layer.update();strike=rig.pose.bones[tip].tail.copy();forward_attack=strike.y-ready.y
  if forward_attack<.05:raise RuntimeError(name+': actual head strike moves away from the authored +Y target')
 reports.append({'name':name,'source':os.path.relpath(source,repo),'sourceSha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'originalVertices':len(bind),'sourceTriangles':sum(len(p.vertices)-2 for p in model.data.polygons),'boneCount':len(bones),'maximumCpuDccErrorMetres':worst,'maximumSkinSeamWeightError':seam_error,'attackHeadForwardTravelMetres':forward_attack,'clips':checks,'qualityStatus':'DQS data verified; contact/visual quality still under review'});print('DEFORMATION-CHECK',name,worst,seam_error,flush=True)
out=repo+('/build/act1-polish/deformation-checks' if '--ground' in sys.argv else '/build/act1-overhaul/deformation-checks')
if '--model' in sys.argv:out+='-'+sys.argv[sys.argv.index('--model')+1]
json.dump({'ok':True,'models':reports},open(out+'.json','w'),indent=2)
