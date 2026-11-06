# Slice 01 — Harness: drive a scratch herdr-app

**Source**: [`prd.md`](prd.md) → §12 QA plan (Harness, Seed state). **Depends on**: — (the QA plan puts the harness first; it touches no file slice 02 writes)
**Created**: 2026-11-06

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: Every later checkpoint can launch a herdr-app window of its own on a scratch home, point factory at fixture runs, drive the window with `herdr-app do`, and keep `herdr-app shot` screenshots as evidence, then clean up without touching the owner's window or `~/.config/herdr-app`. This slice builds that skill and the fixtures. It builds no product code: the factory layout and mods come in slices 02 to 05.

## Current code / environment

- **`herdr-app` reads its home from `HERDR_APP_HOME`** (`herdr-app --help`: "Home: ~/.config/herdr-app (HERDR_APP_HOME picks another)"), and `herdr-app status`, `do`, `shot` ask "the running window" that variable names (`~/.config/herdr-app/AGENTS.md`, "Seeing the window"). Not yet verified: that a second window opens while the owner's is running (prd §15). If it will not, the fallback is decided (prd §12): install into the real home under a test layout name and switch back after.
- **`herdr-app shot [file.png]`** saves the last rendered frame of that window, even covered or minimized, and errors before the first frame.
- **factory reads its runs from `FACTORY_DATA_DIR`** (factory `src/paths.rs:13`), `runs/<id>/state.json` and `events.jsonl` each. `factory status --json --recent` also opens each run's repo for its slices and title (`Docs::open(&s.repo)`, factory `src/cli/status.rs`), so a fixture run needs a fixture repo: a git repo with `docs/project.toml`, `docs/features/NNN-slug/prd.md` (frontmatter `title`) and `state.toml` with its slices.
- **A live fixture run needs a live driver pid.** `driverDead` is true when the state's `pid` (with `pid_start`) is not a live process (`driver_dead`, factory `src/cockpit.rs:264`). A fixture in `building` with a dead pid shows as driver dead. The harness starts one long-lived placeholder process per live fixture and writes its pid and start time into that fixture's `state.json`; read `pid_start` in factory `src/run.rs` for the format it checks.
- **The fixture states** are FR-4's table (prd §7): building, owner needed (a `slice_blocked` event, e.g. `{"kind":"slice_blocked","block_id":"BLOCK-1","slice":2,"question":"…","seq":10,"ts":"…"}`), paused (`paused_until` in the future), parked, driver dead, shipped (`pr_url`, a `ci_green` event, phase `finished`), failed. Real run folders to copy shapes from: `~/.local/share/factory/runs/*` (67 of them on 2026-11-06). Rewrite every repo path to the fixture repos; never commit a path or name from the owner's real runs.
- **The factory command seam is slice 03's.** `factory-spaces` will take its factory command from layout props, `"props": { "factory": "factory" }` by default (prd §12). This slice writes the wrapper the harness's scratch layout will name: a script that sets `FACTORY_DATA_DIR` to the fixtures and runs `factory "$@"`.
- **The gate's test tier only runs `tests/*.test.js`.** Fixture builders go under `tests/fixtures/`, as scripts the harness calls.

## Tasks

### 1. Build the harness — high — blocked by: —
**Source**: §12 QA plan: "The first slice builds `.claude/skills/verify-herdr-factory/` via `/harness`. It launches a second herdr-app with a scratch `HERDR_APP_HOME`, points factory at fixture runs with `FACTORY_DATA_DIR`, drives it with `herdr-app do`, and saves `herdr-app shot` PNGs."

Run `/harness`. It writes `.claude/skills/verify-herdr-factory/` with Launch, Doctor, Drive, Evidence, Cleanup and Constraints, and a feature map. The skill's scripts live in that folder. Launch makes a scratch home, opens the window there and waits for `herdr-app status` to answer. Doctor checks `herdr-app`, `hc`, `factory` 0.13.0 or newer and the fixtures. Drive is `herdr-app do` with `HERDR_APP_HOME` set. Evidence is `herdr-app shot` into the evidence folder the checkpoint names. Cleanup closes that window only, stops the placeholder processes and deletes the scratch home.

**The trap:** every `herdr-app` call without `HERDR_APP_HOME` reaches the owner's own window (`AGENTS.md`, "Seeing the window"). Every script sets it explicitly; none inherits it.

**Acceptance:** the generated skill's own proof run: launch, doctor, one drive (`herdr-app do space.new --folder <a fixture repo>`), one screenshot that exists and is non-empty, cleanup that leaves no scratch home and no extra herdr-app process.

### 2. Fixture runs and repos — high — blocked by: —
**Source**: §12 QA plan, Seed state: "fixture run folders, one per FR-4 state, recorded from real runs and rewritten to the §3 schema."

`tests/fixtures/`: a script that builds, under a directory it is given, two fixture repos and a factory data dir with one run per FR-4 state, plus the factory wrapper. Two runs belong to one repo and the rest spread so that FR-3's "each run shows on its own space and nowhere else" can be shown, plus one run whose repo has no space.

**Acceptance:** with the wrapper, `factory status --json --recent` prints one run per state, each with the `phase`, `questions`, `driverDead`, `pausedUntil`, `parked`, `pr` and `ci` its state calls for, and the live ones with `driverDead: false`.

### 3. Verify — medium — blocked by: 1, 2
`make inner` _(the inner loop; the full gate runs at this slice's checkpoint)_

**Acceptance:** inner loop green, one commit.

No Prove task: this slice has no FR. Its proof is task 1's proof run, kept in Progress.
