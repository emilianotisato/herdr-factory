# Slice 05 — Answer from the window

**Source**: [`prd.md`](prd.md) → §9 FR-6. **Depends on**: 03 (the owner-needed strip carries the Answer button)
**Created**: 2026-11-06

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: The owner-needed strip's **Answer** opens a dialog with the question's title, a hint to the full question, a text input, Cancel and Send. Send runs factory's own `answer` argv with the text. Success closes it with a toast; failure keeps the text and shows factory's line.

## Current code / environment

- **The pattern**: Herdr's `prompt` mod (`~/.config/herdr-app/mods/prompt/main.js`): `InputState.new`, `Input.new(...)` from `gpui-base`, focus on open with a 600 ms refocus, Esc closes, `closeOverlay(props().overlay)`. `factory-answer` is our own new mod, not a clone: strict types and format apply.
- **Opening it**: `openOverlay({ mod: "factory-answer", kind: "dialog", props: {…} })` returns the overlay id the mod reads as `props().overlay` (`herdr.d.ts`, `openOverlay`).
- **The argv is factory's**: each question carries `answer`, e.g. `["factory","answer","--feature","007","BLOCK-3"]`, or `--run <id>` for an ASK (factory `src/cli/status.rs:287-295`). Append the typed text as one argument. The flag is already before the id; never rebuild the argv, because the text is a trailing argument and a flag after it becomes answer words (factory `src/cli/answer.rs:21`).
- **The trap: `answer[0]` is `"factory"`.** When the layout's props name another factory command (the harness's wrapper, prd §12), run that command with `answer.slice(1)`, or the harness's answer goes to the owner's real runs.
- **Errors come on stdout too**: an already resolved id prints `… is already resolved …` on stdout and exits 1 (factory `src/cli/answer.rs:192-193`). Show the first line of stdout, else of stderr.
- **Run it from the run's repo**: `exec(cmd, args, { cwd: run.repo })`.
- **The text is the block's title**, at most 160 characters; the options live in `log.jsonl` (prd §9, decided 2026-11-06). Show the title and the dim hint `full question: factory status <run id>`. Do not read `log.jsonl`.
- **Success is seen on disk**: `<run>/answers/BLOCK-n.json` (factory `src/answers.rs:30-35`).

## Tasks

### 1. The answer rules — high — blocked by: —
**Source**: §9 FR-6: "Send runs the question's `answer` argv with the typed text appended … Otherwise the dialog stays open with the text kept and factory's first output line under the input, from stdout, else stderr."

`mods/factory-answer/lib/`: build the command and arguments from a question, the configured factory command and the text; pick the line to show from an exec result.

**Acceptance:** unit tests: the default command gives `factory answer --feature 007 BLOCK-3 <text>`; a wrapper command replaces only `factory`; text with spaces stays one argument; exit 1 with an empty stderr shows stdout's first line.

### 2. The dialog and the button — high — blocked by: 1
**Source**: §9 FR-6, the dialog, the hint and the success toast.

`mods/factory-answer/main.js` and `mod.json`, after the prompt pattern. In `factory-spaces`, the owner-needed strip's **Answer** opens it with the run, the question and the factory command. On exit 0: close, `notify` level `success`.

**Acceptance:** at the checkpoint, as the row below.

### 3. Verify — medium — blocked by: 1, 2
`make inner` _(the inner loop; the full gate runs at this slice's checkpoint)_

**Acceptance:** inner loop green, one commit.

### 4. Prove — at the checkpoint — blocked by: 3
§12 QA plan row **FR-6** (answer a fixture BLOCK, then a resolved one: PNGs and `answers/BLOCK-n.json`).

**Acceptance:** after the checkpoint, the row has its evidence in Progress.
