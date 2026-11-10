# Grown: zendikar-expedition

The one-shot `prototypes/zendikar-expedition/` (last commit `625a901`, first build tagged
`one-shot/zendikar-expedition` at `e66b370`) grown into a Vite and TypeScript web project on
2026-11-10. Everything was copied out of the one-shot; nothing in it was edited, moved or deleted.

**Where:** `game/`, not the project root. The root of this repository is the map app
(`package.json`, `index.html`, `src/`), so the grow tool's guard fails there (`root fail:
package.json is at the root`). The person chose `game/` (question, 2026-11-10). The tool ran with
`--root game`; `game/prototypes`, `game/production` and `game/design` are links to the
repository's folders of the same name, so the tool reads the one-shot and writes this evidence
where the studio's skills look.

## The five steps

| Step | What was done | Result | Commit |
|---|---|---|---|
| 1 Reference | The one-shot played twice from seed 1 by a one-minute key script (`replay.args`): title, language switch, deck view, a wild fight, reward, market, camp, a new continent, an elite fight | `exact yes`, errors 0 | `b5f95cd` |
| 2 Copy | The web scaffold's tooling, the page, `data/config.json` (521 entries, 520 sliders), the assets; the 15 scripts carried into `game/src` as modules in the page's order, still JavaScript | `match yes`, errors 0 | `fa5b72a` |
| 3 TypeScript | `main.js` split by what the code does; the 13 carried modules moved to TypeScript under `strict`; the world and lore tables moved to `data/world.json` and `data/lore.json`; eight rules moved to `src/game/rules.ts`, called by the game | `match yes`, errors 0; `tsc --noEmit` 0 errors | `52b5ea9` |
| 4 Rules under test | `tests/unit/rules.test.ts` (Vitest) and `tests/integration/boot.spec.ts` (Playwright: `@boot`, and the replay's opening through the hook) | 19 + 2 tests pass; a rule broken on purpose (`<= near` to `< near`) failed its test (`expected 2 to be 1`), then restored | `7916c61` |
| 5 Record | `engine.name: Web` and the game's folders and commands in `project.yaml`; `CLAUDE.md`'s stack lines and a note on `game/`; the checks below | all three checks pass | this commit |

**The checks (step 5):** `npm run build` built `game/dist/`; `bash .claude/scripts/test-run.sh web
--root game` gave `rule web:pass` (21 tests: 19 unit, 2 in the browser); `npm run smoke` passed
(1 test).

**Seen in:** `typescript.png`, looked at beside `reference.png`: the same screen, day 5 at the
Teeth of Akoum, turn 5 of the fight with the Hellkite Charger (leader 61/70, the dragon 42/66).

## Checked beyond the tool's replay

The replay compares the scene and state rows and the last two seconds' frames. These were added,
each run with the studio's own scripts (`one-shot-run.sh`, `page-shot.sh`), for step 2 and again
for step 3:

- **Along the run:** the screen at 11 moments of the same key script (steps 20, 100, 140, 420,
  700, 900, 1150, 1650, 1900, 2400, 3000: map in English, deck view, both fights, reward, market,
  camp, travel) has the same hash in the one-shot and in the build.
- **Still screens:** 14 screenshots are byte-identical between the one-shot and the build: the
  card gallery (4 pages, every card picture), the figures (6 pages, every enemy), the title in
  Korean and in English, and both endings.
- **Types only:** with the types stripped, 12 of the 13 carried modules are the same code as
  before typing, but for the eight calls into `src/game/rules.ts` and two pairs of parentheses
  left by casts (`cards.ts`). `art.ts` differs by the pen: a constructor function with
  prototype methods became a class with the same fields and methods.
- **The dev server:** `npm run dev` served the page with no error but the browser's own request
  for `favicon.ico` (404), and a scripted opening (11 looks at the state through the hook) gave
  the same values on the dev server as on the build.

## NOT ASSESSED

- **The pointer:** every run is driven by keys through the hook. Clicking, dragging a card and
  hovering were not exercised by any run, before or after the grow (the code is the same).
- **What the key script does not reach:** the Roil Elemental's fight, guard fights, quests,
  rally, most traps, summons and revivals, the trim choice at camp, and the backdrops of Murasa,
  Ondu, Bala Ged, Guul Draz and Sejiri. Their code is the same code (see Types only), but no run
  played it.
- **The tweak panel** (`src/dev/tune.ts`, the backquote key on the dev server): it was loaded
  with the dev page, not opened or used.
- **The guard's `clean` and `commit` rows** read `-` through the link at `game/prototypes`. They
  were read at the repository root instead: no uncommitted change in the one-shot, last commit
  `625a901`.

## Still `Loose`

`type Loose = any` in `src/game/types.ts`. The kinds that use it, each built field by field:

- `Run` (the expedition), `Battle` (a fight), `Enemy` (an enemy in a fight), `Move` (an enemy's
  move), `CardInPlay` (a card in a pile or the hand), `Fx` (one effect of a card), `QueueStep` (a
  queued step of a fight).
- `CardDef` and `EnemyDef`: their typed fields are few (`type`, `cost`, the hooks, `trap`;
  `cont`, `moves`); every other field is read through an index signature of `Loose`.
- `State`'s `run`, `battle`, `reward`, `shop`, `camp`, `travel`, `banner` and `pending`.
- In the screens: `ui.drag`, `ui.inspect`, `ui.deck`; the options handed to `drawCard`,
  `drawCardInfo` and `stopInfoLines`; the side panel's lines; a shop's items.
- In `text2.ts`: the numbers put into a sentence with `split().join()` (`a0`, `a1`, `n`).

## What differs from a grow at the root

- `game/` is the web project's root: run `npm` there, and give the studio's scripts `--root game`
  (`one-shot-grow.sh`, `one-shot-run.sh`, `one-shot-tune.sh`, `test-run.sh`).
- The tool's `record` step writes only for a game at the root (`engine not_written: no
  project.yaml` in `game/`), so `project.yaml` at the repository root was written by hand:
  `engine.name`, `engine.version`, `engine.code_root: game/src`, `engine.test_root: game/tests`
  and `commands.*` (`npm --prefix game ...`). `test-run.sh web` without `--root` runs
  `commands.test` and can read it by exit code only (`rule web:0`); with `--root game` it reads
  both halves (`rule web:pass`).
- `CLAUDE.md`'s Technology Stack lines were filled by hand. The engine reference import
  (`@docs/engine-reference/web/VERSION.md`) was **not** added: it would load into every session
  of this repository, the map's too. Skills read that file on demand.
- `game/playwright.config.ts` finds `page-shot.sh` one folder up.
- `game/.oxlintrc.json` keeps the map's linter (`pnpm lint`, React rules) out of `game/`.
