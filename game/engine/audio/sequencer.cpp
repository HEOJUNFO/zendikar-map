#include "engine/audio/sequencer.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace engine::audio {
namespace {

// .song — 'ZKSG', 초당 틱 수, 되풀이 길이(틱), 마디 길이(틱), 층 수 (모두 u32), 층마다 [이름 16 바이트(남는 자리는 0), 음 수 u32, 음마다 24 바이트(자리 u32, 샘플 u32, 길이(틱) u32, 높이·크기·자리 f32)]. 리틀 엔디언
constexpr std::size_t HEADER_BYTES = 20, NAME_BYTES = 16, LAYER_BYTES = NAME_BYTES + 4, NOTE_BYTES = 24;
constexpr uint32_t MAX_TICK_RATE = 1000, MAX_LOOP_TICKS = 1u << 20;
constexpr float MIN_PITCH = 0.25f, MAX_PITCH = 4.0f, MAX_GAIN = 4.0f;

template <typename T>
T read(std::span<const std::byte> bytes, std::size_t at) {
  T value;
  std::memcpy(&value, bytes.data() + at, sizeof value);
  return value;
}

}  // namespace

std::optional<Song> Song::decode(std::span<const std::byte> bytes, uint32_t sample_count) {
  if (bytes.size() < HEADER_BYTES || std::memcmp(bytes.data(), "ZKSG", 4) != 0) return std::nullopt;
  Song song{.tick_rate = read<uint32_t>(bytes, 4), .loop_ticks = read<uint32_t>(bytes, 8), .bar_ticks = read<uint32_t>(bytes, 12), .layers = {}};
  const uint32_t layers = read<uint32_t>(bytes, 16);
  if (!song.tick_rate || song.tick_rate > MAX_TICK_RATE || !song.bar_ticks || !song.loop_ticks || song.loop_ticks > MAX_LOOP_TICKS || song.loop_ticks % song.bar_ticks || layers > MAX_LAYERS)
    return std::nullopt;
  std::size_t at = HEADER_BYTES;
  for (uint32_t i = 0; i < layers; i++) {
    if (bytes.size() - at < LAYER_BYTES) return std::nullopt;
    const char* name = reinterpret_cast<const char*>(bytes.data() + at);
    const std::size_t length = static_cast<std::size_t>(std::find(name, name + NAME_BYTES, '\0') - name);
    const uint32_t count = read<uint32_t>(bytes, at + NAME_BYTES);
    at += LAYER_BYTES;
    if (!length || (bytes.size() - at) / NOTE_BYTES < count) return std::nullopt;
    Layer layer{.name = {name, length}, .notes = {}};
    layer.notes.reserve(count);
    for (uint32_t n = 0; n < count; n++, at += NOTE_BYTES) {
      const Note note{read<uint32_t>(bytes, at), read<uint32_t>(bytes, at + 4), read<uint32_t>(bytes, at + 8), read<float>(bytes, at + 12), read<float>(bytes, at + 16), read<float>(bytes, at + 20)};
      // 음의 길이는 되풀이 구간을 넘지 않는다
      if (note.tick >= song.loop_ticks || (n && note.tick < layer.notes.back().tick) || note.sample >= sample_count || note.length > song.loop_ticks) return std::nullopt;
      // 유한하지 않은 값은 아래 비교가 모두 거짓이 되어 걸린다
      if (!(note.pitch >= MIN_PITCH && note.pitch <= MAX_PITCH && note.gain >= 0.0f && note.gain <= MAX_GAIN && note.pan >= -1.0f && note.pan <= 1.0f)) return std::nullopt;
      layer.notes.push_back(note);
    }
    song.layers.push_back(std::move(layer));
  }
  return at == bytes.size() ? std::optional{std::move(song)} : std::nullopt;
}

std::optional<uint32_t> Song::layer(std::string_view name) const {
  for (uint32_t i = 0; i < layers.size(); i++)
    if (layers[i].name == name) return i;
  return std::nullopt;
}

Sequencer::Sequencer(const Song& song, uint32_t rate, uint32_t bus) : song_(&song), rate_(rate), bus_(bus) {}

void Sequencer::locate(uint64_t frame, uint64_t tick) {
  located_ = true;
  frame_ = frame;
  tick_ = tick;
  cursor_ = tick;
  active_ = wanted_;
}

void Sequencer::set_layer(uint32_t layer, bool on) {
  if (layer >= song_->layers.size()) return;
  wanted_ = on ? wanted_ | 1u << layer : wanted_ & ~(1u << layer);
}

void Sequencer::run(Mixer& mixer, uint64_t frame, uint32_t count) {
  if (!located_) return;
  for (;; cursor_++) {
    const uint64_t at = frame_ + (cursor_ - tick_) * rate_ / song_->tick_rate;
    if (at >= frame + count) return;
    if (cursor_ % song_->bar_ticks == 0) active_ = wanted_;
    // 이미 지난 표본의 틱은 내지 않는다 (놓은 뒤로는 생기지 않는다 — 부르는 쪽이 구간을 건너뛰었을 때만)
    if (at < frame) continue;
    const uint32_t tick = static_cast<uint32_t>(cursor_ % song_->loop_ticks);
    for (uint32_t i = 0; i < song_->layers.size(); i++) {
      if (!(active_ >> i & 1)) continue;
      const std::vector<Note>& notes = song_->layers[i].notes;
      for (auto note = std::lower_bound(notes.begin(), notes.end(), tick, [](const Note& n, uint32_t t) { return n.tick < t; }); note != notes.end() && note->tick == tick; ++note)
        mixer.play({.sample = note->sample,
                    .bus = bus_,
                    .pitch = note->pitch,
                    .gain = note->gain,
                    .pan = note->pan,
                    .delay = static_cast<uint32_t>(at - frame),
                    .length = static_cast<uint32_t>(static_cast<uint64_t>(note->length) * rate_ / song_->tick_rate)});
    }
  }
}

}  // namespace engine::audio
