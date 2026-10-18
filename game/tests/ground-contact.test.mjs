import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const folder=new URL('../gameplay/content/creatures/act1/runtime/',import.meta.url)
const cache=new Map()
function model(name){
 if(cache.has(name))return cache.get(name)
 const read=ext=>readFileSync(new URL(`${name}.${ext}`,folder))
 const geometry=read('zkmodel'),skin=read('skin'),bytes=read('anim'),bones=skin.readUInt32LE(12),tracks=new Map();let offset=16
 for(let i=0;i<bytes.readUInt32LE(12);i++){
  const name=bytes.subarray(offset,offset+32).toString().replace(/\0.*$/s,''),samples=bytes.readUInt32LE(offset+32),rate=bytes.readUInt32LE(offset+48)/60,frames=(samples-1)/rate+1;offset+=56;tracks.set(name,{offset,frames,samples,rate});offset+=samples*bones*32
 }
 const result={geometry,skin,bytes,bones,tracks};cache.set(name,result);return result
}
function skinHeightStatistics(data,clip,tick){
 const {geometry,skin,bytes,bones,tracks}=data,track=tracks.get(clip),scaled=tick*track.rate,frame=Math.floor(scaled),fraction=scaled-frame,palette=[]
 assert.ok(track&&frame>=0&&frame<track.samples)
 for(let b=0;b<bones;b++){
  const first=Array.from({length:8},(_,k)=>bytes.readFloatLE(track.offset+(frame*bones+b)*32+k*4)),second=Array.from({length:8},(_,k)=>bytes.readFloatLE(track.offset+((Math.min(frame+1,track.samples-1))*bones+b)*32+k*4))
  const sign=first.slice(0,4).reduce((s,q,k)=>s+q*second[k],0)<0?-1:1,q=first.map((v,k)=>v*(1-fraction)+second[k]*sign*fraction),norm=Math.hypot(...q.slice(0,4));for(let k=0;k<8;k++)q[k]/=norm
  const parallel=q.slice(0,4).reduce((s,v,k)=>s+v*q[k+4],0);for(let k=0;k<4;k++)q[k+4]-=q[k]*parallel;palette.push(q)
 }
 let minimum=Infinity,headSum=0,headCount=0
 for(let v=0;v<geometry.readUInt32LE(4);v++){
  const at=16+v*64,anchor=palette[skin.readUInt32LE(at)],r=[0,0,0,0],d=[0,0,0,0]
  for(let k=0;k<8;k++){
   const q=palette[skin.readUInt32LE(at+k*4)],w=skin.readFloatLE(at+32+k*4),sign=q.slice(0,4).reduce((s,x,j)=>s+x*anchor[j],0)<0?-1:1
   for(let j=0;j<4;j++){r[j]+=q[j]*w*sign;d[j]+=q[j+4]*w*sign}
  }
  const norm=Math.hypot(...r);for(let k=0;k<4;k++){r[k]/=norm;d[k]/=norm}
  const parallel=r.reduce((s,q,k)=>s+q*d[k],0);for(let k=0;k<4;k++)d[k]-=r[k]*parallel
  const x=geometry.readFloatLE(16+v*36),y=geometry.readFloatLE(20+v*36),z=geometry.readFloatLE(24+v*36)
  const innerX=r[1]*z-r[2]*y+r[3]*x,innerZ=r[0]*y-r[1]*x+r[3]*z
  const height=y+2*(r[2]*innerX-r[0]*innerZ)+2*(d[1]*r[3]-r[1]*d[3]+r[2]*d[0]-r[0]*d[2])
  minimum=Math.min(minimum,height)
  if(y>.75&&z<-.15){headSum+=height;headCount++}
 }
 return {minimum,headHeight:headCount?headSum/headCount:null,headCount}
}
// Independent regression fixtures: these authored poses penetrated by 1–29mm.
// Quarter-frame samples also exercise actual fractional runtime interpolation.
for(const [name,clip,tick] of [
 ['river-boa','hit',5],['river-boa','death',55],['living-tsunami','idle',30],
 ['timbermaw-larva','idle',66],['timbermaw-larva','move',57],['timbermaw-larva','attack',40],['timbermaw-larva','hit',5],['timbermaw-larva','death',14],
 ['roil-elemental','move',39],['roil-elemental','shockwave',90],
])test(`actual runtime skin contacts floor: ${name}/${clip}/${tick}`,()=>{
 const source=model(name)
 for(const time of [tick-.25,tick,tick+.25]){
  const y=skinHeightStatistics(source,clip,time).minimum
  assert.ok(y>=-.00005,`${name}/${clip}@${time}: penetrates ${-y}m`)
  assert.ok(y<=.001,`${name}/${clip}@${time}: contact floats ${y}m above the floor`)
 }
})

test('Larva death actually lowers the original head skin by20cm while retaining floor contact',()=>{
 const source=model('timbermaw-larva'),start=skinHeightStatistics(source,'death',0)
 assert.ok(start.headCount>100,'original head region must contain actual rendered vertices')
 for(const tick of [44.75,45,45.25,60,75,89.75,90]){
  const state=skinHeightStatistics(source,'death',tick)
  assert.ok(start.headHeight-state.headHeight>=.20,`death@${tick}: head drops only ${start.headHeight-state.headHeight}m`)
  assert.ok(state.minimum>=-.00005&&state.minimum<=.001,`death@${tick}: actual floor contact ${state.minimum}m`)
 }
})

test('Drake actual death skin stays on the support plane throughout its floating-clip regression',()=>{
 const source=model('sky-ruin-drake')
 for(const tick of [0,10,20,30,35,35.25,35.5,35.75,43.5,43.75,48,75,100]){
  const minimum=skinHeightStatistics(source,'death',tick).minimum
  assert.ok(minimum>=-.00005&&minimum<=.001,`death@${tick}: support gap ${minimum}m`)
 }
})
