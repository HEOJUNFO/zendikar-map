#pragma once

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>

// 프레임 예산 — 장면을 얼마로 그릴지(해상도 배율, 다중 표본)와 몇 번의 화면 갱신마다 한 프레임을 낼지를, 프레임이 제때 나오는지를 보고 정한다.
// 기기마다 GPU 가 다르고 창 크기도 제각각이라 값을 정해 두지 않는다: 같은 장면을 그 기기가 화면 주사율로 낼 수 있는 가장 좋은 품질로 맞춘다.
//
//   품질의 단계 (낮은 데서 높은 데로): 배율 0.5 → … → 1.0 (단계마다 픽셀 수 약 1.26 배), 그 위가 배율 1.0 + 다중 표본.
//   프레임이 늦으면 (화면 갱신을 놓치면) 단계를 내리고, 맨 아래 단계에서도 늦으면 화면 갱신 두 번에 한 프레임(주사율의 절반)으로 고르게 낸다 —
//   들쭉날쭉한 120 보다 고른 60 이 낫다. 여유가 이어지면 한 단계씩 올린다.
//
// 떨지 않게 하는 장치:
//   - 늦은 단계는 막아 둔다(막힌 단계와 그때의 GPU 시간을 기억). GPU 시간을 잴 수 있으면 올리기 전에 그 단계의 시간을 픽셀 수로 어림해, 늦었던 시간에 닿으면 올리지 않는다.
//   - 막힌 것은 시간이 지나야 풀리고(다시 해 본다), 다시 늦으면 그 시간이 두 배씩 길어진다 (5 초 … 5 분).
//   - 단계를 바꾼 바로 뒤의 창은 보지 않는다 (타깃을 다시 잡는 프레임, 앞 단계의 GPU 시간이 섞인다).
//   - 가끔 한두 프레임 튀는 것(에셋 올리기)으로는 내리지 않는다. 다만 창마다 한두 프레임씩 계속 늦으면(아슬아슬하게 넘친다) 내린다.
// 시계를 모른다: 쓰는 쪽이 그린 프레임마다 간격을 넣는다. 할당하지 않는다.
namespace engine {

/** 장면을 그릴 크기 (픽셀) */
struct SceneExtent {
  uint32_t width;
  uint32_t height;
  constexpr bool operator==(const SceneExtent&) const = default;
};

/** 장면 픽셀 수의 상한 — 3840 × 2160. 이보다 큰 캔버스(배율이 높은 큰 화면)에서는 비율을 지켜 이 안으로 줄인다 */
inline constexpr uint64_t SCENE_PIXEL_LIMIT = 3840ull * 2160ull;
/** 처음 고르는 단계가 겨누는 장면 픽셀 수 — 1920 × 1080. 여기서 시작해 잰 것으로 올리고 내린다 (큰 화면에서 첫 몇 초가 끊기지 않게) */
inline constexpr uint64_t SCENE_PIXEL_START = 1920ull * 1080ull;

/**
 * 캔버스(width × height)에 배율 scale 로 그릴 장면의 크기 — 변마다 반올림하고 1 보다 작아지지 않는다.
 * 픽셀 수가 limit 를 넘으면 비율을 지켜 그 안으로 줄인다
 */
constexpr SceneExtent scene_extent(uint32_t width, uint32_t height, float scale, uint64_t limit = SCENE_PIXEL_LIMIT) {
  const double pixels = static_cast<double>(width) * height * scale * scale;
  double fit = scale;
  if (pixels > static_cast<double>(limit)) {
    // 제곱근 — 뉴턴법 몇 번 (constexpr)
    const double ratio = static_cast<double>(limit) / (static_cast<double>(width) * height);
    double root = ratio > 1.0 ? ratio : 1.0;
    for (int i = 0; i < 40; i++) root = 0.5 * (root + ratio / root);
    fit = root;
  }
  const auto side = [&](uint32_t canvas) {
    const double scaled = canvas * fit + 0.5;
    return scaled < 1.0 ? 1u : static_cast<uint32_t>(scaled);
  };
  return {side(width), side(height)};
}

/** 지금 그릴 품질 */
struct FrameQuality {
  /** 장면의 해상도 배율 0.5 … 1 (변의 길이에 곱한다) */
  float scale{1.0f};
  /** 장면 타깃의 다중 표본 */
  bool multisample{};
  /** 화면 갱신 몇 번에 한 프레임을 내는가 — 1 또는 2 */
  uint32_t divisor{1};
  constexpr bool operator==(const FrameQuality&) const = default;
};

class FrameGovernor {
 public:
  /** 배율의 단계 0 … SCALE_TOP 과, 그 위의 다중 표본 단계 */
  static constexpr int SCALE_TOP = 6;
  static constexpr int MULTISAMPLE = SCALE_TOP + 1;
  /** 단계마다의 배율 — 2^((단계 − 6) / 6) */
  static constexpr std::array<float, SCALE_TOP + 1> SCALES{0.5f, 0.561f, 0.63f, 0.707f, 0.794f, 0.891f, 1.0f};
  /** 창 하나의 길이 (ms) — 이만큼의 프레임을 보고 한 번 정한다 */
  static constexpr float WINDOW_MS = 500.0f;
  /** 화면 갱신 간격의 이만큼을 넘겨 온 프레임은 늦은 것이다 (간격 > (나누는 수 + LATE_SLACK) × 갱신 간격) */
  static constexpr float LATE_SLACK = 0.5f;
  /** 창에서 늦은 프레임이 OVERLOAD_FRAMES 개 이상이고 그 몫이 OVERLOAD_SHARE 를 넘으면 넘친 것이다 (단계를 내린다). 몫이 SEVERE_SHARE 를 넘으면 두 단계를 내린다 */
  static constexpr uint32_t OVERLOAD_FRAMES = 3;
  static constexpr float OVERLOAD_SHARE = 0.04f, SEVERE_SHARE = 0.3f;
  /** 넘치지는 않아도 늦은 프레임이 있는 창이 이만큼 이어지면 넘친 것으로 친다 */
  static constexpr int STRAIN_WINDOWS = 4;
  /** 늦은 프레임 없는 창이 이만큼 이어져야 올린다 */
  static constexpr int CALM_WINDOWS = 2;
  /** 올릴 단계의 어림한 GPU 시간이, 늦었던 때의 GPU 시간의 이 몫 안이어야 올린다 */
  static constexpr float LIMIT_MARGIN = 0.92f;
  /** 늦었던 적이 없을 때 — 어림한 GPU 시간이 예산(갱신 간격 × 나누는 수)의 이 몫 안이어야 올린다 */
  static constexpr float BUDGET_SHARE = 0.8f;
  /** 다중 표본은 배율 1 에서 GPU 시간이 예산의 이 몫 안일 때만 켠다 (표본을 푸는 값은 GPU 시간에 잡히지 않는다 — 넉넉할 때만) */
  static constexpr float MULTISAMPLE_SHARE = 0.2f;
  /**
   * 주사율의 절반에서 제 주사율로 돌아가는 조건 — 지금 단계의 GPU 시간이, 절반으로 내린 뒤 그 단계에서 처음 잰 값의 이 몫 안 (장면이 그만큼 가벼워졌다).
   * 같은 단계끼리만 견준다: GPU 시간에는 픽셀 수와 무관한 몫이 커서, 다른 단계의 시간을 픽셀 수로 어림하면 실제보다 가볍게 나와 절반과 제 주사율을 오간다
   */
  static constexpr float RETURN_SHARE = 0.7f;
  /** 맨 아래 단계에서 넘친 창이 (늦은 프레임 없는 창을 사이에 두지 않고) 이만큼 쌓여야 주사율의 절반으로 내린다 — 가끔 늦는 것으로는 내리지 않는다 */
  static constexpr int FLOOR_WINDOWS = 3;
  /** 막힌 단계를 다시 해 보기까지 (ms) — 다시 늦을 때마다 두 배 */
  static constexpr float RETRY_MIN_MS = 5000.0f, RETRY_MAX_MS = 300000.0f;

  /** 캔버스의 크기가 정해졌다(바뀌었다) — 그 픽셀 수에 맞는 단계에서 다시 시작한다 */
  constexpr void reset(uint64_t canvas_pixels) {
    *this = FrameGovernor{};
    level_ = 0;
    for (int level = SCALE_TOP; level > 0; level--) {
      if (static_cast<double>(canvas_pixels) * SCALES[level] * SCALES[level] <= static_cast<double>(SCENE_PIXEL_START)) {
        level_ = level;
        break;
      }
    }
  }

  constexpr FrameQuality quality() const { return {SCALES[std::min(level_, SCALE_TOP)], level_ == MULTISAMPLE, divisor_}; }
  constexpr int level() const { return level_; }

  /**
   * 장면을 그린 프레임 하나 — interval 은 앞서 그린 프레임과의 간격, refresh 는 화면 갱신 간격, gpu 는 그동안 잰 GPU 시간(장면 + 화면에 올리기)의
   * 가장 새 값 (모두 ms. 잴 수 없으면 gpu 는 0). 창이 차면 품질을 다시 정한다 — 바뀌었으면 true
   */
  constexpr bool frame(float interval, float refresh, float gpu) {
    if (!(interval > 0.0f) || !(refresh > 0.0f)) return false;
    span_ += interval;
    frames_++;
    late_ += interval > (static_cast<float>(divisor_) + LATE_SLACK) * refresh;
    if (gpu > 0.0f) {
      gpu_sum_ += gpu;
      gpu_count_++;
    }
    if (span_ < WINDOW_MS) return false;
    const FrameQuality before = quality();
    const float mean_gpu = gpu_count_ ? gpu_sum_ / static_cast<float>(gpu_count_) : 0.0f;
    if (settling_) settling_ = false;
    else decide(refresh * static_cast<float>(divisor_), mean_gpu);
    clock_ += span_;
    span_ = gpu_sum_ = 0.0f;
    frames_ = late_ = gpu_count_ = 0;
    if (quality() == before) return false;
    settling_ = true;
    return true;
  }

  /** 장면을 한동안 그리지 않았다 (메뉴, 일시정지) — 모으던 창을 버린다. 정해 둔 품질과 기억은 그대로다 */
  constexpr void pause() {
    span_ = gpu_sum_ = 0.0f;
    frames_ = late_ = gpu_count_ = 0;
    settling_ = true;
  }

 private:
  static constexpr int NONE = MULTISAMPLE + 1;

  /** 단계 to 의 픽셀 수 ÷ 단계 from 의 픽셀 수 */
  static constexpr float pixel_ratio(int from, int to) {
    const float a = SCALES[std::min(from, SCALE_TOP)], b = SCALES[std::min(to, SCALE_TOP)];
    return (b * b) / (a * a);
  }

  constexpr void decide(float budget, float gpu) {
    const float share = static_cast<float>(late_) / static_cast<float>(frames_);
    bool overloaded = late_ >= OVERLOAD_FRAMES && share > OVERLOAD_SHARE;
    if (!overloaded && late_ > 0) {
      calm_ = 0;
      // 맨 아래 단계에서는 아슬아슬한 것으로 주사율을 절반으로 내리지 않는다 (내릴 품질이 없다 — 가끔 늦는 120 이 60 보다 낫다)
      if (level_ == 0 || ++strained_ < STRAIN_WINDOWS) return;
      overloaded = true;
    }
    strained_ = 0;
    if (overloaded) {
      calm_ = 0;
      sustained_ = 0;
      if (level_ > 0) {
        // 이 단계는 이 기기에 넘친다 — 막아 두고 내린다
        blocked_ = level_;
        blocked_gpu_ = gpu;
        retry_ms_ = std::min(retry_ms_ * 2.0f, RETRY_MAX_MS);
        retry_at_ = clock_ + span_ + retry_ms_;
        level_ = std::max(0, level_ - (share > SEVERE_SHARE ? 2 : 1));
      } else if (divisor_ == 1 && ++floor_overloads_ >= FLOOR_WINDOWS) {
        // 맨 아래 단계에서도 화면 주사율을 대지 못한다 — 절반으로 고르게 낸다 (예산이 두 배가 되니 단계는 다시 올라갈 수 있다)
        floor_overloads_ = 0;
        half_gpu_ = {};
        divisor_ = 2;
        blocked_ = NONE;
        blocked_gpu_ = 0.0f;
        retry_ms_ = RETRY_MIN_MS / 2.0f;
      }
      return;
    }
    floor_overloads_ = 0;
    // 막혔던 단계(나 그 위)에서 오래 버텼으면 다시 해 보는 간격을 처음으로 돌린다
    if (level_ >= blocked_ && ++sustained_ >= 20) retry_ms_ = RETRY_MIN_MS / 2.0f;
    if (++calm_ < CALM_WINDOWS) return;
    // 제 주사율로 돌아갈 수 있는가 — 장면이 가벼워졌을 때만 (잴 수 없으면 돌아가지 않는다)
    float& first = half_gpu_[static_cast<std::size_t>(level_)];
    if (divisor_ == 2 && gpu > 0.0f && first <= 0.0f) first = gpu;
    if (divisor_ == 2 && gpu > 0.0f && gpu <= RETURN_SHARE * first) {
      divisor_ = 1;
      level_ = 0;
      calm_ = 0;
      blocked_ = NONE;
      blocked_gpu_ = 0.0f;
      return;
    }
    const int next = level_ + 1;
    if (next > MULTISAMPLE) return;
    const bool expired = clock_ + span_ >= retry_at_;
    if (next >= blocked_ && !expired) return;
    if (next == MULTISAMPLE) {
      if (!(gpu > 0.0f) || gpu > MULTISAMPLE_SHARE * budget) return;
    } else if (gpu > 0.0f) {
      const float predicted = gpu * pixel_ratio(level_, next);
      // 늦었던 때의 GPU 시간을 아는 동안은 그 아래로만. 그 기억이 풀렸으면(다시 해 볼 때가 됐으면) 예산으로 어림한다
      const bool remembered = blocked_gpu_ > 0.0f && !expired;
      if (predicted > (remembered ? LIMIT_MARGIN * blocked_gpu_ : BUDGET_SHARE * budget)) return;
    }
    if (next >= blocked_) {
      // 다시 해 본다 — 또 늦으면 decide 가 다시 막고 간격을 늘린다
      blocked_ = NONE;
      blocked_gpu_ = 0.0f;
    }
    level_ = next;
    calm_ = 0;
    sustained_ = 0;
  }

  int level_{SCALE_TOP};
  uint32_t divisor_{1};
  // 모으는 창
  float span_{};
  uint32_t frames_{};
  uint32_t late_{};
  float gpu_sum_{};
  uint32_t gpu_count_{};
  bool settling_{true};
  // 지나간 시간 (그린 프레임의 간격을 더한 것, ms)
  double clock_{};
  int calm_{};
  int strained_{};
  int sustained_{};
  // 늦어서 막아 둔 단계와 그때의 GPU 시간, 다시 해 볼 때
  int blocked_{NONE};
  float blocked_gpu_{};
  double retry_at_{};
  float retry_ms_{RETRY_MIN_MS / 2.0f};
  // 맨 아래 단계에서 넘친 창의 수
  int floor_overloads_{};
  // 주사율의 절반으로 내린 뒤 단계마다 처음 잰 GPU 시간 (0 — 아직 재지 않았다)
  std::array<float, MULTISAMPLE + 1> half_gpu_{};
};

/**
 * 화면 갱신 간격을 프레임 콜백의 간격에서 어림한다 — 콜백은 갱신마다 오지만 밀리면 건너뛰고, 밀린 뒤에는 바짝 붙어 오기도 한다.
 * 최근 간격들(32 개)의 아래 사분위수를 쓴다: 건너뛴 긴 간격도, 몇 개의 짧은 간격도 값을 흔들지 못한다
 */
class RefreshEstimate {
 public:
  /** 콜백 사이의 간격 (ms) — 말이 안 되는 값(2 ms 미만, 100 ms 초과)은 버린다 */
  constexpr void sample(float interval) {
    if (!(interval >= MIN_MS) || interval > MAX_MS) return;
    recent_[next_++ % recent_.size()] = interval;
    // 반쯤 바뀔 때마다 다시 어림한다
    if (next_ % (recent_.size() / 2) != 0) return;
    std::array<float, 32> sorted = recent_;
    const std::size_t count = std::min<std::size_t>(next_, sorted.size());
    std::sort(sorted.begin(), sorted.begin() + static_cast<std::ptrdiff_t>(count));
    interval_ = sorted[count / 4];
  }
  /** 어림한 갱신 간격 (ms) — 아직 모르면 60 Hz */
  constexpr float interval() const { return interval_ > 0.0f ? interval_ : 1000.0f / 60.0f; }

 private:
  static constexpr float MIN_MS = 2.0f, MAX_MS = 100.0f;
  std::array<float, 32> recent_{};
  std::size_t next_{};
  float interval_{};
};

}  // namespace engine
