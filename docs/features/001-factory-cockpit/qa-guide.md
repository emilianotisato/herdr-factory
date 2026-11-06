# PRD-001 QA guide — what a human checks

About **10 minutes**, after the PR is up. Everything else was proven by the run.

1. **The strip's look, FR-4 — matters most (8 min).** Run `./install.sh --dev`, open the factory layout, and look at the checkpoint's 14 screenshots, or at a live run if one is going. Check that each state reads at a glance from across the desk: building, a BLOCK, paused, parked, driver dead, shipped, failed. Check light and dark. Check that the slice bar, the budget gauge and the gate dot do not crowd the space name in a 268 px sidebar.
2. **The rail (2 min).** Narrow the sidebar below 160 px. Each space with a run shows one dot, in the color of its most urgent run.
