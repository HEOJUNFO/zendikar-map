"""팬 지도(asset/)에서 해안선·숲·내해 폴리곤을 뽑아 src/data/geo/*.json 으로 저장한다.

사용: python3 scripts/geo/extract_geo.py   (opencv-python, numpy 필요)

좌표계: 추출은 전체도(1080x760)의 2배인 2160x1520 모자이크에서 한다. 사분면 확대 이미지 4장을 전체도에 SIFT로
정합해 2배 해상도 모자이크를 만든 뒤, 바다를 flood fill 해서 나머지를 육지로 본다.
저장하는 결과는 대륙 배치(LAYOUT)를 적용한 2400x1700 지도 단위다.
원본 이미지는 읽기만 한다.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ASSET = str(ROOT / 'asset' / 'planar-map-of-zendikar-v0-{}.webp')
OUT = ROOT / 'src' / 'data' / 'geo'

W, H = 2160, 1520  # 팬 지도 모자이크 좌표 (추출 단계)
# 설정에 맞춰 대륙을 옮기려면 자리가 모자라 지도 화면은 넓힌다
OUT_W, OUT_H = 2400, 1700
FULL = 'kx4omcy09xlb1'
QUADRANTS = ['0yxp1i219xlb1', '96g2u3619xlb1', 'czuwb9c19xlb1', 'egk3rh919xlb1']

# 바다 위 글자(대륙명·제목·섬 이름) — 지우지 않으면 육지 덩어리로 잡힌다. (x0, y0, x1, y1)
OCEAN_TEXT = [
    (230, 280, 460, 370), (980, 200, 1180, 270), (790, 660, 1250, 800), (470, 1080, 680, 1160),
    (800, 960, 1045, 1040), (1410, 1200, 1670, 1290), (1990, 1000, 2130, 1120),
    (735, 292, 792, 311), (805, 336, 852, 351), (864, 366, 952, 390), (858, 392, 896, 406),
    (864, 522, 958, 545), (463, 403, 516, 437), (441, 1139, 468, 1168), (1530, 268, 1705, 326),
    (858, 389, 898, 405), (884, 449, 950, 484),
    # Bala Ged 동해안 만 안의 'Bojuka Bog' 글자 — 만 입구를 막고 있었다
    (2016, 914, 2054, 937), (2058, 918, 2092, 942),
    # Sejiri 남해안의 'Midnight Pass' 글자 — 해안에 붙어 가짜 반도가 된다
    (1212, 158, 1264, 192),
]
# 육지로 메우는 다각형
SEALS = [
    # 해안선이 끊긴 Lake Jeft 하구 삼각주 — 바깥 변은 팬 지도의 삼각주 해안선을 따라 (곧은 변이 그대로 해안선이 된다)
    [(1518, 1178), (1585, 1150), (1601, 1120), (1638, 1160), (1612, 1206), (1606, 1211), (1598, 1213), (1588, 1214),
     (1578, 1216), (1568, 1214), (1560, 1216), (1552, 1213), (1544, 1216), (1536, 1215), (1528, 1212), (1522, 1204)],
    # Murasa 서해안의 작은 만 ('SUNDER BAY' 글자가 걸쳐 해안선이 엉킨다). 공식 Sunder Bay 는 이 자리가 아니고,
    # 공식 설정상 Murasa's Wall 의 틈은 Sunder Bay·Cliffs of Kazuul·Thunder Gap·Glint Pass 넷이라 이름 없는 만은 메운다.
    [(852, 1262), (884, 1250), (918, 1252), (930, 1272), (928, 1300), (905, 1312), (872, 1308), (850, 1296)],
    # Guul Draz 북쪽 끝 곶의 밑동 — 서쪽 선이 끊겨 바다가 새어 들고, 반경 11 영역의 위쪽 경계(y 800)에서 땅이 평평하게 잘린다
    [(1633, 806), (1637, 799), (1640, 791), (1643, 786), (1647, 788), (1651, 794), (1656, 800), (1659, 806)],
]
# 해안선 틈을 메우는 반경. 기본 3, 남동 대륙은 하구·늪 물길이 많아 11, 중앙 군도는 글자가 붙지 않게 1.
# 영역은 상자 (x0, y0, x1, y1) 또는 다각형 [(x, y), ...]. 영역 경계가 땅을 가로지르면 두 반경의 결과가 달라
# 해안이 그 경계를 따라 자로 그은 듯 잘린다 — 그래서 영역은 땅을 가르지 않게 잡는다.
#   - Bala Ged 북단(Guum Wilds 윗부분)은 y 800 위로 솟아 있어 그 부분까지 11 로 메운다.
#   - 중앙 군도에서는 Ondu 본토의 동쪽 곶(x<790, y>490)을 뺀다.
CLOSE_RADIUS = [
    ((1190, 800, 2160, 1345), 11),
    ((1780, 700, 2130, 800), 11),
    ([(700, 270), (1000, 270), (1000, 590), (790, 590), (790, 490), (700, 490)], 1),
]
# 메운 뒤 다시 바다로 파내는 물길 — 메우는 반경이 막아 버리지만 해안선으로 남아야 하는 좁은 만.
# 반경을 줄여 열면 만 머리의 강을 타고 바다가 내륙까지 번지므로, 팬 지도의 양안을 따라 직접 그린다.
CUTS = [
    # Sunder Bay — 공식 설정은 '거대한(enormous) 만'이자 Murasa's Wall 의 가장 큰 틈(PG: Murasa and Sejiri)인데 팬 지도의 남해안은
    # 작은 만입부뿐이라, 노래하는 도시 거의 정남쪽의 그 만입부를 너비 약 80·깊이 약 55단위(옮긴 좌표)의 만으로 넓힌다. 크기·모양은 이 지도의 판단
    [(1047, 1468), (1050, 1455), (1047, 1442), (1052, 1431), (1060, 1420), (1066, 1411), (1076, 1403), (1085, 1396),
     (1095, 1391), (1105, 1392), (1113, 1397), (1120, 1406), (1127, 1412), (1132, 1422), (1133, 1433), (1138, 1443),
     (1145, 1453), (1151, 1463), (1156, 1516), (1043, 1516)],
    # Free City of Nimana 의 좁은 만 (Guul Draz 남서 해안) — 'Free City of Nimana' 는 이 만 머리의 항구다
    [(1416, 1206), (1418, 1196), (1416, 1186), (1415, 1172), (1414, 1158), (1413, 1146), (1412, 1136), (1414, 1124),
     (1416, 1112), (1418, 1104), (1421, 1104), (1422, 1114), (1426, 1122), (1428, 1130), (1423, 1140), (1421, 1147),
     (1428, 1152), (1434, 1158), (1438, 1164), (1446, 1166), (1452, 1166), (1458, 1171), (1466, 1177), (1468, 1192),
     (1440, 1210)],
    # Midnight Pass — Sejiri 남쪽 절벽을 깊이 파고드는 좁은 해협 (PG: Murasa and Sejiri). 메우는 반경이 막아 버린다
    [(1210, 162), (1215, 150), (1221, 138), (1224, 122), (1228, 110), (1233, 102), (1237, 102), (1236, 112),
     (1233, 124), (1231, 136), (1230, 148), (1229, 156), (1233, 162)],
]
OCEAN_SEEDS = [(1000, 900), (5, H - 5), (W - 5, H - 5), (5, 700), (1100, 1500)]

# 폴리곤 내부 좌표로 육지 덩어리 이름을 붙인다
LANDMASS_PROBES = {
    'sejiri': (1045, 60), 'akoum': (1629, 458), 'ondu': (399, 656), 'guul-draz-bala-ged': (1700, 950),
    'tazeem': (300, 1250), 'murasa': (1050, 1280), 'jwar': (757, 325), 'beyeen': (830, 375),
    'agadeem': (840, 480),
}
# 공식 설정에 맞추려고 팬 지도의 대륙 배치를 옮긴다 — 덩어리별 (dx, dy, scale). scale 은 무게중심 기준.
# 공식 세계 지도는 없고(docs/lore.md), 글로 된 단서에 어긋나는 배치만 고쳤다:
#   Ondu 는 남서 사분면, 딸린 섬(Agadeem·Beyeen·Jwar)은 본토 남쪽 / Tazeem 은 Guul Draz 와 좁은 바다를 사이에 둔 서쪽 이웃 /
#   Murasa 는 다른 대륙보다 작다 / Sejiri 는 극지(북쪽) / Tazeem 과 Murasa 사이는 '넓은 바다'(Home Waters, 2015).
# 'follow' 는 다른 덩어리와 같은 변환을 쓴다 (그 덩어리의 무게중심 기준).
LAYOUT: dict[str, dict] = {
    'sejiri': {'dx': 108, 'dy': 0},
    'akoum': {'dx': 300, 'dy': 10},
    'guul-draz-bala-ged': {'dx': 280, 'dy': 80},
    'tazeem': {'dx': 912, 'dy': -306},
    'murasa': {'dx': 115, 'dy': 221, 'scale': 0.8},
    'ondu': {'dx': -27, 'dy': 435},
    'agadeem': {'dx': -506, 'dy': 1019},
    'beyeen': {'dx': -349, 'dy': 1124},
    'jwar': {'dx': -561, 'dy': 1122},
    # Akoum 과 Guul Draz 사이의 작은 섬들, Murasa 곁의 작은 섬
    'islet-chain-north': {'dx': 290, 'dy': 45},
    'islet-chain-south': {'dx': 290, 'dy': 45},
    'islet-murasa': {'follow': 'murasa'},
}

# 작은 섬 — 면적 순서는 추출 조건에 따라 바뀌므로 안쪽 한 점으로 이름을 붙인다
ISLET_PROBES = {
    'islet-chain-north': (1583, 674),  # Akoum 과 Guul Draz 사이 섬 사슬
    'islet-chain-south': (1620, 716),
    'islet-murasa': (737, 1025),  # Murasa 북서쪽 작은 섬
}

# 숲(청록 채색) 중 강줄기 색이 잡힌 것 제외
FOREST_EXCLUDE = [(1533, 1127)]


def build_mosaic() -> np.ndarray:
    full = cv2.imread(ASSET.format(FULL))
    full_gray = cv2.cvtColor(full, cv2.COLOR_BGR2GRAY)
    sift = cv2.SIFT_create(8000)
    kf, df = sift.detectAndCompute(full_gray, None)
    canvas = np.full((H, W, 3), 255, np.uint8)
    cover = np.zeros((H, W), np.uint8)
    for name in QUADRANTS:
        q = cv2.imread(ASSET.format(name))
        kq, dq = sift.detectAndCompute(cv2.cvtColor(q, cv2.COLOR_BGR2GRAY), None)
        pairs = cv2.BFMatcher().knnMatch(dq, df, k=2)
        good = [a for a, b in pairs if a.distance < 0.75 * b.distance]
        src = np.float32([kq[g.queryIdx].pt for g in good])
        dst = np.float32([kf[g.trainIdx].pt for g in good])
        M, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3)
        M = M * 2.0
        warped = cv2.warpAffine(q, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
        mask = cv2.warpAffine(np.full(q.shape[:2], 255, np.uint8), M, (W, H), flags=cv2.INTER_NEAREST)
        m = cv2.erode(mask, np.ones((2, 2), np.uint8)) > 0
        overlap = cover[m] > 0
        canvas[m] = np.where(overlap[:, None], np.minimum(canvas[m], warped[m]), warped[m])
        cover[m] = 255
    up = cv2.resize(full, (W, H), interpolation=cv2.INTER_CUBIC)
    canvas[cover == 0] = up[cover == 0]
    return canvas


def land_mask(gray: np.ndarray) -> np.ndarray:
    ink = (gray < 170).astype(np.uint8) * 255
    for x0, y0, x1, y1 in OCEAN_TEXT:
        ink[y0:y1, x0:x1] = 0
    for poly in SEALS:
        cv2.fillPoly(ink, [np.array(poly, np.int32)], 255)

    def at_radius(r: int) -> np.ndarray:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
        flood = (cv2.dilate(ink, k) == 0).astype(np.uint8)
        for sx, sy in OCEAN_SEEDS:
            if flood[sy, sx] == 1:
                cv2.floodFill(flood, None, (sx, sy), 2)
        # 팽창한 만큼 되돌려 경계가 그려진 선 위에 오도록
        return cv2.erode((flood != 2).astype(np.uint8), k)

    radius = {3: at_radius(3)}
    land = radius[3].copy()
    for region, r in CLOSE_RADIUS:
        if r not in radius:
            radius[r] = at_radius(r)
        inside = np.zeros_like(land)
        if isinstance(region, tuple):
            x0, y0, x1, y1 = region
            inside[y0:y1, x0:x1] = 1
        else:
            cv2.fillPoly(inside, [np.array(region, np.int32)], 1)
        land = np.where(inside > 0, radius[r], land).astype(np.uint8)
    for poly in CUTS:
        cv2.fillPoly(land, [np.array(poly, np.int32)], 0)
    return land


def flood_region(gray: np.ndarray, seed, texts, r: int, limit: int, box=None) -> np.ndarray:
    """잉크 선으로 둘러싸인 안쪽 영역 (글자는 지우고 틈은 r 만큼 메운다). box 가 있으면 그 안에서만 찾는다."""
    ink = (gray < 185).astype(np.uint8) * 255
    for x0, y0, x1, y1 in texts:
        ink[y0:y1, x0:x1] = 0
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    free = (cv2.dilate(ink, k) == 0).astype(np.uint8)
    if box:
        x0, y0, x1, y1 = box
        inside = np.zeros_like(free)
        inside[y0:y1, x0:x1] = 1
        free &= inside
    cv2.floodFill(free, None, seed, 2)
    region = cv2.dilate((free == 2).astype(np.uint8), k)
    if int(region.sum()) > limit:
        raise SystemExit(f'{seed}: 영역이 새어 나갔다 ({int(region.sum())}px)')
    return region


def polygon(contour: np.ndarray, eps: float) -> list[list[int]]:
    return cv2.approxPolyDP(contour, eps, True).reshape(-1, 2).tolist()


def self_intersections(pts: list) -> int:
    """닫힌 다각형의 변끼리 교차하는 쌍의 수 (이웃 변 제외)"""
    p = np.array(pts, np.float64)
    a, b = p, np.roll(p, -1, axis=0)
    n = len(p)
    count = 0
    for i in range(n):
        j = np.arange(i + 2, n)
        if i == 0:
            j = j[j != n - 1]
        if len(j) == 0:
            continue
        p1, p2, q1, q2 = a[i], b[i], a[j], b[j]
        d = lambda o, u, v: (u[..., 0] - o[..., 0]) * (v[..., 1] - o[..., 1]) - (u[..., 1] - o[..., 1]) * (v[..., 0] - o[..., 0])
        o1, o2 = d(p1, p2, q1), d(p1, p2, q2)
        o3, o4 = d(q1, q2, p1), d(q1, q2, p2)
        count += int(np.sum((o1 * o2 < 0) & (o3 * o4 < 0)))
    return count


def extract_land(land: np.ndarray) -> dict:
    # 잉크 선 한두 픽셀 폭으로만 이어진 땅(실 같은 곶, 올가미 모양)은 다각형을 꼬이게 하므로 걷어 낸다.
    # 작은 섬은 가는 목으로 이어진 경우가 있어 큰 대륙에만 적용한다.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(land, 8)
    big = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 50000])
    opened = cv2.morphologyEx(land, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    land = np.where(big, opened, land).astype(np.uint8)
    contours, _ = cv2.findContours(land, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    shapes = sorted(((cv2.contourArea(c), c) for c in contours if cv2.contourArea(c) >= 120), key=lambda s: -s[0])
    big = [c for a, c in shapes if a > 50000]
    named: dict[str, list] = {}
    islets: dict[str, list] = {}
    for area, c in shapes:
        mo = cv2.moments(c)
        cx, cy = mo['m10'] / mo['m00'], mo['m01'] / mo['m00']
        if area <= 50000 and any(cv2.pointPolygonTest(b, (cx, cy), False) >= 0 for b in big):
            continue  # 큰 대륙 안쪽 글자 조각
        pts = polygon(c, 1.0 if area > 50000 else 0.7)
        name = next((n for n, p in LANDMASS_PROBES.items() if cv2.pointPolygonTest(c, p, False) >= 0), None)
        if name:
            named[name] = pts
            continue
        # 가늘고 휜 섬은 무게중심이 바깥에 떨어질 수 있어 가장자리 근처(6px)까지 같은 섬으로 본다
        islet = next((n for n, p in ISLET_PROBES.items() if cv2.pointPolygonTest(c, p, True) >= -6), None)
        if islet:
            islets[islet] = pts
        else:
            print(f'  이름 없는 조각 버림: 중심 ({cx:.0f}, {cy:.0f}) 넓이 {area:.0f}')
    missing = (set(LANDMASS_PROBES) - set(named)) | (set(ISLET_PROBES) - set(islets))
    if missing:
        raise SystemExit(f'landmass not found: {missing} — 해안선 틈을 확인할 것')
    for name, pts in {**named, **islets}.items():
        if (k := self_intersections(pts)):
            raise SystemExit(f'{name}: 해안선이 {k}번 스스로 교차한다')
    # 위쪽 가장자리에 붙은 세지리는 지도 밖으로 늘려 테두리 선이 보이지 않게 한다
    named['sejiri'] = [[x, -6000 if y <= 1 else y] for x, y in named['sejiri']]
    return {'landmasses': named, 'islets': islets}


def extract_forests(img: np.ndarray, land: np.ndarray) -> list:
    # 육지 마스크의 안쪽 구멍(해안 가까이 잉크 선 사이)도 땅으로 친다 — 해안선은 바깥 윤곽만 쓰기 때문
    contours, _ = cv2.findContours(land, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    land = cv2.drawContours(np.zeros_like(land), contours, -1, 1, thickness=cv2.FILLED)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    teal = ((s > 8) & (h >= 70) & (h <= 100) & (v > 120)).astype(np.float32)
    density = cv2.GaussianBlur(teal, (0, 0), 16)
    mask = ((density > 0.06) & (land > 0)).astype(np.uint8)
    # 사분면 이미지 이음매(y≈766) 위쪽은 채색이 빠진 경우가 있다 — 이음매 바로 아래 숲을 위로 이어 붙인다
    # (흐림 처리 때문에 경계가 이음매보다 30px 남짓 아래로 물러나 있어, 충분히 아래 줄을 기준으로 삼는다)
    # 채색이 빠진 곳은 Bala Ged 북쪽(x 1790-2110)뿐이라 그 구간에만 적용한다 — 다른 숲에 쓰면 반듯한 경계가 생긴다
    seam, x0, x1 = 766, 1790, 2110
    below = mask[seam + 45, x0:x1].copy()
    for y in range(seam - 50, seam + 45):
        mask[y, x0:x1] |= below & land[y, x0:x1]
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in sorted(contours, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(c) < 2500:
            continue
        if any(cv2.pointPolygonTest(c, p, False) >= 0 for p in FOREST_EXCLUDE):
            continue
        out.append(polygon(c, 2.5))
    return out


# 육지 안의 물 — 이름: (안쪽 한 점, 지울 글자 상자들, 틈 메우는 반경)
INLAND_WATERS = {
    'halimar': ((360, 1180), [(345, 1185, 430, 1220)], 2),
    # Bojuka Bay — 바다와는 나무 띠로 가로막힌 늪 만 (PG: Bala Ged)
    'bojuka': ((2030, 925), [(2016, 914, 2054, 937)], 4),
}
# 바다 쪽에 남길 땅의 너비(px, 이 덩어리는 LAYOUT 축척이 없어 지도 단위와 같다) — Bojuka Bay 는
# 'protected from the waves by the thousands of trees between it and the ocean'(PG: Bala Ged) 이라 나무 기호가 설 만큼
# (해안에서 6단위 넘게) 띠를 남긴다. 10 이상이면 만의 북쪽 팔이 끊긴다
INLAND_WATER_SHORE = {'bojuka': 9}


# 테두리가 옅은 파란 선이라 잉크로 잡히지 않는 호수 — 팬 지도 윤곽을 타원으로 근사 (중심, 반지름, 꼭짓점 수)
INLAND_WATER_ELLIPSES = {
    # Murasa 의 Blackbloom Lake — 팬 지도에 없다. 공식 설정의 '카잔두 한가운데의 늪지 호수'(PG: Murasa and Sejiri)를
    # 장소 자리(옮긴 좌표 1289,1529)에 작게 그린다. 크기는 이 지도의 판단
    'blackbloom-lake': ((1205, 1316), (12, 8), 16),
    'lake-jeft': ((1529, 1104), (46, 15), 28),  # Guul Draz, 기슭에 인어 정착지 Lulea
    # Akoum 의 Glasspool — 팬 지도는 둥글게 그렸지만 공식 설정은 '이상한 육각형' 호수 (PG: Akoum)
    'glasspool': ((1876, 557), (27, 27), 6),
}


def extract_inland_waters(gray: np.ndarray, land: np.ndarray) -> dict:
    out = {}
    # 내해는 육지 안쪽에 온전히 들어가야 한다 — 해안선에 걸친 꼭짓점이 바다로 삐져나오지 않게
    inner = cv2.erode(land, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    for name, ((cx, cy), (rx, ry), n) in INLAND_WATER_ELLIPSES.items():
        out[name] = [[round(cx + rx * np.cos(t)), round(cy + ry * np.sin(t))] for t in np.linspace(0, 2 * np.pi, n, endpoint=False)]
    for name, (seed, texts, r) in INLAND_WATERS.items():
        region = flood_region(gray, seed, texts, r, 40000) & inner
        if name in INLAND_WATER_SHORE:
            region &= (cv2.distanceTransform(land, cv2.DIST_L2, 5) > INLAND_WATER_SHORE[name]).astype(np.uint8)
        contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        out[name] = polygon(max(contours, key=cv2.contourArea), 1.2)
    return out


def centroid(pts: list) -> tuple[float, float]:
    c = np.array(pts, np.float32).reshape(-1, 1, 2)
    m = cv2.moments(c)
    return m['m10'] / m['m00'], m['m01'] / m['m00']


def apply_layout(coast: dict, features: dict) -> dict:
    """LAYOUT 의 이동·축척을 육지 덩어리와 그 안의 숲·내해에 적용하고, 지명 좌표 변환용 표를 돌려준다."""
    named = coast['landmasses']
    islets = coast['islets']
    everything = {**named, **islets}
    originals = {k: np.array(v, np.int32) for k, v in everything.items()}
    table = {}
    for name, spec in LAYOUT.items():
        if 'follow' in spec:
            continue
        cx, cy = centroid([p for p in everything[name] if p[1] > -1000])
        table[name] = {'dx': spec['dx'], 'dy': spec['dy'], 'scale': spec.get('scale', 1.0), 'cx': round(cx, 1), 'cy': round(cy, 1)}
    for name, spec in LAYOUT.items():
        if 'follow' in spec:
            table[name] = table[spec['follow']]

    def move(pt, t):
        x, y = pt
        if y < -1000:  # 지도 위로 늘린 세지리 꼭짓점
            return [round(x + t['dx']), y]
        return [round(t['cx'] + (x - t['cx']) * t['scale'] + t['dx']), round(t['cy'] + (y - t['cy']) * t['scale'] + t['dy'])]

    def owner(poly):
        cx, cy = centroid(poly)
        return next((n for n, o in originals.items() if cv2.pointPolygonTest(o, (cx, cy), False) >= 0), None)

    for name, t in table.items():
        group = named if name in named else islets
        group[name] = [move(p, t) for p in group[name]]
    features['forests'] = [[move(p, table[o]) for p in f] if (o := owner(f)) in table else f for f in features['forests']]
    for name, w in features['waters'].items():
        if (o := owner(w)) in table:
            features['waters'][name] = [move(p, table[o]) for p in w]
    return {'transforms': table, 'original': {k: v.tolist() for k, v in originals.items()}}


def main() -> None:
    img = build_mosaic()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    land = land_mask(gray)
    coast = extract_land(land)
    features = {'forests': extract_forests(img, land), 'waters': extract_inland_waters(gray, land)}
    layout = apply_layout(coast, features)
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'width': OUT_W, 'height': OUT_H, 'source': 'asset/planar-map-of-zendikar-v0-*.webp (fan map, traced and rearranged to fit canon)'}
    (OUT / 'coastlines.json').write_text(json.dumps({**meta, **coast}, separators=(',', ':')))
    (OUT / 'features.json').write_text(json.dumps({**meta, **features}, separators=(',', ':')))
    # 팬 지도 좌표로 적힌 지명을 옮긴 배치에 맞추는 데 쓴다 (scripts/geo/relocate.py)
    (ROOT / 'scripts' / 'geo' / 'layout.json').write_text(json.dumps(layout, separators=(',', ':')))
    n = sum(len(p) for p in coast['landmasses'].values())
    print(f"landmasses {len(coast['landmasses'])} ({n} pts), islets {len(coast['islets'])}, "
          f"forests {len(features['forests'])}, waters {list(features['waters'])}")


if __name__ == '__main__':
    main()
