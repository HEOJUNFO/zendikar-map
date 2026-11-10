#!/bin/bash
# 클라우드 세션 시작 때 의존성과 프로젝트 플러그인을 설치한다.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

pnpm install

# .claude/settings.json 의 enabledPlugins 와 같은 목록
claude plugin marketplace add anthropics/skills || true
claude plugin marketplace add pbakaus/impeccable || true
claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill || true
for p in example-skills@anthropic-agent-skills impeccable@impeccable ui-ux-pro-max@ui-ux-pro-max-skill; do
  claude plugin install "$p" --scope project || true
done
