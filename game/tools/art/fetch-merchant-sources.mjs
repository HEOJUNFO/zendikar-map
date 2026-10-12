// Original Poly Haven CC0 2K glTF assets and exact publisher checksums.
// No runtime/build dependency; reproduction preserves the downloaded originals.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const root = resolve('game/gameplay/content/merchant-props/source')
const assets = ['painted_wooden_table', 'gallinera_chair', 'wooden_bookshelf_worn', 'book_encyclopedia_set_01', 'wooden_candlestick']
const manifest = []
for (const id of assets) {
  const folder = resolve(root, id)
  mkdirSync(folder, { recursive: true })
  const json = async kind => {
    const response = await fetch(`https://api.polyhaven.com/${kind}/${id}`)
    if (!response.ok) throw new Error(`${kind}/${id}: HTTP ${response.status}`)
    const value = await response.json()
    writeFileSync(resolve(folder, `${kind}.json`), JSON.stringify(value, null, 2) + '\n')
    return value
  }
  const info = await json('info'), files = await json('files')
  const gltf = files.gltf?.['2k']?.gltf
  if (!gltf) throw new Error(`${id}: genuine 2K glTF unavailable`)
  const downloaded = []
  for (const [relative, file] of [[`${id}_2k.gltf`, gltf], ...Object.entries(gltf.include ?? {})]) {
    const path = resolve(folder, relative)
    if (!path.startsWith(folder + '\\') && !path.startsWith(folder + '/')) throw new Error('asset path escapes source directory')
    mkdirSync(dirname(path), { recursive: true })
    let bytes = existsSync(path) ? readFileSync(path) : null
    if (!bytes || createHash('md5').update(bytes).digest('hex') !== file.md5) {
      const response = await fetch(file.url)
      if (!response.ok) throw new Error(`${file.url}: HTTP ${response.status}`)
      bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length !== file.size || createHash('md5').update(bytes).digest('hex') !== file.md5) throw new Error(`${relative}: publisher checksum mismatch`)
      writeFileSync(path, bytes)
    }
    downloaded.push({ path: relative, url: file.url, bytes: bytes.length, md5: file.md5, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  manifest.push({ id, title: info.name, authors: info.authors, license: 'CC0-1.0', source: `https://polyhaven.com/a/${id}`, files: downloaded })
  console.log(id, downloaded.reduce((sum, file) => sum + file.bytes, 0), 'original bytes verified')
}
{
  const id = 'quatrefoil_jacquard_fabric', folder = resolve(root, 'cloth')
  mkdirSync(folder, { recursive: true })
  const info = await (await fetch(`https://api.polyhaven.com/info/${id}`)).json()
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  writeFileSync(resolve(folder, 'info.json'), JSON.stringify(info, null, 2) + '\n')
  writeFileSync(resolve(folder, 'files.json'), JSON.stringify(files, null, 2) + '\n')
  const downloaded = []
  for (const channel of ['Diffuse', 'nor_gl', 'Rough']) {
    const file = files[channel]?.['2k']?.jpg
    if (!file) throw new Error(`${id}/${channel}: genuine 2K JPEG unavailable`)
    const name = new URL(file.url).pathname.split('/').at(-1), path = resolve(folder, name)
    let bytes = existsSync(path) ? readFileSync(path) : null
    if (!bytes || createHash('md5').update(bytes).digest('hex') !== file.md5) {
      const response = await fetch(file.url)
      if (!response.ok) throw new Error(`${file.url}: HTTP ${response.status}`)
      bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length !== file.size || createHash('md5').update(bytes).digest('hex') !== file.md5) throw new Error(`${name}: publisher checksum mismatch`)
      writeFileSync(path, bytes)
    }
    downloaded.push({ path: name, url: file.url, bytes: bytes.length, md5: file.md5, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  manifest.push({ id, title: info.name, authors: info.authors, license: 'CC0-1.0', source: `https://polyhaven.com/a/${id}`, files: downloaded })
}
writeFileSync(resolve(root, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n')
