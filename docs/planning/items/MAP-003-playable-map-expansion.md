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

## 0.15.27 Starter Camp Region Follow-Up

- Split `start_border_camp`, `start_border_watchtower` and `start_border_cellar` into the narrow `starter_camp` / `Межовий табір` region so future starter-infrastructure rules can target the vertical stack together.
- Kept `under_bridge_18_05` in `old_bridge`; there is still no cellar-to-bridge secret passage or herbalist route expansion in this slice.
- Added seed validation and runtime guardrails so ordinary resource nodes/regeneration stay out of the starter infrastructure region.
- Extended camp spirit cat bounds to include the cellar while still preventing movement outside starter infrastructure.

## Hidden Cellar Water-Word Passage Follow-Up

- Added an intentional hidden, one-way spoken-word passage from `start_border_cellar` to `under_bridge_18_05`.
- Kept it out of ordinary exits, visible map docs, public news and buttons; the route is hinted only through careful inspection of cellar landmark text.
- Future herbalist supply-run work may occasionally use the same phrase so players can learn it by watching, but this task does not implement NPC route usage, follow intent or signal triggers.

## Future Hatch State Follow-Up

- Make `Люк до погреба` a stateful camp feature: it can be open or closed, and the `DOWN` route into `start_border_cellar` should require opening it first when closed.
- Add typed and button paths for opening/closing the hatch, using the same ordinary open/close interaction style as other authored gates/features where possible.
- Ordinary small animals such as mice should not be able to open the hatch or use the cellar route while it is closed.
- Human-like/profession NPCs such as hunters and herbalists, plus camp-bound special beings such as the camp spirit cat, may open and close the hatch when their route needs the cellar.
- Keep the hatch state diegetic and local; do not turn the starter cellar into a locked quest, loot room or public spoiler for the hidden water-word passage.

## Future Adjacent Tree-Canopy Follow-Up

- When two climbable tree/crown locations sit beside each other on the map (`T  T`-style adjacency), add authored lateral movement between them where it makes sense.
- Prefer a diegetic feature such as `Переплетені гілки`, `Гілка до сусіднього дерева` or a cautious `Стрибнути на сусіднє дерево` action rather than silently treating every adjacent tree as connected.
- Keep the first slice narrow: one or two paired trees with reciprocal exits, inspectable branch text and clear aliases/buttons if the movement is safe enough for ordinary use.
- Do not let ordinary ground animals use these upper/canopy crossings unless the route is explicitly marked animal-friendly; keep authored vertical-route boundaries aligned with `ECO-006`.

## Implementation Notes

- Active hand-edited map data lives under `prisma/data/world/`; update split files there first.
- Update `docs/world/world_map.md` or nearby map docs if the ASCII/reference map would otherwise drift.
- If the expansion adds stable creature, feature or resource nouns, check `src/content/lexicon/worldLexicon.ts`.
- Keep this as a first expansion slice. Do not try to solve full cartography, fog of war, settlement interiors, factions or broad procedural generation here.

## Follow-Ups

- `MAP-003-A`: choose expansion direction and sketch the first 10-20 reachable cells.
- `MAP-003-B`: implement the first expansion in split seed data with exits/resources/features.
- `MAP-003-C`: add seed/map validation or docs updates for the new region shape if existing checks are not enough.
- `MAP-003-D`: implement the stateful cellar hatch open/close loop and route permissions for players, profession NPCs, camp spirit cat and ordinary animals.
- `MAP-003-E`: add authored lateral movement between adjacent climbable tree/canopy locations, via intertwined branches or a careful jump where the map visibly suggests `T  T` adjacency.
