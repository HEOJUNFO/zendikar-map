#include "gameplay/content/room_light.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace game {
namespace {

constexpr std::size_t HEADER_BYTES = 28;
constexpr uint32_t MAX_SIDE = 8192, MAX_PLACEMENTS = 10000;

uint32_t read_u32(std::span<const std::byte> bytes, std::size_t at) {
  uint32_t value;
  std::memcpy(&value, bytes.data() + at, sizeof(value));
  return value;
}

/** 격자의 네 점을 섞는다 */
float blend(float a, float b, float c, float d, float fx, float fz) { return (a * (1.0f - fx) + b * fx) * (1.0f - fz) + (c * (1.0f - fx) + d * fx) * fz; }

}  // namespace

std::string room_light_name(uint8_t shape) { return "light/" + std::to_string(shape); }

std::optional<RoomLight> RoomLight::decode(std::span<const std::byte> bytes) {
  static_assert(sizeof(LightProbe) == 28);
  if (bytes.size() < HEADER_BYTES) return std::nullopt;
  if (std::memcmp(bytes.data(), "ZKL3", 4) != 0) return std::nullopt;
  RoomLight light{.width = read_u32(bytes, 4), .height = read_u32(bytes, 8), .placements = {}, .grid = {}, .lightmap = {}, .direction = {}};
  const uint32_t placements = read_u32(bytes, 12), grid = read_u32(bytes, 16), qoi = read_u32(bytes, 20), direction = read_u32(bytes, 24);
  if (!light.width || !light.height || light.width > MAX_SIDE || light.height > MAX_SIDE || placements > MAX_PLACEMENTS || (grid != 0 && grid != GRID_COUNT)) return std::nullopt;
  const std::size_t probes = (static_cast<std::size_t>(placements) + grid) * sizeof(LightProbe);
  if (bytes.size() - HEADER_BYTES < probes || bytes.size() - HEADER_BYTES - probes != static_cast<std::size_t>(qoi) + direction) return std::nullopt;
  light.placements.resize(placements);
  light.grid.resize(grid);
  if (placements) std::memcpy(light.placements.data(), bytes.data() + HEADER_BYTES, placements * sizeof(LightProbe));
  if (grid) std::memcpy(light.grid.data(), bytes.data() + HEADER_BYTES + placements * sizeof(LightProbe), grid * sizeof(LightProbe));
  for (const std::vector<LightProbe>* list : {&light.placements, &light.grid})
    for (const LightProbe& probe : *list) {
      if (probe.sun > 1.0f) return std::nullopt;
      const float values[] = {probe.up[0], probe.up[1], probe.up[2], probe.down[0], probe.down[1], probe.down[2], probe.sun};
      for (const float value : values)
        if (!std::isfinite(value) || value < 0.0f || value > 64.0f) return std::nullopt;
    }
  light.lightmap = bytes.subspan(HEADER_BYTES + probes, qoi);
  light.direction = bytes.subspan(HEADER_BYTES + probes + qoi);
  return light;
}

std::vector<std::byte> RoomLight::encode(uint32_t width, uint32_t height, std::span<const LightProbe> placements, std::span<const LightProbe> grid, std::span<const std::byte> qoi,
                                         std::span<const std::byte> direction_qoi) {
  std::vector<std::byte> out(HEADER_BYTES + placements.size_bytes() + grid.size_bytes() + qoi.size() + direction_qoi.size());
  const uint32_t head[] = {width, height, static_cast<uint32_t>(placements.size()), static_cast<uint32_t>(grid.size()), static_cast<uint32_t>(qoi.size()), static_cast<uint32_t>(direction_qoi.size())};
  std::memcpy(out.data(), "ZKL3", 4);
  std::memcpy(out.data() + 4, head, sizeof head);
  std::size_t at = HEADER_BYTES;
  for (const std::span<const std::byte> part : {std::as_bytes(placements), std::as_bytes(grid), qoi, direction_qoi}) {
    if (!part.empty()) std::memcpy(out.data() + at, part.data(), part.size());
    at += part.size();
  }
  return out;
}

LightProbe RoomLight::at(engine::Vec3 position, const LightProbe& fallback) const {
  if (grid.size() != GRID_COUNT) return fallback;
  const auto cell = [](float value) { return std::clamp((value + GRID_REACH) / (2.0f * GRID_REACH) * static_cast<float>(GRID_SIDE - 1), 0.0f, static_cast<float>(GRID_SIDE - 1)); };
  const float gx = cell(position.x), gz = cell(position.z);
  const uint32_t x0 = std::min(static_cast<uint32_t>(gx), GRID_SIDE - 2), z0 = std::min(static_cast<uint32_t>(gz), GRID_SIDE - 2);
  const float fx = gx - static_cast<float>(x0), fz = gz - static_cast<float>(z0);
  const auto plane = [&](uint32_t layer) {
    const uint32_t start = layer * GRID_PLANE_SIZE;
    const LightProbe &a = grid[start + z0 * GRID_SIDE + x0], &b = grid[start + z0 * GRID_SIDE + x0 + 1], &c = grid[start + (z0 + 1) * GRID_SIDE + x0], &d = grid[start + (z0 + 1) * GRID_SIDE + x0 + 1];
    LightProbe out;
    out.sun = blend(a.sun, b.sun, c.sun, d.sun, fx, fz);
    for (int channel = 0; channel < 3; channel++) {
      out.up[channel] = blend(a.up[channel], b.up[channel], c.up[channel], d.up[channel], fx, fz);
      out.down[channel] = blend(a.down[channel], b.down[channel], c.down[channel], d.down[channel], fx, fz);
    }
    return out;
  };
  const float share = std::clamp((position.y - GRID_HEIGHT) / GRID_LEVEL_HEIGHT, 0.0f, 1.0f);
  const LightProbe lower = plane(0), upper = plane(1);
  LightProbe out;
  out.sun = lower.sun + (upper.sun - lower.sun) * share;
  for (int channel = 0; channel < 3; channel++) {
    out.up[channel] = lower.up[channel] + (upper.up[channel] - lower.up[channel]) * share;
    out.down[channel] = lower.down[channel] + (upper.down[channel] - lower.down[channel]) * share;
  }
  return out;
}

}  // namespace game
