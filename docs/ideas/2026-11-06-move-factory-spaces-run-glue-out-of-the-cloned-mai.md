---
title: "Move factory-spaces' run glue out of the cloned main.js"
state: "open"
added: "2026-11-06"
origin: "PRD-001 polish"
---

`mods/factory-spaces/main.js` is Herdr's spaces mod plus about 150 lines of factory code: `askRuns`, `watchRuns`, `raise`, `forget`, `dismiss`, `lane`, `strip`, `part`, `answer`. The file is on the cloned list in `.prettierignore`, so `scripts/gate/types.sh` skips it and prettier never formats it. The pure logic in `lib/runs.js` and `lib/alerts.js` is typed and tested, but the view glue is not, so a bad property name in it still passes `make gate`.

Shape: a `lib/view.js` (or similar) exporting the strip-drawing and polling helpers, imported by `main.js`. The cloned file then differs from Herdr's by a few call sites, which also makes the re-clone FR-2 expects cheaper. Check that `herdr-app check` accepts gpui-kit element builders from a lib module, and give the type tier the gpui-kit `.d.ts` for that file.
