// Read-only check of the self-refreshing Studio session: mint a JWT from the
// session cookie and list recent models. No paid work, nothing written to disk.
import {randomBytes} from 'node:crypto'
import {readMaskedSecret,parseSessionCookie,mintStudioJwt,jwtExpiry} from './studio-auth.mjs'

const size=Math.min(Number(process.argv[2])||20,20)
let session=parseSessionCookie(await readMaskedSecret('Tripo Studio ory_kratos_session cookie (hidden): '))
let jwt=await mintStudioJwt(session);session=undefined
console.log('JWT minted; expires',new Date(jwtExpiry(jwt)*1000).toISOString())
// Like the web app: Studio origin (the API rejects other domains, code 1017) and a device id.
const headers={Accept:'application/json',Origin:'https://studio.tripo3d.ai',Referer:'https://studio.tripo3d.ai/',Authorization:`Bearer ${jwt}`,'x-tripo-device-id':randomBytes(16).toString('hex')}
const get=path=>fetch(`https://api.tripo3d.ai/v2/studio/${path}`,{redirect:'error',headers})
const report=async(name,r)=>console.log(name,'HTTP',r.status,r.headers.get('cf-ray')?'(cloudflare)':'',r.ok?'':(await r.text()).replace(/eyJ[\w.-]+/g,'[jwt]').slice(0,300))
await report('user/profile/payment',await get('user/profile/payment'))
const response=await get(`assets/v2?asset_type=mine&type=all&locale=en&offset=0&size=${size}`)
jwt=undefined
if(!response.ok){await report('assets/v2',response);process.exit(1)}
const body=await response.json()
// Shape is not documented; find the first array of objects and print safe fields only (no URLs).
const list=(function find(v,depth=0){if(Array.isArray(v)&&typeof v[0]==='object')return v;if(v&&typeof v==='object'&&depth<3)for(const x of Object.values(v)){const r=find(x,depth+1);if(r)return r}})(body)||[]
console.log('response keys:',Object.keys(body).join(','),'| items:',list.length,'| item keys:',Object.keys(list[0]||{}).join(','))
for(const item of list)console.log([item.id,item.project_name||item.model_name_user_renamed,item.type,item.model_url?'model':'no model'].map(v=>v||'-').join(' | '))
