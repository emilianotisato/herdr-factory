# shellcheck shell=bash
# Sourced by the tiers: puts Node 22 or newer first on PATH.
# The owner's default Node is 20, and coverage floors need 22.
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
if [ "$(node_major)" -lt 22 ]; then
  if command -v mise >/dev/null && dir="$(mise where node@22 2>/dev/null)"; then
    PATH="$dir/bin:$PATH"
    export PATH
  fi
fi
if [ "$(node_major)" -lt 22 ]; then
  echo "gate: Node 22 or newer is needed (found $(node --version 2>/dev/null || echo none)); install it, e.g. mise install node@22" >&2
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "gate: node_modules is missing; run make setup" >&2
  exit 1
fi
