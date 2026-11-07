---
number: 003
slug: run-panel
title: "Run side panel in the factory layout"
type: feature
created: 2026-11-07
author: Emiliano Tisato
summary: |
  A Run button in the factory layout's tab bar opens a side panel for the shown space's factory run: why it waits on the owner, what it is doing now, each agent's current step, the failing reason of a gate or CI round, a timeline, and the latest checkpoint screenshots. Everything comes from one new factory verb, `factory live <id> --json`, so the panel never reads run files. Ready: factory 0.13.1 ships the verb (factory PRD-024), and this PRD was re-checked against its real output on 2026-11-07.
---

# PRD-003 — Run side panel in the factory layout

## 1. Why now

The sidebar strip (PRD-001) says a run's phase, slices, budget and gate in two lines. It cannot say why a run waits or what it is doing. On 2026-11-06 the owner asked to "see more of the live happenings of the run" in the side panel where Files and Changes sit, which they do not use.

A research pass that day read 70 runs across 7 stacks (the factory idea's **Why** section has the run ids). What an owner watching live could not see:

- **Why it waits.** Parks of 6 to 9 h sat behind block text that said nothing. Separately, 32 of the 33 `run_waiting` events on the machine carried no question at all.
- **What it does.** The longest silences were factory's own work: 15 to 30 min of review collect, gates up to 33 min, and CI waits of 8 to 31 min.
- **What each agent does.** Slices ran 30 to 106 min, and 10 min silences are normal inside one long command.
- **Where a gate or CI round failed.** The reason is often mid-log or at the top, not at the tail.

Screenshots land in bursts near a checkpoint's end, and many stacks make none. They are "proof just landed", not a live camera.

**Left alone:** the sidebar strip, the Answer dialog (reused, not changed), Herdr's Files and Changes panels (kept for whoever uses them).

## 2. Blast radius

- **A second cloned Herdr file.** The tab bar (`mods/tabs/main.js`, 103 lines) is cloned into `factory-tabs`, like PRD-001 cloned the spaces mod. Every Herdr update that changes it needs a re-clone. `install.sh`'s drift warning (`install.sh:51-76`, `upstream.json`) covers it too.
- **The factory layout changes for coworkers.** It gains the Run button and panel. Files and Changes stay, still governed by Herdr's shared `workspace.panels`.
- **A new shared key**, `factory.spaceRuns`, written by `factory-spaces`. Other mods ignore it.
- **Disk.** Screenshot copies go under `<HERDR_APP_HOME>/data/factory-run/shots/`, and are removed when a run leaves factory's recent list (§9).
- **Factory's contract.** This reads `factory live` schema 1 only. A schema bump shows a "needs a newer factory" line rather than a broken panel.

## 3. FR-1 — the Run button and the panel slot

**Today.** Herdr's tab bar draws a Files and a Changes button when `shared("workspace.panels")` lists them (`~/.config/herdr-app/mods/tabs/main.js:80`, `:97-98`). Each one selects its child of the `panel-body` stack and shows the hidden `panel` column (`:82-91`). The choice is remembered per space in `localStorage` key `panels` (`:17`, `:22-46`). The factory layout has that column, hidden, with a `files` and a `changes` child (`layouts/factory.json:136-165`).

**Decided 2026-11-07.**
- Clone `tabs` into `mods/factory-tabs`. Add a **Run** button beside Files and Changes, drawn always.
- Add a `run` child to `panel-body` in `layouts/factory.json`, holding the new `factory-run` mod.
- Point the layout's tab block at `factory-tabs`.
- Record the whole `tabs` entry of herdr-app 0.1.13's `installed.json` in `upstream.json`, every file it lists: `main.js` `7e5362914f6154d5`, `mod.json` `a504d5ac991bc4cc`, `win-close.svg` `ca74932a6d3f1a90`, `win-max.svg` `4bbb4fb6a79ab51d`, `win-min.svg` `b86a99b42001e95f`, `win-restore.svg` `188630362d9549bf`. `install.sh` compares whole entries (`install.sh:65-67`).

*Corrected 2026-11-07 (adversarial pass): an earlier draft recorded only `main.js` and `mod.json`. Since `install.sh` compares the whole entry, that would have warned on every install.*

**Accepted cost:** a second cloned Herdr file to re-apply on Herdr updates. A key binding alone lost, because the owner asked for a button where Files and Changes were. Opening from a strip click lost to the same request.

**Acceptance:** in the factory layout, clicking Run shows the panel with the `factory-run` mod, and clicking it again hides it. The choice survives a space switch the way Files does today. Files and Changes still show when `workspace.panels` lists them, and hide when it is `[]`. `install.sh` warns when Herdr's `tabs` hashes differ from `upstream.json`.

## 4. FR-2 — which run the panel shows

**Today.** `factory-spaces` maps runs to spaces itself: `bySpace()` over the undismissed status (`mods/factory-spaces/main.js:391`, `lib/runs.js:353`). Mods cannot import each other's files (PRD-002 AD-3: `herdr-app check` refuses a sibling import).

**Decided 2026-11-07.**
- `factory-spaces` writes `shared("factory.spaceRuns")` as `{ spaces: { spaceId: [runId, …] }, recent: [runId, …] }`. `spaces` holds the undismissed strips per space, in strip order. `recent` holds every run id in its last `status --json --recent` answer, dismissed or not. It writes only when the value changes.
- The panel shows the first run of the shown space: the most urgent, since the strips are ordered that way.
- When the space has several runs, a row of chips above the sections switches between them.
- No run: the panel says "No factory run in this space."

**Accepted cost:** two of our mods coupled through one shared key. A second git lookup and status call in the panel lost, because it would duplicate `lib/runs.js` and its mapping rules.

**Acceptance:** with two fixture repos open as spaces, the panel names the run of the shown space, and switches when the space does. A space with two runs shows two chips. Clicking the second chip shows that run. A unit test pins that the key is written only on change.

## 5. FR-3 — one verb, polled while shown

**Today.** Nothing in factory exposes live detail. The factory idea `2026-11-07-factory-live-a-read-only-live-run-contract-for-the` (factory repo, `bb2f822`) specifies `factory live <id> --json [--since <seq>] [--wait <secs>]`, schema 1.

**Decided 2026-11-07.**
- While the panel is shown, the mod loops `factory live <id> --json --since <lastSeq> --wait 20` through `exec()`, which has a 30 s limit (`herdr.d.ts:10-13`).
- It keeps the timeline it has, and appends what each answer returns.
- Hidden, it does not call factory.
- The factory command comes from `props().factory`, default `factory`, as `factory-spaces` does (`main.js:99`).
- A usage error (exit 2: a factory with no `live` verb), or an answer whose `schema` is not 1, shows one line: "needs factory with `live` schema 1 · factory upgrade".
- Any other non-zero exit, such as exit 1 for an unknown id, keeps what the panel last drew and shows factory's first stderr line, dimmed.
- Herdr keeps a hidden stack child alive, timers included (`AGENTS.md`, Mods). So the panel keeps its timeline and `lastSeq` while hidden, and checks it is shown (the `panel` column visible and `panel-body` on `run`) before each call.

*Corrected 2026-11-07 (adversarial pass): an earlier draft cited `main.js:93`, and sent every non-zero exit to the upgrade line, an unknown id included.*
- The mod pins `schema` only, never the `factory` version.

**Accepted cost:** a held exec per shown panel. A 5 s poll lost, because `--wait` returns on the change itself.

**Acceptance:**
- The fake factory logs each call's time. Given a new event after 3 s, a screenshot 2 s after that answer shows it on the timeline.
- The fake's log has no call while the panel is hidden.
- A fake that exits 2 shows the upgrade line. One that exits 1 keeps the last view, with its stderr line.

## 6. FR-4 — Waiting on you, and Now

**Decided 2026-11-07.** The top of the panel shows:

- **Waiting on you:** one block per `attention[]` entry, holding:
  - its kind and how long it has been open
  - its title and `body`, when present
  - the `reason.excerpt` lines in a monospace box, `hit` lines in full color and context lines dimmed
  - an **Answer** button for `block` and `ask` entries
- **The Answer button** opens PRD-001's `factory-answer` dialog with the props it already takes (`mods/factory-answer/main.js:15-23`):
  - `run: { id, feature, repo }` from the envelope
  - `question: { id, text: title, answer }` from that entry

  `answerCall` accepts only factory's own argv, with `answer` second (`mods/factory-answer/lib/answer.js:20-23`). So `attention[].answer` must be the same argv `status` gives, `--feature` included. Envelope `feature` is in the factory idea for this reason.
- **Now:** one line built from `now`:
  - `waitingOn` as its first word ("Waiting on gate")
  - `label`
  - since when
  - `progress` when present, e.g. "review 7/12"
  - `resumesAt` when set ("resumes 14:05"). Factory sets it for `quota` only; a budget park has no reset time
  - idle time
  - `decisions.count` ("14 decisions")
  - "driver dead" when `driverAlive` is false
  - "stopping, waiting on …" from `stopping`, which is `{on: worker|gate, what}`

**Accepted cost:** a handful of fixed words for factory's booleans and enums. Everything else is factory's text.

*Corrected 2026-11-07 (adversarial pass): an earlier draft said Answer passes "that question's argv". The dialog needs the run and a question object, and refuses an argv without `answer` second. It also listed fields for the Now line that never drew `waitingOn` or `resumesAt`, and claimed the panel adds no wording of its own.*

*Corrected 2026-11-07 (checked against factory 0.13.1's real `live` output): excerpts are arrays of `{text, hit}`, not strings. `resumesAt` is never set for a budget park. A park's reason is its `title`. Envelope `repo` is the path as stored, not `~`-relative, which is what the Answer dialog already takes.*

*Corrected 2026-11-07 (follow-up to PR #3): a block's `body` is markdown, not plain text: factory writes `**Happened:**`, `**Options:**` and `**Recommended:**` labels, inline `code`, a fenced transcript tail and a numbered options list. The panel renders a small subset (`mods/factory-run/lib/md.js`): `**bold**` spans bold, inline code in the terminal's font without backticks, a fenced block in the excerpt's monospace box, numbered and bulleted lines as list lines. Anything else, and any marker left open, is plain text. Titles, a park's reason among them, go through the same renderer; `reason.excerpt` lines do not.*

**Acceptance:**
- One screenshot per `waitingOn` fixture, each showing its word on the Now line.
- A quota park shows its `resumesAt`.
- A `park` entry shows its reason. Factory puts that text in the entry's `title`, and its `reason.excerpt` is null.
- A block with an excerpt shows it with its Answer button.
- A dead driver shows "driver dead".
- Answer on a fixture BLOCK opens the dialog titled with that id.

## 7. FR-5 — Agents

**Decided 2026-11-07.** One row per `workers[]` entry:
- its role and slice
- `doing.label`
- `narration`, dimmed
- "running 9m 30s" from `running.elapsedSeconds`, and "last write 12s ago" from `lastWriteAt`
- a dot for `alive`

The panel never calls a worker stuck. Factory gives no such verdict, and a 10 min silence inside one command is normal.

**Accepted cost:** rows can show null fields as blanks. Factory's stream reader treats Claude Code's format as not a contract, so `doing` and `narration` can be null.

**Acceptance:** a fixture with three workers, one with every derived field null, draws three rows without an error, in a screenshot.

## 8. FR-6 — Gate and CI reason, and the timeline

**Decided 2026-11-07.**
- **Gate:**
  - while it runs: attempt, command, elapsed and the last 8 `tail` lines
  - when red: the `excerpt` lines (`{text, hit}`, hits in full color), and "fix changed nothing" when `fixEmpty`
- **CI:** state, round, running checks, and the `excerpt` when red.
- **Timeline:** newest first. Each row has its time, its `label` and a dot in its `tone` color (`owner` blocked, `red` blocked, `green` done, `info` muted). Rows of tone `noise` are hidden. The list keeps at most 200 rows.

**Accepted cost:** the panel holds the timeline in memory, at most 200 rows. Hidden, it stays alive and keeps them. A run switch starts the new run's timeline without `--since`, which returns the last 100.

*Corrected 2026-11-07 (adversarial pass): an earlier draft said reopening asks for the last 100 again. Herdr keeps the hidden mod alive, so it keeps its timeline.*

**Acceptance:**
- A red gate fixture shows its excerpt and not its tail.
- A running gate shows the tail.
- A timeline fixture holding one `info` event and one `noise` event draws the `info` row only.

## 9. FR-7 — checkpoint screenshots

**Today.** herdr's `image()` loads only a path relative to the app home. `data/<mod>/…` draws, and an absolute path outside the home does not (scratch window, herdr-app 0.1.13, 2026-11-07; the log reads "asset … was not found").

**Decided 2026-11-07.**
- Copy only these files: `evidence` entries of `kind: image` that are `stable`, at most 4 MiB, at most the newest 24 per run.
- Copy them into `<HERDR_APP_HOME>/data/factory-run/shots/<runId>/<etag>.<ext>`:
  - with `cp -P` to a temporary name, then a rename
  - skipped when the target exists
  - dropped when the result is not a regular file
- The source path is `evidence.root` joined with `path`. Any path that leaves `root` is rejected.

  *Corrected 2026-11-07 (slice recon, factory 0.13.1): `evidence.root` is the run-relative `"evidence"` on every run, never absolute (factory PRD-024 slice 07), so `root` joined with `path` is not a path the mod can open. The source is `<runs dir>/<runId>/<root>/<path>`. The runs dir is `props().runs`, default `~/.local/share/factory/runs`: the prop and default `factory-spaces` already uses (`mods/factory-spaces/main.js:119`).*

- Shots are grouped by checkpoint, newest first. Each shows its `caption`, under a thumbnail as wide as the panel. Non-image evidence shows as a list of names and sizes.
- A run's `shots/<runId>/` is removed when its id is no longer in `factory.spaceRuns.recent`. A dismissed run is still on factory's recent list, so its shots stay until factory drops it.

**Accepted cost:** disk for copies, up to 24 images per recent run. Shots go under `data/`, never `mods/`: the owner's personal mods are links into Dropbox, and a reinstall replaces `mods/`.

**Acceptance:**
- A fixture with three PNGs draws three thumbnails with captions, in a screenshot.
- A fixture holding one valid image, one entry whose `path` holds `..`, and one symlink leaves exactly one file in `data/factory-run/shots/<runId>/`.
- That file's mtime is the same across two polls with the same `etag`.

## 10. Decisions log

- ~~OPEN-1, factory ships `factory live` schema 1~~: closed 2026-11-07. Factory PRD-024 shipped it in 0.13.1 (factory PR #16, `0c62732`). §5 to §9 were re-checked against its output on 8 real runs; the four differences are corrected in §6 and §8.
- ~~Opening~~: decided 2026-11-07, a Run button in the tab bar (owner's pick), over a strip click or a key.
- ~~Source~~: decided 2026-11-07, factory exposes a contract (owner's pick), over reading run files.
- ~~Sections~~: decided 2026-11-07, Waiting on you and Now, Agents, Gate and CI with the timeline, and Screenshots (owner's pick). Decisions show as a count only, on the Now line (§6).
- ~~The cut~~: decided 2026-11-07. Both extras were kept: the run chips (§4) and the shot cleanup (§9).
- **Adversarial pass, 2026-11-07.** `factory review second`, grok-4.7-high, 812 s. It found 16 breaks, all corrected inline. Among them:
  - the `tabs` drift entry
  - the Answer dialog's props, which also added envelope `feature` to the factory idea
  - two wrong cites
  - the reopen claim
  - the shot-deletion rule defined two ways
  - the upgrade line catching every exit
  - `waitingOn` and `resumesAt` not drawn
  - three acceptance criteria with no surface (noise, `..`, repeated etag)

  None was rebutted.

## 11. QA plan

**Gate**: `make gate`, inner loop `make inner`.
**Surface**: the herdr-app window, the factory layout.
**Harness**: PRD-001's `verify-herdr-factory`. Its `VERIFY_HERDR_INPUT=x11` mode clicks and types (PRD-001 AD-11), which is enough for the Run button and Answer.
**Seed state**: PRD-001's fixture repos and runs, plus a fake factory, `tests/fixtures/fake-factory-live.sh`. It is passed in through the layout's `factory` prop and answers `live` from canned JSON files, one per section case. It is built from the contract, not from a real run, so fixtures never depend on the machine's runs folder. Each canned file copies the field shapes of factory 0.13.1's real output: `factory live <id> --json` on any finished run shows them.

| FR | Proof on the real surface | Evidence | Human? |
|---|---|---|---|
| FR-1 | click Run with `bin/input.sh`, screenshot; click again; switch space and back; `install.sh` against a changed `tabs` hash | PNGs, install transcript | no |
| FR-2 | two fixture spaces, switch between them; a space with two runs, click the second chip; run the key-written-on-change unit test | PNGs, test transcript | no |
| FR-3 | fake factory appending an event after 3 s, its call log, and a screenshot 2 s after the answer; hide the panel and read the call log; fake exit 2 and exit 1 | call log, PNGs | no |
| FR-4 | one screenshot per `waitingOn` fixture; Answer opens the dialog | PNGs | yes: does the top read in five seconds |
| FR-5 | three-worker fixture with a null worker | PNG | no |
| FR-6 | red gate, running gate and noise timeline fixtures | PNGs | no |
| FR-7 | three-PNG fixture; one fixture holding a valid image, a `..` entry and a symlink, then `ls -la` of `data/factory-run/shots/<runId>/`; `stat` mtime across two polls | PNG, `ls -la` and `stat` transcripts | yes: are thumbnails big enough to judge |

## 12. Slices

Six slices. Two independent ones first, then four branches off the second.

- **01 — Fake factory for live** (seed state, §11): `tests/fixtures/fake-factory-live.sh` answers `live` from canned cases in `tests/fixtures/live/`, one per QA row that names a fixture, and passes every other call to PRD-001's fixture wrapper. It logs each call's time, and writes the evidence files the screenshot cases list. It also writes the harness recipe `features/run-panel.md`. No product change and no Prove rows: its own test runs in the gate.
- **02 — Run button, the shown run and the live loop** (FR-1, FR-2, FR-3; the spine, highest risk): the `factory-tabs` clone with Run, the layout's `run` slot, the `tabs` drift record, `factory.spaceRuns` written on change, run choice and chips, and the `live` loop with its held timeline (the 200-row cap of FR-6). It lays out one section file per later slice (`mods/factory-run/sections/{now,agents,gate,shots}.js`) as stubs, so the branches never edit the same file.
- **03 — Waiting on you and Now** (FR-4), **04 — Agents** (FR-5), **05 — Gate, CI and the timeline** (FR-6, and FR-3's timeline screenshot), **06 — Checkpoint screenshots** (FR-7): each fills its own section file and its own `lib/` file. They depend on 02 only and are mutually independent.

**Order.** 01 and 02 run in parallel and land first, so the first checkpoint proves FR-1 to FR-3 on the fake before anything is drawn on them. 03 to 06 then run three at a time (`lanes = 3`).

**Checkpoints**, every 2 done slices: after the 2nd (01 and 02), after the 4th and after the 6th. Each drives the Prove rows of the slices it covers through `verify-herdr-factory` with `VERIFY_HERDR_INPUT=x11`, plus the full gate.

**Workflow.** One branch, `feat/run-panel`, one PR, one commit per slice, Prove at the checkpoints. `qa-guide.md` holds the two Human rows: FR-4's five-second read and FR-7's thumbnail size.

## 13. Non-goals

- **Reading factory's run files** (`driver.log`, transcripts, gate logs, `evidence/` listings) from the mod. Lost to the contract, 2026-11-07.
- **A transcript viewer.** Transcripts hold secrets and run to 9.4 MB (factory idea, Why).
- **A cost meter or an ETA.** Nothing measures one.
- **Not handled: enlarging a screenshot.** No evidence yet that a panel-wide thumbnail is too small, and the panel resizes to 900 px. Reopen if the FR-7 human check says so.
- **Not handled: a "stuck" verdict on a worker.** Long silences are normal, and factory gives none.
- **Not handled: the panel in Herdr's `main` layout.** Only the factory layout has `factory-tabs`.

## 14. Verification notes

Checked 2026-11-07 on `main` after PRD-002, herdr-app 0.1.13, factory 0.13.0. **Re-verify at slice entry**, against the factory release that ships `live`.

Re-verified 2026-11-07 at slicing, on `feat/run-panel`, herdr-app 0.1.13, factory 0.13.1: every cite below holds, and the `tabs` hashes in §3 match `installed.json`. The one falsified claim, `evidence.root`, is corrected in §9.

- `~/.config/herdr-app/mods/tabs/main.js:17`, `:22-46`: the per-space panel choice in `localStorage` `panels`. **The trap:** `syncPanel` keeps a stored choice only when `enabled` includes it (`:29`). The clone must count `run` as always enabled, or a space switch hides the Run panel.
- `~/.config/herdr-app/mods/tabs/main.js:80-98`: `enabled` from `workspace.panels`, the panel buttons, and Files and Changes drawn only when listed.
- `layouts/factory.json:136-165`: the hidden `panel` column, `panel-body` stack, `files` and `changes` children.
- `install.sh:51-76`, `upstream.json`: the drift check records the spaces mod and main layout only today.
- `mods/factory-spaces/main.js:391`: `this.lanes = bySpace(…)` over undismissed status, in strip order.
- `mods/factory-spaces/main.js:675-680`: the strip's Answer opens `factory-answer` with the run and its first question.
- `mods/factory-spaces/main.js:119-122`: `watchFolder` runs on `~/.local/share/factory/runs`, outside the app home. *Corrected 2026-11-07: an earlier draft cited `:116` and attributed this to PRD-001 AD-12, which is the wake filter.* The panel does not use a watch; it uses `--wait`.
- `mods/factory-answer/main.js:15-23`, `lib/answer.js:20-23`: the dialog's props are `run` and `question`, and `answerCall` returns null unless argv[1] is `answer`.
- `install.sh:65-67`: the drift check compares whole `installed.json` entries.
- `~/.config/herdr-app/AGENTS.md`, Mods: a copy stays alive while its block is in the layout, shown or not; its timers keep running.
- `herdr.d.ts:10-13`: `exec()` 30 s limit, 8 MiB output.
- `image()` draws `data/imgtest/shots/a.png` and refuses an absolute path, both inside and outside the home (scratch window, 2026-11-07).
- `~/.config/herdr-app/mods` holds symlinks into Dropbox for personal mods (`open-nvim`, `open-lazygit`).
