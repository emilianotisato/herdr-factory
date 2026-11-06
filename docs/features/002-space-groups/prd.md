---
number: 002
slug: space-groups
title: "Space groups in the herdr-app sidebar"
type: feature
created: 2026-11-06
author: Emiliano Tisato
summary: |
  Spaces can be gathered under named, foldable group headers in the factory sidebar, the way the old herdr sessions grouped repos. A + on the Spaces header makes a group, dragging a space onto a header joins it, dragging a header sorts the groups, and a folded header shows one dot for the most urgent run or agent inside. Agreed 2026-11-06, nothing cut. Builds on PRD-001's cloned spaces mod, so it ships after PRD-001; needs a verify gate.
---

# PRD-002 — Space groups in the herdr-app sidebar

## 1. Why now

In the herdr TUI, a session held several repos at once, and the owner used that to group related work. Two of his ten sessions did (`~/.config/herdr/sessions/*/session.json`, read 2026-11-06): `acme` held `Initech/billing_app`, `Globex/acme-api` and `Initech/office_invoices`, and `globex` held `Globex/cloud` and `Globex/cloud_onprem`.

herdr-app has no session layer: one flat list of spaces per machine (`~/.config/herdr-app/AGENTS.md`, "The model"). The sidebar groups spaces only by machine (`grouped()`, `mods/spaces/main.js:299`) and nests a worktree under its main checkout (`ordered()`, `:258-296`).

*Corrected 2026-11-06 (adversarial pass): an earlier draft attached the two cites the other way round.* With every repo as its own space, related repos are no longer kept together.

Putting several repos in one space is possible today, since each tab can start in its own folder. It loses each repo's git tail, and PRD-001 maps runs to a space by its first terminal only, so the other repos' runs would show nowhere. That workaround lost.

Left alone: Herdr's right-click menu, the machine headers, worktree nesting.

## 2. Blast radius

- **Space order in the core.** Keeping a group's spaces together moves spaces with `space.move` (FR-3). The order lives in the machine's core document, so other windows on that machine see the new order and `alt-1..9` pick by it.
- **`shared.json` gains a `space.groups` key.** Other mods ignore it. It is per app home, so groups do not travel between the owner's two PCs; each PC has its own spaces anyway.
- **PRD-001's clone of the spaces mod grows.** Every re-clone after a Herdr update (PRD-001 FR-2) now re-applies groups too.

## 3. FR-1 — make, rename and delete a group

Today the Spaces header holds only a `+` that runs `space.new` (`mods/spaces/main.js`, `render()`).

**Decided 2026-11-06.** A second control on the Spaces header makes a group. It opens a name dialog, `factory-prompt`, built like Herdr's `prompt` mod (`mods/prompt/main.js`), which writes the group itself. A new group starts empty, on this machine. Clicking a group's name opens the same dialog to rename it, with a Delete button. Deleting a group moves its spaces back to the loose list and never closes a space. Groups are stored in `shared("space.groups")`, and ids of closed spaces are dropped from them the way `space.colors` drops them today (`mods/spaces/main.js:447-455`).

**Accepted cost:** our own dialog mod. Herdr's `prompt` runs an app command with the typed name, and no app command writes a group. The Spaces header gains a control even when no group exists, so PRD-001 FR-2's screenshot acceptance is amended to allow it (dated note there).

**Acceptance**: making a group named `acme` shows an empty `acme` header. Renaming it to `Initech` changes the header. Deleting it leaves its spaces open, in the loose list. Closing a space that was in a group removes its id from `shared.json` within 2 s. Herdr saves shared state in the background, so the file lags the render.

*Corrected 2026-11-06 (adversarial pass): an earlier draft said "on the next render", which the file never shows.*

## 4. FR-2 — join and leave by drag

Today a space drags to reorder within its machine. `on_mouse_down` records the space, `on_mouse_move` tracks the row under it, and `on_mouse_up` runs `space.move` (`mods/spaces/main.js:392-411`). Other machines' rows are not drop targets (`:396-402`).

**Decided 2026-11-06.** Dropping a space on a group header joins that group. Dropping a grouped space on a loose space's row leaves the group. A header highlights while a space is dragged over it. Where a drop lands is a pure function of what is dragged and what it is dropped on, kept apart from the mouse handlers so a unit test can pin every case below. A group belongs to one machine, and a space from another machine is not dropped on it. A worktree space goes where its main checkout goes and cannot be grouped on its own, since it is drawn under that checkout already.

**Accepted cost:** joining is not discoverable without trying. A menu entry lost because it means a second clone, of Herdr's 153-line `menu` mod, whose space items are fixed (`mods/menu/main.js:56-61`).

**Acceptance**: dragging `acme-api` onto the `acme` header moves it under that header. Dragging it back onto a loose row puts it back among loose spaces. Dragging a remote space onto a local group changes nothing. A worktree of `acme-api` follows it into the group.

## 5. FR-3 — order, and sorting the groups

**Decided 2026-11-06.** Loose spaces come first, in their current order, then the groups in the order the owner sets, each group's spaces in their current order. A new group goes last. Dragging a group header up or down moves the whole group. Dropped on another header, it lands on the side the accent line shows, as a dragged row does today (`mods/spaces/main.js:387-390`): above that group when dragged up, below it when dragged down. What is dragged decides the action: a space dropped on a header joins it (FR-2), a header dropped on a header moves the group. A press on a header without a move still folds it, and a click on its name still renames it. The group order is the order of the list in `shared("space.groups")`. The mod moves spaces with `space.move` until the core order matches the drawn order, as `ordered()` does for worktrees today (`mods/spaces/main.js:258-293`). Spaces in a folded group keep their place in that order, so `alt-1..9` still count them.

**Accepted cost:** a second drag mode in the sidebar, and `alt-3` can name a space hidden in a folded group. Skipping folded ones lost because the numbers would shift with every fold.

**Acceptance**: with two loose spaces and a group of two, `herdr-app ls` lists the spaces in drawn order, and `alt-3` selects the group's first space, folded or not. Dragging the lower `globex` header up onto `acme` puts `globex` above `acme` in the sidebar and in `shared.json`, and puts `globex`'s spaces before `acme`'s in `herdr-app ls`. The order survives a restart. `herdr-app ls` lists spaces only, never group names.

*Corrected 2026-11-06 (adversarial pass): an earlier draft said a header drop "goes before that group" whatever the direction, against the directional line rows use. It also expected `herdr-app ls` to show group order.* Pressing a header without moving folds it and moves nothing.

## 6. FR-4 — fold and the header's dot

Today a machine header folds with a chevron, remembered per screen in `localStorage` (`mods/spaces/main.js:67`, `:318-323`).

**Decided 2026-11-06.** A group header folds the same way, remembered per screen. It shows the group's name, its number of spaces, and one dot in the color of the most urgent thing inside. A space's agent status is ranked as Herdr ranks it, blocked > done > working > idle (`SpaceInfo.status`, `herdr.d.ts:127`). A factory run (PRD-001) counts as blocked when the owner is needed, its driver is dead or it failed, as done when shipped, and as working otherwise. No dot when nothing inside reports anything. In the narrow rail, a group shows only its dot.

**Accepted cost:** one dot cannot say which space inside needs you; unfolding does.

**Acceptance**: a folded group whose fixture run has an open BLOCK shows a dot in the theme's `blocked` color, in a screenshot. A unit test pins the ranking: each run state and each agent status maps as above, and the most urgent wins. Unfolded or folded, a fold survives an app restart.

## 7. Decisions log

- ~~Membership~~ — decided 2026-11-06: picked by the owner, by drag. Automatic grouping by parent folder lost: the `acme` session mixed Initech and Globex repos.
- ~~Header~~ — decided 2026-11-06: one dot, runs and agent status.
- ~~Create~~ — decided 2026-11-06: a control on the Spaces header and a name dialog.
- ~~Order~~ — decided 2026-11-06: loose spaces first, then groups. The groups' own order was first fixed to the order made, then changed the same day at the owner's request: he wants to sort them, by dragging a header. Alphabetical and up/down buttons lost.
- ~~The cut~~ — decided 2026-11-06: the one extra, the group dot in the narrow rail, kept.
- **Adversarial pass, 2026-11-06.** `factory review second`, grok-4.7-high, 995 s. Six breaks found, all corrected inline: two swapped cites, a clash with PRD-001 FR-2's screenshot acceptance, a `shared.json` timing claim, the header drop's landing side, `herdr-app ls` showing group order, and proof the harness cannot give for drags and the dialog. None rebutted.

## 8. QA plan

**Gate**: `make gate`, inner loop `make inner` (`docs/project.toml`).

*Corrected 2026-11-06 (slicing): an earlier draft said no gate was declared; PRD-001 built it.*
**Surface**: the herdr-app window.
**Harness**: PRD-001's `verify-herdr-factory`, built in its first slice. PRD-002 adds no harness slice. That harness drives commands and takes screenshots. It cannot click or drag: `herdr-app do` has no pointer commands, and this machine has no click tool (`wtype` types keys, `hyprctl` only moves the cursor; checked 2026-11-06). So the drop, order and ranking logic is proven by unit tests, the drawn result by screenshots of a seeded `shared.json`, and the gestures and the dialog by the owner.

*Corrected 2026-11-06 (slicing): PRD-001 built a click-and-type mode into that harness (its AD-11: a private X display, `bin/input.sh click|move|type|key`). It still cannot press and hold, so drags stay the owner's. The dialog can now also be driven by the harness, and slice 02 does so; the owner still judges its look.*

*Corrected 2026-11-06 (adversarial pass): an earlier draft marked FR-1 to FR-3 provable by the harness alone.*
**Seed state**: a scratch home with five spaces on fixture folders, a `shared.json` holding two groups, and PRD-001's fixture runs. No remote machine: the cross-machine drop is proven by unit test only.

| FR | Proof on the real surface | Evidence | Human? |
|---|---|---|---|
| FR-1 | run the groups unit tests; close a grouped space and read `shared.json` back; the owner makes, renames and deletes a group | test transcript, read-back | yes: the dialog |
| FR-2 | run the drop unit tests (join, leave, other machine, worktree); screenshot the seeded groups; the owner drags in and out | test transcript, PNG | yes: the gesture |
| FR-3 | run the order unit tests; `herdr-app ls` against the drawn order; `herdr-app do space.select --index 3`; restart; the owner drags a header | `ls` transcripts, `herdr-app status`, PNGs | yes: the header drag |
| FR-4 | run the ranking unit test; screenshot a folded group with a BLOCK fixture, light and dark; restart | test transcript, PNGs | yes: the look |

## 9. Slices

Three slices, built in order, because all three edit `mods/factory-spaces/main.js` and each needs the one before it.

- **01 — Groups drawn in order** (the spine): the `space.groups` store and its pure functions in `mods/factory-spaces/lib/groups.js`, loose spaces first then group headers, the core order kept equal to the drawn order, closed ids pruned, the header's name, count, fold and dot, and the rail's dot (FR-3's order, FR-4, FR-1's closed ids). Proven from a seeded `shared.json`.
- **02 — Make, rename and delete**: the `factory-prompt` dialog, the new-group control and the name click (FR-1). Needs 01's store and header.
- **03 — Drag to join, leave and sort**: one pure `drop()` and the handlers on rows and headers (FR-2, FR-3's header drag). After 02 because both put handlers on the same header, and the name click must keep renaming. The highest-risk slice, built last on a proven spine.

Checkpoints fall after 02 and after 03. One branch, `feat/space-groups`, one PR, one commit per slice, Prove at the checkpoints. `qa-guide.md` holds the owner's rows: the dialog's look, the drags, the header drag and the dot.

## 10. Non-goals

- **A "Move to group" menu entry.** Lost to drag, 2026-11-06: it needs a clone of Herdr's menu mod.
- **Groups made by folder.** Lost, 2026-11-06. Revisit if the owner finds himself grouping by folder every time.
- **Groups across machines, and groups synced between the two PCs.** Each machine has its own spaces.
- **Keys for groups** (next group, fold all). Not asked for.

## 11. Verification notes

Checked 2026-11-06 against herdr-app 0.1.13, on `feat/space-groups` stacked on `feat/factory-cockpit`. **Re-verify at slice entry**, and against PRD-001's clone rather than Herdr's `spaces`, once it exists.

- `~/.config/herdr/sessions/{acme,globex}/session.json` — the two sessions that held more than one repo.
- `mods/spaces/main.js:67`, `:166`, `:318-323` — machine headers fold with `localStorage` key `machines.folded`.
- `mods/spaces/main.js:258-296` — `ordered()` nests worktrees and calls `space.move` until the core order matches.
- `mods/spaces/main.js:392-411` — drag to reorder; `:396-402` ignores rows on another machine; `:387-390` draw the accent line on the bottom edge when dragging down, the top edge when dragging up.
- No pointer driver: `herdr-app do` has no click or drag command, and `ydotool` is absent (2026-11-06).
- `mods/spaces/main.js:447-455` — `space.colors` drops ids of closed spaces in `render()`.
- `mods/menu/main.js:56-61` — the space menu's items are fixed: Rename, worktree actions, Close.
- `mods/prompt/main.js` — `submit()` runs `props().command` with the typed name; nothing else.
- `herdr.d.ts:127` — `SpaceInfo.status`, ranked blocked > done > working > idle.
