# Fixture runs

The factory runs the window reads, through a wrapper that points factory at a fixture data dir. One run per run-strip state, spread over two repos that are opened as spaces and one that never is, so a proof can show each run on its own space and nowhere else.

## Sub-features

- `runs-states` one run per state: building, owner needed, paused, parked, driver dead, shipped, failed.
- `runs-placement` shop holds three runs, api four, loner one with no space.
- `runs-live` the live runs have a live placeholder driver.
- `runs-change` appending to a run's `events.jsonl` changes what `factory status` says, as a real run's driver does.
- `runs-answer` the owner-needed run's `BLOCK-1` answers with `factory answer`, once.

## How to get to it (user POV)

- The owner sees these as factory runs; the window reads them by running `<scratch>/fixtures/bin/factory status --json --recent`.
- A layout names that wrapper in its factory mod's props: `"props": { "factory": "<scratch>/fixtures/bin/factory" }`.
- From a shell: `<scratch>/fixtures/bin/factory status --json --recent`.

## Driving it with herdr-app do

Preconditions:

- Baseline: launched, doctor passes. Doctor's fixture line is this map's precondition.

| run id suffix | repo | state | phase | what status says |
|---|---|---|---|---|
| `a001` | shop | building | `building` | 10 slices, 4 done, one building |
| `a002` | shop | owner needed | `waiting-owner` | `questions`: `BLOCK-1` on slice 2 |
| `a003` | shop | shipped | `finished` | `pr` `https://github.com/example/shop/pull/100`, `ci` `green` |
| `b001` | api | paused | `paused` | `pausedUntil` two hours after launch |
| `b002` | api | parked | `waiting-owner` | `parked` `budget`, no driver by design |
| `b003` | api | driver dead | `building` | `driverDead` true |
| `b004` | api | failed | `failed` | a `run_failed` event |
| `c001` | loner | building | `building` | its repo has no space |

Run ids are `<feature>-<build date>-<suffix>`, e.g. `004-20261106-a002`.

- **Read them.** `<scratch>/fixtures/bin/factory status --json --recent`. 8 runs. `node tests/fixtures/check-fixtures.js <scratch>/fixtures/bin/factory` (repo root) prints `fixtures: 8 runs as expected` or one line per field that differs.
- **Open a question.** Append to a building run's events, with the next `seq`: `printf '{"kind":"slice_blocked","block_id":"BLOCK-1","slice":5,"question":"…","seq":8,"ts":"%s"}\n' "$(date -u +%FT%TZ)" >> <scratch>/fixtures/data/runs/003-<date>-a001/events.jsonl`. `factory status` then lists `BLOCK-1` under that run's `questions`. This is what a real driver does, so it is the drive for "the window follows factory's files".
- **Answer.** From `<scratch>/fixtures/repos/shop`: `<scratch>/fixtures/bin/factory answer --feature 004 BLOCK-1 "Charge the saved card"`, the argv the run's `questions[].answer` gives. Prints `BLOCK-1 resolved …`, exit 0, and writes `<scratch>/fixtures/data/runs/004-<date>-a002/answers/BLOCK-1.json`. Read back with `status`: the run's `questions` is empty. The same command again prints `BLOCK-1 is already resolved …` and exits 1.
- **Kill a driver.** `kill <pid>` of the run's line in `<scratch>/fixtures/drivers.pids`. That run reads `driverDead: true` on the next status.
- **Proof.** The status JSON, saved beside the screenshot that shows it.

## Gotchas

- `budget.used` is the sum of the run's worker rows in `<scratch>/fixtures/data/factory.db`; the builder writes one per run, so the parked run reads 20.4M of 20M and the rest less.
- An answer changes the shop repo (`log.jsonl`, `state.toml`) and the run folder. A proof that needs the block open again relaunches.
- `pausedUntil` is two hours after the build. Past it, status reads `pausedUntil: null` and doctor fails the paused run: relaunch.
- The shipped and failed runs leave `--recent` 7 days after their `updated_at`. Fixtures are rebuilt on every launch, so this bites only a scratch kept for a week.
- `factory status` without `--recent` leaves out shipped and failed.
- Never point the wrapper, or a layout, at `~/.local/share/factory`: those are the owner's real runs.
