#include "engine/render/quad_geometry.hpp"

#include <array>

namespace engine {
namespace {

constexpr std::array<MeshVertex, 6> QUAD = {{
    {{0, 0, 0}, {0, 0, 1}}, {{1, 0, 0}, {0, 0, 1}}, {{1, 1, 0}, {0, 0, 1}},
    {{0, 0, 0}, {0, 0, 1}}, {{1, 1, 0}, {0, 0, 1}}, {{0, 1, 0}, {0, 0, 1}},
}};

}  // namespace

std::span<const MeshVertex> unit_quad() { return QUAD; }

}  // namespace engine
