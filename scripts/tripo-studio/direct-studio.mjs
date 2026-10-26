// Direct Studio HTTP with memory-only, self-refreshing web JWTs; no MCP server/stdio transport.
// Reuse the installed, validated native HTTP/upload/workflow library in-process.
import {readFileSync,writeFileSync,mkdirSync,watch,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve,relative,isAbsolute,join} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {resolveCampaign} from '../../game/tools/campaign.mjs'
import {readMaskedSecret,parseSessionCookie,mintStudioJwt,keepStudioSessionFresh} from './studio-auth.mjs'

const root=fileURLToPath(new URL('../../',import.meta.url))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function validatePlan(plan){
 const campaign=await resolveCampaign()
 if(plan.act!==campaign.act||plan.saga!==campaign.saga||plan.set!==campaign.set)throw new Error('Plan must match the current act-one campaign')
 if(plan.authorizedModelGenerations!==5||plan.workflow?.steps?.length!==5||plan.inputs?.length!==5)throw new Error('Exactly five model generations are authorized')
 const ids=campaign.enemies.map(e=>e.card).sort()
 if(JSON.stringify(plan.inputs.map(i=>i.card).sort())!==JSON.stringify(ids))throw new Error('Model subjects must match the current ZEN references')
 const seen=new Set()
 for(const step of plan.workflow.steps){
  if(step.operation!=='model.generate'||step.bindings?.length||step.depends_on?.length||seen.has(step.step_id))throw new Error('Only five independent model.generate steps are authorized')
  seen.add(step.step_id)
  if(step.input?.source?.kind!=='local_image')throw new Error('Use the five reviewed local image inputs')
  const path=resolve(step.input.source.image_path),within=relative(root,path)
  if(!within||within.startsWith('..')||isAbsolute(within)||!within.replaceAll('\\','/').startsWith('game/art-work/act1/concepts/'))throw new Error('Input must stay in the act-one concept folder')
  const input=plan.inputs.find(i=>resolve(i.path)===path&&i.card===step.step_id)
  if(!input||sha(readFileSync(path))!==input.sha256)throw new Error('Reviewed model input hash changed')
 }
 return plan
}
async function main(){
 const argv=process.argv.slice(2),at=argv.indexOf('--plan')
 if(at<0||!argv[at+1])throw new Error('Usage: node scripts/tripo-studio/direct-studio.mjs --plan <reviewed-plan.json> [--check]')
 const plan=await validatePlan(JSON.parse(readFileSync(resolve(argv[at+1]),'utf8')))
 // ceiling: this host has the separately installed native library below. It is
 // not vendored; packaging this CLI requires a supported distributable library.
 const lib=pathToFileURL(resolve(process.env.TRIPO_LIBRARY_DIR||join(root,'build/main-counter-tripo-20261013/plugin-src/dist'))+'/')
 const [{loadConfig},{createTripoRuntime},{StartWorkflowInputSchema}]=await Promise.all([
  import(new URL('config.js',lib)),import(new URL('runtime/core.js',lib)),import(new URL('public-api/schemas.js',lib))])
 StartWorkflowInputSchema.parse(plan.workflow)
 if(argv.includes('--check')){console.log('DIRECT-STUDIO-PLAN-VALID: act 1 / ZEN / five model generations / hashes match');return}
 const dataDir=resolve(root,'build/act1-overhaul/studio-direct'),marker=join(dataDir,'submission.json')
 mkdirSync(dataDir,{recursive:true})
 if(existsSync(marker))throw new Error('Submission record already exists; do not automatically resubmit or retry')
 const config=loadConfig({...process.env,TRIPO_AUTH_MODE:'provided_session',TRIPO_DATA_DIR:dataDir,TRIPO_OUTPUT_ROOTS:root,TRIPO_ARCHIVE_DIR:join(dataDir,'archive')})
 if(config.apiBaseUrl!=='https://api.tripo3d.ai')throw new Error('Unexpected Studio API origin')
 const runtime=await createTripoRuntime({config})
 const call=async(name,input)=>{const r=await runtime.call(name,input);if(!r.ok)throw new Error(`${r.error.code}: ${r.error.message}`);return r.value}
 let watcher,timer,workflowId,session,refresher
 try{
  session=parseSessionCookie(await readMaskedSecret('Tripo Studio ory_kratos_session cookie (hidden): '))
  let failRefresh
  const refreshFailed=new Promise((_,rej)=>{failRefresh=rej});refreshFailed.catch(()=>{})
  refresher=keepStudioSessionFresh({
   mint:()=>mintStudioJwt(session),
   apply:jwt=>call('tripo_set_session',{access_token:jwt,replace_current:true}),
   onError:error=>failRefresh(new Error(`${error.message}; inspect the saved workflow, never resubmit`))})
  await refresher.ready
  console.log('DIRECT-STUDIO-AUTHENTICATED: web JWT auto-refresh / memory only / no MCP server')
  const folder=join(dataDir,'workflows');mkdirSync(folder,{recursive:true})
  let settle,fail,checking=false,dirty=false
  const finished=new Promise((res,rej)=>{settle=res;fail=rej})
  refreshFailed.catch(error=>fail(error))
  // Subscribe before submission. Follow actual durable ledger publication;
  // no client timer polling, no paid retry, and no second submit on uncertainty.
  const check=async()=>{
   if(!workflowId)return
   if(checking){dirty=true;return}checking=true
   try{
    const state=await call('tripo_get_workflow',{workflow_id:workflowId})
    writeFileSync(join(dataDir,'status.json'),JSON.stringify(state,null,2)+'\n')
    if(['succeeded','failed'].includes(state.status))settle(state)
   }catch(error){fail(error)}finally{checking=false;if(dirty){dirty=false;void check()}}
  }
  watcher=watch(folder,()=>{void check()})
  timer=setTimeout(()=>fail(new Error('Workflow completion event missing; inspect the saved workflow, never resubmit')),20*60*1000)
  writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),stage:'starting',subjects:plan.inputs.map(i=>({card:i.card,sha256:i.sha256})),count:5},null,2)+'\n',{flag:'wx'})
  const accepted=await call('tripo_start_workflow',plan.workflow);workflowId=accepted.workflow_id
  writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),stage:'accepted',count:5,...accepted},null,2)+'\n')
  console.log('DIRECT-STUDIO-SUBMITTED',workflowId,'five models')
  await check()
  const result=await finished
  console.log('DIRECT-STUDIO-TERMINAL',result.status,workflowId)
  if(result.status!=='succeeded')throw new Error(`Workflow failed: ${result.reason||'inspect status.json'}; no automatic retry`)
 }finally{session=undefined;refresher?.stop();clearTimeout(timer);watcher?.close();await runtime.close()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{
  const reason=String(error?.message||'Unknown failure').replace(/Bearer\s+\S+/gi,'[redacted]').replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g,'[redacted JWT]').slice(0,500)
  console.error('DIRECT-STUDIO-FAILED:',reason,'; no automatic resubmission');process.exitCode=1
 })
}
