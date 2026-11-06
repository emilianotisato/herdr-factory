#!/usr/bin/env bash
# doctor.sh <run>: read-only. Is this run's window worth driving?
# Exit 0 when every line says ok.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
fails=0
ok() { echo "ok   $*"; }
bad() {
  echo "FAIL $*"
  fails=$((fails + 1))
}

for tool in herdr-app hc factory node sqlite3; do
  if command -v "$tool" >/dev/null; then ok "$tool: $("$tool" --version 2>&1 | head -1)"; else bad "$tool is not installed"; fi
done
fv="$(factory --version 2>/dev/null | awk '{print $2}')"
if [ -n "$fv" ] && [ "$(printf '%s\n0.13.0\n' "$fv" | sort -V | head -1)" = 0.13.0 ]; then
  ok "factory $fv is 0.13.0 or newer"
else
  bad "factory ${fv:-?} is older than 0.13.0: factory upgrade"
fi

if [ -x "$WRAPPER" ]; then
  if out="$(node "$REPO_DIR/tests/fixtures/check-fixtures.js" "$WRAPPER" 2>&1)"; then ok "$out"; else bad "fixtures: $out"; fi
else
  bad "no fixture wrapper at $WRAPPER: launch.sh builds it"
fi

if pid="$(app_pid)"; then
  ok "window pid $pid"
  if grep -qzx "HERDR_APP_HOME=$APP_HOME" "/proc/$pid/environ"; then
    ok "window home $APP_HOME"
  else
    bad "window $pid has another HERDR_APP_HOME"
  fi
else
  bad "the window of $RUN is not running"
fi

if status="$(in_scratch herdr-app status 2>&1)"; then
  if grep -q '"errors": \[\]' <<<"$status"; then ok "status answers, no errors"; else bad "status errors: $status"; fi
else
  bad "status: $status"
fi

core="$(in_scratch hc server status --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).pid)}catch{}})')"
if [ -n "$core" ] && grep -qzx "HC_SESSION=$SESSION" "/proc/$core/environ" 2>/dev/null; then
  ok "core pid $core is session $SESSION, not the owner's"
else
  bad "no core of session $SESSION answering"
fi

[ "$fails" -eq 0 ] || {
  echo "doctor: $fails failed; do not drive"
  exit 1
}
