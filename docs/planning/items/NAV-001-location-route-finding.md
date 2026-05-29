---
id: NAV-001
title: Location-to-location route finding
status: testing
type: feature
area: world
priority: medium
estimate: 2-4h
tags:
  - navigation
  - movement
  - npc
  - world
---

# NAV-001: Location-to-Location Route Finding

## Goal

Add a small reusable route helper that can find a walkable path between two known locations using existing exits, so NPCs and later player auto-modes can travel through the world without teleporting.

## Scope

- Input: start location id/key and target location id/key.
- Output: ordered movement directions or location ids for the next steps.
- Use active gameplay exits, not documentation-only blocked cells.
- Respect locked/hidden exits unless explicitly allowed by the caller.
- Return a clear no-route result instead of guessing.
- Keep the first version breadth-first and bounded; avoid heavy pathfinding until the map needs weights, danger or terrain costs.

## First Consumers

- `NPC-002` hunter auto-program:
  - route from the gate to a magic campfire;
  - route from hunting grounds back to the gate;
  - avoid teleporting carcasses or counts into the drop-off.
- Future player auto-modes:
  - hunter mode;
  - guided return routes;
  - group movement.

## Acceptance

- A helper can find a route between two connected locations in the current world graph.
- A helper returns no-route for disconnected or blocked destinations.
- Hidden or locked exits are not used by default.
- Focused tests cover a simple route, a no-route case and a locked/hidden-exit exclusion.

## 0.13.8 Implementation Note

- Added `src/services/routeFinding.ts` with a bounded breadth-first helper over existing exits.
- Added `findLocationRoute()` for Prisma-backed world routes that exclude hidden exits and currently locked exits by default.
- Added focused regression coverage in `scripts/test/route-finding.cjs`.
