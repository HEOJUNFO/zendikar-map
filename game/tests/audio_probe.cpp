// 소리 엔진 검증 프로브(QOA 풀기, 샘플 뱅크, 믹서, 시퀀서, 재생 시계) — Node 에서 돈다 (tests/game.test.mjs 가 부른다). 실패하면 까닭을 찍고 1 로 끝난다.
// 기대값: 손으로 계산한 표본. 샘플과 출력의 값은 2 의 거듭제곱 분수로 골라 float 계산이 정확히 떨어진다.
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <initializer_list>
#include <span>
#include <string_view>
#include <vector>

#include "engine/audio/bank.hpp"
#include "engine/audio/clock.hpp"
#include "engine/audio/mixer.hpp"
#include "engine/audio/qoa.hpp"
#include "engine/audio/sequencer.hpp"

namespace {

using engine::audio::Bank;
using engine::audio::Mixer;
using engine::audio::Sample;
using engine::audio::Sequencer;
using engine::audio::Song;

int failures = 0;

void expect(bool ok, const char* what) {
  if (ok) return;
  std::printf("FAIL: %s\n", what);
  failures++;
}

using Bytes = std::vector<std::byte>;

void put(Bytes& out, std::initializer_list<int> values) {
  for (const int value : values) out.push_back(static_cast<std::byte>(value));
}
void put_u32(Bytes& out, uint32_t value) { put(out, {static_cast<int>(value & 255), static_cast<int>(value >> 8 & 255), static_cast<int>(value >> 16 & 255), static_cast<int>(value >> 24)}); }
void put_f32(Bytes& out, float value) {
  uint32_t bits;
  std::memcpy(&bits, &value, 4);
  put_u32(out, bits);
}
void put_name(Bytes& out, std::string_view name, std::size_t width) {
  for (std::size_t i = 0; i < width; i++) out.push_back(static_cast<std::byte>(i < name.size() ? name[i] : 0));
}

/** 스테레오 출력의 한 채널 */
std::vector<float> channel(const std::vector<float>& out, int which) {
  std::vector<float> one;
  for (std::size_t i = static_cast<std::size_t>(which); i < out.size(); i += 2) one.push_back(out[i]);
  return one;
}
std::vector<float> render(Mixer& mixer, std::size_t frames) {
  std::vector<float> out(frames * 2, 9.0f);
  mixer.render(out);
  return out;
}
bool same(const std::vector<float>& got, std::initializer_list<float> want) {
  if (got.size() != want.size()) return false;
  std::size_t i = 0;
  for (const float value : want)
    if (std::fabs(got[i++] - value) > 1e-6f) return false;
  return true;
}

// 표본 셋짜리 QOA 파일 — 'qoaf', 표본 3 · 프레임 머리(채널 1, 44100 Hz = 0x00AC44, 표본 3, 프레임 32 바이트) · LMS 상태(지난 표본 0, 가중치 0)
// · 조각 하나: 눈금 15(1111), 잔차 6(110)·0(000)·1(001), 나머지 0 → 1111 1100 0000 1000 … = FC 08 00 …
// 손 계산 (눈금 15 의 잔차 값 6 → 14336, 0 → 1536, 1 → -1536):
//   1) 내다본 값 0 + 14336 = 14336. 가중치는 잔차 >> 4 = 896 씩 오른다 (지난 표본이 음수가 아니라서) → 896 넷, 지난 표본 (0, 0, 0, 14336)
//   2) 내다본 값 896 × 14336 >> 13 = 1568, + 1536 = 3104. 가중치 +96 → 992 넷, 지난 표본 (0, 0, 14336, 3104)
//   3) 내다본 값 992 × (14336 + 3104) >> 13 = 17300480 >> 13 = 2111, - 1536 = 575
const Bytes QOA_THREE = [] {
  Bytes b;
  put(b, {'q', 'o', 'a', 'f', 0, 0, 0, 3, 1, 0x00, 0xAC, 0x44, 0, 3, 0, 32});
  put(b, {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0});
  put(b, {0xFC, 0x08, 0, 0, 0, 0, 0, 0});
  return b;
}();

void qoa() {
  const auto three = engine::audio::decode_qoa(QOA_THREE);
  expect(three && three->rate == 44100 && three->frames == std::vector<int16_t>{14336, 3104, 575}, "QOA: 눈금 15 의 잔차 셋은 14336, 3104, 575 로 풀린다");

  // 지난 표본이 음수면 가중치가 반대로 움직인다 — 지난 표본 (0, 0, 0, -100 = FF9C), 가중치 (0, 0, 0, 8192 = 2000), 눈금 0, 잔차 3(011 → -3)·0(000 → +1): 0000 0110 00… = 06
  //   1) 내다본 값 8192 × -100 >> 13 = -100, - 3 = -103. 잔차 >> 4 = -1: 음수인 지난 표본의 가중치는 +1 (8193), 나머지는 -1. 지난 표본 (0, 0, -100, -103)
  //   2) 내다본 값 (100 - 103 × 8193) >> 13 = -843779 >> 13 = -104 (내림), + 1 = -103
  Bytes negative;
  put(negative, {'q', 'o', 'a', 'f', 0, 0, 0, 2, 1, 0x00, 0xBB, 0x80, 0, 2, 0, 32});
  put(negative, {0, 0, 0, 0, 0, 0, 0xFF, 0x9C, 0, 0, 0, 0, 0, 0, 0x20, 0x00});
  put(negative, {0x06, 0, 0, 0, 0, 0, 0, 0});
  const auto two = engine::audio::decode_qoa(negative);
  expect(two && two->rate == 48000 && two->frames == std::vector<int16_t>{-103, -103}, "QOA: 음수인 지난 표본과 음수 잔차 (-103, -103)");

  for (std::size_t length = 0; length < QOA_THREE.size(); length++)
    expect(!engine::audio::decode_qoa(std::span{QOA_THREE}.first(length)), "QOA: 잘린 파일은 거절한다");
  Bytes bad = QOA_THREE;
  bad.push_back(std::byte{0});
  expect(!engine::audio::decode_qoa(bad), "QOA: 남는 바이트가 있으면 거절한다");
  bad = QOA_THREE;
  bad[8] = std::byte{2};
  expect(!engine::audio::decode_qoa(bad), "QOA: 스테레오는 읽지 않는다");
  bad = QOA_THREE;
  bad[7] = std::byte{4};
  expect(!engine::audio::decode_qoa(bad), "QOA: 파일 머리의 표본 수와 프레임의 표본 수가 다르면 거절한다");
  bad = QOA_THREE;
  bad[9] = bad[10] = bad[11] = std::byte{0};
  expect(!engine::audio::decode_qoa(bad), "QOA: 표본율 0 은 거절한다");
  bad = QOA_THREE;
  bad[4] = std::byte{0xFF};
  expect(!engine::audio::decode_qoa(bad), "QOA: 상한을 넘는 표본 수는 거절한다 (그만큼 잡지 않는다)");
}

/** 샘플 하나(QOA_THREE)짜리 뱅크 — 'ZKSB', 수 1, 머리(이름 24, 크기, 묶음, QOA 바이트 수), QOA */
Bytes bank_bytes(std::string_view name, float gain, uint32_t group) {
  Bytes b;
  put(b, {'Z', 'K', 'S', 'B'});
  put_u32(b, 1);
  put_name(b, name, 24);
  put_f32(b, gain);
  put_u32(b, group);
  put_u32(b, static_cast<uint32_t>(QOA_THREE.size()));
  b.insert(b.end(), QOA_THREE.begin(), QOA_THREE.end());
  return b;
}

void bank() {
  const Bytes bytes = bank_bytes("kick", 0.5f, 3);
  const auto bank = Bank::decode(bytes);
  expect(bank && bank->samples().size() == 1, "뱅크: 샘플 하나");
  if (bank && bank->samples().size() == 1) {
    const Sample& s = bank->samples()[0];
    expect(s.name == "kick" && s.rate == 44100 && s.gain == 0.5f && s.group == 3 && s.frames == std::vector<int16_t>{14336, 3104, 575}, "뱅크: 이름·표본율·크기·묶음과 푼 표본");
    expect(bank->find("kick") == 0u && !bank->find("snare"), "뱅크: 이름으로 번호를 찾고, 없는 이름은 없다");
  }
  for (std::size_t length = 0; length < bytes.size(); length++) expect(!Bank::decode(std::span{bytes}.first(length)), "뱅크: 잘린 바이트는 거절한다");
  Bytes bad = bytes;
  bad.push_back(std::byte{0});
  expect(!Bank::decode(bad), "뱅크: 남는 바이트가 있으면 거절한다");
  expect(!Bank::decode(bank_bytes("", 1.0f, 0)), "뱅크: 이름 없는 샘플은 거절한다");
  expect(!Bank::decode(bank_bytes("kick", std::nanf(""), 0)) && !Bank::decode(bank_bytes("kick", -1.0f, 0)) && !Bank::decode(bank_bytes("kick", 100.0f, 0)), "뱅크: 유한하지 않거나 범위 밖인 크기는 거절한다");
  expect(!Bank::decode(bank_bytes("kick", 1.0f, 256)), "뱅크: 범위 밖의 묶음은 거절한다");
  bad = bytes;
  bad[4] = std::byte{2};
  expect(!Bank::decode(bad), "뱅크: 적힌 수만큼 샘플이 없으면 거절한다");
  // 누르지 않은 소리 — 'zpcm', 표본율 22050(0x5622), 16 비트 표본 셋 (1, -2, 258)
  const auto raw = [](std::initializer_list<int> blob) {
    Bytes b;
    put(b, {'Z', 'K', 'S', 'B'});
    put_u32(b, 1);
    put_name(b, "shot", 24);
    put_f32(b, 1.0f);
    put_u32(b, 0);
    put_u32(b, static_cast<uint32_t>(blob.size()));
    put(b, blob);
    return b;
  };
  const auto plain = Bank::decode(raw({'z', 'p', 'c', 'm', 0x22, 0x56, 0, 0, 1, 0, 0xfe, 0xff, 2, 1}));
  expect(plain && plain->samples()[0].rate == 22050 && plain->samples()[0].frames == std::vector<int16_t>{1, -2, 258}, "뱅크: 누르지 않은 소리(zpcm)를 그대로 읽는다");
  expect(!Bank::decode(raw({'z', 'p', 'c', 'm', 0x22, 0x56, 0, 0, 1, 0, 0xfe})) && !Bank::decode(raw({'z', 'p', 'c', 'm', 0, 0, 0, 0, 1, 0})) && !Bank::decode(raw({'z', 'p', 'c', 'm', 0x22, 0x56})),
         "뱅크: 반 토막 난 표본, 표본율 0, 잘린 머리의 zpcm 은 거절한다");
  bad = bytes;
  bad[40] = std::byte{0xFF};
  expect(!Bank::decode(bad), "뱅크: 파일보다 긴 QOA 길이는 거절한다");
  Bytes empty;
  put(empty, {'Z', 'K', 'S', 'B', 0, 0, 0, 0});
  expect(Bank::decode(empty) && Bank::decode(empty)->samples().empty(), "뱅크: 샘플 없는 뱅크도 뱅크다");
}

/** 0.5, -0.5, 0.25, 0 — 1000 Hz */
Sample four() { return {.name = "four", .rate = 1000, .gain = 1.0f, .group = 0, .frames = {16384, -16384, 8192, 0}}; }

void sampler() {
  const Bank bank{{four()}};
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .pan = -1.0f});
    const auto out = render(mixer, 6);
    expect(same(channel(out, 0), {0.5f, -0.5f, 0.25f, 0.0f, 0.0f, 0.0f}), "제 속도로 틀면 샘플 그대로 나오고 끝나면 조용하다");
    expect(same(channel(out, 1), {0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f}) && mixer.voices() == 0, "왼쪽 끝에 둔 소리는 오른쪽에 없고, 다 울린 보이스는 비워진다");
  }
  {
    // 반 속도 — 사이 값은 네 점을 지나는 곡선의 가운데 (-p0 + 9·p1 + 9·p2 - p3) / 16 (샘플 밖은 0):
    //   0.5 자리 (0 + 4.5 - 4.5 - 0.25) / 16 = -0.015625 · 1.5 자리 (-0.5 - 4.5 + 2.25 - 0) / 16 = -0.171875
    //   2.5 자리 (0.5 + 2.25 + 0 - 0) / 16 = 0.171875 · 3.5 자리 (-0.25 + 0 + 0 - 0) / 16 = -0.015625
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .pitch = 0.5f, .pan = -1.0f});
    expect(same(channel(render(mixer, 9), 0), {0.5f, -0.015625f, -0.5f, -0.171875f, 0.25f, 0.171875f, 0.0f, -0.015625f, 0.0f}), "반 속도로 틀면 사이를 에르미트 곡선으로 메운다");
    // 출력 표본율이 샘플의 두 배면 같은 높이로 들리려고 반 속도로 읽는다
    Mixer twice(bank, 2000);
    twice.play({.sample = 0, .pan = -1.0f});
    expect(same(channel(render(twice, 9), 0), {0.5f, -0.015625f, -0.5f, -0.171875f, 0.25f, 0.171875f, 0.0f, -0.015625f, 0.0f}), "출력 표본율이 샘플의 두 배면 반 속도로 읽는다");
  }
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .pitch = 2.0f, .pan = -1.0f});
    expect(same(channel(render(mixer, 4), 0), {0.5f, 0.25f, 0.0f, 0.0f}), "두 배 속도로 틀면 표본을 하나씩 건너뛴다");
  }
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .gain = 0.5f, .pan = 1.0f});
    mixer.play({.sample = 0});
    const auto out = render(mixer, 2);
    // 가운데는 두 채널에 √½ (0.5 × 0.70710678 = 0.35355339), 오른쪽 끝의 반 크기 소리는 오른쪽에만 0.25
    expect(same(channel(out, 0), {0.35355339f, -0.35355339f}) && same(channel(out, 1), {0.60355339f, -0.60355339f}), "등전력 자리 — 가운데는 두 채널에 √½, 끝은 한 채널에 전부");
  }
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .pan = -1.0f, .delay = 5});
    expect(mixer.voices() == 1, "기다리는 소리도 보이스를 쓴다");
    expect(same(channel(render(mixer, 3), 0), {0.0f, 0.0f, 0.0f}), "기다리는 동안은 조용하다");
    expect(same(channel(render(mixer, 5), 0), {0.0f, 0.0f, 0.5f, -0.5f, 0.25f}), "블록이 나뉘어도 정확히 다섯 표본 뒤에 시작한다");
  }
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 1});
    mixer.play({.sample = 0, .bus = 2});
    mixer.play({.sample = 0, .pitch = std::nanf("")});
    mixer.play({.sample = 0, .pitch = 0.0f});
    mixer.play({.sample = 0, .gain = -1.0f});
    mixer.play({.sample = 0, .pan = std::nanf("")});
    expect(mixer.voices() == 0, "없는 샘플·줄기, 유한하지 않거나 범위 밖의 값은 소리를 걸지 않는다");
  }
}

/** 0.5 가 100 표본 이어지는 소리(묶음 1)와, 같은 묶음의 조용한 한 표본 */
Bank steady_bank() {
  return Bank{{{.name = "steady", .rate = 1000, .gain = 1.0f, .group = 1, .frames = std::vector<int16_t>(100, 16384)},
               {.name = "mute", .rate = 1000, .gain = 1.0f, .group = 1, .frames = {0}},
               {.name = "free", .rate = 1000, .gain = 1.0f, .group = 0, .frames = std::vector<int16_t>(100, 16384)}}};
}

void mixing() {
  const Bank bank = steady_bank();
  {
    // 1000 Hz 에서 끊는 길이는 4 ms = 4 표본: 남은 수 / 4 를 곱해 0.75, 0.5, 0.25, 0
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .pan = -1.0f});
    expect(same(channel(render(mixer, 3), 0), {0.5f, 0.5f, 0.5f}), "이어지는 소리");
    mixer.play({.sample = 1, .delay = 2});
    expect(same(channel(render(mixer, 8), 0), {0.5f, 0.5f, 0.375f, 0.25f, 0.125f, 0.0f, 0.0f, 0.0f}), "같은 묶음의 소리가 시작되는 표본에서 앞 소리가 4 표본에 걸쳐 줄며 끊긴다");
    expect(mixer.voices() == 0, "끊긴 보이스는 비워진다");
  }
  {
    // 길이를 준 소리 — 6 표본째(길이의 끝)부터 4 표본에 걸쳐 줄며 끊긴다: 다섯 표본은 그대로, 이어서 0.75, 0.5, 0.25, 0. 길이가 없으면(0) 샘플의 끝까지
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 0, .pan = -1.0f, .length = 6});
    expect(same(channel(render(mixer, 10), 0), {0.5f, 0.5f, 0.5f, 0.5f, 0.5f, 0.375f, 0.25f, 0.125f, 0.0f, 0.0f}) && mixer.voices() == 0, "길이를 준 소리는 그만큼 울리고 줄며 끊긴다");
    // 시작을 늦춘 소리의 길이는 시작한 뒤부터 센다
    mixer.play({.sample = 0, .pan = -1.0f, .delay = 2, .length = 3});
    expect(same(channel(render(mixer, 8), 0), {0.0f, 0.0f, 0.5f, 0.5f, 0.375f, 0.25f, 0.125f, 0.0f}), "늦게 시작한 소리의 길이");
  }
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 2, .pan = -1.0f});
    mixer.play({.sample = 1});
    expect(same(channel(render(mixer, 3), 0), {0.5f, 0.5f, 0.5f}), "묶음이 없는 소리는 끊기지 않는다");
  }
  {
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 2, .bus = 0, .gain = 0.5f, .pan = -1.0f});
    mixer.play({.sample = 2, .bus = 1, .pan = -1.0f});
    mixer.play({.sample = 2, .bus = 0, .pan = -1.0f, .delay = 50});
    render(mixer, 1);
    mixer.stop(0);
    // 줄기 1 의 0.5 는 그대로, 줄기 0 의 0.25 는 0.1875, 0.125, 0.0625, 0
    expect(same(channel(render(mixer, 5), 0), {0.6875f, 0.625f, 0.5625f, 0.5f, 0.5f}) && mixer.voices() == 1, "stop 은 그 줄기의 소리만 줄여 끊고, 기다리던 것은 버린다");
  }
  {
    // 줄기의 크기는 10 ms(1000 Hz 에서 10 표본)에 걸쳐 따라간다 — 표본마다 0.1
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 2, .pan = -1.0f});
    mixer.set_gain(0, 0.0f);
    const auto out = channel(render(mixer, 12), 0);
    expect(std::fabs(out[0] - 0.45f) < 1e-6f && std::fabs(out[4] - 0.25f) < 1e-6f && std::fabs(out[9]) < 1e-6f && out[10] == 0.0f && out[11] == 0.0f, "줄기의 크기를 0 으로 하면 10 ms 에 걸쳐 줄어 조용해진다");
    mixer.set_gain(1, 0.0f);
    mixer.play({.sample = 2, .bus = 1, .pan = -1.0f});
    render(mixer, 10);
    expect(same(channel(render(mixer, 2), 0), {0.0f, 0.0f}), "크기 0 인 줄기의 소리는 나오지 않는다");
  }
  {
    // 넘치는 값 — 0.8 까지는 그대로, 그 위는 0.8 + 0.2·tanh((x - 0.8) / 0.2): 2.0 은 0.8 + 0.2·tanh(6) = 0.99999754
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 2, .gain = 1.6f, .pan = -1.0f});
    expect(same(channel(render(mixer, 1), 0), {0.8f}), "0.8 까지는 눌리지 않는다");
    mixer.play({.sample = 2, .gain = 2.4f, .pan = -1.0f});
    expect(same(channel(render(mixer, 1), 0), {0.99999754f}), "넘치는 값은 1 밑으로 눌린다");
  }
  {
    // 보이스 48 개가 다 찼다 — 가장 작은 것(1/1024)을 뺏는다: 0.5 × (47/64 + 1/1024) 이던 것이 0.5 × 48/64 = 0.375 가 된다
    Mixer mixer(bank, 1000);
    mixer.play({.sample = 2, .gain = 1.0f / 1024.0f, .pan = -1.0f});
    for (int i = 0; i < 47; i++) mixer.play({.sample = 2, .gain = 1.0f / 64.0f, .pan = -1.0f});
    expect(mixer.voices() == 48 && same(channel(render(mixer, 1), 0), {0.5f * (47.0f / 64.0f + 1.0f / 1024.0f)}), "보이스 48 개");
    mixer.play({.sample = 2, .gain = 1.0f / 64.0f, .pan = -1.0f});
    expect(mixer.voices() == 48 && same(channel(render(mixer, 1), 0), {0.375f}), "빈 보이스가 없으면 가장 작게 울리는 것을 뺏는다");
  }
}

/** 한 판의 소리 — 높이·자리·묶음이 섞인 소리들을 걸고 1024 표본을 낸다. 가운데(512)에서 소리를 더 건다. 블록은 sizes 를 돌아가며 쓴다 */
std::vector<float> scene(const Bank& bank, std::initializer_list<std::size_t> sizes) {
  Mixer mixer(bank, 48000);
  std::vector<float> out(1024 * 2);
  const auto run = [&](std::size_t from, std::size_t to) {
    auto size = sizes.begin();
    while (from < to) {
      const std::size_t count = std::min(*size, to - from);
      mixer.render(std::span{out}.subspan(from * 2, count * 2));
      from += count;
      if (++size == sizes.end()) size = sizes.begin();
    }
  };
  mixer.play({.sample = 0, .pitch = 0.7f, .pan = -0.3f});
  mixer.play({.sample = 1, .pitch = 1.3f, .gain = 0.5f, .pan = 0.6f, .delay = 100});
  mixer.play({.sample = 0, .bus = 1, .pitch = 1.0f, .gain = 0.8f, .delay = 301});
  mixer.play({.sample = 1, .delay = 129});
  run(0, 512);
  mixer.set_gain(1, 0.25f);
  mixer.play({.sample = 1, .pitch = 0.9f, .delay = 7});
  mixer.play({.sample = 0, .bus = 1, .pan = 1.0f, .delay = 300});
  run(512, 1024);
  return out;
}

void block_split() {
  // 뒤섞인 표본 300 개짜리 샘플 둘 (44.1 kHz — 48 kHz 출력에서 자리가 소수로 나아간다). 둘째는 묶음이 있어 서로 끊는다
  std::vector<int16_t> noise(300);
  uint32_t seed = 12345;
  for (int16_t& value : noise) value = static_cast<int16_t>((seed = seed * 1664525u + 1013904223u) >> 16);
  const Bank bank{{{.name = "a", .rate = 44100, .gain = 1.0f, .group = 0, .frames = noise}, {.name = "b", .rate = 44100, .gain = 0.7f, .group = 2, .frames = noise}}};
  const auto whole = scene(bank, {1024});
  const auto quanta = scene(bank, {128});
  const auto ragged = scene(bank, {1, 37, 500, 3});
  bool sounding = false;
  for (const float value : whole) sounding |= value != 0.0f;
  expect(sounding, "한 번에 낸 출력에 소리가 있다");
  expect(std::memcmp(whole.data(), quanta.data(), whole.size() * sizeof(float)) == 0, "128 표본씩 쪼개 낸 것이 한 번에 낸 것과 비트까지 같다");
  expect(std::memcmp(whole.data(), ragged.data(), whole.size() * sizeof(float)) == 0, "들쭉날쭉하게 쪼개 내도 비트까지 같다");
}

struct NoteBytes {
  uint32_t tick, sample;
  float pitch{1.0f}, gain{1.0f}, pan{-1.0f};
  uint32_t length{};
};
struct LayerBytes {
  std::string_view name;
  std::vector<NoteBytes> notes;
};
/** .song — 'ZKSG', 초당 틱 수, 되풀이 길이, 마디 길이, 층 수, 층마다 [이름 16, 음 수, 음마다 (자리, 샘플, 길이, 높이, 크기, 자리)] */
Bytes song_bytes(uint32_t tick_rate, uint32_t loop, uint32_t bar, const std::vector<LayerBytes>& layers) {
  Bytes b;
  put(b, {'Z', 'K', 'S', 'G'});
  for (const uint32_t value : {tick_rate, loop, bar, static_cast<uint32_t>(layers.size())}) put_u32(b, value);
  for (const LayerBytes& layer : layers) {
    put_name(b, layer.name, 16);
    put_u32(b, static_cast<uint32_t>(layer.notes.size()));
    for (const NoteBytes& note : layer.notes) {
      put_u32(b, note.tick);
      put_u32(b, note.sample);
      put_u32(b, note.length);
      put_f32(b, note.pitch);
      put_f32(b, note.gain);
      put_f32(b, note.pan);
    }
  }
  return b;
}

/** 0 이 아닌 왼쪽 표본들의 (자리, 값) */
struct Peak {
  uint64_t frame;
  float value;
  bool operator==(const Peak&) const = default;
};

/** 표본 하나짜리 딸깍(0.5 와 0.25)이 든 뱅크 — rate 는 출력과 같게 둬 딸깍이 한 표본에만 놓인다 */
Bank click_bank(uint32_t rate) {
  return Bank{{{.name = "half", .rate = rate, .gain = 1.0f, .group = 0, .frames = {16384}}, {.name = "quarter", .rate = rate, .gain = 1.0f, .group = 0, .frames = {8192}}}};
}

/** frames 표본을 block 씩 내며 딸깍을 모은다. 표본 at 을 내기 바로 앞에 between 을 부른다 */
template <typename Between>
std::vector<Peak> play_song(Sequencer& sequencer, Mixer& mixer, uint64_t from, uint64_t frames, uint32_t block, uint64_t at, Between between) {
  std::vector<Peak> peaks;
  std::vector<float> out(static_cast<std::size_t>(block) * 2);
  for (uint64_t frame = from; frame < from + frames; frame += block) {
    if (frame == at) between();
    sequencer.run(mixer, frame, block);
    mixer.render(out);
    for (uint32_t i = 0; i < block; i++)
      if (out[i * 2] != 0.0f) peaks.push_back({frame + i, out[i * 2]});
  }
  return peaks;
}

void sequencer() {
  // 한 박 40 틱(초당 60 틱 — 90 BPM), 네 박 한 마디. 박마다 딸깍 하나
  const Bytes beats = song_bytes(60, 160, 160, {{"beat", {{0, 0}, {40, 0}, {80, 0}, {120, 0}}}});
  const auto song = Song::decode(beats, 2);
  expect(song && song->tick_rate == 60 && song->loop_ticks == 160 && song->bar_ticks == 160 && song->layers.size() == 1 && song->layers[0].notes.size() == 4, "곡: 머리와 층 하나, 음 넷");
  if (!song) return;
  expect(song->layer("beat") == 0u && !song->layer("snare"), "곡: 이름으로 층을 찾는다");
  // 음의 길이(틱) — 0 은 샘플의 끝까지. 되풀이 구간보다 긴 길이는 받지 않는다
  const auto held = Song::decode(song_bytes(60, 160, 160, {{"a", {{0, 0, 1.0f, 1.0f, 0.0f, 20}, {40, 1}}}}), 2);
  expect(held && held->layers[0].notes[0].length == 20 && held->layers[0].notes[1].length == 0, "곡: 음의 길이");
  expect(!Song::decode(song_bytes(60, 160, 160, {{"a", {{0, 0, 1.0f, 1.0f, 0.0f, 161}}}}), 2), "곡: 되풀이 구간보다 긴 음은 받지 않는다");
  {
    // 48 kHz — 틱 하나가 800 표본, 박 k 는 32000·k
    const Bank bank = click_bank(48000);
    Mixer mixer(bank, 48000);
    Sequencer sequencer(*song, 48000, 0);
    sequencer.set_layer(0, true);
    expect(play_song(sequencer, mixer, 0, 4096, 128, 0, [] {}).empty(), "놓기 전에는 아무 음도 내지 않는다");
    sequencer.locate(4096, 0);
    const auto peaks = play_song(sequencer, mixer, 4096, 200000, 128, 0, [] {});
    expect(peaks == std::vector<Peak>{{4096, 0.5f}, {4096 + 32000, 0.5f}, {4096 + 64000, 0.5f}, {4096 + 96000, 0.5f}, {4096 + 128000, 0.5f}, {4096 + 160000, 0.5f}, {4096 + 192000, 0.5f}},
           "48 kHz 에서 박 k 는 놓은 자리에서 32000·k 표본 뒤에 울리고, 마디가 되풀이된다");
  }
  {
    // 44.1 kHz — 틱 하나가 735 표본, 박 k 는 29400·k. 블록 크기가 달라도 같은 자리
    const Bank bank = click_bank(44100);
    Mixer mixer(bank, 44100);
    Sequencer sequencer(*song, 44100, 0);
    sequencer.set_layer(0, true);
    sequencer.locate(0, 0);
    expect(play_song(sequencer, mixer, 0, 90000, 1000, 0, [] {}) == std::vector<Peak>{{0, 0.5f}, {29400, 0.5f}, {58800, 0.5f}, {88200, 0.5f}}, "44.1 kHz 에서 박 k 는 29400·k");
  }
  {
    // 곡의 틱 20 을 표본 1000 에 놓는다 — 틱 40 은 1000 + 20·800 = 17000, 틱 80 은 49000. 그 앞(틱 0)의 음은 내지 않는다
    const Bank bank = click_bank(48000);
    Mixer mixer(bank, 48000);
    Sequencer sequencer(*song, 48000, 0);
    sequencer.set_layer(0, true);
    expect(!sequencer.frame_at(40), "놓기 전에는 틱의 자리가 없다");
    sequencer.locate(1000, 20);
    expect(sequencer.frame_at(20) == 1000u && sequencer.frame_at(40) == 17000u && sequencer.frame_at(160) == 113000u && !sequencer.frame_at(19), "틱이 울리는 표본 — 놓은 틱보다 앞은 없다");
    const auto peaks = play_song(sequencer, mixer, 1000, 50000, 500, 20000, [&] { sequencer.stop(); });
    expect(peaks == std::vector<Peak>{{17000, 0.5f}}, "곡의 가운데를 줄기의 한 표본에 놓고, stop 뒤로는 내지 않는다");
  }
  {
    // 층 둘 — a 는 마디의 머리에 0.5, b 는 머리와 가운데(틱 80)에 0.25. b 를 마디 가운데에서 켜고 끈다
    const auto two = Song::decode(song_bytes(60, 160, 160, {{"a", {{0, 0}}}, {"b", {{0, 1}, {80, 1}}}}), 2);
    expect(two.has_value(), "곡: 층 둘");
    if (two) {
      const Bank bank = click_bank(48000);
      Mixer mixer(bank, 48000);
      Sequencer sequencer(*two, 48000, 0);
      sequencer.set_layer(0, true);
      sequencer.locate(0, 0);
      // 틱 60(표본 48000)에 b 를 켠다 — 이 마디의 틱 80 에는 아직 없고, 다음 마디(틱 160 = 표본 128000)부터 난다
      auto peaks = play_song(sequencer, mixer, 0, 256000, 1000, 48000, [&] { sequencer.set_layer(1, true); });
      expect(peaks == std::vector<Peak>{{0, 0.5f}, {128000, 0.75f}, {192000, 0.25f}}, "층은 다음 마디의 머리에서 켜진다");
      // 틱 340(표본 272000)에 b 를 끈다 — 이 마디(틱 320…)는 끝까지 나고(틱 400 의 0.25), 다음 마디(틱 480 = 표본 384000)부터 없다
      peaks = play_song(sequencer, mixer, 256000, 200000, 1000, 272000, [&] { sequencer.set_layer(1, false); });
      expect(peaks == std::vector<Peak>{{256000, 0.75f}, {320000, 0.25f}, {384000, 0.5f}}, "층은 다음 마디의 머리에서 꺼진다");
    }
  }

  for (std::size_t length = 0; length < beats.size(); length++) expect(!Song::decode(std::span{beats}.first(length), 2), "곡: 잘린 바이트는 거절한다");
  Bytes bad = beats;
  bad.push_back(std::byte{0});
  expect(!Song::decode(bad, 2), "곡: 남는 바이트가 있으면 거절한다");
  expect(!Song::decode(beats, 0), "곡: 뱅크에 없는 샘플을 가리키면 거절한다");
  expect(!Song::decode(song_bytes(60, 160, 160, {{"x", {{40, 0}, {0, 0}}}}), 2), "곡: 음이 자리 차례가 아니면 거절한다");
  expect(!Song::decode(song_bytes(60, 160, 160, {{"x", {{160, 0}}}}), 2), "곡: 되풀이 구간 밖의 음은 거절한다");
  expect(!Song::decode(song_bytes(60, 150, 160, {}), 2) && !Song::decode(song_bytes(60, 160, 0, {}), 2) && !Song::decode(song_bytes(0, 160, 160, {}), 2), "곡: 마디의 배수가 아닌 길이, 0 인 마디·틱 수는 거절한다");
  expect(!Song::decode(song_bytes(60, 160, 160, {{"", {}}}), 2), "곡: 이름 없는 층은 거절한다");
  expect(!Song::decode(song_bytes(60, 160, 160, {{"x", {{0, 0, std::nanf("")}}}}), 2) && !Song::decode(song_bytes(60, 160, 160, {{"x", {{0, 0, 1.0f, 99.0f}}}}), 2) &&
             !Song::decode(song_bytes(60, 160, 160, {{"x", {{0, 0, 1.0f, 1.0f, 2.0f}}}}), 2),
         "곡: 유한하지 않거나 범위 밖인 높이·크기·자리는 거절한다");
}

void playback_clock() {
  engine::audio::Clock clock(48000);
  expect(!clock.live(0.0, 250.0) && clock.estimate(100.0, 9999) == 0, "통지가 없으면 돌지 않고, 가져간 양은 0 이다");
  // 10 ms 에 480 표본 — 늦지 않은 통지 (480 - 48·10 = 0)
  clock.notify(480, 10.0);
  expect(clock.live(200.0, 250.0) && !clock.live(300.0, 250.0), "마지막 통지에서 250 ms 안쪽이면 돌고 있다");
  expect(clock.estimate(20.0, 100000) == 960, "통지 뒤 10 ms 가 지났으면 480 표본을 더 가져갔다");
  // 5 ms 늦게 닿은 통지 (960 표본은 20 ms 의 것인데 25 ms 에 닿았다: 960 - 1200 = -240) — 덜 늦은 앞 통지가 기준으로 남는다
  clock.notify(960, 25.0);
  expect(clock.estimate(30.0, 100000) == 1440, "늦게 닿은 통지는 어림을 늦추지 않는다");
  expect(clock.estimate(28.0, 100000) == 1440, "어림은 뒤로 가지 않는다");
  expect(clock.estimate(40.0, 1500) == 1500, "써 넣은 양을 넘지 않는다");
  // peek 는 어림만 한다 — 써 넣은 양으로 막지 않고(40 ms 면 1920), 뒤로 가지 않게 잡아 둔 값(1500)도 건드리지 않는다
  expect(clock.peek(40.0) == 1920 && clock.peek(28.0) == 1344 && clock.estimate(40.0, 1400) == 1500, "peek 는 지금 장치가 있을 자리만 어림한다");
  expect(engine::audio::Clock(48000).peek(40.0) == 0, "통지가 없으면 peek 도 0 이다");
  expect(clock.estimate(40.0, 1400) == 1500, "써 넣은 양이 줄어 보여도 뒤로 가지 않는다");
  // 장치가 앞서 간 것이 드러나면(더 큰 값) 그것이 새 기준이다: 50 ms 에 2640 (2640 - 2400 = 240)
  clock.notify(2640, 50.0);
  expect(clock.estimate(60.0, 100000) == 3120, "덜 늦은 통지가 오면 그것이 기준이 된다");
  // 창(64)보다 오래된 통지는 잊는다 — 그 뒤로 기준이 낮은 통지만 64 번 오면 그 기준을 따른다 (어림 자체는 뒤로 가지 않는다)
  for (int i = 0; i < 64; i++) clock.notify(static_cast<uint64_t>(48.0 * (100.0 + i)), 100.0 + i);
  expect(clock.estimate(200.0, 100000) == 9600, "오래된 통지는 창 밖으로 밀려난다");
}

}  // namespace

int main() {
  qoa();
  bank();
  sampler();
  mixing();
  block_split();
  sequencer();
  playback_clock();
  if (failures == 0) std::printf("audio_probe: ok\n");
  return failures == 0 ? 0 : 1;
}
