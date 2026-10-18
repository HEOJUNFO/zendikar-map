"""Export rubberduck's CC0 authored flying poses, UVs and textures.

Run Blender --background --disable-autoexec bat_v5.blend --python this_file
-- <output directory>. This reads the author's geometry; it creates no geometry.
The shipped pose meshes need no Blender or original .blend at build/runtime.
"""
import math
import hashlib
import json
import os
import struct
import sys

import bpy
from mathutils import Vector

output = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
os.makedirs(output, exist_ok=True)
scene = bpy.context.scene
rig = bpy.data.objects['Armature_Bat']
model = bpy.data.objects['Bat_LP_Anim']
# The author's rig is stored in a viewport-hidden collection. Blender can
# return a frozen armature from that collection even as scene frames advance.
# Enable its dependency collections before evaluating the authored action.
def reveal(collection):
    if collection.collection in rig.users_collection or collection.collection in model.users_collection:
        collection.exclude = False
        collection.hide_viewport = False
        collection.collection.hide_viewport = False
        return True
    needed = any([reveal(child) for child in collection.children])
    if needed:
        collection.exclude = False
        collection.hide_viewport = False
        collection.collection.hide_viewport = False
    return needed
reveal(bpy.context.view_layer.layer_collection)
rig.hide_set(False)
rig.hide_viewport = False
rig.animation_data.action = bpy.data.actions['Bat_Flying']
rig.animation_data.use_nla = False
for track in rig.animation_data.nla_tracks:
    track.mute = True
first = max(scene.frame_start, int(rig.animation_data.action.frame_range[0]))
last = min(scene.frame_end, int(rig.animation_data.action.frame_range[1]))
frames = list(range(first, last + 1))
fps = scene.render.fps / scene.render.fps_base
cycle_ticks = len(frames) * 60 / fps
if frames != list(range(1, 9)) or cycle_ticks != 20:
    raise ValueError('Update runtime bat cycle contract for the changed authored clip')

def evaluated(frame):
    scene.frame_set(frame)
    graph = bpy.context.evaluated_depsgraph_get()
    obj = model.evaluated_get(graph)
    mesh = obj.to_mesh()
    mesh.calc_loop_triangles()
    mesh.calc_normals_split()
    return obj, mesh

# Keep one common origin/scale across poses, preserving the authored movement.
low, high = [math.inf] * 3, [-math.inf] * 3
for frame in frames:
    obj, mesh = evaluated(frame)
    for vertex in mesh.vertices:
        point = obj.matrix_world @ vertex.co
        for axis in range(3):
            low[axis] = min(low[axis], point[axis])
            high[axis] = max(high[axis], point[axis])
    obj.to_mesh_clear()
scale = 2.8 / (high[0] - low[0])
center = Vector(((low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]))
records, indices, topology = [], [], None
statistics = []
for sample, frame in enumerate(frames):
    obj, mesh = evaluated(frame)
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    uv_layer = mesh.uv_layers.active
    if not uv_layer:
        raise ValueError('Authored bat must have UVs')
    # Blender may choose a different diagonal for a bent author quad. Freeze
    # first-pose triangulation while checking the underlying polygon/loop IDs.
    signature = [(tuple(p.loop_indices), tuple(p.vertices), p.material_index) for p in mesh.polygons]
    if topology is None:
        topology, seen = signature, {}
        for triangle in mesh.loop_triangles:
            material = model.material_slots[triangle.material_index].material.name
            layer = 1.0 if material == 'bat_parts' else 0.0
            for loop_index in triangle.loops:
                loop = mesh.loops[loop_index]
                uv = uv_layer.data[loop_index].uv
                key = (loop.vertex_index, round(uv.x, 7), round(uv.y, 7), layer, *(round(v, 6) for v in loop.normal))
                if key not in seen:
                    seen[key] = len(records)
                    records.append((loop.vertex_index, loop_index, uv.copy(), layer))
                indices.append(seen[key])
    elif signature != topology:
        raise ValueError('Authored flight must retain evaluated topology across every pose')
    vertices = []
    for vertex, loop, uv, layer in records:
        point = (obj.matrix_world @ mesh.vertices[vertex].co - center) * scale
        normal = (normal_matrix @ mesh.loops[loop].normal).normalized()
        if normal.length_squared < .99:
            raise ValueError('Invalid authored flight normal')
        # Blender Z-up/+Y-forward -> game Y-up/-Z-forward.
        vertices.append((point.x, point.z, -point.y, normal.x, normal.z, -normal.y, uv.x, 1.0 - uv.y, layer))
    path = os.path.join(output, 'flight_%02d.zkmodel' % sample)
    temporary = path + '.tmp'
    with open(temporary, 'wb') as stream:
        stream.write(struct.pack('<4sIII', b'ZKMD', len(vertices), len(indices), 1))
        for vertex in vertices:
            stream.write(struct.pack('<9f', *vertex))
        stream.write(struct.pack('<%dI' % len(indices), *indices))
    os.replace(temporary, path)
    points = [v[:3] for v in vertices]
    tip = rig.evaluated_get(bpy.context.evaluated_depsgraph_get()).pose.bones['W_06.R'].tail
    tip = (rig.matrix_world @ tip - center) * scale
    statistics.append({'pose': sample, 'source_frame': frame, 'sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest(),
                       'right_wing_bone_tip': [tip.x, tip.z, -tip.y],
                       'bounds': {'lo': [min(p[a] for p in points) for a in range(3)], 'hi': [max(p[a] for p in points) for a in range(3)]}})
    print('BAT-EXPORT', frame, len(vertices), len(indices) // 3, os.path.getsize(path), flush=True)
    obj.to_mesh_clear()

with open(os.path.join(output, 'flight.json'), 'w', encoding='utf8') as stream:
    json.dump({'author': 'rubberduck', 'license': 'CC0-1.0', 'source': 'bat_v5.blend',
               'source_sha256': hashlib.sha256(open(bpy.data.filepath, 'rb').read()).hexdigest(),
               'rig': rig.name, 'action': rig.animation_data.action.name, 'source_frames': frames,
               'source_fps': fps, 'cycle_ticks': cycle_ticks, 'wingspan': 2.8,
               'vertices': len(records), 'triangles': len(indices) // 3, 'poses': statistics}, stream, indent=2)
if '--poses-only' in sys.argv:
    print('BAT-EXPORT-DONE', output, 'wingspan=2.8m', 'authored flying poses=8', 'cycle_ticks=20', flush=True)
    raise SystemExit(0)

# Keep the two authored material images. JPEG saves are deliberately independent
# of scene colour management: texture samples remain sRGB, normal samples linear.
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 94
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
source_dir = os.path.dirname(bpy.data.filepath)
for name, source in [('bat', 'bat_tex.jpg'), ('parts', 'bat_parts.jpg')]:
    image = bpy.data.images.load(os.path.join(source_dir, source), check_existing=False)
    image.scale(1024, 1024)
    image.filepath_raw = os.path.join(output, name + '.jpg')
    image.file_format = 'JPEG'
    image.save()
    nar = bpy.data.images.new(name + '_nar', width=1024, height=1024, alpha=False)
    nar.colorspace_settings.name = 'Non-Color'
    if name == 'bat':
        normal = bpy.data.images.load(os.path.join(source_dir, 'bat_tex_n.jpg'), check_existing=False)
        normal.colorspace_settings.name = 'Non-Color'
        normal.scale(1024, 1024)
        pixels = list(normal.pixels)
        # Match the existing NAR layout: normal XY, roughness, opaque alpha.
        for pixel in range(0, len(pixels), 4):
            pixels[pixel + 2] = 0.85
            pixels[pixel + 3] = 1.0
    else:
        pixels = [0.5, 0.5, 0.85, 1.0] * (1024 * 1024)
    nar.pixels.foreach_set(pixels)
    nar.filepath_raw = os.path.join(output, name + '.nar.jpg')
    nar.file_format = 'JPEG'
    nar.save()
print('BAT-EXPORT-DONE', output, 'wingspan=2.8m', 'authored flying poses=8')
