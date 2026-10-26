import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {PassThrough} from 'node:stream'
import {validatePlan} from './direct-studio.mjs'
import {parseSessionCookie,jwtExpiry,refreshDelayMs,mintStudioJwt,keepStudioSessionFresh,readMaskedSecret,STUDIO_TOKEN_URL} from './studio-auth.mjs'
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

const fakeJwt=exp=>['e30',Buffer.from(JSON.stringify({exp})).toString('base64url'),'sig'].join('.')
test('session cookie input accepts the bare value or a cookie header',()=>{
 assert.equal(parseSessionCookie('  fake-session  '),'fake-session')
 assert.equal(parseSessionCookie('Cookie: a=1; ory_kratos_session=fake-session; b=2'),'fake-session')
 assert.throws(()=>parseSessionCookie(''),/ory_kratos_session/)
 assert.throws(()=>parseSessionCookie('two words'),/ory_kratos_session/)
})
test('refresh is scheduled one minute before the JWT exp',()=>{
 assert.equal(jwtExpiry(fakeJwt(1000)),1000)
 assert.throws(()=>jwtExpiry('not-a-jwt'),/exp/)
 assert.equal(refreshDelayMs(1000,100_000),840_000)
 assert.equal(refreshDelayMs(1000,999_000),0)
})
test('minting sends only the session cookie to the Studio whoami endpoint',async()=>{
 let seen
 const jwt=await mintStudioJwt('fake-session',async(url,init)=>{seen={url,init};return{ok:true,json:async()=>({tokenized:fakeJwt(9)})}})
 assert.equal(jwt,fakeJwt(9))
 assert.equal(seen.url,STUDIO_TOKEN_URL)
 assert.equal(seen.init.headers.Cookie,'ory_kratos_session=fake-session')
 assert.equal(seen.init.redirect,'error')
 await assert.rejects(mintStudioJwt('fake-session',async()=>({ok:false,status:401})),error=>/HTTP 401/.test(error.message)&&!error.message.includes('fake-session'))
 await assert.rejects(mintStudioJwt('s',async()=>({ok:true,json:async()=>({})})),/no JWT/)
})
test('session keeper re-applies a fresh JWT before expiry and retries failures until exp',async()=>{
 let clock=0,mints=0,failNext=false,errors=[]
 const timers=[],applied=[]
 const keeper=keepStudioSessionFresh({
  mint:async()=>{mints++;if(failNext){failNext=false;throw new Error('down')}return fakeJwt(clock/1000+900)},
  apply:async jwt=>{applied.push(jwt)},onError:e=>errors.push(e),
  now:()=>clock,setTimer:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimer:()=>{}})
 await keeper.ready
 assert.deepEqual([applied.length,timers.at(-1).ms],[1,840_000])
 clock+=840_000;failNext=true;await timers.at(-1).fn()
 assert.deepEqual([applied.length,timers.at(-1).ms,errors.length],[1,10_000,0])
 clock+=10_000;await timers.at(-1).fn()
 assert.deepEqual([applied.length,mints,timers.at(-1).ms],[2,3,840_000])
 keeper.stop();const count=timers.length
 clock+=840_000;await timers.at(-1).fn()
 assert.equal(timers.length,count)
})
test('session keeper reports once the JWT would expire without a refresh',async()=>{
 let clock=0,ok=true;const timers=[],errors=[]
 const keeper=keepStudioSessionFresh({mint:async()=>{if(!ok)throw new Error('down');return fakeJwt(100)},apply:async()=>{},onError:e=>errors.push(e),
  now:()=>clock,setTimer:fn=>{timers.push(fn)},clearTimer:()=>{}})
 await keeper.ready;ok=false
 clock=95_000;await timers.at(-1)()
 assert.equal(errors.length,1)
})
test('masked terminal input never echoes the secret and supports backspace',async()=>{
 const input=Object.assign(new PassThrough(),{isTTY:true,raw:[],setRawMode(on){this.raw.push(on)}}),output=new PassThrough()
 let shown='';output.on('data',d=>{shown+=d})
 const secret=readMaskedSecret('cookie: ',{input,output})
 input.write('fake-sx\u007fession\r')
 assert.equal(await secret,'fake-session')
 assert.deepEqual(input.raw,[true,false])
 assert.ok(!shown.includes('fake'))
 await assert.rejects(readMaskedSecret('x',{input:new PassThrough(),output}),/terminal is required/)
})
