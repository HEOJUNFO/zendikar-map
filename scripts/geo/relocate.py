"""팬 지도 좌표 → 배치를 조정한 지도 좌표.

extract_geo.py 가 남긴 layout.json(원래 해안선과 덩어리별 이동·축척)을 읽어,
점이 속한(또는 가장 가까운) 원래 육지 덩어리의 변환을 적용한다.

사용: python3 scripts/geo/relocate.py 840 480   → 옮긴 좌표 출력
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

LAYOUT = json.loads((Path(__file__).with_name('layout.json')).read_text())
ORIGINAL = {k: np.array(v, np.int32) for k, v in LAYOUT['original'].items()}
TRANSFORMS = LAYOUT['transforms']

# 바다 위 라벨(만·해협 이름 등)은 가장 가까운 덩어리를 따라간다. 이보다 멀면 움직이지 않는다
NEAREST_LIMIT = 90.0


def owner(x: float, y: float) -> str | None:
    best, best_d = None, NEAREST_LIMIT
    for name, poly in ORIGINAL.items():
        d = cv2.pointPolygonTest(poly, (float(x), float(y)), True)  # 안쪽이면 양수
        if d >= 0:
            return name
        if -d < best_d:
            best, best_d = name, -d
    return best


def relocate(x: float, y: float, landmass: str | None = None) -> tuple[float, float]:
    name = landmass or owner(x, y)
    t = TRANSFORMS.get(name or '')
    if not t:
        return x, y
    return t['cx'] + (x - t['cx']) * t['scale'] + t['dx'], t['cy'] + (y - t['cy']) * t['scale'] + t['dy']


def rescale(r: float, x: float, y: float) -> float:
    """영역 반지름도 덩어리 축척을 따른다."""
    t = TRANSFORMS.get(owner(x, y) or '')
    return r * t['scale'] if t else r


if __name__ == '__main__':
    px, py = float(sys.argv[1]), float(sys.argv[2])
    print(owner(px, py), relocate(px, py))
