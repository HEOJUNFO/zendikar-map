// 소리 미리듣기 — 게임의 소리를 브라우저 없이 섞어 WAV 여섯으로 적는다. 사람이 열어 듣는 용도다 (tests/game.test.mjs 가 돌려 소리가 났는지와 크기만 본다).
// 게임이 쓰는 것 그대로다: 묻힌 샘플 뱅크와 곡, 믹서·시퀀서, 세계(시뮬레이션), game::Sound. 출력 통로와 재생 시계만 없다 — 틱 하나를 800 표본(48 kHz)으로 곧게 놓는다.
//   사용: node audio_preview.cjs <out 폴더>
//   music_layers.wav — 음악의 흐름 한 바퀴, 40 마디(107 초). 게임이 쓰는 game::MusicFlow 에 전투의 흐름을 손으로 넣는다 (마디 번호는 0 부터):
//                      0 맥박 + calm(베이스의 긴 음과 팀파니) → 4 첫 전투(크래시, calm 이 roam 으로 바뀌고 combat 과 주선율 lead) → 8 + x2 → 12 + x3 → 16 + x4 (네 마디씩 쌓인다)
//                      → 20 방을 비웠다: 크래시, 두 마디는 그대로(절정) → 22 x4 꺼짐 → 23 x3 꺼짐 → 24 combat 꺼짐 → 25 lead 가 hum 으로: 이동 반주(맥박 + roam + x2 + hum)
//                      → 32 다음 전투: 크래시, 배수 4 가 남아 있어 combat·x3·x4 가 한꺼번에, hum 이 lead 로 → 36 맞았다(배수 1): 마디마다 x4 · x3 · x2 가 꺼져 39 는 맥박 + roam + combat + lead
//                      곡은 열여섯 마디 고리라 구간마다 곡의 다른 자리가 들린다 (0…4 가 A 구간의 앞, 8…16 이 B 구간 — 코러스)
//   melody.wav       — 주 리프만 듣는다, 32 마디(85 초): 맥박 + roam(베이스) 위에 lead(기타의 옥타브 유니즌) 열여섯 마디 한 바퀴, 이어서 이동 중의 hum(울리게 둔 파워코드) 열여섯 마디
//   full.wav         — 다 켠 곡(배수 4 의 전투 — hum 과 calm 을 뺀 일곱 층) 열여섯 마디 한 바퀴와 다음 바퀴의 첫 두 마디, 18 마디(48 초). 가장 두꺼운 소리의 크기와 한꺼번에 울리는 보이스 수를 찍는다
//   effects.wav      — 효과음 한 벌을 samples.txt 의 gain 그대로, 반 초 간격으로 차례로 (긴 것은 다 울린 뒤에 다음 것). 차례는 EFFECTS 의 차례
//   gun.wav          — 총만, 음악 없이: 발사 세 발(0.7 초 간격 — 샘플은 하나, 발마다 높이·크기가 조금 다르다: game::shot_voice) → 반박(0.33 초)마다 여섯 발(게임에서 가장 빠른 연사) → 탄창 빼기 → 끼우기와 슬라이드(게임과 같은 간격) → 빈 방아쇠 → 미스(박을 놓쳐 안 나간 누름 — 빈 방아쇠와 견주어 듣는다) 두 번
//   phase1.wav       — 게임 한 판의 처음 스물네 마디(64 초): 첫 마디는 맥박과 베이스뿐. 둘째 마디에 반박마다 여덟 발, 빈 탄창의 방아쇠 한 번(딸깍), 재장전 두 단계.
//                      셋째 마디부터 북쪽 포털로 걸어가(발소리, 포털) 첫 전투방에 들어서면(석판 닫힘, 다음 마디 머리부터 크래시와 roam·combat 층) 서서 적을 겨눠 반박마다 쏜다
//                      (박에 맞은 행동 열 번마다 배수의 층이 얹힌다. 예고·돌진·투사체 소리가 나고 맞기도 한다 — 맞으면 배수의 층이 마디마다 하나씩 꺼진다).
//                      방을 비우면(석판 열림, 다음 마디 머리의 크래시) 네 마디를 서서 듣고(절정 두 마디, 그 뒤 마디마다 한 층씩) 북쪽 포털로 걸어가 둘째 전투방에서 다시 싸우고, 비운 뒤 끝까지 서서 듣는다.
//                      언제 무슨 일이 있었는지(문 잠김·방 비움·피격의 마디, 층이 바뀐 마디)는 돌릴 때 찍힌다
// 구간마다 피크와 RMS(dBFS), 눌린 표본(±0.8 을 넘어 믹서가 부드럽게 누른 것)의 비율을 찍는다 — 넘치지 않는지와 층끼리의 크기를 숫자로 본다.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "engine/audio/bank.hpp"
#include "engine/audio/mixer.hpp"
#include "engine/audio/sequencer.hpp"
#include "gameplay/content/assets.hpp"
#include "gameplay/content/room_meshes.hpp"
#include "gameplay/presentation/menu.hpp"
#include "gameplay/presentation/motion.hpp"
#include "gameplay/presentation/sound.hpp"
#include "gameplay/simulation/world.hpp"

namespace {

constexpr uint32_t RATE = 48000;
constexpr uint32_t TICK_FRAMES = RATE / game::TICK_RATE;
constexpr uint32_t BAR = 4 * game::TICKS_PER_BEAT;
constexpr uint32_t BAR_FRAMES = BAR * TICK_FRAMES;

void put16(std::FILE* file, uint32_t value) { std::fputc(static_cast<int>(value & 255), file), std::fputc(static_cast<int>(value >> 8 & 255), file); }
void put32(std::FILE* file, uint32_t value) { put16(file, value & 0xffff), put16(file, value >> 16); }

/** WAV — 16 비트 스테레오 */
bool write_wav(const std::string& path, const std::vector<float>& out) {
  std::FILE* file = std::fopen(path.c_str(), "wb");
  if (!file) {
    std::printf("FAIL: %s 를 열지 못했다\n", path.c_str());
    return false;
  }
  const uint32_t bytes = static_cast<uint32_t>(out.size()) * 2;
  std::fputs("RIFF", file), put32(file, 36 + bytes), std::fputs("WAVEfmt ", file), put32(file, 16), put16(file, 1), put16(file, 2);
  put32(file, RATE), put32(file, RATE * 4), put16(file, 4), put16(file, 16), std::fputs("data", file), put32(file, bytes);
  for (const float value : out) put16(file, static_cast<uint16_t>(static_cast<int16_t>(std::lround(std::fmax(-1.0f, std::fmin(1.0f, value)) * 32767.0f))));
  std::fclose(file);
  return true;
}

/** out 의 [from, to) 표본 구간의 크기를 한 줄로 찍는다 */
void report(const char* file, const char* part, const std::vector<float>& out, std::size_t from, std::size_t to) {
  double sum = 0.0;
  float peak = 0.0f;
  std::size_t pressed = 0;
  for (std::size_t i = from * 2; i < to * 2 && i < out.size(); i++) {
    peak = std::max(peak, std::fabs(out[i]));
    sum += static_cast<double>(out[i]) * out[i];
    pressed += std::fabs(out[i]) > 0.8f;
  }
  const double count = static_cast<double>((to - from) * 2);
  std::printf("audio_preview: %s %-10s 피크 %6.1f dBFS · RMS %6.1f dBFS · 눌린 표본 %.3f %%\n", file, part, 20.0 * std::log10(std::max(peak, 1e-9f)), 10.0 * std::log10(std::max(sum / count, 1e-18)),
              100.0 * static_cast<double>(pressed) / count);
}

constexpr const char* LAYERS[game::MUSIC_LAYERS] = {"pulse", "calm", "roam", "combat", "x2", "x3", "x4", "lead", "hum"};

/** 켜진 층들의 이름 — "pulse roam x2" */
std::string layer_names(uint32_t on) {
  std::string names;
  for (std::size_t layer = 0; layer < game::MUSIC_LAYERS; layer++)
    if (on >> layer & 1) names += std::string(names.empty() ? "" : " ") + LAYERS[layer];
  return names;
}

/**
 * 곡의 마디 bar 를 out 의 그 자리에 낸다 — 게임처럼 짧은 블록(틱 하나)마다 음을 걸고 섞는다.
 * 한 마디를 한꺼번에 걸면 아직 시작하지 않은 음까지 믹서의 보이스(48)를 차지해, 음이 많은 마디에서는 서로 뺏긴다
 */
void render_bar(engine::audio::Mixer& mixer, engine::audio::Sequencer& sequencer, std::vector<float>& out, uint32_t bar) {
  for (uint32_t tick = bar * BAR; tick < (bar + 1) * BAR; tick++) {
    sequencer.run(mixer, static_cast<uint64_t>(tick) * TICK_FRAMES, TICK_FRAMES);
    mixer.render(std::span{out}.subspan(static_cast<std::size_t>(tick) * TICK_FRAMES * 2, static_cast<std::size_t>(TICK_FRAMES) * 2));
  }
}

/** 음악의 흐름 한 바퀴 — 쌓이고, 방을 비우고(절정), 내려가 이동하고, 다음 전투에서 한꺼번에 돌아오고, 맞아서 내려간다 */
std::vector<float> music_layers(const engine::audio::Bank& bank, const engine::audio::Song& song) {
  enum class Event : uint8_t { none, locked, cleared };
  struct Part {
    const char* name;
    uint32_t bars;
    game::MusicScene scene;
    // 이 구간의 첫 마디 바로 앞(앞 마디)에서 일어난 일
    Event event{Event::none};
  };
  static constexpr Part PARTS[] = {{"calm", 4, {false, false, 1}},        {"combat", 4, {true, false, 1}, Event::locked}, {"x2", 4, {true, false, 2}},
                                   {"x3", 4, {true, false, 3}},           {"x4", 4, {true, false, 4}},                    {"climax", 2, {false, true, 4}, Event::cleared},
                                   {"winddown", 4, {false, true, 4}},     {"roam", 6, {false, true, 4}},                  {"again", 4, {true, true, 4}, Event::locked},
                                   {"hurt", 4, {true, true, 1}}};
  engine::audio::Mixer mixer(bank, RATE);
  engine::audio::Sequencer sequencer(song, RATE, game::BUS_MUSIC);
  game::MusicFlow flow;
  uint32_t bars = 0;
  for (const Part& part : PARTS) bars += part.bars;
  std::vector<float> out(static_cast<std::size_t>(bars) * BAR_FRAMES * 2);
  sequencer.locate(0, 0);
  uint32_t bar = 0, was_on = 0;
  for (const Part& part : PARTS) {
    for (uint32_t i = 0; i < part.bars; i++, bar++) {
      if (i == 0 && part.event != Event::none) {
        if (part.event == Event::locked) flow.locked();
        else flow.cleared(bar - 1);
        // 그 일 뒤 첫 마디 머리의 크래시 (게임에서는 Sound 가 건다 — sound.cpp 의 CRASH_GAIN·CRASH_PAN)
        if (const auto crash = bank.find("crash")) mixer.play({.sample = *crash, .bus = game::BUS_MUSIC, .gain = 0.8f, .pan = -0.3f});
      }
      // 층은 마디 머리에서 바뀐다 — 그 마디를 내기 바로 앞에 켜 달라고 하면 그 머리부터다 (MusicFlow 의 마디 번호가 곧 그 마디다)
      const uint32_t on = flow.follow(bar, part.scene);
      if (on != was_on) std::printf("audio_preview: music_layers.wav 마디 %2u: %s\n", bar, layer_names(on).c_str());
      was_on = on;
      for (std::size_t layer = 0; layer < game::MUSIC_LAYERS; layer++)
        if (const auto index = song.layer(LAYERS[layer])) sequencer.set_layer(*index, on >> layer & 1);
      render_bar(mixer, sequencer, out, bar);
    }
    report("music_layers.wav", part.name, out, static_cast<std::size_t>(bar - part.bars) * BAR_FRAMES, static_cast<std::size_t>(bar) * BAR_FRAMES);
  }
  return out;
}

/** 주선율만 — 맥박 + roam(베이스·사이드 스틱·셰이커) 위에 lead 열여섯 마디 한 바퀴, 이어서 hum(이동 중의 파워코드) 한 바퀴. 다른 기타 층 없이 리프를 듣는다 */
std::vector<float> melody(const engine::audio::Bank& bank, const engine::audio::Song& song) {
  constexpr uint32_t BARS = 32;
  engine::audio::Mixer mixer(bank, RATE);
  engine::audio::Sequencer sequencer(song, RATE, game::BUS_MUSIC);
  std::vector<float> out(static_cast<std::size_t>(BARS) * BAR_FRAMES * 2);
  sequencer.locate(0, 0);
  for (uint32_t bar = 0; bar < BARS; bar++) {
    for (const char* name : {"pulse", "roam", bar < 16 ? "lead" : "hum"})
      if (const auto index = song.layer(name)) sequencer.set_layer(*index, true);
    if (bar == 16)
      if (const auto index = song.layer("lead")) sequencer.set_layer(*index, false);
    render_bar(mixer, sequencer, out, bar);
  }
  report("melody.wav", "lead", out, 0, static_cast<std::size_t>(16) * BAR_FRAMES);
  report("melody.wav", "hum", out, static_cast<std::size_t>(16) * BAR_FRAMES, static_cast<std::size_t>(BARS) * BAR_FRAMES);
  return out;
}

/** 다 켠 곡 — 배수 4 의 전투: 맥박 + roam + combat + lead + x2 + x3 + x4. 열여섯 마디 한 바퀴와 다음 바퀴의 첫 두 마디 */
std::vector<float> full(const engine::audio::Bank& bank, const engine::audio::Song& song) {
  constexpr uint32_t BARS = 18;
  engine::audio::Mixer mixer(bank, RATE);
  engine::audio::Sequencer sequencer(song, RATE, game::BUS_MUSIC);
  std::vector<float> out(static_cast<std::size_t>(BARS) * BAR_FRAMES * 2);
  for (const char* name : {"pulse", "roam", "combat", "lead", "x2", "x3", "x4"})
    if (const auto index = song.layer(name)) sequencer.set_layer(*index, true);
  sequencer.locate(0, 0);
  // 한꺼번에 울리는 소리의 수 — 틱마다 (믹서의 보이스는 48 이다: 효과음의 몫이 남아야 한다)
  uint32_t most = 0;
  uint64_t sum = 0;
  for (uint32_t tick = 0; tick < BARS * BAR; tick++) {
    sequencer.run(mixer, static_cast<uint64_t>(tick) * TICK_FRAMES, TICK_FRAMES);
    // 그 틱의 음을 건 바로 뒤가 가장 많다 (끊기는 음과 새 음이 4 ms 겹친다)
    most = std::max(most, mixer.voices());
    sum += mixer.voices();
    mixer.render(std::span{out}.subspan(static_cast<std::size_t>(tick) * TICK_FRAMES * 2, static_cast<std::size_t>(TICK_FRAMES) * 2));
  }
  report("full.wav", "A 구간", out, 0, static_cast<std::size_t>(8) * BAR_FRAMES);
  report("full.wav", "B 구간", out, static_cast<std::size_t>(8) * BAR_FRAMES, static_cast<std::size_t>(16) * BAR_FRAMES);
  std::printf("audio_preview: full.wav 보이스 가장 많을 때 %u · 평균 %.1f (믹서의 보이스 %u)\n", most, static_cast<double>(sum) / (BARS * BAR), engine::audio::VOICES);
  // 음악만으로 믹서가 다 차면 효과음이 음악의 소리를 뺏는다
  if (most >= engine::audio::VOICES) std::printf("FAIL: full.wav 의 보이스가 믹서의 보이스 수에 닿았다\n");
  return out;
}

/** 효과음 한 벌 */
std::vector<float> effects(const engine::audio::Bank& bank) {
  static constexpr const char* EFFECTS[] = {"shot",       "dry",    "magazine_out", "magazine_in", "slide",     "dash",       "jump",        "land",         "step_l1", "step_r1",
                                            "step_l2",    "step_r2",   "step_l3",      "step_r3", "hit",         "kill_stone",  "kill_glass", "hurt",      "windup_stone", "charge",      "windup_cast",
                                            "bolt",       "bolt_wall", "gate_close",   "gate_open", "portal_open", "portal_enter", "ui_move",   "ui_press"};
  engine::audio::Mixer mixer(bank, RATE);
  std::vector<float> out;
  for (const char* name : EFFECTS) {
    const auto index = bank.find(name);
    if (!index) {
      std::printf("FAIL: 뱅크에 %s 가 없다\n", name);
      continue;
    }
    const engine::audio::Sample& sample = bank.samples()[*index];
    // 그 소리의 길이(반 초보다 짧으면 반 초) 뒤에 다음 소리
    const std::size_t frames = std::max<std::size_t>(sample.frames.size() * RATE / sample.rate + RATE / 10, RATE / 2);
    const std::size_t from = out.size();
    out.resize(from + frames * 2);
    mixer.play({.sample = *index, .bus = game::BUS_EFFECTS});
    mixer.render(std::span{out}.subspan(from));
    report("effects.wav", name, out, from / 2, from / 2 + frames);
  }
  return out;
}

/** 총소리만 — 게임과 같은 크기(samples.txt 의 gain), 같은 간격으로 */
std::vector<float> gun(const engine::audio::Bank& bank) {
  struct Cue {
    const char* name;
    // 앞의 소리에서 이만큼 뒤에 (틱)
    uint32_t after;
  };
  // 슬라이드는 끼운 뒤 4 틱째 (sound.cpp 의 SLIDE_DELAY_TICKS)
  static constexpr Cue CUES[] = {{"shot", 20}, {"shot", 42}, {"shot", 42}, {"shot", 60}, {"shot", 20}, {"shot", 20}, {"shot", 20}, {"shot", 20}, {"shot", 20}, {"magazine_out", 60}, {"magazine_in", 40}, {"slide", 4}, {"dry", 60}, {"miss", 60}, {"miss", 40}};
  engine::audio::Mixer mixer(bank, RATE);
  uint32_t ticks = 60;
  for (const Cue& cue : CUES) ticks += cue.after;
  std::vector<float> out(static_cast<std::size_t>(ticks) * TICK_FRAMES * 2);
  uint32_t at = 0;
  // 발사는 게임처럼 발마다 다른 높이·크기로 — 일 번호 대신 여기서의 차례
  uint64_t shots = 0;
  for (const Cue& cue : CUES) {
    at += cue.after;
    // 미스는 제 샘플이 없다 — 게임처럼 뛰는 소리의 샘플을 낮고 크게 (sound.hpp 의 MISS_PITCH·MISS_GAIN)
    const bool miss = std::string_view{cue.name} == "miss";
    const game::ShotVoice voice = std::string_view{cue.name} == "shot" ? game::shot_voice(shots++) : miss ? game::ShotVoice{game::MISS_PITCH, game::MISS_GAIN} : game::ShotVoice{1.0f, 1.0f};
    if (const auto index = bank.find(miss ? "jump" : cue.name)) mixer.play({.sample = *index, .bus = game::BUS_EFFECTS, .pitch = voice.pitch, .gain = voice.gain, .delay = at * TICK_FRAMES});
    else std::printf("FAIL: 뱅크에 %s 가 없다\n", cue.name);
  }
  mixer.render(out);
  report("gun.wav", "세 발", out, 0, static_cast<std::size_t>(164) * TICK_FRAMES);
  report("gun.wav", "연사", out, static_cast<std::size_t>(164) * TICK_FRAMES, static_cast<std::size_t>(284) * TICK_FRAMES);
  report("gun.wav", "재장전", out, static_cast<std::size_t>(284) * TICK_FRAMES, out.size() / 2);
  return out;
}

/** 게임 한 판의 처음 스물네 마디 — 전투, 방 비움, 이동, 다음 전투 */
std::vector<float> first_bars(const engine::audio::Bank& bank, const engine::audio::Song& song, const game::RoomKit& kit) {
  constexpr uint32_t TICKS = 24 * BAR;
  // 방을 비운 뒤 서서 듣는 마디 수 — 절정 두 마디와 내려가는 두 마디
  constexpr uint64_t LISTEN_BARS = 4;
  // 소리 흐름은 독립된 평평한 방에서 재현한다. 실제 다층 방의 동선은 sim_probe가 검증한다.
  // 시작 방에서 북쪽으로 전투방 셋이 한 줄로. 셋째 방까지는 가지 않는다: 층이 끝나면 세계가 멈춘다.
  static const std::vector<engine::Aabb> preview_floor = [] {
    std::vector<engine::Aabb> blocks{{{-16.7f, -1.0f, -16.7f}, {16.7f, 0.0f, 16.7f}}};
    for (const game::Direction side : {game::NORTH, game::EAST, game::SOUTH, game::WEST}) {
      blocks.push_back(game::turned(engine::Aabb{{-16.7f, 0, -16.7f}, {-2, 8, -15.7f}}, side));
      blocks.push_back(game::turned(engine::Aabb{{2, 0, -16.7f}, {16.7f, 8, -15.7f}}, side));
    }
    return blocks;
  }();
  const game::RoomKit preview_kit{.rooms = {preview_floor, preview_floor, preview_floor, preview_floor, preview_floor, preview_floor},
                                  .nav = {}, .sealed = kit.sealed, .gate = kit.gate};
  game::World world(game::Floor{{{.x = 0, .z = 0, .doors = 1u << game::NORTH, .shape = 0, .turn = 0, .depth = 0, .chargers = 0, .casters = 0},
                                 {.x = 0, .z = -1, .doors = 1u << game::SOUTH | 1u << game::NORTH, .shape = 1, .turn = 0, .depth = 1, .chargers = 2, .casters = 2},
                                 {.x = 0, .z = -2, .doors = 1u << game::SOUTH | 1u << game::NORTH, .shape = 1, .turn = 0, .depth = 2, .chargers = 4, .casters = 3},
                                 {.x = 0, .z = -3, .doors = 1u << game::SOUTH, .shape = 1, .turn = 0, .depth = 3, .chargers = 1, .casters = 0}}},
                    preview_kit);
  game::Sound sound(bank, song, RATE);
  game::Motion motion;
  sound.set_volume(game::Options{});
  sound.restart(world);
  motion.reset(world);
  sound.start_music(0, world.tick());

  std::vector<float> out(static_cast<std::size_t>(TICKS) * TICK_FRAMES * 2);
  uint64_t seen = world.event_count();
  uint32_t locks = 0, clears = 0, was_on = 0;
  std::optional<uint64_t> cleared_tick;
  for (uint32_t tick = 0; tick < TICKS; tick++) {
    const uint64_t now = world.tick();
    const bool slot = now % game::TICKS_PER_SLOT == 0;
    // 일어난 일의 때를 마디로 찍는다 (마디.박 — 둘 다 0 부터)
    for (; seen < world.event_count(); seen++) {
      const game::WorldEvent event = *world.event(seen);
      const char* what = event.kind == game::WorldEvent::Kind::locked ? "문 잠김" : event.kind == game::WorldEvent::Kind::opened ? "방 비움" : event.kind == game::WorldEvent::Kind::hurt ? "피격" : nullptr;
      if (!what) continue;
      locks += event.kind == game::WorldEvent::Kind::locked;
      clears += event.kind == game::WorldEvent::Kind::opened;
      if (event.kind == game::WorldEvent::Kind::opened) cleared_tick = event.tick;
      std::printf("audio_preview: phase1.wav 마디 %2llu.%llu: %s (연속 %u)\n", static_cast<unsigned long long>(event.tick / BAR), static_cast<unsigned long long>(event.tick % BAR / game::TICKS_PER_BEAT), what,
                  world.streak());
    }
    if (now >= BAR && now < 2 * BAR) {
      // 둘째 마디 — 반박마다 한 발 (여덟 발이면 탄창이 빈다)
      if (slot) world.act(game::Action::fire);
    } else if (now == 2 * BAR + 10) {
      // 빈 탄창에서 당긴 방아쇠
      world.act(game::Action::fire);
    } else if (now == 2 * BAR + 40 || now == 2 * BAR + 60) {
      // 탄창 빼기, 끼우기
      world.act(game::Action::reload);
    } else if (now == 2 * BAR + 80) {
      world.move(1.0f, 0.0f);
    } else if (world.locked() && !world.in_transit()) {
      world.move(0.0f, 0.0f);
      if (slot) {
        // 반박마다 — 탄이 떨어졌으면 갈아 끼우고(R 두 번), 아니면 첫 적의 몸 가운데를 겨눠 쏜다
        const game::Enemy& enemy = world.enemies()[0];
        const engine::Aabb box = game::enemy_box(enemy);
        const engine::Vec3 to = (box.min + box.max) * 0.5f - world.player().position;
        world.look(std::atan2(to.x, -to.z) - world.player().yaw, std::atan2(to.y, std::sqrt(to.x * to.x + to.z * to.z)) - world.player().pitch);
        world.act(world.pistol().ammo == 0 || world.pistol().reload_stage ? game::Action::reload : game::Action::fire);
      }
    } else if (cleared_tick && !world.in_transit()) {
      // 방을 비운 뒤 — 서서 탄창을 갈며 듣다가, 북쪽 문의 축(x 0) 위로 가서 포털로 곧게 걷는다. 둘째 방을 비운 뒤에는 끝까지 서서 듣는다
      const bool listening = clears > 1 || now < (*cleared_tick / BAR + 1 + LISTEN_BARS) * BAR;
      if (slot && listening && (world.pistol().ammo < 8 || world.pistol().reload_stage)) world.act(game::Action::reload);
      const engine::Vec3 from = world.player().position;
      const engine::Vec3 to{0.0f, 0.0f, std::fabs(from.x) < 0.5f ? -17.0f : from.z - 0.5f};
      world.look(std::atan2(to.x - from.x, -(to.z - from.z)) - world.player().yaw, -world.player().pitch);
      world.move(listening ? 0.0f : 1.0f, 0.0f);
    }
    sound.follow(world);
    if (sound.music_on() != was_on) {
      // 켜 달라고 한 때 — 들리는 것은 다음 마디 머리부터다
      was_on = sound.music_on();
      std::printf("audio_preview: phase1.wav 마디 %2llu.%llu: 층 %s\n", static_cast<unsigned long long>(now / BAR), static_cast<unsigned long long>(now % BAR / game::TICKS_PER_BEAT), layer_names(was_on).c_str());
    }
    sound.render(std::span{out}.subspan(static_cast<std::size_t>(tick) * TICK_FRAMES * 2, static_cast<std::size_t>(TICK_FRAMES) * 2), static_cast<uint64_t>(tick) * TICK_FRAMES);
    world.step();
    // 조립 지점이 하는 것과 같다 — 걷는 발이 닿으면 발소리를 건다
    motion.step(world);
    if (const auto foot = motion.footfall()) sound.cue(*foot == game::Foot::left ? game::Cue::step_left : game::Cue::step_right);
  }
  report("phase1.wav", "24 마디", out, 0, out.size() / 2);
  std::printf("audio_preview: phase1.wav 일어난 일 %llu 개, 체력 %d, 문 잠김 %u 번 · 방 비움 %u 번\n", static_cast<unsigned long long>(world.event_count()), world.player().health, locks, clears);
  // 들려주려는 흐름(전투 → 방 비움 → 이동 → 다음 전투)이 이 길이 안에 다 들어야 한다
  if (locks < 2 || clears < 1 || world.outcome() != game::World::Outcome::playing) std::printf("FAIL: phase1.wav 가 둘째 전투까지 가지 못했다\n");
  return out;
}

}  // namespace

int main(int argc, char** argv) {
  if (argc != 2) {
    std::printf("usage: audio_preview <out dir>\n");
    return 2;
  }
  const auto rooms = game::RoomMeshes::decode();
  const auto bank = engine::audio::Bank::decode(game::assets::sample_bank());
  const auto song = bank ? engine::audio::Song::decode(game::assets::pulse_song(), static_cast<uint32_t>(bank->samples().size())) : std::nullopt;
  if (!rooms || !bank || !song) {
    std::printf("FAIL: 묻힌 방 메시나 소리 에셋이 풀리지 않는다\n");
    return 1;
  }
  const std::string folder = argv[1];
  const bool ok = write_wav(folder + "/music_layers.wav", music_layers(*bank, *song)) && write_wav(folder + "/melody.wav", melody(*bank, *song)) && write_wav(folder + "/full.wav", full(*bank, *song)) && write_wav(folder + "/effects.wav", effects(*bank)) && write_wav(folder + "/gun.wav", gun(*bank)) &&
                  write_wav(folder + "/phase1.wav", first_bars(*bank, *song, rooms->kit()));
  return ok ? 0 : 1;
}
