#!/usr/bin/env bash
# restart.sh <run>: quit the scratch window and start it again on the same
# home, core and display, as the owner restarting the app. Mods keep their
# localStorage; the core keeps the spaces.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
[ -d "$SCRATCH" ] || die "no scratch for $RUN; launch.sh first"
stop_window
app_pid >/dev/null && die "the window of $RUN did not close"
start_window
echo "restarted: $RUN"
