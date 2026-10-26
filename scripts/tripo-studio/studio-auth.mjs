// Memory-only Studio web session: Ory Kratos cookie -> short-lived JWTs.
// Studio web auth is Ory Kratos: the browser holds the long-lived HttpOnly
// `ory_kratos_session` cookie and mints short JWTs from this endpoint.
export const STUDIO_TOKEN_URL='https://api.tripo3d.ai/v2/studio/studio/whoami?tokenizeAs=default_jwt'
export function parseSessionCookie(text){
 const raw=String(text||'').trim().replace(/^cookie:\s*/i,'')
 const pair=raw.split(/;\s*/).find(p=>p.startsWith('ory_kratos_session='))
 const value=(pair?pair.slice('ory_kratos_session='.length):raw).trim()
 if(!value||/[\s;]/.test(value)||value.length>8192)throw new Error('Expected the ory_kratos_session cookie value')
 return value
}
export function jwtExpiry(jwt){
 const part=String(jwt).split('.')[1]
 let exp
 try{exp=JSON.parse(Buffer.from(part,'base64url').toString('utf8')).exp}catch{}
 if(!Number.isFinite(exp))throw new Error('Studio JWT has no readable exp claim')
 return exp
}
export const refreshDelayMs=(exp,nowMs,leadMs=60000)=>Math.max(0,exp*1000-leadMs-nowMs)
export async function mintStudioJwt(sessionCookie,fetchImpl=fetch){
 const response=await fetchImpl(STUDIO_TOKEN_URL,{method:'GET',redirect:'error',headers:{Accept:'application/json',Cookie:`ory_kratos_session=${sessionCookie}`}})
 if(!response.ok)throw new Error(`Studio session refresh failed: HTTP ${response.status}${response.status===401?' (session cookie expired; log in again and re-enter it)':''}`)
 const jwt=(await response.json().catch(()=>({}))).tokenized
 if(typeof jwt!=='string'||jwt.split('.').length!==3)throw new Error('Studio session refresh returned no JWT')
 jwtExpiry(jwt)
 return jwt
}
// Mint now, apply, then re-mint leadMs before each exp. A failed refresh retries
// until the current JWT expires; it never touches submitted work.
export function keepStudioSessionFresh({mint,apply,onError,leadMs=60000,retryMs=10000,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer,stopped=false,exp=0
 const schedule=(fn,ms)=>{if(!stopped){timer=setTimer(fn,ms);timer?.unref?.()}}
 const cycle=async()=>{
  const jwt=await mint();exp=jwtExpiry(jwt)
  await apply(jwt)
  schedule(refresh,refreshDelayMs(exp,now(),leadMs))
 }
 const refresh=async()=>{
  try{await cycle()}catch(error){
   if(now()+retryMs<exp*1000)schedule(refresh,retryMs);else if(!stopped)onError(error)
  }
 }
 return{ready:cycle(),stop(){stopped=true;clearTimer(timer)}}
}
export function readMaskedSecret(prompt,{input=process.stdin,output=process.stderr}={}){
 if(!input.isTTY)return Promise.reject(new Error('A terminal is required for the masked Studio session input'))
 return new Promise((resolveSecret,reject)=>{
  let value=''
  const done=error=>{input.setRawMode(false);input.pause();input.off('data',onData);output.write('\n');if(error){value='';reject(error)}else{resolveSecret(value);value=''}}
  const onData=chunk=>{
   for(const ch of chunk){
    if(ch==='\r'||ch==='\n')return done()
    if(ch==='\u0003'||ch==='\u001b')return done(new Error('Studio session input cancelled'))
    if(ch==='\u007f'||ch==='\b'){value=value.slice(0,-1);continue}
    if(ch>=' ')value+=ch
    if(value.length>8192)return done(new Error('Studio session input exceeded limit'))
   }
  }
  output.write(prompt)
  input.setEncoding('utf8');input.setRawMode(true);input.resume();input.on('data',onData)
 })
}
