"""Bake six coherent Skyclave material families; never upscale old 1K game tiles.

Blender --background --factory-startup --disable-autoexec --python-exit-code 1
--python this_file -- <game directory>. Run fetch-world-texture-sources.mjs first;
the four unchanged 1254px generated macros live in textures/generated-source.
Actual native 2K CC0 scans add new photographic microdetail and surface relief.
Clear glass is authored at 2K with periodic four-dimensional scratch/dust fields.
Finally run prepare.mjs --only tiles to produce baseline JPEG albedo/NAR/metal.
"""
import bpy, json, math, os, sys

bpy.ops.wm.read_factory_settings(use_empty=True)

game = os.path.abspath(sys.argv[sys.argv.index('--')+1])
root = os.path.join(game, 'gameplay', 'content', 'textures')
source = os.path.join(game, 'art-src')
out = os.path.join(root, 'source')
os.makedirs(out, exist_ok=True)
only = sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else None
SIZE = 2048
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 4
scene.render.bake.margin = 0
scene.render.bake.use_clear = True
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.world = bpy.data.worlds.new('Bake world')

mesh = bpy.data.meshes.new('2 metre material patch')
mesh.from_pydata([(-1,-1,0), (1,-1,0), (1,1,0), (-1,1,0)], [], [(0,1,2,3)])
mesh.update()
uv = mesh.uv_layers.new()
for loop, value in zip(mesh.loops, [(0,0),(1,0),(1,1),(0,1)]):
    uv.data[loop.index].uv = value
plane = bpy.data.objects.new('Material patch', mesh)
scene.collection.objects.link(plane)
bpy.context.view_layer.objects.active = plane
plane.select_set(True)

def node(kind, label=None):
    n = nodes.new(kind)
    if label:
        n.label = label
    return n

def link(output, input):
    links.new(output, input)

def mathnode(operation, a, b=None):
    n = node('ShaderNodeMath')
    n.operation = operation
    for index, value in enumerate([a] if b is None else [a,b]):
        if isinstance(value, (float,int)):
            n.inputs[index].default_value = value
        else:
            link(value, n.inputs[index])
    return n.outputs[0]

def mix(a, b, factor, operation='MIX'):
    n = node('ShaderNodeMixRGB')
    n.blend_type = operation
    if isinstance(factor, (float,int)):
        n.inputs[0].default_value = factor
    else:
        link(factor, n.inputs[0])
    for index, value in [(1,a),(2,b)]:
        if isinstance(value, tuple):
            n.inputs[index].default_value = value
        else:
            link(value, n.inputs[index])
    return n.outputs[0]

def gray(color):
    n = node('ShaderNodeRGBToBW')
    link(color, n.inputs[0])
    return n.outputs[0]

def image(path, color=True):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    return img

def sampled(img, vector=None):
    n = node('ShaderNodeTexImage')
    n.image = img
    n.extension = 'REPEAT'
    link(vector or coordinates, n.inputs['Vector'])
    return n.outputs['Color']

def periodic(img):
    # Keep the centre original. Smoothly mix half-period source samples at the
    # outer 6% so every edge joins the same interior source neighbourhood.
    split = node('ShaderNodeSeparateXYZ')
    link(coordinates, split.inputs[0])
    weights = []
    for axis in ['X','Y']:
        distance = mathnode('MINIMUM', split.outputs[axis], mathnode('SUBTRACT', 1, split.outputs[axis]))
        n = node('ShaderNodeMapRange')
        n.interpolation_type = 'SMOOTHSTEP'
        n.clamp = True
        n.inputs['From Min'].default_value = 0
        n.inputs['From Max'].default_value = 0.06
        link(distance, n.inputs['Value'])
        weights.append(n.outputs['Result'])
    samples = []
    for offset in [(0,0,0),(.5,0,0),(0,.5,0),(.5,.5,0)]:
        n = node('ShaderNodeVectorMath')
        n.operation = 'ADD'
        link(coordinates, n.inputs[0])
        n.inputs[1].default_value = offset
        samples.append(sampled(img,n.outputs[0]))
    return mix(mix(samples[3],samples[2],weights[0]), mix(samples[1],samples[0],weights[0]), weights[1])

def torus_noise(scale):
    split = node('ShaderNodeSeparateXYZ')
    link(coordinates, split.inputs[0])
    u = mathnode('MULTIPLY', split.outputs['X'], math.tau)
    v = mathnode('MULTIPLY', split.outputs['Y'], math.tau)
    xyz = node('ShaderNodeCombineXYZ')
    link(mathnode('COSINE',u),xyz.inputs['X'])
    link(mathnode('SINE',u),xyz.inputs['Y'])
    link(mathnode('COSINE',v),xyz.inputs['Z'])
    n = node('ShaderNodeTexNoise')
    n.noise_dimensions = '4D'
    link(xyz.outputs[0],n.inputs['Vector'])
    link(mathnode('SINE',v),n.inputs['W'])
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = 2
    n.inputs['Roughness'].default_value = 0.55
    return n.outputs['Fac'], split

def bake(name, suffix, signal, normal=False):
    img = bpy.data.images.new(name+' '+suffix, width=SIZE, height=SIZE, alpha=False)
    img.colorspace_settings.name = 'Non-Color' if normal or suffix != 'basecolor' else 'sRGB'
    target = node('ShaderNodeTexImage')
    target.image = img
    nodes.active = target
    if normal:
        link(principled.outputs['BSDF'], output.inputs['Surface'])
    else:
        emission = node('ShaderNodeEmission')
        link(signal,emission.inputs['Color'])
        link(emission.outputs[0],output.inputs['Surface'])
    bpy.ops.object.bake(type='NORMAL' if normal else 'EMIT')
    destination = os.path.join(out, name+'_'+suffix+'.png')
    temporary = destination+'.new.png'
    if os.path.commonpath([out, os.path.abspath(temporary)]) != out or os.path.commonpath([out, os.path.abspath(destination)]) != out:
        raise ValueError('Material output left its source directory')
    img.filepath_raw = temporary
    img.file_format = 'PNG'
    img.save()
    os.replace(temporary,destination)
    print('WORLD-TEXTURE-BAKE',name,suffix,SIZE,os.path.getsize(destination),flush=True)
    nodes.remove(target)
    if not normal:
        nodes.remove(emission)
    bpy.data.images.remove(img)

specs = [
    ('skyclave_rune_stone','stone_tiles_02',0.03,0.75),
    ('skyclave_obsidian','seaworn_stone_tiles',0.018,0.48),
    ('skyclave_ancient_bronze','Metal017',0.02,0.6),
    ('skyclave_wet_moss','mossy_rock',0.025,0.5),
    ('skyclave_clear_glass',None,0.0007,0.16),
]
metadata = []
for name, material, relief, roughness in specs:
    if only and name != only:
        continue
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    plane.data.materials.clear()
    plane.data.materials.append(mat)
    output = node('ShaderNodeOutputMaterial')
    principled = node('ShaderNodeBsdfPrincipled')
    coordinates = node('ShaderNodeTexCoord').outputs['UV']
    bump = node('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.4
    bump.inputs['Distance'].default_value = relief
    if material:
        macro_path = os.path.join(root,'generated-source',name+'.png')
        macro_img = image(macro_path)
        macro = periodic(macro_img)
        if material == 'Metal017':
            directory = os.path.join(source,'ambientcg','Metal017')
            stem = os.path.join(directory,'Metal017_2K-JPG_')
            diff,norm,rough,metal = stem+'Color.jpg',stem+'NormalGL.jpg',stem+'Roughness.jpg',stem+'Metalness.jpg'
            r = gray(periodic(image(rough,False)))
            metallic = gray(periodic(image(metal,False)))
        else:
            directory = os.path.join(source,'polyhaven','textures',material)
            diff = os.path.join(directory,material+'_diff_2k.jpg')
            norm = os.path.join(directory,material+'_nor_gl_2k.jpg')
            rough = os.path.join(directory,material+'_arm_2k.jpg')
            channels = node('ShaderNodeSeparateRGB')
            link(periodic(image(rough,False)),channels.inputs[0])
            r = channels.outputs['G']
            metallic = 0
        for path in [diff,norm,rough]:
            check = image(path, path == diff)
            if tuple(check.size) != (SIZE,SIZE):
                raise ValueError('Microdetail source must be actual native 2K: '+path)
        micro = gray(periodic(image(diff)))
        # Macro art retains its style; genuine 2K colour grain adds new pixels,
        # alongside the native 2K normal/roughness maps, rather than mere scaling.
        grain = mix((1,1,1,1),mathnode('MULTIPLY',micro,2.1),0.3)
        base = mix(macro,grain,1,'MULTIPLY')
        n = node('ShaderNodeNormalMap')
        n.inputs['Strength'].default_value = 0.25
        link(periodic(image(norm,False)),n.inputs['Color'])
        link(n.outputs['Normal'],bump.inputs['Normal'])
        link(gray(macro),bump.inputs['Height'])
        r = mathnode('ADD', mathnode('MULTIPLY',r,roughness),0.15)
        metadata.append({'name':name,'macro_source':os.path.relpath(macro_path,game).replace('\\','/'),'macro_pixels':list(macro_img.size),
                         'micro_material':material,'micro_source_pixels':[SIZE,SIZE],'bake_pixels':[SIZE,SIZE],'source_maps':list(map(lambda p:os.path.relpath(p,game).replace('\\','/'),[diff,norm,rough]))})
    else:
        noise, split = torus_noise(180)
        dust = mathnode('GREATER_THAN',noise,0.7)
        sway,_ = torus_noise(6)
        frequency = mathnode('ADD',mathnode('MULTIPLY',split.outputs['X'],83),mathnode('MULTIPLY',sway,0.65))
        scratch = mathnode('GREATER_THAN',mathnode('ABSOLUTE',mathnode('SINE',mathnode('MULTIPLY',frequency,math.tau))),0.9993)
        height = mathnode('MAXIMUM',mathnode('MULTIPLY',scratch,0.25),mathnode('MULTIPLY',dust,0.2))
        link(height,bump.inputs['Height'])
        r = mathnode('ADD',0.16,mathnode('MULTIPLY',height,0.6))
        base = mix((.91,.94,.94,1),(.72,.75,.75,1),mathnode('MULTIPLY',dust,0.12))
        metallic = 0
        metadata.append({'name':name,'source':'authored periodic clear-glass scratch/dust/roughness shader','bake_pixels':[SIZE,SIZE],'no_old_glass_image':True})
    link(bump.outputs['Normal'],principled.inputs['Normal'])
    link(base,principled.inputs['Base Color'])
    link(r,principled.inputs['Roughness'])
    if not isinstance(metallic,int):
        link(metallic,principled.inputs['Metallic'])
    bake(name,'basecolor',base)
    bake(name,'normal',None,True)
    bake(name,'roughness',r)
    if not isinstance(metallic,int):
        bake(name,'metalness',metallic)
    bpy.data.materials.remove(mat)
metadata_path = os.path.join(out,'materials.json')
if only and os.path.exists(metadata_path):
    with open(metadata_path,encoding='utf8') as stream:
        previous = json.load(stream)['families']
    metadata = [family for family in previous if family['name'] != only] + metadata
with open(metadata_path,'w',encoding='utf8') as stream:
    json.dump({'bake_resolution':SIZE,'generated_macro_resolution':1254,'material_source_pipeline':'Blender Cycles PBR bake + native 2K CC0 microdetail','families':metadata},stream,indent=2)
print('WORLD-TEXTURE-BAKE-DONE',out,flush=True)
