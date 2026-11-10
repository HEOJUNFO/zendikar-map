// Writes data/world.json from the zendikar-map project's data, read only: the coastlines, the
// forests and waters, the continents' names, and the stops an expedition can go to.
// The coastline is the map project's own trace; positions are its reading, not an official map.
// Two maps come of it: the world (every continent, where a voyage is chosen) and one map for
// each continent, drawn large from finer outlines (where the expedition walks from place to place).
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

// The stops, by continent, and what each is: a town (a market), the wilds (a fight), a great
// beast's ground (an elite fight), a camp (rest) or a site (a ruin or a landmark: what happens
// there is its own story). Ids are the map project's location ids; only places the map's data
// describes as they were in 2009 are stops. The first of each continent is its port: where a
// voyage from another continent lands.
const STOPS = {
  tazeem: [['sea-gate', 'town'], ['oran-rief', 'wild'], ['halimar', 'site'], ['umara-river', 'wild'], ['calcite-flats', 'wild'], ['the-sunspring', 'camp']],
  sejiri: [['midnight-pass', 'camp'], ['ikiral', 'town'], ['benthidrix', 'site']],
  akoum: [['affa', 'town'], ['spikefields', 'wild'], ['tal-terig', 'wild'], ['teeth-of-akoum', 'elite'], ['goma-fada', 'town'], ['ora-ondar', 'wild'], ['glasspool', 'site']],
  'guul-draz': [['free-city-of-nimana', 'town'], ['lulea', 'site'], ['hagra-cistern', 'site'], ['pelakka-karst', 'wild'], ['helix-of-zof', 'wild'], ['hagra-swamp', 'wild'], ['malakir', 'town']],
  'bala-ged': [['bojuka-bay', 'camp'], ['guum-wilds', 'wild'], ['surrakar-caves', 'wild'], ['tangled-vales', 'wild']],
  murasa: [['cliffs-of-kazuul', 'site'], ['skyfang-mountains', 'elite'], ['shatterskull-pass', 'wild'], ['na-plateau', 'wild'], ['kazandu', 'wild'], ['tumbled-palace', 'town'], ['sunder-bay', 'elite']],
  ondu: [['kabira', 'town'], ['jwar-isle', 'elite'], ['valakut', 'wild'], ['turntimber', 'wild'], ['graypelt', 'town'], ['prison-of-omnath', 'site'], ['makindi-trenches', 'camp']],
};

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

// The same outlines again, finer and in map units, for the continents' own maps (drawn at up to 1 px a unit).
const fineRing = (poly, eps) => {
  let far = 0, fd = -1;
  for (let i = 0; i < poly.length; i++) { const d = Math.hypot(poly[i][0] - poly[0][0], poly[i][1] - poly[0][1]); if (d > fd) { fd = d; far = i; } }
  const ring = rdp(poly.slice(0, far + 1), eps).slice(0, -1).concat(rdp(poly.slice(far).concat([poly[0]]), eps).slice(0, -1));
  return ring.flatMap(([x, y]) => [Math.round(x), Math.round(y)]);
};
const fine = {
  lands: Object.entries(coast.landmasses).concat(Object.entries(coast.islets)).map(([id, poly]) => ({ id, pts: fineRing(poly, 0.7) })),
  forests: feat.forests.map(poly => fineRing(poly, 1)),
  waters: Object.entries(feat.waters).map(([id, poly]) => ({ id, pts: fineRing(poly, 0.7) })),
};

const continents = {};
for (const c of CONTS) continents[c.id] = { en: c.name, ko: c.nameKo, label: c.label || null };

const stops = [];
let missing = 0;
for (const cont in STOPS) {
  STOPS[cont].forEach(([id, cls], i) => {
    const l = LOCS.find(x => x.id === id);
    if (!l || !l.position) { console.error('no such placed location in the map data:', id); missing++; return; }
    if (l.continentId !== cont) { console.error(`${id}: listed under ${cont}, but the map data says ${l.continentId}`); missing++; return; }
    const stop = {
      id, cls, cont, x: Math.round(l.position[0] * S), y: Math.round(l.position[1] * S),
      ux: l.position[0], uy: l.position[1], en: l.name, ko: l.nameKo || null, kind: l.kind,
    };
    if (i === 0) stop.port = true;
    stops.push(stop);
  });
}
if (missing) process.exit(1);

// Each continent's own map: the box around its stops with room for their names, fitted into the
// game's map (480 x 340) at no more than 1 px a unit. A point of the map project's units goes
// to ((ux - x) * s, (uy - y) * s).
const VW = 480, VH = 340, ROOM = [70, 60, 130, 60]; // units of room: left, top, right, bottom
const views = {};
for (const cont in STOPS) {
  const mine = stops.filter(q => q.cont === cont);
  const x0 = Math.min(...mine.map(q => q.ux)) - ROOM[0], y0 = Math.min(...mine.map(q => q.uy)) - ROOM[1];
  const x1 = Math.max(...mine.map(q => q.ux)) + ROOM[2], y1 = Math.max(...mine.map(q => q.uy)) + ROOM[3];
  const s = Math.min(1, VW / (x1 - x0), VH / (y1 - y0));
  // centred in the map: what room is left over is shared on both sides
  views[cont] = { x: Math.round(x0 - (VW / s - (x1 - x0)) / 2), y: Math.round(y0 - (VH / s - (y1 - y0)) / 2), s: Math.round(s * 1000) / 1000 };
}

// ---- the ways by sea: how a ship goes from each port to each other one without crossing land ----
// The world map is cut into cells; a cell is sea when its middle lies on none of the lands and it
// is joined to the open sea at the map's edge (a lake is not sea). A port's roadstead is the sea
// cell nearest to it: where its ship lies, and where a crossing begins and ends. Between two
// roadsteads the way is the cheapest one over sea cells (A*), dearer along a coast so that it
// keeps off the land where there is room, then pulled taut: each leg runs straight to the
// farthest point it can see across the water.
const CELL = 2, GW = Math.ceil(VW / CELL), GH = Math.ceil(VH / CELL), OFF = 1, COAST = 3; // px a cell; cells; how many cells off a coast is clear of it; how much dearer a cell along a coast is
const rings = lands.map(l => { const r = []; for (let i = 0; i < l.pts.length; i += 2) r.push([l.pts[i], l.pts[i + 1]]); return r; });
const boxes = rings.map(r => [Math.min(...r.map(p => p[0])), Math.min(...r.map(p => p[1])), Math.max(...r.map(p => p[0])), Math.max(...r.map(p => p[1]))]);
const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const onLand = (x, y) => rings.some((r, k) => x >= boxes[k][0] && x <= boxes[k][2] && y >= boxes[k][1] && y <= boxes[k][3] && inRing(x, y, r));
const at = (cx, cy) => cy * GW + cx, mid = c => [(c % GW) * CELL + CELL / 2, Math.floor(c / GW) * CELL + CELL / 2];
const dry = new Uint8Array(GW * GH);
for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) dry[at(cx, cy)] = onLand(cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
if (dry[0]) { console.error("the map's corner is land: the open sea cannot be found from it"); process.exit(1); }
const sea = new Uint8Array(GW * GH); // 1: open sea
for (const q = [0]; q.length;) {
  const c = q.pop(); if (sea[c] || dry[c]) continue; sea[c] = 1;
  const cx = c % GW, cy = Math.floor(c / GW);
  if (cx > 0) q.push(c - 1); if (cx < GW - 1) q.push(c + 1); if (cy > 0) q.push(c - GW); if (cy < GH - 1) q.push(c + GW);
}
const clear = new Uint8Array(GW * GH); // 1: open sea with no land within OFF cells
for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
  let ok = sea[at(cx, cy)];
  for (let dy = -OFF; ok && dy <= OFF; dy++) for (let dx = -OFF; dx <= OFF; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < GW && y < GH && dry[at(x, y)]) { ok = 0; break; } }
  clear[at(cx, cy)] = ok;
}
function roadstead(stop) {
  let best = -1, bd = Infinity;
  for (let c = 0; c < GW * GH; c++) if (sea[c]) { const [x, y] = mid(c), d = Math.hypot(x - stop.x, y - stop.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function seaWay(from, to) {
  const g = new Float64Array(GW * GH).fill(Infinity), prev = new Int32Array(GW * GH).fill(-1), done = new Uint8Array(GW * GH);
  const [tx, ty] = mid(to), open = [from]; g[from] = 0;
  const f = c => { const [x, y] = mid(c); return g[c] + Math.hypot(x - tx, y - ty); };
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (f(open[i]) < f(open[bi])) bi = i;
    const c = open.splice(bi, 1)[0]; if (done[c]) continue; done[c] = 1;
    if (c === to) break;
    const cx = c % GW, cy = Math.floor(c / GW);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy; if ((!dx && !dy) || x < 0 || y < 0 || x >= GW || y >= GH) continue;
      const n = at(x, y); if (!sea[n] || done[n]) continue;
      if (dx && dy && (!sea[at(cx + dx, cy)] || !sea[at(cx, cy + dy)])) continue; // no cutting a corner of land
      const cost = g[c] + Math.hypot(dx, dy) * CELL * (clear[n] ? 1 : COAST);
      if (cost < g[n]) { g[n] = cost; prev[n] = c; open.push(n); }
    }
  }
  if (prev[to] < 0 && to !== from) return null;
  const cells = []; for (let c = to; c >= 0; c = prev[c]) cells.unshift(c);
  // pulled taut: from each point, straight to the farthest later one seen across clear water (or across any sea, close to a roadstead or in a strait)
  const sees = (a, b, mask) => { const [ax, ay] = mid(a), [bx, by] = mid(b), n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let i = 1; i < n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; if (!mask[at(Math.floor(x / CELL), Math.floor(y / CELL))]) return false; } return true; };
  const pts = [cells[0]];
  for (let i = 0; i < cells.length - 1;) {
    let j = i + 1;
    for (let k = cells.length - 1; k > i + 1; k--) if (sees(cells[i], cells[k], clear[cells[i]] && clear[cells[k]] ? clear : sea)) { j = k; break; }
    pts.push(cells[j]); i = j;
  }
  return pts.map(mid);
}
const ports = stops.filter(q => q.port);
for (const p of ports) { p.road = roadstead(p); p.sea = mid(p.road); }
const ways = {};
for (let i = 0; i < ports.length; i++) for (let j = i + 1; j < ports.length; j++) {
  const pts = seaWay(ports[i].road, ports[j].road);
  if (!pts) { console.error(`no way by sea from ${ports[i].id} to ${ports[j].id}`); process.exit(1); }
  let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  ways[ports[i].id + '|' + ports[j].id] = { len: Math.round(len / S), pts: pts.flat() }; // len in map units, as the stops' ux, uy are
}
for (const p of ports) delete p.road;

// One record a line, so a later change shows as one line in a diff.
const W = { w: 480, h: 340, scale: S, lands, forests, waters, continents, stops, views, ways, fine };
const line = o => JSON.stringify(o);
const text = '{\n' + [
  `  "w": ${W.w}, "h": ${W.h}, "scale": ${W.scale},`,
  `  "lands": [\n${W.lands.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "forests": [\n${W.forests.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "waters": [\n${W.waters.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "continents": {\n${Object.keys(W.continents).map(k => '    ' + JSON.stringify(k) + ': ' + line(W.continents[k])).join(',\n')}\n  },`,
  `  "stops": [\n${W.stops.map(l => '    ' + line(l)).join(',\n')}\n  ],`,
  `  "views": {\n${Object.keys(W.views).map(k => '    ' + JSON.stringify(k) + ': ' + line(W.views[k])).join(',\n')}\n  },`,
  `  "ways": {\n${Object.keys(W.ways).map(k => '    ' + JSON.stringify(k) + ': ' + line(W.ways[k])).join(',\n')}\n  },`,
  `  "fine": {\n    "lands": [\n${W.fine.lands.map(l => '      ' + line(l)).join(',\n')}\n    ],\n    "forests": [\n${W.fine.forests.map(l => '      ' + line(l)).join(',\n')}\n    ],\n    "waters": [\n${W.fine.waters.map(l => '      ' + line(l)).join(',\n')}\n    ]\n  }`,
].join('\n') + '\n}\n';

const file = path.join(GAME, 'data/world.json');
const was = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
const points = lands.reduce((n, l) => n + l.pts.length / 2, 0);
console.log(`ways by sea ${Object.keys(ways).length}: ${Object.entries(ways).map(([k, w]) => `${k.replace(/([a-z])[a-z-]*/g, (m, c) => m.slice(0, 4))} ${w.len}u/${w.pts.length / 2}pt`).join(' · ')}`);
console.log(`lands ${lands.length} (${points} points; fine ${fine.lands.reduce((n, l) => n + l.pts.length / 2, 0)}) · forests ${forests.length} · waters ${waters.length} · continents ${Object.keys(continents).length} · stops ${stops.length}`);
if (CHECK) {
  console.log(was === text ? 'data/world.json: the same as the map data gives now' : 'data/world.json: DIFFERS from what the map data gives now');
  process.exit(was === text ? 0 : 1);
}
if (was === text) console.log('data/world.json: already up to date');
else { fs.writeFileSync(file, text); console.log('data/world.json: written'); }
