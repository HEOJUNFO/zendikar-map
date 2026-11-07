import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Plugin } from 'vite'

const run = promisify(execFile)

/**
 * 픽셀 지도(/pixel)의 페이즈 그림 (S7) — scripts/pixel/figures.mjs 가 시점별 지도의 세계 지도 그림을 단계마다 픽셀 그림으로 구운 것.
 * - `virtual:pixel-figures`: 카드(이름·세트·페이즈·가리키는 곳)·자리·시점마다의 그리는 차례와 이름 쪽, 그리고 그림 조각을 불러오는 함수 표 (시점을 켤 때 받는다)
 * - `virtual:pixel-fig-<조각>`: 그림 조각 — 넓은 단계는 단계마다 하나, 고운 단계(한 픽셀 ≤ 1 단위)는 지도 칸마다 (보이는 칸만 받는다)
 * 지금 지도의 모듈을 Node 에서 읽어야 해 vite/pixelTerrain.ts 처럼 따로 된 node 로 돌리고, 원본이 바뀌면 다시 뽑는다 (개발 서버는 'pixel-terrain' 알림으로 픽셀 지도만 다시 부른다)
 */
export function pixelFigures(): Plugin {
  const ID = 'virtual:pixel-figures'
  const CHUNK = 'virtual:pixel-fig-'
  const root = fileURLToPath(new URL('..', import.meta.url))
  const file = (p: string) => `${root}${p}`
  const SOURCES = new Set([
    ...readdirSync(file('src/data')).filter((f) => /^phase\d\.ts$/.test(f)).map((f) => file(`src/data/${f}`)),
    ...['timeline', 'sagas', 'extraSets', 'types', 'childMaps'].map((n) => file(`src/data/${n}.ts`)),
    file('src/map/figures/frames.json'),
    file('scripts/phase-cards.mjs'),
    file('scripts/pixel/figures.mjs'),
    file('scripts/pixel/periods.mjs'),
  ])
  const figureDir = file('src/map/figures/')
  let data: Promise<{ meta: { chunks: string[] } & Record<string, unknown>; chunks: Record<string, unknown> }> | null = null
  const extract = () =>
    (data ??= run(process.execPath, ['--import', file('scripts/qa/pixel-hooks.mjs'), file('scripts/pixel/figures.mjs'), '--json'], {
      cwd: root,
      maxBuffer: 256 * 1024 * 1024,
      encoding: 'utf8',
    }).then((r) => JSON.parse(r.stdout)))
  return {
    name: 'pixel-figures',
    resolveId: (id) => (id === ID || id.startsWith(CHUNK) ? '\0' + id : undefined),
    configureServer(server) {
      server.watcher.add([...SOURCES, figureDir])
      server.watcher.on('change', (path) => {
        if (!SOURCES.has(path) && !path.startsWith(figureDir)) return
        data = null
        for (const env of Object.values(server.environments))
          for (const m of env.moduleGraph.idToModuleMap.values()) if (m.id === '\0' + ID || m.id?.startsWith('\0' + CHUNK)) env.moduleGraph.invalidateModule(m)
        server.ws.send({ type: 'custom', event: 'pixel-terrain' })
      })
    },
    async load(id) {
      if (!id.startsWith('\0')) return
      const name = id.slice(1)
      if (name === ID) {
        const { meta } = await extract()
        // 조각을 불러오는 함수 표 — 가상 조각은 import() 의 글이 정해져 있어야 나뉜다
        const loaders = meta.chunks.map((k: string) => `${JSON.stringify(k)}: () => import(${JSON.stringify(CHUNK + k)})`).join(',\n')
        return `export default ${JSON.stringify(meta)}\nexport const chunks = {\n${loaders}\n}`
      }
      if (!name.startsWith(CHUNK)) return
      const { chunks } = await extract()
      const key = name.slice(CHUNK.length)
      if (!chunks[key]) this.error(`${name}: 그림 조각이 없다`)
      return `export default ${JSON.stringify(chunks[key])}`
    },
  }
}
