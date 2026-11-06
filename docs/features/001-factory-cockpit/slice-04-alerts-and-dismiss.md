# Slice 04 — Alerts and dismiss

**Source**: [`prd.md`](prd.md) → §8 FR-5, §10 FR-7. **Depends on**: 03 (both read the run model and the strips it draws)
**Created**: 2026-11-06

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: A question that opens raises one toast and the blocked sound, once per screen even across restarts, and the toast selects that space. A shipped or failed strip gets a × that hides it on this screen for good. Both are per-screen memory in the mod's `localStorage`, decided by pure functions.

## Current code / environment

- **`notify({title, body, level, action: {name, args}})`** posts a toast the shipped `toast` mod shows, and clicking runs `action.name` with `args` (`herdr.d.ts`, `notify`; `mods/toast/main.js:24-26`). `space.select` takes `index` or `id`.
- **`playSound("blocked")`** returns `null` (`herdr.d.ts:42`): nothing can observe it, so the alert decision is a pure function a unit test counts (prd §8, corrected).
- **`localStorage`** survives restarts per mod (`gpui-kit.d.ts`; the agents mod keeps `changed` and `pins` this way, `mods/agents/main.js`). It is per screen: dismissing on one PC does not dismiss on the other (prd §10, accepted cost).
- **Question ids are `BLOCK-n` or `ASK-n`** and repeat across runs and features. Key what is seen by run id and question id together.
- **Runs that ended more than 7 days ago** drop out of `--recent` on factory's side (prd §3), so dismissed ids for them can be pruned.
- **Not handled** (prd §14): closing a run when its PR merges. Do not call `gh`.

## Tasks

### 1. The alert and dismiss rules — high — blocked by: —
**Source**: §8 FR-5: "Each id alerts once per screen, remembered across restarts in the mod's `localStorage`. The decision to alert is a pure function of the ids seen and the ids now open". §10 FR-7: "A shipped or failed strip stays until its × is clicked."

`mods/factory-spaces/lib/`: given what was seen and the runs now, return the toasts to post (title `NNN needs you`, body the question text, level `warning`, `space.select` on the run's space) and the new seen set; given the dismissed set and the runs, return which finished strips still show and which dismissed ids can be dropped.

**Acceptance:** unit tests: one toast and one sound per new id; none for an id already seen; the same `BLOCK-1` in two runs alerts twice; a dismissed shipped run is hidden while a second shipped run on the same space still shows; dismissed ids of runs no longer listed are dropped.

### 2. Wire them into the mod — high — blocked by: 1
**Source**: §8 FR-5 and §10 FR-7, as above.

In `main.js`: after each poll, post the toasts and play `blocked` per new id; persist the seen and dismissed sets in `localStorage`; draw × on shipped and failed strips.

**Acceptance:** at the checkpoint, as the rows below.

### 3. Verify — medium — blocked by: 1, 2
`make inner` _(the inner loop; the full gate runs at this slice's checkpoint)_

**Acceptance:** inner loop green, one commit.

### 4. Prove — at the checkpoint — blocked by: 3
§12 QA plan rows **FR-5** (open a BLOCK in a fixture; restart; click the toast; run the alert unit test: PNGs of the toast and the selected space, the test transcript) and **FR-7** (dismiss a shipped run, restart: PNGs).

**Acceptance:** after the checkpoint, both rows have their evidence in Progress.
