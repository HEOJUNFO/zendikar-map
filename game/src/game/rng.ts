// The game's one source of chance (mulberry32). Every gameplay random call reads rng(), never
// Math.random, so the same seed replays the same expedition.

let seed: number;

/** Starts the sequence again from this seed: each new expedition is a new world. */
export function setSeed(n: number): void { seed = n; }

/** Where the sequence stands: setSeed(getSeed()) later goes on with the same numbers (a save keeps it). */
export function getSeed(): number { return seed; }

/** The next number of the sequence, from 0 up to but not including 1. */
export function rng(): number {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
