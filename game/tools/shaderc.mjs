// 셰이더 빌드 — WGSL 을 검사하고 C++ 헤더(engine::ShaderPackage 상수들)로 묻는다.
// WebGPU 는 WGSL 을 그대로 받는다. 런타임에 셰이더 파일을 읽지 않게 문자열로 묻고, 문법·타입 오류는 여기서(빌드 때) naga 로 잡는다 —
// 브라우저에서는 셰이더 오류가 나중에 장치 오류로만 온다.
// 사용: node shaderc.mjs <naga> <out.hpp> <namespace> <a.wgsl> [b.wgsl …]
// 그리기 셰이더의 진입점은 vs_main · fs_main 이고, 파일 이름이 패키지 이름이 된다 (scene.wgsl → <namespace>::scene).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const [naga, outHeader, namespace, ...inputs] = process.argv.slice(2)
if (!naga || !outHeader || !namespace || !inputs.length) {
  console.error('usage: shaderc.mjs <naga> <out.hpp> <namespace> <shader.wgsl>…')
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
  try {
    // 출력 파일 없이 부르면 검사만 한다
    execFileSync(naga, [input], { stdio: ['ignore', 'ignore', 'inherit'] })
  } catch {
    console.error(`shaderc: ${input} 에 오류가 있다`)
    process.exit(1)
  }
  const source = readFileSync(input, 'utf8').replaceAll('\r\n', '\n')
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
