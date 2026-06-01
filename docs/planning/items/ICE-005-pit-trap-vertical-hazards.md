---
id: ICE-005
title: Pit traps and vertical hazard cells
status: icebox
type: feature
area: world
priority: low
tags:
  - traps
  - verticality
  - movement
  - damage
  - map
depends_on:
  - WORLD-001
---

# ICE-005: Pit Traps And Vertical Hazard Cells

## Idea

Some map cells may contain a hidden or visible trap/hazard: when a character enters, they fall through to a matching location on the level below, such as `z - 1`.

The fall should hurt, move the character into a lower location and leave a way to climb or escape back upward.

## Possible Shape

- Treat the upper cell as a hazard-bearing location, feature or exit trigger.
- The lower location is a real authored cell, not just a temporary status effect.
- Entering the trap can:
  - move the character down one level;
  - apply HP damage;
  - interrupt queued/running physical actions;
  - create a local/world event;
  - leave tracks or signs of disturbed ground where appropriate.
- The lower cell should have a difficult but understandable escape:
  - `Вгору`;
  - climb feature;
  - rope/help from another character;
  - later skill checks, tools or group assistance.

## Design Questions

- Is the trap visible, hidden, or revealed by `Роздивитися`, tracking, light or a skill?
- Is the trigger a location feature, a special exit, or a general hazard layer checked after movement?
- Does falling always happen on entry, or can careful movement avoid it?
- How much damage is fair for a first version?
- Can creatures fall too, and can predators use pits?
- Does the lower cell preserve exact coordinates with `z - 1`, or can it route to an authored off-grid pit location?
- How does respawn/teleport/admin movement interact with trapped lower cells?

## Guardrails

- Do not add this before ordinary vertical movement, visibility and damage/wound rules are stable enough.
- Do not create unavoidable death traps in beginner paths.
- Do not make hidden traps feel like arbitrary punishment; there should be clues, counterplay or a clear reason.
- Keep escape possible without requiring admin help.
- If implemented as a map hazard, add seed/map validation so the destination and escape route always exist.

## Notes

This may later connect to hunting/trapping, cave/tunnel maps, dens, climbable trees, pits and construction. For now it belongs in Icebox because it needs careful movement, visibility, damage and map-authoring rules.
