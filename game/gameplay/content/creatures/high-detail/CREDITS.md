# Detailed creature sources and derivations

The original source models and their exact license files are retained here.
The runtime files contain one 2,048 px PBR atlas per creature: base color,
normal XY plus roughness (NAR), and meaningful grayscale metalness.
Each creature has eight locomotion poses and eight attack poses. Skeleton and
elemental additionally have an authored collapse pose. The drake instead uses
the source-derived twenty-bone rig and eight-influence bind mesh for a runtime
ragdoll; no prerecorded rigid corpse substitutes for its physics.
UVs and index buffers remain identical across each creature's pose sequence.

## Kor skeletal warrior

- Source: [Human Skeleton, Grab3D](https://grab3d.com/models/anatomy/human-skeleton/).
- License: CC0-1.0; see `skeleton/LICENSE.txt`.
- The publisher discloses AI-assisted Meshy geometry/textures, subsequently
  prepared and rigged in Blender. Original 4K static source and the rigged
  source with its original Walk/Run clips are retained in `skeleton/source/`.
- Runtime: anatomical source geometry, existing author rig and Run animation,
  with original curved forged armor and etched metal material added for this
  project. Attack and corpse motions are derived here, not supplied by Grab3D.
- The author's 16-frame Run at 24 fps gives a 40-tick locomotion cycle. Root
  translation is removed and the exported standing poses are grounded.

## Roil obsidian elemental

This is an original polygon sculpture for this project, derived from the
composition in `../concepts/zendikar-creatures-v1.png`: irregular fractured
obsidian plates with cleaved faces and chipped/beveled edges surround a carved
amber hedron. Physically engraved patinated Kor traces decorate selected plates.
It uses twenty fragment bones and original orbit, charge, and collapse motions
(120-tick orbit).
No aligned boxes, voxel reconstruction, or humanoid golem geometry is used.
The model and preparation code follow the repository's license.

The independently downloaded [Stone Golem, Grab3D](https://grab3d.com/models/creatures/stone-golem/)
was researched as an alternative but is not part of the runtime model. Its
original 4K and rigged sources and CC0 license are archived in ignored
`game/art-src/creature-research/elemental/` and are not reproduction inputs.

## Ancient mineral drake

- Source: [Crystal Dragon, Grab3D](https://grab3d.com/models/creatures/crystal-dragon/).
- License: CC0-1.0; see `dragon/LICENSE.txt`.
- The publisher discloses AI-assisted Meshy geometry/textures, prepared in
  Blender. The original 4K static sculpt and textures are retained.
- This source has no rig or animation. The anatomical bones, continuous
  normalized skin envelopes, subtle 120-tick gait and breath motions are
  derived here. They are not represented as author-supplied animation.
- The source is an asymmetric posed sculpt. `prepare-boss-rig.py` exports its
  anatomical bind rig, inverse bind matrices and eight-influence skin. The
  shared generated `gameplay/domain/boss_rig_data.hpp` supplies the same rig to
  GPU-independent World simulation. The corpse uses constrained runtime bones,
  gravity and actual room/gate collision, rendered by dual-quaternion skinning.
  It is not stretched or compressed to fit a prerecorded corpse collider.
- The dark charcoal/brown derivative palette preserves the original 4K scales
  and normal detail. Sparse engraved bronze Kor marks have physical metalness;
  no emissive fill is baked into the material.

`prepare.py` produces the runtime models/maps and editable prepared Blender
files. `preview.py` renders the actual serialized runtime models and their
baked maps. `*-poses.json` records durations and export provenance.

```powershell
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --threads 8 --factory-startup --disable-autoexec --python-exit-code 1 --python game/gameplay/content/creatures/high-detail/prepare.py -- charger
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --threads 8 --factory-startup --disable-autoexec --python-exit-code 1 --python game/gameplay/content/creatures/high-detail/prepare.py -- caster
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --threads 8 --factory-startup --disable-autoexec --python-exit-code 1 --python game/gameplay/content/creatures/high-detail/prepare.py -- boss
tools/blender/blender-3.6.23-windows-x64/blender.exe --background --threads 8 --factory-startup --disable-autoexec --python-exit-code 1 --python game/tools/art/prepare-boss-rig.py
```

The original GLB's split corners are welded before simplification; otherwise
decimation can separate connected anatomy. Fitted asymmetric anatomical bones
and continuous bone-heat weights drive the repaired single-component skin.

After the parent game build, reproduce actual physical death poses using:

```powershell
foreach ($case in 0..2) {
  node build/game-wasm64/sim_probe.cjs --ragdoll-poses "--ragdoll-case=$case"
}
```

Each `[RAGDOLL-POSE]` JSON line contains the case, public relative/world ticks,
bone palette, collider bounds and measured linear/angular speeds at kill,
60 ticks, 300 ticks and physical sleep. Cases use public shooting, aiming,
movement and jumping with seeds 7, 131 and 557. Case zero retains the unassisted
combat regression; the two art fixtures publicly heal the player to isolate
corpse physics from combat survival. Five actual capsule hits are still needed
to complete every case. Bind/skin/rig/contact hashes identify the exact source
data, including coverage radii that can change without altering the skin.

The CPU engine uses rigid centres, unit quaternions, capsule inertia and exact
eight-influence DQS contact gradients. Its fixed 60Hz tick has eight substeps
and six projection passes; sleep requires speed below 0.04m/s and angular speed
below 0.08rad/s for 60 consecutive ticks. Detailed mesh contact coverage is a
bounded source-derived approximation, checked against actual skinned geometry.
The engine does not copy or traverse the full rendered mesh every frame.
