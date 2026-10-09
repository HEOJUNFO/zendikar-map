#pragma once

#include <cstddef>
#include <cstdint>
#include <span>

// GPU 접근 인터페이스 — 엔진과 게임은 이 헤더만 본다. 백엔드는 WebGPU 하나다 (webgpu/, app/ 이 만든다).
// 모양도 WebGPU 를 따른다: 파이프라인은 만든 뒤 바뀌지 않고, 버퍼는 크기가 고정이며,
// 정점 배치는 파이프라인에 적고, uniform 은 @group(0) 의 @binding 번호로 건다.
// 클립 공간은 WebGPU 규약이다 (y 위쪽, z 0..1).
namespace engine::gpu {

struct BufferHandle {
  uint32_t id{};
  explicit operator bool() const { return id != 0; }
};
struct ShaderHandle {
  uint32_t id{};
  explicit operator bool() const { return id != 0; }
};
struct PipelineHandle {
  uint32_t id{};
  explicit operator bool() const { return id != 0; }
};
struct ComputePipelineHandle {
  uint32_t id{};
  explicit operator bool() const { return id != 0; }
};

/** 버퍼가 쓰일 자리. storage 는 컴퓨트·셰이더가 배열로 읽고 쓰는 버퍼다 */
enum class BufferUsage { vertex, uniform, storage };

struct BufferDesc {
  BufferUsage usage;
  /** 바이트, 4 의 배수. 만든 뒤 바뀌지 않는다 */
  std::size_t size;
  /** 처음 내용 (size 바이트). 없으면 비워 둔다 */
  const void* initial{};
};

/** 셰이더 모듈 하나 — WGSL. 그리기 파이프라인의 진입점은 vs_main · fs_main, 컴퓨트는 파이프라인을 만들 때 이름으로 고른다 */
struct ShaderDesc {
  const char* wgsl;
};

/** float 속성 하나 — WGSL 의 @location(n) */
struct VertexAttribute {
  uint32_t location;
  uint32_t components;
  uint32_t offset;
};

enum class VertexStep { vertex, instance };

struct VertexBufferLayout {
  uint32_t stride;
  VertexStep step;
  std::span<const VertexAttribute> attributes;
};

/** 삼각형 목록을 그리는 파이프라인 */
struct PipelineDesc {
  ShaderHandle shader;
  /** draw 의 vertex_buffers 와 같은 순서 */
  std::span<const VertexBufferLayout> vertex_buffers;
  /** 깊이를 견주고 쓴다. 끄면 그린 차례대로 덮는다 (화면 위 2D) */
  bool depth_test;
};

/** @group(0) 의 @binding 번호에 거는 버퍼 (uniform·storage). 그 파이프라인의 셰이더 진입점이 실제로 쓰는 번호만, 빠짐없이 준다 */
struct BufferBinding {
  uint32_t binding;
  BufferHandle buffer;
};

struct DrawCall {
  PipelineHandle pipeline;
  std::span<const BufferHandle> vertex_buffers;
  std::span<const BufferBinding> bindings;
  uint32_t vertex_count;
  uint32_t instance_count;
};

struct ComputeCall {
  ComputePipelineHandle pipeline;
  std::span<const BufferBinding> bindings;
  /** x 방향 작업 묶음 수 */
  uint32_t workgroups;
};

struct ClearColor {
  float red, green, blue;
};

/**
 * 캔버스 하나에 그리는 장치. 실패한 create_* 는 빈 핸들을 돌려주고 까닭을 로그로 낸다.
 * 만든 자원은 장치와 함께 없어진다
 */
class Device {
 public:
  virtual ~Device() = default;

  /** 그리는 버퍼 크기 (기기 픽셀) */
  virtual void resize(uint32_t width, uint32_t height) = 0;
  virtual uint32_t width() const = 0;
  virtual uint32_t height() const = 0;

  virtual BufferHandle create_buffer(const BufferDesc& desc) = 0;
  /**
   * 처음부터 덮어쓴다 (크기는 4 의 배수). 버퍼 크기를 넘는 쓰기는 하지 않고 로그를 낸다.
   * 한 프레임에 버퍼 하나는 한 번만 쓴다 — 그리기마다가 아니라 프레임을 내보낼 때의 내용으로 그려진다
   */
  virtual void write_buffer(BufferHandle buffer, std::span<const std::byte> bytes) = 0;
  virtual ShaderHandle create_shader(const ShaderDesc& desc) = 0;
  virtual PipelineHandle create_pipeline(const PipelineDesc& desc) = 0;
  virtual ComputePipelineHandle create_compute_pipeline(ShaderHandle shader, const char* entry_point) = 0;

  /** 컴퓨트 호출들을 차례대로 돌린다 — 앞 호출이 쓴 것을 뒤 호출이 본다. begin_frame 과 end_frame 사이에서는 부르지 않는다 */
  virtual void compute(std::span<const ComputeCall> calls) = 0;

  /** 캔버스에 그리는 패스를 연다 — 색과 깊이를 지운다. draw 는 begin_frame 과 end_frame 사이에서만 부른다 */
  virtual void begin_frame(ClearColor clear) = 0;
  virtual void draw(const DrawCall& call) = 0;
  virtual void end_frame() = 0;
};

}  // namespace engine::gpu
