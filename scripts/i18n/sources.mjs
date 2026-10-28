// 영어로 옮길 데이터 글 — 패널에 싣는 글의 칸만 (이름 nameKo·지도 라벨은 옮기지 않는다: 한국어 이름은 공식 한국어판 표기라 영어는 name 이다).
// 묶음(set)마다 사전 하나 — base 는 장소·대륙·대지 카드·지역 상세 안내·바탕 지형·페이즈 바탕(src/i18n/en/base.json, 영어 보기면 늘 받는다),
// phase<n> 은 그 페이즈 카드의 글(src/i18n/en/phase<n>.json, 그 페이즈의 카드 글과 함께 받는다)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasHangul, splitUnits, unitKey } from '../../src/i18n/units.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const DICT_DIR = path.join(ROOT, 'src/i18n/en')

/** 패널에 싣는 글의 칸 — 이 이름의 칸에 든 한국어 글(과 글 목록)을 모은다. sources 는 그 label 만 */
const TEXT_KEYS = new Set(['description', 'history', 'placementBasis', 'estimate', 'basis', 'label', 'summary', 'terrain', 'peoples', 'note', 'subject'])

const SKIP_NONE = new Set()
/** 바탕 지형의 근거(basis)는 패널에 싣지 않는다 — 이름(label)과 추정(estimate)만 */
const LANDSCAPE_SKIP = new Set(['basis'])

/** 값 나무를 돌며 [자리, 글] — 자리는 사람이 읽는 길 (locations/eye-of-ugin.description) */
function collect(value, where, out, key, skip = SKIP_NONE) {
  if (typeof value === 'string') {
    if (key && TEXT_KEYS.has(key) && !skip.has(key) && hasHangul(value)) out.push([where, value])
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collect(v, `${where}[${i}]`, out, key === 'peoples' ? key : undefined, skip))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'sources' && Array.isArray(v)) {
        v.forEach((s, i) => s && typeof s.label === 'string' && hasHangul(s.label) && out.push([`${where}.sources[${i}]`, s.label]))
        continue
      }
      collect(v, `${where}.${k}`, out, k, skip)
    }
  }
}

const byId = (list, prefix) => list.flatMap((x) => {
  const out = []
  collect(x, `${prefix}/${x.id ?? '?'}`, out)
  return out
})

const CONTINENTS = ['akoum', 'bala-ged', 'guul-draz', 'murasa', 'ondu', 'sejiri', 'tazeem']

export const SETS = ['base', 'phase1', 'phase2', 'phase3', 'phase4', 'phase5', 'phase6']

/** 묶음의 [자리, 글] 목록 */
export async function textsOf(set) {
  const out = []
  if (set === 'base') {
    out.push(...byId((await import('../../src/data/locations.ts')).locations, 'locations'))
    out.push(...byId((await import('../../src/data/continents.ts')).continents, 'continents'))
    out.push(...byId((await import('../../src/data/cards.ts')).LAND_CARDS, 'cards'))
    out.push(...byId((await import('../../src/data/childMaps.ts')).CHILD_MAPS, 'childMaps'))
    for (const c of CONTINENTS) {
      collect((await import(`../../src/data/landscape/${c}.ts`)).landscape, `landscape/${c}`, out, undefined, LANDSCAPE_SKIP)
      collect((await import(`../../src/data/periods/${c}.ts`)).period, `periods/${c}`, out)
    }
    return out
  }
  const n = Number(set.replace('phase', ''))
  const m = await import(`../../src/data/phase${n}.ts`)
  out.push(...byId(m[`PHASE${n}_CARDS`], set))
  return out
}

/** 묶음의 문장 — 열쇠 → { ko, where(처음 나온 자리), text(그 문장이 든 글 — 옮길 때의 앞뒤) } */
export async function unitsOf(set) {
  const units = new Map()
  for (const [where, text] of await textsOf(set))
    for (const u of splitUnits(text)) {
      if (!hasHangul(u)) continue
      const k = unitKey(u)
      const had = units.get(k)
      if (had && had.ko !== u) throw new Error(`열쇠가 겹친다: ${k}\n  ${had.ko}\n  ${u}`)
      if (!had) units.set(k, { ko: u, where, text })
    }
  return units
}

export const dictPath = (set) => path.join(DICT_DIR, `${set}.json`)

export function readDict(set) {
  const p = dictPath(set)
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}
}

/** 열쇠 차례로 써서 고친 자리만 diff 에 나온다 */
export function writeDict(set, dict) {
  const sorted = Object.fromEntries(Object.keys(dict).sort().map((k) => [k, dict[k]]))
  fs.mkdirSync(DICT_DIR, { recursive: true })
  fs.writeFileSync(dictPath(set), JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"').replace(/^\{/, '{\n').replace(/\}$/, '\n}\n'))
}
