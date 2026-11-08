"""픽셀 지도(/pixel)의 글꼴 — Galmuri11(quiple, SIL OFL 1.1, 'Galmuri' 는 예약 글꼴 이름)에서 쓰는 글자만 남기고 이름을 바꾼다.

OFL 은 고친 글꼴(글자를 줄인 것도)이 예약 이름을 쓰지 못하게 하므로 글꼴 안의 이름을 'Zendikar Pixel' 로 바꾼다 (라이선스·저작권 줄은 그대로).
라틴(늘 받는다)과 한글(한국어 보기·한국어 글이 나올 때만 받는다 — CSS unicode-range)로 나눈다.
글자 폭 표(src/pixel/labels/advance.ts)도 같이 쓴다 — 이름 배치가 글꼴에서 잰 폭으로 자리를 잡는다.

  python3 scripts/pixel/subset_font.py <Galmuri11.woff2>     (scripts/pixel/font.sh 가 받아서 부른다)
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

SRC = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/pixel/fonts'
FAMILY = 'Zendikar Pixel'

PARTS = {
    'latin': 'U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+2190-2193,U+2212',
    'hangul': 'U+AC00-D7A3,U+3131-318E,U+3000-303F',
}


def rename(font: TTFont) -> None:
    names = font['name']
    for rec in list(names.names):
        if rec.nameID in (1, 4, 16, 21):
            names.setName(FAMILY, rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID in (3, 6, 20):
            names.setName('ZendikarPixel-Regular', rec.nameID, rec.platformID, rec.platEncID, rec.langID)
        elif rec.nameID in (2, 17, 22):
            names.setName('Regular', rec.nameID, rec.platformID, rec.platEncID, rec.langID)


for part, unicodes in PARTS.items():
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.layout_features = ['*']
    font = TTFont(SRC)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(unicodes))
    sub.subset(font)
    rename(font)
    font.flavor = 'woff2'
    font.save(OUT / f'pixel-{part}.woff2')

# 글자 폭 표 — 글꼴 크기 12px(설계 크기: 한 칸 = 100 단위 = 1px)에서의 폭 (px). 한글은 모두 12px 라 표에 넣지 않는다
font = TTFont(SRC)
upm = font['head'].unitsPerEm
cmap = font.getBestCmap()
hmtx = font['hmtx']
rows = []
for lo, hi in ((0x20, 0x7E), (0xA0, 0xFF), (0x2010, 0x2027), (0x2030, 0x205E), (0x2212, 0x2212)):
    for c in range(lo, hi + 1):
        g = cmap.get(c)
        if g:
            rows.append(f'{c}:{hmtx[g][0] * 12 / upm:g}')
hangul = {hmtx[cmap[c]][0] for c in range(0xAC00, 0xD7A4) if c in cmap}
assert hangul == {upm}, f'한글 폭이 한 가지가 아니다: {hangul}'
(ROOT / 'src/pixel/labels/advance.ts').write_text(
    '// 생성물 — scripts/pixel/subset_font.py 가 Galmuri11 에서 잰 글자 폭 (글꼴 크기 12px 에서의 px, 코드 포인트:폭). 한글 음절은 모두 12px\n'
    '// prettier-ignore\n'
    f'export const ADVANCE_12: ReadonlyMap<number, number> = new Map([{",".join(f"[{r.replace(":", ",")}]" for r in rows)}])\n'
)
print('ok', [p.stat().st_size for p in sorted(OUT.glob('pixel-*.woff2'))])
