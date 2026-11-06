#!/usr/bin/env bash
# cleanup.sh <run>: close this run's window, stop its core and placeholder
# drivers, delete its scratch. Evidence under artifacts/ stays.
# Exit 1 when anything of the run is left.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"

stop_window

if x_display >/dev/null; then
  read -r xpid _ _ <"$SCRATCH/app/xserver"
  kill "$xpid" 2>/dev/null || true
  wait_gone "$xpid" || kill -9 "$xpid" 2>/dev/null || true
fi

if [ -d "$STATE_HOME" ]; then
  in_scratch hc server stop >/dev/null 2>&1 || true
fi

for pid in $(session_pids); do kill "$pid" 2>/dev/null || true; done
for pid in $(session_pids); do wait_gone "$pid" || kill -9 "$pid" 2>/dev/null || true; done

if [ -d "$FIXTURES" ]; then
  "$REPO_DIR/tests/fixtures/factory-fixtures.sh" stop "$FIXTURES"
fi

if [ -e "$SCRATCH" ]; then
  [ -f "$SCRATCH/$MARKER" ] || die "refusing to delete $SCRATCH: launch.sh did not make it"
  rm -rf -- "$SCRATCH"
fi
rmdir "$SCRATCH_ROOT" 2>/dev/null || true

left=0
[ ! -e "$SCRATCH" ] || {
  echo "left: $SCRATCH"
  left=1
}
pids="$(session_pids)"
[ -z "$pids" ] || {
  echo "left: processes of $SESSION: $pids"
  left=1
}
socks="$(compgen -G "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/herdr-core/$SESSION.*" || true)"
[ -z "$socks" ] || {
  echo "left: $socks"
  left=1
}
[ "$left" -eq 0 ] || exit 1
echo "clean: $RUN (evidence, if any: $SKILL_DIR/artifacts/$RUN)"
