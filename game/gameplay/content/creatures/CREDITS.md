# Creatures

`sourceactors/Skeleton.blend`, `sourceactors/Slime.blend`,
`sourceactors/Dragon.blend`: Quaternius, **LowPoly Animated Monsters**,
original 2018 animated source files downloaded from the
author's itch.io distribution on 2026-10-10. Used respectively for ruin skeleton
chargers, roil slime casters, and the Skyclave dragon boss. Their placement and
mechanics are this game's inventions rather than official Magic designs.

- Author/source: https://quaternius.itch.io/lowpoly-animated-monsters
- Pack license: **CC0 1.0 Universal**, https://creativecommons.org/publicdomain/zero/1.0/
- Redistribution and commercial use are permitted. Optional attribution retained.
- Authored clips: Skeleton_Running (0–30), Skeleton_Attack (0–28), Skeleton_Death
  (0–11); Slime_Walk (0–20), Slime_Attack (0–15), Slime_Death (0–10);
  Dragon_Flying (0–40), Dragon_Attack (0–21), Dragon_Attack2 (0–40), Dragon_Death
  (0–29). Blender evaluates the source rigs for runtime pose exports.
- `game/tools/art/prepare-creatures.py` retains all source triangles and materials,
  evaluates eight locomotion poses, eight attack poses and the final death pose.
  `animated/sources.json` records source action names and real playback periods:
  Skeleton 60, Slime 50, Spider 50 and Dragon 100 simulation ticks at 60 Hz.
  The runtime consumes these authored animation poses, with no static fallback.

`Spider.glb`: Quaternius, **Spider**, downloaded from its CC0 model distribution:
https://poly.pizza/m/yRYJiAJyiM on 2026-10-10. Original 2,712 triangles, skinned
GLB retained. The source has authored solid-color materials and no UV/texture
images. Authored clips include Spider_Walk, Spider_Attack, Spider_Death,
Spider_Idle, Spider_Jump. Source download:
https://static.poly.pizza/4259fbdb-afb5-4d40-9108-363625dd6b6e.glb

`vampire-bat/bat_v5.blend`, `bat_tex.jpg`, `bat_tex_n.jpg`, `bat_parts.jpg`: rubberduck,
**Vampire Bat (Animated)**, OpenGameArt, published 2018-07-15. **CC0**.
Sculpted, textured, rigged model: 4,004 vertices / 7,732 triangles.

- Source/license page: https://opengameart.org/content/vampire-bat-animated
- Original archive: https://opengameart.org/sites/default/files/animated_vampire_bat.zip
- Author confirms public-domain photo references and CC0 Yughues textures.
- Original mesh, UVs, texture maps and animation source retained, downloaded
  2026-10-10. `game/tools/art/prepare-bat.py` evaluates the author's `Bat_Flying`
  rig action at frames 0–7 and writes eight indexed `.zkmodel` poses. Every pose
  retains all 7,732 triangles, smooth normals, original UVs and the two material
  assignments. Common scaling gives a 2.8 m wingspan; only axis/origin conversion
  is applied. Body and mouth textures plus the original body normal map become
  separate 1024² JPEG albedo/NAR layers. Runtime playback uses these authored
  poses at 24 fps; it does not replace the rig motion with procedural wing boxes.

## Reproducing the runtime assets

Run from the repository root with Blender 3.6. The source files above are retained
reproduction inputs; `animated/*.meshbin`, `vampire-bat/flight_*.zkmodel` and the
four prepared bat JPEGs are the files packed by `game/CMakeLists.txt`. The normal
game build does not execute Blender or ship the original rigs to the browser.
`animated/sources.json` records export provenance and locomotion durations; it is
not loaded at runtime.

```powershell
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --factory-startup --disable-autoexec --python game/tools/art/prepare-creatures.py -- game/gameplay/content/creatures
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --disable-autoexec game/gameplay/content/creatures/vampire-bat/bat_v5.blend --python game/tools/art/prepare-bat.py -- game/gameplay/content/creatures/vampire-bat
```

Re-export only when changing these sources or the export transforms, then rebuild
the WASM and asset pack together. Pose interpolation relies on unchanged vertex
order across each authored clip.
