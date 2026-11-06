# shellcheck shell=bash
# Sourced by every helper. One run id names one scratch window:
#   $SCRATCH_ROOT/<run>/home       HERDR_APP_HOME
#   $SCRATCH_ROOT/<run>/state      XDG_STATE_HOME: the scratch core's state
#   $SCRATCH_ROOT/<run>/fixtures   repos, factory data, bin/factory
#   $SCRATCH_ROOT/<run>/app        pid and start time of the window, its log
# The scratch core is the hc session vhf-<run>.
#
# The scratch environment is never exported into a helper's own shell: only
# the commands in_scratch runs get it. Cleanup finds the processes to stop by
# HC_SESSION in their environment, and must not find itself.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
REPO_DIR="$(cd "$SKILL_DIR/../../.." && pwd -P)"
export REPO_DIR
SCRATCH_ROOT="${VERIFY_HERDR_SCRATCH:-${TMPDIR:-/tmp}/verify-herdr-factory}"
OWNER_HOME="$(cd "${XDG_CONFIG_HOME:-$HOME/.config}" 2>/dev/null && pwd -P)/herdr-app"

die() {
  echo "verify-herdr-factory: $*" >&2
  exit 1
}

# set_run <run id>: RUN, SCRATCH, APP_HOME, STATE_HOME, FIXTURES, SESSION, WRAPPER.
set_run() {
  [ -n "${1:-}" ] || die "give the run id launch.sh printed"
  [[ "$1" =~ ^[a-z0-9][a-z0-9-]{0,23}$ ]] || die "run id '$1': lowercase letters, digits and -, at most 24"
  RUN="$1"
  SCRATCH="$SCRATCH_ROOT/$RUN"
  APP_HOME="$SCRATCH/home"
  STATE_HOME="$SCRATCH/state"
  FIXTURES="$SCRATCH/fixtures"
  export WRAPPER="$FIXTURES/bin/factory"
  SESSION="vhf-$RUN"
  SCRATCH_ENV=(env -u HC_TERMINAL_ID -u HC_TERMINAL_SOCKET -u HC_SOCKET -u HC_SCOPE
    HERDR_APP_HOME="$APP_HOME" HC_SESSION="$SESSION" XDG_STATE_HOME="$STATE_HOME")
  [ "$APP_HOME" != "$OWNER_HOME" ] || die "the scratch home resolves to the owner's $OWNER_HOME"
}

# Runs a command against this run's window and core, never the owner's.
# To background one, use "${SCRATCH_ENV[@]}" directly: a backgrounded
# function is a forked shell, and $! would name that shell.
in_scratch() {
  "${SCRATCH_ENV[@]}" "$@"
}

start_time() {
  local stat rest
  stat="$(cat "/proc/$1/stat" 2>/dev/null)" || return 1
  rest="${stat##*) }"
  # shellcheck disable=SC2086 # split the stat fields on purpose
  set -- $rest
  echo "${20}"
}

# The window this run started, if it still runs: prints its pid.
app_pid() {
  local pid start
  [ -f "$SCRATCH/app/pid" ] || return 1
  read -r pid start <"$SCRATCH/app/pid"
  [ "$(start_time "$pid" 2>/dev/null)" = "$start" ] || return 1
  echo "$pid"
}

# Every process carrying this run's HC_SESSION: the window, the core, its holder, its shells.
session_pids() {
  local env pid
  for env in /proc/[0-9]*/environ; do
    pid="${env#/proc/}"
    pid="${pid%/environ}"
    [ "$pid" = $$ ] || [ "$pid" = "$BASHPID" ] && continue
    grep -qzx "HC_SESSION=$SESSION" "$env" 2>/dev/null && echo "$pid"
  done
  return 0
}

need() {
  command -v "$1" >/dev/null || die "$1 is not installed"
}
