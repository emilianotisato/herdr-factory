#!/usr/bin/env bash
# input.sh <run> <action>: pointer and keys for the scratch window, only on the
# private X display a VERIFY_HERDR_INPUT=x11 launch made. Coordinates are
# window pixels, the same as a shot.sh PNG's at zoom 1.
#   input.sh <run> geometry | click X Y | move X Y | type TEXT | key Return
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
shift
[ $# -gt 0 ] || die "usage: input.sh <run> geometry|click X Y|move X Y|type TEXT|key NAME"
display="$(x_display)" || die "$RUN has no private X display: launch it with VERIFY_HERDR_INPUT=x11"
[ "$display" != "${DISPLAY:-}" ] || die "refusing $display: it is the owner's display"
app_pid >/dev/null || die "the window of $RUN is not running; doctor.sh $RUN"
tool="$SCRATCH/app/xdrive"
if [ ! -x "$tool" ]; then
  need cc
  cc -O2 -o "$tool" "$SKILL_DIR/bin/xdrive.c" -lX11 -lXtst || die "xdrive did not build: install libx11 and libxtst"
fi
DISPLAY="$display" "$tool" "$@"
