#!/usr/bin/env bash
# Dev tools only, pinned in package.json. SKIP_AUDIT=1 skips the network call.
set -euo pipefail
. scripts/gate/node.sh
npm ls --depth=0 >/dev/null || { echo "deps: node_modules does not match package-lock.json; run make setup" >&2; exit 1; }
if [ "${SKIP_AUDIT:-}" = 1 ]; then echo "deps: audit skipped (SKIP_AUDIT=1)"; exit 0; fi
npm audit --audit-level=high
