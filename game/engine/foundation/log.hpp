#pragma once

// 진단 출력 — 브라우저 Worker 와 Node 양쪽 콘솔로 나간다.
// stdio 는 쓰지 않는다: 클라이언트 빌드는 VeilBind 가 WASI 출력을 막아 둬 printf 가 조용히 사라진다.
namespace engine {

void log_info(const char* format, ...) __attribute__((format(printf, 1, 2)));
void log_error(const char* format, ...) __attribute__((format(printf, 1, 2)));

}  // namespace engine
