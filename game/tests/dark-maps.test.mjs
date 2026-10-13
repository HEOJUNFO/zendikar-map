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
    ['room_nave', [-18, -9, 0, 9, 18].flatMap(z => [[-7.5, z], [7.5, z]]), [[0, -21.5], [0, 21.5]]],
    ['room_cross', [], [[0, -21.5], [21.5, 0], [0, 21.5], [-21.5, 0]]],
  ]) {
    const mesh = parseMeshText(readFileSync(new URL(`meshes/${name}.mesh.txt`, content), 'utf8'), name, { textures, props })
    const grounded = (x, z) => mesh.solids.some(([x0, y0, z0, x1, y1, z1]) => y0 < 0 && y1 >= 0 && x >= x0 && x <= x1 && z >= z0 && z <= z1)
    for (const [x, z] of pits) assert.equal(grounded(x, z), false, `${name}: real void at ${x},${z}`)
    for (const [x, z] of [[0, 0], ...doors]) assert.equal(grounded(x, z), true, `${name}: safe floor at ${x},${z}`)
    assert.ok(mesh.surface.lightmap.width <= 2048 && mesh.surface.lightmap.height <= 2048)
    assert.ok(mesh.surface.nav.length > 0)
    if (name === 'room_nave') {
      // Hand dimensions: 27×48 footprint, two 8.85×39 voids (690.3 m², 53.3%).
      const supportedArea = mesh.solids.filter(box => box[1] === -1 && box[4] === 0).reduce((area, [x0, , z0, x1, , z1]) =>
        area + Math.max(0, Math.min(13.5, x1) - Math.max(-13.5, x0)) * Math.max(0, Math.min(24, z1) - Math.max(-24, z0)), 0)
      assert.ok(Math.abs(supportedArea - (27 * 48 - 2 * 8.85 * 39)) < 1e-6)
      assert.ok(supportedArea < 27 * 48 / 2, 'abyss occupies the majority of the room')
      for (const z of [-18, 0, 18]) {
        for (const x of [-12, 0, 12]) assert.ok(grounded(x, z), 'bridge and side galleries remain supported')
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
  for (const [name, stairX, bottom] of [['room_hall', 16.5, 0], ['room_cross', 4.2, 0], ['room_nave', 12, 0]]) {
    const mesh = parseMeshText(readFileSync(new URL(`meshes/${name}.mesh.txt`, content), 'utf8'), name, { textures, props })
    const nav = mesh.surface.nav
    assert.equal(nav.length, 25)
    for (const sign of [-1, 1]) {
      // Fourteen literal 0.25 m risers, with 8 m of horizontal run.
      for (let step = 0; step < 14; step++) {
        const x = sign * stairX, z = sign * (8 + (step + .5) * 8 / 14), height = (step + 1) * .25
        assert.ok(mesh.solids.some(([x0, y0, z0, x1, y1, z1]) => x > x0 && x < x1 && z > z0 && z < z1 && y0 === 0 && Math.abs(y1 - height) < 1e-5))
      }
      const points = [[sign * stairX, bottom, sign * 7], [sign * stairX, .75, sign * 8.9], [sign * stairX, 2.25, sign * 12], [sign * stairX, 3.5, sign * 15.7]]
      const indices = points.map(point => nav.findIndex(node => node.position.every((value, i) => Math.abs(value - point[i]) < 1e-5)))
      assert.ok(indices.every(index => index >= 0))
      for (let i = 0; i < 3; i++) assert.ok(nav[indices[i]].links & (1 << indices[i + 1]), `${name}: complete ascent on stair ${sign}`)
    }
    assert.ok(nav.filter(node => node.position[1] === 3.5).length >= 8)
  }
})

test('48m Skyclave layouts retain 4m doors, safe real arrival floors and independent circulation/cover', () => {
  const content = new URL('../gameplay/content/', import.meta.url)
  const textures = parseTextureList(readFileSync(new URL('textures/textures.txt', content), 'utf8')).map(texture => texture.name)
  const props = loadPropLibrary(fileURLToPath(new URL('props/props.txt', content)), fileURLToPath(new URL('props/', content)))
  const shapes = [['room_start', [0, 1, 2, 3]], ['room_hall', [0, 1, 2, 3]], ['room_nave', [0, 2]], ['room_ell', [0, 1]], ['room_cross', [0, 1, 2, 3]], ['room_tee', [1, 2, 3]]]
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  for (const [name, sites] of shapes) {
    const source = readFileSync(new URL(`meshes/${name}.mesh.txt`, content), 'utf8')
    const mesh = parseMeshText(source, name, { textures, props })
    assert.doesNotMatch(source, /^prop (?:bust|lion_head|bull_head)\b/m, 'classical statues cannot return to the Skyclave architecture')
    assert.match(source, /48 m × 48 m/)
    assert.ok(mesh.surface.nav.length <= 32)
    for (const direction of sites) {
      const [dx, dz] = directions[direction]
      const x = dx * 21.5, z = dz * 21.5
      assert.ok(mesh.solids.some(box => box[1] === -1 && box[4] === 0 && x >= box[0] && x <= box[3] && z >= box[2] && z <= box[5]), `${name}: portal arrival floor remains at y=0`)
      assert.ok(!mesh.solids.some(box => box[1] < 2.2 && box[4] > .02 && box[0] < x + .7 && box[3] > x - .7 && box[2] < z + .7 && box[5] > z - .7), `${name}: arrival fits a full standing body`)
    }
    if (name === 'room_hall') {
      for (const x of [-7.5, 7.5]) for (const z of [-7.5, 7.5])
        assert.ok(mesh.solids.some(box => box[0] === x - 1.8 && box[3] === x + 1.8 && box[2] === z - 1.5 && box[5] === z + 1.5 && box[4] === 1.05), 'real jumpable lower cover keeps the central firing axes clear')
      const centre = mesh.surface.nav[0]
      assert.ok(centre.links && mesh.surface.nav.every(node => node.links), 'cover retains a connected lower arena and two upper access routes')
    }
  }
  for (const name of ['gate', 'sealed']) {
    const mesh = parseMeshText(readFileSync(new URL(`meshes/${name}.mesh.txt`, content), 'utf8'), name, { textures, props })
    assert.equal(mesh.solids.length, 1)
    assert.equal(mesh.solids[0][0], -2)
    assert.equal(mesh.solids[0][3], 2)
    assert.ok(mesh.solids[0][2] < -24 && mesh.solids[0][5] >= -24.85 && mesh.solids[0][5] <= -23.75, 'the unscaled 4m seal belongs to the 24m socket')
  }
})
