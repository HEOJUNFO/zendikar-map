// 셰이더 빌드 — WGSL 을 검사하고 C++ 헤더(engine::ShaderPackage 상수들)로 묻는다.
// WebGPU 는 WGSL 을 그대로 받는다. 런타임에 셰이더 파일을 읽지 않게 문자열로 묻고, 문법·타입 오류는 여기서(빌드 때) naga 로 잡는다 —
// 브라우저에서는 셰이더 오류가 나중에 장치 오류로만 온다.
// 여러 셰이더가 같이 쓰는 조각은 include 폴더에 두고 `#include "이름.wgsl"` 한 줄로 끼운다 (그 줄이 조각의 글로 바뀐다 — 조각 안의 #include 는 풀지 않는다).
// 사용: node shaderc.mjs <naga> <out.hpp> <namespace> <include 폴더> <a.wgsl> [b.wgsl …]
// 그리기 셰이더의 진입점은 vs_main · fs_main 이고, 파일 이름이 패키지 이름이 된다 (scene.wgsl → <namespace>::scene).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const [naga, outHeader, namespace, includeDir, ...inputs] = process.argv.slice(2)
if (!naga || !outHeader || !namespace || !includeDir || !inputs.length) {
  console.error('usage: shaderc.mjs <naga> <out.hpp> <namespace> <include dir> <shader.wgsl>…')
  process.exit(2)
}

const identifier = (name) => name.replace(/[^A-Za-z0-9_]/g, '_')
/** 원시 문자열 구분자 — 셰이더 글에 나오지 않는 것 */
const raw = (text) => {
  if (text.includes(')wgsl"')) throw new Error('셰이더에 원시 문자열 구분자가 들어 있다')
  return `R"wgsl(${text})wgsl"`
}

let body = ''
for (const input of inputs) {
  const text = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
  const source = text(input).replace(/^#include "([A-Za-z0-9_]+\.wgsl)"$/gm, (_, name) => text(join(includeDir, name)).trimEnd())
  // 조각을 끼운 글을 검사한다 (naga 는 #include 를 모른다) — 헤더 옆에 그 글을 적어 두고 넘긴다. 출력 파일 없이 부르면 검사만 한다
  const expanded = `${outHeader}.${basename(input)}`
  writeFileSync(expanded, source)
  try {
    execFileSync(naga, [expanded], { stdio: ['ignore', 'ignore', 'inherit'] })
  } catch {
    console.error(`shaderc: ${input} 에 오류가 있다 (조각을 끼운 글: ${expanded})`)
    process.exit(1)
  }
  // 그리기 셰이더는 vs_main · fs_main 을 갖는다. 컴퓨트만 든 모듈은 진입점을 파이프라인이 이름으로 고른다
  const draws = ['vs_main', 'fs_main'].filter((entry) => new RegExp(`\\bfn\\s+${entry}\\s*\\(`).test(source))
  if (draws.length === 1 || (draws.length === 0 && !source.includes('@compute'))) {
    console.error(`shaderc: ${input} 에는 vs_main 과 fs_main 이 함께 있거나 @compute 진입점이 있어야 한다`)
    process.exit(1)
  }
  const name = identifier(basename(input, '.wgsl'))
  body += `
inline constexpr engine::ShaderPackage ${name}{
    "${name}",
    {${raw(source)}},
};
`
}

writeFileSync(
  outHeader,
  `// tools/shaderc.mjs 가 만든 파일 — 직접 고치지 않는다 (원본: *.wgsl)
#pragma once

#include "engine/shader/shader_package.hpp"

namespace ${namespace} {
${body}
}  // namespace ${namespace}
`,
)
