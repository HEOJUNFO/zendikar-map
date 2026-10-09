#pragma once

#include <cstddef>
#include <cstdint>
#include <span>

// GPU 접근 인터페이스 — 엔진과 게임은 이 헤더만 본다. 백엔드는 WebGPU 하나다 (webgpu/, app/ 이 만든다).
// 모양도 WebGPU 를 따른다: 파이프라인은 만든 뒤 바뀌지 않고, 버퍼는 크기가 고정이며,
// 정점 배치는 파이프라인에 적고, uniform·텍스처·샘플러는 @group(0) 의 @binding 번호로 건다.
// 클립 공간은 WebGPU 규약이다 (y 위쪽, z 0..1).
//
// 프레임은 패스 둘이다: 장면 패스(색 + 깊이의 렌더 타깃 — 크기와 다중 표본을 프레임마다 정할 수 있다)와 캔버스 패스(깊이 없음, 화면 해상도).
// 장면은 타깃에 그린 뒤 캔버스 패스에서 텍스처로 읽어 화면에 올리고(scene_texture — engine/render/present_batch), 그 위에 화면 위 2D 를 화면 해상도로 그린다.
// 장면이 없는 프레임(메뉴)은 캔버스 패스만 연다.
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
struct TextureHandle {
  uint32_t id{};
  explicit operator bool() const { return id != 0; }
};
struct SamplerHandle {
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

/**
 * 텍스처의 픽셀 형식 — r8 은 한 픽셀 한 바이트(셰이더에서 .r 이 0..1), rgba8 은 네 바이트(빨강·초록·파랑·알파, 저마다 0..1 — 색 공간을 바꾸지 않는다),
 * rgba8_srgb 는 같은 네 바이트지만 색(rgb)이 sRGB 로 적힌 것이다: 셰이더가 읽을 때 선형 빛으로 바뀌고, 픽셀 사이를 메우는 것도 선형 빛에서 한다
 */
enum class TextureFormat { r8, rgba8, rgba8_srgb };

/** 2D 텍스처, 또는 같은 크기의 2D 텍스처 여러 장(층)을 묶은 배열. 크기와 형식은 만든 뒤 바뀌지 않는다 */
struct TextureDesc {
  uint32_t width;
  uint32_t height;
  /** 처음 내용 — width × height × (픽셀의 바이트 수) 바이트, 윗줄부터 (층 0, 밉 0 에 쓴다). 비워 두면 write_texture 로 채운다 */
  std::span<const std::byte> pixels;
  TextureFormat format{TextureFormat::r8};
  /** 밉 단계 수 — 단계 n 의 크기는 max(1, 변 >> n). 1 이면 밉이 없다 */
  uint32_t mip_levels{1};
  /** 0 이면 2D 텍스처 한 장 (WGSL 의 texture_2d<f32>), 1 이상이면 그 수만큼의 층을 가진 배열 (texture_2d_array<f32>) */
  uint32_t layers{};
};

/** 텍스처를 읽을 때 픽셀 사이를 메우는 방법 */
enum class Filter { nearest, linear };

struct SamplerDesc {
  Filter filter;
  /** 0..1 밖의 좌표 — 끄면 가장자리 값, 켜면 무늬가 되풀이된다 (타일) */
  bool repeat{};
  /** 밉 단계 사이도 선형으로 메운다 (밉이 있는 텍스처에) */
  bool mip_linear{};
  /** 비스듬히 보이는 면에서 한 픽셀에 쓰는 표본 수의 상한 — 1 이면 끈다. filter 와 mip_linear 가 모두 선형일 때만 듣는다 */
  uint32_t anisotropy{1};
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

/** 파이프라인이 그리는 패스 */
enum class Target { scene, canvas };

/** 삼각형 목록을 그리는 파이프라인 */
struct PipelineDesc {
  ShaderHandle shader;
  /** draw 의 vertex_buffers 와 같은 순서 */
  std::span<const VertexBufferLayout> vertex_buffers;
  /** 깊이를 견준다 (장면 패스에서만). 끄면 그린 차례대로 덮는다 */
  bool depth_test;
  /** 뒤를 보는 삼각형(화면에서 시계 방향)을 버린다 — 닫힌 겉면만 그릴 때 켠다 */
  bool cull_back_faces{};
  /** 프래그먼트의 알파만큼 이미 그려진 색 위에 섞는다. 끄면 알파를 보지 않고 덮는다 */
  bool alpha_blend{};
  /** 프래그먼트의 색을 이미 그려진 색에 더한다 (빛 — 불꽃·섬광처럼 밝히기만 하는 것). 알파는 보지 않는다: 셰이더가 세기를 색에 곱해 낸다. alpha_blend 와 같이 켜지 않는다 */
  bool additive_blend{};
  /**
   * depth_test 일 때 깊이를 쓴다 (더 가까운 것만 통과). 끄면 견주기만 하고 쓰지 않으며 같은 깊이도 통과한다 —
   * 불투명한 것을 다 그린 뒤 남은 픽셀만 채우는 것(가장 먼 깊이 1 에 그리는 하늘)에 쓴다
   */
  bool depth_write{true};
  Target target{Target::scene};
};

/** @group(0) 의 @binding 번호에 거는 버퍼 (uniform·storage). 그 파이프라인의 셰이더 진입점이 실제로 쓰는 번호만, 빠짐없이 준다 */
struct BufferBinding {
  uint32_t binding;
  BufferHandle buffer;
};

/** @group(0) 의 @binding 번호에 거는 텍스처 (WGSL 의 texture_2d<f32>, 층이 있는 텍스처면 texture_2d_array<f32>) */
struct TextureBinding {
  uint32_t binding;
  TextureHandle texture;
};

/** @group(0) 의 @binding 번호에 거는 샘플러 (WGSL 의 sampler) */
struct SamplerBinding {
  uint32_t binding;
  SamplerHandle sampler;
};

struct DrawCall {
  PipelineHandle pipeline;
  std::span<const BufferHandle> vertex_buffers;
  std::span<const BufferBinding> bindings;
  uint32_t vertex_count;
  uint32_t instance_count;
  /** 버퍼와 같은 규칙 — 셰이더가 쓰는 번호만, 빠짐없이 */
  std::span<const TextureBinding> textures{};
  std::span<const SamplerBinding> samplers{};
  /** 인스턴스 버퍼에서 그리기 시작할 자리 — 한 버퍼에 쌓은 것을 여러 번에 나눠 그릴 때 */
  uint32_t first_instance{};
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

/** 장면 타깃 — 크기(픽셀)와, 가장자리 계단을 줄이는 다중 표본(4 표본 — 표본 버퍼에 그리고 풀어 낸다)을 쓸지 */
struct SceneTarget {
  uint32_t width;
  uint32_t height;
  bool multisample{};
  constexpr bool operator==(const SceneTarget&) const = default;
};

/** 프레임 하나에 그린 양 — 성능을 볼 때 쓴다 */
struct FrameCounters {
  uint32_t draws{};
  /** 정점 수 ÷ 3 × 인스턴스 수의 합 */
  uint32_t triangles{};
};

/** GPU 가 프레임 하나의 패스를 그린 시간 (ms — 패스의 시작에서 끝까지). 장면 패스가 없던 프레임은 scene 이 0 */
struct GpuTime {
  float scene{};
  float canvas{};
};

/**
 * 캔버스 하나에 그리는 장치. 실패한 create_* 는 빈 핸들을 돌려주고 까닭을 로그로 낸다.
 * 만든 자원은 장치와 함께 없어진다
 */
class Device {
 public:
  virtual ~Device() = default;

  /** 캔버스의 크기 (기기 픽셀) */
  virtual void resize(uint32_t width, uint32_t height) = 0;
  virtual uint32_t width() const = 0;
  virtual uint32_t height() const = 0;

  virtual BufferHandle create_buffer(const BufferDesc& desc) = 0;
  /**
   * 처음부터 덮어쓴다 (크기는 4 의 배수). 버퍼 크기를 넘는 쓰기는 하지 않고 로그를 낸다.
   * 한 프레임에 버퍼 하나는 한 번만 쓴다 — 그리기마다가 아니라 프레임을 내보낼 때의 내용으로 그려진다
   */
  virtual void write_buffer(BufferHandle buffer, std::span<const std::byte> bytes) = 0;
  /** 크기·밉 단계 수가 0 이거나 장치의 한계를 넘거나, pixels 가 있는데 크기가 맞지 않으면 빈 핸들 */
  virtual TextureHandle create_texture(const TextureDesc& desc) = 0;
  /**
   * 텍스처의 한 층(배열이 아니면 0), 한 밉 단계를 통째로 쓴다 — pixels 는 그 단계의 크기 × (픽셀의 바이트 수) 바이트, 윗줄부터.
   * 범위 밖의 층·단계이거나 크기가 맞지 않으면 쓰지 않고 false
   */
  virtual bool write_texture(TextureHandle texture, uint32_t layer, uint32_t mip, std::span<const std::byte> pixels) = 0;
  virtual SamplerHandle create_sampler(const SamplerDesc& desc) = 0;
  virtual ShaderHandle create_shader(const ShaderDesc& desc) = 0;
  virtual PipelineHandle create_pipeline(const PipelineDesc& desc) = 0;
  virtual ComputePipelineHandle create_compute_pipeline(ShaderHandle shader, const char* entry_point) = 0;

  /** 컴퓨트 호출들을 차례대로 돌린다 — 앞 호출이 쓴 것을 뒤 호출이 본다. begin_frame 과 end_frame 사이에서는 부르지 않는다 */
  virtual void compute(std::span<const ComputeCall> calls) = 0;

  /**
   * 프레임 — begin_frame, [begin_scene … end_scene], begin_canvas … end_frame 의 차례로 부른다. draw 는 열려 있는 패스에 그린다
   * (그 패스의 Target 으로 만든 파이프라인으로). 캔버스를 얻지 못한 프레임은 모두 아무 일도 하지 않는다
   */
  virtual void begin_frame() = 0;
  /** 장면 패스를 연다 — 장면 타깃을 그 크기·표본으로 맞추고(달라졌으면 다시 잡는다) 색과 깊이를 지운다 */
  virtual void begin_scene(const SceneTarget& target, ClearColor clear) = 0;
  virtual void end_scene() = 0;
  /**
   * 장면 타깃의 색 (다중 표본이면 풀어 낸 것) — 캔버스 패스에서 텍스처(texture_2d<f32>)로 건다. 핸들은 장치가 사는 동안 같고,
   * 내용은 마지막으로 닫은 장면 패스의 것이다 (장면 패스를 열지 않은 프레임에도 남아 있다). 장면 패스를 한 번도 열지 않았으면 1×1 이다
   */
  virtual TextureHandle scene_texture() const = 0;
  /** 마지막으로 연 장면 패스의 타깃 */
  virtual SceneTarget scene_target() const = 0;
  /** 캔버스 패스를 연다 — 색을 지운다 (깊이는 없다) */
  virtual void begin_canvas(ClearColor clear) = 0;
  virtual void draw(const DrawCall& call) = 0;
  /** 캔버스 패스를 닫고 프레임을 GPU 에 넘긴다 */
  virtual void end_frame() = 0;

  /** 마지막으로 닫은 프레임(end_frame)에 그린 양 */
  virtual FrameCounters counters() const = 0;
  /**
   * GPU 가 프레임의 패스들을 그리는 데 쓴 시간을 잰 차례대로 out 에 꺼내 담고 그 수를 돌려준다. 꺼낸 것은 다시 나오지 않는다.
   * 값은 몇 프레임 늦게 오고, 모든 프레임을 재지는 않는다. 잴 수 없는 장치(timestamp-query 가 없다)는 늘 0 을 돌려준다.
   * 패스 밖의 일(다중 표본 풀기, 캔버스를 화면에 내보내기)은 들어 있지 않다 — 프레임이 제때 나오는지는 프레임 간격으로 본다
   */
  virtual std::size_t take_gpu_times(std::span<GpuTime> out) = 0;
};

}  // namespace engine::gpu
