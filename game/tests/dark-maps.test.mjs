import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { linkWaypoints, loadPropLibrary, parseMeshText } from '../tools/meshc.mjs'
import { parseTextureList } from '../tools/packc.mjs'

test('ground navigation rejects a visible gap and follows its continuous bridge', () => {
  const floor = [[-6, -1, -3, -1, 0, 4], [1, -1, -3, 6, 0, 4]]
  assert.throws(() => linkWaypoints([[-3, 0, 0], [3, 0, 0]], floor), /이어지지 않는다/)
  assert.throws(() => linkWaypoints([[0, 0, 0]], floor), /바닥/)
  const bridge = [...floor, [-1, -1, 1.5, 1, 0, 3.5]]
  const nav = linkWaypoints([[-3, 0, 0], [-3, 0, 2.5], [3, 0, 2.5], [3, 0, 0]], bridge)
  assert.equal(nav[0].links & (1 << 3), 0, 'opposite banks cannot connect through air')
  assert.ok(nav[1].links & (1 << 2), 'the bridge joins both banks')
  // Adjacent floor slabs meet exactly; their shared seam cannot become a gap.
  assert.deepEqual(linkWaypoints([[-3, 0, 0], [3, 0, 0]], [[-6, -1, -3, 0, 0, 3], [0, -1, -3, 6, 0, 3]]).map((p) => p.links), [2, 1])
})

test('ground routes retain body support at an inside corner instead of cutting across the pit', () => {
  // The diagonal centerline touches (1,-1), but its outside 0.6 m lane crosses air.
  const floor = [[-1, -1, -8, 1, 0, -1], [-1, -1, -1, 8, 0, 1]]
  const nav = linkWaypoints([[0, 0, -2], [0, 0, 0], [2, 0, 0]], floor)
  assert.deepEqual(nav.map(node => node.links), [2, 5, 2], 'route goes through the supported corner')
})

test('dedicated abyss room has two map-wide black voids while the normal cross room has continuous floor', () => {
  const content = new URL('../gameplay/content/', import.meta.url)
  const textures = parseTextureList(readFileSync(new URL('textures/textures.txt', content), 'utf8')).map((t) => t.name)
  const props = loadPropLibrary(fileURLToPath(new URL('props/props.txt', content)), fileURLToPath(new URL('props/', content)))
  for (const [name, pits, doors] of [
    ['room_nave', [-12, -6, 0, 6, 12].flatMap(z => [[-5, z], [5, z]]), [[0, -13.5], [0, 13.5]]],
    ['room_cross', [], [[0, -13.5], [13.5, 0], [0, 13.5], [-13.5, 0]]],
  ]) {
    const mesh = parseMeshText(readFileSync(new URL(`meshes/${name}.mesh.txt`, content), 'utf8'), name, { textures, props })
    const grounded = (x, z) => mesh.solids.some(([x0, y0, z0, x1, y1, z1]) => y0 < 0 && y1 >= 0 && x >= x0 && x <= x1 && z >= z0 && z <= z1)
    for (const [x, z] of pits) assert.equal(grounded(x, z), false, `${name}: real void at ${x},${z}`)
    for (const [x, z] of [[0, 0], ...doors]) assert.equal(grounded(x, z), true, `${name}: safe floor at ${x},${z}`)
    assert.ok(mesh.surface.lightmap.width <= 2048 && mesh.surface.lightmap.height <= 2048)
    assert.ok(mesh.surface.nav.length > 0)
    if (name === 'room_nave') {
      // Hand dimensions: 18×32 footprint, two 5.9×26 voids (306.8 m², 53.3%).
      const supportedArea = mesh.solids.filter(box => box[1] === -1 && box[4] === 0).reduce((area, [x0, , z0, x1, , z1]) =>
        area + Math.max(0, Math.min(9, x1) - Math.max(-9, x0)) * Math.max(0, Math.min(16, z1) - Math.max(-16, z0)), 0)
      assert.ok(Math.abs(supportedArea - (18 * 32 - 2 * 5.9 * 26)) < 1e-6)
      assert.ok(supportedArea < 18 * 32 / 2, 'abyss occupies the majority of the room')
      for (const z of [-12, 0, 12]) {
        for (const x of [-8, 0, 8]) assert.ok(grounded(x, z), 'bridge and side galleries remain supported')
      }
      assert.equal(mesh.surface.nav.length, 25)
      assert.ok(mesh.surface.nav[0].links & (1 << 1), 'central bridge connects its end platform')
      assert.ok(mesh.surface.nav[0].links & (1 << 3), 'end platform joins the west gallery')
      let deepVertices = 0
      for (let at = 0; at < mesh.surface.vertices.length; at += 15) {
        if (mesh.surface.vertices[at + 1] >= -4) continue
        deepVertices++
        assert.deepEqual(Array.from(mesh.surface.vertices.subarray(at + 10, at + 13)), [0, 0, 0], 'deep walls and bottom absorb all light')
      }
      assert.ok(deepVertices > 0 && mesh.surface.vertices.some((v, i) => i % 15 === 1 && v <= -24))
    } else {
      for (const z of [-8.2, 8.2]) for (const x of [-3.6, 3.6]) assert.ok(grounded(x, z), 'normal room has no scattered pits')
    }
  }
})

test('two-floor rooms provide two real quarter-metre stair routes and clear upper galleries', () => {
  const content = new URL('../gameplay/content/', import.meta.url)
  const textures = parseTextureList(readFileSync(new URL('textures/textures.txt', content), 'utf8')).map(t => t.name)
  const props = loadPropLibrary(fileURLToPath(new URL('props/props.txt', content)), fileURLToPath(new URL('props/', content)))
  const overlap = (a, b) => a[0] < b[3] && a[3] > b[0] && a[1] < b[4] && a[4] > b[1] && a[2] < b[5] && a[5] > b[2]
  for (const [name, stairX, bottom] of [['room_hall', 11, 0], ['room_cross', 2.8, 0.4], ['room_nave', 8, 0]]) {
    const mesh = parseMeshText(readFileSync(new URL(`meshes/${name}.mesh.txt`, content), 'utf8'), name, { textures, props })
    const nav = mesh.surface.nav
    assert.equal(nav.length, 25)
    for (const node of nav) {
      const [x, y, z] = node.position
      assert.ok(!mesh.solids.some(box => overlap(box, [x - .6, y + .02, z - .6, x + .6, y + 2.4, z + .6])), `${name}: full enemy body stands at ${node.position}`)
    }
    for (const sign of [-1, 1]) {
      // Fourteen literal 0.25 m risers, with 8 m of horizontal run.
      for (let step = 0; step < 14; step++) {
        const x = sign * stairX, z = sign * (4 + (step + .5) * 8 / 14), height = (step + 1) * .25
        assert.ok(mesh.solids.some(([x0, y0, z0, x1, y1, z1]) => x > x0 && x < x1 && z > z0 && z < z1 && y0 === 0 && Math.abs(y1 - height) < 1e-5))
      }
      const points = [[sign * stairX, bottom, sign * 3], [sign * stairX, .75, sign * 4.9], [sign * stairX, 2.25, sign * 8], [sign * stairX, 3.5, sign * 11.7]]
      const indices = points.map(point => nav.findIndex(node => node.position.every((value, i) => Math.abs(value - point[i]) < 1e-5)))
      assert.ok(indices.every(index => index >= 0))
      for (let i = 0; i < 3; i++) assert.ok(nav[indices[i]].links & (1 << indices[i + 1]), `${name}: complete ascent on stair ${sign}`)
    }
    assert.ok(nav.filter(node => node.position[1] === 3.5).length >= 8)
  }
})
