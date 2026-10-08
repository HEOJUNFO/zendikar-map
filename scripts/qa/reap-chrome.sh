#!/bin/bash
# Claude 세션이 측정용으로 띄우고 버린 headless Chrome 과 그 프로필 폴더를 치운다.
# Claude Code 훅(.claude/settings.json)이 세션 시작·턴 끝마다 부른다. 손으로 돌려도 된다.
#
# 건드리는 것
# - 부모가 이미 죽어 ppid 가 1 인 headless Chrome 중, 프로필이 Claude 임시 폴더
#   (/private/tmp/claude-*, $TMPDIR 의 zm-chrome.*) 인 것만. 사람이 쓰는 Chrome 과
#   아직 부모가 살아 있는(측정 중인) Chrome 은 그대로 둔다.
# - 어느 프로세스도 쓰지 않고 10분 넘게 지난 프로필 폴더(cdpprof.*, zm-chrome.*).
set -u

TMP="${TMPDIR:-/tmp}"
TMP="${TMP%/}"

ps -axo pid=,ppid=,command= | awk -v tmp="$TMP" '
  $2 == 1 && /Google Chrome --headless/ &&
  (index($0, "--user-data-dir=/private/tmp/claude-") || index($0, "--user-data-dir=" tmp "/zm-chrome.")) { print $1 }
' | while read -r pid; do
  kill "$pid" 2>/dev/null
  echo "reap-chrome: 버려진 headless Chrome $pid 종료" >&2
done

in_use=$(ps -axo command= | grep -o -- '--user-data-dir=[^ ]*' | sed 's/^--user-data-dir=//' | sort -u)

for dir in /private/tmp/claude-*/*/*/scratchpad/cdpprof.* "$TMP"/zm-chrome.*; do
  [ -d "$dir" ] || continue
  grep -qxF -- "$dir" <<<"$in_use" && continue
  [ -n "$(find "$dir" -maxdepth 0 -mmin +10)" ] || continue
  rm -rf -- "$dir"
done

exit 0
