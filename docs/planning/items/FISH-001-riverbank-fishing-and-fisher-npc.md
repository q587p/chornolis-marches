---
id: FISH-001
title: Riverbank fishing and fisher NPC
status: backlog
type: feature
area: survival
priority: high
tags:
  - fishing
  - npc
  - skills
  - riverbank
  - observation
depends_on:
  - PROG-002
---

# Riverbank fishing and fisher NPC

## Goal

Add a living riverbank fishing loop: fish as a food/resource source, a fisher NPC who walks along the river, and a way for players to learn basic fishing by watching or speaking with them.

## Design Intent

Fishing should feel like a quiet profession in the world, not just a button on water. A player may notice someone working the bank, watch the rhythm, and gradually understand how to fish.

## First Scope

- Add a named fisher NPC who moves between authored riverbank locations.
- Give the NPC visible fishing actions: preparing line, checking water, casting, waiting, pulling in a catch, cleaning fish.
- Let players inspect or observe the NPC to get hints about fishing.
- Hook into observation-based learning so watching a successful catch may unlock basic Fishing.
- Add early fishing resources or outcomes:
  - small fish;
  - failed catch;
  - tangled line / lost hook;
  - riverbank clue such as ripples or fish movement.
- Keep fishing available only from valid riverbank/bridge-adjacent locations.

## Later Scope

- Fishing tools: line, hook, rod, net, bait.
- Crafting / repairing hooks and nets.
- Skill-based catch chance, fish quality and time cost.
- Weather, time of day and season effects.
- Barter with the fisher for fish, bait, hooks or lessons.
- Give the fisher a small profession-aware social reaction set, separate from hunters and herbalists: for example nodding back, quieting loud gestures near the water, or pointing toward current/shore details when appropriate.
- Fish as cooking/food input once hunger and cooking are deeper.

## NPC Notes

The fisher should not stand still forever. They can patrol a small riverbank route, pause where the water is good, and occasionally speak or react to nearby players.

Possible Ukrainian profession labels:

- рибалка;
- рибар;
- риболов.

Pick the final term during the Ukrainian terminology pass.

## Open Questions

- Should the first fisher live near the old bridge, the under-bridge path or farther along the riverbank?
- Should the first fishing attempt require a tool, or can a player try a crude improvised method after observing the NPC?
- Should fish be a `ResourceNode`, an inventory item, or a creature/resource hybrid later?
