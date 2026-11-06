# Slice 02 — Make, rename and delete a group

**Source**: [`prd.md`](prd.md) → §3 FR-1. **Depends on**: 01 (the store, its reader and the `group-<id>` header this slice hangs the name click on)
**Created**: 2026-11-06

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: The owner can make a group from a control on the Spaces header, rename it by clicking its name, and delete it from the same dialog, without seeding `shared.json`. The dialog is our own mod, `factory-prompt`, built like Herdr's `prompt`, and it writes the group itself. Joining a group is still slice 03's drag.

## Current code / environment

- **Herdr's `prompt` mod** (`~/.config/herdr-app/mods/prompt/main.js`, 50 lines): an `InputState` with Enter to submit and Esc to cancel, Cancel and Save buttons, and `submit()` closes the overlay then runs `props().command` with `{ name }`. §3: "Herdr's `prompt` runs an app command with the typed name, and no app command writes a group", so the clone writes `shared("space.groups")` with `setShared` instead of running a command. Its look (popover background, label, accent border on focus, buttons) is the pattern; copy it, do not import it.
- **Our existing dialog mod** `mods/factory-answer/` (PRD-001) is the house pattern: `main.js` glue, a pure `lib/answer.js` with its test, `mod.json` `{ "place": "none", "title": … }`, the `colors` cast for strict types (`mods/factory-answer/main.js:13`, `docs/reference/verification.md`). It is not a cloned file, so it gets the format and strict types tiers; so will `factory-prompt`.
- **Opening a dialog**: `openOverlay({ mod, kind: "dialog", modal: true, width, height, props })`, as `answer()` does (`mods/factory-spaces/main.js:563-565`); the dialog closes itself with `closeOverlay(props().overlay)`.
- **The Spaces header** `render()` `mods/factory-spaces/main.js:599-602`: "Spaces", then one 26 px `+` (`space-new`) that runs `space.new`. §3: "A second control on the Spaces header makes a group." In the narrow rail only the `+` shows (`:600`).
- **The store** is slice 01's: `shared("space.groups")`, a list of `{ id, name, machine, spaces }`, list order = group order, a new group last (§5). Its reader lives in `mods/factory-spaces/lib/groups.js`. A mod importing another mod's file by relative path is unproven here: try it under `herdr-app check` and in the window; if it does not load, keep make/rename/delete in `mods/factory-prompt/lib/` with their own tests, and log the choice as a decision.
- **`install.sh` installs every `mods/factory-*/`** (`install.sh:22`) and owns them through its manifest, so a new mod needs no install change. `tests/install.test.js:12` lists installed paths for its own fixture; extend it only if a test there names every mod.
- **PRD-001 FR-2's screenshot acceptance** was amended by this PRD to allow the new-group control (`docs/features/001-factory-cockpit/prd.md` §5, dated note).
- **The harness can click and type** in a scratch window launched with `VERIFY_HERDR_INPUT=x11` (`bin/input.sh`: `click X Y`, `type TEXT`, `key Return`; PRD-001 AD-11). It has no press-and-hold, so it cannot drag.

## Tasks

### 1. Make, rename and delete, as pure functions — high — blocked by: —
**Source**: §3 FR-1: "A new group starts empty, on this machine." "Deleting a group moves its spaces back to the loose list and never closes a space." §5: "A new group goes last."

`make(groups, name)`, `rename(groups, id, name)`, `remove(groups, id)` returning the new list; a new group gets a fresh id, `machine: null`, `spaces: []`, at the end. A blank or whitespace-only name is refused (the dialog's Save stays disabled), as `canSend` does in `mods/factory-answer/lib/answer.js`.

**Acceptance:** tests assert a made group is last, empty, local and has an id no other group has; rename changes only that group's name; remove drops the group and leaves every other group and list order untouched; a blank name is refused.

### 2. The `factory-prompt` dialog — high — blocked by: 1
**Source**: §3 FR-1: "It opens a name dialog, `factory-prompt`, built like Herdr's `prompt` mod (`mods/prompt/main.js`), which writes the group itself." "Clicking a group's name opens the same dialog to rename it, with a Delete button."

`mods/factory-prompt/{main.js,mod.json}`. Props: `{ group?: { id, name } }`. No group: title "New group", Save makes one. A group: title "Rename group", the name prefilled and selected (as `prompt` does with `value`), Save renames, and a Delete button removes the group. Each writes with `setShared("space.groups", …)` and closes. Enter saves, Esc cancels.

**Acceptance:** `herdr-app check` passes on the new mod; in the scratch window, the dialog opens for both cases (screenshot).

### 3. The new-group control and the name click — high — blocked by: 2
**Source**: §3 FR-1: "A second control on the Spaces header makes a group." "Clicking a group's name opens the same dialog to rename it." §5: "a click on its name still renames it" (slice 03 keeps this working when it adds the header drag).

`mods/factory-spaces/main.js`: a second control beside `space-new` (id `group-new`) opening `factory-prompt` with no group; on the `group-<id>` header, a click on the name opens it with that group. A click on the name must not also fold the header: stop propagation, as the strip's controls do (`:544-545`).

**Acceptance:** clicking `group-new`, typing `acme` and pressing Return draws an empty `acme` header; clicking `acme` and saving `Initech` renames it; Delete removes the header and its spaces return to the loose rows, still open in `herdr-app ls`.

### 4. Verify — medium — blocked by: 1, 2, 3
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 5. Prove — at the checkpoint — blocked by: 4
`prd.md` § QA plan, **FR-1**: run the groups unit tests; in a scratch window launched with `VERIFY_HERDR_INPUT=x11`, make `acme` through `group-new`, rename it to `Initech`, delete it, with a screenshot after each and `shared.json` read back; close a grouped space and read `shared.json` back. The owner's look at the dialog stays a human row in `qa-guide.md`.

**Acceptance:** after the checkpoint, each step has its PNG or read-back in this slice's Progress.
