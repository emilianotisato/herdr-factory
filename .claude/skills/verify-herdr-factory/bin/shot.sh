#!/usr/bin/env bash
# shot.sh <run> <name> [dir]: <dir>/<name>.png plus <name>.txt (the window's
# status and ls at that moment). dir defaults to artifacts/<run> in this skill.
# Prints the PNG's path.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
name="${2:-}"
[[ "$name" =~ ^[A-Za-z0-9._-]+$ ]] || die "usage: shot.sh <run> <name> [dir]; name: letters, digits, . _ -"
dir="${3:-$SKILL_DIR/artifacts/$RUN}"
mkdir -p "$dir"
dir="$(cd "$dir" && pwd -P)"
app_pid >/dev/null || die "the window of $RUN is not running; doctor.sh $RUN"

png="$dir/$name.png"
in_scratch herdr-app shot "$png" >/dev/null
[ -s "$png" ] || die "no screenshot at $png"
{
  echo "run: $RUN  at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "--- herdr-app status"
  in_scratch herdr-app status
  echo "--- herdr-app ls"
  in_scratch herdr-app ls
} >"$dir/$name.txt" 2>&1
echo "$png"
