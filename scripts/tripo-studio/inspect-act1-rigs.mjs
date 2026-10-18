// Read-only Studio rig prechecks first. Paid rig/animation steps require a
// separately approved, bounded plan published after reviewing these results.
import {readFileSync,writeFileSync,mkdirSync,existsSync,watch} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {requestStudioJwt} from './direct-studio.mjs'
const root=resolve('.'),dir=resolve('build/act1-overhaul/rig-direct')
const lib=pathToFileURL(resolve(process.env.TRIPO_LIBRARY_DIR||'build/main-counter-tripo-20261013/plugin-src/dist')+'/')
const [{loadConfig},{SessionManager},{StudioHttpClient},{StudioGateway},versions,presets]=await Promise.all([
 import(new URL('config.js',lib)),import(new URL('auth/session.js',lib)),import(new URL('studio/http-client.js',lib)),import(new URL('studio/gateway.js',lib)),import(new URL('constants.js',lib)),import(new URL('operations/animation-presets.js',lib))])
mkdirSync(dir,{recursive:true})
const marker=join(dir,'submission.json'),grant=join(dir,'approved-rig-plan.json')
if(existsSync(marker))throw new Error('An existing rig submission must be inspected, never automatically resent')
const config=loadConfig({...process.env,TRIPO_AUTH_MODE:'provided_session',TRIPO_DATA_DIR:dir,TRIPO_OUTPUT_ROOTS:root,TRIPO_ARCHIVE_DIR:join(dir,'archive')})
if(config.apiBaseUrl!=='https://api.tripo3d.ai')throw new Error('Unexpected Studio API origin')
const original=JSON.parse(readFileSync('build/act1-overhaul/studio-direct/status.json','utf8'))
if(original.status!=='succeeded'||original.results.length!==5)throw new Error('Five original models must be complete')
const session=new SessionManager(undefined,config.deviceId)
let token,runtime
try{
 token=await requestStudioJwt();session.set(token,'provided')
 const gateway=new StudioGateway(new StudioHttpClient(config,session))
 const cached=process.argv.includes('--resume-approved')&&existsSync(grant)&&existsSync(join(dir,'preflight.json'))?JSON.parse(readFileSync(join(dir,'preflight.json'),'utf8')):null
 if(cached&&(cached.sourceWorkflow!==original.workflow_id||cached.models.length!==5||cached.models.some(m=>!original.results.some(r=>r.step_id===m.name&&r.project_ids[0]===m.projectId))))throw new Error('Cached preflight does not match the approved source models')
 const models=cached?cached.models:[]
 for(const row of cached?[]:original.results){
  const result=await gateway.precheckRigging({projectId:row.project_ids[0],modelVersion:versions.RIGGING_MODEL_VERSION_V2_5})
  const available=presets.isRetargetRigType(result.rig_type)?presets.listAnimationPresets({rigType:result.rig_type}):[]
  models.push({name:row.step_id,projectId:row.project_ids[0],riggable:result.riggable,rigType:result.rig_type,presets:available})
  console.log('RIG-PRECHECK',row.step_id,result.riggable,result.rig_type)
 }
 const report={at:new Date().toISOString(),sourceWorkflow:original.workflow_id,paidRequestSent:false,models}
 writeFileSync(join(dir,'preflight.json'),JSON.stringify(report,null,2)+'\n')
 console.log('READ-ONLY-RIG-PREFLIGHT-COMPLETE',models.filter(m=>m.riggable&&m.rigType!=='others').length,'supported models; no paid rig request sent')
 if(!models.some(m=>m.riggable&&m.rigType!=='others'))process.exitCode=2
 else{
  // Keep the JWT only in this process while the human reviews the exact plan.
  const approved=await new Promise((res,rej)=>{
   let handle,timer
   const check=()=>{if(!existsSync(grant))return;try{const p=JSON.parse(readFileSync(grant,'utf8'));clearTimeout(timer);handle?.close();res(p)}catch{/* atomic publication will generate another event */}}
   handle=watch(dir,(_,file)=>{if(String(file)==='approved-rig-plan.json')check()})
   timer=setTimeout(()=>{handle.close();rej(new Error('Paid-plan approval not received; no paid rig operation submitted'))},30*60*1000)
   check()
  })
  if(approved.approval!=='human-user'||approved.sourceWorkflow!==original.workflow_id||approved.authorizedPaidOperations!==approved.workflow?.steps?.length||approved.authorizedPaidOperations>10)throw new Error('Invalid bounded paid authorization')
  const allowed=new Map(models.filter(m=>m.riggable&&m.rigType!=='others').map(m=>[m.projectId,m]))
  for(const step of approved.workflow.steps){
   if(step.operation==='model.rig'){if(!allowed.has(step.input.project_id))throw new Error('Unsupported or unrelated rig project')}
   else if(step.operation==='model.animate'){
    const binding=step.bindings?.find(b=>b.target==='/project_id')
    const rig=approved.workflow.steps.find(s=>s.step_id===binding?.from_step&&s.operation==='model.rig')
    const model=rig&&allowed.get(rig.input.project_id)
    if(!model||!model.presets.some(p=>p.preset===step.input.preset&&p.rig_type===step.input.rig_type))throw new Error('Animation preset is not in the actual preflight result')
   }else throw new Error('Only explicitly approved rig and animation operations are allowed')
  }
  const [{createTripoRuntime},{StartWorkflowInputSchema}]=await Promise.all([import(new URL('runtime/core.js',lib)),import(new URL('public-api/schemas.js',lib))])
  StartWorkflowInputSchema.parse(approved.workflow)
  runtime=await createTripoRuntime({config})
  const call=async(name,input)=>{const r=await runtime.call(name,input);if(!r.ok)throw new Error(`${r.error.code}: ${r.error.message}`);return r.value}
  await call('tripo_set_session',{access_token:token,replace_current:true});token=undefined;session.clear()
  const folder=join(dir,'workflows');mkdirSync(folder,{recursive:true})
  let workflowId,watcher,timer,checking=false,dirty=false,finish,fail
  const done=new Promise((res,rej)=>{finish=res;fail=rej})
  const check=async()=>{
   if(!workflowId)return
   if(checking){dirty=true;return}checking=true
   try{const state=await call('tripo_get_workflow',{workflow_id:workflowId});writeFileSync(join(dir,'status.json'),JSON.stringify(state,null,2)+'\n');if(['succeeded','failed'].includes(state.status))finish(state)}catch(e){fail(e)}finally{checking=false;if(dirty){dirty=false;void check()}}
  }
  try{
   watcher=watch(folder,()=>{void check()});timer=setTimeout(()=>fail(new Error('Rig completion publication timeout; inspect the saved workflow without retry')),30*60*1000)
   writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),stage:'starting',paidOperations:approved.authorizedPaidOperations},null,2)+'\n',{flag:'wx'})
   const accepted=await call('tripo_start_workflow',approved.workflow);workflowId=accepted.workflow_id
   writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),...accepted,paidOperations:approved.authorizedPaidOperations},null,2)+'\n')
   console.log('RIG-WORKFLOW-SUBMITTED',workflowId,approved.authorizedPaidOperations)
   await check();const result=await done;console.log('RIG-WORKFLOW-TERMINAL',result.status)
   if(result.status!=='succeeded')throw new Error('Rig workflow did not succeed; no automatic retry')
  }finally{clearTimeout(timer);watcher?.close()}
 }
 }catch(error){
 const message=String(error?.message||'Rig preflight failed').replace(/Bearer\s+\S+/gi,'[redacted]').replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g,'[redacted JWT]').slice(0,400)
 console.error('RIG-DIRECT-STOPPED',message);process.exitCode=1
 writeFileSync(join(dir,'last-stop.json'),JSON.stringify({at:new Date().toISOString(),reason:message,paidSubmissionRecorded:existsSync(marker)},null,2)+'\n')
}finally{token=undefined;session.clear();await runtime?.close()}
