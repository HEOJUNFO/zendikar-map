import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Plugin } from 'vite'

const run = promisify(execFile)

/**
 * 픽셀 지도(/pixel)의 `virtual:pixel-terrain` — 바탕 지형(흩뿌린 기호의 자리·단애·협곡·강·한 점 기호·바다 표시·채색 영역·헤드론)을
 * 지금 지도의 지형 셈 그대로 뽑은 데이터 (scripts/pixel/terrain.mjs, docs/pixel-plan.md S4). 타일을 그리는 Worker 가 부른다.
 * 지금 지도의 모듈을 Node 에서 읽으려면 모듈 훅(scripts/qa/pixel-hooks.mjs)이 필요해, Vite 안에서 import 하지 않고 따로 된 node 로 돌린다
 * (훅이 Vite 를 건드리지 않고, 원본을 고치면 새 프로세스가 새로 읽는다).
 *
 * 개발 서버: 원본을 addWatchFile 로 이 조각에 매지 않는다 — 매면 지금 지도의 파일(terrain.ts·locations.ts …)마다 이 조각이 importer 가 되고,
 * 그 위는 HMR 을 받지 않는 Worker 뿐이라 지금 지도 페이지까지 통째로 다시 불렀다 (S4 검토). 대신 감시기로 원본을 보다가 이 조각만 무효로 하고
 * 픽셀 지도 페이지에만 'pixel-terrain' 알림을 보낸다 (src/pixel/main.tsx 가 받아 다시 부른다).
 */
export function pixelTerrain(): Plugin {
  const ID = 'virtual:pixel-terrain'
  const RESOLVED = '\0' + ID
  // 깊은 확대(한 픽셀 0.25 단위)의 다시 뿌린 기호 — Worker 가 그 단계에 처음 닿을 때 따로 받는 조각 (첫 조각을 키우지 않게)
  const FINE_ID = 'virtual:pixel-terrain-fine'
  const FINE = '\0' + FINE_ID
  const root = fileURLToPath(new URL('..', import.meta.url))
  const file = (p: string) => `${root}${p}`
  const landscape = readdirSync(file('src/data/landscape')).filter((f) => f.endsWith('.ts')).map((f) => file(`src/data/landscape/${f}`))
  const SOURCES = new Set([
    ...landscape,
    ...['index', 'locations', 'cards', 'continents', 'types'].map((n) => file(`src/data/${n}.ts`)),
    ...['terrain', 'landscape', 'landscapeGlyphs', 'scarpLine', 'geometry', 'geo', 'raster', 'glyphSpans', 'labels', 'detailScale'].map((n) => file(`src/map/${n}.ts`)),
    file('src/data/geo/coastlines.json'),
    file('src/data/geo/features.json'),
    file('scripts/pixel/terrain.mjs'),
  ])
  /** 한 번 뽑은 것을 두 조각이 나눠 쓴다 — 원본이 바뀌면 비운다 */
  let data: Promise<{ fine: unknown } & Record<string, unknown>> | null = null
  const extract = () =>
    (data ??= run(process.execPath, ['--import', file('scripts/qa/pixel-hooks.mjs'), file('scripts/pixel/terrain.mjs'), '--json'], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
    }).then((r) => JSON.parse(r.stdout)))
  return {
    name: 'pixel-terrain',
    resolveId: (id) => (id === ID ? RESOLVED : id === FINE_ID ? FINE : undefined),
    configureServer(server) {
      server.watcher.add([...SOURCES])
      server.watcher.on('change', (path) => {
        if (!SOURCES.has(path)) return
        data = null
        for (const env of Object.values(server.environments))
          for (const id of [RESOLVED, FINE]) {
            const m = env.moduleGraph.getModuleById(id)
            if (m) env.moduleGraph.invalidateModule(m)
          }
        server.ws.send({ type: 'custom', event: 'pixel-terrain' })
      })
    },
    async load(id) {
      if (id !== RESOLVED && id !== FINE) return
      // 따로 된 node — 셈하는 동안 개발 서버를 막지 않는다
      const { fine, ...base } = await extract()
      return `export default ${JSON.stringify(id === FINE ? fine : { ...base, fine: null })}`
    },
  }
}
