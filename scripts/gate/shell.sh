#!/usr/bin/env bash
set -euo pipefail
command -v shellcheck >/dev/null || { echo "shell: shellcheck is not installed" >&2; exit 1; }
mapfile -t files < <(git ls-files --cached --others --exclude-standard -- '*.sh')
if [ "${#files[@]}" -eq 0 ]; then echo "shell: no shell scripts"; exit 0; fi
shellcheck -x "${files[@]}"
