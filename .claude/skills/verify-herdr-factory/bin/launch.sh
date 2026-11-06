#!/usr/bin/env bash
# launch.sh [run id]: fixtures, a scratch home, and a herdr-app window on its own core.
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

cd "$SCRATCH/app" || exit 1
"${SCRATCH_ENV[@]}" setsid herdr-app </dev/null >"$SCRATCH/app/log" 2>&1 &
pid=$!
start="$(start_time "$pid")" || die "herdr-app exited at once: $(tail -5 "$SCRATCH/app/log")"
echo "$pid $start" >"$SCRATCH/app/pid"

for _ in $(seq 1 75); do
  if in_scratch herdr-app status >"$SCRATCH/app/status.json" 2>/dev/null; then
    if grep -q '"frame-welcome"' "$SCRATCH/app/status.json"; then
      die "the welcome is up despite shared.json; see $SCRATCH/app/status.json"
    fi
    echo "$RUN"
    exit 0
  fi
  app_pid >/dev/null || die "herdr-app exited: $(tail -5 "$SCRATCH/app/log")"
  sleep 0.2
done
die "the window did not answer status in 15 s; run cleanup.sh $RUN"
