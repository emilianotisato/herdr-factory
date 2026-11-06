---
title: "Harness isolation across lanes and on a lost private display"
state: "open"
added: "2026-11-06"
origin: "PRD-001 polish"
---

The second opinion and the security pass found gaps in `.claude/skills/verify-herdr-factory/bin/` that no checkpoint hit:

- Two lanes that run the same run id (`prove.sh proof`) share `HC_SESSION=vhf-<run>`, whose socket lives under `$XDG_RUNTIME_DIR/herdr-core/` outside the lane's `TMPDIR`, so one lane's cleanup stops the other's core. The `docs/reference/lanes/lane-*.md` line "nothing is shared" does not hold for the harness. A lane-unique prefix in the session name would fix it.
- `launch.sh` picks the first free `:N` from 40 with no lock, so two x11 launches can race for one display. `Xwayland` starts with no `-auth`, so another local user could connect.
- `prove.sh` sets its cleanup trap only after `launch.sh` returns; a launch that dies part way leaves its fixture drivers.
- `start_window` (used by `restart.sh`) falls back to the owner's Wayland display when the private X server has died, and `cleanup.sh` will not find that server by session.
- `cleanup.sh` kills the `session_pids` snapshot without the start-time check the window and driver paths use.
