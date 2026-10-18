// Resolve the game's era and references against the map's actual loaded sagas.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import ts from 'typescript'
import {createHash} from 'node:crypto'

const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const load = async path => {
  const js = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}
export async function resolveCampaign(campaign = JSON.parse(read('game/gameplay/content/campaign.json'))) {
  const { SAGAS, levelOf } = await load('src/data/sagas.ts')
  const saga = SAGAS[campaign.saga - 1]
  const level = levelOf(campaign.saga, campaign.phase)
  if (!saga || !level || saga.sets[campaign.phase - 1] !== campaign.set) throw new Error('게임 시점이 실제 지도 사가/페이즈에 없음')
  if (campaign.act !== campaign.saga) throw new Error('게임 막과 지도 사가가 일치하지 않음')
  if (campaign.arc && (campaign.arc.length !== saga.phases || campaign.arc.some((p,i)=>p.phase!==i+1||p.set!==saga.sets[i]))) throw new Error('게임 막 전체의 순서가 실제 지도 페이즈와 일치하지 않음')
  const {locations: mapLocations} = await load('src/data/locations.ts')
  const place = mapLocations.find(p=>p.id===campaign.place)
  if (!place || place.continentId !== campaign.continent) throw new Error('게임 장소의 실제 지도 대륙이 일치하지 않음')
  const cards = new Map()
  for (let local = 1; local <= campaign.phase; local++) {
    const n = levelOf(campaign.saga, local)
    const data = await load(`src/data/phase${n}.ts`)
    for (const card of data[`PHASE${n}_CARDS`]) {
      if (card.until && card.until < campaign.phase) continue
      cards.set(card.id, card)
    }
  }
  const enemies = campaign.enemyReferences.map(ref => {
    const card = cards.get(ref.card)
    if (!card || !saga.sets.slice(0, campaign.phase).includes(card.set.toUpperCase())) throw new Error(`현재 지도 페이즈에 없는 적: ${ref.card}`)
    const continent = card.depicts?.type==='continent' ? card.depicts.id : mapLocations.find(p=>p.id===card.depicts?.id)?.continentId
    if (continent !== campaign.continent) throw new Error(`게임 대륙과 생물의 지도 근거가 다름: ${ref.card}`)
    return { ...ref, name: card.nameKo || card.name, depicts: card.depicts, image: card.image }
  })
  const locations = (campaign.locationReferences ?? []).map(id=> {
    const card = cards.get(id)
    if (!card || card.depicts?.id !== campaign.place) throw new Error(`게임 장소와 연결된 지도 근거 없음: ${id}`)
    return {id, depicts:card.depicts, name:card.nameKo||card.name}
  })
  if (!locations.length && !enemies.some(e => e.depicts?.id === campaign.place)) throw new Error('게임 장소와 연결된 지도 근거 없음')
  return { ...campaign, level, sagaName: saga.name, enemies, locations }
}
export function verifyRuntimeCampaign(){
  const folder=new URL('game/gameplay/content/creatures/act1/runtime/',root)
  if(!existsSync(new URL('models.json',folder)))throw new Error('1막 런타임 모델 5종의 생성·검토·연결이 끝나지 않아 생산 빌드를 보류합니다. 기존 프로토타입을 1막 완료로 배포할 수 없습니다.')
  const models=JSON.parse(readFileSync(new URL('models.json',folder),'utf8'))
  const campaign=JSON.parse(read('game/gameplay/content/campaign.json'))
  if(models.act!==1||models.set!=='ZEN'||models.reviewStatus!=='approved'||JSON.stringify(models.models.map(m=>m.name))!==JSON.stringify(campaign.enemyReferences.map(e=>e.card)))throw new Error('1막 런타임 모델 검토표 또는 소비 순서가 현재 캠페인과 다릅니다.')
  for(const m of models.models){
    const bytes=readFileSync(new URL(`${m.name}.zkmodel`,folder))
    if(createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw new Error(`1막 런타임 모델 해시 불일치: ${m.name}`)
    if(!m.rigged||!m.animated||!Number.isInteger(m.boneCount)||m.boneCount<2||!['idle','move','attack','hit','death'].every(clip=>m.clips?.includes(clip)))throw new Error(`실제 리그·스킨·필수 행동 클립이 없는 정적 몹은 생산에 사용할 수 없습니다: ${m.name}`)
    for(const [ext,key] of [['skin','skinSha256'],['rig','rigSha256'],['anim','animationSha256']]){
      const data=readFileSync(new URL(`${m.name}.${ext}`,folder))
      if(createHash('sha256').update(data).digest('hex')!==m[key])throw new Error(`리깅 산출물 해시 불일치: ${m.name}.${ext}`)
    }
  }
  if(!read('game/CMakeLists.txt').includes('gameplay/content/creatures/act1/runtime'))throw new Error('생산 팩이 아직 1막 모델 폴더를 소비하지 않습니다.')
}
if (process.argv.includes('--check') || process.argv.includes('--header')) {
  const c = await resolveCampaign()
  if(c.act!==1||c.saga!==1)throw new Error('현재 게임은 최신 지도 사가가 아니라 1막부터 개발해야 합니다.')
  if(process.argv.includes('--verify-runtime'))verifyRuntimeCampaign()
  for(const stage of c.arc) await resolveCampaign({...c,phase:stage.phase,set:stage.set})
  if(process.argv.includes('--header')){
    const text=`// Generated from validated map era/region references by game/tools/campaign.mjs.\n#pragma once\n#include <array>\n#include <string_view>\nnamespace game::campaign {\ninline constexpr unsigned ACT = ${c.act}, SAGA = ${c.saga}, PHASE_COUNT = ${c.arc.length};\ninline constexpr std::string_view TITLE = ${JSON.stringify(c.title)};\nstruct Stage { std::string_view set, focus; };\ninline constexpr std::array<Stage, PHASE_COUNT> STAGES{{\n${c.arc.map(p=>`  {${JSON.stringify(p.set)}, ${JSON.stringify(p.focus)}},`).join('\n')}\n}};\ninline constexpr std::array<std::string_view, ${c.enemies.length}> CREATURE_NAMES{{${c.enemies.map(e=>JSON.stringify(e.card)).join(', ')}}};\n}\n`
    const out=new URL('game/gameplay/domain/campaign.hpp',root)
    if(!existsSync(out)||readFileSync(out,'utf8')!==text)writeFileSync(out,text)
  }
  console.log(`campaign: saga ${c.saga} phase ${c.phase} / ${c.set} / ${c.place} / ${c.enemies.length} validated references`)
}
