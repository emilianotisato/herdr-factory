#!/usr/bin/env bash
# check (the gate) or write (the inner loop).
set -euo pipefail
. scripts/gate/node.sh
mode="${1:-check}"
npx --no-install prettier --"$mode" --log-level warn .
