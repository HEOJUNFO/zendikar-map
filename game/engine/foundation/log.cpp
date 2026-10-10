#include "engine/foundation/log.hpp"

#include <emscripten/console.h>

#include <cstdarg>
#include <cstdio>

namespace engine {
namespace {

void emit(void (*sink)(const char*), const char* format, va_list args) {
  char text[1024];
  std::vsnprintf(text, sizeof(text), format, args);
  sink(text);
}

}  // namespace

void log_info(const char* format, ...) {
  va_list args;
  va_start(args, format);
  emit(emscripten_console_log, format, args);
  va_end(args);
}

void log_error(const char* format, ...) {
  va_list args;
  va_start(args, format);
  emit(emscripten_console_error, format, args);
  va_end(args);
}

}  // namespace engine
