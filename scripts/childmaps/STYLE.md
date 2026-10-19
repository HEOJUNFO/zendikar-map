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
  clearings: [ { points: [[x, y], …], phase2: true } ],   // optional: symbols are left out inside these in that phase (phase3: true for Phase 3) — end the line with `// card-id` (timeline keys)
  parts: [ { cls: 'ink', d: 'M… ', phase?: true | false, phase2?: true | false, phase3?: true | false }, … ],   // hand-drawn features, painted in order
  labels: [ { text, textKo?, at: [x, y], size, kind: 'area' | 'water' | 'place', rotate?, phase?…phase5? } ],   // a gate moves a name only in the phase whose world figure covers it
  subjects: { '<phase card id>': { at: [x, y], size, flip?, label?: 'below' | 'right' | 'left' | 'above' } },   // label: the side its caption tries first
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
edge there is a blend band inside the bounds (12% of the shorter side, clamped to 6–24 world units — `detailBandOf` in
`src/map/detailScale.ts`):
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

**End every subject clearing's line with a comment that starts with the card id** — `{ points: …, phase4: true }, // retreat-to-kazandu (…)`
(a parent clearing copied into a deeper detail may read `// 할리마르 빈터 — card-id`, or the line may write `for: ['card-id']`).
`to_ts.mjs` reads it as the clearing's `for` and derives the timeline view's keys (`time: { t1…t4 }`,
`src/data/sagas.ts` `inView`, `timeline.ts` `forTimeGate`): at each time point the clearing opens when one of its cards is
drawn there in place by the app (`shownAtTimeOf` — every card of that time point, a symbol beside its host only while the
host is drawn), and closes when none is (a scene the timeline view does not stack, a card moved away), while following the phase gates
wherever the saga view draws that card at the point's period level. Never write `time` on a clearing by hand; clearings for
place names or period floors carry no card id and keep their phase gates. A clearing built in a loop (`.map`) has no line
comment to read — give each entry its card (`[points, 'card-id']` → `for: ['card-id']`, as in `tangled-vales.js`), and leave
a clearing that also clears a place or land name unbound, since the name is always drawn — unless it would then stay open
over a subject the timeline view does not draw: bind it to that card and add, at the end of `clearings`, a timeline-only
clearing for the name alone (`{ points, time: { t1: true, … }, timeOnly: true }`, keys written by the source — the only
clearings without `for` that may carry `time`; tangled-vales' Slaughter Cry hole and Evolving Wilds name). The saga view
never draws a `timeOnly` clearing, so its clearings stay as they were.
`node scripts/childmaps/context.mjs <id> --time t` lists what is drawn at a time point (`own` — the clearings that are
open there and their `for`), and `--svg <file> --time t` previews it. Fields, parts and labels may carry `time` /
`timeOnly: true` written by the source (timeline-only variants); the saga view never reads them.

**Every detail is ready at every time point** — the app draws a regional-detail subject at each of its time points, so the
art must make room for the subjects drawn there and fill the spots of those that are not (`--check` [15]–[18]). The tools
(all in `kit.js`, all leave the saga view's parts, gates and paint order as they were — check with
`node scripts/qa/saga-regress.mjs --compare <baseline> --static-only`):
- **A field with a subject's spot cut as a hole** (`phase: true`) and its twin without the hole (`phase: false`): give the
  holed one `time: { t1: false, t2: false }` and the twin `time: { t1: true, t2: true }` (the timeline view always uses the
  filled one), and put the hole back as a clearing tied to its card, `KIT.timeClear('card-id', [x0, y0, x1, y1], pad)` or
  `{ points: hole, for: ['card-id'], timeOnly: true }` at the end of `clearings` — it opens only where that card is drawn.
  When the twin is not the saga 1 look (a period look like tangled-vales' 2009 ridges), add timeline-only fields at the end
  of `terrain` (`time: { t1: true, t2: true }, timeOnly: true` — the end keeps every other field's seed).
- **A part turned off for a subject** (`phase2: false` under Kazuul, `phase3: false` under Ogre Sentry, `phase: false` plants
  in a figure's box): wrap it in `KIT.dodge(['card-id', …], parts)` after its gates. The generator turns it off where one of
  those cards is drawn in place and back on where none is but the saga view draws one at that level (a dropped scene).
  `KIT.dodgeMoved` does the same for a card's moved spot (`time.moved`). A field may carry `dodge` too (nimana's Cosi's
  Trickster filler).
- **A part drawn only with a subject** (the rock it stands on, its pool, the rocks around a trap): `KIT.withSubject('card-id',
  parts)` (default gate `{ phase: true }`) — the timeline view draws it only where that card is drawn.
- **Variants that skip several subjects' boxes** (kazandu's cliff ticks, makindi's gravel and wall foot):
  `KIT.bySubjects((drawn) => parts, { name: 'card-id', … }, [[{ phase: true }, ['name', …]], [{ phase: false }, []]])` —
  `drawn` is the Set of names drawn; the saga variants are made first in that order, and each other set the time points
  need is made once more as a timeline-only variant. The runner puts the card data in the global `TIMELINE`.
- A map's own `compact` (merging neighbouring paths of the same class and gates) must keep and compare these keys
  (`KIT.sameTimeKeys`, `KIT.timeKeysOf`), or the generator never sees them.
`--check` also stops when a generated file's time keys are stale (the cards changed after the last run — regenerate).

**A subject moved at a time point** (the card's `time.moved` — it yields to another subject there, design 4.5; same size):
give its `subjects` entry the moved spot in art units, `moved: { 3: { at: [x, y] }, 4: { at: [x, y] } }` (with `flip` /
`label` when they change; one spot for all its moved points). It stays in the source only — `to_ts.mjs` checks it against
the card's `time.moved` (stops on a mismatch) and does not write it to the generated art. Put a clearing on the moved spot
with `movedFor: ['card-id']` and no gates (`{ points, movedFor: ['card-id'] }, // card-id — 시점 3·4 에만 옮긴 자리`): it becomes
a timeline-only clearing open where the app draws that card on its moved spot (and is left out until the app draws it there —
a card never drawn there). The original spot's clearing closes at those points by itself.
`--check` stops when the moved spot has no open clearing ([15]) or a hand-drawn part on at that point lies over it ([16]).

### 그 무렵 모습 (a feature that looked different in a phase)
When official sources say a feature looked different at a phase's time (Sea Gate collapsed in OGW, the Merfolk
Enclave whole in ZEN–ROE, the Eye of Ugin still a mountain over a sealed chamber before ROE, a 2020 memorial not yet
built…), draw that look with the same phase gates (CLAUDE.md '그 무렵 모습'). The default drawing (phases off) stays
byte-identical: put the gate on the existing part, keep its shape, paint order and rng order, and add the period look as
new gated parts right beside it. Change only the phases the sources speak to; leave the rest as drawn. Write a
'페이즈별 모습' paragraph in the file header (what changes in which phase, the source, what is this map's reading) and
say what is interpretation in the `note`.
- Gate sets: phases off only `{ phase: false, phase4: false }` · saga 1 `{ phase: true }` · L1–L2 `{ phase: true, phase3: false }` ·
  saga 2 `{ phase4: true }` · L4 `{ phase4: true, phase5: false }` · L5 `{ phase5: true }`. A set one AND gate cannot express
  (L1–L5, or "all but L1–L2") takes the same part once per gate — `gatesFor(levels)` in `src/data/sagas.ts` gives the
  fewest gates. A file that keeps compacted path groups (halimar.js `only()`/`except()`/`merge()`) must keep the off-phase
  groups unchanged.
- Where the world map's period basemap (`src/data/periods/`) reaches the region, follow
  `node scripts/childmaps/context.mjs <id>`'s `periods` block: the app paints dry beds, remnant pools, white dust, chalk
  and dead-forest washes itself — do not redraw them; give the opposite gate (`oppose`) to the region's own `sea`/`sea-ink`/
  `forest` parts there. Do not reshape an existing terrain field (its glyphs would reseed): add the cut piece or the new kind
  (`dust`·`chalk`·`drybed`·`deadwood`) as a new field at the **end** of `terrain` with the `suggest` gates. Redraw the
  period's rivers and falls (`redraw`) and split lines the period hides (`hidden`, e.g. the Spikefields chasm) with the
  given gates. Match the world marker's period state (`marks`: ruin or hidden) in the drawing around it.
- `context.mjs <id> --level n` prints only what draws at that phase; `--svg <file> --level n` previews it.
  `to_ts.mjs` (and `--check`) stops with errors ([9]–[13], collected and listed together) where the region and the
  period basemap disagree, so a drawing that ignores the `periods` block does not build.

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
appears at a deeper zoom and this drawing steps back inside its bounds). See the crowding rule in CLAUDE.md and
"더 깊은 지역 상세" below.

Place each phase subject where the brief's canon puts it (or its stated interpretation), at a readable
size, not overlapping labels or markers, its caption clear below it. `flip: true` mirrors it to face
into the map.

The app places a subject's caption below it, else beside it (right, then left), in whatever space other
names, markers and figures leave — it does not see your hand-drawn parts. If the spot is fixed (the canon
names it) and the caption below would land on a wall, tower or other drawn feature, give the subject
`label: 'right' | 'left' | 'above'` (the side you kept clear): the caption takes that side first at every
zoom where it is free, and falls back to below → right → left only when another name, marker or figure
blocks it. Side captions sit at the figure's mid-height, starting 7px from its edge; an above caption
sits over the top edge. Check the first zoom of the detail (the caption is largest against the art there)
and a few deeper ones. The card's `label` in `phase1.ts`…`phase5.ts` must equal the subject's (`to_ts.mjs`
stops and prints it, as for `at`/`size`/`flip`) — the world map places names from the card data.
A world figure drawn over your detail can carry its own `label` on its card (the card is its only source), so
leave that side clear as well as its box (`context.mjs` shows it as `caption` on `worldFigures`).

## 더 깊은 지역 상세 (a deeper regional detail inside another)
A deeper detail is its own `CHILD_MAPS` entry with `parent: '<parent id>'` (one level only), listed after its parent,
with its own `place` (unique across details), bounds inside the parent's bounds (edges may coincide) and not overlapping
a sibling. Draw it at s ≈ 10 art units per world unit (tier 6, '가까이 보기' lands at 10.92 px/unit); its tier must be
deeper than the parent's or `to_ts.mjs` stops. How it renders:
- It takes a share of the parent's coverage: the world map still fades out across the parent's band only, and the
  deeper art is drawn inside the parent's group so the two together get the parent's share once. Across the deeper
  detail's band the deeper art fades in over the outer half and the parent's parts and labels fade out over the inner
  half (`ChildDetailArt` — at every spot one of the two is at full strength, so stacked fills never let the world
  show through). Where the deeper bounds run into the parent's own band, both drawings and the
  world are visible at once — so **in the band, draw the same geography in the same place as the parent**.
- Terrain glyphs hand off through the same band noise: the parent keeps the spots the deeper detail does not claim.
  Inside the range the parent's fields and clearings no longer apply, so copy the parent's clearings (with identical
  gates) and continue the parent's field kinds across the edge.
- Phase-gated parent parts that reach the range recede with the parent; redraw them with **identical gates**
  (`to_ts --check` warns when a gate set is missing).
- A parent label anchored inside the range recedes; re-carry it with the same `text`/`textKo` at least 0.75 × band
  inside the edge. A parent label box crossing the deeper edge is an error — move it in the parent instead.
- Marker label sides come from the deepest detail holding the marker: re-carry every `markAnchors` key the parent sets
  for a marker in the range (error otherwise), and add sides for other markers (warning).
- It appears only once its parent is shown and the fine terrain for its tier has built; its subjects
  (`childMap: '<deeper id>'`) draw from then on. Parent subjects and world figures keep drawing on top, so leave their
  boxes and captions clear (`to_ts --check` warns on overlaps).

Context: `node scripts/childmaps/context.mjs <deeper id> [--scale 10] [--svg parent.svg]` adds a `parent` block (the
parent's labels, subjects, clearings and terrain fields clipped to the range plus band with gates kept, `markAnchors`
in the range, and the parent's parts mapped into deeper art units with gates kept) and `worldFigures`; `--svg` writes a
preview of the mapped parent parts. Copy numbers from it (the deeper art does not read the parent at runtime). Nothing
new without an official source: draw only what the parent already draws there, at the larger scale, plus features the
brief's canon names.

## Canon
Everything drawn must be either stated by the brief's sources or a composition the brief allows as
interpretation. Respect the brief's `mustNotInvent` list. The interpretation note (`note` in
`childMaps.ts`, shown under the place panel's '가까이 보기') says which parts are this map's own reading.
