# Skyclave world materials

The runtime catalog has seven material families at **2048 × 2048**: rune stone, obsidian, aged bronze, wet moss, clear weathered glass, fine sand, and Omra archive masonry. Semantic wall/floor/trim materials retain their own colour tints and UV scales in `make-rooms.mjs`.

The four unchanged macro concept images in `generated-source/` were created with OpenAI ImageGen for this project on 2026-10-11. Their **actual native resolution is 1254 × 1254**, not 2K; `generated-source/PROMPTS.md` preserves the prompts. `prepare-world-textures.py` combines those macro designs with actual native 2K CC0 photographic micro-colour, normals and roughness, and bakes new 2K material maps in Blender. It preserves the original macro images. Smooth periodic edge blends make the resulting material wrap; this is not an enlargement of the former 1K runtime textures.

| Runtime material | Macro/design | Native 2K microdetail / material source |
| --- | --- | --- |
| skyclave_rune_stone | Generated weathered rune slabs | Poly Haven [Stone Tiles 02](https://polyhaven.com/a/stone_tiles_02), Charlotte Baglioni, CC0 |
| skyclave_obsidian | Generated fractured obsidian strata | Poly Haven [Seaworn Stone Tiles](https://polyhaven.com/a/seaworn_stone_tiles), Dimitrios Savva, CC0 |
| skyclave_ancient_bronze | Generated aged bronze inlay | ambientCG [Metal017](https://ambientcg.com/a/Metal017), CC0; native 2K colour/normal/roughness/metalness |
| skyclave_wet_moss | Generated damp ruin moss | Poly Haven [Mossy Rock](https://polyhaven.com/a/mossy_rock), Rob Tuytel, CC0 |
| skyclave_clear_glass | Authored clear-glass scratch/dust shader | New native 2K Blender bake of periodic four-dimensional scratch/dust fields; no old stained-glass image or paid texture |
| sand_01 | Fine sand / ash | Poly Haven [Sand 01](https://polyhaven.com/a/sand_01), Rob Tuytel, CC0; actual native 2K scan |
| omra_archive_stone | OpenAI ImageGen dressed grey masonry, 2026-10-15; matches the shop window module | Poly Haven Stone Tiles 02 native 2K micro-colour, normal and roughness; same CC0 source as rune stone |

The archive design is preserved at its actual generated resolution, **1254 × 1254**, in `generated-source/omra_archive_stone.png`. `prepare-world-textures.py -- game --only omra_archive_stone` bakes new native 2K material maps with the existing scanned microdetail pipeline; the generated design alone is not a native 2K texture. `generated-source/omra_archive_stone.prompt.json` records the built-in ImageGen prompt and reference roles. `make-rooms.mjs` assigns this material to archive masonry only, at a 3.6 m repeat and neutral white tint.

Poly Haven license: https://polyhaven.com/license
ambientCG license: https://docs.ambientcg.com/license/
The original 2K maps were fetched from the publishers' download APIs. Poly Haven MD5s, URLs and actual 2048px dimensions are recorded in `game/art-src/world-texture-sources.json` (source cache, not shipped). ambientCG's original archive is `https://ambientcg.com/get?file=Metal017_2K-JPG.zip`. Source acquisition and art preparation are one-time tooling; normal builds need only the checked-in prepared images.

## Reproduction

1. Run `node game/tools/art/fetch-world-texture-sources.mjs` (Node, Python's standard ZIP reader and ffprobe). It fetches and verifies the native 2K sources, including only the four required Metal017 archive images.
2. Run Blender 3.6 with `--background --factory-startup --disable-autoexec --python-exit-code 1 --python game/tools/art/prepare-world-textures.py -- game`.
3. Run `node game/tools/art/prepare.mjs --only tiles`.

`source/materials.json` records the exact macro dimensions, 2K photographic input maps and 2K bake resolution. The runtime JPEGs use sRGB albedo, linear normal XY / roughness (NAR), and an explicit grey metalness map for bronze. The existing surface shader reconstructs and lights the physical normal; glass keeps its actual pane material flag. Props and weapons retain their separately sized existing texture pools.
