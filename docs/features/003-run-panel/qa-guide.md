# QA guide — PRD-003 run side panel

About **8 minutes**, in your own window after `./install.sh`, on the `factory` layout, with a factory run going in one of your spaces. These are the checks a machine cannot make. Everything else was proven at the checkpoints.

1. **Does the top read in five seconds? (most important, 5 min)** Open the panel with **Run** on a space whose run waits on you, or is in a gate or review. Look for five seconds, then look away. Could you say why it waits, or what it is doing now, and whether you need to act? Check a block with an excerpt too: is the failing line the one that stands out? (FR-4)
2. **Are the thumbnails big enough to judge? (3 min)** On a run whose checkpoint has made screenshots, scroll to Screenshots at the panel's default width (368 px), then dragged wider. Can you tell whether the shot shows what its caption says, without opening the file? If not, say so: enlarging a shot is a non-goal until this check says it is needed (prd §13). (FR-7)
