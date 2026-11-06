# Verification

## Inner loop

`make inner` while iterating. It runs prettier in write mode, eslint, shellcheck,
`herdr-app check` on every mod, the strict type check and the unit tests quietly.
It runs the gate's own tiers, because the whole gate takes about 2 seconds.

## Finishing

`make gate` is the only accepted proof that a change is done. It runs, cheapest first:

| Tier | Command | What fails it |
|---|---|---|
| deps | `scripts/gate/deps.sh` | `node_modules` not matching `package-lock.json`; an `npm audit` finding at high or above |
| format | `scripts/gate/format.sh check` | any file prettier would change |
| lint | `scripts/gate/lint.sh` | any eslint error or warning (`@eslint/js` recommended) |
| shell | `scripts/gate/shell.sh` | any shellcheck finding in a `*.sh` file |
| mods | `scripts/gate/mods.sh` | `herdr-app check` failing on any folder in `mods/` |
| types | `scripts/gate/types.sh` | a strict TypeScript error in our own `mods/**/*.js` |
| test | `scripts/gate/test.sh` | a failing test in `tests/*.test.js`, or line coverage of `mods/*/lib/` below **90%** |

Each tier is its own `make` target (`make types`, `make test`), so a red tier reruns alone.

**Where the code goes.** Pure logic, with no import from `herdr` or `gpui-*`, goes in
`mods/<mod>/lib/`, so Node can test it. A mod's `main.js` is glue: it reads Herdr's
state, calls the lib and draws. Every lib file counts toward coverage, even one that
no test imports.

**Cloned Herdr files** are listed between the `cloned` markers in `.prettierignore`.
They are never reformatted, so a re-clone diffs cleanly against Herdr's version, and
the strict type check skips them, because Herdr's own mods do not pass it. eslint and
`herdr-app check` still run on them. Only add a file to that list when it was copied
from Herdr.

**The ratchet.** The coverage floor rises when coverage rises: set it just under what
the code reaches. Never lower it to get green; cover the code or refactor it instead.
Never make the test tier run only changed tests: a gate that runs a subset is not a gate.

**Escape hatch.** `SKIP_AUDIT=1` skips `npm audit`, for working offline. Nothing else
is skippable.

**Local only.** There is no CI. The gate needs herdr-app installed, which a CI runner
does not have. `docs/project.toml` sets `gate_parallel = true`: six runs, two at a time,
were all green on 2026-11-06.

## Environment facts

- **Node 22 or newer.** Coverage floors need it. When the shell's Node is older, the
  tiers take Node 22 from mise (`mise where node@22`); without either they stop and say so.
- **`make setup`** (`npm ci`) once after cloning, and after `package-lock.json` changes.
- **herdr-app** must be installed. `herdr-app check` writes `gpui-kit.d.ts` and
  `jsconfig.json` into each mod folder; both are gitignored, and the types tier reads
  the first.
- **Theme colors.** `theme()` is typed as plain strings while the color setters want
  `` `#${string}` ``, so a strict mod casts it once:
  ``const colors = /** @type {() => Record<string, `#${string}`>} */ (theme);``
