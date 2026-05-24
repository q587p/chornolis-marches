# Next

Candidate work for the next patch or minor versions.

This file should stay small. If everything is “next”, nothing is next.

## ECO-001 — Reproduction and herbivore overpopulation

Status: next  
Area: ecology  
Priority: high  
Tags: ecology, reproduction, herbivores, resources, world-reactivity

### Goal

Add reproduction as an early living-world priority, starting with rabbits and other herbivores.

The forest should not only lose animals to age, hunger and predators. If predators are absent or players remove them, herbivores should reproduce, overpopulate the region and start damaging the ecosystem.

### First scope

- Rabbits can reproduce when enough adults survive in a region.
- Predator pressure reduces or prevents uncontrolled growth.
- Player hunting can also suppress population growth.
- Overpopulation increases consumption of herbs, berries and other edible resources.
- If herbivores overgraze an area, the region should become visibly degraded or unstable.

### Design intent

This makes ecology reactive:

- killing predators has consequences;
- ignoring prey populations has consequences;
- the forest can be harmed by imbalance, not only by direct player gathering;
- rabbits become part of the simulation, not just low-level targets.

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

- Implement early `/respawn` with progression threshold and cooldown, using `start_border_camp` as the return point.
- Add day/night world state.
- Add campfire light source behavior and firewood gathering.
- Add starter settlement skeleton and first NPC roles beyond the closed gate.
- Turn the new static `/time` output into a world-time service with season, moon circle/month, day and daypart progression.
- Add debug mode persistence and `/debugGet` / `/debugSet` commands before more hidden-vs-technical UI work.
- Add first foraging/firewood iteration: хмиз/small sticks near campfires and biome-dependent minor finds.
- Add name approval admin flow after the `isNameApproved` field is available.

## Review checklist

Before moving an item here, ask:

1. Does it support the current phase?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
