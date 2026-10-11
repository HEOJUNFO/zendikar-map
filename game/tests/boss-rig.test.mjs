import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import test from 'node:test'

const root=new URL('../gameplay/content/creatures/high-detail/',import.meta.url)
const read=name=>readFileSync(new URL(name,root))
const hash=data=>createHash('sha256').update(data).digest('hex')

test('boss rest mesh and eight-influence skin share the actual living vertex slots',()=>{
 const bind=read('boss_bind.zkmodel'),walk=read('boss_walk_00.zkmodel'),skin=read('boss.skin'),rig=JSON.parse(read('boss-rig.json'))
 const nv=bind.readUInt32LE(4),ni=bind.readUInt32LE(8)
 assert.equal(bind.toString('ascii',0,4),'ZKMD')
 assert.equal(bind.length,16+nv*36+ni*4)
 assert.equal(nv,walk.readUInt32LE(4));assert.equal(ni,walk.readUInt32LE(8))
 assert.deepEqual(bind.subarray(16+nv*36),walk.subarray(16+nv*36),'frozen actual triangle slots')
 assert.equal(skin.toString('ascii',0,4),'ZKSK');assert.equal(skin.readUInt32LE(4),1)
 assert.equal(skin.readUInt32LE(8),nv);assert.equal(skin.readUInt32LE(12),20);assert.equal(skin.length,16+nv*64)
 const seams=new Map()
 for(let v=0;v<nv;v++){
  const at=16+v*36,offset=16+v*64
  assert.deepEqual(bind.subarray(at+24,at+36),walk.subarray(at+24,at+36),'author atlas and layer unchanged')
  const point=Array.from({length:3},(_,axis)=>bind.readFloatLE(at+axis*4))
  const normal=Array.from({length:3},(_,axis)=>bind.readFloatLE(at+12+axis*4))
  assert.ok(point.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-4)
  let sum=0;const unique=new Set()
  for(let k=0;k<8;k++){
   const bone=skin.readUInt32LE(offset+k*4),weight=skin.readFloatLE(offset+32+k*4)
   assert.ok(bone<20);assert.ok(Number.isFinite(weight)&&weight>=0&&weight<=1)
   assert.ok(!unique.has(bone));unique.add(bone);sum+=weight
  }
  assert.ok(Math.abs(sum-1)<1e-6,'normalized whole-skin weight')
  const key=point.join(','),weights=skin.subarray(offset,offset+64)
  if(seams.has(key))assert.deepEqual(weights,seams.get(key),'split UV/normal seams receive identical continuous skin')
  else seams.set(key,weights)
 }
 assert.equal(hash(bind),rig.bind_sha256);assert.equal(hash(skin),rig.skin_sha256)
 assert.ok(rig.discarded_weight['8'].maximum<.04,'eight influences retain at least96% of every continuous envelope')
 assert.ok(rig.discarded_weight['4'].maximum>.2,'four influences would discard a material share of the connected bone-heat skin')
 assert.ok(rig.contact_count>0&&rig.contact_count<=1024)
 assert.equal(rig.contact_radii.length,rig.contact_count)
 assert.ok(rig.contact_radii.every(radius=>Number.isFinite(radius)&&radius>=.01&&radius<=.33),'deformed local convex support shells stay bounded')
 assert.ok(rig.contact_coverage.regions>100,'mixed joint-weight regions retain independent surface support')
 const contactBytes=Buffer.alloc(rig.contact_count*80)
 const contacts=new Set(rig.contact_vertex_slots)
 assert.equal(contacts.size,rig.contact_count)
 for(const [contact,slot]of rig.contact_vertex_slots.entries()){
  assert.ok(Number.isInteger(slot)&&slot>=0&&slot<nv)
  bind.copy(contactBytes,contact*80,16+slot*36,16+slot*36+12)
  skin.copy(contactBytes,contact*80+12,16+slot*64,16+slot*64+64)
  contactBytes.writeFloatLE(rig.contact_radii[contact],contact*80+76)
 }
 assert.equal(hash(contactBytes),rig.contacts_sha256,'physical source configuration includes measured radii')
 for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){
  let best=0
  for(let i=1;i<nv;i++)if(sign*bind.readFloatLE(16+i*36+axis*4)>sign*bind.readFloatLE(16+best*36+axis*4))best=i
  assert.ok(contacts.has(best),'physical contact samples retain actual whole-mesh extremal supports')
 }
 assert.deepEqual(readdirSync(root).filter(name=>name.startsWith('boss')&&name.endsWith('.tmp')),[])
})

test('actual drake bind triangles form one welded anatomical surface',()=>{
 const bind=read('boss_bind.zkmodel'),nv=bind.readUInt32LE(4),ni=bind.readUInt32LE(8)
 const parent=Int32Array.from({length:nv},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
 const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[a]=b}
 const tolerance=1e-5,grid=new Map()
 for(let i=0;i<nv;i++){
  const p=[0,1,2].map(axis=>bind.readFloatLE(16+i*36+axis*4)),cell=p.map(value=>Math.floor(value/tolerance))
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
   const bucket=grid.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','))??[]
   for(const other of bucket){const q=[0,1,2].map(axis=>bind.readFloatLE(16+other*36+axis*4));if(Math.hypot(...p.map((v,axis)=>v-q[axis]))<=tolerance)union(i,other)}
  }
  const key=cell.join(',');if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i)
 }
 const start=16+nv*36
 for(let i=0;i<ni;i+=3){const a=bind.readUInt32LE(start+i*4),b=bind.readUInt32LE(start+(i+1)*4),c=bind.readUInt32LE(start+(i+2)*4);union(a,b);union(a,c)}
 assert.equal(new Set(Array.from({length:nv},(_,i)=>find(i))).size,1,'weld-before-decimation preserves the complete anatomical triangle graph')
})

test('physical drake chains have orthonormal game-space inverse binds and nonzero anatomy',()=>{
 const bytes=read('boss.rig'),rig=JSON.parse(read('boss-rig.json'))
 assert.equal(bytes.toString('ascii',0,4),'ZKRG');assert.equal(bytes.readUInt32LE(4),1)
 assert.equal(bytes.readUInt32LE(8),20);assert.equal(bytes.readUInt32LE(12),112);assert.equal(bytes.length,16+20*112)
 assert.equal(hash(bytes),rig.rig_sha256)
 assert.deepEqual(rig.bones.map(bone=>bone.name),['Body','Neck','Head','Tail1','Tail2','Tail3','Tail4','Tail5',
  'FrontLeg.L','FrontFoot.L','BackLeg.L','BackFoot.L','Wing.L','WingTip.L','FrontLeg.R','FrontFoot.R','BackLeg.R','BackFoot.R','Wing.R','WingTip.R'])
 const transform=(m,p,w)=>[0,1,2].map(row=>m[row]*p[0]+m[row+4]*p[1]+m[row+8]*p[2]+m[row+12]*w)
 for(const [i,bone]of rig.bones.entries()){
  assert.ok(bone.parent>=-1&&bone.parent<i,'parent precedes child; only root is free')
  assert.equal(bytes.readInt32LE(16+i*112),bone.parent)
  assert.ok(bone.mass>0&&bone.radius>0&&bone.swing_limit>0&&bone.twist_min<bone.twist_max)
  const length=Math.hypot(...bone.head.map((a,k)=>bone.tail[k]-a));assert.ok(length>.1)
  const origin=transform(bone.inverse_bind,bone.head,1),tip=transform(bone.inverse_bind,bone.tail,1)
  assert.ok(Math.hypot(...origin)<1e-5,'bind origin is the anatomical head')
  assert.ok(Math.abs(tip[0])<1e-5&&Math.abs(tip[2])<1e-5&&Math.abs(tip[1]-length)<1e-5,'bone local +Y follows the actual head-to-tail chain')
  const axes=[0,1,2].map(axis=>transform(bone.inverse_bind,[axis===0?1:0,axis===1?1:0,axis===2?1:0],0))
  for(const axis of axes)assert.ok(Math.abs(Math.hypot(...axis)-1)<1e-5)
  for(const [a,b]of[[0,1],[1,2],[2,0]])assert.ok(Math.abs(axes[a].reduce((s,v,k)=>s+v*axes[b][k],0))<1e-5)
 }
})
