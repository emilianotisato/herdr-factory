# Slice 02 — Run button, the shown run and the live loop

**Source**: [`prd.md`](prd.md) → §3 FR-1, §4 FR-2, §5 FR-3, and §8 FR-6's 200-row cap on the held timeline. **Depends on**: — (the spine: slices 03 to 06 each fill one section file this slice lays out, and read the snapshot and run choice it holds)
**Created**: 2026-11-07

**Progress**:
- **Built.** `mods/factory-tabs`: a byte-for-byte clone of Herdr 0.1.13's `tabs` plus three lines: Run is always drawn, and `syncPanel` treats `run` as enabled, so a space switch restores it. The icon is `mods/workspace-chrome/layers.svg`. `layouts/factory.json`: the tab block now uses `factory-tabs`, and `panel-body` gains a `run` child holding `factory-run`. `upstream.json` records the whole `tabs` entry (six hashes). The `install.sh` messages now name the cloned files generally. `factory-spaces` writes `factory.spaceRuns` through `spaceRuns()` in `lib/runs.js`, only when the value changes and only after an `ok` answer. New mod `mods/factory-run`: `lib/live.js` (argv, outcome, a merge capped at 200 rows, `apply` that drops answers about another run, the shown check), `lib/pick.js` (reads the key defensively, picks the chip, falls back to the first), and `main.js` (the loop, header, chips, upgrade, stderr and loading lines). Four stub sections in `sections/{now,agents,gate,shots}.js`, typed by `SectionView`/`SectionUpdate` in `lib/live.js`.
- **Inner loop.** 3 runs, 1 red, about 1 min. The red run was eslint `no-unused-vars` on the stub sections' parameters, fixed by typing the stubs as `SectionView` constants. Tests: 125 pass; `live.js` and `pick.js` 100% lines.
- **Deviations.** AD-1: the first call per run has no `--wait`, and a failed call is retried after 10 s. AD-2 (fyi): a run switch starts the new loop at once, and the old run's held answer is dropped.
- **Prove.** FR-1, FR-2 and FR-3 rows are left for the checkpoint.
- **Checkpoint 1, FR-1:** Run clicked on api `cp-1/run-panel-open-api.png`; clicked again `cp-1/run-panel-second-click-hidden.png`, again `cp-1/run-panel-shown-again-api.png`; switch to shop (never shown there, so hidden) `cp-1/run-panel-follows-to-shop.png` and back to api (shown) `cp-1/run-panel-back-on-api.png`; `workspace.panels: []` after a restart drops Files and Changes and keeps Run `cp-1/tabs-panels-empty-keeps-run.png`; `install.sh` with a changed `tabs` hash warns naming `tabs`, installs and switches `cp-1/install-changed-tabs-hash.txt`.
- **Checkpoint 1, FR-2:** api's four chips `cp-1/run-panel-back-on-api.png`; shop's three chips `cp-1/run-panel-shop-three-chips.png`, the second clicked `cp-1/run-panel-shop-second-chip.png`; the space-runs key tests `cp-1/space-runs-key-test.txt` (3 pass).
- **Checkpoint 1, FR-3:** `later` then the run's chip: the held `--since 11 --wait 20` returned 3.1 s after `use`, the next call carries `--since 12` and holds 20 s `cp-1/live-loop-later-calls.txt` (panel `cp-1/live-later-answer-landed.png`; the timeline row is slice 05's); hidden 30 s, no call started `cp-1/live-loop-hidden-calls.txt`, `cp-1/run-panel-hidden-no-calls.png`; exit 1 keeps the view with `no run …` dimmed `cp-1/live-exit-1-kept-view-dimmed.png`, exit 2 shows the upgrade line `cp-1/live-exit-2-upgrade-line.png`, retried 10 s apart `cp-1/live-exit-codes-calls.txt`.

**Slice**: In the factory layout a Run button sits beside Files and Changes and opens a side panel holding the new `factory-run` mod. `factory-spaces` publishes which runs belong to which space under `shared("factory.spaceRuns")`; the panel shows the shown space's first run, with chips when it has several, or "No factory run in this space." While shown, it loops `factory live` with `--since` and `--wait 20`, keeps the snapshot and a timeline of at most 200 rows, and shows the upgrade line or factory's stderr line on failure. The four sections are stub files the next slices fill; this slice draws only the run header, the chips and the status lines.

**Highest risk**: task 1 and task 4. A second cloned Herdr file whose stored-choice trap hides the panel on a space switch, and a held exec loop that must stop calling factory while hidden and never mix two runs' timelines.

## Current code / environment

- **Herdr's tab bar**, `~/.config/herdr-app/mods/tabs/main.js` (103 lines, herdr-app 0.1.13): per-space panel choice in `localStorage` `panels` (`:17`, `:22-46`); `enabled = shared("workspace.panels") ?? ["files","changes"]` (`:80`); `panelButton(id, label, icon)` selects `panel-body`'s child and shows `panel`, or hides it when already on (`:82-91`); Files and Changes drawn only when enabled (`:97-98`). **The trap** (prd §14): `syncPanel` restores a stored choice only when `enabled.includes(stored)` (`:29`), so `run` must count as enabled always, or a space switch hides the Run panel.
- **The clone keeps Herdr's asset paths**: `main.js` draws `mods/tabs/win-*.svg` (`:99-101`), `mods/files/file.svg`, `mods/changes/changes.svg` (`:97-98`). Those stay Herdr's files; copy only `main.js` and `mod.json` (`{ "place": "none", "title": "Tabs" }`), as PRD-001 copied `spaces`. The Run icon is an existing Herdr svg (e.g. under `mods/workspace-chrome/`).
- **`localStorage` is per mod copy** (`~/.config/herdr-app/AGENTS.md:997`) and a block given another mod starts over (`:795-800`): switching the tab block to `factory-tabs` starts with no stored panel choices. Expected; no migration.
- **The layout**: `layouts/factory.json:89-99` the `tabs` block (`"mod": "tabs"`); `:135-167` the hidden `panel` column with the `panel-body` stack (`"active": "files"`) and its `files` and `changes` children.
- **Cloned files are listed** between the `cloned` markers in `.prettierignore` (`:4-8`), which the format and types tiers skip (`scripts/gate/types.sh`). `mods/factory-tabs/main.js` and `mod.json` go there; `mods/factory-run/**` is ours and gets the strict tiers.
- **The drift check**: `upstream.json` records `spaces` and `layout:main` only; `install.sh:60-68` compares whole `installed.json` entries; its messages name "Herdr's spaces mod and main layout" and "since factory-spaces was cloned" (`install.sh:53`, `:57`, `:69`, `:76`). `tests/install.test.js:127-159` pins the warning (`/warning:.*spaces.*0\.1\.13.*0\.1\.99/`) and the quiet case. Herdr 0.1.13's `installed.json` `tabs` entry, read 2026-11-07, is the six hashes prd §3 lists, matching.
- **`install.sh` already installs every `mods/factory-*/`** (`install.sh:21-25`), so `factory-tabs` and `factory-run` need no install change beyond the drift wording.
- **Runs per space**: `this.lanes = bySpace(undismissed(this.dismissed, this.factory).status, …)` in `grouped()` (`mods/factory-spaces/main.js:391`), strips ordered most urgent first (`lib/runs.js:353-374`, `RANK`); each strip has `id`. `this.factory` starts as `NONE` (`main.js:86`) and keeps its last answer on a failed ask (`:104`). `main.js` is a cloned file: logic goes in `lib/`, under the 90% coverage floor.
- **`recent` is "every run id in its last `status --json --recent` answer"** (prd §4). Before the first answer there is none: do not write the key while `this.factory.kind !== "ok"`, or slice 06's cleanup reads an empty `recent` at every start and deletes every shot.
- **Mods cannot import each other's files** (prd §4, PRD-002 AD-3), so `factory-run` parses the key itself, defensively. A mod may import its own subfolders (`herdr-app check` passed a scratch mod whose `main.js` imports `./sections/a.js`, which imports `gpui-kit` and `../lib/x.js`, 2026-11-07).
- **`exec()`**: 30 s limit, 8 MiB output (`~/.config/herdr-app/herdr.d.ts:10-13`); `live` output is capped at 512 KiB (factory `src/live/mod.rs:24`). The command is `props()?.factory ?? "factory"`, as `factory-spaces` does (`main.js:99`).
- **factory 0.13.1 exit codes**: a usage error exits 2; `no run <id>` exits 1; `--wait` timeout exits 0 with the current snapshot.
- **A hidden copy stays alive with its timers** (`AGENTS.md:795-799`); `render()` runs on any live-data change, layout and shared state included (`AGENTS.md:870-871`, `:992-993`). A reload stops the old build's loop at its next `cx` use (`:791`). Never keep a `cx` (`:872`).
- **Not handled** (prd §13): the panel in Herdr's `main` layout; a "stuck" verdict. Do not add them.

## Tasks

### 1. `factory-tabs`: the clone and the Run button — high — blocked by: —
**Source**: §3 FR-1: "Clone `tabs` into `mods/factory-tabs`. Add a **Run** button beside Files and Changes, drawn always." "Point the layout's tab block at `factory-tabs`." Acceptance: "clicking Run shows the panel with the `factory-run` mod, and clicking it again hides it. The choice survives a space switch the way Files does today. Files and Changes still show when `workspace.panels` lists them, and hide when it is `[]`."

`mods/factory-tabs/main.js`, `mod.json` (copied byte for byte first, in their own commit-able state, then edited), `.prettierignore`. Add `panelButton("run", "Run", <svg>)` after Changes, unconditional, and pass `[...enabled, "run"]` (or equivalent) to `syncPanel`. Keep the diff against Herdr's file small, so a re-clone is a re-apply.

**Acceptance:** at the checkpoint, the FR-1 row; in code, `diff ~/.config/herdr-app/mods/tabs/main.js mods/factory-tabs/main.js` shows only the Run additions.

### 2. The layout slot, the mod skeleton and the drift record — high — blocked by: 1
**Source**: §3 FR-1: "Add a `run` child to `panel-body` in `layouts/factory.json`, holding the new `factory-run` mod." "Record the whole `tabs` entry of herdr-app 0.1.13's `installed.json` in `upstream.json`, every file it lists." Acceptance: "`install.sh` warns when Herdr's `tabs` hashes differ from `upstream.json`."

`layouts/factory.json` (tab block → `factory-tabs`; `run` block child of `panel-body` with `"mod": "factory-run"`), `mods/factory-run/mod.json` (`"place": "none"`), `mods/factory-run/main.js`, `upstream.json` (`"tabs"` with the six hashes of prd §3), `install.sh` (messages name the cloned files generally, not "spaces mod and main layout"), `tests/install.test.js`.

**Acceptance:** `tests/install.test.js` gains a test that a changed `tabs` hash in the scratch `installed.json` warns naming `tabs`, and the quiet test stays quiet with `upstream.installed` (now holding `tabs`) copied whole.

### 3. `factory.spaceRuns`, written on change — high — blocked by: —
**Source**: §4 FR-2: "`factory-spaces` writes `shared(\"factory.spaceRuns\")` as `{ spaces: { spaceId: [runId, …] }, recent: [runId, …] }`. `spaces` holds the undismissed strips per space, in strip order. `recent` holds every run id in its last `status --json --recent` answer, dismissed or not. It writes only when the value changes." Acceptance: "A unit test pins that the key is written only on change."

`mods/factory-spaces/lib/runs.js` (a pure `spaceRuns(lanes, status, previous)` that returns the value to write, or null when equal to `previous` or when `status.kind !== "ok"`), `tests/runs.test.js`, and the one call in `main.js` beside `:391`.

**Acceptance:** tests assert: lanes of two spaces map to their strip ids in strip order; a dismissed run is in `recent` and not in `spaces`; the same inputs twice give null the second time; a `none` status gives null.

### 4. The live loop and the held state — high — blocked by: 2
**Source**: §5 FR-3: "While the panel is shown, the mod loops `factory live <id> --json --since <lastSeq> --wait 20` through `exec()`", "It keeps the timeline it has, and appends what each answer returns", "Hidden, it does not call factory", "checks it is shown (the `panel` column visible and `panel-body` on `run`) before each call", "A usage error (exit 2 …), or an answer whose `schema` is not 1, shows one line: 'needs factory with `live` schema 1 · factory upgrade'", "Any other non-zero exit … keeps what the panel last drew and shows factory's first stderr line, dimmed", "The mod pins `schema` only". §8 FR-6: "The list keeps at most 200 rows." "A run switch starts the new run's timeline without `--since`, which returns the last 100."

`mods/factory-run/lib/live.js` (pure: the argv for a call, the outcome of an `ExecResult` — snapshot, upgrade line or stderr line —, merging a snapshot's timeline into the held one by `seq` with the 200 cap, the shown check over a `layout()` tree), `tests/live.test.js`, and the loop in `main.js`: one `cx.spawn` loop at a time; before each call, check shown, else wait for `render()` or a gentle timer to wake it. **The trap:** an answer that returns after a run switch belongs to the old run: drop it when its `id` is not the run now shown, or two runs' timelines mix.

**Acceptance:** `tests/live.test.js` asserts: first call has no `--since`, later ones `--since <seq>`; exit 2 and a `schema: 2` answer give the upgrade line; exit 1 keeps the previous snapshot and gives `no run x` as the line; merging 150 + 100 rows keeps the newest 200 with no duplicate seq; an answer for another run id is dropped; the shown check is false with `panel` hidden and with `panel-body` on `files`.

### 5. The shown run, the chips and the section layout — high — blocked by: 3, 4
**Source**: §4 FR-2: "The panel shows the first run of the shown space", "When the space has several runs, a row of chips above the sections switches between them", "No run: the panel says 'No factory run in this space.'" Acceptance: "the panel names the run of the shown space, and switches when the space does. A space with two runs shows two chips. Clicking the second chip shows that run."

`mods/factory-run/lib/pick.js` (pure: parse the key defensively, the run for the active space and a chosen chip, falling back to the first when the chosen id left), `tests/pick.test.js`, `main.js` (header with the run id and feature, chips, the status line), and four stub files the next slices fill, each exporting `view(snap, t, ctx)` that returns null: `mods/factory-run/sections/{now,agents,gate,shots}.js`, drawn in that order; `shots.js` also exports `update(snap, ctx)`, a no-op, called once per accepted answer. `ctx` carries what a section needs from the glue: the run envelope, `props()` factory and runs, `cx`.

**Acceptance:** `tests/pick.test.js` asserts: junk or missing key gives no run; a space with two runs gives the first and two chips; a chosen second chip is kept, and dropped once it leaves the list; a space absent from `spaces` gives none.

### 6. Verify — medium — blocked by: 1, 2, 3, 4, 5
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 7. Prove — at the checkpoint — blocked by: 6
`prd.md` § QA plan, with slice 01's fake and `features/run-panel.md`:

- **FR-1**: click Run with `bin/input.sh`, screenshot; click again, screenshot; switch space and back, screenshot; `workspace.panels` `[]` hides Files and Changes, not Run; `install.sh` on a scratch home whose `installed.json` has a changed `tabs` hash, transcript.
- **FR-2**: two fixture spaces (shop, api), switch between them, screenshot each; shop (three runs) shows chips, click the second, screenshot; run the `spaceRuns` unit test, transcript.
- **FR-3**: case `later` on a run: `calls.log` shows the held `--wait 20` call returning about 3 s after `use`, with the next call carrying `--since` of the new seq. The screenshot of the new row on the timeline belongs to slice 05, which draws the timeline. Hide the panel, wait 30 s: `calls.log` has no call meanwhile. Cases `exit-2` and `exit-1`: screenshots of the upgrade line, and of the kept view with `no run …` dimmed.

**Acceptance:** after the checkpoint, each row has its transcript or PNG in this slice's Progress.

**Code-review fixes (2026-11-07).**
- An answer that did not parse, or had schema 1 and no string `id`, showed the upgrade line and blanked the sections. FR-3 reserves that line for exit 2 and another schema, so a cut-off answer told the owner to upgrade a current factory. It now keeps the view under a dim "factory live printed no readable answer" (AD-13).
- A reopened panel's first call carried `--wait 20`, so it drew what it held before being hidden as current for up to 20 s. Each loop's first call now returns at once (AD-12).
- After a restart the panel said "No factory run in this space." for a space that has one: the sidebar published `factory.spaceRuns` before git had answered for its spaces, so every space looked empty. The sidebar now publishes only once its spaces are listed and each local one is placed, and the panel says "Loading…" while the key does not exist yet.
- A run id starting with `-` would reach factory as a flag; `readSpaceRuns` drops it.
- The header comment claimed one `factory live` call at a time, which AD-2 contradicts; the `WAKE_MS` comment credited the loop with what `wake` does. Both now say what the code does.
- `install.sh`'s drift messages said "factory cloned", which reads as the factory binary; they now name this repo's clones.
- The space-runs test now pins that a dismiss, which changes `spaces` and keeps `recent`, is written; the pick tests pin the chip list, not only the chosen id.
