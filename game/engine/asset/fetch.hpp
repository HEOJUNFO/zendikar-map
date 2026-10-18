#pragma once

#include <cstddef>
#include <vector>

// 받기 — 주소 하나의 바이트를 통째로 받는다 (브라우저의 fetch, Worker 안에서 바로 부른다). 받은 것이 무엇인지는 모른다.
// 결과는 브라우저가 다 받았을 때(또는 실패했을 때) 한 번 불리는 콜백으로 온다 — 상태를 물어 보며 기다리지 않는다.
namespace engine::asset {

struct FetchEvents {
  /**
   * 다 받았다 (ok) 또는 받지 못했다 (!ok — 연결 실패, 2xx 가 아닌 응답, 상한을 넘는 크기. bytes 는 비어 있다).
   * 받은 바이트는 믿을 수 없는 데이터다 — 읽는 쪽이 검증한다
   */
  void (*done)(std::vector<std::byte> bytes, bool ok, void* user);
  void* user;
};

/**
 * url 을 받기 시작한다 — 한 번에 하나만: 앞선 받기가 끝나지 않았으면 false (콜백은 오지 않는다).
 * max_bytes 보다 큰 응답은 메모리에 올리지 않고 실패로 알린다
 */
bool fetch(const char* url, std::size_t max_bytes, FetchEvents events);
/** 받고 있는 것의 결과를 받지 않는다 (받는 쪽이 없어질 때) — 콜백이 오지 않는다 */
void cancel_fetch();

}  // namespace engine::asset
