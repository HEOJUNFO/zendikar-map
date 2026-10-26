import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const dir=new URL('../gameplay/content/creatures/act1/runtime/',import.meta.url)
const manifest=JSON.parse(readFileSync(new URL('models.json',dir)))
for(const model of manifest.models)test(`actual act1 skin / hierarchy / clips: ${model.name}`,()=>{
 const read=ext=>readFileSync(new URL(`${model.name}.${ext}`,dir))
 const mesh=read('zkmodel'),skin=read('skin'),anim=read('anim'),rig=JSON.parse(read('rig'))
 for(const [bytes,key] of [[mesh,'sha256'],[skin,'skinSha256'],[anim,'animationSha256']])assert.equal(createHash('sha256').update(bytes).digest('hex'),model[key])
 // .rig 는 JSON 글이다 — 해시는 Windows 의 CRLF 로 적혔다. 줄바꿈만 다른 같은 글이면 같은 산출물이다 (tools/campaign.mjs 와 같은 규칙)
 const rigText=read('rig')
 assert.ok([rigText,Buffer.from(rigText.toString('latin1').replace(/\r?\n/g,'\r\n'),'latin1')].some(bytes=>createHash('sha256').update(bytes).digest('hex')===model.rigSha256),`${model.name}.rig hash`)
 const vertices=mesh.readUInt32LE(4),bones=skin.readUInt32LE(12)
 assert.equal(skin.subarray(0,4).toString(),'ZKSK');assert.equal(skin.readUInt32LE(8),vertices);assert.equal(skin.length,16+vertices*64)
 assert.equal(bones,rig.bones.length);assert.equal(bones,model.boneCount);assert.ok(bones>=12&&bones<=128)
 rig.bones.forEach((b,i)=>{assert.ok(b.parent<i&&b.parent>=-1);assert.equal(b.inverseBind.length,16);assert.ok(b.inverseBind.every(Number.isFinite))})
 for(let v=0;v<vertices;v++){let sum=0;for(let i=0;i<8;i++){assert.ok(skin.readUInt32LE(16+v*64+i*4)<bones);const w=skin.readFloatLE(48+v*64+i*4);assert.ok(Number.isFinite(w)&&w>=0&&w<=1);sum+=w}assert.ok(Math.abs(sum-1)<1e-5)}
 assert.equal(anim.subarray(0,4).toString(),'ZKAN');assert.ok([1,2].includes(anim.readUInt32LE(4)));assert.equal(anim.readUInt32LE(8),bones)
 const count=anim.readUInt32LE(12);assert.equal(count,model.name==='roil-elemental'?9:5);let offset=16
 const names=['idle','move','attack','hit','death','shockwave','charge','shard_rain','sweep']
 for(let c=0;c<count;c++){
  assert.equal(anim.subarray(offset,offset+32).toString().replace(/\0.*$/s,''),names[c]);const frames=anim.readUInt32LE(offset+32),impact=anim.readUInt32LE(offset+40),recovery=anim.readUInt32LE(offset+52)
  const hz=anim.readUInt32LE(offset+48);assert.ok([60,240].includes(hz));if(anim.readUInt32LE(4)===1)assert.equal(hz,60);assert.equal((frames-1)%(hz/60),0);const logicalFrames=(frames-1)/(hz/60)+1
  assert.ok(logicalFrames>=25&&logicalFrames<=361)
  if(c===2||c>=5)assert.ok(impact>0&&recovery>impact&&recovery<logicalFrames)
  offset+=56;let changed=0
  for(let frame=0;frame<frames;frame++)for(let bone=0;bone<bones;bone++){
   const at=offset+(frame*bones+bone)*32;const q=Array.from({length:8},(_,i)=>anim.readFloatLE(at+i*4));assert.ok(q.every(Number.isFinite));assert.ok(Math.abs(q.slice(0,4).reduce((s,x)=>s+x*x,0)-1)<1e-4)
   if(frame>0&&q.some((v,i)=>Math.abs(v-anim.readFloatLE(offset+bone*32+i*4))>1e-3))changed++
  }
  assert.ok(changed>0,`${names[c]} cannot be static`);offset+=frames*bones*32
 }
 assert.equal(offset,anim.length)
})
