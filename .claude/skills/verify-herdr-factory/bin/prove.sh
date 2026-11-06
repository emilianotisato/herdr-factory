#!/usr/bin/env bash
# prove.sh [run id]: the harness end to end. Launch, doctor, open the shop
# fixture repo as a space, screenshot it, clean up, then check the evidence
# survived and nothing of the run is left. Cleans up on failure too.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

bin="$(dirname "$0")"
run="$("$bin/launch.sh" "${1:-prove-$(date +%H%M%S)}")"
set_run "$run"
trap '"$bin/cleanup.sh" "$RUN" >/dev/null 2>&1 || true' EXIT

"$bin/doctor.sh" "$RUN"
repo="$FIXTURES/repos/shop"
"$bin/herdr.sh" "$RUN" "do" space.new --name shop --folder "$repo"
for _ in $(seq 1 25); do
  "$bin/herdr.sh" "$RUN" ls | grep -qF "\"folder\": \"$repo\"" && break
  sleep 0.2
done
"$bin/herdr.sh" "$RUN" ls | grep -qF "\"folder\": \"$repo\"" || die "the shop space did not appear in ls"
sleep 1
png="$("$bin/shot.sh" "$RUN" space-new)"

if [ -S "$OWNER_HOME/herdr-app.sock" ]; then
  if HERDR_APP_HOME="$OWNER_HOME" herdr-app ls 2>/dev/null | grep -qF "$SCRATCH"; then
    die "the owner's window shows a scratch folder"
  fi
  echo "owner's window: no scratch space"
fi

trap - EXIT
"$bin/cleanup.sh" "$RUN"
[ -s "$png" ] || die "evidence gone after cleanup: $png"
echo "evidence: $png ($(stat -c %s "$png") bytes)"
