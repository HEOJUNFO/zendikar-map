"""Deterministic skin-space surface patches; no runtime/trace inputs."""
import itertools
import numpy as np
import bmesh
from mathutils import Vector,geometry
from mathutils import Matrix,Quaternion

def deformations(positions,indices,weights,bones,seed=734981):
    rest=[Matrix(np.array(b['inverse_bind']).reshape(4,4).T.tolist()).inverted() for b in bones]
    inverse=[matrix.inverted() for matrix in rest]
    parent=[b['parent'] for b in bones]
    def multiply(a,b):
        return np.column_stack((a[:,3,None]*b[:,:3]+b[:,3,None]*a[:,:3]+np.cross(a[:,:3],b[:,:3]),a[:,3]*b[:,3]-np.sum(a[:,:3]*b[:,:3],axis=1)))
    states=[positions.copy()]
    rng=np.random.default_rng(seed)
    for state in range(18):
        frames=[];real=[];dual=[]
        for i,bone in enumerate(bones):
            local=rest[i] if parent[i]<0 else inverse[parent[i]]@rest[i]
            if parent[i]>=0:
                if state<6:
                    axis=Vector((1,0,0) if state//2==0 else (0,0,1) if state//2==1 else (1,0,1)).normalized()
                    angle=bone['swing_limit']*(.75 if (i+state)%2 else -.75)
                else:
                    axis=Vector((float(rng.uniform(-1,1)),0,float(rng.uniform(-1,1)))).normalized()
                    angle=float(rng.uniform(-1,1))*bone['swing_limit']*.9
                swing=Quaternion(axis,angle).to_matrix().to_4x4()
                twist=Quaternion(Vector((0,1,0)),float(rng.uniform(bone['twist_min'],bone['twist_max']))*.75).to_matrix().to_4x4()
                local=local@swing@twist
            frame=local if parent[i]<0 else frames[parent[i]]@local;frames.append(frame)
            matrix=frame@inverse[i];q=matrix.to_quaternion();q.normalize();r=np.array((q.x,q.y,q.z,q.w))
            real.append(r);dual.append(multiply(np.array([(*matrix.translation,0)]),r[None,:])[0]*.5)
        real=np.array(real);dual=np.array(dual);r=np.zeros((len(positions),4));d=r.copy();reference=real[indices[:,0]]
        for k in range(8):
            q=real[indices[:,k]];sign=np.where(np.sum(reference*q,axis=1)<0,-1,1);amount=weights[:,k]*sign
            r+=q*amount[:,None];d+=dual[indices[:,k]]*amount[:,None]
        norm=np.linalg.norm(r,axis=1);r/=norm[:,None];d/=norm[:,None];d-=r*np.sum(r*d,axis=1)[:,None]
        conjugate=r.copy();conjugate[:,:3]*=-1
        translation=2*multiply(d,conjugate)[:,:3]
        states.append(positions+2*np.cross(r[:,:3],np.cross(r[:,:3],positions)+r[:,3,None]*positions)+translation)
    return np.array(states)

def convex_support_deficit(positions,supports):
    points=[Vector(point) for point in supports];bm=bmesh.new();triangles=[];planes=[]
    for point in points:bm.verts.new(point)
    if len(points)>=4:
        bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
        bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.normal_update()
        triangles=[tuple(v.co.copy() for v in face.verts) for face in bm.faces if face.calc_area()>1e-12]
        planes=[(face.verts[0].co.copy(),face.normal.copy()) for face in bm.faces if face.calc_area()>1e-12]
    if not triangles and len(points)>=3:
        triangles=[triangle for triangle in itertools.combinations(points,3) if (triangle[1]-triangle[0]).cross(triangle[2]-triangle[0]).length_squared>1e-12]
    maximum=0.0
    for value in positions:
        point=Vector(value)
        if planes and all((point-origin).dot(normal)<=1e-7 for origin,normal in planes):distance=0.0
        elif triangles:distance=min((point-geometry.closest_point_on_tri(point,*triangle)).length for triangle in triangles)
        elif len(points)>1:
            distance=min((point-(a+(b-a)*max(0,min(1,(point-a).dot(b-a)/(b-a).length_squared)))).length
                         for a,b in itertools.combinations(points,2) if (b-a).length_squared>1e-12)
        else:distance=(point-points[0]).length
        maximum=max(maximum,distance)
    bm.free()
    return maximum

def contacts(positions,indices,weights,bones,limit=1024):
    # Keep different continuous joint blends distinct even where a folded
    # membrane lies beside a leg in the rest sculpt. UV seam duplicates have
    # identical geometry/weights and therefore map to the same source patch.
    groups={}
    for slot in range(len(positions)):
        key=(int(indices[slot,0]),int(indices[slot,1]) if weights[slot,1]>.02 else -1,
             int(weights[slot,0]*4),int(weights[slot,1]*4))
        groups.setdefault(key,[]).append(slot)
    directions=np.array([d for d in itertools.product((-1,0,1),repeat=3) if any(d)])
    candidates=set();mandatory=set()
    for members in groups.values():
        members=np.array(members)
        candidates.update(members[np.argmax(positions[members]@directions.T,axis=0)].tolist())
        # Every weight region gets a representative before filling its hull.
        center=np.mean(positions[members],axis=0)
        mandatory.add(int(members[np.argmin(np.sum((positions[members]-center)**2,axis=1))]))
    mandatory.update(np.argmax(positions@directions.T,axis=0).tolist())
    assert len(mandatory)<=limit
    support_directions=directions.astype(float)
    support_directions/=np.linalg.norm(support_directions,axis=1)[:,None]
    states=deformations(positions,indices,weights,bones)
    # Fill the largest missing directional support in ANY weight region first.
    # A small region does not lose its tips merely because a larger wing has
    # more vertices. This allocates the fixed budget by actual support error.
    selected=set(mandatory);regions=[]
    for members in groups.values():
        region=np.array(members);dots=states[:,region]@support_directions.T
        extreme=region[np.argmax(dots,axis=1)];target=np.max(dots,axis=1)
        current=np.max(states[:,sorted(selected.intersection(members))]@support_directions.T,axis=1)
        regions.append([region,extreme,target,current])
    while len(selected)<limit:
        best_region=max(range(len(regions)),key=lambda i:float(np.max(regions[i][2]-regions[i][3])))
        region,extreme,target,current=regions[best_region]
        state,direction=np.unravel_index(np.argmax(target-current),target.shape);slot=int(extreme[state,direction])
        if slot in selected:break
        selected.add(slot);regions[best_region][3]=np.maximum(current,states[:,slot]@support_directions.T)
    selected=sorted(selected)
    # A sparse contact represents directional support of a skin region, not a
    # sphere enclosing its entire spatial extent. Measure omitted convex-hull
    # support in a dense, deterministic direction grid for each weight region.
    radii=np.full(len(selected),.01)
    selected_set=set(selected);patch_index={slot:i for i,slot in enumerate(selected)}
    for members in groups.values():
        region=np.array(members);supports=np.array(sorted(selected_set.intersection(members)))
        assert len(supports)>0
        # Directed Hausdorff distance to the selected convex hull bounds omitted
        # support in EVERY direction. A finite direction grid alone misses
        # grazing orientations, even when all sampled directions are clear.
        shell=.01+max(convex_support_deficit(state[region],state[supports]) for state in states)
        for slot in supports:radii[patch_index[int(slot)]]=max(radii[patch_index[int(slot)]],shell)
    radii=radii.tolist()
    return selected,radii,{'regions':len(groups),'region_extrema':len(candidates),'maximum_patch_radius':max(radii),
                           'median_patch_radius':float(np.median(radii)),
                           'stress_configurations':len(states),'weight_bins':4,
                           'radius_bound':'maximum deformed regional convex support deficit over deterministic rig-limit DQS stresses + 0.01m skin',
                           'selection':'largest omitted joint-region DQS support across source rig-limit configurations'}
