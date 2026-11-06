# Slice 02 — Spine: install.sh, the factory layout and the cloned spaces mod

**Source**: [`prd.md`](prd.md) → §4 FR-1, §5 FR-2. **Depends on**: — (independent of 01; every later slice edits the clone this one creates)
**Created**: 2026-11-06

**Progress**: _(written as it lands — what was built, the gate numbers, what a review caught)_

**Slice**: A coworker runs `./install.sh` and gets a `factory` layout that looks exactly like Herdr's `main`, drawn by `factory-spaces`, a verbatim clone of Herdr's spaces mod, with nothing else changed. `--dev` links instead of copying. A Herdr release that changes the spaces mod or the main layout gets a warning. No run is drawn yet: that is slice 03.

## Current code / environment

- **The clone's source**, herdr-app 0.1.13: `~/.config/herdr-app/mods/spaces/main.js` (465 lines) and `mod.json` (`{ "place": "none", "title": "Spaces" }`). The other two files there, `gpui-kit.d.ts` and `jsconfig.json`, are written by `herdr-app check` and are gitignored here (`.gitignore`). The clone's only asset paths are `mods/workspace-chrome/*.svg`, a shipped mod every install has, so they stay as they are.
- **The recorded hashes**, from `~/.config/herdr-app/installed.json` on 2026-11-06: `spaces` → `main.js` `829379c2a6776f3e`, `mod.json` `4a42ed2202338077`; `layout:main` → `json` `d25b961ea961fba1`. installed.json holds hashes only, no versions (prd §5, corrected).
- **The layout**: `~/.config/herdr-app/layouts/main.json`. Its root keys are `id, type, titlebar, traffic_lights, background, terminal_padding, divider`, no `theme` or `font`. The spaces block is `sidebar → sidebar-lists → spaces` with `{ "mod": "spaces" }`. `factory.json` changes only that `mod` to `factory-spaces`.
- **Cloned files skip format and strict types**: list them between the `cloned` markers in `.prettierignore` (`docs/reference/verification.md`, "Cloned Herdr files"). eslint and `herdr-app check` still run on them.
- **eslint on the clone was measured with two rules only** (2026-11-06: `no-undef`, `no-unused-vars`, clean). The gate runs `@eslint/js` recommended, which may flag Herdr's empty `catch {}` blocks (`main.js`, `refreshMachines` and `check`). If it does, add a files-scoped rule override for the cloned paths in `eslint.config.js`; never edit Herdr's code to satisfy lint, or the re-clone diff stops being clean.
- **Switching layout**: `herdr-app do layout.switch --name factory` (its one argument is `name`). `herdr-app status` exits non-zero when no window runs.
- **A symlinked mod folder passes `herdr-app check`** (tested 2026-11-06). Rendering one in a layout is not yet tested; this slice's Prove does it.
- **Personal files are never written** (prd §4): `settings.json`, `keys.json`, `programs.json`, `themes/`. The owner's own two are symlinks into Dropbox; an install that replaced them would break his sync.

## Tasks

### 1. Clone the spaces mod and the main layout — high — blocked by: —
**Source**: §5 FR-2: "`layouts/factory.json` is Herdr's `main` layout, unchanged except that the `spaces` block uses `factory-spaces`. `factory-spaces` is Herdr's spaces mod plus the run strip of FR-4."

`mods/factory-spaces/main.js` and `mod.json`, byte-copied from herdr-app 0.1.13. `layouts/factory.json`, copied from `main.json` with the one change. `upstream.json` at the repo root records the herdr-app version and the three hashes above. Add the two cloned files and `layouts/factory.json` to the cloned list.

**Acceptance:** `cmp` of the cloned `main.js` against Herdr's is clean; `make mods` passes on `mods/factory-spaces`; `layouts/factory.json` differs from `main.json` in exactly one value.

### 2. `install.sh` — high — blocked by: 1
**Source**: §4 FR-1, the decision and its acceptance.

`install.sh` at the repo root. Copy by default, `--dev` symlinks, into `${HERDR_APP_HOME:-$HOME/.config/herdr-app}`: every `mods/factory-*` folder and `layouts/factory.json`. It records what it installed in a manifest file in that home, so a re-run knows its own files and refuses any `mods/factory-*` or `layouts/factory.json` it did not write, naming it and writing nothing. When `herdr-app status` succeeds it runs `herdr-app do layout.switch --name factory`; otherwise it says to pick the layout once. Re-running upgrades.

**Acceptance:** a node test in `tests/` runs `install.sh` against a scratch `HERDR_APP_HOME` holding a `settings.json` and a `keys.json`: twice, then `--dev`, then over a foreign `mods/factory-spaces/`. It asserts both personal files are byte-identical, every installed path is a symlink into the checkout after `--dev`, and the foreign case exits non-zero, names the folder and changes nothing.

### 3. The drift warning — medium — blocked by: 2
**Source**: §5 FR-2: "`install.sh` compares that hash with the person's `installed.json` and warns when they differ, naming the recorded version and the person's `herdr-app --version`." Kept at the cut (prd §11).

Read `upstream.json` and the person's `installed.json` with `python3 -I`. When python3 is missing, say the check was skipped and install anyway. A mismatch on `spaces` or `layout:main` prints one warning naming the recorded version and `herdr-app --version`, and the install still happens.

**Acceptance:** the install test, with a scratch `installed.json` whose `spaces` `main.js` hash differs, sees the warning with both versions and a finished install; with matching hashes, no warning.

### 4. Verify — medium — blocked by: 1, 2, 3
`make inner` _(the inner loop; the full gate runs at this slice's checkpoint)_

**Acceptance:** inner loop green, one commit.

### 5. Prove — at the checkpoint — blocked by: 4
§12 QA plan rows **FR-1** (install twice, `--dev`, over a foreign mod, on a scratch home: transcript, `ls -la`, `cmp`) and **FR-2** (screenshot of the factory layout and of `main` with no runs; install with a stale recorded hash: two PNGs and the warning transcript).

**Acceptance:** after the checkpoint, both rows have their evidence in Progress.
