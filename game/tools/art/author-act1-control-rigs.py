"""Author species-specific DCC armatures and action keyposes on real meshes.
Landmarks below were fitted to the actual staged front/side/top models. Binding
uses Blender's bone-heat solve; missing weights are a hard failure, never a
nearest-bone/whole-object-motion fallback. Source GLBs stay unchanged.
"""
import bpy,bmesh,os,json,math,hashlib,sys,numpy as np
from mathutils import Vector,Euler
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
base=os.path.join(repo,'game/art-work/act1/rigging')
# Blender coordinates: X lateral, +Y facing, Z up, in gameplay metres.
recipes={
 'timbermaw-larva':[
 ('Root',(0,-.12,.20),(0,-.12,.40),None,False),
 ('Abdomen.Rear',(0,-.60,.20),(0,-.34,.24),'Root',True),
 ('Abdomen.Middle',(0,-.34,.24),(0,-.04,.32),'Abdomen.Rear',True),
 ('Thorax',(0,-.04,.32),(0,.18,.50),'Abdomen.Middle',True),
 ('Neck',(0,.18,.50),(0,.22,.70),'Thorax',True),
 ('Jaw.Upper',(0,.18,.71),(0,.43,.99),'Neck',True),
 ('Jaw.Lower',(0,.16,.44),(0,.56,.37),'Neck',True),
 ('Lip.Upper.L',(.20,.36,.87),(.30,.47,.94),'Jaw.Upper',True),
 ('Lip.Upper.R',(-.20,.36,.87),(-.30,.47,.94),'Jaw.Upper',True),
 ('Lip.Lower.L',(.20,.40,.40),(.32,.51,.39),'Jaw.Lower',True),
 ('Lip.Lower.R',(-.20,.40,.40),(-.32,.51,.39),'Jaw.Lower',True),
 ('Cheek.L',(.23,.16,.57),(.33,.30,.70),'Neck',True),
 ('Cheek.R',(-.23,.16,.57),(-.33,.30,.70),'Neck',True)],
 'living-tsunami':[
 ('Root',(-.30,0,.20),(-.30,0,.40),None,False),
 ('Surge.Base',(-.35,0,.18),(-.42,0,.48),'Root',True),
 ('Surge.Spine',(-.42,0,.48),(-.40,0,.82),'Surge.Base',True),
 ('Crest.Rise',(-.40,0,.82),(-.24,0,1.18),'Surge.Spine',True),
 ('Crest.Curl',(-.24,0,1.18),(.12,.03,1.29),'Crest.Rise',True),
 ('Crest.Tip',(.12,.03,1.29),(.46,.06,1.05),'Crest.Curl',True),
 ('Wake.Low',(-.24,.02,.30),(.10,.08,.33),'Surge.Base',True),
 ('Wake.Tip',(.10,.08,.33),(.45,.12,.49),'Wake.Low',True),
 ('Surge.Middle',(-.32,.02,.62),(.10,.07,.70),'Surge.Spine',True),
 ('Surge.Tip',(.10,.07,.70),(.47,.10,.89),'Surge.Middle',True),
 ('Foam.Back',(-.42,-.16,.65),(-.25,-.22,1.05),'Surge.Spine',True),
 ('Foam.Front',(-.30,.18,.55),(-.10,.24,.98),'Surge.Spine',True)],
 'roil-elemental':[
 ('Root',(0,0,1.6),(0,0,1.9),None,False),
 ('Vortex.Tail',(.30,0,.25),(.28,0,.90),'Root',True),
 ('Vortex.Lower',(.28,0,.90),(-.16,0,1.55),'Vortex.Tail',True),
 ('Vortex.Middle',(-.16,0,1.55),(.12,0,2.2),'Vortex.Lower',True),
 ('Vortex.Crown',(.12,0,2.2),(0,0,2.95),'Vortex.Middle',True),
 ('Crest.Center',(0,0,2.95),(-.15,0,3.85),'Vortex.Crown',True),
 ('Crest.L',(-.15,0,3.5),(-1.20,0,4.15),'Crest.Center',True),
 ('Crest.L.Tip',(-1.20,0,4.15),(-2.90,.08,4.25),'Crest.L',True),
 ('Crest.R',(.10,0,3.4),(1.20,0,3.8),'Crest.Center',True),
 ('Crest.R.Tip',(1.20,0,3.8),(2.95,.1,4.0),'Crest.R',True),
 ('Gust.L',(-.15,.05,2.75),(-1.05,.12,2.50),'Vortex.Crown',True),
 ('Gust.L.Tip',(-1.05,.12,2.50),(-2.10,.16,2.65),'Gust.L',True),
 ('Gust.R',(.10,.05,2.6),(1.10,.14,2.10),'Vortex.Crown',True),
 ('Gust.R.Tip',(1.10,.14,2.10),(2.25,.20,2.6),'Gust.R',True),
 ('Spiral.Front',(0,.25,1.5),(.12,.75,2.5),'Vortex.Middle',True),
 ('Spiral.Back',(0,-.25,1.6),(-.10,-.80,2.65),'Vortex.Middle',True)]}

def pose(rig,frame,turns=None,locations=None):
 for p in rig.pose.bones:
  p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
 for name,angles in (turns or {}).items():
  p=rig.pose.bones[name];basis=p.bone.matrix_local.to_quaternion()
  p.rotation_euler=(basis.inverted()@Euler(tuple(math.radians(a) for a in angles)).to_quaternion()@basis).to_euler()
 for name,position in (locations or {}).items():rig.pose.bones[name].location=rig.data.bones[name].matrix_local.to_quaternion().inverted()@Vector(position)
 for p in rig.pose.bones:
  p.keyframe_insert('rotation_euler',frame=frame);p.keyframe_insert('location',frame=frame)

def action(rig,name,duration,poses,loop=False,impact=None,stride=0):
 a=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=a
 for frame,turns in poses:
  pose(rig,frame,turns,{'Root':(0,stride*frame/duration,0)} if stride else None)
 for curve in a.fcurves:
  for key in curve.keyframe_points:
   key.interpolation='LINEAR' if curve.data_path=='pose.bones["Root"].location' else 'BEZIER'
   key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
 a['duration_ticks']=duration;a['loop']=loop;a['root_stride_m']=stride
 if impact is not None:a['impact_tick']=impact
 a.use_fake_user=True
 return a

reports=[]
selected=sys.argv[sys.argv.index('--model')+1] if '--model' in sys.argv else None
if selected is not None and selected not in recipes:raise ValueError('unknown authored creature: '+selected)
output_root=os.path.abspath(sys.argv[sys.argv.index('--output-dir')+1]) if '--output-dir' in sys.argv else base
corrections_path=os.path.abspath(sys.argv[sys.argv.index('--skin-corrections')+1]) if '--skin-corrections' in sys.argv else os.path.join(base,'manual-skin-corrections.json')
corrections=json.load(open(corrections_path,encoding='utf-8-sig'))
for name,defs in recipes.items():
 if selected is not None and name!=selected:continue
 bpy.ops.wm.open_mainfile(filepath=os.path.join(base,name,'bind-reference.blend'))
 model=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 source_triangles=sum(len(p.vertices)-2 for p in model.data.polygons)
 # Heat binding needs the connected surface, while the original UV/normal
 # vertex splits and even coincident faces must remain unchanged for rendering.
 # Reconstruct a connected binding surface across GLB UV/normal splits. The
 # render mesh is immutable. The explicit source-index map transfers the solve;
 # no nearest-bone or nearest-surface weight fallback is used. Ten micrometres
 # only closes floating-point seams, checked against each actual source vertex.
 bm=bmesh.new();bm.from_mesh(model.data);bm.verts.ensure_lookup_table()
 targets=bmesh.ops.find_doubles(bm,verts=list(bm.verts),dist=1e-5)['targetmap']
 representatives=[]
 for v in bm.verts:
  at=v
  while at in targets:at=targets[at]
  representatives.append(at.index)
 unique=sorted(set(representatives));indices={i:n for n,i in enumerate(unique)};mapping=[indices[i] for i in representatives]
 points=[tuple(model.data.vertices[i].co) for i in unique];faces=[];seen_faces=set();model.data.calc_loop_triangles()
 for tri in model.data.loop_triangles:
  face=tuple(mapping[i] for i in tri.vertices);key=tuple(sorted(face))
  if len(set(face))<3 or key in seen_faces:continue
  faces.append(face);seen_faces.add(key)
 bm.free();proxy_mesh=bpy.data.meshes.new(name+'-binding-surface');proxy_mesh.from_pydata(points,[],faces);proxy_mesh.update()
 proxy=bpy.data.objects.new(name+'-heat-binding-proxy',proxy_mesh);bpy.context.collection.objects.link(proxy)
 displacement=max((model.data.vertices[i].co-proxy.data.vertices[mapping[i]].co).length for i in range(len(mapping)))
 if displacement>1.0001e-5:raise RuntimeError(name+': binding proxy exceeds the measured seam weld tolerance')
 print('BIND-TOPOLOGY',name,'original preserved',source_triangles,'proxy triangles',len(faces),'maximum proxy weld displacement',displacement,flush=True)
 bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
 rig=bpy.context.object;rig.name=name+'-control-rig';rig.show_in_front=True
 rig.data.edit_bones.remove(rig.data.edit_bones[0])
 for bone_name,head,tail,parent,deform in defs:
  bone=rig.data.edit_bones.new(bone_name);bone.head=head;bone.tail=tail;bone.use_deform=deform
  if parent:bone.parent=rig.data.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT')
 bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
 bpy.ops.object.parent_set(type='ARMATURE_AUTO')
 modifiers=[m for m in proxy.modifiers if m.type=='ARMATURE']
 if len(modifiers)!=1:raise RuntimeError(name+': no actual armature deformation modifier')
 modifiers[0].use_deform_preserve_volume=True
 groups={g.index:g.name for g in proxy.vertex_groups}
 totals={b[0]:0.0 for b in defs if b[4]};missing=[]
 authored={}
 if name in corrections:
  correction=corrections[name]
  if correction['source_sha256']!=model['source_sha256']:raise RuntimeError(name+': manual skin correction source changed')
  for part in correction['corrections']:
   if part['bone'] not in totals:raise RuntimeError(name+': manual attachment refers to missing bone')
   for i in part['vertices']:authored[mapping[i]]=[(part['bone'],1.0)]
 solved={};used_authored=set()
 for v in proxy.data.vertices:
  weights=[(groups[g.group],g.weight) for g in v.groups if groups.get(g.group) in totals and g.weight>0]
  total=sum(w for _,w in weights)
  if total<1e-8:
   if v.index in authored:solved[v.index]=authored[v.index];used_authored.add(v.index)
   else:missing.append(v.index)
   continue
  solved[v.index]=[(group,w/total) for group,w in weights]
 if missing:
  diagnostics=os.path.join(repo,'build/act1-overhaul/skin-diagnostics');os.makedirs(diagnostics,exist_ok=True)
  data={'name':name,'source_sha256':model['source_sha256'],'missing':[{'proxy_vertex':i,'position':list(proxy.data.vertices[i].co),'original_vertices':[v.index for v in model.data.vertices if mapping[v.index]==i]} for i in missing]}
  json.dump(data,open(os.path.join(diagnostics,name+'.json'),'w',encoding='utf-8'),indent=2)
  bpy.ops.wm.save_as_mainfile(filepath=os.path.join(diagnostics,name+'-binding-failed.blend'))
  raise RuntimeError(name+': bone heat left '+str(len(missing))+' unweighted vertices; no fallback allowed')
 # Standard topological weight smoothing removes heat-solver discontinuities
 # on thin generated surfaces. Authored rigid teeth/debris remain pinned. This
 # edits real source skin weights, not vertex motion in the renderer.
 names=list(totals);bone_indices={n:i for i,n in enumerate(names)};dense=np.zeros((len(points),len(names)))
 for i,weights in solved.items():
  for group,w in weights:dense[i,bone_indices[group]]=w
 neighbors=[set() for _ in points]
 for e in proxy.data.edges:a,b=e.vertices;neighbors[a].add(b);neighbors[b].add(a)
 for iteration in range(16):
  previous=dense.copy()
  for i,adjacent in enumerate(neighbors):
   if i not in used_authored and adjacent:dense[i]=.5*previous[i]+.5*previous[list(adjacent)].mean(axis=0)
 # Reviewed connected crease patches use an identical actual influence vector
 # in the core. DQS is then one rigid map there, so a thin source fold cannot
 # invert internally. A harmonic two-ring boundary joins the original paint.
 # No vertex positions, nearest-bone assignment or runtime correction is used.
 patches=corrections.get(name,{}).get('crease_patches',[]);fixed={};unknown=set()
 for patch in patches:
  if any(not isinstance(i,int) or i<0 or i>=len(mapping) for i in patch['vertices']):raise RuntimeError('crease support vertex outside reviewed source')
  core={mapping[i] for i in patch['vertices']};rings=int(patch['boundary_rings'])
  if not core or rings<1 or rings>8:raise RuntimeError('invalid crease support patch')
  mean=dense[sorted(core)].mean(axis=0);mean/=mean.sum()
  for i in core:
   if i in fixed:raise RuntimeError('overlapping crease paint cores must be reviewed together')
   if i in used_authored:raise RuntimeError('crease paint cannot overwrite authored rigid fragments')
   fixed[i]=mean
  region=set(core);frontier=set(core)
  for ring in range(rings):
   frontier={j for i in frontier for j in neighbors[i]}-region;region.update(frontier)
  unknown.update(region-core)
 if fixed:
  unknown-=fixed.keys();unknown-=used_authored;ordered=sorted(unknown);lookup={v:i for i,v in enumerate(ordered)}
  matrix=np.zeros((len(ordered),len(ordered)));rhs=np.zeros((len(ordered),len(names)))
  for v in ordered:
   row=lookup[v];matrix[row,row]=len(neighbors[v])
   for other in neighbors[v]:
    if other in lookup:matrix[row,lookup[other]]-=1
    else:rhs[row]+=fixed[other] if other in fixed else dense[other]
  relaxed=np.linalg.solve(matrix,rhs) if ordered else np.zeros((0,len(names)))
  if relaxed.size and (relaxed.min()<-1e-10 or np.max(abs(relaxed.sum(axis=1)-1))>1e-8):raise RuntimeError('harmonic skin paint lost convexity')
  for i,weights in fixed.items():dense[i]=weights
  for v,weights in zip(ordered,relaxed):dense[v]=np.maximum(weights,0)/np.maximum(weights,0).sum()
  print('CREASE-SUPPORT',name,'patches',len(patches),'fixed physical vertices',len(fixed),'harmonic boundary vertices',len(ordered),flush=True)
 for i,row in enumerate(dense):
  kept=np.argsort(row)[-8:];total=row[kept].sum();solved[i]=[(names[k],float(row[k]/total)) for k in kept if row[k]>0]
 for bone_name in totals:model.vertex_groups.new(name=bone_name)
 for v in model.data.vertices:
  weights=solved.get(mapping[v.index])
  if not weights:raise RuntimeError(name+': no exact original-position match in the solved skin')
  for group,w in weights:model.vertex_groups[group].add([v.index],w,'REPLACE');totals[group]+=w
 model.parent=rig
 modifier=model.modifiers.new('Actual bone-heat skin','ARMATURE');modifier.object=rig;modifier.use_deform_preserve_volume=True
 proxy.hide_render=True;proxy.hide_set(True);proxy['binding_proxy']=True;model['runtime_bind']=True
 empty=[n for n,w in totals.items() if w<.01]
 if empty:raise RuntimeError(name+': inspect unused deform controls '+repr(empty))
 if name=='timbermaw-larva':
  action(rig,'idle',120,[(0,{}),(30,{'Thorax':(2,0,0),'Jaw.Lower':(3,0,0)}),(66,{'Thorax':(-1,0,0),'Jaw.Upper':(-2,0,0)}),(94,{'Neck':(1,1,0)}),(120,{})],True)
  action(rig,'move',72,[(0,{}),(18,{'Abdomen.Rear':(9,0,0),'Abdomen.Middle':(-14,0,0),'Thorax':(8,0,0)}),(39,{'Abdomen.Rear':(-6,0,0),'Abdomen.Middle':(12,0,0),'Thorax':(-8,0,0)}),(57,{'Abdomen.Middle':(-4,0,0),'Neck':(4,0,0)}),(72,{})],True,stride=1.5)
  action(rig,'attack',120,[(0,{}),(22,{'Neck':(-12,0,0),'Jaw.Lower':(-8,0,0),'Jaw.Upper':(4,0,0)}),(40,{'Neck':(12,0,0),'Jaw.Lower':(14,0,0),'Jaw.Upper':(-4,0,0)}),(54,{'Neck':(5,0,0),'Jaw.Lower':(10,0,0)}),(86,{'Thorax':(-4,0,0)}),(120,{})],impact=40)
  action(rig,'hit',24,[(0,{}),(5,{'Thorax':(-12,0,4),'Neck':(-16,0,-3),'Jaw.Lower':(11,0,0)}),(12,{'Thorax':(5,0,-2),'Neck':(4,0,0)}),(24,{})])
  action(rig,'death',90,[(0,{}),(14,{'Thorax':(-12,0,8),'Neck':(10,0,12),'Jaw.Lower':(8,0,0)}),(40,{'Abdomen.Rear':(8,0,-18),'Thorax':(-10,0,12),'Neck':(-12,0,5),'Jaw.Upper':(2,0,0),'Jaw.Lower':(8,0,0)}),(90,{'Abdomen.Rear':(8,0,-18),'Thorax':(-10,0,12),'Neck':(-12,0,5),'Jaw.Upper':(2,0,0),'Jaw.Lower':(8,0,0)})])
  if '--skip-death-contact-curves' not in sys.argv:
   sys.path.insert(0,os.path.dirname(__file__))
   from larva_contact import apply_curve
   curve_path=os.path.join(base,name,'death-contact-curve.json')
   if not os.path.exists(curve_path):raise RuntimeError('reviewed Larva death contact curve missing; use --skip-death-contact-curves only to author a new baseline')
   apply_curve(rig,model,curve_path)
 elif name=='living-tsunami':
  action(rig,'idle',120,[(0,{}),(30,{'Crest.Curl':(0,5,0),'Crest.Tip':(0,-8,0),'Wake.Tip':(0,4,0)}),(70,{'Surge.Spine':(0,-4,0),'Crest.Curl':(0,-4,0),'Surge.Tip':(0,6,0)}),(120,{})],True)
  action(rig,'move',60,[(0,{}),(17,{'Surge.Spine':(0,8,0),'Crest.Curl':(0,-12,0),'Surge.Tip':(0,10,0)}),(39,{'Surge.Spine':(0,-6,0),'Crest.Curl':(0,9,0),'Wake.Tip':(0,-10,0)}),(60,{})],True,stride=1.8)
  action(rig,'attack',120,[(0,{}),(22,{'Crest.Rise':(-9,0,0),'Crest.Curl':(8,-15,0),'Crest.Tip':(-15,0,0)}),(40,{'Crest.Rise':(18,0,0),'Crest.Curl':(-12,25,0),'Crest.Tip':(22,0,0),'Surge.Middle':(14,0,0)}),(65,{'Crest.Rise':(8,0,0),'Wake.Low':(-10,0,0)}),(120,{})],impact=40)
  action(rig,'hit',24,[(0,{}),(6,{'Surge.Spine':(-12,0,8),'Crest.Curl':(12,0,-8),'Surge.Middle':(-16,0,0)}),(15,{'Surge.Spine':(5,0,-3)}),(24,{})])
  action(rig,'death',90,[(0,{}),(30,{'Surge.Spine':(25,0,0),'Crest.Rise':(10,0,0),'Crest.Curl':(5,0,0)}),(65,{'Surge.Spine':(65,0,0),'Crest.Rise':(20,0,0),'Crest.Curl':(15,0,0)}),(90,{'Surge.Spine':(65,0,0),'Crest.Rise':(20,0,0),'Crest.Curl':(15,0,0)})])
 else:
  action(rig,'idle',120,[(0,{}),(35,{'Vortex.Middle':(0,0,6),'Crest.L':(0,5,0),'Gust.R':(0,-7,0)}),(80,{'Vortex.Middle':(0,0,-5),'Crest.R':(0,-6,0),'Gust.L':(0,7,0)}),(120,{})],True)
  action(rig,'move',60,[(0,{}),(16,{'Vortex.Lower':(6,0,8),'Vortex.Crown':(-8,0,-10),'Crest.L.Tip':(0,9,0)}),(39,{'Vortex.Lower':(-5,0,-8),'Vortex.Crown':(7,0,10),'Crest.R.Tip':(0,-9,0)}),(60,{})],True,stride=2.6)
  action(rig,'attack',280,[(0,{}),(80,{'Vortex.Crown':(-15,0,0),'Crest.L':(0,18,0),'Crest.R':(0,-18,0)}),(120,{'Vortex.Crown':(22,0,0),'Gust.L':(16,0,0),'Gust.R':(16,0,0)}),(190,{'Vortex.Crown':(12,0,0)}),(280,{})],impact=120)
  action(rig,'hit',24,[(0,{}),(5,{'Vortex.Crown':(-10,0,12),'Crest.L':(0,-12,0),'Crest.R':(0,10,0)}),(13,{'Vortex.Crown':(4,0,-4)}),(24,{})])
  action(rig,'death',120,[(0,{}),(30,{'Vortex.Lower':(20,0,20),'Vortex.Crown':(-25,0,-20),'Crest.L':(0,30,0),'Crest.R':(0,-30,0)}),(80,{'Vortex.Tail':(55,0,15),'Vortex.Middle':(-35,0,30),'Vortex.Crown':(40,0,-45),'Crest.L':(0,65,0),'Crest.R':(0,-65,0)}),(120,{'Vortex.Tail':(55,0,15),'Vortex.Middle':(-35,0,30),'Vortex.Crown':(40,0,-45),'Crest.L':(0,65,0),'Crest.R':(0,-65,0)})])
  patterns={
   'shockwave':(320,{'Vortex.Lower':(-18,0,0),'Crest.L':(0,-25,0),'Crest.R':(0,25,0)},{'Vortex.Lower':(20,0,0),'Gust.L':(0,35,0),'Gust.R':(0,-35,0)}),
   'charge':(280,{'Vortex.Crown':(-22,0,0),'Crest.L.Tip':(0,-16,0),'Crest.R.Tip':(0,16,0)},{'Vortex.Crown':(28,0,0),'Vortex.Middle':(12,0,0)}),
   'shard_rain':(320,{'Crest.Center':(-18,0,0),'Crest.L':(0,22,0),'Crest.R':(0,-22,0)},{'Crest.Center':(12,0,0),'Crest.L.Tip':(0,-30,0),'Crest.R.Tip':(0,30,0)}),
   'sweep':(360,{'Vortex.Middle':(0,0,-28),'Crest.L':(0,-20,0),'Gust.R':(0,25,0)},{'Vortex.Middle':(0,0,28),'Crest.R':(0,20,0),'Gust.L':(0,-25,0)})}
  for clip,(duration,ready,strike) in patterns.items():action(rig,clip,duration,[(0,{}),(90,ready),(120,strike),(duration-60,ready),(duration,{})],impact=120)
 rig.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.render.fps=60;bpy.context.scene.frame_set(0)
 rig['source_mesh_sha256']=model['source_sha256'];rig['binding_method']='Blender bone heat'+(' + reviewed connected crease supports' if patches else '')+', original mesh UVs and PBR retained; no fallback';rig['quality_status']='SOURCE_RIG_CREATED_RUNTIME_AND_MOTION_QA_PENDING'
 rig['skin_corrections_sha256']=hashlib.sha256(open(corrections_path,'rb').read()).hexdigest()
 os.makedirs(os.path.join(output_root,name),exist_ok=True)
 out=os.path.join(output_root,name,'control-rig.blend');bpy.ops.wm.save_as_mainfile(filepath=out)
 report={'name':name,'bones':len(defs),'vertices':len(model.data.vertices),'weighted_vertices':len(model.data.vertices),'deform_bone_totals':totals,'clips':[a.name for a in bpy.data.actions if a.use_fake_user],'dcc':os.path.relpath(out,repo),'status':'real DCC armature/actions created; animation quality review still pending'}
 reports.append(report);print('CUSTOM-RIG',json.dumps(report),flush=True)
report_name='custom-rigs-'+selected+'.json' if selected else 'custom-rigs.json'
json.dump({'models':reports},open(os.path.join(output_root,report_name),'w',encoding='utf-8'),indent=2)
