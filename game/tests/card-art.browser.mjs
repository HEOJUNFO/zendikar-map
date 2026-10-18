// Resource preview QA, using decoded images and loaded fonts, no gameplay build.
// Run prepare-card-art.mjs first, then this with the existing Vite server.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchChrome } from '../../scripts/qa/chrome.mjs'

const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? fallback : process.argv[at + 1] }
const base = arg('base', 'http://127.0.0.1:5181').replace(/\/$/, '')
const out = resolve(arg('out', 'build/shop-card-art'))
const manifest=JSON.parse(readFileSync(resolve('game/gameplay/content/images/cards/manifest.json'),'utf8'))
mkdirSync(out, {recursive:true})
const chrome = await launchChrome({width:1360,height:1536,maxMinutes:3})
const evidence = {startedAt:new Date().toISOString(),base,viewport:[1360,1536],browser:chrome.path,errors:[],shots:[]}
let off
try {
  const {sessionId} = await chrome.newPage(null)
  off = chrome.on(message => {
    if (message.sessionId !== sessionId) return
    if (message.method === 'Runtime.exceptionThrown') evidence.errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') evidence.errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '))
  })
  const evaluate = async expression => {
    const result = await chrome.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId)
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const loaded = new Promise((resolve,reject) => {
    const stop = chrome.on(message => {if(message.sessionId===sessionId && message.method==='Page.loadEventFired'){clearTimeout(timer);stop();resolve()}})
    const timer = setTimeout(()=>{stop();reject(new Error('preview load event missing'))},15000)
  })
  await chrome.send('Page.navigate',{url:`${base}/build/shop-card-art/preview.html`},sessionId)
  await loaded
  const result = await evaluate(`(async()=>{
    await Promise.all(Array.from(document.images,image=>image.decode()));await document.fonts.ready;await window.cardPreviewReady;
    const cards=Array.from(document.querySelectorAll('.card'));
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
    const textInfo=(element,card)=>{
      const range=document.createRange();range.selectNodeContents(element);
      const lines=new Set(Array.from(range.getClientRects()).filter(r=>r.width>0).map(r=>Math.round(r.top*2)/2));
      const canvas=document.createElement('canvas');canvas.width=card.clientWidth;canvas.height=card.clientHeight;
      const context=canvas.getContext('2d');context.drawImage(card.querySelector('.frame'),0,0,canvas.width,canvas.height);
      const c=rect(card),t=rect(element),x=t.x-c.x,y=t.y-c.y,w=t.width,h=t.height;
      const points=[[x+3,y+3],[x+w-3,y+3],[x+3,y+h-3],[x+w-3,y+h-3],[x+w/2,y+h/2]];
      const samples=points.map(([px,py])=>Array.from(context.getImageData(Math.floor(px),Math.floor(py),1,1).data));
      const ink=getComputedStyle(element).color.match(/[0-9.]+/g).slice(0,3).map(Number);
      const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
      const luminance=p=>.2126*linear(p[0])+.7152*linear(p[1])+.0722*linear(p[2]);
      const foreground=luminance(ink);
      const minContrast=Math.min(...samples.map(p=>{const background=luminance(p);return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05)}));
      return {kind:element.className,content:element.textContent,rect:t,lineCount:lines.size,fontSize:parseFloat(getComputedStyle(element).fontSize),minContrast,minPanelAlpha:Math.min(...samples.map(p=>p[3])),overflow:element.scrollWidth>element.clientWidth+1||element.scrollHeight>element.clientHeight+1};
    };
    return {fontReady:document.fonts.check('17px CardPreview','기억 인장'),cards:cards.map(card=>({id:card.dataset.card,tier:card.dataset.tier,rect:rect(card),
      images:Array.from(card.querySelectorAll('img')).map(image=>({src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight,rect:rect(image)})),
      text:Array.from(card.querySelectorAll('.slot,.title,.effect,.price,.status')).map(element=>textInfo(element,card))}))};})()`)
  assert.equal(result.fontReady,true,'actual Korean font loaded')
  assert.equal(result.cards.length,12)
  assert.equal(new Set(result.cards.map(card=>card.id)).size,12)
  for(const card of result.cards){
    assert.equal(card.images.length,2,'independent illustration and frame layers')
    assert.ok(card.images[0].src.endsWith(manifest.cards.find(item=>item.id===card.id).source),'active illustration is consumed')
    assert.ok(card.images[1].src.endsWith(manifest.frames.find(item=>item.tier===card.tier).source),'active paper frame is consumed')
    assert.equal(card.text.length,5,'runtime text areas remain separate from image layers')
    for(const text of card.text){
      assert.equal(text.overflow,false,`${card.id}/${text.kind}: text exceeds its reserved region`)
      assert.ok(text.rect.x>=card.rect.x&&text.rect.y>=card.rect.y&&text.rect.x+text.rect.width<=card.rect.x+card.rect.width+1&&text.rect.y+text.rect.height<=card.rect.y+card.rect.height+1)
      const safe={slot:[.115,.06,.885,.105],title:[.115,.105,.885,.17],effect:[.115,.635,.885,.775],price:[.115,.785,.885,.85],status:[.155,.85,.845,.90]}[text.kind]
      assert.ok(text.rect.x>=card.rect.x+safe[0]*card.rect.width-1&&text.rect.y>=card.rect.y+safe[1]*card.rect.height-1&&
        text.rect.x+text.rect.width<=card.rect.x+safe[2]*card.rect.width+1&&text.rect.y+text.rect.height<=card.rect.y+safe[3]*card.rect.height+1,
        `${card.id}/${text.kind}: text region intrudes into the ornamental frame`)
      assert.ok(text.minPanelAlpha>=240,`${card.id}/${text.kind}: text overlaps transparent aperture or exterior`)
      assert.ok(text.minContrast>=4.5,`${card.id}/${text.kind}: text/panel contrast below 4.5:1 (${text.minContrast})`)
      if(text.kind==='title'){assert.equal(text.lineCount,1,`${card.id}: title must fit on one line`);assert.ok(text.fontSize>=12,'title stays readable')}
    }
  }
  evidence.layout=result
  const shot=async name=>{
    const capture=await chrome.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId)
    const file=resolve(out,`${name}.png`),bytes=Buffer.from(capture.data,'base64');writeFileSync(file,bytes)
    evidence.shots.push({file,sha256:createHash('sha256').update(bytes).digest('hex')})
  }
  await shot('cards-all')
  for(const tier of ['silver','gold','prism']){
    await evaluate(`document.querySelectorAll('.card').forEach(card=>card.hidden=card.dataset.tier!==${JSON.stringify(tier)});document.querySelector('h1').textContent=${JSON.stringify(`기억 인장 · ${tier}`)};true`)
    await shot(`cards-${tier}`)
  }
  assert.deepEqual(evidence.errors,[])
  evidence.validation=createHash('sha256').update(readFileSync(resolve(out,'asset-validation.json'))).digest('hex')
  evidence.result='PASS'
  console.log('CARD-ART-BROWSER-PASS 12 cards, 24 separate image layers, 60 text regions, 4 screenshots')
} catch(error){evidence.result='FAIL';evidence.failure=error.stack??String(error);console.error(evidence.failure);process.exitCode=1}
finally{off?.();writeFileSync(resolve(out,'browser-evidence.json'),JSON.stringify(evidence,null,2)+'\n');await chrome.close()}
