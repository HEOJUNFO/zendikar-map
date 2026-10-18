# Authored vampire bat flight

rubberduck's [Vampire Bat (Animated)](https://opengameart.org/content/vampire-bat-animated)
is CC0. The original `bat_v5.blend`, albedo, normal and parts images remain the
reproduction sources. No replacement geometry, wings or procedural gait is used.

The author scene plays `Armature_Bat` / `Bat_Flying` at 24 fps, frames **1–8**.
Frame 0 is a neutral pose outside that scene loop. Eight evaluated samples form
one **20-tick cycle at 60 Hz**; the runtime interpolates each sample into its next
sample, including frame 8 back to frame 1. `flight.json` records the source hash,
clip, bounds, pose hashes and authored wing-bone endpoints.

The original rig belongs to a viewport-hidden collection. The exporter enables
the model/rig dependency collections before evaluation; otherwise Blender returns
the same mesh at every requested frame. It also freezes first-pose triangulation
and split vertex/UV/material slots: Blender can choose a different diagonal for a
bent quad even though its underlying polygon topology remains unchanged.

Each pose retains 7,732 triangles and 5,267 split runtime vertices. One common
origin/scale gives a 2.8 m maximum wingspan. The original two material atlases and
body normal map remain separate 1024² runtime albedo/NAR layers. The repaired
cycle moves actual exported vertices by up to 0.772 m from its first sample; the
authored right wing-tip bone spans 0.907 m vertically. The former frozen output
had exactly zero position change across all eight samples.

Reproduce poses without rewriting the existing prepared PBR maps:

```powershell
& tools/blender/blender-3.6.23-windows-x64/blender.exe --background --disable-autoexec game/gameplay/content/creatures/vampire-bat/bat_v5.blend --python-exit-code 1 --python game/tools/art/prepare-bat.py -- game/gameplay/content/creatures/vampire-bat --poses-only
```

Omit `--poses-only` to prepare the original material images too. The original
Blender file is never saved or modified by the exporter.
