# Slice 03 — Drag to join, leave and sort

**Source**: [`prd.md`](prd.md) → §4 FR-2, §5 FR-3 (the header drag). **Depends on**: 02 (same header element: the name click 02 adds must keep renaming once this slice puts a drag on the header)
**Created**: 2026-11-06

**Progress**:
- **Built**: `drop(groups, dragged, target, facts)` in `mods/factory-spaces/lib/groups.js` (`facts.from`: the group the dragged space is drawn in) with 13 tests in `tests/groups.test.js`: join, join from another group, leave, a header dragged down and up, and every no-op (remote space, worktree, header on a row, loose on a grouped row, grouped on another group's row, a drop inside one container, a space on its own header, a header on itself or another machine's header). In `main.js` the header has its own drag state (`pressedHead`, `overHead`), so a row never reads a group id; it folds on release on itself, shows the accent line on the landing side while another header is over it, and an accent outline while a space would join it. A row drop inside one container keeps `space.move`; across containers only `drop()` writes the store. The name click clears the drag and renames. `endDrag()` clears both drags on any release.
- **Inner loop**: 1 run, 0 red, 0.1 min.
- **Deviations**: AD-5 (decide) the two row drops the PRD does not name do nothing; AD-6 (fyi) a joined or left space keeps its core place, and a leave target shows an outline, not the reorder line.
- **Prove** (checkpoint 2, run cp2, private X): FR-2 — cp-2/drop-unit-tests.txt, cp-2/groups-seeded-ls.txt, cp-2/groups-seeded-dark.png, cp-2/join-docs-acme-ls.txt, cp-2/join-docs-acme-dark.png, cp-2/leave-shop-loose-ls.txt, cp-2/leave-shop-loose-dark.png; the drag in and out stays the owner's.
- **Prove** (checkpoint 2, run cp2, private X): FR-3 — cp-2/order-unit-tests.txt, cp-2/order-globex-above-acme-ls.txt, cp-2/order-globex-above-acme-dark.png, cp-2/order-restart-kept-ls.txt, cp-2/order-restart-kept-dark.png, cp-2/header-click-folds.txt, cp-2/header-click-folded-dark.png, cp-2/header-name-click-renames.txt, cp-2/header-name-click-rename-dialog-dark.png; the header drag stays the owner's.

**Slice**: A space dropped on a group header joins that group; a grouped space dropped on a loose row leaves it; a header dragged onto another header moves the whole group, landing on the side the accent line shows. Where every drop lands is one pure function, pinned by unit tests, because the harness cannot drag.

**Highest risk**: the whole slice. Two drag modes share the sidebar's press, move and release handlers, a header press must still fold and its name click still rename, and the core order is rewritten by slice 01's move loop after every change.

## Current code / environment

Line numbers are `mods/factory-spaces/main.js` on `main` after PRD-001; slices 01 and 02 add the group header (`group-<id>`) and its fold and name click. Re-read them at slice entry.

- **The row drag** `row()` `:474-496`: `on_mouse_down` sets `this.pressed = w.id` and `this.over`; `on_mouse_move` sets `this.over` only when the pressed space is on the same machine (`:479-480`); `on_mouse_up` runs `space.move` when released over another row, or `space.select` when released on itself. The scroll container clears `this.pressed` on any release (`:604`). A group drag needs its own pressed state so a row's handlers never read a group id as a space id.
- **The accent line** `:469-473`: drawn on the bottom edge when the dragged row came from above (`fromIndex < i`), the top edge when from below. §5: a header dropped on a header "lands on the side the accent line shows … above that group when dragged up, below it when dragged down". Use the same rule with group indices.
- **Slice 01's move loop** (`ordered()`): after any change to `space.groups`, it moves spaces until the core matches the drawn order. So a join, leave or group move writes only the store; it never calls `space.move` itself. **The trap**: today's row drop calls `space.move` (`:493`). A row drop across a group boundary would be undone by the loop on the next render, and the row would jump back. Only a drop inside one container (loose to loose, or within one group) keeps today's move.
- **Not in the PRD**: a loose space dropped on a grouped space's row, and a grouped space dropped on a row of another group. §4 names only "on a group header joins" and "a grouped space on a loose space's row leaves". Make both of these do nothing and log it with `factory docs log add 002 --kind decision --slice 3` and the `decide` flag, so the owner reviews it.
- **Worktrees** (§4): "A worktree space goes where its main checkout goes and cannot be grouped on its own." A worktree row (`tree` set, `:504`) dropped on a header does nothing.
- **Machines** (§4): "A group belongs to one machine, and a space from another machine is not dropped on it." Same check as `:479-480`, against the group's `machine`.
- **Fold and rename on the header** (slice 01, 02): §5: "A press on a header without a move still folds it, and a click on its name still renames it." Fold on release without a move, not on press, or every header drag folds the group it started on.
- **No pointer drag in the harness**: `bin/input.sh` has `click` and `move`, no press-and-hold (`bin/xdrive.c`), and `herdr-app do` has no pointer command. The gestures are the owner's (prd §8, `Human? yes`).
- **Not handled** (prd §10): no "Move to group" menu entry. Do not add one.

## Tasks

### 1. Where a drop lands, as one pure function — high — blocked by: —
**Source**: §4 FR-2: "Where a drop lands is a pure function of what is dragged and what it is dropped on, kept apart from the mouse handlers so a unit test can pin every case below." §5: "What is dragged decides the action: a space dropped on a header joins it (FR-2), a header dropped on a header moves the group." "above that group when dragged up, below it when dragged down."

`mods/factory-spaces/lib/groups.js`. `drop(groups, dragged, target, facts)` → the new store, or `null` for no change. `dragged`: a space (id, machine, worktree or not) or a group; `target`: a group header or a space row (with its group, or loose); `facts` carries whatever the function needs and cannot read itself. Cases: space on header joins (and leaves any other group); grouped space on loose row leaves; group on group moves it before or after by direction; remote space on local group, worktree on header, group on a row, and the two cases the PRD does not name: `null`.

**Acceptance:** `tests/groups.test.js` has one test per case above, including both directions of a header move, and asserts the store is unchanged (`null`) for every no-op.

### 2. Space drags join and leave — high — blocked by: 1
**Source**: §4 FR-2: "Dropping a space on a group header joins that group. Dropping a grouped space on a loose space's row leaves the group. A header highlights while a space is dragged over it."

`mods/factory-spaces/main.js`: the group header becomes a drop target for a pressed space (highlight while over it); on release, `drop()` decides and the result is written with `setShared("space.groups", …)`. Row drops inside one container keep today's `space.move`.

**Acceptance:** with the store set as a join would set it, `herdr-app ls` and the sidebar show the space under the header after slice 01's loop settles; the unit tests of task 1 hold the drop decisions.

### 3. Header drags sort the groups — high — blocked by: 1
**Source**: §5 FR-3: "Dragging a group header up or down moves the whole group." "A press on a header without a move still folds it, and a click on its name still renames it."

`mods/factory-spaces/main.js`: a press on a header starts a group drag; moving over another header shows the accent line on the landing side; release there writes `drop()`'s store. Release on the same header without a move folds it; the name click from slice 02 keeps renaming.

**Acceptance:** with the store reordered as a header drop would set it, `globex`'s spaces come before `acme`'s in `herdr-app ls` and the order survives `bin/restart.sh`; clicking a header with `bin/input.sh click` still folds it, and clicking its name still opens the rename dialog.

### 4. Verify — medium — blocked by: 1, 2, 3
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 5. Prove — at the checkpoint — blocked by: 4
`prd.md` § QA plan:

- **FR-2**: run the drop unit tests (join, leave, other machine, worktree); screenshot the seeded groups. The drag in and out is the owner's, in `qa-guide.md`.
- **FR-3**: run the order unit tests; with `globex` moved above `acme` in the store, `herdr-app ls` against the drawn order; restart, `ls` again; `bin/input.sh click` on a header folds it. The header drag is the owner's, in `qa-guide.md`.

**Acceptance:** after the checkpoint, each row has its transcript or PNG in this slice's Progress.

**Code-review fixes (2026-11-06).**
- A header drag let go outside the list (on the Spaces title bar, another pane, or outside the window) left `pressedHead` set. The next space drag then read as a header drag and moved a group instead of the space. Now every press on a row or a header clears any earlier drag first (`endDrag()`).
- A header dragged away and back onto itself folded on release. Now it folds only if the press never left its own header (`strayed`), which is what "a press on a header without a move" means.
- `drop()` tests added for gaps the second opinion found: every group's name and machine survive a drop, a space listed in two groups leaves both when it joins or leaves, and a space on another machine joins that machine's group.
