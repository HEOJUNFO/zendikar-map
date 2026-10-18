# Act 1 creature runtime

Five ZEN/Tazeem creatures: River Boa, Living Tsunami, Timbermaw Larva, Sky Ruin Drake, Roil Elemental. Official creature and regional references are resolved from the project's phase1 map data and campaign contract. Official card illustrations are reference material and are not packed as these game textures.

The input concepts were generated and visually reviewed for this project. Five meshes and the boa/drake source armatures were generated through the user's own Tripo Studio account using the explicitly approved workflows. The paid boa march source failed contact review and remains preserved locally; it is not the shipped move clip.

Editable source armatures, custom nonhumanoid rigs, skin corrections, Actions and the boa contact IK are in `game/art-work/act1/rigging/` locally. The original `control-rig.blend` remains editable; the runtime consumes `ground-rig.blend`, which bakes evaluated constraints and solves actual DQS skin/plane contacts with fixed roots. Reproducible preparation and verification tools are in `game/tools/art/`. These staging binary assets follow the user's policy of not uploading art-work assets.

ZKMD preserves source triangle geometry and UVs. ZKSK contains normalized eight-influence skin weights. ZKAN contains 60Hz rigid skin palettes baked from actual DCC bone matrices, with impact/recovery markers and locomotion stride. Normal/roughness/metallic inputs are packed into the engine's PBR layers. The per-species hierarchy, inverse bind and hashes are in `.rig` / `models.json`.

The runtime uses real skinning; this is not a statement that the art meets AAA motion quality. Current contact/intersection/physics limits are recorded in `docs/game-animation-quality.md`.
