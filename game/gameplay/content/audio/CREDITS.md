# 소리 출처

`samples/` 의 소리는 CC0 1.0 (퍼블릭 도메인 기증) 또는 CC BY (저작자 표시)로 공개된 원본에서 잘라 온 것이다. CC0 는 출처 표기가 의무가 아니지만 파일마다 적어 둔다.
**CC BY 인 것은 발사음 하나다 (`shot.wav` — Michel Baradari, CC BY 3.0). 이 소리를 쓰는 배포물에는 아래 그 절의 표기(제목·만든 사람·출처·라이선스·변경함)를 함께 실어야 한다.**
`samples.txt` 에 실린 파일이 여기 `` `파일.wav` `` 로 적혀 있지 않으면 `game/tools/samplec.mjs` 가 빌드를 멈춘다.

드럼과 `hurt`·`hit` 의 손질 (2026-10-09, 한 번 하는 일 — 빌드는 여기의 WAV 만 읽는다. 그 밖의 효과음은 아래 '두 번째 손질'):

1. `ffmpeg -i <원본> -ac 1 -ar 44100 -c:a pcm_s16le <이름>.wav` (ffmpeg 9.0.2) — 한 채널(스테레오는 두 채널의 평균), 44.1 kHz, 16 비트로.
2. 아래 표의 구간만 남긴다. 구간의 시작은 "찾기 시작" 뒤 2 초 안에서 가장 큰 값의 5 % 를 처음 넘는 표본의 1 ms 앞이다.
3. 구간의 끝을 표의 길이만큼 곧게 0 으로 줄인다.

빌드 때 `samplec.mjs` 가 앞뒤의 무음(-60 dB 아래)을 더 자르고 끝 5 ms 를 줄여 QOA 로 눌러 담는다.

## Big Rusty Drums — Karoryfer Samples

- 받은 곳: https://github.com/sfzinstruments/karoryfer.big-rusty-drums
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`)
- 원본 형식: FLAC 44.1 kHz 16 비트 모노 (가까운 마이크)

| 파일 | 원본 (`Samples/` 아래) | 찾기 시작 | 남긴 길이 | 끝 줄이기 |
|---|---|---|---|---|
| `kick_a.wav` | `kick_24/kick/kick/k_vl14_rr1.flac` | 0 초 | 0.45 초 | 0.1 초 |
| `kick_b.wav` | `kick_24/kick/kick/k_vl14_rr2.flac` | 0 초 | 0.45 초 | 0.1 초 |
| `snare_a.wav` | `snare_14/center/top/sn_center_vl10_rr1.flac` | 0 초 | 0.5 초 | 0.12 초 |
| `snare_b.wav` | `snare_14/center/top/sn_center_vl10_rr2.flac` | 0 초 | 0.5 초 | 0.12 초 |
| `hat_closed_a.wav` | `hihat_14/cl/cl/ht_cl_vl5_rr1.flac` | 0 초 | 0.35 초 | 0.1 초 |
| `hat_closed_b.wav` | `hihat_14/cl/cl/ht_cl_vl5_rr2.flac` | 0 초 | 0.35 초 | 0.1 초 |
| `hat_open.wav` | `hihat_14/open/cl/ht_open_vl5_rr1.flac` | 0 초 | 1.2 초 | 0.3 초 |
| `crash.wav` | `crash_17/cr/cl/cr_vl5_rr1.flac` | 0 초 | 3.5 초 | 1.5 초 |

## Growlybass — Karoryfer Samples

- 받은 곳: https://github.com/sfzinstruments/karoryfer.growlybass
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`)
- 원본 형식: WAV 44.1 kHz 24 비트 모노 — 핑거 베이스의 긴 음(`sustain/`, 6 초)
- 손질: 아래 '두 번째 손질'과 같다 (피크 맞춤). 시작은 가장 큰 값의 5 % 를 처음 넘는 표본의 1 ms 앞, 2.0 초를 남기고 끝 0.5 초를 줄였다
- **파일 이름의 음은 실제보다 한 옥타브 높게 적혀 있다** (`e2` 가 실제로는 E1). 자기상관으로 기본 주파수를 재서 `samples.txt` 의 `root`(실제 음)와 `tune`(센트)을 적었다.
  E1 의 센 테이크(`e2_ff`)는 어택에서 60 센트, 평균 35 센트 높아(42.0 Hz — E1 은 41.2 Hz) 덜 높은 여린 테이크(`e2_f`)를 썼다

| 파일 | 원본 (`sustain/` 아래) | 잰 기본 주파수 (0.2–1.2 초) | `root` · `tune` |
|---|---|---|---|
| `bass_e1_a.wav` · `bass_e1_b.wav` | `e2_f_rr1.wav` · `e2_f_rr2.wav` | 41.8 Hz (E1 + 26 센트, 뒤로 갈수록 +17 까지 내려온다) | e1 · +23 |
| `bass_fs1.wav` | `gb2_ff_rr1.wav` | 46.5 Hz (F#1 + 9) | f#1 · +9 |
| `bass_a1_a.wav` · `bass_a1_b.wav` | `a2_ff_rr1.wav` · `a2_ff_rr2.wav` | 55.1 Hz · 55.0 Hz (A1 + 2 · 0) | a1 · 0 |
| `bass_c2.wav` | `c3_ff_rr1.wav` | 65.5 Hz (C2 + 3) | c2 · 0 |
| `bass_eb2.wav` | `eb3_ff_rr1.wav` | 78.1 Hz (Eb2 + 8) | eb2 · +8 |

## FSBS dist2 (Free Sampled Bass & guitar Sounds — 디스토션 기타) — FreePats

- 받은 곳: https://github.com/freepats/electric-guitar-FSBS-dist2 (FreePats — http://freepats.zenvoid.org/ . 받은 것의 목록과 라이선스 확인은 저장소 밖의 `game/audio-src/INVENTORY.md`)
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`)
- 원본 형식: FLAC 48 kHz 24 비트 스테레오 — 브리지 픽업의 디스토션 단음(`samples/bridge/`, 7–36 초). 파일 이름의 음은 실제 음 그대로다
- 손질: 피크 맞춤 (두 채널을 평균해 한 채널로). 시작은 가장 큰 값의 5 % 를 처음 넘는 표본의 1 ms 앞, 리듬 기타는 2.2 초(끝 0.5 초 줄임), 리드는 1.5 초(끝 0.4 초 줄임)
- 파워코드 녹음은 없다 — 악보가 근음과 5 도의 단음 둘을 겹쳐 만든다. `_01`·`_02` 는 같은 음의 다른 테이크라 좌우에 나눠 쓴다 (더블 트래킹)
- 짧게 끊는 리프(뮤트 기타 자리)도 이 샘플을 한 칸 길이로 끊어 쓴다. 받아 둔 클린 스타카토(Black And Green)에 왜곡을 입혀 굽는 길은 쓰지 않았다 — 들어 볼 수 없어 음색을 판단할 수 없었다

| 파일 | 원본 (`samples/bridge/` 아래) | 잰 기본 주파수 | `root` · `tune` |
|---|---|---|---|
| `gtr_e2_a.wav` · `gtr_e2_b.wav` | `E2_s1_01.flac` · `E2_s1_02.flac` | 82.9 · 83.1 Hz (E2 + 10 · + 15) | e2 · +10 |
| `gtr_f2_a.wav` · `gtr_f2_b.wav` | `F2_s1_01.flac` · `F2_s1_02.flac` | 87.7 Hz (F2 + 8) | f2 · +8 |
| `gtr_a2_a.wav` · `gtr_a2_b.wav` | `A2_s2_01.flac` · `A2_s2_02.flac` | 110.6 · 110.5 Hz (A2 + 10 · + 8) | a2 · +9 |
| `gtr_c3_a.wav` · `gtr_c3_b.wav` | `C3_s2_01.flac` · `C3_s2_02.flac` | 131.1 · 131.4 Hz (C3 + 4 · + 7) | c3 · +5 |
| `gtr_d3_a.wav` · `gtr_d3_b.wav` | `D3_s3_01.flac` · `D3_s3_02.flac` | 146.9 · 147.1 Hz (D3 + 0 · + 3) | d3 · 0 |
| `gtr_g3_a.wav` · `gtr_g3_b.wav` | `G3_s4_01.flac` · `G3_s4_02.flac` | 195.5 · 196.5 Hz (G3 − 4 · + 4) | g3 · 0 |

## 음악을 다시 쓰며 더 넣은 샘플 (2026-10-09) — 손질

아래 절들의 "세 번째 손질"은 모두 같다 (ffmpeg 9.0.2 로 풀고 파이썬 numpy 로 다듬었다 — 한 번 하는 일, 빌드는 여기의 WAV 만 읽는다):

1. `ffmpeg -i <원본> -ac 1 -ar 44100 -f f32le` 로 한 채널(스테레오는 두 채널의 평균) 44.1 kHz 로 푼다.
2. 시작은 앞 2 초에서 가장 큰 값의 5 % 를 처음 넘는 표본의 1 ms 앞 (바이올린 합주는 30 % — 활이 천천히 들어와 5 % 로는 0.1–0.4 초 늦게 들린다). 거기서 표의 길이만 남긴다.
3. 앞 2 ms(바이올린 합주는 30 ms)와 끝의 "끝 줄이기" 길이를 곧게 0 으로 줄이고, 피크를 −1 dBFS 로 맞춘다 (소리끼리의 크기는 `samples.txt` 의 gain).
4. 음높이가 있는 것은 기본 주파수를 잰다 — 정규화한 차이 함수(YIN)의 첫 골을 샘플의 15–60 % 자리 다섯 창에서 구한 가운데 값. 그 값이 `samples.txt` 의 `root`(실제 음)와 `tune`(센트)이다.

**소리는 아무도 들어 보지 않고 골랐다** — 원본의 이름(악기·주법·세기 단)과 잰 값(길이, 어택, 기본 주파수, 스펙트럼)만 보았다. 사용자 결정(2026-10-09): 배포하지 않으므로 무료로 로그인 없이 받을 수 있는 것은 라이선스로 거르지 않는다 — 그래도 이번에 넣은 것은 모두 CC0 다.

## Big Rusty Drums — 더 넣은 북과 심벌 (Karoryfer Samples)

- 받은 곳: https://github.com/sfzinstruments/karoryfer.big-rusty-drums
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`. 2026-10-09 확인)
- 원본 형식: FLAC 44.1 kHz 16 비트 모노 (가까운 마이크). `vl<n>` 이 세기 단, `rr<n>` 이 라운드로빈
- 손질: 세 번째 손질

| 파일 | 원본 (`Samples/` 아래) | 남긴 길이 | 끝 줄이기 | 잰 값 (가장 큰 100 ms 의 RMS · 스펙트럼 중심) |
|---|---|---|---|---|
| `kick_c.wav` | `kick_24/kick/kick/k_vl14_rr3.flac` | 0.45 초 | 0.1 초 | -13.1 dBFS · 620 Hz |
| `kick_d.wav` | `kick_24/kick/kick/k_vl14_rr4.flac` | 0.45 초 | 0.1 초 | -13.0 dBFS · 587 Hz |
| `snare_c.wav` | `snare_14/center/top/sn_center_vl10_rr3.flac` | 0.5 초 | 0.12 초 | -18.1 dBFS · 1856 Hz |
| `snare_d.wav` | `snare_14/center/top/sn_center_vl10_rr4.flac` | 0.5 초 | 0.12 초 | -18.6 dBFS · 1901 Hz |
| `snare_soft_a.wav` | `snare_14/center/top/sn_center_vl6_rr1.flac` | 0.4 초 | 0.12 초 | -16.1 dBFS · 2025 Hz |
| `snare_soft_b.wav` | `snare_14/center/top/sn_center_vl6_rr2.flac` | 0.4 초 | 0.12 초 | -16.7 dBFS · 2002 Hz |
| `stick_a.wav` | `snare_14/sidestick/top/sn_ss_vl4_rr1.flac` | 0.3 초 | 0.08 초 | -17.4 dBFS · 2409 Hz |
| `stick_b.wav` | `snare_14/sidestick/top/sn_ss_vl4_rr2.flac` | 0.3 초 | 0.08 초 | -17.1 dBFS · 2713 Hz |
| `tom_hi_a.wav` | `tom_14/center/cl/t14_vl6_rr1.flac` | 1 초 | 0.35 초 | -11.9 dBFS · 937 Hz |
| `tom_hi_b.wav` | `tom_14/center/cl/t14_vl6_rr2.flac` | 1 초 | 0.35 초 | -12.3 dBFS · 898 Hz |
| `tom_mid_a.wav` | `tom_15/center/cl/t15_vl7_rr1.flac` | 1 초 | 0.35 초 | -11.4 dBFS · 797 Hz |
| `tom_mid_b.wav` | `tom_15/center/cl/t15_vl7_rr2.flac` | 1 초 | 0.35 초 | -12.9 dBFS · 757 Hz |
| `tom_low_a.wav` | `tom_18/center/cl/t18_vl8_rr1.flac` | 1 초 | 0.35 초 | -12.2 dBFS · 789 Hz |
| `tom_low_b.wav` | `tom_18/center/cl/t18_vl8_rr2.flac` | 1 초 | 0.35 초 | -12.2 dBFS · 738 Hz |
| `ride_a.wav` | `ride_22/rd/cl/rd_vl8_rr1.flac` | 1.2 초 | 0.5 초 | -14.5 dBFS · 7332 Hz |
| `ride_b.wav` | `ride_22/rd/cl/rd_vl8_rr2.flac` | 1.2 초 | 0.5 초 | -13.2 dBFS · 7911 Hz |
| `ride_bell_a.wav` | `ride_22/bl/cl/rd_bl_vl4_rr1.flac` | 1.2 초 | 0.5 초 | -17.6 dBFS · 7126 Hz |
| `ride_bell_b.wav` | `ride_22/bl/cl/rd_bl_vl4_rr2.flac` | 1.2 초 | 0.5 초 | -16.5 dBFS · 7325 Hz |
| `crash_b.wav` | `crash_17/cr/cl/cr_vl5_rr2.flac` | 3.5 초 | 1.5 초 | -11.6 dBFS · 7355 Hz |

## VCSL (Versilian Community Sample Library) — Versilian Studios (Sam Gossner 외)

- 받은 곳: https://github.com/sgossner/VCSL (낱개 파일을 `raw.githubusercontent.com` 으로)
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`. 2026-10-09 확인)
- 원본 형식: WAV 44.1 kHz 16·24 비트 스테레오
- 손질: 세 번째 손질. `swell.wav` 만 다르다 — 가장 큰 곳(원본 1.195 초)이 시작에서 꼭 70 틱(1.1667 초) 뒤에 오게 0.028 초부터 남기고 앞 0.3 초를 올렸다: 마디의 90 틱 자리에서 걸면 다음 마디 머리에서 터진다
- **튜블러 벨의 파일 이름은 실제보다 한 옥타브 낮게 적혀 있다** (`E3` 의 타격음이 E4)
- 스네어(`snare_crack_*` — Snare Drum, Modern 1 의 스네어 줄을 건 타격 `HitSN`)는 전투의 백비트다. 피크를 맞춘 첫 100 ms 에서 1.5–7 kHz 가 −25 dB 로, 록 킷(Big Rusty)의 스네어(−32.5 dB)보다 7 dB 밝다 — 기타와 심벌 위로 반박이 들리게 한다
- 튜블러 벨은 부분음이 배음이 아니다 — 기본 주파수를 재는 대신 스펙트럼의 봉우리를 보았다: 2 : 3 : 4 로 놓인 봉우리 묶음(관의 넷째·다섯째·여섯째 부분음)의 첫째가 타격음의 한 옥타브 위다. `root`·`tune` 은 그 봉우리 ÷ 2
- 팀파니는 북마다 음이 정해져 있다 (같은 북을 다른 음으로 조율한 녹음이 아니다). 가장 낮은 봉우리(기음)와 그 1.5 배·2 배의 봉우리가 보인다 — `root`·`tune` 은 기음. 넷째 북(169.6 Hz — E3 과 F3 의 한가운데)은 쓰지 않았다

| 파일 | 원본 | 남긴 구간 | 끝 줄이기 | 잰 값 · `root` · `tune` |
|---|---|---|---|---|
| `splash.wav` | `Idiophones/Struck Idiophones/Suspended Cymbal 1/susCymb1_hit_stick_f1.wav` | 0 초부터 1.6 초 | 0.6 초 | RMS -20.4 dBFS, 어택 5.4 ms, 중심 7903 Hz |
| `cymbal.wav` | `Idiophones/Struck Idiophones/Suspended Cymbal 1/susCymb1_hit_fff1.wav` | 0.013 초부터 3 초 | 1.2 초 | RMS -13.2 dBFS, 어택 17.9 ms, 중심 4259 Hz |
| `swell.wav` | `Idiophones/Struck Idiophones/Suspended Cymbal 1/susCymb1_cresc_2s.wav` | 0.028 초부터 2.367 초 | 0.6 초 | RMS -12.4 dBFS, 어택 913.2 ms, 중심 3226 Hz |
| `tamb_a.wav` | `Idiophones/Struck Idiophones/Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav` | 0.01 초부터 0.5 초 | 0.15 초 | RMS -13.7 dBFS, 어택 3.2 ms, 중심 10505 Hz |
| `tamb_b.wav` | `Idiophones/Struck Idiophones/Tambourine 1/Tamb1_Hit_v1_rr1_Mid.wav` | 0.011 초부터 0.5 초 | 0.15 초 | RMS -11.5 dBFS, 어택 9.3 ms, 중심 10019 Hz |
| `shaker_down.wav` | `Idiophones/Struck Idiophones/Shaker, Small/Mid_ShakerHighFaster_Down_rr1.wav` | 0 초부터 0.179 초 | 0.05 초 | RMS -16.1 dBFS, 어택 43.8 ms, 중심 12017 Hz |
| `shaker_up.wav` | `Idiophones/Struck Idiophones/Shaker, Small/Mid_ShakerHighFaster_Up_rr1.wav` | 0.001 초부터 0.181 초 | 0.05 초 | RMS -19.8 dBFS, 어택 15.8 ms, 중심 12950 Hz |
| `clap_a.wav` | `Idiophones/Struck Idiophones/Claps/Clap_rr1.wav` | 0 초부터 0.5 초 | 0.15 초 | RMS -19.1 dBFS, 어택 2.6 ms, 중심 5755 Hz |
| `clap_b.wav` | `Idiophones/Struck Idiophones/Claps/Clap_rr2.wav` | 0 초부터 0.5 초 | 0.15 초 | RMS -18.6 dBFS, 어택 6.6 ms, 중심 5595 Hz |
| `timp_fs2.wav` | `Membranophones/Struck Membranophones/Timpani 1/Hit/Timpani1_Hit_v4_rr1_Sum.wav` | 0 초부터 2 초 | 0.7 초 | 기음 90.2 Hz (138.6 · 184.4 Hz 가 1.54 · 2.04 배) — f#2 · −43 |
| `timp_b2.wav` | `Membranophones/Struck Membranophones/Timpani 1/Hit/Timpani2_Hit_v4_rr1_Sum.wav` | 0 초부터 2 초 | 0.7 초 | 기음 122.5 Hz (180.3 · 242.2 Hz) — b2 · −14 |
| `timp_d3.wav` | `Membranophones/Struck Membranophones/Timpani 1/Hit/Timpani3_Hit_v4_rr1_Sum.wav` | 0 초부터 2 초 | 0.7 초 | 기음 143.3 Hz (211.3 · 277.2 Hz) — d3 · −42 |
| `snare_crack_a.wav` | `Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v9_rr1_Mid.wav` | 0.008 초부터 0.4 초 | 0.12 초 | RMS -13.2 dBFS, 어택 7.8 ms, 중심 3036 Hz |
| `snare_crack_b.wav` | `Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v9_rr2_Mid.wav` | 0.008 초부터 0.4 초 | 0.12 초 | RMS -13.4 dBFS, 어택 4.9 ms, 중심 2983 Hz |
| `snare_crack_c.wav` | `Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v7_rr1_Mid.wav` | 0.008 초부터 0.4 초 | 0.12 초 | RMS -13.6 dBFS, 어택 7.9 ms, 중심 3262 Hz |
| `snare_crack_d.wav` | `Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v7_rr2_Mid.wav` | 0.008 초부터 0.4 초 | 0.12 초 | RMS -13.2 dBFS, 어택 5.0 ms, 중심 3409 Hz |
| `bell_c4.wav` | `Idiophones/Struck Idiophones/Tubular Bells 1/chimes_C3_f_rr1.wav` | 0 초부터 2.6 초 | 0.9 초 | 524.2 Hz ÷ 2 = 262.1 Hz — c4 · +3 |
| `bell_e4.wav` | `Idiophones/Struck Idiophones/Tubular Bells 1/chimes_E3_ff_rr2.wav` | 0 초부터 2.6 초 | 0.9 초 | 660.8 Hz ÷ 2 = 330.4 Hz — e4 · +4 |
| `bell_gs4.wav` | `Idiophones/Struck Idiophones/Tubular Bells 1/chimes_G#3_ff_rr1.wav` | 0 초부터 2.6 초 | 0.9 초 | 833.1 Hz ÷ 2 = 416.5 Hz — g#4 · +5 |
| `bell_c5.wav` | `Idiophones/Struck Idiophones/Tubular Bells 1/chimes_C4_ff_rr2.wav` | 0 초부터 2.6 초 | 0.9 초 | 1050.4 Hz ÷ 2 = 525.2 Hz — c5 · +6 |
| `bell_e5.wav` | `Idiophones/Struck Idiophones/Tubular Bells 1/chimes_E4_ff_rr2.wav` | 0 초부터 2.6 초 | 0.9 초 | 1327.0 Hz ÷ 2 = 663.5 Hz — e5 · +11 |

## VSCO 2 Community Edition — Versilian Studios (Sam Gossner)

- 받은 곳: https://github.com/sgossner/VSCO-2-CE
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`. 2026-10-09 확인)
- 원본 형식: WAV 44.1 kHz 스테레오 — 첼로 합주·바이올린 합주의 비브라토 긴 음(9–15 초), 바이올린 합주의 스피카토(0.6–1.4 초 — 시작은 가장 큰 값의 30 % 를 넘는 곳, 앞 5 ms 올림), 트럼펫의 스타카토
- 손질: 세 번째 손질
- **파일 이름의 음은 실제보다 한 옥타브 낮게 적혀 있다** (첼로 `C1` 이 65.4 Hz = C2, 바이올린 `A3` 이 440 Hz = A4)
- 긴 음은 음높이가 고르다 (0.1–2.5 초의 여섯 창이 가운데 값에서 ±5 센트 안)

| 파일 | 원본 | 남긴 구간 | 끝 줄이기 | 잰 기본 주파수 · `root` · `tune` | 어택(피크의 반까지) |
|---|---|---|---|---|---|
| `cello_c2.wav` | `Strings/Cello Section/susvib/susvib_C1_v3_1.wav` | 0.003 초부터 3.3 초 | 0.35 초 | 65.4 Hz — c2 · +0 | 160 ms |
| `cello_e2.wav` | `Strings/Cello Section/susvib/susvib_E1_v3_1.wav` | 0.012 초부터 3.3 초 | 0.35 초 | 82.24 Hz — e2 · -3 | 50.3 ms |
| `cello_g2.wav` | `Strings/Cello Section/susvib/susvib_G1_v3_1.wav` | 0.012 초부터 3.3 초 | 0.35 초 | 97.99 Hz — g2 · +0 | 31.9 ms |
| `cello_b2.wav` | `Strings/Cello Section/susvib/susvib_B1_v3_1.wav` | 0.003 초부터 3.3 초 | 0.35 초 | 123.44 Hz — b2 · +0 | 46.5 ms |
| `cello_d3.wav` | `Strings/Cello Section/susvib/susvib_D2_v3_1.wav` | 0.004 초부터 3.3 초 | 0.35 초 | 146.85 Hz — d3 · +0 | 53 ms |
| `violins_fs4.wav` | `Strings/Violin Section/susVib/VlnEns_susVib_F#3_v2.wav` | 0.467 초부터 3.3 초 | 0.35 초 | 370.2 Hz — f#4 · +1 | 309.5 ms |
| `violins_c5.wav` | `Strings/Violin Section/susVib/VlnEns_susVib_C4_v2.wav` | 0.067 초부터 3.3 초 | 0.35 초 | 522.3 Hz — c5 · -3 | 38 ms |
| `violins_e5.wav` | `Strings/Violin Section/susVib/VlnEns_susVib_E4_v2.wav` | 0.214 초부터 3.3 초 | 0.35 초 | 658.6 Hz — e5 · -2 | 253.4 ms |
| `spic_fs4_a.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_F#3_v2_rr1.wav` | 0.078 초부터 0.5 초 | 0.15 초 | 370.23 Hz — f#4 · +1 | 32.6 ms |
| `spic_fs4_b.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_F#3_v2_rr2.wav` | 0.059 초부터 0.5 초 | 0.15 초 | 368.97 Hz — f#4 · -5 | 36 ms |
| `spic_a4_a.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_A3_v2_rr1.wav` | 0.084 초부터 0.5 초 | 0.15 초 | 439.74 Hz — a4 · -1 | 35.6 ms |
| `spic_a4_b.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_A3_v2_rr2.wav` | 0.06 초부터 0.5 초 | 0.15 초 | 441.34 Hz — a4 · +5 | 14.7 ms |
| `spic_c5_a.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_C4_v2_rr1.wav` | 0.061 초부터 0.5 초 | 0.15 초 | 523.15 Hz — c5 · +0 | 23.3 ms |
| `spic_c5_b.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_C4_v2_rr2.wav` | 0.08 초부터 0.5 초 | 0.15 초 | 524.78 Hz — c5 · +5 | 20.8 ms |
| `spic_e5_a.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_E4_v2_rr1.wav` | 0.044 초부터 0.5 초 | 0.15 초 | 658.73 Hz — e5 · -1 | 14.7 ms |
| `spic_e5_b.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_E4_v2_rr2.wav` | 0.065 초부터 0.5 초 | 0.15 초 | 659.08 Hz — e5 · +0 | 13.2 ms |
| `spic_g5_a.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_G4_v2_rr1.wav` | 0.033 초부터 0.5 초 | 0.15 초 | 784.23 Hz — g5 · +1 | 51.5 ms |
| `spic_g5_b.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_G4_v2_rr2.wav` | 0.05 초부터 0.5 초 | 0.15 초 | 783.19 Hz — g5 · -2 | 25.2 ms |
| `spic_b5_a.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_B4_v2_rr1.wav` | 0.111 초부터 0.5 초 | 0.15 초 | 987.59 Hz — b5 · +0 | 8.5 ms |
| `spic_b5_b.wav` | `Strings/Violin Section/Spic/VlnEns_Spic_B4_v2_rr2.wav` | 0.041 초부터 0.5 초 | 0.15 초 | 990.79 Hz — b5 · +5 | 15 ms |
| `trumpet_bb4.wav` | `Brass/Trumpet/stac/Sum_SHTrumpet_stac_A#3_v3_rr1.wav` | 0 초부터 0.9 초 | 0.15 초 | 466.43 Hz — bb4 · +1 | 11.6 ms |
| `trumpet_d5.wav` | `Brass/Trumpet/stac/Sum_SHTrumpet_stac_D4_v3_rr1.wav` | 0.001 초부터 0.9 초 | 0.15 초 | 588.98 Hz — d5 · +5 | 27.9 ms |
| `trumpet_f5.wav` | `Brass/Trumpet/stac/Sum_SHTrumpet_stac_F4_v3_rr1.wav` | 0 초부터 0.9 초 | 0.15 초 | 699.77 Hz — f5 · +3 | 14.5 ms |

## Legato Vocal Tutorial (Hadzi-Fia 의 모음 "a") — Karoryfer Samples

- 받은 곳: https://github.com/sfzinstruments/legato_vocal_tutorial (`Samples/vowel_sustain/a/`)
- 라이선스: CC0 1.0 Universal (저장소의 `LICENSE`. 2026-10-09 확인)
- 원본 형식: WAV 모노, 5.9–7.5 초 — 남자 목소리 한 사람의 긴 "아"
- 손질: 세 번째 손질
- **파일 이름의 음은 실제보다 한 옥타브 높게 적혀 있다** (readme: "This instrument is 8va") — `a4` 가 213.9 Hz = A3. 녹음이 20–48 센트 낮아 `tune` 으로 되돌린다. 음높이는 0.5–2.5 초에서 ±15 센트 안에 머문다 (첫 0.1 초는 30 센트까지 높다)
- `vowel_a_c3.wav`(C#2 근처)는 음높이가 창마다 크게 달라 쓰지 않았다

| 파일 | 원본 (`Samples/vowel_sustain/a/` 아래) | 남긴 구간 | 끝 줄이기 | 잰 기본 주파수 · `root` · `tune` |
|---|---|---|---|---|
| `voice_c3.wav` | `vowel_a_c4.wav` | 0.005 초부터 3.3 초 | 0.35 초 | 129.25 Hz — c3 · -21 |
| `voice_eb3.wav` | `vowel_a_eb4.wav` | 0.012 초부터 3.3 초 | 0.35 초 | 151.68 Hz — eb3 · -44 |
| `voice_fs3.wav` | `vowel_a_gb4.wav` | 0.005 초부터 3.3 초 | 0.35 초 | 179.96 Hz — f#3 · -48 |
| `voice_a3.wav` | `vowel_a_a4.wav` | 0.006 초부터 3.3 초 | 0.35 초 | 213.93 Hz — a3 · -48 |

## Growlybass · FSBS dist2 — 더 넣은 음

- 받은 곳·라이선스는 위의 두 절과 같다 (Growlybass: https://github.com/sfzinstruments/karoryfer.growlybass , FSBS dist2: https://github.com/freepats/electric-guitar-FSBS-dist2 — 둘 다 CC0 1.0. 2026-10-09 확인)
- 손질: 세 번째 손질 (베이스 2.0 초·끝 0.5 초, 리듬 기타 2.2 초·끝 0.5 초, 리드 1.8 초·끝 0.4 초)
- 리드의 높은 음(G4…A#5)은 이번에 저장소에서 더 받았다 (`game/audio-src/fsbs-dist2/samples/bridge/`). `_01`·`_03` 이 a·c(주선율 — 같은 음이 이어질 때 번갈아 쓴다), `_02` 가 b(화음 줄). 베이스의 `_b` 는 같은 음의 둘째 테이크(`rr2`)

| 파일 | 원본 | 잰 기본 주파수 | `root` · `tune` |
|---|---|---|---|
| `bass_fs2.wav` | `sustain/gb3_ff_rr1.wav` | 92.49 Hz | f#2 · +0 |
| `bass_a2.wav` | `sustain/a3_ff_rr1.wav` | 110.46 Hz | a2 · +7 |
| `bass_fs1_b.wav` | `sustain/gb2_ff_rr2.wav` | 46.36 Hz | f#1 · +4 |
| `bass_c2_b.wav` | `sustain/c3_ff_rr2.wav` | 65.37 Hz | c2 · -1 |
| `bass_eb2_b.wav` | `sustain/eb3_ff_rr2.wav` | 77.88 Hz | eb2 · +2 |
| `bass_fs2_b.wav` | `sustain/gb3_ff_rr2.wav` | 92.51 Hz | f#2 · +0 |
| `bass_a2_b.wav` | `sustain/a3_ff_rr2.wav` | 110.1 Hz | a2 · +1 |
| `gtr_e3_a.wav` | `E3_s3_01.flac` | 165.32 Hz | e3 · +5 |
| `gtr_e3_b.wav` | `E3_s3_02.flac` | 165.41 Hz | e3 · +6 |
| `lead_e4_b.wav` | `E4_s6_02.flac` | 329.27 Hz | e4 · -2 |
| `lead_g4_b.wav` | `G4_s6_02.flac` | 392.16 Hz | g4 · +1 |
| `lead_b4_a.wav` | `B4_s6_01.flac` | 494.06 Hz | b4 · +1 |
| `lead_b4_b.wav` | `B4_s6_02.flac` | 494.12 Hz | b4 · +1 |
| `lead_d5_a.wav` | `D5_s6_01.flac` | 588.58 Hz | d5 · +4 |
| `lead_d5_b.wav` | `D5_s6_02.flac` | 588.6 Hz | d5 · +4 |
| `lead_f5_a.wav` | `F5_s6_01.flac` | 699.37 Hz | f5 · +2 |
| `lead_gs5_a.wav` | `G#5_s6_01.flac` | 830.47 Hz | g#5 · +0 |
| `lead_bb5_a.wav` | `A#5_s6_01.flac` | 934.09 Hz | bb5 · +3 |
| `lead_b4_c.wav` | `B4_s6_03.flac` | 494.14 Hz | b4 · +1 |
| `lead_d5_c.wav` | `D5_s6_03.flac` | 588.61 Hz | d5 · +4 |
| `lead_f5_c.wav` | `F5_s6_03.flac` | 699.35 Hz | f5 · +2 |
| `lead_gs5_c.wav` | `G#5_s6_03.flac` | 830.34 Hz | g#5 · -1 |
| `lead_bb5_c.wav` | `A#5_s6_03.flac` | 933.55 Hz | bb5 · +2 |

## 2026-10-10 — 음악을 드럼·베이스·디스토션 기타만으로 다시 쓰며 바꾼 것

사용자 결정(2026-10-10): 현·관·벨·목소리와 높은 음역의 단음 선율(리드 기타 B4 이상)은 쓰지 않는다 — 격자에 찍힌 높은 단음이 칩튠처럼 들렸다.

- **뱅크에서 뺀 파일 46 개** (위 절들의 표에는 남아 있다 — 다시 넣을 때의 기록): `bell_*`(5) · `lead_*`(14) · `spic_*`(12) · `cello_*`(5) · `violins_*`(3) · `trumpet_*`(3) · `voice_*`(4).
  WAV 는 지우지 않고 저장소 밖의 `game/audio-src/unused-samples-2026-10-10/` 로 옮겼다. `lead_e4_b`·`lead_g4_b` 의 원본은 아래 `gtr_e4_b`·`gtr_g4_b` 로 다시 꺼냈다 (길이 2.2 초).
- **더 넣은 기타 10 개** — FSBS dist2 (https://github.com/freepats/electric-guitar-FSBS-dist2 , CC0 1.0 Universal — 저장소의 `LICENSE`, 2026-10-10 확인. 받아 둔 `game/audio-src/fsbs-dist2/samples/bridge/` 에서). 재배포할 수 있다.
  손질은 위의 세 번째 손질과 같다 (Node 로): 한 채널 44.1 kHz, 시작은 앞 2 초에서 가장 큰 값의 5 % 를 처음 넘는 표본의 1 ms 앞, 2.2 초, 앞 2 ms·끝 0.5 초 줄임, 피크 −1 dBFS. 기본 주파수는 YIN(15–60 % 자리 다섯 창의 가운데 값).
  같은 절차로 잰 `E4_s6_02`·`G4_s6_02` 가 앞서 잰 값(329.27 · 392.16 Hz)과 같다. gain 은 RMS × gain 이 다른 기타 샘플(−25 dBFS 언저리)과 같게.

| 파일 | 원본 (`samples/bridge/` 아래) | 잰 기본 주파수 | `root` · `tune` |
|---|---|---|---|
| `gtr_c2_a.wav` | `C2_s1_01.flac` | 66.18 Hz | c2 · +20 |
| `gtr_c2_b.wav` | `C2_s1_02.flac` | 65.96 Hz | c2 · +15 |
| `gtr_b3_a.wav` | `B3_s5_01.flac` | 246.88 Hz | b3 · +0 |
| `gtr_b3_b.wav` | `B3_s5_02.flac` | 246.88 Hz | b3 · +0 |
| `gtr_cs4_a.wav` | `C#4_s5_01.flac` | 276.87 Hz | c#4 · -2 |
| `gtr_cs4_b.wav` | `C#4_s5_02.flac` | 276.95 Hz | c#4 · -1 |
| `gtr_e4_a.wav` | `E4_s6_01.flac` | 329.39 Hz | e4 · -1 |
| `gtr_e4_b.wav` | `E4_s6_02.flac` | 329.27 Hz | e4 · -2 |
| `gtr_g4_a.wav` | `G4_s6_01.flac` | 392.02 Hz | g4 · +0 |
| `gtr_g4_b.wav` | `G4_s6_02.flac` | 392.16 Hz | g4 · +1 |


## 효과음 — 두 번째 손질 (아래 표에 "피크 맞춤"이라 적힌 것)

새로 넣은 효과음은 손질이 조금 다르다 (2026-10-09, ffmpeg 9.0.2 로 풀고 Node 로 다듬었다 — 한 번 하는 일):

1. `ffmpeg -ss <처음> -to <끝> -i <원본> -ac 1 -ar 44100 -f f32le` 로 표의 구간을 한 채널 44.1 kHz 로 푼다.
2. 앞 2 ms 와, 끝의 "끝 줄이기" 길이를 곧게 0 으로 줄인다.
3. 피크를 −1 dBFS 로 맞춘다 (원본마다 크기가 달라서 — 소리끼리의 크기는 `samples.txt` 의 gain 이 정한다).

**소리는 아무도 들어 보지 않고 골랐다.** 원본의 이름·올린이의 설명과, 파형에서 잰 값(길이, 무음 사이의 덩어리, 어택의 자리, 스펙트럼 중심 — 낮으면 묵직하고 높으면 날카롭다)만 보았다.
표의 "잰 값"이 그 근거다. 들어 보고 어색한 것은 파일을 바꾸거나(같은 이름으로 넣으면 된다) `samples.txt` 의 gain 을 고친다.

## Chaingun, pistol, rifle, shotgun shots — Michel Baradari (CC BY 3.0 — 출처 표기 의무)

- 제목: "Chaingun, pistol, rifle, shotgun shots"
- 만든 사람: Michel Baradari — apollo-music.de
- 받은 곳: https://opengameart.org/content/chaingun-pistol-rifle-shotgun-shots (파일 https://opengameart.org/sites/default/files/shots.7z , 638,532 바이트)
- 라이선스: **CC BY 3.0** — http://creativecommons.org/licenses/by/3.0/ (페이지의 License 칸 "CC-BY 3.0", 묶음 안의 `info.txt`: "Sounds (c) by Michel Baradari apollo-music.de / Licensed under CC BY 3.0". 2026-10-09 확인)
- 원본 형식: WAV 44.1 kHz 16 비트 스테레오. 게임용으로 만든 총소리 넷(`pistol`·`shotgun`·`rifle`·`cg1`) — 여기 쓴 것은 `pistol.wav`(0.99 초) 하나다
- **변경함** (원본 그대로가 아니다 — 2026-10-09, Node 로 한 번): ① 두 채널을 평균해 한 채널로 ② 앞 0.6 초만 남김 (원본은 첫 표본에서 바로 시작해 앞머리는 자르지 않았다) ③ 끝 0.2 초(0.4–0.6 초)를 곧게 0 으로 줄임 ④ 피크를 −1 dBFS 로 맞춤 (0.924 배).
  EQ·컴프레션·다른 소리 겹치기는 하지 않았다. 재생할 때 발마다 높이(±2.5 %)와 크기(±1 dB)를 조금 달리한다 (`presentation/sound.hpp` 의 `shot_voice`)
- 길이를 고른 근거 (20 ms 창의 RMS, 원본): 0 ms −4 dB, 100 ms −10, 200 ms −14, 300 ms −17, 400 ms −21, 500 ms −27, 600 ms −34, 700 ms −42. 반박(333 ms)마다 쏘면 앞 발이 −18 dB 로 남아 있을 때 다음 발이 선다 — 0.4 초까지는 그대로 두고 0.6 초에서 끝나게 줄여, 세 발째가 설 때(667 ms)는 첫 발이 남지 않는다
- QOA 로 누르지 않는다 (`samples.txt` 의 `pcm`) — 충격음을 뭉갠다 (재장전 소리와 빈 방아쇠도: 슬라이드는 QOA 에서 신호 대 오차가 7 dB 까지 떨어졌다)
- 이 소리로 바꾸기 전의 발사음 셋(`shot_a`·`shot_b`·`shot_c`)은 The Free Firearm Sound Library(CC0)의 야외 녹음을 겹치고 눌러 만든 임시였다 — 지웠다
- 같은 묶음의 `shotgun.wav`·`rifle.wav` 는 나중 무기용으로 `game/audio-src/weapon-sfx/baradari-shots/` 에만 두었다 (넣게 되면 여기에 같은 표기로 적는다)

| 파일 | 원본 | 남긴 구간 | 끝 줄이기 | 잰 값 |
|---|---|---|---|---|
| `shot.wav` | `shots/pistol.wav` | 0–0.6 초 | 0.2 초 | 가장 큰 100 ms 의 RMS −6.1 dBFS (피크 −1) — 몸통이 두껍다 |

## Handgun Reload Sound Effect — zer0_sol

- 받은 곳: https://opengameart.org/content/handgun-reload-sound-effect
- 라이선스: CC0 (OpenGameArt 페이지의 License 칸. 2026-10-09 확인)
- 원본 형식: `reload.wav` — WAV 44.1 kHz 16 비트 스테레오, 1.59 초. 올린이의 설명: "handgun magazine being dropped, new magazine inserted, and slide being racked"
- 고른 근거: 무음(−40 dB, 0.04 초) 사이의 덩어리가 꼭 셋(0.10–0.20, 0.58–0.79, 1.03–1.35 초)이고 설명의 차례와 맞는다. 한 녹음의 한 벌이라 음색이 같다
- 손질: 피크 맞춤. `samples.txt` 에서 `pcm`(누르지 않음)으로 담는다 — 밝고 큰 잡음이라 QOA 의 오차가 크다 (슬라이드: 신호 대 오차 7 dB)

| 파일 | 구간 | 끝 줄이기 | 잰 값 |
|---|---|---|---|
| `magazine_out.wav` | 0.085–0.24 초 (첫 덩어리 — 탄창이 빠짐) | 0.03 초 | 0.16 초, 중심 6.1 kHz |
| `magazine_in.wav` | 0.635–0.83 초 (둘째 덩어리 — 탄창을 끼움. 앞의 0.07 초(작은 긁힘)는 잘랐다: 가장 큰 딸깍이 박에서 0.12 초 늦게 들려 박자와 어긋났다 — 이제 0.05 초) | 0.04 초 (머리 0.002 초 올리기) | 0.20 초 |
| `slide.wav` | 1.015–1.39 초 (셋째 덩어리 — 슬라이드) | 0.04 초 | 0.38 초, 중심 9.6 kHz (셋 가운데 가장 크고 날카롭다) |

## Swishes Sound Pack · RPG Sound Pack — artisticdude

- 받은 곳: https://opengameart.org/content/swishes-sound-pack , https://opengameart.org/content/rpg-sound-pack
- 라이선스: CC0 (각 페이지의 License 칸. 2026-10-09 확인)
- 원본 형식: WAV 44.1·48 kHz 24 비트 스테레오
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 · 고른 근거 |
|---|---|---|---|
| `dash.wav` | Swishes `swish-9.wav` 통째 (0.20 초) | 0.02 초 | 13 개 가운데 가장 길고, 중심 330 Hz 로 낮은 쪽(굵은 휙) |
| `jump.wav` | RPG `inventory/cloth.wav` 0.015–0.32 초 | 0.05 초 | 옷 스침, 중심 850 Hz. 뛰어오르는 소리라고 적힌 원본이 없어 대신 쓴다 — 가장 작게 낸다 |
| `bolt.wav` | RPG `battle/magic1.wav` 0.025–0.65 초 | 0.08 초 | 한 덩어리, 어택 24 ms, 중심 1.6 kHz |

## Jump Landing Sound — MentalSanityOff

- 받은 곳: https://opengameart.org/content/jump-landing-sound (Freesound 148796 에서 옴)
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 |
|---|---|---|---|
| `land.wav` | `jumpland.wav` 0–0.33 초 | 0.05 초 | 한 덩어리, 피크가 82 ms 에, 중심 110 Hz (낮은 쿵) |

## Fantozzi's Footsteps (Grass/Sand & Stone) — Fantozzi

- 받은 곳: https://opengameart.org/content/fantozzis-footsteps-grasssand-stone
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 원본 형식: FLAC 44.1 kHz 16 비트 스테레오 — 돌바닥의 왼발 셋·오른발 셋
- 손질: 피크 맞춤, 통째로 (끝 0.03 초 줄임)

| 파일 | 원본 | 잰 값 |
|---|---|---|
| `step_l1.wav` · `step_l2.wav` · `step_l3.wav` | `Fantozzi-StoneL1.flac` · `L2` · `L3` | 0.33–0.37 초, 어택 3–9 ms, 중심 2.5–2.8 kHz |
| `step_r1.wav` · `step_r2.wav` · `step_r3.wav` | `Fantozzi-StoneR1.flac` · `R2` · `R3` | 0.32–0.36 초, 어택 5–16 ms, 중심 2.2–2.4 kHz |

## 75 CC0 breaking / falling / hit sfx — rubberduck

- 받은 곳: https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 원본 형식: OGG Vorbis 48 kHz 스테레오
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 · 고른 근거 |
|---|---|---|---|
| `kill_stone.wav` | `bfh1_rock_breaking_02.ogg` 0–0.82 초 | 0.05 초 | 돌 부서짐 셋 가운데 덩어리가 넷(0–0.10, 0.14–0.53, 0.62–0.80 초 …)으로 부스러기가 이어지는 것. 중심 4.3 kHz |
| `kill_glass.wav` | `bfh1_glass_breaking_06.ogg` 0–0.78 초 | 0.08 초 | 유리 깨짐 가운데 가장 빽빽한 것(RMS −18 dB), 어택 0 ms, 중심 7.2 kHz |

## Stone Door — bonebrah

- 받은 곳: https://opengameart.org/content/stone-door
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 손질: 피크 맞춤 (원본 피크가 −14 dB 로 작다)

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 · 고른 근거 |
|---|---|---|---|
| `windup_stone.wav` | `stone_door.ogg` 0.12–1.45 초, 앞 0.02 초도 줄임 | 0.1 초 | 한 덩어리 1.33 초 — 돌 정령의 예고(80 틱 = 1.33 초)와 길이가 같다. 중심 180 Hz (낮게 갈리는 소리) |

## Moving Boulder — themightyglider

- 받은 곳: https://opengameart.org/content/moving-boulder (Freesound 원본에서 파생)
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 |
|---|---|---|---|
| `charge.wav` | `move_boulder_0.ogg` 통째 (0.68 초) | 0.05 초 | 돌진(36 틱 = 0.6 초)과 길이가 비슷하다. 중심 190 Hz |
| `gate_close.wav` | `boulder_drop_0.ogg` 통째 (0.65 초) | 0.05 초 | 어택 6 ms, 중심 190 Hz (쿵) |

## Earthquake and Open sesame — mieki256

- 받은 곳: https://opengameart.org/content/earthquake-and-open-sesame
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 손질: 피크 맞춤. 두 원본을 겹쳤다

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 · 고른 근거 |
|---|---|---|---|
| `gate_open.wav` | `shake.flac` 0.75–1.27 초 (앞 0.03 초 줄임)에, 0.45 초 자리부터 Moving Boulder 의 `boulder_drop_0.ogg` 를 같은 크기로 겹침 | 0.08 초 | 석판이 내려가는 0.5 초(30 틱)의 낮은 울림(중심 170 Hz) 끝에 쿵. 1.1 초 |

## Electricity Game Sound Pack — faxcorp

- 받은 곳: https://opengameart.org/content/electricity-game-sound-pack
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 원본 형식: WAV 44.1 kHz 16 비트 스테레오
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 · 고른 근거 |
|---|---|---|---|
| `windup_cast.wav` | `powerup.wav` 0.04–0.71 초 | 0.06 초 | 0.67 초 — 헤드론 조각의 모으기(40 틱)와 길이가 같다. 0.3 초씩 재면 RMS 가 −19 → −10 → −23 dB 로 차올랐다 잦아든다 (0.47 초에 가장 크다). 음높이가 올라가는 소리는 아니다 |
| `portal_enter.wav` | `teleport_1.wav` 0–0.72 초 | 0.08 초 | 어택 2 ms, 중심 3.2 kHz |

## Impact — qubodup (Iwan Gabovitch)

- 받은 곳: https://opengameart.org/content/impact
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 |
|---|---|---|---|
| `bolt_wall.wav` | `qubodupImpactStone.flac` 0–0.25 초 | 0.05 초 | 소리가 0.21 초에 끝난다, 어택 0 ms, 중심 640 Hz |

## Teleport Spell — Ogrebane

- 받은 곳: https://opengameart.org/content/teleport-spell
- 라이선스: CC0 (페이지의 License 칸. 2026-10-09 확인)
- 손질: 피크 맞춤

| 파일 | 원본 · 구간 | 끝 줄이기 | 잰 값 |
|---|---|---|---|
| `portal_open.wav` | `teleport.wav` 0.03–1.47 초, 앞 0.02 초도 줄임 | 0.1 초 | 한 덩어리, 0.12 초에 걸쳐 올라와 0.67 초에 가장 크다. 중심 290 Hz (낮은 울림) |

## Kenney — Impact Sounds, UI Audio

- 받은 곳: https://kenney.nl/assets/impact-sounds , https://kenney.nl/assets/ui-audio
- 라이선스: Creative Commons Zero, CC0 (묶음마다의 `License.txt`)
- 원본 형식: OGG Vorbis 44.1 kHz

| 파일 | 원본 | 찾기 시작 | 남긴 길이 | 끝 줄이기 |
|---|---|---|---|---|
| `hurt.wav` | Impact Sounds `Audio/impactSoft_heavy_000.ogg` | 0 초 | 끝까지 (0.53 초) | 0.05 초 |
| `hit.wav` | Impact Sounds `Audio/impactMining_000.ogg` | 0 초 | 0.7 초 | 0.15 초 |
| `ui_move.wav` | UI Audio `Audio/rollover2.ogg` — 피크 맞춤 | 0 초 | 끝까지 (0.05 초) | 0.005 초 |
| `ui_press.wav` | UI Audio `Audio/click1.ogg` — 피크 맞춤 | 0 초 | 0.06 초 | 0.01 초 |

## Toy Double Barrel Shotgun Sounds — JumboSizedFish

- 받은 곳: https://opengameart.org/content/toy-double-barrel-shotgun-sounds
- 라이선스: CC0 (OpenGameArt 페이지의 License 칸 — 묶음 안에는 라이선스 파일이 없다. 2026-10-09 확인)
- 원본 형식: WAV 44.1 kHz 스테레오 (장난감 총의 방아쇠 녹음)
- 손질이 위와 다르다: `ffmpeg -af "silenceremove=start_periods=1:start_threshold=-45dB,afade=t=out:st=0.2:d=0.05,atrim=0:0.25"` 로 앞머리 무음을 자르고 0.25 초만 남겼다

| 파일 | 원본 | 찾기 시작 | 남긴 길이 | 끝 줄이기 |
|---|---|---|---|---|
| `dry.wav` | `toy-double-barrel-shotgun-left-trigger.wav` | 0 초 (−45 dB 를 처음 넘는 곳) | 0.25 초 | 0.05 초 |

## 넣지 않은 소리

- **층 완료·사망 스팅어**: 받아 둔 후보의 음을 재 보니(FFT 로 음이름마다의 세기) 곡의 조(E 단조 — E F# G A B C D)와 어긋난다. `fupi-win-jingle/winfretless_0.ogg` 는 F·B♭·D·C·G·E♭ 이 세고(B♭ 장조 쪽) E 단조에 없는 음이 셋이다.
  사망 후보(`springspring-various/death_2.wav` 는 G♯, `snd_death1.wav` 는 B·B♭, `faxcorp/powerdown.wav` 는 음이 고르게 퍼진 내려가는 소리)도 조에 맞는 것이 없다. 판이 끝나면 음악이 멎고 소리 없이 끝난 화면으로 간다.
- **탄피 떨어지는 소리**: 탄피 녹음을 찾지 못했다 (작은 금속 대용뿐) — 넣지 않았다.
- **방 도착**: 포털에 닿을 때의 소리(`portal_enter`)가 넘어가는 0.4 초를 덮는다 — 따로 두지 않았다.
