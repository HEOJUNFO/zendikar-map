// Collect only the already completed five Studio generations. No remote writes.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {optimizeGlb} from '../../../scripts/tripo-studio/optimize-glb.mjs'
import {resolveCampaign} from '../campaign.mjs'
const campaign=await resolveCampaign()
const runtime=resolve('build/act1-overhaul/studio-direct')
const workflow=JSON.parse(readFileSync(join(runtime,'status.json'),'utf8'))
if(workflow.status!=='succeeded'||workflow.progress.completed!==5)throw new Error('The existing five generations are not complete')
const records=[]
for(const enemy of campaign.enemies){
 const result=workflow.results.find(r=>r.step_id===enemy.card)
 if(result?.gallery_item_ids?.length!==1||!/^model_generation--[0-9a-f-]+$/.test(result.gallery_item_ids[0]))throw new Error('Invalid archived model result')
 const source=join(runtime,'archive/items',result.gallery_item_ids[0],'model-1.glb')
 const target=resolve('game/art-work/act1/generated',enemy.card)
 mkdirSync(target,{recursive:true})
 const report=await optimizeGlb(source,join(target,`${enemy.card}.glb`),{preset:enemy.role==='boss'?'boss':'creature',overwrite:true})
 copyFileSync(join(runtime,'archive/items',result.gallery_item_ids[0],'cover-1.png'),join(target,'source-cover.png'))
 const record={name:enemy.card,role:enemy.role,workflowId:workflow.workflow_id,projectId:result.project_ids[0],sourceArchiveItem:result.gallery_item_ids[0],status:'bind-mesh-reference-only',rigged:false,animated:false,report}
 writeFileSync(join(target,'manifest.json'),JSON.stringify(record,null,2)+'\n')
 records.push(record)
 console.log(`${enemy.card}: ${report.before.triangles}→${report.after.triangles} triangles, skin/animation still required`)
}
writeFileSync('game/art-work/act1/generated/manifest.json',JSON.stringify({act:1,set:'ZEN',workflowId:workflow.workflow_id,models:records,runtimeIntegrated:false},null,2)+'\n')
