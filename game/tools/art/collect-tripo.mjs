// Tripo Studio MCP 가 내려받아 둔 GLB 를 작업 폴더로 옮긴다 — 예산(삼각형·텍스처)을 넘으면 줄이고, manifest.json 을 같이 적는다.
// 입력은 workflow 목록(JSON — tripo_list_workflows 의 workflows 배열을 저장한 것). 원본은 MCP 의 보관 폴더(%LOCALAPPDATA%/TripoStudioMCP/archive)에 그대로 남는다.
// 사용: node game/tools/art/collect-tripo.mjs <작업 폴더 (예: game/art-work/shop-room)> <workflows.json> [--large 이름,이름,…]
//   --large 에 적은 소품은 큰 가구 예산(4,000 삼각형), 나머지는 작은 소품 예산(1,500). 텍스처는 2K 까지 둔다 (가구 텍스처 배열이 2048²).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { optimizeGlb } from '../../../scripts/tripo-studio/optimize-glb.mjs'
const args = process.argv.slice(2)
const large = new Set(args.includes('--large') ? args.splice(args.indexOf('--large'), 2)[1].split(',') : [])
const [work, list] = args
if (!work || !list) throw new Error('사용: collect-tripo.mjs <작업 폴더> <workflows.json> [--large 이름,…]')
const archive = join(process.env.LOCALAPPDATA, 'TripoStudioMCP', 'archive', 'items')
const rows = []
for (const workflow of JSON.parse(readFileSync(list, 'utf8'))) {
  if (workflow.status !== 'succeeded') continue
  const item = workflow.results[0].gallery_item_ids[0], raw = join(archive, item, 'model-1.glb')
  if (!existsSync(raw)) { rows.push({ name: workflow.name, error: '보관 폴더에 원본이 없다' }); continue }
  const dir = join(work, 'generated', workflow.name), preset = large.has(workflow.name) ? 'large-prop' : 'prop'
  mkdirSync(dir, { recursive: true })
  try {
    const report = await optimizeGlb(raw, join(dir, `${workflow.name}.glb`), { preset, textureSize: 2048, overwrite: true })
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ name: workflow.name, workflowId: workflow.workflow_id, projectId: workflow.results[0].project_ids[0], galleryItem: item, inputs: ['front.png', 'back.png'], preset, report }, null, 2) + '\n')
    rows.push({ name: workflow.name, triangles: `${report.before.triangles}→${report.after.triangles}`, texture: `${report.before.textures[0]?.width}→${report.after.textures[0]?.width}` })
  } catch (error) { rows.push({ name: workflow.name, error: String(error.message).slice(0, 90) }) }
}
console.table(rows)
