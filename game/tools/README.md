# Tools

Build-time scripts that write the game's data and content from the zendikar-map project's data.
They read the map's data and never change it. Run them with Node from `game/`.

| Tool | Writes | From |
|---|---|---|
| `gen-world.mjs` | `data/world.json`: coastlines, forests, waters, continents, the stops | the map's `src/data/geo/*.json`, `locations.ts`, `continents.ts`; the list of stops is in the tool |
| `gen-lore.mjs` | `data/lore.json`: each card's official names, number, rarity, type, continent and place | the map's phase files and `cards.ts`; the list of sets is in the tool |
| `gen-content.mjs <set>` | `src/cards2.ts`, `src/enemies2.ts`, and new values in `data/config.json` | the authoring tables in `specs/` |

Each takes `--check`: it writes nothing and says whether the file is what the tool would write
(exit 1 when it is not). `npm run data:check` runs all three checks.

```
node tools/gen-world.mjs --check
node tools/gen-lore.mjs --check
node tools/gen-content.mjs zen --check
```

## What is checked where

- **`gen-content.mjs`**, before it writes: every id is a card of the set in `data/lore.json`; a
  Korean name is the game's own only where no official one was printed; a card sits on the
  continent the map's data gives it; every effect, trap, event and trait is one the game knows;
  an effect that aims has a target; every card of the set has exactly one role (a card, a land
  or an enemy); every enemy can be met.
- **`tests/unit/content.test.ts`**, in `npm test`: the content as the game loads it. Every card
  and enemy has its words in both languages, its picture, and its numbers in `data/config.json`;
  every card can be found and every enemy met; every card in `data/lore.json` has a role.

## The numbers

A table in `specs/` holds the numbers a card or an enemy was first written with. The tool gives
each a name (`<card>_<effect>`) and a value in `data/config.json`. From then on the value lives
there: the tool never changes a value that exists, and `--check` lists the ones tuned since.
The modules it wrote say "edit here from now on"; it does not write over a module that differs
unless told to (`--force`).

## Adding a set

1. Add the set to `SETS` in `gen-lore.mjs` and run it: `data/lore.json` gains the set's cards.
   `tests/unit/content.test.ts` now fails for each new card with no role, until step 4.
2. Write `specs/<set>-cards.mjs` and `specs/<set>-enemies.mjs` in the shape of ZEN's.
3. Lay out the set's modules in `MODULES` in `gen-content.mjs`. ZEN's modules declare `ROSTER`
   and `PLACE_LAND`; a second set must add to them, not declare them again. That shape is not
   written yet: it is decided with the set.
4. Run `gen-content.mjs <set>`, import the new modules in the load order (each module imports
   the one before it; `main.ts` imports the last), and draw the pictures and figures.
5. `npm test`.

## Rules these tools keep

- The map project's data is read only. A Korean name the map has is the official printed one;
  a name the game needs and no card printed is written in the game only, and drawn with a star.
- Card art, frames, symbols and rules text are not taken. A card here has the name, the subject
  and the place the map ties it to; what it does is this game's own design.
