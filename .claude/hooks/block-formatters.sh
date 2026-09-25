#!/bin/bash
# PreToolUse (Bash): refuse formatters this repo doesn't use. Biome is the only
# formatter here; deno fmt, prettier and dprint rewrite whole files in another style.
command=$(jq -r '.tool_input.command // empty')
launcher='((npx|bunx|npm[[:space:]]+exec|pnpm[[:space:]]+(exec|dlx)|yarn([[:space:]]+dlx)?)[[:space:]]+(--yes[[:space:]]+|-y[[:space:]]+)?)?'
tool='([^[:space:];&|()]*/)?(deno[[:space:]]+fmt|prettier|dprint)([[:space:]]|$)'
if printf '%s\n' "$command" | grep -Eq "(^|[;&|(]|\\\$\\()[[:space:]]*${launcher}${tool}"; then
  echo "Blocked: this repo formats with Biome only (npx biome check --write <file>). Never run deno fmt, prettier or dprint here." >&2
  exit 2
fi
exit 0
