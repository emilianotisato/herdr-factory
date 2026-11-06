# Slice 03 — Runs on their spaces: the data and the strip

**Source**: [`prd.md`](prd.md) → §3 (the fields), §6 FR-3, §7 FR-4. **Depends on**: 02 (it edits the `factory-spaces` clone 02 creates)
**Created**: 2026-11-06

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: Each repo's space row shows its factory runs: one strip per run, in every state of FR-4's table, light and dark, with the narrow-rail dot. The data comes from one `factory status --json --recent` call per tick, mapped to spaces by git top level. Alerts, the Answer dialog and dismissing are slices 04 and 05; this slice draws the Answer and × controls as inert placeholders only where the table shows them, or leaves them out.

**Highest risk**: the row's height. Everything about the sidebar (drag targets, worktree rows, the reorder echo) assumes fixed row heights today.

## Current code / environment

- **The fields**, factory 0.13.0 (prd §15): per run `id, feature, phase, line, owner, board, repo, branch, slug, title, startedAt, updatedAt, elapsedSeconds, seq, slices [{n, status}], budget {used, limit}, checkpoints {done, lastGate}, pr, ci, pausedUntil, parked, driverDead, stopped, questions [{id, at, n, text, answer}]`; envelope `{schema: 1, factory, runs}`. `slices` is null when the board will not open. `ci` is `green`, `red`, `pending`, `none` or null.
- **"Too old" is a version check, not a schema check**: `schema` is 1 before and after 0.13.0 (prd §6). Compare the envelope's `factory` against 0.13.0.
- **`seq` counts events only** (prd §3, shipped note): budget, PR and pause change `state.json` with no event. Redraw from the whole payload every poll; never skip a poll on an unchanged `seq`.
- **Mapping is by top level, not common dir** (prd §6, corrected 2026-11-06). `check()` already runs `git rev-parse --show-toplevel` (`mods/spaces/main.js:212`) but keeps only `repo` (the common dir), `name`, `branch`, `ahead`, `behind`, `linked` in `this.git[key]` (`:216`). Keep the top level there too. A lane or other worktree has its own top level, so its row never matches a run.
- **Fixed row heights**: `rowHeight()` returns 28 or 30 (`mods/spaces/main.js:28`) and `row()` sets `.h(rowHeight({ tree }))` (`:380`). A space with runs needs a taller row. The drag code (`:392-411`) reads rows by id, not position, so a taller row keeps working; check the accent line still lands on the right edge.
- **The narrow rail**: `compact()` (`:427`) draws index and glyph only. FR-4's rail dot goes there.
- **The factory command comes from props**: `props()?.factory ?? "factory"` (prd §12). The harness's scratch layout names its wrapper there. `exec(command, args, { cwd? })` has a 30 s limit (`herdr.d.ts:13`).
- **Instant refresh** (kept at the cut): `watchFolder(path)` on factory's runs folder (`herdr.d.ts`, last export). Mods have `home()` but no environment, so the folder is `home() + "/.local/share/factory/runs"`. When it does not exist, the 10 s poll is all there is. Poll only while `window().active`, as the spaces mod's own fallback does (`due()`, `window().active`).
- **Theme colors need one cast** in strict code (`docs/reference/verification.md`, "Theme colors"). The cloned `main.js` is exempt from strict types; the new `lib/` files are not.
- **Where the code goes**: the parsing, mapping, state classification and strip model are pure functions in `mods/factory-spaces/lib/`, covered at 90% (`docs/reference/verification.md`). `main.js` calls them and draws.
- **Recorded payloads for the tests**: write them from factory 0.13.0's real output shape into `tests/fixtures/`, with fixture paths, never the owner's repo names.

## Tasks

### 1. The run model — high — blocked by: —
**Source**: §6 FR-3: "A run belongs to the space whose git top level … equals the run's repo."; "When `factory` is older than the release of §3, each space with a repo shows one dim line". §7 FR-4's table.

`mods/factory-spaces/lib/`: parse the envelope; tell a missing or too-old factory apart from a good payload; map runs to space ids by top level; classify each run into FR-4's states (building, owner needed, paused, parked, driver dead, shipped, failed, in the table's top-down order) and build what each strip line shows: title, `n/m`, segment colors by theme name, phase, elapsed, budget fraction, last gate, PR number and CI.

**Acceptance:** unit tests over recorded payloads: each FR-4 state classifies as the table says; a run maps only to the space with its top level, never a worktree of it; `factory` 0.12.0 yields the too-old state; a run with `slices: null` draws no segment bar; elapsed prints `12m` and `1h 02m` forms.

### 2. Poll and refresh — high — blocked by: 1
**Source**: §6 FR-3: "runs `factory status --json --recent` once every 10 s while the window is in front, and once at once when anything changes under factory's runs folder". Instant refresh kept at the cut.

In the cloned `main.js`: keep the top level in `this.git`, run the call on a 10 s timer while the window is active and after every `watchFolder` batch, one call at a time. A missing `factory` draws nothing and logs nothing visible.

**Acceptance:** appending a `slice_blocked` event to a fixture run moves its strip to owner needed within 2 s (driven at the checkpoint); a unit test pins that the too-old line is shown only for spaces that have a repo.

### 3. Draw the strip and the rail dot — high — blocked by: 1
**Source**: §7 FR-4, the table, the gauge and dot, the theme colors, the rail dot, and "fixture runs in each state of the table render as the table says, at zoom 1 in a 268 px sidebar, without the slice bar truncating at 10 slices".

Under the space's name in `row()`, one strip per run, from task 1's model. Theme color names only (`done`, `working`, `blocked`, `dim` and the rest of `theme()`). In `compact()`, one dot in the most urgent run's color.

**Acceptance:** at the checkpoint, every FR-4 state renders as the table says in a light and a dark theme.

### 4. Verify — medium — blocked by: 1, 2, 3
`make inner` _(the inner loop; the full gate runs at this slice's checkpoint)_

**Acceptance:** inner loop green, one commit.

### 5. Prove — at the checkpoint — blocked by: 4
§12 QA plan rows **FR-3** (two fixture repos opened as spaces; append an event: PNGs before and after, timing) and **FR-4** (one fixture run per state, light and dark: 14 PNGs; **human**: the look, in `qa-guide.md`).

**Acceptance:** after the checkpoint, both rows have their evidence in Progress.
