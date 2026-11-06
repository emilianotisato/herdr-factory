# Retro — PRD-001

Written by `/deliver` in the closeout commit, from the agent's side of the run.

**The point is cost next to catch.** An agent asked only about friction votes to cut every check, because every check costs it time. A verdict with an empty Caught column is a preference, not evidence.

## Cost vs catch

| Step | Cost | Caught | Verdict |
|---|---|---|---|
| Inner loop, per slice | seconds per run (the test tier is under 1 s); run counts per slice are not in the transcripts | nothing red reached a checkpoint | keep |
| Checkpoints (full gate) | 2 runs, 0 red, about 4 s each | nothing | keep: it is cheap. Its silence shows the gate does not reach the view code in `factory-spaces/main.js` (see Project friction), not that the code was clean |
| Prove, at checkpoints | the most expensive step: 7 FR rows, 14 strip PNGs, and a private X display built mid-run (AD-11) to click and type | FR-6's resolved-answer path and the toast click were only reachable once input existed. No Prove row failed | keep |
| Polish — local review | one forked review, about 10 findings | the most real defects: the `--recent` fallback that undid every dismissal, a failed poll blanking the sidebar, the watch storm from worker writes, × on mouse-up, a re-finished run hidden by an old dismissal, the dialog closing mid-send, stale install items | keep |
| Polish — security pass | one subagent, about 2 min | 4 low findings, 3 fixed: the scratch root not owner-checked, cleanup's always-true delete guard, the answer program read from the status. Nothing high | keep. The diff builds shell commands and deletes paths, so the row applies |
| Polish — UX pass | one subagent, about 7 min of driving on a private X display, ~30 PNGs | the Answer dialog clipping its buttons on a two-line error, and a stray separator on the building strip. The rest was taste (AD-17) | keep |
| Polish — second opinion (grok-4.7-high) | 12 passes, 11,872 s of pass time in total | agreed with the local review on the `--recent` fallback. It alone found: a stopped run with a PR drawn as failed, doctor dying under `set -e`, a rejected watch never retried, the gauge turning red at the limit, the interrupted-install refusal, four harness recipe errors. False positives: the types and shell tiers "check no files" (git pathspecs match `/`), and `failureLine` contradicting FR-6 | tune: passes 7 (`mod.json`, 1 line, 580 s) and 8 (`package-lock.json`, 592 s) found nothing and cost 20 minutes. Fold one-line files into a neighbouring pass, and skip lockfiles |
| prune | a few minutes | one test pair merged; the "alerts once" and fixture-stop tests tightened from counting to exact values | keep |
| Leaks check | seconds | clean at polish. At the checkpoints it turned fixture `BLOCK-1` ids into `Q-1` | tune (see Framework friction) |

## Where I guessed

- **FR-3, "once at once when anything changes under factory's runs folder"** (`prd.md` §6). Taken literally, it means a `factory status` per worker transcript write. I narrowed it to `state.json` and `events.jsonl` and flagged it `decide` (AD-12). The acceptance still passes, re-driven.
- **AD-4 against FR-3's redraw rule.** AD-4 took the plain listing as a run list. That met "a second failure draws nothing", but on 0.13.0 it threw away the finished runs FR-7 depends on. I changed it to "no answer keeps the last drawing" (AD-13).
- **`autonomy.md` § Mapping, "taste always lands here"**, with no `docs/ux-rubric.md` to judge against. I kept every UX taste finding as built and logged them as one entry (AD-17), rather than restyle blind.
- **`/polish` § 1, which `code-review` level to use.** The skill says to invoke it, and the code-review skill forbids `max` unless asked, so I ran `high`.
- **`/polish` § 8, "set `reviewed` in the PRD's frontmatter"**, against the contract's `factory docs set 001 reviewed=`. I followed the contract and left the frontmatter alone.

## What I wished existed

- `herdr.d.ts` saying whether `watchFolder` reports file paths or folder paths. AD-12's filter depends on it, so I had to prove it in the window.
- Pointer hover in `bin/input.sh`. The UX pass could not see ×'s or Answer's hover state.
- A `docs/ux-rubric.md`, even a short one: six of the UX pass's findings were judgment with nothing to judge against.

## Project friction → `/gate audit`

- **The types tier skips `mods/factory-spaces/main.js` whole**, because it is on the cloned list, and that file now holds about 150 lines of factory code. Every view-side defect the review found (the watch storm, × on mouse-up, a failed poll blanking the sidebar) sat in code no gate tier typechecks or formats. Parked as an idea: move the glue into a lib module.
- **`scripts/gate/test.sh` reads `COVERAGE_LINES`** and lets it replace the 90 % floor, while `docs/reference/verification.md` says the floor is 90 and only `SKIP_AUDIT` is skippable. Nothing uses it. It is a floor any environment can lower, so an audit should drop it or document it.

## Framework friction → factory

- **`factory review second` splits by line count, not by worth** (`/polish` § 1, `[review] pass_lines`). A one-line `mod.json` got a pass to itself, and so did `package-lock.json`. Together they cost 1,172 s and found nothing.
- **The leaks rule reads factory's own question ids as plan ids.** At the checkpoints it turned fixture `BLOCK-1` ids into `Q-1`, which factory never emits. The second opinion then flagged `tests/fixtures/status-0.13.0.json:66` (`"id": "Q-1"`) as an unrealistic payload. A protocol's own identifiers are not plan leaks.
- A comment the leaks check should have caught as stale, though it is not a plan name: `eslint.config.js:24`, `// Herdr's own code, kept byte-identical so a re-clone diffs cleanly.` It was true when written and false one slice later. A comment that makes a claim about another file needs a reader, and the local review was the one that caught it.

## Score

4: every FR proven in the window, no block, and the review caught real defects at a fair cost. The point lost is the second opinion's 20 minutes on two passes with nothing to review, and a gate that never looked at the file where most of the bugs were.

## Numbers

<!-- factory:numbers -->
| role | workers | own | subagents | weighted | minutes | turns |
|---|---:|---:|---:|---:|---:|---:|
| build | 5 | 2695848 | 0 | 2695848 | 27 | 170 |
| merge | 1 | 47445 | 0 | 47445 | 1 | 7 |
| checkpoint | 2 | 1561268 | 0 | 1561268 | 15 | 102 |
| polish | 1 | 1463514 | 1444518 | 2908032 | 15 | 60 |
| total | 9 | 5768074 | 1444518 | 7212592 | 57 | 339 |

Knobs: build opus/high default · fix opus/high default · checkpoint opus/high default · polish opus/high default · budget 30000000 default · lanes 3 · factory 0.13.0 · claude 2.1.316

Hypothesis: none

quality: gate_red 0 · worker_gate_red 0 · fix_commits 0 · ci_red_rounds 0 · ci_reruns 0 · findings high=0 medium=13 low=36 fixed=27 parked=2 · decisions 17 decide 2 blocks 0

Pack (build): slice 5146 · prd_sections 2837 · log 3574 · outline 1536 · lookup 1115 · contract 3095 · autonomy 8610 · inner_loop 25 · total 25938 · start_context 17104

Compared with: No earlier retro in this repo.
<!-- /factory:numbers -->
