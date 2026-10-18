// One-time source acquisition; normal game builds never fetch or process art.
// Every map is the actual 2K author export, checked against Poly Haven's MD5.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const game = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const source = join(game, 'art-src')
const assets = ['stone_tiles_02', 'seaworn_stone_tiles', 'mossy_rock', 'sand_01']
const manifest = []
const md5 = (bytes) => createHash('md5').update(bytes).digest('hex')
for (const asset of assets) {
  const response = await fetch(`https://api.polyhaven.com/files/${asset}`, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Poly Haven metadata ${asset}: ${response.status}`)
  const files = await response.json()
  const dir = join(source, 'polyhaven', 'textures', asset)
  mkdirSync(dir, { recursive: true })
  await Promise.all(['Diffuse', 'nor_gl', 'arm'].map(async (channel) => {
    const map = files[channel]?.['2k']?.jpg
    if (!map?.url || !map.md5) throw new Error(`Missing actual 2K ${asset}/${channel}`)
    const name = basename(new URL(map.url).pathname)
    if (!new RegExp(`^${asset}_[a-z_]+_2k\\.jpg$`).test(name)) throw new Error(`Unexpected source filename ${name}`)
    const path = join(dir, name)
    let bytes = existsSync(path) ? readFileSync(path) : null
    if (!bytes || md5(bytes) !== map.md5) {
      const download = await fetch(map.url, { signal: AbortSignal.timeout(60000) })
      if (!download.ok) throw new Error(`${name}: HTTP ${download.status}`)
      bytes = Buffer.from(await download.arrayBuffer())
      if (md5(bytes) !== map.md5) throw new Error(`${name}: author MD5 mismatch`)
      writeFileSync(path, bytes)
    }
    const dimensions = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path], { encoding: 'utf8' })).streams[0]
    if (dimensions.width !== 2048 || dimensions.height !== 2048) throw new Error(`${name}: source is not native 2048²`)
    manifest.push({ asset, channel, file: path.substring(source.length + 1).replaceAll('\\', '/'), url: map.url, md5: map.md5, bytes: bytes.length, ...dimensions })
    console.log(`${asset}/${channel}: actual 2048² ${bytes.length} B`)
  }))
}
const metalDir = join(source, 'ambientcg', 'Metal017')
mkdirSync(metalDir, { recursive: true })
const archive = join(metalDir, 'Metal017_2K-JPG.zip')
const metalUrl = 'https://ambientcg.com/get?file=Metal017_2K-JPG.zip'
if (!existsSync(archive)) {
  const response = await fetch(metalUrl, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Metal017 archive: HTTP ${response.status}`)
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
}
// Extract only the four expected images; archive paths and executable extras are never used.
execFileSync('python', ['-c', `import pathlib,sys,zipfile
destination=pathlib.Path(sys.argv[2]); destination.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(sys.argv[1]) as archive:
 for channel in ['Color','NormalGL','Roughness','Metalness']:
  name='Metal017_2K-JPG_'+channel+'.jpg'; info=archive.getinfo(name)
  if info.file_size>64*1024*1024: raise ValueError('Unexpected source image size')
  (destination/name).write_bytes(archive.read(name))`, archive, metalDir])
for (const channel of ['Color', 'NormalGL', 'Roughness', 'Metalness']) {
  const name = `Metal017_2K-JPG_${channel}.jpg`
  const path = join(metalDir, name)
  const bytes = readFileSync(path)
  const dimensions = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path], { encoding: 'utf8' })).streams[0]
  if (dimensions.width !== 2048 || dimensions.height !== 2048) throw new Error(`${name}: source is not native 2048²`)
  manifest.push({ asset: 'Metal017', channel, file: `ambientcg/Metal017/${name}`, url: metalUrl, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, ...dimensions })
  console.log(`Metal017/${channel}: actual 2048² ${bytes.length} B`)
}
writeFileSync(join(source, 'world-texture-sources.json'), JSON.stringify({ retrieved: '2026-10-11', license: 'CC0-1.0', sources: manifest }, null, 2) + '\n')
