#!/usr/bin/env bash
# cleanup.sh <run>: close this run's window, stop its core and placeholder
# drivers, delete its scratch. Evidence under artifacts/ stays.
# Exit 1 when anything of the run is left.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"

wait_gone() {
  local pid="$1"
  for _ in $(seq 1 25); do
    [ -e "/proc/$pid" ] || return 0
    sleep 0.2
  done
  return 1
}

if pid="$(app_pid)"; then
  in_scratch herdr-app "do" window.close >/dev/null 2>&1 || true
  wait_gone "$pid" || { kill "$pid" 2>/dev/null || true; wait_gone "$pid" || kill -9 "$pid" 2>/dev/null || true; }
fi

if [ -d "$STATE_HOME" ]; then
  in_scratch hc server stop >/dev/null 2>&1 || true
fi

for pid in $(session_pids); do kill "$pid" 2>/dev/null || true; done
for pid in $(session_pids); do wait_gone "$pid" || kill -9 "$pid" 2>/dev/null || true; done

if [ -d "$FIXTURES" ]; then
  "$REPO_DIR/tests/fixtures/factory-fixtures.sh" stop "$FIXTURES"
fi

case "$SCRATCH" in
  "$SCRATCH_ROOT"/"$RUN") rm -rf -- "$SCRATCH" ;;
  *) die "refusing to delete $SCRATCH" ;;
esac
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
