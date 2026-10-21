#!/bin/sh
# PostToolUse hook: format the file Claude just edited, then report any lint errors back to Claude.
# Markdown files instead get their Mermaid diagrams parsed, so a diagram that won't render is caught at once.
# Exit code 2 sends stderr to Claude so it fixes the problem; anything else stays silent.
file=$(jq -r '.tool_input.file_path // empty')
cd "$CLAUDE_PROJECT_DIR" || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.mjs|*.json|*.jsonc)
    if ! out=$(pnpm exec biome check --write --no-errors-on-unmatched "$file" 2>&1); then
      printf 'Biome found problems in %s:\n%s\n' "$file" "$out" >&2
      exit 2
    fi
    ;;
  *.md)
    if ! out=$(node scripts/check-diagrams.mjs --parse-only "$file" 2>&1); then
      printf '%s\n' "$out" >&2
      exit 2
    fi
    ;;
esac
