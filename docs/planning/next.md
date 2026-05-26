# Next

Candidate work for the next patch or minor versions.

This file should stay small. If everything is “next”, nothing is next.

## MAP-002 — Biome-based resources and spawn rules

Status: next  
Area: world, ecology  
Priority: high  
Tags: map, biome, resources, spawn-rules, ecology

### Goal

Make the new forest / dry luka / riverbank layout drive resource availability and future creature spawns by biome and region.

### First scope

- Keep generic animals out of seed by default.
- Define spawn rules per biome and region:
  - forest: rabbits, mice, foxes, occasional wolves;
  - deep forest: fewer prey, higher danger, more predator/spirit hooks;
  - dry luka: small prey, herbs, visibility, lower cover;
  - riverbank: herbs, fishing hooks later, bridge/gate encounters.
- Move resource amounts and regeneration toward biome rules instead of location-key string checks.
- Keep special locations such as `start_border_camp` hand-authored.

### Design intent

The expanded map should not just be larger. Different regions should feel and behave differently, even before full settlement or deep Chornolis systems arrive.

## Recommended near-term candidates

- Implement early `/respawn` / **Повернення** with a progression threshold and cooldown, using `start_border_camp` as the return point.
- Add day/night world state.
- Add campfire light source behavior and firewood gathering.
- Add starter settlement skeleton and first NPC roles beyond the closed gate.
- Turn the new static `/time` output into a world-time service with season, moon circle/month, day and daypart progression.
- Add debug mode persistence and `/debugGet` / `/debugSet <true|false>` commands before more hidden-vs-technical UI work. Debug on should reveal technical details to everyone; debug off should keep exact details available only to `Писар` players through a `Показати деталі` / `Приховати деталі` option.
- Add first foraging/firewood iteration by broadening `/gather` without arguments into local foraging: хмиз/dry sticks near campfires and forest edges, moss where suitable, animal bones, and rare minor coin finds. Keep outcomes biome-, region- and location-feature-dependent.
- Seed a first small ground-money find on world start/reset: a ґривня under the bridge and a few scattered шаги elsewhere. These should behave like visible location objects: shown by `/look` when light/visibility allows, discoverable by `/examine` in darkness, inspectable like corpses/objects, and pickable into `Речі`.
- Add a first NPC hunter/archer loop: a named hunter travels between nearby hunting grounds, looks for prey, attacks small animals, and leaves visible signs for players to observe. Later this should grow into tracking, traps and teaching hunting-related skills.
- Add name approval admin flow after the `isNameApproved` field is available.

## Review checklist

Before moving an item here, ask:

1. Does it support the current phase?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
