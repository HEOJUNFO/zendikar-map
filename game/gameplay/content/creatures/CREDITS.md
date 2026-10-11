# Creatures

The runtime skeletal warrior, Roil elemental, cave spider and mineral drake use
textured PBR meshes in `high-detail/`. Their topology-stable poses comprise eight
locomotion frames and eight attack frames; authored collapse poses are retained
for the skeleton, elemental and spider. The drake's corpse uses a runtime
twenty-bone ragdoll and eight-influence dual-quaternion skinning.
`high-detail/CREDITS.md` records exact sources, licenses and derived motions.

- Skeletal warrior: Grab3D **Human Skeleton**, CC0-1.0. Original 4K sculpt and
  rigged Run source retained in `high-detail/skeleton/source/`. Curved etched
  armor and attack/collapse animation are authored project derivatives.
- Roil elemental: original fractured obsidian plates, engraved Kor traces and
  amber hedron, with twenty fragment bones and original animation.
- Mineral drake: Grab3D **Crystal Dragon**, CC0-1.0. Original 4K static source
  retained in `high-detail/dragon/source/`; anatomical skin and subtle gait are
  authored project derivatives. Physical corpse animation comes from the
  game's constrained joint engine, rather than an author-supplied death clip.
- Grab3D discloses AI-assisted Meshy geometry/textures. These sources are credited
  as such; derived animation is not represented as original author animation.

Earlier Quaternius Skeleton/Slime/Dragon cartoon meshes were replaced and are
not runtime assets. Their CC0 license history remains with the archived original
sources in ignored `game/art-src/`; their old converter and colored pose pack
were removed. The Quaternius Spider source below is still a reproduction input.
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

`old-lady/oldlady-v2.blend`: CDmir, **Old Lady**, with TinyWorlds credited as
collaborator, OpenGameArt, published 2016-02-19. **CC0-1.0**. Downloaded 2026-10-11
from https://opengameart.org/content/old-lady (direct source:
https://opengameart.org/sites/default/files/oldlady-v2.blend).

The elderly character's original mesh, rig, Sitting action and packed 2048px
skin/AO, normal and specular textures are retained. `prepare-old-lady.py` exports
four authored sitting samples and collapse, resurrection and hunting motions
on that rig, keeping every original triangle and UV/normal seam. Two prepared
2K JPEGs and 24 indexed pose models are packed; the original Blender file is not.
SurfaceBatch interpolates the shared pose topology and uses the existing PBR
surface shading. `old-lady/README.md` and `poses.json` record the source hash,
authored clip and derived motions.

## Reproducing the runtime assets

Use Blender 3.6 from the repository root. Source GLBs/rigs are retained for
reproduction; the game packs only prepared PBR maps and `.zkmodel` poses from
`high-detail/`, `vampire-bat/` and `old-lady/`. A normal game build does not run
Blender or ship original rigs. Locomotion cycles at 60 Hz are skeleton 40,
elemental 120, spider 50 and dragon 120 ticks; bat retains its 24 fps source.
The preparation manifests record source/derivative provenance.

```powershell
$blender = 'tools/blender/blender-3.6.23-windows-x64/blender.exe'
foreach ($kind in @('charger', 'caster', 'boss')) {
  & $blender --background --threads 8 --factory-startup --disable-autoexec --python-exit-code 1 --python game/gameplay/content/creatures/high-detail/prepare.py -- $kind
}
& $blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python game/tools/art/prepare-spider.py -- game/gameplay/content/creatures
& $blender --background --disable-autoexec game/gameplay/content/creatures/vampire-bat/bat_v5.blend --python game/tools/art/prepare-bat.py -- game/gameplay/content/creatures/vampire-bat
& $blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python game/tools/art/prepare-old-lady.py -- game/gameplay/content/creatures/old-lady
```

Re-export only when sources/transforms change, then rebuild WASM and the asset
pack together. Pose interpolation requires frozen vertex, UV and index order.
