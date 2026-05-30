---
id: NPC-005
title: NPC hunger and food behavior
status: next
type: feature
area: npc
priority: high
estimate: 4-8h
tags:
  - npc
  - actors
  - hunger
  - food
  - cooking
  - herbalist
  - hunting
depends_on:
  - NPC-004
  - FOOD-001
---

# NPC-005: NPC Hunger and Food Behavior

## Goal

Move NPCs closer to player-like survival rules by giving them meaningful hunger pressure and ordinary food behavior.

NPCs should not feel like role scripts that ignore the body. If players can get hungry, carry food, freshen corpses, cook meat, eat mushrooms or eat berries, NPCs should be able to use the same actor-facing assumptions where practical.

## First Scope

- Give named/humanoid NPCs a hunger state or make their existing hunger field meaningful for profession behavior.
- Let NPC behavior consider hunger before ordinary work loops.
- Let hunter NPCs use fresh carcasses/remains as food input when appropriate:
  - freshen/butcher a suitable corpse;
  - carry raw meat through shared actor inventory once available;
  - cook meat at a real campfire, not a torch;
  - eat cooked meat for hunger relief.
- Let herbalist NPCs prefer gathered/available plant food when hungry:
  - eat berries when suitable;
  - eat mushrooms with the same modest hunger relief/risk assumptions as players;
  - later distinguish medicinal herbs from food instead of treating all gathered resources as meals.
- Keep visible local messages compact and diegetic when NPCs perform obvious food actions.

## Guardrails

- Do not make NPCs silently drain beginner-critical resources.
- Do not let NPCs steal clearly player-owned food/corpses unless a later social/crime rule explicitly allows it.
- Do not expose raw hunger numbers in ordinary player-facing text.
- Do not create separate NPC-only food tables if player food rules can be reused.
- NPC profession services should decide intent; shared actor/survival services should perform ordinary eating, cooking and inventory changes.

## Acceptance

- A hungry hunter can decide to process/cook/eat food instead of continuing the hunt loop.
- A hungry herbalist can decide to eat berries or mushrooms when available.
- NPC food actions use the same inventory/resource effects as player food actions where practical.
- Local observers can see clear non-spammy food/cooking/freshening messages.
- Hunger can push NPCs back toward rest, food search or settlement support instead of only profession work.
- Focused tests cover at least one hunter food decision and one herbalist food decision.

## Follow-Ups

- Add spoilage/risky eating interactions once `FOOD-002` exists.
- Let `NPC-006` use the same food/freshening/cooking path for ordinary hunter patrol and meat-practice behavior when the gate drop-off does not need urgent carcasses.
- Let NPCs barter, request or share food through social systems later.
- Let skills affect NPC cooking/freshening quality once the shared skill layer exists.
