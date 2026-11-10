// Sound: started on the first input, mute on M. Every sound is a short tone made here.
import { tune } from './config';
import { audioContext } from './hook';

let audio: { ac: AudioContext; out: GainNode } | null = null;
export let muted = false;

export function startAudio(): void {
  if (!audio) {
    const ac = audioContext(); // a check may inject one
    const out = ac.createGain(); out.gain.value = muted ? 0 : tune.volume;
    out.connect(ac.destination); audio = { ac, out };
  }
  if (audio.ac.state === 'suspended') audio.ac.resume();
}
export function setMuted(m: boolean): void { muted = m; if (audio) audio.out.gain.value = m ? 0 : tune.volume; }
addEventListener('tune', () => setMuted(muted)); // the tweak panel moved a value: the volume follows

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3): void {
  if (!audio || muted) return;
  const t = audio.ac.currentTime, o = audio.ac.createOscillator(), g = audio.ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.out); o.start(t); o.stop(t + dur);
}

/** The game's sounds. A hit's pitch climbs with each hit of a chain (n), so a good turn builds. */
export function sfx(kind: string, n?: number): void {
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
