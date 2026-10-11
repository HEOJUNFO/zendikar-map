"""Render a public World ragdoll palette trace using the exported DQS skin.

Blender --background --factory-startup --disable-autoexec --python-exit-code 1
--python game/tools/art/preview-boss-ragdoll.py -- trace.json output-directory
Trace: {snapshots:[{tick, matrices:[[16 column-major floats], ...20]}]}.
No simulation, source rig pose, gameplay memory or production output is changed.
"""
import bpy,os,sys,json,struct,math,hashlib
import numpy as np
from mathutils import Matrix
arguments=sys.argv[sys.argv.index('--')+1:]
trace=json.load(open(arguments[0],encoding='utf8'))
out=os.path.abspath(arguments[1]);os.makedirs(out,exist_ok=True)
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../gameplay/content/creatures/high-detail'))
raw=open(os.path.join(root,'boss_bind.zkmodel'),'rb').read();nv,ni=struct.unpack_from('<II',raw,4)
bind=np.frombuffer(raw,dtype='<f4',count=nv*9,offset=16).reshape((nv,9)).copy()
skin=open(os.path.join(root,'boss.skin'),'rb').read();ids=[];weights=[]
for i in range(nv):
 values=struct.unpack_from('<8I8f',skin,16+i*64);ids.append(values[:8]);weights.append(values[8:])
ids=np.array(ids);weights=np.array(weights)
def multiply(a,b):
 av,bv=a[:,:3],b[:,:3]
 return np.column_stack((a[:,3,None]*bv+b[:,3,None]*av+np.cross(av,bv),a[:,3]*b[:,3]-np.einsum('ni,ni->n',av,bv)))
report=[]
for index,snapshot in enumerate(trace['snapshots']):
 palette=np.array(snapshot['matrices'],dtype=np.float64)
 assert palette.shape==(20,16) and np.isfinite(palette).all()
 palette=palette.reshape((20,4,4)).transpose(0,2,1)
 quaternions=[];duals=[]
 for matrix in palette:
  assert np.max(np.abs(matrix[3]-[0,0,0,1]))<1e-5
  q=Matrix(matrix.tolist()).to_quaternion();real=np.array([q.x,q.y,q.z,q.w]);real/=np.linalg.norm(real)
  translation=np.array([*matrix[:3,3],0.0]);dual=multiply(translation[None,:],real[None,:])[0]*.5
  quaternions.append(real);duals.append(dual)
 quaternions=np.array(quaternions);duals=np.array(duals)
 real=np.zeros((nv,4));dual=np.zeros((nv,4));reference=quaternions[ids[:,0]]
 for i in range(8):
  q=quaternions[ids[:,i]];d=duals[ids[:,i]]
  sign=np.where(np.einsum('ni,ni->n',q,reference)<0,-1,1)
  real+=q*(weights[:,i]*sign)[:,None];dual+=d*(weights[:,i]*sign)[:,None]
 length=np.linalg.norm(real,axis=1);assert np.min(length)>1e-6
 real/=length[:,None];dual/=length[:,None];dual-=real*np.einsum('ni,ni->n',real,dual)[:,None]
 conjugate=real.copy();conjugate[:,:3]*=-1
 translation=2*multiply(dual,conjugate)[:,:3]
 def rotate(v):return v+2*np.cross(real[:,:3],np.cross(real[:,:3],v)+real[:,3,None]*v)
 posed=bind.copy();posed[:,:3]=rotate(bind[:,:3])+translation;posed[:,3:6]=rotate(bind[:,3:6])
 assert np.isfinite(posed).all()
 name='trace-%02d-tick-%s'%(index,snapshot['tick'])
 with open(os.path.join(out,'boss_'+name+'.zkmodel'),'wb') as stream:stream.write(raw[:16]+posed.astype('<f4').tobytes()+raw[16+nv*36:])
 report.append({'name':name,'phase':snapshot.get('phase'),'tick':snapshot['tick'],'bounds':{'lo':posed[:,:3].min(axis=0).tolist(),'hi':posed[:,:3].max(axis=0).tolist()},
                'below_floor_vertices':int(np.sum(posed[:,1]<-.01)),'below_floor_depth':float(max(0,-posed[:,1].min()))})
 review=open(os.path.join(root,'preview.py')).read()
 review=review.replace("root=os.path.dirname(os.path.abspath(__file__))",'root='+repr(root))
 review=review.replace("for clip in ['walk_00','attack_03','death']:",'for clip in ['+repr(name)+']:')
 review=review.replace("with open(os.path.join(root,kind+'_'+clip+'.zkmodel'),'rb')", "with open(os.path.join("+repr(out)+",kind+'_'+clip+'.zkmodel'),'rb')")
 review=review.replace("os.path.join(root,'review-'+kind+'-'+clip+'.png')","os.path.join("+repr(out)+",'review-'+kind+'-'+clip+'.png')")
 # The physical floor stays at world height zero. We do not lift the mesh to
 # conceal penetration or replace the actual physics palette with a pose.
 review=review.replace('size=size*2.2,location=(0,0,-.01)','size=size*3,location=(center.x,center.y,-.01)')
 sys.argv=['preview.py','--','boss']
 exec(compile(review,'actual-ragdoll-PBR-review','exec'),{'__file__':os.path.join(root,'preview.py')})
sha=lambda data:hashlib.sha256(data).hexdigest()
with open(os.path.join(out,'surface-contact.json'),'w') as stream:json.dump({'trace':os.path.abspath(arguments[0]),
 'trace_sha256':sha(open(arguments[0],'rb').read()),'bind_sha256':sha(raw),'skin_sha256':sha(skin),
 'textures_sha256':{name:sha(open(os.path.join(root,name),'rb').read()) for name in ['boss.jpg','boss.nar.jpg','boss.metal.jpg']},
 'snapshots':report},stream,indent=2)
print('ACTUAL-RAGDOLL-SURFACE',json.dumps(report),flush=True)
