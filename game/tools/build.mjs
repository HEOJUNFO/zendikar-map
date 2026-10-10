// 게임(C++ → wasm64) 빌드 — `pnpm game:build [--debug] [--clean] [--client] [--audio]`
// 필요한 것: Emscripten 6 (EMSDK 환경 변수 또는 tools/emsdk), CMake, Ninja, naga-cli (NAGA 또는 tools/naga, PATH)
// 생성물: game/host/generated/ (VeilBind 클라이언트·Worker, Emscripten 글루, policy), public/wasm/game-client.wasm,
//         build/game-wasm64/ (검증 프로브 포함)
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { delimiter, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const args = new Set(process.argv.slice(2))
const debug = args.has('--debug')
const win = process.platform === 'win32'
const exe = (name) => (win ? `${name}.exe` : name)

function fail(message) {
  console.error(`game:build — ${message}`)
  process.exit(1)
}

/** PATH 에서 실행 파일 찾기 */
function onPath(name) {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir && existsSync(join(dir, exe(name)))) return join(dir, exe(name))
  }
  return null
}

/** emsdk 안의 node/python 은 버전 이름 폴더 밑에 있다 */
function firstChild(dir, ...rest) {
  if (!existsSync(dir)) return null
  for (const name of readdirSync(dir)) {
    const candidate = join(dir, name, ...rest)
    if (existsSync(candidate)) return candidate
  }
  return null
}

const emsdkFound = [process.env.EMSDK, join(root, 'tools', 'emsdk')].find((dir) => dir && existsSync(join(dir, 'upstream', 'emscripten')))
if (!emsdkFound) fail('Emscripten 을 찾지 못했다. EMSDK 환경 변수를 주거나 tools/emsdk 에 emsdk 를 둔다 (Emscripten 6 이상)')
// 링크(정션)면 실제 경로로 — Emscripten 은 경로가 달라지면 설정이 바뀐 것으로 보고 캐시(시스템 라이브러리)를 통째로 비운다.
// 다른 프로젝트와 emsdk 를 나눠 쓸 때 서로의 캐시를 지우지 않게 한다
const emsdk = realpathSync.native(emsdkFound)
const emscripten = join(emsdk, 'upstream', 'emscripten')
const toolchain = join(emscripten, 'cmake', 'Modules', 'Platform', 'Emscripten.cmake')

const cmake =
  onPath('cmake') ??
  [
    'C:/Program Files/CMake/bin/cmake.exe',
    // Visual Studio 에 딸려 오는 CMake
    ...['2022', '2026'].flatMap((year) =>
      ['Community', 'Professional', 'Enterprise', 'BuildTools'].map(
        (edition) => `C:/Program Files/Microsoft Visual Studio/${year}/${edition}/Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe`,
      ),
    ),
  ].find((path) => existsSync(path))
if (!cmake) fail('CMake 를 찾지 못했다 (PATH 에 cmake 를 둔다)')
const ninja = onPath('ninja')
if (!ninja) fail('Ninja 를 찾지 못했다 (PATH 에 ninja 를 둔다)')
const naga = [process.env.NAGA, join(root, 'tools', 'naga', 'bin', exe('naga')), onPath('naga')].find((path) => path && existsSync(path))
if (!naga) fail('naga 를 찾지 못했다 — cargo install naga-cli --root tools/naga')

// emsdk_env 가 잡아 주는 환경 — 셸을 거치지 않고 여기서 맞춘다
const emNode = firstChild(join(emsdk, 'node'), 'bin', exe('node'))
const emPython = firstChild(join(emsdk, 'python'), exe('python'))
const env = {
  ...process.env,
  EMSDK: emsdk,
  EM_CONFIG: join(emsdk, '.emscripten'),
  ...(emNode ? { EMSDK_NODE: emNode } : {}),
  ...(emPython ? { EMSDK_PYTHON: emPython } : {}),
  PATH: [emscripten, join(emsdk, 'upstream', 'bin'), process.env.PATH].join(delimiter),
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: root, env, stdio: 'inherit' })
  if (result.error) fail(`${command}: ${result.error.message}`)
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const buildDir = join(root, 'build', debug ? 'game-wasm64-debug' : 'game-wasm64')
if (args.has('--clean')) {
  rmSync(buildDir, { recursive: true, force: true })
  rmSync(join(root, 'game', 'host', 'generated'), { recursive: true, force: true })
}

run(cmake, [
  '-S', join(root, 'game'),
  '-B', buildDir,
  '-G', 'Ninja',
  `-DCMAKE_MAKE_PROGRAM=${ninja}`,
  `-DCMAKE_TOOLCHAIN_FILE=${toolchain}`,
  `-DCMAKE_BUILD_TYPE=${debug ? 'Debug' : 'Release'}`,
  `-DZK_NAGA=${naga}`,
])
// --client: 게임 본체(WASM)만 — 에셋(팩·구운 빛)을 고치는 다른 작업이 한창일 때 코드만 갈아 끼운다
// --audio: 소리의 프로브와 미리듣기(audio_probe · audio_preview)만 — 뱅크와 곡을 다시 만들어 들어 볼 때. --client 와 함께 줄 수 있다
// --target <이름>: 그 타깃도 (여러 번 줄 수 있다 — 검증 프로브 하나만 다시 지을 때: --target sim_probe). 모두 이 스크립트가 맞춘 같은 Emscripten 환경으로 짓는다
const argv = process.argv.slice(2)
const named = argv.flatMap((arg, i) => (arg === '--target' && argv[i + 1] ? [argv[i + 1]] : []))
const targets = [...(args.has('--client') ? ['game_client'] : []), ...(args.has('--audio') ? ['audio_probe', 'audio_preview'] : []), ...named]
run(cmake, ['--build', buildDir, ...(targets.length ? ['--target', ...targets] : [])])
