---
id: MAP-003
title: Playable map expansion
status: testing
type: content
area: world
priority: high
estimate: 2-4h
tags:
  - map
  - world
  - exploration
  - regions
---

# MAP-003: Playable map expansion

## Goal

Expand the playable waking-world map because active players have already explored nearly everything currently reachable.

This is a content pressure task, not only a future worldbuilding wish. The first slice should add enough reachable space that returning players have new paths, landmarks and small risks to discover without requiring a new major system first.

## First Scope

- Add a small but meaningful expansion to the existing `z = 0` waking-world map.
- Prefer expanding old edge regions and adding one adjacent new region over scattering isolated rooms.
- Add exits in both directions and avoid duplicate exits from one location in the same direction.
- Include enough authored texture that new rooms do not feel like blank filler:
  - location names and descriptions;
  - a few visible features with inspect text;
  - resource nodes where the biome supports them;
  - at least a few creature/NPC seed hooks if appropriate.
- Keep the first expansion near the current frontier loop so it is reachable by existing characters without teleporting.

## Candidate Directions

- More cells beyond the bridge/gate pressure area, so the settlement edge no longer feels like the end of the world.
- A deeper forest fringe with higher uncertainty and stronger need for light/attention.
- More meadow/riverbank approaches that make hunting, gathering and patrol routes less repetitive.
- A path toward a future settlement entrance, without opening the full settlement if that belongs to `SETTLE-001`.

## Acceptance

- Players can reach new locations through ordinary movement from the current waking-world map.
- New locations have bidirectional exits and pass seed/map validation.
- New regions or region expansions have coherent names and descriptions.
- New visible features are not bare labels only; direct `/examine <feature>` should add meaning, constraint, use or atmosphere.
- Existing start/tutorial/dream locations are not moved or broken.
- World seed tests pass.

## 0.13.21 Slice

- Added a first small northern forest pocket reachable from `forest_02_09`:
  - `forest_02_10` / `Заяча зарість`;
  - `forest_03_10` / `Камінь малого сліду`;
  - `forest_04_10` / `Північний бурелом`.
- Added bidirectional exits, local berries/herbs/mushrooms/twigs and refreshed `docs/world/world_map.md`.
- Added an inspectable `Камінь малого сліду` feature as a future animal-restoration charm hook for `ECO-005`.
- Removed the matching blocked-cell wall entries so the new pocket renders as playable space.

## 0.15.25 Starter Cellar Slice

- Added `start_border_cellar` / `Погріб прибулих`, a safe waking-world `z = -1` cellar under the starter camp.
- Added reciprocal `DOWN` / `UP` exits between `start_border_camp` and the cellar without changing the starter location or tutorial dream.
- Added a surface cellar hatch and three inspectable cellar landmarks for map-making, travel memory and atmospheric `Поклик духа` / future-follow hints without implementing follow intent.
- Kept the slice content-only: no loot cache, combat, traps, economy, crafting, dream rooms or named spirit profiles.
- Refreshed `docs/world/world_map.md` and world seed validation so the authored lower room stays explicit and test-covered.

## Implementation Notes

- Active hand-edited map data lives under `prisma/data/world/`; update split files there first.
- Update `docs/world/world_map.md` or nearby map docs if the ASCII/reference map would otherwise drift.
- If the expansion adds stable creature, feature or resource nouns, check `src/content/lexicon/worldLexicon.ts`.
- Keep this as a first expansion slice. Do not try to solve full cartography, fog of war, settlement interiors, factions or broad procedural generation here.

## Follow-Ups

- `MAP-003-A`: choose expansion direction and sketch the first 10-20 reachable cells.
- `MAP-003-B`: implement the first expansion in split seed data with exits/resources/features.
- `MAP-003-C`: add seed/map validation or docs updates for the new region shape if existing checks are not enough.
