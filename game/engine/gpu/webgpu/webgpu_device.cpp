#include "engine/gpu/webgpu/webgpu_device.hpp"

#include <webgpu/webgpu_cpp.h>

#include <algorithm>
#include <array>
#include <string_view>
#include <utility>
#include <vector>

#include "engine/foundation/log.hpp"

namespace engine::gpu {
namespace {

// 가장자리 계단을 줄이는 다중 표본 — 표본 버퍼에 그리고 캔버스로 풀어 낸다
constexpr uint32_t SAMPLE_COUNT = 4;
constexpr wgpu::TextureFormat DEPTH_FORMAT = wgpu::TextureFormat::Depth24Plus;
constexpr std::size_t MAX_VERTEX_BUFFERS = 4;
constexpr std::size_t MAX_BINDINGS = 8;

void log_message(const char* what, wgpu::StringView message) {
  const std::string_view text = message;
  log_error("[webgpu] %s: %.*s", what, static_cast<int>(text.size()), text.data());
}

constexpr wgpu::BufferUsage buffer_usage(BufferUsage usage) {
  switch (usage) {
    case BufferUsage::vertex: return wgpu::BufferUsage::Vertex;
    case BufferUsage::uniform: return wgpu::BufferUsage::Uniform;
    default: return wgpu::BufferUsage::Storage;
  }
}

constexpr wgpu::VertexFormat float_format(uint32_t components) {
  switch (components) {
    case 1: return wgpu::VertexFormat::Float32;
    case 2: return wgpu::VertexFormat::Float32x2;
    case 3: return wgpu::VertexFormat::Float32x3;
    default: return wgpu::VertexFormat::Float32x4;
  }
}

class WebgpuDevice final : public Device {
 public:
  WebgpuDevice(wgpu::Instance instance, wgpu::Surface surface, wgpu::Device device, wgpu::TextureFormat format)
      : instance_(std::move(instance)), surface_(std::move(surface)), device_(std::move(device)), queue_(device_.GetQueue()), format_(format) {
    configure();
  }

  void resize(uint32_t width, uint32_t height) override {
    if (!width || !height || (width == width_ && height == height_)) return;
    width_ = width;
    height_ = height;
    configure();
  }
  uint32_t width() const override { return width_; }
  uint32_t height() const override { return height_; }

  BufferHandle create_buffer(const BufferDesc& desc) override {
    // 쓰기는 4 바이트 단위다
    if (desc.size % 4 != 0) {
      log_error("[webgpu] 버퍼 크기(%zu)는 4 의 배수여야 한다", desc.size);
      return {};
    }
    wgpu::BufferDescriptor descriptor{};
    descriptor.usage = wgpu::BufferUsage::CopyDst | buffer_usage(desc.usage);
    descriptor.size = desc.size;
    wgpu::Buffer buffer = device_.CreateBuffer(&descriptor);
    if (desc.initial) queue_.WriteBuffer(buffer, 0, desc.initial, desc.size);
    buffers_.push_back({std::move(buffer), desc.size});
    return {static_cast<uint32_t>(buffers_.size())};
  }

  void write_buffer(BufferHandle handle, std::span<const std::byte> bytes) override {
    const Buffer& buffer = buffers_[handle.id - 1];
    if (bytes.size() > buffer.size || bytes.size() % 4 != 0) {
      log_error("[webgpu] 버퍼(%zu 바이트)에 쓸 수 없는 크기(%zu)", buffer.size, bytes.size());
      return;
    }
    queue_.WriteBuffer(buffer.buffer, 0, bytes.data(), bytes.size());
  }

  // 셰이더 오류는 나중에 장치 오류로 온다 (request_webgpu_device 가 건 콜백이 로그로 낸다)
  ShaderHandle create_shader(const ShaderDesc& desc) override {
    wgpu::ShaderSourceWGSL source{};
    source.code = desc.wgsl;
    wgpu::ShaderModuleDescriptor descriptor{};
    descriptor.nextInChain = &source;
    shaders_.push_back(device_.CreateShaderModule(&descriptor));
    return {static_cast<uint32_t>(shaders_.size())};
  }

  PipelineHandle create_pipeline(const PipelineDesc& desc) override {
    if (!desc.shader || desc.vertex_buffers.size() > MAX_VERTEX_BUFFERS) return {};
    const wgpu::ShaderModule& module = shaders_[desc.shader.id - 1];

    std::array<std::vector<wgpu::VertexAttribute>, MAX_VERTEX_BUFFERS> attributes;
    std::array<wgpu::VertexBufferLayout, MAX_VERTEX_BUFFERS> layouts{};
    for (std::size_t slot = 0; slot < desc.vertex_buffers.size(); slot++) {
      const VertexBufferLayout& layout = desc.vertex_buffers[slot];
      for (const VertexAttribute& a : layout.attributes) {
        wgpu::VertexAttribute attribute{};
        attribute.format = float_format(a.components);
        attribute.offset = a.offset;
        attribute.shaderLocation = a.location;
        attributes[slot].push_back(attribute);
      }
      layouts[slot].stepMode = layout.step == VertexStep::instance ? wgpu::VertexStepMode::Instance : wgpu::VertexStepMode::Vertex;
      layouts[slot].arrayStride = layout.stride;
      layouts[slot].attributeCount = attributes[slot].size();
      layouts[slot].attributes = attributes[slot].data();
    }

    wgpu::ColorTargetState target{};
    target.format = format_;
    wgpu::FragmentState fragment{};
    fragment.module = module;
    fragment.entryPoint = "fs_main";
    fragment.targetCount = 1;
    fragment.targets = &target;
    // 표본 버퍼에 깊이가 늘 붙어 있다 — 깊이 판정을 끈 파이프라인은 늘 통과하고 쓰지 않는다
    wgpu::DepthStencilState depth{};
    depth.format = DEPTH_FORMAT;
    depth.depthWriteEnabled = desc.depth_test ? wgpu::OptionalBool::True : wgpu::OptionalBool::False;
    depth.depthCompare = desc.depth_test ? wgpu::CompareFunction::Less : wgpu::CompareFunction::Always;

    wgpu::RenderPipelineDescriptor descriptor{};
    descriptor.vertex.module = module;
    descriptor.vertex.entryPoint = "vs_main";
    descriptor.vertex.bufferCount = desc.vertex_buffers.size();
    descriptor.vertex.buffers = layouts.data();
    descriptor.primitive.topology = wgpu::PrimitiveTopology::TriangleList;
    descriptor.depthStencil = &depth;
    descriptor.multisample.count = SAMPLE_COUNT;
    descriptor.fragment = &fragment;
    pipelines_.push_back({device_.CreateRenderPipeline(&descriptor), {}});
    return {static_cast<uint32_t>(pipelines_.size())};
  }

  ComputePipelineHandle create_compute_pipeline(ShaderHandle shader, const char* entry_point) override {
    if (!shader) return {};
    wgpu::ComputePipelineDescriptor descriptor{};
    descriptor.compute.module = shaders_[shader.id - 1];
    descriptor.compute.entryPoint = entry_point;
    compute_pipelines_.push_back({device_.CreateComputePipeline(&descriptor), {}});
    return {static_cast<uint32_t>(compute_pipelines_.size())};
  }

  void compute(std::span<const ComputeCall> calls) override {
    const wgpu::CommandEncoder encoder = device_.CreateCommandEncoder();
    const wgpu::ComputePassEncoder pass = encoder.BeginComputePass();
    for (const ComputeCall& call : calls) {
      if (!call.pipeline || !call.workgroups) continue;
      ComputePipeline& pipeline = compute_pipelines_[call.pipeline.id - 1];
      pass.SetPipeline(pipeline.pipeline);
      pass.SetBindGroup(0, bind_group_for(pipeline.bindings, pipeline.pipeline.GetBindGroupLayout(0), call.bindings));
      pass.DispatchWorkgroups(call.workgroups);
    }
    pass.End();
    const wgpu::CommandBuffer commands = encoder.Finish();
    queue_.Submit(1, &commands);
  }

  void begin_frame(ClearColor clear) override {
    wgpu::SurfaceTexture target{};
    surface_.GetCurrentTexture(&target);
    if (target.status != wgpu::SurfaceGetCurrentTextureStatus::SuccessOptimal &&
        target.status != wgpu::SurfaceGetCurrentTextureStatus::SuccessSuboptimal) {
      // 이번 프레임은 그릴 곳이 없다 — draw·end_frame 이 아무 일도 하지 않는다
      pass_ = nullptr;
      return;
    }
    wgpu::RenderPassColorAttachment color{};
    color.view = color_view_;
    color.resolveTarget = target.texture.CreateView();
    color.loadOp = wgpu::LoadOp::Clear;
    color.storeOp = wgpu::StoreOp::Discard;
    color.clearValue = {clear.red, clear.green, clear.blue, 1.0};
    wgpu::RenderPassDepthStencilAttachment depth{};
    depth.view = depth_view_;
    depth.depthLoadOp = wgpu::LoadOp::Clear;
    depth.depthStoreOp = wgpu::StoreOp::Discard;
    depth.depthClearValue = 1.0f;
    wgpu::RenderPassDescriptor descriptor{};
    descriptor.colorAttachmentCount = 1;
    descriptor.colorAttachments = &color;
    descriptor.depthStencilAttachment = &depth;
    encoder_ = device_.CreateCommandEncoder();
    pass_ = encoder_.BeginRenderPass(&descriptor);
  }

  void draw(const DrawCall& call) override {
    if (!pass_ || !call.pipeline || !call.instance_count) return;
    Pipeline& pipeline = pipelines_[call.pipeline.id - 1];
    pass_.SetPipeline(pipeline.pipeline);
    for (std::size_t slot = 0; slot < call.vertex_buffers.size(); slot++)
      pass_.SetVertexBuffer(static_cast<uint32_t>(slot), buffers_[call.vertex_buffers[slot].id - 1].buffer);
    pass_.SetBindGroup(0, bind_group_for(pipeline.bindings, pipeline.pipeline.GetBindGroupLayout(0), call.bindings));
    pass_.Draw(call.vertex_count, call.instance_count);
  }

  // 캔버스로 내보내는 것은 브라우저가 프레임 콜백이 끝난 뒤에 한다
  void end_frame() override {
    if (!pass_) return;
    pass_.End();
    pass_ = nullptr;
    const wgpu::CommandBuffer commands = encoder_.Finish();
    encoder_ = nullptr;
    queue_.Submit(1, &commands);
  }

 private:
  struct Buffer {
    wgpu::Buffer buffer;
    std::size_t size;
  };
  /** 파이프라인에 어떤 버퍼들을 걸었는지 — 그 조합의 바인드 그룹 */
  struct Binding {
    std::array<BufferBinding, MAX_BINDINGS> buffers;
    std::size_t count;
    wgpu::BindGroup group;
  };
  struct Pipeline {
    wgpu::RenderPipeline pipeline;
    std::vector<Binding> bindings;
  };
  struct ComputePipeline {
    wgpu::ComputePipeline pipeline;
    std::vector<Binding> bindings;
  };

  /** 캔버스 크기에 맞춰 표면과 표본·깊이 버퍼를 다시 잡는다 */
  void configure() {
    wgpu::SurfaceConfiguration configuration{};
    configuration.device = device_;
    configuration.format = format_;
    configuration.width = width_;
    configuration.height = height_;
    configuration.alphaMode = wgpu::CompositeAlphaMode::Opaque;
    configuration.presentMode = wgpu::PresentMode::Fifo;
    surface_.Configure(&configuration);

    wgpu::TextureDescriptor texture{};
    texture.usage = wgpu::TextureUsage::RenderAttachment;
    texture.dimension = wgpu::TextureDimension::e2D;
    texture.size = {width_, height_, 1};
    texture.sampleCount = SAMPLE_COUNT;
    texture.format = format_;
    color_view_ = device_.CreateTexture(&texture).CreateView();
    texture.format = DEPTH_FORMAT;
    depth_view_ = device_.CreateTexture(&texture).CreateView();
  }

  /** 바인드 그룹은 만들 때 버퍼가 묶인다 — (파이프라인, 버퍼 묶음)마다 한 번 만들어 두고 다시 쓴다 */
  const wgpu::BindGroup& bind_group_for(std::vector<Binding>& cache, const wgpu::BindGroupLayout& layout, std::span<const BufferBinding> buffers) {
    const std::size_t count = std::min(buffers.size(), MAX_BINDINGS);
    const auto same = [&](const Binding& b) {
      if (b.count != count) return false;
      for (std::size_t i = 0; i < count; i++)
        if (b.buffers[i].binding != buffers[i].binding || b.buffers[i].buffer.id != buffers[i].buffer.id) return false;
      return true;
    };
    // 파이프라인 하나에 걸리는 묶음은 몇 개뿐이다
    const auto found = std::find_if(cache.begin(), cache.end(), same);
    if (found != cache.end()) return found->group;

    Binding binding{{}, count, nullptr};
    std::array<wgpu::BindGroupEntry, MAX_BINDINGS> entries{};
    for (std::size_t i = 0; i < count; i++) {
      binding.buffers[i] = buffers[i];
      entries[i].binding = buffers[i].binding;
      entries[i].buffer = buffers_[buffers[i].buffer.id - 1].buffer;
    }
    wgpu::BindGroupDescriptor descriptor{};
    descriptor.layout = layout;
    descriptor.entryCount = count;
    descriptor.entries = entries.data();
    binding.group = device_.CreateBindGroup(&descriptor);
    cache.push_back(std::move(binding));
    return cache.back().group;
  }

  wgpu::Instance instance_;
  wgpu::Surface surface_;
  wgpu::Device device_;
  wgpu::Queue queue_;
  wgpu::TextureFormat format_;
  uint32_t width_{1};
  uint32_t height_{1};
  wgpu::TextureView color_view_;
  wgpu::TextureView depth_view_;
  // 핸들은 자리 번호 + 1
  std::vector<Buffer> buffers_;
  std::vector<wgpu::ShaderModule> shaders_;
  std::vector<Pipeline> pipelines_;
  std::vector<ComputePipeline> compute_pipelines_;
  // 열려 있는 프레임 (begin_frame ~ end_frame)
  wgpu::CommandEncoder encoder_;
  wgpu::RenderPassEncoder pass_;
};

/** 어댑터 → 장치로 이어지는 요청 동안 들고 있는 것 */
struct Pending {
  wgpu::Instance instance;
  wgpu::Surface surface;
  wgpu::Adapter adapter;
  DeviceReady ready;
  void* user;
};

void finish(Pending* pending, std::unique_ptr<Device> device) {
  pending->ready(std::move(device), pending->user);
  delete pending;
}

void on_device(wgpu::RequestDeviceStatus status, wgpu::Device device, wgpu::StringView message, Pending* pending) {
  if (status != wgpu::RequestDeviceStatus::Success || !device) {
    log_message("장치를 받지 못했다", message);
    return finish(pending, nullptr);
  }
  wgpu::SurfaceCapabilities capabilities{};
  if (pending->surface.GetCapabilities(pending->adapter, &capabilities) != wgpu::Status::Success || capabilities.formatCount == 0) {
    log_error("[webgpu] 캔버스에 쓸 수 있는 화면 형식이 없다");
    return finish(pending, nullptr);
  }
  finish(pending, std::make_unique<WebgpuDevice>(std::move(pending->instance), std::move(pending->surface), std::move(device), capabilities.formats[0]));
}

void on_adapter(wgpu::RequestAdapterStatus status, wgpu::Adapter adapter, wgpu::StringView message, Pending* pending) {
  if (status != wgpu::RequestAdapterStatus::Success || !adapter) {
    log_message("어댑터를 받지 못했다", message);
    return finish(pending, nullptr);
  }
  pending->adapter = std::move(adapter);
  wgpu::DeviceDescriptor descriptor{};
  // 셰이더·파이프라인 오류는 만든 자리에서가 아니라 여기로 온다
  descriptor.SetUncapturedErrorCallback(
      [](const wgpu::Device&, wgpu::ErrorType, wgpu::StringView error) { log_message("장치 오류", error); });
  pending->adapter.RequestDevice(&descriptor, wgpu::CallbackMode::AllowSpontaneous, on_device, pending);
}

}  // namespace

void request_webgpu_device(const char* canvas_target, DeviceReady ready, void* user) {
  Pending* pending = new Pending{wgpu::CreateInstance(), nullptr, nullptr, ready, user};
  if (!pending->instance) {
    log_error("[webgpu] 이 브라우저에는 WebGPU 가 없다");
    return finish(pending, nullptr);
  }
  wgpu::EmscriptenSurfaceSourceCanvasHTMLSelector canvas{};
  canvas.selector = canvas_target;
  wgpu::SurfaceDescriptor surface{};
  surface.nextInChain = &canvas;
  pending->surface = pending->instance.CreateSurface(&surface);
  if (!pending->surface) {
    log_error("[webgpu] 캔버스에 그릴 표면을 만들지 못했다");
    return finish(pending, nullptr);
  }
  wgpu::RequestAdapterOptions options{};
  options.compatibleSurface = pending->surface;
  options.powerPreference = wgpu::PowerPreference::HighPerformance;
  pending->instance.RequestAdapter(&options, wgpu::CallbackMode::AllowSpontaneous, on_adapter, pending);
}

}  // namespace engine::gpu
