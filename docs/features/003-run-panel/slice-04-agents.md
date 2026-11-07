# Slice 04 — Agents

**Source**: [`prd.md`](prd.md) → §7 FR-5. **Depends on**: 02 (it fills `mods/factory-run/sections/agents.js`, which slice 02 lays out and feeds the snapshot). Independent of 03, 05 and 06.
**Created**: 2026-11-07

**Progress**:
- Built: `mods/factory-run/lib/agents.js` (`workerRows(workers, at)`, `duration`) and `tests/agents.test.js` (5 tests, 100% lines); `sections/agents.js` draws an "Agents" heading, then per worker a dot (`t.working` when alive, `t.muted` otherwise), who and `doing.label`, the narration in `t.dim`, and "running … · last write … ago" in `t.muted`. No worker rows → the section draws nothing.
- Who reads role, then `slice N` or `checkpoint N`, then `job`, joined by " · "; the role is dropped when it repeats ("checkpoint 1 · gateFix"). `doing` falls back to `doing.tool` when its label is null.
- Deviation: `alive` is a boolean (`true` only for `alive === true`), not a string or null as task 1 lists, since it draws a dot, not text.
- Tests use inline workers, not slice 01's `workers-three` file, which is not in this lane yet; the Prove row uses that file.
- Inner loop: 1 run, 0 red, under 1 min. The mods tier writes an unignored `sections/gpui-kit.d.ts`, removed before return (AD-3).
- Prove (FR-5, `workers-three` screenshot and `status` `.txt`): left for checkpoint 2.

**Slice**: Under Now, one row per worker: its role and slice, what it is doing, its narration dimmed, how long the current command has run and when it last wrote, and an alive dot. Null fields show as blanks. The panel never calls a worker stuck.

## Current code / environment

- **The section slot**: `mods/factory-run/sections/agents.js` exports `view(snap, t, ctx)`, drawn second (slice 02, task 5). Do not edit `main.js`.
- **The contract** (factory 0.13.1; factory repo `docs/features/024-live-run/prd.md` §5): `workers[]` `{sessionId, role, job, slice, checkpoint, lane, spawnedAt, alive, doing, narration, running, lastWriteAt, outcome}`; `doing` `{tool, label, at, inSubagent}` or null; `narration` at most 160 chars or null; `running` `{tool, elapsedSeconds}` or null; `lastWriteAt` RFC3339 or null; `job` `gateFix|ciFix|null`; `slice` and `checkpoint` may be null (a checkpoint worker has `checkpoint: 1`, a build worker a `slice`). "Every derived field is nullable. Claude Code's stream is not a contract." Real 0.13.1 output of finished runs has `doing`, `narration` and `running` null in every row (40 runs read 2026-11-07), so null is the common case, not an edge.
- **Times against the envelope's `at`**, not the clock, so "last write 12s ago" is fixed in a test.
- **Fixture**: slice 01's `workers-three` case, the third row with every derived field null.
- **Logic in a lib**: `mods/factory-run/lib/agents.js` with `tests/agents.test.js` (90% line floor); `sections/agents.js` only draws.
- **Not handled** (prd §13): "a 'stuck' verdict on a worker. Long silences are normal, and factory gives none." Do not add a threshold, a color for silence, or any word that judges.

## Tasks

### 1. The worker rows as text — high — blocked by: —
**Source**: §7 FR-5: "One row per `workers[]` entry: its role and slice; `doing.label`; `narration`, dimmed; 'running 9m 30s' from `running.elapsedSeconds`, and 'last write 12s ago' from `lastWriteAt`; a dot for `alive`." "**Accepted cost:** rows can show null fields as blanks."

`mods/factory-run/lib/agents.js`, `tests/agents.test.js`: `workerRows(workers, at)` → per worker `{who, doing, narration, running, lastWrite, alive}`, each a string or null.

**Acceptance:** tests assert: `running.elapsedSeconds: 570` reads `running 9m 30s`; `lastWriteAt` 12 s before `at` reads `last write 12s ago`; a row with `doing`, `narration`, `running`, `lastWriteAt`, `slice` and `job` null gives nulls and no throw; three workers give three rows in order.

### 2. Draw the rows — high — blocked by: 1
**Source**: §7 FR-5 acceptance: "a fixture with three workers, one with every derived field null, draws three rows without an error".

`mods/factory-run/sections/agents.js`: one row each, narration in the dim color, the dot in the theme's working color when `alive`, muted otherwise.

**Acceptance:** at the checkpoint, the FR-5 row; `herdr-app status` shows no mod error with `workers-three` set.

### 3. Verify — medium — blocked by: 1, 2
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 4. Prove — at the checkpoint — blocked by: 3
`prd.md` § QA plan, row **FR-5**: case `workers-three` on a fixture run, screenshot of three rows, and the `.txt` beside it showing no `errors` in `status`.

**Acceptance:** after the checkpoint, the PNG and its `.txt` in this slice's Progress.
