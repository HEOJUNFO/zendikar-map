#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <span>
#include <vector>

#include "engine/audio/bank.hpp"
#include "engine/audio/mixer.hpp"
#include "engine/audio/sequencer.hpp"
#include "gameplay/presentation/menu.hpp"
#include "gameplay/simulation/world.hpp"

// 게임의 소리 — 세계에서 일어난 일(World::event)을 효과음으로, 전투의 흐름과 배수를 음악의 층으로 옮겨 엔진의 믹서·시퀀서로 낸다.
// 시뮬레이션은 소리를 모른다: 여기가 세계를 읽을 뿐이다. 출력 장치도 모른다 — 줄기의 다음 표본들을 달라는 대로 채운다 (render).
//   음악: 곡의 시간은 세계의 틱이다 — 조립 지점이 틱을 줄기의 표본에 놓는다 (start_music). 층은 다음 마디 머리에서 켜지고 꺼진다 — 켤 때는 한꺼번에, 끌 때는 마디마다 하나씩 (MusicFlow).
//   효과음: 일어난 즉시 낸다 (박자에 맞춰 미루지 않는다). 적의 소리는 플레이어 기준으로 좌우에 놓이고 멀수록 작다 (hear).
//         같은 틱에 같은 소리가 여럿이면(적 여럿이 같은 박에 예고) 가장 크게 들릴 하나만 낸다 — 소리가 쌓여 넘치지 않는다.
//   세계의 일이 아닌 소리(메뉴, 발소리)는 부르는 쪽이 건다 (cue) — 효과음과 같은 길로 나간다.
// 어떤 일이 어떤 샘플인지는 sound.cpp 의 Sound::plays, 샘플끼리의 크기는 content/audio/samples.txt 의 gain 에 있다.
namespace game {

/** 믹서의 줄기 — 옵션의 음량이 하나씩 맡는다 */
inline constexpr uint32_t BUS_MUSIC = 0, BUS_EFFECTS = 1;

/** 세계의 일이 아닌 소리 — 메뉴에서 가리킨 것이 바뀌었다·눌렀다, 걷는 발이 땅에 닿았다 */
enum class Cue : uint8_t { ui_move, ui_press, step_left, step_right };

/** 소리가 들리는 자리와 크기 */
struct Heard {
  /** -1 왼쪽 … 1 오른쪽 */
  float pan{};
  /** 0…1 */
  float gain{1.0f};
};
/** 옆에서 난 소리가 한쪽으로 쏠리는 정도 — 똑바로 옆(90 도)에서 이만큼 */
inline constexpr float PAN_WIDTH = 0.7f;
/** 소리가 반으로 작아지는 거리 (m) — 크기는 1 / (1 + 거리 / HEAR_DISTANCE). 방(한 변 33 m)의 끝에서 끝이 1/3 이다 */
inline constexpr float HEAR_DISTANCE = 16.0f;
/** at 에서 난 소리가 listener 에게 어떻게 들리는가 — 수평 거리와, 보는 쪽 기준의 좌우 */
Heard hear(const Player& listener, engine::Vec3 at);

/** 발사음 한 발의 높이(재생 속도)와 크기 — 샘플은 하나(shot)이고, 발마다 조금씩 달라 같은 소리가 줄지어 들리지 않는다 */
struct ShotVoice {
  float pitch;
  float gain;
};
/** 높이는 ±SHOT_PITCH_SPREAD, 크기는 ±SHOT_GAIN_SPREAD_DB 안 */
inline constexpr float SHOT_PITCH_SPREAD = 0.025f;
inline constexpr float SHOT_GAIN_SPREAD_DB = 1.0f;
/**
 * 미스(박을 크게 벗어나 행동이 나가지 않았다)의 소리 — 헛손질의 옷 스침: 뛰는 소리의 샘플(jump — 옷이 스치는 소리)을 낮고 조금 크게 낸다.
 * 미스에 맞춰 받아 둔 샘플은 없다 (받게 되면 sound.cpp 의 그 줄만 바꾼다 — 소리를 지어내지 않는다). 빈 방아쇠의 딸깍(dry)과 결이 다른 소리여야 한다:
 * 탄이 없는 것과 박을 놓친 것은 다른 일이다. 들어 가며 고칠 값이다 (미리듣기 gun.wav 의 끝)
 */
inline constexpr float MISS_PITCH = 0.7f;
inline constexpr float MISS_GAIN = 1.6f;
/** 세계의 일 번호(World::event 의 번호)에서 정해진다 — 같은 발은 언제 읽어도 같은 소리다 (프레임마다 달라지는 난수가 아니다) */
ShotVoice shot_voice(uint64_t event);

/**
 * 음악의 층 — 곡(content/audio/music/pulse.song.txt — E 단조의 더블타임 헤비 메탈, 열여섯 마디 고리 — 드럼·베이스·디스토션 기타뿐이다)의 layer 이름과 같다. 켜진 것을 비트로 (music_bit).
 *   pulse: 게임 중 늘 (박마다 킥, 8분마다 하이햇 — 반박의 하이햇이 더 세다. 반박이 곧 박자 행동의 칸이다)
 *   calm: 첫 전투 앞까지 (베이스의 긴 음, 팀파니, 낮은 탐 — 뒤 여덟 마디에 여린 라이드와 울리게 둔 파워코드)
 *   roam: 첫 전투부터 판이 끝날 때까지, 방 사이를 걷는 동안에도 (베이스 리프, 2·4 박의 사이드 스틱, 셰이커 — calm 과 자리를 바꾼다)
 *   combat: 방에 적이 있는 동안 (반박마다 스네어 — 맥박의 킥과 합쳐 칸마다 킥-스네어가 오가는 분당 180 의 백비트, 필인, 리듬 기타 두 대의 갤럽과 파워코드)
 *   lead: 방에 적이 있는 동안, 배수 1 부터 (주 리프 — 기타의 옥타브 유니즌, B3…A4 와 그 아래) · hum: 전투방을 비운 뒤 이동 중 (여리게 치고 울리게 둔 파워코드 — lead 와 자리를 바꾼다)
 *   x2: 배수 2 부터, 이동 중에도 남는다 (기타 두 대 더 — 가운데 음역의 8분 리프·낮은 16분 처그, 탬버린, 손뼉)
 *   x3 · x4: 전투 중에 배수가 그만큼일 때 (x3: 다른 옥타브의 파워코드·팀파니·라이드 벨·더블 킥, x4: 주 리프의 6 도 아래 화음 줄·심벌·탐)
 * 배수 1 의 전투(pulse + roam + combat + lead)가 이미 곡의 몸통이다 — 배수의 층은 색과 두께를 더할 뿐이다
 */
enum class MusicLayer : uint32_t { pulse, calm, roam, combat, x2, x3, x4, lead, hum };
inline constexpr std::size_t MUSIC_LAYERS = 9;
constexpr uint32_t music_bit(MusicLayer layer) { return 1u << static_cast<uint32_t>(layer); }

/** 음악이 따라가는 세계의 모습 — 방에 적이 있는가, 전투방을 하나라도 비웠는가, 배수(1…4) */
struct MusicScene {
  bool combat{};
  bool fought{};
  uint32_t multiplier{1};
};
MusicScene music_scene(const World& world);
/**
 * 그 모습이 바라는 층들 — 음악이 가려는 곳이다 (어떻게 가는가는 MusicFlow).
 * 배수는 세계가 기억한다 (피격만 x1 로 돌린다 — 방을 비워도 남는다): 이동 중에는 x2 의 리프까지만 남기고, 다음 전투방에 들어서면 배수만큼의 층이 한꺼번에 돌아온다.
 * 주선율은 배수와 무관하다 — 전투 중에는 lead, 그 뒤 이동 중에는 hum
 */
constexpr uint32_t music_target(const MusicScene& scene) {
  const bool moving = scene.combat || scene.fought;
  uint32_t on = music_bit(MusicLayer::pulse) | music_bit(moving ? MusicLayer::roam : MusicLayer::calm);
  if (scene.combat) on |= music_bit(MusicLayer::combat) | music_bit(MusicLayer::lead);
  else if (scene.fought) on |= music_bit(MusicLayer::hum);
  if (moving && scene.multiplier >= 2) on |= music_bit(MusicLayer::x2);
  if (scene.combat && scene.multiplier >= 3) on |= music_bit(MusicLayer::x3);
  if (scene.combat && scene.multiplier >= 4) on |= music_bit(MusicLayer::x4);
  return on;
}

/**
 * 음악의 흐름 — 켜 둔 층을 기억하고, 바라는 층(music_target)으로 간다: 오를 때는 곧바로(모자란 층을 한꺼번에 — 다음 마디 머리부터 들린다),
 * 내릴 때는 마디마다 하나씩 (x4 → x3 → combat → lead → x2 — 주선율은 북이 빠진 다음에 물러나고, 그 마디에 hum 이 자리를 잇는다). 방을 비우면 그 뒤 CLIMAX_BARS 마디는 아무 층도 끄지 않는다 — 깬 순간이 가장 꽉 찬 채로 간다.
 * 시간은 세계의 틱에서 온 마디 번호뿐이다 (벽시계를 모른다 — 같은 입력이면 같은 층). 시뮬레이션 밖의 연출이다.
 *   마디 번호: follow 의 deciding 은 '지금 끄기로 한 층이 처음 빠져 들리는 마디' — 마디의 한가운데를 지나면 다음 마디다 ((틱 + 반 마디) ÷ 마디).
 *   끄는 것은 그 번호가 넘어갈 때(마디 한가운데)에만 정해, 미리 써 둔 소리가 얼마든 바로 다음 마디 머리에서 꺼진다
 */
class MusicFlow {
 public:
  /** 방을 비운 뒤 층을 그대로 두는 마디 수 — 비운 마디의 다음 마디부터 센다 */
  static constexpr uint64_t CLIMAX_BARS = 2;

  /** 처음으로 — 다음 follow 가 바라는 층을 그대로 켠다 (새 판) */
  void reset() { *this = {}; }
  /** 마디 bar(틱 ÷ 마디)에서 방을 비웠다 — 절정이 시작된다 */
  void cleared(uint64_t bar) { hold_ = bar + 1 + CLIMAX_BARS; }
  /** 전투방의 문이 잠겼다 — 남은 절정은 끝난다 (새 전투의 층은 제 규칙대로 오르내린다) */
  void locked() { hold_ = 0; }
  /** 켜 둘 층들을 돌려준다 (비트) */
  uint32_t follow(uint64_t deciding, const MusicScene& scene);
  uint32_t on() const { return on_; }

 private:
  bool started_{};
  uint32_t on_{};
  uint64_t deciding_{};
  // 이 마디부터 층이 빠질 수 있다
  uint64_t hold_{};
};

class Sound {
 public:
  /** rate 는 출력의 표본율 (Hz). bank 와 song 은 Sound 보다 오래 살아야 한다. 뱅크에 없는 샘플·곡에 없는 층의 소리는 나지 않을 뿐이다 */
  Sound(const engine::audio::Bank& bank, const engine::audio::Song& song, uint32_t rate);

  /** 옵션의 음량을 줄기에 건다 (0…1 — 귀에 고르게 들리도록 제곱해 곱한다) */
  void set_volume(const Options& options);
  /** 새 판 — 그 세계에서 앞으로 일어나는 일부터 읽는다 */
  void restart(const World& world) {
    cursor_ = world.event_count();
    flow_.reset();
  }
  /** 세계의 일이 아닌 소리를 건다 — 다음 follow 가 낸다. 내지 못한 채 쌓이면(CUES 개) 새것을 버린다 */
  void cue(Cue cue);
  /**
   * 세계에서 새로 일어난 일과 걸어 둔 소리(cue)를 효과음으로 내고, 음악의 흐름(MusicFlow)을 세계의 지금까지 나아가게 해 층을 켜고 끈다 (층은 다음 마디 머리에서 바뀐다).
   * 효과음은 다음 render 가 내는 첫 표본에서 delay 표본 뒤에 시작한다
   */
  void follow(const World& world, uint32_t delay = 0);
  /** 아직 읽지 않은 일이나 걸어 둔 소리 가운데 효과음이 나는 것이 있다 */
  bool audible(const World& world) const { return !plays(world).empty(); }
  /**
   * 지금 follow 를 부르면 걸릴 소리들 — 아직 읽지 않은 일과 걸어 둔 소리에서 (같은 틱의 같은 소리는 가장 큰 하나로 줄인 뒤). 샘플은 뱅크의 번호,
   * delay 는 그 소리가 일보다 늦게 나는 표본 수다 (탄창을 끼운 뒤의 슬라이드, 석판이 내려간 뒤의 포털, 전투가 시작된 뒤와 방을 비운 뒤 첫 마디 머리의 크래시)
   */
  std::vector<engine::audio::Play> plays(const World& world) const;
  /** 음악을 시작한다 — 세계의 틱 tick 이 줄기의 표본 frame 에서 울리게 */
  void start_music(uint64_t frame, uint64_t tick);
  /** 음악을 끊는다 — 울리던 음은 짧게 줄어든다. 효과음은 그대로 간다 */
  void stop_music();
  /** 줄기의 표본 frame 부터 out 의 길이만큼 (스테레오 인터리브) 낸다. 이 구간을 내기 전의 상태를 기억해 둔다 (rewind) */
  void render(std::span<float> out, uint64_t frame);
  /**
   * 이미 낸 구간을 다시 내려고 되돌아간다 — 줄기의 표본 frame 이거나 그 앞인, 기억해 둔 가장 가까운 자리로. 그 자리를 돌려준다 (기억한 자리가 없으면 nullopt 이고 아무 일도 없다).
   * 효과음을 미리 써 둔 구간의 끝이 아니라 곧 나갈 자리에 넣을 때 쓴다: 되돌아가 효과음을 걸고(follow 의 delay) 그 자리부터 다시 render 해 덧쓴다.
   * 같은 상태에서 같은 구간을 다시 내므로 이미 있던 소리(음악, 울리던 효과음)는 표본까지 같다. 음악을 시작하거나 끊으면 기억은 지워진다
   */
  std::optional<uint64_t> rewind(uint64_t frame);

  /** 지금 걸려 있는 소리의 수 */
  uint32_t voices() const { return mixer_.voices(); }
  /** 지금 켜 둔 음악의 층들 (비트 — music_bit) */
  uint32_t music_on() const { return flow_.on(); }

 private:
  /** 번갈아 쓰는 샘플들의 차례 */
  struct Turns {
    uint32_t left{};
    uint32_t right{};
  };
  using Sample = std::optional<uint32_t>;

  /** render 한 구간의 처음과 그때의 상태 */
  struct Mark {
    uint64_t frame;
    engine::audio::Mixer mixer;
    engine::audio::Sequencer sequencer;
  };
  /** 기억해 두는 구간의 수 — 통지마다 8 ms 쯤을 내므로 미리 써 두는 양(수십 ms)을 넉넉히 덮는다 */
  static constexpr std::size_t MARKS = 24;
  /** 걸어 두는 소리의 수 */
  static constexpr std::size_t CUES = 8;

  /** 틱 수를 표본 수로 */
  uint32_t frames(uint32_t ticks) const { return static_cast<uint32_t>(static_cast<uint64_t>(ticks) * rate_ / TICK_RATE); }
  /** 아직 읽지 않은 첫 일의 번호 — 새 세계로 바뀌었는데 restart 를 부르지 않았어도 없는 번호를 읽지 않는다. 고리 밖으로 밀려난 일은 건너뛴다 */
  uint64_t unread(const World& world) const;

  uint32_t rate_;
  engine::audio::Mixer mixer_;
  engine::audio::Sequencer sequencer_;
  uint32_t bar_ticks_;
  MusicFlow flow_;
  std::vector<Mark> marks_;
  // 지금의 음량 (제곱하기 전) — 되돌아간 상태에도 지금의 음량을 건다
  float music_{1.0f}, effects_{1.0f};
  // 다음에 읽을 일의 번호
  uint64_t cursor_{};
  // 다음 render 가 내는 첫 표본 — 마디 머리에 맞추는 소리의 늦춤을 여기서 잰다
  uint64_t next_frame_{};
  std::array<Cue, CUES> cues_{};
  std::size_t cue_count_{};
  Turns turns_;
  std::array<Sample, MUSIC_LAYERS> layers_;
  // 발소리 왼발 셋·오른발 셋을 번갈아 쓴다
  std::array<Sample, 3> step_left_, step_right_;
  Sample shot_, magazine_out_, magazine_in_, slide_, dry_, hurt_, hit_, kill_stone_, kill_glass_, dash_, jump_, land_, windup_stone_, windup_cast_, charge_, bolt_, bolt_wall_, gate_open_,
      gate_close_, portal_open_, portal_enter_, ui_move_, ui_press_, crash_;
};

}  // namespace game
