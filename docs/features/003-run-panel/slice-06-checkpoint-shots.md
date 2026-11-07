# Slice 06 — Checkpoint screenshots

**Source**: [`prd.md`](prd.md) → §9 FR-7 (with its 2026-11-07 slice-recon correction on `evidence.root`). **Depends on**: 02 (it fills `mods/factory-run/sections/shots.js`, whose `update()` slice 02 calls once per answer, and reads the `recent` list slice 02 publishes). Independent of 03, 04 and 05.
**Created**: 2026-11-07

**Progress**:
- Built: `mods/factory-run/lib/shots.js` (`plan`, `stale`, path checks `component`/`segments`/`within`, `runsDir`, `shotsDir`, `size`, `regular`) with `tests/shots.test.js` (22 tests); `sections/shots.js` `update()` runs one copy pass at a time, keeping the newest answer for after it: it lists `shots/<runId>/`, plans, then per copy checks the file's folder resolves inside the evidence folder (`realpath -e`), `rm -f` the temp name, `cp -P`, `stat -c %F:%s` (a regular file ≤ 4 MiB), `mv -f -T` onto the target, else `rm -f`; then lists `shots/` and `rm -rf`s the folders `stale` returns. `view()` draws per checkpoint a heading, each copied image at `w_full()` over its caption, then the other files' names and sizes.
- Inner loop: 2 runs, 0 red, under 1 min (184 tests). Caught: nothing.
- Deviations: none from the tasks. AD-10 (fyi) records the cases the PRD left open: an image never copied is listed by name and size, an unstable one waits, a hostile path is not shown, and a symlinked parent folder is refused.
- Left for the checkpoint: task 6, QA rows FR-7 (`shots-three` screenshot; `shots-hostile` `ls -la` and two `stat -c %Y`).
- Prove FR-7, `shots-three` on 003-b003: cp-2/shots-three-thumbnails-captions.png (three thumbnails, each over its caption) and cp-2/shots-three-checkpoint-2-top.png (the Checkpoint 2 heading over its two).
- Prove FR-7, `shots-hostile` on 004-b004: cp-2/shots-hostile-one-thumbnail.png and cp-2/shots-hostile-ls-stat.txt (`ls -la` shows one regular file; `stat -c %Y` 1794023163 before and after a poll that answered between them).

**Slice**: The panel's last section shows the run's checkpoint screenshots, newest checkpoint first, each a panel-wide thumbnail over its caption, and non-image evidence as names and sizes. Images are copied into the app home first, because `image()` draws nothing else: only stable images of at most 4 MiB, at most 24 per run, each copied once by etag, never through a symlink or out of the evidence folder. A run's copies go when factory drops it from its recent list.

**Highest risk**: task 2. It copies files named by another program's output onto disk; a path check missed here writes or reads outside the run.

## Current code / environment

- **`image()` loads only paths relative to the app home**: `data/<mod>/…` draws, an absolute path does not, inside the home or out (prd §9 Today, §14; scratch window 2026-11-07). The app home is `appHome()` (`~/.config/herdr-app/herdr.d.ts:21`). Copies go under `<appHome>/data/factory-run/shots/<runId>/<etag>.<ext>`, never `mods/` (prd §9 Accepted cost: personal mods are links into Dropbox).
- **`evidence.root` is run-relative**: factory 0.13.1 prints `"root": "evidence"` on every run (40 read 2026-11-07; factory repo `docs/features/024-live-run/slice-07-evidence.md`: "`root` is the run-relative `evidence` (never absolute)"). The run folder is `<runs dir>/<runId>/`, the runs dir from `props()?.runs`, default `${home()}/.local/share/factory/runs`, as `factory-spaces` reads it (`mods/factory-spaces/main.js:119`). See prd §9's correction.
- **Factory already filters**: it lists only regular files found by `lstat`, no symlink followed, depth ≤ 4, `path` relative with no `..` (factory `slice-07-evidence.md`). The panel checks anyway, as prd §9 orders: the file can change between factory's listing and the copy, and the PRD's hostile fixture lists entries factory itself would not.
- **The evidence shape**: `{root, checkpoints: [{n, state: writing|done, files: [{path, kind, bytes, mtime, stable, etag, caption, citedBy, sidecars}]}], skipped, truncated}`; checkpoints newest first, files by mtime descending; `kind` is `image` for png/jpg/jpeg/gif/webp/svg; `etag` is `<bytes>-<mtimeMs>`; `stable` means mtime older than 2 s.
- **No file API that copies**: the mod has `exec`, `readTextFile`, `writeTextFile` (`herdr.d.ts:13`, `:25`, `:28`), no copy or list. The copy is `exec("cp", ["-P", src, tmp])` then `exec("mv", [tmp, dst])`, args as an array, never a shell string. Checking "a regular file" and listing `shots/` for cleanup also go through `exec` (`test`, `find`, `stat`).
- **The hook**: `sections/shots.js` exports `update(snap, ctx)`, called by slice 02's loop once per accepted answer, and `view(snap, t, ctx)`, drawn last. `shared("factory.spaceRuns").recent` is written only after `factory-spaces` has an answer (slice 02, task 3): an absent key means "not known yet", never "nothing recent". Do not edit `main.js`.
- **Fixtures**: slice 01's `shots-three` and `shots-hostile`, whose files `use` writes under `<runs dir>/<runId>/evidence/`; the layout's `run` block names that runs dir in its `runs` prop (`features/run-panel.md`).
- **Logic in a lib**: `mods/factory-run/lib/shots.js` with `tests/shots.test.js` (90% line floor); the `exec` calls and drawing stay in `sections/shots.js`.
- **Not handled** (prd §13): enlarging a screenshot. "Reopen if the FR-7 human check says so." No click-to-zoom, no viewer.

## Tasks

### 1. What to copy, and where — high — blocked by: —
**Source**: §9 FR-7: "Copy only these files: `evidence` entries of `kind: image` that are `stable`, at most 4 MiB, at most the newest 24 per run." "Copy them into `<HERDR_APP_HOME>/data/factory-run/shots/<runId>/<etag>.<ext>`". "The source path is `evidence.root` joined with `path`. Any path that leaves `root` is rejected." (as corrected 2026-11-07: under `<runs dir>/<runId>/`). "Shots are grouped by checkpoint, newest first. Each shows its `caption` … Non-image evidence shows as a list of names and sizes."

`mods/factory-run/lib/shots.js`, `tests/shots.test.js`: `plan(evidence, runsDir, runId, appHome)` → the copies `{src, dst}` (filtered, capped, path-checked, `ext` from the image extension list only) and the groups to draw (per checkpoint: thumbnails with caption and `data/…` relative path; other files with name and size).

**Acceptance:** tests assert: an unstable image, one of 4 MiB + 1 byte, and a `text` file are not copied (the text file is listed by name and size); 30 stable images give the newest 24; `cp-1/../../escape.png`, an absolute `path`, and a `root` that is not a plain relative name are rejected; a good entry's `src` is `<runsDir>/<runId>/evidence/<path>` and `dst` `<appHome>/data/factory-run/shots/<runId>/<etag>.png`; checkpoints come newest first.

### 2. Copy safely, once per etag — high — blocked by: 1
**Source**: §9 FR-7: "with `cp -P` to a temporary name, then a rename; skipped when the target exists; dropped when the result is not a regular file". Acceptance: "A fixture holding one valid image, one entry whose `path` holds `..`, and one symlink leaves exactly one file in `data/factory-run/shots/<runId>/`." "That file's mtime is the same across two polls with the same `etag`."

`mods/factory-run/sections/shots.js` `update()`: for each planned copy whose `dst` does not exist, `cp -P` to a temporary name in the same folder, check it is a regular file (not a link), then `mv` it onto `dst`, else remove it. One copy pass at a time; a pass still running when the next answer lands is not doubled.

**Acceptance:** at the checkpoint, the FR-7 `ls -la` and `stat` rows. In a test, the plan for a `dst` that exists is empty (`plan` takes the existing names).

### 3. Remove shots of runs factory dropped — medium — blocked by: 2
**Source**: §9 FR-7: "A run's `shots/<runId>/` is removed when its id is no longer in `factory.spaceRuns.recent`. A dismissed run is still on factory's recent list, so its shots stay until factory drops it."

`lib/shots.js` `stale(folders, recent)` → the folder names to remove; `sections/shots.js` lists `shots/` and removes them, only when the key is present and parses.

**Acceptance:** tests assert: folders not in `recent` are returned, ones in it are not; a missing or junk key returns nothing; a name that is not one path component (`..`, `a/b`) is never returned.

### 4. Draw the shots — high — blocked by: 1
**Source**: §9 FR-7: "Shots are grouped by checkpoint, newest first. Each shows its `caption`, under a thumbnail as wide as the panel. Non-image evidence shows as a list of names and sizes." Acceptance: "A fixture with three PNGs draws three thumbnails with captions, in a screenshot."

`sections/shots.js` `view()`: per checkpoint a heading, then each copied image as `image("data/factory-run/shots/<runId>/<etag>.<ext>")` at the panel's width with its caption under it, then the other files' names and sizes. An image not copied yet is not drawn.

**Acceptance:** at the checkpoint, the FR-7 screenshot row.

### 5. Verify — medium — blocked by: 1, 2, 3, 4
`make inner` (the inner loop; the full gate runs at this slice's checkpoint)

**Acceptance:** inner loop green, one commit.

### 6. Prove — at the checkpoint — blocked by: 5
`prd.md` § QA plan, row **FR-7**, through `features/run-panel.md`:

- case `shots-three`: screenshot of three thumbnails with captions;
- case `shots-hostile` on another run: `ls -la` of the scratch home's `data/factory-run/shots/<runId>/` shows exactly one regular file; `stat -c %Y` of it, then again after the next poll (`calls.log` shows one between), the same value.

The human half ("are thumbnails big enough to judge") is the owner's, in `qa-guide.md`.

**Acceptance:** after the checkpoint, the PNG and the `ls -la` and `stat` transcripts in this slice's Progress.

**Code-review fixes (2026-11-07).**
- `shots/<runId>/` grew without limit: a re-taken screenshot gets a new etag, and old copies stayed until the run left `recent`. Copies no drawn shot names are now deleted after each answer (AD-15). Four reviewers found it independently.
- `regular()` matched `stat %F`'s English "regular file", which is translated: under a non-English locale no copy was ever kept. It now reads the raw mode (`%f`).
- The nesting check resolved the evidence folder itself, so a symlinked `evidence` or run folder passed. The resolved evidence folder must now be `<resolved runs>/<runId>/<root>` exactly.
- The size and type were checked only after `cp`, so a FIFO stalled a pass for 30 s and a huge file was copied in full first. The source is now stat'd before the copy too.
- The section drew nothing from disk until the first new copy finished; it now redraws once it has listed the run's folder. The section gained a "Screenshots" heading.
