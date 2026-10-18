#include "engine/hud/jpeg.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <numbers>
#include <vector>

namespace engine::hud {
namespace {

// 계수가 파일에 놓이는 차례(지그재그) → 8×8 블록 안의 자리
constexpr uint8_t ZIGZAG[64] = {0,  1,  8,  16, 9,  2,  3,  10, 17, 24, 32, 25, 18, 11, 4,  5,  12, 19, 26, 33, 40, 48,
                                41, 34, 27, 20, 13, 6,  7,  14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23,
                                30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63};
constexpr int TABLES = 4;
// 한 번에 표로 푸는 부호의 길이 (비트) — 이보다 긴 부호는 길이마다 견줘 푼다
constexpr int FAST_BITS = 9;

struct Huffman {
  bool defined{};
  // 앞 FAST_BITS 비트 → (부호 길이 << 8 | 기호). 0 이면 더 긴 부호다
  std::array<uint16_t, 1 << FAST_BITS> fast{};
  // 길이 n 인 부호의 가장 큰 값(없으면 -1)과, 그 길이의 첫 부호가 symbols 의 어디인지
  std::array<int32_t, 17> max_code{};
  std::array<int32_t, 17> first_symbol{};
  std::array<int32_t, 17> first_code{};
  std::array<uint8_t, 256> symbols{};
};

struct Component {
  uint8_t id{};
  int h{}, v{};
  int quant{};
  int dc_table{}, ac_table{};
  int pred{};
  // 이 성분의 표본 평면 (MCU 단위로 채워 그림보다 조금 클 수 있다)
  int stride{};
  std::vector<uint8_t> plane;
};

/** 엔트로피 부호 구간의 비트를 읽는다 — 0xFF 뒤의 채움 0x00 을 걷어 내고, 구간이 끝나면(표식이나 파일 끝) 0 을 채워 주되 그 비트를 실제로 쓰면 실패로 적는다 */
class BitReader {
 public:
  BitReader(std::span<const std::byte> bytes, std::size_t at) : bytes_(bytes), at_(at) {}

  uint32_t peek(int count) {
    fill(count);
    return static_cast<uint32_t>(buffer_ >> (count_ - count)) & ((1u << count) - 1u);
  }
  void skip(int count) {
    count_ -= count;
    // 남은 비트가 채워 넣은 0 보다 적다 — 없는 데이터를 읽었다
    if (count_ < fake_) failed_ = true;
  }
  uint32_t take(int count) {
    if (!count) return 0;
    const uint32_t value = peek(count);
    skip(count);
    return value;
  }
  bool failed() const { return failed_; }
  /** 구간이 끝난 자리 (표식의 0xFF) — 남은 비트는 한 바이트를 채우는 것뿐이어야 한다 */
  std::optional<std::size_t> end() {
    if (failed_ || count_ - fake_ >= 8) return std::nullopt;
    fill(32);
    return ended_ && count_ - fake_ < 8 ? std::optional{at_} : std::nullopt;
  }

 private:
  void fill(int count) {
    while (count_ < count) {
      uint64_t byte = 0;
      if (!ended_ && at_ < bytes_.size()) {
        const uint8_t value = static_cast<uint8_t>(bytes_[at_]);
        if (value != 0xFF) {
          byte = value;
          at_++;
        } else if (at_ + 1 < bytes_.size() && bytes_[at_ + 1] == std::byte{0}) {
          byte = 0xFF;
          at_ += 2;
        } else {
          ended_ = true;
        }
      } else {
        ended_ = true;
      }
      if (ended_) fake_ += 8;
      buffer_ = buffer_ << 8 | byte;
      count_ += 8;
    }
  }

  std::span<const std::byte> bytes_;
  std::size_t at_;
  uint64_t buffer_{};
  int count_{};
  int fake_{};
  bool ended_{};
  bool failed_{};
};

uint8_t byte_at(std::span<const std::byte> bytes, std::size_t at) { return static_cast<uint8_t>(bytes[at]); }
uint32_t be16(std::span<const std::byte> bytes, std::size_t at) { return static_cast<uint32_t>(byte_at(bytes, at)) << 8 | byte_at(bytes, at + 1); }

/** DHT 의 표 하나 — 길이마다의 부호 수 16 개와 기호들. 부호가 그 길이에 담기지 않으면 false */
bool build(Huffman& table, std::span<const std::byte> counts, std::span<const std::byte> symbols) {
  table = {};
  int32_t code = 0;
  int32_t index = 0;
  for (int length = 1; length <= 16; length++) {
    const int32_t count = static_cast<uint8_t>(counts[static_cast<std::size_t>(length - 1)]);
    table.first_symbol[length] = index;
    table.first_code[length] = code;
    if (code + count > (1 << length)) return false;
    for (int32_t i = 0; i < count; i++, index++, code++) {
      table.symbols[index] = static_cast<uint8_t>(symbols[static_cast<std::size_t>(index)]);
      if (length <= FAST_BITS) {
        const int32_t low = code << (FAST_BITS - length);
        for (int32_t fill = 0; fill < (1 << (FAST_BITS - length)); fill++) table.fast[low + fill] = static_cast<uint16_t>(length << 8 | table.symbols[index]);
      }
    }
    table.max_code[length] = count ? code - 1 : -1;
    code <<= 1;
  }
  table.defined = true;
  return true;
}

/** 기호 하나. 표에 없는 부호면 -1 */
int decode_symbol(BitReader& bits, const Huffman& table) {
  const uint32_t ahead = bits.peek(16);
  if (const uint16_t entry = table.fast[ahead >> (16 - FAST_BITS)]) {
    bits.skip(entry >> 8);
    return entry & 0xFF;
  }
  for (int length = FAST_BITS + 1; length <= 16; length++) {
    const int32_t code = static_cast<int32_t>(ahead >> (16 - length));
    if (code <= table.max_code[length] && code >= table.first_code[length]) {
      bits.skip(length);
      return table.symbols[table.first_symbol[length] + code - table.first_code[length]];
    }
  }
  return -1;
}

/** 크기 size 비트로 적힌 값 — 맨 윗 비트가 0 이면 음수다 */
int extend(uint32_t value, int size) { return size && value < (1u << (size - 1)) ? static_cast<int>(value) - (1 << size) + 1 : static_cast<int>(value); }

// 역 DCT 의 밑 — BASIS[x][u] = C(u)/2 · cos((2x+1)uπ/16)
std::array<std::array<float, 8>, 8> make_basis() {
  std::array<std::array<float, 8>, 8> basis;
  for (int x = 0; x < 8; x++)
    for (int u = 0; u < 8; u++) basis[x][u] = (u ? 0.5f : 0.5f / std::numbers::sqrt2_v<float>) * std::cos(static_cast<float>((2 * x + 1) * u) * std::numbers::pi_v<float> / 16.0f);
  return basis;
}

/** 양자화를 푼 계수 64 개(줄 = 세로 주파수) → 표본 8×8 을 out 에 (줄 간격 stride) */
void inverse_dct(const std::array<int, 64>& coefficients, uint8_t* out, int stride) {
  static const std::array<std::array<float, 8>, 8> BASIS = make_basis();
  float rows[8][8];
  bool used[8];
  for (int v = 0; v < 8; v++) {
    const int* row = &coefficients[static_cast<std::size_t>(v * 8)];
    used[v] = std::any_of(row, row + 8, [](int c) { return c != 0; });
    if (!used[v]) continue;
    for (int x = 0; x < 8; x++) {
      float sum = 0.0f;
      for (int u = 0; u < 8; u++) sum += BASIS[x][u] * static_cast<float>(row[u]);
      rows[v][x] = sum;
    }
  }
  for (int y = 0; y < 8; y++)
    for (int x = 0; x < 8; x++) {
      float sum = 128.0f;
      for (int v = 0; v < 8; v++)
        if (used[v]) sum += BASIS[y][v] * rows[v][x];
      out[y * stride + x] = static_cast<uint8_t>(std::clamp(std::lround(sum), 0L, 255L));
    }
}

}  // namespace

std::optional<Bitmap> decode_jpeg(std::span<const std::byte> jpeg) {
  if (jpeg.size() < 4 || byte_at(jpeg, 0) != 0xFF || byte_at(jpeg, 1) != 0xD8) return std::nullopt;
  std::array<std::array<uint16_t, 64>, TABLES> quant{};
  std::array<bool, TABLES> quant_defined{};
  std::array<Huffman, TABLES> dc{}, ac{};
  std::vector<Component> components;
  uint32_t width = 0, height = 0;

  std::size_t at = 2;
  for (;;) {
    // 표식 — 0xFF 와 종류. 길이(자기 2 바이트 포함)가 뒤따른다
    if (jpeg.size() - at < 4 || byte_at(jpeg, at) != 0xFF) return std::nullopt;
    const uint8_t marker = byte_at(jpeg, at + 1);
    const std::size_t length = be16(jpeg, at + 2);
    if (length < 2 || length > jpeg.size() - at - 2) return std::nullopt;
    const std::span<const std::byte> body = jpeg.subspan(at + 4, length - 2);
    at += 2 + length;

    if (marker == 0xDB) {
      // 양자화 표 — 여럿이 이어질 수 있다. 8 비트 값만
      for (std::size_t p = 0; p < body.size(); p += 65) {
        if (body.size() - p < 65) return std::nullopt;
        const uint8_t info = byte_at(body, p);
        if (info >> 4 != 0 || (info & 15) >= TABLES) return std::nullopt;
        for (std::size_t i = 0; i < 64; i++) quant[info & 15][ZIGZAG[i]] = byte_at(body, p + 1 + i);
        quant_defined[info & 15] = true;
      }
    } else if (marker == 0xC4) {
      for (std::size_t p = 0; p < body.size();) {
        if (body.size() - p < 17) return std::nullopt;
        const uint8_t info = byte_at(body, p);
        std::size_t total = 0;
        for (std::size_t i = 0; i < 16; i++) total += byte_at(body, p + 1 + i);
        if (info >> 4 > 1 || (info & 15) >= TABLES || total > 256 || body.size() - p - 17 < total) return std::nullopt;
        if (!build((info >> 4 ? ac : dc)[info & 15], body.subspan(p + 1, 16), body.subspan(p + 17, total))) return std::nullopt;
        p += 17 + total;
      }
    } else if (marker == 0xC0) {
      if (!components.empty() || body.size() < 6 || byte_at(body, 0) != 8) return std::nullopt;
      height = be16(body, 1);
      width = be16(body, 3);
      const std::size_t count = byte_at(body, 5);
      if (!width || !height || width > JPEG_MAX_SIDE || height > JPEG_MAX_SIDE || (count != 1 && count != 3) || body.size() != 6 + count * 3) return std::nullopt;
      for (std::size_t i = 0; i < count; i++) {
        Component c;
        c.id = byte_at(body, 6 + i * 3);
        c.h = byte_at(body, 7 + i * 3) >> 4;
        c.v = byte_at(body, 7 + i * 3) & 15;
        c.quant = byte_at(body, 8 + i * 3);
        if (c.h < 1 || c.h > 2 || c.v < 1 || c.v > 2 || c.quant >= TABLES) return std::nullopt;
        components.push_back(std::move(c));
      }
      // 성분 하나짜리 스캔은 표본 비와 상관없이 8×8 블록 차례다
      if (count == 1) components[0].h = components[0].v = 1;
    } else if (marker == 0xDA) {
      // 스캔 — 모든 성분이 한 스캔에 섞여 온다 (baseline: 계수 0…63 전부, 한 번에)
      if (components.empty() || body.size() != 4 + components.size() * 2 || byte_at(body, 0) != components.size()) return std::nullopt;
      for (std::size_t i = 0; i < components.size(); i++) {
        Component& c = components[i];
        const uint8_t tables = byte_at(body, 2 + i * 2);
        c.dc_table = tables >> 4;
        c.ac_table = tables & 15;
        if (byte_at(body, 1 + i * 2) != c.id || c.dc_table >= TABLES || c.ac_table >= TABLES || !dc[c.dc_table].defined || !ac[c.ac_table].defined || !quant_defined[c.quant])
          return std::nullopt;
      }
      const std::size_t tail = 1 + components.size() * 2;
      if (byte_at(body, tail) != 0 || byte_at(body, tail + 1) != 63 || byte_at(body, tail + 2) != 0) return std::nullopt;
      break;
    } else if ((marker >= 0xE0 && marker <= 0xEF) || marker == 0xFE) {
      // 응용 구간·주석 — 읽지 않는다
    } else {
      // progressive(C2)·그 밖의 SOF, 다시 시작 간격(DD) 등 — 읽지 않는 형식이다
      return std::nullopt;
    }
  }

  int h_max = 1, v_max = 1;
  for (const Component& c : components) {
    h_max = std::max(h_max, c.h);
    v_max = std::max(v_max, c.v);
  }
  const int mcus_x = static_cast<int>((width + static_cast<uint32_t>(h_max * 8) - 1) / static_cast<uint32_t>(h_max * 8));
  const int mcus_y = static_cast<int>((height + static_cast<uint32_t>(v_max * 8) - 1) / static_cast<uint32_t>(v_max * 8));
  for (Component& c : components) {
    c.stride = mcus_x * c.h * 8;
    c.plane.resize(static_cast<std::size_t>(c.stride) * static_cast<std::size_t>(mcus_y * c.v * 8));
  }

  BitReader bits(jpeg, at);
  std::array<int, 64> block;
  for (int my = 0; my < mcus_y; my++)
    for (int mx = 0; mx < mcus_x; mx++)
      for (Component& c : components)
        for (int by = 0; by < c.v; by++)
          for (int bx = 0; bx < c.h; bx++) {
            block.fill(0);
            const std::array<uint16_t, 64>& q = quant[c.quant];
            // DC — 앞 블록과의 차이
            const int size = decode_symbol(bits, dc[c.dc_table]);
            if (size < 0 || size > 11) return std::nullopt;
            c.pred += extend(bits.take(size), size);
            block[0] = c.pred * q[0];
            // AC — (앞의 0 의 수, 값의 크기) 쌍들
            for (int k = 1; k < 64;) {
              const int symbol = decode_symbol(bits, ac[c.ac_table]);
              if (symbol < 0) return std::nullopt;
              const int run = symbol >> 4, bits_size = symbol & 15;
              if (!bits_size) {
                if (run != 15) break;
                k += 16;
                continue;
              }
              k += run;
              if (k > 63) return std::nullopt;
              block[ZIGZAG[k]] = extend(bits.take(bits_size), bits_size) * q[ZIGZAG[k]];
              k++;
            }
            if (bits.failed()) return std::nullopt;
            inverse_dct(block, c.plane.data() + static_cast<std::size_t>((my * c.v + by) * 8) * static_cast<std::size_t>(c.stride) + static_cast<std::size_t>((mx * c.h + bx) * 8), c.stride);
          }
  // 스캔 바로 뒤가 파일의 끝 표식이어야 한다
  const std::optional<std::size_t> end = bits.end();
  if (!end || jpeg.size() - *end != 2 || byte_at(jpeg, *end) != 0xFF || byte_at(jpeg, *end + 1) != 0xD9) return std::nullopt;

  Bitmap bitmap{.width = width, .height = height, .rgba = {}};
  bitmap.rgba.resize(static_cast<std::size_t>(width) * height * 4);
  uint8_t* out = reinterpret_cast<uint8_t*>(bitmap.rgba.data());
  const auto sample = [&](const Component& c, uint32_t x, uint32_t y) {
    return static_cast<int>(c.plane[static_cast<std::size_t>(y * static_cast<uint32_t>(c.v) / static_cast<uint32_t>(v_max)) * static_cast<std::size_t>(c.stride) +
                                    x * static_cast<uint32_t>(c.h) / static_cast<uint32_t>(h_max)]);
  };
  const auto clamped = [](int value) { return static_cast<uint8_t>(std::clamp(value, 0, 255)); };
  for (uint32_t y = 0; y < height; y++)
    for (uint32_t x = 0; x < width; x++, out += 4) {
      const int luma = sample(components[0], x, y);
      if (components.size() == 1) {
        out[0] = out[1] = out[2] = static_cast<uint8_t>(luma);
      } else {
        // JFIF 의 YCbCr (전 범위) → RGB, 16 비트 고정 소수
        const int cb = sample(components[1], x, y) - 128, cr = sample(components[2], x, y) - 128;
        out[0] = clamped(luma + ((91881 * cr + 32768) >> 16));
        out[1] = clamped(luma - ((22554 * cb + 46802 * cr + 32768) >> 16));
        out[2] = clamped(luma + ((116130 * cb + 32768) >> 16));
      }
      out[3] = 255;
    }
  return bitmap;
}

Bitmap halved_srgb(const Bitmap& from) {
  // sRGB 값 → 선형 빛, 선형 빛(4096 칸) → sRGB 값
  static const auto TO_LINEAR = [] {
    std::array<float, 256> table;
    for (int i = 0; i < 256; i++) {
      const float c = static_cast<float>(i) / 255.0f;
      table[static_cast<std::size_t>(i)] = c <= 0.04045f ? c / 12.92f : std::pow((c + 0.055f) / 1.055f, 2.4f);
    }
    return table;
  }();
  static const auto TO_SRGB = [] {
    std::array<uint8_t, 4096> table;
    for (int i = 0; i < 4096; i++) {
      const float c = static_cast<float>(i) / 4095.0f;
      table[static_cast<std::size_t>(i)] = static_cast<uint8_t>(std::lround(255.0f * (c <= 0.0031308f ? c * 12.92f : 1.055f * std::pow(c, 1.0f / 2.4f) - 0.055f)));
    }
    return table;
  }();
  Bitmap half{.width = std::max(1u, from.width / 2), .height = std::max(1u, from.height / 2), .rgba = {}};
  half.rgba.resize(static_cast<std::size_t>(half.width) * half.height * 4);
  const uint8_t* in = reinterpret_cast<const uint8_t*>(from.rgba.data());
  uint8_t* out = reinterpret_cast<uint8_t*>(half.rgba.data());
  for (uint32_t y = 0; y < half.height; y++)
    for (uint32_t x = 0; x < half.width; x++, out += 4) {
      float sum[4]{};
      for (uint32_t dy = 0; dy < 2; dy++)
        for (uint32_t dx = 0; dx < 2; dx++) {
          const uint8_t* p = in + (static_cast<std::size_t>(std::min(y * 2 + dy, from.height - 1)) * from.width + std::min(x * 2 + dx, from.width - 1)) * 4;
          for (int c = 0; c < 3; c++) sum[c] += TO_LINEAR[p[c]];
          sum[3] += static_cast<float>(p[3]);
        }
      for (int c = 0; c < 3; c++) out[c] = TO_SRGB[static_cast<std::size_t>(std::lround(sum[c] * 0.25f * 4095.0f))];
      out[3] = static_cast<uint8_t>(std::lround(sum[3] * 0.25f));
    }
  return half;
}

Bitmap halved_linear(const Bitmap& from) {
  Bitmap half{.width = std::max(1u, from.width / 2), .height = std::max(1u, from.height / 2), .rgba = {}};
  half.rgba.resize(static_cast<std::size_t>(half.width) * half.height * 4);
  const uint8_t* in = reinterpret_cast<const uint8_t*>(from.rgba.data());
  uint8_t* out = reinterpret_cast<uint8_t*>(half.rgba.data());
  for (uint32_t y = 0; y < half.height; y++)
    for (uint32_t x = 0; x < half.width; x++, out += 4) {
      uint32_t sum[4]{};
      for (uint32_t dy = 0; dy < 2; dy++)
        for (uint32_t dx = 0; dx < 2; dx++) {
          const uint8_t* p = in + (static_cast<std::size_t>(std::min(y * 2 + dy, from.height - 1)) * from.width + std::min(x * 2 + dx, from.width - 1)) * 4;
          for (int c = 0; c < 4; c++) sum[c] += p[c];
        }
      for (int c = 0; c < 4; c++) out[c] = static_cast<uint8_t>((sum[c] + 2) / 4);
    }
  return half;
}

}  // namespace engine::hud
