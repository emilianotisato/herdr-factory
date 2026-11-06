# herdr-factory verification map

Read this index before driving the window, then use the matching feature file as the recipe.

## Baseline preconditions

- `run="$(bin/launch.sh)"` has printed a run id. `<scratch>` below is `$TMPDIR/verify-herdr-factory/<run>`.
- `bin/doctor.sh <run>` prints only `ok` lines: 8 fixture runs in their states, the window on the scratch home, the core on `vhf-<run>`.
- The window shows the shipped `main` layout and no space. Launch opens none.
- Fixture repos: `<scratch>/fixtures/repos/shop`, `api` and `loner`. `loner` is never opened as a space.
- Never drive a window this run did not start: every command goes through `bin/herdr.sh <run>`.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Scripted only: `bin/herdr.sh <run> do <command> …`, `bin/appearance.sh`, files under `<scratch>/home/`. No interactive driver exists for a native window.
- Name targets by the ids `bin/herdr.sh <run> ls` prints, never by the focused default or by screen position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Wait about a second after a change before `bin/shot.sh`: it saves the last frame drawn.
- Never remove proof artifacts during cleanup; `bin/cleanup.sh` leaves `artifacts/` alone.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen: the PNG and the `.txt` beside it.
- UI proof = screenshot + the window's `status` and `ls` at that moment. CLI proof = command, stdout, stderr, exit code. Mutation proof = a read-only second view of the stored value.
- Record the feature id and the entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition. Never report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file: an H1, one paragraph on the user-visible behavior, then exactly four H2s in this order.

1. `Sub-features`: short ids, one line each.
2. `How to get to it (user POV)`: every entry point.
3. `Driving it with herdr-app do`: starts with `Preconditions:`, then labelled bullets pairing each user action with an exact command and the observable result.
4. `Gotchas`: traps that waste or invalidate a run.

## Features

- [Spaces](./spaces.md): open a fixture repo as a space in the sidebar, see it in `ls`. Proven by `bin/prove.sh`.
- [Fixture runs](./fixture-runs.md): the factory runs a layout's factory command reads, one per run-strip state.
- [Look](./look.md): light and dark appearance, themes, zoom: the conditions every screenshot is taken in.
