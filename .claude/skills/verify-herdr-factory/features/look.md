# Look

How the window looks when a screenshot is taken: light or dark, the theme, the zoom. A proof of how something looks names the appearance it was taken in, and a light-and-dark proof takes one of each.

## Sub-features

- `look-appearance` light, dark, or the system's.
- `look-theme` the theme of each appearance: `graphite`, `ink`, `moss` dark; `paper` light.
- `look-zoom` everything bigger or smaller.

## How to get to it (user POV)

- Settings → Look (`app.settings --section look`).
- The command palette → Theme.
- `settings.json` in the home: `appearance`, `theme`, `zoom`.

## Driving it with herdr-app do

Preconditions:

- Baseline: launched, doctor passes. A space is open, so there is more than an empty frame to judge.

- **Light.** `bin/appearance.sh <run> light`. The sidebar and terminal turn light (`paper`). `bin/shot.sh <run> <name>-light`.
- **Dark.** `bin/appearance.sh <run> dark`. Back to `graphite`. `bin/shot.sh <run> <name>-dark`.
- **System.** `bin/appearance.sh <run> system` drops `appearance`; the window follows the desktop again.
- **Another theme.** `bin/herdr.sh <run> do app.theme --name moss` sets the dark half to `moss`; it shows while the appearance is dark.
- **Zoom.** `bin/herdr.sh <run> do app.zoom_reset` before any shot whose acceptance names zoom 1; `status` shows `"zoom": 1.0`.
- **Proof.** A light and a dark PNG of the same state, with the same name and the appearance as suffix.

## Gotchas

- `app.theme --name paper` alone leaves a dark window dark: it sets the light half, and the system is dark.
- The window's size is whatever the desktop gives it (it tiles under Hyprland), so shots from two runs can differ in size. Compare a light and a dark shot from the same run.
- `appearance.sh` waits a second for the reload and fails if `settings.error` appears.
