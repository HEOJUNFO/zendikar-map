// Actual game, trusted CDP keys/mouse, public F3/F6 diagnostics and native events.
// Run after the final production build: node game/tests/shop-flow.browser.mjs
// [--base http://localhost:5173] [--out build/shop-flow-browser]
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchChrome } from '../../scripts/qa/chrome.mjs'
import { waitForState } from '../tools/perf-events.mjs'

const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? fallback : process.argv[at + 1] }
const base = arg('base', 'http://localhost:5173').replace(/\/$/, '')
const out = resolve(arg('out', 'build/shop-flow-browser'))
const width = 1920, height = 1080
mkdirSync(out, { recursive: true })
const digest = async path => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}
const artifacts = await Promise.all(['game-client.wasm', 'game-assets.zkpack'].map(async name => ({ path: resolve('public/wasm', name), sha256: await digest(resolve('public/wasm', name)) })))
const events = new EventEmitter(), logs = [], inputs = [], perf = [], judgments = [], errors = [], resources = [], pointerEvents = []
const started = Date.now()
let ready = false, assets = 'loading', locked = false, failure = null, chrome, off
let pointer = { x: width / 2, y: height / 2 }
const keys = {
  Enter: ['Enter', 13], Escape: ['Escape', 27], F3: ['F3', 114], F6: ['F6', 117],
  KeyW: ['w', 87], KeyS: ['s', 83], KeyE: ['e', 69], KeyR: ['r', 82],
}
const parse = text => Object.fromEntries([...text.matchAll(/(\w+)=([^\s]+)/g)].map(([, name, value]) => [name, Number.isFinite(Number(value)) ? Number(value) : value]))
const state = () => perf.at(-1) ?? {}
const wait = (predicate, timeout, message) => waitForState(events, predicate, timeout, message)
const gameplayTime = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  chrome = await launchChrome({ width, height, maxMinutes: 3 })
  const { sessionId } = await chrome.newPage(null)
  const sessions = new Set([sessionId])
  off = chrome.on(message => {
    if (message.method === 'Target.attachedToTarget' && sessions.has(message.sessionId)) {
      sessions.add(message.params.sessionId)
      chrome.send('Runtime.enable', {}, message.params.sessionId).catch(error => { errors.push(error.message); events.emit('change') })
      chrome.send('Network.enable', {}, message.params.sessionId).catch(error => { errors.push(error.message); events.emit('change') })
    }
    if (!sessions.has(message.sessionId)) return
    if (message.method === 'Runtime.bindingCalled' && message.params.name === 'shopFlowPointer') {
      locked = message.params.payload === 'true'
      pointerEvents.push({ at: Date.now() - started, locked })
      events.emit('change')
    } else if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ')
      logs.push({ at: Date.now() - started, type: message.params.type, text })
      if (text === '[app] 클라이언트 시작 — WebGPU / OffscreenCanvas') ready = true
      else if (text === '[game] assets ready') assets = 'ready'
      else if (text === '[game] assets failed') assets = 'failed'
      else if (text.startsWith('[perf] ')) perf.push({ ...parse(text), at: Date.now() - started })
      else if (text.startsWith('[judge] ')) judgments.push({ ...parse(text), at: Date.now() - started })
      if (message.params.type === 'error') errors.push(text)
      events.emit('change')
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
      events.emit('change')
    } else if (message.method === 'Network.responseReceived' && /(?:game-client\.wasm|game-assets\.zkpack)$/.test(message.params.response.url)) {
      resources.push({ url: message.params.response.url, status: message.params.response.status })
    }
  })
  await chrome.send('Runtime.addBinding', { name: 'shopFlowPointer' }, sessionId)
  await chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('pointerlockchange', () => shopFlowPointer(String(document.pointerLockElement !== null)));` }, sessionId)
  await chrome.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId)
  await chrome.send('Network.enable', {}, sessionId)
  const key = async (code, pressed) => {
    inputs.push({ at: Date.now() - started, type: pressed ? 'keyDown' : 'keyUp', code })
    await chrome.send('Input.dispatchKeyEvent', { type: pressed ? 'rawKeyDown' : 'keyUp', code, key: keys[code][0], windowsVirtualKeyCode: keys[code][1] }, sessionId)
  }
  const tap = async code => { await key(code, true); await key(code, false) }
  const movePointer = async (x, y) => {
    pointer = { x, y }
    inputs.push({ at: Date.now() - started, type: 'mouseMoved', x, y })
    await chrome.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId)
  }
  const fire = async () => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      inputs.push({ at: Date.now() - started, type, ...pointer })
      await chrome.send('Input.dispatchMouseEvent', { type, ...pointer, button: 'left', clickCount: 1 }, sessionId)
    }
  }
  const fresh = async (after, predicate, message, timeout = 4000) => wait(() => perf.length > after && predicate(state()), timeout, message)
  const shot = async name => {
    const result = await chrome.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(result.data, 'base64'))
  }
  const stage = name => console.log(`${name}: ${JSON.stringify(state())}`)
  await chrome.send('Page.navigate', { url: `${base}/game/` }, sessionId)
  await wait(() => ready || errors.length, 25000, 'actual WebGPU client startup event did not arrive')
  assert.ok(ready, errors.join('\n'))
  await wait(() => assets !== 'loading' || errors.length, 60000, 'actual asset publication event did not arrive')
  assert.equal(assets, 'ready', errors.join('\n'))
  await tap('F3')
  await wait(() => perf.length > 0, 4000, 'F3 did not publish an actual frame snapshot')
  await tap('Enter')
  await tap('Enter')
  await wait(() => state().screen === 1 && locked, 5000, 'trusted menu Enter keys did not start and capture gameplay')
  let before = perf.length
  await tap('F6')
  await fresh(before, frame => frame.room === 0 && frame.health === 100, 'F6 public tour did not reset the actual world')
  before = perf.length
  await key('KeyW', true)
  try { await fresh(before, frame => frame.room === 9, 'walking through the real north portal did not reach merchant room 9', 7000) }
  finally { await key('KeyW', false) }
  before = perf.length
  await fresh(before, frame => frame.room === 9, 'portal arrival did not settle into the actual merchant room')
  assert.equal(state().shopOpen, 0, 'entering a merchant room must not open the card panel automatically')
  // Walk to a 1.8 m conversation distance using the observed public F3 position.
  // The 0.123 m term is acceleration/braking travel; this timer advances gameplay.
  const distance = state().playerz - 1.8
  assert.ok(distance > 0 && distance < 23, `unexpected real 48m-room portal arrival position: ${JSON.stringify(state())}`)
  await key('KeyW', true)
  await gameplayTime(Math.max(0, (distance - .123) / 6 * 1000))
  await key('KeyW', false)
  before = perf.length
  await fresh(before, frame => frame.room === 9 && Math.abs(frame.playerz - 1.8) < .8, 'real walking did not stop near the seated merchant')
  await shot('merchant-seated')
  before = perf.length
  await tap('KeyE')
  await fresh(before, frame => frame.shopOpen === 1 && frame.screen === 1, 'near-merchant E did not open the actual card modal')
  await wait(() => !locked, 3000, 'opening the modal did not release the native pointer')
  await movePointer(width / 2, height / 2)
  await shot('shop-three-offers')
  const health = state().health, gold = state().gold
  before = perf.length
  await tap('KeyR')
  await fresh(before, frame => frame.shopOpen === 1 && frame.health === health - 25, 'modal R did not apply its actual 25-HP cost')
  assert.equal(state().gold, gold, 'blood reroll cannot alter gold')
  await shot('shop-blood-reroll')
  before = perf.length
  await tap('Escape')
  await fresh(before, frame => frame.shopOpen === 0 && frame.screen === 1, 'Escape did not close and consume the modal without pausing')
  // A browser may deny immediate pointer re-entry after Escape. Exercise the
  // product's real click-to-recapture path rather than changing browser state.
  if (!locked) { await movePointer(width / 2, height / 2); await fire() }
  await wait(() => locked, 3000, 'gameplay pointer was not recaptured after closing the modal')
  before = perf.length
  await fresh(before, frame => frame.shopOpen === 0 && frame.screen === 1, 'closed-modal gameplay did not resume')
  stage('shop-input-flow')
  // Aim down at the actual seated torso; CDP mouseMoved produces trusted native
  // movement while pointer-locked. Do not inject MouseEvent or alter timestamps.
  const pitch = Math.atan2(state().playery - .87, Math.abs(state().playerz))
  await movePointer(width / 2, height / 2 + Math.round(pitch / .0022))
  const accepted = async (kind, action, desired) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const count = judgments.length
      await action()
      await wait(() => judgments.length > count && judgments.at(-1).what === kind, 2500, `actual ${kind} judgment did not arrive`)
      const judged = judgments.at(-1)
      // Schedule the next real user action at the next public rhythm slot.
      await gameplayTime((20 - ((judged.off % 20 + 20) % 20)) * 1000 / 60)
      if (judged.result === desired) return
    }
    throw new Error(`eight trusted ${kind} inputs did not produce ${desired}`)
  }
  before = perf.length
  await accepted('fire', fire, 'shot')
  await fresh(before, frame => frame.merchantHP === 100, 'the first real shot missed the seated merchant target')
  await accepted('reload', () => tap('KeyR'), 'magazine_out')
  await accepted('reload', () => tap('KeyR'), 'magazine_in')
  before = perf.length
  await fresh(before, frame => frame.health === health - 25 && frame.shopOpen === 0, 'normal R reload incorrectly reused the blood reroll action')
  await accepted('fire', fire, 'shot')
  await accepted('fire', fire, 'shot')
  await wait(() => perf.some(frame => frame.merchantPhase === 1), 5000, 'three real shots did not publish the merchant fallen stage')
  await shot('merchant-fallen')
  await wait(() => perf.some(frame => frame.merchantPhase === 2), 5000, 'fallen merchant did not publish the rising stage')
  await shot('merchant-rising')
  await wait(() => state().merchantPhase === 3 && state().enemies === 1, 5000, 'rising merchant did not become the real hunting nightmare')
  await shot('merchant-hunting')
  stage('nightmare-lifecycle')
  assert.equal(judgments.filter(judged => judged.what === 'fire' && judged.result === 'shot').length, 3, 'the actual merchant kill uses three accepted shots')
  assert.deepEqual(errors, [], 'actual game/browser console errors')
  console.log(`PASS actual shop input and merchant lifecycle; artifacts ${out}`)
} catch (error) {
  failure = error.stack ?? String(error)
  console.error(failure)
  process.exitCode = 1
} finally {
  off?.()
  writeFileSync(resolve(out, 'result.json'), JSON.stringify({ base, artifacts, status: failure ? 'FAIL' : 'PASS', failure, elapsedMs: Date.now() - started,
    inputs, pointerEvents, perf, judgments, errors, resources }, null, 2))
  writeFileSync(resolve(out, 'console.log'), logs.map(log => `${log.at} ${log.type} ${log.text}`).join('\n'))
  if (chrome) await chrome.close()
}
