#pragma once

#include <memory>

#include "engine/gpu/device.hpp"

namespace engine::gpu {

/** 장치가 준비되면 불린다. 만들지 못했으면 nullptr (까닭은 로그로 나간다) */
using DeviceReady = void (*)(std::unique_ptr<Device> device, void* user);

/**
 * WebGPU 장치를 요청한다 — 어댑터·장치를 받는 일이 비동기라 결과는 나중에 ready 로 온다 (꼭 한 번).
 * canvas_target 은 플랫폼이 캔버스를 걸어 둔 이름이다
 */
void request_webgpu_device(const char* canvas_target, DeviceReady ready, void* user);

}  // namespace engine::gpu
