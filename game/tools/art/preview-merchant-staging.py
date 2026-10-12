"""Inspect actual exported merchant/furniture meshes, dimensions and contact.

Blender --background --factory-startup --disable-autoexec --python-exit-code 1
--python game/tools/art/preview-merchant-staging.py -- build/merchant-staging
No source models or runtime assets are changed.
"""
import bpy, hashlib, json, math, os, struct, sys
from mathutils import Vector, Matrix
ROOT = os.path.abspath('game/gameplay/content')
OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
LAYERS = ['desk', 'chair', 'bookshelf', 'book_cover', 'book_paper', 'candle', 'cloth']
materials = []
input_paths = {os.path.abspath(__file__), os.path.join(ROOT,'merchant-props','layout.json')}
for name in LAYERS + ['lady', 'amphora']:
    material = bpy.data.materials.new(name); material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get('Principled BSDF')
    texture = nodes.new('ShaderNodeTexImage')
    path = os.path.join(ROOT, 'creatures', 'old-lady', 'body.jpg') if name == 'lady' else os.path.join(ROOT, 'props', 'textures', 'antique_ceramic_vase_01.jpg') if name == 'amphora' else os.path.join(ROOT, 'merchant-props', 'textures', name + '.jpg')
    texture.image = bpy.data.images.load(path)
    input_paths.add(path);input_paths.add(path.replace('.jpg','.nar.jpg'))
    links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    metal_path=path.replace('.jpg','.metal.jpg')
    if os.path.exists(metal_path):
        input_paths.add(metal_path)
        metal=nodes.new('ShaderNodeTexImage');metal.image=bpy.data.images.load(metal_path);metal.image.colorspace_settings.name='Non-Color';links.new(metal.outputs['Color'],shader.inputs['Metallic'])
    nar = nodes.new('ShaderNodeTexImage'); nar.image = bpy.data.images.load(path.replace('.jpg', '.nar.jpg')); nar.image.colorspace_settings.name='Non-Color'
    separate=nodes.new('ShaderNodeSeparateColor');links.new(nar.outputs['Color'],separate.inputs['Color'])
    links.new(separate.outputs['Blue'],shader.inputs['Roughness'])
    # Reconstruct the runtime NAR's normal Z; blue contains roughness, not Z.
    squares=[]
    for channel in ['Red','Green']:
        signed=nodes.new('ShaderNodeMath');signed.operation='MULTIPLY_ADD';signed.inputs[1].default_value=2;signed.inputs[2].default_value=-1;links.new(separate.outputs[channel],signed.inputs[0])
        square=nodes.new('ShaderNodeMath');square.operation='MULTIPLY';links.new(signed.outputs[0],square.inputs[0]);links.new(signed.outputs[0],square.inputs[1]);squares.append(square)
    sumxy=nodes.new('ShaderNodeMath');sumxy.operation='ADD';links.new(squares[0].outputs[0],sumxy.inputs[0]);links.new(squares[1].outputs[0],sumxy.inputs[1])
    rest=nodes.new('ShaderNodeMath');rest.operation='SUBTRACT';rest.inputs[0].default_value=1;links.new(sumxy.outputs[0],rest.inputs[1])
    clamp=nodes.new('ShaderNodeMath');clamp.operation='MAXIMUM';clamp.inputs[1].default_value=.04;links.new(rest.outputs[0],clamp.inputs[0])
    root=nodes.new('ShaderNodeMath');root.operation='SQRT';links.new(clamp.outputs[0],root.inputs[0])
    encode=nodes.new('ShaderNodeMath');encode.operation='MULTIPLY_ADD';encode.inputs[1].default_value=.5;encode.inputs[2].default_value=.5;links.new(root.outputs[0],encode.inputs[0])
    combine=nodes.new('ShaderNodeCombineColor');links.new(separate.outputs['Red'],combine.inputs['Red']);links.new(separate.outputs['Green'],combine.inputs['Green']);links.new(encode.outputs[0],combine.inputs['Blue'])
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=1.4;links.new(combine.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    materials.append(material)

def model(name, position=(0,0,0), scale=1, yaw=0):
    path = os.path.join(ROOT, 'creatures', 'old-lady', 'sit-00.zkmodel') if name == 'lady' else os.path.join(ROOT, 'props', 'amphora.zkmodel') if name == 'amphora' else os.path.join(ROOT, 'merchant-props', name + '.zkmodel')
    data = open(path, 'rb').read(); magic, nv, ni, flags = struct.unpack_from('<4sIII', data)
    input_paths.add(path)
    assert magic == b'ZKMD'
    records = [struct.unpack_from('<9f', data, 16 + 36*i) for i in range(nv)]
    indices = struct.unpack_from('<%dI'%ni, data, 16 + nv*36)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(v[0], -v[2], v[1]) for v in records], [], [indices[i:i+3] for i in range(0, ni, 3)])
    for material in materials: mesh.materials.append(material)
    uv = mesh.uv_layers.new()
    for polygon in mesh.polygons:
        polygon.material_index = 7 if name == 'lady' else 8 if name == 'amphora' else round(records[polygon.vertices[0]][8])
        for loop in polygon.loop_indices:
            v = records[mesh.loops[loop].vertex_index]; uv.data[loop].uv = (v[6], 1-v[7])
        polygon.use_smooth = True
    mesh.use_auto_smooth=True
    mesh.normals_split_custom_set_from_vertices([(v[3],-v[5],v[4]) for v in records])
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj)
    obj.location = (position[0], -position[2], position[1]); obj.scale = (scale,)*3; obj.rotation_euler.z = -yaw
    return obj

model('lady')
layout=json.load(open(os.path.join(ROOT,'merchant-props','layout.json')))
conversion=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
for placement in layout['placements']:
    name=layout['models'][placement['model']]['name'];obj=model(name);m=placement['matrix']
    matrix=Matrix(tuple(tuple(m[c*4+r] for c in range(4)) for r in range(4)))
    obj.matrix_world=conversion@matrix@conversion.inverted()

bpy.ops.mesh.primitive_plane_add(size=18); floor=bpy.context.object
floor.name='inspection floor'; floor.data.materials.append(bpy.data.materials.new('floor'))
floor.data.materials[0].diffuse_color=(.12,.14,.13,1)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.world.color=(.16,.16,.16)
for location, power, size in [((0,-3,6),650,5),((-4,-1,3),400,4),((3,3,4),500,4)]:
    bpy.ops.object.light_add(type='AREA',location=location); light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
input_hashes={path:hashlib.sha256(open(path,'rb').read()).hexdigest() for path in sorted(input_paths)}
selected=sys.argv[sys.argv.index('--views')+1].split(',') if '--views' in sys.argv else ['front','side','rear']
for name, position, target in [('front',(3,5,2.6),(0,0,.9)),('side',(4,-1,1.9),(0,0,.8)),('rear',(-3,-4,2.5),(0,0,.85))]:
    if name not in selected:continue
    bpy.ops.object.camera_add(location=position);camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=5.2
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
    scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
for path,digest in input_hashes.items():assert hashlib.sha256(open(path,'rb').read()).hexdigest()==digest,'preview input changed while rendering'
json.dump({'method':'actual exported geometry, UVs, normals, 2K PBR maps; neutral Blender studio, not the production game', 'blender':bpy.app.version_string,'inputs':input_hashes,
           'images':{name:hashlib.sha256(open(os.path.join(OUT,name+'.png'),'rb').read()).hexdigest() for name in selected}},open(os.path.join(OUT,'evidence.json'),'w'),indent=2)
print('MERCHANT-PREVIEW',OUT)
