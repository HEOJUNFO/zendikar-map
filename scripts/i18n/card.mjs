// node scripts/i18n/card.mjs <cardId> [<cardId> …] — the card's English data from this repo (name, set, number, English flavor, land face or back face, sources)
import { SETS } from './sources.mjs'

const ids = process.argv.slice(2)
// 페이즈 원본 파일마다 (아직 열리지 않은 사가의 파일도 — sources.mjs 의 SETS)
for (const n of SETS.filter((s) => s !== 'base').map((s) => Number(s.replace('phase', '')))) {
  const m = await import(new URL(`../../src/data/phase${n}.ts`, import.meta.url).href)
  for (const c of m[`PHASE${n}_CARDS`]) if (ids.includes(c.id))
    console.log(JSON.stringify({ phase: n, id: c.id, name: c.name, nameKo: c.nameKo, set: c.set, number: c.number, typeLine: c.typeLine, flavor: c.flavor, land: c.land && { name: c.land.name, nameKo: c.land.nameKo, flavor: c.land.flavor }, back: c.back && { name: c.back.name, nameKo: c.back.nameKo, typeLine: c.back.typeLine, flavor: c.back.flavor }, sources: c.sources }, null, 1))
}
