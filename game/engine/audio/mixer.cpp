#include "engine/audio/mixer.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>

namespace engine::audio {
namespace {

// 끊을 때 줄이는 시간과 줄기의 크기가 따라가는 시간 (ms)
constexpr uint32_t FADE_MS = 4;
constexpr uint32_t GAIN_MS = 10;
constexpr float MIN_PITCH = 1.0f / 16.0f, MAX_PITCH = 16.0f, MAX_GAIN = 16.0f;
// 이 크기까지는 그대로 내고, 그 위는 1 로 눕는다
constexpr float CLIP_KNEE = 0.8f;
constexpr double ONE = 4294967296.0;

float tap(const Sample& sample, int64_t index) {
  return index < 0 || index >= static_cast<int64_t>(sample.frames.size()) ? 0.0f : static_cast<float>(sample.frames[static_cast<std::size_t>(index)]) / 32768.0f;
}

float soft_clip(float x) {
  const float size = std::fabs(x);
  if (size <= CLIP_KNEE) return x;
  return std::copysign(CLIP_KNEE + (1.0f - CLIP_KNEE) * std::tanh((size - CLIP_KNEE) / (1.0f - CLIP_KNEE)), x);
}

}  // namespace

Mixer::Mixer(const Bank& bank, uint32_t rate) : bank_(&bank), rate_(std::max(rate, 1u)), fade_frames_(std::max(rate_ * FADE_MS / 1000, 1u)) {
  gain_.fill(1.0f);
  target_.fill(1.0f);
}

void Mixer::play(const Play& play) {
  if (play.sample >= bank_->samples().size() || play.bus >= BUSES) return;
  if (!std::isfinite(play.pitch) || !std::isfinite(play.gain) || !std::isfinite(play.pan)) return;
  if (play.pitch < MIN_PITCH || play.pitch > MAX_PITCH || play.gain < 0.0f || play.gain > MAX_GAIN) return;
  const Sample& sample = bank_->samples()[play.sample];
  if (sample.frames.empty()) return;

  // 빈 보이스, 없으면 가장 작게 울리는 것 (끊기는 중인 것은 남은 만큼으로 친다).
  // ceiling: 뺏긴 소리는 줄이지 않고 바로 끊긴다 (딸깍). 48 보이스가 다 차는 일이 들리게 잦아지면 뺏을 때도 fade 를 거친다.
  Voice* slot = nullptr;
  float quietest = 0.0f;
  for (Voice& voice : voices_) {
    if (!voice.sample) {
      slot = &voice;
      break;
    }
    const float level = std::max(voice.left, voice.right) * (voice.fade ? static_cast<float>(voice.fade) / static_cast<float>(fade_frames_) : 1.0f);
    if (!slot || level < quietest) {
      slot = &voice;
      quietest = level;
    }
  }
  const float angle = (std::clamp(play.pan, -1.0f, 1.0f) + 1.0f) * (std::numbers::pi_v<float> / 4.0f);
  const float gain = play.gain * sample.gain;
  *slot = {.sample = &sample,
           .position = 0,
           .step = static_cast<uint64_t>(static_cast<double>(sample.rate) / static_cast<double>(rate_) * static_cast<double>(play.pitch) * ONE),
           .left = gain * std::cos(angle),
           .right = gain * std::sin(angle),
           .delay = play.delay,
           .fade = 0,
           .remain = play.length,
           .bus = play.bus};
  // 지금 시작하는 소리는 여기서 묶음을 끊는다 — 나중에 시작하는 것은 그 표본에서 (render)
  if (!play.delay && sample.group)
    for (Voice& voice : voices_)
      if (&voice != slot && voice.sample && !voice.delay && !voice.fade && voice.sample->group == sample.group) voice.fade = fade_frames_;
}

void Mixer::set_gain(uint32_t bus, float gain) {
  if (bus < BUSES && std::isfinite(gain)) target_[bus] = std::clamp(gain, 0.0f, MAX_GAIN);
}

void Mixer::stop(uint32_t bus) {
  for (Voice& voice : voices_) {
    if (!voice.sample || voice.bus != bus) continue;
    if (voice.delay) voice = {};
    else if (!voice.fade) voice.fade = fade_frames_;
  }
}

uint32_t Mixer::voices() const {
  return static_cast<uint32_t>(std::count_if(voices_.begin(), voices_.end(), [](const Voice& voice) { return voice.sample != nullptr; }));
}

void Mixer::render(std::span<float> out) {
  std::fill(out.begin(), out.end(), 0.0f);
  // 시작을 기다리는 소리가 있으면 그 표본에서 끊어 섞는다 — 묶음이 정확히 그 표본에서 끊긴다
  for (std::size_t frames = out.size() / 2, done = 0; done < frames;) {
    uint32_t span = static_cast<uint32_t>(std::min<std::size_t>(frames - done, UINT32_MAX));
    for (const Voice& voice : voices_)
      if (voice.sample && voice.delay) span = std::min(span, voice.delay);
    mix(out.subspan(done * 2, static_cast<std::size_t>(span) * 2));
    done += span;
    for (Voice& voice : voices_) {
      if (!voice.sample || !voice.delay) continue;
      voice.delay -= span;
      if (voice.delay || !voice.sample->group) continue;
      for (Voice& other : voices_)
        if (&other != &voice && other.sample && !other.delay && !other.fade && other.sample->group == voice.sample->group) other.fade = fade_frames_;
    }
  }
}

// 시작한 보이스들을 out 의 길이만큼 섞는다 — 그 안에서는 새로 시작하는 소리가 없다
void Mixer::mix(std::span<float> out) {
  const float slew = 1000.0f / static_cast<float>(rate_ * GAIN_MS);
  for (std::size_t frame = 0; frame < out.size() / 2; frame++) {
    float sum[BUSES][2]{};
    for (Voice& voice : voices_) {
      if (!voice.sample || voice.delay) continue;
      const Sample& sample = *voice.sample;
      const int64_t index = static_cast<int64_t>(voice.position >> 32);
      // 네 점을 지나는 에르미트 곡선 (Catmull-Rom) — 샘플 밖은 0
      const float t = static_cast<float>(static_cast<double>(voice.position & 0xffffffffu) / ONE);
      const float p0 = tap(sample, index - 1), p1 = tap(sample, index), p2 = tap(sample, index + 1), p3 = tap(sample, index + 2);
      const float c1 = 0.5f * (p2 - p0), c2 = p0 - 2.5f * p1 + 2.0f * p2 - 0.5f * p3, c3 = 0.5f * (p3 - p0) + 1.5f * (p1 - p2);
      float value = ((c3 * t + c2) * t + c1) * t + p1;
      bool ended = false;
      // 길이가 다 된 음은 여기서부터 줄인다
      if (voice.remain && !--voice.remain && !voice.fade) voice.fade = fade_frames_;
      if (voice.fade) {
        value *= static_cast<float>(--voice.fade) / static_cast<float>(fade_frames_);
        ended = !voice.fade;
      }
      sum[voice.bus][0] += value * voice.left;
      sum[voice.bus][1] += value * voice.right;
      voice.position += voice.step;
      // 다 줄었거나 끝까지 읽었으면 비운다
      if (ended || voice.position >> 32 >= sample.frames.size()) voice = {};
    }
    float left = 0.0f, right = 0.0f;
    for (uint32_t bus = 0; bus < BUSES; bus++) {
      gain_[bus] += std::clamp(target_[bus] - gain_[bus], -slew, slew);
      left += sum[bus][0] * gain_[bus];
      right += sum[bus][1] * gain_[bus];
    }
    out[frame * 2] = soft_clip(left);
    out[frame * 2 + 1] = soft_clip(right);
  }
}

}  // namespace engine::audio
