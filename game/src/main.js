// The game: the one-shot's script, carried over as it was. The grow step splits it
// by what the code does and moves it to TypeScript.
import './config.js';
import './screens2.js'; // the page's script order: each file imports the one before it
import { LANG, STR, T } from './text.js';
import { CARDS, cardArt, cardName } from './cards.js';
import { BOSS, FIGURE_ORDER, enemyName } from './enemies.js';
import { COL, SPR, WORLD_IMG, buildArt, drawEnemyKind } from './art.js';
import { R_LANG, R_MUTE, TYPE_COL, drawHudButtons, nameStr, newRun, over, textW, txt, txtS, updateHudButtons, wrap } from './screens.js';
import { drawEnding, drawPlay, updatePlay } from './screens2.js';

'use strict';
// The one-shot's starter, kept: the fixed step, the clock hook, window.game and the play and
// figures scenes. The game itself is in the files above: text.js (every word, KO and EN),
// cards.js, cards2.js and enemies.js, enemies2.js (the content), text2.js (rules text made from
// effects), art.js, cardart.js, cardart2.js and sprites2.js (every drawing), battle.js
// (the fight) and screens.js, screens2.js (the map, the fight on screen, towns and camps).

// ---- Built to be checked ----------------------------------------------------------------
const params = new URLSearchParams(location.search);
export const tune = new Proxy({}, { get: (_, k) => CONFIG[k].value }); // live: tune.speed is CONFIG.speed.value
const STEP = 1 / 60;            // simulation step in seconds; motion is per second, never per frame
export const W = 640, H = 360;         // logical size: a pixel look, scaled by whole numbers
const PIXEL = true;             // pixel looks: whole-number scale, no smoothing
export const FONT = '"ZPixel", monospace'; // a pixel face with Korean and Latin (assets/fonts, OFL)
const TITLE = '젠디카르 원정대 (Zendikar Expedition)';
const clock = window.GAME_CLOCK || { now: () => performance.now() / 1000 }; // a check may inject one
const CHEAP = params.get('render') === 'cheap'; // a headless shot or check; this 2D game draws the same
let seed, runs = 0;
export function rng() { // mulberry32; every gameplay random call reads this, never Math.random
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const events = []; // window.game.events: anything the game wants a run to see

// ---- Screen ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
function fit() { // fills the window at any size and pixel ratio
  const k = Math.min(innerWidth / W, innerHeight / H);
  const s = PIXEL ? Math.max(1, Math.floor(k)) : k;
  const r = PIXEL ? 1 : s * (devicePixelRatio || 1);
  canvas.width = Math.round(W * r); canvas.height = Math.round(H * r);
  canvas.style.width = Math.round(W * s) + 'px'; canvas.style.height = Math.round(H * s) + 'px';
  canvas.style.marginTop = Math.max(0, Math.floor((innerHeight - H * s) / 2)) + 'px';
  canvas.style.imageRendering = PIXEL ? 'pixelated' : 'auto';
  ctx.setTransform(r, 0, 0, r, 0, 0); ctx.imageSmoothingEnabled = !PIXEL;
}
addEventListener('resize', fit); fit();
function clear(c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }

// ---- Input: keys by position (event.code), OS key repeat ignored; the pointer in game pixels ----
export const down = new Set(), hit = new Set();
export const pressed = code => hit.has(code); // true for one step after the key goes down
addEventListener('keydown', e => {
  startAudio();
  if (!e.repeat) { down.add(e.code); hit.add(e.code); }
  if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => down.delete(e.code));
addEventListener('blur', () => down.clear());
// mouse.pressed and mouse.released are true for one step; dx, dy: where the button went down.
export const mouse = { x: -1, y: -1, dx: -1, dy: -1, down: false, pressed: false, released: false };
let sawPointer = false;
function pointerAt(e) {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
}
addEventListener('pointermove', pointerAt);
addEventListener('pointerdown', e => {
  startAudio(); pointerAt(e); sawPointer = true;
  mouse.down = true; mouse.pressed = true; mouse.dx = mouse.x; mouse.dy = mouse.y;
});
addEventListener('pointerup', e => { pointerAt(e); mouse.down = false; mouse.released = true; });
addEventListener('click', e => { // a click that came with no pointer events still counts
  if (!sawPointer) { pointerAt(e); mouse.dx = mouse.x; mouse.dy = mouse.y; mouse.pressed = true; mouse.released = true; }
  sawPointer = false;
});

// ---- Audio: started on first input, mute on M --------------------------------------------
export let audio = null, muted = false;
function startAudio() {
  if (!audio) {
    const ac = window.GAME_AUDIO || new (window.AudioContext || window.webkitAudioContext)(); // a check may inject one
    const out = ac.createGain(); out.gain.value = muted ? 0 : tune.volume;
    out.connect(ac.destination); audio = { ac, out };
  }
  if (audio.ac.state === 'suspended') audio.ac.resume();
}
export function setMuted(m) { muted = m; if (audio) audio.out.gain.value = m ? 0 : tune.volume; }
addEventListener('tune', () => setMuted(muted)); // the tweak panel (an add-on), when added, moved a value: the volume follows
function tone(freq, dur, type = 'square', vol = 0.3) {
  if (!audio || muted) return;
  const t = audio.ac.currentTime, o = audio.ac.createOscillator(), g = audio.ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.out); o.start(t); o.stop(t + dur);
}
// The game's sounds. A hit's pitch climbs with each hit of a chain, so a good turn builds.
export function sfx(kind, n) {
  switch (kind) {
    case 'card': tone(440, 0.05, 'square', 0.12); break;
    case 'draw': tone(660, 0.03, 'square', 0.06); break;
    case 'hit': tone(220 * Math.pow(2, Math.min(n || 0, 14) / 12), 0.09, 'square', 0.22); break;
    case 'kill': tone(110, 0.25, 'sawtooth', 0.25); tone(880, 0.12, 'square', 0.12); break;
    case 'block': tone(330, 0.07, 'triangle', 0.2); break;
    case 'hurt': tone(140, 0.16, 'sawtooth', 0.25); break;
    case 'heal': tone(523, 0.1, 'sine', 0.2); tone(784, 0.14, 'sine', 0.15); break;
    case 'energy': tone(988, 0.08, 'square', 0.12); break;
    case 'power': tone(392, 0.1, 'triangle', 0.2); tone(587, 0.16, 'triangle', 0.16); break;
    case 'rumble': tone(60, 0.35, 'sawtooth', 0.3); tone(45, 0.4, 'square', 0.2); break;
    case 'roar': tone(98, 0.3, 'sawtooth', 0.25); break;
    case 'wave': tone(300, 0.2, 'sine', 0.18); break;
    case 'deny': tone(120, 0.08, 'square', 0.15); break;
    case 'end': tone(262, 0.08, 'triangle', 0.15); break;
    case 'travel': tone(330, 0.1, 'triangle', 0.12); tone(440, 0.16, 'triangle', 0.1); break;
    case 'win': tone(523, 0.2, 'square', 0.14); tone(659, 0.26, 'square', 0.12); tone(784, 0.32, 'square', 0.12); break;
    case 'lose': tone(196, 0.3, 'sawtooth', 0.2); tone(147, 0.5, 'sawtooth', 0.2); break;
  }
}

// ---- Scenes: title, play (the map and everything a stop holds), over, results, figures ----
export let scene, state, figPage = Number(params.get('page')) || 0;
function reset() {
  seed = (Number(params.get('seed')) || CONFIG.seed) + runs * 7919; runs++; // each new expedition is a new world
  // state.gained: what this run gained or learned, the high the ending shows.
  state = { t: 0, score: 0, gained: '', won: false, screen: 'map', run: null, battle: null, reward: null, shop: null, camp: null, travel: null, banner: null, pending: null };
  state.run = newRun();
}
export function setScene(name) { scene = name; } // only this file can assign its own binding
function startRun() { reset(); scene = 'play'; sfx('travel'); }
const scenes = {
  figures: { // every enemy kind and the expedition leader, ten to a page (?page=, or the arrow keys)
    update(dt) {
      state.t += dt;
      const n = Math.ceil((FIGURE_ORDER.length + 1) / 10);
      if (pressed('ArrowRight')) figPage = (figPage + 1) % n;
      if (pressed('ArrowLeft')) figPage = (figPage + n - 1) % n;
    },
    draw() {
      clear('#221c2c');
      const all = ['leader'].concat(FIGURE_ORDER.filter(k => k !== BOSS), [BOSS]), n = Math.ceil(all.length / 10);
      figPage = Math.min(figPage, n - 1);
      txt(T('figures') + ' · ' + T('pageLine', { a: figPage + 1, b: n }), W / 2, 6, COL.amberL, 'center');
      all.slice(figPage * 10, figPage * 10 + 10).forEach((k, i) => {
        const x = 64 + (i % 5) * 128, y = i < 5 ? 140 : 312;
        if (k === 'leader') ctx.drawImage(SPR.leader, x - 16, y - 44); else drawEnemyKind(ctx, k, x, y, state.t);
        const name = k === 'leader' ? T('you') : nameStr(enemyName(k));
        wrap(name, 122).forEach((ln, j) => txt(ln, x, y + 6 + j * 13, COL.text, 'center'));
      });
    },
  },
  gallery: { // every card's picture and name, forty-eight to a page (?scene=gallery&page=)
    update(dt) {
      state.t += dt;
      const n = Math.ceil(Object.keys(CARDS).length / 48);
      if (pressed('ArrowRight')) figPage = (figPage + 1) % n;
      if (pressed('ArrowLeft')) figPage = (figPage + n - 1) % n;
    },
    draw() {
      clear('#221c2c');
      const ids = Object.keys(CARDS), n = Math.ceil(ids.length / 48);
      figPage = Math.min(figPage, n - 1);
      txt(T('gallery') + ' · ' + T('pageLine', { a: figPage + 1, b: n }), W / 2, 2, COL.amberL, 'center');
      ids.slice(figPage * 48, figPage * 48 + 48).forEach((id, i) => {
        const x = 4 + (i % 8) * 79, y = 18 + Math.floor(i / 8) * 57;
        ctx.fillStyle = TYPE_COL[CARDS[id].type]; ctx.fillRect(x + 6, y, 66, 38);
        ctx.drawImage(cardArt(id), x + 7, y + 1);
        let s = nameStr(cardName(id));
        while (textW(s) > 78 && s.length > 2) s = s.slice(0, -1);
        txt(s, x + 39, y + 40, COL.text, 'center');
      });
    },
  },
  title: {
    update(dt) {
      state.t += dt;
      if (updateHudButtons(false)) return;
      if (pressed('Enter') || pressed('Space') || (mouse.released && !over(R_LANG) && !over(R_MUTE))) startRun();
    },
    draw() {
      clear(COL.panel);
      ctx.drawImage(WORLD_IMG, 80, 10);
      ctx.fillStyle = 'rgba(20,16,28,0.72)'; ctx.fillRect(0, 0, W, H);
      txtS(T('title'), W / 2, 52, COL.amberL, 'center', 24);
      txt(LANG === 'ko' ? STR.title.en : STR.title.ko, W / 2, 82, COL.dim, 'center');
      txt(T('subtitle'), W / 2, 104, COL.text, 'center');
      txt(T('ctl1'), W / 2, 146, COL.text, 'center');
      txt(T('ctl2'), W / 2, 162, COL.text, 'center');
      txt(T('ctl3'), W / 2, 178, COL.text, 'center');
      if (Math.floor(state.t * 2) % 2 === 0) txtS(T('start'), W / 2, 222, COL.amberL, 'center');
      txt(T('fan1'), W / 2, 296, COL.dim, 'center');
      txt(T('fan2'), W / 2, 311, COL.dim, 'center');
      if (LANG === 'ko') txt(T('starNote'), W / 2, 334, COL.dim, 'center');
      drawHudButtons(false);
    },
  },
  play: {
    update(dt) { updatePlay(dt); },
    draw() { drawPlay(); },
  },
  over: {
    update(dt) {
      state.t += dt;
      if (updateHudButtons(false)) return;
      if (pressed('KeyR') || pressed('Enter') || (mouse.released && !over(R_LANG) && !over(R_MUTE))) startRun();
    },
    draw() { drawEnding(false); },
  },
  results: {
    update(dt) {
      state.t += dt;
      if (updateHudButtons(false)) return;
      if (pressed('Enter') || pressed('KeyR') || (mouse.released && !over(R_LANG) && !over(R_MUTE))) startRun();
    },
    draw() { drawEnding(true); },
  },
};

// ---- Loop: fixed step, frame time clamped ---------------------------------------------
function step() {
  if (pressed('KeyM')) { setMuted(!muted); hit.delete('KeyM'); }
  scenes[scene].update(STEP); hit.clear();
  mouse.pressed = false; mouse.released = false;
}
let last, acc = 0, ALPHA = 1; // ALPHA: how far the frame is between the last two steps
function tick() {
  const now = clock.now();
  acc += Math.min(now - last, 0.25); last = now; // a stall never fast-forwards the game
  while (acc >= STEP) { step(); acc -= STEP; }
  ALPHA = acc / STEP; // draw between steps, so the view never judders
  drawFrame();
}
function drawFrame() { scenes[scene].draw(); }
function frame() { tick(); requestAnimationFrame(frame); }
// A headless browser on a time budget runs timers but almost no animation frames: a timer
// ticks when no frame has come for 100 ms on a visible page; a hidden tab stays paused.
function timer() { if (document.visibilityState === 'visible' && clock.now() - last > 0.1) tick(); }

// ---- What a check can read and drive (?manual=1 stops the loop; players never see it) ----
window.game = {
  get scene() { return scene; },
  get state() { return state; },
  press(code) { hit.add(code); },
  hold(code, on) { on ? down.add(code) : down.delete(code); },
  get events() { return events; }, // the loop steps; a check empties it
  step(n = 1, draw = true, alpha = 1) {
    for (let i = 0; i < n; i++) step();
    if (draw) { ALPHA = alpha; drawFrame(); }
  },
};

buildArt();
if (document.fonts && document.fonts.load) { document.fonts.load('12px "ZPixel"', 'Aa가'); document.fonts.load('24px "ZPixel"', 'Aa가'); }
reset();
scene = params.get('scene') || 'title';
last = clock.now();
if (params.get('manual') === '1') drawFrame();
else { requestAnimationFrame(frame); setInterval(timer, 50); }
