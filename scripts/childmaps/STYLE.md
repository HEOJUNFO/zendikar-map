# 자식 지도 (regional child maps) — style guide

A child map is a **separately drawn regional map** at about 10× the world map's scale, opened from its
place's panel on the world map ('지역 지도 보기', 페이즈1). It is the same parchment-and-ink map as the world map, the way an
atlas follows its world sheet with regional sheets: same paper, same ink, same symbols, but the region's
own features are drawn individually instead of as generic texture.

Open it live while drawing: `pnpm dev`, then
`http://localhost:5173/?phase=1&child=<id>&childsrc=1` (reads `art/<id>.js` directly on every load).
World-map context in child coordinates: `node scripts/childmaps/context.mjs <id>`.
When done: `node scripts/childmaps/to_ts.mjs` (writes `src/map/childmaps/<id>.ts`).

## What is fixed (comes from the world map)
- Child coordinates = (world − bounds.x0/y0) × scale, where `size` / bounds gives the scale
  (`PHASE1_CHILD_MAPS` in `src/data/phase1.ts`). `size` must keep the bounds' aspect ratio.
- Sea, land, inland water, forest tint and coastline are the world map's own shapes, magnified and
  smoothed. Draw consistently with them: no land features in the sea, no sea inside land
  (rivers and pools only where the brief has them).
- World place markers and land-card markers keep their world positions and symbols. Their labels sit
  right of the marker unless `markAnchors` says otherwise (`'left' | 'right' | 'above' | 'below'`,
  keyed by place id or `card:<card id>`). Draw the region so that each marker sits on the feature it
  names (the Malakir marker on the city, the cave marker on the cave mouth).
- The page header (top-left, ~350×170px on desktop) and the zoom/language buttons (bottom-left,
  ~300×70px) float over the map. Keep labels, subjects and focal features out of the top-left
  quarter-by-sixth and the bottom-left corner; terrain may run under them.

## What the cartographer draws (`art/<id>.js`)
```js
CHILDMAPS.push({
  id: 'malakir',
  size: [1400, 1000],
  glyphScale: 4,          // world terrain symbols × this (child units). 3–5.
  terrain: [              // symbol fields, scattered by the app with the world map's own symbols
    { kind: 'mountain' | 'hill' | 'forest' | 'swamp' | 'canyon', points: [[x, y], …], density: 1 },
  ],
  parts: [ { cls: 'ink', d: 'M… ' }, … ],   // hand-drawn features, painted in order
  labels: [ { text, textKo?, at: [x, y], size, kind: 'area' | 'water' | 'place', rotate? } ],
  subjects: { '<phase card id>': { at: [x, y], size, flip? } },
  markAnchors: { 'malakir': 'left', 'card:piranha-marsh': 'below' },
  focus: [x, y],          // optional: where a phone's first (full-height) view is centred; default = the subjects' centre
})
```
The file is plain JavaScript run in a sandbox (`node:vm`) and in the browser, so it may define
helper functions and loops, as long as it is deterministic (no `Math.random`; use `KIT.rng(seed)`)
and ends with one `CHILDMAPS.push`.

### The drawing kit (`kit.js`, global `KIT`) — use it so the five maps share one hand
Each motif returns its own parts in paint order (fill → hatch → ink). Combine several motifs with
`KIT.stack([{ y, parts }, …])`, which paints from the back (smaller y) to the front.
- `house(x, y, w, h, { roof: 'gable'|'hip'|'dome'|'flat', roofH, door })` — town-view building, (x, y) = base centre
- `tower(x, y, w, h, { top: 'crenel'|'cone'|'spire'|'flat', taper, capH, windows })`
- `wall(points, h, { merlon })` — wall band in elevation along a polyline
- `cliff(points, { depth, step, side, mode: 'face'|'hachure', seed })` — edge line with the rock face below
- `river(points, w0, w1)`, `pool(points, { ripples })`, `ripples(x, y, w, n, seed)` — water inside land
- `hedron(x, y, len, rot, { grounded, shadow, lift })` — the world map's hedron at any size
- `rocks(x, y, size, n, seed)`, `spire(x, y, w, h, seed)`, `cave(x, y, w, h)`, `ruin(x, y, w, h, seed)`
- `tree(x, y, h, seed)` — one large tree in the world map's tree style
- `dashed(points, dash, gap)` — a track or path
- geometry: `line(pts)`, `poly(pts)`, `smooth(pts, closed)`, `offset(pts, dist | t => dist)`, `along(pts, step)`, `rng(seed)`
Add your own helpers in your art file for motifs the kit lacks (match the kit's look: vellum/stone fill,
sparse hatch on the right-hand shadow side, ink outline).

### Terrain fields — how the app fills them
The app fills each field with Poisson-disk symbols, but it tries only one starting point per cell about
five symbol spacings wide (≈260 child units for mountains at glyphScale 4). A narrow band can miss every
start and draw nothing, and a field's result also depends on its index in `terrain`. Always check the
render (the dev console warns `지형 칸 … 기호가 하나도 없다`); if a field comes out empty, widen it, merge it
with a neighbour, or change the order of the fields. Holes cut into a field with even-odd "keyhole"
rings must not overlap one another.

### Layers and classes
Parts use the phase-figure classes (stroke widths are screen px and never scale):
`fill` (vellum, under every closed shape that must hide what is behind), `shade` (shadow side),
`stone` (rock, masonry, hedrons), `forest` (plant matter), `sea` (water fill), `fire`, `blood`,
`gold` (tiny accents only), `dark` (small solid ink: doorways, deep openings), `ink` (1.15px outline),
`ink-bold` (1.5px, the few edges that carry the silhouette), `hatch` (0.6px form and shadow lines),
`fire-ink`, `sea-ink` (0.9px water lines: rivers, ripples, shore lines).
Paint order inside `parts` is the array order: fills and washes first, hatch next, ink on top.
Terrain symbols are painted under all parts, so a city drawn over a forest field hides the trees under
its `fill`.

### Drawing language (match the world map)
- Engraved, hand-inked look. Strong simple silhouettes, sparse hatching, no gradients, no shadows other
  than hatch and `shade`, no text inside drawings, no frames or compass roses.
- Terrain symbols say "this ground is mountains / forest / swamp"; hand-drawn parts say "this is that
  specific thing" (a named city, a cave mouth, a cliff where goblins dig, a ruin). Do not hand-draw
  generic terrain the symbol fields already give.
- Hierarchy: one focal feature per map (the place the map is named after), drawn larger and with
  more care; secondary features smaller; terrain quiet. Leave visible vellum: a regional map breathes.
- Built things in elevation (side view) on a plan-correct footprint, like old town views on maps:
  walls as a band with crenels or posts, buildings as small blocks with roofs, towers taller.
- Water: rivers as one or two `sea-ink` lines widening downstream, ponds and flooded ground as `sea`
  fill with `sea-ink` ripples, all inside land.
- Scale: a person-sized subject is drawn at 70–110 child units so it reads on a phone. Buildings,
  cliffs and trees are drawn at map scale, not to the person's scale (maps exaggerate figures).

### Labels
Only official names (the brief marks which features may be labelled). Never invent a name, never
label an unnamed feature with a description. `kind: 'area'` for districts and regions (italic,
spaced), `'water'` for water, `'place'` for a single named structure. `size` is in child units
(about 26–40 for areas, 20–28 for places); the app clamps screen size to 11–34px. `textKo` only
when an official Korean card prints that name. Labels must not collide with each other, the world
markers' labels, the subjects' captions (13px, centred under each figure), or the floating UI.

### Subjects
Place each phase subject where the brief's canon puts it (or its stated interpretation), at a readable
size, not overlapping labels or markers, its caption clear below it. `flip: true` mirrors it to face
into the map.

## Canon
Everything drawn must be either stated by the brief's sources or a composition the brief allows as
interpretation. Respect the brief's `mustNotInvent` list. The interpretation note shown in the
header says which parts are this map's own reading.
