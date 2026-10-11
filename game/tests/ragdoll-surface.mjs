// Full exported skin against public sim_probe palette events, not WASM memory.
// node game/tests/ragdoll-surface.mjs case0.log case1.log case2.log --out report.json
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const args=process.argv.slice(2),outAt=args.indexOf('--out'),out=outAt<0?null:args[outAt+1]
const paths=outAt<0?args:args.slice(0,outAt)
assert.equal(paths.length,3,'three real public kill yaw/impulse traces are required')
const root=new URL('../gameplay/content/creatures/high-detail/',import.meta.url)
const bind=readFileSync(new URL('boss_bind.zkmodel',root)),skin=readFileSync(new URL('boss.skin',root)),rig=readFileSync(new URL('boss.rig',root))
const hash=data=>createHash('sha256').update(data).digest('hex')
const metadata=JSON.parse(readFileSync(new URL('boss-rig.json',root),'utf8'))
const hashes={bindSha256:hash(bind),skinSha256:hash(skin),rigSha256:hash(rig),contactSha256:metadata.contacts_sha256}
const nv=bind.readUInt32LE(4),nb=skin.readUInt32LE(12)
assert.equal(bind.toString('ascii',0,4),'ZKMD');assert.equal(skin.toString('ascii',0,4),'ZKSK')
assert.equal(skin.readUInt32LE(8),nv);assert.equal(nb,20)
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const mul=(a,b)=>{const c=cross(a,b);return [0,1,2].map(i=>a[3]*b[i]+b[3]*a[i]+c[i]).concat(a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3)))}
function dualQuaternion(m){
 const r00=m[0],r11=m[5],r22=m[10],trace=r00+r11+r22
 let q
 if(trace>0){const s=Math.sqrt(trace+1)*2;q=[(m[6]-m[9])/s,(m[8]-m[2])/s,(m[1]-m[4])/s,.25*s]}
 else if(r00>r11&&r00>r22){const s=Math.sqrt(1+r00-r11-r22)*2;q=[.25*s,(m[4]+m[1])/s,(m[8]+m[2])/s,(m[6]-m[9])/s]}
 else if(r11>r22){const s=Math.sqrt(1+r11-r00-r22)*2;q=[(m[4]+m[1])/s,.25*s,(m[9]+m[6])/s,(m[8]-m[2])/s]}
 else {const s=Math.sqrt(1+r22-r00-r11)*2;q=[(m[8]+m[2])/s,(m[9]+m[6])/s,.25*s,(m[1]-m[4])/s]}
 const norm=Math.hypot(...q);q=q.map(v=>v/norm)
 return [q,mul([m[12],m[13],m[14],0],q).map(v=>v*.5)]
}
function position(slot,palette){
 const offset=16+slot*64,reference=palette[skin.readUInt32LE(offset)][0],real=[0,0,0,0],dual=[0,0,0,0]
 for(let i=0;i<8;i++){
  const [q,d]=palette[skin.readUInt32LE(offset+i*4)],weight=skin.readFloatLE(offset+32+i*4)*(dot(reference,q)<0?-1:1)
  for(let k=0;k<4;k++){real[k]+=q[k]*weight;dual[k]+=d[k]*weight}
 }
 const norm=Math.hypot(...real);assert.ok(norm>1e-6)
 for(let k=0;k<4;k++){real[k]/=norm;dual[k]/=norm}
 const projection=dot(real,dual);for(let k=0;k<4;k++)dual[k]-=real[k]*projection
 const p=[0,1,2].map(k=>bind.readFloatLE(16+slot*36+k*4)),inner=cross(real,p).map((v,i)=>v+real[3]*p[i]),rotation=cross(real,inner)
 const t=mul(dual,[-real[0],-real[1],-real[2],real[3]])
 return p.map((v,i)=>v+2*rotation[i]+2*t[i])
}
const report={hashes,vertices:nv,cases:[]},failures=[]
for(const path of paths){
 const raw=readFileSync(path,'utf8'),snapshots=raw.split(/\r?\n/).filter(line=>line.includes('[RAGDOLL-POSE]')).map(line=>JSON.parse(line.split('[RAGDOLL-POSE]')[1].trim()))
 assert.ok(snapshots.length>=4,`${path}: actual kill/60/300/settled events required`)
 const id=snapshots[0].case;assert.ok([0,1,2].includes(id));assert.ok(!report.cases.some(item=>item.case===id))
 const results=[]
 for(const snapshot of snapshots){
  for(const [key,value]of Object.entries(hashes))assert.equal(snapshot[key],value,`${path}: ${key} must match the actual exported mesh/skin/rig`)
  assert.equal(snapshot.matrices.length,nb)
  const palette=snapshot.matrices.map(dualQuaternion),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity]
  let belowFloor=0,insideWall=0,maxWallDepth=0
  for(let slot=0;slot<nv;slot++){
   const [x,y,z]=position(slot,palette);assert.ok([x,y,z].every(Number.isFinite))
   for(const [axis,value]of[x,y,z].entries()){lo[axis]=Math.min(lo[axis],value);hi[axis]=Math.max(hi[axis],value)}
   if(y<-.01)belowFloor++
   // Independent literal geometry of sim_probe FLAT: 48m room, walls inner
   // 23.7/outer24.7, 4m high, central4m doorway gap. No inferred fake floor.
   if(y>=0&&y<=4){
    if(Math.abs(z)>23.7&&Math.abs(z)<24.7&&Math.abs(x)>2&&Math.abs(x)<24.7){insideWall++;maxWallDepth=Math.max(maxWallDepth,Math.abs(z)-23.7)}
    if(Math.abs(x)>23.7&&Math.abs(x)<24.7&&Math.abs(z)>2&&Math.abs(z)<24.7){insideWall++;maxWallDepth=Math.max(maxWallDepth,Math.abs(x)-23.7)}
   }
  }
  results.push({phase:snapshot.phase,tick:snapshot.tick,settled:snapshot.settled,lo,hi,belowFloor,insideWall,maxWallDepth})
  if(belowFloor||insideWall||hi[1]>9.01)failures.push(`case${id}/${snapshot.phase}: floor=${belowFloor},wall=${insideWall},ceiling=${hi[1]}`)
 }
 for(const phase of['kill','falling-60','falling-300','settled'])if(!results.some(result=>result.phase===phase))failures.push(`case${id}: missing actual ${phase} event`)
 if(!raw.split(/\r?\n/).some(line=>['sim_probe: ok','sim_probe:ok','ragdoll_world_probe: ok'].includes(line.trim())))
  failures.push(`case${id}: public World probe did not complete successfully`)
 report.cases.push({case:id,path,traceSha256:hash(Buffer.from(raw)),snapshots:results})
}
report.status=failures.length?'FAIL':'PASS';report.failures=failures
if(out)writeFileSync(out,JSON.stringify(report,null,2))
assert.deepEqual(failures,[],failures.join('\n'))
console.log(`PASS three actual public ragdoll cases; ${nv} vertices per snapshot; no floor/wall/ceiling penetration`)
