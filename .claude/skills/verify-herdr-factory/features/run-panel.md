# Run panel

The Run button in the factory layout's tab bar opens a side panel on the shown space's factory run: what it waits on, its workers, the gate and CI, a timeline, and checkpoint screenshots. The panel reads one verb, `factory live <id> --json`, through the command its layout props name. Proofs give it a fake factory, `tests/fixtures/fake-factory-live.sh`, that answers `live` for one run from a canned case and passes every other call to the fixture wrapper, logging each call with its time.

## Sub-features

- `panel-open` Run shows the panel, a second click hides it; the choice follows the space.
- `live-loop` while shown, the panel holds `live --since <seq> --wait 20` calls; hidden, it makes none.
- `live-errors` exit 2 shows the upgrade line; exit 1 keeps the last view with factory's stderr line, dimmed.
- `waiting` the top line for each `waitingOn`, the attention entries, and Answer.
- `workers` one row per worker, the null fields left out.
- `gate-timeline` the red and running gate, and a timeline with `info` and `noise` rows.
- `shots` checkpoint thumbnails copied under `data/factory-run/shots/<runId>/`.

## How to get to it (user POV)

- **Run** in the factory layout's tab bar, beside Files and Changes. Clicking it again hides the panel.
- The panel follows the selected space; a space with two runs shows a chip per run.

## Driving it with herdr-app do

Preconditions:

- As [Run actions](./run-actions.md): `VERIFY_HERDR_INPUT=x11 bin/launch.sh <run>`, doctor passes with an `input:` line, and the factory layout from a checkout copy in `<scratch>/checkout`, installed with `HERDR_APP_HOME`, `HC_SESSION` and `XDG_STATE_HOME` of the run.
- The fake, from the repo root: `tests/fixtures/fake-factory-live.sh build <scratch>/fake <scratch>/fixtures/bin/factory`. It prints `<scratch>/fake/bin/factory`.
- In the checkout's `layouts/factory.json`, before `install.sh`: the `factory-spaces` block's `content.props` as in Run actions, and the `run` block's (the `factory-run` mod under `panel-body`) `content.props` set to `{ "factory": "<scratch>/fake/bin/factory", "runs": "<scratch>/fixtures/data/runs" }`.
- Spaces shop, then api (`do space.new`), as in Run actions.

- **Pick a case**: `tests/fixtures/fake-factory-live.sh use <scratch>/fake <runId> <case>`, with `<runId>` a fixture id from [Fixture runs](./fixture-runs.md) on the selected space. `live <runId>` now answers the case, with that run's `id`, `feature`, `repo` and `branch`, its times moved so the case's `at` is now. `use … none` drops it and removes the files it wrote. A run with no case gets real factory's answer on the fixture run.
- **The cases** (`tests/fixtures/live/<case>.json`): `waiting-owner`, `waiting-worker`, `waiting-gate`, `waiting-review` (with `progress`), `waiting-ci`, `waiting-quota` (with `resumesAt`), `waiting-budget`, `waiting-driver` (`driverAlive: false`), `waiting-nothing`, `waiting-done`, `stopping`, `park` (reason in `title`, `reason.excerpt` null), `block-excerpt` (a gate excerpt and Answer), `block-markdown` (a markdown title and body: bold labels, inline code, a fence, a numbered list), `workers-three` (the third with every derived field null), `gate-red`, `gate-running` (40-line tail), `timeline-noise` (one `info`, one `noise`), `shots-three`, `shots-hostile`, `later`. Two more answer nothing: `exit-1` (`no run <id>`, exit 1) and `exit-2` (factory's usage error, exit 2).
- **The delayed event**: `use … later` on the shown run, then within a second click another chip and the run's own again (see Gotchas: a call already in flight ignores the new case). 3 s after `use`, the answer gains one `slice_done` row of tone `green`, and `seq` and `rev` change; a held `--wait` call returns then. Read the time of that answer in `calls.log`, shoot 2 s after it: the row is on the timeline.
- **Open the panel**: `bin/input.sh <run> click X Y` on Run in the tab bar, coordinates off a fresh shot. Click again to hide it.
- **Read the calls**: `cat <scratch>/fake/calls.log`. One line per call: start time (UTC, ms), duration, `exit=<code>`, the argv, e.g. `2026-11-07T10:00:01.234Z 2998ms exit=0 live 003-20261107-a001 --json --since 11 --wait 20`. Hidden panel: `wc -l` before and after a wait shows no new `live` line.
- **Screenshots**: `use … shots-three` writes three PNGs under `<scratch>/fixtures/data/runs/<runId>/evidence/checkpoint-1` and `checkpoint-2`. `use … shots-hostile` writes one PNG, one listed `checkpoint-1/../../escape.png` (written at the run folder's top, outside `evidence/`), and one symlink to a PNG under `<scratch>/fake/outside/`. Then `ls -la <scratch>/home/data/factory-run/shots/<runId>/` and `stat -c '%n %y' <scratch>/home/data/factory-run/shots/<runId>/*`, twice, a poll apart.
- **Proof**: the PNG, the case name and run id, `calls.log` cut to the drive, and for shots the `ls -la` and `stat` transcripts.

## Gotchas

- A case belongs to one run id. Pick a run on the space the panel shows, or the panel never asks for it. Ids carry the build date: list them with `<scratch>/fixtures/bin/factory status --json --recent`.
- `factory-spaces` keeps reading through the wrapper, and so does every call the fake passes on: a canned case changes `live`, never `status`, so the sidebar strip still shows the fixture run's real state.
- A canned answer with nothing new holds a `--wait 20` call the full 20 s, as factory does. Only `later` changes, once.
- `use` again on the same run first drops the previous case and its files. `bin/cleanup.sh` takes the fake with the scratch.
- `calls.log` keeps every call since `build`. Cut it by line count before a drive, not by deleting it.
- Never point the fake's wrapper, or a layout's `runs`, at `~/.local/share/factory`.
- A call already in flight when `use` runs answers from what it read at its start, so a held call on the wrapper ignores the new case. For `later`, `use` first, then click the run's chip within a second: its first call has no wait, and the held call after it returns at the due time.
- To switch a case on the shown run without waiting out a held call, click another chip and then the run's own chip again: the new loop's first call has no `--wait`.
- `workspace.panels` in `<scratch>/home/shared.json` is read when the window starts: edit it, then `bin/restart.sh`.
- The shots section sits below the timeline, past the window's bottom edge: `bin/input.sh <run> scroll 480 500 10` over the panel brings it into view. The chips stay pinned at the top while it scrolls.
