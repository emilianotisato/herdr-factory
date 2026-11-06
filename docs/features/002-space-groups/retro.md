# Retro — PRD-002

Written by `/deliver` in the closeout commit, from the agent's side of the run.

**The point is cost next to catch.** An agent asked only about friction votes to cut every check, because every check costs it time. A verdict with an empty Caught column is a preference, not evidence.

## Cost vs catch

| Step | Cost | Caught | Verdict |
|---|---|---|---|
| Inner loop, per slice | 1 run per slice, a few seconds each | nothing: no red run | keep. It is seconds, and it runs `herdr-app check`, which refused a sibling-mod import in slice 02 before any test ran (AD-3) |
| Checkpoints (full gate) | 1 run at each checkpoint, about 5 s | nothing: no red run | keep. Cheap enough that cutting it saves nothing |
| Prove, at checkpoints | the costliest step: a scratch window, seeded stores and restarts, twice | CP-1: on every start, the window emptied every group. `render()` pruned the groups before the core had listed any space. No unit test or gate tier could see it | keep |
| Polish — local review | one forked code-review pass | the high defect: with a remote machine, `arrange()` aimed grouped spaces outside their machine's block of the core order, so the `space.move` loop never settled. Also a stale header drag that moved a group instead of a space, an empty machine block losing its "New space there" row, and a drag away and back that folded a header | keep |
| Polish — security pass | skipped | the diff touches no auth, shell, path or outside input. The only input is a typed group name, drawn as text into a local store | keep the skip rule as it is |
| Polish — UX pass | read the 18 checkpoint screenshots, no new drive | nothing to fix. The dialog's empty band under its buttons goes to the owner's QA row 3 | tune: in this repo, reading the checkpoint PNGs is the UX pass. Run it again only for states the checkpoints did not capture |
| Polish — second opinion (grok-4.7-high) | 3 passes, about 44 min | found the same high defect on its own in two passes. That cross-vendor agreement is what ranked it first. It also found test gaps (names surviving a drop, a space listed in two groups, a remote join), now covered. One claim, that a click on a group's name folds the group, was rebutted by CP-2's read-back | keep |
| prune | one read of 40 scoped tests, 3 runs | nothing to prune | keep. Cheap at PR scope |

## Where I guessed

- `slice-01-groups-drawn-in-order.md` asked for the order per machine block. `arrange()`'s contract never said where a group's header goes when its machine has no spaces. I put such groups after every machine that has units, in list order. That position is never drawn, because `grouped()` draws each machine block on its own.
- `/ux` review mode assumes a web app (a 375 px viewport, an accessibility tree, `terminal-browser`). This is a GPUI desktop window with no accessibility tree. I judged the screenshots against Herdr's own dialog and machine headers, and said the review had no rubric.

## What I wished existed

- **A fake remote machine in `verify-herdr-factory`.** Both checkpoints ran with only this computer, so the one high defect, which needs a second machine's spaces, was unreachable in the window. Unit tests caught it only once a reviewer imagined the case.
- **Press-and-hold in `bin/input.sh`.** Every drag is still the owner's QA, and the drag-state bugs fixed in polish, a stale header drag and a fold after dragging away and back, live in exactly that path.

## Project friction → `/gate audit`

None. The gate is about 5 s and was never red. No tier cost more than it caught.

## Framework friction → factory

- `/ux` (`.claude/skills/ux/SKILL.md`, Review mode § 3-4) has no branch for a desktop UI with no DOM: its matrix asks for viewport widths, touch targets and accessibility names that a GPUI window cannot give. A "native window" row saying which checks apply would save a guess.
- `/polish` § 1 starts `code-review` with no level named, and that skill reuses "the level you typed last". An unattended worker has typed none, so the level is a guess. The polish skill should name the level.

Leaks: nothing the check should have caught.

## Score

4 — every slice was green first time and Prove caught a real restart defect, but the highest-severity bug only showed at polish, because the harness has no second machine.
