# Slice 01 — Fake factory for live

**Source**: [`prd.md`](prd.md) → §11 QA plan (Seed state, Harness), and the acceptance of §5 FR-3 to §9 FR-7 that name a fixture. **Depends on**: — (independent: it touches only `tests/` and the harness's feature map, so it builds beside slice 02)
**Created**: 2026-11-07

**Progress**:
- Built: `tests/fixtures/fake-factory-live.sh` (`build`, `use`, and the `serve` the generated `bin/factory` calls), 20 canned cases plus three committed 320×200 PNGs under `tests/fixtures/live/`, the built-in `exit-1` and `exit-2`, `tests/fake-factory-live.test.js` (10 tests, about 5 s), and `features/run-panel.md` with its README line.
- Inner loop: 1 run, 0 red, under 1 min (8 s). The test file passed alone first, in 5 s.
- Deviations: the passthrough runs the wrapper as a child, not `exec`, so the log has its exit code, and each log line carries the duration too (AD-5). `use` also moves the case's times to now and rewrites `branch` and the Answer argv's feature (AD-6). The fake needs `jq` (AD-4).
- Left for the checkpoint: running the recipe's commands against a launched scratch (task 5's acceptance).

**Slice**: The harness gains a fake `factory` that answers `factory live <id> --json` from canned JSON, one file per section case the QA plan names, and passes every other verb (and `live` for a run with no case set) to PRD-001's fixture wrapper. It logs each call with its time. The harness's feature map says how to put it in a layout's props and pick a case. Nothing in the product changes; this is the seed every panel proof leans on, so it lands first.

## Current code / environment

- **The fixture wrapper already exists**: `tests/fixtures/factory-fixtures.sh:136-140` writes `<out>/bin/factory`, the real factory with `FACTORY_DATA_DIR` and `FACTORY_CONFIG_DIR` baked in. Real factory 0.13.1 answers `live` on those fixture runs too, so delegation gives the panel real answers for free; a canned case only overrides one run id.
- **A layout passes only a command path**, no environment (`.claude/skills/verify-herdr-factory/features/run-actions.md`, Preconditions: `content.props` `{ "factory": …, "runs": … }`). The fake's paths must be baked into a generated script, as the wrapper's are, not read from env.
- **Fixture run ids are dated**: `<feature>-<build date>-<suffix>` (`features/fixture-runs.md`, table). A canned case is written with placeholders and copied onto a real fixture id at drive time, with `id`, `feature` and `repo` rewritten to that run's, or the panel (which picks runs from `factory-spaces`' status) never asks for it.
- **The real shapes** (`factory live <id> --json`, factory 0.13.1, read 2026-11-07 on 40 finished runs): 19 envelope keys `schema factory id feature phase repo branch seq rev at now attention workers gate ci timeline evidence decisions truncated`; `now` `{waitingOn, label, since, progress, resumesAt, idleSeconds, driverAlive, stopping}`; workers `{sessionId, role, job, slice, checkpoint, lane, spawnedAt, alive, doing, narration, running, lastWriteAt, outcome}`; `gate` `{n, attempt, cmd, running, startedAt, red, minutes, cached, log, bytes, tail, excerpt, fixEmpty}` with `excerpt` an array of `{text, hit}`; `ci` `{state, round, head, checks, excerpt}`; timeline `{seq, ts, kind, tone, label, data}`; `evidence` `{root: "evidence", checkpoints: [{n, state, files: [{path, kind, bytes, mtime, stable, etag, caption, citedBy, sidecars}]}], skipped, truncated}`; `decisions` `{count}`. No finished run holds a non-null `doing`, `running`, `narration`, `attention` entry, `progress` or `stopping`: those shapes come from the contract, factory repo `docs/features/024-live-run/prd.md` §4-§5 (`attention[]` `{id, kind, openedAt, title, body, reason: {source, log, excerpt}, answer}`, `doing` `{tool, label, at, inSubagent}`, `running` `{tool, elapsedSeconds}`, `progress` `{done, of}`, `stopping` `{on, what}`).
- **Exit codes, checked on 0.13.1**: an unknown id prints `no run <id>` on stderr and exits 1; an unknown verb exits 2 (`error: unrecognized subcommand`). `--since <seq>` keeps timeline events after that seq; without it, the last 100.
- **`--wait`** returns as soon as the snapshot's `rev` changes, else at the deadline with exit 0 (factory `src/cli/live.rs:55-73`).
- **Tests never read the machine's runs folder** (prd §11 Seed state; `features/fixture-runs.md` Gotchas: "Never point the wrapper, or a layout, at `~/.local/share/factory`"). The real runs on this machine include client repos: copy shapes, never strings. This is a public repo: no client names in any canned file.
- **The gate runs shellcheck on every `*.sh`** (`docs/reference/verification.md`, shell tier), and tests are `tests/*.test.js` under `node --test` (`scripts/gate/test.sh`).

## Tasks

### 1. The fake and its call log — high — blocked by: —
**Source**: §11 QA plan, Seed state: "a fake factory, `tests/fixtures/fake-factory-live.sh`. It is passed in through the layout's `factory` prop and answers `live` from canned JSON files, one per section case." §5 FR-3 acceptance: "The fake factory logs each call's time."

`tests/fixtures/fake-factory-live.sh`, following `factory-fixtures.sh`'s shape:
- `build <dir> <wrapper>` writes `<dir>/bin/factory` with both paths baked in, and prints its path.
- `use <dir> <runId> <case>` makes `live <runId>` answer from case `<case>` (rewriting `id`, `feature`, `repo` to the run's, read from the wrapper's `status --json --recent`); `use <dir> <runId> none` drops it.
- The generated command: `live <id> --json [--since N] [--wait S]` with a case set answers the case, keeping only timeline rows with `seq > N` when `--since` is given; with none set, or any other verb (`status`, `answer`), it `exec`s the wrapper.
- Every call appends one line to `<dir>/calls.log`: UTC time with milliseconds, the argv, the exit code.

**Acceptance:** `tests/fake-factory-live.test.js` builds the fixtures and the fake in a temp dir, and asserts: `status --json --recent` through the fake equals it through the wrapper; `live <id> --json` with no case set equals the wrapper's answer; after `use`, `live` returns the case with the run's own `id`; `--since` drops rows at or below that seq; each call adds a line to `calls.log`.

### 2. Exit cases and the delayed event — high — blocked by: 1
**Source**: §5 FR-3 acceptance: "Given a new event after 3 s, a screenshot 2 s after that answer shows it on the timeline." "A fake that exits 2 shows the upgrade line. One that exits 1 keeps the last view, with its stderr line."

Same files. Case `exit-2`: prints factory's usage error on stderr, exits 2. Case `exit-1`: prints `no run <id>`, exits 1. Case `later`: a normal answer; once 3 s have passed since `use`, the answer gains one timeline row (`seq` + 1, a `slice_done` of tone `green`) and the envelope `seq` and `rev` change. A `--wait S` call holds until that moment or S, whichever is first, as factory's `--wait` does.

**Acceptance:** the test asserts exit 2 and exit 1 with their stderr; for `later`, a call with `--wait 10` made right after `use` returns in 2.5–5 s with the extra row, and a `--wait 1` call made at once returns without it in about 1 s.

### 3. The canned cases — high — blocked by: 1
**Source**: §11 QA plan: "canned JSON files, one per section case … Each canned file copies the field shapes of factory 0.13.1's real output." Rows: §6 FR-4 "One screenshot per `waitingOn` fixture", "A quota park shows its `resumesAt`", "A `park` entry shows its reason … its `reason.excerpt` is null", "A block with an excerpt shows it with its Answer button", "A dead driver shows 'driver dead'"; §7 FR-5 "a fixture with three workers, one with every derived field null"; §8 FR-6 "A red gate fixture", "A running gate", "A timeline fixture holding one `info` event and one `noise` event"; §9 FR-7 "A fixture with three PNGs", "one valid image, one entry whose `path` holds `..`, and one symlink".

`tests/fixtures/live/<case>.json`, one per case: one per `waitingOn` value (`owner worker gate review ci quota budget driver nothing done`; `quota` with `resumesAt`, `review` with `progress`, `driver` with `driverAlive: false`, one with `stopping` set); `park` (a `kind: park` entry, reason in `title`, `reason.excerpt` null); `block-excerpt` (a `kind: block` entry with `{text, hit}` excerpt lines and an `answer` argv `["factory","answer","--feature",…,"BLOCK-1"]`); `workers-three` (three rows, the third with `doing`, `narration`, `running`, `job`, `checkpoint` null); `gate-red`; `gate-running` (with a 40-line `tail`); `timeline-noise` (one `info`, one `noise`); `shots-three` and `shots-hostile` (see task 4). Strings are invented (a `shop`/`api` vocabulary, as PRD-001's fixtures use).

**Acceptance:** the test asserts every case file has exactly the 19 envelope keys, `schema: 1`, and each section's key set as listed under Current code; every excerpt line is `{text, hit}`; no case file contains a home path.

### 4. Evidence files for the screenshot cases — high — blocked by: 3
**Source**: §9 FR-7 acceptance: "A fixture with three PNGs draws three thumbnails with captions." "A fixture holding one valid image, one entry whose `path` holds `..`, and one symlink leaves exactly one file in `data/factory-run/shots/<runId>/`."

`use <dir> <runId> shots-three|shots-hostile` also writes the files the case lists under `<runs dir>/<runId>/evidence/` (the runs dir is the wrapper's `FACTORY_DATA_DIR/runs`, the same folder the layout's `runs` prop names): three small valid PNGs for `shots-three`; for `shots-hostile` one PNG, one listed entry `cp-1/../../escape.png`, and one listed entry that is a symlink to a PNG outside the run. Every listed image is `stable: true` with `etag` `<bytes>-<mtimeMs>` of the real file. PNGs are generated by the script or committed under `tests/fixtures/live/`, a few KiB each.

**Acceptance:** the test asserts, after `use … shots-hostile`, that the run's `evidence/` holds one regular PNG and one symlink, and the case lists three image entries; after `shots-three`, three PNGs whose sizes match their listed `bytes`.

### 5. The harness recipe — medium — blocked by: 2, 4
**Source**: §11 QA plan: "**Harness**: PRD-001's `verify-herdr-factory`", "It is passed in through the layout's `factory` prop".

`.claude/skills/verify-herdr-factory/features/run-panel.md` (new, the README's four-H2 contract) and one line in `features/README.md`. Preconditions: as `run-actions.md` (checkout copy, install with the run's env, `x11` input), plus `fake-factory-live.sh build <scratch>/fake <scratch>/fixtures/bin/factory`, and the factory layout's `run` block (slice 02 adds it) given `content.props` `{ "factory": "<scratch>/fake/bin/factory", "runs": "<scratch>/fixtures/data/runs" }`. Drives: pick a case with `use`, open the panel with `input.sh click` on the tab bar's Run button (coordinates off a fresh shot), read `calls.log`. Gotchas: a case is per run id; `factory-spaces` keeps reading through the wrapper; `ls -la` and `stat` on `data/factory-run/shots/<runId>/` in the scratch home for FR-7.

**Acceptance:** the file follows the README's entry contract, and every command in it runs against a launched scratch (checked at the checkpoint).

### 6. Verify — medium — blocked by: 1, 2, 3, 4, 5
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

No Prove task: this slice is seed state, with no QA plan row of its own. Its test runs in the gate, and every later Prove row drives it.

**Code-review fixes (2026-11-07).**
- The harness recipe's delayed-event step said to `use … later` with the panel shown, which its own gotcha contradicts: a call in flight ignores the new case. It now says to click another chip and back within a second.
