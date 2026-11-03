// Nahiri's Resolve (MAT #37) — atop the fallen Emeria Skyclave Nahiri swears to close Zendikar off from outside forces ("No Planeswalker will set
// foot on Zendikar ever again." — Beyond Repair, 2023, the scene its art illustrates; flavor "Zendikar is my home!"). A symbol beside Nahiri
// (Nahiri, Forged in Fury): a ring of stone shards rising and leaning in to close round one hedron. Coralhelm regional detail.
FIGURES.push({
  id: 'nahiris-resolve',
  size: 6,
  bg: 'land',
  viewBox: [2, 8, 80, 64],
  anchor: [42, 64],
  parts: [
    { cls: 'shade', d: 'M10 62A32 7 0 1 0 74 62A32 7 0 1 0 10 62Z' },
    // back row of shards
    { cls: 'stone', d: 'M18 57L26 56L33 22ZM32 55L39 55L40 16ZM45 55L52 55L44 16ZM58 56L66 57L51 22Z' },
    { cls: 'shade', d: 'M22 56.6L26 56L33 22ZM35.6 55L39 55L40 16ZM48.6 55L52 55L44 16ZM62 56.4L66 57L51 22Z' },
    { cls: 'ink', d: 'M18 57L26 56L33 22ZM32 55L39 55L40 16ZM45 55L52 55L44 16ZM58 56L66 57L51 22Z' },
    // the hedron held inside
    { cls: 'stone', d: 'M42 24L48 34L42 46L36 34Z' },
    { cls: 'shade', d: 'M42 24L48 34L42 46Z' },
    { cls: 'hatch', d: 'M43.6 28L44.4 42M45.4 31L45.6 38.6' },
    { cls: 'ink', d: 'M42 24L48 34L42 46L36 34ZM42 24L42 46M36 34L48 34' },
    // front row
    { cls: 'stone', d: 'M6 61L16 64L31 24ZM36 67L48 67L42 48ZM68 64L78 61L53 24Z' },
    { cls: 'shade', d: 'M11 62.6L16 64L31 24ZM42 67L48 67L42 48ZM73 62.6L78 61L53 24Z' },
    { cls: 'hatch', d: 'M13 62.4L28.4 29M15 63.2L29.6 28.4M44 66L42.8 52M46 66L43.6 55M75 61.4L57 30M76.6 61L58.8 31.6' },
    { cls: 'ink-bold', d: 'M6 61L16 64L31 24ZM36 67L48 67L42 48ZM68 64L78 61L53 24Z' },
  ],
})
