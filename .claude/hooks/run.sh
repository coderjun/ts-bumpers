#!/bin/sh
# Runs a TypeScript hook from this folder. Node 26 (see .nvmrc) runs .ts files directly; an older
# Node fails with a confusing error, so check first and say what to do. Exit code 1 shows the
# message to you without blocking Claude.
major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$major" -lt 26 ]; then
  echo "Claude Code hooks need Node 26 or later, but found $(node -v 2>/dev/null || echo 'no node'). Run 'nvm install' in the project folder, then restart Claude Code from a shell where 'node -v' shows v26." >&2
  exit 1
fi
exec node "$CLAUDE_PROJECT_DIR/.claude/hooks/$1"
