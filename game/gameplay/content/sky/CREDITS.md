# 하늘의 출처

`sky.hdr` 와 `sky.jpg` 는 **Poly Haven** (https://polyhaven.com) 의 HDRI 한 장에서 만든 사본이다.
라이선스는 **CC0 1.0** — https://polyhaven.com/license (2026-10-09 확인). 출처 표기는 의무가 아니지만 적어 둔다. 받은 원본과 md5 는 저장소 밖의 `game/art-src/INVENTORY.md` 에 있다.

| 파일 | 원본 (Poly Haven) | 만든 사람 | 손질 |
| --- | --- | --- | --- |
| `sky.hdr` | [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) — 2K .hdr (2048×1024, RGBE) | Greg Zaal, Jarod Guest | 256×128 로 줄임 (넓이 평균), 누르지 않은 RGBE 로 다시 적음 |
| `sky.jpg` | 같은 것 | 같다 | 원본 크기 그대로, `sky.txt` 의 배율과 장면의 노출·톤 곡선(`engine/render/wgsl/include/color.wgsl`)을 건 baseline JPEG (4:4:4, ffmpeg `-q:v 2`) |

손질은 `game/tools/art/prepare-sky.mjs` 가 한 번에 한다. 빌드는 `sky.hdr` 에서 해(방향·빛)와 하늘빛의 표를 뽑고(`game/tools/skyc.mjs`), `sky.jpg` 는 에셋 팩에 그대로 싣는다.
해의 높이(48 도)는 HDR 그대로이고, 방위는 `sky.txt` 의 `sun_azimuth` 에 맞춰 하늘을 돌려 쓴다.
