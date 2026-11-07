import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
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
 *
 * 시점별 바탕(S6, scripts/pixel/periods.mjs)도 같은 셈에서 나온다 — 단계마다 Worker 가 그 시점의 타일을 처음 그릴 때 받는 `virtual:pixel-period-<단계>`,
 * 주 스레드의 작은 `virtual:pixel-times`(시점·단계마다 바뀐 자리 상자·장소 표시 바꿈·물 이름), 패널을 열 때 받는 `virtual:pixel-period-notes`('이 무렵').
 */
export function pixelTerrain(): Plugin {
  const ID = 'virtual:pixel-terrain'
  // 깊은 확대(한 픽셀 0.25 단위)의 다시 뿌린 기호 — Worker 가 그 단계에 처음 닿을 때 따로 받는 조각 (첫 조각을 키우지 않게)
  const FINE_ID = 'virtual:pixel-terrain-fine'
  const PERIOD = 'virtual:pixel-period-'
  const TIMES_ID = 'virtual:pixel-times'
  const NOTES_ID = 'virtual:pixel-period-notes'
  const OWN = new Set([ID, FINE_ID, TIMES_ID, NOTES_ID])
  const root = fileURLToPath(new URL('..', import.meta.url))
  const file = (p: string) => `${root}${p}`
  const landscape = readdirSync(file('src/data/landscape')).filter((f) => f.endsWith('.ts')).map((f) => file(`src/data/landscape/${f}`))
  const periods = readdirSync(file('src/data/periods')).filter((f) => f.endsWith('.ts')).map((f) => file(`src/data/periods/${f}`))
  const SOURCES = new Set([
    ...landscape,
    ...periods,
    ...['index', 'locations', 'cards', 'continents', 'types', 'sagas', 'timeline', 'extraSets', 'landFace'].map((n) => file(`src/data/${n}.ts`)),
    ...['terrain', 'landscape', 'landscapeGlyphs', 'scarpLine', 'geometry', 'geo', 'raster', 'glyphSpans', 'labels', 'detailScale'].map((n) => file(`src/map/${n}.ts`)),
    ...['period', 'periodTerrain', 'periodGlyphs', 'periodClip', 'periodTypes'].map((n) => file(`src/map/${n}.ts`)),
    file('src/data/geo/coastlines.json'),
    file('src/data/geo/features.json'),
    file('scripts/pixel/terrain.mjs'),
    file('scripts/pixel/periods.mjs'),
  ])
  /** 한 번 뽑은 것을 두 조각이 나눠 쓴다 — 원본이 바뀌면 비운다 */
  type Period = { worker: unknown; main: unknown; notes: unknown }
  let data: Promise<{ fine: unknown; periods: Record<string, Period> } & Record<string, unknown>> | null = null
  const extract = () =>
    (data ??= run(process.execPath, ['--import', file('scripts/qa/pixel-hooks.mjs'), file('scripts/pixel/terrain.mjs'), '--json'], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
    }).then((r) => JSON.parse(r.stdout)))
  return {
    name: 'pixel-terrain',
    resolveId: (id) => (OWN.has(id) || id.startsWith(PERIOD) ? '\0' + id : undefined),
    configureServer(server) {
      server.watcher.add([...SOURCES])
      server.watcher.on('change', (path) => {
        if (!SOURCES.has(path)) return
        data = null
        for (const env of Object.values(server.environments))
          for (const m of env.moduleGraph.idToModuleMap.values()) if (m.id?.startsWith('\0virtual:pixel-terrain') || m.id?.startsWith('\0virtual:pixel-period') || m.id === '\0' + TIMES_ID) env.moduleGraph.invalidateModule(m)
        server.ws.send({ type: 'custom', event: 'pixel-terrain' })
      })
    },
    async load(id) {
      if (!id.startsWith('\0')) return
      const name = id.slice(1)
      if (!OWN.has(name) && !name.startsWith(PERIOD)) return
      // 따로 된 node — 셈하는 동안 개발 서버를 막지 않는다
      const { fine, periods, ...base } = await extract()
      const levels = Object.keys(periods).map(Number)
      let out: unknown
      if (name === ID) out = { ...base, fine: null }
      else if (name === FINE_ID) out = fine
      else if (name === TIMES_ID) {
        // 시점(보이는 것만)과 그 단계 — src/data/timeline.ts 의 TIMES. 단계마다의 주 스레드 몫
        const { SHOWN_TIMES } = await import(pathToFileURL(file('src/data/timeline.ts')).href)
        out = {
          times: SHOWN_TIMES.map((t: { t: number; name: string; nameEn: string; years: string; button: string; periodLevel: number }) => ({
            t: t.t,
            name: t.name,
            nameEn: t.nameEn,
            years: t.years,
            button: t.button,
            level: t.periodLevel,
          })),
          levels: Object.fromEntries(levels.map((L) => [L, periods[L].main])),
        }
      } else if (name === NOTES_ID) out = Object.fromEntries(levels.map((L) => [L, periods[L].notes]))
      else {
        const L = name.slice(PERIOD.length)
        if (!periods[L]) this.error(`${name}: 단계 ${L} 의 시점별 바탕이 없다 (scripts/pixel/periods.mjs 의 periodLevels — src/pixel/tiles/worker.ts 의 PERIOD_CHUNKS 에 그 단계를 더한다)`)
        out = periods[L].worker
      }
      return `export default ${JSON.stringify(out)}`
    },
  }
}
