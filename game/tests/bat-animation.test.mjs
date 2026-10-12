import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import test from 'node:test'

const root=new URL('../gameplay/content/creatures/vampire-bat/',import.meta.url)
const read=name=>readFileSync(new URL(name,root))
const manifest=JSON.parse(read('flight.json'))

test('the complete authored bat flight really moves and preserves interpolatable topology',()=>{
  const poses=Array.from({length:8},(_,i)=>read(`flight_0${i}.zkmodel`))
  const nv=poses[0].readUInt32LE(4),ni=poses[0].readUInt32LE(8)
  let movement=0;const wingHeights=[]
  for(const [frame,data] of poses.entries()){
    assert.equal(data.toString('ascii',0,4),'ZKMD')
    assert.equal(data.readUInt32LE(4),nv);assert.equal(data.readUInt32LE(8),ni)
    assert.equal(data.length,16+nv*36+ni*4)
    assert.equal(createHash('sha256').update(data).digest('hex'),manifest.poses[frame].sha256)
    assert.deepEqual(data.subarray(16+nv*36),poses[0].subarray(16+nv*36),'frozen actual triangle slots')
    let tipHeight=-Infinity
    for(let v=0;v<nv;v++){
      const offset=16+v*36,values=Array.from({length:9},(_,axis)=>data.readFloatLE(offset+axis*4))
      assert.ok(values.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...values.slice(3,6))-1)<1e-4)
      assert.deepEqual(data.subarray(offset+24,offset+36),poses[0].subarray(offset+24,offset+36),'author UV/material preserved')
      movement=Math.max(movement,Math.hypot(...values.slice(0,3).map((value,axis)=>value-poses[0].readFloatLE(offset+axis*4))))
      if(Math.abs(values[0])>1.25)tipHeight=Math.max(tipHeight,values[1])
    }
    wingHeights.push(tipHeight)
  }
  assert.ok(movement>.5,'a frozen depsgraph must fail: source wing motion exceeds half a metre')
  assert.ok(Math.max(...wingHeights)-Math.min(...wingHeights)>.45,'actual outer wing vertices visibly flap')
})

test('bat playback contains the full author scene range at its original speed',()=>{
  assert.equal(manifest.action,'Bat_Flying')
  assert.deepEqual(manifest.source_frames,[1,2,3,4,5,6,7,8])
  assert.equal(manifest.source_fps,24);assert.equal(manifest.cycle_ticks,20)
})
