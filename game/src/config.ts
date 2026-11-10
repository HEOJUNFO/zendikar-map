// Every tuning value, from data/config.json: each with value, min, max and step. The game
// reads them live through `tune`, so a value the tweak panel moves shows at once. The tweak
// panel is on the dev server only: no build has it.
import data from '../data/config.json';

/** data/config.json as it is: `seed`, and a slider (value, min, max, step) under every other key. */
export const CONFIG = data;

type Data = typeof data;
/** The keys of data/config.json that hold a slider. */
export type TuneKey = { [K in keyof Data]: Data[K] extends { value: number } ? K : never }[keyof Data];

/** Live reads: tune.energy is data/config.json's energy.value at this moment. */
export const tune = new Proxy({} as { readonly [K in TuneKey]: number }, {
  get: (_, k) => (CONFIG as unknown as Record<string | symbol, { value: number }>)[k].value,
});

/**
 * The same table by any name. A card's or an enemy's number may be the name of a slider, so the
 * content looks its numbers up here; a name with no slider gives undefined.
 */
export const SLIDERS = CONFIG as unknown as Record<string, { value: number } | undefined>;

if (import.meta.env.DEV) await import('./dev/tune');
