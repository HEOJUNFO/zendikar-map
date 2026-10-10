// 게임 검증 — `pnpm game:test` (프로브는 `pnpm game:build` 가 만든다)
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { checkLayers } from '../tools/check-layers.mjs'
import { bakedCodepoints, bakeFont, encodeFont, loadFont, rasterize, subsetCodepoints } from '../tools/fontc.mjs'
import { decodePng, encodeQoi, fitInside } from '../tools/imagec.mjs'
import { decodeModel, encodeModel, extractNode, extractWeaponPart, nodeOrigin, settle, simplify } from '../tools/gltfc.mjs'
import { encodeCompactMesh, encodeMesh, loadPropLibrary, parseMeshText } from '../tools/meshc.mjs'
import { decodePack, encodePack, parsePropList, parseTextureList, parseWeaponList } from '../tools/packc.mjs'
import { checkCredits, decodeWav, encodeBank, encodePcm, encodeQoa, noteNumber, parseSampleList, prepare } from '../tools/samplec.mjs'
import { compileSong, encodeSong, readRhythm } from '../tools/songc.mjs'
import { latest, mergeMove, replace } from '../host/coalesce.ts'

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

test('엔진: LBVH(손 계산 장면과 전수 검사·상자 겹침, 잎 방문 순회로 삼각형 맞히기 — 맞음·빗나감·가장 가까운 것·한계 거리), 투영 행렬, UTF-8 풀기와 글꼴 측정(면마다), 그림(QOI·JPEG — ffmpeg 가 만든 파일과 그것이 푼 픽셀, 잘린 파일·progressive·범위 밖의 표 거절) 풀기와 밉, HUD 배치(부모 채우기·번지는 바탕·그림 덮기·가지에 거는 불투명도와 크기)와 상태별 재조립, 잘라 내기, 위젯(히트 테스트·포커스·스위치·슬라이더·목록 스크롤·글 입력·커서), 메시 읽기(색 메시·겉면 메시·모델), 에셋 팩 읽기(잘린 팩·범위 밖 항목 거절)', () => probe('engine_probe'))

test('라이트 베이커: 고른 하늘 아래 열린 바닥의 빛 = 휘도(조도 π L), 해만 있을 때 수평 바닥 = 해의 빛 × cos, 상자의 그림자와 해 원반만큼의 반그림자, 반쯤 깔린 텍셀 밀어내기, 닫힌 방 속 = 0, 흰 벽 곁이 검은 벽 곁보다 밝다(튕긴 빛), 같은 입력은 같은 바이트, 조각끼리 새지 않고 빈 텍셀이 남지 않는다, 프로브(해가 보이는 정도·위아래 빛·제 물체 건너뛰기), 하늘 표 읽기, QOI 적기, 색유리(유리 밑의 바닥 = 해의 빛 × 유리의 색, 하늘빛도 물든다, 막지 않는다), 점광원(거리의 제곱·닿는 거리·0.5 m 안쪽의 상한, 상자의 그림자와 광원 크기만큼의 반그림자, 프로브, 튕긴 빛), 맞닿은 곳의 어둠(벽에서 먼 바닥은 그대로, 벽 밑으로 갈수록 어둡다)과 고른 채움빛', () => probe('bake_probe'))

test('소리 엔진: QOA 풀기(손 계산한 바이트열, 잘린 파일·스테레오 거절), 샘플 뱅크(잘린 바이트·범위 밖 값 거절), 믹서(제 속도·반 속도·두 배 속도의 에르미트 보간, 등전력 자리, 정확한 표본에서 시작, 묶음 끊기, 줄기 크기, 넘침 누르기, 보이스 뺏기, 블록을 쪼개도 비트까지 같은 출력), 시퀀서(박 k 가 48 kHz 에서 32000·k·44.1 kHz 에서 29400·k, 마디 머리에서만 층 전환, 곡 데이터 검증), 재생 시계(늦은 통지에도 뒤로 가지 않고 써 넣은 양을 넘지 않는다, 밀린 통지 대신 지금의 자리를 어림한다)', () => probe('audio_probe'))

test('게임플레이: 박자 칸(온박·반박 — 누른 때에서 가장 가까운 칸, 무기의 행동은 한 칸에 하나·대시는 따로), 판정(틱마다 전수 — 머리에서 4 틱 안은 정박·6 틱 안은 어긋남·그 밖은 미스라 나가지 않는다(발사·재장전·대시, 탄·단계·자리 그대로, 배수 한 단계 하락), 창의 양 끝을 오가는 연타, 누른 때로 판정, 일렀는지 늦었는지, 연타는 무시·다른 행동은 하나만 기억해 다음 칸에), 판정의 시각(연속 시간에서 한 번 반올림, 늦게 닿은 입력 버리기, 같은 누름은 언제나 같은 판정 — 자동 보정 없음, 판정 보정이 그대로 빠진다), 권총과 R 로만 두 번 누르는 재장전(탄 없는 발사는 빈 방아쇠), 대시(빠르기 곡선)·점프, 관성(가속·마찰·방향 전환·공중·벽 미끄러짐), 배수, 층 생성(시드별 배치·문 맞물림·이어짐, 문에 맞는 틀과 돌림 — 틀마다의 문 자리, 시드 300 개에서 문이 모두 문 자리에 나고 틀 다섯이 고르게 나온다), 방 진행(한 번에 방 하나 — 포털 → 넘기 24 틱 → 맞은편 문 안쪽 → 잠김과 도착 유예 → 전멸 → 열림 → 되돌아가기 → 층 완료, 시드 1 의 층을 포털로만 끝까지), 돌진형(예고 두 박·굳힌 방향·닿은 자리에서 멈춤·토큰)과 원거리형(모으기 한 박·곧은 투사체·토큰), 피격과 죽음, 일어난 일의 고리(차례대로 다 남고, 넘치면 오래된 것이 밀려난다), 입력 해석, 걷기와 충돌, 묻힌 방 메시(틀 여섯 × 돌림 넷 × 네 쪽 — 문 자리의 포털이 걸어서 통하고 넘어오면 그 문 안쪽에 서고, 문이 나지 않은 쪽은 막힌다), 길의 점(한 덩어리로 이어지고 이어진 점끼리 곧게 걸어갈 수 있다, 모퉁이 너머는 막힌다), 적이 나오는 자리(방 안의 빈 바닥, 플레이어에게서 8 m·서로 2 m 밖, 방 밖으로 떨어지지 않는다), 볼록하지 않은 방(ㄱ·십자·T)에서 모퉁이 뒤의 적이 길의 점을 따라 돌아와 15 초 안에 공격한다 — 가려진 동안에는 공격을 시작하지 않고, 같은 시드는 틱마다 같은 자리다 (GPU 없이)', () => probe('sim_probe'))

test('로비 프로토콜(클라이언트): 요청을 문서의 바이트로 적고, 서버 프레임을 풀어 로비 상태에 반영한다. 잘린 프레임·길이 불일치·프레임을 넘는 str·범위 밖 값·모르는 종류는 거절하고, 거절·끊김은 까닭을 한 줄로 남긴다 (소켓 없이)', () => probe('net_probe'))

test('HUD·메뉴: 구운 빛(틀마다 한 장 — 팩의 항목 이름, 프로브 격자 21 × 21 의 선형 보간, 구운 틀의 바이트와 어긋난 것 거절, 방의 돌림을 따라 도는 해와 하늘 그림, 하늘에서 뽑은 해). 세계에서 상태가, 상태에서 화면 요소가 정해진다. 첫 화면은 메인 메뉴(배경 그림 한 장 위, 세계는 돌지 않는다)이고 글쇠·포인터로 패널을 오가며, 시작 → 게임(가장자리의 묶음 — 왼쪽 위 미니맵·위 가운데 방 진행(남은 적·비운 방)·오른쪽 위 배수·점수·연속 수·왼쪽 아래 체력(비스듬한 칸, 잔상)·아래 가운데 대시(쿨다운)·오른쪽 아래 탄(칸 수 = 남은 탄, 재장전 단계), 값이 바뀐 묶음의 강조, 움직임에 밀리는 묶음과 밀리지 않는 조준점·박자 표식, 조준점의 마름모(어느 상태·화면 비율에서도 가로:세로가 같다)와 온박·반박 표식(꼭짓점이 마름모의 꼭짓점에 닿는 때가 칸의 머리인 꺾쇠, 틱 사이에서 이어진다), 박에 맞은 번쩍임·어긋난 잔상·미스 표시·맞힘·피격 표시, 타이밍 표시 옵션). 움직임의 연출(걸음의 흔들림·착지·대시·화면 흔들림 옵션, 조준 방향은 그대로), 손에 든 권총(발사의 슬라이드와 반동, 탄창 빼기·끼우기, 빈 탄창의 젖혀진 슬라이드, 빈 방아쇠 — 재장전 한 단계가 반박 안에 끝난다) → 일시정지 → 계속하기·메인 메뉴로, 장면의 에셋(받는 팩)이 오기 전에는 시작·입장이 꺼져 있고 까닭이 보이며(불러오는 중…, 실패면 다시 시도), 판이 끝나면 끝난 화면 → 다시 하기·메인 메뉴로 넘어간다. 옵션이 감도·시야각·음량·판정 보정을 바꾸고, 타이밍 표시(처음부터 켜져 있다 — 판정에 따른 색)와 옵션의 저장(짧은 글로 적고 읽는다 — 깨진 글·범위 밖의 값은 버린다), 로비 패널과 대기실은 로비 상태대로 조립되고(끊기면 다시 연결, 방이 시작되면 입장), 연결·거절 문구가 틀 안에 든다. 글자는 모두 묻힌 글꼴(Pretendard)의 제 면(굵기)에 있고, 숫자는 고정 폭이다. 소리: 묻힌 샘플 뱅크와 곡이 풀리고, 세계의 일(발사·재장전·빈 방아쇠·미스·대시·착지, 적의 예고·돌진·투사체·처치, 문과 포털)이 빠짐없이 제 샘플의 효과음이 되고(연타에는 소리가 없다. 적의 소리는 좌우와 거리대로, 같은 틱의 같은 소리는 하나로), 메뉴 소리와 발소리(걸음마다 — 20 틱에 한 발, 좌우 번갈아)가 걸리고, 곡의 층 아홉(베이스·기타의 음은 E 단조 안, 근음에서 3 반음 안, 주선율 lead 는 첫째·셋째 박에 화음의 음)이 있고, 음악의 흐름(오를 때는 한꺼번에·내릴 때는 마디마다 한 층씩, 전투 중에는 배수 1 부터 주선율, 방을 비운 뒤 두 마디의 절정과 크래시, 이동 중의 반주와 주선율의 뼈대 hum, 방이 바뀌어도 남는 배수의 층, 피격 뒤 내려감)이 세계를 따라가고, 미리 써 둔 구간으로 되돌아가 효과음을 덧써도 표본까지 같고, 박마다 킥·반박마다 하이햇이 울리고, 방에 적이 있으면 스네어가 얹히고, 음량 0 이면 나오지 않는다', () => probe('presentation_probe'))

test('소리 미리듣기: 음악의 흐름 한 바퀴(맥박 + calm → combat 과 주선율 → x2 → x3 → x4 로 쌓이고 — 넘치지 않고 층이 얹힐수록 커진다 — 방을 비운 뒤 두 마디는 그대로, 마디마다 한 층씩 내려가 이동 반주(주선율은 뼈대로), 다음 전투에서 한꺼번에 돌아오고, 맞으면 내려간다), 주선율만(적은 음의 주파수가 실제로 난다), 다 켠 곡(믹서의 보이스가 다 차지 않는다), 효과음 한 벌, 게임 한 판의 처음 스물네 마디(맥박 → 발사·빈 방아쇠·재장전 → 첫 전투방 → 방 비움 → 이동 → 둘째 전투방)를 섞어 WAV 로 적는다 — build/game-wasm64/preview/', () => {
  const path = join(buildDir, 'audio_preview.cjs')
  assert.ok(existsSync(path), 'audio_preview 가 없다 — pnpm game:build 를 먼저 돌린다')
  const folder = join(buildDir, 'preview')
  mkdirSync(folder, { recursive: true })
  const result = spawnSync(process.execPath, [path, folder], { encoding: 'utf8' })
  assert.equal(result.status, 0, `audio_preview 실패:\n${result.stdout}${result.stderr}`)
  assert.ok(!result.stdout.includes('FAIL'), result.stdout)
  const stereo = (name) => {
    // decodeWav 는 두 채널을 평균한다 — 크기를 보기에는 충분하다
    const { rate, frames } = decodeWav(readFileSync(join(folder, name)))
    assert.equal(rate, 48000, name)
    return frames
  }
  const peak = (frames, from, to) => frames.subarray(from, to).reduce((most, value) => Math.max(most, Math.abs(value)), 0)
  const rms = (frames, from, to) => Math.sqrt(frames.subarray(from, to).reduce((sum, value) => sum + value * value, 0) / (to - from))
  const BAR = 160 * 800

  // 게임 한 판 — 48 kHz 16 비트 스테레오, 스물네 마디 = 3840 틱 × 800 표본
  const game = stereo('phase1.wav')
  assert.equal(game.length, 3840 * 800)
  // 첫 박의 킥, 둘째 마디 첫 반박의 발사(틱 160 + 20)
  assert.ok(peak(game, 0, 2400) > 0.05 && peak(game, 180 * 800, 180 * 800 + 2400) > 0.2)
  // 전투 → 방 비움 → 이동 → 다음 전투가 그 안에 다 들어 있다 (못 갔으면 audio_preview 가 FAIL 을 찍는다 — 위에서 본다)
  assert.match(result.stdout, /phase1\.wav 일어난 일 \d+ 개, 체력 \d+, 문 잠김 2 번 · 방 비움 2 번/)

  // 음악의 흐름 — 40 마디. 구간: calm 0…4, combat 4…8, x2 8…12, x3 12…16, x4 16…20, 절정 20…22, 내려감 22…26, 이동 26…32, 다음 전투 32…36, 피격 뒤 36…40
  const music = stereo('music_layers.wav')
  assert.equal(music.length, 40 * BAR)
  // 켜 둔 층이 바뀐 마디 — 손으로 밟은 것: 오를 때는 그 마디에 한꺼번에(32), 내릴 때는 마디마다 하나씩(22·23·24·25 — 마지막에 lead 가 hum 으로, 36·37·38). 주선율(lead)은 전투의 첫 마디부터 있고 맞아도 남는다
  const changes = result.stdout.split('\n').flatMap((line) => /music_layers\.wav 마디\s+(\d+): (.*)/.exec(line)?.slice(1, 3).join(' ') ?? [])
  assert.deepEqual(changes, [
    '0 pulse calm',
    '4 pulse roam combat lead',
    '8 pulse roam combat x2 lead',
    '12 pulse roam combat x2 x3 lead',
    '16 pulse roam combat x2 x3 x4 lead',
    '22 pulse roam combat x2 x3 lead',
    '23 pulse roam combat x2 lead',
    '24 pulse roam x2 lead',
    '25 pulse roam x2 hum',
    '32 pulse roam combat x2 x3 x4 lead',
    '36 pulse roam combat x2 x3 lead',
    '37 pulse roam combat x2 lead',
    '38 pulse roam combat lead',
  ])
  // 넘치지 않는다 — 가장 두꺼운 구간(x4)의 피크도 0 dBFS 아래 (믹서가 ±0.8 위를 눌러 1 을 넘지 않는다. 그 눌림이 드문지는 audio_preview 가 찍는 '눌린 표본'으로 본다)
  assert.ok(peak(music, 0, music.length) < 0.99, `피크 ${peak(music, 0, music.length)}`)
  const level = [0, 4, 8, 12, 16].map((bar) => rms(music, bar * BAR, (bar + 4) * BAR))
  // 층이 얹힐수록 커진다. 맥박만의 구간도 들릴 만큼이고(-30 dBFS 위), 가장 두꺼운 구간이 -9 dBFS 를 넘지 않는다
  assert.ok(level.every((value, i) => i === 0 || value > level[i - 1]), `구간별 RMS ${level.map((v) => v.toFixed(3))}`)
  assert.ok(level[0] > 10 ** (-30 / 20) && level[4] < 10 ** (-9 / 20), `구간별 RMS ${level.map((v) => v.toFixed(3))}`)
  // 박 머리마다 킥의 어택이 놓인다 — 구간마다 첫 마디의 네 박(32000 표본 간격)에서, 박 머리 10 ms 가 그 바로 앞 10 ms 보다 크다
  for (const bar of [0, 4, 8, 12, 16, 20, 24, 28, 32, 36])
    for (let beat = 0; beat < 4; beat++) {
      const at = bar * BAR + beat * 32000
      if (at >= 480) assert.ok(peak(music, at, at + 480) > 0.1, `마디 ${bar} 박 ${beat} 의 킥`)
    }
  // 방을 비운 뒤 두 마디(절정)는 가장 두꺼운 구간만큼 크다 — 꺼지지 않는다
  assert.ok(rms(music, 20 * BAR, 22 * BAR) > level[4] * 0.9, '절정')
  // 이동 반주(맥박 + roam + x2 + hum)는 가장 두꺼운 구간보다 작고, 맥박 + calm 보다는 크다 — 방 사이에서도 반주가 이어진다
  const roam = rms(music, 26 * BAR, 32 * BAR)
  assert.ok(roam < level[4] * 0.8 && roam > level[0] * 1.2, `이동 반주 RMS ${roam.toFixed(3)}, 구간별 ${level.map((v) => v.toFixed(3))}`)
  // 다음 전투에서는 첫 마디부터 가장 두꺼운 구간만큼 크고, 맞은 뒤 다 내려간 마지막 마디는 그보다 작다 (주선율은 남는다 — 그래서 차이가 2 dB 쯤이다: 0.8 배 언저리)
  assert.ok(rms(music, 32 * BAR, 33 * BAR) > level[4] * 0.9 && rms(music, 39 * BAR, 40 * BAR) < level[4] * 0.9, '다음 전투와 피격 뒤')

  // 주선율만 — 32 마디: lead 한 바퀴(0…16), hum 한 바퀴(16…32). 악보에 적은 음의 주파수가 실제로 난다:
  // 그 음이 울리는 구간에서 그 주파수의 세기(Goertzel)가 위아래 한 반음·두 반음 자리의 어느 것보다 두 배 넘게 크다. 주파수는 평균율(A4 = 440 Hz)로 손으로 구한 것
  const tune = stereo('melody.wav')
  assert.equal(tune.length, 32 * BAR)
  const power = (frames, from, to, hz) => {
    let re = 0
    let im = 0
    for (let i = from; i < to; i++) {
      // 창(Hann) — 이웃 반음으로 새지 않게
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i - from)) / (to - from))
      re += frames[i] * w * Math.cos((2 * Math.PI * hz * i) / 48000)
      im += frames[i] * w * Math.sin((2 * Math.PI * hz * i) / 48000)
    }
    return re * re + im * im
  }
  // [마디, 칸, 칸 수, Hz] — 악보 머리말의 주 리프에서 긴 음들: 1 마디 머리의 E4 와 끝의 B3, 4 마디의 D4(여덟 칸), 8 마디의 F#4(딸림화음 위), 코러스의 D4 · G4(9 마디) · E4(11 마디), 14 마디의 A4(가장 높은 음), 16 마디의 G4
  for (const [bar, cell, cells, hz] of [[0, 0, 4, 329.63], [0, 12, 4, 246.94], [3, 8, 7, 293.66], [7, 0, 7, 369.99], [8, 0, 7, 293.66], [8, 8, 7, 392.0], [10, 0, 7, 329.63], [13, 0, 8, 440.0], [15, 0, 7, 392.0]]) {
    const from = bar * BAR + cell * 8000 + 1600
    const to = bar * BAR + (cell + cells) * 8000
    const at = power(tune, from, to, hz)
    for (const semitones of [-2, -1, 1, 2]) assert.ok(at > 2 * power(tune, from, to, hz * 2 ** (semitones / 12)), `melody.wav 마디 ${bar} 칸 ${cell}: ${hz} Hz 가 ${semitones} 반음 옆보다 또렷하지 않다`)
  }
  // 주 리프가 반주 위로 나온다 — lead 구간이 hum 구간(같은 반주에 여린 파워코드)보다 크고, 넘치지 않는다
  assert.ok(rms(tune, 0, 16 * BAR) > rms(tune, 16 * BAR, 32 * BAR) * 1.1 && peak(tune, 0, tune.length) < 0.99, 'melody.wav 의 크기')

  // 다 켠 곡 — 18 마디. 넘치지 않고, 가장 두꺼운 소리가 음악의 흐름의 x4 구간과 같은 크기다 (같은 층들이다). 음악만으로 믹서의 보이스(48)가 다 차지 않는다 — 효과음의 몫이 남는다
  const whole = stereo('full.wav')
  assert.equal(whole.length, 18 * BAR)
  assert.ok(peak(whole, 0, whole.length) < 0.99 && rms(whole, 0, 16 * BAR) > level[4] * 0.8 && rms(whole, 0, 16 * BAR) < level[4] * 1.25, `full.wav 의 크기 ${rms(whole, 0, 16 * BAR).toFixed(3)}`)
  const voices = /full\.wav 보이스 가장 많을 때 (\d+) · 평균 ([\d.]+)/.exec(result.stdout)
  assert.ok(voices && Number(voices[1]) < 48 && Number(voices[2]) < 32, `full.wav 의 보이스: ${voices?.[0]}`)
  // 박(온박)의 머리에는 킥이, 반박의 머리에는 스네어가 선다 — 다 켠 곡에서도 칸의 머리 10 ms 의 크기(RMS)가 그 바로 앞 20 ms 보다 크다 (둘째 마디의 여덟 칸)
  for (let slot = 0; slot < 8; slot++) {
    const at = BAR + slot * 16000
    assert.ok(rms(whole, at, at + 480) > 1.2 * rms(whole, at - 960, at), `full.wav 둘째 마디 칸 ${slot} 의 어택`)
  }

  // 총소리만 — 세 발의 머리(틱 20, 62, 104)마다 어택이 있고(첫 5 ms 안에 크다 — 가장 작게 나는 발도 0.28), 반박마다의 연사(틱 164 부터 20 틱 간격)에서도 발마다 어택이 다시 선다
  const gun = stereo('gun.wav')
  for (const tick of [20, 62, 104, 164, 184, 204, 224, 244, 264]) assert.ok(peak(gun, tick * 800, tick * 800 + 240) > 0.2 && peak(gun, tick * 800 - 480, tick * 800) < 0.15, `gun.wav 틱 ${tick} 의 발사`)
  // 재장전: 탄창 빼기(틱 324), 끼우기(364), 슬라이드(372), 빈 방아쇠(432)
  for (const tick of [324, 364, 372, 432]) assert.ok(peak(gun, tick * 800, tick * 800 + 4800) > 0.02, `gun.wav 틱 ${tick}`)

  // 효과음 한 벌 — 소리마다 반 초 이상, 모두 소리가 난다
  const sfx = stereo('effects.wav')
  assert.ok(sfx.length >= 29 * 24000 && peak(sfx, 0, 24000) > 0.2)
  const lines = result.stdout.split('\n').filter((line) => line.includes('effects.wav'))
  assert.equal(lines.length, 29)
  for (const line of lines) assert.ok(Number(/피크\s+(-?[\d.]+)/.exec(line)[1]) > -40, line)
})

const close = (a, b) => Math.abs(a - b) < 1e-5

test('메시 도구: 도형을 삼각형과 충돌 상자로 옮긴다', () => {
  // 가운데 (1, 2, 3), 크기 2 × 4 × 6 인 상자 — 삼각형 12 개, 충돌 상자는 (0,0,0)…(2,4,6)
  const box = parseMeshText(['color a #ff8000 glow', 'solid on', 'box a 1 2 3  2 4 6'].join('\n'))
  assert.equal(box.vertices.length, 36 * 10)
  assert.deepEqual(box.solids, [[0, 0, 0, 2, 4, 6]])
  let area = 0
  for (let t = 0; t < 12; t++) {
    const [a, b, c] = [0, 1, 2].map((k) => [...box.vertices.slice((t * 3 + k) * 10, (t * 3 + k) * 10 + 3)])
    const normal = [...box.vertices.slice(t * 30 + 3, t * 30 + 6)]
    const [u, v] = [b.map((x, i) => x - a[i]), c.map((x, i) => x - a[i])]
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    area += Math.hypot(...cross) / 2
    // 감긴 방향이 법선과 같고, 법선은 상자의 가운데 반대쪽(밖)을 본다
    assert.ok(cross[0] * normal[0] + cross[1] * normal[1] + cross[2] * normal[2] > 0, '삼각형이 법선 쪽에서 볼 때 반시계 방향이다')
    const outward = [a[0] - 1, a[1] - 2, a[2] - 3]
    assert.ok(outward[0] * normal[0] + outward[1] * normal[1] + outward[2] * normal[2] > 0, '법선이 밖을 본다')
    assert.deepEqual([...box.vertices.slice(t * 30 + 6, t * 30 + 10)].map((x) => Math.round(x * 255)), [255, 128, 0, 255])
  }
  // 겉넓이 2·(2·4 + 4·6 + 2·6) = 88
  assert.ok(close(area, 88))

  // 옆으로 90 도 돌린 상자 — 충돌 상자의 x 와 z 가 바뀐다
  assert.deepEqual(parseMeshText('color a #000000\nsolid on\nbox a 0 0 0  2 4 6 rot 90 0 0').solids, [[-3, -2, -1, 3, 2, 1]])
  assert.throws(() => parseMeshText('color a #000000\nsolid on\nbox a 0 0 0  2 4 6 rot 30 0 0'), /90 도 단위/)

  // 계단 4 단 — 너비 2, 높이 2, 깊이 4. -z 쪽이 높다: 단마다 0.5 씩 높아지고 1 씩 물러난다
  const stairs = parseMeshText('color a #000000\nsolid on\nstairs a 0 1 0  2 2 4  4')
  assert.deepEqual(stairs.solids, [[-1, 0, 1, 1, 0.5, 2], [-1, 0, 0, 1, 1, 1], [-1, 0, -1, 1, 1.5, 0], [-1, 0, -2, 1, 2, -1]])
  assert.equal(stairs.vertices.length, 4 * 36 * 10)

  // 팔면체 — 삼각형 8 개. 뿔(윗면 반지름 0)인 6 각 기둥 — 옆면 6 + 밑면 4
  assert.equal(parseMeshText('color a #000000\noct a 0 0 0  1 2 1').vertices.length, 8 * 30)
  assert.equal(parseMeshText('color a #000000\ncyl a 0 0 0  1 2 sides 6 top 0').vertices.length, (6 + 4) * 30)
  // solid off 인 도형은 충돌 상자를 내지 않는다
  assert.deepEqual(parseMeshText('color a #000000\nbox a 0 0 0 1 1 1').solids, [])

  const bytes = encodeMesh(box)
  assert.equal(bytes.length, 12 + 36 * 40 + 24)
  assert.deepEqual([...bytes.slice(0, 12)], [0x5a, 0x4b, 0x4d, 0x53, 36, 0, 0, 0, 1, 0, 0, 0])

  assert.throws(() => parseMeshText('box nope 0 0 0 1 1 1'), /정하지 않은 색/)
  assert.throws(() => parseMeshText('color a #000000\nwarp a 1'), /모르는 명령/)
  assert.throws(() => parseMeshText('color a #000000\nbox a 0 0 0 1 1'), /숫자 6 개/)
})

/** 겉면 메시의 정점 하나 — { p, n, uv, lm, color, layer } */
const surfaceVertex = (surface, index) => {
  const v = [...surface.vertices.slice(index * 15, index * 15 + 15)]
  return { p: v.slice(0, 3), n: v.slice(3, 6), uv: v.slice(6, 8), lm: v.slice(8, 10), color: v.slice(10, 14), layer: v[14] }
}
/** 라이트맵 조각들이 아틀라스 안에서 서로 1 텍셀 넘게 떨어져 있고, 모든 정점의 라이트맵 좌표가 제 조각의 가장자리 텍셀의 가운데 안쪽인가 */
function assertLightmap(surface, name) {
  const { charts, chartOf, lightmap } = surface
  for (const c of charts) assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.width <= lightmap.width && c.y + c.height <= lightmap.height, `${name}: 조각이 아틀라스 안에 있다`)
  // 선반마다 x 차례로 놓여 있다 — y 가 겹치는 조각끼리만 견준다
  const sorted = charts.map((c, i) => ({ ...c, i })).sort((a, b) => a.y - b.y || a.x - b.x)
  let overlaps = 0
  for (let a = 0; a < sorted.length; a++)
    for (let b = a + 1; b < sorted.length && sorted[b].y < sorted[a].y + sorted[a].height + 1; b++)
      if (sorted[b].x < sorted[a].x + sorted[a].width + 1 && sorted[a].x < sorted[b].x + sorted[b].width + 1) overlaps++
  assert.equal(overlaps, 0, `${name}: 조각끼리 겹치거나 맞닿지 않는다 (사이에 1 텍셀)`)
  let outside = 0
  for (let i = 0; i < surface.vertices.length / 15; i++) {
    const c = charts[chartOf[Math.floor(i / 3)]]
    const [u, v] = surfaceVertex(surface, i).lm.map((value, axis) => value * (axis ? lightmap.height : lightmap.width))
    if (u < c.x + 0.5 - 1e-3 || u > c.x + c.width - 0.5 + 1e-3 || v < c.y + 0.5 - 1e-3 || v > c.y + c.height - 0.5 + 1e-3) outside++
  }
  assert.equal(outside, 0, `${name}: 라이트맵 좌표가 제 조각의 텍셀 가운데 범위 안이다`)
}

test('메시 도구: 재질을 쓴 메시는 무늬 좌표(타일 크기대로, 맞닿은 도형끼리 이어진다)와 라이트맵 조각(겹치지 않고, 텍셀 가운데 안쪽)을 싣는다', () => {
  const library = { textures: ['sand', 'stone'] }
  // 가운데가 원점, 크기 2 × 1 × 3 m 인 상자에 2 m 짜리 타일 — 면을 밖에서 볼 때 u 가 오른쪽, v 가 아래쪽으로 펼쳐진다 (÷ 2)
  const { surface } = parseMeshText('material m stone 2\nbox m 0 0 0  2 1 3', 'box', library)
  assert.equal(surface.vertices.length, 36 * 15)
  const expected = {
    '0,1,0': ([x, , z]) => [x / 2, z / 2],
    '0,-1,0': ([x, , z]) => [x / 2, -z / 2],
    '0,0,1': ([x, y]) => [x / 2, -y / 2],
    '0,0,-1': ([x, y]) => [-x / 2, -y / 2],
    '1,0,0': ([, y, z]) => [-z / 2, -y / 2],
    '-1,0,0': ([, y, z]) => [z / 2, -y / 2],
  }
  for (let i = 0; i < 36; i++) {
    const v = surfaceVertex(surface, i)
    const want = expected[v.n.map((c) => Math.round(c)).join(',')](v.p)
    assert.ok(close(v.uv[0], want[0]) && close(v.uv[1], want[1]), `정점 ${i} 의 uv ${v.uv} = ${want}`)
    assert.deepEqual([v.color, v.layer], [[1, 1, 1, 0], 1])
  }
  // 윗면의 무늬는 가로 1 번(2 m ÷ 2), 세로 1.5 번(3 m ÷ 2)
  const top = Array.from({ length: 36 }, (_, i) => surfaceVertex(surface, i)).filter((v) => v.n[1] > 0.5)
  assert.deepEqual([Math.min(...top.map((v) => v.uv[0])), Math.max(...top.map((v) => v.uv[0])), Math.min(...top.map((v) => v.uv[1])), Math.max(...top.map((v) => v.uv[1]))], [-0.5, 0.5, -0.75, 0.75])

  // lightmap 명령 — 그 뒤의 도형만 그 밀도로: 2 × 1 × 3 m 상자 둘, 앞의 것은 1 m 에 10 텍셀(윗면 20 × 30), 뒤의 것은 2 텍셀(윗면 4 × 6, 앞뒤 4 × 2, 양옆 6 × 2)
  const coarse = parseMeshText(['material m a 1', 'box m 0 0 0  2 1 3', 'lightmap 2', 'box m 9 0 0  2 1 3'].join('\n'), 'coarse', { textures: ['a'] }).surface
  assert.deepEqual(coarse.charts.map((c) => c.width * c.height).sort((a, b) => a - b), [8, 8, 12, 12, 24, 24, 200, 200, 300, 300, 600, 600])
  assertLightmap(coarse, 'coarse')
  assert.throws(() => parseMeshText('lightmap 0'), /lightmap/)
  // 라이트맵 — 1 m 에 10 텍셀: 윗면·밑면 20 × 30, 앞뒤 20 × 10, 양옆 30 × 10
  assert.deepEqual(surface.charts.map((c) => `${c.width}x${c.height}`).sort(), ['20x10', '20x10', '20x30', '20x30', '30x10', '30x10'])
  assertLightmap(surface, 'box')
  // 조각의 양 끝은 가장자리 텍셀의 가운데다
  const chart = surface.charts[surface.chartOf[0]]
  const us = [0, 1, 2].map((i) => surfaceVertex(surface, i).lm[0] * surface.lightmap.width - chart.x)
  assert.ok(close(Math.min(...us), 0.5) && close(Math.max(...us), chart.width - 0.5))

  // 맞닿은 상자의 윗면은 무늬가 이어진다 (x 1 인 모서리의 u 가 두 상자에서 같다). 돌린 상자의 무늬는 돌리기 전의 자리에서 펼친다
  const pair = parseMeshText('material m stone 2\nbox m 0 0 0  2 1 3\nbox m 2 0 0  2 1 3', 'pair', library).surface
  const seam = Array.from({ length: 72 }, (_, i) => surfaceVertex(pair, i)).filter((v) => v.n[1] > 0.5 && close(v.p[0], 1))
  assert.ok(seam.length >= 4 && seam.every((v) => close(v.uv[0], 0.5)))
  const turned = parseMeshText('material m stone 2\nbox m 0 0 0  2 1 3 rot 90 0 0', 'turned', library).surface
  const turnedTop = Array.from({ length: 36 }, (_, i) => surfaceVertex(turned, i)).filter((v) => v.n[1] > 0.5)
  assert.ok(close(Math.max(...turnedTop.map((v) => v.p[0])), 1.5), '돌린 상자의 윗면은 x 로 ±1.5 다')
  assert.ok(close(Math.max(...turnedTop.map((v) => v.uv[0])), 0.5) && close(Math.max(...turnedTop.map((v) => v.uv[1])), 0.75), '무늬는 돌리기 전처럼 1 × 1.5 번이다')

  // 4 각 기둥(반지름 1, 높이 2)의 옆면 — 둘레를 따라 한 면에 2π/4 = 1.5708 m, 타일 2 m 면 0.7854 번씩 나아가고 높이로 1 번
  const column = parseMeshText('material m stone 2\ncyl m 0 0 0  1 2 sides 4', 'column', library).surface
  const side = Array.from({ length: column.vertices.length / 15 }, (_, i) => surfaceVertex(column, i)).filter((v) => Math.abs(v.n[1]) < 0.5)
  assert.equal(side.length, 4 * 6)
  assert.ok(side.every((v) => close((Math.abs(v.uv[0]) / 0.785398) % 1, 0) || close((Math.abs(v.uv[0]) / 0.785398) % 1, 1)), '옆면의 u 는 0.7854 의 배수다')
  assert.deepEqual([...new Set(side.map((v) => Math.round(v.uv[1] * 100) / 100))].sort(), [-0.5, 0.5])
  assertLightmap(column, 'column')

  // 재질 없는 도형(색만)은 층 -1 이고 무늬 좌표가 없다. 아주 작은 면도 조각 하나(1 × 1 텍셀)를 받는다
  const mixed = parseMeshText('material m sand 1.5 #808080\ncolor c #ff0000 glow\nbox m 0 0 0  1 1 1\nbox c 5 0 0  0.05 0.05 0.05', 'mixed', library).surface
  const plain = surfaceVertex(mixed, 36)
  assert.deepEqual([plain.uv, plain.color, plain.layer], [[0, 0], [1, 0, 0, 1], -1])
  const tinted = surfaceVertex(mixed, 0)
  assert.deepEqual([tinted.color.map((c) => Math.round(c * 255)), tinted.layer], [[128, 128, 128, 0], 0])
  assert.deepEqual(mixed.charts.slice(6).map((c) => `${c.width}x${c.height}`), Array(6).fill('1x1'))
  assertLightmap(mixed, 'mixed')

  // 놓인 소품 — 번호·자리·yaw(라디안)·배율. 부딪히는 소품은 놓인 모양을 감싸는 상자를 옆으로 0.8 배, 위로 0.8 배 한 것이 충돌 상자가 된다:
  // 점 (-1, 0, -0.5)·(1, 2, 0.5) 를 2 배 하고 yaw 90 도로 돌리면 x ±1, y 0…4, z ±2 → (10, 0, 5) 에 놓아 x 9.2…10.8, y 0…3.2, z 3.4…6.6
  const props = new Map([['pebble', { index: 0, solid: false, positions: Float32Array.of(0, 0, 0) }], ['rock', { index: 1, solid: true, positions: Float32Array.of(-1, 0, -0.5, 1, 2, 0.5) }]])
  const placed = parseMeshText('material m stone 2\nbox m 0 0 0  1 1 1\nprop rock 10 0 5  90 2\nprop pebble 1 0 1  0 1', 'placed', { ...library, props })
  assert.deepEqual(placed.solids, [[9.2, 0, 3.4, 10.8, 3.2, 6.6]])
  assert.deepEqual(placed.surface.placements, [{ model: 1, position: [10, 0, 5], yaw: Math.PI / 2, scale: 2 }, { model: 0, position: [1, 0, 1], yaw: 0, scale: 1 }])

  // 'ZKSF' · 정점 36 · 충돌 상자 1 · 소품 2 · 라이트맵 크기 · 빛 0 · 길의 점 0, 그 뒤로 정점 60 바이트씩, 상자 24, 소품 24 씩
  const bytes = encodeMesh(placed)
  assert.equal(bytes.length, 32 + 36 * 60 + 24 + 2 * 24)
  assert.deepEqual([...bytes.slice(0, 16)], [0x5a, 0x4b, 0x53, 0x46, 36, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0])
  assert.deepEqual([new DataView(bytes.buffer).getUint32(16, true), new DataView(bytes.buffer).getUint32(20, true)], [placed.surface.lightmap.width, placed.surface.lightmap.height])
  assert.deepEqual([...bytes.slice(24, 32)], [0, 0, 0, 0, 0, 0, 0, 0])
  // 첫 소품: 번호 1, 자리 (10, 0, 5) = 0x41200000, 0, 0x40a00000
  assert.deepEqual([...bytes.slice(32 + 36 * 60 + 24, 32 + 36 * 60 + 24 + 16)], [1, 0, 0, 0, 0, 0, 0x20, 0x41, 0, 0, 0, 0, 0, 0, 0xa0, 0x40])

  assert.throws(() => parseMeshText('material m nope 2', 'x', library), /텍스처 목록에 없는/)
  assert.throws(() => parseMeshText('material m stone 0', 'x', library), /material <이름>/)
  assert.throws(() => parseMeshText('color m #000000\nmaterial m stone 2', 'x', library), /두 번 정했다/)
  assert.throws(() => parseMeshText('prop nope 0 0 0 0 1', 'x', library), /소품 목록에 없는/)
})

test('메시 도구: 면마다의 라이트맵 밀도(lm), 색유리(층 -2), 구울 빛(light), 길의 점(waypoint — 충돌 상자를 0.6 m 부풀려 가로막히지 않는 점끼리 잇고, 상자 속의 점·끊긴 이음은 거절한다)', () => {
  const library = { textures: ['stone'] }
  // 2 × 1 × 3 m 상자 — 밀도 10 이면 윗면이 20 × 30 텍셀. 윗면만 밀도 2 로 낮추면 4 × 6, 다른 면은 그대로다
  const plain = parseMeshText('material m stone 2\nbox m 0 0 0  2 1 3', 'plain', library).surface
  const coarse = parseMeshText('material m stone 2\nbox m 0 0 0  2 1 3 lm +y 2', 'coarse', library).surface
  const sizes = (surface) => surface.charts.map((c) => `${c.width}x${c.height}`).sort()
  assert.deepEqual(sizes(plain), ['20x10', '20x10', '20x30', '20x30', '30x10', '30x10'])
  assert.deepEqual(sizes(coarse), ['20x10', '20x10', '20x30', '30x10', '30x10', '4x6'])
  assert.throws(() => parseMeshText('material m stone 2\nbox m 0 0 0  2 1 3 lm up 2', 'x', library), /lm </)
  assert.throws(() => parseMeshText('material m stone 2\ncyl m 0 0 0  1 2 lm +y 2', 'x', library), /붙일 수 없는/)

  // 색유리 — 빛나는 색(넷째 칸 1)이고 층이 -2 다. 여느 빛나는 색은 층 -1
  const glass = parseMeshText('material m stone 2\ncolor g #4080ff glass\ncolor r #ff0000 glow\nbox g 0 0 0  1 1 1\nbox r 5 0 0  1 1 1', 'glass', library).surface
  assert.deepEqual([...glass.vertices.slice(11, 15)].map((v) => Math.round(v * 1000) / 1000), [1, 1, -2].length ? [Math.round((0x80 / 255) * 1000) / 1000, 1, 1, -2] : [])
  assert.deepEqual([glass.vertices[36 * 15 + 13], glass.vertices[36 * 15 + 14]], [1, -1])
  assert.throws(() => parseMeshText('color g #4080ff shiny'), /모르는 색 속성/)

  // 빛 — 세기는 1 m 에서 마주 보는 면이 받는 빛: 색(화면 값)을 선형 빛으로 옮겨 곱한다. #ff8000 × 2 → (2, 2 × (128/255)^2.2, 0)
  const lit = parseMeshText('material m stone 2\nbox m 0 0 0  1 1 1\nlight 1 3 2 #ff8000 2 9\nlight 0 1 0 #ffffff 1 4 0.5', 'lit', library).surface
  assert.equal(lit.lights.length, 2)
  assert.deepEqual([lit.lights[0].position, lit.lights[0].reach, lit.lights[0].size, lit.lights[1].size], [[1, 3, 2], 9, 0.15, 0.5])
  assert.ok(close(lit.lights[0].light[0], 2) && close(lit.lights[0].light[1], 2 * (128 / 255) ** 2.2) && lit.lights[0].light[2] === 0)
  assert.throws(() => parseMeshText('material m stone 2\nlight 0 0 0 #ffffff 0 4', 'x', library), /light x y z/)
  assert.throws(() => parseMeshText('material m stone 2\nlight 0 0 0 #ffffff 1 4 5', 'x', library), /light x y z/)
  assert.throws(() => parseMeshText('color a #000000\nbox a 0 0 0 1 1 1\nlight 0 0 0 #ffffff 1 4'), /재질을 쓴 메시/)

  // 길의 점 — 20 m 바닥 가운데에 2 m 기둥 (x, z 가 -1 … 1). 네 귀의 점 (±5, ±5): 변을 따라서는 이어지고, 대각선은 기둥(0.6 m 부풀려 ±1.6)에 가로막힌다
  const yard = ['material m stone 2', 'solid on', 'box m 0 -0.5 0  20 1 20', 'box m 0 2 0  2 4 2', 'waypoint -5 0 -5', 'waypoint 5 0 -5', 'waypoint 5 0 5', 'waypoint -5 0 5']
  const nav = parseMeshText(yard.join('\n'), 'yard', library).surface.nav
  assert.deepEqual(nav.map((node) => node.links), [0b1010, 0b0101, 0b1010, 0b0101])
  assert.deepEqual(nav[2].position, [5, 0, 5])
  // 낮은 턱(0.5 m — 걸어 오른다)은 막지 않는다: 띠는 발에서 0.55 … 1.6 m. 0.6 m 턱은 막는다
  const step = (height) => parseMeshText(['material m stone 2', 'solid on', 'box m 0 -0.5 0  20 1 20', `box m 0 ${height / 2} 0  2 ${height} 20`, 'waypoint -5 0 0', 'waypoint 5 0 0'].join('\n'), 'step', library)
  assert.deepEqual(step(0.5).surface.nav.map((node) => node.links), [0b10, 0b01])
  assert.throws(() => step(0.6), /이어지지 않는다/)
  // 기둥에 0.6 m 안으로 붙은 점, 기둥 속의 점
  assert.throws(() => parseMeshText([...yard, 'waypoint 1.5 0 0'].join('\n'), 'yard', library), /충돌 상자 속/)
  assert.throws(() => parseMeshText([...yard, 'waypoint 0 0 0'].join('\n'), 'yard', library), /충돌 상자 속/)
  assert.throws(() => parseMeshText(['material m stone 2', ...Array.from({ length: 33 }, (_, i) => `waypoint ${i} 0 0`)].join('\n'), 'many', library), /32 개까지/)

  // 바이트 — 머리의 빛 수·점 수, 꼬리에 빛(f32 × 8)과 점(f32 × 3 + u32)
  const mesh = parseMeshText([...yard, 'light 0 6 0 #ffffff 3 12 0.25'].join('\n'), 'yard', library)
  const bytes = encodeMesh(mesh)
  const view = new DataView(bytes.buffer)
  assert.deepEqual([view.getUint32(24, true), view.getUint32(28, true)], [1, 4])
  const tail = bytes.length - 32 - 4 * 16
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => view.getFloat32(tail + i * 4, true)), [0, 6, 0, 3, 3, 3, 12, 0.25])
  assert.deepEqual([view.getFloat32(tail + 32, true), view.getFloat32(tail + 40, true), view.getUint32(tail + 44, true)], [-5, -5, 0b1010])
  assert.equal(bytes.length, 32 + 72 * 60 + mesh.solids.length * 24 + 32 + 4 * 16)
})

const content = join(root, 'game', 'gameplay', 'content')
test('메시 도구: 기둥꼴(prism — 단면을 밀고 끝을 비스듬히 자른다), 충돌 상자만(block), 텍스처를 입힌 색유리(material … glass), 줄여 적은 겉면 메시(ZKSC)', () => {
  const library = { textures: ['stone', 'glass'] }
  const corners = (surface) => Array.from({ length: surface.vertices.length / 15 }, (_, i) => surfaceVertex(surface, i))
  /** 삼각형들의 넓이의 합과, 모두 밖(가운데 middle 의 반대쪽)을 보는지 */
  const measure = (surface, middle) => {
    const v = corners(surface)
    let [area, outward] = [0, true]
    for (let t = 0; t < v.length; t += 3) {
      const [a, b, c] = [v[t].p, v[t + 1].p, v[t + 2].p]
      const [e1, e2] = [b.map((x, i) => x - a[i]), c.map((x, i) => x - a[i])]
      const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      area += Math.hypot(...cross) / 2
      const out = a.map((x, i) => (x + b[i] + c[i]) / 3 - middle[i])
      // 감는 방향이 법선과 같고, 법선이 가운데의 반대쪽을 본다
      if (cross.reduce((sum, x, i) => sum + x * v[t].n[i], 0) <= 0 || out.reduce((sum, x, i) => sum + x * v[t].n[i], 0) <= 0) outward = false
    }
    return { area, outward, triangles: v.length / 3 }
  }
  // 1 × 1 정사각 단면을 y 로 2 m — 상자와 같다: 삼각형 12 개, 겉넓이 2 × 1 + 4 × 2 = 10, 감싸는 상자가 충돌 상자
  const square = parseMeshText('material m stone 2\nsolid on\nprism m 0 1 0  2  4  -0.5 -0.5  0.5 -0.5  0.5 0.5  -0.5 0.5', 'square', library)
  const measured = measure(square.surface, [0, 1, 0])
  assert.ok(measured.triangles === 12 && close(measured.area, 10) && measured.outward, JSON.stringify(measured))
  assert.deepEqual(square.solids, [[-0.5, 0, -0.5, 0.5, 2, 0.5]])
  assertLightmap(square.surface, 'square')
  // 축 — axis x 의 단면은 (z, y), axis z 의 단면은 (x, y): 직각삼각형 (0,0)·(1,0)·(0,2) 를 x 로 4 m 밀면 z 0…1, y 0…2 를 차지한다 (삼각형 2 + 3 × 2 = 8)
  const wedge = parseMeshText('material m stone 2\nsolid on\nprism m 0 0 0  4  3  0 0  1 0  0 2  axis x', 'wedge', library)
  assert.deepEqual(wedge.solids, [[-2, 0, 0, 2, 2, 1]])
  assert.equal(wedge.surface.vertices.length / 45, 8)
  // 오목한 ㄴ 단면도 갈린다 (꼭짓점 6 → 끝마다 삼각형 4, 옆면 6 × 2): 넓이 0.51 인 단면을 4 m — 겉넓이 2 × 0.51 + 둘레 4 × 4 = 17.02
  const ell = parseMeshText('material m stone 2\nprism m 0 0 0  4  6  0 0  1 0  1 0.3  0.3 0.3  0.3 1  0 1  axis z', 'ell', library).surface
  assert.ok(ell.vertices.length / 45 === 20 && close(measure(ell, [0.15, 0.15, 0]).area, 17.02), `ㄴ 단면 ${ell.vertices.length / 45}`)
  // 비스듬한 끝 — miter 1 0 -1 0: 끝이 ∓2 ± p 에 온다. 단면 p 0…1 이면 p 0 쪽은 길이 4, p 1 쪽은 길이 2 (사다리꼴 — 모퉁이에서 맞대는 몰딩)
  const mitered = corners(parseMeshText('material m stone 2\nprism m 0 0 0  4  4  0 0  1 0  1 1  0 1  axis x miter 1 0 -1 0', 'miter', library).surface)
  const reach = (p) => mitered.filter((v) => close(v.p[2], p)).map((v) => v.p[0])
  assert.deepEqual([Math.min(...reach(0)), Math.max(...reach(0)), Math.min(...reach(1)), Math.max(...reach(1))].map((x) => Math.round(x * 1000) / 1000), [-2, 2, -1, 1])
  assert.throws(() => parseMeshText('material m stone 2\nprism m 0 0 0  2  4  0 0  1 1  1 0  0 1', 'x', library), /엇갈리지/)
  assert.throws(() => parseMeshText('material m stone 2\nprism m 0 0 0  2  2  0 0  1 1', 'x', library), /꼭짓점/)
  assert.throws(() => parseMeshText('material m stone 2\nprism m 0 0 0  1  4  0 0  1 0  1 1  0 1 miter 2 0 -2 0', 'x', library), /엇갈린다/)

  // block — 그리지 않고 충돌 상자만. solid 가 꺼져 있어도 낸다
  const blocked = parseMeshText('material m stone 2\nbox m 0 0 0  1 1 1\nblock 3 1 -2  2 4 6', 'block', library)
  assert.deepEqual(blocked.solids, [[2, -1, -5, 4, 3, 1]])
  assert.equal(blocked.surface.vertices.length / 45, 12)
  assert.throws(() => parseMeshText('block 0 0 0 1 0 1'), /block cx/)

  // 텍스처를 입힌 색유리 — 넷째 칸이 2 이고 층은 그 텍스처다 (단색 색유리는 층 -2, 넷째 칸 1)
  const pane = parseMeshText('material g glass 3.4 #ffffff glass\nmaterial t glass 3.4 #808080\nbox g 0 0 0  1 1 0.1\nbox t 5 0 0  1 1 1', 'pane', library).surface
  assert.deepEqual([pane.vertices[13], pane.vertices[14], pane.vertices[36 * 15 + 13], pane.vertices[36 * 15 + 14]], [2, 1, 0, 1])
  assert.throws(() => parseMeshText('material g glass 3.4 glass shiny', 'x', library), /material <이름>/)

  // 줄여 적은 꼴 — 'ZKSC', 머리의 나머지는 같고, 겉 수(1) · 겉 20 바이트 · 삼각형마다 88 바이트 · 꼬리(충돌 상자)는 그대로
  const [plainBytes, compact] = [encodeMesh(square), encodeCompactMesh(square)]
  assert.equal(compact.length, 32 + 4 + 20 + 12 * 88 + 24)
  assert.deepEqual([...compact.slice(0, 4)], [0x5a, 0x4b, 0x53, 0x43])
  assert.deepEqual([...compact.slice(4, 32)], [...plainBytes.slice(4, 32)])
  assert.deepEqual([...compact.slice(compact.length - 24)], [...plainBytes.slice(plainBytes.length - 24)])
  const view = new DataView(compact.buffer)
  assert.equal(view.getUint32(32, true), 1)
  // 겉: 흰색, 빛남 0, 층 0 · 첫 삼각형의 법선과 겉 번호, 첫 꼭짓점의 자리가 정점을 그대로 적은 것과 같다
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => view.getFloat32(36 + i * 4, true)), [1, 1, 1, 0, 0])
  const first = surfaceVertex(square.surface, 0)
  assert.deepEqual([0, 1, 2].map((i) => view.getFloat32(56 + i * 4, true)), first.n.map((x) => Math.fround(x)))
  assert.equal(view.getUint32(68, true), 0)
  assert.deepEqual([0, 1, 2].map((i) => view.getFloat32(72 + i * 4, true)), first.p.map((x) => Math.fround(x)))
  assert.ok(Math.abs(view.getUint16(92, true) / 65535 - first.lm[0]) < 1e-4 && Math.abs(view.getUint16(94, true) / 65535 - first.lm[1]) < 1e-4)
})

test('겉면 셰이더: 불투명한 겉은 프래그먼트를 버리지 않고 잎만 버린다. 프래그먼트마다 텍스처 읽기는 넷(색·NAR·라이트맵·방향 맵)이고 읽기와 화면 미분은 갈래 밖 한 곳에 모여 있다', () => {
  const wgsl = (name) => readFileSync(join(root, 'game', 'engine', 'render', 'wgsl', name), 'utf8').replace(/\/\/.*$/gm, '')
  const [opaque, cutout, shade] = [wgsl('surface.wgsl'), wgsl('surface_cutout.wgsl'), wgsl(join('include', 'surface_shade.wgsl'))]
  // 버리는 것은 잎 전용 셰이더 한 곳뿐이다 (불투명한 겉은 깊이로 먼저 거른다)
  assert.ok(!/\bdiscard\b/.test(opaque) && !/\bdiscard\b/.test(shade), '불투명한 겉면 셰이더에 discard 가 있다')
  assert.equal((cutout.match(/\bdiscard\b/g) ?? []).length, 1)
  // 텍스처 읽기 — 몸통의 sample_surface 안에 넷, 다른 데는 없다
  const reads = (text) => (text.match(/\btextureSample\w*\s*\(/g) ?? []).length
  assert.deepEqual([reads(shade), reads(opaque), reads(cutout)], [4, 0, 0])
  const sampler = shade.slice(shade.indexOf('fn sample_surface'), shade.indexOf('fn shade'))
  assert.equal(reads(sampler), 4)
  for (const texture of ['albedo', 'nar', 'lightmap', 'light_direction']) assert.match(sampler, new RegExp(`textureSample\\(${texture},`))
  // 화면 미분도 거기서만 (픽셀마다 갈리는 갈래 안에서는 낼 수 없다) — 그리고 잎 셰이더는 버리기 전에 읽는다
  assert.ok(!/\bdpd[xy]\s*\(/.test(shade.replace(sampler, '')) && /\bdpdx\s*\(/.test(sampler))
  assert.ok(cutout.indexOf('sample_surface(') < cutout.indexOf('discard'))
  // 묶음(engine/render/surface_batch.cpp)이 거는 번호와 셰이더의 @binding 이 같다: 0 프레임 · 1 색 · 2 재질 샘플러 · 3 라이트맵 · 4 라이트맵 샘플러 · 5 NAR · 6 방향 맵
  const bindings = [...shade.matchAll(/@binding\((\d)\)\s+var(?:<uniform>)?\s+(\w+)/g)].map((m) => `${m[1]} ${m[2]}`)
  assert.deepEqual(bindings, ['0 frame', '1 albedo', '2 material_sampler', '3 lightmap', '4 lightmap_sampler', '5 nar', '6 light_direction'])
})

/** 방의 틀 — 차례는 domain/dungeon.hpp 의 Room::shape (content/assets.cpp 의 room(shape), CMakeLists.txt 의 ZK_ROOM_SHAPES 와 같다) */
const ROOM_SHAPES = ['room_start', 'room_hall', 'room_nave', 'room_ell', 'room_cross', 'room_tee']

test('방 메시: 묻히는 방 조각들이 겉면 메시로 나가고, 라이트맵 조각이 겹치지 않고, 텍스처 층과 소품 번호가 목록 안이다. 틀은 도구(tools/art/make-rooms.mjs)가 적은 그대로이고, 전투방 틀에는 길의 점과 구울 빛과 색유리가 있다', () => {
  const textures = parseTextureList(readFileSync(join(content, 'textures', 'textures.txt'), 'utf8')).map((t) => t.name)
  const propList = parsePropList(readFileSync(join(content, 'props', 'props.txt'), 'utf8'))
  const props = loadPropLibrary(join(content, 'props', 'props.txt'), join(content, 'props'))
  const propSizes = propList.props.map((p) => decodeModel(readFileSync(join(content, 'props', `${p.name}.zkmodel`))).indices.length / 3)
  for (const name of [...ROOM_SHAPES, 'sealed', 'gate']) {
    const mesh = parseMeshText(readFileSync(join(content, 'meshes', `${name}.mesh.txt`), 'utf8'), name, { textures, props })
    assert.ok(mesh.surface, `${name} 은 재질을 쓴다`)
    assertLightmap(mesh.surface, name)
    assert.ok(mesh.surface.lightmap.width <= 2048 && mesh.surface.lightmap.height <= 2048, `${name} 의 라이트맵 ${mesh.surface.lightmap.width}×${mesh.surface.lightmap.height}`)
    let glass = 0
    let plain = 0
    for (let i = 0; i < mesh.surface.vertices.length / 15; i++) {
      const layer = mesh.surface.vertices[i * 15 + 14]
      const glow = mesh.surface.vertices[i * 15 + 13]
      assert.ok(layer === -1 || layer === -2 || (Number.isInteger(layer) && layer >= 0 && layer < textures.length))
      // 색유리는 텍스처를 입힌 유리다 (넷째 칸 2). 텍스처 없는 면은 스스로 빛나는 것뿐이다 — 단색 장식 면을 쓰지 않는다
      assert.ok(glow === 0 || glow === 1 || (glow === 2 && layer === textures.indexOf('glass_window_001')), `${name}: 빛남 ${glow}, 층 ${layer}`)
      glass += glow === 2
      plain += layer < 0 && glow !== 1
    }
    assert.equal(plain, 0, `${name}: 텍스처도 빛남도 없는 면`)
    assert.ok(mesh.surface.placements.every((p) => p.model < propList.props.length))
    if (!name.startsWith('room_')) continue
    // 틀마다: 등·화덕의 빛이 셋 넘게 있고 색유리창이 있다. 그리는 삼각형은 3 만 개 안 (틀 하나가 그리기 호출 하나다. 소품까지 합쳐 방 하나가 10 만 개 안)
    assert.ok(mesh.surface.lights.length >= 3 && glass > 0, `${name}: 빛 ${mesh.surface.lights.length}, 색유리 정점 ${glass}`)
    assert.ok(mesh.surface.vertices.length / 45 < 30000, `${name}: 삼각형 ${mesh.surface.vertices.length / 45}`)
    const propTriangles = mesh.surface.placements.reduce((sum, p) => sum + propSizes[p.model], 0)
    assert.ok(mesh.surface.vertices.length / 45 + propTriangles < 100000, `${name}: 소품까지 삼각형 ${mesh.surface.vertices.length / 45 + propTriangles}`)
    assert.equal(mesh.surface.nav.length > 0, name !== 'room_start', `${name} 의 길의 점`)
    // 닫힌 실내 — 천장(밑면 y 9)이 있고, 부딪히는 벽이 창턱(y 3.6)까지는 선다
    const ys = Array.from({ length: mesh.surface.vertices.length / 15 }, (_, i) => mesh.surface.vertices[i * 15 + 1])
    assert.ok(Math.max(...ys) >= 9.6 && mesh.solids.some((box) => box[4] >= 3.6), `${name} 의 천장과 벽`)
  }
})

test('팩 도구: 이름 붙은 덩어리들을 문서의 바이트로 묶고, 목록 파일을 읽는다', () => {
  // 머리 16 + 표 (1 + 6 + 8) × 2 = 46 바이트 뒤에 데이터 3 + 1 바이트 — engine_probe 의 팩 검증과 같은 바이트다
  const bytes = encodePack([{ name: 'tile/a', bytes: Uint8Array.of(1, 2, 3) }, { name: 'prop/b', bytes: Uint8Array.of(9) }])
  const ascii = (text) => [...text].map((c) => c.charCodeAt(0))
  assert.deepEqual([...bytes], [
    ...ascii('ZKPK'), 1, 0, 0, 0, 2, 0, 0, 0, 50, 0, 0, 0,
    6, ...ascii('tile/a'), 46, 0, 0, 0, 3, 0, 0, 0,
    6, ...ascii('prop/b'), 49, 0, 0, 0, 1, 0, 0, 0,
    1, 2, 3, 9,
  ])
  assert.deepEqual(decodePack(bytes).map((e) => [e.name, [...e.bytes]]), [['tile/a', [1, 2, 3]], ['prop/b', [9]]])
  assert.throws(() => decodePack(bytes.subarray(0, 49)), /머리가 어긋났다/)
  assert.throws(() => encodePack([{ name: 'a b', bytes: Uint8Array.of(1) }]), /ASCII/)

  // 재질 옵션 — 안 적은 것은 null. 색 고치기(eq, mix), 법선·ARM·거칠기·AO·금속성의 원본
  const plain = { adjust: null, mix: null, nor: null, arm: null, rough: null, ao: null, metal: null }
  assert.deepEqual(parseTextureList('# 주석\ntexture stone a/b.jpg\ntexture sand c.jpg eq=saturation=0.6:brightness=-0.02 # 끝'), [
    { name: 'stone', source: 'a/b.jpg', ...plain },
    { name: 'sand', source: 'c.jpg', ...plain, adjust: 'saturation=0.6:brightness=-0.02' },
  ])
  assert.deepEqual(parseTextureList('texture glass g.jpg metal=!m.jpg mix=1,0,0,0,1,0,0,0,-0.5 nor=n.jpg rough=0.3\ntexture brass b.jpg arm=b_arm.jpg metal=arm ao=o.jpg rough=r.jpg'), [
    { name: 'glass', source: 'g.jpg', ...plain, metal: '!m.jpg', mix: [1, 0, 0, 0, 1, 0, 0, 0, -0.5], nor: 'n.jpg', rough: 0.3 },
    { name: 'brass', source: 'b.jpg', ...plain, arm: 'b_arm.jpg', metal: 'arm', ao: 'o.jpg', rough: 'r.jpg' },
  ])
  assert.throws(() => parseTextureList('texture stone a.jpg mix=1,2,3'), /texture <이름/)
  assert.throws(() => parseTextureList('texture stone a.jpg shiny=1'), /texture <이름/)
  assert.throws(() => parseTextureList('texture stone a.jpg eq=saturation=0.6,scale=1'), /texture <이름/)
  assert.throws(() => parseTextureList('texture stone a.jpg\ntexture stone b.jpg'), /두 번/)
  assert.throws(() => parseTextureList('texture Stone a.jpg'), /texture <이름/)
  assert.deepEqual(parsePropList('texture leaf l.jpg mask m.jpg\ntexture rock r.jpg eq=gamma=1.4\nprop a x.gltf node_a 1500 1.5 solid\nprop b x.gltf node_b 300 2'), {
    textures: [{ name: 'leaf', source: 'l.jpg', mask: 'm.jpg', ...plain }, { name: 'rock', source: 'r.jpg', mask: null, ...plain, adjust: 'gamma=1.4' }],
    props: [{ name: 'a', gltf: 'x.gltf', node: 'node_a', triangles: 1500, scale: 1.5, solid: true }, { name: 'b', gltf: 'x.gltf', node: 'node_b', triangles: 300, scale: 2, solid: false }],
  })
  assert.throws(() => parsePropList('texture leaf l.jpg mask'), /texture <이름>/)
  // 잎(mask)에는 금속성을 같이 적지 못한다 (알파가 하나다). 노드는 쉼표로 여럿, 또는 *
  assert.throws(() => parsePropList('texture leaf l.jpg mask m.jpg metal=arm'), /texture <이름>/)
  assert.equal(parsePropList('texture pot p.jpg metal=arm\nprop pot p.gltf * 900 2').textures[0].metal, 'arm')
  assert.throws(() => parsePropList('prop a x.gltf n 0 1'), /prop <이름>/)
  assert.throws(() => parsePropList('prop a x.gltf n 10 1 hollow'), /prop <이름>/)
  // 무기 — part 는 앞의 weapon 줄(원본, 틀 노드, 손잡이 원점)을 물려받는다
  assert.deepEqual(parseWeaponList('texture gun g.jpg eq=gamma=0.7\nweapon g.gltf frame -0.008 -0.01 0\npart body frame,hammer\npart magazine mag seated'), {
    textures: [{ name: 'gun', source: 'g.jpg', ...plain, adjust: 'gamma=0.7' }],
    parts: [
      { name: 'body', gltf: 'g.gltf', frame: 'frame', origin: [-0.008, -0.01, 0], nodes: ['frame', 'hammer'], seated: false },
      { name: 'magazine', gltf: 'g.gltf', frame: 'frame', origin: [-0.008, -0.01, 0], nodes: ['mag'], seated: true },
    ],
  })
  assert.throws(() => parseWeaponList('part body frame'), /weapon 줄/)
  assert.throws(() => parseWeaponList('weapon g.gltf frame 0 0'), /weapon <gltf>/)
  assert.throws(() => parseWeaponList('weapon g.gltf frame 0 0 0\npart body frame loose'), /part <이름>/)
})

test('에셋 팩: 빌드가 만든 팩에 목록의 타일 텍스처·소품 텍스처·소품·무기 텍스처·무기 부품이 차례대로 들어 있고, 그 뒤로 하늘 그림과 방 틀마다의 구운 빛(틀 여섯 — 라이트맵의 크기와 소품 프로브의 수가 그 틀의 메시와 같다, 프로브 격자에 볕 든 점과 그늘진 점이 다 있고 그늘도 검게 죽지 않는다)이 들어 있다', () => {
  const path = join(root, 'public', 'wasm', 'game-assets.zkpack')
  assert.ok(existsSync(path), '에셋 팩이 없다 — pnpm game:build 를 먼저 돌린다')
  const entries = decodePack(readFileSync(path))
  const textures = parseTextureList(readFileSync(join(content, 'textures', 'textures.txt'), 'utf8'))
  const list = parsePropList(readFileSync(join(content, 'props', 'props.txt'), 'utf8'))
  const weapons = parseWeaponList(readFileSync(join(content, 'weapons', 'weapons.txt'), 'utf8'))
  // 텍스처마다 색, (잘라 낼 모양 또는 금속성), NAR 의 차례다
  const textureEntries = (t, kind, family) => [`${kind}/${t.name}`, ...(t.mask ? [`${family}-mask/${t.name}`] : []), ...(t.metal ? [`${family}-metal/${t.name}`] : []), `${family}-nar/${t.name}`]
  const names = [
    ...textures.flatMap((t) => textureEntries(t, 'tile', 'tile')),
    ...list.textures.flatMap((t) => textureEntries(t, 'prop-texture', 'prop')),
    ...list.props.map((p) => `prop/${p.name}`),
    ...weapons.textures.flatMap((t) => textureEntries(t, 'weapon-texture', 'weapon')),
    ...weapons.parts.map((p) => `weapon/${p.name}`),
    'sky/image',
    // 구운 빛 — 틀마다 한 장. 이름은 gameplay/content/room_light.hpp 의 room_light_name 과 같다
    ...ROOM_SHAPES.map((_, shape) => `light/${shape}`),
  ]
  assert.deepEqual(entries.map((e) => e.name), names)
  // 구운 빛 — 'ZKLT', 라이트맵의 크기와 놓인 소품 수가 그 틀의 메시와 같고, 프로브 격자 21 × 21 이 있고, 라이트맵은 같은 크기의 QOI 다.
  // 틀의 차례(ROOM_SHAPES)는 content/assets.cpp 의 room(shape) 과 CMakeLists.txt 의 ZK_ROOM_SHAPES 가 같아야 한다
  const meshOf = (name) =>
    parseMeshText(readFileSync(join(content, 'meshes', `${name}.mesh.txt`), 'utf8'), name, { textures: textures.map((t) => t.name), props: loadPropLibrary(join(content, 'props', 'props.txt'), join(content, 'props')) }).surface
  const shapes = ROOM_SHAPES.map(meshOf)
  const GRID = 21 * 21
  /** 구운 틀의 머리 (gameplay/content/room_light.hpp) */
  const HEAD = 28
  let lightBytes = 0
  for (const entry of entries.filter((e) => e.name.startsWith('light/'))) {
    const [, shape] = /^light\/(\d)$/.exec(entry.name)
    const mesh = shapes[Number(shape)]
    const view = new DataView(entry.bytes.buffer, entry.bytes.byteOffset, entry.bytes.byteLength)
    const [width, height, placements, grid, qoi, toward] = [4, 8, 12, 16, 20, 24].map((at) => view.getUint32(at, true))
    assert.equal(Buffer.from(entry.bytes.subarray(0, 4)).toString('latin1'), 'ZKL2', entry.name)
    assert.deepEqual([width, height, placements, grid], [mesh.lightmap.width, mesh.lightmap.height, mesh.placements.length, GRID], entry.name)
    // 라이트맵과 방향 맵 — 같은 크기의 QOI 둘이 이어져 있다
    const images = entry.bytes.subarray(HEAD + (placements + grid) * 28)
    assert.equal(images.length, qoi + toward, entry.name)
    for (const image of [images.subarray(0, qoi), images.subarray(qoi)])
      assert.deepEqual([Buffer.from(image.subarray(0, 4)).toString('latin1'), image.readUInt32BE(4), image.readUInt32BE(8)], ['qoif', width, height], entry.name)
    // 프로브의 값 — 해가 보이는 정도는 0…1, 빛은 음수가 아니다
    for (let i = 0; i < placements + grid; i++) {
      const probe = Array.from({ length: 7 }, (_, k) => view.getFloat32(HEAD + (i * 7 + k) * 4, true))
      assert.ok(probe.every((v) => v >= 0 && v < 8) && probe[6] <= 1, `${entry.name} 의 프로브 ${i}: ${probe}`)
    }
    lightBytes += entry.bytes.length
  }
  // 닫힌 실내 — 볕은 창과 채광 구멍 밑에만 든다: 격자 441 점 가운데 해가 반 넘게 보이는 점이 있되 다섯에 하나를 넘지 않는다.
  // 그늘진 점도 검게 죽지 않는다 (위를 보는 면이 받는 빛의 초록이 0.15 를 넘는다 — 채움빛 0.2 언저리. 적이 그늘에서도 보인다), 볕 든 바닥(1.5)보다는 한참 어둡다 (가운데 값이 0.6 아래)
  for (const shape of ROOM_SHAPES.keys()) {
    const entry = entries.find((e) => e.name === `light/${shape}`)
    const view = new DataView(entry.bytes.buffer, entry.bytes.byteOffset, entry.bytes.byteLength)
    const grid = Array.from({ length: GRID }, (_, i) => HEAD + (view.getUint32(12, true) + i) * 28)
    const sunny = grid.filter((at) => view.getFloat32(at + 24, true) > 0.5)
    const fill = grid.map((at) => view.getFloat32(at + 4, true)).sort((a, b) => a - b)
    assert.ok(sunny.length >= 2 && sunny.length < GRID / 5, `틀 ${shape}: 볕 든 격자 점 ${sunny.length}`)
    assert.ok(fill[0] > 0.15 && fill[GRID >> 1] < 0.6, `틀 ${shape}: 그늘의 빛 ${fill[0]} … 가운데 ${fill[GRID >> 1]}`)
  }
  // 구운 빛은 12 MB 안, 팩 전체는 48 MB 안 (2026-10-10 에 4 MB · 8 MB 에서 올렸다 — 배포하지 않는 빌드라 크기보다 품질을 택했다:
  // 틀마다 라이트맵에 방향 맵이 하나 더 붙고, 텍스처마다 법선·거칠기(NAR)가 붙고, 재질과 소품이 늘었다)
  assert.ok(lightBytes < 12 * 1024 * 1024, `구운 빛이 ${lightBytes} 바이트다`)
  assert.ok(statSync(path).size < 48 * 1024 * 1024, `에셋 팩이 ${statSync(path).size} 바이트다`)
  // 무기의 부품은 게임이 번호로 부른다 (presentation/weapon.hpp 의 WeaponPart) — 차례가 바뀌면 안 된다
  assert.deepEqual(weapons.parts.map((p) => p.name), ['pistol_body', 'pistol_slide', 'pistol_magazine', 'pistol_magazine_empty'])
  const bounds = new Map()
  // 텍스처는 JPEG, 소품은 .zkmodel 이고 층 번호가 소품 텍스처의 수 안이다
  for (const entry of entries) {
    if (entry.name.startsWith('weapon/')) {
      const model = decodeModel(entry.bytes)
      assert.ok(model.indices.length % 3 === 0 && model.indices.every((i) => i < model.vertexCount), entry.name)
      const [low, high] = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]]
      for (let i = 0; i < model.vertexCount; i++) {
        assert.ok(model.vertices[i * 9 + 8] >= 0 && model.vertices[i * 9 + 8] < weapons.textures.length, entry.name)
        for (let axis = 0; axis < 3; axis++) [low[axis], high[axis]] = [Math.min(low[axis], model.vertices[i * 9 + axis]), Math.max(high[axis], model.vertices[i * 9 + axis])]
      }
      bounds.set(entry.name.slice(7), { low, high })
      continue
    }
    if (entry.name.startsWith('light/')) continue
    if (!entry.name.startsWith('prop/')) {
      assert.deepEqual([entry.bytes[0], entry.bytes[1]], [0xff, 0xd8], entry.name)
      continue
    }
    const model = decodeModel(entry.bytes)
    assert.ok(model.indices.length % 3 === 0 && model.indices.every((i) => i < model.vertexCount), entry.name)
    for (let i = 0; i < model.vertexCount; i++) assert.ok(model.vertices[i * 9 + 8] >= 0 && model.vertices[i * 9 + 8] < list.textures.length, entry.name)
    // 목표보다 많지 않다
    assert.ok(model.indices.length / 3 <= list.props.find((p) => `prop/${p.name}` === entry.name).triangles, entry.name)
  }
  // 권총은 실제 크기(m)로, 손잡이가 원점이고 총구가 -z 다: 몸통은 앞으로 18 cm·뒤로 4 cm, 위로 9 cm·아래로 4 cm, 두께 3 cm
  const near = (value, expected, slack = 0.002) => Math.abs(value - expected) <= slack
  const { low, high } = bounds.get('pistol_body')
  assert.ok(near(low[2], -0.182) && near(high[2], 0.040) && near(low[1], -0.041) && near(high[1], 0.088) && near(low[0], -0.016) && near(high[0], 0.016), `몸통 ${low} … ${high}`)
  // 슬라이드는 몸통 위에 얹혀 있고(위 끝이 같다) 몸통 길이 안이다
  const slide = bounds.get('pistol_slide')
  assert.ok(near(slide.high[1], high[1]) && slide.low[1] > 0.05 && slide.low[2] > low[2] && slide.high[2] < high[2], `슬라이드 ${slide.low} … ${slide.high}`)
  // 탄창은 손잡이 속에 든다 — 몸통의 두께와 앞뒤 안, 밑은 손잡이 밑과 같은 높이
  for (const name of ['pistol_magazine', 'pistol_magazine_empty']) {
    const magazine = bounds.get(name)
    assert.ok(magazine.low[0] > low[0] && magazine.high[0] < high[0] && magazine.low[2] > low[2] && magazine.high[2] <= high[2] + 1e-6 && near(magazine.low[1], low[1]) && magazine.high[1] < high[1], `${name} ${magazine.low} … ${magazine.high}`)
  }
})

/** 삼각형의 넓이가 0 이 아닌가 (꼭짓점 셋이 서로 다른 자리) */
const solidTriangles = (mesh) => {
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [0, 1, 2].map((axis) => mesh.positions[mesh.indices[t + k] * 3 + axis]))
    const [u, v] = [b.map((x, i) => x - a[i]), c.map((x, i) => x - a[i])]
    if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) < 1e-12) return false
  }
  return true
}

test('glTF 도구: 노드의 변환을 합쳐 삼각형을 옮기고, 목표 수 아래로 줄이고, 밑면을 바닥에 놓아 .zkmodel 로 적는다', () => {
  // 손으로 만든 glTF — xy 평면의 1 × 1 사각형(삼각형 둘). 노드는 2 배로 키우고 y 축으로 90 도 돌려 (1, 2, 3) 에 놓고, 부모가 x 로 10 옮긴다
  const buffer = Buffer.alloc(140)
  const positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]
  positions.forEach((v, i) => buffer.writeFloatLE(v, i * 4))
  for (let i = 0; i < 4; i++) buffer.writeFloatLE(1, 48 + i * 12 + 8)
  ;[0, 1, 1, 1, 1, 0, 0, 0].forEach((v, i) => buffer.writeFloatLE(v, 96 + i * 4))
  ;[0, 1, 2, 0, 2, 3].forEach((v, i) => buffer.writeUInt16LE(v, 128 + i * 2))
  const gltf = () => ({
    asset: { version: '2.0' },
    nodes: [
      { name: 'root', translation: [10, 0, 0], children: [1] },
      { name: 'quad', mesh: 0, translation: [1, 2, 3], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2], scale: [2, 2, 2] },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ alphaMode: 'MASK', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    textures: [{ source: 1 }],
    images: [{ uri: 'other.jpg' }, { uri: 'leaf.jpg' }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 4, type: 'VEC2' },
      { bufferView: 3, componentType: 5123, count: 6, type: 'SCALAR' },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 48 }, { buffer: 0, byteOffset: 48, byteLength: 48 }, { buffer: 0, byteOffset: 96, byteLength: 32 }, { buffer: 0, byteOffset: 128, byteLength: 12 }],
    buffers: [{ byteLength: 140 }],
  })
  const mesh = extractNode(gltf(), [buffer], 'quad')
  // (x, y, 0) → 2 배 → y 축 90 도 (x → -z) → + (1, 2, 3) → + (10, 0, 0): (0,0) → (11, 2, 3), (1,0) → (11, 2, 1), (1,1) → (11, 4, 1), (0,1) → (11, 4, 3)
  const rounded = (values) => values.map((v) => Math.round(v * 1e5) / 1e5 + 0)
  assert.deepEqual(rounded(mesh.positions), [11, 2, 3, 11, 2, 1, 11, 4, 1, 11, 4, 3])
  // 법선 (0, 0, 1) 은 돌아서 (1, 0, 0) — 크기는 타지 않는다
  assert.deepEqual(rounded(mesh.normals), [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0])
  assert.deepEqual([mesh.uvs, mesh.indices, mesh.images, mesh.twoSided], [[0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], [1, 1, 1, 1], true])

  // 반으로 줄여 놓는다 — 밑면이 y 0, 옆으로는 감싸는 상자의 가운데가 원점: z 1…3 의 가운데 2 를 빼고 0.5 배. 그림 1 은 층 5 로
  const model = settle(mesh, 0.5, (image) => image + 4)
  assert.deepEqual([...model.vertices].map((v) => Math.round(v * 1e5) / 1e5 + 0), [
    0, 0, 0.5, 1, 0, 0, 0, 1, 5,
    0, 0, -0.5, 1, 0, 0, 1, 1, 5,
    0, 1, -0.5, 1, 0, 0, 1, 0, 5,
    0, 1, 0.5, 1, 0, 0, 0, 0, 5,
  ])
  // 'ZKMD' · 정점 4 · 인덱스 6 · 표시 3(양면 1 + 알파로 잘라 내기 2 — 재질이 MASK 다), 그 뒤로 정점 36 바이트씩, 인덱스 4 바이트씩
  const bytes = encodeModel(model)
  assert.equal(bytes.length, 16 + 4 * 36 + 6 * 4)
  assert.deepEqual([...bytes.slice(0, 16)], [0x5a, 0x4b, 0x4d, 0x44, 4, 0, 0, 0, 6, 0, 0, 0, 3, 0, 0, 0])
  assert.deepEqual([...bytes.slice(16 + 4 * 36)], [0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0])
  const back = decodeModel(bytes)
  assert.deepEqual([back.vertexCount, [...back.indices], back.twoSided, back.cutout, [...back.vertices]], [4, [0, 1, 2, 0, 2, 3], true, true, [...model.vertices]])
  // 재질이 양면(doubleSided)이기만 한 모델은 잘라 내지 않는다 — 표시 1 (불투명한 기물: 텍스처의 알파는 금속성으로 쓰인다)
  const opaque = encodeModel({ ...model, cutout: false })
  assert.deepEqual([opaque[12], decodeModel(opaque).twoSided, decodeModel(opaque).cutout], [1, true, false])

  // 받은 파일은 믿지 않는다 — 확장, 버퍼를 벗어나는 accessor, 정점을 벗어나는 인덱스, 없는 노드
  assert.throws(() => extractNode({ ...gltf(), extensionsRequired: ['KHR_draco_mesh_compression'] }, [buffer], 'quad'), /확장/)
  assert.throws(() => extractNode(gltf(), [buffer.subarray(0, 100)], 'quad'), /버퍼를 벗어난다/)
  const wild = Buffer.from(buffer)
  wild.writeUInt16LE(4, 128)
  assert.throws(() => extractNode(gltf(), [wild], 'quad'), /인덱스가 정점을 벗어난다/)
  assert.throws(() => extractNode(gltf(), [buffer], 'nope'), /노드 'nope' 이 없다/)
  const stretched = gltf()
  stretched.nodes[1].scale = [1, 2, 1]
  assert.throws(() => extractNode(stretched, [buffer], 'quad'), /축마다 다르다/)

  // 무기의 부품 — 총구가 +x 인 원본을 총구가 -z 인 틀로: 틀 노드의 자리와 손잡이 원점을 빼고 (x, y, z) → (z, y, -x). 바닥에 놓지 않는다.
  // 노드 quad 의 원점은 (11, 2, 3). 그것을 틀로, 손잡이를 (0, 1, 0) 에 두면 (11, 2, 3) → (0, -1, 0) → (0, -1, 0), (11, 4, 1) → (0, 1, -2) → (-2, 1, 0)
  assert.deepEqual(rounded(nodeOrigin(gltf(), 'quad')), [11, 2, 3])
  const part = extractWeaponPart(gltf(), [buffer], ['quad'], nodeOrigin(gltf(), 'quad'), [0, 1, 0], false)
  assert.deepEqual(rounded(part.positions), [0, -1, 0, -2, -1, 0, -2, 1, 0, 0, 1, 0])
  // 법선 (1, 0, 0)(총구 쪽) 은 (0, 0, -1) 로
  assert.deepEqual(rounded(part.normals), [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1])
  assert.deepEqual([part.uvs, part.indices, part.twoSided], [[0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], true])
  // seated — 노드의 제 자리를 버린다 (틀이 어디든 같은 결과). 노드 둘을 합치면 인덱스가 이어진다
  const seated = extractWeaponPart(gltf(), [buffer], ['quad', 'quad'], [100, 100, 100], [0, 1, 0], true)
  assert.deepEqual(rounded(seated.positions), [...rounded(part.positions), ...rounded(part.positions)])
  assert.deepEqual(seated.indices, [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  assert.deepEqual([...settle(part, 1, () => 0, false).vertices].slice(0, 9).map((v) => Math.round(v * 1e5) / 1e5 + 0), [0, -1, 0, 0, 0, -1, 0, 1, 0])

  // 줄이기 — 20 × 20 칸의 굴곡진 판(삼각형 800 개) 둘이 같은 자리에 겹쳐 있고 uv 는 서로 다른 섬(u 0…1 과 u 2…3)이다
  const grid = { positions: [], normals: [], uvs: [], images: [], indices: [], twoSided: false }
  for (const island of [0, 1])
    for (let j = 0; j <= 20; j++)
      for (let i = 0; i <= 20; i++) {
        grid.positions.push(i / 20, 0.1 * Math.sin(i / 3) * Math.cos(j / 4), j / 20)
        grid.normals.push(0, 1, 0)
        grid.uvs.push(island * 2 + i / 20, j / 20)
        grid.images.push(0)
      }
  for (const island of [0, 1])
    for (let j = 0; j < 20; j++)
      for (let i = 0; i < 20; i++) {
        const at = island * 441 + j * 21 + i
        grid.indices.push(at, at + 21, at + 1, at + 1, at + 21, at + 22)
      }
  const small = simplify(grid, 200)
  assert.ok(small.indices.length / 3 <= 200 && small.indices.length / 3 >= 100, `삼각형 1600 → ${small.indices.length / 3} (목표 200 이하, 지나치게 줄이지 않는다)`)
  assert.ok(solidTriangles(small), '넓이가 0 인 삼각형이 없다')
  // 섬이 다른 정점의 uv 는 섞이지 않는다 (u 1…2 사이의 값이 나오지 않는다)
  assert.ok(small.uvs.every((v, i) => i % 2 === 1 || v <= 1 + 1e-9 || v >= 2 - 1e-9))
  // 모양은 감싸는 상자 안에 남는다
  assert.ok(small.positions.every((v, i) => (i % 3 === 1 ? Math.abs(v) <= 0.1 + 1e-9 : v >= -1e-9 && v <= 1 + 1e-9)))
  // 이미 목표보다 적으면 그대로 둔다
  assert.equal(simplify(grid, 5000), grid)
})

test('글꼴 도구: 윤곽을 덮인 정도로 칠하고 .fontbin 으로 적는다', () => {
  // 3×4 픽셀에 x 0.25…2, y 1…3 인 사각형 — 첫 칸은 3/4(191), 둘째 칸은 가득(255), 셋째 칸과 위아래 줄은 빈다
  const square = [[0.25, 1], [2, 1], [2, 3], [0.25, 3]]
  assert.deepEqual([...rasterize([square], 3, 4)], [0, 0, 0, 191, 255, 0, 191, 255, 0, 0, 0, 0])
  // 거꾸로 감긴 윤곽도 안쪽이다 (감긴 수가 0 이 아니면 안)
  assert.deepEqual([...rasterize([[...square].reverse()], 3, 4)], [0, 0, 0, 191, 255, 0, 191, 255, 0, 0, 0, 0])
  // 같은 방향으로 감긴 안쪽 윤곽은 구멍이 아니고, 반대로 감긴 것은 구멍이다 — 4×1 에 x 0…4 와 그 안의 x 1…2
  const outer = [[0, 0], [4, 0], [4, 1], [0, 1]]
  const inner = [[1, 0], [2, 0], [2, 1], [1, 1]]
  assert.deepEqual([...rasterize([outer, inner], 4, 1)], [255, 255, 255, 255])
  assert.deepEqual([...rasterize([outer, [...inner].reverse()], 4, 1)], [255, 0, 255, 255])

  // 영문·숫자·기호 95 + 완성형 한글 2,350 + 문장부호·화살표 12, 코드 순
  const codes = bakedCodepoints()
  assert.equal(codes.length, 95 + 2350 + 12)
  assert.deepEqual([codes[0], codes[94], codes.at(-1)], [0x20, 0x7e, 0xd79d])
  assert.ok(codes.includes(0xac00) && codes.includes(0xb7) && !codes.includes(0xac02))
  // 글자 파일로 고른 면 — 영문·숫자·기호 95 + 문장부호·화살표 12 + 파일의 글자(공백·줄바꿈은 빼고, 겹친 것은 한 번): 가, 나
  const subset = subsetCodepoints('가 나\n가A')
  assert.equal(subset.length, 95 + 12 + 2)
  assert.ok(subset.includes(0xac00) && subset.includes(0xb098) && subset.includes(0x41) && !subset.includes(0xb2e4))
  assert.deepEqual(subset, [...subset].sort((a, b) => a - b))

  // 머리 12 바이트 + 면마다 16 바이트 + 글자마다 24 바이트 + 아틀라스. 면 둘: 첫 면은 글자 하나, 둘째 면은 글자 없음
  const bytes = encodeFont({
    width: 4, height: 2, atlas: Uint8Array.of(255, 255, 0, 7, 255, 255, 0, 9),
    faces: [
      { size: 32, lineHeight: 40, ascent: 30, glyphs: [{ code: 0x41, x: 3, y: 0, w: 1, h: 2, left: 1, top: 2, advance: 16 }] },
      { size: 64, lineHeight: 80, ascent: 60, glyphs: [] },
    ],
  })
  assert.equal(bytes.length, 12 + 2 * 16 + 24 + 8)
  // 'ZKFT', 너비 4, 높이 2, 면 2
  assert.deepEqual([...bytes.slice(0, 12)], [0x5a, 0x4b, 0x46, 0x54, 4, 0, 2, 0, 2, 0, 0, 0])
  // 면 0: 32.0f(0x42000000), 40.0f(0x42200000), 30.0f(0x41f00000), 글자 1 · 면 1: 64.0f(0x42800000), 80.0f(0x42a00000), 60.0f(0x42700000), 글자 0
  assert.deepEqual([...bytes.slice(12, 28)], [0, 0, 0, 0x42, 0, 0, 0x20, 0x42, 0, 0, 0xf0, 0x41, 1, 0, 0, 0])
  assert.deepEqual([...bytes.slice(28, 44)], [0, 0, 0x80, 0x42, 0, 0, 0xa0, 0x42, 0, 0, 0x70, 0x42, 0, 0, 0, 0])
  // 코드 0x41, 칸 (3, 0) 1×2, 왼쪽 1.0f(0x3f800000), 위 2.0f(0x40000000), 나아감 16.0f(0x41800000)
  assert.deepEqual([...bytes.slice(44, 68)], [0x41, 0, 0, 0, 3, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0x80, 0x3f, 0, 0, 0, 0x40, 0, 0, 0x80, 0x41])
  assert.deepEqual([...bytes.slice(68)], [255, 255, 0, 7, 255, 255, 0, 9])
})

const woff = (weight) => join(root, `node_modules/pretendard/dist/web/static/woff/Pretendard-${weight}.woff`)
const contentFile = (path) => readFileSync(join(root, 'game/gameplay/content', path), 'utf8')

test('글꼴 도구: Pretendard 에 구울 글자가 면마다 모두 있고, 그 치수대로 굽는다. 숫자는 고정 폭(tnum)으로 굽는다', () => {
  // 빌드(game/CMakeLists.txt 의 --face 셋)가 굽는 파일과 글자
  const regular = loadFont(woff('Regular'))
  const bold = loadFont(woff('Bold'))
  assert.deepEqual(bakedCodepoints().filter((code) => regular.tables.cmap.glyphIndexMap[code] === undefined), [])
  for (const list of ['fonts/bold.txt', 'fonts/display.txt'])
    assert.deepEqual(subsetCodepoints(contentFile(list)).filter((code) => bold.tables.cmap.glyphIndexMap[code] === undefined), [], list)

  // 2048 단위 em 에 ascender 1950, descender -494: 32 픽셀로 구우면 밑줄까지 30.46875, 줄 높이 38.1875. 둘째 면은 Bold 를 64 픽셀로 — 두 배
  const baked = bakeFont([
    { font: regular, size: 32, codepoints: [...' 01I가'].map((char) => char.codePointAt(0)) },
    { font: bold, size: 64, codepoints: [...'1A'].map((char) => char.codePointAt(0)) },
  ])
  assert.deepEqual(baked.faces.map((face) => [face.size, face.ascent, face.lineHeight]), [[32, 30.46875, 38.1875], [64, 60.9375, 76.375]])
  const [space, zero, one, bar, ga] = baked.faces[0].glyphs
  // 띄어쓰기는 그림 없이 나아가기만 한다
  assert.deepEqual([space.code, space.w, space.h], [0x20, 0, 0])
  assert.ok(space.advance > 0)
  // 숫자는 고정 폭 글리프(tnum, 나아감 1258) — 32 픽셀에서 19.65625. 여느 '0' 은 1220, '1' 은 898 이라 서로 다르다
  assert.deepEqual([regular.charToGlyph('0').advanceWidth, regular.charToGlyph('1').advanceWidth], [1220, 898])
  assert.deepEqual([zero.advance, one.advance], [19.65625, 19.65625])
  // 'I' 는 세로 막대 하나다 — 칸의 가운데 줄은 가운데가 가득 차고, 칸은 밑줄(ascent) 위에 놓인다
  const middle = [...bar.pixels.subarray(Math.floor(bar.h / 2) * bar.w, (Math.floor(bar.h / 2) + 1) * bar.w)]
  assert.ok(middle.includes(255), `'I' 의 가운데 줄: ${middle}`)
  assert.ok(bar.top >= 0 && bar.top + bar.h <= Math.ceil(baked.faces[0].ascent) && bar.w < bar.h / 3)
  // 한글은 전각에 가깝다 — 나아감이 글자 크기의 0.8…1 배이고, 칸이 비어 있지 않다
  assert.ok(ga.advance > 0.8 * 32 && ga.advance <= 32 && ga.pixels.some((v) => v === 255))
  // Bold 64 픽셀: 고정 폭 숫자 1340 / 2048 × 64 = 41.875, 'A' 1470 / 2048 × 64 = 45.9375
  assert.deepEqual(baked.faces[1].glyphs.map((glyph) => [glyph.code, glyph.advance]), [[0x31, 41.875], [0x41, 45.9375]])
  // 아틀라스에는 가득 찬 칸(2×2)과 두 면의 글자들이 겹치지 않게 놓인다
  assert.deepEqual([baked.atlas[0], baked.atlas[1], baked.atlas[baked.width], baked.atlas[baked.width + 1]], [255, 255, 255, 255])
  const placed = baked.faces.flatMap((face) => face.glyphs).filter((glyph) => glyph.w > 0)
  for (const a of placed) {
    assert.ok(a.x >= 3 || a.y >= 3, '글자가 가득 찬 칸을 덮지 않는다')
    for (const b of placed) assert.ok(a === b || a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, '글자 칸이 겹치지 않는다')
  }
})

/** PNG 조각 — 길이(빅 엔디언), 종류, 내용, CRC (읽는 쪽이 보지 않아 0 으로 둔다) */
function pngChunk(type, data) {
  const length = [data.length >>> 24, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255]
  return [...length, ...[...type].map((char) => char.charCodeAt(0)), ...data, 0, 0, 0, 0]
}
function png(width, height, colorType, rows, extra = []) {
  const header = [0, 0, 0, width, 0, 0, 0, height, 8, colorType, 0, 0, 0]
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...pngChunk('IHDR', header), ...extra, ...pngChunk('IDAT', deflateSync(Uint8Array.from(rows.flat()))), ...pngChunk('IEND', [])])
}

test('그림 도구: PNG 를 풀고(줄 필터 다섯 가지), 큰 그림은 넓이 평균으로 줄이고, QOI 로 적는다', () => {
  // 2×5 RGB — 줄마다 필터가 다르다 (첫 바이트). 기대값은 필터를 손으로 되돌린 것:
  //   None  (10,20,30) (40,50,60)
  //   Up    +위            → (11,21,31) (42,52,62)
  //   Sub   +왼쪽          → (5,5,5) (6,7,8)
  //   Paeth 왼쪽·위·왼쪽 위 가운데 a+b-c 에 가장 가까운 것: 첫 픽셀은 위(5) → (6,6,6), 둘째는 빨강이 왼쪽(6), 초록·파랑이 위(7, 8) → (7,8,9)
  //   Average +⌊(왼쪽+위)/2⌋: 첫 픽셀 ⌊6/2⌋=3 → (5,5,5), 둘째 ⌊(5+7)/2⌋, ⌊(5+8)/2⌋, ⌊(5+9)/2⌋ = 6,6,7 → (6,6,7)
  const rgb = decodePng(png(2, 5, 2, [[0, 10, 20, 30, 40, 50, 60], [2, 1, 1, 1, 2, 2, 2], [1, 5, 5, 5, 1, 2, 3], [4, 1, 1, 1, 1, 1, 1], [3, 2, 2, 2, 0, 0, 0]]))
  assert.deepEqual([rgb.width, rgb.height], [2, 5])
  assert.deepEqual([...rgb.rgba], [10, 20, 30, 255, 40, 50, 60, 255, 11, 21, 31, 255, 42, 52, 62, 255, 5, 5, 5, 255, 6, 7, 8, 255, 6, 6, 6, 255, 7, 8, 9, 255, 5, 5, 5, 255, 6, 6, 7, 255])
  // RGBA 는 알파를 그대로, 회색은 세 채널에, 팔레트는 번호를 색으로 (tRNS 가 있으면 그 알파)
  assert.deepEqual([...decodePng(png(1, 1, 6, [[0, 1, 2, 3, 4]])).rgba], [1, 2, 3, 4])
  assert.deepEqual([...decodePng(png(2, 1, 0, [[0, 7, 200]])).rgba], [7, 7, 7, 255, 200, 200, 200, 255])
  const palette = [...pngChunk('PLTE', [9, 8, 7, 1, 2, 3]), ...pngChunk('tRNS', [128])]
  assert.deepEqual([...decodePng(png(2, 1, 3, [[0, 1, 0]], palette)).rgba], [1, 2, 3, 255, 9, 8, 7, 128])

  assert.throws(() => decodePng(Uint8Array.of(1, 2, 3)), /PNG 파일이 아니다/)
  // 16 비트, 인터레이스 — 읽지 않는 것은 까닭을 적고 멈춘다
  const deep = png(1, 1, 2, [[0, 1, 2, 3]])
  deep[24] = 16
  assert.throws(() => decodePng(deep), /읽지 못하는 PNG/)
  const interlaced = png(1, 1, 2, [[0, 1, 2, 3]])
  interlaced[28] = 1
  assert.throws(() => decodePng(interlaced), /읽지 못하는 PNG/)
  assert.throws(() => decodePng(png(2, 1, 2, [[0, 1, 2, 3]])), /크기가 맞지 않는다/)
  assert.throws(() => decodePng(png(1, 1, 3, [[0, 5]], pngChunk('PLTE', [9, 8, 7]))), /팔레트 밖/)

  // 4×2 회색을 2×1 안에 — 절반으로: 새 픽셀은 2×2 의 평균. (0+10+40+50)/4 = 25, (20+30+60+70)/4 = 45
  const grey = (...values) => Uint8Array.from(values.flatMap((v) => [v, v, v, 255]))
  const half = fitInside({ width: 4, height: 2, rgba: grey(0, 10, 20, 30, 40, 50, 60, 70) }, 2, 1)
  assert.deepEqual([half.width, half.height, ...half.rgba], [2, 1, 25, 25, 25, 255, 45, 45, 45, 255])
  // 3×1 을 2×1 로 — 새 픽셀 하나가 원본 1.5 칸: (0·1 + 30·0.5)/1.5 = 10, (30·0.5 + 90·1)/1.5 = 70
  const twoThirds = fitInside({ width: 3, height: 1, rgba: grey(0, 30, 90) }, 2, 8)
  assert.deepEqual([twoThirds.width, twoThirds.height, ...twoThirds.rgba], [2, 1, 10, 10, 10, 255, 70, 70, 70, 255])
  // 넘지 않는 그림은 그대로 (키우지 않는다)
  const small = { width: 3, height: 1, rgba: grey(0, 30, 90) }
  assert.deepEqual(fitInside(small, 1920, 1080), small)

  // QOI — 7×1 픽셀이 묶음 종류마다 하나씩으로 적힌다 (tests/engine_probe.cpp 의 qoi_bytes 와 같은 바이트 — 엔진이 그대로 읽는다):
  //   (16,32,48) RGB · (17,30,48) DIFF(+1,-2,0) = 0x40|3<<4|0<<2|2 · (19,35,55) LUMA(초록 +5 → 0x80|37, 빨강 2-5+8=5·파랑 7-5+8=10 → 0x5a)
  //   · 같은 픽셀 둘 RUN 2 = 0xc0|1 · (16,32,48) INDEX (16·3+32·5+48·7+255·11) mod 64 = 21 · (1,2,3,4) 알파가 바뀌어 RGBA
  const qoi = encodeQoi({ width: 7, height: 1, rgba: Uint8Array.of(16, 32, 48, 255, 17, 30, 48, 255, 19, 35, 55, 255, 19, 35, 55, 255, 19, 35, 55, 255, 16, 32, 48, 255, 1, 2, 3, 4) })
  assert.deepEqual([...qoi], [
    0x71, 0x6f, 0x69, 0x66, 0, 0, 0, 7, 0, 0, 0, 1, 4, 0,
    0xfe, 16, 32, 48, 0x72, 0xa5, 0x5a, 0xc1, 0x15, 0xff, 1, 2, 3, 4,
    0, 0, 0, 0, 0, 0, 0, 1,
  ])
  // 같은 픽셀 63 개 — RUN 은 62 까지라 62 와 1 로 나뉜다. 처음의 '앞 픽셀'은 불투명한 검정이다
  assert.deepEqual([...encodeQoi({ width: 63, height: 1, rgba: Uint8Array.from({ length: 63 * 4 }, (_, i) => (i % 4 === 3 ? 255 : 0)) }).slice(14)], [0xfd, 0xc0, 0, 0, 0, 0, 0, 0, 0, 1])
})

test('메뉴 배경 그림: 빌드가 묻는 원본이 있으면 imagec 가 읽을 수 있고, 묻히는 크기 안에 든다', { skip: !existsSync(join(root, 'game/gameplay/content/images/zendikar-main-tazeem-v1.png')) }, () => {
  // game/CMakeLists.txt 의 ZK_MENU_BACKGROUND_SOURCE · ZK_IMAGE_MAX_WIDTH/HEIGHT
  const fitted = fitInside(decodePng(readFileSync(join(root, 'game/gameplay/content/images/zendikar-main-tazeem-v1.png'))), 1920, 1080)
  assert.ok(fitted.width <= 1920 && fitted.height <= 1080 && fitted.rgba.length === fitted.width * fitted.height * 4)
})

/** WAV — RIFF 머리, fmt 조각(종류, 채널, 표본율, 비트), data 조각. extra 는 fmt 앞에 끼우는 조각들 */
function wav({ kind = 1, channels = 1, rate = 1000, bits = 16, data, extensible = false, extra = [] }) {
  const u16 = (v) => [v & 255, (v >> 8) & 255]
  const u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]
  const text = (t) => [...t].map((char) => char.charCodeAt(0))
  const block = (bits / 8) * channels
  const format = [...u16(extensible ? 0xfffe : kind), ...u16(channels), ...u32(rate), ...u32(rate * block), ...u16(block), ...u16(bits)]
  // EXTENSIBLE: 뒤에 22 바이트(유효 비트, 채널 배치, SubFormat GUID — 앞 두 바이트가 실제 종류)
  if (extensible) format.push(...u16(22), ...u16(bits), ...u32(0), ...u16(kind), 0, 0, 0, 0, 0x10, 0, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71)
  const body = [...text('WAVE'), ...extra, ...text('fmt '), ...u32(format.length), ...format, ...text('data'), ...u32(data.length), ...data]
  return Uint8Array.from([...text('RIFF'), ...u32(body.length), ...body])
}

test('샘플 도구: WAV 풀기(16·24 비트, float, EXTENSIBLE, 스테레오는 평균), 무음 자르기와 꼬리 줄이기, 샘플 목록과 출처 검사, 뱅크 적기', () => {
  // 16 비트 모노: 0, 16384(0.5), -32768(-1)
  assert.deepEqual([...decodeWav(wav({ data: [0, 0, 0, 0x40, 0, 0x80] })).frames], [0, 0.5, -1])
  // 24 비트 스테레오: (0x400000, -0x400000) → 평균 0 · (0x200000, 0x600000) = (0.25, 0.75) → 0.5. 앞에 홀수 길이 조각(3 바이트 + 채움 1)이 끼어 있다
  const stereo = decodeWav(wav({ channels: 2, bits: 24, rate: 44100, extra: [0x4c, 0x49, 0x53, 0x54, 3, 0, 0, 0, 1, 2, 3, 0], data: [0, 0, 0x40, 0, 0, 0xc0, 0, 0, 0x20, 0, 0, 0x60] }))
  assert.deepEqual([stereo.rate, ...stereo.frames], [44100, 0, 0.5])
  // float 32 비트: 0.25(0x3e800000), -0.75(0xbf400000)
  assert.deepEqual([...decodeWav(wav({ kind: 3, bits: 32, data: [0, 0, 0x80, 0x3e, 0, 0, 0x40, 0xbf] })).frames], [0.25, -0.75])
  // 32 비트 정수: 0x40000000 = 0.5 · EXTENSIBLE 로 싼 16 비트
  assert.deepEqual([...decodeWav(wav({ bits: 32, data: [0, 0, 0, 0x40] })).frames], [0.5])
  assert.deepEqual([...decodeWav(wav({ extensible: true, data: [0, 0x40, 0, 0xc0] })).frames], [0.5, -0.5])
  assert.throws(() => decodeWav(Uint8Array.of(1, 2, 3)), /WAV 파일이 아니다/)
  assert.throws(() => decodeWav(wav({ bits: 8, data: [1, 2] })), /읽지 못하는 WAV/)
  assert.throws(() => decodeWav(wav({ kind: 85, data: [1, 2] })), /읽지 못하는 WAV/)
  assert.throws(() => decodeWav(wav({ data: [] }).subarray(0, 36)), /fmt 나 data 조각이 없다/)

  // 1000 Hz — 앞의 무음 둘(0, 0.0005 < 0.001)과 뒤의 무음 둘을 자르고, 끝 5 ms(5 표본)를 남은 수 / 5 로 줄인다: 1, 1, 0.8, 0.6, 0.4, 0.2, 0
  assert.deepEqual([...prepare({ rate: 1000, frames: Float64Array.of(0, 0.0005, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0) })], [16384, 16384, 13107, 9830, 6554, 3277, 0])
  // 넘치는 값은 16 비트 끝에서 멈춘다
  assert.deepEqual([...prepare({ rate: 1000, frames: Float64Array.of(1, -1, 1, 1, 1, 1, 1, 1) })].slice(0, 2), [32767, -32768])
  assert.throws(() => prepare({ rate: 1000, frames: Float64Array.of(0, 0.0001) }), /소리가 없다/)

  // -6 dB 는 10^(-6/20) = 0.5012
  const list = parseSampleList('# 드럼\nkick_a kick_a.wav gain=-6\nhat hat.wav group=1 # 닫힌 하이햇\n\nsnare snare.wav')
  assert.deepEqual(list.map(({ name, file, group }) => [name, file, group]), [['kick_a', 'kick_a.wav', 0], ['hat', 'hat.wav', 1], ['snare', 'snare.wav', 0]])
  assert.ok(close(list[0].gain, 0.5011872) && list[1].gain === 1)
  // 근음과 조율 — 음이름은 과학적 표기 (a4 = 69): e1 = 28, f#2 = 42, eb3 = 51. 없으면 null
  assert.deepEqual(parseSampleList('bass bass.wav root=e1 tune=23 gain=-3\ngtr g.wav root=f#2\nlead l.wav root=eb3 tune=-5\nkick k.wav').map(({ root, tune }) => [root, tune]), [[28, 23], [42, 0], [51, -5], [null, 0]])
  assert.deepEqual(['a4', 'c-1', 'c4', 'bb0', 'h2', 'e', 'E2'].map(noteNumber), [69, 0, 60, 22, null, null, null])
  assert.throws(() => parseSampleList('a a.wav root=h2'), /모르는 옵션/)
  assert.throws(() => parseSampleList('a a.wav tune=10'), /tune 은 root 가 있는 샘플에만/)
  assert.throws(() => parseSampleList('a a.wav root=e1 tune=80'), /모르는 옵션/)
  // pcm — 누르지 않고 담는다: 'zpcm', 표본율 44100(0xac44), 16 비트 표본들
  assert.deepEqual(parseSampleList('shot s.wav gain=-3 pcm\nkick k.wav').map(({ pcm }) => pcm), [true, false])
  assert.deepEqual([...encodePcm(Int16Array.of(1, -2, 258), 44100)], [0x7a, 0x70, 0x63, 0x6d, 0x44, 0xac, 0, 0, 1, 0, 0xfe, 0xff, 2, 1])
  assert.throws(() => parseSampleList('Kick a.wav'), /1 줄: 샘플 이름/)
  assert.throws(() => parseSampleList('a a.wav\na b.wav'), /2 줄: 같은 이름/)
  assert.throws(() => parseSampleList('a ../a.wav'), /WAV 이름/)
  assert.throws(() => parseSampleList('a a.wav loud=1'), /모르는 옵션/)
  assert.throws(() => parseSampleList('a a.wav group=0'), /모르는 옵션/)

  // 출처 — 파일마다 CREDITS.md 에 `파일` 로 적혀 있어야 한다
  checkCredits(list, '- `kick_a.wav` …\n- `hat.wav`, `snare.wav` …')
  assert.throws(() => checkCredits(list, '- `kick_a.wav` — CC0\n- hat.wav'), /출처가 없는 파일이 있다: hat.wav, snare.wav/)

  // 뱅크 — 머리 8 + 샘플마다 36 + QOA 들. 이름 24 바이트, 크기 0.5f(0x3f000000), 묶음 3, QOA 2 바이트
  const bank = encodeBank([{ name: 'ab', gain: 0.5, group: 3, qoa: Uint8Array.of(7, 9) }])
  assert.deepEqual([...bank], [0x5a, 0x4b, 0x53, 0x42, 1, 0, 0, 0, 0x61, 0x62, ...Array(22).fill(0), 0, 0, 0, 0x3f, 3, 0, 0, 0, 2, 0, 0, 0, 7, 9])
})

/** QOA 를 명세대로 푼다 (검증용 — 엔진의 것은 engine/audio/qoa.cpp, 손 계산한 바이트열로 따로 검증한다). 잔차의 뜻은 표가 아니라 명세의 식에서 낸다 */
function decodeQoa(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const total = view.getUint32(4)
  const out = []
  for (let at = 8; out.length < total; ) {
    const count = view.getUint16(at + 4)
    const history = [0, 1, 2, 3].map((i) => view.getInt16(at + 8 + i * 2))
    const weights = [0, 1, 2, 3].map((i) => view.getInt16(at + 16 + i * 2))
    at += 24
    for (let left = count; left > 0; at += 8) {
      const slice = view.getBigUint64(at)
      const scale = Math.round((Number(slice >> 60n) + 1) ** 2.75)
      for (let i = 0; i < 20 && left > 0; i++, left--) {
        const index = Number((slice >> BigInt(57 - i * 3)) & 7n)
        const size = scale * [0.75, 2.5, 4.5, 7][index >> 1]
        // 0 에서 먼 쪽으로 반올림, 홀수 번호는 음수
        const residual = Math.floor(size + 0.5) * (index & 1 ? -1 : 1)
        const predicted = Math.floor(weights.reduce((sum, weight, k) => sum + weight * history[k], 0) / 8192)
        const sample = Math.max(-32768, Math.min(32767, predicted + residual))
        const delta = residual >> 4
        history.forEach((value, k) => (weights[k] += value < 0 ? -delta : delta))
        history.shift()
        history.push(sample)
        out.push(sample)
      }
    }
  }
  return out
}

test('샘플 도구: QOA 로 적은 소리를 명세대로 풀면 원래 소리에 가깝다 (프레임 경계를 넘어서도)', () => {
  // 표본 셋 — 'qoaf', 표본 3 · 프레임 머리(채널 1, 44100 = 0x00AC44, 표본 3, 프레임 32 바이트) · 지난 표본 0 넷, 처음 가중치 (0, 0, -8192 = E000, 16384 = 4000) · 조각 하나
  const three = encodeQoa(Int16Array.of(1000, -2000, 3000), 44100)
  assert.equal(three.length, 40)
  assert.deepEqual([...three.slice(0, 32)], [0x71, 0x6f, 0x61, 0x66, 0, 0, 0, 3, 1, 0, 0xac, 0x44, 0, 3, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xe0, 0, 0x40, 0])
  assert.throws(() => encodeQoa(new Int16Array(0), 44100), /빈 소리/)

  // 440 Hz 사인(크기 0.5) 6000 표본 — 프레임 둘(5120 + 880). 오차의 RMS 가 16 비트 눈금의 0.15 % 아래 (50 / 32768)
  const sine = Int16Array.from({ length: 6000 }, (_, i) => Math.round(16384 * Math.sin((2 * Math.PI * 440 * i) / 44100)))
  const packed = encodeQoa(sine, 44100)
  // 머리 8 + 프레임 둘의 머리·상태 48 + 조각 300 개 × 8
  assert.equal(packed.length, 8 + 48 + 300 * 8)
  const unpacked = decodeQoa(packed)
  assert.equal(unpacked.length, 6000)
  const rms = Math.sqrt(unpacked.reduce((sum, value, i) => sum + (value - sine[i]) ** 2, 0) / 6000)
  assert.ok(rms < 50, `오차 RMS ${rms}`)
  // 조용하다가 시작해 잦아드는 낮은 소리(북) — 200 Hz, 크기 0.6 에서 17 ms 마다 1/e 로. 오차의 RMS 가 소리의 RMS 의 0.5 % 아래
  const hit = Int16Array.from({ length: 4000 }, (_, i) => (i < 100 ? 0 : Math.round(20000 * Math.exp(-(i - 100) / 800) * Math.sin((2 * Math.PI * 200 * (i - 100)) / 48000))))
  const followed = decodeQoa(encodeQoa(hit, 48000))
  const size = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)
  const ratio = size(followed.map((value, i) => value - hit[i])) / size([...hit])
  assert.ok(ratio < 0.005, `북: 오차 ${ratio}`)
})

const RHYTHM = { tickRate: 60, ticksPerBeat: 40 }

test('악보 도구: 칸으로 적은 타악 줄을 틱 자리의 음으로 옮긴다. 음높이가 있는 악기는 가장 가까운 근음의 샘플과 재생 속도·음의 길이를 정한다 (3 반음 밖이면 멈춘다). 박자가 게임의 리듬 규칙과 다르면 멈춘다', () => {
  assert.deepEqual(readRhythm(contentFile('../domain/rhythm.hpp')), RHYTHM)
  // 한 마디 16 칸(칸 하나 10 틱) — 첫 칸의 센 박은 틱 0 에 1.0, 일곱째 칸의 보통 박은 틱 60 에 0.7
  const song = compileSong('tempo 90\ngrid 16\ninst K kick\npattern a\n  K X...|..x.|....|....\nend\nlayer pulse a', ['snare', 'kick'], RHYTHM)
  assert.deepEqual(song, { tickRate: 60, loopTicks: 160, barTicks: 160, layers: [{ name: 'pulse', notes: [{ tick: 0, sample: 1, length: 0, pitch: 1, gain: 1, pan: 0 }, { tick: 60, sample: 1, length: 0, pitch: 1, gain: 0.7, pan: 0 }] }] })

  // 샘플 둘은 칠 때마다 번갈아. 층마다 마디 수가 달라도 되풀이 길이(가장 긴 층 — 두 마디 320 틱)에 맞춰 편다. 같은 자리의 음은 적은 차례
  const two = compileSong(
    ['tempo 90', 'meter 4', 'grid 4', 'inst K k1 k2 pan=-0.5', 'inst H hat gain=-20', 'pattern a', 'K X.o.', 'H X...', 'end', 'pattern b', 'K ...X', 'end', 'layer drums a b', 'layer hats a'].join('\n'),
    ['k1', 'k2', 'hat'], RHYTHM)
  assert.deepEqual([two.loopTicks, two.barTicks], [320, 160])
  assert.deepEqual(two.layers[0].notes.map(({ tick, sample, gain, pan }) => [tick, sample, gain, pan]), [[0, 0, 1, -0.5], [0, 2, 0.1, 0], [80, 1, 0.4, -0.5], [280, 0, 1, -0.5]])
  assert.deepEqual(two.layers[1].notes.map(({ tick, sample }) => [tick, sample]), [[0, 0], [0, 2], [80, 1], [160, 0], [160, 2], [240, 1]])

  const head = 'tempo 90\ngrid 16\ninst K kick\n'
  assert.throws(() => compileSong('tempo 120\ngrid 16', ['kick'], RHYTHM), /1 줄: tempo 120 은 게임의 박자\(rhythm.hpp — 90 BPM\)와 다르다/)
  assert.throws(() => compileSong('grid 16\ninst K kick\npattern a\nend\nlayer x a', ['kick'], RHYTHM), /tempo 가 없다/)
  assert.throws(() => compileSong(head + 'pattern a\nK X...\nend\nlayer x a', ['kick'], RHYTHM), /5 줄: 한 마디는 16 칸이다 \(4 칸을 적었다\)/)
  assert.throws(() => compileSong(head + 'pattern a\nK X..?|....|....|....\nend', ['kick'], RHYTHM), /모르는 칸/)
  assert.throws(() => compileSong(head + 'pattern a\nS X...|....|....|....\nend', ['kick'], RHYTHM), /정하지 않은 악기다: S/)
  assert.throws(() => compileSong('tempo 90\ninst K gong', ['kick'], RHYTHM), /2 줄: samples.txt 에 없는 샘플이다: gong/)
  assert.throws(() => compileSong(head + 'layer x nope', ['kick'], RHYTHM), /정하지 않은 패턴/)
  assert.throws(() => compileSong(head + 'pattern a\nend', ['kick'], RHYTHM), /layer 가 없다/)
  assert.throws(() => compileSong(head + 'pattern a\nK X...|....|....|....', ['kick'], RHYTHM), /end 로 닫지 않았다/)
  assert.throws(() => compileSong('tempo 90\ngrid 7\ninst K kick\npattern a\nK X......\nend\nlayer x a', ['kick'], RHYTHM), /틱으로 떨어지지 않는다/)
  assert.throws(() => compileSong(head + 'pattern a\nend\nlayer x a a\nlayer y a a a', ['kick'], RHYTHM), /나누지 못한다/)
  assert.throws(() => compileSong(head + 'warp 9', ['kick'], RHYTHM), /모르는 명령/)

  // 줄 하나만 더 잘게 — grid 16 의 패턴에서 32 칸을 적은 줄은 32분(칸 하나 5 틱)이다. 같은 패턴의 다른 줄은 16 칸 그대로
  const fine = compileSong(head + 'pattern a\nK X...|....|....|....\nK ........|........|........|......xX\nend\nlayer x a', ['kick'], RHYTHM)
  assert.deepEqual(fine.layers[0].notes.map(({ tick, gain }) => [tick, gain]), [[0, 1], [150, 0.7], [155, 1]])
  // 배수가 아닌 칸 수, 틱으로 떨어지지 않는 배수 (한 마디 160 틱을 48 칸으로 나누지 못한다)
  assert.throws(() => compileSong(head + 'pattern a\nK ' + 'X'.repeat(24) + '\nend\nlayer x a', ['kick'], RHYTHM), /5 줄: 한 마디는 16 칸이다 \(24 칸을 적었다\)/)
  assert.throws(() => compileSong(head + 'pattern a\nK ' + 'X'.repeat(48) + '\nend\nlayer x a', ['kick'], RHYTHM), /5 줄: 48 칸의 칸이 틱으로 떨어지지 않는다/)

  // 음높이가 있는 악기 — 샘플에 근음이 있다 (e2 = MIDI 40 의 두 테이크, a2 = 45, 그리고 26 센트 높게 녹음된 e1 = 28).
  // 칸은 띄어 적는다: 음이름 + 세기, - 는 앞의 음을 한 칸 더 끈다. 한 마디 8 칸(칸 하나 20 틱)
  const names = ['kick', 'gtr_e2_a', 'gtr_e2_b', 'gtr_a2', 'bass_e1']
  const tuning = [{ root: null, tune: 0 }, { root: 40, tune: 0 }, { root: 40, tune: 0 }, { root: 45, tune: 0 }, { root: 28, tune: 26 }]
  const score = (lines) => ['tempo 90', 'grid 8', 'inst G gtr_e2_a gtr_e2_b gain=-6 pan=0.5', 'inst W gtr_e2_a gtr_a2', 'inst B bass_e1', 'inst K kick', 'pattern a', ...lines, 'end', 'layer riff a'].join('\n')
  const riff = compileSong(score(['G e2X - g2x . | . . . e2x', 'W . . . . | b2o - - .', 'B e1X - - - | g1x . . .', 'K X...|x...']), names, RHYTHM, tuning).layers[0].notes
  const semitone = (n, cents = 0) => 2 ** (n / 12 - cents / 1200)
  assert.deepEqual(riff, [
    // e2: 근음 e2 의 첫 테이크, 제 속도, 두 칸(40 틱)
    { tick: 0, sample: 1, length: 40, pitch: 1, gain: 10 ** (-6 / 20), pan: 0.5 },
    // 베이스 e1: 26 센트 높은 샘플이라 그만큼 느리게, 네 칸
    { tick: 0, sample: 4, length: 80, pitch: semitone(0, 26), gain: 1, pan: 0 },
    { tick: 0, sample: 0, length: 0, pitch: 1, gain: 1, pan: 0 },
    // g2: 근음 e2 에서 3 반음 위 — 속도 2^(3/12). 같은 근음의 둘째 테이크로 넘어간다
    { tick: 40, sample: 2, length: 20, pitch: semitone(3), gain: 10 ** (-6 / 20) * 0.7, pan: 0.5 },
    // b2(47): 근음 e2(40)·a2(45) 가운데 가까운 a2 에서 2 반음 위. 세 칸
    { tick: 80, sample: 3, length: 60, pitch: semitone(2), gain: 0.4, pan: 0 },
    { tick: 80, sample: 4, length: 20, pitch: semitone(3, 26), gain: 0.7, pan: 0 },
    { tick: 80, sample: 0, length: 0, pitch: 1, gain: 0.7, pan: 0 },
    // 다시 e2: 근음 e2 의 테이크가 이어서 돈다 (첫 테이크)
    { tick: 140, sample: 1, length: 20, pitch: 1, gain: 10 ** (-6 / 20) * 0.7, pan: 0.5 },
  ])
  assert.ok(Math.abs(riff[3].pitch - 1.189207) < 1e-6 && Math.abs(riff[1].pitch - 0.985095) < 1e-6, 'g2 는 e2 샘플의 1.1892 배 속도, 26 센트 높은 샘플은 0.9851 배')
  // 근음에서 3 반음 넘게 떨어진 음 (3 반음까지는 된다), 끌 음이 없는 -, 세기가 없는 칸, 칸 수, 근음이 없는 샘플이 섞인 악기
  assert.throws(() => compileSong(score(['G a2X . . . | . . . .']), names, RHYTHM, tuning), /8 줄: a2 은 악기 G 의 어느 근음에서도 3 반음 넘게 떨어져 있다/)
  assert.throws(() => compileSong(score(['G c2X . . . | . . . .']), names, RHYTHM, tuning), /c2 은 악기 G/)
  assert.doesNotThrow(() => compileSong(score(['G c#2X . . . | . . . .']), names, RHYTHM, tuning))
  assert.throws(() => compileSong(score(['G - . . . | . . . .']), names, RHYTHM, tuning), /- 앞에 끌 음이 없다/)
  assert.throws(() => compileSong(score(['G e2X . - . | . . . .']), names, RHYTHM, tuning), /- 앞에 끌 음이 없다/)
  assert.throws(() => compileSong(score(['G e2 . . . | . . . .']), names, RHYTHM, tuning), /모르는 칸/)
  assert.throws(() => compileSong(score(['G e2X . . .']), names, RHYTHM, tuning), /한 마디는 8 칸이다 \(4 칸을 적었다\)/)
  // 음높이가 있는 줄도 더 잘게 적을 수 있다 — 16 칸(칸 하나 10 틱): 셋째 칸에서 세 칸(30 틱)
  assert.deepEqual(compileSong(score(['G . . e2X - - . . . | . . . . . . . .']), names, RHYTHM, tuning).layers[0].notes.map(({ tick, length }) => [tick, length]), [[20, 30]])
  assert.throws(() => compileSong('tempo 90\ngrid 8\ninst M kick gtr_a2', names, RHYTHM, tuning), /근음\(root=\)이 없는 것이 있다/)

  // .song — 머리 20 바이트('ZKSG', 60, 160, 160, 층 1) + 층(이름 16, 음 수 2) + 음 둘(자리, 샘플, 길이 0, 높이 1.0f, 크기, 자리 0.0f). 0.7f = 0x3f333333
  assert.deepEqual([...encodeSong(song)], [
    0x5a, 0x4b, 0x53, 0x47, 60, 0, 0, 0, 160, 0, 0, 0, 160, 0, 0, 0, 1, 0, 0, 0,
    0x70, 0x75, 0x6c, 0x73, 0x65, ...Array(11).fill(0), 2, 0, 0, 0,
    0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x80, 0x3f, 0, 0, 0x80, 0x3f, 0, 0, 0, 0,
    60, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x80, 0x3f, 0x33, 0x33, 0x33, 0x3f, 0, 0, 0, 0,
  ])
  // 길이가 있는 음 — 길이 40 틱, 높이 2.0f(0x40000000)
  assert.deepEqual([...encodeSong({ tickRate: 60, loopTicks: 160, barTicks: 160, layers: [{ name: 'b', notes: [{ tick: 20, sample: 3, length: 40, pitch: 2, gain: 1, pan: 0 }] }] })].slice(40), [
    20, 0, 0, 0, 3, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0x40, 0, 0, 0x80, 0x3f, 0, 0, 0, 0,
  ])
})

test('호스트의 밀림 방지(coalesce): 게임이 앞의 것을 처리하는 동안 생긴 입력은 줄 세우지 않고 하나로 합친다 — 자리는 최신, 움직인 양은 합. 기다리는 호출은 하나를 넘지 않는다', async () => {
  // 보낸 것마다 끝내 줄 손잡이를 쥔다 — 처리 측(게임)을 일부러 늦춘다
  const sent = []
  const finish = []
  const failures = []
  const send = (value) => new Promise((resolve, reject) => {
    sent.push(value)
    finish.push({ resolve, reject })
  })
  const settle = () => new Promise((resolve) => setImmediate(resolve))
  const move = latest(send, mergeMove, (error) => failures.push(error))

  move.push({ x: 1, y: 1, deltaX: 2, deltaY: 0 })
  assert.deepEqual(sent, [{ x: 1, y: 1, deltaX: 2, deltaY: 0 }], '한가하면 바로 보낸다')
  // 처리 중에 이동 다섯 번 — 하나도 보내지 않고 합쳐 둔다
  for (let i = 1; i <= 5; i++) move.push({ x: 10 * i, y: -i, deltaX: i, deltaY: -2 * i })
  assert.equal(sent.length, 1, '앞의 것이 끝나기 전에는 보내지 않는다')
  finish[0].resolve()
  await settle()
  assert.deepEqual(sent[1], { x: 50, y: -5, deltaX: 15, deltaY: -30 }, '끝나면 한 번에 — 자리는 마지막 것, 움직인 양은 다섯 번의 합')
  assert.equal(sent.length, 2)
  finish[1].resolve()
  await settle()
  assert.equal(sent.length, 2, '기다리는 것이 없으면 더 보내지 않는다')

  // flush — 버튼의 바로 앞: 기다리는 이동을 앞의 것이 끝나기 전에 지금 보낸다 (차례가 지켜진다)
  move.push({ x: 0, y: 0, deltaX: 1, deltaY: 1 })
  move.push({ x: 7, y: 8, deltaX: 1, deltaY: 1 })
  move.push({ x: 9, y: 9, deltaX: 1, deltaY: 1 })
  assert.equal(sent.length, 3)
  move.flush()
  assert.deepEqual(sent[3], { x: 9, y: 9, deltaX: 2, deltaY: 2 }, 'flush 는 합쳐 둔 것을 지금 보낸다')
  move.flush()
  assert.equal(sent.length, 4, '기다리는 것이 없으면 flush 는 아무 일도 없다')

  // 실패해도 흐름은 멈추지 않는다
  move.push({ x: 1, y: 2, deltaX: 3, deltaY: 4 })
  finish[2].reject(new Error('worker 가 내려갔다'))
  await settle()
  assert.equal(failures.length, 1)
  assert.deepEqual(sent[4], { x: 1, y: 2, deltaX: 3, deltaY: 4 }, '앞의 것이 실패해도 기다리던 것은 간다')

  // 상태형(화면 크기) — 최신 값만 남는다. 처리 측이 늦을수록 버려지는 것이 늘 뿐 기다리는 것은 늘지 않는다
  const sizes = []
  const done = []
  const size = latest((value) => new Promise((resolve) => { sizes.push(value); done.push(resolve) }), replace)
  for (let width = 100; width < 200; width++) size.push({ width, height: 50 })
  assert.deepEqual(sizes, [{ width: 100, height: 50 }])
  done[0]()
  await settle()
  assert.deepEqual(sizes, [{ width: 100, height: 50 }, { width: 199, height: 50 }], '백 번 바뀌어도 두 번만 간다 — 처음 것과 마지막 것')
})

test('하늘 도구: RGBE 를 풀고(줄 RLE 도), 가장 밝은 곳을 해로 떼어 내 방향과 빛을 내고, 나머지 하늘을 표로 줄여 수평면의 빛에 노출을 맞춘다', async () => {
  const { parseHdr, encodeHdr, parseSkyText, analyzeSky, encodeSky, toDisplay, TABLE_WIDTH, TABLE_HEIGHT } = await import('../tools/skyc.mjs')
  // 손으로 적은 RGBE 네 픽셀 (2×2, 누르지 않은 줄): 값 = 가수 × 2^(지수 − 136)
  //   (128, 0, 0, 129) → 128 / 128 = 빨강 1 · (64, 128, 0, 130) → (1, 2, 0) · (0, 0, 0, 0) → 검정 · (255, 255, 255, 128) → 255 / 256
  const head = Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 2\n', 'latin1')
  const four = parseHdr(Buffer.concat([head, Buffer.from([128, 0, 0, 129, 64, 128, 0, 130, 0, 0, 0, 0, 255, 255, 255, 128])]))
  assert.deepEqual([four.width, four.height], [2, 2])
  assert.deepEqual([...four.data], [1, 0, 0, 1, 2, 0, 0, 0, 0, 0.99609375, 0.99609375, 0.99609375])
  // 줄 RLE — 너비 8: 머리 (2, 2, 0, 8), 성분마다 '같은 값 8 개'(128 + 8, 값). 모든 픽셀이 (64, 32, 16, 129) → (0.5, 0.25, 0.125)
  const rle = Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 8\n', 'latin1')
  const run = parseHdr(Buffer.concat([rle, Buffer.from([2, 2, 0, 8, 136, 64, 136, 32, 136, 16, 136, 129])]))
  assert.deepEqual([...run.data.subarray(21)], [0.5, 0.25, 0.125])
  // 적은 것을 다시 읽으면 같다 (가수 8 비트로 나타낼 수 있는 값)
  assert.deepEqual([...parseHdr(encodeHdr(four)).data], [...four.data])
  assert.throws(() => parseHdr(Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 2\n\x01\x02', 'latin1')), /모자란다/)

  // 휘도 1 로 고른 하늘 — 열린 수평면의 빛은 1 (∫ cos dω / π). ground_light 2 면 전체가 두 배가 된다
  const uniform = { width: 64, height: 32, data: new Float32Array(64 * 32 * 3).fill(1) }
  const sky = parseSkyText('hdr a.hdr\nsun_azimuth 90\nsun_cut 4\nsun_radius 1.5\nground_light 2 # 주석\n')
  const flat = analyzeSky(uniform, sky)
  // 칸으로 나눠 더한 ∫ cos dω / π 는 (π / 32) / sin(π / 32) = 1.001607 — 배율은 2 / 1.001607 = 1.996792 이고 표의 값도 그것이다
  assert.ok(Math.abs(flat.scale - 1.996792) < 1e-5 && flat.sunLight.every((v) => v === 0), `고른 하늘의 배율 ${flat.scale}`)
  assert.ok(flat.up.every((v) => Math.abs(v - 2) < 1e-5) && flat.table.data.every((v) => Math.abs(v - 1.996792) < 1e-5))
  assert.deepEqual([flat.table.width, flat.table.height], [TABLE_WIDTH, TABLE_HEIGHT])
  // 해 — 칸 (40, 8) 하나만 1001 (둘레는 1): 그 칸의 방향이 해의 방향이고, 넘는 몫 1000 × 입체각 ÷ π 가 해의 빛이다.
  //   극각 θ = π · 8.5 / 32, 방위 φ = 2π (40.5 / 64 − ½), 입체각 = (2π / 64)(π / 32) sin θ = 0.0071416 → 빛 2.27324, 높이 sin = cos θ = 0.671559
  const sunny = { width: 64, height: 32, data: new Float32Array(64 * 32 * 3).fill(1) }
  sunny.data.fill(1001, (8 * 64 + 40) * 3, (8 * 64 + 40) * 3 + 3)
  const found = analyzeSky(sunny, parseSkyText('hdr a.hdr\nsun_azimuth 90\nsun_cut 4\nground_light 1\nsky_gain 1\nground_albedo 0.5'))
  // tint 는 빛의 빨강·파랑에만 곱해진다 (배율과 방향은 그대로): 빨강 1.1 배, 파랑 0.5 배
  const tinted = analyzeSky(sunny, parseSkyText('hdr a.hdr\nsun_azimuth 90\nsun_cut 4\nground_light 1\ntint_red 1.1\ntint_blue 0.5'))
  assert.ok(Math.abs(tinted.scale - found.scale) < 1e-9 && Math.abs(tinted.sunLight[0] - 1.1 * found.sunLight[0]) < 1e-9 && tinted.sunLight[1] === found.sunLight[1] && Math.abs(tinted.up[2] - 0.5 * found.up[2]) < 1e-9)
  assert.ok(Math.abs(tinted.table.data[2] - 0.5 * found.table.data[2]) < 1e-7 && tinted.horizon[2] === found.horizon[2])
  // 노출 전의 수평면 빛 = 2.27324 × 0.671559 + 하늘 1.001607 (칸으로 나눠 더한 ∫ cos dω / π = (π / 32) / sin(π / 32)) = 2.52822 → 배율 0.395535
  assert.ok(Math.abs(found.scale - 0.395535) < 2e-5, `배율 ${found.scale}`)
  assert.ok(found.sunLight.every((v) => Math.abs(v - 2.27324 * 0.395535) < 1e-4), `해의 빛 ${found.sunLight}`)
  // 방위 90 도(동쪽, +x)로 돌려 놓는다 — 높이는 그대로
  assert.ok(Math.abs(found.sunDirection[1] - 0.671559) < 1e-5 && Math.abs(found.sunDirection[0] - Math.sqrt(1 - 0.671559 ** 2)) < 1e-5 && Math.abs(found.sunDirection[2]) < 1e-6)
  // 그림에서 해의 방위는 2π (40.5 / 64 − ½) = 0.834486 → 돌린 각 = π/2 − 0.834486
  assert.ok(Math.abs(found.yaw - (Math.PI / 2 - 0.834486)) < 1e-5, `돌린 각 ${found.yaw}`)
  // 해를 떼어 낸 하늘은 다시 고르다 (그 칸이 둘레의 값으로 메워졌다), 아래에서 되비치는 빛 = 0.5 × 수평면의 빛(= 1)
  assert.ok(found.table.data.every((v) => Math.abs(v - 0.395535) < 2e-5) && found.down.every((v) => Math.abs(v - 0.5) < 2e-3))
  const bytes = encodeSky(found)
  const view = new DataView(bytes.buffer)
  assert.equal(bytes.length, 44 + 64 * 32 * 12)
  assert.deepEqual([Buffer.from(bytes.subarray(0, 4)).toString('latin1'), view.getUint32(4, true), view.getUint32(8, true)], ['ZKSY', 64, 32])
  assert.ok(Math.abs(view.getFloat32(20, true) - 0.671559) < 1e-5 && Math.abs(view.getFloat32(40, true) - (0.27 * Math.PI) / 180) < 1e-7)
  // 톤 곡선 — 빛 0 은 0, 큰 빛은 1 로 눌린다. 노출 0.62 에서 빛 1 은 ((0.62·(2.51·0.62+0.03))/(0.62·(2.43·0.62+0.59)+0.14))^(1/2.2) = 0.8409
  assert.ok(toDisplay(0, 0.62) === 0 && toDisplay(1000, 0.62) === 1 && Math.abs(toDisplay(1, 0.62) - 0.8409) < 2e-4)
})

test('하늘: 저장소의 하늘(content/sky)에서 해가 sky.txt 의 방위에 놓이고, 수평면의 빛이 ground_light 에 맞는다', async () => {
  const { parseHdr, parseSkyText, analyzeSky, luminance } = await import('../tools/skyc.mjs')
  const folder = join(root, 'game', 'gameplay', 'content', 'sky')
  const sky = parseSkyText(readFileSync(join(folder, 'sky.txt'), 'utf8'))
  const light = analyzeSky(parseHdr(readFileSync(join(folder, sky.hdr))), sky)
  const [x, y, z] = light.sunDirection
  assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-6 && y > 0.5 && y < 0.95, `해의 높이 ${y}`)
  assert.ok(Math.abs(Math.atan2(x, -z) - (sky.sun_azimuth * Math.PI) / 180) < 1e-6)
  // tint 를 곱하기 전의 밝기로 맞춘다 — 곱한 뒤에도 그 언저리다
  assert.ok(Math.abs(luminance(...light.sunLight) * y + luminance(...light.up) - sky.ground_light) < 0.1)
  // 그늘이 검게 죽지 않는다 — 하늘빛이 수평면 빛의 1/6 은 된다. 화면용 그림(JPEG)이 있다
  assert.ok(luminance(...light.up) > sky.ground_light / 6)
  const image = readFileSync(join(folder, sky.image))
  assert.ok(image[0] === 0xff && image[1] === 0xd8)
})
