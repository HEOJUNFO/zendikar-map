#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include "engine/audio/mixer.hpp"

// 시퀀서 — 곡(층마다 음의 표)을 출력 줄기의 정확한 표본에서 울린다. 곡의 시간은 틱이고, 틱이 줄기의 어느 표본인지는 부르는 쪽이 놓는다 (locate).
// 곡이 무엇인지(박자, 악기)는 모른다. 데이터는 tools/songc.mjs 가 악보 글에서 옮긴 .song 파일이다 (형식은 그 도구의 머리말).
namespace engine::audio {

struct Note {
  /** 되풀이 구간 안에서의 자리 (틱) */
  uint32_t tick{};
  uint32_t sample{};
  /** 음의 길이 (틱) — 그만큼 울리고 끊긴다. 0 이면 샘플의 끝까지 (타악) */
  uint32_t length{};
  float pitch{1.0f};
  float gain{1.0f};
  float pan{};
};

struct Layer {
  std::string name;
  /** 자리 차례 */
  std::vector<Note> notes;
};

struct Song {
  static constexpr uint32_t MAX_LAYERS = 32;

  /** 초당 틱 수 */
  uint32_t tick_rate{};
  /** 되풀이 구간의 길이 (틱) — 마디 길이의 배수 */
  uint32_t loop_ticks{};
  /** 마디의 길이 (틱) — 층은 마디의 머리에서만 켜지고 꺼진다 */
  uint32_t bar_ticks{};
  std::vector<Layer> layers;

  /**
   * sample_count 는 이 곡이 가리키는 뱅크의 샘플 수. 머리가 어긋났거나, 길이·수가 범위 밖이거나, 음이 차례대로가 아니거나 구간 밖이거나
   * 없는 샘플을 가리키거나 값이 범위 밖이거나, 데이터가 모자라거나 남으면 nullopt
   */
  static std::optional<Song> decode(std::span<const std::byte> bytes, uint32_t sample_count);
  /** 그 이름의 층 번호 — 없으면 nullopt */
  std::optional<uint32_t> layer(std::string_view name) const;
};

class Sequencer {
 public:
  /** rate 는 출력의 표본율, bus 는 음을 거는 믹서의 줄기. song 은 시퀀서보다 오래 살아야 한다 */
  Sequencer(const Song& song, uint32_t rate, uint32_t bus);

  /**
   * 곡의 틱 tick 이 줄기의 표본 frame 에서 울리게 놓고 거기서부터 낸다 (그 앞의 음은 내지 않는다). 켜 달라고 해 둔 층은 곧바로 켜진다.
   * 틱 t 의 표본은 frame + ⌊(t - tick) · rate / tick_rate⌋ — 쌓아 가지 않고 그때마다 정수로 계산한다
   */
  void locate(uint64_t frame, uint64_t tick);
  /** 곡의 틱 tick 이 울리는 줄기의 표본 — 놓지 않았거나 놓은 틱보다 앞이면 nullopt. 곡 밖의 소리를 곡의 자리(마디 머리)에 맞춰 걸 때 쓴다 */
  std::optional<uint64_t> frame_at(uint64_t tick) const {
    return located_ && tick >= tick_ ? std::optional{frame_ + (tick - tick_) * rate_ / song_->tick_rate} : std::nullopt;
  }
  /** 다시 놓을 때까지 아무 음도 내지 않는다 (이미 건 소리는 믹서의 것이다) */
  void stop() { located_ = false; }
  /** 층을 켜거나 끈다 — 다음 마디의 머리부터 */
  void set_layer(uint32_t layer, bool on);
  /** 줄기의 [frame, frame + count) 에서 시작하는 음을 mixer 에 건다 — 그 구간을 mixer.render 하기 바로 앞에 부른다 */
  void run(Mixer& mixer, uint64_t frame, uint32_t count);

 private:
  const Song* song_;
  uint32_t rate_;
  uint32_t bus_;
  bool located_{};
  uint64_t frame_{};
  uint64_t tick_{};
  // 다음에 낼 틱
  uint64_t cursor_{};
  // 켜 달라고 한 층과 지금 켜져 있는 층 (층 번호의 비트)
  uint32_t wanted_{};
  uint32_t active_{};
};

}  // namespace engine::audio
