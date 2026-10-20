#!/usr/bin/env bash
# 판타지 지형 생성 참고용 repo를 references/ 에 받는다 (git 추적 제외).
# 사용: pnpm refs            — 없으면 clone, 있으면 pull
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p references

repos=(
  "Azgaar/Fantasy-Map-Generator"  # 절차적 판타지 지도 생성기 (Vite 앱, 실행 가능)
  "mewo2/terrain"                 # Martin O'Leary 지형 생성 알고리즘 (terrain.js 단일 파일)
)

for repo in "${repos[@]}"; do
  dir="references/$(basename "$repo")"
  if [ -d "$dir/.git" ]; then
    echo "update $repo"
    # 얕은 clone 은 pull --ff-only 가 갈라진 이력에서 멈추므로 받아서 맞춘다 (읽기 전용이라 로컬 변경 없음)
    git -C "$dir" fetch --depth 1 origin
    git -C "$dir" reset --hard FETCH_HEAD
  else
    echo "clone  $repo"
    git clone --depth 1 "https://github.com/$repo.git" "$dir"
  fi
done
