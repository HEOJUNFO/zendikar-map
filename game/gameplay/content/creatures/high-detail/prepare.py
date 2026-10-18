"""Prepare the licensed high-detail source meshes and original Roil sculpt.

Blender 3.6 --background --factory-startup --disable-autoexec --python-exit-code 1
--python this_file -- charger|caster|boss. No runtime or shared build outputs.
"""
import bpy, math, os, sys, json, struct, random
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.abspath(__file__))
KIND = sys.argv[sys.argv.index('--') + 1]
LAYER = {'charger': 0, 'caster': 1, 'boss': 3}[KIND]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 95
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'

def material(name, colour, metal=0, noise=6):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nodes = mat.node_tree.nodes; shader = nodes.get('Principled BSDF')
    texture = nodes.new('ShaderNodeTexNoise'); texture.inputs['Scale'].default_value = noise; texture.inputs['Detail'].default_value = 4
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .2; ramp.color_ramp.elements[0].color = tuple(c*.35 for c in colour)+(1,)
    ramp.color_ramp.elements[1].position = .8; ramp.color_ramp.elements[1].color = tuple(colour)+(1,)
    mat.node_tree.links.new(texture.outputs['Fac'], ramp.inputs[0]); mat.node_tree.links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .15; bump.inputs['Distance'].default_value = .002
    mat.node_tree.links.new(texture.outputs['Fac'], bump.inputs['Height']); mat.node_tree.links.new(bump.outputs[0], shader.inputs['Normal'])
    shader.inputs['Metallic'].default_value = metal; shader.inputs['Roughness'].default_value = .6
    return mat

def reset(rig):
    if rig.animation_data:
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks: track.mute = True
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4); bone.rotation_mode = 'XYZ'
    bpy.context.view_layer.update()

def simplify(obj, target):
    bpy.context.view_layer.objects.active = obj; obj.select_set(True)
    modifier = obj.modifiers.new('Runtime topology', 'DECIMATE')
    modifier.ratio = min(1, target / len(obj.data.polygons)); modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_move_up(modifier=modifier.name)
    while obj.modifiers.find(modifier.name) > 0: bpy.ops.object.modifier_move_up(modifier=modifier.name)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for poly in obj.data.polygons:poly.use_smooth=True
    obj.data.use_auto_smooth=True
    obj.select_set(False)

def use_original_maps(obj, path):
    """Read the exact embedded 4K original maps, retaining the source UV atlas."""
    with open(path, 'rb') as stream: data = stream.read()
    length = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20+length]); offset = 20+length+8
    mat = gltf['materials'][0]; pbr = mat['pbrMetallicRoughness']
    maps = {'base':pbr['baseColorTexture']['index'], 'normal':mat['normalTexture']['index'], 'rough':pbr['metallicRoughnessTexture']['index']}
    found = {}
    for name,index in maps.items():
        image = gltf['images'][gltf['textures'][index]['source']]; view = gltf['bufferViews'][image['bufferView']]
        destination = os.path.join(os.path.dirname(path), 'original-'+name+('.png' if image['mimeType']=='image/png' else '.jpg'))
        with open(destination,'wb') as stream: stream.write(data[offset+view.get('byteOffset',0):offset+view.get('byteOffset',0)+view['byteLength']])
        found[name] = bpy.data.images.load(destination, check_existing=False)
        if name != 'base': found[name].colorspace_settings.name = 'Non-Color'
    for slot in obj.material_slots:
        for node in slot.material.node_tree.nodes:
            if node.type != 'TEX_IMAGE' or not node.image: continue
            old=node.image.name.lower()
            node.image = found['normal' if 'normal' in old else 'rough' if 'rough' in old or 'metallic' in old else 'base']

def armor(rig, obj):
    """Curved, tapered etched plates attached to the anatomical author rig."""
    bronze = material('Ancient Kor etched bronze', (.055,.067,.073), .72, 32)
    nodes=bronze.node_tree.nodes;links=bronze.node_tree.links;shader=nodes.get('Principled BSDF')
    uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='SourceUV'
    carving=nodes.new('ShaderNodeTexVoronoi');carving.feature='DISTANCE_TO_EDGE';carving.inputs['Scale'].default_value=8;links.new(uvnode.outputs[0],carving.inputs['Vector'])
    marks=nodes.new('ShaderNodeValToRGB');marks.color_ramp.elements[0].position=.015;marks.color_ramp.elements[0].color=(.25,.14,.055,1)
    marks.color_ramp.elements[1].position=.045;marks.color_ramp.elements[1].color=(.045,.055,.062,1)
    links.new(carving.outputs['Distance'],marks.inputs[0]);links.new(marks.outputs[0],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.42
    armour = []
    for bone_name, radius, length in [('LeftArm',.115,.21),('RightArm',.115,.21),('LeftForeArm',.075,.19),('RightForeArm',.075,.19),('LeftLeg',.082,.25),('RightLeg',.082,.25)]:
        bone = rig.data.bones[bone_name]; matrix = rig.matrix_world @ bone.matrix_local
        vertices=[]; faces=[]; uvs=[]
        for row in range(9):
            t=row/8; r=radius*(1-.18*t)
            for col in range(25):
                angle=(col/24*1.65-.825)*math.pi
                chipped=1+.025*math.sin(col*5.7+row*2.3)
                local=Vector((math.sin(angle)*r*chipped,t*length,math.cos(angle)*r*chipped))
                vertices.append(tuple(rig.matrix_world.inverted() @ (matrix @ (local/rig.scale.x))))
                uvs.append((col/24,t))
        for row in range(8):
            for col in range(24):
                a=row*25+col; faces.append((a,a+1,a+26,a+25))
        mesh=bpy.data.meshes.new(bone_name+' relic plate');mesh.from_pydata(vertices,[],faces);mesh.materials.append(bronze)
        uv=mesh.uv_layers.new(name='SourceUV')
        for poly in mesh.polygons:
            poly.use_smooth=True
            for loop in poly.loop_indices: uv.data[loop].uv=uvs[mesh.loops[loop].vertex_index]
        piece=bpy.data.objects.new(bone_name+' armour',mesh);scene.collection.objects.link(piece);piece.matrix_world=rig.matrix_world.copy()
        group=piece.vertex_groups.new(name=bone_name);group.add(list(range(len(vertices))),1,'REPLACE')
        bpy.ops.object.select_all(action='DESELECT');piece.select_set(True);bpy.context.view_layer.objects.active=piece
        solid=piece.modifiers.new('Forged plate thickness','SOLIDIFY');solid.thickness=.55;bpy.ops.object.modifier_apply(modifier=solid.name)
        bevel=piece.modifiers.new('Worn bevel edges','BEVEL');bevel.width=.25;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
        deform=piece.modifiers.new('Author armature','ARMATURE');deform.object=rig
        armour.append(piece)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    for piece in armour:piece.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()

if KIND == 'charger':
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'skeleton','source','human-skeleton-rigged.glb'))
    obj=next(o for o in bpy.data.objects if o.type=='MESH');rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    reset(rig);use_original_maps(obj,os.path.join(ROOT,'skeleton','source','human-skeleton.glb'));simplify(obj,15000)
    obj.data.uv_layers.active.name='SourceUV';armor(rig,obj)
    extent=1.8; cycle=40
    walk=next(a for a in bpy.data.actions if a.name.startswith('run'))
    def pose(clip,p):
        reset(rig)
        if clip=='walk':
            for bone in rig.pose.bones:bone.rotation_mode='QUATERNION'
            rig.animation_data.action=walk;start,end=walk.frame_range;frame=start+(end-start)*p;scene.frame_set(int(frame),subframe=frame-int(frame))
        elif clip=='attack':
            power=math.sin(math.pi*p)
            rig.pose.bones['RightArm'].rotation_euler=(-1.05*power,.2*power,.15*power)
            rig.pose.bones['RightForeArm'].rotation_euler=(-.8*power,0,0)
            rig.pose.bones['LeftArm'].rotation_euler=(-.45*power,0,0)
            rig.pose.bones['Spine'].rotation_euler=(.14*power,0,.22*power)
            rig.pose.bones['Head'].rotation_euler=(-.12*power,0,0)
        else:
            rig.pose.bones['Hips'].rotation_euler=(1.42,.2,0)
            rig.pose.bones['LeftUpLeg'].rotation_euler=(-.35,0,.2);rig.pose.bones['RightUpLeg'].rotation_euler=(.4,0,-.15)
        bpy.context.view_layer.update()

elif KIND == 'caster':
    rng=random.Random(98117)
    stone=material('Roil fractured obsidian',(.028,.033,.039),0,38)
    stone.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.29
    amber=material('Roil ancient amber hedron',(.24,.105,.024),.72,35)
    amber.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.38
    incision=material('Kor incision patina',(.042,.085,.072),.25,48)
    meshes=[];anchors=[]

    def carve(part, paths, front, depth, width):
        # Real shallow V-grooves leave closed fracture meshes. Their tiny
        # patinated interiors are reflective albedo, never an emissive decal.
        part.data.materials.append(incision)
        for path in paths:
            for a,b in zip(path,path[1:]):
                delta=Vector((b[0]-a[0],b[1]-a[1]));side=Vector((-delta.y,delta.x)).normalized()*width
                vertices=[]
                for y,w in [(front-.008,1),(front+depth,.18)]:
                    vertices.extend([(a[0]+side.x*w,y,a[1]+side.y*w),(b[0]+side.x*w,y,b[1]+side.y*w),
                                     (b[0]-side.x*w,y,b[1]-side.y*w),(a[0]-side.x*w,y,a[1]-side.y*w)])
                faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
                mesh=bpy.data.meshes.new('Kor chisel');mesh.from_pydata(vertices,[],faces)
                for mat in part.data.materials:mesh.materials.append(mat)
                for poly in mesh.polygons:poly.material_index=len(mesh.materials)-1
                cutter=bpy.data.objects.new('Kor chisel',mesh);scene.collection.objects.link(cutter);cutter.matrix_world=part.matrix_world.copy()
                bpy.context.view_layer.objects.active=part
                modifier=part.modifiers.new('Inset Kor trace','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
                bpy.ops.object.modifier_apply(modifier=modifier.name)
                bpy.data.objects.remove(cutter,do_unlink=True)

    # Deliberately authored cleaved plates: broad planar obsidian surfaces,
    # tapered spear points, asymmetric broken shoulders, and small edge chips.
    # The silhouette comes from fractures, rather than smoothing sphere shells.
    major=[(-.27,.04,.81,.15,.25),(.23,.09,.98,.14,.29),(.04,.23,1.02,.12,.24),
           (-.31,.08,.48,.17,.22),(.32,.12,.49,.15,.24),(-.17,.08,.18,.11,.19),(.17,.07,.19,.12,.2)]
    for i in range(19):
        if i<len(major):
            x,y,z,rx,rz=major[i];center=Vector((x,y,z))
        else:
            angle=(i-7)*2.399963;radius=.31+.04*math.sin(i*1.9)
            center=Vector((math.cos(angle)*radius,.10+abs(math.sin(angle))*.11,.22+((i-7)%5)*.18))
            rx,rz=rng.uniform(.055,.08),rng.uniform(.08,.14)
        thick=rng.uniform(.033,.057)
        outline=[(-.55,-.85),(.20,-1.0),(.80,-.46),(.69,.24),(.27,1.18),(-.05,.91),(-.62,.48),(-.86,-.16),(-.66,-.25),(-.87,-.34)]
        vertices=[]
        for back in [False,True]:
            for j,(x,z) in enumerate(outline):
                if back: x,z=x*.75+.16,z*.81-.10
                vertices.append((x*rx,thick if back else -thick,z*rz))
        count=len(outline);faces=[tuple(reversed(range(count))),tuple(range(count,count*2))]
        faces.extend((j,(j+1)%count,(j+1)%count+count,j+count) for j in range(count))
        mesh=bpy.data.meshes.new('Cleaved obsidian %02d'%i);mesh.from_pydata(vertices,[],faces);mesh.materials.append(stone)
        part=bpy.data.objects.new('Roil fracture %02d'%i,mesh);scene.collection.objects.link(part);part.location=center
        if i in [0,1,3,4]:
            rune=[(-.31*rx,-.37*rz),(-.31*rx,.21*rz),(.07*rx,.50*rz),(.36*rx,.20*rz),(.02*rx,-.03*rz)]
            carve(part,[rune,[(.05*rx,-.16*rz),(.32*rx,-.36*rz)]],-thick,.006,.003)
        bpy.context.view_layer.objects.active=part
        modifier=part.modifiers.new('Worn fracture bevel','BEVEL');modifier.width=.0025;modifier.segments=3;modifier.limit_method='ANGLE';modifier.angle_limit=.2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for poly in part.data.polygons:poly.use_smooth=False
        part.data.uv_layers.new(name='SourceUV')
        part.rotation_euler=(rng.uniform(-.16,.16),rng.uniform(-.30,.30),rng.uniform(-.16,.16))
        anchors.append(center);meshes.append(part)
    # An amber relic with an actual planar engraved face and bevelled corners.
    # It remains a hedron: a six-sided pointed diamond, not a yellow sphere.
    vertices=[(0,-.048,.27),(0,-.048,-.22),(.16,-.048,.01),(-.16,-.048,.01),
              (0,.09,.22),(0,.09,-.18),(.11,.09,.01),(-.11,.09,.01)]
    faces=[(0,3,1,2),(4,6,5,7),(0,2,6,4),(2,1,5,6),(1,3,7,5),(3,0,4,7)]
    mesh=bpy.data.meshes.new('Original engraved amber hedron');mesh.from_pydata(vertices,[],faces);mesh.materials.append(amber)
    core=bpy.data.objects.new('Roil amber relic',mesh);scene.collection.objects.link(core);core.location=(0,-.11,.62)
    carve(core,[[(-.075,.02),(0,.13),(.075,.02),(0,-.09),(-.075,.02)],[(0,.065),(0,-.028)]],-.048,.007,.004)
    bpy.context.view_layer.objects.active=core
    modifier=core.modifiers.new('Ancient hedron bevel','BEVEL');modifier.width=.004;modifier.segments=3
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for poly in core.data.polygons:poly.use_smooth=False
    core.data.uv_layers.new(name='SourceUV');meshes.append(core);anchors.append(Vector(core.location))
    rig_data=bpy.data.armatures.new('Roil fragment skeleton');rig=bpy.data.objects.new('Roil fragment rig',rig_data);scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for i,anchor in enumerate(anchors):
        bone=rig_data.edit_bones.new('fragment_%02d'%i);bone.head=anchor;bone.tail=anchor+Vector((0,0,.1))
    bpy.ops.object.mode_set(mode='OBJECT')
    for i,part in enumerate(meshes):
        group=part.vertex_groups.new(name='fragment_%02d'%i);group.add(list(range(len(part.data.vertices))),1,'REPLACE')
        modifier=part.modifiers.new('Fragment deformation','ARMATURE');modifier.object=rig
    bpy.ops.object.select_all(action='DESELECT')
    for part in meshes:part.select_set(True)
    obj=meshes[0];bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
    obj.data.uv_layers.active.name='SourceUV';extent=1.2;cycle=120
    def pose(clip,p):
        reset(rig)
        for i,bone in enumerate(rig.pose.bones):
            if clip=='death':
                shift=Vector((math.cos(i*2.4)*.12,math.sin(i*2.4)*.12,.08-anchors[i].z));bone.scale=(1,.4,1)
            else:
                phase=p*2*math.pi+i*.73
                shift=Vector((.022*math.sin(phase),.022*math.cos(phase),.035*math.sin(phase*1.4)))
                if clip=='attack':shift=shift+anchors[i]*(.35*math.sin(math.pi*p))
            bone.location=bone.bone.matrix_local.to_3x3().inverted()@shift
            bone.rotation_euler=(.08*math.sin(p*math.pi*2+i),.13*math.sin(p*math.pi*2+i*.7),.1*math.cos(p*math.pi*2+i))
        bpy.context.view_layer.update()

else:
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'dragon','source','crystal-dragon.glb'))
    obj=next(o for o in bpy.data.objects if o.type=='MESH')
    # Weld the ORIGINAL glTF seams before reduction. Decimating its duplicated
    # corners first moves them independently and destroys their connectivity.
    # Face-loop UVs/materials survive welding; the reduced skin stays connected.
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=1e-5);bpy.ops.object.mode_set(mode='OBJECT')
    simplify(obj,25000)
    # One authored non-manifold crown vertex has cancelling smooth normals.
    # Preserve valid custom loop normals; only its zero corners use their
    # actual nondegenerate face normal, so the runtime never normalizes zero.
    obj.data.calc_normals_split();loop_normals=[loop.normal.copy() for loop in obj.data.loops];normal_repairs=0
    for poly in obj.data.polygons:
        for loop in poly.loop_indices:
            if loop_normals[loop].length_squared<1e-12:
                if poly.area<1e-12:raise RuntimeError('Degenerate repaired drake face')
                loop_normals[loop]=poly.normal.normalized();normal_repairs+=1
    if normal_repairs:obj.data.normals_split_custom_set(loop_normals)
    print('DRAGON-NORMAL-REPAIR',normal_repairs,flush=True)
    sys.path.insert(0,os.path.abspath(os.path.join(ROOT,'../../../../tools/art')))
    from boss_rig_recipe import REST_BONES
    skeleton=REST_BONES
    data=bpy.data.armatures.new('Crystal drake anatomical bones');rig=bpy.data.objects.new('Crystal drake rig',data);scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,head,tail,parent in skeleton:
        bone=data.edit_bones.new(name);bone.head=head;bone.tail=tail
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    # Bone heat can propagate through the actual connected anatomical surface.
    # Normal/UV seams inherit the same welded source vertex weights.
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO',keep_transform=True)
    modifier=next(m for m in obj.modifiers if m.type=='ARMATURE');modifier.use_deform_preserve_volume=True
    for vertex in obj.data.vertices:
        total=sum(g.weight for g in vertex.groups)
        if total<1e-8:raise RuntimeError('Bone heat left an unbound anatomical vertex: %d'%vertex.index)
    print('DRAGON-HEAT-WEIGHTS',len(obj.data.vertices),'vertices',len(obj.vertex_groups),'groups',flush=True)
    obj.data.uv_layers.active.name='SourceUV'
    # Derivative stone/obsidian palette, retaining the author's scale sculpt and PBR maps.
    for slot in obj.material_slots:
        mat=slot.material;shader=mat.node_tree.nodes.get('Principled BSDF');base=shader.inputs['Base Color']
        if base.is_linked:
            nodes=mat.node_tree.nodes;links=mat.node_tree.links
            original=base.links[0].from_socket;desaturate=nodes.new('ShaderNodeHueSaturation');desaturate.inputs['Saturation'].default_value=.13;desaturate.inputs['Value'].default_value=.5
            links.new(original,desaturate.inputs['Color']);mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.28,.24,.20,1)
            links.new(desaturate.outputs[0],mix.inputs[1])
            # Sparse inlaid angular Kor marks, engraved into the retained scale
            # normals. Their bronze changes metalness as well as colour; no glow.
            def scalar(op,a,b=None):
                node=nodes.new('ShaderNodeMath');node.operation=op
                for socket,value in zip(node.inputs,(a,b)):
                    if value is None:continue
                    if isinstance(value,(int,float)):socket.default_value=value
                    else:links.new(value,socket)
                return node.outputs[0]
            coords=nodes.new('ShaderNodeTexCoord');split=nodes.new('ShaderNodeSeparateXYZ');links.new(coords.outputs['Generated'],split.inputs[0])
            x=scalar('SUBTRACT',scalar('FRACT',scalar('MULTIPLY',split.outputs['X'],7)),.5)
            z=scalar('SUBTRACT',scalar('FRACT',scalar('MULTIPLY',split.outputs['Z'],7)),.5)
            diamond=scalar('LESS_THAN',scalar('ABSOLUTE',scalar('SUBTRACT',scalar('ADD',scalar('ABSOLUTE',x),scalar('ABSOLUTE',z)),.3)),.014)
            stem=scalar('MULTIPLY',scalar('LESS_THAN',scalar('ABSOLUTE',x),.013),scalar('LESS_THAN',scalar('ABSOLUTE',z),.39))
            noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=12;links.new(coords.outputs['Generated'],noise.inputs[0])
            select=scalar('MULTIPLY',scalar('GREATER_THAN',noise.outputs['Fac'],.66),scalar('MULTIPLY',scalar('GREATER_THAN',split.outputs['Z'],.3),scalar('LESS_THAN',split.outputs['Z'],.72)))
            rune=scalar('MULTIPLY',scalar('MAXIMUM',diamond,stem),select)
            bronze=nodes.new('ShaderNodeMixRGB');links.new(rune,bronze.inputs[0]);links.new(mix.outputs[0],bronze.inputs[1]);bronze.inputs[2].default_value=(.19,.095,.035,1);links.new(bronze.outputs[0],base)
            links.new(scalar('MULTIPLY',rune,.72),shader.inputs['Metallic'])
            bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.006;bump.invert=True;links.new(rune,bump.inputs['Height'])
            if shader.inputs['Normal'].is_linked:links.new(shader.inputs['Normal'].links[0].from_socket,bump.inputs['Normal'])
            links.new(bump.outputs[0],shader.inputs['Normal'])
    extent=4.8;cycle=120
    def pose(clip,p):
        reset(rig);phase=p*2*math.pi
        power=math.sin(math.pi*p) if clip=='attack' else .12*math.sin(phase)
        rig.pose.bones['Neck'].rotation_euler=(-.35*power,0,.05*math.sin(phase));rig.pose.bones['Head'].rotation_euler=(.18*power,0,0)
        for side,sign in [('L',1),('R',-1)]:
            stride=.19*math.sin(phase)*sign if clip=='walk' else 0
            rig.pose.bones['FrontLeg.'+side].rotation_euler=(stride,0,0);rig.pose.bones['BackLeg.'+side].rotation_euler=(-stride,0,0)
            rig.pose.bones['Wing.'+side].rotation_euler=(0,sign*(.04*math.sin(phase)+.09*power),0)
        rig.pose.bones['Tail1'].rotation_euler=(0,0,.05*math.sin(phase));rig.pose.bones['Tail2'].rotation_euler=(0,0,.08*math.sin(phase-.6))
        bpy.context.view_layer.update()

# Source UVs continue feeding the author materials while a second fixed atlas
# receives real Blender material/normal/roughness bakes for the single runtime layer.
reset(rig)
source_uv=obj.data.uv_layers.get('SourceUV')
atlas=obj.data.uv_layers.new(name='RuntimeAtlas')
loop_material=[0]*len(obj.data.loops)
for poly in obj.data.polygons:
    for loop in poly.loop_indices:loop_material[loop]=poly.material_index
for loop in obj.data.loops:
    uv=source_uv.data[loop.index].uv
    armour=KIND=='charger' and loop_material[loop.index]>0
    atlas.data[loop.index].uv=(uv.x,uv.y*.125) if armour else (uv.x,uv.y*.875+.125) if KIND=='charger' else uv
obj.data.uv_layers.active=atlas
for slot in obj.material_slots:
    mat=slot.material
    uvnode=mat.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map='SourceUV'
    for node in list(mat.node_tree.nodes):
        if node.type=='TEX_IMAGE':mat.node_tree.links.new(uvnode.outputs['UV'],node.inputs['Vector'])
    bake=mat.node_tree.nodes.new('ShaderNodeTexImage');bake.name='RuntimeBake'

bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
scene.render.bake.margin=8
def bake(channel):
    image=bpy.data.images.new(KIND+' '+channel,width=2048,height=2048,alpha=False)
    image.colorspace_settings.name='sRGB' if channel=='base' else 'Non-Color'
    saved=[]
    for slot in obj.material_slots:
        mat=slot.material;nodes=mat.node_tree.nodes;nodes.active=nodes['RuntimeBake'];nodes.active.image=image
        if channel!='normal':
            shader=nodes.get('Principled BSDF');out=nodes.get('Material Output');previous=out.inputs['Surface'].links[0].from_socket
            emission=nodes.new('ShaderNodeEmission');socket=shader.inputs['Base Color' if channel=='base' else 'Roughness' if channel=='rough' else 'Metallic']
            if socket.is_linked:mat.node_tree.links.new(socket.links[0].from_socket,emission.inputs['Color'])
            else:emission.inputs['Color'].default_value=socket.default_value if channel=='base' else (socket.default_value,)*3+(1,)
            mat.node_tree.links.new(emission.outputs[0],out.inputs['Surface']);saved.append((mat,emission,previous,out))
    bpy.ops.object.bake(type='NORMAL' if channel=='normal' else 'EMIT')
    for mat,emission,previous,out in saved:mat.node_tree.links.new(previous,out.inputs['Surface']);mat.node_tree.nodes.remove(emission)
    return image
import numpy as np
if KIND!='boss' or '--keep-maps' not in sys.argv:
    base=bake('base');normal=bake('normal');rough=bake('rough');metal=bake('metal')
    base.filepath_raw=os.path.join(ROOT,KIND+'.jpg');base.file_format='JPEG';base.save_render(base.filepath_raw,scene=scene)
    n=np.asarray(normal.pixels[:],dtype=np.float32).reshape((-1,4));r=np.asarray(rough.pixels[:],dtype=np.float32).reshape((-1,4))
    n[:,2]=r[:,0];n[:,3]=1;normal.pixels.foreach_set(n.ravel())
    normal.filepath_raw=os.path.join(ROOT,KIND+'.nar.jpg');normal.file_format='JPEG';normal.save()
    metal_path=os.path.join(ROOT,KIND+'.metal.jpg')
    if np.max(np.asarray(metal.pixels[:],dtype=np.float32).reshape((-1,4))[:,0]) > .02:
        metal.filepath_raw=metal_path;metal.file_format='JPEG';metal.save()
    elif os.path.exists(metal_path):os.remove(metal_path)

def evaluated():
    graph=bpy.context.evaluated_depsgraph_get();active=obj.evaluated_get(graph);mesh=active.to_mesh();mesh.calc_loop_triangles();mesh.calc_normals_split()
    return active,mesh

pose('walk',0)
active,mesh=evaluated();world=[active.matrix_world@v.co for v in mesh.vertices]
low=Vector([min(p[i] for p in world) for i in range(3)]);high=Vector([max(p[i] for p in world) for i in range(3)])
origin=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
root_head=rig.matrix_world@rig.pose.bones['Hips'].head if KIND=='charger' else None
height=high.z-low.z
records=[];indices=[];lookup={};uv=mesh.uv_layers['RuntimeAtlas']
for triangle in mesh.loop_triangles:
    for loop_id in triangle.loops:
        loop=mesh.loops[loop_id];tex=uv.data[loop_id].uv
        key=(loop.vertex_index,round(tex.x,7),round(tex.y,7),*(round(v,6) for v in loop.normal))
        if key not in lookup:lookup[key]=len(records);records.append((loop.vertex_index,loop_id,tex.copy()))
        indices.append(lookup[key])
active.to_mesh_clear()
for clip in ['walk','attack']:
    for sample in range(8):
        pose(clip,sample/(8 if clip=='walk' else 7));active,mesh=evaluated();points=[active.matrix_world@v.co for v in mesh.vertices]
        height=max(height,max(p.z for p in points)-min(p.z for p in points));active.to_mesh_clear()
scale=extent/height

stats=[]
for clip,count in [('walk',8),('attack',8)]+([] if KIND=='boss' else [('death',1)]):
    for sample in range(count):
        p=1 if clip=='death' else sample/(8 if clip=='walk' else 7);pose(clip,p);active,mesh=evaluated()
        points=[active.matrix_world@v.co for v in mesh.vertices]
        center=origin.copy()
        if clip=='death':
            lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)])
            center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
        else:
            center.z=min(point.z for point in points)
            if root_head is not None and clip=='walk':
                motion=rig.matrix_world@rig.pose.bones['Hips'].head-root_head
                center.x+=motion.x;center.y+=motion.y
        normals=active.matrix_world.to_3x3().inverted().transposed();name=KIND+'_'+clip+('' if clip=='death' else '_%02d'%sample)+'.zkmodel'
        path=os.path.join(ROOT,name)
        temporary=path+'.tmp'
        with open(temporary,'wb') as stream:
            stream.write(struct.pack('<4sIII',b'ZKMD',len(records),len(indices),1))
            for vertex,loop,tex in records:
                point=(active.matrix_world@mesh.vertices[vertex].co-center)*scale;normal=(normals@mesh.loops[loop].normal).normalized()
                stream.write(struct.pack('<9f',-point.x,point.z,point.y,-normal.x,normal.z,normal.y,tex.x,1-tex.y,LAYER))
            stream.write(struct.pack('<%dI'%len(indices),*indices))
        os.replace(temporary,path)
        active.to_mesh_clear();stats.append({'file':name,'bytes':os.path.getsize(path)})
        print('DETAIL-EXPORT',name,len(records),len(indices)//3,os.path.getsize(path))
pose('walk',0);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,KIND+'-prepared.blend'))
with open(os.path.join(ROOT,KIND+'-poses.json'),'w') as stream:
    json.dump({'kind':KIND,'layer':LAYER,'walk_frames':8,'attack_frames':8,'death_frames':0 if KIND=='boss' else 1,'cycle_ticks':cycle,'vertices':len(records),'triangles':len(indices)//3,
               'original_walk':'run' if KIND=='charger' else None,'derived_motions':['attack','death'] if KIND=='charger' else ['walk','attack'] if KIND=='boss' else ['walk','attack','death'],
               'textures':2048,'files':stats,'root_motion':'author Hips XY removed; each standing pose grounded',
               'source':'https://grab3d.com/models/anatomy/human-skeleton/' if KIND=='charger' else 'https://grab3d.com/models/creatures/crystal-dragon/' if KIND=='boss' else 'Original polygon sculpt from Zendikar concept sheet',
               'license':'CC0-1.0','author_attack_death':False},stream,indent=2)
print('DETAIL-DONE',KIND,len(records),len(indices)//3,sum(s['bytes'] for s in stats))
