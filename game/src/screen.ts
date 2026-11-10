// The screen: one canvas at a logical 640 x 360, scaled by whole numbers to fill the window.

export const W = 640, H = 360;         // logical size: a pixel look, scaled by whole numbers
export const PIXEL = true;             // pixel looks: whole-number scale, no smoothing
export const FONT = '"ZPixel", monospace'; // a pixel face with Korean and Latin (assets/fonts, OFL)

export const canvas = document.getElementById('game') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;

export function fit(): void { // fills the window at any size and pixel ratio
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

export function clear(c: string): void { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
