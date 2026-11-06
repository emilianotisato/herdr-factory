#!/usr/bin/env bash
set -euo pipefail
. scripts/gate/node.sh
npx --no-install eslint --max-warnings 0 .
