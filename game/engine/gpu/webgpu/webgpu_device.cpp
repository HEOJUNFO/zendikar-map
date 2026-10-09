#include "engine/gpu/webgpu/webgpu_device.hpp"

#include <webgpu/webgpu_cpp.h>

#include <algorithm>
#include <array>
#include <cstring>
#include <memory>
#include <string_view>
#include <utility>
#include <vector>

#include "engine/foundation/log.hpp"

namespace engine::gpu {
namespace {

// 장면 타깃의 다중 표본 수 (SceneTarget::multisample) — 표본 버퍼에 그리고 장면의 색 텍스처로 풀어 낸다
constexpr uint32_t SAMPLE_COUNT = 4;
constexpr wgpu::TextureFormat DEPTH_FORMAT = wgpu::TextureFormat::Depth24Plus;
constexpr std::size_t MAX_VERTEX_BUFFERS = 4;
constexpr std::size_t MAX_BINDINGS = 8;

/**
 * GPU 시간 재기 (timestamp-query) — 패스의 시작과 끝에 찍힌 시각을 버퍼로 풀어 읽어 온다. 읽기는 비동기라 몇 프레임 늦고,
 * 읽는 버퍼가 다 나가 있으면 그 프레임은 재지 않는다. 장치가 없어진 뒤에 닿는 읽기가 있어 장치와 따로 산다 (shared_ptr)
 */
struct GpuTimer {
  // 장면 패스의 시작·끝, 캔버스 패스의 시작·끝
  static constexpr uint32_t QUERIES = 4;
  static constexpr uint64_t BYTES = QUERIES * sizeof(uint64_t);
  struct Slot {
    wgpu::Buffer buffer;
    bool busy{};
  };
  wgpu::QuerySet queries;
  wgpu::Buffer resolved;
  std::array<Slot, 4> slots;
  // 읽어 온 시간 — take_gpu_times 가 꺼내 간다. 꺼내 가지 않으면 오래된 것부터 버린다
  std::array<GpuTime, 32> ready{};
  std::size_t ready_count{};
};

/** 읽기 하나가 끝날 때까지 들고 있는 것 */
struct GpuTimerRead {
  std::shared_ptr<GpuTimer> timer;
  std::size_t slot;
  /** 그 프레임에 장면 패스가 있었다 (없었으면 그 자리의 시각은 뜻이 없다) */
  bool scene;
};

void on_gpu_time(wgpu::MapAsyncStatus status, wgpu::StringView, GpuTimerRead* read) {
  GpuTimer& timer = *read->timer;
  GpuTimer::Slot& slot = timer.slots[read->slot];
  if (status == wgpu::MapAsyncStatus::Success) {
    if (const void* mapped = slot.buffer.GetConstMappedRange(0, GpuTimer::BYTES)) {
      uint64_t stamps[GpuTimer::QUERIES];
      std::memcpy(stamps, mapped, sizeof stamps);
      // 나노초. 끝이 시작보다 앞서면(시계가 다시 맞춰졌다) 버린다
      if (stamps[3] >= stamps[2] && (!read->scene || stamps[1] >= stamps[0])) {
        if (timer.ready_count == timer.ready.size()) std::copy(timer.ready.begin() + 1, timer.ready.end(), timer.ready.begin()), timer.ready_count--;
        const auto ms = [&](int from, int to) { return static_cast<float>(static_cast<double>(stamps[to] - stamps[from]) / 1.0e6); };
        timer.ready[timer.ready_count++] = {read->scene ? ms(0, 1) : 0.0f, ms(2, 3)};
      }
    }
    slot.buffer.Unmap();
  }
  slot.busy = false;
  delete read;
}

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
    // 장면의 색 텍스처는 핸들 하나를 끝까지 쓴다 — 타깃을 다시 잡으면 그 자리의 텍스처만 바뀐다
    textures_.push_back({});
    scene_texture_ = {static_cast<uint32_t>(textures_.size())};
    configure_scene({1, 1, false});
    if (device_.HasFeature(wgpu::FeatureName::TimestampQuery)) {
      timer_ = std::make_shared<GpuTimer>();
      wgpu::QuerySetDescriptor queries{};
      queries.type = wgpu::QueryType::Timestamp;
      queries.count = GpuTimer::QUERIES;
      timer_->queries = device_.CreateQuerySet(&queries);
      wgpu::BufferDescriptor buffer{};
      buffer.size = GpuTimer::BYTES;
      buffer.usage = wgpu::BufferUsage::QueryResolve | wgpu::BufferUsage::CopySrc;
      timer_->resolved = device_.CreateBuffer(&buffer);
      buffer.usage = wgpu::BufferUsage::MapRead | wgpu::BufferUsage::CopyDst;
      for (GpuTimer::Slot& slot : timer_->slots) slot.buffer = device_.CreateBuffer(&buffer);
    }
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

  TextureHandle create_texture(const TextureDesc& desc) override {
    wgpu::Limits limits{};
    device_.GetLimits(&limits);
    const uint32_t pixel_bytes = desc.format == TextureFormat::r8 ? 1 : 4;
    const std::size_t size = static_cast<std::size_t>(desc.width) * desc.height * pixel_bytes;
    // 가장 작은 단계가 1×1 이다 — 그보다 많은 단계는 없다
    const uint32_t longest = std::max(desc.width, desc.height);
    if (!size || desc.width > limits.maxTextureDimension2D || desc.height > limits.maxTextureDimension2D || desc.layers > limits.maxTextureArrayLayers ||
        !desc.mip_levels || desc.mip_levels > 32 || (longest >> (desc.mip_levels - 1)) == 0 || (!desc.pixels.empty() && desc.pixels.size() != size)) {
      log_error("[webgpu] 만들 수 없는 텍스처 (%u×%u, 밉 %u, 층 %u, %zu 바이트)", desc.width, desc.height, desc.mip_levels, desc.layers, desc.pixels.size());
      return {};
    }
    wgpu::TextureDescriptor descriptor{};
    descriptor.usage = wgpu::TextureUsage::TextureBinding | wgpu::TextureUsage::CopyDst;
    descriptor.dimension = wgpu::TextureDimension::e2D;
    descriptor.size = {desc.width, desc.height, std::max(desc.layers, 1u)};
    descriptor.mipLevelCount = desc.mip_levels;
    descriptor.format = desc.format == TextureFormat::r8 ? wgpu::TextureFormat::R8Unorm
                        : desc.format == TextureFormat::rgba8 ? wgpu::TextureFormat::RGBA8Unorm
                                                              : wgpu::TextureFormat::RGBA8UnormSrgb;
    wgpu::Texture texture = device_.CreateTexture(&descriptor);
    // 층이 하나뿐인 배열도 배열로 보인다 (셰이더의 texture_2d_array)
    wgpu::TextureViewDescriptor view{};
    view.dimension = desc.layers ? wgpu::TextureViewDimension::e2DArray : wgpu::TextureViewDimension::e2D;
    wgpu::TextureView texture_view = texture.CreateView(&view);
    textures_.push_back({std::move(texture), std::move(texture_view), desc.width, desc.height, pixel_bytes, desc.mip_levels, std::max(desc.layers, 1u)});
    const TextureHandle handle{static_cast<uint32_t>(textures_.size())};
    if (!desc.pixels.empty()) write_texture(handle, 0, 0, desc.pixels);
    return handle;
  }

  bool write_texture(TextureHandle handle, uint32_t layer, uint32_t mip, std::span<const std::byte> pixels) override {
    if (!handle) return false;
    const Texture& texture = textures_[handle.id - 1];
    if (layer >= texture.layers || mip >= texture.mip_levels) return false;
    const uint32_t width = std::max(1u, texture.width >> mip), height = std::max(1u, texture.height >> mip);
    const std::size_t size = static_cast<std::size_t>(width) * height * texture.pixel_bytes;
    if (pixels.size() != size) {
      log_error("[webgpu] 텍스처(%u×%u, 밉 %u)에 쓸 수 없는 크기(%zu)", texture.width, texture.height, mip, pixels.size());
      return false;
    }
    wgpu::TexelCopyTextureInfo destination{};
    destination.texture = texture.texture;
    destination.mipLevel = mip;
    destination.origin = {0, 0, layer};
    wgpu::TexelCopyBufferLayout layout{};
    layout.bytesPerRow = width * texture.pixel_bytes;
    layout.rowsPerImage = height;
    const wgpu::Extent3D extent{width, height, 1};
    queue_.WriteTexture(&destination, pixels.data(), size, &layout, &extent);
    return true;
  }

  SamplerHandle create_sampler(const SamplerDesc& desc) override {
    const wgpu::FilterMode filter = desc.filter == Filter::linear ? wgpu::FilterMode::Linear : wgpu::FilterMode::Nearest;
    const wgpu::AddressMode address = desc.repeat ? wgpu::AddressMode::Repeat : wgpu::AddressMode::ClampToEdge;
    wgpu::SamplerDescriptor descriptor{};
    descriptor.magFilter = filter;
    descriptor.minFilter = filter;
    descriptor.mipmapFilter = desc.mip_linear ? wgpu::MipmapFilterMode::Linear : wgpu::MipmapFilterMode::Nearest;
    descriptor.addressModeU = address;
    descriptor.addressModeV = address;
    // 이방성은 세 필터가 모두 선형일 때만 된다 (WebGPU 의 검증) — 아니면 끈다
    const bool all_linear = desc.filter == Filter::linear && desc.mip_linear;
    descriptor.maxAnisotropy = static_cast<uint16_t>(all_linear ? std::clamp(desc.anisotropy, 1u, 16u) : 1u);
    samplers_.push_back(device_.CreateSampler(&descriptor));
    return {static_cast<uint32_t>(samplers_.size())};
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

    wgpu::BlendState blend{};
    blend.color = {wgpu::BlendOperation::Add, wgpu::BlendFactor::SrcAlpha, wgpu::BlendFactor::OneMinusSrcAlpha};
    // 캔버스는 불투명하다 — 이미 있는 알파를 그대로 둔다
    blend.alpha = {wgpu::BlendOperation::Add, wgpu::BlendFactor::Zero, wgpu::BlendFactor::One};
    wgpu::ColorTargetState target{};
    target.format = format_;
    if (desc.additive_blend) blend.color = {wgpu::BlendOperation::Add, wgpu::BlendFactor::One, wgpu::BlendFactor::One};
    if (desc.alpha_blend || desc.additive_blend) target.blend = &blend;
    wgpu::FragmentState fragment{};
    fragment.module = module;
    fragment.entryPoint = "fs_main";
    fragment.targetCount = 1;
    fragment.targets = &target;
    // 장면 타깃에는 깊이가 늘 붙어 있다 — 깊이 판정을 끈 파이프라인은 늘 통과하고 쓰지 않는다. 캔버스 패스에는 깊이가 없다
    wgpu::DepthStencilState depth{};
    depth.format = DEPTH_FORMAT;
    depth.depthWriteEnabled = desc.depth_test && desc.depth_write ? wgpu::OptionalBool::True : wgpu::OptionalBool::False;
    depth.depthCompare = !desc.depth_test ? wgpu::CompareFunction::Always : desc.depth_write ? wgpu::CompareFunction::Less : wgpu::CompareFunction::LessEqual;

    wgpu::RenderPipelineDescriptor descriptor{};
    descriptor.vertex.module = module;
    descriptor.vertex.entryPoint = "vs_main";
    descriptor.vertex.bufferCount = desc.vertex_buffers.size();
    descriptor.vertex.buffers = layouts.data();
    descriptor.primitive.topology = wgpu::PrimitiveTopology::TriangleList;
    descriptor.primitive.frontFace = wgpu::FrontFace::CCW;
    descriptor.primitive.cullMode = desc.cull_back_faces ? wgpu::CullMode::Back : wgpu::CullMode::None;
    descriptor.fragment = &fragment;
    const bool scene = desc.target == Target::scene;
    if (scene) descriptor.depthStencil = &depth;
    // 장면 파이프라인은 표본 수마다 하나씩 — 타깃의 다중 표본은 프레임마다 켜고 끌 수 있다. 묶음의 배치도 파이프라인마다 따로다 (auto 배치는 서로 섞어 쓸 수 없다)
    Pipeline pipeline{desc.target, {}};
    for (std::size_t variant = 0; variant < (scene ? 2u : 1u); variant++) {
      descriptor.multisample.count = variant ? SAMPLE_COUNT : 1;
      pipeline.variants[variant].pipeline = device_.CreateRenderPipeline(&descriptor);
      // 묶음의 배치는 만들 때 한 번 얻어 둔다 — 그리기마다 묻지 않는다 (물을 때마다 JS 쪽에 객체가 하나씩 생긴다)
      pipeline.variants[variant].layout = pipeline.variants[variant].pipeline.GetBindGroupLayout(0);
    }
    pipelines_.push_back(std::move(pipeline));
    return {static_cast<uint32_t>(pipelines_.size())};
  }

  ComputePipelineHandle create_compute_pipeline(ShaderHandle shader, const char* entry_point) override {
    if (!shader) return {};
    wgpu::ComputePipelineDescriptor descriptor{};
    descriptor.compute.module = shaders_[shader.id - 1];
    descriptor.compute.entryPoint = entry_point;
    wgpu::ComputePipeline pipeline = device_.CreateComputePipeline(&descriptor);
    wgpu::BindGroupLayout layout = pipeline.GetBindGroupLayout(0);
    compute_pipelines_.push_back({std::move(pipeline), std::move(layout), {}});
    return {static_cast<uint32_t>(compute_pipelines_.size())};
  }

  void compute(std::span<const ComputeCall> calls) override {
    const wgpu::CommandEncoder encoder = device_.CreateCommandEncoder();
    const wgpu::ComputePassEncoder pass = encoder.BeginComputePass();
    for (const ComputeCall& call : calls) {
      if (!call.pipeline || !call.workgroups) continue;
      ComputePipeline& pipeline = compute_pipelines_[call.pipeline.id - 1];
      pass.SetPipeline(pipeline.pipeline);
      pass.SetBindGroup(0, bind_group_for(pipeline.bindings, pipeline.layout, call.bindings, {}, {}));
      pass.DispatchWorkgroups(call.workgroups);
    }
    pass.End();
    const wgpu::CommandBuffer commands = encoder.Finish();
    queue_.Submit(1, &commands);
  }

  void begin_frame() override {
    wgpu::SurfaceTexture target{};
    surface_.GetCurrentTexture(&target);
    drawn_ = {};
    scene_drawn_ = false;
    pass_ = nullptr;
    if (target.status != wgpu::SurfaceGetCurrentTextureStatus::SuccessOptimal &&
        target.status != wgpu::SurfaceGetCurrentTextureStatus::SuccessSuboptimal) {
      // 이번 프레임은 그릴 곳이 없다 — 패스를 여는 것도 draw·end_frame 도 아무 일도 하지 않는다
      encoder_ = nullptr;
      return;
    }
    canvas_view_ = target.texture.CreateView();
    encoder_ = device_.CreateCommandEncoder();
  }

  void begin_scene(const SceneTarget& target, ClearColor clear) override {
    if (!encoder_ || pass_ || !target.width || !target.height) return;
    if (target != scene_) configure_scene(target);
    wgpu::RenderPassColorAttachment color{};
    if (scene_.multisample) {
      color.view = scene_samples_view_;
      color.resolveTarget = textures_[scene_texture_.id - 1].view;
      color.storeOp = wgpu::StoreOp::Discard;
    } else {
      color.view = textures_[scene_texture_.id - 1].view;
      color.storeOp = wgpu::StoreOp::Store;
    }
    color.loadOp = wgpu::LoadOp::Clear;
    color.clearValue = {clear.red, clear.green, clear.blue, 1.0};
    wgpu::RenderPassDepthStencilAttachment depth{};
    depth.view = scene_depth_view_;
    depth.depthLoadOp = wgpu::LoadOp::Clear;
    depth.depthStoreOp = wgpu::StoreOp::Discard;
    depth.depthClearValue = 1.0f;
    wgpu::RenderPassDescriptor descriptor{};
    descriptor.colorAttachmentCount = 1;
    descriptor.colorAttachments = &color;
    descriptor.depthStencilAttachment = &depth;
    wgpu::PassTimestampWrites stamps{};
    if (timer_) {
      stamps.querySet = timer_->queries;
      stamps.beginningOfPassWriteIndex = 0;
      stamps.endOfPassWriteIndex = 1;
      descriptor.timestampWrites = &stamps;
    }
    pass_ = encoder_.BeginRenderPass(&descriptor);
    pass_target_ = Target::scene;
    scene_drawn_ = true;
  }

  void end_scene() override {
    if (!pass_ || pass_target_ != Target::scene) return;
    pass_.End();
    pass_ = nullptr;
  }

  TextureHandle scene_texture() const override { return scene_texture_; }
  SceneTarget scene_target() const override { return scene_; }

  void begin_canvas(ClearColor clear) override {
    if (!encoder_ || pass_) return;
    wgpu::RenderPassColorAttachment color{};
    color.view = canvas_view_;
    color.loadOp = wgpu::LoadOp::Clear;
    color.storeOp = wgpu::StoreOp::Store;
    color.clearValue = {clear.red, clear.green, clear.blue, 1.0};
    wgpu::RenderPassDescriptor descriptor{};
    descriptor.colorAttachmentCount = 1;
    descriptor.colorAttachments = &color;
    wgpu::PassTimestampWrites stamps{};
    if (timer_) {
      stamps.querySet = timer_->queries;
      stamps.beginningOfPassWriteIndex = 2;
      stamps.endOfPassWriteIndex = 3;
      descriptor.timestampWrites = &stamps;
    }
    pass_ = encoder_.BeginRenderPass(&descriptor);
    pass_target_ = Target::canvas;
  }

  void draw(const DrawCall& call) override {
    if (!pass_ || !call.pipeline || !call.instance_count) return;
    Pipeline& pipeline = pipelines_[call.pipeline.id - 1];
    // 다른 패스의 파이프라인으로는 그릴 수 없다 (붙은 것이 다르다)
    if (pipeline.target != pass_target_) return;
    Variant& variant = pipeline.variants[pass_target_ == Target::scene && scene_.multisample ? 1 : 0];
    pass_.SetPipeline(variant.pipeline);
    for (std::size_t slot = 0; slot < call.vertex_buffers.size(); slot++)
      pass_.SetVertexBuffer(static_cast<uint32_t>(slot), buffers_[call.vertex_buffers[slot].id - 1].buffer);
    pass_.SetBindGroup(0, bind_group_for(variant.bindings, variant.layout, call.bindings, call.textures, call.samplers));
    pass_.Draw(call.vertex_count, call.instance_count, 0, call.first_instance);
    drawn_.draws++;
    drawn_.triangles += call.vertex_count / 3 * call.instance_count;
  }

  // 캔버스로 내보내는 것은 브라우저가 프레임 콜백이 끝난 뒤에 한다
  void end_frame() override {
    if (!encoder_) return;
    if (pass_) pass_.End();
    pass_ = nullptr;
    canvas_view_ = nullptr;
    counters_ = drawn_;
    // 읽는 버퍼가 남아 있을 때만 이 프레임의 시각을 풀어 읽는다
    GpuTimerRead* read = nullptr;
    if (timer_) {
      const auto free = std::find_if(timer_->slots.begin(), timer_->slots.end(), [](const GpuTimer::Slot& slot) { return !slot.busy; });
      if (free != timer_->slots.end()) {
        encoder_.ResolveQuerySet(timer_->queries, 0, GpuTimer::QUERIES, timer_->resolved, 0);
        encoder_.CopyBufferToBuffer(timer_->resolved, 0, free->buffer, 0, GpuTimer::BYTES);
        free->busy = true;
        read = new GpuTimerRead{timer_, static_cast<std::size_t>(free - timer_->slots.begin()), scene_drawn_};
      }
    }
    const wgpu::CommandBuffer commands = encoder_.Finish();
    encoder_ = nullptr;
    queue_.Submit(1, &commands);
    if (read) timer_->slots[read->slot].buffer.MapAsync(wgpu::MapMode::Read, 0, GpuTimer::BYTES, wgpu::CallbackMode::AllowSpontaneous, on_gpu_time, read);
  }

  FrameCounters counters() const override { return counters_; }

  std::size_t take_gpu_times(std::span<GpuTime> out) override {
    if (!timer_) return 0;
    const std::size_t count = std::min(out.size(), timer_->ready_count);
    std::copy_n(timer_->ready.begin(), count, out.begin());
    std::copy(timer_->ready.begin() + static_cast<std::ptrdiff_t>(count), timer_->ready.begin() + static_cast<std::ptrdiff_t>(timer_->ready_count), timer_->ready.begin());
    timer_->ready_count -= count;
    return count;
  }

 private:
  struct Buffer {
    wgpu::Buffer buffer;
    std::size_t size;
  };
  struct Texture {
    wgpu::Texture texture;
    wgpu::TextureView view;
    uint32_t width, height, pixel_bytes, mip_levels, layers;
  };
  /** @binding 번호 하나에 건 것 — id 는 그 종류의 핸들 */
  struct Slot {
    enum class Kind { buffer, texture, sampler };
    uint32_t binding;
    Kind kind;
    uint32_t id;
    bool operator==(const Slot&) const = default;
  };
  /** 파이프라인에 무엇을 걸었는지 — 그 조합의 바인드 그룹 */
  struct Binding {
    std::array<Slot, MAX_BINDINGS> slots;
    std::size_t count;
    wgpu::BindGroup group;
  };
  /** 표본 수 하나의 파이프라인과 거기에 건 묶음들 */
  struct Variant {
    wgpu::RenderPipeline pipeline;
    wgpu::BindGroupLayout layout;
    std::vector<Binding> bindings;
  };
  /** 캔버스 파이프라인은 variants[0] 만, 장면 파이프라인은 [0] 표본 하나 · [1] 다중 표본 */
  struct Pipeline {
    Target target;
    std::array<Variant, 2> variants;
  };
  struct ComputePipeline {
    wgpu::ComputePipeline pipeline;
    wgpu::BindGroupLayout layout;
    std::vector<Binding> bindings;
  };

  /** 캔버스 크기에 맞춰 표면을 다시 잡는다 */
  void configure() {
    wgpu::SurfaceConfiguration configuration{};
    configuration.device = device_;
    configuration.format = format_;
    configuration.width = width_;
    configuration.height = height_;
    configuration.alphaMode = wgpu::CompositeAlphaMode::Opaque;
    configuration.presentMode = wgpu::PresentMode::Fifo;
    surface_.Configure(&configuration);
  }

  /**
   * 장면 타깃을 그 크기·표본으로 다시 잡는다 — 색(패스가 끝난 뒤 텍스처로 읽는다)과 깊이, 다중 표본이면 표본 버퍼.
   * 색 텍스처의 핸들은 그대로 두고 속만 바꾼다: 앞의 텍스처를 묶어 둔 바인드 그룹은 버린다 (다음 그리기에서 다시 만든다)
   */
  void configure_scene(const SceneTarget& target) {
    scene_ = target;
    wgpu::TextureDescriptor texture{};
    texture.dimension = wgpu::TextureDimension::e2D;
    texture.size = {target.width, target.height, 1};
    texture.format = format_;
    texture.usage = wgpu::TextureUsage::RenderAttachment | wgpu::TextureUsage::TextureBinding;
    Texture& color = textures_[scene_texture_.id - 1];
    if (color.texture) color.texture.Destroy();
    color.texture = device_.CreateTexture(&texture);
    color.view = color.texture.CreateView();
    color.width = target.width;
    color.height = target.height;
    color.pixel_bytes = 4;
    color.mip_levels = 1;
    color.layers = 1;
    for (wgpu::Texture* old : {&scene_samples_, &scene_depth_}) {
      if (*old) old->Destroy();
      *old = nullptr;
    }
    scene_samples_view_ = nullptr;
    texture.usage = wgpu::TextureUsage::RenderAttachment;
    texture.sampleCount = target.multisample ? SAMPLE_COUNT : 1;
    if (target.multisample) {
      scene_samples_ = device_.CreateTexture(&texture);
      scene_samples_view_ = scene_samples_.CreateView();
    }
    texture.format = DEPTH_FORMAT;
    scene_depth_ = device_.CreateTexture(&texture);
    scene_depth_view_ = scene_depth_.CreateView();
    const auto uses_scene = [&](const Binding& binding) {
      return std::any_of(binding.slots.begin(), binding.slots.begin() + static_cast<std::ptrdiff_t>(binding.count),
                         [&](const Slot& slot) { return slot.kind == Slot::Kind::texture && slot.id == scene_texture_.id; });
    };
    for (Pipeline& pipeline : pipelines_)
      for (Variant& variant : pipeline.variants) std::erase_if(variant.bindings, uses_scene);
  }

  /** 바인드 그룹은 만들 때 자원이 묶인다 — (파이프라인, 자원 묶음)마다 한 번 만들어 두고 다시 쓴다. MAX_BINDINGS 를 넘는 것은 걸지 않는다 */
  const wgpu::BindGroup& bind_group_for(std::vector<Binding>& cache, const wgpu::BindGroupLayout& layout, std::span<const BufferBinding> buffers,
                                        std::span<const TextureBinding> textures, std::span<const SamplerBinding> samplers) {
    Binding binding{{}, 0, nullptr};
    const auto add = [&](uint32_t number, Slot::Kind kind, uint32_t id) {
      if (binding.count < MAX_BINDINGS) binding.slots[binding.count++] = {number, kind, id};
    };
    for (const BufferBinding& b : buffers) add(b.binding, Slot::Kind::buffer, b.buffer.id);
    for (const TextureBinding& t : textures) add(t.binding, Slot::Kind::texture, t.texture.id);
    for (const SamplerBinding& s : samplers) add(s.binding, Slot::Kind::sampler, s.sampler.id);
    const auto same = [&](const Binding& b) {
      return b.count == binding.count && std::equal(b.slots.begin(), b.slots.begin() + static_cast<std::ptrdiff_t>(b.count), binding.slots.begin());
    };
    // 파이프라인 하나에 걸리는 묶음은 몇 개뿐이다
    const auto found = std::find_if(cache.begin(), cache.end(), same);
    if (found != cache.end()) return found->group;

    std::array<wgpu::BindGroupEntry, MAX_BINDINGS> entries{};
    for (std::size_t i = 0; i < binding.count; i++) {
      const Slot& slot = binding.slots[i];
      entries[i].binding = slot.binding;
      if (slot.kind == Slot::Kind::buffer) entries[i].buffer = buffers_[slot.id - 1].buffer;
      else if (slot.kind == Slot::Kind::texture) entries[i].textureView = textures_[slot.id - 1].view;
      else entries[i].sampler = samplers_[slot.id - 1];
    }
    wgpu::BindGroupDescriptor descriptor{};
    descriptor.layout = layout;
    descriptor.entryCount = binding.count;
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
  // 장면 타깃 — 색은 textures_ 의 scene_texture_ 자리에 있다. 표본 버퍼는 다중 표본일 때만
  SceneTarget scene_{};
  TextureHandle scene_texture_;
  wgpu::Texture scene_samples_;
  wgpu::TextureView scene_samples_view_;
  wgpu::Texture scene_depth_;
  wgpu::TextureView scene_depth_view_;
  // 핸들은 자리 번호 + 1
  std::vector<Buffer> buffers_;
  std::vector<Texture> textures_;
  std::vector<wgpu::Sampler> samplers_;
  std::vector<wgpu::ShaderModule> shaders_;
  std::vector<Pipeline> pipelines_;
  std::vector<ComputePipeline> compute_pipelines_;
  // 열려 있는 프레임 (begin_frame ~ end_frame)과 그 안의 열려 있는 패스
  wgpu::CommandEncoder encoder_;
  wgpu::TextureView canvas_view_;
  wgpu::RenderPassEncoder pass_;
  Target pass_target_{Target::canvas};
  // 이 프레임에 장면 패스를 열었다
  bool scene_drawn_{};
  // 열려 있는 프레임에 그린 양과, 마지막으로 닫은 프레임의 것
  FrameCounters drawn_;
  FrameCounters counters_;
  // GPU 시간 재기 — timestamp-query 가 없는 장치에서는 비어 있다
  std::shared_ptr<GpuTimer> timer_;
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
  // 셰이더가 화면에 낼 값(감마가 걸린 색)을 그대로 적는다 — 쓸 때 다시 감마를 거는 sRGB 형식은 고르지 않는다
  const wgpu::TextureFormat* const end = capabilities.formats + capabilities.formatCount;
  const wgpu::TextureFormat* const format =
      std::find_if(capabilities.formats, end, [](wgpu::TextureFormat f) { return f == wgpu::TextureFormat::BGRA8Unorm || f == wgpu::TextureFormat::RGBA8Unorm; });
  if (format == end) {
    log_error("[webgpu] 캔버스에 쓸 수 있는 8 비트 화면 형식(bgra8unorm·rgba8unorm)이 없다");
    return finish(pending, nullptr);
  }
  finish(pending, std::make_unique<WebgpuDevice>(std::move(pending->instance), std::move(pending->surface), std::move(device), *format));
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
  // GPU 시간을 잴 수 있으면 잰다 (성능 오버레이·측정) — 없어도 그리는 데는 지장이 없다
  static constexpr wgpu::FeatureName TIMESTAMPS = wgpu::FeatureName::TimestampQuery;
  if (pending->adapter.HasFeature(TIMESTAMPS)) {
    descriptor.requiredFeatureCount = 1;
    descriptor.requiredFeatures = &TIMESTAMPS;
  }
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
