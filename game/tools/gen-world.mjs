// Writes data/world.json from the zendikar-map project's data, read only: the coastlines, the
// forests and waters, the continents' names, and the stops an expedition can go to.
// The coastline is the map project's own trace; positions are its reading, not an official map.
//
// Usage: node tools/gen-world.mjs [--check]
//   --check   write nothing: say whether data/world.json is what this would write (exit 1 if not)
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const GAME = path.resolve(here, '..'), MAP = path.resolve(GAME, '..');
const CHECK = process.argv.includes('--check');
const imp = p => import(path.join(MAP, p));
const arr = m => Object.values(m).find(v => Array.isArray(v));

const LOCS = arr(await imp('src/data/locations.ts'));
const CONTS = arr(await imp('src/data/continents.ts'));
const coast = JSON.parse(fs.readFileSync(path.join(MAP, 'src/data/geo/coastlines.json'), 'utf8'));
const feat = JSON.parse(fs.readFileSync(path.join(MAP, 'src/data/geo/features.json'), 'utf8'));

// The stops, and what each is: a town (a market), the wilds (a fight), a great beast's ground
// (an elite fight) or a camp (rest). Ids are the map project's location ids.
const STOPS = [
  ['sea-gate', 'town'], ['oran-rief', 'wild'],
  ['ikiral', 'town'], ['midnight-pass', 'camp'],
  ['affa', 'town'], ['tal-terig', 'wild'], ['teeth-of-akoum', 'elite'],
  ['free-city-of-nimana', 'town'], ['hagra-swamp', 'wild'],
  ['tangled-vales', 'wild'],
  ['kazandu', 'wild'], ['sunder-bay', 'elite'],
  ['kabira', 'town'], ['turntimber', 'wild'], ['makindi-trenches', 'camp'],
];

// ---- outlines: Ramer-Douglas-Peucker on map units, then scaled to the game's map (x0.2) ----
const S = 0.2;
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= eps) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}
function simplify(poly, eps) {
  // a closed ring: split at the point farthest from the first, so RDP has two open chains
  let far = 0, fd = -1;
  for (let i = 0; i < poly.length; i++) {
    const d = Math.hypot(poly[i][0] - poly[0][0], poly[i][1] - poly[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = rdp(poly.slice(0, far + 1), eps), b = rdp(poly.slice(far).concat([poly[0]]), eps);
  const ring = a.slice(0, -1).concat(b.slice(0, -1));
  const flat = [];
  let px = null, py = null;
  for (const [x, y] of ring) {
    const sx = Math.round(x * S * 2) / 2, sy = Math.round(y * S * 2) / 2;
    if (sx === px && sy === py) continue;
    flat.push(sx, sy); px = sx; py = sy;
  }
  return flat;
}
const lands = [];
for (const [id, poly] of Object.entries(coast.landmasses)) lands.push({ id, pts: simplify(poly, 2.2) });
for (const [id, poly] of Object.entries(coast.islets)) lands.push({ id, pts: simplify(poly, 2.2) });
const forests = feat.forests.map(poly => simplify(poly, 3));
const waters = Object.entries(feat.waters).map(([id, poly]) => ({ id, pts: simplify(poly, 2) }));

const continents = {};
for (const c of CONTS) continents[c.id] = { en: c.name, ko: c.nameKo, label: c.label || null };

const stops = [];
let missing = 0;
for (const [id, cls] of STOPS) {
  const l = LOCS.find(x => x.id === id);
  if (!l) { console.error('no such location in the map data:', id); missing++; continue; }
  stops.push({
    id, cls, cont: l.continentId, x: Math.round(l.position[0] * S), y: Math.round(l.position[1] * S),
    ux: l.position[0], uy: l.position[1], en: l.name, ko: l.nameKo || null, kind: l.kind,
  });
}
if (missing) process.exit(1);

// One record a line, so a later change shows as one line in a diff.
const W = { w: 480, h: 340, scale: S, lands, forests, waters, continents, stops };
const line = o => JSON.stringify(o);
const text = '{\n' + [
  `  "w": ${W.w}, "h": ${W.h}, "scale": ${W.scale},`,
  `  "lands": [\n${W.lands.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "forests": [\n${W.forests.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "waters": [\n${W.waters.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "continents": {\n${Object.keys(W.continents).map(k => '    ' + JSON.stringify(k) + ': ' + line(W.continents[k])).join(',\n')}\n  },`,
  `  "stops": [\n${W.stops.map(l => '    ' + line(l)).join(',\n')}\n  ]`,
].join('\n') + '\n}\n';

const file = path.join(GAME, 'data/world.json');
const was = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
const points = lands.reduce((n, l) => n + l.pts.length / 2, 0);
console.log(`lands ${lands.length} (${points} points) · forests ${forests.length} · waters ${waters.length} · continents ${Object.keys(continents).length} · stops ${stops.length}`);
if (CHECK) {
  console.log(was === text ? 'data/world.json: the same as the map data gives now' : 'data/world.json: DIFFERS from what the map data gives now');
  process.exit(was === text ? 0 : 1);
}
if (was === text) console.log('data/world.json: already up to date');
else { fs.writeFileSync(file, text); console.log('data/world.json: written'); }
