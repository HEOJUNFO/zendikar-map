"""Polish actual Studio creature rigs with editable, anatomy-specific actions.
The paid serpent clip is kept intact as studio_march_source and is the base of
move. Wing controls below were identified from actual bone coordinates.
"""
import bpy,os,json,math,sys
from mathutils import Vector,Euler
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));base=repo+'/game/art-work/act1/rigging'
def key(rig,frame,turns,root=(0,0,0),skip=()):
 for p in rig.pose.bones:
  if p.name in skip:continue
  p.rotation_mode='QUATERNION';basis=p.bone.matrix_local.to_quaternion()
  angles=turns.get(p.name,(0,0,0))
  p.rotation_quaternion=basis.inverted()@Euler(tuple(math.radians(a) for a in angles)).to_quaternion()@basis
  p.location=basis.inverted()@Vector(root) if p.parent is None else Vector((0,0,0));p.scale=(1,1,1)
  p.keyframe_insert('rotation_quaternion',frame=frame);p.keyframe_insert('location',frame=frame)
def clip(rig,name,duration,poses,loop=False,impact=None,stride=0,source=None,skip=()):
 a=source.copy() if source else bpy.data.actions.new(name);a.name=name;rig.animation_data_create();rig.animation_data.action=a
 for frame,turns in poses:key(rig,frame,turns,(0,stride*frame/duration,0),skip)
 a['duration_ticks']=duration;a['loop']=loop;a['root_stride_m']=stride
 if impact is not None:a['impact_tick']=impact
 a.use_fake_user=True
 for curve in a.fcurves:
  for k in curve.keyframe_points:k.handle_left_type='AUTO_CLAMPED';k.handle_right_type='AUTO_CLAMPED'
 return a
selected=sys.argv[sys.argv.index('--model')+1] if '--model' in sys.argv else None
if selected is not None and selected not in ['river-boa','sky-ruin-drake']:raise ValueError('unknown service-rig creature: '+selected)
input_root=os.path.abspath(sys.argv[sys.argv.index('--rig-dir')+1]) if '--rig-dir' in sys.argv else base
output_root=os.path.abspath(sys.argv[sys.argv.index('--output-dir')+1]) if '--output-dir' in sys.argv else base
for name in ['river-boa','sky-ruin-drake']:
 if selected is not None and name!=selected:continue
 bpy.ops.wm.open_mainfile(filepath=input_root+'/'+name+('/control-rig.blend' if '--rig-dir' in sys.argv else '/service-bind.blend'))
 scene=bpy.context.scene;scene.render.fps=60
 rig=next(o for o in scene.objects if o.type=='ARMATURE')
 if name=='sky-ruin-drake' and '--skip-drake-review' not in sys.argv:
  sys.path.insert(0,os.path.dirname(__file__))
  from drake_review import apply_skin_geometry,apply_motion
  review_path=base+'/'+name+'/skin-motion-review.json'
  model=next(o for o in scene.objects if o.type=='MESH' and o.get('runtime_bind'))
  apply_skin_geometry(rig,model,review_path)
 if '--rig-dir' in sys.argv:
  for action_name in ['idle','move','attack','hit','death']:
   if action_name in bpy.data.actions:bpy.data.actions[action_name].name='before_service_review::'+action_name
 for m in [o for o in scene.objects if o.type=='MESH']:
  for modifier in m.modifiers:
   if modifier.type=='ARMATURE':modifier.use_deform_preserve_volume=True
 if name=='river-boa':
  bpy.ops.import_scene.gltf(filepath=base+'/service-results/boa-move/editable.glb')
  source_rig=next(o for o in scene.objects if o.type=='ARMATURE' and o!=rig);source=source_rig.animation_data.action;source.name='studio_march_source';source.use_fake_user=True
  bpy.data.objects.remove(source_rig,do_unlink=True)
  head='tripo::Head_0';neck='tripo::Tail_6';coil='tripo::Tail_4'
  clip(rig,'idle',120,[(0,{}),(34,{head:(-2,0,-3),neck:(1,0,1)}),(77,{head:(1,0,3),neck:(-1,0,-1)}),(120,{})],True)
  source['review_status']='REJECTED_FOR_RUNTIME: original preset drives coiled belly 9.7cm through floor; preserved for provenance'
  clip(rig,'move',75,[(0,{}),(18,{'bone_1':(0,0,-4),'bone_2':(0,0,7),'bone_3':(0,0,-10),'tripo::Tail_0':(0,0,4),'tripo::Tail_2':(0,0,-5),coil:(0,0,4),neck:(2,0,-3)}),(39,{'bone_1':(0,0,4),'bone_2':(0,0,-6),'bone_3':(0,0,9),'tripo::Tail_0':(0,0,-4),'tripo::Tail_2':(0,0,5),coil:(0,0,-4),neck:(-2,0,3)}),(57,{'bone_4':(0,0,6),'bone_5':(0,0,-8),head:(0,0,2)}),(75,{})],True,stride=1.5)
  clip(rig,'attack',120,[(0,{}),(23,{coil:(0,0,-6),neck:(18,0,0),head:(12,0,0)}),(40,{coil:(0,0,5),neck:(-27,0,0),head:(-15,0,0),'tripo::Head_1':(12,0,0)}),(52,{neck:(-14,0,0),head:(-7,0,0)}),(80,{neck:(7,0,0)}),(120,{})],impact=40)
  clip(rig,'hit',24,[(0,{}),(5,{neck:(18,0,7),head:(12,0,-6),coil:(4,0,-3)}),(14,{neck:(-5,0,-3)}),(24,{})])
  down={coil:(0,0,22),neck:(40,0,34),head:(-25,0,-10),'tripo::Head_2':(12,0,-12)}
  clip(rig,'death',90,[(0,{}),(15,{neck:(-12,0,-15),head:(-10,0,10)}),(44,down),(90,down)])
  # Actual DCC inverse kinematics folds the seven-bone upper chain to an
  # authored ground contact, with bone stretching disabled. It is baked from
  # evaluated bones, not replaced by a whole-model fall/rotation in the game.
  bpy.ops.object.empty_add(location=rig.data.bones['tripo::Head_4'].tail_local)
  goal=bpy.context.object;goal.name='Boa death head ground contact'
  contact=rig.pose.bones['tripo::Head_4'].constraints.new('IK');contact.name='Death head contact IK';contact.target=goal;contact.chain_count=7;contact.use_stretch=False;contact.iterations=500
  for action_name in ['idle','move','attack','hit','death']:
   rig.animation_data.action=bpy.data.actions[action_name];contact.influence=0;contact.keyframe_insert('influence',frame=0)
  rig.animation_data.action=bpy.data.actions['death']
  for frame,influence in [(14,.15),(40,1),(90,1)]:contact.influence=influence;contact.keyframe_insert('influence',frame=frame)
  # Keep the head contact outside the tail coil. The former (.35,.90,.14)
  # target sent the actual upper-neck skin through the tail during death.
  for frame,point in [(0,rig.data.bones['tripo::Head_4'].tail_local),(25,(.55,1.15,.55)),(55,(.60,1.25,.16)),(90,(.60,1.25,.16))]:goal.location=point;goal.keyframe_insert('location',frame=frame)
  for curve in goal.animation_data.action.fcurves:
   for key in curve.keyframe_points:key.interpolation='BEZIER';key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
 else:
  # Two legs, two asymmetric folded wings in the actual mesh, with membrane
  # fingers below each wrist. These are not humanoid arm aliases.
  # Spine_2 is the shoulder girdle and parents both wings. The actual cranial
  # root is Head_0; head strikes must not rotate the whole wing attachment.
  left='bone_24';right='tripo::Spine_3';el='bone_25';er='bone_32';wl='bone_26';wr='bone_33';neck='tripo::Head_0';head='tripo::Head_1'
  up={left:(0,22,0),right:(0,-22,0),el:(0,-12,-7),er:(0,12,7),wl:(0,-8,0),wr:(0,8,0),'tripo::Tail_3':(0,0,-3)}
  down={left:(0,-24,0),right:(0,24,0),el:(0,8,5),er:(0,-8,-5),wl:(0,6,0),wr:(0,-6,0),neck:(-3,0,0),'tripo::Tail_3':(0,0,3)}
  clip(rig,'idle',72,[(0,{}),(16,up),(40,down),(58,{left:(0,-8,0),right:(0,8,0)}),(72,{})],True)
  clip(rig,'move',48,[(0,{}),(9,up),(24,down),(36,{left:(0,-12,0),right:(0,12,0),el:(0,4,0),er:(0,-4,0)}),(48,{})],True,stride=3.2)
  clip(rig,'attack',120,[(0,{}),(22,{**up,neck:(18,0,0),head:(8,0,0)}),(40,{**down,neck:(-25,0,0),head:(-16,0,0),'tripo::0_Left_Limb_0':(35,0,0),'tripo::0_Right_Limb_0':(35,0,0)}),(58,{**down,neck:(-10,0,0)}),(90,up),(120,{})],impact=40)
  clip(rig,'hit',24,[(0,{}),(5,{left:(0,-20,-12),right:(0,-5,-12),neck:(16,0,9),'tripo::Tail_0':(0,0,-12)}),(14,{left:(0,8,3),right:(0,-8,3)}),(24,{})])
  # Death includes a whole upper-torso collapse. Keep that distinct from the
  # cranial recoil control used by living strikes and hit reactions.
  torso='tripo::Spine_2'
  fallen={'tripo::Root':(80,0,20),left:(0,-48,20),right:(0,42,-18),torso:(34,0,10),head:(28,0,-12),'tripo::Tail_0':(0,0,30),'tripo::0_Left_Limb_0':(-30,0,-15),'tripo::0_Right_Limb_0':(-30,0,15)}
  clip(rig,'death',100,[(0,{}),(15,{**up,torso:(-18,0,-12)}),(48,fallen),(100,fallen)])
  p=rig.pose.bones['tripo::Root'];basis=p.bone.matrix_local.to_quaternion()
  for frame,height in [(0,0),(15,0),(25,.2),(35,.4),(48,.334),(100,.334)]:p.location=basis.inverted()@Vector((0,0,height));p.keyframe_insert('location',frame=frame)
 if name=='sky-ruin-drake' and '--skip-drake-review' not in sys.argv:apply_motion(rig,model,review_path)
 rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(0)
 rig['quality_status']='AUTHORED_ACTIONS_RUNTIME_AND_CONTACT_REVIEW_PENDING'
 os.makedirs(output_root+'/'+name,exist_ok=True)
 bpy.ops.wm.save_as_mainfile(filepath=output_root+'/'+name+'/control-rig.blend')
 print('SERVICE-CLIPS',name,len(rig.data.bones),flush=True)
