import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync, readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import { resolveCampaign } from '../tools/campaign.mjs'

test('game act one begins with ZEN and keeps the complete ZEN-WWK-ROE arc', async () => {
  const c = await resolveCampaign()
  assert.equal(c.act, 1)
  assert.equal(c.saga, 1)
  assert.equal(c.phase, 1)
  assert.equal(c.level, 1)
  assert.equal(c.place, 'emeria')
  assert.equal(c.continent, 'tazeem')
  assert.deepEqual(c.arc.map(p=>p.set),['ZEN','WWK','ROE'])
  assert.equal(c.enemies.find(e => e.role === 'boss').card, 'roil-elemental')
  assert.equal(c.locations[0].id,'emeria-angel')
  assert.equal(new Set(c.enemies.map(e => e.role)).size, 5)
})
test('unimplemented Rising saga and wrong-era creatures fail before generation', async () => {
  const c = await resolveCampaign()
  await assert.rejects(resolveCampaign({ ...c, saga: 3, phase: 1, set: 'ZNR' }), /실제 지도/)
  await assert.rejects(resolveCampaign({ ...c, enemyReferences: [{ role: 'boss', card: 'cragplate-baloth' }] }), /현재 지도 페이즈/)
  await assert.rejects(resolveCampaign({ ...c, enemyReferences: [{ role: 'boss', card: 'bane-of-bala-ged' }] }), /현재 지도 페이즈/)
})
test('OGW respects map expiry rather than resurrecting the BFZ titan', async () => {
  const c = await resolveCampaign()
  const bfz={...c,act:2,saga:2,arc:undefined,place:'sea-gate',locationReferences:[]}
  await assert.rejects(resolveCampaign({ ...bfz, phase: 2, set: 'OGW', enemyReferences: [{role:'boss',card:'ulamog-the-ceaseless-hunger'}] }), /현재 지도 페이즈/)
  const ogw = await resolveCampaign({...bfz,phase:2,set:'OGW',enemyReferences:[{role:'boss',card:'bane-of-bala-ged'}]})
  assert.equal(ogw.level,5)
  assert.equal(ogw.enemies[0].card,'bane-of-bala-ged')
})
test('card art: only v3 act-one illustrations are active and v2 files are gone', () => {
  const folder = new URL('../gameplay/content/images/cards/',import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', folder), 'utf8'))
  assert.ok(manifest.artRevision >= 3)
  assert.ok(manifest.cards.every(card => /-v3\.png$/.test(card.source)))
  assert.deepEqual(readdirSync(folder).filter(file => /^art-.+-v2\.png$/.test(file)), [])
  const result = spawnSync(process.execPath,['game/tools/art/prepare-card-art.mjs'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'})
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /CARD-ART-PASS 3 frames/)
})
test('Ior is in Akoum and cannot be used as the Tazeem starting location', async () => {
  const c = await resolveCampaign()
  await assert.rejects(resolveCampaign({...c,place:'ior-ruin',locationReferences:['ior-ruin-expedition']}),/실제 지도 대륙/)
  await assert.rejects(resolveCampaign({...c,enemyReferences:[{role:'boss',card:'territorial-baloth'}]}),/생물의 지도 근거/)
})
