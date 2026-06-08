---
id: RECIPE-001
title: Minimal resource recipe service
status: backlog
type: technical
area: crafting
priority: high
estimate: 2-4h
tags:
  - recipes
  - crafting
  - resources
  - inventory
  - actors
depends_on:
  - ITEM-001
---

# RECIPE-001: Minimal Resource Recipe Service

## Goal

Add a tiny recipe helper for resource-stack crafting so the first herbal tincture does not become a one-off command hardcode.

This is not a full crafting UI, profession tree, station system or economy. It is a validation and inventory-change service for a few authored recipes.

## First Scope

- Add a recipe definition shape for resource-stack recipes:
  - recipe key;
  - output resource key and amount;
  - required input resources and amounts;
  - optional required feature/station tag;
  - optional actor type support.
- Add helper functions:
  - validate recipe inputs;
  - produce missing-ingredient feedback;
  - consume inputs only after all validation passes;
  - add output resource;
  - return a structured result for player/NPC copy.
- Start with player inventory/resource stacks.
- Keep the helper actor-aware enough that NPC herbalists can reuse it later.
- Do not add a public recipe book UI yet.
- Do not add item-instance semantics unless existing helpers already make it trivial.

## Guardrails

- No broad crafting screen.
- No shops, prices, barter or economy.
- No station framework unless the first tincture truly needs a narrow `feature tag`.
- No raw internal recipe math in ordinary player text beyond understandable missing ingredients.
- No hidden inventory loss on failed validation.

## Acceptance

- A focused test can define a recipe and validate success/failure without Telegram.
- Missing ingredients are reported without consuming resources.
- Successful crafting consumes exact inputs and adds exact outputs.
- The helper can be called from a player command now and from an NPC service later.
- Existing inventory/resource tests still pass.
