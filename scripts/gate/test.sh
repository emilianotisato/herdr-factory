#!/usr/bin/env bash
# Unit tests over the pure modules in mods/*/lib/, with a line-coverage floor.
# quiet (the inner loop) prints dots instead of a line per test.
set -euo pipefail
. scripts/gate/node.sh
mapfile -t tests < <(git ls-files --cached --others --exclude-standard -- 'tests/*.test.js')
mapfile -t libs < <(git ls-files --cached --others --exclude-standard -- 'mods/*/lib/*.js')
if [ "${#tests[@]}" -eq 0 ] && [ "${#libs[@]}" -eq 0 ]; then echo "test: no tests"; exit 0; fi
# Node counts only the files a test loaded. Loading every lib file here makes
# a lib file that no test imports count as uncovered instead of invisible.
work="$(mktemp -d "${TMPDIR:-/tmp}/gate-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
{
  echo 'import { test } from "node:test";'
  echo 'test("every lib module loads", async () => {'
  for f in "${libs[@]}"; do printf '  await import(%s);\n' "\"$PWD/$f\""; done
  echo '});'
} > "$work/load-libs.test.js"
reporter=spec
[ "${1:-}" = quiet ] && reporter="dot"
node --test --test-reporter="$reporter" --test-timeout=30000 \
  --experimental-test-coverage --test-coverage-include='mods/*/lib/**' \
  --test-coverage-lines="${COVERAGE_LINES:-90}" "$work/load-libs.test.js" "${tests[@]}"
