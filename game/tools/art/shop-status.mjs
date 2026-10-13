// 상점 방 소품 작업의 체크리스트(game/art-work/shop-room/STATUS.md)를 실제 파일 상태에서 다시 적는다.
//   생성 = generated/<소품>/<소품>.glb 가 있다 · 손질 = content/merchant-props/models/<이름>.zkmodel 이 있다
//   배치 = concepts/props/<소품>/DONE 이 있다 (방에 놓고 뷰어에서 확인한 뒤 손으로 둔다)
// 소품마다의 메모는 notes.json. 사용: node game/tools/art/shop-status.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
const work = 'game/art-work/shop-room', runtime = 'game/gameplay/content/merchant-props/models'
const order = ['main-counter', 'merchant-chair', 'examination-table', 'crystal-display-table', 'low-stool', 'merchant-niche-arch', 'wall-shelf-alcove', 'kor-window-module', 'rune-pillar', 'ceiling-rib', 'indigo-floor-runner', 'hanging-banner', 'wall-sconce', 'amber-crystal-lamp', 'memory-crystal', 'ledger-books', 'bronze-bowl', 'ceramic-urn', 'storage-chest', 'supply-barrel', 'memory-card-single', 'memory-card-deck', 'memory-card-spread', 'memory-card-box']
// 게임 안의 이름 (merchant-props.txt 의 prop 이름) — 콘셉트 폴더 이름과 다른 것만
const runtimeName = { 'main-counter': 'counter' }
const notes = JSON.parse(readFileSync(`${work}/notes.json`, 'utf8'))
const folders = readdirSync(`${work}/concepts/props`, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
if (folders.length !== order.length || folders.some((name) => !order.includes(name))) throw new Error('concepts/props 의 폴더가 목록과 다르다')
const mark = (b) => (b ? '✅' : '⬜')
const count = { generated: 0, prepared: 0, placed: 0 }
const rows = order.map((name) => {
  const glb = existsSync(`${work}/generated/${name}/${name}.glb`)
  const manifest = existsSync(`${work}/generated/${name}/manifest.json`) ? JSON.parse(readFileSync(`${work}/generated/${name}/manifest.json`, 'utf8')) : null
  const prepared = existsSync(`${runtime}/${(runtimeName[name] ?? name).replaceAll('-', '_')}.zkmodel`)
  const placed = existsSync(`${work}/concepts/props/${name}/DONE`)
  const triangles = manifest?.report?.after?.triangles ?? manifest?.verifiedOutput?.triangles
  count.generated += glb; count.prepared += prepared; count.placed += placed
  return `| ${name} | ${mark(glb)} | ${mark(prepared)} | ${mark(placed)} | ${[triangles ? `${triangles.toLocaleString('en')} 삼각형` : '', notes[name] ?? ''].filter(Boolean).join(' · ')} |`
})
writeFileSync(`${work}/STATUS.md`, `# 상점 방 소품 메시화 진행

콘셉트 그림(\`concepts/props/<소품>/front.png\`·\`back.png\`)을 Tripo Studio 로 메시로 만들어 상점 방에 넣는 작업의 체크리스트.
이 파일은 \`node game/tools/art/shop-status.mjs\` 가 실제 파일에서 다시 적는다 — 손으로 고치지 않는다 (메모는 \`notes.json\`).
**생성에는 front·back 두 장만 쓴다** (사용자 결정 2026-10-13 — left·right 는 넣지 않는다).

단계: **생성**(Tripo 에서 받아 \`generated/\` 에) → **손질**(게임 형식으로 \`content/merchant-props/\` 에) → **배치**(방에 놓고 뷰어에서 확인 — 끝나면 그 콘셉트 폴더에 \`DONE\`)

| 소품 | 생성 | 손질 | 배치 | 메모 |
| --- | :-: | :-: | :-: | --- |
${rows.join('\n')}

생성 ${count.generated} / ${order.length} · 손질 ${count.prepared} / ${order.length} · 배치 ${count.placed} / ${order.length}
`)
console.log(`생성 ${count.generated}, 손질 ${count.prepared}, 배치 ${count.placed} / ${order.length}`)
