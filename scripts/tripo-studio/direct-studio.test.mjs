import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {validatePlan} from './direct-studio.mjs'
import {resolveCampaign} from '../../game/tools/campaign.mjs'

const plan=async()=>{
 const c=await resolveCampaign()
 const inputs=c.enemies.map(e=>{const path=resolve(`game/art-work/act1/concepts/${e.card}.png`);return{card:e.card,path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}})
 return{act:1,saga:1,set:'ZEN',authorizedModelGenerations:5,inputs,workflow:{name:'act1-ZEN-creatures',steps:inputs.map(i=>({step_id:i.card,operation:'model.generate',input:{source:{kind:'local_image',image_path:i.path}}}))}}
}
test('approved native direct plan uses exactly the reviewed five ZEN images',async()=>{
 const p=await plan();assert.equal((await validatePlan(p)).workflow.steps.length,5)
})
test('direct generation rejects extra paid work and changed input pixels',async()=>{
 const p=await plan()
 await assert.rejects(validatePlan({...p,workflow:{...p.workflow,steps:[...p.workflow.steps,p.workflow.steps[0]]}}),/Exactly five/)
 const extra=structuredClone(p);extra.workflow.steps[0].operation='model.remesh'
 await assert.rejects(validatePlan(extra),/Only five/)
 const changed=structuredClone(p);changed.inputs[0].sha256='0'.repeat(64)
 await assert.rejects(validatePlan(changed),/hash changed/)
})
test('direct generation rejects the superseded BFZ starting act and outside image paths',async()=>{
 const p=await plan()
 await assert.rejects(validatePlan({...p,act:2,saga:2,set:'BFZ'}),/current act-one/)
 const outside=structuredClone(p);outside.workflow.steps[0].input.source.image_path=resolve('package.json')
 await assert.rejects(validatePlan(outside),/act-one concept folder/)
})
