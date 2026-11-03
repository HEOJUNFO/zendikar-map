// Nahiri, Forged in Fury (MAT #36) — after the invasion, Nahiri, de-compleated and without her spark, stands at the top of the rough stone stair she
// broke up through the roof of the fallen Emeria Skyclave: a heated stone blade she shaped herself in one hand, heat in the other, the diamond scars
// where flesh had fused to metal on her arms and body (Beyond Repair, 2023). Coralhelm regional detail, on the dome of the crashed skyclave.
FIGURES.push({
  id: 'nahiri-forged-in-fury',
  size: 9,
  bg: 'land',
  viewBox: [2, 2, 62, 98],
  anchor: [31, 99],
  parts: [
    // the top of the stair she broke out through the roof, and two dome tiles torn up beside it
    { cls: 'stone', d: 'M15 92L24 90.5L38 91.5L43 93L42 98.5L29 99.5L16 98.5Z' },
    { cls: 'stone', d: 'M20 86L27 84.5L40 85L46 87L45 91L33 92L21 91Z' },
    { cls: 'stone', d: 'M6 97L12 93.5L15 99ZM48 99L53 94.5L58 99Z' },
    { cls: 'shade', d: 'M38 91.5L43 93L42 98.5L37 99ZM40 85L46 87L45 91L38.6 91.6ZM53 94.5L58 99L54 99Z' },
    { cls: 'hatch', d: 'M39 92.4L38.6 98.6M40.6 92.8L40.2 98.6M41.6 86L40.8 91.4M43.4 86.6L42.6 91.2M20 95L26 95.4M23 88.4L30 88' },
    { cls: 'ink', d: 'M15 92L24 90.5L38 91.5L43 93L42 98.5L29 99.5L16 98.5ZM20 86L27 84.5L40 85L46 87L45 91L33 92L21 91ZM6 97L12 93.5L15 99ZM48 99L53 94.5L58 99Z' },
    // legs and boots
    { cls: 'fill', d: 'M28 52L33 53L29 68L27 85L22 85.5L24 69ZM33 53L38 51.5L40 67L45 84.5L40.5 85L36 69Z' },
    { cls: 'shade', d: 'M36 52.4L38 51.5L40 67L45 84.5L42.4 84.8L38.2 68ZM22 85.5L27 85L27.4 81.6L22.6 81.8ZM40.5 85L45 84.5L44.2 81.2L40 81.6Z' },
    { cls: 'hatch', d: 'M37.4 56L41.6 82M38.8 55.2L43 81.6M30.6 56.6L28 66' },
    { cls: 'ink-bold', d: 'M28 52L24 69L22 85.5L27 85L29 68L33 53M33 53L36 69L40.5 85L45 84.5L40 67L38 51.5' },
    // torso, belt
    { cls: 'fill', d: 'M26.5 29C29 27.5 35 27.5 38 29L37 39C37 43 38 47 38.5 52L27.5 52.5C28 47 28.5 43 28 39Z' },
    { cls: 'shade', d: 'M33 28.2C35 28.2 37 28.6 38 29L37 39C37 43 38 47 38.5 52L33.5 52.4Z' },
    { cls: 'hatch', d: 'M29.6 32L32.6 35.6M31.6 32L34.6 35.6M29.8 35.4L32.8 31.8M31.8 35.4L34.8 31.8M29.4 38.4L32 41.6M31.4 38.4L29.4 41M35.4 30.6L36.6 46M36.6 31L37.6 46' },
    { cls: 'ink', d: 'M26.5 29C29 27.5 35 27.5 38 29L37 39C37 43 38 47 38.5 52L27.5 52.5C28 47 28.5 43 28 39ZM27.8 48.5L38.3 48M27.6 51L38.5 50.6' },
    // the raised arm with heat in the hand, the arm with the blade
    { cls: 'fill', d: 'M27 30L23.5 28.5L19 22L16 15.5L18.6 14.5L21.8 20.5L26.5 25.5L28.6 32.5ZM37.5 29.2L41 30.5L45.5 38.5L48.5 46L45.6 47.2L42.6 40.5L37.6 35Z' },
    { cls: 'hatch', d: 'M19.6 19.4L22.4 22.6M21.4 18.2L24.2 21.6M19.4 21.8L22.8 18.6M21.4 23.4L24.6 20.4M39.6 32.6L42.6 35.4M40.8 35.8L43.2 33M42.6 38.6L45.2 41.4M43.8 41.8L46 39.4' },
    { cls: 'ink', d: 'M27 30L23.5 28.5L19 22L16 15.5L18.6 14.5L21.8 20.5L26.5 25.5L28.6 32.5ZM37.5 29.2L41 30.5L45.5 38.5L48.5 46L45.6 47.2L42.6 40.5L37.6 35Z' },
    { cls: 'stone', d: 'M46 46.5L49.4 45.6L60.5 78.5L58.7 82.4L56.4 78.8Z' },
    { cls: 'fire', d: 'M49.4 45.6L60.5 78.5L59.6 79.4L48.6 46.4Z' },
    { cls: 'hatch', d: 'M48.4 50L56.6 76M47.6 47.6L55.4 71' },
    { cls: 'ink-bold', d: 'M46 46.5L49.4 45.6L60.5 78.5L58.7 82.4L56.4 78.8ZM43.8 47.6L50.8 44.4' },
    { cls: 'fire-ink', d: 'M49.4 45.6L60.5 78.5M61.8 70.6L64 69.4M62.4 76.4L64.6 76.6M55.4 57.4L57.6 55.8' },
    { cls: 'fire', d: 'M17.2 14C15.2 11.6 15.4 8.6 17.4 6C17.6 8.4 19.6 9.4 19.6 12C19.6 13.6 18.4 14.6 17.2 14Z' },
    { cls: 'fire-ink', d: 'M17.2 14C15.2 11.6 15.4 8.6 17.4 6C17.6 8.4 19.6 9.4 19.6 12C19.6 13.6 18.4 14.6 17.2 14ZM13.6 8.4L12 6.4M21.2 7.6L22.8 5.6M14.2 12.4L12.2 12.2' },
    // neck, head, wind-swept short hair
    { cls: 'fill', d: 'M31.4 25L34.6 25L34.6 28.4L31.4 28.4Z' },
    { cls: 'ink', d: 'M31.4 25L31.4 28.4M34.6 25L34.6 28.4' },
    { cls: 'fill', d: 'M28.6 20C28.6 16 30.6 14 33 14C35.6 14 37.4 16 37.4 20C37.4 23.6 35.6 25.6 33 25.6C30.4 25.6 28.6 23.6 28.6 20Z' },
    { cls: 'shade', d: 'M33 14C35.6 14 37.4 16 37.4 20C37.4 23.6 35.6 25.6 33 25.6C34.6 23.6 35 21.6 35 20C35 17.6 34.4 15.2 33 14Z' },
    { cls: 'ink', d: 'M28.6 20C28.6 16 30.6 14 33 14C35.6 14 37.4 16 37.4 20C37.4 23.6 35.6 25.6 33 25.6C30.4 25.6 28.6 23.6 28.6 20ZM34.6 18.4L36.6 18.8M34.4 22.8L36.2 22.4' },
    { cls: 'dark', d: 'M35 19.8A0.6 0.5 0 1 1 36.2 19.8A0.6 0.5 0 1 1 35 19.8Z' },
    { cls: 'fill', d: 'M28.2 19.5C27.6 14.5 30.2 11.2 33.6 11C37 10.8 39.2 12.6 40.2 14.2L44.2 13.4L41 16L43.4 18.2L39.2 17.6C38.4 16 36.4 15 33.6 15C30.8 15 29.4 16.8 29.2 19.6Z' },
    { cls: 'hatch', d: 'M30.4 13.4L35.6 12.4M31 15L38.4 14M36.6 12L40.4 14.6' },
    { cls: 'ink', d: 'M28.2 19.5C27.6 14.5 30.2 11.2 33.6 11C37 10.8 39.2 12.6 40.2 14.2L44.2 13.4L41 16L43.4 18.2L39.2 17.6C38.4 16 36.4 15 33.6 15C30.8 15 29.4 16.8 29.2 19.6Z' },
  ],
})
