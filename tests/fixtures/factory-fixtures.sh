#!/usr/bin/env bash
# Fixture factory runs, one per run-strip state, over three throwaway git repos.
#
#   factory-fixtures.sh build <dir>   repos, a factory data dir, live placeholder drivers, the wrapper
#   factory-fixtures.sh stop <dir>    stop the placeholder drivers build started
#
# Layout under <dir>:
#   repos/shop     building, owner needed, shipped
#   repos/api      paused, parked, driver dead, failed
#   repos/loner    one building run; never opened as a space
#   data/          FACTORY_DATA_DIR: runs/<id>/state.json and events.jsonl
#   config/        FACTORY_CONFIG_DIR, empty
#   bin/factory    the wrapper: factory with FACTORY_DATA_DIR and FACTORY_CONFIG_DIR set
#   drivers.pids   "<pid> <start time> <run id>" per placeholder driver
#   register.sql   the runs and workers rows written into data/factory.db
#
# A live run needs a live driver: factory checks the state's pid and its
# /proc start time, so each live run gets a `sleep infinity` of its own.
set -euo pipefail

die() {
  echo "factory-fixtures: $*" >&2
  exit 1
}

usage() { die "usage: factory-fixtures.sh build|stop <dir>"; }

start_time() {
  local stat rest
  stat="$(cat "/proc/$1/stat" 2>/dev/null)" || return 1
  rest="${stat##*) }"
  # shellcheck disable=SC2086 # split the stat fields on purpose
  set -- $rest
  echo "${20}"
}

iso_ago() { date -u -d "-$1 min" +%Y-%m-%dT%H:%M:%SZ; }

git_q() { git -c core.hooksPath=/dev/null -c user.name=fixture -c user.email=fixture@example.invalid "$@"; }

make_repo() {
  local repo="$1"
  mkdir -p "$repo/docs/features"
  git_q init -q -b main "$repo"
  printf '[docs]\nframework = 3\ngate = "true"\ninner = "true"\n' >"$repo/docs/project.toml"
  printf '# %s\n\nA fixture repository for the factory cockpit.\n' "$(basename "$repo")" >"$repo/README.md"
  printf 'docs.lock\n' >"$repo/.gitignore"
}

# feature <repo> <nnn> <slug> <title> <feature status> <slice statuses...>
feature() {
  local repo="$1" nnn="$2" slug="$3" title="$4" status="$5"
  shift 5
  local dir="$repo/docs/features/$nnn-$slug" n=1 s
  mkdir -p "$dir"
  printf -- '---\nnumber: %s\nslug: %s\ntitle: "%s"\ntype: feature\ncreated: %s\n---\n\n# PRD-%s — %s\n' \
    "$nnn" "$slug" "$title" "$(date -u +%Y-%m-%d)" "$nnn" "$title" >"$dir/prd.md"
  {
    printf 'status = "%s"\n' "$status"
    for s in "$@"; do
      printf '\n[slices.%d]\nstatus = "%s"\ndepends_on = []\n' "$n" "$s"
      printf '# Slice %02d — part %d of %s\n' "$n" "$n" "$title" >"$dir/slice-$(printf %02d "$n")-part-$n.md"
      n=$((n + 1))
    done
  } >"$dir/state.toml"
}

# block <repo> <nnn> <slice> <question>: an open block in the feature's log,
# written by factory itself, so `factory answer` finds it. Prints the id factory gave it.
block() {
  printf '**Happened:** %s\n**Options:** one; the other.\n**Recommended:** one.\n' "$4" |
    (cd "$1" && "$out/bin/factory" docs log add "$2" --kind block --slice "$3" --title "$4" --body-file -)
}

commit_repo() {
  git_q -C "$1" add -A
  git_q -C "$1" commit -q -m "docs: fixture features"
}

# A placeholder driver for a live run: prints "<pid> <start time>".
spawn_driver() {
  local pid start
  setsid sleep infinity </dev/null >/dev/null 2>&1 &
  pid=$!
  start="$(start_time "$pid")" || die "placeholder $pid did not start"
  echo "$pid $start"
}

# run <id> <repo> <feature> <phase> <live|dead> <started min ago> <tokens used> <extra state json> <events...>
# Each event is the JSON object's fields without seq and ts; they are numbered here.
# The run's row and one worker row go to register.sql: `factory answer` needs
# the row, and the budget's used tokens are the workers' sum.
run() {
  local id="$1" repo="$2" nnn="$3" phase="$4" driver="$5" ago="$6" used="$7" extra="$8"
  shift 8
  local dir="$data/runs/$id" pid=0 start="" started seq=1 ev
  mkdir -p "$dir"
  if [ "$driver" = live ]; then
    read -r pid start < <(spawn_driver)
    echo "$pid $start $id" >>"$out/drivers.pids"
  fi
  started="$(iso_ago "$ago")"
  {
    printf '{"id":"%s","repo":"%s","feature":"%s","branch":"feat/%s","phase":"%s",' \
      "$id" "$repo" "$nnn" "$id" "$phase"
    printf '"pid":%s,"started_at":"%s","updated_at":"%s","budget_weighted_tokens":20000000,' \
      "$pid" "$started" "$(iso_ago 2)"
    printf '"stop_requested":false,"stopped":false,"workers":[]'
    [ -n "$start" ] && printf ',"pid_start":%s' "$start"
    [ -n "$extra" ] && printf ',%s' "$extra"
    printf '}\n'
  } >"$dir/state.json"
  printf "INSERT INTO runs (id, repo, feature, branch, started_at, phase, budget_weighted_tokens) VALUES ('%s', '%s', '%s', 'feat/%s', '%s', '%s', 20000000);\n" \
    "$id" "$repo" "$nnn" "$id" "$started" "$phase" >>"$out/register.sql"
  printf "INSERT INTO workers (run_id, role, input, cache_write, cache_read, output, started_at) VALUES ('%s', 'slice', %d, 0, 0, 0, '%s');\n" \
    "$id" "$used" "$started" >>"$out/register.sql"
  : >"$dir/events.jsonl"
  for ev in "$@"; do
    printf '{%s,"seq":%d,"ts":"%s"}\n' "$ev" "$seq" "$(iso_ago $((ago - seq)))" >>"$dir/events.jsonl"
    seq=$((seq + 1))
  done
}

build() {
  [ -e "$out/data" ] && die "$out already holds fixtures; stop and delete it first"
  local real shop api loner today paused_until block_id k='"kind"'
  local gift_card="A gift card can pay part of an order: is the rest charged to the saved card or asked for again?"
  real="$(command -v factory)" || die "factory is not on PATH"
  command -v sqlite3 >/dev/null || die "sqlite3 is not installed"
  [[ "$out" != *"'"* ]] || die "the fixture dir's path holds a quote"
  mkdir -p "$out/repos" "$out/config" "$out/bin"
  data="$out/data"
  mkdir -p "$data/runs"
  : >"$out/drivers.pids"
  : >"$out/register.sql"
  cat >"$out/bin/factory" <<EOF
#!/usr/bin/env bash
FACTORY_DATA_DIR='$data' FACTORY_CONFIG_DIR='$out/config' exec '$real' "\$@"
EOF
  chmod +x "$out/bin/factory"
  shop="$out/repos/shop"
  api="$out/repos/api"
  loner="$out/repos/loner"
  today="$(date -u +%Y%m%d)"
  paused_until="$(($(date +%s) + 7200))"

  make_repo "$shop"
  feature "$shop" 003 checkout-flow "Checkout in three steps" in-progress \
    "done" "done" "done" "done" building pending pending pending pending pending
  feature "$shop" 004 gift-cards "Gift cards at checkout" in-progress "done" blocked pending pending
  block_id="$(block "$shop" 004 2 "$gift_card")"
  feature "$shop" 005 order-emails "Order confirmation emails" shipped "done" "done" "done"
  commit_repo "$shop"

  make_repo "$api"
  feature "$api" 001 rate-limits "Per-key rate limits" in-progress "done" "done" building pending pending
  feature "$api" 002 audit-log "An audit log for admin actions" in-progress "done" pending pending
  feature "$api" 003 webhooks "Signed webhooks" in-progress "done" building pending pending
  feature "$api" 004 search "Full-text search" in-progress "done" building pending
  commit_repo "$api"

  make_repo "$loner"
  feature "$loner" 001 first-run "A first run nobody opened" in-progress building pending
  commit_repo "$loner"

  run "003-$today-a001" "$shop" 003 building live 95 8400000 "" \
    "$k:\"run_started\"" \
    "$k:\"slice_done\",\"slice\":1" "$k:\"slice_done\",\"slice\":2" \
    "$k:\"slice_done\",\"slice\":3" "$k:\"slice_done\",\"slice\":4" \
    "$k:\"gate_run\",\"n\":1,\"attempt\":1,\"red\":false,\"minutes\":0.1,\"log\":\"gates/1-1.log\"" \
    "$k:\"slice_spawned\",\"slice\":5,\"session_id\":\"fixture-session\",\"pid\":0"
  run "004-$today-a002" "$shop" 004 waiting-owner live 60 5100000 "" \
    "$k:\"run_started\"" "$k:\"slice_done\",\"slice\":1" \
    "$k:\"slice_blocked\",\"slice\":2,\"block_id\":\"$block_id\",\"question\":\"$gift_card\"" \
    "$k:\"run_waiting\",\"blocked\":[2],\"asks\":[]"
  run "005-$today-a003" "$shop" 005 finished dead 300 12600000 '"pr_url":"https://github.com/example/shop/pull/100"' \
    "$k:\"run_started\"" "$k:\"slice_done\",\"slice\":1" "$k:\"slice_done\",\"slice\":2" \
    "$k:\"slice_done\",\"slice\":3" "$k:\"shipped\",\"sha\":\"0000000000000000000000000000000000000000\"" \
    "$k:\"pr_opened\",\"url\":\"https://github.com/example/shop/pull/100\"" \
    "$k:\"ci_green\",\"head\":\"0000000000000000000000000000000000000000\"" \
    "$k:\"run_finished\",\"pr_url\":\"https://github.com/example/shop/pull/100\",\"checkpoints\":1,\"ci_cycles\":0,\"duration_minutes\":280.0,\"slices\":3,\"weighted_tokens\":0"

  run "001-$today-b001" "$api" 001 paused live 120 14300000 "\"paused_until\":$paused_until" \
    "$k:\"run_started\"" "$k:\"slice_done\",\"slice\":1" "$k:\"slice_done\",\"slice\":2"
  run "002-$today-b002" "$api" 002 waiting-owner dead 200 20400000 "" \
    "$k:\"run_started\"" "$k:\"slice_done\",\"slice\":1" \
    "$k:\"run_parked\",\"reason\":\"budget\",\"weighted\":20000000,\"budget\":20000000"
  run "003-$today-b003" "$api" 003 building dead 80 3200000 "" \
    "$k:\"run_started\"" "$k:\"slice_done\",\"slice\":1"
  run "004-$today-b004" "$api" 004 failed dead 150 2700000 "" \
    "$k:\"run_started\"" "$k:\"slice_done\",\"slice\":1" \
    "$k:\"run_failed\",\"error\":\"git commit failed: exit 1\""

  run "001-$today-c001" "$loner" 001 building live 30 600000 "" "$k:\"run_started\""

  "$out/bin/factory" status --json >/dev/null
  sqlite3 "$data/factory.db" <"$out/register.sql"

  echo "$out/bin/factory"
}

stop() {
  local pids="$out/drivers.pids" pid start
  [ -f "$pids" ] || return 0
  while read -r pid start _; do
    if [ "$(start_time "$pid" 2>/dev/null)" = "$start" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  done <"$pids"
  rm -f "$pids"
}

[ $# -eq 2 ] || usage
mkdir -p "$2"
out="$(cd "$2" && pwd -P)"
case "$1" in
  build) build ;;
  stop) stop ;;
  *) usage ;;
esac
