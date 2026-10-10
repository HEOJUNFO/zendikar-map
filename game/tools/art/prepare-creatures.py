"""Bake existing CC0 rigs into shared authored poses; never creates geometry.

Blender --background --factory-startup --disable-autoexec --python this_file
-- <content/creatures directory>. Builds no runtime dependencies on Blender.
"""
import bpy, math, os, struct, sys, json
from mathutils import Vector
root = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
output = os.path.join(root, 'animated')
os.makedirs(output, exist_ok=True)
actors = [
    ('charger', 'Skeleton', 'Skeleton_Running', 'Skeleton_Attack', 'Skeleton_Death', ['Cylinder.001'], 1.8, 2),
    ('caster', 'Slime', 'Slime_Walk', 'Slime_Attack', 'Slime_Death', ['Slime'], 1.2, 2),
    ('boss', 'Dragon', 'Dragon_Flying', 'Dragon_Attack', 'Dragon_Death', ['Dragon', 'Eyes'], 4.8, 2),
    ('spider', None, 'Spider_Walk', 'Spider_Attack', 'Spider_Death', None, 2.4, 0),
]
metadata = {}
def extend_bounds(low, high, obj, mesh):
    for vertex in mesh.vertices:
        point = obj.matrix_world @ vertex.co
        for axis in range(3):
            low[axis] = min(low[axis], point[axis])
            high[axis] = max(high[axis], point[axis])

def colour(v):
    v = max(0.0, min(1.0, v))
    return 12.92*v if v <= 0.0031308 else 1.055*v**(1/2.4)-0.055
for kind, source, walk, attack, death, mesh_names, extent, axis in actors:
    if source:
        bpy.ops.wm.open_mainfile(filepath=os.path.join(root, 'sourceactors', source + '.blend'))
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(root, 'Spider.glb'))
    scene = bpy.context.scene
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and (mesh_names is None or o.name in mesh_names)]
    rigs = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not meshes or not rigs:
        raise ValueError('Missing authored actor: ' + kind)
    def action(name):
        matches = [a for a in bpy.data.actions if a.name == name or a.name.split('|')[-1] == name or a.name.split('|')[-1].startswith(name + '_')]
        if len(matches) != 1:
            raise ValueError('Missing/ambiguous action ' + name + ': ' + str([a.name for a in bpy.data.actions]))
        return matches[0]
    def select(name):
        selected = action(name)
        for rig in rigs:
            rig.animation_data_create()
            rig.animation_data.action = selected
            for track in rig.animation_data.nla_tracks:
                track.mute = True
        return selected
    locomotion = select(walk)
    start, end = locomotion.frame_range
    frames = [start + (end-start)*i/8 for i in range(8)]
    low, high = [math.inf] * 3, [-math.inf] * 3
    topology = {}
    for frame in frames:
        scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame))
        graph = bpy.context.evaluated_depsgraph_get()
        for original in meshes:
            obj = original.evaluated_get(graph)
            mesh = obj.to_mesh()
            if original.name not in topology:
                mesh.calc_loop_triangles()
                topology[original.name] = [(triangle.material_index, tuple(triangle.loops)) for triangle in mesh.loop_triangles]
            extend_bounds(low, high, obj, mesh)
            obj.to_mesh_clear()
    scale = extent/(high[axis]-low[axis])
    centre = Vector(((low[0]+high[0])/2, (low[1]+high[1])/2, low[2]))
    duration = round((end-start)/scene.render.fps*scene.render.fps_base*60)
    metadata[kind] = {'source': source or 'Spider.glb', 'walk': walk, 'attack': attack, 'death': death, 'cycle_ticks': duration, 'frames': 8, 'scale': scale}
    for clip, name in [('walk', walk), ('attack', attack), ('death', death)]:
        selected = select(name)
        begin, finish = selected.frame_range
        samples = [finish] if clip == 'death' else [begin+(finish-begin)*i/(8 if clip == 'walk' else 7) for i in range(8)]
        for index, frame in enumerate(samples):
            scene.frame_set(math.floor(frame), subframe=frame-math.floor(frame))
            graph = bpy.context.evaluated_depsgraph_get()
            # The author's corpse can fall sideways out of its locomotion root.
            # Rigidly settle the final pose at the same gameplay target origin.
            death_centre = None
            if clip == 'death':
                corpse_low, corpse_high = [math.inf] * 3, [-math.inf] * 3
                for original in meshes:
                    obj = original.evaluated_get(graph)
                    mesh = obj.to_mesh()
                    extend_bounds(corpse_low, corpse_high, obj, mesh)
                    obj.to_mesh_clear()
                death_centre = Vector(((corpse_low[0]+corpse_high[0])/2, (corpse_low[1]+corpse_high[1])/2, corpse_low[2]))
            vertices = []
            for original in meshes:
                obj = original.evaluated_get(graph)
                mesh = obj.to_mesh()
                mesh.calc_loop_triangles()
                mesh.calc_normals_split()
                normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
                for material_index, triangle_loops in topology[original.name]:
                    material = original.material_slots[material_index].material
                    rgb = material.diffuse_color[:3]
                    if material.use_nodes:
                        node = material.node_tree.nodes.get('Principled BSDF')
                        if node:
                            rgb = node.inputs['Base Color'].default_value[:3]
                    rgba = tuple(colour(c) for c in rgb) + (1.0 if 'eye' in material.name.lower() else 0.0,)
                    for loop_index in triangle_loops:
                        loop = mesh.loops[loop_index]
                        point = (obj.matrix_world @ mesh.vertices[loop.vertex_index].co-(death_centre or centre))*scale
                        normal = (normal_matrix @ loop.normal).normalized()
                        vertices.extend((point.x, point.z, -point.y, normal.x, normal.z, -normal.y) + rgba)
                obj.to_mesh_clear()
            path = os.path.join(output, kind + '_' + clip + ('' if clip == 'death' else '_%02d' % index) + '.meshbin')
            with open(path, 'wb') as stream:
                stream.write(struct.pack('<4sII', b'ZKMS', len(vertices)//10, 0))
                stream.write(struct.pack('<%df' % len(vertices), *vertices))
            print('ACTOR-EXPORT', kind, clip, index, len(vertices)//30, os.path.getsize(path))
    print('ACTOR-CYCLE', kind, duration, 'ticks', 'author FPS', scene.render.fps)
with open(os.path.join(output, 'sources.json'), 'w', encoding='utf8') as stream:
    json.dump(metadata, stream, ensure_ascii=False, indent=2)
