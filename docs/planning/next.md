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


## Recommended near-term candidates

- Implement early `/respawn` with progression threshold and cooldown.
- Add day/night world state.
- Add campfire light source and firewood gathering.
- Add starter settlement skeleton and first NPC roles.
- Add first planning export script to CI or local workflow.

## Review checklist

Before moving an item here, ask:

1. Does it support the current phase?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
