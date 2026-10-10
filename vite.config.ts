import react from '@vitejs/plugin-react'
import { pathToFileURL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/**
 * 페이즈 카드의 지도 조각 — `import('./phase1?map')` 은 카드 원본(src/data/phase1.ts, 설명·근거 글이 길다)에서 지도가 그림을 그리고
 * 카메라를 옮기는 데 쓰는 필드만 담은 작은 조각을 준다 (모양은 src/data/phase.ts 의 PhaseMapCard). 그림은 이것만 기다리고, 긴 글은 패널에 쓸 때 받는다.
 * 원본은 손으로 고치는 그 파일 하나다 — 이 조각은 빌드·개발 서버가 그때마다 원본에서 뽑는다
 */
function phaseMap(): Plugin {
  const MAP = /\/src\/data\/phase\d+\.ts\?map$/
  return {
    name: 'phase-map',
    enforce: 'pre',
    async load(id) {
      if (!MAP.test(id)) return null
      const file = id.slice(0, -'?map'.length)
      this.addWatchFile(file)
      // node 가 타입을 지우고 바로 읽는다 (scripts/figures/to_ts.mjs 와 같이) — 고친 원본을 다시 읽도록 주소를 바꾼다
      const mod: Record<string, unknown> = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
      const cards = Object.values(mod).find(Array.isArray) as Record<string, unknown>[] | undefined
      if (!cards) throw new Error(`${file}: 카드 배열을 내보내지 않는다`)
      const slim = cards.map((c) => ({
        id: c.id,
        name: c.name,
        nameKo: c.nameKo,
        set: c.set,
        depicts: c.depicts,
        at: c.at,
        size: c.size,
        flip: c.flip,
        childMap: c.childMap,
        place: c.place,
        // 자리가 이 지도의 추정인지만 — 까닭 글은 패널에 쓸 때 원본에서
        estimate: c.estimate ? true : undefined,
      }))
      return `export const CARDS = ${JSON.stringify(slim)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [phaseMap(), react()],
  // references/ 의 참고 repo(FMG 등) HTML 을 의존성 스캔에서 빼고, 변경 감시도 하지 않는다
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: ['**/references/**'] } },
})
