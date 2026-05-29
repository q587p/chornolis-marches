---
id: FOOD-001
title: Corpse freshening, meat and campfire cooking
status: testing
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
- First cooking success is intentionally imperfect: roughly `3` successful cooked meat results out of `5` attempts; failed attempts consume the raw meat for now.
- Cooked meat can be eaten and should reduce hunger by `5`, without going below zero hunger.

## Later Scope

- Freshen / butcher a carried corpse from inventory, not only a visible corpse lying in the current location.
- Different meat types by species.
- Bones, hide, fur, feathers and other animal materials where appropriate.
- Freshness, spoilage and scent tracking for meat and remains, including timers that eventually make raw/cooked meat unsuitable to eat or cook.
- Generalize item lifetime timers beyond torches/corpses so food, gathered supplies and crafted items can age or decay as needed.
- Cooking success chance should later depend on skill, tools, light, weather and campfire quality.
- Better cooking recipes and profession/skill hooks.
- Butchering quality and yield affected by tools, light, skills and corpse condition.

## Acceptance

- Fresh corpse inspection exposes a freshen/butcher option where appropriate.
- Freshening a fresh corpse adds raw meat to inventory and prevents duplicate harvesting from the same corpse.
- Freshening an old/unsuitable corpse gives a clear message.
- Cooking requires a nearby campfire, not only a torch.
- Cooking can fail and consume raw meat; this is an ordinary outcome, not an error.
- Cooked meat appears in inventory and can be eaten for modest hunger relief.
- Player-facing text remains diegetic and avoids technical freshness numbers unless debug details are enabled.

## Notes

Prefer `освіжити труп` / `freshen corpse` compatibility for the existing command path, but player-facing copy may use more natural wording such as `обробити труп`, `розібрати труп` or `підготувати м'ясо` where it fits.

0.13.3 first pass handles fresh visible corpses in the current location. Inventory-held corpse butchering and perishable meat timers are explicit follow-ups, not part of the first implementation.
