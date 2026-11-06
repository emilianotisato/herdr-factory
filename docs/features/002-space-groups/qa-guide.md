# QA guide — PRD-002 space groups

About **10 minutes**, in your own window after `./install.sh`, on the `factory` layout. These are the checks a machine cannot make; everything else was proven at the checkpoints.

1. **Drag a space in and out (most important, 3 min).** Make a group with the new-group control on the Spaces header. Drag a space onto its header: the header highlights while you hover, and the space lands under it. Drag it back onto a loose row: it returns to the loose list. Drag a worktree's checkout in: the worktree follows. (FR-2)
2. **Sort groups by dragging a header (most important, 3 min).** With two groups, drag the lower header up onto the upper one: the accent line shows where it lands, and the whole group moves. A press on a header without moving still folds it, and a click on its name still opens rename. Check `alt-1..9` still pick spaces in the drawn order. (FR-3)
3. **The dialog (2 min).** Make, rename and delete a group. Enter saves, Esc cancels. Does it look like Herdr's own rename dialog? (FR-1)
4. **The dot (2 min).** Fold a group that holds a space with a waiting agent or a run with a question: the header's one dot reads as "needs you", in light and dark, and in the narrow rail. (FR-4)
