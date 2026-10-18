"""Render the exported runtime bytes and baked maps, not the source scene."""
import bpy, os, sys, struct, math, numpy as np
from mathutils import Vector
root=os.path.dirname(os.path.abspath(__file__))
kinds=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['charger','caster','boss']
for kind in kinds:
 for clip in ['walk_00','attack_03','death']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with open(os.path.join(root,kind+'_'+clip+'.zkmodel'),'rb') as stream:raw=stream.read()
    magic,nv,ni,flags=struct.unpack_from('<4sIII',raw)
    data=np.frombuffer(raw,dtype='<f4',count=nv*9,offset=16).reshape((nv,9));faces=np.frombuffer(raw,dtype='<u4',count=ni,offset=16+nv*36).reshape((-1,3))
    points=[(-float(v[0]),float(v[2]),float(v[1])) for v in data]
    normals=[(-float(v[3]),float(v[5]),float(v[4])) for v in data]
    mesh=bpy.data.meshes.new(kind);mesh.from_pydata(points,[],faces.tolist());mesh.use_auto_smooth=True;mesh.normals_split_custom_set_from_vertices(normals)
    uv=mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:uv.data[loop.index].uv=(float(data[loop.vertex_index,6]),1-float(data[loop.vertex_index,7]))
    for poly in mesh.polygons:poly.use_smooth=True
    obj=bpy.data.objects.new(kind,mesh);bpy.context.scene.collection.objects.link(obj)
    mat=bpy.data.materials.new(kind);mat.use_nodes=True;mesh.materials.append(mat);nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes.get('Principled BSDF')
    image=bpy.data.images.load(os.path.join(root,kind+'.jpg'));colour=nodes.new('ShaderNodeTexImage');colour.image=image;links.new(colour.outputs[0],shader.inputs['Base Color'])
    nar=bpy.data.images.load(os.path.join(root,kind+'.nar.jpg'));nar.colorspace_settings.name='Non-Color';pixels=np.asarray(nar.pixels[:],dtype=np.float32).reshape((-1,4))
    normal_pixels=pixels.copy();normal_pixels[:,2]=.5+.5*np.sqrt(np.maximum(0,1-(pixels[:,0]*2-1)**2-(pixels[:,1]*2-1)**2))
    normal=bpy.data.images.new('Normal XYZ',width=nar.size[0],height=nar.size[1]);normal.colorspace_settings.name='Non-Color';normal.pixels.foreach_set(normal_pixels.ravel())
    tex=nodes.new('ShaderNodeTexImage');tex.image=normal;mapping=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs[0],mapping.inputs['Color']);links.new(mapping.outputs[0],shader.inputs['Normal'])
    packed=nodes.new('ShaderNodeTexImage');packed.image=nar;split=nodes.new('ShaderNodeSeparateRGB');links.new(packed.outputs[0],split.inputs[0]);links.new(split.outputs['B'],shader.inputs['Roughness'])
    metalpath=os.path.join(root,kind+'.metal.jpg')
    if os.path.exists(metalpath):
      metal=nodes.new('ShaderNodeTexImage');metal.image=bpy.data.images.load(metalpath);metal.image.colorspace_settings.name='Non-Color';links.new(metal.outputs[0],shader.inputs['Metallic'])
    low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)]);center=(low+high)/2;size=max(high-low)
    bpy.ops.mesh.primitive_plane_add(size=size*2.2,location=(0,0,-.01))
    floor=bpy.context.object;floor_mat=bpy.data.materials.new('Support plane');floor_mat.diffuse_color=(.035,.04,.045,1);floor.data.materials.append(floor_mat)
    bpy.ops.object.camera_add(location=center+Vector((size*.85,-size*1.8,size*.55)))
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=size*1.23
    scene=bpy.context.scene;scene.camera=camera;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('studio');scene.world.color=(.05,.05,.05);scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast'
    for offset,energy in [((1,-2,3),450),((-2,-1,2),230),((0,2,2),350)]:
      bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*size);light=bpy.context.object;light.data.energy=energy*size*size;light.data.size=size
      light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(root,'review-'+kind+'-'+clip+'.png');bpy.ops.render.render(write_still=True)
    if clip=='walk_00':
      for direction,label in [(-1,'front'),(1,'back')]:
        camera.location=center+Vector((0,direction*size*2,size*.1));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=os.path.join(root,'review-'+kind+'-'+label+'.png');bpy.ops.render.render(write_still=True)
    print('RUNTIME-REVIEW',kind,clip,'bounds',list(low),list(high),'vertices',nv,'triangles',ni//3)
