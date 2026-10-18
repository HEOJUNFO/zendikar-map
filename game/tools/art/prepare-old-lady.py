"""Export CDmir/TinyWorlds' CC0 Old Lady and her packed 2K textures.

Blender --background --factory-startup --disable-autoexec --python-exit-code 1
--python this_file -- <content/creatures/old-lady>. Never creates character geometry.
The author's Sitting action is retained; fallen/rising/hunt poses animate that rig.
"""
import bpy, json, math, os, struct, sys
from mathutils import Matrix, Quaternion, Vector

out = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.open_mainfile(filepath=os.path.join(out, 'oldlady-v2.blend'))
scene = bpy.context.scene
rig = bpy.data.objects['Armature']
actors = [bpy.data.objects['OldLady'], bpy.data.objects['Hair']]
author = bpy.data.actions['Sitting']
author_modes = {b.name: b.rotation_mode for b in rig.pose.bones}
author_basis = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
author_inherit = {b.name: b.bone.use_inherit_rotation for b in rig.pose.bones}
for track in rig.animation_data.nla_tracks:
    track.mute = True
topology = {}
shared_loops = {}

def evaluated():
    graph = bpy.context.evaluated_depsgraph_get()
    points, normals, uvs, indices = [], [], [], []
    for obj in actors:
        current = obj.evaluated_get(graph)
        mesh = current.to_mesh()
        mesh.calc_loop_triangles()
        mesh.calc_normals_split()
        if obj.name not in topology:
            topology[obj.name] = [tuple(t.loops) for t in mesh.loop_triangles]
        uv = mesh.uv_layers.active
        if not uv:
            raise ValueError('Author model is missing UVs')
        normal_matrix = current.matrix_world.to_3x3().inverted().transposed()
        # Stable UV/normal seams, indexed once rather than repeating each face corner.
        if obj.name not in shared_loops:
            unique, mapping, seen = [], {}, {}
            for loop in mesh.loops:
                key = (loop.vertex_index, tuple(round(v, 6) for v in uv.data[loop.index].uv), tuple(round(v, 5) for v in loop.normal))
                if key not in seen:
                    seen[key] = len(unique)
                    unique.append(loop.index)
                mapping[loop.index] = seen[key]
            shared_loops[obj.name] = unique, mapping
        unique, mapping = shared_loops[obj.name]
        base = len(points)
        for index in unique:
            loop = mesh.loops[index]
            points.append(current.matrix_world @ mesh.vertices[loop.vertex_index].co)
            normals.append((normal_matrix @ loop.normal).normalized())
            uvs.append(tuple(uv.data[loop.index].uv))
        for triangle in topology[obj.name]:
            indices.extend(base + mapping[index] for index in triangle)
        current.to_mesh_clear()
    return points, normals, uvs, indices

def bounds(points):
    return Vector([min(p[k] for p in points) for k in range(3)]), Vector([max(p[k] for p in points) for k in range(3)])

def authored(frame):
    rig.matrix_world = Matrix.Identity(4)
    rig.animation_data.action = author
    for bone in rig.pose.bones:
        bone.rotation_mode = author_modes[bone.name]
        bone.matrix_basis = author_basis[bone.name].copy()
        bone.bone.use_inherit_rotation = author_inherit[bone.name]
        for constraint in bone.constraints:
            constraint.mute = False
    scene.frame_set(int(frame), subframe=frame-int(frame))
    return evaluated()

# Sample a quiet seated segment, preserving her hands, head, cloth and expression.
seated = [authored(80 + 16 * i) for i in range(4)]
sit_lo, sit_hi = bounds([p for pose in seated for p in pose[0]])
sit_scale = 1.7 / (sit_hi.z - sit_lo.z)
sit_origin = Vector(((sit_lo.x + sit_hi.x)/2, (sit_lo.y + sit_hi.y)/2, sit_lo.z))

def reset():
    rig.matrix_world = Matrix.Identity(4)
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        for constraint in bone.constraints:
            constraint.mute = True
        bone.matrix_basis = Matrix.Identity(4)
        bone.bone.use_inherit_rotation = True
    bpy.context.view_layer.update()

reset()
rest_lo, rest_hi = bounds(evaluated()[0])
stand_scale = 2.2 / (rest_hi.z - rest_lo.z)
stand_origin = Vector(((rest_lo.x + rest_hi.x)/2, (rest_lo.y + rest_hi.y)/2, rest_lo.z))

def turn(name, x=0, y=0, z=0):
    bone = rig.pose.bones[name]
    bone.rotation_mode = 'XYZ'
    bone.rotation_euler = (x, y, z)

def hunt(phase):
    reset()
    stride = math.sin(phase)
    turn('hips', 0, 0, 0.02 * stride)
    turn('chest', 0.025, 0.025 * stride, 0)
    turn('thigh.L', 0.16 * stride)
    turn('thigh.R', -0.16 * stride)
    turn('shin.L', max(0, -stride) * 0.12)
    turn('shin.R', max(0, stride) * 0.12)
    turn('upper_arm.L', -0.1 * stride)
    turn('upper_arm.R', 0.1 * stride)
    turn('head', 0.04 * math.sin(phase * 2), 0.04 * stride, 0)
    bpy.context.view_layer.update()
    return evaluated()

def write(name, pose, scale, origin, settle=False):
    points, normals, uvs, indices = pose
    if settle:
        low, high = bounds(points)
        origin = Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z))
    path = os.path.join(out, name + '.zkmodel')
    with open(path, 'wb') as stream:
        stream.write(struct.pack('<4sIII', b'ZKMD', len(points), len(indices), 1))
        for point, normal, uv in zip(points, normals, uvs):
            p = (point - origin) * scale
            # Author is Z-up / -Y-forward: rotate to game Y-up / -Z-forward.
            stream.write(struct.pack('<9f', -p.x, p.z, p.y, -normal.x, normal.z, normal.y, uv[0], 1-uv[1], 0))
        stream.write(struct.pack('<%dI' % len(indices), *indices))
    print('OLDLADY-EXPORT', name, len(points), len(indices)//3, os.path.getsize(path))

for i, pose in enumerate(seated):
    write('sit-%02d' % i, pose, sit_scale, sit_origin)

# Freeze the evaluated seated constraints into FK, then animate the same bones.
authored(80)
snap = {b.name: b.matrix.copy() for b in rig.pose.bones}
reset()
for b in rig.pose.bones:
    args = {'parent_matrix': snap[b.parent.name], 'parent_matrix_local': b.parent.bone.matrix_local} if b.parent else {}
    b.matrix_basis = b.bone.convert_local_to_pose(snap[b.name], b.bone.matrix_local, invert=True, **args)
seat_basis = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
for i in range(4):
    authored(80)
    # Rotate the rig object: its original controller constraints retain the pose,
    # and both skinned meshes follow their actual armature parent together.
    rig.matrix_world = Matrix.Rotation(math.pi/2 * i/3, 4, 'X')
    bpy.context.view_layer.update()
    fallen = evaluated()
    write('fall-%02d' % i, fallen, sit_scale, sit_origin, settle=i>0)
hunting = [hunt(i*math.tau/8) for i in range(8)]
hunt_lo, hunt_hi = bounds([p for pose in hunting for p in pose[0]])
stand_scale = 2.2 / max(bounds(pose[0])[1].z-bounds(pose[0])[0].z for pose in hunting)
hunt(0)
hunt_basis = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
for i in range(8):
    progress = i/7
    reset()
    for b in rig.pose.bones:
        a, qa, sa = seat_basis[b.name].decompose()
        z, qz, sz = hunt_basis[b.name].decompose()
        b.matrix_basis = Matrix.LocRotScale(a.lerp(z, progress), qa.slerp(qz, progress), sa.lerp(sz, progress))
    rig.matrix_world = Matrix.Rotation(math.pi/2 * (1-progress), 4, 'X')
    bpy.context.view_layer.update()
    pose = fallen if i == 0 else hunting[0] if i == 7 else evaluated()
    write('rise-%02d' % i, pose, sit_scale+(stand_scale-sit_scale)*progress, stand_origin, settle=True)
for i in range(8):
    write('hunt-%02d' % i, hunting[i], stand_scale, stand_origin, settle=True)

# Preserve both authored 2048px maps. Non-color NAR stores normal XY + roughness.
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 94
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
diffuse = bpy.data.images['oldlady-skin+AO.png'].copy()
diffuse.unpack(method='REMOVE')
diffuse.filepath_raw = os.path.join(out, 'body.jpg')
diffuse.file_format = 'JPEG'
diffuse.save_render(diffuse.filepath_raw, scene=scene)
normal = bpy.data.images['oldlady-norm.png']
normal.colorspace_settings.name = 'Non-Color'
specular = bpy.data.images['oldlady-spec.png']
specular.colorspace_settings.name = 'Non-Color'
pixels, spec = list(normal.pixels), list(specular.pixels)
for i in range(0, len(pixels), 4):
    pixels[i+2] = max(0.35, 0.9-0.5*spec[i])
    pixels[i+3] = 1
nar = bpy.data.images.new('OldLady NAR', width=2048, height=2048, alpha=False)
nar.colorspace_settings.name = 'Non-Color'
nar.pixels.foreach_set(pixels)
nar.filepath_raw = os.path.join(out, 'body.nar.jpg')
nar.file_format = 'JPEG'
nar.save()
with open(os.path.join(out, 'poses.json'), 'w', encoding='utf8') as stream:
    json.dump({'source': 'oldlady-v2.blend', 'author': 'CDmir / TinyWorlds', 'license': 'CC0-1.0', 'source_url': 'https://opengameart.org/content/old-lady',
               'original_action': 'Sitting', 'original_seated_frames': [80, 96, 112, 128], 'derived_rig_motions': ['fall', 'rise', 'hunt'],
               'pose_counts': {'sit': 4, 'fall': 4, 'rise': 8, 'hunt': 8}, 'seated_height': 1.7, 'standing_height': 2.2, 'texture_resolution': 2048}, stream, indent=2)
