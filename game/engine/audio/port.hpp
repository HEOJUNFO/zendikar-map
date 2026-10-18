#pragma once

#include <cstdint>
#include <span>

// 출력 통로 — 섞은 소리를 출력 장치로 내보내는 길 하나. 호스트(브라우저 주 스레드)가 오디오 출력에 이어 둔 핸들(MessagePort)을
// 캔버스처럼 이 Worker 로 넘겨 Module.audioPort 에 걸어 두고(host/worker-adapter.ts), 여기서 그 핸들에 직접 쓴다.
// 줄기는 표본의 절대 번호로 센다: 장치는 번호 차례로 가져가고(써 넣지 않은 자리는 조용하다), 어디까지 가져갔는지를 몇 ms 마다 알려 온다 —
// 그 통지가 다음 블록을 만들 때다. 타이머로 물어 보지 않는다. 무엇을 내보내는지(음악, 효과음)는 모른다.
namespace engine::audio {

struct PortEvents {
  /**
   * 장치가 줄기의 표본 consumed 앞까지 가져갔다. underruns 는 써 넣은 것이 모자라 조용히 지나간 표본의 누적 수,
   * at_ms 는 이 통지가 닿은 시각 (now_ms 와 같은 시계)
   */
  void (*consumed)(uint64_t consumed, uint64_t underruns, double at_ms, void* user);
  void* user;
};

class Port {
 public:
  Port() = default;
  ~Port() { close(); }
  Port(const Port&) = delete;
  Port& operator=(const Port&) = delete;

  /** 통지를 받기 시작한다. 호스트가 핸들을 넘기지 않았으면(소리 출력을 열지 못했다) false — 통지는 오지 않는다. 통로는 프로그램에 하나다 */
  bool open(PortEvents events);
  /** 줄기의 표본 start 부터 놓일 소리 (스테레오 인터리브). 이미 지나간 자리의 표본은 장치가 버린다 */
  void write(uint64_t start, std::span<const float> interleaved);
  void close();

 private:
  bool open_{};
};

/** 지금 시각 (ms) — 통지의 at_ms 와 같은 시계 */
double now_ms();

}  // namespace engine::audio
