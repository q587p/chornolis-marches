---
id: FOOD-002
title: Spoiled meat and risky eating
status: backlog
type: feature
area: survival
priority: medium
estimate: 2-4h
tags:
  - food
  - cooking
  - survival
  - hunger
  - risk
depends_on:
  - FOOD-001
---

# FOOD-002: Spoiled Meat and Risky Eating

## Goal

Make failed cooking and future food spoilage less binary than “raw meat disappears”.

The first cooking MVP deliberately consumes raw meat on failure because it is simple and easy to understand. A later survival pass should turn some failures into a risky object state: spoiled, burnt or badly cooked meat that can still be handled by the player.

## Player Story

As a player, when I ruin meat at a campfire, I want the world to treat it like a physical thing rather than pure deletion. I may throw it away, keep it as a bad idea, or eat it in desperation and accept the risk.

## First Scope

- Add one or more failed-cooking result resources, for example:
  - `spoiled_meat` / `зіпсоване м'ясо`;
  - `burnt_meat` / `підгоріле м'ясо`;
  - or a single first-pass `bad_meat` if fewer resource types are better.
- On cooking failure, convert raw meat into the failed-cooking resource instead of always deleting it.
- Show the failed-cooking resource in inventory with clear wording that it is unsafe or unpleasant.
- Allow dropping / discarding the failed-cooking resource.
- Allow eating it only with explicit risky wording.
- Eating it should have a downside, such as:
  - smaller hunger relief;
  - chance of stomach sickness / nausea state;
  - temporary stamina or HP pressure;
  - a future disease/poison hook.

## Non-Goals

- Full disease simulation.
- Detailed food freshness timers for every item.
- Cooking skill progression.
- Recipes or kitchen tools.
- Per-species meat varieties.

## Design Notes

- Player-facing text should make the risk diegetic, not debug-like.
- Avoid a surprise punishment button. If risky eating is available, the label and confirmation should make the danger obvious.
- This pairs naturally with future item lifetime work: raw meat can become spoiled over time, while failed cooking can immediately create a bad-but-real item.
- Keep the first implementation small enough that `FOOD-001` remains the simple working loop.

## Acceptance

- Failed cooking can produce a visible inventory item instead of only deleting raw meat.
- The item can be dropped or discarded.
- Eating the item is possible only through clearly risky wording.
- The downside is noticeable but not instantly character-ending.
- Help, input aliases and release notes describe the behavior when it ships.
- Regression tests cover the failed-cooking conversion and any risky-eating alias.
