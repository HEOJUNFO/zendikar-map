// Rebuild the Tripo Studio workflow library: clone upstream at the pinned commit,
// apply library.patch, install dependencies without lifecycle scripts, compile to dist/.
// Usage: node scripts/tripo-studio/setup-library.mjs   (re-running reuses an existing clone)
import {existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {UPSTREAM,UPSTREAM_COMMIT,PATCH,SOURCE_DIR,LIBRARY_DIR} from './library.mjs'

const run=(cmd,args,cwd=SOURCE_DIR)=>{
 const r=spawnSync(cmd,args,{cwd,stdio:'inherit'})
 if(r.status!==0)throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`)
}
if(!existsSync(SOURCE_DIR))run('git',['clone','-q',UPSTREAM,SOURCE_DIR],process.cwd())
// Start from the pinned commit every time so the patch applies to known sources.
run('git',['checkout','-q','--force',UPSTREAM_COMMIT])
run('git',['clean','-q','-fd','--','src','tests'])
run('git',['apply',PATCH])
// The upstream lockfile is out of sync with current npm, so `npm ci` refuses it.
run('npm',['install','--no-audit','--no-fund','--ignore-scripts'])
run('npx',['tsc','-p','tsconfig.build.json'])
console.log('TRIPO-LIBRARY-READY',LIBRARY_DIR)
