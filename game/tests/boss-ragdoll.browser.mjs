// Production game, trusted CDP input, real portals and public F3/judge diagnostics.
// Root runs this only after the production WASM/pack cutoff, sequentially with
// other browser probes: node game/tests/boss-ragdoll.browser.mjs
// [--base http://localhost:5173] [--out build/boss-ragdoll-browser]
// [--finish early|settled] [--require-over-motion] [--ffmpeg <executable>]
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createReadStream, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchChrome } from '../../scripts/qa/chrome.mjs'
import { waitForState } from '../tools/perf-events.mjs'

const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? fallback : process.argv[at + 1] }
const base = arg('base', 'http://localhost:5173').replace(/\/$/, '')
const out = resolve(arg('out', 'build/boss-ragdoll-browser'))
const finishMode = arg('finish', 'early')
assert.ok(['early', 'settled'].includes(finishMode), '--finish must be early or settled')
// Current three public physics cases sleep after 27–43 simulated seconds;
// this bound allows actual quiet-state publication without polling or forcing it.
const SETTLE_TIMEOUT = 60000
const ffmpeg = arg('ffmpeg', process.env.FFMPEG ?? 'ffmpeg')
const width = 1920, height = 1080
mkdirSync(resolve(out, 'clip'), { recursive: true })
const digest = async path => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}
const inputPaths = [
  'public/wasm/game-client.wasm', 'public/wasm/game-assets.zkpack', 'game/app/client/main.cpp',
  'game/gameplay/simulation/world.cpp', 'game/gameplay/domain/boss_rig_data.hpp',
  'game/engine/physics/ragdoll.cpp', 'game/engine/foundation/dual_quaternion.hpp',
  'game/gameplay/presentation/scene_view.cpp', 'game/engine/render/surface_batch.cpp',
  'game/engine/render/wgsl/include/surface_skin.wgsl', 'game/engine/render/wgsl/include/surface_shade.wgsl',
  'game/gameplay/content/creatures/high-detail/boss_bind.zkmodel', 'game/gameplay/content/creatures/high-detail/boss.skin',
  'game/tests/boss-ragdoll.browser.mjs',
]
const sourceArtifacts = await Promise.all(inputPaths.map(async path => ({ path: resolve(path), bytes: statSync(path).size, sha256: await digest(path) })))
const events = new EventEmitter(), logs = [], inputs = [], nativeEvents = [], perf = [], judgments = [], errors = [], resources = [], captures = [], frames = []
const started = Date.now(), held = new Set(), requests = new Map()
let ready = false, assets = 'loading', locked = false, failure = null, chrome, off, sessionId, browserVersion, clipRunning = false, video
let cameraYaw = 0, cameraPitch = 0, cameraInitialized = false, pointer = { x: width / 2, y: height / 2 }
let strafe = null, overMotion = null
const keys = { Enter: ['Enter', 13], F3: ['F3', 114], F6: ['F6', 117], KeyW: ['w', 87], KeyA: ['a', 65], KeyD: ['d', 68], KeyR: ['r', 82], Space: [' ', 32] }
const parse = text => Object.fromEntries([...text.matchAll(/(\w+)=([^\s]+)/g)].map(([, name, value]) => [name, Number.isFinite(Number(value)) ? Number(value) : value]))
const state = () => {
  const frame = perf.at(-1) ?? {}, judge = judgments.at(-1)
  if (!judge || judge.serial < frame.serial || !Number.isFinite(judge.playerx)) return frame
  return { ...frame, ...judge,
    ...(judge.corpse === 1 ? { bossx: judge.corpsex, bossy: judge.corpsey, bossz: judge.corpsez } : {}) }
}
const wait = (predicate, timeout, message) => waitForState(events, predicate, timeout, message)
// These timers advance held movement/rhythm input, never poll readiness.
const gameplayTime = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  chrome = await launchChrome({ width, height, maxMinutes: 4 })
  browserVersion = await chrome.send('Browser.getVersion')
  ;({ sessionId } = await chrome.newPage(null))
  const sessions = new Set([sessionId])
  off = chrome.on(message => {
    if (message.method === 'Target.attachedToTarget' && sessions.has(message.sessionId)) {
      sessions.add(message.params.sessionId)
      for (const domain of ['Runtime', 'Network']) chrome.send(`${domain}.enable`, {}, message.params.sessionId).catch(error => { errors.push(error.message); events.emit('change') })
    }
    if (!sessions.has(message.sessionId)) return
    const elapsed = Date.now() - started
    if (message.method === 'Runtime.bindingCalled' && message.params.name === 'bossRagdollNative') {
      const event = JSON.parse(message.params.payload)
      nativeEvents.push({ hostAt: elapsed, ...event })
      if (event.type === 'pointerlockchange') locked = event.locked
      events.emit('change')
    } else if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ')
      logs.push({ at: elapsed, type: message.params.type, text })
      if (text === '[app] 클라이언트 시작 — WebGPU / OffscreenCanvas') ready = true
      else if (text === '[game] assets ready') assets = 'ready'
      else if (text === '[game] assets failed') assets = 'failed'
      else if (text.startsWith('[perf] ')) {
        const frame = { ...parse(text), at: elapsed, serial: logs.length }
        perf.push(frame)
        // F3 can describe an angle from before a queued native mouse move.
        // Initialize once; later fire judgments confirm the flushed look input.
        if (!cameraInitialized && Number.isFinite(frame.yaw)) { cameraYaw = frame.yaw; cameraPitch = frame.pitch; cameraInitialized = true }
      } else if (text.startsWith('[judge] ')) {
        const judged = { ...parse(text), at: elapsed, serial: logs.length }
        judgments.push(judged)
        if (judged.what === 'fire' && Number.isFinite(judged.yaw) && Number.isFinite(judged.pitch)) {
          cameraYaw = judged.yaw; cameraPitch = judged.pitch
        }
      }
      if (message.params.type === 'error' || /GPUValidationError|GPUInternalError|GPUOutOfMemoryError|uncaptured.*error|device lost/i.test(text)) errors.push(text)
      events.emit('change')
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
      events.emit('change')
    } else if (message.method === 'Network.responseReceived' && /(?:game-client\.wasm|game-assets\.zkpack)(?:\?|$)/.test(message.params.response.url)) {
      const response = message.params.response
      const entry = { at: elapsed, url: response.url, status: response.status, mimeType: response.mimeType, headers: response.headers }
      resources.push(entry); requests.set(message.params.requestId, entry)
    } else if (message.method === 'Network.loadingFinished' && requests.has(message.params.requestId)) {
      requests.get(message.params.requestId).encodedDataLength = message.params.encodedDataLength
    } else if (message.method === 'Network.loadingFailed' && requests.has(message.params.requestId)) {
      errors.push(`production resource failed: ${message.params.errorText}`); events.emit('change')
    } else if (message.method === 'Page.screencastFrame') {
      chrome.send('Page.screencastFrameAck', { sessionId: message.params.sessionId }, sessionId).catch(error => errors.push(error.message))
      if (!clipRunning) return
      if (frames.length >= 1200) { errors.push('native ragdoll clip exceeded its bounded 1200-frame limit'); events.emit('change'); return }
      const file = `frame-${String(frames.length).padStart(4, '0')}.jpg`, data = Buffer.from(message.params.data, 'base64')
      writeFileSync(resolve(out, 'clip', file), data)
      frames.push({ file, at: elapsed, timestamp: message.params.metadata.timestamp, sha256: createHash('sha256').update(data).digest('hex'), state: state() })
    }
  })
  await chrome.send('Runtime.addBinding', { name: 'bossRagdollNative' }, sessionId)
  await chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    document.addEventListener('pointerlockchange', () => bossRagdollNative(JSON.stringify({type:'pointerlockchange',locked:document.pointerLockElement!==null,at:performance.now()})));
    for (const type of ['keydown','keyup','mousedown','mouseup','mousemove']) document.addEventListener(type,e=>bossRagdollNative(JSON.stringify({type,trusted:e.isTrusted,code:e.code,key:e.key,button:e.button,movementX:e.movementX,movementY:e.movementY,at:performance.now()})),true);
  ` }, sessionId)
  await chrome.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId)
  await chrome.send('Network.enable', {}, sessionId)
  const key = async (code, pressed) => {
    if (pressed) held.add(code); else held.delete(code)
    inputs.push({ at: Date.now() - started, type: pressed ? 'keyDown' : 'keyUp', code })
    await chrome.send('Input.dispatchKeyEvent', { type: pressed ? 'rawKeyDown' : 'keyUp', code, key: keys[code][0], windowsVirtualKeyCode: keys[code][1] }, sessionId)
  }
  const tap = async code => { await key(code, true); await key(code, false) }
  const move = async (dx, dy) => {
    pointer = { x: pointer.x + dx, y: pointer.y + dy }
    inputs.push({ at: Date.now() - started, type: 'mouseMoved', ...pointer, deltaX: dx, deltaY: dy })
    await chrome.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pointer }, sessionId)
  }
  const face = async (yaw, pitch = 0) => {
    const difference = Math.atan2(Math.sin(yaw - cameraYaw), Math.cos(yaw - cameraYaw))
    const dx = Math.round(difference / .0022), dy = Math.round((cameraPitch - pitch) / .0022)
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 100))
    for (let i = 0; i < steps; i++) await move(Math.round(dx * (i + 1) / steps) - Math.round(dx * i / steps), Math.round(dy * (i + 1) / steps) - Math.round(dy * i / steps))
    cameraYaw += dx * .0022; cameraPitch -= dy * .0022
  }
  const fire = async () => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      inputs.push({ at: Date.now() - started, type, ...pointer })
      await chrome.send('Input.dispatchMouseEvent', { type, ...pointer, button: 'left', clickCount: 1 }, sessionId)
    }
  }
  const fresh = async (after, predicate, message, timeout = 4000) => wait(() => perf.length > after && predicate(perf.at(-1)), timeout, message)
  const capture = async name => {
    const result = await chrome.send('Page.captureScreenshot', { format: 'png' }, sessionId), bytes = Buffer.from(result.data, 'base64')
    const path = resolve(out, `${name}.png`); writeFileSync(path, bytes)
    captures.push({ name, path, at: Date.now() - started, state: state(), sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  const startClip = async () => {
    if (clipRunning) return
    clipRunning = true
    await chrome.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: width, maxHeight: height, everyNthFrame: 6 }, sessionId)
  }
  const aim = async () => {
    const current = state()
    // Public frame/shot coordinates only; collisions and turning invalidate a
    // full-speed strafe extrapolation, especially near gallery pillars.
    const dx = current.bossx - current.playerx, dz = current.bossz - current.playerz
    assert.ok([dx, dz, current.bossy, current.playery].every(Number.isFinite), 'production F3 boss/player coordinates are missing')
    await face(Math.atan2(dx, -dz), Math.atan2(current.bossy - current.playery, Math.hypot(dx, dz)))
  }
  const accepted = async (kind, action, desired) => {
    const reloadComplete = snapshot => kind === 'reload' && (desired === 'magazine_out'
      ? snapshot.reload === 1 && snapshot.ammo === 0
      : desired === 'magazine_in' && snapshot.reload === 0 && snapshot.ammo > 0)
    for (let attempt = 0; attempt < 8; attempt++) {
      assert.deepEqual(errors, [], 'actual game/browser error crossed the input boundary')
      assert.equal(state().outcome, 0, 'player died or game ended before the requested actual rhythm action')
      assert.equal(locked, true, 'native pointer capture was lost during real gameplay')
      // A queued action may have completed in the latest public F3/judge frame.
      // Never issue another R after that inventory transition is already proven.
      if (reloadComplete(state())) return state()
      const count = judgments.length
      await action()
      await wait(() => errors.length || judgments.length > count && judgments.at(-1).what === kind, 2500, `actual ${kind} judgment did not arrive`)
      assert.deepEqual(errors, [], 'actual game/browser error crossed the input boundary')
      const judged = judgments.at(-1)
      assert.ok(Number.isFinite(judged.off) && judged.stale !== 1, 'actual judgment has no valid rhythm offset')
      assert.ok([judged.playerx, judged.playery, judged.playerz, judged.yaw, judged.pitch, judged.ammo, judged.reload, judged.bossHP].every(Number.isFinite),
        'production judgment lacks its actual position/camera/inventory snapshot')
      if (kind === 'reload') {
        if (judged.result === desired) assert.ok(reloadComplete(judged), 'accepted reload verdict lacks its actual inventory transition')
        if (!reloadComplete(judged) && judged.pending === 1) {
          await wait(() => errors.length || state().outcome !== 0 ||
            state().serial > judged.serial && reloadComplete(state()), 2000,
          `queued ${desired} did not publish its actual reload-stage/ammo transition`)
          assert.deepEqual(errors, [], 'actual game/browser error crossed the queued reload boundary')
          assert.equal(state().outcome, 0, 'player died or game ended before the queued reload completed')
          assert.equal(locked, true, 'native pointer capture was lost during the queued reload')
          assert.ok(state().serial > judged.serial && reloadComplete(state()), 'queued reload has no fresh public inventory proof')
          return state()
        }
      }
      // Schedule from the actual input verdict; these are simulation rhythm
      // timers rather than arbitrary readiness retries.
      await gameplayTime((20 - ((judged.off % 20 + 20) % 20)) * 1000 / 60)
      if (judged.result === desired || reloadComplete(judged)) return judged
    }
    throw new Error(`eight actual ${kind} actions did not produce ${desired}`)
  }
  const loaded = async () => {
    if (!state().reload && state().ammo > 0) return
    if (!state().reload) await accepted('reload', () => tap('KeyR'), 'magazine_out')
    await accepted('reload', () => tap('KeyR'), 'magazine_in')
  }
  const stopStrafe = async () => { if (strafe) await key(strafe, false); strafe = null }
  await chrome.send('Page.navigate', { url: `${base}/game/` }, sessionId)
  await wait(() => ready || errors.length, 25000, 'actual WebGPU client startup event did not arrive')
  assert.ok(ready, errors.join('\n'))
  await wait(() => assets !== 'loading' || errors.length, 60000, 'actual asset publication event did not arrive')
  assert.equal(assets, 'ready', errors.join('\n'))
  await tap('F3'); await wait(() => perf.length > 0, 4000, 'F3 did not publish an actual frame snapshot')
  await tap('Enter'); await tap('Enter')
  await wait(() => state().screen === 1 && locked, 5000, 'trusted menu Enter keys did not start and capture gameplay')
  let before = perf.length
  await tap('F6'); await fresh(before, frame => frame.room === 0 && frame.health === 100, 'F6 did not reset the public real tour')
  before = perf.length; await key('KeyW', true)
  try { await fresh(before, frame => frame.room === 9, 'real north portal did not reach neutral shop room9', 7000) }
  finally { await key('KeyW', false) }
  before = perf.length; await fresh(before, frame => frame.room === 9, 'shop portal arrival did not settle')
  assert.equal(state().shopOpen, 0, 'shop arrival must not automatically open the card modal')
  await capture('route-shop-neutral')
  const northTravel = state().playerz
  assert.ok(northTravel > 0 && northTravel < 24, 'unexpected real shop portal arrival coordinates')
  await face(0); await key('KeyW', true)
  await gameplayTime(Math.max(0, (northTravel - .123) / 6 * 1000)); await key('KeyW', false)
  before = perf.length; await fresh(before, frame => frame.room === 9 && Math.abs(frame.playerz) < 1, 'real shop walking did not align with east portal')
  await face(Math.PI / 2)
  before = perf.length; await key('KeyW', true)
  try { await fresh(before, frame => frame.room === 10 && frame.bossHP > 0, 'real east shop portal did not enter boss room10', 7000) }
  finally { await key('KeyW', false) }
  before = perf.length; await fresh(before, frame => frame.room === 10 && frame.bossHP > 0 && frame.screen === 1, 'boss portal arrival did not finish')
  assert.equal(state().health > 0, true)
  assert.equal(state().corpse, 0)
  assert.equal(state().finishHits, 0)
  assert.ok(Number.isFinite(state().outcome), 'production artifact lacks current bounded F3 outcome fields')
  await aim(); await capture('boss-live')
  const fightDeadline = Date.now() + 90000
  strafe = 'KeyD'; await key(strafe, true)
  for (let shots = 0; state().corpse !== 1; shots++) {
    assert.ok(shots < 96 && Date.now() < fightDeadline, 'bounded actual boss fight did not reach a physics corpse')
    assert.ok(state().health > 0 && state().screen === 1, 'actual strafe/jump combat did not survive the boss')
    const desired = state().playerz > 5 ? 'KeyA' : state().playerz < -5 ? 'KeyD' : strafe
    if (desired !== strafe) { await key(strafe, false); strafe = desired; await key(strafe, true) }
    if (state().bossCycle % 2 === 1) await tap('Space')
    await loaded(); await aim()
    if (state().bossHP <= 250) await startClip()
    await accepted('fire', fire, 'shot')
  }
  await stopStrafe(); await startClip(); await capture('boss-limp-fall')
  // A real post-release frame confirms braking and player position before the
  // much smaller corpse target is aimed at; no invented trajectory is used.
  before = perf.length
  await fresh(before, frame => frame.corpse === 1, 'native movement release did not publish a fresh corpse/player frame')
  assert.equal(state().finishHits, 0, 'the killing shot must begin a real corpse before any finishing note')
  if (finishMode === 'settled') {
    await wait(() => state().corpse === 1 && state().settled === 1, SETTLE_TIMEOUT, 'real articulated corpse did not settle')
    await capture('boss-settled-before-finisher')
  }
  for (let note = 1; note <= 5; note++) {
    let hit = false
    for (let attempt = 0; attempt < 10 && !hit; attempt++) {
      await loaded(); await aim()
      const judged = await accepted('fire', fire, 'shot')
      assert.ok(judged.finishHits === note - 1 || judged.finishHits === note, `actual finisher counter skipped or repeated a note: ${JSON.stringify(judged)}`)
      hit = judged.finishHits === note
      if (hit) {
        assert.equal(judged.outcome, note < 5 ? 0 : 2, 'only the fifth actual corpse hit may clear the floor')
        if (note === 5) overMotion = { required: judged.settled === 0, terminalJudge: judged, clearedProgressObserved: false, overUnsettledObserved: false, observed: false }
        await capture(`finisher-note-${note}`)
      }
    }
    assert.ok(hit, `ten trusted corpse shots did not produce actual finisher note${note}`)
  }
  before = perf.length
  await fresh(before, frame => frame.screen === 3 && frame.outcome === 2 && frame.finishHits === 5 && frame.corpse === 1,
    'fifth actual musical finisher did not reach cleared game-over with the retained corpse', 5000)
  await capture('boss-cleared-over')
  if (overMotion.required) {
    await wait(() => state().screen === 3 && state().outcome === 2 && state().settled === 1, SETTLE_TIMEOUT, 'actual corpse physics froze before settling after game-over')
    overMotion.clearedProgressObserved = true
    overMotion.overUnsettledObserved = perf.some(frame => frame.at >= overMotion.terminalJudge.at && frame.screen === 3 && frame.outcome === 2 && frame.settled === 0)
    overMotion.observed = overMotion.overUnsettledObserved
  }
  if (process.argv.includes('--require-over-motion')) assert.ok(overMotion.required && overMotion.observed, 'this run did not exercise an unsettled corpse after game-over')
  assert.equal(state().settled, 1, 'final actual corpse remains unsettled')
  await capture('boss-settled-final')
  await chrome.send('Page.stopScreencast', {}, sessionId); clipRunning = false
  assert.ok(frames.length >= 5, 'actual browser did not publish enough native ragdoll frames')
  const concat = frames.map((frame, i) => `file '${frame.file}'\nduration ${i + 1 < frames.length ? Math.max(.001, frames[i + 1].timestamp - frame.timestamp) : .1}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`
  writeFileSync(resolve(out, 'clip', 'frames.txt'), concat)
  video = resolve(out, 'boss-ragdoll.mp4')
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-fps_mode', 'vfr', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video], { cwd: resolve(out, 'clip'), windowsHide: true })
  video = { path: video, sha256: await digest(video), frames: frames.length, ffmpeg: execFileSync(ffmpeg, ['-version'], { encoding: 'utf8', windowsHide: true }).split('\n')[0] }
  assert.ok(resources.some(resource => resource.url.includes('game-client.wasm') && resource.status === 200) && resources.some(resource => resource.url.includes('game-assets.zkpack') && resource.status === 200), 'actual production WASM and pack resource responses are missing')
  assert.ok(nativeEvents.some(event => event.type === 'keydown' && event.code === 'F6' && event.trusted), 'real native F6 route input was not observed')
  assert.ok(nativeEvents.filter(event => event.type === 'mousedown').length >= 5 && nativeEvents.filter(event => 'trusted' in event).every(event => event.trusted), 'gameplay inputs were not trusted native browser events')
  assert.deepEqual(errors, [], 'actual game/browser console or resource errors')
  for (const artifact of sourceArtifacts) assert.equal(await digest(artifact.path), artifact.sha256, `source/artifact changed during the actual run: ${artifact.path}`)
  console.log(`PASS actual boss fight, articulated corpse and five musical finishers; captures ${out}; after-over continuation ${overMotion.observed ? 'observed' : overMotion.required ? 'cleared progress observed; no unsettled-over F3 sample' : 'not required: already settled'}`)
} catch (error) {
  failure = error.stack ?? String(error); console.error(failure); process.exitCode = 1
} finally {
  if (chrome && sessionId) {
    for (const code of held) {
      try { await chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keys[code][0], windowsVirtualKeyCode: keys[code][1] }, sessionId) } catch {}
    }
    if (clipRunning) { try { await chrome.send('Page.stopScreencast', {}, sessionId) } catch {} }
  }
  off?.()
  writeFileSync(resolve(out, 'result.json'), JSON.stringify({ base, finishMode, sourceArtifacts, environment: { node: process.version, platform: process.platform, browserVersion },
    status: failure ? 'FAIL' : 'PASS', failure, elapsedMs: Date.now() - started, video, overMotion, captures, frames, inputs, nativeEvents, perf, judgments, errors, resources }, null, 2))
  writeFileSync(resolve(out, 'console.log'), logs.map(log => `${log.at} ${log.type} ${log.text}`).join('\n') + '\n')
  if (chrome) await chrome.close()
}
