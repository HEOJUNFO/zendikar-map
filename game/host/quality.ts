import { startEngine } from './engine-client'
import { latest, replace } from './coalesce'

export interface QualityState {
  ready: boolean; failed: boolean; frame: number; revision: number; scene: number; actor: number; action: number
  tick: number; playing: boolean; neutral: boolean; enraged: boolean; pose: number; blend: number; vertices: number
  dimensions: [number, number, number]; bones: number; settled: boolean; camera: [number, number, number]
}
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const canvas = element<HTMLCanvasElement>('view')
const controls = element<HTMLFieldSetElement>('controls')
const status = element<HTMLParagraphElement>('status')
const scene = element<HTMLSelectElement>('scene')
const actor = element<HTMLSelectElement>('actor')
const action = element<HTMLSelectElement>('action')
const enraged = element<HTMLInputElement>('enraged')
const lighting = element<HTMLSelectElement>('lighting')
const tick = element<HTMLInputElement>('tick')
const zoom = element<HTMLInputElement>('zoom')
const play = element<HTMLButtonElement>('play')
let state: QualityState | undefined
let initialized = false
let scrubbing = false
let playing = true
let initialTick = 0
let yaw = Math.PI, pitch = .15, distance = 7
// 주소로 장면을 받는다: ?scene=6&actor=0&lighting=room&cam=yaw,pitch,distance — 새로 고쳐도 보던 곳이 남는다.
// 목록에 없는 값은 버리고 기본값으로 둔다.
{
  const query = new URLSearchParams(location.search)
  for (const select of [scene, actor, lighting, action]) {
    const value = query.get(select.id)
    if (value !== null && [...select.options].some(option => option.value === value)) select.value = value
  }
  if (Number(actor.value) >= 6) scene.value = '6'
  if ((actor.value==='0'&&action.value!=='0') || (Number(actor.value)>=6&&Number(action.value)>1) || (Number(action.value)>=4&&Number(action.value)<=8&&actor.value!=='5')) action.value='0'
  const requestedTick=Number(query.get('tick')??0)
  if(Number.isInteger(requestedTick)&&requestedTick>=0&&requestedTick<=3600)initialTick=requestedTick
  playing=query.get('playing')!=='false'
  tick.value=String(initialTick)
  distance = actor.value === '0' ? 18 : actor.value === '5' ? 10 : actor.value === '3' ? 5 : 7
  const cam = query.get('cam')?.split(',').map(Number)
  if (cam?.length === 3 && cam.every(Number.isFinite)) {
    yaw = cam[0]; pitch = Math.max(-1.3, Math.min(1.3, cam[1])); distance = Math.max(1, Math.min(65, cam[2]))
  }
  zoom.value = String(distance)
}
const remember = (at=Number(tick.value)) => {
  const query = new URLSearchParams({scene: scene.value, actor: actor.value, action:action.value, tick:String(at), playing:String(playing), lighting: lighting.value, cam: [yaw, pitch, distance].map(v => v.toFixed(3)).join(',')})
  history.replaceState(null, '', `${location.pathname}?${query}`)
}
const channel = new BroadcastChannel(`zendikar-quality-${crypto.randomUUID()}`)
let recorder: MediaRecorder | undefined
let stream: MediaStream | undefined
const failed = (error: unknown) => { status.textContent = `검토 화면 오류: ${String(error)}. 페이지를 새로 열어 다시 시도하세요.` }

try {
  const client = await startEngine(canvas, undefined, channel.name)
  const api = client.api
  type Command = { scene: number; actor: number; action: number; tick: number; playing: boolean; neutral: boolean; enraged: boolean; yaw: number; pitch: number; distance: number }
  const send = latest(async (c: Command) => {
    const accepted = await api.quality.configure(c.scene,c.actor,c.action,c.tick,c.playing,c.neutral,c.enraged,c.yaw,c.pitch,c.distance)
    if (!accepted) throw new Error('품질 상태 명령이 거부되었습니다')
  }, replace, failed)
  const command = (at = 0xffffffff) => send.push({scene:Number(scene.value),actor:Number(actor.value),action:Number(action.value),tick:at,playing,neutral:lighting.value==='neutral',enraged:enraged.checked,yaw,pitch,distance})
  channel.addEventListener('message', (event: MessageEvent<string>) => {
    const current = JSON.parse(event.data) as QualityState
    state = current
    if (current.failed) { controls.disabled=true;status.textContent='생산 에셋을 읽지 못했습니다. 페이지를 다시 열어 주세요.';return }
    if (!current.ready) return
    controls.disabled=false
    play.textContent=current.playing?'일시정지':'재생'
    if (!initialized) {initialized=true;command(initialTick)}
    status.textContent='생산 WebGPU · 에셋 준비 완료'
    if (!scrubbing) tick.value=String(current.tick)
    element<HTMLOutputElement>('tick-value').value=`${current.tick} / 3600`
    element('dimensions-label').textContent='바인드 메시 외곽 (m)'
    element('dimensions').textContent=current.dimensions.map(v=>v.toFixed(3)).join(' × ')
    element('vertices').textContent=current.vertices.toLocaleString('ko-KR')
    element('settled').textContent=current.actor<=5&&current.action===3 ? (current.settled?'사망 클립 종료':'사망 클립 재생'):'해당 없음'
    if (!current.playing && playing && current.tick===3600) {playing=false;play.textContent='재생'}
    window.dispatchEvent(new CustomEvent<QualityState>('qualitystate',{detail:current}))
  })
  const sizes=latest((s:{width:number;height:number})=>api.surface.resize(s.width,s.height),replace,failed)
  const resize=()=>sizes.push({width:Math.max(1,Math.round(canvas.clientWidth*devicePixelRatio)),height:Math.max(1,Math.round(canvas.clientHeight*devicePixelRatio))})
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize()
  scene.addEventListener('change',()=>{remember(0);command(0)})
  const refreshActions=()=>{
    for(const value of ['1','2','3','9','10']) action.querySelector<HTMLOptionElement>(`option[value="${value}"]`)!.disabled=actor.value==='0'||(Number(actor.value)>=6&&value!=='1')
  }
  refreshActions()
  actor.addEventListener('change',()=>{
    if (actor.value==='0'||Number(action.value)>=4 && Number(action.value)<=8 && actor.value!=='5') action.value='0'
    refreshActions()
    if(Number(actor.value)>=6&&Number(action.value)>=2)action.value='0'
    if (Number(actor.value)>=6) scene.value='6'
    distance=actor.value==='0'?18:actor.value==='5'?10:actor.value==='3'?5:7
    zoom.value=String(distance);remember(0);command(0)
  })
  action.addEventListener('change',()=>{if(Number(action.value)>=4&&Number(action.value)<=8)actor.value='5';refreshActions();remember(0);command(0)})
  enraged.addEventListener('change',()=>{remember(0);command(0)})
  lighting.addEventListener('change',()=>{remember();command()})
  zoom.addEventListener('change',()=>remember())
  play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'일시정지':'재생';remember();command()})
  element('reset').addEventListener('click',()=>{remember(0);command(0)})
  element('fit').addEventListener('click',()=>{yaw=Math.PI;pitch=.15;distance=actor.value==='0'?18:actor.value==='5'?10:7;zoom.value=String(distance);remember();command()})
  tick.addEventListener('pointerdown',()=>{scrubbing=true})
  tick.addEventListener('pointerup',()=>{scrubbing=false})
  tick.addEventListener('pointercancel',()=>{scrubbing=false})
  tick.addEventListener('input',()=>{playing=false;play.textContent='재생';remember();command(Number(tick.value))})
  zoom.addEventListener('input',()=>{distance=Number(zoom.value);command()})
  let pointer: {id:number;x:number;y:number}|undefined
  canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus()})
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;yaw+=(e.clientX-pointer.x)*.008;pitch=Math.max(-1.3,Math.min(1.3,pitch+(e.clientY-pointer.y)*.008));pointer.x=e.clientX;pointer.y=e.clientY;command()})
  canvas.addEventListener('pointerup',()=>{pointer=undefined;remember()})
  canvas.addEventListener('pointercancel',()=>{pointer=undefined})
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(1,Math.min(65,distance*Math.exp(e.deltaY*.001)));zoom.value=String(distance);command()},{passive:false})
  canvas.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft')yaw-=.1;else if(e.key==='ArrowRight')yaw+=.1;else if(e.key==='ArrowUp')pitch=Math.max(-1.3,pitch-.1);else if(e.key==='ArrowDown')pitch=Math.min(1.3,pitch+.1);else if(e.key==='+')distance=Math.max(1,distance-.5);else if(e.key==='-')distance=Math.min(65,distance+.5);else return
    e.preventDefault();zoom.value=String(distance);remember();command()
  })
  const save=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();link.remove();URL.revokeObjectURL(url)}
  const name=()=>`zendikar-quality-${state?.actor}-${state?.action}-${state?.tick}`
  const captureFailed=(error:unknown)=>{element('capture-status').textContent=`저장하지 못했습니다: ${String(error)}. 다시 시도해 주세요.`}
  element('screenshot').addEventListener('click',()=>{try{canvas.toBlob(blob=>{if(blob)save(blob,`${name()}.png`);else captureFailed('PNG를 만들지 못했습니다')},'image/png')}catch(error){captureFailed(error)}})
  element('metadata').addEventListener('click',()=>save(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`${name()}.json`))
  const record=element<HTMLButtonElement>('record')
  if(typeof MediaRecorder==='undefined'||typeof canvas.captureStream!=='function'){record.disabled=true;element('capture-status').textContent='이 브라우저는 클립 저장을 지원하지 않습니다.'}
  record.addEventListener('click',()=>{
    if(recorder?.state==='recording'){record.disabled=true;recorder.stop();return}
    try {
      stream=canvas.captureStream(60)
      const activeStream=stream
      const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v))
      recorder=new MediaRecorder(stream,type?{mimeType:type}:{})
      const activeRecorder=recorder
      const chunks:BlobPart[]=[]
      recorder.addEventListener('dataavailable',e=>{if(e.data.size)chunks.push(e.data)})
      recorder.addEventListener('stop',()=>{save(new Blob(chunks,{type:activeRecorder.mimeType||'video/webm'}),`${name()}.webm`);activeStream.getTracks().forEach(t=>t.stop());record.disabled=false;record.textContent='클립 녹화';element('capture-status').textContent='클립을 저장했습니다.'})
      recorder.addEventListener('error',()=>{activeStream.getTracks().forEach(t=>t.stop());record.disabled=false;record.textContent='클립 녹화';captureFailed('브라우저 녹화 오류')})
      recorder.start();if(!playing){playing=true;play.textContent='일시정지';command()}record.textContent='녹화 정지';element('capture-status').textContent='녹화 중 · 정지하면 저장합니다.'
    }catch(error){stream?.getTracks().forEach(t=>t.stop());captureFailed(error)}
  })
  Object.assign(window,{qualityViewer:{get state(){return state},canvas,configure:async(next:Partial<Command>)=>{
    // Forward the requested numbers unchanged: assigning an invalid <select>
    // value first would turn it into an empty string and silently coerce it to 0.
    const c={scene:next.scene??Number(scene.value),actor:next.actor??Number(actor.value),action:next.action??Number(action.value),
      tick:next.tick??0xffffffff,playing:next.playing??playing,neutral:next.neutral??(lighting.value==='neutral'),enraged:next.enraged??enraged.checked,
      yaw:next.yaw??yaw,pitch:next.pitch??pitch,distance:next.distance??distance}
    const accepted=await api.quality.configure(c.scene,c.actor,c.action,c.tick,c.playing,c.neutral,c.enraged,c.yaw,c.pitch,c.distance)
    if(accepted){
      scene.value=String(c.scene);actor.value=String(c.actor);action.value=String(c.action);playing=c.playing
      lighting.value=c.neutral?'neutral':'room';enraged.checked=c.enraged;yaw=c.yaw;pitch=c.pitch;distance=c.distance
      zoom.value=String(distance);refreshActions();remember(c.tick===0xffffffff?Number(tick.value):c.tick)
    }
    return accepted
  }}})
  window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());observer.disconnect();channel.close();client.terminate()},{once:true})
}catch(error){failed(error);channel.close()}
