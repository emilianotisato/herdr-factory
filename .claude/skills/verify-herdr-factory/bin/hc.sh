#!/usr/bin/env bash
# hc.sh <run> <hc args...>: hc against the scratch core only (ls, read, wait).
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
shift
[ $# -gt 0 ] || die "usage: hc.sh <run> <hc args...>"
[ -d "$SCRATCH" ] || die "no scratch for $RUN; launch.sh first"
in_scratch hc "$@"
