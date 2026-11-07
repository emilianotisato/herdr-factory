---
title: "Run panel follow-ups the polish review left"
state: "open"
added: "2026-11-07"
origin: "PRD-003 polish"
---

Real, small, and not needed to ship PRD-003:

- **Terminal squeezed by the open panel.** On a 674 px tiled window the 368 px panel leaves the terminal ~12 px; the main block in `layouts/factory.json` has no min width. Files and Changes do the same, but Run is meant to stay open. Needs the owner's call on a min width or a narrower default.
- **Dim text contrast** ~2.6:1 light, ~3.4:1 dark on excerpt context lines: Herdr's shared `dim` color, not this repo's.
- **Two duration formats.** `lib/agents.js` "1h 5m" vs `lib/now.js` "1h 05m"; also three `text()` helpers.
- **Header repeats the chosen chip**, and jumps when `feature` arrives after the first answer (`mods/factory-run/main.js` render). Feature could come from the chip or `factory.spaceRuns`.
- **`factory.spaceRuns` is published from the sidebar's render** (`mods/factory-spaces/main.js` `grouped`), so a one-off `git status` failure empties a space for up to 60 s. See the existing idea on moving run glue out of the cloned main.
- **Two images with the same bytes and mtime-ms share one copy**: copies are `<etag>.<ext>` as PRD-003 §9 names them, and factory's etag is `bytes-mtime_ms`.
- **Chip choice resets after a window restart**; `this.chosen` is in memory only.
- **Agents row**: `who` is `flex_none`, so a long `doing` path loses its tail.
