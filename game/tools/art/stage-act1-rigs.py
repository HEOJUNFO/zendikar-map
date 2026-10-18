"""Create editable DCC staging files from the actual five bind meshes.
No rig or animation is invented by this staging pass. Rendered images are DCC
inspection, never claimed as actual game animation evidence.
"""
import bpy, json, os, math, hashlib
from mathutils import Vector,Matrix
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
manifest=json.load(open(os.path.join(repo,'game/art-work/act1/generated/manifest.json'),encoding='utf-8'))
target=os.path.join(repo,'game/art-work/act1/rigging');os.makedirs(target,exist_ok=True)
review=os.path.join(repo,'build/act1-overhaul/rig-staging');os.makedirs(review,exist_ok=True)
limits=[(1.05,1.73),(.72,1.76),(.72,1.76),(.75,1.69),(3.65,4.84)]
# Individually reviewed against front/side/top renders, not a guessed common
# source forward axis. Tripo outputs these five objects in different directions.
yaws=[3*math.pi/4,-math.pi/2,math.pi/2,0,-math.pi/2]
records=[]
for index,record in enumerate(manifest['models']):
 name=record['name'];source=os.path.join(repo,'game/art-work/act1/generated',name,name+'.glb')
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=source)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 if len(meshes)!=1:raise RuntimeError(name+': inspect multiple meshes before creating the rig source')
 obj=meshes[0];world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=Matrix.Rotation(yaws[index],4,'Z')@world
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 points=[v.co.copy() for v in obj.data.vertices]
 low=Vector(tuple(min(p[a] for p in points) for a in range(3)));high=Vector(tuple(max(p[a] for p in points) for a in range(3)))
 radius,height=limits[index];scale=min(2*radius/max(high.x-low.x,high.y-low.y),height/(high.z-low.z))
 center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
 for v in obj.data.vertices:v.co=(v.co-center)*scale
 obj.name=name;obj.data.name=name+'-bind';obj['source_sha256']=hashlib.sha256(open(source,'rb').read()).hexdigest()
 obj['rig_status']='UNRIGGED_REFERENCE_ONLY';obj['era']='act1-ZEN';obj.data.update()
 for other in list(bpy.data.objects):
  if other!=obj:bpy.data.objects.remove(other,do_unlink=True)
 out=os.path.join(target,name);os.makedirs(out,exist_ok=True)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'bind-reference.blend'))
 # Inspect with the original PBR materials in three anatomical views.
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.use_gtao=True;scene.eevee.gtao_distance=.25
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.34,.38,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 bpy.ops.object.light_add(type='AREA',location=(radius*2,radius*3,height*3));lamp=bpy.context.object;lamp.data.energy=500 if index<4 else 3500;lamp.data.size=radius*4;lamp.rotation_euler=(Vector((0,0,height*.4))-lamp.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
 actual=max(v.co.z for v in obj.data.vertices);camera.data.ortho_scale=max(radius*2.6,actual*1.3)
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 center=Vector((0,0,actual*.5))
 for view,offset in [('front',(0,8,0)),('side',(8,0,0)),('top',(0,0,8))]:
  camera.location=center+Vector(offset);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=os.path.join(review,name+'-'+view+'.png');bpy.ops.render.render(write_still=True)
 points=[v.co for v in obj.data.vertices]
 entry={'name':name,'source_sha256':obj['source_sha256'],'scale':scale,'source_yaw_radians':yaws[index],'dcc_file':os.path.relpath(os.path.join(out,'bind-reference.blend'),repo),'rigged':False,'animated':False,'bounds_blender':{'min':[min(p[a] for p in points) for a in range(3)],'max':[max(p[a] for p in points) for a in range(3)]}}
 records.append(entry);print('RIG-STAGING',json.dumps(entry),flush=True)
json.dump({'models':records,'status':'DCC reference only; not rigged or animated'},open(os.path.join(target,'staging.json'),'w',encoding='utf-8'),indent=2)
