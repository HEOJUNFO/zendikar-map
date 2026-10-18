"""Remesh the owner's unrigged Omra GLB for the in-game merchant slot.

Run with bundled Blender 3.6 in background mode. The high-resolution GLB in
game/art-src/merchant is kept as the source; the ZKMD is the runtime asset.
"""
import bpy
import bmesh
import hashlib
import json
import os
import struct
import sys
from mathutils import Vector

repo = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
variant = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'normal'
sources = {'normal': 'fantasy-character-3d-model.glb',
           'corrupted': 'undead-female-warrior-3d-model.glb'}
if variant not in sources:
    raise RuntimeError(f'Unknown Omra variant: {variant}')
source = os.path.join(repo, 'game/art-src/merchant', sources[variant])
target = os.path.join(repo, 'game/gameplay/content/creatures/omra')
os.makedirs(target, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if len(objects) != 1:
    raise RuntimeError(f'Expected one character mesh, got {len(objects)}')
original = objects[0]
original.data.calc_loop_triangles()
source_triangles = len(original.data.loop_triangles)
if not original.data.uv_layers.active:
    raise RuntimeError('Source lacks UV coordinates')
print('OMRA-SOURCE', source_triangles, len(original.data.vertices), flush=True)

obj = bpy.data.objects.new('Omra retopology', original.data.copy())
bpy.context.collection.objects.link(obj)
obj.matrix_world = original.matrix_world.copy()
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
# A coarse prepass avoids feeding nearly two million scan triangles directly
# into the manifold-preserving voxel pass. It is discarded after remeshing.
decimate = obj.modifiers.new('Retopo prepass', 'DECIMATE')
decimate.ratio = min(1.0, 80000 / source_triangles)
bpy.ops.object.modifier_apply(modifier=decimate.name)
print('OMRA-PREPASS', len(obj.data.polygons), flush=True)
# The prepass keeps the original texture coordinates. Transfer from its 80K
# faces instead of searching two million scan triangles for every runtime UV.
uv_source = bpy.data.objects.new('Omra UV source', obj.data.copy())
bpy.context.collection.objects.link(uv_source)
uv_source.matrix_world = obj.matrix_world.copy()
# Tripo's scan contains loose/open cloth and small detached shells. A narrow
# voxel pass creates new manifold topology; the original stays
# untouched for UV/material transfer.
obj.data.remesh_voxel_size = .0025
bpy.ops.object.voxel_remesh()
voxel_faces = len(obj.data.polygons)
print('OMRA-VOXEL', voxel_faces, flush=True)
bm = bmesh.new()
bm.from_mesh(obj.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
invalid = {
    'wire': sum(e.is_wire for e in bm.edges),
    'overfull': sum(len(e.link_faces) > 2 for e in bm.edges),
    'flipped': sum(e.is_manifold and not e.is_contiguous for e in bm.edges),
}
print('OMRA-TOPOLOGY', invalid, flush=True)
if invalid['overfull']:
    bmesh.ops.split_edges(bm, edges=[e for e in bm.edges if len(e.link_faces) > 2])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(obj.data)
bm.free()
obj.data.update()
# Reduce the sealed voxel surface for GPU drawing. This keeps the scanned
# silhouette while authoring/rigging remains a separate future step.
obj.data.calc_loop_triangles()
decimate = obj.modifiers.new('Runtime triangle budget', 'DECIMATE')
decimate.ratio = min(1.0, 30000 / len(obj.data.loop_triangles))
bpy.ops.object.modifier_apply(modifier=decimate.name)
print('OMRA-RUNTIME-TRIANGLES', len(obj.data.polygons), flush=True)
obj.data.uv_layers.new(name='UVMap')
transfer = obj.modifiers.new('Transfer source UVs', 'DATA_TRANSFER')
transfer.object = uv_source
transfer.use_loop_data = True
transfer.data_types_loops = {'UV'}
transfer.loop_mapping = 'POLYINTERP_NEAREST'
transfer.layers_uv_select_src = uv_source.data.uv_layers.active.name
transfer.layers_uv_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier=transfer.name)

mesh = obj.data
mesh.calc_loop_triangles()
mesh.calc_normals_split()
uv = mesh.uv_layers.active
normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
# Blender Z-up/-Y-forward -> game Y-up/-Z-forward, with positive determinant.
def orient(v):
    return Vector((-v.x, v.z, v.y))

height = max((obj.matrix_world @ v.co).z for v in mesh.vertices) - min((obj.matrix_world @ v.co).z for v in mesh.vertices)
scale = 2.05 / height
positions = [orient(obj.matrix_world @ v.co) * scale for v in mesh.vertices]
low = min(p.y for p in positions)
positions = [Vector((p.x, p.y - low, p.z)) for p in positions]
vertices = bytearray()
indices = []
lookup = {}
for triangle in mesh.loop_triangles:
    for loop_id in triangle.loops:
        loop = mesh.loops[loop_id]
        tex = uv.data[loop_id].uv
        n = orient(normal_matrix @ loop.normal).normalized()
        p = positions[loop.vertex_index]
        record = struct.pack('<9f', p.x, p.y, p.z, n.x, n.y, n.z, tex.x, 1 - tex.y, float(variant == 'corrupted'))
        index = lookup.get(record)
        if index is None:
            index = len(lookup)
            lookup[record] = index
            vertices.extend(record)
        indices.append(index)
data = struct.pack('<4sIII', b'ZKMD', len(lookup), len(indices), 0) + vertices + struct.pack('<%dI' % len(indices), *indices)
name = 'body' if variant == 'normal' else 'corrupted'
path = os.path.join(target, name + '.zkmodel')
with open(path + '.tmp', 'wb') as out:
    out.write(data)
os.replace(path + '.tmp', path)
result = {
    'source': 'game/art-src/merchant/' + sources[variant],
    'source_sha256': hashlib.sha256(open(source, 'rb').read()).hexdigest(),
    'source_triangles': source_triangles,
    'method': 'Decimate prepass, manifold voxel remesh at 2.5 mm, runtime triangle decimation, UV transfer from UV-preserving prepass',
    'voxel_faces': voxel_faces,
    'triangles': len(indices) // 3,
    'vertices': len(lookup),
    'height_metres': 2.05,
    'bounds': {'min': [min(p[i] for p in positions) for i in range(3)],
               'max': [max(p[i] for p in positions) for i in range(3)]},
    'model_sha256': hashlib.sha256(data).hexdigest(),
}
with open(os.path.join(target, name + '.json'), 'w', encoding='utf8') as out:
    json.dump(result, out, indent=2)
print('OMRA-MODEL', json.dumps(result), flush=True)
