#pragma once

#include <algorithm>
#include <cstdint>

// 리듬 규칙 — 박자는 틱으로 센다 (시뮬레이션이 고정 틱이라 어디서나 같은 박자다). 엔진의 렌더·GPU 를 모른다 (서버도 같은 코드로 판정한다).
// 발사·재장전·대시만 박자에 묶인다: 박(온박)과 그 사이의 반박마다 칸이 하나 있고, 누른 행동은 누른 때에서 가장 가까운 칸의 머리에서 벗어난 정도로 판정한다
// (사용자 결정 2026-10-09 — "박자 때문에 안 나가는 행동은 없다"던 앞선 규칙을 뒤집었다: 박을 크게 벗어난 누름은 나가지 않는다).
//   정박 (머리에서 ±ON_BEAT_WINDOW 안): 나가고, 연속 수가 오른다.
//   어긋남 (그 밖, ±ACT_WINDOW 안): 나가되 연속 수는 그대로다.
//   미스 (그 밖): 나가지 않는다 — 배수가 한 단계 내려가고(streak_after_miss), 그 칸은 쓰지 않는다.
// 무기의 행동(발사·재장전)은 한 칸에 하나만 든다. 대시는 무기와 칸을 나눠 쓰지 않는다 (제 쿨다운만 있다).
namespace game {

/** 초당 틱 수 */
inline constexpr uint32_t TICK_RATE = 60;
/** 한 박의 길이 (틱) — 90 BPM. 반박은 그 절반 (분당 180 칸) */
inline constexpr uint32_t TICKS_PER_BEAT = 40;
inline constexpr uint32_t TICKS_PER_SLOT = TICKS_PER_BEAT / 2;
/** 정박의 창 — 칸의 머리에서 앞뒤로 이 틱 수 안(±67 ms)에 누른 행동만 박에 맞았다: 연속 수를 올린다 */
inline constexpr uint32_t ON_BEAT_WINDOW = 4;
/** 행동이 나가는 창 — 칸의 머리에서 앞뒤로 이 틱 수 안(±117 ms). 그 밖(칸과 칸 사이의 5 틱, 한 칸의 1/4)에 누른 것은 미스다 */
inline constexpr uint32_t ACT_WINDOW = 7;
/** 배수 한 단계에 드는 연속 수, 가장 높은 배수 */
inline constexpr uint32_t STREAK_PER_MULTIPLIER = 10;
inline constexpr uint32_t MAX_MULTIPLIER = 4;

/** 그 틱에서 가장 가까운 칸(반박 번호, 0 이 첫 박) — 두 칸의 한가운데는 뒤의 칸이다 */
constexpr uint64_t slot_at(uint64_t tick) { return (tick + TICKS_PER_SLOT / 2) / TICKS_PER_SLOT; }
/** 그 틱이 가장 가까운 칸의 머리에서 벗어난 틱 수 — 음수면 일렀고(머리 앞) 양수면 늦었다. -TICKS_PER_SLOT/2 … TICKS_PER_SLOT/2 - 1 */
constexpr int32_t slot_offset(uint64_t tick) {
  return static_cast<int32_t>(static_cast<int64_t>(tick) - static_cast<int64_t>(slot_at(tick) * TICKS_PER_SLOT));
}
/** 누른 때의 판정 — 정박(나가고 연속 수가 오른다) · 어긋남(나가되 연속 수는 그대로) · 미스(나가지 않는다) */
enum class Verdict : uint8_t { on_beat, off_beat, miss };
/** 그 틱에 누른 행동의 판정 */
constexpr Verdict verdict_at(uint64_t tick) {
  const int32_t offset = slot_offset(tick);
  const uint32_t apart = static_cast<uint32_t>(offset < 0 ? -offset : offset);
  return apart <= ON_BEAT_WINDOW ? Verdict::on_beat : apart <= ACT_WINDOW ? Verdict::off_beat : Verdict::miss;
}

/** 그 틱이 박(온박)의 머리인가 — 적은 여기서만 공격을 시작한다 */
constexpr bool beat_head(uint64_t tick) { return tick % TICKS_PER_BEAT == 0; }
/** 지금 박 안에서의 위치 0..1 */
constexpr float beat_phase(uint64_t tick) { return static_cast<float>(tick % TICKS_PER_BEAT) / static_cast<float>(TICKS_PER_BEAT); }

/** 배수 — 박자에 맞춰 이어 간 행동 수 0–9 는 1, 10–19 는 2, 20–29 는 3, 30 부터 4 */
constexpr uint32_t multiplier(uint32_t streak) { return 1 + std::min(streak / STREAK_PER_MULTIPLIER, MAX_MULTIPLIER - 1); }
/** 미스 뒤의 연속 수 — 배수가 한 단계 내려가 그 단계의 처음이 된다 (x3 의 27 → x2 의 10, x4 의 45 → x3 의 20). x1 이면 0 */
constexpr uint32_t streak_after_miss(uint32_t streak) {
  const uint32_t now = multiplier(streak);
  return now >= 2 ? (now - 2) * STREAK_PER_MULTIPLIER : 0;
}

}  // namespace game
