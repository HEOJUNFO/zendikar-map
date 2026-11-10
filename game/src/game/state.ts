// What is in play right now: the expedition's state, the scene on screen, and the log a check
// reads. Other modules read these as they are at that moment; only the setters replace them.
import type { State } from './types';

/** The expedition in play. main.ts makes a new one for each run (reset). */
export let state: State;
export function setState(s: State): void { state = s; }

/** The scene on screen: title, play, over, results, figures or gallery. */
export let scene: string;
export function setScene(name: string): void { scene = name; }

/** window.game.events: anything the game wants a run to see. */
export const events: unknown[] = [];
