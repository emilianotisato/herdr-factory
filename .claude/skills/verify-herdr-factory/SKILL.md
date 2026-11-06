---
name: verify-herdr-factory
description: Drive a herdr-app window of its own (scratch HERDR_APP_HOME, its own hc core) over fixture factory runs, and keep herdr-app shot screenshots as proof. Launch, doctor, drive with herdr-app do, evidence, cleanup, without touching the owner's window or ~/.config/herdr-app. Use for Prove tasks and § QA plan rows of this repo's mods, "verify it in the window", "screenshot the sidebar", "show the run strip in light and dark".
---

# Verify herdr-factory

This repo's product is herdr-app mods and layouts: the spaces sidebar showing factory runs. This skill opens a **second herdr-app window** on a scratch home and a scratch hc core, builds fixture git repos and a fixture factory data dir (one run per run-strip state), drives the window with `herdr-app do`, and keeps `herdr-app shot` PNGs. It never drives the owner's window. It does not cover `install.sh` against a real home: that proof is a transcript on a scratch home, no window needed. Read [features/README.md](features/README.md) before driving; the feature file is the recipe.

All helpers are in `bin/`, take the run id first, and work from any folder. Paths below are relative to this skill's folder; call them by absolute path.

## Launch

```sh
run="$(bin/launch.sh [run-id])"      # prints the run id; default MMDD-HHMMSS
```

- Makes `$TMPDIR/verify-herdr-factory/<run>/` (`VERIFY_HERDR_SCRATCH` moves the root) with `home/` (the window's `HERDR_APP_HOME`), `state/` (`XDG_STATE_HOME`, the scratch core's state), `fixtures/` and `app/` (window pid, start time, log).
- Seeds `home/shared.json` (`frame.welcomed`) and `home/update-notes.json` (`last_run`) so no welcome dialog or "Updated to" toast covers the frame.
- Builds the fixtures: `tests/fixtures/factory-fixtures.sh build <scratch>/fixtures`. It starts one `sleep infinity` per live run as its driver.
- Starts `herdr-app` with `HERDR_APP_HOME`, `HC_SESSION=vhf-<run>` and `XDG_STATE_HOME` set, and `HC_TERMINAL_ID`, `HC_TERMINAL_SOCKET`, `HC_SOCKET`, `HC_SCOPE` unset. Ready when `herdr-app status` answers on that home: about 0.5 s. Fails after 15 s.
- **The factory command for a layout's props** is `<scratch>/fixtures/bin/factory`: it runs the real `factory` with `FACTORY_DATA_DIR` and `FACTORY_CONFIG_DIR` pointed at the fixtures. A scratch layout names it in `"props": { "factory": "…" }`.
- **Isolation**: one run id is one window, one core, one fixture set. Two runs side by side are fine. A window opens on the owner's display; nothing here sends it keys or pointer events.
- **Stop**: `bin/cleanup.sh <run>`.

## Doctor

```sh
bin/doctor.sh <run>
```

Read-only. Passes when: `herdr-app`, `hc`, `node`, `sqlite3` and `factory` are installed, factory is 0.13.0 or newer; `node tests/fixtures/check-fixtures.js <wrapper>` finds all 8 fixture runs in their states, the live ones with `driverDead: false`; the recorded window pid is alive with the same start time and carries this run's `HERDR_APP_HOME`; `status` answers with no `errors`; the core answering on `HC_SESSION=vhf-<run>` is a process carrying that session. Run it after launch and after any failed drive. A FAIL line means do not drive: clean up and launch again.

No build step: mods are loaded from their files on save, so there is no stale bundle to detect. A broken save keeps the old version running and shows in `status` errors, which Doctor checks.

## Drive

**Scripted**: every command goes through a helper that sets the scratch environment.

```sh
bin/herdr.sh <run> do space.new --name shop --folder <scratch>/fixtures/repos/shop
bin/herdr.sh <run> ls            # spaces > tabs > terminals, with ids
bin/herdr.sh <run> status        # layout, focus, overlays, errors
bin/herdr.sh <run> commands      # every command and its arguments
bin/herdr.sh <run> do layout.switch --name <layout>
bin/appearance.sh <run> light    # or dark, or system
bin/hc.sh <run> ls --json        # the scratch core's terminals
```

`herdr-app do` prints the created ids or `{"error": …}` and exits 1. Read the result, then confirm with `ls` or `status`. Use ids from `ls`, never the focused default.

**Changing what the window shows**: edit files under `<scratch>/home/` (`layouts/`, `mods/`, `settings.json`); the window reloads within a second. A broken file writes `<name>.error` beside it and shows in `status`.

**End to end in one call**: `bin/prove.sh [run-id]` launches, doctors, opens the shop repo as a space, takes `space-new.png`, checks the owner's window shows no scratch folder, cleans up and checks the evidence survived. About 5 s.

There is no interactive driver: `terminal-browser` cannot reach a native window, and pointer or key automation on the owner's display is off limits. Every proof here is scripted and repeatable.

## Evidence

```sh
bin/shot.sh <run> <name> [dir]   # prints <dir>/<name>.png
```

- Default dir: `artifacts/<run>/` in this skill, gitignored. A checkpoint that names its own evidence folder passes it as `dir`.
- Beside each PNG, `<name>.txt` holds the window's `status` and `ls` at that moment: the state behind the picture.
- `shot` captures the window's last rendered frame at its pixel size, even covered or minimized. Wait about a second after a change before shooting: the frame is the last one drawn.
- Name files by the behavior: `strip-building-dark.png`, not `shot1.png`.

Proof standards. A proof that skips one is incomplete:

- Exercise the real user path. No internal setters, no test-only endpoints, no writing to storage directly. Fixture run files are the seed, written before the drive; changing them mid-drive is the drive only when the behavior is "the window follows factory's files".
- Capture the action **and** the resulting state, not only the final screen.
- Read side effects back through a second user-facing path: `ls` after `do`, `factory status --json` through the wrapper after an answer.
- Mock only where a production boundary already isolates the external system: here, factory's data dir.
- A dry-run or test mode is verified by observing what it actually skips, never by trusting its name.
- UI proof = a screenshot plus the `.txt` beside it. CLI proof = command, stdout, stderr, exit code. Mutation proof = a read-only second view of the stored value.

Record with every artifact the feature id, the entry point used and the run id. An unreachable path is reported with the attempted command and the unmet precondition, never as verified through a different path.

## Cleanup

```sh
bin/cleanup.sh <run>
```

Closes the window (`window.close` on the scratch home, then the recorded pid, checked against its start time), stops the scratch core (`hc server stop` with `HC_SESSION=vhf-<run>`), stops every process left whose environment carries that `HC_SESSION`, stops the placeholder drivers by recorded pid and start time, and deletes `<scratch root>/<run>`. It then checks: no scratch folder, no process of the session, no `vhf-<run>` socket under `$XDG_RUNTIME_DIR/herdr-core/`. Exit 1 lists what is left. `artifacts/` is never touched. Run it after every failed iteration too.

## Constraints

- **Every `herdr-app` call without `HERDR_APP_HOME` reaches the owner's window**, and every `hc` call without `HC_SESSION` reaches the owner's core. Use the helpers; never call `herdr-app` or `hc` bare in a recipe. The one deliberate owner call is `prove.sh`'s read-only `ls`, with `HERDR_APP_HOME` set to the owner's home explicitly.
- **Spaces live in the hc core, not in the home** ("Each machine keeps its spaces, tabs and splits in its core's `herdr-app` document", `AGENTS.md`). So a scratch home alone would share the owner's spaces, and a `space.new` would land in the owner's window too; this was not tried, on purpose. `HC_SESSION=vhf-<run>` gives the scratch window its own core (herdr-app starts it through `hc connect`, so the variable reaches it); `XDG_STATE_HOME` keeps its state out of `~/.local/state/herdr-core`. Never change `XDG_RUNTIME_DIR`: the Wayland socket lives there.
- **A fresh home opens on the welcome dialog, and `overlay.close` does not close it** (it answers `ok` and the dialog stays). Launch seeds `frame.welcomed` instead. A fresh home also toasts "Updated to <version>" unless `update-notes.json` has `last_run`.
- **`app.theme paper` does not make the window light** while the system is dark: it sets the light half only. `bin/appearance.sh <run> light` sets `appearance` in the scratch `settings.json`.
- **A backgrounded shell function is a forked shell**: `in_scratch herdr-app &` records the shell's pid, not the window's. Launch backgrounds `"${SCRATCH_ENV[@]}" setsid herdr-app` directly.
- **A fixture run's driver is a pid factory checks with its `/proc` start time.** Live fixtures stay live only while their `sleep infinity` runs; after `factory-fixtures.sh stop` they read `driverDead: true`. A parked run has no driver by design and never reads driver dead.
- **`factory answer` needs more than an event.** It looks for the `kind: block` entry in the feature's `log.jsonl`, the feature's `slice-NN-*.md`, and the run's row in `factory.db`; a fixture missing any of them fails, the last one with `sqlite: FOREIGN KEY constraint failed` after it already appended `block_answered`. The builder writes all three, the block through `factory docs log add` itself.

## Helpers

| Helper | Does |
|---|---|
| `bin/launch.sh [run]` | scratch, fixtures, window; prints the run id |
| `bin/doctor.sh <run>` | read-only health check |
| `bin/herdr.sh <run> <args…>` | `herdr-app <args…>` on the scratch window |
| `bin/hc.sh <run> <args…>` | `hc <args…>` on the scratch core |
| `bin/appearance.sh <run> light\|dark\|system` | the window's appearance |
| `bin/shot.sh <run> <name> [dir]` | PNG plus status and ls |
| `bin/cleanup.sh <run>` | everything the run started, gone; evidence kept |
| `bin/prove.sh [run]` | the whole loop once, as a smoke test |
| `tests/fixtures/factory-fixtures.sh build\|stop <dir>` | the fixture repos, runs, drivers and wrapper (repo root) |
| `tests/fixtures/check-fixtures.js <wrapper>` | each fixture run in its state (repo root) |
