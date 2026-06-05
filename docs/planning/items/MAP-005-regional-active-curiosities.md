---
id: MAP-005
title: Regional active curiosities
status: backlog
type: feature
area: world
priority: high
tags:
  - map
  - features
  - interactions
  - swamp
  - riverbank
  - forest
depends_on:
  - MAP-004
---

# MAP-005 — Regional Active Curiosities

## Goal

Add more small active curiosities across different waking-world zones so болотa, берег, ліс and similar regions feel meaningfully different in play, not only in description text.

## Direction

Each curiosity should be a small authored interaction with a local consequence. The first slices should stay narrow: one or two features per region, with clear examine text, buttons/commands where needed, and bounded outcomes.

## Candidate Regions

- **Swamp / willow floodplain:** bubbles in black water, unstable tussocks, reed signs, sinky mud, quiet pools, willow knots, frog/bug/noise omens.
- **Riverbank / bridge edge:** slippery stones, shallow eddies, fish ripples, reed bundles, washed-up traces, bank holes, water marks after rain.
- **Forest / forest edge:** hollow roots, bent branches, animal scrapes, old resin wounds, low dens, strange stones, dry fallen branches, listening clearings.
- **Dry meadow / luka:** flattened grass, insect hum, brittle seed heads, hidden runs, old fire scars, exposed earth.

## Interaction Shapes

- Examine reveals a safer/clearer action than `/look`.
- A small action can change local text, create a track, move a tiny resource, nudge stamina/HP slightly, teach a small observation hint, or unlock a one-use/temporary path.
- Some features may have daypart, weather, light, season or recent-track variants.
- Outcomes should vary by region so the player learns "where" they are, not just "what button exists."

## Guardrails

- Do not turn every feature into a loot button.
- Do not add broad crafting/economy loops.
- Do not add lethal traps without separate hazard/death-location rules.
- Do not expose raw mechanics or exact thresholds in player-facing text.
- Keep `/look` compact and `/examine` meaningfully richer.
- Any player-facing in-world action button needs a real typed command/alias path unless it is a temporary navigation/confirmation exception.

## First Slice Ideas

- One swamp curiosity that warns or costs a little stamina if handled carelessly, but can reveal a track/water clue when examined first.
- One riverbank curiosity that lets the player test water/marks without fishing yet.
- One forest curiosity that teaches a small attention or track-reading moment without adding a loot cache.

## Acceptance Notes

- At least two regions gain distinct active features with different consequences.
- Feature names, aliases, icons and examine text are region-specific.
- Tests cover feature data validity, command/alias parity if actions are added, and no raw HTML/hidden-key leaks.
- Public news can mention that some places now answer attention differently, without spoiling exact triggers.
