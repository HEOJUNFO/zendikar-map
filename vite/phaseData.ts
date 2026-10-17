import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

/**
 * 페이즈 카드 원본(src/data/phase1.ts …, 설명·근거 글이 길다)에서 뽑는 조각들 — 원본은 손으로 고치는 그 파일 하나이고, 조각은 빌드·개발 서버가 그때마다 뽑는다
 * (따로 고치거나 다시 만들 파일은 없다). 브라우저는 원본을 통째로 받지 않는다.
 * - `import('./phase1?map')` — 지도가 그림을 그리고 카메라를 옮기는 데 쓰는 필드만 담은 작은 지도 조각 (모양은 src/data/phase.ts 의 PhaseMapCard).
 *   그림이 있는 카드에는 그림의 상자(frame: viewBox 와 기준점)와 그림 묶음(group)을 붙인다 — src/map/figures/frames.json (scripts/figures/to_ts.mjs 가 만든다).
 *   지도는 이것으로 그림이 오기 전에 이름 자리를 정하고, 지금 화면에 필요한 그림 묶음만 고른다
 * - `import('./phase1?cards')` — 카드 id → 그 카드 원본 하나를 불러오는 함수 (`TEXT`). 카드마다 `./phase1.ts?card=<id>` 가 따로 나뉜 조각이 되어,
 *   패널은 연 카드의 글(한 장에 2KB 남짓)만 받는다
 */
export function phaseData(): Plugin {
  const PIECE = /\/src\/data\/phase\d+\.ts\?(map|cards|card=[^&]+)$/
  const FRAMES = fileURLToPath(new URL('../src/map/figures/frames.json', import.meta.url))
  /** 읽은 원본 — 파일이 바뀌면 다시 읽는다 (카드마다의 조각이 한 원본을 수백 번 읽지 않게) */
  const read = new Map<string, { mtime: number; cards: Promise<Record<string, unknown>[]> }>()
  const cardsOf = (file: string) => {
    const mtime = statSync(file).mtimeMs
    let r = read.get(file)
    if (!r || r.mtime !== mtime) {
      // node 가 타입을 지우고 바로 읽는다 (scripts/figures/to_ts.mjs 와 같이) — 고친 원본을 다시 읽도록 주소를 바꾼다
      const cards = import(`${pathToFileURL(file).href}?t=${mtime}`).then((mod: Record<string, unknown>) => {
        const cards = Object.values(mod).find(Array.isArray) as Record<string, unknown>[] | undefined
        if (!cards) throw new Error(`${file}: 카드 배열을 내보내지 않는다`)
        return cards
      })
      r = { mtime, cards }
      read.set(file, r)
    }
    return r.cards
  }
  return {
    name: 'phase-data',
    enforce: 'pre',
    async load(id) {
      const m = PIECE.exec(id)
      if (!m) return null
      const file = id.slice(0, id.lastIndexOf('?'))
      const name = file.slice(file.lastIndexOf('/') + 1)
      this.addWatchFile(file)
      const cards = await cardsOf(file)
      if (m[1] === 'cards') {
        const text = cards.map((c) => `${JSON.stringify(c.id)}: () => import(${JSON.stringify(`./${name}?card=${encodeURIComponent(c.id as string)}`)})`)
        return `export const TEXT = {\n${text.join(',\n')}\n}`
      }
      if (m[1] !== 'map') {
        const card = cards.find((c) => c.id === decodeURIComponent(m[1].slice('card='.length)))
        if (!card) throw new Error(`${file}: 카드 '${m[1]}' 가 없다`)
        return `export const CARD = ${JSON.stringify(card)}`
      }
      this.addWatchFile(FRAMES)
      const frames: Record<string, [string, ...number[]]> = JSON.parse(readFileSync(FRAMES, 'utf8'))
      const slim = cards.map((c) => {
        const f = frames[c.id as string]
        // 그림이 없는 카드는 장소와 하나인 카드(place)뿐이다 — 새 카드의 그림을 넣고 to_ts.mjs 를 다시 돌리지 않으면 여기서 멈춘다
        if (!f && !c.place) throw new Error(`${file}: '${c.id}' 의 그림 상자가 frames.json 에 없다 (node scripts/figures/to_ts.mjs > src/map/figures.ts)`)
        return {
          id: c.id,
          name: c.name,
          nameKo: c.nameKo,
          set: c.set,
          depicts: c.depicts,
          at: c.at,
          size: c.size,
          flip: c.flip,
          childMap: c.childMap,
          // 이름을 먼저 둘 쪽 (지역 상세 대상은 그 그림의 subjects 의 label, 세계 지도 그림은 카드의 것)
          label: c.label,
          place: c.place,
          // 그 사가의 이 페이즈까지만 그린다 (src/data/phase1.ts 의 PhaseCard.until)
          until: c.until,
          // 자리가 이 지도의 추정인지만 — 까닭 글은 패널에 쓸 때 원본에서
          estimate: c.estimate ? true : undefined,
          // 그림 묶음과 그림의 상자 [x, y, 너비, 높이, 기준점 x, 기준점 y] (그림의 좌표)
          group: f?.[0],
          frame: f?.slice(1),
        }
      })
      return `export const CARDS = ${JSON.stringify(slim)}`
    },
  }
}
