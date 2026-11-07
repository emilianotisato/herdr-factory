#!/usr/bin/env bash
# A fake factory for the run panel: `live` answers from a canned case, and every
# other call, `live` of a run with no case included, goes to the fixture wrapper.
#
#   fake-factory-live.sh build <dir> <wrapper>     writes <dir>/bin/factory, prints its path
#   fake-factory-live.sh use <dir> <runId> <case>  `live <runId>` answers <case>; `none` drops it
#
# A case is tests/fixtures/live/<case>.json, or one of:
#   exit-1   `no run <id>` on stderr, exit 1
#   exit-2   factory's usage error for a verb it does not know, exit 2
# `use` copies the case onto the run: `id`, `feature`, `repo` and `branch` are the
# run's, from the wrapper's status, and every time moves so the case's `at` is now.
#   later           its file, until 3 s after `use`; then one more timeline row, a new seq and rev
#   shots-three     also writes the three images it lists under the run's evidence/
#   shots-hostile   one image, one listed `..` path written outside evidence/, one symlink
#
# Layout under <dir>:
#   bin/factory     the fake, with <dir> and the wrapper baked in
#   calls.log       one line per call: start (UTC, ms), duration, exit code, argv
#   wrapper, runs   the wrapper and its runs dir, for `use`
#   cases/<runId>/  case, answer.json, later.json and due (epoch ms), written (files use made)
#   outside/        the symlink target of shots-hostile
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cases_src="$here/live"

die() {
  echo "fake-factory-live: $*" >&2
  exit 1
}

usage() { die "usage: fake-factory-live.sh build <dir> <wrapper> | use <dir> <runId> <case>"; }

now_ms() { date +%s%3N; }

iso_ms() { date -u -d "@$(($1 / 1000)).$(printf %03d $(($1 % 1000)))" +%Y-%m-%dT%H:%M:%S.%3NZ; }

build() {
  local dir="$1" wrapper="$2" data
  command -v jq >/dev/null || die "jq is not installed"
  [ -x "$wrapper" ] || die "$wrapper is not executable"
  wrapper="$(cd "$(dirname "$wrapper")" && pwd -P)/$(basename "$wrapper")"
  data="$(sed -n "s/.*FACTORY_DATA_DIR='\([^']*\)'.*/\1/p" "$wrapper")"
  [ -d "$data/runs" ] || die "$wrapper names no FACTORY_DATA_DIR with a runs dir"
  [[ "$dir$wrapper$here" != *"'"* ]] || die "a path holds a quote"
  mkdir -p "$dir/bin" "$dir/cases"
  printf '%s\n' "$wrapper" >"$dir/wrapper"
  printf '%s\n' "$data/runs" >"$dir/runs"
  : >"$dir/calls.log"
  cat >"$dir/bin/factory" <<EOF
#!/usr/bin/env bash
exec '$here/fake-factory-live.sh' serve '$dir' '$wrapper' "\$@"
EOF
  chmod +x "$dir/bin/factory"
  echo "$dir/bin/factory"
}

# drop <dir> <runId>: remove the case and the files its `use` wrote.
drop() {
  local at="$1/cases/$2" f evidence
  if [ -f "$at/written" ]; then
    while IFS= read -r f; do rm -f -- "$f"; done <"$at/written"
    evidence="$(cat "$1/runs")/$2/evidence"
    [ -d "$evidence" ] && find "$evidence" -depth -type d -empty -delete
  fi
  rm -rf -- "$at"
}

# place <case dir> <source png> <target>: copy a fixture image, noting it for drop.
place() {
  mkdir -p "$(dirname "$3")"
  cp "$cases_src/$2" "$3"
  printf '%s\n' "$3" >>"$1/written"
}

# shots <dir> <runId> <case>: write the images the case lists, then set each
# entry's bytes, mtime and etag from the file as written.
shots() {
  local dir="$1" id="$2" name="$3" at="$1/cases/$2" evidence path mtime target meta=""
  evidence="$(cat "$dir/runs")/$id/evidence"
  case "$name" in
    shots-three)
      place "$at" receipt.png "$evidence/cp-2/receipt-after-payment.png"
      place "$at" checkout.png "$evidence/cp-2/checkout-step-two.png"
      place "$at" cart.png "$evidence/cp-1/cart-with-two-items.png"
      ;;
    shots-hostile)
      place "$at" cart.png "$evidence/cp-1/cart-with-two-items.png"
      place "$at" checkout.png "$evidence/cp-1/../../escape.png"
      place "$at" receipt.png "$dir/outside/$id-receipt.png"
      ln -s "$dir/outside/$id-receipt.png" "$evidence/cp-1/linked-receipt.png"
      printf '%s\n' "$evidence/cp-1/linked-receipt.png" >>"$at/written"
      ;;
  esac
  while IFS=$'\t' read -r path mtime; do
    target="$evidence/$path"
    [ -e "$target" ] || die "$name lists $path, which use did not write"
    touch -d "$mtime" "$target"
    meta+="$path"$'\t'"$(stat -L -c %s "$target")"$'\t'"$(date -r "$target" +%s%3N)"$'\n'
  done < <(jq -r '.evidence.checkpoints[].files[] | [.path, .mtime] | @tsv' "$at/answer.json")
  jq --arg meta "$meta" '
    ($meta | split("\n") | map(select(. != "") | split("\t")) | map({key: .[0], value: {bytes: (.[1] | tonumber), ms: (.[2] | tonumber)}}) | from_entries) as $m
    | .evidence.checkpoints[].files[] |= (
        $m[.path] as $f
        | .bytes = $f.bytes
        | .mtime = ($f.ms / 1000 | floor | todate)
        | .etag = "\($f.bytes)-\($f.ms)")
  ' "$at/answer.json" >"$at/answer.json.new"
  mv "$at/answer.json.new" "$at/answer.json"
}

# later <case dir>: the answer once the delayed event has landed, due 3 s from now.
later() {
  local at="$1" due rev
  due=$(($(now_ms) + 3000))
  rev="$(jq -r .rev "$at/answer.json" | sha256sum | cut -c1-16)"
  jq --argjson due "$due" --arg rev "$rev" '
    (.workers[0].slice // 1) as $slice
    | .seq += 1
    | .rev = $rev
    | .timeline += [{
        seq: .seq,
        ts: ($due / 1000 | floor | todate),
        kind: "slice_done",
        tone: "green",
        label: "slice_done(\($slice | tostring | if length < 2 then "0" + . else . end))",
        data: {slice: $slice}
      }]
  ' "$at/answer.json" >"$at/later.json"
  echo "$due" >"$at/due"
}

use() {
  local dir="$1" id="$2" name="$3" at run
  [ -f "$dir/wrapper" ] || die "$dir holds no fake; build it first"
  at="$dir/cases/$id"
  drop "$dir" "$id"
  [ "$name" = none ] && return 0
  if [ "$name" != exit-1 ] && [ "$name" != exit-2 ]; then
    [ -f "$cases_src/$name.json" ] || die "no case $name"
    run="$("$(cat "$dir/wrapper")" status --json --recent |
      jq -c --arg id "$id" '.runs[] | select(.id == $id) | {feature, repo, branch}')"
    [ -n "$run" ] || die "no fixture run $id"
    mkdir -p "$at"
    jq --argjson run "$run" --arg id "$id" --argjson now "$(date +%s)" '
      def stamp: test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$");
      ($now - (.at | fromdateiso8601)) as $shift
      | walk(if type == "string" and stamp then (fromdateiso8601 + $shift | todate) else . end)
      | walk(if type == "string" then gsub("<run>"; $id) | gsub("<feature>"; $run.feature) | gsub("<repo>"; $run.repo) else . end)
      | .branch = $run.branch
    ' "$cases_src/$name.json" >"$at/answer.json"
    case "$name" in
      shots-*) shots "$dir" "$id" "$name" ;;
      later) later "$at" ;;
    esac
  fi
  mkdir -p "$at"
  echo "$name" >"$at/case"
}

# live <dir> <id> [--json] [--since N] [--wait S]: the canned answer, held as factory's --wait holds.
live() {
  local at="$1/cases/$2" id="$2" since=null wait=0 name file due now
  shift 2
  while [ $# -gt 0 ]; do
    case "$1" in
      --json) ;;
      --since | --wait)
        [[ "${2:-}" =~ ^[0-9]+$ ]] || {
          echo "error: invalid value '${2:-}' for '$1 <${1#--}>'" >&2
          return 2
        }
        if [ "$1" = --since ]; then since="$2"; else wait="$2"; fi
        shift
        ;;
      *)
        echo "error: unexpected argument '$1' found" >&2
        return 2
        ;;
    esac
    shift
  done
  name="$(cat "$at/case")"
  case "$name" in
    exit-1)
      echo "no run $id" >&2
      return 1
      ;;
    exit-2)
      printf "error: unrecognized subcommand 'live'\n\nUsage: factory <COMMAND>\n\nFor more information, try '--help'.\n" >&2
      return 2
      ;;
  esac
  file="$at/answer.json"
  if [ -f "$at/due" ]; then
    due="$(cat "$at/due")"
    now="$(now_ms)"
    if [ "$now" -lt "$due" ] && [ "$wait" -gt 0 ]; then
      if [ $((due - now)) -le $((wait * 1000)) ]; then
        sleep "$(((due - now) / 1000)).$(printf %03d $(((due - now) % 1000)))"
      else
        sleep "$wait"
      fi
    fi
    [ "$(now_ms)" -ge "$due" ] && file="$at/later.json"
  elif [ "$wait" -gt 0 ]; then
    sleep "$wait"
  fi
  jq -c --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson since "$since" '
    .at = $at
    | .timeline |= (if $since == null then .[-100:] else map(select(.seq > $since)) end)
  ' "$file"
}

# serve <dir> <wrapper> <argv...>: what bin/factory runs.
serve() {
  local dir="$1" wrapper="$2" start code=0 argv
  shift 2
  start="$(now_ms)"
  if [ "${1:-}" = live ] && [ -n "${2:-}" ] && [ -f "$dir/cases/$2/case" ]; then
    live "$dir" "${@:2}" || code=$?
  else
    "$wrapper" "$@" || code=$?
  fi
  argv="$(printf '%q ' "$@")"
  printf '%s %dms exit=%d %s\n' "$(iso_ms "$start")" $(($(now_ms) - start)) "$code" "${argv% }" >>"$dir/calls.log"
  exit "$code"
}

[ $# -ge 1 ] || usage
verb="$1"
shift
case "$verb" in
  build)
    [ $# -eq 2 ] || usage
    mkdir -p "$1"
    build "$(cd "$1" && pwd -P)" "$2"
    ;;
  use)
    [ $# -eq 3 ] || usage
    [ -d "$1" ] || die "no fake at $1"
    use "$(cd "$1" && pwd -P)" "$2" "$3"
    ;;
  serve)
    [ $# -ge 2 ] || usage
    serve "$@"
    ;;
  *) usage ;;
esac
