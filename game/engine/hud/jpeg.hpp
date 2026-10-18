#pragma once

#include <cstddef>
#include <optional>
#include <span>

#include "engine/hud/bitmap.hpp"

namespace engine::hud {

/** JPEG 한 변의 상한 (픽셀) — 이보다 큰 그림은 거절한다 */
inline constexpr uint32_t JPEG_MAX_SIDE = 4096;

/**
 * baseline JPEG 을 푼다 (알파는 255) — 받은 파일은 믿지 않는다: 머리·표·길이·범위가 어긋나거나 데이터가 모자라거나 남으면 nullopt.
 * 읽는 것: Huffman baseline(SOF0), 8 비트, 스캔 하나, 회색 또는 YCbCr(성분마다 표본 비 1 또는 2 — 4:4:4·4:2:2·4:2:0).
 * 읽지 않는 것(거절): progressive·산술 부호화·12 비트·무손실, 다시 시작 간격(DRI), 여러 스캔, CMYK.
 * ceiling: 줄인 색차는 가장 가까운 표본을 그대로 쓴다(보간 없음) — 채도가 낮은 돌 텍스처에서는 보이지 않는다.
 * 색 경계가 또렷한 그림을 4:2:0 으로 실어 계단이 보이면 색차를 선형 보간으로 키운다
 */
std::optional<Bitmap> decode_jpeg(std::span<const std::byte> jpeg);

/**
 * 가로세로를 반으로 줄인 그림 (밉 한 단계, 한 변이 1 이면 그 변은 그대로) — 색은 sRGB 로 보고 선형 빛으로 바꿔 네 픽셀을 평균한 뒤 되돌린다
 * (감마 값을 그대로 평균하면 멀리서 어두워진다). 알파는 그대로 평균한다
 */
Bitmap halved_srgb(const Bitmap& from);
/** 같은 줄이기 — 값을 그대로(선형으로) 평균한다. 색이 아닌 그림(법선·거칠기)의 밉에 쓴다 */
Bitmap halved_linear(const Bitmap& from);

}  // namespace engine::hud
