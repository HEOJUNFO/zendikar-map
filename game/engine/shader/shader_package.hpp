#pragma once

#include "engine/gpu/device.hpp"

namespace engine {

/**
 * 셰이더 하나의 빌드 산출물 — 원본은 WGSL 이고, tools/shaderc.mjs 가 빌드 때 이 모양의 상수로 만든다.
 * 엔진은 패키지의 모양만 안다. 어떤 셰이더가 있는지는 패키지를 등록하는 쪽이 정한다.
 */
struct ShaderPackage {
  const char* name;
  gpu::ShaderDesc code;
};

}  // namespace engine
