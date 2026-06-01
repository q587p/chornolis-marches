---
id: ALC-001
title: First herbal stamina elixir
status: backlog
type: feature
area: survival
priority: high
estimate: 2-4h
tags:
  - alchemy
  - herbs
  - berries
  - stamina
  - crafting
  - inventory
depends_on:
  - FOOD-004
---

# ALC-001: First Herbal Stamina Elixir

## Goal

Add a first simple craftable drink made from gathered herbs and possibly berries that can restore part of stamina, with room to grow later into deeper herbalism and alchemy.

This should be an early practical use for gathered supplies, not a full potion economy.

## First Scope

- Add one basic recipe for a stamina-restoring elixir:
  - likely `лікарські трави` plus berries or another simple common ingredient;
  - no rare reagent chain yet;
  - no dedicated crafting station unless the implementation needs a small campfire/kettle placeholder.
- Add a carried inventory item/resource for the prepared elixir with Ukrainian forms.
- Add player-facing actions and aliases:
  - `зробити еліксир`;
  - `приготувати еліксир`;
  - `випити еліксир`;
  - `drink elixir`;
  - `use elixir` as a compatibility alias.
- Drinking restores a meaningful amount of stamina:
  - start with partial recovery;
  - allow a later stronger recipe or rare variant to restore all stamina.
- Use atmospheric text that frames this as a rough herbal draught, not laboratory alchemy.

## Guardrails

- Do not make gathered herbs and berries obsolete as direct-use items; the elixir should be better but require preparation.
- Do not let the first recipe trivialize rest, sleep, campfires or exhaustion.
- Do not expose exact hidden formulas in normal player text.
- Do not add a broad alchemy skill tree in this slice. Record learning hooks only if the progression storage is ready.
- If a station is required, keep it humble: kettle, cup, warm stones, campfire or знахарська kit, not a full crafting UI.

## Acceptance

- A player with the required ingredients can prepare one stamina elixir.
- The ingredients are consumed and the elixir appears in inventory.
- The player can drink it from inventory or by text command.
- Drinking restores stamina and gives clear feedback when already full, when missing the elixir or when missing ingredients.
- `/help`, `/commands` or inventory docs mention the stable command only if the action becomes player-facing.
- Focused tests cover recipe validation, stamina recovery cap behavior and aliases where practical.

## Notes

This belongs earlier than full alchemy because it gives gathered herbs/berries a concrete survival role. Later recipes can branch into stronger stamina recovery, HP recovery, night-sight, hiding scent from animals, dream/sleep effects, poison and risky mushroom-based elixirs.
