"""Prepare the four selected act-one static monsters from the owner's split GLBs.

Run with Blender 3.6 in background mode. Source objects are already split,
centered and grounded; this pass only reduces triangles, sets gameplay scale,
rotates +X authored front to game -Z, and exports one ZKMD per creature.
"""
import bpy, bmesh, hashlib, json, math, os, struct
from mathutils import Matrix, Vector

repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
source=os.path.join(repo,'game/art-src/tazeem/tripo-split')
target=os.path.join(repo,'build/act1-retopo-candidate')
os.makedirs(target,exist_ok=True)
selection=[
    ('01-ruin-crab.glb','crab',7.0,6000),
    ('04-canopy-glider.glb','glider',5.7,6000),
    ('05-tazeem-raptor.glb','raptor',5.8,6000),
    ('07-tower-backed-baloth-boss.glb','baloth',18.0,18000),
]
expected=json.load(open(os.path.join(source,'manifest.json')))
inputs={f['file']:f for f in expected['files']}
results=[]
for filename,name,scale,budget in selection:
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(source,filename))
    objects=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
    if len(objects)!=1 or len(objects[0].data.polygons)!=inputs[filename]['triangles']:
        raise RuntimeError(f'{filename}: source topology mismatch')
    original=objects[0]
    original_polygons=len(original.data.polygons)
    obj=bpy.data.objects.new(name+'_retopo',original.data.copy())
    bpy.context.collection.objects.link(obj)
    obj.matrix_world=original.matrix_world.copy()
    original.select_set(False)
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    overlapping=[edge for edge in bm.edges if len(edge.link_faces)>2]
    if overlapping:
        # The raptor source has one coincident wing junction shared by three
        # faces. Disconnect only that edge; all face positions remain intact.
        bmesh.ops.split_edges(bm,edges=overlapping)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    edges={'boundary':sum(e.is_boundary for e in bm.edges),'wire':sum(e.is_wire for e in bm.edges),'overfull':sum(len(e.link_faces)>2 for e in bm.edges),'flipped':sum(e.is_manifold and not e.is_contiguous for e in bm.edges),'short':sum((e.verts[0].co-e.verts[1].co).length<1e-6 for e in bm.edges)}
    print('TAZEEM-TOPOLOGY',name,edges,flush=True)
    if edges['wire'] or edges['overfull'] or edges['flipped'] or edges['short']:raise RuntimeError(f'{filename}: UV seam repair left invalid edges: {edges}')
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    obj.data.transform(Matrix.Scale(100,4))
    bpy.ops.object.quadriflow_remesh(mode='FACES',target_faces=budget,use_preserve_boundary=True,use_preserve_sharp=True,seed=0)
    if len(obj.data.polygons)>budget*3 or sum(len(p.vertices)==4 for p in obj.data.polygons)<len(obj.data.polygons)*.95:
        raise RuntimeError(f'{filename}: QuadriFlow did not produce a stable quad mesh')
    quad_faces=len(obj.data.polygons)
    obj.data.transform(Matrix.Scale(.01,4))
    obj.data.uv_layers.new(name='UVMap')
    transfer=obj.modifiers.new('Reproject original UV','DATA_TRANSFER')
    transfer.object=original
    transfer.use_loop_data=True
    transfer.data_types_loops={'UV'}
    transfer.loop_mapping='POLYINTERP_NEAREST'
    transfer.layers_uv_select_src=original.data.uv_layers.active.name
    transfer.layers_uv_select_dst='NAME'
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    mesh=obj.data
    mesh.calc_loop_triangles()
    mesh.calc_normals_split()
    uv=mesh.uv_layers.active
    if not uv:raise RuntimeError(f'{filename}: no reprojected UV map')
    normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
    # Blender XYZ(Z up) -> engine XYZ(Y up), proper rotation, front +X -> -Z.
    def orient(v):return Vector((-v.y,v.z,-v.x))
    positions=[orient(obj.matrix_world @ v.co)*scale for v in mesh.vertices]
    low=min(v.y for v in positions)
    positions=[Vector((v.x,v.y-low,v.z)) for v in positions]
    vertices=bytearray();indices=[];lookup={}
    for triangle in mesh.loop_triangles:
        for loop_id in triangle.loops:
            loop=mesh.loops[loop_id]
            tex=uv.data[loop_id].uv
            n=orient(normal_matrix@loop.normal).normalized()
            p=positions[loop.vertex_index]
            record=struct.pack('<9f',p.x,p.y,p.z,n.x,n.y,n.z,tex.x,1-tex.y,0.0)
            index=lookup.get(record)
            if index is None:
                index=len(lookup)
                lookup[record]=index
                vertices.extend(record)
            indices.append(index)
    flags=1 # Tripo's original material is double-sided; retain that face contract.
    data=struct.pack('<4sIII',b'ZKMD',len(lookup),len(indices),flags)+vertices+struct.pack('<%dI'%len(indices),*indices)
    path=os.path.join(target,name+'.zkmodel')
    with open(path+'.tmp','wb') as stream:stream.write(data)
    os.replace(path+'.tmp',path)
    x=[p.x for p in positions];y=[p.y for p in positions];z=[p.z for p in positions]
    result={'name':name,'source':filename,'source_sha256':inputs[filename]['sha256'],'scale':scale,'method':'QuadriFlow after coincident-position UV seam repair and temporary 100x unit normalization, then original atlas UV reprojection','source_triangles':original_polygons,'quad_faces':quad_faces,'triangles':len(indices)//3,'vertices':len(lookup),'bounds':{'min':[min(x),min(y),min(z)],'max':[max(x),max(y),max(z)]},'sha256':hashlib.sha256(data).hexdigest()}
    results.append(result)
    print('TAZEEM-MODEL',json.dumps(result),flush=True)
    bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.objects.remove(original,do_unlink=True)
    if mesh.users==0:bpy.data.meshes.remove(mesh)
    for image in list(bpy.data.images):
        if image.users==0:bpy.data.images.remove(image)
with open(os.path.join(target,'models.json'),'w') as out:json.dump({'act':1,'models':results,'source_manifest_sha256':hashlib.sha256(open(os.path.join(source,'manifest.json'),'rb').read()).hexdigest()},out,indent=2)
