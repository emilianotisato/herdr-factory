# Slice 03 — Waiting on you and Now

**Source**: [`prd.md`](prd.md) → §6 FR-4. **Depends on**: 02 (it fills `mods/factory-run/sections/now.js`, which slice 02 lays out and feeds the snapshot). Independent of 04, 05 and 06: each owns its own section and lib file.
**Created**: 2026-11-07

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: The top of the panel says what the run waits on: one block per `attention[]` entry (kind, how long open, title, body, the excerpt with hit lines bright, and Answer for blocks and asks, opening PRD-001's dialog), then one Now line built from `now` (what it waits on first, factory's label, since when, progress, resume time, idle time, the decision count, driver dead, stopping). Nothing else in the panel changes.

## Current code / environment

- **The section slot**: `mods/factory-run/sections/now.js` exports `view(snap, t, ctx)` and is drawn first, under the chips (slice 02, task 5). `ctx` carries the run envelope, the `factory` prop and `cx`. Do not edit `main.js`; if the slot lacks something, add it to `ctx` with the smallest change and say so in Progress.
- **The contract** (factory 0.13.1; factory repo `docs/features/024-live-run/prd.md` §4): `now` `{waitingOn, label, since, progress, resumesAt, idleSeconds, driverAlive, stopping}`; `waitingOn` one of `owner worker gate review ci quota budget driver nothing done`; `progress` `{done, of}` or null; `resumesAt` set for `quota` only (a budget park has none); `stopping` null or `{on: worker|gate, what}`. `attention[]` `{id, kind: block|ask|park|warn, openedAt, title, body, reason, answer}`, `reason` `{source, log, excerpt}` or null, excerpt lines `{text, hit}`. A park's reason is its `title`, and its `reason.excerpt` is null (prd §6, corrected 2026-11-07). `decisions` `{count}`.
- **The Answer dialog**, `mods/factory-answer/main.js:15-23`: props `run: {id, feature, repo}`, `question` (`{id, text?, answer}`, `lib/answer.js:3-7`), `factory`. `answerCall` returns null unless `answer[1] === "answer"` (`lib/answer.js:20-23`), and runs `factory || "factory"` with `answer.slice(1)`.
- **The strip opens it like this** (`mods/factory-spaces/main.js:678-680`): `openOverlay({ mod: "factory-answer", kind: "dialog", modal: true, width: 460, height: 330, props: { run, question, factory: props()?.factory ?? null } })`. **The trap:** pass the panel's own `factory` prop, or under the harness the answer goes to the real factory and not the fixtures, and on the owner's machine a custom command is ignored.
- **Envelope `repo` is the stored path**, which the dialog already takes (prd §6, corrected 2026-11-07); envelope `feature` is there for the dialog.
- **Fixtures**: slice 01's cases `owner worker gate review ci quota budget driver nothing done`, `park`, `block-excerpt` (`tests/fixtures/live/`). Answer is driven on fixture run `004-<date>-a002`, whose `BLOCK-1` the real fixture accepts (`.claude/skills/verify-herdr-factory/features/run-actions.md`), by setting that run's case to `block-excerpt` with its `answer` argv kept.
- **Logic in a lib**: pure text-building goes in `mods/factory-run/lib/now.js` with `tests/now.test.js` (90% line floor over `mods/*/lib/**`, `scripts/gate/test.sh`); `sections/now.js` only draws.
- **Theme colors** are cast once in a strict mod (`docs/reference/verification.md`, Theme colors).

## Tasks

### 1. The Now line and the attention text — high — blocked by: —
**Source**: §6 FR-4: "**Now:** one line built from `now`: `waitingOn` as its first word ('Waiting on gate'); `label`; since when; `progress` when present, e.g. 'review 7/12'; `resumesAt` when set ('resumes 14:05') …; idle time; `decisions.count` ('14 decisions'); 'driver dead' when `driverAlive` is false; 'stopping, waiting on …' from `stopping`". "**Accepted cost:** a handful of fixed words for factory's booleans and enums. Everything else is factory's text." "Waiting on you: … its kind and how long it has been open; its title and `body`, when present; the `reason.excerpt` lines".

`mods/factory-run/lib/now.js`, `tests/now.test.js`: `nowLine(now, decisions, at)` → the parts of the line; `attentionBlocks(attention, at)` → per entry its kind, open-for, title, body, excerpt lines with `hit`, and whether it gets Answer (`block` and `ask` only). Durations against the envelope's `at`, not the clock, so a test is fixed.

**Acceptance:** tests assert, one per `waitingOn` value, that the line starts with its word; a quota `now` reads `resumes HH:MM` and a budget one does not; `progress {done:7, of:12}` reads `7/12`; `driverAlive: false` adds `driver dead`; `stopping {on:"gate", what:…}` reads `stopping, waiting on …`; a `park` entry carries its title and no excerpt; a `warn` entry gets no Answer.

### 2. Draw the section and wire Answer — high — blocked by: 1
**Source**: §6 FR-4: "an **Answer** button for `block` and `ask` entries", "The Answer button opens PRD-001's `factory-answer` dialog with the props it already takes … `run: { id, feature, repo }` from the envelope; `question: { id, text: title, answer }` from that entry". Acceptance: "Answer on a fixture BLOCK opens the dialog titled with that id."

`mods/factory-run/sections/now.js`: the Waiting on you blocks (excerpt in a monospace box, `hit` lines in full color, context lines dimmed), then the Now line. Answer opens the dialog as the strip does, with the panel's `factory` prop.

**Acceptance:** at the checkpoint, the FR-4 rows. In code, `make types` passes on the new file.

### 3. Verify — medium — blocked by: 1, 2
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 4. Prove — at the checkpoint — blocked by: 3
`prd.md` § QA plan, row **FR-4**, through `features/run-panel.md`:

- one screenshot per `waitingOn` case (ten), each showing its word first on the Now line; `quota` shows `resumes …`; `driver` shows `driver dead`;
- `park`: its reason (the title) shown, no excerpt box;
- `block-excerpt`: the excerpt with its Answer button; click Answer with `bin/input.sh`, screenshot of the dialog titled `BLOCK-1`.

The human half of the row ("does the top read in five seconds") is the owner's, in `qa-guide.md`.

**Acceptance:** after the checkpoint, each row has its PNG in this slice's Progress.
