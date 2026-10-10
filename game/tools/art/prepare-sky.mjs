// 하늘 손질 — 내려받은 HDR(game/art-src, git 제외)에서 게임이 쓰는 사본 둘을 만들어 game/gameplay/content/sky 에 둔다. 한 번 하는 일이다 (빌드는 ffmpeg 도 원본도 읽지 않는다).
//   sky.hdr — 256×128 로 줄인 HDR (넓이 평균, 누르지 않은 RGBE). 빌드의 tools/skyc.mjs 가 여기서 해와 하늘빛을 뽑는다
//   sky.jpg — 원본 크기의 화면용 하늘 그림: 장면과 같은 배율(sky.txt 의 ground_light 에 맞춘 것 — sky_gain 과 tint 는 곱하지 않는다)·같은 노출·같은 톤 곡선(color.wgsl)을 미리 건 baseline JPEG.
//             게임은 이 그림을 그대로 화면 값으로 낸다 (하늘과 구운 빛이 같은 노출이다)
// sky.txt 의 ground_light·sky_gain·sun_cut 이나 color.wgsl 의 노출을 바꾸면 다시 돌린다.
// 사용: node game/tools/art/prepare-sky.mjs [ffmpeg 경로]   (없으면 FFMPEG 환경 변수, 그다음 PATH 의 ffmpeg)
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSky, encodeHdr, parseHdr, parseSkyText, readExposure, shrink, toDisplay } from '../skyc.mjs'

const game = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const folder = join(game, 'gameplay', 'content', 'sky')
const ffmpeg = process.argv[2] ?? process.env.FFMPEG ?? 'ffmpeg'
const SMALL_WIDTH = 256
const SMALL_HEIGHT = 128
// ffmpeg 의 JPEG 품질 (2 가 가장 좋다) — 하늘의 고운 기울기에 띠가 지지 않게
const QUALITY = 2

const sky = parseSkyText(readFileSync(join(folder, 'sky.txt'), 'utf8'))
const full = parseHdr(readFileSync(join(game, 'art-src', sky.source)))
const small = shrink(full, SMALL_WIDTH, SMALL_HEIGHT)
writeFileSync(join(folder, sky.hdr), encodeHdr(small))
// 빌드와 같은 길로 배율을 구한다 — 저장한 RGBE(가수 8 비트)를 다시 읽은 값에서
const light = analyzeSky(parseHdr(readFileSync(join(folder, sky.hdr))), sky)
const exposure = readExposure(readFileSync(join(game, 'engine', 'render', 'wgsl', 'include', 'color.wgsl'), 'utf8'))
const pixels = Buffer.alloc(full.width * full.height * 3)
for (let i = 0; i < pixels.length; i++) pixels[i] = Math.round(255 * toDisplay(full.data[i] * light.scale, exposure))
execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${full.width}x${full.height}`, '-i', '-', '-frames:v', '1', '-pix_fmt', 'yuvj444p', '-q:v', String(QUALITY), join(folder, sky.image)], {
  input: pixels,
  stdio: ['pipe', 'inherit', 'inherit'],
})
const degrees = (v) => ((v * 180) / Math.PI).toFixed(1)
console.log(`sky/${sky.hdr}  ${SMALL_WIDTH}×${SMALL_HEIGHT}, ${statSync(join(folder, sky.hdr)).size} B`)
console.log(`sky/${sky.image}  ${full.width}×${full.height}, ${statSync(join(folder, sky.image)).size} B`)
console.log(`해: 높이 ${degrees(Math.asin(light.sunDirection[1]))} 도, 빛 ${light.sunLight.map((v) => v.toFixed(3))}, 하늘(위) ${light.up.map((v) => v.toFixed(3))}, 배율 ${light.scale.toExponential(3)}, 돌린 각 ${degrees(light.yaw)} 도`)
