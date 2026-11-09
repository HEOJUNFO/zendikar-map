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
 * 지역 상세(S9, scripts/pixel/childmaps.mjs)도 — 작은 `virtual:pixel-children`(범위·이름·칸 — Worker 와 주 스레드의 이름 배치가 함께 읽는다),
 * Worker 만 읽는 그림 조각 함수 표 `virtual:pixel-child-images`, 가장 깊은 단계의 타일이 그 범위에 닿을 때 받는 지역 상세의 그림 하나마다의 조각 `virtual:pixel-child-<id>-v<그림 번호>`.
 * 시점별 바탕(S6, scripts/pixel/periods.mjs)도 같은 셈에서 나온다 — 단계마다 Worker 가 그 시점의 타일을 처음 그릴 때 받는 `virtual:pixel-period-<단계>`,
 * 주 스레드의 작은 `virtual:pixel-times`(시점·단계마다 바뀐 자리 상자·장소 표시 바꿈·물 이름), 패널을 열 때 받는 `virtual:pixel-period-notes`('이 무렵').
 */
export function pixelTerrain(): Plugin {
  const ID = 'virtual:pixel-terrain'
  // 깊은 확대(한 픽셀 0.25 단위)의 다시 뿌린 기호 — Worker 가 그 단계에 처음 닿을 때 따로 받는 조각 (첫 조각을 키우지 않게)
  const FINE_ID = 'virtual:pixel-terrain-fine'
  /** 깊은 확대의 칸 조각 `virtual:pixel-terrain-fine-<cx>_<cy>` — FINE_ID 는 칸마다 그것을 불러오는 함수 표 (Worker 는 타일에 닿는 칸만 받는다) */
  const FINE_PART = 'virtual:pixel-terrain-fine-'
  const PERIOD = 'virtual:pixel-period-'
  const TIMES_ID = 'virtual:pixel-times'
  const NOTES_ID = 'virtual:pixel-period-notes'
  /** 패널의 '지도에 그린 지형' 가운데 그 무렵의 몫 (S22 — 단계마다 그 무렵에만 그린 지형과 숨긴 바탕 선) */
  const FEATURES_ID = 'virtual:pixel-period-features'
  /** 그 무렵 칠(흰 가루·백악·죽은 금속) 자리 — 이름 테두리 빛 (S23) */
  const WASH_ID = 'virtual:pixel-period-wash'
  const CHILDREN_ID = 'virtual:pixel-children'
  const CHILD_IMAGES_ID = 'virtual:pixel-child-images'
  const CHILD = 'virtual:pixel-child-'
  /** 지역 상세 손그림의 잉크 자리 (S16 — 주 스레드의 이름 배치만, 한가할 때 받는다) */
  const INK_ID = 'virtual:pixel-ink'
  /** 떠 있는 헤드론이 이름을 비키는 셈의 입력 (S20 — 주 스레드만, 한가할 때 받는다) */
  const HEDRONS_ID = 'virtual:pixel-hedrons'
  /** 패널의 바탕 지형 목록 (S25 — 대륙 지형 파일의 좌표를 패널 조각에 싣지 않게, src/pixel/panel/landscapeList.ts) */
  const LANDSCAPE_ID = 'virtual:pixel-landscape-panel'
  /** 봉우리 모양 (객체 다듬기 A1 — 한 픽셀 ≤ 1 단위의 타일을 처음 그릴 때 Worker 가 받는다, 첫 조각을 키우지 않게) */
  const PEAKS_ID = 'virtual:pixel-terrain-peaks'
  const OWN = new Set([ID, FINE_ID, TIMES_ID, NOTES_ID, FEATURES_ID, WASH_ID, CHILDREN_ID, CHILD_IMAGES_ID, INK_ID, HEDRONS_ID, LANDSCAPE_ID, PEAKS_ID])
  const root = fileURLToPath(new URL('..', import.meta.url))
  const file = (p: string) => `${root}${p}`
  const landscape = readdirSync(file('src/data/landscape')).filter((f) => f.endsWith('.ts')).map((f) => file(`src/data/landscape/${f}`))
  const periods = readdirSync(file('src/data/periods')).filter((f) => f.endsWith('.ts')).map((f) => file(`src/data/periods/${f}`))
  const childArt = readdirSync(file('src/map/childmaps')).filter((f) => f.endsWith('.ts')).map((f) => file(`src/map/childmaps/${f}`))
  const SOURCES = new Set([
    ...landscape,
    ...periods,
    ...childArt,
    ...['index', 'locations', 'cards', 'continents', 'types', 'sagas', 'timeline', 'extraSets', 'landFace', 'childMaps'].map((n) => file(`src/data/${n}.ts`)),
    ...['terrain', 'landscape', 'landscapeGlyphs', 'scarpLine', 'geometry', 'geo', 'raster', 'glyphSpans', 'labels', 'detailScale', 'childDetail', 'childMapSizes', 'hedronYield'].map((n) => file(`src/map/${n}.ts`)),
    ...['period', 'periodTerrain', 'periodGlyphs', 'periodClip', 'periodTypes'].map((n) => file(`src/map/${n}.ts`)),
    file('src/data/geo/coastlines.json'),
    file('src/data/geo/features.json'),
    file('scripts/pixel/terrain.mjs'),
    file('scripts/pixel/periods.mjs'),
    file('scripts/pixel/childmaps.mjs'),
    file('scripts/pixel/childink.mjs'),
    file('scripts/pixel/figures.mjs'),
  ])
  /** 한 번 뽑은 것을 두 조각이 나눠 쓴다 — 원본이 바뀌면 비운다 */
  type Period = { worker: unknown; main: unknown; notes: unknown; panel: unknown; wash: unknown }
  type Children = { meta: { maps: { id: string }[] }; images: Record<string, string[]>; ink: unknown }
  let data: Promise<{ fine: unknown; periods: Record<string, Period>; children: Children } & Record<string, unknown>> | null = null
  const extract = () =>
    (data ??= run(process.execPath, ['--import', file('scripts/qa/pixel-hooks.mjs'), file('scripts/pixel/terrain.mjs'), '--json'], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
    }).then((r) => JSON.parse(r.stdout)))
  return {
    name: 'pixel-terrain',
    resolveId: (id) => (OWN.has(id) || id.startsWith(PERIOD) || id.startsWith(CHILD) || id.startsWith(FINE_PART) ? '\0' + id : undefined),
    configureServer(server) {
      server.watcher.add([...SOURCES])
      server.watcher.on('change', (path) => {
        if (!SOURCES.has(path)) return
        data = null
        for (const env of Object.values(server.environments))
          for (const m of env.moduleGraph.idToModuleMap.values())
            if (m.id?.startsWith('\0virtual:pixel-terrain') || m.id?.startsWith('\0virtual:pixel-period') || m.id?.startsWith('\0virtual:pixel-child') || m.id === '\0' + TIMES_ID || m.id === '\0' + INK_ID || m.id === '\0' + HEDRONS_ID || m.id === '\0' + FEATURES_ID || m.id === '\0' + WASH_ID || m.id === '\0' + LANDSCAPE_ID || m.id === '\0' + PEAKS_ID) env.moduleGraph.invalidateModule(m)
        server.ws.send({ type: 'custom', event: 'pixel-terrain' })
      })
    },
    async load(id) {
      if (!id.startsWith('\0')) return
      const name = id.slice(1)
      if (!OWN.has(name) && !name.startsWith(PERIOD) && !name.startsWith(CHILD) && !name.startsWith(FINE_PART)) return
      if (name === LANDSCAPE_ID) {
        // 지형 셈이 필요 없는 작은 목록 — 따로 된 node 를 기다리지 않는다 (지형 파일은 타입만 가져온다)
        const v = `?v=${Date.now()}`
        const { panelLandscape, LANDSCAPE_FILES } = await import(pathToFileURL(file('src/pixel/panel/landscapeList.ts')).href + v)
        const files = await Promise.all(
          (LANDSCAPE_FILES as [string, string][]).map(async ([c, n]) => [c, (await import(pathToFileURL(file(`src/data/landscape/${n}.ts`)).href + v)).landscape]),
        )
        return `export default ${JSON.stringify(panelLandscape(files))}`
      }
      // 따로 된 node — 셈하는 동안 개발 서버를 막지 않는다
      const { fine: _fine, fineCells, periods, children, landSizes, singleHedrons, hedronYield, ...base } = await extract()
      const cells = fineCells as { cell: number; parts: Record<string, unknown> }
      if (name === FINE_ID) {
        const loaders = Object.keys(cells.parts).map((k) => `${JSON.stringify(k)}: () => import(${JSON.stringify(FINE_PART + k)})`).join(',\n')
        return `export default { cell: ${cells.cell}, parts: {\n${loaders}\n} }`
      }
      if (name.startsWith(FINE_PART)) {
        const k = name.slice(FINE_PART.length)
        // 비어 있는 칸은 표에 없다 — 표에 없는 칸을 부르면 빈 조각
        return `export default ${JSON.stringify(cells.parts[k] ?? { level: 1, g: [] })}`
      }
      if (name === HEDRONS_ID) return `export default ${JSON.stringify(hedronYield)}`
      if (name === CHILDREN_ID) return `export default ${JSON.stringify(children.meta)}`
      if (name === INK_ID) return `export default ${JSON.stringify(children.ink)}`
      if (name === CHILD_IMAGES_ID) {
        // 지역 상세마다 그림 조각을 불러오는 함수 (그 범위의 타일을 처음 그릴 때만 받는다 — Worker 만 부른다)
        // 그림 번호마다 따로 — 보기 하나의 타일은 그 보기의 그림만 받는다
        const loaders = children.meta.maps
          .map((m: { id: string }) => `${JSON.stringify(m.id)}: [${children.images[m.id].map((_: string, k: number) => `() => import(${JSON.stringify(`${CHILD}${m.id}-v${k}`)})`).join(', ')}]`)
          .join(',\n')
        return `export default {\n${loaders}\n}`
      }
      if (name.startsWith(CHILD)) {
        const m = /^(.+)-v(\d+)$/.exec(name.slice(CHILD.length))
        const img = m && children.images[m[1]]?.[Number(m[2])]
        if (img === undefined || img === null) this.error(`${name}: 지역 상세의 그 그림이 없다 (scripts/pixel/childmaps.mjs — virtual:pixel-child-<id>-v<그림 번호>)`)
        return `export default ${JSON.stringify(img)}`
      }
      const levels = Object.keys(periods).map(Number)
      let out: unknown
      if (name === ID) out = { ...base, fine: null, ps: undefined, ss: undefined }
      // 봉우리 모양과 바다 표시의 모양 (R42a)
      else if (name === PEAKS_ID) return `export default ${JSON.stringify(base.ps)}\nexport const ss = ${JSON.stringify(base.ss)}`
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
          landSizes,
          singleHedrons,
        }
      } else if (name === NOTES_ID) out = Object.fromEntries(levels.map((L) => [L, periods[L].notes]))
      else if (name === FEATURES_ID) out = Object.fromEntries(levels.map((L) => [L, periods[L].panel]))
      else if (name === WASH_ID) out = Object.fromEntries(levels.map((L) => [L, periods[L].wash]))
      else {
        const L = name.slice(PERIOD.length)
        if (!periods[L]) this.error(`${name}: 단계 ${L} 의 시점별 바탕이 없다 (scripts/pixel/periods.mjs 의 periodLevels — src/pixel/tiles/worker.ts 의 PERIOD_CHUNKS 에 그 단계를 더한다)`)
        out = periods[L].worker
      }
      return `export default ${JSON.stringify(out)}`
    },
  }
}
