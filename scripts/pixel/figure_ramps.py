#!/usr/bin/env python3
"""카드마다 그림을 칠할 색 램프를 고른다 (카드 그림 대조 C25 — 사용자 결정 2026-11-09 '1차 방식').

가장 깊은 단계의 픽셀 그림은 카드 원본 그림의 주된 빛에서 고른 pixelfx 램프 한 줄로 칠한다(scripts/pixel/figureColor.mjs).
카드 그림(Scryfall art_crop)은 저장소에 싣지 않는다 — references/card-art/<카드 id>.jpg 에 받아 두고(없으면 받는다), 고른 램프만
scripts/pixel/figureRamps.json 에 싣는다. 카드 그림은 카드를 고르는 근거일 뿐 지도에 붙이지 않는다(CLAUDE.md).

카드 1282장의 램프는 카드 원본 그림을 하나씩 보고 골랐다(2026-11-09 — 그림의 주인공 빛, 배경 빛이 아니다). 이 스크립트는 figureRamps.json 에
아직 없는 카드(새로 실은 카드)만 자동으로 채운다 — 그림 가운데를 무겁게, 가장자리(배경)에 흔한 빛은 가볍게 센 픽셀마다 가장 가까운 램프 단에 표를 주고,
빛깔 있는 표가 무채색 표의 CHROMA_WINS 배를 넘으면 빛깔 램프에서 고른다. 자동으로 고른 것은 대조판으로 보고 JSON 을 손으로 고친다
(--redo id,… 는 그 카드를 다시 자동으로 고른다).

python3 scripts/pixel/figure_ramps.py [--redo id,…]   (pnpm 의존 없음 — Pillow 만)
"""
import json, math, os, subprocess, sys, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'references', 'card-art')
OUT = os.path.join(ROOT, 'scripts', 'pixel', 'figureRamps.json')

# src/pixel/figures/ramps.ts 의 RAMPS 와 같은 차례·빛
def ramps():
    src = open(os.path.join(ROOT, 'src', 'pixel', 'figures', 'ramps.ts')).read()
    out = {}
    for line in src.split('\n'):
        line = line.strip()
        if line.endswith('],') and ": ['#" in line:
            k, v = line.split(':', 1)
            out[k.strip()] = [h.strip().strip("'") for h in v.strip().rstrip(',').strip('[]').split(',')]
    return out

# 표를 받지 않는 램프 — 그림의 몫이 따로 칠하는 빛(불·숲·물·금)과 겹치는 아주 짙은 램프, 그리고 지도 그림에 맞지 않는 형광 램프
NO_VOTE = {'electric', 'volt', 'lava'}


def lab(c):
    def f(v):
        v /= 255
        return ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92
    r, g, b = (f(x) for x in c)
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    g_ = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = g_(x), g_(y), g_(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def hx(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


NEUTRAL = {'smoke', 'bone', 'dust', 'metal', 'stone'}
# 빛깔 있는 표가 무채색 표의 이만큼을 넘으면 빛깔 램프 — 카드 그림은 대개 흐려 무채색이 늘 이기니 빛깔을 앞세운다
CHROMA_WINS = 0.3
CHROMA_MIN = 14


def pick(path, R):
    im = Image.open(path).convert('RGB').resize((48, 36), Image.BILINEAR)
    W, H = im.size
    px = [im.getpixel((i % W, i // W)) for i in range(W * H)]
    # 단마다의 Lab — 가장 어두운 둘·가장 밝은 끝은 표를 받지 않는다 (그림자·하이라이트는 어느 램프에나 있다)
    tones = [(name, i, lab(hx(h))) for name, r in R.items() if name not in NO_VOTE for i, h in enumerate(r) if 2 <= i <= len(r) - 2]
    hued = [t for t in tones if t[0] not in NEUTRAL]
    grey = [t for t in tones if t[0] in NEUTRAL]
    labs = [lab(c) for c in px]
    def bin_(L, a, b):
        return (int(L // 12), int(math.atan2(b, a) * 6 / math.pi) % 12 if math.hypot(a, b) > 12 else -1)
    border, center = {}, {}
    bins = []
    for i, (L, a, b) in enumerate(labs):
        x, y = i % W, i // W
        k = bin_(L, a, b)
        bins.append(k)
        d = border if min(x, y, W - 1 - x, H - 1 - y) < 5 else center
        d[k] = d.get(k, 0) + 1
    nb = sum(border.values())
    nc = sum(center.values()) or 1
    votes = {}
    steps = {}
    hv = gv = 0
    for i, (L, a, b) in enumerate(labs):
        x, y = i % W, i // W
        dx, dy = (x - W / 2) / (W * 0.32), (y - H / 2) / (H * 0.36)
        w = math.exp(-(dx * dx + dy * dy) / 2)
        k = bins[i]
        bshare = border.get(k, 0) / nb
        cshare = center.get(k, 0) / nc
        # 가장자리에 더 흔한 빛(하늘·땅·배경)은 가볍게
        if bshare > cshare:
            w *= max(0.1, 1 - (bshare - cshare) / max(bshare, 1e-9))
        chroma = math.hypot(a, b)
        if chroma > CHROMA_MIN:
            # 빛깔 — 밝기보다 빛깔이 가깝게
            w *= min(chroma, 70) / 35
            best = min(hued, key=lambda t: 0.3 * (t[2][0] - L) ** 2 + (t[2][1] - a) ** 2 + (t[2][2] - b) ** 2)
            hv += w
        else:
            best = min(grey, key=lambda t: (t[2][0] - L) ** 2 + (t[2][1] - a) ** 2 + (t[2][2] - b) ** 2)
            gv += w
        votes[best[0]] = votes.get(best[0], 0) + w
        steps.setdefault(best[0], []).append((best[1], w))
    pool = [n for n in votes if (n not in NEUTRAL) == (hv >= CHROMA_WINS * gv)] or list(votes)
    name = max(pool, key=votes.get)
    st = sorted(steps[name])
    half = sum(w for _, w in st) / 2
    acc = 0
    base = st[-1][0]
    for i, w in st:
        acc += w
        if acc >= half:
            base = i
            break
    return name, max(3, min(5, base))


def cards():
    js = "import('./scripts/phase-cards.mjs').then(m=>{const s=new Set();const o=[];for(const c of m.BY_PHASE.flat()){if(c.place||s.has(c.id))continue;s.add(c.id);o.push([c.id,c.image])}console.log(JSON.stringify(o))})"
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], cwd=ROOT))


def art_crop(url):
    # Scryfall 의 카드 그림(normal)과 같은 판의 그림만 자른 것(art_crop)
    return url.replace('/normal/', '/art_crop/')


def main():
    redo = set(sys.argv[sys.argv.index('--redo') + 1].split(',')) if '--redo' in sys.argv else set()
    R = ramps()
    os.makedirs(ART, exist_ok=True)
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    out = dict(old)
    for cid, url in cards():
        if cid in out and cid not in redo:
            continue
        p = os.path.join(ART, f'{cid}.jpg')
        if not os.path.exists(p):
            req = urllib.request.Request(art_crop(url), headers={'User-Agent': 'zendikar-map-pixel/1.0'})
            with urllib.request.urlopen(req) as r, open(p, 'wb') as f:
                f.write(r.read())
        out[cid] = list(pick(p, R))
    # 한 줄에 카드 하나 — 고친 카드가 diff 에 한 줄로 보인다
    open(OUT, 'w').write('{\n' + ',\n'.join(f'"{k}":["{v[0]}",{v[1]}]' for k, v in sorted(out.items())) + '\n}\n')
    from collections import Counter
    print(len(out), Counter(v[0] for v in out.values()).most_common())


if __name__ == '__main__':
    main()
