// 계층 검사 — C++ 소스의 #include 가 의존 규칙을 지키는지 본다. 어긴 줄을 모아 돌려준다.
// 규칙: 엔진은 게임플레이를 모른다. 게임 규칙·시뮬레이션은 GPU·화면을 모른다. 둘은 app/ 에서만 만난다.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** 모듈(경로 앞머리) → include 해도 되는 모듈들. 자기 모듈은 언제나 된다 */
const ALLOWED = {
  'engine/foundation': [],
  'engine/spatial': ['engine/foundation'],
  'engine/hud': ['engine/foundation'],
  'engine/gpu/webgpu': ['engine/foundation', 'engine/gpu/device.hpp'],
  'engine/gpu': ['engine/foundation'],
  'engine/platform': ['engine/foundation'],
  'engine/shader': ['engine/foundation', 'engine/gpu'],
  'engine/render': ['engine/foundation', 'engine/spatial', 'engine/hud', 'engine/gpu', 'engine/shader'],
  'gameplay/domain': ['engine/foundation', 'engine/spatial'],
  'gameplay/simulation': ['engine/foundation', 'engine/spatial', 'gameplay/domain'],
  'gameplay/input': ['engine/foundation', 'gameplay/domain', 'gameplay/simulation'],
  'gameplay/presentation': ['engine/', 'gameplay/domain', 'gameplay/simulation', 'gameplay/input'],
  // 조립 지점과 검증 프로브는 무엇이든 본다
  'app/': ['engine/', 'gameplay/', 'app/'],
  'tests/': ['engine/', 'gameplay/'],
}
/** GPU 백엔드 헤더는 조립 지점만 본다 — 엔진의 나머지와 게임은 engine/gpu/device.hpp 인터페이스만 쓴다 */
const BACKENDS = { 'engine/gpu/webgpu/': ['engine/gpu/webgpu/', 'app/'] }
/** 플랫폼 헤더를 직접 부를 수 있는 곳 */
const SYSTEM = {
  'webgpu/': ['engine/gpu/webgpu/'],
  'emscripten/': ['engine/platform/', 'engine/foundation/log.cpp', 'app/'],
}
const ROOTS = ['engine', 'gameplay', 'app', 'tests']

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.(?:cpp|hpp)$/.test(entry.name) ? [path] : []
  })
}

export function checkLayers(gameRoot) {
  const violations = []
  for (const root of ROOTS) {
    for (const path of sources(join(gameRoot, root))) {
      const file = relative(gameRoot, path).replaceAll('\\', '/')
      const module = Object.keys(ALLOWED).find((prefix) => file.startsWith(prefix))
      if (!module) {
        violations.push(`${file}: 규칙에 없는 모듈이다 — tools/check-layers.mjs 의 ALLOWED 에 의존 규칙을 더한다`)
        continue
      }
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          const include = line.match(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/)?.[1]
          if (!include) return
          const at = `${file}:${index + 1}`
          for (const [header, places] of Object.entries(SYSTEM))
            if (include.startsWith(header) && !places.some((place) => file.startsWith(place)))
              violations.push(`${at}: <${include}> 는 ${places.join(', ')} 에서만 부른다`)
          for (const [backend, places] of Object.entries(BACKENDS))
            if (include.startsWith(backend) && !places.some((place) => file.startsWith(place)))
              violations.push(`${at}: 백엔드 헤더 "${include}" 는 ${places.join(', ')} 에서만 본다`)
          if (!ROOTS.some((r) => include.startsWith(`${r}/`))) return
          const ok = include.startsWith(module) || ALLOWED[module].some((prefix) => include.startsWith(prefix))
          if (!ok) violations.push(`${at}: ${module} 은 "${include}" 를 볼 수 없다`)
        })
    }
  }
  return violations
}
