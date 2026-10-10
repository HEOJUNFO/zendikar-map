# Zendikar map figures — style guide (phase 1: ZEN mythic rare subjects)

The map (open the app, e.g. `pnpm dev` and http://localhost:5173/?phase=1) is a parchment fantasy map:
vellum land (#eae4d1), pale sea (#d9ded6) with ripple lines, ink-drawn mountains (vellum fill + thin dark ridge line + light hatch), tree crowns (small circles, translucent fill, green-grey ink), floating hedrons (stone fill, ink outline, facet lines), IM Fell English labels.

Figures are illustrations drawn ON the map the way old maps (Olaus Magnus' Carta Marina, Ortelius, Tolkien-style fan maps) draw sea monsters, beasts and people: a woodcut/engraving look, NOT cartoon, NOT flat icon, NOT realistic shading.

## Hard rules
- Monochrome ink line art on vellum: outlines with class `ink` (1.15px screen) and a few `ink-bold` accents (1.5px) for the silhouette's most important edges; interior form with `hatch` lines (0.6px), parallel or following form, used sparingly (engraving feel).
- Fills: `fill` (vellum) under every closed shape so the figure covers terrain behind it; `shade` (vellum-shade) for the shadow side; optional muted washes ONLY where the subject is defined by them: `stone` (hedrons, monuments, obsidian), `forest` (plant matter), `sea` (water splash), `fire` (flame — very muted ochre, never bright), `blood` (vampire accents, tiny), `gold` (a few accents), `dark` (small solid ink areas: eyes, mouth, deep shadow — tiny).
- Every stroke is screen-px constant (vector-effect), so geometry must read at small sizes: a strong, simple silhouette first; details second. Check the smallest scale the figure will be shown at (see "visible from").
- Coordinates: write the figure in its own coordinate box `viewBox: [minX, minY, width, height]` (use roughly 100 units for the longest side), `anchor: [x, y]` = the point that sits on the map location (feet/base for standing things, body centre for flying or swimming things). Only absolute path commands M L C Q A Z (and H V). Keep each figure under ~60 path parts and ~25k characters.
- Facing: standing figures face left or right in 3/4 view; no text inside figures; no frames; no drop shadows except an optional small ground shadow ellipse using `shade`.
- Parts are drawn in order; put `fill`/`shade`/washes first, then `hatch`, then `ink`/`ink-bold` on top.
- The subject must read as THAT subject from its official description (card name/type/flavor and lore), not as a copy of the card art. Do not trace or copy the card illustration; draw an original map-style emblem of the subject.

## File format (one file per figure): art/<card id>.js — the id must equal the card id in src/data/phase1.ts, phase2.ts or phase3.ts
FIGURES.push({
  id: 'lorthos',            // see list
  size: 90,                 // longest side in MAP UNITS on the map (given in your assignment)
  bg: 'sea' | 'land' | 'forest',
  viewBox: [0, 0, 100, 70],
  anchor: [50, 40],
  parts: [ { cls: 'fill', d: 'M…Z' }, { cls: 'hatch', d: 'M…' }, { cls: 'ink', d: 'M…' } ],
})

## Preview
Open `scripts/figures/index.html?ids=<id>[,<id>…]&scales=0.53,1.6,2.6,5` in a browser (file:// works). Each figure is drawn on parchment at those map scales (px per map unit) next to the map's own symbols (mountains, trees, the 10px settlement marker, a 14px label). Judge it at every scale it will be shown at, then run `node scripts/figures/to_ts.mjs > src/map/figures.ts`.
