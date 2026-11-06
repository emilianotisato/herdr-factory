#!/usr/bin/env bash
# launch.sh [run id]: fixtures, a scratch home, and a herdr-app window on its own core.
# VERIFY_HERDR_INPUT=x11 puts the window on a private Xwayland display, so
# input.sh can click and type in it without touching the owner's display.
# Prints the run id every other helper takes.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-$(date +%m%d-%H%M%S)}"
need herdr-app
need hc
need factory
need setsid
need sqlite3
[ ! -e "$SCRATCH" ] || die "$SCRATCH exists: run cleanup.sh $RUN first, or pick another run id"

mkdir -p "$APP_HOME" "$STATE_HOME" "$SCRATCH/app"
# The first-run welcome covers the window and ignores overlay.close; a home
# with no last_run toasts "Updated to <version>" over the bottom right.
printf '{"frame.welcomed":"skipped"}\n' >"$APP_HOME/shared.json"
printf '{"last_run":"%s","presented":[]}\n' "$(herdr-app --version | awk '{print $2}')" >"$APP_HOME/update-notes.json"

"$REPO_DIR/tests/fixtures/factory-fixtures.sh" build "$FIXTURES" >/dev/null

if [ "${VERIFY_HERDR_INPUT:-}" = x11 ]; then
  need Xwayland
  n=40
  while [ -e "/tmp/.X11-unix/X$n" ] || [ -e "/tmp/.X$n-lock" ]; do n=$((n + 1)); done
  setsid Xwayland ":$n" -geometry 1400x900 -noreset </dev/null >"$SCRATCH/app/xserver.log" 2>&1 &
  xpid=$!
  xstart="$(start_time "$xpid")" || die "Xwayland exited at once: $(tail -5 "$SCRATCH/app/xserver.log")"
  echo "$xpid $xstart :$n" >"$SCRATCH/app/xserver"
  for _ in $(seq 1 50); do
    [ -S "/tmp/.X11-unix/X$n" ] && break
    sleep 0.1
  done
  [ -S "/tmp/.X11-unix/X$n" ] || die "Xwayland :$n did not open its socket; run cleanup.sh $RUN"
fi

start_window
echo "$RUN"
