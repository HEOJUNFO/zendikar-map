# Old Lady

CDmir's **Old Lady**, with TinyWorlds credited as collaborator, was published for Kelgar on OpenGameArt under **CC0-1.0**:
https://opengameart.org/content/old-lady

Original direct download: https://opengameart.org/sites/default/files/oldlady-v2.blend
Retrieved 2026-10-11. Original SHA-256:
`02e6acd66a07cdc1fb452516c87e8399b6a4b393b0501050b1b120fcb19e9b27`

The unchanged Blender source includes the complete authored mesh, rig, **Sitting** action and packed 2048px diffuse/AO, normal and specular maps. It is an elderly woman with gray hair, a hunched posture and a long dress. No generated or assembled character geometry is used.

`game/tools/art/prepare-old-lady.py` exports four samples of the author's seated animation and derived collapse, resurrection and pursuit motions on the same skeleton. All 24 poses share the original UV seams and triangle topology. Collapse/resurrection endpoints match; exported feet remain above the floor. The source maps keep their 2048px resolution: skin/AO becomes sRGB JPEG; authored normal XY and specular-derived roughness become linear NAR JPEG.

The original `.blend` and `poses.json` are source evidence only. The runtime pack contains the two JPEGs and 24 indexed pose models (about 5.3 MiB total), drawn with interpolated poses and the engine's shared surface shading.
