// In the actual /game/quality/ page, run await runQualityViewerChecks().
// Uses explicit public configure commands and submitted-frame publications only.
export async function runQualityViewerChecks() {
  const events=[]
  const check=(value,message)=>{if(!value)throw new Error(message)}
  const wait=(predicate,label,timeout=15000)=>new Promise((resolve,reject)=>{
    let timer
    const done=state=>{clearTimeout(timer);window.removeEventListener('qualitystate',receive);resolve(state)}
    const receive=event=>{if(predicate(event.detail))done(event.detail)}
    window.addEventListener('qualitystate',receive)
    timer=setTimeout(()=>{window.removeEventListener('qualitystate',receive);reject(new Error(label))},timeout)
    const current=window.qualityViewer?.state
    if(current&&predicate(current))done(current)
  })
  const ready=await wait(s=>s.ready,'actual Scenery ready publication missing')
  check(ready.failed===false,'actual production pack failed')
  const command=async next=>{
    const before=window.qualityViewer.state.revision
    const publication=wait(s=>s.ready&&s.revision>before&&Object.entries(next).every(([key,value])=>{
      if(key==='yaw'||key==='pitch'||key==='distance')return true
      return value===0xffffffff&&key==='tick'||s[key]===value
    }),'quality command did not publish a submitted frame',30000)
    check(await window.qualityViewer.configure(next),'public quality command rejected')
    const state=await publication;events.push(state);return state
  }
  for(let scene=0;scene<7;scene++) {
    const state=await command({scene,actor:0,action:0,tick:0,playing:false})
    check(state.dimensions.every(Number.isFinite),'room dimensions finite')
  }
  for(const actor of [1,2,3,5,6,7]) {
    for(const action of actor>=6?[0,1]:[0,1,2,3]) {
      const state=await command({scene:actor>=6?6:0,actor,action,tick:17,playing:false})
      check(state.vertices>0&&state.dimensions.every(v=>Number.isFinite(v)&&v>0),'current static model missing')
      check(state.pose===0&&state.blend===0,'unrigged species unexpectedly selected a legacy pose')
    }
  }
  for(let action=4;action<=8;action++) {
    const state=await command({scene:0,actor:5,action,tick:130,playing:false,enraged:true})
    check(state.act===2,'enraged pattern did not enter real active phase')
  }
  const first=await command({scene:0,actor:1,action:1,tick:13,playing:false,neutral:false})
  await command({playing:true})
  await wait(s=>s.tick>first.tick,'animation did not advance from publication')
  const paused=await command({playing:false})
  const reviewed=await command({neutral:true,yaw:1.5707963268,pitch:.3,distance:8})
  check(reviewed.tick===paused.tick,'lighting/orbit command reset paused animation time')
  check(Math.abs(reviewed.camera[0]-1.5707963268)<.0001,'orbit not applied in actual renderer state')
  check(!(await window.qualityViewer.configure({scene:99})),'invalid scene accepted')
  check(!(await window.qualityViewer.configure({actor:4}))&&!(await window.qualityViewer.configure({actor:8})),'retired creatures accepted')
  // Return only real public states; caller binds wasm/pack/source hashes and captures pixels.
  return {ok:true,events,canvas:[window.qualityViewer.canvas.width,window.qualityViewer.canvas.height],pointerLocked:!!document.pointerLockElement}
}
