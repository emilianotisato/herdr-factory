#!/usr/bin/env bash
# herdr-app's own loader, on every mod in the repo. Needs the app installed.
# It also writes gpui-kit.d.ts into each mod folder, which the types tier reads.
set -euo pipefail
command -v herdr-app >/dev/null || { echo "mods: herdr-app is not installed; the gate needs it" >&2; exit 1; }
shopt -s nullglob
dirs=(mods/*/)
if [ "${#dirs[@]}" -eq 0 ]; then echo "mods: no mods"; exit 0; fi
for d in "${dirs[@]}"; do timeout 60 herdr-app check "${d%/}"; done
