// node scripts/i18n/card.mjs <cardId> [<cardId> …] — the card's English data from this repo (name, set, number, English flavor, land face, sources)
const ids = process.argv.slice(2)
for (let n = 1; n <= 6; n++) {
  const m = await import(new URL(`../../src/data/phase${n}.ts`, import.meta.url).href)
  for (const c of m[`PHASE${n}_CARDS`]) if (ids.includes(c.id))
    console.log(JSON.stringify({ phase: n, id: c.id, name: c.name, nameKo: c.nameKo, set: c.set, number: c.number, typeLine: c.typeLine, flavor: c.flavor, land: c.land && { name: c.land.name, nameKo: c.land.nameKo, flavor: c.land.flavor }, sources: c.sources }, null, 1))
}
