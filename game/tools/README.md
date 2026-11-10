# Tools

Build-time scripts that write the game's data and content from the zendikar-map project's data.
They read the map's data and never change it. Run them with Node from `game/`.

| Tool | Writes | From |
|---|---|---|
| `gen-world.mjs` | `data/world.json`: coastlines, forests, waters, continents, the stops | the map's `src/data/geo/*.json`, `locations.ts`, `continents.ts`; the list of stops is in the tool |
| `gen-lore.mjs` | `data/lore.json`: each card's official names, number, rarity, type, continent and place | the map's phase files and `cards.ts`; the list of sets is in the tool |
| `fetch-colors.mjs` | `data/colors.json`: each card's colour, and the colours of mana each land makes | Scryfall's public card database (the one fact the map's data does not hold); it needs the network |
| `gen-content.mjs <set>` | `src/cards2.ts`, `src/enemies2.ts`, and new values in `data/config.json` | the authoring tables in `specs/`, with each card's kind from `data/lore.json` (its type line) and colour from `data/colors.json` |

Each takes `--check`: it writes nothing and says whether the file is what the tool would write
(exit 1 when it is not). `npm run data:check` runs the three checks that need no network;
`node tools/fetch-colors.mjs --check` asks Scryfall again and compares.

```
node tools/gen-world.mjs --check
node tools/gen-lore.mjs --check
node tools/gen-content.mjs zen --check
```

## What is checked where

- **`gen-content.mjs`**, before it writes: every id is a card of the set in `data/lore.json`; a
  Korean name is the game's own only where no official one was printed; a card sits on the
  continent the map's data gives it; a card is written as the kind its type line says (a
  creature on a `C` line, equipment on a `G` line ...) and has a colour in `data/colors.json`;
  every effect, trap, event and trait is one the game knows; only a strike's hook aims; every
  card of the set has exactly one role (a card, a land or an enemy); every enemy can be met.
- **`tests/unit/content.test.ts`**, in `npm test`: the content as the game loads it. Every card
  and enemy has its words in both languages, its picture, and its numbers in `data/config.json`;
  every card is used as the kind its type line says, in the colour the data gives it, and has
  what that kind needs; the starting lands can pay for the starting deck; every card can be
  found and every enemy met; every card in `data/lore.json` has a role.

## The numbers

A table in `specs/` holds the numbers a card or an enemy was first written with. The tool gives
each a name (`<card>_<effect>`) and a value in `data/config.json`. From then on the value lives
there: the tool never changes a value that exists, and `--check` lists the ones tuned since.
The modules it wrote say "edit here from now on"; it does not write over a module that differs
unless told to (`--force`).

## Adding a set

1. Add the set to `SETS` in `gen-lore.mjs` and run it: `data/lore.json` gains the set's cards.
   `tests/unit/content.test.ts` now fails for each new card with no role, until step 4.
   Run `fetch-colors.mjs`: `data/colors.json` gains their colours.
2. Write `specs/<set>-cards.mjs` and `specs/<set>-enemies.mjs` in the shape of ZEN's: a card on
   the line of its kind (`C` creature, `G` equipment or an aura worn, `S` instant, sorcery or an
   aura cast, `K` enchantment, artifact or planeswalker, `L` land).
3. Lay out the set's modules in `MODULES` in `gen-content.mjs`. ZEN's modules declare `ROSTER`
   and `PLACE_LAND`; a second set must add to them, not declare them again. That shape is not
   written yet: it is decided with the set.
4. Run `gen-content.mjs <set>`, import the new modules in the load order (each module imports
   the one before it; `main.ts` imports the last), and draw the pictures and figures.
5. `npm test`.

## Rules these tools keep

- The map project's data is read only. A Korean name the map has is the official printed one;
  a name the game needs and no card printed is written in the game only, and drawn with a star.
- Card art, frames, mana symbols, costs and rules text are not taken. A card here has the name,
  the subject and the place the map ties it to, and two facts about the card itself: what kind
  it is (its type line) and its colour. The keywords a card prints (flying, haste, landwalk,
  kicker ...) are written in the tables by hand, as this game reads them; no printed text is
  kept in the project. What a card costs and does is this game's own design, and mana is drawn
  as this game's own gems.
