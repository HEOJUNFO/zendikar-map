"""Derive an organic PBR Skyclave spider while retaining Quaternius's CC0 rig.

Blender --background --factory-startup --disable-autoexec --python this_file
-- <content/creatures directory>. Writes only high-detail/spider* assets.
The original Spider.glb remains the reproduction source. No primitive replacement
or procedural gait: all seventeen poses evaluate its authored animation actions.
--poses-only reuses existing atlas files when only pose placement changes.
"""
import bpy
import bmesh
import json
import math
import os
import struct
import sys
import numpy as np
from mathutils import Vector

root = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
output = os.path.join(root, 'high-detail')
os.makedirs(output, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(root, 'Spider.glb'))
model = next(obj for obj in bpy.data.objects if obj.type == 'MESH')
rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks:
    track.mute = True
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = model
model.select_set(True)

# glTF duplicates sharp-normal corners. Weld only coincident source corners,
# retaining deform weights, before sculpt subdivision; detached triangles must
# never become independently rounded pieces.
bm = bmesh.new()
bm.from_mesh(model.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
bm.to_mesh(model.data)
bm.free()
# Embed the small compound eyes instead of retaining the source's prominent
# spherical eye bulges. Each connected eye keeps its original Head skin weight.
eyes = {vertex for polygon in model.data.polygons if polygon.material_index == 1 for vertex in polygon.vertices}
neighbors = {vertex: set() for vertex in eyes}
for edge in model.data.edges:
    a, b = edge.vertices
    if a in eyes and b in eyes:
        neighbors[a].add(b)
        neighbors[b].add(a)
pending = set(eyes)
while pending:
    component, stack = set(), [pending.pop()]
    while stack:
        vertex = stack.pop()
        component.add(vertex)
        for other in neighbors[vertex] & pending:
            pending.remove(other)
            stack.append(other)
    center_eye = sum((model.data.vertices[index].co for index in component), Vector()) / len(component)
    for index in component:
        model.data.vertices[index].co = center_eye + (model.data.vertices[index].co - center_eye) * 0.55 + Vector((0, 0, 0.00035))
head = model.vertex_groups['Head'].index
abdomen = model.vertex_groups['Abdomen'].index
for vertex in model.data.vertices:
    weights = {group.group: group.weight for group in vertex.groups}
    if weights.get(abdomen, 0) > 0.5:
        vertex.co.y = -0.00955 + (vertex.co.y + 0.00955) * 0.82
        vertex.co.z = 0.01585 + (vertex.co.z - 0.01585) * 1.18
        vertex.co.x *= 1 - 0.15 * max(0, (vertex.co.z - 0.01585) / 0.012)
    elif weights.get(head, 0) > 0.5 and vertex.index not in eyes:
        vertex.co.x *= 0.87
        if vertex.co.z < -0.011:
            vertex.co.z -= min(1, (-vertex.co.z - 0.011) / 0.005) * 0.004
subdivision = model.modifiers.new('Organic chitin subdivision', 'SUBSURF')
subdivision.levels = 1
subdivision.render_levels = 1
while model.modifiers[0] != subdivision:
    bpy.ops.object.modifier_move_up(modifier=subdivision.name)
bpy.ops.object.modifier_apply(modifier=subdivision.name)

# Shape the existing connected shell: fine layered ridges and irregular chitin,
# strongest on the abdomen/carapace and restrained along articulated leg tips.
shell = {model.vertex_groups[name].index for name in ['Abdomen', 'Thorax', 'Head']}
model.data.update()
for vertex in model.data.vertices:
    coverage = sum(group.weight for group in vertex.groups if group.group in shell)
    point = vertex.co
    grain = math.sin(point.x * 2650 + math.sin(point.z * 1910)) * math.sin(point.y * 2380 + point.z * 1700)
    ridges = max(0.0, math.sin(point.z * 1300 + point.x * 180)) ** 8
    vertex.co += vertex.normal * ((0.00018 * grain + 0.00065 * ridges) * (0.25 + 0.75 * coverage))
# Extrude selected existing shell faces into organic protective spines. Their
# deform data comes from those source faces, so every spine follows the author rig.
bm = bmesh.new()
bm.from_mesh(model.data)
bm.normal_update()
selected, centers = [], []
for face in bm.faces:
    center_face = face.calc_center_median()
    if face.material_index == 1 or face.normal.y > -0.4:
        continue
    if math.sin(center_face.x * 7300 + center_face.z * 4900) < 0.2:
        continue
    if any((center_face - earlier).length < 0.0022 for earlier in centers):
        continue
    centers.append(center_face.copy())
    selected.append(face)
extruded = bmesh.ops.extrude_discrete_faces(bm, faces=selected)['faces']
for face in extruded:
    center_face = face.calc_center_median()
    height = 0.0012 if abs(center_face.x) > 0.012 else 0.0022
    normal_face = face.normal.normalized()
    for vertex in face.verts:
        vertex.co = center_face + (vertex.co - center_face) * 0.06 + normal_face * height
bm.to_mesh(model.data)
bm.free()
for polygon in model.data.polygons:
    polygon.use_smooth = True
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.012)
bpy.ops.object.mode_set(mode='OBJECT')
print('SPIDER-SCULPT', len(model.data.vertices), len(model.data.polygons), flush=True)

side = 2048
albedo = bpy.data.images.new('Skyclave spider albedo', side, side, alpha=False)
normal = bpy.data.images.new('Skyclave spider tangent normal', side, side, alpha=False)
rough = bpy.data.images.new('Skyclave spider roughness', side, side, alpha=False)
normal.colorspace_settings.name = 'Non-Color'
rough.colorspace_settings.name = 'Non-Color'
materials = []
for material_index in range(len(model.material_slots)):
    material = bpy.data.materials.new('Weathered organic chitin' if material_index == 0 else 'Non-emissive mana eyes')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Specular'].default_value = 0.45
    if material_index == 0:
        coordinates = nodes.new('ShaderNodeTexCoord')
        texture = nodes.new('ShaderNodeTexNoise')
        texture.inputs['Scale'].default_value = 35
        texture.inputs['Detail'].default_value = 5
        texture.inputs['Roughness'].default_value = 0.7
        links.new(coordinates.outputs['Generated'], texture.inputs['Vector'])
        palette = nodes.new('ShaderNodeValToRGB')
        palette.color_ramp.elements[0].position = 0.18
        palette.color_ramp.elements[0].color = (0.014, 0.019, 0.019, 1)
        palette.color_ramp.elements[1].position = 0.8
        palette.color_ramp.elements[1].color = (0.12, 0.10, 0.069, 1)
        moss = palette.color_ramp.elements.new(0.62)
        moss.color = (0.04, 0.065, 0.054, 1)
        links.new(texture.outputs['Fac'], palette.inputs['Fac'])
        links.new(palette.outputs['Color'], bsdf.inputs['Base Color'])
        pores = nodes.new('ShaderNodeTexNoise')
        pores.inputs['Scale'].default_value = 220
        pores.inputs['Detail'].default_value = 3
        links.new(coordinates.outputs['Generated'], pores.inputs['Vector'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.38
        bump.inputs['Distance'].default_value = 0.00025
        links.new(pores.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        roughness = nodes.new('ShaderNodeMapRange')
        roughness.inputs['To Min'].default_value = 0.38
        roughness.inputs['To Max'].default_value = 0.78
        links.new(texture.outputs['Fac'], roughness.inputs['Value'])
        links.new(roughness.outputs['Result'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Base Color'].default_value = (0.018, 0.085, 0.075, 1)
        bsdf.inputs['Roughness'].default_value = 0.3
    atlas = nodes.new('ShaderNodeTexImage')
    nodes.active = atlas
    model.material_slots[material_index].material = material
    materials.append((material, atlas))

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.render.bake.margin = 10
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.render.bake.use_pass_color = True
# Bake the static source rest mesh; deformation never rebakes or moves UVs.
armature = next(modifier for modifier in model.modifiers if modifier.type == 'ARMATURE')
armature.show_render = False
armature.show_viewport = False
for kind, image in ([] if '--poses-only' in sys.argv else [('DIFFUSE', albedo), ('NORMAL', normal), ('ROUGHNESS', rough)]):
    for material, atlas in materials:
        atlas.image = image
        material.node_tree.nodes.active = atlas
    bpy.ops.object.bake(type=kind)
    print('SPIDER-BAKE', kind, side, flush=True)
armature.show_render = True
armature.show_viewport = True
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 94
if '--poses-only' not in sys.argv:
    albedo.filepath_raw = os.path.join(output, 'spider.jpg')
    albedo.file_format = 'JPEG'
    albedo.save()
    normal_pixels = np.empty(side * side * 4, dtype=np.float32)
    rough_pixels = np.empty_like(normal_pixels)
    normal.pixels.foreach_get(normal_pixels)
    rough.pixels.foreach_get(rough_pixels)
    normal_pixels[2::4] = rough_pixels[0::4]
    normal_pixels[3::4] = 1
    nar = bpy.data.images.new('Skyclave spider NAR', side, side, alpha=False)
    nar.colorspace_settings.name = 'Non-Color'
    nar.pixels.foreach_set(normal_pixels)
    nar.filepath_raw = os.path.join(output, 'spider.nar.jpg')
    nar.file_format = 'JPEG'
    nar.save()

def select(name):
    selected = next(action for action in bpy.data.actions if action.name.split('|')[-1].startswith(name + '_'))
    rig.animation_data.action = selected
    return selected

def evaluated(frame):
    scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
    obj = model.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = obj.to_mesh()
    mesh.calc_loop_triangles()
    mesh.calc_normals_split()
    return obj, mesh

walk = select('Spider_Walk')
begin, finish = walk.frame_range
low, high = [math.inf] * 3, [-math.inf] * 3
for frame in [begin + (finish - begin) * i / 8 for i in range(8)]:
    obj, mesh = evaluated(frame)
    for vertex in mesh.vertices:
        point = obj.matrix_world @ vertex.co
        for axis in range(3):
            low[axis] = min(low[axis], point[axis])
            high[axis] = max(high[axis], point[axis])
    obj.to_mesh_clear()
scale = 2.4 / (high[0] - low[0])
center = Vector(((low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]))
topology, vertex_loops, indices = None, [], []
for clip, name in [('walk', 'Spider_Walk'), ('attack', 'Spider_Attack'), ('death', 'Spider_Death')]:
    action = select(name)
    first, last = action.frame_range
    frames = [last] if clip == 'death' else [first + (last - first) * i / (8 if clip == 'walk' else 7) for i in range(8)]
    for frame_index, frame in enumerate(frames):
        obj, mesh = evaluated(frame)
        if topology is None:
            topology = [tuple(triangle.loops) for triangle in mesh.loop_triangles]
            seen = {}
            for triangle in topology:
                for loop_index in triangle:
                    loop = mesh.loops[loop_index]
                    uv = mesh.uv_layers.active.data[loop_index].uv
                    key = (loop.vertex_index, round(uv.x, 7), round(uv.y, 7))
                    if key not in seen:
                        seen[key] = len(vertex_loops)
                        vertex_loops.append(loop_index)
                    indices.append(seen[key])
        normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
        pose_center = center
        if clip == 'death':
            corpse_low, corpse_high = [math.inf] * 3, [-math.inf] * 3
            for vertex in mesh.vertices:
                point = obj.matrix_world @ vertex.co
                for axis in range(3):
                    corpse_low[axis] = min(corpse_low[axis], point[axis])
                    corpse_high[axis] = max(corpse_high[axis], point[axis])
            pose_center = Vector(((corpse_low[0] + corpse_high[0]) / 2, (corpse_low[1] + corpse_high[1]) / 2, corpse_low[2]))
        vertices = []
        for loop_index in vertex_loops:
            loop = mesh.loops[loop_index]
            point = (obj.matrix_world @ mesh.vertices[loop.vertex_index].co - pose_center) * scale
            normal_value = (normal_matrix @ loop.normal).normalized()
            uv = mesh.uv_layers.active.data[loop_index].uv
            # Authored face points toward Blender -Y. Rotate into game -Z;
            # the paired X/Z turn preserves orientation and tangent handedness.
            vertices.extend((-point.x, point.z, point.y, -normal_value.x, normal_value.z, normal_value.y, uv.x, 1 - uv.y, 2.0))
        path = os.path.join(output, 'spider_' + clip + ('' if clip == 'death' else '_%02d' % frame_index) + '.zkmodel')
        with open(path, 'wb') as stream:
            stream.write(struct.pack('<4sIII', b'ZKMD', len(vertex_loops), len(indices), 1))
            stream.write(struct.pack('<%df' % len(vertices), *vertices))
            stream.write(struct.pack('<%dI' % len(indices), *indices))
        obj.to_mesh_clear()
        print('SPIDER-EXPORT', clip, frame_index, len(vertex_loops), len(indices) // 3, os.path.getsize(path), flush=True)
with open(os.path.join(output, 'spider-source.json'), 'w', encoding='utf8') as stream:
    json.dump({'source': '../Spider.glb', 'author': 'Quaternius', 'license': 'CC0', 'derivative': 'welded authored mesh, organic subdivision/sculpt, UV and 2048 PBR bake',
               'vertices': len(vertex_loops), 'triangles': len(indices) // 3, 'subdivision': 1, 'shell_spines': len(extruded),
               'walk': 'Spider_Walk', 'attack': 'Spider_Attack', 'death': 'Spider_Death', 'cycle_ticks': 50, 'scale': scale}, stream, indent=2)
print('SPIDER-DONE', output, flush=True)
