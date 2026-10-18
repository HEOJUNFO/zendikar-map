#include "engine/shader/shader_library.hpp"

#include "engine/foundation/log.hpp"

namespace engine {

ShaderId ShaderLibrary::add(const ShaderPackage& package) {
  for (uint32_t index = 0; index < entries_.size(); index++)
    if (entries_[index].package == &package) return {index};
  entries_.push_back({&package, {}, false});
  return {static_cast<uint32_t>(entries_.size() - 1)};
}

gpu::ShaderHandle ShaderLibrary::resolve(ShaderId id) {
  Entry& entry = entries_[id.index];
  if (!entry.tried) {
    entry.tried = true;
    entry.shader = device_.create_shader(entry.package->code);
    if (!entry.shader) log_error("[shader] '%s' 를 쓸 수 없다", entry.package->name);
  }
  return entry.shader;
}

}  // namespace engine
