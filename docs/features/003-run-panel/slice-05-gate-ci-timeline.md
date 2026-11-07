# Slice 05 — Gate, CI and the timeline

**Source**: [`prd.md`](prd.md) → §8 FR-6, and the timeline half of §5 FR-3's acceptance. **Depends on**: 02 (it fills `mods/factory-run/sections/gate.js`, and draws the timeline slice 02 holds). Independent of 03, 04 and 06.
**Created**: 2026-11-07

**Progress**:
- Built `mods/factory-run/lib/gate.js` (`gateView`, `ciView`, `timelineRows`, `toneKey`) with `tests/gate.test.js` (16 tests, 100% lines of `lib/gate.js`), and drew it in `mods/factory-run/sections/gate.js`: a "Gate and CI" block (a state dot, the head line, the tail or excerpt in a monospace box with hits in full color and context dimmed, "fix changed nothing" in the blocked color, CI's running checks and excerpt), then "Timeline", one row per event with its tone dot, `HH:MM` and label.
- Inner loop: 3 runs, 1 red, under 1 min. The red run caught a theme color typed `string` where gpui wants a hex color type (types tier).
- The held timeline is `snap.timeline` (slice 02 merges and caps it there), not a `ctx` field as Current code worded it; the section reads it from the snapshot.
- A green finished gate draws its head line only: AD-9.
- Left for the checkpoint: Prove (FR-6 `gate-red`, `gate-running`, `timeline-noise` screenshots; FR-3 `later` with `calls.log` and the timeline screenshot).

**Slice**: The panel shows the gate (attempt, command, elapsed and the last 8 tail lines while it runs; the failing excerpt and "fix changed nothing" when red), CI (state, round, running checks, the excerpt when red), and the timeline newest first, a dot per row in its tone's color, `noise` rows hidden.

## Current code / environment

- **The section slot**: `mods/factory-run/sections/gate.js` exports `view(snap, t, ctx)`, drawn third (slice 02, task 5). The held timeline (at most 200 rows, merged by `seq`, a new run starting without `--since`) is slice 02's, in `ctx`: this slice draws it, it does not hold or cap it. Do not edit `main.js` or `lib/live.js`.
- **The contract** (factory 0.13.1; factory repo `docs/features/024-live-run/prd.md` §6-§7): `gate` `{n, attempt, cmd, running, startedAt, red, minutes, cached, log, bytes, tail, excerpt, fixEmpty}` or null; `tail` the last 40 lines × 300 chars; `excerpt` set when red, an array of `{text, hit}` (factory `src/live/gate.rs:67`; prd §6 corrected 2026-11-07). `ci` `{state: none|waiting|red|green|noChecks, round, head, checks, excerpt}`. `timeline[]` `{seq, ts, kind, tone: owner|red|green|info|noise, label, data}`.
- **Real output**: every finished run read 2026-11-07 has a `gate` with `running: false`, `red: false`, a 40-line `tail`, `cmd` null, and `ci.checks` `[]`. One run's last red gate had an excerpt of 20 `{text, hit}` lines, most with `hit: false` (context). So "red" is `gate.red`, never a non-empty tail.
- **Tone colors** (prd §8): "`owner` blocked, `red` blocked, `green` done, `info` muted": theme keys `blocked`, `done`, `muted` (the names `t[c.status]` already uses, `~/.config/herdr-app/mods/tabs/main.js:71`).
- **Fixtures**: slice 01's `gate-red`, `gate-running`, `timeline-noise`, and `later` for FR-3's timeline screenshot.
- **Logic in a lib**: `mods/factory-run/lib/gate.js` with `tests/gate.test.js` (90% line floor); `sections/gate.js` only draws.

## Tasks

### 1. Gate, CI and timeline rows as data — high — blocked by: —
**Source**: §8 FR-6: "**Gate:** while it runs: attempt, command, elapsed and the last 8 `tail` lines; when red: the `excerpt` lines (`{text, hit}`, hits in full color), and 'fix changed nothing' when `fixEmpty`". "**CI:** state, round, running checks, and the `excerpt` when red." "**Timeline:** newest first. Each row has its time, its `label` and a dot in its `tone` color … Rows of tone `noise` are hidden." Acceptance: "A red gate fixture shows its excerpt and not its tail." "A running gate shows the tail." "A timeline fixture holding one `info` event and one `noise` event draws the `info` row only."

`mods/factory-run/lib/gate.js`, `tests/gate.test.js`: `gateView(gate, at)`, `ciView(ci)`, `timelineRows(timeline)` (newest first, `noise` dropped, tone mapped to a theme key).

**Acceptance:** tests assert: a red gate gives its excerpt lines with `hit` kept and no tail; a running gate gives 8 tail lines (the last 8 of 40), its attempt, command and elapsed; `fixEmpty` adds `fix changed nothing`; red CI gives its excerpt, green CI none; one `info` and one `noise` give one row; rows come newest `seq` first; each tone maps to its theme key.

### 2. Draw the gate, CI and the timeline — high — blocked by: 1
**Source**: §8 FR-6, as task 1. §5 FR-3 acceptance: "Given a new event after 3 s, a screenshot 2 s after that answer shows it on the timeline."

`mods/factory-run/sections/gate.js`: excerpt and tail in a monospace box, `hit` lines in full color, context dimmed; CI under it; the timeline below, one row per entry with time, label and tone dot.

**Acceptance:** at the checkpoint, the FR-6 rows and FR-3's timeline screenshot.

### 3. Verify — medium — blocked by: 1, 2
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 4. Prove — at the checkpoint — blocked by: 3
`prd.md` § QA plan, through `features/run-panel.md`:

- **FR-6**: cases `gate-red` (excerpt shown, no tail), `gate-running` (tail shown), `timeline-noise` (the `info` row only), a screenshot each.
- **FR-3**, the timeline half slice 02 left here: case `later`, `calls.log` and a screenshot 2 s after the held call returns, showing the new row on top of the timeline.

**Acceptance:** after the checkpoint, each row has its PNG (and `calls.log` for FR-3) in this slice's Progress.
