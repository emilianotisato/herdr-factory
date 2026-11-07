---
title: "Make the live fixtures agree with what factory live derives"
state: "open"
added: "2026-11-07"
origin: "PRD-003 polish"
---

The canned `tests/fixtures/live/*.json` cases match factory 0.13.1's field shapes but not always its derivations, so a screenshot can show two numbers that disagree. Found by the PRD-003 second opinion (grok-4.7-high), checked against `~/Projects/factory/src/live/`:

- `idleSeconds` younger than the worker's `lastWriteAt` in `gate-red` (5 vs 60 s), `later` (2 vs 30), `stopping` (3 vs 30); factory's idle is the age of the newest event, stream or gate log.
- `waiting-driver`: `lastWriteAt` before the worker's `spawnedAt`.
- `waiting-worker` and `stopping` labels name lanes ("lane 3 build worker"); factory's `worker_label` names slices ("slice 03 build worker").
- `shots-three`: `gate` is gate 1 while the timeline already shows `gate_run(2)`.
- `waiting-ci`: `slice_done(03)` stamped before `slice_spawned(03)`. `waiting-worker`/`waiting-review`: `slice_committed` before `slice_done`, factory emits the reverse.
- `waiting-owner`/`block-excerpt`: attention ids `Q1`. Factory's `cockpit::question` keeps only `BLOCK-n`/`ASK-n`, so Send through the real wrapper fails ("neither BLOCK-n nor ASK-n"). They were renamed from `BLOCK-1` to satisfy the leaks check, which reads `BLOCK-1` as a plan id.
- `waiting-quota`/`waiting-budget`: `workers: []` while factory keeps the rate-limited or open worker in `state.workers`; `run_paused` data shape differs.
- `park`: `landing_conflicted` opens a dirty-tree park; factory emits `run_waiting` only.
- The fake moves `at` on every answer but not `now.idleSeconds` or `running.elapsedSeconds`.

A cheap route: generate the cases from a real `factory live` on fixture runs and keep only the hand edits a case needs. The `Q1` ids need a leaks-check answer first.
