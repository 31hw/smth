# Canonical 2016 UI source

This directory is an unmodified extraction of `src/services/2016-roblox-main` from RandomWood/economy-simulator.
It is the canonical UI implementation for the extension rewrite—not a visual reference.

Included verbatim:
- all 278 React component files
- all 39 page entry points (Create/Develop routes will not be mounted)
- every public asset (52 files), including every SVG and icon sprite
- stores, models, styles, libraries, and service contracts

The extension adapter must mount these components and translate their service requests to current Roblox data. Components must not be visually reimplemented in the content script.
