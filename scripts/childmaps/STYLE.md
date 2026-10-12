# 지역 상세 (자식 지도, regional detail) — style guide

A regional detail is a **separately drawn regional map** at about 4–17× the world map's scale (most ≈7–8×). It is no
longer opened as its own screen: when the world map is zoomed in far enough that one child unit is about 0.6px on
screen (from tier `DEEP_TIER`), the drawing appears **in place on the world map**, whether or not Phase 1 is on (the
phase subjects inside it need Phase 1). The place's panel button '가까이 보기' zooms there. It is the same
parchment-and-ink map as the world map, like the regional sheets of one atlas: same paper, ink and symbols, but the
region's own features are drawn individually instead of as generic texture. There is **no frame**: the world map
continues right up to the region and the region must read as part of one continuous map.

Open it live while drawing: `pnpm dev`, then `http://localhost:5173/?phase=1&childsrc=1` (reads `art/<id>.js` directly),
open the place's panel and press '가까이 보기' (or add `&view=x,y,k`).
World-map context in child coordinates: `node scripts/childmaps/context.mjs <id>`.
When done: `node scripts/childmaps/to_ts.mjs` (writes `src/map/childmaps/<id>.ts` and `src/map/childMapSizes.ts`).

## What is fixed (comes from the world map)
- Child coordinates = (world − bounds.x0/y0) × scale, where `size` / bounds gives the scale
  (`CHILD_MAPS` in `src/data/childMaps.ts`). `size` must keep the bounds' aspect ratio.
- Sea, land, inland water, forest tint, coastline, coastal ripples and shore shade are the world map's own
  (at deep zoom the coast is smoothed once more — `deepRings()` in `src/map/geo.ts`, the same shape
  `context.mjs` gives you). Draw consistently with them: no land features in the sea, no sea inside land
  (rivers and pools only where the brief has them). `ripples` is ignored now (the world's ripples continue through).
- Inside the bounds the app hides the world map's rivers, cliff/gorge lines, landmark glyphs, hedrons, world
  figures and area labels — redraw the ones the region needs (copy their geometry from `context.mjs` so they
  meet the world's at the edge). Parts are clipped to the bounds rectangle, so anything crossing the edge
  (a river, a cliff) must continue the world's line exactly. Do not draw arrows or names pointing outside the
  bounds: the neighbouring place is right there on the same map.
- World place markers and land-card markers keep their world positions and symbols. Their labels sit
  right of the marker unless `markAnchors` says otherwise (`'left' | 'right' | 'above' | 'below'`,
  keyed by place id or `card:<card id>`). Draw the region so that each marker sits on the feature it
  names (the Malakir marker on the city, the cave marker on the cave mouth).
- The region can sit anywhere on screen at any deep zoom, so there is no safe corner to plan around; the
  page header and buttons simply float over whatever is under them.

## What the cartographer draws (`art/<id>.js`)
```js
CHILDMAPS.push({
  id: 'malakir',
  size: [1400, 1000],
  glyphScale: 4,          // kept for the data shape; the app now scatters symbols at the surrounding world size
  terrain: [              // symbol fields, scattered by the app with the world map's own symbols at the world's fine-terrain size
    { kind: 'mountain' | 'snow' | 'hill' | 'forest' | 'swamp' | 'canyon' | 'mangrove' | 'tundra' | 'crystal' | 'ice' | 'lava' | 'mesa', points: [[x, y], …], density: 1, phase?: true | false, phase2?: true | false, phase3?: true | false },
  ],
  clearings: [ { points: [[x, y], …], phase2: true } ],   // optional: symbols are left out inside these in that phase (phase3: true for Phase 3)
  parts: [ { cls: 'ink', d: 'M… ', phase?: true | false, phase2?: true | false, phase3?: true | false }, … ],   // hand-drawn features, painted in order
  labels: [ { text, textKo?, at: [x, y], size, kind: 'area' | 'water' | 'place', rotate? } ],
  subjects: { '<phase card id>': { at: [x, y], size, flip? } },
  markAnchors: { 'malakir': 'left', 'card:piranha-marsh': 'below' },
  focus: [x, y],          // optional, unused since the merge (kept for the data shape)
})
```
The file is plain JavaScript run in a sandbox (`node:vm`) and in the browser, so it may define
helper functions and loops, as long as it is deterministic (no `Math.random`; use `KIT.rng(seed)`)
and ends with one `CHILDMAPS.push`.

### The drawing kit (`kit.js`, global `KIT`) — use it so the regions share one hand
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
The app fills each field with Poisson-disk symbols at the same size and spacing as the world's fine terrain
around the region (`detailTerrain` in `src/map/childDetail.ts`), tile by tile as you zoom. Along the bounds
edge there is a blend band (about 8% of the shorter side, 4–14 world units, half inside and half outside):
each spot there goes to either the region's fields or the world's own terrain, so let fields run a little
past the bounds where the terrain continues, and use the same kind the world uses there (the world's mangrove
forests, tundra, crystal fields, ice, lava and mesas have their own kinds) so the glyphs do not change at the edge. Holes cut into a field with even-odd "keyhole" rings must not
overlap one another.
The edge band is shared in patches a few glyphs wide (not spot by spot), so neither side's glyphs pile on the
other's. Crystal and mesa fields are thinned with the world's own noise, so the same density reads the same.

Phase 1 subjects need room, but the regional detail also shows with Phase 1 off. Give clearings that exist only for
a subject (and pedestals or plinths drawn for it) `phase: true`, and give a field that fills such a clearing when the
subjects are hidden `phase: false`. Fields and parts without `phase` always draw.
Phase 2 (WWK) subjects added to an existing detail get their room from `clearings` instead: a polygon with
`phase2: true` drops only the symbols whose base falls inside it while Phase 2 is on, so every other symbol keeps its
spot and shape in all phases (re-cutting a field would reseed its whole pattern). Parts drawn only for a Phase 2
subject take `phase2: true` (and `phase2: false` for what they replace); `phase` and `phase2` combine. Phase 3 (ROE)
subjects use `phase3` the same way (true from Phase 3 on, false below it); all three flags combine (`inPhase`).

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
- Scale: a person-sized subject is drawn at 70–110 child units so it reads on a phone. Its card's `at`, `size`
  and `flip` in `phase1.ts`/`phase2.ts`/`phase3.ts` must equal the subject converted to world units (`to_ts.mjs` stops and prints the
  values when they drift). Buildings,
  cliffs and trees are drawn at map scale, not to the person's scale (maps exaggerate figures).

### Labels
Only official names (the brief marks which features may be labelled). Never invent a name, never
label an unnamed feature with a description. `kind: 'area'` for districts and regions (italic,
spaced), `'water'` for water, `'place'` for a single named structure. `size` is in child units
(about 26–40 for areas, 20–28 for places); the app clamps screen size to 11–34px. `textKo` only
when an official Korean card prints that name. Labels must not collide with each other, the world
markers' labels or the subjects' captions. A name that a neighbouring region or the world map also
carries shows once (the region that holds the named place keeps it).

### Subjects
When a region gets crowded (subjects or labels covering each other, or roughly more than 15 subjects), first spread
the subjects whose canon only names the region or continent (`estimate`) across the area their sources allow. If it
is still crowded, split the busy part off as a deeper regional detail drawn at a larger scale inside this one (it
appears at a deeper zoom and this drawing steps back inside its bounds). See the crowding rule in CLAUDE.md; the
renderer needs parent/child support the first time this is used.

Place each phase subject where the brief's canon puts it (or its stated interpretation), at a readable
size, not overlapping labels or markers, its caption clear below it. `flip: true` mirrors it to face
into the map.

## Canon
Everything drawn must be either stated by the brief's sources or a composition the brief allows as
interpretation. Respect the brief's `mustNotInvent` list. The interpretation note (`note` in
`childMaps.ts`, shown under the place panel's '가까이 보기') says which parts are this map's own reading.
