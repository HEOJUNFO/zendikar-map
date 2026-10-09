// 게임 검증 — `pnpm game:test` (프로브는 `pnpm game:build` 가 만든다)
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkLayers } from '../tools/check-layers.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const buildDir = join(root, 'build', 'game-wasm64')

/** C++ 프로브를 Node 로 돌린다 — 실패한 항목은 프로브가 찍는다 */
function probe(name) {
  const path = join(buildDir, `${name}.cjs`)
  assert.ok(existsSync(path), `${name} 프로브가 없다 — pnpm game:build 를 먼저 돌린다`)
  const result = spawnSync(process.execPath, [path], { encoding: 'utf8' })
  assert.equal(result.status, 0, `${name} 실패:\n${result.stdout}${result.stderr}`)
}

test('계층: 엔진은 게임플레이를 모르고, 시뮬레이션은 GPU 를 모르고, 백엔드는 app 만 안다', () => {
  assert.deepEqual(checkLayers(join(root, 'game')), [])
})

test('엔진: LBVH(손 계산 장면과 전수 검사), 투영 행렬, HUD 배치와 상태별 재조립', () => probe('engine_probe'))

test('게임플레이: 리듬 판정, 히트스캔, 포인터 입력 해석 (GPU 없이)', () => probe('sim_probe'))

test('HUD: 세계에서 상태가, 상태에서 화면 요소가 정해진다', () => probe('presentation_probe'))
