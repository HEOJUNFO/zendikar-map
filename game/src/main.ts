// The page: the scenes and the loop. The game itself is in the modules this imports: text (every
// word, KO and EN), cards, cards2 and enemies, enemies2 (the content), text2 (rules text made
// from effects), art, cardart, cardart2 and sprites2 (every drawing), battle (the fight) and
// screens, screens2 (the map, the fight on screen, towns and camps). The rules with no browser
// in them are in game/; what a check reads and drives is in hook.ts.
import './screens2'; // the one-shot's script order: each module imports the one that ran before it
import { CONFIG } from './config';
import { clock, install, manual, params, seedFrom } from './hook';
import { setSeed } from './game/rng';
import { events, scene, setScene, setState, state } from './game/state';
import { H, W, clear, ctx } from './screen';
import { down, hit, mouse, pressed } from './input';
import { muted, setMuted, sfx } from './audio';
import { LANG, STR, T } from './text';
import { CARDS, cardArt, cardName } from './cards';
import { BOSS, FIGURE_ORDER, enemyName } from './enemies';
import { COL, SPR, WORLD_IMG, buildArt, drawEnemyKind } from './art';
import { R_LANG, R_MUTE, TYPE_COL, drawHudButtons, nameStr, newRun, over, textW, txt, txtS, updateHudButtons, wrap } from './screens';
import { drawEnding, drawPlay, updatePlay } from './screens2';

// ---- Built to be checked ----------------------------------------------------------------
const STEP = 1 / 60;            // simulation step in seconds; motion is per second, never per frame
const TITLE = '젠디카르 원정대 (Zendikar Expedition)';
const CHEAP = params.get('render') === 'cheap'; // a headless shot or check; this 2D game draws the same
let runs = 0;

// ---- Scenes: title, play (the map and everything a stop holds), over, results, figures ----
type Scene = { update(dt: number): void; draw(): void };
let figPage = Number(params.get('page')) || 0;
function reset(): void {
  setSeed(seedFrom(CONFIG.seed) + runs * 7919); runs++; // each new expedition is a new world
  // state.gained: what this run gained or learned, the high the ending shows.
  setState({ t: 0, score: 0, gained: '', won: false, screen: 'map', run: null, battle: null, reward: null, shop: null, camp: null, travel: null, banner: null, pending: null });
  state.run = newRun();
}
function startRun(): void { reset(); setScene('play'); sfx('travel'); }
const scenes: Record<string, Scene> = {
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
function step(): void {
  if (pressed('KeyM')) { setMuted(!muted); hit.delete('KeyM'); }
  scenes[scene].update(STEP); hit.clear();
  mouse.pressed = false; mouse.released = false;
}
let last: number, acc = 0, ALPHA = 1; // ALPHA: how far the frame is between the last two steps
function tick(): void {
  const now = clock.now();
  acc += Math.min(now - last, 0.25); last = now; // a stall never fast-forwards the game
  while (acc >= STEP) { step(); acc -= STEP; }
  ALPHA = acc / STEP; // draw between steps, so the view never judders
  drawFrame();
}
function drawFrame(): void { scenes[scene].draw(); }
function frame(): void { tick(); requestAnimationFrame(frame); }
// A headless browser on a time budget runs timers but almost no animation frames: a timer
// ticks when no frame has come for 100 ms on a visible page; a hidden tab stays paused.
function timer(): void { if (document.visibilityState === 'visible' && clock.now() - last > 0.1) tick(); }

// ---- What a check can read and drive (?manual=1 stops the loop; players never see it) ----
install({
  get scene() { return scene; },
  get state() { return state; },
  press(code) { hit.add(code); },
  hold(code, on) { if (on) down.add(code); else down.delete(code); },
  get events() { return events; }, // the loop steps; a check empties it
  step(n = 1, draw = true, alpha = 1) {
    for (let i = 0; i < n; i++) step();
    if (draw) { ALPHA = alpha; drawFrame(); }
  },
});

buildArt();
if (document.fonts && document.fonts.load) { document.fonts.load('12px "ZPixel"', 'Aa가'); document.fonts.load('24px "ZPixel"', 'Aa가'); }
reset();
setScene(params.get('scene') || 'title');
last = clock.now();
if (manual) drawFrame();
else { requestAnimationFrame(frame); setInterval(timer, 50); }
