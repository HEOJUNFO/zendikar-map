#include "gameplay/presentation/scenery.hpp"

#include <algorithm>
#include <bit>
#include <cmath>
#include <optional>
#include <string_view>
#include <utility>

#include "engine/foundation/log.hpp"
#include "engine/hud/jpeg.hpp"
#include "engine/render/surface_batch.hpp"
#include "engine/spatial/surface_mesh.hpp"

namespace game {
namespace {

// 팩의 항목 이름 (tools/packc.mjs) — 같은 종류 안의 차례가 층·소품 번호다
constexpr std::string_view TILE = "tile/", PROP_TEXTURE = "prop-texture/", PROP_MASK = "prop-mask/", PROP = "prop/", WEAPON_TEXTURE = "weapon-texture/", WEAPON = "weapon/", SKY = "sky/image",
                           LIGHT = "light/";
// 텍스처에 딸린 것 — 금속성 그림(있으면 색 그림 바로 뒤에)과 NAR (묶음 안의 차례가 색 그림과 같다)
constexpr std::string_view TILE_METAL = "tile-metal/", PROP_METAL = "prop-metal/", WEAPON_METAL = "weapon-metal/", TILE_NAR = "tile-nar/", PROP_NAR = "prop-nar/", WEAPON_NAR = "weapon-nar/";
// 텍스처 배열의 층 수와 소품·무기 부품 수의 상한 — 이보다 많다는 팩은 거절한다
constexpr std::size_t MAX_LAYERS = 64, MAX_PROPS = 256, MAX_WEAPON_PARTS = 64;
constexpr std::string_view MONSTER_TEXTURE = "monster-texture/", MONSTER_NAR = "monster-nar/", MONSTER = "monster/";
constexpr std::string_view MERCHANT_TEXTURE = "merchant-texture/", MERCHANT_NAR = "merchant-nar/", MERCHANT = "merchant/";
constexpr std::string_view MERCHANT_PROP_TEXTURE = "merchant-prop-texture/", MERCHANT_PROP_NAR = "merchant-prop-nar/", MERCHANT_PROP_METAL = "merchant-prop-metal/", MERCHANT_PROP = "merchant-prop/";
constexpr auto& MERCHANT_PROP_NAMES = merchant_art::MODEL_NAMES;
constexpr auto& MERCHANT_PROP_TEXTURE_NAMES = merchant_art::MODEL_NAMES;
constexpr std::array<std::string_view, Scenery::CREATURE_COUNT> CREATURE_NAMES{"river-boa", "living-tsunami", "timbermaw-larva", "sky-ruin-drake", "roil-elemental"};
constexpr std::array<std::string_view, Scenery::MERCHANT_FORMS> MERCHANT_NAMES{"body", "corrupted"};

std::size_t count_of(std::span<const engine::asset::PackEntry> entries, std::string_view prefix) {
  return static_cast<std::size_t>(std::count_if(entries.begin(), entries.end(), [&](const engine::asset::PackEntry& e) { return e.name.starts_with(prefix); }));
}

}  // namespace

void Scenery::begin(std::vector<std::byte> pack) {
  *this = {};
  boss_surface_=std::make_shared<BossSurface>();
  bytes_ = std::move(pack);
  const auto parsed = engine::asset::Pack::parse(bytes_);
  if (!parsed) {
    engine::log_error("[scenery] 에셋 팩의 형식이 어긋났다 (%zu 바이트)", bytes_.size());
    return fail();
  }
  entries_.assign(parsed->entries().begin(), parsed->entries().end());
  tiles_.count = static_cast<uint32_t>(count_of(entries_, TILE));
  prop_textures_.count = static_cast<uint32_t>(count_of(entries_, PROP_TEXTURE));
  weapon_textures_.count = static_cast<uint32_t>(count_of(entries_, WEAPON_TEXTURE));
  tile_nars_.count = static_cast<uint32_t>(count_of(entries_, TILE_NAR));
  prop_nars_.count = static_cast<uint32_t>(count_of(entries_, PROP_NAR));
  weapon_nars_.count = static_cast<uint32_t>(count_of(entries_, WEAPON_NAR));
  monster_textures_.count = static_cast<uint32_t>(count_of(entries_, MONSTER_TEXTURE));
  monster_nars_.count = static_cast<uint32_t>(count_of(entries_, MONSTER_NAR));
  if (monster_textures_.count != CREATURE_COUNT || monster_nars_.count != CREATURE_COUNT) return fail();
  merchant_texture_.count = static_cast<uint32_t>(count_of(entries_, MERCHANT_TEXTURE));
  merchant_nar_.count = static_cast<uint32_t>(count_of(entries_, MERCHANT_NAR));
  merchant_prop_textures_.count = static_cast<uint32_t>(count_of(entries_, MERCHANT_PROP_TEXTURE));
  merchant_prop_nars_.count = static_cast<uint32_t>(count_of(entries_, MERCHANT_PROP_NAR));
  if (merchant_prop_textures_.count != MERCHANT_PROP_LAYERS || merchant_prop_nars_.count != MERCHANT_PROP_LAYERS || count_of(entries_, MERCHANT_PROP) != MERCHANT_FURNITURE_COUNT) {
    engine::log_error("[scenery] merchant furniture pack mismatch (textures %u/%u, NAR %u/%u, models %zu/%u)",
                      merchant_prop_textures_.count, MERCHANT_PROP_LAYERS, merchant_prop_nars_.count, MERCHANT_PROP_LAYERS,
                      count_of(entries_, MERCHANT_PROP), MERCHANT_FURNITURE_COUNT);
    return fail();
  }
  if (merchant_texture_.count != MERCHANT_FORMS || merchant_nar_.count != MERCHANT_FORMS || count_of(entries_, MERCHANT) != MERCHANT_FORMS) return fail();
  // A packet from another asset generation must fail before any stale mesh is shown.
  uint32_t monsters = 0, monster_colors = 0, monster_normals = 0;
  uint32_t merchant = 0, merchant_colors = 0, merchant_normals = 0;
  uint32_t merchant_props = 0, merchant_prop_colors = 0, merchant_prop_normals = 0;
  if (count_of(entries_, MONSTER) != CREATURE_COUNT || count_of(entries_, "creature/") || count_of(entries_, "creature-texture/") ||
      count_of(entries_, "creature-nar/") || count_of(entries_, "monster-bind/") || count_of(entries_, "monster-skin/") != CREATURE_COUNT || count_of(entries_, "monster-animation/") != CREATURE_COUNT) return fail();
  for (const auto& entry : entries_) {
    if (entry.name.starts_with(MERCHANT_PROP_TEXTURE) && entry.name.substr(MERCHANT_PROP_TEXTURE.size()) != MERCHANT_PROP_TEXTURE_NAMES[merchant_prop_colors++]) return fail();
    if (entry.name.starts_with(MERCHANT_PROP_NAR) && entry.name.substr(MERCHANT_PROP_NAR.size()) != MERCHANT_PROP_TEXTURE_NAMES[merchant_prop_normals++]) return fail();
    if (entry.name.starts_with(MERCHANT_PROP) && entry.name.substr(MERCHANT_PROP.size()) != MERCHANT_PROP_NAMES[merchant_props++]) return fail();
    if (entry.name.starts_with(MERCHANT_PROP_METAL) && std::find(MERCHANT_PROP_TEXTURE_NAMES.begin(), MERCHANT_PROP_TEXTURE_NAMES.end(), entry.name.substr(MERCHANT_PROP_METAL.size())) == MERCHANT_PROP_TEXTURE_NAMES.end()) return fail();
    if (entry.name.starts_with(MERCHANT_TEXTURE) && entry.name.substr(MERCHANT_TEXTURE.size()) != MERCHANT_NAMES[merchant_colors++]) return fail();
    if (entry.name.starts_with(MERCHANT_NAR) && entry.name.substr(MERCHANT_NAR.size()) != MERCHANT_NAMES[merchant_normals++]) return fail();
    if (entry.name.starts_with(MERCHANT) && entry.name.substr(MERCHANT.size()) != MERCHANT_NAMES[merchant++]) return fail();
    if (entry.name.starts_with(MONSTER_TEXTURE) && entry.name.substr(MONSTER_TEXTURE.size()) != CREATURE_NAMES[monster_colors++]) return fail();
    if (entry.name.starts_with(MONSTER_NAR) && entry.name.substr(MONSTER_NAR.size()) != CREATURE_NAMES[monster_normals++]) return fail();
    if (entry.name.starts_with(MONSTER)) {
      if (monsters >= CREATURE_COUNT || entry.name.substr(MONSTER.size()) != CREATURE_NAMES[monsters]) return fail();
      monsters++;
    }
  }
  const std::size_t props = count_of(entries_, PROP), parts = count_of(entries_, WEAPON);
  // 색 그림마다 NAR 이 하나씩 있어야 한다 (층 번호가 같다)
  if (tile_nars_.count != tiles_.count || prop_nars_.count != prop_textures_.count || weapon_nars_.count != weapon_textures_.count) {
    engine::log_error("[scenery] 에셋 팩의 NAR 수가 색 그림의 수와 다르다 (타일 %u/%u, 소품 %u/%u, 무기 %u/%u)", tile_nars_.count, tiles_.count, prop_nars_.count, prop_textures_.count,
                      weapon_nars_.count, weapon_textures_.count);
    return fail();
  }
  if (!tiles_.count || tiles_.count > MAX_LAYERS || !prop_textures_.count || prop_textures_.count > MAX_LAYERS || props > MAX_PROPS || weapon_textures_.count > MAX_LAYERS ||
      parts > MAX_WEAPON_PARTS) {
    engine::log_error("[scenery] 에셋 팩의 항목 수가 어긋났다 (타일 %u, 소품 텍스처 %u, 소품 %zu, 무기 텍스처 %u, 무기 부품 %zu)", tiles_.count, prop_textures_.count, props,
                      weapon_textures_.count, parts);
    return fail();
  }
  props_.reserve(props);
  weapon_parts_.reserve(parts);
  state_ = State::loading;
}

void Scenery::fail() {
  state_ = State::failed;
  bytes_ = {};
  entries_ = {};
}

bool Scenery::decode_layer(Layers& layers, std::span<const std::byte> jpeg, std::span<const std::byte> gray, Alpha alpha) {
  std::optional<engine::hud::Bitmap> image = engine::hud::decode_jpeg(jpeg);
  // 층은 모두 같은 크기의 정사각형이고 한 변이 2 의 거듭제곱이다 (밉이 1×1 까지 반씩 준다). 첫 그림이 크기를 정한다
  if (!image || image->width != image->height || !std::has_single_bit(image->width) || (layers.side && image->width != layers.side)) return false;
  if (alpha != Alpha::none) {
    // 잘라 낼 모양은 회색 그림의 밝기가 그대로 알파가 되고, 금속성은 뒤집어 싣는다 (알파 1 이 금속이 아닌 겉 — 딸린 그림이 없는 텍스처와 같다)
    const auto shape = engine::hud::decode_jpeg(gray);
    if (!shape || shape->width != image->width || shape->height != image->height) return false;
    const std::byte flip = alpha == Alpha::metal ? std::byte{255} : std::byte{0};
    for (std::size_t at = 0; at < image->rgba.size(); at += 4) image->rgba[at + 3] = shape->rgba[at] ^ flip;
  }
  layers.side = image->width;
  staged_ = std::move(image);
  staged_into_ = &layers;
  return true;
}

bool Scenery::upload_layer(engine::gpu::Device& device) {
  Layers& layers = *staged_into_;
  engine::hud::Bitmap image = std::move(*staged_);
  staged_.reset();
  if (!layers.texture) {
    layers.texture = device.create_texture({.width = layers.side,
                                            .height = layers.side,
                                            .pixels = {},
                                            .format = layers.linear ? engine::gpu::TextureFormat::rgba8 : engine::gpu::TextureFormat::rgba8_srgb,
                                            .mip_levels = static_cast<uint32_t>(std::bit_width(layers.side)),
                                            .layers = layers.count});
    if (!layers.texture) return false;
  }
  if (layers.filled >= layers.count) return false;
  for (uint32_t mip = 0;; mip++) {
    if (!device.write_texture(layers.texture, layers.filled, mip, image.rgba)) return false;
    if (image.width == 1) break;
    image = layers.linear ? engine::hud::halved_linear(image) : engine::hud::halved_srgb(image);
  }
  layers.filled++;
  return true;
}

void Scenery::step(engine::gpu::Device& device) {
  if (state_ != State::loading) return;
  if (staged_sky_) {
    // 지난 걸음에 푼 하늘 그림을 올린다
    sky_ = device.create_texture({.width = staged_sky_->width, .height = staged_sky_->height, .pixels = staged_sky_->rgba, .format = engine::gpu::TextureFormat::rgba8});
    sky_height_ = staged_sky_->height;
    staged_sky_.reset();
    if (!sky_) {
      engine::log_error("[scenery] 하늘 그림을 GPU 에 올리지 못했다");
      fail();
    }
    return;
  }
  if (staged_) {
    // 지난 걸음에 푼 그림 — 밉을 만들어 올린다
    if (!upload_layer(device)) {
      engine::log_error("[scenery] 텍스처를 GPU 에 올리지 못했다");
      fail();
    }
    return;
  }
  if (next_ == entries_.size()) {
    for (const Layers* layers : {&tiles_, &prop_textures_, &weapon_textures_, &tile_nars_, &prop_nars_, &weapon_nars_, &monster_textures_, &monster_nars_, &merchant_texture_, &merchant_nar_, &merchant_prop_textures_, &merchant_prop_nars_})
      if (layers->filled != layers->count) return fail();
    if (tiles_.side != 2048 || tile_nars_.side != 2048) return fail();
    if (monster_textures_.side != 2048 || monster_nars_.side != 2048) return fail();
    if (merchant_texture_.side != 2048 || merchant_nar_.side != 2048) return fail();
    for (const auto& body : merchant_bodies_) if (!body.vertices) return fail();
    if (merchant_prop_textures_.side != MERCHANT_PROP_SIDE || merchant_prop_nars_.side != MERCHANT_PROP_SIDE) return fail();
    for (const auto& prop : merchant_props_)
      if (!prop.vertices) return fail();
    for (uint32_t i=0;i<CREATURE_COUNT;++i) if (!creatures_[i].vertices || !creature_skins_[i] || !creature_animation(static_cast<Creature>(i)).bone_count()) return fail();
    if(!boss_surface_->ready())return fail();
    // 다 올렸다 — 방마다의 구운 빛만 들고 있는다 (그 방에 들어설 때 푼다)
    keep_lights();
    state_ = State::ready;
    return;
  }
  const engine::asset::PackEntry& entry = entries_[next_++];
  bool ok = false;
  // 색 그림 — 알파에 실을 회색 그림(금속성, 소품은 잘라 낼 모양일 수도)이 있으면 바로 뒤에 같은 이름으로 온다
  const auto color = [&](Layers& layers, std::string_view prefix, std::string_view metal, std::string_view mask) {
    const std::string_view name = entry.name.substr(prefix.size());
    Alpha alpha = Alpha::none;
    std::span<const std::byte> gray;
    if (next_ < entries_.size()) {
      const std::string_view after = entries_[next_].name;
      if (after.starts_with(metal) && after.substr(metal.size()) == name) alpha = Alpha::metal;
      else if (!mask.empty() && after.starts_with(mask) && after.substr(mask.size()) == name) alpha = Alpha::mask;
      if (alpha != Alpha::none) gray = entries_[next_++].bytes;
    }
    return decode_layer(layers, entry.bytes, gray, alpha);
  };
  if (entry.name.starts_with(TILE)) {
    ok = color(tiles_, TILE, TILE_METAL, {});
  } else if (entry.name.starts_with(PROP_TEXTURE)) {
    ok = color(prop_textures_, PROP_TEXTURE, PROP_METAL, PROP_MASK);
  } else if (entry.name.starts_with(WEAPON_TEXTURE)) {
    ok = color(weapon_textures_, WEAPON_TEXTURE, WEAPON_METAL, {});
  } else if (entry.name.starts_with(MERCHANT_PROP_TEXTURE)) {
    ok = color(merchant_prop_textures_, MERCHANT_PROP_TEXTURE, MERCHANT_PROP_METAL, {});
  } else if (entry.name.starts_with(MERCHANT_PROP_NAR)) {
    ok = decode_layer(merchant_prop_nars_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with(MERCHANT_PROP)) {
    const auto name = entry.name.substr(MERCHANT_PROP.size());
    const auto found = std::find(MERCHANT_PROP_NAMES.begin(), MERCHANT_PROP_NAMES.end(), name);
    if (found != MERCHANT_PROP_NAMES.end()) {
      const auto role = static_cast<std::size_t>(found - MERCHANT_PROP_NAMES.begin());
      if (const auto model = engine::ModelMesh::decode(entry.bytes); model && !model->vertices.empty() &&
          std::all_of(model->vertices.begin(), model->vertices.end(), [](const auto& vertex) { return std::isfinite(vertex.layer) && vertex.layer >= 0 && vertex.layer < MERCHANT_PROP_LAYERS && vertex.layer == std::floor(vertex.layer); })) {
        if (const auto vertices = engine::SurfaceBatch::upload(device, model->vertices)) {
          merchant_props_[role] = {vertices, static_cast<uint32_t>(model->vertices.size()), model->two_sided, model->cutout, model->bounds};
          ok = true;
        }
      }
    }
  } else if (entry.name.starts_with(MERCHANT_TEXTURE)) {
    ok = decode_layer(merchant_texture_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with(MERCHANT_NAR)) {
    ok = decode_layer(merchant_nar_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with(MERCHANT)) {
    const auto name = entry.name.substr(MERCHANT.size());
    const auto found = std::find(MERCHANT_NAMES.begin(), MERCHANT_NAMES.end(), name);
    const auto form = static_cast<uint32_t>(found - MERCHANT_NAMES.begin());
    if (const auto model = engine::ModelMesh::decode(entry.bytes); model && !model->vertices.empty() &&
        std::all_of(model->vertices.begin(), model->vertices.end(), [form](const engine::SurfaceVertex& v) { return v.layer == static_cast<float>(form); })) {
      if (const auto vertices = engine::SurfaceBatch::upload(device, model->vertices)) {
        merchant_bodies_[form] = {vertices, static_cast<uint32_t>(model->vertices.size()), model->two_sided, model->cutout, model->bounds};
        ok = true;
      }
    }
  } else if (entry.name.starts_with(MONSTER_TEXTURE)) {
    ok = color(monster_textures_, MONSTER_TEXTURE, "monster-metal/", {});
  } else if (entry.name.starts_with(MONSTER_NAR)) {
    ok = decode_layer(monster_nars_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with("monster-animation/")) {
    const auto found=std::find(CREATURE_NAMES.begin(),CREATURE_NAMES.end(),entry.name.substr(18));
    if(found!=CREATURE_NAMES.end()) if(auto animation=CreatureAnimation::decode(entry.bytes)) {
      const auto index=static_cast<uint32_t>(found-CREATURE_NAMES.begin());
      if(animation->clip_count()==(index==ROIL ? 9u : 5u)){if(index==ROIL)boss_surface_->animation=std::move(*animation);else creature_animations_[index]=std::move(*animation);ok=true;}
    }
  } else if (entry.name.starts_with("monster-skin/")) {
    const auto name=entry.name.substr(13);const auto found=std::find(CREATURE_NAMES.begin(),CREATURE_NAMES.end(),name);
    const auto companion=std::find_if(entries_.begin(),entries_.end(),[&](const auto& e){return e.name=="monster/"+std::string(name);});
    if(found!=CREATURE_NAMES.end() && companion!=entries_.end()) if(auto skin=engine::ModelSkin::decode(companion->bytes,entry.bytes)){
      const auto index=static_cast<uint32_t>(found-CREATURE_NAMES.begin());
      if(skin->bone_count==creature_animation(static_cast<Creature>(index)).bone_count()) {creature_skins_[index]=engine::SurfaceBatch::upload_skin(device,skin->vertices);ok=static_cast<bool>(creature_skins_[index]);if(index==ROIL)ok=boss_surface_->skin(*skin)&&ok;}
    }
  } else if (entry.name.starts_with(MONSTER)) {
    for (uint32_t creature = 0; creature < CREATURE_COUNT; creature++) {
      if (!entry.name.substr(MONSTER.size()).starts_with(CREATURE_NAMES[creature])) continue;
      if (const auto model = engine::ModelMesh::decode(entry.bytes); model && !model->vertices.empty() &&
          std::all_of(model->vertices.begin(), model->vertices.end(), [creature](const engine::SurfaceVertex& v) { return v.layer == static_cast<float>(creature); })) {
        if (const auto vertices = engine::SurfaceBatch::upload(device, model->vertices)) {
          creatures_[creature] = {vertices, static_cast<uint32_t>(model->vertices.size()), model->two_sided, model->cutout, model->bounds};
          ok = creature!=ROIL || boss_surface_->model(*model);
        }
      }
      break;
    }
  } else if (entry.name.starts_with(TILE_NAR)) {
    ok = decode_layer(tile_nars_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with(PROP_NAR)) {
    ok = decode_layer(prop_nars_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with(WEAPON_NAR)) {
    ok = decode_layer(weapon_nars_, entry.bytes, {}, Alpha::none);
  } else if (entry.name.starts_with("card-art/") || entry.name.starts_with("card-frame/")) {
    // 기억 인장의 그림 — 장면이 아니라 HUD 의 것이다 (조립 지점이 받은 팩에서 따로 풀어 overlay 에 올린다)
    ok = true;
  } else if (entry.name.starts_with("vfx/")) {
    // 전투 효과의 그림 — 장면의 스프라이트가 받은 팩에서 따로 풀어 올린다 (SceneView::load_effects)
    ok = true;
  } else if (entry.name == SKY) {
    staged_sky_ = engine::hud::decode_jpeg(entry.bytes);
    ok = staged_sky_.has_value();
  } else if (entry.name.starts_with(LIGHT)) {
    // 구운 빛 — 머리와 프로브만 본다 (라이트맵은 그 방에 들어설 때 푼다). 가벼운 일이라 이어진 것들을 한 걸음에 다 본다
    ok = RoomLight::decode(entry.bytes).has_value();
    while (ok && next_ < entries_.size() && entries_[next_].name.starts_with(LIGHT)) ok = RoomLight::decode(entries_[next_++].bytes).has_value();
  } else if (const bool weapon = entry.name.starts_with(WEAPON); weapon || entry.name.starts_with(PROP)) {
    if (const auto model = engine::ModelMesh::decode(entry.bytes)) {
      // 층 번호가 제 텍스처 배열 밖이면 어긋난 모델이다
      const float layers = static_cast<float>(weapon ? weapon_textures_.count : prop_textures_.count);
      const bool layers_ok = std::all_of(model->vertices.begin(), model->vertices.end(), [&](const engine::SurfaceVertex& v) { return v.layer >= 0.0f && v.layer < layers; });
      const engine::gpu::BufferHandle vertices = layers_ok ? engine::SurfaceBatch::upload(device, model->vertices) : engine::gpu::BufferHandle{};
      if (vertices) {
        (weapon ? weapon_parts_ : props_).push_back({vertices, static_cast<uint32_t>(model->vertices.size()), model->two_sided, model->cutout, model->bounds});
        ok = true;
      }
    }
  }
  if (!ok) {
    engine::log_error("[scenery] 에셋 팩의 항목 '%.*s' 을 풀지 못했다", static_cast<int>(entry.name.size()), entry.name.data());
    fail();
  }
}

void Scenery::keep_lights() {
  // 텍스처와 모델은 GPU 에 올라갔다 — 방마다 다시 푸는 구운 빛만 앞으로 당겨 남긴다 (항목은 팩에 적힌 차례라 겹치지 않고 앞으로만 간다)
  std::vector<engine::asset::PackEntry> kept;
  std::size_t names = 0, size = 0;
  for (const engine::asset::PackEntry& entry : entries_)
    if (entry.name.starts_with(LIGHT)) names += entry.name.size(), size += entry.bytes.size();
  std::vector<std::byte> packed(names + size);
  std::size_t name_at = 0, at = names;
  for (const engine::asset::PackEntry& entry : entries_) {
    if (!entry.name.starts_with(LIGHT)) continue;
    std::copy(entry.name.begin(), entry.name.end(), reinterpret_cast<char*>(packed.data()) + name_at);
    std::copy(entry.bytes.begin(), entry.bytes.end(), packed.begin() + static_cast<std::ptrdiff_t>(at));
    kept.push_back({{reinterpret_cast<const char*>(packed.data()) + name_at, entry.name.size()}, std::span<const std::byte>{packed}.subspan(at, entry.bytes.size())});
    name_at += entry.name.size();
    at += entry.bytes.size();
  }
  // 옮겨도 벡터의 자리는 그대로다 (kept 가 가리키는 곳이 살아 있다)
  bytes_ = std::move(packed);
  entries_ = std::move(kept);
}

std::span<const std::byte> Scenery::light_bytes(const std::string& name) const {
  const auto entry = std::find_if(entries_.begin(), entries_.end(), [&](const engine::asset::PackEntry& e) { return e.name == name; });
  return entry == entries_.end() ? std::span<const std::byte>{} : entry->bytes;
}

void Scenery::prepare_room(uint8_t shape) {
  if (state_ != State::ready || shape >= SHAPE_COUNT || staged_room_ == shape) return;
  staged_room_ = shape;
  staged_light_ = {};
  // 이미 올라 있는 틀은 할 일이 없다
  if (body_slots_[shape].loaded) staged_light_.state = Staged::State::uploaded;
}

void Scenery::step_light() {
  if (state_ != State::ready || staged_room_ < 0 || staged_light_.state != Staged::State::pending) return;
  Staged& piece = staged_light_;
  const std::string name = room_light_name(static_cast<uint8_t>(staged_room_));
  auto light = RoomLight::decode(light_bytes(name));
  piece.pixels = light ? engine::hud::Bitmap::decode(light->lightmap) : std::nullopt;
  piece.direction = light ? engine::hud::Bitmap::decode(light->direction) : std::nullopt;
  if (!piece.pixels || piece.pixels->width != light->width || piece.pixels->height != light->height || !piece.direction || piece.direction->width != light->width ||
      piece.direction->height != light->height) {
    engine::log_error("[scenery] 구운 빛 '%s' 을 풀지 못했다", name.c_str());
    piece.pixels.reset();
    piece.direction.reset();
    piece.state = Staged::State::failed;
    return;
  }
  piece.light = std::move(*light);
  piece.state = Staged::State::decoded;
}

void Scenery::light_room(engine::gpu::Device& device, uint8_t shape) {
  if (state_ != State::ready || shape >= SHAPE_COUNT) {
    lights_ = {};
    lit_ = -1;
    return;
  }
  if (lit_ == shape) return;
  prepare_room(shape);
  step_light();
  lights_ = {};
  LightSlot& slot = body_slots_[shape];
  Staged& piece = staged_light_;
  if (piece.state == Staged::State::decoded) {
    slot.texture = device.create_texture({.width = piece.light.width, .height = piece.light.height, .pixels = piece.pixels->rgba, .format = engine::gpu::TextureFormat::rgba8});
    slot.direction = device.create_texture({.width = piece.light.width, .height = piece.light.height, .pixels = piece.direction->rgba, .format = engine::gpu::TextureFormat::rgba8});
    if (slot.texture && slot.direction) {
      // 라이트맵의 바이트는 더 쓰지 않는다 (프로브만 읽는다)
      piece.light.lightmap = {};
      piece.light.direction = {};
      slot.light = std::move(piece.light);
      slot.loaded = true;
    }
  }
  piece.pixels.reset();
  piece.direction.reset();
  if (slot.loaded) {
    lights_.body = &slot.light;
    lights_.body_map = slot.texture;
    lights_.body_direction = slot.direction;
  }
  lit_ = shape;
  staged_room_ = -1;
}

}  // namespace game
