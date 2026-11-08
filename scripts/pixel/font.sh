#!/usr/bin/env bash
# 픽셀 지도 글꼴 다시 만들기 — npm 의 galmuri(2.40.3, OFL)를 임시 폴더에 받아 subset_font.py 로 줄이고 이름을 바꾼다
set -euo pipefail
cd "$(dirname "$0")/../.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
(cd "$tmp" && npm pack galmuri@2.40.3 --silent >/dev/null && tar xzf galmuri-2.40.3.tgz)
cp "$tmp/package/dist/LICENSE.txt" src/pixel/fonts/OFL.txt
python3 scripts/pixel/subset_font.py "$tmp/package/dist/Galmuri11.woff2"
