# Spaces

A space is a place to work in one folder. The sidebar lists every space by name; a space opened in a git repo is the row a factory run of that repo belongs to. Opening the fixture repos as spaces is the first step of every run-strip proof.

## Sub-features

- `space-open` a new space in a fixture repo, named, shown and selected at once.
- `space-list` the sidebar row and the `ls` entry with the space's folder.
- `space-close` closing a space ends its terminals.

## How to get to it (user POV)

- Sidebar → `+` beside **Spaces**.
- The command palette (`ctrl-shift-p`) → New space.
- The command `space.new`, which both of those run.

## Driving it with herdr-app do

Preconditions:

- Baseline: launched, doctor passes, no space open.

- **Open.** `bin/herdr.sh <run> do space.new --name shop --folder <scratch>/fixtures/repos/shop`. Prints `{"space": "sp…", "tab": "tb…", "terminal": "t1"}`. The sidebar shows `shop`, selected, and a shell prompt `shop main ❯`.
- **Read back.** `bin/herdr.sh <run> ls` lists the space with `"name": "shop"` and `"folder": "<scratch>/fixtures/repos/shop"`.
- **Second repo.** The same with `--name api --folder <scratch>/fixtures/repos/api`. Two rows, `shop` and `api`.
- **Close.** `bin/herdr.sh <run> do space.close --id <space id from ls> --confirmed true`. The row goes; `ls` no longer lists it.
- **Proof.** `bin/shot.sh <run> space-new` after the read-back. `bin/prove.sh` runs open, read back and proof in one call and checks the owner's window shows no scratch folder.

## Gotchas

- Without `--folder`, the space starts in the focused terminal's folder, which in a fresh window is the home folder: not a fixture repo.
- A space is matched to runs by its git top level. The fixture repos are real git repos on branch `main`; a folder inside one has the same top level.
- `do` prints the ids before the sidebar has redrawn. Shoot after `ls` shows the space and a second has passed.
- Spaces live in the scratch core, so they vanish with cleanup. A relaunch with the same run id starts from no space.
