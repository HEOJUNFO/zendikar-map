#pragma once

#include <array>
#include <cstdint>
#include <span>

#include "engine/audio/bank.hpp"

// 믹서 — 뱅크의 샘플을 틀어(보이스) 스테레오 출력 한 줄기로 섞는다. 무슨 소리인지는 모른다: 부르는 쪽이 샘플 번호·높이·크기·자리를 준다.
// 같은 차례로 play·render 를 부르면, render 를 어떻게 쪼개 불러도 나오는 표본이 비트까지 같다 (보이스는 블록이 아니라 표본 단위로 나아간다).
namespace engine::audio {

/** 한꺼번에 울리는 소리의 수 */
inline constexpr uint32_t VOICES = 48;
/** 크기를 따로 다루는 줄기의 수 — 무엇을 어느 줄기에 둘지는 부르는 쪽이 정한다 (게임은 음악과 효과음) */
inline constexpr uint32_t BUSES = 2;

struct Play {
  /** 뱅크의 샘플 번호 */
  uint32_t sample{};
  uint32_t bus{};
  /** 높이 — 재생 속도의 배율 (1 이 원래 높이, 반음 n 개는 2^(n/12)) */
  float pitch{1.0f};
  float gain{1.0f};
  /** 자리 — -1 왼쪽 … 0 가운데 … 1 오른쪽 (등전력: 가운데에서 두 채널이 √½) */
  float pan{};
  /** 다음 render 가 내는 첫 표본에서 이만큼 뒤에 시작한다 */
  uint32_t delay{};
  /** 시작한 뒤 이만큼(출력의 표본 수) 울리고 짧게 줄어 끊긴다 — 음의 길이. 0 이면 샘플의 끝까지 */
  uint32_t length{};
};

class Mixer {
 public:
  /** rate 는 출력의 표본율 (Hz). bank 는 믹서보다 오래 살아야 한다 */
  Mixer(const Bank& bank, uint32_t rate);

  /**
   * 소리 하나를 건다. 빈 보이스가 없으면 가장 작게 울리는 것을 뺏는다. 없는 샘플·줄기, 유한하지 않거나 범위 밖의 값이면 아무 일도 없다.
   * 샘플에 묶음이 있으면, 이 소리가 시작되는 표본에서 같은 묶음의 울리던 소리가 짧게 줄며 끊긴다
   */
  void play(const Play& play);
  /** 줄기의 크기 (0…) — 딸깍 소리가 나지 않게 10 ms 에 걸쳐 따라간다 */
  void set_gain(uint32_t bus, float gain);
  /** 그 줄기의 소리를 모두 짧게 줄여 끊는다 (아직 시작하지 않은 것은 그냥 버린다) */
  void stop(uint32_t bus);
  /** 다음 표본들을 낸다 — out 은 스테레오 인터리브(왼쪽, 오른쪽, …)이고 덮어쓴다. 넘치는 값은 부드럽게 눌린다 (±0.8 까지는 그대로) */
  void render(std::span<float> out);
  /** 걸려 있는 보이스의 수 (아직 시작하지 않은 것도 센다) */
  uint32_t voices() const;

 private:
  struct Voice {
    const Sample* sample{};
    // 읽는 자리와 표본마다 나아가는 양 — 32.32 고정 소수 (블록을 어떻게 쪼개도 같은 자리를 지난다)
    uint64_t position{};
    uint64_t step{};
    float left{};
    float right{};
    uint32_t delay{};
    // 끊기는 중이면 남은 표본 수, 아니면 0
    uint32_t fade{};
    // 끊기 시작할 때까지 남은 표본 수 — 0 이면 샘플의 끝까지 울린다
    uint32_t remain{};
    uint32_t bus{};
  };

  void mix(std::span<float> out);

  const Bank* bank_;
  uint32_t rate_;
  // 끊을 때 줄이는 길이 (표본)
  uint32_t fade_frames_;
  std::array<Voice, VOICES> voices_{};
  std::array<float, BUSES> gain_;
  std::array<float, BUSES> target_;
};

}  // namespace engine::audio
