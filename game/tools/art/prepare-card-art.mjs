// Prepare the approved card-image set; gameplay mechanics are a separate stage.
// node game/tools/art/prepare-card-art.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, encodeQoi, fitInside } from '../imagec.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const folder = join(root, 'gameplay/content/images/cards')
const out = resolve(root, '../build/shop-card-art')
const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'))
const rejectedV1 = JSON.parse(readFileSync(join(folder, 'prepared/asset-index-v1.json'), 'utf8')).records.filter(record => record.source.startsWith('art-'))
const rejectedSources = new Set(rejectedV1.map(record => record.source))
const rejectedHashes = new Set(rejectedV1.map(record => record.sourceSha256))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const records = []
assert.equal(manifest.cards.length, 12)
assert.ok(manifest.artRevision >= 2, 'the rejected first illustration batch cannot be selected')
assert.ok(manifest.frameRevision >= 2, 'the replaced black-panel frames cannot be selected')
assert.equal(new Set(manifest.cards.map(card => card.id)).size, 12)
assert.deepEqual(manifest.cards.filter(card => card.essential).map(card => card.id), ['kor-updraft', 'roil-step'])
assert.equal(manifest.layout.textBakedIntoImages, false)
assert.deepEqual(manifest.frameOrder, ['silver', 'gold', 'prism'])
mkdirSync(join(folder, 'prepared'), { recursive: true })
mkdirSync(out, { recursive: true })
for (const item of [...manifest.frames, ...manifest.cards]) {
  const source = join(folder, item.source)
  const bytes = readFileSync(source)
  const decoded = decodePng(bytes)
  const alpha = (x, y) => decoded.rgba[(Math.floor(y * decoded.height) * decoded.width + Math.floor(x * decoded.width)) * 4 + 3]
  const frame = Boolean(item.tier && !item.id)
  if (frame) {
    assert.equal(decoded.width * 3, decoded.height * 2, `${item.source}: portrait 2:3`)
    for (const x of [.12, .5, .88]) for (const y of [.3, .4, .5])
      assert.ok(alpha(x, y) <= 2, `${item.source}: artwork aperture must be truly transparent`)
    for (const y of [.12, .68, .82]) assert.ok(alpha(.5, y) >= 240, `${item.source}: text panels must remain opaque`)
    assert.equal(alpha(.001, .001), 0, `${item.source}: outside corner transparency`)
  } else {
    assert.ok(!rejectedSources.has(item.source) && !rejectedHashes.has(digest(bytes)), `${item.source}: rejected v1 image must not re-enter the active set`)
    assert.ok(decoded.width / decoded.height > 1.7 && decoded.width / decoded.height < 1.85, `${item.source}: landscape illustration`)
    assert.ok(manifest.frameOrder.includes(item.tier))
    assert.ok(typeof item.name === 'string' && !item.name.includes('\n') && item.effectLines.length <= 2)
    assert.equal(alpha(.5, .5), 255, `${item.source}: opaque illustration`)
  }
  const bitmap = fitInside(decoded, frame ? 512 : 640, frame ? 768 : 360)
  const packed = encodeQoi(bitmap)
  assert.equal(Buffer.from(packed.subarray(0, 4)).toString('ascii'), 'qoif')
  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength)
  assert.equal(view.getUint32(4), bitmap.width)
  assert.equal(view.getUint32(8), bitmap.height)
  assert.equal(packed[12], 4, 'QOI preserves RGBA')
  writeFileSync(join(folder, item.prepared), packed)
  records.push({ source: item.source, sourcePixels: [decoded.width, decoded.height], sourceSha256: digest(bytes),
    prepared: item.prepared, preparedPixels: [bitmap.width, bitmap.height], preparedBytes: packed.length, preparedSha256: digest(packed) })
}
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const img = file => `/game/gameplay/content/images/cards/${file}`
const font = readFileSync(resolve(root, '../node_modules/pretendard/dist/web/static/woff/Pretendard-Regular.woff')).toString('base64')
const labels = { silver: '실버', gold: '골드', prism: '프리즘' }
const cards = manifest.cards.map((card, index) => `<article class="card" data-card="${esc(card.id)}" data-tier="${esc(card.tier)}">
  <img class="art" src="${img(card.source)}" alt="${esc(card.name)} 일러스트">
  <img class="frame" src="${img(manifest.frames.find(frame => frame.tier === card.tier).source)}" alt="${labels[card.tier]} 프레임">
  <div class="slot">${String(index + 1).padStart(2, '0')} / ${labels[card.tier]}</div>
  <div class="title" title="${esc(card.name)}">${esc(card.name)}</div>
  <div class="effect">${card.effectLines.map(esc).join('<br>')}</div>
  <div class="price">${card.price === null ? '가격 미정' : `${card.price} 골드`}</div>
  <div class="status">${card.essential ? '기존 이동 증강 유지' : '승인된 증강 설계'}</div>
</article>`).join('\n')
const rectCSS = (name, rect) => `.${name}{left:${rect.x * 100}%;top:${rect.y * 100}%;width:${rect.width * 100}%;height:${rect.height * 100}%}`
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>젠디카르 카드 이미지 리소스</title>
<style>@font-face{font-family:CardPreview;src:url(data:font/woff;base64,${font}) format('woff');font-weight:100 900;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#e9e2d3;color:#2b352f;font-family:CardPreview,sans-serif;padding:28px}
h1{font-size:24px;font-weight:400;margin:0 0 8px}p{color:#5a645d;margin:0 0 24px;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(4,288px);gap:22px 20px;justify-content:center}.card{position:relative;width:288px;height:432px;font-variant-numeric:tabular-nums}
.card>*{position:absolute}.art{object-fit:cover;${Object.entries({left:manifest.layout.artRect.x,top:manifest.layout.artRect.y,width:manifest.layout.artRect.width,height:manifest.layout.artRect.height}).map(([key,value])=>`${key}:${value*100}%`).join(';')}}
.frame{inset:0;width:100%;height:100%;object-fit:fill}.slot{font-size:11px;color:#5b5142;line-height:1.3}.title{font-size:16px;line-height:1.15;white-space:nowrap;color:#243b31}.effect{font-size:13px;line-height:1.65;color:#34382f}.price{font-size:17px;line-height:1.1;color:#65440e}.status{font-size:12px;line-height:1.2;text-align:center;color:#32594e}
${rectCSS('slot',manifest.layout.slotRect)}${rectCSS('title',manifest.layout.titleRect)}${rectCSS('effect',manifest.layout.effectRect)}${rectCSS('price',manifest.layout.priceRect)}${rectCSS('status',manifest.layout.statusRect)}
</style><h1>기억 인장 · 이미지 리소스 12종</h1><p>프레임과 중앙 그림은 별도 파일입니다. 아래 글자와 가격은 합성 미리보기이며 이미지에 구워져 있지 않습니다.</p><main class="grid">${cards}</main>
<script>window.cardPreviewReady=(async()=>{await document.fonts.load('16px CardPreview');const context=document.createElement('canvas').getContext('2d');context.font='16px CardPreview';for(const title of document.querySelectorAll('.title')){const width=context.measureText(title.textContent).width;const size=Math.min(16,16*(title.clientWidth-4)/width);if(size<12)throw new Error('제목 최소 글자 크기 미달: '+title.textContent);title.style.fontSize=size.toFixed(2)+'px';}})();</script></html>`
writeFileSync(join(out, 'preview.html'), html)
writeFileSync(join(folder, 'prepared/asset-index.json'), JSON.stringify({ version:1, records }, null, 2) + '\n')
writeFileSync(join(out, 'asset-validation.json'), JSON.stringify({ verifiedAt:new Date().toISOString(), result:'PASS',
  scope:'15 image assets, source alpha contracts, QOI headers, two retained mobility designs, card layout manifest',
  sourceManifestSha256:digest(readFileSync(join(folder, 'manifest.json'))), frames:3, illustrations:12,
  preparedBytes:records.reduce((sum,item)=>sum+item.preparedBytes,0), records }, null, 2) + '\n')
console.log('CARD-ART-PASS', manifest.frames.length, 'frames;', manifest.cards.length, 'illustrations;', records.reduce((sum,item)=>sum+item.preparedBytes,0), 'QOI bytes')
