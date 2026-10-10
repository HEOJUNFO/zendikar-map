#include "gameplay/presentation/sound.hpp"

#include <algorithm>
#include <cmath>

#include "gameplay/presentation/weapon.hpp"

namespace game {
namespace {

// ── 크기와 때 — 들어 가며 고칠 값 (샘플끼리의 크기는 content/audio/samples.txt 의 gain) ──
// 탄창을 끼운 뒤 슬라이드 소리가 나는 때 — 총의 슬라이드가 당겨지기 시작하는 틱 (weapon.hpp)
constexpr uint32_t SLIDE_DELAY_TICKS = RACK_START;
// 슬라이드 소리의 빠르기 — 조금 빨리 돌려 0.29 초에 끝낸다 (끼운 박에서 0.36 초 — 다음 반박을 넘겨 울리면 박자와 어긋나게 들린다)
constexpr float SLIDE_PITCH = 1.3f;
// 석판이 내려가기 시작한 뒤 포털이 번져 나오는 소리가 나는 때 (틱) — 석판이 반쯤 내려갔을 때
constexpr uint32_t PORTAL_DELAY_TICKS = 15;
// 내려설 때의 빠르기(초당 m)가 이만큼이면 착지음이 제 크기로 난다. 그보다 느리면 그만큼 작게, LAND_QUIET 밑으로는 내려가지 않는다
constexpr float LAND_FULL_SPEED = 8.0f;
constexpr float LAND_QUIET = 0.35f;
// 발소리 — 왼발은 조금 왼쪽, 오른발은 조금 오른쪽. 걸음마다 크기를 조금씩 달리한다 (같은 소리가 줄지어 들리지 않게)
constexpr float STEP_PAN = 0.15f;
constexpr float STEP_GAIN[] = {0.8f, 1.0f, 0.9f};
// 전투가 시작된 뒤, 방을 비운 뒤 첫 마디 머리의 크래시
constexpr float CRASH_GAIN = 0.8f;
constexpr float CRASH_PAN = -0.3f;

}  // namespace

Heard hear(const Player& listener, engine::Vec3 at) {
  const float dx = at.x - listener.position.x, dz = at.z - listener.position.z;
  const float distance = std::sqrt(dx * dx + dz * dz);
  // 보는 쪽의 오른쪽은 (cos yaw, sin yaw)
  return {distance > 0.0f ? PAN_WIDTH * (dx * std::cos(listener.yaw) + dz * std::sin(listener.yaw)) / distance : 0.0f, 1.0f / (1.0f + distance / HEAR_DISTANCE)};
}

ShotVoice shot_voice(uint64_t event) {
  // 번호를 고르게 섞은 32 비트 — 아래 16 비트가 높이, 위 16 비트가 크기
  uint32_t mixed = static_cast<uint32_t>(event) * 0x9E3779B1u;
  mixed ^= mixed >> 16;
  mixed *= 0x85EBCA6Bu;
  mixed ^= mixed >> 13;
  const float pitch = static_cast<float>(mixed & 0xffffu) / 32767.5f - 1.0f, gain = static_cast<float>(mixed >> 16) / 32767.5f - 1.0f;
  return {1.0f + SHOT_PITCH_SPREAD * pitch, std::pow(10.0f, SHOT_GAIN_SPREAD_DB * gain / 20.0f)};
}

MusicScene music_scene(const World& world) { return {.combat = world.locked(), .fought = world.rooms_cleared() > 0, .multiplier = multiplier(world.streak())}; }

uint32_t MusicFlow::follow(uint64_t deciding, const MusicScene& scene) {
  const uint32_t target = music_target(scene);
  if (!started_) {
    started_ = true;
    on_ = target;
  } else {
    // 내리기 — 넘어간 마디마다 바라지 않는 층 하나를 끈다, 위에서부터. 절정이 남은 마디는 건너뛴다
    for (uint64_t bar = deciding_ + 1; bar <= deciding; bar++) {
      if (bar < hold_) continue;
      for (const MusicLayer layer : {MusicLayer::x4, MusicLayer::x3, MusicLayer::combat, MusicLayer::lead, MusicLayer::x2}) {
        if (!(on_ & ~target & music_bit(layer))) continue;
        on_ &= ~music_bit(layer);
        break;
      }
    }
    // 오르기 — 모자란 층은 한꺼번에. 베이스는 하나라 calm 과 roam 은 그 자리에서 바뀐다
    const uint32_t bass = music_bit(MusicLayer::calm) | music_bit(MusicLayer::roam);
    on_ = ((on_ | target) & ~bass) | (target & bass);
    // 주선율도 하나다 — lead 가 아직 울리는 동안(절정, 내려가는 마디들)에는 hum 을 얹지 않는다. lead 가 꺼지는 마디에 들어온다
    if (on_ & music_bit(MusicLayer::lead)) on_ &= ~music_bit(MusicLayer::hum);
  }
  deciding_ = deciding;
  return on_;
}

// 소리가 없는 일: 방 도착(arrived), 층 완료(cleared), 죽음(dead) — 맞는 샘플이 없다 (받아 둔 스팅어는 곡의 조와 어긋난다 — content/audio/CREDITS.md)
Sound::Sound(const engine::audio::Bank& bank, const engine::audio::Song& song, uint32_t rate)
    : rate_(rate),
      mixer_(bank, rate),
      sequencer_(song, rate, BUS_MUSIC),
      bar_ticks_(song.bar_ticks),
      layers_{song.layer("pulse"), song.layer("calm"), song.layer("roam"), song.layer("combat"), song.layer("x2"), song.layer("x3"), song.layer("x4"), song.layer("lead"), song.layer("hum")},
      step_left_{bank.find("step_l1"), bank.find("step_l2"), bank.find("step_l3")},
      step_right_{bank.find("step_r1"), bank.find("step_r2"), bank.find("step_r3")},
      shot_(bank.find("shot")),
      magazine_out_(bank.find("magazine_out")),
      magazine_in_(bank.find("magazine_in")),
      slide_(bank.find("slide")),
      dry_(bank.find("dry")),
      hurt_(bank.find("hurt")),
      hit_(bank.find("hit")),
      kill_stone_(bank.find("kill_stone")),
      kill_glass_(bank.find("kill_glass")),
      dash_(bank.find("dash")),
      jump_(bank.find("jump")),
      land_(bank.find("land")),
      windup_stone_(bank.find("windup_stone")),
      windup_cast_(bank.find("windup_cast")),
      charge_(bank.find("charge")),
      bolt_(bank.find("bolt")),
      bolt_wall_(bank.find("bolt_wall")),
      gate_open_(bank.find("gate_open")),
      gate_close_(bank.find("gate_close")),
      portal_open_(bank.find("portal_open")),
      portal_enter_(bank.find("portal_enter")),
      ui_move_(bank.find("ui_move")),
      ui_press_(bank.find("ui_press")),
      crash_(bank.find("crash")) {
  // 맥박은 음악을 시작하자마자 울린다 (그 밖의 층은 follow 가 세계를 보고 켠다)
  if (const Sample pulse = layers_[static_cast<std::size_t>(MusicLayer::pulse)]) sequencer_.set_layer(*pulse, true);
}

void Sound::set_volume(const Options& options) {
  music_ = options.music;
  effects_ = options.effects;
  mixer_.set_gain(BUS_MUSIC, music_ * music_);
  mixer_.set_gain(BUS_EFFECTS, effects_ * effects_);
}

uint64_t Sound::unread(const World& world) const {
  const uint64_t at = std::min(cursor_, world.event_count());
  return world.event_count() - at > World::EVENT_CAPACITY ? world.event_count() - World::EVENT_CAPACITY : at;
}

void Sound::cue(Cue cue) {
  if (cue_count_ < CUES) cues_[cue_count_++] = cue;
}

std::vector<engine::audio::Play> Sound::plays(const World& world) const {
  std::vector<engine::audio::Play> out;
  // 같은 틱의 같은 소리를 하나로 줄이려고, 낸 소리마다 그 일의 틱을 적어 둔다
  std::vector<uint64_t> ticks;
  Turns turns = turns_;
  uint64_t tick = 0;
  const auto add = [&](Sample sample, Heard heard = {}, uint32_t delay_ticks = 0, float pitch = 1.0f) {
    if (!sample) return;
    const engine::audio::Play play{.sample = *sample, .bus = BUS_EFFECTS, .pitch = pitch, .gain = heard.gain, .pan = heard.pan, .delay = frames(delay_ticks)};
    for (std::size_t i = 0; i < out.size(); i++) {
      if (out[i].sample != play.sample || out[i].bus != play.bus || ticks[i] != tick) continue;
      // 같은 틱의 같은 소리 — 더 크게 들리는 쪽만 남긴다
      if (play.gain > out[i].gain) out[i] = play;
      return;
    }
    out.push_back(play);
    ticks.push_back(tick);
  };

  // 그 일 뒤 첫 마디 머리의 크래시 — 층이 바뀌는 바로 그 마디다. 음악이 돌고 있을 때만, 그 머리를 아직 내지 않았을 때만
  const auto crash = [&](uint64_t after) {
    const auto bar = sequencer_.frame_at((after / bar_ticks_ + 1) * bar_ticks_);
    if (!bar || !crash_ || *bar < next_frame_) return;
    out.push_back({.sample = *crash_, .bus = BUS_MUSIC, .gain = CRASH_GAIN, .pan = CRASH_PAN, .delay = static_cast<uint32_t>(*bar - next_frame_)});
    ticks.push_back(tick);
  };

  const Player& player = world.player();
  for (uint64_t at = unread(world); at < world.event_count(); at++) {
    const WorldEvent event = *world.event(at);
    tick = event.tick;
    const Heard heard = hear(player, event.at);
    // 내 총에 맞은 것은 멀어도 제 크기로 — 어느 쪽인지만 놓는다
    const Heard aside{heard.pan, 1.0f};
    const bool stone = event.enemy == EnemyKind::charger;
    switch (event.kind) {
      case WorldEvent::Kind::shot: {
        const ShotVoice voice = shot_voice(at);
        add(shot_, {0.0f, voice.gain}, 0, voice.pitch);
        break;
      }
      case WorldEvent::Kind::magazine_out: add(magazine_out_); break;
      case WorldEvent::Kind::magazine_in:
        add(magazine_in_);
        add(slide_, {}, SLIDE_DELAY_TICKS, SLIDE_PITCH);
        break;
      // 빈 방아쇠 — 탄 없이 당긴 딸깍. 박자 실수의 소리가 아니다
      case WorldEvent::Kind::dry: add(dry_); break;
      // 미스 — 총소리도 빈 방아쇠의 딸깍도 아닌 헛손질 소리 (sound.hpp 의 MISS_PITCH)
      case WorldEvent::Kind::miss: add(jump_, {0.0f, MISS_GAIN}, 0, MISS_PITCH); break;
      case WorldEvent::Kind::hurt: add(hurt_); break;
      case WorldEvent::Kind::hit: add(hit_, aside); break;
      // 돌 정령은 돌이 부서지고, 헤드론 조각은 수정이 깨진다
      case WorldEvent::Kind::kill: add(stone ? kill_stone_ : kill_glass_, aside); break;
      case WorldEvent::Kind::dash: add(dash_); break;
      case WorldEvent::Kind::jumped: add(jump_); break;
      case WorldEvent::Kind::landed: add(land_, {0.0f, std::clamp(world.landing_speed() / LAND_FULL_SPEED, LAND_QUIET, 1.0f)}); break;
      // 예고 — 돌 정령은 돌이 갈리는 소리(두 박), 헤드론 조각은 차오르는 울림(한 박). 길이가 예고의 길이와 같다
      case WorldEvent::Kind::windup: add(stone ? windup_stone_ : windup_cast_, heard); break;
      case WorldEvent::Kind::charge: add(charge_, heard); break;
      case WorldEvent::Kind::bolt: add(bolt_, heard); break;
      case WorldEvent::Kind::bolt_wall: add(bolt_wall_, heard); break;
      case WorldEvent::Kind::locked:
        add(gate_close_);
        // 전투가 시작된 뒤 첫 마디 머리 — combat 과 배수의 층이 얹히는 마디
        crash(event.tick);
        break;
      case WorldEvent::Kind::opened:
        add(gate_open_);
        add(portal_open_, {}, PORTAL_DELAY_TICKS);
        // 방을 비운 뒤 첫 마디 머리 — 절정의 첫 마디
        crash(event.tick);
        break;
      case WorldEvent::Kind::portal: add(portal_enter_); break;
      case WorldEvent::Kind::arrived:
      case WorldEvent::Kind::cleared:
      case WorldEvent::Kind::dead: break;
    }
  }

  for (const Cue cue : std::span{cues_}.first(cue_count_)) {
    // 걸어 둔 소리는 서로 줄이지 않는다
    tick = UINT64_MAX - out.size();
    switch (cue) {
      case Cue::ui_move: add(ui_move_); break;
      case Cue::ui_press: add(ui_press_); break;
      case Cue::step_left: add(step_left_[turns.left % step_left_.size()], {-STEP_PAN, STEP_GAIN[turns.left % std::size(STEP_GAIN)]}), turns.left++; break;
      case Cue::step_right: add(step_right_[turns.right % step_right_.size()], {STEP_PAN, STEP_GAIN[turns.right % std::size(STEP_GAIN)]}), turns.right++; break;
    }
  }
  return out;
}

void Sound::follow(const World& world, uint32_t delay) {
  // 음악의 흐름 — 읽지 않은 일에서 전투의 시작과 방 비움을 찾고, 세계의 지금 마디까지 나아가게 한다
  for (uint64_t at = unread(world); at < world.event_count(); at++) {
    const WorldEvent event = *world.event(at);
    if (event.kind == WorldEvent::Kind::locked) flow_.locked();
    if (event.kind == WorldEvent::Kind::opened) flow_.cleared(event.tick / bar_ticks_);
  }
  const uint32_t on = flow_.follow((world.tick() + bar_ticks_ / 2) / bar_ticks_, music_scene(world));
  for (std::size_t layer = 0; layer < layers_.size(); layer++)
    if (layers_[layer]) sequencer_.set_layer(*layers_[layer], on >> layer & 1);

  for (engine::audio::Play play : plays(world)) {
    // 효과음은 곧 나갈 자리(delay)에서, 음악 줄기의 소리(마디 머리의 크래시)는 제 자리에서
    if (play.bus == BUS_EFFECTS) play.delay += delay;
    mixer_.play(play);
  }
  // 번갈아 쓰는 차례를 읽은 만큼 넘긴다
  for (const Cue cue : std::span{cues_}.first(cue_count_)) {
    if (cue == Cue::step_left) turns_.left++;
    if (cue == Cue::step_right) turns_.right++;
  }
  cursor_ = world.event_count();
  cue_count_ = 0;
}

void Sound::start_music(uint64_t frame, uint64_t tick) {
  sequencer_.locate(frame, tick);
  marks_.clear();
}

void Sound::stop_music() {
  sequencer_.stop();
  mixer_.stop(BUS_MUSIC);
  marks_.clear();
}

void Sound::render(std::span<float> out, uint64_t frame) {
  if (marks_.size() == MARKS) marks_.erase(marks_.begin());
  marks_.push_back({frame, mixer_, sequencer_});
  sequencer_.run(mixer_, frame, static_cast<uint32_t>(out.size() / 2));
  mixer_.render(out);
  next_frame_ = frame + out.size() / 2;
}

std::optional<uint64_t> Sound::rewind(uint64_t frame) {
  auto mark = marks_.end();
  while (mark != marks_.begin() && (mark - 1)->frame > frame) --mark;
  if (mark == marks_.begin()) return std::nullopt;
  --mark;
  const uint64_t from = mark->frame;
  mixer_ = mark->mixer;
  sequencer_ = mark->sequencer;
  next_frame_ = from;
  // 그 자리부터는 다시 낸다 — render 가 다시 기억한다
  marks_.erase(mark, marks_.end());
  mixer_.set_gain(BUS_MUSIC, music_ * music_);
  mixer_.set_gain(BUS_EFFECTS, effects_ * effects_);
  return from;
}

}  // namespace game
