"""Export rubberduck's CC0 authored flying poses, UVs and textures.

Run Blender --background --disable-autoexec bat_v5.blend --python this_file
-- <output directory>. This reads the author's geometry; it creates no geometry.
The shipped pose meshes need no Blender or original .blend at build/runtime.
"""
import math
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
rig.animation_data.action = bpy.data.actions['Bat_Flying']
for track in rig.animation_data.nla_tracks:
    track.mute = True

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
for frame in range(8):
    obj, mesh = evaluated(frame)
    for vertex in mesh.vertices:
        point = obj.matrix_world @ vertex.co
        for axis in range(3):
            low[axis] = min(low[axis], point[axis])
            high[axis] = max(high[axis], point[axis])
    obj.to_mesh_clear()
scale = 2.8 / (high[0] - low[0])
center = Vector(((low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]))
for frame in range(8):
    obj, mesh = evaluated(frame)
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    uv_layer = mesh.uv_layers.active
    if not uv_layer:
        raise ValueError('Authored bat must have UVs')
    vertices, indices, seen = [], [], {}
    for triangle in mesh.loop_triangles:
        material = model.material_slots[triangle.material_index].material.name
        layer = 1.0 if material == 'bat_parts' else 0.0
        for loop_index in triangle.loops:
            loop = mesh.loops[loop_index]
            point = (obj.matrix_world @ mesh.vertices[loop.vertex_index].co - center) * scale
            normal = (normal_matrix @ loop.normal).normalized()
            uv = uv_layer.data[loop_index].uv
            # Blender Z-up/+Y-forward -> game Y-up/-Z-forward.
            values = (point.x, point.z, -point.y, normal.x, normal.z, -normal.y, uv.x, 1.0 - uv.y, layer)
            key = tuple(round(v, 7) for v in values)
            if key not in seen:
                seen[key] = len(vertices)
                vertices.append(values)
            indices.append(seen[key])
    path = os.path.join(output, 'flight_%02d.zkmodel' % frame)
    with open(path, 'wb') as stream:
        stream.write(struct.pack('<4sIII', b'ZKMD', len(vertices), len(indices), 1))
        for vertex in vertices:
            stream.write(struct.pack('<9f', *vertex))
        stream.write(struct.pack('<%dI' % len(indices), *indices))
    print('BAT-EXPORT', frame, len(vertices), len(indices) // 3, os.path.getsize(path))
    obj.to_mesh_clear()

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
