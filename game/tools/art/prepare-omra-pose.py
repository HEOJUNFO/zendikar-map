"""Bake one pose of the rigged Omra into the static in-game merchant mesh.

The game draws the merchant as a static mesh (no skinning), so a Tripo
animation preset is sampled at one frame and written as the runtime ZKMD.
Run with the bundled Blender 3.6 in background mode:

  blender --background --factory-startup --python game/tools/art/prepare-omra-pose.py -- <rigged.glb> <animation.glb> [body|corrupted] [frame]

Tripo returns the rigged mesh and each animation preset as separate GLBs (the
animation file holds the same skeleton and one action, no mesh); the action is
bound to the rigged model here.

Without a frame, the frame where the pelvis is lowest is used (the settled
seat of the `sit` preset). Height matches prepare-omra-model.py: the rest
pose is 2.05 m tall and the same scale is applied to the baked pose.
"""
import bpy
import hashlib
import json
import os
import struct
import sys
from mathutils import Vector

repo = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
args = sys.argv[sys.argv.index('--') + 1:]
source = os.path.abspath(args[0])
animation = os.path.abspath(args[1])
name = args[2] if len(args) > 2 else 'body'
if name not in ('body', 'corrupted'):
    raise RuntimeError(f'Unknown Omra form: {name}')
forced = int(args[3]) if len(args) > 3 else None
target = os.path.join(repo, 'game/gameplay/content/creatures/omra')
REST_HEIGHT = 2.05
TRIANGLES = 30000
SEAT_BACK = 0.3

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
scene = bpy.context.scene
armatures = [o for o in scene.objects if o.type == 'ARMATURE']
meshes = [o for o in scene.objects if o.type == 'MESH']
if len(armatures) != 1 or len(meshes) != 1:
    raise RuntimeError(f'Expected one armature and one mesh, got {len(armatures)} and {len(meshes)}')
rig, body = armatures[0], meshes[0]
before = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=animation)
actions = [a for a in bpy.data.actions if a not in before]
if len(actions) != 1:
    raise RuntimeError(f'Expected one action in the animation GLB, got {len(actions)}')
action = actions[0]
missing = sorted({c.data_path.split('"')[1] for c in action.fcurves if c.data_path.startswith('pose.bones')} - {b.name for b in rig.pose.bones})
if missing:
    raise RuntimeError(f'Animation drives bones the rig lacks: {missing[:5]}')
rig.animation_data_create()
rig.animation_data.action = action
first, last = (int(round(v)) for v in action.frame_range)


def world_bounds(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    points = [evaluated.matrix_world @ mesh.vertices[i].co for i in range(0, len(mesh.vertices), 37)]
    evaluated.to_mesh_clear()
    return [min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]


# Rest pose fixes the metre scale shared with the standing model.
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()
low, high = world_bounds(body)
scale = REST_HEIGHT / (high[2] - low[2])
rig.data.pose_position = 'POSE'

pelvis = rig.pose.bones.get('Pelvis') or rig.pose.bones.get('Hip')
heights = {}
for frame in range(first, last + 1):
    scene.frame_set(frame)
    heights[frame] = (rig.matrix_world @ pelvis.head).z
frame = forced if forced is not None else min(sorted(heights, reverse=True), key=lambda f: round(heights[f], 4))
scene.frame_set(frame)
bpy.context.view_layer.update()
print('OMRA-POSE-FRAMES', first, last, 'chosen', frame, 'pelvis', round(heights[frame] * scale, 4), 'standing pelvis', round(max(heights.values()) * scale, 4), flush=True)

evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
posed = bpy.data.objects.new('Omra posed', bpy.data.meshes.new_from_object(evaluated))
bpy.context.collection.objects.link(posed)
posed.matrix_world = evaluated.matrix_world.copy()
pelvis_world = rig.matrix_world @ pelvis.head
bpy.ops.object.select_all(action='DESELECT')
posed.select_set(True)
bpy.context.view_layer.objects.active = posed
posed.data.calc_loop_triangles()
source_triangles = len(posed.data.loop_triangles)
decimate = posed.modifiers.new('Runtime triangle budget', 'DECIMATE')
decimate.ratio = min(1.0, TRIANGLES / source_triangles)
bpy.ops.object.modifier_apply(modifier=decimate.name)

mesh = posed.data
mesh.calc_loop_triangles()
mesh.calc_normals_split()
uv = mesh.uv_layers.active
if uv is None:
    raise RuntimeError('Source lacks UV coordinates')
normal_matrix = posed.matrix_world.to_3x3().inverted().transposed()


# Blender Z-up -> game Y-up with the face toward -Z (the counter and the door).
# Tripo's rigged export is turned a quarter about the up axis from the unrigged
# scan prepare-omra-model.py reads, so this is that script's mapping turned back.
def orient(v):
    return Vector((-v.y, v.z, -v.x))


positions = [orient(posed.matrix_world @ v.co) * scale for v in mesh.vertices]
floor = min(p.y for p in positions)
# The merchant's origin is fixed by the simulation; slide the seated body back so
# the knees clear the counter's rear edge (z -0.44) and the hips rest on the chair.
positions = [Vector((p.x, p.y - floor, p.z + SEAT_BACK)) for p in positions]
seat = orient(pelvis_world) * scale
seat = [seat.x, seat.y - floor, seat.z + SEAT_BACK]
layer = float(name == 'corrupted')
vertices = bytearray()
indices = []
lookup = {}
for triangle in mesh.loop_triangles:
    for loop_id in triangle.loops:
        loop = mesh.loops[loop_id]
        tex = uv.data[loop_id].uv
        n = orient(normal_matrix @ loop.normal).normalized()
        p = positions[loop.vertex_index]
        record = struct.pack('<9f', p.x, p.y, p.z, n.x, n.y, n.z, tex.x, 1 - tex.y, layer)
        index = lookup.get(record)
        if index is None:
            index = len(lookup)
            lookup[record] = index
            vertices.extend(record)
        indices.append(index)
data = struct.pack('<4sIII', b'ZKMD', len(lookup), len(indices), 0) + vertices + struct.pack('<%dI' % len(indices), *indices)
path = os.path.join(target, name + '.zkmodel')
with open(path + '.tmp', 'wb') as out:
    out.write(data)
os.replace(path + '.tmp', path)
result = {
    'source': os.path.relpath(source, repo).replace(os.sep, '/'),
    'animation': os.path.relpath(animation, repo).replace(os.sep, '/'),
    'animation_name': action.name,
    'source_sha256': hashlib.sha256(open(source, 'rb').read()).hexdigest(),
    'source_triangles': source_triangles,
    'method': f'Tripo rig + animation preset sampled at frame {frame} of {first}..{last} (lowest pelvis), collapse decimation with the source UVs',
    'pose_frame': frame,
    'triangles': len(indices) // 3,
    'vertices': len(lookup),
    'height_metres': REST_HEIGHT,
    'pelvis': seat,
    'bounds': {'min': [min(p[i] for p in positions) for i in range(3)],
               'max': [max(p[i] for p in positions) for i in range(3)]},
    'model_sha256': hashlib.sha256(data).hexdigest(),
}
with open(os.path.join(target, name + '.json'), 'w', encoding='utf8') as out:
    json.dump(result, out, indent=2)
print('OMRA-MODEL', json.dumps(result), flush=True)
