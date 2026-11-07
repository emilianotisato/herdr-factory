#!/usr/bin/env bash
# Installs the factory layout and the factory-* mods into Herdr's home.
#   ./install.sh        copy them
#   ./install.sh --dev  symlink them into this checkout, so edits show live
# Re-running upgrades. It never touches a file it did not write.
set -euo pipefail

usage() { echo "usage: ./install.sh [--dev]" >&2; exit 2; }
mode=copy
case "${1:-}" in
  "") ;;
  --dev) mode=dev ;;
  *) usage ;;
esac
[ "$#" -le 1 ] || usage

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
home="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
manifest="$home/factory-install.txt"

items=()
for d in "$repo"/mods/factory-*/; do
  [ -d "$d" ] && items+=("mods/$(basename "$d")")
done
items+=("layouts/factory.json")

owned() {
  [ -f "$manifest" ] && grep -qxF -- "$1" "$manifest"
}

foreign=()
for item in "${items[@]}"; do
  if { [ -e "$home/$item" ] || [ -L "$home/$item" ]; } && ! owned "$item"; then
    foreign+=("$home/$item")
  fi
done
if [ "${#foreign[@]}" -gt 0 ]; then
  echo "install: not ours, so left alone and nothing installed:" >&2
  printf '  %s\n' "${foreign[@]}" >&2
  echo "install: move it away and re-run if it can go." >&2
  exit 1
fi

running_version() {
  local v
  v="$(herdr-app --version 2>/dev/null)" || { echo "unknown"; return; }
  echo "${v#herdr-app }"
}

drift_check() {
  local recorded="$repo/upstream.json" installed="$home/installed.json" out
  if ! command -v python3 >/dev/null; then
    echo "install: python3 not found, so the check against the Herdr files this repo clones was skipped."
    return
  fi
  if [ ! -f "$installed" ]; then
    echo "install: no $installed, so the check against the Herdr files this repo clones was skipped."
    return
  fi
  if ! out="$(python3 -I -c '
import json, sys
recorded = json.load(open(sys.argv[1]))
installed = json.load(open(sys.argv[2]))
print(recorded["herdr-app"])
for name, hashes in recorded["installed"].items():
    if installed.get(name) != hashes:
        print(name)
' "$recorded" "$installed" 2>/dev/null)"; then
    echo "install: could not compare $recorded with $installed, so the check against the Herdr files this repo clones was skipped."
    return
  fi
  local version changed
  version="$(head -n1 <<<"$out")"
  changed="$(tail -n +2 <<<"$out" | paste -sd, - | sed 's/,/, /g')"
  if [ -n "$changed" ]; then
    echo "warning: Herdr's $changed changed since this repo cloned them from herdr-app $version; you run herdr-app $(running_version). The factory layout may lag Herdr's own until the clone is redone." >&2
  fi
}

drift_check

# Owned before it is written, so an interrupted install is still ours to redo.
previous=()
[ -f "$manifest" ] && mapfile -t previous <"$manifest"
mkdir -p "$home/mods" "$home/layouts"
printf '%s\n' "${previous[@]}" "${items[@]}" | grep -v '^$' | sort -u >"$manifest.tmp"
mv "$manifest.tmp" "$manifest"
for item in "${items[@]}"; do
  target="$home/$item"
  rm -rf "$target"
  if [ "$mode" = dev ]; then
    ln -s "$repo/$item" "$target"
  else
    cp -R "$repo/$item" "$target"
  fi
  echo "install: $item ($mode)"
done
for item in "${previous[@]}"; do
  case " ${items[*]} " in *" $item "*) continue ;; esac
  [[ "$item" =~ ^(mods/factory-[A-Za-z0-9._-]+|layouts/factory\.json)$ ]] && [[ "$item" != *..* ]] || continue
  rm -rf "${home:?}/$item"
  echo "install: removed $item, no longer in this checkout"
done
printf '%s\n' "${items[@]}" >"$manifest.tmp"
mv "$manifest.tmp" "$manifest"

if herdr-app status >/dev/null 2>&1; then
  herdr-app "do" layout.switch --name factory >/dev/null
  echo "install: switched Herdr to the factory layout."
else
  echo "install: Herdr is not running. Open it and pick the factory layout once: herdr-app do layout.switch --name factory"
fi
