# Run actions

What the owner does with a run from the sidebar: a question that opens raises a toast that selects its space when clicked, a shipped or failed strip goes away for good with its ×, and the owner-needed strip's **Answer** opens a dialog that sends the answer to factory. The toast and the × are remembered per screen in `factory-spaces`'s `localStorage`, `<scratch>/home/data/factory-spaces/store-*.json`.

## Sub-features

- `alert-toast` one `NNN needs you` toast per question this screen has not seen, at start-up too.
- `alert-click` clicking the toast selects the run's space.
- `alert-restart` after a restart, a question already alerted on raises nothing.
- `dismiss` × hides that strip only; it stays hidden after a restart.
- `answer-send` Answer, type, Enter or Send: `answers/BLOCK-n.json`, a `success` toast, the strip leaves owner needed.
- `answer-refused` a refusal keeps the dialog and the text, with factory's line under the input.

## How to get to it (user POV)

- The toast, bottom right, a few seconds after the question opens.
- × at the end of a shipped or failed strip's second line.
- **Answer** at the end of an owner-needed strip's second line; Esc or Cancel closes the dialog.

## Driving it with herdr-app do

Preconditions:

- `VERIFY_HERDR_INPUT=x11 bin/launch.sh <run>`, doctor passes with an `input:` line.
- The factory layout with fixture props: copy the checkout (`git ls-files -co --exclude-standard`) into `<scratch>/checkout`, set the `factory-spaces` block's `"props": { "factory": "<scratch>/fixtures/bin/factory", "runs": "<scratch>/fixtures/data/runs" }` in its `layouts/factory.json`, and run its `install.sh` with `HERDR_APP_HOME`, `HC_SESSION` and `XDG_STATE_HOME` of the run. It switches the window to `factory`.
- Spaces shop, then api (`do space.new`), and `do layout.hide --id agents` so both lanes fit. api is selected.
- The start-up toast for `004 BLOCK-1` comes and goes within a few seconds; shoot after it is gone.

- **Open a question**: append a `slice_blocked` event to `003-<date>-a001` ([Fixture runs](./fixture-runs.md)). Shoot after 1.5 s: the toast `003 needs you` with the question.
- **Click the toast**: `bin/input.sh <run> click 770 495` while it shows. `status` reads shop's space id.
- **Restart**: `bin/restart.sh <run>`, shoot after 1 and 3 s: no toast. The store still lists both questions.
- **Dismiss**: × of `005 shipped` on shop. With only that shop strip finished, a second shipped run has to be seeded before the drive: a copy of `005-<date>-a003` as `006-<date>-a004` with PR 101, and its `runs` and `workers` rows in `fixtures/data/factory.db`. Select api first, so a press that selected shop would show. Then restart: 005 stays gone, 006 shows.
- **Answer**: click Answer on `004 BLOCK-1 open`, `input.sh type …`, `input.sh key Return`. `answers/BLOCK-1.json` in `004-<date>-a002`, the `Answer sent` toast, and the 004 strip back to `waiting-owner` with its slice bar.
- **Answer a resolved one**: on fresh fixtures, open the dialog, then answer the same block from a shell (`fixtures/bin/factory answer --feature 004 BLOCK-1 …` in the shop repo), then type and Enter in the dialog. It stays open with `BLOCK-1 is already resolved (…)` in red under the kept text.

## Gotchas

- Coordinates move with the strips: a question that opens on a001 pushes 004 down a strip (Answer at 226,132 before, 226,166 after). Read them off a fresh shot.
- A dismissed id and an alerted question survive `restart.sh` but not `cleanup.sh`: a new run starts with an empty store.
- Once a002's block is answered, no fixture has an open block that `factory answer` accepts: a001's appended block has no `log.jsonl` entry. Relaunch for another answer.
