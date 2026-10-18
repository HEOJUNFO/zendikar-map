"""Check actual runtime ZKMD/ZKSK/ZKAN skin/ground contact at 240Hz.
This reads shipped binary palettes, including their fractional interpolation;
it does not assume that passing DCC keyframes proves runtime contact.
"""
import os,json,struct,hashlib,sys,numpy as np
repo=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'));folder=repo+'/game/gameplay/content/creatures/act1/runtime';report=repo+'/build/act1-polish';os.makedirs(report,exist_ok=True)
manifest=json.load(open(folder+'/models.json'));records=[]
selected=sys.argv[sys.argv.index('--model')+1] if '--model' in sys.argv else None
if selected is not None and selected not in [m['name'] for m in manifest['models']]:raise ValueError('unknown act1 creature: '+selected)
def read(name,ext):return open(folder+'/'+name+'.'+ext,'rb').read()
def sha(data):return hashlib.sha256(data).hexdigest()
def deform(palette,points,joints,weights):
 rq=palette[joints,:4];dq=palette[joints,4:];anchor=rq[:,0,:];signed=weights*np.where(np.sum(rq*anchor[:,None,:],axis=2)<0,-1.,1.)
 r=np.sum(rq*signed[:,:,None],axis=1);d=np.sum(dq*signed[:,:,None],axis=1);length=np.linalg.norm(r,axis=1);r/=length[:,None];d/=length[:,None];d-=r*np.sum(r*d,axis=1)[:,None]
 return points+2*np.cross(r[:,:3],np.cross(r[:,:3],points)+r[:,3,None]*points)+2*(d[:,:3]*r[:,3,None]-r[:,:3]*d[:,3,None]+np.cross(r[:,:3],d[:,:3]))
for model in manifest['models']:
 if selected is not None and model['name']!=selected:continue
 name=model['name'];geometry=read(name,'zkmodel');skin=read(name,'skin');animation=read(name,'anim');count=struct.unpack_from('<I',geometry,4)[0];bones=struct.unpack_from('<I',skin,12)[0]
 points=np.frombuffer(geometry,dtype='<f4',count=count*9,offset=16).reshape(count,9)[:,:3]
 influence=np.frombuffer(skin,dtype=np.dtype([('joints','<u4',(8,)),('weights','<f4',(8,))]),count=count,offset=16)
 # UV corners with identical physical input are equivalent collision points.
 physical=np.zeros(count,dtype=np.dtype([('position','<f4',(3,)),('influence',influence.dtype)]));physical['position']=points;physical['influence']=influence;_,unique=np.unique(physical,return_index=True)
 points=points[unique].astype(float);joints=influence['joints'][unique];weights=influence['weights'][unique].astype(float);offset=16;clips=[]
 for c in range(struct.unpack_from('<I',animation,12)[0]):
  label,frames,loop,impact,stride,hz,recovery=struct.unpack_from('<32sIIIfII',animation,offset);label=label.split(b'\0')[0].decode();offset+=56
  if hz not in [60,240]:raise RuntimeError('unsupported runtime contact sample rate')
  palettes=np.frombuffer(animation,dtype='<f4',count=frames*bones*8,offset=offset).reshape(frames,bones,8).astype(float);offset+=frames*bones*32
  minimum=1e30;worst=0.;samples=0
  for frame in range(frames):
   for quarter in range(240//hz if frame<frames-1 else 1):
    fraction=quarter/(240//hz);first=palettes[frame];second=palettes[min(frame+1,frames-1)];sign=np.where(np.sum(first[:,:4]*second[:,:4],axis=1)<0,-1.,1.)
    palette=first*(1-fraction)+second*sign[:,None]*fraction;norm=np.linalg.norm(palette[:,:4],axis=1);palette/=norm[:,None];palette[:,4:]-=palette[:,:4]*np.sum(palette[:,:4]*palette[:,4:],axis=1)[:,None]
    height=float(deform(palette,points,joints,weights)[:,1].min());samples+=1
    if height<minimum:minimum=height;worst=(frame+fraction)*60/hz
  closure=float(np.max(np.linalg.norm(deform(palettes[0],points,joints,weights)-deform(palettes[-1],points,joints,weights),axis=1))) if loop else None
  if minimum<-.00005:raise RuntimeError(name+'/'+label+': fractional runtime skin crosses the floor at tick '+str(worst)+' by '+str(-minimum)+' metres')
  if loop and closure>.00005:raise RuntimeError(name+'/'+label+': physical loop seam '+str(closure)+' metres')
  clips.append({'clip':label,'samples':samples,'minimumYMetres':minimum,'worstTick':worst,'loopClosureMetres':closure});print('GROUND-CACHE',name,label,samples,minimum,closure,flush=True)
 records.append({'name':name,'runtimeVertices':count,'uniquePhysicalVertices':len(unique),'modelSha256':sha(geometry),'skinSha256':sha(skin),'animationSha256':sha(animation),'clips':clips})
report_name='ground-cache-'+sys.argv[sys.argv.index('--model')+1]+'.json' if '--model' in sys.argv else 'ground-cache.json'
json.dump({'ok':True,'samplingHz':240,'maximumAllowedPenetrationMetres':.00005,'models':records},open(report+'/'+report_name,'w'),indent=2)
