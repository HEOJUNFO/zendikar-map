// 데이터 글의 영어 사전 받기 — base(장소·대륙·대지 카드·지역 상세 안내·바탕 지형·페이즈 바탕)는 영어 보기면 늘,
// phase<n> 은 그 페이즈의 카드를 받는 보기에서만. 아직 옮기지 않은 묶음은 파일이 없어 받지 않는다 (그 글은 한국어로)
import type { Dict } from './units'

const FILES = import.meta.glob<Dict>('./en/*.json', { import: 'default' })

const cache = new Map<string, Promise<Dict>>()

function load(name: string): Promise<Dict> | null {
  const file = FILES[`./en/${name}.json`]
  if (!file) return null
  let p = cache.get(name)
  if (!p) {
    p = file()
    // 못 받으면 다음에 다시
    p.catch(() => cache.delete(name))
    cache.set(name, p)
  }
  return p
}

/** base 와 phase1..level 의 사전을 합친 것 — 받을 것이 없으면 빈 사전 */
export async function loadDicts(level: number): Promise<Dict> {
  const names = ['base', ...Array.from({ length: level }, (_, i) => `phase${i + 1}`)]
  const dicts = await Promise.all(names.map((n) => load(n) ?? Promise.resolve({})))
  return Object.assign({}, ...dicts)
}
