import assert from 'node:assert/strict'
import test from 'node:test'
import { FigureArtStore } from '../../src/map/figureArtStore.ts'

const art = ink => ({ viewBox: [0, 0, 8, 12], anchor: [4, 12], parts: [{ cls: 'ink', d: ink }] })

test('completed figure groups publish together and retain the original artwork', () => {
  const store = new FigureArtStore()
  const first = art('M0 0L4 12'), second = art('M1 2L8 5')
  const seen = []
  store.subscribe(() => seen.push([store.get('world', 'drake'), store.get('halimar', 'merfolk')]))
  store.add([['world', { drake: first }], ['halimar', { merfolk: second }]])
  assert.deepEqual(seen, [[first, second]], 'observers see the complete batch in one publication')
  assert.equal(store.get('world', 'drake'), first, 'loaded paths are reused by identity')
  assert.equal(store.getSnapshot(), 1)
})

test('late groups and duplicate completions preserve already published groups', () => {
  const store = new FigureArtStore(), first = art('M0 0L1 1'), later = art('M2 2L3 3')
  store.add([['world', { original: first }]])
  store.add([['world-2', { later }]])
  const revision = store.getSnapshot()
  store.add([['world', { replacement: art('M9 9') }]])
  store.add([])
  assert.equal(store.getSnapshot(), revision, 'duplicates and empty batches do not trigger rendering')
  assert.equal(store.get('world', 'original'), first)
  assert.equal(store.get('world', 'replacement'), undefined)
  assert.equal(store.get('world-2', 'later'), later)
  assert.equal(store.has('failed'), false, 'unfinished groups remain eligible for loading')
  assert.equal(store.get(undefined, 'unknown'), undefined)
})

test('unmounted figure observers are released without removing cached art', () => {
  const store = new FigureArtStore()
  let publications = 0
  const unsubscribe = store.subscribe(() => publications++)
  store.add([['world', { first: art('M0 0') }]])
  unsubscribe()
  store.add([['world-2', { second: art('M1 1') }]])
  assert.equal(publications, 1)
  assert.equal(store.has('world'), true)
  assert.equal(store.getSnapshot(), 2)
})
