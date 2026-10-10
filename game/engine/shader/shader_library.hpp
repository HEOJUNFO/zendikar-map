#pragma once

#include <cstdint>
#include <vector>

#include "engine/gpu/device.hpp"
#include "engine/shader/shader_package.hpp"

namespace engine {

/** ShaderLibrary::add 가 준 번호 */
struct ShaderId {
  uint32_t index;
};

/**
 * 등록된 셰이더 패키지와 장치에 올린 셰이더. 처음 쓰일 때 한 번 올려 둔다 (실패도 기억해 다시 시도하지 않는다).
 * 장치 하나에 하나씩 둔다 — 장치보다 먼저 없어져야 한다
 */
class ShaderLibrary {
 public:
  explicit ShaderLibrary(gpu::Device& device) : device_(device) {}

  /** 패키지는 라이브러리보다 오래 살아야 한다 (빌드에 묻힌 상수). 이미 넣은 패키지면 그 번호를 돌려준다 */
  ShaderId add(const ShaderPackage& package);
  /** 컴파일에 실패한 셰이더면 빈 핸들 */
  gpu::ShaderHandle resolve(ShaderId id);

 private:
  struct Entry {
    const ShaderPackage* package;
    gpu::ShaderHandle shader;
    bool tried;
  };
  gpu::Device& device_;
  std::vector<Entry> entries_;
};

}  // namespace engine
