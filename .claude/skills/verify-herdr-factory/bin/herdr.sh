#!/usr/bin/env bash
# herdr.sh <run> <herdr-app args...>: herdr-app against the scratch window only.
#   herdr.sh <run> do space.new --name shop --folder <repo>
#   herdr.sh <run> ls | status | commands
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
shift
[ $# -gt 0 ] || die "usage: herdr.sh <run> <herdr-app args...>"
[ -d "$SCRATCH" ] || die "no scratch for $RUN; launch.sh first"
app_pid >/dev/null || die "the window of $RUN is not running; doctor.sh $RUN"
cd "$SCRATCH/app" || exit 1
in_scratch herdr-app "$@"
