#!/usr/bin/env bash
# appearance.sh <run> light|dark|system: the scratch window's appearance, live.
# app.theme alone cannot do it: it sets the theme of one appearance, and the
# window keeps showing the system's.
# shellcheck source-path=SCRIPTDIR source=lib.sh
. "$(dirname "$0")/lib.sh"

set_run "${1:-}"
mode="${2:-}"
case "$mode" in light | dark | system) ;; *) die "usage: appearance.sh <run> light|dark|system" ;; esac
[ -f "$APP_HOME/settings.json" ] || die "no $APP_HOME/settings.json; launch.sh first"
node -e '
  const fs = require("fs");
  const [file, mode] = process.argv.slice(1);
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  if (mode === "system") delete s.appearance;
  else s.appearance = mode;
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
' "$APP_HOME/settings.json" "$mode"
sleep 1
[ ! -e "$APP_HOME/settings.error" ] || die "settings.error: $(cat "$APP_HOME/settings.error")"
echo "$RUN: appearance $mode"
