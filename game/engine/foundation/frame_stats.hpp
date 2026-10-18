#pragma once

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>

// 프레임 통계 — 프레임 간격과 구간별 시간을 창(1 초쯤) 단위로 모아 요약한다. 성능 오버레이와 측정 스크립트(tools/perf.mjs)가 같은 요약을 읽는다.
// 시계를 모른다: 쓰는 쪽이 시각과 잰 시간을 ms 로 넣는다. 모으는 동안 할당하지 않는다 (프레임마다 불린다).
namespace engine {

/** 창 하나의 요약 — 시간은 모두 ms */
struct FrameReport {
  static constexpr std::size_t SECTIONS = 8;

  /** 창에 든 프레임 수와 창의 길이 */
  uint32_t frames{};
  float span{};
  /** 프레임 간격의 분포 */
  float p50{}, p95{}, p99{}, longest{};
  /** 간격이 그 주사율의 한 프레임을 넘긴 프레임 수 — 120 Hz(9 ms 초과), 60 Hz(17.5 ms 초과), 30 Hz(34 ms 초과). 화면 갱신의 떨림(±0.5 ms)은 치지 않는다 */
  uint32_t over_120{}, over_60{}, over_30{};
  /** 구간마다 프레임당 평균과 창 안의 가장 긴 것 (구간의 뜻은 쓰는 쪽이 정한다) */
  std::array<float, SECTIONS> section_mean{};
  std::array<float, SECTIONS> section_longest{};
  /** GPU 가 프레임 하나의 패스들을 그린 시간의 평균과 가장 긴 것, 그 가운데 장면 패스의 평균 — 잰 것이 없으면(gpu_samples 0) 뜻이 없다 */
  float gpu_mean{}, gpu_longest{}, gpu_scene_mean{};
  uint32_t gpu_samples{};
};

class FrameStats {
 public:
  static constexpr float OVER_120 = 9.0f, OVER_60 = 17.5f, OVER_30 = 34.0f;
  /** 창의 길이 (ms) — 이만큼 모이면 due 가 참이 된다 */
  static constexpr double WINDOW = 1000.0;

  /** 프레임이 시작됐다 (now 는 그 시각). 창의 첫 프레임은 간격이 없다. 너무 긴 간격(가려졌다 돌아옴 — gap_limit 초과)은 분포에 넣지 않고 창을 새로 연다 */
  void frame(double now, double gap_limit = 1000.0) {
    if (last_ >= 0.0 && now - last_ <= gap_limit) {
      if (count_ < intervals_.size()) intervals_[count_++] = static_cast<float>(now - last_);
    } else {
      reset(now);
    }
    last_ = now;
  }
  /** 이번 프레임의 한 구간에 든 시간을 더한다 — 한 프레임에 같은 구간을 여러 번 더해도 된다 (프레임 밖의 콜백이 쓴 시간은 다음 프레임에 얹힌다) */
  void section(std::size_t index, double ms) {
    if (index >= FrameReport::SECTIONS) return;
    section_sum_[index] += ms;
    section_frame_[index] += ms;
  }
  /** 프레임이 끝났다 — 구간마다 이번 프레임의 합을 가장 긴 것과 견준다 */
  void end_frame() {
    for (std::size_t i = 0; i < FrameReport::SECTIONS; i++) {
      section_longest_[i] = std::max(section_longest_[i], section_frame_[i]);
      section_frame_[i] = 0.0;
    }
  }
  /** GPU 가 프레임 하나의 패스들을 그린 시간과 그 가운데 장면 패스의 몫 (잴 수 있을 때만 — 몇 프레임 늦게 온다) */
  void gpu(double ms, double scene_ms = 0.0) {
    gpu_sum_ += ms;
    gpu_scene_sum_ += scene_ms;
    gpu_longest_ = std::max(gpu_longest_, ms);
    gpu_samples_++;
  }
  /** 창이 찼는가 */
  bool due(double now) const { return count_ > 0 && (now - opened_ >= WINDOW || count_ == intervals_.size()); }
  /** 지금까지 모은 것을 요약하고 새 창을 연다 */
  FrameReport take(double now) {
    FrameReport report;
    report.frames = static_cast<uint32_t>(count_);
    report.span = static_cast<float>(now - opened_);
    if (count_) {
      std::sort(intervals_.begin(), intervals_.begin() + static_cast<std::ptrdiff_t>(count_));
      // 가장 가까운 순위 — n 개 가운데 ceil(p × n) 째
      const auto rank = [&](std::size_t percent) { return intervals_[(count_ * percent + 99) / 100 - 1]; };
      report.p50 = rank(50);
      report.p95 = rank(95);
      report.p99 = rank(99);
      report.longest = intervals_[count_ - 1];
      for (std::size_t i = 0; i < count_; i++) {
        report.over_120 += intervals_[i] > OVER_120;
        report.over_60 += intervals_[i] > OVER_60;
        report.over_30 += intervals_[i] > OVER_30;
      }
      for (std::size_t i = 0; i < FrameReport::SECTIONS; i++) {
        report.section_mean[i] = static_cast<float>(section_sum_[i] / static_cast<double>(count_));
        report.section_longest[i] = static_cast<float>(section_longest_[i]);
      }
    }
    if (gpu_samples_) {
      report.gpu_mean = static_cast<float>(gpu_sum_ / gpu_samples_);
      report.gpu_scene_mean = static_cast<float>(gpu_scene_sum_ / gpu_samples_);
      report.gpu_longest = static_cast<float>(gpu_longest_);
      report.gpu_samples = gpu_samples_;
    }
    reset(now);
    return report;
  }

 private:
  void reset(double now) {
    opened_ = now;
    count_ = 0;
    section_sum_ = {};
    section_longest_ = {};
    gpu_sum_ = gpu_scene_sum_ = gpu_longest_ = 0.0;
    gpu_samples_ = 0;
  }

  // 창 하나에 드는 간격 — 240 Hz 로 1 초를 넘는다
  std::array<float, 512> intervals_{};
  std::size_t count_{};
  double last_{-1.0};
  double opened_{};
  std::array<double, FrameReport::SECTIONS> section_sum_{}, section_frame_{}, section_longest_{};
  double gpu_sum_{}, gpu_scene_sum_{}, gpu_longest_{};
  uint32_t gpu_samples_{};
};

}  // namespace engine
