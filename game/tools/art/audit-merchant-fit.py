"""Actual exported triangle fit, all four authored sitting poses; no proxy shortcut."""
import hashlib, json, struct, sys
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import intersect_ray_tri
base=Path('game/gameplay/content'); layout=json.loads((base/'merchant-props/layout.json').read_text())
output=Path(sys.argv[sys.argv.index('--')+1])

def read(path, matrix=None):
    data=path.read_bytes(); _,nv,ni,_=struct.unpack_from('<4sIII',data)
    vertices=[Vector(struct.unpack_from('<3f',data,16+36*i)) for i in range(nv)]
    if matrix is not None: vertices=[matrix@v for v in vertices]
    indices=struct.unpack_from('<%dI'%ni,data,16+36*nv)
    faces=[indices[i:i+3] for i in range(0,ni,3)]
    return vertices,faces,BVHTree.FromPolygons(vertices,faces,all_triangles=True,epsilon=0)

def transverse(a,b):
    for triangle,edge in [(a,b),(b,a)]:
        for i in range(3):
            start=edge[i]; delta=edge[(i+1)%3]-start
            if delta.length_squared<1e-12: continue
            hit=intersect_ray_tri(*triangle,delta,start,True)
            if hit is not None and 1e-5<(hit-start).dot(delta)/delta.length_squared<1-1e-5:return True
    return False

furniture=[]; paths=[base/'merchant-props/layout.json']
for placement in layout['placements']:
    if placement['model'] not in [0,1,5]:continue
    name=layout['models'][placement['model']]['name'];path=base/'merchant-props'/(name+'.zkmodel');paths.append(path)
    m=placement['matrix'];matrix=Matrix(tuple(tuple(m[c*4+r]for c in range(4))for r in range(4)))
    furniture.append((name,read(path,matrix)))
rows=[]
for frame in range(4):
    path=base/'creatures/old-lady'/('sit-%02d.zkmodel'%frame);paths.append(path)
    vertices,faces,tree=read(path);row={'frame':frame,'transverseIntersections':{}}
    for name,(other_vertices,other_faces,other_tree) in furniture:
        count=0
        for a,b in tree.overlap(other_tree):
            if transverse([vertices[i]for i in faces[a]],[other_vertices[i]for i in other_faces[b]]):count+=1
        row['transverseIntersections'][name]=count
        if name=='chair':
            distances=[other_tree.find_nearest(v)[3]for v in vertices if .60<v.y<.80 and v.z>.25]
            row['seatGarmentGapMeters']=min(distances)
    rows.append(row)
result={'method':'Actual exported triangles; BVH candidates confirmed by segment/triangle intersection. Tangential support contact is allowed.',
        'inputs':[{'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}for path in dict.fromkeys(paths)],'frames':rows}
output.write_text(json.dumps(result,indent=2)+'\n')
print('MERCHANT-FIT',json.dumps(rows))
assert all(all(value==0 for value in row['transverseIntersections'].values()) for row in rows),'body/furniture surface penetration'
assert all(row['seatGarmentGapMeters']<.025 for row in rows),'elder floats above the actual chair'
