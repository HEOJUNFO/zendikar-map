// Input: keys by position (event.code), OS key repeat ignored; the pointer in game pixels.
import { startAudio } from './audio';
import { H, W, canvas } from './screen';

export const down = new Set<string>(), hit = new Set<string>();
/** True for one step after the key goes down. */
export const pressed = (code: string): boolean => hit.has(code);
addEventListener('keydown', e => {
  startAudio();
  if (!e.repeat) { down.add(e.code); hit.add(e.code); }
  if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => down.delete(e.code));
addEventListener('blur', () => down.clear());

/** mouse.pressed and mouse.released are true for one step; dx, dy: where the button went down. */
export const mouse = { x: -1, y: -1, dx: -1, dy: -1, down: false, pressed: false, released: false };
let sawPointer = false;
function pointerAt(e: MouseEvent): void {
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
