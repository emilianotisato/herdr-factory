---
lane: 2
env: [TMPDIR=/tmp/herdr-factory-lane-2]
setup: mkdir -p /tmp/herdr-factory-lane-2
---

This lane is yours for the whole slice. Nothing here is shared with a sibling lane.

Run `setup` above before the first test run; it is written to be safe to run twice.
