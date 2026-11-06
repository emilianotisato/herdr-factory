# Slice 01 — Groups drawn in order

**Source**: [`prd.md`](prd.md) → §5 FR-3 (the order, not the header drag), §6 FR-4, §3 FR-1 (closed ids leave a group). **Depends on**: — (the spine: slices 02 and 03 both build on the store, the header row and the order this slice lands)
**Created**: 2026-11-06

**Progress**:
- **Built.** `mods/factory-spaces/lib/groups.js` has four parts:
  - `readGroups()` makes any stored value into a valid list. An entry without a string id is dropped, a repeated group id keeps its first entry, and a space id repeated inside one group is kept once.
  - `prune()` drops the ids of closed spaces and reports whether anything changed.
  - `arrange(units, groups)` returns the drawn order: loose spaces first, then each group's header (`size` = the spaces drawn under it) and its members in their current order, each member's worktrees right after it. A space listed in two groups belongs to the first. A space listed in a group of another machine stays loose. A worktree listed on its own is ignored.
  - `groupDot()` gives the header's dot.

  `tests/groups.test.js` has 15 tests, and `groups.js` is at 100% line coverage. In `main.js`:
  - `ordered()` builds units (a checkout plus its worktree kids) and feeds them to `arrange()`. The existing `space.move` loop targets only the rows, never the headers. It returns headers among the rows, and each row carries its `group`.
  - `grouped()` draws each machine's block from those items: loose rows, then each group's header and members. A folded group's members are skipped when drawing but stay in the move target.
  - `groupHead()` draws the header (`group-<id>`): name, count, dot, chevron. A click folds it, stored under `localStorage` key `groups.folded`. In the rail it shows only the dot.
  - `render()` prunes `space.groups` next to `space.colors`.
- **Inner loop:** 1 run, 0 red, under 1 min (4 s). The format tier rewrapped the two new files.
- **Decisions:** AD-1 (what the header count counts) and AD-2 (a group's row in the narrow rail), both fyi.
- **Left for the checkpoint (task 6):** FR-3 `ls`/`space.select --index 3`/restart transcripts, FR-4 screenshots (folded BLOCK dot light and dark, narrow rail, fold kept after restart), FR-1 closed-id prune read back from `shared.json`.
- **Checkpoint 1, FR-3:** proven. Unit tests: `cp-1/groups-unit-tests.txt`. Seeded `acme`/`globex` drawn: `cp-1/groups-drawn-order-dark.png`. `ls` matches the drawn order, and `space.select --index 3` selects `acme`'s first space both unfolded (`cp-1/order-ls-select-unfolded.txt`) and folded (`cp-1/order-ls-select-folded.txt`). After a restart: `cp-1/restart-order-fold-kept.txt`. A defect found here and fixed: the first render after a start pruned every group before the core had listed its spaces (`cp-1/restart-groups-emptied-before-fix.txt`). `prune()` now skips machines whose spaces have not loaded.
- **Checkpoint 1, FR-4:** proven. Ranking tests: `cp-1/groups-unit-tests.txt`. Folded `acme` (fixture run 004 with an open BLOCK) shows a blocked dot in `cp-1/group-folded-block-dot-dark.png` and `cp-1/group-folded-block-dot-light.png`. Narrow rail: `cp-1/group-folded-narrow-rail-dark.png`. The fold is kept after a restart: `cp-1/restart-fold-kept-dark.png`.
- **Checkpoint 1, FR-1 closed ids:** proven. After `space.close` the ids leave `shared.json` within 2 s (89 ms timed): `cp-1/close-grouped-space-shared-readback.txt`.

**Slice**: Groups written into `shared("space.groups")` are drawn: loose spaces first, then one header per group with its spaces under it, and the core's space order follows the drawn order so `alt-1..9` match it. A header shows the group's name, its number of spaces, a fold chevron and one dot for the most urgent thing inside; in the narrow rail it shows only the dot. Closed spaces drop out of their group. Nothing yet writes a group except a seeded `shared.json`: making one is slice 02, joining and sorting by drag is slice 03.

**Highest risk**: task 3. `ordered()` already moves spaces with `space.move` until the core order matches; a wrong target order makes it fight itself, moving spaces every render.

## Current code / environment

All line numbers are `mods/factory-spaces/main.js` on `main` after PRD-001 (the PRD's cites are Herdr's own `mods/spaces/main.js`, before the run strips moved them).

- **`main.js` is a cloned file**: it is listed in `.prettierignore`'s cloned section, so it skips the format and strict types tiers, and the 90% coverage floor covers `mods/*/lib/**` only (`scripts/gate/test.sh`). Put every decision (store shape, order, drop of closed ids, ranking) in a new `mods/factory-spaces/lib/groups.js` with its tests in `tests/groups.test.js`; `main.js` stays glue. `docs/reference/verification.md` "Where code goes".
- **`ordered()` `:337-374`**: builds `out` (each worktree right after its main checkout via `nested()` `:343` and `kids` `:351-352`), then replays `space.move` until `sp` order equals `out` order (`:356-372`), retrying through `orderingDue()` `:331-334`. The group order slots in where `out` is built: the same move loop then keeps the core in drawn order. Keep a group member's worktree kids right after it, so a worktree goes where its checkout goes (§4).
- **Rows carry `i`, their index in `spaces()`** (`:341`). `compact()` prints `i + 1` as the rail number (`:578`) and `row()` compares it for the drag line (`:471-472`). Once the move loop settles, `i` equals the drawn index; do not renumber by hand.
- **`grouped()` `:377-426`**: splits rows by machine; with no remote machine it returns `rows.map(draw)` (`:389`). A group belongs to one machine (§4), so its header and members are drawn inside that machine's block, after that machine's loose rows. The machine header is the pattern for the group header: `h_flex` at `h(26)`, chevron svg `mods/workspace-chrome/chevron-{right,down}.svg` (`:418`), click to fold (`:400-404`).
- **Machine folds**: `this.folded` from `localStorage` key `machines.folded` (`:74`), written on click (`:402`). Group folds are a separate key (e.g. `groups.folded`) of group ids: a group id must never collide with a machine name in one set. Per screen, as §6 says.
- **A folded group's spaces stay in `out`** and so in the core order (§5: "Spaces in a folded group keep their place in that order, so `alt-1..9` still count them"); they are only not drawn. Do not drop them before the move loop.
- **`render()` `:589-597`** drops closed ids from `space.colors` and calls `setShared` when anything changed. Drop closed ids from `space.groups` the same way, in the same place (§3). Herdr saves `shared.json` in the background, so the file lags the render (§3, corrected).
- **The dot's run half**: `this.lanes[w.id]` (`:380`) holds each space's undismissed strips, each with `state` (`owner`, `dead`, `failed`, `parked`, `paused`, `building`, `shipped`; `lib/runs.js` `strip()` `:283`). **The trap**: do not reuse `urgent()` or `TONE` (`lib/runs.js:47-55`, `:382-384`) for the group dot. They give `muted` for parked and paused; §6 says a run counts as blocked when the owner is needed, its driver is dead or it failed, as done when shipped, and as working otherwise, so parked and paused are working here.
- **The dot's agent half**: `SpaceInfo.status`, ranked blocked > done > working > idle, or null (`~/.config/herdr-app/herdr.d.ts:127-128`). Colors come from the theme by name (`t[status]`, as `tone()` `:51-53` does).
- **The rail**: `compact()` `:568-581` draws a space as number, run dot, status glyph. §6: "In the narrow rail, a group shows only its dot."
- **No remote machine in the harness**: the scratch window has only this computer (`.claude/skills/verify-herdr-factory/SKILL.md`). A group's machine is proven by unit test.
- **Seeding `shared.json`**: space ids exist only after `space.new`, and the app writes `shared.json` itself in the background. Seed by creating the spaces, then writing `space.groups` while the window is stopped: `bin/restart.sh <run>` stops and starts it on the same home and core (AD-11 of PRD-001). Verify the app does not overwrite the seed on start.
- **Not handled** (prd §10): no keys for groups, no groups across machines or synced between PCs. Do not add them.

## Tasks

### 1. The groups store and the drawn order, as pure functions — high — blocked by: —
**Source**: §5 FR-3: "Loose spaces come first, in their current order, then the groups in the order the owner sets, each group's spaces in their current order. A new group goes last." "The group order is the order of the list in `shared(\"space.groups\")`." §3 FR-1: "ids of closed spaces are dropped from them the way `space.colors` drops them today."

`mods/factory-spaces/lib/groups.js`, `tests/groups.test.js`. The store is the list in `shared("space.groups")`: `[{ id, name, machine, spaces: [spaceId…] }]`, `machine` null for this computer, list order = group order. Export: a reader that turns whatever is stored (missing, not a list, junk entries) into a valid list; `prune(groups, liveIds)` that drops ids of closed spaces and reports whether anything changed; and `arrange(rows, groups)` that takes `ordered()`'s rows (with `w.id`, `w.machine`, and which rows are worktree kids of which main) and returns the drawn sequence: loose rows first, then each group's header followed by its member rows in their current order, each member's worktree kids right after it. A space id listed in two groups belongs to the first. A worktree id listed in a group is ignored (§4: a worktree "cannot be grouped on its own").

**Acceptance:** `tests/groups.test.js` asserts: two loose spaces and a group of two arrange as loose, loose, header, member, member; group order follows list order; a member's worktree follows it into the group; a closed id is pruned and `changed` is true, nothing closed gives `changed` false; a junk store reads as an empty list.

### 2. The header's dot, ranked — high — blocked by: —
**Source**: §6 FR-4: "one dot in the color of the most urgent thing inside. A space's agent status is ranked as Herdr ranks it, blocked > done > working > idle … A factory run (PRD-001) counts as blocked when the owner is needed, its driver is dead or it failed, as done when shipped, and as working otherwise. No dot when nothing inside reports anything." Acceptance: "A unit test pins the ranking."

`mods/factory-spaces/lib/groups.js`. `groupDot(statuses, runStates)` → `"blocked" | "done" | "working" | "idle" | null`.

**Acceptance:** a test maps every run state (`owner`, `dead`, `failed` → blocked; `shipped` → done; `parked`, `paused`, `building` → working) and every agent status, checks the most urgent of a mix wins, and that no status and no run gives null.

### 3. Draw the groups and keep the core in drawn order — high — blocked by: 1
**Source**: §5 FR-3: "The mod moves spaces with `space.move` until the core order matches the drawn order, as `ordered()` does for worktrees today." "Spaces in a folded group keep their place in that order, so `alt-1..9` still count them." §3 FR-1 acceptance: "Closing a space that was in a group removes its id from `shared.json` within 2 s."

`mods/factory-spaces/main.js`: `ordered()` builds `out` through `arrange()`, so the existing move loop targets the drawn order; `grouped()` draws each group's header and members inside its machine's block after the loose rows; `render()` prunes `space.groups` next to `space.colors`. Header rows are not spaces: keep them out of the `space.move` target list.

**Acceptance:** with a seeded store, `herdr-app ls` lists spaces in drawn order and stays put across two renders (no move loop); closing a grouped space drops its id from `shared.json` within 2 s.

### 4. The header: name, count, fold, dot, and the rail — high — blocked by: 2, 3
**Source**: §6 FR-4: "A group header folds the same way, remembered per screen. It shows the group's name, its number of spaces, and one dot … In the narrow rail, a group shows only its dot."

`mods/factory-spaces/main.js`. A group header row in the machine header's style: name, count, dot from `groupDot()` over its members' `w.status` and `this.lanes[...]` strip states, chevron; a press folds and unfolds it, stored in its own `localStorage` key. Folded, its members are not drawn but stay in `out`. In `compact()` mode a group draws one row with only its dot. Give the header an element id (`group-<id>`) so slices 02 and 03 can hang the name click and the drag on it.

**Acceptance:** a folded header with a fixture run that has an open BLOCK draws a dot in the theme's `blocked` color; a fold survives `bin/restart.sh`.

### 5. Verify — medium — blocked by: 1, 2, 3, 4
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 6. Prove — at the checkpoint — blocked by: 5
`prd.md` § QA plan, the parts this slice can show (seed: five spaces on fixture folders, two groups written into `shared.json` with the window stopped, PRD-001's fixture runs):

- **FR-3**: run the order unit tests; `herdr-app ls` against the drawn order; `herdr-app do space.select --index 3` with the group folded and unfolded, then `herdr-app status`; restart, `ls` again. (The header drag is slice 03.)
- **FR-4**: run the ranking unit test; screenshot a folded group whose fixture run has an open BLOCK, light and dark; screenshot the narrow rail; restart and screenshot the fold kept.
- **FR-1, closed ids**: close a grouped space with `herdr-app do`, read `shared.json` back within 2 s.

**Acceptance:** after the checkpoint, each row has its transcript or PNG in this slice's Progress.
