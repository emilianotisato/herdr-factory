#!/usr/bin/env bash
# Strict types on our own mods. Tests are not type-checked: running them is
# their check. Cloned Herdr files, listed in .prettierignore, are skipped:
# Herdr's own mods do not pass a strict check.
# Run after the mods tier, which writes the gpui-kit.d.ts this reads.
set -euo pipefail
. scripts/gate/node.sh
mapfile -t cloned < <(sed -n '/^# --- cloned ---$/,/^# --- end cloned ---$/{/^#/d;/^$/d;p}' .prettierignore)
mapfile -t ours < <(git ls-files --cached --others --exclude-standard -- 'mods/*.js' \
  | grep -v -x -F -f <(printf '%s\n' "${cloned[@]}" '') || true)
if [ "${#ours[@]}" -eq 0 ]; then echo "types: no files"; exit 0; fi
dts=""
for d in mods/*/gpui-kit.d.ts; do [ -f "$d" ] && dts="$d" && break; done
if [ -z "$dts" ] && printf '%s\n' "${ours[@]}" | grep -q '^mods/[^/]*/[^/]*\.js$'; then
  echo "types: no gpui-kit.d.ts; run the mods tier first (make mods)" >&2; exit 1
fi
work="$(mktemp -d "${TMPDIR:-/tmp}/gate-types.XXXXXX")"
trap 'rm -rf "$work"' EXIT
{
  printf '{ "compilerOptions": { "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler", "lib": ["ES2022"], "types": [], "allowJs": true, "checkJs": true, "strict": true, "strictNullChecks": false, "noEmit": true, "skipLibCheck": true }, "files": ['
  sep=""
  for f in ${dts:+"$dts"} "${ours[@]}"; do printf '%s"%s"' "$sep" "$PWD/$f"; sep=","; done
  printf '] }\n'
} > "$work/tsconfig.json"
npx --no-install tsc -p "$work/tsconfig.json"
