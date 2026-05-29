---
id: FOOD-001
title: Corpse freshening, meat and campfire cooking
status: next
type: feature
area: survival
priority: high
estimate: 2-4h
tags:
  - food
  - corpses
  - freshening
  - cooking
  - hunger
  - campfire
depends_on:
  - ITEM-001
---

# FOOD-001: Corpse Freshening, Meat and Campfire Cooking

## Goal

Add the first practical food loop from hunting and scavenging:

1. inspect a relatively fresh animal corpse;
2. freshen / butcher it;
3. gain raw meat in inventory;
4. cook raw meat at a nearby campfire;
5. eat cooked meat to ease hunger.

This should be the first small bridge between combat/hunting, corpse lifetime, inventory, campfires and hunger.

## First Scope

- Let players freshen only sufficiently fresh corpses.
- Produce one universal raw meat resource for now.
- Suggested first yields:
  - mouse: `1` raw meat;
  - hare/rabbit: `3` raw meat;
  - fox: `5` raw meat;
  - wolf: more than fox, exact first value can be tuned during implementation.
- Put meat in inventory after freshening.
- Raw meat can also lie on the ground if dropped, using the current resource-stack bridge.
- If the player has raw meat and a nearby campfire, show an option to cook it.
- A lit torch alone should not be enough to cook meat.
- Cooked meat can be eaten and should reduce hunger by `5`, without going below zero hunger.

## Later Scope

- Different meat types by species.
- Bones, hide, fur, feathers and other animal materials where appropriate.
- Freshness, spoilage and scent tracking for meat and remains.
- Better cooking recipes and profession/skill hooks.
- Butchering quality and yield affected by tools, light, skills and corpse condition.

## Acceptance

- Fresh corpse inspection exposes a freshen/butcher option where appropriate.
- Freshening a fresh corpse adds raw meat to inventory and prevents duplicate harvesting from the same corpse.
- Freshening an old/unsuitable corpse gives a clear message.
- Cooking requires a nearby campfire, not only a torch.
- Cooked meat appears in inventory and can be eaten for modest hunger relief.
- Player-facing text remains diegetic and avoids technical freshness numbers unless debug details are enabled.

## Notes

Prefer `освіжити труп` / `freshen corpse` compatibility for the existing command path, but player-facing copy may use more natural wording such as `обробити труп`, `розібрати труп` or `підготувати м'ясо` where it fits.
