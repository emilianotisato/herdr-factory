---
number: 001
slug: factory-cockpit
title: "Factory cockpit in the herdr-app spaces sidebar"
type: feature
created: 2026-11-06
author: Emiliano Tisato
summary: |
  Each repo's space in the herdr-app sidebar shows its factory runs live: a segmented slice bar, phase, elapsed, budget, last gate, then PR and CI once shipped. A question that opens raises a toast and a sound once, and an Answer button opens a dialog whose Send runs `factory answer`. Coworkers get it with `./install.sh`, which never touches their settings or keys. Agreed 2026-11-06, nothing cut. The factory fields shipped in factory 0.13.0 (PRD-023); waits only on a verify gate.
---

# PRD-001 — Factory cockpit in the herdr-app spaces sidebar

## 1. Why now

The owner moved from the herdr TUI to herdr-app (0.1.13, installed 2026-11-06) and runs factory in several repos at once. Today a run is visible only inside the Claude Code cockpit session of that repo: the status line, the band and `/factory-board` from factory PRD-013. With ten repos open as spaces, nothing in the window says which one is building, which one is waiting on the owner, or which one just shipped. A BLOCK can sit unanswered until the owner happens to look at that repo's cockpit.

herdr-app redraws itself from files under `~/.config/herdr-app` and takes JavaScript mods (`~/.config/herdr-app/AGENTS.md`), so the window itself can carry the cockpit. Coworkers who use factory want the same window without inheriting the owner's personal settings.

Left alone: the agents list, the Claude Code cockpit mod, and every personal file. The owner's own settings and keys sync between his two PCs through Dropbox, outside this repo (`~/Dropbox/dev/herdr-app/link.sh`).

## 2. Blast radius

- **A coworker's `~/.config/herdr-app`.** `install.sh` writes our layout and mods there and switches the window to our layout (FR-1). Herdr's own escape hatch, `ctrl-alt-shift-escape`, always returns to the shipped `main` layout (`AGENTS.md`, "Changing things safely").
- **The cloned spaces mod stops getting Herdr's fixes.** Herdr replaces its shipped mods whole on every start; a clone is never updated (`AGENTS.md`, "Layouts"). FR-2 makes the drift visible instead of silent.
- **One `factory` process per tick per open window.** A board costs about 27 ms (measured 2026-11-06, one finished run). `list_runs` reads every `state.json` (factory `src/run.rs:545`); there are 67 run folders on the owner's machine today.
- **The factory status JSON becomes a contract with a second reader.** PRD-001 reads the fields of §3 and refuses a factory older than the one that ships them (FR-3).

## 3. Prerequisite — the factory status fields

Decided 2026-11-06: **factory ships first, and PRD-001 is built against the real fields.** The rich row (FR-4) cannot be drawn from today's JSON without parsing prose, and a throwaway parser lost.

Today `factory status --json` carries `id`, `feature`, `phase`, `line`, `owner`, `board` per run (factory `src/cli/status.rs:43-50`). Most of what FR-4 draws is prose inside `board`: slices, budget, checkpoints, the last gate, the PR. The question text is a rendered `owner` string. There is no PRD title, and CI is only an event name on the `last:` line. A run leaves the listing the moment it is over (`live_runs`, factory `src/cockpit.rs:311-316`). The gaps are filed in the factory repo as idea `2026-11-06-feed-a-herdr-app-cockpit-from-factory-status` (factory commit `86f34fd`).

PRD-001 needs, per run, from one `factory status --json` call with no `--here`:

- the repo path and branch;
- the feature number and its PRD title;
- the phase, start time and elapsed;
- each slice's number and status (pending, building, done, blocked);
- weighted tokens used and the budget;
- checkpoints done and the last gate result, red or green;
- the PR URL and the CI state once shipped;
- each open question apart: its id, its slice and its text;
- the pause end, the park reason, whether the driver is alive;
- the last event's sequence number;
- runs that ended in the last 7 days, besides the live ones.

The exact shape is factory's call. The builder reads the shipped schema at slice entry and writes it into §15, Verification notes.

*Corrected 2026-11-06 (adversarial pass): an earlier draft said "writes it into §8", which is FR-5.*

**Accepted cost:** PRD-001 cannot start until that factory release exists.

**Shipped 2026-11-06 in factory 0.13.0** (factory PRD-023, commit `82f770a`). `schema` stays 1 and the prose fields stay, so the Claude Code cockpit mod needs no change. `--recent` adds the runs that ended in the last 7 days. The fields are in §15. Two gaps remain, filed by factory's polish as idea `2026-11-06-status-json-for-the-herdr-cockpit-full-question-te`: a question's `text` is the block's title only, and `seq` counts events only. FR-3 and FR-6 below take both into account.

## 4. FR-1 — `install.sh`

Today the repo holds only the docs framework; nothing installs anything.

**Decided 2026-11-06.** `./install.sh` copies our layout (`layouts/factory.json`) and our mods (`mods/factory-*`) into `$HERDR_APP_HOME`, default `~/.config/herdr-app`, then runs `herdr-app do layout.switch --name factory` when the app is running. `./install.sh --dev` symlinks the same files instead, so the owner's edits show live. Re-running it upgrades.

It never writes `settings.json`, `keys.json`, `programs.json`, `themes/`, or any mod or layout that is not ours. It refuses to replace a `mods/factory-*` folder or a `layouts/factory.json` it did not write, and says which. It does not need the app to be running; without it, it installs and says to pick the layout once.

**Accepted cost:** two install paths to keep working. Copy-only lost because the owner would re-run install after every edit. Symlink-only lost because a broken `git pull` would break every coworker's window.

**Acceptance**: on a scratch `HERDR_APP_HOME` holding a `settings.json` and a `keys.json`, `./install.sh` then `./install.sh` again leaves both byte-identical, and `herdr-app check` passes on every installed mod. With `--dev`, every installed path is a symlink into the checkout. With a foreign `mods/factory-spaces/` present, it exits non-zero, names it and writes nothing.

## 5. FR-2 — the factory layout and the cloned spaces mod

Today the shipped `main` layout draws the sidebar as `sidebar → sidebar-lists → spaces` with `{ "mod": "spaces" }` (`~/.config/herdr-app/layouts/main.json`). The spaces mod is 465 lines (`mods/spaces/main.js`). It already resolves each space's git repo through `git rev-parse --git-common-dir`, and nests worktree spaces under their main checkout (`check()` and `ordered()` in that file).

**Decided 2026-11-06.** `layouts/factory.json` is Herdr's `main` layout, unchanged except that the `spaces` block uses `factory-spaces`. `factory-spaces` is Herdr's spaces mod plus the run strip of FR-4. The layout sets no `theme`, `font` or `colors`, so each person's look applies (`AGENTS.md`, "The look").

The repo records the `herdr-app --version` and the `installed.json` hash of `spaces/main.js` the clone came from. `install.sh` compares that hash with the person's `installed.json` and warns when they differ, naming the recorded version and the person's `herdr-app --version`. `installed.json` holds hashes only, no versions.

**Accepted cost:** every Herdr release that changes the spaces mod means a manual re-clone and re-apply of the strip. A separate Runs block lost because the owner wants the run on its space row.

**Acceptance**: with no factory run anywhere, the factory layout draws the sidebar exactly as Herdr's `main` does, compared by screenshot. With a recorded hash that differs from `installed.json`, `install.sh` prints a warning naming the recorded and the running herdr-app version, and still installs.

## 6. FR-3 — one call, mapped to spaces

**Decided 2026-11-06.** `factory-spaces` runs `factory status --json --recent` once every 10 s while the window is in front, and once at once when anything changes under factory's runs folder (`watchFolder`, `herdr.d.ts`). A run belongs to the space whose git top level (`git rev-parse --show-toplevel`, which the spaces mod already runs in `check()`) equals the run's repo. factory records a run's repo the same way (factory `src/paths.rs:170-190`). A worktree space, including a factory lane opened as a space, has its own top level, so the run shows on the main checkout's row only.

*Corrected 2026-11-06 (adversarial pass): an earlier draft matched on the git common dir. Every linked worktree shares the main checkout's common dir, so that rule put the strip on every lane row too, and contradicted its own next sentence.*

When `factory` is missing, the strip is not drawn and nothing else changes. When `factory` is older than the release of §3, each space with a repo shows one dim line: `factory too old · factory upgrade`. `schema` is still 1 on both sides of that release, so "older" means the envelope's `factory` version is below 0.13.0. Each poll redraws from the whole payload and never skips one because `seq` did not move: budget, PR and pause change `state.json` without an event.

**Accepted cost:** one process every 10 s per window, about 30 ms each at today's 67 run folders.

**Acceptance**: with fixture runs for two repos open as spaces, each run shows on its own space and nowhere else. A run whose repo has no space shows nowhere. Appending a `slice_blocked` event to a fixture run's `events.jsonl` moves its strip to the owner-needed state within 2 s.

## 7. FR-4 — the run strip

**Decided 2026-11-06.** Under a space's name, one strip per run of that repo:

| state | first line | second line |
|---|---|---|
| building | `019 platform-runtime` · `3/5` | segmented slice bar · phase · elapsed |
| owner needed | `019` · `BLOCK-1 open`, in the theme's `blocked` color | the question text, truncated · **Answer** |
| paused | `019` · `paused until 14:30` | the slice bar, dimmed |
| parked | `019` · `parked: budget` | the slice bar, dimmed |
| driver dead | `019` · `driver dead`, in `blocked` | `factory run 019` |
| shipped | `019` · `shipped` | `PR #100` · CI green, red or pending · **×** |
| failed | `019` · `failed`, in `blocked` | elapsed · **×** |

Each live strip also shows the budget as a thin gauge, weighted tokens used over the limit, and the last gate as a dot. The slice bar has one segment per slice, colored by the theme's names: `done` done, `working` building, `blocked` blocked, `dim` pending. All colors are theme names, so the strip fits light and dark themes (`theme()`, `herdr.d.ts`).

In the narrow rail (sidebar under 160 px), a space shows one dot after its number, in the color of its most urgent run.

**Accepted cost:** the row grows from one line to three for a space with a run, so fewer spaces fit without scrolling.

**Acceptance**: fixture runs in each state of the table render as the table says, at zoom 1 in a 268 px sidebar, without the slice bar truncating at 10 slices. Each state is captured in a light and a dark theme.

## 8. FR-5 — alerts

**Decided 2026-11-06.** When a question id appears that this screen has not alerted on, `factory-spaces` posts a toast: title `019 needs you`, body the question, level `warning`, action `space.select` on that space. It plays the `blocked` sound (`notify`, `playSound`, `herdr.d.ts`). Each id alerts once per screen, remembered across restarts in the mod's `localStorage`. The decision to alert is a pure function of the ids seen and the ids now open, so a unit test can count it.

**Accepted cost:** two windows on two screens both alert.

**Acceptance**: opening a BLOCK in a fixture run shows one toast in the window. A unit test pins that the alert function asks for one toast and one sound per new id, and none for an id already seen. Restarting the app does not show the toast again. Clicking the toast selects that space.

*Corrected 2026-11-06 (adversarial pass): an earlier draft accepted on "plays the sound once". `playSound` returns nothing and a screenshot has no sound, so nothing could check it on the window.*

## 9. FR-6 — answer from the window

**Decided 2026-11-06.** **Answer** opens a dialog, `factory-answer`, built like Herdr's `prompt` mod (`mods/prompt/main.js`): the run, the question in full, a text input, Cancel and Send. Send runs the question's `answer` argv with the typed text appended, with the run's repo as the folder. factory builds that argv with the flag before the id, `factory answer --feature 007 BLOCK-3` or `--run` for an ASK (factory `src/cli/status.rs:287-295`), because the answer text is a trailing argument (`src/cli/answer.rs:21`).

The dialog shows the question's `text`, which is the block's title, at most 160 characters. The options and the recommendation are only in the feature's `log.jsonl`. Decided 2026-11-06: the dialog shows the title and a dim hint, `full question: factory status <run id>`. **Accepted cost:** for a question with options, the owner reads them in a terminal before answering. Reading `log.jsonl` from the mod lost because it parses factory's internal format. A factory field lost for now; it stays open as factory's idea. On exit 0 the dialog closes and a `success` toast says it was sent. Otherwise the dialog stays open with the text kept and factory's first output line under the input, from stdout, else stderr. An already resolved id is reported on stdout with exit 1 (factory `src/cli/answer.rs:192-193`).

*Corrected 2026-11-06 (adversarial pass): an earlier draft put `--feature` after the text and read the error from stderr only. Both were wrong.*

**Accepted cost:** an answer typed here is not seen by the cockpit session until its next `factory wait`. That is how `factory answer` from any terminal works today.

**Acceptance**: answering a fixture BLOCK from the dialog writes `<run>/answers/BLOCK-n.json` (factory `src/answers.rs:30-35`), and the strip leaves the owner-needed state within 2 s. Answering an id that is already resolved keeps the dialog open with factory's `already resolved` line.

## 10. FR-7 — dismiss a finished run

**Decided 2026-11-06.** A shipped or failed strip stays until its **×** is clicked. Dismissed run ids are kept in the mod's `localStorage` on this screen. Runs older than the 7 days of §3 drop out by themselves.

**Accepted cost:** dismissing on one PC does not dismiss on the other.

**Acceptance**: clicking × on a shipped fixture run removes its strip, and it stays gone after a restart. A second shipped run on the same space still shows.

## 11. Decisions log

- ~~Placement~~ — decided 2026-11-06: inside each space row, by cloning Herdr's spaces mod.
- ~~Insight level~~ — decided 2026-11-06: rich live run. History trends are out (§14).
- ~~Actions~~ — decided 2026-11-06: alert, jump and answer. Stop and log buttons are out.
- ~~Install~~ — decided 2026-11-06: copy by default, `--dev` links.
- ~~Sequencing~~ — decided 2026-11-06: factory's fields first.
- ~~Finished runs~~ — decided 2026-11-06: until dismissed, within 7 days.
- ~~Look~~ — decided 2026-11-06: the person's theme, theme color names only.
- ~~Proof~~ — decided 2026-11-06: harness slice first.
- ~~The cut~~ — decided 2026-11-06: all four small extras kept: the drift warning (FR-2), the factory-too-old line (FR-3), instant refresh (FR-3) and the rail dot (FR-4).
- **Adversarial pass, 2026-11-06.** `factory review second`, grok-4.7-high, 699 s. Five breaks found and corrected inline: the answer argument order, the resolved-id output stream, the run-to-space rule, the §8 pointer, the uncheckable sound criterion. One rebutted: "FR-4 is human, so the run cannot close it". The run proves FR-4's mechanics with screenshots; the human row only feeds the post-run QA guide.

## 12. QA plan

**Gate**: none declared. Run `/gate` before slicing. Candidates on this machine: `shellcheck`, `node --test` over the pure functions (state to strip, run to space), `herdr-app check` per mod.
**Surface**: the herdr-app window.
**Harness**: none. The first slice builds `.claude/skills/verify-herdr-factory/` via `/harness`. It launches a second herdr-app with a scratch `HERDR_APP_HOME`, points factory at fixture runs with `FACTORY_DATA_DIR`, drives it with `herdr-app do`, and saves `herdr-app shot` PNGs. `factory-spaces` takes the factory command from its layout props (`"props": { "factory": "factory" }` by default), so the harness's scratch layout names a wrapper that sets `FACTORY_DATA_DIR`. That holds whether or not `exec` forwards the app's environment. If a second window will not open on a scratch home, the harness installs into the real home under a test layout name and switches back after.
**Seed state**: fixture run folders, one per FR-4 state, recorded from real runs and rewritten to the §3 schema.

| FR | Proof on the real surface | Evidence | Human? |
|---|---|---|---|
| FR-1 | run `install.sh` twice, then `--dev`, then over a foreign mod, on a scratch home | transcript, `ls -la`, `cmp` of settings and keys | no |
| FR-2 | screenshot of the factory layout and of `main` with no runs; install with a stale recorded hash | two PNGs, warning transcript | no |
| FR-3 | two fixture repos opened as spaces; append an event | PNGs before and after, timing | no |
| FR-4 | one fixture run per state, light and dark | 14 PNGs | yes: the look |
| FR-5 | open a BLOCK in a fixture; restart; click the toast; run the alert unit test | PNGs of the toast and the selected space, test transcript | no |
| FR-6 | answer a fixture BLOCK, then a resolved one | PNGs, `answers/BLOCK-n.json` | no |
| FR-7 | dismiss a shipped run, restart | PNGs | no |

## 13. Slices

Five slices, sliced 2026-11-06 from `/deliver`. One branch, `feat/factory-cockpit`, one PR, one commit per slice; Prove rows are driven at the checkpoints.

- **01, the harness**, goes first because the QA plan says so: a skill that opens a herdr-app window on a scratch home, fixture runs for every FR-4 state, and a factory wrapper. It writes no product code.
- **02, the spine**, is FR-1 and FR-2: the verbatim clone of Herdr's spaces mod, the `factory` layout, `install.sh` with `--dev` and the drift warning. It is independent of 01, so the two build in parallel, and checkpoint 1 proves both.
- **03, runs on their spaces**, is FR-3 and FR-4 together, because both are the data and the drawing of one strip in the same cloned file. It carries the risk: rows stop having a fixed height.
- **04, alerts and dismiss**, is FR-5 and FR-7, both per-screen memory over the strips. Checkpoint 2 falls after it.
- **05, answer**, is FR-6: a new dialog mod plus the strip's button. It is independent of 04, so they can build in parallel; checkpoint 3 closes the feature.

The only human row is FR-4's look, in `qa-guide.md`.

## 14. Non-goals

- **The agents list and Herdr's own alerts.** Unchanged; factory workers are headless `claude -p` processes, not terminals, so they never were agents there.
- **Personal settings.** Never in this repo. The owner's sync lives in `~/Dropbox/dev/herdr-app`.
- **The factory status fields.** Built in the factory repo, from its idea; this PRD only reads them.
- **History trends per repo.** Not chosen at the interview, 2026-11-06. Revisit if the owner asks why a repo's runs are getting slower or costlier.
- **Stop and log buttons.** Not chosen, 2026-11-06: misclick risk on a running run.
- **Closing a run by its PR merging.** Not chosen, 2026-11-06: a `gh` call per run per tick and auth on every machine.

## 15. Verification notes

Checked 2026-11-06 against herdr-app 0.1.13, hc 0.1.18, and the factory tree at `86f34fd` (`Cargo.toml` 0.12.1; the installed binary is 0.12.0). Factory re-checked the same day at `df3a82d`, release 0.13.0.

- factory 0.13.0 `status --json --recent`, per run (`src/cli/status.rs:50-104`, camelCase): `id`, `feature`, `phase`, `line`, `owner`, `board`, `repo`, `branch`, `slug`, `title`, `startedAt`, `updatedAt`, `elapsedSeconds`, `seq`, `slices` (`[{n, status}]`, status `pending`/`building`/`done`/`blocked`, null when the board will not open), `budget` (`{used, limit}`), `checkpoints` (`{done, lastGate}`, `green`/`red`/null), `pr`, `ci` (`green`/`red`/`pending`/`none`/null), `pausedUntil`, `parked`, `driverDead`, `stopped`, `questions` (`[{id, at, n, text, answer}]`). Envelope: `{schema: 1, factory: "0.13.0", runs}`. 24 runs returned on 2026-11-06 with `--recent`. **Re-verify at slice entry.**

- `~/.config/herdr-app/layouts/main.json` — the sidebar's spaces block is `{ "mod": "spaces" }` under `sidebar-lists`.
- `~/.config/herdr-app/mods/spaces/main.js` — `check()` runs `git rev-parse --git-common-dir`; `ordered()` nests linked worktrees under their main checkout.
- `~/.config/herdr-app/installed.json` — holds a hash per shipped mod file, e.g. `spaces` → `main.js`.
- `~/.config/herdr-app/herdr.d.ts` — `exec` has a 30 s limit and an `on` option; `notify`, `playSound`, `watchFolder`, `theme`, `openOverlay` exist as used above.
- `~/.config/herdr-app/mods/prompt/main.js` — a dialog with `InputState` and `Input` from `gpui-base`.
- A symlinked mod folder passes `herdr-app check` (tested 2026-11-06). Rendering one inside a layout is not yet tested.
- Not yet verified, for the harness slice: that a second herdr-app opens with another `HERDR_APP_HOME`. Whether `exec` forwards the app's environment no longer matters: the layout props name the factory command (§12).
- factory `src/paths.rs:170-190` — a run's repo is `git rev-parse --show-toplevel`; `mods/spaces/main.js:212` runs the same.
- ~~factory `src/cli/status.rs:43-50` — `RunJson` has no repo, slices, budget, gate, PR or structured questions.~~ True at `86f34fd`; fixed by 0.13.0.
- factory `src/cockpit.rs:311-316` — `live_runs` drops runs whose phase is over.
- factory `src/cli/answer.rs:21` — the text is `trailing_var_arg`, so flags go before the id; `:192-193` prints `already resolved` on stdout and exits 1.
